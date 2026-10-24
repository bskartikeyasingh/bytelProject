import React, { useState, useEffect } from 'react';
import SplashScreen from './components/landing/SplashScreen';
import LandingPage from './components/landing/LandingPage';
import TemplateCreativeStudioLight from './components/auth/TemplateCreativeStudioLight';
import RegisterPage from './components/auth/RegisterPage';
import CreatorDashboard from './components/dashboard/CreatorDashboard';
import CompanyDashboard from './components/dashboard/CompanyDashboard';
import { supabase, isSupabaseConfigured, signOutUser } from './lib/supabase';

export default function App() {
  // Application routing views: 'splash' | 'landing' | 'login' | 'register' | 'creator-dashboard' | 'company-dashboard'
  const [currentView, setCurrentView] = useState('splash');
  const [initialRole, setInitialRole] = useState('freelancer'); // 'freelancer' | 'company'
  const [currentUser, setCurrentUser] = useState(null);

  // Restore existing Supabase Auth session on application mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
          const userRole = session.user.user_metadata?.role || localStorage.getItem('genlancer_active_role') || 'freelancer';
          if (userRole === 'company') {
            setCurrentView('company-dashboard');
          } else {
            setCurrentView('creator-dashboard');
          }
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user);
          const userRole = session.user.user_metadata?.role || localStorage.getItem('genlancer_active_role') || 'freelancer';
          if (userRole === 'company') {
            setCurrentView('company-dashboard');
          } else {
            setCurrentView('creator-dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setCurrentView('login');
        }
      });

      return () => subscription?.unsubscribe();
    }
  }, []);

  const handleLoginSuccess = (role) => {
    localStorage.setItem('genlancer_active_role', role);
    if (role === 'company') {
      setCurrentView('company-dashboard');
    } else {
      setCurrentView('creator-dashboard');
    }
  };

  const handleRegisterSuccess = (role) => {
    localStorage.setItem('genlancer_active_role', role);
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

      {/* 5. Creator Hub & AI Portfolio Dashboard */}
      {currentView === 'creator-dashboard' && (
        <CreatorDashboard 
          user={currentUser}
          onLogout={handleLogout}
          onSwitchToCompany={() => {
            localStorage.setItem('genlancer_active_role', 'company');
            setCurrentView('company-dashboard');
          }}
        />
      )}

      {/* 6. Company & Brand Enterprise Dashboard */}
      {currentView === 'company-dashboard' && (
        <CompanyDashboard 
          user={currentUser}
          onLogout={handleLogout}
          onSwitchToCreator={() => {
            localStorage.setItem('genlancer_active_role', 'freelancer');
            setCurrentView('creator-dashboard');
          }}
        />
      )}
    </div>
  );
}
