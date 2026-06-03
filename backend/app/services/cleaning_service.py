import time
import pandas as pd
import math
from typing import Dict, List, Tuple, Any
from app.utils.validators import clean_email
from app.utils.text_cleaners import clean_name, clean_company_name, clean_location
from app.utils.phone_cleaners import clean_phone, clean_and_split_phone
from app.utils.linkedin_cleaners import clean_linkedin_url
from app.utils.website_cleaners import clean_website_url

def is_blank_value(val: Any) -> bool:
    """
    Robust check for missing or blank values in lead data cells,
    avoiding typical pandas float NaN / None string conversion pitfalls.
    """
    if val is None:
        return True
    if isinstance(val, float) and math.isnan(val):
        return True
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['nan', 'none', 'null', '']:
        return True
    return False


def check_is_actual_duplicate(raw_a: Any, raw_b: Any) -> bool:
    """
    Deeply compares the raw row series across unique identifiers, IDs, LinkedIn URLs,
    and mid-level fields like Middle Name, Suffix, or Dates. If there are explicit
    contradictory values, they are treated as distinct individuals rather than duplicates.
    """
    def clean_str(v):
        if pd.isna(v) or v is None:
            return ""
        v_clean = str(v).strip().lower()
        if v_clean in ["nan", "none", "null"]:
            return ""
        return v_clean

    # 1. Compare LinkedIn Profile URL across any likely column names
    for col in ["linkedin url", "linkedin", "linkedin profile url", "linkedin id"]:
        val_a = ""
        val_b = ""
        for key in raw_a.index:
            if str(key).lower() == col:
                val_a = clean_str(raw_a[key])
                val_b = clean_str(raw_b[key])
                break
        if val_a and val_b and val_a != val_b:
            return False  # Different LinkedIn profiles = different people!

    # 2. Compare ZoomInfo Contact ID or other IDs
    for col in ["zoominfo contact id", "contact id", "id", "zoominfo id"]:
        val_a = ""
        val_b = ""
        for key in raw_a.index:
            if str(key).lower() == col:
                val_a = clean_str(raw_a[key])
                val_b = clean_str(raw_b[key])
                break
        if val_a and val_b and val_a != val_b:
            return False  # Different unique IDs = different people!

    # 3. Compare Middle Name or Salutation/Suffix
    for col in ["middle name", "salutation", "suffix"]:
        val_a = ""
        val_b = ""
        for key in raw_a.index:
            if str(key).lower() == col:
                val_a = clean_str(raw_a[key])
                val_b = clean_str(raw_b[key])
                break
        if val_a and val_b and val_a != val_b:
            return False  # Different middle name or suffix = different people!

    # 4. Compare Date of Joining / Date of Hire
    for col in ["date of joining", "date of hire", "hire date", "joining date", "doj"]:
        val_a = ""
        val_b = ""
        for key in raw_a.index:
            if str(key).lower() == col:
                val_a = clean_str(raw_a[key])
                val_b = clean_str(raw_b[key])
                break
        if val_a and val_b and val_a != val_b:
            return False  # Different joining dates = different people!

    return True

def clean_value_by_field(field_name: str, raw_val: Any) -> Tuple[str, bool, str]:
    """
    Cleans a field value based on its mapped clean type.
    Returns: (cleaned_value, is_valid, warning_message)
    """
    is_valid = True
    warning = ""
    
    if is_blank_value(raw_val):
        return "", True, ""
        
    val_str = str(raw_val).strip()

    if field_name in ["First Name", "Last Name", "Full Name", "Job Title", "Industry", "Lead Source"]:
        cleaned = clean_name(val_str)
        return cleaned, True, ""
        
    elif field_name == "Email":
        cleaned, is_valid = clean_email(val_str)
        warning = "" if is_valid else f"Invalid email format: '{val_str}'"
        return cleaned, is_valid, warning
        
    elif field_name in ["Phone Number", "Mobile Number"]:
        cleaned, is_valid = clean_phone(val_str)
        warning = "" if is_valid else f"Invalid phone format: '{val_str}'"
        return cleaned, is_valid, warning
        
    elif field_name == "LinkedIn Profile URL":
        cleaned, is_valid = clean_linkedin_url(val_str)
        warning = "" if is_valid else f"Invalid LinkedIn URL: '{val_str}'"
        return cleaned, is_valid, warning
        
    elif field_name == "Company Name":
        cleaned = clean_company_name(val_str)
        return cleaned, True, ""
        
    elif field_name == "Company Website":
        cleaned, is_valid = clean_website_url(val_str)
        warning = "" if is_valid else f"Invalid website URL: '{val_str}'"
        return cleaned, is_valid, warning
        
    elif field_name in ["City", "State"]:
        cleaned = clean_location(val_str, is_country=False)
        return cleaned, True, ""
        
    elif field_name == "Country":
        cleaned = clean_location(val_str, is_country=True)
        return cleaned, True, ""
        
    elif field_name == "Date (YYYY-MM-DD)":
        from app.utils.date_cleaners import clean_date_string
        date_part, _, is_val = clean_date_string(val_str)
        warning = "" if is_val else f"Invalid date format: '{val_str}'"
        return date_part, is_val, warning

    elif field_name == "Date (Split Date & Time)":
        from app.utils.date_cleaners import clean_date_string
        date_part, _, is_val = clean_date_string(val_str)
        warning = "" if is_val else f"Invalid date/time format: '{val_str}'"
        return date_part, is_val, warning

    # Default fallback for other text columns
    return val_str, True, ""

def process_cleaning_pipeline(
    df: pd.DataFrame,
    column_configs: List[Dict[str, Any]],
    options: Dict[str, Any]
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Processes the full cleaning pipeline based on custom column configurations.
    Returns: (cleaned_df, invalid_df, duplicates_df, summary_metrics)
    """
    start_time = time.time()
    total_uploaded = len(df)
    
    # 1. Screen out ignored/excluded columns
    included_configs = [c for c in column_configs if c.get("included", True)]
    
    # Compile the export columns list dynamically.
    # If a phone column is included, we automatically prefix it with a country code column!
    standard_columns_to_export = []
    for config in included_configs:
        out_name = config["output_name"]
        clean_type = config.get("clean_type")
        if clean_type in ["Phone Number", "Mobile Number"]:
            standard_columns_to_export.append(f"{out_name} Country Code")
            standard_columns_to_export.append(out_name)
        elif clean_type == "Date (Split Date & Time)":
            standard_columns_to_export.append(out_name)
            standard_columns_to_export.append(f"{out_name} Time")
        else:
            standard_columns_to_export.append(out_name)
        
    if "Data Quality Status" not in standard_columns_to_export:
        standard_columns_to_export.append("Data Quality Status")
    if "Cleaning Remarks" not in standard_columns_to_export:
        standard_columns_to_export.append("Cleaning Remarks")
        
    if not included_configs:
        empty_df = pd.DataFrame(columns=standard_columns_to_export)
        return empty_df, empty_df, empty_df, {
            "total_uploaded": total_uploaded,
            "total_after_cleaning": 0,
            "valid_records": 0,
            "needs_review": 0,
            "invalid_records": 0,
            "duplicates_found": 0,
            "duplicates_removed": 0,
            "invalid_emails": 0,
            "invalid_phones": 0,
            "processing_time_ms": int((time.time() - start_time) * 1000)
        }

    # 2. Blank Row Removal (if selected)
    # Check if we should remove rows where ALL key clean_type fields are blank:
    # Key clean_types: First Name, Last Name, Email, Phone Number
    if options.get("remove_blank_rows", True):
        key_original_cols = [
            c["original_name"] for c in column_configs 
            if c.get("clean_type") in ["First Name", "Last Name", "Email", "Phone Number"]
        ]
        
        if key_original_cols:
            def is_row_blank(row):
                for col in key_original_cols:
                    val = row.get(col)
                    if not is_blank_value(val):
                        return False
                return True
                
            blank_mask = df.apply(is_row_blank, axis=1)
            df = df[~blank_mask].copy()

    cleaned_rows = []
    invalid_rows = []
    duplicate_rows = []
    
    seen_emails = {}
    seen_name_phones = {}
    seen_linkedins = {}
    seen_name_companies = {}
    
    # Metrics counters
    duplicates_found = 0
    invalid_emails_count = 0
    invalid_phones_count = 0
    invalid_records_count = 0
    needs_review_count = 0
    valid_records_count = 0
    
    for index, raw_row in df.iterrows():
        row_data = {}
        row_remarks = []
        is_row_invalid = False
        is_row_needs_review = False
        
        # Temp clean values keyed by Clean Type
        clean_type_vals = {}
        
        # Process each included column
        for config in included_configs:
            orig_name = config["original_name"]
            out_name = config["output_name"]
            clean_type = config.get("clean_type")
            
            raw_val = raw_row.get(orig_name)
            
            if clean_type and clean_type != "None" and clean_type != "":
                if clean_type in ["Phone Number", "Mobile Number"]:
                    cc, local_num, is_val = clean_and_split_phone(raw_val)
                    
                    if not is_blank_value(raw_val):
                        row_data[f"{out_name} Country Code"] = cc
                        row_data[out_name] = local_num
                        
                        combined_phone = f"{cc}{local_num}" if cc else local_num
                        clean_type_vals[clean_type] = combined_phone
                        
                        # Phone validation checks for provided phone numbers
                        warning = "" if is_val else f"Invalid phone format: '{raw_val}'"
                        if options.get("validate_phones", True):
                            if not is_val:
                                is_row_invalid = True
                                row_remarks.append(warning)
                                invalid_phones_count += 1
                    else:
                        # Value is blank: missing but not a format error
                        row_data[f"{out_name} Country Code"] = ""
                        row_data[out_name] = ""
                elif clean_type == "Date (Split Date & Time)":
                    from app.utils.date_cleaners import clean_date_string
                    date_part, time_part, is_val = clean_date_string(raw_val)
                    
                    if not is_blank_value(raw_val):
                        row_data[out_name] = date_part
                        row_data[f"{out_name} Time"] = time_part
                        clean_type_vals[clean_type] = date_part
                        
                        warning = f"Invalid date format: '{raw_val}'"
                        if not is_val:
                            is_row_needs_review = True
                            row_remarks.append(warning)
                    else:
                        row_data[out_name] = ""
                        row_data[f"{out_name} Time"] = ""
                else:
                    # Non-phone standard fields
                    cleaned_val, is_val, warning = clean_value_by_field(clean_type, raw_val)
                    row_data[out_name] = cleaned_val
                    
                    if not is_blank_value(raw_val):
                        clean_type_vals[clean_type] = cleaned_val
                        
                        # Email validation checks
                        if clean_type == "Email" and options.get("validate_emails", True):
                            if not is_val:
                                is_row_invalid = True
                                row_remarks.append(warning)
                                invalid_emails_count += 1
                                
                        # LinkedIn validation checks
                        elif clean_type == "LinkedIn Profile URL" and options.get("clean_linkedin", True):
                            if not is_val:
                                is_row_invalid = True
                                row_remarks.append(warning)
                                
                        # Website validation checks
                        elif clean_type == "Company Website" and options.get("clean_websites", True):
                            if not is_val:
                                is_row_needs_review = True
                                row_remarks.append(warning)
                                
                        # Date validation checks
                        elif clean_type in ["Date (YYYY-MM-DD)", "Date (Split Date & Time)"]:
                            if not is_val:
                                is_row_needs_review = True
                                row_remarks.append(warning)
                    else:
                        # Blank non-phone field: just map default empty string
                        pass
            else:
                # No specific cleaning type: carry over raw values safely
                val_str = "" if is_blank_value(raw_val) else str(raw_val).strip()
                row_data[out_name] = val_str

        # Auto-generate Full Name output if mapped and blank
        fn_configs = [c for c in included_configs if c.get("clean_type") == "Full Name"]
        if fn_configs:
            fn_out_name = fn_configs[0]["output_name"]
            fn_val = row_data.get(fn_out_name, "")
            if not fn_val or fn_val.strip() == "":
                first = clean_type_vals.get("First Name", "")
                last = clean_type_vals.get("Last Name", "")
                fn_val = f"{first} {last}".strip()
                row_data[fn_out_name] = fn_val
                clean_type_vals["Full Name"] = fn_val

        # Mandatory missing checks (First Name and Last Name)
        is_first_missing = not clean_type_vals.get("First Name")
        is_last_missing = not clean_type_vals.get("Last Name")
        
        # If either is missing, flag it as Needs Review
        if is_first_missing or is_last_missing:
            is_row_needs_review = True
            missing_cols = []
            if is_first_missing:
                missing_cols.append("First Name is blank")
            if is_last_missing:
                missing_cols.append("Last Name is blank")
            row_remarks.extend(missing_cols)

        # Minimum Contact Rule implementation:
        # A lead is kept and valid if they have a Phone, Email, LinkedIn, OR both Company & LinkedIn
        has_phone = bool(clean_type_vals.get("Phone Number") or clean_type_vals.get("Mobile Number"))
        has_email = bool(clean_type_vals.get("Email"))
        has_linkedin = bool(clean_type_vals.get("LinkedIn Profile URL"))
        has_company = bool(clean_type_vals.get("Company Name"))
        
        has_min_contact = (
            has_phone or 
            has_email or 
            has_linkedin or 
            (has_company and has_linkedin)
        )
        
        if not has_min_contact:
            is_row_invalid = True
            row_remarks.append("Missing all contact methods (no Phone, Email, or LinkedIn)")
            
        # Determine Data Quality Status
        if is_row_invalid:
            status = "Invalid"
            invalid_records_count += 1
        elif is_row_needs_review:
            status = "Needs Review"
            needs_review_count += 1
        else:
            status = "Valid"
            valid_records_count += 1
            
        row_data["Data Quality Status"] = status
        row_data["Cleaning Remarks"] = "; ".join(row_remarks) if row_remarks else "Record is clean"
        
        # 3. Duplicate Detection
        if options.get("remove_duplicates", True):
            email_val = clean_type_vals.get("Email", "").lower()
            phone_val = clean_type_vals.get("Phone Number", "")
            linkedin_val = clean_type_vals.get("LinkedIn Profile URL", "").lower()
            
            fullname_val = clean_type_vals.get("Full Name", "")
            if not fullname_val:
                fullname_val = f"{clean_type_vals.get('First Name', '')} {clean_type_vals.get('Last Name', '')}".strip()
            fullname_val = fullname_val.lower()
            
            company_val = clean_type_vals.get("Company Name", "").lower()
            name_company_key = f"{fullname_val}|{company_val}" if fullname_val and company_val else ""
            
            is_duplicate = False
            dupe_reasons = []
            original_match_data = None
            
            # Key for Name + Phone matching to avoid corporate switchboard collision
            name_phone_key = f"{fullname_val}|{phone_val}" if fullname_val and phone_val else ""
            
            if email_val and email_val in seen_emails:
                cand_data, cand_raw = seen_emails[email_val]
                if check_is_actual_duplicate(cand_raw, raw_row):
                    is_duplicate = True
                    dupe_reasons.append("Duplicate Email")
                    original_match_data = cand_data
            elif linkedin_val and linkedin_val in seen_linkedins:
                cand_data, cand_raw = seen_linkedins[linkedin_val]
                if check_is_actual_duplicate(cand_raw, raw_row):
                    is_duplicate = True
                    dupe_reasons.append("Duplicate LinkedIn")
                    original_match_data = cand_data
            elif name_company_key and name_company_key in seen_name_companies:
                cand_data, cand_raw = seen_name_companies[name_company_key]
                if check_is_actual_duplicate(cand_raw, raw_row):
                    is_duplicate = True
                    dupe_reasons.append("Duplicate Name + Company")
                    original_match_data = cand_data
            elif name_phone_key and name_phone_key in seen_name_phones:
                cand_data, cand_raw = seen_name_phones[name_phone_key]
                if check_is_actual_duplicate(cand_raw, raw_row):
                    is_duplicate = True
                    dupe_reasons.append("Duplicate Name + Phone")
                    original_match_data = cand_data
                
            if is_duplicate:
                duplicates_found += 1
                
                # Append original row context first if found
                if original_match_data:
                    orig_copy = original_match_data.copy()
                    orig_copy["Data Quality Status"] = "Original"
                    orig_copy["Cleaning Remarks"] = f"Original Record (Group #{duplicates_found})"
                    duplicate_rows.append(orig_copy)
                
                # Append duplicate row context
                row_data["Data Quality Status"] = "Duplicate"
                row_data["Cleaning Remarks"] = f"{'; '.join(dupe_reasons)} (Group #{duplicates_found})"
                duplicate_rows.append(row_data)
                continue
            else:
                # Save keys to seen index dicts mapping to (row_data, raw_row) tuple
                tuple_to_save = (row_data, raw_row)
                if email_val:
                    seen_emails[email_val] = tuple_to_save
                if linkedin_val:
                    seen_linkedins[linkedin_val] = tuple_to_save
                if name_company_key:
                    seen_name_companies[name_company_key] = tuple_to_save
                if name_phone_key:
                    seen_name_phones[name_phone_key] = tuple_to_save
                    
        # 4. Categorize row into output buckets
        if is_row_invalid:
            invalid_rows.append(row_data)
        else:
            cleaned_rows.append(row_data)
            
    # Compile DataFrames
    cleaned_df = pd.DataFrame(cleaned_rows, columns=standard_columns_to_export) if cleaned_rows else pd.DataFrame(columns=standard_columns_to_export)
    invalid_df = pd.DataFrame(invalid_rows, columns=standard_columns_to_export) if invalid_rows else pd.DataFrame(columns=standard_columns_to_export)
    duplicates_df = pd.DataFrame(duplicate_rows, columns=standard_columns_to_export) if duplicate_rows else pd.DataFrame(columns=standard_columns_to_export)
    
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    summary_metrics = {
        "total_uploaded": total_uploaded,
        "total_after_cleaning": len(cleaned_df),
        "valid_records": valid_records_count,
        "needs_review": needs_review_count,
        "invalid_records": len(invalid_df),
        "duplicates_found": duplicates_found,
        "duplicates_removed": duplicates_found,
        "invalid_emails": invalid_emails_count,
        "invalid_phones": invalid_phones_count,
        "processing_time_ms": processing_time_ms
    }
    
    return cleaned_df, invalid_df, duplicates_df, summary_metrics
