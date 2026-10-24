import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  Search, 
  Bot, 
  FileText, 
  Check, 
  SlidersHorizontal,
  Clock,
  Award,
  GitBranch,
  Info,
  Menu,
  X,
  Lock,
  Zap
} from 'lucide-react';
import GenLancerLogo from '../auth/GenLancerLogo';
import Hero3DLogo from './Hero3DLogo';

export default function LandingPage({ 
  onNavigateToLogin, 
  onNavigateToRegister,
  onNavigateToBrandRegister,
  onNavigateToCreatorRegister
}) {
  const [activeSection, setActiveSection] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState(null); // { title: string, text: string } | null

  // Accessible keyboard listener: close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Handle URL hash changes, redirecting stale legacy hash (#guarantee) to #commercial-escrow
  useEffect(() => {
    if (window.location.hash === '#guarantee') {
      window.history.replaceState(null, '', '#commercial-escrow');
      const el = document.getElementById('commercial-escrow');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
        setActiveSection('commercial-escrow');
      }
    } else if (window.location.hash) {
      const target = window.location.hash.replace('#', '');
      const el = document.getElementById(target);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
        setActiveSection(target);
      }
    }
  }, []);

  // Track active section on scroll for navbar active indicators
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['how-it-works', 'features', 'commercial-escrow'];
      const scrollPosition = window.scrollY + 160;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler for nav items with offset
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  const handleBrandSignup = () => {
    if (onNavigateToBrandRegister) {
      onNavigateToBrandRegister();
    } else if (onNavigateToRegister) {
      onNavigateToRegister('company');
    }
  };

  const handleCreatorSignup = () => {
    if (onNavigateToCreatorRegister) {
      onNavigateToCreatorRegister();
    } else if (onNavigateToRegister) {
      onNavigateToRegister('freelancer');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-[#FF6B00] selection:text-white relative overflow-x-hidden">
      {/* Background delicate dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Warm ambient glows in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-orange-200/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[850px] right-0 w-[500px] h-[450px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" />

      {/* ================= HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo Lockup */}
          <button 
            type="button"
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-xl p-1 text-left flex items-center transition-opacity hover:opacity-95" 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              window.history.pushState(null, '', window.location.pathname);
              setActiveSection('');
            }}
            aria-label="GenLancer Home"
          >
            <GenLancerLogo className="w-9 h-9 sm:w-10 sm:h-10" textColor="text-slate-900" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            <button
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className={`px-3.5 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                activeSection === 'how-it-works'
                  ? 'text-[#FF6B00] bg-orange-50 font-bold border border-orange-200/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 font-semibold'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={(e) => scrollToSection(e, 'features')}
              className={`px-3.5 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                activeSection === 'features'
                  ? 'text-[#FF6B00] bg-orange-50 font-bold border border-orange-200/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 font-semibold'
              }`}
            >
              Features
            </button>
            <button
              onClick={(e) => scrollToSection(e, 'commercial-escrow')}
              className={`px-3.5 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                activeSection === 'commercial-escrow'
                  ? 'text-[#FF6B00] bg-orange-50 font-bold border border-orange-200/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 font-semibold'
              }`}
            >
              Commercial Escrow
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={onNavigateToLogin}
              className="px-4 py-2 text-[13px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              Log In
            </button>
            <button
              onClick={handleCreatorSignup}
              className="px-4.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white text-[13px] font-bold rounded-xl shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B00]"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu Backdrop & Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div 
              className="fixed inset-0 top-20 bg-slate-900/20 backdrop-blur-xs z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            
            <div className="relative z-40 md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
              <div className="flex flex-col space-y-1">
                <button
                  onClick={(e) => scrollToSection(e, 'how-it-works')}
                  className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeSection === 'how-it-works' ? 'bg-orange-50 text-[#FF6B00]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  How It Works
                </button>
                <button
                  onClick={(e) => scrollToSection(e, 'features')}
                  className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeSection === 'features' ? 'bg-orange-50 text-[#FF6B00]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Features
                </button>
                <button
                  onClick={(e) => scrollToSection(e, 'commercial-escrow')}
                  className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeSection === 'commercial-escrow' ? 'bg-orange-50 text-[#FF6B00]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Commercial Escrow
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToLogin();
                  }}
                  className="w-full py-2.5 text-center text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleCreatorSignup();
                  }}
                  className="w-full py-2.5 text-center text-sm font-bold text-white bg-[#FF6B00] hover:bg-[#E05E00] rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* ================= SECTION A: HERO ================= */}
      <section className="relative z-10 pt-8 pb-16 md:pt-14 md:pb-24 lg:pt-16 lg:pb-28 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Hero Typography & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50/90 border border-orange-200/80 text-[#FF6B00] text-xs font-bold tracking-wide shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-[#FF6B00]" />
              <span>Evidence-Based Generative AI Marketplace</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-slate-900 tracking-tight leading-[1.12]">
              Find the Right <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500">
                AI Creator
              </span> for Your Next Big Idea.
            </h1>

            {/* Supporting Copy */}
            <p className="text-slate-600 text-sm sm:text-base md:text-[17px] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              GenLancer helps companies define structured project briefs, discover creators using explainable matching, inspect verified portfolio evidence, and collaborate with version-locked clarity.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={handleBrandSignup}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B00]"
              >
                <span>Find AI Creators</span>
                <ArrowRight className="w-4 h-4 font-bold" />
              </button>

              <button
                onClick={handleCreatorSignup}
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-orange-50/40 active:scale-[0.98] text-slate-800 border-2 border-slate-200 hover:border-orange-300 font-bold rounded-2xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-300"
              >
                <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                <span>Join as Creator</span>
              </button>
            </div>

            {/* Verified Feature Highlights (Structured Benefit Pills) */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs text-slate-600 font-medium">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="font-semibold text-slate-700">AI Brief Structuring</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B00] flex-shrink-0" />
                <span className="font-semibold text-slate-700">Explainable 7D Matching</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-semibold text-slate-700">Locked Version Control</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual: 3D Premium GenLancer Logo Presentation */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-4 sm:py-6 lg:py-8">
            <Hero3DLogo />
          </div>

        </div>
      </section>

      {/* ================= SECTION TRANSITION BRIDGE ================= */}
      <div className="relative z-10 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 flex items-center justify-center py-2 pointer-events-none">
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
      </div>

      {/* ================= SECTION B: HOW IT WORKS ================= */}
      <section 
        id="how-it-works" 
        className="py-16 md:py-20 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 scroll-mt-24"
      >
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-orange-100/90 px-3.5 py-1 rounded-full border border-orange-200 inline-block">
            How GenLancer Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            From Prompt Idea to Confirmed Collaboration in 3 Steps
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Legacy freelance marketplaces rely on opaque reviews. GenLancer structures your creative requirements, pairs you with verified generative artists, and enforces version-locked agreement.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Step 1: Define the Brief */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 text-white">
                  Step 01
                </span>
                <span className="text-xs font-bold text-slate-400">Brief Definition</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">1. Define the Brief</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Describe your project vision in natural language. GenLancer's AI brief generator turns raw ideas into structured specifications—aspect ratios, model pipelines, camera directives, and deliverable milestones.
              </p>

              {/* Step detail card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Automated Extraction</div>
                <div className="font-semibold text-slate-800">Resolution, Frame Rate & Model Stacks</div>
                <div className="text-slate-500 text-[10px]">Editable before saving or sending</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Structured requirements capture</span>
            </div>
          </div>

          {/* Step 2: Discover Creators */}
          <div className="p-8 bg-white rounded-3xl border-2 border-[#FF6B00]/40 shadow-md hover:border-[#FF6B00] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black tracking-wider uppercase shadow-sm">
              Explainable AI Match
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF6B00] text-white">
                  Step 02
                </span>
                <span className="text-xs font-bold text-[#FF6B00]">Discovery</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-orange-100 border border-orange-300 text-[#FF6B00] flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-sm">
                <Cpu className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">2. Discover Creators</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Filter creator recommendations by AI tooling and creative style. Inspect transparent 7-dimension match scores backed by verified generation seeds, prompt workflows, and portfolio evidence.
              </p>

              {/* Step detail card */}
              <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-200 text-[11px] text-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-orange-900">Score Transparency</div>
                <div className="font-semibold text-slate-900">7-Dimension Match Inspection</div>
                <div className="text-slate-600 text-[10px]">Inspect exact tooling and style weights</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Evidence-backed ranking</span>
            </div>
          </div>

          {/* Step 3: Collaborate */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 text-white">
                  Step 03
                </span>
                <span className="text-xs font-bold text-slate-400">Collaboration</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">3. Collaborate & Lock</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Send formal requests, request clarification, exchange scoped messages, and revise the brief. Dual confirmations lock the exact brief version to prevent scope misunderstandings before production.
              </p>

              {/* Step detail card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Version Protection</div>
                <div className="font-semibold text-slate-800">Dual-Party Brief Locking</div>
                <div className="text-slate-500 text-[10px]">Revisions automatically invalidate stale sign-offs</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>5-stage audited lifecycle</span>
            </div>
          </div>

        </div>

        {/* Section bottom CTA strip */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900">Want to see the creator matchmaker in action?</h4>
            <p className="text-xs text-slate-600">Start by creating an AI-assisted brief or exploring creator profiles.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBrandSignup}
              className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-500/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Build A Brief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToLogin}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-200 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Log In
            </button>
          </div>
        </div>
      </section>

      {/* ================= SECTION C: FEATURES ================= */}
      <section 
        id="features" 
        className="py-20 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] block mb-2">
            Verified Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Features Built for the Generative Era
          </h2>
          <p className="text-slate-500 text-sm mt-3">
            Every feature in GenLancer is implemented to solve the specific complexities of synthetic media, reproducible pipelines, and multi-model creative work.
          </p>
        </div>

        {/* 6 Core Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Feature 1 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">AI Campaign Brief Builder</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Transform raw concepts into comprehensive creative briefs. Extracts aspect ratios, camera trajectories, model stacks (Runway, Flux, Midjourney), and structured milestone deliverables.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Powered by Gemini AI with structured fallback</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Explainable Creator Matching</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect transparent scoring breakdowns across 7 dimensions including tooling match, stylistic alignment, prompt verification, and response history rather than opaque black-box recommendations.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Transparent score inspector modal</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Portfolios & Supporting Evidence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Creators showcase verified generation seeds, LoRA parameters, ComfyUI workflows, and prompt recipes, giving companies confidence that deliverables are reproducible in production.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Seed & pipeline reproducibility tracking</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Verification Status & Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-stage portfolio verification workflow. Creators submit work for administrative and peer review, preventing unverified or hallucinated claims from receiving verified badges.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Role-gated review & unverified guardrails</span>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Collaboration Timeline & History</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured 5-stage lifecycle from proposal through clarification, discussion, and agreement. Any material revision to the brief automatically invalidates previous confirmations.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Audit logs & dual confirmation locks</span>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-xs">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Search Filters & Matching Reports</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Target creators by specific generative model, aesthetic, and rate. Generate structured matching reports with comparative creator analyses to support team hiring decisions.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center text-[11px] font-bold text-[#FF6B00]">
              <span>Granular tool filters & downloadable reports</span>
            </div>
          </div>

        </div>
      </section>

      {/* ================= SECTION D: COMMERCIAL ESCROW (INFORMATIONAL) ================= */}
      <section 
        id="commercial-escrow" 
        className="py-20 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 scroll-mt-24"
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-orange-100/90 px-3.5 py-1 rounded-full border border-orange-200 inline-block">
              Milestone Protection Framework
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Proposed Commercial Escrow Workflow
            </h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              How GenLancer structures milestone-based delivery and how integrated payment custody will operate in upcoming releases.
            </p>
          </div>

          {/* Milestone Step Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="font-bold text-sm text-slate-900">Milestone Scoping</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deliverables, timelines, and payment amounts are bound directly to the locked brief version so expectations are strictly defined before work starts.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="font-bold text-sm text-slate-900">Deliverable Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Creators submit render files, resolution assets, and generation parameters for review against the brief specifications before milestone approval.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#FF6B00] flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="font-bold text-sm text-slate-900">Asset & IP Handover</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full commercial rights, project seeds, and uncompressed output are transferred once milestone deliverables receive mutual participant confirmation.
              </p>
            </div>
          </div>

          {/* Prominent Platform Status Notice & Disclaimer Box */}
          <div className="p-6 sm:p-7 bg-amber-50/80 rounded-3xl border-2 border-amber-300 text-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5 text-amber-900">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="font-extrabold text-sm uppercase tracking-wide">
                Platform Payment Status Notice
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Please Note:</strong> Payments are not currently processed, held in custody, or disbursed by GenLancer. GenLancer currently provides AI brief authoring, explainable matching, portfolio verification, and version-locked collaboration tracking. Financial settlements and commercial invoicing are coordinated directly between contracting clients and creators until our regulated payment integration is released.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-amber-900">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Brief-locked deliverable tracking active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dual-confirmation contract state active</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Direct client-creator settlement</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= SECTION E: TRUST & FINAL CALL TO ACTION ================= */}
      <section className="py-16 max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Trust Pillars */}
        <div className="mb-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Reproducible Proof</h4>
            <p className="text-xs text-slate-500">
              Portfolios backed by inspectable prompt metadata, seeds, and model versions rather than unverified static imagery.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center mx-auto mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Transparent Matching</h4>
            <p className="text-xs text-slate-500">
              Clear 7-dimension scoring criteria explain why each creator matches your specific brief requirements.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Version-Locked Alignment</h4>
            <p className="text-xs text-slate-500">
              Immutable collaboration revision history ensures both sides agree on the same project scope.
            </p>
          </div>
        </div>

        {/* Final CTA Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-[32px] p-8 sm:p-12 md:p-16 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 inline-block">
              Ready to Collaborate?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Bring Your Next AI Project to Reality.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
              Join brands and generative artists collaborating with transparent briefs, verified workflows, and explainable matching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleBrandSignup}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B00]"
              >
                <span>Find AI Creators</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleCreatorSignup}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500"
              >
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Join as Creator</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white py-12 relative z-10">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <GenLancerLogo className="w-8 h-8" textColor="text-slate-900" />
            <span className="text-xs text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} GenLancer. AI-Native Creator Marketplace.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection(e, 'features')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection(e, 'commercial-escrow')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Commercial Escrow
            </button>
            <button
              type="button"
              onClick={() => setLegalModalContent({
                title: 'Licensing Terms & Asset Rights',
                text: 'All synthetic media deliverables agreed through GenLancer are subject to the project brief specifications agreed upon by both parties. Creators agree to transfer relevant commercial rights upon final delivery as stipulated in the agreed brief. Direct invoicing and IP transfer terms are agreed upon between the respective brand and creator.'
              })}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Licensing Terms
            </button>
            <button
              type="button"
              onClick={() => setLegalModalContent({
                title: 'Privacy Policy',
                text: 'GenLancer respects creator privacy and proprietary workflow data. Portfolios and prompt metadata submitted publicly are visible to prospective clients. Private collaboration messages and revision histories are encrypted in transit and accessible strictly to authorized participants.'
              })}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#FF6B00] hover:underline font-bold cursor-pointer"
            >
              Portal Login
            </button>
          </div>
        </div>
      </footer>

      {/* Legal & Policy Informational Modal */}
      {legalModalContent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">{legalModalContent.title}</h3>
              <button 
                type="button"
                onClick={() => setLegalModalContent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {legalModalContent.text}
            </p>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setLegalModalContent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
