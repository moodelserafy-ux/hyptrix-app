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
import { useGameStore, STAR_FORGE_REQUIRED_LOCKS } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getCurrencyLabel, type UiLanguageId } from '@/lib/market-profiles';
import { getUiDir, tr } from '@/lib/i18n';
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
import {
  compressImageToWebp320,
  uploadImageToCloudinary,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';
import {
  showRewardedAd,
  getRewardedAdErrorMessage,
} from '@/lib/ad-mediator';

function getStatMetaForGender(
  gender: 'male' | 'female',
  lang: UiLanguageId
): {
  key: keyof SixRadarStats;
  label: string;
  stickyNote: string;
}[] {
  const isFemale = gender === 'female';
  if (lang === 'en') {
    return [
      {
        key: 'charisma',
        label: 'Charisma & Presence',
        stickyNote: isFemale
          ? 'The magnetic screen presence that makes crowds forgive a shaky script and pack opening night!'
          : 'The magnetic screen presence that makes crowds forgive a shaky script and pack opening night!',
      },
      {
        key: 'acting',
        label: 'Dramatic Acting',
        stickyNote: isFemale
          ? 'One master-scene tear from her brings the whole theater to silence and locks in Best Actress buzz!'
          : 'One unforgettable finale monologue brings critics to their feet and puts awards gold within reach!',
      },
      {
        key: 'action',
        label: 'Action & Stunt Grit',
        stickyNote: isFemale
          ? 'High-octane chases and real stunt choreography that electrifies holiday blockbuster crowds!'
          : 'Leaps across rooftops without a stunt double and shatters holiday box-office ceilings!',
      },
      {
        key: 'comedy',
        label: 'Comedy & Timing',
        stickyNote: isFemale
          ? 'One razor-sharp punchline turns into the #1 trending sound across TikTok for a whole month!'
          : 'One razor-sharp punchline turns into the #1 trending clip across TikTok for a whole month!',
      },
      {
        key: 'popularity',
        label: 'Fame & Social Buzz',
        stickyNote: isFemale
          ? 'Her name alone on the poster sells streaming and broadcast deals before cameras even roll!'
          : 'His name alone on the poster sells streaming and broadcast deals before cameras even roll!',
      },
      {
        key: 'boxOffice',
        label: 'Box-Office Pull',
        stickyNote: isFemale
          ? 'Pure ticket-selling magnet — sold-out premieres from night one across every theater chain!'
          : 'Pure ticket-selling magnet — lines wrap around the block from opening night across the region!',
      },
    ];
  }

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
  { maleEn: string; femaleEn: string; maleAr: string; femaleAr: string }
> = {
  action: {
    maleEn: 'Action Blockbuster Hero',
    femaleEn: 'Action Thriller Star',
    maleAr: 'بطل أكشن ومطاردات',
    femaleAr: 'نجمة أكشن وإثارة',
  },
  popular_drama: {
    maleEn: 'Street Drama Powerhouse',
    femaleEn: 'First Lady of Drama',
    maleAr: 'نجم الدراما الشعبية',
    femaleAr: 'سيدة الدراما الأولى',
  },
  comedy: {
    maleEn: 'Crowd-Pleasing Comedy Star',
    femaleEn: 'Satirical Comedy Queen',
    maleAr: 'نجم الكوميديا الجماهيرية',
    femaleAr: 'نجمة الكوميديا الساخرة',
  },
  light_comedy: {
    maleEn: 'Light Comedy Headliner',
    femaleEn: 'Family Comedy Star',
    maleAr: 'بطل اللايت كوميدي',
    femaleAr: 'نجمة اللايت كوميدي',
  },
  psychological_horror: {
    maleEn: 'Psychological Thriller Lead',
    femaleEn: 'Horror & Suspense Icon',
    maleAr: 'بطل الرعب النفسي',
    femaleAr: 'أيقونة الرعب والغموض',
  },
  supernatural_horror: {
    maleEn: 'Supernatural Cinema Lead',
    femaleEn: 'Supernatural Thriller Star',
    maleAr: 'نجم ما وراء الطبيعة',
    femaleAr: 'بطلة الرعب الخارق',
  },
  crime_mystery: {
    maleEn: 'Crime & Mystery Detective',
    femaleEn: 'Noir Thriller Headliner',
    maleAr: 'محقق الجريمة والغموض',
    femaleAr: 'نجمة الإثارة البوليسية',
  },
  sci_fi: {
    maleEn: 'Sci-Fi Visionary Lead',
    femaleEn: 'Futuristic Sci-Fi Star',
    maleAr: 'بطل الخيال العلمي',
    femaleAr: 'نجمة المستقبل والخيال',
  },
  romance: {
    maleEn: 'Romantic Screen Heartthrob',
    femaleEn: 'Cinematic Romance Icon',
    maleAr: 'فتى الشاشة الرومانسي',
    femaleAr: 'نجمة الرومانسية الحالمة',
  },
  historical: {
    maleEn: 'Historical Epic Knight',
    femaleEn: 'Queen of Historical Drama',
    maleAr: 'فارس الملاحم التاريخية',
    femaleAr: 'ملكة الدراما التاريخية',
  },
  biography: {
    maleEn: 'Prestige Biopic Lead',
    femaleEn: 'Biopic Awards Contender',
    maleAr: 'بطل السير الذاتية',
    femaleAr: 'نجمة السير الذاتية',
  },
  heist: {
    maleEn: 'Heist Mastermind Lead',
    femaleEn: 'Master of Deception & Heist',
    maleAr: 'عقل السطو والذكاء',
    femaleAr: 'ماستر الخداع والسطو',
  },
  fantasy: {
    maleEn: 'Mythic Fantasy Champion',
    femaleEn: 'Fantasy Realm Sovereign',
    maleAr: 'بطل الفانتازيا والأساطير',
    femaleAr: 'أميرة الأساطير السحرية',
  },
  superhero: {
    maleEn: 'Blockbuster Superhero',
    femaleEn: 'Blockbuster Superheroine',
    maleAr: 'البطل الخارق',
    femaleAr: 'البطلة الخارقة',
  },
};

const QUICK_GENRE_CHIPS: { id: GenreId; labelEn: string; labelAr: string }[] = [
  { id: 'action', labelEn: 'Action & Thrillers', labelAr: 'أكشن ومطاردات' },
  { id: 'popular_drama', labelEn: 'Street Drama', labelAr: 'دراما شعبية' },
  { id: 'comedy', labelEn: 'Hit Comedy', labelAr: 'كوميديا جماهيرية' },
  { id: 'romance', labelEn: 'Cinema Romance', labelAr: 'رومانسي سينمائي' },
  { id: 'crime_mystery', labelEn: 'Crime & Mystery', labelAr: 'جريمة وغموض' },
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
  const cleanName = (name || 'STAR').trim();
  const initial = cleanName.charAt(0).toUpperCase() || '★';
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
  const refundStarForgeCash = useGameStore((s) => s.refundStarForgeCash);
  const createCustomVipStar = useGameStore((s) => s.createCustomVipStar);
  const showToast = useGameStore((s) => s.showToast);
  const worldMarket = useGameStore((s) => s.worldMarket);
  const uiLanguage = useGameStore((s) => s.uiLanguage);

  const isAr = uiLanguage === 'ar';
  const dir = getUiDir(uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

  // Clean AdsGram-friendly cap: 1 generous free training camp (+6 points) per star
  const MAX_TRAINING_ADS_PER_STAR = 1;
  const TRAINING_CAMP_POINTS = 6;

  const EMPTY_PAID_HISTORY: Record<keyof SixRadarStats, number[]> = {
    charisma: [],
    acting: [],
    action: [],
    comedy: [],
    popularity: [],
    boxOffice: [],
  };

  const DEFAULT_RADAR_STATS: SixRadarStats = {
    charisma: 76,
    acting: 74,
    action: 78,
    comedy: 70,
    popularity: 75,
    boxOffice: 77,
  };

  const [castingStep, setCastingStep] = useState<1 | 2 | 3>(1);
  const [watchingAdIndex, setWatchingAdIndex] = useState<number | null>(null);
  const [droppedLockIndex, setDroppedLockIndex] = useState<number | null>(null);

  const [starGender, setStarGender] = useState<'male' | 'female'>('male');
  const [starName, setStarName] = useState('');
  const [starAgeInput, setStarAgeInput] = useState<string>('');
  const [primaryGenre, setPrimaryGenre] = useState<GenreId>('action');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [cameraFlashActive, setCameraFlashActive] = useState(false);
  const [hoveredStatKey, setHoveredStatKey] =
    useState<keyof SixRadarStats>('charisma');
  const [trainingAdLoading, setTrainingAdLoading] = useState(false);
  const [trainingAdsUsed, setTrainingAdsUsed] = useState(0);
  const [paidCostHistory, setPaidCostHistory] =
    useState<Record<keyof SixRadarStats, number[]>>(EMPTY_PAID_HISTORY);

  const [radarStats, setRadarStats] =
    useState<SixRadarStats>(DEFAULT_RADAR_STATS);

  const [revealedStar, setRevealedStar] = useState<ActorItem | null>(null);
  const [isStampingReveal, setIsStampingReveal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isStarForgeOpen) return null;

  const allLocksOpened = starForgeLocksOpened >= STAR_FORGE_REQUIRED_LOCKS;
  const statMetaList = getStatMetaForGender(starGender, uiLanguage);
  const lockIndices = Array.from(
    { length: STAR_FORGE_REQUIRED_LOCKS },
    (_, idx) => idx
  );

  const parsedAge = Number.parseInt(starAgeInput, 10);
  const isAgeValid =
    starAgeInput.trim().length > 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge >= 18 &&
    parsedAge <= 70;
  const effectiveStarAge = isAgeValid ? parsedAge : 25;

  const handleSwitchGender = (nextGender: 'male' | 'female') => {
    setStarGender(nextGender);
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

  const handleFileDropOrSelect = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(
        tr(
          uiLanguage,
          'Please select a valid image file (JPG, PNG, or WEBP).',
          'اختر ملف صورة صحيح (JPG أو PNG أو WEBP)'
        ),
        'warning'
      );
      return;
    }
    const compressed = await compressImageToWebp320(file, 320, 0.82);
    if (!compressed.ok || !compressed.dataUrl || !compressed.blob) {
      showToast(
        compressed.error ||
          tr(
            uiLanguage,
            'Could not process image. Choose a JPG, PNG, or WEBP file.',
            'تعذر تجهيز الصورة، اختر ملف JPG أو PNG أو WEBP'
          ),
        'warning'
      );
      return;
    }
    setPendingPhotoBlob(compressed.blob);
    triggerPhotoFlash(compressed.dataUrl);
  };

  const handleWatchAdToUnlock = async () => {
    if (watchingAdIndex !== null || allLocksOpened) return;
    const currentLock = starForgeLocksOpened;
    setWatchingAdIndex(currentLock);
    const adResult = await showRewardedAd('star_forge_lock');
    if (!adResult.completed) {
      setWatchingAdIndex(null);
      const errMsg = getRewardedAdErrorMessage(
        adResult.reason,
        'لفتح القفل',
        uiLanguage,
        'to unlock the golden lock'
      );
      if (errMsg) showToast(errMsg, 'warning');
      return;
    }
    playMetalLockDrop();
    setDroppedLockIndex(currentLock);
    unlockNextStarForgeLockWithAd();
    setWatchingAdIndex(null);
    setTimeout(() => setDroppedLockIndex(null), 700);
  };

  const handleIncrementStat = (key: keyof SixRadarStats) => {
    const currentVal = radarStats[key];
    if (currentVal >= 99) return;

    const isEliteTier = currentVal >= 80;
    const cashCost = isEliteTier ? 3_500_000 : 1_500_000;

    const ok = spendForStarForgeUpgrade(cashCost, 0);
    if (!ok) return;

    playCashRegisterChaChing();
    setPaidCostHistory((prev) => ({
      ...prev,
      [key]: [...prev[key], cashCost],
    }));
    setRadarStats((prev) => ({
      ...prev,
      [key]: Math.min(99, prev[key] + 2),
    }));
  };

  const handleDecrementStat = (key: keyof SixRadarStats) => {
    const currentVal = radarStats[key];
    if (currentVal <= 60) return;

    const historyForStat = paidCostHistory[key] || [];
    if (historyForStat.length > 0) {
      const refundedAmount = historyForStat[historyForStat.length - 1];
      setPaidCostHistory((prev) => ({
        ...prev,
        [key]: prev[key].slice(0, -1),
      }));
      refundStarForgeCash(refundedAmount);
      showToast(
        tr(
          uiLanguage,
          `Refunded ${formatMoney(refundedAmount)} ${currencyLabel} to your studio treasury.`,
          `تم استرداد ${formatMoney(refundedAmount)} ${currencyLabel} إلى خزينة الاستوديو`
        ),
        'info'
      );
    }

    setRadarStats((prev) => ({
      ...prev,
      [key]: Math.max(60, prev[key] - 2),
    }));
  };

  const handleAdTrainingCampBoost = async () => {
    if (trainingAdLoading) return;
    if (trainingAdsUsed >= MAX_TRAINING_ADS_PER_STAR) {
      showToast(
        tr(
          uiLanguage,
          `Free training camp already claimed (${MAX_TRAINING_ADS_PER_STAR}/${MAX_TRAINING_ADS_PER_STAR}) for this star!`,
          `اكتمل الحد الأقصى لمعسكر التدريب المجاني (${MAX_TRAINING_ADS_PER_STAR}/${MAX_TRAINING_ADS_PER_STAR}) لهذا النجم!`
        ),
        'warning',
        tr(
          uiLanguage,
          'You can continue upgrading remaining stats using your studio treasury.',
          'يمكنك استكمال رفع باقي الطاقات من خزينة الاستوديو.'
        )
      );
      return;
    }
    const upgradableKeys = (
      Object.keys(radarStats) as (keyof SixRadarStats)[]
    ).filter((k) => radarStats[k] < 99);
    if (upgradableKeys.length === 0) {
      showToast(
        tr(
          uiLanguage,
          'All star attributes have already reached the 99 maximum!',
          'جميع مهارات النجم وصلت للحد الأقصى 99 بالفعل!'
        ),
        'success'
      );
      return;
    }
    setTrainingAdLoading(true);
    const adResult = await showRewardedAd('star_forge_training');
    if (!adResult.completed) {
      setTrainingAdLoading(false);
      const errMsg = getRewardedAdErrorMessage(
        adResult.reason,
        'للحصول على نقاط التدريب',
        uiLanguage,
        'to claim training camp points'
      );
      if (errMsg) showToast(errMsg, 'warning');
      return;
    }
    playCashRegisterChaChing();
    setRadarStats((prev) => {
      const next = { ...prev };
      let pointsLeft = TRAINING_CAMP_POINTS;
      let guard = 0;
      while (pointsLeft > 0 && guard < 24) {
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
    setTrainingAdsUsed((c) => c + 1);
    setTrainingAdLoading(false);
    showToast(
      tr(
        uiLanguage,
        `Intensive Training Camp complete! (+${TRAINING_CAMP_POINTS} free stat points)`,
        `اكتمل معسكر التدريب المكثف! (+${TRAINING_CAMP_POINTS} نقاط طاقة مجاناً)`
      ),
      'success',
      tr(
        uiLanguage,
        'You can fine-tune any remaining skills from your studio treasury.',
        'يمكنك استكمال تطوير باقي الطاقات من خزينة الاستوديو.'
      )
    );
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

  const genreArch = GENRE_ARCHETYPE_LABELS[primaryGenre];
  const archetypeTitle = isAr
    ? genreArch?.[starGender === 'female' ? 'femaleAr' : 'maleAr'] ||
      (starGender === 'female' ? 'نجمة شباك حصرية' : 'نجم شباك حصري')
    : genreArch?.[starGender === 'female' ? 'femaleEn' : 'maleEn'] ||
      (starGender === 'female' ? 'Exclusive Box-Office Star' : 'Exclusive Box-Office Star');

  const estimatedBaseSalary = Math.max(8_000_000, overallRating * 180_000);
  const previewPortraitUrl =
    photoUrl ||
    buildRoyalMonogramPortraitDataUrl(starName, starGender, overallRating);

  const resetFormFields = () => {
    setStarName('');
    setStarAgeInput('');
    setPhotoUrl('');
    setPendingPhotoBlob(null);
    setPrimaryGenre('action');
    setStarGender('male');
    setRadarStats(DEFAULT_RADAR_STATS);
    setTrainingAdsUsed(0);
    setPaidCostHistory(EMPTY_PAID_HISTORY);
    setCastingStep(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateStep1BeforeContinue = (): boolean => {
    if (!starName.trim()) {
      showToast(
        tr(
          uiLanguage,
          'Please enter a stage name for your star first!',
          `اكتب الاسم الفني لـ${starGender === 'female' ? 'لنجمة' : 'لنجم'} أولاً!`
        ),
        'warning'
      );
      setCastingStep(1);
      return false;
    }
    if (!isAgeValid) {
      showToast(
        tr(
          uiLanguage,
          'Enter a valid age between 18 and 70!',
          'اكتب عمراً صحيحاً للنجم بين 18 و 70 سنة!'
        ),
        'warning'
      );
      setCastingStep(1);
      return false;
    }
    return true;
  };

  const handleCertifyDiamondStar = async () => {
    if (!validateStep1BeforeContinue()) return;
    if (isStampingReveal) return;

    setIsStampingReveal(true);
    playHeavyIronStamp();

    let finalPortraitUrl = previewPortraitUrl;
    if (pendingPhotoBlob && photoUrl && isCloudinaryConfigured()) {
      try {
        const uploadRes = await uploadImageToCloudinary(
          pendingPhotoBlob,
          'neelyo/stars'
        );
        if (uploadRes.ok && uploadRes.secureUrl) {
          finalPortraitUrl = uploadRes.secureUrl;
        }
      } catch {
        // Fallback cleanly to compressed local 320x320 WebP dataUrl
      }
    }

    const newActor: ActorItem = {
      id: `custom_star_${Date.now()}`,
      name: starName.trim(),
      gender: starGender,
      age: effectiveStarAge,
      tier: 'S',
      image_url: finalPortraitUrl,
      base_salary: estimatedBaseSalary,
      archetype: `${archetypeTitle} · ${tr(
        uiLanguage,
        'Exclusive Studio Star',
        'نجم الاستوديو الحصري'
      )}`,
      isCustomStar: true,
      autographSignature: starName.trim(),
      radarStats: { ...radarStats },
      stats: {
        overall: overallRating,
        acting: radarStats.acting,
        charisma: radarStats.charisma,
        box_office_pull: radarStats.boxOffice,
        ego: Math.min(88, Math.max(46, Math.round(overallRating * 0.84))),
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
      setPendingPhotoBlob(null);
      setRevealedStar(newActor);
      setIsStampingReveal(false);
    }, 450);
  };

  const handleClose = () => {
    if (revealedStar) {
      resetFormFields();
    }
    setRevealedStar(null);
    setCastingStep(1);
    setStarForgeOpen(false);
  };

  const PrevIcon = isAr ? ArrowRight : ArrowLeft;
  const NextIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-2.5 sm:p-4 bg-[#1A2530]/88 backdrop-blur-md overflow-y-auto overscroll-contain select-none"
        dir={dir}
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

        {/* STAGE A: TOP SECRET RED VELVET FOLDER (2 Golden Locks Entrance) */}
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
                  {tr(uiLanguage, 'TOP SECRET · VIP DOSSIER', 'ملف سري للغاية · خاص')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={tr(uiLanguage, 'Close Star Forge', 'إغلاق غرفة صناعة النجوم')}
                className="w-10 h-10 rounded-xl bg-[#1A2530]/85 hover:bg-[#1A2530] text-[#F9F6F0] flex items-center justify-center border border-[#D4AF37]/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#1A2530]/85 border border-[#D4AF37] text-[#D4AF37] text-xs font-extrabold mb-2 shadow">
                <Crown className="w-3.5 h-3.5" />
                <span>
                  {tr(
                    uiLanguage,
                    'Royal Casting Vault · Executive Desk',
                    'خزينة كاستينج الأساطير بمكتب الإمبراطور'
                  )}
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-[#F9F6F0] tracking-wide">
                {tr(uiLanguage, 'The Star Forge', 'غرفة صناعة النجوم')}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#F9F6F0]/90 mt-1.5 leading-relaxed">
                {tr(
                  uiLanguage,
                  `Discover your own box-office icon — unlock the ${STAR_FORGE_REQUIRED_LOCKS} golden vault locks to forge a custom Diamond-tier star.`,
                  `«اكتشف نجمك الخاص.. افتح القفلين الذهبيين (${STAR_FORGE_REQUIRED_LOCKS}) لدخول كابينة الكاستينج وصناعة أسطورة سينمائية جديدة»`
                )}
              </p>
            </div>

            {/* 2 Golden Locks & 2 Cinema Film Reels */}
            <div className="grid grid-cols-2 gap-3.5 my-5 max-w-xs mx-auto">
              {lockIndices.map((idx) => {
                const isUnlocked = idx < starForgeLocksOpened;
                const isDropping = droppedLockIndex === idx;
                const isWatching = watchingAdIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      isUnlocked
                        ? 'bg-[#D4AF37]/30 border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.45)]'
                        : 'bg-[#1A2530]/80 border-[#D4AF37]/35 opacity-95'
                    }`}
                  >
                    <motion.div
                      animate={isWatching ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 0.7 }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 ${
                        isUnlocked
                          ? 'bg-[#D4AF37] text-[#1A2530] border-white'
                          : 'bg-[#1A2530] text-[#F9F6F0]/45 border-[#F9F6F0]/20'
                      }`}
                    >
                      <Film className="w-6 h-6" />
                    </motion.div>

                    <motion.div
                      animate={
                        isDropping
                          ? { y: [0, -10, 60], opacity: [1, 1, 0] }
                          : { y: 0, opacity: 1 }
                      }
                      className="text-xs font-extrabold text-center"
                    >
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[#D4AF37]">
                          <Unlock className="w-3.5 h-3.5" />
                          {tr(uiLanguage, 'Unlocked', 'مفتوح')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#F9F6F0]/85">
                          <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {tr(uiLanguage, `Lock #${idx + 1}`, `قفل #${idx + 1}`)}
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
                  ? tr(
                      uiLanguage,
                      'Rolling film reel & unlocking golden vault...',
                      'جاري تشغيل بكرة العرض وفك القفل الذهبي...'
                    )
                  : tr(
                      uiLanguage,
                      `Watch Short Ad to Unlock (${starForgeLocksOpened}/${STAR_FORGE_REQUIRED_LOCKS})`,
                      `مشاهدة إعلان لفك القفل (${starForgeLocksOpened}/${STAR_FORGE_REQUIRED_LOCKS})`
                    )}
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
                      {tr(uiLanguage, 'Royal Star Forge', 'غرفة صناعة النجوم الملكية')}
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D91624] text-white text-[10px] font-black border border-[#D4AF37]">
                      {overallRating} OVR
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#D4AF37] truncate">
                    {tr(
                      uiLanguage,
                      'Exclusive Casting Cabin · Design your next box-office legend',
                      'كابينة الكاستينج الحصرية · صمّم أسطورة شباك التذاكر القادمة'
                    )}
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
                  aria-label={tr(uiLanguage, 'Close Star Forge', 'إغلاق غرفة صناعة النجوم')}
                  className="w-9 h-9 rounded-xl bg-[#D91624] hover:brightness-110 text-white flex items-center justify-center border border-[#D4AF37] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-Step Visual Stepper Ribbon */}
            <div className="grid grid-cols-3 bg-[#EFE9DC] border-b-2 border-[#D4AF37]/50 p-1.5 gap-1.5 shrink-0">
              {[
                {
                  id: 1,
                  num: '1',
                  title: tr(uiLanguage, 'Identity & Photo', 'الهوية والصورة'),
                  sub: tr(uiLanguage, 'Casting Dossier', 'بطاقة الكاستينج'),
                },
                {
                  id: 2,
                  num: '2',
                  title: tr(uiLanguage, 'Radar & Stats', 'الرادار والطاقات'),
                  sub: tr(uiLanguage, '6 Core Skills', '6 مهارات أساسية'),
                },
                {
                  id: 3,
                  num: '3',
                  title: tr(uiLanguage, 'Diamond Card', 'الكارت الألماظ'),
                  sub: tr(uiLanguage, 'Sign & Certify', 'الاعتماد والتوقيع'),
                },
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
                    <div className={`${isAr ? 'text-right' : 'text-left'} min-w-0`}>
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
              {/* STEP 1: Identity & Portrait */}
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
                      <span>{tr(uiLanguage, 'Leading Actor', 'نجم شباك (ممثل)')}</span>
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
                      <span>{tr(uiLanguage, 'Leading Actress', 'نجمة شباك (ممثلة)')}</span>
                    </button>
                  </div>

                  {/* Balanced 2-Column Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                    {/* Studio Viewfinder Upload Box */}
                    <div className="sm:col-span-5 flex flex-col">
                      <div className="relative flex-1 flex flex-col rounded-3xl bg-[#1A2530] p-3 border-2 border-[#D4AF37] shadow-[0_14px_30px_rgba(26,37,48,0.22)]">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-[10px] font-extrabold text-[#D4AF37] flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            <span>{tr(uiLanguage, 'Casting Lens', 'عدسة الكاستينج')}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#D91624] text-white font-typewriter text-[10px] font-black">
                            {overallRating} OVR
                          </span>
                        </div>

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
                                  <span>{tr(uiLanguage, 'Change Photo', 'تغيير الصورة')}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoUrl('');
                                    setPendingPhotoBlob(null);
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#D91624]/90 hover:bg-[#D91624] text-white text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{tr(uiLanguage, 'Remove', 'حذف')}</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center px-4 py-5 flex flex-col items-center">
                              {starName.trim() ? (
                                <div className="w-20 h-20 rounded-full bg-[#111921] border-4 border-[#D4AF37] shadow-[0_0_28px_rgba(212,175,55,0.4)] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                                  <span className="font-display text-4xl text-[#D4AF37] leading-none">
                                    {starName.trim().charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.35)] mb-3 group-hover:scale-105 transition-transform">
                                  <ImagePlus className="w-8 h-8" />
                                </div>
                              )}
                              <p className="font-display text-sm sm:text-base text-[#F9F6F0] leading-snug">
                                {starName.trim()
                                  ? tr(
                                      uiLanguage,
                                      'Royal Monogram Ready',
                                      'صورة الحرف التلقائية جاهزة'
                                    )
                                  : tr(
                                      uiLanguage,
                                      'Tap to Upload Star Portrait',
                                      `اضغط لرفع صورة ${
                                        starGender === 'female' ? 'النجمة' : 'النجم'
                                      }`
                                    )}
                              </p>
                              <p className="text-[11px] font-bold text-[#D4AF37]/90 mt-1 leading-relaxed">
                                {starName.trim()
                                  ? tr(
                                      uiLanguage,
                                      'Without a custom photo, a Royal Monogram portrait is generated automatically',
                                      'إذا لم ترفع صورة، ستعتمد اللعبة تلقائياً بورتريه بحرف الاسم'
                                    )
                                  : tr(
                                      uiLanguage,
                                      'Optional — a custom Royal Monogram portrait is auto-generated otherwise',
                                      'اختياري — لو لم تختر صورة سيتم توليد بورتريه بحرف الاسم تلقائياً'
                                    )}
                              </p>
                              <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D91624] text-white text-[11px] font-black border border-[#D4AF37]/70 shadow-sm group-hover:brightness-110 transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{tr(uiLanguage, 'Upload From Device', 'رفع صورة من جهازك')}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/30 flex items-center justify-between px-1 gap-2">
                          <span className="text-[11px] font-bold text-[#F9F6F0]/80 truncate">
                            {archetypeTitle}
                          </span>
                          <span className="font-ruqaa text-base sm:text-lg text-[#D4AF37] -rotate-2 shrink-0">
                            {starName.trim() || tr(uiLanguage, 'Autograph', 'توقيع النجم')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Clean Dossier Fields */}
                    <div className="sm:col-span-7 flex flex-col justify-between gap-3">
                      <div className="bg-white p-4 rounded-3xl border-2 border-[#1A2530]/15 space-y-4 shadow-xs flex-1">
                        {/* Name & Age */}
                        <div className="grid grid-cols-12 gap-2.5">
                          <div className="col-span-8">
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                              {tr(
                                uiLanguage,
                                starGender === 'female' ? 'Actress Stage Name' : 'Actor Stage Name',
                                `الاسم الفني لـ${starGender === 'female' ? 'لنجمة' : 'لنجم'}`
                              )}
                            </label>
                            <input
                              type="text"
                              value={starName}
                              onChange={(e) => setStarName(e.target.value)}
                              placeholder={tr(uiLanguage, 'Enter stage name...', 'اكتب الاسم الفني...')}
                              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F9F6F0] border-2 border-[#1A2530]/20 focus:border-[#D91624] outline-none font-extrabold text-base text-[#1A2530]"
                            />
                          </div>

                          <div className="col-span-4">
                            <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-1.5">
                              {tr(uiLanguage, 'Age (18–70)', 'العمر (18–70)')}
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              value={starAgeInput}
                              placeholder={tr(uiLanguage, 'e.g. 28', 'مثال: 28')}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                                setStarAgeInput(digitsOnly.slice(0, 2));
                              }}
                              className={`w-full min-h-[44px] px-2 py-2 rounded-xl bg-[#F9F6F0] border-2 outline-none text-base font-typewriter font-black text-center text-[#1A2530] ${
                                starAgeInput.length > 0 && !isAgeValid
                                  ? 'border-[#D91624] bg-[#D91624]/5'
                                  : 'border-[#1A2530]/20 focus:border-[#D91624]'
                              }`}
                            />
                            {starAgeInput.length > 0 && !isAgeValid && (
                              <span className="mt-1 block text-[10px] font-bold text-[#D91624] text-center">
                                {tr(uiLanguage, '18 to 70', 'بين 18 و 70')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Specialty Genre Chips */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-[#1A2530]/80 mb-2">
                            {tr(
                              uiLanguage,
                              'Signature Box-Office Specialty',
                              'التخصص الدرامي الأقوى في شباك التذاكر'
                            )}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {QUICK_GENRE_CHIPS.map((g) => {
                              const active = primaryGenre === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => handleSwitchGenre(g.id)}
                                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition cursor-pointer ${
                                    isAr ? 'text-right' : 'text-left'
                                  } flex items-center justify-between ${
                                    active
                                      ? 'bg-[#1A2530] text-[#D4AF37] border-[#D4AF37] shadow-sm'
                                      : 'bg-[#F9F6F0] text-[#1A2530] border-[#1A2530]/15 hover:border-[#D4AF37]'
                                  }`}
                                >
                                  <span>{isAr ? g.labelAr : g.labelEn}</span>
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
                              {tr(
                                uiLanguage,
                                'Projected Market Value Upon Signing',
                                'القيمة التسويقية المتوقعة عند الاعتماد'
                              )}
                            </div>
                            <div className="text-xs font-black text-[#1A2530]">
                              {tr(
                                uiLanguage,
                                'Exclusive S-TIER Studio Icon',
                                'فئة S-TIER حصري للاستوديو'
                              )}
                            </div>
                          </div>
                          <div
                            dir="ltr"
                            className="font-typewriter text-sm font-black text-[#15803D] bg-white px-3 py-1.5 rounded-xl border border-[#15803D]/25 shrink-0"
                          >
                            {formatMoney(estimatedBaseSalary)} {currencyLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: 6-Axis Radar & Stat Allocation */}
              {castingStep === 2 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3.5 rounded-3xl border-2 border-[#1A2530]/15 shadow-xs">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center">
                      <HexagonalRadarChartSvg
                        stats={radarStats}
                        size={176}
                        isDiamond={overallRating >= 86}
                      />
                      <span className="mt-1 px-3 py-0.5 rounded-lg bg-[#1A2530] text-[#D4AF37] font-typewriter text-xs font-black">
                        {tr(
                          uiLanguage,
                          `Overall Rating: ${overallRating} / 99`,
                          `التقييم الإجمالي: ${overallRating} / 99`
                        )}
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="p-3.5 rounded-xl sticky-note-torn text-[#1A2530]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs text-[#D91624]">
                            {tr(uiLanguage, 'Director’s Scout Note — ', 'تقييم المخرج لـ ')}
                            {statMetaList.find((s) => s.key === hoveredStatKey)?.label}
                          </span>
                          <span className="font-typewriter text-xs font-black bg-[#1A2530] text-[#D4AF37] px-2 py-0.5 rounded">
                            {radarStats[hoveredStatKey]}/99
                          </span>
                        </div>
                        <p className="font-ruqaa text-base sm:text-lg leading-snug text-[#1A2530]">
                          “{statMetaList.find((s) => s.key === hoveredStatKey)?.stickyNote}”
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F9F6F0] border border-[#1A2530]/15 px-3 py-2 text-[11px] font-bold text-[#1A2530]/85 flex flex-wrap items-center justify-between gap-1">
                        <span>
                          {tr(
                            uiLanguage,
                            `60–80 Tier: 1.5M ${currencyLabel}`,
                            `من 60 إلى 80: 1.5M ${currencyLabel}`
                          )}
                        </span>
                        <span className="text-[#D91624] font-extrabold">
                          {tr(
                            uiLanguage,
                            `Elite (80–99): 3.5M ${currencyLabel}`,
                            `نخبة (80–99): 3.5M ${currencyLabel}`
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={
                          trainingAdLoading ||
                          trainingAdsUsed >= MAX_TRAINING_ADS_PER_STAR
                        }
                        onClick={handleAdTrainingCampBoost}
                        className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-black text-xs border border-[#1A2530]/25 shadow-xs hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      >
                        <Zap className="w-4 h-4 text-[#D91624]" />
                        <span>
                          {trainingAdLoading
                            ? tr(uiLanguage, 'Preparing Training Camp...', 'جاري تجهيز معسكر التدريب...')
                            : trainingAdsUsed >= MAX_TRAINING_ADS_PER_STAR
                            ? tr(
                                uiLanguage,
                                `Free Training Camp Claimed (${MAX_TRAINING_ADS_PER_STAR}/${MAX_TRAINING_ADS_PER_STAR})`,
                                `اكتمل معسكر التدريب المجاني (${MAX_TRAINING_ADS_PER_STAR}/${MAX_TRAINING_ADS_PER_STAR})`
                              )
                            : tr(
                                uiLanguage,
                                `Intensive Training Camp (+${TRAINING_CAMP_POINTS} Free Points · 1 Ad)`,
                                `معسكر تدريب مكثف (+${TRAINING_CAMP_POINTS} نقاط مجاناً · إعلان واحد)`
                              )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 6 Stat Controls */}
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
                                  ? tr(uiLanguage, 'Living Legend (99 MAX)', 'أسطورة خالدة (99 MAX)')
                                  : isEliteNext
                                  ? tr(
                                      uiLanguage,
                                      `Elite Coaching (3.5M ${currencyLabel})`,
                                      `تدريب نخبة (3.5M ${currencyLabel})`
                                    )
                                  : tr(
                                      uiLanguage,
                                      `Core Training (1.5M ${currencyLabel})`,
                                      `تطوير أساسي (1.5M ${currencyLabel})`
                                    )}
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

              {/* STEP 3: Diamond Card Preview & Final Certification */}
              {castingStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-6 flex justify-center">
                    <div className="w-full max-w-[300px]">
                      <Fut3DTiltCard tier="DIAMOND" className="p-4 text-[#F8FAFC]">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="min-w-0">
                            <span className="block text-[11px] font-black text-[#7DD3FC] truncate">
                              {archetypeTitle}
                            </span>
                            <span className="text-[10px] font-bold text-[#CBD5E1]">
                              {effectiveStarAge} {tr(uiLanguage, 'yrs', 'سنة')}
                            </span>
                          </div>
                          <div className="shrink-0 px-2.5 py-1 rounded-xl bg-[#040B16]/90 border border-[#FDE68A]/70 text-center">
                            <span className="font-typewriter text-lg font-black text-[#FDE68A] leading-none block tabular-nums">
                              {overallRating}
                            </span>
                            <span className="text-[8px] font-black tracking-widest text-[#7DD3FC]">
                              OVR
                            </span>
                          </div>
                        </div>

                        <div className="relative w-full h-44 rounded-2xl overflow-hidden border-2 border-[#38BDF8]/75 mb-3 bg-[#040B16] shadow-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewPortraitUrl}
                            alt={starName}
                            className="w-full h-full object-cover contrast-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040B16]/95 via-[#040B16]/55 to-transparent" />
                          <div className="absolute bottom-2 inset-x-2.5 flex items-end justify-between gap-2">
                            <h3 className="font-display text-lg text-[#FFFFFF] drop-shadow truncate">
                              {starName}
                            </h3>
                            <span className="font-ruqaa text-base text-[#FDE68A] shrink-0">
                              {starName.trim() || tr(uiLanguage, 'Autograph', 'توقيع النجم')}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-center bg-[#040B16]/65 border border-[#38BDF8]/30 rounded-2xl p-2">
                          <HexagonalRadarChartSvg
                            stats={radarStats}
                            size={145}
                            isDiamond
                            darkSurface
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
                          {tr(uiLanguage, 'Diamond Card Charter', 'وثيقة اعتماد الكارت الألماظ')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#15803D] text-white text-[10px] font-black">
                          {tr(uiLanguage, 'EXCLUSIVE S-TIER', 'فئة S-TIER حصري')}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-bold text-[#1A2530]/85">
                        <div className="flex items-center justify-between gap-2">
                          <span>{tr(uiLanguage, 'Certified Stage Name:', 'الاسم الفني المعتمد:')}</span>
                          <span className="font-black text-[#1A2530]">{starName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{tr(uiLanguage, 'Specialty Archetype:', 'التصنيف والتخصص:')}</span>
                          <span className="font-black text-[#D91624]">{archetypeTitle}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{tr(uiLanguage, 'Projected Fee Value:', 'القيمة التسويقية المتوقعة:')}</span>
                          <span
                            dir="ltr"
                            className="font-typewriter font-black text-[#15803D]"
                          >
                            {formatMoney(estimatedBaseSalary)} {currencyLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{tr(uiLanguage, 'Studio Loyalty:', 'الولاء للاستوديو:')}</span>
                          <span className="font-black text-[#1A2530]">
                            {tr(uiLanguage, 'Priority Casting Access', 'أولوية تعاقد فورية لأفلامك')}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFF9E6] border border-[#D4AF37] text-[11px] font-bold text-[#1A2530] leading-relaxed">
                        {isAr ? (
                          <>
                            ★ بمجرد الختم والاعتماد سينضم <strong>{starName}</strong> فوراً إلى سبورة الفلين وقائمة نجوم الصف الأول في استوديوك بكامل طاقاته السداسية!
                          </>
                        ) : (
                          <>
                            ★ Once stamped and certified, <strong>{starName}</strong> immediately joins your studio’s A-List Casting Board with full 6-axis stats!
                          </>
                        )}
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
                  <PrevIcon className="w-4 h-4" />
                  <span>{tr(uiLanguage, 'Back', 'السابق')}</span>
                </button>
              ) : (
                <div className="text-xs font-bold text-[#D4AF37]">
                  {tr(uiLanguage, 'Step 1 of 3: Identity & Photo', 'الخطوة 1 من 3: الهوية والصورة')}
                </div>
              )}

              {castingStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (castingStep === 1 && !validateStep1BeforeContinue()) {
                      return;
                    }
                    setCastingStep((prev) => (prev === 1 ? 2 : 3));
                  }}
                  className="min-h-[44px] px-5 sm:px-6 py-2 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-sm sm:text-base border border-[#D4AF37] shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {castingStep === 1
                      ? tr(uiLanguage, 'Next: Radar & Stats', 'التالي: الرادار والطاقات')
                      : tr(uiLanguage, 'Next: Diamond Card', 'التالي: الكارت الألماظ')}
                  </span>
                  <NextIcon className="w-4 h-4" />
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
                      ? tr(uiLanguage, 'Stamping Diamond Card...', 'جاري ختم الكارت الألماظ...')
                      : tr(
                          uiLanguage,
                          'Certify & Issue Diamond Card',
                          `اعتماد ${starGender === 'female' ? 'النجمة' : 'النجم'} وإصدار الكارت`
                        )}
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
            <Fut3DTiltCard tier="DIAMOND" className="p-4 sm:p-5 text-[#F8FAFC]">
              <div className="flex items-center justify-between border-b border-[#38BDF8]/30 pb-2.5 mb-3 gap-2">
                <div className="min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDE68A] text-[#071324] font-typewriter text-[10px] font-black">
                    {tr(uiLanguage, 'EXCLUSIVE TALENT · DIAMOND', 'موهبة حصرية · كارت ألماظ')}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl text-[#FFFFFF] mt-1 truncate">
                    {revealedStar.name}
                  </h2>
                </div>
                <div className="shrink-0 text-center px-3 py-1.5 rounded-2xl bg-[#040B16]/90 border-2 border-[#FDE68A]">
                  <span className="font-typewriter text-2xl font-black text-[#FDE68A] block leading-none tabular-nums">
                    {revealedStar.stats.overall}
                  </span>
                  <span className="text-[9px] font-black tracking-widest text-[#7DD3FC]">
                    OVR
                  </span>
                </div>
              </div>

              <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-[#38BDF8]/80 mb-3 bg-[#040B16] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={revealedStar.image_url}
                  alt={revealedStar.name}
                  className="w-full h-full object-cover contrast-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040B16]/90 to-transparent" />
                <div className="absolute bottom-2.5 left-3 bg-[#040B16]/85 backdrop-blur-sm px-3 py-1 rounded-xl border border-[#FDE68A]/80">
                  <span className="font-ruqaa text-xl text-[#FDE68A] -rotate-2 block">
                    {revealedStar.autographSignature || revealedStar.name}
                  </span>
                </div>
              </div>

              {revealedStar.radarStats && (
                <div className="flex justify-center bg-[#040B16]/65 rounded-2xl p-2 border border-[#38BDF8]/35 mb-3">
                  <HexagonalRadarChartSvg
                    stats={revealedStar.radarStats}
                    size={160}
                    isDiamond
                    darkSurface
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FDE68A] to-[#D4AF37] text-[#071324] font-display text-base font-black shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {tr(
                    uiLanguage,
                    'Add to Casting Roster & Return',
                    'ضم للكاستينج والعودة للاستوديو'
                  )}
                </span>
              </button>
            </Fut3DTiltCard>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
