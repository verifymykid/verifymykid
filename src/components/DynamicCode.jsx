import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Copy } from 'lucide-react';
import { getDynamicCode } from '../data/mockStore';

export default function DynamicCode({ uniqueId, title = "Verification Code" }) {
  const [data, setData] = useState({ code: '000000', qrValue: '', secondsLeft: 180 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Tick update logic
    const update = () => {
      const current = getDynamicCode(uniqueId);
      setData(current);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [uniqueId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SVG QR Code pixel layout helper based on code string
  const generateQrModules = () => {
    const seed = parseInt(data.code) || 123456;
    const size = 21; // Version 1 QR Code size (21x21)
    const modules = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Exclude finder patterns and their 1-module separators
        const isFinder = 
          (r < 8 && c < 8) ||          // Top-Left
          (r < 8 && c > 12) ||         // Top-Right
          (r > 12 && c < 8);           // Bottom-Left

        // Exclude Center Logo area (3x3 grid in the center)
        const isLogo = (r >= 9 && r <= 11 && c >= 9 && c <= 11);

        // Timing patterns (row 6 and col 6)
        const isTiming = (r === 6 || c === 6);

        if (!isFinder && !isLogo && !isTiming) {
          // Deterministic pseudo-random generation based on seed and coordinates
          const active = ((seed * (r + 13) * (c + 37)) % 10) > 4;
          modules.push({ r, c, active });
        } else if (isTiming && !isFinder) {
          // Timing pattern: alternating black and white
          const active = (r === 6 ? c % 2 === 0 : r % 2 === 0);
          modules.push({ r, c, active });
        }
      }
    }
    return modules;
  };

  const qrModules = generateQrModules();

  // Calculate circular stroke offset
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.secondsLeft / 180) * circumference;

  // Determine warning color class for timer
  let timerColor = 'var(--accent-blue)';
  if (data.secondsLeft < 30) {
    timerColor = 'var(--accent-red)';
  } else if (data.secondsLeft < 90) {
    timerColor = 'var(--accent-yellow)';
  }

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
      <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ShieldCheck size={16} style={{ color: 'var(--accent-green)' }} />
        {title}
      </h3>

      {/* Styled Interactive Real QR Code */}
      <div style={{
        padding: '1.25rem 1.25rem 1.5rem 1.25rem',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        marginBottom: '1rem',
        position: 'relative'
      }}>
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(data.qrValue)}`} 
          alt="VerifyMyKid Secure Token" 
          style={{ width: '130px', height: '130px', display: 'block', margin: '0 auto' }} 
        />
        <div style={{ position: 'absolute', bottom: '4px', left: '0', right: '0', fontSize: '0.55rem', color: '#6b7280', fontWeight: '700', letterSpacing: '0.05em' }}>
          SECURE DYNAMIC CREDENTIAL
        </div>
      </div>

      {/* Code Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontSize: '1.8rem',
          fontFamily: 'var(--font-display)',
          fontWeight: '800',
          letterSpacing: '0.15em',
          color: timerColor,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center'
        }}>
          {data.code.slice(0,3)} {data.code.slice(3)}
        </div>
        <button 
          onClick={copyToClipboard}
          className="btn btn-outline" 
          style={{ padding: '0.75rem', borderRadius: '8px', minWidth: '40px' }}
          title="Copy Code"
        >
          {copied ? <span style={{ color: 'var(--accent-green)', fontSize: '0.75rem' }}>Copied</span> : <Copy size={16} />}
        </button>
      </div>

      {/* Countdown Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="timer-circle-container">
          <svg className="timer-circle-svg">
            <circle className="timer-circle-bg" cx="40" cy="40" r={radius} />
            <circle 
              className="timer-circle-bar" 
              cx="40" 
              cy="40" 
              r={radius} 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ stroke: timerColor }}
            />
          </svg>
          <div className="timer-text" style={{ color: timerColor }}>
            {data.secondsLeft}s
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>Token Autorefresh</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Protects against screenshot replay</div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        Token Seed: {uniqueId}
      </div>
    </div>
  );
}
