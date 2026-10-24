import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mjousyabcftwlbaegbaq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_4S-CVVWg34SgSjeBzE-wCw_XwRP1wxv';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'http://localhost:3001';

describe('GenLancer Phase 2 — Complete Collaboration Request Workflow Suite', () => {
  const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let adminClient = null;
  if (SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  let companyToken = null;
  let companyUser = null;
  let creatorToken = null;
  let creatorUser = null;
  const createdTestRequestIds = [];

  before(async () => {
    // 1. Authenticate as Company
    const { data: compAuth, error: compErr } = await publicClient.auth.signInWithPassword({
      email: 'brand@genlancer.io',
      password: 'pass123456'
    });
    assert.equal(compErr, null, `Company login failed: ${compErr?.message}`);
    companyToken = compAuth.session.access_token;
    companyUser = compAuth.user;

    // 2. Authenticate as Freelancer / Creator
    const { data: creatorAuth, error: creatorErr } = await publicClient.auth.signInWithPassword({
      email: 'creator@genlancer.io',
      password: 'pass123456'
    });
    assert.equal(creatorErr, null, `Creator login failed: ${creatorErr?.message}`);
    creatorToken = creatorAuth.session.access_token;
    creatorUser = creatorAuth.user;
  });

  after(async () => {
    // Clean up test requests created in database
    if (adminClient && createdTestRequestIds.length > 0) {
      for (const reqId of createdTestRequestIds) {
        await adminClient.from('collaboration_requests').delete().eq('request_id', reqId);
      }
    }
  });

  test('1. Company submits a validated collaboration request persisted in Supabase', async () => {
    const payload = {
      freelancer_id: 'FL001',
      project_brief: {
        title: 'Phase 2 Test Ad Campaign - Automated Workflow',
        brief: 'High-end generative video advertisement for an electric vehicle commercial.',
        deliverables: '1x 4K Master Video, 3x Social Cutdowns',
        budget: '$4,200',
        deadline: '2026-12-01',
        aspectRatio: '16:9',
        preferredTools: 'Runway Gen-3, Midjourney v6'
      }
    };

    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${companyToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201, 'Should return 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.request?.request_id, 'Request must have a generated UUID request_id');
    assert.equal(data.request.status, 'pending', 'Initial status must be pending');
    assert.equal(data.request.freelancer_id, 'FL001');

    createdTestRequestIds.push(data.request.request_id);

    // Verify persistence directly in Supabase DB
    if (adminClient) {
      const { data: dbRow, error } = await adminClient
        .from('collaboration_requests')
        .select('*')
        .eq('request_id', data.request.request_id)
        .single();

      assert.equal(error, null, 'Must exist in database');
      assert.equal(dbRow.status, 'pending');
      assert.equal(dbRow.project_brief.title, 'Phase 2 Test Ad Campaign - Automated Workflow');
    }
  });

  test('2. Company views sent requests list containing the new request', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      headers: { Authorization: `Bearer ${companyToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.requests));

    const found = data.requests.find(r => r.request_id === createdTestRequestIds[0]);
    assert.ok(found, 'Sent requests must contain the newly created request');
    assert.equal(found.status, 'pending');
    assert.equal(found.freelancer_id, 'FL001');
  });

  test('3. Creator fetches incoming requests addressed to them', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.requests));

    const found = data.requests.find(r => r.request_id === createdTestRequestIds[0]);
    assert.ok(found, 'Incoming requests must contain request addressed to FL001');
    assert.equal(found.status, 'pending');
    assert.equal(found.project_brief.title, 'Phase 2 Test Ad Campaign - Automated Workflow');
    assert.equal(found.project_brief.budget, '$4,200');
  });

  test('4. Creator accepts the pending collaboration request', async () => {
    const testReqId = createdTestRequestIds[0];

    const res = await fetch(`${BASE_URL}/api/collaboration/${testReqId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`
      },
      body: JSON.stringify({ actor: 'freelancer' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.request.status, 'accepted');

    // Confirm persisted in Supabase
    if (adminClient) {
      const { data: dbRow } = await adminClient
        .from('collaboration_requests')
        .select('status')
        .eq('request_id', testReqId)
        .single();
      assert.equal(dbRow.status, 'accepted', 'Database status must be accepted');
    }
  });

  test('5. Re-fetching by company confirms accepted status matches in both dashboards', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      headers: { Authorization: `Bearer ${companyToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const found = data.requests.find(r => r.request_id === createdTestRequestIds[0]);
    assert.ok(found);
    assert.equal(found.status, 'accepted');
  });

  test('6. Creator declines a separate collaboration request', async () => {
    // Create second request
    const createRes = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${companyToken}`
      },
      body: JSON.stringify({
        freelancer_id: 'FL001',
        project_brief: {
          title: 'Request 2 To Decline',
          brief: 'Short-term visual experiment that will be declined.',
          deliverables: '1x Concept Stills',
          budget: '$800',
          deadline: '2026-11-20'
        }
      })
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const req2Id = createData.request.request_id;
    createdTestRequestIds.push(req2Id);

    // Creator rejects request 2
    const rejectRes = await fetch(`${BASE_URL}/api/collaboration/${req2Id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`
      },
      body: JSON.stringify({ reason: 'Overbooked for November' })
    });

    assert.equal(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.success, true);
    assert.equal(rejectData.request.status, 'rejected');

    // Confirm persisted in DB
    if (adminClient) {
      const { data: dbRow } = await adminClient
        .from('collaboration_requests')
        .select('status')
        .eq('request_id', req2Id)
        .single();
      assert.equal(dbRow.status, 'rejected');
    }
  });

  test('7. Company cancels a pending collaboration request', async () => {
    // Create third request
    const createRes = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${companyToken}`
      },
      body: JSON.stringify({
        freelancer_id: 'FL001',
        project_brief: {
          title: 'Request 3 To Cancel',
          brief: 'Project initiated but cancelled before creator review.',
          deliverables: '1x Storyboard Package',
          budget: '$1,200',
          deadline: '2026-12-15'
        }
      })
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const req3Id = createData.request.request_id;
    createdTestRequestIds.push(req3Id);

    // Company cancels request 3
    const cancelRes = await fetch(`${BASE_URL}/api/collaboration/${req3Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` }
    });

    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.success, true);
    assert.equal(cancelData.request.status, 'cancelled');

    // Confirm persisted in DB
    if (adminClient) {
      const { data: dbRow } = await adminClient
        .from('collaboration_requests')
        .select('status')
        .eq('request_id', req3Id)
        .single();
      assert.equal(dbRow.status, 'cancelled');
    }
  });

  test('8. Security & validation: Rejects invalid transitions and unauthorized access', async () => {
    const acceptedReqId = createdTestRequestIds[0];
    const cancelledReqId = createdTestRequestIds[2];

    // Cannot cancel an already accepted request
    const cancelAcceptedRes = await fetch(`${BASE_URL}/api/collaboration/${acceptedReqId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    assert.equal(cancelAcceptedRes.status, 400, 'Cannot cancel accepted request');

    // Creator cannot accept a cancelled request
    const acceptCancelledRes = await fetch(`${BASE_URL}/api/collaboration/${cancelledReqId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.equal(acceptCancelledRes.status, 400, 'Cannot accept cancelled request');

    // Creator cannot cancel a request (only company can cancel)
    const creatorCancelRes = await fetch(`${BASE_URL}/api/collaboration/${cancelledReqId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.equal(creatorCancelRes.status, 403, 'Creator cannot cancel collaboration');

    // Missing required fields rejected with 400
    const missingFieldsRes = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${companyToken}`
      },
      body: JSON.stringify({ freelancer_id: 'FL001', project_brief: {} })
    });
    assert.equal(missingFieldsRes.status, 400, 'Should reject missing fields with 400');
  });
});
