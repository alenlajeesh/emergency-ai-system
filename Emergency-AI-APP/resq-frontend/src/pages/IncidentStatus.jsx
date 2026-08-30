import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, MapPin, Radio } from 'lucide-react';
import { apiClient } from '../api/client';
import ResqMap from '../components/ResqMap';
import StatusPill from '../components/StatusPill';
import useRealtime from '../hooks/useRealtime';
import './IncidentStatus.css';

const stages = [['reported','Report received'],['dispatched','Responder assigned'],['en_route','Responder en route'],['arrived','Responder arrived'],['resolved','Incident resolved']];

export default function IncidentStatus() {
  const { number } = useParams(); const route = useLocation(); const [incident, setIncident] = useState(null); const [error, setError] = useState('');
  const load = useCallback(() => apiClient.citizenIncident(number).then(setIncident).catch((reason) => setError(reason.message)), [number]);
  useEffect(() => { load(); }, [load]); const live = useRealtime(load);
  if (error) return <div className="incident-status incident-status--error"><Link to="/citizen"><ArrowLeft size={18}/> Back to workspace</Link><p>{error}</p></div>;
  if (!incident) return <div className="incident-status incident-status--error">Loading your incident…</div>;
  const completed = stages.findIndex(([status]) => status === incident.status);
  const markers = [{ id: 'incident', title: incident.id, position: { lat: incident.location.lat, lng: incident.location.lng }, kind: incident.severity, label: '!' }, ...incident.assignedResponders.filter((unit) => unit.location).map((unit) => ({ id: unit.id, title: unit.name, position: { lat: unit.location.lat, lng: unit.location.lng }, kind: 'responder', label: 'R' }))];
  return <div className="incident-status"><header><Link to="/citizen/reports"><ArrowLeft size={18}/> My reports</Link><span className={`live-indicator ${live ? 'on' : ''}`}><i/> {live ? 'Live updates' : 'Connecting'}</span></header><main>{route.state?.merged && <p className="incident-status__merged">Your report was added to an existing nearby incident. This helps responders avoid duplicate dispatches.</p>}<section className="incident-status__hero"><div><p>{incident.id}</p><h1>{incident.category.icon} {incident.category.label}</h1><span><MapPin size={14}/>{incident.location.label}</span></div><StatusPill value={incident.status}/></section><section className="incident-status__grid"><div className="incident-status__timeline"><h2>Response progress</h2>{incident.status !== 'resolved' && incident.etaMin && <p className="incident-status__eta"><Clock3 size={15}/> Estimated response: ~{incident.etaMin} min</p>}<ol>{stages.map(([status,label], index) => <li key={status} className={index <= completed ? 'done' : ''}><i>{index < completed ? <Check size={12}/> : index + 1}</i><span>{label}</span></li>)}</ol><div className="incident-status__details"><h3>Report details</h3><p>{incident.text}</p>{incident.reportCount > 1 && <span><Radio size={13}/>{incident.reportCount} reports have been grouped at this location</span>}</div></div><div className="incident-status__map"><ResqMap markers={markers} center={{ lat: incident.location.lat, lng: incident.location.lng }} zoom={14}/><p>Map shows your reported location and assigned responders who have shared a location.</p></div></section></main></div>;
}
