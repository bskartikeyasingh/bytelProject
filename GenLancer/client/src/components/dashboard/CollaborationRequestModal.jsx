import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  FileText, 
  Layers, 
  Loader2, 
  Briefcase,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import VerificationBadge from '../common/VerificationBadge';

/**
 * CollaborationRequestModal
 * Authenticated Company user opens this modal to submit a complete, validated collaboration request to a creator.
 * Persists strictly via backend /api/collaboration to Supabase.
 */
export default function CollaborationRequestModal({
  isOpen,
  onClose,
  creator,
  user,
  onSuccessSubmitted
}) {
  const [formData, setFormData] = useState({
    title: '',
    brief: '',
    deliverables: '',
    budget: '',
    deadline: '',
    aspectRatio: '16:9',
    preferredTools: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Prepopulate reasonable defaults based on creator profile when opened
  useEffect(() => {
    if (isOpen && creator) {
      const defaultBudget = creator.hourly_rate_usd ? `$${creator.hourly_rate_usd * 20}` : '$3,500';
      const fourWeeksOut = new Date();
      fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);
      const defaultDeadline = fourWeeksOut.toISOString().split('T')[0];

      setFormData({
        title: '',
        brief: '',
        deliverables: '1x 4K Master Asset, 2x Social Cutdowns, Raw Project Files',
        budget: defaultBudget,
        deadline: defaultDeadline,
        aspectRatio: '16:9',
        preferredTools: Array.isArray(creator.ai_tools_models) ? creator.ai_tools_models.slice(0, 3).join(', ') : 'Runway Gen-3, Midjourney v6'
      });
      setErrors({});
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  }, [isOpen, creator]);

  if (!isOpen || !creator) return null;

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Project title is required.';
    } else if (formData.title.trim().length < 5) {
      errs.title = 'Project title should be at least 5 characters.';
    }

    if (!formData.brief.trim()) {
      errs.brief = 'Project brief and objectives are required.';
    } else if (formData.brief.trim().length < 20) {
      errs.brief = 'Please provide a clear brief (at least 20 characters) explaining project objectives.';
    }

    if (!formData.deliverables.trim()) {
      errs.deliverables = 'Expected deliverables are required.';
    }

    const cleanBudget = formData.budget.replace(/[^0-9.]/g, '');
    if (!cleanBudget || Number(cleanBudget) <= 0) {
      errs.budget = 'Please specify a valid budget amount (greater than $0).';
    }

    if (!formData.deadline) {
      errs.deadline = 'Proposed deadline date is required.';
    } else {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selectedDate.getTime()) || selectedDate < today) {
        errs.deadline = 'Deadline must be a valid future date.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token = localStorage.getItem('genlancer_auth_token') || sessionStorage.getItem('genlancer_auth_token');
      const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

      const payload = {
        freelancer_id: creator.id || 'FL001',
        project_brief: {
          title: formData.title.trim(),
          brief: formData.brief.trim(),
          description: formData.brief.trim(),
          deliverables: formData.deliverables.trim(),
          budget: formData.budget.startsWith('$') ? formData.budget : `$${formData.budget}`,
          deadline: formData.deadline,
          aspectRatio: formData.aspectRatio,
          preferredTools: formData.preferredTools,
          commercial_use_required: true,
          company_name: user?.user_metadata?.company_name || user?.user_metadata?.full_name || 'Apex Creative Agency'
        }
      };

      const res = await fetch(`${API_BASE}/api/collaboration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      setSubmitSuccess({
        requestId: data.request?.request_id,
        creatorName: creator.name
      });

      if (onSuccessSubmitted) {
        onSuccessSubmitted(data.request);
      }
    } catch (err) {
      console.error('Failed to dispatch collaboration request:', err);
      setSubmitError(err.message || 'Failed to submit collaboration request. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'CR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1128]/70 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="collab-modal-title"
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200/80 shadow-2xl overflow-hidden my-8 relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0A1128] to-[#1E293B] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 id="collab-modal-title" className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Request Collaboration</span>
                <span className="text-[11px] font-semibold bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">
                  Official Scope
                </span>
              </h2>
              <p className="text-xs text-slate-300">Propose a project brief and commercial terms to this creator.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Creator Identity Summary Pill */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0A1128] to-[#FF6B00] text-white font-black text-xs flex items-center justify-center shadow-xs">
              {getInitials(creator.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">{creator.name}</span>
                <VerificationBadge 
                  verified={creator.verified} 
                  verificationStatus={creator.verification_status} 
                  size="sm" 
                />
              </div>
              <p className="text-[11px] text-slate-500">{creator.title || creator.specializations?.[0] || 'AI Creator'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {creator.hourly_rate_usd ? (
              <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                ${creator.hourly_rate_usd}/hr rate
              </span>
            ) : null}
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-[11px]">
              {creator.availability || 'Available'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Submission Failed</span>
                <span className="text-[11px]">{submitError}</span>
              </div>
            </div>
          )}

          {submitSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Collaboration Request Dispatched!</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Your project scope has been persisted to the database and delivered to <span className="font-bold text-slate-800">{submitSuccess.creatorName}</span>'s incoming requests queue.
                </p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-mono text-slate-600 border border-slate-200">
                  Ref ID: {submitSuccess.requestId}
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Close & View Sent Requests</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Project Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Project Title <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. 60-Second Generative AI Launch Film</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cinematic AI Commercial Spot for Next-Gen SaaS"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    errors.title 
                      ? 'border-rose-400 focus:ring-rose-200' 
                      : 'border-slate-200 focus:border-[#FF6B00] focus:ring-orange-100'
                  }`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Project Brief & Objectives */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Project Brief & Objectives <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Min 20 characters</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your creative requirements, target audience, brand tone, visual aesthetic, and specific goals..."
                  value={formData.brief}
                  onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all resize-none ${
                    errors.brief 
                      ? 'border-rose-400 focus:ring-rose-200' 
                      : 'border-slate-200 focus:border-[#FF6B00] focus:ring-orange-100'
                  }`}
                />
                {errors.brief && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.brief}
                  </p>
                )}
              </div>

              {/* Deliverables */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Expected Deliverables <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Formats, resolutions, file packages</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1x 4K ProRes Master, 3x Social 9:16 Cuts, Workflow ComfyUI graphs"
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    errors.deliverables 
                      ? 'border-rose-400 focus:ring-rose-200' 
                      : 'border-slate-200 focus:border-[#FF6B00] focus:ring-orange-100'
                  }`}
                />
                {errors.deliverables && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.deliverables}
                  </p>
                )}
              </div>

              {/* Budget and Deadline Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Proposed Budget */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposed Budget or Fixed Escrow <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="$3,500"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/70 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                        errors.budget 
                          ? 'border-rose-400 focus:ring-rose-200' 
                          : 'border-slate-200 focus:border-[#FF6B00] focus:ring-orange-100'
                      }`}
                    />
                  </div>
                  {errors.budget && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.budget}
                    </p>
                  )}
                </div>

                {/* Proposed Timeline / Deadline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Deadline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className={`w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/70 border rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                        errors.deadline 
                          ? 'border-rose-400 focus:ring-rose-200' 
                          : 'border-slate-200 focus:border-[#FF6B00] focus:ring-orange-100'
                      }`}
                    />
                  </div>
                  {errors.deadline && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.deadline}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional: Format & Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Output Format / Ratio
                  </label>
                  <select
                    value={formData.aspectRatio}
                    onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="16:9">16:9 (Landscape Commercial)</option>
                    <option value="9:16">9:16 (Vertical Reels / TikTok)</option>
                    <option value="1:1">1:1 (Square Carousel)</option>
                    <option value="2.39:1">2.39:1 (Cinemascope Widescreen)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred AI Tools / Models
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Runway Gen-3, Midjourney v6"
                    value={formData.preferredTools}
                    onChange={(e) => setFormData({ ...formData, preferredTools: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Commercial Rights Guarantee Pill */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2.5 text-[11px] text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Full Commercial Ownership:</strong> Upon creator acceptance, deliverables are assigned under GenLancer Enterprise Commercial License with model output rights.
                </span>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Collaboration Request</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
