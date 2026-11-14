'use client';

import React from 'react';
import { CoreEmblemId, LogoFrameId, LogoPaletteId, StudioLogoConfig } from '@/lib/store';

export const EMBLEM_OPTIONS: { id: CoreEmblemId; name: string }[] = [
  { id: 'golden_scorpion', name: '1' },
  { id: 'winged_lion', name: '2' },
  { id: 'classic_camera', name: '3' },
  { id: 'royal_crown', name: '4' },
  { id: 'glowing_pyramid', name: '5' },
  { id: 'film_reel', name: '6' },
  { id: 'falcon', name: '7' },
  { id: 'theater_mask', name: '8' },
  { id: 'cinema_star', name: '9' },
  { id: 'pro_lens', name: '10' },
  { id: 'phoenix_crest', name: '11' },
  { id: 'crystal_diamond', name: '12' },
  { id: 'clapper_shield', name: '13' },
  { id: 'pegasus_wings', name: '14' },
  { id: 'sphinx_monument', name: '15' },
  { id: 'oscar_torch', name: '16' },
  { id: 'griffin_royal', name: '17' },
  { id: 'sunburst_eye', name: '18' },
];

export const FRAME_OPTIONS: { id: LogoFrameId; name: string }[] = [
  { id: 'royal_shield', name: '1' },
  { id: 'laurel_wreath', name: '2' },
  { id: 'neon_circle', name: '3' },
  { id: 'hex_geometry', name: '4' },
  { id: 'art_deco_arch', name: '5' },
  { id: 'octagon_crest', name: '6' },
  { id: 'double_diamond', name: '7' },
  { id: 'no_frame', name: '8' },
];

export const PALETTE_OPTIONS: {
  id: LogoPaletteId;
  name: string;
  primary: string;
  secondary: string;
  bg: string;
}[] = [
  { id: 'amethyst_pearl', name: '1', primary: '#6D28D9', secondary: '#06B6D4', bg: '#F5F3FF' },
  { id: 'cyber_purple', name: '2', primary: '#0284C7', secondary: '#8B5CF6', bg: '#ECFEFF' },
  { id: 'rose_champagne', name: '3', primary: '#E11D48', secondary: '#EC4899', bg: '#FFF1F2' },
  { id: 'emerald_white', name: '4', primary: '#059669', secondary: '#06B6D4', bg: '#ECFDF5' },
  { id: 'sapphire_gold', name: '5', primary: '#2563EB', secondary: '#F59E0B', bg: '#EFF6FF' },
  { id: 'royal_ivory', name: '6', primary: '#D97706', secondary: '#EC4899', bg: '#FFFBEB' },
  { id: 'teal_copper', name: '7', primary: '#0D9488', secondary: '#6366F1', bg: '#F0FDFA' },
  { id: 'fire_slate', name: '8', primary: '#EA580C', secondary: '#E11D48', bg: '#FFF7ED' },
  { id: 'crimson_silver', name: '9', primary: '#4F46E5', secondary: '#F43F5E', bg: '#EEF2FF' },
  { id: 'gold_black', name: '10', primary: '#7C3AED', secondary: '#F59E0B', bg: '#FAF5FF' },
];

// Curated pre-composed combinations for 1-click visual browsing (48 visual presets)
export const PREMADE_LOGO_COMBINATIONS: StudioLogoConfig[] = [
  { emblem: 'golden_scorpion', frame: 'royal_shield', palette: 'royal_ivory' },
  { emblem: 'winged_lion', frame: 'laurel_wreath', palette: 'sapphire_gold' },
  { emblem: 'royal_crown', frame: 'art_deco_arch', palette: 'rose_champagne' },
  { emblem: 'phoenix_crest', frame: 'octagon_crest', palette: 'emerald_white' },
  { emblem: 'glowing_pyramid', frame: 'double_diamond', palette: 'gold_black' },
  { emblem: 'classic_camera', frame: 'neon_circle', palette: 'amethyst_pearl' },
  { emblem: 'falcon', frame: 'hex_geometry', palette: 'teal_copper' },
  { emblem: 'crystal_diamond', frame: 'royal_shield', palette: 'cyber_purple' },
  { emblem: 'cinema_star', frame: 'laurel_wreath', palette: 'fire_slate' },
  { emblem: 'theater_mask', frame: 'art_deco_arch', palette: 'crimson_silver' },
  { emblem: 'clapper_shield', frame: 'octagon_crest', palette: 'royal_ivory' },
  { emblem: 'pegasus_wings', frame: 'neon_circle', palette: 'sapphire_gold' },
  { emblem: 'sphinx_monument', frame: 'double_diamond', palette: 'rose_champagne' },
  { emblem: 'oscar_torch', frame: 'laurel_wreath', palette: 'gold_black' },
  { emblem: 'griffin_royal', frame: 'royal_shield', palette: 'emerald_white' },
  { emblem: 'sunburst_eye', frame: 'hex_geometry', palette: 'amethyst_pearl' },
  { emblem: 'film_reel', frame: 'octagon_crest', palette: 'teal_copper' },
  { emblem: 'pro_lens', frame: 'neon_circle', palette: 'fire_slate' },
  { emblem: 'winged_lion', frame: 'art_deco_arch', palette: 'gold_black' },
  { emblem: 'royal_crown', frame: 'double_diamond', palette: 'sapphire_gold' },
  { emblem: 'phoenix_crest', frame: 'royal_shield', palette: 'rose_champagne' },
  { emblem: 'falcon', frame: 'laurel_wreath', palette: 'royal_ivory' },
  { emblem: 'crystal_diamond', frame: 'octagon_crest', palette: 'amethyst_pearl' },
  { emblem: 'oscar_torch', frame: 'art_deco_arch', palette: 'emerald_white' },
];

export function StudioLogoSvg({
  config,
  size = 88,
  className = '',
}: {
  config: StudioLogoConfig;
  size?: number;
  className?: string;
}) {
  const palette = PALETTE_OPTIONS.find((p) => p.id === config.palette) || PALETTE_OPTIONS[0];
  const { primary, secondary, bg } = palette;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="شعار الاستوديو"
    >
      <rect width="120" height="120" rx="28" fill={bg} />
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="24"
        stroke={primary}
        strokeOpacity="0.22"
        strokeWidth="2"
      />

      {/* Outer Frame */}
      {config.frame === 'royal_shield' && (
        <path
          d="M60 12L100 26V58C100 84 82 102 60 110C38 102 20 84 20 58V26L60 12Z"
          stroke={primary}
          strokeWidth="3.5"
          fill={primary}
          fillOpacity="0.06"
        />
      )}
      {config.frame === 'laurel_wreath' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round">
          <path d="M35 96C20 82 18 52 28 28" />
          <path d="M85 96C100 82 102 52 92 28" />
          <circle cx="60" cy="18" r="3.5" fill={secondary} />
          <path d="M46 102H74" stroke={secondary} strokeWidth="3" />
        </g>
      )}
      {config.frame === 'neon_circle' && (
        <>
          <circle cx="60" cy="60" r="46" stroke={primary} strokeWidth="3.5" />
          <circle cx="60" cy="60" r="40" stroke={secondary} strokeWidth="1.6" strokeDasharray="6 4" />
        </>
      )}
      {config.frame === 'hex_geometry' && (
        <polygon
          points="60,12 102,36 102,84 60,108 18,84 18,36"
          stroke={primary}
          strokeWidth="3.5"
          fill={primary}
          fillOpacity="0.06"
        />
      )}
      {config.frame === 'art_deco_arch' && (
        <g stroke={primary} strokeWidth="3.2">
          <path
            d="M24 102V48C24 28 40 14 60 14C80 14 96 28 96 48V102H24Z"
            fill={primary}
            fillOpacity="0.06"
          />
          <line x1="30" y1="96" x2="90" y2="96" stroke={secondary} strokeWidth="2.5" />
        </g>
      )}
      {config.frame === 'octagon_crest' && (
        <polygon
          points="42,14 78,14 106,42 106,78 78,106 42,106 14,78 14,42"
          stroke={primary}
          strokeWidth="3.5"
          fill={primary}
          fillOpacity="0.06"
        />
      )}
      {config.frame === 'double_diamond' && (
        <g stroke={primary} strokeWidth="3">
          <rect
            x="24"
            y="24"
            width="72"
            height="72"
            rx="8"
            transform="rotate(45 60 60)"
            fill={primary}
            fillOpacity="0.06"
          />
          <rect x="28" y="28" width="64" height="64" rx="8" stroke={secondary} strokeWidth="1.8" />
        </g>
      )}

      {/* Core Emblem */}
      {config.emblem === 'golden_scorpion' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 76V52C60 40 72 34 66 24L60 30" fill="none" />
          <circle cx="60" cy="64" r="9" fill={primary} fillOpacity="0.22" />
          <path d="M44 54C36 46 38 36 46 36" />
          <path d="M76 54C84 46 82 36 74 36" />
          <path d="M46 68L36 76M74 68L84 76M48 76L40 86M72 76L80 86" stroke={secondary} strokeWidth="2.5" />
        </g>
      )}

      {config.emblem === 'winged_lion' && (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 34L46 54H74L60 34Z" fill={primary} fillOpacity="0.22" />
          <path d="M45 58C28 48 24 34 36 30C42 28 48 42 52 50" stroke={secondary} strokeWidth="3.2" />
          <path d="M75 58C92 48 96 34 84 30C78 28 72 42 68 50" stroke={secondary} strokeWidth="3.2" />
          <path d="M46 80H74L68 60H52L46 80Z" fill={primary} fillOpacity="0.28" />
        </g>
      )}

      {config.emblem === 'classic_camera' && (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="48" cy="44" r="9" fill={primary} fillOpacity="0.2" />
          <circle cx="68" cy="44" r="9" fill={primary} fillOpacity="0.2" />
          <rect x="40" y="54" width="34" height="22" rx="4" fill={primary} fillOpacity="0.25" />
          <path d="M74 60L86 53V77L74 70" stroke={secondary} strokeWidth="3" />
        </g>
      )}

      {config.emblem === 'royal_crown' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 74L37 42L51 58L60 34L69 58L83 42L88 74H32Z" fill={primary} fillOpacity="0.25" />
          <line x1="32" y1="82" x2="88" y2="82" stroke={secondary} strokeWidth="3.5" />
          <circle cx="60" cy="30" r="3.5" fill={secondary} />
        </g>
      )}

      {config.emblem === 'glowing_pyramid' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="60,30 88,78 32,78" fill={primary} fillOpacity="0.22" />
          <line x1="60" y1="30" x2="60" y2="78" stroke={secondary} strokeWidth="2.4" />
          <circle cx="60" cy="52" r="5" fill={secondary} />
        </g>
      )}

      {config.emblem === 'film_reel' && (
        <g stroke={primary} strokeWidth="3">
          <circle cx="60" cy="60" r="24" fill={primary} fillOpacity="0.18" />
          <circle cx="60" cy="46" r="4.5" fill={secondary} />
          <circle cx="60" cy="74" r="4.5" fill={secondary} />
          <circle cx="46" cy="60" r="4.5" fill={secondary} />
          <circle cx="74" cy="60" r="4.5" fill={secondary} />
        </g>
      )}

      {config.emblem === 'falcon' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 46L60 62L92 46L76 76L60 86L44 76L28 46Z" fill={primary} fillOpacity="0.24" />
          <path d="M53 50L60 34L67 50" stroke={secondary} strokeWidth="3" />
        </g>
      )}

      {config.emblem === 'theater_mask' && (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round">
          <path d="M40 38H80V64C80 78 69 86 60 86C51 86 40 78 40 64V38Z" fill={primary} fillOpacity="0.22" />
          <circle cx="51" cy="54" r="3" fill={secondary} />
          <circle cx="69" cy="54" r="3" fill={secondary} />
          <path d="M49 69C54 76 66 76 71 69" stroke={secondary} strokeWidth="3" />
        </g>
      )}

      {config.emblem === 'cinema_star' && (
        <polygon
          points="60,28 67,48 89,48 71,61 78,83 60,70 42,83 49,61 31,48 53,48"
          stroke={primary}
          strokeWidth="3.2"
          fill={primary}
          fillOpacity="0.26"
        />
      )}

      {config.emblem === 'pro_lens' && (
        <g stroke={primary} strokeWidth="3">
          <circle cx="60" cy="60" r="24" fill={primary} fillOpacity="0.16" />
          <circle cx="60" cy="60" r="14" stroke={secondary} strokeWidth="2.8" />
          <circle cx="55" cy="55" r="3.5" fill={secondary} />
        </g>
      )}

      {config.emblem === 'phoenix_crest' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 30C68 42 86 40 84 60C82 74 70 84 60 88C50 84 38 74 36 60C34 40 52 42 60 30Z" fill={primary} fillOpacity="0.22" />
          <path d="M60 42V78M48 56L60 66L72 56" stroke={secondary} strokeWidth="2.8" />
        </g>
      )}

      {config.emblem === 'crystal_diamond' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinejoin="round">
          <polygon points="44,36 76,36 88,52 60,86 32,52" fill={primary} fillOpacity="0.22" />
          <path d="M32 52H88M44 36L60 86L76 36" stroke={secondary} strokeWidth="2.2" />
        </g>
      )}

      {config.emblem === 'clapper_shield' && (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="36" y="48" width="48" height="34" rx="5" fill={primary} fillOpacity="0.22" />
          <path d="M36 42L82 34L84 44L38 50Z" fill={secondary} fillOpacity="0.4" />
        </g>
      )}

      {config.emblem === 'pegasus_wings' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round">
          <path d="M60 72C40 72 28 54 32 36C42 46 50 52 60 52C70 52 78 46 88 36C92 54 80 72 60 72Z" fill={primary} fillOpacity="0.24" />
          <circle cx="60" cy="40" r="5" fill={secondary} />
        </g>
      )}

      {config.emblem === 'sphinx_monument' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M44 78L50 42H70L76 78H44Z" fill={primary} fillOpacity="0.22" />
          <circle cx="60" cy="54" r="6" fill={secondary} />
          <line x1="36" y1="78" x2="84" y2="78" stroke={secondary} strokeWidth="3.5" />
        </g>
      )}

      {config.emblem === 'oscar_torch' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M54 54H66L62 84H58L54 54Z" fill={primary} fillOpacity="0.28" />
          <path d="M60 28C68 36 68 46 60 52C52 46 52 36 60 28Z" fill={secondary} />
        </g>
      )}

      {config.emblem === 'griffin_royal' && (
        <g stroke={primary} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="56" r="18" fill={primary} fillOpacity="0.2" />
          <path d="M46 56L60 38L74 56L60 74L46 56Z" stroke={secondary} strokeWidth="2.8" />
        </g>
      )}

      {config.emblem === 'sunburst_eye' && (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round">
          <path d="M32 60C42 44 78 44 88 60C78 76 42 76 32 60Z" fill={primary} fillOpacity="0.2" />
          <circle cx="60" cy="60" r="8" fill={secondary} />
        </g>
      )}
    </svg>
  );
}
