import test, { describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

describe('Portfolio Data Isolation & Ownership Test Suite', () => {
  const newCreatorId = `test_new_creator_${Date.now()}`;
  const otherCreatorId = `test_other_creator_${Date.now()}`;
  const demoCreatorId = 'demo_user_101';

  const newCreatorAuth = {
    Authorization: `Bearer demo-token:freelancer:${newCreatorId}:newcreator@test.com`,
    'Content-Type': 'application/json'
  };

  const otherCreatorAuth = {
    Authorization: `Bearer demo-token:freelancer:${otherCreatorId}:othercreator@test.com`,
    'Content-Type': 'application/json'
  };

  let savedItemId = null;

  test('Scenario 1 & 2: New creator account has zero portfolio items (empty state guaranteed)', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.creator_id, newCreatorId);
    assert.strictEqual(data.count, 0);
    assert.deepStrictEqual(data.portfolio_items, []);

    // Verify none of the leaked demo projects are present
    const titles = (data.portfolio_items || []).map(p => p.title);
    assert.ok(!titles.includes('WhatsApp Video 2026-10-24 at 1.11.28 PM'));
    assert.ok(!titles.includes('Orbital Hyperdrive Sequence'));
    assert.ok(!titles.includes('Cyberpunk Alley 4K'));
    assert.ok(!titles.includes('Coca cola'));
  });

  test('Scenario 3: Repeated query (simulating reload or sign-out/sign-in) still returns 0 items', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.count, 0);
    assert.deepStrictEqual(data.portfolio_items, []);
  });

  test('Scenario 4: Add a project to new creator via native portfolio upload', async () => {
    const dummyImageContent = Buffer.from('portfolio-image-content-data');
    const blob = new Blob([dummyImageContent], { type: 'image/png' });

    const form = new FormData();
    form.append('mediaFile', blob, 'my_first_work.png');
    form.append('title', 'Creator 1 Exclusive Visual');
    form.append('modelUsed', 'Midjourney v6');
    form.append('promptSummary', 'Photorealistic hyper-detailed neon futuristic cityscape');
    form.append('creatorRole', 'Generative AI Director');
    form.append('niche', 'Commercial / Advertising');
    form.append('aspectRatio', '16:9');

    const res = await fetch(`${BASE_URL}/api/creators/portfolio/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer demo-token:freelancer:${newCreatorId}:newcreator@test.com`
      },
      body: form
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.item);
    assert.strictEqual(json.item.creator_id, newCreatorId);
    assert.strictEqual(json.item.title, 'Creator 1 Exclusive Visual');
    savedItemId = json.item.id;
  });

  test('Scenario 5: Reload after adding project: only the new creator project persists', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 1);
    assert.strictEqual(data.portfolio_items.length, 1);
    assert.strictEqual(data.portfolio_items[0].id, savedItemId);
    assert.strictEqual(data.portfolio_items[0].title, 'Creator 1 Exclusive Visual');
  });

  test('Scenario 6: Different creator account does NOT see the first creator projects', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${otherCreatorId}/portfolio`, {
      headers: otherCreatorAuth
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 0);
    assert.deepStrictEqual(data.portfolio_items, []);
  });

  test('Scenario 7: First creator re-authenticates and sees exclusively their own project', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.count, 1);
    assert.strictEqual(data.portfolio_items[0].id, savedItemId);
  });

  test('Scenario 8: Demo account retains designated demo projects without leaking to real accounts', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/${demoCreatorId}/portfolio`, {
      headers: {
        Authorization: `Bearer demo-token:freelancer:${demoCreatorId}:aarav@genlancer.demo`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.portfolio_items.length > 0, 'Demo account must still have demo projects');

    // Confirm new real creator does NOT have demo projects
    const newCreatorRes = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });
    const newCreatorData = await newCreatorRes.json();
    const demoTitles = data.portfolio_items.map(p => p.title);
    const newCreatorTitles = newCreatorData.portfolio_items.map(p => p.title);
    for (const demoTitle of demoTitles) {
      if (demoTitle !== 'Creator 1 Exclusive Visual') {
        assert.ok(!newCreatorTitles.includes(demoTitle), `Demo item "${demoTitle}" leaked to real creator!`);
      }
    }
  });

  test('Scenario 9: Backend rejects unauthenticated portfolio upload attempts (401)', async () => {
    const form = new FormData();
    form.append('title', 'Unauthorized upload');

    const res = await fetch(`${BASE_URL}/api/creators/portfolio/upload`, {
      method: 'POST',
      body: form
    });

    assert.strictEqual(res.status, 401);
  });

  test('Scenario 10: Backend rejects Creator B attempting to update or delete Creator A portfolio item (403)', async () => {
    assert.ok(savedItemId, 'Saved item must exist');

    // Creator B attempts to update Creator A item
    const updateRes = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio/${savedItemId}`, {
      method: 'PUT',
      headers: otherCreatorAuth,
      body: JSON.stringify({ title: 'Hacked by Creator B' })
    });

    assert.strictEqual(updateRes.status, 403);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.code, 'FORBIDDEN_CREATOR_OWNER');

    // Creator B attempts to delete Creator A item
    const deleteRes = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio/${savedItemId}`, {
      method: 'DELETE',
      headers: otherCreatorAuth
    });

    assert.strictEqual(deleteRes.status, 403);
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteData.code, 'FORBIDDEN_CREATOR_OWNER');

    // Creator A can legitimately delete their own item
    const legitDeleteRes = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio/${savedItemId}`, {
      method: 'DELETE',
      headers: newCreatorAuth
    });

    assert.strictEqual(legitDeleteRes.status, 200);
    const legitData = await legitDeleteRes.json();
    assert.strictEqual(legitData.success, true);

    // Verify item is now deleted
    const verifyRes = await fetch(`${BASE_URL}/api/creators/${newCreatorId}/portfolio`, {
      headers: newCreatorAuth
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.count, 0);
  });
});
