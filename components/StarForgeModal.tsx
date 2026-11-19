'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  Film,
  Camera,
  Sparkles,
  X,
  CheckCircle2,
  Wallet,
  Crown,
  Upload,
  Award,
  ArrowRight,
  ArrowLeft,
  Star,
  ImagePlus,
  Trash2,
  Clapperboard,
  Zap,
} from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { ActorItem, GenreId } from '@/lib/db-resolver';
import {
  HexagonalRadarChartSvg,
  ClapperChipButton,
  Fut3DTiltCard,
  SixRadarStats,
} from '@/components/CustomCinemaIcons';
import {
  playMetalLockDrop,
  playCameraShutterFlash,
  playCashRegisterChaChing,
  playHeavyIronStamp,
} from '@/lib/sound-fx';

function getStatMetaForGender(gender: 'male' | 'female'): {
  key: keyof SixRadarStats;
  label: string;
  stickyNote: string;
}[] {
  const isFemale = gender === 'female';
  return [
    {
      key: 'charisma',
      label: 'الكاريزما والحضور',
      stickyNote: isFemale
        ? 'دي اللي بتخلي الجمهور يغفرلها لو الفيلم قصته تعبانة وتتصدر الأفيش!'
        : 'دي اللي بتخلي الجمهور يغفرله لو الفيلم قصته تعبانة!',
    },
    {
      key: 'acting',
      label: 'الأداء الدرامي',
      stickyNote: isFemale
        ? 'مشهد ماستر سين واحد منها بيبكي القاعة ويجيب جائزة أفضل ممثلة!'
        : 'دمعة واحدة منه في المشهد الأخير بتجيب ترشيح أوسكار ولجنة النقاد بتركع!',
    },
    {
      key: 'action',
      label: 'الأكشن واللياقة',
      stickyNote: isFemale
        ? 'مشاهد مطاردات ومعارك حماسية بدون دوبلير تخطف أنفاس الشباب!'
        : 'بينط من فوق الكوبري من غير دوبلير وبيكسر قاعات العيد!',
    },
    {
      key: 'comedy',
      label: 'الكوميديا وخفة الظل',
      stickyNote: isFemale
        ? 'ريأكشن وإفيه واحد منها بيقلب تيك توك تريند لمدة شهر كامل!'
        : 'إفيه واحد منه بيقلب تيك توك تريند لمدة شهر كامل!',
    },
    {
      key: 'popularity',
      label: 'الجماهيرية والسوشيال',
      stickyNote: isFemale
        ? 'اسمها لوحده على الأفيش بيبيع العمل للمنصات والقنوات بأعلى سعر!'
        : 'اسمه لوحده على الأفيش بيبيع العمل للمنصات والقنوات قبل ما يتصور!',
    },
    {
      key: 'boxOffice',
      label: 'جذب شباك التذاكر',
      stickyNote: isFemale
        ? 'مغناطيس إيرادات.. حفلات كاملة العدد من أول ليلة عرض في مصر والخليج!'
        : 'مغناطيس فلوس.. الطوابير بتقفل الشارع قدام السينما من أول ليلة عرض!',
    },
  ];
}

const GENRE_ARCHETYPE_LABELS: Record<
  GenreId,
  { male: string; female: string }
> = {
  action: { male: 'بطل أكشن ومطاردات', female: 'نجمة أكشن وإثارة' },
  popular_drama: { male: 'نجم الدراما الشعبية', female: 'سيدة الدراما الأولى' },
  comedy: { male: 'نجم الكوميديا الجماهيرية', female: 'نجمة الكوميديا الساخرة' },
  light_comedy: { male: 'بطل اللايت كوميدي', female: 'نجمة اللايت كوميدي' },
  psychological_horror: {
    male: 'بطل الرعب النفسي',
    female: 'أيقونة الرعب والغموض',
  },
  supernatural_horror: {
    male: 'نجم ما وراء الطبيعة',
    female: 'بطلة الرعب الخارق',
  },
  crime_mystery: {
    male: 'محقق الجريمة والغموض',
    female: 'نجمة الإثارة البوليسية',
  },
  sci_fi: { male: 'بطل الخيال العلمي', female: 'نجمة المستقبل والخيال' },
  romance: { male: 'فتى الشاشة الرومانسي', female: 'نجمة الرومانسية الحالمة' },
  historical: {
    male: 'فارس الملاحم التاريخية',
    female: 'ملكة الدراما التاريخية',
  },
  biography: { male: 'بطل السير الذاتية', female: 'نجمة السير الذاتية' },
  heist: { male: 'عقل السطو والذكاء', female: 'ماستر الخداع والسطو' },
  fantasy: { male: 'بطل الفانتازيا والأساطير', female: 'أميرة الأساطير السحرية' },
  superhero: { male: 'البطل الخارق', female: 'البطلة الخارقة' },
};

const QUICK_GENRE_CHIPS: { id: GenreId; label: string }[] = [
  { id: 'action', label: 'أكشن ومطاردات' },
  { id: 'popular_drama', label: 'دراما شعبية' },
  { id: 'comedy', label: 'كوميديا جماهيرية' },
  { id: 'romance', label: 'رومانسي سينمائي' },
  { id: 'crime_mystery', label: 'جريمة وغموض' },
];

/**
 * Generates a self-contained Royal Cinema monogram SVG data URI when the player
 * does not upload a custom photo — zero external dependencies or broken URLs.
 */
function buildRoyalMonogramPortraitDataUrl(
  name: string,
  gender: 'male' | 'female',
  overall: number
): string {
  const cleanName = (name || 'نجم').trim();
  const initial = cleanName.charAt(0) || '★';
  const accent = gender === 'female' ? '#D91624' : '#D4AF37';
  const safeInitial = initial.replace(/[<>&"']/g, '');
  const safeName = cleanName.slice(0, 18).replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460">
    <defs>
      <radialGradient id="spot" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#2D3F50"/>
        <stop offset="70%" stop-color="#1A2530"/>
        <stop offset="100%" stop-color="#0E151C"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF3B0"/>
        <stop offset="50%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#9A7210"/>
      </linearGradient>
    </defs>
    <rect width="400" height="460" fill="url(#spot)"/>
    <rect x="18" y="18" width="364" height="424" rx="22" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.7"/>
    <circle cx="200" cy="185" r="88" fill="#111921" stroke="url(#gold)" stroke-width="5"/>
    <circle cx="200" cy="185" r="76" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="6 6" opacity="0.8"/>
    <text x="200" y="212" text-anchor="middle" fill="#D4AF37" font-size="82" font-weight="900" font-family="serif">${safeInitial}</text>
    <text x="200" y="330" text-anchor="middle" fill="#F9F6F0" font-size="26" font-weight="800" font-family="sans-serif">${safeName}</text>
    <text x="200" y="370" text-anchor="middle" fill="#D4AF37" font-size="16" font-weight="700" font-family="monospace">ROYAL CASTING · ${overall} OVR</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function StarForgeModal() {
  const isStarForgeOpen = useGameStore((s) => s.isStarForgeOpen);
  const setStarForgeOpen = useGameStore((s) => s.setStarForgeOpen);
  const starForgeLocksOpened = useGameStore(
    (s) => s.starForgeLocksOpened || 0
  );
  const unlockNextStarForgeLockWithAd = useGameStore(
    (s) => s.unlockNextStarForgeLockWithAd
  );
  const cash = useGameStore((s) => s.cash);
  const spendForStarForgeUpgrade = useGameStore(
    (s) => s.spendForStarForgeUpgrade
  );
  const createCustomVipStar = useGameStore((s) => s.createCustomVipStar);
  const showToast = useGameStore((s) => s.showToast);

  // Mobile-friendly 3-Step Casting Wizard
  const [castingStep, setCastingStep] = useState<1 | 2 | 3>(1);
  const [watchingAdIndex, setWatchingAdIndex] = useState<number | null>(null);
  const [droppedLockIndex, setDroppedLockIndex] = useState<number | null>(null);

  const [starGender, setStarGender] = useState<'male' | 'female'>('male');
  const [starName, setStarName] = useState('فارس الدهبي');
  const [starAge, setStarAge] = useState<number>(28);
  const [primaryGenre, setPrimaryGenre] = useState<GenreId>('action');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [cameraFlashActive, setCameraFlashActive] = useState(false);
  const [hoveredStatKey, setHoveredStatKey] =
    useState<keyof SixRadarStats>('charisma');
  const [trainingAdLoading, setTrainingAdLoading] = useState(false);

  const [radarStats, setRadarStats] = useState<SixRadarStats>({
    charisma: 76,
    acting: 74,
    action: 78,
    comedy: 70,
    popularity: 75,
    boxOffice: 77,
  });

  const [revealedStar, setRevealedStar] = useState<ActorItem | null>(null);
  const [isStampingReveal, setIsStampingReveal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isStarForgeOpen) return null;

  const allLocksOpened = starForgeLocksOpened >= 5;
  const statMetaList = getStatMetaForGender(starGender);

  const handleSwitchGender = (nextGender: 'male' | 'female') => {
    setStarGender(nextGender);
    if (nextGender === 'female' && starName === 'فارس الدهبي') {
      setStarName('ليلى الشامي');
    } else if (nextGender === 'male' && starName === 'ليلى الشامي') {
      setStarName('فارس الدهبي');
    }
  };

  const handleSwitchGenre = (nextGenre: GenreId) => {
    setPrimaryGenre(nextGenre);
    setRadarStats((prev) => ({
      ...prev,
      action: nextGenre === 'action' ? Math.max(prev.action, 80) : prev.action,
      acting:
        nextGenre === 'popular_drama' || nextGenre === 'crime_mystery'
          ? Math.max(prev.acting, 80)
          : prev.acting,
      comedy: nextGenre === 'comedy' ? Math.max(prev.comedy, 80) : prev.comedy,
      charisma:
        nextGenre === 'romance' ? Math.max(prev.charisma, 80) : prev.charisma,
    }));
  };

  const triggerPhotoFlash = (newUrl: string) => {
    playCameraShutterFlash();
    setCameraFlashActive(true);
    setPhotoUrl(newUrl);
    setTimeout(() => {
      setCameraFlashActive(false);
    }, 380);
  };

  const handleFileDropOrSelect = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('اختر ملف صورة صحيح (JPG أو PNG أو WEBP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        triggerPhotoFlash(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWatchAdToUnlock = () => {
    if (watchingAdIndex !== null || allLocksOpened) return;
    const currentLock = starForgeLocksOpened;
    setWatchingAdIndex(currentLock);
    setTimeout(() => {
      playMetalLockDrop();
      setDroppedLockIndex(currentLock);
      unlockNextStarForgeLockWithAd();
      setWatchingAdIndex(null);
      setTimeout(() => setDroppedLockIndex(null), 700);
    }, 650);
  };

  const handleIncrementStat = (key: keyof SixRadarStats) => {
    const currentVal = radarStats[key];
    if (currentVal >= 99) return;

    const isEliteTier = currentVal >= 80;
    const cashCost = isEliteTier ? 3_500_000 : 1_500_000;

    const ok = spendForStarForgeUpgrade(cashCost, 0);
    if (!ok) {
      return;
    }

    playCashRegisterChaChing();
    setRadarStats((prev) => ({
      ...prev,
      [key]: Math.min(99, prev[key] + 2),
    }));
  };

  const handleDecrementStat = (key: keyof SixRadarStats) => {
    const currentVal = radarStats[key];
    if (currentVal <= 60) return;
    setRadarStats((prev) => ({
      ...prev,
      [key]: Math.max(60, prev[key] - 2),
    }));
  };

  const handleAdTrainingCampBoost = () => {
    if (trainingAdLoading) return;
    const upgradableKeys = (
      Object.keys(radarStats) as (keyof SixRadarStats)[]
    ).filter((k) => radarStats[k] < 99);
    if (upgradableKeys.length === 0) {
      showToast('جميع مهارات النجم وصلت للحد الأقصى 99 بالفعل!', 'success');
      return;
    }
    setTrainingAdLoading(true);
    setTimeout(() => {
      playCashRegisterChaChing();
      setRadarStats((prev) => {
        const next = { ...prev };
        let pointsLeft = 4;
        let guard = 0;
        while (pointsLeft > 0 && guard < 20) {
          guard++;
          const pool = (Object.keys(next) as (keyof SixRadarStats)[]).filter(
            (k) => next[k] < 99
          );
          if (pool.length === 0) break;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          next[pick] = Math.min(99, next[pick] + 1);
          pointsLeft--;
        }
        return next;
      });
      setTrainingAdLoading(false);
      showToast(
        'اكتمل معسكر التدريب المكثف! (+4 نقاط طاقة مجاناً)',
        'success',
        'ارتفعت مهارات نجمك الجاهز للكاستينج بدون خصم من الخزينة.'
      );
    }, 600);
  };

  const overallRating = Math.min(
    99,
    Math.round(
      (radarStats.charisma +
        radarStats.acting +
        radarStats.action +
        radarStats.comedy +
        radarStats.popularity +
        radarStats.boxOffice) /
        6
    )
  );

  const archetypeTitle =
    GENRE_ARCHETYPE_LABELS[primaryGenre]?.[starGender] ||
    (starGender === 'female' ? 'نجمة شباك حصرية' : 'نجم شباك حصري');

  const estimatedBaseSalary = Math.max(8_000_000, overallRating * 180_000);
  const previewPortraitUrl =
    photoUrl ||
    buildRoyalMonogramPortraitDataUrl(starName, starGender, overallRating);

  const handleCertifyDiamondStar = () => {
    if (!starName.trim()) {
      showToast('اكتب اسم النجم أولاً ليتم توقيع الكارت الألماظ!', 'warning');
      setCastingStep(1);
      return;
    }

    setIsStampingReveal(true);
    playHeavyIronStamp();

    const newActor: ActorItem = {
      id: `custom_star_${Date.now()}`,
      name: starName.trim(),
      gender: starGender,
      age: starAge,
      tier: 'S',
      image_url: previewPortraitUrl,
      base_salary: estimatedBaseSalary,
      archetype: `${archetypeTitle} · نجم الاستوديو الحصري`,
      isCustomStar: true,
      autographSignature: starName.trim(),
      radarStats: { ...radarStats },
      stats: {
        overall: overallRating,
        acting: radarStats.acting,
        charisma: radarStats.charisma,
        box_office_pull: radarStats.boxOffice,
        ego: 22,
      },
      genre_mastery: {
        [primaryGenre]: Math.min(99, overallRating + 5),
        action: radarStats.action,
        popular_drama: radarStats.acting,
        comedy: radarStats.comedy,
        romance: radarStats.charisma,
      },
    };

    setTimeout(() => {
      createCustomVipStar(newActor);
      setRevealedStar(newActor);
      setIsStampingReveal(false);
    }, 550);
  };

  const handleClose = () => {
    setRevealedStar(null);
    setCastingStep(1);
    setStarForgeOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-2.5 sm:p-4 bg-[#1A2530]/88 backdrop-blur-md overflow-y-auto overscroll-contain touch-none select-none"
        dir="rtl"
      >
        {/* Camera Flash Overlay when photo is uploaded */}
        <AnimatePresence>
          {cameraFlashActive && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.36 }}
              className="fixed inset-0 z-[200] bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* STAGE A: TOP SECRET RED VELVET FOLDER (5 Golden Locks Entrance) */}
        {!allLocksOpened && !revealedStar && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-lg rounded-[30px] bg-gradient-to-br from-[#D91624] via-[#A90F1B] to-[#5D060D] border-4 border-[#D4AF37] shadow-[0_30px_80px_rgba(0,0,0,0.75)] p-5 sm:p-7 text-[#F9F6F0] my-auto"
          >
            {/* Golden Vanity Bulbs Row */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D4AF37]/35">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((b) => (
                    <span
                      key={b}
                      className="w-2.5 h-2.5 rounded-full bg-[#FFF4CC] border border-[#D4AF37] vanity-bulb inline-block"
                    />
                  ))}
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-[#1A2530] border border-[#D4AF37] font-typewriter text-[11px] font-black text-[#D4AF37]">
                  ملف سري للغاية · خاص
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-xl bg-[#1A2530]/85 hover:bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center border border-[#D4AF37]/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#1A2530]/85 border border-[#D4AF37] text-[#D4AF37] text-xs font-extrabold mb-2 shadow">
                <Crown className="w-3.5 h-3.5" />
                <span>خزينة كاستينج الأساطير بمكتب الإمبراطور</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-[#F9F6F0] tracking-wide">
                غرفة صناعة النجوم
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#F9F6F0]/90 mt-1.5 leading-relaxed">
                «اكتشف نجمك الخاص.. افتح الأقفال الذهبية الـ 5 لتبدأ رحلة صناعة أسطورة سينمائية خالدة»
              </p>
            </div>

            {/* 5 Golden Locks & 5 Cinema Film Reels */}
            <div className="grid grid-cols-5 gap-2 my-5">
              {[0, 1, 2, 3, 4].map((idx) => {
                const isUnlocked = idx < starForgeLocksOpened;
                const isDropping = droppedLockIndex === idx;
                const isWatching = watchingAdIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                      isUnlocked
                        ? 'bg-[#D4AF37]/30 border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.45)]'
                        : 'bg-[#1A2530]/80 border-[#D4AF37]/35 opacity-90'
                    }`}
                  >
                    <motion.div
                      animate={isWatching ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 0.7 }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 border-2 ${
                        isUnlocked
                          ? 'bg-[#D4AF37] text-[#1A2530] border-white'
                          : 'bg-[#1A2530] text-[#F9F6F0]/45 border-[#F9F6F0]/20'
                      }`}
                    >
                      <Film className="w-5 h-5" />
                    </motion.div>

                    <motion.div
                      animate={
                        isDropping
                          ? { y: [0, -10, 60], opacity: [1, 1, 0] }
                          : { y: 0, opacity: 1 }
                      }
                      className="text-[10px] font-extrabold text-center"
                    >
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-0.5 text-[#D4AF37]">
                          <Unlock className="w-3 h-3" />
                          مفتوح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[#F9F6F0]/85">
                          <Lock className="w-3 h-3 text-[#D4AF37]" />#{idx + 1}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleWatchAdToUnlock}
              disabled={watchingAdIndex !== null}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-extrabold text-sm sm:text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>
                {watchingAdIndex !== null
                  ? 'جاري تشغيل بكرة العرض وفك القفل الذهبي...'
                  : `مشاهدة إعلان لفك القفل (${starForgeLocksOpened}/5)`}
              </span>
            </button>
          </motion.div>
        )}

        {/* STAGE B: LUXURY ROYAL CASTING STUDIO WIZARD */}
        {allLocksOpened && !revealedStar && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl rounded-[30px] bg-[#F9F6F0] text-[#1A2530] border-4 border-[#D4AF37] shadow-[0_32px_90px_rgba(0,0,0,0.75)] overflow-hidden my-auto max-h-[92dvh] flex flex-col touch-pan-y"
          >
            {/* Hollywood Vanity Mirror Header */}
            <div className="bg-gradient-to-l from-[#1A2530] via-[#22313F] to-[#1A2530] px-4 sm:px-5 py-3.5 border-b-4 border-[#D4AF37] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9E7818] text-[#1A2530] flex items-center justify-center shrink-0 shadow">
                  <Clapperboard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base sm:text-xl text-[#F9F6F0] truncate">
                      غرفة صناعة النجوم الملكية
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D91624] text-white text-[10px] font-black border border-[#D4AF37]">
                      {overallRating} OVR
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#D4AF37] truncate">
                    كابينة الكاستينج الحصرية · صمّم أسطورة شباك التذاكر القادمة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-2.5 py-1.5 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/45 text-[#F9F6F0] flex items-center gap-1.5 text-[11px]">
                  <Wallet className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span dir="ltr" className="font-typewriter font-black">
                    {formatMoney(cash)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="إغلاق غرفة صناعة النجوم"
                  className="w-9 h-9 rounded-xl bg-[#D91624] hover:brightness-110 text-white flex items-center justify-center border border-[#D4AF37] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-Step Visual Stepper Ribbon */}
            <div className="grid grid-cols-3 bg-[#EFE9DC] border-b-2 border-[#D4AF37]/50 p-1.5 gap-1.5 shrink-0">
              {[
                { id: 1, num: '1', title: 'الهوية والصورة', sub: 'بطاقة الكاستينج' },
                { id: 2, num: '2', title: 'الرادار والطاقات', sub: '6 مهارات أساسية' },
                { id: 3, num: '3', title: 'الكارت الألماظ', sub: 'الاعتماد والتوقيع' },
              ].map((s) => {
                const active = castingStep === s.id;
                const completed = castingStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCastingStep(s.id as 1 | 2 | 3)}
                    className={`min-h-[44px] py-2 px-2 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      active
                        ? 'bg-[#1A2530] text-[#F9F6F0] border-[#D4AF37] shadow-md'
                        : completed
                        ? 'bg-[#15803D]/15 text-[#15803D] border-[#15803D]/40'
                        : 'bg-[#F9F6F0] text-[#1A2530]/75 border-[#1A2530]/15 hover:text-[#1A2530]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-typewriter font-black flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-[#D4AF37] text-[#1A2530]'
                          : completed
                          ? 'bg-[#15803D] text-white'
                          : 'bg-[#1A2530]/10 text-[#1A2530]'
                      }`}
                    >
                      {completed ? '✓' : s.num}
                    </span>
                    <div className="text-right min-w-0">
                      <span className="font-display text-xs sm:text-sm leading-tight block truncate">
                        {s.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold hidden sm:block truncate ${
                          active ? 'text-[#D4AF37]' : 'opacity-70'
                        }`}
                      >
                        {s.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Wizard Step Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {/* STEP 1: الهوية وصندوق رفع الصورة السينمائي */}
              {castingStep === 1 && (
                <div className="space-y-4">
                  {/* Sleek Gender Switcher */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchGender('male')}
                      className={`min-h-[46px] py-2.5 px-3 rounded-2xl font-display text-sm sm:text-base border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                        starGender === 'male'
                          ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-md'
                          : 'bg-white text-[#1A2530] border-[#1A2530]/15 hover:border-[#1A2530]/40'
                      }`}
                    >
                      <Star className="w-4 h-4 shrink-0" />
                      <span>نجم شباك (ممثل)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchGender('female')}
                      className={`min-h-[46px] py-2.5 px-3 rounded-2xl font-display text-sm sm:text-base border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                        starGender === 'female'
                          ? 'bg-[#D91624] text-white border-[#D4AF37] shadow-md'
                          : 'bg-white text-[#1A2530] border-[#1A2530]/15 hover:border-[#1A2530]/40'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>نجمة شباك (ممثلة)</span>
                    </button>
                  </div>

                  {/* Balanced 2-Column Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                    {/* Right Column: Elevated Studio Viewfinder Upload Box */}
                    <div className="sm:col-span-5 flex flex-col">
                      <div className="relative flex-1 flex flex-col rounded-3xl bg-[#1A2530] p-3 border-2 border-[#D4AF37] shadow-[0_14px_30px_rgba(26,37,48,0.22)]">
                        {/* Viewfinder Top Telemetry Strip */}
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-[10px] font-extrabold text-[#D4AF37] flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            <span>عدسة الكاستينج</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#D91624] text-white font-typewriter text-[10px] font-black">
                            {overallRating} OVR
                          </span>
                        </div>

                        {/* Interactive Upload Zone */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingPhoto(true);
                          }}
                          onDragLeave={() => setIsDraggingPhoto(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingPhoto(false);
                            handleFileDropOrSelect(e.dataTransfer.files?.[0]);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative flex-1 min-h-[215px] sm:min-h-[235px] rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all group ${
                            photoUrl
                              ? 'border-2 border-[#D4AF37] bg-[#0F171E]'
                              : isDraggingPhoto
                              ? 'border-2 border-dashed border-[#FFF3B0] bg-[#253646]'
                              : 'border-2 border-dashed border-[#D4AF37]/65 bg-gradient-to-b from-[#233240] via-[#1A2530] to-[#121B24] hover:border-[#FFF3B0] hover:from-[#2A3B4C]'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileDropOrSelect(e.target.files?.[0])
                            }
                          />

                          {/* Gold Viewfinder Corner Brackets */}
                          <span className="pointer-events-none absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/80 rounded-tr-xs" />
                          <span className="pointer-events-none absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/80 rounded-tl-xs" />
                          <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/80 rounded-br-xs" />
                          <span className="pointer-events-none absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/80 rounded-bl-xs" />

                          {photoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={starName}
                                className="w-full h-full object-cover contrast-105 group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F171E]/95 via-[#0F171E]/75 to-transparent p-2.5 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#FFF3B0]">
                                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>تغيير الصورة</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoUrl('');
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#D91624]/90 hover:bg-[#D91624] text-white text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center px-4 py-5 flex flex-col items-center">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.35)] mb-3 group-hover:scale-105 transition-transform">
                                <ImagePlus className="w-8 h-8" />
                              </div>
                              <p className="font-display text-base text-[#F9F6F0] leading-snug">
                                اضغط لرفع صورة{' '}
                                {starGender === 'female' ? 'النجمة' : 'النجم'}
                              </p>
                              <p className="text-[11px] font-bold text-[#D4AF37]/90 mt-1">
                                اختر صورة من الاستوديو أو اسحبها هنا
                              </p>
                              <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white text-[11px] font-black border border-[#D4AF37]/70 shadow-sm group-hover:brightness-110 transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>رفع صورة من جهازك</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Signature Footer Strip */}
                        <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/30 flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold text-[#F9F6F0]/80 truncate">
                            {archetypeTitle}
                          </span>
                          <span className="font-ruqaa text-lg text-[#D4AF37] -rotate-2 shrink-0">
                            {starName.trim() || 'توقيع النجم'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left Column: Clean Dossier Fields */}
                    <div className="sm:col-span-7 flex flex-col justify-between gap-3">
                      <div className="bg-white p-4 rounded-3xl border-2 border-[#1A2530]/15 space-y-4 shadow-xs flex-1">
                        {/* Name & Age */}
                        <div className="grid grid-cols-12 gap-2.5">
                          <div className="col-span-8">
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                              الاسم الفني لـ
                              {starGender === 'female' ? 'لنجمة' : 'لنجم'}
                            </label>
                            <input
                              type="text"
                              value={starName}
                              onChange={(e) => setStarName(e.target.value)}
                              placeholder="اكتب الاسم الفني..."
                              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/20 focus:border-[#D91624] outline-none font-extrabold text-sm text-[#1A2530]"
                            />
                          </div>

                          <div className="col-span-4">
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                              العمر (سنة)
                            </label>
                            <input
                              type="number"
                              min={18}
                              max={70}
                              value={starAge}
                              onChange={(e) =>
                                setStarAge(
                                  Math.max(
                                    18,
                                    Math.min(70, Number(e.target.value))
                                  )
                                )
                              }
                              className="w-full min-h-[44px] px-2 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/20 focus:border-[#D91624] outline-none text-sm font-typewriter font-black text-center text-[#1A2530]"
                            />
                          </div>
                        </div>

                        {/* Interactive Specialty Genre Chips */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-2">
                            التخصص الدرامي الأقوى في شباك التذاكر
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {QUICK_GENRE_CHIPS.map((g) => {
                              const active = primaryGenre === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => handleSwitchGenre(g.id)}
                                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition cursor-pointer text-right flex items-center justify-between ${
                                    active
                                      ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-sm'
                                      : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/15 hover:border-[#D4AF37]'
                                  }`}
                                >
                                  <span>{g.label}</span>
                                  {active && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick Market Summary Note */}
                        <div className="rounded-2xl bg-[#FFF9E6] border border-[#D4AF37]/80 p-3 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-bold text-[#1A2530]/70">
                              القيمة التسويقية المتوقعة عند الاعتماد
                            </div>
                            <div className="text-xs font-black text-[#1A2530]">
                              فئة S-TIER حصري للاستوديو
                            </div>
                          </div>
                          <div
                            dir="ltr"
                            className="font-typewriter text-sm font-black text-[#15803D] bg-white px-3 py-1.5 rounded-xl border border-[#15803D]/25 shrink-0"
                          >
                            {formatMoney(estimatedBaseSalary)} ج.م
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: الرادار السداسي وتوزيع الطاقات */}
              {castingStep === 2 && (
                <div className="space-y-3.5">
                  {/* Compact Radar + Director's Sticky Note Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3.5 rounded-3xl border-2 border-[#1A2530]/15 shadow-xs">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center">
                      <HexagonalRadarChartSvg
                        stats={radarStats}
                        size={176}
                        isDiamond={overallRating >= 86}
                      />
                      <span className="mt-1 px-3 py-0.5 rounded-lg bg-[#1A2530] text-[#D4AF37] font-typewriter text-xs font-black">
                        التقييم الإجمالي: {overallRating} / 99
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="p-3.5 rounded-xl sticky-note-torn text-[#1A2530]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs text-[#D91624]">
                            تقييم المخرج لـ «
                            {
                              statMetaList.find((s) => s.key === hoveredStatKey)
                                ?.label
                            }
                            »
                          </span>
                          <span className="font-typewriter text-xs font-black bg-[#1A2530] text-[#D4AF37] px-2 py-0.5 rounded">
                            {radarStats[hoveredStatKey]}/99
                          </span>
                        </div>
                        <p className="font-ruqaa text-base sm:text-lg leading-snug text-[#1A2530]">
                          «
                          {
                            statMetaList.find((s) => s.key === hoveredStatKey)
                              ?.stickyNote
                          }
                          »
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F9F6F0] border border-[#1A2530]/15 px-3 py-2 text-[11px] font-bold text-[#1A2530]/85 flex flex-wrap items-center justify-between gap-1">
                        <span>من 60 إلى 80: 1.5M ج.م</span>
                        <span className="text-[#D91624] font-extrabold">
                          نخبة (80–99): 3.5M ج.م
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={trainingAdLoading}
                        onClick={handleAdTrainingCampBoost}
                        className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-black text-xs border border-[#1A2530]/25 shadow-xs hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Zap className="w-4 h-4 text-[#D91624]" />
                        <span>
                          {trainingAdLoading
                            ? 'جاري تجهيز معسكر التدريب...'
                            : 'معسكر تدريب مكثف (+4 نقاط عشوائية مجاناً — إعلان)'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 6 Stat Controls with Progress Bars & Clapperboard Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {statMetaList.map((item) => {
                      const val = radarStats[item.key];
                      const isEliteNext = val >= 80;
                      const isFocused = hoveredStatKey === item.key;
                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredStatKey(item.key)}
                          onClick={() => setHoveredStatKey(item.key)}
                          className={`p-3 rounded-2xl bg-white border-2 transition cursor-pointer ${
                            isFocused
                              ? 'border-[#D91624] shadow-sm'
                              : 'border-[#1A2530]/15 hover:border-[#D4AF37]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div>
                              <span className="font-extrabold text-xs sm:text-sm text-[#1A2530] block">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-bold text-[#1A2530]/65">
                                {val >= 99
                                  ? 'أسطورة خالدة (99 MAX)'
                                  : isEliteNext
                                  ? 'تدريب نخبة (3.5M ج.م)'
                                  : 'تطوير أساسي (1.5M ج.م)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <ClapperChipButton
                                direction="minus"
                                disabled={val <= 60}
                                onClick={() => handleDecrementStat(item.key)}
                              />
                              <div className="w-10 text-center py-1 rounded-lg bg-[#1A2530] text-[#F9F6F0] font-typewriter font-black text-xs border border-[#D4AF37]">
                                {val}
                              </div>
                              <ClapperChipButton
                                direction="plus"
                                isGoldGem={isEliteNext}
                                disabled={val >= 99}
                                onClick={() => handleIncrementStat(item.key)}
                              />
                            </div>
                          </div>

                          {/* Stat Visual Gauge Bar */}
                          <div className="h-1.5 w-full rounded-full bg-[#EFE9DC] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                val >= 85
                                  ? 'bg-gradient-to-l from-[#D91624] via-[#D4AF37] to-[#1A2530]'
                                  : 'bg-gradient-to-l from-[#D4AF37] to-[#1A2530]'
                              }`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: معاينة الكارت الألماظ والاعتماد النهائي */}
              {castingStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-6 flex justify-center">
                    <div className="w-full max-w-[290px]">
                      <Fut3DTiltCard tier="DIAMOND" className="p-4 text-[#F9F6F0]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-[#D4AF37]">
                            {archetypeTitle} · {starAge} سنة
                          </span>
                          <span className="font-typewriter text-xl font-black text-[#D4AF37]">
                            {overallRating} OVR
                          </span>
                        </div>

                        <div className="relative w-full h-44 rounded-xl overflow-hidden border-2 border-[#D4AF37] mb-2.5 bg-[#1A2530]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewPortraitUrl}
                            alt={starName}
                            className="w-full h-full object-cover contrast-105"
                          />
                          <div className="absolute bottom-2 left-2.5 bg-[#1A2530]/90 px-3 py-0.5 rounded-lg border border-[#D4AF37]">
                            <span className="font-ruqaa text-lg text-[#D4AF37]">
                              {starName.trim() || 'توقيع النجم'}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-display text-xl text-white text-center mb-2">
                          {starName}
                        </h3>

                        <div className="flex justify-center bg-[#F9F6F0] rounded-xl p-1.5">
                          <HexagonalRadarChartSvg
                            stats={radarStats}
                            size={135}
                            isDiamond
                          />
                        </div>
                      </Fut3DTiltCard>
                    </div>
                  </div>

                  {/* Official Contract Dossier Summary */}
                  <div className="sm:col-span-6 space-y-3">
                    <div className="rounded-2xl bg-white border-2 border-[#1A2530] p-4 shadow-[4px_6px_0px_#1A2530] space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#1A2530]/15 pb-2">
                        <span className="font-display text-base text-[#1A2530]">
                          وثيقة اعتماد الكارت الألماظ
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#15803D] text-white text-[10px] font-black">
                          فئة S-TIER حصري
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-bold text-[#1A2530]/85">
                        <div className="flex items-center justify-between">
                          <span>الاسم الفني المعتمد:</span>
                          <span className="font-black text-[#1A2530]">
                            {starName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>التصنيف والتخصص:</span>
                          <span className="font-black text-[#D91624]">
                            {archetypeTitle}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>القيمة التسويقية المتوقعة:</span>
                          <span
                            dir="ltr"
                            className="font-typewriter font-black text-[#15803D]"
                          >
                            {formatMoney(estimatedBaseSalary)} ج.م
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>الولاء للاستوديو:</span>
                          <span className="font-black text-[#1A2530]">
                            أولوية تعاقد فورية لأفلامك
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFF9E6] border border-[#D4AF37] text-[11px] font-bold text-[#1A2530] leading-relaxed">
                        ★ بمجرد الختم والاعتماد سينضم{' '}
                        <strong>{starName}</strong> فوراً إلى سبورة الفلين وقائمة
                        نجوم الصف الأول في استوديوك بكامل طاقاته السداسية!
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Wizard Navigation Footer */}
            <div className="bg-[#1A2530] px-4 py-3 border-t-2 border-[#D4AF37] flex items-center justify-between gap-3 shrink-0">
              {castingStep > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCastingStep((prev) => (prev === 3 ? 2 : 1))
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F9F6F0]/15 hover:bg-[#F9F6F0]/25 text-[#F9F6F0] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
              ) : (
                <div className="text-xs font-bold text-[#D4AF37]">
                  الخطوة 1 من 3: الهوية والصورة
                </div>
              )}

              {castingStep < 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCastingStep((prev) => (prev === 1 ? 2 : 3))
                  }
                  className="min-h-[44px] px-5 sm:px-6 py-2 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-sm sm:text-base border border-[#D4AF37] shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {castingStep === 1
                      ? 'التالي: الرادار والطاقات'
                      : 'التالي: الكارت الألماظ'}
                  </span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCertifyDiamondStar}
                  disabled={isStampingReveal}
                  className="min-h-[44px] px-5 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-[#D91624] to-[#B00E1A] hover:brightness-110 text-white font-display text-sm sm:text-base border-2 border-[#D4AF37] shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    {isStampingReveal
                      ? 'جاري ختم الكارت الألماظ...'
                      : `اعتماد ${
                          starGender === 'female' ? 'النجمة' : 'النجم'
                        } وإصدار الكارت`}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE C: THE GRAND REVEAL */}
        {revealedStar && (
          <motion.div
            initial={{ scale: 0.78, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full max-w-md my-auto"
          >
            <Fut3DTiltCard tier="DIAMOND" className="p-5 text-[#F9F6F0]">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-2.5 mb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-[#D4AF37] text-[#1A2530] font-typewriter text-[10px] font-black">
                    موهبة حصرية · كارت ألماظ
                  </span>
                  <h2 className="font-display text-2xl text-white mt-1">
                    {revealedStar.name}
                  </h2>
                </div>
                <div className="text-center px-3 py-1.5 rounded-2xl bg-[#1A2530] border-2 border-[#D4AF37]">
                  <span className="font-typewriter text-2xl font-black text-[#D4AF37] block leading-none">
                    {revealedStar.stats.overall}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#F9F6F0]">
                    DIAMOND
                  </span>
                </div>
              </div>

              <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-[#D4AF37] mb-3 bg-[#1A2530]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={revealedStar.image_url}
                  alt={revealedStar.name}
                  className="w-full h-full object-cover contrast-105"
                />
                <div className="absolute bottom-2.5 left-3 bg-[#1A2530]/85 backdrop-blur-sm px-3.5 py-1 rounded-xl border border-[#D4AF37]">
                  <span className="font-ruqaa text-2xl text-[#D4AF37] -rotate-3 block">
                    {revealedStar.autographSignature || revealedStar.name}
                  </span>
                </div>
              </div>

              {revealedStar.radarStats && (
                <div className="flex justify-center bg-[#F9F6F0] rounded-2xl p-2 border-2 border-[#D4AF37] mb-3">
                  <HexagonalRadarChartSvg
                    stats={revealedStar.radarStats}
                    size={165}
                    isDiamond
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ضم للكاستينج والعودة للاستوديو</span>
              </button>
            </Fut3DTiltCard>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
