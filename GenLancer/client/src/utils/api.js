import { apiUrl } from '../lib/apiConfig';
import { getAccessToken, authFetch } from '../lib/supabase';

/**
 * Universal authenticated API fetch client
 * Automatically resolves token from localStorage ("token" or "sb-*-auth-token")
 * or active auth session, and checks for 401 errors.
 */
export async function fetchWithAuth(endpointOrUrl, options = {}) {
  let token = localStorage.getItem("token");

  if (!token || token === "undefined" || token === "null") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const itemStr = localStorage.getItem(key);
          if (itemStr && itemStr !== "undefined") {
            const parsed = JSON.parse(itemStr);
            if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  if (!token || token === "undefined" || token === "null") {
    token = await getAccessToken();
  }

  const url = (typeof endpointOrUrl === 'string' && (endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://')))
    ? endpointOrUrl
    : apiUrl(endpointOrUrl);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401) {
    console.error("401 Unauthorized: Check if token exists in localStorage:", token);
  }

  return res;
}

export async function fetchMessages(requestId) {
  let token = localStorage.getItem("token") || 
              JSON.parse(localStorage.getItem("sb-...-auth-token") || "{}")?.access_token;

  if (!token || token === "undefined" || token === "null") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const itemStr = localStorage.getItem(key);
          if (itemStr && itemStr !== "undefined") {
            const parsed = JSON.parse(itemStr);
            if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  if (!token || token === "undefined" || token === "null") {
    token = await getAccessToken();
  }

  const url = apiUrl(`/api/messages/${encodeURIComponent(requestId)}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    console.error("401 Unauthorized: Check if token exists in localStorage:", token);
  }

  return res;
}

export { apiUrl, getAccessToken, authFetch };
export default {
  fetchWithAuth,
  fetchMessages,
  apiUrl,
  getAccessToken,
  authFetch
};
