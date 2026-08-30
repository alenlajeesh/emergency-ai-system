import { Link } from 'react-router-dom';
import { ArrowRight, HeartPulse, MapPinned, Radio, ShieldCheck, Siren } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { destinationForRole } from '../auth/roles';
import './LandingPage.css';

export default function LandingPage() {
  const { user } = useAuth();
  return <main className="landing">
    <nav className="landing__nav"><Link className="landing__brand" to="/"><HeartPulse size={23}/><span>RESQ</span></Link><div>{user ? <Link className="landing__signin" to={destinationForRole(user.role)}>Open workspace <ArrowRight size={15}/></Link> : <><Link className="landing__signin" to="/login">Sign in</Link><Link className="landing__signup" to="/signup">Create account</Link></>}</div></nav>
    <section className="landing__hero"><div className="landing__copy"><p className="landing__eyebrow">INTELLIGENT EMERGENCY RESPONSE</p><h1>When every second matters, <em>clarity</em> comes first.</h1><p className="landing__lede">RESQ connects people who need help with verified responders through a secure, live emergency workflow.</p><div className="landing__actions"><Link className="landing__primary" to={user ? destinationForRole(user.role) : '/signup'}><Siren size={18}/>{user ? 'Open my workspace' : 'Create a citizen account'}<ArrowRight size={17}/></Link><Link className="landing__secondary" to="/login">I already have an account</Link></div><p className="landing__notice"><ShieldCheck size={15}/> This project does not replace local emergency numbers. Call your local emergency service when immediate danger is present.</p></div><div className="landing__visual"><div className="landing__radar"><span className="landing__radar-ring ring-a"/><span className="landing__radar-ring ring-b"/><span className="landing__radar-ring ring-c"/><span className="landing__radar-core"><HeartPulse size={34}/></span><span className="landing__radar-pin pin-one"/><span className="landing__radar-pin pin-two"/><span className="landing__radar-pin pin-three"/></div><div className="landing__signal"><Radio size={15}/><span>Live response network</span></div></div></section>
    <section className="landing__roles"><article><span><MapPinned size={20}/></span><h2>Citizen</h2><p>Report an emergency with your real location, voice, photo, and status tracking.</p></article><article><span><Radio size={20}/></span><h2>Responder</h2><p>See live incidents, actual distance from your location, and accept only when available.</p></article><article><span><ShieldCheck size={20}/></span><h2>Administrator</h2><p>Coordinate the full network from a protected command center.</p></article></section>
  </main>;
}
