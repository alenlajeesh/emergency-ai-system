import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { destinationForRole, rolesForUser } from '../auth/roles';
import './WorkspaceHeader.css';

export default function WorkspaceHeader({ title, dark = false, backTo, actions }) {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const roles = rolesForUser(user);
  const activeRole = location.pathname.startsWith('/admin') ? 'admin' : location.pathname.startsWith('/responder') ? 'responder' : 'citizen';
  function signOut() { logout(); navigate('/'); }
  return <header className={`workspace-header ${dark ? 'workspace-header--dark' : ''}`}>
    <div className="workspace-header__brand"><Link to={backTo || '#'}><HeartPulse size={20}/><span>RESQ</span></Link>{title && <><i/><strong>{title}</strong></>}</div>
    <div className="workspace-header__right">{actions}{roles.length > 1 && <select className="workspace-header__role-switch" value={activeRole} aria-label="Switch testing workspace" onChange={(event) => navigate(destinationForRole(event.target.value))}>{roles.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}</select>}<span className="workspace-header__user">{user?.name}</span><button onClick={signOut} aria-label="Sign out"><LogOut size={16}/></button></div>
  </header>;
}
