import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import searchService from '../services/searchService.js';
import scoringService from '../services/scoringService.js';
import reportService from '../services/reportService.js';
import { collaborationService, CollaborationStatus } from '../services/collaborationService.js';
import { DEFAULT_CREATORS as defaultCreators } from '../data/defaultCreators.js';

describe('Phase 1 & 2: Search & Requirement Extraction with Exclusions', () => {
  test('Handles empty and minimal query gracefully', () => {
    const res = searchService.search(defaultCreators, {});
    assert.ok(res.search_id);
    assert.equal(res.search_method, 'structured_query');
    assert.ok(Array.isArray(res.results));
    assert.ok(res.results.length > 0);
  });

  test('Extracts tools, format, and explicit exclusions', () => {
    const res = searchService.search(defaultCreators, {
      query: 'Need an AI commercial video in 16:9 with Runway Gen-3 Alpha but no Midjourney under $5000',
      excluded_tools: ['Midjourney']
    });

    assert.ok(res.parsed_requirements);
    assert.equal(res.parsed_requirements.content_type, 'Video');
    assert.equal(res.parsed_requirements.output_format, '16:9');
    assert.ok(res.parsed_requirements.tools.includes('Runway Gen-3 Alpha'));
    assert.ok(res.parsed_requirements.excluded_tools.includes('Midjourney'));

    // Verify creators with Midjourney as primary tool are filtered or penalized
    for (const c of res.results) {
      if (c.creator?.primaryTools?.includes('Midjourney')) {
        assert.equal(c.eligibility.status, 'Ineligible');
      }
    }
  });

  test('Distinguishes exact match, partial match, and normalized requirements', () => {
    const res = searchService.search(defaultCreators, {
      query: 'Photorealistic Cyberpunk video',
      tool: 'Runway Gen-3 Alpha',
      aspectRatio: '16:9'
    });

    assert.ok(res.normalized_requirements);
    assert.ok(res.results.length > 0);

    const first = res.results[0];
    assert.ok('is_exact_match' in first);
    assert.ok('is_partial_match' in first);
    assert.ok('matched_requirements' in first);
    assert.ok('missing_requirements' in first);
  });
});

describe('Phase 2: Explainable 7-Dimension Scoring & Deterministic Ranking', () => {
  test('Validates default 7-dimension weights sum to 100%', () => {
    const weights = scoringService.weights;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100);
    assert.equal(weights.skills, 25);
    assert.equal(weights.specialization, 20);
    assert.equal(weights.portfolio_relevance, 20);
    assert.equal(weights.content_type, 10);
    assert.equal(weights.tools, 10);
    assert.equal(weights.style_and_format, 10);
    assert.equal(weights.experience, 5);
  });

  test('Calculates scores within [0, 100] and groups candidates by eligibility', () => {
    const searchRes = searchService.search(defaultCreators, {
      query: 'Runway Gen-3 16:9 cinematic video'
    });
    const scored = scoringService.scoreCandidates(searchRes);

    assert.ok(Array.isArray(scored.results));
    assert.ok(Array.isArray(scored.candidates_requiring_verification));
    assert.ok(Array.isArray(scored.ineligible_candidates));
    assert.ok(Array.isArray(scored.ranked_candidates));

    for (const cand of scored.ranked_candidates) {
      assert.ok(cand.overall_score >= 0 && cand.overall_score <= 100);
      assert.ok(cand.dimension_scores);
      assert.ok('skills' in cand.dimension_scores);
      assert.ok('specialization' in cand.dimension_scores);
      assert.ok('portfolio_relevance' in cand.dimension_scores);
      assert.ok('tools' in cand.dimension_scores);
    }
  });

  test('Implements deterministic tie-breaking for equal scores', () => {
    const mockSearchResults = {
      search_id: 'tie-break-test',
      parsed_requirements: {},
      results: [
        { freelancer_id: 'Z99', creator: { id: 'Z99', name: 'Zoe' }, eligibility: { status: 'Eligible' } },
        { freelancer_id: 'A01', creator: { id: 'A01', name: 'Alice' }, eligibility: { status: 'Eligible' } }
      ]
    };

    const scored = scoringService.scoreCandidates(mockSearchResults);
    // Since both have identical dummy profiles and equal scores, A01 must come before Z99 alphabetically
    assert.equal(scored.results[0].freelancer_id, 'A01');
    assert.equal(scored.results[1].freelancer_id, 'Z99');
  });
});

describe('Phase 3: Matching Report Generation & Search ID Mismatch Validation', () => {
  test('Rejects report generation when search_id is missing or mismatched', () => {
    const searchRes = { search_id: 'search-123', results: [] };
    const scoreRes = { search_id: 'search-999', results: [] };

    assert.throws(() => {
      reportService.generateReport(searchRes, scoreRes);
    }, /Search ID mismatch/);

    assert.throws(() => {
      reportService.generateReport(null, scoreRes);
    }, /Valid search_results with search_id is required/);
  });

  test('Generates comprehensive MatchingReport with 7-dimension comparison matrix and requirement analysis', () => {
    const searchRes = searchService.search(defaultCreators, {
      query: 'AI film director with Runway Gen-3 Alpha in 16:9 for commercial advertising'
    });
    const scoreRes = scoringService.scoreCandidates(searchRes);

    const report = reportService.generateReport(searchRes, scoreRes);

    assert.ok(report.report_id);
    assert.ok(report.created_at);
    assert.ok(report.summary);
    assert.equal(report.summary.total_candidates_evaluated, scoreRes.ranked_candidates.length);
    assert.ok(report.summary.eligible_count >= 0);

    // Verify recommendations
    assert.ok(Array.isArray(report.recommendations));
    if (report.recommendations.length > 0) {
      const topRec = report.recommendations[0];
      assert.equal(topRec.rank, 1);
      assert.ok(topRec.overall_score >= 0);
      assert.ok(Array.isArray(topRec.requirement_analysis));
      assert.ok(topRec.requirement_analysis.length > 0);
      assert.ok(topRec.requirement_analysis.some(r => r.requirement === 'Commercial-Use Permission'));
    }

    // Verify comparison matrix
    assert.ok(Array.isArray(report.comparison));
    assert.equal(report.comparison.length, scoreRes.ranked_candidates.length);
    const firstComp = report.comparison[0];
    assert.ok('skills_match' in firstComp);
    assert.ok('tool_compatibility' in firstComp);
    assert.ok('style_and_format_compatibility' in firstComp);
  });
});

describe('Phase 5: Collaboration Lifecycle, Revision History & Participant Auth', () => {
  let createdReq;

  test('Creates request with initial brief version 1 and audit log', async () => {
    createdReq = await collaborationService.createRequest({
      company_id: 'COMP-TEST-1',
      freelancer_id: 'FL-TEST-1',
      project_brief: { title: 'Launch Campaign 2026', budget: '$4,000' }
    });

    assert.ok(createdReq.request_id);
    assert.equal(createdReq.status, CollaborationStatus.PENDING);
    assert.equal(createdReq.brief_version, 1);
    assert.equal(createdReq.revision_history.length, 1);
    assert.equal(createdReq.audit_history.length, 1);
    assert.equal(createdReq.audit_history[0].event_type, 'request_created');
  });

  test('Rejects state mutation from unauthorized actor', async () => {
    await assert.rejects(async () => {
      // Impostor trying to accept
      await collaborationService.acceptRequest(createdReq.request_id, 'freelancer', 'IMPOSTOR_ID');
    }, /Unauthorized/);
  });

  test('Freelancer can request clarification', async () => {
    const updated = await collaborationService.requestClarification(
      createdReq.request_id,
      'Could you confirm if 4K master deliverables are needed?',
      'freelancer',
      'FL-TEST-1'
    );

    assert.equal(updated.status, CollaborationStatus.CLARIFICATION_REQUESTED);
    assert.equal(updated.clarification_history.length, 1);
    assert.equal(updated.clarification_history[0].content, 'Could you confirm if 4K master deliverables are needed?');
  });

  test('Company answers clarification and updates brief version with revision history', async () => {
    await collaborationService.submitClarificationResponse(
      createdReq.request_id,
      'Yes, 4K ProRes 422 is required.',
      'company',
      'COMP-TEST-1'
    );

    const updated = await collaborationService.updateBrief(
      createdReq.request_id,
      { title: 'Launch Campaign 2026', budget: '$4,500', resolution: '4K ProRes 422' },
      'company',
      'COMP-TEST-1'
    );

    assert.equal(updated.brief_version, 2);
    assert.equal(updated.revision_history.length, 2);
    assert.equal(updated.revision_history[1].version, 2);
    assert.equal(updated.project_brief.resolution, '4K ProRes 422');
  });

  test('Freelancer accepts request and both parties confirm current version', async () => {
    // Freelancer accepts
    await collaborationService.acceptRequest(createdReq.request_id, 'freelancer', 'FL-TEST-1');

    // Reject confirmation on outdated version
    await assert.rejects(async () => {
      await collaborationService.confirmBrief(createdReq.request_id, 'company', 1, 'COMP-TEST-1');
    }, /Conflicting brief version/);

    // Confirm on current version 2
    await collaborationService.confirmBrief(createdReq.request_id, 'company', 2, 'COMP-TEST-1');
    const finalReq = await collaborationService.confirmBrief(createdReq.request_id, 'freelancer', 2, 'FL-TEST-1');

    assert.equal(finalReq.status, CollaborationStatus.CONFIRMED);
    assert.ok(finalReq.company_confirmed_at);
    assert.ok(finalReq.freelancer_confirmed_at);
  });

  test('Rejects invalid transitions once confirmed', async () => {
    await assert.rejects(async () => {
      await collaborationService.rejectRequest(createdReq.request_id, 'No longer interested', 'freelancer', 'FL-TEST-1');
    }, /Cannot reject request from current status/);
  });
});

describe('Phase 6 & 7: End-to-End HTTP API Integration & Messaging Scoping', () => {
  const BASE_URL = 'http://localhost:3001';

  test('GET /health returns all integrated services', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.features.includes('Matching & Requirements Report Engine'));
    assert.ok(data.features.includes('5-Stage Collaboration Lifecycle'));
  });

  test('POST /api/report/generate rejects mismatched search_id with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search_results: { search_id: 'search-A' },
        scoring_results: { search_id: 'search-B' }
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Search ID mismatch/);
  });

  test('POST /api/generate-brief returns structured brief and completeness score even without live API key', async () => {
    const res = await fetch(`${BASE_URL}/api/generate-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '15-second teaser video for a cyberpunk energy drink brand in 16:9 with Runway Gen-3 and neon glitch aesthetic'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.brief);
    assert.ok(data.completeness_score >= 0 && data.completeness_score <= 100);
    assert.ok(data.required_skills);
    assert.ok(data.tools);
    assert.ok(Array.isArray(data.clarification_questions));
  });

  test('POST /api/messages requires valid request_id and authorizes participant', async () => {
    // Missing authorization header rejected with 401
    const unauthTest = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello without token' })
    });
    assert.equal(unauthTest.status, 401);

    // Missing request_id with token rejected with 400
    const badRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token:company:COMP-MSG-1'
      },
      body: JSON.stringify({
        message: 'Hello'
      })
    });
    assert.ok(badRes.status === 400 || badRes.status === 401, 'Should reject with 400 or 401');

    // Create a real collaboration request first
    const companyId = `COMP-MSG-${Date.now()}`;
    const collRes = await fetch(`${BASE_URL}/api/collaboration/request`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token:company:${companyId}`
      },
      body: JSON.stringify({
        freelancer_id: 'FL-MSG-1',
        project_brief: { title: 'Test Chat' }
      })
    });
    const collData = await collRes.json();
    const reqId = collData.request.request_id;

    // Send valid message as company participant
    const msgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token:company:${companyId}`
      },
      body: JSON.stringify({
        request_id: reqId,
        message: 'Welcome to the project!'
      })
    });

    assert.ok(msgRes.status === 200 || msgRes.status === 201);
    const msgData = await msgRes.json();
    assert.equal(msgData.success, true);
    assert.ok(msgData.persistence_mode);

    // Unauthorized sender (non-participant) rejected with 403
    const unauthRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token:freelancer:RANDOM-ATTACKER'
      },
      body: JSON.stringify({
        request_id: reqId,
        message: 'I should be rejected'
      })
    });
    assert.equal(unauthRes.status, 403);

    // Fetch messages for thread as authorized company participant
    const fetchRes = await fetch(`${BASE_URL}/api/messages/${reqId}`, {
      headers: {
        'Authorization': `Bearer test-token:company:${companyId}`
      }
    });
    assert.equal(fetchRes.status, 200);
    const fetchData = await fetchRes.json();
    assert.equal(fetchData.success, true);
    assert.equal(fetchData.messages.length, 1);
    assert.equal(fetchData.messages[0].content, 'Welcome to the project!');
  });
});
