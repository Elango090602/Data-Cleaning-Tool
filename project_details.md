# LeadSanity — Comprehensive Project Documentation & User Guide

LeadSanity is an enterprise-grade, monorepo GTM (Go-To-Market) lead data hygiene and formatting platform. It is engineered to clean, normalize, and restructure messy CSV or Excel exports from major B2B data providers (such as ZoomInfo, Apollo.io, and LinkedIn Sales Navigator) before they are imported into CRMs like HubSpot, Salesforce, or outreach platforms.

---

## 💻 Technical Stack

LeadSanity is built using a modern, lightweight, and highly performant full-stack architecture:

### 1. Frontend
*   **Core Library**: React (Vite-fast tooling)
*   **Language**: JavaScript (ES6+)
*   **Styling System**: Tailwind CSS v3 with custom brand parameters (harmonious dark/light slate tones)
*   **Typography**: Google Fonts Integration (`Poppins` for body text, `Google Sans Flex` & `Google Sans Code` for code blocks)
*   **Smooth Scrolling**: Lenis Smooth Scroll library for physics-based kinetic scrolling

### 2. Backend
*   **Core Framework**: FastAPI (Asynchronous Python 3.10+ web framework)
*   **WSGI/ASGI Server**: Uvicorn
*   **File Parser**: Pandas & OpenPyXL (high-capacity dataframe processing)
*   **Security & Encryption**: Base64url, HMAC-SHA256, and `passlib` with `bcrypt` salting

### 3. Database
*   **Local Development**: SQLite (file-based relational storage)
*   **Production Database**: Supabase PostgreSQL (managed cloud database with SSL security pooling)

### 4. Integrations & Relays
*   **Direct SMTP Mailer**: Dynamic `smtplib` connection routing (supporting SSL on port `465` and TLS on port `587` with standard Google App Passwords)
*   **Email HTTP APIs**: Resend Mail API & Brevo Mail API (dynamic OTP code relays with rate-limiting)
*   **Supabase JS Library**: Seamless backend database session validation

### 5. Hosting & Deployment
*   **Cloud Platform**: Vercel (monorepo deployment using `@vercel/static-build` and `@vercel/python` serverless engines)

---

## 🌟 Key Features

1.  **Dynamic Passwordless OTP Login**: Asynchronous 6-digit verification code dispatch with sandbox code print fallbacks in local environments.
2.  **Flow-Guarded Google OAuth**: Flow-based OAuth (`signup` vs `signin`) that prevents database overlaps and alerts users if accounts do not exist.
3.  **Vibrant Cohesive Profile Card Design**: Dashboard sidebar user cards featuring bold, centered rounded-square letter badges in brand-blue (`from-[#3b82f6] to-[#1d4ed8]`), capitalized display names, all-caps monospace job roles, and inline logout door triggers.
4.  **Landing Page Pill Dropdown**: Elegant navigation pill dropdown (`rounded-full bg-slate-50/50`) displaying a circular avatar, capitalized first name, and a downward chevron indicating modal settings clickability.
5.  **Schema Auto-Mapping**: Multi-format column detection that reads incoming headers and recommends target CRM groupings (Emails, Phones, LinkedIn URLs, Company Names, Websites).
6.  **Multi-Dimensional Sanitization Engine**:
    *   **Email syntax check**: Purges spaces, normalizes cases, and filters malformed domains.
    *   **Phone splitting**: Purges extensions, isolates ITU international country calling codes, and extracts clean local digits.
    *   **LinkedIn Sanitizer**: Wipes tracking arguments and trailing slashes to yield short clean profile URLs.
    *   **Website Normalizer**: Wipes `http/https/www` prefixes and structures consistent `https://` secure links.
    *   **Deduplication & Blank Removal**: Isolates and flags exact duplicates into separate downloads.
7.  **Interactive Quarantine Inspector**: Renders quarantined (invalid) or "Needs Review" records in a custom grid, allowing operators to manually edit, re-validate, and promote leads to clean sheets in real-time.
8.  **Session Hardening**: Hash-based routing (`#app`) with a 12-hour session Time-To-Live (TTL) that retains user sessions during page refreshes and home logo clicks.
9.  **Platform Path Sanitizer**: Utility that dynamically rewrites relative `./tmp/` storage paths in `.env` configurations to `/tmp/` space on Unix servers to bypass Vercel's read-only file system blocks.

---

## 📂 Project Structure

```
zoominfo-lead-cleaner/
├── backend/                        # FastAPI Application
│   ├── app/
│   │   ├── models/                 # Pydantic request/response validation schemas
│   │   │   ├── request_models.py   # Auth, cleaning, and promotion payloads
│   │   │   └── response_models.py  # Return metrics and download identifiers
│   │   ├── routes/                 # FastAPI Router Modules
│   │   │   ├── auth.py             # OTP dispatches, JWT signups, password resets, Google OAuth
│   │   │   ├── clean.py            # Clean engines, quarantine promoters
│   │   │   ├── download.py         # Dynamic CSV/XLSX export downloads & session cleaners
│   │   │   └── upload.py           # Temporary multipart file savers & auto-mapping recommenders
│   │   ├── services/               # Core Core Business Logic Services
│   │   │   ├── cleaning_service.py # Cleaning pipeline validators, duplicates checkers
│   │   │   ├── export_service.py   # Pandas to CSV & XLSX layout generators
│   │   │   ├── file_service.py     # File encoding/delimiter detectors (resilient reading)
│   │   │   └── mapping_service.py  # Regex auto-mapping recommenders
│   │   ├── utils/                  # DB, security, and cleaning helper scripts
│   │   │   ├── auth_deps.py        # Current authenticated user dependency
│   │   │   ├── db.py               # Table creation migrations, SQLite/PostgreSQL connectors
│   │   │   ├── hash.py             # Password hashing & verification helper
│   │   │   ├── jwt.py              # JWT generator & Supabase signature verifier
│   │   │   ├── phone_cleaners.py   # ITU phone isolating regex, punctuation purger
│   │   │   ├── text_cleaners.py    # Name formatting & casing helpers
│   │   │   ├── validators.py       # Pydantic custom validators
│   │   │   └── website_cleaners.py # Domain normalizer, http/https sanitizers
│   │   └── main.py                 # FastAPI ASGI Server entry point
│   ├── tmp/                        # Local database & temp upload directory (git-ignored)
│   ├── requirements.txt            # Python backend dependencies
│   ├── vercel.json                 # Vercel backend standalone runtime configuration
│   └── .env                        # Local backend environment variables (git-ignored)
├── frontend/                       # React Application
│   ├── public/                     # Static icons, favicon, clean sample lead files
│   ├── src/
│   │   ├── assets/                 # Brand illustrations & SVG assets
│   │   ├── components/             # Reusable Dashboard Component Blocks
│   │   │   ├── CleaningOptions.jsx # Pipeline preference checkbox grid
│   │   │   ├── CleaningSummary.jsx # Quality scorecard, tabs controllers
│   │   │   ├── DataPreview.jsx     # High-density dataset preview tables
│   │   │   ├── DownloadButtons.jsx # Output CSV/XLSX files download triggers
│   │   │   ├── FieldMapping.jsx    # Column schema mapping and alignment panel
│   │   │   ├── FileUpload.jsx      # Drag-and-drop landing file import cards
│   │   │   ├── QuarantineInspector.jsx # Manual edit grids & promoter inputs
│   │   │   ├── Stepper.jsx         # Pipeline progress wizard stepper
│   │   │   └── UserProfileModal.jsx # Profile edit, default preference presets forms
│   │   ├── pages/                  # Main Page Layouts
│   │   │   ├── App.jsx             # Main Dashboard workspace & navigation sidebar
│   │   │   └── LandingPage.jsx     # Marketing home, OAuth modals, signup forms
│   │   ├── services/               # API integration client
│   │   │   ├── api.js              # Fetch client handlers for all FastAPI endpoints
│   │   │   └── supabaseClient.js   # Supabase JS client initializer
│   │   ├── index.css               # Global CSS styles, kinetic Lenis scrolling rules
│   │   └── main.jsx                # React app renderer, hash routers, smooth scroll controls
│   ├── package.json                # npm scripts, frontend dependencies
│   ├── tailwind.config.js          # Tailwind styling configs
│   ├── vercel.json                 # Vercel frontend standalone runtime configuration
│   └── .env                        # Local frontend environment variables (git-ignored)
├── vercel.json                     # Monorepo Vercel orchestration configuration
└── project_details.md              # Detailed platform documentation (This File)
```

---

## 🔧 Setup & Installation Guide

### Prerequisites
Ensure your local system matches:
*   **Python**: Version `3.10` or higher
*   **Node.js**: Version `18` or higher
*   **NPM**: Version `9` or higher
*   **Git**: Command-line client

---

### 1. Database Configuration (Supabase PostgreSQL)
LeadSanity uses SQLite locally by default, but it is highly recommended to configure Supabase for persistent multi-user database storage:
1.  Sign up for a free account at [Supabase](https://supabase.com/).
2.  Create a new project named `zoominfo-lead-cleaner`.
3.  Go to **Project Settings > Database > Connection String > URI**.
4.  Copy the connection string (ensure to replace `[YOUR-PASSWORD]` with your database password):
    ```env
    DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require
    ```

---

### 2. Backend Setup
1.  Open your terminal and navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows (PowerShell)**: `venv\Scripts\activate.ps1`
    *   **macOS / Linux**: `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Create a `.env` file in the `backend` folder and populate it:
    ```env
    UPLOAD_DIR=./tmp/uploads
    OUTPUT_DIR=./tmp/outputs
    MAX_FILE_SIZE_MB=50
    TEMP_FILE_EXPIRY_MINUTES=60
    ALLOWED_ORIGINS=http://localhost:5173,https://leadsanity.vercel.app
    
    # Supabase Connection URL
    DATABASE_URL=postgresql://postgres.[id]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require
    
    # JWT Encryption (Use the Supabase JWT Secret to allow Supabase JS integration)
    JWT_SECRET=your-supabase-jwt-secret-here
    
    # secure SMTP configurations
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    SMTP_USER=your-smtp-email@gmail.com
    SMTP_PASSWORD=your-gmail-app-password-no-spaces
    SMTP_FROM_NAME=LeadSanity Team
    ```

---

### 3. Frontend Setup
1.  Navigate to the frontend folder:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `frontend` folder and populate it:
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    
    # Optional Supabase Integration (Only needed if utilizing Supabase OAuth directly)
    VITE_SUPABASE_URL=https://[your-project-id].supabase.co
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
    ```

---

### 4. Running the App Locally
For development simplicity, you can run both projects concurrently from the frontend directory:
1.  Navigate to the frontend folder:
    ```bash
    cd frontend
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:5173](http://localhost:5173) in your browser. The backend API is automatically launched concurrently at [http://localhost:8000](http://localhost:8000).

---

## 🚀 Running Domains & Deployment Checklist

### Production Domain Configuration
*   **Active Live App URL**: [https://leadsanity.vercel.app](https://leadsanity.vercel.app)
*   **Backend Base API Route**: [https://leadsanity.vercel.app/api](https://leadsanity.vercel.app/api)

### Vercel Deployment Orchestration
The project is set up as a monorepo under Vercel, coordinated by the root [vercel.json](file:///d:/Projects/Deepan-%20Data%20Cleaning%20pipeline/zoominfo-lead-cleaner/vercel.json) configuration:
*   **Vite Static Build**: Compiles static distribution files in `/frontend` using `@vercel/static-build`.
*   **Python Serverless Runtime**: Compiles the FastAPI app entry point `backend/app/main.py` using `@vercel/python`.
*   **Edge Routing**: Automatically routes all `/api/(.*)` requests directly to the FastAPI serverless node while handling all root static assets `/` through the Vite client.

---

## 📖 Complete User Manual

### Step 1: Secure Authentication
1.  Open [https://leadsanity.vercel.app](https://leadsanity.vercel.app).
2.  **Passwordless Login**: Enter your corporate email and click **Send Code**. Open your email, copy the secure 6-digit OTP, and submit it to log in.
3.  **Google OAuth Login**: Click **Log in with Google**. Authenticate through the secure Google popup to gain immediate workspace access.
4.  **Persistent Workspace Sessions**: When logged in, your secure session is retained for **12 hours**. Clicking the LeadSanity logo at the top left refreshes the page and takes you to home without logging you out.

---

### Step 2: Uploading Messy Lead Sheets
1.  Upon authentication, the progress stepper guides you to **Step 1: Import Data**.
2.  Click the drag-and-drop zone and select a CSV, XLS, or XLSX file from ZoomInfo, Apollo, or scrapers.
3.  The system parses the file in under **100ms** and automatically routes you to the schema mapping layout.

---

### Step 3: Aligning Data Columns
1.  In **Step 2: Schema Alignment**, the left panel displays a checklist of your detected input headers.
2.  The engine automatically recommends target fields (e.g. matching `first_name` to `First Name`, `email_address` to `Email`, etc.).
3.  You can manually adjust mappings or untoggle columns you do not want included in the export. Click **Next** to proceed.

---

### Step 4: Configuring Sanitization Rules
1.  In **Step 3: Engine Settings**, specify which cleaning pipelines to execute:
    *   *Verify Email Syntax & Domains*: Auto-corrects lowercase, purges whitespace, and strips bad formatting.
    *   *Prune/Format Phone Numbers*: Isolates plus indicators, strips country codes (e.g. +91, +1) into separate columns, and purges punctuation.
    *   *Sanitize LinkedIn Profile URLs*: Strips trailing slashes, clean paths, and strips trackers (`?ref=...`).
    *   *Normalize Web URLs*: Cleans domains and prefixes with standard secure `https://` protocols.
    *   *Deduplication*: Strips exact identical rows.
2.  The right panel shows a real-time preview simulation of how your dataset changes as you toggle rules on and off! Click **Process List** to run the engine.

---

### Step 5: High-Density Scorecard & Quarantine Inspector
1.  In **Step 4: Data Quality**, review your dataset scorecard (Clean Leads, Needs Review, Quarantined leads, and Duplicates).
2.  **Quarantine Inspector**: Click the **Quarantined** or **Needs Review** tabs to inspect malformed records in-place.
3.  **Manual Lead Promotion**: Correct malformed emails or phone numbers directly in the input grids. Click **Verify and Promote** to run the records through validation. If clean, they are promoted into the valid clean sheets instantly!

---

### Step 6: File Download & Export
1.  In **Step 5: Export Assets**, click **Download Clean Leads** or **Download Summary Report**.
2.  Choose your export format (CSV or Excel) in your **User Profile Settings** (accessible by clicking your username at the bottom left).
3.  Click **Reset System** to wipe temporary server memory and start fresh!
