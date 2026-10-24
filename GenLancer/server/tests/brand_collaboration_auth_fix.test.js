import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

describe('Brand Collaboration Request Submission & Authentication Verification', () => {
  // Test credentials & tokens
  const COMPANY_BEARER = 'Bearer test-token:company:comp-verified-001:brand@apex.com';
  const CREATOR_BEARER = 'Bearer test-token:freelancer:creator-001:aarav@genlancer.io';
  const DEMO_BRAND_BEARER = 'Bearer demo-token:company:brand_user_201:apex@brand.demo';
  const INVALID_BEARER = 'Bearer invalid.jwt.token';
  const MALFORMED_HEADER = 'Basic dXNlcjpwYXNz';

  const validCollabPayload = {
    freelancer_id: 'FL001',
    project_brief: {
      title: '60-Second Generative AI Launch Film',
      brief: 'Produce a high-end cinematic product launch commercial using generative AI workflows.',
      description: 'Produce a high-end cinematic product launch commercial using generative AI workflows.',
      deliverables: '1x 4K Master Asset, 2x Social Cutdowns, Raw Project Files',
      budget: '$3,500',
      deadline: '2026-11-30',
      aspectRatio: '16:9',
      preferredTools: 'Runway Gen-3, Midjourney v6',
      commercial_use_required: true,
      company_name: 'Apex Creative Agency'
    }
  };

  test('1. Unauthenticated request without Authorization header returns HTTP 401 with explicit message', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 401, 'Expected HTTP 401 Unauthorized');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'UNAUTHENTICATED');
    assert.match(data.error, /Authentication required\. No Authorization header provided/i);
  });

  test('2. Malformed Authorization header returns HTTP 401 with descriptive error', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MALFORMED_HEADER
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 401, 'Expected HTTP 401 for malformed header');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'MALFORMED_AUTH_HEADER');
  });

  test('3. Invalid cryptographic Bearer token returns HTTP 401 token expired/invalid', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': INVALID_BEARER
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 401, 'Expected HTTP 401 for invalid JWT');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('4. Authenticated Creator (freelancer) role cannot submit Brand collaboration request (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CREATOR_BEARER
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 403, 'Expected HTTP 403 Forbidden for non-brand user');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'FORBIDDEN_ROLE');
    assert.match(data.error, /company/i);
  });

  test('5. Authenticated Brand user with valid Bearer token submits collaboration request successfully (HTTP 201)', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': COMPANY_BEARER
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 201, 'Expected HTTP 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.request, 'Response should contain created collaboration request');
    assert.ok(data.request.request_id, 'Request must have a generated ID');
    assert.equal(data.request.status, 'pending');
    assert.equal(data.request.freelancer_id, 'FL001');
    assert.equal(data.request.company_id, 'comp-verified-001', 'Authoritative company_id must be assigned from authenticated user');
  });

  test('6. Server strictly overrides client-spoofed company_id with authenticated user ID', async () => {
    const spoofPayload = {
      ...validCollabPayload,
      company_id: 'SPOOFED_UNAUTHORIZED_COMPANY'
    };

    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': COMPANY_BEARER
      },
      body: JSON.stringify(spoofPayload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.notEqual(data.request.company_id, 'SPOOFED_UNAUTHORIZED_COMPANY', 'Client-provided company_id must be ignored');
    assert.equal(data.request.company_id, 'comp-verified-001', 'Server-verified company ID must be enforced');
  });

  test('7. Authenticated Demo Brand user submits collaboration request in non-production mode (HTTP 201)', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': DEMO_BRAND_BEARER
      },
      body: JSON.stringify(validCollabPayload)
    });

    assert.equal(res.status, 201, 'Demo Brand token should be accepted in development mode');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.request.company_id, 'brand_user_201');
  });

  test('8. Missing required payload fields are rejected with HTTP 400', async () => {
    // Missing freelancer_id
    const resNoFreelancer = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': COMPANY_BEARER
      },
      body: JSON.stringify({
        project_brief: { title: 'Missing Freelancer' }
      })
    });
    assert.equal(resNoFreelancer.status, 400);

    // Missing project title
    const resNoTitle = await fetch(`${BASE_URL}/api/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': COMPANY_BEARER
      },
      body: JSON.stringify({
        freelancer_id: 'FL001',
        project_brief: {}
      })
    });
    assert.equal(resNoTitle.status, 400);
  });
});
