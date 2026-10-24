import test from 'node:test';
import assert from 'node:assert/strict';
import briefService from '../services/briefService.js';

const BASE_URL = 'http://localhost:3001';

test('AI Campaign Brief Builder Service & API Integration', async (t) => {

  await t.test('Completeness Evaluation: evaluates semantic fields rather than raw string length', () => {
    // 1. Incomplete brief with no budget, timeline, or formats
    const emptyBrief = {
      title: 'Short',
      goal: ''
    };
    const evalEmpty = briefService.evaluateCompleteness(emptyBrief);
    assert.ok(evalEmpty.completeness_score < 40, `Empty brief completeness score (${evalEmpty.completeness_score}) should be low`);
    assert.ok(evalEmpty.missing_fields.some(m => m.field === 'budget'));
    assert.ok(evalEmpty.missing_fields.some(m => m.field === 'timeline'));
    assert.ok(evalEmpty.clarification_questions.length >= 3);

    // 2. High-completeness brief covering all 9 dimensions
    const completeBrief = {
      title: 'Nova Surge Cyberpunk Launch',
      goal: 'Launch high-energy commercial campaign for sparkling drink',
      product_service: 'Nova Surge 250ml Nitro Cans',
      target_audience: 'Gen Z gamers and young professionals ages 18-28',
      required_skills: ['Prompt Engineering', 'AI Video Generation', 'Fluid Sim'],
      deliverables: [{ item: '3x 15s 4K video ads', format: '16:9' }],
      aspect_ratio: '16:9',
      budget: '$4,500',
      timeline: 'Nov 30, 2026',
      style: 'Cyberpunk with volumetric neon lighting',
      tools: ['Runway Gen-3 Alpha', 'Midjourney v6']
    };
    const evalFull = briefService.evaluateCompleteness(completeBrief);
    assert.equal(evalFull.completeness_score, 100, 'Complete brief should achieve 100% semantic score');
    assert.equal(evalFull.missing_information.length, 0);
    assert.equal(evalFull.clarification_questions.length, 0);
  });

  await t.test('Deterministic Fallback Generation: gracefully handles unconfigured or unavailable AI', () => {
    const rawIdea = 'Launching luxury organic perfume line in 9:16 vertical video format targeting eco-conscious millennials with budget $3,200';
    const fallback = briefService.generateStructuredBriefFallback(rawIdea);

    assert.equal(fallback.is_fallback, true);
    assert.equal(fallback.model_used, 'deterministic-fallback');
    assert.ok(fallback.title);
    assert.ok(fallback.product_service);
    assert.equal(fallback.aspect_ratio, '9:16');
    assert.equal(fallback.field_sources.aspect_ratio, 'user_provided');
    assert.equal(fallback.field_sources.budget, 'user_provided');
    assert.ok(fallback.completeness_score >= 80);
    assert.ok(Array.isArray(fallback.deliverables));
    assert.ok(Array.isArray(fallback.tools));
    assert.ok(Array.isArray(fallback.required_skills));
  });

  await t.test('Section Regeneration: allows targeted regeneration without resetting the entire brief', async () => {
    const baseBrief = briefService.generateStructuredBriefFallback('Cyberpunk sneaker advertisement');
    const originalStyle = baseBrief.style;

    const regenerated = await briefService.regenerateSection('style', baseBrief, 'Cyberpunk sneaker advertisement with moody rainy neon');
    assert.equal(regenerated.regenerated_section, 'style');
    assert.ok(regenerated.style);
    assert.equal(regenerated.field_sources.style, 'ai_inferred');
    // Ensure untouched fields remain stable
    assert.equal(regenerated.title, baseBrief.title);
    assert.equal(regenerated.product_service, baseBrief.product_service);
  });

  await t.test('POST /api/brief/validate: rejects incomplete/invalid briefs with actionable errors', async () => {
    const invalidRes = await fetch(`${BASE_URL}/api/brief/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          title: '', // Invalid empty title
          goal: ''
        }
      })
    });

    assert.equal(invalidRes.status, 400);
    const data = await invalidRes.json();
    assert.equal(data.success, false);
    assert.equal(data.valid, false);
    assert.ok(Array.isArray(data.errors));
    assert.match(data.errors[0], /Campaign title or goal is required/);
  });

  await t.test('POST /api/brief/validate & Normalization: converts valid brief into creator search parameters', async () => {
    const validRes = await fetch(`${BASE_URL}/api/brief/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          title: 'Aura Electric Scooter Commercial',
          goal: 'Produce 15s cinematic spot for high-speed urban commuter scooter',
          product_service: 'Aura Stealth Edition E-Scooter',
          target_audience: 'Urban commuters ages 22-38',
          required_skills: ['Cinematography', 'AI Video Generation'],
          tools: ['Runway Gen-3 Alpha', 'ComfyUI'],
          deliverables: ['1x 15s master commercial', '3x social cutdowns'],
          aspect_ratio: '16:9',
          budget: '$3,500 - $5,000',
          timeline: '3 weeks',
          style: 'Hyperrealistic night motion with anamorphic lens flares'
        }
      })
    });

    assert.equal(validRes.status, 200);
    const data = await validRes.json();
    assert.equal(data.success, true);
    assert.equal(data.valid, true);
    assert.ok(data.completeness_score >= 90);
    assert.ok(data.normalized_brief);
    assert.ok(data.search_params);

    // Verify search_params structure for creator matching
    const params = data.search_params;
    assert.equal(params.project_title, 'Aura Electric Scooter Commercial');
    assert.deepEqual(params.target_tools, ['Runway Gen-3 Alpha', 'ComfyUI']);
    assert.equal(params.output_format, '16:9');
    assert.equal(params.max_budget, 5000);
    assert.equal(params.min_budget, 3500);
    assert.deepEqual(params.required_skills, ['Cinematography', 'AI Video Generation']);
  });

  await t.test('POST /api/generate-brief: accepts prompt, supports fallback or live model, and returns clarification questions', async () => {
    const res = await fetch(`${BASE_URL}/api/generate-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: 'Need a fast 3D product animation for wireless noise-canceling headphones in matte black'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.brief);
    assert.ok(data.completeness_score >= 0);
    assert.ok(data.field_sources);
    assert.ok(Array.isArray(data.clarification_questions));
    // Check that missing budget and timeline generate clarification questions
    assert.ok(data.clarification_questions.some(q => /budget|escrow/i.test(q)));
  });

  await t.test('POST /api/generate-brief: handles section-specific regeneration via API', async () => {
    const initialRes = await fetch(`${BASE_URL}/api/generate-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: 'Organic matcha tea drink social campaign'
      })
    });
    const initialData = await initialRes.json();

    const regenRes = await fetch(`${BASE_URL}/api/generate-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'deliverables',
        currentBrief: initialData.brief,
        idea: 'Organic matcha tea drink social campaign with 3 vertical reels'
      })
    });

    assert.equal(regenRes.status, 200);
    const regenData = await regenRes.json();
    assert.equal(regenData.success, true);
    assert.ok(regenData.brief.deliverables);
  });
});
