import crypto from 'crypto';
import { DEFAULT_CREATORS } from '../data/defaultCreators.js';

/**
 * Search Service
 * Implements structured & NLP requirement parsing, eligibility constraints,
 * exclusions, and deterministic relevance matching adapted from the reference repository.
 */
class SearchService {
  /**
   * Extract structured requirements from natural language query and explicit filters
   * @param {string} query 
   * @param {Object} explicitFilters 
   * @returns {Object} ExtractedRequirements
   */
  extractRequirements(query = '', explicitFilters = {}) {
    const text = (query || '').toLowerCase();
    const explicitSkills = explicitFilters.skills || explicitFilters.required_skills || [];
    const explicitTools = explicitFilters.tools || explicitFilters.target_tools || explicitFilters.ai_tools_models || [];
    const explicitExcludedTools = explicitFilters.excluded_tools || explicitFilters.excludedTools || [];
    const explicitExcludedSkills = explicitFilters.excluded_skills || explicitFilters.excludedSkills || [];
    const explicitBudget = explicitFilters.maxBudget ?? explicitFilters.max_budget ?? explicitFilters.budget ?? null;

    const reqs = {
      required_skills: Array.isArray(explicitSkills) ? [...explicitSkills] : [explicitSkills].filter(Boolean),
      specialization: explicitFilters.specialization || explicitFilters.specializations?.[0] || null,
      ai_tools_models: Array.isArray(explicitTools) ? [...explicitTools] : [explicitTools].filter(Boolean),
      excluded_tools: Array.isArray(explicitExcludedTools) ? [...explicitExcludedTools] : [explicitExcludedTools].filter(Boolean),
      excluded_skills: Array.isArray(explicitExcludedSkills) ? [...explicitExcludedSkills] : [explicitExcludedSkills].filter(Boolean),
      content_type: explicitFilters.contentType || explicitFilters.content_type || null,
      visual_style: explicitFilters.visualStyle || explicitFilters.visual_style || null,
      output_format: explicitFilters.aspectRatio || explicitFilters.outputFormat || explicitFilters.output_format || null,
      max_budget: explicitBudget !== null && explicitBudget !== undefined ? Number(explicitBudget) : null,
      availability_requirement: explicitFilters.availability || explicitFilters.availability_requirement || null,
      commercial_use_required: Boolean(explicitFilters.commercialUseRequired || explicitFilters.commercial_use_required),
      mandatory_conditions: Array.isArray(explicitFilters.mandatory_conditions) ? [...explicitFilters.mandatory_conditions] : [],
      extraction_method: query ? 'rule_based_nlp_v1' : 'explicit_filters'
    };
    reqs.tools = reqs.ai_tools_models;

    if (!text.trim()) return reqs;

    // 1. Budget extraction ($150, $150/hr, budget 2000, 150/hr)
    const budgetMatch = text.match(/\$?(\d+)\s*(?:k\b|k\/hr|\/hr|per hour|budget)?/i);
    if (budgetMatch && reqs.max_budget === null) {
      let val = parseInt(budgetMatch[1], 10);
      if (/k/i.test(budgetMatch[0])) val *= 1000;
      if (val > 0) reqs.max_budget = val;
    }

    // 2. Known AI Tools
    const knownTools = [
      'runway gen-3 alpha', 'runway gen-3', 'runway', 'midjourney v6', 'midjourney',
      'flux.1 dev', 'flux', 'comfyui', 'sdxl', 'stable diffusion', 'kling ai 1.5',
      'kling', 'luma dream machine', 'luma', 'sora', 'topaz 4k', 'topaz', 'blender', 'pika'
    ];
    for (const tool of knownTools) {
      // Check negative exclusion pattern (e.g., "no blender", "without after effects", "exclude sora")
      const excludeRegex = new RegExp(`(?:no|without|exclude|avoid)\\s+${tool}`, 'i');
      if (excludeRegex.test(text)) {
        const canonical = tool.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!reqs.excluded_tools.includes(canonical)) reqs.excluded_tools.push(canonical);
      } else if (text.includes(tool)) {
        const canonical = tool.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!reqs.ai_tools_models.some(t => t.toLowerCase() === tool)) {
          reqs.ai_tools_models.push(canonical);
        }
      }
    }

    // 3. Known Skills
    const knownSkills = [
      'cinematography', 'prompt engineering', 'fluid sim', 'lora training',
      'controlnet depth', 'blender integration', 'camera projections', 'vfx motion',
      'art direction', 'video editing', '3d modeling', 'color grading'
    ];
    for (const skill of knownSkills) {
      const excludeRegex = new RegExp(`(?:no|without|exclude)\\s+${skill}`, 'i');
      if (excludeRegex.test(text)) {
        const canonical = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!reqs.excluded_skills.includes(canonical)) reqs.excluded_skills.push(canonical);
      } else if (text.includes(skill)) {
        const canonical = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!reqs.required_skills.some(s => s.toLowerCase() === skill)) {
          reqs.required_skills.push(canonical);
        }
      }
    }

    // 4. Content Type
    if (/video|film|commercial|motion|animation|reel/i.test(text) && !reqs.content_type) {
      reqs.content_type = 'Video';
    } else if (/static|graphic|poster|image|stills|concept art/i.test(text) && !reqs.content_type) {
      reqs.content_type = 'Static Graphics';
    }

    // 5. Visual Styles
    const knownStyles = ['cyberpunk', 'cinematic', 'minimalist', 'photorealistic', 'anime', 'surrealism', 'luxury'];
    for (const style of knownStyles) {
      if (text.includes(style) && !reqs.visual_style) {
        reqs.visual_style = style.charAt(0).toUpperCase() + style.slice(1);
        break;
      }
    }

    // 6. Output Format / Aspect Ratio
    const aspectMatch = text.match(/\b(16:9|9:16|1:1|4:5)\b/);
    if (aspectMatch && !reqs.output_format) {
      reqs.output_format = aspectMatch[1];
    }

    // 7. Commercial rights requirement
    if (/commercial|enterprise|rights|ownership|monetiz/i.test(text)) {
      reqs.commercial_use_required = true;
    }

    // 8. Availability
    if (/full-time|full time/i.test(text) && !reqs.availability_requirement) {
      reqs.availability_requirement = 'Full-time';
    } else if (/part-time|part time/i.test(text) && !reqs.availability_requirement) {
      reqs.availability_requirement = 'Part-time';
    }

    return reqs;
  }

  /**
   * Search creators against extracted requirements and evaluate eligibility
   * @param {Array} creators 
   * @param {Object} requirements 
   * @returns {Object} SearchResponse
   */
  search(creators = [], requirements = {}) {
    const dataset = (creators && creators.length > 0) ? creators : DEFAULT_CREATORS;
    const reqs = this.extractRequirements(requirements.query, requirements);
    const results = [];

    for (const creator of dataset) {
      const skills = creator.skills || [];
      const tools = creator.ai_tools_models || creator.primaryTools || [];
      const specializations = creator.specializations || [creator.specialization || 'AI Creator'];
      const contentTypes = creator.content_types || [creator.contentType || 'Video'];
      const visualStyles = creator.visual_styles || [];
      const formats = creator.output_formats || creator.aspectRatios || ['16:9'];
      const hourlyRate = creator.hourly_rate_usd || (creator.hourlyRate ? parseInt(String(creator.hourlyRate).replace(/\D/g, ''), 10) : 100);

      // Check Skills
      const matchedSkills = [];
      const missingSkills = [];
      for (const reqSkill of reqs.required_skills) {
        const found = skills.some(s => s.toLowerCase().includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(s.toLowerCase()));
        if (found) matchedSkills.push(reqSkill);
        else missingSkills.push(reqSkill);
      }

      // Check Tools
      const matchedTools = [];
      for (const reqTool of reqs.ai_tools_models) {
        const found = tools.some(t => t.toLowerCase().includes(reqTool.toLowerCase()) || reqTool.toLowerCase().includes(t.toLowerCase()));
        if (found) matchedTools.push(reqTool);
      }

      // Check Specialization
      let matchedSpecialization = false;
      if (reqs.specialization) {
        matchedSpecialization = specializations.some(s => s.toLowerCase().includes(reqs.specialization.toLowerCase()));
      }

      // Check Portfolio Relevance
      const portfolio = creator.portfolio_items || creator.portfolio || [];
      const relevantPortfolio = portfolio.filter(item => {
        if (!item) return false;
        const itemText = `${item.title || ''} ${item.description || ''} ${item.content_type || ''}`.toLowerCase();
        if (reqs.content_type && itemText.includes(reqs.content_type.toLowerCase())) return true;
        if (reqs.specialization && itemText.includes(reqs.specialization.toLowerCase())) return true;
        if (reqs.required_skills.some(s => itemText.includes(s.toLowerCase()))) return true;
        return !reqs.content_type && !reqs.specialization && reqs.required_skills.length === 0;
      });

      // Track Requirement Matches & Gaps
      const matchedRequirements = [];
      const missingRequirements = [];
      const unverifiedClaims = [];

      // Skills requirement
      if (reqs.required_skills.length > 0) {
        if (missingSkills.length === 0) matchedRequirements.push(`All ${matchedSkills.length} skills matched`);
        else if (matchedSkills.length > 0) {
          matchedRequirements.push(`Partial skills matched: ${matchedSkills.join(', ')}`);
          missingRequirements.push(`Missing skills: ${missingSkills.join(', ')}`);
        } else {
          missingRequirements.push(`Missing all requested skills (${reqs.required_skills.join(', ')})`);
        }
      }

      // Tools requirement
      if (reqs.ai_tools_models.length > 0) {
        if (matchedTools.length === reqs.ai_tools_models.length) {
          matchedRequirements.push(`Requested AI tools verified: ${matchedTools.join(', ')}`);
        } else if (matchedTools.length > 0) {
          matchedRequirements.push(`Tools matched: ${matchedTools.join(', ')}`);
          const missing = reqs.ai_tools_models.filter(t => !matchedTools.includes(t));
          missingRequirements.push(`Lacks tools: ${missing.join(', ')}`);
        } else {
          missingRequirements.push(`Lacks requested AI toolchains (${reqs.ai_tools_models.join(', ')})`);
        }
      }

      // Content type & format
      if (reqs.content_type) {
        if (contentTypes.some(ct => ct.toLowerCase().includes(reqs.content_type.toLowerCase()))) {
          matchedRequirements.push(`Content type supported: ${reqs.content_type}`);
        } else {
          missingRequirements.push(`Lacks native support for content type: ${reqs.content_type}`);
        }
      }
      if (reqs.output_format) {
        if (formats.some(f => f.includes(reqs.output_format))) {
          matchedRequirements.push(`Aspect ratio supported: ${reqs.output_format}`);
        } else {
          missingRequirements.push(`Aspect ratio not explicitly verified: ${reqs.output_format}`);
        }
      }

      // Determine Eligibility Constraints
      let eligibilityStatus = 'Eligible';
      const reasons = [];
      const unknownConstraints = [];

      // Excluded tools constraint (word-boundary precision)
      if (Array.isArray(reqs.excluded_tools) && reqs.excluded_tools.length > 0) {
        const foundExcludedTool = reqs.excluded_tools.find(et => {
          const etNorm = et.trim().toLowerCase();
          return tools.some(t => {
            const tNorm = t.toLowerCase();
            return tNorm === etNorm || new RegExp(`\\b${etNorm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(tNorm);
          });
        });
        if (foundExcludedTool) {
          eligibilityStatus = 'Ineligible';
          reasons.push(`Uses excluded toolchain: ${foundExcludedTool}`);
        }
      }

      // Excluded skills constraint (word-boundary precision)
      if (Array.isArray(reqs.excluded_skills) && reqs.excluded_skills.length > 0) {
        const foundExcludedSkill = reqs.excluded_skills.find(es => {
          const esNorm = es.trim().toLowerCase();
          return skills.some(s => {
            const sNorm = s.toLowerCase();
            return sNorm === esNorm || new RegExp(`\\b${esNorm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(sNorm);
          });
        });
        if (foundExcludedSkill) {
          eligibilityStatus = 'Ineligible';
          reasons.push(`Possesses excluded capability: ${foundExcludedSkill}`);
        }
      }

      // Licensing constraint
      if (reqs.commercial_use_required) {
        const licensing = (creator.commercial_use_licensing || '').toLowerCase();
        if (licensing.includes('internal')) {
          eligibilityStatus = 'Ineligible';
          reasons.push(`Licensing constraint: ${creator.commercial_use_licensing}`);
        } else if (licensing.includes('attribution')) {
          eligibilityStatus = 'Requires Verification';
          unknownConstraints.push(`Attribution required: ${creator.commercial_use_licensing}`);
          unverifiedClaims.push('Attribution license requires legal verification before commercial release.');
        } else if (!licensing || licensing.includes('unknown') || licensing === 'n/a') {
          eligibilityStatus = 'Requires Verification';
          unknownConstraints.push('Commercial rights status is unverified.');
          unverifiedClaims.push('Commercial licensing status unconfirmed in public creator profile.');
        } else {
          matchedRequirements.push('Commercial-use rights verified');
        }
      }

      // Budget constraint
      if (reqs.max_budget !== null && !isNaN(reqs.max_budget)) {
        if (hourlyRate > reqs.max_budget) {
          eligibilityStatus = 'Ineligible';
          reasons.push(`Hourly rate ($${hourlyRate}/hr) exceeds maximum budget ($${reqs.max_budget}/hr).`);
        } else {
          matchedRequirements.push(`Rate ($${hourlyRate}/hr) fits within budget limit ($${reqs.max_budget}/hr)`);
        }
      }

      // Availability constraint
      if (reqs.availability_requirement) {
        const avail = (creator.availability || '').toLowerCase();
        if (avail === 'unavailable') {
          eligibilityStatus = 'Ineligible';
          reasons.push('Creator is currently marked unavailable.');
        } else if (!avail.includes(reqs.availability_requirement.toLowerCase())) {
          eligibilityStatus = 'Requires Verification';
          unknownConstraints.push(`Listed availability is ${creator.availability || 'Unspecified'}, requested ${reqs.availability_requirement}.`);
          unverifiedClaims.push(`Availability commitment: Listed as ${creator.availability || 'Open'}, requested ${reqs.availability_requirement}.`);
        } else {
          matchedRequirements.push(`Availability verified: ${creator.availability}`);
        }
      }

      // Exact match calculation
      const isExactMatch = Boolean(
        eligibilityStatus === 'Eligible' &&
        missingRequirements.length === 0 &&
        unverifiedClaims.length === 0 &&
        (reqs.required_skills.length === 0 || matchedSkills.length === reqs.required_skills.length) &&
        (reqs.ai_tools_models.length === 0 || matchedTools.length === reqs.ai_tools_models.length)
      );

      const isPartialMatch = Boolean(
        !isExactMatch &&
        (matchedSkills.length > 0 || matchedTools.length > 0 || matchedSpecialization || relevantPortfolio.length > 0)
      );

      // Determine Relevance
      const hasSpecificReqs = Boolean(
        reqs.required_skills.length > 0 || 
        reqs.ai_tools_models.length > 0 || 
        reqs.content_type || 
        reqs.specialization ||
        reqs.visual_style
      );

      let isRelevant = false;
      if (!hasSpecificReqs) {
        isRelevant = true;
      } else {
        if (matchedSkills.length > 0 || matchedTools.length > 0 || matchedSpecialization) {
          isRelevant = true;
        } else if (reqs.content_type && contentTypes.some(ct => ct.toLowerCase().includes(reqs.content_type.toLowerCase()))) {
          isRelevant = true;
        } else if (reqs.visual_style && visualStyles.some(vs => vs.toLowerCase().includes(reqs.visual_style.toLowerCase()))) {
          isRelevant = true;
        }
      }

      if (isRelevant) {
        let explanation = `Matched ${matchedSkills.length} of ${reqs.required_skills.length || 'any'} skills and ${matchedTools.length} tools.`;
        if (eligibilityStatus === 'Ineligible') {
          explanation += ' (Excluded due to mandatory constraints).';
        } else if (eligibilityStatus === 'Requires Verification') {
          explanation += ' (Requires constraint verification).';
        }

        results.push({
          creator,
          freelancer_id: creator.id,
          matched_skills: matchedSkills,
          matched_tools: matchedTools,
          missing_capabilities: missingSkills,
          matched_requirements: matchedRequirements,
          missing_requirements: missingRequirements,
          unverified_claims: unverifiedClaims,
          is_exact_match: isExactMatch,
          is_partial_match: isPartialMatch,
          relevant_portfolio_items: relevantPortfolio,
          eligibility: {
            status: eligibilityStatus,
            reasons,
            unknown_constraints: unknownConstraints
          },
          relevance_explanation: explanation
        });
      }
    }

    // Deterministic sorting: Eligible first, then Requires Verification, then Ineligible
    results.sort((a, b) => {
      const statusOrder = { 'Eligible': 0, 'Requires Verification': 1, 'Ineligible': 2 };
      const diff = (statusOrder[a.eligibility.status] ?? 3) - (statusOrder[b.eligibility.status] ?? 3);
      if (diff !== 0) return diff;
      if (b.matched_skills.length !== a.matched_skills.length) {
        return b.matched_skills.length - a.matched_skills.length;
      }
      return String(a.freelancer_id).localeCompare(String(b.freelancer_id));
    });

    // Actionable constraint relaxation suggestions when results are empty or constrained
    const relaxationSuggestions = [];
    const eligibleResults = results.filter(r => r.eligibility?.status === 'Eligible');
    if (eligibleResults.length === 0) {
      if (reqs.excluded_tools.length > 0) {
        relaxationSuggestions.push({
          type: 'excluded_tools',
          suggestion: `Remove tool exclusion: ${reqs.excluded_tools.join(', ')}`,
          action: 'clear_excluded_tools'
        });
      }
      if (reqs.excluded_skills.length > 0) {
        relaxationSuggestions.push({
          type: 'excluded_skills',
          suggestion: `Remove skill exclusion: ${reqs.excluded_skills.join(', ')}`,
          action: 'clear_excluded_skills'
        });
      }
      if (reqs.max_budget !== null && !isNaN(reqs.max_budget)) {
        relaxationSuggestions.push({
          type: 'budget',
          suggestion: `Increase maximum budget rate above $${reqs.max_budget}/hr`,
          action: 'relax_budget'
        });
      }
      if (reqs.required_skills.length > 1) {
        relaxationSuggestions.push({
          type: 'skills',
          suggestion: `Filter by single primary skill (${reqs.required_skills[0]}) instead of all ${reqs.required_skills.length}`,
          action: 'relax_skills'
        });
      }
      if (reqs.ai_tools_models.length > 1) {
        relaxationSuggestions.push({
          type: 'tools',
          suggestion: 'Allow creators with any compatible generative AI model pipeline',
          action: 'relax_tools'
        });
      }
    }

    return {
      search_id: crypto.randomUUID ? crypto.randomUUID() : `search-${Date.now()}`,
      original_query: requirements.query || '',
      search_method: (requirements.query && String(requirements.query).trim()) ? 'nlp_and_structured' : 'structured_query',
      parsed_requirements: reqs,
      normalized_requirements: reqs,
      total_results: results.length,
      relaxation_suggestions: relaxationSuggestions,
      results
    };
  }
}

export const searchService = new SearchService();
export default searchService;
