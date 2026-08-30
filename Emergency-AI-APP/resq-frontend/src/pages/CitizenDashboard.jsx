import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, MapPin, Plus, Radio, ShieldAlert } from 'lucide-react';
import { apiClient } from '../api/client';
import WorkspaceHeader from '../components/WorkspaceHeader';
import ResqMap from '../components/ResqMap';
import StatusPill from '../components/StatusPill';
import useRealtime from '../hooks/useRealtime';
import './CitizenDashboard.css';

export default function CitizenDashboard() {
  const [incidents, setIncidents] = useState([]); const [error, setError] = useState('');
  const load = useCallback(() => apiClient.citizenIncidents().then(setIncidents).catch((reason) => setError(reason.message)), []);
  useEffect(() => { load(); }, [load]); const live = useRealtime(load);
  const active = incidents.filter((item) => item.status !== 'resolved');
  const markers = useMemo(() => incidents.map((item) => ({ id: item.id, title: `${item.id}: ${item.category.label}`, position: { lat: item.location.lat, lng: item.location.lng }, kind: item.severity, label: String(item.number) })), [incidents]);
  return <div className="citizen-dashboard"><WorkspaceHeader title="Citizen workspace" backTo="/citizen" actions={<span className={`live-indicator ${live ? 'on' : ''}`}><i/> {live ? 'Live' : 'Connecting'}</span>}/><main className="citizen-dashboard__main">
    <section className="citizen-dashboard__welcome"><div><p className="citizen-dashboard__eyebrow">YOUR SAFETY WORKSPACE</p><h1>Need help right now?</h1><p>Share what is happening and your device location. Verified responders will receive the incident in real time.</p></div><Link to="/citizen/report" className="citizen-dashboard__report"><Plus size={20}/><span>Report an emergency<small>Text, voice, photo & location</small></span><ArrowRight size={18}/></Link></section>
    {error && <p className="workspace-error">{error}</p>}
    <section className="citizen-dashboard__grid"><div className="citizen-dashboard__reports"><div className="section-head"><div><p>MY INCIDENTS</p><h2>{active.length} active</h2></div><Link to="/citizen/reports">View all <ArrowRight size={14}/></Link></div>{incidents.length === 0 ? <div className="citizen-dashboard__empty"><ClipboardList size={25}/><strong>No reports yet</strong><span>Your reports will appear here and stay private to your account.</span></div> : <div className="citizen-dashboard__list">{incidents.slice(0, 4).map((item) => <Link key={item.id} to={`/citizen/incidents/${item.number}`} className="citizen-incident"><div><span className="citizen-incident__id">{item.id}</span><h3>{item.category.icon} {item.category.label}</h3><p><MapPin size={12}/>{item.location.label}</p></div><StatusPill value={item.status}/></Link>)}</div>}</div><div className="citizen-dashboard__mapwrap"><div className="section-head"><div><p>YOUR REPORTED LOCATIONS</p><h2>Live map</h2></div><Radio size={17}/></div><ResqMap markers={markers} zoom={12}/></div></section>
    <section className="citizen-dashboard__safety"><ShieldAlert size={20}/><div><strong>In immediate danger?</strong><p>Call your local emergency number first. RESQ is designed to support reporting and coordination, not replace emergency services.</p></div></section>
  </main></div>;
}
