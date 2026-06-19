import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './data/mockStore';
import Navbar from './components/Navbar';
import GlobalAlertModal from './components/GlobalAlertModal';
import LandingPage from './portals/LandingPage';
import SchoolRegister from './portals/SchoolRegister';
import ParentSignup from './portals/ParentSignup';
import ParentSignin from './portals/ParentSignin';
import ParentPortal from './portals/ParentPortal';
import BusGuardianPortal from './portals/BusGuardianPortal';
import SchoolAdminPortal from './portals/SchoolAdminPortal';
import SuperAdminPortal from './portals/SuperAdminPortal';
import SchoolSignin from './portals/SchoolSignin';

function AppContent() {
  // Global simulation states representing active login profiles
  const [parentId, setParentId] = useState(() => sessionStorage.getItem('vmk_logged_parent_id') || '');
  const [guardianId, setGuardianId] = useState(() => sessionStorage.getItem('vmk_logged_guardian_id') || '');
  const [schoolId, setSchoolId] = useState(() => sessionStorage.getItem('vmk_logged_school_id') || '');

  useEffect(() => {
    sessionStorage.setItem('vmk_logged_parent_id', parentId);
  }, [parentId]);

  useEffect(() => {
    sessionStorage.setItem('vmk_logged_guardian_id', guardianId);
  }, [guardianId]);

  useEffect(() => {
    sessionStorage.setItem('vmk_logged_school_id', schoolId);
  }, [schoolId]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        parentId={parentId}
        setParentId={setParentId}
        guardianId={guardianId}
        setGuardianId={setGuardianId}
        schoolId={schoolId}
        setSchoolId={setSchoolId}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/school-register" element={<SchoolRegister />} />
          <Route path="/parent-signup" element={<ParentSignup />} />
          <Route path="/parent-signin" element={<ParentSignin setParentId={setParentId} />} />
          
          <Route 
            path="/parent" 
            element={parentId ? <ParentPortal parentId={parentId} setParentId={setParentId} /> : <Navigate to="/parent-signin" />} 
          />
          
          <Route 
            path="/bus-guardian-signin" 
            element={<BusGuardianPortal guardianId={guardianId} setGuardianId={setGuardianId} />} 
          />
          <Route 
            path="/bus-guardian" 
            element={<BusGuardianPortal guardianId={guardianId} setGuardianId={setGuardianId} />} 
          />
          
          <Route path="/school-signin" element={<SchoolSignin setSchoolId={setSchoolId} />} />
          <Route 
            path="/school-admin" 
            element={schoolId ? <SchoolAdminPortal schoolId={schoolId} setSchoolId={setSchoolId} /> : <Navigate to="/school-signin" />} 
          />
          <Route 
            path="/admin-portal" 
            element={<SuperAdminPortal />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      <footer style={{ 
        borderTop: '1px solid var(--glass-border)', 
        background: 'var(--bg-secondary)', 
        padding: '1.5rem', 
        textAlign: 'center', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)' 
      }}>
        <div className="container">
          &copy; {new Date().getFullYear()} VerifyMyKid safety. All rights reserved. • Nigerian School Transportation Trust & Security SaaS.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppContent />
        <GlobalAlertModal />
      </BrowserRouter>
    </StoreProvider>
  );
}
