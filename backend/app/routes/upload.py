import os
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
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts multipart file upload, validates it, and generates auto-mapping suggestions
    along with a preview of the first 20 records.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
        
    # Save file and retrieve temp path
    temp_filepath = save_uploaded_file(file, UPLOAD_DIR)
    
    # Read the data to dataframe
    df = read_file_to_dataframe(temp_filepath)
    
    # Extract headers/columns
    detected_columns = list(df.columns)
    
    # Calculate auto-mappings
    auto_mapping = auto_map_columns(detected_columns)
    
    # Extract session ID from temp filename (session_id.ext)
    session_id = os.path.splitext(os.path.basename(temp_filepath))[0]
    
    # Clean NaN and numpy values from preview for smooth JSON serialization
    preview_rows = clean_nans_and_numpy(df.head(20).to_dict(orient="records"))
    
    total_rows = len(df)
    
    return UploadResponse(
        session_id=session_id,
        detected_columns=detected_columns,
        auto_mapping=auto_mapping,
        preview_rows=preview_rows,
        total_rows=total_rows,
        file_name=file.filename
    )
