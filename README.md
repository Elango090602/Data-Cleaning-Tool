# LeadSanity

## Clean Messy B2B Lead Lists in Minutes

LeadSanity is a modern B2B lead data cleaning and formatting platform built to help sales and marketing teams clean messy CSV or Excel files before importing them into CRMs or outreach tools.

It is designed for lead exports from platforms like **ZoomInfo**, **Apollo.io**, **LinkedIn Sales Navigator**, and web scraping sources. The application automatically removes unwanted fields, fixes formatting issues, validates key data, removes duplicates, and produces clean files ready for sales outreach.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How the Application Works](#how-the-application-works)
- [Authentication Flow](#authentication-flow)
- [Data Cleaning Capabilities](#data-cleaning-capabilities)
- [Local Setup Guide](#local-setup-guide)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Project Overview

LeadSanity helps teams convert messy lead data into clean, CRM-ready files.

Marketing teams often download lead lists from multiple platforms. These files usually contain inconsistent column names, invalid emails, messy phone numbers, duplicate records, unwanted fields, and poorly formatted LinkedIn or website URLs.

LeadSanity solves this by providing a simple workflow:

```text
Upload File → Auto Map Fields → Clean Data → Review Issues → Download Clean Output
```

The goal is to reduce manual Excel cleaning work and help sales teams receive accurate, structured, and usable lead data faster.

---

## Problem Statement

Sales and marketing teams spend a lot of time manually cleaning lead data before using it for outreach or CRM import.

Common issues include:

- Unwanted columns from ZoomInfo, Apollo, or LinkedIn exports
- Duplicate leads
- Invalid or badly formatted email addresses
- Phone numbers with spaces, extensions, symbols, or country code issues
- Messy LinkedIn profile URLs
- Website URLs with inconsistent formats
- Blank rows and incomplete records
- Manual Excel formatting errors

This manual process wastes time, delays outreach, and increases the chance of poor-quality CRM data.

---

## Solution

LeadSanity automates the lead data hygiene process.

The application allows users to upload a CSV or Excel file, automatically detects important columns, applies cleaning rules, validates records, separates problematic data, and generates a clean downloadable output.

The cleaned file can be used for:

- CRM import
- Sales outreach
- Email campaigns
- Lead enrichment workflows
- Internal sales team handoff

---

## Key Features

### File Upload

Users can upload lead data files in supported formats such as:

- CSV
- XLS
- XLSX

The application reads the file and prepares it for schema mapping and cleaning.

---

### Auto Field Mapping

LeadSanity automatically detects and maps common lead fields such as:

- First Name
- Last Name
- Email
- Phone Number
- Company Name
- Job Title
- LinkedIn URL
- Website URL

Users can also manually adjust mappings before cleaning.

---

### Email Cleaning

The system validates and cleans email addresses by:

- Removing extra spaces
- Converting emails to lowercase
- Checking email format
- Filtering malformed email addresses
- Flagging invalid email records for review

---

### Phone Number Cleaning

Phone numbers are cleaned by:

- Removing unnecessary symbols
- Removing extensions
- Separating country codes where applicable
- Standardizing number format
- Flagging incomplete or invalid numbers

---

### LinkedIn URL Sanitization

LinkedIn profile URLs are cleaned by:

- Removing tracking parameters
- Removing trailing slashes
- Standardizing profile links
- Keeping only useful LinkedIn profile paths

---

### Website URL Normalization

Website URLs are normalized by:

- Removing unnecessary prefixes
- Standardizing domain structure
- Adding secure `https://` formatting where required
- Removing inconsistent URL formats

---

### Duplicate Removal

LeadSanity identifies and removes duplicate records using selected key fields such as:

- Email
- Phone Number
- LinkedIn URL
- Company Name

Duplicate records can be separated into a different output for review.

---

### Quarantine Review

Invalid or incomplete records are moved into a review section.

Users can inspect, edit, validate, and promote corrected records back into the clean dataset.

---

### Download Clean Output

After cleaning, users can download:

- Clean lead file
- Duplicate records
- Quarantined or invalid records
- Summary report

Supported export formats include:

- CSV
- Excel

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Lenis Smooth Scroll

### Backend

- FastAPI
- Python
- Uvicorn
- Pandas
- OpenPyXL

### Database

- SQLite for local development
- Supabase PostgreSQL for production

### Authentication and Email

- Passwordless OTP login
- Google OAuth
- SMTP email dispatch
- Resend API fallback
- Brevo API fallback

### Deployment

- Vercel
- Vercel Python serverless functions
- Vercel static frontend hosting

---

## Project Structure

```text
zoominfo-lead-cleaner/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── request_models.py
│   │   │   └── response_models.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── clean.py
│   │   │   ├── download.py
│   │   │   └── upload.py
│   │   ├── services/
│   │   │   ├── cleaning_service.py
│   │   │   ├── export_service.py
│   │   │   ├── file_service.py
│   │   │   └── mapping_service.py
│   │   ├── utils/
│   │   │   ├── auth_deps.py
│   │   │   ├── db.py
│   │   │   ├── hash.py
│   │   │   ├── jwt.py
│   │   │   ├── phone_cleaners.py
│   │   │   ├── text_cleaners.py
│   │   │   ├── validators.py
│   │   │   └── website_cleaners.py
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
│   │   │   ├── CleaningOptions.jsx
│   │   │   ├── CleaningSummary.jsx
│   │   │   ├── DataPreview.jsx
│   │   │   ├── DownloadButtons.jsx
│   │   │   ├── FieldMapping.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── QuarantineInspector.jsx
│   │   │   ├── Stepper.jsx
│   │   │   └── UserProfileModal.jsx
│   │   ├── pages/
│   │   │   ├── App.jsx
│   │   │   └── LandingPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabaseClient.js
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

## How the Application Works

### Step 1: User Authentication

The user signs in using either:

- Email OTP login
- Google OAuth login

After successful authentication, the user enters the LeadSanity dashboard.

---

### Step 2: Upload Lead File

The user uploads a CSV or Excel file containing raw lead data.

The backend reads the file using Pandas and prepares the records for preview and field mapping.

---

### Step 3: Auto Mapping

The app detects columns and recommends matching fields.

Example:

```text
email_address → Email
mobile_phone → Phone Number
linkedin_profile → LinkedIn URL
company_name → Company Name
```

The user can confirm or manually change mappings.

---

### Step 4: Select Cleaning Rules

Users can choose which cleaning actions to apply, such as:

- Email validation
- Phone formatting
- LinkedIn URL cleaning
- Website URL normalization
- Duplicate removal
- Blank row removal

---

### Step 5: Process Data

The backend runs the cleaning pipeline and separates records into:

- Clean records
- Duplicate records
- Invalid records
- Needs-review records

---

### Step 6: Review and Promote Records

Users can review quarantined records, fix incorrect values, revalidate them, and move corrected records into the clean output.

---

### Step 7: Download Output

The user downloads the final cleaned lead file in CSV or Excel format.

---

## Authentication Flow

LeadSanity supports secure login using OTP and Google OAuth.

### OTP Login Flow

```text
User enters email
↓
Backend generates OTP
↓
OTP is sent through SMTP, Resend, or Brevo
↓
User enters OTP
↓
Backend verifies OTP
↓
Session token is created
↓
User enters dashboard
```

---

### Google OAuth Flow

```text
User clicks Google Login
↓
Google authentication popup opens
↓
Google verifies user identity
↓
Application validates account flow
↓
User enters dashboard
```

---

## Data Cleaning Capabilities

### Email Cleaning Rules

- Trim spaces
- Convert to lowercase
- Validate email pattern
- Remove invalid emails
- Flag suspicious emails

---

### Phone Cleaning Rules

- Remove symbols
- Remove spaces
- Remove extensions
- Extract country code
- Standardize phone number format

---

### LinkedIn Cleaning Rules

- Remove tracking parameters
- Remove extra slashes
- Normalize profile URL
- Keep only clean LinkedIn links

---

### Website Cleaning Rules

- Remove duplicate prefixes
- Normalize domain
- Add secure protocol
- Clean inconsistent website formats

---

### Duplicate Detection Rules

Duplicates can be identified using:

- Email
- Phone number
- LinkedIn URL
- Company name
- Combination of multiple fields

---

## Local Setup Guide

### Prerequisites

Before running the project locally, install:

- Python 3.10 or above
- Node.js 18 or above
- npm 9 or above
- Git

---

## Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

For Windows PowerShell:

```bash
venv\Scripts\activate.ps1
```

For macOS or Linux:

```bash
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI backend:

```bash
uvicorn app.main:app --reload
```

Backend will run at:

```text
http://localhost:8000
```

---

## Frontend Setup

Navigate to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Frontend will run at:

```text
http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

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

RESEND_API_KEY=your-resend-api-key
BREVO_API_KEY=your-brevo-api-key
```

---

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8000

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Deployment

LeadSanity can be deployed on Vercel as a monorepo project.

### Deployment Flow

```text
Frontend React App → Vercel Static Build
Backend FastAPI App → Vercel Python Serverless Runtime
API Routes → /api/*
```

---

### Production URLs

```text
Frontend:
https://leadsanity.vercel.app

Backend API:
https://leadsanity.vercel.app/api
```

---

### Vercel Environment Variables

Add the following variables in Vercel Project Settings:

```env
DATABASE_URL=
JWT_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=

RESEND_API_KEY=
BREVO_API_KEY=

VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Future Improvements

The following improvements can be added in future versions:

- CRM direct export to HubSpot or Salesforce
- Lead scoring system
- AI-based duplicate detection
- Bulk file cleaning
- Custom cleaning templates
- Team activity logs
- Role-based access control
- Advanced data quality reports
- Scheduled automated cleaning
- API access for external systems

---

## Suggested GitHub Description

```text
LeadSanity is a B2B lead data cleaning platform that helps sales and marketing teams clean messy CSV and Excel exports from ZoomInfo, Apollo, LinkedIn Sales Navigator, and scraping sources.
```

---

## Suggested GitHub Topics

```text
lead-cleaning
data-cleaning
csv-cleaner
excel-cleaner
sales-automation
b2b-leads
fastapi
react
vite
tailwindcss
supabase
vercel
```

---

## License

This project is intended for internal business use and can be customized based on organizational requirements.

---

## Author

Developed by **Elango V**.
