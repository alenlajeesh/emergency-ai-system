const SESSION_KEY = 'resq_session';

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function storeSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function clearStoredSession() { localStorage.removeItem(SESSION_KEY); }

export async function api(path, options = {}) {
  const { method = 'GET', body, headers = {}, authenticated = true } = options;
  const session = authenticated ? getStoredSession() : null;
  const isForm = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...headers },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const apiClient = {
  login: (payload) => api('/auth/login', { method: 'POST', body: payload, authenticated: false }),
  signup: (payload) => api('/auth/register', { method: 'POST', body: payload, authenticated: false }),
  me: () => api('/auth/me'),
  upload: (file) => { const form = new FormData(); form.append('image', file); return api('/uploads', { method: 'POST', body: form }); },
  reverseGeocode: ({ lat, lng }) => api(`/maps/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
  computeRoute: (origin, destination) => api('/maps/route', { method: 'POST', body: { origin, destination } }),
  previewTriage: (text) => api('/citizen/triage-preview', { method: 'POST', body: { text } }),
  createCitizenIncident: (payload) => api('/citizen/incidents', { method: 'POST', body: payload }),
  citizenIncidents: () => api('/citizen/incidents'),
  citizenIncident: (number) => api(`/citizen/incidents/${number}`),
  responderProfile: () => api('/responder/me'),
  responderQueue: () => api('/responder/incidents'),
  updateResponderLocation: (coords) => api('/responder/me/location', { method: 'PATCH', body: coords }),
  updateResponderAvailability: (availability) => api('/responder/me/availability', { method: 'PATCH', body: { availability } }),
  acceptIncident: (number) => api(`/responder/incidents/${number}/accept`, { method: 'POST' }),
  updateResponderIncident: (number, status) => api(`/responder/incidents/${number}/status`, { method: 'PATCH', body: { status } }),
  adminDashboard: () => api('/admin/dashboard'),
  adminIncidents: () => api('/admin/incidents'),
  adminResponders: () => api('/admin/responders'),
  updateAdminIncident: (number, status) => api(`/admin/incidents/${number}/status`, { method: 'PATCH', body: { status } }),
};
