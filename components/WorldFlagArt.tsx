'use client';

import React from 'react';
import type { WorldMarketId } from '@/lib/market-profiles';

/**
 * Handcrafted luxury silk-wave country flag artwork with realistic fabric folds,
 * diagonal specular light sheen, and gilded border framing (zero emoji usage).
 */
export function WorldFlagArt({
  market,
  className = 'w-full h-full',
}: {
  market: WorldMarketId;
  className?: string;
}) {
  const uid = `wf_${market}`;

  return (
    <svg
      viewBox="0 0 320 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`علم ${market}`}
    >
      <defs>
        <clipPath id={`${uid}_clip`}>
          <rect x="0" y="0" width="320" height="190" rx="14" />
        </clipPath>

        {/* Realistic silk fabric ripple lighting overlay */}
        <linearGradient id={`${uid}_silk`} x1="0%" y1="0%" x2="100%" y2="18%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="18%" stopColor="#000000" stopOpacity="0.14" />
          <stop offset="36%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="56%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="76%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="92%" stopColor="#000000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.08" />
        </linearGradient>

        {/* Subtle luxury vignette for depth */}
        <radialGradient id={`${uid}_vignette`} cx="50%" cy="45%" r="72%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
        </radialGradient>

        {/* Diagonal glass sheen */}
        <linearGradient id={`${uid}_sheen`} x1="0%" y1="0%" x2="65%" y2="100%">
          <stop offset="0%" stopColor="#FFF7D6" stopOpacity="0.22" />
          <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>

        {/* Royal gold gradient for emblems & borders */}
        <linearGradient id={`${uid}_gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="48%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9A7209" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${uid}_clip)`}>
        {market === 'egypt' && (
          <>
            {/* Top Crimson Band */}
            <rect x="0" y="0" width="320" height="64" fill="#CE1126" />
            {/* Center Ivory White Band */}
            <rect x="0" y="63" width="320" height="64" fill="#FCFBF7" />
            {/* Bottom Obsidian Band */}
            <rect x="0" y="126" width="320" height="64" fill="#121417" />

            {/* Stylized Royal Gold Eagle of Saladin Emblem */}
            <g transform="translate(160, 95)">
              {/* Outer Radiant Glow */}
              <circle cx="0" cy="0" r="24" fill="#D4AF37" fillOpacity="0.14" />
              {/* Left & Right Wings */}
              <path
                d="M-6,-10 C-15,-12 -22,-6 -24,3 C-19,2 -15,3 -12,6 C-16,7 -19,10 -20,14 C-13,12 -8,10 -5,11 Z"
                fill={`url(#${uid}_gold)`}
                stroke="#8A6305"
                strokeWidth="0.7"
              />
              <path
                d="M6,-10 C15,-12 22,-6 24,3 C19,2 15,3 12,6 C16,7 19,10 20,14 C13,12 8,10 5,11 Z"
                fill={`url(#${uid}_gold)`}
                stroke="#8A6305"
                strokeWidth="0.7"
              />
              {/* Eagle Head */}
              <path
                d="M-3,-16 C-2,-21 4,-21 5,-17 C3,-16 3,-14 2,-12 L-3,-12 Z"
                fill={`url(#${uid}_gold)`}
                stroke="#8A6305"
                strokeWidth="0.7"
              />
              {/* Central Heraldic Shield */}
              <path
                d="M-6,-11 L6,-11 L6,4 C6,9 0,13 0,13 C0,13 -6,9 -6,4 Z"
                fill={`url(#${uid}_gold)`}
                stroke="#8A6305"
                strokeWidth="0.8"
              />
              <rect x="-2" y="-9.5" width="4" height="17" rx="1" fill="#FCFBF7" fillOpacity="0.85" />
              {/* Pedestal Scroll */}
              <rect
                x="-13"
                y="14"
                width="26"
                height="4.5"
                rx="2"
                fill={`url(#${uid}_gold)`}
                stroke="#8A6305"
                strokeWidth="0.7"
              />
            </g>
          </>
        )}

        {market === 'saudi' && (
          <>
            {/* Deep Royal Emerald Silk Field */}
            <rect x="0" y="0" width="320" height="190" fill="#006C35" />
            {/* Subtle Radial Emerald Depth */}
            <radialGradient id="sa_emerald_glow" cx="50%" cy="46%" r="58%">
              <stop offset="0%" stopColor="#0D8C48" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#004421" stopOpacity="0.75" />
            </radialGradient>
            <rect x="0" y="0" width="320" height="190" fill="url(#sa_emerald_glow)" />

            {/* Refined Geometric Calligraphic Motif & Royal Curved Sword */}
            <g transform="translate(160, 96)">
              {/* Soft Aura behind calligraphy */}
              <ellipse cx="0" cy="-12" rx="92" ry="30" fill="#FFFFFF" fillOpacity="0.06" />

              {/* Crisp Stylized Thuluth Calligraphy Lines (Artistic Ornamental Representation) */}
              <g
                stroke="#FFFFFF"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                {/* Upper rhythmic Arabic calligraphic strokes */}
                <path
                  d="M-74,-10 C-68,-26 -58,-28 -52,-12 C-47,-24 -36,-24 -32,-11 M-64,-24 L-64,-6 M-42,-26 L-42,-8"
                  strokeWidth="3.2"
                />
                <path
                  d="M-22,-10 C-14,-10 -12,-24 -4,-22 C4,-20 4,-10 14,-10 C22,-10 26,-23 34,-21 C40,-19 42,-10 52,-10 C60,-10 66,-22 74,-16"
                  strokeWidth="3.4"
                />
                {/* Vertical alif/lam architectural verticals */}
                <path
                  d="M-16,-28 L-16,-9 M2,-29 L2,-11 M24,-28 L24,-9 M48,-27 L48,-10 M66,-28 L66,-11"
                  strokeWidth="2.8"
                />
                {/* Diacritical flourishes & dots */}
                <circle cx="-58" cy="-32" r="1.8" fill="#FFFFFF" stroke="none" />
                <circle cx="-30" cy="-31" r="1.8" fill="#FFFFFF" stroke="none" />
                <circle cx="12" cy="-32" r="1.8" fill="#FFFFFF" stroke="none" />
                <circle cx="36" cy="-31" r="1.8" fill="#FFFFFF" stroke="none" />
                <circle cx="58" cy="-32" r="1.8" fill="#FFFFFF" stroke="none" />
                <path d="M-48,-3 C-38,1 -28,-3 -18,0 M4,-2 C18,2 34,-2 48,0" strokeWidth="2.2" />
              </g>

              {/* Iconic Saudi Curved Arab Sword pointing left */}
              <g transform="translate(0, 22)">
                {/* Blade */}
                <path
                  d="M72,-2 L-56,-2 C-66,-2 -74,-4 -82,-9 C-75,2 -65,5 -54,5 L72,4 Z"
                  fill="#FFFFFF"
                />
                {/* Crossguard */}
                <rect x="66" y="-8" width="4.5" height="18" rx="2" fill="#FFFFFF" />
                {/* Hilt & Pommel */}
                <rect x="70" y="-2.5" width="16" height="6" rx="2.5" fill="#FFFFFF" />
                <circle cx="87" cy="0.5" r="3.5" fill="#FFFFFF" />
              </g>
            </g>
          </>
        )}

        {market === 'turkey' && (
          <>
            {/* Rich Anatolian Crimson Silk */}
            <rect x="0" y="0" width="320" height="190" fill="#E30A17" />
            <radialGradient id="tr_glow" cx="42%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FF2A36" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#99060E" stopOpacity="0.6" />
            </radialGradient>
            <rect x="0" y="0" width="320" height="190" fill="url(#tr_glow)" />

            {/* Crisp White Crescent & 5-Pointed Star */}
            <g transform="translate(132, 95)">
              <circle cx="0" cy="0" r="46" fill="#FFFFFF" />
              <circle cx="12" cy="0" r="36.5" fill="#D40915" />
              {/* 5-Point Star */}
              <polygon
                points="46,0 59.5,-4.4 51.2,-15.9 51.2,-1.7 39.7,-10 53.2,-5.6"
                fill="none"
              />
              <path
                d="M54,-18 L58.5,-5.5 L71.8,-5.5 L61,2.4 L65.1,15 L54,7.2 L42.9,15 L47,2.4 L36.2,-5.5 L49.5,-5.5 Z"
                fill="#FFFFFF"
                transform="rotate(-18 54 0) scale(0.92)"
              />
            </g>
          </>
        )}

        {market === 'korea' && (
          <>
            {/* Pure Porcelain White Silk */}
            <rect x="0" y="0" width="320" height="190" fill="#FAFBFD" />

            {/* Central Taegeuk Medallion */}
            <g transform="translate(160, 95) rotate(-30)">
              <circle cx="0" cy="0" r="42" fill="#0047A0" />
              <path
                d="M-42,0 A42,42 0 0,1 42,0 A21,21 0 0,1 0,0 A21,21 0 0,0 -42,0 Z"
                fill="#CD2E3A"
              />
              <circle cx="-21" cy="0" r="21" fill="#CD2E3A" />
              <circle cx="21" cy="0" r="21" fill="#0047A0" />
            </g>

            {/* 4 Black Trigrams (Geon, Gon, Gam, Ri) */}
            {/* Top-Left: Geon (3 solid bars) */}
            <g transform="translate(86, 48) rotate(-32)" fill="#14171A">
              <rect x="-20" y="-11" width="40" height="5" rx="1" />
              <rect x="-20" y="-2.5" width="40" height="5" rx="1" />
              <rect x="-20" y="6" width="40" height="5" rx="1" />
            </g>
            {/* Bottom-Right: Gon (3 broken bars) */}
            <g transform="translate(234, 142) rotate(-32)" fill="#14171A">
              <rect x="-20" y="-11" width="18" height="5" rx="1" />
              <rect x="2" y="-11" width="18" height="5" rx="1" />
              <rect x="-20" y="-2.5" width="18" height="5" rx="1" />
              <rect x="2" y="-2.5" width="18" height="5" rx="1" />
              <rect x="-20" y="6" width="18" height="5" rx="1" />
              <rect x="2" y="6" width="18" height="5" rx="1" />
            </g>
            {/* Top-Right: Gam (broken, solid, broken) */}
            <g transform="translate(234, 48) rotate(32)" fill="#14171A">
              <rect x="-20" y="-11" width="18" height="5" rx="1" />
              <rect x="2" y="-11" width="18" height="5" rx="1" />
              <rect x="-20" y="-2.5" width="40" height="5" rx="1" />
              <rect x="-20" y="6" width="18" height="5" rx="1" />
              <rect x="2" y="6" width="18" height="5" rx="1" />
            </g>
            {/* Bottom-Left: Ri (solid, broken, solid) */}
            <g transform="translate(86, 142) rotate(32)" fill="#14171A">
              <rect x="-20" y="-11" width="40" height="5" rx="1" />
              <rect x="-20" y="-2.5" width="18" height="5" rx="1" />
              <rect x="2" y="-2.5" width="18" height="5" rx="1" />
              <rect x="-20" y="6" width="40" height="5" rx="1" />
            </g>
          </>
        )}

        {market === 'usa' && (
          <>
            {/* 13 Crisp Alternating Stripes */}
            <rect x="0" y="0" width="320" height="190" fill="#FAF8F4" />
            {[0, 2, 4, 6, 8, 10, 12].map((idx) => (
              <rect
                key={idx}
                x="0"
                y={(idx * 190) / 13}
                width="320"
                height={190 / 13 + 0.5}
                fill="#B22234"
              />
            ))}
            {/* Deep Navy Canton */}
            <rect x="0" y="0" width="136" height={(7 * 190) / 13} fill="#1B2A5B" />
            {/* Crisp Star Constellation Lattice */}
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 6 }).map((__, col) => (
                <circle
                  key={`s1_${row}_${col}`}
                  cx={13 + col * 21.8}
                  cy={11 + row * 20}
                  r="2.6"
                  fill="#FFFFFF"
                />
              ))
            )}
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 5 }).map((__, col) => (
                <circle
                  key={`s2_${row}_${col}`}
                  cx={23.9 + col * 21.8}
                  cy={21 + row * 20}
                  r="2.4"
                  fill="#FFFFFF"
                />
              ))
            )}
          </>
        )}

        {/* Silk Fabric Wave Shading + Vignette + Specular Highlight */}
        <rect x="0" y="0" width="320" height="190" fill={`url(#${uid}_silk)`} />
        <rect x="0" y="0" width="320" height="190" fill={`url(#${uid}_sheen)`} />
        <rect x="0" y="0" width="320" height="190" fill={`url(#${uid}_vignette)`} />
      </g>

      {/* Luxury Gilded Hairline Inner Frame */}
      <rect
        x="1.5"
        y="1.5"
        width="317"
        height="187"
        rx="13"
        stroke={`url(#${uid}_gold)`}
        strokeWidth="2.5"
        strokeOpacity="0.88"
      />
    </svg>
  );
}

export default WorldFlagArt;
