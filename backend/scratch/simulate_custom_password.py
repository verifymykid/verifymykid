import urllib.request
import json
import ssl

school_id = "SCH-FBDE"
base_url = "https://168-231-112-221.sslip.io"
context = ssl._create_unverified_context()

# 1. Create Guardian with custom password 'admin123'
create_url = f"{base_url}/api/guardians?schoolId={school_id}"
payload = {
    "name": "Custom Guardian Tester",
    "phone": "+2348055555555",
    "busNumber": "BUS-999",
    "driverName": "Driver Tester",
    "plateNumber": "TEST-999-XYZ",
    "assignedRoute": "Route Z",
    "password": "admin123"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(create_url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, context=context) as response:
        res_data = json.loads(response.read().decode())
        print("Create Status:", response.getcode())
        print("Create Response:", res_data)
except urllib.error.HTTPError as e:
    print("Create HTTP Error:", e.code)
    print("Body:", e.read().decode())
    exit(1)

# 2. Test Login with custom password 'admin123'
login_url = f"{base_url}/api/auth/guardian/login"
login_payload = {
    "name": "Custom Guardian Tester",
    "password": "admin123"
}
login_data = json.dumps(login_payload).encode("utf-8")
login_req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(login_req, context=context) as response:
        print("Login Status:", response.getcode())
        print("Login Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("Login HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Login Error:", e)
