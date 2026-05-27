from pydantic import BaseModel
from typing import Dict, List, Any, Optional

class UploadResponse(BaseModel):
    session_id: str
    detected_columns: List[str]
    auto_mapping: Dict[str, str]
    preview_rows: List[Dict[str, Any]]
    total_rows: int
    file_name: str

class CleaningSummaryMetrics(BaseModel):
    total_uploaded: int
    total_after_cleaning: int
    valid_records: int
    needs_review: int
    invalid_records: int
    duplicates_found: int
    duplicates_removed: int
    invalid_emails: int
    invalid_phones: int
    processing_time_ms: int

class DownloadIds(BaseModel):
    cleaned: str
    invalid: Optional[str] = None
    duplicates: Optional[str] = None
    summary: Optional[str] = None

class CleanResponse(BaseModel):
    cleaned_preview: List[Dict[str, Any]]
    invalid_preview: List[Dict[str, Any]] = []
    needs_review_preview: List[Dict[str, Any]] = []
    duplicates_preview: List[Dict[str, Any]] = []
    summary: CleaningSummaryMetrics
    download_ids: DownloadIds
