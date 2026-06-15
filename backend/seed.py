import json
from database import engine, SessionLocal, Base
import models
from security import get_password_hash

def seed_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if database is already seeded
        if db.query(models.School).first() is not None:
            print("Database already seeded.")
            return

        print("Seeding database default accounts...")

        # 1. Seed Schools
        schools = [
            models.School(
                id="SCH-8821",
                name="Greenwood Academy",
                address="Plot 14, Victoria Island, Lagos, Nigeria",
                phone="+234 1 555 0192",
                email="admin@greenwood.edu",
                password=get_password_hash("password123"),
                website="www.greenwood.edu",
                type="Primary",
                verifiedEmail=True,
                status="APPROVED",
                registeredAt="2026-05-10T08:00:00Z",
                subscriptionStatus="ACTIVE",
                subscriptionExpires="2026-12-31",
                masterQrDownloadCount=0,
                masterQrUnlocked=False,
                masterQrMaxLocations=1,
                masterQrLocations=[],
                masterQrRequests=[]
            ),
            models.School(
                id="SCH-3312",
                name="Oakwood STEM High School",
                address="Plot 25, Ikeja GRA, Lagos, Nigeria",
                phone="+234 1 555 9831",
                email="info@oakwoodstem.org",
                password=get_password_hash("password123"),
                website="www.oakwoodstem.org",
                type="Secondary",
                verifiedEmail=True,
                status="PENDING APPROVAL",
                registeredAt="2026-06-11T14:30:00Z",
                subscriptionStatus="PENDING",
                subscriptionExpires="2026-09-30",
                masterQrDownloadCount=0,
                masterQrUnlocked=False,
                masterQrMaxLocations=1,
                masterQrLocations=[],
                masterQrRequests=[]
            )
        ]
        
        for s in schools:
            db.add(s)
        
        # 2. Seed Parents
        parents = [
            models.Parent(
                id="PAR-4482",
                name="Sarah Jenkins",
                email="sarah.j@gmail.com",
                phone="+234 803 555 0439",
                address="Block B2, Ikoyi Towers, Lagos",
                password=get_password_hash("password123"),
                profilePic="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
                hasUploadedPic=True,
                schoolId="SCH-8821",
                singleParent=False,
                spouseName="Michael Jenkins",
                spousePhone="+234 802 555 0440",
                spouseProfilePic="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                status="APPROVED",
                lat=6.4312,
                lng=3.4190,
                online=False
            ),
            models.Parent(
                id="PAR-1093",
                name="David Carter",
                email="david.carter@outlook.com",
                phone="+234 812 555 7721",
                address="14 Admiralty Way, Lekki Phase 1, Lagos",
                password=get_password_hash("password123"),
                profilePic="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
                hasUploadedPic=True,
                schoolId="SCH-8821",
                singleParent=True,
                spouseName="",
                spousePhone="",
                spouseProfilePic="",
                status="APPROVED",
                lat=6.4402,
                lng=3.4312,
                online=False
            )
        ]
        
        for p in parents:
            db.add(p)
            
        # Flush to generate parents before seeding children/authorizations
        db.commit()

        # 3. Seed Children
        children = [
            models.Child(parentId="PAR-4482", name="Emma Jenkins", age=7),
            models.Child(parentId="PAR-4482", name="Leo Jenkins", age=9),
            models.Child(parentId="PAR-1093", name="Chloe Carter", age=6)
        ]
        
        for c in children:
            db.add(c)

        # 4. Seed Temporary pickup authorizations
        auths = [
            models.TemporaryAuthorization(
                id="TA-901",
                parentId="PAR-1093",
                name="Grandma Helen",
                phone="+234 815 555 2231",
                type="One-Time",
                status="Active",
                code="582914",
                createdAt="2026-06-12T09:00:00Z"
            )
        ]
        for a in auths:
            db.add(a)

        # 5. Seed Guardians
        guardians = [
            models.Guardian(
                id="GDN-501",
                name="Robert Vance",
                email="robert@greenwood.edu",
                phone="+234 809 555 9012",
                password=get_password_hash("password123"),
                profilePic="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                busNumber="Bus 12A",
                driverName="Robert Vance",
                plateNumber="LA-992-KID",
                assignedRoute="Route A: Lekki to School",
                schoolId="SCH-8821",
                online=False,
                status="ACTIVE",
                lat=6.435010,
                lng=3.415020,
                lastLocationUpdated="2026-06-12T07:45:00Z"
            ),
            models.Guardian(
                id="GDN-502",
                name="Elena Rostova",
                email="elena@greenwood.edu",
                phone="+234 805 555 1104",
                password=get_password_hash("password123"),
                profilePic="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                busNumber="Bus 08B",
                driverName="John Rostova",
                plateNumber="LA-112-KID",
                assignedRoute="Route B: Ikoyi to School",
                schoolId="SCH-8821",
                online=False,
                status="ACTIVE",
                lat=6.442030,
                lng=3.435040,
                lastLocationUpdated="2026-06-12T07:48:00Z"
            )
        ]
        
        for g in guardians:
            db.add(g)

        # 6. Seed Pickup Logs
        logs = [
            models.PickupLog(
                id="LOG-3001",
                type="Morning Pickup",
                timestamp="2026-06-12T07:45:12Z",
                schoolId="SCH-8821",
                parentName="Sarah Jenkins",
                childName="Emma Jenkins",
                guardianName="Robert Vance",
                status="VERIFIED",
                gps="6.4312, 3.4190",
                device="iPhone 14 (iOS)",
                details="Verified via dynamic QR scan"
            ),
            models.PickupLog(
                id="LOG-3002",
                type="Morning Pickup",
                timestamp="2026-06-12T07:48:33Z",
                schoolId="SCH-8821",
                parentName="Sarah Jenkins",
                childName="Leo Jenkins",
                guardianName="Robert Vance",
                status="VERIFIED",
                gps="6.4312, 3.4190",
                device="iPhone 14 (iOS)",
                details="Verified via dynamic QR scan"
            )
        ]
        
        for l in logs:
            db.add(l)

        # 7. Seed SMTP log defaults
        smtp = models.SmtpLog(
            timestamp="2026-06-12T07:45:00Z",
            text="Initial system SMTP mailer online check. Status: OK"
        )
        db.add(smtp)

        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
