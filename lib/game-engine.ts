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
    const val = (abs / 1_000_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${sign}${val}T`;
  }
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
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
): { score: number; label: string; isHarmonious: boolean; isWeirdSavedByGenius: boolean } {
  if (!secondary || primary === secondary) {
    return { score: 5, label: 'تركيز درامي موحد (+5%)', isHarmonious: true, isWeirdSavedByGenius: false };
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
      borderClass: 'border-violet-400 border-b-4 border-b-violet-500 shadow-[0_14px_34px_-8px_rgba(124,58,237,0.22)]',
      bgGradient: 'from-[#F5F3FF] via-white to-[#ECFEFF]',
      textColor: 'text-violet-700',
    };
  }
  if (overall >= 80) {
    return {
      tierName: 'ELITE',
      badgeText: 'نجم صف أول',
      borderClass: 'border-cyan-400 border-b-4 border-b-cyan-500 shadow-[0_12px_28px_-8px_rgba(6,182,212,0.18)]',
      bgGradient: 'from-[#ECFEFF] via-white to-[#F0F9FF]',
      textColor: 'text-cyan-700',
    };
  }
  if (overall >= 70) {
    return {
      tierName: 'PRO',
      badgeText: 'محترف متمرس',
      borderClass: 'border-indigo-200 border-b-4 border-b-indigo-300 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.12)]',
      bgGradient: 'from-[#EEF2FF] via-white to-slate-50',
      textColor: 'text-indigo-700',
    };
  }
  return {
    tierName: 'RISING',
    badgeText: 'موهبة صاعدة',
    borderClass: 'border-rose-300 border-b-4 border-b-rose-400 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.12)]',
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
    const rawRisk = Math.min(98, 55 + (highEgoActors.length - 1) * 25 - Math.max(0, directorControl - 80));
    return {
      egoClashRisk: rawRisk,
      highEgoStars: highEgoNames,
      hasSevereClash: true,
      chemistryScore: Math.max(40, 90 - rawRisk / 2),
      warningMessage: `تحذير: اجتماع (${highEgoNames.join(' و ')}) بغرور معدي 90 هيعمل خناقات كبيرة في اللوكيشن على ترتيب الأسماء على التتر وحجم الصورة في البوستر!`,
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
  const { baseSalary, ego, genreMasteryScore, studioReputation, isCameo } = params;
  const rawBase = isCameo ? Math.round(baseSalary * 0.22) : baseSalary;

  // High ego stars demand a premium, especially if studio reputation is under 75
  const egoMultiplier = ego >= 92 ? 1.18 : ego >= 85 ? 1.1 : ego >= 75 ? 1.02 : 0.94;
  const repPenalty = studioReputation < 60 ? 1.15 : studioReputation < 75 ? 1.06 : 0.96;
  // If the genre is not their specialty (< 78), they demand more money to take the risk
  const genreFactor = genreMasteryScore >= 88 ? 0.95 : genreMasteryScore < 75 ? 1.18 : 1.04;

  const expectedMinimumSalary = Math.round(rawBase * egoMultiplier * repPenalty * genreFactor);
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
  action: ['الرصاصة الأخيرة في بورسعيد', 'أسد الكنانة', 'عملية الفجر الأسود', 'حيتان الأسفلت', 'المهمة المستحيلة في سيناء'],
  popular_drama: ['ملوك الحارة القديمة', 'سلطان الغلابة', 'دموع الأصول', 'حارة الجدعان', 'المعلم الكبير'],
  comedy: ['إفلاس خمس نجوم', 'معالي الوزير بالصدفة', 'جمعية المنتفعين', 'خطة نص الليل'],
  light_comedy: ['عريس تحت التمرين', 'إجازة في الساحل', 'عائلة هاي كلاس', 'جوازة في الكواليس'],
  psychological_horror: ['الغرفة رقم 9', 'همس المرايا', 'متاهة العقل', 'الظل الآخر'],
  supernatural_horror: ['عهد الرصد', 'قصر البارون الملعون', 'خاتم الجان', 'بوابة الأسرار'],
  crime_mystery: ['لغز جريمة الزمالك', 'الشاهد الصامت', 'ملف القضية 404', 'تحقيقات منتصف الليل'],
  sci_fi: ['القاهرة 2099', 'النسخة الأخيرة', 'ما وراء الزمن', 'المدار المفقود'],
  romance: ['شتاء في الإسكندرية', 'موعد على النيل', 'رسائل لم تقرأ', 'أيام الوعد'],
  historical: ['فرسان المحروسة', 'عهد المماليك', 'معركة الكرامة', 'رايات النصر'],
  biography: ['أسطورة الفن', 'رحلة العبقري', 'صوت الخلود', 'مذكرات الزمن الجميل'],
  heist: ['خزينة البنك المركزي', 'سرقة القرن', 'خطة الشبح', 'الشفرة الماسية'],
  fantasy: ['مملكة النيل المفقودة', 'حارس البوابة القديمة', 'أسطورة العنقاء', 'جزيرة السحر'],
  superhero: ['الظل القرمزي', 'حامي المدينة', 'البرق الأسود', 'درع العدالة'],
};

export function generateRivalReleases(
  competitors: CompetitorStudio[],
  availableActors: ActorItem[],
  excludeActorIds: string[],
  seasonMultiplier = 1.0,
  seedOffset = 1
): RivalRelease[] {
  const freeActors = availableActors.filter(
    (a) => !excludeActorIds.includes(a.id) && a.status !== 'retired' && a.status !== 'deceased'
  );
  const pool = freeActors.length >= 4 ? freeActors : availableActors;

  // Pick up to 4 studios; 3 release and 1 might delay or skip the season realistically
  return competitors.slice(0, 4).map((comp, idx) => {
    const genre = (comp.preferred_genres[idx % comp.preferred_genres.length] || 'action') as GenreId;
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
        delayReason: 'تأجل الطرح للموسم القادم بسبب استكمال المونتاج والخدع البصرية',
      };
    }

    const powerFactor = (comp.market_power * 0.5 + (actor?.stats.box_office_pull || 76) * 0.5) / 100;
    const tierOffset = idx === 0 ? 0.6 : idx === 1 ? -0.3 : -1.1;
    const criticScore = Number(
      Math.min(8.8, Math.max(4.4, 5.8 + powerFactor * 2.4 + tierOffset)).toFixed(1)
    );
    const audienceScore = Number(
      Math.min(9.1, Math.max(4.8, criticScore + (idx === 0 ? 0.4 : -0.2))).toFixed(1)
    );
    const spreadMultiplier = idx === 0 ? 1.15 : idx === 1 ? 0.82 : 0.52;
    const baseRev = Math.round(
      (16_000_000 + powerFactor * 58_000_000) * spreadMultiplier * seasonMultiplier
    );

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
  } = params;

  const synergy = calculateGenreSynergy(
    primaryGenre,
    secondaryGenre,
    director.stats.vision,
    writers[0]?.stats.plot_strength || 75
  );

  // If technical crew slots are left empty, quality suffers realistically!
  const dopScore = dop ? dop.stats.overall : 48;
  const compScore = composer ? composer.stats.overall : 50;
  const vfxScore = vfx ? vfx.stats.overall : 45;

  // Check if lead actors actually master this genre!
  const leadActing =
    leads.length > 0
      ? leads.reduce((acc, l) => {
          const mastery = l.genre_mastery[primaryGenre] ?? 68;
          return acc + l.stats.acting * 0.65 + mastery * 0.35;
        }, 0) / leads.length
      : 55;

  const directorGenreFit = director.best_genres.includes(primaryGenre) ? 6 : -4;

  const antagBonus = antagonist
    ? (antagonist.stats.acting * 0.5 + antagonist.stats.charisma * 0.5 - 68) * 0.3
    : -5; // Missing an antagonist hurts dramatic conflict

  const prodSpendTotal =
    budgetAllocation.setsAndLocations +
    budgetAllocation.costumesAndMakeup +
    budgetAllocation.vfxAndStunts +
    budgetAllocation.extrasAndCrowds;

  // Realistic production budget impact: underspending (< 15M) penalizes quality
  const prodBonus =
    prodSpendTotal < 12_000_000
      ? -8
      : prodSpendTotal < 20_000_000
      ? 0
      : Math.min(10, (prodSpendTotal - 20_000_000) / 5_000_000);

  let rawQuality =
    director.stats.overall * 0.32 +
    leadActing * 0.28 +
    dopScore * 0.14 +
    compScore * 0.12 +
    vfxScore * 0.14 +
    synergy.score * 0.45 +
    directorGenreFit +
    antagBonus +
    prodBonus;

  if (founderPerk === 'visionary_director') {
    rawQuality *= 1.07;
  }

  const technicalQuality = Math.min(96, Math.max(28, Math.round(rawQuality)));

  const leadPull =
    leads.length > 0
      ? Math.max(...leads.map((l) => l.stats.box_office_pull))
      : 50;
  const supportPull =
    supporting.length > 0
      ? supporting.reduce((s, a) => s + a.stats.box_office_pull, 0) / supporting.length
      : 48;
  const cameoBoost = cameos.length * 4;

  const starPower = Math.min(
    97,
    Math.round(
      leadPull * 0.62 +
        supportPull * 0.22 +
        (antagonist?.stats.charisma || 55) * 0.16 +
        cameoBoost
    )
  );

  const regionMultiplier =
    marketRegion === 'hollywood'
      ? 3.5
      : marketRegion === 'europe'
      ? 2.1
      : marketRegion === 'gulf'
      ? 1.55
      : 1.0;

  const ageMultiplier = ageRating === 'G' ? 1.12 : ageRating === '+18' ? 0.78 : 1.0;

  const seasonBoost =
    format === 'film'
      ? filmSeason === 'eid_adha'
        ? 1.25
        : filmSeason === 'eid_fitr'
        ? 1.2
        : filmSeason === 'summer'
        ? 1.08
        : 0.88
      : seriesSeason === 'ramadan'
      ? 1.3
      : 0.95;

  // Realistic marketing & screen impact
  const marketingFactor = 0.65 + Math.min(0.75, marketingBudget / 28_000_000);
  const screensFactor = format === 'film' ? Math.max(0.45, Math.min(1.35, screensCount / 130)) : 1.0;
  const hypeFactor = Math.max(0.65, 0.75 + (hypeScore - 50) / 140);

  // Word-of-mouth quality curve: bad movies (< 60 quality) drop sharply after opening!
  const wordOfMouthFactor =
    technicalQuality >= 82
      ? 1.22
      : technicalQuality >= 70
      ? 1.0
      : technicalQuality >= 58
      ? 0.76
      : 0.52;

  const baseGross =
    format === 'film'
      ? (starPower * 290_000 + technicalQuality * 240_000) *
        seasonBoost *
        marketingFactor *
        screensFactor *
        ageMultiplier *
        hypeFactor *
        wordOfMouthFactor *
        aiBoxOfficeMultiplier *
        regionMultiplier
      : 0;

  let firstWeekRevenue = Math.round(baseGross * 0.36);
  if (founderPerk === 'marketing_whale') {
    firstWeekRevenue = Math.round(firstWeekRevenue * 1.12);
  }

  const totalBoxOfficeRevenue =
    format === 'film' ? Math.round(firstWeekRevenue + baseGross * 0.64) : 0;

  const totalStreamingRevenue = Math.round(
    platformDealAmount * (technicalQuality >= 65 ? 1.0 : 0.75) +
      (format === 'series'
        ? (starPower * 260_000 + technicalQuality * 250_000) *
          seasonBoost *
          marketingFactor *
          wordOfMouthFactor *
          aiBoxOfficeMultiplier *
          regionMultiplier
        : totalBoxOfficeRevenue * 0.18)
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
