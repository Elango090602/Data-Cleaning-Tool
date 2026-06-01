import os
from dotenv import load_dotenv
load_dotenv()

from app.utils.db import get_connection

def main():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check database dialect
        is_postgres = os.getenv("DATABASE_URL", "").startswith("postgresql://") or os.getenv("DATABASE_URL", "").startswith("postgres://")
        
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        print(f"\n==================================================")
        print(f" TOTAL REGISTERED USERS: {total_users}")
        print(f"==================================================\n")
        
        cursor.execute("SELECT id, name, email, otp_verified, created_at, last_login FROM users ORDER BY id ASC")
        users = cursor.fetchall()
        
        if not users:
            print("No users found in the database.")
        else:
            print(f"{'ID':<5} | {'Name':<20} | {'Email':<30} | {'Verified':<8} | {'Created At':<20} | {'Last Login':<20}")
            print("-" * 115)
            for user in users:
                if is_postgres:
                    u_id, name, email, verified, created, last_login = user
                else:
                    # SQLite Row compatibility
                    u_id = user[0]
                    name = user[1]
                    email = user[2]
                    verified = user[3]
                    created = user[4]
                    last_login = user[5]
                
                verified_str = "Yes" if verified else "No"
                created_str = str(created)[:19] if created else "N/A"
                last_login_str = str(last_login)[:19] if last_login else "N/A"
                
                print(f"{u_id:<5} | {str(name):<20} | {str(email):<30} | {verified_str:<8} | {created_str:<20} | {last_login_str:<20}")
                
    except Exception as e:
        print(f"Error querying database: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
