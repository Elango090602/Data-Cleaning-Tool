import re
from typing import List, Dict

MAPPING_HINTS = {
    "First Name":           ["firstname", "personfirstname", "contactfirstname", "givenname"],
    "Last Name":            ["lastname", "personlastname", "contactlastname", "surname", "familyname"],
    "Full Name":            ["fullname", "name", "contactname"],
    "Job Title":            ["jobtitle", "title", "position", "role", "designation"],
    "Company Name":         ["company", "companyname", "accountname", "organization", "employer"],
    "Company Website":      ["website", "companywebsite", "url", "companydomain", "web"],
    "Email":                ["email", "emailaddress", "workemail", "businessemail"],
    "Phone Number":         ["phone", "phonenumber", "directphone", "workphone", "telephone"],
    "Mobile Number":        ["mobile", "mobilenumber", "mobilephone", "cellphone", "cell"],
    "LinkedIn Profile URL": ["linkedin", "linkedinurl", "linkedinprofile", "linkedinprofileurl"],
    "City":                 ["city", "town"],
    "State":                ["state", "province", "region"],
    "Country":              ["country", "nation"],
    "Industry":             ["industry", "sector", "vertical"],
    "Employee Size":        ["employeesize", "employees", "companysize", "headcount", "numemployees"],
    "Revenue":              ["revenue", "annualrevenue", "companyrevenue"],
    "Lead Source":          ["leadsource", "source", "channel"],
    "Date (DD-MM-YYYY)":    ["date", "startdate", "enddate", "createdat", "updatedat", "timestamp", "hiredate", "doj", "joiningdate"],
}

def normalize_string(s: str) -> str:
    """
    Lowercases a string and strips out all non-alphanumeric characters.
    """
    return re.sub(r'[^a-z0-9]', '', s.lower())

def auto_map_columns(detected_columns: List[str]) -> Dict[str, str]:
    """
    Fuzzy auto-maps uploaded columns to the system's standard fields.
    Returns standard_field -> uploaded_column_name mapping.
    """
    mapping = {}
    # Keep track of columns already mapped to avoid double mapping
    mapped_columns = set()
    
    normalized_detected = {normalize_string(col): col for col in detected_columns}
    
    for standard_field, hints in MAPPING_HINTS.items():
        standard_normalized = normalize_string(standard_field)
        
        # 1. Direct exact/normalized match
        if standard_normalized in normalized_detected:
            col_name = normalized_detected[standard_normalized]
            if col_name not in mapped_columns:
                mapping[standard_field] = col_name
                mapped_columns.add(col_name)
                continue
                
        # 2. Check hint list matches
        matched = False
        for hint in hints:
            hint_normalized = normalize_string(hint)
            if hint_normalized in normalized_detected:
                col_name = normalized_detected[hint_normalized]
                if col_name not in mapped_columns:
                    mapping[standard_field] = col_name
                    mapped_columns.add(col_name)
                    matched = True
                    break
        if matched:
            continue
            
        # 3. Substring check
        for norm_det, orig_det in normalized_detected.items():
            if orig_det in mapped_columns:
                continue
            # If standard field name is part of the detected column or vice-versa
            if standard_normalized in norm_det or norm_det in standard_normalized:
                mapping[standard_field] = orig_det
                mapped_columns.add(orig_det)
                break
                
    return mapping
