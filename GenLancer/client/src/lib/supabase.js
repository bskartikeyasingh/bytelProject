import { createClient } from '@supabase/supabase-js';
import { apiUrl } from './apiConfig';

// Environment variables configured via Vite (.env or environment)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Never hardcode or fallback to private service role keys
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate public key format (supports both standard JWT anon keys and modern sb_publishable_* keys)
// Rejects dangerous service-role keys if inadvertently provided in frontend
const isServiceRoleJwt = (() => {
  if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || !supabaseAnonKey.startsWith('eyJ')) {
    return false;
  }
  try {
    const parts = supabaseAnonKey.split('.');
    if (parts.length >= 2) {
      const payload = typeof atob !== 'undefined'
        ? JSON.parse(atob(parts[1]))
        : JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.role === 'service_role';
    }
  } catch (_) {}
  return false;
})();

const isValidPublicKeyFormat = Boolean(
  supabaseAnonKey &&
  !isServiceRoleJwt &&
  (supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.startsWith('sb_publishable_'))
);

// Detect if a syntactically valid public key and URL are configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  isValidPublicKeyFormat
);

// Fallback to a non-crashing mock/stub client if unconfigured so components don't crash on boot
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      'https://unconfigured-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured-placeholder'
    );

/**
 * Retrieve current active session token for API requests
 */
export async function getAccessToken() {
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch (_) {}
  }

  // Fallback demo token for local development when Supabase Auth is not live
  const demoRole = localStorage.getItem('genlancer_active_role') || 'freelancer';
  const demoUserId = localStorage.getItem('genlancer_user_id') || (demoRole === 'company' ? 'comp-local-1' : 'c1');
  return `demo-token:${demoRole}:${demoUserId}:${demoRole}@genlancer.io`;
}

/**
 * Authenticated fetch helper that injects Supabase Bearer token,
 * resolves base API URL, and enforces timeout handling.
 */
export async function authFetch(pathOrUrl, options = {}, timeoutMs = 15000) {
  const targetUrl = (typeof pathOrUrl === 'string' && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')))
    ? pathOrUrl
    : apiUrl(pathOrUrl);

  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${targetUrl} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sign Up with Supabase Auth
 */
export async function signUpUser({ email, password, role = 'freelancer', fullName, specialization }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
          specialization
        }
      }
    });

    if (error) throw error;
    if (data?.user) {
      localStorage.setItem('genlancer_active_role', role);
      localStorage.setItem('genlancer_user_id', data.user.id);
    }
    return data;
  }

  // Simulated fallback for demo mode
  const mockId = role === 'company' ? `comp-${Date.now()}` : `fl-${Date.now()}`;
  localStorage.setItem('genlancer_active_role', role);
  localStorage.setItem('genlancer_user_id', mockId);
  return {
    user: {
      id: mockId,
      email,
      user_metadata: { role, full_name: fullName, specialization }
    },
    session: {
      access_token: `demo-token:${role}:${mockId}:${email}`
    }
  };
}

/**
 * Sign In with Supabase Auth
 */
export async function signInUser({ email, password }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (data?.user) {
      const detectedRole = data.user.user_metadata?.role || (email.includes('company') ? 'company' : 'freelancer');
      localStorage.setItem('genlancer_active_role', detectedRole);
      localStorage.setItem('genlancer_user_id', data.user.id);
    }
    return data;
  }

  // Simulated fallback for demo mode
  const detectedRole = email.includes('company') || email.includes('brand') ? 'company' : 'freelancer';
  const mockId = detectedRole === 'company' ? 'comp-local-1' : 'c1';
  localStorage.setItem('genlancer_active_role', detectedRole);
  localStorage.setItem('genlancer_user_id', mockId);
  return {
    user: {
      id: mockId,
      email,
      user_metadata: { role: detectedRole, full_name: 'Local Demo User' }
    },
    session: {
      access_token: `demo-token:${detectedRole}:${mockId}:${email}`
    }
  };
}

/**
 * Sign Out
 */
export async function signOutUser() {
  localStorage.removeItem('genlancer_active_role');
  localStorage.removeItem('genlancer_user_id');
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
  }
}
