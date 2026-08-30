import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Crosshair, MapPin, Radio, RefreshCw, Route, Siren } from 'lucide-react';
import { apiClient } from '../api/client';
import WorkspaceHeader from '../components/WorkspaceHeader';
import ResqMap from '../components/ResqMap';
import StatusPill from '../components/StatusPill';
import useCurrentLocation from '../hooks/useCurrentLocation';
import useRealtime from '../hooks/useRealtime';
import './ResponderDashboard.css';
import './ResponderRoute.css';

const statusActions = {
  dispatched: ['en_route', 'Start route'],
  en_route: ['arrived', 'Mark arrived'],
  arrived: ['resolved', 'Resolve incident'],
};

export default function ResponderDashboard() {
  const [profile, setProfile] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const { location: deviceLocation, status: locating, error: geoError, detect } = useCurrentLocation(false);

  const load = useCallback(async () => {
    try {
      const [nextProfile, nextQueue] = await Promise.all([apiClient.responderProfile(), apiClient.responderQueue()]);
      setProfile(nextProfile);
      setIncidents(nextQueue);
      setSelectedNumber((current) => current || nextQueue[0]?.number || null);
    } catch (reason) { setError(reason.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const live = useRealtime(load);
  const selected = incidents.find((item) => item.number === selectedNumber) || null;

  useEffect(() => {
    let active = true;
    if (!selected || !profile?.location) { setRoute(null); setRouteError(''); return undefined; }
    setRoute(null); setRouteError('');
    apiClient.computeRoute(profile.location, selected.location)
      .then((next) => { if (active) setRoute(next); })
      .catch(() => { if (active) setRouteError('Road-route ETA is unavailable until the server Maps key is configured.'); });
    return () => { active = false; };
  }, [selected?.number, selected?.location?.lat, selected?.location?.lng, profile?.location?.lat, profile?.location?.lng]);

  const mapMarkers = useMemo(() => [
    ...(profile?.location ? [{ id: 'self', title: 'Your live location', position: { lat: profile.location.lat, lng: profile.location.lng }, kind: 'self', label: 'You' }] : []),
    ...incidents.map((item) => ({ id: item.id, title: `${item.id} — ${item.category.label}`, position: { lat: item.location.lat, lng: item.location.lng }, kind: item.severity, label: '!' })),
  ], [profile, incidents]);

  async function updatePosition() {
    setBusy(true); setError('');
    try { const coords = await detect(); if (!coords) return; await apiClient.updateResponderLocation(coords); await load(); }
    catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }

  async function toggleAvailability() {
    setBusy(true); setError('');
    try {
      if (profile?.availability === 'available') await apiClient.updateResponderAvailability('offline');
      else {
        let coords = deviceLocation || profile?.location;
        if (!coords) coords = await detect();
        if (!coords) return;
        await apiClient.updateResponderLocation(coords);
        await apiClient.updateResponderAvailability('available');
      }
      await load();
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }

  async function accept() {
    if (!selected) return;
    setBusy(true); setError('');
    try { await apiClient.acceptIncident(selected.number); await load(); }
    catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }

  async function updateStatus(status) {
    if (!selected) return;
    setBusy(true); setError('');
    try { await apiClient.updateResponderIncident(selected.number, status); await load(); }
    catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }

  const openCount = incidents.filter((item) => item.status !== 'resolved').length;
  return <div className="responder-dashboard">
    <WorkspaceHeader dark title="Responder workspace" backTo="/responder" actions={<span className={`live-indicator ${live ? 'on' : ''}`}><i/> {live ? 'LIVE' : 'CONNECTING'}</span>}/>
    <main className="responder-dashboard__main">
      <section className="responder-dashboard__top">
        <div><p className="responder-dashboard__eyebrow">VERIFIED RESPONSE NETWORK</p><h1>{profile ? `${profile.service} response` : 'Response workspace'}</h1><p>Every open incident is shown with a live distance from your shared location. Accept only when you can respond safely.</p></div>
        <div className="responder-status"><span>Availability</span><button className={profile?.availability === 'available' ? 'available' : ''} onClick={toggleAvailability} disabled={busy || profile?.availability === 'assigned'}>{profile?.availability === 'available' ? 'Available' : profile?.availability === 'assigned' ? 'Assigned' : 'Offline'}</button><small>{profile?.code || 'Loading profile…'}</small></div>
      </section>
      {(error || geoError) && <p className="workspace-error">{error || geoError}</p>}
      <section className="responder-dashboard__tools">
        <button onClick={updatePosition} disabled={busy || locating === 'locating'}><Crosshair size={16}/>{locating === 'locating' ? 'Locating…' : profile?.location ? 'Update my GPS position' : 'Share my GPS position'}</button>
        <span><MapPin size={15}/>{profile?.location ? (profile.locationUpdatedAt ? `Last position: ${new Date(profile.locationUpdatedAt).toLocaleTimeString()}` : 'Location shared') : 'No location shared yet'}</span>
        <button className="responder-dashboard__refresh" onClick={load} disabled={busy}><RefreshCw size={15}/> Refresh</button>
      </section>
      <section className="responder-dashboard__layout">
        <aside className="responder-queue">
          <div className="responder-queue__head"><div><p>OPEN INCIDENTS</p><h2>{openCount} live</h2></div><Radio size={17}/></div>
          <div className="responder-queue__list">{incidents.length === 0 ? <div className="responder-queue__empty"><CheckCircle2 size={25}/><strong>No open incidents</strong><span>New citizen reports will appear here in real time.</span></div> : incidents.map((item) => <button key={item.id} className={`${selectedNumber === item.number ? 'selected ' : ''}${item.serviceMatch ? 'match' : ''}`} onClick={() => setSelectedNumber(item.number)}><div><span>{item.id}</span><StatusPill value={item.severity}/></div><h3>{item.category.icon} {item.category.label}</h3><p>{item.text}</p><footer><b><Route size={12}/>{item.distanceKm === null ? 'Share location to calculate distance' : `${item.distanceKm} km away`}</b>{item.assignedToMe && <em>Assigned to you</em>}</footer></button>)}</div>
        </aside>
        <section className="responder-map"><ResqMap markers={mapMarkers} route={route} center={profile?.location ? { lat: profile.location.lat, lng: profile.location.lng } : undefined} onMarkerClick={(marker) => marker.id?.startsWith('INC-') && setSelectedNumber(Number(marker.id.replace('INC-', '')))}/><div className="responder-map__legend"><span><i className="incident"/> Incidents</span><span><i className="self"/> Your location</span></div></section>
        <aside className="responder-detail">{selected ? <IncidentDetail incident={selected} profile={profile} route={route} routeError={routeError} busy={busy} onAccept={accept} onUpdate={updateStatus}/> : <div className="responder-detail__empty"><Siren size={26}/>Select an incident to review it.</div>}</aside>
      </section>
    </main>
  </div>;
}

function IncidentDetail({ incident, profile, route, routeError, busy, onAccept, onUpdate }) {
  const action = statusActions[incident.status];
  const roadKm = route?.distanceMeters ? Math.round(route.distanceMeters / 100) / 10 : null;
  const etaMin = route?.durationSeconds ? Math.max(1, Math.round(route.durationSeconds / 60)) : null;
  return <>
    <div className="responder-detail__meta"><span>{incident.id}</span><StatusPill value={incident.status}/></div><h2>{incident.category.icon} {incident.category.label}</h2><p className="responder-detail__description">{incident.text}</p>
    <div className="responder-detail__location"><MapPin size={16}/><span>{incident.location.label}</span></div>
    <div className="responder-detail__metric"><Route size={16}/><span><strong>{roadKm ? `${roadKm} km by road` : incident.distanceKm === null ? 'Location required' : `${incident.distanceKm} km direct`}</strong><small>{etaMin ? `Estimated drive: ~${etaMin} min` : 'Distance is based on your live GPS position'}</small></span></div>
    {routeError && <p className="responder-detail__route-error">{routeError}</p>}
    <section><p className="responder-detail__label">RECOMMENDED SERVICES</p><div className="responder-detail__services">{incident.requiredServices.map((service) => <span key={service}>{service}</span>)}</div></section>
    <section><p className="responder-detail__label">RESPONSE NOTES</p><div className="responder-detail__action"><AlertTriangle size={16}/>{incident.recommendedAction}</div></section>
    {incident.manualVerification && <p className="responder-detail__verify">Manual verification requested before dispatch.</p>}
    <div className="responder-detail__buttons">{!incident.assignedToMe && incident.status !== 'resolved' && <button className="primary" disabled={busy || profile?.availability !== 'available' || !incident.serviceMatch} onClick={onAccept}>{!incident.serviceMatch ? 'Service not requested' : profile?.availability === 'available' ? 'Accept this incident' : 'Set availability to accept'}</button>}{incident.assignedToMe && action && <button className="primary" disabled={busy} onClick={() => onUpdate(action[0])}>{action[1]}</button>}{incident.assignedToMe && <button className="secondary" disabled>{incident.status.replace('_', ' ')}</button>}</div>
  </>;
}
