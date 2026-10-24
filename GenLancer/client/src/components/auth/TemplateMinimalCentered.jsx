import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

export default function TemplateMinimalCentered() {
  const [role, setRole] = useState('freelancer');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage({
        type: 'success',
        text: `Authenticated successfully as ${role === 'freelancer' ? 'AI Creator' : 'Brand Client'} (${email})`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }, 600);
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `Connecting ${provider.toUpperCase()} OAuth for ${role === 'freelancer' ? 'AI Creator' : 'Brand / Agency'}...`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-slate-950 relative overflow-hidden">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
        {/* Notification Toast */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-violet-950/80 border border-violet-500/40 text-violet-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-400 font-black text-xl mb-3 shadow-inner">
            GL
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to GenLancer</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 min-h-[20px] transition-all">
            {role === 'freelancer' 
              ? 'Access your AI portfolio, custom LoRAs, and prompt briefs' 
              : 'Hire verified AI directors and commercial creators'}
          </p>
        </div>

        {/* Dual Role Switcher */}
        <RoleSelector role={role} setRole={setRole} />

        {/* Social Authentication */}
        <SocialAuthButtons onOAuthClick={handleOAuth} />

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">or work email</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {role === 'freelancer' ? 'Creator Work Email' : 'Company Work Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'freelancer' ? "creator@midjourney.art" : "agency@creative.co"}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset link sent to your registered email."); }} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-violet-600 focus:ring-violet-500 cursor-pointer accent-violet-600" 
            />
            <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer select-none">
              Remember this device for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {role === 'freelancer' ? 'AI Creator' : 'Brand Client'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <a 
            href="#signup" 
            onClick={(e) => { e.preventDefault(); alert(`Redirecting to registration for ${role === 'freelancer' ? 'AI Creators' : 'Brands & Agencies'}`); }}
            className="text-violet-400 hover:text-violet-300 font-semibold underline-offset-4 hover:underline"
          >
            Create {role === 'freelancer' ? 'Creator' : 'Company'} Account
          </a>
        </p>

        {/* Security watermark */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span>Encrypted with SHA-256 & Multi-tenant AI Vaults</span>
        </div>
      </div>
    </div>
  );
}
