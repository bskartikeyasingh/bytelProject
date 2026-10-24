import React, { useState, useEffect } from 'react';
import SplashScreen from './components/landing/SplashScreen';
import LandingPage from './components/landing/LandingPage';
import TemplateCreativeStudioLight from './components/auth/TemplateCreativeStudioLight';
import RegisterPage from './components/auth/RegisterPage';
import EmailVerificationScreen from './components/auth/EmailVerificationScreen';
import ForgotPasswordScreen from './components/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './components/auth/ResetPasswordScreen';
import CreatorDashboard from './components/dashboard/CreatorDashboard';
import CompanyDashboard from './components/dashboard/CompanyDashboard';
import { supabase, isSupabaseConfigured, signOutUser, handleEmailVerificationCallback } from './lib/supabase';

export default function App() {
  // Application routing views: 'splash' | 'landing' | 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password' | 'creator-dashboard' | 'company-dashboard'
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

      if (
        pathname === '/reset-password' || 
        searchParams.get('view') === 'reset-password' ||
        searchParams.get('type') === 'recovery' ||
        hashParams.get('type') === 'recovery'
      ) {
        return 'reset-password';
      }
      if (pathname === '/forgot-password' || searchParams.get('view') === 'forgot-password') {
        return 'forgot-password';
      }
    }
    return 'splash';
  });

  const [initialRole, setInitialRole] = useState('freelancer'); // 'freelancer' | 'company'
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationRole, setVerificationRole] = useState('freelancer');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Restore existing Supabase Auth / localStorage session and process verification links on mount
  useEffect(() => {
    // If on reset-password or forgot-password, do not auto-redirect away to dashboard
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const isResetFlow = pathname === '/reset-password' || 
                        searchParams.get('view') === 'reset-password' || 
                        searchParams.get('type') === 'recovery' ||
                        hashParams.get('type') === 'recovery';

    const isForgotFlow = pathname === '/forgot-password' || 
                         searchParams.get('view') === 'forgot-password';

    if (isResetFlow) {
      setCurrentView('reset-password');
    } else if (isForgotFlow) {
      setCurrentView('forgot-password');
    }

    // 1. Process Magic-Link / Token Verification URL if present
    handleEmailVerificationCallback().then(result => {
      if (result.status === 'success') {
        setCurrentUser(result.user);
        const targetView = result.role === 'company' ? 'company-dashboard' : 'creator-dashboard';
        setCurrentView(targetView);
        return;
      } else if (result.status === 'error') {
        setVerificationStatus(result.code === 'otp_expired' ? 'expired' : 'invalid');
        setCurrentView('verify-email');
        return;
      }

      // If user is undergoing password recovery, retain reset-password view
      if (isResetFlow || isForgotFlow) {
        return;
      }

      // 2. If no callback, restore existing session from storage if verified
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) {
        try {
          const parsed = JSON.parse(storedUser);
          setCurrentUser(parsed);
        } catch (e) {}
      }

      if (isSupabaseConfigured) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && !isResetFlow && !isForgotFlow) {
            // Require verified email for real users
            const isConfirmed = session.user.confirmed_at || session.user.email_confirmed_at;
            if (session.user.identities && session.user.identities.length > 0 && !isConfirmed) {
              setVerificationEmail(session.user.email);
              setVerificationRole(session.user.user_metadata?.role || 'freelancer');
              setCurrentView('verify-email');
              return;
            }

            setCurrentUser(prev => prev || session.user);
            const userRole = session.user.user_metadata?.role || localStorage.getItem('genlancer_active_role') || 'freelancer';
            if (userRole === 'company') {
              setCurrentView('company-dashboard');
            } else {
              setCurrentView('creator-dashboard');
            }
          }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setCurrentView('reset-password');
            return;
          }

          if (event === 'SIGNED_IN' && session?.user && !isResetFlow) {
            const isConfirmed = session.user.confirmed_at || session.user.email_confirmed_at;
            if (session.user.identities && session.user.identities.length > 0 && !isConfirmed) {
              setVerificationEmail(session.user.email);
              setVerificationRole(session.user.user_metadata?.role || 'freelancer');
              setCurrentView('verify-email');
              return;
            }

            setCurrentUser(prev => prev || session.user);
            const userRole = session.user.user_metadata?.role || localStorage.getItem('genlancer_active_role') || 'freelancer';
            if (userRole === 'company') {
              setCurrentView('company-dashboard');
            } else {
              setCurrentView('creator-dashboard');
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            if (!isResetFlow && !isForgotFlow) {
              setCurrentView('login');
            }
          }
        });

        return () => subscription?.unsubscribe();
      }
    });
  }, []);

  const handleLoginSuccess = (role, userPayload) => {
    localStorage.setItem('genlancer_active_role', role);
    if (userPayload) {
      setCurrentUser(userPayload);
    } else {
      const stored = localStorage.getItem('user');
      if (stored) {
        try { setCurrentUser(JSON.parse(stored)); } catch (e) {}
      }
    }
    if (role === 'company') {
      setCurrentView('company-dashboard');
    } else {
      setCurrentView('creator-dashboard');
    }
  };

  const handleRegisterSuccess = (payload) => {
    if (payload && typeof payload === 'object' && payload.needsVerification) {
      setVerificationEmail(payload.email || '');
      setVerificationRole(payload.role || 'freelancer');
      setVerificationStatus(null);
      setCurrentView('verify-email');
      return;
    }

    const role = typeof payload === 'string' ? payload : (payload?.role || 'freelancer');
    localStorage.setItem('genlancer_active_role', role);
    if (payload && typeof payload === 'object' && payload.user) {
      setCurrentUser(payload.user);
    }
    if (role === 'company') {
      setCurrentView('company-dashboard');
    } else {
      setCurrentView('creator-dashboard');
    }
  };

  const handleGoToRegister = (role = 'freelancer') => {
    setInitialRole(role);
    setCurrentView('register');
  };

  const handleGoToLogin = (role = 'freelancer') => {
    setInitialRole(role);
    setCurrentView('login');
  };

  const handleGoToForgotPassword = (prefillEmail = '') => {
    setForgotPasswordEmail(prefillEmail);
    setCurrentView('forgot-password');
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setCurrentView('login');
  };

  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-[#F8FAFC] flex flex-col">
      {/* 1. Splash Screen View */}
      {currentView === 'splash' && (
        <SplashScreen 
          onFinish={() => setCurrentView('landing')} 
        />
      )}

      {/* 2. Main Landing Page View */}
      {currentView === 'landing' && (
        <LandingPage 
          onNavigateToLogin={() => handleGoToLogin('freelancer')}
          onNavigateToRegister={handleGoToRegister}
          onNavigateToBrandRegister={() => handleGoToRegister('company')}
          onNavigateToCreatorRegister={() => handleGoToRegister('freelancer')}
        />
      )}

      {/* 3. Authentication: Login View */}
      {currentView === 'login' && (
        <TemplateCreativeStudioLight 
          initialRole={initialRole}
          onNavigateToRegister={() => handleGoToRegister(initialRole)}
          onNavigateToLanding={() => setCurrentView('landing')}
          onNavigateToVerification={(emailToVerify, roleToVerify) => {
            setVerificationEmail(emailToVerify);
            setVerificationRole(roleToVerify || initialRole);
            setCurrentView('verify-email');
          }}
          onNavigateToForgotPassword={handleGoToForgotPassword}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 4. Authentication: Register View */}
      {currentView === 'register' && (
        <RegisterPage 
          initialRole={initialRole}
          onNavigateToLogin={() => handleGoToLogin(initialRole)}
          onNavigateToLanding={() => setCurrentView('landing')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {/* 5. One-Time Magic Link Verification View */}
      {currentView === 'verify-email' && (
        <EmailVerificationScreen 
          email={verificationEmail}
          role={verificationRole}
          initialStatus={verificationStatus}
          onNavigateToLogin={() => handleGoToLogin(verificationRole)}
          onNavigateToRegister={() => handleGoToRegister(verificationRole)}
          onNavigateToLanding={() => setCurrentView('landing')}
        />
      )}

      {/* 6. Forgot Password Email Dispatch View */}
      {currentView === 'forgot-password' && (
        <ForgotPasswordScreen 
          initialEmail={forgotPasswordEmail}
          onNavigateToLogin={() => handleGoToLogin(initialRole)}
          onNavigateToLanding={() => setCurrentView('landing')}
        />
      )}

      {/* 7. Reset Password New Credentials View */}
      {currentView === 'reset-password' && (
        <ResetPasswordScreen 
          onNavigateToLogin={() => handleGoToLogin(initialRole)}
          onNavigateToForgotPassword={() => handleGoToForgotPassword(forgotPasswordEmail)}
          onNavigateToLanding={() => setCurrentView('landing')}
        />
      )}

      {/* 8. Creator Hub & AI Portfolio Dashboard */}
      {currentView === 'creator-dashboard' && (
        <CreatorDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 9. Company & Brand Enterprise Dashboard */}
      {currentView === 'company-dashboard' && (
        <CompanyDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
