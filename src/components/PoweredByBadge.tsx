import React from 'react';

export const PoweredByBadge: React.FC = () => {
  return (
    <div
      className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5 pointer-events-auto"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b1320]/95 hover:bg-[#060a12] text-white shadow-2xl shadow-black/50 border border-slate-700/70 backdrop-blur-md transition-all duration-200 cursor-default select-none hover:scale-[1.02] hover:border-sky-500/50"
        title="Plataforma desarrollada por E-PRIME G"
      >
        {/* Glowing Geometric Prime Icon (similar to Netlify style) */}
        <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xs group-hover:bg-cyan-400/35 transition-colors" />
          <svg
            className="w-3.5 h-3.5 text-cyan-400 relative"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* 4-point geometric star / cross motif */}
            <path d="M12 2v20M2 12h20" stroke="url(#prime-gradient)" />
            <circle cx="12" cy="12" r="3" fill="#22d3ee" stroke="none" />
            <circle cx="12" cy="4" r="1.5" fill="#38bdf8" stroke="none" />
            <circle cx="12" cy="20" r="1.5" fill="#38bdf8" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="#38bdf8" stroke="none" />
            <circle cx="20" cy="12" r="1.5" fill="#38bdf8" stroke="none" />
            <defs>
              <linearGradient id="prime-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text */}
        <div className="flex items-center gap-1 text-[13px] leading-none whitespace-nowrap">
          <span className="text-slate-300 font-normal">Powered by</span>
          <span className="font-bold text-white tracking-wide">E-Prime G</span>
        </div>
      </div>
    </div>
  );
};

export default PoweredByBadge;
