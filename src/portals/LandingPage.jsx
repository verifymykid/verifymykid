import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Bus, MapPin, Bell, Route, Users, BarChart3, 
  ShieldCheck, AlertTriangle, Smartphone, Mail, Phone, 
  MessageSquare, ArrowRight, Check 
} from 'lucide-react';

export default function LandingPage() {
  const [formData, setFormData] = useState({ name: '', schoolName: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [typedText, setTypedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    const fullText = "Track School Runs in Real Time";
    let index = 0;
    setTypedText("");
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setTypedText(fullText.substring(0, index + 1));
        index++;
      }
      if (index >= fullText.length) {
        clearInterval(interval);
        setTypingComplete(true);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.05 });

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const base = localStorage.getItem('vmk_api_base_url') || 'https://168-231-112-221.sslip.io';
      const res = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        throw new Error("Failed to send inquiry. Please check your network connection.");
      }
      
      setSubmitted(true);
      setFormData({ name: '', schoolName: '', phone: '', email: '', message: '' });
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setSubmitError(err.message || "An error occurred while sending the message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hero Section */}
      <section className="bg-hero-gradient relative flex flex-col justify-center overflow-hidden" style={{ padding: '6rem 0' }}>
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none"></div>
        <div className="container hero-grid">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h1 className="hero-title" style={{ minHeight: '110px' }}>
                <span className="text-gradient" style={{ position: 'relative' }}>{typedText}</span>
                {!typingComplete && <span className="typewriter-cursor">|</span>}
              </h1>
              
              {typingComplete && (
                <div className="reveal-anim" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <p style={{ fontSize: '1.15rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', maxWidth: '520px', margin: 0 }}>
                    Give parents peace of mind. Give administrators complete control of their fleet live GPS, parent alerts, and powerful analytics. Starting completely free.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link to="/school-register" className="btn-primary-lg shadow-glow-blue animate-pulse-green">
                      Start for free — no card required <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {typingComplete && (
              <div className="reveal-anim" style={{ display: 'flex', gap: '3rem', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>Students</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>tracked safely</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>99.9% Uptime</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>guaranteed</span>
                </div>
              </div>
            )}
          </div>

          {/* Replica CSS/SVG Snapshot Mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="animate-float" style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
              
              {/* Fleet Snapshot Box */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                backdropFilter: 'blur(16px)', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                borderRadius: '24px', 
                padding: '1.5rem', 
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Fleet Snapshot</p>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>Current Fleet Status</h3>
                  </div>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '9999px', 
                    background: 'rgba(16, 185, 129, 0.2)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    color: '#34d399', 
                    fontSize: '0.7rem', 
                    fontWeight: '600' 
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    Live
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>12</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Total Buses</p>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa', margin: 0 }}>9</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Active</p>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa', margin: 0 }}>7</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>On Route</p>
                  </div>
                </div>

                {/* SVG Route Map Graphic */}
                <div style={{ position: 'relative', height: '140px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="100%" height="100%" viewBox="0 0 320 140" fill="none">
                      <line x1="0" y1="70" x2="320" y2="70" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
                      <line x1="160" y1="0" x2="160" y2="140" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="20" x2="280" y2="120" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                    </svg>
                  </div>
                  
                  {/* Active SVG path */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 320 140">
                    <path d="M 40 110 Q 120 40 200 80 T 290 35" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {/* Pulsing Coordinates */}
                    <circle cx="40" cy="110" r="4" fill="#3b82f6" />
                    <circle cx="150" cy="62" r="4" fill="#3b82f6" />
                    <circle cx="290" cy="35" r="4" fill="#60a5fa" />
                  </svg>
                  
                  <span style={{ position: 'absolute', left: '12%', top: '75%', fontSize: '1.25rem', transform: 'translate(-50%, -50%)' }}>🚌</span>
                  <span style={{ position: 'absolute', left: '46%', top: '40%', fontSize: '1.25rem', transform: 'translate(-50%, -50%)' }}>🚌</span>
                  <span style={{ position: 'absolute', left: '88%', top: '22%', fontSize: '1.25rem', transform: 'translate(-50%, -50%)' }}>🚌</span>
                  <span style={{ position: 'absolute', top: '8px', left: '8px', color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.65rem', fontWeight: 'bold' }}>Lekki-Victoria Island Axis</span>
                </div>
              </div>

              {/* Floating notification bubbles */}
              <div style={{ 
                position: 'absolute', 
                bottom: '-25px', 
                left: '-15px', 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '0.85rem 1rem', 
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)', 
                border: '1px solid rgba(15, 23, 42, 0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                maxWidth: '220px',
                zIndex: 12
              }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🔔</span>
                <div>
                  <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.8rem', margin: 0, lineHeight: '1.2' }}>Bus arrived!</p>
                  <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>Emma's bus at Lekki stop</p>
                </div>
              </div>

              <div style={{ 
                position: 'absolute', 
                top: '-20px', 
                right: '-15px', 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '0.75rem 1rem', 
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)', 
                border: '1px solid rgba(15, 23, 42, 0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem',
                zIndex: 12
              }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📍</span>
                <div>
                  <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.75rem', margin: 0, lineHeight: '1.2' }}>ETA 4 mins</p>
                  <p style={{ color: '#64748b', fontSize: '0.65rem', margin: 0 }}>Bus 12A — Route A</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Trust Tape Header Section */}
      <section className="scroll-reveal" style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)', padding: '5rem 0', textAlign: 'center', backdropFilter: 'var(--backdrop-blur)', WebkitBackdropFilter: 'var(--backdrop-blur)' }}>
        <div className="container">
          <p style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Trusted by forward-thinking Nigerian schools
          </p>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="section scroll-reveal" id="features">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 4rem auto' }}>
            <span className="section-label">Platform Features</span>
            <h2 className="landing-section-h2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Everything you need to run a <span className="text-gradient">safer school fleet</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
              From a single campus school with 1 bus to a large fleet of 50 — VerifyMyKid scales with your administrative safety requirements.
            </p>
          </div>

          <div className="grid-3">
            
            {/* Feature 1 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <MapPin size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Live GPS Tracking</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                See every transit bus on an interactive Lagos map in real time. Know exactly where your fleet is — always.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Bell size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Instant Parent Alerts</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Parents get WhatsApp-style push notifications and SMS receipts the moment their child boards or alights.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Route size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Smart Route Planning</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Plan and manage multiple route directions, allocate guardians, and optimize student pick-up points.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <BarChart3 size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Analytics Dashboard</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Track route times, driver speeds, verification delays, and download compliance audits instantly.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <AlertTriangle size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>SOS Incident Dispatch</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Bus escorts trigger panic alerts in traffic jams, breakdowns, or threats, streaming GPS data to the office.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-hover">
              <span className="icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Smartphone size={20} />
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Parent Mobile Portal</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Beautiful client interface for parents to monitor active ETAs, copy relative OTP tokens, and track logs.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section scroll-reveal" id="how-it-works" style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', backdropFilter: 'var(--backdrop-blur)', WebkitBackdropFilter: 'var(--backdrop-blur)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 4rem auto' }}>
            <span className="section-label">Operational Flow</span>
            <h2 className="landing-section-h2" style={{ color: 'var(--text-primary)' }}>
              Up and running in <span className="text-gradient">minutes</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              No proprietary GPS hardware required. Simply Signup, and go.
            </p>
          </div>

          <div className="grid-4">
            
            {/* Step 1 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>🏫</span>
                <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.9rem' }}>STEP 01</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>School Registers Fleet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Create a school admin profile, input active bus details, build transit routes, and auto-generate guardian credentials.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>🚌</span>
                <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.9rem' }}>STEP 02</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Bus Guardian Starts Trip</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                The bus escort logs in on their mobile terminal, clicks "Start Route", and their device streams coordinate telemetry.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>📱</span>
                <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.9rem' }}>STEP 03</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Parents Track Safely</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Parents see live bus positions on Google Maps, receive boarding alerts, and read out secure rotating OTP codes.
              </p>
            </div>

            {/* Step 4 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>📊</span>
                <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.9rem' }}>STEP 04</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Admins Audit History</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Audit trip speed thresholds, attendance timestamps, parent check-ins, and compile safety compliance records.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials & Stats Section */}
      <section className="section scroll-reveal" id="testimonials">
        <div className="container">
          
          <div className="grid-2" style={{ marginBottom: '5rem', maxWidth: '600px', margin: '0 auto 5rem auto' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <span style={{ fontSize: '1.75rem', marginBottom: '0.25rem', display: 'block' }}>🆓</span>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.25rem 0' }}>₦0</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Minimum to start</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <span style={{ fontSize: '1.75rem', marginBottom: '0.25rem', display: 'block' }}>⚡</span>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.25rem 0' }}>99.9%</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Platform uptime</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <span className="section-label">Testimonials</span>
            <h2 className="landing-section-h2" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              What Nigerian school administrators say
            </h2>
          </div>

          <div className="grid-3">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                "VerifyMyKid has transformed school runs at our primary school. Parent pickup anxieties have dropped to zero. The rotating 3-minute QR scan takes less than 3 seconds to verify at the gate!"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  CA
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Mrs. Constance Anyaegbu</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Stancee Educational • Lagos.</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                "In Lagos traffic, timings are complicated. The Temporary Pickup Code is a lifesaver. I can easily generate a one-off authorization PIN for our driver or relative, knowing my kid is safe."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  HA
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Mrs. Hadessa</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Parent • Lekki</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                "The fleet dashboard is exceptionally easy to manage. Adding guardians, tracking route locations on Google Maps, and receiving instantaneous SOS alerts provides total operational control."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  TN
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Mr Timothy Nwachukwu</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>School Head Staff</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser replaced with Contact Us Section */}
      <section className="section scroll-reveal" id="prices" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 4rem auto' }}>
            <span className="section-label">Pricing Inquiry</span>
            <h2 className="landing-section-h2" style={{ color: 'var(--text-primary)' }}>
              Start free, scale as you grow
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              We support custom deployments based on student enrollment. Reach out to get a custom quote.
            </p>
          </div>

          <div className="contact-container">
            {/* Left Column: Direct Inquiry */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', justifyContent: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Contact Sales Team</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Have questions about setup, fleet hardware, pricing models, or integration timelines? Our representative is standing by.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <a href="mailto:hello@verifymykid.com" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={18} />
                  </span>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Send Email Enquiry</strong>
                    <span>hello@verifymykid.com</span>
                  </div>
                </a>

                <a href="tel:+2349159185081" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={18} />
                  </span>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Direct Phone Call</strong>
                    <span>+234 9159185081</span>
                  </div>
                </a>

                <a href="https://wa.me/2349159185081" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eafaf1', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={18} />
                  </span>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>WhatsApp Fleet Support</strong>
                    <span>Click to chat instantly</span>
                  </div>
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={18} />
                  </span>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Office HQ Location</strong>
                    <span>Bar Beach Towers, Victoria Island, Lagos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Inquiry Form */}
            <div className="card">
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Send Us a Message</h3>
              
              {submitted ? (
                <div style={{ background: '#eafaf1', border: '1px solid #10b981', color: '#047857', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>✓</span>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Enquiry Received Successfully!</strong>
                  <span style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '0.25rem', display: 'block' }}>
                    Our Lagos-based fleet coordinator will email or call you back shortly.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {submitError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      {submitError}
                    </div>
                  )}
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Your Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Mrs. Alabi" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-control" 
                      style={{ color: 'var(--text-primary)' }}
                      id="contact-form-name"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>School Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Greenwood Academy" 
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="input-control" 
                      style={{ color: 'var(--text-primary)' }}
                      id="contact-form-school"
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Phone Number *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="+234 xxxx xxxx" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-control" 
                        style={{ color: 'var(--text-primary)' }}
                        id="contact-form-phone"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="admin@school.ng" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-control" 
                        style={{ color: 'var(--text-primary)' }}
                        id="contact-form-email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Message / Requirements *</label>
                    <textarea 
                      rows={3} 
                      required 
                      placeholder="Specify your school's estimated student count and bus numbers..." 
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="input-control" 
                      style={{ color: 'var(--text-primary)', resize: 'none' }}
                      id="contact-form-message"
                    />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '0.8rem', width: '100%', marginTop: '0.5rem' }} id="btn-submit-contact">
                    {isSubmitting ? "Sending Inquiry..." : "Submit Inquiry Message"}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-hero-gradient relative overflow-hidden scroll-reveal" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: '680px' }}>
          <span style={{ 
            display: 'inline-block', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '9999px', 
            background: 'rgba(59, 130, 246, 0.15)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            color: '#93c5fd', 
            fontSize: '0.75rem', 
            fontWeight: '600',
            marginBottom: '1.5rem'
          }}>
            🇳🇬 Built for Nigerian Schools
          </span>
          <h2 className="landing-section-h2" style={{ lineHeight: '1.2' }}>
            Join schools already on VerifyMyKid
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem', marginBottom: '2rem' }}>
            Give parents peace of mind. Give your administrators control. Start completely free today.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/school-register" className="btn-primary-lg shadow-glow-blue">Create Free Account</Link>
            <a href="#prices" className="btn-outline-lg">Talk to Sales</a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '2rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Check size={14} style={{ color: '#60a5fa' }} /> No credit card required</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Check size={14} style={{ color: '#60a5fa' }} /> Free plan available forever</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Check size={14} style={{ color: '#60a5fa' }} /> Up and running in minutes</span>
          </div>
        </div>
      </section>

    </div>
  );
}
