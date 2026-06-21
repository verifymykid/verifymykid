import urllib.request
import json
import ssl

school_id = "SCH-055B"
otp_code = "310539"
base_url = "https://168-231-112-221.sslip.io"
context = ssl._create_unverified_context()

# 1. Verify OTP
verify_url = f"{base_url}/api/schools/{school_id}/verify-otp"
verify_data = json.dumps({"code": otp_code}).encode("utf-8")
verify_req = urllib.request.Request(verify_url, data=verify_data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(verify_req, context=context) as response:
        print("OTP Verification Status:", response.getcode())
        print("OTP Verification Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("OTP Verification HTTP Error:", e.code)
    print("Body:", e.read().decode())
    exit(1)
except Exception as e:
    print("OTP Verification Error:", e)
    exit(1)

# 2. Approve School
approve_url = f"{base_url}/api/superadmin/approve-school/{school_id}"
approve_req = urllib.request.Request(approve_url, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(approve_req, context=context) as response:
        print("School Approval Status:", response.getcode())
        print("School Approval Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("School Approval HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("School Approval Error:", e)
