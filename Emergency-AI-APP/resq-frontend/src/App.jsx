import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportEmergency from './pages/ReportEmergency';
import MyReports from './pages/MyReports';
import IncidentStatus from './pages/IncidentStatus';
import ResponderDashboard from './pages/ResponderDashboard';
import AdminControlCenter from './pages/AdminControlCenter';
import './App.css';

function PageTheme() {
  const location = useLocation();
  useEffect(() => { document.body.dataset.theme = location.pathname.startsWith('/responder') || location.pathname.startsWith('/admin') ? 'dark' : 'light'; }, [location.pathname]);
  return null;
}

export default function App() {
  return <><PageTheme/><Routes>
    <Route path="/" element={<LandingPage/>}/>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/signup" element={<AuthPage/>}/>
    <Route path="/citizen" element={<RequireRole role="citizen"><CitizenDashboard/></RequireRole>}/>
    <Route path="/citizen/report" element={<RequireRole role="citizen"><ReportEmergency/></RequireRole>}/>
    <Route path="/citizen/reports" element={<RequireRole role="citizen"><MyReports/></RequireRole>}/>
    <Route path="/citizen/incidents/:number" element={<RequireRole role="citizen"><IncidentStatus/></RequireRole>}/>
    <Route path="/responder" element={<RequireRole role="responder"><ResponderDashboard/></RequireRole>}/>
    <Route path="/admin/control-center" element={<RequireRole role="admin"><AdminControlCenter/></RequireRole>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></>;
}
