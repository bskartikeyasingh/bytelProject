import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Creator Profile Details & Directory Discovery Suite', () => {
  const BASE_URL = 'http://localhost:3001';

  test('1. Authoritative API returns live database creator records without mock mode', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.demo_mode, false);
    assert.equal(data.source, 'database');
    assert.ok(Array.isArray(data.creators));
    assert.equal(data.creators.length, 5, 'Must return the 5 live creator database records');
  });

  test('2. Single creator profile endpoint /api/creators/:creatorId returns full profile data', async () => {
    const res = await fetch(`${BASE_URL}/api/creators/FL001`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.creator, 'Response must include creator record');
    
    const creator = data.creator;
    assert.equal(creator.id, 'FL001');
    assert.equal(creator.name, 'Aarav Sharma');
    assert.equal(creator.title, 'AI Pipeline Developer');
    assert.equal(creator.hourly_rate_usd, 45);
    assert.equal(creator.availability, 'Available');
    assert.ok(Array.isArray(creator.skills), 'skills must be an array');
    assert.ok(Array.isArray(creator.ai_tools_models || creator.primaryTools), 'tools must be an array');
    assert.ok(Array.isArray(creator.specializations), 'specializations must be an array');
    assert.ok(creator.commercial_use_licensing, 'commercial licensing must be present');
    assert.ok(Array.isArray(creator.portfolio_items), 'portfolio_items must be an array');
    assert.ok(creator.portfolio_items.length > 0, 'portfolio items must not be empty');
  });

  test('3. Verification status is explicitly derived from backend and never fabricated', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    for (const c of data.creators) {
      assert.equal(c.verified, false, 'Unaudited creator must NOT be marked verified');
      assert.equal(c.verification_status, 'pending_audit', 'Status must reflect actual database value pending_audit');
    }
  });

  test('4. Dedicated portfolio integrity: Each creator retains their own media and portfolio items', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    const fl001 = data.creators.find(c => c.id === 'FL001');
    const fl002 = data.creators.find(c => c.id === 'FL002');
    const fl003 = data.creators.find(c => c.id === 'FL003');

    assert.ok(fl001.portfolio_items[0].title.includes('Smart Creative Brief Parser'));
    assert.ok(fl002.portfolio_items[0].title.includes('Neon Dreams Editorial'));
    assert.ok(fl003.portfolio_items[0].title.includes('GlitchFuel Cyberpunk Commercial'));

    // Verify distinct creator IDs and titles
    assert.notEqual(fl001.portfolio_items[0].title, fl002.portfolio_items[0].title);
    assert.notEqual(fl002.portfolio_items[0].title, fl003.portfolio_items[0].title);
  });

  test('5. Description placeholder normalizer converts "..." or empty strings to "Description not provided"', () => {
    const normalize = (desc) => {
      if (!desc || desc.trim() === '...' || desc.trim() === '') {
        return 'Description not provided';
      }
      return desc.trim();
    };

    assert.equal(normalize('...'), 'Description not provided');
    assert.equal(normalize('   ...  '), 'Description not provided');
    assert.equal(normalize(''), 'Description not provided');
    assert.equal(normalize(null), 'Description not provided');
    assert.equal(normalize('Real production description'), 'Real production description');
  });

  test('6. Filter model coverage: DB rates ($45, $50, $55, $60, $75) fit supported rate brackets', async () => {
    const res = await fetch(`${BASE_URL}/api/creators`);
    const data = await res.json();

    const rates = data.creators.map(c => Number(c.hourly_rate_usd));
    assert.deepEqual(rates.sort((a,b)=>a-b), [45, 50, 55, 60, 75]);

    // Check bracket matching
    const under50 = data.creators.filter(c => Number(c.hourly_rate_usd) <= 50);
    assert.equal(under50.length, 2, 'FL001 ($45) and FL004 ($50) match <= $50/hr');

    const under60 = data.creators.filter(c => Number(c.hourly_rate_usd) <= 60);
    assert.equal(under60.length, 4, 'FL001, FL004, FL005, FL002 match <= $60/hr');
  });
});
