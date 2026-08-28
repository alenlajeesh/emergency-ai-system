import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { getIncident, advanceStatus } from '../mock/api';
import StatusBadge from '../components/StatusBadge';
import './IncidentStatus.css';

const STEPS = [
  { key: 'reported', label: 'Report received' },
  { key: 'dispatched', label: 'Response assigned' },
  { key: 'en_route', label: 'Responder en route' },
  { key: 'arrived', label: 'Responder arrived' },
  { key: 'resolved', label: 'Incident resolved' },
];

export default function IncidentStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(() => getIncident(id));

  useEffect(() => {
    if (!incident || incident.status === 'resolved') return;
    const timer = setTimeout(() => {
      setIncident({ ...advanceStatus(id) });
    }, 2600);
    return () => clearTimeout(timer);
  }, [incident, id]);

  if (!incident) {
    return (
      <div className="istatus istatus--empty">
        <p>Incident not found.</p>
        <button className="istatus__link" onClick={() => navigate('/')}>Back to home</button>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === incident.status);

  return (
    <div className="istatus">
      <header className="istatus__header">
        <button className="istatus__back" onClick={() => navigate('/')} aria-label="Home">
          <ArrowLeft size={18} />
        </button>
        <span className="mono istatus__id">{incident.id}</span>
      </header>

      <div className="istatus__summary">
        <span className="istatus__cat">{incident.analysis.category.icon} {incident.analysis.category.label}</span>
        <StatusBadge severity={incident.analysis.severity} />
      </div>

      {incident.status !== 'resolved' && (
        <p className="istatus__eta mono">ETA ~{incident.etaMin} min</p>
      )}

      <ol className="istatus__timeline">
        {STEPS.map((step, i) => {
          const done = i <= stepIndex;
          const active = i === stepIndex;
          return (
            <li key={step.key} className={`istatus__step ${done ? 'istatus__step--done' : ''}`}>
              <span className={`istatus__dot ${active ? 'istatus__dot--active' : ''}`}>
                {done ? <Check size={12} /> : null}
              </span>
              <span className="istatus__step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="istatus__responders">
        <p className="istatus__responders-title mono">DISPATCHED</p>
        {incident.responders.map((r) => (
          <div key={r.id} className="istatus__responder">
            <span>{r.label}</span>
            <span className="mono">{r.distanceKm} km</span>
          </div>
        ))}
      </div>
    </div>
  );
}
