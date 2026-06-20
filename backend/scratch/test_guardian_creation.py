import sys
import os
import requests

# Import security modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security import verify_password
import sqlite3

# Test creating a guardian
url = "http://127.0.0.1:8001/api/guardians?schoolId=SCH-12ED"
payload = {
    "name": "Test Guardian",
    "phone": "1234567890",
    "busNumber": "Bus 99",
    "driverName": "Test Driver",
    "plateNumber": "TEST-PLATE",
    "assignedRoute": "Route Test",
    "password": "admin123",
    "profilePic": ""
}

print("Creating test guardian via POST request...")
res = requests.post(url, json=payload)
print(f"Status: {res.status_code}")
if res.status_code == 200:
    data = res.json()
    print("Created:", data)
    
    # Query db for the created hash
    conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db')
    cursor = conn.cursor()
    cursor.execute("select password from guardians where id = ?", (data['id'],))
    db_hash = cursor.fetchone()[0]
    conn.close()
    
    print(f"Stored Hash: {db_hash}")
    print(f"Verify 'admin123': {verify_password('admin123', db_hash)}")
    print(f"Verify 'password123': {verify_password('password123', db_hash)}")
else:
    print("Failed:", res.text)
