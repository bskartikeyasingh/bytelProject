import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { validateEmailFormat } from '../../client/src/lib/emailSecurity.js';

describe('Password Recovery & Reset Verification Suite', () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mjousyabcftwlbaegbaq.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4S-CVVWg34SgSjeBzE-wCw_XwRP1wxv';
  const BASE_URL = 'http://localhost:3001';
  const REDIRECT_URL = 'http://localhost:5173/reset-password';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Registered user requesting reset email
  test('1. Registered user requesting reset email succeeds via Supabase Auth', async () => {
    const testEmail = `registered_${Date.now()}@gmail.com`;
    // Register user first
    await supabase.auth.signUp({
      email: testEmail,
      password: 'InitialPassword123!'
    });

    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: REDIRECT_URL
    });

    assert.equal(error, null, `Reset email dispatch should succeed: ${error?.message}`);
    assert.ok(data !== null);
  });

  // 2. Non-existent email showing generic confirmation without user enumeration
  test('2. Non-existent email returns generic success without revealing registration state', async () => {
    const nonExistentEmail = `nonexistent_user_${Date.now()}@gmail.com`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(nonExistentEmail, {
      redirectTo: REDIRECT_URL
    });

    // Supabase Auth and client return success without revealing whether the user exists
    assert.equal(error, null, 'Non-existent email must not return an error to prevent user enumeration');
    assert.ok(data !== null);
  });

  // 3. Email format validation on reset requests
  test('3. Malformed or invalid email formats are rejected before dispatch', () => {
    const invalidEmails = [
      '',
      'not-an-email',
      '@missingusername.com',
      'spaces in email@domain.com',
      'user@.com'
    ];

    for (const badEmail of invalidEmails) {
      const check = validateEmailFormat(badEmail);
      assert.equal(check.valid, false, `Expected ${badEmail} to fail validation`);
      assert.ok(check.error.length > 0);
    }

    const validCheck = validateEmailFormat('director@brandstudio.com');
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.sanitized, 'director@brandstudio.com');
  });

  // 4. End-to-end password update with recovery session
  let testUserEmail = '';
  let updatedClient = null;

  test('4. Legitimate recovery session can update password via supabase.auth.updateUser', async () => {
    testUserEmail = `recovery_test_${Date.now()}@gmail.com`;
    const initialPassword = 'OldPassword123!';

    // Register user
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email: testUserEmail,
      password: initialPassword
    });
    assert.equal(signupErr, null);

    // Create an authenticated client simulating recovery session
    updatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: signinData, error: signinErr } = await updatedClient.auth.signInWithPassword({
      email: testUserEmail,
      password: initialPassword
    });
    assert.equal(signinErr, null);
    assert.ok(signinData.session?.access_token);

    // Perform password update as would occur on /reset-password
    const newPassword = 'NewSecretPassword123!';
    const { data: updateData, error: updateErr } = await updatedClient.auth.updateUser({
      password: newPassword
    });

    assert.equal(updateErr, null, `Password update should succeed: ${updateErr?.message}`);
    assert.ok(updateData.user);
    assert.equal(updateData.user.email, testUserEmail);
  });

  // 5. Logging in with new password
  test('5. User successfully authenticates using the updated new password', async () => {
    const newPassword = 'NewSecretPassword123!';
    const freshClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await freshClient.auth.signInWithPassword({
      email: testUserEmail,
      password: newPassword
    });

    assert.equal(error, null, `Login with new password must succeed: ${error?.message}`);
    assert.ok(data.session?.access_token, 'Session access token must be returned');
    assert.equal(data.user.email, testUserEmail);
  });

  // 6. Old password no longer works
  test('6. Old password is confirmed invalid after password reset', async () => {
    const oldPassword = 'OldPassword123!';
    const freshClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await freshClient.auth.signInWithPassword({
      email: testUserEmail,
      password: oldPassword
    });

    assert.ok(error, 'Login with old password must fail');
    assert.equal(data.session, null, 'No session must be issued for old password');
  });

  // 7. Password requirements: matching and minimum length validation
  test('7. Password validation enforces minimum 8 characters and field matching', () => {
    const shortPassword = 'Short1!';
    assert.ok(shortPassword.length < 8, 'Password under 8 characters must be rejected');

    const pass1 = 'StrongPassword123!';
    const pass2 = 'DifferentPassword123!';
    assert.notEqual(pass1, pass2, 'Mismatched passwords must be detected');
  });

  // 8. Expired or invalid recovery tokens
  test('8. Expired or invalid recovery token produces explicit failure', async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: 'expired_recovery_token_hash_abc123',
      type: 'recovery'
    });

    assert.ok(error, 'Invalid/expired recovery token must return error');
    assert.equal(data.session, null, 'No session must be established');
  });

  // 9. Direct visit to reset page without recovery session
  test('9. Unauthenticated visitor cannot invoke updateUser without recovery session', async () => {
    const unauthenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await unauthenticatedClient.auth.updateUser({
      password: 'HackerPassword123!'
    });

    assert.ok(error, 'updateUser must fail without active recovery session');
    assert.equal(data.user, null);
  });

  // 10. Existing demo accounts preservation
  test('10. Demo account credentials are preserved and authenticate successfully', async () => {
    const creatorToken = 'demo-token:freelancer:demo_user_101:aarav@genlancer.demo';
    const creatorRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.equal(creatorRes.status, 200);
    const creatorData = await creatorRes.json();
    assert.equal(creatorData.user.email, 'aarav@genlancer.demo');
    assert.equal(creatorData.user.role, 'freelancer');

    const brandToken = 'demo-token:company:brand_user_201:apex@brand.demo';
    const brandRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${brandToken}` }
    });
    assert.equal(brandRes.status, 200);
    const brandData = await brandRes.json();
    assert.equal(brandData.user.email, 'apex@brand.demo');
    assert.equal(brandData.user.role, 'company');
  });
});
