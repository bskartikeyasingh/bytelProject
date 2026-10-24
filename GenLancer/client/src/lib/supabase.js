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
 * Safely inspects localStorage for standard tokens, Supabase session tokens,
 * and user session metadata, preventing empty or "undefined" token serialization.
 */
export async function getAccessToken() {
  // 1. Primary token directly stored in localStorage (from login/registration)
  try {
    const directToken = localStorage.getItem('token');
    if (directToken && directToken !== 'undefined' && directToken !== 'null' && directToken.trim()) {
      return directToken.trim();
    }
  } catch (_) {}

  // 2. Supabase auth session token via client
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && session.access_token !== 'undefined' && session.access_token !== 'null') {
        return session.access_token;
      }
    } catch (_) {}
  }

  // 3. Supabase local storage token fallback (sb-...-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        const itemStr = localStorage.getItem(key);
        if (itemStr && itemStr !== 'undefined' && itemStr !== 'null') {
          const parsed = JSON.parse(itemStr);
          if (parsed?.access_token && parsed.access_token !== 'undefined') {
            return parsed.access_token;
          }
        }
      }
    }
  } catch (_) {}

  // 4. Nested user token in localStorage ('user')
  try {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      const parsed = JSON.parse(userStr);
      if (parsed?.token && parsed.token !== 'undefined' && parsed.token !== 'null') return parsed.token;
      if (parsed?.access_token && parsed.access_token !== 'undefined' && parsed.access_token !== 'null') return parsed.access_token;
    }
  } catch (_) {}

  // 5. Fallback demo token for local development
  const demoRole = localStorage.getItem('genlancer_active_role') || 'company';
  const demoUserId = localStorage.getItem('genlancer_user_id') || (demoRole === 'company' ? 'demo_user_201' : 'demo_user_101');
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

  if (token && token !== 'undefined' && token !== 'null') {
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

    if (res.status === 401) {
      console.error("401 Unauthorized: Check if token exists in localStorage:", token);
    }

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

import { DEMO_USERS } from '../data/demoUsers';
import { validateRegistrationEmail, validateEmailFormat } from './emailSecurity';

/**
 * Sign Up with Supabase Auth
 * Sends one-time email verification magic link.
 * Does not grant authenticated session or store credentials in localStorage until verified.
 */
export async function signUpUser({ email, password, role = 'freelancer', fullName, specialization }) {
  // 1. Email format and disposable domain verification
  const emailCheck = validateRegistrationEmail(email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error);
  }
  const cleanEmail = emailCheck.sanitized;

  // 2. Prevent overwriting or registering as a demo user
  const matchedDemo = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
  if (matchedDemo) {
    throw new Error('This email address is reserved for demo testing. Please use a unique personal or work email address.');
  }

  // 3. Clear any residual local session state before initiating new registration
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('genlancer_active_role');
    localStorage.removeItem('genlancer_user_id');
  } catch (_) {}

  // 4. Supabase Auth registration
  if (isSupabaseConfigured) {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/?verify=true` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role,
          full_name: fullName,
          specialization
        }
      }
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      throw error;
    }

    // Enforce verification before accessing features:
    // If Supabase auto-granted a session (when "Confirm email" is disabled in dashboard),
    // terminate it immediately so user must verify via magic link.
    if (data?.session) {
      await supabase.auth.signOut().catch(() => {});
    }

    // Dispatch one-time magic link OTP
    try {
      await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false
        }
      });
    } catch (_) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: { emailRedirectTo: redirectUrl }
        });
      } catch (_) {}
    }

    return {
      success: true,
      needsVerification: true,
      email: cleanEmail,
      role,
      user: data?.user
    };
  }

  // Simulated fallback for unconfigured environment
  return {
    success: true,
    needsVerification: true,
    email: cleanEmail,
    role,
    user: {
      id: `fl-${Date.now()}`,
      email: cleanEmail,
      user_metadata: { role, full_name: fullName, specialization }
    }
  };
}

/**
 * Resend Verification Email with Rate-Limiting & Disposable Protection
 */
export async function resendVerificationEmail(email) {
  const emailCheck = validateRegistrationEmail(email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error);
  }
  const cleanEmail = emailCheck.sanitized;

  const matchedDemo = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
  if (matchedDemo) {
    throw new Error('Demo accounts are pre-configured test fixtures and do not require email verification.');
  }

  if (isSupabaseConfigured) {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/?verify=true` : undefined;

    // Attempt signInWithOtp dispatch first
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false
        }
      });
      if (!otpErr) return { success: true };
    } catch (_) {}

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      if (error.status === 429 || error.message?.toLowerCase().includes('rate')) {
        throw new Error('Too many verification requests. Please wait a moment before trying again.');
      }
      if (error.message?.toLowerCase().includes('already confirmed')) {
        throw new Error('This account email is already verified. You can proceed directly to sign in.');
      }
      throw error;
    }
    return { success: true };
  }

  return { success: true, simulated: true };
}

/**
 * Process Magic-Link / Token Verification Callbacks from URL
 * Supports:
 * 1. Supabase PKCE Authorization Code (?code=...)
 * 2. Supabase OTP / Token Hash (?token_hash=...&type=signup|email)
 * 3. Implicit Hash Fragments (#access_token=...)
 * 4. Auth Errors (?error=access_denied&error_code=otp_expired)
 */
export async function handleEmailVerificationCallback() {
  if (typeof window === 'undefined') return { status: 'none' };

  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  // Check for error parameters in query or hash
  const errorParam = urlParams.get('error') || hashParams.get('error');
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
  const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

  if (errorParam || errorCode) {
    // Clear URL parameters without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
    return {
      status: 'error',
      code: errorCode || errorParam,
      message: (errorCode === 'otp_expired' || /expired/i.test(errorDesc || ''))
        ? 'Your verification link has expired or has already been used. Please request a new one.'
        : (errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Email verification link is invalid or expired.')
    };
  }

  const code = urlParams.get('code');
  const tokenHash = urlParams.get('token_hash');
  const otpType = urlParams.get('type') || 'signup';
  const hasVerifyParam = urlParams.get('verify') === 'true';

  if (!isSupabaseConfigured) {
    if (code || tokenHash || hasVerifyParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return { status: 'simulated_verified' };
    }
    return { status: 'none' };
  }

  try {
    let session = null;

    // A. Handle PKCE Code exchange
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      session = data?.session;
    } 
    // B. Handle Token Hash verification
    else if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType
      });
      if (error) throw error;
      session = data?.session;
    }
    // C. Check if Supabase client already auto-detected and parsed the session
    else if (hasVerifyParam || hashParams.get('access_token')) {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      session = existingSession;
    }

    if (session?.user) {
      // Clear URL parameters cleanly
      window.history.replaceState({}, document.title, window.location.pathname);

      const user = session.user;
      const detectedRole = user.user_metadata?.role || 'freelancer';
      const userObj = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        displayName: user.user_metadata?.full_name || user.email.split('@')[0],
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        specialization: user.user_metadata?.specialization || (detectedRole === 'company' ? 'Brand Client' : 'AI Creator'),
        bio: user.user_metadata?.bio || 'Verified GenLancer member.',
        company: user.user_metadata?.company || '',
        ai_score: user.user_metadata?.score ?? null,
        is_verified: Boolean(user.user_metadata?.is_verified || false),
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`,
        role: detectedRole,
        user_metadata: user.user_metadata
      };

      localStorage.setItem('token', session.access_token);
      localStorage.setItem('genlancer_active_role', detectedRole);
      localStorage.setItem('genlancer_user_id', user.id);
      localStorage.setItem('user', JSON.stringify(userObj));

      return {
        status: 'success',
        user: userObj,
        role: detectedRole,
        session
      };
    }
  } catch (err) {
    window.history.replaceState({}, document.title, window.location.pathname);
    console.error('Email verification error:', err);
    return {
      status: 'error',
      code: err.code || 'VERIFICATION_FAILED',
      message: err.message || 'Verification link is invalid or has expired.'
    };
  }

  return { status: 'none' };
}

/**
 * Sign In with Supabase Auth
 * Strictly enforces that real accounts must be confirmed before login.
 * Safely preserves controlled demo account credentials.
 */
export async function signInUser({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const matchedDemo = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);

  // 1. Preserved Demo Account Workflow (Explicitly controlled testing credentials)
  if (matchedDemo) {
    if (matchedDemo.password !== password) {
      throw new Error('Invalid password for demo account.');
    }

    const detectedRole = matchedDemo.role === 'company' ? 'company' : 'freelancer';
    const mockId = matchedDemo.id;
    const fullName = matchedDemo.name;

    const userObj = {
      id: mockId,
      email: matchedDemo.email,
      full_name: fullName,
      displayName: fullName,
      name: fullName,
      specialization: matchedDemo.specialization || 'AI Creator',
      bio: matchedDemo.bio || 'Cinematic AI Director & Generative Video Producer.',
      company: matchedDemo.company || '',
      ai_score: matchedDemo.score ?? 96,
      is_verified: matchedDemo.verified ?? true,
      photoURL: matchedDemo.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mockId)}`,
      role: detectedRole,
      user_metadata: { role: detectedRole, full_name: fullName, specialization: matchedDemo.specialization }
    };

    const demoToken = `demo-token:${detectedRole}:${mockId}:${matchedDemo.email}`;
    localStorage.setItem('token', demoToken);
    localStorage.setItem('genlancer_active_role', detectedRole);
    localStorage.setItem('genlancer_user_id', mockId);
    localStorage.setItem('user', JSON.stringify(userObj));

    return {
      user: userObj,
      session: {
        access_token: demoToken
      }
    };
  }

  // 2. Real User Supabase Authentication
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      // Check for unconfirmed email
      const isUnconfirmed = error.code === 'email_not_confirmed' || 
                            /email not confirmed/i.test(error.message || '');
      if (isUnconfirmed) {
        const unconfirmedError = new Error('Your email address has not been verified yet. Please check your inbox for the verification link.');
        unconfirmedError.code = 'EMAIL_NOT_CONFIRMED';
        unconfirmedError.unconfirmed = true;
        unconfirmedError.email = cleanEmail;
        throw unconfirmedError;
      }

      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    if (data?.user) {
      // Check if user has confirmed email (if confirmation is tracked)
      if (data.user.identities && data.user.identities.length > 0 && !data.user.confirmed_at && !data.user.email_confirmed_at) {
        // Sign out temporary unconfirmed session
        await supabase.auth.signOut().catch(() => {});
        const unconfirmedError = new Error('Your email address has not been verified yet. Please check your inbox for the verification link.');
        unconfirmedError.code = 'EMAIL_NOT_CONFIRMED';
        unconfirmedError.unconfirmed = true;
        unconfirmedError.email = cleanEmail;
        throw unconfirmedError;
      }

      const detectedRole = data.user.user_metadata?.role || 'freelancer';
      const userObj = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        displayName: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        specialization: data.user.user_metadata?.specialization || 'AI Creator',
        bio: data.user.user_metadata?.bio || 'Generative Creator.',
        company: data.user.user_metadata?.company || '',
        ai_score: data.user.user_metadata?.score ?? null,
        is_verified: Boolean(data.user.user_metadata?.is_verified || false),
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.id)}`,
        role: detectedRole,
        user_metadata: data.user.user_metadata
      };

      const token = data.session?.access_token;
      if (!token) {
        throw new Error('Authentication session token could not be established.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('genlancer_active_role', detectedRole);
      localStorage.setItem('genlancer_user_id', data.user.id);
      localStorage.setItem('user', JSON.stringify(userObj));

      return {
        ...data,
        user: userObj,
        session: data.session
      };
    }
  }

  // 3. Fallback when Supabase is completely unconfigured
  throw new Error('Invalid email or password. For demo testing, please select a demo account.');
}

/**
 * Sign Out
 */
export async function signOutUser() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('genlancer_active_role');
  localStorage.removeItem('genlancer_user_id');
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
  }
}

/**
 * Send Password Reset Email
 * Enforces email syntax validation.
 * Uses generic confirmation response without exposing user existence.
 */
export async function sendPasswordResetEmail(email) {
  const emailCheck = validateEmailFormat(email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error);
  }
  const cleanEmail = emailCheck.sanitized;

  // Check if it's a demo account
  const matchedDemo = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
  if (matchedDemo) {
    return {
      success: true,
      isDemo: true,
      demoPassword: matchedDemo.password,
      message: `Account "${matchedDemo.name}" is a pre-configured demo account. Password: "${matchedDemo.password}"`
    };
  }

  if (isSupabaseConfigured) {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'https://genlancer.onrender.com/reset-password';

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo
      });

      if (error) {
        if (error.status === 429 || error.message?.toLowerCase().includes('rate')) {
          throw new Error('Too many password reset requests. Please wait a moment before trying again.');
        }
        console.warn('Supabase resetPasswordForEmail notice:', error.message);
      }
    } catch (err) {
      if (err.message?.includes('Too many password reset requests')) {
        throw err;
      }
      console.warn('Password reset request logged:', err.message);
    }
  }

  // Consistent generic confirmation to prevent user enumeration
  return {
    success: true,
    message: 'If an account exists for this email, you will receive a password reset link shortly.'
  };
}

/**
 * Update User Password
 * Used on the Reset Password page when authenticated via recovery session.
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (!isSupabaseConfigured) {
    return { success: true, simulated: true };
  }

  // Ensure an active recovery session exists
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active recovery session found. Please request a new password reset link.');
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw error;
  }

  return { success: true, user: data.user };
}

/**
 * Handle Password Recovery Callback & Session Extraction
 * Inspects URL for recovery tokens, PKCE codes, error params, or hash fragments.
 */
export async function handlePasswordRecoveryCallback() {
  if (typeof window === 'undefined') return { status: 'none' };

  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  // Check for error parameters in query or hash
  const errorParam = urlParams.get('error') || hashParams.get('error');
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
  const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

  if (errorParam || errorCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    return {
      status: 'error',
      code: errorCode || errorParam,
      message: (errorCode === 'otp_expired' || /expired/i.test(errorDesc || ''))
        ? 'Your password reset link has expired or has already been used. Please request a new reset email.'
        : (errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Password recovery link is invalid or expired.')
    };
  }

  const code = urlParams.get('code');
  const tokenHash = urlParams.get('token_hash');
  const type = urlParams.get('type') || hashParams.get('type');
  const isRecoveryType = type === 'recovery';

  if (!isSupabaseConfigured) {
    return { status: 'recovery_ready', simulated: true };
  }

  try {
    let session = null;

    // A. Handle PKCE Code exchange
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        session = data.session;
      }
    }
    // B. Handle Token Hash verification for recovery
    else if (tokenHash && isRecoveryType) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });
      if (!error && data?.session) {
        session = data.session;
      }
    }
    // C. Check current session
    if (!session) {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      session = existingSession;
    }

    if (session) {
      return {
        status: 'recovery_ready',
        session,
        user: session.user
      };
    }
  } catch (err) {
    console.error('Password recovery session check failed:', err);
    return {
      status: 'error',
      code: err.code || 'RECOVERY_ERROR',
      message: err.message || 'Unable to establish recovery session. Please request a new reset link.'
    };
  }

  return {
    status: 'no_session',
    message: 'No active password recovery session found. Please request a new reset link.'
  };
}


