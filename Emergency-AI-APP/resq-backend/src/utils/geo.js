const radians = (value) => (value * Math.PI) / 180;

export function kmBetween([lng1, lat1], [lng2, lat2]) {
  const radiusKm = 6371;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round((2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 10) / 10;
}
