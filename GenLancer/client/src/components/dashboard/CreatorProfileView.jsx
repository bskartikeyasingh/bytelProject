import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Layers, 
  Zap, 
  Briefcase, 
  FileText, 
  Award,
  Lock,
  Globe,
  Share2
} from 'lucide-react';
import VerificationBadge, { VerifiedWorkflowBadge, AICreatorScoreBadge } from '../common/VerificationBadge';
import { apiUrl } from '../../lib/apiConfig';
import { authFetch } from '../../lib/supabase';
import { resolvePoster, isLikelyVideo } from '../../lib/mediaAssets';

// Reliable Avatar with Initials Fallback
function ProfileAvatar({ src, name }) {
  const [hasError, setHasError] = useState(false);

  const initials = (() => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  if (!src || hasError) {
    return (
      <div 
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-[#FF6B00] font-black text-2xl flex items-center justify-center border-2 border-slate-700 shadow-md shrink-0 select-none"
        aria-label={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name || 'Creator avatar'} 
      onError={() => setHasError(true)}
      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md shrink-0" 
    />
  );
}

// Portfolio Project Media Preview with Graceful Error Handling & Zero-Black-Frame Guarantee
function ProjectMediaPreview({ mediaUrl, poster, tool, title, contentType }) {
  const [loadError, setLoadError] = useState(false);
  const resolvedPoster = poster || resolvePoster({ media_url: mediaUrl, tool }, tool);

  const isVideo = Boolean(
    mediaUrl && 
    (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('video') || mediaUrl.includes('mixkit'))
  );

  if (!mediaUrl || loadError) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
        <img 
          src={resolvedPoster} 
          alt={title || 'Project preview'} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 flex flex-col justify-end p-4 text-left">
          <p className="text-xs font-bold text-white line-clamp-1">{title || 'Media Highlight'}</p>
          <p className="text-[10px] text-orange-400 font-medium mt-0.5">{contentType || 'Commercial Asset'} • AI Verified Asset</p>
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
        <video 
          src={mediaUrl} 
          poster={resolvedPoster}
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
          onError={() => setLoadError(true)}
        />
        <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5 shadow-xs">
          <Zap className="w-3 h-3 text-[#FF6B00]" />
          <span>{contentType || 'Video'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
      <img 
        src={mediaUrl} 
        alt={title || 'Project preview'} 
        className="w-full h-full object-cover"
        onError={() => setLoadError(true)}
      />
      <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5 shadow-xs">
        <Zap className="w-3 h-3 text-[#FF6B00]" />
        <span>{contentType || 'Visual'}</span>
      </div>
    </div>
  );
}

export default function CreatorProfileView({
  creatorId,
  initialCreator,
  onBack,
  onRequestCollaboration,
  onInspectWorkflow
}) {
  const [creator, setCreator] = useState(initialCreator || null);
  const [loading, setLoading] = useState(!initialCreator);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCreatorData() {
      if (!creatorId) return;
      try {
        setLoading(true);
        const res = await authFetch(apiUrl(`/api/creators/${creatorId}`));
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.creator) {
            setCreator(data.creator);
          }
        } else if (!initialCreator) {
          const err = await res.json().catch(() => ({}));
          if (isMounted) setFetchError(err.error || 'Failed to load creator profile.');
        }
      } catch (err) {
        console.warn('Could not fetch full creator detail:', err);
        if (isMounted && !initialCreator) {
          setFetchError(err.message || 'Unable to connect to service.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCreatorData();
    return () => { isMounted = false; };
  }, [creatorId, initialCreator]);

  const target = creator || initialCreator;

  if (loading && !target) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6 animate-pulse">
        <div className="h-9 w-36 bg-slate-200 rounded-xl" />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex gap-6 items-center">
            <div className="w-24 h-24 rounded-2xl bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded-md w-1/3" />
              <div className="h-4 bg-slate-100 rounded-md w-1/4" />
            </div>
          </div>
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (fetchError && !target) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Unable to Load Creator Profile</h2>
        <p className="text-xs text-slate-500">{fetchError}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
      </div>
    );
  }

  if (!target) return null;

  // Verification
  const isVerified = Boolean(target.verified === true);
  const isPending = !isVerified && (
    target.verification_status === 'pending_audit' || 
    target.verification_status === 'pending_review' || 
    target.verification_status === 'pending'
  );

  // Rate & Availability
  const rateDisplay = target.hourlyRate || (target.hourly_rate_usd != null ? `$${target.hourly_rate_usd}/hr` : 'Rate on inquiry');
  const availText = target.availability || 'Available';
  const isAvailable = availText.toLowerCase().includes('available');
  const isBusy = availText.toLowerCase().includes('busy') || availText.toLowerCase().includes('booked');

  // Scores & Metrics
  const creatorScore = target.score ?? target.ai_creator_score ?? null;
  const hasRating = target.rating != null && target.rating > 0;
  const completedGigs = target.completedGigs ?? target.completed_gigs ?? 0;

  // Tools & Skills
  const tools = target.primaryTools || target.ai_tools_models || [];
  const skills = target.skills || [];
  const specializations = target.specializations || (target.specialization ? [target.specialization] : []);
  const visualStyles = target.visual_styles || target.visualStyles || [];
  const outputFormats = target.output_formats || target.aspectRatios || [];
  const licensing = target.commercial_use_licensing || 'Commercial Use Rights Included';

  // Portfolio items
  const portfolioItems = target.portfolio_items || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200/90 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Creator Directory</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onRequestCollaboration?.(target)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#FF6B00] hover:bg-[#E05E00] active:scale-98 px-5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Collaboration</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Avatar & Identity */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <ProfileAvatar src={target.avatar} name={target.name} />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {target.name}
                </h1>
                {isVerified ? (
                  <VerifiedWorkflowBadge />
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                    <span>Verification Pending</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                    <span>Unverified Profile</span>
                  </span>
                )}
                {creatorScore != null && (
                  <AICreatorScoreBadge score={creatorScore} />
                )}
              </div>

              <p className="text-sm sm:text-base font-semibold text-slate-600">
                {target.title || 'Generative AI Creator'}
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                {target.location && (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{target.location}</span>
                  </span>
                )}
                {hasRating && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{target.rating}</span>
                    <span className="text-slate-400 font-normal">({completedGigs} completed gigs)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing, Availability & Primary Action */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
            <div className="space-y-1 text-left md:text-right">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">Commercial Rate</span>
              <span className="text-2xl font-black text-slate-900">{rateDisplay}</span>
              <div className="mt-1">
                {isAvailable ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Available for Projects</span>
                  </span>
                ) : isBusy ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{availText}</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {availText}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onRequestCollaboration?.(target)}
              className="w-full sm:w-auto md:w-full px-6 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Collaboration</span>
            </button>
          </div>
        </div>

        {/* Commercial Licensing Banner */}
        <div className="mt-6 p-4 bg-orange-50/60 rounded-xl border border-orange-200/70 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Commercial Rights & Intellectual Property</span>
              <span className="text-xs text-slate-600 font-medium">{licensing}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-orange-700 bg-white px-2.5 py-1 rounded-md border border-orange-200 shrink-0">
            Client IP Protection
          </span>
        </div>
      </div>

      {/* Grid: Specializations, Skills, and Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AI Tools & Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-[#FF6B00]" />
            <h3>AI Tools & Generative Models</h3>
          </div>
          <p className="text-xs text-slate-500">Certified production tools used in reproducible generation workflows.</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tools.length > 0 ? (
              tools.map((t, idx) => (
                <span key={idx} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-50 text-[#FF6B00] border border-orange-100">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No specific tools listed</span>
            )}
          </div>
        </div>

        {/* Card 2: Core Skills */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3>Core Technical Skills</h3>
          </div>
          <p className="text-xs text-slate-500">Domain disciplines and creative engineering competencies.</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {skills.length > 0 ? (
              skills.map((s, idx) => (
                <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No skills listed</span>
            )}
          </div>
        </div>

        {/* Card 3: Specializations & Visual Styles */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <h3>Specializations & Outputs</h3>
          </div>
          <p className="text-xs text-slate-500">Industry verticals and creative format capabilities.</p>
          <div className="space-y-2 pt-1">
            {specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specializations.map((spec, idx) => (
                  <span key={idx} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {spec}
                  </span>
                ))}
              </div>
            )}
            {outputFormats.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Formats:</span>
                {outputFormats.map((fmt, idx) => (
                  <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]">
                    {fmt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Showcase Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Verified Work & Portfolio Reel
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Production assets directly tied to this creator with verified prompts and reproducible workflows.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl">
            {portfolioItems.length} {portfolioItems.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>

        {portfolioItems.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <Film className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Portfolio Items Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This creator has not published public portfolio showcases yet. You can still request a private proposal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolioItems.map((item, idx) => {
              const rawDesc = item.description || '';
              const displayDesc = (!rawDesc || rawDesc.trim() === '...' || rawDesc.trim() === '')
                ? 'Description not provided'
                : rawDesc.trim();
              const isDescPlaceholder = displayDesc === 'Description not provided';

              return (
                <div key={item.id || idx} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    {/* Media preview */}
                    <ProjectMediaPreview 
                      mediaUrl={item.media_url} 
                      poster={item.poster || item.thumbnail_url}
                      tool={item.tool || item.tools_used?.[0]}
                      title={item.title} 
                      contentType={item.content_type} 
                    />

                    <div className="p-5 space-y-3">
                      {/* Title & Content Type */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 leading-tight">
                            {item.title || 'Commercial Asset Showcase'}
                          </h4>
                          {item.creator_role && (
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{item.creator_role}</p>
                          )}
                        </div>
                        {item.content_type && (
                          <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-200/70 px-2 py-0.5 rounded-full shrink-0">
                            {item.content_type}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className={`text-xs leading-relaxed ${isDescPlaceholder ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                        {displayDesc}
                      </p>

                      {/* Actual Project Outcome (only if provided, never fabricated) */}
                      {item.project_outcome && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">Campaign Outcome:</span>
                          <span className="text-slate-600">{item.project_outcome}</span>
                        </div>
                      )}

                      {/* Tools & Skills used */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-100">
                        {item.tools_used && item.tools_used.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Tools:</span>
                            {item.tools_used.map((tool, tIdx) => (
                              <span key={tIdx} className="text-[10px] font-semibold bg-orange-50 text-[#FF6B00] px-2 py-0.5 rounded-md border border-orange-100">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.skills_used && item.skills_used.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Skills:</span>
                            {item.skills_used.map((skill, sIdx) => (
                              <span key={sIdx} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item footer action */}
                  <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.aspect_ratio ? `Format: ${item.aspect_ratio}` : ''}
                    </span>
                    <button
                      onClick={() => onInspectWorkflow?.(target, item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      🔍 Inspect Workflow
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar on Mobile/Desktop */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-bold text-slate-900 block">Ready to collaborate with {target.name}?</span>
          <span className="text-xs text-slate-500">Submit a campaign brief to initiate direct collaboration and escrow terms.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={() => onRequestCollaboration?.(target)}
            className="px-5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Collaboration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
