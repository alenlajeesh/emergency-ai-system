import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ClipboardList, PhoneCall, ChevronRight } from 'lucide-react';
import RadarButton from '../components/RadarButton';
import { detectLocation, listIncidents } from '../mock/api';
import './CitizenHome.css';

export default function CitizenHome() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const recentCount = listIncidents().length;

  useEffect(() => {
    detectLocation().then(setLocation);
  }, []);

  return (
    <div className="citizen-home">
      <header className="citizen-home__header">
        <div className="citizen-home__brand">
          <span className="citizen-home__mark">RESQ</span>
        </div>
        <div className="citizen-home__location">
          <MapPin size={13} />
          <span className="mono">{location ? location.label : 'Detecting…'}</span>
        </div>
      </header>

      <main className="citizen-home__main">
        <p className="citizen-home__prompt">Need emergency assistance?</p>
        <RadarButton onClick={() => navigate('/report')} />
        <p className="citizen-home__hint">Tap to describe what's happening. We'll take it from there.</p>
      </main>

      <nav className="citizen-home__nav">
        <button className="citizen-home__nav-item" onClick={() => navigate('/reports')}>
          <span className="citizen-home__nav-icon"><ClipboardList size={18} /></span>
          <span className="citizen-home__nav-text">
            <span>My Reports</span>
            <span className="citizen-home__nav-sub mono">{recentCount} on record</span>
          </span>
          <ChevronRight size={16} color="var(--text-tertiary)" />
        </button>
        <button className="citizen-home__nav-item" onClick={() => navigate('/contacts')}>
          <span className="citizen-home__nav-icon"><PhoneCall size={18} /></span>
          <span className="citizen-home__nav-text">
            <span>Emergency Contacts</span>
            <span className="citizen-home__nav-sub mono">3 saved</span>
          </span>
          <ChevronRight size={16} color="var(--text-tertiary)" />
        </button>
      </nav>
    </div>
  );
}
