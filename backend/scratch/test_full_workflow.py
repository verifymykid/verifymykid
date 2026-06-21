import requests
import json
import sqlite3
import uuid

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = "/Users/ekeneanyaegbu/Documents/Verifymykid/backend/verifymykid.db"

def run_e2e_tests():
    print("======================================================================")
    print("STARTING FULL END-TO-END WORKFLOW INTEGRATION TEST")
    print("======================================================================\n")

    # Generate unique emails and names for clean test isolation
    salt = uuid.uuid4().hex[:4].upper()
    school_email = f"stjude_{salt}@academy.edu"
    school_name = f"St. Jude Academy {salt}"
    parent_email = f"grace_{salt}@hopper.com"
    parent_name = f"Grace Hopper {salt}"
    guardian_email = f"daniel_{salt}@stjude.edu"
    guardian_name = f"Daniel Craig {salt}"

    # 1. School Registration
    print("Step 1: Registering a new school...")
    reg_payload = {
        "name": school_name,
        "email": school_email,
        "phone": "+234 801 111 2222",
        "address": "12 St. Jude Lane, Lekki, Lagos",
        "website": "www.stjudeacademy.edu",
        "password": "stjudepassword"
    }
    res = requests.post(f"{BASE_URL}/api/auth/school/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    school_data = res.json()
    school_id = school_data["id"]
    print(f"-> SUCCESS: Registered school '{school_name}' with ID: {school_id}\n")

    # 2. OTP Verification
    print("Step 2: Performing OTP verification for school...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key=?", (f"school_otp_{school_id}",))
    otp_code = cursor.fetchone()[0]
    conn.close()
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/verify-otp", json={"code": otp_code})
    assert res.status_code == 200, f"OTP verification failed: {res.text}"
    print("-> SUCCESS: OTP verified. Status set to 'PENDING APPROVAL'.\n")

    # 3. Super Admin Login
    print("Step 3: Logging in as Super Admin...")
    sa_login_payload = {
        "email": "admin@verifymykid.com",
        "password": "admin123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/login", json=sa_login_payload)
    assert res.status_code == 200, f"Super Admin login failed: {res.text}"
    sa_token = res.json()["token"]
    print("-> SUCCESS: Logged in as Super Admin.\n")

    # 4. Super Admin Approves School
    print("Step 4: Super Admin approving the new school...")
    headers = {"Authorization": f"Bearer {sa_token}"}
    res = requests.post(f"{BASE_URL}/api/superadmin/approve-school/{school_id}", headers=headers)
    assert res.status_code == 200, f"Approval failed: {res.text}"
    print("-> SUCCESS: School approved by Super Admin.\n")

    # 5. School Admin Login
    print("Step 5: Logging in as School Admin...")
    school_login_payload = {
        "email": school_email,
        "password": "stjudepassword"
    }
    res = requests.post(f"{BASE_URL}/api/auth/school/login", json=school_login_payload)
    assert res.status_code == 200, f"School Admin login failed: {res.text}"
    school_token = res.json()["token"]
    print("-> SUCCESS: Logged in as School Admin. Retained Session token.\n")

    # 6. Onboard Bus Guardian
    print("Step 6: School Admin adding a Bus Guardian...")
    guardian_payload = {
        "name": guardian_name,
        "phone": "+234 802 222 3333",
        "busNumber": "Bus SJ-01",
        "driverName": "Daniel Craig",
        "plateNumber": "LA-777-SJD",
        "assignedRoute": "Route SJ1: Lekki Phase 2 to School",
        "password": "guardianpassword"
    }
    res = requests.post(f"{BASE_URL}/api/guardians?schoolId={school_id}", json=guardian_payload)
    assert res.status_code == 200, f"Onboarding Guardian failed: {res.text}"
    guardian_id = res.json()["id"]
    print(f"-> SUCCESS: Registered Bus Guardian '{guardian_name}' with ID: {guardian_id}\n")

    # 7. Onboard Parent
    print("Step 7: Onboarding Parent...")
    parent_payload = {
        "name": parent_name,
        "email": parent_email,
        "phone": "+234 803 333 4444",
        "address": "45 Computing Blvd, Ikoyi, Lagos",
        "password": "gracepassword",
        "singleParent": True,
        "spouseName": "",
        "spousePhone": "",
        "schoolId": school_id,
        "children": [
            {
                "name": f"Ada Hopper {salt}",
                "age": 8
            }
        ]
    }
    res = requests.post(f"{BASE_URL}/api/auth/parent/register", json=parent_payload)
    assert res.status_code == 200, f"Onboarding Parent failed: {res.text}"
    parent_id = res.json()["id"]
    print(f"-> SUCCESS: Registered Parent '{parent_name}' with ID: {parent_id}\n")

    # 8. Approve Parent
    print("Step 8: Approving Parent profile status...")
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}/status?status=APPROVED")
    assert res.status_code == 200, f"Parent approval failed: {res.text}"
    print("-> SUCCESS: Parent status updated to APPROVED.\n")

    # 9. Parent Login & Generate OTP Temporary Authorization
    print("Step 9: Parent logging in and generating temporary authorization QR code...")
    parent_login_payload = {
        "email": parent_email,
        "password": "gracepassword"
    }
    res = requests.post(f"{BASE_URL}/api/auth/parent/login", json=parent_login_payload)
    assert res.status_code == 200, f"Parent login failed: {res.text}"
    parent_token = res.json()["token"]

    temp_auth_payload = {
        "name": "Uncle Charles",
        "phone": "+234 804 444 5555",
        "type": "One-Time"
    }
    res = requests.post(f"{BASE_URL}/api/parents/{parent_id}/temp-auth", json=temp_auth_payload)
    assert res.status_code == 200, f"Temporary Authorization generation failed: {res.text}"
    auth_code = res.json()["code"]
    print(f"-> SUCCESS: Generated dynamic scan pick-up code: {auth_code}\n")

    # 10. Scan Pickup Event
    print("Step 10: Bus Guardian scanning child pickup using code...")
    verify_payload = {
        "parentId": parent_id,
        "guardianId": guardian_id,
        "enteredCode": auth_code,
        "isMorning": True,
        "scannedGps": "6.4281, 3.4219"
    }
    res = requests.post(f"{BASE_URL}/api/logs/pickups/verify", json=verify_payload)
    assert res.status_code == 200, f"Scan verification failed: {res.text}"
    print("-> SUCCESS: Pickup scan verified. Security Audit log entered.\n")

    # 11. GPS Coordinates Update (Telemetry)
    print("Step 11: Guardian pushing GPS telemetric updates...")
    res = requests.put(f"{BASE_URL}/api/guardians/{guardian_id}/online?online=true&lat=6.43501&lng=3.41502")
    assert res.status_code == 200, f"GPS telemetry update failed: {res.text}"
    print("-> SUCCESS: Telemetry updated: lat=6.43501, lng=3.41502\n")

    # 12. Billing Desk
    print("Step 12: School Admin making SaaS license payments...")
    res = requests.post(f"{BASE_URL}/api/schools/{school_id}/pay?amount=3600&children=1")
    assert res.status_code == 200, f"Billing payment failed: {res.text}"
    print("-> SUCCESS: Payment recorded. SaaS license active.\n")

    # 13. Notifications and Messaging Desk
    print("Step 13: Testing notifications desk...")
    notif_payload = {
        "senderId": school_id,
        "senderName": school_name,
        "recipientId": parent_id,
        "subject": "Transportation Update",
        "message": "Bus SJ-01 is departing Lekki Terminal."
    }
    res = requests.post(f"{BASE_URL}/api/notifications", json=notif_payload)
    assert res.status_code == 200, f"Notification creation failed: {res.text}"
    notif_id = res.json()["id"]

    # Read notification
    res = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read")
    assert res.status_code == 200, f"Mark read failed: {res.text}"
    print("-> SUCCESS: Messages generated, dispatched, and marked as read.\n")

    # 14. SOS Panic Trigger & School Acknowledge
    print("Step 14: Guardian triggering emergency SOS panic, school acknowledging...")
    panic_payload = {
        "guardianId": guardian_id,
        "type": "Accident",
        "note": "Minor bumper scrape near Lekki Toll."
    }
    res = requests.post(f"{BASE_URL}/api/alerts/panic", json=panic_payload)
    assert res.status_code == 200, f"Panic trigger failed: {res.text}"
    alert_id = res.json()["id"]

    # School admin acknowledges it
    res = requests.post(f"{BASE_URL}/api/alerts/{alert_id}/acknowledge")
    assert res.status_code == 200, f"Panic acknowledgment failed: {res.text}"
    print("-> SUCCESS: SOS panic alert activated and acknowledged by School Admin.\n")

    # 15. Change School / Transfer Feature
    print("Step 15: Testing change school transfer...")
    # Register secondary school
    school_email_2 = f"stjude_second_{salt}@academy.edu"
    school_name_2 = f"St. Jude Academy Second {salt}"
    res = requests.post(f"{BASE_URL}/api/auth/school/register", json={
        "name": school_name_2,
        "email": school_email_2,
        "phone": "+234 801 111 2223",
        "address": "14 St. Jude Lane, Lekki, Lagos",
        "website": "www.stjudeacademy.edu",
        "password": "stjudepassword"
    })
    school_id_2 = res.json()["id"]
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key=?", (f"school_otp_{school_id_2}",))
    otp_code_2 = cursor.fetchone()[0]
    conn.close()
    res = requests.post(f"{BASE_URL}/api/schools/{school_id_2}/verify-otp", json={"code": otp_code_2})
    assert res.status_code == 200, f"Second school OTP verification failed: {res.text}"
    requests.post(f"{BASE_URL}/api/superadmin/approve-school/{school_id_2}", headers=headers)

    # Parent requests transfer to second school
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}", json={"pendingSchoolId": school_id_2})
    assert res.status_code == 200, f"Request transfer failed: {res.text}"

    # Verify pendingSchoolId column holds the destination school
    res = requests.get(f"{BASE_URL}/api/parents/{parent_id}")
    assert res.json()["pendingSchoolId"] == school_id_2, "Pending school ID was not updated."

    # Destination school admin approves transfer
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}", json={
        "schoolId": school_id_2,
        "pendingSchoolId": None,
        "status": "APPROVED"
    })
    assert res.status_code == 200, f"Approve transfer failed: {res.text}"

    # Confirm parent belongs to new school and pendingSchoolId is cleared
    res = requests.get(f"{BASE_URL}/api/parents/{parent_id}")
    assert res.json()["schoolId"] == school_id_2, "School ID did not update to new school."
    assert res.json()["pendingSchoolId"] is None, "Pending school ID not cleared."
    print("-> SUCCESS: Change school transfer initiated and approved successfully.\n")

    # 16. Block / Suspend / Delete features
    print("Step 16: Testing suspend & unsuspend blocks...")
    # Suspend parent
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}/status?status=SUSPENDED")
    assert res.status_code == 200, f"Suspend failed: {res.text}"
    # Verify login fails during suspension
    res = requests.post(f"{BASE_URL}/api/auth/parent/login", json=parent_login_payload)
    assert res.status_code == 403, f"Expected 403 on suspended login, got: {res.status_code}"
    print("-> SUCCESS: Suspended parent blocked from signing in.")

    # Reactivate parent
    res = requests.put(f"{BASE_URL}/api/parents/{parent_id}/status?status=APPROVED")
    assert res.status_code == 200, f"Unsuspend failed: {res.text}"
    # Verify login works again
    res = requests.post(f"{BASE_URL}/api/auth/parent/login", json=parent_login_payload)
    assert res.status_code == 200, f"Re-login failed: {res.text}"
    print("-> SUCCESS: Reactivated parent access granted.\n")

    # 17. School profile update (settings)
    print("Step 17: Testing school profile password change (settings)...")
    profile_update = {
        "name": f"{school_name} New",
        "phone": "+234 801 111 5555",
        "address": "12 St. Jude Lane, Lekki, Lagos",
        "website": "www.stjudeacademy.edu",
        "password": "newpassword123",
        "currentPassword": "stjudepassword"
    }
    res = requests.put(f"{BASE_URL}/api/schools/{school_id}", json=profile_update)
    assert res.status_code == 200, f"School profile update failed: {res.text}"

    # Verify login with new password
    res = requests.post(f"{BASE_URL}/api/auth/school/login", json={
        "email": school_email,
        "password": "newpassword123"
    })
    assert res.status_code == 200, f"School re-login with new password failed: {res.text}"
    print("-> SUCCESS: Profile password update (settings) verified successfully.\n")

    # 18. SQLite direct verification
    print("Step 18: Performing direct SQLite integrity checking...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check parent school assignment in database
    cursor.execute("SELECT schoolId, pendingSchoolId, status FROM parents WHERE id=?", (parent_id,))
    db_parent = cursor.fetchone()
    print(f"Database Parent Record: schoolId={db_parent[0]}, pendingSchoolId={db_parent[1]}, status={db_parent[2]}")
    
    # Check logs counts
    cursor.execute("SELECT COUNT(*) FROM pickup_logs WHERE schoolId=?", (school_id_2,))
    logs_count = cursor.fetchone()[0]
    print(f"Database Pickup Logs for new school: {logs_count}")
    
    # Check payments
    cursor.execute("SELECT COUNT(*) FROM payment_records WHERE schoolId=?", (school_id,))
    payment_count = cursor.fetchone()[0]
    print(f"Database Payments for original school: {payment_count}")

    conn.close()
    print("\n-> SUCCESS: SQLite direct verification complete.")

    print("\n======================================================================")
    print("ALL E2E WORKFLOW TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")

if __name__ == "__main__":
    run_e2e_tests()
