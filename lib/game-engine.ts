import { ActorItem, CrewItem, CompetitorStudio, GenreId } from './db-resolver';

export type MarketRegion = 'egypt' | 'gulf' | 'europe' | 'hollywood';
export type FounderPerk = 'visionary_director' | 'marketing_whale' | 'shark_negotiator';
export type ProjectFormat = 'film' | 'series';
export type SeriesEpisodes = 7 | 10 | 15 | 30;
export type SeriesSeason = 'ramadan' | 'off_season';
export type FilmReleaseSeason = 'eid_fitr' | 'eid_adha' | 'summer' | 'mid_year';
export type AgeRating = 'G' | '+12' | '+18';

/**
 * Formats large currency numbers using K, M, B, T suffixes.
 * Specifically ensures >= 1,000,000,000 renders as 1B / 1.25B instead of 1000M.
 */
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000_000) {
    const val = (abs / 1_000_000_000_000)
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
    return `${sign}${val}T`;
  }
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000)
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
    return `${sign}${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${val}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}K`;
  }
  return `${sign}${Math.round(abs)}`;
}

/**
 * Separates Studio Market Valuation (القيمة السوقية للشركة) from Liquid Treasury Cash (خزينة السيولة).
 * Market Value reflects IP library catalog value, brand reputation, festival awards, and 55% of liquid cash.
 */
export function calculateStudioMarketValue(params: {
  cash: number;
  reputation: number;
  releasedProjects: {
    totalGrossRevenue: number;
    netProfit: number;
    criticScore: number;
    awardsWon: string[];
  }[];
  marketValueModifier?: number;
  facilitiesLevels?: StudioFacilitiesLevels;
}): number {
  const {
    cash,
    reputation,
    releasedProjects,
    marketValueModifier = 0,
    facilitiesLevels,
  } = params;

  const baseBrandEquity = 68_000_000;
  const liquidCashWeight = Math.round(cash * 0.55);
  const reputationEquity = (reputation - 50) * 1_650_000;
  const physicalAssetsEquity = facilitiesLevels
    ? calculateFacilitiesBonuses(facilitiesLevels).physicalAssetsEquity
    : 0;

  let ipCatalogValue = 0;
  let totalAwards = 0;

  for (const proj of releasedProjects) {
    totalAwards += proj.awardsWon.length;
    if (proj.criticScore >= 7.6 && proj.netProfit > 0) {
      ipCatalogValue += Math.round(proj.totalGrossRevenue * 0.58);
    } else if (proj.criticScore >= 6.2) {
      ipCatalogValue += Math.round(proj.totalGrossRevenue * 0.32);
    } else if (proj.netProfit < -8_000_000) {
      // Heavy box-office bomb damages studio market valuation!
      ipCatalogValue -= 16_000_000;
    } else {
      ipCatalogValue += Math.round(proj.totalGrossRevenue * 0.12);
    }
  }

  const awardsPrestigeEquity = totalAwards * 12_500_000;

  return Math.max(
    25_000_000,
    Math.round(
      baseBrandEquity +
        liquidCashWeight +
        reputationEquity +
        physicalAssetsEquity +
        ipCatalogValue +
        awardsPrestigeEquity +
        marketValueModifier
    )
  );
}

// Genre Synergy Matrix
const SYNERGY_PAIRS: Record<string, number> = {
  'crime_mystery:psychological_horror': 18,
  'action:popular_drama': 16,
  'action:heist': 17,
  'sci_fi:action': 15,
  'sci_fi:psychological_horror': 14,
  'comedy:light_comedy': 15,
  'comedy:romance': 14,
  'light_comedy:romance': 16,
  'historical:biography': 18,
  'historical:action': 16,
  'supernatural_horror:psychological_horror': 17,
  'supernatural_horror:fantasy': 15,
  'superhero:action': 18,
  'superhero:sci_fi': 16,
  'heist:crime_mystery': 17,
  'popular_drama:romance': 14,
};

const CLASH_PAIRS: Record<string, number> = {
  'light_comedy:psychological_horror': -14,
  'light_comedy:supernatural_horror': -12,
  'biography:superhero': -15,
  'historical:sci_fi': -10,
  'popular_drama:sci_fi': -12,
};

export function calculateGenreSynergy(
  primary: GenreId,
  secondary: GenreId | null,
  directorVision = 75,
  writerPlot = 75
): {
  score: number;
  label: string;
  isHarmonious: boolean;
  isWeirdSavedByGenius: boolean;
} {
  if (!secondary || primary === secondary) {
    return {
      score: 5,
      label: 'تركيز درامي موحد (+5%)',
      isHarmonious: true,
      isWeirdSavedByGenius: false,
    };
  }

  const key1 = `${primary}:${secondary}`;
  const key2 = `${secondary}:${primary}`;
  const bonus = SYNERGY_PAIRS[key1] ?? SYNERGY_PAIRS[key2];
  if (bonus !== undefined) {
    return {
      score: bonus,
      label: `تناغم قوي بين التصنيفين (+${bonus}%)`,
      isHarmonious: true,
      isWeirdSavedByGenius: false,
    };
  }

  const clash = CLASH_PAIRS[key1] ?? CLASH_PAIRS[key2];
  if (clash !== undefined) {
    if (directorVision >= 90 && writerPlot >= 90) {
      return {
        score: 20,
        label: 'خلطة جريئة وغريبة أنقذتها عبقرية الإخراج (+20%)',
        isHarmonious: true,
        isWeirdSavedByGenius: true,
      };
    }
    return {
      score: clash,
      label: `تنافر خطير في التصنيفات يضعف مصداقية الفيلم (${clash}%)`,
      isHarmonious: false,
      isWeirdSavedByGenius: false,
    };
  }

  return {
    score: 8,
    label: 'مزيج متوازن ومقبول جماهيرياً (+8%)',
    isHarmonious: true,
    isWeirdSavedByGenius: false,
  };
}

export function getCardTierClass(overall: number): {
  tierName: string;
  badgeText: string;
  borderClass: string;
  bgGradient: string;
  textColor: string;
} {
  if (overall >= 90) {
    return {
      tierName: 'MYTHIC',
      badgeText: 'سوبر ستار شباك أول',
      borderClass:
        'border-violet-400 border-b-4 border-b-violet-500 shadow-[0_14px_34px_-8px_rgba(124,58,237,0.22)]',
      bgGradient: 'from-[#F5F3FF] via-white to-[#ECFEFF]',
      textColor: 'text-violet-700',
    };
  }
  if (overall >= 80) {
    return {
      tierName: 'ELITE',
      badgeText: 'نجم صف أول',
      borderClass:
        'border-cyan-400 border-b-4 border-b-cyan-500 shadow-[0_12px_28px_-8px_rgba(6,182,212,0.18)]',
      bgGradient: 'from-[#ECFEFF] via-white to-[#F0F9FF]',
      textColor: 'text-cyan-700',
    };
  }
  if (overall >= 70) {
    return {
      tierName: 'PRO',
      badgeText: 'محترف متمرس',
      borderClass:
        'border-indigo-200 border-b-4 border-b-indigo-300 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.12)]',
      bgGradient: 'from-[#EEF2FF] via-white to-slate-50',
      textColor: 'text-indigo-700',
    };
  }
  return {
    tierName: 'RISING',
    badgeText: 'موهبة صاعدة',
    borderClass:
      'border-rose-300 border-b-4 border-b-rose-400 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.12)]',
    bgGradient: 'from-[#FFF1F2] via-white to-[#FFF7ED]',
    textColor: 'text-rose-600',
  };
}

export interface CastChemistryResult {
  egoClashRisk: number;
  highEgoStars: string[];
  hasSevereClash: boolean;
  chemistryScore: number;
  warningMessage: string | null;
}

export function evaluateCastChemistry(
  cast: ActorItem[],
  directorControl = 80
): CastChemistryResult {
  const highEgoActors = cast.filter((a) => a.stats.ego >= 90);
  const highEgoNames = highEgoActors.map((a) => a.name);

  if (highEgoActors.length >= 2) {
    const rawRisk = Math.min(
      98,
      55 +
        (highEgoActors.length - 1) * 25 -
        Math.max(0, directorControl - 80)
    );
    return {
      egoClashRisk: rawRisk,
      highEgoStars: highEgoNames,
      hasSevereClash: true,
      chemistryScore: Math.max(40, 90 - rawRisk / 2),
      warningMessage: `تحذير: اجتماع (${highEgoNames.join(
        ' و '
      )}) بغرور فوق 90 قد يثير خلافات في اللوكيشن حول ترتيب الأسماء على التتر!`,
    };
  }

  return {
    egoClashRisk: highEgoActors.length === 1 ? 20 : 5,
    highEgoStars: highEgoNames,
    hasSevereClash: false,
    chemistryScore: Math.min(98, 78 + Math.round(directorControl / 5)),
    warningMessage: null,
  };
}

export interface ContractOffer {
  baseSalary: number;
  backendPoints: number;
  vipDinnerDiscountApplied?: boolean;
}

export function calculateNegotiatedSalary(
  originalSalary: number,
  backendPoints: number,
  founderPerk: FounderPerk,
  vipDinnerDiscount: boolean
): number {
  let salary = originalSalary;
  const backendDiscount = Math.min(0.3, backendPoints * 0.025);
  salary = salary * (1 - backendDiscount);

  if (founderPerk === 'shark_negotiator') {
    salary = salary * 0.85;
  }
  if (vipDinnerDiscount) {
    salary = salary * 0.8;
  }
  return Math.round(salary);
}

/**
 * Calculates the realistic minimum salary a star/director expects given studio reputation,
 * their ego, and how well they fit the movie's primary genre.
 */
export function calculateTalentExpectedSalary(params: {
  baseSalary: number;
  ego: number;
  genreMasteryScore: number;
  studioReputation: number;
  isCameo?: boolean;
}): {
  expectedMinimumSalary: number;
  idealSalary: number;
  acceptanceDifficultyLabel: string;
} {
  const { baseSalary, ego, genreMasteryScore, studioReputation, isCameo } =
    params;
  const rawBase = isCameo ? Math.round(baseSalary * 0.22) : baseSalary;

  const egoMultiplier =
    ego >= 92 ? 1.18 : ego >= 85 ? 1.1 : ego >= 75 ? 1.02 : 0.94;
  const repPenalty =
    studioReputation < 60 ? 1.15 : studioReputation < 75 ? 1.06 : 0.96;
  const genreFactor =
    genreMasteryScore >= 88 ? 0.95 : genreMasteryScore < 75 ? 1.18 : 1.04;

  const expectedMinimumSalary = Math.round(
    rawBase * egoMultiplier * repPenalty * genreFactor
  );
  const idealSalary = Math.round(expectedMinimumSalary * 1.12);

  const acceptanceDifficultyLabel =
    ego >= 90 || genreMasteryScore < 75
      ? 'مفاوضات صعبة جداً (يشترط تقدير مالي وسيناريو قوي)'
      : ego >= 80
      ? 'مفاوضات متوسطة الصعوبة'
      : 'مرن ومتحمس للتجربة';

  return {
    expectedMinimumSalary,
    idealSalary,
    acceptanceDifficultyLabel,
  };
}

export interface MarketConfigInfo {
  id: MarketRegion;
  name: string;
  badge: string;
  unlockMarketValue: number;
  earlyLicenseCost: number;
  distributionFeePerProject: number;
  revenueBonusFactor: number;
  description: string;
}

export const MARKET_CONFIGS: MarketConfigInfo[] = [
  {
    id: 'egypt',
    name: 'السوق المصري والمحلي',
    badge: 'السوق الأساسي',
    unlockMarketValue: 0,
    earlyLicenseCost: 0,
    distributionFeePerProject: 0,
    revenueBonusFactor: 1.0,
    description: 'قاعات العرض السينمائي في القاهرة والمحافظات والمنصات المحلية.',
  },
  {
    id: 'gulf',
    name: 'سوق الخليج العربي والشام',
    badge: '+45% إيرادات إضافية',
    unlockMarketValue: 220_000_000,
    earlyLicenseCost: 25_000_000,
    distributionFeePerProject: 6_000_000,
    revenueBonusFactor: 0.45,
    description: 'توزيع واسع في دور العرض الخليجية والعربية بعوائد تذاكر مرتفعة.',
  },
  {
    id: 'europe',
    name: 'سوق أوروبا والمغرب العربي',
    badge: '+75% إيرادات إضافية',
    unlockMarketValue: 450_000_000,
    earlyLicenseCost: 55_000_000,
    distributionFeePerProject: 14_000_000,
    revenueBonusFactor: 0.75,
    description: 'ترجمة ودبلجة وتوزيع في العواصم الأوروبية وشمال أفريقيا والمهرجانات.',
  },
  {
    id: 'hollywood',
    name: 'التوزيع العالمي وأمريكا الشمالية',
    badge: '+135% إيرادات عالمية',
    unlockMarketValue: 850_000_000,
    earlyLicenseCost: 110_000_000,
    distributionFeePerProject: 28_000_000,
    revenueBonusFactor: 1.35,
    description: 'طرح دولي شامل في القاعات العالمية وشبكات البث الدولية الكبرى.',
  },
];

export interface ProductionBudgetAllocation {
  setsAndLocations: number;
  costumesAndMakeup: number;
  vfxAndStunts: number;
  extrasAndCrowds: number;
}

export interface RivalRelease {
  id: string;
  studioName: string;
  title: string;
  leadStarName: string;
  directorName?: string;
  format?: ProjectFormat;
  genre: GenreId;
  criticScore: number;
  audienceScore: number;
  boxOfficeRevenue: number;
  status?: 'released' | 'delayed';
  delayReason?: string;
  year?: number;
}

const RIVAL_FILM_TITLES: Record<GenreId, string[]> = {
  action: [
    'الرصاصة الأخيرة في الميناء',
    'أسد الكنانة',
    'عملية الفجر الأسود',
    'حيتان الأسفلت',
    'المهمة المستحيلة في الصحراء',
    'شفرة العقرب',
  ],
  popular_drama: [
    'ملوك الحارة القديمة',
    'سلطان الغلابة',
    'دموع الأصول',
    'حارة الجدعان',
    'المعلم الكبير',
    'سوق الذهب',
  ],
  comedy: [
    'إفلاس خمس نجوم',
    'معالي الوزير بالصدفة',
    'جمعية المنتفعين',
    'خطة نص الليل',
    'ورثة الملياردير',
  ],
  light_comedy: [
    'عريس تحت التمرين',
    'إجازة في الساحل',
    'عائلة هاي كلاس',
    'جوازة في الكواليس',
    'شهر عسل مفاجئ',
  ],
  psychological_horror: [
    'الغرفة رقم 9',
    'همس المرايا',
    'متاهة العقل',
    'الظل الآخر',
    'هلاوس منتصف الليل',
  ],
  supernatural_horror: [
    'عهد الرصد',
    'قصر البارون الملعون',
    'خاتم الجان',
    'بوابة الأسرار',
    'لعنة البردية',
  ],
  crime_mystery: [
    'لغز جريمة الزمالك',
    'الشاهد الصامت',
    'ملف القضية 404',
    'تحقيقات منتصف الليل',
    'البصمة المفقودة',
  ],
  sci_fi: [
    'القاهرة 2099',
    'النسخة الأخيرة',
    'ما وراء الزمن',
    'المدار المفقود',
    'بوابة المستقبل',
  ],
  romance: [
    'شتاء في الإسكندرية',
    'موعد على النيل',
    'رسائل لم تقرأ',
    'أيام الوعد',
    'قصة حب في الزمالك',
  ],
  historical: [
    'فرسان المحروسة',
    'عهد المماليك',
    'معركة الكرامة',
    'رايات النصر',
    'قلعة السلاطين',
  ],
  biography: [
    'أسطورة الفن',
    'رحلة العبقري',
    'صوت الخلود',
    'مذكرات الزمن الجميل',
  ],
  heist: [
    'خزينة البنك المركزي',
    'سرقة القرن',
    'خطة الشبح',
    'الشفرة الماسية',
    'العملية 99',
  ],
  fantasy: [
    'مملكة النيل المفقودة',
    'حارس البوابة القديمة',
    'أسطورة العنقاء',
    'جزيرة السحر',
  ],
  superhero: [
    'الظل القرمزي',
    'حامي المدينة',
    'البرق الأسود',
    'درع العدالة',
  ],
};

const FICTIONAL_RIVAL_DIRECTORS = [
  'مروان حافظ',
  'شريف علام',
  'تامر محسن الزيادي',
  'نديم العسكري',
  'بطرس فهمي',
  'كاملة الذكري',
  'ياسين التاجي',
  'حاتم البنداري',
];

/**
 * Generates realistic rival releases:
 * - Not all studios release at the same time as the player (only 2 to 3 studios release in the same window).
 * - Postponement is rare (~15% chance) instead of happening every season.
 * - Strong rival studios build high-quality blockbusters (52M - 115M EGP, critic 7.5 - 8.9) that can beat the player and win Annual Awards!
 */
export function generateRivalReleases(
  competitors: CompetitorStudio[],
  availableActors: ActorItem[],
  excludeActorIds: string[],
  seasonMultiplier = 1.0,
  seedOffset = 1,
  format: ProjectFormat = 'film'
): RivalRelease[] {
  const freeActors = availableActors.filter(
    (a) =>
      !excludeActorIds.includes(a.id) &&
      a.status !== 'retired' &&
      a.status !== 'deceased'
  );
  const pool = freeActors.length >= 4 ? freeActors : availableActors;

  // Rotate which studios release in this specific window so not all studios release at once
  const rotatedCompetitors = [...competitors].sort((a, b) => {
    const hashA = (a.market_power * 17 + seedOffset * 37) % 101;
    const hashB = (b.market_power * 17 + seedOffset * 37) % 101;
    return hashB - hashA;
  });

  // Only 2 or 3 studios release alongside the player in a single season window
  const releaseCount = 2 + (seedOffset % 2); // 2 or 3 studios
  const rareDelayHappens = seedOffset % 6 === 0; // Only ~16% of seasons have a delayed rival film

  return rotatedCompetitors.slice(0, releaseCount).map((comp, idx) => {
    const genre = (comp.preferred_genres[
      (idx + seedOffset) % comp.preferred_genres.length
    ] || 'action') as GenreId;
    const titles = RIVAL_FILM_TITLES[genre] || RIVAL_FILM_TITLES.action;
    const title = titles[(idx + seedOffset) % titles.length];
    const actor = pool[(idx * 3 + seedOffset) % pool.length];
    const directorName =
      FICTIONAL_RIVAL_DIRECTORS[
        (idx + seedOffset) % FICTIONAL_RIVAL_DIRECTORS.length
      ];

    const isDelayed = rareDelayHappens && idx === releaseCount - 1;
    if (isDelayed) {
      return {
        id: `rival_${comp.id}_${seedOffset}_${idx}`,
        studioName: comp.name,
        title,
        leadStarName: actor ? actor.name : 'نجم شباك منافس',
        directorName,
        format,
        genre,
        criticScore: 0,
        audienceScore: 0,
        boxOfficeRevenue: 0,
        status: 'delayed',
        delayReason:
          'قررت الشركة تأجيل الطرح للموسم القادم لاستكمال المونتاج وتجنب زحام القاعات',
      };
    }

    const powerFactor =
      (comp.market_power * 0.58 +
        (actor?.stats.box_office_pull || 82) * 0.42) /
      100;

    // idx === 0 is a powerful rival studio release (7.5 - 8.9 critic score, 52M - 108M revenue)
    // idx === 1 is a solid competitive release (6.8 - 8.1 critic score, 30M - 68M revenue)
    // idx === 2 is a moderate or experimental release (5.8 - 7.3 critic score, 16M - 38M revenue)
    const tierOffset = idx === 0 ? 1.15 : idx === 1 ? 0.45 : -0.45;
    const criticScore = Number(
      Math.min(
        8.9,
        Math.max(5.2, 6.1 + powerFactor * 1.9 + tierOffset)
      ).toFixed(1)
    );
    const audienceScore = Number(
      Math.min(
        9.2,
        Math.max(5.4, criticScore + (idx === 0 ? 0.3 : -0.1))
      ).toFixed(1)
    );

    const baseRev =
      idx === 0
        ? Math.round((48_000_000 + powerFactor * 54_000_000) * seasonMultiplier)
        : idx === 1
        ? Math.round((28_000_000 + powerFactor * 36_000_000) * seasonMultiplier)
        : Math.round((15_000_000 + powerFactor * 22_000_000) * seasonMultiplier);

    return {
      id: `rival_${comp.id}_${seedOffset}_${idx}`,
      studioName: comp.name,
      title,
      leadStarName: actor ? actor.name : 'نجم شباك منافس',
      directorName,
      format,
      genre,
      criticScore,
      audienceScore,
      boxOfficeRevenue: baseRev,
      status: 'released',
    };
  });
}

export type StudioFacilityId =
  | 'soundstage'
  | 'camera_rig'
  | 'vfx_tower'
  | 'audio_stage'
  | 'marketing_hub';

export type StudioFacilitiesLevels = Record<StudioFacilityId, number>;

export const DEFAULT_FACILITIES_LEVELS: StudioFacilitiesLevels = {
  soundstage: 1,
  camera_rig: 1,
  vfx_tower: 1,
  audio_stage: 1,
  marketing_hub: 1,
};

export interface StudioFacilityConfig {
  id: StudioFacilityId;
  name: string;
  shortLabel: string;
  categoryLabel: string;
  maxLevel: number;
  baseUpgradeCost: number;
  description: string;
  levelTitles: [string, string, string, string, string];
  impactSummary: (level: number) => string;
}

export const STUDIO_FACILITY_CONFIGS: StudioFacilityConfig[] = [
  {
    id: 'soundstage',
    name: 'البلاتوه السينمائي الرئيسي',
    shortLabel: 'البلاتوه',
    categoryLabel: 'مبنى تصوير',
    maxLevel: 5,
    baseUpgradeCost: 14_000_000,
    description:
      'قاعات التصوير المغلقة والديكورات الهيدروليكية؛ تطويرها يرفع الجودة الفنية ويقلل احتمالات تعطل التصوير.',
    levelTitles: [
      'هنغر تصوير تقليدي',
      'بلاتوه معزول صوتياً',
      'مجمع بلاتوهات مزدوج',
      'مدينة ديكورات هيدروليكية',
      'البلاتوه الإمبراطوري الذكي',
    ],
    impactSummary: (lvl) =>
      `+${lvl * 3} جودة إنتاج أساسية · -${lvl * 8}% مخاطر أزمات التصوير`,
  },
  {
    id: 'camera_rig',
    name: 'أسطول كاميرات IMAX والدرون',
    shortLabel: 'الكاميرات',
    categoryLabel: 'معدات تصوير',
    maxLevel: 5,
    baseUpgradeCost: 12_000_000,
    description:
      'رافعات التكنوكرين، عدسات الأنالمورفيك، وطائرات الدرون السينمائية التي تضاعف إبهار الصورة وإقبال الأسبوع الأول.',
    levelTitles: [
      'كاميرات ديجيتال قياسية',
      'عدسات سينمائية 4K + دوللي',
      'رافعة تكنوكرين + كاميرات 8K',
      'أسطول درون سينمائي + عدسات أنامورفيك',
      'منظومة IMAX Laser 3D الكاملة',
    ],
    impactSummary: (lvl) =>
      `+${lvl * 2.5} إبهار بصري · +${lvl * 5}% إيرادات الأسبوع الافتتاحي`,
  },
  {
    id: 'vfx_tower',
    name: 'برج الخدع البصرية والمونتاج',
    shortLabel: 'الخدع VFX',
    categoryLabel: 'مبنى تقني',
    maxLevel: 5,
    baseUpgradeCost: 16_000_000,
    description:
      'محطات الريندر وشاشات الإنتاج الافتراضي LED Volume والأمن السيبراني لحماية نسخ الأفلام من التسريب.',
    levelTitles: [
      'وحدة مونتاج أولية',
      'معمل تصحيح ألوان وخدع 2D',
      'برج محاكاة CGI وأمن رقمي ضد التسريب',
      'استوديو شاشات افتراضية LED Volume',
      'مركز الحوسبة السينمائية الفائقة',
    ],
    impactSummary: (lvl) =>
      `+${(lvl * 0.22).toFixed(1)} تقييم نقاد · حماية ضد تسريب النسخ`,
  },
  {
    id: 'audio_stage',
    name: 'قاعة الصوت والموسيقى Dolby Atmos',
    shortLabel: 'الصوتيات',
    categoryLabel: 'مبنى صوتي',
    maxLevel: 5,
    baseUpgradeCost: 11_000_000,
    description:
      'مسرح تسجيل الأوركسترا الحية ومكساج الصوت المحيطي ثلاثي الأبعاد لرفع تقييم الجمهور وعقود المنصات.',
    levelTitles: [
      'غرفة مكساج ستيريو',
      'استوديو دوبلاج ومؤثرات صوتية',
      'قاعة مكساج محيطي 7.1',
      'مسرح تسجيل أوركسترا سينمائي',
      'قبة Dolby Atmos الاحترافية',
    ],
    impactSummary: (lvl) =>
      `+${(lvl * 0.2).toFixed(1)} تقييم جمهور · +${lvl * 7}% قيمة عقود المنصات`,
  },
  {
    id: 'marketing_hub',
    name: 'جناح التسويق والسجادة الحمراء',
    shortLabel: 'التسويق',
    categoryLabel: 'مقر إعلامي',
    maxLevel: 5,
    baseUpgradeCost: 13_000_000,
    description:
      'ساحة العروض الخاصة وكشافات السماء وأبراج العلاقات العامة التي ترفع الضجة الإعلامية وتسهّل التفاوض مع النجوم.',
    levelTitles: [
      'مكتب علاقات عامة صغير',
      'قاعة مؤتمرات صحفية',
      'ساحة عرض خاص وكشافات سينمائية',
      'مركز إعلامي رقمي ومنصة نجوم',
      'قصر السجادة الحمراء والمهرجانات',
    ],
    impactSummary: (lvl) =>
      `+${lvl * 5} ضجة إعلامية (Hype) · -${lvl * 2.5}% من مطالب أجور النجوم`,
  },
];

export function getFacilityUpgradeCost(
  facilityId: StudioFacilityId,
  currentLevel: number
): number {
  const cfg = STUDIO_FACILITY_CONFIGS.find((f) => f.id === facilityId);
  if (!cfg || currentLevel >= cfg.maxLevel) return 0;
  return Math.round(cfg.baseUpgradeCost * Math.pow(1.55, currentLevel - 1));
}

export function calculateFacilitiesBonuses(
  levels: StudioFacilitiesLevels = DEFAULT_FACILITIES_LEVELS
) {
  const s = levels.soundstage || 1;
  const c = levels.camera_rig || 1;
  const v = levels.vfx_tower || 1;
  const a = levels.audio_stage || 1;
  const m = levels.marketing_hub || 1;

  const totalLevels = s + c + v + a + m; // 5 .. 25
  const qualityBonus = (s - 1) * 3 + (c - 1) * 2.5 + (v - 1) * 2;
  const openingWeekMultiplier = 1 + (c - 1) * 0.05;
  const criticScoreBonus = (v - 1) * 0.22 + (s - 1) * 0.1;
  const audienceScoreBonus = (a - 1) * 0.2 + (c - 1) * 0.12;
  const streamingDealMultiplier = 1 + (a - 1) * 0.07;
  const baseHypeBonus = (m - 1) * 5;
  const salaryDiscountFraction = Math.min(0.12, (m - 1) * 0.025);
  const leakProtectionActive = v >= 3;
  const physicalAssetsEquity =
    (s - 1) * 18_000_000 +
    (c - 1) * 15_000_000 +
    (v - 1) * 22_000_000 +
    (a - 1) * 14_000_000 +
    (m - 1) * 16_000_000;

  return {
    totalLevels,
    qualityBonus,
    openingWeekMultiplier,
    criticScoreBonus,
    audienceScoreBonus,
    streamingDealMultiplier,
    baseHypeBonus,
    salaryDiscountFraction,
    leakProtectionActive,
    physicalAssetsEquity,
  };
}

export interface SimulationTwistEvent {
  id: string;
  title: string;
  description: string;
  impactType: 'positive' | 'mixed' | 'negative';
  boxOfficeMultiplier: number;
  streamingMultiplier: number;
  criticDelta: number;
  audienceDelta: number;
}

/**
 * Diversified, probabilistic simulation engine with Studio 3D Facilities,
 * Genre Fatigue/Freshness Waves, and Unpredictable Market Twists so no single static formula wins every time.
 */
export function calculateFinancialsAndQuality(params: {
  format: ProjectFormat;
  episodes?: SeriesEpisodes;
  seriesSeason?: SeriesSeason;
  filmSeason?: FilmReleaseSeason;
  primaryGenre: GenreId;
  secondaryGenre: GenreId | null;
  ageRating: AgeRating;
  director: CrewItem;
  writers: CrewItem[];
  dop: CrewItem | null;
  composer: CrewItem | null;
  vfx: CrewItem | null;
  leads: ActorItem[];
  antagonist: ActorItem | null;
  supporting: ActorItem[];
  cameos: ActorItem[];
  budgetAllocation: ProductionBudgetAllocation;
  marketingBudget: number;
  screensCount: number;
  platformDealAmount: number;
  founderPerk: FounderPerk;
  hypeScore: number;
  aiBoxOfficeMultiplier: number;
  marketRegion: MarketRegion;
  selectedDistributionMarkets?: MarketRegion[];
  scriptWordCount?: number;
  facilitiesLevels?: StudioFacilitiesLevels;
  previousGenres?: GenreId[];
  entropySeed?: number;
}): {
  technicalQuality: number;
  starPower: number;
  firstWeekRevenue: number;
  totalBoxOfficeRevenue: number;
  totalStreamingRevenue: number;
  totalGrossRevenue: number;
  distributionFeesTotal: number;
  marketRevenueBreakdown: Record<MarketRegion, number>;
  simulationTwists: SimulationTwistEvent[];
  criticDeltaFromTwists: number;
  audienceDeltaFromTwists: number;
} {
  const {
    format,
    filmSeason,
    seriesSeason,
    primaryGenre,
    secondaryGenre,
    ageRating,
    director,
    writers,
    dop,
    composer,
    vfx,
    leads,
    antagonist,
    supporting,
    cameos,
    budgetAllocation,
    marketingBudget,
    screensCount,
    platformDealAmount,
    founderPerk,
    hypeScore,
    aiBoxOfficeMultiplier,
    marketRegion,
    selectedDistributionMarkets,
    scriptWordCount = 20,
    facilitiesLevels = DEFAULT_FACILITIES_LEVELS,
    previousGenres = [],
    entropySeed,
  } = params;

  const facilities = calculateFacilitiesBonuses(facilitiesLevels);

  const synergy = calculateGenreSynergy(
    primaryGenre,
    secondaryGenre,
    director.stats.vision,
    writers[0]?.stats.plot_strength || 75
  );

  const dopScore = dop ? dop.stats.overall : 42;
  const compScore = composer ? composer.stats.overall : 44;
  const vfxScore = vfx ? vfx.stats.overall : 40;

  const leadActing =
    leads.length > 0
      ? leads.reduce((acc, l) => {
          const mastery = l.genre_mastery[primaryGenre] ?? 62;
          return acc + l.stats.acting * 0.6 + mastery * 0.4;
        }, 0) / leads.length
      : 48;

  const directorGenreFit = director.best_genres.includes(primaryGenre) ? 5 : -6;

  const antagBonus = antagonist
    ? (antagonist.stats.acting * 0.5 + antagonist.stats.charisma * 0.5 - 68) *
      0.3
    : -6;

  const scriptBonus =
    scriptWordCount >= 22 ? 5 : scriptWordCount >= 12 ? 1 : -12;

  const prodSpendTotal =
    budgetAllocation.setsAndLocations +
    budgetAllocation.costumesAndMakeup +
    budgetAllocation.vfxAndStunts +
    budgetAllocation.extrasAndCrowds;

  const prodBonus =
    prodSpendTotal < 14_000_000
      ? -10
      : prodSpendTotal < 22_000_000
      ? -2
      : Math.min(8, (prodSpendTotal - 22_000_000) / 6_000_000);

  let rawQuality =
    director.stats.overall * 0.31 +
    leadActing * 0.27 +
    dopScore * 0.14 +
    compScore * 0.12 +
    vfxScore * 0.14 +
    synergy.score * 0.42 +
    directorGenreFit +
    antagBonus +
    scriptBonus +
    prodBonus +
    facilities.qualityBonus;

  if (founderPerk === 'visionary_director') {
    rawQuality *= 1.05;
  }

  const technicalQuality = Math.min(96, Math.max(28, Math.round(rawQuality)));

  const leadPull =
    leads.length > 0
      ? Math.max(...leads.map((l) => l.stats.box_office_pull))
      : 45;
  const supportPull =
    supporting.length > 0
      ? supporting.reduce((s, a) => s + a.stats.box_office_pull, 0) /
        supporting.length
      : 45;
  const cameoBoost = cameos.length * 2.5;

  const starPower = Math.min(
    96,
    Math.round(
      leadPull * 0.6 +
        supportPull * 0.22 +
        (antagonist?.stats.charisma || 52) * 0.18 +
        cameoBoost
    )
  );

  // Probabilistic Twists & Genre Fatigue / Freshness Wave
  const simulationTwists: SimulationTwistEvent[] = [];

  // 1. Check Genre Repetition vs Market Freshness
  const recentTwo = previousGenres.slice(0, 2);
  const repeatedSameGenreCount = recentTwo.filter((g) => g === primaryGenre).length;
  if (repeatedSameGenreCount >= 2) {
    simulationTwists.push({
      id: 'genre_fatigue',
      title: 'تشبّع الجمهور من تكرار التصنيف الدرامي',
      description:
        'طرح الاستوديو لعدة أعمال متتالية من نفس التصنيف أدى لفتور جزء من الجمهور وتوقعه للحبكة مسبقاً.',
      impactType: 'negative',
      boxOfficeMultiplier: 0.82,
      streamingMultiplier: 0.88,
      criticDelta: -0.45,
      audienceDelta: -0.35,
    });
  } else if (previousGenres.length > 0 && !recentTwo.includes(primaryGenre)) {
    simulationTwists.push({
      id: 'genre_fresh_wave',
      title: 'موجة عطش جماهيري للتجديد الدرامي',
      description:
        'تغيير بوصلة الاستوديو نحو تصنيف مختلف فاجأ السوق إيجابياً وجذب شريحة جديدة من المشاهدين.',
      impactType: 'positive',
      boxOfficeMultiplier: 1.14,
      streamingMultiplier: 1.12,
      criticDelta: 0.25,
      audienceDelta: 0.3,
    });
  }

  // 2. Roll dynamic unpredictable event based on entropy seed (only when entropySeed is provided or in live gameplay)
  if (typeof entropySeed === 'number') {
    const roll = Math.abs(Math.sin(entropySeed * 12.9898 + technicalQuality * 78.233)) % 1;

    if (roll < 0.22) {
      simulationTwists.push({
        id: 'viral_sleeper_hit',
        title: 'انفجار ترند عضوي غير متوقع على المنصات',
        description:
          'تداول الجمهور مقاطع مؤثرة وحوارات من العمل بشكل عفوي كثيف، مما ضاعف الإقبال في الأسابيع التالية.',
        impactType: 'positive',
        boxOfficeMultiplier: 1.26,
        streamingMultiplier: 1.28,
        criticDelta: 0.15,
        audienceDelta: 0.55,
      });
    } else if (roll < 0.42) {
      simulationTwists.push({
        id: 'critic_audience_split',
        title: 'انقسام وجدل واسع بين النقاد والجمهور',
        description:
          'أثار أسلوب الإخراج جدلاً حاداً في البرامج الفنية؛ تحفظ بعض النقاد بينما تدفق الجمهور بدافع الفضول.',
        impactType: 'mixed',
        boxOfficeMultiplier: 1.12,
        streamingMultiplier: 1.15,
        criticDelta: -0.4,
        audienceDelta: 0.45,
      });
    } else if (roll < 0.62 && (facilitiesLevels.soundstage >= 2 || facilitiesLevels.camera_rig >= 2)) {
      simulationTwists.push({
        id: 'improvised_masterpiece',
        title: 'مشهد ذروة مرتجل في البلاتوه يخطف الأنفاس',
        description:
          'بفضل جاهزية البلاتوه والكاميرات، ارتجل الأبطال مشهداً استثنائياً أشاد به النقاد كأفضل لقطة في الموسم.',
        impactType: 'positive',
        boxOfficeMultiplier: 1.16,
        streamingMultiplier: 1.18,
        criticDelta: 0.6,
        audienceDelta: 0.5,
      });
    } else if (roll < 0.8) {
      if (facilities.leakProtectionActive) {
        simulationTwists.push({
          id: 'leak_foiled_buzz',
          title: 'إحباط محاولة قرصنة بفضل برج الأمن الرقمي',
          description:
            'تصدى برج الخدع والأمن السيبراني لمحاولة تسريب النسخة الأصلية، مما خلق تعاطفاً وضجة إيجابية كبرى قبل العرض.',
          impactType: 'positive',
          boxOfficeMultiplier: 1.11,
          streamingMultiplier: 1.1,
          criticDelta: 0.1,
          audienceDelta: 0.25,
        });
      } else {
        simulationTwists.push({
          id: 'piracy_leak_hit',
          title: 'تسريب مقاطع مصورة قبل العرض الرسمي',
          description:
            'تسببت ثغرة في غرفة المونتاج بتسريب مشاهد مهمة قبل الطرح (طوّر برج الخدع للمستوى 3 لمنع التسريبات مستقبلاً).',
          impactType: 'negative',
          boxOfficeMultiplier: 0.86,
          streamingMultiplier: 0.9,
          criticDelta: -0.1,
          audienceDelta: -0.25,
        });
      }
    } else {
      simulationTwists.push({
        id: 'weather_streaming_shift',
        title: 'تحول مفاجئ في سلوك المشاهدة الأسبوعي',
        description:
          'تذبذب إقبال القاعات في الأيام الأولى بسبب تقلبات الطقس والامتحانات، لكن العمل عوّض بقوة في البث الرقمي والعطلة.',
        impactType: 'mixed',
        boxOfficeMultiplier: 0.93,
        streamingMultiplier: 1.24,
        criticDelta: 0.2,
        audienceDelta: 0.15,
      });
    }
  }

  const twistBoxOfficeMult = simulationTwists.reduce(
    (acc, t) => acc * t.boxOfficeMultiplier,
    1.0
  );
  const twistStreamingMult = simulationTwists.reduce(
    (acc, t) => acc * t.streamingMultiplier,
    1.0
  );
  const criticDeltaFromTwists =
    facilities.criticScoreBonus +
    simulationTwists.reduce((acc, t) => acc + t.criticDelta, 0);
  const audienceDeltaFromTwists =
    facilities.audienceScoreBonus +
    simulationTwists.reduce((acc, t) => acc + t.audienceDelta, 0);

  // Determine active distribution markets
  const activeMarkets: MarketRegion[] =
    selectedDistributionMarkets && selectedDistributionMarkets.length > 0
      ? Array.from(new Set(['egypt' as MarketRegion, ...selectedDistributionMarkets]))
      : marketRegion === 'hollywood'
      ? ['egypt', 'gulf', 'europe', 'hollywood']
      : marketRegion === 'europe'
      ? ['egypt', 'gulf', 'europe']
      : marketRegion === 'gulf'
      ? ['egypt', 'gulf']
      : ['egypt'];

  let distributionFeesTotal = 0;
  let totalMarketMultiplier = 0;

  for (const mId of activeMarkets) {
    const cfg = MARKET_CONFIGS.find((c) => c.id === mId);
    if (cfg) {
      distributionFeesTotal += cfg.distributionFeePerProject;
      totalMarketMultiplier += cfg.revenueBonusFactor;
    }
  }

  const ageMultiplier =
    ageRating === 'G' ? 1.06 : ageRating === '+18' ? 0.74 : 1.0;

  const seasonBoost =
    format === 'film'
      ? filmSeason === 'eid_adha'
        ? 1.15
        : filmSeason === 'eid_fitr'
        ? 1.12
        : filmSeason === 'summer'
        ? 1.02
        : 0.84
      : seriesSeason === 'ramadan'
      ? 1.18
      : 0.9;

  const effectiveHype = hypeScore + facilities.baseHypeBonus;
  const marketingFactor = 0.52 + Math.min(0.62, marketingBudget / 34_000_000);
  const screensFactor =
    format === 'film'
      ? Math.max(0.4, Math.min(1.18, screensCount / 150))
      : 1.0;
  const hypeFactor = Math.max(0.55, 0.7 + (effectiveHype - 55) / 160);

  const wordOfMouthFactor =
    technicalQuality >= 84
      ? 1.18
      : technicalQuality >= 75
      ? 0.88
      : technicalQuality >= 65
      ? 0.58
      : technicalQuality >= 54
      ? 0.35
      : 0.18;

  const singleMarketBaseGross =
    format === 'film'
      ? (starPower * 195_000 + technicalQuality * 170_000) *
        seasonBoost *
        marketingFactor *
        screensFactor *
        ageMultiplier *
        hypeFactor *
        wordOfMouthFactor *
        aiBoxOfficeMultiplier *
        twistBoxOfficeMult
      : 0;

  const baseGross = singleMarketBaseGross * totalMarketMultiplier;

  let firstWeekRevenue = Math.round(
    baseGross * 0.38 * facilities.openingWeekMultiplier
  );
  if (founderPerk === 'marketing_whale') {
    firstWeekRevenue = Math.round(firstWeekRevenue * 1.08);
  }

  const totalBoxOfficeRevenue =
    format === 'film' ? Math.round(firstWeekRevenue + baseGross * 0.62) : 0;

  const platformQualityFactor =
    technicalQuality >= 78
      ? 0.92
      : technicalQuality >= 66
      ? 0.68
      : technicalQuality >= 55
      ? 0.45
      : 0.25;

  const totalStreamingRevenue = Math.round(
    (platformDealAmount *
      platformQualityFactor *
      facilities.streamingDealMultiplier +
      (format === 'series'
        ? (starPower * 165_000 + technicalQuality * 155_000) *
          seasonBoost *
          marketingFactor *
          wordOfMouthFactor *
          aiBoxOfficeMultiplier *
          totalMarketMultiplier
        : totalBoxOfficeRevenue * 0.12)) *
      twistStreamingMult
  );

  const totalGrossRevenue = totalBoxOfficeRevenue + totalStreamingRevenue;

  const marketRevenueBreakdown: Record<MarketRegion, number> = {
    egypt: 0,
    gulf: 0,
    europe: 0,
    hollywood: 0,
  };

  for (const mId of activeMarkets) {
    const cfg = MARKET_CONFIGS.find((c) => c.id === mId);
    if (cfg && totalMarketMultiplier > 0) {
      marketRevenueBreakdown[mId] = Math.round(
        totalGrossRevenue * (cfg.revenueBonusFactor / totalMarketMultiplier)
      );
    }
  }

  return {
    technicalQuality,
    starPower,
    firstWeekRevenue,
    totalBoxOfficeRevenue,
    totalStreamingRevenue,
    totalGrossRevenue,
    distributionFeesTotal,
    marketRevenueBreakdown,
    simulationTwists,
    criticDeltaFromTwists,
    audienceDeltaFromTwists,
  };
}

