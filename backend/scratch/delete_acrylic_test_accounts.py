import urllib.request
import ssl

school_id = "SCH-055B"
base_url = "https://168-231-112-221.sslip.io"
context = ssl._create_unverified_context()

def delete_req(url):
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req, context=context) as response:
            print(f"DELETED {url} -> Status:", response.getcode())
    except Exception as e:
        print(f"FAILED to delete {url}:", e)

# 1. Delete parent PAR-3131
delete_req(f"{base_url}/api/parents/PAR-3131")

# 2. Delete guardian GDN-110
delete_req(f"{base_url}/api/guardians/GDN-110")

# 3. Delete school SCH-055B
delete_req(f"{base_url}/api/schools/{school_id}")
