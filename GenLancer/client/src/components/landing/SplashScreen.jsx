import React, { useEffect, useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import logoSrc from '../../assets/genlancer-logo-crop.png';
import './SplashScreen.css';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing AI Network...');
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Smooth initialization progression over ~3.2 seconds
  useEffect(() => {
    const totalDuration = 3200;
    const intervalTime = 30;
    const step = (100 / (totalDuration / intervalTime));

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(progressTimer);
  }, []);

  // Sync contextual status text with loading progress
  useEffect(() => {
    if (progress < 38) {
      setStatusText('Initializing AI Network...');
    } else if (progress < 76) {
      setStatusText('Preparing your workspace...');
    } else {
      setStatusText('Loading your experience...');
    }

    // Trigger seamless transition into app when loading completes
    if (progress >= 100) {
      const exitTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 150);
      return () => clearTimeout(exitTimer);
    }
  }, [progress, onFinish]);

  // Subtle 3D mouse parallax on desktop (disabled when prefers-reduced-motion)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const { innerWidth, innerHeight } = window;
      const xPercent = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const yPercent = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      // Subtle parallax angles (max 5deg)
      setMouseTilt({
        x: -yPercent * 4.5,
        y: xPercent * 5.5,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="GenLancer Application Loading"
    >
      {/* Background Layer: Subtle Warm Peach & Orange Radial Ambient Glow (Pure Light Theme) */}
      <div 
        className="splash-ambient-glow absolute top-1/2 left-1/2 w-[520px] h-[520px] sm:w-[760px] sm:h-[760px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.13) 0%, rgba(255,175,100,0.06) 42%, rgba(255,255,255,0) 72%)',
          transform: `translate(-50%, -50%) translate3d(${mouseTilt.y * -2}px, ${mouseTilt.x * -2}px, 0)`,
          transition: 'transform 0.4s ease-out',
        }}
      />

      {/* Floating Ambient Understated Orange Sparks / Particles */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          transform: `translate3d(${mouseTilt.y * -1.5}px, ${mouseTilt.x * -1.5}px, 0)`,
          transition: 'transform 0.4s ease-out',
        }}
      >
        <span className="splash-particle-1 absolute top-[26%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#FF6B00]/35 blur-[0.5px]" />
        <span className="splash-particle-2 absolute top-[32%] right-[22%] w-2 h-2 rounded-full bg-[#FFA050]/40 blur-[0.5px]" />
        <span className="splash-particle-1 absolute bottom-[30%] left-[24%] w-1.5 h-1.5 rounded-full bg-[#FF6B00]/25" />
        <span className="splash-particle-2 absolute bottom-[24%] right-[20%] w-2 h-2 rounded-full bg-[#FF7A1A]/35 blur-[0.5px]" />
        <span className="splash-particle-1 absolute top-[18%] right-[36%] w-1 h-1 rounded-full bg-[#FF6B00]/30" />
      </div>

      {/* Top Label: THE AI CREATOR MARKETPLACE */}
      <div className="pt-2 sm:pt-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.25em] relative z-20">
        <Sparkles className="w-3.5 h-3.5 text-[#FF6B00] animate-pulse" />
        <span>The AI Creator Marketplace</span>
      </div>

      {/* Center 3D Stage Viewport with Significantly Larger Original Logo */}
      <div className="splash-stage-viewport flex flex-col items-center justify-center my-auto relative z-20 w-full max-w-xl">
        {/* Relative 3D Assembly Wrapper */}
        <div 
          className="relative flex items-center justify-center w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] preserve-3d"
          style={{
            transform: `rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`,
            transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {/* 3D Concentric Orbital Rings with Independent Motions */}
          {/* Ring 1 - Inner Orbital Ring */}
          <div 
            className="splash-ring-inner absolute w-[230px] h-[230px] sm:w-[330px] sm:h-[330px] rounded-full border border-dashed border-[#FF6B00]/25 pointer-events-none"
            style={{ transformOrigin: 'center center' }}
          />

          {/* Ring 2 - Middle Gradient Ring */}
          <div 
            className="splash-ring-middle absolute w-[280px] h-[280px] sm:w-[390px] sm:h-[390px] rounded-full border border-[#FFA050]/20 pointer-events-none"
            style={{ 
              boxShadow: '0 0 25px rgba(255, 107, 0, 0.06) inset',
              transformOrigin: 'center center',
            }}
          />

          {/* Ring 3 - Outer Orbital Track with Accent Node */}
          <div 
            className="splash-ring-outer absolute w-[330px] h-[330px] sm:w-[450px] sm:h-[450px] rounded-full border border-slate-200/60 pointer-events-none flex items-center justify-start"
            style={{ transformOrigin: 'center center' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
          </div>

          {/* AI Neural Network Node Pulses (Behind Logo Plane) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* SVG Connecting Constellation Lines */}
            <svg 
              className="w-full h-full opacity-35" 
              viewBox="0 0 200 200" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="55" y1="80" x2="100" y2="40" stroke="#FF6B00" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="100" y1="40" x2="150" y2="65" stroke="#FF6B00" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="150" y1="65" x2="160" y2="125" stroke="#FF6B00" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="55" y1="80" x2="68" y2="140" stroke="#FF6B00" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* Glowing Network Nodes */}
            <div className="splash-node-pulse-1 absolute top-[20%] left-[48%] w-2.5 h-2.5 rounded-full bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]" />
            <div className="splash-node-pulse-2 absolute top-[32%] right-[24%] w-2 h-2 rounded-full bg-[#FF8C33] shadow-[0_0_8px_#FF8C33]" />
            <div className="splash-node-pulse-3 absolute top-[38%] left-[26%] w-2 h-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
          </div>

          {/* The Exact Original GenLancer Logo Asset — Sized to ~260–280px Desktop / ~180–200px Mobile */}
          <div className="splash-logo-animated relative z-10 w-[190px] h-[190px] sm:w-[270px] sm:h-[270px] flex items-center justify-center">
            <img
              src={logoSrc}
              alt="GenLancer Original Logo"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_20px_28px_rgba(255,107,0,0.28)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </div>
        </div>

        {/* Brand Name (Full Orange) & Slate Subtitle */}
        <div className="splash-text-fade flex flex-col items-center text-center mt-5 sm:mt-7 px-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#FF6B00]">
            GenLancer
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 tracking-wide max-w-sm sm:max-w-md">
            Connecting Verified AI Creators with Global Brands
          </p>
        </div>
      </div>

      {/* Centered Bottom Progress Indicator (Skip Option Completely Removed) */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 relative z-20 pb-2 sm:pb-4">
        {/* Loading Bar Track */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
          <div 
            className="bg-gradient-to-r from-[#FF8C33] via-[#FF6B00] to-[#E05E00] h-full rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_rgba(255,107,0,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Text & Percentage - Clean Light Theme */}
        <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-medium px-0.5">
          <span className="tracking-wide text-slate-500 font-medium">{statusText}</span>
          <span className="font-mono text-[#FF6B00] font-semibold">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
