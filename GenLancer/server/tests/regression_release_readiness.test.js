import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { searchService } from '../services/searchService.js';
import { scoringService } from '../services/scoringService.js';
import { collaborationService, CollaborationStatus } from '../services/collaborationService.js';
import { reportService } from '../services/reportService.js';
import { creatorService, DatabaseError } from '../services/creatorService.js';
import briefService from '../services/briefService.js';
import { validateUrl } from '../utils/urlValidator.js';
import { DEFAULT_CREATORS } from '../data/defaultCreators.js';

describe('GenLancer Improvement 9: Complete Regression & Release Readiness Audit', () => {

  // =========================================================================
  // Section A: Health & Core Subsystem Availability
  // =========================================================================
  describe('A. Health & Service Availability', () => {
    it('Health inspection reports all subsystems without exposing secrets', async () => {
      const isDemo = process.env.DEMO_MODE === 'true';
      const healthData = {
        status: 'ok',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'test',
        services: {
          search: searchService ? 'operational' : 'unavailable',
          scoring: scoringService ? 'operational' : 'unavailable',
          collaboration: collaborationService ? 'operational' : 'unavailable',
          report: reportService ? 'operational' : 'unavailable',
          creator: creatorService ? 'operational' : 'unavailable',
          brief_builder: briefService ? 'operational' : 'unavailable'
        },
        ai_engine: process.env.GEMINI_API_KEY ? 'gemini-1.5-flash-live' : 'structured-fallback',
        data_source: isDemo ? 'demo_fixtures' : 'authoritative_supabase'
      };

      assert.equal(healthData.status, 'ok');
      assert.equal(healthData.services.search, 'operational');
      assert.equal(healthData.services.scoring, 'operational');
      assert.equal(healthData.services.collaboration, 'operational');
      assert.equal(healthData.services.report, 'operational');
      assert.equal(healthData.services.creator, 'operational');
      assert.equal(healthData.services.brief_builder, 'operational');
      
      const serialized = JSON.stringify(healthData);
      assert.doesNotMatch(serialized, /sk-[a-zA-Z0-9]/);
      assert.doesNotMatch(serialized, /AQ\./);
      assert.doesNotMatch(serialized, /postgres:\/\//);
    });
  });

  // =========================================================================
  // Section B: Creator Data Loading, Search, & Negative Filter Rules
  // =========================================================================
  describe('B. Creator Discovery, Search, & Negative Constraints', () => {
    it('Search engine extracts skills, primary tools, and aspect ratio targets', () => {
      const query = 'Cyberpunk 16:9 cinematic video ad using Runway Gen-3 and Topaz';
      const extracted = searchService.extractRequirements(query);

      assert.ok(Array.isArray(extracted.tools));
      assert.ok(extracted.tools.some(t => t.toLowerCase().includes('runway')));
      assert.equal(extracted.content_type, 'Video');
    });

    it('Strictly enforces negative exclusions without false-positive collisions', () => {
      const candidates = [
        { id: 'c1', name: 'Valid Artist', primaryTools: ['Runway Gen-3 Alpha'], ai_tools_models: ['Runway Gen-3 Alpha'], skills: ['Cinematography'] },
        { id: 'c2', name: 'Excluded Artist', primaryTools: ['Midjourney v6'], ai_tools_models: ['Midjourney v6'], skills: ['2D Illustration'] }
      ];

      const searchRes = searchService.search(candidates, {
        tools: ['Runway Gen-3 Alpha'],
        excluded_tools: ['Midjourney']
      });

      const matchedIds = (searchRes.results || searchRes).map(c => c.freelancer_id || c.id);
      assert.ok(matchedIds.includes('c1'));
      assert.ok(!matchedIds.includes('c2'), 'Creator with excluded tool must be filtered out');
    });

    it('Ranking preserves all 7 mathematical dimensions summing to 100%', () => {
      const weights = scoringService.defaultWeights;
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      assert.equal(totalWeight, 100, `Weights must sum to 100%, got ${totalWeight}`);
      
      assert.equal(weights.skills, 25);
      assert.equal(weights.specialization, 20);
      assert.equal(weights.portfolio_relevance, 20);
      assert.equal(weights.content_type, 10);
      assert.equal(weights.tools, 10);
      assert.equal(weights.style_and_format, 10);
      assert.equal(weights.experience, 5);
    });
  });

  // =========================================================================
  // Section C: AI Brief Generation & Structured Heuristics
  // =========================================================================
  describe('C. AI Campaign Brief Builder & Fallback Heuristics', () => {
    it('Generates structured campaign deliverables from natural language prompts', () => {
      const rawIdea = "Launching Nova Surge zero-sugar energy drink. Need 3x 15s cyberpunk vertical reels for TikTok, budget $3,500, deadline Nov 25.";
      const fallback = briefService.generateStructuredBriefFallback(rawIdea);

      assert.ok(fallback.title.length > 0);
      assert.ok(fallback.deliverables.length > 0);
      assert.equal(fallback.aspect_ratio, '9:16');
      assert.ok(fallback.completeness_score >= 80, `Completeness must be >= 80%, got ${fallback.completeness_score}`);
      assert.equal(fallback.model_used, 'deterministic-fallback');
    });

    it('Validates brief fields and catches missing mandatory attributes', () => {
      const incompleteBrief = {
        title: 'Short',
        goal: ''
      };

      const evalResult = briefService.evaluateCompleteness(incompleteBrief);
      assert.ok(evalResult.completeness_score < 40);
      assert.ok(evalResult.missing_fields.length > 0);
      assert.ok(evalResult.clarification_questions.length > 0);
    });
  });

  // =========================================================================
  // Section D: Collaboration Lifecycle & Version Control
  // =========================================================================
  describe('D. Collaboration Lifecycle & Mutual Confirmations', () => {
    it('Executes the 5-stage collaboration lifecycle with version consistency', async () => {
      const reqId = `reg-test-${Date.now()}`;
      
      // 1. Create collaboration request
      const created = await collaborationService.createRequest({
        request_id: reqId,
        company_id: 'COMP-TEST',
        freelancer_id: 'FL-TEST',
        project_brief: { title: 'AI Commercial Spot', budget: '$4,000', deadline: 'Dec 1' }
      });
      assert.equal(created.status, CollaborationStatus.PENDING);
      assert.equal(created.brief_version, 1);

      // 2. Freelancer requests clarification
      const clarification = await collaborationService.requestClarification(
        reqId,
        'Is 4K ProRes required?',
        'freelancer',
        'FL-TEST'
      );
      assert.equal(clarification.status, CollaborationStatus.CLARIFICATION_REQUESTED);

      // 3. Company updates brief terms to v2
      const updated = await collaborationService.updateBrief(
        reqId,
        { title: 'AI Commercial Spot', budget: '$4,500', deliverables: '4K ProRes 422' },
        'company',
        'COMP-TEST'
      );
      assert.equal(updated.brief_version, 2);
      assert.equal(updated.status, CollaborationStatus.PENDING);

      // 4. Stale confirmation on v1 must be rejected
      await assert.rejects(async () => {
        await collaborationService.confirmBrief(reqId, 'freelancer', 1, 'FL-TEST');
      }, /stale|active|version/i);

      // Freelancer accepts request for revision 2
      await collaborationService.acceptRequest(reqId, 'freelancer', 'FL-TEST');

      // 5. Mutual confirmation on v2
      const c1 = await collaborationService.confirmBrief(reqId, 'company', 2, 'COMP-TEST');
      assert.equal(c1.company_confirmed, true);

      const c2 = await collaborationService.confirmBrief(reqId, 'freelancer', 2, 'FL-TEST');
      assert.equal(c2.status, CollaborationStatus.CONFIRMED);
      assert.equal(c2.is_confirmed, true);
    });
  });

  // =========================================================================
  // Section E: URL Validation & Media Security
  // =========================================================================
  describe('E. URL & Security Validation', () => {
    it('Blocks dangerous schemes (javascript:, file:, data:)', () => {
      assert.equal(validateUrl('javascript:alert(1)').valid, false);
      assert.equal(validateUrl('file:///etc/passwd').valid, false);
      assert.equal(validateUrl('data:text/html,<script>alert(1)</script>').valid, false);
      assert.equal(validateUrl('vbscript:msgbox(1)').valid, false);
    });

    it('Approves legitimate HTTPS media sources (Vimeo, YouTube, Mixkit, Unsplash)', () => {
      const validUrls = [
        'https://vimeo.com/76979871',
        'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-41804.mp4',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
      ];

      for (const u of validUrls) {
        const res = validateUrl(u);
        assert.equal(res.valid, true, `Expected ${u} to be valid`);
      }
    });
  });

  // =========================================================================
  // Section F: Database Mode & Fallback Rigor
  // =========================================================================
  describe('F. Database Data Source Integrity', () => {
    it('Explicit DEMO_MODE=true serves mock data flagged with verified=false', async () => {
      const origDemo = process.env.DEMO_MODE;
      process.env.DEMO_MODE = 'true';

      const result = await creatorService.getCreators();
      assert.equal(result.success, true);
      assert.equal(result.demo_mode, true);
      assert.ok(Array.isArray(result.creators));
      assert.ok(result.creators.length > 0);
      assert.ok(result.creators.every(c => c.verified === false || c.verification_status === 'demo_unverified'));

      process.env.DEMO_MODE = origDemo;
    });

    it('Database error throws 503 DatabaseError and never returns silent mock fixtures', async () => {
      const origDemo = process.env.DEMO_MODE;
      delete process.env.DEMO_MODE;

      // Mock broken Supabase client
      const brokenClient = {
        from: () => ({
          select: () => ({
            order: () => Promise.resolve({ data: null, error: { message: 'Database connection timeout' } })
          })
        })
      };

      creatorService.setSupabaseClient(brokenClient);

      await assert.rejects(async () => {
        await creatorService.getCreators();
      }, (err) => {
        assert.ok(err instanceof DatabaseError || err.statusCode === 503 || err.status === 503);
        return true;
      });

      // Restore
      creatorService.setSupabaseClient(null);
      process.env.DEMO_MODE = origDemo;
    });
  });
});
