import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  FileEdit, 
  ShieldCheck, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  History, 
  User, 
  Building2, 
  ArrowRight,
  XCircle
} from 'lucide-react';

export default function CollaborationTimeline({ 
  collaboration = {}, 
  showRevisionHistory = true,
  className = '' 
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const status = collaboration.status || 'pending';
  const briefVersion = collaboration.brief_version || collaboration.briefVersion || 1;
  const revisions = collaboration.revision_history || [];
  const timelineSteps = collaboration.timeline_steps || [];
  const responsibleParty = collaboration.responsible_party || (status === 'pending' ? 'freelancer' : (status === 'clarification_requested' ? 'company' : (status === 'accepted' ? 'both' : 'none')));
  const nextAction = collaboration.next_action || (
    status === 'pending' 
      ? 'Awaiting creator scope review' 
      : status === 'clarification_requested' 
        ? 'Awaiting clarification response'
        : status === 'accepted' 
          ? `Awaiting mutual confirmation on v${briefVersion}`
          : status === 'confirmed'
            ? 'Contract confirmed and active'
            : 'Collaboration declined'
  );

  const companyConfirmed = Boolean(
    collaboration.company_confirmed || 
    (collaboration.company_confirmed_at && collaboration.company_confirmed_version === briefVersion)
  );

  const freelancerConfirmed = Boolean(
    collaboration.freelancer_confirmed || 
    (collaboration.freelancer_confirmed_at && collaboration.freelancer_confirmed_version === briefVersion)
  );

  // Standard 5 steps if not provided by backend
  const steps = [
    {
      id: 1,
      title: 'Proposal Sent',
      subtitle: `v1 initiated`,
      isDone: status !== 'pending' || briefVersion > 1,
      isCurrent: status === 'pending' && briefVersion === 1,
      icon: Clock
    },
    {
      id: 2,
      title: 'Scope Review',
      subtitle: status === 'clarification_requested' ? 'Clarification' : (status === 'rejected' ? 'Declined' : 'Reviewed'),
      isDone: ['accepted', 'confirmed'].includes(status) || (status === 'pending' && briefVersion > 1),
      isCurrent: ['pending', 'clarification_requested'].includes(status) && briefVersion === 1,
      isDeclined: status === 'rejected',
      icon: status === 'clarification_requested' ? HelpCircle : ShieldCheck
    },
    {
      id: 3,
      title: 'Brief Terms',
      subtitle: `Active v${briefVersion}`,
      isDone: ['accepted', 'confirmed'].includes(status) || briefVersion > 1,
      isCurrent: status === 'pending' && briefVersion > 1,
      icon: FileEdit
    },
    {
      id: 4,
      title: 'Mutual Confirmation',
      subtitle: status === 'confirmed' ? '2 of 2 agreed' : `${(companyConfirmed ? 1 : 0) + (freelancerConfirmed ? 1 : 0)} of 2 agreed`,
      isDone: status === 'confirmed',
      isCurrent: status === 'accepted',
      icon: CheckCircle2
    },
    {
      id: 5,
      title: 'Active & Escrow',
      subtitle: status === 'confirmed' ? 'In Progress' : 'Pending',
      isDone: status === 'confirmed',
      isCurrent: status === 'confirmed',
      icon: ShieldCheck
    }
  ];

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-slate-200 shadow-sm ${className}`}>
      {/* Top Bar: Responsible Participant & Next Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Awaiting Action:
          </span>
          {responsibleParty === 'freelancer' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <User className="w-3 h-3" />
              Creator / Freelancer
            </span>
          )}
          {responsibleParty === 'company' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-3 h-3" />
              Brand / Company
            </span>
          )}
          {responsibleParty === 'both' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <User className="w-3 h-3" />
              <Building2 className="w-3 h-3" />
              Both Parties
            </span>
          )}
          {responsibleParty === 'none' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              {status === 'confirmed' ? 'Mutual Agreement Active' : 'Concluded'}
            </span>
          )}
        </div>

        {/* Mutual Confirmation Sub-Pills when in Accepted state */}
        {status === 'accepted' && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
              companyConfirmed 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              Brand: {companyConfirmed ? '✓ Confirmed' : '⏳ Awaiting'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
              freelancerConfirmed 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              Creator: {freelancerConfirmed ? '✓ Confirmed' : '⏳ Awaiting'}
            </span>
          </div>
        )}
      </div>

      {/* Next Action Instruction Callout */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-medium text-slate-200">Current Objective:</span>
          <span className="text-slate-300">{nextAction}</span>
        </div>
        {revisions.length > 1 && showRevisionHistory && (
          <button
            type="button"
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium ml-2 cursor-pointer transition-colors"
          >
            <History className="w-3 h-3" />
            <span>{revisions.length} Revisions</span>
            {historyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Timeline Steps Bar */}
      <div className="grid grid-cols-5 gap-2 relative">
        {steps.map((st, idx) => {
          const StepIcon = st.icon;
          const isDeclined = st.isDeclined;
          const isDone = st.isDone && !isDeclined;
          const isCurrent = st.isCurrent && !isDeclined;

          return (
            <div key={st.id} className="flex flex-col items-center text-center relative group">
              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div 
                  className={`hidden sm:block absolute top-3.5 left-1/2 w-full h-[2px] -z-0 ${
                    isDone ? 'bg-indigo-500/60' : 'bg-slate-800'
                  }`} 
                />
              )}

              {/* Step Circle Indicator */}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isDeclined 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500' 
                  : isDone
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : isCurrent
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                {isDeclined ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="mt-2 text-center w-full">
                <p className={`text-[11px] font-semibold truncate ${
                  isDeclined ? 'text-rose-400' : isDone ? 'text-slate-200' : isCurrent ? 'text-amber-300' : 'text-slate-500'
                }`}>
                  {st.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {st.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Brief Revision History Trail */}
      {historyExpanded && revisions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Audit Trail & Revision Snapshots</span>
            <span className="text-[10px] text-slate-500">Immutable Records</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {revisions.map((rev, i) => (
              <div 
                key={rev.version || i}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-400">
                    Version {rev.version}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {rev.timestamp ? new Date(rev.timestamp).toLocaleString() : 'Initial'}
                  </span>
                </div>
                {rev.brief && (
                  <div className="text-[11px] text-slate-300 grid grid-cols-2 gap-1 pt-1 border-t border-slate-800/50">
                    {rev.brief.budget && <div>Budget: <span className="font-medium text-slate-100">{rev.brief.budget}</span></div>}
                    {rev.brief.deadline && <div>Deadline: <span className="font-medium text-slate-100">{rev.brief.deadline}</span></div>}
                    {rev.brief.deliverables && <div className="col-span-2 text-slate-400 truncate">Deliverables: {rev.brief.deliverables}</div>}
                  </div>
                )}
                {rev.updated_by && (
                  <div className="text-[9px] text-slate-400">
                    Authored by: {rev.updated_by}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
