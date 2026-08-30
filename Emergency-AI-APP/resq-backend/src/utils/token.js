import jwt from 'jsonwebtoken';
import { rolesForUser } from './roles.js';

export const signToken = (user) => jwt.sign({ id: user._id, roles: rolesForUser(user) }, process.env.JWT_SECRET, { expiresIn: '7d' });
