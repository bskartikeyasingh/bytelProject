import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { collaborationService, CollaborationStatus } from '../services/collaborationService.js';

describe('GenLancer Improvement 7: Collaboration Lifecycle, Brief Versioning & Mutual Confirmation', () => {
  const companyId = 'COMP-LIFECYCLE-1';
  const freelancerId = 'FL-LIFECYCLE-1';
  const outsiderId = 'USER-OUTSIDER';

  let reqId;

  test('1. Company sends collaboration request and initial v1 metadata is enriched', async () => {
    const initialBrief = {
      title: 'Neon Cyberpunk Ad v1',
      budget: '$3,500',
      deadline: '2026-11-01',
      deliverables: '30s 4K Reel + Midjourney Assets'
    };

    const req = await collaborationService.createRequest({
      company_id: companyId,
      freelancer_id: freelancerId,
      project_brief: initialBrief
    });

    assert.ok(req.request_id);
    reqId = req.request_id;
    assert.equal(req.status, CollaborationStatus.PENDING);
    assert.equal(req.brief_version, 1);
    assert.equal(req.revision_history.length, 1);
    assert.equal(req.revision_history[0].version, 1);

    // Enriched metadata checks
    assert.equal(req.responsible_party, 'freelancer');
    assert.match(req.next_action, /Creator review/i);
    assert.equal(req.timeline_step, 1);
    assert.equal(req.company_confirmed, false);
    assert.equal(req.freelancer_confirmed, false);
    assert.equal(req.is_confirmed, false);
    assert.equal(req.is_rejected, false);
  });

  test('2. Rapid duplicate request submission is deduplicated safely', async () => {
    const duplicate = await collaborationService.createRequest({
      company_id: companyId,
      freelancer_id: freelancerId,
      project_brief: { title: 'Neon Cyberpunk Ad v1' }
    });

    // Should return existing pending request without creating a duplicate ID
    assert.equal(duplicate.request_id, reqId);
  });

  test('3. Creator reviews and requests clarification', async () => {
    // Outsider cannot request clarification
    await assert.rejects(async () => {
      await collaborationService.requestClarification(reqId, 'Can I do this?', 'freelancer', outsiderId);
    }, /Unauthorized/);

    const clarified = await collaborationService.requestClarification(
      reqId,
      'Does the $3,500 budget include voiceover and soundtrack licensing?',
      'freelancer',
      freelancerId
    );

    assert.equal(clarified.status, CollaborationStatus.CLARIFICATION_REQUESTED);
    assert.equal(clarified.clarification_history.length, 1);
    assert.equal(clarified.responsible_party, 'company');
    assert.match(clarified.next_action, /Company response or brief revision/i);
    assert.equal(clarified.timeline_step, 2);
  });

  test('4. Company responds to clarification thread', async () => {
    // Freelancer cannot respond as company
    await assert.rejects(async () => {
      await collaborationService.submitClarificationResponse(reqId, 'Answer', 'company', freelancerId);
    }, /Unauthorized/);

    const answered = await collaborationService.submitClarificationResponse(
      reqId,
      'We will provide licensed tracks; budget covers voiceover and mastering.',
      'company',
      companyId
    );

    assert.equal(answered.status, CollaborationStatus.CLARIFICATION_REQUESTED);
    assert.equal(answered.clarification_history.length, 2);
    assert.equal(answered.responsible_party, 'freelancer');
    assert.match(answered.next_action, /Creator review company response/i);
  });

  test('5. Company revises brief terms to v2: invalidates stale confirmations and preserves revision history', async () => {
    const updatedBrief = {
      title: 'Neon Cyberpunk Ad v2 (Soundtrack Covered)',
      budget: '$4,000',
      deadline: '2026-11-15',
      deliverables: '30s 4K Reel + VO Mastering',
      notes: 'Company covers sound licensing'
    };

    const revised = await collaborationService.updateBrief(reqId, updatedBrief, 'company', companyId);

    assert.equal(revised.brief_version, 2);
    assert.equal(revised.status, CollaborationStatus.PENDING);
    assert.equal(revised.revision_history.length, 2);
    assert.equal(revised.revision_history[1].version, 2);
    assert.equal(revised.revision_history[1].brief.budget, '$4,000');
    assert.equal(revised.company_confirmed, false);
    assert.equal(revised.freelancer_confirmed, false);
    assert.equal(revised.responsible_party, 'freelancer');
    assert.match(revised.next_action, /Creator review revised brief v2/i);
  });

  test('6. Stale confirmation on v1 is rejected once brief is at v2', async () => {
    // Creator accepts revised scope first
    await collaborationService.acceptRequest(reqId, 'freelancer', freelancerId);

    // Stale v1 confirmation must fail
    await assert.rejects(async () => {
      await collaborationService.confirmBrief(reqId, 'freelancer', 1, freelancerId);
    }, /Conflicting brief version.*stale/i);

    await assert.rejects(async () => {
      await collaborationService.confirmBrief(reqId, 'company', 1, companyId);
    }, /Conflicting brief version.*stale/i);
  });

  test('7. Mutual confirmation on active v2: step-by-step progress & idempotency', async () => {
    // Company confirms active version 2
    const step1 = await collaborationService.confirmBrief(reqId, 'company', 2, companyId);
    assert.equal(step1.company_confirmed, true);
    assert.equal(step1.freelancer_confirmed, false);
    assert.equal(step1.status, CollaborationStatus.ACCEPTED);
    assert.equal(step1.responsible_party, 'freelancer');
    assert.match(step1.next_action, /Awaiting Creator final confirmation on active brief v2/i);

    // Idempotency: Company calls confirmBrief on version 2 again
    const idempStep = await collaborationService.confirmBrief(reqId, 'company', 2, companyId);
    assert.equal(idempStep.company_confirmed, true);

    // Creator confirms active version 2
    const step2 = await collaborationService.confirmBrief(reqId, 'freelancer', 2, freelancerId);
    assert.equal(step2.company_confirmed, true);
    assert.equal(step2.freelancer_confirmed, true);
    assert.equal(step2.status, CollaborationStatus.CONFIRMED);
    assert.equal(step2.is_confirmed, true);
    assert.equal(step2.responsible_party, 'none');
    assert.match(step2.next_action, /Contract confirmed & escrow active/i);
    assert.equal(step2.timeline_step, 5);

    // Audit trail preserves complete events
    const auditTypes = step2.audit_history.map(e => e.event_type);
    assert.ok(auditTypes.includes('request_created'));
    assert.ok(auditTypes.includes('clarification_requested'));
    assert.ok(auditTypes.includes('company_clarification_submitted'));
    assert.ok(auditTypes.includes('brief_updated'));
    assert.ok(auditTypes.includes('freelancer_accepted'));
    assert.ok(auditTypes.includes('company_confirmed_brief'));
    assert.ok(auditTypes.includes('freelancer_confirmed_brief'));
    assert.ok(auditTypes.includes('collaboration_confirmed'));
  });

  test('8. Confirmed agreements cannot be mutated or rejected', async () => {
    await assert.rejects(async () => {
      await collaborationService.rejectRequest(reqId, 'Change of mind', 'freelancer', freelancerId);
    }, /Cannot reject request from current status/);

    await assert.rejects(async () => {
      await collaborationService.updateBrief(reqId, { budget: '$100' }, 'company', companyId);
    }, /Cannot update brief when status is "confirmed"/);
  });

  test('9. Invalidation of prior confirmation if brief updated before mutual completion', async () => {
    // Create new request
    const req = await collaborationService.createRequest({
      company_id: 'COMP-A',
      freelancer_id: 'FL-B',
      project_brief: { title: 'Project Test Invalidation', budget: '$1,000' }
    });

    await collaborationService.acceptRequest(req.request_id, 'freelancer', 'FL-B');

    // Freelancer confirms v1
    await collaborationService.confirmBrief(req.request_id, 'freelancer', 1, 'FL-B');
    const checked1 = await collaborationService.getRequest(req.request_id);
    assert.equal(checked1.freelancer_confirmed, true);

    // Company updates brief to v2 before confirming
    await collaborationService.updateBrief(req.request_id, { title: 'Project Test Invalidation v2', budget: '$1,200' }, 'company', 'COMP-A');
    const checked2 = await collaborationService.getRequest(req.request_id);

    // Freelancer's confirmation must have been invalidated!
    assert.equal(checked2.freelancer_confirmed, false);
    assert.equal(checked2.company_confirmed, false);
    assert.equal(checked2.status, CollaborationStatus.PENDING);
  });

  test('10. Rejection workflow records reason and terminates lifecycle', async () => {
    const req = await collaborationService.createRequest({
      company_id: 'COMP-REJECT',
      freelancer_id: 'FL-REJECT',
      project_brief: { title: 'Decline Test' }
    });

    const rejected = await collaborationService.rejectRequest(req.request_id, 'Fully booked for Q4', 'freelancer', 'FL-REJECT');
    assert.equal(rejected.status, CollaborationStatus.REJECTED);
    assert.equal(rejected.is_rejected, true);
    assert.equal(rejected.rejection_reason, 'Fully booked for Q4');
    assert.match(rejected.next_action, /Fully booked for Q4/i);

    // Idempotent rejection
    const idempRej = await collaborationService.rejectRequest(req.request_id, 'Fully booked for Q4', 'freelancer', 'FL-REJECT');
    assert.equal(idempRej.status, CollaborationStatus.REJECTED);
  });
});
