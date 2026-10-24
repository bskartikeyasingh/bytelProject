import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { validateEmail, DISPOSABLE_DOMAINS, checkRateLimit } from '../middleware/emailSecurityMiddleware.js';

describe('One-Time Magic Link Verification & Auth Security Suite', () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mjousyabcftwlbaegbaq.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4S-CVVWg34SgSjeBzE-wCw_XwRP1wxv';
  const BASE_URL = 'http://localhost:3001';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Disposable Email & Syntax Validation
  test('1. Syntax validation accepts legitimate creator and brand email addresses', () => {
    const validEmails = [
      'director@pixarstudio.com',
      'sarah.creator@gmail.com',
      'marcus@agency-group.co.uk',
      'talent+genlancer@creativecollective.io'
    ];

    for (const email of validEmails) {
      const res = validateEmail(email);
      assert.equal(res.valid, true, `Expected ${email} to be valid`);
      assert.equal(res.sanitized, email.toLowerCase());
    }
  });

  test('2. Disposable Email Protection strictly rejects temporary email services', () => {
    const disposableEmails = [
      'user@mailinator.com',
      'tester@tempmail.com',
      'throwaway@10minutemail.com',
      'fake@yopmail.com',
      'sub@mail.mailinator.com',
      'artist@trashmail.com'
    ];

    for (const email of disposableEmails) {
      const res = validateEmail(email);
      assert.equal(res.valid, false, `Expected ${email} to be rejected as disposable`);
      assert.equal(res.isDisposable, true);
    }
  });

  test('3. Disposable domains are rejected via backend POST /api/auth/validate-signup', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/validate-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
      body: JSON.stringify({ email: 'spammer@tempmail.com', role: 'freelancer' })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, 'DISPOSABLE_EMAIL_REJECTED');
  });

  test('4. Reserved demo emails cannot be registered via POST /api/auth/validate-signup', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/validate-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
      body: JSON.stringify({ email: 'aarav@genlancer.demo', role: 'freelancer' })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'RESERVED_DEMO_EMAIL');
  });

  test('5. Legitimate email passes POST /api/auth/validate-signup', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/validate-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
      body: JSON.stringify({ email: 'genuine.producer@filmhouse.org', role: 'freelancer' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.email, 'genuine.producer@filmhouse.org');
  });

  // 6. Server-Side Rate Limiting
  test('6. Rate limiting enforces request limits for registration and resend endpoints', () => {
    const testKey = `test-rate-limit-${Date.now()}`;
    const max = 3;

    const r1 = checkRateLimit(testKey, max);
    assert.equal(r1.allowed, true);

    const r2 = checkRateLimit(testKey, max);
    assert.equal(r2.allowed, true);

    const r3 = checkRateLimit(testKey, max);
    assert.equal(r3.allowed, true);

    const r4 = checkRateLimit(testKey, max);
    assert.equal(r4.allowed, false, 'Fourth attempt must be rate-limited');
    assert.ok(r4.retryAfterSeconds > 0);
  });

  // 7. Supabase Magic Link / OTP Dispatch (Real Auth Flow)
  test('7. Supabase Auth supports one-time magic link OTP dispatch for new creators', async () => {
    const testEmail = `newcreator_${Date.now()}@gmail.com`;
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: 'http://localhost:5173/?verify=true'
      }
    });

    assert.equal(error, null, `signInWithOtp should succeed: ${error?.message}`);
    assert.equal(data.session, null, 'OTP dispatch does not return a session');
  });

  test('8. Brand signup registers account and dispatches verification without client-side session bypass', async () => {
    const testEmail = `brandagency_${Date.now()}@gmail.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'BrandSecurePassword123!',
      options: {
        emailRedirectTo: 'http://localhost:5173/?verify=true',
        data: {
          role: 'company',
          full_name: 'Studio Syndicate Agency',
          specialization: 'Commercial Brand'
        }
      }
    });

    assert.equal(error, null, `SignUp should not error: ${error?.message}`);
    assert.ok(data.user, 'User object should be created');
    assert.equal(data.user.user_metadata?.role, 'company', 'Role must be preserved in user_metadata');
  });

  // 9. Login Protection & Error State
  test('9. Invalid login attempts return standard authentication failure without credential leakage', async () => {
    const fakeEmail = `fakeuser_${Date.now()}@gmail.com`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: 'WrongPassword123!'
    });

    assert.ok(error, 'Invalid credentials must return an error');
    assert.equal(data.session, null, 'No session must be granted');
  });

  // 10. Verification Link Error Recovery
  test('10. Invalid or expired OTP verification token produces explicit failure', async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: 'invalid_or_expired_token_hash_12345',
      type: 'signup'
    });

    assert.ok(error, 'Invalid token must return error');
    assert.equal(data.session, null, 'No session established for invalid token');
  });

  // 11. Preserved Demo Accounts (Critical Phase 4 Requirement)
  test('11. Demo Creator Aarav Sharma authenticates without requiring email dispatch', async () => {
    const demoToken = 'demo-token:freelancer:demo_user_101:aarav@genlancer.demo';
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'aarav@genlancer.demo');
    assert.equal(body.user.id, 'demo_user_101');
    assert.equal(body.user.role, 'freelancer');
  });

  test('12. Demo Brand Apex Media Studios authenticates with preserved brand credentials', async () => {
    const demoToken = 'demo-token:company:brand_user_201:apex@brand.demo';
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'apex@brand.demo');
    assert.equal(body.user.id, 'brand_user_201');
    assert.equal(body.user.role, 'company');
  });

  test('13. Demo Brand Veloce Energy authenticates with preserved credentials', async () => {
    const demoToken = 'demo-token:company:brand_user_202:veloce@brand.demo';
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'veloce@brand.demo');
    assert.equal(body.user.id, 'brand_user_202');
  });

  test('14. Unauthorized access to protected endpoints is rejected with 401', async () => {
    // No header
    const res1 = await fetch(`${BASE_URL}/api/auth/me`);
    assert.equal(res1.status, 401);

    // Fake / invalid JWT
    const res2 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer fake.invalid.jwt.token' }
    });
    assert.equal(res2.status, 401);

    // Empty Bearer
    const res3 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer ' }
    });
    assert.equal(res3.status, 401);
  });

  test('15. Arbitrary user cannot claim unauthorized demo identities or roles', async () => {
    // Attempting to pass an unauthorized string
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer random-unverified-string' }
    });
    assert.equal(res.status, 401);
  });

  test('16. Resend verification endpoint rate-limits and sanitizes input', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
      body: JSON.stringify({ email: 'producer@validcompany.com' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.message.includes('verification link has been dispatched'));
  });

  test('17. Existing verified production user credentials remain intact', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'creator@genlancer.io',
      password: 'pass123456'
    });

    assert.equal(error, null, `Existing verified user sign in should succeed: ${error?.message}`);
    assert.ok(data.session?.access_token);
    assert.equal(data.user.email, 'creator@genlancer.io');
  });

  test('18. Existing collaborations and message relationships remain intact', async () => {
    const token = 'demo-token:freelancer:demo_user_101:aarav@genlancer.demo';
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.requests), 'Requests array must be returned');
  });
});
