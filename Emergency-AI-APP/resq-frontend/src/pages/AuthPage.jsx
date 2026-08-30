import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, HeartPulse, LockKeyhole, Mail, Phone, ShieldCheck, Stethoscope, UserRound, Flame, Shield } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { destinationForRole } from '../auth/roles';
import './AuthPage.css';

const services = [
  { key: 'medical', label: 'Medical response', Icon: Stethoscope },
  { key: 'fire', label: 'Fire response', Icon: Flame },
  { key: 'security', label: 'Security response', Icon: Shield },
];

export default function AuthPage() {
  const location = useLocation(); const navigate = useNavigate(); const { login, signup, user } = useAuth();
  const signupMode = location.pathname === '/signup';
  const [role, setRole] = useState('citizen'); const [service, setService] = useState('medical');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => { if (user) navigate(destinationForRole(user.role), { replace: true }); }, [user, navigate]);
  useEffect(() => { setError(''); }, [signupMode]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = signupMode
        ? await signup({ ...form, role, ...(role === 'responder' ? { service } : {}) })
        : await login({ email: form.email, password: form.password });
      navigate(destinationForRole(result.user.role), { replace: true });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-page__intro">
      <Link className="auth-page__back" to="/"><ArrowLeft size={17} /> Back</Link>
      <div className="auth-page__brand"><HeartPulse size={27} /><span>RESQ</span></div>
      <div className="auth-page__statement"><p className="auth-page__eyebrow">EMERGENCY, SIMPLIFIED</p><h1>Help reaches people faster.</h1><p>Secure reporting for citizens. A focused live response workspace for emergency responders.</p></div>
      <div className="auth-page__trust"><ShieldCheck size={18} /><span>Account access is role-based. The command center is reserved for authorized administrators.</span></div>
    </section>
    <section className="auth-page__panel"><div className="auth-card">
      <p className="auth-card__eyebrow">WELCOME TO RESQ</p><h2>{signupMode ? 'Create your account' : 'Welcome back'}</h2><p className="auth-card__sub">{signupMode ? 'Choose your role to get started.' : 'Sign in to access your workspace.'}</p>
      <div className="auth-card__switch"><Link to="/login" className={!signupMode ? 'active' : ''}>Sign in</Link><Link to="/signup" className={signupMode ? 'active' : ''}>Sign up</Link></div>
      {signupMode && <div className="auth-roles"><button type="button" className={role === 'citizen' ? 'selected' : ''} onClick={() => setRole('citizen')}><UserRound size={18}/><span>Citizen<small>Report and track your own emergency</small></span></button><button type="button" className={role === 'responder' ? 'selected' : ''} onClick={() => setRole('responder')}><ShieldCheck size={18}/><span>Responder<small>Receive live incident requests</small></span></button></div>}
      <form onSubmit={submit} className="auth-form">
        {signupMode && <label><span>Full name</span><div><UserRound size={17}/><input required value={form.name} onChange={change('name')} placeholder="Your name" autoComplete="name" /></div></label>}
        <label><span>Email address</span><div><Mail size={17}/><input required type="email" value={form.email} onChange={change('email')} placeholder="you@example.com" autoComplete="email" /></div></label>
        {signupMode && <label><span>Phone number <em>optional</em></span><div><Phone size={17}/><input value={form.phone} onChange={change('phone')} placeholder="+91 98765 43210" autoComplete="tel" /></div></label>}
        {signupMode && role === 'responder' && <fieldset className="auth-service"><legend>Response service</legend><div>{services.map(({ key, label, Icon }) => <button key={key} type="button" className={service === key ? 'selected' : ''} onClick={() => setService(key)}><Icon size={16}/>{label}</button>)}</div></fieldset>}
        <label><span>Password</span><div><LockKeyhole size={17}/><input required minLength="8" type="password" value={form.password} onChange={change('password')} placeholder="At least 8 characters" autoComplete={signupMode ? 'new-password' : 'current-password'} /></div></label>
        {error && <p className="auth-form__error" role="alert">{error}</p>}
        <button className="auth-form__submit" disabled={busy}>{busy ? 'Please wait…' : signupMode ? `Create ${role} account` : 'Sign in'} <ArrowRight size={17}/></button>
      </form>
      {signupMode && <p className="auth-card__note">Admin accounts cannot be created here. They are provisioned by the system owner.</p>}
    </div></section>
  </main>;
}
