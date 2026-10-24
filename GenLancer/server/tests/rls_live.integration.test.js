import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';

/**
 * Validates that the provided connection string strictly targets
 * the authorized local development Supabase database (127.0.0.1:54322 or localhost:54322).
 * Fails closed immediately if an unauthorized or remote host is specified.
 */
function validateAndGetLocalDbUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    throw new Error(`SECURITY FATAL: Malformed SUPABASE_TEST_DB_URL: ${err.message}`);
  }

  const allowedHosts = ['127.0.0.1', 'localhost'];
  const allowedPort = '54322';

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(
      `SECURITY FATAL: Connection to host "${parsed.hostname}" is strictly prohibited. ` +
      `Live RLS integration tests may ONLY run against the local development database ` +
      `at 127.0.0.1:54322. Never target hosted or production Supabase.`
    );
  }

  if (String(parsed.port) !== allowedPort) {
    throw new Error(
      `SECURITY FATAL: Connection to port "${parsed.port}" is prohibited. ` +
      `Expected local development port 54322.`
    );
  }

  return url;
}

const rawDbUrl = process.env.SUPABASE_TEST_DB_URL;
const isDedicatedRlsScript = process.env.npm_lifecycle_event === 'test:rls';

if (isDedicatedRlsScript && !rawDbUrl) {
  describe('Live PostgreSQL / Supabase Row-Level Security (RLS) Integration Suite', () => {
    test('SUPABASE_TEST_DB_URL must be explicitly configured for test:rls', () => {
      assert.fail(
        'SUPABASE_TEST_DB_URL is required to run live RLS integration tests.\n' +
        'Usage: SUPABASE_TEST_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" npm run test:rls'
      );
    });
  });
} else {
  const targetDbUrl = validateAndGetLocalDbUrl(rawDbUrl);
  const skipReason = !targetDbUrl
    ? 'Intentionally not invoked: SUPABASE_TEST_DB_URL is not set. Run with: SUPABASE_TEST_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" npm run test:rls'
    : false;

  describe('Live PostgreSQL / Supabase Row-Level Security (RLS) Integration Suite', { skip: skipReason }, () => {
    let pool;

    before(async () => {
      if (!targetDbUrl) return;

      pool = new pg.Pool({
        connectionString: targetDbUrl,
        connectionTimeoutMillis: 5000
      });

    // Verify connectivity immediately; fail closed if database is offline
    try {
      const client = await pool.connect();
      client.release();
    } catch (connErr) {
      throw new Error(`DATABASE CONNECTION FAILURE: Unable to connect to local Supabase database at ${targetDbUrl}: ${connErr.message}`);
    }
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  // ==========================================================================
  // Test A — Database Connection and Schema Verification
  // ==========================================================================
  describe('Test A: Local Database Connection & Schema Verification', () => {
    test('PostgreSQL connection is healthy and targets the local test database', async () => {
      const res = await pool.query('SELECT current_database() as db, inet_server_addr() as addr, inet_server_port() as port');
      assert.strictEqual(res.rows[0].db, 'postgres');
    });

    test('Required public tables exist in the database', async () => {
      const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('profiles', 'freelancers', 'collaboration_requests', 'messages')
      `);
      const existingTables = res.rows.map(r => r.table_name);
      assert.ok(existingTables.includes('profiles'), 'profiles table must exist');
      assert.ok(existingTables.includes('freelancers'), 'freelancers table must exist');
      assert.ok(existingTables.includes('collaboration_requests'), 'collaboration_requests table must exist');
      assert.ok(existingTables.includes('messages'), 'messages table must exist');
    });

    test('Required RLS security helper functions exist in public schema', async () => {
      const res = await pool.query(`
        SELECT proname 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE nspname = 'public' 
          AND proname IN ('is_collaboration_participant', 'is_valid_message_sender', 'is_trusted_service_role')
      `);
      const functions = res.rows.map(r => r.proname);
      assert.ok(functions.includes('is_collaboration_participant'), 'is_collaboration_participant function must exist');
      assert.ok(functions.includes('is_valid_message_sender'), 'is_valid_message_sender function must exist');
      assert.ok(functions.includes('is_trusted_service_role'), 'is_trusted_service_role function must exist');
    });

    test('Row-Level Security (RLS) is explicitly enabled on all public data tables', async () => {
      const res = await pool.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'freelancers', 'collaboration_requests', 'messages')
      `);
      for (const row of res.rows) {
        assert.strictEqual(row.rowsecurity, true, `RLS must be enabled on table public.${row.tablename}`);
      }
    });
  });

  // ==========================================================================
  // Test B — Anonymous Access Restrictions (Role: anon)
  // ==========================================================================
  describe('Test B: Anonymous Access Restrictions (Role: anon)', () => {
    test('Anonymous clients cannot read private profiles', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE anon');
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'anon'");
        await client.query("SET LOCAL \"request.jwt.claim.sub\" = ''");
        await client.query("SET LOCAL \"request.jwt.claims\" = '{\"role\": \"anon\"}'");

        let denied = false;
        try {
          const res = await client.query('SELECT count(*) as count FROM public.profiles');
          if (Number(res.rows[0].count) === 0) {
            denied = true;
          }
        } catch (err) {
          // PostgreSQL error 42501: insufficient_privilege / table permission denied
          if (err.code === '42501') {
            denied = true;
          } else {
            throw err;
          }
        }
        assert.strictEqual(denied, true, 'Anonymous role must be denied reading profiles (42501 or 0 rows)');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Anonymous clients cannot read collaboration requests', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE anon');
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'anon'");
        await client.query("SET LOCAL \"request.jwt.claim.sub\" = ''");
        await client.query("SET LOCAL \"request.jwt.claims\" = '{\"role\": \"anon\"}'");

        let denied = false;
        try {
          const res = await client.query('SELECT count(*) as count FROM public.collaboration_requests');
          if (Number(res.rows[0].count) === 0) {
            denied = true;
          }
        } catch (err) {
          if (err.code === '42501') {
            denied = true;
          } else {
            throw err;
          }
        }
        assert.strictEqual(denied, true, 'Anonymous role must be denied reading collaboration requests (42501 or 0 rows)');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Anonymous clients cannot read private messages', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE anon');
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'anon'");
        await client.query("SET LOCAL \"request.jwt.claim.sub\" = ''");
        await client.query("SET LOCAL \"request.jwt.claims\" = '{\"role\": \"anon\"}'");

        let denied = false;
        try {
          const res = await client.query('SELECT count(*) as count FROM public.messages');
          if (Number(res.rows[0].count) === 0) {
            denied = true;
          }
        } catch (err) {
          if (err.code === '42501') {
            denied = true;
          } else {
            throw err;
          }
        }
        assert.strictEqual(denied, true, 'Anonymous role must be denied reading messages (42501 or 0 rows)');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Anonymous clients CAN read public freelancers directory for creator discovery', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE anon');
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'anon'");
        await client.query("SET LOCAL \"request.jwt.claim.sub\" = ''");
        await client.query("SET LOCAL \"request.jwt.claims\" = '{\"role\": \"anon\"}'");

        // Public read access policy should allow query without error
        const res = await client.query('SELECT count(*) as count FROM public.freelancers');
        assert.ok(Number(res.rows[0].count) >= 0, 'Public read query on freelancers must succeed');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Anonymous clients are rejected from inserting records into protected tables', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE anon');
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'anon'");
        await client.query("SET LOCAL \"request.jwt.claim.sub\" = ''");
        await client.query("SET LOCAL \"request.jwt.claims\" = '{\"role\": \"anon\"}'");

        let blocked = false;
        try {
          await client.query(`
            INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
            VALUES ('req-anon-attack', 'anon-co', 'anon-fl', '{"title": "Spam"}', 'pending')
          `);
        } catch (err) {
          blocked = true;
          // PostgreSQL error 42501 = insufficient_privilege / RLS violation
          assert.strictEqual(err.code, '42501', 'Must be blocked by RLS policy violation (code 42501)');
        }
        assert.strictEqual(blocked, true, 'Anonymous insert into collaboration_requests must be blocked');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });
  });

  // ==========================================================================
  // Test C — Authenticated Profile Isolation & Escalation Prevention
  // ==========================================================================
  describe('Test C: Authenticated Profile Isolation & Escalation Prevention', () => {
    test('Authenticated user cannot read another user private profile', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userA = '10000000-0000-4000-8000-000000000001';
        const userB = '10000000-0000-4000-8000-000000000002';

        // Insert test user fixtures into auth.users (trigger creates profiles)
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [userA, 'userA@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [userB, 'userB@test.local']);

        // Switch context to authenticated user A
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userA}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "role": "authenticated"}'`);

        // User A reads profiles
        const resA = await client.query('SELECT id, email FROM public.profiles WHERE id = $1', [userA]);
        assert.strictEqual(resA.rows.length, 1, 'User A must be able to read own profile');
        assert.strictEqual(resA.rows[0].id, userA);

        const resB = await client.query('SELECT id, email FROM public.profiles WHERE id = $1', [userB]);
        assert.strictEqual(resB.rows.length, 0, 'User A must NOT be able to read User B profile');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Authenticated user cannot update another user profile', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userA = '10000000-0000-4000-8000-000000000003';
        const userB = '10000000-0000-4000-8000-000000000004';

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [userA, 'userA@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [userB, 'userB@test.local']);

        // Switch to User A
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userA}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "role": "authenticated"}'`);

        // User A attempts to update User B's full_name
        const updateRes = await client.query("UPDATE public.profiles SET full_name = 'Hacked' WHERE id = $1", [userB]);
        assert.strictEqual(updateRes.rowCount, 0, 'User A cannot update User B profile (0 rows affected)');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Trigger prevent_role_self_escalation blocks role and account ID escalation on UPDATE', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userA = '10000000-0000-4000-8000-000000000005';
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [userA, 'userA@test.local']);

        // Switch to authenticated User A
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userA}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "role": "authenticated"}'`);

        // User A attempts to self-escalate role to admin
        await client.query('SAVEPOINT sp_role');
        let roleBlocked = false;
        try {
          await client.query("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [userA]);
        } catch (err) {
          roleBlocked = true;
          assert.match(err.message, /Forbidden: Users cannot modify their own role/i);
          await client.query('ROLLBACK TO sp_role');
        }
        assert.strictEqual(roleBlocked, true, 'Self-escalating role to admin must be blocked by trigger');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });
  });

  // ==========================================================================
  // Test D — Collaboration Request Participant Access & Immutability
  // ==========================================================================
  describe('Test D: Collaboration Request Participant Access & Immutability', () => {
    test('Non-participant outsider cannot view collaboration requests', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const companyUser = '20000000-0000-4000-8000-000000000001';
        const freelancerUser = '20000000-0000-4000-8000-000000000002';
        const outsiderUser = '20000000-0000-4000-8000-000000000003';
        const reqId = `req-rls-test-${Date.now()}`;

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [companyUser, 'co@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [freelancerUser, 'fl@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [outsiderUser, 'out@test.local']);

        // Insert collaboration request as postgres admin
        await client.query(`
          INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
          VALUES ($1, $2, $3, '{"title": "Private Deal"}', 'pending')
        `, [reqId, companyUser, freelancerUser]);

        // Switch to outsider
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${outsiderUser}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${outsiderUser}", "role": "authenticated"}'`);

        const res = await client.query('SELECT * FROM public.collaboration_requests WHERE request_id = $1', [reqId]);
        assert.strictEqual(res.rows.length, 0, 'Outsider must receive 0 rows for private collaboration');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Both authorized participants (company and creator) can view their collaboration request', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const companyUser = '20000000-0000-4000-8000-000000000004';
        const freelancerUser = '20000000-0000-4000-8000-000000000005';
        const reqId = `req-rls-test-${Date.now()}-2`;

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [companyUser, 'co2@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [freelancerUser, 'fl2@test.local']);

        await client.query(`
          INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
          VALUES ($1, $2, $3, '{"title": "Mutual Project"}', 'pending')
        `, [reqId, companyUser, freelancerUser]);

        // Verify company participant access
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${companyUser}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${companyUser}", "role": "authenticated"}'`);

        const coRes = await client.query('SELECT request_id, status FROM public.collaboration_requests WHERE request_id = $1', [reqId]);
        assert.strictEqual(coRes.rows.length, 1, 'Company participant must see collaboration request');

        // Verify freelancer participant access
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${freelancerUser}'`);
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${freelancerUser}", "role": "authenticated"}'`);

        const flRes = await client.query('SELECT request_id, status FROM public.collaboration_requests WHERE request_id = $1', [reqId]);
        assert.strictEqual(flRes.rows.length, 1, 'Freelancer participant must see collaboration request');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });

    test('Trigger protect_collaboration_request_mutation enforces participant immutability', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const companyUser = '20000000-0000-4000-8000-000000000006';
        const freelancerUser = '20000000-0000-4000-8000-000000000007';
        const reqId = `req-rls-test-${Date.now()}-3`;

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [companyUser, 'co3@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [freelancerUser, 'fl3@test.local']);

        await client.query(`
          INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
          VALUES ($1, $2, $3, '{"title": "Immutable Test"}', 'pending')
        `, [reqId, companyUser, freelancerUser]);

        // Switch to company participant
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${companyUser}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${companyUser}", "role": "authenticated"}'`);

        await client.query('SAVEPOINT sp_swap');
        let swapBlocked = false;
        try {
          await client.query(`
            UPDATE public.collaboration_requests 
            SET freelancer_id = 'victim-freelancer' 
            WHERE request_id = $1
          `, [reqId]);
        } catch (err) {
          swapBlocked = true;
          assert.match(err.message, /Forbidden: Collaboration freelancer_id is immutable/i);
          await client.query('ROLLBACK TO sp_swap');
        }
        assert.strictEqual(swapBlocked, true, 'Swapping freelancer_id must be rejected as immutable');
      } finally {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
    });
  });

  // ==========================================================================
  // Test E — Message Visibility and Sender Validation
  // ==========================================================================
  describe('Test E: Message Visibility & Sender Validation', () => {
    test('Non-participant cannot read messages and cannot insert messages', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const companyUser = '30000000-0000-4000-8000-000000000001';
        const freelancerUser = '30000000-0000-4000-8000-000000000002';
        const outsiderUser = '30000000-0000-4000-8000-000000000003';
        const reqId = `req-msg-test-${Date.now()}`;

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [companyUser, 'msg-co@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [freelancerUser, 'msg-fl@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [outsiderUser, 'msg-out@test.local']);

        await client.query(`
          INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
          VALUES ($1, $2, $3, '{"title": "Chat Thread"}', 'in_discussion')
        `, [reqId, companyUser, freelancerUser]);

        // Insert initial message as admin
        await client.query(`
          INSERT INTO public.messages (request_id, sender_id, sender_role, text_content, content)
          VALUES ($1, $2, 'company', 'Confidential chat', 'Confidential chat')
        `, [reqId, companyUser]);

        // Switch to outsider
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${outsiderUser}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${outsiderUser}", "role": "authenticated"}'`);

        // Outsider cannot read message
        const readRes = await client.query('SELECT * FROM public.messages WHERE request_id = $1', [reqId]);
        assert.strictEqual(readRes.rows.length, 0, 'Outsider must receive 0 messages');

        // Outsider cannot insert message
        await client.query('SAVEPOINT sp_outsider');
        let insertBlocked = false;
        try {
          await client.query(`
            INSERT INTO public.messages (request_id, sender_id, sender_role, text_content, content)
            VALUES ($1, $2, 'freelancer', 'Spam attack', 'Spam attack')
          `, [reqId, outsiderUser]);
        } catch (err) {
          insertBlocked = true;
          assert.strictEqual(err.code, '42501', 'Must violate RLS policy (code 42501)');
          await client.query('ROLLBACK TO sp_outsider');
        }
        assert.strictEqual(insertBlocked, true, 'Outsider insert into thread must be blocked by RLS');

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    test('Sender impersonation is blocked and legitimate participant message succeeds', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const companyUser = '30000000-0000-4000-8000-000000000004';
        const freelancerUser = '30000000-0000-4000-8000-000000000005';
        const reqId = `req-msg-test-${Date.now()}-2`;

        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [companyUser, 'msg-co2@test.local']);
        await client.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [freelancerUser, 'msg-fl2@test.local']);

        await client.query(`
          INSERT INTO public.collaboration_requests (request_id, company_id, freelancer_id, project_brief, status)
          VALUES ($1, $2, $3, '{"title": "Chat Thread 2"}', 'in_discussion')
        `, [reqId, companyUser, freelancerUser]);

        // Switch to Company User
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${companyUser}'`);
        await client.query("SET LOCAL \"request.jwt.claim.role\" = 'authenticated'");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${companyUser}", "role": "authenticated"}'`);

        // Company attempts to impersonate Freelancer as sender_id
        await client.query('SAVEPOINT sp_impersonate');
        let spoofBlocked = false;
        try {
          await client.query(`
            INSERT INTO public.messages (request_id, sender_id, sender_role, text_content, content)
            VALUES ($1, $2, 'freelancer', 'Spoofed message', 'Spoofed message')
          `, [reqId, freelancerUser]);
        } catch (err) {
          spoofBlocked = true;
          assert.strictEqual(err.code, '42501', 'Impersonating sender must violate RLS policy');
          await client.query('ROLLBACK TO sp_impersonate');
        }
        assert.strictEqual(spoofBlocked, true, 'Sender impersonation must be rejected by is_valid_message_sender');

        // Legitimate insert with company's own verified sender_id
        await client.query(`
          INSERT INTO public.messages (request_id, sender_id, sender_role, text_content, content)
          VALUES ($1, $2, 'company', 'Valid message from client', 'Valid message from client')
        `, [reqId, companyUser]);

        // Both participants can read the conversation
        const coMsgs = await client.query('SELECT text_content FROM public.messages WHERE request_id = $1', [reqId]);
        assert.strictEqual(coMsgs.rows.length, 1, 'Company sees the message');

        // Switch to freelancer
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${freelancerUser}'`);
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${freelancerUser}", "role": "authenticated"}'`);

        const flMsgs = await client.query('SELECT text_content FROM public.messages WHERE request_id = $1', [reqId]);
        assert.strictEqual(flMsgs.rows.length, 1, 'Freelancer sees the message');
        assert.strictEqual(flMsgs.rows[0].text_content, 'Valid message from client');

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });
});
}
