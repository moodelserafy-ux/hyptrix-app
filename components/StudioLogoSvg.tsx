'use client';

import React, { useId } from 'react';
import {
  CoreEmblemId,
  LogoFrameId,
  LogoPaletteId,
  StudioLogoConfig,
} from '@/lib/store';

export const EMBLEM_OPTIONS: { id: CoreEmblemId; name: string }[] = [
  { id: 'winged_lion', name: 'الأسد المجنّح' },
  { id: 'royal_crown', name: 'التاج الإمبراطوري' },
  { id: 'golden_scorpion', name: 'العقرب الذهبي' },
  { id: 'phoenix_crest', name: 'طائر العنقاء' },
  { id: 'glowing_pyramid', name: 'الهرم المضيء' },
  { id: 'falcon', name: 'صقر حورس' },
  { id: 'golden_scarab', name: 'الجعران الملكي' },
  { id: 'lotus_crown', name: 'زهرة اللوتس' },
  { id: 'classic_camera', name: 'كاميرا 35mm' },
  { id: 'film_reel', name: 'بكرة السينما' },
  { id: 'clapper_shield', name: 'كلاكيت الإخراج' },
  { id: 'pro_lens', name: 'عدسة التصوير' },
  { id: 'director_megaphone', name: 'بوق المخرج' },
  { id: 'spotlight_tower', name: 'برج الكشافات' },
  { id: 'oscar_torch', name: 'شعلة الجوائز' },
  { id: 'cinema_star', name: 'نجمة الشباك' },
  { id: 'crystal_diamond', name: 'الألماظ الملكي' },
  { id: 'theater_mask', name: 'قناع المسرح' },
  { id: 'royal_crescent', name: 'هلال الشرق' },
  { id: 'cinema_ribbon', name: 'شريط المهرجان' },
  { id: 'pegasus_wings', name: 'أجنحة الأسطورة' },
  { id: 'sphinx_monument', name: 'أبو الهول' },
  { id: 'griffin_royal', name: 'الدرع النجمي' },
  { id: 'sunburst_eye', name: 'عين الكاميرا' },
];

export const FRAME_OPTIONS: { id: LogoFrameId; name: string }[] = [
  { id: 'royal_shield', name: 'درع ملكي' },
  { id: 'laurel_wreath', name: 'إكليل الغار' },
  { id: 'art_deco_arch', name: 'قوس آرت ديكو' },
  { id: 'starburst_seal', name: 'ختم الشمس' },
  { id: 'film_strip_frame', name: 'شريط سينمائي' },
  { id: 'crest_banner', name: 'درع الشريط' },
  { id: 'vintage_oval', name: 'بيضاوي كلاسيكي' },
  { id: 'neon_circle', name: 'حلقة مزدوجة' },
  { id: 'hex_geometry', name: 'سداسي هندسي' },
  { id: 'octagon_crest', name: 'ثماني فاخر' },
  { id: 'double_diamond', name: 'معيّن مزدوج' },
  { id: 'no_frame', name: 'حر بدون إطار' },
];

export const PALETTE_OPTIONS: {
  id: LogoPaletteId;
  name: string;
  primary: string;
  secondary: string;
  bg: string;
  bgEnd: string;
  isDark: boolean;
}[] = [
  {
    id: 'obsidian_gold',
    name: 'أسود ملكي وذهب',
    primary: '#E5C158',
    secondary: '#FFF3B0',
    bg: '#161C24',
    bgEnd: '#0B0F14',
    isDark: true,
  },
  {
    id: 'velvet_crimson',
    name: 'قرمزي مخملي وذهب',
    primary: '#F0C850',
    secondary: '#FF4D5E',
    bg: '#3B0811',
    bgEnd: '#190307',
    isDark: true,
  },
  {
    id: 'midnight_navy',
    name: 'كحلي هوليوود وذهب',
    primary: '#D4AF37',
    secondary: '#7DD3FC',
    bg: '#1E2D3D',
    bgEnd: '#0E1720',
    isDark: true,
  },
  {
    id: 'pharaoh_turquoise',
    name: 'فيروزي فرعوني وذهب',
    primary: '#2DD4BF',
    secondary: '#F5C451',
    bg: '#0E3133',
    bgEnd: '#071B1D',
    isDark: true,
  },
  {
    id: 'emerald_empire',
    name: 'زمردي إمبراطوري',
    primary: '#34D399',
    secondary: '#FBBF24',
    bg: '#0B2E22',
    bgEnd: '#051711',
    isDark: true,
  },
  {
    id: 'sunset_amber',
    name: 'كهرماني غروب داكن',
    primary: '#F59E0B',
    secondary: '#FB7185',
    bg: '#2A1420',
    bgEnd: '#14080E',
    isDark: true,
  },
  {
    id: 'silver_noir',
    name: 'نوار بلاتيني',
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    bg: '#23272F',
    bgEnd: '#0F1115',
    isDark: true,
  },
  {
    id: 'gold_black',
    name: 'ليلكي ملكي وذهب',
    primary: '#F5C451',
    secondary: '#C084FC',
    bg: '#231338',
    bgEnd: '#11081C',
    isDark: true,
  },
  {
    id: 'ivory_bronze',
    name: 'عاجي وبرونز سينمائي',
    primary: '#9A5B13',
    secondary: '#D97706',
    bg: '#FCF9F2',
    bgEnd: '#EFE6D5',
    isDark: false,
  },
  {
    id: 'royal_ivory',
    name: 'عاجي وقرمزي ملكي',
    primary: '#B91C1C',
    secondary: '#D4AF37',
    bg: '#FDFBF7',
    bgEnd: '#F3ECE0',
    isDark: false,
  },
  {
    id: 'sapphire_gold',
    name: 'ياقوتي أزرق وذهب',
    primary: '#1D4ED8',
    secondary: '#D97706',
    bg: '#F0F6FF',
    bgEnd: '#DCE9FE',
    isDark: false,
  },
  {
    id: 'emerald_white',
    name: 'أخضر كلاسيكي وعاجي',
    primary: '#047857',
    secondary: '#D4AF37',
    bg: '#F1FBF6',
    bgEnd: '#DDF4E9',
    isDark: false,
  },
  {
    id: 'rose_champagne',
    name: 'روبي وشامبين',
    primary: '#BE123C',
    secondary: '#E11D48',
    bg: '#FFF5F7',
    bgEnd: '#FDE4E9',
    isDark: false,
  },
  {
    id: 'teal_copper',
    name: 'بترولي ونحاسي',
    primary: '#0F766E',
    secondary: '#C2410C',
    bg: '#F0FDFA',
    bgEnd: '#D6F5EF',
    isDark: false,
  },
  {
    id: 'fire_slate',
    name: 'ناري ومعدني',
    primary: '#C2410C',
    secondary: '#E11D48',
    bg: '#FFF7ED',
    bgEnd: '#FDE9D2',
    isDark: false,
  },
  {
    id: 'crimson_silver',
    name: 'نيلي وأحمر سينمائي',
    primary: '#3730A3',
    secondary: '#E11D48',
    bg: '#F2F4FF',
    bgEnd: '#E0E5FE',
    isDark: false,
  },
  {
    id: 'amethyst_pearl',
    name: 'جمشت ولؤلؤي',
    primary: '#6D28D9',
    secondary: '#0891B2',
    bg: '#F7F5FF',
    bgEnd: '#EAE4FE',
    isDark: false,
  },
  {
    id: 'cyber_purple',
    name: 'أكوا سماوي وأزرق',
    primary: '#0369A1',
    secondary: '#6366F1',
    bg: '#F0FAFF',
    bgEnd: '#DAF1FD',
    isDark: false,
  },
];

// Curated luxury pre-composed studio crests for 1-click browsing
export const PREMADE_LOGO_COMBINATIONS: StudioLogoConfig[] = [
  { emblem: 'winged_lion', frame: 'royal_shield', palette: 'obsidian_gold' },
  { emblem: 'royal_crown', frame: 'laurel_wreath', palette: 'velvet_crimson' },
  { emblem: 'falcon', frame: 'art_deco_arch', palette: 'midnight_navy' },
  { emblem: 'golden_scarab', frame: 'starburst_seal', palette: 'pharaoh_turquoise' },
  { emblem: 'phoenix_crest', frame: 'crest_banner', palette: 'sunset_amber' },
  { emblem: 'classic_camera', frame: 'film_strip_frame', palette: 'silver_noir' },
  { emblem: 'lotus_crown', frame: 'vintage_oval', palette: 'emerald_empire' },
  { emblem: 'golden_scorpion', frame: 'octagon_crest', palette: 'ivory_bronze' },
  { emblem: 'glowing_pyramid', frame: 'double_diamond', palette: 'royal_ivory' },
  { emblem: 'oscar_torch', frame: 'laurel_wreath', palette: 'gold_black' },
  { emblem: 'spotlight_tower', frame: 'art_deco_arch', palette: 'obsidian_gold' },
  { emblem: 'clapper_shield', frame: 'film_strip_frame', palette: 'velvet_crimson' },
  { emblem: 'royal_crescent', frame: 'neon_circle', palette: 'midnight_navy' },
  { emblem: 'crystal_diamond', frame: 'hex_geometry', palette: 'sapphire_gold' },
  { emblem: 'director_megaphone', frame: 'crest_banner', palette: 'teal_copper' },
  { emblem: 'cinema_star', frame: 'starburst_seal', palette: 'rose_champagne' },
  { emblem: 'theater_mask', frame: 'vintage_oval', palette: 'crimson_silver' },
  { emblem: 'cinema_ribbon', frame: 'royal_shield', palette: 'emerald_white' },
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
  const uid = useId().replace(/:/g, '');
  const palette =
    PALETTE_OPTIONS.find((p) => p.id === config.palette) || PALETTE_OPTIONS[0];
  const { primary, secondary, bg, bgEnd, isDark } = palette;

  const bgGradId = `bg_${uid}`;
  const mainGradId = `main_${uid}`;
  const accentGradId = `acc_${uid}`;
  const glowGradId = `glow_${uid}`;

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
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor={bgEnd} />
        </linearGradient>
        <linearGradient id={mainGradId} x1="20" y1="15" x2="100" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={secondary} />
          <stop offset="55%" stopColor={primary} />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>
        <linearGradient id={accentGradId} x1="15" y1="100" x2="105" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
        <radialGradient id={glowGradId} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={primary} stopOpacity={isDark ? '0.24' : '0.14'} />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Luxury Crest Base */}
      <rect width="120" height="120" rx="28" fill={`url(#${bgGradId})`} />
      <rect width="120" height="120" rx="28" fill={`url(#${glowGradId})`} />
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="24"
        stroke={`url(#${mainGradId})`}
        strokeOpacity={isDark ? '0.5' : '0.32'}
        strokeWidth="1.8"
      />
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="20"
        stroke={primary}
        strokeOpacity={isDark ? '0.16' : '0.12'}
        strokeWidth="0.9"
      />

      {/* ==================== OUTER FRAMES (12 SHAPES) ==================== */}
      {config.frame === 'royal_shield' && (
        <g>
          <path
            d="M60 12L99 25V58C99 83.5 81.5 101.5 60 109.5C38.5 101.5 21 83.5 21 58V25L60 12Z"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.1' : '0.07'}
          />
          <path
            d="M60 17.5L93.5 29V57.5C93.5 79.5 78.5 95.5 60 103C41.5 95.5 26.5 79.5 26.5 57.5V29L60 17.5Z"
            stroke={secondary}
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
        </g>
      )}

      {config.frame === 'laurel_wreath' && (
        <g stroke={`url(#${mainGradId})`} strokeLinecap="round">
          <path d="M36 96C19 82 17 50 29 27" strokeWidth="2.8" />
          <path d="M84 96C101 82 103 50 91 27" strokeWidth="2.8" />
          {/* Left & Right Laurel Leaves */}
          <path d="M23 40L30 43M20 54L28 56M22 68L30 68M27 81L34 79" stroke={secondary} strokeWidth="2.4" />
          <path d="M97 40L90 43M100 54L92 56M98 68L90 68M93 81L86 79" stroke={secondary} strokeWidth="2.4" />
          <polygon points="60,13 62.5,19 69,19 63.8,22.8 65.8,29 60,25.2 54.2,29 56.2,22.8 51,19 57.5,19" fill={secondary} stroke="none" />
          <path d="M44 102H76" stroke={secondary} strokeWidth="2.6" />
        </g>
      )}

      {config.frame === 'neon_circle' && (
        <g>
          <circle cx="60" cy="60" r="46" stroke={`url(#${mainGradId})`} strokeWidth="3.2" fill={primary} fillOpacity={isDark ? '0.07' : '0.05'} />
          <circle cx="60" cy="60" r="40" stroke={secondary} strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.8" />
          <circle cx="60" cy="14" r="2.6" fill={secondary} />
          <circle cx="60" cy="106" r="2.6" fill={secondary} />
        </g>
      )}

      {config.frame === 'hex_geometry' && (
        <g>
          <polygon
            points="60,12 102,36 102,84 60,108 18,84 18,36"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <polygon
            points="60,18 96.5,39 96.5,81 60,102 23.5,81 23.5,39"
            stroke={secondary}
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
        </g>
      )}

      {config.frame === 'art_deco_arch' && (
        <g>
          <path
            d="M22 102V49C22 28 39 13 60 13C81 13 98 28 98 49V102H22Z"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <path
            d="M28 97V50C28 32 42 19 60 19C78 19 92 32 92 50V97"
            stroke={secondary}
            strokeOpacity="0.55"
            strokeWidth="1.3"
          />
          <line x1="28" y1="97" x2="92" y2="97" stroke={secondary} strokeWidth="2.4" />
        </g>
      )}

      {config.frame === 'octagon_crest' && (
        <g>
          <polygon
            points="41,13 79,13 107,41 107,79 79,107 41,107 13,79 13,41"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <polygon
            points="44,19 76,19 101,44 101,76 76,101 44,101 19,76 19,44"
            stroke={secondary}
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
        </g>
      )}

      {config.frame === 'double_diamond' && (
        <g>
          <rect
            x="25"
            y="25"
            width="70"
            height="70"
            rx="10"
            transform="rotate(45 60 60)"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <rect
            x="26"
            y="26"
            width="68"
            height="68"
            rx="10"
            stroke={secondary}
            strokeOpacity="0.65"
            strokeWidth="1.6"
          />
        </g>
      )}

      {config.frame === 'starburst_seal' && (
        <g>
          <polygon
            points="60,10 69,21 84,17 87,32 102,36 98,51 109,60 98,69 102,84 87,88 84,103 69,99 60,110 51,99 36,103 33,88 18,84 22,69 11,60 22,51 18,36 33,32 36,17 51,21"
            stroke={`url(#${mainGradId})`}
            strokeWidth="2.4"
            fill={primary}
            fillOpacity={isDark ? '0.1' : '0.07'}
          />
          <circle cx="60" cy="60" r="37" stroke={secondary} strokeOpacity="0.55" strokeWidth="1.4" />
        </g>
      )}

      {config.frame === 'film_strip_frame' && (
        <g>
          <rect
            x="16"
            y="18"
            width="88"
            height="84"
            rx="10"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3"
            fill={primary}
            fillOpacity={isDark ? '0.08' : '0.05'}
          />
          <line x1="27" y1="18" x2="27" y2="102" stroke={secondary} strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="93" y1="18" x2="93" y2="102" stroke={secondary} strokeWidth="1.5" strokeOpacity="0.7" />
          {[28, 44, 60, 76, 92].map((y) => (
            <g key={y} fill={secondary} fillOpacity="0.85">
              <rect x="19" y={y - 3} width="5" height="6" rx="1.2" />
              <rect x="96" y={y - 3} width="5" height="6" rx="1.2" />
            </g>
          ))}
        </g>
      )}

      {config.frame === 'crest_banner' && (
        <g>
          <path
            d="M24 22H96V64C96 86 78 100 60 105C42 100 24 86 24 64V22Z"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <path
            d="M16 90L28 84H92L104 90L96 101H24L16 90Z"
            fill={secondary}
            fillOpacity={isDark ? '0.28' : '0.22'}
            stroke={secondary}
            strokeWidth="2"
          />
        </g>
      )}

      {config.frame === 'vintage_oval' && (
        <g>
          <ellipse
            cx="60"
            cy="60"
            rx="46"
            ry="39"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3.2"
            fill={primary}
            fillOpacity={isDark ? '0.09' : '0.06'}
          />
          <ellipse
            cx="60"
            cy="60"
            rx="40"
            ry="33"
            stroke={secondary}
            strokeOpacity="0.55"
            strokeWidth="1.4"
          />
        </g>
      )}

      {/* ==================== CORE EMBLEMS (24 HANDCRAFTED ICONS) ==================== */}
      {config.emblem === 'golden_scorpion' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 79V52C60 39 73 33 66 23L59 29" />
          <ellipse cx="60" cy="63" rx="8.5" ry="11" fill={primary} fillOpacity="0.28" />
          <path d="M45 53C35 45 37 33 47 34C43 39 44 45 49 48" fill={secondary} fillOpacity="0.2" />
          <path d="M75 53C85 45 83 33 73 34C77 39 76 45 71 48" fill={secondary} fillOpacity="0.2" />
          <path d="M49 66L36 74M71 66L84 74M50 74L39 84M70 74L81 84" stroke={secondary} strokeWidth="2.4" />
        </g>
      )}

      {config.emblem === 'winged_lion' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M48 56C30 47 23 35 33 29C41 25 48 37 52 46" stroke={secondary} fill={secondary} fillOpacity="0.2" />
          <path d="M72 56C90 47 97 35 87 29C79 25 72 37 68 46" stroke={secondary} fill={secondary} fillOpacity="0.2" />
          <path d="M60 30L46 50L52 60H68L74 50L60 30Z" fill={primary} fillOpacity="0.3" />
          <path d="M47 82H73L68 60H52L47 82Z" fill={primary} fillOpacity="0.22" />
          <circle cx="55.5" cy="48" r="1.8" fill={secondary} stroke="none" />
          <circle cx="64.5" cy="48" r="1.8" fill={secondary} stroke="none" />
          <path d="M55 26L60 21L65 26" stroke={secondary} strokeWidth="2.2" />
        </g>
      )}

      {config.emblem === 'classic_camera' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="47" cy="43" r="10" fill={primary} fillOpacity="0.22" />
          <circle cx="47" cy="43" r="3" fill={secondary} stroke="none" />
          <circle cx="69" cy="43" r="10" fill={primary} fillOpacity="0.22" />
          <circle cx="69" cy="43" r="3" fill={secondary} stroke="none" />
          <rect x="37" y="54" width="38" height="24" rx="5" fill={primary} fillOpacity="0.3" />
          <path d="M75 60L89 52V80L75 72Z" fill={secondary} fillOpacity="0.28" stroke={secondary} />
          <line x1="45" y1="66" x2="65" y2="66" stroke={secondary} strokeWidth="2" />
        </g>
      )}

      {config.emblem === 'royal_crown' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 74L35 41L50 56L60 31L70 56L85 41L90 74H30Z" fill={primary} fillOpacity="0.3" />
          <rect x="32" y="77" width="56" height="7" rx="3.5" fill={secondary} fillOpacity="0.45" stroke={secondary} strokeWidth="2" />
          <circle cx="60" cy="27" r="3.2" fill={secondary} stroke="none" />
          <circle cx="35" cy="37" r="2.5" fill={secondary} stroke="none" />
          <circle cx="85" cy="37" r="2.5" fill={secondary} stroke="none" />
          <polygon points="60,55 64,62 60,69 56,62" fill={secondary} stroke="none" />
        </g>
      )}

      {config.emblem === 'glowing_pyramid' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="60,26 91,80 29,80" fill={primary} fillOpacity="0.26" />
          <polygon points="60,26 75,80 60,80" fill={secondary} fillOpacity="0.22" stroke="none" />
          <line x1="60" y1="26" x2="60" y2="80" stroke={secondary} strokeWidth="2.2" />
          <line x1="45" y1="54" x2="75" y2="54" stroke={secondary} strokeOpacity="0.65" strokeWidth="1.6" />
          <circle cx="60" cy="46" r="5" fill={secondary} stroke="none" />
          <path d="M24 85H96" stroke={secondary} strokeWidth="2.4" />
        </g>
      )}

      {config.emblem === 'film_reel' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8">
          <circle cx="60" cy="60" r="26" fill={primary} fillOpacity="0.22" />
          <circle cx="60" cy="60" r="7" fill={secondary} fillOpacity="0.35" stroke={secondary} strokeWidth="2" />
          <circle cx="60" cy="44" r="5" fill={secondary} stroke="none" />
          <circle cx="60" cy="76" r="5" fill={secondary} stroke="none" />
          <circle cx="44" cy="60" r="5" fill={secondary} stroke="none" />
          <circle cx="76" cy="60" r="5" fill={secondary} stroke="none" />
          <path d="M74 82C83 84 91 81 95 75" stroke={secondary} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}

      {config.emblem === 'falcon' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 44L52 54L60 32L68 54L96 44L82 65L60 88L38 65L24 44Z" fill={primary} fillOpacity="0.28" />
          <path d="M35 52L60 66L85 52" stroke={secondary} strokeWidth="2.4" />
          <path d="M55 46L60 34L65 46" fill={secondary} fillOpacity="0.45" stroke={secondary} />
        </g>
      )}

      {config.emblem === 'theater_mask' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round">
          <path d="M36 37H84V63C84 79 71 88 60 88C49 88 36 79 36 63V37Z" fill={primary} fillOpacity="0.26" />
          <path d="M46 53C49 49 54 49 56 53" stroke={secondary} strokeWidth="2.6" />
          <path d="M64 53C66 49 71 49 74 53" stroke={secondary} strokeWidth="2.6" />
          <path d="M47 68C53 77 67 77 73 68" stroke={secondary} strokeWidth="3" />
          <line x1="60" y1="37" x2="60" y2="88" stroke={secondary} strokeOpacity="0.35" strokeWidth="1.4" />
        </g>
      )}

      {config.emblem === 'cinema_star' && (
        <g>
          <polygon
            points="60,24 68,46 92,46 73,60 80,84 60,70 40,84 47,60 28,46 52,46"
            stroke={`url(#${mainGradId})`}
            strokeWidth="3"
            strokeLinejoin="round"
            fill={primary}
            fillOpacity="0.3"
          />
          <polygon
            points="60,38 64,50 76,50 66,57 70,69 60,62 50,69 54,57 44,50 56,50"
            fill={secondary}
            fillOpacity="0.55"
          />
        </g>
      )}

      {config.emblem === 'pro_lens' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8">
          <circle cx="60" cy="60" r="26" fill={primary} fillOpacity="0.2" />
          <circle cx="60" cy="60" r="16" stroke={secondary} strokeWidth="2.6" fill={secondary} fillOpacity="0.14" />
          <circle cx="60" cy="60" r="7" fill={primary} fillOpacity="0.45" />
          <circle cx="55" cy="54" r="3" fill={secondary} stroke="none" />
          <path d="M60 34V44M60 76V86M34 60H44M76 60H86" stroke={secondary} strokeOpacity="0.65" strokeWidth="1.8" />
        </g>
      )}

      {config.emblem === 'phoenix_crest' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 26C70 40 90 38 87 60C85 75 72 86 60 90C48 86 35 75 33 60C30 38 50 40 60 26Z" fill={primary} fillOpacity="0.26" />
          <path d="M60 38V80M45 54L60 67L75 54M49 44L60 53L71 44" stroke={secondary} strokeWidth="2.4" />
        </g>
      )}

      {config.emblem === 'crystal_diamond' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinejoin="round">
          <polygon points="42,34 78,34 91,52 60,88 29,52" fill={primary} fillOpacity="0.26" />
          <polygon points="48,34 72,34 60,88" fill={secondary} fillOpacity="0.18" stroke="none" />
          <path d="M29 52H91M42 34L48 52L60 88L72 52L78 34" stroke={secondary} strokeWidth="2" />
        </g>
      )}

      {config.emblem === 'clapper_shield' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="34" y="49" width="52" height="35" rx="6" fill={primary} fillOpacity="0.28" />
          <path d="M34 43L84 32L86 43L36 51Z" fill={secondary} fillOpacity="0.45" stroke={secondary} />
          <line x1="46" y1="40" x2="51" y2="48" stroke={bg} strokeWidth="2.5" />
          <line x1="62" y1="36" x2="67" y2="45" stroke={bg} strokeWidth="2.5" />
          <line x1="44" y1="64" x2="76" y2="64" stroke={secondary} strokeWidth="2" />
          <line x1="44" y1="73" x2="65" y2="73" stroke={secondary} strokeOpacity="0.7" strokeWidth="2" />
        </g>
      )}

      {config.emblem === 'pegasus_wings' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 76C38 76 24 56 29 35C40 46 49 52 60 52C71 52 80 46 91 35C96 56 82 76 60 76Z" fill={primary} fillOpacity="0.26" />
          <path d="M36 54C44 59 52 62 60 62C68 62 76 59 84 54" stroke={secondary} strokeWidth="2.2" />
          <polygon points="60,27 64,37 60,45 56,37" fill={secondary} stroke="none" />
        </g>
      )}

      {config.emblem === 'sphinx_monument' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 80L48 39H72L80 80H40Z" fill={primary} fillOpacity="0.26" />
          <path d="M46 49H74M44 60H76M42 70H78" stroke={secondary} strokeOpacity="0.65" strokeWidth="1.8" />
          <circle cx="60" cy="52" r="7" fill={secondary} fillOpacity="0.5" stroke={secondary} />
          <line x1="32" y1="84" x2="88" y2="84" stroke={secondary} strokeWidth="3.2" />
        </g>
      )}

      {config.emblem === 'oscar_torch' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M51 54H69L64 85H56L51 54Z" fill={primary} fillOpacity="0.3" />
          <path d="M60 24C70 34 70 46 60 53C50 46 50 34 60 24Z" fill={secondary} fillOpacity="0.85" stroke={secondary} />
          <line x1="46" y1="88" x2="74" y2="88" stroke={secondary} strokeWidth="3" />
        </g>
      )}

      {config.emblem === 'griffin_royal' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="58" r="22" fill={primary} fillOpacity="0.2" />
          <polygon points="60,34 78,58 60,82 42,58" fill={secondary} fillOpacity="0.26" stroke={secondary} strokeWidth="2.6" />
          <circle cx="60" cy="58" r="5" fill={secondary} stroke="none" />
        </g>
      )}

      {config.emblem === 'sunburst_eye' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round">
          <path d="M27 60C40 41 80 41 93 60C80 79 40 79 27 60Z" fill={primary} fillOpacity="0.24" />
          <circle cx="60" cy="60" r="10" fill={secondary} fillOpacity="0.4" stroke={secondary} />
          <circle cx="60" cy="60" r="4" fill={secondary} stroke="none" />
          <path d="M60 32V38M60 82V88M42 36L45 41M78 36L75 41" stroke={secondary} strokeWidth="2" />
        </g>
      )}

      {/* === 6 NEW LUXURY CINEMA EMBLEMS === */}
      {config.emblem === 'royal_crescent' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M72 34C56 32 42 44 42 60C42 76 56 88 72 86C61 81 55 71 55 60C55 49 61 39 72 34Z"
            fill={primary}
            fillOpacity="0.34"
          />
          <polygon
            points="76,47 78.5,54 86,54 80,58.5 82,66 76,61.5 70,66 72,58.5 66,54 73.5,54"
            fill={secondary}
            stroke="none"
          />
        </g>
      )}

      {config.emblem === 'lotus_crown' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 30C68 44 68 62 60 76C52 62 52 44 60 30Z" fill={primary} fillOpacity="0.34" />
          <path d="M60 76C45 72 36 58 36 42C47 47 54 57 60 76Z" fill={secondary} fillOpacity="0.24" stroke={secondary} />
          <path d="M60 76C75 72 84 58 84 42C73 47 66 57 60 76Z" fill={secondary} fillOpacity="0.24" stroke={secondary} />
          <path d="M38 82H82" stroke={secondary} strokeWidth="3" />
        </g>
      )}

      {config.emblem === 'spotlight_tower' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M35 28L55 58L45 58L25 32" fill={secondary} fillOpacity="0.24" stroke="none" />
          <path d="M85 28L65 58L75 58L95 32" fill={secondary} fillOpacity="0.24" stroke="none" />
          <polygon points="52,54 68,54 75,86 45,86" fill={primary} fillOpacity="0.3" />
          <line x1="40" y1="86" x2="80" y2="86" stroke={secondary} strokeWidth="3" />
          <circle cx="60" cy="44" r="6" fill={secondary} stroke="none" />
        </g>
      )}

      {config.emblem === 'director_megaphone' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 55L78 36V76L34 61V55Z" fill={primary} fillOpacity="0.3" />
          <path d="M44 65L49 82H57L52 67" fill={secondary} fillOpacity="0.3" stroke={secondary} />
          <path d="M84 48C88 53 88 59 84 64M89 43C95 51 95 61 89 69" stroke={secondary} strokeWidth="2.4" />
        </g>
      )}

      {config.emblem === 'golden_scarab' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="34" r="7" fill={secondary} stroke="none" />
          <ellipse cx="60" cy="64" rx="11" ry="16" fill={primary} fillOpacity="0.32" />
          <line x1="60" y1="48" x2="60" y2="80" stroke={secondary} strokeWidth="2" />
          <path d="M49 58C35 52 27 46 26 39C36 42 44 46 50 51" fill={secondary} fillOpacity="0.24" stroke={secondary} />
          <path d="M71 58C85 52 93 46 94 39C84 42 76 46 70 51" fill={secondary} fillOpacity="0.24" stroke={secondary} />
          <path d="M48 67C37 68 31 65 29 60M72 67C83 68 89 65 91 60" stroke={primary} strokeWidth="2.2" />
        </g>
      )}

      {config.emblem === 'cinema_ribbon' && (
        <g stroke={`url(#${mainGradId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="50" r="18" fill={primary} fillOpacity="0.28" />
          <polygon points="60,39 63,47 71,47 64.5,52 67,60 60,55 53,60 55.5,52 49,47 57,47" fill={secondary} stroke="none" />
          <path d="M51 66L45 89L55 83L60 90V68" fill={secondary} fillOpacity="0.35" stroke={secondary} />
          <path d="M69 66L75 89L65 83L60 90V68" fill={secondary} fillOpacity="0.35" stroke={secondary} />
        </g>
      )}
    </svg>
  );
}
