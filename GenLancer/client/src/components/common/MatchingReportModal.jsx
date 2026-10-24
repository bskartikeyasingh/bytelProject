import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  SlidersHorizontal, 
  Layers, 
  Sparkles, 
  Download,
  Info
} from 'lucide-react';

export default function MatchingReportModal({ isOpen, onClose, report }) {
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'matrix' | 'requirements'

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const { summary, recommendations = [], comparison = [] } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="AI Matching & Requirements Report"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">AI Matching & Requirements Report</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {summary?.scoring_method || 'weighted_matching_v1'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Report ID: <code className="text-orange-300 font-mono text-[11px]">{report.report_id || 'rep-latest'}</code></span>
                <span>•</span>
                <span>Created: {report.created_at ? new Date(report.created_at).toLocaleString() : new Date().toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print or Save PDF"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Stats Banner */}
        <div className="px-6 py-3 bg-orange-50/50 border-b border-orange-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900">Campaign Query:</span>{' '}
            <span className="italic text-slate-600">"{summary?.project_summary || 'Custom Matching Query'}"</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
              Evaluated: <span className="text-slate-900">{summary?.total_candidates_evaluated ?? 0}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 border border-emerald-200 text-xs font-bold text-emerald-800">
              Eligible: <span>{summary?.eligible_count ?? 0}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-200 text-xs font-bold text-amber-800">
              Verification Needed: <span>{summary?.verification_required_count ?? 0}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-100/80 border border-rose-200 text-xs font-bold text-rose-800">
              Ineligible: <span>{summary?.ineligible_count ?? 0}</span>
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/50 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'border-[#FF6B00] text-[#FF6B00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Ranked Recommendations ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-[#FF6B00] text-[#FF6B00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            7-Dimension Comparison Matrix
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'requirements'
                ? 'border-[#FF6B00] text-[#FF6B00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Requirement-by-Requirement Evidence
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* TAB 1: Ranked Recommendations */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No candidates matched the specified criteria.</p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div 
                    key={rec.freelancer_id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                          #{rec.rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{rec.display_name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.eligibility_status === 'Eligible'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.eligibility_status === 'Requires Verification'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}>
                              {rec.eligibility_status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{rec.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-base font-black text-[#FF6B00]">
                            {rec.overall_score}%
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Composite Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation summary note */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">AI Recommendation:</span> {rec.recommendation_summary}
                    </div>

                    {/* Strengths & Gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {rec.strengths && rec.strengths.length > 0 && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                          <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                            {rec.strengths.map((str, i) => (
                              <li key={i}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.missing_capabilities && rec.missing_capabilities.length > 0 && (
                        <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                          <p className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Missing / Unverified Items
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                            {rec.missing_capabilities.map((gap, i) => (
                              <li key={i}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Verification Caveats */}
                    {rec.verification_requirements && rec.verification_requirements.length > 0 && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <div className="font-bold flex items-center gap-1.5 text-amber-950 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Human Verification Required:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {rec.verification_requirements.map((vr, i) => (
                            <li key={i}>{vr}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: 7-Dimension Comparison Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                The reference 7-dimension scoring breakdown: Skills (25%), Specialization (20%), Portfolio (20%), Content Type (10%), Tools (10%), Style & Format (10%), Experience (5%).
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3">Rank / Creator</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">Skills (25%)</th>
                      <th className="p-3 text-center">Spec (20%)</th>
                      <th className="p-3 text-center">Portf (20%)</th>
                      <th className="p-3 text-center">Type (10%)</th>
                      <th className="p-3 text-center">Tools (10%)</th>
                      <th className="p-3 text-center">Style (10%)</th>
                      <th className="p-3 text-center">Exp (5%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparison.map((c) => (
                      <tr key={c.freelancer_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {c.rank > 0 ? `#${c.rank} ` : ''}{c.display_name}
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            c.eligibility_status === 'Eligible'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.eligibility_status === 'Requires Verification'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.eligibility_status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-[#FF6B00] text-sm">
                          {c.overall_score}%
                        </td>
                        <td className="p-3 text-center font-mono">{c.skills_match}%</td>
                        <td className="p-3 text-center font-mono">{c.specialization_match}%</td>
                        <td className="p-3 text-center font-mono">{c.portfolio_relevance}%</td>
                        <td className="p-3 text-center font-mono">{c.content_type_compatibility}%</td>
                        <td className="p-3 text-center font-mono">{c.tool_compatibility}%</td>
                        <td className="p-3 text-center font-mono">{c.style_and_format_compatibility}%</td>
                        <td className="p-3 text-center font-mono">{c.experience_match}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Requirement-by-Requirement Evidence */}
          {activeTab === 'requirements' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Detailed evidence validation audit matching candidate profiles against campaign specs:
              </p>

              {recommendations.map((rec) => (
                <div key={rec.freelancer_id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-extrabold text-sm text-slate-900">
                      #{rec.rank} {rec.display_name}
                    </h4>
                    <span className="text-xs font-bold text-[#FF6B00]">{rec.overall_score}% Match</span>
                  </div>

                  <div className="space-y-2">
                    {(rec.requirement_analysis || []).map((an, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{an.requirement}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              an.status === 'Satisfied'
                                ? 'bg-emerald-100 text-emerald-800'
                                : an.status === 'Partially Satisfied'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {an.status}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            <span className="font-semibold text-slate-700">Evidence:</span> {an.evidence}
                          </p>
                        </div>

                        {an.recommended_action && (
                          <div className="shrink-0 text-right sm:max-w-xs">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                              {an.recommended_action}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compliance & Methodology Notice */}
          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Algorithmic Integrity Notice:</span> Scores and requirement statuses are calculated deterministically from verified profile assets, indexed portfolio metadata, and explicit campaign constraints. Heuristic scores are not fabricated or falsely represented as generative model outputs.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            GenLancer Automated Creator Matching Engine v2.0
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
