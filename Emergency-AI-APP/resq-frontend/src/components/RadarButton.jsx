import './RadarButton.css';

export default function RadarButton({ onClick }) {
  return (
    <button className="radar-btn" onClick={onClick} aria-label="Report emergency">
      <span className="radar-btn__ring radar-btn__ring--1" />
      <span className="radar-btn__ring radar-btn__ring--2" />
      <span className="radar-btn__ring radar-btn__ring--3" />
      <span className="radar-btn__core">
        <span className="radar-btn__icon">🚨</span>
        <span className="radar-btn__label">REPORT</span>
        <span className="radar-btn__sublabel">EMERGENCY</span>
      </span>
    </button>
  );
}
