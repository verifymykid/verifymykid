import React, { useState, useEffect, useRef } from 'react';
import { Users, ShieldAlert, CheckCircle2, ScanLine, Bell, LogOut, School } from 'lucide-react';
import { useStore, getDynamicCode, hashPassword } from '../data/mockStore';
import DynamicCode from '../components/DynamicCode';

export default function ParentPortal({ parentId, setParentId }) {
  const { 
    schools, parents, guardians, logs, verifyPickupEvent, addTempAuthorization,
    notifications, sendNotification, markNotificationRead, addSystemLog, updateParentProfile, deleteParent,
    setParentOnlineStatus
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState('otp'); // 'otp' | 'simulate' | 'temp-auth' | 'history' | 'settings'
  const [showAddTemp, setShowAddTemp] = useState(false);

  // Temporary Authorization state
  const [tempForm, setTempForm] = useState({ name: '', phone: '', type: 'One-Time' });

  // Morning Scan Simulator state
  const [guardianCodeInput, setGuardianCodeInput] = useState('');
  const [scanResult, setScanResult] = useState(null); // null | { status: 'VERIFIED'|'UNRECOGNIZED', message: '', log: {} }
  const [reportedAlert, setReportedAlert] = useState(false);

  // Notifications states
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Settings tab states
  const [currentPasswordVal, setCurrentPasswordVal] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [selectedNewSchoolId, setSelectedNewSchoolId] = useState('');

  // Mandatory profile picture states
  const [profilePicInput, setProfilePicInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const lastNotifIdRef = useRef('');
  const isMountedRef = useRef(false);

  // Fetch current parent details
  const currentParent = parents.find(p => p.id === parentId);
  const parentSchool = schools.find(s => s.id === currentParent?.schoolId);
  const schoolName = parentSchool ? parentSchool.name : 'Unknown School';

  useEffect(() => {
    if (currentParent) {
      const parentNotifs = notifications.filter(n => n.recipientId === currentParent.id);
      if (parentNotifs.length > 0) {
        const latest = parentNotifs[0];
        if (!isMountedRef.current) {
          lastNotifIdRef.current = latest.id;
          isMountedRef.current = true;
        } else if (latest.id !== lastNotifIdRef.current) {
          setActiveToast(latest);
          const timer = setTimeout(() => {
            setActiveToast(null);
          }, 6000);
          lastNotifIdRef.current = latest.id;
          return () => clearTimeout(timer);
        }
      } else {
        isMountedRef.current = true;
      }
    }
  }, [notifications, currentParent]);

  useEffect(() => {
    if (parentId) {
      const p = parents.find(x => x.id === parentId);
      const coords = p ? { lat: p.lat, lng: p.lng } : null;
      setParentOnlineStatus(parentId, true, coords);
    }
  }, [parentId]);
  
  useEffect(() => {
    if (currentParent && currentParent.status === 'SUSPENDED') {
      setParentOnlineStatus(currentParent.id, false);
      addSystemLog({
        type: 'Parent Session Terminated',
        schoolId: currentParent.schoolId,
        parentName: currentParent.name,
        details: `Parent ${currentParent.name} session terminated automatically due to account suspension.`
      });
      sessionStorage.setItem('parent_login_error', "Your parent account has been suspended by the school administrator.");
      setParentId('');
    }
  }, [parents, parentId, currentParent?.status]);

  if (!currentParent) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--accent-red)', marginBottom: '1.5rem' }} />
        <h2>Parent Session Missing</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please sign in first via the Parent Sign-in portal.</p>
      </div>
    );
  }

  // School calculations
  const parentLogs = logs.filter(l => l.parentName === currentParent.name);

  // Simulation: We assume the approaching bus guardian is GDN-501 (Robert Vance)
  const targetGuardianId = 'GDN-501';

  const matchedGuardian = scanResult ? guardians.find(g => g.name === scanResult.log.guardianName) : null;

  // Handle Morning Simulator Scan (Manual PIN input)
  const handleSimulateMorningScan = (e) => {
    e.preventDefault();
    const cleanCode = guardianCodeInput.trim().replace(/\s+/g, '');
    if (!cleanCode) return;

    // Search guardians database to identify who matches this code
    let foundGuardianId = null;
    for (const g of guardians) {
      const expected = getDynamicCode(g.id);
      const cleanExpectedCode = expected.code.trim().replace(/\s+/g, '');
      const cleanExpectedQr = expected.qrValue.trim().replace(/\s+/g, '');
      if (cleanExpectedCode === cleanCode || cleanExpectedQr === cleanCode) {
        foundGuardianId = g.id;
        break;
      }
    }
    const finalGuardianId = foundGuardianId || 'GDN-501';

    const triggerVerification = (scannedGps) => {
      const res = verifyPickupEvent({
        parentId: currentParent.id,
        guardianId: finalGuardianId,
        enteredCode: cleanCode,
        isMorning: true,
        scannedGps
      });
      setScanResult(res);
      setReportedAlert(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsCoord = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
          triggerVerification(gpsCoord);
        },
        () => {
          triggerVerification('Permission Denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      triggerVerification('N/A');
    }
  };

  // Simulate scanning the guardian's active QR code
  const handleTriggerQrScan = () => {
    const activeCodeObj = getDynamicCode(targetGuardianId);
    
    const triggerVerification = (scannedGps) => {
      const res = verifyPickupEvent({
        parentId: currentParent.id,
        guardianId: targetGuardianId,
        enteredCode: activeCodeObj.qrValue,
        isMorning: true,
        scannedGps
      });
      setScanResult(res);
      setReportedAlert(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsCoord = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
          triggerVerification(gpsCoord);
        },
        () => {
          triggerVerification('Permission Denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      triggerVerification('N/A');
    }
  };

  // Handle Parent report failed pickup
  const handleReportUnrecognized = () => {
    // Send notifications to school and super admin
    sendNotification(
      currentParent.id,
      currentParent.name,
      currentParent.schoolId,
      '🚨 Fraud Report Transmitted',
      `Parent ${currentParent.name} reported fraud/unrecognized bus guardian attempt. Timestamp: ${new Date().toLocaleString()}.`
    );
    sendNotification(
      currentParent.id,
      currentParent.name,
      'SUPER_ADMIN',
      '🚨 Fraud Report Transmitted',
      `Parent ${currentParent.name} from ${schoolName} reported fraud/unrecognized bus guardian attempt. Timestamp: ${new Date().toLocaleString()}.`
    );

    setConfirmDialog({
      title: "REPORT SUBMITTED SUCCESSFULLY",
      message: "School administrators and Super Admins have been notified immediately with GPS coordinates, device fingerprints, and timestamps.",
      isAlert: true,
      confirmText: "Understood",
      onConfirm: () => {}
    });
    setReportedAlert(true);
  };

  const handleCreateTempAuth = (e) => {
    e.preventDefault();
    if (!tempForm.name || !tempForm.phone) return;
    addTempAuthorization(currentParent.id, tempForm.name, tempForm.phone, tempForm.type);
    setTempForm({ name: '', phone: '', type: 'One-Time' });
    setShowAddTemp(false);
  };

  const handleLogoutClick = () => {
    setConfirmDialog({
      title: "Logout Confirmation",
      message: "Are you sure you want to sign out of the Parent Portal? Your active child pickup authorization tokens will remain secure.",
      onConfirm: () => {
        const ua = navigator.userAgent;
        let os = "Unknown OS";
        if (ua.indexOf("Win") !== -1) os = "Windows";
        else if (ua.indexOf("Mac") !== -1) os = "macOS";
        else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
        else if (/Android/.test(ua)) os = "Android";
        else if (ua.indexOf("Linux") !== -1) os = "Linux";
        
        let browser = "Browser";
        if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (ua.indexOf("Safari") !== -1) browser = "Safari";
        else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

        const deviceStr = `${browser} on ${os}`;

        const proceedLogout = (gpsCoords) => {
          setParentOnlineStatus(currentParent.id, false);
          addSystemLog({
            type: 'Parent Sign-Out',
            schoolId: currentParent.schoolId,
            parentName: currentParent.name,
            gps: gpsCoords,
            device: deviceStr,
            details: `Parent ${currentParent.name} logged out from ${schoolName}.`
          });
          setParentId('');
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coordsStr = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
              proceedLogout(coordsStr);
            },
            () => {
              proceedLogout('N/A (Permission Denied)');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          proceedLogout('N/A (Not Supported)');
        }
      }
    });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (newPasswordVal.length < 6) {
      setSettingsError("New password must be at least 6 characters.");
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setSettingsError("New passwords do not match.");
      return;
    }

    try {
      await updateParentProfile(currentParent.id, { 
        password: newPasswordVal, 
        currentPassword: currentPasswordVal 
      });
      setSettingsSuccess("Password updated successfully!");
      setCurrentPasswordVal('');
      setNewPasswordVal('');
      setConfirmPasswordVal('');
    } catch (err) {
      setSettingsError(err.message || "Failed to update password.");
    }
  };

  const handleMandatoryUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!profilePicInput) {
      setUploadError("Please upload a profile picture file.");
      return;
    }
    setIsActivating(true);
    try {
      await updateParentProfile(currentParent.id, { 
        profilePic: profilePicInput, 
        hasUploadedPic: true 
      });
      setIsActivating(false);
    } catch (err) {
      setIsActivating(false);
      setUploadError(err.message || "Failed to activate profile.");
    }
  };

  if (currentParent && !currentParent.hasUploadedPic) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <div className="glass-card" style={{ border: '1px solid var(--accent-blue)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto' }}>
                <Users size={32} />
              </div>
              <h2>Profile Activation Required</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
                To ensure high security and child hand-off safety, you must upload a clear profile picture before you can activate your parent account and enter the dashboard.
              </p>
            </div>

            {uploadError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleMandatoryUpload}>
              <div className="form-group" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>Upload Profile Picture File *</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfilePicInput(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="input-control"
                  style={{ padding: '0.4rem' }}
                  id="mandatory-pic-uploader"
                />

                {profilePicInput && (
                  <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-cyan)' }}>
                      <img src={profilePicInput} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>✓ Profile Image Loaded</span>
                  </div>
                )}
              </div>

              {isActivating ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ border: '3px solid rgba(59, 130, 246, 0.1)', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', width: '28px', height: '28px', margin: '0 auto 0.75rem auto', animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activating secure keys...</div>
                </div>
              ) : (
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} id="btn-activate-parent-profile">
                  Activate Profile & Enter Portal
                </button>
              )}
            </form>

            <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center' }}>
              <button 
                onClick={handleLogoutClick} 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        {confirmDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--accent-blue)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#fff' }}>{confirmDialog.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                >
                  No, Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 1.25rem', fontSize: '0.8rem' }}
                >
                  Yes, Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentParent && currentParent.pendingSchoolId) {
    const destSchool = schools.find(s => s.id === currentParent.pendingSchoolId);
    const destSchoolName = destSchool ? destSchool.name : 'Unknown School';
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <div className="glass-card" style={{ border: '1.5px solid var(--accent-yellow)', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto' }}>
                <School size={32} />
              </div>
              <h2>School Transfer Pending</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
                You have requested to transfer your parent profile and enrolled children to <strong>{destSchoolName}</strong>. 
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                To complete this transfer, the administrators of <strong>{destSchoolName}</strong> must verify and approve your request. Until approved, your active child pickup tokens are locked.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  setConfirmDialog({
                    title: "Cancel Transfer Request",
                    message: "Are you sure you want to cancel your transfer request and remain at your current school?",
                    onConfirm: () => {
                      updateParentProfile(currentParent.id, { pendingSchoolId: null });
                      addSystemLog({
                        type: 'Parent Transfer Cancelled',
                        schoolId: currentParent.schoolId,
                        parentName: currentParent.name,
                        details: `Parent ${currentParent.name} cancelled school transfer request to stay at ${schoolName}.`
                      });
                    }
                  });
                }} 
                className="btn btn-outline" 
                style={{ padding: '0.6rem', width: '100%', fontSize: '0.85rem' }}
                id="btn-cancel-transfer"
              >
                Cancel Transfer Request
              </button>
              <button 
                onClick={handleLogoutClick} 
                className="btn btn-primary" 
                style={{ padding: '0.6rem', width: '100%', fontSize: '0.85rem' }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        {confirmDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--accent-blue)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#fff' }}>{confirmDialog.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                >
                  No, Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 1.25rem', fontSize: '0.8rem' }}
                >
                  Yes, Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isRead = (n) => (n.readBy && n.readBy.includes(currentParent.id)) || n.read || n.isRead;
  const unreadCount = notifications.filter(n => n.recipientId === currentParent.id && !isRead(n)).length;

  return (
    <main className="container" style={{ padding: '2rem 1.5rem', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-blue)' }}>
            <img src={currentParent.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Welcome, {currentParent.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              Parent ID: <span className="badge badge-info">{currentParent.id}</span>
              <span>•</span>
              Verification Status: 
              {(currentParent.status || 'APPROVED') === 'APPROVED' && <span className="badge badge-success">Active</span>}
              {currentParent.status === 'SUSPENDED' && <span className="badge badge-danger">Suspended</span>}
              {currentParent.status === 'PENDING' && <span className="badge badge-warning">Pending Approval</span>}
              <span>•</span>
              School: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{schoolName}</span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Notification Bell */}
          <button 
            onClick={() => setShowNotificationsModal(true)} 
            className="btn btn-outline"
            style={{ 
              position: 'relative', 
              padding: '0.6rem', 
              borderRadius: '50%', 
              minWidth: '42px', 
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            id="parent-notifications-bell"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-4px', 
                right: '-4px', 
                background: 'var(--accent-red)', 
                color: 'white', 
                borderRadius: '50%', 
                width: '18px', 
                height: '18px', 
                fontSize: '0.65rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogoutClick} 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
            id="btn-parent-logout"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Inner Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.25rem', borderRadius: '10px', flexWrap: 'wrap' }}>
          <button className={`role-tab ${activeSubTab === 'otp' ? 'active' : ''}`} onClick={() => setActiveSubTab('otp')}>My Pickup Code</button>
          <button className={`role-tab ${activeSubTab === 'simulate' ? 'active' : ''}`} onClick={() => setActiveSubTab('simulate')}>Verify Bus Guardian</button>
          <button className={`role-tab ${activeSubTab === 'temp-auth' ? 'active' : ''}`} onClick={() => setActiveSubTab('temp-auth')}>Temporary Access</button>
          <button className={`role-tab ${activeSubTab === 'history' ? 'active' : ''}`} onClick={() => setActiveSubTab('history')}>Pickup History</button>
          <button className={`role-tab ${activeSubTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveSubTab('settings')}>Settings</button>
        </div>
      </div>

      <div className="grid-3">
        {/* Left column: Family details & Children list */}
        <div className="col-span-1">
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
              Pickup Account Information
            </h3>
            
            {/* Primary Parent */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-blue)', flexShrink: 0 }}>
                <img src={currentParent.profilePic} alt={currentParent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{currentParent.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Parent</div>
              </div>
            </div>

            {/* Spouse / Secondary Parent */}
            {!currentParent.singleParent && currentParent.spouseName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-cyan)', flexShrink: 0 }}>
                   <img src={currentParent.spouseProfilePic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt={currentParent.spouseName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{currentParent.spouseName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Spouse</div>
                </div>
              </div>
            ) : null}

            {/* Enrolled Children */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Enrolled Children
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentParent.children.map((c, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.6rem 0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Dynamic tabs */}
        <div className="col-span-2">
          {activeSubTab === 'otp' && (
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <DynamicCode uniqueId={currentParent.id} title="My Rotating Pickup QR" />
              <div className="glass-card" style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', border: '1.5px dashed var(--glass-border)' }}>
                <strong>How to use drop-off verification:</strong> When the drop-off bus guardian delivers your child in the afternoon, present this QR code or read out the 6-digit code.
              </div>
            </div>
          )}

          {activeSubTab === 'simulate' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ScanLine style={{ color: 'var(--accent-blue)' }} /> Morning Pickup Verification Simulator
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Simulate scanning the approaching Bus Guardian's credentials to verify they are authorized by the school.
              </p>

              {/* Simulation scanner box */}
              {scanResult ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  {scanResult.status === 'VERIFIED' ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid var(--accent-green)', padding: '2rem', borderRadius: '12px' }} id="scan-success-screen">
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto', fontSize: '2rem', fontWeight: 'bold' }}>
                        ✓
                      </div>
                      <h2 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>VERIFIED BUS GUARDIAN</h2>
                      
                      {/* Visual Verification Hand-off Profiles */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', marginTop: '1.25rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-blue)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', margin: '0 auto 0.5rem' }}>
                            <img src={currentParent.profilePic} alt={currentParent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentParent.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Parent</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--accent-green)' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1' }}>↔</div>
                          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '9999px', marginTop: '4px' }}>SECURE MATCH</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-cyan)', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)', margin: '0 auto 0.5rem' }}>
                            <img src={matchedGuardian ? matchedGuardian.profilePic : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'} alt={scanResult.log.guardianName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{scanResult.log.guardianName}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Bus Guardian</div>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        Authorized pickup by school system. Greenwood Academy has logged this coordinate transfer.
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-block', textAlign: 'left', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <strong>Pickup Event Details:</strong><br />
                        • Bus Guardian Name: {scanResult.log.guardianName}<br />
                        • Time: {new Date(scanResult.log.timestamp).toLocaleTimeString()}<br />
                        • Coordinates: {scanResult.log.gps}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid var(--accent-red)', padding: '2rem', borderRadius: '12px' }} id="scan-failed-screen">
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--accent-red)', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        ✕
                      </div>
                      <h2 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>UNRECOGNIZED BUS GUARDIAN</h2>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        <strong>Warning:</strong> The credentials do not match this Bus Guardian! This could indicate an expired token, wrong guardian, or unauthorized pickup attempt.
                      </p>
                      
                      {!reportedAlert ? (
                        <button 
                          onClick={handleReportUnrecognized}
                          className="btn btn-danger animate-pulse"
                          style={{ padding: '0.6rem 1.5rem', fontWeight: 'bold' }}
                          id="btn-report-alert"
                        >
                          🚨 REPORT FRAUD / PANIC NOW
                        </button>
                      ) : (
                        <div style={{ color: 'var(--accent-yellow)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ⚠️ FRAUD REPORT TRANSMITTED TO SCHOOL ADMINS
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => { setScanResult(null); setGuardianCodeInput(''); }} 
                    className="btn btn-outline" 
                    style={{ marginTop: '1.5rem' }}
                    id="btn-reset-scanner"
                  >
                    Reset Scanner View
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Camera Scanner Simulation Frame */}
                  <div className="qr-scanner-mock" style={{ marginBottom: '1.5rem' }}>
                    <div className="qr-scanner-line" />
                    <div className="qr-corner qr-corner-tl" />
                    <div className="qr-corner qr-corner-tr" />
                    <div className="qr-corner qr-corner-bl" />
                    <div className="qr-corner qr-corner-br" />
                    
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      zIndex: 2,
                      width: '80%'
                    }}>
                      <button 
                        onClick={handleTriggerQrScan} 
                        className="btn btn-success" 
                        style={{ fontSize: '0.75rem', padding: '0.5rem 0.8rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
                        type="button"
                        id="btn-detect-guardian-qr"
                      >
                        📷 Detect Bus Guardian QR Code
                      </button>
                    </div>
                  </div>

                  {/* Manual input form */}
                  <form onSubmit={handleSimulateMorningScan} style={{ maxWidth: '400px', width: '100%' }}>
                    <div className="form-group" style={{ textAlign: 'center' }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block' }}>Or enter 6-digit Code manually:</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 582194"
                        value={guardianCodeInput}
                        onChange={(e) => setGuardianCodeInput(e.target.value)}
                        className="input-control"
                        style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.2em' }}
                        id="sim-scan-code"
                      />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                        💡 <strong>Simulation tip:</strong> To test a <strong>valid scan</strong>, click the <em>Detect Bus Guardian QR Code</em> button, or copy the 6-digit code showing on the <strong>Bus Guardian</strong> view.
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} id="btn-scan-submit">
                      Submit Manual Code
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'temp-auth' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Temporary Pickup Authorizations</h3>
                <button 
                  onClick={() => setShowAddTemp(!showAddTemp)} 
                  className="btn btn-primary"
                  id="btn-toggle-add-temp"
                >
                  {showAddTemp ? 'Close Form' : '+ Generate Auth Code'}
                </button>
              </div>

              {showAddTemp && (
                <div className="glass-card" style={{ background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                    Authorized Person Information
                  </h4>
                  <form onSubmit={handleCreateTempAuth}>
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Grandparent, Relative, Driver, etc."
                        value={tempForm.name}
                        onChange={(e) => setTempForm({ ...tempForm, name: e.target.value })}
                        className="input-control"
                        id="temp-auth-name"
                      />
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label>Mobile Phone *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+234 xxxx xxxx"
                          value={tempForm.phone}
                          onChange={(e) => setTempForm({ ...tempForm, phone: e.target.value })}
                          className="input-control"
                          id="temp-auth-phone"
                        />
                      </div>

                      <div className="form-group">
                        <label>Validity Duration *</label>
                        <select
                          value={tempForm.type}
                          onChange={(e) => setTempForm({ ...tempForm, type: e.target.value })}
                          className="input-control"
                          id="temp-auth-type"
                        >
                          <option value="One-Time">One-Time Pickup Use</option>
                          <option value="Time Limited (Today)">Expires in 12 Hours</option>
                          <option value="Time Limited (2 Days)">Expires in 48 Hours</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-success" style={{ width: '100%' }} id="btn-submit-temp-auth">
                      Create Temporary Token
                    </button>
                  </form>
                </div>
              )}

              {currentParent.tempAuthorizations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No active temporary authorizations. Only primary parents have pickup rights.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {currentParent.tempAuthorizations.map(ta => (
                    <div key={ta.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} id={`temp-auth-card-${ta.id}`}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{ta.name} ({ta.type})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Phone: {ta.phone} | Status: {(() => {
                            let activeStatus = ta.status;
                            if (activeStatus === 'Active') {
                              const elapsedMs = Date.now() - new Date(ta.createdAt).getTime();
                              if (ta.type === 'Time Limited (Today)' && elapsedMs > 12 * 60 * 60 * 1000) {
                                activeStatus = 'Expired';
                              } else if (ta.type === 'Time Limited (2 Days)' && elapsedMs > 48 * 60 * 60 * 1000) {
                                activeStatus = 'Expired';
                              }
                            }
                            
                            let badgeClass = 'badge-success';
                            if (activeStatus === 'Expired') badgeClass = 'badge-danger';
                            else if (activeStatus === 'Used') badgeClass = 'badge-info';

                            return (
                              <span className={`badge ${badgeClass}`} style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                                {activeStatus}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AUTHORIZED CODE:</div>
                        <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{ta.code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem' }}>Safety Pickup History</h3>
              {parentLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  No verification history found for your account today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {parentLogs.map(log => (
                    <div key={log.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{log.type}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Kid(s): {log.childName} | Route Bus Guardian: {log.guardianName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Device: {log.device} | GPS: {log.gps}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div>
                          {log.status === 'VERIFIED' ? (
                            <span className="badge badge-success">Verified</span>
                          ) : (
                            <span className="badge badge-danger">Fraud Flag</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'settings' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
                Security Settings & Password Update
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Update your account password to ensure your pick-up credentials remain secure.
              </p>
              
              {settingsError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {settingsError}
                </div>
              )}
              {settingsSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {settingsSuccess}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} style={{ maxWidth: '400px' }}>
                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPasswordVal}
                    onChange={(e) => setCurrentPasswordVal(e.target.value)}
                    className="input-control"
                    id="settings-curr-pass"
                  />
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="input-control"
                    id="settings-new-pass"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPasswordVal}
                    onChange={(e) => setConfirmPasswordVal(e.target.value)}
                    className="input-control"
                    id="settings-conf-pass"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} id="btn-settings-update-pass">
                  Update Password
                </button>
              </form>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

              {/* Section: Change Profile Picture */}
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)' }}>
                Update Profile Picture
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Upload a new clear profile picture to update your pickup identification credentials.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2.5px solid var(--accent-green)', flexShrink: 0 }}>
                  <img src={currentParent.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateParentProfile(currentParent.id, { profilePic: reader.result });
                          setSettingsSuccess("Profile picture updated successfully!");
                          addSystemLog({
                            type: 'Parent Profile Picture Updated',
                            schoolId: currentParent.schoolId,
                            parentName: currentParent.name,
                            details: `Parent ${currentParent.name} updated their profile picture.`
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="input-control"
                    style={{ padding: '0.4rem', fontSize: '0.8rem', maxWidth: '300px' }}
                    id="settings-profile-pic-uploader"
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

              {/* Section: Change School */}
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                Transfer to Another School
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                If your child is changing schools, select their new registered school below. Your account transfer request will be sent to the new school for approval.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!selectedNewSchoolId) return;
                const destSchoolObj = schools.find(s => s.id === selectedNewSchoolId);
                const destName = destSchoolObj ? destSchoolObj.name : 'Selected School';
                const currentSchoolObj = schools.find(s => s.id === currentParent.schoolId);
                const schoolName = currentSchoolObj ? currentSchoolObj.name : 'Current School';

                setConfirmDialog({
                  title: "Request School Transfer",
                  message: `Are you sure you want to request a profile transfer to ${destName}? Your pickup codes will be temporarily locked until the administrators at ${destName} approve your profile.`,
                  onConfirm: () => {
                    updateParentProfile(currentParent.id, { pendingSchoolId: selectedNewSchoolId });
                    addSystemLog({
                      type: 'Parent Transfer Requested',
                      schoolId: currentParent.schoolId,
                      parentName: currentParent.name,
                      details: `Parent ${currentParent.name} requested profile transfer from ${schoolName} to school ${destName} (ID: ${selectedNewSchoolId}).`
                    });
                    sendNotification(currentParent.id, currentParent.name, currentParent.id, 'School Transfer Requested', `A change of school has just been requested: you have requested a profile transfer to ${destName}.`);
                    sendNotification(currentParent.id, currentParent.name, currentParent.schoolId, 'School Transfer Requested', `A change of school has just been requested: Parent ${currentParent.name} has requested a profile transfer to ${destName}.`);
                    sendNotification(currentParent.id, currentParent.name, selectedNewSchoolId, 'School Transfer Requested', `A change of school has just been requested: Parent ${currentParent.name} has requested a profile transfer to your school.`);
                    sendNotification(currentParent.id, currentParent.name, 'SUPER_ADMIN', 'School Transfer Requested', `A change of school has just been requested: Parent ${currentParent.name} requested school transfer from ${schoolName} to ${destName}.`);
                  }
                });
              }} style={{ maxWidth: '400px', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label>Select New School *</label>
                  <select
                    value={selectedNewSchoolId}
                    onChange={(e) => setSelectedNewSchoolId(e.target.value)}
                    required
                    className="input-control"
                    id="select-transfer-school"
                  >
                    <option value="">-- Choose New School --</option>
                    {schools.filter(s => s.id !== currentParent.schoolId && s.status === 'APPROVED').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.type} - {s.id})</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={!selectedNewSchoolId}
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem', background: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }} 
                  id="btn-request-transfer-submit"
                >
                  Request School Transfer
                </button>
              </form>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

              {/* Section: Delete Account */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
                  ⚠️ Danger Zone: Delete Account
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  Permanently delete your Parent Account and remove all student profiles, temporary tokens, and safety access codes. This action is irreversible.
                </p>

                <button 
                  onClick={() => {
                    setConfirmDialog({
                      title: "DELETE PARENT ACCOUNT PERMANENTLY",
                      message: "Are you absolutely sure you want to permanently delete your parent account? All student rosters and pickup records associated with your profile will be immediately destroyed. This action cannot be undone.",
                      onConfirm: () => {
                        addSystemLog({
                          type: 'Parent Account Deleted',
                          schoolId: currentParent.schoolId,
                          parentName: currentParent.name,
                          details: `Parent ${currentParent.name} permanently deleted their account from ${schoolName}.`
                        });
                        sendNotification(currentParent.id, currentParent.name, currentParent.schoolId, 'Parent Account Deleted', `An account deletion has just happened: Parent ${currentParent.name} has permanently deleted their account.`);
                        sendNotification(currentParent.id, currentParent.name, 'SUPER_ADMIN', 'Parent Account Deleted', `An account deletion has just happened: Parent ${currentParent.name} has permanently deleted their account from ${schoolName}.`);
                        deleteParent(currentParent.id);
                        setParentId('');
                      }
                    });
                  }}
                  className="btn btn-danger"
                  style={{ padding: '0.6rem 1.5rem', fontWeight: 'bold' }}
                  id="btn-delete-parent-account"
                  type="button"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotificationsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '650px', width: '100%', border: '1px solid var(--accent-blue)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: '#fff' }}>
                <Bell style={{ color: 'var(--accent-blue)' }} /> Safety Desk & Notifications
              </h3>
              <button 
                onClick={() => setShowNotificationsModal(false)} 
                className="btn btn-outline" 
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                id="btn-close-notifications"
              >
                Close
              </button>
            </div>

            <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
              {/* Left Column: Inbox */}
              <div className="col-span-1">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Incoming Messages</h4>
                {notifications.filter(n => n.recipientId === currentParent.id).length === 0 ? (
                  <div style={{ padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                    No notifications in inbox.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {notifications.filter(n => n.recipientId === currentParent.id).map(n => (
                      <div 
                        key={n.id} 
                        style={{ 
                          background: isRead(n) ? 'var(--bg-secondary)' : 'rgba(59, 130, 246, 0.15)', 
                          border: isRead(n) ? '1px solid var(--glass-border)' : '1px solid var(--accent-blue)', 
                          padding: '0.75rem', 
                          borderRadius: '8px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <span>{n.title}</span>
                          {!isRead(n) && (
                            <button 
                              onClick={() => markNotificationRead(n.id, currentParent.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>{n.message}</p>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                          From: {n.senderName} • {new Date(n.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Send to School */}
              <div className="col-span-1">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-blue)' }}>Send Notification to School</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!composeSubject || !composeMessage) return;
                  sendNotification(currentParent.id, currentParent.name, currentParent.schoolId, composeSubject, composeMessage);
                  setComposeSubject('');
                  setComposeMessage('');
                  alert("Your notification has been securely sent to the School Admin desk.");
                }}>
                  <div className="form-group">
                    <label>Subject / Topic *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Absency alert, route issue"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="input-control"
                      id="compose-subject"
                    />
                  </div>
                  <div className="form-group">
                    <label>Detailed Message *</label>
                    <textarea 
                      required 
                      placeholder="Type details for school administrators..."
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      className="input-control"
                      style={{ minHeight: '100px', resize: 'none' }}
                      id="compose-message"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} id="btn-send-notif">
                    Transmit Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--accent-blue)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#fff' }}>{confirmDialog.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {!confirmDialog.isAlert && (
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  id="btn-confirm-no"
                >
                  No, Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1.25rem', fontSize: '0.8rem' }}
                id="btn-confirm-yes"
              >
                {confirmDialog.confirmText || 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Toast Push Notification */}
      {activeToast && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 100000,
            maxWidth: '380px',
            width: 'calc(100% - 48px)',
            background: 'rgba(10, 15, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid var(--accent-blue)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'start',
            gap: '0.75rem',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
          className="animate-slideIn"
          id="parent-push-notification-toast"
        >
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} className="animate-bounce" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
              {activeToast.title}
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {activeToast.message}
            </p>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', fontSize: '1rem', lineHeight: 1 }}
            id="btn-close-toast"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
