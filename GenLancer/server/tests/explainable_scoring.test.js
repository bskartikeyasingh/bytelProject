import test from 'node:test';
import assert from 'node:assert/strict';
import { scoringService } from '../services/scoringService.js';
import { searchService } from '../services/searchService.js';
import { reportService } from '../services/reportService.js';

const BASE_URL = 'http://localhost:3001';

test('Explainable AI Creator Discovery and Matching Suite', async (t) => {

  const testCreators = [
    {
      id: 'cr-exact',
      name: 'Maya Lin',
      title: 'Senior AI Film Director',
      specialization: 'AI Filmmaking',
      skills: ['Cinematography', 'Prompt Engineering', 'Fluid Sim'],
      ai_tools_models: ['Runway Gen-3 Alpha', 'Midjourney v6'],
      output_formats: ['16:9'],
      content_types: ['Video'],
      hourly_rate_usd: 120,
      completed_gigs: 35,
      score: 98,
      verified: true,
      portfolio_items: [
        { title: 'Neon Cascade', content_type: 'Video', description: '4K commercial with Fluid Sim and Cinematography' }
      ]
    },
    {
      id: 'cr-partial',
      name: 'Lucas Vance',
      title: 'Generative VFX Designer',
      specialization: 'AI Filmmaking',
      skills: ['Cinematography'], // Missing Prompt Engineering and Fluid Sim
      ai_tools_models: ['Runway Gen-3 Alpha'],
      output_formats: ['16:9'],
      content_types: ['Video'],
      hourly_rate_usd: 110,
      completed_gigs: 12,
      score: 88,
      verified: true,
      portfolio_items: [
        { title: 'Cyber Drift', content_type: 'Video', description: 'Cinematography test' }
      ]
    },
    {
      id: 'cr-excluded',
      name: 'Devin Cole',
      title: 'Blender 3D Artist',
      specialization: '3D Modeling',
      skills: ['Blender Integration', 'Cinematography'],
      ai_tools_models: ['Blender', 'Runway Gen-3 Alpha'],
      output_formats: ['16:9'],
      content_types: ['Video'],
      hourly_rate_usd: 150,
      completed_gigs: 10,
      score: 90,
      portfolio_items: []
    },
    {
      id: 'cr-incomplete',
      name: 'New Creator (Incomplete)',
      title: 'Junior Artist',
      skills: [],
      ai_tools_models: [],
      portfolio_items: [],
      hourly_rate_usd: 80,
      completed_gigs: 0,
      score: 70
    }
  ];

  await t.test('Preserves 7 Scoring Dimensions summing strictly to 100%', () => {
    const weights = scoringService.defaultWeights;
    assert.equal(weights.skills, 25);
    assert.equal(weights.specialization, 20);
    assert.equal(weights.portfolio_relevance, 20);
    assert.equal(weights.content_type, 10);
    assert.equal(weights.tools, 10);
    assert.equal(weights.style_and_format, 10);
    assert.equal(weights.experience, 5);

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    assert.equal(total, 100);
  });

  await t.test('Distinguishes Exact Matches, Partial Matches, and Incomplete Profiles', () => {
    const searchRes = searchService.search(testCreators, {
      skills: ['Cinematography', 'Prompt Engineering'],
      tools: ['Runway Gen-3 Alpha'],
      specialization: 'AI Filmmaking',
      output_format: '16:9',
      content_type: 'Video'
    });

    const scoreRes = scoringService.scoreCandidates(searchRes);
    const ranked = scoreRes.ranked_candidates;

    const exactCand = ranked.find(c => c.freelancer_id === 'cr-exact');
    assert.ok(exactCand, 'cr-exact should be present in results');
    assert.equal(exactCand.match_classification, 'Exact Match');
    assert.ok(exactCand.overall_score >= 90);
    assert.equal(exactCand.matched_skills.length, 2);
    assert.equal(exactCand.supporting_portfolio_items.length, 1);

    const partialCand = ranked.find(c => c.freelancer_id === 'cr-partial');
    assert.ok(partialCand);
    assert.equal(partialCand.match_classification, 'Partial Match');
    assert.equal(partialCand.missing_skills.length, 1); // Missing Prompt Engineering
    assert.ok(partialCand.overall_score < exactCand.overall_score);

    const incompleteCand = ranked.find(c => c.freelancer_id === 'cr-incomplete');
    if (incompleteCand) {
      assert.ok(incompleteCand.overall_score <= 50, 'Incomplete profile should score low');
      assert.equal(incompleteCand.dimension_scores.skills, 0);
      assert.equal(incompleteCand.dimension_scores.tools, 0);
      assert.equal(incompleteCand.dimension_scores.portfolio_relevance, 0);
    }
  });

  await t.test('Enforces Negative Exclusions without accidental substring collisions', () => {
    // Search with excluded tool "Blender"
    const searchRes = searchService.search(testCreators, {
      tools: ['Runway Gen-3 Alpha'],
      excluded_tools: ['Blender']
    });

    const devin = searchRes.results.find(r => r.freelancer_id === 'cr-excluded');
    assert.ok(devin, 'Devin Cole should be flagged');
    assert.equal(devin.eligibility.status, 'Ineligible');
    assert.ok(devin.eligibility.reasons.some(r => /excluded toolchain.*Blender/i.test(r)));

    // Ensure Maya Lin (who uses Runway and Midjourney, not Blender) is NOT excluded
    const maya = searchRes.results.find(r => r.freelancer_id === 'cr-exact');
    assert.ok(maya);
    assert.equal(maya.eligibility.status, 'Eligible');
  });

  await t.test('Tie-breaking is strictly deterministic across repeated invocations', () => {
    const creatorA = { id: 'FL-002', name: 'Alpha', skills: ['Cinematography'], score: 90, hourly_rate_usd: 100, portfolio_items: [] };
    const creatorB = { id: 'FL-001', name: 'Beta', skills: ['Cinematography'], score: 90, hourly_rate_usd: 100, portfolio_items: [] };

    const searchRes = searchService.search([creatorA, creatorB], { skills: ['Cinematography'] });
    const score1 = scoringService.scoreCandidates(searchRes);
    const score2 = scoringService.scoreCandidates(searchRes);

    assert.equal(score1.ranked_candidates[0].freelancer_id, score2.ranked_candidates[0].freelancer_id);
    // FL-001 comes before FL-002 alphabetically when scores are identical
    assert.equal(score1.ranked_candidates[0].freelancer_id, 'FL-001');
    assert.equal(score1.ranked_candidates[1].freelancer_id, 'FL-002');
  });

  await t.test('Generates actionable relaxation suggestions when no creators match', () => {
    const constrainedSearch = searchService.search(testCreators, {
      max_budget: 50, // All creators cost > $80/hr
      excluded_tools: ['Runway Gen-3 Alpha', 'Midjourney v6', 'Blender']
    });

    assert.ok(Array.isArray(constrainedSearch.relaxation_suggestions));
    assert.ok(constrainedSearch.relaxation_suggestions.length > 0);
    assert.ok(constrainedSearch.relaxation_suggestions.some(s => s.type === 'budget' || s.type === 'excluded_tools'));
  });

  await t.test('POST /api/score HTTP API returns explainable dimension breakdowns', async () => {
    const searchRes = searchService.search(testCreators, {
      tools: ['Runway Gen-3 Alpha'],
      output_format: '16:9',
      content_type: 'Video',
      max_budget: 150
    });

    const res = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search_results: searchRes
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.ranked_candidates));
    assert.ok(data.ranked_candidates.length > 0);

    const topCandidate = data.ranked_candidates[0];
    assert.ok(topCandidate.dimension_scores);
    assert.ok(Array.isArray(topCandidate.dimension_breakdown));
    assert.equal(topCandidate.dimension_breakdown.length, 7);
    assert.ok(topCandidate.match_classification);
    assert.ok(topCandidate.formula_explanation);
  });

  await t.test('Matching Report synchronizes authoritatively with scoring results', async () => {
    const searchRes = searchService.search(testCreators, {
      tools: ['Runway Gen-3 Alpha'],
      output_format: '16:9'
    });

    const scoreRes = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search_results: searchRes
      })
    });
    const scoreData = await scoreRes.json();
    assert.equal(scoreRes.status, 200);

    const reportRes = await fetch(`${BASE_URL}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search_results: searchRes,
        scoring_results: scoreData
      })
    });

    assert.equal(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.equal(reportData.success, true);
    assert.ok(reportData.report);
    assert.equal(reportData.report.search_id, scoreData.search_id);
    assert.ok(Array.isArray(reportData.report.comparison));
    assert.ok(Array.isArray(reportData.report.recommendations));
  });
});
