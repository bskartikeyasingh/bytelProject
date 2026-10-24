import React from 'react';
import { Sparkles, Building2 } from 'lucide-react';

export default function RoleSelector({ role, setRole }) {
  return (
    <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 mb-6 relative">
      <button
        type="button"
        onClick={() => setRole('freelancer')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          role === 'freelancer'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-1 ring-violet-400/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${role === 'freelancer' ? 'text-violet-200 animate-pulse' : 'text-slate-400'}`} />
        <span>AI Creator</span>
      </button>

      <button
        type="button"
        onClick={() => setRole('company')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          role === 'company'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-1 ring-violet-400/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Building2 className={`w-4 h-4 ${role === 'company' ? 'text-violet-200' : 'text-slate-400'}`} />
        <span>Brand / Agency</span>
      </button>
    </div>
  );
}
