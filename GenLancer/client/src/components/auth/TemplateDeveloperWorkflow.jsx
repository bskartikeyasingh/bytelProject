import React, { useState } from 'react';
import { Eye, EyeOff, Terminal, GitBranch, ArrowUpRight, Cpu, Activity, ShieldAlert, CheckCircle2, Copy, Check } from 'lucide-react';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

export default function TemplateDeveloperWorkflow() {
  const [role, setRole] = useState('freelancer');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage({
        type: 'success',
        text: `SESSION_INIT: Token verified for ${role === 'freelancer' ? 'AI_MODEL_BUILDER' : 'ENTERPRISE_API_CONSUMER'}`
      });
      setTimeout(() => setStatusMessage(null), 3500);
    }, 500);
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `SSH_OAUTH_HANDSHAKE: [${provider.toUpperCase()}] Role: ${role}`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#070b12] font-sans relative overflow-hidden">
      {/* Background terminal matrix grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#064e3b15_1px,transparent_1px),linear-gradient(to_bottom,#064e3b15_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* Subtle emerald glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl relative z-10">
        {/* Left Form */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-md">
                <Terminal className="w-3.5 h-3.5 animate-pulse" />
                <span>auth.genlancer.io // secure-session</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">TLS 1.3 / E2EE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Access Node Network</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6 font-mono">
              {role === 'freelancer' 
                ? '$ genlancer --auth creator --model-sync' 
                : '$ genlancer --auth enterprise --commercial-license'}
            </p>

            {/* Status Message */}
            {statusMessage && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fade-in shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            <RoleSelector role={role} setRole={setRole} />
            <SocialAuthButtons onOAuthClick={handleOAuth} />

            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                OR_API_TOKEN_AUTH
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>USER_IDENTITY [EMAIL]</span>
                  <span className="text-[10px] text-emerald-400">RFC-5322</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'freelancer' ? "developer@model.ai" : "engineering@brand.io"}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-lg py-2.5 px-3.5 text-sm text-emerald-400 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-600 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono text-slate-300">ACCESS_TOKEN_SECRET</label>
                  <a 
                    href="#recover" 
                    onClick={(e) => { e.preventDefault(); alert("Token rotation dispatched to verified terminal keypair."); }}
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300"
                  >
                    ROTATE_KEY?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-lg py-2.5 px-3.5 pr-10 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-600 transition-all"
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

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="dev-auth-persist" 
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 accent-emerald-500" 
                />
                <label htmlFor="dev-auth-persist" className="text-xs font-mono text-slate-400 cursor-pointer">
                  KEEP_SESSION_ALIVE (JWT 30D)
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-mono font-bold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>INITIALIZING_SESSION...</span>
                ) : (
                  <>
                    <span>INITIALIZE SESSION</span>
                    <ArrowUpRight className="w-4 h-4 font-black" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>CLI: <code className="text-slate-400">npm i -g @genlancer/cli</code></span>
            <span className="text-emerald-400/80">LATENCY: 14ms</span>
          </div>
        </div>

        {/* Right Workflow Graph Visualization */}
        <div className="hidden lg:flex lg:col-span-6 bg-slate-950/95 border-l border-slate-800 p-8 xl:p-10 flex-col justify-between font-mono relative">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-6 pb-3 border-b border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300 font-semibold">
                <Cpu className="w-4 h-4 text-emerald-400" />
                PIPELINE_ORCHESTRATOR
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                <Activity className="w-3 h-3 animate-spin" /> RUNNING
              </span>
            </div>

            {/* Workflow Diagram */}
            <div className="space-y-3.5 my-6">
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-violet-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Model_Input: Midjourney v6</span>
                    <p className="text-[10px] text-slate-500">Seed #49201994 // Ar 16:9</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCopy('v6.1_seed_49201994', 0)}
                  className="text-[10px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1"
                >
                  {copiedIndex === 0 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 0 ? 'Copied' : 'Seed'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-6 text-slate-600 text-xs">
                <div className="h-6 w-0.5 bg-gradient-to-b from-violet-500 to-indigo-500" />
                <span className="text-[10px] text-slate-500">pipe: frame_interpolation</span>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Motion_Engine: Runway Gen-3</span>
                    <p className="text-[10px] text-slate-500">Camera: Orbit pan left 45°</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>

              <div className="flex items-center gap-2 ml-6 text-slate-600 text-xs">
                <div className="h-6 w-0.5 bg-gradient-to-b from-indigo-500 to-emerald-500" />
                <span className="text-[10px] text-slate-500">upscale: topaz_ai_4k</span>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Deliverable: 4K ProRes Export</span>
                    <p className="text-[10px] text-slate-500">SHA256: e3b0c44298fc1c149afb</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/70 border border-slate-800/90 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">GPU Cluster Distribution</span>
              <span className="text-emerald-400 font-bold">48/48 H100s Online</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full w-[94%]" />
            </div>
            <p className="text-[10px] text-slate-500">
              Live automated validation for seed reproducability & IP integrity checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
