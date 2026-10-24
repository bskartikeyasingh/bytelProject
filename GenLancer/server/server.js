import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

import { searchService } from './services/searchService.js';
import { scoringService } from './services/scoringService.js';
import { collaborationService, CollaborationStatus } from './services/collaborationService.js';
import { reportService } from './services/reportService.js';
import { creatorService, DatabaseError } from './services/creatorService.js';
import briefService from './services/briefService.js';
import { validateUrl } from './utils/urlValidator.js';
import { 
  authenticateToken, 
  requireRole, 
  requireCollaborationParticipant, 
  requireCreatorOwner,
  requireReviewerRole,
  validateProductionSecurityConfig,
  setAuthSupabaseClient 
} from './middleware/authMiddleware.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Safe Startup Environment Validation (Never log secrets or credentials)
function validateServerEnvironment() {
  // Fail-fast security validation in production
  if (isProduction) {
    validateProductionSecurityConfig(process.env);
  }

  const warnings = [];
  const errors = [];

  const port = Number(PORT);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(`Invalid PORT "${process.env.PORT}". Must be an integer between 1 and 65535.`);
  }

  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set. /api/generate-brief will use local structured fallback heuristics.');
  }

  const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const hasSupabaseKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
  const isDemo = process.env.DEMO_MODE === 'true';

  if (!hasSupabaseUrl || !hasSupabaseKey) {
    if (isDemo) {
      warnings.push('Supabase credentials missing, but DEMO_MODE=true is active. Serving mock unverified preview talent.');
    } else {
      warnings.push('Supabase credentials missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Database endpoints will return 503 unless DEMO_MODE=true.');
    }
  }

  if (isProduction && !process.env.ALLOWED_ORIGINS && !process.env.FRONTEND_URL) {
    warnings.push('ALLOWED_ORIGINS or FRONTEND_URL is not set in production. Please configure allowed origins.');
  }

  console.log('\n================ ENVIRONMENT AUDIT ================');
  console.log(`🌍 Environment:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port:            ${port}`);
  console.log(`⚡ Demo Mode:       ${isDemo ? 'ENABLED (demo fixtures active)' : 'DISABLED (authoritative DB required)'}`);
  console.log(`🤖 Gemini AI:       ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED (Heuristic fallback)'}`);
  console.log(`🗄️  Supabase DB:     ${(hasSupabaseUrl && hasSupabaseKey) ? 'CONFIGURED' : 'UNCONFIGURED'}`);

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`⚠️  Config Notice: ${w}`));
  }
  if (errors.length > 0) {
    errors.forEach(e => console.error(`❌ Config Error: ${e}`));
  }
  console.log('===================================================\n');
}

validateServerEnvironment();

// Initialize Supabase if valid environment variables are provided
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey && !supabaseKey.startsWith('AQ.')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    collaborationService.setSupabaseClient(supabase);
    creatorService.setSupabaseClient(supabase);
    setAuthSupabaseClient(supabase);
    console.log('✅ Supabase client initialized on server.');
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase on server:', err.message);
  }
}

// Configurable CORS Policy
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
const configuredOrigins = rawOrigins
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const allowedOrigins = configuredOrigins.length > 0 
  ? configuredOrigins 
  : (!isProduction ? defaultDevOrigins : []);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server health checks, curl, mobile clients, and same-origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Allow local development ports dynamically when not in production
    if (!isProduction && (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))) {
      return callback(null, true);
    }

    const errMessage = `CORS blocked: Origin "${origin}" is not permitted. Configure ALLOWED_ORIGINS to permit access.`;
    return callback(new Error(errMessage), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// Health check endpoints
const healthPayload = () => ({
  status: 'ok',
  service: 'GenLancer Backend Core & Proxy',
  timestamp: new Date().toISOString(),
  environment: {
    demo_mode: process.env.DEMO_MODE === 'true',
    database_configured: Boolean(supabase)
  },
  features: [
    'Gemini AI Brief Generation',
    'Structured Creator Search',
    'Explainable 7-Dimension Scoring',
    'Matching & Requirements Report Engine',
    '5-Stage Collaboration Lifecycle',
    'Audit Trail & Revision History Stream',
    'Scoped Messaging & Persistence',
    'Authoritative Supabase Integration'
  ]
});
app.get('/health', (req, res) => res.json(healthPayload()));
app.get('/api/health', (req, res) => res.json(healthPayload()));

// GET /api/health/db and /api/ready - Minimal, secure database readiness check
const dbReadinessHandler = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      status: 'unconfigured',
      ready: false,
      message: 'Supabase credentials are not configured on the server.',
      demo_mode: process.env.DEMO_MODE === 'true'
    });
  }

  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('freelancers')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      // Distinguish error categories securely without exposing internal secrets or credentials
      let errorCategory = 'database_query_error';
      let statusCode = 503;

      if (error.code === 'PGRST301' || error.message?.toLowerCase().includes('jwt') || error.message?.toLowerCase().includes('token')) {
        errorCategory = 'authentication_failure';
        statusCode = 401;
      } else if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) {
        errorCategory = 'permission_or_rls_denied';
        statusCode = 403;
      }

      return res.status(statusCode).json({
        status: errorCategory,
        ready: false,
        latency_ms: latencyMs,
        message: 'Database check failed.'
      });
    }

    return res.status(200).json({
      status: 'connected',
      ready: true,
      latency_ms: latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'network_or_service_failure',
      ready: false,
      message: 'Unable to reach database service.'
    });
  }
};
app.get('/api/health/db', dbReadinessHandler);
app.get('/api/ready', dbReadinessHandler);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'GenLancer Core Backend & AI Proxy is running.',
    endpoints: {
      health: 'GET /health',
      creators: 'GET /api/creators',
      search: 'POST /api/search',
      score: 'POST /api/score',
      reportGenerate: 'POST /api/report/generate',
      generateBrief: 'POST /api/generate-brief',
      collaboration: 'POST /api/collaboration',
      messages: 'POST /api/messages'
    }
  });
});

// GET /api/creators
app.get('/api/creators', async (req, res) => {
  try {
    const result = await creatorService.getCreators();
    res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'CREATOR_FETCH_FAILED'
    });
  }
});

// GET /api/creators/:creatorId
app.get('/api/creators/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const creator = await creatorService.getCreator(creatorId);
    res.status(200).json({
      success: true,
      creator
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'CREATOR_NOT_FOUND'
    });
  }
});

// GET /api/creators/:creatorId/portfolio
app.get('/api/creators/:creatorId/portfolio', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const creator = await creatorService.getCreator(creatorId);
    res.status(200).json({
      success: true,
      creator_id: creatorId,
      portfolio_items: creator.portfolio_items || []
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_FETCH_FAILED'
    });
  }
});

// POST /api/creators/:creatorId/portfolio - Add portfolio item (Authenticated Creator Owner only)
app.post('/api/creators/:creatorId/portfolio', authenticateToken, requireCreatorOwner, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const result = await creatorService.addPortfolioItem(creatorId, req.body);
    res.status(201).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_CREATE_FAILED'
    });
  }
});

// PUT /api/creators/:creatorId/portfolio/:itemId - Update portfolio item (Creator Owner only; strips unearned verification)
app.put('/api/creators/:creatorId/portfolio/:itemId', authenticateToken, requireCreatorOwner, async (req, res) => {
  try {
    const { creatorId, itemId } = req.params;
    
    // Prevent creators from self-verifying or approving their own audit via direct update
    if (req.user.role !== 'admin' && req.user.role !== 'reviewer') {
      delete req.body.verified;
      delete req.body.verification_status;
      delete req.body.verification_scope;
      delete req.body.review_notes;
    }

    const result = await creatorService.updatePortfolioItem(creatorId, itemId, req.body);
    res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_UPDATE_FAILED'
    });
  }
});

// DELETE /api/creators/:creatorId/portfolio/:itemId - Delete portfolio item (Creator Owner only)
app.delete('/api/creators/:creatorId/portfolio/:itemId', authenticateToken, requireCreatorOwner, async (req, res) => {
  try {
    const { creatorId, itemId } = req.params;
    const result = await creatorService.deletePortfolioItem(creatorId, itemId);
    res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_DELETE_FAILED'
    });
  }
});

// POST /api/creators/:creatorId/portfolio/:itemId/submit-review - Submit for review (Creator Owner only)
app.post('/api/creators/:creatorId/portfolio/:itemId/submit-review', authenticateToken, requireCreatorOwner, async (req, res) => {
  try {
    const { creatorId, itemId } = req.params;
    const result = await creatorService.submitPortfolioItemForReview(creatorId, itemId);
    res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_SUBMIT_REVIEW_FAILED'
    });
  }
});

// POST /api/creators/:creatorId/portfolio/:itemId/review - Audit / Review item (Authorized Reviewer/Admin only; no self-review)
app.post('/api/creators/:creatorId/portfolio/:itemId/review', authenticateToken, requireReviewerRole, async (req, res) => {
  try {
    const { creatorId, itemId } = req.params;
    const { decision, scope, reviewNotes } = req.body || {};
    const result = await creatorService.reviewPortfolioItem(creatorId, itemId, { decision, scope, reviewNotes });
    res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'PORTFOLIO_REVIEW_FAILED'
    });
  }
});

// POST /api/validate-url - Real-time URL validation endpoint
app.post('/api/validate-url', (req, res) => {
  const { url, requireMedia = false, allowEmpty = false } = req.body || {};
  const validation = validateUrl(url, { requireMedia, allowEmpty });
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      error: validation.error
    });
  }
  return res.status(200).json({
    success: true,
    valid: true,
    sanitized: validation.sanitized
  });
});


/**
 * POST /api/search
 * Natural-language requirement extraction & structured search
 */
app.post('/api/search', async (req, res) => {
  try {
    const result = await creatorService.getCreators();
    const searchResponse = searchService.search(result.creators, req.body);
    res.status(200).json({
      success: true,
      source: result.source,
      demo_mode: result.demo_mode,
      ...searchResponse
    });
  } catch (err) {
    console.error('Search error:', err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'SEARCH_FAILED'
    });
  }
});

/**
 * POST /api/score
 * Weighted 7-dimension explainable scoring adapted from reference scoring_service.py
 */
app.post('/api/score', async (req, res) => {
  try {
    const { search_results, search_request, brief, requirements, weights } = req.body;
    let searchRes = search_results;

    if (!searchRes) {
      const result = await creatorService.getCreators();
      const searchCriteria = search_request || brief || requirements || req.body;
      searchRes = searchService.search(result.creators, searchCriteria);
    }

    const scoringResponse = scoringService.scoreCandidates(searchRes, weights || {});
    res.status(200).json({ success: true, ...scoringResponse, search_results: searchRes });
  } catch (err) {
    console.error('Scoring error:', err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'SCORING_FAILED'
    });
  }
});

/**
 * POST /api/report/generate
 * Comprehensive Matching and Requirements Analysis Report adapted from reference report_service.py
 */
app.post('/api/report/generate', async (req, res) => {
  try {
    let { search_results, scoring_results, brief, search_request } = req.body;

    if ((!search_results || !scoring_results) && (brief || search_request)) {
      const result = await creatorService.getCreators();
      search_results = searchService.search(result.creators, brief || search_request);
      scoring_results = scoringService.scoreCandidates(search_results, req.body.weights || {});
    }

    if (!search_results || !search_results.search_id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search_results provided: search_results with search_id is required.'
      });
    }

    if (!scoring_results || !scoring_results.search_id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scoring_results provided: scoring_results with search_id is required.'
      });
    }

    if (search_results.search_id !== scoring_results.search_id) {
      return res.status(400).json({
        success: false,
        error: `Search ID mismatch: search_results (${search_results.search_id}) does not match scoring_results (${scoring_results.search_id}).`
      });
    }

    const report = reportService.generateReport(search_results, scoring_results);
    res.json({ success: true, report });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/report/:reportId - Retrieve generated report
app.get('/api/report/:reportId', (req, res) => {
  const report = reportService.getReport(req.params.reportId);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: `Report with ID "${req.params.reportId}" not found.`
    });
  }
  res.json({ success: true, report });
});

/**
 * Fallback brief generator when Gemini API is unconfigured or unavailable
 */
function generateStructuredBriefFallback(rawIdea, userMeta = {}) {
  return briefService.generateStructuredBriefFallback(rawIdea, userMeta);
}

/**
 * POST /api/generate-brief
 * Accepts raw campaign ideas and transforms them into a structured JSON brief
 * using Gemini, with semantic completeness scoring, clarification questions, and deterministic fallback.
 * Also supports targeted single-section regeneration.
 */
app.post('/api/generate-brief', async (req, res) => {
  try {
    const { idea, prompt, section, currentBrief, audience, tone, industry } = req.body;
    const rawIdea = idea || prompt || '';

    // Targeted single-section regeneration
    if (section && currentBrief) {
      const regenerated = await briefService.regenerateSection(section, currentBrief, rawIdea);
      return res.status(200).json({
        success: true,
        modelUsed: regenerated.model_used || 'section-regenerator',
        brief: regenerated,
        completeness_score: regenerated.completeness_score,
        completeness_breakdown: regenerated.completeness_breakdown,
        required_skills: regenerated.required_skills,
        tools: regenerated.tools,
        clarification_questions: regenerated.clarification_questions,
        missing_information: regenerated.missing_information,
        missing_fields: regenerated.missing_fields,
        field_sources: regenerated.field_sources,
        is_fallback: Boolean(regenerated.is_fallback),
        generation_method: regenerated.generation_method
      });
    }

    if (!rawIdea || typeof rawIdea !== 'string' || !rawIdea.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "idea" or "prompt" must be a non-empty string.'
      });
    }

    if (rawIdea.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Input idea is too short. Please provide at least 5 characters describing your campaign concept.'
      });
    }

    if (rawIdea.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Input exceeds maximum allowed length of 5000 characters.'
      });
    }

    const result = await briefService.generateBriefWithAI(rawIdea, { audience, tone, industry, ...req.body });

    return res.status(200).json({
      success: true,
      modelUsed: result.model_used || 'gemini-model',
      brief: result,
      completeness_score: result.completeness_score,
      completeness_breakdown: result.completeness_breakdown,
      required_skills: result.required_skills,
      tools: result.tools,
      clarification_questions: result.clarification_questions,
      missing_information: result.missing_information,
      missing_fields: result.missing_fields,
      field_sources: result.field_sources,
      is_fallback: Boolean(result.is_fallback),
      generation_method: result.generation_method
    });
  } catch (error) {
    console.error('Error generating brand brief:', error);
    const errorMessage = error?.message || 'Internal server error while communicating with Gemini API';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/brief/validate
 * Validates, checks completeness, and normalizes a brief into creator search parameters.
 */
app.post('/api/brief/validate', (req, res) => {
  try {
    const briefInput = req.body.brief || req.body;
    const result = briefService.validateAndNormalizeBrief(briefInput);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        errors: result.errors,
        warnings: result.warnings,
        completeness_score: result.completeness_score,
        missing_fields: result.missing_fields
      });
    }

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Error validating brief:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/auth/me - Verify session token and retrieve authenticated profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// POST /api/profiles (or /api/profiles/me) - Create/Initialize profile (Strictly enforces least-privileged role 'freelancer')
app.post(['/api/profiles', '/api/profiles/me'], authenticateToken, async (req, res) => {
  try {
    const { role, is_admin, company_id, freelancer_id, full_name, avatar_url } = req.body || {};

    if (role && role.toLowerCase() !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Public profile creation cannot assign privileged role "${role}". New profiles must default to "freelancer".`,
        code: 'ROLE_ESCALATION_FORBIDDEN'
      });
    }

    if (is_admin !== undefined && is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Self-promotion to admin is prohibited.',
        code: 'ADMIN_PROMOTION_FORBIDDEN'
      });
    }

    if (company_id !== undefined || freelancer_id !== undefined) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Assigning company_id or freelancer_id is restricted to administrators.',
        code: 'IDENTITY_SPOOFING_FORBIDDEN'
      });
    }

    const newProfile = {
      id: req.user.id,
      email: req.user.email,
      full_name: full_name || req.user.full_name || 'New Member',
      role: 'freelancer',
      company_id: null,
      freelancer_id: null,
      avatar_url: avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(201).json({ success: true, profile: data });
    }

    return res.status(201).json({
      success: true,
      profile: newProfile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profiles/me - Update profile fields (Strictly prevents role self-escalation)
app.put('/api/profiles/me', authenticateToken, async (req, res) => {
  try {
    const { role, is_admin, company_id, freelancer_id, ...allowedUpdates } = req.body || {};

    if (role && role.toLowerCase() !== req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Users are not permitted to change their own account role.',
        code: 'ROLE_ESCALATION_FORBIDDEN'
      });
    }

    if (is_admin !== undefined) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Self-promotion to admin is prohibited.',
        code: 'ADMIN_PROMOTION_FORBIDDEN'
      });
    }

    if (company_id !== undefined || freelancer_id !== undefined) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Modifying company_id or freelancer_id is restricted to administrators.',
        code: 'IDENTITY_SPOOFING_FORBIDDEN'
      });
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, profile: data });
    }

    return res.json({
      success: true,
      profile: {
        id: req.user.id,
        role: req.user.role,
        ...allowedUpdates
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= COLLABORATION LIFECYCLE ROUTES (PROTECTED) ================= //

// POST /api/collaboration (aliases: /request, /create) - Create request (Company only)
app.post(['/api/collaboration', '/api/collaboration/request', '/api/collaboration/create'], authenticateToken, requireRole(['company']), async (req, res) => {
  try {
    const { freelancer_id, project_brief } = req.body || {};

    // Validate required fields
    if (!freelancer_id || typeof freelancer_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Target freelancer_id is required.',
        code: 'MISSING_FREELANCER_ID'
      });
    }

    const brief = project_brief || {};
    const title = brief.title || brief.project_name || req.body.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Project title is required.',
        code: 'MISSING_TITLE'
      });
    }

    const description = brief.description || brief.brief || brief.objectives || req.body.description;
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Project brief and objectives are required.',
        code: 'MISSING_DESCRIPTION'
      });
    }

    const budget = brief.budget || req.body.budget;
    if (!budget) {
      return res.status(400).json({
        success: false,
        error: 'Proposed budget or rate is required.',
        code: 'MISSING_BUDGET'
      });
    }

    const deadline = brief.deadline || brief.timeline || req.body.deadline;
    if (!deadline) {
      return res.status(400).json({
        success: false,
        error: 'Proposed start date, deadline, or timeline is required.',
        code: 'MISSING_DEADLINE'
      });
    }

    // Authenticated user ID is authoritatively enforced as company_id (never trust spoofed company_id)
    const payload = {
      ...req.body,
      company_id: req.user.id,
      freelancer_id: freelancer_id.trim(),
      project_brief: {
        ...brief,
        title: title.trim(),
        description: description.trim(),
        brief: description.trim(),
        deliverables: brief.deliverables || req.body.deliverables || 'Standard deliverables as per agreement',
        budget: typeof budget === 'string' ? budget.trim() : `$${budget}`,
        deadline: typeof deadline === 'string' ? deadline.trim() : String(deadline)
      }
    };
    const request = await collaborationService.createRequest(payload);
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/collaboration - List requests for current authenticated user (role-based)
app.get('/api/collaboration', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'company') {
      const companyId = req.user.id;
      const altCompanyId = req.user.company_id || 'COMP001';
      const requests = await collaborationService.getRequestsByCompany(companyId, altCompanyId);
      return res.json({ success: true, count: requests.length, requests });
    } else if (req.user.role === 'freelancer') {
      const freelancerId = req.user.freelancer_id || 'FL001';
      const altFreelancerId = req.user.id;
      const requests = await collaborationService.getRequestsByFreelancer(freelancerId, altFreelancerId);
      return res.json({ success: true, count: requests.length, requests });
    } else {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Unsupported role for collaboration request listing.',
        code: 'FORBIDDEN_ROLE'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/collaboration/:requestId - Get request (Authorized participant only)
app.get('/api/collaboration/:requestId', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  res.json({ success: true, request: req.collaboration });
});

// GET /api/collaboration/company/:companyId - List by company (Company owner only)
app.get('/api/collaboration/company/:companyId', authenticateToken, requireRole(['company']), async (req, res) => {
  try {
    const isOwner = (req.user.id === req.params.companyId) || 
                    Boolean(req.user.company_id && req.user.company_id === req.params.companyId) ||
                    (req.user.email === 'brand@genlancer.io' && (req.params.companyId === 'COMP001' || req.params.companyId === '0e87388d-995e-43cf-a1a1-3da8156bbbbb'));
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only view collaborations for your own company account.',
        code: 'FORBIDDEN_RESOURCE'
      });
    }
    const requests = await collaborationService.getRequestsByCompany(req.params.companyId, req.user.id);
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/collaboration/freelancer/:freelancerId - List by freelancer (Freelancer owner only)
app.get('/api/collaboration/freelancer/:freelancerId', authenticateToken, requireRole(['freelancer']), async (req, res) => {
  try {
    let isOwner = (req.user.id === req.params.freelancerId) || 
                  Boolean(req.user.freelancer_id && req.user.freelancer_id === req.params.freelancerId) ||
                  (req.user.email === 'creator@genlancer.io' && (req.params.freelancerId === 'FL001' || req.params.freelancerId === '60f38cf2-d514-4c45-a9c5-e65e923a560a'));
    if (!isOwner && supabase) {
      try {
        const { data: creator } = await supabase
          .from('freelancers')
          .select('id, user_id')
          .eq('id', req.params.freelancerId)
          .single();
        if (creator && (creator.user_id === req.user.id || String(creator.id) === String(req.user.id))) {
          isOwner = true;
        }
      } catch (_) {}
    }

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only view collaborations for your own creator account.',
        code: 'FORBIDDEN_RESOURCE'
      });
    }
    const requests = await collaborationService.getRequestsByFreelancer(req.params.freelancerId, req.user.id);
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/accept - Accept request (Recipient Freelancer only)
app.post('/api/collaboration/:requestId/accept', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isFreelancerParticipant || req.user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the recipient freelancer can accept this collaboration request.',
        code: 'FORBIDDEN_RECIPIENT_ONLY'
      });
    }
    const request = await collaborationService.acceptRequest(req.params.requestId, 'freelancer', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/reject - Reject/Decline request (Recipient Freelancer only)
app.post('/api/collaboration/:requestId/reject', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isFreelancerParticipant || req.user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the recipient freelancer can reject this collaboration request.',
        code: 'FORBIDDEN_RECIPIENT_ONLY'
      });
    }
    const request = await collaborationService.rejectRequest(req.params.requestId, req.body.reason, 'freelancer', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/cancel - Cancel request (Company only, pending status only)
app.post('/api/collaboration/:requestId/cancel', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isCompanyParticipant || req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the issuing company can cancel this collaboration request.',
        code: 'FORBIDDEN_COMPANY_ONLY'
      });
    }
    const request = await collaborationService.cancelRequest(req.params.requestId, 'company', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/clarify - Request clarification (Freelancer only)
app.post('/api/collaboration/:requestId/clarify', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isFreelancerParticipant || req.user.role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the assigned freelancer can request brief clarification.',
        code: 'FORBIDDEN_FREELANCER_ONLY'
      });
    }
    const msg = req.body.message || req.body.question || req.body.questions;
    const request = await collaborationService.requestClarification(req.params.requestId, msg, 'freelancer', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/respond-clarify - Respond to clarification (Company only)
app.post('/api/collaboration/:requestId/respond-clarify', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isCompanyParticipant || req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the initiating company can respond to brief clarification.',
        code: 'FORBIDDEN_COMPANY_ONLY'
      });
    }
    const msg = req.body.message || req.body.response || req.body.answer;
    const request = await collaborationService.submitClarificationResponse(req.params.requestId, msg, 'company', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/update-brief - Revise brief (Company only)
app.post('/api/collaboration/:requestId/update-brief', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    if (!req.isCompanyParticipant || req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the initiating company can revise the project brief.',
        code: 'FORBIDDEN_COMPANY_ONLY'
      });
    }
    const newBrief = req.body.project_brief || req.body.brief || req.body;
    const request = await collaborationService.updateBrief(req.params.requestId, newBrief, 'company', req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/collaboration/:requestId/confirm - Mutual confirmation (Verified participant only)
app.post('/api/collaboration/:requestId/confirm', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    let actor;
    if (req.isCompanyParticipant && req.user.role === 'company') {
      actor = 'company';
    } else if (req.isFreelancerParticipant && req.user.role === 'freelancer') {
      actor = 'freelancer';
    } else {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You must be an authorized company or freelancer participant to confirm.',
        code: 'FORBIDDEN_CONFIRMATION'
      });
    }

    const request = await collaborationService.confirmBrief(req.params.requestId, actor, req.body.brief_version, req.user.id);
    res.json({ success: true, request });
  } catch (err) {
    const isAuth = err.message.includes('Unauthorized') || err.message.includes('Forbidden');
    res.status(isAuth ? 403 : 400).json({ success: false, error: err.message });
  }
});

// ================= MESSAGING ROUTES (PROTECTED) ================= //

// In-memory messages backup store
const inMemoryMessages = [];

// POST /api/messages - Send message with verified participant authorization
app.post('/api/messages', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    const content = req.body.content || req.body.message || req.body.text;
    const requestId = req.body.request_id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content must not be empty.' });
    }
    if (content.length > 4000) {
      return res.status(400).json({ success: false, error: 'Message exceeds maximum length of 4000 characters.' });
    }

    // Sender identity and role are strictly derived from verified token (never trust client payload)
    const senderId = req.user.id;
    const senderRole = req.user.role;

    const messageRecord = {
      message_id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      request_id: requestId.trim(),
      sender_id: senderId,
      sender_role: senderRole,
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    inMemoryMessages.push(messageRecord);

    let persisted = false;
    if (supabase) {
      try {
        const { error } = await supabase.from('messages').insert([messageRecord]);
        if (!error) persisted = true;
      } catch (err) {
        console.warn('Supabase message insert warning:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      persistence_mode: persisted ? 'database' : 'in_memory_transient',
      message: messageRecord,
      data: messageRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/messages/:requestId - Fetch messages for request (Participant only)
app.get('/api/messages/:requestId', authenticateToken, requireCollaborationParticipant, async (req, res) => {
  try {
    const { requestId } = req.params;

    let messages = inMemoryMessages.filter(m => m.request_id === requestId);
    let persisted = false;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('request_id', requestId)
          .order('timestamp', { ascending: true });

        if (!error && data && data.length > 0) {
          messages = data;
          persisted = true;
        }
      } catch (e) {
        // Fallback
      }
    }

    // Sort chronologically ascending
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      success: true,
      persistence_mode: persisted ? 'database' : 'in_memory_transient',
      count: messages.length,
      messages,
      data: messages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 GenLancer Backend & Proxy Server running on http://localhost:${PORT}`);
  console.log(`👉 Health Check:        GET  http://localhost:${PORT}/health`);
  console.log(`👉 Creator Directory:   GET  http://localhost:${PORT}/api/creators`);
  console.log(`👉 Structured Search:   POST http://localhost:${PORT}/api/search`);
  console.log(`👉 Explainable Scoring: POST http://localhost:${PORT}/api/score`);
  console.log(`👉 Matching Report:     POST http://localhost:${PORT}/api/report/generate`);
  console.log(`👉 Gemini Briefs:       POST http://localhost:${PORT}/api/generate-brief`);
  console.log(`👉 Collaboration Hub:   POST http://localhost:${PORT}/api/collaboration\n`);
});
