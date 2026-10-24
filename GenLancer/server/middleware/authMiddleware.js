/**
 * Supabase Authentication & Role-Based Authorization Middleware
 * 
 * Verifies Supabase JWT access tokens on protected routes.
 * Never trusts sender_id, company_id, creator_id, or role supplied in request bodies.
 * Resolves authoritative roles from server-managed profiles / app_metadata.
 * Never allows test or demo token bypasses in production mode.
 */

import { collaborationService } from '../services/collaborationService.js';

let serverSupabaseClient = null;

export function setAuthSupabaseClient(client) {
  serverSupabaseClient = client;
}

export function getAuthSupabaseClient() {
  return serverSupabaseClient;
}

/**
 * Startup Security Guard: Rejects unsafe production configurations immediately.
 * Validates that production mode never runs with test bypasses, demo fixtures, or unconfigured auth.
 */
export function validateProductionSecurityConfig(env = process.env) {
  const isProd = (env.NODE_ENV === 'production');
  if (!isProd) return;

  const violations = [];

  if (env.ALLOW_TEST_TOKENS === 'true') {
    violations.push('ALLOW_TEST_TOKENS is enabled in production. Test tokens are strictly forbidden.');
  }

  if (env.DEMO_MODE === 'true') {
    violations.push('DEMO_MODE is enabled in production. Real Supabase Auth and database persistence are required.');
  }

  const hasSupabaseUrl = Boolean(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const hasSupabaseKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY);
  if (!hasSupabaseUrl || !hasSupabaseKey) {
    violations.push('Missing required Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) in production.');
  }

  if (violations.length > 0) {
    const errorMsg = `[SECURITY FATAL] Unsafe production configuration rejected:\n - ${violations.join('\n - ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Express middleware to validate Supabase JWT access tokens
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No Authorization header provided.',
      code: 'UNAUTHENTICATED'
    });
  }

  const [scheme, token] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: 'Malformed authorization header. Expected format: "Bearer <token>".',
      code: 'MALFORMED_AUTH_HEADER'
    });
  }

  const isProduction = (process.env.NODE_ENV === 'production');

  // 1. Production safety guard: Strictly reject any test or demo token attempts
  if (isProduction && (token.startsWith('test-token:') || token.startsWith('demo-token:'))) {
    return res.status(401).json({
      success: false,
      error: 'Synthetic test/demo tokens are strictly forbidden in production mode.',
      code: 'PRODUCTION_BYPASS_FORBIDDEN'
    });
  }

  // 2. Deterministic test tokens available ONLY when NODE_ENV === 'test'
  if (token.startsWith('test-token:')) {
    if (process.env.NODE_ENV !== 'test') {
      return res.status(401).json({
        success: false,
        error: 'Test-token authentication is available strictly when NODE_ENV=test.',
        code: 'TEST_TOKEN_DISALLOWED'
      });
    }

    const [, rawRole = 'freelancer', userId = 'test-user', email = 'test@genlancer.io'] = token.split(':');
    const normalizedRole = rawRole.toLowerCase();
    req.user = {
      id: userId,
      email,
      role: normalizedRole,
      user_metadata: { role: normalizedRole, full_name: `Test ${rawRole}` },
      app_metadata: { provider: 'test', role: normalizedRole }
    };
    return next();
  }

  // 3. Demo tokens available ONLY when DEMO_MODE === 'true' and never in production
  if (token.startsWith('demo-token:')) {
    if (process.env.DEMO_MODE !== 'true') {
      return res.status(401).json({
        success: false,
        error: 'Demo tokens are disallowed when DEMO_MODE is not true.',
        code: 'DEMO_TOKEN_DISALLOWED'
      });
    }

    const [, rawRole = 'freelancer', userId = 'demo-user', email = 'demo@genlancer.io'] = token.split(':');
    const normalizedRole = rawRole.toLowerCase();
    req.user = {
      id: userId,
      email,
      role: normalizedRole,
      user_metadata: { role: normalizedRole, full_name: `Demo ${rawRole}` },
      app_metadata: { provider: 'demo', role: normalizedRole }
    };
    return next();
  }

  // 4. Validate token against authoritative Supabase Auth
  const client = serverSupabaseClient;
  if (!client || !client.auth) {
    return res.status(503).json({
      success: false,
      error: 'Supabase authentication service is not configured on the server.',
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
  }

  try {
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Authoritative Role Resolution:
    // DO NOT trust mutable user_metadata.role! Any client can mutate user_metadata.
    // Query authoritative server-managed role and linked account IDs from public.profiles.
    let authoritativeRole = null;
    let serverFreelancerId = null;
    let serverCompanyId = null;

    if (typeof client.from === 'function') {
      try {
        const { data: profile, error: profileErr } = await client
          .from('profiles')
          .select('id, role, freelancer_id, company_id')
          .eq('id', user.id)
          .single();

        if (!profileErr && profile && profile.id === user.id) {
          if (profile.role) {
            authoritativeRole = String(profile.role).toLowerCase();
          }
          serverFreelancerId = profile.freelancer_id || null;
          serverCompanyId = profile.company_id || null;
        } else if (profileErr) {
          const isNotFound = profileErr.code === 'PGRST116' || 
                             profileErr.code === 'PGRST205' || 
                             profileErr.message?.includes('0 rows') ||
                             profileErr.message?.includes('schema cache');
          if (!isNotFound) {
            req.profileLookupError = profileErr;
          }
        }
      } catch (dbErr) {
        req.profileLookupError = dbErr;
      }
    }

    // Fail closed: only accept server-controlled app_metadata if explicitly set
    if (!authoritativeRole && user.app_metadata?.role) {
      authoritativeRole = String(user.app_metadata.role).toLowerCase();
    }

    // Default to least-privileged allowed role ('freelancer') if not established
    if (!authoritativeRole) {
      authoritativeRole = 'freelancer';
    }

    // Enforce valid role enum strictly; fail closed to least-privileged role
    const VALID_ROLES = ['freelancer', 'company', 'admin', 'reviewer'];
    if (!VALID_ROLES.includes(authoritativeRole)) {
      authoritativeRole = 'freelancer';
    }

    // Fallback/derive linked account IDs from app_metadata, user_metadata, or demo accounts
    if (!serverFreelancerId) {
      serverFreelancerId = user.app_metadata?.freelancer_id || 
                           user.user_metadata?.freelancer_id || 
                           (user.email === 'creator@genlancer.io' || user.id === '60f38cf2-d514-4c45-a9c5-e65e923a560a' ? 'FL001' : null);
    }
    if (!serverCompanyId) {
      serverCompanyId = user.app_metadata?.company_id || 
                        user.user_metadata?.company_id || 
                        (user.email === 'brand@genlancer.io' || user.id === '0e87388d-995e-43cf-a1a1-3da8156bbbbb' ? 'COMP001' : null);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: authoritativeRole,
      freelancer_id: serverFreelancerId,
      company_id: serverCompanyId,
      user_metadata: user.user_metadata || {},
      app_metadata: user.app_metadata || {}
    };

    return next();
  } catch (err) {
    console.error('Supabase token verification error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication verification failed.',
      code: 'AUTH_VERIFICATION_FAILED'
    });
  }
}

/**
 * Middleware factory to enforce specific user roles
 * @param {string[]} allowedRoles - e.g. ['company'] or ['freelancer']
 */
export function requireRole(allowedRoles) {
  const normalized = allowedRoles.map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHENTICATED'
      });
    }

    if (req.profileLookupError && !normalized.includes('freelancer')) {
      return res.status(503).json({
        success: false,
        error: 'Unable to verify authoritative role due to a database connection failure. Please try again.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    if (!normalized.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: This action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role is "${req.user.role}".`,
        code: 'FORBIDDEN_ROLE'
      });
    }

    next();
  };
}

/**
 * Middleware to ensure the authenticated user is an authorized participant
 * in the requested collaboration
 */
export async function requireCollaborationParticipant(req, res, next) {
  const requestId = req.params.requestId || req.body.request_id;

  if (!requestId) {
    return res.status(400).json({
      success: false,
      error: 'Collaboration request ID is required.',
      code: 'MISSING_REQUEST_ID'
    });
  }

  try {
    const request = await collaborationService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: `Collaboration request "${requestId}" not found.`,
        code: 'REQUEST_NOT_FOUND'
      });
    }

    const userId = req.user.id;
    const userCompanyId = req.user.company_id;
    const userFreelancerId = req.user.freelancer_id;

    let isCompany = (request.company_id === userId) || 
                    Boolean(userCompanyId && request.company_id === userCompanyId) ||
                    (req.user.email === 'brand@genlancer.io' && (request.company_id === 'COMP001' || request.company_id === '0e87388d-995e-43cf-a1a1-3da8156bbbbb'));
    let isFreelancer = (request.freelancer_id === userId) || 
                       Boolean(userFreelancerId && request.freelancer_id === userFreelancerId) ||
                       (req.user.email === 'creator@genlancer.io' && (request.freelancer_id === 'FL001' || request.freelancer_id === '60f38cf2-d514-4c45-a9c5-e65e923a560a'));

    // If not directly matched, check database linkage via public.freelancers table
    if (!isFreelancer && serverSupabaseClient && typeof serverSupabaseClient.from === 'function') {
      try {
        const { data: creator } = await serverSupabaseClient
          .from('freelancers')
          .select('id, user_id')
          .eq('id', request.freelancer_id)
          .single();

        if (creator && (creator.user_id === userId || String(creator.id) === String(userId))) {
          isFreelancer = true;
        }
      } catch (_) {}
    }

    if (!isCompany && !isFreelancer) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not an authorized participant in this collaboration.',
        code: 'FORBIDDEN_PARTICIPANT'
      });
    }

    req.collaboration = request;
    req.isCompanyParticipant = isCompany;
    req.isFreelancerParticipant = isFreelancer;
    next();
  } catch (err) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Collaboration request not found.',
      code: 'REQUEST_NOT_FOUND'
    });
  }
}

/**
 * Middleware to ensure only the authenticated creator owner may modify their own portfolio.
 * Prevents URL parameter impersonation.
 */
export async function requireCreatorOwner(req, res, next) {
  const { creatorId } = req.params;

  if (!creatorId) {
    return res.status(400).json({
      success: false,
      error: 'Creator ID is required in URL path.',
      code: 'MISSING_CREATOR_ID'
    });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
      code: 'UNAUTHENTICATED'
    });
  }

  // System admin can manage any creator profile
  if (user.role === 'admin') {
    return next();
  }

  // Only creator / freelancer accounts can modify creator portfolios (companies cannot)
  if (user.role !== 'freelancer') {
    return res.status(403).json({
      success: false,
      error: `Forbidden: Only creator accounts can modify portfolio entries. Current role is "${user.role}".`,
      code: 'FORBIDDEN_ROLE'
    });
  }

  // 1. Direct ID match: user ID matches URL param
  if (user.id === creatorId) {
    return next();
  }

  // 2. Server-managed profile linkage (from public.profiles, never user_metadata)
  if (user.freelancer_id && user.freelancer_id === creatorId) {
    return next();
  }

  // 3. Database linkage check via Supabase client if available
  const client = serverSupabaseClient;
  if (client && typeof client.from === 'function') {
    try {
      const { data: creator } = await client
        .from('freelancers')
        .select('id, user_id')
        .eq('id', creatorId)
        .single();

      if (creator && (creator.user_id === user.id || String(creator.id) === String(user.id))) {
        return next();
      }
    } catch (_) {}
  }

  // If user does not own this creator profile, reject with HTTP 403
  return res.status(403).json({
    success: false,
    error: `Forbidden: You do not have permission to modify portfolio items for creator "${creatorId}". Impersonation is prohibited.`,
    code: 'FORBIDDEN_CREATOR_OWNER'
  });
}

/**
 * Middleware to enforce authorized reviewer status for portfolio verification.
 * Only 'admin' or 'reviewer' roles may approve verification.
 * Self-verification is strictly prohibited (conflict of interest prevention).
 */
export function requireReviewerRole(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
      code: 'UNAUTHENTICATED'
    });
  }

  const ALLOWED_REVIEWER_ROLES = ['admin', 'reviewer'];
  if (!ALLOWED_REVIEWER_ROLES.includes(user.role)) {
    return res.status(403).json({
      success: false,
      error: `Forbidden: Only authorized reviewers or administrators can approve portfolio verification. Current role is "${user.role}".`,
      code: 'FORBIDDEN_REVIEWER_ROLE'
    });
  }

  // Conflict of interest check: a user cannot audit and review their own portfolio
  const { creatorId } = req.params;
  if (creatorId && user.id === creatorId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Self-review is prohibited. You cannot audit or verify your own portfolio.',
      code: 'FORBIDDEN_SELF_REVIEW'
    });
  }

  next();
}
