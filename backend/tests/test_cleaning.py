import io
import os
import tempfile
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.validators import clean_email
from app.utils.phone_cleaners import clean_phone
from app.utils.linkedin_cleaners import clean_linkedin_url
from app.services.cleaning_service import process_cleaning_pipeline
from app.services.export_service import export_csv, export_xlsx

client = TestClient(app)

# 1. test_csv_upload
def test_csv_upload():
    csv_data = "Person First Name,Person Last Name,Email Address\nJohn,Doe,john@example.com\n"
    file = ("leads.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    response = client.post("/api/upload", files={"file": file})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "detected_columns" in data
    assert "Person First Name" in data["detected_columns"]
    assert data["total_rows"] == 1

# 2. test_xlsx_upload
def test_xlsx_upload():
    # Create simple Excel in memory
    df = pd.DataFrame([{"Person First Name": "Jane", "Person Last Name": "Smith", "Email Address": "jane@example.com"}])
    excel_file = io.BytesIO()
    df.to_excel(excel_file, index=False, engine="openpyxl")
    excel_file.seek(0)
    
    file = ("leads.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response = client.post("/api/upload", files={"file": file})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["total_rows"] == 1

# 3. test_invalid_file_type
def test_invalid_file_type():
    file = ("leads.txt", io.BytesIO(b"Hello world"), "text/plain")
    response = client.post("/api/upload", files={"file": file})
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

# 4. test_email_validation
def test_email_validation():
    # Valid emails
    valid_emails = ["test@example.com", "user.name+tag@domain.co.uk", "a@b.co"]
    for email in valid_emails:
        cleaned, is_valid = clean_email(email)
        assert is_valid
        assert cleaned == email.lower()
        
    # Invalid emails
    invalid_emails = ["testexample.com", "user@name", "user@.com", "user@domain.c"]
    for email in invalid_emails:
        _, is_valid = clean_email(email)
        assert not is_valid

# 5. test_phone_cleaning
def test_phone_cleaning():
    test_cases = [
        ("(123) 456-7890", "1234567890", True),
        ("+1-234-567-8901", "+12345678901", True),
        ("555-0192", "5550192", True),
        ("+91 44 4244 4555 ext. 698", "+914442444555", True),
        ("+1 123 456 7890 x42", "+11234567890", True),
        ("1234567890 #101", "1234567890", True),
        ("12345", "12345", False),  # Too short
        ("12345678901234567", "12345678901234567", False),  # Too long
        ("abc-def-ghij", "", False) # Invalid characters
    ]
    for raw, expected, is_valid_expected in test_cases:
        cleaned, is_valid = clean_phone(raw)
        assert is_valid == is_valid_expected
        if is_valid_expected:
            assert cleaned == expected

# 6. test_linkedin_cleaning
def test_linkedin_cleaning():
    test_cases = [
        ("linkedin.com/in/john-doe?trk=profile_share", "https://www.linkedin.com/in/john-doe", True),
        ("https://www.linkedin.com/company/google/", "https://www.linkedin.com/company/google", True),
        ("www.linkedin.com/in/jane-doe/", "https://www.linkedin.com/in/jane-doe", True),
        ("https://linkedin.com/in/alex", "https://www.linkedin.com/in/alex", True),
        ("https://www.google.com", "https://www.google.com", False) # Not a LinkedIn URL
    ]
    for raw, expected, is_valid_expected in test_cases:
        cleaned, is_valid = clean_linkedin_url(raw)
        assert is_valid == is_valid_expected
        if is_valid_expected:
            assert cleaned == expected

# 7. test_duplicate_detection
def test_duplicate_detection():
    data = [
        {"Email": "alice@example.com", "Phone": "555-1234", "LinkedIn": "linkedin.com/in/alice", "First Name": "Alice", "Last Name": "Smith", "Company": "Acme"},
        {"Email": "alice@example.com", "Phone": "555-9999", "LinkedIn": "linkedin.com/in/alice-other", "First Name": "Alice", "Last Name": "Smith", "Company": "Acme"}, # Dupe email
        {"Email": "bob@example.com", "Phone": "555-1234", "LinkedIn": "linkedin.com/in/bob", "First Name": "Bob", "Last Name": "Jones", "Company": "TechStart"}, # Dupe phone
        {"Email": "charlie@example.com", "Phone": "555-5678", "LinkedIn": "linkedin.com/in/alice", "First Name": "Charlie", "Last Name": "Brown", "Company": "Global"}, # Dupe linkedin
        {"Email": "diana@example.com", "Phone": "555-7777", "LinkedIn": "linkedin.com/in/diana", "First Name": "Alice", "Last Name": "Smith", "Company": "Acme"}, # Dupe Name + Company
        {"Email": "evan@example.com", "Phone": "555-8888", "LinkedIn": "linkedin.com/in/evan", "First Name": "Evan", "Last Name": "Wright", "Company": "Design Co"} # Unique
    ]
    df = pd.DataFrame(data)
    column_configs = [
        {"original_name": "First Name", "output_name": "First Name", "clean_type": "First Name", "included": True},
        {"original_name": "Last Name", "output_name": "Last Name", "clean_type": "Last Name", "included": True},
        {"original_name": "First Name", "output_name": "Full Name", "clean_type": "Full Name", "included": True},
        {"original_name": "Email", "output_name": "Email", "clean_type": "Email", "included": True},
        {"original_name": "Phone", "output_name": "Phone Number", "clean_type": "Phone Number", "included": True},
        {"original_name": "LinkedIn", "output_name": "LinkedIn Profile URL", "clean_type": "LinkedIn Profile URL", "included": True},
        {"original_name": "Company", "output_name": "Company Name", "clean_type": "Company Name", "included": True}
    ]
    
    cleaned_df, invalid_df, duplicates_df, summary = process_cleaning_pipeline(
        df=df,
        column_configs=column_configs,
        options={"remove_duplicates": True}
    )
    
    # Anti-collision design: Row 1 & 2 have contradictory LinkedIn URLs, and Row 1 & 5 have contradictory
    # LinkedIn profiles, so they are safely kept separate. Row 4 is a duplicate of Row 1 (matching LinkedIn).
    assert len(cleaned_df) == 5
    assert len(duplicates_df) == 2
    assert summary["duplicates_found"] == 1

# 8. test_blank_row_removal
def test_blank_row_removal():
    data = [
        {"First Name": "John", "Last Name": "Doe", "Email": "john@example.com", "Phone": "555-0101"},
        {"First Name": "", "Last Name": "", "Email": "", "Phone": ""}, # Blank
        {"First Name": "   ", "Last Name": "  ", "Email": None, "Phone": "  "}, # Blank
        {"First Name": "Bob", "Last Name": "", "Email": "bob@example.com", "Phone": ""} # Non-blank (has First Name + Email)
    ]
    df = pd.DataFrame(data)
    column_configs = [
        {"original_name": "First Name", "output_name": "First Name", "clean_type": "First Name", "included": True},
        {"original_name": "Last Name", "output_name": "Last Name", "clean_type": "Last Name", "included": True},
        {"original_name": "Email", "output_name": "Email", "clean_type": "Email", "included": True},
        {"original_name": "Phone", "output_name": "Phone Number", "clean_type": "Phone Number", "included": True}
    ]
    cleaned_df, _, _, summary = process_cleaning_pipeline(
        df=df,
        column_configs=column_configs,
        options={"remove_blank_rows": True, "remove_duplicates": False}
    )
    
    assert len(cleaned_df) == 2
    # Rows 1 and 4 are kept; rows 2 and 3 are removed as blank.

# 9. test_export_csv
def test_export_csv():
    df = pd.DataFrame([{"First Name": "John", "Email": "john@example.com"}])
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, "test.csv")
        export_csv(df, csv_path)
        assert os.path.exists(csv_path)
        
        # Verify sig signature
        with open(csv_path, "rb") as f:
            content = f.read()
            # Should start with UTF-8 BOM
            assert content.startswith(b'\xef\xbb\xbf')

# 10. test_export_xlsx
def test_export_xlsx():
    df = pd.DataFrame([{"First Name": "Jane", "Email": "jane@example.com"}])
    with tempfile.TemporaryDirectory() as tmpdir:
        xlsx_path = os.path.join(tmpdir, "test.xlsx")
        export_xlsx(df, xlsx_path)
        assert os.path.exists(xlsx_path)
        
        # Verify it loads back
        df_loaded = pd.read_excel(xlsx_path)
        assert df_loaded.iloc[0]["First Name"] == "Jane"
