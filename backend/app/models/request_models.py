from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ColumnConfig(BaseModel):
    original_name: str
    output_name: str
    clean_type: Optional[str] = None  # e.g., "First Name", "Email", "", or None
    included: bool = True

class CleaningOptions(BaseModel):
    validate_emails: bool = True
    validate_phones: bool = True
    clean_linkedin: bool = True
    clean_websites: bool = True
    remove_duplicates: bool = True
    remove_blank_rows: bool = True
    generate_invalid_file: bool = True
    generate_duplicate_file: bool = True

class CleanRequest(BaseModel):
    session_id: str
    column_configs: List[ColumnConfig]
    cleaning_options: CleaningOptions

class PromoteRequest(BaseModel):
    session_id: str
    row_index: int
    source: str = "invalid"  # "invalid" or "cleaned"
    updated_row: Dict[str, Any]
    column_configs: List[ColumnConfig]
    cleaning_options: CleaningOptions
