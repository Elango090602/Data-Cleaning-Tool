import os
import uuid
import math
import pandas as pd
import numpy as np
from fastapi import UploadFile, HTTPException
from typing import Any

def clean_nans_and_numpy(obj: Any) -> Any:
    """
    Recursively converts numpy datatypes and NaN/NaT values to native Python types
    to ensure smooth Pydantic/JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: clean_nans_and_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans_and_numpy(x) for x in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or math.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif pd.isna(obj):
        return None
    return obj


def save_uploaded_file(file: UploadFile, upload_dir: str) -> str:
    """
    Saves an uploaded file to a temporary uploads directory, named by session UUID.
    Validates file extension and size.
    Returns the absolute path to the saved file.
    """
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = file.filename or "uploaded_file"
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in ['.csv', '.xlsx', '.xls']:
        raise HTTPException(status_code=400, detail="Invalid file type. Only .csv, .xlsx, and .xls are supported.")
        
    # Read the file to check if it's empty
    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        
    # Generate unique session ID
    session_id = str(uuid.uuid4())
    temp_filename = f"{session_id}{file_ext}"
    temp_filepath = os.path.join(upload_dir, temp_filename)
    
    # Save the file
    with open(temp_filepath, "wb") as f:
        f.write(content)
        
    return temp_filepath

def read_file_to_dataframe(filepath: str) -> pd.DataFrame:
    """
    Reads a CSV or Excel file into a Pandas DataFrame with advanced resiliency
    for different encodings, delimiters, and malformed lines.
    """
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    file_ext = os.path.splitext(filepath)[1].lower()
    
    try:
        if file_ext == '.csv':
            # Resilient CSV parser:
            # We will attempt different encodings and delimiter detection strategies.
            # Encodings to try: utf-8, utf-8-sig, utf-16, latin-1
            encodings = ['utf-8', 'utf-8-sig', 'utf-16', 'latin-1']
            df = None
            last_error = None
            
            # Try standard comma reading first
            for encoding in encodings:
                try:
                    df = pd.read_csv(filepath, encoding=encoding, on_bad_lines='skip')
                    break
                except Exception as e:
                    last_error = e
                    continue
            
            # If standard comma reading failed (or read everything into 1 column because it's tab/semicolon separated),
            # try with auto-separator detection
            if df is None or len(df.columns) <= 1:
                for encoding in encodings:
                    try:
                        temp_df = pd.read_csv(filepath, sep=None, engine='python', encoding=encoding, on_bad_lines='skip')
                        # Only accept if it successfully found multiple columns
                        if len(temp_df.columns) > 1:
                            df = temp_df
                            break
                        elif df is None:
                            df = temp_df # fallback
                    except Exception as e:
                        last_error = e
                        continue
                        
            if df is None:
                raise last_error if last_error else ValueError("Unable to parse CSV file with any standard encoding.")
                
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath)
        else:
            raise ValueError(f"Unsupported file extension {file_ext}")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    if df.empty:
        raise HTTPException(status_code=400, detail="The file has no data.")
        
    # Replace NaN values with empty string or standard None so Pydantic/JSON doesn't fail
    # Keep DataFrame numeric types if necessary, but for preview/cleaning text replacing is usually fine.
    
    return df
