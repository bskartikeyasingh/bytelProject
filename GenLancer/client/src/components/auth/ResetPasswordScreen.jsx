import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { 
  handlePasswordRecoveryCallback, 
  updateUserPassword, 
  signOutUser 
} from '../../lib/supabase';

export default function ResetPasswordScreen({ 
  onNavigateToLogin, 
  onNavigateToForgotPassword,
  onNavigateToLanding 
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionState, setSessionState] = useState('checking'); // 'checking' | 'ready' | 'invalid' | 'expired' | 'success'
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  // Validate recovery session on mount
  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      try {
        const result = await handlePasswordRecoveryCallback();
        if (!isMounted) return;

        if (result.status === 'recovery_ready' || result.status === 'simulated_verified') {
          setSessionState('ready');
        } else if (result.status === 'error') {
          setSessionState(result.code === 'otp_expired' ? 'expired' : 'invalid');
          setErrorMessage(result.message || 'Password recovery link has expired or is invalid.');
        } else {
          setSessionState('invalid');
          setErrorMessage('No active password recovery session found. Please request a new reset link.');
        }
      } catch (err) {
        if (!isMounted) return;
        setSessionState('invalid');
        setErrorMessage(err.message || 'Unable to establish recovery session.');
      }
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStatusNotification(null);

    // 1. Password length validation
    if (!password || password.length < 8) {
      setStatusNotification({
        type: 'error',
        text: 'New password must be at least 8 characters long.'
      });
      return;
    }

    // 2. Password matching validation
    if (password !== confirmPassword) {
      setStatusNotification({
        type: 'error',
        text: 'Passwords do not match. Please ensure both fields are identical.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateUserPassword(password);

      setSessionState('success');
      setStatusNotification({
        type: 'success',
        text: 'Password updated successfully! Redirecting to sign in...'
      });

      // Terminate temporary recovery session and clean up
      await signOutUser();

      // Clean browser history URL without reload
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Route to login after short delay
      setTimeout(() => {
        if (onNavigateToLogin) onNavigateToLogin();
      }, 1800);
    } catch (err) {
      console.error('Password update failed:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to update password. Your recovery link may have expired.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#F8FAFC] relative overflow-x-hidden text-slate-900">
      {/* Background delicate dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

      {/* Subtle warm ambient glow */}
      <div className="absolute -top-28 -left-28 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden z-10 p-6 sm:p-10 md:p-12">
        
        {/* Header: Logo */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
          <button
            type="button"
            onClick={onNavigateToLanding}
            className="cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-xl transition-opacity hover:opacity-90"
            aria-label="Return to GenLancer Home"
          >
            <GenLancerLogo className="w-10 h-10" textColor="text-slate-900" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-bold shadow-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Password Reset</span>
          </div>
        </div>

        {/* 1. Checking Session State */}
        {sessionState === 'checking' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Verifying recovery credentials...</h2>
            <p className="text-xs text-slate-500">Authenticating password reset session with Supabase Auth.</p>
          </div>
        )}

        {/* 2. Success State */}
        {sessionState === 'success' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Password Reset Complete!</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="py-3 px-6 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-500/25 cursor-pointer"
              >
                Continue to Sign In
              </button>
            </div>
          </div>
        )}

        {/* 3. Expired or Invalid Link State */}
        {(sessionState === 'invalid' || sessionState === 'expired') && (
          <div className="flex flex-col items-center text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center ring-4 ring-rose-50">
              <AlertCircle className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold tracking-widest text-rose-600 uppercase">
              {sessionState === 'expired' ? 'Link Expired' : 'Invalid Reset Session'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {sessionState === 'expired' ? 'Reset link has expired' : 'Recovery link is invalid'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
              {errorMessage || 'This recovery link has expired or has already been used to reset an account password.'}
            </p>

            <div className="w-full pt-4 space-y-3">
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Request a New Reset Link</span>
                <ArrowRight className="w-4 h-4 font-bold" />
              </button>

              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        )}

        {/* 4. Active Recovery Session: New Password Form */}
        {sessionState === 'ready' && (
          <div className="flex flex-col items-center text-center">
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 mb-5 ring-4 ring-orange-100 animate-fade-in">
              <KeyRound className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase mb-1">
              Choose New Credentials
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create new password
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
              Your recovery link was verified. Choose a strong password of at least 8 characters.
            </p>

            {/* Notification Toast */}
            {statusNotification && (
              <div className={`mt-4 w-full p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left animate-fade-in shadow-xs ${
                statusNotification.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {statusNotification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span className="font-semibold flex-1 leading-relaxed">{statusNotification.text}</span>
              </div>
            )}

            {/* Password Update Form */}
            <form onSubmit={handleUpdatePassword} className="mt-6 w-full space-y-4 text-left">
              
              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Match / Strength Indicator */}
              {password && confirmPassword && (
                <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                  password === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4 font-bold" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="mt-8 pt-5 w-full border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
