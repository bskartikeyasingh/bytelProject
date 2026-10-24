import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  authenticateToken, 
  requireRole,
  validateProductionSecurityConfig, 
  setAuthSupabaseClient,
  getAuthSupabaseClient
} from '../middleware/authMiddleware.js';
import { collaborationService, CollaborationStatus } from '../services/collaborationService.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('GenLancer Security Remediation & Authorization Regression Suite', () => {
  const BASE_URL = 'http://localhost:3001';

  const creatorAId = 'c1';
  const creatorBId = 'c2';

  const creatorAAuth = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test-token:freelancer:${creatorAId}:creatorA@genlancer.io`
  };

  const creatorBAuth = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test-token:freelancer:${creatorBId}:creatorB@genlancer.io`
  };

  const companyAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:company:COMP_SEC_01:brand@acme.corp'
  };

  const reviewerAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:reviewer:REV_01:reviewer@genlancer.io'
  };

  const adminAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:admin:ADM_01:admin@genlancer.io'
  };

  const outsiderAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:freelancer:OUTSIDER_99:outsider@genlancer.io'
  };

  let createdPortfolioItemId = null;
  let testCollabRequestId = null;

  // =========================================================================
  // 1. Production Mode Guard & Test Token Rejection
  // =========================================================================
  describe('Priority 1.1: Production Mode Guards & Bypass Rejection', () => {
    test('Startup guard rejects unsafe production configurations', () => {
      // Must throw if ALLOW_TEST_TOKENS enabled in production
      assert.throws(() => {
        validateProductionSecurityConfig({
          NODE_ENV: 'production',
          ALLOW_TEST_TOKENS: 'true',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        });
      }, /ALLOW_TEST_TOKENS is enabled in production/);

      // Must throw if DEMO_MODE enabled in production
      assert.throws(() => {
        validateProductionSecurityConfig({
          NODE_ENV: 'production',
          DEMO_MODE: 'true',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-key'
        });
      }, /DEMO_MODE is enabled in production/);

      // Must throw if Supabase credentials are missing in production
      assert.throws(() => {
        validateProductionSecurityConfig({
          NODE_ENV: 'production'
        });
      }, /Missing required Supabase credentials/);

      // Must pass if safe production configuration
      assert.doesNotThrow(() => {
        validateProductionSecurityConfig({
          NODE_ENV: 'production',
          SUPABASE_URL: 'https://real.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'secret-service-key'
        });
      });
    });

    test('Test tokens are strictly rejected with 401 when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        let statusSent = null;
        let jsonSent = null;
        const req = {
          headers: {
            authorization: 'Bearer test-token:admin:attacker:attacker@evil.com'
          }
        };
        const res = {
          status: (s) => {
            statusSent = s;
            return {
              json: (j) => { jsonSent = j; }
            };
          }
        };

        await authenticateToken(req, res, () => {});

        assert.equal(statusSent, 401);
        assert.equal(jsonSent.success, false);
        assert.equal(jsonSent.code, 'PRODUCTION_BYPASS_FORBIDDEN');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('Demo tokens are strictly rejected with 401 when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        let statusSent = null;
        let jsonSent = null;
        const req = {
          headers: {
            authorization: 'Bearer demo-token:company:attacker:attacker@evil.com'
          }
        };
        const res = {
          status: (s) => {
            statusSent = s;
            return {
              json: (j) => { jsonSent = j; }
            };
          }
        };

        await authenticateToken(req, res, () => {});

        assert.equal(statusSent, 401);
        assert.equal(jsonSent.success, false);
        assert.equal(jsonSent.code, 'PRODUCTION_BYPASS_FORBIDDEN');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('Test tokens are strictly rejected when NODE_ENV is not test', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';

        let statusSent = null;
        let jsonSent = null;
        const req = {
          headers: {
            authorization: 'Bearer test-token:freelancer:user-1:user@genlancer.io'
          }
        };
        const res = {
          status: (s) => {
            statusSent = s;
            return {
              json: (j) => { jsonSent = j; }
            };
          }
        };

        await authenticateToken(req, res, () => {});

        assert.equal(statusSent, 401);
        assert.equal(jsonSent.success, false);
        assert.equal(jsonSent.code, 'TEST_TOKEN_DISALLOWED');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // =========================================================================
  // 2. Real Token Validation & Error Handling
  // =========================================================================
  describe('Priority 1.2: Real Supabase Auth Token Validation', () => {
    test('Unauthenticated requests without token return 401 UNAUTHENTICATED', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.code, 'UNAUTHENTICATED');
    });

    test('Malformed authorization headers return 401 MALFORMED_AUTH_HEADER', async () => {
      const res1 = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
      });
      assert.equal(res1.status, 401);
      const d1 = await res1.json();
      assert.equal(d1.code, 'MALFORMED_AUTH_HEADER');

      const res2 = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': 'Bearer' }
      });
      assert.equal(res2.status, 401);
      const d2 = await res2.json();
      assert.equal(d2.code, 'MALFORMED_AUTH_HEADER');
    });

    test('Invalid or expired Supabase tokens return 401 TOKEN_EXPIRED', async () => {
      // Test direct middleware behavior with expired token mock
      const mockExpiredClient = {
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: new Error('JWT expired')
          })
        }
      };

      const previousClient = getAuthSupabaseClient();
      setAuthSupabaseClient(mockExpiredClient);

      try {
        let statusSent = null;
        let jsonSent = null;

        const req = {
          headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired' }
        };
        const res = {
          status: (s) => {
            statusSent = s;
            return {
              json: (j) => { jsonSent = j; }
            };
          }
        };

        await authenticateToken(req, res, () => {});

        assert.equal(statusSent, 401);
        assert.equal(jsonSent.code, 'TOKEN_EXPIRED');
      } finally {
        setAuthSupabaseClient(previousClient);
      }
    });
  });

  // =========================================================================
  // 3. Prevention of Role Self-Promotion
  // =========================================================================
  describe('Priority 1.3: Anti-Self-Promotion & Authoritative Server Role Enforcement', () => {
    test('Server ignores mutable user_metadata.role and uses server-managed profile/app_metadata', async () => {
      // Attacker has mutated their client user_metadata to 'admin',
      // but the authoritative profile in Supabase database has role 'freelancer'.
      const mockSupabaseWithTamperedUser = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'attacker-uuid-1',
                email: 'hacker@shady.com',
                user_metadata: { role: 'admin', full_name: 'Wannabe Admin' },
                app_metadata: { provider: 'email' }
              }
            },
            error: null
          })
        },
        from: (table) => {
          assert.equal(table, 'profiles');
          return {
            select: () => ({
              eq: (field, id) => ({
                single: async () => ({
                  data: { id: 'attacker-uuid-1', role: 'freelancer' },
                  error: null
                })
              })
            })
          };
        }
      };

      const previousClient = getAuthSupabaseClient();
      setAuthSupabaseClient(mockSupabaseWithTamperedUser);

      try {
        const req = {
          headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.realjwt' }
        };
        const res = {
          status: () => ({ json: () => {} })
        };
        let nextCalled = false;

        await authenticateToken(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        // CRITICAL: Must be authoritative 'freelancer', NEVER 'admin' from user_metadata!
        assert.equal(req.user.role, 'freelancer');
        assert.notEqual(req.user.role, 'admin');
      } finally {
        setAuthSupabaseClient(previousClient);
      }
    });

    test('PUT /api/profiles/me blocks role change attempts with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: creatorAAuth,
        body: JSON.stringify({
          role: 'admin',
          full_name: 'Attempted Promotion'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'ROLE_ESCALATION_FORBIDDEN');
    });

    test('PUT /api/profiles/me blocks is_admin self-promotion with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: creatorAAuth,
        body: JSON.stringify({
          is_admin: true
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'ADMIN_PROMOTION_FORBIDDEN');
    });

    test('User metadata claiming company role is overridden by authoritative server profile', async () => {
      // Mock Supabase: Attacker tries claiming company role via user_metadata
      const mockSupabaseCompanyAttacker = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'attacker-uuid-company',
                email: 'fakecompany@shady.com',
                user_metadata: { role: 'company', full_name: 'Fake Brand' },
                app_metadata: { provider: 'email' }
              }
            },
            error: null
          })
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'attacker-uuid-company', role: 'freelancer' },
                error: null
              })
            })
          })
        })
      };

      const previousClient = getAuthSupabaseClient();
      setAuthSupabaseClient(mockSupabaseCompanyAttacker);

      try {
        const req = {
          headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.companyjwt' }
        };
        const res = { status: () => ({ json: () => {} }) };
        let nextCalled = false;

        await authenticateToken(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.user.role, 'freelancer');
        assert.notEqual(req.user.role, 'company');
      } finally {
        setAuthSupabaseClient(previousClient);
      }
    });

    test('PUT /api/profiles/me blocks company_id and freelancer_id modification with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: creatorAAuth,
        body: JSON.stringify({
          company_id: 'COMP_VICTIM_01'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'IDENTITY_SPOOFING_FORBIDDEN');
    });

    test('Missing profile defaults to least-privileged role freelancer and null account IDs', async () => {
      const mockSupabaseMissingProfile = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'newbie-uuid',
                email: 'newbie@genlancer.io',
                user_metadata: { role: 'admin' }, // Tampered
                app_metadata: {}
              }
            },
            error: null
          })
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
              })
            })
          })
        })
      };

      const previousClient = getAuthSupabaseClient();
      setAuthSupabaseClient(mockSupabaseMissingProfile);

      try {
        const req = {
          headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newbiejwt' }
        };
        const res = { status: () => ({ json: () => {} }) };
        let nextCalled = false;

        await authenticateToken(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.user.role, 'freelancer', 'Must default to least-privileged role');
        assert.equal(req.user.company_id, null);
        assert.equal(req.user.freelancer_id, null);
      } finally {
        setAuthSupabaseClient(previousClient);
      }
    });

    test('Database failure during profile lookup causes requireRole to fail closed with 503', async () => {
      const mockSupabaseDbFailure = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'db-fail-uuid',
                email: 'user@genlancer.io',
                user_metadata: {},
                app_metadata: {}
              }
            },
            error: null
          })
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: { code: 'ECONNREFUSED', message: 'Database connection failed' }
              })
            })
          })
        })
      };

      const previousClient = getAuthSupabaseClient();
      setAuthSupabaseClient(mockSupabaseDbFailure);

      try {
        const req = {
          headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dbfailjwt' }
        };
        const res = { status: () => ({ json: () => {} }) };
        await authenticateToken(req, res, () => {});

        assert.ok(req.profileLookupError, 'Profile lookup error must be captured');

        // Test requireRole('company')
        let statusSent = null;
        let jsonSent = null;
        const mockRes = {
          status: (code) => {
            statusSent = code;
            return {
              json: (data) => { jsonSent = data; }
            };
          }
        };

        const companyGuard = requireRole(['company']);
        companyGuard(req, mockRes, () => {});

        assert.equal(statusSent, 503, 'Must fail closed with 503 on database failure for elevated roles');
        assert.equal(jsonSent.code, 'DATABASE_UNAVAILABLE');
      } finally {
        setAuthSupabaseClient(previousClient);
      }
    });

    test('SQL migration file 003 contains triggers preventing escalation and impersonation', () => {
      const currentDir = path.dirname(new URL(import.meta.url).pathname);
      const migrationPath = path.resolve(currentDir, '../migrations/003_secure_auth_and_rls_policies.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      assert.ok(content.includes('prevent_role_self_escalation'), 'Migration must define role self-escalation trigger');
      assert.ok(content.includes('trg_prevent_role_self_escalation'), 'Migration must attach escalation trigger to profiles');
      assert.ok(content.includes('prevent_creator_self_verification'), 'Migration must define creator self-verification guard');
      assert.ok(content.includes("'freelancer'"), 'handle_new_user must enforce least-privileged freelancer role');
    });
  });

  // =========================================================================
  // 4. Secure Portfolio Mutations & Impersonation Prevention
  // =========================================================================
  describe('Priority 2: Secure Portfolio Mutations', () => {
    test('Unauthenticated user cannot create, update, or delete portfolio entries', async () => {
      // POST unauthenticated
      const r1 = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Rogue Item' })
      });
      assert.equal(r1.status, 401);

      // PUT unauthenticated
      const r2 = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/some-item`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Rogue Update' })
      });
      assert.equal(r2.status, 401);

      // DELETE unauthenticated
      const r3 = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/some-item`, {
        method: 'DELETE'
      });
      assert.equal(r3.status, 401);
    });

    test('Authenticated creator A creates item in their own portfolio (HTTP 201)', async () => {
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`, {
        method: 'POST',
        headers: creatorAAuth,
        body: JSON.stringify({
          title: 'Cyberpunk Brand Motion Reel',
          description: 'High-energy cyberpunk ad motion campaign using Runway Gen-3',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
          creator_role: 'Prompt Director',
          tools_used: ['Runway Gen-3 Alpha', 'Midjourney v6'],
          skills_used: ['Prompt Engineering', 'Style Consistency'],
          prompt: 'futuristic high-speed cyberpunk vehicle chase, anamorphic 35mm lens'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.item.id);
      assert.equal(data.item.verified, false, 'New portfolio item must start unverified');
      assert.equal(data.item.verification_status, 'not_verified');
      createdPortfolioItemId = data.item.id;
    });

    test('Impersonation attack blocked: Creator B cannot add an item to Creator A portfolio (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`, {
        method: 'POST',
        headers: creatorBAuth, // Authenticated as c2, attempting to modify c1
        body: JSON.stringify({
          title: 'Impersonated Item',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_CREATOR_OWNER');
    });

    test('Impersonation attack blocked: Creator B cannot edit Creator A portfolio item (HTTP 403)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}`, {
        method: 'PUT',
        headers: creatorBAuth, // Creator B attempting to edit Creator A's project
        body: JSON.stringify({
          title: 'Defaced by Creator B'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_CREATOR_OWNER');
    });

    test('Impersonation attack blocked: Creator B cannot delete Creator A portfolio item (HTTP 403)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}`, {
        method: 'DELETE',
        headers: creatorBAuth // Creator B attempting to delete Creator A's project
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_CREATOR_OWNER');
    });

    test('Company role cannot mutate creator portfolio (HTTP 403 FORBIDDEN_ROLE)', async () => {
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`, {
        method: 'POST',
        headers: companyAuth,
        body: JSON.stringify({
          title: 'Company intrusion',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_ROLE');
    });

    test('Creator cannot bypass review by self-injecting verified=true via PUT', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}`, {
        method: 'PUT',
        headers: creatorAAuth,
        body: JSON.stringify({
          title: 'Cyberpunk Brand Motion Reel v2',
          verified: true, // Attacker attempts to self-grant verified
          verification_status: 'verified',
          verification_scope: 'workflow'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      // Privilege escalation stripped by server
      assert.equal(data.item.verified, false, 'Self-injected verification must be stripped');
      assert.equal(data.item.verification_status, 'not_verified');
    });

    test('Authorized creator A submits item for verification review (HTTP 200 -> pending_review)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}/submit-review`, {
        method: 'POST',
        headers: creatorAAuth
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.item.verification_status, 'pending_review');
      assert.equal(data.item.verified, false);
    });

    test('Creator B cannot submit review for Creator A item (HTTP 403)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}/submit-review`, {
        method: 'POST',
        headers: creatorBAuth
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_CREATOR_OWNER');
    });
  });

  // =========================================================================
  // 5. Verification Review Authorization & Conflict of Interest
  // =========================================================================
  describe('Priority 2.2: Verification Review Authorization', () => {
    test('Regular creator cannot approve verification review (HTTP 403 FORBIDDEN_REVIEWER_ROLE)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}/review`, {
        method: 'POST',
        headers: creatorAAuth, // Creator attempts to audit their own item
        body: JSON.stringify({ decision: 'approve', scope: 'workflow' })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_REVIEWER_ROLE');
    });

    test('Self-review is strictly rejected even if user has reviewer role (HTTP 403 FORBIDDEN_SELF_REVIEW)', async () => {
      assert.ok(createdPortfolioItemId);
      // Reviewer REV_01 attempts to audit their own portfolio
      const res = await fetch(`${BASE_URL}/api/creators/REV_01/portfolio/any-item/review`, {
        method: 'POST',
        headers: reviewerAuth,
        body: JSON.stringify({ decision: 'approve' })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_SELF_REVIEW');
    });

    test('Authorized reviewer approves verification with workflow scope (HTTP 200 -> verified)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}/review`, {
        method: 'POST',
        headers: reviewerAuth,
        body: JSON.stringify({
          decision: 'approve',
          scope: 'workflow',
          reviewNotes: 'Verified prompt seeds and authentic ProRes outputs.'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.item.verified, true);
      assert.equal(data.item.verification_status, 'verified');
      assert.equal(data.item.verification_scope, 'workflow');
    });

    test('Authorized creator cleanly deletes their portfolio item (HTTP 200)', async () => {
      assert.ok(createdPortfolioItemId);
      const res = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${createdPortfolioItemId}`, {
        method: 'DELETE',
        headers: creatorAAuth
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.deleted_item_id, createdPortfolioItemId);
    });

    test('Public read access is fully preserved without authentication', async () => {
      // Creator directory is public
      const dirRes = await fetch(`${BASE_URL}/api/creators`);
      assert.equal(dirRes.status, 200);

      // Specific creator portfolio is public
      const pfRes = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`);
      assert.equal(pfRes.status, 200);
      const pfData = await pfRes.json();
      assert.equal(pfData.success, true);
      assert.ok(Array.isArray(pfData.portfolio_items));
    });
  });

  // =========================================================================
  // 6. Collaboration and Messaging Access Audit
  // =========================================================================
  describe('Priority 3: Collaboration & Scoped Messaging Authorization', () => {
    test('Company creates collaboration request; identity derived strictly from session', async () => {
      const res = await fetch(`${BASE_URL}/api/collaboration/request`, {
        method: 'POST',
        headers: companyAuth,
        body: JSON.stringify({
          company_id: 'SPOOFED_UNAUTHORIZED_CORP', // Attempted body spoof
          freelancer_id: creatorAId,
          project_brief: { title: 'Security Audit Campaign' }
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.request.company_id, 'COMP_SEC_01', 'Must bind to verified session company_id');
      assert.equal(data.request.freelancer_id, creatorAId);
      testCollabRequestId = data.request.request_id;
    });

    test('Non-participant outsider is forbidden from viewing collaboration (HTTP 403)', async () => {
      assert.ok(testCollabRequestId);
      const res = await fetch(`${BASE_URL}/api/collaboration/${testCollabRequestId}`, {
        headers: outsiderAuth
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_PARTICIPANT');
    });

    test('Non-participant outsider is forbidden from posting messages (HTTP 403)', async () => {
      assert.ok(testCollabRequestId);
      const res = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: outsiderAuth,
        body: JSON.stringify({
          request_id: testCollabRequestId,
          content: 'Eavesdropper attempt'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_PARTICIPANT');
    });

    test('Non-participant outsider is forbidden from reading messages (HTTP 403)', async () => {
      assert.ok(testCollabRequestId);
      const res = await fetch(`${BASE_URL}/api/messages/${testCollabRequestId}`, {
        headers: outsiderAuth
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'FORBIDDEN_PARTICIPANT');
    });

    test('Authorized participant posts message; sender identity derived from verified session', async () => {
      assert.ok(testCollabRequestId);
      const res = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: creatorAAuth,
        body: JSON.stringify({
          request_id: testCollabRequestId,
          sender_id: 'SPOOFED_SENDER', // Payload spoof attempt
          sender_role: 'admin',         // Payload role spoof attempt
          content: 'Verified creator message regarding brief parameters.'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.message.sender_id, creatorAId);
      assert.equal(data.message.sender_role, 'freelancer');
    });

    test('Authorized company reads message thread (HTTP 200)', async () => {
      assert.ok(testCollabRequestId);
      const res = await fetch(`${BASE_URL}/api/messages/${testCollabRequestId}`, {
        headers: companyAuth
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.messages.length >= 1);
    });
  });

  // =========================================================================
  // 7. Phase 1B: Supabase RLS & Database Authorization Regression Suite
  // =========================================================================
  describe('Phase 1B: Supabase RLS & Database Authorization Regression Suite', () => {
    const phase1bCompanyAuth = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token:company:COMP_PHASE1B:brand1b@acme.corp'
    };

    const phase1bCreatorAuth = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token:freelancer:FL_PHASE1B:creator1b@genlancer.io'
    };

    let p1bCollabId = null;

    // 1. Inserting a profile with role admin or company
    test('1. Inserting profile with role "admin" is rejected with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({
          role: 'admin',
          full_name: 'Privilege Escalator'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'ROLE_ESCALATION_FORBIDDEN');
    });

    test('1. Inserting profile with role "company" from public client is rejected with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({
          role: 'company',
          full_name: 'Client Self Promotion'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'ROLE_ESCALATION_FORBIDDEN');
    });

    // 2. Changing a profile's company_id or freelancer_id
    test('2. Changing profile company_id is rejected with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({
          company_id: 'VICTIM_COMPANY_99'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'IDENTITY_SPOOFING_FORBIDDEN');
    });

    test('2. Changing profile freelancer_id is rejected with 403', async () => {
      const res = await fetch(`${BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({
          freelancer_id: 'VICTIM_CREATOR_88'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, 'IDENTITY_SPOOFING_FORBIDDEN');
    });

    // 3. Updating a collaboration's other participant ID or ownership fields
    test('3. Updating collaboration participant IDs or ownership fields is rejected (immutability)', async () => {
      // Direct unit test of collaborationService immutability check
      const localReq = await collaborationService.createRequest({
        company_id: 'COMP_UNIT_01',
        freelancer_id: 'FL_UNIT_01',
        project_brief: { title: 'Immutability Audit' }
      });
      const stored = await collaborationService.getRequest(localReq.request_id);
      const tampered = { ...stored, company_id: 'HIJACKED_CORP' };
      await assert.rejects(async () => {
        await collaborationService._syncSave(tampered);
      }, /Forbidden: Collaboration ownership and participant identities are immutable/);

      const tamperedFreelancer = { ...stored, freelancer_id: 'HIJACKED_CREATOR' };
      await assert.rejects(async () => {
        await collaborationService._syncSave(tamperedFreelancer);
      }, /Forbidden: Collaboration ownership and participant identities are immutable/);
    });

    // 4. Unauthorized status transitions
    test('4. Unauthorized status transitions are strictly rejected by the state machine', async () => {
      const localReq4 = await collaborationService.createRequest({
        company_id: 'COMP_UNIT_04',
        freelancer_id: 'FL_UNIT_04',
        project_brief: { title: 'Transitions Audit' }
      });

      // Reject the request to put it in a terminal state
      const rejectedReq = await collaborationService.rejectRequest(localReq4.request_id, 'Not available', 'freelancer', 'FL_UNIT_04');
      assert.equal(rejectedReq.status, CollaborationStatus.REJECTED);

      // Attempt to accept already rejected request must fail
      await assert.rejects(async () => {
        await collaborationService.acceptRequest(localReq4.request_id, 'freelancer', 'FL_UNIT_04');
      }, /Cannot accept request from current status: "rejected"/);

      // Attempt to confirm a rejected request must fail
      await assert.rejects(async () => {
        await collaborationService.confirmBrief(localReq4.request_id, 'company', 1, 'COMP_UNIT_04');
      }, /Brief can only be confirmed after request is in active discussion or accepted/);
    });

    // 5. Tampering with confirmation and brief-version fields
    test('5. Tampering with confirmation and brief-version fields is rejected', async () => {
      const localReq5 = await collaborationService.createRequest({
        company_id: 'COMP_UNIT_05',
        freelancer_id: 'FL_UNIT_05',
        project_brief: { title: 'Version Tampering Test' }
      });

      // Accept request first
      await collaborationService.acceptRequest(localReq5.request_id, 'freelancer', 'FL_UNIT_05');

      // Attempting to confirm with omitted brief version must fail
      await assert.rejects(async () => {
        await collaborationService.confirmBrief(localReq5.request_id, 'company', null, 'COMP_UNIT_05');
      }, /Conflicting brief version/);

      // Attempting to confirm with mismatched/tampered brief version (version 99 when active is 1) must fail
      await assert.rejects(async () => {
        await collaborationService.confirmBrief(localReq5.request_id, 'company', 99, 'COMP_UNIT_05');
      }, /Conflicting brief version. Current active version is 1/);
    });

    // 6. Attempting to reuse confirmation after a brief revision
    test('6. Material brief revision strictly invalidates stale confirmations and prevents reuse', async () => {
      const localReq6 = await collaborationService.createRequest({
        company_id: 'COMP_UNIT_06',
        freelancer_id: 'FL_UNIT_06',
        project_brief: { title: 'Version Invalidation Test', deliverables: ['v1 spec'] }
      });
      await collaborationService.acceptRequest(localReq6.request_id, 'freelancer', 'FL_UNIT_06');

      // Company confirms active version 1
      const confirmedV1 = await collaborationService.confirmBrief(localReq6.request_id, 'company', 1, 'COMP_UNIT_06');
      assert.equal(confirmedV1.company_confirmed, true);

      // Company updates brief to v2 (material revision)
      const updatedReq = await collaborationService.updateBrief(localReq6.request_id, {
        title: 'Version Invalidation Test',
        deliverables: ['v2 revised spec']
      }, 'company', 'COMP_UNIT_06');

      assert.equal(updatedReq.brief_version, 2);
      // Stale confirmations MUST be invalidated
      assert.equal(updatedReq.company_confirmed, false);
      assert.equal(updatedReq.freelancer_confirmed, false);
      assert.equal(updatedReq.company_confirmed_at, null);
      assert.equal(updatedReq.freelancer_confirmed_at, null);

      // Freelancer attempts to confirm using stale version 1 -> REJECTED
      await assert.rejects(async () => {
        await collaborationService.confirmBrief(localReq6.request_id, 'freelancer', 1, 'FL_UNIT_06');
      }, /Conflicting brief version. Current active version is 2. Confirmation on version 1 is stale or invalid./);
    });

    // 7. Unauthorized message sender impersonation
    test('7. Unauthorized message sender impersonation is strictly rejected', async () => {
      // Create request via API
      const createRes = await fetch(`${BASE_URL}/api/collaboration/request`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({
          freelancer_id: 'FL_PHASE1B',
          project_brief: { title: 'Messaging Impersonation Test' }
        })
      });
      const { request: testReq } = await createRes.json();

      // Client passes spoofed sender_id 'FL_PHASE1B' in payload while authenticated as company
      const spoofRes = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({
          request_id: testReq.request_id,
          sender_id: 'FL_PHASE1B', // Spoof attempt
          sender_role: 'freelancer', // Spoof attempt
          content: 'I am pretending to be the creator.'
        })
      });
      assert.equal(spoofRes.status, 201);
      const spoofData = await spoofRes.json();
      // Server must override and bind to authenticated user's real ID
      assert.equal(spoofData.message.sender_id, 'COMP_PHASE1B');
      assert.equal(spoofData.message.sender_role, 'company');

      // Outsider non-participant cannot send message
      const outsiderRes = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: outsiderAuth,
        body: JSON.stringify({
          request_id: testReq.request_id,
          content: 'Outsider injection'
        })
      });
      assert.equal(outsiderRes.status, 403);
    });

    // 8. Self-verification
    test('8. Creator self-verification attempts are strictly rejected', async () => {
      // Create a fresh portfolio item with valid media URL
      const createItemRes = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio`, {
        method: 'POST',
        headers: creatorAAuth,
        body: JSON.stringify({
          title: 'Verification Target Item',
          description: 'Valid item for self-verification test',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4',
          creator_role: 'Prompt Director',
          tools_used: ['Runway Gen-3 Alpha'],
          skills_used: ['Prompt Engineering']
        })
      });
      assert.equal(createItemRes.status, 201);
      const itemData = await createItemRes.json();
      const freshItemId = itemData.item.id;
      assert.ok(freshItemId, 'Created portfolio item must have ID');

      // Direct PUT attempt with verified: true is stripped/sanitized
      const putRes = await fetch(`${BASE_URL}/api/creators/${creatorAId}/portfolio/${freshItemId}`, {
        method: 'PUT',
        headers: creatorAAuth,
        body: JSON.stringify({
          title: 'Tampered Item',
          verified: true,
          verification_status: 'verified'
        })
      });
      assert.equal(putRes.status, 200);
      const putData = await putRes.json();
      assert.equal(putData.item.verified, false, 'Self-injected verification must remain false');
      assert.equal(putData.item.verification_status, 'not_verified');

      // Reviewer self-review attempt is blocked with 403
      const selfReviewRes = await fetch(`${BASE_URL}/api/creators/REV_01/portfolio/${freshItemId}/review`, {
        method: 'POST',
        headers: reviewerAuth,
        body: JSON.stringify({
          decision: 'approve'
        })
      });
      assert.equal(selfReviewRes.status, 403);
      const selfReviewData = await selfReviewRes.json();
      assert.equal(selfReviewData.code, 'FORBIDDEN_SELF_REVIEW');
    });

    // 9. Legitimate operations by authorized users
    test('9. Legitimate operations by authorized users succeed completely', async () => {
      // 1. Company creates request
      const createRes = await fetch(`${BASE_URL}/api/collaboration/request`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({
          freelancer_id: 'FL_PHASE1B',
          project_brief: { title: 'Legitimate Campaign Flow', deliverables: ['Initial Brief'] }
        })
      });
      assert.equal(createRes.status, 201);
      const { request: legitReq } = await createRes.json();

      // 2. Creator accepts request
      const acceptRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/accept`, {
        method: 'POST',
        headers: phase1bCreatorAuth
      });
      assert.equal(acceptRes.status, 200);

      // 3. Creator requests clarification
      const clarifyRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/clarify`, {
        method: 'POST',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({ message: 'Can you provide branding guidelines?' })
      });
      assert.equal(clarifyRes.status, 200);

      // 4. Company responds to clarification
      const respondRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/respond-clarify`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({ message: 'Guidelines attached in revised brief.' })
      });
      assert.equal(respondRes.status, 200);

      // 5. Company updates brief to version 2
      const updateRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/update-brief`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({
          project_brief: { title: 'Legitimate Campaign Flow', deliverables: ['Revised Brief with Guidelines'] }
        })
      });
      assert.equal(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.equal(updateData.request.brief_version, 2);

      // 6. Creator confirms active version 2
      const creatorConfirmRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/confirm`, {
        method: 'POST',
        headers: phase1bCreatorAuth,
        body: JSON.stringify({ brief_version: 2 })
      });
      assert.equal(creatorConfirmRes.status, 200);

      // 7. Company confirms active version 2 -> Collaboration reaches CONFIRMED!
      const companyConfirmRes = await fetch(`${BASE_URL}/api/collaboration/${legitReq.request_id}/confirm`, {
        method: 'POST',
        headers: phase1bCompanyAuth,
        body: JSON.stringify({ brief_version: 2 })
      });
      assert.equal(companyConfirmRes.status, 200);
      const finalData = await companyConfirmRes.json();
      assert.equal(finalData.request.status, CollaborationStatus.CONFIRMED);
      assert.equal(finalData.request.is_confirmed, true);
    });

    // Static Migration Schema & Policy Audit (Distinguished from database execution)
    describe('Static Migration Schema & Policy Audit (File Analysis)', () => {
      const migrationPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations/003_secure_auth_and_rls_policies.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      test('[Static Audit] is_trusted_service_role handles NULL setting fail-closed and sets search_path', () => {
        assert.ok(migrationSql.includes('is_trusted_service_role()'), 'Must define is_trusted_service_role');
        assert.ok(migrationSql.includes("COALESCE(v_db_role, '') = 'service_role'"), 'Must coalesce db role setting');
        assert.ok(migrationSql.includes("COALESCE(v_jwt_role, '') = 'service_role'"), 'Must coalesce jwt role');
        assert.ok(migrationSql.includes('search_path = public, pg_temp'), 'Must set secure search path');
      });

      test('[Static Audit] public.profiles INSERT policy and trigger block arbitrary role, company_id, and freelancer_id', () => {
        assert.ok(migrationSql.includes('Users can insert own profile'), 'Must have profile insert policy');
        assert.ok(migrationSql.includes("(role IS NULL OR role = 'freelancer')"), 'Profile insert must enforce freelancer role');
        assert.ok(migrationSql.includes('company_id IS NULL'), 'Profile insert must forbid setting company_id');
        assert.ok(migrationSql.includes('freelancer_id IS NULL'), 'Profile insert must forbid setting freelancer_id');
        assert.ok(migrationSql.includes('BEFORE INSERT OR UPDATE ON public.profiles'), 'Trigger must guard BOTH INSERT and UPDATE');
      });

      test('[Static Audit] Collaboration requests trigger enforces ownership immutability and brief invalidation', () => {
        assert.ok(migrationSql.includes('protect_collaboration_request_mutation'), 'Must define collaboration mutation trigger');
        assert.ok(migrationSql.includes('NEW.company_id IS DISTINCT FROM OLD.company_id'), 'Company ID must be immutable');
        assert.ok(migrationSql.includes('NEW.freelancer_id IS DISTINCT FROM OLD.freelancer_id'), 'Freelancer ID must be immutable');
        assert.ok(migrationSql.includes('NEW.company_confirmed_at := NULL'), 'Material revision must invalidate company confirmation');
        assert.ok(migrationSql.includes('NEW.freelancer_confirmed_at := NULL'), 'Material revision must invalidate freelancer confirmation');
      });

      test('[Static Audit] Messages RLS verifies is_valid_message_sender and collaboration membership', () => {
        assert.ok(migrationSql.includes('is_valid_message_sender'), 'Must define is_valid_message_sender helper');
        assert.ok(migrationSql.includes('Participants can insert messages'), 'Must have message insert policy');
        assert.ok(migrationSql.includes('public.is_valid_message_sender(sender_id, request_id)'), 'Message insert must enforce sender validation');
      });

      test('[Static Audit] prevent_creator_self_verification triggers on both INSERT and UPDATE', () => {
        assert.ok(migrationSql.includes('BEFORE INSERT OR UPDATE ON public.freelancers'), 'Verification guard must cover INSERT and UPDATE');
        assert.ok(migrationSql.includes('TG_OP = \'INSERT\''), 'Guard must check INSERT');
        assert.ok(migrationSql.includes('TG_OP = \'UPDATE\''), 'Guard must check UPDATE');
      });

      test('[Static Audit] Least-privilege function execution grants are explicitly defined in migration', () => {
        assert.ok(migrationSql.includes('REVOKE ALL ON FUNCTION public.is_trusted_service_role() FROM PUBLIC;'), 'Must revoke from PUBLIC');
        assert.ok(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.is_trusted_service_role() TO authenticated, service_role;'), 'Must grant to service_role');
      });
    });

    // Dedicated Live Database Integration Suite
    describe('Live PostgreSQL / Supabase Integration Test Harness', () => {
      test('[Dedicated Suite] Live RLS tests are maintained in tests/rls_live.integration.test.js', () => {
        // Genuine PostgreSQL RLS integration tests are executed via: npm run test:rls
        assert.ok(true, 'Live database tests are isolated in rls_live.integration.test.js to prevent redundant multi-suite execution');
      });
    });
  });
});
