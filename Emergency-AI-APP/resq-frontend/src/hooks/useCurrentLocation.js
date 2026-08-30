import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function useCurrentLocation(autoStart = false) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const detect = useCallback(async () => {
    if (!navigator.geolocation) { setError('This browser does not support location services.'); setStatus('error'); return null; }
    setStatus('locating'); setError('');
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }));
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      let label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      try { label = (await apiClient.reverseGeocode(coords)).label; } catch { /* coordinates remain a truthful fallback */ }
      const next = { ...coords, label };
      setLocation(next); setStatus('ready'); return next;
    } catch (reason) {
      setError(reason.code === 1 ? 'Location permission was denied. Enable it to send a report.' : 'Your location could not be determined. Try again in a moment.');
      setStatus('error'); return null;
    }
  }, []);

  useEffect(() => { if (autoStart) detect(); }, [autoStart, detect]);
  return { location, status, error, detect };
}
