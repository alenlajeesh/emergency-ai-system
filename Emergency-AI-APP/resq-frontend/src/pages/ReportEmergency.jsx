import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, LoaderCircle, LocateFixed, MapPin, Mic, MicOff, Send, Upload } from 'lucide-react';
import { apiClient } from '../api/client';
import ResqMap from '../components/ResqMap';
import useCurrentLocation from '../hooks/useCurrentLocation';
import './ReportEmergency.css';

export default function ReportEmergency() {
  const navigate = useNavigate(); const fileInput = useRef(null); const recognition = useRef(null);
  const { location, status: locationStatus, error: locationError, detect } = useCurrentLocation(true);
  const [text, setText] = useState(''); const [photo, setPhoto] = useState(null); const [preview, setPreview] = useState(null);
  const [listening, setListening] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => () => { recognition.current?.stop(); if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function pickPhoto(event) { const file = event.target.files?.[0]; if (!file) return; if (preview) URL.revokeObjectURL(preview); setPhoto(file); setPreview(URL.createObjectURL(file)); }
  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input is available in Chrome and other browsers that support the Web Speech API.'); return; }
    const instance = new SpeechRecognition(); instance.continuous = false; instance.interimResults = true; instance.lang = navigator.language || 'en-US';
    instance.onstart = () => setListening(true); instance.onerror = () => { setListening(false); setError('Voice transcription could not start. Check microphone permission and try again.'); };
    instance.onend = () => setListening(false); instance.onresult = (event) => { const transcript = [...event.results].map((result) => result[0].transcript).join(' '); setText((current) => `${current} ${transcript}`.trim()); };
    recognition.current = instance; instance.start();
  }
  function stopVoice() { recognition.current?.stop(); }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!location) { setError('We need your current location before sending this report.'); return; }
    setBusy(true);
    try {
      const imageUrl = photo ? (await apiClient.upload(photo)).imageUrl : undefined;
      const incident = await apiClient.createCitizenIncident({ text, reportMode: photo ? 'photo' : 'text', imageUrl, location });
      navigate(`/citizen/incidents/${incident.number}`, { state: { merged: incident.mergedWithExisting } });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }
  const markers = location ? [{ id: 'me', title: 'Your current location', position: { lat: location.lat, lng: location.lng }, kind: 'self' }] : [];
  return <div className="report-page"><header className="report-page__header"><button onClick={() => navigate('/citizen')}><ArrowLeft size={18}/></button><div><p>NEW INCIDENT</p><h1>Report an emergency</h1></div></header><main className="report-page__main"><form onSubmit={submit}>
    <section className="report-card"><div className="report-card__heading"><div><h2>What is happening?</h2><p>Use plain language. Do not put yourself in danger to gather details.</p></div><button className={`report-voice ${listening ? 'listening' : ''}`} type="button" onClick={listening ? stopVoice : startVoice} aria-label={listening ? 'Stop voice input' : 'Start voice input'}>{listening ? <MicOff size={19}/> : <Mic size={19}/>}<span>{listening ? 'Listening…' : 'Speak'}</span></button></div><textarea required value={text} onChange={(event) => setText(event.target.value)} placeholder="For example: There has been a collision and someone is not responding." autoFocus/><div className="report-card__tools"><button type="button" onClick={() => fileInput.current?.click()}><Camera size={16}/>{photo ? 'Change photo' : 'Add a photo'}</button>{photo && <span className="report-photo-name"><Upload size={14}/>{photo.name}</span>}<input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={pickPhoto}/></div>{preview && <img className="report-photo" src={preview} alt="Emergency scene preview"/>}</section>
    <section className="report-card report-location"><div className="report-card__heading"><div><h2>Your current location</h2><p>RESQ uses your browser’s GPS. You control the permission.</p></div><button type="button" onClick={detect} disabled={locationStatus === 'locating'}><LocateFixed size={16}/>{locationStatus === 'locating' ? 'Locating…' : 'Refresh'}</button></div><div className={`report-location__address ${location ? 'ready' : ''}`}><MapPin size={18}/><span>{location?.label || (locationStatus === 'locating' ? 'Detecting your position…' : 'Location is not available')}</span></div><div className="report-location__map"><ResqMap markers={markers} center={location ? { lat: location.lat, lng: location.lng } : undefined} zoom={15}/></div>{locationError && <p className="report-form-error">{locationError}</p>}</section>
    {error && <p className="report-form-error" role="alert">{error}</p>}<button className="report-submit" disabled={busy || !text.trim() || !location}>{busy ? <><LoaderCircle className="spin" size={18}/> Sending secure report…</> : <><Send size={17}/> Send incident to responders</>}</button>
  </form></main></div>;
}
