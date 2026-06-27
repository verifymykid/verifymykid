import React, { useState, useEffect } from 'react';
import { School, ShieldAlert, Users, Bus, AlertCircle, Plus, Search, FileText, LogOut, Bell, MessageSquare, Send, CreditCard, RefreshCw, Sun, Moon } from 'lucide-react';
import { useStore } from '../data/mockStore';
import GoogleMapView from '../components/GoogleMapView';

export default function SchoolAdminPortal({ schoolId, setSchoolId }) {
  const { 
    schools, parents, guardians, logs, activeAlerts, addGuardian, resolvePanic, acknowledgePanicSchoolAdmin,
    notifications, sendNotification, markNotificationRead, addSystemLog,
    payments, setParentStatus, updateSchoolProfile, updateParentProfile, recordPayment,
    updateGuardianStatus, deleteGuardian, deleteParentBySchool,
    sessions, sessionsLoaded, freezeSession, deleteSession, deleteUnrecognizedSessions, addSession,
    registerMasterQrLocation, requestMasterQrUnlock
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'fleet' | 'parents' | 'logs' | 'billing' | 'notifications'
  const [showAddForm, setShowAddForm] = useState(false);

  // New Guardian Form State
  const [guardianForm, setGuardianForm] = useState({
    name: '', phone: '', busNumber: '', driverName: '', plateNumber: '', assignedRoute: '',
    password: '',
    profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
  });
  const [generatedCreds, setGeneratedCreds] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('vmk_theme_school_admin') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vmk_theme_school_admin', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Parent directory search
  const [parentSearch, setParentSearch] = useState('');

  // Payments Checkout state
  const [showPayModal, setShowPayModal] = useState(false);
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState('CARD'); // 'CARD' | 'BANK'
  const [bankSender, setBankSender] = useState('');
  const [bankRef, setBankRef] = useState('');

  // Filters state
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [filterDate, setFilterDate] = useState(getTodayString());

  const [mapCenterCoords, setMapCenterCoords] = useState(null);

  // Settings tab states
  const [currentPasswordVal, setCurrentPasswordVal] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [showSyncError, setShowSyncError] = useState(false);

  // Compose states
  const [notifRecipient, setNotifRecipient] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');
  const [agreeLocationUse, setAgreeLocationUse] = useState(false);
  const currentSessionId = localStorage.getItem('vmk_current_school_session_id');

  // Capture browser geolocation on portal load to dynamically store the school admin location
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          localStorage.setItem('vmk_school_admin_lat', String(lat));
          localStorage.setItem('vmk_school_admin_lng', String(lng));
        },
        (error) => {
          console.warn("SchoolAdminPortal geolocation capture failed:", error);
        },
        { enableHighAccuracy: false, timeout: 800, maximumAge: 60000 }
      );
    }
  }, []);

  // Monitor if active session gets frozen or deleted
  React.useEffect(() => {
    if (schoolId && currentSessionId && sessionsLoaded) {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (!currentSession) {
        // Double check directly with the backend before terminating
        const verifyAndLogout = async () => {
          try {
            const base = localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io';
            const res = await fetch(`${base}/api/sessions?cb=${Date.now()}`, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            if (res.ok) {
              const latestSessions = await res.json();
              const stillExists = latestSessions.some(s => s.id === currentSessionId);
              if (!stillExists) {
                localStorage.setItem('school_login_error', "Your session was terminated by an administrator.");
                handleLogoutClick();
              }
            }
          } catch (err) {
            // Ignore fetch errors to prevent false-positives
          }
        };
        verifyAndLogout();
      } else if (currentSession.status === 'FROZEN') {
        localStorage.setItem('school_login_error', "Your session has been frozen by an administrator.");
        handleLogoutClick();
      }
    }
  }, [sessions, schoolId, currentSessionId, sessionsLoaded]);

  // Register current session if missing on load (e.g., page refresh or direct navigation)
  React.useEffect(() => {
    const registerSession = async () => {
      if (schoolId && !localStorage.getItem('vmk_current_school_session_id')) {
        const ua = navigator.userAgent;
        let os = "macOS";
        let browser = "Chrome";
        if (ua.indexOf("Win") !== -1) os = "Windows";
        else if (ua.indexOf("Mac") !== -1) os = "macOS";
        else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
        else if (/Android/.test(ua)) os = "Android";
        
        if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (ua.indexOf("Safari") !== -1) browser = "Safari";
        else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

        const sessionObj = await addSession({
          userId: schoolId,
          role: 'SCHOOL_ADMIN',
          deviceName: `${browser} on ${os} (Current Device)`,
          ipAddress: '197.210.88.92',
          loginTime: new Date().toISOString(),
          status: 'ACTIVE'
        });
        localStorage.setItem('vmk_current_school_session_id', sessionObj.id);
      }
    };
    registerSession();
  }, [schoolId, sessions]);

  const handleLogoutClick = async () => {
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

    addSystemLog({
      type: 'School Admin Sign-Out',
      schoolId: currentSchool.id,
      gps: 'N/A',
      device: deviceStr,
      details: `School administrator logged out from ${currentSchool.name}.`
    });

    const sessId = localStorage.getItem('vmk_current_school_session_id');
    if (sessId) {
      try {
        await deleteSession(sessId);
      } catch (err) {
        console.warn("Failed to delete session on backend:", err);
      }
    }

    localStorage.removeItem('vmk_current_school_session_id');
    localStorage.removeItem('vmk_token');
    setSchoolId('');
  };

  const handleCoordinateClick = (gps) => {
    const [latStr, lngStr] = gps.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterCoords({ lat, lng });
      setActiveSubTab('dashboard');
      setTimeout(() => {
        const mapEl = document.getElementById('map-section');
        if (mapEl) {
          mapEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }
  };

  useEffect(() => {
    if (schoolId && schools.length === 0) {
      const timer = setTimeout(() => {
        setShowSyncError(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [schoolId, schools.length]);

  // Verify school exists and is approved
  if (schoolId && schools.length === 0) {
    return (
      <div className="container" style={{ padding: '8rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: 'calc(100vh - 70px)', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--accent-blue)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Synchronizing your secure session...</p>
        {showSyncError && (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Connection to safety server is taking longer than expected.
            </p>
            <button 
              onClick={() => {
                localStorage.removeItem('vmk_logged_school_id');
                localStorage.removeItem('vmk_token');
                setSchoolId('');
              }} 
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Return to Sign-in Screen
            </button>
          </div>
        )}
      </div>
    );
  }

  const currentSchool = schools.find(s => s.id === schoolId);
  if (!currentSchool) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--accent-red)', marginBottom: '1.5rem' }} />
        <h2>School Session Missing</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please select or register a school first in the Landing portal.</p>
      </div>
    );
  }

  // School calculations
  const schoolParents = parents.filter(p => (p.schoolId === schoolId || p.pendingSchoolId === schoolId) && p.status !== 'DELETED');
  const schoolStudentsCount = schoolParents.filter(p => p.schoolId === schoolId).reduce((acc, p) => acc + p.children.length, 0);
  const schoolGuardians = guardians.filter(g => g.schoolId === schoolId);
  const schoolLogs = logs.filter(l => l.schoolId === schoolId);
  const schoolAlerts = activeAlerts.filter(a => a.schoolId === schoolId && !a.acknowledgedBySchoolAdmin);
  
  const todayStr = new Date().toDateString();
  const todayPickups = schoolLogs.filter(l => {
    return l.status === 'VERIFIED' && new Date(l.timestamp).toDateString() === todayStr;
  }).length;

  const isRead = (n) => (n.readBy && n.readBy.includes(schoolId)) || n.read || n.isRead;
  const unreadCount = notifications.filter(n => n.recipientId === schoolId && !isRead(n)).length;

  const isTrialActive = currentSchool?.subscriptionStatus === 'FREE_TRIAL' && 
                        currentSchool?.trialExpiresAt && 
                        new Date(currentSchool.trialExpiresAt) > new Date();

  // Billing desk calculations
  const schoolPayments = payments.filter(pay => pay.schoolId === schoolId);
  const paidChildrenCount = schoolPayments.reduce((acc, pay) => acc + pay.childrenCount, 0);
  const unpaidChildrenCount = isTrialActive ? 0 : Math.max(0, schoolStudentsCount - paidChildrenCount);
  const amountDue = isTrialActive ? 0 : unpaidChildrenCount * 3600;

  if (currentSchool.status !== 'APPROVED') {
    const isSuspended = currentSchool.status === 'SUSPENDED';
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '2.5rem 2rem', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <AlertCircle size={48} style={{ color: isSuspended ? 'var(--accent-red)' : 'var(--accent-yellow)', margin: '0 auto 1rem auto' }} />
            <h2>{currentSchool.name} - Account {isSuspended ? 'Suspended' : 'Pending Approval'}</h2>
          </div>
          
          {isSuspended ? (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Your school's free trial has expired and your account has been automatically suspended. 
                Please settle the outstanding SaaS licensing invoice below to instantly reactivate access.
              </p>
              
              {isProcessingPayment ? (
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ border: '3px solid rgba(16, 185, 129, 0.1)', borderTop: '3px solid var(--accent-green)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 1.5rem auto', animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>Authorizing payment invoice...</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.4rem' }}>Verifying 256-bit cryptotoken with gateway</div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (payMethod === 'CARD') {
                    if (cardNo.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || cardPin.length < 4) {
                      alert("Please enter valid credit card details.");
                      return;
                    }
                  } else {
                    if (bankSender.trim() === '' || bankRef.length < 10) {
                      alert("Please enter sender bank/name and 10-digit transfer reference.");
                      return;
                    }
                  }
                  setIsProcessingPayment(true);
                  setTimeout(() => {
                    recordPayment(schoolId, amountDue, unpaidChildrenCount);
                    setIsProcessingPayment(false);
                    alert(`PAYMENT SUCCESSFUL! ₦${amountDue.toLocaleString()} received via ${payMethod === 'CARD' ? 'Card' : 'Bank Transfer'}. School account has been unsuspended immediately.`);
                  }, 50);
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>INVOICE SUMMARY:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#fff', marginTop: '0.2rem' }}>{currentSchool.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Unlicensed Students: <strong>{unpaidChildrenCount} child(ren)</strong>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                        ₦{amountDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Toggle */}
                  <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setPayMethod('CARD')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        background: payMethod === 'CARD' ? 'var(--accent-blue)' : 'transparent',
                        color: payMethod === 'CARD' ? '#000' : 'var(--text-secondary)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      💳 Card Payment
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayMethod('BANK')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        background: payMethod === 'BANK' ? 'var(--accent-blue)' : 'transparent',
                        color: payMethod === 'BANK' ? '#000' : 'var(--text-secondary)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      🏦 Bank Transfer
                    </button>
                  </div>

                  {payMethod === 'CARD' ? (
                    <>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Card Number (16 Digits)</label>
                        <input
                          type="text"
                          required
                          maxLength="16"
                          placeholder="4000 1234 5678 9010"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value.replace(/\D/g, ''))}
                          className="input-control"
                          id="suspended-cardno"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Expiry (MM/YY)</label>
                          <input
                            type="text"
                            required
                            maxLength="5"
                            placeholder="12/29"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="input-control"
                            id="suspended-expiry"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>CVV</label>
                          <input
                            type="password"
                            required
                            maxLength="3"
                            placeholder="•••"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="input-control"
                            id="suspended-cvv"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Card PIN (4 Digits)</label>
                        <input
                          type="password"
                          required
                          maxLength="4"
                          placeholder="••••"
                          value={cardPin}
                          onChange={(e) => setCardPin(e.target.value.replace(/\D/g, ''))}
                          className="input-control"
                          id="suspended-pin"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>BANK TRANSFER DETAILS:</div>
                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#fff', lineHeight: '1.5' }}>
                          <div>Bank Name: <strong>StanbicIBTC</strong></div>
                          <div>Account Name: <strong>Triang Technologies</strong></div>
                          <div>Account Number: <strong>0084226773</strong></div>
                          <div style={{ color: 'var(--accent-yellow)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Please transfer the exact amount and enter transfer reference below.</div>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Sender Name / Bank Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Greenwood Academy / GTBank"
                          value={bankSender}
                          onChange={(e) => setBankSender(e.target.value)}
                          className="input-control"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Transaction Reference Number (10 Digits) *</label>
                        <input
                          type="text"
                          required
                          maxLength="10"
                          placeholder="e.g. 9982746153"
                          value={bankRef}
                          onChange={(e) => setBankRef(e.target.value.replace(/\D/g, ''))}
                          className="input-control"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', outline: 'none' }}
                        />
                      </div>
                    </>
                  )}

                  <button 
                    type="submit" 
                    className="btn" 
                    style={{ width: '100%', padding: '0.8rem', background: 'var(--accent-green)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <CreditCard size={18} /> Pay & Reactivate Account
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', lineHeight: '1.6' }}>
              This school status is currently: <strong>{currentSchool.status}</strong>. 
              Please switch to the <strong>Super Admin</strong> persona to review and approve the school registration.
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleAddGuardian = async (e) => {
    e.preventDefault();
    if (!guardianForm.name || !guardianForm.busNumber) return;
    
    try {
      const newG = await addGuardian(schoolId, guardianForm);
      setGeneratedCreds({
        name: newG.name,
        password: guardianForm.password,
        id: newG.id
      });
      
      // Clear form
      setGuardianForm({
        name: '', phone: '', busNumber: '', driverName: '', plateNumber: '', assignedRoute: '',
        password: '',
        profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      });
    } catch (err) {
      alert(err.message || 'Failed to add guardian.');
    }
  };

  const handleExportCSV = () => {
    const headers = ["Time", "Verification Event", "Parent", "Children", "Bus Guardian", "Status", "GPS Coordinate", "Details"];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.type,
      l.parentName,
      l.childName,
      l.guardianName,
      l.status,
      l.gps,
      l.details
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_audit_logs_${schoolId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `security_audit_logs_${schoolId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAuditTrails = () => {
    const printWindow = window.open('', '_blank');
    const logsHTML = filteredLogs.map(l => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px;">${new Date(l.timestamp).toLocaleString()}</td>
        <td style="padding: 8px;"><b>${l.type}</b></td>
        <td style="padding: 8px;">${l.parentName}<br/><small style="color:#666;">Kids: ${l.childName}</small></td>
        <td style="padding: 8px;">${l.guardianName}</td>
        <td style="padding: 8px;">
          ${(() => {
            const p = parents.find(x => x.name === l.parentName);
            if (p && p.status === 'SUSPENDED') return '<span style="color: red; font-weight: bold;">Suspended</span>';
            return l.status;
          })()}
        </td>
        <td style="padding: 8px; font-family: monospace;">${l.gps}</td>
        <td style="padding: 8px; color: #555;">${l.details}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>VerifyMyKid - Security Audit Trails - ${currentSchool.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; text-align: left; padding: 10px; }
            th { background-color: #f2f2f2; }
            h1 { font-size: 1.5rem; margin-bottom: 5px; }
            p { font-size: 0.9rem; color: #555; margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Security Audit Trails</h1>
          <p>School: <b>${currentSchool.name}</b> (ID: ${currentSchool.id}) | Printed: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Parent & Children</th>
                <th>Bus Guardian</th>
                <th>Status</th>
                <th>GPS</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${logsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUpdateSchoolPassword = async (e) => {
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
      await updateSchoolProfile(currentSchool.id, { 
        password: newPasswordVal, 
        currentPassword: currentPasswordVal 
      });
      setSettingsSuccess("Password updated successfully!");
      setCurrentPasswordVal('');
      setNewPasswordVal('');
      setConfirmPasswordVal('');

      addSystemLog({
        type: 'School Profile Settings Update',
        schoolId: currentSchool.id,
        details: `School administrator for ${currentSchool.name} successfully updated their account password.`
      });
    } catch (err) {
      setSettingsError(err.message || "Failed to update password.");
    }
  };

  // Filter logs logic
  const filteredLogs = schoolLogs.filter(l => {
    const matchesSearch = 
      l.parentName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.childName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.guardianName.toLowerCase().includes(filterSearch.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    
    let matchesDate = true;
    if (filterDate) {
      const logDate = new Date(l.timestamp);
      const filterDateObj = new Date(filterDate);
      matchesDate = 
        logDate.getFullYear() === filterDateObj.getFullYear() &&
        logDate.getMonth() === filterDateObj.getMonth() &&
        logDate.getDate() === filterDateObj.getDate();
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <main className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <School style={{ color: 'var(--accent-blue)' }} size={28} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold' }}>Analytics Dashboard</h1>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              School: <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{currentSchool.name}</span>
            </span>
          </div>
        </div>

        {/* Sub Nav Header Wrapper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', overflow: 'hidden' }}>
          {/* Sub Nav */}
          <div className="portal-tabs-container" style={{ flex: 1 }}>
            <button className={`role-tab ${activeSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSubTab('dashboard')}>Overview</button>
            <button className={`role-tab ${activeSubTab === 'fleet' ? 'active' : ''}`} onClick={() => setActiveSubTab('fleet')}>Fleet Management</button>
            <button className={`role-tab ${activeSubTab === 'master-qr' ? 'active' : ''}`} onClick={() => setActiveSubTab('master-qr')}>Master QR Desk</button>
            <button className={`role-tab ${activeSubTab === 'parents' ? 'active' : ''}`} onClick={() => setActiveSubTab('parents')}>Parents Directory</button>
            <button className={`role-tab ${activeSubTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveSubTab('logs')}>Verification Reports</button>
            <button className={`role-tab ${activeSubTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveSubTab('billing')}>
              Billing Desk {amountDue > 0 && <span style={{ marginLeft: '4px', background: 'var(--accent-red)', color: 'white', padding: '1px 6px', borderRadius: '50%', fontSize: '0.65rem', fontWeight: 'bold' }}>!</span>}
            </button>
            <button className={`role-tab ${activeSubTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveSubTab('notifications')}>Messages Desk</button>
            <button className={`role-tab ${activeSubTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveSubTab('settings')}>Settings</button>
          </div>

          {/* Notification Bell */}
          <button 
            onClick={() => setActiveSubTab('notifications')} 
            className="btn btn-outline"
            style={{ 
              position: 'relative', 
              padding: '0.6rem', 
              borderRadius: '50%', 
              minWidth: '42px', 
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: activeSubTab === 'notifications' ? 'var(--accent-blue)' : 'var(--glass-border)'
            }}
            id="school-notifications-bell"
            title="School Inbox Messages"
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

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="btn btn-outline"
            style={{ 
              padding: '0.6rem', 
              borderRadius: '50%', 
              minWidth: '42px', 
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'var(--glass-border)',
              marginRight: '0.5rem'
            }}
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            id="btn-portal-theme-toggle"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogoutClick} 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} 
            id="btn-school-logout"
          >
            <LogOut size={16} style={{ color: 'var(--accent-red)' }} /> Logout
          </button>
        </div>
      </div>

      {/* Overview stats cards */}
      {activeSubTab === 'dashboard' && (
        <div>
          {/* Outstanding Invoice Warning Banner */}
          {amountDue > 0 && (
            <div className="glass-card animate-pulse" style={{ marginBottom: '2rem', border: '1.5px solid var(--accent-red)', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--accent-red)', fontSize: '1rem', fontWeight: 'bold' }}>Outstanding SaaS Invoice Balance</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your school has <strong>{unpaidChildrenCount}</strong> student license(s) pending verification payments (charged at ₦3,600/child). Outstanding balance: <strong style={{ color: 'var(--accent-cyan)' }}>₦{amountDue.toLocaleString()}</strong>.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSubTab('billing')} 
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
              >
                💳 Pay Outstanding Invoice Now
              </button>
            </div>
          )}

          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assigned Parents</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '0.2rem' }} id="school-parents-count">{schoolParents.filter(p => p.schoolId === schoolId).length}</div>
                </div>
                <Users size={24} style={{ color: 'var(--accent-blue)' }} />
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Enrolled Students</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '0.2rem' }} id="school-students-count">{schoolStudentsCount}</div>
                </div>
                <Users size={24} style={{ color: 'var(--accent-cyan)' }} />
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Bus Guardians</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '0.2rem' }} id="school-guardians-count">{schoolGuardians.length}</div>
                </div>
                <Bus size={24} style={{ color: 'var(--accent-yellow)' }} />
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verifications Today</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '0.2rem' }} id="school-today-verifications">{todayPickups}</div>
                </div>
                <School size={24} style={{ color: 'var(--accent-green)' }} />
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          {schoolAlerts.length > 0 && (
            <div className="glass-card pulse-emergency" style={{ marginBottom: '2rem', background: 'rgba(239, 68, 68, 0.08)' }}>
              <h3 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '1rem' }}>
                <AlertCircle /> Active School Transportation Emergencies
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {schoolAlerts.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1622', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-red)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{a.type} - {a.busNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Bus Guardian: {a.guardianName} | GPS: {a.gps} | Time: {new Date(a.timestamp).toLocaleTimeString()}
                      </div>
                      {a.note && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.1rem', color: 'var(--text-muted)' }}>"{a.note}"</div>}
                    </div>
                    <button 
                      onClick={() => {
                        setConfirmDialog({
                          title: "Clear Emergency Alert",
                          message: `Are you sure you want to acknowledge and clear this emergency panic report for ${a.busNumber}?`,
                          onConfirm: () => acknowledgePanicSchoolAdmin(a.id)
                        });
                      }} 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                    >
                      Acknowledge & Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map and Fleet summary */}
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            <div className="col-span-2">
              <div className="glass-card" id="map-section" style={{ height: '100%' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Live Bus Tracking Map</h3>
                <GoogleMapView schoolIdFilter={schoolId} centerCoords={mapCenterCoords} />
              </div>
            </div>

            <div>
              <div className="glass-card" style={{ height: '100%' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Bus Route Statuses</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {schoolGuardians.map(g => {
                    const isAlert = schoolAlerts.some(a => a.guardianId === g.id);
                    return (
                      <div key={g.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <span>{g.busNumber}</span>
                          {isAlert ? (
                            <span className="badge badge-danger">SOS Panic</span>
                          ) : (
                            <span className="badge badge-success">On Route</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Route: {g.assignedRoute.slice(9)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Driver: {g.driverName} | Coordinates: {g.lastLocation?.lat || g.lat || 'N/A'}, {g.lastLocation?.lng || g.lng || 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Management Panel */}
      {activeSubTab === 'fleet' && (
        <div>
          {/* Generated credentials modal */}
          {generatedCreds && (
            <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', marginBottom: '1.5rem', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-green)', marginBottom: '0.5rem' }}>
                Bus Guardian Added Successfully! Login Credentials Generated:
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <strong>Bus Guardian ID:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{generatedCreds.id}</code><br />
                <strong>Sign-in Name:</strong> <code>{generatedCreds.name}</code><br />
                <strong>Default Password:</strong> <code>{generatedCreds.password}</code>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                The bus guardian can now login using these details on the <strong>Bus Guardian</strong> device view.
              </p>
              <button onClick={() => setGeneratedCreds(null)} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                Dismiss Credentials
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Fleet & Bus Guardian Registrations</h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="btn btn-primary"
              id="btn-toggle-add-guardian"
            >
              <Plus size={16} /> {showAddForm ? 'Hide Bus Guardian Form' : 'Add New Bus Guardian'}
            </button>
          </div>

          <div className="grid-3" style={{ alignItems: 'start' }}>
            {showAddForm && (
              <div className="glass-card col-span-1">
                <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>
                  New Bus Guardian Details
                </h4>
                <form onSubmit={handleAddGuardian}>
                  <div className="form-group">
                    <label>Bus Guardian Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Robert Vance"
                      value={guardianForm.name}
                      onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value, driverName: e.target.value })}
                      className="input-control"
                      id="guardian-add-name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bus Number / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bus 12A"
                      value={guardianForm.busNumber}
                      onChange={(e) => setGuardianForm({ ...guardianForm, busNumber: e.target.value })}
                      className="input-control"
                      id="guardian-add-busno"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bus License Plate *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MA-992-KID"
                      value={guardianForm.plateNumber}
                      onChange={(e) => setGuardianForm({ ...guardianForm, plateNumber: e.target.value })}
                      className="input-control"
                      id="guardian-add-plate"
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Route Route *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Route A: Brookline to School"
                      value={guardianForm.assignedRoute}
                      onChange={(e) => setGuardianForm({ ...guardianForm, assignedRoute: e.target.value })}
                      className="input-control"
                      id="guardian-add-route"
                    />
                  </div>

                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 617-xxx-xxxx"
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                      className="input-control"
                      id="guardian-add-phone"
                    />
                  </div>

                  <div className="form-group">
                    <label>Access Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Access Password"
                      value={guardianForm.password}
                      onChange={(e) => setGuardianForm({ ...guardianForm, password: e.target.value })}
                      className="input-control"
                      id="guardian-add-pass"
                    />
                  </div>

                  <div className="form-group">
                    <label>Upload Profile Picture *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setGuardianForm(prev => ({
                              ...prev,
                              profilePic: reader.result // Base64 data URL
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="input-control"
                      style={{ padding: '0.3rem' }}
                      id="guardian-add-pic-file"
                      required
                    />
                    {guardianForm.profilePic && guardianForm.profilePic.startsWith('data:') && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--accent-cyan)' }}>
                          <img src={guardianForm.profilePic} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Image loaded successfully</span>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-success" style={{ width: '100%' }} id="btn-submit-add-guardian">
                    Generate Bus Guardian Credentials
                  </button>
                </form>
              </div>
            )}

            <div className={showAddForm ? "col-span-2" : "col-span-3"}>
              <div className="glass-card">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>Profile</th>
                      <th style={{ padding: '0.5rem' }}>Bus Guardian Name</th>
                      <th style={{ padding: '0.5rem' }}>Bus & Driver Info</th>
                      <th style={{ padding: '0.5rem' }}>Assigned Transit Route</th>
                      <th style={{ padding: '0.5rem' }}>Phone Number</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolGuardians.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="guardian-row" id={`guardian-row-${g.id}`}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--glass-border)' }}>
                            <img src={g.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>
                          {g.name}
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: {g.id}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong>{g.busNumber}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Driver: {g.driverName} | Plate: {g.plateNumber}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{g.assignedRoute}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>{g.phone}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {(g.status || 'ACTIVE') === 'SUSPENDED' ? (
                            <span className="badge badge-danger">Suspended</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            {(g.status || 'ACTIVE') === 'SUSPENDED' ? (
                              <button 
                                onClick={() => {
                                  setConfirmDialog({
                                    title: "Unsuspend Bus Guardian",
                                    message: `Are you sure you want to unsuspend Bus Guardian ${g.name}? They will regain access to their terminal.`,
                                    onConfirm: () => {
                                      updateGuardianStatus(g.id, 'ACTIVE');
                                      addSystemLog({
                                        type: 'Bus Guardian Unsuspended',
                                        schoolId,
                                        guardianName: g.name,
                                        details: `School administrator for ${currentSchool.name} unsuspended Bus Guardian ${g.name}.`
                                      });
                                    }
                                  });
                                }} 
                                className="btn btn-success" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  setConfirmDialog({
                                    title: "Suspend Bus Guardian",
                                    message: `Are you sure you want to suspend Bus Guardian ${g.name}? They will be blocked from logging into their terminal.`,
                                    onConfirm: () => {
                                      updateGuardianStatus(g.id, 'SUSPENDED');
                                      addSystemLog({
                                        type: 'Bus Guardian Suspended',
                                        schoolId,
                                        guardianName: g.name,
                                        details: `School administrator for ${currentSchool.name} suspended Bus Guardian ${g.name}.`
                                      });
                                    }
                                  });
                                }} 
                                className="btn btn-danger" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                              >
                                Suspend
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                  setConfirmDialog({
                                    title: "Delete Bus Guardian",
                                    message: `Are you sure you want to permanently delete Bus Guardian ${g.name}? This action is irreversible.`,
                                    onConfirm: () => {
                                      deleteGuardian(g.id);
                                      addSystemLog({
                                        type: 'Bus Guardian Deleted',
                                        schoolId,
                                        guardianName: g.name,
                                        details: `School administrator for ${currentSchool.name} deleted Bus Guardian ${g.name}.`
                                      });
                                    }
                                  });
                              }} 
                              className="btn btn-danger" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Logs SubTab */}
      {activeSubTab === 'logs' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>School Verification Audit Trails</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={handleExportCSV} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.25rem' }}>CSV</button>
              <button onClick={handleExportJSON} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.25rem' }}>JSON</button>
              <button onClick={handlePrintAuditTrails} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.25rem' }}>🖨️ Print</button>
            </div>
            
            {/* Search Filter Widgets */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search parent/kid/bus guardian..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="input-control"
                  style={{ paddingRight: '2rem', fontSize: '0.8rem', width: '220px', height: '34px' }}
                  id="logs-search-box"
                />
                <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
              </div>

              <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="input-control"
                  style={{ fontSize: '0.8rem', height: '34px', width: '130px' }}
                  id="logs-date-filter"
                />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate('')} 
                    className="btn btn-outline" 
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', height: '34px' }}
                    title="Show All Dates"
                  >
                    Clear
                  </button>
                )}
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-control"
                style={{ fontSize: '0.8rem', height: '34px', width: '130px' }}
                id="logs-status-filter"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="UNRECOGNIZED">Unrecognized</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem' }}>Date & Time</th>
                  <th style={{ padding: '0.5rem' }}>Verification Event</th>
                  <th style={{ padding: '0.5rem' }}>Parent & Children</th>
                  <th style={{ padding: '0.5rem' }}>Assigned Bus Guardian</th>
                  <th style={{ padding: '0.5rem' }}>Verification Status</th>
                  <th style={{ padding: '0.5rem' }}>GPS Coordinate</th>
                  <th style={{ padding: '0.5rem' }}>Terminal Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="school-log-row">
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>
                      {log.type}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {log.parentName}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kids: {log.childName}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.guardianName}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {(() => {
                        const parent = parents.find(p => p.name === log.parentName);
                        if (parent && parent.status === 'SUSPENDED') {
                          return <span className="badge badge-danger">Suspended</span>;
                        }
                        if (log.status === 'VERIFIED') return <span className="badge badge-success">Verified</span>;
                        if (log.status === 'UNRECOGNIZED') return <span className="badge badge-danger">Unrecognized</span>;
                        if (log.status === 'PANIC ALERT') return <span className="badge badge-warning" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>SOS</span>;
                        return null;
                      })()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <button
                        onClick={() => handleCoordinateClick(log.gps)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          textDecoration: 'underline',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.75rem'
                        }}
                      >
                        {log.gps}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {log.details}
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Device: {log.device}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Messages Desk SubTab */}
      {activeSubTab === 'notifications' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} style={{ color: 'var(--accent-blue)' }} /> Communications & Messaging Desk
          </h3>
          
          <div className="grid-3" style={{ alignItems: 'start' }}>
            {/* Left Section: Composing Broadcasts */}
            <div className="col-span-1">
              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                  Send Notification
                </h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!notifRecipient || !notifTitle || !notifMessage) {
                    alert("Please select a recipient and enter both a subject and message.");
                    return;
                  }
                  
                  let recipientName = "User";
                  const pRecip = parents.find(x => x.id === notifRecipient);
                  const gRecip = guardians.find(x => x.id === notifRecipient);
                  if (pRecip) recipientName = pRecip.name;
                  if (gRecip) recipientName = gRecip.name;
                  if (notifRecipient === 'SUPER_ADMIN') recipientName = 'Super Administrator';

                  sendNotification(schoolId, currentSchool.name, notifRecipient, notifTitle, notifMessage);
                  setNotifRecipient('');
                  setNotifTitle('');
                  setNotifMessage('');
                  alert(`Message successfully delivered to ${recipientName}.`);
                }}>
                  <div className="form-group">
                    <label>Select Target Recipient *</label>
                    <select 
                      value={notifRecipient}
                      onChange={(e) => setNotifRecipient(e.target.value)}
                      className="input-control"
                      required
                      id="notif-recipient-select"
                    >
                      <option value="">-- Choose Recipient --</option>
                      <option value="SUPER_ADMIN">🚨 Super Administrator (Trust SaaS)</option>
                      <optgroup label="Parents">
                        {schoolParents.filter(p => p.schoolId === schoolId).map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Parent)</option>
                        ))}
                      </optgroup>
                      <optgroup label="Bus Guardians">
                        {schoolGuardians.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.busNumber})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Subject Topic *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Schedule adjustment, weather delay"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="input-control"
                      id="notif-subject-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Detailed Message *</label>
                    <textarea
                      required
                      placeholder="Type official notification contents..."
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="input-control"
                      style={{ minHeight: '120px', resize: 'none' }}
                      id="notif-message-input"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} id="btn-broadcast-notif">
                    Broadcast Notification
                  </button>
                </form>
              </div>
            </div>

            {/* Right Section: Inbox of received parent/guardian alerts */}
            <div className="col-span-2">
              <div className="glass-card">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Safety Inbox (Incoming messages from parents/guardians)
                </h4>
                {notifications.filter(n => n.recipientId === schoolId).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Inbox is empty. No messages received.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.filter(n => n.recipientId === schoolId).slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(n => (
                      <div 
                        key={n.id} 
                        style={{ 
                          background: isRead(n) ? 'var(--bg-secondary)' : 'rgba(59, 130, 246, 0.12)', 
                          border: isRead(n) ? '1px solid var(--glass-border)' : '1px solid var(--accent-blue)', 
                          padding: '1rem', 
                          borderRadius: '10px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{n.title}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              From: {n.senderName}
                            </span>
                            {!isRead(n) && (
                              <button 
                                onClick={() => markNotificationRead(n.id, schoolId)}
                                className="btn btn-outline" 
                                style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                              >
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                          {n.message}
                        </p>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                          Time: {new Date(n.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parents Directory SubTab */}
      {activeSubTab === 'parents' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--accent-blue)' }} /> School Parents Directory & Enrolled Student Rosters
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search parents by name, phone, or child profile..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="input-control"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Parent Profile</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Spouse & Contact</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Enrolled Children</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Verification Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schoolParents.filter(p => 
                  p.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
                  p.phone.includes(parentSearch) ||
                  p.children.some(c => c.name.toLowerCase().includes(parentSearch.toLowerCase()))
                ).map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-blue)', flexShrink: 0 }}>
                          <img src={p.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {p.id} | Email: {p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      <div>Phone: {p.phone}</div>
                      {p.spouseName ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Spouse: {p.spouseName} ({p.spousePhone})
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single Parent</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {p.children.map((child, idx) => (
                          <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {child.name} (Age {child.age})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {p.pendingSchoolId === schoolId ? (
                        <span className="badge badge-warning" style={{ background: 'var(--accent-yellow)', color: '#000' }}>Pending Transfer</span>
                      ) : (
                        <>
                          {(p.status || 'APPROVED') === 'APPROVED' && <span className="badge badge-success">Active</span>}
                          {p.status === 'PENDING' && <span className="badge badge-warning">Pending Approval</span>}
                          {p.status === 'PENDING_VERIFICATION' && <span className="badge badge-outline" style={{ borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)' }}>Unverified Email</span>}
                          {p.status === 'SUSPENDED' && <span className="badge badge-danger">Suspended</span>}
                        </>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {p.pendingSchoolId === schoolId ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button 
                              onClick={() => {
                                setConfirmDialog({
                                  title: "Approve School Transfer",
                                  message: `Are you sure you want to approve transferring parent ${p.name} and their children to ${currentSchool.name}?`,
                                  onConfirm: () => {
                                    updateParentProfile(p.id, { 
                                      schoolId: schoolId, 
                                      pendingSchoolId: null, 
                                      status: 'APPROVED' 
                                    });
                                    sendNotification(
                                      schoolId, 
                                      currentSchool.name, 
                                      p.id, 
                                      'School Transfer Approved', 
                                      `Welcome to ${currentSchool.name}! Your school transfer is complete and parent dashboard is active.`
                                    );
                                    addSystemLog({
                                      type: 'Parent Transfer Approved',
                                      schoolId,
                                      parentName: p.name,
                                      details: `${currentSchool.name} approved transfer request for parent ${p.name}.`
                                    });
                                  }
                                });
                              }} 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-green)', borderColor: 'var(--accent-green)', color: '#000', fontWeight: 'bold' }}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmDialog({
                                  title: "Reject School Transfer",
                                  message: `Are you sure you want to reject transferring parent ${p.name} to ${currentSchool.name}?`,
                                  onConfirm: () => {
                                    updateParentProfile(p.id, { 
                                      pendingSchoolId: null
                                    });
                                    sendNotification(
                                      schoolId, 
                                      currentSchool.name, 
                                      p.id, 
                                      'School Transfer Rejected', 
                                      `Your school transfer request to ${currentSchool.name} was rejected by the school administration.`
                                    );
                                    addSystemLog({
                                      type: 'Parent Transfer Rejected',
                                      schoolId,
                                      parentName: p.name,
                                      details: `${currentSchool.name} rejected transfer request for parent ${p.name}.`
                                    });
                                  }
                                });
                              }} 
                              className="btn btn-danger" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-red)', borderColor: 'var(--accent-red)', color: '#fff' }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <>
                            {p.status === 'PENDING' && (
                              <button 
                                onClick={() => {
                                  const realUnpaid = Math.max(0, schoolStudentsCount - paidChildrenCount);
                                  if (!isTrialActive && realUnpaid > 0) {
                                    setConfirmDialog({
                                      title: "SaaS License Payment Required",
                                      message: `Your 1-month free trial has expired. To approve parent ${p.name}, you must settle your outstanding licensing balance of ₦${(realUnpaid * 3600).toLocaleString()} at the Billing Desk.`,
                                      confirmText: "Go to Billing Desk",
                                      isAlert: true,
                                      onConfirm: () => {
                                        setActiveSubTab('billing');
                                      }
                                    });
                                    return;
                                  }
                                  setConfirmDialog({
                                    title: "Approve Parent Account",
                                    message: `Are you sure you want to approve parent ${p.name}? They will gain immediate access to the Parent Portal.`,
                                    onConfirm: () => {
                                      setParentStatus(p.id, 'APPROVED');
                                      addSystemLog({
                                        type: 'Parent Access Approved',
                                        schoolId,
                                        parentName: p.name,
                                        details: `${currentSchool.name} approved parent access token for parent ${p.name}.`
                                      });
                                    }
                                  });
                                }} 
                                className="btn btn-success" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Approve Access
                              </button>
                            )}
                            {p.status === 'SUSPENDED' && (
                              <button 
                                onClick={() => {
                                  const realUnpaid = Math.max(0, schoolStudentsCount - paidChildrenCount);
                                  if (!isTrialActive && realUnpaid > 0) {
                                    setConfirmDialog({
                                      title: "SaaS License Payment Required",
                                      message: `Your 1-month free trial has expired. To unsuspend parent ${p.name}, you must settle your outstanding licensing balance of ₦${(realUnpaid * 3600).toLocaleString()} at the Billing Desk.`,
                                      confirmText: "Go to Billing Desk",
                                      isAlert: true,
                                      onConfirm: () => {
                                        setActiveSubTab('billing');
                                      }
                                    });
                                    return;
                                  }
                                  setConfirmDialog({
                                    title: "Unsuspend Parent Account",
                                    message: `Are you sure you want to unsuspend parent ${p.name}? They will regain access to their portal.`,
                                    onConfirm: () => {
                                      setParentStatus(p.id, 'APPROVED');
                                      addSystemLog({
                                        type: 'Parent Access Unsuspended',
                                        schoolId,
                                        parentName: p.name,
                                        details: `${currentSchool.name} unsuspended parent access token for parent ${p.name}.`
                                      });
                                    }
                                  });
                                }} 
                                className="btn btn-success" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Unsuspend
                              </button>
                            )}
                            {(p.status || 'APPROVED') === 'APPROVED' && (
                              <button 
                                onClick={() => {
                                  setConfirmDialog({
                                    title: "Suspend Parent Account",
                                    message: `Are you sure you want to suspend parent ${p.name}? They will be blocked from logging in.`,
                                    onConfirm: () => {
                                      setParentStatus(p.id, 'SUSPENDED');
                                      addSystemLog({
                                        type: 'Parent Access Suspended',
                                        schoolId,
                                        parentName: p.name,
                                        details: `${currentSchool.name} suspended parent access token for parent ${p.name}.`
                                      });
                                    }
                                  });
                                }} 
                                className="btn btn-danger" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                              >
                                Suspend
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setDeleteReasonInput('');
                                setConfirmDialog({
                                  title: "Delete Parent Profile",
                                  message: `Are you sure you want to delete parent ${p.name}? This will restrict their Parent Portal access and student profiles, but retain their billing context on the Super Admin control center.`,
                                  showInput: true,
                                  inputLabel: "Reason for Deletion *",
                                  inputPlaceholder: "Explain why this parent profile is being deleted...",
                                  confirmText: "Delete Parent",
                                  onConfirm: (reason) => {
                                    deleteParentBySchool(p.id, schoolId, currentSchool.name, reason);
                                    sendNotification(schoolId, currentSchool.name, 'SUPER_ADMIN', 'Parent Deleted by School', `School ${currentSchool.name} deleted parent ${p.name} (ID: ${p.id}). Reason: ${reason}`);
                                    addSystemLog({
                                      type: 'Parent Account Deleted by School',
                                      schoolId,
                                      parentName: p.name,
                                      details: `${currentSchool.name} deleted parent ${p.name} (ID: ${p.id}). Reason: ${reason}`
                                    });
                                  }
                                });
                              }}
                              className="btn btn-danger" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#e11d48', borderColor: '#e11d48', marginLeft: '0.4rem' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing Desk SubTab */}
      {activeSubTab === 'billing' && (() => {
        const schoolParents = parents.filter(p => p.schoolId === schoolId && p.status !== 'DELETED');
        const totalChildren = schoolParents.reduce((acc, p) => acc + p.children.length, 0);
        const schoolPayments = payments.filter(pay => pay.schoolId === schoolId);
        const paidChildrenCount = schoolPayments.reduce((acc, pay) => acc + pay.childrenCount, 0);
        const unpaidChildrenCount = isTrialActive ? 0 : Math.max(0, totalChildren - paidChildrenCount);
        const amountDue = isTrialActive ? 0 : unpaidChildrenCount * 3600;

        return (
          <div className="glass-card">
            {/* Term Renewal Schedule Indicator */}
            <div className="glass-card" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📅 Nigeria Per-Term Subscription Status
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Renewal period is per-term (3 months / 90 days). Expirations automatically suspend account access until invoice settlement.
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                  <div><strong>Account Status:</strong> <span className="badge" style={{
                    background: currentSchool.subscriptionStatus === 'FREE_TRIAL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: currentSchool.subscriptionStatus === 'FREE_TRIAL' ? 'var(--accent-blue)' : 'var(--accent-green)',
                    padding: '2px 8px',
                    marginLeft: '4px',
                    borderRadius: '4px',
                    border: '1px solid'
                  }}>{currentSchool.subscriptionStatus === 'FREE_TRIAL' ? 'Free Trial' : 'Verified'}</span></div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>Next Term Renewal Due:</strong> <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {currentSchool.subscriptionStatus === 'FREE_TRIAL' 
                        ? (currentSchool.trialExpiresAt ? new Date(currentSchool.trialExpiresAt).toLocaleDateString() : 'N/A') 
                        : (currentSchool.subscriptionExpires ? new Date(currentSchool.subscriptionExpires).toLocaleDateString() : 'N/A')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Registered Children</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem' }}>{totalChildren}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>All active parent accounts</div>
              </div>

              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fully Paid Licenses</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem', color: 'var(--accent-green)' }}>{paidChildrenCount}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>No balance remaining</div>
              </div>

              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Unpaid child profiles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem', color: amountDue > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>{unpaidChildrenCount}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Requires immediate invoice</div>
              </div>

              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Invoice Amount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem', color: amountDue > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  ₦{amountDue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>₦3,600 per student node</div>
              </div>
            </div>

            {/* Invoice checkout block */}
            <div style={{ display: 'grid', gridTemplateColumns: amountDue > 0 ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'start' }}>
              <div className="glass-card" style={{ border: amountDue > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: amountDue > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {amountDue > 0 ? '⚠️ Outstanding Invoice Balance' : '✓ License active & fully paid'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {amountDue > 0 
                    ? `Your school has registered new parent accounts or child profiles that have not yet been authorized. To ensure parents gain access to pick-up authorization QR codes, please pay the outstanding invoice of ₦${amountDue.toLocaleString()} (₦3,600 each for ${unpaidChildrenCount} children).`
                    : `Your school subscription and device location tracking nodes are currently active. All ${totalChildren} registered children have fully paid software node licenses.`
                  }
                </p>
              </div>

              {amountDue > 0 && (
                <div className="glass-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', background: 'rgba(16, 185, 129, 0.03)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--accent-green)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span>💳 SECURE ONLINE PAYMENT GATEWAY</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      <span>Billing Fee Rate:</span>
                      <strong style={{ color: '#fff' }}>₦3,600 per child</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      <span>Total Registered Children:</span>
                      <strong style={{ color: '#fff' }}>{totalChildren}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      <span>Paid Licenses:</span>
                      <strong style={{ color: 'var(--accent-green)' }}>{paidChildrenCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      <span>Unpaid Child Profiles:</span>
                      <strong style={{ color: 'var(--accent-yellow)' }}>{unpaidChildrenCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Total Outstanding Invoice:</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>₦{amountDue.toLocaleString()}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setCardNo('');
                      setCardExpiry('');
                      setCardCvv('');
                      setCardPin('');
                      setShowPayModal(true);
                    }}
                    className="btn btn-success animate-pulse" 
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    id="btn-trigger-payment-modal"
                  >
                    💳 Proceed to Make Online Payment
                  </button>
                </div>
              )}
            </div>

            {/* Historical Payment Log */}
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Payment & Billing Transactions History
              </h4>
              {schoolPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No payment history found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.5rem' }}>Transaction ID</th>
                        <th style={{ padding: '0.5rem' }}>Date & Time</th>
                        <th style={{ padding: '0.5rem' }}>Paid Amount</th>
                        <th style={{ padding: '0.5rem' }}>Children Nodes</th>
                        <th style={{ padding: '0.5rem' }}>Description</th>
                        <th style={{ padding: '0.5rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolPayments.map(pay => (
                        <tr key={pay.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{pay.id}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{new Date(pay.timestamp).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₦{pay.amount.toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{pay.childrenCount} student(s)</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{pay.details}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>SUCCESS</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Secure Paystack Checkout Modal Overlay */}
            {showPayModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(5, 7, 12, 0.85)',
                backdropFilter: 'blur(16px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}>
                <div className="glass-card" style={{ maxWidth: '420px', width: '100%', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-green)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span>💳 SECURE INVOICE CHECKOUT</span>
                    </div>
                    <button 
                      onClick={() => setShowPayModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>

                  {isProcessingPayment ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <div style={{ border: '3px solid rgba(16, 185, 129, 0.1)', borderTop: '3px solid var(--accent-green)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 1.5rem auto', animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>Authorizing payment invoice...</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.4rem' }}>Verifying 256-bit cryptotoken with gateway</div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (payMethod === 'CARD') {
                        if (cardNo.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || cardPin.length < 4) {
                          alert("Please enter valid credit card details.");
                          return;
                        }
                      } else {
                        if (bankSender.trim() === '' || bankRef.length < 10) {
                          alert("Please enter sender bank/name and 10-digit transfer reference.");
                          return;
                        }
                      }
                      setIsProcessingPayment(true);
                      setTimeout(() => {
                        recordPayment(schoolId, amountDue, unpaidChildrenCount);
                        setIsProcessingPayment(false);
                        setShowPayModal(false);
                        alert(`PAYMENT SUCCESSFUL! ₦${amountDue.toLocaleString()} received via ${payMethod === 'CARD' ? 'Card' : 'Bank Transfer'}. School licenses have been updated immediately.`);
                      }, 50);
                    }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>INVOICE PAYMENT FOR:</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>{currentSchool.name}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                          ₦{amountDue.toLocaleString()}
                        </div>
                      </div>

                      {/* Payment Method Toggle */}
                      <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setPayMethod('CARD')}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            background: payMethod === 'CARD' ? 'var(--accent-blue)' : 'transparent',
                            color: payMethod === 'CARD' ? '#000' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          💳 Card Payment
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setPayMethod('BANK')}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            background: payMethod === 'BANK' ? 'var(--accent-blue)' : 'transparent',
                            color: payMethod === 'BANK' ? '#000' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          🏦 Bank Transfer
                        </button>
                      </div>

                      {payMethod === 'CARD' ? (
                        <>
                          <div className="form-group">
                            <label>Card Number (16 Digits)</label>
                            <input
                              type="text"
                              required
                              maxLength="16"
                              placeholder="4000 1234 5678 9010"
                              value={cardNo}
                              onChange={(e) => setCardNo(e.target.value.replace(/\D/g, ''))}
                              className="input-control"
                              id="checkout-cardno"
                            />
                          </div>

                          <div className="grid-2">
                            <div className="form-group">
                              <label>Expiry (MM/YY)</label>
                              <input
                                type="text"
                                required
                                maxLength="5"
                                placeholder="12/29"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="input-control"
                                id="checkout-expiry"
                              />
                            </div>
                            <div className="form-group">
                              <label>CVV (3 Digits)</label>
                              <input
                                type="password"
                                required
                                maxLength="3"
                                placeholder="•••"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                className="input-control"
                                id="checkout-cvv"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Card PIN (4 Digits)</label>
                            <input
                              type="password"
                              required
                              maxLength="4"
                              placeholder="••••"
                              value={cardPin}
                              onChange={(e) => setCardPin(e.target.value.replace(/\D/g, ''))}
                              className="input-control"
                              id="checkout-pin"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>BANK TRANSFER DETAILS:</div>
                            <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#fff', lineHeight: '1.5' }}>
                              <div>Bank Name: <strong>StanbicIBTC</strong></div>
                              <div>Account Name: <strong>Triang Technologies</strong></div>
                              <div>Account Number: <strong>0084226773</strong></div>
                              <div style={{ color: 'var(--accent-yellow)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Please transfer the exact amount and enter transfer reference below.</div>
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Sender Name / Bank Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Greenwood Academy / GTBank"
                              value={bankSender}
                              onChange={(e) => setBankSender(e.target.value)}
                              className="input-control"
                            />
                          </div>

                          <div className="form-group">
                            <label>Transaction Reference Number (10 Digits) *</label>
                            <input
                              type="text"
                              required
                              maxLength="10"
                              placeholder="e.g. 9982746153"
                              value={bankRef}
                              onChange={(e) => setBankRef(e.target.value.replace(/\D/g, ''))}
                              className="input-control"
                            />
                          </div>
                        </>
                      )}

                      <button 
                        type="submit" 
                        className="btn btn-success" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', marginTop: '1rem' }}
                        id="btn-confirm-checkout"
                      >
                        🔒 Confirm Payment of ₦{amountDue.toLocaleString()}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {activeSubTab === 'master-qr' && (
        <div className="glass-card animate-fadeIn">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
            Master Campus QR Desk
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Generate and print a fixed Master QR code for your campus. Pasted on the wall of the school, it allows bus guardians to verify school bus arrival/departure coordinates using their mobile terminals.
          </p>

          {(!currentSchool.masterQrDownloadCount || currentSchool.masterQrDownloadCount === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📷</div>
              <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>No Master QR Registered Yet</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                Register your campus GPS coordinates now to generate your school's unique Master QR code.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  id="agree-gps-checkbox" 
                  checked={agreeLocationUse} 
                  onChange={(e) => setAgreeLocationUse(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="agree-gps-checkbox" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  I agree to let the platform use my current browser location to bind this Master QR
                </label>
              </div>

              <button 
                disabled={!agreeLocationUse}
                onClick={() => {
                  setConfirmDialog({
                    title: "Register Campus Coordinates",
                    message: "Do you agree to register your current browser GPS coordinates as the master campus compound location?",
                    onConfirm: () => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const { latitude, longitude } = position.coords;
                            registerMasterQrLocation(schoolId, latitude, longitude);
                            addSystemLog({
                              type: 'Master QR Created',
                              schoolId: schoolId,
                              gps: `${latitude}, ${longitude}`,
                              details: `School Admin initialized Master QR Code for ${currentSchool.name}.`
                            });
                          },
                          (error) => {
                            setConfirmDialog({
                              title: "Location Access Denied",
                              message: "Could not retrieve GPS coordinates. Please allow location permissions in your browser and try again.",
                              isAlert: true,
                              confirmText: "OK",
                              onConfirm: () => {}
                            });
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                      } else {
                        setConfirmDialog({
                          title: "Geolocation Unsupported",
                          message: "Your browser does not support geolocation tracking.",
                          isAlert: true,
                          confirmText: "OK",
                          onConfirm: () => {}
                        });
                      }
                    }
                  });
                }}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.5rem', opacity: agreeLocationUse ? 1 : 0.5 }}
                id="btn-generate-master-qr"
              >
                Generate Master QR
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* QR Display Card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1.5px solid var(--accent-cyan)' }}>
                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 25px rgba(0,0,0,0.4)', marginBottom: '1rem' }}>
                  {/* High Fidelity Mock QR Code SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 37 37" shapeRendering="crispEdges">
                    <path fill="#ffffff" d="M0 0h37v37H0z"/>
                    {/* Finder Pattern Top-Left */}
                    <path fill="#0f172a" d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2z"/>
                    {/* Finder Pattern Top-Right */}
                    <path fill="#0f172a" d="M30 0h7v7h-7zm1 1v5h5V1zm1 1h3v3H32z"/>
                    {/* Finder Pattern Bottom-Left */}
                    <path fill="#0f172a" d="M0 30h7v7H0zm1 1v5h5v-5zm1 1h3v3H2z"/>
                    {/* Alignment Pattern Bottom-Right */}
                    <path fill="#0f172a" d="M28 28h5v5h-5zm1 1v3h3v-3zm1 1h1v1h-1z"/>
                    {/* Timing Patterns */}
                    <path fill="#0f172a" d="M8 2h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zM2 8h1v1H2zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1z"/>
                    {/* High Density Realistic Mock Data Grid */}
                    <path fill="#0f172a" d="M8 8h2v1H8zm3 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm2 0h1v2h-1zm1-1h1v1h-1zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-16 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-17 2h2v1h-2zm4 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-16 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-18 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-18 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-14 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3z"/>
                    {/* Middle brand icon square container */}
                    <path fill="#ffffff" d="M14 14h9v9h-9z"/>
                    <path fill="var(--accent-blue)" d="M15 15h7v7h-7z"/>
                    <path fill="#ffffff" d="M18 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.5 5a2.5 2.5 0 0 1 5 0h-5z"/>
                  </svg>
                </div>
                <h4 style={{ fontSize: '1rem', color: '#fff', margin: '0 0 0.25rem 0' }}>{currentSchool.name}</h4>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '1rem' }}>
                  ID: {currentSchool.id} | MASTER QR TOKEN
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button 
                    onClick={() => {
                      setConfirmDialog({
                        title: "Confirm Location Bound QR Code",
                        message: "To download or print this Master QR, you must agree to let VerifyMyKid use your registered campus location to verify all scans. Do you agree?",
                        confirmText: "Agree & Print",
                        cancelText: "Cancel",
                        onConfirm: () => {
                          const printWindow = window.open('', '_blank');
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Print Master QR - ${currentSchool.name}</title>
                                <style>
                                  body { font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #000; }
                                  .qr-container { border: 4px solid #000; padding: 40px; display: inline-block; border-radius: 20px; margin-top: 50px; }
                                  h1 { font-size: 2rem; margin: 0 0 10px 0; }
                                  p { font-size: 1rem; color: #555; margin: 0 0 30px 0; }
                                  .footer { margin-top: 50px; font-size: 0.8rem; color: #999; }
                                </style>
                              </head>
                              <body>
                                <div class="qr-container">
                                  <h1>VerifyMyKid Campus QR</h1>
                                  <p>School Compound Arrival & Departure Verification Code</p>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 37 37" shapeRendering="crispEdges">
                                    <path fill="#ffffff" d="M0 0h37v37H0z"/>
                                    {/* Finder Pattern Top-Left */}
                                    <path fill="#000000" d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2z"/>
                                    {/* Finder Pattern Top-Right */}
                                    <path fill="#000000" d="M30 0h7v7h-7zm1 1v5h5V1zm1 1h3v3H32z"/>
                                    {/* Finder Pattern Bottom-Left */}
                                    <path fill="#000000" d="M0 30h7v7H0zm1 1v5h5v-5zm1 1h3v3H2z"/>
                                    {/* Alignment Pattern Bottom-Right */}
                                    <path fill="#000000" d="M28 28h5v5h-5zm1 1v3h3v-3zm1 1h1v1h-1z"/>
                                    {/* Timing Patterns */}
                                    <path fill="#000000" d="M8 2h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zM2 8h1v1H2zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1zm0 2h1v1h-1z"/>
                                    {/* High Density Realistic Mock Data Grid */}
                                    <path fill="#000000" d="M8 8h2v1H8zm3 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm2 0h1v2h-1zm1-1h1v1h-1zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-16 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-17 2h2v1h-2zm4 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-16 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-18 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-18 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-14 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm4 0h1v1h-1zm-19 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm2 1h1v1h-1zm-17 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3zm-15 2h2v1h-2zm3 0h1v1h-1zm1 0h2v1h-2zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h3v1h-3zm4 0h1v1h-1zm1-1h1v1h-1zm-18 2h1v1h-1zm3 0h2v1h-2zm2 0h1v2h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h3v1h-3z"/>
                                    {/* Middle brand icon square container */}
                                    <path fill="#ffffff" d="M14 14h9v9h-9z"/>
                                    <path fill="#1d4ed8" d="M15 15h7v7h-7z"/>
                                    <path fill="#ffffff" d="M18 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.5 5a2.5 2.5 0 0 1 5 0h-5z"/>
                                  </svg>
                                  <div style="margin-top: 30px; font-weight: bold; font-size: 1.2rem;">${currentSchool.name}</div>
                                  <div style="font-family: monospace; font-size: 0.9rem; color: #444; margin-top: 5px;">ID: ${currentSchool.id}</div>
                                </div>
                                <div class="footer">
                                  Secure QR cryptographic verification
                                </div>
                                <script>
                                  setTimeout(function() {
                                    window.print();
                                    window.close();
                                  }, 100);
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          setTimeout(() => {
                            try {
                              printWindow.focus();
                              printWindow.print();
                            } catch (e) {
                              console.error("Print popup blocked or failed", e);
                            }
                          }, 500);
                        }
                      });
                    }}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                  >
                    🖨️ Print wall poster
                  </button>
                </div>
              </div>

              {/* Security and Lock Configuration */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#fff', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', margin: 0 }}>
                  Master QR Security Status
                </h4>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status:</div>
                  {currentSchool.masterQrUnlocked ? (
                    <span className="badge badge-success" style={{ marginTop: '0.2rem' }}>✓ UNLOCKED FOR UPDATE</span>
                  ) : (
                    <span className="badge badge-danger" style={{ marginTop: '0.2rem' }}>🔒 LOCKED (Single-Download Active)</span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Registered Campus Locations:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {(currentSchool.masterQrLocations || []).map((loc, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Location {idx + 1}: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
                        <span style={{ color: 'var(--accent-green)' }}>Active</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allowable Campus Nodes:</div>
                  <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                    {currentSchool.masterQrLocations?.length || 0} / {currentSchool.masterQrMaxLocations || 1} Registered (Max: 3)
                  </strong>
                </div>

                {/* Locker Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {!currentSchool.masterQrUnlocked ? (
                    <>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            title: "Request QR Re-download Unlock",
                            message: "Are you sure you want to request permission to re-download or change your Master QR location from the Super Admin?",
                            onConfirm: () => {
                              requestMasterQrUnlock(schoolId, 'unlock_download');
                              sendNotification(schoolId, currentSchool.name, 'SUPER_ADMIN', 'Master QR Unlock Request', `School ${currentSchool.name} is requesting a Master QR re-download unlock.`);
                              addSystemLog({
                                type: 'Master QR Request Created',
                                schoolId: schoolId,
                                details: `${currentSchool.name} requested Master QR download unlock approval.`
                              });
                              setConfirmDialog({
                                title: "Request Submitted",
                                message: "Unlock request sent successfully! A Super Admin will review and authorize it shortly.",
                                isAlert: true,
                                confirmText: "OK",
                                onConfirm: () => {}
                              });
                            }
                          });
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%', borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)' }}
                      >
                        Request Unlock (Re-download)
                      </button>
                      
                      {(currentSchool.masterQrMaxLocations || 1) < 3 && (
                        <button 
                          onClick={() => {
                            setConfirmDialog({
                              title: "Request Multi-Location Node",
                              message: `Are you sure you want to request permission to support an additional campus scan location? (Current Max: ${currentSchool.masterQrMaxLocations || 1}, Allowed Limit: 3)`,
                              onConfirm: () => {
                                requestMasterQrUnlock(schoolId, 'multi_location');
                                sendNotification(schoolId, currentSchool.name, 'SUPER_ADMIN', 'Multi-Location QR Request', `School ${currentSchool.name} is requesting a multi-location Master QR upgrade.`);
                                addSystemLog({
                                  type: 'Master QR Request Created',
                                  schoolId: schoolId,
                                  details: `${currentSchool.name} requested multi-location Master QR capability.`
                                });
                                setConfirmDialog({
                                  title: "Request Submitted",
                                  message: "Multi-location request sent successfully! A Super Admin will review and authorize it shortly.",
                                  isAlert: true,
                                  confirmText: "OK",
                                  onConfirm: () => {}
                                });
                              }
                            });
                          }}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                        >
                          Request Multi-Location Node
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setConfirmDialog({
                          title: "Register Additional Campus Coordinates",
                          message: "Do you agree to register your current browser GPS coordinates as the next master campus location?",
                          onConfirm: () => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  const { latitude, longitude } = position.coords;
                                  registerMasterQrLocation(schoolId, latitude, longitude);
                                  addSystemLog({
                                    type: 'Master QR Location Added',
                                    schoolId: schoolId,
                                    gps: `${latitude}, ${longitude}`,
                                    details: `School Admin registered coordinates node ${latitude}, ${longitude} for Master QR code.`
                                  });
                                },
                                (error) => {
                                  setConfirmDialog({
                                    title: "Location Access Denied",
                                    message: "Could not retrieve GPS coordinates. Please allow location permissions in your browser and try again.",
                                    isAlert: true,
                                    confirmText: "OK",
                                    onConfirm: () => {}
                                  });
                                },
                                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                              );
                            }
                          }
                        });
                      }}
                      className="btn btn-success"
                      style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%' }}
                    >
                      ✓ Update QR & Register Next Location
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
            🔒 Security Settings & Password Update
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Update your school administrator portal credentials to keep verification telemetry secure.
          </p>

          {settingsError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }} id="school-settings-err">
              {settingsError}
            </div>
          )}
          {settingsSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }} id="school-settings-succ">
              {settingsSuccess}
            </div>
          )}

          <form onSubmit={handleUpdateSchoolPassword} style={{ maxWidth: '400px' }}>
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={currentPasswordVal}
                onChange={(e) => setCurrentPasswordVal(e.target.value)}
                className="input-control"
                id="school-settings-curr-pass"
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
                id="school-settings-new-pass"
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
                id="school-settings-conf-pass"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} id="btn-school-settings-update">
              Update Admin Password
            </button>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />

          {/* Active Devices Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', margin: 0 }}>
                  Active Devices & Sessions
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', margin: 0 }}>
                  Manage current sessions logged into this school admin portal.
                </p>
              </div>
              <button 
                onClick={() => {
                  setConfirmDialog({
                    title: "Delete Unrecognized Devices",
                    message: "Are you sure you want to terminate all session connections for this school flagged as unrecognized?",
                    onConfirm: () => {
                      deleteUnrecognizedSessions('SCHOOL_ADMIN', schoolId);
                      addSystemLog({
                        type: 'Sessions Cleanup',
                        schoolId: schoolId,
                        gps: 'N/A',
                        device: 'Console Command',
                        details: `School Admin terminated unrecognized device sessions for ${currentSchool.name}.`
                      });
                    }
                  });
                }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                id="btn-school-delete-unrecognized-sessions"
              >
                Delete Unrecognized Devices
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Device Name</th>
                    <th style={{ padding: '0.75rem' }}>IP Address</th>
                    <th style={{ padding: '0.75rem' }}>Last Login Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.filter(s => s.role === 'SCHOOL_ADMIN' && s.userId === schoolId).map(s => {
                    const isCurrent = s.id === currentSessionId;
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                          {s.deviceName} {isCurrent && <span className="badge badge-success" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Current</span>}
                        </td>
                        <td style={{ padding: '0.75rem' }}><code>{s.ipAddress}</code></td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(s.loginTime).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {s.status === 'ACTIVE' ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-danger">Frozen</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {isCurrent ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Active session</span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              {s.status === 'ACTIVE' && (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      title: "Freeze School Session",
                                      message: `Are you sure you want to freeze session ${s.id} (${s.deviceName})? The device will be logged out immediately and blocked.`,
                                      onConfirm: () => {
                                        freezeSession(s.id);
                                        addSystemLog({
                                          type: 'Session Frozen',
                                          schoolId: schoolId,
                                          gps: 'N/A',
                                          device: 'Security Console',
                                          details: `School Admin froze session ${s.id} for device ${s.deviceName}.`
                                        });
                                      }
                                    });
                                  }}
                                  className="btn btn-outline"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}
                                >
                                  Freeze
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    title: "Delete School Session",
                                    message: `Are you absolutely sure you want to delete session ${s.id} (${s.deviceName})? This forces an immediate log out.`,
                                    onConfirm: () => {
                                      deleteSession(s.id);
                                      addSystemLog({
                                        type: 'Session Deleted',
                                        schoolId: schoolId,
                                        gps: 'N/A',
                                        device: 'Security Console',
                                        details: `School Admin deleted session ${s.id} for device ${s.deviceName}.`
                                      });
                                    }
                                  });
                                }}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
          <div className="glass-card" style={{ 
            maxWidth: '400px', 
            width: '100%', 
            background: 'var(--bg-primary)', 
            border: '1px solid var(--glass-border)', 
            boxShadow: 'var(--glass-shadow)' 
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{confirmDialog.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            {confirmDialog.showInput && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                  {confirmDialog.inputLabel || 'Reason *'}
                </label>
                <textarea
                  required
                  placeholder={confirmDialog.inputPlaceholder || "Enter reason..."}
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  className="input-control"
                  style={{ width: '100%', fontSize: '0.8rem', resize: 'none', background: 'rgba(0,0,0,0.3)', borderColor: 'var(--glass-border)', color: '#fff', padding: '0.5rem', borderRadius: '6px' }}
                  rows={3}
                  id="confirm-dialog-reason-input"
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setConfirmDialog(null); setDeleteReasonInput(''); }}
                className="btn btn-outline" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                id="btn-confirm-no"
              >
                No, Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm(deleteReasonInput);
                  setConfirmDialog(null);
                  setDeleteReasonInput('');
                }}
                disabled={confirmDialog.showInput && !deleteReasonInput.trim()}
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1.25rem', fontSize: '0.8rem', opacity: (confirmDialog.showInput && !deleteReasonInput.trim()) ? 0.5 : 1 }}
                id="btn-confirm-yes"
              >
                {confirmDialog.confirmText || 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
