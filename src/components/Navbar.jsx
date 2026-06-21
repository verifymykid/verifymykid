import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldAlert, Settings, ChevronUp, ChevronDown, RefreshCw, Menu, X, Sun, Moon } from 'lucide-react';
import { useStore } from '../data/mockStore';

export default function Navbar({ parentId, setParentId, guardianId, setGuardianId, schoolId, setSchoolId }) {
  const { activeAlerts, parents, guardians, schools } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [trayExpanded, setTrayExpanded] = useState(true);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to check if current route matches
  const isActive = (path) => location.pathname === path;

  const getThemeStorageKey = (pathname) => {
    if (pathname.startsWith('/admin-portal')) return 'vmk_theme_super_admin';
    if (pathname.startsWith('/school-admin')) return 'vmk_theme_school_admin';
    if (pathname.startsWith('/parent')) return 'vmk_theme_parent';
    if (pathname.startsWith('/bus-guardian')) return 'vmk_theme_guardian';
    return 'vmk_theme_website';
  };

  const currentKey = getThemeStorageKey(location.pathname);
  const [theme, setTheme] = useState(() => localStorage.getItem(currentKey) || 'light');

  // Sync theme when location changes
  useEffect(() => {
    const key = getThemeStorageKey(location.pathname);
    const savedTheme = localStorage.getItem(key) || 'light';
    setTheme(savedTheme);
  }, [location.pathname]);

  // Apply theme change to DOM and persist
  useEffect(() => {
    const key = getThemeStorageKey(location.pathname);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(key, theme);
  }, [theme, location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Stable click-outside listener to close the login dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const container = document.getElementById('login-dropdown-container');
      if (container && !container.contains(event.target)) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div>
      {/* Real-time Emergency Banner - Only displayed on Super Admin or the affected School's Admin portal */}
      {(() => {
        if (location.pathname === '/admin-portal') {
          const superAdminAlerts = activeAlerts.filter(a => !a.acknowledgedBySuperAdmin);
          if (superAdminAlerts.length > 0) {
            return (
              <div style={{
                background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
                color: 'white',
                padding: '0.6rem 1rem',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                position: 'relative',
                zIndex: 101
              }}>
                <ShieldAlert size={18} className="animate-pulse" />
                <span>REAL-TIME ALERT: {superAdminAlerts.length} ACTIVE EMERGENCY SOS BROADCASTING.</span>
              </div>
            );
          }
        }
        if (location.pathname === '/school-admin' && schoolId) {
          const schoolAlerts = activeAlerts.filter(a => a.schoolId === schoolId && !a.acknowledgedBySchoolAdmin);
          if (schoolAlerts.length > 0) {
            return (
              <div style={{
                background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
                color: 'white',
                padding: '0.6rem 1rem',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                position: 'relative',
                zIndex: 101
              }}>
                <ShieldAlert size={18} className="animate-pulse" />
                <span>REAL-TIME ALERT: {schoolAlerts.length} ACTIVE EMERGENCY SOS BROADCASTING FOR YOUR SCHOOL.</span>
              </div>
            );
          }
        }
        return null;
      })()}

      {/* Clean Production Website Navbar */}
      <header className="navbar" style={{ position: 'relative' }}>
        <div className="container navbar-content">
          <Link to="/" className="logo" onClick={() => setMobileMenuOpen(false)}>
            <Shield size={26} style={{ color: 'var(--accent-blue)' }} />
            Verify<span>mykid</span>
          </Link>

          {/* Hamburger Menu Toggle Button */}
          <button 
            className="nav-menu-mobile-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            id="btn-mobile-hamburger"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Nav Links requested by user modeled after asctimetables.com */}
          <nav className="nav-menu-desktop">
            
            {/* Country Chooser representing Nigeria */}
            <div className="website-country-chooser" style={{ marginRight: '0.5rem' }}>
              <span className="website-country-flag" />
              <span>NG</span>
            </div>

            {/* Dark Mode Toggle Button */}
            <button 
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.4rem',
                borderRadius: '50%',
                marginRight: '1rem',
                transition: 'var(--transition-smooth)'
              }}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              id="btn-theme-toggle"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <Link 
              to="/" 
              style={{
                color: isActive('/') ? 'var(--accent-blue)' : 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'var(--transition-smooth)'
              }}
              id="nav-home"
            >
              Main Page
            </Link>

            <a 
              href="#testimonials" 
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'var(--transition-smooth)'
              }}
              id="nav-testimonials"
            >
              Testimonials
            </a>

            <a 
              href="#prices" 
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'var(--transition-smooth)'
              }}
              id="nav-prices"
            >
              Prices
            </a>

            <Link 
              to="/school-register" 
              style={{
                color: isActive('/school-register') ? 'var(--accent-blue)' : 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'var(--transition-smooth)'
              }}
              id="nav-school-register"
            >
              Register School
            </Link>

            {/* Multi-role Login Dropdown */}
            <div 
              id="login-dropdown-container"
              style={{ position: 'relative', display: 'inline-block' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive('/parent-signin') || isActive('/parent') || isActive('/school-signin') || isActive('/school-admin') || isActive('/bus-guardian-signin') || isActive('/bus-guardian') || isActive('/admin-portal') ? 'var(--accent-blue)' : 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0'
                }}
                id="btn-login-dropdown"
              >
                Sign In <ChevronDown size={14} />
              </button>
              
              {loginDropdownOpen && (
                <div 
                  className="nav-dropdown"
                  id="login-dropdown-menu"
                >
                  <Link 
                    to="/school-signin" 
                    onClick={() => setLoginDropdownOpen(false)}
                    className={`nav-dropdown-item ${isActive('/school-signin') || isActive('/school-admin') ? 'active' : ''}`}
                    id="link-dropdown-school"
                  >
                    School Login
                  </Link>
                  <Link 
                    to="/parent-signin" 
                    onClick={() => setLoginDropdownOpen(false)}
                    className={`nav-dropdown-item ${isActive('/parent-signin') || isActive('/parent') ? 'active' : ''}`}
                    id="link-dropdown-parent"
                  >
                    Parent Login
                  </Link>
                  <Link 
                    to="/bus-guardian-signin" 
                    onClick={() => setLoginDropdownOpen(false)}
                    className={`nav-dropdown-item ${isActive('/bus-guardian-signin') || isActive('/bus-guardian') ? 'active' : ''}`}
                    id="link-dropdown-guardian"
                  >
                    Bus Guardian Login
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Mobile Nav Links Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" id="mobile-menu-drawer">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: isActive('/') ? 'var(--accent-blue)' : '#fff',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Main Page
            </Link>
            <a 
              href="#testimonials" 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Testimonials
            </a>
            <a 
              href="#prices" 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Prices
            </a>
            <Link 
              to="/school-register" 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: isActive('/school-register') ? 'var(--accent-blue)' : '#fff',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Register School
            </Link>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
              <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '600' }}>Theme</span>
              <button 
                onClick={toggleTheme}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem'
                }}
                id="btn-theme-toggle-mobile"
              >
                {theme === 'light' ? <><Moon size={14} /> Dark</> : <><Sun size={14} /> Light</>}
              </button>
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.25rem 0' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SIGN IN PORTALS</div>
              <Link 
                to="/school-signin" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: isActive('/school-signin') ? 'var(--accent-blue)' : '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                School Portal
              </Link>
              <Link 
                to="/parent-signin" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: isActive('/parent-signin') ? 'var(--accent-blue)' : '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Parent Portal
              </Link>
              <Link 
                to="/bus-guardian-signin" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: isActive('/bus-guardian-signin') ? 'var(--accent-blue)' : '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Bus Guardian Portal
              </Link>
            </div>
          </div>
        )}
      </header>

    </div>
  );
}
