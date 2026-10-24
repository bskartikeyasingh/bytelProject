import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  MessageSquare, 
  Briefcase, 
  Settings, 
  Bell, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Clock, 
  DollarSign, 
  Ratio, 
  Zap,
  Building,
  UserCheck,
  Plus,
  X,
  UploadCloud,
  Edit2,
  LogOut,
  ChevronRight,
  Award,
  Video,
  Loader2,
  Trash2,
  ExternalLink,
  AlertCircle,
  FolderPlus,
  Layers,
  TrendingUp,
  Tag
} from 'lucide-react';
import GenLancerLogo from '../auth/GenLancerLogo';
import { supabase, isSupabaseConfigured, authFetch } from '../../lib/supabase';
import { apiUrl } from '../../lib/apiConfig';
import { validateUrl } from '../../lib/urlValidator';
import { sendChatMessage, fetchChatMessages, fetchChatMessagesResult } from '../../lib/chatService';
import PromptInspectorModal from '../common/PromptInspectorModal';
import ChatLockoutOverlay from '../common/ChatLockoutOverlay';
import VerificationBadge, { VerifiedWorkflowBadge, CertifiedPipelineBadge, AICreatorScoreBadge } from '../common/VerificationBadge';
import ClarificationModal from '../common/ClarificationModal';
import BriefVersionBadge from '../common/BriefVersionBadge';
import CollaborationTimeline from '../common/CollaborationTimeline';
import { resolvePoster, isLikelyVideo, AI_MEDIA_PRESETS } from '../../lib/mediaAssets';

export default function CreatorDashboard({ user, onLogout, onSwitchToCompany }) {
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'requests' | 'messages' | 'work'
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState(94);
  const [auditNotification, setAuditNotification] = useState(null);
  const [selectedAssetForInspect, setSelectedAssetForInspect] = useState(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Upload Work Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Clarification Modal State
  const [clarifyModalReq, setClarifyModalReq] = useState(null);
  const [clarifyText, setClarifyText] = useState('');
  const [isSubmittingClarify, setIsSubmittingClarify] = useState(false);

  // Keyboard accessibility handler for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showUploadModal) setShowUploadModal(false);
        if (showSettingsModal) setShowSettingsModal(false);
        if (selectedAssetForInspect) setSelectedAssetForInspect(null);
        if (clarifyModalReq) setClarifyModalReq(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal, showSettingsModal, selectedAssetForInspect, clarifyModalReq]);

  // Creator Info State (Editable via Settings)
  const [creator, setCreator] = useState({
    name: "Alex Smith",
    title: "AI Film Director & Creative Technologist",
    currentCompany: "Nexus Synthetic Media Studio",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
  });

  const [editForm, setEditForm] = useState({ ...creator });

  const currentFreelancerId = user?.id || localStorage.getItem('genlancer_user_id') || 'c1';

  // Portfolio Items State
  const [portfolioItems, setPortfolioItems] = useState([
    {
      id: "p1",
      title: "Neon Monolith - Cyberpunk Commercial",
      description: "Atmospheric dystopian luxury beverage campaign render for international broadcast.",
      creator_role: "Lead Generative AI Director",
      skills_used: ["Prompt Engineering", "Anamorphic Cinematography", "Photorealistic Upscaling"],
      tools_used: ["Runway Gen-3 Alpha", "Midjourney v6", "Topaz 4K"],
      tool: "Runway Gen-3 Alpha",
      content_type: "Video",
      niche: "Cyberpunk / Commercial",
      media_url: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4",
      mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-41804-large.mp4",
      poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
      thumbnail_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
      project_url: "https://vimeo.com/76979871",
      project_outcome: "2.4M organic views; selected as Best AI Short 2026",
      aspect_ratio: "16:9",
      aspectRatio: "16:9",
      pipeline: "Midjourney v6 ➔ Runway Gen-3 ➔ Topaz 4K",
      prompt: "/imagine prompt: futuristic mega-city at night, neon reflections in rainwater, anamorphic cinematic 8k --ar 16:9",
      seed: "482019482",
      verified: true,
      verification_status: "verified",
      verification_scope: "workflow"
    },
    {
      id: "p2",
      title: "Biomechanical Android Concept",
      description: "High-precision neural interface study rendering subsurface scattering and copper wiring.",
      creator_role: "Generative Concept Artist",
      skills_used: ["ControlNet Guidance", "Depth Map Conditioning", "Blender Lighting"],
      tools_used: ["Flux.1 Dev", "ComfyUI", "Blender"],
      tool: "Flux.1 Dev + ComfyUI",
      content_type: "Video",
      niche: "Sci-Fi / Hardware Concept",
      media_url: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-glowing-futuristic-device-41805-large.mp4",
      mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-glowing-futuristic-device-41805-large.mp4",
      poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
      thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
      project_url: null,
      project_outcome: "Reduced 3D prototype iteration time by 75%",
      aspect_ratio: "1:1",
      aspectRatio: "1:1",
      pipeline: "Flux.1 ➔ ControlNet Depth ➔ Blender Compositor",
      prompt: "close-up portrait of android with exposed copper neural cables, volumetric amber lighting, macro photography",
      seed: "99102412",
      verified: true,
      verification_status: "verified",
      verification_scope: "pipeline"
    },
    {
      id: "p3",
      title: "Obsidian Spire Drone Sequence",
      description: "Hyper-speed cinematic drone run over synthetic obsidian monoliths with camera projections.",
      creator_role: "3D Synthetic Media Lead",
      skills_used: ["Camera Projections", "Blender Integration", "VFX Motion"],
      tools_used: ["Kling AI 1.5", "Blender", "Topaz 4K"],
      tool: "Kling AI 1.5 + Blender",
      content_type: "Video",
      niche: "Sci-Fi / Drone Animatics",
      media_url: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-flying-car-in-a-cyberpunk-city-41807-large.mp4",
      mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-flying-car-in-a-cyberpunk-city-41807-large.mp4",
      poster: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80",
      thumbnail_url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80",
      project_url: null,
      project_outcome: "Selected for Siggraph 2026 generative showcase",
      aspect_ratio: "16:9",
      aspectRatio: "16:9",
      pipeline: "Blender ➔ Kling AI 1.5 ➔ Topaz 4K",
      prompt: "cinematic drone follow shot of high-tech flying vehicle gliding over glowing obsidian skyscrapers",
      seed: "772183921",
      verified: true,
      verification_status: "verified",
      verification_scope: "workflow"
    }
  ]);

  // Modal & Form State for Portfolio Items
  const [editingItem, setEditingItem] = useState(null);
  const [formError, setFormError] = useState(null);
  const [mediaUrlStatus, setMediaUrlStatus] = useState(null);
  const [projectUrlStatus, setProjectUrlStatus] = useState(null);
  const [isSavingWork, setIsSavingWork] = useState(false);

  const initialWorkForm = {
    title: '',
    description: '',
    creator_role: 'Generative AI Director',
    skills_used: 'Prompt Engineering, Upscaling',
    tools_used: 'Runway Gen-3 Alpha',
    content_type: 'Video',
    niche: 'Commercial / Advertising',
    media_url: '',
    project_url: '',
    project_outcome: '',
    pipeline: '',
    aspect_ratio: '16:9',
    prompt: '',
    seed: ''
  };

  const [workForm, setWorkForm] = useState(initialWorkForm);
  // Backwards compatibility for existing references
  const newWork = workForm;
  const setNewWork = setWorkForm;


  // Default mock requests for offline resilience
  const DEFAULT_REQUESTS = [
    {
      id: "req-1",
      request_id: "req-1",
      company: "Volt Energy Co.",
      campaignTitle: "Cyberpunk Beverage Ad Campaign",
      budget: "$4,500",
      deadline: "Nov 15, 2026",
      aspectRatio: "9:16 (TikTok & Reels)",
      style: "High-octane cyberpunk with hyper-realistic liquid simulations",
      status: "pending"
    },
    {
      id: "req-2",
      request_id: "req-2",
      company: "Aura Skincare",
      campaignTitle: "Organic Botanical AI Render Series",
      budget: "$2,200",
      deadline: "Nov 22, 2026",
      aspectRatio: "4:5 (Instagram)",
      style: "Soft luxury lighting, pastel botanicals, minimalist studio",
      status: "pending"
    }
  ];

  // Incoming Requests from Brands (Live Supabase State)
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Fetch Live Briefs from backend /api/collaboration with JWT auth
  useEffect(() => {
    let isMounted = true;

    async function fetchRequests() {
      setLoadingRequests(true);
      try {
        // Query backend authoritative /api/collaboration endpoint with session token
        const res = await authFetch(apiUrl('/api/collaboration'));
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.success && Array.isArray(apiData.requests) && isMounted) {
            const formatted = apiData.requests.map((row, idx) => {
              const brief = row.project_brief || {};
              const campaignTitle = 
                brief.title || 
                brief.project_name || 
                `Campaign Brief #${row.request_id ? row.request_id.slice(0, 8) : idx + 1}`;

              const company = brief.company_name || (row.company_id === 'COMP001' ? 'Apex Creative Agency' : (row.company_id || 'Brand Partner'));
              const budget = brief.budget || (typeof brief.budgetTier === 'string' ? brief.budgetTier : '$4,500');
              const deadline = brief.deadline || 'Dec 1, 2026';
              const deliverables = brief.deliverables || 'Standard deliverables';
              const aspectRatio = brief.aspectRatio || brief.targetAspect || '16:9';
              const style = brief.style || 'Cinematic Generative AI Production';

              return {
                id: row.id || row.request_id || `req-${idx}`,
                request_id: row.request_id,
                company,
                campaignTitle,
                budget,
                deadline,
                deliverables,
                aspectRatio,
                style,
                status: row.status || 'pending',
                brief_version: row.brief_version || 1,
                clarification_history: row.clarification_history || [],
                project_brief: brief,
                raw: row
              };
            });

            setIncomingRequests(formatted);
            setLoadingRequests(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/collaboration error, attempting Supabase direct fallback:', apiErr.message);
      }

      // Fallback to Supabase direct query if backend is unreachable
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('collaboration_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && isMounted) {
            const targeted = data.filter(r => !r.freelancer_id || r.freelancer_id === 'FL001' || r.freelancer_id === user?.id || r.freelancer_id === 'c1');
            const list = targeted.length > 0 ? targeted : data;
            const formatted = list.map((row, idx) => {
              const brief = row.project_brief || {};
              return {
                id: row.id || row.request_id || `req-${idx}`,
                request_id: row.request_id,
                company: brief.company_name || 'Apex Creative Agency',
                campaignTitle: brief.title || `Campaign #${idx + 1}`,
                budget: brief.budget || '$4,500',
                deadline: brief.deadline || 'Dec 1, 2026',
                deliverables: brief.deliverables || 'Standard deliverables',
                aspectRatio: brief.aspectRatio || '16:9',
                style: brief.style || 'Cinematic AI Production',
                status: row.status || 'pending',
                brief_version: row.brief_version || 1,
                clarification_history: row.clarification_history || [],
                project_brief: brief,
                raw: row
              };
            });
            setIncomingRequests(formatted);
          }
        }
      } catch (err) {
        console.warn('Supabase fallback error:', err.message);
      } finally {
        if (isMounted) setLoadingRequests(false);
      }
    }

    // Initial fetch on mount
    fetchRequests();

    // 4-second polling interval for real-time live demo updates
    const pollInterval = setInterval(() => {
      fetchRequests();
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user]);

  // Companies with ACCEPTED Briefs (Only these show in Communications)
  const [acceptedCompanies, setAcceptedCompanies] = useState([
    {
      id: "comp-1",
      name: "Volt Energy Co.",
      campaign: "Cyberpunk Beverage Ad",
      avatar: "⚡",
      status: "confirmed",
      unread: true,
      messages: [
        { id: 1, sender: 'brand', author: 'Marcus (Volt Energy)', text: 'Hi Alex! We reviewed your Runway Gen-3 reel. Can you deliver the 16:9 cut by Friday?', time: '10:45 AM' },
        { id: 2, sender: 'creator', author: 'Alex Smith', text: 'Hey Marcus! Yes, the prompt pipeline is cached. First delivery in 48 hours.', time: '11:12 AM' }
      ]
    },
    {
      id: "comp-2",
      name: "Nike Digital",
      campaign: "3D Generative Product Animation",
      avatar: "✔️",
      status: "accepted",
      unread: false,
      messages: [
        { id: 1, sender: 'brand', author: 'Elena (Nike)', text: 'The Blender + Topaz renders look exceptional. Final approval granted!', time: 'Yesterday' },
        { id: 2, sender: 'creator', author: 'Alex Smith', text: 'Thanks Elena! Full commercial master files uploaded to the drive.', time: 'Yesterday' }
      ]
    },
    {
      id: "comp-3",
      name: "Prada Future",
      campaign: "Hyper-Real Luxury Commercial",
      avatar: "💎",
      status: "pending",
      unread: false,
      messages: [
        { id: 1, sender: 'brand', author: 'Prada Creative', text: 'We have dispatched our creative brief and escrow deposit for your review.', time: 'Yesterday' }
      ]
    }
  ]);

  const [activeCompanyId, setActiveCompanyId] = useState("comp-1");
  const [chatInput, setChatInput] = useState('');
  const [actionError, setActionError] = useState(null);
  const [activeActionReqId, setActiveActionReqId] = useState(null);
  const [isActionPending, setIsActionPending] = useState(false);

  // Handle Accept Brief
  const handleAcceptBrief = async (req) => {
    setActionError(null);
    setActiveActionReqId(req.id || req.request_id);
    setIsActionPending(true);

    try {
      if (req.request_id) {
        // Backend API with Bearer token
        const res = await authFetch(apiUrl(`/api/collaboration/${req.request_id}/accept`), {
          method: 'POST',
          body: JSON.stringify({ actor: 'freelancer' })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to accept brief (HTTP ${res.status})`);
        }

        const data = await res.json();
        const updatedReq = data.request || { ...req, status: 'accepted' };

        setIncomingRequests(prev => prev.map(r => 
          (r.id === req.id || r.request_id === req.request_id) ? { ...r, ...updatedReq, status: 'accepted' } : r
        ));
      } else {
        setIncomingRequests(prev => prev.map(r => (r.id === req.id) ? { ...r, status: 'accepted' } : r));
      }

      const compName = req.company || req.name;
      // Check if company already in accepted
      if (!acceptedCompanies.some(c => c.name === compName || c.id === req.id)) {
        const newAccepted = {
          id: req.id || `comp-${Date.now()}`,
          name: compName,
          campaign: req.campaignTitle || req.campaign,
          avatar: "🏢",
          status: "accepted",
          unread: false,
          messages: [
            { id: 1, sender: 'brand', author: compName, text: `Thank you for accepting the brief for ${req.campaignTitle || req.campaign}! Let's finalize the deliverables here.`, time: 'Just now' }
          ]
        };
        setAcceptedCompanies(prev => [newAccepted, ...prev]);
        setActiveCompanyId(newAccepted.id);
      } else {
        setAcceptedCompanies(prev => prev.map(c => 
          (c.name === compName || c.id === req.id) ? { ...c, status: 'accepted' } : c
        ));
      }

      setActiveTab('messages');
    } catch (err) {
      console.error('Could not accept brief:', err);
      setActionError(err.message || 'Failed to accept brief');
    } finally {
      setIsActionPending(false);
    }
  };

  // Handle Decline / Reject Brief
  const handleRejectBrief = async (req) => {
    const reason = window.prompt('Please provide a reason for declining this brief (optional):', 'Capacity constraints');
    if (reason === null) return; // cancelled prompt

    setActionError(null);
    setActiveActionReqId(req.id || req.request_id);
    setIsActionPending(true);

    try {
      if (req.request_id) {
        const res = await authFetch(apiUrl(`/api/collaboration/${req.request_id}/reject`), {
          method: 'POST',
          body: JSON.stringify({ actor: 'freelancer', reason: reason || 'Capacity constraints' })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to decline brief (HTTP ${res.status})`);
        }

        const data = await res.json();
        const updatedReq = data.request || { ...req, status: 'rejected' };

        setIncomingRequests(prev => prev.map(r => 
          (r.id === req.id || r.request_id === req.request_id) ? { ...r, ...updatedReq, status: 'rejected' } : r
        ));
      } else {
        setIncomingRequests(prev => prev.map(r => (r.id === req.id) ? { ...r, status: 'rejected' } : r));
      }
    } catch (err) {
      console.error('Failed to decline brief:', err);
      setActionError(err.message || 'Failed to decline brief');
    } finally {
      setIsActionPending(false);
    }
  };

  // Submit Clarification Question
  const handleSubmitClarification = async (questions) => {
    if (!questions || !clarifyModalReq) return;
    const currentFreelancerId = user?.id || 'c1';
    setActionError(null);
    setActiveActionReqId(clarifyModalReq.id || clarifyModalReq.request_id);

    try {
      const reqId = clarifyModalReq.request_id || clarifyModalReq.id;
      if (reqId) {
        const res = await authFetch(apiUrl(`/api/collaboration/${reqId}/clarify`), {
          method: 'POST',
          body: JSON.stringify({ 
            questions: questions.trim(), 
            message: questions.trim(), 
            actor: 'freelancer',
            actor_id: currentFreelancerId 
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to submit clarification (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.request) {
          setIncomingRequests(prev => prev.map(r => 
            (r.id === clarifyModalReq.id || r.request_id === clarifyModalReq.request_id) ? { ...r, ...data.request } : r
          ));
          setClarifyModalReq(null);
          return;
        }
      }

      setIncomingRequests(prev => prev.map(r => {
        if (r.id === clarifyModalReq.id || r.request_id === clarifyModalReq.request_id) {
          const history = Array.isArray(r.clarification_history) ? [...r.clarification_history] : [];
          history.push({
            sender: 'freelancer',
            content: questions.trim(),
            timestamp: new Date().toISOString()
          });
          return {
            ...r,
            status: 'clarification_requested',
            clarification_history: history
          };
        }
        return r;
      }));

      setClarifyModalReq(null);
    } catch (err) {
      console.error('Failed to submit clarification:', err);
      setActionError(err.message || 'Failed to submit clarification question');
      throw err;
    }
  };

  // Handle Mutual Confirmation
  const handleConfirmBrief = async (req) => {
    setActionError(null);
    setActiveActionReqId(req.id || req.request_id);
    setIsActionPending(true);

    try {
      if (req.request_id) {
        const res = await authFetch(apiUrl(`/api/collaboration/${req.request_id}/confirm`), {
          method: 'POST',
          body: JSON.stringify({ actor: 'freelancer', brief_version: req.brief_version || 1 })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to confirm brief terms (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.request) {
          setIncomingRequests(prev => prev.map(r => (r.id === req.id || r.request_id === req.request_id) ? { ...r, ...data.request } : r));
          return;
        }
      }

      setIncomingRequests(prev => prev.map(r => (r.id === req.id || r.request_id === req.request_id) ? { ...r, status: 'confirmed' } : r));
    } catch (err) {
      console.error('Failed to confirm brief terms:', err);
      setActionError(err.message || 'Failed to confirm brief terms');
    } finally {
      setIsActionPending(false);
    }
  };

  // Handle Settings Save
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setCreator({ ...editForm });
    setShowSettingsModal(false);
  };

  // Load portfolio from API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPortfolio() {
      try {
        const res = await authFetch(apiUrl(`/api/creators/${currentFreelancerId}/portfolio`));
        if (res.ok) {
          const data = await res.json();
          if (data.portfolio_items && data.portfolio_items.length > 0 && isMounted) {
            setPortfolioItems(data.portfolio_items.map(it => ({
              ...it,
              mediaUrl: it.media_url || it.mediaUrl,
              aspectRatio: it.aspect_ratio || it.aspectRatio,
              tool: (it.tools_used && it.tools_used[0]) || it.tool || 'Runway Gen-3 Alpha'
            })));
          }
        }
      } catch (err) {
        console.warn('Could not load portfolio from server:', err.message);
      }
    }
    loadPortfolio();
    return () => { isMounted = false; };
  }, [currentFreelancerId]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setWorkForm({ ...initialWorkForm });
    setFormError(null);
    setMediaUrlStatus(null);
    setProjectUrlStatus(null);
    setShowUploadModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setWorkForm({
      title: item.title || '',
      description: item.description || '',
      creator_role: item.creator_role || 'Generative AI Director',
      skills_used: Array.isArray(item.skills_used) ? item.skills_used.join(', ') : (item.skills_used || ''),
      tools_used: Array.isArray(item.tools_used) ? item.tools_used.join(', ') : (item.tools_used || item.tool || ''),
      content_type: item.content_type || 'Video',
      niche: item.niche || 'Commercial / Advertising',
      media_url: item.media_url || item.mediaUrl || '',
      project_url: item.project_url || '',
      project_outcome: item.project_outcome || '',
      pipeline: item.pipeline || '',
      aspect_ratio: item.aspect_ratio || item.aspectRatio || '16:9',
      prompt: item.prompt || '',
      seed: item.seed || ''
    });
    setFormError(null);
    setMediaUrlStatus(null);
    setProjectUrlStatus(null);
    setShowUploadModal(true);
  };

  const handleMediaUrlChange = (val) => {
    setWorkForm(prev => ({ ...prev, media_url: val }));
    if (!val.trim()) {
      setMediaUrlStatus(null);
      return;
    }
    const check = validateUrl(val, { requireMedia: true });
    setMediaUrlStatus(check);
  };

  const handleProjectUrlChange = (val) => {
    setWorkForm(prev => ({ ...prev, project_url: val }));
    if (!val.trim()) {
      setProjectUrlStatus(null);
      return;
    }
    const check = validateUrl(val, { allowEmpty: true });
    setProjectUrlStatus(check);
  };

  // Handle Save (Add or Edit) Portfolio Entry
  const handleSaveWork = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!workForm.title || workForm.title.trim().length < 3) {
      setFormError('Project title is required and must be at least 3 characters.');
      return;
    }

    if (!workForm.prompt || workForm.prompt.trim().length === 0) {
      setFormError('Generation prompt is required to establish AI workflow evidence.');
      return;
    }

    // Strict URL validation
    const mediaCheck = validateUrl(workForm.media_url, { requireMedia: true });
    if (!mediaCheck.valid) {
      setFormError(`Media URL invalid: ${mediaCheck.error}`);
      return;
    }

    let sanitizedProjUrl = null;
    if (workForm.project_url && workForm.project_url.trim()) {
      const projCheck = validateUrl(workForm.project_url, { allowEmpty: true });
      if (!projCheck.valid) {
        setFormError(`Project URL invalid: ${projCheck.error}`);
        return;
      }
      sanitizedProjUrl = projCheck.sanitized;
    }

    setIsSavingWork(true);

    const skillsArray = workForm.skills_used
      ? (typeof workForm.skills_used === 'string' 
          ? workForm.skills_used.split(',').map(s => s.trim()).filter(Boolean)
          : workForm.skills_used)
      : ['Prompt Engineering'];

    const toolsArray = workForm.tools_used
      ? (typeof workForm.tools_used === 'string'
          ? workForm.tools_used.split(',').map(t => t.trim()).filter(Boolean)
          : workForm.tools_used)
      : ['Runway Gen-3 Alpha'];

    const payload = {
      title: workForm.title.trim(),
      description: workForm.description.trim(),
      creator_role: workForm.creator_role.trim(),
      skills_used: skillsArray,
      tools_used: toolsArray,
      content_type: workForm.content_type,
      niche: workForm.niche,
      media_url: mediaCheck.sanitized,
      project_url: sanitizedProjUrl,
      project_outcome: workForm.project_outcome ? workForm.project_outcome.trim() : null,
      pipeline: workForm.pipeline || `${toolsArray[0] || 'Gen AI'} ➔ Master`,
      aspect_ratio: workForm.aspect_ratio,
      prompt: workForm.prompt.trim(),
      seed: workForm.seed ? workForm.seed.trim() : Math.floor(100000000 + Math.random() * 900000000).toString()
    };

    try {
      if (editingItem) {
        // PUT update
        const res = await authFetch(apiUrl(`/api/creators/${currentFreelancerId}/portfolio/${editingItem.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const updated = data.item || { ...editingItem, ...payload, id: editingItem.id };
          setPortfolioItems(prev => prev.map(it => it.id === editingItem.id ? { ...updated, mediaUrl: updated.media_url, aspectRatio: updated.aspect_ratio } : it));
        } else {
          // Fallback update in state
          setPortfolioItems(prev => prev.map(it => it.id === editingItem.id ? { 
            ...it, 
            ...payload, 
            mediaUrl: payload.media_url, 
            aspectRatio: payload.aspect_ratio,
            verified: false,
            verification_status: 'not_verified',
            verification_scope: null
          } : it));
        }
      } else {
        // POST add new
        const res = await authFetch(apiUrl(`/api/creators/${currentFreelancerId}/portfolio`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const newItem = data.item || { ...payload, id: `pf-${Date.now()}`, verified: false, verification_status: 'not_verified' };
          setPortfolioItems(prev => [{ ...newItem, mediaUrl: newItem.media_url, aspectRatio: newItem.aspect_ratio }, ...prev]);
        } else {
          // Fallback state add
          const fallbackNew = {
            id: `p-${Date.now()}`,
            ...payload,
            mediaUrl: payload.media_url,
            aspectRatio: payload.aspect_ratio,
            tool: toolsArray[0] || 'Runway Gen-3 Alpha',
            verified: false,
            verification_status: 'not_verified',
            verification_scope: null
          };
          setPortfolioItems(prev => [fallbackNew, ...prev]);
        }
      }

      setShowUploadModal(false);
      setAuditNotification({
        title: editingItem ? "Portfolio Project Updated" : "New Portfolio Project Added",
        score: "Evidence Saved",
        details: ["Metadata recorded", "URL validated", "Status: Not Verified (Awaiting Audit Review)"]
      });
      setTimeout(() => setAuditNotification(null), 5000);
    } catch (err) {
      setFormError(`Failed to save project: ${err.message}`);
    } finally {
      setIsSavingWork(false);
    }
  };

  const handleDeleteWork = async (itemId) => {
    if (!window.confirm("Are you sure you want to remove this portfolio project evidence?")) {
      return;
    }

    try {
      await authFetch(apiUrl(`/api/creators/${currentFreelancerId}/portfolio/${itemId}`), {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Delete API call failed:', err.message);
    }

    setPortfolioItems(prev => prev.filter(it => it.id !== itemId));
    setAuditNotification({
      title: "Portfolio Project Removed",
      score: "Updated",
      details: ["Project evidence deleted from creator profile"]
    });
    setTimeout(() => setAuditNotification(null), 4000);
  };

  const handleSubmitForVerification = async (itemId) => {
    try {
      await authFetch(apiUrl(`/api/creators/${currentFreelancerId}/portfolio/${itemId}/submit-review`), {
        method: 'POST'
      });
    } catch (err) {
      console.warn('Submit review API call failed:', err.message);
    }

    setPortfolioItems(prev => prev.map(it => 
      it.id === itemId 
        ? { ...it, verification_status: 'pending_review', verified: false } 
        : it
    ));

    setAuditNotification({
      title: "Submitted for Verification Review!",
      score: "Pending Audit",
      details: ["Generation reproducibility check", "Pipeline seed audit in progress"]
    });
    setTimeout(() => setAuditNotification(null), 6000);
  };

  const handleAddWork = handleSaveWork;


  // Run AI Portfolio Audit
  const runAIAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditScore(98);
      setAuditNotification({
        title: "AI Portfolio Audit Completed!",
        score: "98/100",
        details: [
          "Prompt Complexity: 99/100",
          "Model Pipeline Diversity: 97/100",
          "Commercial Fidelity: 98/100"
        ]
      });
      setTimeout(() => setAuditNotification(null), 6000);
    }, 1000);
  };

  const activeCompany = acceptedCompanies.find(c => c.id === activeCompanyId) || acceptedCompanies[0];

  // Active conversation requestId for Supabase sync
  const activeRequestId = activeCompany?.id === 'comp-1'
    ? 'REQ-DEMO-001'
    : activeCompany?.id === 'comp-2'
      ? 'REQ-DEMO-002'
      : (activeCompany?.requestId || `REQ-${activeCompany?.id || 'DEMO'}`);

  // Live Supabase Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatFetchError, setChatFetchError] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Fetch live chat messages from Supabase or server API with polling
  useEffect(() => {
    let isMounted = true;

    async function loadLiveMessages(isFirst = false) {
      if (!activeRequestId) return;
      if (isFirst) setIsChatLoading(true);
      const res = await fetchChatMessagesResult(activeRequestId);
      if (isMounted) {
        if (res.success) {
          setChatMessages(res.data);
          setChatFetchError(null);
        } else if (isFirst) {
          setChatFetchError(res.error || 'Failed to load messages');
        }
        if (isFirst) setIsChatLoading(false);
      }
    }

    loadLiveMessages(true);

    // 2-second interval live polling
    const pollInterval = setInterval(() => {
      loadLiveMessages(false);
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [activeRequestId]);

  // Handle Send Chat (Sends to Supabase public.messages / backend proxy)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || isSendingMessage) return;

    setSendError(null);
    setIsSendingMessage(true);

    // Optimistically prepare message
    const senderUid = user?.id || localStorage.getItem('genlancer_user_id') || 'FL001';
    const result = await sendChatMessage(activeRequestId, senderUid, 'freelancer', text);
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

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row relative overflow-x-hidden">
      {/* Background dot grid pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-full md:w-72 lg:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto z-20">
          <div>
            {/* Logo */}
            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <GenLancerLogo className="w-9 h-9" textColor="text-slate-900" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B00]">
                Creator v1.0
              </span>
            </div>

            {/* Profile Card */}
            <div className="text-center pb-6 border-b border-slate-100 relative">
              <div className="relative inline-block mx-auto mb-3">
                <img 
                  src={creator.avatar} 
                  alt={creator.name} 
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#FF6B00] shadow-md p-0.5 bg-white"
                />
                <button 
                  onClick={() => { setEditForm({ ...creator }); setShowSettingsModal(true); }}
                  className="absolute bottom-0 right-0 bg-slate-900 hover:bg-[#FF6B00] text-white p-1.5 rounded-full shadow transition-colors cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {creator.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{creator.title}</p>

              {/* Verified Trust Badges */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <VerificationBadge type="workflow" size="sm" />
                <VerificationBadge type="score" score={auditScore || 96} size="sm" />
                <VerificationBadge type="certified_pipeline" size="sm" />
              </div>

              {/* Status Pill */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-medium shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Open for Contracts</span>
              </div>

              {/* Current Company Affiliation */}
              <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-600 bg-orange-50/70 py-1.5 px-2 rounded-lg border border-orange-100">
                <Building className="w-3 h-3 text-[#FF6B00]" />
                <span className="truncate font-medium">{creator.currentCompany}</span>
              </div>

              {/* Utility Icons */}
              <div className="flex items-center justify-center gap-4 mt-4 text-slate-400">
                <button 
                  onClick={() => { setEditForm({ ...creator }); setShowSettingsModal(true); }}
                  title="Profile & Account Settings" 
                  className="hover:text-slate-700 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveTab('requests')}
                  title="Notifications" 
                  className="relative hover:text-slate-700 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF6B00] rounded-full" />
                </button>
                <button 
                  onClick={() => alert("GenLancer Creator Hub v1.4 Documentation")}
                  title="Help & Docs" 
                  className="hover:text-slate-700 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="mt-6 space-y-1.5">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'portfolio' ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4" />
                  <span>AI Portfolio</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'portfolio' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {portfolioItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'requests' ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Brand Requests</span>
                </div>
                {incomingRequests.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-bold">
                    {incomingRequests.length} New
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'messages' ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Communication</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  {acceptedCompanies.length} Active
                </span>
              </button>

              <button
                onClick={() => setActiveTab('work')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'work' ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Work History & Studio</span>
              </button>
            </nav>
          </div>

          {/* Footer Navigation & Logout */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            {onSwitchToCompany && (
              <button
                onClick={onSwitchToCompany}
                className="w-full text-center text-xs text-[#FF6B00] hover:text-[#E05E00] bg-orange-50 hover:bg-orange-100 py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 border border-orange-200/80 shadow-xs"
              >
                <span>Switch to Brand Hub</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF6B00]" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-full text-center text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer py-1.5 flex items-center justify-center gap-1.5 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of GenLancer</span>
            </button>
          </div>
        </aside>

        {/* ================= RIGHT MAIN PANEL ================= */}
        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 2xl:p-10 flex flex-col justify-between z-10">

          {/* Responsive Mobile / Tablet Navigation Strip (< md) */}
          <div className="md:hidden flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-2xl p-1.5 mb-6 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'portfolio' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Portfolio</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === 'requests' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="text-[10px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'messages' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
            </button>

            <button
              onClick={() => setActiveTab('work')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'work' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>
          </div>

          {/* TAB 1: AI PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div>
              {/* Audit Success Banner */}
              {auditNotification && (
                <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-slate-900 shadow-sm animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{auditNotification.title}</h4>
                      <p className="text-xs text-slate-600">{auditNotification.details.join(' • ')}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white rounded-xl border border-orange-200 font-extrabold text-[#FF6B00] text-sm self-start sm:self-auto">
                    Score: {auditNotification.score}
                  </div>
                </div>
              )}

              {/* Header with AI Audit Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Evidence-Based Portfolio & Verification
                    </h1>
                    {creator.is_demo ? (
                      <VerificationBadge status="demo_unverified" size="sm" />
                    ) : creator.verified ? (
                      <VerificationBadge status="verified" scope={creator.verification_scope || 'workflow'} size="sm" />
                    ) : (
                      <VerificationBadge status={creator.verification_status || 'not_verified'} size="sm" />
                    )}
                    <VerificationBadge type="score" score={auditScore || 96} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Upload generations with verified prompts, tools, seeds, and outcomes to prove reproducible workflows to hiring brands.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Add Project</span>
                  </button>

                  <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 via-white to-orange-50 p-2 px-3.5 rounded-2xl border border-orange-200">
                    <AICreatorScoreBadge score={auditScore} />
                    <button
                      onClick={runAIAudit}
                      disabled={isAuditing}
                      className="flex items-center gap-1.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                      <span>{isAuditing ? 'Auditing...' : 'Run AI Audit'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Statistics Cards (Real Creator Data) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Portfolio Works</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">{portfolioItems.length}</span>
                    <span className="text-[11px] text-slate-500 font-medium">projects</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Verification Score</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-[#FF6B00]">{auditScore || 96}</span>
                    <span className="text-[11px] text-[#FF6B00]/80 font-bold">/100</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Connected Brands</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600">{acceptedCompanies.length}</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">active</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:border-orange-200 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Incoming Offers</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">{incomingRequests.length}</span>
                    <span className="text-[11px] text-slate-500 font-medium">briefs</span>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              {portfolioItems.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00] mx-auto mb-4 shadow-xs">
                    <FolderPlus className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Portfolio Projects Added Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                    Upload your first evidence-based generative AI project with prompt, model tools, pipeline, and media URL to prove your capabilities to brands.
                  </p>
                  <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Project</span>
                  </button>
                </div>
              ) : (
                /* Portfolio Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {portfolioItems.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden hover:border-orange-300 transition-all shadow-sm flex flex-col justify-between">
                      {/* Media Preview with Guaranteed Poster & Fallback */}
                      <div className="aspect-video bg-slate-950 relative group overflow-hidden flex items-center justify-center">
                        {item.mediaUrl && isLikelyVideo(item.mediaUrl) ? (
                          <video 
                            src={item.mediaUrl} 
                            poster={item.poster || resolvePoster(item, item.tool)}
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover transition-opacity duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fb = e.currentTarget.nextElementSibling;
                              if (fb) fb.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <img 
                          src={item.poster || item.mediaUrl || resolvePoster(item, item.tool)} 
                          alt={item.title} 
                          style={{ display: (item.mediaUrl && isLikelyVideo(item.mediaUrl)) ? 'none' : 'block' }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = resolvePoster(item, item.tool);
                          }}
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-[#FF6B00]" />
                            <span>{item.tool || (Array.isArray(item.tools_used) ? item.tools_used[0] : 'Generative AI')}</span>
                          </div>
                          {item.content_type && (
                            <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-medium text-slate-300">
                              {item.content_type}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap">
                          <VerificationBadge 
                            status={item.verification_status || (item.verified ? 'verified' : 'not_verified')}
                            scope={item.verification_scope || 'workflow'}
                            size="sm"
                            className="backdrop-blur-md shadow-md"
                          />
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                              {item.creator_role && (
                                <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-orange-200/60">
                                  Role: {item.creator_role}
                                </span>
                              )}
                            </div>
                            {item.niche && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
                                {item.niche}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 mt-1 mb-2.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {item.project_outcome && (
                            <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span><strong>Measurable Result:</strong> {item.project_outcome}</span>
                            </div>
                          )}

                          {/* Skills & Tools Tags */}
                          <div className="mb-2.5 space-y-1.5">
                            {item.skills_used && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Skills:</span>
                                {(Array.isArray(item.skills_used) ? item.skills_used : String(item.skills_used).split(',')).map((sk, idx) => (
                                  <span key={idx} className="text-[10px] font-medium bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                                    {sk.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.tools_used && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tools:</span>
                                {(Array.isArray(item.tools_used) ? item.tools_used : String(item.tools_used).split(',')).map((tl, idx) => (
                                  <span key={idx} className="text-[10px] font-medium bg-orange-50 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded">
                                    {tl.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Prompt Box */}
                          <p className="text-[11px] font-mono text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/70 mb-3 line-clamp-2 leading-relaxed">
                            <span className="text-[#FF6B00] font-bold">Prompt: </span>
                            {item.prompt}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-200/60 pt-3">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Pipeline:</span>
                            <span className="font-semibold text-slate-800 line-clamp-1">{item.pipeline || 'Custom Workflow'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Seed & Ratio:</span>
                            <span className="font-mono text-slate-700">{item.seed || 'N/A'} | {item.aspectRatio || item.aspect_ratio || '16:9'}</span>
                          </div>
                        </div>

                        {/* Card Actions & Verification State */}
                        <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAssetForInspect(item)}
                              className="text-xs text-[#FF6B00] flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                            >
                              🔍 Inspect Prompt
                            </button>
                            {item.project_url && (
                              <a
                                href={item.project_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold hover:underline"
                                title="Open verified project link"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Project Link</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {(!item.verification_status || item.verification_status === 'not_verified') && !item.verified && (
                              <button
                                onClick={() => handleSubmitForVerification(item.id)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-[#FF6B00] border border-orange-200 transition-all cursor-pointer flex items-center gap-1"
                                title="Submit this project to peer review to earn a Verified Workflow badge"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Submit for Audit</span>
                              </button>
                            )}
                            {item.verification_status === 'pending_review' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>Audit In Progress</span>
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-all cursor-pointer"
                              title="Edit project details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWork(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete project evidence"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: BRAND REQUESTS */}
          {activeTab === 'requests' && (
            <div>
              <div className="pb-6 mb-6 border-b border-slate-100">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Incoming Brand Briefs
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Accept briefs to start live communication and contract milestones with companies.
                </p>
              </div>

              {loadingRequests && incomingRequests.length === 0 ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-xs">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-orange-100 rounded-full w-28" />
                          <div className="h-5 bg-slate-100 rounded-full w-24" />
                        </div>
                        <div className="h-5 bg-slate-200 rounded-md w-3/4" />
                        <div className="h-3.5 bg-slate-100 rounded-md w-full" />
                        <div className="h-3.5 bg-slate-100 rounded-md w-2/3" />
                        <div className="h-8 bg-slate-100 rounded-xl w-48" />
                      </div>
                      <div className="flex md:flex-col gap-2">
                        <div className="h-9 bg-slate-200 rounded-xl w-24" />
                        <div className="h-9 bg-slate-100 rounded-xl w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="font-extrabold text-sm text-slate-900">All brand briefs have been reviewed</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      You have zero pending briefs awaiting review. View accepted project workspaces and open communication threads below.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('messages')}
                    className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>View Connected Workspaces</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-orange-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-xs">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#FF6B00] bg-orange-100/70 px-2.5 py-0.5 rounded-full">
                            {req.company}
                          </span>
                          <BriefVersionBadge 
                            version={req.brief_version || 1}
                            revisionCount={Array.isArray(req.clarification_history) ? req.clarification_history.length + 1 : (req.raw?.revision_history?.length || 1)}
                            status={req.status || 'pending'}
                          />
                          {req.request_id && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live Sync
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-base text-slate-900">{req.campaignTitle}</h3>
                        <p className="text-xs text-slate-600 max-w-xl">
                          <span className="font-semibold text-slate-800">Style Requirement: </span>{req.style}
                        </p>
                        {req.project_brief?.targetAudience && (
                          <p className="text-[11px] text-slate-500 max-w-xl">
                            <span className="font-semibold text-slate-700">Target Audience: </span>
                            {typeof req.project_brief.targetAudience === 'object' 
                              ? (req.project_brief.targetAudience.primaryAudience || JSON.stringify(req.project_brief.targetAudience))
                              : req.project_brief.targetAudience}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-bold text-slate-800 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> {req.budget}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Timeline: {req.deadline}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Ratio className="w-3.5 h-3.5 text-slate-400" /> {req.aspectRatio}
                          </span>
                        </div>

                        {/* Clarification History Thread */}
                        {Array.isArray(req.clarification_history) && req.clarification_history.length > 0 && (
                          <div className="mt-3 p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-purple-700 block tracking-wider">
                              Clarification History ({req.clarification_history.length}):
                            </span>
                            {req.clarification_history.map((c, i) => (
                              <div key={i} className="flex items-start gap-2 text-[11px]">
                                <span className="font-bold text-slate-900 capitalize shrink-0">{c.sender}:</span>
                                <span className="text-slate-700">{c.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive Collaboration Lifecycle Timeline */}
                        <CollaborationTimeline 
                          collaboration={req.raw || req} 
                          className="mt-3" 
                        />
                      </div>

                      {/* Interactive Actions per Collaboration Lifecycle State */}
                      <div className="flex md:flex-col gap-2 shrink-0">
                        {(!req.status || req.status === 'pending' || req.status === 'clarification_requested') && (
                          <>
                            <button 
                              onClick={() => handleAcceptBrief(req)}
                              disabled={isActionPending}
                              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Scope</span>
                            </button>
                            <button 
                              onClick={() => setClarifyModalReq(req)}
                              disabled={isActionPending}
                              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Request Clarification</span>
                            </button>
                            <button 
                              onClick={() => handleRejectBrief(req)}
                              disabled={isActionPending}
                              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            >
                              Decline Offer
                            </button>
                          </>
                        )}

                        {req.status === 'accepted' && (
                          <>
                            <button 
                              onClick={() => handleConfirmBrief(req)}
                              disabled={isActionPending}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm Terms & Lock</span>
                            </button>
                            <button 
                              onClick={() => setActiveTab('messages')}
                              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Chat</span>
                            </button>
                          </>
                        )}

                        {req.status === 'confirmed' && (
                          <button 
                            onClick={() => setActiveTab('messages')}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#FF6B00]" />
                            <span>Active Project Room</span>
                          </button>
                        )}

                        {req.status === 'rejected' && (
                          <div className="px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>Declined</span>
                          </div>
                        )}

                        {req.status === 'cancelled' && (
                          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                            <span>Cancelled by Brand</span>
                          </div>
                        )}

                        {actionError && (activeActionReqId === req.id || activeActionReqId === req.request_id) && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center justify-between">
                            <span className="font-medium">{actionError}</span>
                            <button 
                              onClick={() => setActionError(null)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-1.5 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMUNICATION (Accepted Companies Only) */}
          {activeTab === 'messages' && (
            <div className="flex-1 flex flex-col h-full min-h-[500px]">
              <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Client Communications
                  </h1>
                  <p className="text-xs text-slate-500">Showing only verified companies with accepted contracts.</p>
                </div>
                <div className="text-[11px] text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-semibold">
                  {acceptedCompanies.length} Active Workspaces
                </div>
              </div>

              {/* 2-Column Chat Layout */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50 min-h-[460px]">
                {/* Left: Accepted Company List */}
                <div className="border-r border-slate-200/80 bg-white p-3 space-y-1.5 overflow-y-auto">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block mb-2">Accepted Companies</span>
                  {acceptedCompanies.map(comp => (
                    <button
                      key={comp.id}
                      onClick={() => setActiveCompanyId(comp.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                        comp.id === activeCompanyId 
                          ? 'bg-orange-50 border border-orange-200 shadow-sm' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {comp.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{comp.name}</h4>
                          {comp.unread && <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{comp.campaign}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right: Live Thread with Selected Company */}
                <div className="relative md:col-span-2 p-4 flex flex-col justify-between bg-slate-50 min-h-[420px]">
                  {activeCompany ? (
                    <>
                      {/* Accepted-Only Communication Lockout Overlay */}
                      <ChatLockoutOverlay
                        status={activeCompany.status || 'accepted'}
                        role="creator"
                        campaignTitle={activeCompany.campaign}
                        onTriggerAction={() => handleAcceptBrief(activeCompany)}
                      />

                      <div className="pb-3 mb-3 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            {activeCompany.avatar}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs text-slate-900">{activeCompany.name}</h3>
                            <p className="text-[10px] text-slate-500">{activeCompany.campaign}</p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          (activeCompany.status === 'accepted' || activeCompany.status === 'confirmed')
                            ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (activeCompany.status === 'accepted' || activeCompany.status === 'confirmed')
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-amber-500'
                          }`} />
                          <span>
                            {(activeCompany.status === 'accepted' || activeCompany.status === 'confirmed')
                              ? 'Active Thread'
                              : 'Pending Scope Acceptance'}
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
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] p-2">
                        {isChatLoading && chatMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mb-2" />
                            <p className="text-xs font-medium">Loading collaboration messages...</p>
                          </div>
                        ) : (chatMessages.length === 0 && (!activeCompany?.messages || activeCompany.messages.length === 0)) ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs font-semibold text-slate-700">No messages yet in this collaboration</p>
                            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                              This room is ready. Coordinate milestones, prompts, and deliverable handoffs with {activeCompany.name}.
                            </p>
                          </div>
                        ) : (
                          (chatMessages.length > 0
                            ? chatMessages.map((m) => ({
                                id: m.message_id || m.id,
                                sender: m.sender_role === 'freelancer' ? 'creator' : 'brand',
                                author: m.sender_role === 'freelancer' ? creator.name : (activeCompany?.name || 'Brand Partner'),
                                text: m.text_content || m.content || m.text,
                                time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
                              }))
                            : (activeCompany?.messages || [])
                          ).map((m) => (
                            <div key={m.id} className={`flex flex-col ${m.sender === 'creator' ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-slate-400 font-medium mb-1">{m.author} • {m.time}</span>
                              <div className={`p-3 rounded-2xl text-xs max-w-md ${
                                m.sender === 'creator' 
                                  ? 'bg-[#FF6B00] text-white rounded-tr-none shadow-sm' 
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                              }`}>
                                {m.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Send Box */}
                      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 pt-2 border-t border-slate-200/80">
                        <input 
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={(activeCompany.status !== 'accepted' && activeCompany.status !== 'confirmed') || isSendingMessage}
                          placeholder={
                            (activeCompany.status !== 'accepted' && activeCompany.status !== 'confirmed')
                              ? "Chat is locked until proposal is accepted"
                              : isSendingMessage
                                ? "Sending..."
                                : `Message ${activeCompany.name}...`
                          }
                          className="flex-1 bg-white border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={(activeCompany.status !== 'accepted' && activeCompany.status !== 'confirmed') || isSendingMessage || !chatInput.trim()}
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
                      Select a company workspace to start chatting.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORK HISTORY & AFFILIATION */}
          {activeTab === 'work' && (
            <div>
              <div className="pb-6 mb-6 border-b border-slate-100">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Company Affiliation & Experience
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Verified studio associations, ongoing enterprise retainers, and delivered campaigns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200/80 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-[#FF6B00] block mb-1">Current Studio Role</span>
                  <h3 className="font-extrabold text-base text-slate-900">{creator.currentCompany}</h3>
                  <p className="text-xs text-slate-600 mt-1">{creator.title} (2024 - Present)</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md font-semibold">
                    <UserCheck className="w-3.5 h-3.5" /> Verified Employment Record
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Performance Stats</span>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-xl font-black text-slate-900">42</span>
                      <p className="text-[11px] text-slate-500">Delivered Campaigns</p>
                    </div>
                    <div>
                      <span className="text-xl font-black text-emerald-600">100%</span>
                      <p className="text-[11px] text-slate-500">Licensing Compliance</p>
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Past Brand Engagements</h4>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-orange-200 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900">Nike Digital</span> — 3D Generative Product Animation
                    <p className="text-[11px] text-slate-400">Delivered via Runway Gen-3 & Blender • 5-Star Review</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                    Full Commercial License
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-orange-200 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900">Red Bull Media</span> — Extreme Sports Visuals
                    <p className="text-[11px] text-slate-400">Stable Diffusion XL LoRA Tuning • 5-Star Review</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                    Broadcast License
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Persistent Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>GenLancer Creator Hub</span>
            <span className="text-[#FF6B00] font-semibold">⚡ Powered by Applied AI Architecture</span>
          </div>
        </main>

      {/* ================= MODAL: EDIT PROFILE SETTINGS ================= */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Edit Creator Profile Settings"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Edit Creator Profile</h3>
            <p className="text-xs text-slate-500 mb-6">Update your name, title, and current studio affiliation.</p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Creator Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title / Specialization</label>
                <input 
                  type="text" 
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Studio / Affiliation</label>
                <input 
                  type="text" 
                  value={editForm.currentCompany}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currentCompany: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Avatar Image URL</label>
                <input 
                  type="url" 
                  value={editForm.avatar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT PORTFOLIO WORK ================= */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label={editingItem ? 'Edit Portfolio Evidence' : 'Add Evidence-Based Project'}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF6B00]">
                {editingItem ? <Edit2 className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Edit Portfolio Evidence' : 'Add Evidence-Based Project'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Record prompt, model parameters, deliverables, and validated URLs. Newly added or edited items start as unverified pending audit review.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWork} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Neon Monolith - Cyberpunk Commercial"
                  value={workForm.title}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#FF6B00] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Description
                </label>
                <textarea 
                  rows={2}
                  placeholder="Provide context regarding the project brief, aesthetic goal, or brand deliverable..."
                  value={workForm.description}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Creator's Role & Contribution
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Lead Generative AI Director"
                    value={workForm.creator_role}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, creator_role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Relevant Niche / Industry
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Commercial Advertising / Luxury"
                    value={workForm.niche}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, niche: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Content Type
                  </label>
                  <select
                    value={workForm.content_type}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, content_type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                  >
                    <option>Video</option>
                    <option>Image</option>
                    <option>3D Synthetic / NeRF</option>
                    <option>Audio / SFX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={workForm.aspect_ratio}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, aspect_ratio: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                  >
                    <option>16:9 (Cinematic)</option>
                    <option>9:16 (Vertical Reel)</option>
                    <option>1:1 (Square)</option>
                    <option>4:5 (Portrait)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Skills Used (Comma-separated)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Prompt Engineering, 4K Upscaling, Color Grading"
                    value={workForm.skills_used}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, skills_used: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    AI Tools & Models Used
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Runway Gen-3 Alpha, Midjourney v6, Topaz"
                    value={workForm.tools_used}
                    onChange={(e) => setWorkForm(prev => ({ ...prev, tools_used: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Supported Media URL with Validation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Supported Media URL (Video / Image) <span className="text-rose-500">*</span></span>
                  {mediaUrlStatus && (
                    <span className={`text-[10px] font-semibold ${mediaUrlStatus.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mediaUrlStatus.valid ? '✓ Valid format & host' : '✗ Invalid media URL'}
                    </span>
                  )}
                </label>
                <input 
                  type="url"
                  placeholder="e.g. https://assets.mixkit.co/.../video.mp4"
                  value={workForm.media_url}
                  onChange={(e) => handleMediaUrlChange(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none font-mono ${
                    mediaUrlStatus 
                      ? (mediaUrlStatus.valid ? 'border-emerald-400 focus:border-emerald-500' : 'border-rose-400 focus:border-rose-500') 
                      : 'border-slate-200 focus:border-[#FF6B00]'
                  }`}
                  required
                />
                {mediaUrlStatus && !mediaUrlStatus.valid && (
                  <p className="text-[10px] text-rose-600 mt-1">{mediaUrlStatus.error}</p>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Accepted: Secure https:// links ending with .mp4, .webm, .png, .jpg, .webp, or trusted CDNs.
                </span>
              </div>

              {/* Project External URL (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>External Project URL (Optional)</span>
                  {projectUrlStatus && (
                    <span className={`text-[10px] font-semibold ${projectUrlStatus.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {projectUrlStatus.valid ? '✓ Safe link' : '✗ Invalid protocol'}
                    </span>
                  )}
                </label>
                <input 
                  type="url"
                  placeholder="e.g. https://vimeo.com/76979871 or https://behance.net/..."
                  value={workForm.project_url}
                  onChange={(e) => handleProjectUrlChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] font-mono"
                />
              </div>

              {/* Optional Measurable Outcome */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Outcome / Measurable Result (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 1.2M organic impressions; 65% faster delivery turnaround"
                  value={workForm.project_outcome}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, project_outcome: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Generation Pipeline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Generation Pipeline
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Midjourney v6 ➔ Runway Gen-3 Alpha ➔ Topaz 4K"
                  value={workForm.pipeline}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, pipeline: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Exact Generation Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exact Generation Prompt <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={2}
                  placeholder="Paste the exact prompt including tags, style tokens, and weights..."
                  value={workForm.prompt}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, prompt: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] font-mono resize-none"
                  required
                />
              </div>

              {/* Seed */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seed Number (Optional for reproducibility verification)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 482019482"
                  value={workForm.seed}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, seed: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingWork}
                  className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingWork ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingItem ? 'Save Changes' : 'Save Project Evidence'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Clarification Request Modal */}
      <ClarificationModal
        isOpen={!!clarifyModalReq}
        onClose={() => setClarifyModalReq(null)}
        request={clarifyModalReq}
        onSubmit={handleSubmitClarification}
      />

      {/* Prompt & Seed Inspector Modal */}
      <PromptInspectorModal 
        isOpen={!!selectedAssetForInspect} 
        onClose={() => setSelectedAssetForInspect(null)} 
        item={selectedAssetForInspect} 
      />

    </div>
  );
}
