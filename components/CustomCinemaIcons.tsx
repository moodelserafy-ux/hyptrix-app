'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

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
 * 4. Six-Axis Hexagonal Radar Chart (الرادار السداسي للطاقات)
 * Displays: الكاريزما، الأداء الدرامي، الأكشن، الكوميديا، الجماهيرية، شباك التذاكر
 */
export interface SixRadarStats {
  charisma: number;
  acting: number;
  action: number;
  comedy: number;
  popularity: number;
  boxOffice: number;
}

const RADAR_AXES: { key: keyof SixRadarStats; label: string; angleDeg: number }[] = [
  { key: 'charisma', label: 'الكاريزما', angleDeg: -90 },
  { key: 'acting', label: 'التمثيل', angleDeg: -30 },
  { key: 'action', label: 'الأكشن', angleDeg: 30 },
  { key: 'comedy', label: 'الكوميديا', angleDeg: 90 },
  { key: 'popularity', label: 'الجماهيرية', angleDeg: 150 },
  { key: 'boxOffice', label: 'الشباك', angleDeg: 210 },
];

export function HexagonalRadarChartSvg({
  stats,
  size = 180,
  isDiamond = false,
  compact = false,
}: {
  stats: SixRadarStats;
  size?: number;
  isDiamond?: boolean;
  compact?: boolean;
}) {
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

  const strokeColor = isDiamond ? '#0284C7' : '#D4AF37';
  const fillColor = isDiamond
    ? 'rgba(56, 189, 248, 0.28)'
    : 'rgba(212, 175, 55, 0.32)';

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
            fill={rIdx === rings.length - 1 ? 'rgba(26, 37, 48, 0.04)' : 'none'}
            stroke="rgba(26, 37, 48, 0.18)"
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
            stroke="rgba(26, 37, 48, 0.16)"
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
              fill={strokeColor}
              stroke="#1A2530"
              strokeWidth="1.2"
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[#1A2530] font-bold"
              style={{ fontSize: compact ? '8.5px' : '10px' }}
            >
              {ax.label} ({val})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 5. FIFA Ultimate Team (FUT) 3D Tiltable Card Wrapper
 */
export function Fut3DTiltCard({
  children,
  tier,
  isCustomStar,
  className = '',
}: {
  children: React.ReactNode;
  tier?: 'S' | 'A' | 'B' | 'C' | 'DIAMOND';
  isCustomStar?: boolean;
  className?: string;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const isDiamond = Boolean(isCustomStar || tier === 'DIAMOND');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const tierSurfaceClass = isDiamond
    ? 'fut-diamond-card'
    : tier === 'S'
    ? 'fut-gold-card'
    : 'bg-[#FDFBF7] border-2 border-[#D4AF37]/50 shadow-md';

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{ transformStyle: 'preserve-3d', perspective: 900 }}
      className={`relative overflow-hidden rounded-3xl transition-shadow ${tierSurfaceClass} ${className}`}
    >
      {/* Top FUT Shield Header Ribbon */}
      {isDiamond && (
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-900 via-indigo-950 to-sky-900 px-3.5 py-1 text-[10px] font-black tracking-wider text-cyan-200 mb-2 rounded-xl">
          <span>💎 CUSTOM STAR · موهبة حصرية</span>
          <span className="font-typewriter text-amber-300">DIAMOND 99</span>
        </div>
      )}
      {!isDiamond && tier === 'S' && (
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1A2530] via-[#2C3E50] to-[#1A2530] px-3.5 py-1 text-[10px] font-black text-[#D4AF37] mb-2 rounded-xl">
          <span>★ نجم شباك أسطوري · فئة S</span>
          <span className="font-typewriter">GOLD ICON</span>
        </div>
      )}
      {children}
    </motion.div>
  );
}
