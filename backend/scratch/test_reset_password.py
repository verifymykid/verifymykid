import requests

BASE_URL = "http://127.0.0.1:8000"

def test_reset_flow():
    print("Testing Super Admin Forgot/Reset Password flow...")
    
    # 1. Trigger forgot password
    print("Step 1: Requesting reset code...")
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/forgot-password", json={"email": "admin@verifymykid.com"})
    assert res.status_code == 200, f"Forgot password request failed: {res.text}"
    print("-> Success:", res.json())
    
    # 2. Retrieve code from smtp-logs
    print("Step 2: Retrieving reset code from SMTP logs...")
    res = requests.get(f"{BASE_URL}/api/smtp-logs")
    assert res.status_code == 200, f"Failed to list SMTP logs: {res.text}"
    logs = res.json()
    assert len(logs) > 0, "No SMTP logs generated!"
    
    # Find the most recent reset code email
    reset_log = None
    for log in logs:
        if "Password Reset" in log["text"] or "password reset code is:" in log["text"]:
            reset_log = log["text"]
            break
            
    assert reset_log is not None, "Could not find reset code in SMTP logs!"
    print("SMTP log found:", reset_log)
    
    # Extract the 6 digit code
    code_part = reset_log.split("password reset code is: ")
    if len(code_part) > 1:
        code = code_part[1].strip()
    else:
        # Try fallback matching
        import re
        code = re.findall(r"\d{6}", reset_log)[0]
        
    print(f"Extracted reset code: {code}")
    
    # 3. Reset password to a new value
    print("Step 3: Resetting password with the code...")
    new_password = "supersecureadmin123"
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/reset-password", json={
        "code": code,
        "password": new_password
    })
    assert res.status_code == 200, f"Reset password failed: {res.text}"
    print("-> Success:", res.json())
    
    # 4. Verify login with new password
    print("Step 4: Verifying login with the new password...")
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/login", json={
        "email": "admin@verifymykid.com",
        "password": new_password
    })
    assert res.status_code == 200, f"Login with new password failed: {res.text}"
    print("-> Success! Super Admin login verified with new password.")
    
    # 5. Verify login with old password fails
    print("Step 5: Verifying login with the old password fails...")
    res = requests.post(f"{BASE_URL}/api/auth/superadmin/login", json={
        "email": "admin@verifymykid.com",
        "password": "admin123"
    })
    assert res.status_code == 400, f"Expected login with old password to fail with 400, got: {res.status_code}"
    print("-> Success! Old password 'admin123' is no longer valid.")
    
    # 6. Reset password back to default 'admin123' so the system remains consistent for verification
    print("Step 6: Resetting password back to default 'admin123' for ease of testing...")
    # Request code again
    requests.post(f"{BASE_URL}/api/auth/superadmin/forgot-password", json={"email": "admin@verifymykid.com"})
    logs = requests.get(f"{BASE_URL}/api/smtp-logs").json()
    new_code = None
    for log in logs:
        if "password reset code is:" in log["text"]:
            new_code = log["text"].split("password reset code is: ")[1].strip()
            break
    requests.post(f"{BASE_URL}/api/auth/superadmin/reset-password", json={
        "code": new_code,
        "password": "admin123"
    })
    print("-> Restored default password 'admin123'.")
    
if __name__ == "__main__":
    try:
        test_reset_flow()
        print("\nAll password reset integration tests passed!")
    except Exception as e:
        print("\nTest failed with error:", e)
