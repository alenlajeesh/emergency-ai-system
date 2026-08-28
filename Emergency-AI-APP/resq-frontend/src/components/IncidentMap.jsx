import { markerLetterFor } from '../mock/api';
import './IncidentMap.css';

const SEV_COLOR = {
  critical: 'var(--status-critical)',
  medium: 'var(--status-medium)',
  low: 'var(--status-low)',
};

// Deterministic pseudo-position from incident id so markers don't jump on re-render.
function posFor(id, seed = 0) {
  let hash = seed;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  const x = 10 + (hash % 80);
  const y = 10 + ((hash * 7) % 80);
  return { x, y };
}

const DEFAULT_LAYERS = { incidents: true, responders: true, clusters: true };

export default function IncidentMap({ incidents, selectedId, onSelect, layers = DEFAULT_LAYERS }) {
  return (
    <div className="imap">
      <svg viewBox="0 0 100 100" className="imap__svg" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="var(--border)" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />

        {layers.incidents && incidents.map((inc) => {
          const p = posFor(inc.id);
          const selected = inc.id === selectedId;
          const color = SEV_COLOR[inc.analysis.severity];
          return (
            <g key={inc.id}>
              <g
                transform={`translate(${p.x} ${p.y})`}
                onClick={() => onSelect(inc.id)}
                className="imap__marker"
              >
                {selected && <circle r="5" fill="none" stroke={color} strokeWidth="0.4" className="imap__ring" />}
                <circle r="2.6" fill={color} stroke="#0a0d12" strokeWidth="0.4" />
                <text y="0.9" textAnchor="middle" className="imap__marker-label">{markerLetterFor(inc.analysis.category.key)}</text>
              </g>

              {layers.responders && inc.responders.map((r, i) => {
                const rp = posFor(r.id, i + 1);
                return (
                  <g key={r.id} transform={`translate(${rp.x} ${rp.y})`}>
                    <circle r="1.8" fill="var(--status-info)" opacity="0.9" stroke="#0a0d12" strokeWidth="0.3" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="imap__legend mono">
        <span><i style={{ background: 'var(--status-critical)' }} /> Incident</span>
        <span><i style={{ background: 'var(--status-info)' }} /> Unit</span>
      </div>
    </div>
  );
}
