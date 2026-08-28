import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import './MyReports.css';
import './EmergencyContacts.css';

const CONTACTS = [
  { name: 'National Emergency', number: '112' },
  { name: 'Ambulance', number: '108' },
  { name: 'Police Control Room', number: '100' },
];

export default function EmergencyContacts() {
  const navigate = useNavigate();
  return (
    <div className="myreports">
      <header className="myreports__header">
        <button className="myreports__back" onClick={() => navigate('/')} aria-label="Home">
          <ArrowLeft size={18} />
        </button>
        <h1 className="myreports__title">Emergency Contacts</h1>
      </header>
      <div className="myreports__list">
        {CONTACTS.map((c) => (
          <a key={c.number} href={`tel:${c.number}`} className="contact-item">
            <span className="contact-item__icon"><Phone size={16} /></span>
            <span className="contact-item__text">
              <span>{c.name}</span>
              <span className="mono contact-item__number">{c.number}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
