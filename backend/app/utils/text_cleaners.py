import re
from typing import Any

def clean_name(name_val: Any) -> str:
    """
    Cleans a person's first or last name.
    - Strips whitespace.
    - Collapses multiple spaces to a single space.
    - Applies Python's .title() for proper case.
    - Removes characters not in [A-Za-z\\s\\-\\'] or periods (e.g. [A-Za-z\\s\\-\\'\\.]).
    """
    if name_val is None or (isinstance(name_val, float) and import_pandas_isnan(name_val)):
        return ""
    
    val = str(name_val).strip()
    if not val or val.lower() == 'nan':
        return ""
        
    # Collapse multiple spaces to single space
    val = " ".join(val.split())
    # Remove chars not in [A-Za-z\s\-\'\.]
    val = re.sub(r"[^A-Za-z\s\-\'\.]", "", val)
    # Apply proper title case
    val = val.title()
    return val

def clean_company_name(company_val: Any) -> str:
    """
    Cleans a company name.
    - Strips whitespace.
    - Collapses multiple spaces.
    - Applies proper case but preserves specific suffixes (LLC, Inc, Ltd, Corp, Pvt Ltd).
    """
    if company_val is None or (isinstance(company_val, float) and import_pandas_isnan(company_val)):
        return ""
        
    val = str(company_val).strip()
    if not val or val.lower() == 'nan':
        return ""
        
    val = " ".join(val.split())
    val = val.title()
    
    # Suffix mapping for replacements
    suffixes = {
        r"\bLlc\b": "LLC",
        r"\bInc\b": "Inc",
        r"\bLtd\b": "Ltd",
        r"\bCorp\b": "Corp",
        r"\bPvt\b": "Pvt",
        r"\bCo\b": "Co",
        r"\bCo\.\b": "Co."
    }
    
    for pattern, replacement in suffixes.items():
        val = re.sub(pattern, replacement, val)
        
    return val

COUNTRY_NORMALIZATION_MAP = {
    "usa": "United States",
    "us": "United States",
    "u.s.a.": "United States",
    "united states of america": "United States",
    "united states": "United States",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
    "united kingdom": "United Kingdom",
    "uae": "United Arab Emirates",
    "united arab emirates": "United Arab Emirates"
}

def clean_location(loc_val: Any, is_country: bool = False) -> str:
    """
    Cleans location fields (City, State, Country).
    - Strips whitespace.
    - Proper case for city and state.
    - Country normalization map applies if is_country=True.
    """
    if loc_val is None or (isinstance(loc_val, float) and import_pandas_isnan(loc_val)):
        return ""
        
    val = str(loc_val).strip()
    if not val or val.lower() == 'nan':
        return ""
        
    if is_country:
        norm_key = " ".join(val.lower().split())
        if norm_key in COUNTRY_NORMALIZATION_MAP:
            return COUNTRY_NORMALIZATION_MAP[norm_key]
            
    val = " ".join(val.split())
    return val.title()

def import_pandas_isnan(val) -> bool:
    import math
    try:
        return math.isnan(val)
    except:
        return False
