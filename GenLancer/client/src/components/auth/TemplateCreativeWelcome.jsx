import React, { useState } from 'react';
import { Eye, EyeOff, Wand2, Layers, Cpu, Sparkles, CheckCircle2, Palette, ArrowRight } from 'lucide-react';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

export default function TemplateCreativeWelcome() {
  const [role, setRole] = useState('freelancer');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage({
        type: 'success',
        text: `Welcome aboard! Entering ${role === 'freelancer' ? 'AI Creator Studio' : 'Brand Commission Portal'}...`
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }, 500);
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `Authenticating via ${provider.toUpperCase()} for ${role === 'freelancer' ? 'AI Creator' : 'Creative Director'}...`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#0a0d14] relative overflow-hidden">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-slate-900/70 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl transition-all">
        {/* Left Interactive Art Panel */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-indigo-950/50 via-slate-900/90 to-slate-950 p-8 flex-col justify-between border-r border-slate-800/60 relative">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" /> Generative Marketplace
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight">
              Create without constraints.
            </h3>
            <p className="text-xs text-slate-300/80 mt-3 leading-relaxed">
              The premier freelance hub built from the ground up for prompt artists, LoRA architects, and synthetic media directors.
            </p>
          </div>

          {/* Dynamic Interactive Cards */}
          <div className="space-y-3.5 relative z-10 my-6">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center gap-3.5 hover:border-indigo-500/40 transition-colors shadow-md">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Multi-Model Pipelines</p>
                <p className="text-[10px] text-slate-400">Midjourney v6 → Runway Gen-3 → Topaz 4K</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center gap-3.5 hover:border-fuchsia-500/40 transition-colors shadow-md">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-fuchsia-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">AI Brief Builder</p>
                <p className="text-[10px] text-slate-400">Auto-structured briefs with seed matching</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center gap-3.5 hover:border-violet-500/40 transition-colors shadow-md">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Automated Portfolio Sync</p>
                <p className="text-[10px] text-slate-400">Direct Hugging Face & Civitai ingestion</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 relative z-10 pt-2 border-t border-slate-800/50">
            <span className="font-mono">GenLancer Studio Suite</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live v1.4
            </span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 flex items-center justify-center font-black text-xs text-white">
                GL
              </div>
              <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Creative Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Sign in to your account</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {role === 'freelancer' 
                ? 'Manage your prompt library, submissions, and direct brand offers.' 
                : 'Browse verified prompt artists and start custom model commissions.'}
            </p>
          </div>

          {/* Feedback Toast */}
          {statusMessage && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          <RoleSelector role={role} setRole={setRole} />
          <SocialAuthButtons onOAuthClick={handleOAuth} />

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0f1422] px-3 text-[11px] text-slate-500 uppercase tracking-wider">or sign in with password</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'freelancer' ? 'creator@genlancer.io' : 'director@agency.com'}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Recovery link dispatched!"); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 active:opacity-90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Loading Studio...</span>
              ) : (
                <>
                  <span>Continue to {role === 'freelancer' ? 'Creator Dashboard' : 'Brand Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Looking to explore public showcases?{' '}
            <a 
              href="#explore" 
              onClick={(e) => { e.preventDefault(); alert("Opening Public Generation Showcase gallery!"); }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Browse AI Showcase
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
