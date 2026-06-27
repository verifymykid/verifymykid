import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Users, Key, AlertTriangle, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';
import { useStore, hashPassword } from '../data/mockStore';

export default function ParentSignin({ setParentId }) {
  const { parents, schools, addSystemLog, updateParentProfile, setParentOnlineStatus, addSmtpLog, sendParentForgotCode, resetParentPassword } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Signin fields
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  console.log("--- ParentSignin Rendered ---", { emailInput, passwordInput });

  useEffect(() => {
    console.log("--- ParentSignin Mounted ---");
  }, []);

  // Forgot password flow states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Enter code & new password
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const hasAutofilledRef = useRef(false);

  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId && parents.length > 0 && !hasAutofilledRef.current) {
      const p = parents.find(x => x.id === queryId);
      if (p) {
        setEmailInput(p.email);
        hasAutofilledRef.current = true;
      }
    }
  }, [searchParams, parents]);

  useEffect(() => {
    const termMsg = localStorage.getItem('parent_login_error');
    if (termMsg) {
      setError(termMsg);
      localStorage.removeItem('parent_login_error');
    }
  }, []);

  useEffect(() => {
    const parentId = localStorage.getItem('vmk_logged_parent_id');
    if (parentId) {
      navigate('/parent');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'http://localhost:8000'}/api/auth/parent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput })
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Invalid Email/ID or Password.");
        return;
      }

      const data = await res.json();
      localStorage.setItem('vmk_token', data.token);
      setIsLoggingIn(true);

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
      const parentSchool = schools.find(s => s.id === data.schoolId);
      const parentSchoolName = parentSchool ? parentSchool.name : 'School';

      const proceedLogin = async (gpsCoords) => {
        let coordsObj = null;
        if (gpsCoords && gpsCoords !== 'N/A (Permission Denied)' && gpsCoords !== 'N/A (Not Supported)') {
          const parts = gpsCoords.split(',');
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordsObj = { lat, lng };
          }
        }
        await setParentOnlineStatus(data.id, true, coordsObj);

        await addSystemLog({
          type: 'Parent Sign-In',
          schoolId: data.schoolId,
          parentName: data.name,
          gps: gpsCoords,
          device: deviceStr,
          details: `Parent ${data.name} logged into parent portal for ${parentSchoolName}.`
        });
        setParentId(data.id);
        setIsLoggingIn(false);
        navigate('/parent');
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coordsStr = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
            proceedLogin(coordsStr);
          },
          () => {
            proceedLogin('N/A (Permission Denied)');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        proceedLogin('N/A (Not Supported)');
      }
    } catch (err) {
      setError("Server connection failed. Make sure backend is running.");
    }
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setForgotError('');
    try {
      await sendParentForgotCode(forgotEmail.trim());
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || "Failed to send reset code.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long.");
      return;
    }

    try {
      await resetParentPassword(forgotEmail.trim(), codeInput.trim(), newPassword);
      setForgotSuccess("Password reset successful! You can now log in with your new password.");
      setShowForgot(false);
      setPasswordInput(newPassword);
      setEmailInput(forgotEmail.trim());
    } catch (err) {
      setForgotError(err.message || "Password reset failed. Please try again.");
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div className="premium-login-card">
          {!showForgot ? (
            <div>
              {/* Sign In Form View */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem auto', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <img src="/logo.jpg" alt="VerifyMyKid Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h2>Parent Sign-in</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Enter credentials to access child pickup safety dashboard.
                </p>
              </div>

              {forgotSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {forgotSuccess}
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }} id="parent-signin-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="input-underline"
                    id="parent-signin-email"
                  />
                  <Mail className="input-icon" size={18} />
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Password *</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="input-underline"
                    id="parent-signin-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-action-btn"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotStep(1);
                      setForgotError('');
                      setForgotSuccess('');
                      setForgotEmail(emailInput);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    id="btn-forgot-password-trigger"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', borderRadius: '9999px' }} id="btn-parent-login-submit" disabled={isLoggingIn}>
                  {isLoggingIn ? "Authorizing Secure GPS Login..." : "Access Dashboard"}
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Don't have an account? <Link to="/parent-signup" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '600' }}>Register here</Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Forgot Password View */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem auto', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <img src="/logo.jpg" alt="VerifyMyKid Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h2>Reset Password</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {forgotStep === 1 ? 'Enter your registered email to request security reset code.' : 'Enter the code and set your new password.'}
                </p>
              </div>

              {forgotError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {forgotError}
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleSendResetCode}>
                  <div className="form-group">
                    <label>Registered Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input-underline"
                      id="forgot-email-box"
                    />
                    <Mail className="input-icon" size={18} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '9999px' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '0.5rem', borderRadius: '9999px' }}
                      id="btn-send-reset"
                    >
                      Send Reset Code
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label>6-Digit Verification Code *</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      placeholder="e.g. 123456"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                      className="input-underline"
                      style={{ letterSpacing: '0.25em', textAlign: 'center', fontWeight: 'bold' }}
                      id="forgot-code-box"
                    />
                    <Key className="input-icon" size={18} />
                  </div>

                  <div className="form-group">
                    <label>Choose New Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-underline"
                      id="forgot-newpass-box"
                    />
                    <Lock className="input-icon" size={18} />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '9999px' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '0.5rem', borderRadius: '9999px' }}
                      id="btn-submit-newpass"
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
