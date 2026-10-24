import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { creatorService, normalizeCreator, DatabaseError } from '../services/creatorService.js';
import searchService from '../services/searchService.js';
import scoringService from '../services/scoringService.js';

describe('Supabase Data Integration & Authoritative Data Access', () => {
  const originalEnvDemoMode = process.env.DEMO_MODE;
  let originalClient;

  beforeEach(() => {
    originalClient = creatorService.getSupabaseClient();
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalEnvDemoMode;
    creatorService.setSupabaseClient(originalClient);
  });

  test('Situation 1: Database configured and records found - normalizes, deduplicates, and preserves real verified state', async () => {
    delete process.env.DEMO_MODE;

    const mockRows = [
      {
        id: 'real-fl-1',
        name: 'Elena Rostova',
        title: 'Cinematic AI Director',
        specializations: '["AI Cinema", "Sci-Fi"]',
        skills: 'Prompt Engineering, Camera Tracking',
        ai_tools_models: ['Runway Gen-3 Alpha', 'Midjourney v6'],
        hourly_rate_usd: 145,
        rating: 4.95,
        completed_gigs: 38,
        reputation_score: 98,
        verified: true,
        portfolio_items: [
          {
            id: 'pf-1',
            title: 'Neo Tokyo Teaser',
            tool: 'Runway Gen-3 Alpha',
            prompt: 'Cinematic drone shot of rainy cyberpunk boulevard',
            verified: true
          }
        ]
      },
      // Duplicate record with same id to verify deduplication
      {
        id: 'real-fl-1',
        name: 'Elena Rostova Duplicate',
        verified: true
      },
      {
        id: 'real-fl-2',
        name: 'Marcus Vance',
        title: '3D AI Generalist',
        specialization: 'Product Commercials',
        skills: 'Blender, ComfyUI',
        ai_tools_models: 'ComfyUI, Stable Diffusion',
        hourly_rate_usd: '120',
        verified: false,
        portfolio_items: []
      }
    ];

    const mockSupabase = {
      from: (tableName) => {
        assert.equal(tableName, 'freelancers');
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockRows, error: null })
          })
        };
      }
    };

    creatorService.setSupabaseClient(mockSupabase);

    const result = await creatorService.getCreators();
    assert.equal(result.success, true);
    assert.equal(result.source, 'database');
    assert.equal(result.demo_mode, false);
    assert.equal(result.count, 2); // Deduplicated from 3 to 2
    assert.equal(result.creators.length, 2);

    const [first, second] = result.creators;
    assert.equal(first.id, 'real-fl-1');
    assert.equal(first.name, 'Elena Rostova');
    assert.equal(first.hourly_rate_usd, 145);
    assert.equal(first.verified, true);
    assert.equal(first.is_demo, false);
    assert.equal(first.verification_status, 'verified_workflow');
    assert.ok(Array.isArray(first.specializations));
    assert.ok(first.specializations.includes('AI Cinema'));
    assert.ok(Array.isArray(first.skills));
    assert.ok(first.skills.includes('Prompt Engineering'));
    assert.equal(first.portfolio_items[0].verified, true);

    assert.equal(second.id, 'real-fl-2');
    assert.equal(second.verified, false);
    assert.equal(second.is_demo, false);
    assert.equal(second.verification_status, 'pending_audit');
  });

  test('Situation 2: Database configured but no records found - returns empty list and NEVER silently falls back to demo data', async () => {
    delete process.env.DEMO_MODE;

    const mockSupabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        })
      })
    };

    creatorService.setSupabaseClient(mockSupabase);

    const result = await creatorService.getCreators();
    assert.equal(result.success, true);
    assert.equal(result.source, 'database');
    assert.equal(result.demo_mode, false);
    assert.equal(result.count, 0);
    assert.deepEqual(result.creators, []);
    assert.equal(result.creators.length, 0); // Must be strictly 0, not mock data
  });

  test('Situation 3: Database query or connection failure - throws DatabaseError 503 and NEVER silently returns demo data', async () => {
    delete process.env.DEMO_MODE;

    // Sub-case 3a: Supabase query error returned by API
    const mockSupabaseQueryError = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({
            data: null,
            error: { message: 'relation "freelancers" does not exist', code: '42P01' }
          })
        })
      })
    };

    creatorService.setSupabaseClient(mockSupabaseQueryError);

    await assert.rejects(
      async () => {
        await creatorService.getCreators();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'DATABASE_QUERY_ERROR');
        // Sanitized error - does not expose table structure or internals
        assert.equal(err.message, 'Database query failed. The freelancers service is temporarily unavailable.');
        return true;
      }
    );

    // Sub-case 3b: Network level failure (e.g. connection refused / DNS timeout)
    const mockSupabaseNetworkError = {
      from: () => ({
        select: () => ({
          order: () => Promise.reject(new Error('FetchError: connect ECONNREFUSED 127.0.0.1:54321'))
        })
      })
    };

    creatorService.setSupabaseClient(mockSupabaseNetworkError);

    await assert.rejects(
      async () => {
        await creatorService.getCreators();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'DATABASE_CONNECTION_ERROR');
        assert.equal(err.message, 'Database connection error. Unable to reach Supabase backend.');
        return true;
      }
    );
  });

  test('Situation 4: Database unconfigured when DEMO_MODE is not true - throws DatabaseError 503', async () => {
    delete process.env.DEMO_MODE;
    creatorService.setSupabaseClient(null);

    await assert.rejects(
      async () => {
        await creatorService.getCreators();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'DATABASE_NOT_CONFIGURED');
        assert.match(err.message, /Database connection is not configured/);
        return true;
      }
    );
  });

  test('Situation 5: Explicit DEMO_MODE=true - serves demo fixtures with verified=false and demo_unverified status', async () => {
    process.env.DEMO_MODE = 'true';
    creatorService.setSupabaseClient(null);

    const result = await creatorService.getCreators();
    assert.equal(result.success, true);
    assert.equal(result.source, 'demo');
    assert.equal(result.demo_mode, true);
    assert.ok(result.count > 0);
    assert.ok(result.creators.length > 0);
    assert.ok(result.notice.includes('DEMO MODE'));

    // Crucial requirement: Demo records are NEVER labeled as verified or real users
    for (const creator of result.creators) {
      assert.equal(creator.verified, false, `Demo creator ${creator.name} must not be verified`);
      assert.equal(creator.is_demo, true, `Demo creator ${creator.name} must have is_demo=true`);
      assert.equal(creator.verification_status, 'demo_unverified');

      for (const item of creator.portfolio_items) {
        assert.equal(item.verified, false, `Portfolio item ${item.title} must have verified=false`);
      }
    }
  });

  test('Ensures creator search and scoring share the authoritative data source', async () => {
    // Provide a known custom creator via mock Supabase
    const liveCreator = {
      id: 'supabase-test-unique-id',
      name: 'Custom Supabase Creator',
      title: 'Kling 1.5 Video Specialist',
      specializations: ['Kling Video', 'Hyperrealism'],
      skills: ['Prompt Engineering', 'Kling AI'],
      ai_tools_models: ['Kling 1.5', 'Midjourney v6'],
      content_types: ['Video'],
      output_formats: ['9:16'],
      hourly_rate_usd: 110,
      rating: 4.9,
      reputation_score: 95,
      verified: true
    };

    const mockSupabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [liveCreator], error: null })
        })
      })
    };

    creatorService.setSupabaseClient(mockSupabase);
    delete process.env.DEMO_MODE;

    const data = await creatorService.getCreators();
    assert.equal(data.count, 1);
    assert.equal(data.creators[0].id, 'supabase-test-unique-id');

    // Run search on the authoritative dataset
    const searchRes = searchService.search(data.creators, {
      query: 'Kling 1.5 vertical video',
      tool: 'Kling 1.5',
      aspectRatio: '9:16'
    });

    assert.equal(searchRes.results.length, 1);
    assert.equal(searchRes.results[0].freelancer_id, 'supabase-test-unique-id');

    // Run scoring on the search result
    const scoreRes = scoringService.scoreCandidates(searchRes);
    assert.equal(scoreRes.ranked_candidates.length, 1);
    assert.equal(scoreRes.ranked_candidates[0].freelancer_id, 'supabase-test-unique-id');
    assert.ok(scoreRes.ranked_candidates[0].overall_score > 0);
  });
});
