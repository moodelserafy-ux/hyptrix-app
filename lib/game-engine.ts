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
}): number {
  const { cash, reputation, releasedProjects, marketValueModifier = 0 } = params;

  const baseBrandEquity = 68_000_000;
  const liquidCashWeight = Math.round(cash * 0.55);
  const reputationEquity = (reputation - 50) * 1_650_000;

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
  genre: GenreId;
  criticScore: number;
  audienceScore: number;
  boxOfficeRevenue: number;
  status?: 'released' | 'delayed';
  delayReason?: string;
}

const RIVAL_FILM_TITLES: Record<GenreId, string[]> = {
  action: [
    'الرصاصة الأخيرة في بورسعيد',
    'أسد الكنانة',
    'عملية الفجر الأسود',
    'حيتان الأسفلت',
    'المهمة المستحيلة في سيناء',
  ],
  popular_drama: [
    'ملوك الحارة القديمة',
    'سلطان الغلابة',
    'دموع الأصول',
    'حارة الجدعان',
    'المعلم الكبير',
  ],
  comedy: [
    'إفلاس خمس نجوم',
    'معالي الوزير بالصدفة',
    'جمعية المنتفعين',
    'خطة نص الليل',
  ],
  light_comedy: [
    'عريس تحت التمرين',
    'إجازة في الساحل',
    'عائلة هاي كلاس',
    'جوازة في الكواليس',
  ],
  psychological_horror: [
    'الغرفة رقم 9',
    'همس المرايا',
    'متاهة العقل',
    'الظل الآخر',
  ],
  supernatural_horror: [
    'عهد الرصد',
    'قصر البارون الملعون',
    'خاتم الجان',
    'بوابة الأسرار',
  ],
  crime_mystery: [
    'لغز جريمة الزمالك',
    'الشاهد الصامت',
    'ملف القضية 404',
    'تحقيقات منتصف الليل',
  ],
  sci_fi: [
    'القاهرة 2099',
    'النسخة الأخيرة',
    'ما وراء الزمن',
    'المدار المفقود',
  ],
  romance: [
    'شتاء في الإسكندرية',
    'موعد على النيل',
    'رسائل لم تقرأ',
    'أيام الوعد',
  ],
  historical: [
    'فرسان المحروسة',
    'عهد المماليك',
    'معركة الكرامة',
    'رايات النصر',
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

/**
 * Generates fierce, realistic rival releases where 1-2 major studios can dominate
 * the box office (70M - 135M EGP) if the player doesn't craft a top-tier work,
 * while another rival might flop or delay its project!
 */
export function generateRivalReleases(
  competitors: CompetitorStudio[],
  availableActors: ActorItem[],
  excludeActorIds: string[],
  seasonMultiplier = 1.0,
  seedOffset = 1
): RivalRelease[] {
  const freeActors = availableActors.filter(
    (a) =>
      !excludeActorIds.includes(a.id) &&
      a.status !== 'retired' &&
      a.status !== 'deceased'
  );
  const pool = freeActors.length >= 4 ? freeActors : availableActors;

  // Rotate which studios lead the season so rankings shake up!
  const rotatedCompetitors = [...competitors].sort((a, b) => {
    const hashA = ((a.market_power * 13 + seedOffset * 31) % 97);
    const hashB = ((b.market_power * 13 + seedOffset * 31) % 97);
    return hashB - hashA;
  });

  return rotatedCompetitors.slice(0, 4).map((comp, idx) => {
    const genre = (comp.preferred_genres[idx % comp.preferred_genres.length] ||
      'action') as GenreId;
    const titles = RIVAL_FILM_TITLES[genre] || RIVAL_FILM_TITLES.action;
    const title = titles[(idx + seedOffset) % titles.length];
    const actor = pool[(idx * 2 + seedOffset) % pool.length];

    const isDelayed = idx === 3 && (seedOffset + comp.market_power) % 2 === 0;
    if (isDelayed) {
      return {
        id: `rival_${comp.id}_${idx}`,
        studioName: comp.name,
        title,
        leadStarName: actor ? actor.name : 'نجم شباك منافس',
        genre,
        criticScore: 0,
        audienceScore: 0,
        boxOfficeRevenue: 0,
        status: 'delayed',
        delayReason:
          'تأجل الطرح للموسم القادم بسبب استكمال المونتاج والخدع البصرية',
      };
    }

    const powerFactor =
      (comp.market_power * 0.55 +
        (actor?.stats.box_office_pull || 80) * 0.45) /
      100;

    // idx === 0 is the Season Blockbuster Rival (strong contender for #1!)
    // idx === 1 is a solid Upper-Mid Rival
    // idx === 2 is a Rival that underperformed or flopped
    const tierOffset = idx === 0 ? 1.15 : idx === 1 ? 0.35 : -1.25;
    const criticScore = Number(
      Math.min(8.9, Math.max(4.2, 6.1 + powerFactor * 2.1 + tierOffset)).toFixed(
        1
      )
    );
    const audienceScore = Number(
      Math.min(
        9.2,
        Math.max(4.5, criticScore + (idx === 0 ? 0.4 : -0.2))
      ).toFixed(1)
    );

    const baseRev =
      idx === 0
        ? Math.round((48_000_000 + powerFactor * 64_000_000) * seasonMultiplier)
        : idx === 1
        ? Math.round((28_000_000 + powerFactor * 42_000_000) * seasonMultiplier)
        : Math.round((9_000_000 + powerFactor * 19_000_000) * seasonMultiplier);

    return {
      id: `rival_${comp.id}_${idx}`,
      studioName: comp.name,
      title,
      leadStarName: actor ? actor.name : 'نجم شباك منافس',
      genre,
      criticScore,
      audienceScore,
      boxOfficeRevenue: baseRev,
      status: 'released',
    };
  });
}

/**
 * Grounded & realistic financial and quality simulation.
 * A project ONLY succeeds if script depth, genre harmony, cast mastery, crew completeness,
 * and production/marketing budgets are genuinely well-executed.
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
  scriptWordCount?: number;
}): {
  technicalQuality: number;
  starPower: number;
  firstWeekRevenue: number;
  totalBoxOfficeRevenue: number;
  totalStreamingRevenue: number;
  totalGrossRevenue: number;
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
    scriptWordCount = 20,
  } = params;

  const synergy = calculateGenreSynergy(
    primaryGenre,
    secondaryGenre,
    director.stats.vision,
    writers[0]?.stats.plot_strength || 75
  );

  // Missing technical crew slots severely penalize quality
  const dopScore = dop ? dop.stats.overall : 42;
  const compScore = composer ? composer.stats.overall : 44;
  const vfxScore = vfx ? vfx.stats.overall : 40;

  // Check if lead actors actually fit this genre!
  const leadActing =
    leads.length > 0
      ? leads.reduce((acc, l) => {
          const mastery = l.genre_mastery[primaryGenre] ?? 62;
          return acc + l.stats.acting * 0.6 + mastery * 0.4;
        }, 0) / leads.length
      : 48;

  const directorGenreFit = director.best_genres.includes(primaryGenre) ? 6 : -6;

  const antagBonus = antagonist
    ? (antagonist.stats.acting * 0.5 + antagonist.stats.charisma * 0.5 - 68) *
      0.32
    : -6;

  // Script effort impact: shallow scripts (< 10 words) hurt quality
  const scriptBonus =
    scriptWordCount >= 22
      ? 6
      : scriptWordCount >= 12
      ? 1
      : -12;

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
      : Math.min(9, (prodSpendTotal - 22_000_000) / 5_500_000);

  let rawQuality =
    director.stats.overall * 0.31 +
    leadActing * 0.27 +
    dopScore * 0.14 +
    compScore * 0.12 +
    vfxScore * 0.14 +
    synergy.score * 0.45 +
    directorGenreFit +
    antagBonus +
    scriptBonus +
    prodBonus;

  if (founderPerk === 'visionary_director') {
    rawQuality *= 1.06;
  }

  const technicalQuality = Math.min(95, Math.max(28, Math.round(rawQuality)));

  const leadPull =
    leads.length > 0
      ? Math.max(...leads.map((l) => l.stats.box_office_pull))
      : 45;
  const supportPull =
    supporting.length > 0
      ? supporting.reduce((s, a) => s + a.stats.box_office_pull, 0) /
        supporting.length
      : 45;
  const cameoBoost = cameos.length * 3;

  const starPower = Math.min(
    96,
    Math.round(
      leadPull * 0.6 +
        supportPull * 0.22 +
        (antagonist?.stats.charisma || 52) * 0.18 +
        cameoBoost
    )
  );

  const regionMultiplier =
    marketRegion === 'hollywood'
      ? 3.2
      : marketRegion === 'europe'
      ? 2.0
      : marketRegion === 'gulf'
      ? 1.45
      : 1.0;

  const ageMultiplier =
    ageRating === 'G' ? 1.08 : ageRating === '+18' ? 0.76 : 1.0;

  const seasonBoost =
    format === 'film'
      ? filmSeason === 'eid_adha'
        ? 1.18
        : filmSeason === 'eid_fitr'
        ? 1.14
        : filmSeason === 'summer'
        ? 1.04
        : 0.85
      : seriesSeason === 'ramadan'
      ? 1.22
      : 0.92;

  const marketingFactor = 0.55 + Math.min(0.65, marketingBudget / 32_000_000);
  const screensFactor =
    format === 'film'
      ? Math.max(0.42, Math.min(1.22, screensCount / 145))
      : 1.0;
  const hypeFactor = Math.max(0.58, 0.72 + (hypeScore - 55) / 150);

  // Strict word-of-mouth curve: weak movies crash at the box office!
  const wordOfMouthFactor =
    technicalQuality >= 83
      ? 1.25
      : technicalQuality >= 74
      ? 0.96
      : technicalQuality >= 64
      ? 0.68
      : technicalQuality >= 54
      ? 0.42
      : 0.24;

  const baseGross =
    format === 'film'
      ? (starPower * 215_000 + technicalQuality * 185_000) *
        seasonBoost *
        marketingFactor *
        screensFactor *
        ageMultiplier *
        hypeFactor *
        wordOfMouthFactor *
        aiBoxOfficeMultiplier *
        regionMultiplier
      : 0;

  let firstWeekRevenue = Math.round(baseGross * 0.38);
  if (founderPerk === 'marketing_whale') {
    firstWeekRevenue = Math.round(firstWeekRevenue * 1.1);
  }

  const totalBoxOfficeRevenue =
    format === 'film' ? Math.round(firstWeekRevenue + baseGross * 0.62) : 0;

  // Platform & TV revenue scales realistically with quality (platforms pay bonuses only for hits)
  const platformQualityFactor =
    technicalQuality >= 76
      ? 0.95
      : technicalQuality >= 64
      ? 0.72
      : 0.48;

  const totalStreamingRevenue = Math.round(
    platformDealAmount * platformQualityFactor +
      (format === 'series'
        ? (starPower * 175_000 + technicalQuality * 165_000) *
          seasonBoost *
          marketingFactor *
          wordOfMouthFactor *
          aiBoxOfficeMultiplier *
          regionMultiplier
        : totalBoxOfficeRevenue * 0.14)
  );

  return {
    technicalQuality,
    starPower,
    firstWeekRevenue,
    totalBoxOfficeRevenue,
    totalStreamingRevenue,
    totalGrossRevenue: totalBoxOfficeRevenue + totalStreamingRevenue,
  };
}
