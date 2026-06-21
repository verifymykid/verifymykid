import urllib.request
import json
import ssl

school_id = "SCH-FBDE"
base_url = "https://168-231-112-221.sslip.io"
context = ssl._create_unverified_context()

# 1. Create Guardian
create_url = f"{base_url}/api/guardians?schoolId={school_id}"
payload = {
    "name": "Acrylic Guardian Tester",
    "phone": "+2348055555555",
    "busNumber": "BUS-100",
    "driverName": "Alhaji Tester",
    "plateNumber": "LAG-100-TEST",
    "assignedRoute": "Route A"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(create_url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, context=context) as response:
        res_data = json.loads(response.read().decode())
        guardian_id = res_data["id"]
        print("Guardian Created Status:", response.getcode())
        print("Guardian ID:", guardian_id)
except urllib.error.HTTPError as e:
    print("Guardian Create HTTP Error:", e.code)
    print("Body:", e.read().decode())
    exit(1)
except Exception as e:
    print("Guardian Create Error:", e)
    exit(1)

# 2. Test Guardian Login
login_url = f"{base_url}/api/auth/guardian/login"
login_payload = {
    "name": "Acrylic Guardian Tester",
    "password": "password123"
}
login_data = json.dumps(login_payload).encode("utf-8")
login_req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(login_req, context=context) as response:
        print("Guardian Login Status:", response.getcode())
        print("Guardian Login Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("Guardian Login HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Guardian Login Error:", e)
