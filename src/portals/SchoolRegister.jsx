import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Mail, CheckCircle2, Phone, MapPin, Lock, Globe, Key } from 'lucide-react';
import { useStore } from '../data/mockStore';

export default function SchoolRegister() {
  const { registerSchool, verifySchoolEmail, addSmtpLog } = useStore();
  const navigate = useNavigate();
  
  const [schoolForm, setSchoolForm] = useState({
    name: '', address: '', phone: '', email: '', website: '', type: 'Primary'
  });
  const [registeredSchoolId, setRegisteredSchoolId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [schoolVerified, setSchoolVerified] = useState(false);
  const [emailType, setEmailType] = useState('domain'); // 'domain' | 'normal'
  const [emailError, setEmailError] = useState('');

  // Password fields state
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSchoolRegister = async (e) => {
    e.preventDefault();
    if (!schoolForm.name || !schoolForm.email) return;

    // Email validation based on type selection
    const email = schoolForm.email.trim().toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'aol.com', 'mail.com', 'zoho.com', 'yandex.com', 'protonmail.com', 'proton.me'];
    const emailDomain = email.split('@')[1] || '';

    if (emailType === 'domain') {
      if (publicDomains.includes(emailDomain)) {
        setEmailError("Please enter an institutional/school domain email (or switch to Normal Mail above).");
        return;
      }
    } else if (emailType === 'normal') {
      if (!publicDomains.includes(emailDomain)) {
        setEmailError("Please enter a normal email provider domain like gmail.com or yahoo.com (or switch to Domain Mail above).");
        return;
      }
    }

    // Password validation checks
    if (passwordInput !== confirmPasswordInput) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (passwordInput.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setEmailError('');
    setPasswordError('');

    try {
      const newSchool = await registerSchool({
        ...schoolForm,
        password: passwordInput
      });
      setRegisteredSchoolId(newSchool.id);
      setOtpSent(true);
    } catch (err) {
      alert(err.message || "Registration failed. Please try again.");
    }
  };

  const handleVerifySchoolOtp = async (e) => {
    e.preventDefault();
    try {
      await verifySchoolEmail(registeredSchoolId, otpInput);
      setSchoolVerified(true);
    } catch (err) {
      alert(err.message || "Invalid OTP! Please enter the code sent to your email.");
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await fetch(`${localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io'}/api/schools/${registeredSchoolId}/resend-otp`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error("Failed to resend OTP.");
      }
      alert("Verification OTP code resent successfully to school email.");
    } catch (err) {
      alert(err.message || "Failed to resend OTP.");
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '550px', width: '100%' }}>
        {!otpSent ? (
          <div className="premium-login-card">
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <School style={{ color: 'var(--accent-blue)' }} /> School Registration
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Create a school profile to manage your fleet and student authorizations.
            </p>
            
            <form onSubmit={handleSchoolRegister}>
              <div className="form-group">
                <label>School Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenwood Academy VI"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="input-underline"
                  id="reg-school-name"
                />
                <School className="input-icon" size={18} />
              </div>
              
              <div className="form-group">
                <label>Official Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot, Street, Victoria Island/Ikeja, Lagos"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="input-underline"
                  id="reg-school-address"
                />
                <MapPin className="input-icon" size={18} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span>Official Email *</span>
                    <span style={{ display: 'inline-flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                      <button
                        type="button"
                        onClick={() => { setEmailType('domain'); setEmailError(''); }}
                        style={{
                          background: emailType === 'domain' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                          border: 'none',
                          color: emailType === 'domain' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        Domain Mail
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEmailType('normal'); setEmailError(''); }}
                        style={{
                          background: emailType === 'normal' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                          border: 'none',
                          color: emailType === 'normal' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        Normal Mail
                      </button>
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={emailType === 'domain' ? "admin@school.edu.ng" : "schoolname@gmail.com"}
                    value={schoolForm.email}
                    onChange={(e) => {
                      setSchoolForm({ ...schoolForm, email: e.target.value });
                      setEmailError('');
                    }}
                    className="input-underline"
                    id="reg-school-email"
                  />
                  <Mail className="input-icon" size={18} />
                  {emailError && (
                    <div style={{ color: 'var(--accent-red)', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: 'bold' }}>
                      ⚠️ {emailError}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 xxxx xxxx"
                    value={schoolForm.phone}
                    onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    className="input-underline"
                    id="reg-school-phone"
                  />
                  <Phone className="input-icon" size={18} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Website URL</label>
                  <input
                    type="url"
                    placeholder="www.school.edu.ng"
                    value={schoolForm.website}
                    onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                    className="input-underline"
                    id="reg-school-website"
                  />
                  <Globe className="input-icon" size={18} />
                </div>
                <div className="form-group">
                  <label>School Type *</label>
                  <select
                    value={schoolForm.type}
                    onChange={(e) => setSchoolForm({ ...schoolForm, type: e.target.value })}
                    className="input-underline"
                    id="reg-school-type"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary / High School</option>
                    <option value="Both">Both Levels</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Create Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="input-underline"
                    id="reg-school-pass"
                  />
                  <Lock className="input-icon" size={18} />
                </div>
                <div className="form-group">
                  <label>Verify Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPasswordInput}
                    onChange={(e) => {
                      setConfirmPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="input-underline"
                    id="reg-school-verify-pass"
                  />
                  <Lock className="input-icon" size={18} />
                </div>
              </div>
              {passwordError && (
                <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                  ⚠️ {passwordError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', borderRadius: '9999px' }} id="btn-submit-school-reg">
                Proceed to Email Verification
              </button>
            </form>
          </div>
        ) : !schoolVerified ? (
          <div className="premium-login-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Mail size={32} style={{ color: 'var(--accent-yellow)' }} />
            </div>
            <h2>Email Verification</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              We've sent a 6-digit verification code to <strong>{schoolForm.email}</strong>. Please enter the OTP below.
            </p>

            <form onSubmit={handleVerifySchoolOtp} style={{ maxWidth: '300px', margin: '0 auto' }}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Enter OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="input-underline"
                  style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.3rem', paddingRight: '0 !important' }}
                  id="otp-input-box"
                />
              </div>
              <button type="submit" className="btn btn-warning" style={{ width: '100%', borderRadius: '9999px' }} id="btn-verify-otp">
                Verify & Register
              </button>
              <button 
                type="button" 
                onClick={handleResendOtp} 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '0.5rem', borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)', borderRadius: '9999px' }}
                id="btn-resend-otp"
              >
                Resend Verification Code
              </button>
            </form>
          </div>
        ) : (
          <div className="premium-login-card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2>Registration Received!</h2>
            <div className="badge badge-warning" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', borderRadius: '9999px' }}>
              STATUS: PENDING APPROVAL
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
