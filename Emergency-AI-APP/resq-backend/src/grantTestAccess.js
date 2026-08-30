import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import connectDatabase from './config/database.js';
import User from './models/User.js';
import Responder from './models/Responder.js';
import { rolesForUser } from './utils/roles.js';

const [emailInput, serviceInput = 'medical'] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const service = serviceInput.trim().toLowerCase();

if (!email || !['medical', 'fire', 'security'].includes(service)) {
  console.error('Usage: npm run grant:test-access -- your-email@example.com [medical|fire|security]');
  process.exit(1);
}

function responderCode(name) {
  const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'RSQ';
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

await connectDatabase();
const user = await User.findOne({ email });
if (!user) {
  console.error(`No account exists for ${email}. Sign up first, then run this command again.`);
  process.exit(1);
}

user.role = 'admin';
user.roles = [...new Set([...rolesForUser(user), 'citizen', 'responder', 'admin'])];
await user.save();

let responder = await Responder.findOne({ user: user._id });
if (!responder) {
  responder = await Responder.create({ user: user._id, code: responderCode(user.name), service, availability: 'offline' });
}

console.log(`${email} can now test citizen, responder, and admin workspaces.`);
console.log(`Responder service: ${responder.service}. Sign out and sign back in to refresh the account session.`);
process.exit(0);
