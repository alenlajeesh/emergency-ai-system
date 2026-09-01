// Server-side triage. ML service (resq-ml) is tried first; the original
// deterministic keyword classifier is the fallback if the ML service is
// unreachable, slow, or errors — same schema either way, clients never know
// which one answered.

const categories = [
  ['medical', 'Medical emergency', '🚑', ['unconscious', 'collapsed', 'bleeding', 'breathing', 'chest pain', 'injured', 'not responding']],
  ['accident', 'Road accident', '🚗', ['crash', 'collision', 'accident', 'car', 'bike', 'vehicle']],
  ['fire', 'Fire', '🔥', ['fire', 'smoke', 'burning', 'flames', 'gas leak']],
  ['security', 'Security incident', '👮', ['assault', 'robbery', 'threat', 'weapon', 'suspicious', 'attacked']],
  ['disaster', 'Disaster', '🌊', ['flood', 'earthquake', 'landslide', 'collapse', 'storm']],
  ['missing', 'Missing person', '🔍', ['missing', 'lost', "can't find"]],
];

const requiredServices = {
  medical: ['medical'], accident: ['medical', 'security'], fire: ['fire', 'medical'],
  security: ['security'], disaster: ['fire', 'medical', 'security'], missing: ['security'], other: ['security'],
};
const criticalSignals = ['unconscious', 'not responding', 'trapped', 'explosion', 'weapon', 'collapsed', 'fire', 'not breathing', 'bleeding heavily'];
const mediumSignals = ['injured', 'minor', 'small', 'smoke', 'crash', 'accident'];

export const categoryMeta = Object.fromEntries([...categories, ['other', 'Other emergency', '⚠️', []]].map(([key, label, icon]) => [key, { key, label, icon }]));

export const recommendation = {
  medical: 'Keep the person safe and dispatch medical assistance.',
  accident: 'Dispatch medical and security response; confirm injuries and hazards.',
  fire: 'Dispatch fire and medical response; advise evacuation only when safe.',
  security: 'Request a security response and collect safe-to-share details.',
  disaster: 'Escalate to a multi-agency response.',
  missing: 'Collect last-seen information and notify security response.',
  other: 'Collect more details and keep a human dispatcher in the loop.',
};

export const missingFields = {
  medical: ['consciousness', 'breathing status', 'safe callback number'],
  accident: ['number of vehicles', 'injuries', 'road hazards'],
  fire: ['building occupancy', 'floor or area', 'people trapped'],
  security: ['immediate threat', 'safe description', 'safe callback number'],
  disaster: ['affected area', 'people trapped', 'access conditions'],
  missing: ['last seen location', 'description', 'time last seen'],
  other: ['time of incident', 'people affected', 'safe callback number'],
};

// Renamed from the original analyzeText — logic untouched, now the fallback.
function analyzeTextDeterministic(text = '') {
  const lower = text.toLowerCase();
  const best = categories.find(([, , , keywords]) => keywords.some((keyword) => lower.includes(keyword))) || ['other', 'Other emergency', '⚠️', []];
  const hits = best[3].filter((keyword) => lower.includes(keyword)).length;
  const severity = criticalSignals.some((signal) => lower.includes(signal)) ? 'critical'
    : mediumSignals.some((signal) => lower.includes(signal)) ? 'medium' : 'low';
  return {
    category: best[0],
    severity,
    confidence: Math.min(97, 58 + hits * 14 + (severity === 'critical' ? 8 : 0)),
    requiredServices: requiredServices[best[0]],
    manualVerification: hits === 0,
  };
}

async function analyzeTextML({ text }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('http://localhost:8000/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ML service returned ${res.status}`);
    const result = await res.json();
    return { ...result, manualVerification: result.confidence < 65 };
  } finally {
    clearTimeout(timeout);
  }
}

// Accepts either analyzeText("some text") — existing call sites —
// or analyzeText({ text }) for consistency with the ML path.
export async function analyzeText(input) {
  const { text } = typeof input === 'string' ? { text: input } : input;
  try {
    return await analyzeTextML({ text });
  } catch (err) {
    console.error('ML service unreachable, falling back to deterministic:', err.message);
    return { ...analyzeTextDeterministic(text), source: 'fallback' };
  }
}