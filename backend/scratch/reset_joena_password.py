import sys
import os
import sqlite3

# Import security modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security import get_password_hash

conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db')
cursor = conn.cursor()

# Get password hash for admin123
new_hash = get_password_hash("admin123")

# Update Joena Madueke
cursor.execute("UPDATE guardians SET password = ? WHERE name = 'Joena Madueke'", (new_hash,))
conn.commit()

print("UPDATED PASSWORD FOR JOENA MADUEKE TO admin123")
conn.close()
