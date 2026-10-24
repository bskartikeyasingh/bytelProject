import React from 'react';

export default function SocialAuthButtons({ onOAuthClick }) {
  const handleClick = (provider) => {
    if (onOAuthClick) {
      onOAuthClick(provider);
    }
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => handleClick('google')}
        className="w-full group flex items-center justify-center gap-2.5 py-2.5 px-4 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-sm font-medium text-slate-200 transition-all duration-150 shadow-sm cursor-pointer hover:shadow-md"
      >
        <svg className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
          <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"/>
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.8 7.4 23 12 23z"/>
        </svg>
        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Continue with Google</span>
      </button>
    </div>
  );
}
