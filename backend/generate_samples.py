import os
import pandas as pd
import json

# Ensure directories exist
os.makedirs("../sample_data", exist_ok=True)

# Define 40 rows of messy data with all target issues
data = [
    # 1. Standard valid row
    {
        "Person First Name": "John", "Person Last Name": "Doe", "Job Title": "Sales Director",
        "Company": "Acme Inc", "Email Address": "john.doe@acme.com", "Direct Phone": "+1 (555) 123-4567",
        "Mobile Phone": "555-987-6543", "LinkedIn URL": "https://www.linkedin.com/in/johndoe",
        "City": "New york", "State": "ny", "Country": "US", "Website": "http://acme.com/",
        "Industry": "Software", "Employees": "250", "Annual Revenue": "$50M",
        "Junk Column 1": "Trash1", "Internal Notes": "Notes1", "ZI Score": "95"
    },
    # 2. Casing issue (all caps)
    {
        "Person First Name": "JANE", "Person Last Name": "SMITH", "Job Title": "Marketing VP",
        "Company": "TECHSTART LLC", "Email Address": "JANE.SMITH@TECHSTART.IO", "Direct Phone": "+1 555-222-3333",
        "Mobile Phone": "", "LinkedIn URL": "linkedin.com/in/janesmith?trk=profile_share",
        "City": "SAN FRANCISCO", "State": "CA", "Country": "USA", "Website": "techstart.io/",
        "Industry": "Technology", "Employees": "50", "Annual Revenue": "$10M",
        "Junk Column 1": "Trash2", "Internal Notes": "Notes2", "ZI Score": "80"
    },
    # 3. Duplicate of John Doe (same email)
    {
        "Person First Name": "John", "Person Last Name": "Doe", "Job Title": "Director of Sales",
        "Company": "Acme", "Email Address": "john.doe@acme.com", "Direct Phone": "+1-555-123-4567",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/johndoe",
        "City": "New York City", "State": "New York", "Country": "United States", "Website": "https://acme.com",
        "Industry": "Software", "Employees": "250", "Annual Revenue": "50000000",
        "Junk Column 1": "Trash3", "Internal Notes": "Duplicate notes", "ZI Score": "92"
    },
    # 4. Invalid email (missing @)
    {
        "Person First Name": "Bob", "Person Last Name": "Jones", "Job Title": "Engineering Lead",
        "Company": "Globalnet Corp", "Email Address": "bjones_globalnet.net", "Direct Phone": "555-333-4444",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/bobjones",
        "City": "Chicago", "State": "IL", "Country": "U.S.A.", "Website": "http://www.globalnet.net",
        "Industry": "Networking", "Employees": "1200", "Annual Revenue": "$300M",
        "Junk Column 1": "Trash4", "Internal Notes": "Notes", "ZI Score": "70"
    },
    # 5. Invalid email (missing domain extension)
    {
        "Person First Name": "Charlie", "Person Last Name": "Brown", "Job Title": "Manager",
        "Company": "Red Balloon", "Email Address": "charlie@redballoon", "Direct Phone": "+1 555 444 5555",
        "Mobile Phone": "", "LinkedIn URL": "linkedin.com/in/charliebrown",
        "City": "Minneapolis", "State": "MN", "Country": "US", "Website": "http://redballoon.org/",
        "Industry": "Retail", "Employees": "15", "Annual Revenue": "$2M",
        "Junk Column 1": "Trash5", "Internal Notes": "Notes", "ZI Score": "60"
    },
    # 6. Blank row (fully blank - all key fields blank)
    {
        "Person First Name": "", "Person Last Name": "", "Job Title": "",
        "Company": "", "Email Address": "", "Direct Phone": "",
        "Mobile Phone": "", "LinkedIn URL": "",
        "City": "", "State": "", "Country": "", "Website": "",
        "Industry": "", "Employees": "", "Annual Revenue": "",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": ""
    },
    # 7. Invalid phone (too short)
    {
        "Person First Name": "Diana", "Person Last Name": "Prince", "Job Title": "Security Officer",
        "Company": "Themyscira LLC", "Email Address": "diana@amazon.org", "Direct Phone": "555-12",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/dianaprince",
        "City": "Washington", "State": "DC", "Country": "united states of america", "Website": "https://amazon.org/",
        "Industry": "Security", "Employees": "5", "Annual Revenue": "$500K",
        "Junk Column 1": "Trash6", "Internal Notes": "Notes", "ZI Score": "85"
    },
    # 8. Invalid phone (contains letters)
    {
        "Person First Name": "Evan", "Person Last Name": "Wright", "Job Title": "Lead Architect",
        "Company": "Design Co.", "Email Address": "evan.wright@designco.com", "Direct Phone": "555-PHONE-1",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/evanwright/",
        "City": "Boston", "State": "MA", "Country": "US", "Website": "designco.com",
        "Industry": "Design", "Employees": "80", "Annual Revenue": "$15M",
        "Junk Column 1": "Trash7", "Internal Notes": "Notes", "ZI Score": "78"
    },
    # 9. Extra spaces in name/emails
    {
        "Person First Name": "  Fiona  ", "Person Last Name": "  Gallagher  ", "Job Title": "Operations Coordinator",
        "Company": "Patty's Pub", "Email Address": "  fiona.g@pattys.com  ", "Direct Phone": "555-777-8888",
        "Mobile Phone": "", "LinkedIn URL": "linkedin.com/in/fionagallagher",
        "City": "Chicago", "State": "IL", "Country": "US", "Website": "https://pattyspub.com",
        "Industry": "Hospitality", "Employees": "12", "Annual Revenue": "$1M",
        "Junk Column 1": "Trash8", "Internal Notes": "Notes", "ZI Score": "50"
    },
    # 10. Duplicate of Jane Smith (same email)
    {
        "Person First Name": "Jane", "Person Last Name": "Smith", "Job Title": "Marketing VP",
        "Company": "Techstart LLC", "Email Address": "jane.smith@techstart.io", "Direct Phone": "+1 555-222-3333",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/janesmith",
        "City": "San Francisco", "State": "CA", "Country": "US", "Website": "https://techstart.io",
        "Industry": "Technology", "Employees": "50", "Annual Revenue": "$10M",
        "Junk Column 1": "Trash", "Internal Notes": "Notes", "ZI Score": "80"
    },
    # 11. Country code UK
    {
        "Person First Name": "George", "Person Last Name": "Windsor", "Job Title": "HR Manager",
        "Company": "Royal Trust", "Email Address": "george@royaltrust.co.uk", "Direct Phone": "+44 20 7946 0958",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/company/royaltrust",
        "City": "London", "State": "", "Country": "UK", "Website": "http://royaltrust.co.uk/",
        "Industry": "Finance", "Employees": "1500", "Annual Revenue": "$250M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "90"
    },
    # 12. Duplicate of George Windsor (same LinkedIn)
    {
        "Person First Name": "George", "Person Last Name": "Windsor-Copied", "Job Title": "HR Manager",
        "Company": "Royal Trust Copy", "Email Address": "george.w@royaltrust.co.uk", "Direct Phone": "+44 20 7946 0958",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/company/royaltrust",
        "City": "London", "State": "", "Country": "u.k.", "Website": "http://royaltrust.co.uk",
        "Industry": "Finance", "Employees": "1500", "Annual Revenue": "$250M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "90"
    },
    # 13. Mixed casing & UAE country
    {
        "Person First Name": "hassan", "Person Last Name": "bin-ali", "Job Title": "Sales exec",
        "Company": "emirates tech pvt ltd", "Email Address": "hassan.ali@emirates.ae", "Direct Phone": "+971-4-1234567",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/hassanbinali?ref=sales",
        "City": "dubai", "State": "Dubai", "Country": "uae", "Website": "http://emtech.ae",
        "Industry": "Tech", "Employees": "45", "Annual Revenue": "$8M",
        "Junk Column 1": "Trash", "Internal Notes": "", "ZI Score": "88"
    },
    # 14. Invalid Email (double dots)
    {
        "Person First Name": "Ian", "Person Last Name": "Malcolm", "Job Title": "Consultant",
        "Company": "InGen", "Email Address": "ian..malcolm@ingen.org", "Direct Phone": "555-888-9999",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/ianmalcolm",
        "City": "Costa Rica", "State": "", "Country": "Costa Rica", "Website": "https://ingen.org",
        "Industry": "Biotech", "Employees": "300", "Annual Revenue": "$120M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "91"
    },
    # 15. Invalid Email (missing domain)
    {
        "Person First Name": "Julia", "Person Last Name": "Roberts", "Job Title": "Actress",
        "Company": "Hollywood Inc", "Email Address": "julia@.com", "Direct Phone": "555-123-0000",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/juliaroberts",
        "City": "Los Angeles", "State": "California", "Country": "USA", "Website": "https://hollywood.com",
        "Industry": "Entertainment", "Employees": "100", "Annual Revenue": "$40M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "84"
    },
    # 16. Blank row (fully blank)
    {
        "Person First Name": "", "Person Last Name": "", "Job Title": "",
        "Company": "", "Email Address": "", "Direct Phone": "",
        "Mobile Phone": "", "LinkedIn URL": "",
        "City": "", "State": "", "Country": "", "Website": "",
        "Industry": "", "Employees": "", "Annual Revenue": "",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": ""
    },
    # 17. Duplicate of Hassan (same email)
    {
        "Person First Name": "Hassan", "Person Last Name": "Bin Ali", "Job Title": "Sales Exec",
        "Company": "Emirates Tech", "Email Address": "hassan.ali@emirates.ae", "Direct Phone": "+971-4-1234567",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/hassanbinali",
        "City": "Dubai", "State": "Dubai", "Country": "UAE", "Website": "https://emtech.ae",
        "Industry": "Tech", "Employees": "45", "Annual Revenue": "$8M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "88"
    },
    # 18. Invalid Phone (too long)
    {
        "Person First Name": "Kevin", "Person Last Name": "Bacon", "Job Title": "Actor",
        "Company": "Six Degrees", "Email Address": "kevin@sixdegrees.com", "Direct Phone": "+1-555-123-4567890123",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/in/kevinbacon",
        "City": "Philadelphia", "State": "PA", "Country": "US", "Website": "http://sixdegrees.com",
        "Industry": "Media", "Employees": "10", "Annual Revenue": "$1M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "75"
    },
    # 19. Invalid LinkedIn (no in/company path)
    {
        "Person First Name": "Lara", "Person Last Name": "Croft", "Job Title": "Explorer",
        "Company": "Croft Holdings", "Email Address": "lara@croft.com", "Direct Phone": "555-999-0000",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/croft",
        "City": "London", "State": "", "Country": "UK", "Website": "https://croft.com/",
        "Industry": "Archeology", "Employees": "1", "Annual Revenue": "$100M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "98"
    },
    # 20. Duplicate of Lara Croft (same Name + Company)
    {
        "Person First Name": "Lara", "Person Last Name": "Croft", "Job Title": "Tomb Raider",
        "Company": "Croft Holdings", "Email Address": "lara.croft@croft.com", "Direct Phone": "555-999-0000",
        "Mobile Phone": "", "LinkedIn URL": "https://www.linkedin.com/company/croft-holdings",
        "City": "London", "State": "", "Country": "United Kingdom", "Website": "https://croft.com",
        "Industry": "Archeology", "Employees": "1", "Annual Revenue": "$100M",
        "Junk Column 1": "", "Internal Notes": "", "ZI Score": "98"
    }
]

# Expand list to 40 rows using some copy variations to reach 40 rows
while len(data) < 40:
    i = len(data)
    ref_row = data[i % 15].copy() # Copy from previous valid/messy rows
    
    # Mutate slightly to avoid infinite duplicates if we want unique rows
    if i >= 20:
        # Create unique rows
        first_names = ["Michael", "Nancy", "Oliver", "Patricia", "Quincy", "Rachel", "Steven", "Tina", "Victor", "Wendy", "Xavier", "Yolanda", "Zachary", "Arthur", "Beatrice", "Connor", "Deborah", "Edward", "Felicia", "Gerald"]
        last_names = ["Scott", "Drew", "Queen", "Miller", "Jones", "Green", "Rogers", "Turner", "Valdes", "Wu", "Xavier", "Young", "Zimmerman", "Pendragon", "Kiddo", "McLeod", "Hale", "Elric", "Hardy", "Butler"]
        idx = i - 20
        fn = first_names[idx % len(first_names)]
        ln = last_names[idx % len(last_names)]
        ref_row["Person First Name"] = fn
        ref_row["Person Last Name"] = ln
        ref_row["Email Address"] = f"{fn.lower()}.{ln.lower()}{i}@example.com"
        ref_row["Direct Phone"] = f"555-01{i:02d}"
        ref_row["LinkedIn URL"] = f"https://www.linkedin.com/in/{fn.lower()}{ln.lower()}"
        ref_row["Company"] = f"Company {i} LLC"
        ref_row["Website"] = f"https://company{i}.com"
    data.append(ref_row)

# Ensure exactly 3 blank rows (index 5, 15, and let's make 25 fully blank)
data[5] = {k: "" for k in data[0].keys()}
data[15] = {k: "" for k in data[0].keys()}
data[25] = {k: "" for k in data[0].keys()}

# Write messy CSV
df_messy = pd.DataFrame(data)
df_messy.to_csv("../sample_data/messy_zoominfo_sample.csv", index=False)
print("Saved messy_zoominfo_sample.csv")

# Now let's programmatically run the cleaner service on it to generate the expected_cleaned_output.csv
from app.services.cleaning_service import process_cleaning_pipeline

field_mapping = {
    "First Name": "Person First Name",
    "Last Name": "Person Last Name",
    "Full Name": "Person First Name", # Will auto trigger full name generation
    "Job Title": "Job Title",
    "Company Name": "Company",
    "Company Website": "Website",
    "Email": "Email Address",
    "Phone Number": "Direct Phone",
    "Mobile Number": "Mobile Phone",
    "LinkedIn Profile URL": "LinkedIn URL",
    "City": "City",
    "State": "State",
    "Country": "Country",
    "Industry": "Industry",
    "Employee Size": "Employees",
    "Revenue": "Annual Revenue"
}

cleaned_df, invalid_df, duplicates_df, summary = process_cleaning_pipeline(
    df=df_messy,
    field_mapping=field_mapping,
    selected_output_fields=list(field_mapping.keys()),
    options={
        "validate_emails": True,
        "validate_phones": True,
        "clean_linkedin": True,
        "clean_websites": True,
        "remove_duplicates": True,
        "remove_blank_rows": True,
        "generate_invalid_file": True,
        "generate_duplicate_file": True
    }
)

# Export cleaned leads
cleaned_df.to_csv("../sample_data/expected_cleaned_output.csv", index=False)
print("Saved expected_cleaned_output.csv")
print("Summary statistics:")
print(json.dumps(summary, indent=2))
