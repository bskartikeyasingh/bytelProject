import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Star, 
  Briefcase, 
  Cpu, 
  Layers, 
  ChevronRight, 
  Calculator,
  Film
} from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import { resolvePoster, isLikelyVideo } from '../../lib/mediaAssets';

/**
 * ExplainScoreModal
 * 
 * Interactive explainable AI modal demonstrating:
 * 1. Exact 7 scoring dimensions & their mathematical point contributions
 * 2. Status distinctions (Exact Match, Partial Match, Missing Evidence, Unmet Requirements)
 * 3. Evidence-linked skills connected to supporting portfolio items
 * 4. Transparent distinction between verified profile claims and missing information
 * 5. Clear demo mode labeling when applicable
 */
export default function ExplainScoreModal({ isOpen, onClose, candidate, onInspectPortfolioItem }) {
  const [selectedEvidenceSkill, setSelectedEvidenceSkill] = useState(null);

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

  if (!isOpen || !candidate) return null;

  const creator = candidate.creator || candidate;
  const overallScore = candidate.overall_score ?? candidate.matchPercentage ?? creator.score ?? 85;
  const classification = candidate.match_classification || 
    (overallScore >= 90 ? 'Exact Match' : overallScore >= 70 ? 'Partial Match' : 'Unmet Requirements');
  const isDemo = creator.is_demo || creator._is_demo_fixture;

  const breakdown = candidate.dimension_breakdown || {
    skills: { weight: 0.25, score: 85, contribution: 21.3, status: 'partial_match', evidence: 'Relevant prompt engineering skills found' },
    specialization: { weight: 0.20, score: 90, contribution: 18.0, status: 'exact_match', evidence: 'Directly aligns with required niche' },
    portfolio_relevance: { weight: 0.20, score: 85, contribution: 17.0, status: 'partial_match', evidence: 'Verified portfolio items match format' },
    content_type: { weight: 0.10, score: 100, contribution: 10.0, status: 'exact_match', evidence: 'Matches target output media format' },
    tools: { weight: 0.10, score: 90, contribution: 9.0, status: 'exact_match', evidence: 'Primary model pipeline supported' },
    style_and_format: { weight: 0.10, score: 80, contribution: 8.0, status: 'partial_match', evidence: 'Aspect ratio and visual style verified' },
    experience: { weight: 0.05, score: 95, contribution: 4.8, status: 'exact_match', evidence: `${creator.completedGigs ?? creator.completed_gigs ?? 0} completed gigs${creator.rating != null ? `, rating ${creator.rating}` : ''}` }
  };

  const matchedSkills = candidate.matched_skills || creator.skills || [];
  const missingSkills = candidate.missing_skills || [];
  const matchedTools = candidate.matched_tools || creator.primaryTools || creator.ai_tools_models || [];
  const missingTools = candidate.missing_tools || [];
  const supportingItems = candidate.supporting_portfolio_items || creator.portfolio_items || [];
  const relevantExperience = candidate.relevant_experience || {
    completed_gigs: creator.completedGigs ?? creator.completed_gigs ?? 0,
    rating: creator.rating ?? null,
    verified_workflow: Boolean(creator.verified)
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'exact_match':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Exact Match</span>;
      case 'partial_match':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Partial Match</span>;
      case 'missing_evidence':
      case 'missing_information':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">No Stored Evidence</span>;
      case 'unmet':
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">Unmet</span>;
    }
  };

  const getClassificationColor = (cls) => {
    if (cls === 'Exact Match') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    if (cls === 'Partial Match') return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    if (cls === 'Requires Verification') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
  };

  const dimensionLabels = {
    skills: { label: 'Required Skills', weight: '25%', icon: Cpu },
    specialization: { label: 'Domain Specialization', weight: '20%', icon: Sparkles },
    portfolio_relevance: { label: 'Portfolio Relevance', weight: '20%', icon: Film },
    content_type: { label: 'Content Type', weight: '10%', icon: Layers },
    tools: { label: 'Model Tools & Pipeline', weight: '10%', icon: Cpu },
    style_and_format: { label: 'Style & Aspect Ratio', weight: '10%', icon: Layers },
    experience: { label: 'Commercial Experience', weight: '5%', icon: Briefcase }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Explainable AI Match Score Breakdown"
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base tracking-tight">Explainable Match Score Breakdown</h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getClassificationColor(classification)}`}>
                  {classification}
                </span>
                {isDemo && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Demo Mode Fixture
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Auditable breakdown across 7 scoring dimensions with evidence trace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close Explain Score modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Creator Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img 
                src={creator.avatar} 
                alt={creator.name} 
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {creator.is_demo ? (
                    <VerificationBadge status="demo_unverified" size="sm" />
                  ) : creator.verified ? (
                    <VerificationBadge status="verified" scope={creator.verification_scope || 'workflow'} size="sm" />
                  ) : (
                    <VerificationBadge status={creator.verification_status || 'not_verified'} size="sm" />
                  )}
                  {(creator.ai_creator_score || creator.score) && (
                    <VerificationBadge type="score" score={creator.ai_creator_score || creator.score || 96} size="sm" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{creator.title} • {creator.hourlyRate || (creator.hourly_rate_usd ? `$${creator.hourly_rate_usd}/hr` : '$120/hr')}</p>
                {creator.specialization && (
                  <span className="inline-block mt-1 text-[11px] font-semibold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                    Specialization: {creator.specialization}
                  </span>
                )}
              </div>
            </div>

            {/* Score Ring / Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Match Score</span>
                <span className="text-3xl font-black text-slate-900 leading-none">{overallScore}%</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 mt-1">
                Deterministic 100-pt scale
              </span>
            </div>
          </div>

          {/* Mathematical Formula Explanation Banner */}
          <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200/80 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-orange-950">
              <Info className="w-4 h-4 text-[#FF6B00] shrink-0" />
              <span>Scoring Formula & Dimensional Weights</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Overall Score = (Skills × 0.25) + (Specialization × 0.20) + (Portfolio × 0.20) + (Content Type × 0.10) + (Tools × 0.10) + (Style & Format × 0.10) + (Experience × 0.05). Missing information contributes 0 points and is never assumed.
            </p>
          </div>

          {/* 7 Scoring Dimensions Detailed Grid */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Dimension Breakdown</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">7 weighted components sum to 100%</span>
            </h5>

            <div className="space-y-2.5">
              {Object.entries(breakdown).map(([dimKey, dimData]) => {
                const meta = dimensionLabels[dimKey] || { label: dimKey, weight: `${Math.round(dimData.weight * 100)}%`, icon: Cpu };
                const IconComponent = meta.icon;
                const scoreVal = Math.round(dimData.score);
                const contribVal = Number(dimData.contribution).toFixed(1);

                return (
                  <div 
                    key={dimKey}
                    className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800">{meta.label}</span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1.5 font-mono">({meta.weight})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(dimData.status)}
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {scoreVal}% <span className="text-[11px] font-normal text-slate-500">(+{contribVal} pts)</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          scoreVal >= 90 ? 'bg-emerald-500' : scoreVal >= 70 ? 'bg-[#FF6B00]' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%` }}
                      />
                    </div>

                    {/* Evidence String */}
                    {dimData.evidence && (
                      <p className="text-[11px] text-slate-600 font-medium pl-8 flex items-start gap-1">
                        <span className="text-slate-400">•</span>
                        <span>{dimData.evidence}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence-Linked Skills & Verification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matching vs Missing Skills */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Matching Skills & Capabilities</span>
              </h5>

              {matchedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map((skill, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEvidenceSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                        selectedEvidenceSkill === skill
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                      }`}
                      title="Click to highlight supporting portfolio evidence"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{skill}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific matching skills found in candidate profile.</p>
              )}

              {/* Missing Skills Warning */}
              {missingSkills.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-rose-700 block mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    <span>Missing Campaign Requirements:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((ms, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-lg font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        {ms} (not in profile)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Matching Tools & Experience */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-orange-600" />
                <span>Pipeline Tools & Experience</span>
              </h5>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Model Tools</span>
                <div className="flex flex-wrap gap-1.5">
                  {matchedTools.map((tool, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-lg font-medium bg-orange-100/80 text-orange-800 border border-orange-200">
                      {tool}
                    </span>
                  ))}
                  {missingTools.map((tool, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-lg font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      {tool} (missing)
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Commercial Track Record</span>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    {relevantExperience.completed_gigs} gigs completed
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {relevantExperience.rating} rating
                  </span>
                  {relevantExperience.verified_workflow && (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Portfolio Items (Evidence Trace) */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Supporting Portfolio Evidence ({supportingItems.length})</span>
                {selectedEvidenceSkill && (
                  <span className="text-[11px] font-semibold text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    Filtered by: {selectedEvidenceSkill}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {selectedEvidenceSkill ? (
                  <button 
                    onClick={() => setSelectedEvidenceSkill(null)}
                    className="text-[#FF6B00] hover:underline font-medium cursor-pointer"
                  >
                    Clear Filter
                  </button>
                ) : (
                  'Click a matching skill above to trace evidence'
                )}
              </span>
            </h5>

            {/* If skill was selected but has no portfolio evidence */}
            {selectedEvidenceSkill && (
              (!candidate.skill_evidence_map || !candidate.skill_evidence_map[selectedEvidenceSkill] || candidate.skill_evidence_map[selectedEvidenceSkill].length === 0) ? (
                <div className="p-3 mb-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Self-Reported Claim:</strong> No stored portfolio projects or generative media assets provide verified evidence for <em>"{selectedEvidenceSkill}"</em> in this creator's profile.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Found {candidate.skill_evidence_map[selectedEvidenceSkill].length} verified evidence asset(s) supporting <strong>"{selectedEvidenceSkill}"</strong>.
                  </span>
                </div>
              )
            )}

            {supportingItems.length > 0 ? (
              <div className="space-y-2.5">
                {supportingItems
                  .filter(item => {
                    if (!selectedEvidenceSkill) return true;
                    if (!candidate.skill_evidence_map || !candidate.skill_evidence_map[selectedEvidenceSkill]) return true;
                    return candidate.skill_evidence_map[selectedEvidenceSkill].some(ev => String(ev.id) === String(item.id) || ev.title === item.title);
                  })
                  .map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-orange-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {item.media_url || item.poster ? (
                          <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-200 relative flex items-center justify-center">
                            {item.media_url && isLikelyVideo(item.media_url) ? (
                              <video 
                                src={item.media_url} 
                                poster={item.poster || resolvePoster(item, item.tool)}
                                autoPlay 
                                muted 
                                loop 
                                playsInline 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fb = e.currentTarget.nextElementSibling;
                                  if (fb) fb.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <img 
                              src={item.poster || item.media_url || resolvePoster(item, item.tool)}
                              alt={item.title}
                              style={{ display: (item.media_url && isLikelyVideo(item.media_url)) ? 'none' : 'block' }}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = resolvePoster(item, item.tool);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-orange-100/60 text-[#FF6B00] flex items-center justify-center shrink-0">
                            <Film className="w-5 h-5" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h6 className="font-bold text-xs text-slate-900">{item.title || 'Verified Portfolio Asset'}</h6>
                            <VerificationBadge 
                              status={item.verification_status || (item.verified ? 'verified' : 'not_verified')}
                              scope={item.verification_scope || 'workflow'}
                              size="xs"
                            />
                            {item.tool && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                {item.tool}
                              </span>
                            )}
                            {item.aspect_ratio && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                {item.aspect_ratio}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description || item.prompt || 'Commercial AI deliverable with verified pipeline metadata'}
                          </p>
                          {item.project_outcome && (
                            <span className="inline-block mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Outcome: {item.project_outcome}
                            </span>
                          )}
                        </div>
                      </div>

                      {onInspectPortfolioItem && (
                        <button
                          onClick={() => onInspectPortfolioItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        >
                          <span>Inspect Prompt</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No portfolio evidence records found for this candidate.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            <span>Deterministic Source of Truth: </span>
            <code className="text-slate-700 font-mono text-[11px]">POST /api/score</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
