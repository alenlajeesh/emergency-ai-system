const validCoordinates = ({ lat, lng } = {}) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

function assertConfigured() {
  if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
    const error = new Error('Google Maps server integration is not configured');
    error.status = 503;
    throw error;
  }
}

function mapApiError(payload) {
  const error = new Error(payload?.error_message || payload?.error?.message || 'Google Maps request failed');
  error.status = 502;
  return error;
}

export async function reverseGeocode(req, res) {
  const coordinates = { lat: Number(req.query.lat), lng: Number(req.query.lng) };
  if (!validCoordinates(coordinates)) return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  assertConfigured();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${coordinates.lat},${coordinates.lng}`);
  url.searchParams.set('key', process.env.GOOGLE_MAPS_SERVER_KEY);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const payload = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(payload.status)) throw mapApiError(payload);
  return res.json({ label: payload.results?.[0]?.formatted_address || `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}` });
}

export async function computeRoute(req, res) {
  const { origin, destination } = req.body;
  if (!validCoordinates(origin) || !validCoordinates(destination)) return res.status(400).json({ error: 'Valid origin and destination coordinates are required' });
  assertConfigured();
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: Number(origin.lat), longitude: Number(origin.lng) } } },
      destination: { location: { latLng: { latitude: Number(destination.lat), longitude: Number(destination.lng) } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.routes?.[0]) throw mapApiError(payload);
  const route = payload.routes[0];
  return res.json({
    distanceMeters: route.distanceMeters,
    durationSeconds: Number.parseFloat(route.duration || '0'),
    encodedPolyline: route.polyline?.encodedPolyline || null,
  });
}
