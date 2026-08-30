export function rolesForUser(user) {
  const listedRoles = Array.isArray(user?.roles) ? user.roles : [];
  return [...new Set([...listedRoles, user?.role].filter(Boolean))];
}

export function canUseRole(user, role) {
  return rolesForUser(user).includes(role);
}

export function destinationForRole(role) {
  if (role === 'admin') return '/admin/control-center';
  if (role === 'responder') return '/responder';
  return '/citizen';
}
