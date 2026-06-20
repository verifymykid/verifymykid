import urllib.request
import json
import sys

API_KEY = "rnd_kOFyoVFXWcCqVGLX85kJLlGJC73t"
OWNER_ID = "tea-d8ntilcvikkc73da9c70"
REPO_URL = "https://github.com/verifymykid/verifymykid"

def make_request(url, method="GET", payload=None):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    data = None
    if payload:
        data = json.dumps(payload).encode("utf-8")
        
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {e.reason}")
        print("Details:", error_body)
        raise e

def run_deployment():
    print("Step 1: Creating Static Site on Render...")
    service_payload = {
        "type": "static_site",
        "name": "verifymykid-web",
        "ownerId": OWNER_ID,
        "repo": REPO_URL,
        "branch": "main",
        "autoDeploy": "yes",
        "staticSiteDetails": {
            "buildCommand": "npm run build",
            "publishDir": "dist"
        },
        "envVars": [
            {
                "key": "VITE_API_BASE_URL",
                "value": "http://YOUR_VPS_IP:8000"
            }
        ]
    }
    
    try:
        service = make_request("https://api.render.com/v1/services", method="POST", payload=service_payload)
        print("API Response:", service)
        service_id = service["id"]
        deploy_url = service["url"]
        print(f"-> SUCCESS: Created Render Static Site! ID: {service_id}")
        print(f"-> Production URL: {deploy_url}")
        
        print("\nStep 2: Configuring React Router URL rewrite rule...")
        route_payload = {
            "type": "rewrite",
            "source": "/*",
            "destination": "/index.html"
        }
        route = make_request(f"https://api.render.com/v1/services/{service_id}/routes", method="POST", payload=route_payload)
        print("-> SUCCESS: Configured rewrite rule (/* -> /index.html) successfully.")
        
        print("\n======================================================================")
        print("RENDER AUTOMATED FRONTEND DEPLOYMENT COMPLETE!")
        print("======================================================================")
        print(f"Service ID: {service_id}")
        print(f"App URL:    {deploy_url}")
        print("Build:      Render is now building your site. View progress in dashboard.")
        
    except Exception as e:
        print("Deployment setup failed:", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_deployment()
