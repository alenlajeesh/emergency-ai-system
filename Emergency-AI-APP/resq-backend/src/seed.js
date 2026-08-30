import 'dotenv/config';
import connectDatabase from './config/database.js';
import User from './models/User.js';
import { hasRole, rolesForUser } from './utils/roles.js';

await connectDatabase();

const email = process.env.ADMIN_EMAIL || 'admin@resq.local';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
let admin = await User.findOne({ email });
if (!admin) {
  admin = await User.create({ name: 'RESQ Administrator', email, password, role: 'admin' });
  console.log(`Created admin account: ${email}`);
} else if (!hasRole(admin, 'admin')) {
  admin.role = 'admin';
  admin.roles = [...new Set([...rolesForUser(admin), 'admin'])];
  if (process.env.RESET_ADMIN_PASSWORD === 'true') admin.password = password;
  await admin.save();
  console.log(`Promoted existing account to admin: ${email}`);
} else {
  if (process.env.RESET_ADMIN_PASSWORD === 'true') {
    admin.password = password;
    await admin.save();
    console.log(`Reset password for admin account: ${email}`);
  } else console.log(`Admin account already exists: ${email}`);
}
console.log('Change the development admin password before deployment.');
process.exit(0);
