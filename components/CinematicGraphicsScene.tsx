'use client';

import React from 'react';
import { motion } from 'motion/react';
import { GenreId } from '@/lib/db-resolver';

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * 1. Animated 2.5D Studio Lot Graphic for StudioHubView
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
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-b from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-3 shadow-inner">
      {/* Animated Sky Spotlights */}
      <svg
        viewBox="0 0 520 175"
        className="h-36 w-full sm:h-44"
        aria-label="مشهد مدينة الإنتاج السينمائي التفاعلي"
      >
        <defs>
          <linearGradient id="beamLeft" x1="0%" y1="100%" x2="60%" y2="0%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamRight" x1="100%" y1="100%" x2="40%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="stageBuilding" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EEF2FF" />
            <stop offset="100%" stopColor="#C7D2FE" />
          </linearGradient>
          <linearGradient id="goldDome" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="redCarpetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#BE123C" />
          </linearGradient>
        </defs>

        {/* Twinkling Stars */}
        {[
          { cx: 45, cy: 25, d: 0 },
          { cx: 120, cy: 18, d: 0.5 },
          { cx: 210, cy: 30, d: 1.1 },
          { cx: 340, cy: 20, d: 0.3 },
          { cx: 465, cy: 28, d: 0.8 },
          { cx: 410, cy: 42, d: 1.4 },
        ].map((st, idx) => (
          <motion.circle
            key={idx}
            cx={st.cx}
            cy={st.cy}
            r="2"
            fill="#FDE047"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: st.d }}
          />
        ))}

        {/* Sweeping Searchlights */}
        <motion.polygon
          points="75,155 10,5 155,5"
          fill="url(#beamLeft)"
          animate={{ rotate: [-14, 16, -14] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '75px 155px' }}
        />
        <motion.polygon
          points="445,155 365,5 510,5"
          fill="url(#beamRight)"
          animate={{ rotate: [14, -16, 14] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '445px 155px' }}
        />

        {/* Floating Studio Blimp & Aerial Camera Drone in the Sky */}
        <motion.g
          animate={{ x: [-18, 22, -18], y: [0, -4, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="145" cy="34" rx="42" ry="13" fill="#F8FAFC" stroke="#818CF8" strokeWidth="2" />
          <ellipse cx="145" cy="34" rx="34" ry="8" fill="#4F46E5" />
          <polygon points="103,34 92,26 92,42" fill="#F59E0B" />
          <rect x="132" y="47" width="26" height="6" rx="3" fill="#FDE047" />
          <text
            x="145"
            y="37"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="7.5"
            fontWeight="900"
          >
            HYPTRIX
          </text>
        </motion.g>

        {/* Hovering Cinema Drone */}
        <motion.g
          animate={{ x: [12, -24, 12], y: [-3, 5, -3] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="366" y="30" width="24" height="6" rx="3" fill="#38BDF8" />
          <line x1="360" y1="28" x2="372" y2="28" stroke="#FDE047" strokeWidth="2" />
          <line x1="384" y1="28" x2="396" y2="28" stroke="#FDE047" strokeWidth="2" />
          <circle cx="378" cy="39" r="3.5" fill="#EF4444" />
        </motion.g>

        {/* Background Soundstage 2 (Left) */}
        <rect
          x="32"
          y="78"
          width="110"
          height="74"
          rx="10"
          fill="#E0E7FF"
          stroke="#818CF8"
          strokeWidth="2"
        />
        <path d="M32 88 Q87 62 142 88" fill="#6366F1" />
        <rect x="48" y="96" width="26" height="18" rx="4" fill="#312E81" />
        <rect x="86" y="96" width="38" height="14" rx="4" fill="#F59E0B" />
        <text x="105" y="106" textAnchor="middle" fill="#1E1B4B" fontSize="7.5" fontWeight="900">
          STAGE 2
        </text>

        {/* Background Soundstage 3 (Right) */}
        <rect
          x="378"
          y="78"
          width="110"
          height="74"
          rx="10"
          fill="#E0E7FF"
          stroke="#818CF8"
          strokeWidth="2"
        />
        <path d="M378 88 Q433 62 488 88" fill="#06B6D4" />
        <rect x="396" y="96" width="38" height="14" rx="4" fill="#EC4899" />
        <text x="415" y="106" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="900">
          VFX LAB
        </text>
        <rect x="444" y="96" width="26" height="18" rx="4" fill="#312E81" />

        {/* Central Grand Studio Headquarters Building */}
        <rect
          x="160"
          y="54"
          width="200"
          height="98"
          rx="14"
          fill="url(#stageBuilding)"
          stroke="#4F46E5"
          strokeWidth="2.5"
        />
        {/* Golden Art-Deco Arch & Roof */}
        <path d="M180 54 Q260 22 340 54 Z" fill="url(#goldDome)" />

        {/* Spinning Film Reels on Roof */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '205px 46px' }}
        >
          <circle cx="205" cy="46" r="13" fill="#1E1B4B" stroke="#FBBF24" strokeWidth="2.5" />
          <circle cx="205" cy="40" r="2.5" fill="#FDE047" />
          <circle cx="205" cy="52" r="2.5" fill="#FDE047" />
          <circle cx="199" cy="46" r="2.5" fill="#FDE047" />
          <circle cx="211" cy="46" r="2.5" fill="#FDE047" />
        </motion.g>

        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '315px 46px' }}
        >
          <circle cx="315" cy="46" r="13" fill="#1E1B4B" stroke="#FBBF24" strokeWidth="2.5" />
          <circle cx="315" cy="40" r="2.5" fill="#FDE047" />
          <circle cx="315" cy="52" r="2.5" fill="#FDE047" />
          <circle cx="309" cy="46" r="2.5" fill="#FDE047" />
          <circle cx="321" cy="46" r="2.5" fill="#FDE047" />
        </motion.g>

        {/* Studio Marquee Sign */}
        <rect
          x="185"
          y="64"
          width="150"
          height="24"
          rx="7"
          fill="#1E1B4B"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        <text
          x="260"
          y="80"
          textAnchor="middle"
          fill="#FDE047"
          fontSize="10.5"
          fontWeight="900"
        >
          {studioName.slice(0, 22)}
        </text>

        {/* Studio Entrance & Red Carpet */}
        <rect x="228" y="102" width="64" height="50" rx="8" fill="#1E1B4B" />
        <polygon points="232,152 288,152 312,175 208,175" fill="url(#redCarpetGrad)" />
        {/* Golden Carpet Stanchions */}
        <circle cx="222" cy="162" r="3" fill="#FBBF24" />
        <circle cx="298" cy="162" r="3" fill="#FBBF24" />

        {/* Live Recording Blinking Light when Project is Active */}
        {hasActiveProject && (
          <g>
            <motion.circle
              cx="260"
              cy="115"
              r="5"
              fill={isFilming ? '#EF4444' : '#10B981'}
              animate={{ opacity: [1, 0.25, 1], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <text
              x="260"
              y="132"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="7.5"
              fontWeight="900"
            >
              {isFilming ? 'ON AIR · جاري التصوير' : 'تحضير العمل'}
            </text>
          </g>
        )}

        {/* Animated Camera Dolly Crew on the Lot */}
        <motion.g
          animate={{ x: [0, 34, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="92" y="142" width="28" height="8" rx="3" fill="#475569" />
          <circle cx="98" cy="152" r="4" fill="#FBBF24" />
          <circle cx="114" cy="152" r="4" fill="#FBBF24" />
          <rect x="101" y="128" width="12" height="14" rx="2" fill="#0F172A" />
          <polygon points="113,131 124,126 124,140 113,136" fill="#38BDF8" />
        </motion.g>

        {/* Ground Lot Road */}
        <rect x="0" y="152" width="520" height="23" fill="#0F172A" fillOpacity="0.45" />
      </svg>

      {/* Live Overlay Badge */}
      <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-xs">
        <span className="flex items-center gap-1.5 truncate">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isFilming
                ? 'animate-ping bg-rose-500'
                : hasActiveProject
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="truncate">
            {hasActiveProject
              ? `بلاتوه الاستوديو: «${activeProjectTitle}»`
              : 'بلاتوهات التصوير جاهزة لانطلاق مشروعك القادم'}
          </span>
        </span>
        <span className="shrink-0 rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">
          {isFilming ? 'كاميرا دايرة 🎬' : 'مقر الاستوديو'}
        </span>
      </div>
    </div>
  );
}

/**
 * 2. Custom Illustrated Character Portrait SVG for Actors, Directors & Technical Crew
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

/**
 * 3. Animated Live Filming Soundstage Graphic for Stage4ProductionCrises
 */
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
  const genreTheme: Record<string, { bgFrom: string; bgTo: string; accent: string; label: string }> = {
    action: { bgFrom: '#450A0A', bgTo: '#991B1B', accent: '#F97316', label: 'مشاهد مطاردات وأكشن حي 🔥' },
    superhero: { bgFrom: '#311042', bgTo: '#7C2D12', accent: '#FBBF24', label: 'مشاهد أبطال خارقين وخدع بصرية ⚡' },
    heist: { bgFrom: '#0F172A', bgTo: '#1E3A8A', accent: '#38BDF8', label: 'تصوير خطة السطو والمطاردات 💎' },
    psychological_horror: { bgFrom: '#090D16', bgTo: '#311042', accent: '#A855F7', label: 'إضاءة غموض ورعب نفسي 🌫️' },
    supernatural_horror: { bgFrom: '#090D16', bgTo: '#3B0764', accent: '#C084FC', label: 'لوكيشن ما وراء الطبيعة والأساطير 👻' },
    sci_fi: { bgFrom: '#082F49', bgTo: '#1E1B4B', accent: '#38BDF8', label: 'كروما خضراء ومؤثرات مستقبلية 🛸' },
    fantasy: { bgFrom: '#1E1B4B', bgTo: '#4C1D95', accent: '#F472B6', label: 'ديكور فانتازيا وعوالم سحرية ✨' },
    historical: { bgFrom: '#422006', bgTo: '#78350F', accent: '#FBBF24', label: 'ديكور تاريخي وإضاءة كلاسيكية ⚔️' },
    biography: { bgFrom: '#27272A', bgTo: '#44403C', accent: '#FDE047', label: 'بلاتوه السيرة الذاتية والحقبة الزمنية 📖' },
    comedy: { bgFrom: '#1E1B4B', bgTo: '#4338CA', accent: '#FACC15', label: 'لوكيشن كوميدي مبهج 🎭' },
    light_comedy: { bgFrom: '#1E3A8A', bgTo: '#0284C7', accent: '#FDE047', label: 'لوكيشن لايت كوميدي عائلي 🌟' },
    romance: { bgFrom: '#4C0519', bgTo: '#831843', accent: '#F43F5E', label: 'إضاءة دافئة ومشاهد رومانسية 💖' },
    crime_mystery: { bgFrom: '#0F172A', bgTo: '#1E293B', accent: '#22D3EE', label: 'تصوير ليلي وتحقيقات غموض ⚡' },
    popular_drama: { bgFrom: '#1E1B4B', bgTo: '#312E81', accent: '#A78BFA', label: 'بلاتوه الحارة والدراما الشعبية 🎬' },
  };
  const activeTheme = genreTheme[genre] || {
    bgFrom: '#1E1B4B',
    bgTo: '#312E81',
    accent: '#A78BFA',
    label: 'بلاتوه التصوير السينمائي 🎬',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-slate-950 p-3 text-white shadow-md">
      <svg
        viewBox="0 0 520 180"
        className="h-40 w-full sm:h-44"
        aria-label="بلاتوه التصوير السينمائي المتحرك"
      >
        <defs>
          <linearGradient id="setBackdrop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeTheme.bgFrom} />
            <stop offset="100%" stopColor={activeTheme.bgTo} />
          </linearGradient>
          <linearGradient id="studioLampBeam" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soundstage Backdrop */}
        <rect width="520" height="180" rx="14" fill="url(#setBackdrop)" />

        {/* Overhead Rigging Truss */}
        <rect x="10" y="10" width="500" height="8" rx="4" fill="#334155" />
        {/* Studio Overhead Spotlights */}
        <polygon points="150,18 95,155 215,155" fill="url(#studioLampBeam)" />
        <polygon points="350,18 285,155 415,155" fill="url(#studioLampBeam)" />
        <rect x="142" y="14" width="16" height="10" rx="3" fill="#FBBF24" />
        <rect x="342" y="14" width="16" height="10" rx="3" fill="#FBBF24" />

        {/* Genre-Specific Set Props in Center Stage */}
        <rect
          x="165"
          y="42"
          width="210"
          height="102"
          rx="10"
          fill="#0F172A"
          fillOpacity="0.55"
          stroke={activeTheme.accent}
          strokeWidth="2"
        />

        {/* Dynamic Genre Effects inside the Set */}
        {(genre === 'action' || genre === 'superhero') && (
          <motion.g
            animate={{ scale: [0.9, 1.18, 0.9], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ transformOrigin: '270px 95px' }}
          >
            <circle cx="270" cy="95" r="26" fill="#EA580C" fillOpacity="0.45" />
            <circle cx="270" cy="95" r="15" fill="#FDE047" fillOpacity="0.7" />
          </motion.g>
        )}

        {(genre === 'sci_fi' || genre === 'fantasy') && (
          <motion.circle
            cx="270"
            cy="92"
            r="24"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '270px 92px' }}
          />
        )}

        {/* Two Actors Performing on Set */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Lead Actor Silhouette */}
          <circle cx="242" cy="82" r="11" fill="#FDE68A" />
          <path d="M226 138 Q228 96 242 96 Q256 96 258 138 Z" fill="#6366F1" />
          {/* Co-star / Antagonist Silhouette */}
          <circle cx="302" cy="84" r="10.5" fill="#FED7AA" />
          <path d="M287 138 Q289 98 302 98 Q315 98 317 138 Z" fill="#F43F5E" />
        </motion.g>

        {/* Overhead Boom Mic */}
        <motion.g
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '390px 35px' }}
        >
          <line x1="390" y1="35" x2="275" y2="62" stroke="#94A3B8" strokeWidth="3" />
          <ellipse cx="272" cy="63" rx="8" ry="4" fill="#F43F5E" />
        </motion.g>

        {/* Moving Cinema Camera on Dolly Track (Left) */}
        <rect x="28" y="148" width="120" height="5" rx="2.5" fill="#64748B" />
        <motion.g
          animate={{ x: [0, 42, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Dolly Base */}
          <rect x="40" y="136" width="44" height="10" rx="4" fill="#F59E0B" />
          <circle cx="48" cy="148" r="5" fill="#E2E8F0" />
          <circle cx="76" cy="148" r="5" fill="#E2E8F0" />
          {/* Camera Tripod & Cinema Camera */}
          <line x1="62" y1="136" x2="54" y2="104" stroke="#CBD5E1" strokeWidth="3" />
          <line x1="62" y1="136" x2="70" y2="104" stroke="#CBD5E1" strokeWidth="3" />
          <rect x="46" y="84" width="32" height="20" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
          {/* Dual Camera Reels */}
          <motion.circle
            cx="54"
            cy="77"
            r="7"
            fill="#1E293B"
            stroke="#FBBF24"
            strokeWidth="2"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.circle
            cx="69"
            cy="77"
            r="7"
            fill="#1E293B"
            stroke="#FBBF24"
            strokeWidth="2"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
          {/* Lens Matte Box */}
          <polygon points="78,88 92,82 92,106 78,100" fill="#38BDF8" />
        </motion.g>

        {/* Animated Snapping Clapperboard (Right) */}
        <g transform="translate(415, 76)">
          <rect
            x="0"
            y="18"
            width="76"
            height="54"
            rx="6"
            fill="#0F172A"
            stroke="#F8FAFC"
            strokeWidth="2"
          />
          {/* Top Hinged Clapper Stick */}
          <motion.g
            animate={{ rotate: isComplete ? 0 : [-18, 0, -18] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '4px 18px' }}
          >
            <rect x="0" y="8" width="76" height="10" rx="3" fill="#F8FAFC" />
            <polygon points="10,8 20,8 14,18 4,18" fill="#0F172A" />
            <polygon points="30,8 40,8 34,18 24,18" fill="#0F172A" />
            <polygon points="50,8 60,8 54,18 44,18" fill="#0F172A" />
          </motion.g>
          <text x="38" y="36" textAnchor="middle" fill="#FDE047" fontSize="8.5" fontWeight="900">
            SCENE {dayCurrent}/{dayTotal}
          </text>
          <text x="38" y="50" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="700">
            {title.slice(0, 13)}
          </text>
          <text x="38" y="63" textAnchor="middle" fill="#38BDF8" fontSize="7" fontWeight="800">
            {isComplete ? 'WRAP ✓' : 'REC ●'}
          </text>
        </g>
      </svg>

      {/* Bottom Live Set Status Strip */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-bold text-indigo-100 backdrop-blur-xs">
        <span>{activeTheme.label}</span>
        <span className="font-black text-amber-300">
          إخراج: {directorName} · بطولة: {leadName}
        </span>
      </div>
    </div>
  );
}

/**
 * 4. Animated Cinema Premiere & TV Broadcast Graphic for Stage5ReleaseSimulation
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-violet-300 bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#312E81] p-3 text-white shadow-md">
      <svg
        viewBox="0 0 520 175"
        className="h-38 w-full sm:h-44"
        aria-label="شاشة العرض الجماهيري التفاعلية"
      >
        <defs>
          <linearGradient id="projBeam" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="cinemaScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Red Velvet Curtains (Left & Right) */}
        <path d="M0 0 L68 0 Q52 85 36 165 L0 165 Z" fill="#BE123C" />
        <path d="M520 0 L452 0 Q468 85 484 165 L520 165 Z" fill="#BE123C" />

        {/* Projector Light Cone */}
        <motion.polygon
          points="260,175 95,18 425,18"
          fill="url(#projBeam)"
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        />

        {/* Giant Glowing Cinema / Broadcast Screen */}
        <rect
          x="95"
          y="16"
          width="330"
          height="104"
          rx="14"
          fill="url(#cinemaScreenGrad)"
          stroke="#FDE047"
          strokeWidth="3"
        />

        {/* Animated Equalizer / Box Office Momentum Bars inside Screen */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
          <motion.rect
            key={idx}
            x={122 + idx * 36}
            y={76}
            width="18"
            height="32"
            rx="4"
            fill="#FDE047"
            fillOpacity="0.32"
            animate={{
              height: [14, 38, 22, 42, 16],
              y: [94, 70, 86, 66, 92],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: idx * 0.18,
            }}
          />
        ))}

        {/* Movie / Series Title & Live Numbers on Screen */}
        <rect
          x="195"
          y="26"
          width="130"
          height="18"
          rx="9"
          fill="#0F172A"
          fillOpacity="0.65"
        />
        <text x="260" y="38" textAnchor="middle" fill="#FDE047" fontSize="8.5" fontWeight="900">
          {isSeries
            ? `بث الحلقة ${currentStep} من ${maxSteps}`
            : `شباك التذاكر · اليوم ${currentStep} من ${maxSteps}`}
        </text>

        <text
          x="260"
          y="64"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="16"
          fontWeight="900"
        >
          « {title.slice(0, 24)} »
        </text>

        <text
          x="260"
          y="88"
          textAnchor="middle"
          fill="#A7F3D0"
          fontSize="13"
          fontWeight="900"
        >
          {liveRevenueFormatted} ج.م
        </text>

        <text
          x="260"
          y="107"
          textAnchor="middle"
          fill="#E0E7FF"
          fontSize="9"
          fontWeight="800"
        >
          المركز #{rank} بالموسم · تقييم النقاد {criticScore}/10
        </text>

        {/* Audience Silhouettes in Cinema Seats */}
        {[75, 115, 155, 195, 235, 275, 315, 355, 395, 435].map((cx, i) => (
          <motion.g
            key={i}
            animate={{ y: [0, i % 2 === 0 ? -3 : -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.15 }}
          >
            <rect x={cx - 14} y="146" width="28" height="26" rx="6" fill="#1E293B" />
            <circle cx={cx} cy="140" r="9" fill="#0F172A" />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/**
 * 5. Animated Red Carpet & Golden Trophy Stage Graphic for Stage6FestivalsAwards & WorldPopupsOverlay
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-[#1E1B4B] via-[#311042] to-[#451A03] p-3 text-white shadow-md">
      <svg
        viewBox="0 0 520 155"
        className="h-34 w-full sm:h-38"
        aria-label="مسرح جوائز المهرجان السينمائي"
      >
        <defs>
          <linearGradient id="goldSpot" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Golden Stage Curtains & Spotlights */}
        <motion.polygon
          points="150,0 80,155 230,155"
          fill="url(#goldSpot)"
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '150px 0px' }}
        />
        <motion.polygon
          points="370,0 290,155 440,155"
          fill="url(#goldSpot)"
          animate={{ rotate: [8, -8, 8] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '370px 0px' }}
        />

        {/* Paparazzi Camera Flashes */}
        {[
          { cx: 65, cy: 48, d: 0.1 },
          { cx: 120, cy: 85, d: 0.7 },
          { cx: 400, cy: 65, d: 0.4 },
          { cx: 455, cy: 42, d: 1.1 },
          { cx: 205, cy: 36, d: 0.9 },
          { cx: 320, cy: 34, d: 0.2 },
        ].map((fl, i) => (
          <motion.circle
            key={i}
            cx={fl.cx}
            cy={fl.cy}
            r="6"
            fill="#FFFFFF"
            animate={{ opacity: [0, 0.95, 0], scale: [0.4, 1.8, 0.4] }}
            transition={{ duration: 1.9, repeat: Infinity, delay: fl.d }}
          />
        ))}

        {/* Falling Golden Confetti & Sparkles */}
        {[
          { x: 95, y: 18, c: '#FDE047', d: 0 },
          { x: 145, y: 26, c: '#38BDF8', d: 0.4 },
          { x: 195, y: 14, c: '#F43F5E', d: 0.8 },
          { x: 325, y: 20, c: '#FDE047', d: 0.2 },
          { x: 375, y: 16, c: '#A78BFA', d: 0.6 },
          { x: 430, y: 24, c: '#34D399', d: 1.0 },
        ].map((cf, idx) => (
          <motion.rect
            key={idx}
            x={cf.x}
            y={cf.y}
            width="5"
            height="9"
            rx="1.5"
            fill={cf.c}
            animate={{
              y: [0, 95],
              rotate: [0, 220],
              opacity: [1, 0.9, 0],
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              delay: cf.d,
              ease: 'linear',
            }}
          />
        ))}

        {/* Red Carpet Stage Pedestal */}
        <polygon points="150,155 370,155 330,115 190,115" fill="#BE123C" stroke="#FBBF24" strokeWidth="2" />

        {/* Central Shimmering Golden Trophy */}
        <motion.g
          animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '260px 75px' }}
        >
          <circle cx="260" cy="64" r="34" fill="#FDE047" fillOpacity="0.18" />
          {/* Trophy Cup */}
          <path
            d="M240 40 L280 40 L274 72 Q260 84 246 72 Z"
            fill="url(#trophyGold)"
          />
          {/* Trophy Handles */}
          <path
            d="M240 45 Q228 45 232 60 Q236 68 246 66"
            stroke="#FDE047"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M280 45 Q292 45 288 60 Q284 68 274 66"
            stroke="#FDE047"
            strokeWidth="3"
            fill="none"
          />
          {/* Stem & Base */}
          <rect x="256" y="76" width="8" height="18" fill="url(#trophyGold)" />
          <rect x="242" y="94" width="36" height="10" rx="3" fill="#B45309" stroke="#FDE047" strokeWidth="1.5" />
        </motion.g>

        {/* Festival Banner Text */}
        <text x="260" y="24" textAnchor="middle" fill="#FEF08A" fontSize="11.5" fontWeight="900">
          {festivalName} · {year}
        </text>
        <text x="260" y="138" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900">
          {wonCount > 0
            ? `تتويج تاريخي لشركتك بـ ${wonCount} جوائز رسمية 🏆`
            : 'السجادة الحمراء وإعلان جوائز لجنة التحكيم'}
        </text>
      </svg>
    </div>
  );
}
