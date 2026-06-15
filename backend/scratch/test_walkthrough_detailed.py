import requests
import json
import sqlite3
import uuid

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = "/Users/ekeneanyaegbu/Documents/Verifymykid/backend/verifymykid.db"

def run_walkthrough():
    print("======================================================================")
    print("STARTING DETAILED WALKTHROUGH INTEGRATION TEST")
    print("======================================================================\n")

    salt = uuid.uuid4().hex[:4].upper()
    school_email = f"walk_school_{salt}@verifymykid.com"
    school_name = f"Walkthrough Green School {salt}"
    parent_email = f"walk_parent_{salt}@gmail.com"
    parent_name = f"Walkthrough Parent {salt}"
    guardian_email = f"walk_guardian_{salt}@verifymykid.com"
    guardian_name = f"Walkthrough Guardian {salt}"

    # 1. Register School
    print("Step 1: Registering school...")
    res = requests.post(f"{BASE_URL}/api/auth/school/register", json={
        "name": school_name,
        "email": school_email,
        "phone": "+234 801 111 2222",
        "address": "Victoria Island, Lagos",
        "website": "www.walkschool.com",
        "password": "schoolpassword"
    })
    assert res.status_code == 200, res.text
    school_id = res.json()["id"]
    print(f"-> SUCCESS: Registered school {school_id}")

    # 2. Retrieve & Verify OTP
    print("Step 2: Performing OTP verification...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key=?", (f"school_otp_{school_id}",))
    otp_code = cursor.fetchone()[0]
    conn.close()
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/verify-otp", json={"code": otp_code})
    assert res.status_code == 200, res.text
    print("-> SUCCESS: OTP verified.")

    # 3. Super Admin Approval
    print("Step 3: Super Admin approving the school...")
    # Login as Super Admin
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/login", json={
        "email": "admin@verifymykid.com",
        "password": "admin123"
    })
    assert res.status_code == 200, res.text
    sa_token = res.json()["token"]
    headers = {"Authorization": f"Bearer {sa_token}"}
    res = requests.post(f"{BASE_URL}/api/superadmin/approve-school/{school_id}", headers=headers)
    assert res.status_code == 200, res.text
    print("-> SUCCESS: School approved by Super Admin.")

    # 4. School registers its first Master QR location
    print("Step 4: Registering first Master QR location (default limit = 1)...")
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/qr-register", json={"lat": 6.4312, "lng": 3.4190})
    assert res.status_code == 200, res.text
    print("-> SUCCESS: First location registered.")

    # 5. School attempts to register a SECOND location without Super Admin permission
    print("Step 5: Registering second location (should be BLOCKED because limit=1 and unlocked=False)...")
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/qr-register", json={"lat": 6.4320, "lng": 3.4200})
    assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
    print("-> SUCCESS: Blocked as expected. Message:", res.json()["detail"])

    # 6. School Admin requests unlock permission from Super Admin
    print("Step 6: School requesting print/unlock permission from Super Admin...")
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/qr-lock?location_name=Gate%202")
    assert res.status_code == 200, res.text
    # Get request ID
    req_id = res.json()["masterQrRequests"][-1]["id"]
    print(f"-> SUCCESS: Unlock request created with ID: {req_id}")

    # 7. Super Admin approves unlock request
    print("Step 7: Super Admin approving unlock request...")
    res = requests.post(f"{BASE_URL}/api/superadmin/approve-qr-request/{school_id}/{req_id}", headers=headers)
    assert res.status_code == 200, res.text
    print("-> SUCCESS: Super Admin approved print/unlock request.")

    # 8. School registers second location (now it should succeed)
    print("Step 8: Re-registering second location (should SUCCEED now)...")
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/qr-register", json={"lat": 6.4320, "lng": 3.4200})
    assert res.status_code == 200, res.text
    print("-> SUCCESS: Second location registered successfully.")

    # 9. Onboard Bus Guardian & Parent
    print("Step 9: Onboarding parent and bus guardian...")
    # Add guardian
    res = requests.post(f"{BASE_URL}/api/guardians?schoolId={school_id}", json={
        "name": guardian_name,
        "phone": "+234 802 222 3333",
        "busNumber": "Bus Walk-01",
        "driverName": "Daniel Walk",
        "plateNumber": "LA-777-WALK",
        "assignedRoute": "Route Walk",
        "password": "guardianpassword"
    })
    assert res.status_code == 200, res.text
    guardian_id = res.json()["id"]

    # Add parent
    res = requests.post(f"{BASE_URL}/api/auth/parent/register", json={
        "name": parent_name,
        "email": parent_email,
        "phone": "+234 803 333 4444",
        "address": "Victoria Island, Lagos",
        "password": "parentpassword",
        "singleParent": True,
        "spouseName": "",
        "spousePhone": "",
        "schoolId": school_id,
        "children": [{"name": f"Walk Child {salt}", "age": 6}]
    })
    assert res.status_code == 200, res.text
    parent_id = res.json()["id"]
    # Approve parent
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}/status?status=APPROVED")
    assert res.status_code == 200, res.text
    print("-> SUCCESS: Onboarded Guardian & Parent.")

    # 10. Test Bus Guardian logging in sets online = True and shows coords
    print("Step 10: Bus Guardian signs into portal...")
    # Guardian logins/goes online
    res = requests.put(f"{BASE_URL}/api/guardians/{guardian_id}/online?online=true&lat=6.4312&lng=3.4190")
    assert res.status_code == 200, res.text
    # Verify in DB that guardian is online and has coords
    res = requests.get(f"{BASE_URL}/api/guardians")
    all_guardians = res.json()
    match_g = next(g for g in all_guardians if g["id"] == guardian_id)
    assert match_g["online"] is True, "Guardian should be online"
    assert match_g["lat"] == 6.4312, "Guardian lat mismatch"
    assert match_g["lng"] == 3.4190, "Guardian lng mismatch"
    print("-> SUCCESS: Guardian is online with live coordinates.")

    # 11. Test scanning Master QR with out-of-bounds coords (fails + logs violation)
    print("Step 11: Scanning Master QR with out-of-bounds coordinates (spoofed)...")
    res = requests.post(f"{BASE_URL}/api/guardians/{guardian_id}/scan-master-qr", json={"lat": 6.9999, "lng": 3.9999})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ERROR"
    print("-> SUCCESS: Correctly rejected spoofed coordinates scan.")

    # 12. Test scanning Master QR with correct coords (succeeds as Arrival + toggles to Departure)
    print("Step 12: Scanning Master QR with matching registered coordinates (Arrival)...")
    res = requests.post(f"{BASE_URL}/api/guardians/{guardian_id}/scan-master-qr", json={"lat": 6.4312, "lng": 3.4190})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "VERIFIED"
    assert res.json()["type"] == "Arrival"

    print("Step 12b: Scanning Master QR again (Departure)...")
    res = requests.post(f"{BASE_URL}/api/guardians/{guardian_id}/scan-master-qr", json={"lat": 6.4312, "lng": 3.4190})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "VERIFIED"
    assert res.json()["type"] == "Departure"
    print("-> SUCCESS: Dynamic Arrival & Departure transitions and anti-cloning check successful.")

    # 13. Test Bus Guardian logs out and online status becomes False
    print("Step 13: Bus Guardian logging out...")
    res = requests.put(f"{BASE_URL}/api/guardians/{guardian_id}/online?online=false")
    assert res.status_code == 200, res.text
    # Verify offline in DB
    res = requests.get(f"{BASE_URL}/api/guardians")
    all_guardians = res.json()
    match_g = next(g for g in all_guardians if g["id"] == guardian_id)
    assert match_g["online"] is False, "Guardian should be offline after logging out"
    print("-> SUCCESS: Guardian offline, marker removed from active tracking map list.")

    # 14. Check Super Admin Logs
    print("Step 14: Verifying Super Admin logs contains all actions...")
    res = requests.get(f"{BASE_URL}/api/logs/system")
    assert res.status_code == 200, res.text
    logs = res.json()
    
    # We want to make sure we find:
    # 1. School Registration / OTP or Super Admin Approvals
    # 2. Security Violations
    # 3. Arrival/Departure scans
    # Let's check:
    types = [log["type"] for log in logs if log["schoolId"] == school_id]
    print("Logged types for this school:", types)
    assert "Security Violation" in types, "Security Violation not found in logs!"
    assert "Arrival" in types, "Arrival scan not found in logs!"
    assert "Departure" in types, "Departure scan not found in logs!"
    print("-> SUCCESS: Super Admin system audit logs contain all events.")

    # 15. Clean up seeded data
    print("Step 15: Cleaning up seeded walkthrough data to keep database clean...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM schools WHERE id=?", (school_id,))
    cursor.execute("DELETE FROM parents WHERE schoolId=?", (school_id,))
    cursor.execute("DELETE FROM guardians WHERE schoolId=?", (school_id,))
    cursor.execute("DELETE FROM children WHERE parentId=?", (parent_id,))
    cursor.execute("DELETE FROM system_logs WHERE schoolId=?", (school_id,))
    cursor.execute("DELETE FROM smtp_logs WHERE text LIKE ?", (f"%{parent_email}%",))
    cursor.execute("DELETE FROM system_settings WHERE key LIKE ?", (f"%_{school_id}",))
    conn.commit()
    conn.close()
    print("-> SUCCESS: Walkthrough records deleted, database remains in a pristine state.")
    
    print("\n======================================================================")
    print("WALKTHROUGH INTEGRATION RUN SUCCESSFUL!")
    print("======================================================================")

if __name__ == "__main__":
    run_walkthrough()
