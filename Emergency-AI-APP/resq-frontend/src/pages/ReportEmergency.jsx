import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Keyboard, Mic, Camera, MapPin, Loader2 } from 'lucide-react';
import { classifyReport, detectLocation, createIncident } from '../mock/api';
import StatusBadge from '../components/StatusBadge';
import './ReportEmergency.css';

const MODES = [
  { key: 'text', label: 'Type', icon: Keyboard },
  { key: 'voice', label: 'Speak', icon: Mic },
  { key: 'photo', label: 'Photo', icon: Camera },
];

export default function ReportEmergency() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [phase, setPhase] = useState('input'); // input | analyzing | result
  const [analysis, setAnalysis] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    detectLocation().then(setLocation);
  }, []);

  function simulateVoice() {
    setListening(true);
    const sample = "There's smoke coming from the building and people are shouting for help.";
    setTimeout(() => {
      setText(sample);
      setListening(false);
    }, 1600);
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setPhase('analyzing');
    const result = await classifyReport({ text });
    setAnalysis(result);
    setPhase('result');
  }

  function handleConfirm() {
    const incident = createIncident({ text, reportMode: mode, analysis, location });
    navigate(`/status/${incident.id}`);
  }

  return (
    <div className="report">
      <header className="report__header">
        <button className="report__back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="report__title">Report Emergency</h1>
      </header>

      {phase !== 'result' && (
        <>
          <div className="report__tabs" role="tablist">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={mode === m.key}
                  className={`report__tab ${mode === m.key ? 'report__tab--active' : ''}`}
                  onClick={() => setMode(m.key)}
                >
                  <Icon size={15} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="report__body">
            {mode === 'text' && (
              <textarea
                className="report__textarea"
                placeholder="Describe what's happening. e.g. “A man has collapsed outside the railway station and isn't responding.”"
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            )}

            {mode === 'voice' && (
              <div className="report__voice">
                <button
                  className={`report__mic ${listening ? 'report__mic--active' : ''}`}
                  onClick={simulateVoice}
                  disabled={listening}
                >
                  <Mic size={28} />
                </button>
                <p className="report__voice-hint">
                  {listening ? 'Listening…' : text ? 'Transcribed below — edit if needed' : 'Tap and speak'}
                </p>
                {text && (
                  <textarea
                    className="report__textarea report__textarea--compact"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                )}
              </div>
            )}

            {mode === 'photo' && (
              <div className="report__photo">
                {photo ? (
                  <img src={photo} alt="Uploaded scene" className="report__photo-preview" />
                ) : (
                  <button className="report__photo-picker" onClick={() => fileRef.current?.click()}>
                    <Camera size={22} />
                    <span>Add a photo</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
                <textarea
                  className="report__textarea report__textarea--compact"
                  placeholder="Add a short description too — it helps the most."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="report__location">
            <MapPin size={13} />
            <span className="mono">{location ? location.label : 'Detecting location…'}</span>
          </div>

          <button
            className="report__submit"
            onClick={handleAnalyze}
            disabled={!text.trim() || phase === 'analyzing'}
          >
            {phase === 'analyzing' ? (
              <>
                <Loader2 size={16} className="report__spin" />
                Analyzing…
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </>
      )}

      {phase === 'result' && analysis && (
        <AnalysisResult analysis={analysis} onConfirm={handleConfirm} onEdit={() => setPhase('input')} />
      )}
    </div>
  );
}

function AnalysisResult({ analysis, onConfirm, onEdit }) {
  const lowConfidence = analysis.confidence < 65;
  return (
    <div className="result">
      <p className="result__eyebrow mono">INCIDENT ANALYSIS</p>

      <div className="result__row">
        <span className="result__label">Type</span>
        <span className="result__value">{analysis.category.icon} {analysis.category.label}</span>
      </div>

      <div className="result__row">
        <span className="result__label">Severity</span>
        <StatusBadge severity={analysis.severity} />
      </div>

      <div className="result__row">
        <span className="result__label">Recommended response</span>
        <span className="result__value">{analysis.required.join(' · ')}</span>
      </div>

      <div className="result__confidence">
        <div className="result__confidence-bar">
          <div className="result__confidence-fill" style={{ width: `${analysis.confidence}%` }} />
        </div>
        <span className="mono result__confidence-label">AI confidence {analysis.confidence}%</span>
      </div>

      {lowConfidence && (
        <p className="result__warning">⚠️ Low confidence — this report will be flagged for manual verification.</p>
      )}

      <div className="result__actions">
        <button className="result__edit" onClick={onEdit}>Edit</button>
        <button className="result__confirm" onClick={onConfirm}>Confirm & Send</button>
      </div>
    </div>
  );
}
