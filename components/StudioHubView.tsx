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
  formatMoney,
} from '@/lib/game-engine';
import {
  getMarketProfile,
  getMarketConfigsForWorld,
  getPrimaryMarketRegion,
} from '@/lib/market-profiles';
import { StudioLogoSvg } from './StudioLogoSvg';
import { WorldFlagArt } from './WorldFlagArt';
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
  Star,
  Clapperboard,
  Radar,
  BookOpen,
  Shield,
  Scale,
  Mail,
} from 'lucide-react';
import type { NeelyoInfoTab } from './NeelyoInfoModal';

export function StudioHubView({
  onOpenSettings,
  onOpenInfo,
}: {
  onOpenSettings?: () => void;
  onOpenInfo?: (tab: NeelyoInfoTab) => void;
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
    claimEmergencyInvestorBailoutWithAd,
    lastEmergencyBailoutDay,
    bankruptcyDeadlineDay,
    ownedStudioAssets,
    purchaseStudioAsset,
    showToast,
    worldMarket,
  } = useGameStore();

  const marketProfile = getMarketProfile(worldMarket);
  const marketConfigs = getMarketConfigsForWorld(worldMarket);
  const primaryRegion = getPrimaryMarketRegion(worldMarket);
  const currencyLabel = marketProfile.currencyLabel;

  const [activeSheet, setActiveSheet] = useState<
    null | 'markets' | 'archive' | 'history' | 'leaderboard' | 'assets'
  >(null);
  const [modalPage, setModalPage] = useState(0);
  const [purchasingAssetId, setPurchasingAssetId] = useState<string | null>(null);

  const assetBenefits = getStudioAssetBenefits(ownedStudioAssets);
  const isInLiquidityEmergency =
    cash <= 10_000_000 || bankruptcyDeadlineDay !== null;
  const bailoutCooldownRemaining =
    lastEmergencyBailoutDay !== null
      ? Math.max(0, 30 - (gameDay - lastEmergencyBailoutDay))
      : 0;
  const canUseEmergencyBailout =
    isInLiquidityEmergency && bailoutCooldownRemaining === 0;

  useEffect(() => {
    setChildModalOpen(Boolean(activeSheet));
    return () => setChildModalOpen(false);
  }, [activeSheet, setChildModalOpen]);

  useEffect(() => {
    if (!activeSheet) return;
    const handleTelegramBack = () => {
      setActiveSheet(null);
    };
    window.addEventListener('neelyo:telegram-back', handleTelegramBack);
    return () => {
      window.removeEventListener('neelyo:telegram-back', handleTelegramBack);
    };
  }, [activeSheet]);

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

  const offerList = Object.values(draft.talentOffers || {});
  const isUntouchedLegacyDefault =
    releasedProjects.length === 0 &&
    draft.title.trim() === 'الفرعون الأخير' &&
    draft.filmingStartDay === null &&
    offerList.length === 0 &&
    !draft.directorId &&
    draft.leadActorIds.length === 0;
  const hasActiveProject = Boolean(draft.title.trim()) && !isUntouchedLegacyDefault;
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
      : [primaryRegion];

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
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[#F9F6F0] text-[11px] font-bold border border-[#D4AF37]/40">
                    <WorldFlagArt market={worldMarket} className="w-4 h-3 rounded-[2px] shrink-0" />
                    <span>{marketProfile.countryNameAr}</span>
                  </span>
                  <span className="text-xs font-bold text-[#D4AF37]">
                    · {formatGameDate(gameDay, currentYear)}
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
            <div
              data-tour-id="tour-finance"
              className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end"
            >
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
                  <span className="text-xs">{currencyLabel}</span>
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
                  <span className="text-xs text-[#D4AF37]">{currencyLabel}</span>
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

        {/* EMERGENCY LIQUIDITY & BANKRUPTCY GRACE PERIOD BANNER (السيولة الطارئة ومهلة الإفلاس) */}
        {(cash <= 10_000_000 || bankruptcyDeadlineDay !== null) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border-4 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              cash <= 0
                ? 'bg-[#D91624] text-[#F9F6F0] border-[#D4AF37]'
                : 'bg-[#1A2530] text-[#F9F6F0] border-[#D91624]'
            }`}
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1A2530] text-[#D4AF37] text-xs font-extrabold border border-[#D4AF37]">
                <Flame className="w-3.5 h-3.5 text-[#D91624]" />
                <span>
                  {cash <= 0 && bankruptcyDeadlineDay !== null
                    ? `إنذار إفلاس رسمي · متبقي ${Math.max(1, bankruptcyDeadlineDay - gameDay)} يوم في المهلة قبل بيع وتصفية الشركة!`
                    : 'تحذير سيولة حرجة · الخزينة تقترب من الصفر!'}
                </span>
              </div>
              <h3 className="font-display text-lg sm:text-xl text-[#F9F6F0]">
                {cash <= 0
                  ? `عجز الخزينة الحالي (${formatMoney(cash)} ${currencyLabel}) — أنقذ شركتك من التصفية الآن!`
                  : 'احصل على تمويل إنقاذ عاجل من مستثمر سينمائي لتفادي الإفلاس'}
              </h3>
              <p className="text-xs font-bold text-[#F9F6F0]/85">
                {cash <= 0
                  ? 'إذا انتهت مهلة الـ 3 أشهر دون سداد المديونية ستُجبر على بيع الشركة للمستثمرين وتأسيس شركة جديدة في نفس العالم.'
                  : 'بدلاً من تعريض الاستوديو للإفلاس، يمكنك تفعيل صفقة تمويل إنقاذ فوري مقابل إعلان ممول.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => claimEmergencyInvestorBailoutWithAd()}
              className="w-full sm:w-auto shrink-0 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-black text-xs sm:text-sm shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>
                تمويل إنقاذ من مستثمر (+
                {formatMoney(
                  cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                )}{' '}
                {currencyLabel}) — مشاهدة إعلان
              </span>
            </button>
          </motion.div>
        )}

        {/* THE STUDIO WALL (الحائط الخلفي للمكتب: سبورة الفلين Corkboard + الخزنة الحديدية في الحائط) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. سبورة الفلين المعلقة على الحائط (Authentic Corkboard with Polaroids, Glossy Push-Pins & Red Twine) */}
          <motion.div
            data-tour-id="tour-corkboard"
            whileHover={{ y: -4, scale: 1.008 }}
            onClick={() => setActiveScreen('CREW_CAST_CARDS')}
            className="lg:col-span-7 relative rounded-[28px] border-[10px] border-[#5B371C] p-4 sm:p-5 shadow-[inset_0_6px_26px_rgba(32,16,4,0.45),0_18px_38px_rgba(26,37,48,0.22)] cursor-pointer overflow-hidden group"
            style={{
              backgroundColor: '#C4925A',
              backgroundImage:
                'radial-gradient(rgba(91,55,28,0.22) 1.2px, transparent 1.2px), radial-gradient(rgba(255,236,196,0.22) 1px, transparent 1px), linear-gradient(135deg, rgba(160,108,58,0.35) 0%, rgba(196,146,90,0.12) 50%, rgba(124,78,38,0.3) 100%)',
              backgroundSize: '14px 14px, 21px 21px, 100% 100%',
              backgroundPosition: '0 0, 7px 7px, 0 0',
            }}
          >
            {/* Brass Frame Corner Rivets */}
            <span className="pointer-events-none absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />
            <span className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFF3B0] to-[#9A7210] shadow-xs" />

            {/* Corkboard Brass Plaque Header */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37] text-xs font-extrabold shadow-md">
                <Pin className="w-3.5 h-3.5 text-[#D91624] fill-[#D91624]" />
                <span>سبورة الكاستينج والنجوم</span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-[#D91624] text-white border border-[#D4AF37]/80 font-display text-xs tracking-wide shadow-md group-hover:brightness-110 transition">
                افتح ملفات الممثلين والمخرجين ←
              </span>
            </div>

            {/* Pinned Polaroid Talent Snapshots Connected with Red Casting Twine */}
            <div className="relative my-2 pt-2">
              {/* Red Casting String SVG connecting the 3 push-pins */}
              <svg
                aria-hidden="true"
                viewBox="0 0 600 90"
                className="pointer-events-none absolute -top-2 inset-x-0 w-full h-16 z-20 hidden sm:block"
                preserveAspectRatio="none"
              >
                <path
                  d="M 105 16 Q 210 56 300 18 Q 395 52 495 15"
                  fill="none"
                  stroke="#B91C1C"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>

              <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4">
                {[
                  {
                    title: 'نجوم الشباك',
                    sub:
                      worldMarket === 'saudi'
                        ? '100+ نجم ونجمة خليجية'
                        : '180+ ممثل وممثلة',
                    note: 'فئة S الذهبية',
                    rot: '-rotate-2',
                    pinColor: 'from-[#FF5C67] via-[#D91624] to-[#7A0912]',
                    frameBg: 'from-[#1E2C3A] to-[#111921]',
                    icon: Star,
                    iconColor: 'text-[#D4AF37]',
                  },
                  {
                    title: 'المخرجين والطاقم',
                    sub: 'مخرجين + تصوير وموسيقى',
                    note: 'قيادة البلاتوه',
                    rot: 'rotate-2',
                    pinColor: 'from-[#FFF3B0] via-[#D4AF37] to-[#8C670C]',
                    frameBg: 'from-[#2A1D1F] to-[#1A2530]',
                    icon: Clapperboard,
                    iconColor: 'text-[#FFF3B0]',
                  },
                  {
                    title: 'الرادار والنجوم الخاصة',
                    sub: 'كروت الألماظ 99',
                    note: 'عقود حصرية',
                    rot: '-rotate-1',
                    pinColor: 'from-[#FF5C67] via-[#D91624] to-[#7A0912]',
                    frameBg: 'from-[#162735] to-[#0D1821]',
                    icon: Radar,
                    iconColor: 'text-[#4ADE80]',
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className={`relative bg-[#FDFBF7] p-2 sm:p-2.5 pb-3 rounded-md shadow-[0_10px_18px_rgba(32,16,4,0.34)] border border-[#E5DEC9] ${card.rot} group-hover:rotate-0 transition-transform duration-300`}
                    >
                      {/* Realistic 3D Glossy Push-Pin + Cast Shadow */}
                      <div className="relative mx-auto -mt-4 mb-1.5 flex items-center justify-center">
                        <span className="absolute top-2.5 h-2.5 w-2.5 rounded-full bg-black/35 blur-[2px]" />
                        <span
                          className={`relative z-10 block h-4 w-4 rounded-full bg-gradient-to-br ${card.pinColor} border border-white/75 shadow-sm`}
                        >
                          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-white/70" />
                        </span>
                      </div>

                      {/* Authentic Polaroid Dark Photo Window */}
                      <div
                        className={`relative h-16 sm:h-20 w-full rounded-xs bg-gradient-to-br ${card.frameBg} border border-[#1A2530]/20 flex flex-col items-center justify-center overflow-hidden mb-2`}
                      >
                        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.iconColor} drop-shadow`} />
                        <span className="mt-1 px-1.5 py-0.5 rounded bg-black/45 text-[9px] font-typewriter font-black text-[#D4AF37]">
                          {card.note}
                        </span>
                      </div>

                      {/* Handwritten Polaroid Caption Strip */}
                      <div className="text-center">
                        <div className="font-display text-xs sm:text-sm text-[#1A2530] leading-tight truncate">
                          {card.title}
                        </div>
                        <div className="font-ruqaa text-[12px] sm:text-sm text-[#D91624] leading-tight mt-0.5 truncate">
                          {card.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pinned Yellow Sticky Note for Active Contracts or Quick Status */}
            <div className="relative z-10 mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FEF08A] border border-[#CA8A04]/70 px-3.5 py-2 text-[#1A2530] text-xs font-extrabold shadow-[2px_4px_10px_rgba(32,16,4,0.22)] -rotate-[0.4deg]">
              <span>
                {awaitingChoiceCount > 0
                  ? `⚠️ لديك ${awaitingChoiceCount} عروض مقبولة تنتظر اختيارك النهائي على السبورة!`
                  : pendingOffersCount > 0
                  ? `⏳ بانتظار رد ${pendingOffersCount} من النجوم على عقودك المرسلة...`
                  : '📌 اضغط لتصفح كروت الممثلين والمخرجين وإرسال عروض التعاقد لفيلمك القادم'}
              </span>
              <span className="font-display text-[#D91624] underline shrink-0">
                فحص الكاستينج
              </span>
            </div>
          </motion.div>

          {/* 2. الخزنة الحديدية في الحائط (Wall Safe) -> تفتح الميزانية والبلاتوهات والأصول الثابتة */}
          <motion.div
            data-tour-id="tour-vault-shelf"
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
                خزنة مصفحة
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
                  الميزانية والبلاتوهات والأصول الثابتة
                </h3>
                <p className="text-xs text-[#F9F6F0]/80 font-bold mt-1 leading-relaxed">
                  شراء البلاتوهات الثابتة لتقليل تكاليف الإنتاج (خصم -{assetBenefits.totalDiscountPercent}%) والحماية من أزمات التصوير وتمويل الإنقاذ العاجل
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
              data-tour-id="tour-script"
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
                    مسودة سيناريو · {currentYear}
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
              data-tour-id="tour-starforge"
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStarForgeOpen(true)}
              className="relative rounded-2xl bg-gradient-to-br from-[#D91624] via-[#B3121E] to-[#7D0912] text-[#F9F6F0] p-5 border-4 border-[#D4AF37] shadow-[8px_12px_0px_#1A2530] cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Top Secret Stamp */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded bg-[#1A2530] text-[#D4AF37] font-typewriter text-[11px] font-black border border-[#D4AF37]">
                  ملف سري للغاية · خاص
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
                  كابينة الكاستينج الملكية
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#1A2530] font-extrabold text-xs shadow">
                  فتح الملف السري ←
                </span>
              </div>
            </motion.div>

            {/* PROP 3: الموبايل على المكتب (Smartphone -> Electronic Committees & Trend War Room) */}
            <motion.div
              data-tour-id="tour-phone"
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
                  بث مباشر · رادار التريند
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
                {formatMoney(lifetimeBoxOffice)} {currencyLabel}
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

        {/* OFFICIAL NEELYO STUDIO FOOTER (معلومات عنا · سياسة الخصوصية · شروط الاستخدام · التواصل) */}
        {onOpenInfo && (
          <footer className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37]/60 px-4 py-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7210] text-[#1A2530] shadow">
                <Crown className="w-4 h-4" />
              </span>
              <div>
                <span className="font-display text-sm text-[#D4AF37] block leading-tight">
                  Neelyo — Cinema &amp; TV Tycoon
                </span>
                <a
                  href="mailto:neelyotycoon@gmail.com"
                  dir="ltr"
                  className="font-typewriter text-[11px] font-bold text-[#F9F6F0]/75 hover:text-[#D4AF37] transition"
                >
                  neelyotycoon@gmail.com
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onOpenInfo('about')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>معلومات عنا</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('privacy')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>سياسة الخصوصية</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('terms')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F9F6F0]/10 hover:bg-[#F9F6F0]/20 border border-[#D4AF37]/40 text-xs font-extrabold text-[#F9F6F0] cursor-pointer transition"
              >
                <Scale className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>شروط الاستخدام</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenInfo('contact')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D91624] hover:brightness-110 border border-[#D4AF37] text-xs font-extrabold text-white cursor-pointer transition"
              >
                <Mail className="w-3.5 h-3.5 text-[#FFF3B0]" />
                <span>تواصل معنا</span>
              </button>
            </div>
          </footer>
        )}
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
                      'خزنة الإمبراطور — البلاتوهات الثابتة والسيولة'}
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
                  {/* Emergency Investor Liquidity Card Inside the Wall Safe */}
                  <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-4 border-2 border-[#D4AF37]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg text-[#D4AF37]">
                          خزينة السيولة والتمويل الطارئ
                        </h3>
                        <p className="text-xs text-[#F9F6F0]/80 mt-0.5">
                          السيولة المتاحة:{' '}
                          <strong dir="ltr" className="font-typewriter text-[#D4AF37]">
                            {formatMoney(cash)}
                          </strong>{' '}
                          {currencyLabel} · خصم الأصول الثابتة:{' '}
                          <strong className="text-emerald-400">
                            -{assetBenefits.totalDiscountPercent}%
                          </strong>
                        </p>
                      </div>

                      {canUseEmergencyBailout ? (
                        <button
                          type="button"
                          onClick={() => claimEmergencyInvestorBailoutWithAd()}
                          className="shrink-0 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] hover:brightness-105 font-black text-xs transition cursor-pointer text-center shadow"
                        >
                          <div className="font-display text-sm text-[#1A2530]">
                            تمويل إنقاذ من مستثمر (إعلان)
                          </div>
                          <div>
                            +
                            {formatMoney(
                              cash < 0 ? Math.abs(cash) + 15_000_000 : 15_000_000
                            )}{' '}
                            {currencyLabel} سيولة فورية
                          </div>
                        </button>
                      ) : (
                        <div className="shrink-0 rounded-xl border border-[#D4AF37]/35 bg-white/5 px-3.5 py-2.5 text-center sm:text-right max-w-[230px]">
                          <div className="text-[11px] font-black text-[#D4AF37]">
                            {bailoutCooldownRemaining > 0
                              ? `الإنقاذ متاح بعد ${bailoutCooldownRemaining} يوماً`
                              : 'خزينة الاستوديو مستقرة'}
                          </div>
                          <p className="text-[10px] font-bold text-[#F9F6F0]/75 mt-0.5 leading-snug">
                            {bailoutCooldownRemaining > 0
                              ? 'تمويل الإنقاذ العاجل يُستخدم مرة واحدة كل 30 يوماً.'
                              : `يُفتح تمويل الإنقاذ الطارئ تلقائياً فقط عند انخفاض السيولة إلى 10M ${currencyLabel} أو أقل.`}
                          </p>
                        </div>
                      )}
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
                              {formatMoney(asset.price)} {currencyLabel}
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
                                      شراء وتوثيق الأصل ({formatMoney(asset.price)} {currencyLabel})
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
                  {marketConfigs.map((cfg) => {
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
                              {regId === primaryRegion ? '100% أساسي' : `+${bonusPct}% إيرادات`}
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
                              disabled={regId === primaryRegion}
                              onClick={() => toggleDraftDistributionMarket(regId)}
                              className="w-full rounded-xl py-2 px-3 text-xs font-black bg-[#1A2530] text-[#F9F6F0] cursor-pointer"
                            >
                              {regId === primaryRegion
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
                              فتح مكتب مبكر ({formatMoney(cfg.earlyLicenseCost)} {currencyLabel})
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
                                  الإيرادات: {formatMoney(proj.totalGrossRevenue)} {currencyLabel}
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
