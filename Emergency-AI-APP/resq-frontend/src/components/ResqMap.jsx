import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MapPinned } from 'lucide-react';
import { googleMapsConfigured, loadGoogleMaps } from '../lib/googleMaps';
import './ResqMap.css';

const fallbackCenter = { lat: 20, lng: 0 };
const darkStyles = [
  { elementType: 'geometry', stylers: [{ color: '#111827' }] }, { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#78849a' }] }, { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#273447' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1423' }] }, { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

function markerIcon(kind) {
  if (kind === 'responder') return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
  if (kind === 'self') return 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
  if (kind === 'critical') return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
  if (kind === 'medium') return 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
  return 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
}

export default function ResqMap({ markers = [], center, zoom = 13, onMarkerClick, route, className = '' }) {
  const node = useRef(null); const mapRef = useRef(null); const rendered = useRef([]); const routeLine = useRef(null);
  const [error, setError] = useState(''); const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!googleMapsConfigured()) return undefined;
    let active = true;
    loadGoogleMaps().then((google) => {
      if (!active || mapRef.current) return;
      mapRef.current = new google.maps.Map(node.current, {
        center: center || markers[0]?.position || fallbackCenter, zoom, disableDefaultUI: true, zoomControl: true,
        mapId: import.meta.env.VITE_GOOGLE_MAP_ID || undefined,
        ...(import.meta.env.VITE_GOOGLE_MAP_ID ? {} : { styles: darkStyles }),
      }); setReady(true);
    }).catch((reason) => active && setError(reason.message));
    return () => { active = false; rendered.current.forEach((marker) => marker.setMap(null)); routeLine.current?.setMap(null); rendered.current = []; routeLine.current = null; mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!googleMapsConfigured()) return undefined;
    let active = true;
    loadGoogleMaps().then((google) => {
      if (!active || !mapRef.current || !ready) return;
      rendered.current.forEach((marker) => marker.setMap(null)); rendered.current = [];
      const valid = markers.filter((marker) => Number.isFinite(marker.position?.lat) && Number.isFinite(marker.position?.lng));
      valid.forEach((item) => {
        const marker = new google.maps.Marker({ map: mapRef.current, position: item.position, title: item.title, icon: markerIcon(item.kind), label: item.label });
        if (onMarkerClick) marker.addListener('click', () => onMarkerClick(item));
        rendered.current.push(marker);
      });
      if (valid.length > 1) {
        const bounds = new google.maps.LatLngBounds(); valid.forEach((item) => bounds.extend(item.position)); mapRef.current.fitBounds(bounds, 56);
      } else if (valid.length === 1) { mapRef.current.setCenter(valid[0].position); mapRef.current.setZoom(zoom); }
      else if (center) { mapRef.current.setCenter(center); mapRef.current.setZoom(zoom); }
    }).catch((reason) => active && setError(reason.message));
    return () => { active = false; };
  }, [ready, markers, center?.lat, center?.lng, zoom, onMarkerClick]);

  useEffect(() => {
    if (!googleMapsConfigured() || !ready || !mapRef.current) return undefined;
    routeLine.current?.setMap(null); routeLine.current = null;
    if (!route?.encodedPolyline) return undefined;
    loadGoogleMaps().then((google) => {
      if (!mapRef.current) return;
      const path = decodePolyline(route.encodedPolyline);
      if (!path.length) return;
      routeLine.current = new google.maps.Polyline({ path, geodesic: true, strokeColor: '#5baaff', strokeOpacity: 0.9, strokeWeight: 4, map: mapRef.current });
    });
    return () => routeLine.current?.setMap(null);
  }, [ready, route?.encodedPolyline]);

  if (!googleMapsConfigured()) return <div className={`resq-map__empty ${className}`}><MapPinned size={25} /><strong>Map setup required</strong><span>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to the frontend environment to enable the live map.</span></div>;
  if (error) return <div className={`resq-map__empty ${className}`}><AlertTriangle size={25} /><strong>Map unavailable</strong><span>{error}</span></div>;
  return <div ref={node} className={`resq-map ${className}`} aria-label="Live incident map" />;
}

function decodePolyline(encoded) {
  let index = 0; let lat = 0; let lng = 0; const points = [];
  while (index < encoded.length) {
    let result = 0; let shift = 0; let byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
