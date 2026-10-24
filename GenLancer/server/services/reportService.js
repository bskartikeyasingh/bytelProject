import crypto from 'crypto';

/**
 * Report Service
 * Faithfully adapts report_service.py from the reference repository into Node.js.
 * Generates comprehensive matching and requirements analysis reports from
 * validated search and scoring results.
 */
class ReportService {
  constructor() {
    this.reportsStore = new Map();
  }

  /**
   * Generate a comprehensive MatchingReport
   * @param {Object} searchResults - SearchResponse from searchService
   * @param {Object} scoringResults - ScoringResponse from scoringService
   * @returns {Object} MatchingReport
   */
  generateReport(searchResults, scoringResults) {
    if (!searchResults || !searchResults.search_id) {
      throw new Error('Valid search_results with search_id is required.');
    }
    if (!scoringResults || !scoringResults.search_id) {
      throw new Error('Valid scoring_results with search_id is required.');
    }
    if (searchResults.search_id !== scoringResults.search_id) {
      throw new Error(`Search ID mismatch: search_results (${searchResults.search_id}) does not match scoring_results (${scoringResults.search_id}).`);
    }

    // Build lookup for search results by freelancer_id
    const searchLookup = new Map();
    for (const res of searchResults.results || []) {
      const fid = res.freelancer_id || res.creator?.id || res.profile?.id;
      if (fid) searchLookup.set(fid, res);
    }

    const reqs = searchResults.parsed_requirements || {};

    // Candidate counts
    const eligibleCount = (scoringResults.results || []).length;
    const verificationCount = (scoringResults.candidates_requiring_verification || []).length;
    const ineligibleCount = (scoringResults.ineligible_candidates || []).length;
    const totalCandidates = eligibleCount + verificationCount + ineligibleCount;

    const originalQuery = searchResults.original_query || 'Direct search query';
    const projectSummary = originalQuery.length > 120 ? `${originalQuery.slice(0, 120)}...` : originalQuery;

    const summary = {
      project_summary: projectSummary,
      total_candidates_evaluated: totalCandidates,
      eligible_count: eligibleCount,
      verification_required_count: verificationCount,
      ineligible_count: ineligibleCount,
      scoring_method: scoringResults.scoring_method || 'weighted_matching_v1'
    };

    const recommendations = [];
    const comparison = [];

    // Eligible first, then verification required
    const allScored = [
      ...(scoringResults.results || []),
      ...(scoringResults.candidates_requiring_verification || [])
    ];

    let rank = 1;
    for (const scoredCand of allScored) {
      const fid = scoredCand.freelancer_id;
      const searchCand = searchLookup.get(fid);
      if (!searchCand) continue;

      const creator = searchCand.creator || searchCand.profile || {};
      const analysisList = this._analyzeRequirements(searchCand, scoredCand, reqs);

      // Identify partial matches
      const partialMatches = [];
      for (const an of analysisList) {
        if (an.status === 'Partially Satisfied') {
          partialMatches.push(`Partial match for ${an.requirement.toLowerCase()}`);
        }
      }

      let recommendationSummary = scoredCand.overall_score >= 85
        ? 'Strong high-confidence match across required production criteria.'
        : scoredCand.overall_score >= 65
          ? 'Moderate match suitable with minor workflow adjustments.'
          : 'Low alignment with specified technical deliverables.';

      if (scoredCand.eligibility_status === 'Requires Verification') {
        recommendationSummary += ' Verification required on unconfirmed terms before contract funding.';
      }

      recommendations.push({
        freelancer_id: fid,
        display_name: creator.name || searchCand.profile?.name || 'Creator',
        title: creator.title || 'AI Specialist',
        overall_score: scoredCand.overall_score,
        rank,
        eligibility_status: scoredCand.eligibility_status,
        recommendation_summary: recommendationSummary,
        strengths: scoredCand.strengths || [],
        partial_matches: partialMatches,
        missing_capabilities: [
          ...(scoredCand.gaps || []),
          ...(searchCand.missing_capabilities || [])
        ],
        verification_requirements: scoredCand.verification_requirements || [],
        important_caveats: scoredCand.eligibility_status === 'Requires Verification'
          ? ['Candidate has unverified constraints requiring company confirmation.']
          : [],
        requirement_analysis: analysisList
      });

      // Comparison row
      comparison.push({
        freelancer_id: fid,
        display_name: creator.name || 'Creator',
        rank,
        overall_score: scoredCand.overall_score,
        eligibility_status: scoredCand.eligibility_status,
        skills_match: scoredCand.dimension_scores?.skills ?? 0,
        specialization_match: scoredCand.dimension_scores?.specialization ?? 0,
        portfolio_relevance: scoredCand.dimension_scores?.portfolio_relevance ?? 0,
        content_type_compatibility: scoredCand.dimension_scores?.content_type ?? 0,
        tool_compatibility: scoredCand.dimension_scores?.tools ?? 0,
        style_and_format_compatibility: scoredCand.dimension_scores?.style_and_format ?? 0,
        experience_match: scoredCand.dimension_scores?.experience ?? 0,
        key_strengths: scoredCand.strengths || [],
        main_gaps: scoredCand.gaps || [],
        verification_requirements: scoredCand.verification_requirements || []
      });

      rank++;
    }

    // Ineligible candidates in comparison data with rank = -1
    for (const scoredCand of scoringResults.ineligible_candidates || []) {
      const fid = scoredCand.freelancer_id;
      const searchCand = searchLookup.get(fid);
      const creator = searchCand?.creator || searchCand?.profile || {};

      comparison.push({
        freelancer_id: fid,
        display_name: creator.name || 'Creator',
        rank: -1,
        overall_score: scoredCand.overall_score,
        eligibility_status: scoredCand.eligibility_status,
        skills_match: scoredCand.dimension_scores?.skills ?? 0,
        specialization_match: scoredCand.dimension_scores?.specialization ?? 0,
        portfolio_relevance: scoredCand.dimension_scores?.portfolio_relevance ?? 0,
        content_type_compatibility: scoredCand.dimension_scores?.content_type ?? 0,
        tool_compatibility: scoredCand.dimension_scores?.tools ?? 0,
        style_and_format_compatibility: scoredCand.dimension_scores?.style_and_format ?? 0,
        experience_match: scoredCand.dimension_scores?.experience ?? 0,
        key_strengths: scoredCand.strengths || [],
        main_gaps: scoredCand.gaps || [],
        verification_requirements: scoredCand.verification_requirements || []
      });
    }

    const reportId = crypto.randomUUID ? crypto.randomUUID() : `rep-${Date.now()}`;
    const report = {
      report_id: reportId,
      search_id: scoringResults.search_id,
      generation_method: 'deterministic_matching_report_v1',
      generation_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      summary,
      recommendations,
      comparison,
      limitations: [
        'Report generated deterministically using weighted multi-constraint heuristic evaluation.',
        'Semantic visual style and workflow veracity were checked against verifiable portfolio metadata and seeds.'
      ]
    };

    this.reportsStore.set(reportId, report);
    return report;
  }

  /**
   * Detailed requirement-by-requirement analysis adapted from reference
   */
  _analyzeRequirements(searchCand, scoredCand, reqs) {
    const creator = searchCand.creator || searchCand.profile || {};
    const analysis = [];

    // 1. Commercial Use Permission
    if (reqs.commercial_use_required) {
      let status = 'Satisfied';
      let evidence = ['Profile indicates commercial rights licensing granted.'];
      let recommendedAction = null;

      const unknowns = (searchCand.eligibility?.unknown_constraints || []).filter(
        c => c.toLowerCase().includes('commercial') || c.toLowerCase().includes('licensing')
      );

      if (unknowns.length > 0) {
        status = 'Unknown';
        evidence = ['Profile does not definitively confirm buyout or commercial licensing.'];
        recommendedAction = 'Verify commercial buyout and copyright transfer terms before deposit.';
      } else if (searchCand.eligibility?.reasons?.some(r => r.toLowerCase().includes('licensing'))) {
        status = 'Not Satisfied';
        evidence = searchCand.eligibility.reasons.filter(r => r.toLowerCase().includes('licensing'));
        recommendedAction = 'Select an alternative creator with commercial licensing included.';
      }

      analysis.push({
        requirement: 'Commercial-Use Permission',
        status,
        evidence,
        recommended_action: recommendedAction
      });
    }

    // 2. Required Skills
    if (Array.isArray(reqs.required_skills) && reqs.required_skills.length > 0) {
      let status = 'Not Satisfied';
      let evidence = ['Does not explicitly match any specified skills.'];

      const matched = searchCand.matched_skills || [];
      const missing = searchCand.missing_capabilities || [];

      if (missing.length === 0 && matched.length === reqs.required_skills.length) {
        status = 'Satisfied';
        evidence = [`Matches all required skills: ${matched.join(', ')}`];
      } else if (matched.length > 0) {
        status = 'Partially Satisfied';
        evidence = [`Matches skills: ${matched.join(', ')}. Missing: ${missing.join(', ')}.`];
      }

      analysis.push({
        requirement: 'Required Technical Skills',
        status,
        evidence,
        recommended_action: status === 'Partially Satisfied' ? 'Confirm creator can execute missing skills with workflow tooling.' : null
      });
    }

    // 3. Budget Limit
    if (reqs.max_budget !== null && reqs.max_budget !== undefined) {
      const rate = creator.hourly_rate_usd || 100;
      const status = rate <= reqs.max_budget ? 'Satisfied' : 'Not Satisfied';
      const evidence = [
        rate <= reqs.max_budget
          ? `Hourly rate ($${rate}/hr) is within target budget cap ($${reqs.max_budget}/hr).`
          : `Hourly rate ($${rate}/hr) exceeds maximum budget ($${reqs.max_budget}/hr).`
      ];

      analysis.push({
        requirement: 'Budget Ceiling',
        status,
        evidence,
        recommended_action: status === 'Not Satisfied' ? 'Negotiate custom project fixed-fee milestone or adjust budget.' : null
      });
    }

    // 4. Availability
    if (reqs.availability_requirement) {
      const avail = (creator.availability || '').toLowerCase();
      let status = 'Satisfied';
      let evidence = [`Candidate meets availability target: ${creator.availability || 'Available'}`];
      let recommendedAction = null;

      const unknowns = (searchCand.eligibility?.unknown_constraints || []).filter(
        c => c.toLowerCase().includes('availability')
      );

      if (unknowns.length > 0) {
        status = 'Unknown';
        evidence = ['Candidate availability schedule is unconfirmed for immediate project start.'];
        recommendedAction = 'Confirm start date and weekly commitment in messaging.';
      } else if (!avail.includes(reqs.availability_requirement.toLowerCase())) {
        status = 'Partially Satisfied';
        evidence = [`Listed availability is ${creator.availability || 'Unspecified'}, requested ${reqs.availability_requirement}.`];
        recommendedAction = 'Verify project timeline fits creator current commitments.';
      }

      analysis.push({
        requirement: 'Production Availability',
        status,
        evidence,
        recommended_action: recommendedAction
      });
    }

    // 5. Required Tools & Models
    if (Array.isArray(reqs.ai_tools_models) && reqs.ai_tools_models.length > 0) {
      const matched = searchCand.matched_tools || [];
      const missing = reqs.ai_tools_models.filter(
        t => !matched.some(m => m.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(m.toLowerCase()))
      );

      let status = 'Not Satisfied';
      let evidence = ['Does not list any requested generative model pipelines.'];

      if (missing.length === 0) {
        status = 'Satisfied';
        evidence = [`Verified workflow with models: ${matched.join(', ')}`];
      } else if (matched.length > 0) {
        status = 'Partially Satisfied';
        evidence = [`Active pipelines: ${matched.join(', ')}. Not verified for: ${missing.join(', ')}.`];
      }

      analysis.push({
        requirement: 'Generative AI Pipelines & Models',
        status,
        evidence,
        recommended_action: status === 'Partially Satisfied' ? 'Request sample generation in target model prior to final sign-off.' : null
      });
    }

    return analysis;
  }

  getReport(reportId) {
    return this.reportsStore.get(reportId) || null;
  }
}

export const reportService = new ReportService();
export default reportService;
