import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ArrowLeft, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { validateEmailFormat, maskEmail } from '../../lib/emailSecurity';
import { sendPasswordResetEmail } from '../../lib/supabase';

export default function ForgotPasswordScreen({ 
  initialEmail = '',
  onNavigateToLogin,
  onNavigateToLanding
}) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || cooldownSeconds > 0) return;

    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.valid) {
      setStatusMessage({ type: 'error', text: emailCheck.error });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const result = await sendPasswordResetEmail(emailCheck.sanitized);

      if (result.isDemo) {
        setStatusMessage({
          type: 'demo',
          text: result.message
        });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setCooldownSeconds(60);
      setStatusMessage({
        type: 'success',
        text: 'If an account exists for this email, you will receive a password reset link shortly.'
      });
    } catch (err) {
      console.warn('Forgot password notice:', err.message);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to process reset request. Please try again shortly.'
      });
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

      {/* Main Container Card */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden z-10 p-6 sm:p-10 md:p-12">
        
        {/* Header: Logo & Return */}
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
            <KeyRound className="w-3.5 h-3.5" />
            <span>Account Security</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-center text-center">
          
          {/* Badge Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 mb-5 ring-4 ring-orange-100 animate-fade-in">
            {isSubmitted ? <Mail className="w-8 h-8 sm:w-10 sm:h-10" /> : <KeyRound className="w-8 h-8 sm:w-10 sm:h-10" />}
          </div>

          <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase mb-1">
            {isSubmitted ? 'Reset Link Dispatched' : 'Password Recovery'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isSubmitted ? 'Check your inbox' : 'Forgot your password?'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
            {isSubmitted 
              ? `We have dispatched recovery instructions to ${maskEmail(email)}. Click the secure link inside the email to choose a new password.`
              : 'Enter the email address registered with your GenLancer account. We will send a secure, one-time link to reset your password.'}
          </p>

          {/* Status Message / Notification */}
          {statusMessage && (
            <div className={`mt-4 w-full p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left animate-fade-in shadow-xs ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : statusMessage.type === 'demo'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'demo' ? (
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold flex-1 leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Form or Submitted State */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com or creator@domain.com"
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-3 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] active:bg-[#c2410c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Dispatching reset link...</span>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4 font-bold" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-6 w-full space-y-4">
              {/* Instructions */}
              <div className="text-left bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Open your email inbox and click the reset link sent by <span className="font-semibold text-slate-800">GenLancer</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your new password and confirm the update.
                  </p>
                </div>
              </div>

              {/* Tips notice */}
              <div className="flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-800 text-left">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Didn't receive the email? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.</span>
              </div>

              {/* Resend button with cooldown */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cooldownSeconds > 0 
                  ? `Resend link available in ${cooldownSeconds}s`
                  : 'Resend Password Reset Link'}
              </button>
            </div>
          )}

          {/* Footer: Back to Sign In */}
          <div className="mt-8 pt-5 w-full border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
