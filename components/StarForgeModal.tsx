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
  Coins,
  Wallet,
  Crown,
  Upload,
  Award,
  ArrowRight,
  ArrowLeft,
  Star,
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

const MALE_PORTRAIT_PRESETS: { label: string; genre: GenreId; url: string }[] = [
  {
    label: 'بطل الأكشن والمطاردات',
    genre: 'action',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'نجم الدراما الشعبية',
    genre: 'popular_drama',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'نجم الكوميديا الساخرة',
    genre: 'comedy',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'بطل الغموض والرومانسية',
    genre: 'romance',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80',
  },
];

const FEMALE_PORTRAIT_PRESETS: { label: string; genre: GenreId; url: string }[] = [
  {
    label: 'نجمة الدراما الأولى',
    genre: 'popular_drama',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'أيقونة الرومانسية والسينما',
    genre: 'romance',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'بطلة الأكشن والإثارة',
    genre: 'action',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'نجمة الكوميديا والاستعراض',
    genre: 'comedy',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
  },
];

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
  psychological_horror: { male: 'بطل الرعب النفسي', female: 'أيقونة الرعب والغموض' },
  supernatural_horror: { male: 'نجم ما وراء الطبيعة', female: 'بطلة الرعب الخارق' },
  crime_mystery: { male: 'محقق الجريمة والغموض', female: 'نجمة الإثارة البوليسية' },
  sci_fi: { male: 'بطل الخيال العلمي', female: 'نجمة المستقبل والخيال' },
  romance: { male: 'فتى الشاشة الرومانسي', female: 'نجمة الرومانسية الحالمة' },
  historical: { male: 'فارس الملاحم التاريخية', female: 'ملكة الدراما التاريخية' },
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

export default function StarForgeModal() {
  const isStarForgeOpen = useGameStore((s) => s.isStarForgeOpen);
  const setStarForgeOpen = useGameStore((s) => s.setStarForgeOpen);
  const starForgeLocksOpened = useGameStore((s) => s.starForgeLocksOpened || 0);
  const unlockNextStarForgeLockWithAd = useGameStore(
    (s) => s.unlockNextStarForgeLockWithAd
  );
  const cash = useGameStore((s) => s.cash);
  const vipCoins = useGameStore((s) => s.vipCoins);
  const buyVipGemPackage = useGameStore((s) => s.buyVipGemPackage);
  const spendForStarForgeUpgrade = useGameStore((s) => s.spendForStarForgeUpgrade);
  const createCustomVipStar = useGameStore((s) => s.createCustomVipStar);
  const showToast = useGameStore((s) => s.showToast);

  // Mobile-friendly 3-Step Casting Wizard (1: Identity & Polaroid, 2: Radar & Stats, 3: Preview & Certify)
  const [castingStep, setCastingStep] = useState<1 | 2 | 3>(1);
  const [watchingAdIndex, setWatchingAdIndex] = useState<number | null>(null);
  const [droppedLockIndex, setDroppedLockIndex] = useState<number | null>(null);

  const [starGender, setStarGender] = useState<'male' | 'female'>('male');
  const [starName, setStarName] = useState('فارس الدهبي');
  const [starAge, setStarAge] = useState<number>(28);
  const [primaryGenre, setPrimaryGenre] = useState<GenreId>('action');
  const [photoUrl, setPhotoUrl] = useState<string>(MALE_PORTRAIT_PRESETS[0].url);
  const [cameraFlashActive, setCameraFlashActive] = useState(false);
  const [hoveredStatKey, setHoveredStatKey] = useState<keyof SixRadarStats>('charisma');
  const [showPackagesDrawer, setShowPackagesDrawer] = useState(false);

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
  const activePresets =
    starGender === 'female' ? FEMALE_PORTRAIT_PRESETS : MALE_PORTRAIT_PRESETS;
  const statMetaList = getStatMetaForGender(starGender);

  const handleSwitchGender = (nextGender: 'male' | 'female') => {
    setStarGender(nextGender);
    if (nextGender === 'female' && starName === 'فارس الدهبي') {
      setStarName('ليلى الشامي');
    } else if (nextGender === 'male' && starName === 'ليلى الشامي') {
      setStarName('فارس الدهبي');
    }
    const matchingPresets =
      nextGender === 'female' ? FEMALE_PORTRAIT_PRESETS : MALE_PORTRAIT_PRESETS;
    const genreMatch =
      matchingPresets.find((p) => p.genre === primaryGenre) || matchingPresets[0];
    setPhotoUrl(genreMatch.url);
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
      charisma: nextGenre === 'romance' ? Math.max(prev.charisma, 80) : prev.charisma,
    }));
  };

  const triggerPhotoFlash = (newUrl: string) => {
    playCameraShutterFlash();
    setCameraFlashActive(true);
    setPhotoUrl(newUrl);
    setTimeout(() => {
      setCameraFlashActive(false);
    }, 420);
  };

  const handleFileDropOrSelect = (file?: File | null) => {
    if (!file) return;
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

    const isGoldTier = currentVal >= 80;
    const cashCost = isGoldTier ? 0 : 1_500_000;
    const gemCost = isGoldTier ? 25 : 0;

    const ok = spendForStarForgeUpgrade(cashCost, gemCost);
    if (!ok) {
      if (isGoldTier) {
        setShowPackagesDrawer(true);
      }
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

  const handleCertifyDiamondStar = () => {
    if (!starName.trim()) {
      showToast('اكتب اسم النجم أولاً ليتم توقيع الكارت الألماظ!', 'warning');
      setCastingStep(1);
      return;
    }
    const finalPhoto = photoUrl || activePresets[0].url;

    setIsStampingReveal(true);
    playHeavyIronStamp();

    const newActor: ActorItem = {
      id: `custom_vip_${Date.now()}`,
      name: starName.trim(),
      gender: starGender,
      age: starAge,
      tier: 'S',
      image_url: finalPhoto,
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
        {/* Camera Flash Overlay when photo is dropped */}
        <AnimatePresence>
          {cameraFlashActive && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-[200] bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* STAGE A: THE VIP ENTRANCE (الملف السري الأحمر و5 أقفال ذهبية) */}
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
                  ملف سري للغاية · VIP
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-[#1A2530]/85 hover:bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center border border-[#D4AF37]/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#1A2530]/85 border border-[#D4AF37] text-[#D4AF37] text-xs font-extrabold mb-2 shadow">
                <Crown className="w-3.5 h-3.5" />
                <span>خزينة كاستينج الأساطير الخاصة بمكتب الإمبراطور</span>
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

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleWatchAdToUnlock}
                disabled={watchingAdIndex !== null}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-extrabold text-sm sm:text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>
                  {watchingAdIndex !== null
                    ? 'جاري تشغيل بكرة العرض وفك القفل الذهبي...'
                    : `مشاهدة إعلان لفك القفل (${starForgeLocksOpened}/5)`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => buyVipGemPackage(10)}
                className="w-full py-3 px-4 rounded-2xl bg-[#1A2530] hover:bg-[#1A2530]/90 text-[#D4AF37] border-2 border-[#D4AF37] font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>فتح الأقفال الـ 5 فوراً (باقة 10 ج.م VIP)</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STAGE B: LUXURY DRESSING ROOM WIZARD (خطوات مقسمة ومتجاوبة بسلاسة فائقة) */}
        {allLocksOpened && !revealedStar && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl rounded-[32px] bg-[#F9F6F0] text-[#1A2530] border-4 border-[#D4AF37] shadow-[0_32px_90px_rgba(0,0,0,0.75)] overflow-hidden my-auto max-h-[92dvh] flex flex-col touch-pan-y"
          >
            {/* Hollywood Vanity Mirror Header with Illuminated Golden Bulbs */}
            <div className="bg-gradient-to-l from-[#1A2530] via-[#22313F] to-[#1A2530] px-4 sm:px-5 py-3.5 border-b-4 border-[#D4AF37] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  {[0, 1, 2, 3].map((b) => (
                    <span
                      key={b}
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFF4CC] border border-[#D4AF37] vanity-bulb inline-block"
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-base sm:text-xl text-[#F9F6F0] truncate">
                      كابينة صناعة النجوم الملكية
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D91624] text-white text-[10px] font-black border border-[#D4AF37]">
                      {starGender === 'female' ? 'نجمة شباك' : 'نجم شباك'} · {overallRating} OVR
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="px-2.5 py-1 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/40 text-[#F9F6F0] flex items-center gap-1 text-[11px]">
                  <Wallet className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span dir="ltr" className="font-typewriter font-black">
                    {formatMoney(cash)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPackagesDrawer((v) => !v)}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#1A2530] font-extrabold text-[11px] flex items-center gap-1 shadow cursor-pointer"
                  title="شحن عملات VIP"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span className="font-typewriter font-black">{vipCoins}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-xl bg-[#D91624] hover:brightness-110 text-white flex items-center justify-center border border-[#D4AF37] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-Step Visual Stepper Ribbon */}
            <div className="grid grid-cols-3 bg-[#EFE9DC] border-b-2 border-[#D4AF37]/60 p-1.5 gap-1.5 shrink-0">
              {[
                { id: 1, title: '1. الهوية والبورتريه', sub: 'الاسم والصورة' },
                { id: 2, title: '2. الرادار والطاقات', sub: 'توزيع الـ 6 مهارات' },
                { id: 3, title: '3. الكارت الألماظ', sub: 'المعاينة والاعتماد' },
              ].map((s) => {
                const active = castingStep === s.id;
                const completed = castingStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCastingStep(s.id as 1 | 2 | 3)}
                    className={`py-2 px-2 rounded-2xl transition cursor-pointer flex flex-col items-center justify-center border ${
                      active
                        ? 'bg-[#1A2530] text-[#F9F6F0] border-[#D4AF37] shadow-md'
                        : completed
                        ? 'bg-[#15803D]/15 text-[#15803D] border-[#15803D]/40'
                        : 'bg-[#F9F6F0] text-[#1A2530]/75 border-[#1A2530]/15 hover:text-[#1A2530]'
                    }`}
                  >
                    <span className="font-display text-xs sm:text-sm leading-tight">
                      {s.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold hidden sm:block ${
                        active ? 'text-[#D4AF37]' : ' opacity-75'
                      }`}
                    >
                      {s.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Inline VIP Packages Top-up Bar */}
            <AnimatePresence>
              {showPackagesDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[#1A2530] text-[#F9F6F0] px-4 py-3 border-b-2 border-[#D4AF37] overflow-hidden shrink-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      شحن باقات عملات VIP للوصول لطاقة 99 الأسطورية:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPackagesDrawer(false)}
                      className="text-[11px] font-bold text-white/70 hover:text-white"
                    >
                      إغلاق ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => buyVipGemPackage(10)}
                      className="p-2 rounded-xl bg-[#F9F6F0] text-[#1A2530] font-extrabold text-[11px] cursor-pointer hover:scale-[1.02] transition"
                    >
                      باقة 10 ج.م (+150 VIP)
                    </button>
                    <button
                      type="button"
                      onClick={() => buyVipGemPackage(30)}
                      className="p-2 rounded-xl bg-[#D4AF37] text-[#1A2530] font-extrabold text-[11px] cursor-pointer hover:scale-[1.02] transition"
                    >
                      باقة 30 ج.م (+500 VIP)
                    </button>
                    <button
                      type="button"
                      onClick={() => buyVipGemPackage(50)}
                      className="p-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#D4AF37] text-[#1A2530] font-black text-[11px] cursor-pointer hover:scale-[1.02] transition"
                    >
                      باقة 50 ج.م (+1200 VIP)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wizard Step Body */}
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1">
              {/* STEP 1: هوية الممثل/الممثلة وبرواز البولارويد */}
              {castingStep === 1 && (
                <div className="space-y-4">
                  {/* Gender Selector First so everything adapts to Actor vs Actress */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchGender('male')}
                      className={`py-2.5 px-3 rounded-2xl font-display text-sm sm:text-base border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                        starGender === 'male'
                          ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-md'
                          : 'bg-white text-[#1A2530] border-[#1A2530]/20 hover:border-[#1A2530]/45'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      <span>صناعة نجم شباك (ممثل)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchGender('female')}
                      className={`py-2.5 px-3 rounded-2xl font-display text-sm sm:text-base border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                        starGender === 'female'
                          ? 'bg-[#D91624] text-white border-[#D4AF37] shadow-md'
                          : 'bg-white text-[#1A2530] border-[#1A2530]/20 hover:border-[#1A2530]/45'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>صناعة نجمة شباك (ممثلة)</span>
                    </button>
                  </div>

                  {/* Balanced 2-Column Layout on Desktop, Crisp Stack on Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* Right Column: Vintage Polaroid Frame */}
                    <div className="sm:col-span-5">
                      <div className="bg-white p-3 pb-4 rounded-2xl border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold text-[#1A2530]/75">
                            بورتريه الكاستينج الرسمي
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#D91624] text-white font-typewriter text-[11px] font-black">
                            {overallRating} OVR
                          </span>
                        </div>

                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleFileDropOrSelect(e.dataTransfer.files?.[0]);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className="relative w-full h-48 sm:h-52 rounded-xl bg-[#F3EFE6] border-2 border-dashed border-[#1A2530]/40 hover:border-[#D91624] transition overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
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

                          {photoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={starName}
                                className="w-full h-full object-cover sepia-[0.08] contrast-105 group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A2530]/95 via-[#1A2530]/70 to-transparent p-2.5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#F9F6F0] flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  اضغط لرفع صورة من جهازك
                                </span>
                                <Camera className="w-4 h-4 text-[#D4AF37]" />
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="w-8 h-8 text-[#D91624] mx-auto mb-2" />
                              <p className="font-ruqaa text-xl text-[#1A2530]">
                                ارفع صورة{' '}
                                {starGender === 'female' ? 'النجمة' : 'النجم'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Polaroid Handwritten Caption Strip */}
                        <div className="mt-2.5 pt-2 border-t border-[#1A2530]/15 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#1A2530]">
                            {archetypeTitle}
                          </span>
                          <span className="font-ruqaa text-xl text-[#D91624] -rotate-2">
                            {starName.trim() || 'توقيع النجم'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left Column: Name, Age, Genre Chips & Portrait Presets */}
                    <div className="sm:col-span-7 space-y-3">
                      <div className="bg-white p-3.5 rounded-2xl border-2 border-[#1A2530]/15 space-y-3 shadow-xs">
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1">
                              اسم{' '}
                              {starGender === 'female'
                                ? 'النجمة السينمائية'
                                : 'النجم السينمائي'}
                              :
                            </label>
                            <input
                              type="text"
                              value={starName}
                              onChange={(e) => setStarName(e.target.value)}
                              placeholder="اكتب الاسم الفني..."
                              className="w-full px-3 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/25 focus:border-[#D91624] outline-none font-extrabold text-sm text-[#1A2530]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1">
                              العمر (سنة):
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
                              className="w-full px-2 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/25 text-sm font-typewriter font-black text-center text-[#1A2530]"
                            />
                          </div>
                        </div>

                        {/* Interactive Specialty Genre Chips */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                            اللون الدرامي والتخصص الأساسي:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_GENRE_CHIPS.map((g) => {
                              const active = primaryGenre === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => handleSwitchGenre(g.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                                    active
                                      ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-xs'
                                      : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/20 hover:border-[#1A2530]/45'
                                  }`}
                                >
                                  {g.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Gender-Matched Studio Portrait Presets */}
                        <div>
                          <p className="text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                            أو اختر بورتريه كاستينج جاهز مناسب لـ{' '}
                            {starGender === 'female' ? 'الممثلة' : 'الممثل'}:
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {activePresets.map((preset) => (
                              <button
                                key={preset.url}
                                type="button"
                                onClick={() => {
                                  triggerPhotoFlash(preset.url);
                                  handleSwitchGenre(preset.genre);
                                }}
                                className={`flex items-center gap-2 p-1.5 rounded-xl text-right border transition cursor-pointer ${
                                  photoUrl === preset.url
                                    ? 'bg-[#FFF9E6] text-[#1A2530] border-2 border-[#D91624] shadow-xs'
                                    : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/15 hover:border-[#D4AF37]'
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={preset.url}
                                  alt={preset.label}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#1A2530]/20"
                                />
                                <span className="text-[10px] font-extrabold leading-tight line-clamp-2">
                                  {preset.label}
                                </span>
                              </button>
                            ))}
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
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3.5 rounded-2xl border-2 border-[#1A2530]/15 shadow-xs">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center">
                      <HexagonalRadarChartSvg
                        stats={radarStats}
                        size={180}
                        isDiamond={overallRating >= 86}
                      />
                      <span className="mt-1 px-3 py-0.5 rounded-full bg-[#1A2530] text-[#D4AF37] font-typewriter text-xs font-black">
                        التقييم الإجمالي: {overallRating} / 99
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="p-3.5 rounded-xl sticky-note-torn text-[#1A2530]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs text-[#D91624]">
                            ملاحظة المخرج عن «
                            {
                              statMetaList.find((s) => s.key === hoveredStatKey)
                                ?.label
                            }
                            »:
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

                      <div className="rounded-xl bg-[#F9F6F0] border border-[#1A2530]/15 px-3 py-2 text-[11px] font-bold text-[#1A2530]/80 flex items-center justify-between">
                        <span>من 60 إلى 80: بالسيولة النقدية (1.5M ج.م)</span>
                        <span className="text-[#D91624] font-extrabold">
                          فوق 80 إلى 99: بعملات VIP (25 عملة)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6 Stat Controls with Progress Bars & Clapperboard Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {statMetaList.map((item) => {
                      const val = radarStats[item.key];
                      const isGoldNext = val >= 80;
                      const isFocused = hoveredStatKey === item.key;
                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredStatKey(item.key)}
                          onClick={() => setHoveredStatKey(item.key)}
                          className={`p-2.5 rounded-2xl bg-white border-2 transition cursor-pointer ${
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
                                  : isGoldNext
                                  ? 'ترقية ذهبية (25 عملة VIP)'
                                  : 'ترقية نقدية (1.5M ج.م)'}
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
                                isGoldGem={isGoldNext}
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
                                  ? 'bg-gradient-to-l from-[#38BDF8] via-[#D4AF37] to-[#D91624]'
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
                            src={photoUrl || activePresets[0].url}
                            alt={starName}
                            className="w-full h-full object-cover sepia-[0.08] contrast-105"
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
                          فئة S-TIER VIP
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
                            أولوية تعاقد فورية لأفلامك ومسلسلاتك
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

            {/* Bottom Wizard Navigation Footer (السابق / التالي / اعتماد النجم) */}
            <div className="bg-[#1A2530] px-4 py-3 border-t-2 border-[#D4AF37] flex items-center justify-between gap-3 shrink-0">
              {castingStep > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCastingStep((prev) => (prev === 3 ? 2 : 1))
                  }
                  className="px-4 py-2.5 rounded-xl bg-[#F9F6F0]/15 hover:bg-[#F9F6F0]/25 text-[#F9F6F0] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
              ) : (
                <div className="text-xs font-bold text-[#D4AF37]">
                  الخطوة 1 من 3: الهوية والبورتريه
                </div>
              )}

              {castingStep < 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCastingStep((prev) => (prev === 1 ? 2 : 3))
                  }
                  className="px-6 py-2.5 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-sm sm:text-base border border-[#D4AF37] shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {castingStep === 1
                      ? 'التالي: الرادار والطاقات'
                      : 'التالي: معاينة الكارت الألماظ'}
                  </span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCertifyDiamondStar}
                  disabled={isStampingReveal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D91624] to-[#B00E1A] hover:brightness-110 text-white font-display text-sm sm:text-base border-2 border-[#D4AF37] shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    {isStampingReveal
                      ? 'جاري ختم الكارت الألماظ...'
                      : `اعتماد ${
                          starGender === 'female' ? 'النجمة' : 'النجم'
                        } وإصدار الكارت الألماظ`}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE C: THE GRAND REVEAL (الميلاد السينمائي وكارت الألماظ FUT 3D) */}
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
                  className="w-full h-full object-cover sepia-[0.12] contrast-110"
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
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
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
