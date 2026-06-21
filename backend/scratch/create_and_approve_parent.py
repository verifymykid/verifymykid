import urllib.request
import json
import ssl

school_id = "SCH-055B"
base_url = "https://168-231-112-221.sslip.io"
context = ssl._create_unverified_context()

# 1. Register Parent
register_url = f"{base_url}/api/auth/parent/register"
payload = {
    "name": "Acrylic Parent Tester",
    "email": "acrylicparent@gmail.com",
    "phone": "+2348033333333",
    "address": "123 School Rd, Lagos",
    "password": "password123",
    "singleParent": True,
    "spouseName": "",
    "spousePhone": "",
    "schoolId": school_id,
    "children": [{"name": "Bobby Tester", "age": 7}]
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(register_url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, context=context) as response:
        res_data = json.loads(response.read().decode())
        parent_id = res_data["id"]
        print("Parent Registered Status:", response.getcode())
        print("Parent ID:", parent_id)
except urllib.error.HTTPError as e:
    print("Parent Register HTTP Error:", e.code)
    print("Body:", e.read().decode())
    exit(1)
except Exception as e:
    print("Parent Register Error:", e)
    exit(1)

# 2. Approve Parent
approve_url = f"{base_url}/api/parents/{parent_id}/status?status=APPROVED"
approve_req = urllib.request.Request(approve_url, headers={"Content-Type": "application/json"}, method="PUT")

try:
    with urllib.request.urlopen(approve_req, context=context) as response:
        print("Parent Approval Status:", response.getcode())
except urllib.error.HTTPError as e:
    print("Parent Approval HTTP Error:", e.code)
    print("Body:", e.read().decode())
    exit(1)
except Exception as e:
    print("Parent Approval Error:", e)
    exit(1)

# 3. Test Parent Login
login_url = f"{base_url}/api/auth/parent/login"
login_payload = {
    "email": "acrylicparent@gmail.com",
    "password": "password123"
}
login_data = json.dumps(login_payload).encode("utf-8")
login_req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(login_req, context=context) as response:
        print("Parent Login Status:", response.getcode())
        print("Parent Login Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("Parent Login HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Parent Login Error:", e)
