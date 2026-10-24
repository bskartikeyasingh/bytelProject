import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, Clock, AlertCircle, Info, X } from 'lucide-react';

/**
 * Universal AI Trust & Verification Badge Component
 * 
 * Supports meaningful verification states:
 * 1. 'verified' (with scope: 'workflow', 'pipeline', 'prompt')
 * 2. 'pending_review' (review in progress)
 * 3. 'not_verified' / 'unverified' (no audit performed)
 * 4. 'demo_unverified' (synthetic demo fixture)
 * 5. 'score' (AI creator evaluation score)
 * 
 * Includes interactive explanation modal/tooltip to clarify audit standards.
 */
export default function VerificationBadge({ 
  type = 'workflow', 
  status = null, // 'verified' | 'pending_review' | 'pending_audit' | 'not_verified' | 'unverified' | 'demo_unverified'
  scope = 'workflow', // 'workflow' | 'pipeline' | 'prompt'
  score = null, 
  size = 'sm', 
  showExplanation = false,
  className = '' 
}) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-extrabold'
  }[size] || 'px-2 py-0.5 text-[10px]';

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size] || 'w-3 h-3';

  // Determine effective state
  const effectiveStatus = status || (
    type === 'not_verified' || type === 'unverified' ? 'not_verified' :
    type === 'pending_review' || type === 'pending' || type === 'pending_audit' || type === 'in_review' ? 'pending_review' :
    type === 'demo_unverified' ? 'demo_unverified' :
    type === 'score' || type === 'ai_creator_score' ? 'score' :
    'verified'
  );

  const effectiveScope = scope || (
    type === 'pipeline' || type === 'certified_pipeline' ? 'pipeline' :
    type === 'prompt' ? 'prompt' :
    'workflow'
  );

  // Score Badge - only render if a valid score is supplied
  if (effectiveStatus === 'score' || type === 'score' || type === 'ai_creator_score') {
    if (score == null) return null;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-black bg-gradient-to-r from-[#FF6B00] to-amber-500 text-white shadow-xs tracking-tight ${sizeClasses} ${className}`}>
        <Sparkles className={`${iconSizes} text-white shrink-0`} />
        <span>AI Score: {score}/100</span>
      </span>
    );
  }

  // Demo Unverified Badge
  if (effectiveStatus === 'demo_unverified' || type === 'demo_unverified') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs tracking-tight ${sizeClasses} ${className}`}
        title="Unverified Demo Fixture - Synthetic data for preview only"
      >
        <AlertCircle className={`${iconSizes} text-amber-600 shrink-0`} />
        <span>Demo Fixture (Unverified)</span>
      </span>
    );
  }

  // Pending Review / Pending Audit State
  if (effectiveStatus === 'pending_review' || effectiveStatus === 'pending' || effectiveStatus === 'pending_audit' || effectiveStatus === 'in_review') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs tracking-tight ${sizeClasses} ${className}`}
        title="Verification pending: Workflow and creator audit in progress."
      >
        <Clock className={`${iconSizes} text-amber-600 shrink-0 animate-pulse`} />
        <span>Verification Pending</span>
      </span>
    );
  }

  // Not Verified / Neutral Unverified State
  if (effectiveStatus === 'not_verified' || effectiveStatus === 'unverified') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs tracking-tight ${sizeClasses} ${className}`}
        title="Unverified: This creator has not completed verification audit."
      >
        <AlertCircle className={`${iconSizes} text-slate-500 shrink-0`} />
        <span>Unverified</span>
      </span>
    );
  }

  // Verified States by Scope
  if (effectiveScope === 'pipeline') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200/90 shadow-xs tracking-tight ${sizeClasses} ${className}`}
        title="Verified Pipeline: The generative model toolchain and delivery pipeline have been verified."
      >
        <ShieldCheck className={`${iconSizes} text-blue-600 shrink-0`} />
        <span>Verified Pipeline</span>
      </span>
    );
  }

  if (effectiveScope === 'prompt') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200/90 shadow-xs tracking-tight ${sizeClasses} ${className}`}
        title="Verified Prompt: Generation prompt, seeds, and weight parameters are verified reproducible."
      >
        <CheckCircle2 className={`${iconSizes} text-purple-600 shrink-0`} />
        <span>Verified Prompt</span>
      </span>
    );
  }

  // Default Verified Workflow
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/90 shadow-xs tracking-tight ${sizeClasses} ${className}`}
      title="Verified Workflow: Generation reproducibility, seed audit, and licensing integrity confirmed."
    >
      <CheckCircle2 className={`${iconSizes} text-emerald-600 shrink-0`} />
      <span>✓ Verified</span>
    </span>
  );
}

// Named exports for backwards compatibility
export function VerifiedWorkflowBadge({ className = '', size = 'sm', status = 'verified' }) {
  return <VerificationBadge type="workflow" status={status} size={size} className={className} />;
}

export function CertifiedPipelineBadge({ className = '', size = 'sm', status = 'verified' }) {
  return <VerificationBadge type="pipeline" scope="pipeline" status={status} size={size} className={className} />;
}

export function AICreatorScoreBadge({ score = null, className = '', size = 'sm' }) {
  if (score == null) return null;
  return <VerificationBadge type="score" score={score} size={size} className={className} />;
}
