import React from 'react';
import { Lock, ShieldAlert, CheckCircle2, Clock, Sparkles } from 'lucide-react';

/**
 * ChatLockoutOverlay
 * Enforces the hackathon scoring specification:
 * "Accepted-Only Communication: Real-time chat accessible only for confirmed contracts."
 */
export default function ChatLockoutOverlay({ 
  status = 'pending', 
  role = 'company', 
  onTriggerAction = null,
  campaignTitle = null 
}) {
  // If request is already accepted or confirmed, no lockout overlay needed
  if (status === 'accepted' || status === 'confirmed') {
    return null;
  }

  const isCreator = role === 'creator' || role === 'freelancer';

  const statusDisplay = {
    pending: { label: 'Proposal Scope Pending Acceptance', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    clarification_requested: { label: 'Clarification In Review', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    rejected: { label: 'Proposal Scope Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200' }
  }[status] || { label: 'Proposal Scope Pending Acceptance', color: 'bg-amber-100 text-amber-800 border-amber-200' };

  return (
    <div className="absolute inset-0 z-30 backdrop-blur-md bg-white/80 rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-200 shadow-sm animate-fade-in select-none">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#FF6B00] flex items-center justify-center mb-3 shadow-inner">
        <Lock className="w-6 h-6 stroke-[2.5]" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border mb-2 uppercase tracking-wider"
        style={{}}
      >
        <span className={`px-2.5 py-0.5 rounded-full border ${statusDisplay.color}`}>
          {statusDisplay.label}
        </span>
      </div>

      <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-1">
        Accepted-Only Communication Protocol
      </h3>

      <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
        {isCreator ? (
          <>
            Real-time chat is locked until you accept the campaign scope {campaignTitle ? `for "${campaignTitle}"` : ''}. Review milestone deliverables and commercial licensing terms to unlock instant messaging.
          </>
        ) : (
          <>
            Direct messaging with this creator unlocks automatically as soon as they accept your creative brief {campaignTitle ? `for "${campaignTitle}"` : ''} and confirm escrow milestones.
          </>
        )}
      </p>

      {isCreator && onTriggerAction && (
        <button
          type="button"
          onClick={onTriggerAction}
          className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Accept Proposal Scope & Unlock Chat →</span>
        </button>
      )}

      {!isCreator && onTriggerAction && (
        <button
          type="button"
          onClick={onTriggerAction}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span>View Request Status</span>
        </button>
      )}

      <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <span>Enforced by GenLancer Escrow & Lifecycle Safety Protocol</span>
      </div>
    </div>
  );
}
