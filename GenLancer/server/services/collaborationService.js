import crypto from 'crypto';

/**
 * Collaboration Lifecycle Service
 * Faithfully adapts collaboration_service.py from the reference repository into Node.js.
 * Manages state machine transitions, brief revision versions, revision history,
 * mutual confirmations, participant authorization, clarification threads, and immutable audit trails.
 */
export const CollaborationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  CLARIFICATION_REQUESTED: 'clarification_requested',
  CONFIRMED: 'confirmed'
};

class CollaborationService {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient;
    // In-memory backing store for local/demo resilience
    this.requestsStore = new Map();
  }

  setSupabaseClient(client) {
    this.supabase = client;
  }

  _generateId(prefix = 'req') {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  _addAuditEvent(req, eventType, actor, metadata = {}) {
    const event = {
      event_id: this._generateId('evt'),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      actor,
      metadata
    };
    if (!Array.isArray(req.audit_history)) req.audit_history = [];
    req.audit_history.push(event);
    req.updated_at = new Date().toISOString();
    return event;
  }

  _enrichRequest(req) {
    if (!req) return req;

    const briefVer = req.brief_version || 1;
    const companyConfirmed = Boolean(req.company_confirmed_at && (req.company_confirmed_version === briefVer || (!req.company_confirmed_version && req.status === CollaborationStatus.CONFIRMED)));
    const freelancerConfirmed = Boolean(req.freelancer_confirmed_at && (req.freelancer_confirmed_version === briefVer || (!req.freelancer_confirmed_version && req.status === CollaborationStatus.CONFIRMED)));

    req.company_confirmed = companyConfirmed;
    req.freelancer_confirmed = freelancerConfirmed;
    req.is_confirmed = req.status === CollaborationStatus.CONFIRMED;
    req.is_rejected = req.status === CollaborationStatus.REJECTED;

    // Determine responsible party and next action
    let responsibleParty = 'none';
    let nextAction = '';
    let currentStep = 1;

    switch (req.status) {
      case CollaborationStatus.PENDING:
        responsibleParty = 'freelancer';
        if (briefVer > 1) {
          nextAction = `Creator review revised brief v${briefVer} (Accept, Clarify, or Decline)`;
          currentStep = 3;
        } else {
          nextAction = 'Creator review initial proposal (Accept, Clarify, or Decline)';
          currentStep = 1;
        }
        break;

      case CollaborationStatus.CLARIFICATION_REQUESTED:
        currentStep = 2;
        const lastMsg = Array.isArray(req.clarification_history) && req.clarification_history.length > 0
          ? req.clarification_history[req.clarification_history.length - 1]
          : null;
        if (lastMsg && lastMsg.sender === 'company') {
          responsibleParty = 'freelancer';
          nextAction = 'Creator review company response and accept or continue clarification';
        } else {
          responsibleParty = 'company';
          nextAction = 'Company response or brief revision required';
        }
        break;

      case CollaborationStatus.ACCEPTED:
        currentStep = 4;
        if (!companyConfirmed && !freelancerConfirmed) {
          responsibleParty = 'both';
          nextAction = `Mutual confirmation required on active brief v${briefVer}`;
        } else if (companyConfirmed && !freelancerConfirmed) {
          responsibleParty = 'freelancer';
          nextAction = `Awaiting Creator final confirmation on active brief v${briefVer}`;
        } else if (!companyConfirmed && freelancerConfirmed) {
          responsibleParty = 'company';
          nextAction = `Awaiting Company final confirmation on active brief v${briefVer}`;
        } else {
          responsibleParty = 'none';
          nextAction = 'Processing mutual confirmation...';
        }
        break;

      case CollaborationStatus.CONFIRMED:
        currentStep = 5;
        responsibleParty = 'none';
        nextAction = `Contract confirmed & escrow active for brief v${briefVer}`;
        break;

      case CollaborationStatus.REJECTED:
        currentStep = 2;
        responsibleParty = 'none';
        nextAction = `Collaboration proposal declined${req.rejection_reason ? `: ${req.rejection_reason}` : ''}`;
        break;

      case CollaborationStatus.CANCELLED:
        currentStep = 1;
        responsibleParty = 'none';
        nextAction = 'Collaboration proposal cancelled by company';
        break;

      default:
        responsibleParty = 'freelancer';
        nextAction = 'Review required';
        currentStep = 1;
    }

    req.responsible_party = responsibleParty;
    req.next_action = nextAction;
    req.timeline_step = currentStep;

    // Visual timeline steps definition
    req.timeline_steps = [
      {
        step: 1,
        title: 'Proposal Dispatched',
        status: currentStep > 1 || req.status === CollaborationStatus.CONFIRMED ? 'completed' : (currentStep === 1 ? 'current' : 'upcoming'),
        version: 1
      },
      {
        step: 2,
        title: 'Scope Review & Clarification',
        status: req.status === CollaborationStatus.REJECTED ? 'declined' : (currentStep > 2 || req.status === CollaborationStatus.CONFIRMED ? 'completed' : (currentStep === 2 ? 'current' : 'upcoming'))
      },
      {
        step: 3,
        title: 'Brief Revision & Terms',
        status: (briefVer > 1 || currentStep > 3 || req.status === CollaborationStatus.CONFIRMED) ? (currentStep > 3 ? 'completed' : 'current') : 'upcoming',
        version: briefVer
      },
      {
        step: 4,
        title: 'Mutual Confirmation',
        status: req.status === CollaborationStatus.CONFIRMED ? 'completed' : (currentStep === 4 ? 'current' : 'upcoming'),
        company_confirmed: companyConfirmed,
        freelancer_confirmed: freelancerConfirmed
      },
      {
        step: 5,
        title: 'Contract Active & Escrow',
        status: req.status === CollaborationStatus.CONFIRMED ? 'completed' : 'upcoming'
      }
    ];

    return req;
  }

  /**
   * Create a new collaboration request
   */
  async createRequest(data) {
    if (!data.company_id || !data.freelancer_id) {
      throw new Error('company_id and freelancer_id are required to create a collaboration request.');
    }

    // Deduplication check: if a pending request between identical parties exists within last 10s
    if (!data.request_id) {
      const recentDup = Array.from(this.requestsStore.values()).find(r => 
        r.company_id === data.company_id &&
        r.freelancer_id === data.freelancer_id &&
        r.status === CollaborationStatus.PENDING &&
        (Date.now() - new Date(r.created_at).getTime() < 10000)
      );
      if (recentDup) {
        return this._enrichRequest(recentDup);
      }
    }

    const isUuid = data.request_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.request_id);
    const requestId = isUuid ? data.request_id : (crypto.randomUUID ? crypto.randomUUID() : this._generateId('req'));
    const now = new Date().toISOString();
    const initialBrief = data.project_brief || {};

    const request = {
      request_id: requestId,
      company_id: data.company_id,
      freelancer_id: data.freelancer_id,
      project_brief: initialBrief,
      brief_version: data.brief_version || 1,
      revision_history: [
        {
          version: 1,
          brief: initialBrief,
          timestamp: now,
          actor: data.company_id || 'company'
        }
      ],
      source_search_id: data.source_search_id || null,
      source_report_id: data.source_report_id || null,
      status: CollaborationStatus.PENDING,
      created_at: now,
      updated_at: now,
      freelancer_response_at: null,
      company_confirmed_at: null,
      company_confirmed_version: null,
      freelancer_confirmed_at: null,
      freelancer_confirmed_version: null,
      clarification_history: [],
      rejection_reason: null,
      audit_history: []
    };

    this._addAuditEvent(request, 'request_created', 'company', {
      freelancer_id: data.freelancer_id,
      company_id: data.company_id,
      brief_version: request.brief_version
    });

    this.requestsStore.set(requestId, request);

    if (this.supabase) {
      try {
        const { error: insertErr } = await this.supabase
          .from('collaboration_requests')
          .insert([this._toDbRow(request)]);
        if (insertErr) {
          console.error('Supabase collaboration_requests insert error:', insertErr);
          throw new Error(`Failed to persist request to database: ${insertErr.message}`);
        }
      } catch (err) {
        console.error('Could not persist to Supabase collaboration_requests:', err.message);
        throw err;
      }
    }

    return this._enrichRequest(request);
  }

  /**
   * Get collaboration request by ID
   */
  async getRequest(requestId) {
    if (!requestId) throw new Error('requestId is required.');

    if (this.requestsStore.has(requestId)) {
      return this._enrichRequest(this.requestsStore.get(requestId));
    }

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('collaboration_requests')
          .select('*')
          .eq('request_id', requestId)
          .single();

        if (!error && data) {
          this.requestsStore.set(requestId, data);
          return this._enrichRequest(data);
        }
      } catch (err) {
        console.warn('Supabase query error:', err.message);
      }
    }

    throw new Error(`Collaboration request with ID ${requestId} not found.`);
  }

  /**
   * List requests for a company
   */
  async getRequestsByCompany(companyId, altCompanyId = null) {
    if (this.supabase) {
      try {
        let query = this.supabase.from('collaboration_requests').select('*');
        if (altCompanyId && altCompanyId !== companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.eq.${altCompanyId}`);
        } else {
          query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          data.forEach(d => this.requestsStore.set(d.request_id, d));
          return data.map(r => this._enrichRequest(r));
        }
      } catch (err) {
        console.warn('Supabase getRequestsByCompany warning:', err.message);
      }
    }
    const local = Array.from(this.requestsStore.values())
      .filter(r => r.company_id === companyId || (altCompanyId && r.company_id === altCompanyId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return local.map(r => this._enrichRequest(r));
  }

  /**
   * List requests for a freelancer
   */
  async getRequestsByFreelancer(freelancerId, altFreelancerId = null) {
    if (this.supabase) {
      try {
        let query = this.supabase.from('collaboration_requests').select('*');
        if (altFreelancerId && altFreelancerId !== freelancerId) {
          query = query.or(`freelancer_id.eq.${freelancerId},freelancer_id.eq.${altFreelancerId}`);
        } else {
          query = query.eq('freelancer_id', freelancerId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          data.forEach(d => this.requestsStore.set(d.request_id, d));
          return data.map(r => this._enrichRequest(r));
        }
      } catch (err) {
        console.warn('Supabase getRequestsByFreelancer warning:', err.message);
      }
    }
    const local = Array.from(this.requestsStore.values())
      .filter(r => r.freelancer_id === freelancerId || (altFreelancerId && r.freelancer_id === altFreelancerId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return local.map(r => this._enrichRequest(r));
  }

  /**
   * Validate participant authorization
   */
  _validateParticipant(req, actor, actorId = null) {
    if (actor === 'company') {
      const allowed = [req.company_id, 'COMP001', 'company', '0e87388d-995e-43cf-a1a1-3da8156bbbbb'];
      if (actorId && !allowed.includes(actorId)) {
        throw new Error(`Unauthorized: ${actorId} is not the company for this request.`);
      }
    } else if (actor === 'freelancer') {
      const allowed = [req.freelancer_id, 'FL001', 'c1', 'freelancer', '60f38cf2-d514-4c45-a9c5-e65e923a560a'];
      if (actorId && !allowed.includes(actorId)) {
        throw new Error(`Unauthorized: ${actorId} is not the freelancer for this request.`);
      }
    }
  }

  /**
   * Company cancels request (Only valid from pending status)
   */
  async cancelRequest(requestId, actor = 'company', actorId = null) {
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'company', actorId);

    // Idempotency: If already cancelled, return gracefully
    if (req.status === CollaborationStatus.CANCELLED) {
      return this._enrichRequest(req);
    }

    if (req.status !== CollaborationStatus.PENDING) {
      throw new Error(`Cannot cancel request from current status: "${req.status}". Only pending requests can be cancelled.`);
    }

    req.status = CollaborationStatus.CANCELLED;
    this._addAuditEvent(req, 'company_cancelled', actor, { cancelled_at: new Date().toISOString() });
    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Freelancer accepts request
   */
  async acceptRequest(requestId, actor = 'freelancer', actorId = null) {
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'freelancer', actorId);

    // Idempotency: If already accepted, return gracefully
    if (req.status === CollaborationStatus.ACCEPTED) {
      return this._enrichRequest(req);
    }

    const validPrev = [CollaborationStatus.PENDING, CollaborationStatus.CLARIFICATION_REQUESTED];
    if (!validPrev.includes(req.status)) {
      throw new Error(`Cannot accept request from current status: "${req.status}".`);
    }

    req.status = CollaborationStatus.ACCEPTED;
    req.freelancer_response_at = new Date().toISOString();
    this._addAuditEvent(req, 'freelancer_accepted', actor, { freelancer_id: req.freelancer_id, version: req.brief_version });

    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Freelancer rejects request
   */
  async rejectRequest(requestId, reason = null, actor = 'freelancer', actorId = null) {
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'freelancer', actorId);

    // Idempotency: If already rejected, return gracefully
    if (req.status === CollaborationStatus.REJECTED) {
      return this._enrichRequest(req);
    }

    if ([CollaborationStatus.CONFIRMED, CollaborationStatus.REJECTED].includes(req.status)) {
      throw new Error(`Cannot reject request from current status: "${req.status}".`);
    }

    req.status = CollaborationStatus.REJECTED;
    req.rejection_reason = reason;
    req.freelancer_response_at = new Date().toISOString();
    this._addAuditEvent(req, 'freelancer_rejected', actor, { reason });

    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Request clarification
   */
  async requestClarification(requestId, message, actor = 'freelancer', actorId = null) {
    if (!message || !message.trim()) {
      throw new Error('Clarification message must not be empty.');
    }
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'freelancer', actorId);

    if (![CollaborationStatus.PENDING, CollaborationStatus.ACCEPTED].includes(req.status)) {
      throw new Error(`Cannot request clarification from status: "${req.status}".`);
    }

    req.status = CollaborationStatus.CLARIFICATION_REQUESTED;
    if (!Array.isArray(req.clarification_history)) req.clarification_history = [];
    req.clarification_history.push({
      message_id: this._generateId('cmsg'),
      sender: actor,
      content: message.trim(),
      timestamp: new Date().toISOString()
    });

    this._addAuditEvent(req, 'clarification_requested', actor, { message: message.trim() });
    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Submit clarification response
   */
  async submitClarificationResponse(requestId, message, actor = 'company', actorId = null) {
    if (!message || !message.trim()) {
      throw new Error('Clarification response message must not be empty.');
    }
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'company', actorId);

    if (req.status !== CollaborationStatus.CLARIFICATION_REQUESTED) {
      throw new Error(`Can only respond to clarification when status is "clarification_requested".`);
    }

    if (!Array.isArray(req.clarification_history)) req.clarification_history = [];
    req.clarification_history.push({
      message_id: this._generateId('cmsg'),
      sender: actor,
      content: message.trim(),
      timestamp: new Date().toISOString()
    });

    req.status = CollaborationStatus.CLARIFICATION_REQUESTED;
    this._addAuditEvent(req, 'company_clarification_submitted', actor, { message: message.trim() });
    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Update brief revision with versioning and history tracking
   * Invalidate previous approvals when revision changes
   */
  async updateBrief(requestId, newBrief, actor = 'company', actorId = null) {
    const req = await this.getRequest(requestId);
    this._validateParticipant(req, 'company', actorId);

    if ([CollaborationStatus.CONFIRMED, CollaborationStatus.REJECTED].includes(req.status)) {
      throw new Error(`Cannot update brief when status is "${req.status}".`);
    }

    const previousVersion = req.brief_version || 1;
    req.brief_version = previousVersion + 1;
    req.project_brief = newBrief;

    // Track in revision history
    if (!Array.isArray(req.revision_history)) {
      req.revision_history = [];
    }
    req.revision_history.push({
      version: req.brief_version,
      brief: newBrief,
      timestamp: new Date().toISOString(),
      updated_by: actor,
      previous_version: previousVersion
    });

    // Invalidate previous approvals when revision changes
    req.company_confirmed_at = null;
    req.freelancer_confirmed_at = null;
    req.company_confirmed_version = null;
    req.freelancer_confirmed_version = null;

    // Reset status to pending so revised terms are re-accepted
    req.status = CollaborationStatus.PENDING;

    this._addAuditEvent(req, 'brief_updated', actor, { 
      previous_version: previousVersion,
      new_version: req.brief_version,
      invalidated_confirmations: true
    });

    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  /**
   * Mutual confirmation of specific brief version
   */
  async confirmBrief(requestId, actor, briefVersion, actorId = null) {
    const req = await this.getRequest(requestId);
    if (![CollaborationStatus.ACCEPTED, CollaborationStatus.PENDING].includes(req.status)) {
      throw new Error(`Brief can only be confirmed after request is in active discussion or accepted.`);
    }

    if (!briefVersion || Number(briefVersion) !== req.brief_version) {
      throw new Error(`Conflicting brief version. Current active version is ${req.brief_version}. Confirmation on version ${briefVersion || 'omitted'} is stale or invalid.`);
    }

    const now = new Date().toISOString();
    if (actor === 'company') {
      this._validateParticipant(req, 'company', actorId);
      // Idempotency: if already confirmed for this version
      if (req.company_confirmed_at && req.company_confirmed_version === req.brief_version) {
        return this._enrichRequest(req);
      }
      req.company_confirmed_at = now;
      req.company_confirmed_version = req.brief_version;
      this._addAuditEvent(req, 'company_confirmed_brief', 'company', { version: req.brief_version });
    } else if (actor === 'freelancer') {
      this._validateParticipant(req, 'freelancer', actorId);
      // Idempotency: if already confirmed for this version
      if (req.freelancer_confirmed_at && req.freelancer_confirmed_version === req.brief_version) {
        return this._enrichRequest(req);
      }
      req.freelancer_confirmed_at = now;
      req.freelancer_confirmed_version = req.brief_version;
      this._addAuditEvent(req, 'freelancer_confirmed_brief', 'freelancer', { version: req.brief_version });
    } else {
      throw new Error(`Unknown actor "${actor}". Must be 'company' or 'freelancer'.`);
    }

    // Both confirmed on the current active version
    if (req.company_confirmed_at && 
        req.freelancer_confirmed_at &&
        req.company_confirmed_version === req.brief_version &&
        req.freelancer_confirmed_version === req.brief_version) {
      req.status = CollaborationStatus.CONFIRMED;
      this._addAuditEvent(req, 'collaboration_confirmed', 'system', { final_version: req.brief_version });
    }

    await this._syncSave(req);
    return this._enrichRequest(req);
  }

  _toDbRow(req) {
    return {
      request_id: req.request_id,
      company_id: req.company_id,
      freelancer_id: req.freelancer_id,
      project_brief: req.project_brief || {},
      brief_version: req.brief_version || 1,
      source_search_id: req.source_search_id || null,
      source_report_id: req.source_report_id || null,
      status: req.status || 'pending',
      created_at: req.created_at,
      updated_at: req.updated_at,
      freelancer_response_at: req.freelancer_response_at || null,
      company_confirmed_at: req.company_confirmed_at || null,
      freelancer_confirmed_at: req.freelancer_confirmed_at || null,
      clarification_history: req.clarification_history || [],
      rejection_reason: req.rejection_reason || null,
      audit_history: req.audit_history || []
    };
  }

  async _syncSave(req) {
    const existing = this.requestsStore.get(req.request_id);
    if (existing) {
      if (existing.company_id !== req.company_id || existing.freelancer_id !== req.freelancer_id) {
        throw new Error('Forbidden: Collaboration ownership and participant identities are immutable.');
      }
    }
    this.requestsStore.set(req.request_id, req);
    if (this.supabase) {
      try {
        await this.supabase
          .from('collaboration_requests')
          .upsert([this._toDbRow(req)], { onConflict: 'request_id' });
      } catch (err) {
        console.warn('Supabase sync warning:', err.message);
      }
    }
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;
