import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { hasRole } from '../utils/roles.js';

export async function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.id);
    }
    next();
  } catch { next(); }
}

export function requireAuth(req, res, next) {
  if (req.user?.active) return next();
  return optionalAuth(req, res, () => {
    if (!req.user?.active) return res.status(401).json({ error: 'Authentication required' });
    return next();
  });
}

export const allowRoles = (...roles) => (req, res, next) => (
  roles.some((role) => hasRole(req.user, role)) ? next() : res.status(403).json({ error: 'This action is not permitted for your role' })
);

// A multi-role account is authorized for several workspaces. Route groups set
// the workspace it is actively using so controller rules remain unambiguous.
export const useWorkspaceRole = (role) => (req, res, next) => {
  if (!hasRole(req.user, role)) return res.status(403).json({ error: 'This action is not permitted for your role' });
  req.workspaceRole = role;
  return next();
};
