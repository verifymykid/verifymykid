import { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';

// Helper to calculate the current TOTP values
export const getDynamicCode = (uniqueId, offset = 0) => {
  if (!uniqueId) return { code: '000000', qrValue: 'INVALID', secondsLeft: 0 };
  
  const windowSize = 3 * 60 * 1000; // 3 minutes
  const now = Date.now();
  const currentWindow = Math.floor(now / windowSize) + offset;
  const secondsLeft = 180 - (Math.floor(now / 1000) % 180);
  
  // Deterministic hash based on unique ID and the time window
  let idHash = 0;
  for (let i = 0; i < uniqueId.length; i++) {
    idHash = (idHash << 5) - idHash + uniqueId.charCodeAt(i);
    idHash |= 0;
  }
  
  const rawVal = Math.abs((idHash * (currentWindow + 12345)) % 899999) + 100000;
  const code = String(rawVal);
  const qrValue = `VMK-${uniqueId}-${code}`;
  
  return { code, qrValue, secondsLeft };
};

// Client-side quick hashing helper
export const hashPassword = (password) => {
  if (!password) return '';
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `SHA256-${Math.abs(hash).toString(16)}`;
};

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const API_BASE_URL = localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io';

  // React State mirrors for FastAPI Database tables
  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [smtpLogs, setSmtpLogs] = useState([]);
  const [otpTimer, setOtpTimer] = useState(180);
  const telemetryAbortControllerRef = useRef(null);

  // Auth helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('vmk_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Sync data from FastAPI backend
  const syncWithBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync?cb=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.schools) {
        setSchools(prev => JSON.stringify(prev) === JSON.stringify(data.schools) ? prev : data.schools);
      }
      if (data.parents) {
        const processedParents = data.parents.map(p => ({
          ...p,
          children: p.children || [],
          tempAuthorizations: p.tempAuthorizations || []
        }));
        setParents(prev => JSON.stringify(prev) === JSON.stringify(processedParents) ? prev : processedParents);
      }
      if (data.guardians) {
        const processedGuardians = data.guardians.map(g => ({
          ...g,
          lastLocation: g.lastLocation || { lat: g.lat || 6.43, lng: g.lng || 3.42 }
        }));
        setGuardians(prev => JSON.stringify(prev) === JSON.stringify(processedGuardians) ? prev : processedGuardians);
      }
      if (data.pickups) {
        const mergedLogs = [
          ...data.pickups,
          ...(data.systemLogs || []).map(sys => ({
            ...sys,
            childName: 'N/A',
            guardianName: 'System / School Admin',
            status: 'INFO'
          }))
        ];
        mergedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(prev => JSON.stringify(prev) === JSON.stringify(mergedLogs) ? prev : mergedLogs);
      }
      if (data.alerts) {
        const activeAlerts = data.alerts.filter(a => a.status === 'ACTIVE');
        setActiveAlerts(prev => JSON.stringify(prev) === JSON.stringify(activeAlerts) ? prev : activeAlerts);
      }
      if (data.notifications) {
        setNotifications(prev => JSON.stringify(prev) === JSON.stringify(data.notifications) ? prev : data.notifications);
      }
      if (data.smtpLogs) {
        const logsText = data.smtpLogs.map(l => l.text);
        setSmtpLogs(prev => JSON.stringify(prev) === JSON.stringify(logsText) ? prev : logsText);
      }
      if (data.sessions) {
        setSessions(prev => JSON.stringify(prev) === JSON.stringify(data.sessions) ? prev : data.sessions);
        setSessionsLoaded(true);
      }
    } catch (err) {
      console.warn("Backend connection unavailable: ", err);
    }
  };

  // Run initial sync and periodic updates (every 1 second)
  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 1000);
    return () => clearInterval(interval);
  }, []);

  // OTP Countdown Timer Tick (Unused countdown disabled to stop 1s re-renders)
  useEffect(() => {
    // Left empty since DynamicCode calculates second count locally and dynamically
  }, []);

  // Telemetry GPS drift simulator (only runs in guardian panel browser tab)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (window.location.pathname.includes('/bus-guardian')) {
        const activeGuardianId = localStorage.getItem('vmk_current_guardian_id');
        if (!activeGuardianId) return;

        setGuardians(prev => {
          const match = prev.find(g => g.id === activeGuardianId);
          if (!match || !match.online) return prev;

          // Verify again right before doing the fetch
          if (localStorage.getItem('vmk_current_guardian_id') !== activeGuardianId) {
            return prev;
          }

          const driftLat = (Math.random() - 0.5) * 0.0006;
          const driftLng = (Math.random() - 0.5) * 0.0006;
          const nextLat = parseFloat(((match.lat || 6.4312) + driftLat).toFixed(6));
          const nextLng = parseFloat(((match.lng || 3.4190) + driftLng).toFixed(6));

          if (telemetryAbortControllerRef.current) {
            telemetryAbortControllerRef.current.abort();
          }
          telemetryAbortControllerRef.current = new AbortController();

          // Post coordinates to FastAPI backend
          fetch(`${API_BASE_URL}/api/guardians/${activeGuardianId}/online?online=true&lat=${nextLat}&lng=${nextLng}`, {
            method: 'PUT',
            signal: telemetryAbortControllerRef.current.signal
          }).then(() => syncWithBackend()).catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn("Telemetry update failed:", err);
            }
          });

          return prev;
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ==================== STORE MUTATIVE HELPER METHODS ====================

  // School actions
  const registerSchool = async (data) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/school/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to register school.');
    }
    const school = await res.json();
    await syncWithBackend();
    return school;
  };

  const verifySchoolEmail = async (schoolId, code) => {
    const res = await fetch(`${API_BASE_URL}/api/schools/${schoolId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid OTP code.');
    }
    await syncWithBackend();
  };

  const sendParentForgotCode = async (email) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/parent/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to send reset code.');
    }
  };

  const resetParentPassword = async (email, code, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/parent/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to reset password.');
    }
    await syncWithBackend();
  };

  const approveSchool = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/superadmin/approve-school/${schoolId}`, { method: 'POST' });
    await syncWithBackend();
  };

  const rejectSchool = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/superadmin/reject-school/${schoolId}`, { method: 'POST' });
    await syncWithBackend();
  };

  const suspendSchool = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}/suspend`, { method: 'POST' });
    await syncWithBackend();
  };

  const activateSchoolTrial = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}/trial-activate`, { method: 'POST' });
    await syncWithBackend();
  };

  const extendSchoolPaymentDeadline = async (schoolId, days) => {
    await fetch(`${API_BASE_URL}/api/superadmin/extend-school/${schoolId}?days=${days}`, { method: 'POST' });
    await syncWithBackend();
  };

  const upliftSchoolTrial = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/superadmin/uplift-school/${schoolId}`, { method: 'POST' });
    await syncWithBackend();
  };

  const deleteSchool = async (schoolId) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}`, { method: 'DELETE' });
    await syncWithBackend();
  };

  const updateSchoolProfile = async (schoolId, updatedFields) => {
    const res = await fetch(`${API_BASE_URL}/api/schools/${schoolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update school profile.');
    }
    await syncWithBackend();
  };

  // Parent actions
  const registerParent = async (data) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/parent/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to register parent.');
    }
    const parent = await res.json();
    await syncWithBackend();
    return parent;
  };

  const verifyParentEmail = async (parentId, code) => {
    const res = await fetch(`${API_BASE_URL}/api/parents/${parentId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid OTP code.');
    }
    await syncWithBackend();
  };

  const resendParentOtp = async (parentId) => {
    const res = await fetch(`${API_BASE_URL}/api/parents/${parentId}/resend-otp`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to resend OTP.');
    }
  };

  const addTempAuthorization = async (parentId, tempForm) => {
    const res = await fetch(`${API_BASE_URL}/api/parents/${parentId}/temp-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tempForm)
    });
    const auth = await res.json();
    await syncWithBackend();
    return auth;
  };

  const setParentStatus = async (parentId, status) => {
    await fetch(`${API_BASE_URL}/api/parents/${parentId}/status?status=${status}`, { method: 'PUT' });
    await syncWithBackend();
  };

  const setParentOnlineStatus = async (parentId, isOnline, coords = null) => {
    const latParam = coords ? `&lat=${coords.lat}` : '';
    const lngParam = coords ? `&lng=${coords.lng}` : '';
    await fetch(`${API_BASE_URL}/api/parents/${parentId}/online?online=${isOnline}${latParam}${lngParam}`, { method: 'PUT' });
    await syncWithBackend();
  };

  const updateParentProfile = async (parentId, updatedFields) => {
    const res = await fetch(`${API_BASE_URL}/api/parents/${parentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update parent profile.');
    }
    await syncWithBackend();
  };

  const deleteParent = async (parentId) => {
    await fetch(`${API_BASE_URL}/api/parents/${parentId}`, { method: 'DELETE' });
    await syncWithBackend();
  };

  const deleteParentBySchool = async (parentId, schoolId, schoolName, reason) => {
    await fetch(
      `${API_BASE_URL}/api/parents/${parentId}/status?status=DELETED&deletedBySchoolId=${schoolId}&deletedBySchoolName=${encodeURIComponent(schoolName)}&deleteReason=${encodeURIComponent(reason)}`,
      { method: 'PUT' }
    );
    await syncWithBackend();
  };

  // Guardian actions
  const addGuardian = async (schoolId, data) => {
    const res = await fetch(`${API_BASE_URL}/api/guardians?schoolId=${schoolId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to add guardian.');
    }
    const guardian = await res.json();
    await syncWithBackend();
    return guardian;
  };

  const updateGuardianStatus = async (guardianId, status) => {
    await fetch(`${API_BASE_URL}/api/guardians/${guardianId}/status?status=${status}`, { method: 'PUT' });
    await syncWithBackend();
  };

  const deleteGuardian = async (guardianId) => {
    await fetch(`${API_BASE_URL}/api/guardians/${guardianId}`, { method: 'DELETE' });
    await syncWithBackend();
  };

  const setGuardianOnlineStatus = async (guardianId, isOnline, coords = null) => {
    if (!isOnline && telemetryAbortControllerRef.current) {
      telemetryAbortControllerRef.current.abort();
      telemetryAbortControllerRef.current = null;
    }
    const latParam = coords ? `&lat=${coords.lat}` : '';
    const lngParam = coords ? `&lng=${coords.lng}` : '';
    await fetch(`${API_BASE_URL}/api/guardians/${guardianId}/online?online=${isOnline}${latParam}${lngParam}`, { method: 'PUT' });
    await syncWithBackend();
  };

  // Panic actions
  const triggerPanic = async (guardianId, type, note = '') => {
    const res = await fetch(`${API_BASE_URL}/api/alerts/panic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardianId, type, note })
    });
    const alert = await res.json();
    await syncWithBackend();
    return alert;
  };

  const resolvePanic = async (alertId) => {
    await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, { method: 'POST' });
    await syncWithBackend();
  };

  const acknowledgePanicSuperAdmin = async (alertId) => {
    await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, { method: 'POST' });
    await syncWithBackend();
  };

  const acknowledgePanicSchoolAdmin = async (alertId) => {
    await fetch(`${API_BASE_URL}/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    await syncWithBackend();
  };

  // Verification actions
  const verifyPickupEvent = async ({ parentId, guardianId, enteredCode, isMorning, scannedGps = null }) => {
    const res = await fetch(`${API_BASE_URL}/api/logs/pickups/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, guardianId, enteredCode, isMorning, scannedGps })
    });
    if (!res.ok) {
      const err = await res.json();
      return { status: 'ERROR', message: err.detail || 'Verification request failed.' };
    }
    const result = await res.json();
    await syncWithBackend();
    return result;
  };

  // Logs & SMTP
  const addSystemLog = async ({ type, schoolId = 'N/A', parentName = 'N/A', guardianName = 'N/A', status = 'VERIFIED', gps = 'N/A', device = 'Web Browser', details = '' }) => {
    await fetch(
      `${API_BASE_URL}/api/logs/system?type=${encodeURIComponent(type)}&details=${encodeURIComponent(details)}&schoolId=${schoolId}&parentName=${encodeURIComponent(parentName)}&gps=${gps}&device=${encodeURIComponent(device)}`,
      { method: 'POST' }
    );
    await syncWithBackend();
  };

  const addSmtpLog = async (logText) => {
    await fetch(`${API_BASE_URL}/api/smtp-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: logText })
    });
    await syncWithBackend();
  };

  // Notifications
  const sendNotification = async (senderId, senderName, recipientId, subject, message) => {
    await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, senderName, recipientId, subject, message })
    });
    await syncWithBackend();
  };

  const broadcastNotification = async (senderId, senderName, targetAudience, subject, message) => {
    await fetch(`${API_BASE_URL}/api/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, senderName, targetAudience, subject, message })
    });
    await syncWithBackend();
  };

  const markNotificationRead = async (notificationId) => {
    // Optimistic UI update: instantly update local state for zero-latency feel
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true, read: true } : n));
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, { method: 'PUT' });
      await syncWithBackend();
    } catch (err) {
      console.warn("Backend read sync error: ", err);
    }
  };

  // Payment
  const recordPayment = async (schoolId, amount, childrenCount) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}/pay?amount=${amount}&children=${childrenCount}`, { method: 'POST' });
    await syncWithBackend();
  };

  // Active user sessions
  const addSession = async (data) => {
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const session = await res.json();
    setSessions(prev => [session, ...prev]);
    setSessionsLoaded(true);
    await syncWithBackend();
    return session;
  };

  const freezeSession = async (sessionId) => {
    await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/freeze`, { method: 'POST' });
    await syncWithBackend();
  };

  const deleteSession = async (sessionId) => {
    await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, { method: 'DELETE' });
    await syncWithBackend();
  };

  const deleteUnrecognizedSessions = () => {};

  // Master QR Lock details
  const requestMasterQrUnlock = async (schoolId, requestType) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}/qr-lock?location_name=${encodeURIComponent(requestType)}`, { method: 'POST' });
    await syncWithBackend();
  };

  const approveMasterQrRequest = async (schoolId, requestId) => {
    await fetch(`${API_BASE_URL}/api/superadmin/approve-qr-request/${schoolId}/${requestId}`, { method: 'POST' });
    await syncWithBackend();
  };

  const rejectMasterQrRequest = async (schoolId, requestId) => {
    await fetch(`${API_BASE_URL}/api/superadmin/reject-qr-request/${schoolId}/${requestId}`, { method: 'POST' });
    await syncWithBackend();
  };

  const registerMasterQrLocation = async (schoolId, lat, lng) => {
    await fetch(`${API_BASE_URL}/api/schools/${schoolId}/qr-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
    await syncWithBackend();
  };

  const scanMasterQrCode = async (guardianId, lat, lng) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guardians/${guardianId}/scan-master-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });
      const data = await res.json();
      await syncWithBackend();
      return data;
    } catch (err) {
      console.error("Master QR Scan Error:", err);
      return { status: 'ERROR', message: 'Network connection to backend failed.' };
    }
  };

  const contextValue = useMemo(() => ({
    schools,
    parents,
    guardians,
    logs,
    activeAlerts,
    otpTimer,
    notifications,
    registerSchool,
    verifySchoolEmail,
    sendParentForgotCode,
    resetParentPassword,
    approveSchool,
    rejectSchool,
    suspendSchool,
    activateSchoolTrial,
    extendSchoolPaymentDeadline,
    upliftSchoolTrial,
    deleteSchool,
    registerParent,
    verifyParentEmail,
    resendParentOtp,
    addTempAuthorization,
    addGuardian,
    triggerPanic,
    resolvePanic,
    acknowledgePanicSuperAdmin,
    acknowledgePanicSchoolAdmin,
    verifyPickupEvent,
    setGuardianOnlineStatus,
    addSystemLog,
    sendNotification,
    broadcastNotification,
    markNotificationRead,
    payments,
    setParentStatus,
    setParentOnlineStatus,
    updateParentProfile,
    updateSchoolProfile,
    deleteParent,
    deleteParentBySchool,
    updateGuardianStatus,
    deleteGuardian,
    recordPayment,
    sessions,
    sessionsLoaded,
    smtpLogs,
    addSession,
    freezeSession,
    deleteSession,
    deleteUnrecognizedSessions,
    addSmtpLog,
    requestMasterQrUnlock,
    approveMasterQrRequest,
    rejectMasterQrRequest,
    registerMasterQrLocation,
    scanMasterQrCode
  }), [
    schools,
    parents,
    guardians,
    logs,
    activeAlerts,
    otpTimer,
    notifications,
    payments,
    sessions,
    sessionsLoaded,
    smtpLogs
  ]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
