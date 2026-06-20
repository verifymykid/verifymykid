import sys
import os
import sqlite3

# Import security modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security import verify_password

conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db')
cursor = conn.cursor()
cursor.execute("select id, name, email, password from guardians where name like '%Joena%'")
rows = cursor.fetchall()
print("QUERY RESULTS:")
for r in rows:
    g_id, name, email, password_hash = r
    print(f"ID: {g_id}")
    print(f"Name: '{name}' (length: {len(name)})")
    print(f"Name Char Ords: {[ord(c) for c in name]}")
    print(f"Email: '{email}'")
    
    # Test common passwords
    passwords_to_test = ["admin123", "password123", "Joena123", "Joena", "Joena Madueke", "Joena Madueke123"]
    matched = None
    for p in passwords_to_test:
        if verify_password(p, password_hash):
            matched = p
            break
            
    print(f"Password Verify Status: Match found = '{matched}' (tested {passwords_to_test})")
conn.close()
