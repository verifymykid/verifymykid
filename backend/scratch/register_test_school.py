import urllib.request
import json
import ssl

url = "https://168-231-112-221.sslip.io/api/auth/school/register"
payload = {
    "name": "Acrylic Digital Academy",
    "email": "acrylicboxdigital@gmail.com",
    "password": "password123",
    "phone": "+2348123456789",
    "address": "Lagos, Nigeria",
    "type": "PRIVATE"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
context = ssl._create_unverified_context()

try:
    with urllib.request.urlopen(req, context=context) as response:
        print("Status Code:", response.getcode())
        print("Response:", json.loads(response.read().decode()))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
