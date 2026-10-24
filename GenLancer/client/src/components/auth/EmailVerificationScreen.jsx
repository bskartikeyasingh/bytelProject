import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Building2
} from 'lucide-react';
import GenLancerLogo from './GenLancerLogo';
import { maskEmail, validateRegistrationEmail } from '../../lib/emailSecurity';
import { resendVerificationEmail } from '../../lib/supabase';

export default function EmailVerificationScreen({ 
  email = '', 
  role = 'freelancer',
  initialStatus = null, // null | 'expired' | 'invalid' | 'already_verified'
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToLanding
}) {
  const [currentEmail, setCurrentEmail] = useState(email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState(email);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    initialStatus === 'expired'
      ? { type: 'error', text: 'This verification link has expired or has already been used. Please request a new one.' }
      : initialStatus === 'invalid'
      ? { type: 'error', text: 'The verification token is invalid. Please request a new verification link below.' }
      : initialStatus === 'already_verified'
      ? { type: 'success', text: 'Your account is already verified! You can sign in immediately.' }
      : null
  );

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending) return;

    const emailToUse = currentEmail.trim();
    const check = validateRegistrationEmail(emailToUse);
    if (!check.valid) {
      setStatusMessage({ type: 'error', text: check.error });
      return;
    }

    setIsResending(true);
    setStatusMessage(null);

    try {
      await resendVerificationEmail(emailToUse);
      setStatusMessage({
        type: 'success',
        text: `A fresh verification link has been sent to ${maskEmail(emailToUse)}.`
      });
      setCooldownSeconds(60);
    } catch (err) {
      console.warn('Resend verification issue:', err.message);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to dispatch verification email. Please try again shortly.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveEmail = (e) => {
    e.preventDefault();
    const check = validateRegistrationEmail(newEmailInput);
    if (!check.valid) {
      setStatusMessage({ type: 'error', text: check.error });
      return;
    }
    setCurrentEmail(check.sanitized);
    setIsEditingEmail(false);
    setStatusMessage({
      type: 'info',
      text: `Updated target email to ${maskEmail(check.sanitized)}. Click "Resend verification link" to deliver the link.`
    });
    setCooldownSeconds(0);
  };

  const roleLabel = role === 'company' ? 'Brand / Agency Client' : 'AI Creator';

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-10 bg-[#F8FAFC] relative overflow-x-hidden text-slate-900">
      {/* Background delicate dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

      {/* Subtle warm ambient glow */}
      <div className="absolute -top-28 -left-28 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden z-10 p-6 sm:p-10 md:p-12">
        
        {/* Header: Logo and Navigation */}
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
            {role === 'company' ? <Building2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{roleLabel}</span>
          </div>
        </div>

        {/* Hero Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 mb-5 ring-4 ring-orange-100 animate-fade-in">
            <Mail className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <span className="text-[11px] font-bold tracking-widest text-[#FF6B00] uppercase mb-1">
            One-Time Link Verification
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Check your email
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
            We've sent a secure, one-time verification link to:
          </p>

          {/* Masked / Highlighted Email Display */}
          <div className="mt-2.5 px-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl inline-flex items-center gap-2 max-w-full">
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 truncate">
              {currentEmail ? maskEmail(currentEmail) : 'your email address'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditingEmail(!isEditingEmail);
                setNewEmailInput(currentEmail);
              }}
              className="text-[11px] text-[#FF6B00] hover:text-[#E05E00] font-semibold hover:underline cursor-pointer ml-1"
            >
              {isEditingEmail ? 'Cancel' : 'Change'}
            </button>
          </div>

          {/* Inline Email Edit Form (if requested) */}
          {isEditingEmail && (
            <form onSubmit={handleSaveEmail} className="mt-3 w-full max-w-sm flex items-center gap-2">
              <input
                type="email"
                required
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="new@example.com"
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 rounded-xl py-2 px-3 text-xs text-slate-900 outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Update
              </button>
            </form>
          )}

          {/* Status Toast / Alert */}
          {statusMessage && (
            <div className={`mt-4 w-full p-3 rounded-xl border text-xs flex items-center gap-2 text-left animate-fade-in shadow-xs ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              ) : statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-[#FF6B00] shrink-0" />
              )}
              <span className="font-semibold flex-1 leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Instructions Box */}
          <div className="mt-6 w-full text-left bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                1
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open your email inbox and find the verification message from <span className="font-semibold text-slate-800">GenLancer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                2
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click the <span className="font-semibold text-slate-800">Confirm Your Account</span> magic link. The token is time-limited and valid for one-time use.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                3
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You will be automatically verified and redirected to your <span className="font-semibold text-slate-800">{roleLabel} Dashboard</span>.
              </p>
            </div>
          </div>

          {/* Helpful Tips Alert */}
          <div className="mt-4 w-full flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-800 text-left">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Didn't see the email? Please check your <strong>Spam</strong> or <strong>Promotions</strong> folder.</span>
          </div>

          {/* Resend Action with Cooldown Timer */}
          <div className="mt-6 w-full flex flex-col items-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldownSeconds > 0 || isResending}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                cooldownSeconds > 0 || isResending
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-orange-50 border border-orange-200 text-[#FF6B00] shadow-sm hover:shadow'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? (
                <span>Dispatching fresh link...</span>
              ) : cooldownSeconds > 0 ? (
                <span>Resend link in {cooldownSeconds}s</span>
              ) : (
                <span>Resend verification link</span>
              )}
            </button>
          </div>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 w-full border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            {onNavigateToRegister && (
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#FF6B00] hover:underline font-semibold cursor-pointer"
              >
                Sign up with different details
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
