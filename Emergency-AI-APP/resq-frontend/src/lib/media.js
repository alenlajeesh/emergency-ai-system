const API_ORIGIN = import.meta.env.VITE_API_URL || window.location.origin.replace(/:\d+$/, ':4000');
// ^ if your backend runs on a different port than 4000, change the fallback above,
//   or (better) set VITE_API_URL in your .env file instead of relying on this fallback.

export function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute, leave as-is
  return `${API_ORIGIN}${path}`;
}