from typing import Any, Tuple
import re

# Comprehensive list of valid ITU international country calling codes sorted by length descending
COUNTRY_CODES = [
    # 3-digit prefixes
    "971", "353", "852", "966", "972", "380", "506", "593", "595", "598", "994", "995", "996", "998", "375", "381",
    # 2-digit prefixes
    "91", "44", "61", "65", "33", "49", "81", "86", "31", "39", "34", "41", "46", "64", "60", "62", "63", 
    "66", "82", "84", "90", "32", "43", "45", "47", "48", "55", "52", "27", "20", "30", "36", "40", "51", "54",
    # 1-digit prefixes
    "1", "7"
]

def clean_and_split_phone(phone_val: Any) -> Tuple[str, str, bool]:
    """
    Intelligent Country-Code Aware Phone Splitter.
    Parses international numbers using prefix matching and respects variable local lengths (e.g. SG=8, AU=9, IN/US=10).
    """
    if phone_val is None or (isinstance(phone_val, float) and import_pandas_isnan(phone_val)):
        return "", "", False
        
    raw_str = str(phone_val).strip()
    if not raw_str or raw_str.lower() in ['nan', 'none', 'null']:
        return "", "", False
        
    # --- STAGE 1: Trimming & Prefix Label Purging ---
    cleaned = raw_str.strip("'\"`()[]{} ")
    # Clean leading/trailing non-alphanumeric noise except '+'
    cleaned = re.sub(r"^[^\w+]+|[^\w]+$", "", cleaned)
    # Remove labels like 'tel:', 'mob:'
    cleaned = re.sub(r"^(tel|phone|cell|mob|mobile|office|p|m)[:\-\s]+", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("'\"`()[]{} ")
    
    # Strip extension suffixes like "ext. 698", "x698", "#698" to prevent merging digits
    cleaned = re.sub(r"\s*(?:ext(?:ension)?\.?|x|#)\s*[\d\-\#\s]+$", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("'\"`()[]{} ")
    
    # Detect if it has an international prefix indicator (+ or 00)
    has_plus_indicator = cleaned.startswith("+") or cleaned.startswith("00")
    
    # --- STAGE 2: Punctuation Purging & Digits Extraction ---
    # Strip spaces, hyphens, dots, commas, parentheses
    digits_only = re.sub(r"\D", "", cleaned)
    
    if not digits_only:
        return "", "", False
        
    is_valid = 7 <= len(digits_only) <= 15
    country_code = ""
    local_number = digits_only
    
    # --- STAGE 3: Country-Code Aware Splitting ---
    if has_plus_indicator:
        # If it started with 00, strip the leading zeros for matching
        match_digits = digits_only[2:] if cleaned.startswith("00") else digits_only
        
        # Match against our comprehensive E.164 database sorted by length desc
        matched_prefix = None
        for prefix in COUNTRY_CODES:
            if match_digits.startswith(prefix):
                matched_prefix = prefix
                break
                
        if matched_prefix:
            country_code = f"+{matched_prefix}"
            # Extract the remaining trailing digits as the actual local number
            local_number = match_digits[len(matched_prefix):]
        else:
            # Fallback if no matching prefix found: keep full digits as local
            country_code = ""
            local_number = digits_only
            
    else:
        # No '+' or '00' prefix: evaluate based on standard local lengths
        if len(digits_only) == 10:
            # Typical US or Indian local number
            country_code = ""
            local_number = digits_only
        elif len(digits_only) == 11 and digits_only.startswith("1"):
            # US number with leading 1
            country_code = "+1"
            local_number = digits_only[1:]
        elif len(digits_only) == 12 and digits_only.startswith("91"):
            # Indian number with leading 91
            country_code = "+91"
            local_number = digits_only[2:]
        else:
            # Scan if it starts with other prefixes
            matched_prefix = None
            for prefix in COUNTRY_CODES:
                if digits_only.startswith(prefix) and len(digits_only) - len(prefix) >= 7:
                    matched_prefix = prefix
                    break
            if matched_prefix:
                country_code = f"+{matched_prefix}"
                local_number = digits_only[len(matched_prefix):]
            else:
                country_code = ""
                local_number = digits_only
                
    return country_code, local_number, is_valid

def clean_phone(phone_val: Any) -> Tuple[str, bool]:
    """
    Legacy wrapper to maintain E.164 E2E compatibility.
    """
    cc, num, is_valid = clean_and_split_phone(phone_val)
    full = f"{cc}{num}" if cc else num
    return full, is_valid

def import_pandas_isnan(val) -> bool:
    import math
    try:
        return math.isnan(val)
    except:
        return False
