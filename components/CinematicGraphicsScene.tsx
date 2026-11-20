'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GenreId } from '@/lib/db-resolver';
import { useGameStore } from '@/lib/store';
import { tr } from '@/lib/i18n';
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
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-b from-[#0F171E] via-[#1A2530] to-[#233242] shadow-lg">
      <svg
        viewBox="0 0 600 200"
        className="h-40 w-full sm:h-48"
        aria-label={tr(uiLanguage, `${studioName} Studio Lot`, `مقر استوديو ${studioName}`)}
      >
        <defs>
          <linearGradient id="skyBeamGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF3B0" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.34" />
          </linearGradient>
          <linearGradient id="skyBeamCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9F6F0" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#D91624" stopOpacity="0.26" />
          </linearGradient>
          <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#263544" />
            <stop offset="100%" stopColor="#121B24" />
          </linearGradient>
        </defs>

        {/* Stars */}
        <circle cx="80" cy="34" r="1.5" fill="#FFF3B0" opacity="0.8" />
        <circle cx="165" cy="24" r="1.2" fill="#F9F6F0" opacity="0.6" />
        <circle cx="430" cy="28" r="1.6" fill="#D4AF37" opacity="0.75" />
        <circle cx="520" cy="40" r="1.3" fill="#FFF3B0" opacity="0.7" />

        {/* Sweeping Searchlights */}
        <polygon points="40,0 160,0 130,165 95,165" fill="url(#skyBeamGold)" />
        <polygon points="440,0 560,0 505,165 470,165" fill="url(#skyBeamCrimson)" />

        {/* Flanking Soundstages */}
        <rect
          x="65"
          y="85"
          width="115"
          height="80"
          rx="8"
          fill="url(#buildingGrad)"
          stroke="#D4AF37"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <rect x="65" y="82" width="115" height="6" rx="3" fill="#D4AF37" />
        <text
          x="122"
          y="124"
          textAnchor="middle"
          fill="#F9F6F0"
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
          stroke="#D4AF37"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <rect x="420" y="82" width="115" height="6" rx="3" fill="#D4AF37" />
        <text
          x="477"
          y="124"
          textAnchor="middle"
          fill="#F9F6F0"
          fontSize="11"
          fontWeight="900"
        >
          STAGE 2
        </text>

        {/* Central Grand Studio HQ */}
        <path
          d="M200 72 Q300 32 400 72 L400 165 L200 165 Z"
          fill="#1A2530"
          stroke="#D4AF37"
          strokeWidth="2"
        />
        <rect
          x="212"
          y="66"
          width="176"
          height="18"
          rx="6"
          fill="#D4AF37"
        />
        <text
          x="300"
          y="79"
          textAnchor="middle"
          fill="#1A2530"
          fontSize="10"
          fontWeight="900"
        >
          {studioName}
        </text>

        {/* Illuminated Windows & Entrance */}
        <rect x="230" y="96" width="28" height="22" rx="4" fill="#FFF3B0" fillOpacity="0.28" />
        <rect x="342" y="96" width="28" height="22" rx="4" fill="#FFF3B0" fillOpacity="0.28" />
        <rect
          x="275"
          y="112"
          width="50"
          height="53"
          rx="6"
          fill="#0F171E"
          stroke="#D4AF37"
          strokeWidth="1.5"
        />

        {/* Red Carpet */}
        <polygon points="278,165 322,165 352,200 248,200" fill="#D91624" />
        <line x1="278" y1="165" x2="248" y2="200" stroke="#D4AF37" strokeWidth="2" />
        <line x1="322" y1="165" x2="352" y2="200" stroke="#D4AF37" strokeWidth="2" />

        {/* Ground Lot Line */}
        <line x1="0" y1="165" x2="600" y2="165" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="1.5" />
      </svg>

      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#0F171E]/88 px-3 py-1.5 text-[11px] font-bold text-[#F9F6F0] backdrop-blur-md">
        <span className="leading-snug text-[#FFF3B0]">
          {hasActiveProject
            ? tr(
                uiLanguage,
                `${studioName} · Main Soundstage: "${activeProjectTitle}"`,
                `${studioName} · البلاتوه الرئيسي: «${activeProjectTitle}»`
              )
            : tr(
                uiLanguage,
                `${studioName} · Studio Lot Ready for Your Next Production`,
                `${studioName} · مدينة الإنتاج جاهزة لانطلاق مشروعك القادم`
              )}
        </span>
        <span className="shrink-0 text-[10px] font-black text-[#D4AF37]">
          {isFilming
            ? tr(uiLanguage, 'ON AIR · FILMING', 'ON AIR · جاري التصوير')
            : tr(uiLanguage, 'STUDIO HQ', 'المقر الرئيسي')}
        </span>
      </div>
    </div>
  );
}

/**
 * 2a. Talent Portrait with real image_url support (Custom Stars + External Mod Packs)
 * and automatic onError fallback to illustrated SVG portrait.
 */
export function TalentPortrait({
  imageUrl,
  name,
  gender = 'male',
  role = 'actor',
  tier = 'B',
  age = 35,
  isRising = false,
  imgClassName = 'h-full w-full object-cover',
}: {
  imageUrl?: string | null;
  name: string;
  gender?: 'male' | 'female' | 'M' | 'F';
  role?: string;
  tier?: string;
  age?: number;
  isRising?: boolean;
  imgClassName?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cleanUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const isValidUrl =
    cleanUrl.length > 0 &&
    (cleanUrl.startsWith('https://') ||
      cleanUrl.startsWith('http://') ||
      cleanUrl.startsWith('data:image/') ||
      cleanUrl.startsWith('/'));

  if (isValidUrl && failedUrl !== cleanUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cleanUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(cleanUrl)}
        className={imgClassName}
      />
    );
  }

  return (
    <TalentCharacterPortraitSvg
      name={name}
      gender={gender}
      role={role}
      tier={tier}
      age={age}
      isRising={isRising}
    />
  );
}

/**
 * 2b. Illustrated Character Portrait SVG for Actors, Directors & Technical Crew
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
  const hairColors = ['#1A2530', '#0F171E', '#3E2723', '#4A2311', '#263544'];
  const suitColors = [
    '#1A2530',
    '#263544',
    '#0F171E',
    '#7F1D1D',
    '#3B2614',
    '#14532D',
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
      ? '#5C1119'
      : isRising
      ? '#3B2614'
      : '#0F171E';
  const bottomColor =
    tier === 'S'
      ? '#D4AF37'
      : tier === 'A'
      ? '#D91624'
      : isRising
      ? '#B8860B'
      : '#263544';

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
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-br from-[#0F171E] via-[#1A2530] to-[#253545] text-[#F9F6F0] shadow-xl">
      <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
        <motion.div
          animate={{ rotate: isComplete ? 0 : [-4, 4, -4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#D91624]/25 text-[#D4AF37] shadow-inner"
        >
          <Clapperboard className="h-6 w-6" />
        </motion.div>

        <div className="font-display mt-2.5 text-sm font-black text-[#D4AF37] sm:text-base">
          {tr(uiLanguage, `Soundstage Set · "${title}"`, `بلاتوه تصوير «${title}»`)}
        </div>
        <div className="mt-1 text-xs font-bold text-[#F9F6F0]/80">
          {tr(
            uiLanguage,
            `Director: ${directorName} · Starring: ${leadName}`,
            `إخراج: ${directorName} · البطولة: ${leadName}`
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D4AF37]/30 bg-[#0F171E]/90 px-3.5 py-2 text-[11px] font-bold">
        <span className="text-[#D4AF37]">
          {tr(
            uiLanguage,
            `Shoot Day ${dayCurrent} of ${dayTotal} ${isComplete ? '(Wrap Complete ✓)' : '(REC ● FILMING)'}`,
            `مشهد اليوم ${dayCurrent} من ${dayTotal} ${isComplete ? '(اكتمل التصوير ✓)' : '(REC ● جاري التصوير)'}`
          )}
        </span>
        <span className="text-emerald-400">
          {tr(uiLanguage, 'Cameras Rolling', 'كاميرات البلاتوه نشطة')}
        </span>
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
  currencyLabel = 'EGP',
  rank,
  criticScore,
}: {
  title: string;
  isSeries: boolean;
  currentStep: number;
  maxSteps: number;
  liveRevenueFormatted: string;
  currencyLabel?: string;
  rank: number;
  criticScore: number;
}) {
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-b from-[#0F171E] via-[#1A2530] to-[#2B171D] p-5 text-center text-[#F9F6F0] shadow-xl">
      <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-black text-amber-300">
        {isSeries ? <Tv className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
        <span>
          {isSeries
            ? tr(
                uiLanguage,
                `TV & Digital Broadcast · Episode ${currentStep} of ${maxSteps}`,
                `البث التلفزيوني والرقمي · الحلقة ${currentStep} من ${maxSteps}`
              )
            : tr(
                uiLanguage,
                `Theatrical Premiere Screen · Day ${currentStep} of ${maxSteps}`,
                `شاشة العرض الكبرى · اليوم ${currentStep} من ${maxSteps}`
              )}
        </span>
      </div>

      <h3 className="font-display mt-2 text-xl font-black text-white sm:text-2xl">
        {tr(uiLanguage, `"${title}"`, `« ${title} »`)}
      </h3>

      <div className="font-display mt-2 text-2xl font-black text-emerald-400 tabular-nums sm:text-3xl" dir="ltr">
        {liveRevenueFormatted} {currencyLabel}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs font-bold text-amber-200">
        <span>
          {tr(uiLanguage, `Season Rank #${rank}`, `المركز #${rank} في الموسم`)}
        </span>
        <span>·</span>
        <span>
          {tr(uiLanguage, `Critics ${criticScore}/10`, `تقييم النقاد ${criticScore}/10`)}
        </span>
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
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-br from-[#0F171E] via-[#1A2530] to-[#3B151A] p-5 text-center text-[#F9F6F0] shadow-xl">
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
            ? tr(
                uiLanguage,
                `Your studio has won ${wonCount} Golden Trophies 🏆`,
                `تتويج شركتك بـ ${wonCount} جوائز ذهبية في المهرجان 🏆`
              )
            : tr(
                uiLanguage,
                'The Red Carpet & Golden Festival Stage',
                'السجادة الحمراء والمسرح الذهبي للمهرجان'
              )}
        </span>
      </div>
    </div>
  );
}
