from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    website = Column(String, nullable=True)
    type = Column(String, nullable=True)  # Primary, Secondary
    verifiedEmail = Column(Boolean, default=False)
    status = Column(String, default="PENDING APPROVAL")  # PENDING APPROVAL, APPROVED, REJECTED, SUSPENDED
    registeredAt = Column(String, nullable=True)
    subscriptionStatus = Column(String, default="PENDING")  # PENDING, FREE_TRIAL, ACTIVE, SUSPENDED
    subscriptionExpires = Column(String, nullable=True)
    trialType = Column(String, nullable=True)  # 1_MONTH, 2_MONTH
    trialExpiresAt = Column(String, nullable=True)
    trial3DayNotificationSentToSuperAdmin = Column(Boolean, default=False)
    trial3DayNotificationSentToSchool = Column(Boolean, default=False)
    trialExpiredNotificationSent = Column(Boolean, default=False)
    masterQrDownloadCount = Column(Integer, default=0)
    masterQrUnlocked = Column(Boolean, default=False)
    masterQrMaxLocations = Column(Integer, default=1)
    masterQrLocations = Column(JSON, default=list)  # Stored coordinates
    masterQrRequests = Column(JSON, default=list)  # Pending/history requests
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)


class Parent(Base):
    __tablename__ = "parents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    password = Column(String, nullable=False)
    profilePic = Column(String, default="")
    hasUploadedPic = Column(Boolean, default=False)
    schoolId = Column(String, nullable=False)
    singleParent = Column(Boolean, default=False)
    spouseName = Column(String, default="")
    spousePhone = Column(String, default="")
    spouseProfilePic = Column(String, default="")
    status = Column(String, default="PENDING")  # APPROVED, PENDING, SUSPENDED, DELETED
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    online = Column(Boolean, default=False)
    deletedBySchoolId = Column(String, nullable=True)
    deletedBySchoolName = Column(String, nullable=True)
    deleteReason = Column(String, nullable=True)
    deletedAt = Column(String, nullable=True)
    pendingSchoolId = Column(String, nullable=True)

    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")
    authorizations = relationship("TemporaryAuthorization", back_populates="parent", cascade="all, delete-orphan")

class Child(Base):
    __tablename__ = "children"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parentId = Column(String, ForeignKey("parents.id"))
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)

    parent = relationship("Parent", back_populates="children")

class TemporaryAuthorization(Base):
    __tablename__ = "temporary_authorizations"

    id = Column(String, primary_key=True, index=True)
    parentId = Column(String, ForeignKey("parents.id"))
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    type = Column(String, default="One-Time")
    status = Column(String, default="Active")
    code = Column(String, nullable=False)
    createdAt = Column(String, nullable=True)

    parent = relationship("Parent", back_populates="authorizations")

class Guardian(Base):
    __tablename__ = "guardians"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password = Column(String, nullable=False)
    profilePic = Column(String, default="")
    busNumber = Column(String, nullable=True)
    driverName = Column(String, nullable=True)
    plateNumber = Column(String, nullable=True)
    assignedRoute = Column(String, nullable=True)
    schoolId = Column(String, nullable=False)
    online = Column(Boolean, default=False)
    status = Column(String, default="ACTIVE")  # ACTIVE, SUSPENDED
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    lastLocationUpdated = Column(String, nullable=True)

class PickupLog(Base):
    __tablename__ = "pickup_logs"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # Morning Pickup, Afternoon Drop-Off
    timestamp = Column(String, nullable=False)
    schoolId = Column(String, nullable=False)
    parentName = Column(String, nullable=False)
    childName = Column(String, nullable=False)
    guardianName = Column(String, nullable=False)
    status = Column(String, nullable=False)  # VERIFIED, FAILED
    gps = Column(String, nullable=True)
    device = Column(String, nullable=True)
    details = Column(String, nullable=True)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    schoolId = Column(String, nullable=True)
    parentName = Column(String, nullable=True)
    gps = Column(String, nullable=True)
    device = Column(String, nullable=True)
    details = Column(String, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    senderId = Column(String, nullable=True)
    senderName = Column(String, nullable=True)
    recipientId = Column(String, nullable=False)  # SUPER_ADMIN or ID
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    isRead = Column(Boolean, default=False)
    timestamp = Column(String, nullable=False)

class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(String, primary_key=True, index=True)
    schoolId = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    childrenCount = Column(Integer, nullable=False)
    status = Column(String, default="PAID")
    timestamp = Column(String, nullable=False)
    details = Column(String, nullable=True)

class SmtpLog(Base):
    __tablename__ = "smtp_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, nullable=False)
    text = Column(Text, nullable=False)

class ActiveAlert(Base):
    __tablename__ = "active_alerts"

    id = Column(String, primary_key=True, index=True)
    guardianId = Column(String, nullable=False)
    guardianName = Column(String, nullable=False)
    busNumber = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Accident, Engine Breakdown, Medical, Traffic Delay
    status = Column(String, default="ACTIVE")  # ACTIVE, RESOLVED
    timestamp = Column(String, nullable=False)
    note = Column(String, default="")
    schoolId = Column(String, nullable=True)
    acknowledgedBySchoolAdmin = Column(Boolean, default=False)
    resolvedBySuperAdmin = Column(Boolean, default=False)
    acknowledgedBySuperAdmin = Column(Boolean, default=False)
    resolvedByGuardian = Column(Boolean, default=False)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, nullable=False)
    role = Column(String, nullable=False)  # SCHOOL_ADMIN, PARENT, BUS_GUARDIAN
    deviceName = Column(String, nullable=True)
    ipAddress = Column(String, nullable=True)
    loginTime = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")

class SystemSettings(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
