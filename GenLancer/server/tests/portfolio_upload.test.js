import test, { describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

describe('Portfolio Native File Upload System', () => {
  test('Upload image file generates static URL and portfolio item', async () => {
    const dummyImageContent = Buffer.from('fake-png-binary-data');
    const blob = new Blob([dummyImageContent], { type: 'image/png' });

    const form = new FormData();
    form.append('mediaFile', blob, 'test_render.png');
    form.append('title', 'Cyberpunk Alley 4K');
    form.append('modelUsed', 'Midjourney v6');
    form.append('promptSummary', 'Dystopian Tokyo rain reflections neon bokeh');
    form.append('creatorId', 'demo_user_101');

    const res = await fetch(`${BASE_URL}/api/creators/portfolio/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer demo-token:freelancer:demo_user_101:aarav@genlancer.demo'
      },
      body: form
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.item);
    assert.strictEqual(json.item.title, 'Cyberpunk Alley 4K');
    assert.strictEqual(json.item.media_type, 'image');
    assert.ok(json.item.media_url.includes('/uploads/'));
    assert.ok(json.item.thumbnail_url);

    // Verify static serving
    const staticRes = await fetch(json.item.media_url);
    assert.strictEqual(staticRes.status, 200);
  });

  test('Upload video file provides zero-black-screen thumbnail fallback', async () => {
    const dummyVideoContent = Buffer.from('fake-mp4-video-stream');
    const blob = new Blob([dummyVideoContent], { type: 'video/mp4' });

    const form = new FormData();
    form.append('mediaFile', blob, 'test_motion.mp4');
    form.append('title', 'Orbital Hyperdrive Sequence');
    form.append('modelUsed', 'Runway Gen-3 Alpha');
    form.append('promptSummary', 'Hyperdrive particle trail cinematic anamorphic lens');
    form.append('creatorId', 'demo_user_101');

    const res = await fetch(`${BASE_URL}/api/creators/portfolio/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer demo-token:freelancer:demo_user_101:aarav@genlancer.demo'
      },
      body: form
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.item.media_type, 'video');
    assert.ok(json.item.media_url.includes('/uploads/'));
    // Zero-black-screen thumbnail guaranteed
    assert.ok(json.item.thumbnail_url && json.item.thumbnail_url.startsWith('http'));
  });

  test('Exceeding 50MB file size limit returns 400 with user-friendly alert', async () => {
    // Construct dummy buffer larger than 50MB (51MB)
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
    const blob = new Blob([largeBuffer], { type: 'video/mp4' });

    const form = new FormData();
    form.append('mediaFile', blob, 'oversized.mp4');
    form.append('title', 'Oversized Asset');

    const res = await fetch(`${BASE_URL}/api/creators/portfolio/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer demo-token:freelancer:demo_user_101:aarav@genlancer.demo'
      },
      body: form
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /50MB/i);
  });
});
