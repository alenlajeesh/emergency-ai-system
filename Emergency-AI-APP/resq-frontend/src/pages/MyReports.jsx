import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { apiClient } from '../api/client';
import StatusPill from '../components/StatusPill';
import useRealtime from '../hooks/useRealtime';
import './MyReports.css';

export default function MyReports() {
  const [items, setItems] = useState([]); const [error, setError] = useState('');
  const load = useCallback(() => apiClient.citizenIncidents().then(setItems).catch((reason) => setError(reason.message)), []);
  useEffect(() => { load(); }, [load]); useRealtime(load);
  return <div className="reports-page"><header><Link to="/citizen"><ArrowLeft size={18}/> Workspace</Link><Link className="reports-page__new" to="/citizen/report"><Plus size={15}/> New report</Link></header><main><p className="reports-page__eyebrow">PRIVATE TO YOUR ACCOUNT</p><h1>My reports</h1><p className="reports-page__lede">Track reports you have submitted. New status updates appear automatically.</p>{error && <p className="workspace-error">{error}</p>}<div className="reports-page__list">{items.length === 0 ? <div className="reports-page__empty">You have not submitted any reports yet.</div> : items.map((item) => <Link key={item.id} className="reports-page__item" to={`/citizen/incidents/${item.number}`}><div><div className="reports-page__itemtop"><span>{item.id}</span><StatusPill value={item.severity}/></div><h2>{item.category.icon} {item.category.label}</h2><p>{item.text}</p><small><MapPin size={12}/>{item.location.label} · {new Date(item.createdAt).toLocaleString()}</small></div><StatusPill value={item.status}/></Link>)}</div></main></div>;
}
