import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Hash, 
  Layers, 
  Ratio, 
  ExternalLink,
  Wrench,
  Tag,
  FileText,
  AlertCircle
} from 'lucide-react';
import VerificationBadge, { VerifiedWorkflowBadge, CertifiedPipelineBadge, AICreatorScoreBadge } from './VerificationBadge';
import { resolvePoster, isLikelyVideo } from '../../lib/mediaAssets';
import ErrorBoundary from './ErrorBoundary';

function PromptInspectorContent({ isOpen, onClose, item }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

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

  // Reset copy states when item changes or modal closes
  useEffect(() => {
    setCopiedPrompt(false);
    setCopiedSeed(false);
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  // Normalize item fields across creator profiles and portfolio items
  const title = item.title || item.name || 'Generative Workflow Spec';
  const description = item.description || null;
  const projectOutcome = item.project_outcome && item.project_outcome !== description ? item.project_outcome : null;
  const mediaUrl = item.mediaUrl || item.sampleMedia || item.media_url || null;
  const promptText = (item.prompt || item.samplePrompt || '').trim();
  const seedValue = item.seed && item.seed !== '...' && item.seed !== 'N/A' && item.seed !== 'null' ? item.seed : null;
  
  // Tools & Skills arrays
  const toolsList = Array.isArray(item.tools_used) && item.tools_used.length > 0 
    ? item.tools_used 
    : (Array.isArray(item.primaryTools) && item.primaryTools.length > 0
      ? item.primaryTools 
      : (Array.isArray(item.aiTools) && item.aiTools.length > 0
        ? item.aiTools
        : (item.tool ? [item.tool] : [])));
        
  const skillsList = Array.isArray(item.skills_used) && item.skills_used.length > 0
    ? item.skills_used
    : (Array.isArray(item.skills) && item.skills.length > 0 ? item.skills : []);

  const toolName = item.tool || toolsList[0] || 'Generative AI';
  const pipeline = item.pipeline || (toolsList.length > 1 ? toolsList.join(' ➔ ') : (toolsList[0] || 'Custom Generative Workflow'));
  const aspectRatio = item.aspectRatio || item.aspect_ratio || (Array.isArray(item.aspectRatios) ? item.aspectRatios[0] : '16:9');
  const score = item.score ?? item.ai_creator_score ?? null;
  const isVerified = Boolean(item.verified === true || item.verified_workflow === true);
  const verificationStatus = item.verification_status || (isVerified ? 'verified' : 'not_verified');
  const isVideo = isLikelyVideo(mediaUrl);
  const resolvedPoster = item.poster || item.thumbnail_url || resolvePoster({ media_url: mediaUrl, tool: toolName }, toolName);
  const projectUrl = item.project_url || null;

  const handleCopyPrompt = () => {
    if (navigator?.clipboard && promptText) {
      navigator.clipboard.writeText(promptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleCopySeed = () => {
    if (navigator?.clipboard && seedValue) {
      navigator.clipboard.writeText(String(seedValue));
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF6B00] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Prompt & Workflow Inspector
              </span>
              {isVerified ? (
                <VerifiedWorkflowBadge />
              ) : (verificationStatus === 'pending_audit' || verificationStatus === 'pending_review' || verificationStatus === 'pending') ? (
                <VerificationBadge status="pending_review" />
              ) : (
                <VerificationBadge status={verificationStatus || 'not_verified'} />
              )}
              {item.verification_scope === 'pipeline' && <CertifiedPipelineBadge />}
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Media Preview Box */}
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center border border-slate-800">
            {mediaUrl && isVideo ? (
              <video 
                src={mediaUrl} 
                poster={resolvedPoster}
                autoPlay 
                loop 
                muted 
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
              src={mediaUrl && !isVideo ? mediaUrl : resolvedPoster} 
              alt={title} 
              style={{ display: (mediaUrl && isVideo) ? 'none' : 'block' }}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = resolvedPoster;
              }}
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-[#FF6B00]" />
              <span>{toolName}</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {isVerified && (
                <VerifiedWorkflowBadge className="bg-black/70 text-emerald-300 border-emerald-500/40 backdrop-blur-md" />
              )}
              {score != null && <AICreatorScoreBadge score={score} />}
            </div>
          </div>

          {/* Description & Outcome (when available) */}
          {(description || projectOutcome) && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Project Scope & Overview
              </span>
              {description && (
                <p className="text-xs text-slate-700 leading-relaxed">{description}</p>
              )}
              {projectOutcome && (
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{projectOutcome}</span>
                </p>
              )}
            </div>
          )}

          {/* Tools & Techniques (when available) */}
          {(toolsList.length > 0 || skillsList.length > 0) && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
              {toolsList.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-slate-400" />
                    Generative AI Models & Toolchain
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {toolsList.map((t, idx) => (
                      <span key={idx} className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {skillsList.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    Specialized Workflows & Techniques
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((s, idx) => (
                      <span key={idx} className="text-[11px] font-semibold bg-orange-50 border border-orange-200 text-[#FF6B00] px-2.5 py-0.5 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt Section with Empty State */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                Exact Generative Prompt
              </span>
              {promptText ? (
                <button 
                  onClick={handleCopyPrompt}
                  className="text-xs font-semibold text-[#FF6B00] hover:text-[#E05E00] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
            <div className="p-4 bg-slate-900 font-mono text-xs rounded-2xl border border-slate-800 leading-relaxed shadow-inner overflow-x-auto whitespace-pre-wrap">
              {promptText ? (
                <span className="text-emerald-400 select-all">{promptText}</span>
              ) : (
                <div className="text-slate-400 italic flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>No prompt recorded for this asset. Proprietary workflow details may be protected or managed offline.</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Workflow Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Seed Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  Generation Seed
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {seedValue || <span className="text-slate-400 font-normal italic text-xs">Not recorded</span>}
                </span>
              </div>
              {seedValue && (
                <button 
                  onClick={handleCopySeed}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-all cursor-pointer"
                  title="Copy Seed"
                >
                  {copiedSeed ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Aspect Ratio Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                <Ratio className="w-3 h-3 text-slate-400" />
                Aspect Ratio
              </span>
              <span className="font-semibold text-slate-900 text-sm">{aspectRatio || '16:9'}</span>
            </div>

            {/* Pipeline Card */}
            <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Workflow Pipeline
              </span>
              <span className="font-semibold text-slate-800 text-xs block leading-relaxed">{pipeline}</span>
            </div>
          </div>

          {/* External Project Link (when available) */}
          {projectUrl && (
            <div className="pt-2">
              <a
                href={projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-200 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>View Full Published Commercial Asset</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromptInspectorModal(props) {
  if (!props.isOpen) return null;

  return (
    <ErrorBoundary
      onReset={props.onClose}
      fallback={({ resetError }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Workflow Inspector Notice</h3>
              <p className="text-xs text-slate-500 mt-1">
                The requested workflow inspection details could not be rendered.
              </p>
            </div>
            <button
              onClick={() => {
                resetError?.();
                props.onClose?.();
              }}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    >
      <PromptInspectorContent {...props} />
    </ErrorBoundary>
  );
}
