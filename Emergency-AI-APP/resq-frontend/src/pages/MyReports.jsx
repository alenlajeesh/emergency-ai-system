import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { listIncidents, loadIncidents } from '../mock/api';
import StatusBadge from '../components/StatusBadge';
import './MyReports.css';

export default function MyReports() {
  const navigate = useNavigate();
  const [, refresh] = useState(0);
  const incidents = listIncidents();

  useEffect(() => { loadIncidents().then(() => refresh((n) => n + 1)); }, []);

  return (
    <div className="myreports">
      <header className="myreports__header">
        <button className="myreports__back" onClick={() => navigate('/')} aria-label="Home">
          <ArrowLeft size={18} />
        </button>
        <h1 className="myreports__title">My Reports</h1>
      </header>

      {incidents.length === 0 ? (
        <div className="myreports__empty">
          <p>No reports yet.</p>
          <p className="myreports__empty-sub">Reports you submit will show up here.</p>
        </div>
      ) : (
        <div className="myreports__list">
          {incidents.map((inc) => (
            <button key={inc.id} className="myreports__item" onClick={() => navigate(`/status/${inc.id}`)}>
              <div className="myreports__item-top">
                <span className="mono myreports__item-id">{inc.id}</span>
                <StatusBadge severity={inc.analysis.severity} />
              </div>
              <p className="myreports__item-cat">{inc.analysis.category.icon} {inc.analysis.category.label}</p>
              <p className="myreports__item-status">{inc.status.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
