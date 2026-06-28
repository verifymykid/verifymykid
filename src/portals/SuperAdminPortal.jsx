import React, { useState, useEffect } from 'react';
import { Shield, School, Users, AlertOctagon, Bell, ListTodo, Map, Play, Activity, Lock, Unlock, Eye, EyeOff, ShieldAlert, CornerUpLeft, CreditCard, Mail, Key, Sun, Moon } from 'lucide-react';
import { useStore } from '../data/mockStore';
import GoogleMapView from '../components/GoogleMapView';

export default function SuperAdminPortal() {
  const { 
    schools, parents, guardians, logs, activeAlerts,
    approveSchool, rejectSchool, suspendSchool, deleteSchool, resolvePanic, acknowledgePanicSuperAdmin, addSystemLog,
    payments, notifications, markNotificationRead, sendNotification, broadcastNotification,
    sessions, sessionsLoaded, freezeSession, deleteSession, deleteUnrecognizedSessions, addSession,
    approveMasterQrRequest, rejectMasterQrRequest, activateSchoolTrial, extendSchoolPaymentDeadline, upliftSchoolTrial,
    smtpLogs: storeSmtpLogs
  } = useStore();

  // Secure admin session states
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('vmk_super_admin_logged') === 'true');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [loginStep, setLoginStep] = useState(1); // 1: credentials, 2: 2FA, 3: Forgot password, 4: Reset password
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Password reset states
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setResetSuccessMessage('');
    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io'}/api/auth/superadmin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || 'Failed to request password reset code.');
        return;
      }
      setResetSuccessMessage('A secure 6-digit reset code has been generated. Please check the SMTP simulated logs to retrieve it.');
      setLoginStep(4);
    } catch (err) {
      setLoginError('Server connection failed. Make sure backend is running.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (newPasswordInput !== confirmNewPasswordInput) {
      setLoginError('Passwords do not match.');
      return;
    }
    if (newPasswordInput.length < 6) {
      setLoginError('Password must be at least 6 characters.');
      return;
    }
    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io'}/api/auth/superadmin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resetCodeInput.trim(), password: newPasswordInput })
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || 'Failed to reset password.');
        return;
      }
      setResetSuccessMessage('Password reset successful! Please log in with your new password.');
      setLoginStep(1);
      setPasswordInput('');
      setResetCodeInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
    } catch (err) {
      setLoginError('Server connection failed. Make sure backend is running.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setResetSuccessMessage('');
    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io'}/api/auth/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput })
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || 'Invalid Administrator credentials.');
        return;
      }
      setLoginStep(2); // Proceed to 2FA verification
    } catch (err) {
      setLoginError('Server connection failed. Make sure backend is running.');
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io'}/api/auth/superadmin/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorInput.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || 'Incorrect 6-digit Security Authorization Key.');
        return;
      }
      const data = await res.json();
      localStorage.setItem('vmk_token', data.token);

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

      await addSystemLog({
        type: 'Super Admin Sign-In',
        gps: 'N/A',
        device: deviceStr,
        details: 'Super Administrator logged into safety management portal.'
      });

      const sessionObj = await addSession({
        userId: 'SUPER_ADMIN',
        role: 'SUPER_ADMIN',
        deviceName: `${browser} on ${os} (Current Device)`,
        ipAddress: '197.210.64.12',
        loginTime: new Date().toISOString(),
        status: 'ACTIVE'
      });
      localStorage.setItem('vmk_current_session_id', sessionObj.id);

      setIsLoggedIn(true);
      localStorage.setItem('vmk_super_admin_logged', 'true');

      setLoginError('');
      setLoginStep(1);
      setTwoFactorInput('');
    } catch (err) {
      setLoginError('Server connection failed. Make sure backend is running.');
    }
  };

  const handleLogout = async () => {
    addSystemLog({
      type: 'Super Admin Sign-Out',
      gps: 'N/A',
      device: 'Browser session terminated',
      details: 'Super Administrator signed out.'
    });

    const sessId = localStorage.getItem('vmk_current_session_id');
    if (sessId) {
      try {
        await deleteSession(sessId);
      } catch (err) {
        console.warn("Failed to delete session on backend:", err);
      }
    }

    setIsLoggedIn(false);
    localStorage.removeItem('vmk_super_admin_logged');
    localStorage.removeItem('vmk_current_session_id');
    setEmailInput('');
    setPasswordInput('');
    setTwoFactorInput('');
    setLoginStep(1);
    setLoginError('');
  };

  const [activeSubTab, setActiveSubTab] = useState('schools'); // 'schools' | 'map' | 'alerts' | 'logs' | 'notify'
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [mapCenterCoords, setMapCenterCoords] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedSchoolStats, setSelectedSchoolStats] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('vmk_theme_super_admin') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vmk_theme_super_admin', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  const [trialMonths, setTrialMonths] = useState(1);
  const [extendDays, setExtendDays] = useState(7);
  const currentSessionId = localStorage.getItem('vmk_current_session_id');

  // Monitor if active session gets frozen or deleted
  React.useEffect(() => {
    if (isLoggedIn && currentSessionId && sessionsLoaded) {
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
                handleLogout();
                setLoginError("Your session was terminated by an administrator.");
              }
            }
          } catch (err) {
            // Ignore fetch errors to prevent false-positives
          }
        };
        verifyAndLogout();
      } else if (currentSession.status === 'FROZEN') {
        handleLogout();
        setLoginError("Your session has been frozen by an administrator.");
      }
    }
  }, [sessions, isLoggedIn, currentSessionId, sessionsLoaded]);

  // Register current session if missing on load
  React.useEffect(() => {
    const registerSession = async () => {
      if (isLoggedIn && !localStorage.getItem('vmk_current_session_id')) {
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
          userId: 'SUPER_ADMIN',
          role: 'SUPER_ADMIN',
          deviceName: `${browser} on ${os} (Current Device)`,
          ipAddress: '197.210.64.12',
          loginTime: new Date().toISOString(),
          status: 'ACTIVE'
        });
        localStorage.setItem('vmk_current_session_id', sessionObj.id);
      }
    };
    registerSession();
  }, [isLoggedIn, sessions]);

  const handleCoordinateClick = (gps) => {
    const [latStr, lngStr] = gps.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterCoords({ lat, lng });
      setActiveSubTab('map');
    }
  };

  const handleTabChange = (tab) => {
    setActiveSubTab(tab);
    setSelectedSchoolId(null);
  };
  
  // Notification sender state
  const [notifyTarget, setNotifyTarget] = useState('all');
  const [notifyChannel, setNotifyChannel] = useState('web'); // default to web (In-App)
  const [notifyMessage, setNotifyMessage] = useState('');
  const [adFlyer, setAdFlyer] = useState(null);
  const [notifySent, setNotifySent] = useState(false);
  const [showSmtpLogs, setShowSmtpLogs] = useState(false);
  const [smtpLogs, setSmtpLogs] = useState([]);
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.verifymykid.com',
    port: '465',
    username: 'broadcast@verifymykid.com',
    password: 'password123',
    ssl: true
  });

  const pendingRequests = [];
  schools.forEach(s => {
    if (s.masterQrRequests && s.masterQrRequests.length > 0) {
      s.masterQrRequests.forEach(r => {
        if (r.status === 'PENDING') {
          pendingRequests.push({
            schoolId: s.id,
            schoolName: s.name,
            ...r
          });
        }
      });
    }
  });

  // Statistics calculations
  const totalSchools = schools.length;
  const approvedSchools = schools.filter(s => s.status === 'APPROVED').length;
  const pendingSchools = schools.filter(s => s.status === 'PENDING APPROVAL').length;
  const activeParentsList = parents.filter(p => p.status !== 'DELETED');
  const totalParents = activeParentsList.length;
  const totalChildren = activeParentsList.reduce((acc, p) => acc + (p.children ? p.children.length : 0), 0);
  const approvedParentsList = parents.filter(p => p.status === 'APPROVED');
  const approvedParents = approvedParentsList.length;
  const approvedChildren = approvedParentsList.reduce((acc, p) => acc + (p.children ? p.children.length : 0), 0);
  const pendingParents = parents.filter(p => p.status === 'PENDING' || p.status === 'PENDING_VERIFICATION').length;
  const totalGuardians = guardians.length;
  const todayStr = new Date().toDateString();
  const dailyVerifications = logs.filter(l => l.status === 'VERIFIED' && new Date(l.timestamp).toDateString() === todayStr).length;
  const totalVerifications = logs.filter(l => l.status === 'VERIFIED').length;

  const schoolActivity = schools.map(s => {
    const schoolVerifiedLogs = logs.filter(l => l.schoolId === s.id && l.status === 'VERIFIED');
    let days = 1;
    if (s.registeredAt) {
      const onboardDate = new Date(s.registeredAt);
      const today = new Date();
      const diffTime = Math.abs(today - onboardDate);
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    const cumulativeScans = schoolVerifiedLogs.length;
    const avgDailyScans = parseFloat((cumulativeScans / days).toFixed(2));
    return {
      ...s,
      cumulativeScans,
      avgDailyScans
    };
  });
  const sortedSchools = [...schoolActivity].sort((a, b) => b.cumulativeScans - a.cumulativeScans);
  const superAdminAlerts = activeAlerts.filter(a => !a.acknowledgedBySuperAdmin);
  const activeAlertCount = superAdminAlerts.length;

  const isRead = (n) => (n.readBy && n.readBy.includes('SUPER_ADMIN')) || n.read || n.isRead;
  const superAdminUnreadCount = notifications.filter(n => n.recipientId === 'SUPER_ADMIN' && !isRead(n)).length;

  const handleSendNotification = (e) => {
    e.preventDefault();
    if (!notifyMessage) return;

    let finalMessage = notifyMessage;
    if (adFlyer) {
      finalMessage = `FLYER::${adFlyer}::${notifyMessage}`;
    }

    if (notifyChannel === 'web') {
      // In-App Platform Message (Web) via efficient single Broadcast request
      broadcastNotification('SUPER_ADMIN', 'Platform Administrator', notifyTarget, 'Official Admin Broadcast', finalMessage);

      setNotifySent(true);
      setTimeout(() => {
        setNotifySent(false);
        setNotifyMessage('');
        setAdFlyer(null);
      }, 3000);
    } else if (notifyChannel === 'email') {
      // SMTP Email Broadcast simulation
      setShowSmtpLogs(true);
      setSmtpLogs([]);
      
      const logsSeq = [
        `Connecting to SMTP server ${smtpConfig.host}:${smtpConfig.port} via ${smtpConfig.ssl ? 'SSL/TLS' : 'Plaintext'}...`,
        `Connected to SMTP socket. Initiating Handshake (EHLO)...`,
        `250-smtp.verifymykid.com greetings. AUTH LOGIN PLAIN.`,
        `Authenticating with SMTP Server as ${smtpConfig.username}...`,
        `235 2.7.0 Authentication successful. Session secured.`,
        `Preparing recipient email lists for Audience: ${notifyTarget.toUpperCase()}...`,
        `MAIL FROM: <no-reply@verifymykid.com>`,
        `DATA transmission initiated...`,
        `Transmitting broadcast payload to recipients...`,
        `250 2.0.0 OK Message queued for SMTP delivery.`,
        `Closing SMTP connection (QUIT)...`,
        `SMTP Broadcast mail dispatch completed successfully.`
      ];

      logsSeq.forEach((logText, index) => {
        setTimeout(() => {
          setSmtpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logText}`]);
          if (index === logsSeq.length - 1) {
            setNotifySent(true);
            setNotifyMessage('');
            setAdFlyer(null);
            setTimeout(() => {
              setNotifySent(false);
            }, 3000);
          }
        }, (index + 1) * 450);
      });
    } else {
      // Push/SMS Mock fallback
      setNotifySent(true);
      setTimeout(() => {
        setNotifySent(false);
        setNotifyMessage('');
        setAdFlyer(null);
      }, 3000);
    }
  };

  const downloadSchoolJSON = (school, parentsList, guardiansList) => {
    const data = {
      school,
      parents: parentsList,
      guardians: guardiansList,
      payments: payments.filter(p => p.schoolId === school.id),
      logs: logs.filter(l => l.schoolId === school.id)
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${school.name.replace(/\s+/g, '_')}_dossier.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadSchoolCSV = (school, parentsList, guardiansList) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: School Profile
    csvContent += "=== SCHOOL PROFILE ===\n";
    csvContent += "ID,Name,Email,Phone,Address,Type,Subscription Status\n";
    csvContent += `"${school.id}","${school.name}","${school.email}","${school.phone}","${school.address}","${school.type}","${school.subscriptionStatus}"\n\n`;
    
    // Section 2: Parents
    csvContent += "=== REGISTERED PARENTS ===\n";
    csvContent += "Parent ID,Name,Email,Phone,Spouse Name,Spouse Phone,Status,Children Info,Delete Info\n";
    parentsList.forEach(p => {
      const childrenStr = p.children.map(c => `${c.name} (${c.age})`).join("; ");
      const deleteStr = p.status === 'DELETED' ? `Deleted by school: ${p.deletedBySchoolName} (Reason: ${p.deleteReason})` : '';
      csvContent += `"${p.id}","${p.name}","${p.email}","${p.phone}","${p.spouseName || ''}","${p.spousePhone || ''}","${p.status || 'APPROVED'}","${childrenStr}","${deleteStr}"\n`;
    });
    csvContent += "\n";
    
    // Section 3: Bus Guardians
    csvContent += "=== BUS GUARDIANS ===\n";
    csvContent += "Guardian ID,Name,Phone,Bus Number,Status\n";
    guardiansList.forEach(g => {
      csvContent += `"${g.id}","${g.name}","${g.phone}","${g.busNumber}","${g.status || 'ACTIVE'}"\n`;
    });
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `${school.name.replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadSchoolTXT = (school, parentsList, guardiansList) => {
    let txtContent = "data:text/plain;charset=utf-8,";
    txtContent += `==================================================\n`;
    txtContent += `       VERIFYMYKID SCHOOL DOSSIER REPORT          \n`;
    txtContent += `==================================================\n\n`;
    txtContent += `SCHOOL NAME: ${school.name}\n`;
    txtContent += `SCHOOL ID: ${school.id}\n`;
    txtContent += `EMAIL: ${school.email}\n`;
    txtContent += `PHONE: ${school.phone}\n`;
    txtContent += `ADDRESS: ${school.address}\n`;
    txtContent += `TYPE: ${school.type}\n`;
    txtContent += `SUBSCRIPTION: ${school.subscriptionStatus} (Expires: ${school.subscriptionExpires})\n`;
    txtContent += `STATUS: ${school.status}\n\n`;
    
    txtContent += `--------------------------------------------------\n`;
    txtContent += `REGISTERED PARENTS ROSTER (${parentsList.length})\n`;
    txtContent += `--------------------------------------------------\n`;
    parentsList.forEach(p => {
      const childrenStr = p.children.map(c => `${c.name} (${c.age})`).join(", ");
      txtContent += `Parent: ${p.name} (${p.id})\n`;
      txtContent += ` - Contact: ${p.email} | Phone: ${p.phone}\n`;
      if (p.spouseName) txtContent += ` - Spouse: ${p.spouseName} (${p.spousePhone})\n`;
      txtContent += ` - Children: ${childrenStr}\n`;
      txtContent += ` - Status: ${p.status || 'APPROVED'}\n`;
      if (p.status === 'DELETED') {
        txtContent += `   * DELETED BY: ${p.deletedBySchoolName || 'Unknown School'}\n`;
        txtContent += `   * REASON FOR DELETE: ${p.deleteReason || 'N/A'}\n`;
      }
      txtContent += `\n`;
    });
    
    txtContent += `--------------------------------------------------\n`;
    txtContent += `FLEET & BUS GUARDIANS (${guardiansList.length})\n`;
    txtContent += `--------------------------------------------------\n`;
    guardiansList.forEach(g => {
      txtContent += `Guardian: ${g.name} (${g.id})\n`;
      txtContent += ` - Contact: ${g.phone} | Bus No: ${g.busNumber}\n`;
      txtContent += ` - Status: ${g.status || 'ACTIVE'}\n\n`;
    });
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", txtContent);
    downloadAnchor.setAttribute("download", `${school.name.replace(/\s+/g, '_')}_report.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isLoggedIn) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div className="premium-login-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem auto', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <img src="/logo.jpg" alt="VerifyMyKid Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2>Super Admin Portal</h2>
          </div>

          {resetSuccessMessage && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
              {resetSuccessMessage}
            </div>
          )}

          {loginError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }} id="login-error-msg">
              {loginError}
            </div>
          )}

          {loginStep === 1 ? (
            <form onSubmit={handleLoginSubmit} onKeyDown={(e) => {
              if (e.getModifierState && e.getModifierState('CapsLock')) {
                setCapsLockActive(true);
              } else {
                setCapsLockActive(false);
              }
            }}>
              <div className="form-group">
                <label>Administrator Work Email</label>
                <input
                  type="email"
                  required
                  placeholder=""
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="input-underline"
                  id="admin-login-email"
                />
                <Mail className="input-icon" size={18} />
              </div>

              <div className="form-group">
                <label>Secure Master Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="input-underline"
                  id="admin-login-pass"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-action-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {capsLockActive && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', marginTop: '0.25rem', fontWeight: 'bold' }}>
                    ⚠️ Warning: Caps Lock is ON
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep(3);
                      setLoginError('');
                      setResetSuccessMessage('');
                    }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Forgot Master Password?
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '0.5rem', background: 'var(--accent-red)', borderColor: 'var(--accent-red)', borderRadius: '9999px' }} id="btn-admin-login">
                Request Security Clearance
              </button>
            </form>
          ) : loginStep === 2 ? (
            <form onSubmit={handleTwoFactorSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 1rem 0' }}>
                  Two-Factor Authentication (2FA) Required. Enter the 6-digit key from your Authenticator app.
                </p>
                <div className="form-group">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 000000"
                    maxLength={6}
                    value={twoFactorInput}
                    onChange={(e) => setTwoFactorInput(e.target.value)}
                    className="input-underline"
                    style={{ fontSize: '1.4rem', textAlign: 'center', letterSpacing: '0.2em', paddingRight: '0 !important' }}
                    id="admin-2fa-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep(1);
                    setTwoFactorInput('');
                    setLoginError('');
                    setResetSuccessMessage('');
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, borderRadius: '9999px' }}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 2, background: 'var(--accent-red)', borderColor: 'var(--accent-red)', borderRadius: '9999px' }} id="btn-2fa-submit">
                  Verify Key & Unlock
                </button>
              </div>
            </form>
          ) : loginStep === 3 ? (
            <form onSubmit={handleForgotPasswordSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 1rem 0', textAlign: 'center', lineHeight: '1.4' }}>
                  Enter your Administrator work email to request a secure 6-digit verification code.
                </p>
                <div className="form-group">
                  <label>Work Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder=""
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="input-underline"
                    id="admin-reset-email"
                  />
                  <Mail className="input-icon" size={18} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep(1);
                    setLoginError('');
                    setResetSuccessMessage('');
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, borderRadius: '9999px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 2, background: 'var(--accent-red)', borderColor: 'var(--accent-red)', borderRadius: '9999px' }}>
                  Send Reset Code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 0.5rem 0', textAlign: 'center', lineHeight: '1.4' }}>
                  Input the 6-digit code sent to your email and select your new Master password.
                </p>
                <div className="form-group">
                  <label>Verification Reset Code (6 Digits)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456"
                    maxLength={6}
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    className="input-underline"
                    style={{ textAlign: 'center', letterSpacing: '0.15em', paddingRight: '0 !important' }}
                  />
                </div>
                <div className="form-group">
                  <label>New Master Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="input-underline"
                  />
                  <Lock className="input-icon" size={18} />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    className="input-underline"
                  />
                  <Lock className="input-icon" size={18} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep(3);
                    setLoginError('');
                    setResetSuccessMessage('');
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, borderRadius: '9999px' }}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 2, background: 'var(--accent-green)', borderColor: 'var(--accent-green)', color: '#000', fontWeight: 'bold', borderRadius: '9999px' }}>
                  Reset & Login
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield style={{ color: 'var(--accent-blue)' }} size={28} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold' }}>Admin Control Center</h1>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time security tracking
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', overflow: 'hidden' }}>
          {/* Sub Navigation */}
          <div className="portal-tabs-container" style={{ flex: 1 }}>
            <button className={`role-tab ${activeSubTab === 'schools' ? 'active' : ''}`} onClick={() => handleTabChange('schools')}>Schools</button>
            <button className={`role-tab ${activeSubTab === 'map' ? 'active' : ''}`} onClick={() => handleTabChange('map')}>Global Map</button>
            <button className={`role-tab ${activeSubTab === 'alerts' ? 'active' : ''}`} onClick={() => handleTabChange('alerts')}>
              Alerts {activeAlertCount > 0 && <span style={{ background: 'var(--accent-red)', color: 'white', padding: '1px 5px', borderRadius: '50%', fontSize: '0.65rem' }}>{activeAlertCount}</span>}
            </button>
            <button className={`role-tab ${activeSubTab === 'logs' ? 'active' : ''}`} onClick={() => handleTabChange('logs')}>Audit Logs</button>
            <button className={`role-tab ${activeSubTab === 'notify' ? 'active' : ''}`} onClick={() => handleTabChange('notify')}>Broadcast</button>
            <button className={`role-tab ${activeSubTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')}>Settings</button>
          </div>

          {/* Notification Bell */}
          <button 
            onClick={() => handleTabChange('inbox')} 
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
              borderColor: activeSubTab === 'inbox' ? 'var(--accent-blue)' : 'var(--glass-border)'
            }}
            id="superadmin-notifications-bell"
            title="School Messages Inbox"
          >
            <Bell size={20} />
            {superAdminUnreadCount > 0 && (
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
                {superAdminUnreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="btn btn-outline"
            style={{ 
              padding: '0.5rem', 
              borderRadius: '50%', 
              minWidth: '40px', 
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'var(--glass-border)',
              marginRight: '0.5rem'
            }}
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            id="btn-portal-theme-toggle"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            onClick={handleLogout} 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px', borderRadius: '10px', fontSize: '0.85rem' }}
            id="btn-admin-logout"
          >
            <Lock size={14} /> Lock
          </button>
        </div>
      </div>

      {/* Grid Platform Statistics */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '2rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Schools</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem' }} id="stat-total-schools">{totalSchools}</div>
            </div>
            <School size={28} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {approvedSchools} Approved | {pendingSchools} Pending
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Parents & Kids</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem' }} id="stat-total-parents">{approvedParents} / {approvedChildren}</div>
            </div>
            <Users size={28} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {approvedParents} Active Parents | {pendingParents} Pending
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Daily Verifications</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem' }} id="stat-daily-verifications">{dailyVerifications}</div>
            </div>
            <Activity size={28} style={{ color: 'var(--accent-green)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Rotating token pickups completed today
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cumulative Verifications</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem' }} id="stat-total-verifications">{totalVerifications}</div>
            </div>
            <Activity size={28} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Total safe boarding verifications ever done
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: activeAlertCount > 0 ? '4px solid var(--accent-red)' : '4px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Panic Alerts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem', color: activeAlertCount > 0 ? 'var(--accent-red)' : 'inherit' }} id="stat-active-alerts">
                {activeAlertCount}
              </div>
            </div>
            <AlertOctagon size={28} style={{ color: activeAlertCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Security panic events requiring resolution
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 0px', minWidth: '180px', borderLeft: '4px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Revenue</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem', color: 'var(--accent-green)' }} id="stat-total-revenue">
                ₦{payments.reduce((acc, pay) => acc + pay.amount, 0).toLocaleString()}
              </div>
            </div>
            <CreditCard size={28} style={{ color: 'var(--accent-green)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Accumulated SaaS software fees received
          </div>
        </div>
      </div>

      {/* Main SubTab Contents */}
      {activeSubTab === 'schools' && !selectedSchoolId && (
        <>
          {/* Most Active Schools Ranking Card */}
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏆 Most Active Schools Ranking
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>School Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cumulative Scans</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Average Daily Scans</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSchools.slice(0, 5).map((school, index) => (
                    <tr key={school.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="school-row">
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>
                        {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{school.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        {school.cumulativeScans.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                        {school.avgDailyScans} / day
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => {
                            const schoolVerifiedLogs = logs.filter(l => l.schoolId === school.id && l.status === 'VERIFIED');
                            let days = 1;
                            if (school.registeredAt) {
                              const onboardDate = new Date(school.registeredAt);
                              const today = new Date();
                              const diffTime = Math.abs(today - onboardDate);
                              days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                            }
                            setSelectedSchoolStats({
                              id: school.id,
                              name: school.name,
                              registeredAt: school.registeredAt,
                              daysActive: days,
                              cumulativeScans: schoolVerifiedLogs.length,
                              avgDailyScans: parseFloat((schoolVerifiedLogs.length / days).toFixed(2))
                            });
                          }}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          View Metrics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Dropdown for the rest of the schools */}
            {sortedSchools.length > 5 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View other ranked schools:</span>
                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const school = sortedSchools.find(s => s.id === val);
                    if (school) {
                      const schoolVerifiedLogs = logs.filter(l => l.schoolId === school.id && l.status === 'VERIFIED');
                      let days = 1;
                      if (school.registeredAt) {
                        const onboardDate = new Date(school.registeredAt);
                        const today = new Date();
                        const diffTime = Math.abs(today - onboardDate);
                        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                      }
                      setSelectedSchoolStats({
                        id: school.id,
                        name: school.name,
                        registeredAt: school.registeredAt,
                        daysActive: days,
                        cumulativeScans: schoolVerifiedLogs.length,
                        avgDailyScans: parseFloat((schoolVerifiedLogs.length / days).toFixed(2))
                      });
                    }
                    e.target.value = ""; // Reset select
                  }}
                  className="input-underline"
                  style={{ maxWidth: '280px', padding: '0.3rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '0.85rem', color: '#fff' }}
                >
                  <option value="" style={{ background: '#0d1321', color: '#fff' }}>Select school...</option>
                  {sortedSchools.slice(5).map((school, index) => (
                    <option key={school.id} value={school.id} style={{ background: '#0d1321', color: '#fff' }}>
                      #{index + 6} - {school.name} ({school.cumulativeScans} scans)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>School License Directory</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>School Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Location</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Email Verification</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>SaaS Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="school-row" id={`school-row-${s.id}`}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>
                      <button 
                        onClick={() => setSelectedSchoolId(s.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontWeight: '600',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 'inherit',
                          textDecoration: 'underline'
                        }}
                      >
                        {s.name}
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ID: {s.id} | Web: {s.website}</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{s.address}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className="badge badge-info">{s.type}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {s.verifiedEmail ? (
                        <span className="badge badge-success">Verified</span>
                      ) : (
                        <span className="badge badge-danger">Unverified</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {s.status === 'APPROVED' && s.subscriptionStatus === 'FREE_TRIAL' && (
                        <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', border: '1px solid' }}>Free Trial</span>
                      )}
                      {s.status === 'APPROVED' && s.subscriptionStatus === 'ACTIVE' && (
                        <span className="badge badge-success">Verified</span>
                      )}
                      {s.status === 'APPROVED' && s.subscriptionStatus !== 'FREE_TRIAL' && s.subscriptionStatus !== 'ACTIVE' && (
                        <span className="badge badge-success">Approved</span>
                      )}
                      {s.status === 'PENDING APPROVAL' && <span className="badge badge-warning">Pending Approval</span>}
                      {s.status === 'REJECTED' && <span className="badge badge-danger">Rejected</span>}
                      {s.status === 'SUSPENDED' && <span className="badge badge-danger">Suspended</span>}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => setSelectedSchoolId(s.id)} 
                          className="btn btn-outline" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                          id={`btn-inspect-${s.id}`}
                        >
                          Inspect
                        </button>
                        {s.status === 'PENDING APPROVAL' && (
                          <>
                            <button 
                              onClick={() => {
                                setConfirmDialog({
                                  title: "Approve School",
                                  message: `Are you sure you want to approve the SaaS license for ${s.name}?`,
                                  onConfirm: () => approveSchool(s.id)
                                });
                              }} 
                              className="btn btn-success" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                              id={`btn-approve-${s.id}`}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmDialog({
                                  title: "Reject School",
                                  message: `Are you sure you want to reject the school registration for ${s.name}?`,
                                  onConfirm: () => rejectSchool(s.id)
                                });
                              }} 
                              className="btn btn-danger" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                              id={`btn-reject-${s.id}`}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {s.status === 'APPROVED' && (
                          <button 
                            onClick={() => {
                              setConfirmDialog({
                                title: "Suspend School License",
                                message: `Are you sure you want to suspend ${s.name}? All parents and guardians from this school will be blocked from logging in.`,
                                onConfirm: () => suspendSchool(s.id)
                              });
                            }} 
                            className="btn btn-outline" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} 
                            id={`btn-suspend-${s.id}`}
                          >
                            Suspend
                          </button>
                        )}
                        {s.status === 'SUSPENDED' && (
                          <button 
                            onClick={() => {
                              setConfirmDialog({
                                title: "Re-Approve School",
                                message: `Are you sure you want to lift the suspension and re-approve the SaaS license for ${s.name}?`,
                                onConfirm: () => approveSchool(s.id)
                              });
                            }} 
                            className="btn btn-success" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                            id={`btn-unsuspend-${s.id}`}
                          >
                            Re-Approve
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setConfirmDialog({
                              title: "Delete School Record",
                              message: `Are you sure you want to permanently delete the school profile for ${s.name}? This cannot be undone.`,
                              onConfirm: () => deleteSchool(s.id)
                            });
                          }} 
                          className="btn btn-outline" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', opacity: 0.6 }}
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
      </>
    )}

      {/* Detailed School Inspector View */}
      {activeSubTab === 'schools' && selectedSchoolId && (
        (() => {
          const selectedSchool = schools.find(s => s.id === selectedSchoolId);
          if (!selectedSchool) return null;
          
          const schoolParents = parents.filter(p => p.schoolId === selectedSchoolId);
          const schoolGuardians = guardians.filter(g => g.schoolId === selectedSchoolId);

          return (
            <div className="glass-card animate-fadeIn">
              {/* Back Button and Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    onClick={() => setSelectedSchoolId(null)} 
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    id="btn-inspector-back"
                  >
                    ← Back to Directory
                  </button>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0 }}>{selectedSchool.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>School Inspector Control Panel</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button 
                      onClick={() => downloadSchoolJSON(selectedSchool, schoolParents, schoolGuardians)}
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}
                      title="Download full JSON dataset"
                    >
                      Export JSON
                    </button>
                    <button 
                      onClick={() => downloadSchoolCSV(selectedSchool, schoolParents, schoolGuardians)}
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                      title="Download Roster CSV"
                    >
                      Export CSV
                    </button>
                    <button 
                      onClick={() => downloadSchoolTXT(selectedSchool, schoolParents, schoolGuardians)}
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                      title="Download Text Report"
                    >
                      Export Report
                    </button>
                  </div>
                  <span className={`badge ${selectedSchool.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                    {selectedSchool.status}
                  </span>
                </div>
              </div>

              {/* School Metadata Details */}
              <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>Contact Info</h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    <div><strong>Address:</strong> {selectedSchool.address}</div>
                    <div><strong>Phone:</strong> {selectedSchool.phone}</div>
                    <div><strong>Email:</strong> {selectedSchool.email}</div>
                    <div><strong>Website:</strong> <a href={`https://${selectedSchool.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>{selectedSchool.website}</a></div>
                  </div>
                </div>

                <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>SaaS Enrollment</h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    <div><strong>School ID:</strong> <code>{selectedSchool.id}</code></div>
                    <div><strong>Verified Email:</strong> {selectedSchool.verifiedEmail ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>School Type:</strong> {selectedSchool.type}</div>
                    <div><strong>Registered:</strong> {new Date(selectedSchool.registeredAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>Billing & SaaS License</h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    <div><strong>Status:</strong> <span className="badge" style={{
                      background: selectedSchool.subscriptionStatus === 'FREE_TRIAL' ? 'rgba(59, 130, 246, 0.2)' : 
                                  selectedSchool.subscriptionStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 
                                  selectedSchool.subscriptionStatus === 'SUSPENDED' ? 'rgba(239, 68, 68, 0.2)' : 
                                  'rgba(255,255,255,0.05)',
                      color: selectedSchool.subscriptionStatus === 'FREE_TRIAL' ? 'var(--accent-blue)' : 
                             selectedSchool.subscriptionStatus === 'ACTIVE' ? 'var(--accent-green)' : 
                             selectedSchool.subscriptionStatus === 'SUSPENDED' ? 'var(--accent-red)' : 
                             'var(--text-secondary)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      border: '1px solid'
                    }}>{selectedSchool.subscriptionStatus === 'FREE_TRIAL' ? 'FREE TRIAL' : selectedSchool.subscriptionStatus === 'ACTIVE' ? 'VERIFIED' : selectedSchool.subscriptionStatus || 'INACTIVE'}</span></div>
                    
                    {selectedSchool.subscriptionStatus === 'FREE_TRIAL' && (
                      <>
                        <div><strong>Trial Duration:</strong> {selectedSchool.trialType ? selectedSchool.trialType.replace('_', ' ') : 'N/A'}</div>
                        <div><strong>Trial Expires At:</strong> {selectedSchool.trialExpiresAt ? new Date(selectedSchool.trialExpiresAt).toLocaleString() : 'N/A'}</div>
                        <div style={{ border: '1px dashed rgba(59,130,246,0.3)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.4rem', background: 'rgba(59,130,246,0.05)' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>NIGERIAN TERM BILLING</div>
                          <div>First Term Due Date: {selectedSchool.trialExpiresAt ? new Date(selectedSchool.trialExpiresAt).toLocaleDateString() : 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Subscription renewal runs on a 3-month (1 term) cycle.</div>
                        </div>
                      </>
                    )}
                    {selectedSchool.subscriptionStatus === 'ACTIVE' && (
                      <>
                        <div><strong>SaaS Expires At:</strong> {selectedSchool.subscriptionExpires}</div>
                        <div style={{ border: '1px dashed rgba(16,185,129,0.3)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.4rem', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '0.75rem' }}>TERM RENEWAL SCHEDULE</div>
                          <div>Next Term Due Date: {selectedSchool.subscriptionExpires}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Term length: 3 Months standard renewal.</div>
                        </div>
                      </>
                    )}
                    {selectedSchool.subscriptionStatus === 'SUSPENDED' && (
                      <div style={{ border: '1px dashed rgba(239,68,68,0.3)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.4rem', background: 'rgba(239,68,68,0.05)' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--accent-red)', fontSize: '0.75rem' }}>BILLING SUSPENDED</div>
                        <div style={{ color: 'var(--accent-red)' }}>Payment deadline has passed. Please extend deadline or uplift to restore access.</div>
                      </div>
                    )}
                    <div style={{ marginTop: '0.4rem' }}><strong>Tier:</strong> Enterprise School Plan</div>
                    <div><strong>Node Region:</strong> Lagos, Nigeria</div>

                    {/* Dropdown for Trial Duration Activation */}
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>SET FREE TRIAL DURATION:</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select 
                          value={trialMonths} 
                          onChange={(e) => setTrialMonths(parseInt(e.target.value))}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-border)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                        >
                          <option value="1">1 Month</option>
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                        </select>
                        <button
                          onClick={() => {
                            activateSchoolTrial(selectedSchool.id, trialMonths);
                            alert(`Activated ${trialMonths} Month(s) free trial for ${selectedSchool.name}.`);
                          }}
                          style={{
                            background: 'var(--accent-blue)',
                            color: '#000',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Activate
                        </button>
                      </div>
                    </div>

                    {/* Extend payment deadline dropdown */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>EXTEND PAYMENT DEADLINE:</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select 
                          value={extendDays} 
                          onChange={(e) => setExtendDays(parseInt(e.target.value))}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-border)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                        >
                          <option value="7">7 Days</option>
                          <option value="14">14 Days</option>
                          <option value="30">30 Days</option>
                        </select>
                        <button
                          onClick={() => {
                            extendSchoolPaymentDeadline(selectedSchool.id, extendDays);
                            alert(`Extended payment due date for ${selectedSchool.name} by ${extendDays} days.`);
                          }}
                          style={{
                            background: 'var(--accent-yellow)',
                            color: '#000',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Extend
                        </button>
                      </div>
                    </div>

                    {/* Uplift trial button */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                      <button
                        onClick={() => {
                          upliftSchoolTrial(selectedSchool.id);
                          alert(`Successfully uplifted trial period. ${selectedSchool.name} is now a VERIFIED active subscriber.`);
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--accent-green)',
                          color: '#000',
                          fontWeight: 'bold',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Uplift Trial to Active Subscription
                      </button>
                    </div>

                    {/* Simulation buttons */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>VERIFICATION SIMULATIONS:</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            // 3 days prior warning: 3 days in ms - 1 minute buffer to trigger diffDays <= 3
                            const testDate = new Date(Date.now() + 3 * 24 * 3600 * 1000 - 60000);
                            activateSchoolTrial(selectedSchool.id, trialMonths, testDate);
                            alert(`Simulating warning state (expires in < 3 days) for ${selectedSchool.name}.`);
                          }}
                          style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', border: '1px solid var(--accent-yellow)', color: 'var(--accent-yellow)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          3-Day Warning
                        </button>
                        <button 
                          onClick={() => {
                            // Immediate expiration: 1 minute ago
                            const testDate = new Date(Date.now() - 60000);
                            activateSchoolTrial(selectedSchool.id, trialMonths, testDate);
                            alert(`Simulating expired state (expired 1 min ago) for ${selectedSchool.name}. Account status will update to SUSPENDED.`);
                          }}
                          style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Expire Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parents and Fleet Layout */}
              <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
                {/* Registered Parents Roster */}
                <div>
                  <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      Registered Parents ({schoolParents.length})
                    </h3>
                    {schoolParents.length === 0 ? (
                      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No parents registered under this school yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {schoolParents.map(p => (
                          <div key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-blue)', flexShrink: 0 }}>
                                <img src={p.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</span>
                                  {(p.status || 'APPROVED') === 'APPROVED' && <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Active</span>}
                                  {p.status === 'SUSPENDED' && <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Suspended</span>}
                                  {p.status === 'PENDING' && <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Pending Approval</span>}
                                  {p.status === 'DELETED' && <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#e11d48', borderColor: '#e11d48' }}>Deleted</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email: {p.email} | Phone: {p.phone}</div>
                              </div>
                            </div>
                            {p.status === 'DELETED' && (
                              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                                <div style={{ color: '#f43f5e', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Account Deleted by School Admin</div>
                                <div style={{ color: 'var(--text-secondary)' }}><strong>Deleted By:</strong> {p.deletedBySchoolName || 'Unknown School'} (ID: {p.deletedBySchoolId || 'N/A'})</div>
                                <div style={{ color: 'var(--text-secondary)' }}><strong>Reason:</strong> {p.deleteReason || 'No reason provided.'}</div>
                                {p.deletedAt && <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '0.4rem' }}><strong>Timestamp:</strong> {new Date(p.deletedAt).toLocaleString()}</div>}
                              </div>
                            )}

                            {/* Spouse info */}
                            {!p.singleParent && p.spouseName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                  <img src={p.spouseProfilePic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <strong>Spouse:</strong> {p.spouseName} ({p.spousePhone})
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Single Parent Account
                              </div>
                            )}

                            {/* Children List */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Enrolled Children:</span>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                {p.children.map((child, idx) => (
                                  <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                    {child.name} (Age: {child.age})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Registered Fleet Guardians */}
                <div>
                  <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                      School Fleet & Bus Guardians ({schoolGuardians.length})
                    </h3>
                    {schoolGuardians.length === 0 ? (
                      <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No fleet bus guardians registered under this school yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {schoolGuardians.map(g => (
                          <div key={g.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-cyan)', flexShrink: 0 }}>
                                <img src={g.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{g.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Work Email: {g.email} | Phone: {g.phone}</div>
                              </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                              <div><strong>Bus / Plate Number:</strong> {g.busNumber} / <code>{g.plateNumber}</code></div>
                              <div><strong>Driver Name:</strong> {g.driverName}</div>
                              <div><strong>Assigned Route:</strong> {g.assignedRoute}</div>
                              <div><strong>Live Coordinates:</strong> {g.lastLocation?.lat || g.lat || 'N/A'}, {g.lastLocation?.lng || g.lng || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Secure Payment & Invoicing History */}
              <div className="glass-card" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)' }}>
                {(() => {
                  const schoolPayments = payments.filter(p => p.schoolId === selectedSchoolId);
                  const schoolTotalPaid = schoolPayments.reduce((acc, pay) => acc + pay.amount, 0);

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-green)', margin: 0 }}>
                          Billing Transactions & Payment Log
                        </h3>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                          Total Paid: <strong style={{ color: 'var(--accent-green)' }}>₦{schoolTotalPaid.toLocaleString()}</strong>
                        </div>
                      </div>
                      
                      {schoolPayments.length === 0 ? (
                        <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          No payment history recorded for this school.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.5rem' }}>Txn ID</th>
                                <th style={{ padding: '0.5rem' }}>Date & Time</th>
                                <th style={{ padding: '0.5rem' }}>Amount</th>
                                <th style={{ padding: '0.5rem' }}>Nodes Paid</th>
                                <th style={{ padding: '0.5rem' }}>Description</th>
                                <th style={{ padding: '0.5rem' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schoolPayments.map(pay => (
                                <tr key={pay.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{pay.id}</td>
                                  <td style={{ padding: '0.6rem 0.5rem' }}>{new Date(pay.timestamp).toLocaleString()}</td>
                                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₦{pay.amount.toLocaleString()}</td>
                                  <td style={{ padding: '0.6rem 0.5rem' }}>{pay.childrenCount} student(s)</td>
                                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-secondary)' }}>{pay.details}</td>
                                  <td style={{ padding: '0.6rem 0.5rem' }}>
                                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>PAID</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            </div>
          );
        })()
      )}

      {activeSubTab === 'map' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={18} style={{ color: 'var(--accent-cyan)' }} /> Global Fleet Monitor (Live coordinate tracking)
          </h3>
          <GoogleMapView centerCoords={mapCenterCoords} />
        </div>
      )}

      {activeSubTab === 'alerts' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={18} style={{ color: 'var(--accent-red)' }} /> Active Emergency Incidents
          </h3>
          {superAdminAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              No active emergency panic states reported. Everything is secure.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {superAdminAlerts.map(a => (
                <div key={a.id} className="pulse-emergency" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--accent-red)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-red)' }}>
                      EMERGENCY: {a.type}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      School: {a.schoolName || 'Unknown School'} | Bus: {a.busNumber} | Bus Guardian: {a.guardianName} | GPS: {a.gps}
                    </div>
                    {a.note && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>Note: "{a.note}"</div>}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <button 
                      onClick={() => {
                        setConfirmDialog({
                          title: "Resolve SOS Emergency Alert",
                          message: `Are you sure you want to resolve and clear this SOS incident report from ${a.schoolName || 'the school'}?`,
                          onConfirm: () => acknowledgePanicSuperAdmin(a.id)
                        });
                      }} 
                      className="btn btn-success" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} 
                      id={`btn-resolve-${a.id}`}
                    >
                      Resolve Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListTodo size={18} /> Global Security Audit Trails
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem' }}>Date & Time</th>
                  <th style={{ padding: '0.5rem' }}>Event Type</th>
                  <th style={{ padding: '0.5rem' }}>Parent</th>
                  <th style={{ padding: '0.5rem' }}>Bus Guardian</th>
                  <th style={{ padding: '0.5rem' }}>GPS Coord</th>
                  <th style={{ padding: '0.5rem' }}>Device info</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="log-row">
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>
                    {log.type}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{log.details}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.parentName} <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kid: {log.childName}</div></td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.guardianName}</td>
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
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{log.device}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                       {(() => {
                         const parent = parents.find(p => p.name === log.parentName);
                         if (parent && parent.status === 'SUSPENDED') {
                           return <span className="badge badge-danger">Suspended</span>;
                         }
                         if (log.status === 'VERIFIED') return <span className="badge badge-success">Verified</span>;
                         if (log.status === 'UNRECOGNIZED') return <span className="badge badge-danger">Unrecognized</span>;
                         if (log.status === 'PANIC ALERT') return <span className="badge badge-warning" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>SOS</span>;
                         if (log.status === 'LOGIN') return <span className="badge badge-info">Login</span>;
                         if (log.status === 'LOGOUT') return <span className="badge badge-secondary">Logout</span>;
                         return null;
                       })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'notify' && (
        <div style={{ maxWidth: '550px', margin: '0 auto' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} style={{ color: 'var(--accent-yellow)' }} /> System Notification Broadcast
            </h3>
            
            {notifySent && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }} id="success-notification-sent">
                Message successfully queued and transmitted to target clients!
              </div>
            )}

            <form onSubmit={handleSendNotification}>
              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={notifyTarget}
                  onChange={(e) => setNotifyTarget(e.target.value)}
                  className="input-control"
                  id="notify-target"
                >
                  <option value="all">All Schools, Parents, and Bus Guardians</option>
                  <option value="schools">All School Administrators</option>
                  <option value="parents">All Parents</option>
                  <option value="guardians">All Bus Guardians</option>
                </select>
              </div>

              <div className="form-group">
                <label>Transmission Mode</label>
                <select
                  value={notifyChannel}
                  onChange={(e) => setNotifyChannel(e.target.value)}
                  className="input-control"
                  id="notify-channel"
                >
                  <option value="web">In-App Platform Message (Web)</option>
                  <option value="push">Mobile Push Notification (Real-time)</option>
                  <option value="email">Verified SMTP Email Message</option>
                  <option value="sms">Fallback SMS Text Message</option>
                </select>
              </div>

              {notifyChannel === 'email' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>SMTP Mailer Server Configuration</h4>
                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>SMTP Host</label>
                      <input 
                        type="text" 
                        value={smtpConfig.host} 
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                        className="input-control" 
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>SMTP Port</label>
                      <input 
                        type="text" 
                        value={smtpConfig.port} 
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                        className="input-control" 
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>SMTP Username</label>
                      <input 
                        type="email" 
                        value={smtpConfig.username} 
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                        className="input-control" 
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>SMTP Password</label>
                      <input 
                        type="password" 
                        value={smtpConfig.password} 
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                        className="input-control" 
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      checked={smtpConfig.ssl} 
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, ssl: e.target.checked })}
                      id="smtp-ssl-checkbox"
                    />
                    <label htmlFor="smtp-ssl-checkbox" style={{ margin: 0, fontSize: '0.8rem' }}>Require Secure SSL/TLS Cryptographic Connection</label>
                  </div>
                </div>
              )}

              {showSmtpLogs && (
                <div style={{ background: '#05070c', border: '1px solid var(--accent-cyan)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.3rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    <span>SMTP Connection Logger Console</span>
                    <button 
                      type="button"
                      onClick={() => setShowSmtpLogs(false)} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      Hide
                    </button>
                  </div>
                  {smtpLogs.map((log, idx) => (
                    <div key={idx} style={{ color: log.includes('error') || log.includes('Failed') ? 'var(--accent-red)' : log.includes('completed') || log.includes('successful') ? 'var(--accent-green)' : '#cbd5e1', marginBottom: '0.2rem' }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>Broadcast Message Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type official broadcast instructions here..."
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  className="input-control"
                  style={{ resize: 'none' }}
                  id="notify-msg-body"
                />
              </div>

              <div className="form-group">
                <label>Upload Flyer Image (Optional - for Ads purpose)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAdFlyer(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="input-control"
                  style={{ padding: '0.4rem' }}
                  id="ad-flyer-uploader"
                />
                {adFlyer && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ maxWidth: '200px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      <img src={adFlyer} alt="Flyer Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAdFlyer(null)} 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                    >
                      Remove Flyer
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} id="btn-send-broadcast">
                Dispatch Broadcast Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Inbox Messages SubTab */}
      {activeSubTab === 'inbox' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--accent-blue)' }} /> School Admins Communications Inbox
          </h3>
          {notifications.filter(n => n.recipientId === 'SUPER_ADMIN').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No messages received from school administrators.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.filter(n => n.recipientId === 'SUPER_ADMIN').slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(n => (
                <div 
                  key={n.id} 
                  style={{ 
                    background: isRead(n) ? 'var(--bg-secondary)' : 'rgba(59, 130, 246, 0.12)', 
                    border: isRead(n) ? '1px solid var(--glass-border)' : '1px solid var(--accent-blue)', 
                    padding: '1.25rem', 
                    borderRadius: '10px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{n.title}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        Sender: {n.senderName} (ID: {n.senderId})
                      </span>
                      <button 
                        onClick={() => {
                          if (replyingToId === n.id) {
                            setReplyingToId(null);
                            setReplyMessage('');
                          } else {
                            setReplyingToId(n.id);
                            setReplyMessage('');
                          }
                        }}
                        className="btn btn-outline" 
                        style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Reply to School Admin"
                      >
                        <CornerUpLeft size={12} /> Reply
                      </button>
                      {!isRead(n) && (
                        <button 
                          onClick={() => markNotificationRead(n.id, 'SUPER_ADMIN')}
                          className="btn btn-outline" 
                          style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                        >
                          Mark Acknowledged
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.5' }}>
                    {(() => {
                      const msg = n.message;
                      if (msg && msg.startsWith('FLYER::')) {
                        const parts = msg.split('::');
                        const flyerUrl = parts[1];
                        const textMsg = parts.slice(2).join('::');
                        return (
                          <div>
                            {textMsg && <div style={{ marginBottom: '0.75rem' }}>{textMsg}</div>}
                            <div style={{ maxWidth: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginTop: '0.5rem' }}>
                              <img src={flyerUrl} alt="Ad Flyer" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                          </div>
                        );
                      }
                      return msg;
                    })()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'right' }}>
                    Date Received: {new Date(n.timestamp).toLocaleString()}
                  </div>
                  {replyingToId === n.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                        Quick Reply to {n.senderName}:
                      </label>
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type reply to school administrators..."
                        className="input-control"
                        style={{ minHeight: '70px', fontSize: '0.8rem', resize: 'none' }}
                        required
                        id={`reply-textarea-${n.id}`}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyMessage('');
                          }}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!replyMessage.trim()) return;
                            sendNotification(
                              'SUPER_ADMIN',
                              'Super Administrator',
                              n.senderId,
                              `RE: ${n.title}`,
                              replyMessage
                            );
                            // Auto-read original message for convenient workflow
                            markNotificationRead(n.id, 'SUPER_ADMIN');
                            setReplyingToId(null);
                            setReplyMessage('');
                            setConfirmDialog({
                              title: "REPLY DISPATCHED",
                              message: `Your reply has been successfully transmitted to ${n.senderName} (School ID: ${n.senderId}) via In-App Platform channel.`,
                              isAlert: true,
                              confirmText: "OK",
                              onConfirm: () => {}
                            });
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          type="button"
                          id={`btn-send-reply-${n.id}`}
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Super Admin Settings tab (Active Devices & Master QR approvals) */}
      {activeSubTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Devices Section */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
                  <Lock size={18} /> Global Session Security & Active Devices
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Monitor and manage active administrator devices logged into the Super Admin portal.
                </p>
              </div>
              <button 
                onClick={() => {
                  setConfirmDialog({
                    title: "Delete Unrecognized Devices",
                    message: "Are you sure you want to terminate all session connections flagged as unrecognized?",
                    onConfirm: () => {
                      deleteUnrecognizedSessions('SUPER_ADMIN', 'SUPER_ADMIN');
                      addSystemLog({
                        type: 'Sessions Cleanup',
                        gps: 'N/A',
                        device: 'Console Command',
                        details: 'Super Admin terminated all unrecognized device sessions.'
                      });
                    }
                  });
                }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                id="btn-delete-unrecognized-sessions"
              >
                Delete Unrecognized Devices
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '0.75rem' }}>Device Name</th>
                    <th style={{ padding: '0.75rem' }}>IP Address</th>
                    <th style={{ padding: '0.75rem' }}>Last Login Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.filter(s => s.role === 'SUPER_ADMIN').map(s => {
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
                                      title: "Freeze Admin Session",
                                      message: `Are you sure you want to freeze session ${s.id} (${s.deviceName})? The device will be signed out immediately and blocked.`,
                                      onConfirm: () => {
                                        freezeSession(s.id);
                                        addSystemLog({
                                          type: 'Session Frozen',
                                          gps: 'N/A',
                                          device: 'Security Console',
                                          details: `Super Admin froze session ${s.id} for device ${s.deviceName}.`
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
                                    title: "Delete Admin Session",
                                    message: `Are you absolutely sure you want to delete session ${s.id} (${s.deviceName})? This forces an immediate log out and destroys credentials.`,
                                    onConfirm: () => {
                                      deleteSession(s.id);
                                      addSystemLog({
                                        type: 'Session Deleted',
                                        gps: 'N/A',
                                        device: 'Security Console',
                                        details: `Super Admin deleted session ${s.id} for device ${s.deviceName}.`
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

          {/* Master QR Code Requests Section */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
              <School size={18} /> Master QR Code Security Requests
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Review and authorize requests from schools asking to unlock Master QR code re-downloads or register multiple campus scan locations.
            </p>

            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No pending Master QR unlock requests.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingRequests.map(req => (
                  <div key={req.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {req.schoolName} <span className="badge badge-info" style={{ fontSize: '0.65rem', marginLeft: '6px' }}>{req.schoolId}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Request Type: <strong style={{ color: 'var(--accent-cyan)' }}>
                          {req.type === 'unlock_download' ? 'Master QR Re-download Unlock' : 'Attach Multi-Location (2nd or 3rd Location)'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Requested At: {new Date(req.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: "Approve Master QR Request",
                            message: `Are you sure you want to approve this ${req.type === 'unlock_download' ? 're-download unlock' : 'multi-location'} request for ${req.schoolName}?`,
                            onConfirm: () => {
                              approveMasterQrRequest(req.schoolId, req.id);
                              addSystemLog({
                                type: 'Master QR Request Approved',
                                schoolId: req.schoolId,
                                details: `Super Admin approved ${req.type} request ${req.id} for ${req.schoolName}.`
                              });
                            }
                          });
                        }}
                        className="btn btn-success"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: "Reject Master QR Request",
                            message: `Are you sure you want to reject this request for ${req.schoolName}?`,
                            onConfirm: () => {
                              rejectMasterQrRequest(req.schoolId, req.id);
                              addSystemLog({
                                type: 'Master QR Request Rejected',
                                schoolId: req.schoolId,
                                details: `Super Admin rejected ${req.type} request ${req.id} for ${req.schoolName}.`
                              });
                            }
                          });
                        }}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      {selectedSchoolStats && (
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
          <div className="glass-card animate-fadeIn" style={{ 
            maxWidth: '420px', 
            width: '100%', 
            background: 'var(--bg-primary)', 
            border: '2px solid var(--accent-blue)', 
            boxShadow: '0 24px 64px rgba(0, 113, 227, 0.25)',
            borderRadius: '24px',
            padding: '2rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', color: '#fff', textAlign: 'center' }}>
              📊 {selectedSchoolStats.name}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>School ID:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{selectedSchoolStats.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Onboarded Date:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {selectedSchoolStats.registeredAt ? new Date(selectedSchoolStats.registeredAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Days Active:</span>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{selectedSchoolStats.daysActive} day(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cumulative Scans:</span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '1rem', fontWeight: '900' }}>
                  {selectedSchoolStats.cumulativeScans.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Average Daily Scans:</span>
                <span style={{ color: 'var(--accent-green)', fontSize: '1rem', fontWeight: '900' }}>
                  {selectedSchoolStats.avgDailyScans} / day
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setSelectedSchoolStats(null)}
                className="btn btn-primary" 
                style={{ padding: '0.6rem 2rem', borderRadius: '9999px', fontWeight: 'bold' }}
              >
                Close Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
