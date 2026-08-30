// Temporary deterministic triage. This is deliberately server-side so it can
// be replaced by a trained model / LLM without changing clients or the schema.
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

export function analyzeText(text = '') {
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
