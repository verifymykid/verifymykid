import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Key, ShieldAlert, CheckCircle2, Navigation, AlertTriangle, AlertOctagon, ScanLine, Lock, Eye, EyeOff, Bell, Send, LogOut, School } from 'lucide-react';
import { useStore, getDynamicCode, hashPassword } from '../data/mockStore';
import { Html5Qrcode } from 'html5-qrcode';
import DynamicCode from '../components/DynamicCode';

export default function BusGuardianPortal({ guardianId, setGuardianId }) {
  const { 
    schools, guardians, parents, logs, verifyPickupEvent, triggerPanic, activeAlerts, resolvePanic,
    notifications, sendNotification, markNotificationRead, setGuardianOnlineStatus, addSystemLog,
    scanMasterQrCode
  } = useStore();

  const getSchoolCoords = (g) => {
    if (!g) return { lat: 6.5244, lng: 3.3792 };
    const gSchool = schools.find(s => s.id === g.schoolId);
    if (gSchool && gSchool.lat && gSchool.lng) {
      return { lat: gSchool.lat, lng: gSchool.lng };
    }
    return { lat: 6.5244, lng: 3.3792 };
  };

  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Secure login states
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Drop-off Verification state
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [dropOffResult, setDropOffResult] = useState(null);

  // Panic modal state
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [panicNote, setPanicNote] = useState('');

  // Location and Notifications states
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const watchIdRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Compose & Inbox states
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Fetch current guardian details
  const currentGuardian = guardians.find(g => g.id === guardianId);
  const school = schools?.find(s => s.id === currentGuardian?.schoolId);
  const schoolName = school ? school.name : 'Unknown School';

  useEffect(() => {
    if (currentGuardian) {
      requestGpsAccessAndLogin(currentGuardian);
    }
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [guardianId]);
  const hasActivePanic = currentGuardian ? activeAlerts.some(a => a.guardianId === currentGuardian.id) : false;

  const matchedParent = dropOffResult ? parents.find(p => p.name === dropOffResult.log.parentName) : null;

  const getDeviceString = () => {
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

    return `${browser} on ${os}`;
  };

  useEffect(() => {
    const termMsg = sessionStorage.getItem('guardian_login_error');
    if (termMsg) {
      setLoginError(termMsg);
      sessionStorage.removeItem('guardian_login_error');
    }
  }, []);

  useEffect(() => {
    if (currentGuardian && currentGuardian.status === 'SUSPENDED') {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      const schoolCoords = getSchoolCoords(currentGuardian);
      addSystemLog({
        type: 'Bus Guardian Session Terminated',
        schoolId: currentGuardian.schoolId,
        guardianName: currentGuardian.name,
        gps: `${currentGuardian.lastLocation?.lat || schoolCoords.lat}, ${currentGuardian.lastLocation?.lng || schoolCoords.lng}`,
        device: getDeviceString(),
        details: `Bus Guardian ${currentGuardian.name} session terminated automatically due to account suspension.`
      });

      setGuardianOnlineStatus(currentGuardian.id, false);
      setGuardianId('');
      setNameInput('');
      setPasswordInput('');
      setGpsPermissionStatus('prompt');
      setLoginError("Your bus guardian account has been suspended by the school administrator.");
      sessionStorage.setItem('guardian_login_error', "Your bus guardian account has been suspended by the school administrator.");
    }
  }, [guardians, guardianId, currentGuardian?.status]);

  const requestGpsAccessAndLogin = (g) => {
    const deviceStr = getDeviceString();

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const activateOnline = (coords) => {
      setGpsPermissionStatus('granted');
      setGuardianOnlineStatus(g.id, true, coords);
      
      const gSchool = schools.find(s => s.id === g.schoolId);
      const gSchoolName = gSchool ? gSchool.name : 'School';

      addSystemLog({
        type: 'Bus Guardian Sign-In',
        schoolId: g.schoolId,
        guardianName: g.name,
        gps: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
        device: deviceStr,
        details: `Bus Guardian ${g.name} initiated safety terminal run for ${gSchoolName}.`
      });

      setGuardianId(g.id);
      setLoginError('');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          activateOnline(coords);

          // Start active watch with high accuracy
          const wId = navigator.geolocation.watchPosition(
            (pos) => {
              setGuardianOnlineStatus(g.id, true, { lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
              console.warn("Watch position error:", err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
          watchIdRef.current = wId;
        },
        (error) => {
          console.warn("Current position error, using lastLocation or fallback:", error);
          const schoolCoords = getSchoolCoords(g);
          const coords = g.lastLocation ? { lat: g.lastLocation.lat, lng: g.lastLocation.lng } : schoolCoords;
          activateOnline(coords);
          
          const wId = navigator.geolocation.watchPosition(
            (pos) => {
              setGuardianOnlineStatus(g.id, true, { lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
              console.warn("Watch position error in fallback:", err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
          watchIdRef.current = wId;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const schoolCoords = getSchoolCoords(g);
      const coords = g.lastLocation ? { lat: g.lastLocation.lat, lng: g.lastLocation.lng } : schoolCoords;
      activateOnline(coords);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'http://localhost:8000'}/api/auth/guardian/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput, password: passwordInput })
      });

      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || "Invalid Bus Guardian name or password.");
        return;
      }

      const data = await res.json();
      sessionStorage.setItem('vmk_token', data.token);
      sessionStorage.setItem('vmk_current_guardian_id', data.id);
      setGuardianId(data.id);
    } catch (err) {
      setLoginError("Server connection failed. Make sure backend is running.");
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: "Logout Confirmation",
      message: "Are you sure you want to log out of the Bus Guardian Portal? This will stop your live location tracking on the school map.",
      onConfirm: async () => {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        
        const schoolCoords = getSchoolCoords(currentGuardian);
        addSystemLog({
          type: 'Bus Guardian Sign-Out',
          schoolId: currentGuardian.schoolId,
          guardianName: currentGuardian.name,
          gps: `${currentGuardian.lastLocation?.lat || schoolCoords.lat}, ${currentGuardian.lastLocation?.lng || schoolCoords.lng}`,
          device: getDeviceString(),
          details: `Bus Guardian ${currentGuardian.name} signed out and terminated tracking for ${schoolName}.`
        });

        await setGuardianOnlineStatus(currentGuardian.id, false);
        sessionStorage.removeItem('vmk_current_guardian_id');
        sessionStorage.removeItem('vmk_token');
        setGuardianId('');
        setNameInput('');
        setPasswordInput('');
        setGpsPermissionStatus('prompt');
      }
    });
  };

  // Handle Dropoff Verification (Manual Code Entry)
  const handleSimulateDropOff = (e) => {
    e.preventDefault();
    const cleanCode = parentCodeInput.trim().replace(/\s+/g, '');
    if (!cleanCode) return;

    // Search parents database to identify who matches this code or relative OTP
    let foundParentId = null;
    for (const p of parents) {
      const expected = getDynamicCode(p.id);
      const cleanExpectedCode = expected.code.trim().replace(/\s+/g, '');
      const cleanExpectedQr = expected.qrValue.trim().replace(/\s+/g, '');

      // Check temporary authorizations, verifying validity duration
      const isTemp = p.tempAuthorizations.some(ta => {
        const cleanTaCode = ta.code.trim().replace(/\s+/g, '');
        const elapsedMs = Date.now() - new Date(ta.createdAt).getTime();
        const isExpired = (ta.type === 'Time Limited (Today)' && elapsedMs > 12 * 60 * 60 * 1000) ||
                          (ta.type === 'Time Limited (2 Days)' && elapsedMs > 48 * 60 * 60 * 1000);
        return cleanTaCode === cleanCode && ta.status === 'Active' && !isExpired;
      });

      if (cleanExpectedCode === cleanCode || cleanExpectedQr === cleanCode || isTemp) {
        foundParentId = p.id;
        break;
      }
    }

    // If a parent matches, verify them. Otherwise, run against first parent to trigger unrecognized log
    const targetParentId = foundParentId || 'PAR-4482';

    const res = verifyPickupEvent({
      parentId: targetParentId,
      guardianId: currentGuardian.id,
      enteredCode: cleanCode,
      isMorning: false
    });

    setDropOffResult(res);
  };

  // Handle real-world QR code scanned
  const handleQrCodeScanned = async (decodedText) => {
    // Stop scanner immediately to prevent double scans
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
      } catch (e) {
        console.warn("Failed to stop scanner on scan:", e);
      }
    }

    if (decodedText.startsWith('VMK-MASTER-')) {
      // Wall QR scan: bound to registered campus GPS coordinates
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await runMasterQrCheck(pos.coords.latitude, pos.coords.longitude);
          },
          async () => {
            // Geolocation error/denied: fallback to out-of-bounds to fail coordinate check
            await runMasterQrCheck(6.9999, 3.9999);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        await runMasterQrCheck(6.9999, 3.9999);
      }
    } else if (decodedText.startsWith('VMK-')) {
      // Parent Dynamic QR code scan
      const parts = decodedText.split('-');
      if (parts.length >= 4) {
        const parentId = `${parts[1]}-${parts[2]}`; // e.g. PAR-4482
        const enteredCode = parts[3];

        const proceedVerify = (coordsStr) => {
          verifyPickupEvent({
            parentId,
            guardianId: currentGuardian.id,
            enteredCode,
            isMorning: false,
            scannedGps: coordsStr
          }).then((res) => {
            setDropOffResult(res);
          });
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              proceedVerify(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
            },
            () => {
              proceedVerify(null);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          proceedVerify(null);
        }
      }
    } else {
      // Process raw alphanumeric code (OTP or Temporary Auth PIN)
      const proceedVerify = (coordsStr) => {
        // Fallback to first available parent or try validation
        const targetParentId = 'PAR-4482';
        verifyPickupEvent({
          parentId: targetParentId,
          guardianId: currentGuardian.id,
          enteredCode: decodedText,
          isMorning: false,
          scannedGps: coordsStr
        }).then((res) => {
          setDropOffResult(res);
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            proceedVerify(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
          },
          () => {
            proceedVerify(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        proceedVerify(null);
      }
    }
  };

  // QR Scanner mounting lifecycle handler
  useEffect(() => {
    let activeScanner = null;
    if (currentGuardian && !dropOffResult) {
      // Small timeout to allow container element mounting to complete in DOM
      const timer = setTimeout(() => {
        const container = document.getElementById("qr-reader-container");
        if (container) {
          const html5QrCode = new Html5Qrcode("qr-reader-container");
          html5QrcodeRef.current = html5QrCode;
          activeScanner = html5QrCode;

          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 180, height: 180 }
            },
            (decodedText) => {
              handleQrCodeScanned(decodedText);
            },
            (errorMessage) => {
              // Ignore scan parsing noise
            }
          ).catch((err) => {
            console.warn("QR Scanner failed to start:", err);
          });
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (activeScanner) {
          activeScanner.stop().then(() => {
            if (html5QrcodeRef.current === activeScanner) {
              html5QrcodeRef.current = null;
            }
          }).catch(err => {
            console.error("Failed to clean up scanner on unmount:", err);
          });
        }
      };
    }
  }, [currentGuardian, dropOffResult]);

  const runMasterQrCheck = async (lat, lng) => {
    const res = await scanMasterQrCode(currentGuardian.id, lat, lng);
    if (res.status === 'VERIFIED') {
      setDropOffResult({
        status: 'VERIFIED',
        log: {
          parentName: 'N/A (Master QR)',
          childName: 'All Bus Passengers',
          gps: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        }
      });
      setConfirmDialog({
        title: res.type === 'Arrival' ? "ARRIVAL REGISTERED" : "DEPARTURE REGISTERED",
        message: res.message,
        isAlert: true,
        confirmText: "OK",
        onConfirm: () => {}
      });
    } else {
      setConfirmDialog({
        title: "SECURITY VIOLATION BLOCKED",
        message: res.message || "LOCATION MISMATCH: Device coordinates do not match registered school locations.",
        isAlert: true,
        confirmText: "Acknowledge Security Alert",
        onConfirm: () => {}
      });
    }
  };

  const handleTriggerPanicSubmit = (type) => {
    triggerPanic(currentGuardian.id, type, panicNote);
    setShowPanicModal(false);
    setPanicNote('');
  };

  const handleCancelPanic = () => {
    const activePanic = activeAlerts.find(a => a.guardianId === currentGuardian.id);
    if (activePanic) {
      setConfirmDialog({
        title: "Resolve Security Emergency",
        message: "Are you sure you want to resolve and cancel this active SOS Panic Alert? This will notify the school safety desk that you are secure.",
        onConfirm: () => resolvePanic(activePanic.id)
      });
    }
  };

  // If logged in, check GPS consent first
  if (currentGuardian && gpsPermissionStatus !== 'granted') {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', border: '2px solid var(--accent-yellow)', margin: 'auto' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1.5rem auto' }}>
            <Navigation size={32} className="animate-pulse" />
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>GPS Telemetry Activation Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '1rem 0 1.5rem 0', lineHeight: '1.5' }}>
            VerifyMyKid requires active GPS telemetry to track school runs in real-time. You must grant location permissions to activate this safety terminal.
          </p>
          <button 
            onClick={() => requestGpsAccessAndLogin(currentGuardian)}
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
          >
            Enable Real-Time Location Access
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleLogout} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}>
              Cancel & Sign Out
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Privacy Note: Geolocation tracking is active only while you are signed into the active route run. Logging out halts tracking immediately.
          </div>
        </div>
      </main>
    );
  }

  // If not logged in, show Login Screen
  if (!currentGuardian) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', alignSelf: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto' }}>
              <Lock size={26} />
            </div>
            <h2>Bus Guardian Terminal</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', marginTop: '0.5rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              SECURED (256-BIT SSL)
            </div>
          </div>

          {loginError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }} id="login-error-msg">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} onKeyDown={(e) => {
            if (e.getModifierState && e.getModifierState('CapsLock')) {
              setCapsLockActive(true);
            } else {
              setCapsLockActive(false);
            }
          }}>
            <div className="form-group">
              <label>Bus Guardian Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Robert Vance"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="input-control"
                id="guardian-login-name"
              />
            </div>

            <div className="form-group">
              <label>Access Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="input-control"
                  style={{ paddingRight: '2.5rem' }}
                  id="guardian-login-pass"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {capsLockActive && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', marginTop: '0.25rem', fontWeight: 'bold' }}>
                  ⚠️ Warning: Caps Lock is ON
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} id="btn-guardian-login">
              Authenticate & Initialize Terminal
            </button>
          </form>
          <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.3' }}>
              ℹ️ Security Audit Info: Device telemetry coordinates and MAC signature logs will register upon terminal start.
            </div>
          </div>
        </div>
      </main>
    );
  }

      // Header Info
      const unreadCount = notifications.filter(n => n.recipientId === currentGuardian?.id && !(n.read || n.isRead)).length;

      return (
        <main className="container" style={{ padding: '2rem 1.5rem', minHeight: 'calc(100vh - 70px)' }}>
          {/* Active Panic Alert Indicator overlay */}
          {hasActivePanic && (
            <div className="pulse-emergency" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justify: 'between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon style={{ color: 'var(--accent-red)' }} className="animate-pulse" />
                <div>
                  <strong style={{ color: 'var(--accent-red)' }}>SOS EMERGENCY BROADCAST ACTIVE</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>Your GPS coordinates and fleet plate details are transmitting to school admins.</div>
                </div>
              </div>
              <button onClick={handleCancelPanic} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#0b0f19', color: '#fff', marginLeft: 'auto' }}>
                Cancel Emergency SOS
              </button>
            </div>
          )}
    
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-cyan)' }}>
                <img src={currentGuardian.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem' }}>{currentGuardian.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Terminal: <strong>{currentGuardian.busNumber}</strong> | Vehicle: {currentGuardian.plateNumber}
                </p>
              </div>
            </div>
    
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Notification Bell Icon */}
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
                id="guardian-notifications-bell"
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

              <button 
                onClick={() => setShowPanicModal(true)} 
                disabled={hasActivePanic}
                className="btn btn-danger" 
                style={{ fontWeight: 'bold' }}
                id="btn-trigger-panic"
              >
                🚨 SOS EMERGENCY PANIC
              </button>
              
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} id="btn-guardian-logout">
                Logout
              </button>
            </div>
          </div>

      <div className="grid-3">
        {/* Route Details Card */}
        <div className="col-span-1">
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
              Bus Guardian Profile Information
            </h3>
            
            {/* Bus Guardian Profile Pic & Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--accent-blue)', flexShrink: 0 }}>
                <img src={currentGuardian.profilePic} alt={currentGuardian.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{currentGuardian.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bus Guardian</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div><strong>School Name:</strong> {schoolName}</div>
              <div><strong>Bus / Plate Number:</strong> {currentGuardian.busNumber} / {currentGuardian.plateNumber}</div>
              <div><strong>Driver Name:</strong> {currentGuardian.driverName}</div>
            </div>
          </div>

          {/* Dynamic Code for Parent morning scan verification */}
          <DynamicCode uniqueId={currentGuardian.id} title="Bus Guardian Verification QR" />
        </div>

        {/* Afternoon release verification portal */}
        <div className="col-span-2">
          <div className="glass-card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 style={{ color: 'var(--accent-green)' }} /> Afternoon Release Terminal (Drop-off Scanner)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Verify parent authorization before releasing a student at their drop-off point. Scan their dynamic QR code or type their OTP PIN below.
            </p>

            {dropOffResult ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                {dropOffResult.status === 'VERIFIED' ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid var(--accent-green)', padding: '2rem', borderRadius: '12px' }} id="dropoff-success-screen">
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto', fontSize: '1.8rem', fontWeight: 'bold' }}>
                      ✓
                    </div>
                    <h2 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>RELEASE AUTHORIZED</h2>
                    
                    {/* Visual Verification Hand-off Profiles */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', marginTop: '1.25rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-cyan)', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)', margin: '0 auto 0.5rem' }}>
                          <img src={currentGuardian.profilePic} alt={currentGuardian.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentGuardian.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Bus Guardian</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--accent-green)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1' }}>↔</div>
                        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '9999px', marginTop: '4px' }}>SECURE MATCH</span>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-blue)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', margin: '0 auto 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
                          {dropOffResult.log.parentName === 'N/A (Master QR)' ? (
                            <School size={28} />
                          ) : (
                            <img src={matchedParent ? matchedParent.profilePic : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} alt={dropOffResult.log.parentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{dropOffResult.log.parentName}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {dropOffResult.log.parentName === 'N/A (Master QR)' ? 'School Compound' : 'Parent'}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                      {dropOffResult.log.parentName === 'N/A (Master QR)'
                        ? `Campus arrival/departure verification code matched successfully.`
                        : `Child identity release checks matches successfully. Release kids to guardian: ${dropOffResult.log.parentName}.`}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-block', textAlign: 'left', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <strong>Audit Trail Details:</strong><br />
                      • Verified Item: {dropOffResult.log.parentName === 'N/A (Master QR)' ? 'School Wall Master QR Code' : `Released To: ${dropOffResult.log.parentName}`}<br />
                      • Passenger Group: {dropOffResult.log.childName}<br />
                      • Coordinates: {dropOffResult.log.gps}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid var(--accent-red)', padding: '2rem', borderRadius: '12px' }} id="dropoff-failed-screen">
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-red)', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1rem auto', fontSize: '1.5rem', fontWeight: 'bold' }}>
                      ✕
                    </div>
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>RELEASE BLOCKED - UNVERIFIED</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                      <strong>Warning:</strong> Code entered does not match parent authorization. Do not release children. Re-check code or contact the school office.
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={() => { setDropOffResult(null); setParentCodeInput(''); }} 
                  className="btn btn-outline" 
                  style={{ marginTop: '1.5rem' }}
                  id="btn-reset-dropoff"
                >
                  Scan Next Parent
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Real-world Camera Scanner Container */}
                <div className="qr-scanner-mock" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <div id="qr-reader-container" style={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden' }}></div>
                  <div className="qr-scanner-line" style={{ pointerEvents: 'none' }} />
                  <div className="qr-corner qr-corner-tl" style={{ pointerEvents: 'none' }} />
                  <div className="qr-corner qr-corner-tr" style={{ pointerEvents: 'none' }} />
                  <div className="qr-corner qr-corner-bl" style={{ pointerEvents: 'none' }} />
                  <div className="qr-corner qr-corner-br" style={{ pointerEvents: 'none' }} />
                </div>

                {/* Manual input form */}
                <form onSubmit={handleSimulateDropOff} style={{ maxWidth: '400px', width: '100%' }}>
                  <div className="form-group" style={{ textAlign: 'center' }}>
                    <label style={{ marginBottom: '0.5rem', display: 'block' }}>Or enter Parent OTP or Temporary Auth PIN:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 582194"
                      value={parentCodeInput}
                      onChange={(e) => setParentCodeInput(e.target.value)}
                      className="input-control"
                      style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.2em' }}
                      id="dropoff-code-box"
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                      💡 <strong>Manual verification:</strong> You can enter the 6-digit OTP showing on the <strong>Parent Portal</strong> safety screen (or relative PIN).
                    </div>
                  </div>

                  <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }} id="btn-dropoff-submit">
                    Verify Release Authority
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Panic Modal */}
      {showPanicModal && (
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
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', border: '2px solid var(--accent-red)', boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              <AlertTriangle /> Trigger SOS Security Panic Alert
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <strong>CRITICAL WARNING:</strong> Activating SOS broadcasts an alarm to school security authorities and logs GPS position. Select the emergency type.
            </p>

            <div className="form-group">
              <label>Optional Incident Details / Note</label>
              <input
                type="text"
                placeholder="e.g. Traffic accident at Lekki Toll Gate"
                value={panicNote}
                onChange={(e) => setPanicNote(e.target.value)}
                className="input-control"
                id="panic-modal-note"
              />
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Select Panic Classification:
            </label>

            {/* Grid of panic classifications */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[
                'Accident',
                'Kidnapping Attempt',
                'Security Threat',
                'Vehicle Breakdown',
                'Medical Emergency',
                'Child Missing',
                'Route Obstruction',
                'Other'
              ].map(type => (
                <button
                  key={type}
                  onClick={() => handleTriggerPanicSubmit(type)}
                  className="btn btn-outline"
                  style={{
                    padding: '0.6rem',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#fff',
                    background: 'rgba(239, 68, 68, 0.05)'
                  }}
                  id={`btn-sos-${type.toLowerCase().replace(/\s+/g, '')}`}
                >
                  🚨 {type}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowPanicModal(false)} 
              className="btn btn-outline" 
              style={{ width: '100%' }}
              id="btn-close-panic-modal"
            >
              Cancel Broadcast
            </button>
          </div>
        </div>
      )}
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
          <div className="glass-card" style={{ maxWidth: '650px', width: '100%', border: '1px solid var(--accent-cyan)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: '#fff' }}>
                <Bell style={{ color: 'var(--accent-cyan)' }} /> Safety Desk & Notifications
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
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Inbox</h4>
                {notifications.filter(n => n.recipientId === currentGuardian.id).length === 0 ? (
                  <div style={{ padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                    No messages from school admin.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {notifications.filter(n => n.recipientId === currentGuardian.id).map(n => (
                      <div 
                        key={n.id} 
                        style={{ 
                          background: (n.read || n.isRead) ? 'var(--bg-secondary)' : 'rgba(6, 182, 212, 0.15)', 
                          border: (n.read || n.isRead) ? '1px solid var(--glass-border)' : '1px solid var(--accent-cyan)', 
                          padding: '0.75rem', 
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <span>{n.title}</span>
                          {!(n.read || n.isRead) && (
                            <button 
                              onClick={() => markNotificationRead(n.id)}
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

              {/* Right Column: Compose */}
              <div className="col-span-1">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Send Message to School</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!composeSubject || !composeMessage) return;
                  sendNotification(currentGuardian.id, currentGuardian.name, currentGuardian.schoolId, composeSubject, composeMessage);
                  setComposeSubject('');
                  setComposeMessage('');
                  alert("Your dispatch message has been sent to Greenwood Academy HQ desk.");
                }}>
                  <div className="form-group">
                    <label>Report Topic *</label>
                    <select
                      required
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="input-control"
                      id="guardian-compose-subject"
                    >
                      <option value="">-- Choose Classification --</option>
                      <option value="Heavy Traffic Delay">Traffic Congestion</option>
                      <option value="Mechanical Delay">Vehicle Issue / Break</option>
                      <option value="Route Change Notification">Route Diversion</option>
                      <option value="Student Absentee Alert">Student Absence</option>
                      <option value="General Check-in / Telemetry Status">Routine Update</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Message Details *</label>
                    <textarea 
                      required 
                      placeholder="Type delay/update details for safety controllers..."
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      className="input-control"
                      style={{ minHeight: '100px', resize: 'none' }}
                      id="guardian-compose-message"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} id="btn-guardian-send">
                    Transmit Status
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
              <button 
                onClick={() => setConfirmDialog(null)}
                className="btn btn-outline" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                id="btn-confirm-no"
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
                id="btn-confirm-yes"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
