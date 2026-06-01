import hmac
import hashlib
import base64
import json
import time
import os

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-default-key-for-lead-cleaner")

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').replace('=', '')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict, expires_in_seconds: int = 86400) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    
    # Add expiration claim
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in_seconds
    
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload_copy).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
            
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        
        # 1. Try with raw secret string (UTF-8 encoded)
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        
        if hmac.compare_digest(signature_b64, expected_sig_b64):
            payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
            if "exp" in payload and payload["exp"] < int(time.time()):
                return None
            return payload
            
        # 2. Try with base64-decoded secret bytes (common for Supabase JWT verification)
        try:
            padded_secret = JWT_SECRET
            if len(padded_secret) % 4 != 0:
                padded_secret += '=' * (4 - len(padded_secret) % 4)
            decoded_secret = base64.b64decode(padded_secret)
            expected_sig_decoded = hmac.new(decoded_secret, signing_input, hashlib.sha256).digest()
            expected_sig_decoded_b64 = base64url_encode(expected_sig_decoded)
            if hmac.compare_digest(signature_b64, expected_sig_decoded_b64):
                payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
                if "exp" in payload and payload["exp"] < int(time.time()):
                    return None
                return payload
        except Exception:
            pass
            
        return None
    except Exception:
        return None

