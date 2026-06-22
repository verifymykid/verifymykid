from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from database import engine, Base, get_db
import models
from security import get_password_hash, verify_password, create_access_token, decode_access_token
from pydantic import BaseModel, Field

# Initialize FastAPI application
app = FastAPI(title="VerifyMyKid Safety Backend", version="1.0.0")

# Setup CORS for Render and Local Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development; easily locked to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

# ==================== PYDANTIC SCHEMAS ====================
class LoginRequest(BaseModel):
    email: str
    password: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class SuperAdminForgotPasswordRequest(BaseModel):
    email: str

class SuperAdminResetPasswordRequest(BaseModel):
    code: str
    password: str

class GuardianLoginRequest(BaseModel):
    name: str
    password: str

class SchoolRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    type: Optional[str] = None

class SchoolUpdateRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    password: Optional[str] = None
    currentPassword: Optional[str] = None

class ParentSignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    password: str
    singleParent: bool
    spouseName: Optional[str] = ""
    spousePhone: Optional[str] = ""
    schoolId: str
    children: List[dict]

class ParentUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    singleParent: Optional[bool] = None
    spouseName: Optional[str] = None
    spousePhone: Optional[str] = None
    password: Optional[str] = None
    currentPassword: Optional[str] = None
    profilePic: Optional[str] = None
    hasUploadedPic: Optional[bool] = None
    spouseProfilePic: Optional[str] = None
    pendingSchoolId: Optional[str] = None
    schoolId: Optional[str] = None
    status: Optional[str] = None

class TempAuthRequest(BaseModel):
    name: str
    phone: str
    type: str

class GuardianCreateRequest(BaseModel):
    name: str
    phone: str
    busNumber: str
    driverName: str
    plateNumber: str
    assignedRoute: str
    password: str
    profilePic: Optional[str] = ""


class PanicRequest(BaseModel):
    guardianId: str
    type: str
    note: Optional[str] = ""

class VerifyPickupRequest(BaseModel):
    parentId: str
    guardianId: str
    enteredCode: str
    isMorning: bool
    scannedGps: Optional[str] = None

class ContactRequest(BaseModel):
    name: str
    schoolName: str
    phone: str
    email: str
    message: str

class NotificationRequest(BaseModel):
    senderId: Optional[str] = None
    senderName: Optional[str] = None
    recipientId: str
    subject: str
    message: str

class SessionRequest(BaseModel):
    userId: str
    role: str
    deviceName: str
    ipAddress: str

class SmtpLogRequest(BaseModel):
    text: str

class QrRegisterRequest(BaseModel):
    lat: float
    lng: float

class MasterQrScanRequest(BaseModel):
    lat: float
    lng: float

class VerifyOtpRequest(BaseModel):
    code: str

class ParentForgotPasswordRequest(BaseModel):
    email: str

class ParentResetPasswordRequest(BaseModel):
    email: str
    code: str
    password: str


# ==================== MAIN APIS ====================
def send_real_email(to_email: str, subject: str, message_body: str):
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port_str = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "False").lower() in ("true", "1", "yes")
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")
    
    if not smtp_host or not smtp_username:
        print(f"WARNING: SMTP credentials not set! Simulated email to {to_email}: {message_body}")
        return False
        
    try:
        smtp_port = int(smtp_port_str)
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(message_body, 'plain'))
        
        if smtp_use_ssl:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port)
            if smtp_use_tls:
                server.starttls()
                
        if smtp_password:
            server.login(smtp_username, smtp_password)
            
        server.sendmail(smtp_username, to_email, msg.as_string())
        server.quit()
        print(f"SUCCESS: Real email sent to {to_email}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send real email to {to_email}: {e}")
        return False

def check_and_update_school_trial_status(school, db):
    if school and school.subscriptionStatus == "FREE_TRIAL" and school.trialExpiresAt:
        try:
            expiry = datetime.fromisoformat(school.trialExpiresAt)
            if expiry < datetime.utcnow():
                school.status = "SUSPENDED"
                school.subscriptionStatus = "SUSPENDED"
                db.commit()
        except Exception as e:
            print(f"Error checking trial expiration: {e}")

@app.get("/api/status")
def get_status():
    return {"status": "ONLINE", "server_time": datetime.utcnow().isoformat()}

# ----------------- AUTH ROUTER -----------------
@app.post("/api/auth/school/register")
def school_register(data: SchoolRegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if school email already exists
    existing = db.query(models.School).filter(func.lower(models.School.email) == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="School email address already registered.")
    
    school_id = f"SCH-{uuid.uuid4().hex[:4].upper()}"
    new_school = models.School(
        id=school_id,
        name=data.name.strip(),
        email=data.email.lower().strip(),
        password=get_password_hash(data.password),
        phone=data.phone.strip() if data.phone else None,
        address=data.address.strip() if data.address else None,
        website=data.website.strip() if data.website else None,
        type=data.type,
        verifiedEmail=False,
        status="PENDING APPROVAL",
        registeredAt=datetime.utcnow().isoformat(),
        subscriptionStatus="PENDING",
        subscriptionExpires=(datetime.utcnow() + timedelta(days=180)).isoformat().split('T')[0], # 1 term
        masterQrDownloadCount=0,
        masterQrUnlocked=False,
        masterQrMaxLocations=1,
        masterQrLocations=[],
        masterQrRequests=[]
    )
    
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    
    # Generate 6-digit verification code
    otp_code = str(uuid.uuid4().int)[:6]
    
    # Store in SystemSettings
    db.add(models.SystemSettings(key=f"school_otp_{new_school.id}", value=otp_code))
    db.commit()
    
    # Send live actual OTP
    subject = "VerifyMyKid - School Verification OTP"
    body = f"Hello {new_school.name},\n\nThank you for registering on VerifyMyKid. Your 6-digit email verification OTP code is: {otp_code}\n\nPlease enter this code to verify your account."
    background_tasks.add_task(send_real_email, new_school.email, subject, body)
    
    # Log in SMTP logs
    log_text = f"EMAIL TO: {new_school.email} | SUBJECT: {subject} | MESSAGE: {body}"
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=log_text))
    
    # Log in System logs
    db.add(models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type="School Verification OTP Sent",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=new_school.id,
        parentName="N/A",
        gps="N/A",
        device="Security Server Gate",
        details=f"Verification OTP code sent to registered school email: {new_school.email}."
    ))
    db.commit()
    
    return {
        "id": new_school.id,
        "name": new_school.name,
        "email": new_school.email,
        "status": new_school.status
    }

@app.post("/api/auth/school/login")
def school_login(data: LoginRequest, db: Session = Depends(get_db)):
    school = db.query(models.School).filter(func.lower(models.School.email) == data.email.lower()).first()
    if not school:
        raise HTTPException(status_code=404, detail="Unrecognized school email or password.")
    
    check_and_update_school_trial_status(school, db)
    
    is_valid = verify_password(data.password, school.password)
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Unrecognized school email or password.")
        
    if school.status != "APPROVED":
        raise HTTPException(status_code=403, detail=f"Access Denied. Status is currently: {school.status}. Please approve via Super Admin.")
        
    token = create_access_token({"sub": school.id, "role": "SCHOOL_ADMIN"})
    
    if data.lat is not None and data.lng is not None:
        school.lat = data.lat
        school.lng = data.lng
        db.commit()
        
    return {"token": token, "role": "SCHOOL_ADMIN", "id": school.id, "name": school.name}


@app.post("/api/auth/parent/register")
def parent_register(data: ParentSignupRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(models.Parent).filter(func.lower(models.Parent.email) == data.email.lower()).first()
    if existing:
        if existing.status == "DELETED":
            # Physically delete the deleted parent to release email and child records
            db.delete(existing)
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Parent email address already registered.")
        
    parent_id = f"PAR-{uuid.uuid4().hex[:4].upper()}"
    new_parent = models.Parent(
        id=parent_id,
        name=data.name.strip(),
        email=data.email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        address=data.address.strip() if data.address else None,
        password=get_password_hash(data.password),
        schoolId=data.schoolId,
        singleParent=data.singleParent,
        spouseName=data.spouseName,
        spousePhone=data.spousePhone,
        status="PENDING_VERIFICATION",
        lat=6.425,
        lng=3.415,
        online=False
    )
    db.add(new_parent)
    db.commit()
    
    # Save children
    for child in data.children:
        if child.get("name"):
            new_child = models.Child(
                parentId=parent_id,
                name=child.get("name"),
                age=int(child.get("age")) if child.get("age") else None
            )
            db.add(new_child)
            
    # Generate 6-digit verification code
    otp_code = str(uuid.uuid4().int)[:6]
    
    # Store in SystemSettings
    db.add(models.SystemSettings(key=f"parent_otp_{new_parent.id}", value=otp_code))
    db.commit()
    
    # Send live actual OTP
    subject = "VerifyMyKid - Parent Verification OTP"
    body = f"Hello {new_parent.name},\n\nThank you for registering on VerifyMyKid. Your 6-digit email verification OTP code is: {otp_code}\n\nPlease enter this code to verify your parent account."
    background_tasks.add_task(send_real_email, new_parent.email, subject, body)
    
    # Log in SMTP logs
    log_text = f"EMAIL TO: {new_parent.email} | SUBJECT: {subject} | MESSAGE: {body}"
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=log_text))
    
    # Save log of registration
    school = db.query(models.School).filter(models.School.id == new_parent.schoolId).first()
    school_name = school.name if school else "Unknown School"

    db_log = models.SystemLog(
        id=f"SLOG-{uuid.uuid4().hex[:4].upper()}",
        type="Parent Registered",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=new_parent.schoolId,
        parentName=new_parent.name,
        gps="N/A",
        device="Parent Registration Portal",
        details=f"Parent '{new_parent.name}' (ID: {new_parent.id}) registered and is pending email verification via OTP."
    )
    db.add(db_log)

    db.commit()
    db.refresh(new_parent)
    return {"id": new_parent.id, "name": new_parent.name}


@app.post("/api/auth/parent/login")
def parent_login(data: LoginRequest, db: Session = Depends(get_db)):
    parent = db.query(models.Parent).filter(func.lower(models.Parent.email) == data.email.lower()).first()
    if not parent:
        # Fallback to search by Unique ID as email input
        parent = db.query(models.Parent).filter(models.Parent.id == data.email.upper()).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Invalid Email/ID or Password.")

    is_valid = verify_password(data.password, parent.password)
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Email/ID or Password.")
        
    if parent.status == "PENDING_VERIFICATION":
        raise HTTPException(status_code=403, detail="Your parent account email is not verified. Please verify your email first via the OTP code sent to you.")
    if parent.status == "PENDING":
        raise HTTPException(status_code=403, detail="Your parent account is currently PENDING approval by the school administration.")
    if parent.status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Your parent account has been SUSPENDED. Please contact school admin.")
    if parent.status == "DELETED":
        raise HTTPException(status_code=403, detail="Your account has been deleted by school admin.")
        
    # Check if parent school is suspended
    school = db.query(models.School).filter(models.School.id == parent.schoolId).first()
    if school:
        check_and_update_school_trial_status(school, db)
    if school and (school.status == "SUSPENDED" or school.subscriptionStatus == "SUSPENDED"):
        raise HTTPException(status_code=403, detail="Your child's school subscription has been SUSPENDED. Please contact school admin.")
        
    token = create_access_token({"sub": parent.id, "role": "PARENT"})
    return {"token": token, "role": "PARENT", "id": parent.id, "name": parent.name, "schoolId": parent.schoolId}


@app.post("/api/auth/parent/forgot-password")
def parent_forgot_password(data: ParentForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    parent = db.query(models.Parent).filter(func.lower(models.Parent.email) == data.email.lower().strip()).first()
    if not parent:
        raise HTTPException(status_code=404, detail="No parent account found with this email address.")
        
    code = str(uuid.uuid4().int)[:6]
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"parent_forgot_otp_{parent.id}").first()
    if stored_otp:
        stored_otp.value = code
    else:
        db.add(models.SystemSettings(key=f"parent_forgot_otp_{parent.id}", value=code))
    db.commit()
    
    subject = "VerifyMyKid - Parent Password Recovery OTP"
    body = f"Hello {parent.name},\n\nYour secure 6-digit password recovery reset code is: {code}\n\nIf you did not request this, please ignore this email."
    background_tasks.add_task(send_real_email, parent.email, subject, body)
    
    # Log in SMTP logs
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=f"EMAIL TO: {parent.email} | SUBJECT: {subject} | MESSAGE: {body}"))
    db.commit()
    return {"message": "Reset code sent to email."}

@app.post("/api/auth/parent/reset-password")
def parent_reset_password(data: ParentResetPasswordRequest, db: Session = Depends(get_db)):
    parent = db.query(models.Parent).filter(func.lower(models.Parent.email) == data.email.lower().strip()).first()
    if not parent:
        raise HTTPException(status_code=404, detail="No parent account found with this email address.")
        
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"parent_forgot_otp_{parent.id}").first()
    if not stored_otp or stored_otp.value != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    parent.password = get_password_hash(data.password)
    db.delete(stored_otp)
    db.commit()
    return {"message": "Password updated successfully."}


@app.post("/api/auth/guardian/login")
def guardian_login(data: GuardianLoginRequest, db: Session = Depends(get_db)):
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.name) == data.name.lower().strip()).first()
    if not g:
        g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == data.name.lower().strip()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Invalid Bus Guardian name or password.")

        
    is_valid = verify_password(data.password, g.password)
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Bus Guardian credentials.")
        
    if g.status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Your bus guardian account has been suspended by the school administrator.")
        
    # Check if school is suspended
    school = db.query(models.School).filter(models.School.id == g.schoolId).first()
    if school:
        check_and_update_school_trial_status(school, db)
    if school and (school.status == "SUSPENDED" or school.subscriptionStatus == "SUSPENDED"):
        raise HTTPException(status_code=403, detail="Your school's account is suspended. Contact school administration.")
        
    token = create_access_token({"sub": g.id, "role": "BUS_GUARDIAN"})
    return {"token": token, "role": "BUS_GUARDIAN", "id": g.id, "name": g.name, "schoolId": g.schoolId}

@app.post("/api/auth/superadmin/login")
def super_admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    if data.email.lower() != "admin@verifymykid.com":
        raise HTTPException(status_code=400, detail="Invalid super administrator credentials.")
        
    stored_password = db.query(models.SystemSettings).filter(models.SystemSettings.key == "super_admin_password").first()
    
    is_valid = False
    if not stored_password:
        if data.password == "admin123":
            is_valid = True
    else:
        if verify_password(data.password, stored_password.value):
            is_valid = True
            
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid super administrator credentials.")
        
    token = create_access_token({"sub": "SUPER_ADMIN", "role": "SUPER_ADMIN"})
    return {"token": token, "role": "SUPER_ADMIN", "id": "SUPER_ADMIN", "name": "Global Super Administrator"}

@app.post("/api/auth/superadmin/forgot-password")
def super_admin_forgot_password(data: SuperAdminForgotPasswordRequest, db: Session = Depends(get_db)):
    if data.email.lower() != "admin@verifymykid.com":
        raise HTTPException(status_code=400, detail="Invalid email address.")
        
    # Generate 6 digit reset code
    reset_code = str(uuid.uuid4().int)[:6]
    
    # Save code in database
    existing_code = db.query(models.SystemSettings).filter(models.SystemSettings.key == "super_admin_reset_code").first()
    if existing_code:
        existing_code.value = reset_code
    else:
        db.add(models.SystemSettings(key="super_admin_reset_code", value=reset_code))
        
    db.commit()
    
    # Simulate SMTP email dispatch
    log_text = f"EMAIL TO: admin@verifymykid.com | SUBJECT: VerifyMyKid Super Admin Password Reset | MESSAGE: Your secure 6-digit password reset code is: {reset_code}"
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=log_text))
    
    # Log in system logs as well
    db.add(models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type="Super Admin Password Reset Code Requested",
        timestamp=datetime.utcnow().isoformat(),
        schoolId="N/A",
        parentName="N/A",
        gps="N/A",
        device="Security Server Gate",
        details="Super Admin requested a password reset code. Simulated email dispatched."
    ))
    db.commit()
    
    return {"message": "Reset code generated and simulated via email."}

@app.post("/api/auth/superadmin/reset-password")
def super_admin_reset_password(data: SuperAdminResetPasswordRequest, db: Session = Depends(get_db)):
    stored_code = db.query(models.SystemSettings).filter(models.SystemSettings.key == "super_admin_reset_code").first()
    if not stored_code or stored_code.value != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid reset code.")
        
    hashed_pass = get_password_hash(data.password)
    stored_password = db.query(models.SystemSettings).filter(models.SystemSettings.key == "super_admin_password").first()
    if stored_password:
        stored_password.value = hashed_pass
    else:
        db.add(models.SystemSettings(key="super_admin_password", value=hashed_pass))
        
    # Remove reset code
    db.delete(stored_code)
    
    db.commit()
    
    # Log in system logs
    db.add(models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type="Super Admin Password Reset Complete",
        timestamp=datetime.utcnow().isoformat(),
        schoolId="N/A",
        parentName="N/A",
        gps="N/A",
        device="Security Server Gate",
        details="Super Admin successfully completed password reset via reset code."
    ))
    db.commit()
    
    return {"message": "Password updated successfully."}


# ----------------- SCHOOLS ROUTER -----------------
@app.get("/api/schools")
def list_schools(db: Session = Depends(get_db)):
    schools = db.query(models.School).all()
    for s in schools:
        check_and_update_school_trial_status(s, db)
    return db.query(models.School).all()

@app.get("/api/schools/{school_id}")
def get_school(school_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    check_and_update_school_trial_status(s, db)
    return s

@app.put("/api/schools/{school_id}")
def update_school(school_id: str, data: SchoolUpdateRequest, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.name = data.name
    s.phone = data.phone
    s.address = data.address
    s.website = data.website
    if data.password:
        if not data.currentPassword or not verify_password(data.currentPassword, s.password):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
        s.password = get_password_hash(data.password)
    db.commit()
    db.refresh(s)
    return s

@app.post("/api/schools/{school_id}/verify-otp")
def verify_school_otp(school_id: str, data: VerifyOtpRequest, db: Session = Depends(get_db)):
    # Check OTP code
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"school_otp_{school_id}").first()
    if not stored_otp or stored_otp.value != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check your email and try again.")
        
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    s.verifiedEmail = True
    s.status = "PENDING APPROVAL"
    
    # Clean up OTP
    db.delete(stored_otp)
    
    # Log in system logs
    db.add(models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type="School Email Verified",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=school_id,
        parentName="N/A",
        gps="N/A",
        device="Security Server Gate",
        details="School email verified successfully via OTP code. Status set to PENDING APPROVAL."
    ))
    db.commit()
    return {"message": "OTP verified successfully. Status changed to PENDING APPROVAL."}

@app.post("/api/schools/{school_id}/resend-otp")
def resend_school_otp(school_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    code = str(uuid.uuid4().int)[:6]
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"school_otp_{school_id}").first()
    if stored_otp:
        stored_otp.value = code
    else:
        db.add(models.SystemSettings(key=f"school_otp_{school_id}", value=code))
    db.commit()
    
    subject = "VerifyMyKid - School Registration OTP"
    body = f"Hello {s.name},\n\nYour 6-digit school verification OTP code is: {code}\n\nPlease enter this code to verify your school's email."
    background_tasks.add_task(send_real_email, s.email, subject, body)
    
    # Log in SMTP logs
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=f"EMAIL TO: {s.email} | SUBJECT: {subject} | MESSAGE: {body}"))
    db.commit()
    return {"message": "OTP resent successfully."}

@app.post("/api/schools/{school_id}/pay")
def pay_school_licenses(school_id: str, amount: float, children: int, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    s.subscriptionStatus = "ACTIVE"
    s.status = "APPROVED"
    # Renew by 90 days (1 term in Nigeria)
    s.subscriptionExpires = (datetime.utcnow() + timedelta(days=90)).isoformat().split('T')[0]
    
    # Save PaymentRecord
    record = models.PaymentRecord(
        id=f"TXN-{uuid.uuid4().hex[:6].upper()}",
        schoolId=school_id,
        amount=amount,
        childrenCount=children,
        status="PAID",
        timestamp=datetime.utcnow().isoformat(),
        details=f"Paid for {children} student licenses."
    )
    db.add(record)
    db.commit()
    return {"message": "Payment verified. Subscription status updated.", "subscriptionExpires": s.subscriptionExpires}

@app.post("/api/schools/{school_id}/qr-lock")
def request_qr_lock(school_id: str, location_name: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    reqs = list(s.masterQrRequests) if s.masterQrRequests else []
    reqs.append({
        "id": f"QR-REQ-{uuid.uuid4().hex[:4].upper()}",
        "location": location_name,
        "status": "PENDING",
        "timestamp": datetime.utcnow().isoformat()
    })
    s.masterQrRequests = reqs
    db.commit()
    return {
        "id": s.id,
        "name": s.name,
        "masterQrRequests": reqs,
        "masterQrUnlocked": s.masterQrUnlocked,
        "masterQrMaxLocations": s.masterQrMaxLocations,
        "masterQrLocations": s.masterQrLocations
    }

@app.post("/api/schools/{school_id}/qr-register")
def register_qr_location(school_id: str, coords: QrRegisterRequest, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    locs = list(s.masterQrLocations) if s.masterQrLocations else []
    if len(locs) >= (s.masterQrMaxLocations or 1) and not s.masterQrUnlocked:
         raise HTTPException(
             status_code=400, 
             detail="QR code printing/registration is locked. You must request unlock permission from the Super Admin first."
         )
         
    locs.append({"lat": coords.lat, "lng": coords.lng, "timestamp": datetime.utcnow().isoformat()})
    s.masterQrLocations = locs
    s.masterQrUnlocked = False  # Reset unlock permission
    s.masterQrDownloadCount = (s.masterQrDownloadCount or 0) + 1
    db.commit()
    return {
        "id": s.id,
        "name": s.name,
        "masterQrRequests": s.masterQrRequests,
        "masterQrUnlocked": s.masterQrUnlocked,
        "masterQrMaxLocations": s.masterQrMaxLocations,
        "masterQrLocations": locs
    }


# ----------------- PARENTS ROUTER -----------------
@app.get("/api/parents")
def list_parents(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Parent)
    if schoolId:
        query = query.filter(models.Parent.schoolId == schoolId)
    parents = query.all()
    results = []
    for p in parents:
        results.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "phone": p.phone,
            "address": p.address,
            "profilePic": p.profilePic,
            "hasUploadedPic": p.hasUploadedPic,
            "schoolId": p.schoolId,
            "pendingSchoolId": p.pendingSchoolId,
            "singleParent": p.singleParent,
            "spouseName": p.spouseName,
            "spousePhone": p.spousePhone,
            "spouseProfilePic": p.spouseProfilePic,
            "status": p.status,
            "lat": p.lat,
            "lng": p.lng,
            "online": p.online,
            "deletedBySchoolId": p.deletedBySchoolId,
            "deletedBySchoolName": p.deletedBySchoolName,
            "deleteReason": p.deleteReason,
            "deletedAt": p.deletedAt,
            "children": [{"name": c.name, "age": c.age} for c in p.children],
            "tempAuthorizations": [{"id": a.id, "name": a.name, "phone": a.phone, "type": a.type, "status": a.status, "code": a.code, "createdAt": a.createdAt} for a in p.authorizations]
        })
    return results

@app.get("/api/parents/{parent_id}")
def get_parent(parent_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent not found")
    # Load children
    children = db.query(models.Child).filter(models.Child.parentId == parent_id).all()
    auths = db.query(models.TemporaryAuthorization).filter(models.TemporaryAuthorization.parentId == parent_id).all()
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "phone": p.phone,
        "address": p.address,
        "profilePic": p.profilePic,
        "hasUploadedPic": p.hasUploadedPic,
        "schoolId": p.schoolId,
        "pendingSchoolId": p.pendingSchoolId,
        "singleParent": p.singleParent,
        "spouseName": p.spouseName,
        "spousePhone": p.spousePhone,
        "spouseProfilePic": p.spouseProfilePic,
        "status": p.status,
        "lat": p.lat,
        "lng": p.lng,
        "online": p.online,
        "deletedBySchoolId": p.deletedBySchoolId,
        "deletedBySchoolName": p.deletedBySchoolName,
        "deleteReason": p.deleteReason,
        "deletedAt": p.deletedAt,
        "children": [{"name": c.name, "age": c.age} for c in children],
        "tempAuthorizations": [{"id": a.id, "name": a.name, "phone": a.phone, "type": a.type, "status": a.status, "code": a.code, "createdAt": a.createdAt} for a in auths]
    }

@app.put("/api/parents/{parent_id}")
def update_parent(parent_id: str, data: ParentUpdateRequest, db: Session = Depends(get_db)):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent not found")
    if data.name is not None: p.name = data.name
    if data.email is not None: p.email = data.email
    if data.phone is not None: p.phone = data.phone
    if data.address is not None: p.address = data.address
    if data.singleParent is not None: p.singleParent = data.singleParent
    if data.spouseName is not None: p.spouseName = data.spouseName
    if data.spousePhone is not None: p.spousePhone = data.spousePhone
    if data.profilePic is not None: p.profilePic = data.profilePic
    if data.hasUploadedPic is not None: p.hasUploadedPic = data.hasUploadedPic
    if data.spouseProfilePic is not None: p.spouseProfilePic = data.spouseProfilePic
    if data.password:
        if not data.currentPassword or not verify_password(data.currentPassword, p.password):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
        p.password = get_password_hash(data.password)
    if "pendingSchoolId" in data.dict(exclude_unset=True):
        p.pendingSchoolId = data.pendingSchoolId
    if data.schoolId is not None:
        p.schoolId = data.schoolId
    if data.status is not None:
        p.status = data.status
    db.commit()
    db.refresh(p)
    return p

@app.put("/api/parents/{parent_id}/status")
def update_parent_status(
    parent_id: str, 
    status: str, 
    deletedBySchoolId: Optional[str] = None, 
    deletedBySchoolName: Optional[str] = None, 
    deleteReason: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent not found")
    p.status = status
    if status == "DELETED":
        p.deletedBySchoolId = deletedBySchoolId
        p.deletedBySchoolName = deletedBySchoolName
        p.deleteReason = deleteReason
        p.deletedAt = datetime.utcnow().isoformat()
    db.commit()
    return p

@app.post("/api/parents/{parent_id}/verify-otp")
def verify_parent_otp(parent_id: str, data: VerifyOtpRequest, db: Session = Depends(get_db)):
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"parent_otp_{parent_id}").first()
    if not stored_otp or stored_otp.value != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check your email and try again.")
        
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent profile not found")
        
    p.status = "PENDING"
    db.delete(stored_otp)
    
    # Log in system logs
    db.add(models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type="Parent Email Verified",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=p.schoolId,
        parentName=p.name,
        gps="N/A",
        device="Security Server Gate",
        details=f"Parent email verified successfully via OTP. Account status updated to PENDING (awaiting school admin approval)."
    ))
    db.commit()
    return {"message": "OTP verified successfully. Your profile is now awaiting school admin approval."}

@app.post("/api/parents/{parent_id}/resend-otp")
def resend_parent_otp(parent_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent profile not found")
        
    code = str(uuid.uuid4().int)[:6]
    stored_otp = db.query(models.SystemSettings).filter(models.SystemSettings.key == f"parent_otp_{parent_id}").first()
    if stored_otp:
        stored_otp.value = code
    else:
        db.add(models.SystemSettings(key=f"parent_otp_{parent_id}", value=code))
    db.commit()
    
    subject = "VerifyMyKid - Parent Verification OTP"
    body = f"Hello {p.name},\n\nYour new 6-digit email verification OTP code is: {code}\n\nPlease enter this code to verify your parent account."
    background_tasks.add_task(send_real_email, p.email, subject, body)
    
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=f"EMAIL TO: {p.email} | SUBJECT: {subject} | MESSAGE: {body}"))
    db.commit()
    return {"message": "Verification OTP code resent successfully to parent email."}

@app.put("/api/parents/{parent_id}/online")
def set_parent_online(parent_id: str, online: bool, lat: Optional[float] = None, lng: Optional[float] = None, db: Session = Depends(get_db)):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent not found")
    p.online = online
    if lat is not None: p.lat = lat
    if lng is not None: p.lng = lng
    db.commit()
    return p

@app.post("/api/parents/{parent_id}/temp-auth")
def add_temp_auth(parent_id: str, data: TempAuthRequest, db: Session = Depends(get_db)):
    p = db.query(models.Parent).filter(models.Parent.id == parent_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Parent not found")
        
    auth_id = f"TA-{uuid.uuid4().hex[:3].upper()}"
    new_auth = models.TemporaryAuthorization(
        id=auth_id,
        parentId=parent_id,
        name=data.name,
        phone=data.phone,
        type=data.type,
        status="Active",
        code=str(uuid.uuid4().int)[:6],
        createdAt=datetime.utcnow().isoformat()
    )
    db.add(new_auth)
    db.commit()
    db.refresh(new_auth)
    return new_auth


# ----------------- GUARDIANS ROUTER -----------------
@app.get("/api/guardians")
def list_guardians(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Guardian)
    if schoolId:
        query = query.filter(models.Guardian.schoolId == schoolId)
    return query.all()

@app.post("/api/guardians")
def create_guardian(schoolId: str, data: GuardianCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(models.Guardian).filter(func.lower(models.Guardian.name) == data.name.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Guardian name already registered.")
        
    school = db.query(models.School).filter(models.School.id == schoolId).first()
    school_lat = school.lat if (school and school.lat is not None) else 6.5244
    school_lng = school.lng if (school and school.lng is not None) else 3.3792

    g_id = f"GDN-{uuid.uuid4().hex[:3].upper()}"
    new_g = models.Guardian(
        id=g_id,
        name=data.name.strip(),
        email=f"{data.name.lower().strip().replace(' ', '')}@verifymykid.com",
        phone=data.phone.strip() if data.phone else None,
        password=get_password_hash(data.password.strip()),
        profilePic=data.profilePic if data.profilePic else "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        busNumber=data.busNumber,
        driverName=data.driverName,
        plateNumber=data.plateNumber,
        assignedRoute=data.assignedRoute,
        schoolId=schoolId,
        online=False,
        status="ACTIVE",
        lat=school_lat,
        lng=school_lng,
        lastLocationUpdated=datetime.utcnow().isoformat()
    )
    db.add(new_g)
    
    # Retrieve school details to log onboarding accurately
    school = db.query(models.School).filter(models.School.id == schoolId).first()
    school_name = school.name if school else "Unknown School"
    
    db_log = models.SystemLog(
        id=f"SLOG-{uuid.uuid4().hex[:4].upper()}",
        type="Bus Guardian Onboarded",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=schoolId,
        parentName="N/A",
        gps=f"{new_g.lat}, {new_g.lng}",
        device="School Admin Portal",
        details=f"Bus Guardian '{new_g.name}' (ID: {new_g.id}) was onboarded by school '{school_name}' (ID: {schoolId}). Route: {new_g.assignedRoute}, Plate: {new_g.plateNumber}."
    )
    db.add(db_log)
    
    db.commit()
    db.refresh(new_g)
    return new_g


@app.put("/api/guardians/{guardian_id}/status")
def update_guardian_status(guardian_id: str, status: str, db: Session = Depends(get_db)):
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == guardian_id.lower()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guardian not found")
    g.status = status
    db.commit()
    return g

@app.delete("/api/guardians/{guardian_id}")
def delete_guardian(guardian_id: str, db: Session = Depends(get_db)):
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == guardian_id.lower()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guardian not found")
    db.delete(g)
    db.commit()
    return {"message": "Guardian deleted successfully."}

@app.put("/api/guardians/{guardian_id}/online")
def set_guardian_online(guardian_id: str, online: bool, lat: Optional[float] = None, lng: Optional[float] = None, db: Session = Depends(get_db)):
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == guardian_id.lower()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guardian not found")
    g.online = online
    if lat is not None: g.lat = lat
    if lng is not None: g.lng = lng
    g.lastLocationUpdated = datetime.utcnow().isoformat()
    db.commit()
    return g


# ----------------- PANIC ALERTS ROUTER -----------------
@app.get("/api/alerts")
def list_alerts(db: Session = Depends(get_db)):
    return db.query(models.ActiveAlert).all()

@app.post("/api/alerts/panic")
def trigger_panic(data: PanicRequest, db: Session = Depends(get_db)):
    alert_id = f"ALT-{uuid.uuid4().hex[:4].upper()}"
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == data.guardianId.lower()).first()
    g_name = g.name if g else "Unknown Guardian"
    g_bus = g.busNumber if g else "Unknown Bus"
    school_id = g.schoolId if g else None
    
    alert = models.ActiveAlert(
        id=alert_id,
        guardianId=data.guardianId,
        guardianName=g_name,
        busNumber=g_bus,
        type=data.type,
        status="ACTIVE",
        timestamp=datetime.utcnow().isoformat(),
        note=data.note,
        schoolId=school_id,
        acknowledgedBySchoolAdmin=False
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@app.post("/api/alerts/{alert_id}/resolve")
def resolve_panic(alert_id: str, db: Session = Depends(get_db)):
    a = db.query(models.ActiveAlert).filter(models.ActiveAlert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.status = "RESOLVED"
    db.commit()
    return a

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_panic(alert_id: str, db: Session = Depends(get_db)):
    a = db.query(models.ActiveAlert).filter(models.ActiveAlert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.acknowledgedBySchoolAdmin = True
    db.commit()
    return a


# ----------------- NOTIFICATIONS ROUTER -----------------
@app.get("/api/notifications")
def list_notifications(recipientId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Notification)
    if recipientId:
        query = query.filter(models.Notification.recipientId == recipientId)
    return query.all()

@app.post("/api/notifications")
def create_notification(data: NotificationRequest, db: Session = Depends(get_db)):
    n_id = f"NTF-{uuid.uuid4().hex[:5].upper()}"
    new_n = models.Notification(
        id=n_id,
        senderId=data.senderId,
        senderName=data.senderName,
        recipientId=data.recipientId,
        subject=data.subject,
        message=data.message,
        isRead=False,
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(new_n)
    db.commit()
    db.refresh(new_n)
    return new_n

@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.isRead = True
    db.commit()
    return n


# ----------------- LOGS ROUTER -----------------
@app.get("/api/logs/pickups")
def list_pickup_logs(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.PickupLog)
    if schoolId:
        query = query.filter(models.PickupLog.schoolId == schoolId)
    return query.order_by(models.PickupLog.timestamp.desc()).all()

@app.post("/api/logs/pickups/verify")
def verify_pickup_event(data: VerifyPickupRequest, db: Session = Depends(get_db)):
    parent = db.query(models.Parent).filter(models.Parent.id == data.parentId).first()
    guardian = db.query(models.Guardian).filter(func.lower(func.trim(models.Guardian.id)) == data.guardianId.lower().strip()).first()
    
    if not parent or not guardian:
        raise HTTPException(status_code=404, detail="Parent or Bus Guardian credentials not found.")
        
    # Check if enteredCode corresponds to an active TemporaryAuthorization for the parent
    temp_auth = db.query(models.TemporaryAuthorization).filter(
        models.TemporaryAuthorization.parentId == parent.id,
        models.TemporaryAuthorization.code == data.enteredCode.strip(),
        models.TemporaryAuthorization.status == "Active"
    ).first()
    
    parent_display_name = parent.name
    details_str = "Student pickup confirmed by verified dynamic scan token."
    
    if temp_auth:
        is_expired = False
        if temp_auth.createdAt:
            try:
                created_dt = datetime.fromisoformat(temp_auth.createdAt)
                elapsed_seconds = (datetime.utcnow() - created_dt).total_seconds()
                if temp_auth.type == "Time Limited (Today)" and elapsed_seconds > 12 * 3600:
                    is_expired = True
                elif temp_auth.type == "Time Limited (2 Days)" and elapsed_seconds > 48 * 3600:
                    is_expired = True
            except Exception:
                pass
        
        if is_expired:
            temp_auth.status = "Expired"
            db.commit()
            raise HTTPException(status_code=400, detail="This temporary authorization code has expired.")
            
        # Invalidate the code (single-use)
        temp_auth.status = "Used"
        db.commit()
        
        # Override parent display name in logs to show the authorized person's name
        parent_display_name = f"{parent.name} (Auth: {temp_auth.name})"
        details_str = f"Pickup confirmed by authorized relative/driver: {temp_auth.name}."

    gps = data.scannedGps or f"{guardian.lat}, {guardian.lng}"
    
    children_names = ", ".join([c.name for c in parent.children]) if parent.children else "N/A"
    log_id = f"LOG-{uuid.uuid4().hex[:4].upper()}"
    new_log = models.PickupLog(
        id=log_id,
        type="Morning Pickup" if data.isMorning else "Afternoon Drop-Off",
        timestamp=datetime.utcnow().isoformat(),
        schoolId=guardian.schoolId,
        parentName=parent_display_name,
        childName=children_names,
        guardianName=guardian.name,
        status="VERIFIED",
        gps=gps,
        device="Parent Device" if data.isMorning else "Bus Guardian Terminal",
        details=details_str
    )
    db.add(new_log)
    db.commit()
    return {"status": "VERIFIED", "message": "Pickup scan verification succeeded.", "log": {
        "id": new_log.id,
        "type": new_log.type,
        "parentName": new_log.parentName,
        "childName": new_log.childName,
        "guardianName": new_log.guardianName,
        "gps": new_log.gps,
        "timestamp": new_log.timestamp
    }}

@app.get("/api/logs/system")
def list_system_logs(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.SystemLog)
    if schoolId:
        query = query.filter(models.SystemLog.schoolId == schoolId)
    return query.order_by(models.SystemLog.timestamp.desc()).all()

@app.post("/api/logs/system")
def create_system_log(type: str, details: str, schoolId: Optional[str] = None, parentName: Optional[str] = None, gps: Optional[str] = None, device: Optional[str] = None, db: Session = Depends(get_db)):
    log_id = f"SLOG-{uuid.uuid4().hex[:4].upper()}"
    new_log = models.SystemLog(
        id=log_id,
        type=type,
        timestamp=datetime.utcnow().isoformat(),
        schoolId=schoolId,
        parentName=parentName,
        gps=gps or "N/A",
        device=device or "Server Socket API",
        details=details
    )
    db.add(new_log)
    db.commit()
    return new_log

@app.post("/api/contact")
def send_contact_message(data: ContactRequest, db: Session = Depends(get_db)):
    subject = f"VerifyMyKid Enquiry from {data.schoolName}"
    message_body = (
        f"Name: {data.name}\n"
        f"School: {data.schoolName}\n"
        f"Phone: {data.phone}\n"
        f"Email: {data.email}\n\n"
        f"Message / Requirements:\n{data.message}"
    )
    send_real_email("verifymykid@gmail.com", subject, message_body)
    
    # Log in SMTP logs
    db.add(models.SmtpLog(
        timestamp=datetime.utcnow().isoformat(),
        text=f"CONTACT FORM INQUIRY: EMAIL TO: verifymykid@gmail.com | FROM: {data.email} | SUBJECT: {subject} | BODY: {message_body}"
    ))
    db.commit()
    return {"status": "success", "message": "Your message was sent successfully."}


# ----------------- SMTP LOGS ROUTER -----------------
@app.get("/api/smtp-logs")
def list_smtp_logs(db: Session = Depends(get_db)):
    return db.query(models.SmtpLog).order_by(models.SmtpLog.id.desc()).all()

@app.post("/api/smtp-logs")
def create_smtp_log(data: SmtpLogRequest, db: Session = Depends(get_db)):
    new_log = models.SmtpLog(
        timestamp=datetime.utcnow().isoformat(),
        text=data.text
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


# ----------------- SESSIONS ROUTER -----------------
@app.get("/api/sessions")
def list_sessions(db: Session = Depends(get_db)):
    return db.query(models.UserSession).all()

@app.post("/api/sessions")
def create_session(data: SessionRequest, db: Session = Depends(get_db)):
    s_id = f"SES-{uuid.uuid4().hex[:4].upper()}"
    new_sess = models.UserSession(
        id=s_id,
        userId=data.userId,
        role=data.role,
        deviceName=data.deviceName,
        ipAddress=data.ipAddress,
        loginTime=datetime.utcnow().isoformat(),
        status="ACTIVE"
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return new_sess

@app.post("/api/sessions/{session_id}/freeze")
def freeze_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.status = "SUSPENDED"
    db.commit()
    return s

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(s)
    db.commit()
    return {"message": "Session dissolved successfully."}


# ----------------- SUPER ADMIN ROUTER -----------------
@app.post("/api/superadmin/approve-school/{school_id}")
def approve_school(school_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.status = "APPROVED"
    s.subscriptionStatus = "FREE_TRIAL"
    s.trialType = "1_MONTH"
    # Expires in 30 days
    s.trialExpiresAt = (datetime.utcnow() + timedelta(days=30)).isoformat()
    
    # Send live actual confirmation email
    subject = "VerifyMyKid - School Account Approved!"
    body = (
        f"Hello {s.name},\n\n"
        "Congratulations! We are pleased to inform you that your registration on VerifyMyKid has been reviewed and approved by the Super Administrator.\n\n"
        "You now have full access to your school portal to register bus guardians, authorize parent accounts, configure routing, and download your Master QR attendance sheets.\n\n"
        "Welcome to VerifyMyKid!\n\n"
        "Best regards,\n"
        "The VerifyMyKid Team"
    )
    background_tasks.add_task(send_real_email, s.email, subject, body)
    
    # Log in SMTP logs
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=f"EMAIL TO: {s.email} | SUBJECT: {subject} | MESSAGE: {body}"))
    
    # Save in-app notification for the school admin
    db_notif = models.Notification(
        id=f"NOTIF-{uuid.uuid4().hex[:4].upper()}",
        senderId="SUPER_ADMIN",
        senderName="Super Admin",
        recipientId=s.id,
        subject="School Account Approved!",
        message=f"Congratulations! Your school account for '{s.name}' has been approved by the Super Administrator. Welcome to VerifyMyKid!",
        isRead=False,
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(db_notif)
    
    db.commit()
    return s

@app.post("/api/superadmin/reject-school/{school_id}")
def reject_school(school_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.status = "REJECTED"
    
    # Send live actual rejection email
    subject = "VerifyMyKid - School Account Registration Status"
    body = (
        f"Hello {s.name},\n\n"
        "Thank you for your interest in VerifyMyKid.\n\n"
        "We regret to inform you that your school registration request has been reviewed and rejected by the Super Administrator at this time.\n\n"
        "If you believe this was an error or would like to provide additional verification details, please contact our support team.\n\n"
        "Best regards,\n"
        "The VerifyMyKid Team"
    )
    background_tasks.add_task(send_real_email, s.email, subject, body)
    
    # Log in SMTP logs
    db.add(models.SmtpLog(timestamp=datetime.utcnow().isoformat(), text=f"EMAIL TO: {s.email} | SUBJECT: {subject} | MESSAGE: {body}"))
    
    db.commit()
    return s

@app.post("/api/superadmin/extend-school/{school_id}")
def extend_school(school_id: str, days: int, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
        
    s.status = "APPROVED"
    s.subscriptionStatus = "FREE_TRIAL"
    
    # If trial already expired, start from now, else add to existing expiration
    now = datetime.utcnow()
    current_expiry = datetime.fromisoformat(s.trialExpiresAt) if s.trialExpiresAt else now
    if current_expiry < now:
        s.trialExpiresAt = (now + timedelta(days=days)).isoformat()
    else:
        s.trialExpiresAt = (current_expiry + timedelta(days=days)).isoformat()
        
    db.commit()
    return s

@app.post("/api/superadmin/uplift-school/{school_id}")
def uplift_school(school_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.status = "APPROVED"
    s.subscriptionStatus = "ACTIVE"
    # Renew by 90 days (1 term)
    s.subscriptionExpires = (datetime.utcnow() + timedelta(days=90)).isoformat().split('T')[0]
    db.commit()
    return s

@app.post("/api/superadmin/approve-qr-request/{school_id}/{request_id}")
def approve_qr_request(school_id: str, request_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    reqs = list(s.masterQrRequests) if s.masterQrRequests else []
    found = False
    for req in reqs:
        if req.get("id") == request_id:
            req["status"] = "APPROVED"
            found = True
            break
    if found:
        s.masterQrRequests = reqs
        s.masterQrUnlocked = True
        s.masterQrMaxLocations = min(3, (s.masterQrMaxLocations or 1) + 1)
        db.commit()
    return s

@app.post("/api/superadmin/reject-qr-request/{school_id}/{request_id}")
def reject_qr_request(school_id: str, request_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    reqs = list(s.masterQrRequests) if s.masterQrRequests else []
    found = False
    for req in reqs:
        if req.get("id") == request_id:
            req["status"] = "REJECTED"
            found = True
            break
    if found:
        s.masterQrRequests = reqs
        db.commit()
    return s

@app.post("/api/schools/{school_id}/suspend")
def suspend_school(school_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.status = "SUSPENDED"
    s.subscriptionStatus = "SUSPENDED"
    db.commit()
    return s

@app.delete("/api/schools/{school_id}")
def delete_school(school_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Cascade delete related entries to preserve integrity
    db.query(models.Guardian).filter(models.Guardian.schoolId == school_id).delete()
    db.query(models.Parent).filter(models.Parent.schoolId == school_id).delete()
    db.query(models.SystemLog).filter(models.SystemLog.schoolId == school_id).delete()
    db.query(models.PickupLog).filter(models.PickupLog.schoolId == school_id).delete()
    db.query(models.ActiveAlert).filter(models.ActiveAlert.schoolId == school_id).delete()
    
    db.delete(s)
    db.commit()
    return {"message": "School deleted successfully."}


@app.post("/api/schools/{school_id}/trial-activate")
def activate_school_trial(school_id: str, db: Session = Depends(get_db)):
    s = db.query(models.School).filter(models.School.id == school_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="School not found")
    s.status = "APPROVED"
    s.subscriptionStatus = "FREE_TRIAL"
    s.trialExpiresAt = (datetime.utcnow() + timedelta(days=30)).isoformat()
    db.commit()
    return s

@app.post("/api/guardians/{guardian_id}/scan-master-qr")
def scan_master_qr(guardian_id: str, req: MasterQrScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    import math
    g = db.query(models.Guardian).filter(func.lower(models.Guardian.id) == guardian_id.lower()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guardian profile not found.")
        
    school = db.query(models.School).filter(models.School.id == g.schoolId).first()
    if not school:
        raise HTTPException(status_code=404, detail="School profile not found.")
        
    # Verify GPS coordinates against masterQrLocations (within 0.005 degrees, approx 500m)
    match = False
    locations = school.masterQrLocations or []
    for loc in locations:
        try:
            loc_lat = float(loc.get("lat"))
            loc_lng = float(loc.get("lng"))
            distance = math.sqrt((loc_lat - req.lat)**2 + (loc_lng - req.lng)**2)
            if distance < 0.005:
                match = True
                break
        except (ValueError, TypeError):
            continue
            
    if not match:
        # Log security violation
        violation_log = models.SystemLog(
            id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
            type="Security Violation",
            timestamp=datetime.utcnow().isoformat(),
            schoolId=school.id,
            parentName="N/A",
            gps=f"{req.lat}, {req.lng}",
            device=f"Guardian {g.id}",
            details=f"Master QR Scan blocked: coordinates ({req.lat}, {req.lng}) do not match registered print locations (spoofing attempt suspected)."
        )
        db.add(violation_log)
        db.commit()
        return {
            "status": "ERROR",
            "message": "LOCATION MISMATCH: Device coordinates do not match registered school locations."
        }
        
    # Calculate state (Arrival or Departure) based on today's logs for this guardian
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    last_log = db.query(models.SystemLog)\
        .filter(models.SystemLog.schoolId == school.id)\
        .filter(models.SystemLog.type.in_(["Arrival", "Departure"]))\
        .filter(models.SystemLog.device == f"Guardian {g.id}")\
        .filter(models.SystemLog.timestamp.like(f"{today_str}%"))\
        .order_by(models.SystemLog.timestamp.desc())\
        .first()
        
    if last_log and last_log.type == "Arrival":
        scan_type = "Departure"
    else:
        scan_type = "Arrival"
        
    # Log the successful scan in SystemLog
    success_log = models.SystemLog(
        id=f"SYSLOG-{uuid.uuid4().hex[:4].upper()}",
        type=scan_type,
        timestamp=datetime.utcnow().isoformat(),
        schoolId=school.id,
        parentName="N/A",
        gps=f"{req.lat}, {req.lng}",
        device=f"Guardian {g.id}",
        details=f"Bus Guardian {g.name} registered {scan_type} via Master QR."
    )
    db.add(success_log)
    
    # Query all approved parents of the school to send email notifications
    parents = db.query(models.Parent).filter(
        models.Parent.schoolId == school.id,
        models.Parent.status == "APPROVED"
    ).all()
    
    for p in parents:
        subject = f"School Bus Arrival - {school.name}" if scan_type == "Arrival" else f"School Bus Departure - {school.name}"
        body = (
            f"Dear {p.name},\n\n"
            f"We are pleased to inform you that the school bus has safely arrived at the school premises.\n\n"
            f"Best regards,\n"
            f"{school.name}"
        ) if scan_type == "Arrival" else (
            f"Dear {p.name},\n\n"
            f"We are writing to inform you that the school bus has departed from the school premises and is on its route.\n\n"
            f"Best regards,\n"
            f"{school.name}"
        )
        background_tasks.add_task(send_real_email, p.email, subject, body)
        # Log each email in the SmtpLog
        db.add(models.SmtpLog(
            timestamp=datetime.utcnow().isoformat(),
            text=f"EMAIL TO: {p.email} | SUBJECT: {subject} | MESSAGE: {body}"
        ))
        
    db.commit()
    
    return {
        "status": "VERIFIED",
        "type": scan_type,
        "message": f"SUCCESS: Master QR scan verified as {scan_type}. Notifications sent to parents."
    }


@app.get("/api/sync")
def global_sync(db: Session = Depends(get_db)):
    schools = db.query(models.School).all()
    for s in schools:
        check_and_update_school_trial_status(s, db)
        
    parents_db = db.query(models.Parent).all()
    parents_data = []
    for p in parents_db:
        parents_data.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "phone": p.phone,
            "address": p.address,
            "profilePic": p.profilePic,
            "hasUploadedPic": p.hasUploadedPic,
            "schoolId": p.schoolId,
            "pendingSchoolId": p.pendingSchoolId,
            "singleParent": p.singleParent,
            "spouseName": p.spouseName,
            "spousePhone": p.spousePhone,
            "spouseProfilePic": p.spouseProfilePic,
            "status": p.status,
            "lat": p.lat,
            "lng": p.lng,
            "online": p.online,
            "deletedBySchoolId": p.deletedBySchoolId,
            "deletedBySchoolName": p.deletedBySchoolName,
            "deleteReason": p.deleteReason,
            "deletedAt": p.deletedAt,
            "children": [{"name": c.name, "age": c.age} for c in p.children],
            "tempAuthorizations": [{"id": a.id, "name": a.name, "phone": a.phone, "type": a.type, "status": a.status, "code": a.code, "createdAt": a.createdAt} for a in p.authorizations]
        })
        
    guardians = db.query(models.Guardian).all()
    pickups = db.query(models.PickupLog).order_by(models.PickupLog.timestamp.desc()).all()
    alerts = db.query(models.ActiveAlert).all()
    notifications = db.query(models.Notification).all()
    smtp_logs = db.query(models.SmtpLog).order_by(models.SmtpLog.id.desc()).all()
    sessions = db.query(models.UserSession).all()
    system_logs = db.query(models.SystemLog).order_by(models.SystemLog.timestamp.desc()).all()
    
    return {
        "schools": schools,
        "parents": parents_data,
        "guardians": guardians,
        "pickups": pickups,
        "alerts": alerts,
        "notifications": notifications,
        "smtpLogs": smtp_logs,
        "sessions": sessions,
        "systemLogs": system_logs
    }

