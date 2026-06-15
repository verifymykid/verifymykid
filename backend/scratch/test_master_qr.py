import sys
import os
import math
import uuid
from datetime import datetime

# Adjust path to import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
import models
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("Starting Master QR Scan integration tests...")
    db = SessionLocal()
    
    try:
        # Create test school
        school_id = f"SCH-TEST-{uuid.uuid4().hex[:4].upper()}"
        school = models.School(
            id=school_id,
            name="Test Verification Academy",
            address="Lagos, Nigeria",
            phone="+2345550192",
            email=f"admin-{school_id}@greenwood.edu",
            password="hashed_password",
            type="Primary",
            verifiedEmail=True,
            status="APPROVED",
            registeredAt=datetime.utcnow().isoformat(),
            subscriptionStatus="ACTIVE",
            subscriptionExpires="2026-12-31",
            masterQrDownloadCount=0,
            masterQrUnlocked=True,
            masterQrMaxLocations=1,
            masterQrLocations=[{"lat": 6.4312, "lng": 3.4190, "timestamp": datetime.utcnow().isoformat()}],
            masterQrRequests=[]
        )
        db.add(school)
        
        # Create test bus guardian
        guardian_id = f"GDN-{uuid.uuid4().hex[:4].upper()}"
        guardian = models.Guardian(
            id=guardian_id,
            name="Test Guardian Joe",
            email=f"joe-{guardian_id}@verifymykid.com",
            phone="+2348035550439",
            password="hashed_password",
            busNumber="BUS-99",
            driverName="Driver Joe",
            plateNumber="LAG-99-ABC",
            assignedRoute="Route A",
            schoolId=school_id,
            online=True,
            status="ACTIVE",
            lat=6.4312,
            lng=3.4190
        )
        db.add(guardian)
        
        # Create approved parent
        parent_id = f"PAR-{uuid.uuid4().hex[:4].upper()}"
        parent = models.Parent(
            id=parent_id,
            name="Sarah Parent",
            email=f"parent-{parent_id}@gmail.com",
            phone="+2348035550439",
            address="Lekki, Lagos",
            password="hashed_password",
            schoolId=school_id,
            status="APPROVED",
            lat=6.4312,
            lng=3.4190,
            online=False
        )
        db.add(parent)
        
        db.commit()
        print(f"Seeded test school {school_id}, guardian {guardian_id}, parent {parent_id}")
        
        # Test 1: Scan with out-of-bounds coordinates (Error)
        print("Test 1: Scanning with spoofed coordinates (out-of-bounds)...")
        payload = {"lat": 6.9999, "lng": 3.9999}
        response = client.post(f"/api/guardians/{guardian_id}/scan-master-qr", json=payload)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        print("Test 1 Response:", data)
        assert data["status"] == "ERROR", f"Expected ERROR, got {data['status']}"
        assert "LOCATION MISMATCH" in data["message"]
        
        # Check system log for security violation
        violation_log = db.query(models.SystemLog).filter(
            models.SystemLog.schoolId == school_id,
            models.SystemLog.type == "Security Violation"
        ).first()
        assert violation_log is not None, "Security violation log not found in database!"
        print("Success: Security violation logged correctly:", violation_log.details)
        
        # Test 2: Scan with correct coordinates (Arrival)
        print("Test 2: Scanning with correct coordinates (expected Arrival)...")
        payload = {"lat": 6.4312, "lng": 3.4190}
        response = client.post(f"/api/guardians/{guardian_id}/scan-master-qr", json=payload)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        print("Test 2 Response:", data)
        assert data["status"] == "VERIFIED", f"Expected VERIFIED, got {data['status']}"
        assert data["type"] == "Arrival"
        
        # Check system log for successful Arrival
        arrival_log = db.query(models.SystemLog).filter(
            models.SystemLog.schoolId == school_id,
            models.SystemLog.type == "Arrival"
        ).first()
        assert arrival_log is not None, "Arrival log not found in database!"
        print("Success: Arrival registered correctly:", arrival_log.details)
        
        # Check SmtpLog for email notification sent to parent
        arrival_email = db.query(models.SmtpLog).filter(
            models.SmtpLog.text.like(f"%EMAIL TO: {parent.email}%"),
            models.SmtpLog.text.like("%safely arrived%")
        ).first()
        assert arrival_email is not None, "Arrival email not found in SMTP logs!"
        print("Success: Arrival email registered correctly:", arrival_email.text)
        
        # Test 3: Scan again with correct coordinates (expected Departure)
        print("Test 3: Scanning with correct coordinates again (expected Departure)...")
        response = client.post(f"/api/guardians/{guardian_id}/scan-master-qr", json=payload)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        print("Test 3 Response:", data)
        assert data["status"] == "VERIFIED", f"Expected VERIFIED, got {data['status']}"
        assert data["type"] == "Departure"
        
        # Check system log for successful Departure
        departure_log = db.query(models.SystemLog).filter(
            models.SystemLog.schoolId == school_id,
            models.SystemLog.type == "Departure"
        ).first()
        assert departure_log is not None, "Departure log not found in database!"
        print("Success: Departure registered correctly:", departure_log.details)
        
        # Check SmtpLog for departure email notification sent to parent
        departure_email = db.query(models.SmtpLog).filter(
            models.SmtpLog.text.like(f"%EMAIL TO: {parent.email}%"),
            models.SmtpLog.text.like("%departed from%")
        ).first()
        assert departure_email is not None, "Departure email not found in SMTP logs!"
        print("Success: Departure email registered correctly:", departure_email.text)
        
        # Cleanup
        db.delete(parent)
        db.delete(guardian)
        db.delete(school)
        db.commit()
        print("Cleanup completed.")
        print("All tests PASSED successfully!")
        
    except Exception as e:
        print(f"TEST RUN FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
