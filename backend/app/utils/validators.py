import re
from typing import Tuple, Any

def clean_email(email_str: Any) -> Tuple[str, bool]:
    """
    Cleans and validates an email address.
    Returns a tuple of (cleaned_email_str, is_valid).
    """
    if email_str is None or (isinstance(email_str, float) and import_pandas_isnan(email_str)):
        return "", False
    
    val = str(email_str).strip().lower()
    if not val or val == 'nan':
        return "", False
        
    regex = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    is_valid = bool(re.match(regex, val))
    return val, is_valid

def import_pandas_isnan(val) -> bool:
    import math
    try:
        return math.isnan(val)
    except:
        return False
