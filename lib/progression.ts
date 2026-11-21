import type { GenreId } from './db-resolver';
import type { MarketRegion, SeriesEpisodes } from './game-engine';
import type { UiLanguageId } from './market-profiles';

export type StudioLevel = 1 | 2 | 3 | 4;

export interface PromotionChecklistItem {
  id: string;
  label: string;
  done: boolean;
  progressText: string;
}

export interface StudioProgressionSnapshot {
  level: StudioLevel;
  title: string;
  subtitle: string;
  monthlyOverhead: number;
  maxDirectors: 1 | 2;
  canProduceSeries: boolean;
  canProduceLongSeries: boolean;
  canUsePrPhone: boolean;
  canUseRivalRumors: boolean;
  canUseStudioVault: boolean;
  canUnlockRegionalMarket: boolean;
  canUnlockGlobalMarkets: boolean;
  canUseTierA: boolean;
  canUseTierS: boolean;
  totalAwards: number;
  releasedCount: number;
  bestCriticScore: number;
  nextLevel: StudioLevel | null;
  nextLevelTitle: string | null;
  nextUnlocksSummary: string | null;
  headlineTask: string;
  progressPercent: number;
  checklist: PromotionChecklistItem[];
}

export const STARTING_INDIE_CASH = 25_000_000;
export const STARTING_INDIE_REPUTATION = 30;
export const STARTING_INDIE_MARKET_VALUE = 55_000_000;

export const LEVEL_MONTHLY_OVERHEAD: Record<StudioLevel, number> = {
  1: 1_500_000,
  2: 3_500_000,
  3: 7_000_000,
  4: 12_000_000,
};

/**
 * Genre Unlock Matrix:
 * - Level 1 (5 Core Indie Genres): comedy, light_comedy, popular_drama, romance, crime_mystery
 * - Level 2 (Mid-Scale Expansion): action, psychological_horror, supernatural_horror, heist, biography
 * - Level 4 (Mega-Budget Epics): sci_fi, fantasy, superhero, historical
 */
export function getGenreRequiredLevel(genreId: GenreId): StudioLevel {
  switch (genreId) {
    case 'comedy':
    case 'light_comedy':
    case 'popular_drama':
    case 'romance':
    case 'crime_mystery':
      return 1;
    case 'action':
    case 'psychological_horror':
    case 'supernatural_horror':
    case 'heist':
    case 'biography':
      return 2;
    case 'sci_fi':
    case 'fantasy':
    case 'superhero':
    case 'historical':
      return 4;
    default:
      return 1;
  }
}

export function getActorTierRequiredLevel(
  tier: 'S' | 'A' | 'B' | 'C',
  isCustomStar?: boolean
): StudioLevel {
  if (isCustomStar) return 1;
  if (tier === 'S') return 3;
  if (tier === 'A') return 2;
  return 1;
}

export function getEpisodesRequiredLevel(episodes: SeriesEpisodes): StudioLevel {
  if (episodes >= 15) return 3;
  return 2;
}

export function getMarketRegionRequiredLevel(
  region: MarketRegion,
  primaryRegion: MarketRegion
): StudioLevel {
  if (region === primaryRegion) return 1;
  if (region === 'europe' || region === 'hollywood') return 4;
  // Secondary regional expansion (Gulf for Egypt market, Egypt for Saudi market)
  return 3;
}

export function getLevelTitle(
  level: StudioLevel,
  uiLanguage: UiLanguageId = 'en'
): { title: string; subtitle: string } {
  const isEn = uiLanguage === 'en';
  if (level === 1) {
    return {
      title: isEn ? 'Independent Production Office' : 'مكتب إنتاج مستقل',
      subtitle: isEn
        ? 'Indie Films · Tier B/C Stars · Local Box Office'
        : 'أفلام مستقلة · نجوم B و C · السوق المحلي',
    };
  }
  if (level === 2) {
    return {
      title: isEn ? 'Rising Production House' : 'شركة إنتاج صاعدة',
      subtitle: isEn
        ? 'Short Series · Tier A Stars · Action/Horror · Vault & Fan PR'
        : 'مسلسلات قصيرة · نجوم A · أكشن ورعب · الخزنة ودعم اللجان',
    };
  }
  if (level === 3) {
    return {
      title: isEn ? 'Box-Office & Drama Giant' : 'عملاق الشباك والدراما',
      subtitle: isEn
        ? 'Tier S Legends · 30-Ep Marathons · 2 Directors · Regional +45%'
        : 'أساطير S · مسلسلات 30 حلقة · مخرجَان · التوسع الإقليمي +45%',
    };
  }
  return {
    title: isEn ? 'Global Entertainment Empire' : 'إمبراطورية عالمية',
    subtitle: isEn
      ? 'All Mega-Genres · Europe & Hollywood · #1 Global Race'
      : 'كل التصنيفات العملاقة · أوروبا وهوليوود · سباق المركز #1 عالمياً',
  };
}

export function computeStudioProgression(params: {
  marketValue: number;
  releasedProjects: {
    criticScore: number;
    awardsWon: string[];
  }[];
  uiLanguage?: UiLanguageId;
}): StudioProgressionSnapshot {
  const { marketValue, releasedProjects, uiLanguage = 'en' } = params;
  const isEn = uiLanguage === 'en';
  const releasedCount = releasedProjects.length;
  const totalAwards = releasedProjects.reduce(
    (sum, p) => sum + (p.awardsWon?.length || 0),
    0
  );
  const bestCriticScore =
    releasedProjects.length > 0
      ? Math.max(...releasedProjects.map((p) => Number(p.criticScore || 0)))
      : 0;

  // Determine exact achieved Studio Level (cumulative career thresholds)
  const qualifiesL2 =
    releasedCount >= 2 && (marketValue >= 110_000_000 || bestCriticScore >= 7.0);
  const qualifiesL3 =
    qualifiesL2 && marketValue >= 250_000_000 && totalAwards >= 1;
  const qualifiesL4 =
    qualifiesL3 && marketValue >= 550_000_000 && totalAwards >= 3;

  const level: StudioLevel = qualifiesL4
    ? 4
    : qualifiesL3
    ? 3
    : qualifiesL2
    ? 2
    : 1;

  const { title, subtitle } = getLevelTitle(level, uiLanguage);
  const monthlyOverhead = LEVEL_MONTHLY_OVERHEAD[level];

  let nextLevel: StudioLevel | null = null;
  let nextLevelTitle: string | null = null;
  let nextUnlocksSummary: string | null = null;
  let headlineTask = '';
  let progressPercent = 100;
  let checklist: PromotionChecklistItem[] = [];

  if (level === 1) {
    nextLevel = 2;
    nextLevelTitle = getLevelTitle(2, uiLanguage).title;
    nextUnlocksSummary = isEn
      ? 'Unlocks: Tier A Stars, Short Series (7–10 Ep), Action & Horror, Soundstage Vault & Fan PR'
      : 'يفتح: نجوم فئة A، المسلسلات القصيرة (7–10 حلقات)، الأكشن والرعب، خزنة البلاتوهات، ودعم اللجان';

    const filmsDone = releasedCount >= 2;
    const mvOrCriticDone = marketValue >= 110_000_000 || bestCriticScore >= 7.0;
    const filmsPct = Math.min(1, releasedCount / 2);
    const mvOrCriticPct = mvOrCriticDone
      ? 1
      : Math.max(
          Math.min(1, marketValue / 110_000_000),
          Math.min(1, bestCriticScore / 7.0)
        );
    progressPercent = Math.round(((filmsPct + mvOrCriticPct) / 2) * 100);

    checklist = [
      {
        id: 'l2_releases',
        label: isEn ? 'Release 2 films' : 'إنتاج عملين (2)',
        done: filmsDone,
        progressText: `${Math.min(2, releasedCount)}/2`,
      },
      {
        id: 'l2_quality_or_mv',
        label: isEn
          ? '110M valuation OR 7.0+ critic score'
          : 'قيمة سوقية 110M أو تقييم نقاد 7.0+',
        done: mvOrCriticDone,
        progressText:
          bestCriticScore >= 7.0
            ? `${bestCriticScore.toFixed(1)}/10`
            : `${Math.round(marketValue / 1_000_000)}M/110M`,
      },
    ];

    const remFilms = Math.max(0, 2 - releasedCount);
    if (remFilms > 0 && !mvOrCriticDone) {
      headlineTask = isEn
        ? `Release ${remFilms} more film${remFilms > 1 ? 's' : ''} & hit 7.0+ critics (or 110M value) to unlock Tier A stars & Short Series`
        : `باقي ${remFilms === 1 ? 'فيلم واحد' : 'فيلمان'} + تقييم 7.0+ (أو قيمة 110M) لفتح نجوم فئة A والمسلسلات القصيرة`;
    } else if (remFilms > 0) {
      headlineTask = isEn
        ? `Release ${remFilms} more film${remFilms > 1 ? 's' : ''} to unlock Tier A stars, Action/Horror & Short Series`
        : `باقي ${remFilms === 1 ? 'عمل واحد فقط' : 'عملان'} للترقية وفتح نجوم فئة A والأكشن والمسلسلات القصيرة`;
    } else {
      headlineTask = isEn
        ? 'Hit a 7.0+ critic review or 110M market value to promote to Rising Production House!'
        : 'حقق تقييم نقاد 7.0+ أو قيمة سوقية 110M للترقية إلى «شركة إنتاج صاعدة»!';
    }
  } else if (level === 2) {
    nextLevel = 3;
    nextLevelTitle = getLevelTitle(3, uiLanguage).title;
    nextUnlocksSummary = isEn
      ? 'Unlocks: Tier S Legends, 15 & 30-Ep Ramadan Series, 2 Co-Directors, Rival Rumor Wars & Regional +45%'
      : 'يفتح: نجوم فئة S الأساطير، مسلسلات 15 و30 حلقة، التعاقد مع مخرجَين، حرب الإشاعات، والتوسع الإقليمي +45%';

    const mvDone = marketValue >= 250_000_000;
    const awardDone = totalAwards >= 1;
    const mvPct = Math.min(1, marketValue / 250_000_000);
    const awPct = Math.min(1, totalAwards / 1);
    progressPercent = Math.round(((mvPct + awPct) / 2) * 100);

    checklist = [
      {
        id: 'l3_mv',
        label: isEn ? 'Reach 250M valuation' : 'قيمة سوقية 250M',
        done: mvDone,
        progressText: `${Math.round(marketValue / 1_000_000)}M/250M`,
      },
      {
        id: 'l3_award',
        label: isEn ? 'Win 1 festival award' : 'الفوز بجائزة مهرجان (1)',
        done: awardDone,
        progressText: `${Math.min(1, totalAwards)}/1`,
      },
    ];

    if (!mvDone && !awardDone) {
      headlineTask = isEn
        ? 'Reach 250M valuation & win 1 annual festival award to unlock Tier S Legends & 30-Ep Series'
        : 'الوصول لـ 250M قيمة سوقية + جائزة مهرجان واحدة لفتح أساطير S ومسلسلات 30 حلقة';
    } else if (!awardDone) {
      headlineTask = isEn
        ? 'Win 1 annual festival award to unlock Tier S Legends, 2 Directors & Regional expansion!'
        : 'باقي جائزة مهرجان واحدة فقط لفتح نجوم فئة S الأساطير ومخرجَين والتوسع الإقليمي!';
    } else {
      headlineTask = isEn
        ? `Grow valuation to 250M (${Math.round(marketValue / 1_000_000)}M now) to unlock Tier S Legends!`
        : `ارفع قيمتك السوقية إلى 250M (الحالية ${Math.round(marketValue / 1_000_000)}M) لفتح نجوم فئة S!`;
    }
  } else if (level === 3) {
    nextLevel = 4;
    nextLevelTitle = getLevelTitle(4, uiLanguage).title;
    nextUnlocksSummary = isEn
      ? 'Unlocks: Sci-Fi, Fantasy, Superhero & Historical Epics + Europe & Hollywood Global Distribution'
      : 'يفتح: أفلام الخيال العلمي والفانتازيا والأبطال الخارقين والملاحم التاريخية + توزيع أوروبا وهوليوود';

    const mvDone = marketValue >= 550_000_000;
    const awardsDone = totalAwards >= 3;
    const mvPct = Math.min(1, marketValue / 550_000_000);
    const awPct = Math.min(1, totalAwards / 3);
    progressPercent = Math.round(((mvPct + awPct) / 2) * 100);

    checklist = [
      {
        id: 'l4_mv',
        label: isEn ? 'Reach 550M valuation' : 'قيمة سوقية 550M',
        done: mvDone,
        progressText: `${Math.round(marketValue / 1_000_000)}M/550M`,
      },
      {
        id: 'l4_awards',
        label: isEn ? 'Win 3 festival awards' : 'الفوز بـ 3 جوائز مهرجانات',
        done: awardsDone,
        progressText: `${Math.min(3, totalAwards)}/3`,
      },
    ];

    const remAw = Math.max(0, 3 - totalAwards);
    if (!mvDone && remAw > 0) {
      headlineTask = isEn
        ? `Reach 550M value & win ${remAw} more award${remAw > 1 ? 's' : ''} to unlock Sci-Fi/Superhero & Hollywood`
        : `الوصول لـ 550M قيمة سوقية + ${remAw} جوائز إضافية لفتح الخيال العلمي وهوليوود`;
    } else if (remAw > 0) {
      headlineTask = isEn
        ? `Win ${remAw} more festival award${remAw > 1 ? 's' : ''} to become a Global Entertainment Empire!`
        : `باقي ${remAw} جوائز مهرجانات فقط لفتح مستوى «إمبراطورية عالمية» وسوق هوليوود!`;
    } else {
      headlineTask = isEn
        ? `Push studio value to 550M (${Math.round(marketValue / 1_000_000)}M now) to unlock Global Empire!`
        : `ارفع قيمة الاستوديو إلى 550M (الحالية ${Math.round(marketValue / 1_000_000)}M) لفتح الإمبراطورية العالمية!`;
    }
  } else {
    headlineTask = isEn
      ? 'Max Studio Level Reached — Dominate #1 on the Global Leaderboard & Weekly Challenges!'
      : 'وصلت لأعلى مستوى (إمبراطورية عالمية) — سيطر الآن على المركز #1 عالمياً وتحديات الأسبوع!';
    progressPercent = 100;
    checklist = [
      {
        id: 'l4_max',
        label: isEn ? 'All 4 Empire Tiers Unlocked' : 'جميع مستويات الإمبراطورية مفتوحة',
        done: true,
        progressText: 'Lv.4/4',
      },
    ];
  }

  return {
    level,
    title,
    subtitle,
    monthlyOverhead,
    maxDirectors: level >= 3 ? 2 : 1,
    canProduceSeries: level >= 2,
    canProduceLongSeries: level >= 3,
    canUsePrPhone: level >= 2,
    canUseRivalRumors: level >= 3,
    canUseStudioVault: level >= 2,
    canUnlockRegionalMarket: level >= 3,
    canUnlockGlobalMarkets: level >= 4,
    canUseTierA: level >= 2,
    canUseTierS: level >= 3,
    totalAwards,
    releasedCount,
    bestCriticScore,
    nextLevel,
    nextLevelTitle,
    nextUnlocksSummary,
    headlineTask,
    progressPercent,
    checklist,
  };
}
