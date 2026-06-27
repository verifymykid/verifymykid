import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, CheckCircle2, Mail, Phone, MapPin, Lock, User, Key } from 'lucide-react';
import { useStore } from '../data/mockStore';

export default function ParentSignup() {
  const { registerParent, verifyParentEmail, resendParentOtp, schools, sendNotification } = useStore();
  const navigate = useNavigate();

  const [parentForm, setParentForm] = useState({
    name: '', email: '', phone: '', address: '',
    password: '',
    singleParent: false, spouseName: '', spousePhone: '',
    childrenCount: 1, children: [{ name: '', age: '' }],
    schoolId: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [newParentId, setNewParentId] = useState('');

  const handleParentSignup = async (e) => {
    e.preventDefault();
    const cleanChildren = parentForm.children.filter(c => c.name !== '');
    if (cleanChildren.length === 0) {
      alert("Please add at least one child.");
      return;
    }
    try {
      const p = await registerParent({
        name: parentForm.name,
        email: parentForm.email,
        phone: parentForm.phone,
        address: parentForm.address,
        password: parentForm.password,
        singleParent: parentForm.singleParent,
        spouseName: parentForm.spouseName,
        spousePhone: parentForm.spousePhone,
        children: cleanChildren,
        schoolId: parentForm.schoolId
      });
      
      const targetSchoolObj = schools.find(s => s.id === parentForm.schoolId);
      const targetSchoolName = targetSchoolObj ? targetSchoolObj.name : 'School';
      
      sendNotification(p.id, p.name, p.schoolId, 'New Parent Sign Up', `A new parent has just signed up: Parent ${p.name} registered and is awaiting your access approval.`);
      sendNotification(p.id, p.name, 'SUPER_ADMIN', 'New Parent Sign Up', `A new parent has just signed up: Parent ${p.name} registered at ${targetSchoolName} and is pending approval.`);
      
      setNewParentId(p.id);
      setOtpSent(true);
      setOtpError('');
    } catch (err) {
      alert(err.message || 'Failed to register parent.');
    }
  };

  const handleVerifyParentOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    try {
      await verifyParentEmail(newParentId, otpInput);
      setSignupSuccess(true);
    } catch (err) {
      setOtpError(err.message || 'Invalid verification OTP. Please try again.');
    }
  };

  const handleResendParentOtp = async () => {
    try {
      await resendParentOtp(newParentId);
      alert('Verification OTP code resent successfully to parent email.');
    } catch (err) {
      alert(err.message || 'Failed to resend OTP.');
    }
  };

  const handleChildChange = (index, field, value) => {
    const nextChildren = [...parentForm.children];
    nextChildren[index] = { ...nextChildren[index], [field]: value };
    setParentForm({ ...parentForm, children: nextChildren });
  };

  const addMoreChildren = () => {
    setParentForm(prev => ({
      ...prev,
      children: [...prev.children, { name: '', age: '' }]
    }));
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)', padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {!otpSent ? (
          <div className="premium-login-card">
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <UserPlus style={{ color: 'var(--accent-blue)' }} /> Parent Sign Up Portal
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Register child profiles and authorized pickup arrangements.
            </p>

            <form onSubmit={handleParentSignup}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
                Parent Identity
              </h3>
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Parent Full Name"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  className="input-underline"
                  id="parent-reg-name"
                />
                <User className="input-icon" size={18} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@email.com"
                    value={parentForm.email}
                    onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                    className="input-underline"
                    id="parent-reg-email"
                  />
                  <Mail className="input-icon" size={18} />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 xxxx xxxx"
                    value={parentForm.phone}
                    onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                    className="input-underline"
                    id="parent-reg-phone"
                  />
                  <Phone className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label>Residential Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Street address, Lagos"
                  value={parentForm.address}
                  onChange={(e) => setParentForm({ ...parentForm, address: e.target.value })}
                  className="input-underline"
                  id="parent-reg-address"
                />
                <MapPin className="input-icon" size={18} />
              </div>

              <div className="form-group">
                <label>Account Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Set account password"
                  value={parentForm.password}
                  onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
                  className="input-underline"
                  id="parent-reg-password"
                />
                <Lock className="input-icon" size={18} />
              </div>

              <div className="form-group">
                <label>Select Child's Registered School *</label>
                <select
                  value={parentForm.schoolId}
                  onChange={(e) => setParentForm({ ...parentForm, schoolId: e.target.value })}
                  required
                  className="input-underline"
                  id="parent-reg-school-select"
                >
                  <option value="">-- Choose Registered School --</option>
                  {schools.filter(s => s.status === 'APPROVED').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type} - {s.id})</option>
                  ))}
                </select>
              </div>

              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
                Family Configuration
              </h3>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ margin: 0 }}>Are you a Single Parent?</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={parentForm.singleParent}
                    onChange={(e) => setParentForm({ ...parentForm, singleParent: e.target.checked })}
                    id="parent-reg-single"
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {!parentForm.singleParent && (
                <div className="grid-2">
                  <div className="form-group">
                    <label>Spouse Full Name</label>
                    <input
                      type="text"
                      placeholder="Spouse Name"
                      value={parentForm.spouseName}
                      onChange={(e) => setParentForm({ ...parentForm, spouseName: e.target.value })}
                      className="input-underline"
                      id="parent-reg-spousename"
                    />
                    <User className="input-icon" size={18} />
                  </div>
                  <div className="form-group">
                    <label>Spouse Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Spouse Mobile"
                      value={parentForm.spousePhone}
                      onChange={(e) => setParentForm({ ...parentForm, spousePhone: e.target.value })}
                      className="input-underline"
                      id="parent-reg-spousephone"
                    />
                    <Phone className="input-icon" size={18} />
                  </div>
                </div>
              )}

              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
                Children Profiles
              </h3>

              {parentForm.children.map((child, index) => (
                <div key={index} className="grid-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="form-group">
                    <label>Child #{index + 1} Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Child's Full Name"
                      value={child.name}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className="input-underline"
                      id={`child-name-${index}`}
                    />
                    <User className="input-icon" size={18} />
                  </div>
                  <div className="form-group">
                    <label>Child #{index + 1} Age *</label>
                    <input
                      type="number"
                      required
                      placeholder="Age"
                      value={child.age}
                      onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                      className="input-underline"
                      id={`child-age-${index}`}
                    />
                  </div>
                </div>
              ))}

              <button 
                type="button" 
                onClick={addMoreChildren} 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', borderRadius: '9999px' }}
                id="btn-add-child"
              >
                + Add Another Child
              </button>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: '9999px' }} id="btn-parent-submit">
                Register & Verify Email
              </button>
            </form>
          </div>
        ) : !signupSuccess ? (
          <div className="premium-login-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Mail size={32} style={{ color: 'var(--accent-yellow)' }} />
            </div>
            <h2>Verify Your Email</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              We've sent a 6-digit verification code to <strong>{parentForm.email}</strong>. Please check your inbox and enter the OTP below.
            </p>

            {otpError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyParentOtp} style={{ maxWidth: '300px', margin: '0 auto' }}>
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
                  id="parent-otp-input-box"
                />
              </div>
              <button type="submit" className="btn btn-warning" style={{ width: '100%', fontWeight: 'bold', borderRadius: '9999px' }} id="btn-verify-parent-otp">
                Verify Email Address
              </button>
              <button 
                type="button" 
                onClick={handleResendParentOtp} 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '0.5rem', borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)', borderRadius: '9999px' }}
                id="btn-resend-parent-otp"
              >
                Resend Verification Code
              </button>
            </form>
          </div>
        ) : (
          <div className="premium-login-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2>Account Registered!</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Your account has been registered successfully. It is currently <strong>PENDING</strong> school admin approval. You will be able to sign in with your email address and password once the school administration approves your access profile.
            </p>

            <button 
              onClick={() => navigate('/parent-signin')} 
              className="btn btn-primary"
              style={{ borderRadius: '9999px', width: '100%' }}
              id="btn-goto-signin"
            >
              Proceed to Parent Sign-in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
