import hashlib
import secrets

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations
    and a cryptographically secure 16-byte random salt.
    Returns the salt and hash value formatted as 'salt:hex_hash'.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(password: str, password_hash: str) -> bool:
    """
    Verifies a password against a stored hash string formatted as 'salt:hex_hash'.
    Returns True if valid, False otherwise.
    """
    if not password_hash or ":" not in password_hash:
        return False
    try:
        salt, hash_val = password_hash.split(':', 1)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(key.hex(), hash_val)
    except Exception:
        return False
