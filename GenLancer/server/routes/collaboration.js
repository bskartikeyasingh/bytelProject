import express from 'express';
import { verifyAuth, authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/authMiddleware.js';
import { supabase } from '../config/supabase.js';
import { collaborationService } from '../services/collaborationService.js';

const router = express.Router();

/**
 * POST /api/collaboration (and /request) - Create a collaboration request
 * Protected: Company/Brand role only, authoritatively enforced company_id
 */
router.post(['/', '/request', '/create'], authenticateToken, requireRole(['company']), async (req, res) => {
  try {
    const { freelancer_id, project_brief } = req.body || {};

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

    const description = brief.description || brief.brief || brief.objectives || req.body.description || 'Collaboration brief deliverables';
    const budget = brief.budget || req.body.budget || '$2,500';
    const deadline = brief.deadline || brief.timeline || req.body.deadline || 'Flexible';

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

/**
 * GET /api/collaboration
 * Protected using verifyAuth middleware.
 * Returns collaboration data for authenticated user (supporting both Supabase and demo resilience).
 */
router.get('/', verifyAuth, async (req, res) => {
  // Now req.user is guaranteed to be set correctly, even in demo mode!
  try {
    let collaborations = [];

    // Query collaboration data based on req.user.id from Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('collaborations')
          .select('*')
          .or(`creator_id.eq.${req.user.id},company_id.eq.${req.user.id}`);

        if (!error && Array.isArray(data)) {
          collaborations = data;
        } else if (error) {
          // If table uses freelancer_id column instead of creator_id
          const { data: altData, error: altError } = await supabase
            .from('collaborations')
            .select('*')
            .or(`freelancer_id.eq.${req.user.id},company_id.eq.${req.user.id}`);
          if (!altError && Array.isArray(altData)) {
            collaborations = altData;
          }
        }
      } catch (sbErr) {
        console.warn('Supabase collaborations query notice:', sbErr.message);
      }
    }

    // Fallback to collaborationService backing store if empty
    if (collaborations.length === 0 && collaborationService) {
      try {
        const role = (req.user.role === 'company' || req.user.role === 'brand') ? 'company' : 'freelancer';
        if (role === 'company') {
          const companyId = req.user.id;
          const altCompanyId = req.user.company_id || 'COMP001';
          collaborations = await collaborationService.getRequestsByCompany(companyId, altCompanyId);
        } else {
          const freelancerId = req.user.freelancer_id || req.user.id || 'FL001';
          collaborations = await collaborationService.getRequestsByFreelancer(freelancerId, req.user.id);
        }
      } catch (_) {}
    }

    // Return both 'collaborations' and 'requests' keys for backward & forward compatibility
    res.json({ 
      success: true, 
      collaborations: collaborations || [],
      requests: collaborations || [],
      count: (collaborations || []).length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
