import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles, Film, Award, TrendingUp, Check } from 'lucide-react';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

export default function TemplateSplitScreen() {
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
        text: `Logged into ${role === 'freelancer' ? 'Creator Studio' : 'Brand Client Workspace'} successfully!`
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }, 500);
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `Authenticating with ${provider.toUpperCase()} for ${role === 'freelancer' ? 'Creator Suite' : 'Agency Portal'}...`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-white">
      {/* Left Column: Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 xl:p-16">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-black text-lg shadow-lg shadow-violet-600/30">
              GL
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">GenLancer</span>
              <span className="block text-[10px] text-violet-400 font-medium tracking-wider uppercase">AI Talent Exchange</span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight">Log in to your workspace</h2>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            {role === 'freelancer' 
              ? 'Connect your AI workflows, showcase creations, and get paid globally.'
              : 'Hire top 1% prompt engineers and AI video producers on-demand.'}
          </p>

          {/* Toast Notification */}
          {statusMessage && (
            <div className="mb-4 p-3 rounded-xl bg-violet-950/80 border border-violet-500/40 text-violet-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          <RoleSelector role={role} setRole={setRole} />
          <SocialAuthButtons onOAuthClick={handleOAuth} />

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-950 px-3 text-xs text-slate-500 uppercase tracking-wider">or work credentials</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {role === 'freelancer' ? 'Creator Email' : 'Company Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'freelancer' ? "lora-artist@genlancer.ai" : "marketing@venture.co"}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <a 
                  href="#reset" 
                  onClick={(e) => { e.preventDefault(); alert("Recovery link dispatched to email."); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 px-4 pr-10 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded bg-slate-900 border-slate-800 text-violet-600 focus:ring-violet-500 accent-violet-600" />
                <span>Keep me signed in</span>
              </label>
              <span className="text-slate-500 text-[11px]">SAML SSO Enabled</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-white text-slate-950 hover:bg-slate-200 active:bg-slate-300 font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-white/10 cursor-pointer disabled:opacity-60 mt-2"
            >
              {isLoading ? "Signing in..." : `Sign In as ${role === 'freelancer' ? 'AI Creator' : 'Brand Client'}`}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            New to GenLancer?{' '}
            <a 
              href="#signup" 
              onClick={(e) => { e.preventDefault(); alert("Open new account modal"); }}
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Start free trial
            </a>
          </p>
        </div>
      </div>

      {/* Right Column: Visual Feature Showcase */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 border-l border-slate-800/80 p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="px-3.5 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" /> GenLancer AI Network
          </span>
          <span className="text-xs font-mono text-slate-400">v2.4 Enterprise</span>
        </div>

        {/* Feature Demonstration Card */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-8">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-semibold text-violet-400 tracking-wider">RUNWAY GEN-3 // MIDJOURNEY V6</span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Prompt Verified
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed italic">
              "We booked three specialized AI animators through GenLancer in under 4 hours. Every deliverable had verified prompt metadata and commercial IP licensing."
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  AC
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Apex Creative Agency</p>
                  <p className="text-[10px] text-slate-400">Global Commercial Brand Client</p>
                </div>
              </div>
              <div className="flex text-amber-400 text-xs font-bold gap-0.5">
                ★★★★★
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-900/60 border border-slate-800/70 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <span>$4.2M+ Payouts</span>
              </div>
              <p className="text-[11px] text-slate-400">Distributed to AI artists</p>
            </div>
            <div className="p-3.5 bg-slate-900/60 border border-slate-800/70 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>100% Escrow</span>
              </div>
              <p className="text-[11px] text-slate-400">Protected milestones</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Prompt transparency & reproducible seed verification pipelines</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Commercial licensing and copyright indemnification escrow</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-4">
          <span>Trusted by 1,200+ verified generative AI directors</span>
          <span className="text-violet-400/80 font-mono text-[11px]">SOC2 Type II Certified</span>
        </div>
      </div>
    </div>
  );
}
