import pandas as pd
from typing import Tuple, Any

def clean_date_string(date_str: Any) -> Tuple[str, str, bool]:
    """
    Parses and cleans a date-time cell value.
    Returns: (date_part_str, time_part_str, is_valid)
    Examples:
      - "1988-10-01T00:00:00" -> ("1988-10-01", "00:00:00", True)
      - "2023-06-01"          -> ("2023-06-01", "00:00:00", True)
      - "invalid-date"        -> ("", "", False)
    """
    if date_str is None:
        return "", "", False
    
    val = str(date_str).strip()
    if not val or val.lower() in ["nan", "none", "null", "nat"]:
        return "", "", False
        
    try:
        # Use pandas to parse the date dynamically
        ts = pd.to_datetime(val, errors='coerce')
        if pd.isna(ts):
            # Try splitting by 'T' or space if it looks like an ISO date but fails pandas to_datetime
            if 'T' in val:
                parts = val.split('T')
                if len(parts) == 2:
                    return parts[0].strip(), parts[1].strip(), True
            return "", "", False
        
        date_part = ts.strftime('%Y-%m-%d')
        time_part = ts.strftime('%H:%M:%S')
        return date_part, time_part, True
    except Exception:
        return "", "", False
