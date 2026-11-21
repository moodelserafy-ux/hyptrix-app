'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '@/lib/store';

/**
 * 1. Custom Director's Chair SVG (Replaces generic User icon)
 */
export function DirectorChairIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="3" width="16" height="5" rx="1" fill="currentColor" fillOpacity="0.18" />
      <path d="M5 3v10" />
      <path d="M19 3v10" />
      <path d="M4 12h16" />
      <path d="M6 12l12 9" />
      <path d="M18 12L6 21" />
    </svg>
  );
}

/**
 * 2. Custom Cinema Film Reel SVG (Replaces generic Settings gear icon)
 */
export function FilmReelSettingsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle cx="12" cy="6.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
      <circle cx="6.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.2" fill="currentColor" />
      <path d="M19 19l3 2" />
    </svg>
  );
}

/**
 * 3. Clapperboard Chip SVG (For + and - Radar Stat Buttons)
 */
export function ClapperChipButton({
  symbol,
  direction,
  onClick,
  disabled,
  isGoldGem,
  title,
}: {
  symbol?: '+' | '-';
  direction?: 'plus' | 'minus';
  onClick: () => void;
  disabled?: boolean;
  isGoldGem?: boolean;
  title?: string;
}) {
  const effectiveSymbol = symbol || (direction === 'minus' ? '-' : '+');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group relative inline-flex h-8 w-9 shrink-0 flex-col overflow-hidden rounded-lg border-2 font-typewriter text-sm font-black shadow-xs transition active:scale-90 cursor-pointer disabled:opacity-35 ${
        isGoldGem
          ? 'border-[#D4AF37] bg-gradient-to-b from-[#D4AF37] via-amber-400 to-[#B8860B] text-[#1A2530] shadow-[0_0_12px_rgba(212,175,55,0.55)]'
          : effectiveSymbol === '+'
          ? 'border-[#1A2530] bg-[#D91624] text-white hover:bg-[#b5111d]'
          : 'border-[#1A2530]/60 bg-[#F9F6F0] text-[#1A2530] hover:bg-stone-200'
      }`}
    >
      {/* Clapperboard diagonal stripes top bar */}
      <span
        className="block h-1.5 w-full border-b border-[#1A2530]/40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, #1A2530, #1A2530 3px, #F9F6F0 3px, #F9F6F0 6px)',
        }}
      />
      <span className="flex flex-1 items-center justify-center leading-none">
        {effectiveSymbol}
      </span>
    </button>
  );
}

/**
 * 4. Six-Axis Hexagonal Radar Chart
 */
export interface SixRadarStats {
  charisma: number;
  acting: number;
  action: number;
  comedy: number;
  popularity: number;
  boxOffice: number;
}

const RADAR_AXES: {
  key: keyof SixRadarStats;
  labelEn: string;
  labelAr: string;
  angleDeg: number;
}[] = [
  { key: 'charisma', labelEn: 'Charisma', labelAr: 'الكاريزما', angleDeg: -90 },
  { key: 'acting', labelEn: 'Acting', labelAr: 'التمثيل', angleDeg: -30 },
  { key: 'action', labelEn: 'Action', labelAr: 'الأكشن', angleDeg: 30 },
  { key: 'comedy', labelEn: 'Comedy', labelAr: 'الكوميديا', angleDeg: 90 },
  { key: 'popularity', labelEn: 'Fame', labelAr: 'الجماهيرية', angleDeg: 150 },
  { key: 'boxOffice', labelEn: 'Box Office', labelAr: 'الشباك', angleDeg: 210 },
];

export function HexagonalRadarChartSvg({
  stats,
  size = 180,
  isDiamond = false,
  compact = false,
  darkSurface = false,
}: {
  stats: SixRadarStats;
  size?: number;
  isDiamond?: boolean;
  compact?: boolean;
  darkSurface?: boolean;
}) {
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const isAr = uiLanguage === 'ar';
  const center = size / 2;
  const maxRadius = compact ? size * 0.34 : size * 0.33;

  const getPoint = (angleDeg: number, value0to100: number, rScale = 1) => {
    const rad = (angleDeg * Math.PI) / 180;
    const normalized = Math.max(20, Math.min(100, value0to100)) / 100;
    const r = maxRadius * normalized * rScale;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const rings = [0.35, 0.68, 1.0];
  const dataPoints = RADAR_AXES.map((ax) => getPoint(ax.angleDeg, stats[ax.key]));
  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const strokeColor = darkSurface ? '#38BDF8' : isDiamond ? '#0284C7' : '#D4AF37';
  const fillColor = darkSurface
    ? 'rgba(56, 189, 248, 0.32)'
    : isDiamond
    ? 'rgba(56, 189, 248, 0.28)'
    : 'rgba(212, 175, 55, 0.32)';
  const ringStroke = darkSurface ? 'rgba(186, 230, 253, 0.26)' : 'rgba(26, 37, 48, 0.18)';
  const ringOuterFill = darkSurface ? 'rgba(15, 37, 68, 0.45)' : 'rgba(26, 37, 48, 0.04)';
  const spokeStroke = darkSurface ? 'rgba(186, 230, 253, 0.22)' : 'rgba(26, 37, 48, 0.16)';
  const dotStroke = darkSurface ? '#071324' : '#1A2530';
  const labelFillClass = darkSurface ? 'fill-[#F8FAFC] font-extrabold' : 'fill-[#1A2530] font-bold';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto overflow-visible select-none"
    >
      <defs>
        <filter id="neonGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric Hexagonal Web Rings */}
      {rings.map((ringScale, rIdx) => {
        const ringPts = RADAR_AXES.map((ax) => getPoint(ax.angleDeg, 100, ringScale))
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ');
        return (
          <polygon
            key={rIdx}
            points={ringPts}
            fill={rIdx === rings.length - 1 ? ringOuterFill : 'none'}
            stroke={ringStroke}
            strokeWidth="1"
            strokeDasharray={rIdx < rings.length - 1 ? '2 2' : undefined}
          />
        );
      })}

      {/* Spokes from center */}
      {RADAR_AXES.map((ax) => {
        const outer = getPoint(ax.angleDeg, 100, 1);
        return (
          <line
            key={ax.key}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke={spokeStroke}
            strokeWidth="1"
          />
        );
      })}

      {/* Active Neon Gold / Diamond Stat Polygon */}
      <motion.polygon
        initial={false}
        animate={{ points: polygonPointsStr }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2.5"
        filter="url(#neonGoldGlow)"
      />

      {/* Glowing Vertex Dots + Labels */}
      {RADAR_AXES.map((ax, i) => {
        const pt = dataPoints[i];
        const labelPt = getPoint(ax.angleDeg, 100, compact ? 1.32 : 1.36);
        const val = Math.round(stats[ax.key]);
        return (
          <g key={ax.key}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={compact ? 3 : 4}
              fill={darkSurface ? '#FDE68A' : strokeColor}
              stroke={dotStroke}
              strokeWidth="1.2"
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={labelFillClass}
              style={{ fontSize: compact ? '8.5px' : '10px' }}
            >
              {isAr ? ax.labelAr : ax.labelEn} ({val})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 5. Lightweight Pure-CSS FUT Card Wrapper (Zero per-card state or spring overhead)
 */
export function Fut3DTiltCard({
  children,
  tier,
  isCustomStar,
  uiLanguage,
  className = '',
}: {
  children: React.ReactNode;
  tier?: 'S' | 'A' | 'B' | 'C' | 'DIAMOND';
  isCustomStar?: boolean;
  uiLanguage?: string;
  className?: string;
}) {
  const isAr = uiLanguage === 'ar';
  const isDiamond = Boolean(isCustomStar || tier === 'DIAMOND');

  const tierSurfaceClass = isDiamond
    ? 'fut-diamond-card'
    : tier === 'S'
    ? 'fut-gold-card'
    : 'bg-[#FDFBF7] border border-[#D4AF37]/50 shadow-sm hover:border-[#D4AF37]';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-colors duration-150 ${tierSurfaceClass} ${className}`}
    >
      {/* Top FUT Shield Header Ribbon */}
      {isDiamond && (
        <div className="flex items-center justify-between bg-[#040B16]/85 border border-[#38BDF8]/40 px-2.5 py-1 text-[9px] font-black tracking-wider text-[#BAE6FD] mb-2 rounded-lg">
          <span className="truncate">
            {isAr ? 'موهبة حصرية · كارت ألماظ' : 'EXCLUSIVE · DIAMOND ICON'}
          </span>
          <span className="font-typewriter text-[#FDE68A] shrink-0">DIAMOND</span>
        </div>
      )}
      {!isDiamond && tier === 'S' && (
        <div className="flex items-center justify-between bg-[#1A2530] px-2.5 py-1 text-[9px] font-black text-[#D4AF37] mb-2 rounded-lg">
          <span className="truncate">
            {isAr ? '★ نجم شباك أسطوري · فئة S' : '★ LEGENDARY ICON · S-TIER'}
          </span>
          <span className="font-typewriter shrink-0">GOLD</span>
        </div>
      )}
      {children}
    </div>
  );
}
