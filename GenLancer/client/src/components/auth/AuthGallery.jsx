import React, { useState, useEffect } from 'react';
import TemplateCreativeStudioLight from './TemplateCreativeStudioLight';
import TemplateMinimalCentered from './TemplateMinimalCentered';
import TemplateSplitScreen from './TemplateSplitScreen';
import TemplateCreativeWelcome from './TemplateCreativeWelcome';
import TemplateDeveloperWorkflow from './TemplateDeveloperWorkflow';
import TemplateEditorialBold from './TemplateEditorialBold';
import GenLancerLogo from './GenLancerLogo';
import { 
  Eye, 
  ArrowLeft, 
  Sparkles, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft,
  ShieldCheck, 
  Layers, 
  Terminal, 
  Columns, 
  Flame,
  CheckCircle2,
  Maximize2,
  Sun,
  Moon,
  Zap
} from 'lucide-react';

const TEMPLATES = [
  {
    id: 1,
    name: 'Template 1: Creative Studio Light (Flagship)',
    tagline: 'Crisp light-themed white split-card with electric orange branding & logo',
    component: <TemplateCreativeStudioLight />,
    category: 'Light Theme / Orange',
    theme: 'light',
    icon: Sun,
    accent: 'from-orange-500 via-amber-500 to-orange-600',
    borderHover: 'hover:border-orange-500/80',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    isNew: true,
    features: ['Electric Orange (#FF6B00) Identity', 'Vector GenLancer Left Emblem', 'Dual-Role AI Creator vs Brand', 'Multi-Model Pipeline Cards']
  },
  {
    id: 2,
    name: 'Template 2: Minimal Centered',
    tagline: 'Distraction-free dark authentication with dot-grid canvas & centered card',
    component: <TemplateMinimalCentered />,
    category: 'Minimalist Dark',
    theme: 'dark',
    icon: Sparkles,
    accent: 'from-violet-600 to-indigo-600',
    borderHover: 'hover:border-violet-500/60',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    features: ['Radial Dot-Grid Background', 'Clean Card Focus', 'Instant Role Switcher', 'Password Visibility Toggle']
  },
  {
    id: 3,
    name: 'Template 3: Split-Screen SaaS',
    tagline: 'Dual-column layout with social proof, live seed badges & feature showcase',
    component: <TemplateSplitScreen />,
    category: 'SaaS / Enterprise',
    theme: 'dark',
    icon: Columns,
    accent: 'from-blue-600 to-violet-600',
    borderHover: 'hover:border-blue-500/60',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    features: ['Split 50/50 Layout', 'Social Proof & Rating', 'Runway/Midjourney Tags', 'Escrow Guarantee Badges']
  },
  {
    id: 4,
    name: 'Template 4: Creative Studio Dark',
    tagline: 'Soft ambient gradients with multi-model pipeline and creative brief cards',
    component: <TemplateCreativeWelcome />,
    category: 'Creative Dark',
    theme: 'dark',
    icon: Layers,
    accent: 'from-indigo-600 to-fuchsia-600',
    borderHover: 'hover:border-fuchsia-500/60',
    badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
    features: ['Ambient Glowing Orbs', 'Pipeline Tool Cards', 'Generative Brief Visuals', 'Gradient Primary CTA']
  },
  {
    id: 5,
    name: 'Template 5: Developer Workflow',
    tagline: 'Monospace terminal styling with AI node pipeline visualizer & telemetry',
    component: <TemplateDeveloperWorkflow />,
    category: 'Technical / AI Graph',
    theme: 'dark',
    icon: Terminal,
    accent: 'from-emerald-600 to-teal-600',
    borderHover: 'hover:border-emerald-500/60',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    features: ['Monospace Terminal UI', 'Interactive Node Pipeline', 'H100 GPU Cluster Meter', 'Seed Copy Utility']
  },
  {
    id: 6,
    name: 'Template 6: Editorial & Bold',
    tagline: 'Headline-driven layout with 3 key commercial value props & sleek auth card',
    component: <TemplateEditorialBold />,
    category: 'Editorial',
    theme: 'dark',
    icon: Flame,
    accent: 'from-purple-600 to-pink-600',
    borderHover: 'hover:border-pink-500/60',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    features: ['High-Impact Typography', '3-Column Value Props', 'Fortune 500 Trust Rating', 'Enterprise SAML Callout']
  }
];

export default function AuthGallery() {
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Keyboard navigation between templates in full-screen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTemplate !== null) {
        if (e.key === 'Escape') {
          setActiveTemplate(null);
        } else if (e.key === 'ArrowRight') {
          setActiveTemplate((prev) => (prev % TEMPLATES.length) + 1);
        } else if (e.key === 'ArrowLeft') {
          setActiveTemplate((prev) => (prev === 1 ? TEMPLATES.length : prev - 1));
        } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          setActiveTemplate(parseInt(e.key, 10));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTemplate]);

  if (activeTemplate !== null) {
    const selected = TEMPLATES.find((t) => t.id === activeTemplate);
    const currentIndex = TEMPLATES.findIndex((t) => t.id === activeTemplate);
    const prevTemplate = TEMPLATES[(currentIndex - 1 + TEMPLATES.length) % TEMPLATES.length];
    const nextTemplate = TEMPLATES[(currentIndex + 1) % TEMPLATES.length];

    return (
      <div className="relative min-h-screen">
        {/* Floating Master Navigation Bar in Full-Screen View */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 rounded-full shadow-2xl backdrop-blur-xl transition-all max-w-[96vw] overflow-x-auto">
          <button
            onClick={() => setActiveTemplate(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0"
            title="Return to Gallery (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gallery</span>
          </button>

          <div className="h-4 w-px bg-slate-700 shrink-0 mx-1" />

          {/* Quick template jump buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setActiveTemplate(tpl.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTemplate === tpl.id
                    ? tpl.id === 1 
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-300' 
                      : 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Press ${tpl.id} on keyboard`}
              >
                <span className="font-mono text-[11px] opacity-75">#{tpl.id}</span>
                <span className="hidden md:inline">{tpl.category}</span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700 shrink-0 mx-1" />

          {/* Previous / Next buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveTemplate(prevTemplate.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Previous Template (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTemplate(nextTemplate.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Next Template (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Render the Active Template */}
        {selected.component}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white p-4 sm:p-8 md:p-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <header className="mb-10 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 fill-orange-400" />
              <span>Light & Dark Auth Suites</span>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              6 Production Templates
            </span>
            <span className="text-xs font-mono text-orange-400 bg-orange-950/40 px-2.5 py-1 rounded-full border border-orange-500/30">
              Electric Orange Identity
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                <GenLancerLogo className="w-9 h-9" textColor="text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Authentication Design Gallery
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Featuring the brand-new <strong className="text-orange-400 font-semibold">Light Theme Creative Studio</strong> with electric orange styling, vector identity emblem, and dual-role authentication (AI Creator vs Brand).
              </p>
            </div>

            {/* Quick feature summary pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-300 flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B00]" />
                <span>Electric Orange (#FF6B00)</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-300 flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B00]" />
                <span>Google & GitHub OAuth</span>
              </div>
            </div>
          </div>
        </header>

        {/* Gallery Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.id}
                className={`bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl ${
                  tpl.id === 1 ? 'hover:shadow-orange-500/15 border-orange-500/40' : 'hover:shadow-violet-600/10'
                } ${tpl.borderHover} backdrop-blur-sm relative overflow-hidden`}
              >
                {/* Top Accent Gradient Line */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${tpl.accent} ${tpl.id === 1 ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity`} />

                <div>
                  {/* Category & ID badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border ${tpl.badge}`}>
                        {tpl.category}
                      </span>
                      {tpl.isNew && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-orange-500 text-white shadow-sm">
                          Featured
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      0{tpl.id} / 06
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl ${tpl.id === 1 ? 'bg-orange-500/20 border-orange-500/40 text-[#FF6B00]' : 'bg-slate-800 border-slate-700/60 text-slate-300'} border flex items-center justify-center group-hover:scale-110 transition-all shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${tpl.id === 1 ? 'text-orange-300 group-hover:text-orange-200' : 'text-white group-hover:text-violet-300'} transition-colors`}>
                        {tpl.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{tpl.theme} mode</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed">
                    {tpl.tagline}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2 pb-4 border-t border-slate-800/70">
                    {tpl.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                        <div className={`w-1.5 h-1.5 rounded-full ${tpl.id === 1 ? 'bg-[#FF6B00]' : 'bg-violet-400'} shrink-0`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-4 border-t border-slate-800/70">
                  <button
                    onClick={() => setActiveTemplate(tpl.id)}
                    className={`w-full py-2.5 px-4 ${
                      tpl.id === 1 
                        ? 'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-orange-500/20' 
                        : 'bg-slate-800 hover:bg-violet-600 text-white'
                    } rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md group/btn cursor-pointer`}
                  >
                    <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    <span>Preview Live Template</span>
                    <Maximize2 className="w-3 h-3 opacity-60 ml-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <footer className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <GenLancerLogo className="w-6 h-6" showText={false} />
            <span className="font-semibold text-slate-400">GenLancer UI Design System &copy; 2026</span>
          </div>
          <p>
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono text-[10px]">1-6</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> when previewing for instant keyboard navigation.
          </p>
        </footer>
      </div>
    </div>
  );
}
