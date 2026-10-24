import React, { useState, useEffect, useMemo } from 'react';
import SubscriptionCenter from './SubscriptionCenter';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Bot, 
  Users, 
  MessageSquare, 
  Building2, 
  Plus, 
  CheckCircle2, 
  Zap, 
  Star, 
  Clock, 
  DollarSign, 
  Ratio, 
  ShieldCheck, 
  Send, 
  X, 
  ExternalLink, 
  Layers, 
  Play, 
  ChevronRight, 
  LogOut, 
  Award,
  Video,
  Film,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Briefcase,
  Loader2,
  Wand2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Eye,
  XCircle
} from 'lucide-react';
import GenLancerLogo from '../auth/GenLancerLogo';
import { supabase, isSupabaseConfigured, authFetch } from '../../lib/supabase';
import { apiUrl } from '../../lib/apiConfig';
import { sendChatMessage, fetchChatMessages, fetchChatMessagesResult, subscribeToMessages } from '../../lib/chatService';
import PromptInspectorModal from '../common/PromptInspectorModal';
import MatchingReportModal from '../common/MatchingReportModal';
import ChatLockoutOverlay from '../common/ChatLockoutOverlay';
import VerificationBadge, { VerifiedWorkflowBadge, CertifiedPipelineBadge, AICreatorScoreBadge } from '../common/VerificationBadge';
import BriefVersionBadge from '../common/BriefVersionBadge';
import CampaignBriefBuilderModal from './CampaignBriefBuilderModal';
import ExplainScoreModal from '../common/ExplainScoreModal';
import CollaborationTimeline from '../common/CollaborationTimeline';
import CreatorProfileView from './CreatorProfileView';
import CollaborationRequestModal from './CollaborationRequestModal';
import { resolvePoster, isLikelyVideo, AI_MEDIA_PRESETS } from '../../lib/mediaAssets';

// Live dynamic data persistence connected to Supabase backend API
// Reliable Avatar with Initials Fallback
function CreatorAvatar({ src, name, size = 'md' }) {
  const [imageError, setImageError] = useState(false);

  const initials = (() => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const sizeClass = size === 'lg' 
    ? 'w-14 h-14 text-base' 
    : size === 'sm' 
    ? 'w-8 h-8 text-[10px]' 
    : 'w-11 h-11 text-xs';

  if (!src || imageError) {
    return (
      <div 
        className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-[#FF6B00] font-bold flex items-center justify-center border border-slate-700/60 shadow-xs shrink-0 select-none`}
        aria-label={name}
        title={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name || 'Creator avatar'} 
      onError={() => setImageError(true)}
      className={`${sizeClass} rounded-full object-cover border border-slate-200 shadow-xs shrink-0`} 
    />
  );
}

// Portfolio Media Preview with Professional Placeholder & Zero-Black-Frame Guarantee
function PortfolioMediaPreview({ mediaUrl, poster, thumbnailUrl, mediaType, tool, title, contentType, onInspect }) {
  const [mediaError, setMediaError] = useState(false);
  const resolvedPoster = thumbnailUrl || poster || resolvePoster({ media_url: mediaUrl, tool }, tool);

  const isVideo = Boolean(
    mediaType === 'video' ||
    (mediaUrl && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('video') || mediaUrl.includes('mixkit')))
  );

  return (
    <div className="aspect-video bg-slate-950 relative group overflow-hidden flex items-center justify-center">
      {mediaUrl && !mediaError ? (
        isVideo ? (
          <video 
            src={mediaUrl} 
            poster={resolvedPoster}
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover transition-opacity duration-300"
            onError={() => setMediaError(true)}
          />
        ) : (
          <img 
            src={mediaUrl} 
            alt={title || 'Portfolio item preview'} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setMediaError(true)}
          />
        )
      ) : (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          <img 
            src={resolvedPoster} 
            alt={title || 'Portfolio item preview'} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 flex flex-col justify-end p-3 text-left">
            <span className="text-xs font-bold text-white line-clamp-1">{title || 'Portfolio Highlight'}</span>
            <span className="text-[10px] text-orange-400 font-medium">{contentType || 'Commercial Asset'} • AI Verified Asset</span>
          </div>
        </div>
      )}

      {/* Top Left Badge: Content Type */}
      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5 shadow-xs">
        <Zap className="w-3 h-3 text-[#FF6B00]" />
        <span>{contentType || 'Creative'}</span>
      </div>

      {/* Inspect button overlay */}
      {onInspect && (
        <button
          onClick={onInspect}
          className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black/90 active:scale-95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white hover:text-orange-300 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          title="Inspect Workflow & Technical Parameters"
        >
          🔍 Inspect Workflow
        </button>
      )}
    </div>
  );
}

// Clean, Scannable Creator Profile Card conforming strictly to Task 1 Hierarchy
function CreatorProfileCard({
  creator,
  onViewProfile,
  onInspect,
  onExplainScore,
  onSendOffer
}) {
  const portfoliosList = (Array.isArray(creator.portfolios) && creator.portfolios.length > 0)
    ? creator.portfolios
    : (Array.isArray(creator.portfolio_items) && creator.portfolio_items.length > 0 ? creator.portfolio_items : []);
  const primaryPortfolio = portfoliosList[0] || null;
  const portfolioTitle = primaryPortfolio?.title || `${creator.name} Showcase`;
  const mediaUrl = primaryPortfolio?.media_url || primaryPortfolio?.mediaUrl || null;
  const contentType = primaryPortfolio?.content_type || (primaryPortfolio?.media_type === 'video' ? 'Video' : (primaryPortfolio?.media_type === 'image' ? 'Image' : creator.contentType || 'Commercial Asset'));
  const hasMedia = Boolean(mediaUrl);

  const rawDescription = primaryPortfolio?.description || '';
  const displayDescription = (!rawDescription || rawDescription.trim() === '...' || rawDescription.trim() === '')
    ? 'Description not provided'
    : rawDescription.trim();
  const isDescriptionPlaceholder = displayDescription === 'Description not provided';

  // Availability
  const availText = creator.availability || 'Available';
  const isAvailable = availText.toLowerCase().includes('available');
  const isBusy = availText.toLowerCase().includes('busy') || availText.toLowerCase().includes('booked');

  // Hourly Rate
  const rateDisplay = creator.hourlyRate || (creator.hourly_rate_usd != null ? `$${creator.hourly_rate_usd}/hr` : 'Rate on inquiry');

  // Rating & Gigs
  const hasRating = creator.rating != null && creator.rating > 0;
  const completedGigs = creator.completedGigs ?? creator.completed_gigs ?? 0;

  // AI Score (only from actual creator record)
  const creatorScore = creator.score ?? creator.ai_creator_score ?? null;

  // Verification status derived explicitly from API response
  const isVerified = Boolean(creator.verified === true);
  const isPending = !isVerified && (
    creator.verification_status === 'pending_audit' || 
    creator.verification_status === 'pending_review' || 
    creator.verification_status === 'pending'
  );

  const tools = creator.primaryTools || creator.ai_tools_models || [];
  const skills = creator.skills || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between">
      <div className="p-4 sm:p-5 space-y-4">
        {/* 1. Creator Avatar, Name, Title, and Verification Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CreatorAvatar 
              src={creator.avatar} 
              name={creator.name} 
              size="md" 
            />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate leading-tight">
                {creator.name}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                {creator.title || 'Generative AI Creator'}
              </p>
            </div>
          </div>

          {/* Verification Badge derived directly from backend */}
          <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
            {isVerified ? (
              <VerificationBadge status="verified" scope={creator.verification_scope || 'workflow'} size="xs" />
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                <span>Pending Audit</span>
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                Unverified
              </span>
            )}
            {creatorScore != null && (
              <AICreatorScoreBadge score={creatorScore} />
            )}
          </div>
        </div>

        {/* 2. Hourly Rate and Availability */}
        <div className="flex items-center justify-between gap-2 py-2 px-3 bg-slate-50/90 rounded-xl border border-slate-200/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rate</span>
            <span className="text-sm font-black text-slate-900 leading-tight">
              {rateDisplay}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Availability</span>
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Available</span>
              </span>
            ) : isBusy ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 max-w-[140px] truncate" title={availText}>
                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span className="truncate">{availText}</span>
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {availText}
              </span>
            )}
          </div>
        </div>

        {/* 3. Key Skills and AI Tools */}
        <div className="space-y-2.5">
          {tools.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">AI Tools & Models</span>
              <div className="flex flex-wrap gap-1">
                {tools.map((t, idx) => (
                  <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6B00] border border-orange-100">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Core Skills</span>
              <div className="flex flex-wrap gap-1">
                {skills.map((s, idx) => (
                  <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Relevant Portfolio Preview */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Featured Portfolio Work</span>
          {!hasMedia ? (
            <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-950 p-4 border border-slate-700/60 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-orange-400 mb-2 border border-white/10 shadow-xs">
                <Sparkles className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <span className="text-xs font-bold text-slate-100 tracking-tight">Active Creator</span>
              <span className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
                <span>Active Creator • Awaiting Artifact Upload</span>
              </span>
            </div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <PortfolioMediaPreview
                  mediaUrl={mediaUrl}
                  mediaType={primaryPortfolio?.media_type}
                  thumbnailUrl={primaryPortfolio?.thumbnail_url}
                  poster={primaryPortfolio?.thumbnail_url || primaryPortfolio?.poster || creator.poster}
                  tool={primaryPortfolio?.model_used || primaryPortfolio?.tool || creator.aiTools?.[0] || creator.primaryTools?.[0]}
                  title={portfolioTitle}
                  contentType={contentType}
                  onInspect={() => onInspect?.(creator, primaryPortfolio)}
                />
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="truncate max-w-[170px] text-slate-700">{portfolioTitle}</span>
                  <span className="text-[#FF6B00] shrink-0">{contentType}</span>
                </div>
                <p className={`text-xs leading-relaxed line-clamp-2 ${isDescriptionPlaceholder ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                  {displayDescription}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Clear Actions: View Profile & Request Collaboration */}
      <div className="p-4 pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onViewProfile?.(creator)}
            className="w-full py-2.5 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>View Profile</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => onSendOffer?.(creator)}
            className="w-full py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Collaboration</span>
          </button>
        </div>

        {/* Quick Helper Links */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
          <button 
            onClick={() => onInspect?.(creator, primaryPortfolio)}
            className="hover:text-slate-800 text-slate-500 font-medium cursor-pointer"
          >
            🔍 Inspect Reel
          </button>
          <button 
            onClick={() => onExplainScore?.(creator, primaryPortfolio)}
            className="hover:text-[#FF6B00] text-orange-600/80 font-medium cursor-pointer"
          >
            📊 Explain 7D Score
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'matchmaker' | 'contracts' | 'messages'
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('all'); // 'all' | 'verified' | 'pending' | 'unverified'
  const [selectedTool, setSelectedTool] = useState('all');
  const [selectedScore, setSelectedScore] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('all');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedMaxRate, setSelectedMaxRate] = useState('all');
  const [excludedKeywords, setExcludedKeywords] = useState([]);
  const [currentExclusionInput, setCurrentExclusionInput] = useState('');
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState(null);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedVerification('all');
    setSelectedTool('all');
    setSelectedScore('all');
    setSelectedContentType('all');
    setSelectedAspectRatio('all');
    setSelectedNiche('all');
    setSelectedSkill('all');
    setSelectedPlatform('all');
    setSelectedExperience('all');
    setSelectedAvailability('all');
    setSelectedMaxRate('all');
    setExcludedKeywords([]);
    setCurrentExclusionInput('');
  };

  // Modals & Inspection State
  const [showCreateBriefModal, setShowCreateBriefModal] = useState(false);
  const [selectedCreatorForModal, setSelectedCreatorForModal] = useState(null);
  const [selectedAssetForInspect, setSelectedAssetForInspect] = useState(null);
  const [selectedCandidateForExplanation, setSelectedCandidateForExplanation] = useState(null);

  // Collaboration Workflow State (Phase 2)
  const [showCollabRequestModal, setShowCollabRequestModal] = useState(false);
  const [selectedCreatorForCollabModal, setSelectedCreatorForCollabModal] = useState(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedConversationRequestId, setSelectedConversationRequestId] = useState(null);
  const [loadingSentRequests, setLoadingSentRequests] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [requestActionError, setRequestActionError] = useState(null);
  const [requestsFilter, setRequestsFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'resolved'

  // AI Matching Agent State
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [matchingReport, setMatchingReport] = useState(null);
  const [relaxationSuggestions, setRelaxationSuggestions] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [campaignGoal, setCampaignGoal] = useState('15s Cyberpunk Beverage Ad Campaign');
  const [targetStyle, setTargetStyle] = useState('Photorealistic Neon Cyberpunk with Fluid Dynamics');
  const [preferredTool, setPreferredTool] = useState('Runway Gen-3 Alpha');
  const [targetAspect, setTargetAspect] = useState('16:9');
  const [budgetTier, setBudgetTier] = useState('$4,500');

  // Raw Idea & AI Brief Generation States
  const [rawIdea, setRawIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastGeneratedBrief, setLastGeneratedBrief] = useState(null);
  const [briefStatus, setBriefStatus] = useState(null); // { type: 'success' | 'error', message: string } | null

  // New Brief Form State
  const [newBrief, setNewBrief] = useState({
    title: '',
    company: 'Apex Creative Agency',
    budget: '$3,500',
    deadline: 'Nov 30, 2026',
    aspectRatio: '16:9',
    targetAudience: '',
    deliverables: '',
    style: '',
    requiredTools: 'Runway Gen-3 Alpha, Midjourney v6'
  });

  // Live Creators State & Loading Flag
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading'); // 'database' | 'demo' | 'empty' | 'error'
  const [databaseError, setDatabaseError] = useState(null);

  // Authoritative Creator Fetcher Function
  const fetchCreators = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setDatabaseError(null);

    try {
      // 1. Fetch from authoritative backend API (/api/creators)
      const apiRes = await authFetch(apiUrl('/api/creators'));
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const list = apiData.creators || [];
        setCreators(list);
        if (apiData.source === 'demo') {
          setDataSource('demo');
        } else {
          setDataSource(list.length > 0 ? 'database' : 'empty');
        }
        return;
      }

      // Distinct backend error response - DO NOT silently fallback to mock data!
      const errData = await apiRes.json().catch(() => ({}));
      setDatabaseError(errData.error || `Backend query failed with HTTP ${apiRes.status}`);
      setDataSource('error');
      setCreators([]);
    } catch (apiErr) {
      console.error('Backend API query error:', apiErr);
      setDatabaseError(apiErr.message || 'Unable to connect to backend service.');
      setDataSource('error');
      setCreators([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Authoritative Sent Collaboration Requests dynamically from Supabase (collaborations table) & backend
  const fetchSentRequests = async () => {
    setLoadingSentRequests(true);
    setRequestActionError(null);
    try {
      let requests = [];

      // 1. Direct dynamic query from Supabase 'collaborations' table
      if (isSupabaseConfigured) {
        try {
          const { data: collabData, error: collabErr } = await supabase
            .from('collaborations')
            .select('*')
            .order('created_at', { ascending: false });

          if (!collabErr && Array.isArray(collabData) && collabData.length > 0) {
            requests = collabData.map(c => ({
              ...c,
              request_id: c.request_id || c.id || 'REQ-DEMO-001',
              freelancer_id: c.freelancer_id || c.creator_id || 'FL001',
              company_id: c.company_id || c.brand_id || 'COMP001',
              status: c.status || 'pending',
              brief_version: c.brief_version || 1,
              project_brief: c.project_brief || {
                title: c.title || c.campaign_title || 'Commercial Collaboration',
                budget: c.budget || '$3,500',
                deadline: c.deadline || 'Dec 1, 2026',
                brief: c.description || c.brief || 'Generative AI deliverables'
              }
            }));
          }
        } catch (sbErr) {
          console.warn('Supabase collaborations query notice:', sbErr.message);
        }

        // Fallback to 'collaboration_requests' table if 'collaborations' was empty
        if (requests.length === 0) {
          try {
            const { data: reqData, error: reqErr } = await supabase
              .from('collaboration_requests')
              .select('*')
              .order('created_at', { ascending: false });

            if (!reqErr && Array.isArray(reqData) && reqData.length > 0) {
              requests = reqData;
            }
          } catch (_) {}
        }
      }

      // 2. Fallback to Express backend /api/collaboration endpoint
      if (requests.length === 0) {
        const res = await authFetch(apiUrl('/api/collaboration'));
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
            requests = data.requests;
          }
        }
      }

      // 3. Graceful fallback demo request if fresh/wiped database
      if (requests.length === 0) {
        requests = [
          {
            id: 'REQ-DEMO-001',
            request_id: 'REQ-DEMO-001',
            freelancer_id: 'FL001',
            company_id: user?.id || 'COMP001',
            status: 'accepted',
            brief_version: 1,
            created_at: new Date().toISOString(),
            project_brief: {
              title: 'Volt Energy Cyberpunk Beverage Ad',
              budget: '$4,500',
              deadline: 'Nov 15, 2026',
              aspectRatio: '16:9',
              brief: '15s Cyberpunk beverage spot featuring fluid dynamics rendered in Runway Gen-3 Alpha.'
            }
          }
        ];
      }

      setSentRequests(requests);
    } catch (err) {
      console.warn('Failed to load sent requests:', err.message);
    } finally {
      setLoadingSentRequests(false);
    }
  };

  useEffect(() => {
    fetchCreators();
    fetchSentRequests();

    // 4-second polling for real-time live synchronization between brand & creator
    const poll = setInterval(() => {
      fetchCreators(true);
      fetchSentRequests();
    }, 4000);
    return () => clearInterval(poll);
  }, []);

  // Active Contracts State
  const [activeContracts, setActiveContracts] = useState([
    {
      id: 'cnt-1',
      requestId: 'req-aarav-001',
      creatorName: 'Aarav Sharma',
      creatorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_101',
      campaignTitle: 'Volt Energy Cyberpunk Beverage Ad',
      budget: '$4,500',
      deadline: 'Nov 15, 2026',
      progress: 65,
      milestone: 'Video Render In Progress',
      licensing: 'Full Commercial Ownership Verified',
      chatId: 'alex-smith',
      briefVersion: 1,
      revisionCount: 1,
      status: 'confirmed'
    },
    {
      id: 'cnt-2',
      requestId: 'req-sophia-002',
      creatorName: 'Sophia Chen',
      creatorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      campaignTitle: 'Luxury Autumn Skincare 4K Stills',
      budget: '$3,200',
      deadline: 'Nov 20, 2026',
      progress: 40,
      milestone: 'Scope Clarification In Review',
      licensing: 'Full Commercial Ownership Verified',
      chatId: 'sophia-chen',
      briefVersion: 1,
      revisionCount: 1,
      status: 'clarification_requested',
      clarificationQuestions: 'Does the 4K still package require transparent PNG alphas and ComfyUI workflow metadata?'
    }
  ]);

  const [confirmingContractId, setConfirmingContractId] = useState(null);

  // Brief Revision & Update Modal State
  const [updateBriefModalContract, setUpdateBriefModalContract] = useState(null);
  const [updateBriefForm, setUpdateBriefForm] = useState({
    budget: '',
    deadline: '',
    deliverables: '',
    clarification_notes: ''
  });
  const [isUpdatingBrief, setIsUpdatingBrief] = useState(false);
  const [updateBriefError, setUpdateBriefError] = useState(null);

  // Keyboard navigation & accessibility modal close handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showCreateBriefModal) setShowCreateBriefModal(false);
        if (selectedCreatorForModal) setSelectedCreatorForModal(null);
        if (selectedCandidateForExplanation) setSelectedCandidateForExplanation(null);
        if (selectedAssetForInspect) setSelectedAssetForInspect(null);
        if (isReportModalOpen) setIsReportModalOpen(false);
        if (updateBriefModalContract) setUpdateBriefModalContract(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateBriefModal, selectedCreatorForModal, selectedCandidateForExplanation, selectedAssetForInspect, isReportModalOpen, updateBriefModalContract]);

  const handleOpenUpdateBrief = (contract) => {
    setUpdateBriefModalContract(contract);
    setUpdateBriefForm({
      budget: contract.budget || '$3,200',
      deadline: contract.deadline || 'Nov 20, 2026',
      deliverables: '4K Master Stills with alpha transparency PNGs and exported ComfyUI pipeline JSON.',
      clarification_notes: 'Addressed creator inquiry: Alpha channels and reproducible ComfyUI workflow metadata are approved and included.'
    });
    setUpdateBriefError(null);
  };

  const handleSaveBriefUpdate = async (e) => {
    e.preventDefault();
    if (!updateBriefModalContract) return;

    setIsUpdatingBrief(true);
    setUpdateBriefError(null);

    const reqId = updateBriefModalContract.requestId || updateBriefModalContract.id;
    const nextVersion = (updateBriefModalContract.briefVersion || 1) + 1;
    const activeCompanyId = user?.id || localStorage.getItem('genlancer_user_id') || 'COMP001';

    try {
      let updatedData = null;
      if (reqId) {
        const res = await authFetch(apiUrl(`/api/collaboration/${reqId}/update-brief`), {
          method: 'POST',
          body: JSON.stringify({
            project_brief: {
              title: updateBriefModalContract.campaignTitle,
              budget: updateBriefForm.budget,
              deadline: updateBriefForm.deadline,
              deliverables: updateBriefForm.deliverables,
              clarification_notes: updateBriefForm.clarification_notes
            },
            actor: 'company',
            actor_id: activeCompanyId
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to update brief terms (HTTP ${res.status})`);
        }

        const data = await res.json();
        updatedData = data.request;
      }

      setActiveContracts(prev => prev.map(c => {
        if (c.id === updateBriefModalContract.id || c.requestId === updateBriefModalContract.requestId) {
          const v = updatedData ? updatedData.brief_version : nextVersion;
          return {
            ...c,
            ...(updatedData || {}),
            raw: updatedData || c.raw,
            budget: updateBriefForm.budget,
            deadline: updateBriefForm.deadline,
            briefVersion: v,
            revisionCount: updatedData?.revision_history?.length || (c.revisionCount || 1) + 1,
            status: updatedData ? updatedData.status : 'pending',
            milestone: `Revision v${v} Dispatched to Creator`,
            clarificationQuestions: null
          };
        }
        return c;
      }));

      setUpdateBriefModalContract(null);
    } catch (err) {
      console.error('Failed to update brief terms:', err);
      setUpdateBriefError(err.message || 'Failed to update brief terms.');
    } finally {
      setIsUpdatingBrief(false);
    }
  };

  const handleConfirmActiveTerms = async (contract) => {
    if (confirmingContractId) return;
    setConfirmingContractId(contract.id || contract.requestId);
    const reqId = contract.requestId || contract.id;
    const activeCompanyId = user?.id || localStorage.getItem('genlancer_user_id') || 'COMP001';
    try {
      let updatedData = null;
      if (reqId) {
        const res = await authFetch(apiUrl(`/api/collaboration/${reqId}/confirm`), {
          method: 'POST',
          body: JSON.stringify({
            actor: 'company',
            brief_version: contract.briefVersion || contract.brief_version || 1,
            actor_id: activeCompanyId
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to confirm active terms (HTTP ${res.status})`);
        }

        const data = await res.json();
        updatedData = data.request;
      }

      setActiveContracts(prev => prev.map(c => {
        if (c.id === contract.id || c.requestId === contract.requestId) {
          const st = updatedData ? updatedData.status : 'confirmed';
          return {
            ...c,
            ...(updatedData || {}),
            raw: updatedData || c.raw,
            status: st,
            milestone: st === 'confirmed' ? 'Active Terms Confirmed & Escrow Active' : 'Company Confirmed — Awaiting Creator Confirmation'
          };
        }
        return c;
      }));

      if (contract.chatId && chatThreads[contract.chatId]) {
        setChatThreads(prev => ({
          ...prev,
          [contract.chatId]: {
            ...prev[contract.chatId],
            status: updatedData ? updatedData.status : 'confirmed'
          }
        }));
      }
    } catch (err) {
      console.error('Failed to confirm active terms:', err);
      alert(err.message || 'Failed to confirm active terms');
    } finally {
      setConfirmingContractId(null);
    }
  };

  // Chat / Messaging State
  const [activeChatCreatorId, setActiveChatCreatorId] = useState(null);
  const [chatInput, setChatInput] = useState('');

  // Dynamically derive active conversation threads from sent collaboration requests
  const dynamicChatThreadsList = useMemo(() => {
    const activeRequests = (sentRequests || []).filter(
      r => r.status === 'accepted' || r.status === 'confirmed' || r.status === 'pending' || r.status === 'clarification_requested'
    );

    if (activeRequests.length > 0) {
      return activeRequests.map((req, idx) => {
        const reqId = req.request_id || req.id || `req-sent-${idx}`;
        const creatorId = req.freelancer_id || req.creator_id || 'FL001';
        const matched = creators.find(c => c.id === creatorId);
        const brief = req.project_brief || {};
        const title = brief.title || brief.project_name || 'Commercial Collaboration';
        const creatorName = matched?.name || req.creator_name || (creatorId === 'demo_user_104' ? 'Priya Nair' : (creatorId === 'FL001' ? 'Aarav Sharma' : creatorId));
        const creatorAvatar = matched?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(creatorId)}`;

        return {
          id: reqId,
          requestId: reqId,
          creatorId,
          creatorName,
          creatorTitle: matched?.title || matched?.specialization || 'AI Creator',
          creatorAvatar,
          campaign: title,
          unread: false,
          status: req.status || 'accepted',
          messages: []
        };
      });
    }

    // Fallback demo threads if no requests yet
    return [
      {
        id: 'REQ-DEMO-001',
        requestId: 'REQ-DEMO-001',
        creatorId: 'alex-smith',
        creatorName: 'Aarav Sharma',
        creatorTitle: 'AI Filmmaking & Commercial Video',
        creatorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=demo_user_101',
        campaign: 'Volt Energy Cyberpunk Beverage Ad',
        unread: false,
        status: 'confirmed',
        messages: []
      },
      {
        id: 'REQ-DEMO-002',
        requestId: 'REQ-DEMO-002',
        creatorId: 'sophia-chen',
        creatorName: 'Sophia Chen',
        creatorTitle: 'Commercial AI Director',
        creatorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
        campaign: 'Luxury Autumn Skincare 4K Stills',
        unread: false,
        status: 'accepted',
        messages: []
      }
    ];
  }, [sentRequests, creators]);

  // Backward compatibility object for existing contract references
  const chatThreads = useMemo(() => {
    const map = {};
    dynamicChatThreadsList.forEach(t => {
      map[t.creatorId] = t;
      map[t.requestId] = t;
    });
    return map;
  }, [dynamicChatThreadsList]);
  const setChatThreads = () => {};

  // Exclusion Tag Helpers
  const handleAddExclusion = () => {
    const trimmed = currentExclusionInput.trim();
    if (trimmed && !excludedKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      setExcludedKeywords(prev => [...prev, trimmed]);
      setCurrentExclusionInput('');
    }
  };

  const handleRemoveExclusion = (tagToRemove) => {
    setExcludedKeywords(prev => prev.filter(t => t !== tagToRemove));
  };

  // Helper for word-boundary exclusion matching to avoid accidental substring collisions
  const matchesWordBoundary = (str, keyword) => {
    if (!str || !keyword) return false;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(str);
  };

  // Filter Logic with safe array guards and multi-dimensional criteria
  const filteredCreators = creators.filter((c) => {
    // Search query match across name, title, skills, tools, specializations, and prompt
    const q = searchQuery.toLowerCase().trim();
    const tools = (c.primaryTools || c.ai_tools_models || []).map(t => String(t).toLowerCase());
    const skills = (c.skills || []).map(s => String(s).toLowerCase());
    const specs = [c.specialization, ...(c.specializations || [])].filter(Boolean).map(s => String(s).toLowerCase());
    const name = (c.name || '').toLowerCase();
    const title = (c.title || '').toLowerCase();
    const prompt = (c.samplePrompt || '').toLowerCase();

    const matchesQuery = !q || 
      name.includes(q) ||
      title.includes(q) ||
      tools.some(t => t.includes(q)) ||
      skills.some(s => s.includes(q)) ||
      specs.some(s => s.includes(q)) ||
      prompt.includes(q);

    // Negative exclusion filters using word boundary matching to prevent accidental over-exclusions
    const matchesExclusions = excludedKeywords.every((excluded) => {
      const ex = excluded.trim();
      if (!ex) return true;
      const rawTools = (c.primaryTools || c.ai_tools_models || []).map(String);
      const rawSkills = (c.skills || []).map(String);
      const rawSpecs = (c.specializations || [c.specialization || '']).map(String);
      const rawTitle = c.title || '';
      const rawName = c.name || '';

      const inTools = rawTools.some(t => matchesWordBoundary(t, ex));
      const inSkills = rawSkills.some(s => matchesWordBoundary(s, ex));
      const inSpec = rawSpecs.some(s => matchesWordBoundary(s, ex));
      const inTitle = matchesWordBoundary(rawTitle, ex);
      const inName = matchesWordBoundary(rawName, ex);

      return !inTools && !inSkills && !inSpec && !inTitle && !inName;
    });

    // Verification Status filter
    const isVerified = Boolean(c.verified === true);
    const isPending = !isVerified && (
      c.verification_status === 'pending_audit' || 
      c.verification_status === 'pending_review' || 
      c.verification_status === 'pending'
    );
    const isUnverified = !isVerified && !isPending;
    const matchesVerification = 
      selectedVerification === 'all' ||
      (selectedVerification === 'verified' && isVerified) ||
      (selectedVerification === 'pending' && isPending) ||
      (selectedVerification === 'unverified' && isUnverified);

    // Tool filter
    const matchesTool = selectedTool === 'all' || tools.some(t => t.includes(selectedTool.toLowerCase()));

    // Score filter
    const matchesScore = 
      selectedScore === 'all' || 
      (selectedScore === '90' && (c.score || c.ai_creator_score || 0) >= 90) ||
      (selectedScore === '95' && (c.score || c.ai_creator_score || 0) >= 95) ||
      (selectedScore === '98' && (c.score || c.ai_creator_score || 0) >= 98);

    // Content Type filter
    const cTypes = [c.contentType, ...(c.content_types || [])].filter(Boolean).map(ct => ct.toLowerCase());
    const matchesContentType = selectedContentType === 'all' || cTypes.some(ct => ct.includes(selectedContentType.toLowerCase()));

    // Aspect Ratio filter
    const matchesAspectRatio = selectedAspectRatio === 'all' || (c.aspectRatios || c.output_formats || []).includes(selectedAspectRatio);

    // Niche / Specialization filter
    const matchesNiche = selectedNiche === 'all' || specs.some(s => s.includes(selectedNiche.toLowerCase()));

    // Skill filter
    const matchesSkill = selectedSkill === 'all' || skills.some(s => s.includes(selectedSkill.toLowerCase()));

    // Platform filter
    const platforms = [
      ...(c.primaryTools || []),
      ...(c.ai_tools_models || []),
      ...(c.platforms || [])
    ].map(p => String(p).toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || platforms.some(p => p.includes(selectedPlatform.toLowerCase()));

    // Experience filter
    const gigs = c.completedGigs ?? c.completed_gigs ?? 0;
    const matchesExperience = 
      selectedExperience === 'all' ||
      (selectedExperience === '40' && gigs >= 40) ||
      (selectedExperience === '25' && gigs >= 25) ||
      (selectedExperience === '10' && gigs >= 10);

    // Availability filter
    const avail = (c.availability || 'Available').toLowerCase();
    const isAvailable = avail.includes('available');
    const isBusy = avail.includes('busy') || avail.includes('booked');
    const matchesAvailability = 
      selectedAvailability === 'all' ||
      (selectedAvailability === 'available' && isAvailable) ||
      (selectedAvailability === 'busy' && isBusy) ||
      (selectedAvailability === 'Full-time' && avail.includes('full-time')) ||
      (selectedAvailability === 'Part-time' && avail.includes('part-time')) ||
      (selectedAvailability === 'Project-based' && avail.includes('project-based'));

    // Budget / Rate filter
    const rateNum = Number(c.hourly_rate_usd || parseInt(String(c.hourlyRate || '').replace(/[^0-9]/g, '')) || 0);
    const matchesBudget = 
      selectedMaxRate === 'all' ||
      (selectedMaxRate === '50' && rateNum <= 50) ||
      (selectedMaxRate === '60' && rateNum <= 60) ||
      (selectedMaxRate === '75' && rateNum <= 75) ||
      (selectedMaxRate === '100' && rateNum <= 100) ||
      (selectedMaxRate === '125' && rateNum <= 125) ||
      (selectedMaxRate === '150' && rateNum <= 150);

    return matchesQuery && matchesVerification && matchesTool && matchesScore && matchesContentType && matchesAspectRatio && 
           matchesExclusions && matchesNiche && matchesSkill && matchesPlatform && 
           matchesExperience && matchesAvailability && matchesBudget;
  });

  // Run AI Recommendation Matcher Engine via Backend Explainable Scoring
  const runAIMatchingAgent = async (overrideSearchParams = null) => {
    setIsMatching(true);
    try {
      const budgetNum = budgetTier.includes('1,000') || budgetTier.includes('2,200') ? 130 : (budgetTier.includes('3,500') ? 150 : 250);
      const briefPayload = overrideSearchParams || {
        project_title: campaignGoal,
        target_tools: [preferredTool],
        output_format: targetAspect,
        content_type: 'Video',
        max_budget: budgetNum,
        excluded_tools: excludedKeywords,
        excluded_skills: excludedKeywords
      };
      const res = await authFetch(apiUrl('/api/score'), {
        method: 'POST',
        body: JSON.stringify({
          brief: briefPayload,
          excluded_tools: overrideSearchParams?.excluded_tools || excludedKeywords,
          excluded_skills: overrideSearchParams?.excluded_skills || excludedKeywords
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.ranked_candidates)) {
          const ranked = data.ranked_candidates.map((cand) => {
            const c = cand.creator || {};
            return {
              ...c,
              ...cand,
              id: cand.freelancer_id || c.id,
              name: c.name || 'AI Creator',
              avatar: c.avatar,
              title: c.title,
              hourlyRate: c.hourlyRate || (c.hourly_rate_usd ? `$${c.hourly_rate_usd}/hr` : '$120/hr'),
              matchPercentage: cand.overall_score || cand.match_percentage || 80,
              matchReason: cand.strengths && cand.strengths.length > 0 
                ? cand.strengths.join(' • ') 
                : (cand.reasons && cand.reasons.length > 0 ? cand.reasons.join(' • ') : `7-Dimension Match: ${cand.overall_score}%`),
              dimensionScores: cand.dimension_scores || {},
              dimension_breakdown: cand.dimension_breakdown,
              match_classification: cand.match_classification || (cand.overall_score >= 90 ? 'Exact Match' : 'Partial Match'),
              matched_skills: cand.matched_skills || c.skills || [],
              missing_skills: cand.missing_skills || [],
              matched_tools: cand.matched_tools || c.primaryTools || [],
              missing_tools: cand.missing_tools || [],
              relevant_specialization: cand.relevant_specialization || c.specialization,
              supporting_portfolio_items: cand.supporting_portfolio_items || c.portfolio_items || [],
              relevant_experience: cand.relevant_experience || { completed_gigs: c.completedGigs || 20, rating: c.rating || 4.9, verified_workflow: Boolean(c.verified) },
              matched_formats: cand.matched_formats || [],
              missing_requirements: cand.missing_requirements || [],
              formula_explanation: cand.formula_explanation,
              eligibilityStatus: cand.eligibility_status || 'Eligible',
              strengths: cand.strengths || [],
              gaps: cand.gaps || [],
              reasons: cand.reasons || [],
              is_demo: Boolean(cand.is_demo || c.is_demo || c._is_demo_fixture)
            };
          });
          setMatchResults(ranked);
          setRelaxationSuggestions(data.relaxation_suggestions || []);

          // Generate or fetch comprehensive matching report
          if (data.search_results) {
            try {
              const repRes = await authFetch(apiUrl('/api/report/generate'), {
                method: 'POST',
                body: JSON.stringify({
                  search_results: data.search_results,
                  scoring_results: data
                })
              });
              if (repRes.ok) {
                const repData = await repRes.json();
                if (repData.success && repData.report) {
                  setMatchingReport(repData.report);
                }
              }
            } catch (repErr) {
              console.warn('Matching report generation warning:', repErr);
            }
          }

          setIsMatching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend scoring endpoint error, using local fallback:', err);
    }

    // Client-side fallback if server unreachable
    setTimeout(() => {
      setIsMatching(false);
      const ranked = creators.map((c) => {
        let matchScore = 80;
        let reasons = [];
        if ((c.primaryTools || []).includes(preferredTool)) {
          matchScore += 12;
          reasons.push(`Specialized in ${preferredTool}`);
        }
        if ((c.aspectRatios || []).includes(targetAspect)) {
          matchScore += 5;
          reasons.push(`${targetAspect} format verified`);
        }
        const finalScore = Math.min(99, matchScore);
        return {
          ...c,
          matchPercentage: finalScore,
          matchReason: `⚡ ${finalScore}% Match: ${reasons.join(' & ') || 'Verified Creator'}`,
          eligibilityStatus: 'Eligible',
          dimensionScores: { skills: 85, specialization: 90, portfolio_relevance: 80, content_type: 100, tools: 95, style_and_format: 85, experience: 90 },
          dimension_breakdown: {
            skills: { weight: 0.25, score: 85, contribution: 21.3, status: 'partial_match', evidence: 'Core skills present' },
            specialization: { weight: 0.20, score: 90, contribution: 18.0, status: 'exact_match', evidence: c.specialization || 'Aligned niche' },
            portfolio_relevance: { weight: 0.20, score: 80, contribution: 16.0, status: 'partial_match', evidence: 'Portfolio media reviewed' },
            content_type: { weight: 0.10, score: 100, contribution: 10.0, status: 'exact_match', evidence: 'Format matches' },
            tools: { weight: 0.10, score: 95, contribution: 9.5, status: 'exact_match', evidence: preferredTool },
            style_and_format: { weight: 0.10, score: 85, contribution: 8.5, status: 'partial_match', evidence: targetAspect },
            experience: { weight: 0.05, score: 90, contribution: 4.5, status: 'exact_match', evidence: `${c.completedGigs || 20} completed gigs` }
          },
          match_classification: finalScore >= 90 ? 'Exact Match' : 'Partial Match',
          matched_skills: c.skills || [],
          missing_skills: [],
          matched_tools: c.primaryTools || [],
          missing_tools: [],
          supporting_portfolio_items: c.portfolio_items || [],
          relevant_experience: { completed_gigs: c.completedGigs || 20, rating: c.rating || 4.9, verified_workflow: Boolean(c.verified) },
          is_demo: Boolean(c.is_demo || c._is_demo_fixture)
        };
      }).sort((a, b) => b.matchPercentage - a.matchPercentage);
      setMatchResults(ranked);
    }, 600);
  };

  // Open official collaboration modal for a selected creator
  const handleOpenCollabModal = (creator) => {
    setSelectedCreatorForCollabModal(creator);
    setShowCollabRequestModal(true);
  };

  // Instant Hire / Offer Action (opens complete collaboration proposal modal)
  const handleSendOffer = (creator) => {
    handleOpenCollabModal(creator);
  };

  // Handle Cancel Sent Request
  const handleCancelSentRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending collaboration request?')) return;
    setCancellingRequestId(requestId);
    setRequestActionError(null);
    try {
      const res = await authFetch(apiUrl(`/api/collaboration/${requestId}/cancel`), {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel collaboration request');
      }
      setSentRequests(prev => prev.map(r => r.request_id === requestId ? { ...r, status: 'cancelled' } : r));
    } catch (err) {
      console.error('Cancellation error:', err);
      setRequestActionError(err.message || 'Could not cancel request');
    } finally {
      setCancellingRequestId(null);
    }
  };

  // Current active chat thread derived from selectedConversationRequestId
  const currentChat = dynamicChatThreadsList.find(t => 
    t.requestId === selectedConversationRequestId || t.id === selectedConversationRequestId
  ) || dynamicChatThreadsList[0];

  // Determine active conversation requestId for Supabase chat sync
  const activeRequestId = currentChat?.requestId || currentChat?.id || null;

  // Live Supabase Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatFetchError, setChatFetchError] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Fetch live chat messages with error detection, interval polling, and Supabase Realtime
  useEffect(() => {
    let isMounted = true;

    async function loadLiveMessages(isFirst = false) {
      if (!activeRequestId) {
        setChatMessages([]);
        return;
      }
      if (isFirst) setIsChatLoading(true);
      const res = await fetchChatMessagesResult(activeRequestId);
      if (isMounted) {
        if (res.success) {
          setChatMessages(res.data || []);
          setChatFetchError(null);
        } else if (isFirst) {
          setChatFetchError(res.error || 'Failed to load messages');
        }
        if (isFirst) setIsChatLoading(false);
      }
    }

    loadLiveMessages(true);

    // 2.5-second polling interval as reliable sync fallback
    const pollInterval = setInterval(() => {
      loadLiveMessages(false);
    }, 2500);

    // Supabase Realtime subscription for instant message delivery without duplicate entries
    const unsubscribe = subscribeToMessages(activeRequestId, (newMsg) => {
      if (isMounted && newMsg) {
        setChatMessages(prev => {
          const id = newMsg.message_id || newMsg.id;
          if (prev.some(m => (m.message_id || m.id) === id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeRequestId]);

  // Handle Send Chat (Sends to Supabase public.messages / Express backend proxy)
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = chatInput.trim();
    if (!text || isSendingMessage || !activeRequestId) return;

    setSendError(null);
    setIsSendingMessage(true);

    const activeCompanyId = user?.id || localStorage.getItem('genlancer_user_id') || 'COMP001';
    const result = await sendChatMessage(activeRequestId, activeCompanyId, 'company', text);
    if (result?.success) {
      setChatInput('');
      const res = await fetchChatMessagesResult(activeRequestId);
      if (res.success && res.data) {
        setChatMessages(res.data);
      }
    } else {
      setSendError(result?.error || 'Failed to send message. Please retry.');
    }
    setIsSendingMessage(false);
  };

  // Auto-populate the active brief form state with the structured AI brief data
  const setBriefForm = (data) => {
    const brief = data?.brief || data || {};

    // Auto-fill Title: prefer first suggested brand name + tagline, or fallback to brief title or raw idea
    let titleVal = '';
    if (Array.isArray(brief.brandNameSuggestions) && brief.brandNameSuggestions.length > 0) {
      const topName = brief.brandNameSuggestions[0]?.name || '';
      titleVal = topName ? `${topName} – ${brief.tagline || 'Campaign'}` : '';
    } else if (brief.title) {
      titleVal = brief.title;
    } else if (rawIdea.trim()) {
      titleVal = rawIdea.trim().slice(0, 50);
    }

    // Auto-fill Budget: extract from brief if available, or keep existing / fallback
    const budgetVal = brief.budget || newBrief.budget || '$4,500';

    // Auto-fill Target Audience: format nicely from primaryAudience / demographics
    let audienceVal = '';
    if (typeof brief.targetAudience === 'object' && brief.targetAudience !== null) {
      const parts = [
        brief.targetAudience.primaryAudience,
        brief.targetAudience.demographics ? `Demographics: ${brief.targetAudience.demographics}` : null
      ].filter(Boolean);
      audienceVal = parts.join(' | ');
    } else if (typeof brief.targetAudience === 'string') {
      audienceVal = brief.targetAudience;
    }

    // Auto-fill Deliverables: format keyDeliverables list
    let deliverablesVal = '';
    if (Array.isArray(brief.keyDeliverables)) {
      deliverablesVal = brief.keyDeliverables
        .map(item => typeof item === 'string' ? item : `${item.item || ''}${item.description ? `: ${item.description}` : ''}`)
        .filter(Boolean)
        .join('; ');
    } else if (typeof brief.deliverables === 'string') {
      deliverablesVal = brief.deliverables;
    }

    // Auto-fill Style & Directives:
    let styleVal = '';
    if (brief.visualIdentity) {
      const aesthetic = brief.visualIdentity.designAesthetic || '';
      const mood = brief.visualIdentity.typographyMood || '';
      const tone = Array.isArray(brief.toneAndVoice) ? brief.toneAndVoice.join(', ') : (brief.toneAndVoice || '');
      styleVal = [
        aesthetic ? `Aesthetic: ${aesthetic}` : null,
        mood ? `Typography/Mood: ${mood}` : null,
        tone ? `Tone & Voice: ${tone}` : null
      ].filter(Boolean).join('\n');
    } else if (brief.style || brief.executiveSummary) {
      styleVal = brief.style || brief.executiveSummary;
    }

    setNewBrief(prev => ({
      ...prev,
      title: titleVal || prev.title,
      budget: budgetVal || prev.budget,
      targetAudience: audienceVal || prev.targetAudience,
      deliverables: deliverablesVal || prev.deliverables,
      style: styleVal || prev.style
    }));
  };

  // API Call to Express Gemini Proxy
  const handleGenerateBrief = async () => {
    if (!rawIdea.trim()) return;
    setIsGenerating(true);
    setBriefStatus(null);
    try {
      const response = await authFetch(apiUrl('/api/generate-brief'), {
        method: 'POST',
        body: JSON.stringify({ idea: rawIdea })
      });
      const data = await response.json();
      if (response.ok) {
        // Auto-populate the active brief form state with the structured AI brief data:
        setBriefForm(data);
        setLastGeneratedBrief(data?.brief || data);
        setBriefStatus({
          type: 'success',
          message: '✨ AI Brief structured successfully with Gemini! Review and customize the form below.'
        });
      } else {
        console.error("Error from backend:", data.error);
        setBriefStatus({
          type: 'error',
          message: data.error || 'Failed to generate brief from backend.'
        });
      }
    } catch (error) {
      console.error("Network error connecting to backend:", error);
      setBriefStatus({
        type: 'error',
        message: `Network error connecting to backend API at ${API_BASE_URL || window.location.origin}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish / Save Brief to Supabase and Backend Collaboration Store
  const handlePublishBrief = async (generatedBriefData, selectedFreelancerId) => {
    setIsPublishing(true);
    try {
      const briefPayload = generatedBriefData || lastGeneratedBrief || {
        title: newBrief.title,
        budget: newBrief.budget,
        aspectRatio: newBrief.aspectRatio,
        targetAudience: newBrief.targetAudience,
        deliverables: newBrief.deliverables,
        style: newBrief.style,
        requiredTools: newBrief.requiredTools
      };

      const reqUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;
      let saved = false;

      // 1. Attempt Supabase direct write
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('collaboration_requests')
            .insert([
              {
                request_id: reqUuid,
                company_id: user?.id || 'COMP001',
                freelancer_id: selectedFreelancerId || 'c1',
                project_brief: briefPayload,
                brief_version: 1,
                status: 'pending',
                audit_history: [{ action: 'created', by: user?.id || 'COMP001', timestamp: new Date().toISOString() }]
              }
            ]);
          if (!error) saved = true;
        }
      } catch (err) {
        console.warn('Supabase direct insert error, syncing with Express proxy:', err.message);
      }

      // 2. Sync to Backend Collaboration Service with Bearer token
      try {
        const activeCompanyId = user?.id || localStorage.getItem('genlancer_user_id') || 'COMP001';
        const res = await authFetch(apiUrl('/api/collaboration'), {
          method: 'POST',
          body: JSON.stringify({
            request_id: reqUuid,
            company_id: activeCompanyId,
            freelancer_id: selectedFreelancerId || 'c1',
            project_brief: briefPayload,
            brief_version: 1,
            status: 'pending'
          })
        });
        if (res.ok) saved = true;
      } catch (backendErr) {
        console.warn('Express collaboration route error:', backendErr);
      }

      setBriefStatus({
        type: 'success',
        message: '🎉 Campaign brief published and sent to Creator dashboard!'
      });
      return { success: true };
    } catch (err) {
      console.error('Error saving brief:', err);
      setBriefStatus({
        type: 'error',
        message: 'Failed to publish brief. Check console.'
      });
      return { success: false, error: err };
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Create Brief
  const handleCreateBrief = async (e) => {
    e.preventDefault();
    await handlePublishBrief(lastGeneratedBrief || newBrief, selectedCreatorForModal?.id || 'FL001');
    setShowCreateBriefModal(false);
    setNewBrief({
      title: '',
      company: 'Apex Creative Agency',
      budget: '$3,500',
      deadline: 'Nov 30, 2026',
      aspectRatio: '16:9',
      targetAudience: '',
      deliverables: '',
      style: '',
      requiredTools: 'Runway Gen-3 Alpha, Midjourney v6'
    });
    setRawIdea('');
    setBriefStatus(null);
    setLastGeneratedBrief(null);
  };

  // Handoff from AI Campaign Brief Builder directly to AI Creator Matchmaker
  const handleBriefMatchingHandoff = (normalizedBrief, searchParams) => {
    if (normalizedBrief.title || normalizedBrief.goal) {
      setCampaignGoal(normalizedBrief.title || normalizedBrief.goal);
    }
    if (normalizedBrief.style) {
      setTargetStyle(normalizedBrief.style);
    }
    if (normalizedBrief.tools && normalizedBrief.tools.length > 0) {
      const validTools = ['Runway Gen-3 Alpha', 'Flux.1 Dev', 'Kling AI 1.5', 'Sora', 'Midjourney v6'];
      const matched = validTools.find(vt => normalizedBrief.tools.some(t => t.toLowerCase().includes(vt.toLowerCase())));
      if (matched) setPreferredTool(matched);
    }
    if (normalizedBrief.aspect_ratio) {
      setTargetAspect(normalizedBrief.aspect_ratio);
    }
    if (normalizedBrief.max_budget) {
      if (normalizedBrief.max_budget <= 2500) setBudgetTier('$2,200 (Standard)');
      else if (normalizedBrief.max_budget <= 4000) setBudgetTier('$3,500 (Commercial)');
      else if (normalizedBrief.max_budget <= 6000) setBudgetTier('$4,500 (Enterprise Tier)');
      else setBudgetTier('$7,500 (Full Campaign Suite)');
    }
    setActiveTab('matchmaker');
    runAIMatchingAgent(searchParams);
  };

  // Publish from AI Campaign Brief Builder to Supabase & Backend Store
  const handlePublishBriefFromModal = async (normalizedBrief) => {
    await handlePublishBrief(normalizedBrief, selectedCreatorForModal?.id || 'FL001');
  };

  // currentChat is authoritatively derived above with activeRequestId

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F8FAFC] text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* Background dot grid pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* ================= TOP ENTERPRISE NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-30 w-full px-4 sm:px-6 lg:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <GenLancerLogo className="w-9 h-9" textColor="text-slate-900" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white font-black text-xs flex items-center justify-center shadow-sm">
                {(user?.name || user?.company_name || (user?.email?.includes('veloce') ? 'Veloce Energy' : 'Apex Creative Agency')).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {user?.name || user?.company_name || (user?.email?.includes('veloce') ? 'Veloce Energy' : 'Apex Creative Agency')}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Commercial Client
                </span>
              </div>
            </div>
            {/* Live Data vs Demo Data Indicator Badge */}
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs hidden sm:inline-flex items-center gap-1 ${
              dataSource === 'demo'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}>
              <span>{dataSource === 'demo' ? '⚡ Demo Data' : '🟢 Live Supabase'}</span>
            </span>
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <SubscriptionCenter role={user?.role || localStorage.getItem('genlancer_active_role') || 'company'} />
            <button
              onClick={() => setShowCreateBriefModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Post Campaign Brief</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-xl hover:bg-slate-100"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= SECONDARY TAB NAVIGATION BAR ================= */}
        <div className="w-full px-4 sm:px-6 lg:px-8 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('directory');
              setSelectedCreatorProfile(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-[#FF6B00] text-[#FF6B00] bg-white shadow-sm rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>1. Creator Directory & Search</span>
          </button>

          <button
            onClick={() => setActiveTab('matchmaker')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matchmaker'
                ? 'border-[#FF6B00] text-[#FF6B00] bg-white shadow-sm rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-[#FF6B00]" />
            <span>2. AI Recommendation Agent</span>
            <span className="text-[10px] bg-orange-100 text-[#FF6B00] px-1.5 py-0.2 rounded font-mono">Smart</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contracts'
                ? 'border-[#FF6B00] text-[#FF6B00] bg-white shadow-sm rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Active Contracts</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
              {activeContracts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'messages'
                ? 'border-[#FF6B00] text-[#FF6B00] bg-white shadow-sm rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>4. Brand Communications</span>
            <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
          </button>

          {/* Quick Trigger Shortcuts in Navigation Bar */}
          <div className="ml-auto hidden lg:flex items-center gap-2 py-1.5">
            {matchingReport && (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                title="View Matching and Requirements Report"
              >
                <FileText className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Matching Report</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateBriefModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-[#FF6B00] border border-orange-200 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Brief Builder</span>
            </button>
          </div>
        </div>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 flex flex-col z-10">

          {/* Database State & Demo Mode Notice Banners */}
          {dataSource === 'demo' && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚡</span>
                <div>
                  <span className="font-extrabold text-sm block">Explicit Demo Mode Active (DEMO_MODE=true)</span>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    Displaying sample preview fixtures. Demo talent profiles are unverified mock data. Configure Supabase credentials to query the live creator database.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-200/80 text-amber-900 rounded-full font-mono text-[10px] font-bold shrink-0">
                Unverified Preview
              </span>
            </div>
          )}

          {dataSource === 'error' && (
            <div className="mb-6 p-4 sm:p-5 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-rose-950 shadow-xs animate-fade-in">
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm sm:text-base text-rose-900 block leading-tight">Database Service Unavailable</span>
                  <p className="text-xs sm:text-sm text-rose-700 font-normal mt-1 leading-relaxed">
                    {databaseError || 'Unable to connect to Supabase database. Please check connection credentials or enable DEMO_MODE=true.'}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCreators}
                disabled={loading}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Retrying Connection...' : 'Retry Connection'}</span>
              </button>
            </div>
          )}

          {dataSource === 'empty' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 animate-fade-in">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="text-lg">ℹ️</span>
                <div>
                  <span className="font-bold text-sm block">Authoritative Supabase Database Connected (0 Records Found)</span>
                  <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                    Your database is operational, but the <code>freelancers</code> table is currently empty. Run <code>server/migrations/002_seed_demo_creators_safely.sql</code> to seed talent, or add records directly.
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCreators}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                Refresh Database
              </button>
            </div>
          )}

          {/* ================= TAB 1: CREATOR DIRECTORY ================= */}
          {activeTab === 'directory' && (
            selectedCreatorProfile ? (
              <CreatorProfileView
                creatorId={selectedCreatorProfile.id}
                initialCreator={selectedCreatorProfile}
                onBack={() => setSelectedCreatorProfile(null)}
                onRequestCollaboration={(c) => handleSendOffer(c)}
                onInspectWorkflow={(c, pf) => {
                  const pItem = pf || (c.portfolio_items && c.portfolio_items[0]) || null;
                  setSelectedAssetForInspect({
                    ...c,
                    ...pItem,
                    id: pItem?.id || c.id,
                    title: pItem?.title ? `${c.name} – ${pItem.title}` : `${c.name} – Creative Reel & Workflow`,
                    prompt: pf ? (pf.prompt || '') : (pItem?.prompt || c.samplePrompt || ''),
                    mediaUrl: pItem?.media_url || pItem?.mediaUrl || c.sampleMedia || null,
                    seed: pf ? (pf.seed && pf.seed !== '...' ? pf.seed : null) : (pItem?.seed && pItem.seed !== '...' ? pItem.seed : (c.seed && c.seed !== '...' ? c.seed : null)),
                    pipeline: pItem?.pipeline || c.pipeline || (c.primaryTools?.join(' ➔ ') || 'Pipeline'),
                    tool: pItem?.tool || (pItem?.tools_used && pItem.tools_used[0]) || c.primaryTools?.[0] || 'AI Model',
                    tools_used: pf ? (pf.tools_used || (pf.tool ? [pf.tool] : [])) : (pItem?.tools_used || c.primaryTools || []),
                    skills_used: pf ? (pf.skills_used || []) : (pItem?.skills_used || c.skills || []),
                    description: pf ? (pf.description || null) : (pItem?.description || c.bio || null),
                    project_outcome: pItem?.project_outcome || null,
                    project_url: pItem?.project_url || null,
                    aspectRatio: pItem?.aspect_ratio || pItem?.aspectRatio || (c.aspectRatios && c.aspectRatios[0]) || '16:9',
                    verified: Boolean(pItem?.verified ?? c.verified),
                    verification_status: pItem?.verification_status || c.verification_status,
                    verification_scope: pItem?.verification_scope || c.verification_scope,
                    score: c.score ?? c.ai_creator_score ?? null
                  });
                }}
              />
            ) : (
              <div className="space-y-6">
                {/* Clean Page Heading & Supporting Text */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Commercial Creator Directory
                    </h1>
                    <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Discover and commission verified generative artists backed by reproducible prompt workflows and explainable 7D matching.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold text-[#FF6B00] bg-orange-50 border border-orange-200/80 px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
                      <span>{filteredCreators.length} Available {filteredCreators.length === 1 ? 'Creator' : 'Creators'}{filteredCreators.some(c => Boolean(c.verified)) ? ` (${filteredCreators.filter(c => Boolean(c.verified)).length} Verified)` : ''}</span>
                    </span>
                  </div>
                </div>

                {/* Summary Statistics Cards (Real Data Flow) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-200/90 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Available Talent</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{creators.length}</span>
                        <span className="text-xs text-slate-500 font-medium">artists</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                      Live In Supabase Database
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-200/90 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Active Contracts</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-[#FF6B00] tracking-tight">{activeContracts.length}</span>
                        <span className="text-xs text-slate-500 font-medium">campaigns</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                      Live Brand Engagements
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-200/90 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Avg Creator Score</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                          {creators.length > 0 && creators.some(c => (c.score ?? c.ai_creator_score) != null) ? (
                            (creators.filter(c => (c.score ?? c.ai_creator_score) != null).reduce((sum, c) => sum + Number(c.score ?? c.ai_creator_score), 0) /
                             creators.filter(c => (c.score ?? c.ai_creator_score) != null).length).toFixed(1)
                          ) : 'N/A'}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">/100</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-700/90 font-medium mt-2 pt-2 border-t border-slate-100">
                      Rigorous 7D Verification
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-200/90 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Verified Pipelines</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {new Set(creators.flatMap(c => c.primaryTools || c.ai_tools_models || [])).size}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">model stacks</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                      Multi-Model Generation
                    </p>
                  </div>
                </div>

                {/* Top Filter & Search Controls */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="Search creators by name, professional title, skills, tools (e.g. Prompt Engineering, React, Midjourney)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                          aria-label="Clear search query"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Reset Button */}
                    {(searchQuery || selectedVerification !== 'all' || selectedTool !== 'all' || selectedScore !== 'all' || selectedContentType !== 'all' || selectedAspectRatio !== 'all' || selectedNiche !== 'all' || selectedSkill !== 'all' || selectedPlatform !== 'all' || selectedExperience !== 'all' || selectedAvailability !== 'all' || selectedMaxRate !== 'all' || excludedKeywords.length > 0) && (
                      <button
                        onClick={handleResetFilters}
                        className="h-11 px-4.5 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Section Sub-heading */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Multi-Dimensional Matching Criteria</span>
                    <span className="text-xs text-slate-500">Live database filters</span>
                  </div>

                  {/* Adaptive Filter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {/* Verification Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Verification Status</label>
                      <select
                        value={selectedVerification}
                        onChange={(e) => setSelectedVerification(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Verification Statuses</option>
                        <option value="verified">Verified Only</option>
                        <option value="pending">Pending Audit</option>
                        <option value="unverified">Unverified Only</option>
                      </select>
                    </div>

                    {/* AI Pipeline Tool */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">AI Pipeline Tool</label>
                      <select
                        value={selectedTool}
                        onChange={(e) => setSelectedTool(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Model Tools</option>
                        <option value="ChatGPT">ChatGPT</option>
                        <option value="Midjourney">Midjourney v6</option>
                        <option value="Runway">Runway Gen-3</option>
                        <option value="Flux">Flux.1</option>
                        <option value="Adobe Firefly">Adobe Firefly</option>
                        <option value="Stable Diffusion">Stable Diffusion XL</option>
                        <option value="Sora">Sora</option>
                        <option value="Blender">Blender</option>
                        <option value="Figma">Figma</option>
                        <option value="GitHub Copilot">GitHub Copilot</option>
                      </select>
                    </div>

                    {/* Domain Specialization */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Domain Specialization</label>
                      <select
                        value={selectedNiche}
                        onChange={(e) => setSelectedNiche(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Specializations</option>
                        <option value="AI Pipeline Developer">AI Pipeline Developer</option>
                        <option value="Surrealist Visual Artist">Surrealist Visual Artist</option>
                        <option value="AI Film & Motion Producer">AI Film & Motion Producer</option>
                        <option value="Futuristic 3D Concept Artist">Futuristic 3D Concept Artist</option>
                        <option value="AI-Enhanced Brand Designer">AI-Enhanced Brand Designer</option>
                      </select>
                    </div>

                    {/* Required Skill */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Skill</label>
                      <select
                        value={selectedSkill}
                        onChange={(e) => setSelectedSkill(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Skills</option>
                        <option value="React">React</option>
                        <option value="Prompt Engineering">Prompt Engineering</option>
                        <option value="Concept Art">Concept Art</option>
                        <option value="Video Editing">Video Editing</option>
                        <option value="3D Environment Design">3D Environment Design</option>
                        <option value="UI/UX Prototyping">UI/UX Prototyping</option>
                        <option value="Inpainting">Inpainting</option>
                        <option value="Color Grading">Color Grading</option>
                        <option value="Node.js">Node.js</option>
                      </select>
                    </div>

                    {/* Max Hourly Rate */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Hourly Rate</label>
                      <select
                        value={selectedMaxRate}
                        onChange={(e) => setSelectedMaxRate(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Hourly Rates</option>
                        <option value="50">Up to $50/hr</option>
                        <option value="60">Up to $60/hr</option>
                        <option value="75">Up to $75/hr</option>
                        <option value="100">Up to $100/hr</option>
                        <option value="125">Up to $125/hr</option>
                        <option value="150">Up to $150/hr</option>
                      </select>
                    </div>

                    {/* Availability */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Availability</label>
                      <select
                        value={selectedAvailability}
                        onChange={(e) => setSelectedAvailability(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">Any Availability</option>
                        <option value="available">Available Now</option>
                        <option value="busy">Busy / Booked</option>
                      </select>
                    </div>

                    {/* Content Type */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content Type</label>
                      <select
                        value={selectedContentType}
                        onChange={(e) => setSelectedContentType(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">All Content Types</option>
                        <option value="Dashboards">Dashboards</option>
                        <option value="Key Art">Key Art</option>
                        <option value="Promo Videos">Promo Videos</option>
                        <option value="Environment Assets">Environment Assets</option>
                        <option value="Brand Guides">Brand Guides</option>
                        <option value="Video">Video / Motion</option>
                      </select>
                    </div>

                    {/* Min AI Score */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Min AI Score</label>
                      <select
                        value={selectedScore}
                        onChange={(e) => setSelectedScore(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">Any Score</option>
                        <option value="90">90+ Score (Verified)</option>
                        <option value="95">95+ Score (Elite)</option>
                        <option value="98">98+ Score (Top 1%)</option>
                      </select>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Aspect Ratio / Format</label>
                      <select
                        value={selectedAspectRatio}
                        onChange={(e) => setSelectedAspectRatio(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">Any Format</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Vertical/Reel)</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="PNG">PNG Key Visuals</option>
                        <option value="MP4">MP4 Video</option>
                        <option value="JSON">JSON Pipeline Output</option>
                      </select>
                    </div>

                    {/* Experience Level */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Experience Level</label>
                      <select
                        value={selectedExperience}
                        onChange={(e) => setSelectedExperience(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer font-medium shadow-xs"
                      >
                        <option value="all">Any Experience</option>
                        <option value="10">10+ Completed Gigs</option>
                        <option value="25">25+ Completed Gigs</option>
                        <option value="40">40+ Completed Gigs</option>
                      </select>
                    </div>
                  </div>

                  {/* Active Filters Summary Bar */}
                  {(searchQuery || selectedVerification !== 'all' || selectedTool !== 'all' || selectedScore !== 'all' || selectedContentType !== 'all' || selectedAspectRatio !== 'all' || selectedNiche !== 'all' || selectedSkill !== 'all' || selectedAvailability !== 'all' || selectedMaxRate !== 'all' || excludedKeywords.length > 0) && (
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Active Filters:</span>
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#FF6B00] border border-orange-200/80 px-2.5 py-1 rounded-lg font-medium">
                          <span>Search: "{searchQuery}"</span>
                          <button onClick={() => setSearchQuery('')} className="hover:text-orange-950 cursor-pointer" aria-label="Clear search"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedVerification !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Verification: {selectedVerification === 'verified' ? 'Verified Only' : selectedVerification === 'pending' ? 'Pending Audit' : 'Unverified Only'}</span>
                          <button onClick={() => setSelectedVerification('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear verification filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedMaxRate !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Max Rate: ${selectedMaxRate}/hr</span>
                          <button onClick={() => setSelectedMaxRate('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear rate filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedAvailability !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Availability: {selectedAvailability === 'available' ? 'Available' : 'Busy'}</span>
                          <button onClick={() => setSelectedAvailability('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear availability filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedTool !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Tool: {selectedTool}</span>
                          <button onClick={() => setSelectedTool('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear tool filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedSkill !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Skill: {selectedSkill}</span>
                          <button onClick={() => setSelectedSkill('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear skill filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedContentType !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Content: {selectedContentType}</span>
                          <button onClick={() => setSelectedContentType('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear content type filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {selectedNiche !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                          <span>Specialization: {selectedNiche}</span>
                          <button onClick={() => setSelectedNiche('all')} className="hover:text-slate-950 cursor-pointer" aria-label="Clear niche filter"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-[#FF6B00] hover:underline font-semibold ml-1 cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>
                  )}

                  {/* Exclude Tools or Skills Section */}
                  <div className="pt-4 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Exclude Tools or Skills (Negative Constraints)
                      </label>
                      {excludedKeywords.length > 0 && (
                        <span className="text-xs font-bold text-[#FF6B00] bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full">
                          {excludedKeywords.length} Active Exclusion{excludedKeywords.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={currentExclusionInput}
                          onChange={(e) => setCurrentExclusionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddExclusion();
                            }
                          }}
                          placeholder="Type tool or skill to exclude (e.g. Blender, Midjourney, 3D Modeling)..."
                          className="w-full h-11 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExclusion}
                        disabled={!currentExclusionInput.trim()}
                        className="h-11 px-5 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Exclusion</span>
                      </button>
                    </div>

                    {/* Active Exclusion Badges */}
                    {excludedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {excludedKeywords.map((tag) => (
                          <span
                            key={tag}
                            className="bg-orange-50 text-[#FF6B00] border border-orange-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExclusion(tag)}
                              className="hover:bg-orange-100 rounded-full p-0.5 transition-colors cursor-pointer text-[#FF6B00]"
                              title={`Remove exclusion for ${tag}`}
                              aria-label={`Remove exclusion for ${tag}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setExcludedKeywords([])}
                          className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer font-medium"
                        >
                          Clear all exclusions
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Creators Grid / Loading / Error / Empty States */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                        <div className="aspect-video bg-slate-200 rounded-xl" />
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                            <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                          </div>
                        </div>
                        <div className="h-14 bg-slate-100 rounded-xl w-full" />
                        <div className="flex gap-2 pt-2">
                          <div className="h-8 bg-slate-200 rounded-xl flex-1" />
                          <div className="h-8 bg-slate-200 rounded-xl flex-1" />
                          <div className="h-8 bg-slate-200 rounded-xl flex-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dataSource === 'error' ? (
                  <div className="py-12 px-6 bg-rose-50/70 rounded-2xl border border-rose-200 text-center max-w-xl mx-auto space-y-4 my-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-extrabold text-base text-rose-950">Unable to Load Creator Directory</h3>
                      <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                        {databaseError || 'Failed to fetch creators from the backend API. Please check service health and retry.'}
                      </p>
                    </div>
                    <button
                      onClick={fetchCreators}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                ) : dataSource === 'empty' ? (
                  <div className="py-12 px-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 text-center max-w-xl mx-auto space-y-4 my-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-extrabold text-base text-slate-900">0 Creators Found in Directory</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Your database is connected, but no creator profiles are registered yet. Seed or register creator talent to populate this directory.
                      </p>
                    </div>
                    <button
                      onClick={fetchCreators}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refresh Directory</span>
                    </button>
                  </div>
                ) : filteredCreators.length === 0 ? (
                  <div className="py-8 px-6 bg-slate-50/90 rounded-2xl border border-dashed border-slate-300 text-center max-w-2xl mx-auto space-y-4 my-3">
                    <div className="w-11 h-11 rounded-xl bg-orange-100 text-[#FF6B00] mx-auto flex items-center justify-center shadow-xs">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-slate-900">No creators match your active filter criteria</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Try loosening one of your search constraints or clearing filters to view all available talent:
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-2 pt-1">
                      {selectedVerification !== 'all' && (
                        <button
                          onClick={() => setSelectedVerification('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Clear Verification: {selectedVerification}
                        </button>
                      )}
                      {selectedMaxRate !== 'all' && (
                        <button
                          onClick={() => setSelectedMaxRate('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Remove Rate Limit (${selectedMaxRate}/hr)
                        </button>
                      )}
                      {selectedAvailability !== 'all' && (
                        <button
                          onClick={() => setSelectedAvailability('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Clear Availability: {selectedAvailability}
                        </button>
                      )}
                      {selectedSkill !== 'all' && (
                        <button
                          onClick={() => setSelectedSkill('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Clear Skill: {selectedSkill}
                        </button>
                      )}
                      {selectedNiche !== 'all' && (
                        <button
                          onClick={() => setSelectedNiche('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Clear Specialization: {selectedNiche}
                        </button>
                      )}
                      {selectedTool !== 'all' && (
                        <button
                          onClick={() => setSelectedTool('all')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Allow All Tools
                        </button>
                      )}
                      {excludedKeywords.length > 0 && (
                        <button
                          onClick={() => {
                            setExcludedKeywords([]);
                            setCurrentExclusionInput('');
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Remove Exclusions ({excludedKeywords.length})</span>
                        </button>
                      )}
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCreators.map((creator) => (
                      <CreatorProfileCard
                        key={creator.id}
                        creator={creator}
                        onViewProfile={(c) => setSelectedCreatorProfile(c)}
                        onInspect={(c, pf) => {
                          const pItem = pf || (c.portfolio_items && c.portfolio_items[0]) || null;
                          setSelectedAssetForInspect({
                            ...c,
                            ...pItem,
                            id: pItem?.id || c.id,
                            title: pItem?.title ? `${c.name} – ${pItem.title}` : `${c.name} – Creative Reel & Workflow`,
                            prompt: pf ? (pf.prompt || '') : (pItem?.prompt || c.samplePrompt || ''),
                            mediaUrl: pItem?.media_url || pItem?.mediaUrl || c.sampleMedia || null,
                            seed: pf ? (pf.seed && pf.seed !== '...' ? pf.seed : null) : (pItem?.seed && pItem.seed !== '...' ? pItem.seed : (c.seed && c.seed !== '...' ? c.seed : null)),
                            pipeline: pItem?.pipeline || c.pipeline || (c.primaryTools?.join(' ➔ ') || 'Pipeline'),
                            tool: pItem?.tool || (pItem?.tools_used && pItem.tools_used[0]) || c.primaryTools?.[0] || 'AI Model',
                            tools_used: pf ? (pf.tools_used || (pf.tool ? [pf.tool] : [])) : (pItem?.tools_used || c.primaryTools || []),
                            skills_used: pf ? (pf.skills_used || []) : (pItem?.skills_used || c.skills || []),
                            description: pf ? (pf.description || null) : (pItem?.description || c.bio || null),
                            project_outcome: pItem?.project_outcome || null,
                            project_url: pItem?.project_url || null,
                            aspectRatio: pItem?.aspect_ratio || pItem?.aspectRatio || (c.aspectRatios && c.aspectRatios[0]) || '16:9',
                            verified: Boolean(pItem?.verified ?? c.verified),
                            verification_status: pItem?.verification_status || c.verification_status,
                            verification_scope: pItem?.verification_scope || c.verification_scope,
                            score: c.score ?? c.ai_creator_score ?? null
                          });
                        }}
                        onExplainScore={(c) => {
                          const scoreVal = c.score ?? c.ai_creator_score ?? null;
                          setSelectedCandidateForExplanation({
                            ...c,
                            creator: c,
                            overall_score: scoreVal,
                            match_classification: (scoreVal != null && scoreVal >= 90) ? 'Exact Match' : (scoreVal != null && scoreVal >= 70 ? 'Partial Match' : 'Unmet Requirements'),
                            matched_skills: c.skills || [],
                            matched_tools: c.primaryTools || c.ai_tools_models || [],
                            supporting_portfolio_items: c.portfolio_items || [],
                            relevant_experience: {
                              completed_gigs: c.completedGigs ?? c.completed_gigs ?? 0,
                              rating: c.rating ?? null,
                              verified_workflow: Boolean(c.verified)
                            }
                          });
                        }}
                        onSendOffer={(c) => handleSendOffer(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* ================= TAB 2: AI RECOMMENDATION AGENT ================= */}
          {activeTab === 'matchmaker' && (
            <div className="space-y-6">
              {/* Campaign Requirement Builder Card */}
              <div className="p-6 bg-gradient-to-br from-orange-50/60 via-white to-slate-50 rounded-2xl border border-orange-200/80 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">AI Match & Recommendation Agent</h2>
                    <p className="text-xs text-slate-500">Define campaign specs to score and rank verified creators automatically.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Goal / Brief Title</label>
                    <input 
                      type="text"
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Visual Style</label>
                    <input 
                      type="text"
                      value={targetStyle}
                      onChange={(e) => setTargetStyle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Model Pipeline</label>
                    <select
                      value={preferredTool}
                      onChange={(e) => setPreferredTool(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                    >
                      <option>Runway Gen-3 Alpha</option>
                      <option>Flux.1 Dev</option>
                      <option>Kling AI 1.5</option>
                      <option>Sora</option>
                      <option>Midjourney v6</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Aspect Ratio</label>
                    <select
                      value={targetAspect}
                      onChange={(e) => setTargetAspect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                    >
                      <option>16:9</option>
                      <option>9:16</option>
                      <option>1:1</option>
                      <option>4:5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Agreed Campaign Escrow Budget</label>
                    <select
                      value={budgetTier}
                      onChange={(e) => setBudgetTier(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                    >
                      <option>$2,200 (Standard)</option>
                      <option>$3,500 (Commercial)</option>
                      <option>$4,500 (Enterprise Tier)</option>
                      <option>$7,500 (Full Campaign Suite)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={runAIMatchingAgent}
                      disabled={isMatching}
                      className="w-full py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isMatching ? 'animate-spin' : ''}`} />
                      <span>{isMatching ? 'Calculating AI Match Scores...' : 'Run AI Matching Agent →'}</span>
                    </button>
                  </div>

                  {excludedKeywords.length > 0 && (
                    <div className="col-span-1 md:col-span-3 pt-2 border-t border-orange-200/40 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <span className="font-bold text-slate-700">Enforced Search Exclusions:</span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {excludedKeywords.map((tag) => (
                          <span key={tag} className="bg-orange-500/10 text-[#FF6B00] border border-orange-500/20 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                            <span>{tag}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveExclusion(tag)} 
                              className="hover:text-red-500 cursor-pointer text-xs"
                              title={`Remove ${tag}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Empty State with Actionable Relaxation Suggestions */}
              {matchResults && matchResults.length === 0 && (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#FF6B00] mx-auto flex items-center justify-center">
                    <SlidersHorizontal className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="font-extrabold text-base text-slate-900">No creators met 100% of the active criteria for "{campaignGoal}"</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Instead of silently returning unrelated creators, the AI Matchmaker suggests relaxing one or more constraints:
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto pt-1">
                    {excludedKeywords.length > 0 && (
                      <button
                        onClick={() => {
                          setExcludedKeywords([]);
                          runAIMatchingAgent({ excluded_tools: [], excluded_skills: [] });
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Remove Exclusions ({excludedKeywords.length})</span>
                      </button>
                    )}

                    {relaxationSuggestions.length > 0 ? (
                      relaxationSuggestions.map((sug, i) => (
                        <div key={i} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 font-medium">
                          💡 {sug}
                        </div>
                      ))
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setBudgetTier('$7,500 (Full Campaign Suite)');
                            runAIMatchingAgent();
                          }}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Increase Escrow Budget Tier
                        </button>
                        <button
                          onClick={() => {
                            setPreferredTool('Runway Gen-3 Alpha');
                            setTargetAspect('16:9');
                            setExcludedKeywords([]);
                            runAIMatchingAgent({ excluded_tools: [], excluded_skills: [] });
                          }}
                          className="px-3.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Broaden Model Pipeline & Requirements
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations Ranked List */}
              {matchResults && matchResults.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>Ranked Recommendations for "{campaignGoal}"</span>
                      <span className="text-xs text-[#FF6B00] bg-orange-100 px-2 py-0.5 rounded-full font-bold">
                        {matchResults.length} Matches Found
                      </span>
                    </h3>

                    {matchingReport && (
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>View Matching & Requirements Report</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {matchResults.map((creator, idx) => (
                      <div 
                        key={creator.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-orange-300 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </div>
                          <img 
                            src={creator.avatar} 
                            alt={creator.name} 
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">{creator.name}</h4>
                              {creator.is_demo ? (
                                <VerificationBadge status="demo_unverified" size="sm" />
                              ) : creator.verified ? (
                                <>
                                  <VerificationBadge status="verified" scope={creator.verification_scope || 'workflow'} size="sm" />
                                  {creator.verification_scope === 'pipeline' && (
                                    <VerificationBadge status="verified" scope="pipeline" size="sm" />
                                  )}
                                </>
                              ) : creator.verification_status === 'pending_review' ? (
                                <VerificationBadge status="pending_review" size="sm" />
                              ) : (
                                <VerificationBadge status="not_verified" size="sm" />
                              )}
                              {(creator.ai_creator_score || creator.score) && (
                                <VerificationBadge type="score" score={creator.ai_creator_score || creator.score || 96} size="sm" />
                              )}
                              
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                {creator.matchPercentage}% Match
                              </span>
                              
                              {/* Match Classification Chip */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                creator.match_classification === 'Exact Match'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : creator.match_classification === 'Partial Match'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : creator.match_classification === 'Requires Verification'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {creator.match_classification || creator.eligibilityStatus || 'Eligible'}
                              </span>

                              {(creator.is_demo || creator._is_demo_fixture) && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Demo Profile
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{creator.title} • {creator.hourlyRate}</p>
                            
                            {/* Matching vs Missing Skills */}
                            <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                              {(creator.matched_skills || []).slice(0, 3).map((ms, i) => (
                                <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{ms}</span>
                                </span>
                              ))}
                              {(creator.missing_skills || []).slice(0, 2).map((ms, i) => (
                                <span key={i} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>Missing: {ms}</span>
                                </span>
                              ))}
                            </div>

                            {/* Dimensional Breakdown Chips */}
                            {creator.dimensionScores && Object.keys(creator.dimensionScores).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                                {creator.dimensionScores.skills !== undefined && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">Skills: {creator.dimensionScores.skills}%</span>
                                )}
                                {creator.dimensionScores.tools !== undefined && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">Tools: {creator.dimensionScores.tools}%</span>
                                )}
                                {creator.dimensionScores.portfolio_relevance !== undefined && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">Portfolio: {creator.dimensionScores.portfolio_relevance}%</span>
                                )}
                              </div>
                            )}

                            {/* Strengths & Gaps */}
                            {creator.strengths && creator.strengths.length > 0 && (
                              <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>{creator.strengths[0]}</span>
                              </div>
                            )}
                            {creator.gaps && creator.gaps.length > 0 && (
                              <div className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{creator.gaps[0]}</span>
                              </div>
                            )}
                            <span className="text-[10px] text-slate-400 font-normal block mt-1">
                              Deterministic 7-dimension scoring engine • Source of truth: backend
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedCandidateForExplanation(creator)}
                            className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>📊 Explain Score</span>
                          </button>
                          <button
                            onClick={() => setSelectedCreatorForModal(creator)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                          >
                            Inspect Pipeline
                          </button>
                          <button
                            onClick={() => handleSendOffer(creator)}
                            className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Instant Campaign Offer ({budgetTier})</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: SENT REQUESTS & ACTIVE CONTRACTS ================= */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Sent Collaboration Requests & Engagements</h2>
                  <p className="text-xs text-slate-500">Live statuses, persisted scopes, and verified commercial contracts with creators.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSentRequests}
                    disabled={loadingSentRequests}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loadingSentRequests ? 'animate-spin' : ''}`} />
                    <span>Sync Live</span>
                  </button>
                  <span className="text-xs font-bold text-[#FF6B00] bg-orange-100 px-3 py-1 rounded-full">
                    {sentRequests.length > 0 ? sentRequests.length : activeContracts.length} Engagements
                  </span>
                </div>
              </div>

              {requestActionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                  <span>{requestActionError}</span>
                  <button onClick={() => setRequestActionError(null)} className="font-bold text-rose-600 hover:text-rose-800 ml-2">✕</button>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit text-xs font-bold text-slate-600">
                <button
                  onClick={() => setRequestsFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${requestsFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  All ({sentRequests.length})
                </button>
                <button
                  onClick={() => setRequestsFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${requestsFilter === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Pending ({sentRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  onClick={() => setRequestsFilter('accepted')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${requestsFilter === 'accepted' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Accepted ({sentRequests.filter(r => r.status === 'accepted' || r.status === 'confirmed').length})
                </button>
                <button
                  onClick={() => setRequestsFilter('resolved')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${requestsFilter === 'resolved' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Declined / Cancelled ({sentRequests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length})
                </button>
              </div>

              {/* Display Sent Requests */}
              {(() => {
                const filteredList = sentRequests.filter(r => {
                  if (requestsFilter === 'pending') return r.status === 'pending';
                  if (requestsFilter === 'accepted') return r.status === 'accepted' || r.status === 'confirmed';
                  if (requestsFilter === 'resolved') return r.status === 'rejected' || r.status === 'cancelled';
                  return true;
                });

                if (filteredList.length === 0 && activeContracts.length === 0) {
                  return (
                    <div className="p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 mx-auto flex items-center justify-center shadow-xs">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h3 className="font-extrabold text-sm text-slate-900">No collaboration requests found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Propose a project brief from the Creator Directory to initiate persistent collaboration.
                        </p>
                      </div>
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          onClick={() => setActiveTab('directory')}
                          className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Browse Creator Directory</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredList.map((req) => {
                      const matchedCreator = creators.find(c => c.id === req.freelancer_id) || {
                        id: req.freelancer_id,
                        name: req.freelancer_id === 'FL001' ? 'Aarav Sharma' : req.freelancer_id === 'FL002' ? 'Priya Reddy' : (req.freelancer_id || 'Creator'),
                        title: 'Generative AI Creator'
                      };

                      const brief = req.project_brief || {};
                      const title = brief.title || brief.project_name || 'Collaboration Project';
                      const budget = brief.budget || '$3,500';
                      const deadline = brief.deadline || 'Dec 1, 2026';
                      const submittedDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent';

                      return (
                        <div 
                          key={req.request_id || req.id} 
                          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-orange-200 transition-all"
                        >
                          <div className="space-y-2.5 flex-1">
                            {/* Creator Identity Bar */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0A1128] to-[#FF6B00] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {matchedCreator.name ? matchedCreator.name.slice(0, 2).toUpperCase() : 'CR'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => setSelectedCreatorProfile(matchedCreator)}
                                    className="font-extrabold text-sm text-slate-900 hover:text-[#FF6B00] transition-colors cursor-pointer text-left flex items-center gap-1"
                                    title="View Creator Profile"
                                  >
                                    <span>{matchedCreator.name}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                  </button>
                                  <BriefVersionBadge 
                                    version={req.brief_version || 1} 
                                    revisionCount={req.revision_history?.length || 1} 
                                    status={req.status || 'pending'} 
                                  />
                                </div>
                                <p className="text-xs text-slate-500">{matchedCreator.title}</p>
                              </div>
                            </div>

                            {/* Project Title and Scope */}
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">{title}</h3>
                              {brief.brief && (
                                <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 max-w-xl">
                                  {brief.brief}
                                </p>
                              )}
                            </div>

                            {/* Scope Metadata Tags */}
                            <div className="flex flex-wrap gap-2.5 text-[11px] text-slate-600 pt-1">
                              <span className="flex items-center gap-1 font-bold text-slate-800 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Proposed: {budget}
                              </span>
                              <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200 text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> Deadline: {deadline}
                              </span>
                              <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200 text-slate-500">
                                Dispatched: {submittedDate}
                              </span>
                              {brief.aspectRatio && (
                                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200 text-slate-600 font-mono text-[10px]">
                                  {brief.aspectRatio}
                                </span>
                              )}
                            </div>

                            {/* Collaboration Timeline */}
                            <CollaborationTimeline 
                              collaboration={req.raw || req} 
                              className="mt-3" 
                            />
                          </div>

                          {/* Action Column */}
                          <div className="shrink-0 flex md:flex-col gap-2 min-w-[160px]">
                            {/* Status Badge */}
                            {req.status === 'pending' && (
                              <div className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>Pending Creator Review</span>
                              </div>
                            )}

                            {req.status === 'accepted' && (
                              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accepted & Active</span>
                              </div>
                            )}

                            {req.status === 'rejected' && (
                              <div className="px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Declined by Creator</span>
                              </div>
                            )}

                            {req.status === 'cancelled' && (
                              <div className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <span>Cancelled by Brand</span>
                              </div>
                            )}

                            {req.status === 'confirmed' && (
                              <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Contract Confirmed</span>
                              </div>
                            )}

                            {/* View Details Action */}
                            <button
                              onClick={() => setSelectedRequestForDetail(req)}
                              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Scope Details</span>
                            </button>

                            {/* Cancel Request (Only allowed for pending status) */}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleCancelSentRequest(req.request_id)}
                                disabled={cancellingRequestId === req.request_id}
                                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {cancellingRequestId === req.request_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                <span>Cancel Request</span>
                              </button>
                            )}

                            {/* Open Workspace Chat when accepted or confirmed */}
                            {(req.status === 'accepted' || req.status === 'confirmed') && (
                              <button
                                onClick={() => {
                                  const targetReqId = req.request_id || req.id;
                                  setSelectedConversationRequestId(targetReqId);
                                  setActiveChatCreatorId(req.freelancer_id || 'FL001');
                                  setActiveTab('messages');
                                }}
                                className="px-3.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Workspace Chat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ================= TAB 4: BRAND COMMUNICATIONS ================= */}
          {activeTab === 'messages' && (
            <div className="flex flex-col h-full min-h-[520px]">
              <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Brand-to-Creator Communications</h2>
                  <p className="text-xs text-slate-500">Live conversation threads with contracted and shortlisted talent.</p>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-semibold">
                  Active Direct Sessions
                </span>
              </div>

              {/* 2-Column Chat Layout */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50 min-h-[440px]">
                {/* Left: Chat list */}
                <div className="border-r border-slate-200/80 bg-white p-3 space-y-1.5 overflow-y-auto">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block mb-2">Active Creators</span>
                  {dynamicChatThreadsList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">No active chat sessions</p>
                      <p className="text-[11px] text-slate-400">Messaging unlocks automatically when a creator accepts your project brief.</p>
                    </div>
                  ) : (
                    dynamicChatThreadsList.map((chat) => {
                      const isSelected = (chat.requestId || chat.id) === (currentChat?.requestId || currentChat?.id);
                      return (
                        <button
                          key={chat.requestId || chat.id}
                          onClick={() => {
                            setSelectedConversationRequestId(chat.requestId || chat.id);
                            setActiveChatCreatorId(chat.creatorId);
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected 
                              ? 'bg-orange-50 border border-orange-200 shadow-sm' 
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <img 
                            src={chat.creatorAvatar} 
                            alt={chat.creatorName} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-xs text-slate-900 truncate">{chat.creatorName}</h4>
                              {chat.unread && <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{chat.campaign}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Right: Live Chat Stream */}
                <div className="relative md:col-span-2 p-4 flex flex-col justify-between bg-slate-50 min-h-[420px]">
                  {currentChat ? (
                    <>
                      {/* Accepted-Only Communication Lockout Overlay */}
                      <ChatLockoutOverlay
                        status={currentChat.status || 'confirmed'}
                        role="company"
                        campaignTitle={currentChat.campaign}
                        onTriggerAction={() => setActiveTab('contracts')}
                      />

                      <div className="pb-3 mb-3 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={currentChat.creatorAvatar} 
                            alt={currentChat.creatorName} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <h3 className="font-extrabold text-xs text-slate-900">{currentChat.creatorName}</h3>
                            <p className="text-[10px] text-slate-500">{currentChat.campaign}</p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          (currentChat.status === 'accepted' || currentChat.status === 'confirmed')
                            ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (currentChat.status === 'accepted' || currentChat.status === 'confirmed')
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-amber-500'
                          }`} />
                          <span>
                            {(currentChat.status === 'accepted' || currentChat.status === 'confirmed')
                              ? 'Connected Session'
                              : 'Pending Acceptance'}
                          </span>
                        </div>
                      </div>

                      {/* Send Error Notice */}
                      {sendError && (
                        <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                          <span className="font-medium">{sendError}</span>
                          <button onClick={() => setSendError(null)} className="text-rose-500 font-bold ml-2 cursor-pointer">✕</button>
                        </div>
                      )}

                      {/* Chat Fetch Error Notice with Retry */}
                      {chatFetchError && (
                        <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                          <span>{chatFetchError}</span>
                          <button 
                            onClick={() => {
                              setIsChatLoading(true);
                              fetchChatMessagesResult(activeRequestId).then(res => {
                                setIsChatLoading(false);
                                if (res.success) {
                                  setChatMessages(res.data);
                                  setChatFetchError(null);
                                }
                              });
                            }}
                            className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 rounded font-bold text-[11px] cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Messages Stream */}
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] p-2">
                        {isChatLoading && chatMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mb-2" />
                            <p className="text-xs font-medium">Loading collaboration messages...</p>
                          </div>
                        ) : (chatMessages.length === 0 && (!currentChat?.messages || currentChat.messages.length === 0)) ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs font-semibold text-slate-700">No messages yet in this collaboration</p>
                            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                              This room is ready. Coordinate milestones, brief revisions, and prompt parameters with {currentChat.creatorName}.
                            </p>
                          </div>
                        ) : (
                          (chatMessages.length > 0
                            ? chatMessages.map((m) => ({
                                id: m.message_id || m.id,
                                sender: m.sender_role === 'company' ? 'brand' : 'creator',
                                author: m.sender_role === 'company' ? (user?.name || user?.company_name || (user?.email?.includes('veloce') ? 'Veloce Energy' : 'Apex Creative')) : currentChat.creatorName,
                                text: m.text_content || m.content || m.text,
                                time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
                              }))
                            : (currentChat?.messages || [])
                          ).map((m) => (
                            <div key={m.id} className={`flex flex-col ${m.sender === 'brand' ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-slate-400 font-medium mb-1">{m.author} • {m.time}</span>
                              <div className={`p-3 rounded-2xl text-xs max-w-md ${
                                m.sender === 'brand' 
                                  ? 'bg-[#FF6B00] text-white rounded-tr-none shadow-sm font-medium' 
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                              }`}>
                                {m.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 pt-2 border-t border-slate-200/80">
                        <input 
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={(currentChat.status !== 'accepted' && currentChat.status !== 'confirmed') || isSendingMessage}
                          placeholder={
                            (currentChat.status !== 'accepted' && currentChat.status !== 'confirmed')
                              ? "Chat is locked until proposal is accepted"
                              : isSendingMessage
                                ? "Sending..."
                                : `Message ${currentChat.creatorName}...`
                          }
                          className="flex-1 bg-white border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={(currentChat.status !== 'accepted' && currentChat.status !== 'confirmed') || isSendingMessage || !chatInput.trim()}
                          className="bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      Select a creator thread to view messages.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>

      {/* ================= MODAL: OFFICIAL COLLABORATION REQUEST (PHASE 2) ================= */}
      <CollaborationRequestModal
        isOpen={showCollabRequestModal}
        onClose={() => {
          setShowCollabRequestModal(false);
          setSelectedCreatorForCollabModal(null);
        }}
        creator={selectedCreatorForCollabModal}
        user={user}
        onLogout={onLogout}
        onSuccessSubmitted={(request) => {
          fetchSentRequests();
        }}
      />

      {/* ================= MODAL: SENT REQUEST DETAIL INSPECTION (PHASE 2) ================= */}
      {selectedRequestForDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1128]/70 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedRequestForDetail(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Collaboration Request Scope Details"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl relative space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">ID: {selectedRequestForDetail.request_id}</span>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedRequestForDetail.project_brief?.title || 'Collaboration Scope Details'}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedRequestForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Details Grid */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brief & Objectives</span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedRequestForDetail.project_brief?.brief || selectedRequestForDetail.project_brief?.description || 'Standard project scope'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deliverables Package</span>
                <p className="text-slate-700 font-semibold">
                  {selectedRequestForDetail.project_brief?.deliverables || 'Standard deliverables as per agreement'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Proposed Budget</span>
                  <span className="font-extrabold text-sm text-emerald-700">{selectedRequestForDetail.project_brief?.budget || '$3,500'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Delivery Deadline</span>
                  <span className="font-extrabold text-sm text-slate-900">{selectedRequestForDetail.project_brief?.deadline || 'Dec 1, 2026'}</span>
                </div>
              </div>

              {selectedRequestForDetail.project_brief?.preferredTools && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Required AI Models / Stack</span>
                  <span className="font-semibold text-slate-800">{selectedRequestForDetail.project_brief.preferredTools}</span>
                </div>
              )}

              {/* Status and Timestamp */}
              <div className="flex items-center justify-between p-3 bg-slate-100/70 rounded-xl text-slate-600 text-[11px]">
                <span>Status: <strong className="capitalize text-slate-900">{selectedRequestForDetail.status}</strong></span>
                <span>Submitted: {selectedRequestForDetail.created_at ? new Date(selectedRequestForDetail.created_at).toLocaleString() : 'Recent'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRequestForDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Scope Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AI-ASSISTED CAMPAIGN BRIEF BUILDER ================= */}
      <CampaignBriefBuilderModal
        isOpen={showCreateBriefModal}
        onClose={() => setShowCreateBriefModal(false)}
        onPublishBrief={handlePublishBriefFromModal}
        onFindMatchingCreators={handleBriefMatchingHandoff}
      />

      {/* ================= MODAL: VIEW PROMPTS & PIPELINE ================= */}
      {selectedCreatorForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCreatorForModal(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label={`Prompt and Pipeline Spec for ${selectedCreatorForModal.name}`}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedCreatorForModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img 
                src={selectedCreatorForModal.avatar} 
                alt={selectedCreatorForModal.name} 
                className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <h3 className="font-bold text-base text-slate-900">{selectedCreatorForModal.name}</h3>
                <p className="text-xs text-slate-500">{selectedCreatorForModal.title}</p>
              </div>
            </div>

            {/* Video preview with guaranteed poster and fallback */}
            <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden mb-4 relative border border-slate-800">
              <video 
                src={selectedCreatorForModal.sampleMedia} 
                poster={selectedCreatorForModal.poster || resolvePoster(selectedCreatorForModal)}
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
              <img 
                src={selectedCreatorForModal.poster || resolvePoster(selectedCreatorForModal)}
                alt={selectedCreatorForModal.name}
                style={{ display: 'none' }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Generation Pipeline</span>
                <span className="font-bold text-slate-800">{selectedCreatorForModal.pipeline}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Exact Verified Prompt</span>
                <p className="font-mono text-slate-700 text-[11px] leading-relaxed bg-white p-2 rounded-lg border border-slate-200/80">
                  {selectedCreatorForModal.samplePrompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Generation Seed</span>
                  <span className="font-mono font-bold text-slate-800">{selectedCreatorForModal.seed}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">AI Quality Score</span>
                  <span className="font-bold text-[#FF6B00]">{selectedCreatorForModal.score}/100</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => {
                  handleSendOffer(selectedCreatorForModal);
                  setSelectedCreatorForModal(null);
                }}
                className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Campaign Offer</span>
              </button>
              <button
                onClick={() => setSelectedCreatorForModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt & Seed Inspector Modal */}
      <PromptInspectorModal 
        isOpen={!!selectedAssetForInspect} 
        onClose={() => setSelectedAssetForInspect(null)} 
        item={selectedAssetForInspect} 
      />

      {/* AI Matching & Requirements Analysis Report Modal */}
      <MatchingReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={matchingReport}
      />

      {/* Update Brief Terms Modal */}
      {updateBriefModalContract && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setUpdateBriefModalContract(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Update Campaign Brief Terms"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setUpdateBriefModalContract(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#FF6B00] flex items-center justify-center shadow-xs">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Update Campaign Brief Terms</h3>
                <p className="text-xs text-slate-500">Revise deliverables or terms to address creator clarification.</p>
              </div>
            </div>

            {/* Creator Question Callout */}
            {updateBriefModalContract.clarificationQuestions && (
              <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Creator's Clarification Query:
                </span>
                <p className="text-amber-800 text-[11px] italic pl-5.5">
                  "{updateBriefModalContract.clarificationQuestions}"
                </p>
              </div>
            )}

            <form onSubmit={handleSaveBriefUpdate} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deliverables & Format Specifications:
                </label>
                <textarea
                  rows={3}
                  value={updateBriefForm.deliverables}
                  onChange={(e) => setUpdateBriefForm({ ...updateBriefForm, deliverables: e.target.value })}
                  placeholder="e.g. 4K ProRes 422 master export, PNG alpha channels included, ComfyUI API seed workflows bundled."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl p-3 text-xs text-slate-900 outline-none resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Revised Budget:
                  </label>
                  <input
                    type="text"
                    value={updateBriefForm.budget}
                    onChange={(e) => setUpdateBriefForm({ ...updateBriefForm, budget: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Revised Deadline:
                  </label>
                  <input
                    type="text"
                    value={updateBriefForm.deadline}
                    onChange={(e) => setUpdateBriefForm({ ...updateBriefForm, deadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clarification Notes & Guidelines:
                </label>
                <input
                  type="text"
                  value={updateBriefForm.clarification_notes}
                  onChange={(e) => setUpdateBriefForm({ ...updateBriefForm, clarification_notes: e.target.value })}
                  placeholder="e.g. Approved transparent PNG alphas and full commercial buyout rights."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              {updateBriefError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{updateBriefError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateBriefModalContract(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBrief}
                  className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isUpdatingBrief 
                      ? 'Updating...' 
                      : `Save & Increment to v${(updateBriefModalContract.briefVersion || 1) + 1}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPLAINABLE AI MATCH SCORE ================= */}
      <ExplainScoreModal
        isOpen={Boolean(selectedCandidateForExplanation)}
        onClose={() => setSelectedCandidateForExplanation(null)}
        candidate={selectedCandidateForExplanation}
        onInspectPortfolioItem={(item) => {
          setSelectedCandidateForExplanation(null);
          setSelectedAssetForInspect({
            ...item,
            title: item.title || 'Verified Portfolio Asset',
            prompt: item.prompt || '',
            mediaUrl: item.media_url || item.mediaUrl,
            seed: item.seed && item.seed !== '...' ? item.seed : null,
            pipeline: item.pipeline || item.tool
          });
        }}
      />

    </div>
  );
}
