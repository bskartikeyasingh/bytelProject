import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('Prompt & Workflow Inspection Component Verification', async (t) => {
  await t.test('1. PromptInspectorModal.jsx correctly imports VerificationBadge as default and named exports', () => {
    const modalPath = path.join(rootDir, 'client/src/components/common/PromptInspectorModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'PromptInspectorModal.jsx exists');
    const modalContent = fs.readFileSync(modalPath, 'utf8');

    // Check that VerificationBadge is imported correctly
    assert.match(
      modalContent,
      /import\s+VerificationBadge\s*,\s*\{\s*VerifiedWorkflowBadge/s,
      'VerificationBadge must be imported as the default export alongside named badges'
    );

    // Verify ErrorBoundary is imported and wraps the modal
    assert.match(
      modalContent,
      /import\s+ErrorBoundary\s+from\s+['"]\.\/ErrorBoundary['"]/,
      'ErrorBoundary must be imported'
    );
    assert.match(
      modalContent,
      /<ErrorBoundary/s,
      'PromptInspectorModal must wrap content with ErrorBoundary to prevent blank pages'
    );
  });

  await t.test('2. VerificationBadge.jsx exports both default VerificationBadge and specialized badge subcomponents', () => {
    const badgePath = path.join(rootDir, 'client/src/components/common/VerificationBadge.jsx');
    assert.ok(fs.existsSync(badgePath), 'VerificationBadge.jsx exists');
    const badgeContent = fs.readFileSync(badgePath, 'utf8');

    assert.match(
      badgeContent,
      /export\s+default\s+function\s+VerificationBadge/s,
      'Must have default export VerificationBadge'
    );
    assert.match(
      badgeContent,
      /export\s+function\s+VerifiedWorkflowBadge/s,
      'Must export VerifiedWorkflowBadge'
    );
    assert.match(
      badgeContent,
      /export\s+function\s+CertifiedPipelineBadge/s,
      'Must export CertifiedPipelineBadge'
    );
    assert.match(
      badgeContent,
      /export\s+function\s+AICreatorScoreBadge/s,
      'Must export AICreatorScoreBadge'
    );
  });

  await t.test('3. PromptInspectorModal handles missing or optional metadata gracefully with friendly empty states', () => {
    const modalPath = path.join(rootDir, 'client/src/components/common/PromptInspectorModal.jsx');
    const modalContent = fs.readFileSync(modalPath, 'utf8');

    // Friendly empty state for missing prompt
    assert.match(
      modalContent,
      /No prompt recorded for this asset/,
      'Displays friendly empty state message when prompt is missing'
    );

    // Friendly empty state for missing seed
    assert.match(
      modalContent,
      /Not recorded/,
      'Displays friendly empty state when seed is missing'
    );

    // State reset on item / open change so previous items do not leak
    assert.match(
      modalContent,
      /setCopiedPrompt\(false\);\s*setCopiedSeed\(false\);/s,
      'Resets copy states whenever item or isOpen changes'
    );
  });

  await t.test('4. CompanyDashboard isolates portfolio item data in onInspectWorkflow and onInspect', () => {
    const companyDashPath = path.join(rootDir, 'client/src/components/dashboard/CompanyDashboard.jsx');
    assert.ok(fs.existsSync(companyDashPath), 'CompanyDashboard.jsx exists');
    const companyDashContent = fs.readFileSync(companyDashPath, 'utf8');

    // Check onInspectWorkflow handles pf and does not force fallback prompts onto items without them
    assert.match(
      companyDashContent,
      /prompt:\s*pf\s*\?\s*\(pf\.prompt\s*\|\|\s*''\)/,
      'onInspectWorkflow preserves item prompt or empty string without leaking creator default'
    );

    // Check onInspect on CreatorProfileCard preserves item prompt or empty string
    assert.match(
      companyDashContent,
      /seed:\s*pf\s*\?\s*\(pf\.seed/,
      'onInspectWorkflow preserves individual item seed'
    );
  });

  await t.test('5. CreatorDashboard passes portfolio item correctly to PromptInspectorModal', () => {
    const creatorDashPath = path.join(rootDir, 'client/src/components/dashboard/CreatorDashboard.jsx');
    assert.ok(fs.existsSync(creatorDashPath), 'CreatorDashboard.jsx exists');
    const creatorDashContent = fs.readFileSync(creatorDashPath, 'utf8');

    // Check that PromptInspectorModal is used with selectedAssetForInspect
    assert.match(
      creatorDashContent,
      /<PromptInspectorModal\s+isOpen=\{!!selectedAssetForInspect\}\s+onClose=\{\(\)\s*=>\s*setSelectedAssetForInspect\(null\)\}\s+item=\{selectedAssetForInspect\}/s,
      'CreatorDashboard renders PromptInspectorModal bound to selectedAssetForInspect'
    );

    // Check that inspect button passes the specific item
    assert.match(
      creatorDashContent,
      /onClick=\{\(\)\s*=>\s*setSelectedAssetForInspect\(item\)\}/,
      'Inspect Prompt button passes the clicked portfolio item'
    );
  });

  await t.test('6. ErrorBoundary component exists and safely catches runtime errors', () => {
    const errorBoundaryPath = path.join(rootDir, 'client/src/components/common/ErrorBoundary.jsx');
    assert.ok(fs.existsSync(errorBoundaryPath), 'ErrorBoundary.jsx exists');
    const ebContent = fs.readFileSync(errorBoundaryPath, 'utf8');

    assert.match(ebContent, /getDerivedStateFromError/, 'Implements static getDerivedStateFromError');
    assert.match(ebContent, /componentDidCatch/, 'Implements componentDidCatch lifecycle');
    assert.match(ebContent, /handleReset/, 'Provides reset capability to recover from caught errors');
  });
});
