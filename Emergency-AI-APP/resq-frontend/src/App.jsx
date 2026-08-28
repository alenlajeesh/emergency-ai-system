import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import CitizenHome from './pages/CitizenHome';
import ReportEmergency from './pages/ReportEmergency';
import IncidentStatus from './pages/IncidentStatus';
import MyReports from './pages/MyReports';
import EmergencyContacts from './pages/EmergencyContacts';
import ResponderDashboard from './pages/ResponderDashboard';
import './App.css';

export default function App() {
  const location = useLocation();
  const isResponder = location.pathname.startsWith('/responder');

  useEffect(() => {
    document.body.dataset.theme = isResponder ? 'dark' : 'light';
  }, [isResponder]);

  return (
    <div className={isResponder ? 'wide-shell' : 'app-shell'}>
      <Routes>
        <Route path="/" element={<CitizenHome />} />
        <Route path="/report" element={<ReportEmergency />} />
        <Route path="/status/:id" element={<IncidentStatus />} />
        <Route path="/reports" element={<MyReports />} />
        <Route path="/contacts" element={<EmergencyContacts />} />
        <Route path="/responder" element={<ResponderDashboard />} />
      </Routes>

      <Link to={isResponder ? '/' : '/responder'} className="dev-switch mono">
        {isResponder ? '← Citizen view' : 'Responder console →'}
      </Link>
    </div>
  );
}
