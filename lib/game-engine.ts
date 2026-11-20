import { ActorItem, CrewItem, GenreId } from './db-resolver';
import {
  getCurrencyLabel,
  getMarketConfigsForWorld,
  getMarketProfile,
  getPrimaryMarketRegion,
  type UiLanguageId,
  type WorldMarketId,
} from './market-profiles';
import { localizeEntityName } from './i18n';
export type { ActorItem, CrewItem, GenreId };

export type FounderPerk =
  | 'visionary_director'
  | 'marketing_whale'
  | 'shark_negotiator';

export type MarketRegion = 'egypt' | 'gulf' | 'europe' | 'hollywood';

export type ProjectFormat = 'film' | 'series';
export type SeriesEpisodes = 7 | 10 | 15 | 30;
export type SeriesSeason = 'ramadan' | 'off_season';
export type FilmReleaseSeason = 'eid_fitr' | 'eid_adha' | 'summer' | 'mid_year';
export type AgeRating = 'G' | '+12' | '+18';

export type RoleBillingSize =
  | 'lead_star'
  | 'co_lead'
  | 'antagonist'
  | 'supporting'
  | 'cameo';

export const VIP_DINNER_COST = 1_500_000;

export const ROLE_BILLING_META: Record<
  RoleBillingSize,
  {
    id: RoleBillingSize;
    label: string;
    subtitle: string;
    salaryWeight: number;
    minRecommendedTier: 'S' | 'A' | 'B' | 'C';
  }
> = {
  lead_star: {
    id: 'lead_star',
    label: 'بطولة مطلقة (نجم الشباك الأول)',
    subtitle: 'يتصدر الأفيش والدعاية ويتحمل عبء العمل الدرامي بالكامل',
    salaryWeight: 1.0,
    minRecommendedTier: 'A',
  },
  co_lead: {
    id: 'co_lead',
    label: 'بطولة مشتركة (محور رئيسي)',
    subtitle: 'بطولة ثنائية أو جماعية متساوية المساحة والتأثير في الأحداث',
    salaryWeight: 0.88,
    minRecommendedTier: 'B',
  },
  antagonist: {
    id: 'antagonist',
    label: 'الشرير المحوري (الخصم الدرامي)',
    subtitle: 'المحرك الرئيسي للصراع في مواجهة البطل طوال الأحداث',
    salaryWeight: 0.85,
    minRecommendedTier: 'B',
  },
  supporting: {
    id: 'supporting',
    label: 'دور ثانٍ / مساعد مؤثر',
    subtitle: 'شخصية مساندة تثري الحبكة وتدعم مسار الأحداث',
    salaryWeight: 0.55,
    minRecommendedTier: 'C',
  },
  cameo: {
    id: 'cameo',
    label: 'ضيف شرف خاص (ظهور استثنائي)',
    subtitle: 'مشهد أو حلقة مفاجئة ترفع حماس الجمهور بتكلفة مخفضة',
    salaryWeight: 0.25,
    minRecommendedTier: 'S',
  },
};

export interface MarketConfig {
  id: MarketRegion;
  name: string;
  description: string;
  unlockMarketValue: number;
  earlyLicenseCost: number;
  distributionFeePerProject: number;
  revenueBonusFactor: number;
  budgetMultiplier: number;
  revenueMultiplier: number;
}

export const MARKET_CONFIGS: MarketConfig[] = [
  {
    id: 'egypt',
    name: 'السوق المصري (هوليوود الشرق)',
    description:
      'السوق الأساسي للشركة — كثافة جماهيرية عالية في مواسم العيدين وموسم دراما رمضان.',
    unlockMarketValue: 0,
    earlyLicenseCost: 0,
    distributionFeePerProject: 0,
    revenueBonusFactor: 1.0,
    budgetMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'gulf',
    name: 'السوق الخليجي (دور العرض والمنصات)',
    description:
      'يفتح شاشات العرض الخليجية الضخمة ويرفع إجمالي إيرادات العمل بنسبة +45% مقابل رسوم تسويق وتوزيع إقليمي.',
    unlockMarketValue: 220_000_000,
    earlyLicenseCost: 22_000_000,
    distributionFeePerProject: 6_000_000,
    revenueBonusFactor: 0.45,
    budgetMultiplier: 1.35,
    revenueMultiplier: 1.45,
  },
  {
    id: 'europe',
    name: 'السوق الأوروبي والمغتربين',
    description:
      'توزيع في العواصم الأوروبية والمهرجانات الدولية يضيف +65% لإيرادات العمل ويدعم فرص الجوائز.',
    unlockMarketValue: 450_000_000,
    earlyLicenseCost: 48_000_000,
    distributionFeePerProject: 12_000_000,
    revenueBonusFactor: 0.65,
    budgetMultiplier: 1.75,
    revenueMultiplier: 1.65,
  },
  {
    id: 'hollywood',
    name: 'السوق العالمي (التوزيع الدولي الشامل)',
    description:
      'أعلى درجات الانتشار السينمائي العالمي — يضاعف عوائد التذاكر والبث بنسبة +110% للأعمال عالية الجودة.',
    unlockMarketValue: 850_000_000,
    earlyLicenseCost: 95_000_000,
    distributionFeePerProject: 24_000_000,
    revenueBonusFactor: 1.1,
    budgetMultiplier: 2.5,
    revenueMultiplier: 2.1,
  },
];

export interface GenreSynergyResult {
  multiplier: number;
  label: string;
  isHarmonious: boolean;
  score: number;
  isWeirdSavedByGenius?: boolean;
}

const HARMONIOUS_PAIRS: [GenreId, GenreId, string, string][] = [
  ['action', 'popular_drama', 'مزيج جماهيري قوي: أكشن + دراما شعبية', 'Crowd-Pleaser Blend: Action + Street Drama'],
  ['action', 'heist', 'مزيج تشويقي: أكشن + سرقة وخطط', 'High-Octane Blend: Action + Heist'],
  ['crime_mystery', 'psychological_horror', 'مزيج نفسي عميق: جريمة وغموض + رعب نفسي', 'Chilling Blend: Crime Mystery + Psychological Horror'],
  ['comedy', 'romance', 'مزيج عائلي محبوب: كوميديا + رومانسي', 'Beloved Classic Blend: Comedy + Romance'],
  ['light_comedy', 'romance', 'كوميديا رومانسية خفيفة وجذابة', 'Charming Rom-Com Blend'],
  ['sci_fi', 'action', 'إثارة مستقبلية: خيال علمي + أكشن', 'Futuristic Spectacle: Sci-Fi + Action'],
  ['historical', 'biography', 'ملحمة توثيقية: تاريخي + سيرة ذاتية', 'Prestige Epic: Historical + Biopic'],
  ['fantasy', 'superhero', 'ملحمة خيالية: فانتازيا + أبطال خارقون', 'Mythic Blockbuster: Fantasy + Superhero'],
  ['supernatural_horror', 'crime_mystery', 'تحقيقات غامضة: ما وراء الطبيعة + جريمة', 'Occult Detective Blend: Supernatural + Crime'],
];

const CLASHING_PAIRS: [GenreId, GenreId, string, string][] = [
  ['historical', 'sci_fi', 'مزيج تجريبي غير تقليدي: تاريخي + خيال علمي', 'Bold Experimental Mix: Historical + Sci-Fi'],
  ['light_comedy', 'psychological_horror', 'مزيج متباين: كوميديا خفيفة + رعب نفسي', 'Clashing Tones: Light Comedy + Psychological Horror'],
  ['biography', 'superhero', 'مزيج غير مألوف: سيرة ذاتية + أبطال خارقون', 'Unusual Mashup: Biopic + Superhero'],
  ['popular_drama', 'sci_fi', 'مزيج مغامر: دراما شعبية + خيال علمي', 'Risky Fusion: Street Drama + Sci-Fi'],
];

export function calculateGenreSynergy(
  primary: GenreId,
  secondary: GenreId | null,
  directorSkill: number,
  writerSkill: number,
  uiLanguage: UiLanguageId = 'ar'
): GenreSynergyResult {
  const isEn = uiLanguage === 'en';
  if (!secondary || primary === secondary) {
    return {
      multiplier: 1.0,
      label: isEn ? 'Focused Single-Genre Vision' : 'تصنيف منفرد متوازن',
      isHarmonious: true,
      score: 10,
    };
  }

  for (const [g1, g2, descAr, descEn] of HARMONIOUS_PAIRS) {
    if (
      (primary === g1 && secondary === g2) ||
      (primary === g2 && secondary === g1)
    ) {
      return {
        multiplier: 1.15,
        label: isEn ? descEn : descAr,
        isHarmonious: true,
        score: 18,
      };
    }
  }

  for (const [g1, g2, descAr, descEn] of CLASHING_PAIRS) {
    if (
      (primary === g1 && secondary === g2) ||
      (primary === g2 && secondary === g1)
    ) {
      const desc = isEn ? descEn : descAr;
      if (directorSkill >= 90 && writerSkill >= 90) {
        return {
          multiplier: 1.22,
          label: isEn
            ? `${desc} (Elevated into Genius by Elite Crew)`
            : `${desc} (معالجة عبقرية بفضل مهارة الطاقم)`,
          isHarmonious: true,
          score: 20,
          isWeirdSavedByGenius: true,
        };
      }
      return {
        multiplier: 0.88,
        label: desc,
        isHarmonious: false,
        score: -12,
      };
    }
  }

  return {
    multiplier: 1.05,
    label: isEn ? 'Balanced Genre Fusion' : 'دمج درامي متكامل',
    isHarmonious: true,
    score: 12,
  };
}

export interface CastChemistryReport {
  totalEgo: number;
  hasSevereClash: boolean;
  synergyBonus: number;
  egoClashRisk: number;
  warningMessage: string | null;
}

export function evaluateCastChemistry(
  cast: ActorItem[],
  directorControl = 85,
  uiLanguage: UiLanguageId = 'ar'
): CastChemistryReport {
  const isEn = uiLanguage === 'en';
  if (cast.length === 0) {
    return {
      totalEgo: 0,
      hasSevereClash: false,
      synergyBonus: 0,
      egoClashRisk: 0,
      warningMessage: null,
    };
  }

  const totalEgo = cast.reduce((sum, actor) => sum + actor.stats.ego, 0);
  const avgEgo = totalEgo / cast.length;
  const highEgoStars = cast.filter((a) => a.stats.ego >= 88);

  if (highEgoStars.length >= 2 && directorControl < 88) {
    return {
      totalEgo,
      hasSevereClash: true,
      synergyBonus: -8,
      egoClashRisk: 75,
      warningMessage: isEn
        ? `Potential Ego Clash between (${highEgoStars.map((s) => s.name).join(' & ')})! Hire an authoritative Director (Control 88+) to keep the set steady.`
        : `صراع نجومية محتمل بين (${highEgoStars.map((s) => s.name).join(' و ')})! يفضل التعاقد مع مخرج ذي شخصية قيادية قوية (تحكم +88).`,
    };
  }

  if (avgEgo <= 76 && cast.length >= 2) {
    return {
      totalEgo,
      hasSevereClash: false,
      synergyBonus: 8,
      egoClashRisk: 12,
      warningMessage: null,
    };
  }

  return {
    totalEgo,
    hasSevereClash: false,
    synergyBonus: 4,
    egoClashRisk: 24,
    warningMessage: null,
  };
}

export function calculateNegotiatedSalary(
  baseSalary: number,
  backendPoints: number,
  founderPerk: FounderPerk,
  vipDinnerAccepted: boolean
): number {
  let factor = 1.0;
  if (founderPerk === 'shark_negotiator') {
    factor -= 0.15;
  }
  factor -= backendPoints * 0.025;
  if (vipDinnerAccepted) {
    factor -= 0.2;
  }
  factor = Math.max(0.55, factor);
  return Math.round(baseSalary * factor);
}

/**
 * Calculates the realistic minimum salary a talent expects based on their Ego,
 * Genre Mastery, Role Billing Size, and the Studio's Reputation.
 */
export function calculateTalentExpectedSalary(params: {
  baseSalary: number;
  ego: number;
  genreMasteryScore: number;
  studioReputation: number;
  isCameo?: boolean;
  roleBillingSize?: RoleBillingSize;
  starTier?: 'S' | 'A' | 'B' | 'C';
  hasTopDirector?: boolean;
}): {
  expectedMinimumSalary: number;
  acceptanceDifficultyLabel: string;
} {
  const {
    baseSalary,
    ego,
    genreMasteryScore,
    studioReputation,
    isCameo,
    roleBillingSize = isCameo ? 'cameo' : 'lead_star',
    starTier = 'B',
    hasTopDirector = false,
  } = params;

  const billingMeta =
    ROLE_BILLING_META[roleBillingSize] || ROLE_BILLING_META.lead_star;
  let baseForRole = Math.round(baseSalary * billingMeta.salaryWeight);

  if (
    roleBillingSize === 'supporting' &&
    (starTier === 'S' || starTier === 'A')
  ) {
    baseForRole = Math.round(baseSalary * 1.15);
  }

  if (roleBillingSize === 'cameo') {
    return {
      expectedMinimumSalary: Math.round(baseSalary * 0.25),
      acceptanceDifficultyLabel: 'ظهور خاص (ضيف شرف)',
    };
  }

  let demandFactor = 0.94;
  if (ego >= 90) demandFactor += 0.16;
  else if (ego >= 82) demandFactor += 0.06;
  else if (ego <= 70) demandFactor -= 0.06;

  if (genreMasteryScore < 60) {
    demandFactor += 0.22;
  } else if (genreMasteryScore < 75) {
    demandFactor += 0.14;
  } else if (genreMasteryScore >= 90) {
    demandFactor -= 0.04;
  }

  if (studioReputation >= 80) {
    demandFactor -= 0.05;
  } else if (studioReputation < 50) {
    demandFactor += 0.09;
  }

  if (hasTopDirector) {
    demandFactor -= 0.04;
  }

  const expectedMinimumSalary = Math.round(baseForRole * demandFactor);
  const acceptanceDifficultyLabel =
    roleBillingSize === 'supporting' && starTier === 'S'
      ? 'يرفض الأدوار الثانوية تماماً (يطلب بطولة أو ضيف شرف)'
      : ego >= 88
      ? 'نجم شباك صارم في شروط الدور والأجر'
      : ego >= 78
      ? 'تفاوض احترافي يوازن بين حجم الدور والأجر'
      : 'مرن ومتحمس للفرص الدرامية الجيدة';

  return { expectedMinimumSalary, acceptanceDifficultyLabel };
}

export interface DeepTalentEvaluationResult {
  willAccept: boolean;
  expectedMinimumSalary: number;
  roleFitScore: number;
  artisticFitScore: number;
  financialRatio: number;
  roleFitVerdict: string;
  rejectionCategory:
    | 'none'
    | 'role_too_small_for_star'
    | 'weak_character_or_script'
    | 'genre_mismatch'
    | 'low_director_or_reputation'
    | 'underpaid';
  detailedReason: string;
}

/**
 * Deep multi-factor contract evaluation engine:
 * Evaluates Role Billing Size vs. Star Tier/Ego, Character & Script Depth,
 * Genre Mastery, Director Prestige, Studio Reputation, and Financial Offer + VIP Dinner.
 */
export function evaluateTalentOfferDeep(params: {
  talentName: string;
  isActor: boolean;
  starTier: 'S' | 'A' | 'B' | 'C';
  overall: number;
  ego: number;
  baseSalary: number;
  offeredSalary: number;
  backendPoints: number;
  vipDinner: boolean;
  roleBillingSize: RoleBillingSize;
  customRoleDescription: string;
  projectTitle: string;
  scriptSynopsis: string;
  genreName: string;
  genreMasteryScore: number;
  studioReputation: number;
  directorOverall?: number | null;
  directorName?: string | null;
  currencyLabel?: string;
  uiLanguage?: UiLanguageId;
}): DeepTalentEvaluationResult {
  const {
    isActor,
    starTier,
    overall,
    ego,
    baseSalary,
    offeredSalary,
    backendPoints,
    vipDinner,
    roleBillingSize,
    customRoleDescription,
    projectTitle,
    scriptSynopsis,
    genreName,
    genreMasteryScore,
    studioReputation,
    directorOverall = null,
    directorName = null,
    currencyLabel,
    uiLanguage = 'ar',
  } = params;

  const isEn = uiLanguage === 'en';
  const cur = currencyLabel || (isEn ? 'EGP' : 'ج.م');

  const hasTopDirector = Boolean(directorOverall && directorOverall >= 86);
  const { expectedMinimumSalary } = calculateTalentExpectedSalary({
    baseSalary,
    ego,
    genreMasteryScore,
    studioReputation,
    roleBillingSize: isActor ? roleBillingSize : 'lead_star',
    starTier,
    hasTopDirector,
  });

  const scriptWords = scriptSynopsis.trim()
    ? scriptSynopsis.trim().split(/\s+/).length
    : 0;
  const roleWords = customRoleDescription.trim()
    ? customRoleDescription.trim().split(/\s+/).length
    : 0;

  let roleFitScore = 82;
  let roleFitVerdict = isEn
    ? 'Role billing fits the talent’s market standing perfectly.'
    : 'حجم الدور مناسب تماماً لمكانة الفنان في السوق';

  if (isActor) {
    if (roleBillingSize === 'supporting') {
      if (starTier === 'S' || overall >= 89 || ego >= 86) {
        roleFitScore = 18;
        roleFitVerdict = isEn
          ? 'Artistically rejected: S-Tier marquee stars will not accept a supporting billing slot.'
          : 'مرفوض فنياً: نجم صف أول (فئة S) لا يقبل بدور مساعد أو ثانوي على الأفيش';
      } else if (starTier === 'A' || overall >= 83) {
        roleFitScore = 52;
        roleFitVerdict = isEn
          ? 'Role is smaller than the star’s usual billing and demands strong financial & creative incentives.'
          : 'حجم الدور أصغر من مكانة النجم المعتادة ويتطلب إغراءً مالياً وفنياً كبيراً';
      } else {
        roleFitScore = 92;
        roleFitVerdict = isEn
          ? 'An ideal opportunity to cement the actor’s footprint in the market.'
          : 'فرصة ممتازة ومناسبة جداً لتثبيت أقدام الممثل في السوق';
      }
    } else if (roleBillingSize === 'lead_star') {
      if (starTier === 'S' || starTier === 'A') {
        roleFitScore = 96;
        roleFitVerdict = isEn
          ? 'Top-billed solo lead matches the star’s marquee box-office stature.'
          : 'البطولة المطلقة تناسب تماماً نجومية الفنان وتاريخه في شباك التذاكر';
      } else if (starTier === 'B') {
        roleFitScore = 90;
        roleFitVerdict = isEn
          ? 'A golden breakout lead opportunity that genuinely excites the actor.'
          : 'فرصة ذهبية للبطولة المطلقة يتحمس لها الفنان بشدة';
      } else {
        roleFitScore = 95;
        roleFitVerdict = isEn
          ? 'An extraordinary marquee lead launchpad for a rising talent.'
          : 'بطولة مطلقة استثنائية تمنح الموهبة الصاعدة انطلاقة كبرى';
      }
    } else if (roleBillingSize === 'co_lead') {
      if (starTier === 'S' && ego >= 91) {
        roleFitScore = 68;
        roleFitVerdict = isEn
          ? 'The star prefers solo top billing, though a strong deal can lock in a co-lead.'
          : 'النجم يفضل البطولة المطلقة المنفردة لكنه قد يقبل البطولة المشتركة بشروط قوية';
      } else {
        roleFitScore = 90;
        roleFitVerdict = isEn
          ? 'Co-lead billing creates an appealing dramatic balance for the actor.'
          : 'البطولة المشتركة تمنح توازناً درامياً جذاباً للفنان';
      }
    } else if (roleBillingSize === 'antagonist') {
      if (starTier === 'S' && ego >= 92) {
        roleFitScore = 70;
        roleFitVerdict = isEn
          ? 'The star insists the central villain shares equal poster prominence with the hero.'
          : 'النجم يشترط أن تكون مساحة الشرير المحوري موازية للبطل على الأفيش';
      } else {
        roleFitScore = 91;
        roleFitVerdict = isEn
          ? 'Playing the central antagonist is a juicy dramatic showcase for the star.'
          : 'دور الشرير المحوري يمثل تحدياً تمثيلياً مغرياً للفنان';
      }
    } else if (roleBillingSize === 'cameo') {
      roleFitScore = 88;
      roleFitVerdict = isEn
        ? 'A prestigious special cameo requires minimal shoot days while adding marquee weight.'
        : 'ظهور خاص كضيف شرف لا يتطلب تفرغاً طويلاً ويضيف ثقلاً للعمل';
    }
  }

  if (
    isActor &&
    roleBillingSize === 'supporting' &&
    (starTier === 'S' || overall >= 89 || ego >= 86)
  ) {
    return {
      willAccept: false,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore: 40,
      financialRatio: offeredSalary / Math.max(1, expectedMinimumSalary),
      roleFitVerdict,
      rejectionCategory: 'role_too_small_for_star',
      detailedReason: isEn
        ? `I must respectfully pass on "${projectTitle}". My box-office stature as an A-list marquee lead doesn't allow me to take a supporting slot—I only sign on as a lead or an iconic special cameo.`
        : `أعتذر عن المشاركة في «${projectTitle}»؛ مكانتي الفنية وتاريخي كبطل صف أول لا يسمحان بقبول دور ثانٍ أو مساعد، ولا أشارك إلا في بطولة العمل أو كضيف شرف استثنائي.`,
    };
  }

  const scriptDepthScore =
    scriptWords >= 18 ? 92 : scriptWords >= 10 ? 78 : 52;
  const roleDescBonus =
    !isActor || roleWords >= 3 ? 6 : roleWords >= 2 ? 2 : -8;
  const directorBonus = directorOverall
    ? directorOverall >= 90
      ? 10
      : directorOverall >= 82
      ? 5
      : -4
    : 0;
  const repBonus =
    studioReputation >= 80 ? 6 : studioReputation < 48 ? -8 : 0;

  const artisticFitScore = Math.max(
    25,
    Math.min(
      100,
      Math.round(
        genreMasteryScore * 0.48 +
          scriptDepthScore * 0.32 +
          roleFitScore * 0.2 +
          roleDescBonus +
          directorBonus +
          repBonus
      )
    )
  );

  const backendBoost =
    backendPoints * (starTier === 'S' || starTier === 'A' ? 0.024 : 0.018);
  const dinnerBoost = vipDinner ? 0.11 : 0;
  const effectiveFinancialOffer =
    offeredSalary * (1 + backendBoost + dinnerBoost);
  const financialRatio =
    effectiveFinancialOffer / Math.max(1, expectedMinimumSalary);

  if (
    (starTier === 'S' || starTier === 'A') &&
    scriptWords < 7 &&
    financialRatio < 1.25
  ) {
    return {
      willAccept: false,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore,
      financialRatio,
      roleFitVerdict,
      rejectionCategory: 'weak_character_or_script',
      detailedReason: isEn
        ? `I read the brief for "${projectTitle}", but the dramatic treatment and character arc are still far too thin to justify staking my name on the project right now.`
        : `قرأت ملخص «${projectTitle}»، لكن المعالجة الدرامية وتفاصيل الدور لا تزال مختصرة جداً ولا توضح أبعاد الشخصية الكافية للمغامرة بقبول العمل حالياً.`,
    };
  }

  if (genreMasteryScore < 70 && financialRatio < 1.12 && !vipDinner) {
    return {
      willAccept: false,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore,
      financialRatio,
      roleFitVerdict,
      rejectionCategory: 'genre_mismatch',
      detailedReason: isEn
        ? `The (${genreName}) genre on "${projectTitle}" falls outside my core wheelhouse. Taking that creative risk requires either a private VIP table read or a compensation package that justifies the leap.`
        : `تصنيف (${genreName}) في «${projectTitle}» بعيد عن منطقتي الفنية المعتادة، ولا يمكنني خوض هذه المجازفة دون جلسة عمل خاصة أو تقدير مالي يعوض هذه النقلة.`,
    };
  }

  const roleModifier = (roleFitScore - 80) * 0.004;
  const artisticModifier = (artisticFitScore - 75) * 0.004;
  const totalAcceptanceScore =
    financialRatio + roleModifier + artisticModifier;

  const requiredThreshold =
    starTier === 'S' || ego >= 90
      ? 1.0
      : starTier === 'A' || ego >= 82
      ? 0.95
      : 0.89;

  const willAccept =
    financialRatio >= 0.82 && totalAcceptanceScore >= requiredThreshold;

  const roleBillingLabelEnMap: Record<RoleBillingSize, string> = {
    lead_star: 'Lead Role',
    co_lead: 'Co-Lead Role',
    antagonist: 'Main Antagonist',
    supporting: 'Supporting Role',
    cameo: 'Special Cameo',
  };

  const roleBillingLabel = isActor
    ? isEn
      ? roleBillingLabelEnMap[roleBillingSize] || 'Role'
      : ROLE_BILLING_META[roleBillingSize]?.label.split(' ')[0] || 'الدور'
    : isEn
    ? 'creative helm'
    : 'قيادة العمل';

  const seedVal = Array.from(
    `${params.talentName}_${projectTitle}_${offeredSalary}_${roleBillingSize}`
  ).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  if (willAccept) {
    const directorClause = directorName
      ? isEn
        ? ` alongside director ${directorName}`
        : ` وبالتعاون مع المخرج ${directorName}`
      : '';
    const dinnerClause = vipDinner
      ? isEn
        ? ' especially after our private VIP table read,'
        : ' وبعد جلسة القراءة الخاصة،'
      : '';
    const roleText = customRoleDescription.trim() || roleBillingLabel;
    const finText = `${formatMoney(offeredSalary)} ${cur}${
      backendPoints > 0
        ? isEn
          ? ` + ${backendPoints}% backend points`
          : ` + ${backendPoints}% من الأرباح`
        : ''
    }`;

    const acceptVariants = isEn
      ? [
          `I'm genuinely fired up about "${roleText}" in "${projectTitle}"${directorClause};${dinnerClause} the deal (${finText}) respects both the project's ambition and my stature. Count me in—I'm signing!`,
          `After reviewing the script for "${projectTitle}" with my agency, "${roleText}" feels like a powerhouse leap in (${genreName})${directorClause}, and the offer (${finText}) is rock-solid. Excited to join the cast!`,
          `The hook of "${projectTitle}" and screen presence of "${roleText}"${directorClause} won me over,${dinnerClause} and the package (${finText}) seals the deal. Let's roll cameras!`,
          `"${projectTitle}" has every hallmark of a commercial and critical triumph, and "${roleText}" is sharply written${directorClause}. I accept (${finText}) and am ready for pre-production.`,
          `I'm betting my season on "${projectTitle}"—"${roleText}" hits every dramatic chord I've been looking for${directorClause}, and (${finText}) works for both sides.`,
        ]
      : [
          `تحمست جداً لتفاصيل شخصية «${roleText}» في سيناريو «${projectTitle}»${directorClause}،${dinnerClause} كما أن العرض المالي (${finText}) يليق بحجم العمل ومكانتي الفنية. أوافق رسمياً على التوقيع!`,
          `بعد مراجعة ورق «${projectTitle}» مع مكتب إدارة أعمالي، وجدت أن دور «${roleText}» يمثل نقلة فنية قوية في (${genreName})${directorClause}، والعقد المقدم (${finText}) عادل جداً. يسعدني الانضمام للفريق!`,
          `أعجبتني حبكة «${projectTitle}» ومساحة دور «${roleText}» على الشاشة${directorClause}،${dinnerClause} والتقدير المادي (${finText}) يحسم قراري بالموافقة الفورية وبدء التحضيرات.`,
          `مشروع «${projectTitle}» يمتلك كل مقومات النجاح الجماهيري والنقدي، ودور «${roleText}» مكتوب بعناية${directorClause}. أقبل العرض المالي (${finText}) ومستعد لدخول البلاتوه.`,
          `رهاني هذا الموسم سيكون على «${projectTitle}»؛ شخصية «${roleText}» استفزت طاقتي التمثيلية${directorClause}، وبنود التعاقد (${finText}) مرضية تماماً لطرفينا.`,
        ];

    return {
      willAccept: true,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore,
      financialRatio,
      roleFitVerdict,
      rejectionCategory: 'none',
      detailedReason: acceptVariants[seedVal % acceptVariants.length],
    };
  }

  if (isActor && roleBillingSize === 'supporting' && starTier === 'A') {
    return {
      willAccept: false,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore,
      financialRatio,
      roleFitVerdict,
      rejectionCategory: 'role_too_small_for_star',
      detailedReason: isEn
        ? `The supporting slot "${customRoleDescription || 'Supporting Role'}" in "${projectTitle}" carries less screen weight than my current billing tier. I'd need either top billing or a significant boost in salary and backend points.`
        : `دور «${customRoleDescription || 'مساعد'}» في «${projectTitle}» مساحته الدرامية أقل من البطولات التي أقدمها حالياً، ولا يمكنني قبوله بهذا الأجر دون رفع مساحة الدور إلى بطولة أو زيادة العرض المالي ونسبة الأرباح.`,
    };
  }

  const rejectVariants = isEn
    ? [
        `While I admire the premise of "${projectTitle}" and the "${customRoleDescription || roleBillingLabel}" arc, the offer (${formatMoney(offeredSalary)} ${cur}) falls short of my market floor (${formatMoney(expectedMinimumSalary)} ${cur}) for this commitment.`,
        `My agency has advised declining "${projectTitle}" at this figure—(${formatMoney(offeredSalary)} ${cur}) does not reflect Tier-${starTier} rates, which start at ${formatMoney(expectedMinimumSalary)} ${cur}.`,
        `The screenplay for "${projectTitle}" has real promise, but the gap between your offer (${formatMoney(offeredSalary)} ${cur}) and my contractual minimum (${formatMoney(expectedMinimumSalary)} ${cur}) keeps us from closing.`,
        `After reviewing the deal memo for "${projectTitle}", my quote needs to move closer to ${formatMoney(expectedMinimumSalary)} ${cur}—or include stronger backend profit points—before I can commit.`,
      ]
    : [
        `رغم إعجابي بفكرة «${projectTitle}» ودور «${customRoleDescription || roleBillingLabel}»، إلا أن العرض المالي (${formatMoney(offeredSalary)} ${cur}) يقل عن أجري السوقي المتوقع (${formatMoney(expectedMinimumSalary)} ${cur}) لحجم التفرغ المطلوب.`,
        `اعتذر وكيل أعمالي عن عدم إتمام التعاقد على «${projectTitle}»؛ القيمة المالية المعروضة (${formatMoney(offeredSalary)} ${cur}) لا تتناسب مع أجر الفئة (${starTier}) الذي لا يقل عن ${formatMoney(expectedMinimumSalary)} ${cur}.`,
        `النص الدرامي لعمل «${projectTitle}» واعد، لكن الفجوة المالية بين عرضكم (${formatMoney(offeredSalary)} ${cur}) ومتطلبات التعاقد (${formatMoney(expectedMinimumSalary)} ${cur}) تحول دون توقيعي حالياً.`,
        `بعد دراسة عرض «${projectTitle}»، أرى أن الميزانية المخصصة لأجري (${formatMoney(offeredSalary)} ${cur}) تحتاج إلى مراجعة لتصل إلى حدود ${formatMoney(expectedMinimumSalary)} ${cur} أو تعويضها بنسبة أرباح أعلى.`,
      ];

  return {
    willAccept: false,
    expectedMinimumSalary,
    roleFitScore,
    artisticFitScore,
    financialRatio,
    roleFitVerdict,
    rejectionCategory: 'underpaid',
    detailedReason: rejectVariants[seedVal % rejectVariants.length],
  };
}

export interface ProductionBudgetAllocation {
  setsAndLocations: number;
  costumesAndMakeup: number;
  vfxAndStunts: number;
  extrasAndCrowds: number;
}

export interface SimulationTwistItem {
  id: string;
  label: string;
  impactMultiplier: number;
}

export interface ProjectSimulationInput {
  format: ProjectFormat;
  episodes?: SeriesEpisodes;
  seriesSeason?: SeriesSeason;
  filmSeason?: FilmReleaseSeason;
  primaryGenre: GenreId;
  secondaryGenre: GenreId | null;
  ageRating: AgeRating;
  director: CrewItem;
  coDirector?: CrewItem | null;
  writers: CrewItem[];
  dop?: CrewItem | null;
  composer?: CrewItem | null;
  vfx?: CrewItem | null;
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
  qualityModifier?: number;
  aiBoxOfficeMultiplier: number;
  marketRegion: MarketRegion;
  worldMarket?: WorldMarketId;
  selectedDistributionMarkets?: MarketRegion[];
  scriptWordCount?: number;
  scriptSynopsis?: string;
  totalBackendPointsPercent?: number;
  previousGenres?: GenreId[];
  entropySeed?: number;
}

export type RevenueTrajectory = 'front_loaded' | 'steady' | 'sleeper';

export interface ProjectFinancialResult {
  technicalQuality: number;
  commercialAppeal: number;
  expectedCriticScore: number;
  expectedAudienceScore: number;
  trajectory: RevenueTrajectory;
  firstWeekRevenue: number;
  totalBoxOfficeRevenue: number;
  totalStreamingRevenue: number;
  totalGrossRevenue: number;
  backendRoyaltiesTotal: number;
  netRevenueAfterRoyalties: number;
  synergyReport: GenreSynergyResult;
  chemistryReport: CastChemistryReport;
  distributionFeesTotal: number;
  simulationTwists: SimulationTwistItem[];
}

/**
 * Anti-spam lexical quality evaluator for player-written synopses.
 * Rejects repeated-word spam (e.g., "فيلم فيلم فيلم...") and gibberish tokens,
 * rewarding genuine vocabulary diversity, Arabic/real-word ratio, and narrative structure.
 */
export function evaluateScriptCraftScore(
  synopsis?: string,
  fallbackWordCount?: number
): {
  score: number;
  wordCount: number;
  uniqueRatio: number;
  isSpam: boolean;
} {
  const clean = (synopsis || '').trim();
  if (!clean) {
    const words = fallbackWordCount ?? 20;
    const score =
      words >= 34
        ? 86
        : words >= 24
        ? 81
        : words >= 16
        ? 75
        : words >= 10
        ? 68
        : words >= 6
        ? 54
        : 40;
    return { score, wordCount: words, uniqueRatio: 0.75, isSpam: false };
  }

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const wordCount = rawTokens.length;
  if (wordCount === 0) {
    return { score: 34, wordCount: 0, uniqueRatio: 0, isSpam: true };
  }

  const normalizedTokens = rawTokens
    .map((tok) =>
      tok
        .replace(/[^\u0600-\u06FFa-zA-Z]/g, '')
        .toLowerCase()
        .trim()
    )
    .filter((tok) => tok.length >= 2);

  const realWordRatio = normalizedTokens.length / Math.max(1, wordCount);
  const freqMap = new Map<string, number>();
  for (const tok of normalizedTokens) {
    freqMap.set(tok, (freqMap.get(tok) || 0) + 1);
  }

  const uniqueCount = freqMap.size;
  const uniqueRatio = uniqueCount / Math.max(1, normalizedTokens.length);
  const maxFreq = Math.max(0, ...Array.from(freqMap.values()));
  const dominanceRatio = maxFreq / Math.max(1, normalizedTokens.length);
  const avgWordLen =
    normalizedTokens.length > 0
      ? normalizedTokens.reduce((sum, t) => sum + t.length, 0) /
        normalizedTokens.length
      : 0;
  const sentenceSegments = clean
    .split(/[،.,!؟\n]+/)
    .filter((s) => s.trim().length >= 8).length;

  const isSpam =
    realWordRatio < 0.55 ||
    (wordCount >= 8 && uniqueRatio < 0.42) ||
    (wordCount >= 6 && dominanceRatio > 0.34) ||
    avgWordLen < 2.6;

  if (isSpam) {
    const spamScore = Math.max(
      30,
      Math.min(50, Math.round(32 + uniqueCount * 1.1 + realWordRatio * 8))
    );
    return {
      score: spamScore,
      wordCount,
      uniqueRatio: Number(uniqueRatio.toFixed(2)),
      isSpam: true,
    };
  }

  const lengthPts = Math.min(34, uniqueCount * 1.15);
  const diversityPts = Math.min(26, uniqueRatio * 30);
  const structurePts = Math.min(18, sentenceSegments * 6);
  const richnessPts =
    avgWordLen >= 4.2 ? 16 : avgWordLen >= 3.4 ? 12 : 7;

  const finalScore = Math.min(
    94,
    Math.max(42, Math.round(lengthPts + diversityPts + structurePts + richnessPts))
  );

  return {
    score: finalScore,
    wordCount,
    uniqueRatio: Number(uniqueRatio.toFixed(2)),
    isSpam: false,
  };
}

const GENRE_BUDGET_REQUIREMENTS: Record<
  GenreId,
  { sets: number; costumes: number; vfx: number; extras: number }
> = {
  action: { sets: 8_000_000, costumes: 4_000_000, vfx: 14_000_000, extras: 6_000_000 },
  popular_drama: { sets: 7_000_000, costumes: 4_000_000, vfx: 4_000_000, extras: 6_000_000 },
  comedy: { sets: 5_000_000, costumes: 4_000_000, vfx: 3_000_000, extras: 3_500_000 },
  light_comedy: { sets: 4_500_000, costumes: 3_500_000, vfx: 2_500_000, extras: 3_000_000 },
  psychological_horror: { sets: 6_500_000, costumes: 4_000_000, vfx: 6_500_000, extras: 2_500_000 },
  supernatural_horror: { sets: 7_500_000, costumes: 5_000_000, vfx: 10_000_000, extras: 3_500_000 },
  crime_mystery: { sets: 6_500_000, costumes: 4_000_000, vfx: 5_500_000, extras: 4_000_000 },
  sci_fi: { sets: 10_000_000, costumes: 6_500_000, vfx: 16_000_000, extras: 5_000_000 },
  romance: { sets: 6_000_000, costumes: 5_000_000, vfx: 2_500_000, extras: 3_000_000 },
  historical: { sets: 12_000_000, costumes: 9_500_000, vfx: 10_000_000, extras: 9_000_000 },
  biography: { sets: 8_000_000, costumes: 7_000_000, vfx: 3_500_000, extras: 5_000_000 },
  heist: { sets: 8_500_000, costumes: 4_500_000, vfx: 9_500_000, extras: 4_500_000 },
  fantasy: { sets: 11_000_000, costumes: 8_000_000, vfx: 15_000_000, extras: 6_500_000 },
  superhero: { sets: 10_000_000, costumes: 7_500_000, vfx: 17_000_000, extras: 6_000_000 },
};

// Decouples commercial crowd draw from critical prestige:
// Popcorn genres draw bigger opening crowds even with moderate critic scores,
// while prestige genres earn higher critic respect and rely on word-of-mouth/awards.
const GENRE_MARKET_PROFILES: Record<
  GenreId,
  { commercialDraw: number; criticPrestigeBonus: number }
> = {
  action: { commercialDraw: 1.24, criticPrestigeBonus: -1.5 },
  popular_drama: { commercialDraw: 1.18, criticPrestigeBonus: 2.0 },
  comedy: { commercialDraw: 1.22, criticPrestigeBonus: -2.0 },
  light_comedy: { commercialDraw: 1.12, criticPrestigeBonus: -1.5 },
  psychological_horror: { commercialDraw: 0.88, criticPrestigeBonus: 4.5 },
  supernatural_horror: { commercialDraw: 1.04, criticPrestigeBonus: 0.5 },
  crime_mystery: { commercialDraw: 1.04, criticPrestigeBonus: 4.0 },
  sci_fi: { commercialDraw: 1.08, criticPrestigeBonus: 2.0 },
  romance: { commercialDraw: 1.05, criticPrestigeBonus: 1.0 },
  historical: { commercialDraw: 0.90, criticPrestigeBonus: 5.5 },
  biography: { commercialDraw: 0.86, criticPrestigeBonus: 6.0 },
  heist: { commercialDraw: 1.14, criticPrestigeBonus: 1.5 },
  fantasy: { commercialDraw: 1.08, criticPrestigeBonus: 1.0 },
  superhero: { commercialDraw: 1.20, criticPrestigeBonus: -2.5 },
};

export function calculateFinancialsAndQuality(
  input: ProjectSimulationInput
): ProjectFinancialResult {
  const worldMarket: WorldMarketId = input.worldMarket || 'egypt';
  const primaryRegion = getPrimaryMarketRegion(worldMarket);
  const marketConfigs = getMarketConfigsForWorld(worldMarket);

  const activeMarkets: MarketRegion[] =
    input.selectedDistributionMarkets &&
    input.selectedDistributionMarkets.length > 0
      ? input.selectedDistributionMarkets
      : [input.marketRegion || primaryRegion];

  let combinedRevenueMultiplier = 1.0;
  let distributionFeesTotal = 0;

  for (const mId of activeMarkets) {
    const cfg = marketConfigs.find((m) => m.id === mId);
    if (!cfg) continue;
    if (mId !== primaryRegion) {
      combinedRevenueMultiplier += cfg.revenueBonusFactor;
      distributionFeesTotal += cfg.distributionFeePerProject;
    }
  }

  // Anti-spam lexical evaluation of player-written synopsis
  const scriptEval = evaluateScriptCraftScore(
    input.scriptSynopsis,
    input.scriptWordCount
  );
  const playerScriptCraft = scriptEval.score;
  const words = scriptEval.wordCount;

  // Blend primary director + optional co-director stats so hiring a 2nd director genuinely impacts quality & control
  const hasCoDirector = Boolean(
    input.coDirector && input.coDirector.id !== input.director.id
  );
  const dirVision = input.director.stats.vision ?? input.director.stats.overall;
  const dirControl = input.director.stats.control ?? input.director.stats.overall;
  const coVision = input.coDirector
    ? (input.coDirector.stats.vision ?? input.coDirector.stats.overall)
    : dirVision;
  const coControl = input.coDirector
    ? (input.coDirector.stats.control ?? input.coDirector.stats.overall)
    : dirControl;

  const effectiveDirectorVision = hasCoDirector && input.coDirector
    ? Math.round(dirVision * 0.65 + coVision * 0.35 + 2)
    : dirVision;
  const effectiveDirectorControl = hasCoDirector && input.coDirector
    ? Math.round(dirControl * 0.62 + coControl * 0.38 + 3)
    : dirControl;
  const effectiveDirectorOverall = hasCoDirector && input.coDirector
    ? Math.round(input.director.stats.overall * 0.65 + input.coDirector.stats.overall * 0.35)
    : input.director.stats.overall;
  const coDirectorSynergyBonus =
    hasCoDirector && input.coDirector
      ? input.coDirector.stats.overall >= 80
        ? 3.2
        : 1.8
      : 0;

  const synergyReport = calculateGenreSynergy(
    input.primaryGenre,
    input.secondaryGenre,
    effectiveDirectorVision,
    playerScriptCraft
  );

  const mainCast = [
    ...input.leads,
    ...(input.antagonist ? [input.antagonist] : []),
    ...input.supporting,
  ];
  const chemistryReport = evaluateCastChemistry(
    mainCast,
    effectiveDirectorControl
  );

  const castActingAvg =
    mainCast.length > 0
      ? mainCast.reduce((s, a) => {
          const mastery = a.genre_mastery[input.primaryGenre] || 70;
          const secondaryMastery = input.secondaryGenre
            ? a.genre_mastery[input.secondaryGenre] || 68
            : mastery;
          const blendedMastery = input.secondaryGenre
            ? mastery * 0.7 + secondaryMastery * 0.3
            : mastery;
          return s + a.stats.acting * 0.54 + blendedMastery * 0.46;
        }, 0) / mainCast.length
      : 55;

  const castPullAvg =
    mainCast.length > 0
      ? mainCast.reduce(
          (s, a) => s + a.stats.box_office_pull * 0.65 + a.stats.charisma * 0.35,
          0
        ) / mainCast.length
      : 58;

  const topLeadPull =
    input.leads.length > 0
      ? Math.max(...input.leads.map((a) => a.stats.box_office_pull))
      : castPullAvg;

  const cameoBoost = input.cameos.reduce(
    (s, c) => s + c.stats.charisma * 0.055,
    0
  );

  const productionSpend =
    input.budgetAllocation.setsAndLocations +
    input.budgetAllocation.costumesAndMakeup +
    input.budgetAllocation.vfxAndStunts +
    input.budgetAllocation.extrasAndCrowds;

  const reqs =
    GENRE_BUDGET_REQUIREMENTS[input.primaryGenre] ||
    GENRE_BUDGET_REQUIREMENTS.popular_drama;
  const setsRatio = Math.min(1.4, input.budgetAllocation.setsAndLocations / reqs.sets);
  const costumesRatio = Math.min(1.4, input.budgetAllocation.costumesAndMakeup / reqs.costumes);
  const vfxRatio = Math.min(1.4, input.budgetAllocation.vfxAndStunts / reqs.vfx);
  const extrasRatio = Math.min(1.4, input.budgetAllocation.extrasAndCrowds / reqs.extras);

  const avgDeptAdequacy = (setsRatio + costumesRatio + vfxRatio + extrasRatio) / 4;
  const departmentQualityDelta =
    avgDeptAdequacy >= 1.15
      ? 7.5
      : avgDeptAdequacy >= 0.9
      ? 3.5
      : avgDeptAdequacy >= 0.72
      ? 0
      : avgDeptAdequacy >= 0.5
      ? -6
      : -13;

  const productionQualityScore = Math.min(
    98,
    Math.max(24, 34 + avgDeptAdequacy * 44 + Math.min(16, (productionSpend / 55_000_000) * 16))
  );

  const primaryDirFits = input.director.best_genres.includes(input.primaryGenre);
  const coDirFits = Boolean(
    hasCoDirector &&
      input.coDirector &&
      input.coDirector.best_genres.includes(input.primaryGenre)
  );
  const directorGenreFit =
    primaryDirFits && coDirFits
      ? 1.12
      : primaryDirFits || coDirFits
      ? 1.09
      : 0.92;

  const crewTechBonus =
    (input.dop ? (input.dop.stats.overall - 75) * 0.2 : -3.5) +
    (input.composer ? (input.composer.stats.overall - 75) * 0.16 : -2.5) +
    (input.vfx ? (input.vfx.stats.overall - 75) * 0.2 : -3.0);

  const ensembleDepthBonus =
    (input.antagonist ? 2.8 : -1.5) +
    Math.min(3.6, input.supporting.length * 1.6);

  const scriptDelta = scriptEval.isSpam
    ? -12
    : words < 6
    ? -14
    : words < 10
    ? -7
    : words < 16
    ? -1
    : playerScriptCraft >= 84
    ? 5.5
    : 2.5;
  const onSetQualityMod = input.qualityModifier || 0;
  const genreProfile =
    GENRE_MARKET_PROFILES[input.primaryGenre] ||
    GENRE_MARKET_PROFILES.popular_drama;

  let rawQuality =
    (effectiveDirectorOverall * 0.26 * directorGenreFit +
      coDirectorSynergyBonus +
      playerScriptCraft * 0.2 +
      castActingAvg * 0.34 +
      productionQualityScore * 0.2 +
      chemistryReport.synergyBonus * 0.45 +
      crewTechBonus +
      departmentQualityDelta +
      ensembleDepthBonus +
      scriptDelta +
      genreProfile.criticPrestigeBonus +
      onSetQualityMod) *
    synergyReport.multiplier;

  if (input.founderPerk === 'visionary_director') {
    rawQuality += 5.5;
  }

  if (input.ageRating === '+18') {
    rawQuality += 3.0;
  }

  // Genuine wide range: truly bad films drop to 26-50, masterpieces hit 86-97
  const technicalQuality = Math.min(97, Math.max(24, Math.round(rawQuality)));

  // Genre repetition / freshness twists
  const simulationTwists: SimulationTwistItem[] = [];
  let twistMultiplier = 1.0;

  if (input.previousGenres && input.previousGenres.length >= 2) {
    const repeatedCount = input.previousGenres.filter(
      (g) => g === input.primaryGenre
    ).length;
    if (repeatedCount >= 2) {
      simulationTwists.push({
        id: 'genre_fatigue',
        label: 'تشبع الجمهور من تكرار نفس التصنيف الدرامي على التوالي',
        impactMultiplier: 0.84,
      });
      twistMultiplier *= 0.84;
    } else if (repeatedCount === 0) {
      simulationTwists.push({
        id: 'genre_fresh_wave',
        label: 'موجة انتعاش جماهيري لتقديم لون درامي متجدد',
        impactMultiplier: 1.13,
      });
      twistMultiplier *= 1.13;
    }
  }

  const idealMarketingForScreens = input.screensCount * 85_000;
  const marketingEfficiency =
    input.marketingBudget >= idealMarketingForScreens * 0.85
      ? 1.09
      : input.marketingBudget < idealMarketingForScreens * 0.4
      ? 0.86
      : 1.0;

  const marketingBoost = 0.78 + (input.marketingBudget / 42_000_000) * 0.62;
  const screensBoost =
    input.format === 'film'
      ? (0.64 + (input.screensCount / 210) * 0.64) * marketingEfficiency
      : 1.0;

  const ageRatingCommercialMod =
    input.ageRating === 'G' ? 1.16 : input.ageRating === '+18' ? 0.8 : 1.0;

  const filmSeason = input.filmSeason || 'eid_adha';
  const seriesSeason = input.seriesSeason || 'ramadan';
  const episodes = input.episodes || 15;

  const seasonMultiplier =
    input.format === 'film'
      ? filmSeason === 'eid_adha'
        ? 1.28
        : filmSeason === 'eid_fitr'
        ? 1.2
        : filmSeason === 'summer'
        ? 1.12
        : 0.92
      : seriesSeason === 'ramadan'
      ? 1.3
      : 1.0;

  // Commercial appeal is driven primarily by star power, hype, genre crowd draw, and age accessibility
  // — deliberately decoupled from pure critic prestige so popcorn hits can top the box office!
  const commercialAppeal = Math.min(
    99,
    Math.max(
      25,
      Math.round(
        (castPullAvg * 0.38 +
          topLeadPull * 0.2 +
          input.hypeScore * 0.3 +
          technicalQuality * 0.12 +
          cameoBoost) *
          ageRatingCommercialMod *
          Math.pow(genreProfile.commercialDraw, 0.55)
      )
    )
  );

  // Separate realistic critic score (2.4 - 9.7) and audience entertainment score (2.8 - 9.8)
  const expectedCriticScore = Number(
    Math.min(9.7, Math.max(2.4, technicalQuality / 10)).toFixed(1)
  );
  const entertainmentRaw =
    (technicalQuality * 0.48 +
      commercialAppeal * 0.38 +
      Math.min(100, input.hypeScore) * 0.14) /
    10;
  const expectedAudienceScore = Number(
    Math.min(9.8, Math.max(2.8, entertainmentRaw)).toFixed(1)
  );

  // Determine revenue run trajectory:
  const trajectory: RevenueTrajectory =
    commercialAppeal >= technicalQuality + 9
      ? 'front_loaded'
      : technicalQuality >= commercialAppeal + 7 && technicalQuality >= 76
      ? 'sleeper'
      : 'steady';

  // Decoupled revenue math:
  const openingCommercialPower = Math.pow(commercialAppeal / 74, 1.52);
  const openingQualityFloor = Math.pow(Math.max(42, technicalQuality) / 74, 0.55);

  const baseTicketRevenue =
    input.format === 'film'
      ? 18_500_000 *
        openingCommercialPower *
        openingQualityFloor *
        genreProfile.commercialDraw *
        marketingBoost *
        screensBoost *
        seasonMultiplier *
        twistMultiplier
      : 0;

  const perkMarketingMod =
    input.founderPerk === 'marketing_whale' ? 1.12 : 1.0;

  const clampedAiMult = Math.min(
    1.36,
    Math.max(0.45, input.aiBoxOfficeMultiplier)
  );

  // Allow genuine international market expansion scaling (up to 3.35x across Gulf + Europe + Hollywood)
  // so players paying 14M–42M distribution fees earn strong, fair global ROI!
  const marketCapMult = Math.min(3.35, combinedRevenueMultiplier);

  const openingShare =
    trajectory === 'front_loaded'
      ? 0.42
      : trajectory === 'sleeper'
      ? 0.24
      : 0.33;

  const firstWeekRevenue =
    input.format === 'film'
      ? Math.round(
          baseTicketRevenue *
            openingShare *
            perkMarketingMod *
            clampedAiMult *
            marketCapMult
        )
      : 0;

  // Word-of-mouth multiplier rewards beloved movies with long legs, while bad movies collapse fast
  const audienceReceptionBlend =
    expectedAudienceScore * 0.6 + expectedCriticScore * 0.4;
  const wordOfMouthLegs =
    audienceReceptionBlend >= 8.6
      ? 3.15
      : audienceReceptionBlend >= 7.8
      ? 2.65
      : audienceReceptionBlend >= 6.8
      ? 2.15
      : audienceReceptionBlend >= 5.6
      ? 1.7
      : 1.25;

  const trajectoryLegAdjust =
    trajectory === 'sleeper' ? 1.22 : trajectory === 'front_loaded' ? 0.88 : 1.0;

  const totalBoxOfficeRevenue =
    input.format === 'film'
      ? Math.round(firstWeekRevenue * wordOfMouthLegs * trajectoryLegAdjust)
      : 0;

  const episodeScale =
    input.format === 'series'
      ? episodes === 30
        ? 1.3
        : episodes === 15
        ? 1.14
        : episodes === 10
        ? 1.0
        : 0.86
      : 1.0;

  const seriesReceptionCurve = Math.pow(
    (expectedAudienceScore * 10 * 0.55 + technicalQuality * 0.45) / 74,
    1.25
  );

  const totalStreamingRevenue =
    input.format === 'series'
      ? Math.round(
          (input.platformDealAmount * 0.94 +
            15_500_000 *
              openingCommercialPower *
              seriesReceptionCurve *
              seasonMultiplier) *
            episodeScale *
            clampedAiMult *
            marketCapMult *
            twistMultiplier
        )
      : Math.round(
          input.platformDealAmount *
            0.55 *
            (expectedCriticScore >= 8.0
              ? 1.18
              : expectedCriticScore >= 6.8
              ? 1.02
              : 0.78) *
            clampedAiMult
        );

  const totalGrossRevenue = totalBoxOfficeRevenue + totalStreamingRevenue;

  // Enforce real financial cost for signed talent backend points (capped at 45% of gross revenue)
  const effectiveBackendRate = Math.min(
    0.45,
    Math.max(0, Number(input.totalBackendPointsPercent || 0)) / 100
  );
  const backendRoyaltiesTotal = Math.round(
    totalGrossRevenue * effectiveBackendRate
  );
  const netRevenueAfterRoyalties = Math.max(
    0,
    totalGrossRevenue - backendRoyaltiesTotal
  );

  return {
    technicalQuality,
    commercialAppeal,
    expectedCriticScore,
    expectedAudienceScore,
    trajectory,
    firstWeekRevenue,
    totalBoxOfficeRevenue,
    totalStreamingRevenue,
    totalGrossRevenue,
    backendRoyaltiesTotal,
    netRevenueAfterRoyalties,
    synergyReport,
    chemistryReport,
    distributionFeesTotal,
    simulationTwists,
  };
}

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
  facilitiesLevels?: Record<string, number>;
}): number {
  const {
    cash,
    reputation,
    releasedProjects,
    marketValueModifier = 0,
    facilitiesLevels,
  } = params;

  const baseEnterpriseBrand = 35_000_000 + reputation * 750_000;
  const catalogVal = releasedProjects.reduce((sum, proj) => {
    const libraryResidual = Math.round(proj.totalGrossRevenue * 0.42);
    const profitBonus = proj.netProfit > 0 ? Math.round(proj.netProfit * 0.45) : 0;
    const criticPrestige = proj.criticScore >= 7.5 ? 16_000_000 : 4_000_000;
    const awardsPrestige = (proj.awardsWon?.length || 0) * 14_000_000;
    return sum + libraryResidual + profitBonus + criticPrestige + awardsPrestige;
  }, 0);

  const facilitiesVal = facilitiesLevels
    ? Object.values(facilitiesLevels).reduce(
        (sum, lvl) => sum + Math.max(0, lvl - 1) * 18_000_000,
        0
      )
    : 0;

  return Math.max(
    40_000_000,
    Math.round(
      cash * 0.85 +
        baseEnterpriseBrand +
        catalogVal +
        facilitiesVal +
        marketValueModifier
    )
  );
}

export interface RivalRelease {
  id?: string;
  studioName: string;
  title: string;
  genre: string;
  leadStarName: string;
  directorName?: string;
  boxOfficeRevenue: number;
  targetBoxOfficeRevenue?: number;
  criticScore: number;
  audienceScore?: number;
  trajectory?: RevenueTrajectory;
  previousRank?: number;
  lastDailyDelta?: number;
  format?: ProjectFormat;
  year?: number;
  status?: 'released' | 'delayed';
  delayReason?: string;
}

export function generateRivalReleases(
  competitors: {
    id: string;
    name: string;
    market_power: number;
    preferred_genres: GenreId[];
  }[],
  allActors: ActorItem[],
  excludedActorIds: string[],
  regionMultiplier: number,
  seedOffset = 0,
  format: ProjectFormat = 'film',
  worldMarket: WorldMarketId = 'egypt',
  directors?: { name: string }[],
  uiLanguage: UiLanguageId = 'en'
): RivalRelease[] {
  const isEn = uiLanguage === 'en';
  const availableStars = allActors.filter(
    (a) =>
      !excludedActorIds.includes(a.id) &&
      (a.tier === 'S' || a.tier === 'A' || a.tier === 'B') &&
      a.status !== 'retired' &&
      a.status !== 'deceased'
  );
  const profile = getMarketProfile(worldMarket);
  const EN_RIVAL_FILMS: Partial<Record<WorldMarketId, string[]>> = {
    egypt: [
      'Cairo Underground',
      'The Nile Syndicate',
      'Operation Citadel',
      'Midnight on the Corniche',
      'Shadow of the Pharaoh',
      'The Downtown Alibi',
      'Alexandria Express',
      'Last Train to Aswan',
    ],
    saudi: [
      'Riyadh Horizon',
      'Dunes of Thunder',
      'The Diriyah Cipher',
      'Red Sea Protocol',
      'AlUla Reckoning',
      'Boulevard Heat',
      'Falcon of the Desert',
      'Jeddah Nightfall',
    ],
  };
  const EN_RIVAL_SERIES: Partial<Record<WorldMarketId, string[]>> = {
    egypt: [
      'The Zamalek Dynasty',
      'Alley of Secrets',
      'Empire of El-Hussein',
      'The Velvet Trial',
      'Nights of Heliopolis',
      'The Inheritance Pact',
      'Shadow of the Opera',
      'Blood & Jasmine',
    ],
    saudi: [
      'House of Najd',
      'The Diriyah Chronicles',
      'Crown of the Dunes',
      'Heirs of the Harbor',
      'Sands of Ambition',
      'The Riyadh Verdict',
      'Echoes of Al-Balad',
      'Oath of the Desert',
    ],
  };

  const titles = isEn
    ? format === 'series'
      ? EN_RIVAL_SERIES[worldMarket] || EN_RIVAL_SERIES.egypt!
      : EN_RIVAL_FILMS[worldMarket] || EN_RIVAL_FILMS.egypt!
    : format === 'series'
    ? profile.rivalSeriesTitles.length > 0
      ? profile.rivalSeriesTitles
      : getMarketProfile('egypt').rivalSeriesTitles
    : profile.rivalFilmTitles.length > 0
    ? profile.rivalFilmTitles
    : getMarketProfile('egypt').rivalFilmTitles;

  const activeSeasonCount = 4;
  const rotatedCompetitors = [...competitors].sort((a, b) => {
    const hashA = (a.name.charCodeAt(0) * 17 + seedOffset * 31) % 97;
    const hashB = (b.name.charCodeAt(0) * 17 + seedOffset * 31) % 97;
    return hashB - hashA;
  });

  const selectedStudios = rotatedCompetitors.slice(0, activeSeasonCount);

  // Distinct realistic season archetypes:
  // 0: Commercial Popcorn Hit (modest critics 5.8-6.9, strong box office, front_loaded)
  // 1: Prestige / Sleeper Gem (great critics 8.4-9.2, slower opening, climbs dynamically!)
  // 2: Balanced Blockbuster Contender (solid critics 7.4-8.4, strong steady legs)
  // 3: Underperformer / Mid-Tier Mixed Release (weak/mixed critics 4.7-6.4, modest revenue)
  const archetypeOrder = [0, 1, 2, 3].map((i) => (i + seedOffset) % 4);

  return selectedStudios.map((studio, idx) => {
    const star =
      availableStars[(idx * 3 + seedOffset) % Math.max(1, availableStars.length)] ||
      allActors[0];
    const dir =
      directors && directors.length > 0
        ? directors[(idx * 2 + seedOffset) % directors.length]
        : undefined;
    const title = titles[(idx * 3 + seedOffset) % titles.length];
    const arch = archetypeOrder[idx % archetypeOrder.length];
    const localizedStudioName = localizeEntityName(studio.name, uiLanguage);
    const localizedStarName = star?.name
      ? localizeEntityName(star.name, uiLanguage)
      : isEn
      ? 'A-List Star'
      : 'نجم شباك';
    const localizedDirectorName = dir?.name
      ? localizeEntityName(dir.name, uiLanguage)
      : undefined;

    const isRareDelay =
      (seedOffset + idx * 7) % 13 === 0 && idx === selectedStudios.length - 1;
    if (isRareDelay) {
      return {
        studioName: localizedStudioName,
        title,
        genre: studio.preferred_genres[0] || 'action',
        leadStarName: localizedStarName,
        directorName: localizedDirectorName,
        boxOfficeRevenue: 0,
        criticScore: 0,
        audienceScore: 0,
        trajectory: 'steady',
        format,
        status: 'delayed',
        delayReason: isEn
          ? `${localizedStudioName} postponed "${title}" to next season to finalize post-production.`
          : `قررت شركة «${studio.name}» تأجيل طرح «${title}» للموسم القادم لاستكمال مراحل المونتاج.`,
      };
    }

    const powerFactor = Math.max(0.82, Math.min(1.18, studio.market_power / 82));
    const starPull = Math.max(0.84, Math.min(1.18, (star?.stats.box_office_pull || 82) / 84));
    const regionMod = Math.max(0.95, Math.min(1.3, regionMultiplier));
    const jitter = 0.88 + (((seedOffset * 19 + idx * 37) % 25) / 100);
    const baseMarketAnchor = format === 'series' ? 74_000_000 : 66_000_000;

    let revMult = 1.0;
    let criticScore = 7.4;
    let audienceScore = 7.5;
    let trajectory: RevenueTrajectory = 'steady';

    if (arch === 0) {
      // Popcorn commercial juggernaut: mediocre critics, huge opening crowds, front-loaded decay
      revMult = 1.48;
      criticScore = 5.7 + ((seedOffset + idx) % 12) * 0.1;
      audienceScore = 7.8 + ((seedOffset + idx) % 10) * 0.1;
      trajectory = 'front_loaded';
    } else if (arch === 1) {
      // Prestige sleeper hit: acclaimed critics, modest opening, strong word-of-mouth climb
      revMult = 1.02;
      criticScore = 8.4 + ((seedOffset + idx) % 9) * 0.1;
      audienceScore = 8.2 + ((seedOffset + idx) % 10) * 0.1;
      trajectory = 'sleeper';
    } else if (arch === 2) {
      // Balanced contender
      revMult = 1.24;
      criticScore = 7.3 + ((seedOffset + idx) % 11) * 0.1;
      audienceScore = 7.6 + ((seedOffset + idx) % 11) * 0.1;
      trajectory = 'steady';
    } else {
      // Underperforming / mid-tier risk
      revMult = 0.62;
      criticScore = 4.6 + ((seedOffset + idx) % 16) * 0.1;
      audienceScore = 5.0 + ((seedOffset + idx) % 15) * 0.1;
      trajectory = 'front_loaded';
    }

    const baseRev =
      baseMarketAnchor * powerFactor * starPull * regionMod * revMult * jitter;

    return {
      studioName: localizedStudioName,
      title,
      genre: studio.preferred_genres[0] || 'action',
      leadStarName: localizedStarName,
      directorName: localizedDirectorName,
      boxOfficeRevenue: Math.round(Math.max(24_000_000, Math.min(175_000_000, baseRev))),
      criticScore: Number(Math.min(9.4, Math.max(4.4, criticScore)).toFixed(1)),
      audienceScore: Number(Math.min(9.5, Math.max(4.5, audienceScore)).toFixed(1)),
      trajectory,
      format,
      status: 'released',
    };
  });
}

export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const val = Number((abs / 1_000_000_000).toFixed(2));
    return `${sign}${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = Number((abs / 1_000_000).toFixed(1));
    return `${sign}${val}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}${abs}`;
}

export function formatCurrency(
  amount: number,
  worldMarket?: WorldMarketId | null
): string {
  return `${formatMoney(amount)} ${getCurrencyLabel(worldMarket)}`;
}
