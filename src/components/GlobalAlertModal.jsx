import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export default function GlobalAlertModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Notification');
  const [type, setType] = useState('info'); // 'info' | 'warning' | 'error' | 'success'

  useEffect(() => {
    const handleAlert = (e) => {
      const msg = e.detail?.message || '';
      setMessage(msg);
      
      // Dynamically determine icon/style based on message content keywords
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('error') || msgLower.includes('fail') || msgLower.includes('invalid') || msgLower.includes('violation') || msgLower.includes('blocked')) {
        setType('error');
        setTitle('Security Alert');
      } else if (msgLower.includes('warning') || msgLower.includes('suspend') || msgLower.includes('attention')) {
        setType('warning');
        setTitle('System Warning');
      } else if (msgLower.includes('success') || msgLower.includes('approved') || msgLower.includes('verified') || msgLower.includes('completed') || msgLower.includes('sent')) {
        setType('success');
        setTitle('Action Successful');
      } else {
        setType('info');
        setTitle('System Information');
      }
      
      setIsOpen(true);
    };

    window.addEventListener('show-custom-alert', handleAlert);
    return () => window.removeEventListener('show-custom-alert', handleAlert);
  }, []);

  // Close alert on 'Enter' key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Icon selector
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <ShieldAlert size={28} style={{ color: 'var(--accent-red, #ef4444)' }} />;
      case 'warning':
        return <AlertTriangle size={28} style={{ color: 'var(--accent-yellow, #eab308)' }} />;
      case 'success':
        return <CheckCircle2 size={28} style={{ color: 'var(--accent-green, #10b981)' }} />;
      case 'info':
      default:
        return <Info size={28} style={{ color: 'var(--accent-blue, #3b82f6)' }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error': return 'rgba(239, 68, 68, 0.4)';
      case 'warning': return 'rgba(245, 158, 11, 0.4)';
      case 'success': return 'rgba(16, 185, 129, 0.4)';
      case 'info':
      default: return 'rgba(59, 130, 246, 0.4)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(7, 10, 19, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999, // Render on top of everything including modals
      animation: 'vmk-fade-in 0.2s ease-out'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.85)',
        border: `1.5px solid ${getBorderColor()}`,
        borderRadius: '16px',
        padding: '2.25rem 2rem',
        maxWidth: '440px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        color: '#f8fafc',
        animation: 'vmk-scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Animated Icon Ring */}
        <div style={{
          margin: '0 auto 1.25rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {getIcon()}
        </div>
        
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          marginBottom: '0.75rem',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '0.01em'
        }}>{title}</h3>
        
        <p style={{
          fontSize: '0.9rem',
          lineHeight: '1.5',
          color: '#cbd5e1',
          marginBottom: '1.75rem',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Inter, sans-serif'
        }}>{message}</p>
        
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, var(--accent-blue, #3b82f6), #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.15s, filter 0.15s'
          }}
          onMouseOver={(e) => {
            e.target.style.filter = 'brightness(1.1)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.target.style.filter = 'none';
            e.target.style.transform = 'none';
          }}
          onMouseDown={(e) => e.target.style.transform = 'translateY(1px)'}
          id="btn-alert-acknowledge"
        >
          Acknowledge
        </button>
      </div>
      
      {/* Keyframe animations */}
      <style>{`
        @keyframes vmk-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes vmk-scale-up {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
