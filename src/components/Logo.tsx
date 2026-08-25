import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'image' | 'vector';
}

const LOGO_SRC = "/logo.jpeg";

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'image' }) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const containerSize = sizeClasses[size] || sizeClasses.md;

  if (variant === 'image' && !imageError) {
    return (
      <div className={`relative rounded-full p-0.5 bg-gradient-to-tr from-[#3A82B4] via-[#4B9CD3] to-[#80C1E8] shadow-2xs hover:shadow-md transition-all ${containerSize} ${className}`}>
        <img
          src={LOGO_SRC}
          alt="Coccole Fit Logo"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full bg-white border border-white/40 shadow-inner"
        />
      </div>
    );
  }

  // Elegant Minimalist Vector Logo Fallback
  return (
    <div className={`relative rounded-full bg-gradient-to-br from-[#4B9CD3] via-[#3A82B4] to-[#2C3E50] p-1 shadow-2xs flex items-center justify-center text-white ${containerSize} ${className}`}>
      <div className="w-full h-full rounded-full border border-white/20 flex flex-col items-center justify-center p-1 bg-[#4B9CD3]/90 backdrop-blur-xs text-center select-none overflow-hidden">
        <span className="font-extrabold tracking-widest text-[0.45em] leading-tight text-white/95 uppercase font-sans">
          COCCOLE
        </span>
        <span className="font-light tracking-widest text-[0.38em] leading-none text-sky-100 uppercase font-sans mt-0.5">
          FIT
        </span>
        <svg 
          className="w-[0.25em] h-[0.25em] text-white/80 mt-0.5" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    </div>
  );
};


