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

const STAT_META: {
  key: keyof SixRadarStats;
  label: string;
  stickyNote: string;
}[] = [
  {
    key: 'charisma',
    label: 'الكاريزما',
    stickyNote: 'دي اللي بتخلي الجمهور يغفرله لو الفيلم قصته تعبانة!',
  },
  {
    key: 'acting',
    label: 'الأداء الدرامي',
    stickyNote: 'دمعة واحدة منه في المشهد الأخير بتجيب ترشيح أوسكار ولجنة النقاد بتركع!',
  },
  {
    key: 'action',
    label: 'الأكشن',
    stickyNote: 'بينط من فوق الكوبري من غير دوبلير وبيكسر قاعات العيد!',
  },
  {
    key: 'comedy',
    label: 'الكوميديا',
    stickyNote: 'إفيه واحد منه بيقلب تيك توك تريند لمدة شهر كامل!',
  },
  {
    key: 'popularity',
    label: 'الجماهيرية',
    stickyNote: 'اسمه لوحده على الأفيش بيبيع العمل للمنصات والقنوات قبل ما يتصور!',
  },
  {
    key: 'boxOffice',
    label: 'شباك التذاكر',
    stickyNote: 'مغناطيس فلوس.. الطوابير بتقفل الشارع قدام السينما من أول ليلة عرض!',
  },
];

const STUDIO_PORTRAIT_PRESETS = [
  {
    label: 'نجم شباك كلاسيكي',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'نجمة الشاشة الذهبية',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'بطل الأكشن والغموض',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'أيقونة الدراما',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
  },
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

  const [watchingAdIndex, setWatchingAdIndex] = useState<number | null>(null);
  const [droppedLockIndex, setDroppedLockIndex] = useState<number | null>(null);

  // Casting Room state
  const [starName, setStarName] = useState('فارس الدهبي');
  const [starGender, setStarGender] = useState<'male' | 'female'>('male');
  const [starAge, setStarAge] = useState<number>(28);
  const [primaryGenre, setPrimaryGenre] = useState<GenreId>('action');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [cameraFlashActive, setCameraFlashActive] = useState(false);
  const [hoveredStatKey, setHoveredStatKey] = useState<keyof SixRadarStats | null>(
    'charisma'
  );
  const [showPackagesDrawer, setShowPackagesDrawer] = useState(false);

  // Base stats start at 70 so first +10 points (up to 80) are cheap cash, >80 up to 99 are Gold VIP
  const [radarStats, setRadarStats] = useState<SixRadarStats>({
    charisma: 72,
    acting: 70,
    action: 74,
    comedy: 68,
    popularity: 72,
    boxOffice: 75,
  });

  // Step 3: Diamond Reveal state
  const [revealedStar, setRevealedStar] = useState<ActorItem | null>(null);
  const [isStampingReveal, setIsStampingReveal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isStarForgeOpen) return null;

  const allLocksOpened = starForgeLocksOpened >= 5;

  const triggerPhotoFlash = (newUrl: string) => {
    playCameraShutterFlash();
    setCameraFlashActive(true);
    setPhotoUrl(newUrl);
    setTimeout(() => {
      setCameraFlashActive(false);
    }, 480);
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
      setTimeout(() => setDroppedLockIndex(null), 900);
    }, 850);
  };

  const handleIncrementStat = (key: keyof SixRadarStats) => {
    const currentVal = radarStats[key];
    if (currentVal >= 99) return;

    const isGoldTier = currentVal >= 80; // Above 80 requires VIP Gold Coins / Packages
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
      [key]: Math.min(99, prev[key] + (isGoldTier ? 2 : 2)),
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

  const handleCertifyDiamondStar = () => {
    if (!starName.trim()) {
      showToast('اكتب اسم النجم أولاً ليتم توقيع الكارت الألماظ!', 'warning');
      return;
    }
    const finalPhoto =
      photoUrl || STUDIO_PORTRAIT_PRESETS[starGender === 'female' ? 1 : 0].url;

    setIsStampingReveal(true);
    playHeavyIronStamp();

    const newActor: ActorItem = {
      id: `custom_vip_${Date.now()}`,
      name: starName.trim(),
      gender: starGender,
      age: starAge,
      tier: 'S',
      image_url: finalPhoto,
      base_salary: Math.max(8_000_000, overallRating * 180_000),
      archetype: 'موهبة حصرية · Custom Star',
      isCustomStar: true,
      autographSignature: starName.trim(),
      radarStats: { ...radarStats },
      stats: {
        overall: overallRating,
        acting: radarStats.acting,
        charisma: radarStats.charisma,
        box_office_pull: radarStats.boxOffice,
        ego: 25,
      },
      genre_mastery: {
        [primaryGenre]: Math.min(99, overallRating + 4),
        action: radarStats.action,
        popular_drama: radarStats.acting,
        comedy: radarStats.comedy,
      },
    };

    setTimeout(() => {
      createCustomVipStar(newActor);
      setRevealedStar(newActor);
      setIsStampingReveal(false);
    }, 650);
  };

  const handleClose = () => {
    setRevealedStar(null);
    setStarForgeOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-[#1A2530]/85 backdrop-blur-md overflow-y-auto"
        dir="rtl"
      >
        {/* Camera Flash Overlay when photo is dropped */}
        <AnimatePresence>
          {cameraFlashActive && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="fixed inset-0 z-[200] bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* STEP 1: THE VIP ENTRANCE (الملف السري الأحمر و5 أقفال ذهبية) */}
        {!allLocksOpened && !revealedStar && (
          <motion.div
            initial={{ scale: 0.9, rotateX: 12, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-br from-[#D91624] via-[#A90F1B] to-[#6E0710] border-4 border-[#D4AF37] shadow-[0_30px_90px_rgba(0,0,0,0.75)] p-6 sm:p-10 text-[#F9F6F0] overflow-hidden"
          >
            {/* Top Secret Stamp */}
            <div className="absolute -top-3 left-6 rotate-[-10deg] border-4 border-[#D4AF37] bg-[#1A2530]/90 px-4 py-1.5 rounded-lg shadow-xl">
              <span className="font-typewriter text-xs sm:text-sm font-black tracking-widest text-[#D4AF37]">
                TOP SECRET // VIP CASTING
              </span>
            </div>

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#1A2530]/60 hover:bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center border border-[#D4AF37]/40 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mt-6 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#1A2530]/70 border border-[#D4AF37] text-[#D4AF37] text-xs font-extrabold mb-3">
                <Crown className="w-4 h-4" />
                <span>ملف سري خاص بمكتب الإمبراطور</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F9F6F0] drop-shadow-md mb-3">
                غرفة صناعة النجوم (The Star Forge)
              </h2>
              <p className="text-base sm:text-lg font-bold text-[#F9F6F0]/95 max-w-lg mx-auto leading-relaxed">
                «اكتشف نجمك الخاص.. افتح الأقفال لتبدأ رحلة صناعة أسطورة»
              </p>
            </div>

            {/* 5 Golden Locks & 5 Cinema Film Reels */}
            <div className="grid grid-cols-5 gap-2.5 sm:gap-4 my-8">
              {[0, 1, 2, 3, 4].map((idx) => {
                const isUnlocked = idx < starForgeLocksOpened;
                const isDropping = droppedLockIndex === idx;
                const isWatching = watchingAdIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                      isUnlocked
                        ? 'bg-[#D4AF37]/25 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.5)]'
                        : 'bg-[#1A2530]/75 border-[#D4AF37]/35 opacity-80'
                    }`}
                  >
                    {/* Film Reel */}
                    <motion.div
                      animate={
                        isUnlocked || isWatching
                          ? { rotate: 360, scale: [1, 1.12, 1] }
                          : { rotate: 0 }
                      }
                      transition={{
                        duration: isWatching ? 1 : 6,
                        repeat: isUnlocked ? Infinity : 0,
                        ease: 'linear',
                      }}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-2 border-2 ${
                        isUnlocked
                          ? 'bg-[#D4AF37] text-[#1A2530] border-white shadow-lg'
                          : 'bg-[#1A2530] text-[#F9F6F0]/40 border-[#F9F6F0]/20'
                      }`}
                    >
                      <Film className="w-6 h-6 sm:w-7 sm:h-7" />
                    </motion.div>

                    {/* Golden Lock that drops with 3D animation */}
                    <motion.div
                      animate={
                        isDropping
                          ? { y: [0, -14, 90], rotateZ: [0, -25, 45], opacity: [1, 1, 0] }
                          : { y: 0, opacity: 1 }
                      }
                      transition={{ duration: 0.65 }}
                      className="flex items-center gap-1 text-xs font-extrabold"
                    >
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[#D4AF37]">
                          <Unlock className="w-4 h-4" />
                          مفتوح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#F9F6F0]/75">
                          <Lock className="w-4 h-4 text-[#D4AF37]" />
                          قفل #{idx + 1}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: Watch Ad or Instant VIP Package Unlock */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              <button
                onClick={handleWatchAdToUnlock}
                disabled={watchingAdIndex !== null}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-extrabold text-base sm:text-lg shadow-[0_10px_30px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-3 cursor-pointer"
              >
                <Film className="w-5 h-5" />
                <span>
                  {watchingAdIndex !== null
                    ? 'جاري تشغيل بكرة الإعلان وفك القفل...'
                    : `مشاهدة إعلان لفك القفل (${starForgeLocksOpened}/5)`}
                </span>
              </button>

              <button
                onClick={() => buyVipGemPackage(10)}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-[#1A2530] hover:bg-[#1A2530]/90 text-[#D4AF37] border-2 border-[#D4AF37] font-extrabold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>فتح الأقفال الـ 5 فوراً (باقة 10 ج.م VIP)</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: THE CASTING ROOM (غرفة الكاستينج - كابينة التصوير الفخمة #F9F6F0) */}
        {allLocksOpened && !revealedStar && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-6xl rounded-3xl bg-[#F9F6F0] text-[#1A2530] border-4 border-[#D4AF37] shadow-[0_30px_100px_rgba(0,0,0,0.75)] overflow-hidden"
          >
            {/* Dressing Room Vanity Mirror Top Bulb Strip */}
            <div className="bg-[#1A2530] px-4 sm:px-8 py-3.5 border-b-4 border-[#D4AF37] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4].map((b) => (
                    <span
                      key={b}
                      className="w-3.5 h-3.5 rounded-full bg-[#FFF4CC] border border-[#D4AF37] vanity-bulb inline-block"
                    />
                  ))}
                </div>
                <div>
                  <h2 className="font-display text-xl sm:text-2xl text-[#F9F6F0] tracking-wide">
                    غرفة صناعة النجوم · كابينة كاستينج الـ VIP
                  </h2>
                  <p className="text-xs text-[#D4AF37] font-bold">
                    صمم نجمك الخاص بالرادار السداسي وتوقيع الرقعة الأصلي واصنع الكارت الألماظ
                  </p>
                </div>
              </div>

              {/* Studio Wallet & VIP Gems Header */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/40 text-[#F9F6F0] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs text-[#F9F6F0]/75">الخزينة:</span>
                  <span className="font-typewriter font-black text-sm text-[#F9F6F0]">
                    {formatMoney(cash)} ج.م
                  </span>
                </div>

                <button
                  onClick={() => setShowPackagesDrawer((v) => !v)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#1A2530] font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span className="font-typewriter font-black">{vipCoins}</span>
                  <span>عملة VIP (شحن باقات)</span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl bg-[#D91624] text-white flex items-center justify-center hover:opacity-90 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Optional Inline VIP Packages Top-up Bar (باقات الـ 10 و 30 و 50 جنيه) */}
            <AnimatePresence>
              {showPackagesDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[#1A2530]/95 text-[#F9F6F0] px-6 py-4 border-b-2 border-[#D4AF37] overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-display text-lg text-[#D4AF37]">
                        باقات شحن كاستينج الـ VIP (للوصول لطاقة 99 الأسطورية)
                      </h4>
                      <p className="text-xs text-[#F9F6F0]/80">
                        الطاقات فوق 80 وحتى 99 تتطلب عملات VIP ذهبية تمنح نجمك تفوقاً كاسحاً في شباك التذاكر
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => buyVipGemPackage(10)}
                        className="px-4 py-2 rounded-xl bg-[#F9F6F0] text-[#1A2530] hover:bg-[#D4AF37] font-extrabold text-xs transition cursor-pointer"
                      >
                        باقة 10 جنيه (+150 عملة VIP + 12M ج.م)
                      </button>
                      <button
                        onClick={() => buyVipGemPackage(30)}
                        className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#1A2530] hover:brightness-110 font-extrabold text-xs transition cursor-pointer"
                      >
                        باقة 30 جنيه (+500 عملة VIP + 40M ج.م)
                      </button>
                      <button
                        onClick={() => buyVipGemPackage(50)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#38BDF8] via-[#E0F2FE] to-[#D4AF37] text-[#1A2530] font-black text-xs shadow-lg transition cursor-pointer"
                      >
                        باقة الإمبراطور 50 جنيه (+1200 عملة VIP + 90M ج.م)
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Dressing Room Grid */}
            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* RIGHT COLUMN (أ. هوية النجم: برواز البولارويد + فلاش الكاميرا + توقيع خط الرقعة) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-sm bg-white p-4 pb-6 rounded-2xl shadow-[0_18px_45px_rgba(26,37,48,0.18)] border-2 border-[#1A2530]/15 relative rotate-[-1deg]">
                  {/* Vanity Mirror Bulbs on Polaroid Sides */}
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[11px] font-typewriter font-bold text-[#1A2530]/60">
                      HOLLYWOOD POLAROID // #01
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#D91624] text-white font-typewriter text-xs font-black">
                      OVR {overallRating}
                    </span>
                  </div>

                  {/* Polaroid Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      handleFileDropOrSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full h-64 rounded-xl bg-[#F3EFE6] border-2 border-dashed border-[#1A2530]/35 hover:border-[#D91624] transition overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileDropOrSelect(e.target.files?.[0])}
                    />

                    {photoUrl ? (
                      <>
                        {/* Warm cinematic filter applied to uploaded headshot */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={starName}
                          className="w-full h-full object-cover sepia-[0.14] contrast-110 saturate-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2530]/70 via-transparent to-transparent flex items-end justify-between p-3">
                          <span className="text-xs font-bold text-[#F9F6F0] bg-[#1A2530]/75 px-2.5 py-1 rounded">
                            تغيير الصورة (فلاش كاميرا)
                          </span>
                          <Camera className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-[#D91624]/10 border-2 border-[#D91624] text-[#D91624] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                          <Camera className="w-8 h-8" />
                        </div>
                        <p className="font-ruqaa text-2xl text-[#1A2530] mb-1">
                          اسحب صورة النجم هنا
                        </p>
                        <p className="text-xs text-[#1A2530]/70 font-bold flex items-center justify-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          أو اضغط لالتقاط بورتريه سينمائي بفلاش الاستوديو
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Studio Portrait Presets */}
                  <div className="mt-3">
                    <p className="text-[11px] font-bold text-[#1A2530]/70 mb-1.5">
                      أو اختر بورتريه سينمائي جاهز من أرشيف الكاستينج:
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STUDIO_PORTRAIT_PRESETS.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => triggerPhotoFlash(preset.url)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                            photoUrl === preset.url
                              ? 'bg-[#D91624] text-white border-[#D91624]'
                              : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/20 hover:border-[#D4AF37]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Star Name & Live Handwritten Ruqaa Autograph Signature */}
                  <div className="mt-4 pt-3 border-t border-[#1A2530]/15">
                    <label className="block text-xs font-extrabold text-[#1A2530]/80 mb-1">
                      اسم النجم السينمائي:
                    </label>
                    <input
                      type="text"
                      value={starName}
                      onChange={(e) => setStarName(e.target.value)}
                      placeholder="اكتب اسم النجم..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/25 focus:border-[#D91624] outline-none font-extrabold text-base text-[#1A2530]"
                    />

                    {/* Handwritten Ruqaa Signature Box */}
                    <div className="mt-3 px-4 py-2.5 rounded-xl bg-[#FDFBF7] border border-dashed border-[#D4AF37] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1A2530]/60">
                        توقيع النجم المعتمد:
                      </span>
                      <span className="font-ruqaa text-2xl sm:text-3xl text-[#D91624] -rotate-3 select-none drop-shadow-sm">
                        {starName.trim() || 'توقيع النجم'}
                      </span>
                    </div>

                    {/* Gender, Age & Genre */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <select
                        value={starGender}
                        onChange={(e) =>
                          setStarGender(e.target.value as 'male' | 'female')
                        }
                        className="px-2 py-1.5 rounded-lg bg-[#F9F6F0] border border-[#1A2530]/25 text-xs font-bold text-[#1A2530]"
                      >
                        <option value="male">ممثل</option>
                        <option value="female">ممثلة</option>
                      </select>

                      <input
                        type="number"
                        min={18}
                        max={70}
                        value={starAge}
                        onChange={(e) =>
                          setStarAge(Math.max(18, Math.min(70, Number(e.target.value))))
                        }
                        className="px-2 py-1.5 rounded-lg bg-[#F9F6F0] border border-[#1A2530]/25 text-xs font-typewriter font-bold text-[#1A2530] text-center"
                      />

                      <select
                        value={primaryGenre}
                        onChange={(e) => setPrimaryGenre(e.target.value as GenreId)}
                        className="px-2 py-1.5 rounded-lg bg-[#F9F6F0] border border-[#1A2530]/25 text-xs font-bold text-[#1A2530]"
                      >
                        <option value="action">أكشن</option>
                        <option value="popular_drama">دراما</option>
                        <option value="comedy">كوميديا</option>
                        <option value="romance">رومانسي</option>
                        <option value="crime_mystery">غموض</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEFT COLUMN (ب. شراء الطاقات: الرادار السداسي + فيشة الكلاكيت + الورقة الصفراء المقطوعة) */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white/80 p-5 rounded-2xl border-2 border-[#1A2530]/15 shadow-sm">
                  {/* Hexagonal Radar Chart */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <HexagonalRadarChartSvg
                      stats={radarStats}
                      size={220}
                      isDiamond={overallRating >= 88}
                    />

                    {/* Torn Sticky Note Tooltip (ورقة صغيرة مقطوعة) */}
                    {hoveredStatKey && (
                      <motion.div
                        key={hoveredStatKey}
                        initial={{ opacity: 0, y: 6, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
                        className="mt-3 w-full p-3 sticky-note-torn text-[#1A2530]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs text-[#D91624]">
                            ملاحظة المخرج عن «
                            {STAT_META.find((s) => s.key === hoveredStatKey)?.label}»:
                          </span>
                          <span className="font-typewriter text-xs font-black">
                            {radarStats[hoveredStatKey]}/99
                          </span>
                        </div>
                        <p className="font-ruqaa text-base leading-snug text-[#1A2530]">
                          «{STAT_META.find((s) => s.key === hoveredStatKey)?.stickyNote}»
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* 6 Stat Controls with Clapperboard Chips */}
                  <div className="md:col-span-7 space-y-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg text-[#1A2530]">
                        توزيع طاقات النجم (الرادار السداسي)
                      </h3>
                      <span className="text-[11px] font-bold text-[#D91624]">
                        مرر الماوس على الطاقة لقراءة الورقة السرية
                      </span>
                    </div>

                    {STAT_META.map((item) => {
                      const val = radarStats[item.key];
                      const isGoldNext = val >= 80;
                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredStatKey(item.key)}
                          onClick={() => setHoveredStatKey(item.key)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9F6F0] border border-[#1A2530]/15 hover:border-[#D4AF37] transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-extrabold text-sm text-[#1A2530]">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-bold text-[#1A2530]/65">
                              {val >= 95
                                ? 'أسطورة خالدة (99 MAX)'
                                : isGoldNext
                                ? 'ترقية ذهبية (25 عملة VIP)'
                                : 'ترقية نقدية (1.5M ج.م)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <ClapperChipButton
                              direction="minus"
                              disabled={val <= 60}
                              onClick={() => handleDecrementStat(item.key)}
                            />
                            <div className="w-12 text-center py-1 rounded-lg bg-[#1A2530] text-[#F9F6F0] font-typewriter font-black text-base border border-[#D4AF37]">
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
                      );
                    })}
                  </div>
                </div>

                {/* Final Certification Button (اعتماد النجم وإصدار الكارت الألماظ) */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1A2530] p-4 rounded-2xl border-2 border-[#D4AF37]">
                  <div className="text-[#F9F6F0]">
                    <div className="font-extrabold text-sm text-[#D4AF37]">
                      جاهز لطبع الكارت الألماظ (Diamond Holographic Card)
                    </div>
                    <p className="text-xs text-[#F9F6F0]/80">
                      سيتم ختم الكارت بتوقيع «{starName || 'النجم'}» وإضافته فوراً لقائمة الممثلين المتاحين للتعاقد
                    </p>
                  </div>

                  <button
                    onClick={handleCertifyDiamondStar}
                    disabled={isStampingReveal}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D91624] to-[#B00E1A] hover:brightness-110 text-white font-display text-lg tracking-wide shadow-[0_10px_25px_rgba(217,22,36,0.45)] border-2 border-[#D4AF37] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Award className="w-5 h-5 text-[#D4AF37]" />
                    <span>
                      {isStampingReveal ? 'جاري ختم الكارت الألماظ...' : 'اعتماد النجم'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: THE DIAMOND REVEAL (لحظة التتويج وإصدار الكارت الألماظ + قصاصات الورق الذهبية) */}
        {revealedStar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg flex flex-col items-center text-center p-6"
          >
            {/* Golden Confetti Shower */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[155]">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    y: -40,
                    x: `${(i * 13) % 100}vw`,
                    rotate: 0,
                    opacity: 1,
                  }}
                  animate={{
                    y: '105vh',
                    rotate: 360 + i * 45,
                    opacity: [1, 1, 0.7],
                  }}
                  transition={{
                    duration: 2.8 + (i % 4) * 0.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className={`fixed w-3 h-4 rounded-sm ${
                    i % 3 === 0
                      ? 'bg-[#D4AF37]'
                      : i % 3 === 1
                      ? 'bg-[#38BDF8]'
                      : 'bg-[#D91624]'
                  }`}
                />
              ))}
            </div>

            <motion.div
              initial={{ rotateY: -180, scale: 0.7 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="w-full max-w-sm z-[160]"
            >
              <Fut3DTiltCard tier="DIAMOND" className="p-5 text-[#F9F6F0]">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-md bg-[#38BDF8]/20 border border-[#38BDF8] text-[#38BDF8] font-typewriter text-xs font-black">
                    CUSTOM STAR // موهبة حصرية
                  </span>
                  <span className="font-typewriter text-2xl font-black text-[#D4AF37]">
                    {revealedStar.stats.overall} OVR
                  </span>
                </div>

                <div className="relative w-full h-56 rounded-xl overflow-hidden border-2 border-[#D4AF37] mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={revealedStar.image_url}
                    alt={revealedStar.name}
                    className="w-full h-full object-cover sepia-[0.12] contrast-110"
                  />
                  <div className="absolute bottom-2 left-3 bg-[#1A2530]/85 px-3 py-1 rounded-lg border border-[#D4AF37]">
                    <span className="font-ruqaa text-xl text-[#D4AF37]">
                      {revealedStar.autographSignature}
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-2xl text-white mb-2">
                  {revealedStar.name}
                </h3>

                {revealedStar.radarStats && (
                  <div className="flex justify-center my-2 bg-[#F9F6F0] rounded-xl p-2">
                    <HexagonalRadarChartSvg
                      stats={revealedStar.radarStats}
                      size={165}
                      isDiamond
                    />
                  </div>
                )}
              </Fut3DTiltCard>
            </motion.div>

            <div className="mt-6 z-[160] flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-8 py-3.5 rounded-2xl bg-[#D91624] text-white font-display text-lg border-2 border-[#D4AF37] shadow-2xl hover:scale-105 transition cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                <span>ضم النجم الألماظ إلى كتيبة الاستوديو</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
