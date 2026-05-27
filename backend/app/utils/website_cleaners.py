import re
from typing import Any, Tuple

def clean_website_url(url_val: Any) -> Tuple[str, bool]:
    """
    Cleans a company website URL:
    - Strips whitespace and lowercases the URL.
    - Prepends https:// if no scheme (http:// or https://) is present.
    - Removes trailing slash.
    - Validates with regex: must start with http:// or https://.
    Returns tuple (cleaned_url, is_valid)
    """
    if url_val is None or (isinstance(url_val, float) and import_pandas_isnan(url_val)):
        return "", False
        
    val = str(url_val).strip().lower()
    if not val or val == 'nan':
        return "", False
        
    # Prepend scheme if missing
    if not (val.startswith("http://") or val.startswith("https://")):
        val = "https://" + val
        
    # Remove trailing slash
    val = val.rstrip("/")
    
    # Regex validate: must start with http:// or https:// followed by at least a domain format
    # Simple check is starts with http:// or https:// and has a dot
    is_valid = (val.startswith("http://") or val.startswith("https://")) and "." in val
    
    return val, is_valid

def import_pandas_isnan(val) -> bool:
    import math
    try:
        return math.isnan(val)
    except:
        return False
