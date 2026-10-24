import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Send, MessageSquare, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ClarificationModal({ isOpen, onClose, request, onSubmit }) {
  const [questions, setQuestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  if (!isOpen || !request) return null;

  const quickPrompts = [
    'Can you clarify if 4K ProRes 422 delivery is required vs MP4?',
    'Does the agreed budget include full commercial buyout licensing?',
    'What is the preferred aspect ratio format (16:9 vs 9:16 vertical)?',
    'How many revision iterations are included in this milestone?'
  ];

  const handleQuickAdd = (prompt) => {
    setQuestions(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return prompt;
      return `${trimmed}\n• ${prompt}`;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questions.trim()) {
      setError('Please enter your clarification questions or notes.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(questions.trim());
      setQuestions('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit clarification request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Request Clarification on Campaign Brief"
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Request Scope Clarification</h3>
            <p className="text-xs text-slate-500">Ask the brand questions before accepting the brief terms.</p>
          </div>
        </div>

        {/* Campaign Info Card */}
        <div className="my-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">{request.campaignTitle || request.title || 'Campaign Proposal'}</span>
            <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              {request.budget || '$3,500'}
            </span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Brand Client: <span className="font-semibold text-slate-700">{request.company || 'Brand Partner'}</span> • Version: <span className="font-mono text-slate-700 font-bold">v{request.brief_version || 1}</span>
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5 mb-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Suggested Scope Clarifications (Click to insert):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAdd(p)}
                className="text-[11px] bg-slate-100 hover:bg-orange-50 hover:text-[#FF6B00] hover:border-orange-200 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 text-left transition-all cursor-pointer"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Your Questions / Proposed Modifications:
            </label>
            <textarea
              rows={4}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="e.g., We can deliver the 16:9 master within 5 days. Could you confirm if raw generation seeds and ComfyUI workflow files are required deliverables?"
              className="w-full bg-white border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !questions.trim()}
              className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Send Clarification Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
