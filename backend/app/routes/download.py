import os
import glob
import json
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from app.services.export_service import export_xlsx, generate_summary_report

router = APIRouter()

def resolve_tmp_path(path_str: str) -> str:
    if os.name != "nt" and path_str.startswith("./tmp"):
        return path_str.replace("./tmp", "/tmp", 1)
    return path_str

UPLOAD_DIR = resolve_tmp_path(os.getenv("UPLOAD_DIR", "./tmp/uploads"))
OUTPUT_DIR = resolve_tmp_path(os.getenv("OUTPUT_DIR", "./tmp/outputs"))

@router.get("/download/{file_id}")
async def download_file(file_id: str, format: str = Query("csv", pattern="^(csv|xlsx)$")):
    """
    Serves the cleaned, invalid, duplicates, or summary file in the requested format (csv or xlsx).
    """
    # 1. Handle Summary download case
    if file_id.endswith("-summary"):
        json_path = os.path.join(OUTPUT_DIR, f"{file_id}.json")
        if not os.path.exists(json_path):
            raise HTTPException(status_code=404, detail="File ID not found or expired.")
            
        with open(json_path, "r") as f:
            summary_dict = json.load(f)
            
        export_filename = f"{file_id}_export.{format}"
        export_path = os.path.join(OUTPUT_DIR, export_filename)
        
        generate_summary_report(summary_dict, export_path, format_type=format)
        
        media_type = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        download_name = f"cleaning_summary_report.{format}"
        
        return FileResponse(export_path, media_type=media_type, filename=download_name)
        
    # 2. Handle Lead CSV download case (cleaned, invalid, duplicates)
    csv_path = os.path.join(OUTPUT_DIR, f"{file_id}.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="File ID not found or expired.")
        
    # Determine default download name based on suffix
    base_name = "cleaned_leads"
    if "invalid" in file_id:
        base_name = "invalid_leads"
    elif "duplicates" in file_id:
        base_name = "duplicate_leads"
        
    download_name = f"{base_name}.{format}"
    
    if format == "csv":
        return FileResponse(csv_path, media_type="text/csv", filename=download_name)
        
    elif format == "xlsx":
        # Load from CSV and convert to XLSX on the fly
        df = pd.read_csv(csv_path)
        xlsx_path = os.path.join(OUTPUT_DIR, f"{file_id}_export.xlsx")
        export_xlsx(df, xlsx_path)
        
        return FileResponse(
            xlsx_path, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            filename=download_name
        )

@router.delete("/cleanup/{session_id}")
async def cleanup_session(session_id: str):
    """
    Deletes all temporary files in upload and output directories starting or matching session_id.
    """
    cleaned_count = 0
    # Search in both upload and output dirs
    for directory in [UPLOAD_DIR, OUTPUT_DIR]:
        if not os.path.exists(directory):
            continue
        matching_files = glob.glob(os.path.join(directory, f"*{session_id}*"))
        for filepath in matching_files:
            try:
                os.remove(filepath)
                cleaned_count += 1
            except Exception:
                pass
                
    return {"status": "cleaned_up", "session_id": session_id, "files_deleted": cleaned_count}
