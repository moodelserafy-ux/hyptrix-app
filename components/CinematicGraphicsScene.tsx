'use client';

import React from 'react';
import { GenreId } from '@/lib/db-resolver';
import { Cinematic3DStage } from './Cinematic3DStage';

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

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
    <Cinematic3DStage
      kind="studio"
      title={studioName || 'HYPTRIX STUDIOS'}
      subtitle={hasActiveProject ? `بلاتوه نشط · ${activeProjectTitle || 'مشروع جديد'}` : isFilming ? 'وحدات التصوير تعمل الآن' : 'مدينة إنتاج سينمائي ثلاثية الأبعاد'}
      heightClass="h-44 sm:h-52"
      accent="#d4af37"
    />
  );
}

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
    '#4F46E5',
    '#7C3AED',
    '#0284C7',
    '#E11D48',
    '#059669',
    '#D97706',
    '#1E1B4B',
  ];

  const skin = skinTones[seed % skinTones.length];
  const hair = age >= 58 ? '#94A3B8' : hairColors[(seed >> 2) % hairColors.length];
  const outfit = suitColors[(seed >> 4) % suitColors.length];
  const hasGlasses = role === 'director' || seed % 5 === 0;
  const hasBeard = !isFemale && seed % 2 === 0;

  const bgGradId = `avatar_bg_${seed % 9999}`;

  const topColor =
    tier === 'S'
      ? '#FEF08A'
      : tier === 'A'
      ? '#DDD6FE'
      : isRising
      ? '#FDE68A'
      : '#CFFAFE';
  const bottomColor =
    tier === 'S'
      ? '#F59E0B'
      : tier === 'A'
      ? '#7C3AED'
      : isRising
      ? '#EA580C'
      : '#0284C7';

  return (
    <svg
      viewBox="0 0 80 80"
      className="h-full w-full"
      aria-label={name}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={bottomColor} />
        </linearGradient>
      </defs>

      {/* Vibrant Tier Aura Background */}
      <rect width="80" height="80" rx="16" fill={`url(#${bgGradId})`} />

      {/* Subtle Spotlight Ring */}
      <circle
        cx="40"
        cy="36"
        r="28"
        fill="#FFFFFF"
        fillOpacity="0.28"
      />

      {/* Shoulders / Suit / Gown */}
      <path
        d="M14 80 Q16 56 40 56 Q64 56 66 80 Z"
        fill={outfit}
      />
      {/* White Collar / Lapel */}
      <polygon points="32,57 40,69 48,57" fill="#FFFFFF" />
      {!isFemale ? (
        <polygon points="38,61 42,61 41,76 39,76" fill="#F43F5E" />
      ) : (
        <circle cx="40" cy="63" r="3.5" fill="#FDE047" />
      )}

      {/* Neck */}
      <rect x="35" y="46" width="10" height="12" rx="4" fill={skin} />

      {/* Back Hair for Female */}
      {isFemale && (
        <path
          d="M20 34 Q18 56 26 60 L54 60 Q62 56 60 34 Z"
          fill={hair}
        />
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
      <path d="M31 29 Q34 27 37 29" stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M43 29 Q46 27 49 29" stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="33" r="2" fill="#0F172A" />
      <circle cx="46" cy="33" r="2" fill="#0F172A" />
      <circle cx="34.6" cy="32.4" r="0.6" fill="#FFFFFF" />
      <circle cx="46.6" cy="32.4" r="0.6" fill="#FFFFFF" />

      {/* Director / Star Sunglasses or Eyeglasses */}
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
            stroke="#F59E0B"
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
            stroke="#F59E0B"
            strokeWidth="1.6"
          />
          <line x1="38.5" y1="33" x2="41.5" y2="33" stroke="#F59E0B" strokeWidth="1.6" />
        </g>
      )}

      {/* Beard / Mustache for Male */}
      {hasBeard && (
        <path
          d="M28 40 Q40 50 52 40 Q50 50 40 51 Q30 50 28 40 Z"
          fill={hair}
          fillOpacity="0.85"
        />
      )}

      {/* Confident Smile */}
      <path
        d="M35 42 Q40 46 45 42"
        stroke={isFemale ? '#E11D48' : '#78350F'}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Role Emblem Corner Prop */}
      {role === 'director' ? (
        <g transform="translate(54, 54)">
          <circle cx="11" cy="11" r="10" fill="#1E1B4B" stroke="#FBBF24" strokeWidth="1.5" />
          <polygon points="6,11 15,6 15,16" fill="#F59E0B" />
        </g>
      ) : role === 'cinematographer' ? (
        <g transform="translate(54, 54)">
          <circle cx="11" cy="11" r="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="11" cy="11" r="4.5" fill="#38BDF8" />
        </g>
      ) : role === 'composer' ? (
        <g transform="translate(54, 54)">
          <circle cx="11" cy="11" r="10" fill="#4C1D95" stroke="#F472B6" strokeWidth="1.5" />
          <circle cx="9" cy="14" r="2.5" fill="#FDE047" />
          <path d="M11 14 L11 7 L16 8" stroke="#FDE047" strokeWidth="1.8" fill="none" />
        </g>
      ) : role === 'editor_vfx' ? (
        <g transform="translate(54, 54)">
          <circle cx="11" cy="11" r="10" fill="#064E3B" stroke="#34D399" strokeWidth="1.5" />
          <polygon points="11,5 13,9 17,11 13,13 11,17 9,13 5,11 9,9" fill="#34D399" />
        </g>
      ) : tier === 'S' ? (
        <g transform="translate(54, 6)">
          <circle cx="10" cy="10" r="9" fill="#1E1B4B" fillOpacity="0.8" />
          <polygon
            points="10,4 12,8 16,8.5 13,11.5 14,15.5 10,13.5 6,15.5 7,11.5 4,8.5 8,8"
            fill="#FDE047"
          />
        </g>
      ) : null}
    </svg>
  );
}


export function AnimatedFilmingSetGraphic({
  title,
  genre,
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
  const genreLabels: Record<string, string> = {
    action: 'بلاتوه أكشن ومطاردات',
    superhero: 'تصوير أبطال وخدع بصرية',
    heist: 'وحدة سرقات ومطاردات',
    psychological_horror: 'إضاءة رعب نفسي',
    supernatural_horror: 'مؤثرات ما وراء الطبيعة',
    sci_fi: 'استوديو مؤثرات مستقبلية',
    fantasy: 'ديكورات فانتازيا',
    historical: 'ديكور تاريخي',
    biography: 'بلاتوه السيرة الذاتية',
    comedy: 'تصوير كوميدي',
    light_comedy: 'تصوير عائلي',
    romance: 'إضاءة رومانسية',
    crime_mystery: 'تصوير جريمة وغموض',
    popular_drama: 'بلاتوه الدراما الشعبية',
  };

  return (
    <Cinematic3DStage
      kind="filming"
      title={title || 'بلاتوه التصوير'}
      subtitle={`${genreLabels[genre] || 'تصوير سينمائي'} · ${isComplete ? 'انتهى التصوير' : `اليوم ${dayCurrent} من ${dayTotal}`} · ${directorName} × ${leadName}`}
      heightClass="h-44 sm:h-52"
      accent="#e50914"
    />
  );
}

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
    <Cinematic3DStage
      kind="premiere"
      title={title || 'العرض السينمائي الأول'}
      subtitle={`${isSeries ? `الحلقة ${currentStep}/${maxSteps}` : `شباك التذاكر · اليوم ${currentStep}/${maxSteps}`} · ${liveRevenueFormatted} ج.م · المركز ${rank} · النقاد ${criticScore}/10`}
      heightClass="h-44 sm:h-52"
      accent="#8b5cf6"
    />
  );
}

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
    <Cinematic3DStage
      kind="festival"
      title={festivalName || 'مهرجان السينما'}
      subtitle={`${year} · ${wonCount} جائزة · سجادة حمراء وتمثال ذهبي ثلاثي الأبعاد`}
      heightClass="h-40 sm:h-48"
      accent="#e8bd49"
    />
  );
}

