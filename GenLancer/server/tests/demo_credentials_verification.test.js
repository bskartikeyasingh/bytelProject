import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

describe('Demo Login Credentials Verification Suite', () => {
  const SUPABASE_URL = 'https://mjousyabcftwlbaegbaq.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_4S-CVVWg34SgSjeBzE-wCw_XwRP1wxv';
  const BASE_URL = 'http://localhost:3001';

  const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  test('1. Freelancer / AI Creator demo account can authenticate and receives creator role', async () => {
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: 'creator@genlancer.io',
      password: 'pass123456'
    });

    assert.equal(error, null, `Sign in should not return error: ${error?.message}`);
    assert.ok(data.session?.access_token, 'Session access token must be present');
    assert.equal(data.user.email, 'creator@genlancer.io');
    assert.equal(data.user.user_metadata?.role, 'freelancer', 'User metadata role must be freelancer');

    // Expected client dashboard routing
    const expectedDashboard = data.user.user_metadata?.role === 'company' ? 'company-dashboard' : 'creator-dashboard';
    assert.equal(expectedDashboard, 'creator-dashboard');

    // Verify against backend /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.role, 'freelancer');
  });

  test('2. Company / Brand demo account can authenticate and receives company role', async () => {
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: 'brand@genlancer.io',
      password: 'pass123456'
    });

    assert.equal(error, null, `Sign in should not return error: ${error?.message}`);
    assert.ok(data.session?.access_token, 'Session access token must be present');
    assert.equal(data.user.email, 'brand@genlancer.io');
    assert.equal(data.user.user_metadata?.role, 'company', 'User metadata role must be company');

    // Expected client dashboard routing
    const expectedDashboard = data.user.user_metadata?.role === 'company' ? 'company-dashboard' : 'creator-dashboard';
    assert.equal(expectedDashboard, 'company-dashboard');

    // Verify against backend /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.role, 'company');
  });
});
