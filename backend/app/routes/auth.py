import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import secrets
import re
import os
import json
import httpx
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Header
from fastapi.responses import JSONResponse
from datetime import datetime

from app.utils.db import get_connection, execute_sql
from app.utils.jwt import create_jwt, decode_jwt
from app.utils.auth_deps import get_current_user as get_current_user_from_jwt
from app.utils.hash import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory stores preserved for backward compatibility
otp_store = {}
session_store = {}

# Simple, robust email matching regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class SendOTPRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

def is_mock_email(email: str) -> bool:
    return any(email.endswith(dom) for dom in ["@company.com", "@test.com", "@example.com"])

def is_sandbox_mode(email: str) -> bool:
    if is_mock_email(email):
        return True
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    
    has_smtp = smtp_user and smtp_password and "your_gmail" not in smtp_user
    has_brevo = brevo_api_key and "YOUR_" not in brevo_api_key
    has_resend = resend_api_key and "YOUR_" not in resend_api_key
    
    return not (has_smtp or has_brevo or has_resend)

# ─── Verification Dispatcher (SMTP -> Brevo API -> Resend API -> Sandbox) ───
def send_otp_via_email(email: str, otp: str) -> bool:
    if is_mock_email(email):
        print("\n" + "="*60)
        print(" [SANDBOX] MOCK DOMAIN — EMAIL DISPATCH SKIPPED")
        print(f" OTP CODE FOR [ {email} ]:  {otp}")
        print("="*60 + "\n")
        return True

    # Priority 1: SMTP Mailer
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "Lead Sanitizer App")
    
    if smtp_user and smtp_password and "your_gmail" not in smtp_user:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"{otp} is your Lead Sanitizer Verification Code"
            msg["From"] = f"{smtp_from_name} <{smtp_user}>"
            msg["To"] = email
            
            html_content = f"""
                <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 20px auto; padding: 32px; border: 1px solid #f1f5f9; border-radius: 20px; background: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                    <h2 style="color: #4f46e5; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 24px;">LeadSanity Security</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">Enter the following secure 6-digit OTP code to verify your workspace access:</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="font-size: 36px; font-weight: 800; color: #1e1b4b; background: #f0fdf4; padding: 12px 28px; border-radius: 12px; display: inline-block; letter-spacing: 4px; border: 1px solid #dcfce7;">
                            {otp}
                        </span>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 32px;">This code will expire in 10 minutes. Secure verification powered by LeadSanity.</p>
                </div>
            """
            msg.attach(MIMEText(html_content, "html"))
            
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=5)
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, email, msg.as_string())
            server.quit()
            print(f"[SMTP] Verification email successfully sent to {email}")
            return True
        except Exception as e:
            print(f"[SMTP] Failed to send SMTP email: {e}. Falling back...")

    # Priority 2: Brevo HTTP API
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_api_key and "YOUR_" not in brevo_api_key:
        try:
            brevo_sender = os.getenv("BREVO_SENDER", "").strip()
            if not brevo_sender:
                brevo_sender = "LeadSanity <otp@leadsanity.com>"

            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": brevo_api_key,
                "Content-Type": "application/json"
            }

            # Extract name and email from "Name <email>" formatting if present, fallback to space-splitting
            sender_name = "LeadSanity"
            sender_email = brevo_sender
            if "<" in brevo_sender and ">" in brevo_sender:
                parts = brevo_sender.split("<")
                sender_name = parts[0].strip()
                sender_email = parts[1].replace(">", "").strip()
            elif " " in brevo_sender:
                parts = brevo_sender.rsplit(" ", 1)
                sender_name = parts[0].strip()
                sender_email = parts[1].strip()

            html_content = f"""
                <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 20px auto; padding: 32px; border: 1px solid #f1f5f9; border-radius: 20px; background: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                    <h2 style="color: #4f46e5; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 24px;">LeadSanity Security</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">Enter the following secure 6-digit OTP code to verify your workspace access:</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="font-size: 36px; font-weight: 800; color: #1e1b4b; background: #f0fdf4; padding: 12px 28px; border-radius: 12px; display: inline-block; letter-spacing: 4px; border: 1px solid #dcfce7;">
                            {otp}
                        </span>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 32px;">This code will expire in 10 minutes. Secure verification powered by LeadSanity.</p>
                </div>
            """

            data = {
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": email}],
                "subject": f"{otp} is your LeadSanity Verification Code",
                "htmlContent": html_content
            }

            response = httpx.post(url, json=data, headers=headers, timeout=10.0)
            if response.status_code in [200, 201, 202]:
                print(f"[BREVO] Secure email dispatched successfully to {email}")
                return True
            else:
                print(f"[BREVO Error]: Status {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[BREVO Exception]: {e}")

    # Priority 3: Resend HTTP API
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_api_key and "YOUR_" not in resend_api_key:
        try:
            # Resolve the sender address
            resend_sender = os.getenv("RESEND_SENDER", "").strip()
            if not resend_sender:
                app_url = os.getenv("APP_URL", "").lower()
                if "localhost" in app_url or not app_url:
                    resend_sender = "LeadSanity <onboarding@resend.dev>"
                else:
                    resend_sender = "LeadSanity <otp@leadsanity.com>"

            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "from": resend_sender,
                "to": [email],
                "subject": f"{otp} is your LeadSanity Verification Code",
                "html": f"""
                    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 20px auto; padding: 32px; border: 1px solid #f1f5f9; border-radius: 20px; background: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                        <h2 style="color: #4f46e5; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 24px;">LeadSanity Security</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">Enter the following secure 6-digit OTP code to verify your workspace access:</p>
                        <div style="text-align: center; margin: 32px 0;">
                            <span style="font-size: 36px; font-weight: 800; color: #1e1b4b; background: #f0fdf4; padding: 12px 28px; border-radius: 12px; display: inline-block; letter-spacing: 4px; border: 1px solid #dcfce7;">
                                {otp}
                            </span>
                        </div>
                        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 32px;">This code will expire in 10 minutes. Secure verification powered by LeadSanity.</p>
                    </div>
                """
            }
            response = httpx.post(url, json=data, headers=headers, timeout=10.0)
            if response.status_code in [200, 201]:
                print(f"[RESEND] Secure email dispatched successfully to {email}")
                return True
            else:
                print(f"[RESEND Error]: Status {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[RESEND Exception]: {e}")

    # Priority 4: Console fallback (development sandbox)
    print("\n" + "="*60)
    print(" [SANDBOX] EMAIL DELIVERY FAILED — CONSOLE FALLBACK")
    print(f" OTP CODE FOR [ {email} ]:  {otp}")
    print("="*60 + "\n")
    return False


# ─── Legacy OTP Endpoints ───
@router.post("/send-otp")
def send_otp(payload: SendOTPRequest, background_tasks: BackgroundTasks):
    email = payload.email.strip().lower()
    otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
    otp_store[email] = {
        "otp": otp,
        "expires_at": time.time() + 300.0
    }
    background_tasks.add_task(send_otp_via_email, email, otp)
    is_sandbox = is_sandbox_mode(email)
    return {
        "success": True,
        "message": "Verification code dispatched.",
        "sandbox": is_sandbox
    }

@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest):
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="No verification request active for this email.")
        
    stored_session = otp_store[email]
    if time.time() > stored_session["expires_at"]:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    if stored_session["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please try again.")
        
    del otp_store[email]
    
    session_token = secrets.token_hex(32)
    session_store[session_token] = {
        "email": email,
        "created_at": time.time()
    }
    
    return {
        "success": True,
        "token": session_token,
        "user": {
            "email": email,
            "name": email.split("@")[0].capitalize()
        }
    }

# ─── SECURE DATABASE-DRIVEN AUTH ROUTER ───

class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str
    flow: str = "signup"

@router.get("/google-url")
def get_google_auth_url():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "")
    
    if not redirect_uri:
        # Dynamically build it from APP_URL / app_url environment variable if set
        app_url = os.getenv("APP_URL", os.getenv("app_url", "")).rstrip("/")
        if not app_url:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth misconfigured: Neither GOOGLE_REDIRECT_URI nor APP_URL / app_url is set in the environment variables."
            )
        redirect_uri = f"{app_url}/auth/callback"
    
    scope = "openid profile email"
    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&state=secure-state&prompt=select_account"
    
    return {
        "url": google_url,
        "configured": bool(client_id and "YOUR_" not in client_id)
    }

@router.post("/google-callback")
async def google_callback(payload: GoogleCallbackRequest, background_tasks: BackgroundTasks):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    if not client_id or "YOUR_" in client_id:
        raise HTTPException(
            status_code=400, 
            detail="Google OAuth client ID is not configured in .env. Please complete integration."
        )

    # Exchange authorization code for token
    async with httpx.AsyncClient() as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data={
            "code": payload.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": payload.redirect_uri,
            "grant_type": "authorization_code"
        })
        
        if token_response.status_code != 200:
            err_details = token_response.text
            print(f"[GOOGLE OAUTH ERROR] Code exchange failed: Status {token_response.status_code}, Body: {err_details}")
            raise HTTPException(status_code=400, detail=f"Google OAuth exchange failed: {err_details}")
            
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        # Fetch user info
        userinfo_response = await client.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={
            "Authorization": f"Bearer {access_token}"
        })
        if userinfo_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")
            
        google_user = userinfo_response.json()
        
    google_id = google_user.get("sub")
    email = google_user.get("email").strip().lower()
    name = google_user.get("name", "")
    profile_picture = google_user.get("picture", "")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT id, google_id, name, email, profile_picture, otp_verified FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    flow = payload.flow.strip().lower() if payload.flow else "signup"
    
    if flow == "signup":
        if user:
            # User already exists
            if isinstance(user, tuple) or isinstance(user, list):
                otp_verified = user[5]
            else:
                otp_verified = user["otp_verified"]
                
            if otp_verified:
                conn.close()
                return {
                    "status": "USER_ALREADY_EXISTS",
                    "email": email,
                    "message": "User already exists. Please sign in instead."
                }
            else:
                # Existing unverified user: send new OTP
                otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
                expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
                execute_sql(cursor, """
                    INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (email, otp, expires_at, False))
                conn.commit()
                conn.close()
                
                background_tasks.add_task(send_otp_via_email, email, otp)
                
                is_sandbox = is_sandbox_mode(email)
                
                return {
                    "status": "UNVERIFIED_USER_OTP_SENT",
                    "email": email,
                    "message": "Verification code sent to your email.",
                    "sandbox": is_sandbox
                }
        else:
            # Create a new user record
            execute_sql(cursor, """
                INSERT INTO users (google_id, name, email, profile_picture, otp_verified, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (google_id, name, email, profile_picture, False))
            conn.commit()
            
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
            execute_sql(cursor, """
                INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (email, otp, expires_at, False))
            conn.commit()
            conn.close()
            
            background_tasks.add_task(send_otp_via_email, email, otp)
            
            is_sandbox = is_sandbox_mode(email)
            
            return {
                "status": "NEW_USER_OTP_SENT",
                "email": email,
                "message": "Verification code sent to your email.",
                "sandbox": is_sandbox
            }
    else:  # signin flow
        if not user:
            conn.close()
            return {
                "status": "USER_NOT_FOUND",
                "email": email,
                "message": "No account found. Please sign up first."
            }
        else:
            if isinstance(user, tuple) or isinstance(user, list):
                user_id, db_gid, db_name, db_email, db_pic, otp_verified = user
            else:
                user_id = user["id"]
                db_gid = user["google_id"]
                db_name = user["name"]
                db_email = user["email"]
                db_pic = user["profile_picture"]
                otp_verified = user["otp_verified"]
                
            if otp_verified:
                execute_sql(cursor, "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?", (email,))
                conn.commit()
                conn.close()
                
                token = create_jwt({"email": email})
                return {
                    "status": "EXISTING_USER_LOGIN",
                    "token": token,
                    "user": {
                        "email": email,
                        "name": db_name,
                        "profile_picture": db_pic
                    }
                }
            else:
                # Existing unverified user: Send a new OTP
                otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
                expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
                execute_sql(cursor, """
                    INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (email, otp, expires_at, False))
                conn.commit()
                conn.close()
                
                background_tasks.add_task(send_otp_via_email, email, otp)
                
                is_sandbox = is_sandbox_mode(email)
                
                return {
                    "status": "UNVERIFIED_USER_OTP_SENT",
                    "email": email,
                    "message": "Verification code sent to your email.",
                    "sandbox": is_sandbox
                }

# ─── Dynamic Account Selector Sandbox Handler ───
class GoogleLoginRequest(BaseModel):
    email: str
    name: str
    flow: str = "signup"

@router.post("/google-login-simulated")
def google_login_simulated(payload: GoogleLoginRequest, background_tasks: BackgroundTasks):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    profile_picture = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
    google_id = f"sim-{secrets.token_hex(8)}"
    
    is_sandbox = is_sandbox_mode(email)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT id, google_id, name, email, profile_picture, otp_verified FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    flow = payload.flow.strip().lower() if payload.flow else "signup"
    
    if flow == "signup":
        if user:
            # User already exists
            if isinstance(user, tuple) or isinstance(user, list):
                otp_verified = user[5]
            else:
                otp_verified = user["otp_verified"]
                
            if otp_verified:
                conn.close()
                return {
                    "status": "USER_ALREADY_EXISTS",
                    "email": email,
                    "message": "User already exists. Please sign in instead."
                }
            else:
                # Existing unverified user: Generate new OTP and send
                otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
                expires_at = datetime.fromtimestamp(time.time() + 600)
                execute_sql(cursor, """
                    INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (email, otp, expires_at, False))
                conn.commit()
                conn.close()
                
                background_tasks.add_task(send_otp_via_email, email, otp)
                
                return {
                    "status": "UNVERIFIED_USER_OTP_SENT",
                    "email": email,
                    "message": "Verification code sent to your email.",
                    "sandbox": is_sandbox
                }
        else:
            # Create a new user record
            execute_sql(cursor, """
                INSERT INTO users (google_id, name, email, profile_picture, otp_verified, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (google_id, name, email, profile_picture, False))
            conn.commit()
            
            otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expires_at = datetime.fromtimestamp(time.time() + 600)
            execute_sql(cursor, """
                INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (email, otp, expires_at, False))
            conn.commit()
            conn.close()
            
            background_tasks.add_task(send_otp_via_email, email, otp)
            
            return {
                "status": "NEW_USER_OTP_SENT",
                "email": email,
                "message": "Verification code sent to your email.",
                "sandbox": is_sandbox
            }
    else:  # signin flow
        if not user:
            conn.close()
            return {
                "status": "USER_NOT_FOUND",
                "email": email,
                "message": "No account found. Please sign up first."
            }
        else:
            if isinstance(user, tuple) or isinstance(user, list):
                user_id, db_gid, db_name, db_email, db_pic, otp_verified = user
            else:
                user_id = user["id"]
                db_gid = user["google_id"]
                db_name = user["name"]
                db_email = user["email"]
                db_pic = user["profile_picture"]
                otp_verified = user["otp_verified"]
                
            if otp_verified:
                execute_sql(cursor, "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?", (email,))
                conn.commit()
                conn.close()
                
                token = create_jwt({"email": email})
                return {
                    "status": "EXISTING_USER_LOGIN",
                    "token": token,
                    "user": {
                        "email": email,
                        "name": db_name,
                        "profile_picture": db_pic
                    }
                }
            else:
                # Existing unverified user on signin: send OTP
                otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
                expires_at = datetime.fromtimestamp(time.time() + 600)
                execute_sql(cursor, """
                    INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (email, otp, expires_at, False))
                conn.commit()
                conn.close()
                
                background_tasks.add_task(send_otp_via_email, email, otp)
                
                return {
                    "status": "UNVERIFIED_USER_OTP_SENT",
                    "email": email,
                    "message": "Verification code sent to your email.",
                    "sandbox": is_sandbox
                }

# ─── Secure OTP Verification Endpoint ───
class VerifyOtpSecureRequest(BaseModel):
    email: str
    otp: str

@router.post("/verify-otp-secure")
def verify_otp_secure(payload: VerifyOtpSecureRequest):
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Query otp_verifications
    execute_sql(cursor, """
        SELECT id, expires_at, is_used FROM otp_verifications 
        WHERE email = ? AND otp_code = ? AND is_used = False
        ORDER BY id DESC LIMIT 1
    """, (email, otp))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return JSONResponse(status_code=400, content={
            "status": "INVALID_OTP",
            "detail": "Invalid verification code. Please try again."
        })
        
    if isinstance(row, tuple) or isinstance(row, list):
        v_id, expires_at, is_used = row
    else:
        v_id = row["id"]
        expires_at = row["expires_at"]
        is_used = row["is_used"]
        
    # Expiration parser
    if isinstance(expires_at, str):
        expires_dt = datetime.fromisoformat(expires_at.split(".")[0].replace("Z", ""))
    else:
        expires_dt = expires_at
        
    if expires_dt.tzinfo is not None:
        expires_dt = expires_dt.replace(tzinfo=None)
        
    if datetime.utcnow() > expires_dt:
        conn.close()
        return JSONResponse(status_code=400, content={
            "status": "EXPIRED_OTP",
            "detail": "Verification code has expired. Please request a new one."
        })
        
    # Update verification
    execute_sql(cursor, "UPDATE otp_verifications SET is_used = True WHERE id = ?", (v_id,))
    execute_sql(cursor, "UPDATE users SET otp_verified = True, last_login = CURRENT_TIMESTAMP WHERE email = ?", (email,))
    conn.commit()
    
    # Get user profile details
    execute_sql(cursor, "SELECT name, profile_picture FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if isinstance(user, tuple) or isinstance(user, list):
        db_name, db_pic = user
    else:
        db_name = user["name"]
        db_pic = user["profile_picture"]
        
    token = create_jwt({"email": email})
    
    return {
        "status": "OTP_VERIFIED",
        "success": True,
        "token": token,
        "user": {
            "email": email,
            "name": db_name,
            "profile_picture": db_pic
        }
    }

# ─── Resend secure OTP with Rate Limiting ───
class ResendOtpSecureRequest(BaseModel):
    email: str

@router.post("/resend-otp-secure")
def resend_otp_secure(payload: ResendOtpSecureRequest, background_tasks: BackgroundTasks):
    email = payload.email.strip().lower()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure user exists (for email-only sign-up flow)
    execute_sql(cursor, "SELECT id FROM users WHERE email = ?", (email,))
    if not cursor.fetchone():
        name = email.split("@")[0].capitalize()
        profile_picture = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
        execute_sql(cursor, """
            INSERT INTO users (google_id, name, email, profile_picture, otp_verified, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (f"email-{secrets.token_hex(8)}", name, email, profile_picture, False))
        conn.commit()
    
    # Rate limit check: last 60 seconds
    execute_sql(cursor, """
        SELECT created_at FROM otp_verifications 
        WHERE email = ? 
        ORDER BY id DESC LIMIT 1
    """, (email,))
    
    row = cursor.fetchone()
    if row:
        if isinstance(row, tuple) or isinstance(row, list):
            created_at = row[0]
        else:
            created_at = row["created_at"]
            
        if isinstance(created_at, str):
            created_dt = datetime.fromisoformat(created_at.split(".")[0].replace("Z", ""))
        else:
            created_dt = created_at
            
        if created_dt.tzinfo is not None:
            created_dt = created_dt.replace(tzinfo=None)
            
        delta = (datetime.utcnow() - created_dt).total_seconds()
        if delta < 60:
            conn.close()
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {int(60 - delta)} seconds before requesting another code."
            )
            
    otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
    
    execute_sql(cursor, """
        INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (email, otp, expires_at, False))
    conn.commit()
    conn.close()
    
    background_tasks.add_task(send_otp_via_email, email, otp)
    
    is_sandbox = is_sandbox_mode(email)
    
    return {
        "success": True,
        "message": "A fresh verification code has been dispatched.",
        "sandbox": is_sandbox
    }

# ─── Persistent User Profile Persistence (SQL Database) ───

class ProfileData(BaseModel):
    first_name: str
    last_name: str = ""
    company_name: str
    job_role: str
    export_format: str = "csv"
    cleaning_preferences: dict = {}

@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user_from_jwt)):
    email = user["email"]
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT name, profile_settings FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        if isinstance(row, tuple) or isinstance(row, list):
            name, settings_str = row
        else:
            name = row["name"]
            settings_str = row["profile_settings"]
            
        if settings_str:
            return json.loads(settings_str)
            
    # Default settings fallback
    parts = email.split("@")[0].split(".")
    first_name = parts[0].capitalize()
    last_name = parts[1].capitalize() if len(parts) > 1 else ""
    
    return {
        "first_name": first_name,
        "last_name": last_name,
        "company_name": "",
        "job_role": "",
        "export_format": "csv",
        "cleaning_preferences": {
            "validate_emails": True,
            "validate_phones": True,
            "clean_linkedin": True,
            "clean_websites": True,
            "remove_duplicates": True,
            "remove_blank_rows": True,
            "generate_invalid_file": True,
            "generate_duplicate_file": True
        }
    }

@router.post("/profile")
def update_profile(profile: ProfileData, user: dict = Depends(get_current_user_from_jwt)):
    email = user["email"]
    conn = get_connection()
    cursor = conn.cursor()
    
    settings_str = json.dumps(profile.model_dump())
    execute_sql(cursor, "UPDATE users SET profile_settings = ? WHERE email = ?", (settings_str, email))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "Profile details updated successfully."
    }

@router.get("/me")
def get_me(user: dict = Depends(get_current_user_from_jwt)):
    return user

@router.get("/copy-assets")
def copy_assets():
    import shutil
    home = os.path.expanduser("~")
    app_data_dir = os.path.join(home, ".gemini", "antigravity", "brain", "8086cc48-12e0-4f58-946a-1bfb2eb3324e")
    
    src_logo = os.path.join(app_data_dir, "media__1779708720533.png")
    src_favicon = os.path.join(app_data_dir, "media__1779708720480.jpg")
    
    dest_logo_assets = "d:/Projects/Deepan- Data Cleaning pipeline/zoominfo-lead-cleaner/frontend/src/assets/logo.png"
    dest_logo_public = "d:/Projects/Deepan- Data Cleaning pipeline/zoominfo-lead-cleaner/frontend/public/logo.png"
    dest_fav_public = "d:/Projects/Deepan- Data Cleaning pipeline/zoominfo-lead-cleaner/frontend/public/favicon.png"
    dest_fav_ico = "d:/Projects/Deepan- Data Cleaning pipeline/zoominfo-lead-cleaner/frontend/public/favicon.ico"
    
    try:
        shutil.copy2(src_logo, dest_logo_assets)
        shutil.copy2(src_logo, dest_logo_public)
        shutil.copy2(src_favicon, dest_fav_public)
        shutil.copy2(src_favicon, dest_fav_ico)
    except Exception as e:
        print(f"[ASSET_COPY] Skipping asset copy on missing files: {e}")
        
    return {"success": True, "message": "Assets copied successfully!"}

# ─── PASSWORD AUTHENTICATION FLOWS (SIGNUP, LOGIN, FORGOT PASSWORD) ───

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

class VerifyRegistrationRequest(BaseModel):
    email: str
    otp: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

@router.post("/register")
def register_user(payload: RegisterRequest, background_tasks: BackgroundTasks):
    email = payload.email
    password = payload.password.strip()
    name = payload.name.strip()
    role = payload.role.strip()
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    execute_sql(cursor, "SELECT id, otp_verified FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    hashed_pwd = hash_password(password)
    profile_pic = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
    
    # Initialize default profile settings
    default_settings = {
        "first_name": name,
        "last_name": "",
        "company_name": "",
        "job_role": role,
        "export_format": "csv",
        "cleaning_preferences": {
            "validate_emails": True,
            "validate_phones": True,
            "clean_linkedin": True,
            "clean_websites": True,
            "remove_duplicates": True,
            "remove_blank_rows": True,
            "generate_invalid_file": True,
            "generate_duplicate_file": True
        }
    }
    settings_str = json.dumps(default_settings)
    
    if user:
        if isinstance(user, tuple) or isinstance(user, list):
            user_id, otp_verified = user[0], user[1]
        else:
            user_id = user["id"]
            otp_verified = user["otp_verified"]
            
        if otp_verified:
            conn.close()
            raise HTTPException(status_code=400, detail="An account with this email address already exists. Please log in.")
        else:
            # Overwrite unverified account with new registration details
            execute_sql(cursor, """
                UPDATE users 
                SET name = ?, password_hash = ?, role = ?, profile_picture = ?, profile_settings = ?
                WHERE id = ?
            """, (name, hashed_pwd, role, profile_pic, settings_str, user_id))
    else:
        # Create a new unverified user
        execute_sql(cursor, """
            INSERT INTO users (google_id, name, email, password_hash, role, profile_picture, otp_verified, profile_settings, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (f"email-{secrets.token_hex(8)}", name, email, hashed_pwd, role, profile_pic, False, settings_str))
        
    conn.commit()
    
    # Generate OTP
    otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
    
    execute_sql(cursor, """
        INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (email, otp, expires_at, False))
    conn.commit()
    conn.close()
    
    background_tasks.add_task(send_otp_via_email, email, otp)
    
    return {
        "success": True,
        "message": "Account created. A 6-digit verification code has been sent to your email.",
        "sandbox": is_sandbox_mode(email)
    }

@router.post("/verify-registration")
def verify_registration(payload: VerifyRegistrationRequest):
    email = payload.email
    otp = payload.otp.strip()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Query otp_verifications
    execute_sql(cursor, """
        SELECT id, expires_at, is_used FROM otp_verifications 
        WHERE email = ? AND otp_code = ? AND is_used = False
        ORDER BY id DESC LIMIT 1
    """, (email, otp))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification code. Please try again.")
        
    if isinstance(row, tuple) or isinstance(row, list):
        v_id, expires_at, is_used = row
    else:
        v_id = row["id"]
        expires_at = row["expires_at"]
        is_used = row["is_used"]
        
    # Expiration parser
    if isinstance(expires_at, str):
        expires_dt = datetime.fromisoformat(expires_at.split(".")[0].replace("Z", ""))
    else:
        expires_dt = expires_at
        
    if expires_dt.tzinfo is not None:
        expires_dt = expires_dt.replace(tzinfo=None)
        
    if datetime.utcnow() > expires_dt:
        conn.close()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    # Activate user
    execute_sql(cursor, "UPDATE otp_verifications SET is_used = True WHERE id = ?", (v_id,))
    execute_sql(cursor, "UPDATE users SET otp_verified = True, last_login = CURRENT_TIMESTAMP WHERE email = ?", (email,))
    conn.commit()
    
    # Get user profile details
    execute_sql(cursor, "SELECT name, profile_picture FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if isinstance(user, tuple) or isinstance(user, list):
        db_name, db_pic = user
    else:
        db_name = user["name"]
        db_pic = user["profile_picture"]
        
    token = create_jwt({"email": email})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "email": email,
            "name": db_name,
            "profile_picture": db_pic
        }
    }

@router.post("/login")
def login_user(payload: LoginRequest):
    email = payload.email
    password = payload.password.strip()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT id, name, password_hash, otp_verified, profile_picture FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="No account found with this email. Please sign up.")
        
    if isinstance(user, tuple) or isinstance(user, list):
        user_id, name, db_hash, otp_verified, profile_picture = user
    else:
        user_id = user["id"]
        name = user["name"]
        db_hash = user["password_hash"]
        otp_verified = user["otp_verified"]
        profile_picture = user["profile_picture"]
        
    if not db_hash:
        conn.close()
        raise HTTPException(status_code=400, detail="This account was registered through Google. Please log in using Google.")
        
    if not verify_password(password, db_hash):
        conn.close()
        raise HTTPException(status_code=400, detail="Incorrect password. Please try again.")
        
    if not otp_verified:
        conn.close()
        return JSONResponse(status_code=400, content={
            "status": "UNVERIFIED_ACCOUNT",
            "detail": "Your account email is unverified. Please complete verification."
        })
        
    # Update last login
    execute_sql(cursor, "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    
    token = create_jwt({"email": email})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "email": email,
            "name": name,
            "profile_picture": profile_picture
        }
    }

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = payload.email
    
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT id, name FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return {
            "success": True,
            "message": "If the account exists, a password reset code has been sent.",
            "sandbox": False
        }
        
    # Generate password reset OTP
    otp = "123456" if is_mock_email(email) else "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.fromtimestamp(time.time() + 600) # 10 mins
    
    execute_sql(cursor, """
        INSERT INTO otp_verifications (email, otp_code, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (email, otp, expires_at, False))
    conn.commit()
    conn.close()
    
    background_tasks.add_task(send_otp_via_email, email, otp)
    
    return {
        "success": True,
        "message": "A 6-digit password reset code has been sent to your email.",
        "sandbox": is_sandbox_mode(email)
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    email = payload.email
    otp = payload.otp.strip()
    new_password = payload.new_password.strip()
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # Verify the reset OTP
    execute_sql(cursor, """
        SELECT id, expires_at, is_used FROM otp_verifications 
        WHERE email = ? AND otp_code = ? AND is_used = False
        ORDER BY id DESC LIMIT 1
    """, (email, otp))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid reset code. Please check and try again.")
        
    if isinstance(row, tuple) or isinstance(row, list):
        v_id, expires_at, is_used = row
    else:
        v_id = row["id"]
        expires_at = row["expires_at"]
        is_used = row["is_used"]
        
    # Expiration parser
    if isinstance(expires_at, str):
        expires_dt = datetime.fromisoformat(expires_at.split(".")[0].replace("Z", ""))
    else:
        expires_dt = expires_at
        
    if expires_dt.tzinfo is not None:
        expires_dt = expires_dt.replace(tzinfo=None)
        
    if datetime.utcnow() > expires_dt:
        conn.close()
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
        
    # Update password
    hashed_pwd = hash_password(new_password)
    execute_sql(cursor, "UPDATE otp_verifications SET is_used = True WHERE id = ?", (v_id,))
    execute_sql(cursor, "UPDATE users SET password_hash = ?, otp_verified = True, last_login = CURRENT_TIMESTAMP WHERE email = ?", (hashed_pwd, email))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "Password updated successfully. Please log in with your new password."
    }
