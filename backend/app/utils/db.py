import os
import sqlite3
from datetime import datetime

# Writable path for SQLite in serverless vs local dev
default_db_path = "/tmp/database.db" if os.name != "nt" else "./tmp/database.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")


def get_connection():
    if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
        try:
            import psycopg2
            url = DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return psycopg2.connect(url)
        except ImportError:
            raise RuntimeError("psycopg2 is required for PostgreSQL. Please install psycopg2-binary.")
    else:
        # SQLite
        path = DATABASE_URL
        if path.startswith("sqlite:///"):
            path = path.replace("sqlite:///", "", 1)
        elif path.startswith("sqlite://"):
            path = path.replace("sqlite://", "", 1)
        
        # Ensure parent directory exists
        dir_name = os.path.dirname(path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
            
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        return conn

def execute_sql(cursor, sql, params=()):
    is_postgres = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")
    if is_postgres:
        sql = sql.replace("?", "%s")
    cursor.execute(sql, params)
    return cursor

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    is_postgres = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")
    
    if is_postgres:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255),
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                role VARCHAR(100),
                profile_picture TEXT,
                otp_verified BOOLEAN DEFAULT FALSE,
                profile_settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255),
                otp_code VARCHAR(10),
                expires_at TIMESTAMP,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Check and migrate PostgreSQL columns using database-level IF NOT EXISTS guards
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);")
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100);")
            print("[DB Migration] Verified and applied password_hash and role columns in PostgreSQL.")
        except Exception as e:
            print(f"[DB Migration Warning] PostgreSQL check/migrate failed (might already exist): {e}")
            
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT,
                name TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT,
                profile_picture TEXT,
                otp_verified BOOLEAN DEFAULT FALSE,
                profile_settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT,
                otp_code TEXT,
                expires_at TIMESTAMP,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Check and migrate SQLite columns
        cursor.execute("PRAGMA table_info(users);")
        columns = [row[1] if isinstance(row, tuple) or isinstance(row, list) else row["name"] for row in cursor.fetchall()]
        if 'password_hash' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT;")
            print("[DB Migration] Added column 'password_hash' to SQLite table 'users'.")
        if 'role' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT;")
            print("[DB Migration] Added column 'role' to SQLite table 'users'.")
        
    conn.commit()
    conn.close()
    print("[DB] Database initialised successfully with users and migration columns checked.")
