import os
import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, List, Any
from app.services.file_service import save_uploaded_file, read_file_to_dataframe, clean_nans_and_numpy
from app.services.mapping_service import auto_map_columns
from app.models.response_models import UploadResponse

router = APIRouter()

def resolve_tmp_path(path_str: str) -> str:
    if os.name != "nt" and path_str.startswith("./tmp"):
        return path_str.replace("./tmp", "/tmp", 1)
    return path_str

UPLOAD_DIR = resolve_tmp_path(os.getenv("UPLOAD_DIR", "./tmp/uploads"))

@router.post("", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(None),
    file: UploadFile = File(None)
):
    """
    Accepts up to 5 multipart file uploads, merges them into a single dataframe,
    generates auto-mapping suggestions, and returns a preview of up to 1,000 records.
    """
    # Combine inputs for backward compatibility
    uploaded_list = []
    if files:
        uploaded_list.extend(files)
    if file:
        uploaded_list.append(file)

    if not uploaded_list:
        raise HTTPException(status_code=400, detail="No files uploaded.")
        
    if len(uploaded_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 files can be uploaded in a single session.")
        
    session_id = str(uuid.uuid4())
    dfs = []
    file_names = []
    
    for f in uploaded_list:
        if not f.filename:
            continue
            
        temp_filepath = save_uploaded_file(f, UPLOAD_DIR)
        
        try:
            df_part = read_file_to_dataframe(temp_filepath)
            dfs.append(df_part)
            file_names.append(f.filename)
        finally:
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
                
    if not dfs:
        raise HTTPException(status_code=400, detail="No valid files containing data were uploaded.")
        
    # Concatenate all DataFrames
    df = pd.concat(dfs, ignore_index=True)
    
    # Save the merged DataFrame as session_id.csv
    merged_filepath = os.path.join(UPLOAD_DIR, f"{session_id}.csv")
    df.to_csv(merged_filepath, index=False, encoding='utf-8')
    
    # Extract headers/columns
    detected_columns = list(df.columns)
    
    # Calculate auto-mappings
    auto_mapping = auto_map_columns(detected_columns)
    
    # Clean NaN and numpy values from preview for smooth JSON serialization
    preview_rows = clean_nans_and_numpy(df.head(1000).to_dict(orient="records"))
    
    total_rows = len(df)
    
    return UploadResponse(
        session_id=session_id,
        detected_columns=detected_columns,
        auto_mapping=auto_mapping,
        preview_rows=preview_rows,
        total_rows=total_rows,
        file_name=", ".join(file_names)
    )
