import os
import sys
from fastapi.testclient import TestClient

# Ensure backend root is in search path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app)

filepath = "../sample_data/messy_zoominfo_sample.csv"
if not os.path.exists(filepath):
    print(f"Error: {filepath} does not exist!")
    sys.exit(1)

print(f"Uploading file: {filepath}")
with open(filepath, "rb") as f:
    files = {"file": ("messy_zoominfo_sample.csv", f, "text/csv")}
    response = client.post("/upload", files=files)

print("Response Status Code:", response.status_code)
if response.status_code == 200:
    print("Upload Succeeded! Response JSON:")
    print(response.json().keys())
    print("Auto-mapping suggested keys:")
    print(response.json()["auto_mapping"])
else:
    print("Upload Failed! Detail:")
    print(response.text)
