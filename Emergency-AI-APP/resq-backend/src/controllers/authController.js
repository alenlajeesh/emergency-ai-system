import User from '../models/User.js';
import Responder from '../models/Responder.js';
import { signToken } from '../utils/token.js';
import { hasRole, rolesForUser } from '../utils/roles.js';

function publicUser(user, responder = null) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roles: rolesForUser(user),
    responder: responder && {
      id: String(responder._id),
      code: responder.code,
      service: responder.service,
      availability: responder.availability,
    },
  };
}

function responderCode(name) {
  const letters = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'RSQ';
  return `${letters}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function register(req, res) {
  const { name, email, password, phone, role = 'citizen', service } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (!['citizen', 'responder'].includes(role)) return res.status(400).json({ error: 'Choose either a citizen or responder account' });
  if (role === 'responder' && !['medical', 'fire', 'security'].includes(service)) return res.status(400).json({ error: 'Responders must select a service' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'This email is already registered' });

  const user = await User.create({ name, email, password, phone, role, roles: [role] });
  let responder = null;
  if (role === 'responder') responder = await Responder.create({ user: user._id, code: responderCode(name), service, availability: 'offline' });
  return res.status(201).json({ token: signToken(user), user: publicUser(user, responder) });
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchesPassword(req.body.password || ''))) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.active) return res.status(403).json({ error: 'This account is inactive' });
  const responder = hasRole(user, 'responder') ? await Responder.findOne({ user: user._id }) : null;
  return res.json({ token: signToken(user), user: publicUser(user, responder) });
}

export async function me(req, res) {
  const responder = hasRole(req.user, 'responder') ? await Responder.findOne({ user: req.user._id }) : null;
  return res.json({ user: publicUser(req.user, responder) });
}
