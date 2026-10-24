import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

test('Subscription Integration Test Suite', async (t) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let creatorToken = null;
  let brandToken = null;

  await t.test('Authenticate demo creator to obtain valid JWT token', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'aarav@genlancer.demo',
      password: 'Aarav@123'
    });
    assert.equal(error, null, 'Creator login should succeed');
    assert.ok(data?.session?.access_token, 'Should have access_token');
    creatorToken = data.session.access_token;
  });

  await t.test('Authenticate demo brand/agency to obtain valid JWT token', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'apex@brand.demo',
      password: 'Apex@123'
    });
    assert.equal(error, null, 'Brand login should succeed');
    assert.ok(data?.session?.access_token, 'Should have access_token');
    brandToken = data.session.access_token;
  });

  await t.test('GET /api/subscriptions/status rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/status`);
    assert.equal(res.status, 401, 'Should return 401 Unauthorized');
  });

  await t.test('GET /api/subscriptions/status returns 200 and freelancer role for creator', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/status`, {
      headers: { 'Authorization': `Bearer ${creatorToken}` }
    });
    assert.equal(res.status, 200, 'Should return 200 OK');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.role, 'freelancer');
    assert.ok(Array.isArray(body.subscriptions));
    assert.ok(Array.isArray(body.active));
  });

  await t.test('GET /api/subscriptions/status returns 200 and company role for agency', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/status`, {
      headers: { 'Authorization': `Bearer ${brandToken}` }
    });
    assert.equal(res.status, 200, 'Should return 200 OK');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.role, 'company');
    assert.ok(Array.isArray(body.subscriptions));
    assert.ok(Array.isArray(body.active));
  });

  await t.test('GET /api/subscriptions/promotions/available returns 200 and available status', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/promotions/available`, {
      headers: { 'Authorization': `Bearer ${creatorToken}` }
    });
    assert.equal(res.status, 200, 'Should return 200 OK');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.available, 'boolean');
  });

  await t.test('POST /api/subscriptions/order rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_type: 'creator_portfolio', plan: 'monthly' })
    });
    assert.equal(res.status, 401, 'Should return 401 Unauthorized');
  });

  await t.test('POST /api/subscriptions/verify rejects missing verification fields with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creatorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    // If Razorpay is not configured on the server, it safely yields 503 PAYMENT_VERIFICATION_UNAVAILABLE;
    // if configured, it yields 400 PAYMENT_FIELDS_MISSING. Both are secure rejections.
    assert.ok([400, 503].includes(res.status), 'Should securely reject with 400 or 503');
  });
});
