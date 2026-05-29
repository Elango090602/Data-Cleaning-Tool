from fastapi import Header, HTTPException, Depends
from app.utils.jwt import decode_jwt
from app.utils.db import get_connection, execute_sql

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
        
    token = authorization.split(" ")[1]
    payload = decode_jwt(token)
    if not payload or "email" not in payload:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")
        
    email = payload["email"]
    conn = get_connection()
    cursor = conn.cursor()
    
    execute_sql(cursor, "SELECT id, email, name, profile_picture, otp_verified FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        # Auto-register user from JWT info (since Supabase already verified them)
        name = email.split("@")[0].capitalize()
        profile_picture = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
        user_metadata = payload.get("user_metadata", {})
        if isinstance(user_metadata, dict):
            name = user_metadata.get("name", user_metadata.get("full_name", name))
            profile_picture = user_metadata.get("avatar_url", user_metadata.get("picture", profile_picture))
            
        execute_sql(cursor, """
            INSERT INTO users (google_id, name, email, profile_picture, otp_verified, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (payload.get("sub", ""), name, email, profile_picture, True))
        conn.commit()
        
        # Fetch again
        execute_sql(cursor, "SELECT id, email, name, profile_picture, otp_verified FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
    conn.close()

    # SQLite tuple row vs psycopg2 dict row compatibility
    if isinstance(user, tuple) or isinstance(user, list):
        user_id, u_email, u_name, u_pic, otp_verified = user
    else:
        user_id = user["id"]
        u_email = user["email"]
        u_name = user["name"]
        u_pic = user["profile_picture"]
        otp_verified = user["otp_verified"]
        
    if not otp_verified:
        raise HTTPException(status_code=403, detail="OTP verification pending.")
        
    return {
        "id": user_id,
        "email": u_email,
        "name": u_name,
        "profile_picture": u_pic
    }
