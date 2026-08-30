// Mock backend layer. Every function here is what a real API call will
// eventually replace — keep the shapes stable so swapping is a 1-file change.

const CATEGORIES = [
  { key: 'medical', label: 'Medical Emergency', icon: '🚑', keywords: ['unconscious', 'collapsed', 'bleeding', 'breathing', 'chest pain', 'injured', 'not responding'] },
  { key: 'accident', label: 'Accident', icon: '🚗', keywords: ['crash', 'collision', 'accident', 'hit', 'car', 'bike', 'vehicle'] },
  { key: 'fire', label: 'Fire', icon: '🔥', keywords: ['fire', 'smoke', 'burning', 'flames', 'gas leak'] },
  { key: 'security', label: 'Security', icon: '👮', keywords: ['assault', 'robbery', 'threat', 'weapon', 'suspicious', 'attacked'] },
  { key: 'disaster', label: 'Disaster', icon: '🌊', keywords: ['flood', 'earthquake', 'landslide', 'collapse', 'storm'] },
  { key: 'missing', label: 'Missing Person', icon: '🔍', keywords: ['missing', 'lost', 'can\'t find'] },
  { key: 'other', label: 'Other', icon: '⚠️', keywords: [] },
];

// The app remains usable if the API is temporarily unavailable, but every core
// action below prefers the persistent backend exposed through Vite's /api proxy.
async function request(path, options) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

const CRITICAL_SIGNALS = ['unconscious', 'not responding', 'trapped', 'explosion', 'weapon', 'collapsed', 'fire', 'not breathing', 'bleeding heavily'];
const MEDIUM_SIGNALS = ['injured', 'minor', 'small', 'smoke', 'crash', 'accident'];

function scoreText(text) {
  const lower = text.toLowerCase();
  let best = CATEGORIES[CATEGORIES.length - 1];
  let bestHits = 0;
  for (const cat of CATEGORIES) {
    const hits = cat.keywords.filter((k) => lower.includes(k)).length;
    if (hits > bestHits) {
      best = cat;
      bestHits = hits;
    }
  }

  let severity = 'low';
  if (CRITICAL_SIGNALS.some((s) => lower.includes(s))) severity = 'critical';
  else if (MEDIUM_SIGNALS.some((s) => lower.includes(s))) severity = 'medium';

  const confidence = Math.min(97, 58 + bestHits * 14 + (severity === 'critical' ? 8 : 0));

  const requiredMap = {
    medical: ['🚑 Ambulance'],
    accident: ['🚑 Ambulance', '👮 Police'],
    fire: ['🚒 Fire', '🚑 Ambulance'],
    security: ['👮 Police'],
    disaster: ['🚒 Fire', '🚑 Ambulance', '👮 Police'],
    missing: ['👮 Police'],
    other: ['👮 Police'],
  };

  return {
    category: best,
    severity,
    confidence,
    required: requiredMap[best.key] || ['👮 Police'],
  };
}

// Simulates AI text understanding with a short "thinking" delay.
export function classifyReport({ text }) {
  return request('/analyze', { method: 'POST', body: JSON.stringify({ text }) })
    .catch(() => new Promise((resolve) => setTimeout(() => resolve(scoreText(text)), 500)));
}

// Simulates reverse-geocoding a lat/lng into a readable place name.
export function detectLocation() {
  const spots = ['MG Road, Bengaluru', 'Indiranagar 100ft Road, Bengaluru', 'Silk Board Junction, Bengaluru', 'Koramangala 5th Block, Bengaluru'];
  return request('/location').catch(() => new Promise((resolve) => {
    setTimeout(() => resolve({
      lat: (12.9 + Math.random() * 0.1).toFixed(4),
      lng: (77.55 + Math.random() * 0.1).toFixed(4),
      label: spots[Math.floor(Math.random() * spots.length)],
    }), 500);
  }));
}

const RESPONDERS = [
  { id: 'AMB-01', type: 'medical', label: 'Ambulance 01', distanceKm: 2.4 },
  { id: 'AMB-02', type: 'medical', label: 'Ambulance 02', distanceKm: 6.8 },
  { id: 'POL-01', type: 'security', label: 'Police 01', distanceKm: 1.9 },
  { id: 'POL-02', type: 'security', label: 'Police 02', distanceKm: 4.2 },
  { id: 'FIRE-01', type: 'fire', label: 'Fire 01', distanceKm: 3.1 },
];

export function findNearestResponders(requiredTypes) {
  const typeKeyMap = { '🚑 Ambulance': 'medical', '👮 Police': 'security', '🚒 Fire': 'fire' };
  const wanted = requiredTypes.map((r) => typeKeyMap[r]).filter(Boolean);
  return RESPONDERS
    .filter((r) => wanted.includes(r.type))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .reduce((acc, r) => (acc.find((x) => x.type === r.type) ? acc : [...acc, r]), []);
}

const RECOMMENDED_ACTION = {
  medical: 'Continue AI intake and dispatch ambulance immediately.',
  accident: 'Confirm number of vehicles and injuries before final dispatch.',
  fire: 'Alert fire and medical units. Advise caller to evacuate if safe.',
  security: 'Transfer to a police operator for verification.',
  disaster: 'Escalate to multi-agency response and activate mutual aid.',
  missing: 'Collect last-seen details and notify police.',
  other: 'Continue AI intake and collect additional details.',
};

const MISSING_FIELDS = {
  medical: ['patient conscious?', 'breathing status', 'callback number'],
  accident: ['number of vehicles', 'injuries confirmed', 'callback number'],
  fire: ['building occupied?', 'floor number', 'callback number'],
  security: ['weapon involved?', 'suspect description', 'callback number'],
  disaster: ['area affected', 'people trapped', 'callback number'],
  missing: ['last seen location', 'physical description', 'callback number'],
  other: ['time of incident', 'suspect seen', 'callback number'],
};

const CHIPS_BY_STATUS = {
  reported: ['AI active', 'Score n/a'],
  dispatched: ['Dispatched'],
  en_route: ['Responder en route'],
  arrived: ['On scene'],
  resolved: ['Resolved'],
};

let incidentSeq = 1024;
const incidentStore = [];

function addIncident({ text, reportMode = 'text', simMode = 'normal', analysis, location, remote }) {
  const incident = {
    id: remote?.id || `INC${incidentSeq++}`,
    text,
    reportMode, // how the citizen filed it: text | voice | photo
    mode: simMode, // normal | disaster | world_cup — used by the responder mode filter
    analysis,
    location,
    status: remote?.status || 'reported',
    createdAt: remote?.createdAt || new Date().toISOString(),
    responders: remote?.responders || findNearestResponders(analysis.required),
    etaMin: remote?.etaMin || Math.floor(3 + Math.random() * 8),
    recommendedAction: remote?.recommendedAction || RECOMMENDED_ACTION[analysis.category.key] || RECOMMENDED_ACTION.other,
    missingFields: remote?.missingFields || MISSING_FIELDS[analysis.category.key] || MISSING_FIELDS.other,
  };
  incidentStore.unshift(incident);
  return incident;
}

export async function createIncident(input) {
  try {
    const remote = await request('/incidents', { method: 'POST', body: JSON.stringify(input) });
    return addIncident({ ...input, analysis: remote.analysis, location: remote.location, remote });
  } catch {
    return addIncident(input);
  }
}

export function listIncidents() {
  return incidentStore;
}

export async function loadIncidents() {
  try {
    const remote = await request('/incidents');
    incidentStore.splice(0, incidentStore.length, ...remote);
    return incidentStore;
  } catch {
    return incidentStore;
  }
}

export function getIncident(id) {
  return incidentStore.find((i) => i.id === id);
}

export function chipsFor(incident) {
  return CHIPS_BY_STATUS[incident.status] || [];
}

export function advanceStatus(id) {
  const flow = ['reported', 'dispatched', 'en_route', 'arrived', 'resolved'];
  const incident = incidentStore.find((i) => i.id === id);
  if (!incident) return null;
  const idx = flow.indexOf(incident.status);
  if (idx < flow.length - 1) incident.status = flow[idx + 1];
  request(`/incidents/${id.replace('INC', '')}/status`, { method: 'PATCH', body: JSON.stringify({ status: incident.status }) }).catch(() => {});
  return incident;
}

export function clearAllIncidents() {
  incidentStore.length = 0;
  request('/incidents', { method: 'DELETE' }).catch(() => {});
}

const SIM_SCENARIOS = {
  disaster: {
    text: 'Flooding reported across multiple streets, several residents trapped on rooftops.',
    location: { lat: '12.9611', lng: '77.6387', label: 'Ulsoor Lake Area, Bengaluru' },
  },
  world_cup: {
    text: 'Large crowd surge reported near the fan zone entrance, medical tent requesting backup.',
    location: { lat: '12.9757', lng: '77.6011', label: 'Fan Zone West, Bengaluru' },
  },
};

export function simulateIncident(kind) {
  const scenario = SIM_SCENARIOS[kind];
  if (!scenario) return null;
  const analysis = scoreText(scenario.text);
  // Kept synchronous for the dispatcher controls; simulation is also persisted.
  const incident = addIncident({ text: scenario.text, reportMode: 'text', simMode: kind, analysis, location: scenario.location });
  request('/incidents', { method: 'POST', body: JSON.stringify({ text: scenario.text, reportMode: 'text', simMode: kind, analysis, location: scenario.location }) }).catch(() => {});
  return incident;
}

export const CATEGORY_LIST = CATEGORIES;

const MARKER_LETTER = { medical: 'A', accident: 'A', fire: 'F', security: 'P', disaster: 'D', missing: 'P', other: 'E' };
export function markerLetterFor(categoryKey) {
  return MARKER_LETTER[categoryKey] || 'E';
}

// Seed a couple of demo incidents so the responder dashboard isn't empty
// on first load, before any citizen report has been filed in this session.
function seed() {
  addIncident({
    text: "A vehicle crashed near the junction and one person is unconscious.",
    reportMode: 'text',
    simMode: 'normal',
    analysis: scoreText("A vehicle crashed near the junction and one person is unconscious, bleeding heavily."),
    location: { lat: '12.9352', lng: '77.6146', label: 'Silk Board Junction, Bengaluru' },
  });
  addIncident({
    text: "Small electrical spark from a broken streetlight, nothing serious.",
    reportMode: 'text',
    simMode: 'normal',
    analysis: scoreText("Small electrical spark from a broken streetlight, nothing serious."),
    location: { lat: '12.9719', lng: '77.6412', label: 'Indiranagar 100ft Road, Bengaluru' },
  });
}
seed();
