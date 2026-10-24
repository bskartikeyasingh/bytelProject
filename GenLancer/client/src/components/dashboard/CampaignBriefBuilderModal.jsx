import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Wand2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  HelpCircle, 
  RotateCcw, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Layers, 
  FileText, 
  DollarSign, 
  Calendar, 
  Ratio, 
  Users, 
  Briefcase, 
  Zap, 
  Tag, 
  Cpu, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { apiUrl, API_BASE_URL } from '../../lib/apiConfig';
import { authFetch } from '../../lib/supabase';

const STEPS = [
  { id: 1, label: 'Concept & Goal', icon: Sparkles },
  { id: 2, label: 'Audience & Tone', icon: Users },
  { id: 3, label: 'Deliverables & Skills', icon: Layers },
  { id: 4, label: 'Budget & Timeline', icon: DollarSign },
  { id: 5, label: 'Review & Match', icon: Search }
];

const PROMPT_SUGGESTIONS = [
  "Launching a high-end zero-sugar sparkling energy drink called 'Nova Surge'. Need 3x 15s cinematic cyberpunk video ads with fluid simulations and neon cityscapes, targeting Gen Z gamers. Total budget $4,500.",
  "Luxury minimalist fashion brand launching summer silk collection. Need 5x 9:16 vertical high-fashion reels with cinematic lighting and soft focus for Instagram, 2-week turnaround, budget $3,200.",
  "AI tech startup launching 3D browser product explainer. Need 1x 60s 16:9 4K product trailer with holographic UI animations, Runway Gen-3 and ComfyUI, deadline Dec 15, budget $5,000."
];

export default function CampaignBriefBuilderModal({
  isOpen,
  onClose,
  onPublishBrief,
  onFindMatchingCreators,
  initialData = null
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [rawIdea, setRawIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingSection, setIsRegeneratingSection] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Active Structured Brief State
  const [brief, setBrief] = useState({
    title: '',
    goal: '',
    product_service: '',
    niche: 'AI Commercial Production',
    target_audience: '',
    target_demographics: '',
    tone: 'Cinematic, Bold, Dynamic',
    platforms: 'YouTube, Commercial Broadcast',
    deliverables: '',
    aspect_ratio: '16:9',
    required_skills: 'Prompt Engineering, AI Video Generation, Cinematography',
    tools: 'Runway Gen-3 Alpha, Midjourney v6',
    budget: '',
    timeline: '',
    style: '',
    experience_level: 'Commercial / Senior'
  });

  // Source Attributions: 'user_provided' vs 'ai_inferred'
  const [fieldSources, setFieldSources] = useState({});
  const [completenessScore, setCompletenessScore] = useState(25);
  const [completenessBreakdown, setCompletenessBreakdown] = useState({});
  const [missingInformation, setMissingInformation] = useState([]);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [modelUsed, setModelUsed] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [generationMethod, setGenerationMethod] = useState('');

  // Clarification quick-answer answers state
  const [clarificationAnswers, setClarificationAnswers] = useState({});

  useEffect(() => {
    if (initialData) {
      populateFromData(initialData);
    }
  }, [initialData]);

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

  if (!isOpen) return null;

  // Helper to populate state from backend brief payload
  const populateFromData = (data) => {
    const b = data.brief || data || {};
    
    // Extract audience string
    let audStr = '';
    let demoStr = '';
    if (typeof b.target_audience === 'object' && b.target_audience !== null) {
      audStr = b.target_audience.primaryAudience || '';
      demoStr = b.target_audience.demographics || '';
    } else if (typeof b.targetAudience === 'object' && b.targetAudience !== null) {
      audStr = b.targetAudience.primaryAudience || '';
      demoStr = b.targetAudience.demographics || '';
    } else {
      audStr = b.target_audience || b.targetAudience || '';
    }

    // Extract deliverables string
    let delivStr = '';
    if (Array.isArray(b.deliverables)) {
      delivStr = b.deliverables.map(d => typeof d === 'string' ? d : `${d.item || ''} (${d.format || '16:9'})${d.description ? `: ${d.description}` : ''}`).join('; ');
    } else if (Array.isArray(b.keyDeliverables)) {
      delivStr = b.keyDeliverables.map(d => typeof d === 'string' ? d : `${d.item || ''}${d.description ? `: ${d.description}` : ''}`).join('; ');
    } else {
      delivStr = b.deliverables || '';
    }

    // Extract skills & tools
    const skillsStr = Array.isArray(b.required_skills) ? b.required_skills.join(', ') : (b.required_skills || '');
    const toolsStr = Array.isArray(b.tools) ? b.tools.join(', ') : (b.tools || '');
    const toneStr = Array.isArray(b.tone) ? b.tone.join(', ') : (Array.isArray(b.toneAndVoice) ? b.toneAndVoice.join(', ') : (b.tone || ''));
    const platformsStr = Array.isArray(b.platforms) ? b.platforms.join(', ') : (b.platforms || '');

    setBrief({
      title: b.title || b.goal || '',
      goal: b.goal || b.title || '',
      product_service: b.product_service || '',
      niche: b.niche || 'AI Commercial Production',
      target_audience: audStr,
      target_demographics: demoStr,
      tone: toneStr || 'Cinematic, Bold, Dynamic',
      platforms: platformsStr || (b.aspect_ratio === '9:16' ? 'TikTok, Instagram Reels' : 'YouTube, Commercial Broadcast'),
      deliverables: delivStr,
      aspect_ratio: b.aspect_ratio || b.aspectRatio || '16:9',
      required_skills: skillsStr || 'Prompt Engineering, AI Video Generation',
      tools: toolsStr || 'Runway Gen-3 Alpha, Midjourney v6',
      budget: b.budget || '',
      timeline: b.timeline || b.deadline || '',
      style: b.style || (b.visualIdentity?.designAesthetic) || '',
      experience_level: b.experience_level || 'Commercial / Senior'
    });

    setCompletenessScore(data.completeness_score ?? b.completeness_score ?? 85);
    setCompletenessBreakdown(data.completeness_breakdown || b.completeness_breakdown || {});
    setMissingInformation(data.missing_information || b.missing_information || []);
    setClarificationQuestions(data.clarification_questions || b.clarification_questions || []);
    setFieldSources(data.field_sources || b.field_sources || {});
    setModelUsed(data.modelUsed || b.model_used || null);
    setIsFallback(Boolean(data.is_fallback ?? b.is_fallback));
    setGenerationMethod(data.generation_method || b.generation_method || '');
  };

  // Full Natural Language Brief Generation with Gemini / Fallback
  const handleGenerateBrief = async () => {
    if (!rawIdea.trim()) return;
    setIsGenerating(true);
    setStatusMessage(null);
    setValidationErrors([]);

    try {
      const response = await authFetch(apiUrl('/api/generate-brief'), {
        method: 'POST',
        body: JSON.stringify({ idea: rawIdea })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        populateFromData(data);
        setStatusMessage({
          type: 'success',
          text: data.is_fallback 
            ? '⚡ Fallback Heuristics Engine generated structured brief. Every field is ready to customize.' 
            : `✨ AI Brief structured successfully with ${data.modelUsed || 'Gemini'}!`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to generate brief. Please review your input.'
        });
      }
    } catch (err) {
      console.error('Error connecting to brief generator:', err);
      setStatusMessage({
        type: 'error',
        text: `Network error connecting to API: ${err.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Single-Section Regeneration
  const handleRegenerateSection = async (sectionName) => {
    setIsRegeneratingSection(true);
    try {
      const response = await authFetch(apiUrl('/api/generate-brief'), {
        method: 'POST',
        body: JSON.stringify({
          section: sectionName,
          currentBrief: brief,
          idea: rawIdea || brief.goal || brief.title
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        populateFromData(data);
        setStatusMessage({
          type: 'success',
          text: `Section "${sectionName}" regenerated with fresh suggestions!`
        });
      }
    } catch (err) {
      console.warn('Error regenerating section:', err);
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Field change handler: updates value and automatically flags as user-provided
  const handleFieldChange = (fieldName, value) => {
    setBrief(prev => ({ ...prev, [fieldName]: value }));
    setFieldSources(prev => ({ ...prev, [fieldName]: 'user_provided' }));
  };

  // Reset a specific field
  const handleResetField = (fieldName) => {
    handleFieldChange(fieldName, '');
  };

  // Answer Clarification Question inline
  const handleApplyClarificationAnswer = (field, answerText) => {
    if (field === 'budget') handleFieldChange('budget', answerText);
    else if (field === 'timeline') handleFieldChange('timeline', answerText);
    else if (field === 'aspect_ratio' || field === 'content_formats') handleFieldChange('aspect_ratio', answerText);
    else if (field === 'tools') handleFieldChange('tools', answerText);
    else if (field === 'deliverables') handleFieldChange('deliverables', answerText);
    else if (field === 'product_service') handleFieldChange('product_service', answerText);

    // Remove from missing lists locally
    setMissingInformation(prev => prev.filter(m => !m.toLowerCase().includes(field.replace('_', ' '))));
    setClarificationQuestions(prev => prev.filter(q => !q.toLowerCase().includes(field.replace('_', ' '))));
    setCompletenessScore(prev => Math.min(100, prev + 15));
  };

  // Final Validation before Submission or Creator Matching
  const handleValidateAndSubmit = async (mode = 'match') => {
    setIsValidating(true);
    setValidationErrors([]);
    setValidationWarnings([]);

    try {
      const response = await authFetch(apiUrl('/api/brief/validate'), {
        method: 'POST',
        body: JSON.stringify({ brief })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        if (mode === 'match') {
          // Hand off normalized search params directly to creator search / matchmaker
          onFindMatchingCreators(data.normalized_brief, data.search_params);
          onClose();
        } else {
          // Publish brief to marketplace / Supabase
          await onPublishBrief(data.normalized_brief);
          onClose();
        }
      } else {
        setValidationErrors(data.errors || ['Validation failed. Please fill required fields.']);
        if (data.warnings) setValidationWarnings(data.warnings);
        setCurrentStep(5); // Bring user to review step to inspect errors
      }
    } catch (err) {
      console.error('Validation error:', err);
      setValidationErrors([`Network error connecting to validation endpoint: ${err.message}`]);
    } finally {
      setIsValidating(false);
    }
  };

  // Badge indicator for field source
  const renderSourceBadge = (fieldName) => {
    const isUser = fieldSources[fieldName] === 'user_provided';
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
        isUser 
          ? 'bg-slate-100 text-slate-700 border border-slate-200' 
          : 'bg-purple-50 text-purple-700 border border-purple-200'
      }`}>
        {isUser ? (
          <>
            <Check className="w-2.5 h-2.5 text-slate-600" />
            <span>User Defined</span>
          </>
        ) : (
          <>
            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
            <span>AI Inferred</span>
          </>
        )}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="AI Campaign Brief Builder"
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ================= MODAL HEADER ================= */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50/60 via-white to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">AI Campaign Brief Builder</h2>
                {modelUsed && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isFallback 
                      ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{isFallback ? 'Deterministic Fallback' : `Gemini Live (${modelUsed})`}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Transform natural language ideas into structured campaign deliverables for AI creators.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Semantic Completeness Score Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200">
              <span className="text-xs font-bold text-slate-700">Completeness:</span>
              <span className="text-xs font-black text-[#FF6B00]">{completenessScore}%</span>
              <div className="w-16 h-2 bg-orange-200/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FF6B00] transition-all duration-500" 
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= STEPPER TABS ================= */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-[#FF6B00] text-white shadow-sm shadow-orange-500/20' 
                    : isCompleted
                    ? 'bg-orange-100/70 text-[#FF6B00] hover:bg-orange-100'
                    : 'text-slate-500 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{step.id}. {step.label}</span>
                {isCompleted && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* ================= MODAL BODY / SCROLLABLE CONTENT ================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Feedback Status Alert */}
          {statusMessage && (
            <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 animate-fade-in ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{statusMessage.text}</span>
              </div>
              <button 
                onClick={() => setStatusMessage(null)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Please address the following requirements before submitting:</span>
              </div>
              <ul className="text-xs text-rose-700 pl-6 list-disc space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ================= STEP 1: CONCEPT & GOAL ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* Natural Language Prompt Assistant */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/90 via-amber-50/30 to-slate-50 border border-orange-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Natural Language Brief Assistant
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-100 px-2 py-0.5 rounded-full">
                    Auto-Populates Form
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Type unformatted project thoughts, client requirements, or product notes. AI will extract goals, deliverables, audience, and tech specs across all tabs.
                </p>

                <textarea
                  rows={3}
                  id="nl-idea-input"
                  placeholder="e.g. Launching a high-end zero-sugar sparkling energy drink called 'Nova Surge'. Need 3x 15s cinematic cyberpunk video ads with fluid simulations, neon cityscapes, targeting Gen Z gamers. Total budget $4,500."
                  value={rawIdea}
                  onChange={(e) => setRawIdea(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#FF6B00] placeholder:text-slate-400 shadow-2xs resize-none"
                />

                {/* Quick Suggestion Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Or click a sample campaign template:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_SUGGESTIONS.map((promptText, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRawIdea(promptText)}
                        className="text-[11px] bg-white hover:bg-orange-50 border border-orange-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all text-left truncate max-w-xs cursor-pointer"
                      >
                        💡 {promptText.slice(0, 42)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400">
                    {rawIdea.length > 0 ? `${rawIdea.length} characters` : 'Paste unformatted notes'}
                  </span>

                  <button
                    type="button"
                    id="trigger-ai-builder-btn"
                    onClick={handleGenerateBrief}
                    disabled={isGenerating || !rawIdea.trim()}
                    className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Structuring with AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Generate Structured Brief</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Fields: Title, Goal & Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Campaign Title</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('title')}
                  </div>
                  <input
                    type="text"
                    id="brief-title-field"
                    value={brief.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="e.g. Nova Surge Cyberpunk Commercial Campaign"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Product or Service</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('product_service')}
                  </div>
                  <input
                    type="text"
                    id="brief-product-field"
                    value={brief.product_service}
                    onChange={(e) => handleFieldChange('product_service', e.target.value)}
                    placeholder="e.g. Nova Surge Zero-Sugar Cold Nitro Can"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Commercial Niche / Vertical</label>
                    {renderSourceBadge('niche')}
                  </div>
                  <input
                    type="text"
                    id="brief-niche-field"
                    value={brief.niche}
                    onChange={(e) => handleFieldChange('niche', e.target.value)}
                    placeholder="e.g. Beverage Commercial, 3D Product Ad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Primary Campaign Goal & Objectives</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('goal')}
                  </div>
                  <textarea
                    rows={3}
                    id="brief-goal-field"
                    value={brief.goal}
                    onChange={(e) => handleFieldChange('goal', e.target.value)}
                    placeholder="Describe what this campaign aims to achieve, key messages, and creative hooks..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#FF6B00] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: AUDIENCE & TONE ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Target Audience & Brand Voice</h3>
                <button
                  type="button"
                  onClick={() => handleRegenerateSection('audience')}
                  disabled={isRegeneratingSection}
                  className="text-xs text-[#FF6B00] hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegeneratingSection ? 'animate-spin' : ''}`} />
                  <span>Regenerate Audience & Voice</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Primary Target Audience</label>
                    {renderSourceBadge('target_audience')}
                  </div>
                  <input
                    type="text"
                    value={brief.target_audience}
                    onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                    placeholder="e.g. Gen Z competitive gamers and esports enthusiasts (Ages 18-26)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Demographics & Psychographics</label>
                    {renderSourceBadge('target_demographics')}
                  </div>
                  <input
                    type="text"
                    value={brief.target_demographics}
                    onChange={(e) => handleFieldChange('target_demographics', e.target.value)}
                    placeholder="e.g. Digital natives who value high aesthetic craft and performance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Brand Tone & Voice Keywords</label>
                    {renderSourceBadge('tone')}
                  </div>
                  <input
                    type="text"
                    value={brief.tone}
                    onChange={(e) => handleFieldChange('tone', e.target.value)}
                    placeholder="e.g. Bold, Cinematic, High-Tech, High-Energy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Distribution Platforms</label>
                    {renderSourceBadge('platforms')}
                  </div>
                  <input
                    type="text"
                    value={brief.platforms}
                    onChange={(e) => handleFieldChange('platforms', e.target.value)}
                    placeholder="e.g. TikTok, Instagram Reels, YouTube, Paid Social Ads"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Visual Aesthetic & Art Direction Directives</label>
                    {renderSourceBadge('style')}
                  </div>
                  <textarea
                    rows={3}
                    value={brief.style}
                    onChange={(e) => handleFieldChange('style', e.target.value)}
                    placeholder="Describe lighting mood, camera motion, color palettes, and rendering style..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#FF6B00] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: DELIVERABLES & SKILLS ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deliverables & Technical Requirements</h3>
                <button
                  type="button"
                  onClick={() => handleRegenerateSection('deliverables')}
                  disabled={isRegeneratingSection}
                  className="text-xs text-[#FF6B00] hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegeneratingSection ? 'animate-spin' : ''}`} />
                  <span>Regenerate Deliverables</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Specific Deliverables List</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('deliverables')}
                  </div>
                  <textarea
                    rows={3}
                    id="brief-deliverables-field"
                    value={brief.deliverables}
                    onChange={(e) => handleFieldChange('deliverables', e.target.value)}
                    placeholder="e.g. 3x 15s 4K video ads; 5x high-res product hero stills; prompt and workflow documentation"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-[#FF6B00] resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Target Aspect Ratio</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('aspect_ratio')}
                  </div>
                  <select
                    value={brief.aspect_ratio}
                    onChange={(e) => handleFieldChange('aspect_ratio', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                  >
                    <option value="16:9">16:9 (Widescreen / YouTube / Broadcast)</option>
                    <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                    <option value="1:1">1:1 (Square Feed)</option>
                    <option value="4:5">4:5 (Social Media Portrait)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Creator Experience Tier</label>
                    {renderSourceBadge('experience_level')}
                  </div>
                  <select
                    value={brief.experience_level}
                    onChange={(e) => handleFieldChange('experience_level', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00] cursor-pointer"
                  >
                    <option value="Commercial / Senior">Commercial / Senior Director</option>
                    <option value="Mid-Level Specialist">Mid-Level AI Motion Designer</option>
                    <option value="Studio Certified">Elite Studio / Agency</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Required Creator Skills</label>
                    {renderSourceBadge('required_skills')}
                  </div>
                  <input
                    type="text"
                    value={brief.required_skills}
                    onChange={(e) => handleFieldChange('required_skills', e.target.value)}
                    placeholder="e.g. Cinematography, Prompt Engineering, Fluid Sim, VFX Motion"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Required Generative Tools / Models</label>
                    {renderSourceBadge('tools')}
                  </div>
                  <input
                    type="text"
                    value={brief.tools}
                    onChange={(e) => handleFieldChange('tools', e.target.value)}
                    placeholder="e.g. Runway Gen-3 Alpha, Midjourney v6, ComfyUI, Flux.1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: BUDGET & TIMELINE ================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Budget Escrow & Milestones</h3>
                <button
                  type="button"
                  onClick={() => handleRegenerateSection('budget_timeline')}
                  disabled={isRegeneratingSection}
                  className="text-xs text-[#FF6B00] hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegeneratingSection ? 'animate-spin' : ''}`} />
                  <span>Regenerate Estimates</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Campaign Escrow Budget</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('budget')}
                  </div>
                  <input
                    type="text"
                    id="brief-budget-field"
                    value={brief.budget}
                    onChange={(e) => handleFieldChange('budget', e.target.value)}
                    placeholder="e.g. $4,500 or $3,500 - $5,000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Funds are protected in GenLancer smart escrow until deliverables are approved.</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Timeline / Target Delivery Date</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {renderSourceBadge('timeline')}
                  </div>
                  <input
                    type="text"
                    id="brief-timeline-field"
                    value={brief.timeline}
                    onChange={(e) => handleFieldChange('timeline', e.target.value)}
                    placeholder="e.g. Nov 30, 2026 or 2-3 weeks turnaround"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#FF6B00]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Set realistic timeline for rendering and revision cycles.</span>
                </div>
              </div>

              {/* Clarification Questions Helper (if budget or timeline were uncertain) */}
              {clarificationQuestions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>AI Clarification Assistant — Missing Requirements Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Instead of inventing requirements, our system identified the following questions to maximize creator match quality:
                  </p>
                  <div className="space-y-2">
                    {clarificationQuestions.map((q, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 space-y-1.5">
                        <p className="font-semibold text-slate-900">• {q}</p>
                        {/budget|escrow/i.test(q) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400">Quick set:</span>
                            {['$2,200', '$3,500', '$4,500', '$7,500'].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => handleApplyClarificationAnswer('budget', amt)}
                                className="text-[11px] bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 px-2 py-0.5 rounded font-bold cursor-pointer"
                              >
                                {amt}
                              </button>
                            ))}
                          </div>
                        )}
                        {/deadline|delivery|timeline/i.test(q) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400">Quick set:</span>
                            {['1 week turnaround', '2-3 weeks', '1 month', 'Nov 30, 2026'].map((timeStr) => (
                              <button
                                key={timeStr}
                                type="button"
                                onClick={() => handleApplyClarificationAnswer('timeline', timeStr)}
                                className="text-[11px] bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 px-2 py-0.5 rounded font-bold cursor-pointer"
                              >
                                {timeStr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 5: REVIEW & MATCH ================= */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Campaign Brief Review & Verification</h3>
                  <p className="text-xs text-slate-500">Every field below will be validated and fed into the 7-dimension AI creator discovery algorithm.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-100 text-[#FF6B00] font-black text-xs px-3 py-1 rounded-xl">
                  <span>Score: {completenessScore}/100</span>
                </div>
              </div>

              {/* Quality Audit Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/40 border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Campaign Title</span>
                  <span className="font-bold text-slate-800 truncate block">{brief.title || 'Untitled'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget Escrow</span>
                  <span className="font-bold text-emerald-700 block">{brief.budget || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Timeline</span>
                  <span className="font-bold text-slate-800 block">{brief.timeline || 'Flexible'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Aspect Ratio</span>
                  <span className="font-bold text-[#FF6B00] block">{brief.aspect_ratio}</span>
                </div>
              </div>

              {/* Missing Fields Checklist */}
              {missingInformation.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Identified Gaps to Complete:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {missingInformation.map((gap, i) => (
                      <span key={i} className="text-[10px] bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                        ⚠️ {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables & Directives Full Preview */}
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Key Deliverables</span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{brief.deliverables || 'No specific deliverables specified.'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Required Creator Skills & Tools</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {brief.required_skills.split(',').map((s, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        ✓ {s.trim()}
                      </span>
                    ))}
                    {brief.tools.split(',').map((t, idx) => (
                      <span key={idx} className="bg-orange-50 border border-orange-200 text-[#FF6B00] px-2 py-0.5 rounded text-[11px] font-bold">
                        ⚡ {t.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Visual Direction & Directives</span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{brief.style || 'Standard commercial high-fidelity aesthetic.'}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================= MODAL FOOTER NAVIGATION ================= */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  id="publish-brief-btn"
                  onClick={() => handleValidateAndSubmit('publish')}
                  disabled={isValidating}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Publish to Marketplace</span>
                </button>

                <button
                  type="button"
                  id="match-creators-btn"
                  onClick={() => handleValidateAndSubmit('match')}
                  disabled={isValidating}
                  className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating Brief...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Find Matching Creators (Score & Rank) →</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
