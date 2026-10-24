import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('GenLancer Landing Page & Navigation Audit', () => {
  const landingPagePath = path.resolve(__dirname, '../../client/src/components/landing/LandingPage.jsx');
  const landingPageCode = fs.readFileSync(landingPagePath, 'utf8');

  it('1. Navigation items target unique and existing section IDs', () => {
    // Check that target IDs exist
    assert.match(landingPageCode, /id="how-it-works"/, 'how-it-works section must exist');
    assert.match(landingPageCode, /id="features"/, 'features section must exist');
    assert.match(landingPageCode, /id="commercial-escrow"/, 'commercial-escrow section must exist');

    // Ensure no duplicate IDs
    const howItWorksMatches = landingPageCode.match(/id="how-it-works"/g);
    const featuresMatches = landingPageCode.match(/id="features"/g);
    const escrowMatches = landingPageCode.match(/id="commercial-escrow"/g);
    assert.strictEqual(howItWorksMatches.length, 1, 'how-it-works id must be unique');
    assert.strictEqual(featuresMatches.length, 1, 'features id must be unique');
    assert.strictEqual(escrowMatches.length, 1, 'commercial-escrow id must be unique');

    // Ensure legacy broken #guarantee anchor is eliminated from nav
    assert.doesNotMatch(landingPageCode, /href="#guarantee"/, 'Legacy broken #guarantee anchor must be removed');
  });

  it('2. Eliminates placeholder href="#" links and implements scroll-margin-top offset', () => {
    assert.doesNotMatch(landingPageCode, /href="#"/, 'No placeholder href="#" allowed');
    assert.match(landingPageCode, /scroll-mt-24/, 'Sections must include scroll offset for sticky header');
  });

  it('3. Section A Hero contains required headline and supporting copy', () => {
    assert.match(landingPageCode, /Find the Right/i, 'Headline must include "Find the Right"');
    assert.match(landingPageCode, /AI Creator/i, 'Headline must include "AI Creator"');
    assert.match(landingPageCode, /for Your Next Big Idea/i, 'Headline must include "for Your Next Big Idea"');
    assert.match(landingPageCode, /Find AI Creators/, 'Primary CTA must be "Find AI Creators"');
    assert.match(landingPageCode, /Join as Creator/, 'Secondary CTA must be "Join as Creator"');
  });

  it('4. Hero features prominent GenLancer brand logo presentation and completely removes product demo card', () => {
    // Brand logo presentation must be present in hero
    assert.match(landingPageCode, /Right Hero Visual: Prominent GenLancer Logo Presentation/, 'Hero must feature brand logo presentation');
    assert.match(landingPageCode, /<GenLancerLogo/, 'GenLancerLogo component must be rendered');
    assert.match(landingPageCode, /AI-Native Creator Marketplace/, 'Brand tagline must be present');

    // Product demo card must be completely removed
    assert.doesNotMatch(landingPageCode, /Campaign Match Simulation/i, 'Demo card title must be removed');
    assert.doesNotMatch(landingPageCode, /Match Breakdown/i, 'Match breakdown demo tab must be removed');
    assert.doesNotMatch(landingPageCode, /activePreviewTab/i, 'Demo card activePreviewTab state must be removed');
    assert.doesNotMatch(landingPageCode, /Alex Morgan/i, 'Sample creator card must be removed');

    // Prohibited fabricated marketplace statistics must be absent
    assert.doesNotMatch(landingPageCode, /\$4\.2M\+/, 'Fabricated revenue claim must be removed');
    assert.doesNotMatch(landingPageCode, /2,400\+ Verified AI Creators/, 'Fabricated creator count must be removed');
    assert.doesNotMatch(landingPageCode, /4\.98\/5 Agency Rating/, 'Fabricated rating must be removed');
    assert.doesNotMatch(landingPageCode, /100% Commercial IP Indemnification/, 'Fabricated indemnification claim must be removed');
    assert.doesNotMatch(landingPageCode, /top 1% AI filmmakers/i, 'Unverified top 1% claim must be removed');
  });

  it('5. Section B How It Works includes 3 distinct steps with visual workflow', () => {
    assert.match(landingPageCode, /Define the Brief|1\. Define the Brief/i);
    assert.match(landingPageCode, /Discover Creators|2\. Discover Creators/i);
    assert.match(landingPageCode, /Collaborate & Lock|3\. Collaborate/i);
  });

  it('6. Section C Features includes cards for all 6 genuinely implemented capabilities', () => {
    assert.match(landingPageCode, /AI Campaign Brief Builder/i);
    assert.match(landingPageCode, /Explainable Creator Matching/i);
    assert.match(landingPageCode, /Portfolios & Supporting Evidence/i);
    assert.match(landingPageCode, /Verification Status & Review/i);
    assert.match(landingPageCode, /Collaboration Timeline & History/i);
    assert.match(landingPageCode, /Search Filters & Matching Reports/i);
  });

  it('7. Section D Commercial Escrow explicitly states payments are not held or processed by GenLancer', () => {
    assert.match(landingPageCode, /Payments are not currently processed, held in custody, or disbursed by GenLancer/i);
    // Ensure no fake release or deposit action buttons
    assert.doesNotMatch(landingPageCode, /Release Escrow|Deposit Funds|Withdraw Balance/i);
  });

  it('8. Responsive mobile menu and keyboard accessibility are implemented', () => {
    assert.match(landingPageCode, /isMobileMenuOpen/, 'Mobile menu toggle state must be present');
    assert.match(landingPageCode, /aria-expanded/, 'Accessible aria-expanded attribute must be present');
    assert.match(landingPageCode, /aria-label/, 'Accessible aria-label attribute must be present');
  });
});
