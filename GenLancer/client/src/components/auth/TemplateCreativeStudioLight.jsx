import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, Building2, Layers, Cpu, Palette, ArrowRight, Zap, CheckCircle2, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { signInUser, resendVerificationEmail } from '../../lib/supabase';
import { auth, googleProvider } from '../../firebase';
import { signInWithPopup } from 'firebase/auth';
import { DEMO_USERS } from '../../data/demoUsers';

export default function TemplateCreativeStudioLight({ 
  onNavigateToRegister, 
  onLoginSuccess,
  onNavigateToLanding,
  onNavigateToVerification,
  onNavigateToForgotPassword,
  initialRole = 'freelancer'
}) {
  const [role, setRole] = useState(initialRole); // 'freelancer' | 'company'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialRole === 'company' ? 'apex@brand.demo' : 'aarav@genlancer.demo');
  const [password, setPassword] = useState(initialRole === 'company' ? 'Apex@123' : 'Aarav@123');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

  const handleInlineResend = async (targetEmail) => {
    setIsResending(true);
    try {
      await resendVerificationEmail(targetEmail);
      setStatusMessage({
        type: 'success',
        text: `Fresh verification link dispatched to ${targetEmail}. Please check your inbox!`
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to resend verification email.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setStatusMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const selectedRole = role === 'company' ? 'company' : 'creator';

      // Send the secure ID Token to the Express backend
      const response = await fetch('http://localhost:3001/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: idToken, 
          role: selectedRole
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Backend authentication failed.');
      
      // Store credentials and session
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('genlancer_active_role', data.user.role === 'company' ? 'company' : 'freelancer');

      setStatusMessage({
        type: 'success',
        text: `Authenticated with Google as ${data.user.name || data.user.email} (${data.user.role === 'company' ? 'Brand' : 'AI Creator'})`
      });

      // Navigate to respective dashboard
      const targetRole = data.user.role === 'company' ? 'company' : 'freelancer';
      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(targetRole);
        } else if (typeof navigate === 'function') {
          navigate(data.user.role === 'company' ? '/company-dashboard' : '/creator-dashboard');
        }
      }, 600);
    } catch (err) {
      console.error('Auth Error:', err);
      setError(err.message || 'Google Authentication failed.');
      setStatusMessage({
        type: 'error',
        text: err.message || 'Google Authentication failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const data = await signInUser({ email, password });
      const detectedRole = data?.user?.user_metadata?.role || role;

      setStatusMessage({
        type: 'success',
        text: `Authenticated as ${detectedRole === 'company' ? 'Brand Client' : 'AI Creator'} (${email})`
      });

      setTimeout(() => {
        setStatusMessage(null);
        if (onLoginSuccess) onLoginSuccess(detectedRole, data?.user);
      }, 700);
    } catch (err) {
      console.warn('Login issue:', err.message);

      if (err.code === 'EMAIL_NOT_CONFIRMED' || err.unconfirmed) {
        setStatusMessage({
          type: 'unconfirmed',
          email: email.trim(),
          text: 'Your email address has not been verified yet. Please check your inbox for the verification link.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Invalid email or password. Please verify credentials.'
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#F8FAFC] relative overflow-x-hidden text-slate-900">
      {/* Background delicate dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

      {/* Subtle warm ambient glow */}
      <div className="absolute -top-28 -left-28 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Card Container */}
      <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-12 z-10">
        
        {/* ================= LEFT SIDE: BRAND & FEATURES ================= */}
        <div className="md:col-span-5 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div>
            {/* Logo at Top Left */}
            <div className="mb-8">
              <button
                type="button"
                onClick={onNavigateToLanding}
                className="cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-xl transition-opacity hover:opacity-90"
                aria-label="Return to GenLancer Home"
              >
                <GenLancerLogo className="w-12 h-12" textColor="text-slate-900" />
              </button>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-[#FF6B00] text-xs font-bold mb-4 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-[#FF6B00]" />
              <span>Generative Marketplace</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Create without <br />
              <span className="text-[#FF6B00]">constraints.</span>
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              The premier freelance hub built from the ground up for prompt artists, LoRA architects, and synthetic media directors.
            </p>

            {/* Value Proposition Cards */}
            <div className="mt-8 space-y-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Multi-Model Pipelines</h4>
                  <p className="text-[11px] text-slate-400">Midjourney v6 → Runway Gen-3 → Topaz 4K</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">AI Brief Builder</h4>
                  <p className="text-[11px] text-slate-400">Auto-structured briefs with seed matching</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Automated Portfolio Sync</h4>
                  <p className="text-[11px] text-slate-400">Direct Hugging Face & Civitai ingestion</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">GenLancer Studio Suite</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live v1.4
            </span>
          </div>
        </div>

        {/* ================= RIGHT SIDE: AUTHENTICATION FORM ================= */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            
            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#FF6B00] text-white flex items-center justify-center text-[11px] font-black shadow-sm">
                GL
              </div>
              <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase">
                {role === 'freelancer' ? 'Creative Portal' : 'Enterprise Portal'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              {role === 'freelancer' 
                ? 'Manage your prompt library, submissions, and direct brand offers.' 
                : 'Publish creative briefs, verify creator seeds, and commission campaigns.'}
            </p>

            {/* Notification Toast */}
            {statusMessage && (
              <div className={`mb-4 p-3.5 rounded-xl border text-xs shadow-sm animate-fade-in ${
                statusMessage.type === 'unconfirmed'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 flex items-center gap-2'
                  : 'bg-orange-50 border-orange-200 text-orange-900 flex items-center gap-2'
              }`}>
                {statusMessage.type === 'unconfirmed' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
                      <button
                        type="button"
                        onClick={() => handleInlineResend(statusMessage.email || email)}
                        disabled={isResending}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                        <span>{isResending ? 'Sending link...' : 'Resend Verification Link'}</span>
                      </button>
                      {onNavigateToVerification && (
                        <button
                          type="button"
                          onClick={() => onNavigateToVerification(statusMessage.email || email, role)}
                          className="text-[11px] text-amber-700 hover:underline font-semibold cursor-pointer"
                        >
                          Open Verification Screen
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {statusMessage.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" />
                    )}
                    <span className="font-semibold">{statusMessage.text}</span>
                  </>
                )}
              </div>
            )}

            {/* Dual Role Selector Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-xl mb-6 border border-slate-200/70">
              <button
                type="button"
                onClick={() => {
                  setRole('freelancer');
                  if (email === 'brand@genlancer.io' || email === '') setEmail('creator@genlancer.io');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'freelancer'
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Creator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('company');
                  if (email === 'creator@genlancer.io' || email === '') setEmail('brand@genlancer.io');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'company'
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Brand / Agency</span>
              </button>
            </div>

            {/* Social Authentication (Firebase Google Sign-In) */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full group flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 shadow-sm cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.8 7.4 23 12 23z"/>
                </svg>
                <span>{loading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Separator */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                or select test demo account
              </span>
            </div>

            {/* Quick Demo Test-Login Selector */}
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl mb-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#FF6B00]" />
                  Quick Test-Login Accounts
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Click to fill credentials</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_USERS.map((demo) => {
                  const isSelected = email.toLowerCase() === demo.email.toLowerCase();
                  const isCreator = demo.role === 'creator';
                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        setEmail(demo.email);
                        setPassword(demo.password);
                        setRole(isCreator ? 'freelancer' : 'company');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                      }`}
                      title={`${demo.name} (${demo.email} / ${demo.password})`}
                    >
                      <span>{isCreator ? '🎨' : '🏢'}</span>
                      <span className="font-bold">{demo.name.split(' ')[0]}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${isSelected ? 'bg-orange-700/50 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {demo.password}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'freelancer' ? "creator@genlancer.io" : "director@brand.com"}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button 
                    type="button"
                    onClick={() => {
                      if (onNavigateToForgotPassword) {
                        onNavigateToForgotPassword(email);
                      }
                    }}
                    className="text-xs text-[#FF6B00] hover:text-[#E05E00] font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Continue to {role === 'freelancer' ? 'Creator Dashboard' : 'Brand Console'}</span>
                    <ArrowRight className="w-4 h-4 font-bold" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Link: Navigates to Register */}
            <p className="text-center text-xs text-slate-500 mt-6">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#FF6B00] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <span>Create Free Account</span>
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
