let loadPromise;

export function googleMapsConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
}

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (!googleMapsConfigured()) return Promise.reject(new Error('Google Maps is not configured'));
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)}&v=weekly`;
    script.async = true; script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Google Maps could not be loaded'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function reverseGeocode({ lat, lng }) {
  const google = await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat, lng } });
  return response.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
