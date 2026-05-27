from typing import Any, Tuple

def clean_linkedin_url(url_val: Any) -> Tuple[str, bool]:
    """
    Cleans a LinkedIn URL:
    - Strips whitespace.
    - Removes all query parameters (? and beyond).
    - Removes trailing slash.
    - Ensures URL starts with https://www.linkedin.com/ - prefixes it if it starts with linkedin.com/ or www.linkedin.com/.
    - Validates: must start with https://www.linkedin.com/in/ or https://www.linkedin.com/company/.
    Returns tuple (cleaned_url, is_valid)
    """
    if url_val is None or (isinstance(url_val, float) and import_pandas_isnan(url_val)):
        return "", False
        
    val = str(url_val).strip()
    if not val or val.lower() == 'nan':
        return "", False
        
    # Remove query parameters
    if "?" in val:
        val = val.split("?")[0]
        
    # Remove trailing slashes
    val = val.rstrip("/")
    
    # Standardize scheme
    if val.startswith("linkedin.com/"):
        val = "https://www." + val
    elif val.startswith("www.linkedin.com/"):
        val = "https://" + val
    elif val.startswith("http://linkedin.com/"):
        val = "https://www.linkedin.com/" + val[20:]
    elif val.startswith("http://www.linkedin.com/"):
        val = "https://www.linkedin.com" + val[24:]
    elif val.startswith("https://linkedin.com/"):
        # Replace https://linkedin.com/ with https://www.linkedin.com/
        val = "https://www.linkedin.com" + val[20:]
        
    # Check if starts with correct paths
    is_valid = val.startswith("https://www.linkedin.com/in/") or val.startswith("https://www.linkedin.com/company/")
    
    return val, is_valid

def import_pandas_isnan(val) -> bool:
    import math
    try:
        return math.isnan(val)
    except:
        return False
