import React from 'react';
import logoSrc from '../../assets/genlancer-logo-crop.png';

export default function GenLancerLogo({ 
  className = "w-10 h-10", 
  showText = true, 
  textColor = "text-slate-900",
  layout = "horizontal", // "horizontal" | "stacked"
  textSize = "text-2xl"
}) {
  const isStacked = layout === "stacked";

  return (
    <div className={`flex ${isStacked ? 'flex-col items-center gap-4' : 'items-center gap-2.5 sm:gap-3'}`}>
      {/* Exact Original Standalone Orange GenLancer Logo Emblem */}
      <img
        src={logoSrc}
        alt="GenLancer Emblem"
        className={`${className} object-contain select-none pointer-events-none drop-shadow-sm flex-shrink-0`}
        loading="eager"
        decoding="async"
        draggable="false"
      />

      {showText && (
        <span className={`${textSize} font-black tracking-tight ${textColor} leading-none`}>
          {isStacked ? (
            <span className="text-[#FF6B00] tracking-normal">GenLancer</span>
          ) : (
            <>Gen<span className="text-[#FF6B00]">Lancer</span></>
          )}
        </span>
      )}
    </div>
  );
}
