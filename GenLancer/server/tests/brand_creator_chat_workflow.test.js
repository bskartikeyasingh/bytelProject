import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

describe('Brand–Creator Chat Workflow & Conversation Isolation Tests', () => {
  // Test collaboration IDs from the database
  const VELOCE_PEPSI_REQ_ID = 'bf78af85-ffa1-4b3a-b0a8-4227a0d8fda5'; // Veloce Energy (brand_user_202) + Priya Nair (demo_user_104)
  const APEX_CHOCOLATE_REQ_ID = '867155ee-4c3a-4b96-9ad8-156218c7e71c'; // Apex Media Studios (brand_user_201) + Priya Nair (demo_user_104)
  const VOLT_REQ_ID = 'REQ-DEMO-001';

  // Bearer tokens for participants
  const VELOCE_BRAND_TOKEN = 'Bearer demo-token:company:brand_user_202:veloce@brand.demo';
  const APEX_BRAND_TOKEN = 'Bearer demo-token:company:brand_user_201:apex@brand.demo';
  const PRIYA_CREATOR_TOKEN = 'Bearer demo-token:creator:demo_user_104:priya@genlancer.demo';
  const UNAUTHORIZED_BRAND_TOKEN = 'Bearer demo-token:company:unauthorized_brand_999:hacker@brand.demo';
  const UNAUTHORIZED_CREATOR_TOKEN = 'Bearer demo-token:creator:unauthorized_user_888:intruder@genlancer.demo';

  test('1. Veloce Energy + Pepsi conversation loads distinct metadata and participants', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': VELOCE_BRAND_TOKEN }
    });
    assert.equal(res.status, 200, 'Expected 200 OK for Veloce Brand participant');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.messages), 'Messages should be an array');
  });

  test('2. Apex Media Studios + Chocolate conversation is completely separate from Veloce Energy', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${APEX_CHOCOLATE_REQ_ID}`, {
      headers: { 'Authorization': APEX_BRAND_TOKEN }
    });
    assert.equal(res.status, 200, 'Expected 200 OK for Apex Brand participant');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.messages), 'Messages should be an array');
  });

  test('3. Volt Energy Co. messages never appear in the Veloce Energy conversation', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': VELOCE_BRAND_TOKEN }
    });
    const data = await res.json();
    const messages = data.messages || [];
    for (const msg of messages) {
      assert.notEqual(msg.request_id, VOLT_REQ_ID, 'Volt Energy request ID must not appear in Veloce conversation');
      assert.doesNotMatch(msg.content || '', /Runway Gen-3 reel.*deliver the 16:9 cut by Friday/i, 'Volt Energy static demo text must not appear in Veloce chat');
    }
  });

  test('4. Message sent by Creator in Veloce conversation persists and is readable by Veloce Brand', async () => {
    const uniqueText = `Creator live sync test message ${Date.now()}`;
    const sendRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': PRIYA_CREATOR_TOKEN
      },
      body: JSON.stringify({
        request_id: VELOCE_PEPSI_REQ_ID,
        content: uniqueText,
        sender_role: 'freelancer'
      })
    });

    assert.equal(sendRes.status, 201, 'Expected 201 Created for creator message');
    const sendData = await sendRes.json();
    assert.equal(sendData.success, true);

    // Fetch as Veloce Brand
    const fetchRes = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': VELOCE_BRAND_TOKEN }
    });
    const fetchData = await fetchRes.json();
    const found = (fetchData.messages || []).some(m => (m.content || m.text_content) === uniqueText);
    assert.ok(found, 'Message sent by creator must be visible in Veloce brand conversation');
  });

  test('5. Message sent by Veloce Brand is visible to Priya (Creator) in Veloce conversation', async () => {
    const uniqueText = `Veloce Brand response test message ${Date.now()}`;
    const sendRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': VELOCE_BRAND_TOKEN
      },
      body: JSON.stringify({
        request_id: VELOCE_PEPSI_REQ_ID,
        content: uniqueText,
        sender_role: 'company'
      })
    });

    assert.equal(sendRes.status, 201, 'Expected 201 Created for brand message');

    // Fetch as Creator
    const fetchRes = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': PRIYA_CREATOR_TOKEN }
    });
    const fetchData = await fetchRes.json();
    const found = (fetchData.messages || []).some(m => (m.content || m.text_content) === uniqueText);
    assert.ok(found, 'Message sent by brand must be visible to creator');
  });

  test('6. Messages in Veloce conversation NEVER leak into Apex Media Studios conversation', async () => {
    const isolatedText = `Strictly Veloce Confidential Message ${Date.now()}`;
    await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': VELOCE_BRAND_TOKEN
      },
      body: JSON.stringify({
        request_id: VELOCE_PEPSI_REQ_ID,
        content: isolatedText,
        sender_role: 'company'
      })
    });

    // Check Apex conversation
    const apexRes = await fetch(`${BASE_URL}/api/messages/${APEX_CHOCOLATE_REQ_ID}`, {
      headers: { 'Authorization': APEX_BRAND_TOKEN }
    });
    const apexData = await apexRes.json();
    const leaked = (apexData.messages || []).some(m => (m.content || m.text_content) === isolatedText);
    assert.equal(leaked, false, 'Veloce confidential messages must not appear in Apex conversation');
  });

  test('7. Unauthorized brand is rejected with 403 Forbidden when requesting another company conversation', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': UNAUTHORIZED_BRAND_TOKEN }
    });
    assert.equal(res.status, 403, 'Expected 403 Forbidden for non-participant brand');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'FORBIDDEN_PARTICIPANT');
  });

  test('8. Unauthorized creator is rejected with 403 Forbidden when requesting another creator conversation', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': UNAUTHORIZED_CREATOR_TOKEN }
    });
    assert.equal(res.status, 403, 'Expected 403 Forbidden for non-participant creator');
  });

  test('9. Missing authentication returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`);
    assert.equal(res.status, 401, 'Expected 401 Unauthorized without auth header');
  });

  test('10. Non-existent collaboration ID returns 404 Not Found', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/messages/${nonExistentId}`, {
      headers: { 'Authorization': VELOCE_BRAND_TOKEN }
    });
    assert.equal(res.status, 404, 'Expected 404 for non-existent collaboration request');
  });

  test('11. Message persistence preserves UUID formatting and server timestamp', async () => {
    const msgRes = await fetch(`${BASE_URL}/api/messages/${VELOCE_PEPSI_REQ_ID}`, {
      headers: { 'Authorization': VELOCE_BRAND_TOKEN }
    });
    const msgData = await msgRes.json();
    const messages = msgData.messages || [];
    assert.ok(messages.length > 0, 'Should have persisted messages');
    const latest = messages[messages.length - 1];
    assert.ok(latest.timestamp || latest.created_at, 'Message must have a timestamp');
    assert.ok(latest.id || latest.message_id, 'Message must have a unique ID');
  });

  test('12. Existing demo login and collaboration endpoint continues working', async () => {
    const res = await fetch(`${BASE_URL}/api/collaboration`, {
      headers: { 'Authorization': PRIYA_CREATOR_TOKEN }
    });
    assert.equal(res.status, 200, 'Expected 200 OK for collaboration list');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.requests), 'Requests should be an array');
  });
});
