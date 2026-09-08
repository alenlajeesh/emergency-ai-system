import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Crosshair, LoaderCircle, LocateFixed, MapPin, MapPinned, Mic, MicOff, Send, Upload } from 'lucide-react';
import { apiClient } from '../api/client';
import ResqMap from '../components/ResqMap';
import useCurrentLocation from '../hooks/useCurrentLocation';
import './ReportEmergency.css';
import { citizenMapStyle } from '../lib/mapstyles'; 


export default function ReportEmergency() {
  const navigate = useNavigate(); const fileInput = useRef(null); const recognition = useRef(null);
  const { location, status: locationStatus, error: locationError, detect } = useCurrentLocation(true);
  const [text, setText] = useState(''); const [photo, setPhoto] = useState(null); const [preview, setPreview] = useState(null);
  const [listening, setListening] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const mediaRecorderRef = useRef(null); const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null); const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const voiceBaseTextRef = useRef('');

  const [locationMode, setLocationMode] = useState('current'); 
const [pickedLocation, setPickedLocation] = useState(null);

async function pickLocationOnMap(coords) {
  setLocationMode('picked');
  setPickedLocation({ ...coords, label: 'Finding address…' });
  try {
    const result = await apiClient.reverseGeocode(coords);
    setPickedLocation({ ...coords, label: result.label });
  } catch {
    setPickedLocation({ ...coords, label: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` });
  }
}

const effectiveLocation = locationMode === 'picked' ? pickedLocation : location;

  useEffect(() => () => {
    recognition.current?.stop();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (preview) URL.revokeObjectURL(preview);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
  }, [preview, audioPreviewUrl]);

  function pickPhoto(event) { const file = event.target.files?.[0]; if (!file) return; if (preview) URL.revokeObjectURL(preview); setPhoto(file); setPreview(URL.createObjectURL(file)); }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input is available in Chrome and other browsers that support the Web Speech API.'); return; }
    const instance = new SpeechRecognition(); instance.continuous = false; instance.interimResults = true; instance.lang = navigator.language || 'en-US';
    voiceBaseTextRef.current = text;
    instance.onstart = () => setListening(true); instance.onerror = () => { setListening(false); setError('Voice transcription could not start. Check microphone permission and try again.'); };
    instance.onend = () => setListening(false);
    instance.onresult = (event) => {
      const transcript = [...event.results].map((result) => result[0].transcript).join(' ');
      setText(`${voiceBaseTextRef.current} ${transcript}`.trim());
    };
    recognition.current = instance; instance.start();
  }
  function stopVoice() { recognition.current?.stop(); }

  async function startAudioRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Audio recording is not supported in this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioBlob(blob); setAudioPreviewUrl(URL.createObjectURL(blob));
      };
      recorder.start(); mediaRecorderRef.current = recorder; setRecording(true);
    } catch { setError('Microphone permission was denied. Enable it to record audio.'); }
  }
  function stopAudioRecording() { mediaRecorderRef.current?.stop(); setRecording(false); }
  function clearAudio() { if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl); setAudioBlob(null); setAudioPreviewUrl(null); }

  async function submit(event) {
    event.preventDefault(); setError('');
    if (!effectiveLocation) { setError('We need your current location before sending this report.'); return; }
    setBusy(true);
    try {
      const imageUrl = photo ? (await apiClient.upload(photo)).url : undefined;
      const audioUrl = audioBlob ? (await apiClient.upload(new File([audioBlob], 'voice-note.webm', { type: audioBlob.type }))).url : undefined;
      const reportMode = audioUrl ? 'voice' : photo ? 'photo' : 'text';
      const incident = await apiClient.createCitizenIncident({ text, reportMode, imageUrl, audioUrl, location: effectiveLocation });
      navigate(`/citizen/incidents/${incident.number}`, { state: { merged: incident.mergedWithExisting } });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }


  const markers = effectiveLocation ? [{ id: 'me', title: locationMode === 'picked' ? 'Incident location' : 'Your current location', position: { lat: effectiveLocation.lat, lng: effectiveLocation.lng }, kind: locationMode === 'picked' ? 'picked' : 'self' }] : [];
  return <div className="report-page"><header className="report-page__header"><button onClick={() => navigate('/citizen')}><ArrowLeft size={18}/></button><div><p>NEW INCIDENT</p><h1>Report an emergency</h1></div></header><main className="report-page__main"><form onSubmit={submit}>
    <section className="report-card"><div className="report-card__heading"><div><h2>What is happening?</h2><p>Use plain language. Do not put yourself in danger to gather details.</p></div><button className={`report-voice ${listening ? 'listening' : ''}`} type="button" onClick={listening ? stopVoice : startVoice} aria-label={listening ? 'Stop voice input' : 'Start voice input'}>{listening ? <MicOff size={19}/> : <Mic size={19}/>}<span>{listening ? 'Listening…' : 'Speak'}</span></button></div><textarea required value={text} onChange={(event) => setText(event.target.value)} placeholder="For example: There has been a collision and someone is not responding." autoFocus/><div className="report-card__tools"><button type="button" onClick={() => fileInput.current?.click()}><Camera size={16}/>{photo ? 'Change photo' : 'Add a photo'}</button>{photo && <span className="report-photo-name"><Upload size={14}/>{photo.name}</span>}<input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={pickPhoto}/><button type="button" className={`report-record ${recording ? 'recording' : ''}`} onClick={recording ? stopAudioRecording : startAudioRecording}>{recording ? <><MicOff size={16}/> Stop recording</> : <><Mic size={16}/> {audioBlob ? 'Re-record audio' : 'Record audio'}</>}</button></div>{preview && <img className="report-photo" src={preview} alt="Emergency scene preview"/>}{audioPreviewUrl && <div className="report-audio-preview"><audio controls src={audioPreviewUrl}/><button type="button" onClick={clearAudio}>Remove</button></div>}</section>
    <section className="report-card report-location">
  <div className="report-card__heading">
    <div><h2>Where did this happen?</h2><p>Share your current position, or drop a pin if the emergency is somewhere else.</p></div>
  </div>
  <div className="report-location__tabs">
    <button type="button" className={locationMode === 'current' ? 'active' : ''} onClick={() => { setLocationMode('current'); detect(); }}>
      <LocateFixed size={15}/> Use current location
    </button>
    <button type="button" className={locationMode === 'picked' ? 'active' : ''} onClick={() => setLocationMode('picked')}>
      <MapPinned size={15}/> Choose on map
    </button>
  </div>
  <div className={`report-location__address ${effectiveLocation ? 'ready' : ''}`}>
    <MapPin size={18}/>
    <span>{effectiveLocation?.label || (locationMode === 'current' && locationStatus === 'locating' ? 'Detecting your position…' : locationMode === 'picked' ? 'Tap the map to drop a pin at the incident' : 'Location is not available')}</span>
  </div>
  {locationMode === 'picked' && <p className="report-location__hint"><Crosshair size={13}/> Tap anywhere on the map to mark exactly where it happened</p>}
  <div className="report-location__map">
    <ResqMap
      markers={markers}
      center={effectiveLocation ? { lat: effectiveLocation.lat, lng: effectiveLocation.lng } : undefined}
      zoom={15}
      onLocationPick={locationMode === 'picked' ? pickLocationOnMap : undefined}
      mapStyle={citizenMapStyle}
    />
  </div>
  {locationError && locationMode === 'current' && <p className="report-form-error">{locationError}</p>}
</section>
    {error && <p className="report-form-error" role="alert">{error}</p>}<button className="report-submit" disabled={busy || !text.trim() || !effectiveLocation}>{busy ? <><LoaderCircle className="spin" size={18}/> Sending secure report…</> : <><Send size={17}/> Send incident to responders</>}</button>
  </form></main></div>;
  
}