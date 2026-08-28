import './StatusBadge.css';

const CONFIG = {
  critical: { label: 'CRITICAL', dot: 'var(--status-critical)', bg: 'var(--status-critical-dim)', fg: 'var(--status-critical)' },
  medium: { label: 'MEDIUM', dot: 'var(--status-medium)', bg: 'var(--status-medium-dim)', fg: 'var(--status-medium)' },
  low: { label: 'LOW', dot: 'var(--status-low)', bg: 'var(--status-low-dim)', fg: 'var(--status-low)' },
};

export default function StatusBadge({ severity }) {
  const c = CONFIG[severity] || CONFIG.low;
  return (
    <span className="status-badge" style={{ background: c.bg, color: c.fg }}>
      <span className="status-badge__dot" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}
