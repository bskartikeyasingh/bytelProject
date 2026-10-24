// client/src/components/auth/Login.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, Building2, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { auth, googleProvider } from '../../firebase';
import { signInWithPopup } from 'firebase/auth';
import { signInUser } from '../../lib/supabase';
import { DEMO_USERS } from '../../data/demoUsers';

export default function Login({ 
  onNavigateToRegister, 
  onLoginSuccess,
  onNavigateToLanding,
  initialRole = 'freelancer'
}) {
  const [role, setRole] = useState(initialRole); // 'freelancer' | 'company'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialRole === 'company' ? 'apex@brand.demo' : 'aarav@genlancer.demo');
  const [password, setPassword] = useState(initialRole === 'company' ? 'Apex@123' : 'Aarav@123');
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        text: `Signed in as ${data.user.name || data.user.email} (${data.user.role})`
      });
      
      // Navigate to respective dashboard
      const targetRole = data.user.role === 'company' ? 'company' : 'freelancer';
      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(targetRole);
        } else if (typeof navigate === 'function') {
          navigate(data.user.role === 'company' ? '/company-dashboard' : '/creator-dashboard');
        }
      }, 500);
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
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await signInUser({ email, password });
      const detectedRole = data?.user?.user_metadata?.role || (role === 'company' ? 'company' : 'freelancer');
      setStatusMessage({
        type: 'success',
        text: `Signed in as ${data?.user?.user_metadata?.full_name || email} (${detectedRole})`
      });
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(detectedRole, data?.user);
      }, 500);
    } catch (err) {
      console.warn('Login issue:', err.message);
      setError(err.message || 'Invalid email or password.');
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid email or password. Please verify your credentials.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#F8FAFC] relative overflow-x-hidden text-slate-900">
      <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] p-8 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-[#FF6B00] text-white flex items-center justify-center text-[11px] font-black shadow-sm">
            GL
          </div>
          <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase">
            {role === 'freelancer' ? 'Creative Portal' : 'Enterprise Portal'}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {role === 'freelancer' 
            ? 'Manage your prompt library, submissions, and direct brand offers.' 
            : 'Publish creative briefs, verify creator seeds, and commission campaigns.'}
        </p>

        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" />
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
            <span className="text-[10px] text-slate-400 font-medium">Click to fill</span>
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
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>Continue to {role === 'freelancer' ? 'Creator Dashboard' : 'Brand Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{' '}
          <button 
            type="button"
            onClick={onNavigateToRegister}
            className="text-[#FF6B00] hover:underline font-bold cursor-pointer"
          >
            Create Free Account
          </button>
        </p>
      </div>
    </div>
  );
}
