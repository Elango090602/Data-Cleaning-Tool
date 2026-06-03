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
    
    cleaned_df, invalid_df, duplicates_df, outliers_df, summary = process_cleaning_pipeline(
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
    cleaned_df, _, _, _, summary = process_cleaning_pipeline(
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

# 11. test_date_cleaning
def test_date_cleaning():
    from app.utils.date_cleaners import clean_date_string
    test_cases = [
        ("1988-10-01T00:00:00", "01-10-1988", "00:00:00", True),
        ("2023-06-01 12:30:15", "01-06-2023", "12:30:15", True),
        ("2025-12-01", "01-12-2025", "00:00:00", True),
        ("invalid-date-format", "", "", False),
        ("", "", "", False),
        (None, "", "", False)
    ]
    for raw, expected_date, expected_time, is_valid_expected in test_cases:
        date_part, time_part, is_valid = clean_date_string(raw)
        assert is_valid == is_valid_expected
        if is_valid_expected:
            assert date_part == expected_date
            assert time_part == expected_time

# 12. test_date_pipeline
def test_date_pipeline():
    data = [
        {"Job Start Date": "1988-10-01T00:00:00", "Hire Date": "2023-06-01 12:30:00", "Email": "alice@example.com"},
        {"Job Start Date": "2025-12-01T00:00:00", "Hire Date": "invalid-date", "Email": "bob@example.com"}
    ]
    df = pd.DataFrame(data)
    column_configs = [
        {"original_name": "Email", "output_name": "Email", "clean_type": "Email", "included": True},
        {"original_name": "Job Start Date", "output_name": "Start Date", "clean_type": "Date (Split Date & Time)", "included": True},
        {"original_name": "Hire Date", "output_name": "Hire Date", "clean_type": "Date (DD-MM-YYYY)", "included": True}
    ]
    
    cleaned_df, _, _, _, _ = process_cleaning_pipeline(
        df=df,
        column_configs=column_configs,
        options={"remove_duplicates": False}
    )
    
    # Assert columns exported
    assert "Start Date" in cleaned_df.columns
    assert "Start Date Time" in cleaned_df.columns
    assert "Hire Date" in cleaned_df.columns
    
    # Assert values
    assert cleaned_df.iloc[0]["Start Date"] == "01-10-1988"
    assert cleaned_df.iloc[0]["Start Date Time"] == "00:00:00"
    assert cleaned_df.iloc[0]["Hire Date"] == "01-06-2023"
    
    # Assert invalid date handling (warning mapped)
    assert cleaned_df.iloc[1]["Start Date"] == "01-12-2025"
    assert cleaned_df.iloc[1]["Hire Date"] == ""
    assert "Invalid date format" in cleaned_df.iloc[1]["Cleaning Remarks"]
    assert cleaned_df.iloc[1]["Data Quality Status"] == "Needs Review"


# 13. test_grading_and_outliers
def test_grading_and_outliers():
    # Setup messy records:
    # Row 0: Grade A (complete and valid contact)
    # Row 1: Grade B (valid contact, but missing Job Title)
    # Row 2: Grade C (no direct contact, but has Name, Job Title, Company Name for manual linkedin search)
    # Row 3: Quarantined (no contact AND missing Job Title / Company)
    # Row 4-10: Dominant corporate roles
    # Row 11: Outlier (Job Title is "Truck Driver", which is a low-level service role in a corporate list)
    data = [
        {"First Name": "Alice", "Last Name": "Smith", "Job Title": "Chief Executive Officer", "Company": "Acme Corp", "Email": "alice@acme.com"},
        {"First Name": "Bob", "Last Name": "Jones", "Job Title": "", "Company": "TechStart", "Email": "bob@tech.com"},
        {"First Name": "Charlie", "Last Name": "Brown", "Job Title": "Director of Operations", "Company": "Globalnet", "Email": ""},
        {"First Name": "Diana", "Last Name": "Prince", "Job Title": "", "Company": "", "Email": ""},
        
        {"First Name": "Edward", "Last Name": "Elric", "Job Title": "Vice President", "Company": "State Corp", "Email": "ed@state.com"},
        {"First Name": "Fiona", "Last Name": "Gallagher", "Job Title": "Manager", "Company": "Patty's", "Email": "fiona@patty.com"},
        {"First Name": "George", "Last Name": "Windsor", "Job Title": "Managing Director", "Company": "Royal Trust", "Email": "george@royal.com"},
        {"First Name": "Hassan", "Last Name": "Ali", "Job Title": "President", "Company": "Emirates", "Email": "hassan@emirates.ae"},
        {"First Name": "Ian", "Last Name": "Malcolm", "Job Title": "VP Engineering", "Company": "InGen", "Email": "ian@ingen.org"},
        {"First Name": "Julia", "Last Name": "Roberts", "Job Title": "COO", "Company": "Hollywood", "Email": "julia@hollywood.com"},
        
        {"First Name": "Kevin", "Last Name": "Bacon", "Job Title": "Truck Driver", "Company": "Six Degrees", "Email": "kevin@six.com"}
    ]
    df = pd.DataFrame(data)
    column_configs = [
        {"original_name": "First Name", "output_name": "First Name", "clean_type": "First Name", "included": True},
        {"original_name": "Last Name", "output_name": "Last Name", "clean_type": "Last Name", "included": True},
        {"original_name": "Job Title", "output_name": "Job Title", "clean_type": "Job Title", "included": True},
        {"original_name": "Company", "output_name": "Company Name", "clean_type": "Company Name", "included": True},
        {"original_name": "Email", "output_name": "Email", "clean_type": "Email", "included": True}
    ]
    
    cleaned_df, invalid_df, duplicates_df, outliers_df, summary = process_cleaning_pipeline(
        df=df,
        column_configs=column_configs,
        options={"remove_duplicates": False, "validate_emails": True}
    )
    
    # Combined final clean list has 9 elements (Row 0, 1, 2, 4, 5, 6, 7, 8, 9 except Row 3 (Quarantined) and Row 10 (Outlier))
    # Row 3 lacks contact and core details (no Company/Job) -> Quarantined (invalid_df)
    assert len(invalid_df) == 1
    # Row 10 is classified as an outlier ("Truck Driver" in executive list)
    assert len(outliers_df) == 1
    assert outliers_df.iloc[0]["Job Title"] == "Truck Driver"
    
    # We have 9 clean records (including Grade C manual work and Grade B warnings)
    assert len(cleaned_df) == 9
    
    # Check Grades
    # Row 0: Grade A
    row_0 = cleaned_df[cleaned_df["First Name"] == "Alice"].iloc[0]
    assert row_0["Lead Grade"] == "Grade A"
    assert row_0["Data Quality Status"] == "Valid"
    
    # Row 1: Grade B (missing Job Title)
    row_1 = cleaned_df[cleaned_df["First Name"] == "Bob"].iloc[0]
    assert row_1["Lead Grade"] == "Grade B"
    assert row_1["Data Quality Status"] == "Valid"
    
    # Row 2: Grade C (no email, but has Job Title + Company)
    row_2 = cleaned_df[cleaned_df["First Name"] == "Charlie"].iloc[0]
    assert row_2["Lead Grade"] == "Grade C"
    assert row_2["Data Quality Status"] == "Needs Review"
    
    # Row 3 in invalid_df should be Quarantined
    assert invalid_df.iloc[0]["Lead Grade"] == "Quarantined"
    assert invalid_df.iloc[0]["Data Quality Status"] == "Invalid"

