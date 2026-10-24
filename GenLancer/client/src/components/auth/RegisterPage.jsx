import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  Coins, 
  Workflow, 
  ArrowRight,
  CheckCircle2,
  Zap
} from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { signUpUser } from '../../lib/supabase';
import { validateRegistrationEmail } from '../../lib/emailSecurity';
import { auth, googleProvider } from '../../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function RegisterPage({ 
  onNavigateToLogin, 
  onRegisterSuccess, 
  onNavigateToLanding,
  initialRole = 'freelancer' 
}) {
  const [role, setRole] = useState(initialRole); // 'freelancer' | 'company'
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialization: 'AI Filmmaking (Runway Gen-3 / Sora)',
    password: '',
    agreedToTerms: false
  });

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
        text: `Registered with Google as ${data.user.name || data.user.email} (${data.user.role === 'company' ? 'Brand' : 'AI Creator'})`
      });

      // Navigate to respective dashboard
      const targetRole = data.user.role === 'company' ? 'company' : 'freelancer';
      setTimeout(() => {
        if (typeof onRegisterSuccess === 'function') {
          onRegisterSuccess(targetRole);
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      setStatusMessage({
        type: 'error',
        text: 'Please agree to the GenLancer terms and licensing policies.'
      });
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setStatusMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long.'
      });
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    const emailCheck = validateRegistrationEmail(formData.email);
    if (!emailCheck.valid) {
      setStatusMessage({
        type: 'error',
        text: emailCheck.error
      });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // Server-side anti-abuse and disposable email pre-check
      try {
        const preCheckRes = await fetch('http://localhost:3001/api/auth/validate-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailCheck.sanitized, role })
        });
        if (preCheckRes.status === 429) {
          const errData = await preCheckRes.json();
          throw new Error(errData.error || 'Too many signup attempts. Please wait a moment.');
        }
        if (preCheckRes.status === 400) {
          const errData = await preCheckRes.json();
          throw new Error(errData.error || 'Invalid email address.');
        }
      } catch (backendErr) {
        // Only halt if backend returned explicit 400/429
        if (backendErr.message && !backendErr.message.includes('Failed to fetch')) {
          setStatusMessage({ type: 'error', text: backendErr.message });
          setIsLoading(false);
          return;
        }
      }

      const result = await signUpUser({
        email: emailCheck.sanitized,
        password: formData.password,
        role,
        fullName: formData.name,
        specialization: formData.specialization
      });

      setStatusMessage({
        type: 'success',
        text: `Verification link dispatched to ${emailCheck.sanitized}. Check your inbox!`
      });

      setTimeout(() => {
        setStatusMessage(null);
        if (onRegisterSuccess) {
          onRegisterSuccess({
            needsVerification: true,
            email: emailCheck.sanitized,
            role,
            user: result?.user
          });
        } else if (onNavigateToLogin) {
          onNavigateToLogin();
        }
      }, 700);
    } catch (err) {
      console.warn('Registration issue:', err.message);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Registration failed. Please verify your details.'
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    setStatusMessage({
      type: 'info',
      text: `Connecting ${provider.toUpperCase()} Sign-Up for ${role === 'freelancer' ? 'AI Creator' : 'Brand Client'}...`
    });
    setTimeout(() => {
      setStatusMessage(null);
      if (onRegisterSuccess) onRegisterSuccess(role);
    }, 1200);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#F8FAFC] relative overflow-x-hidden text-slate-900">
      {/* Background dot grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

      {/* Subtle warm ambient glow */}
      <div className="absolute -top-28 -left-28 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split-Card Container */}
      <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-12 z-10">

        {/* ================= LEFT SIDE: BRANDING & PERKS ================= */}
        <div className="md:col-span-5 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div>
            {/* Top Logo */}
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
              <span>Join the AI Frontier</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Launch your career <br />
              <span className="text-[#FF6B00]">in Generative AI.</span>
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Connect with premier creative agencies, monetize prompt workflows, and license synthetic video assets with guaranteed attribution.
            </p>

            {/* Value Proposition & Perks Cards */}
            <div className="mt-8 space-y-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">0% Commission First 3 Gigs</h4>
                  <p className="text-[11px] text-slate-400">Keep 100% of campaign payouts during your launch</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Verified Workflow Badge</h4>
                  <p className="text-[11px] text-slate-400">Prove ownership of seeds, models, and prompts</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-orange-200 hover:shadow-md transition-all group cursor-default">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Smart Escrow Protection</h4>
                  <p className="text-[11px] text-slate-400">Automated milestone releases & licensing agreements</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">GenLancer Network</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              2,400+ Verified Artists
            </span>
          </div>
        </div>

        {/* ================= RIGHT SIDE: SIGN-UP FORM ================= */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">

            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#FF6B00] text-white flex items-center justify-center text-[11px] font-black shadow-sm">
                GL
              </div>
              <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase">
                {role === 'freelancer' ? 'Creator Registration' : 'Brand Registration'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create your free account
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              {role === 'freelancer'
                ? 'Build an AI portfolio and receive direct briefs from brands.'
                : 'Post generative briefs and discover top AI directors and animators.'}
            </p>

            {/* Status notification toast */}
            {statusMessage && (
              <div className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in shadow-sm ${
                statusMessage.type === 'error' 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-orange-50 border-orange-200 text-orange-900'
              }`}>
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${statusMessage.type === 'error' ? 'text-rose-500' : 'text-[#FF6B00]'}`} />
                <span className="font-semibold">{statusMessage.text}</span>
              </div>
            )}

            {/* Dual Role Selector Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-xl mb-6 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setRole('freelancer')}
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
                onClick={() => setRole('company')}
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
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                or sign up with email
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {role === 'freelancer' ? 'Full Name' : 'Company / Agency Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={role === 'freelancer' ? 'e.g. Alex Smith' : 'e.g. CyberMedia Studios'}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                />
              </div>

              {/* Dynamic Role-specific Field */}
              {role === 'freelancer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary AI Specialization
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option>AI Filmmaking (Runway Gen-3 / Sora)</option>
                    <option>Diffusion Art & LoRA Tuning (SDXL / Flux)</option>
                    <option>3D Synthetic Modeling & Blender</option>
                    <option>AI Commercial Sound & Voice Synthesis</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimum 8 characters"
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

              {/* Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.agreedToTerms}
                  onChange={(e) => handleChange('agreedToTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#FF6B00] border-slate-300 rounded focus:ring-orange-500 cursor-pointer accent-[#FF6B00]"
                />
                <label htmlFor="terms" className="text-[11px] text-slate-500 leading-tight select-none cursor-pointer">
                  I agree to the GenLancer{' '}
                  <span className="text-[#FF6B00] underline font-semibold">Commercial Licensing Terms</span>{' '}
                  and AI Model attribution guidelines.
                </label>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create My Free Account</span>
                    <ArrowRight className="w-4 h-4 font-bold" />
                  </>
                )}
              </button>
            </form>

            {/* Navigation back to Login */}
            <p className="text-center text-xs text-slate-500 mt-6">
              Already have an account?{' '}
              <button 
                type="button"
                onClick={onNavigateToLogin}
                className="text-[#FF6B00] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <span>Sign In</span>
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
