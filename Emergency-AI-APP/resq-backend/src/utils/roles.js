export const permittedRoles = ['citizen', 'responder', 'admin'];

// `role` remains the account's default workspace for backwards compatibility.
// `roles` holds every capability explicitly granted to that account.
export function rolesForUser(user) {
  const listedRoles = Array.isArray(user?.roles) ? user.roles : [];
  return [...new Set([...listedRoles, user?.role].filter((role) => permittedRoles.includes(role)))];
}

export function hasRole(user, role) {
  return rolesForUser(user).includes(role);
}
