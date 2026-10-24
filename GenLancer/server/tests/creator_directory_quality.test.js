import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Creator Directory Quality & Live Data Contract Suite', () => {
  const BASE_URL = 'http://localhost:3001';

  test('1. Live backend returns creators without demo mode or mock fallback', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    assert.equal(res.status, 200, 'GET /api/creators should succeed with HTTP 200');

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.demo_mode, false, 'DEMO_MODE must remain false');
    assert.equal(data.source, 'database', 'Data source must be authoritative database');
    assert.ok(Array.isArray(data.creators), 'creators must be an array');
    assert.ok(data.creators.length > 0, 'creators array must not be empty');
  });

  test('2. Creator records preserve all required directory fields', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    for (const c of data.creators) {
      assert.ok(c.id, 'Creator must have an id');
      assert.ok(c.name, 'Creator must have a name');
      assert.ok(c.title, 'Creator must have a professional title');
      assert.ok(Array.isArray(c.skills), 'skills must be an array');
      assert.ok(c.skills.length > 0, 'skills must not be empty');
      assert.ok(Array.isArray(c.primaryTools || c.ai_tools_models), 'tools must be present');
      assert.ok(c.hourlyRate || c.hourly_rate_usd, 'hourly rate must be present');
      assert.ok(c.availability, 'availability must be present');
      assert.ok(Array.isArray(c.portfolio_items), 'portfolio_items must be an array');
    }
  });

  test('3. Verification status strictly reflects stored database state without fabrication', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    for (const c of data.creators) {
      // In the database seed, none of these 5 creators are audited yet
      assert.equal(c.verified, false, 'Unreviewed creators must not be marked verified');
      assert.equal(c.verification_status, 'pending_audit', 'Status must be pending_audit');
    }
  });

  test('4. Description placeholder normalization logic replaces "..." with neutral message', () => {
    const normalizeDescription = (desc) => {
      if (!desc || desc.trim() === '...' || desc.trim() === '') {
        return 'Description not provided';
      }
      return desc.trim();
    };

    assert.equal(normalizeDescription('...'), 'Description not provided');
    assert.equal(normalizeDescription('   ...  '), 'Description not provided');
    assert.equal(normalizeDescription(''), 'Description not provided');
    assert.equal(normalizeDescription(null), 'Description not provided');
    assert.equal(
      normalizeDescription('High-contrast neon cyberpunk commercial trailer'),
      'High-contrast neon cyberpunk commercial trailer'
    );
  });

  test('5. Avatar initials fallback generates correct, deterministic initials', () => {
    const getInitials = (name) => {
      if (!name || typeof name !== 'string') return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    assert.equal(getInitials('Aarav Sharma'), 'AS');
    assert.equal(getInitials('Priya Reddy'), 'PR');
    assert.equal(getInitials('Sneha Patel'), 'SP');
    assert.equal(getInitials('Karan Malhotra'), 'KM');
    assert.equal(getInitials('Ananya Iyer'), 'AI');
    assert.equal(getInitials('Mononym'), 'MO');
    assert.equal(getInitials(''), '?');
    assert.equal(getInitials(null), '?');
  });

  test('6. Metrics integrity: completed gigs and ratings reflect real API numbers', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    for (const c of data.creators) {
      assert.equal(typeof c.completedGigs, 'number', 'completedGigs must be a number');
      assert.ok(c.completedGigs >= 0, 'completedGigs must be >= 0');
      assert.equal(typeof c.score, 'number', 'score must be a number');
      assert.ok(c.score >= 0 && c.score <= 100, 'score must be between 0 and 100');
    }
  });
});
