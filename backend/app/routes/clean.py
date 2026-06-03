import os
import glob
import json
import pandas as pd
from fastapi import APIRouter, HTTPException
from app.models.request_models import CleanRequest, PromoteRequest
from app.models.response_models import CleanResponse, CleaningSummaryMetrics, DownloadIds
from app.services.cleaning_service import process_cleaning_pipeline
from app.services.file_service import read_file_to_dataframe, clean_nans_and_numpy
from app.services.export_service import export_csv, generate_summary_report

router = APIRouter()

def resolve_tmp_path(path_str: str) -> str:
    if os.name != "nt" and path_str.startswith("./tmp"):
        return path_str.replace("./tmp", "/tmp", 1)
    return path_str

UPLOAD_DIR = resolve_tmp_path(os.getenv("UPLOAD_DIR", "./tmp/uploads"))
OUTPUT_DIR = resolve_tmp_path(os.getenv("OUTPUT_DIR", "./tmp/outputs"))

@router.post("", response_model=CleanResponse)
async def clean_data(payload: CleanRequest):
    """
    Finds the temp upload for the session, processes it through the cleaning engine,
    saves the output dataframes to the output directory, and returns preview + summary metrics.
    """
    session_id = payload.session_id
    
    # 1. Locate the uploaded file
    matching_files = glob.glob(os.path.join(UPLOAD_DIR, f"{session_id}.*"))
    if not matching_files:
        raise HTTPException(status_code=404, detail="Upload session not found or expired.")
    
    uploaded_filepath = matching_files[0]
    
    # 2. Read the source dataframe
    df = read_file_to_dataframe(uploaded_filepath)
    
    # 3. Trigger cleaning pipeline
    cleaning_options_dict = payload.cleaning_options.model_dump()
    configs_list = [c.model_dump() for c in payload.column_configs]
    cleaned_df, invalid_df, duplicates_df, summary_metrics = process_cleaning_pipeline(
        df=df,
        column_configs=configs_list,
        options=cleaning_options_dict
    )
    
    # 4. Save results to output temp folder
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    cleaned_id = f"{session_id}-cleaned"
    invalid_id = f"{session_id}-invalid"
    duplicates_id = f"{session_id}-duplicates"
    summary_id = f"{session_id}-summary"
    
    # Export cleaned leads
    export_csv(cleaned_df, os.path.join(OUTPUT_DIR, f"{cleaned_id}.csv"))
    
    # Export invalid leads (if option enabled or always save to prevent download crash)
    export_csv(invalid_df, os.path.join(OUTPUT_DIR, f"{invalid_id}.csv"))
    
    # Export duplicate leads
    export_csv(duplicates_df, os.path.join(OUTPUT_DIR, f"{duplicates_id}.csv"))
    
    # Export summary dictionary
    summary_path = os.path.join(OUTPUT_DIR, f"{summary_id}.json")
    with open(summary_path, "w") as f:
        json.dump(summary_metrics, f)
        
    # 5. Extract previews with embedded original indices for edit tracing
    def make_preview(df_sub):
        df_copy = df_sub.copy()
        df_copy["original_df_index"] = df_copy.index
        return clean_nans_and_numpy(df_copy.to_dict(orient="records"))
        
    cleaned_preview = make_preview(cleaned_df.head(20))
    invalid_preview = make_preview(invalid_df)
    duplicates_preview = make_preview(duplicates_df)
    
    # Filter for Needs Review records
    needs_review_df = cleaned_df[cleaned_df["Data Quality Status"] == "Needs Review"]
    needs_review_preview = make_preview(needs_review_df)
    
    return CleanResponse(
        cleaned_preview=cleaned_preview,
        invalid_preview=invalid_preview,
        needs_review_preview=needs_review_preview,
        duplicates_preview=duplicates_preview,
        summary=CleaningSummaryMetrics(**summary_metrics),
        download_ids=DownloadIds(
            cleaned=cleaned_id,
            invalid=invalid_id if cleaning_options_dict.get("generate_invalid_file", True) else None,
            duplicates=duplicates_id if cleaning_options_dict.get("generate_duplicate_file", True) else None,
            summary=summary_id
        )
    )

@router.post("/promote-lead", response_model=CleanResponse)
async def promote_lead(payload: PromoteRequest):
    """
    Promotes or updates a lead (from quarantined invalid list or cleaned list) by re-validating the user's manual edits.
    Updates the files on disk and returns updated previews + summary metrics.
    """
    session_id = payload.session_id
    row_index = payload.row_index
    source = payload.source
    updated_row = payload.updated_row
    configs_list = [c.model_dump() for c in payload.column_configs]
    cleaning_options_dict = payload.cleaning_options.model_dump()
    
    cleaned_path = os.path.join(OUTPUT_DIR, f"{session_id}-cleaned.csv")
    invalid_path = os.path.join(OUTPUT_DIR, f"{session_id}-invalid.csv")
    duplicates_path = os.path.join(OUTPUT_DIR, f"{session_id}-duplicates.csv")
    summary_path = os.path.join(OUTPUT_DIR, f"{session_id}-summary.json")
    
    if not os.path.exists(cleaned_path) or not os.path.exists(invalid_path) or not os.path.exists(summary_path):
        raise HTTPException(status_code=404, detail="Session files not found or expired.")
        
    cleaned_df = pd.read_csv(cleaned_path)
    invalid_df = pd.read_csv(invalid_path)
    
    # Resolve the target dataframe
    target_df = invalid_df if source == "invalid" else cleaned_df
    
    if row_index < 0 or row_index >= len(target_df):
        raise HTTPException(status_code=400, detail=f"Invalid row index in source '{source}'.")
        
    # --- RE-VALIDATION ENGINE ---
    from app.utils.validators import clean_email
    from app.utils.phone_cleaners import clean_and_split_phone
    
    is_valid = True
    remarks = []
    
    # Process email/phone corrections
    for config in configs_list:
        clean_type = config.get("clean_type")
        out_name = config.get("output_name")
        
        if clean_type == "Email" and cleaning_options_dict.get("validate_emails", True):
            email_val = updated_row.get(out_name, "")
            if email_val:
                cleaned_em, email_ok = clean_email(str(email_val))
                if not email_ok:
                    is_valid = False
                    remarks.append(f"Invalid email format: '{email_val}'")
                else:
                    updated_row[out_name] = cleaned_em
                    
        elif clean_type in ["Phone Number", "Mobile Number"] and cleaning_options_dict.get("validate_phones", True):
            phone_val = updated_row.get(out_name, "")
            if phone_val:
                cc, local_num, phone_ok = clean_and_split_phone(str(phone_val))
                if not phone_ok:
                    is_valid = False
                    remarks.append(f"Invalid phone format: '{phone_val}'")
                else:
                    updated_row[f"{out_name} Country Code"] = cc
                    updated_row[out_name] = local_num
                    
        elif clean_type == "Date (YYYY-MM-DD)":
            from app.utils.date_cleaners import clean_date_string
            date_val = updated_row.get(out_name, "")
            if date_val:
                date_part, _, date_ok = clean_date_string(str(date_val))
                if not date_ok:
                    is_valid = False
                    remarks.append(f"Invalid date format: '{date_val}'")
                else:
                    updated_row[out_name] = date_part
                    
        elif clean_type == "Date (Split Date & Time)":
            from app.utils.date_cleaners import clean_date_string
            date_val = updated_row.get(out_name, "")
            time_val = updated_row.get(f"{out_name} Time", "")
            if date_val or time_val:
                combined = f"{date_val} {time_val}".strip()
                date_part, time_part, date_ok = clean_date_string(combined)
                if not date_ok:
                    is_valid = False
                    remarks.append(f"Invalid date/time format: '{combined}'")
                else:
                    updated_row[out_name] = date_part
                    updated_row[f"{out_name} Time"] = time_part
                    
    # Minimum Contact Rule check
    email_val = ""
    phone_val = ""
    linkedin_val = ""
    company_val = ""
    
    for config in configs_list:
        clean_type = config.get("clean_type")
        out_name = config.get("output_name")
        if clean_type == "Email":
            email_val = updated_row.get(out_name, "")
        elif clean_type in ["Phone Number", "Mobile Number"]:
            cc = updated_row.get(f"{out_name} Country Code", "")
            local = updated_row.get(out_name, "")
            phone_val = f"{cc}{local}" if cc else local
        elif clean_type == "LinkedIn Profile URL":
            linkedin_val = updated_row.get(out_name, "")
        elif clean_type == "Company Name":
            company_val = updated_row.get(out_name, "")
            
    has_phone = bool(phone_val)
    has_email = bool(email_val)
    has_linkedin = bool(linkedin_val)
    has_company = bool(company_val)
    
    has_min_contact = (
        has_phone or 
        has_email or 
        has_linkedin or 
        (has_company and has_linkedin)
    )
    
    if not has_min_contact:
        is_valid = False
        remarks.append("Missing all contact methods (no Phone, Email, or LinkedIn)")
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="; ".join(remarks))
        
    # --- SUCCESSFUL UPDATE / PROMOTION ---
    if source == "invalid":
        # Remove from invalid list
        invalid_df = invalid_df.drop(invalid_df.index[row_index]).reset_index(drop=True)
        
        # Standardize and promote
        updated_row["Data Quality Status"] = "Valid"
        updated_row["Cleaning Remarks"] = "Record is clean (Manually Promoted)"
        
        # Create standard row dictionary
        clean_row_dict = {}
        for col in cleaned_df.columns:
            val = updated_row.get(col, "")
            if pd.isna(val):
                val = ""
            clean_row_dict[col] = val
            
        new_clean_row_df = pd.DataFrame([clean_row_dict])
        cleaned_df = pd.concat([cleaned_df, new_clean_row_df], ignore_index=True)
    else:
        # source == "cleaned": Update in-place
        updated_row["Data Quality Status"] = "Valid"
        updated_row["Cleaning Remarks"] = "Record is clean (Manually Corrected)"
        
        for col in cleaned_df.columns:
            val = updated_row.get(col, "")
            if pd.isna(val):
                val = ""
            cleaned_df.at[row_index, col] = val
            
    # Save files back to disk
    export_csv(cleaned_df, cleaned_path)
    export_csv(invalid_df, invalid_path)
    
    # Load and update metrics in summary
    with open(summary_path, "r") as f:
        summary_metrics = json.load(f)
        
    # Recalculate summary metrics dynamically for flawless accuracy!
    summary_metrics["valid_records"] = int(len(cleaned_df[cleaned_df["Data Quality Status"] == "Valid"]))
    summary_metrics["needs_review"] = int(len(cleaned_df[cleaned_df["Data Quality Status"] == "Needs Review"]))
    summary_metrics["invalid_records"] = len(invalid_df)
    summary_metrics["total_after_cleaning"] = len(cleaned_df)
    
    # Recount invalid email/phone counters
    invalid_emails_count = 0
    invalid_phones_count = 0
    
    for _, r in invalid_df.iterrows():
        rem = str(r.get("Cleaning Remarks", "")).lower()
        if "email" in rem:
            invalid_emails_count += 1
        if "phone" in rem:
            invalid_phones_count += 1
            
    for _, r in cleaned_df.iterrows():
        rem = str(r.get("Cleaning Remarks", "")).lower()
        if "email" in rem:
            invalid_emails_count += 1
        if "phone" in rem:
            invalid_phones_count += 1
            
    summary_metrics["invalid_emails"] = invalid_emails_count
    summary_metrics["invalid_phones"] = invalid_phones_count
    
    with open(summary_path, "w") as f:
        json.dump(summary_metrics, f)
        
    # Generate updated previews
    def make_preview(df_sub):
        df_copy = df_sub.copy()
        df_copy["original_df_index"] = df_copy.index
        return clean_nans_and_numpy(df_copy.to_dict(orient="records"))
        
    cleaned_preview = make_preview(cleaned_df.head(20))
    invalid_preview = make_preview(invalid_df)
    
    # Load duplicates if file exists
    duplicates_df = pd.read_csv(duplicates_path) if os.path.exists(duplicates_path) else pd.DataFrame()
    duplicates_preview = make_preview(duplicates_df) if not duplicates_df.empty else []
    
    needs_review_df = cleaned_df[cleaned_df["Data Quality Status"] == "Needs Review"]
    needs_review_preview = make_preview(needs_review_df)
    
    return CleanResponse(
        cleaned_preview=cleaned_preview,
        invalid_preview=invalid_preview,
        needs_review_preview=needs_review_preview,
        duplicates_preview=duplicates_preview,
        summary=CleaningSummaryMetrics(**summary_metrics),
        download_ids=DownloadIds(
            cleaned=f"{session_id}-cleaned",
            invalid=f"{session_id}-invalid" if cleaning_options_dict.get("generate_invalid_file", True) else None,
            duplicates=f"{session_id}-duplicates" if cleaning_options_dict.get("generate_duplicate_file", True) else None,
            summary=f"{session_id}-summary"
        )
    )
