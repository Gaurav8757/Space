'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  isDay?: boolean;
}

export const SpaceShieldLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  showText = false,
  isDay = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl p-1.5 transition-transform duration-200 hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Glow backdrop */}
        <div
          className={`absolute inset-0 rounded-xl blur-sm transition-opacity duration-300 ${
            isDay ? 'bg-cyan-500/30' : 'bg-cyan-400/40'
          }`}
        />

        {/* Vector SVG combining Shield + Rocket + Satellite */}
        <svg
          viewBox="0 0 100 100"
          className="relative w-full h-full drop-shadow-md overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Shield Gradient */}
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glowing Border Gradient */}
            <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Rocket Flame Gradient */}
            <linearGradient id="flameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Satellite Solar Panel Gradient */}
            <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* 1. DEFENSIVE SHIELD BASE */}
          <path
            d="M50 8 C25 8 12 18 12 36 C12 66 38 88 50 94 C62 88 88 66 88 36 C88 18 75 8 50 8 Z"
            fill="url(#shieldGrad)"
            stroke="url(#borderGrad)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Accent Line */}
          <path
            d="M50 14 C30 14 18 23 18 38 C18 62 40 81 50 86 C60 81 82 62 82 38 C82 23 70 14 50 14 Z"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />

          {/* 2. ORBITING SATELLITE TRAJECTORY RING */}
          <ellipse
            cx="50"
            cy="46"
            rx="42"
            ry="18"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.8"
            strokeDasharray="3 3"
            transform="rotate(-18 50 46)"
            strokeOpacity="0.8"
          />

          {/* 3. ASCENDING ROCKET */}
          <g transform="translate(0, -2)">
            {/* Rocket Flame Tail */}
            <path d="M47 62 L50 78 L53 62 Z" fill="url(#flameGrad)" />

            {/* Rocket Fins */}
            <path d="M40 56 L35 63 L44 59 Z" fill="#38bdf8" />
            <path d="M60 56 L65 63 L56 59 Z" fill="#38bdf8" />

            {/* Main Rocket Fuselage */}
            <path
              d="M50 24 C45 32 44 48 44 58 L56 58 C56 48 55 32 50 24 Z"
              fill="#f8fafc"
            />

            {/* Rocket Nose Cone Accent */}
            <path d="M50 24 C47 29 46 34 46 38 L54 38 C54 34 53 29 50 24 Z" fill="#0284c7" />

            {/* Rocket Porthole Window */}
            <circle cx="50" cy="44" r="2.8" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
          </g>

          {/* 4. ORBITING SATELLITE (Top Right of Ring) */}
          <g transform="translate(74, 30) rotate(15)">
            {/* Satellite Body */}
            <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#f8fafc" stroke="#0284c7" strokeWidth="1" />

            {/* Solar Wings Left */}
            <rect x="-11" y="-2" width="6" height="4" rx="0.5" fill="url(#panelGrad)" stroke="#38bdf8" strokeWidth="0.5" />

            {/* Solar Wings Right */}
            <rect x="5" y="-2" width="6" height="4" rx="0.5" fill="url(#panelGrad)" stroke="#38bdf8" strokeWidth="0.5" />

            {/* Antenna dish */}
            <line x1="0" y1="-4" x2="0" y2="-7" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="0" cy="-7" r="1" fill="#38bdf8" />
          </g>

          {/* Signal Orbit Beacons */}
          <circle cx="20" cy="55" r="1.5" fill="#38bdf8" />
          <circle cx="80" cy="38" r="1.5" fill="#38bdf8" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center text-left">
          <span
            className={`font-black tracking-tight leading-snug text-base sm:text-xl flex items-center gap-1 ${
              isDay ? 'text-slate-900' : 'text-white'
            }`}
          >
            SpaceShield <span className="text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">AI</span>
          </span>
          <span
            className={`text-[9px] font-mono tracking-widest uppercase font-extrabold mt-1 leading-none ${
              isDay ? 'text-cyan-800' : 'text-cyan-400'
            }`}
          >
            AEROSPACE DEFENSE
          </span>
        </div>
      )}
    </div>
  );
};

export default SpaceShieldLogo;
