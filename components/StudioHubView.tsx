'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  formatGameDate,
  getDaysRemainingUntilAnnualAwards,
  STUDIO_FIXED_ASSETS,
  getStudioAssetBenefits,
} from '@/lib/store';
import { GENRES } from '@/lib/db-resolver';
import {
  MarketRegion,
  MARKET_CONFIGS,
  formatMoney,
} from '@/lib/game-engine';
import { StudioLogoSvg } from './StudioLogoSvg';
import { LeaderboardAndSettingsView } from './LeaderboardAndSettingsView';
import {
  DirectorChairIcon,
  FilmReelSettingsIcon,
} from './CustomCinemaIcons';
import {
  Globe,
  Trophy,
  History,
  Film,
  Wallet,
  TrendingUp,
  Award,
  CheckCircle2,
  X,
  Sparkles,
  Flame,
  Crown,
  Building2,
  ShieldCheck,
  Loader2,
  Lock,
  Unlock,
  Smartphone,
  FileText,
  Pin,
  Coins,
  Clock,
} from 'lucide-react';

export function StudioHubView({
  onOpenSettings,
  secondsLeft = 18,
}: {
  onOpenSettings?: () => void;
  secondsLeft?: number;
} = {}) {
  const {
    studioName,
    ceoName,
    logo,
    founderPerk,
    unlockedRegions,
    cash,
    marketValue,
    reputation,
    currentYear,
    gameDay,
    vipCoins,
    draft,
    releasedProjects,
    worldHistory,
    unlockMarketRegionWithCash,
    toggleDraftDistributionMarket,
    resetDraftForNewProject,
    setActiveScreen,
    setChildModalOpen,
    setPrWarRoomOpen,
    setStarForgeOpen,
    starForgeLocksOpened,
    buyVipGemPackage,
    ownedStudioAssets,
    purchaseStudioAsset,
    showToast,
  } = useGameStore();

  const [activeSheet, setActiveSheet] = useState<
    null | 'markets' | 'archive' | 'history' | 'leaderboard' | 'assets'
  >(null);
  const [modalPage, setModalPage] = useState(0);
  const [purchasingAssetId, setPurchasingAssetId] = useState<string | null>(null);

  const assetBenefits = getStudioAssetBenefits(ownedStudioAssets);

  useEffect(() => {
    setChildModalOpen(Boolean(activeSheet));
    return () => setChildModalOpen(false);
  }, [activeSheet, setChildModalOpen]);

  const totalAwards = releasedProjects.reduce(
    (sum, p) => sum + p.awardsWon.length,
    0
  );
  const lifetimeBoxOffice = releasedProjects.reduce(
    (sum, p) => sum + p.totalGrossRevenue,
    0
  );
  const currentYearProjectsCount = releasedProjects.filter(
    (p) => p.year === currentYear
  ).length;
  const daysUntilAnnualAwards = getDaysRemainingUntilAnnualAwards(gameDay);

  const studioRankTitle =
    marketValue >= 1_000_000_000
      ? 'إمبراطور السينما الملياردير'
      : marketValue >= 550_000_000
      ? 'عملاق الإنتاج الدولي'
      : marketValue >= 260_000_000
      ? 'قطب الإنتاج الإقليمي'
      : 'منتج سينمائي صاعد';

  const hasActiveProject = Boolean(draft.title.trim());
  const offerList = Object.values(draft.talentOffers || {});
  const pendingOffersCount = offerList.filter(
    (n) => n.status === 'pending'
  ).length;
  const awaitingChoiceCount = offerList.filter(
    (n) => n.status === 'accepted_awaiting_choice'
  ).length;
  const hasUnresolvedCrisis = (draft.crises || []).some((c) => !c.resolved);

  const activeDistMarkets: MarketRegion[] =
    Array.isArray(draft.selectedDistributionMarkets) &&
    draft.selectedDistributionMarkets.length > 0
      ? draft.selectedDistributionMarkets
      : ['egypt'];

  const handleResumeActiveProject = () => {
    if (
      draft.filmingStartDay !== null &&
      draft.filmingDaysElapsed >= draft.filmingDurationDays
    ) {
      setActiveScreen('RELEASE_SIMULATION');
    } else if (draft.filmingStartDay !== null) {
      setActiveScreen('PRODUCTION_CRISES');
    } else if (
      offerList.length > 0 ||
      draft.directorId ||
      draft.leadActorIds.length > 0
    ) {
      setActiveScreen('CREW_CAST_CARDS');
    } else {
      setActiveScreen('PROJECT_SETUP');
    }
  };

  const openModalSheet = (
    sheet: 'markets' | 'archive' | 'history' | 'leaderboard' | 'assets'
  ) => {
    setModalPage(0);
    setActiveSheet(sheet);
  };

  const archivePageSize = 3;
  const archiveTotalPages = Math.max(
    1,
    Math.ceil(releasedProjects.length / archivePageSize)
  );
  const visibleArchiveProjects = releasedProjects.slice(
    modalPage * archivePageSize,
    (modalPage + 1) * archivePageSize
  );

  const historyPageSize = 4;
  const historyTotalPages = Math.max(
    1,
    Math.ceil(worldHistory.length / historyPageSize)
  );
  const visibleHistoryItems = worldHistory.slice(
    modalPage * historyPageSize,
    (modalPage + 1) * historyPageSize
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div
        className={
          activeSheet
            ? 'pointer-events-none select-none space-y-6 opacity-35 transition-opacity'
            : 'space-y-6'
        }
      >
        {/* TOP STUDIO WALL PLAQUE (لوحة استوديو هوليوود الصباحية النحاسية) */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-[#1A2530] text-[#F9F6F0] border-4 border-[#D4AF37] p-4 sm:p-6 shadow-[0_20px_50px_rgba(26,37,48,0.25)]"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Right: Studio Crest + Name + Director Chair Icon */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded-2xl bg-[#F9F6F0] p-2.5 border-2 border-[#D4AF37] shadow-lg">
                <StudioLogoSvg config={logo} size={62} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#D91624] text-white text-xs font-extrabold border border-[#D4AF37]/60">
                    <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{studioRankTitle}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F9F6F0]/10 text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/30">
                    <span>{formatGameDate(gameDay, currentYear)}</span>
                    <span
                      dir="ltr"
                      className="font-typewriter text-[11px] text-white bg-[#D91624] px-1.5 py-0.2 rounded flex items-center gap-0.5"
                    >
                      <Clock className="w-3 h-3" />
                      {secondsLeft}s
                    </span>
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl text-[#F9F6F0] tracking-wide">
                  مكتب الإمبراطور — {studioName}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-bold text-[#F9F6F0]/80">
                  <span className="inline-flex items-center gap-1.5 text-[#D4AF37]">
                    <DirectorChairIcon className="w-4 h-4 text-[#D4AF37]" />
                    <span>الإمبراطور: {ceoName}</span>
                  </span>
                  <span>
                    ·{' '}
                    {founderPerk === 'visionary_director'
                      ? '★ مخرج عبقري (+10% جودة)'
                      : founderPerk === 'marketing_whale'
                      ? '★ حوت تسويق (+15% إيرادات)'
                      : '★ مفاوض شرس (-15% أجور)'}
                  </span>
                  <span>· السمعة الفنية: {reputation}%</span>
                </div>
              </div>
            </div>

            {/* Left: Brass Financial Plaques + Film Reel Settings */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div
                onClick={() => openModalSheet('assets')}
                className="px-4 py-2 rounded-2xl bg-[#F9F6F0] text-[#1A2530] border-2 border-[#D4AF37] cursor-pointer hover:scale-[1.02] transition"
              >
                <div className="text-[10px] font-extrabold text-[#1A2530]/70 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#D91624]" />
                  <span>خزينة السيولة النقدية</span>
                </div>
                <div
                  data-testid="hub-cash-value"
                  className="font-typewriter text-base sm:text-lg font-black text-[#1A2530]"
                >
                  <span dir="ltr">{formatMoney(cash)}</span>{' '}
                  <span className="text-xs">ج.م</span>
                </div>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-[#F9F6F0]/10 text-[#F9F6F0] border-2 border-[#D4AF37]/60">
                <div className="text-[10px] font-extrabold text-[#D4AF37] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>القيمة السوقية</span>
                </div>
                <div
                  data-testid="hub-market-value"
                  className="font-typewriter text-base sm:text-lg font-black text-[#F9F6F0]"
                >
                  <span dir="ltr">{formatMoney(marketValue)}</span>{' '}
                  <span className="text-xs text-[#D4AF37]">ج.م</span>
                </div>
              </div>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="إعدادات الاستوديو (بكرة السينما)"
                  className="w-12 h-12 rounded-2xl bg-[#D4AF37] hover:brightness-110 text-[#1A2530] flex items-center justify-center border-2 border-[#F9F6F0] shadow-lg transition cursor-pointer"
                >
                  <FilmReelSettingsIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* THE STUDIO WALL (الحائط الخلفي للمكتب: سبورة الفلين Corkboard + الخزنة الحديدية في الحائط) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. سبورة الفلين (Corkboard) بصور الممثلين والدبابيس -> تفتح "طاقم العمل والمواهب" */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => setActiveScreen('CREW_CAST_CARDS')}
            className="lg:col-span-7 relative rounded-3xl bg-[#C89D66] border-8 border-[#6B4423] p-5 sm:p-6 shadow-[inset_0_4px_25px_rgba(0,0,0,0.35),0_16px_35px_rgba(26,37,48,0.18)] cursor-pointer overflow-hidden group"
          >
            {/* Corkboard Texture Overlay */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#1A2530] text-[#F9F6F0] border border-[#D4AF37] text-xs font-extrabold shadow">
                <Pin className="w-3.5 h-3.5 text-[#D91624]" />
                <span>سبورة الفلين المعلقة على الحائط (Corkboard)</span>
              </div>
              <span className="px-3 py-1 rounded-md bg-[#D91624] text-white font-display text-xs tracking-wide shadow">
                اضغط لفتح كروت الممثلين والمواهب ←
              </span>
            </div>

            {/* Pinned Polaroids on the Corkboard */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 my-2">
              {[
                {
                  title: 'نجوم الصف الأول',
                  sub: 'كروت ذهبية وألماظ FUT',
                  rot: '-rotate-2',
                  badge: 'S-TIER & VIP',
                },
                {
                  title: 'المخرجين والكتاب',
                  sub: 'تعاقد حتى مخرجين للعمل',
                  rot: 'rotate-2',
                  badge: 'CREW',
                },
                {
                  title: 'الرادار السداسي',
                  sub: 'توقيعات خط الرقعة',
                  rot: '-rotate-1',
                  badge: 'RADAR 99',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`relative bg-[#F9F6F0] p-3 pb-4 rounded-xl shadow-lg border border-[#1A2530]/20 ${card.rot} group-hover:rotate-0 transition-transform`}
                >
                  {/* Red Push-Pin */}
                  <div className="w-4 h-4 rounded-full bg-[#D91624] border-2 border-white shadow mx-auto -mt-5 mb-2" />
                  <div className="text-[10px] font-typewriter font-black text-[#D91624] mb-1">
                    {card.badge}
                  </div>
                  <div className="font-display text-sm sm:text-base text-[#1A2530]">
                    {card.title}
                  </div>
                  <div className="text-[11px] font-bold text-[#1A2530]/70 mt-0.5">
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {(pendingOffersCount > 0 || awaitingChoiceCount > 0) && (
              <div className="mt-3 px-3.5 py-2 rounded-xl bg-[#FFF6B3] border border-[#E2C96B] text-[#1A2530] text-xs font-extrabold flex items-center justify-between">
                <span>
                  {awaitingChoiceCount > 0
                    ? `⚠️ لديك ${awaitingChoiceCount} عروض مقبولة تنتظر اختيارك النهائي على السبورة!`
                    : `⏳ بانتظار رد ${pendingOffersCount} من النجوم على عقودك...`}
                </span>
                <span className="underline">فحص العقود</span>
              </div>
            )}
          </motion.div>

          {/* 2. الخزنة الحديدية في الحائط (Wall Safe) -> تفتح الميزانية والمشتريات وباقات 10/30/50 والأصول */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => openModalSheet('assets')}
            className="lg:col-span-5 relative rounded-3xl bg-gradient-to-br from-[#2C3A47] via-[#1A2530] to-[#111921] border-8 border-[#D4AF37] p-5 sm:p-6 text-[#F9F6F0] shadow-[0_18px_40px_rgba(26,37,48,0.3)] cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D4AF37] text-[#1A2530] text-xs font-black">
                <ShieldCheck className="w-4 h-4" />
                <span>خزنة الإمبراطور في الحائط</span>
              </span>
              <span className="font-typewriter text-xs font-black text-[#D4AF37]">
                SAFE // VAULT
              </span>
            </div>

            <div className="my-4 flex items-center gap-4">
              {/* Spinning Safe Wheel Visual */}
              <div className="w-20 h-20 shrink-0 rounded-full border-4 border-[#D4AF37] bg-[#1A2530] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.35)] group-hover:rotate-90 transition-transform duration-500">
                <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-[#D91624] flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#D4AF37]" />
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl text-[#F9F6F0]">
                  الميزانية والبلاتوهات وباقات الـ VIP
                </h3>
                <p className="text-xs text-[#F9F6F0]/80 font-bold mt-1 leading-relaxed">
                  شراء البلاتوهات الثابتة (خصم -{assetBenefits.totalDiscountPercent}%) وشحن باقات الـ 10 و30 و50 جنيه ({vipCoins} عملة VIP)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D4AF37]/30 text-xs font-extrabold text-[#D4AF37]">
              <span>الأصول المملوكة: {(ownedStudioAssets || []).length}/5 بلاتوهات</span>
              <span className="px-3 py-1 rounded-lg bg-[#D4AF37] text-[#1A2530]">
                فتح الخزنة ←
              </span>
            </div>
          </motion.div>
        </div>

        {/* THE 3D EMPEROR'S WOODEN DESK SURFACE (سطح مكتب الإمبراطور الخشبي التفاعلي) */}
        <div className="relative rounded-[32px] bg-gradient-to-b from-[#5C3A21] via-[#4A2E19] to-[#362010] border-8 border-[#D4AF37] p-5 sm:p-8 shadow-[0_28px_70px_rgba(26,37,48,0.45)]">
          {/* Brass Desk Nameplate */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b-2 border-[#D4AF37]/40">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-base sm:text-lg shadow-md">
              <DirectorChairIcon className="w-5 h-5 text-[#1A2530]" />
              <span>سطح مكتب الإمبراطور التفاعلي — اختر الأداة من فوق المكتب</span>
            </div>
            <span className="text-xs font-bold text-[#F9F6F0]/85">
              اضغط مباشرة على ورق السيناريو أو الملف السري الأحمر أو الموبايل
            </span>
          </div>

          {/* 3 Physical Props on the Emperor's Desk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PROP 1: ورق السيناريو على المكتب (Script Paper Stack -> Project Setup / Active Film) */}
            <motion.div
              whileHover={{ y: -6, rotate: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (hasActiveProject) {
                  handleResumeActiveProject();
                } else {
                  resetDraftForNewProject('PROJECT_SETUP');
                }
              }}
              className="relative rounded-2xl bg-[#F9F6F0] text-[#1A2530] p-5 border-4 border-[#1A2530] shadow-[8px_12px_0px_#1A2530] cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-[#1A2530] text-[#F9F6F0] font-typewriter text-[11px] font-black">
                    SCRIPT // {currentYear}
                  </span>
                  <FileText className="w-6 h-6 text-[#D91624]" />
                </div>

                <h3 className="font-display text-2xl text-[#1A2530] mb-1">
                  {hasActiveProject
                    ? `سيناريو «${draft.title}»`
                    : 'ورق السيناريو (مشروع جديد)'}
                </h3>

                <p className="font-typewriter text-xs font-bold text-[#1A2530]/80 leading-relaxed">
                  {hasActiveProject
                    ? draft.filmingStartDay !== null
                      ? `التصوير جاري في البلاتوه (${draft.filmingDaysElapsed}/${draft.filmingDurationDays})`
                      : 'اضغط لاستكمال التعاقدات والتصوير على ورق السيناريو'
                    : 'اضغط لفتح ورق السيناريو المطبوع بالآلة الكاتبة وبدء فيلم أو مسلسل جديد'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t-2 border-dashed border-[#1A2530]/20 flex items-center justify-between">
                <span className="font-ruqaa text-lg text-[#D91624]">
                  نسخة المخرج المعتمدة
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white font-extrabold text-xs shadow">
                  {hasActiveProject ? 'متابعة العمل ←' : 'إنشاء مشروع ←'}
                </span>
              </div>
            </motion.div>

            {/* PROP 2: الملف السري الأحمر المقفول بـ 5 أقفال ذهبية (Top Secret Folder -> The Star Forge) */}
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStarForgeOpen(true)}
              className="relative rounded-2xl bg-gradient-to-br from-[#D91624] via-[#B3121E] to-[#7D0912] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-[8px_12px_0px_#1A2530] cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Top Secret Stamp */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded bg-[#1A2530] text-[#D4AF37] font-typewriter text-[11px] font-black border border-[#D4AF37]">
                  TOP SECRET // VIP
                </span>
                <span className="text-xs font-extrabold text-[#D4AF37]">
                  {starForgeLocksOpened >= 5
                    ? 'الأقفال الـ 5 مفتوحة ✓'
                    : `${starForgeLocksOpened}/5 أقفال`}
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl text-[#F9F6F0] mb-1">
                  الملف السري (غرفة صناعة النجوم)
                </h3>
                <p className="text-xs font-bold text-[#F9F6F0]/90 leading-relaxed">
                  افتح الأقفال الذهبية الـ 5 وادخل كابينة الكاستينج لتصميم نجمك الخاص بالرادار السداسي والكارت الألماظ!
                </p>

                {/* 5 Golden Locks Row on the Folder */}
                <div className="grid grid-cols-5 gap-1.5 mt-4">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const unlocked = idx < (starForgeLocksOpened || 0);
                    return (
                      <div
                        key={idx}
                        className={`py-1.5 rounded-lg flex flex-col items-center justify-center border ${
                          unlocked
                            ? 'bg-[#D4AF37] text-[#1A2530] border-white'
                            : 'bg-[#1A2530]/80 text-[#D4AF37] border-[#D4AF37]/50'
                        }`}
                      >
                        {unlocked ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D4AF37]/40 flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#D4AF37]">
                  The Star Forge · VIP
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#1A2530] font-extrabold text-xs shadow">
                  فتح الملف السري ←
                </span>
              </div>
            </motion.div>

            {/* PROP 3: الموبايل على المكتب (Smartphone -> Electronic Committees & Trend War Room) */}
            <motion.div
              whileHover={{ y: -6, rotate: 1 }}
              whileTap={{ scale: 0.98 }}
              animate={
                hasUnresolvedCrisis
                  ? { rotate: [-1.5, 1.5, -1.5, 1.5, 0] }
                  : undefined
              }
              transition={{ duration: 0.5, repeat: hasUnresolvedCrisis ? Infinity : 0 }}
              onClick={() => setPrWarRoomOpen(true)}
              className="relative rounded-[28px] bg-[#1A2530] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-[8px_12px_0px_#0F171E] cursor-pointer flex flex-col justify-between"
            >
              {/* Phone Speaker Notch */}
              <div className="w-16 h-1.5 rounded-full bg-[#D4AF37]/40 mx-auto mb-3" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D91624] text-white text-[10px] font-extrabold">
                    <Flame className="w-3 h-3" />
                    <span>موبايل الإمبراطور المباشر</span>
                  </span>
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                </div>

                <h3 className="font-display text-2xl text-[#F9F6F0] mb-1">
                  اللجان الإلكترونية والتريند
                </h3>
                <p className="text-xs font-bold text-[#F9F6F0]/80 leading-relaxed">
                  شاشة موبايل حية لمتابعة تعليقات الجمهور، توجيه اللجان لدعم الفيلم (2M) أو نشر إشاعة عن فيلم المنافس (5M)!
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#F9F6F0]/10 border border-[#D4AF37]/30 text-[11px] font-bold text-[#D4AF37]">
                💬 «الجمهور بيتكلم عن أعمالك على X وتيك توك الآن...»
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-typewriter text-xs text-[#F9F6F0]/70">
                  5G // TREND RADAR
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white font-extrabold text-xs border border-[#D4AF37]">
                  فتح شاشة الموبايل ←
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* EMPEROR'S TROPHY & ARCHIVE SHELF (رف الجوائز والأرشيف والأسواق والترتيب) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveScreen('FESTIVALS_AWARDS')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition text-right cursor-pointer"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#D4AF37] text-[#1A2530] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                قاعة الجوائز ({totalAwards})
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                الحفل بعد {daysUntilAnnualAwards} يوم
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('archive')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition text-right cursor-pointer"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#D91624] text-white flex items-center justify-center">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                أرشيف الأفلام ({releasedProjects.length})
              </div>
              <div className="font-typewriter text-[11px] font-bold text-[#1A2530]/70">
                {formatMoney(lifetimeBoxOffice)} ج.م
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('markets')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition text-right cursor-pointer"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#1A2530] text-[#D4AF37] flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                الأسواق العالمية
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                {unlockedRegions.length} من 4 أسواق مفتوحة
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModalSheet('leaderboard')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#F9F6F0] border-2 border-[#1A2530] shadow-[4px_6px_0px_#1A2530] hover:bg-[#FFF9E6] transition text-right cursor-pointer"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base text-[#1A2530]">
                ترتيب الشركات
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                بورصة القيمة السوقية
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Sheets (Wall Safe / Assets / Markets / Archive / Leaderboard) */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2530]/80 p-3 backdrop-blur-md overscroll-contain sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border-4 border-[#D4AF37] bg-[#F9F6F0] p-5 sm:p-6 text-[#1A2530] shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b-2 border-[#1A2530]/15 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#D91624]" />
                  <h2 className="font-display text-xl text-[#1A2530]">
                    {activeSheet === 'markets' && 'خريطة التوزيع الإقليمية والعالمية'}
                    {activeSheet === 'archive' && 'أرشيف الأفلام والمسلسلات المنتجة'}
                    {activeSheet === 'history' && 'السجل التاريخي للاستوديو'}
                    {activeSheet === 'leaderboard' && 'الترتيب الرسمي لشركات الإنتاج'}
                    {activeSheet === 'assets' &&
                      'خزنة الإمبراطور — البلاتوهات الثابتة وباقات الـ VIP'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A2530] text-[#F9F6F0] hover:bg-[#D91624] transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeSheet === 'assets' && (
                <div className="space-y-4">
                  {/* VIP Packages Top-up Inside the Wall Safe (باقات الـ 10 و30 و50 جنيه) */}
                  <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-4 border-2 border-[#D4AF37]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-display text-lg text-[#D4AF37]">
                          شحن سبائك وعملات الـ VIP (لفتح الأقفال وترقية النجوم لـ 99)
                        </h3>
                        <p className="text-xs text-[#F9F6F0]/80">
                          رصيدك الحالي: <strong className="font-typewriter text-[#D4AF37]">{vipCoins}</strong> عملة VIP ذهبية
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        onClick={() => buyVipGemPackage(10)}
                        className="p-3 rounded-xl bg-[#F9F6F0] text-[#1A2530] hover:bg-[#D4AF37] font-extrabold text-xs transition cursor-pointer text-center"
                      >
                        <div className="font-display text-base text-[#D91624]">باقة 10 جنيه</div>
                        <div>+150 عملة VIP + 12M ج.م</div>
                      </button>
                      <button
                        onClick={() => buyVipGemPackage(30)}
                        className="p-3 rounded-xl bg-[#D4AF37] text-[#1A2530] hover:brightness-110 font-extrabold text-xs transition cursor-pointer text-center"
                      >
                        <div className="font-display text-base">باقة 30 جنيه</div>
                        <div>+500 عملة VIP + 40M ج.م</div>
                      </button>
                      <button
                        onClick={() => buyVipGemPackage(50)}
                        className="p-3 rounded-xl bg-gradient-to-r from-[#38BDF8] via-[#E0F2FE] to-[#D4AF37] text-[#1A2530] font-black text-xs shadow-lg transition cursor-pointer text-center"
                      >
                        <div className="font-display text-base">باقة الإمبراطور 50 جنيه</div>
                        <div>+1200 عملة VIP + 90M ج.م</div>
                      </button>
                    </div>
                  </div>

                  {/* Fixed Studio Assets */}
                  <div className="space-y-3">
                    {STUDIO_FIXED_ASSETS.map((asset) => {
                      const isOwned = (ownedStudioAssets || []).includes(asset.id);
                      const isBusy = purchasingAssetId === asset.id;
                      return (
                        <div
                          key={asset.id}
                          className={`rounded-2xl border-2 p-4 transition ${
                            isOwned
                              ? 'border-[#15803D] bg-white'
                              : 'border-[#1A2530]/20 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block rounded bg-[#1A2530] px-2.5 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                                {asset.categoryLabel}
                              </span>
                              <h3 className="mt-1 font-display text-base text-[#1A2530]">
                                {asset.name}
                              </h3>
                            </div>
                            <span className="shrink-0 rounded-xl bg-[#1A2530] px-3 py-1 font-typewriter text-xs font-black text-[#D4AF37]">
                              {formatMoney(asset.price)} ج.م
                            </span>
                          </div>

                          <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#1A2530]/80">
                            {asset.description}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-[#15803D]">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>{asset.crisisShieldLabel}</span>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#1A2530]/10">
                            {isOwned ? (
                              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#15803D] py-2 text-xs font-black text-white">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>أصل ثابت مملوك وموثق في خزنة الاستوديو ✓</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={async () => {
                                  setPurchasingAssetId(asset.id);
                                  await purchaseStudioAsset(asset.id);
                                  setPurchasingAssetId(null);
                                }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D91624] py-2.5 px-4 text-xs font-black text-white border border-[#D4AF37] shadow transition hover:brightness-110 cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>جاري توثيق الملكية...</span>
                                  </>
                                ) : (
                                  <>
                                    <Building2 className="h-4 w-4" />
                                    <span>
                                      شراء وتوثيق الأصل ({formatMoney(asset.price)} ج.م)
                                    </span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSheet === 'markets' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MARKET_CONFIGS.map((cfg) => {
                    const regId = cfg.id;
                    const unlocked = unlockedRegions.includes(regId);
                    const isSelectedForNextProject = activeDistMarkets.includes(regId);
                    const bonusPct = Math.round(cfg.revenueBonusFactor * 100);

                    return (
                      <div
                        key={regId}
                        className="flex flex-col justify-between rounded-2xl border-2 border-[#1A2530]/20 bg-white p-4 text-right"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#15803D]">
                              {unlocked ? 'سوق مفتوح ✓' : 'سوق إقليمي'}
                            </span>
                            <span className="rounded bg-[#1A2530] px-2 py-0.5 font-typewriter text-[10px] font-black text-[#D4AF37]">
                              {regId === 'egypt' ? '100% أساسي' : `+${bonusPct}% إيرادات`}
                            </span>
                          </div>
                          <div className="font-display mt-1.5 text-base text-[#1A2530]">
                            {cfg.name}
                          </div>
                          <p className="mt-1 text-xs font-bold text-[#1A2530]/75">
                            {cfg.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1A2530]/10">
                          {unlocked ? (
                            <button
                              type="button"
                              disabled={regId === 'egypt'}
                              onClick={() => toggleDraftDistributionMarket(regId)}
                              className="w-full rounded-xl py-2 px-3 text-xs font-black bg-[#1A2530] text-[#F9F6F0] cursor-pointer"
                            >
                              {regId === 'egypt'
                                ? 'مفعل دائماً كسوق أساسي ✓'
                                : isSelectedForNextProject
                                ? 'مفعل لتوزيع عملك القادم ✓'
                                : 'تفعيل التوزيع لعملك القادم'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => unlockMarketRegionWithCash(regId)}
                              className="w-full rounded-xl bg-[#D91624] py-2 px-3 text-xs font-black text-white cursor-pointer"
                            >
                              فتح مكتب مبكر ({formatMoney(cfg.earlyLicenseCost)} ج.م)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeSheet === 'archive' && (
                <div className="space-y-3">
                  {releasedProjects.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-[#1A2530]/70">
                      لم تقم بإصدار أي عمل فني بعد. اضغط على «ورق السيناريو» فوق مكتب الإمبراطور للبدء!
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {visibleArchiveProjects.map((proj) => {
                          const genreName =
                            GENRES.find((g) => g.id === proj.primaryGenre)?.name ||
                            proj.primaryGenre;
                          return (
                            <div
                              key={proj.id}
                              className="rounded-2xl border-2 border-[#1A2530]/20 bg-white p-4"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-[#D91624]">
                                  {proj.format === 'film' ? 'فيلم' : 'مسلسل'} · {genreName}
                                </span>
                                <span className="font-typewriter">عام {proj.year}</span>
                              </div>
                              <div className="font-display mt-1 text-lg text-[#1A2530]">
                                {proj.title}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-xs font-typewriter font-bold">
                                <span className="text-[#15803D]">
                                  الإيرادات: {formatMoney(proj.totalGrossRevenue)} ج.م
                                </span>
                                <span>
                                  النقاد: {proj.criticScore}/10 · الجمهور: {proj.audienceScore}/10
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {archiveTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-3">
                          <button
                            type="button"
                            disabled={modalPage === 0}
                            onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                            className="px-4 py-2 rounded-xl bg-white border border-[#1A2530] text-xs font-bold"
                          >
                            السابق
                          </button>
                          <span className="text-xs font-bold">
                            صفحة {modalPage + 1} من {archiveTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={modalPage >= archiveTotalPages - 1}
                            onClick={() =>
                              setModalPage((p) => Math.min(archiveTotalPages - 1, p + 1))
                            }
                            className="px-4 py-2 rounded-xl bg-[#D91624] text-white text-xs font-bold"
                          >
                            التالي
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSheet === 'history' && (
                <div className="space-y-2.5">
                  {visibleHistoryItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-[#1A2530]/20 bg-white p-3.5 text-xs font-bold"
                    >
                      <History className="w-4 h-4 text-[#D91624] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-typewriter text-[#D91624]">[{item.year}]</span>{' '}
                        <span>{item.eventText}</span>
                      </div>
                    </div>
                  ))}
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={modalPage === 0}
                        onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                        className="px-4 py-1.5 rounded-xl bg-white border border-[#1A2530] text-xs font-bold"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        disabled={modalPage >= historyTotalPages - 1}
                        onClick={() =>
                          setModalPage((p) => Math.min(historyTotalPages - 1, p + 1))
                        }
                        className="px-4 py-1.5 rounded-xl bg-[#D91624] text-white text-xs font-bold"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSheet === 'leaderboard' && <LeaderboardAndSettingsView />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
