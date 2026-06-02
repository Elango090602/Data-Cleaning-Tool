LeadSanity
![LeadSanity Landing Page](./a_clean_modern_saas_landing_page_screenshot_her.png)
LeadSanity is a modern B2B lead data cleaning platform that helps teams upload messy CSV or Excel lead lists, clean and standardize the data, remove duplicates, validate key fields, and export CRM-ready files in minutes.
It is designed for sales, marketing, and GTM teams that work with exported lead data from tools like ZoomInfo, Apollo.io, LinkedIn Sales Navigator, web scraping sources, or manual Excel sheets.
---
Overview
Messy lead files slow down outreach. Exported datasets often contain inconsistent column names, invalid emails, unformatted phone numbers, duplicate leads, broken LinkedIn URLs, unwanted fields, and incomplete records.
LeadSanity solves this by turning raw lead data into clean, structured, and usable output files that can be imported into CRMs or outreach tools such as HubSpot, Salesforce, or sales engagement platforms.
---
Key Features
Upload CSV, XLS, or XLSX lead files
Auto-detect and map lead fields
Clean and standardize email addresses
Format and split phone numbers
Normalize LinkedIn profile URLs
Normalize website URLs
Remove duplicate records
Identify invalid or incomplete records
Review quarantined records manually
Export cleaned data as CSV or Excel
Secure OTP-based authentication
Google OAuth login support
Responsive SaaS-style landing page and dashboard
---
Product Preview
The landing page follows a clean SaaS design with:
A strong hero section using a purple-to-blue gradient
Clear headline: Clean messy B2B lead lists in minutes
Primary CTA for uploading lead files
Secondary actions for trying sample data and downloading sample output
Trust metrics such as mapped fields, CRM accuracy, and faster-than-Excel processing
A modern profile pill with avatar, user name, and dropdown indicator
Dashboard preview showing raw input converted into sanitized CRM-ready data
---
Tech Stack
Frontend
React
Vite
JavaScript
Tailwind CSS
Lenis Smooth Scroll
Google Fonts
Backend
FastAPI
Python 3.10+
Uvicorn
Pandas
OpenPyXL
Database
SQLite for local development
Supabase PostgreSQL for production
Authentication and Email
Passwordless OTP login
Google OAuth
Gmail SMTP
Brevo HTTP API fallback
Resend HTTP API fallback
Deployment
Vercel monorepo deployment
Vite static frontend build
FastAPI backend using Vercel Python serverless runtime
---
Project Structure
```text
zoominfo-lead-cleaner/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   ├── tmp/
│   ├── requirements.txt
│   ├── vercel.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── .env
│
├── vercel.json
└── README.md
```
---
Getting Started
Prerequisites
Make sure you have the following installed:
Python 3.10 or above
Node.js 18 or above
npm 9 or above
Git
---
Backend Setup
Navigate to the backend folder:
```bash
cd backend
```
Create a virtual environment:
```bash
python -m venv venv
```
Activate the virtual environment:
```bash
# Windows PowerShell
venv\Scripts\activate.ps1

# macOS / Linux
source venv/bin/activate
```
Install backend dependencies:
```bash
pip install -r requirements.txt
```
Create a `.env` file inside the `backend` folder:
```env
UPLOAD_DIR=./tmp/uploads
OUTPUT_DIR=./tmp/outputs
MAX_FILE_SIZE_MB=50
TEMP_FILE_EXPIRY_MINUTES=60
ALLOWED_ORIGINS=http://localhost:5173,https://leadsanity.vercel.app

DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=your-supabase-jwt-secret-here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_NAME=LeadSanity Team

BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER=LeadSanity <your-verified-email>

RESEND_API_KEY=your-resend-api-key
RESEND_FROM=LeadSanity <onboarding@resend.dev>
```
Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend will run at:
```text
http://localhost:8000
```
---
Frontend Setup
Navigate to the frontend folder:
```bash
cd frontend
```
Install frontend dependencies:
```bash
npm install
```
Create a `.env` file inside the `frontend` folder:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
Start the frontend development server:
```bash
npm run dev
```
Frontend will run at:
```text
http://localhost:5173
```
---
How It Works
1. Upload Lead File
Upload a CSV or Excel file exported from ZoomInfo, Apollo.io, LinkedIn Sales Navigator, or other data sources.
2. Auto-Map Fields
LeadSanity detects common lead fields such as name, email, phone number, company, LinkedIn URL, job title, and website.
3. Configure Cleaning Rules
Choose the cleaning options you want to apply, including email validation, phone formatting, LinkedIn cleanup, website normalization, and deduplication.
4. Review Data Quality
View clean records, invalid records, duplicates, and records that need manual review.
5. Export Clean Data
Download the final clean lead file in CSV or Excel format.
---
Core Cleaning Capabilities
Email Cleaning
Removes extra spaces
Converts email addresses to lowercase
Validates basic email format
Flags malformed email addresses
Phone Cleaning
Removes special characters
Handles extensions
Separates country code and local number where possible
Creates cleaner phone output for CRM imports
LinkedIn URL Cleaning
Removes tracking parameters
Removes trailing slashes
Standardizes profile URLs
Website Cleaning
Removes duplicate protocol values
Removes unnecessary prefixes
Adds secure `https://` format where required
Standardizes domain output
Deduplication
Detects repeated leads
Removes exact duplicate rows
Separates duplicate records for review
---
Authentication Flow
LeadSanity supports two authentication methods:
OTP Login
User enters email address
Backend generates a 6-digit OTP
OTP is sent through Gmail SMTP, Brevo, or Resend
User enters OTP
Backend validates the OTP and starts a secure session
Google OAuth
User selects Google login
Google verifies the user account
Backend checks whether the account exists
User is redirected to the dashboard after successful authentication
---
Deployment Notes
LeadSanity is designed for deployment on Vercel using a monorepo structure.
The root `vercel.json` should route:
Frontend requests to the Vite static build
API requests under `/api/*` to the FastAPI backend
Recommended production URL structure:
```text
Frontend: https://leadsanity.vercel.app
Backend:  https://leadsanity.vercel.app/api
```
---
Environment Variables Checklist
Backend
`DATABASE_URL`
`JWT_SECRET`
`UPLOAD_DIR`
`OUTPUT_DIR`
`MAX_FILE_SIZE_MB`
`TEMP_FILE_EXPIRY_MINUTES`
`ALLOWED_ORIGINS`
`SMTP_HOST`
`SMTP_PORT`
`SMTP_USER`
`SMTP_PASSWORD`
`SMTP_FROM_NAME`
`BREVO_API_KEY`
`BREVO_SENDER`
`RESEND_API_KEY`
`RESEND_FROM`
Frontend
`VITE_API_BASE_URL`
`VITE_SUPABASE_URL`
`VITE_SUPABASE_ANON_KEY`
---
UI Improvement Added
The original standalone square profile icon was replaced with a cleaner profile pill design:
```text
[ E ] Elango ˅
```
This makes the profile section feel intentional, improves navbar balance, and gives users a clear indication that account options are available through a dropdown.
Recommended dropdown options:
Profile
Settings
Dashboard
Logout
---
Roadmap
Advanced fuzzy duplicate detection
Bulk email domain validation
CRM export presets
Saved cleaning templates
Team-based usage tracking
Activity logs
More sample files for demo usage
Data quality scoring by source
AI-based column mapping suggestions
---
License
This project is intended for internal business use. Add your preferred license before making the repository public.
---
Author
Built by Elango V as a lead data hygiene automation solution for sales and marketing operations.
