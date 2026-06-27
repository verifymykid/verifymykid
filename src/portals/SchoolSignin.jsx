import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Key, Mail, Lock } from 'lucide-react';
import { useStore, hashPassword } from '../data/mockStore';

export default function SchoolSignin({ setSchoolId }) {
  const { schools, addSystemLog, addSession } = useStore();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(() => {
    const msg = localStorage.getItem('school_login_error');
    if (msg) {
      localStorage.removeItem('school_login_error');
      return msg;
    }
    return '';
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const proceedLogin = async (gpsCoords = 'N/A', lat = null, lng = null) => {
      try {
        const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'http://localhost:8000'}/api/auth/school/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim(), password: passwordInput, lat, lng })
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.detail || "Unrecognized school email or password.");
          return;
        }

        const data = await res.json();
        localStorage.setItem('vmk_token', data.token);

        if (lat && lng) {
          localStorage.setItem('vmk_school_admin_lat', String(lat));
          localStorage.setItem('vmk_school_admin_lng', String(lng));
        }

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
        
        const sessionObj = await addSession({
          userId: data.id,
          role: 'SCHOOL_ADMIN',
          deviceName: `${browser} on ${os} (Current Device)`,
          ipAddress: '197.210.88.92',
          loginTime: new Date().toISOString(),
          status: 'ACTIVE'
        });
        localStorage.setItem('vmk_current_school_session_id', sessionObj.id);

        await addSystemLog({
          type: 'School Admin Sign-In',
          schoolId: data.id,
          gps: gpsCoords,
          device: deviceStr,
          details: `School administrator logged into ${data.name} dashboard.`
        });

        setSchoolId(data.id);
        navigate('/school-admin');
      } catch (err) {
        setError("Server connection failed. Make sure backend is running.");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          proceedLogin(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng);
        },
        () => {
          proceedLogin('N/A (Permission Denied)');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      proceedLogin('N/A (Not Supported)');
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div className="premium-login-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem auto', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <img src="/logo.jpg" alt="VerifyMyKid Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2>School Admin Sign-in</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
              Access your school dashboard, active routes and guardian management.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }} id="school-signin-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Official School Email *</label>
              <input
                type="email"
                required
                placeholder="admin@school.edu.ng"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="input-underline"
                id="school-signin-email"
              />
              <Mail className="input-icon" size={18} />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="input-underline"
                id="school-signin-pass"
              />
              <Lock className="input-icon" size={18} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', borderRadius: '9999px' }} id="btn-school-login-submit">
              Access Workspace
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Don't have a registered school? <Link to="/school-register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '600' }}>Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
