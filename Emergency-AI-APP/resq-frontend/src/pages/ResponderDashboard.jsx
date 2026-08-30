import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ChevronDown } from 'lucide-react';
import {
  listIncidents,
  advanceStatus,
  clearAllIncidents,
  simulateIncident,
  chipsFor,
  loadIncidents,
} from '../mock/api';
import StatusBadge from '../components/StatusBadge';
import IncidentMap from '../components/IncidentMap';
import './ResponderDashboard.css';

const MODES = [
  { key: 'all', label: 'All' },
  { key: 'normal', label: 'Normal' },
  { key: 'disaster', label: 'Disaster' },
  { key: 'world_cup', label: 'World Cup' },
];

const URGENCY_OPTIONS = ['All urgency', 'critical', 'medium', 'low'];
const STATUS_OPTIONS = ['All status', 'reported', 'dispatched', 'en_route', 'arrived', 'resolved'];

const TABS = ['Triage', 'Operator', 'Details', 'Live Voice'];

export default function ResponderDashboard() {
  const [, forceRefresh] = useState(0);
  const [modeFilter, setModeFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('All urgency');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('Triage');
  const [layers, setLayers] = useState({ incidents: true, responders: true, clusters: true });
  const [realtime, setRealtime] = useState(true);

  useEffect(() => { loadIncidents().then(() => forceRefresh((n) => n + 1)); }, []);

  const allIncidents = listIncidents();

  const incidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      if (modeFilter !== 'all' && inc.mode !== modeFilter) return false;
      if (urgencyFilter !== 'All urgency' && inc.analysis.severity !== urgencyFilter) return false;
      if (statusFilter !== 'All status' && inc.status !== statusFilter) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIncidents.length, modeFilter, urgencyFilter, statusFilter, selectedId]);

  const selected = incidents.find((i) => i.id === selectedId) || null;
  const criticalCount = allIncidents.filter((i) => i.analysis.severity === 'critical').length;
  const operatorLoad = Math.min(96, 4 + allIncidents.length * 4);

  function refresh() {
    forceRefresh((n) => n + 1);
  }

  function accept(id) {
    advanceStatus(id);
    refresh();
  }

  function runSimulation(kind) {
    const incident = simulateIncident(kind);
    refresh();
    setSelectedId(incident.id);
    setActiveTab('Triage');
  }

  function clearAll() {
    clearAllIncidents();
    setSelectedId(null);
    refresh();
  }

  function resetView() {
    setSelectedId(null);
  }

  return (
    <div className="rdash">
      {/* ---- Top bar ---- */}
      <header className="rdash__topbar">
        <div className="rdash__brandblock">
          <span className="rdash__eyebrow mono">ECC</span>
          <h1 className="rdash__title">Emergency Command Center</h1>
        </div>
        <span className="rdash__allmodes">ALL MODES</span>

        <div className="rdash__persona">
          <span className="rdash__persona-label mono">PERSONA</span>
          <button className="rdash__select">
            Developer <ChevronDown size={13} />
          </button>
        </div>

        <div className="rdash__modetoggle">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`rdash__modetoggle-btn ${modeFilter === m.key ? 'rdash__modetoggle-btn--active' : ''}`}
              onClick={() => setModeFilter(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="rdash__stat">
          <span className="rdash__stat-value">{allIncidents.length}</span>
          <span className="rdash__stat-label mono">ACTIVE CALLS</span>
        </div>
        <div className="rdash__stat">
          <span className="rdash__stat-value">{criticalCount}</span>
          <span className="rdash__stat-label mono">CRITICAL</span>
        </div>
        <div className="rdash__stat">
          <span className="rdash__stat-value">{operatorLoad}%</span>
          <span className="rdash__stat-label mono">OPERATOR LOAD</span>
        </div>

        <div className="rdash__opload">
          <div className="rdash__opload-top">
            <span className="mono">OPERATOR LOAD</span>
            <span className="mono">{operatorLoad}%</span>
          </div>
          <div className="rdash__opload-detail mono">
            <span className="rdash__opload-dot" />
            1 human active / {Math.max(0, allIncidents.filter((i) => i.status === 'reported').length)} require operators / 0 assigned
          </div>
        </div>

        <button className="rdash__iconbtn" onClick={refresh}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button
          className={`rdash__realtime ${realtime ? 'rdash__realtime--on' : ''}`}
          onClick={() => setRealtime((r) => !r)}
        >
          Realtime
        </button>
      </header>

      {/* ---- Demo controls ---- */}
      <div className="rdash__demobar">
        <span className="rdash__demolabel mono">DEMO CONTROLS</span>
        <button className="rdash__demobtn" onClick={() => runSimulation('disaster')}>Disaster simulation</button>
        <button className="rdash__demobtn" onClick={() => runSimulation('world_cup')}>World Cup simulation</button>
        <button className="rdash__demobtn rdash__demobtn--danger" onClick={clearAll}>Clear all incidents</button>
        <button className="rdash__demobtn rdash__demobtn--accent" onClick={refresh}>Refresh incidents</button>
        <button className="rdash__demobtn" onClick={resetView}>Reset view / clear selection</button>
      </div>

      {/* ---- Body ---- */}
      <div className="rdash__body">
        <aside className="rdash__list">
          <div className="rdash__list-head">
            <p className="rdash__list-title">INCIDENT QUEUE</p>
            <p className="rdash__list-count">{incidents.length} shown</p>
          </div>

          <div className="rdash__filters">
            <label className="rdash__filter">
              <span className="mono">URGENCY</span>
              <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                {URGENCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="rdash__filter">
              <span className="mono">STATUS</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>

          <div className="rdash__cards">
            {incidents.length === 0 && <p className="rdash__empty">No incidents match these filters.</p>}
            {incidents.map((inc) => (
              <button
                key={inc.id}
                className={`rdash__card rdash__card--${inc.analysis.severity} ${selectedId === inc.id ? 'rdash__card--selected' : ''}`}
                onClick={() => setSelectedId(inc.id)}
              >
                <div className="rdash__card-top">
                  <span className="mono rdash__card-id">{inc.id}</span>
                  <StatusBadge severity={inc.analysis.severity} />
                </div>
                <p className="rdash__card-cat">{inc.analysis.category.icon} {inc.analysis.category.label}</p>
                <p className="rdash__card-desc">{inc.text}</p>
                <div className="rdash__card-chips">
                  {chipsFor(inc).map((c) => <span key={c} className="rdash__chip">{c}</span>)}
                </div>
                <div className="rdash__card-meta mono">
                  <span>{inc.location?.label ?? '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rdash__map">
          <IncidentMap incidents={incidents} selectedId={selectedId} onSelect={setSelectedId} layers={layers} />

          <div className="rdash__layers">
            <div className="rdash__layers-head">
              <span>LAYERS</span>
              <span className="rdash__layers-phase mono">PHASE 11</span>
            </div>
            <p className="rdash__layers-sub">Incidents, responders, and derived cluster markers</p>
            <LayerToggle label="Incidents" on={layers.incidents} onChange={(v) => setLayers((l) => ({ ...l, incidents: v }))} />
            <LayerToggle label="Responders" on={layers.responders} onChange={(v) => setLayers((l) => ({ ...l, responders: v }))} />
            <LayerToggle label="Clusters" on={layers.clusters} onChange={(v) => setLayers((l) => ({ ...l, clusters: v }))} />
          </div>
        </section>

        <aside className="rdash__detail">
          {!selected ? (
            <p className="rdash__empty">Select an incident to view details.</p>
          ) : (
            <>
              <div className="rdash__detail-head">
                <span className="mono">{selected.id}</span>
                <StatusBadge severity={selected.analysis.severity} />
                <span className="rdash__pill">{selected.analysis.severity === 'low' ? 'NON-EMERGENCY' : 'EMERGENCY'}</span>
              </div>

              <h2 className="rdash__detail-cat">{selected.analysis.category.label}</h2>
              <p className="rdash__detail-report">{selected.text}</p>

              <div className="rdash__tabs">
                {TABS.map((t) => (
                  <button
                    key={t}
                    className={`rdash__tab ${activeTab === t ? 'rdash__tab--active' : ''}`}
                    onClick={() => setActiveTab(t)}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {activeTab === 'Triage' ? (
                <>
                  <p className="rdash__section-label">RECOMMENDED ACTION</p>
                  <div className="rdash__recommended">{selected.recommendedAction}</div>

                  <p className="rdash__section-label">MISSING FIELDS</p>
                  <ul className="rdash__missing">
                    {selected.missingFields.map((f) => (
                      <li key={f}><span className="rdash__missing-dot" />{f}</li>
                    ))}
                  </ul>

                  <div className="rdash__detail-row">
                    <span>AI confidence</span>
                    <span className="mono">{selected.analysis.confidence}%</span>
                  </div>
                  <div className="rdash__detail-row">
                    <span>Location</span>
                    <span className="mono">{selected.location?.label ?? '—'}</span>
                  </div>
                  <div className="rdash__detail-row">
                    <span>Required</span>
                    <span>{selected.analysis.required.join(' · ')}</span>
                  </div>

                  <p className="rdash__section-label">NEAREST UNITS</p>
                  {selected.responders.map((r) => (
                    <div key={r.id} className="rdash__unit">
                      <span>{r.label}</span>
                      <span className="mono">{r.distanceKm} km</span>
                    </div>
                  ))}

                  <div className="rdash__actions">
                    <button
                      className="rdash__accept"
                      disabled={selected.status !== 'reported'}
                      onClick={() => accept(selected.id)}
                    >
                      {selected.status === 'reported' ? 'Accept & Dispatch' : `Status: ${selected.status.replace('_', ' ')}`}
                    </button>
                    <Link className="rdash__view-citizen" to={`/status/${selected.id}`}>View citizen status →</Link>
                  </div>
                </>
              ) : (
                <div className="rdash__tab-stub">
                  <p>{activeTab} view isn't wired up yet — this is where {activeTab.toLowerCase()} tools will live once the backend's in place.</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function LayerToggle({ label, on, onChange }) {
  return (
    <div className="rdash__layer-row">
      <span>{label}</span>
      <button
        className={`rdash__switch ${on ? 'rdash__switch--on' : ''}`}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <span className="rdash__switch-knob" />
      </button>
    </div>
  );
}
