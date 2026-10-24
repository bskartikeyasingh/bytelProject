import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateToken, requireRole, requireCollaborationParticipant } from '../middleware/authMiddleware.js';

describe('GenLancer Secure Authentication & Authorization Integration Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  const companyAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:company:COMP_AUTH_01'
  };

  const freelancerAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:freelancer:FL_AUTH_01'
  };

  const outsiderAuth = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token:freelancer:OUTSIDER_01'
  };

  let testRequestId = null;

  test('Public endpoints remain publicly accessible without token', async () => {
    // Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert.equal(healthRes.status, 200);

    // Creator directory is public (does not require authentication; returns 200 or 503 based on DB config, but NEVER 401)
    const creatorsRes = await fetch(`${BASE_URL}/api/creators`);
    assert.notEqual(creatorsRes.status, 401, 'Creator directory must never require authentication');

    // Search is public (does not require authentication)
    const searchRes = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Runway video' })
    });
    assert.notEqual(searchRes.status, 401, 'Creator search must never require authentication');
  });

  test('Unauthenticated requests are denied with HTTP 401 across all protected routes', async () => {
    // 1. Create collaboration
    const r1 = await fetch(`${BASE_URL}/api/collaboration/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freelancer_id: 'FL_AUTH_01' })
    });
    assert.equal(r1.status, 401);
    const d1 = await r1.json();
    assert.equal(d1.code, 'UNAUTHENTICATED');

    // 2. View collaboration
    const r2 = await fetch(`${BASE_URL}/api/collaboration/any-id`);
    assert.equal(r2.status, 401);

    // 3. Accept collaboration
    const r3 = await fetch(`${BASE_URL}/api/collaboration/any-id/accept`, { method: 'POST' });
    assert.equal(r3.status, 401);

    // 4. Clarify collaboration
    const r4 = await fetch(`${BASE_URL}/api/collaboration/any-id/clarify`, { method: 'POST' });
    assert.equal(r4.status, 401);

    // 5. Update brief
    const r5 = await fetch(`${BASE_URL}/api/collaboration/any-id/update-brief`, { method: 'POST' });
    assert.equal(r5.status, 401);

    // 6. Confirm collaboration
    const r6 = await fetch(`${BASE_URL}/api/collaboration/any-id/confirm`, { method: 'POST' });
    assert.equal(r6.status, 401);

    // 7. Post message
    const r7 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    });
    assert.equal(r7.status, 401);

    // 8. Fetch messages
    const r8 = await fetch(`${BASE_URL}/api/messages/any-id`);
    assert.equal(r8.status, 401);

    // 9. Malformed header rejected
    const r9 = await fetch(`${BASE_URL}/api/messages/any-id`, {
      headers: { 'Authorization': 'NotBearer token123' }
    });
    assert.equal(r9.status, 401);
  });

  test('Role enforcement: Freelancer cannot create collaboration requests (Company role required)', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration/request`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({
        freelancer_id: 'FL_AUTH_01',
        project_brief: { title: 'Unauthorized creator brief' }
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, 'FORBIDDEN_ROLE');
    assert.match(data.error, /requires one of the following roles: \[company\]/);
  });

  test('Authorized company creates collaboration request with identity authoritatively locked', async () => {
    // Attempt to spoof company_id in payload as 'SPOOFED_COMPANY'
    const res = await fetch(`${BASE_URL}/api/collaboration/request`, {
      method: 'POST',
      headers: companyAuth,
      body: JSON.stringify({
        company_id: 'SPOOFED_COMPANY', // Should be overridden by authenticated token
        freelancer_id: 'FL_AUTH_01',
        project_brief: { title: 'Neon Cyberpunk Ad', budget: '$4,500' }
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.request.request_id);
    // Identity is authoritatively locked to the token subject
    assert.equal(data.request.company_id, 'COMP_AUTH_01');
    assert.equal(data.request.freelancer_id, 'FL_AUTH_01');
    testRequestId = data.request.request_id;
  });

  test('Non-participant outsider cannot view the collaboration request (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}`, {
      headers: outsiderAuth
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, 'FORBIDDEN_PARTICIPANT');
  });

  test('Authorized company and freelancer participants can view the collaboration request (HTTP 200)', async () => {
    const compRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}`, {
      headers: companyAuth
    });
    assert.equal(compRes.status, 200);

    const flRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}`, {
      headers: freelancerAuth
    });
    assert.equal(flRes.status, 200);
  });

  test('Only the recipient freelancer can request clarification (Outsider and Company rejected)', async () => {
    // Outsider rejected
    const outRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/clarify`, {
      method: 'POST',
      headers: outsiderAuth,
      body: JSON.stringify({ message: 'Can I do this?' })
    });
    assert.equal(outRes.status, 403);

    // Company cannot request clarification from itself
    const compRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/clarify`, {
      method: 'POST',
      headers: companyAuth,
      body: JSON.stringify({ message: 'Company asking clarification' })
    });
    assert.equal(compRes.status, 403);

    // Authorized freelancer succeeds
    const flRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/clarify`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({ message: 'What is the target framerate?' })
    });
    assert.equal(flRes.status, 200);
    const flData = await flRes.json();
    assert.equal(flData.request.status, 'clarification_requested');
  });

  test('Only initiating company can respond to clarification and update the brief', async () => {
    // Freelancer cannot respond to their own clarification as company
    const flRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/respond-clarify`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({ message: 'Attempting company answer' })
    });
    assert.equal(flRes.status, 403);

    // Company responds to clarification
    const compRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/respond-clarify`, {
      method: 'POST',
      headers: companyAuth,
      body: JSON.stringify({ message: 'Target framerate is 60fps in 4K ProRes.' })
    });
    assert.equal(compRes.status, 200);

    // Freelancer cannot update project brief
    const flBriefRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/update-brief`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({ title: 'Hacked Brief' })
    });
    assert.equal(flBriefRes.status, 403);

    // Company updates brief version to 2
    const compBriefRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/update-brief`, {
      method: 'POST',
      headers: companyAuth,
      body: JSON.stringify({ title: 'Neon Cyberpunk Ad v2', target_fps: 60 })
    });
    assert.equal(compBriefRes.status, 200);
    const compBriefData = await compBriefRes.json();
    assert.equal(compBriefData.request.brief_version, 2);
  });

  test('Recipient freelancer accepts request and both parties confirm agreement', async () => {
    // Outsider cannot accept
    const outRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/accept`, {
      method: 'POST',
      headers: outsiderAuth
    });
    assert.equal(outRes.status, 403);

    // Freelancer accepts
    const acceptRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/accept`, {
      method: 'POST',
      headers: freelancerAuth
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.request.status, 'accepted');

    // Company confirms
    const compConfirmRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/confirm`, {
      method: 'POST',
      headers: companyAuth,
      body: JSON.stringify({ brief_version: 2 })
    });
    assert.equal(compConfirmRes.status, 200);

    // Freelancer confirms
    const flConfirmRes = await fetch(`${BASE_URL}/api/collaboration/${testRequestId}/confirm`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({ brief_version: 2 })
    });
    assert.equal(flConfirmRes.status, 200);
    const flConfirmData = await flConfirmRes.json();
    assert.equal(flConfirmData.request.status, 'confirmed');
  });

  test('Protected Messaging: Non-participants cannot read or post; spoofed sender identity is overridden', async () => {
    // Outsider cannot post to thread
    const outPostRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: outsiderAuth,
      body: JSON.stringify({
        request_id: testRequestId,
        message: 'Intruder message'
      })
    });
    assert.equal(outPostRes.status, 403);

    // Outsider cannot read messages
    const outGetRes = await fetch(`${BASE_URL}/api/messages/${testRequestId}`, {
      headers: outsiderAuth
    });
    assert.equal(outGetRes.status, 403);

    // Freelancer posts message attempting to spoof sender_id and role as company
    const flMsgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: freelancerAuth,
      body: JSON.stringify({
        request_id: testRequestId,
        sender_id: 'SPOOFED_COMPANY', // Attacker claims to be company
        sender_role: 'company',        // Attacker claims to be company
        message: 'Approved with full commercial license'
      })
    });
    assert.equal(flMsgRes.status, 201);
    const flMsgData = await flMsgRes.json();

    // Critical security check: Server enforced authenticated identity and role
    assert.equal(flMsgData.message.sender_id, 'FL_AUTH_01');
    assert.equal(flMsgData.message.sender_role, 'freelancer');

    // Authorized company reads the conversation thread
    const compGetRes = await fetch(`${BASE_URL}/api/messages/${testRequestId}`, {
      headers: companyAuth
    });
    assert.equal(compGetRes.status, 200);
    const compGetData = await compGetRes.json();
    assert.ok(compGetData.messages.length >= 1);
    const lastMsg = compGetData.messages[compGetData.messages.length - 1];
    assert.equal(lastMsg.sender_id, 'FL_AUTH_01');
    assert.equal(lastMsg.content, 'Approved with full commercial license');
  });
});
