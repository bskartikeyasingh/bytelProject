import React, { useState } from 'react';
import { Eye, EyeOff, Film, Shield, Zap, ArrowRight, CheckCircle2, Star, Sparkles } from 'lucide-react';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

export default function TemplateEditorialBold() {
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
        text: `Logged in to ${role === 'freelancer' ? 'GenLancer Creator Suite' : 'Enterprise Client Console'}`
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }, 500);
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `SSO Authenticating with ${provider.toUpperCase()} (${role === 'freelancer' ? 'Creator' : 'Client'})`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 bg-slate-950 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Editorial Text & Value Props */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> The Generative Talent Standard
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
            Bring your next <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300">
              AI campaign
            </span> to reality.
          </h1>
          
          <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
            Traditional freelance platforms fail when evaluating AI creators. GenLancer inspects model architectures, generation seeds, custom LoRAs, and reproducible prompt pipelines with full commercial indemnification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl hover:border-violet-500/40 transition-all shadow-md group">
              <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-110 transition-transform">
                <Film className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">AI Filmmaking</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">Sora, Runway & Kling directors on demand</p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl hover:border-indigo-500/40 transition-all shadow-md group">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">Commercial Rights</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">Full IP escrow and copyright protection</p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl hover:border-amber-500/40 transition-all shadow-md group">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">AI Briefing</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">Convert 1 sentence into a structured brief</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <span>Rated 4.9/5 by 350+ Fortune 500 creative directors</span>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-violet-400 font-bold uppercase">GenLancer Identity</span>
              <span className="text-[10px] text-slate-500 font-mono">v3.0 Production</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Sign in to GenLancer</h3>
            <p className="text-xs text-slate-400 mt-1">
              {role === 'freelancer' ? 'Access your AI models and creator earnings' : 'Manage your enterprise commercial campaigns'}
            </p>
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div className="mb-4 p-3 rounded-xl bg-violet-950/80 border border-violet-500/40 text-violet-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          <RoleSelector role={role} setRole={setRole} />
          <SocialAuthButtons onOAuthClick={handleOAuth} />

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">or sign in with email</span>
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
                placeholder="you@domain.com"
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Recovery instructions dispatched."); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
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
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Entering Workspace...</span>
              ) : (
                <>
                  <span>Sign In to {role === 'freelancer' ? 'Creator Suite' : 'Client Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Enterprise SAML SSO supported. Need custom SLA?{' '}
            <a 
              href="#enterprise" 
              onClick={(e) => { e.preventDefault(); alert("Contacting GenLancer Enterprise Solutions Team"); }}
              className="text-violet-400 hover:text-violet-300 font-semibold"
            >
              Talk to Sales
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
