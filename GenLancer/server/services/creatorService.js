/**
 * Creator Data Access & Normalization Service
 * 
 * Enforces Supabase as the authoritative source of truth for creator profiles.
 * Distinguishes cleanly between:
 *  1. Database configured and records found (HTTP 200, source: 'database')
 *  2. Database configured but no records found (HTTP 200, source: 'database', count: 0, creators: [])
 *  3. Database connection or query failure (HTTP 503, source: 'error')
 *  4. Explicit demo mode (HTTP 200, source: 'demo', demo_mode: true, verified: false)
 * 
 * Includes Evidence-Based Portfolio Management & Verification Lifecycle:
 *  - Full CRUD for portfolio items (title, description, role, skills, tools, niche, outcome, media_url, project_url)
 *  - Strict URL and media validation
 *  - Verification state machine: 'not_verified' -> 'pending_review' -> 'verified' (with scope)
 */

import { DEFAULT_CREATORS } from '../data/defaultCreators.js';
import { validateUrl } from '../utils/urlValidator.js';

export class DatabaseError extends Error {
  constructor(message, statusCode = 503, code = 'DATABASE_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Safely parse array fields from Supabase (handles JSON arrays, Postgres text[] arrays, or comma-separated strings)
 */
function normalizeStringArray(val, defaultArr = []) {
  if (!val) return defaultArr;
  if (Array.isArray(val)) {
    return val.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(Boolean);
        }
      } catch (_) {}
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return defaultArr;
}

/**
 * Normalize a single creator record with strict type coercion and safety defaults
 */
export function normalizeCreator(raw, { isDemo = false } = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || raw.freelancer_id || `creator-${Math.random().toString(36).substring(2, 9)}`);
  const name = String(raw.name || raw.full_name || 'AI Creator');
  
  const specializations = normalizeStringArray(raw.specializations || raw.specialization);
  const skills = normalizeStringArray(raw.skills);
  const aiTools = normalizeStringArray(raw.ai_tools_models || raw.aiTools || raw.primaryTools);
  const visualStyles = normalizeStringArray(raw.visual_styles || raw.visualStyles);
  const contentTypes = normalizeStringArray(raw.content_types || raw.contentTypes, ['Video']);
  const outputFormats = normalizeStringArray(raw.output_formats || raw.outputFormats || raw.aspectRatios, ['16:9']);

  const title = String(raw.title || specializations[0] || 'Generative AI Creator');
  const avatar = raw.avatar_url || raw.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';
  const location = String(raw.location || 'Remote');

  let hourlyRateUsd = Number(raw.hourly_rate_usd);
  if (isNaN(hourlyRateUsd) || hourlyRateUsd <= 0) {
    if (typeof raw.hourlyRate === 'string') {
      const match = raw.hourlyRate.match(/\$?(\d+(?:\.\d+)?)/);
      hourlyRateUsd = match ? Number(match[1]) : 100;
    } else {
      hourlyRateUsd = 100;
    }
  }

  const rating = Number(raw.rating) || 4.9;
  const completedGigs = Number(raw.completed_gigs ?? raw.completedGigs ?? 0);
  const score = Number(raw.reputation_score ?? raw.ai_creator_score ?? raw.score ?? 90);

  // Normalize portfolio items
  let rawPortfolio = raw.portfolio_items || raw.portfolio;
  if (typeof rawPortfolio === 'string') {
    try {
      rawPortfolio = JSON.parse(rawPortfolio);
    } catch (_) {
      rawPortfolio = [];
    }
  }
  if (!Array.isArray(rawPortfolio)) rawPortfolio = [];

  const isDemoRecord = Boolean(isDemo || raw._is_demo_fixture || raw.is_demo);

  const portfolioItems = rawPortfolio.map((item, idx) => {
    const itemTools = normalizeStringArray(item.tools_used || item.tools || item.tool, [aiTools[0] || 'Runway Gen-3 Alpha']);
    const itemSkills = normalizeStringArray(item.skills_used || item.skills, skills);
    const itemNiche = String(item.niche || specializations[0] || 'AI Synthetic Media');
    const itemRole = String(item.creator_role || item.role || 'Generative AI Director & Artist');
    const itemOutcome = item.project_outcome || item.outcome || null;
    const itemProjectUrl = item.project_url || item.projectUrl || null;

    // Strict verification logic: Demo fixtures can NEVER be verified
    const isItemVerified = Boolean(!isDemoRecord && item.verified === true);
    let itemStatus = 'not_verified';
    if (isDemoRecord) {
      itemStatus = 'demo_unverified';
    } else if (isItemVerified) {
      itemStatus = 'verified';
    } else if (item.verification_status === 'pending_review' || item.status === 'pending_review') {
      itemStatus = 'pending_review';
    } else if (item.verification_status === 'not_verified') {
      itemStatus = 'not_verified';
    }

    return {
      id: String(item.id || `pf-${id}-${idx}`),
      title: String(item.title || `${name} Project ${idx + 1}`),
      description: String(item.description || ''),
      creator_role: itemRole,
      skills_used: itemSkills,
      tools_used: itemTools,
      content_type: String(item.content_type || item.contentType || contentTypes[0] || 'Video'),
      niche: itemNiche,
      project_url: itemProjectUrl,
      media_url: item.media_url || item.mediaUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
      project_outcome: itemOutcome,
      verification_status: itemStatus,
      verification_scope: isItemVerified ? (item.verification_scope || 'workflow') : null,
      tool: itemTools[0] || String(item.tool || aiTools[0] || 'Runway Gen-3 Alpha'),
      pipeline: String(item.pipeline || (itemTools.length > 0 ? itemTools.join(' ➔ ') : 'Direct Generation')),
      aspect_ratio: String(item.aspect_ratio || item.aspectRatio || outputFormats[0] || '16:9'),
      prompt: String(item.prompt || item.samplePrompt || ''),
      seed: String(item.seed || '482019482'),
      verified: isItemVerified,
      created_at: item.created_at || new Date().toISOString()
    };
  });

  // STRICT REQUIREMENT: Demo records are NEVER labeled as verified or real users
  const isVerified = Boolean(!isDemoRecord && (raw.verified === true || raw.is_verified === true));

  return {
    id,
    name,
    title,
    avatar,
    location,
    score,
    ai_creator_score: score,
    rating,
    completedGigs,
    hourly_rate_usd: hourlyRateUsd,
    hourlyRate: `$${hourlyRateUsd}/hr`,
    specializations,
    skills,
    ai_tools_models: aiTools,
    primaryTools: aiTools.length > 0 ? aiTools : ['Runway Gen-3 Alpha', 'Midjourney v6'],
    visual_styles: visualStyles,
    content_types: contentTypes,
    contentType: contentTypes[0] || 'Video',
    output_formats: outputFormats,
    aspectRatios: outputFormats,
    availability: String(raw.availability || 'Full-time'),
    commercial_use_licensing: String(raw.commercial_use_licensing || 'Full commercial rights included'),
    portfolio_items: portfolioItems,
    sampleMedia: portfolioItems[0]?.media_url || raw.sampleMedia || 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
    samplePrompt: portfolioItems[0]?.prompt || raw.samplePrompt || '',
    pipeline: portfolioItems[0]?.pipeline || raw.pipeline || (aiTools.length > 0 ? aiTools.join(' ➔ ') : 'Direct Generation'),
    seed: portfolioItems[0]?.seed || raw.seed || '482019482',
    verified: isVerified,
    is_demo: isDemoRecord,
    verification_status: isDemoRecord ? 'demo_unverified' : (isVerified ? 'verified_workflow' : 'pending_audit')
  };
}

class CreatorService {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient;
    // In-memory demo/offline cache for mutable demo operations
    this.demoCache = JSON.parse(JSON.stringify(DEFAULT_CREATORS));
  }

  setSupabaseClient(client) {
    this.supabase = client;
  }

  getSupabaseClient() {
    return this.supabase;
  }

  /**
   * Reset in-memory cache to default seeds (useful for test resets)
   */
  resetDemoCache() {
    this.demoCache = JSON.parse(JSON.stringify(DEFAULT_CREATORS));
  }

  /**
   * Authoritative Creator Retrieval Function
   */
  async getCreators({ forceDemo = false } = {}) {
    const isExplicitDemo = Boolean(forceDemo || process.env.DEMO_MODE === 'true');

    // 1. Explicit Demo Mode
    if (isExplicitDemo) {
      const demoList = this.demoCache
        .map(c => normalizeCreator(c, { isDemo: true }))
        .filter(Boolean);

      return {
        success: true,
        source: 'demo',
        demo_mode: true,
        count: demoList.length,
        creators: demoList,
        notice: 'DEMO MODE: Serving sample unverified preview fixtures. Configure Supabase and disable DEMO_MODE for live production.'
      };
    }

    // 2. Check if Supabase client is configured
    if (!this.supabase) {
      throw new DatabaseError(
        'Database connection is not configured on the server. Set DEMO_MODE=true to enable development preview mode, or provide valid SUPABASE_URL and SUPABASE_KEY.',
        503,
        'DATABASE_NOT_CONFIGURED'
      );
    }

    // 3. Query authoritative Supabase table
    try {
      let queryResult = await this.supabase
        .from('freelancers')
        .select('*')
        .order('created_at', { ascending: false });

      // Fallback gracefully if created_at column is not present in the database table
      if (queryResult.error && queryResult.error.message && queryResult.error.message.includes('created_at')) {
        console.warn('Notice: freelancers table schema does not include created_at column. Falling back to unordered query.');
        queryResult = await this.supabase
          .from('freelancers')
          .select('*');
      }

      const { data, error } = queryResult;

      if (error) {
        console.error('Supabase query error for freelancers table:', error.message);
        throw new DatabaseError(
          'Database query failed. The freelancers service is temporarily unavailable.',
          503,
          'DATABASE_QUERY_ERROR'
        );
      }

      // 4. Handle empty table distinctly
      if (!data || data.length === 0) {
        return {
          success: true,
          source: 'database',
          demo_mode: false,
          count: 0,
          creators: []
        };
      }

      // 5. Deduplicate and normalize live records
      const seenIds = new Set();
      const normalizedList = [];

      for (const row of data) {
        const normalized = normalizeCreator(row, { isDemo: false });
        if (normalized && !seenIds.has(normalized.id)) {
          seenIds.add(normalized.id);
          normalizedList.push(normalized);
        }
      }

      return {
        success: true,
        source: 'database',
        demo_mode: false,
        count: normalizedList.length,
        creators: normalizedList
      };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      console.error('Database connection exception:', err.message);
      throw new DatabaseError(
        'Database connection error. Unable to reach Supabase backend.',
        503,
        'DATABASE_CONNECTION_ERROR'
      );
    }
  }

  /**
   * Retrieve a single creator by ID
   */
  async getCreator(creatorId, { forceDemo = false } = {}) {
    const listRes = await this.getCreators({ forceDemo });
    const creator = listRes.creators.find(c => String(c.id) === String(creatorId));
    if (!creator) {
      throw new DatabaseError(`Creator with ID '${creatorId}' not found.`, 404, 'CREATOR_NOT_FOUND');
    }
    return creator;
  }

  async getCreatorById(creatorId, options = {}) {
    return this.getCreator(creatorId, options);
  }

  /**
   * Add a new evidence-based portfolio item to a creator
   */
  async addPortfolioItem(creatorId, itemData, { forceDemo = false } = {}) {
    // 1. Validate Required Fields
    if (!itemData || typeof itemData !== 'object') {
      throw new DatabaseError('Portfolio item payload must be a JSON object.', 400, 'INVALID_PAYLOAD');
    }

    const title = String(itemData.title || '').trim();
    if (!title || title.length < 3) {
      throw new DatabaseError('Project title is required and must be at least 3 characters.', 400, 'INVALID_TITLE');
    }

    // 2. Validate Media URL
    const mediaUrlCheck = validateUrl(itemData.media_url || itemData.mediaUrl, { requireMedia: true });
    if (!mediaUrlCheck.valid) {
      throw new DatabaseError(`Media URL validation error: ${mediaUrlCheck.error}`, 400, 'INVALID_MEDIA_URL');
    }

    // 3. Validate Optional Project URL
    let sanitizedProjectUrl = null;
    if (itemData.project_url || itemData.projectUrl) {
      const projUrlCheck = validateUrl(itemData.project_url || itemData.projectUrl, { allowEmpty: true });
      if (!projUrlCheck.valid) {
        throw new DatabaseError(`Project URL validation error: ${projUrlCheck.error}`, 400, 'INVALID_PROJECT_URL');
      }
      sanitizedProjectUrl = projUrlCheck.sanitized;
    }

    // 4. Construct Safe New Entry
    const newItemId = `pf-${creatorId}-${Date.now()}`;
    const toolsUsed = normalizeStringArray(itemData.tools_used || itemData.tool, ['Runway Gen-3 Alpha']);
    const skillsUsed = normalizeStringArray(itemData.skills_used || itemData.skills, ['Prompt Engineering']);

    const newEntry = {
      id: newItemId,
      title: title,
      description: String(itemData.description || '').trim(),
      creator_role: String(itemData.creator_role || itemData.role || 'Generative AI Artist').trim(),
      skills_used: skillsUsed,
      tools_used: toolsUsed,
      tool: toolsUsed[0] || 'Runway Gen-3 Alpha',
      content_type: String(itemData.content_type || itemData.contentType || 'Video'),
      niche: String(itemData.niche || 'AI Synthetic Media'),
      project_url: sanitizedProjectUrl,
      media_url: mediaUrlCheck.sanitized,
      project_outcome: itemData.project_outcome ? String(itemData.project_outcome).trim() : null,
      pipeline: String(itemData.pipeline || (toolsUsed.length > 0 ? toolsUsed.join(' ➔ ') : 'Direct Generation')),
      aspect_ratio: String(itemData.aspect_ratio || itemData.aspectRatio || '16:9'),
      prompt: String(itemData.prompt || '').trim(),
      seed: String(itemData.seed || Math.floor(100000000 + Math.random() * 900000000).toString()),
      // CRITICAL: Newly added items are NOT verified simply by uploading!
      verified: false,
      verification_status: 'not_verified',
      verification_scope: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 5. Persist to Supabase or In-Memory Demo Cache
    const isExplicitDemo = Boolean(forceDemo || process.env.DEMO_MODE === 'true');
    if (isExplicitDemo || !this.supabase) {
      const target = this.demoCache.find(c => c.id === creatorId);
      if (!target) {
        throw new DatabaseError(`Creator '${creatorId}' not found in demo fixtures.`, 404, 'CREATOR_NOT_FOUND');
      }
      if (!Array.isArray(target.portfolio_items)) target.portfolio_items = [];
      target.portfolio_items.unshift(newEntry);
      return { success: true, item: newEntry, creator_id: creatorId };
    }

    // Live Supabase update
    try {
      const { data: currentRows, error: fetchErr } = await this.supabase
        .from('freelancers')
        .select('portfolio_items')
        .eq('id', creatorId)
        .single();

      if (fetchErr || !currentRows) {
        throw new DatabaseError(`Unable to fetch creator '${creatorId}' for portfolio update.`, 404, 'CREATOR_NOT_FOUND');
      }

      let existingItems = currentRows.portfolio_items || [];
      if (typeof existingItems === 'string') {
        try { existingItems = JSON.parse(existingItems); } catch (_) { existingItems = []; }
      }
      if (!Array.isArray(existingItems)) existingItems = [];

      const updatedItems = [newEntry, ...existingItems];

      const { error: updateErr } = await this.supabase
        .from('freelancers')
        .update({ 
          portfolio_items: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', creatorId);

      if (updateErr) {
        throw new DatabaseError(`Failed to save portfolio item: ${updateErr.message}`, 500, 'DATABASE_UPDATE_ERROR');
      }

      return { success: true, item: newEntry, creator_id: creatorId };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError(err.message, 500, 'PORTFOLIO_INSERT_ERROR');
    }
  }

  /**
   * Update an existing portfolio entry
   */
  async updatePortfolioItem(creatorId, itemId, updateData, { forceDemo = false } = {}) {
    if (!updateData || typeof updateData !== 'object') {
      throw new DatabaseError('Update payload must be a JSON object.', 400, 'INVALID_PAYLOAD');
    }

    // Validate URLs if provided
    let sanitizedMediaUrl = null;
    if (updateData.media_url || updateData.mediaUrl) {
      const check = validateUrl(updateData.media_url || updateData.mediaUrl, { requireMedia: true });
      if (!check.valid) {
        throw new DatabaseError(`Media URL error: ${check.error}`, 400, 'INVALID_MEDIA_URL');
      }
      sanitizedMediaUrl = check.sanitized;
    }

    let sanitizedProjectUrl = null;
    if (updateData.project_url || updateData.projectUrl) {
      const check = validateUrl(updateData.project_url || updateData.projectUrl, { allowEmpty: true });
      if (!check.valid) {
        throw new DatabaseError(`Project URL error: ${check.error}`, 400, 'INVALID_PROJECT_URL');
      }
      sanitizedProjectUrl = check.sanitized;
    }

    const isExplicitDemo = Boolean(forceDemo || process.env.DEMO_MODE === 'true');

    const updateItemInArray = (items) => {
      const idx = items.findIndex(it => String(it.id) === String(itemId));
      if (idx === -1) {
        throw new DatabaseError(`Portfolio entry with ID '${itemId}' not found.`, 404, 'ITEM_NOT_FOUND');
      }

      const existing = items[idx];
      // If critical media or prompt modified, reset verification status
      const mediaChanged = sanitizedMediaUrl && sanitizedMediaUrl !== existing.media_url;
      const promptChanged = updateData.prompt && updateData.prompt !== existing.prompt;
      const mustResetAudit = mediaChanged || promptChanged;

      const updated = {
        ...existing,
        title: updateData.title ? String(updateData.title).trim() : existing.title,
        description: updateData.description !== undefined ? String(updateData.description).trim() : existing.description,
        creator_role: updateData.creator_role ? String(updateData.creator_role).trim() : existing.creator_role,
        skills_used: updateData.skills_used ? normalizeStringArray(updateData.skills_used) : existing.skills_used,
        tools_used: updateData.tools_used ? normalizeStringArray(updateData.tools_used) : existing.tools_used,
        content_type: updateData.content_type || existing.content_type,
        niche: updateData.niche || existing.niche,
        project_outcome: updateData.project_outcome !== undefined ? (updateData.project_outcome ? String(updateData.project_outcome).trim() : null) : existing.project_outcome,
        media_url: sanitizedMediaUrl || existing.media_url,
        project_url: sanitizedProjectUrl !== null ? sanitizedProjectUrl : existing.project_url,
        pipeline: updateData.pipeline || existing.pipeline,
        aspect_ratio: updateData.aspect_ratio || existing.aspect_ratio,
        prompt: updateData.prompt !== undefined ? String(updateData.prompt).trim() : existing.prompt,
        seed: updateData.seed !== undefined ? String(updateData.seed).trim() : existing.seed,
        verified: mustResetAudit ? false : (updateData.verified !== undefined ? Boolean(updateData.verified) : existing.verified),
        verification_status: mustResetAudit ? 'not_verified' : (updateData.verification_status || existing.verification_status || 'not_verified'),
        verification_scope: mustResetAudit ? null : (updateData.verification_scope !== undefined ? updateData.verification_scope : existing.verification_scope),
        updated_at: new Date().toISOString()
      };

      items[idx] = updated;
      return updated;
    };

    if (isExplicitDemo || !this.supabase) {
      const target = this.demoCache.find(c => c.id === creatorId);
      if (!target) {
        throw new DatabaseError(`Creator '${creatorId}' not found.`, 404, 'CREATOR_NOT_FOUND');
      }
      if (!Array.isArray(target.portfolio_items)) target.portfolio_items = [];
      const updated = updateItemInArray(target.portfolio_items);
      return { success: true, item: updated, creator_id: creatorId };
    }

    try {
      const { data: row, error: fetchErr } = await this.supabase
        .from('freelancers')
        .select('portfolio_items')
        .eq('id', creatorId)
        .single();

      if (fetchErr || !row) {
        throw new DatabaseError(`Creator '${creatorId}' not found.`, 404, 'CREATOR_NOT_FOUND');
      }

      let items = row.portfolio_items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const updated = updateItemInArray(items);

      const { error: saveErr } = await this.supabase
        .from('freelancers')
        .update({ portfolio_items: items, updated_at: new Date().toISOString() })
        .eq('id', creatorId);

      if (saveErr) {
        throw new DatabaseError(`Database error updating item: ${saveErr.message}`, 500, 'DATABASE_UPDATE_ERROR');
      }

      return { success: true, item: updated, creator_id: creatorId };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError(err.message, 500, 'PORTFOLIO_UPDATE_ERROR');
    }
  }

  /**
   * Delete a portfolio entry
   */
  async deletePortfolioItem(creatorId, itemId, { forceDemo = false } = {}) {
    const isExplicitDemo = Boolean(forceDemo || process.env.DEMO_MODE === 'true');

    const filterArray = (items) => {
      const initialLen = items.length;
      const filtered = items.filter(it => String(it.id) !== String(itemId));
      if (filtered.length === initialLen) {
        throw new DatabaseError(`Portfolio entry '${itemId}' not found.`, 404, 'ITEM_NOT_FOUND');
      }
      return filtered;
    };

    if (isExplicitDemo || !this.supabase) {
      const target = this.demoCache.find(c => c.id === creatorId);
      if (!target) {
        throw new DatabaseError(`Creator '${creatorId}' not found.`, 404, 'CREATOR_NOT_FOUND');
      }
      if (!Array.isArray(target.portfolio_items)) target.portfolio_items = [];
      target.portfolio_items = filterArray(target.portfolio_items);
      return { success: true, deleted_item_id: itemId, creator_id: creatorId };
    }

    try {
      const { data: row, error: fetchErr } = await this.supabase
        .from('freelancers')
        .select('portfolio_items')
        .eq('id', creatorId)
        .single();

      if (fetchErr || !row) {
        throw new DatabaseError(`Creator '${creatorId}' not found.`, 404, 'CREATOR_NOT_FOUND');
      }

      let items = row.portfolio_items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items)) items = [];

      const remaining = filterArray(items);

      const { error: saveErr } = await this.supabase
        .from('freelancers')
        .update({ portfolio_items: remaining, updated_at: new Date().toISOString() })
        .eq('id', creatorId);

      if (saveErr) {
        throw new DatabaseError(`Failed to delete item: ${saveErr.message}`, 500, 'DATABASE_DELETE_ERROR');
      }

      return { success: true, deleted_item_id: itemId, creator_id: creatorId };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError(err.message, 500, 'PORTFOLIO_DELETE_ERROR');
    }
  }

  /**
   * Submit a portfolio entry for audit review (transitions to 'pending_review')
   */
  async submitPortfolioItemForReview(creatorId, itemId, { forceDemo = false } = {}) {
    return this.updatePortfolioItem(creatorId, itemId, {
      verification_status: 'pending_review'
    }, { forceDemo });
  }

  /**
   * Review and audit a portfolio entry (transitions to 'verified' with scope, or rejected)
   */
  async reviewPortfolioItem(creatorId, itemId, { decision = 'approve', scope = 'workflow', reviewNotes = '' } = {}, { forceDemo = false } = {}) {
    const isApproved = decision === 'approve';
    const newStatus = isApproved ? 'verified' : 'not_verified';
    const newScope = isApproved ? (scope || 'workflow') : null;

    return this.updatePortfolioItem(creatorId, itemId, {
      verified: isApproved,
      verification_status: newStatus,
      verification_scope: newScope,
      review_notes: reviewNotes
    }, { forceDemo });
  }
}

export const creatorService = new CreatorService();
export default creatorService;
