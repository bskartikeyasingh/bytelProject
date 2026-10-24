import React from 'react';
import { CheckCircle2, Clock, HelpCircle, XCircle, ShieldCheck } from 'lucide-react';

export default function BriefVersionBadge({ 
  version = 1, 
  revisionCount = null, 
  status = 'pending' 
}) {
  const statusConfig = {
    confirmed: {
      label: 'Confirmed & Escrow Active',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600'
    },
    accepted: {
      label: 'Accepted Scope',
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: ShieldCheck,
      iconColor: 'text-blue-600'
    },
    clarification_requested: {
      label: 'Clarification In Review',
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      icon: HelpCircle,
      iconColor: 'text-amber-600'
    },
    rejected: {
      label: 'Declined',
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: XCircle,
      iconColor: 'text-rose-600'
    },
    pending: {
      label: 'Pending Review',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Clock,
      iconColor: 'text-slate-500'
    }
  }[status] || {
    label: 'Pending Review',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    iconColor: 'text-slate-500'
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {/* Version Tag */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold shadow-xs">
        <span>v{version || 1}</span>
        {revisionCount > 1 && (
          <span className="text-orange-400 font-sans font-medium text-[9px]">
            ({revisionCount} rev)
          </span>
        )}
      </span>

      {/* Lifecycle Status Pill */}
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color}`}>
        <StatusIcon className={`w-3 h-3 ${statusConfig.iconColor}`} />
        <span>{statusConfig.label}</span>
      </span>
    </div>
  );
}
