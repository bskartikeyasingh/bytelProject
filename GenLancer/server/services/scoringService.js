/**
 * Explainable AI Scoring Service
 * Faithfully adapts scoring_service.py from the reference repository into Node.js.
 * Implements configurable weights across 7 dimensions, strict normalization,
 * deterministic tie-breaking, and explicit dimensional strengths/gaps breakdowns.
 */
class ScoringService {
  constructor(customWeights = {}) {
    this.defaultWeights = {
      skills: 25,
      specialization: 20,
      portfolio_relevance: 20,
      content_type: 10,
      tools: 10,
      style_and_format: 10,
      experience: 5
    };
    this.weights = { ...this.defaultWeights, ...customWeights };
  }

  /**
   * Score candidates using extracted search requirements
   * @param {Object} searchResults - SearchResponse from searchService
   * @param {Object} customWeights - Optional runtime overrides for dimensional weights
   * @returns {Object} ScoringResponse
   */
  scoreCandidates(searchResults, customWeights = {}) {
    const weights = { ...this.weights, ...customWeights };
    const reqs = searchResults?.parsed_requirements || {};
    const results = searchResults?.results || [];

    const eligible = [];
    const verification = [];
    const ineligible = [];

    for (const candidate of results) {
      const scored = this._scoreSingleCandidate(candidate, reqs, weights);
      if (candidate.eligibility?.status === 'Ineligible') {
        ineligible.push(scored);
      } else if (candidate.eligibility?.status === 'Requires Verification') {
        verification.push(scored);
      } else {
        eligible.push(scored);
      }
    }

    // Deterministic sorting: overall_score DESC, then freelancer_id ASC
    const sorter = (a, b) => {
      if (b.overall_score !== a.overall_score) {
        return b.overall_score - a.overall_score;
      }
      return String(a.freelancer_id).localeCompare(String(b.freelancer_id));
    };

    eligible.sort(sorter);
    verification.sort(sorter);
    ineligible.sort(sorter);

    return {
      search_id: searchResults?.search_id || `score-${Date.now()}`,
      scoring_method: 'weighted_matching_v1',
      weights_applied: weights,
      results: eligible,
      candidates_requiring_verification: verification,
      ineligible_candidates: ineligible,
      ranked_candidates: [...eligible, ...verification, ...ineligible]
    };
  }

  _scoreSingleCandidate(candidate, reqs, weights) {
    const creator = candidate.creator || candidate.profile || {};
    const dimScores = {
      skills: 0,
      specialization: 0,
      portfolio_relevance: 0,
      content_type: 0,
      tools: 0,
      style_and_format: 0,
      experience: 0
    };
    const applicableWeights = {};
    const strengths = [];
    const gaps = [];

    // 1. Skills Dimension (25%)
    const requiredSkills = reqs.required_skills || [];
    if (requiredSkills.length > 0) {
      const matchedLen = candidate.matched_skills ? candidate.matched_skills.length : 0;
      const reqLen = requiredSkills.length;
      dimScores.skills = Math.round((matchedLen / reqLen) * 100);
      applicableWeights.skills = weights.skills;

      if (dimScores.skills === 100) {
        strengths.push('Perfect skill match across all required capabilities');
      } else if (dimScores.skills > 0) {
        strengths.push(`Matches ${matchedLen} of ${reqLen} required skills (${dimScores.skills}%)`);
      }
      if (candidate.missing_capabilities && candidate.missing_capabilities.length > 0) {
        gaps.push(`Missing skills: ${candidate.missing_capabilities.join(', ')}`);
      }
    }

    // 2. Specialization Dimension (20%)
    if (reqs.specialization) {
      const specializations = creator.specializations || [creator.specialization || ''];
      const matched = specializations.some(s => s.toLowerCase().includes(reqs.specialization.toLowerCase()));
      dimScores.specialization = matched ? 100 : 0;
      applicableWeights.specialization = weights.specialization;

      if (matched) {
        strengths.push(`Matches primary specialization: ${reqs.specialization}`);
      } else {
        gaps.push(`Lacks targeted specialization: ${reqs.specialization}`);
      }
    }

    // 3. Content Type Dimension (10%)
    if (reqs.content_type) {
      const contentTypes = creator.content_types || [creator.contentType || ''];
      const matched = contentTypes.some(ct => ct.toLowerCase().includes(reqs.content_type.toLowerCase()));
      dimScores.content_type = matched ? 100 : 0;
      applicableWeights.content_type = weights.content_type;

      if (matched) {
        strengths.push(`Verified production experience in ${reqs.content_type}`);
      } else {
        gaps.push(`Does not list dedicated support for ${reqs.content_type}`);
      }
    }

    // 4. Tools Dimension (10%)
    const requiredTools = reqs.ai_tools_models || [];
    if (requiredTools.length > 0) {
      const matchedLen = candidate.matched_tools ? candidate.matched_tools.length : 0;
      const reqLen = requiredTools.length;
      dimScores.tools = Math.round((matchedLen / reqLen) * 100);
      applicableWeights.tools = weights.tools;

      if (dimScores.tools === 100) {
        strengths.push('Matches all requested AI models & generative toolchains');
      } else if (matchedLen < reqLen) {
        const creatorTools = creator.ai_tools_models || creator.primaryTools || [];
        const missing = requiredTools.filter(t => !creatorTools.some(ct => ct.toLowerCase().includes(t.toLowerCase())));
        if (missing.length > 0) {
          gaps.push(`Missing tool capabilities: ${missing.join(', ')}`);
        }
      }
    }

    // 5. Style and Format Dimension (10%)
    const requestedStyleOrFormat = [];
    if (reqs.visual_style) requestedStyleOrFormat.push({ type: 'style', val: reqs.visual_style });
    if (reqs.output_format) requestedStyleOrFormat.push({ type: 'format', val: reqs.output_format });

    if (requestedStyleOrFormat.length > 0) {
      let matchedCount = 0;
      const styles = creator.visual_styles || [];
      const formats = creator.output_formats || creator.aspectRatios || [];

      if (reqs.visual_style && styles.some(vs => vs.toLowerCase().includes(reqs.visual_style.toLowerCase()))) {
        matchedCount += 1;
      }
      if (reqs.output_format && formats.some(fmt => fmt.toLowerCase().includes(reqs.output_format.toLowerCase()))) {
        matchedCount += 1;
      }

      dimScores.style_and_format = Math.round((matchedCount / requestedStyleOrFormat.length) * 100);
      applicableWeights.style_and_format = weights.style_and_format;

      if (dimScores.style_and_format === 100) {
        strengths.push('Full alignment with target visual aesthetic and aspect ratios');
      } else if (dimScores.style_and_format === 0) {
        gaps.push('Lacks direct match for requested visual style or output format');
      }
    }

    // 6. Portfolio Relevance Dimension (20%)
    const hasRelevantPortfolio = candidate.relevant_portfolio_items && candidate.relevant_portfolio_items.length > 0;
    dimScores.portfolio_relevance = hasRelevantPortfolio ? 100 : 0;
    applicableWeights.portfolio_relevance = weights.portfolio_relevance;

    if (hasRelevantPortfolio) {
      strengths.push(`Identified ${candidate.relevant_portfolio_items.length} directly relevant portfolio deliverables`);
    } else {
      gaps.push('No directly relevant case studies found in public portfolio reel');
    }

    // Experience Dimension (5%)
    const portfolioCount = (creator.portfolio_items || creator.portfolio || []).length;
    const completedGigs = creator.completedGigs || creator.completed_gigs || 0;
    if (portfolioCount >= 3 || completedGigs >= 20) {
      dimScores.experience = 100;
    } else if (portfolioCount === 2 || completedGigs >= 10) {
      dimScores.experience = 66;
    } else if (portfolioCount === 1 || completedGigs >= 1) {
      dimScores.experience = 33;
    } else {
      dimScores.experience = 0;
    }
    applicableWeights.experience = weights.experience;

    // Calculate Normalized Overall Score
    const totalApplicableWeight = Object.values(applicableWeights).reduce((a, b) => a + b, 0);
    let overallScore = 0;

    if (totalApplicableWeight > 0) {
      const weightedSum = Object.keys(applicableWeights).reduce((sum, dim) => {
        return sum + (dimScores[dim] * applicableWeights[dim]);
      }, 0);
      overallScore = Math.round(weightedSum / totalApplicableWeight);
    } else {
      // If nothing was requested, default baseline score
      overallScore = creator.score || 95;
    }

    // Cap between 0 and 100
    overallScore = Math.max(0, Math.min(100, overallScore));

    // Construct 7-Dimension Explainable Breakdown
    const dimensionLabels = {
      skills: 'Skills',
      specialization: 'Specialization',
      portfolio_relevance: 'Portfolio Relevance',
      content_type: 'Content Type',
      tools: 'Generative Tools',
      style_and_format: 'Style & Format',
      experience: 'Experience'
    };

    const dimensionBreakdown = Object.keys(dimScores).map(dim => {
      const weight = applicableWeights[dim] !== undefined ? applicableWeights[dim] : weights[dim];
      const score = dimScores[dim];
      const contribution = totalApplicableWeight > 0 ? Math.round((score * weight) / totalApplicableWeight) : 0;
      let status = 'unmet';
      if (score === 100) status = 'exact';
      else if (score > 0) status = 'partial';

      return {
        dimension: dim,
        label: dimensionLabels[dim] || dim,
        weight: weight,
        score: score,
        contribution: contribution,
        status: status,
        evidence: strengths.find(s => s.toLowerCase().includes(dim.replace('_', ' '))) || null
      };
    });

    // Determine Classification: Exact Match vs Partial Match vs Unmet Requirements vs Requires Verification
    const isExact = Boolean(
      candidate.is_exact_match ||
      (dimScores.skills === 100 && dimScores.tools === 100 && candidate.eligibility?.status === 'Eligible' && overallScore >= 90)
    );

    let matchClassification = 'Partial Match';
    if (candidate.eligibility?.status === 'Ineligible') {
      matchClassification = 'Unmet Requirements';
    } else if (candidate.eligibility?.status === 'Requires Verification') {
      matchClassification = 'Requires Verification';
    } else if (isExact) {
      matchClassification = 'Exact Match';
    }

    const creatorTools = creator.ai_tools_models || creator.primaryTools || [];
    const missingTools = (reqs.ai_tools_models || []).filter(t => !creatorTools.some(ct => ct.toLowerCase().includes(t.toLowerCase())));

    const formats = creator.output_formats || creator.aspectRatios || [];
    const matchedFormats = (reqs.output_formats || []).filter(f => formats.some(cf => cf.toLowerCase().includes(f.toLowerCase())));
    // Connect portfolio evidence to matched skills (Objective 5)
    const portfolioItems = creator.portfolio_items || creator.portfolio || [];
    const skillEvidenceMap = {};
    const matchedSkills = candidate.matched_skills || [];

    for (const skill of matchedSkills) {
      const skillLower = skill.toLowerCase();
      const supportingItems = portfolioItems.filter(p => {
        const pSkills = (p.skills_used || p.skills || []).map(s => String(s).toLowerCase());
        const pDesc = (p.description || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const pPrompt = (p.prompt || '').toLowerCase();
        return pSkills.some(s => s.includes(skillLower)) || 
               pDesc.includes(skillLower) || 
               pTitle.includes(skillLower) || 
               pPrompt.includes(skillLower);
      });

      skillEvidenceMap[skill] = supportingItems.map(p => ({
        id: p.id,
        title: p.title,
        media_url: p.media_url,
        verified: Boolean(p.verified),
        verification_status: p.verification_status || 'not_verified'
      }));
    }

    return {
      freelancer_id: creator.id || candidate.freelancer_id,
      creator,
      overall_score: overallScore,
      match_percentage: overallScore,
      eligibility_status: candidate.eligibility?.status || 'Eligible',
      match_classification: matchClassification,
      dimension_scores: dimScores,
      dimension_breakdown: dimensionBreakdown,
      matched_skills: matchedSkills,
      missing_skills: candidate.missing_capabilities || [],
      skill_evidence_map: skillEvidenceMap,
      matched_tools: candidate.matched_tools || [],
      missing_tools: missingTools,
      relevant_specialization: {
        requested: reqs.specialization || null,
        value: creator.specialization || (creator.specializations?.[0] || 'AI Creator'),
        matched: dimScores.specialization === 100
      },
      supporting_portfolio_items: candidate.relevant_portfolio_items || [],
      relevant_experience: {
        completed_gigs: completedGigs,
        rating: creator.rating || 4.95,
        score: creator.score || creator.ai_creator_score || 95,
        portfolio_count: portfolioCount,
        verified_workflow: Boolean(creator.verified || creator.verified_pipeline)
      },
      matched_formats: matchedFormats,
      missing_requirements: candidate.missing_requirements || [],
      strengths,
      gaps,
      verification_requirements: candidate.eligibility?.unknown_constraints || [],
      reasons: candidate.eligibility?.reasons || [],
      relevance_explanation: candidate.relevance_explanation || '',
      formula_explanation: `Overall score ${overallScore}% calculated via weighted sum across active dimensions: Skills (${weights.skills}%), Specialization (${weights.specialization}%), Portfolio Relevance (${weights.portfolio_relevance}%), Content Type (${weights.content_type}%), Tools (${weights.tools}%), Style & Format (${weights.style_and_format}%), Experience (${weights.experience}%).`,
      is_demo: Boolean(creator.is_demo || creator.status === 'demo_unverified')
    };
  }

  /**
   * Calculate comprehensive AI Creator Score (0-100) based on profile completeness and portfolio artifacts
   * @param {Object} profile 
   * @param {Array} portfolioItems 
   * @returns {number} Score between 70 and 100
   */
  calculateScore(profile = {}, portfolioItems = []) {
    let score = 70; // Baseline score
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const tools = Array.isArray(profile.tools) ? profile.tools : (Array.isArray(profile.ai_tools_models) ? profile.ai_tools_models : []);
    const items = Array.isArray(portfolioItems) ? portfolioItems : [];

    // Profile completeness: skills (+2 each, max 10)
    score += Math.min(10, skills.length * 2);

    // AI Tools and models: (+2 each, max 10)
    score += Math.min(10, tools.length * 2);

    // Portfolio artifact evidence: (+3 each, max 9)
    score += Math.min(9, items.length * 3);

    // Bio / description quality
    if (profile.bio && profile.bio.length > 20) {
      score += 3;
    }

    // Specialization set
    if (profile.specialization) {
      score += 2;
    }

    // Hourly rate set
    if (profile.hourly_rate || profile.hourlyRate || profile.hourly_rate_usd) {
      score += 2;
    }

    // Cap at 98 (100 reserved for verified audit)
    return Math.min(profile.is_verified ? 100 : 98, Math.max(70, Math.round(score)));
  }
}

export const scoringService = new ScoringService();
export default scoringService;
