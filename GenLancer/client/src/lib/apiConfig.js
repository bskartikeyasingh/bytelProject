/**
 * Centralized API & Environment Configuration
 * 
 * Supports configurable API base URL via Vite environment variables:
 *  - Primary: VITE_API_BASE_URL
 *  - Secondary / Legacy: VITE_API_URL
 *  - Development fallback: 'http://localhost:3001'
 *  - Production fallback: window.location.origin (for same-origin hosting) or empty string
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/+$/, '');

/**
 * Builds an absolute API URL from a relative endpoint path
 * @param {string} path - e.g. '/api/creators' or 'api/creators'
 * @returns {string} Fully qualified URL or origin-relative path
 */
export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default {
  API_BASE_URL,
  apiUrl
};
