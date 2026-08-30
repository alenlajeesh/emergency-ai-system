import Counter from '../models/Counter.js';

export async function nextIncidentNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'incident-number' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return counter.value;
}
