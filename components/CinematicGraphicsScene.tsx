'use client';

import React from 'react';
import { motion } from 'motion/react';
import { GenreId } from '@/lib/db-resolver';
import { Clapperboard, Film, Sparkles, Trophy, Tv } from 'lucide-react';

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * 1. Animated Studio Lot Scene (AnimatedStudioLotGraphic)
 */
export function AnimatedStudioLotGraphic({
  studioName,
  hasActiveProject,
  activeProjectTitle,
  isFilming,
}: {
  studioName: string;
  hasActiveProject?: boolean;
  activeProjectTitle?: string;
  isFilming?: boolean;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-b from-[#13112B] via-[#1E1B4B] to-[#312E81] shadow-lg">
      <svg
        viewBox="0 0 600 200"
        className="h-40 w-full sm:h-48"
        aria-label={`مقر استوديو ${studioName}`}
      >
        <defs>
          <linearGradient id="skyBeamGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id="skyBeamCyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
        </defs>

        {/* Stars */}
        <circle cx="80" cy="34" r="1.5" fill="#FDE047" opacity="0.8" />
        <circle cx="165" cy="24" r="1.2" fill="#FFFFFF" opacity="0.6" />
        <circle cx="430" cy="28" r="1.6" fill="#FDE047" opacity="0.7" />
        <circle cx="520" cy="40" r="1.3" fill="#38BDF8" opacity="0.8" />

        {/* Sweeping Searchlights */}
        <polygon points="40,0 160,0 130,165 95,165" fill="url(#skyBeamGold)" />
        <polygon points="440,0 560,0 505,165 470,165" fill="url(#skyBeamCyan)" />

        {/* Flanking Soundstages */}
        <rect
          x="65"
          y="85"
          width="115"
          height="80"
          rx="8"
          fill="url(#buildingGrad)"
          stroke="#6366F1"
          strokeWidth="1.5"
        />
        <rect x="65" y="82" width="115" height="6" rx="3" fill="#F59E0B" />
        <text
          x="122"
          y="124"
          textAnchor="middle"
          fill="#C7D2FE"
          fontSize="11"
          fontWeight="900"
        >
          STAGE 1
        </text>

        <rect
          x="420"
          y="85"
          width="115"
          height="80"
          rx="8"
          fill="url(#buildingGrad)"
          stroke="#6366F1"
          strokeWidth="1.5"
        />
        <rect x="420" y="82" width="115" height="6" rx="3" fill="#F59E0B" />
        <text
          x="477"
          y="124"
          textAnchor="middle"
          fill="#C7D2FE"
          fontSize="11"
          fontWeight="900"
        >
          STAGE 2
        </text>

        {/* Central Grand Studio HQ */}
        <path
          d="M200 72 Q300 32 400 72 L400 165 L200 165 Z"
          fill="#1E1B4B"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        <rect
          x="212"
          y="66"
          width="176"
          height="18"
          rx="6"
          fill="#F59E0B"
        />
        <text
          x="300"
          y="79"
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="900"
        >
          {studioName}
        </text>

        {/* Illuminated Windows & Entrance */}
        <rect x="230" y="96" width="28" height="22" rx="4" fill="#38BDF8" fillOpacity="0.35" />
        <rect x="342" y="96" width="28" height="22" rx="4" fill="#38BDF8" fillOpacity="0.35" />
        <rect
          x="275"
          y="112"
          width="50"
          height="53"
          rx="6"
          fill="#0F172A"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />

        {/* Red Carpet */}
        <polygon points="278,165 322,165 352,200 248,200" fill="#E11D48" />
        <line x1="278" y1="165" x2="248" y2="200" stroke="#F59E0B" strokeWidth="2" />
        <line x1="322" y1="165" x2="352" y2="200" stroke="#F59E0B" strokeWidth="2" />

        {/* Ground Lot Line */}
        <line x1="0" y1="165" x2="600" y2="165" stroke="#818CF8" strokeWidth="1.5" />
      </svg>

      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-300/30 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
        <span className="leading-snug text-amber-300">
          {hasActiveProject
            ? `${studioName} · البلاتوه الرئيسي: «${activeProjectTitle}»`
            : `${studioName} · مدينة الإنتاج جاهزة لانطلاق مشروعك القادم`}
        </span>
        <span className="shrink-0 text-[10px] font-black text-cyan-300">
          {isFilming ? 'ON AIR · جاري التصوير' : 'المقر الرئيسي'}
        </span>
      </div>
    </div>
  );
}

/**
 * 2. Illustrated Character Portrait SVG for Actors, Directors & Technical Crew
 */
export function TalentCharacterPortraitSvg({
  name,
  gender = 'male',
  role = 'actor',
  tier = 'B',
  age = 35,
  isRising = false,
}: {
  name: string;
  gender?: 'male' | 'female' | 'M' | 'F';
  role?: string;
  tier?: string;
  age?: number;
  isRising?: boolean;
}) {
  const seed = hashString(name);
  const isFemale = gender === 'female' || gender === 'F';

  const skinTones = ['#F5CBA7', '#F0B27A', '#E59866', '#FAD7A0', '#D4AC6E'];
  const hairColors = ['#1E293B', '#0F172A', '#3E2723', '#4A2311', '#334155'];
  const suitColors = [
    '#16161D',
    '#311042',
    '#0F172A',
    '#7F1D1D',
    '#1E1B4B',
    '#064E3B',
  ];

  const skin = skinTones[seed % skinTones.length];
  const hair = age >= 58 ? '#94A3B8' : hairColors[(seed >> 2) % hairColors.length];
  const outfit = suitColors[(seed >> 4) % suitColors.length];
  const hasGlasses = role === 'director' || seed % 5 === 0;
  const hasBeard = !isFemale && seed % 2 === 0;

  const bgGradId = `avatar_bg_${seed % 9999}`;

  const topColor =
    tier === 'S'
      ? '#451A03'
      : tier === 'A'
      ? '#2E1065'
      : isRising
      ? '#7C2D12'
      : '#0F172A';
  const bottomColor =
    tier === 'S'
      ? '#D4AF37'
      : tier === 'A'
      ? '#7C3AED'
      : isRising
      ? '#EA580C'
      : '#1E293B';

  return (
    <svg viewBox="0 0 80 80" className="h-full w-full" aria-label={name}>
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={bottomColor} />
        </linearGradient>
      </defs>

      <rect width="80" height="80" rx="14" fill={`url(#${bgGradId})`} />
      <circle cx="40" cy="36" r="27" fill="#D4AF37" fillOpacity="0.14" />

      {/* Shoulders / Suit / Gown */}
      <path d="M14 80 Q16 56 40 56 Q64 56 66 80 Z" fill={outfit} />
      <polygon points="32,57 40,69 48,57" fill="#F8FAFC" />
      {!isFemale ? (
        <polygon points="38,61 42,61 41,76 39,76" fill="#E50914" />
      ) : (
        <circle cx="40" cy="63" r="3.5" fill="#D4AF37" />
      )}

      {/* Neck */}
      <rect x="35" y="46" width="10" height="12" rx="4" fill={skin} />

      {/* Back Hair for Female */}
      {isFemale && (
        <path d="M20 34 Q18 56 26 60 L54 60 Q62 56 60 34 Z" fill={hair} />
      )}

      {/* Face / Head */}
      <ellipse cx="40" cy="35" rx="15" ry="17" fill={skin} />

      {/* Top Hair */}
      {isFemale ? (
        <path
          d="M24 32 Q26 14 40 15 Q56 14 56 32 Q48 23 40 25 Q30 23 24 32 Z"
          fill={hair}
        />
      ) : (
        <path
          d="M25 30 Q25 15 40 15 Q55 15 55 30 Q49 22 40 23 Q31 22 25 30 Z"
          fill={hair}
        />
      )}

      {/* Eyes & Eyebrows */}
      <path
        d="M31 29 Q34 27 37 29"
        stroke={hair}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M43 29 Q46 27 49 29"
        stroke={hair}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="34" cy="33" r="2" fill="#0F172A" />
      <circle cx="46" cy="33" r="2" fill="#0F172A" />
      <circle cx="34.6" cy="32.4" r="0.6" fill="#FFFFFF" />
      <circle cx="46.6" cy="32.4" r="0.6" fill="#FFFFFF" />

      {hasGlasses && (
        <g>
          <rect
            x="28.5"
            y="29.5"
            width="10"
            height="7"
            rx="2"
            fill={role === 'director' ? '#0F172A' : 'none'}
            fillOpacity={role === 'director' ? '0.75' : '0'}
            stroke="#D4AF37"
            strokeWidth="1.6"
          />
          <rect
            x="41.5"
            y="29.5"
            width="10"
            height="7"
            rx="2"
            fill={role === 'director' ? '#0F172A' : 'none'}
            fillOpacity={role === 'director' ? '0.75' : '0'}
            stroke="#D4AF37"
            strokeWidth="1.6"
          />
          <line
            x1="38.5"
            y1="33"
            x2="41.5"
            y2="33"
            stroke="#D4AF37"
            strokeWidth="1.6"
          />
        </g>
      )}

      {hasBeard && (
        <path
          d="M28 40 Q40 50 52 40 Q50 50 40 51 Q30 50 28 40 Z"
          fill={hair}
          fillOpacity="0.85"
        />
      )}

      <path
        d="M35 42 Q40 46 45 42"
        stroke={isFemale ? '#E11D48' : '#78350F'}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * 3. Soundstage Filming Set Graphic (AnimatedFilmingSetGraphic)
 */
export function AnimatedFilmingSetGraphic({
  title,
  leadName,
  directorName,
  dayCurrent,
  dayTotal,
  isComplete,
}: {
  title: string;
  genre: GenreId;
  leadName: string;
  directorName: string;
  dayCurrent: number;
  dayTotal: number;
  isComplete?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white shadow-xl">
      <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
        <motion.div
          animate={{ rotate: isComplete ? 0 : [-4, 4, -4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-inner"
        >
          <Clapperboard className="h-6 w-6" />
        </motion.div>

        <div className="font-display mt-2.5 text-sm font-black text-amber-300 sm:text-base">
          بلاتوه تصوير «{title}»
        </div>
        <div className="mt-1 text-xs font-bold text-indigo-200">
          إخراج: {directorName} · البطولة: {leadName}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-500/30 bg-slate-900/90 px-3.5 py-2 text-[11px] font-bold">
        <span className="text-amber-300">
          مشهد اليوم {dayCurrent} من {dayTotal}{' '}
          {isComplete ? '(اكتمل التصوير ✓)' : '(REC ● جاري التصوير)'}
        </span>
        <span className="text-cyan-300">كاميرات البلاتوه نشطة</span>
      </div>
    </div>
  );
}

/**
 * 4. Cinema Premiere Auditorium / Broadcast Screen (AnimatedCinemaPremiereGraphic)
 */
export function AnimatedCinemaPremiereGraphic({
  title,
  isSeries,
  currentStep,
  maxSteps,
  liveRevenueFormatted,
  rank,
  criticScore,
}: {
  title: string;
  isSeries: boolean;
  currentStep: number;
  maxSteps: number;
  liveRevenueFormatted: string;
  rank: number;
  criticScore: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-slate-950 via-indigo-950 to-violet-950 p-5 text-center text-white shadow-xl">
      <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-black text-amber-300">
        {isSeries ? <Tv className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
        <span>
          {isSeries
            ? `البث التلفزيوني والرقمي · الحلقة ${currentStep} من ${maxSteps}`
            : `شاشة العرض الكبرى · اليوم ${currentStep} من ${maxSteps}`}
        </span>
      </div>

      <h3 className="font-display mt-2 text-xl font-black text-white sm:text-2xl">
        « {title} »
      </h3>

      <div className="font-display mt-2 text-2xl font-black text-emerald-400 tabular-nums sm:text-3xl">
        {liveRevenueFormatted} ج.م
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs font-bold text-amber-200">
        <span>المركز #{rank} في الموسم</span>
        <span>·</span>
        <span>تقييم النقاد {criticScore}/10</span>
      </div>
    </div>
  );
}

/**
 * 5. Red Carpet & Golden Trophy Scene (AnimatedRedCarpetFestivalGraphic)
 */
export function AnimatedRedCarpetFestivalGraphic({
  festivalName,
  year,
  wonCount,
}: {
  festivalName: string;
  year: number;
  wonCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-950 p-5 text-center text-white shadow-xl">
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-lg"
      >
        <Trophy className="h-7 w-7" />
      </motion.div>

      <div className="font-display mt-2.5 text-base font-black text-amber-300 sm:text-lg">
        {festivalName} · {year}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-100">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span>
          {wonCount > 0
            ? `تتويج شركتك بـ ${wonCount} جوائز ذهبية في المهرجان 🏆`
            : 'السجادة الحمراء والمسرح الذهبي للمهرجان'}
        </span>
      </div>
    </div>
  );
}
