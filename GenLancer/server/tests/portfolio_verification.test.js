import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrl } from '../utils/urlValidator.js';
import { creatorService } from '../services/creatorService.js';
import { scoringService } from '../services/scoringService.js';
import { searchService } from '../services/searchService.js';

describe('GenLancer Evidence-Based Portfolio & Verification Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  // 1. Strict URL & Media Security Validation
  describe('URL & Media Security Validator', () => {
    test('Strictly blocks dangerous protocols', () => {
      const malicious = [
        'javascript:alert(document.cookie)',
        'JAVASCRIPT:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'blob:https://example.com/uuid'
      ];

      for (const url of malicious) {
        const result = validateUrl(url);
        assert.equal(result.valid, false, `Must reject dangerous URL: ${url}`);
        assert.ok(result.error.includes('Disallowed URL protocol') || result.error.includes('Malformed'));
      }
    });

    test('Rejects malformed and non-http/https URLs', () => {
      const invalid = [
        'not a url',
        'ftp://example.com/video.mp4',
        'http://',
        'https://',
        'http://invalid-domain',
        '   '
      ];

      for (const url of invalid) {
        const result = validateUrl(url);
        assert.equal(result.valid, false, `Must reject: ${url}`);
      }
    });

    test('Validates media format when requireMedia is true', () => {
      // Rejects plain web page when media is required
      const nonMedia = 'https://example.com/about-us';
      const nonMediaCheck = validateUrl(nonMedia, { requireMedia: true });
      assert.equal(nonMediaCheck.valid, false);
      assert.ok(nonMediaCheck.error.includes('Media URL must link to a valid video or image'));

      // Accepts valid media file extensions
      const validVideos = [
        'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
        'https://example.com/assets/render.webm',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        'https://vimeo.com/76979871',
        'https://youtube.com/watch?v=dQw4w9WgXcQ'
      ];

      for (const url of validVideos) {
        const result = validateUrl(url, { requireMedia: true });
        assert.equal(result.valid, true, `Must accept media URL: ${url}`);
        assert.ok(result.sanitized);
      }
    });

    test('Allows empty URL when allowEmpty is true', () => {
      const resultEmpty = validateUrl('', { allowEmpty: true });
      assert.equal(resultEmpty.valid, true);
      assert.equal(resultEmpty.sanitized, '');

      const resultNull = validateUrl(null, { allowEmpty: true });
      assert.equal(resultNull.valid, true);
    });
  });

  // 2. Portfolio CRUD Operations & Initial State Safety
  describe('Creator Service Portfolio CRUD & State Management', () => {
    const testCreatorId = 'c1';
    let createdItemId = null;

    test('New portfolio entry is initialized as unverified and not automatically badge-eligible', async () => {
      const newItemPayload = {
        title: 'Cyberpunk Drone Chase Scene',
        description: 'Anamorphic 8K neon pursuit test sequence render.',
        creator_role: 'Lead Visual Effects Director',
        skills_used: ['Prompt Engineering', 'Camera Motion Guidance', 'Photorealistic Upscaling'],
        tools_used: ['Runway Gen-3 Alpha', 'Midjourney v6'],
        content_type: 'Video',
        niche: 'Cyberpunk / Action',
        media_url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
        project_url: 'https://vimeo.com/76979871',
        project_outcome: 'Over 500k views on TikTok campaign',
        pipeline: 'Midjourney v6 ➔ Runway Gen-3 ➔ Topaz 4K',
        aspect_ratio: '16:9',
        prompt: 'high speed cinematic drone chase through neo-tokyo neon alleyways, motion blur, anamorphic lens --ar 16:9',
        seed: '992817263'
      };

      const result = await creatorService.addPortfolioItem(testCreatorId, newItemPayload, { forceDemo: true });
      assert.equal(result.success, true);
      assert.ok(result.item);
      assert.equal(result.item.title, newItemPayload.title);
      assert.equal(result.item.creator_role, newItemPayload.creator_role);
      assert.equal(result.item.project_outcome, newItemPayload.project_outcome);

      // CRITICAL: Must be unverified upon upload
      assert.equal(result.item.verified, false, 'Newly uploaded item must never be verified');
      assert.equal(result.item.verification_status, 'not_verified', 'Initial verification_status must be not_verified');
      assert.equal(result.item.verification_scope, null);

      createdItemId = result.item.id;
    });

    test('Submitting a portfolio entry for review transitions state to pending_review', async () => {
      assert.ok(createdItemId);
      const submitRes = await creatorService.submitPortfolioItemForReview(testCreatorId, createdItemId, { forceDemo: true });
      assert.equal(submitRes.success, true);
      assert.equal(submitRes.item.verification_status, 'pending_review');
      assert.equal(submitRes.item.verified, false);
    });

    test('Audit review can approve entry with specific verification scope', async () => {
      assert.ok(createdItemId);
      const reviewRes = await creatorService.reviewPortfolioItem(
        testCreatorId, 
        createdItemId, 
        { decision: 'approve', scope: 'workflow', reviewNotes: 'Prompt parameters reproducible and seed confirmed.' },
        { forceDemo: true }
      );

      assert.equal(reviewRes.success, true);
      assert.equal(reviewRes.item.verified, true);
      assert.equal(reviewRes.item.verification_status, 'verified');
      assert.equal(reviewRes.item.verification_scope, 'workflow');
    });

    test('Modifying critical media or prompt resets verification state to not_verified', async () => {
      assert.ok(createdItemId);
      const updateRes = await creatorService.updatePortfolioItem(
        testCreatorId,
        createdItemId,
        { prompt: 'modified prompt string' },
        { forceDemo: true }
      );

      assert.equal(updateRes.success, true);
      assert.equal(updateRes.item.verified, false, 'Altered prompt must invalidate prior verification');
      assert.equal(updateRes.item.verification_status, 'not_verified');
    });

    test('Deleting a portfolio item removes it cleanly', async () => {
      assert.ok(createdItemId);
      const deleteRes = await creatorService.deletePortfolioItem(testCreatorId, createdItemId, { forceDemo: true });
      assert.equal(deleteRes.success, true);
      assert.equal(deleteRes.deleted_item_id, createdItemId);

      // Confirm item no longer exists
      const creator = await creatorService.getCreator(testCreatorId, { forceDemo: true });
      const found = creator.portfolio_items.find(it => it.id === createdItemId);
      assert.equal(found, undefined, 'Deleted item must no longer exist in creator portfolio');
    });
  });

  // 3. Explainable Matching Score Evidence Trace
  describe('Skill Evidence Trace in Scoring Service', () => {
    test('Calculates skill_evidence_map connecting matched skills to portfolio items', () => {
      const mockCandidate = {
        id: 'creator-test-01',
        name: 'Elena Rostova',
        skills: ['Prompt Engineering', 'Style Consistency', 'Photorealistic Upscaling'],
        primaryTools: ['Runway Gen-3 Alpha', 'Midjourney v6'],
        portfolio_items: [
          {
            id: 'pf-101',
            title: 'Sci-Fi Commercial Reel',
            tool: 'Runway Gen-3 Alpha',
            tools_used: ['Runway Gen-3 Alpha', 'Midjourney v6'],
            skills_used: ['Prompt Engineering', 'Photorealistic Upscaling'],
            media_url: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-glowing-futuristic-device-41805-large.mp4',
            verified: true,
            verification_status: 'verified',
            verification_scope: 'workflow'
          }
        ],
        completedGigs: 45,
        rating: 4.95,
        verified: true,
        verification_status: 'verified_workflow'
      };

      const mockSearchRequest = {
        skills: ['Prompt Engineering', 'Style Consistency'],
        tools: ['Runway Gen-3 Alpha']
      };

      const searchResult = searchService.search([mockCandidate], {
        skills: ['Prompt Engineering', 'Style Consistency'],
        tools: ['Runway Gen-3 Alpha']
      });

      const scoreResult = scoringService.scoreCandidates(searchResult);
      assert.ok(scoreResult.ranked_candidates.length > 0);

      const candidate = scoreResult.ranked_candidates[0];
      assert.ok(candidate.skill_evidence_map, 'Must compute skill_evidence_map');

      // 'Prompt Engineering' is supported by pf-101
      const promptEvidence = candidate.skill_evidence_map['Prompt Engineering'];
      assert.ok(Array.isArray(promptEvidence));
      assert.equal(promptEvidence.length, 1);
      assert.equal(promptEvidence[0].id, 'pf-101');
      assert.equal(promptEvidence[0].verified, true);

      // 'Style Consistency' was not in pf-101 skills_used, so it has 0 items (self-reported claim)
      const styleEvidence = candidate.skill_evidence_map['Style Consistency'];
      assert.ok(Array.isArray(styleEvidence));
      assert.equal(styleEvidence.length, 0, 'Skill without supporting portfolio item must have empty evidence array');
    });
  });

  // 4. Live HTTP Endpoints for Portfolio & URL Validation
  describe('Live HTTP Endpoints', () => {
    test('POST /api/validate-url strictly blocks malicious URIs', async () => {
      const res = await fetch(`${BASE_URL}/api/validate-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'javascript:alert(1)' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.valid, false);
      assert.ok(data.error.includes('Disallowed URL protocol'));
    });

    test('POST /api/validate-url accepts valid secure media URLs', async () => {
      const res = await fetch(`${BASE_URL}/api/validate-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
          requireMedia: true 
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.valid, true);
      assert.ok(data.sanitized);
    });

    test('GET /api/creators/:creatorId/portfolio returns portfolio items', async () => {
      const res = await fetch(`${BASE_URL}/api/creators/c1/portfolio`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.portfolio_items));
    });

    test('POST /api/creators/:creatorId/portfolio validates URL before saving', async () => {
      const badRes = await fetch(`${BASE_URL}/api/creators/c1/portfolio`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token:freelancer:c1'
        },
        body: JSON.stringify({
          title: 'Unsafe Link Test',
          prompt: 'test prompt',
          media_url: 'javascript:alert("hacked")'
        })
      });

      assert.equal(badRes.status, 400);
      const data = await badRes.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes('Disallowed URL protocol'));
    });
  });
});
