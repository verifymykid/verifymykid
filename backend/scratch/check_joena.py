import sys
import os
import sqlite3

# Import security modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security import verify_password

conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db')
cursor = conn.cursor()
cursor.execute("select id, name, email, password from guardians")
rows = cursor.fetchall()
print("ALL GUARDIANS IN DB:")
for r in rows:
    g_id, name, email, password_hash = r
    print(f"--- Guardian: {name} ---")
    print(f"  ID: {g_id}")
    print(f"  Email: {email}")
    print(f"  Hash: {password_hash}")
    
    # Test candidates
    candidates = [
        "admin123", "password123", g_id, g_id.lower(), 
        name, name.lower(), name.replace(" ", ""), 
        "Joena", "Joena123", "Joena Madueke"
    ]
    matched = None
    for c in candidates:
        if verify_password(c, password_hash):
            matched = c
            break
    print(f"  Matched password: '{matched}' (from candidates: {candidates})")
conn.close()
