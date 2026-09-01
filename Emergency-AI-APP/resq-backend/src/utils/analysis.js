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

export async function analyzeText(input) {
  const { text } = typeof input === 'string' ? { text: input } : input;
  try {
    return await analyzeTextML({ text });
  } catch (err) {
    console.error('ML service unreachable, falling back to deterministic:', err.message);
    return { ...analyzeTextDeterministic(text), source: 'fallback' };
  }
}