import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const permittedRoles = ['citizen', 'responder', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    // The default workspace is kept as a single role so existing accounts and
    // links continue to work. `roles` is the authoritative capability list.
    role: { type: String, enum: permittedRoles, default: 'citizen', index: true },
    roles: { type: [{ type: String, enum: permittedRoles }], default: undefined },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.pre('validate', function normalizeRoles() {
  const listedRoles = Array.isArray(this.roles) ? this.roles : [];
  this.roles = [...new Set([this.role || 'citizen', ...listedRoles].filter((role) => permittedRoles.includes(role)))];
});

userSchema.methods.matchesPassword = function matchesPassword(value) {
  return bcrypt.compare(value, this.password);
};

export default mongoose.model('User', userSchema);
