import './StatusPill.css';
export default function StatusPill({ value }) { return <span className={`status-pill status-pill--${value}`}>{String(value).replace('_', ' ')}</span>; }
