import React, { useState, useEffect, useRef } from 'react';
import logoSrc from '../../assets/genlancer-logo-crop.png';
import './Hero3DLogo.css';

export default function Hero3DLogo() {
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Subtle interactive mouse parallax (disabled on prefers-reduced-motion)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const yPercent = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      // Restrained parallax tilt (subtle ±3.5deg max)
      setMouseTilt({
        x: -Math.max(-1, Math.min(1, yPercent)) * 3.5,
        y: Math.max(-1, Math.min(1, xPercent)) * 4,
      });
    };

    const handleMouseLeave = () => {
      setMouseTilt({ x: 0, y: 0 });
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousemove', handleMouseMove, { passive: true });
      el.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (el) {
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="hero-3d-stage relative flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 select-none w-full max-w-xl mx-auto"
      aria-label="GenLancer Brand Emblem"
    >
      {/* 1. Multi-layered Ambient Warm Peach & Orange Radial Glows */}
      <div 
        className="hero-glow-anim absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[480px] sm:h-[480px] lg:w-[560px] lg:h-[560px] rounded-full pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.16) 0%, rgba(255,185,115,0.08) 45%, rgba(255,255,255,0) 72%)',
          transform: `translate(-50%, -50%) translate3d(${mouseTilt.y * -2}px, ${mouseTilt.x * -2}px, 0)`,
          transition: 'transform 0.4s ease-out',
        }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px] rounded-full pointer-events-none -z-10 blur-2xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(255,140,40,0.25) 0%, rgba(255,200,140,0.1) 50%, transparent 70%)',
        }}
      />

      {/* Floating Understated Ambient Orange Particles */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden -z-10"
        style={{
          transform: `translate3d(${mouseTilt.y * -1.2}px, ${mouseTilt.x * -1.2}px, 0)`,
          transition: 'transform 0.4s ease-out',
        }}
      >
        <span className="hero-particle-1 absolute top-[18%] left-[14%] w-1.5 h-1.5 rounded-full bg-[#FF6B00]/45 blur-[0.5px]" />
        <span className="hero-particle-2 absolute top-[26%] right-[16%] w-2 h-2 rounded-full bg-[#FFA050]/50 blur-[0.5px]" />
        <span className="hero-particle-1 absolute bottom-[30%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#FF6B00]/35" />
        <span className="hero-particle-2 absolute bottom-[24%] right-[14%] w-2 h-2 rounded-full bg-[#FF7A1A]/45 blur-[0.5px]" />
      </div>

      {/* 3D Assembly Wrapper for Rings, Ground Shadow, and Emblem */}
      <div 
        className="relative flex items-center justify-center w-[270px] h-[270px] sm:w-[340px] sm:h-[340px] lg:w-[410px] lg:h-[410px] preserve-3d"
        style={{
          transform: `rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`,
          transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* 2. Thin Concentric Orbital Rings */}
        <div className="hero-rings-anim absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Ring 1 - Inner Dashed Orange Ring */}
          <div 
            className="hero-ring-1 absolute w-[230px] h-[230px] sm:w-[290px] sm:h-[290px] lg:w-[350px] lg:h-[350px] rounded-full border border-dashed border-[#FF6B00]/30 pointer-events-none"
            style={{ transformOrigin: 'center center' }}
          />

          {/* Ring 2 - Middle Gradient Ring */}
          <div 
            className="hero-ring-2 absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] lg:w-[420px] lg:h-[420px] rounded-full border border-[#FFA050]/25 pointer-events-none"
            style={{ 
              boxShadow: '0 0 25px rgba(255, 107, 0, 0.06) inset',
              transformOrigin: 'center center',
            }}
          />

          {/* Ring 3 - Outer Orbital Track with Accent Glowing Node */}
          <div 
            className="hero-ring-3 absolute w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] lg:w-[480px] lg:h-[480px] rounded-full border border-slate-300/60 pointer-events-none flex items-center justify-start"
            style={{ transformOrigin: 'center center' }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shadow-[0_0_10px_#FF6B00,0_0_2px_#FFF]" />
          </div>
        </div>

        {/* 3. Physical Grounding Shadow Ellipse */}
        <div 
          className="hero-ground-shadow absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 w-[180px] sm:w-[240px] lg:w-[290px] h-3.5 sm:h-4.5 rounded-[100%] bg-gradient-to-r from-orange-950/0 via-orange-950/10 to-orange-950/0 blur-[6px] pointer-events-none -z-10"
        />

        {/* 4. Original Standalone Emblem — Increased Visual Prominence (210px to 310px) */}
        <div className="hero-logo-3d-anim relative z-10 w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] lg:w-[310px] lg:h-[310px] flex items-center justify-center">
          <img
            src={logoSrc}
            alt="GenLancer Original Logo"
            className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_24px_32px_rgba(255,107,0,0.26)] drop-shadow-[0_6px_14px_rgba(0,0,0,0.05)]"
            loading="eager"
            decoding="async"
            draggable="false"
          />
        </div>
      </div>

      {/* 5. Complete Brand Wordmark & Subtitle Beneath Emblem (Balanced Composition) */}
      <div className="hero-text-anim mt-5 sm:mt-7 text-center space-y-1 z-10">
        <div className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-[#FF6B00] leading-none drop-shadow-xs">
          GenLancer
        </div>
        <p className="text-xs sm:text-[13px] font-bold tracking-widest uppercase text-slate-500">
          AI-Native Creator Marketplace
        </p>
      </div>
    </div>
  );
}
