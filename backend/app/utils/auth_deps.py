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
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="User profile not registered.")
        
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
