# LeadSanity (Data Cleaning Tool)

LeadSanity is an enterprise-grade GTM lead data hygiene and formatting platform. It automates the process of cleaning, formatting, and structuring messy CSV/Excel exports from data providers like ZoomInfo, Apollo.io, and LinkedIn Sales Navigator before they are imported into your CRM (HubSpot, Salesforce, etc.).

---

## 🚀 Key Features

*   **Secure Passwordless Authentication**: Dynamic OTP-based login (6-digit code sent via Resend HTTP API).
*   **Google OAuth Integration**: Flow-based ("signup" and "signin") authentication that guards against account overwrite and missing accounts.
*   **Intelligent Field Mapping**: Automated detection and grouping of lead sheets (Emails, Names, Phone Numbers, Companies, Job Titles).
*   **Advanced Deduplication**: Flags and separates clean entries from duplicates/errors into distinct CSV outputs.
*   **FastAPI Backend with Background Tasks**: OTP generation, db writes, and mail dispatches are processed asynchronously under 50ms.
*   **Modern React UI**: Sleek, fully responsive dashboard built with Canva-style aesthetics and micro-animations.

---

## 🛠️ Project Structure

```
zoominfo-lead-cleaner/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── routes/           # Router endpoints (auth, cleaning)
│   │   ├── utils/            # DB models, file processors, schemas
│   │   └── main.py           # Application entry point
│   ├── tmp/                  # SQLite storage, uploads & outputs directory (git ignored)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Template environment config
├── frontend/                 # React Application (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page layouts (LandingPage, Dashboard)
│   │   └── services/         # API integration layer
│   ├── package.json          # Node script & dependency declarations
│   └── tailwind.config.js    # Tailwind layout settings
└── README.md                 # Main Documentation
```

---

## ⚡ Setup & Installation

### Prerequisite Checklist
*   Python 3.10+
*   Node.js 18+
*   NPM 9+

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Copy `.env.example` to `.env` and fill in Resend and Google OAuth parameters.

### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure frontend environment variables in `.env` (like `VITE_API_URL` and `VITE_GOOGLE_REDIRECT_URI`).

### 3. Database Migration (Optional - Supabase / PostgreSQL)
By default, LeadSanity uses a local SQLite database file. To run with a persistent cloud database (e.g. Render backend with Supabase PostgreSQL storage):
1. Create a free project on [Supabase](https://supabase.com/).
2. Retrieve your PostgreSQL connection string from the database settings page.
3. Update the `DATABASE_URL` parameter in your `backend/.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. The database schemas will initialize automatically on application startup.

---

## 🚀 Running the Application

For convenience, you can launch both the frontend and backend concurrently from the frontend directory:

```bash
cd frontend
npm run dev
```

*   **Frontend**: Runs on [http://localhost:5173](http://localhost:5173)
*   **Backend**: Runs on [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 🔒 Security & Sandbox Configurations
During development, if Resend API configurations or OAuth keys are omitted from your `.env`, LeadSanity runs in **Sandbox Fallback Mode**:
*   The generated 6-digit OTP codes are logged directly to the backend terminal window.
*   Google Login will use a simulated modal selector allowing custom name/email input for offline testing of sign-in and sign-up state flows.

---

## 📄 License
This project is licensed under the MIT License.
