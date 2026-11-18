import { ActorItem, CrewItem, GenreId } from './db-resolver';
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

const HARMONIOUS_PAIRS: [GenreId, GenreId, string][] = [
  ['action', 'popular_drama', 'مزيج جماهيري قوي: أكشن + دراما شعبية'],
  ['action', 'heist', 'مزيج تشويقي: أكشن + سرقة وخطط'],
  ['crime_mystery', 'psychological_horror', 'مزيج نفسي عميق: جريمة وغموض + رعب نفسي'],
  ['comedy', 'romance', 'مزيج عائلي محبوب: كوميديا + رومانسي'],
  ['light_comedy', 'romance', 'كوميديا رومانسية خفيفة وجذابة'],
  ['sci_fi', 'action', 'إثارة مستقبلية: خيال علمي + أكشن'],
  ['historical', 'biography', 'ملحمة توثيقية: تاريخي + سيرة ذاتية'],
  ['fantasy', 'superhero', 'ملحمة خيالية: فانتازيا + أبطال خارقون'],
  ['supernatural_horror', 'crime_mystery', 'تحقيقات غامضة: ما وراء الطبيعة + جريمة'],
];

const CLASHING_PAIRS: [GenreId, GenreId, string][] = [
  ['historical', 'sci_fi', 'مزيج تجريبي غير تقليدي: تاريخي + خيال علمي'],
  ['light_comedy', 'psychological_horror', 'مزيج متباين: كوميديا خفيفة + رعب نفسي'],
  ['biography', 'superhero', 'مزيج غير مألوف: سيرة ذاتية + أبطال خارقون'],
  ['popular_drama', 'sci_fi', 'مزيج مغامر: دراما شعبية + خيال علمي'],
];

export function calculateGenreSynergy(
  primary: GenreId,
  secondary: GenreId | null,
  directorSkill: number,
  writerSkill: number
): GenreSynergyResult {
  if (!secondary || primary === secondary) {
    return {
      multiplier: 1.0,
      label: 'تصنيف منفرد متوازن',
      isHarmonious: true,
      score: 10,
    };
  }

  for (const [g1, g2, desc] of HARMONIOUS_PAIRS) {
    if (
      (primary === g1 && secondary === g2) ||
      (primary === g2 && secondary === g1)
    ) {
      return {
        multiplier: 1.15,
        label: desc,
        isHarmonious: true,
        score: 18,
      };
    }
  }

  for (const [g1, g2, desc] of CLASHING_PAIRS) {
    if (
      (primary === g1 && secondary === g2) ||
      (primary === g2 && secondary === g1)
    ) {
      if (directorSkill >= 90 && writerSkill >= 90) {
        return {
          multiplier: 1.22,
          label: `${desc} (معالجة عبقرية بفضل مهارة الطاقم)`,
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
    label: 'دمج درامي متكامل',
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
  directorControl = 85
): CastChemistryReport {
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
      warningMessage: `صراع نجومية محتمل بين (${highEgoStars
        .map((s) => s.name)
        .join(' و ')})! يفضل التعاقد مع مخرج ذي شخصية قيادية قوية (تحكم +88).`,
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
  } = params;

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
  let roleFitVerdict = 'حجم الدور مناسب تماماً لمكانة الفنان في السوق';

  if (isActor) {
    if (roleBillingSize === 'supporting') {
      if (starTier === 'S' || overall >= 89 || ego >= 86) {
        roleFitScore = 18;
        roleFitVerdict =
          'مرفوض فنياً: نجم صف أول (فئة S) لا يقبل بدور مساعد أو ثانوي على الأفيش';
      } else if (starTier === 'A' || overall >= 83) {
        roleFitScore = 52;
        roleFitVerdict =
          'حجم الدور أصغر من مكانة النجم المعتادة ويتطلب إغراءً مالياً وفنياً كبيراً';
      } else {
        roleFitScore = 92;
        roleFitVerdict = 'فرصة ممتازة ومناسبة جداً لتثبيت أقدام الممثل في السوق';
      }
    } else if (roleBillingSize === 'lead_star') {
      if (starTier === 'S' || starTier === 'A') {
        roleFitScore = 96;
        roleFitVerdict =
          'البطولة المطلقة تناسب تماماً نجومية الفنان وتاريخه في شباك التذاكر';
      } else if (starTier === 'B') {
        roleFitScore = 90;
        roleFitVerdict = 'فرصة ذهبية للبطولة المطلقة يتحمس لها الفنان بشدة';
      } else {
        roleFitScore = 95;
        roleFitVerdict =
          'بطولة مطلقة استثنائية تمنح الموهبة الصاعدة انطلاقة كبرى';
      }
    } else if (roleBillingSize === 'co_lead') {
      if (starTier === 'S' && ego >= 91) {
        roleFitScore = 68;
        roleFitVerdict =
          'النجم يفضل البطولة المطلقة المنفردة لكنه قد يقبل البطولة المشتركة بشروط قوية';
      } else {
        roleFitScore = 90;
        roleFitVerdict = 'البطولة المشتركة تمنح توازناً درامياً جذاباً للفنان';
      }
    } else if (roleBillingSize === 'antagonist') {
      if (starTier === 'S' && ego >= 92) {
        roleFitScore = 70;
        roleFitVerdict =
          'النجم يشترط أن تكون مساحة الشرير المحوري موازية للبطل على الأفيش';
      } else {
        roleFitScore = 91;
        roleFitVerdict = 'دور الشرير المحوري يمثل تحدياً تمثيلياً مغرياً للفنان';
      }
    } else if (roleBillingSize === 'cameo') {
      roleFitScore = 88;
      roleFitVerdict =
        'ظهور خاص كضيف شرف لا يتطلب تفرغاً طويلاً ويضيف ثقلاً للعمل';
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
      detailedReason: `أعتذر عن المشاركة في «${projectTitle}»؛ مكانتي الفنية وتاريخي كبطل صف أول لا يسمحان بقبول دور ثانٍ أو مساعد، ولا أشارك إلا في بطولة العمل أو كضيف شرف استثنائي.`,
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
      detailedReason: `قرأت ملخص «${projectTitle}»، لكن المعالجة الدرامية وتفاصيل الدور لا تزال مختصرة جداً ولا توضح أبعاد الشخصية الكافية للمغامرة بقبول العمل حالياً.`,
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
      detailedReason: `تصنيف (${genreName}) في «${projectTitle}» بعيد عن منطقتي الفنية المعتادة، ولا يمكنني خوض هذه المجازفة دون جلسة عمل خاصة أو تقدير مالي يعوض هذه النقلة.`,
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

  const roleBillingLabel = isActor
    ? ROLE_BILLING_META[roleBillingSize]?.label.split(' ')[0] || 'الدور'
    : 'قيادة العمل';

  if (willAccept) {
    const directorClause = directorName
      ? ` ووجود المخرج ${directorName}`
      : '';
    const dinnerClause = vipDinner
      ? ' وبعد جلسة القراءة الخاصة وعشاء العمل،'
      : '';
    return {
      willAccept: true,
      expectedMinimumSalary,
      roleFitScore,
      artisticFitScore,
      financialRatio,
      roleFitVerdict,
      rejectionCategory: 'none',
      detailedReason: `أعجبتني مساحة الدور (${customRoleDescription || roleBillingLabel}) في سيناريو «${projectTitle}»${directorClause}،${dinnerClause} والعرض المالي (${formatMoney(offeredSalary)} ج.م${backendPoints > 0 ? ` + ${backendPoints}% من الأرباح` : ''}) يعكس تقديراً احترافياً لمكانتي الفنية. يسعدني التوقيع معكم!`,
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
      detailedReason: `دور «${customRoleDescription || 'مساعد'}» في «${projectTitle}» مساحته الدرامية أقل من البطولات التي أقدمها حالياً، ولا يمكنني قبوله بهذا الأجر دون رفع مساحة الدور إلى بطولة أو زيادة العرض المالي ونسبة الأرباح.`,
    };
  }

  return {
    willAccept: false,
    expectedMinimumSalary,
    roleFitScore,
    artisticFitScore,
    financialRatio,
    roleFitVerdict,
    rejectionCategory: 'underpaid',
    detailedReason: `رغم اهتمامي بفكرة «${projectTitle}» ودور «${customRoleDescription || roleBillingLabel}»، إلا أن العرض المالي (${formatMoney(offeredSalary)} ج.م) أقل من أجري السوقي المتوقع (${formatMoney(expectedMinimumSalary)} ج.م) لحجم التفرغ المطلوب.`,
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
  selectedDistributionMarkets?: MarketRegion[];
  scriptWordCount?: number;
  previousGenres?: GenreId[];
  entropySeed?: number;
}

export interface ProjectFinancialResult {
  technicalQuality: number;
  commercialAppeal: number;
  firstWeekRevenue: number;
  totalBoxOfficeRevenue: number;
  totalStreamingRevenue: number;
  totalGrossRevenue: number;
  synergyReport: GenreSynergyResult;
  chemistryReport: CastChemistryReport;
  distributionFeesTotal: number;
  simulationTwists: SimulationTwistItem[];
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
  superhero: { sets: 10_000_000, costumes: 7_500_000, vfx: 17_000_000, extras: 6_500_000 },
};

export function calculateFinancialsAndQuality(
  input: ProjectSimulationInput
): ProjectFinancialResult {
  const activeMarkets: MarketRegion[] =
    input.selectedDistributionMarkets &&
    input.selectedDistributionMarkets.length > 0
      ? input.selectedDistributionMarkets
      : [input.marketRegion || 'egypt'];

  let combinedRevenueMultiplier = 1.0;
  let distributionFeesTotal = 0;

  for (const mId of activeMarkets) {
    const cfg = MARKET_CONFIGS.find((m) => m.id === mId);
    if (!cfg) continue;
    if (mId !== 'egypt') {
      combinedRevenueMultiplier += cfg.revenueBonusFactor;
      distributionFeesTotal += cfg.distributionFeePerProject;
    }
  }

  const words = input.scriptWordCount ?? 20;
  const playerScriptCraft =
    words >= 32 ? 92 : words >= 22 ? 86 : words >= 14 ? 80 : words >= 8 ? 72 : 62;

  const synergyReport = calculateGenreSynergy(
    input.primaryGenre,
    input.secondaryGenre,
    input.director.stats.vision,
    playerScriptCraft
  );

  const mainCast = [
    ...input.leads,
    ...(input.antagonist ? [input.antagonist] : []),
    ...input.supporting,
  ];
  const chemistryReport = evaluateCastChemistry(
    mainCast,
    input.director.stats.control
  );

  const castActingAvg =
    mainCast.length > 0
      ? mainCast.reduce((s, a) => {
          const mastery = a.genre_mastery[input.primaryGenre] || 72;
          const secondaryMastery = input.secondaryGenre
            ? a.genre_mastery[input.secondaryGenre] || 70
            : mastery;
          const blendedMastery = input.secondaryGenre
            ? mastery * 0.7 + secondaryMastery * 0.3
            : mastery;
          return s + a.stats.acting * 0.52 + blendedMastery * 0.48;
        }, 0) / mainCast.length
      : 68;

  const castPullAvg =
    mainCast.length > 0
      ? mainCast.reduce(
          (s, a) => s + a.stats.box_office_pull * 0.65 + a.stats.charisma * 0.35,
          0
        ) / mainCast.length
      : 65;

  const cameoBoost = input.cameos.reduce(
    (s, c) => s + c.stats.charisma * 0.05,
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
  const setsRatio = Math.min(1.35, input.budgetAllocation.setsAndLocations / reqs.sets);
  const costumesRatio = Math.min(1.35, input.budgetAllocation.costumesAndMakeup / reqs.costumes);
  const vfxRatio = Math.min(1.35, input.budgetAllocation.vfxAndStunts / reqs.vfx);
  const extrasRatio = Math.min(1.35, input.budgetAllocation.extrasAndCrowds / reqs.extras);

  const avgDeptAdequacy = (setsRatio + costumesRatio + vfxRatio + extrasRatio) / 4;
  const departmentQualityDelta =
    avgDeptAdequacy >= 1.1
      ? 6
      : avgDeptAdequacy >= 0.85
      ? 2
      : avgDeptAdequacy >= 0.65
      ? -3
      : -8;

  const productionQualityScore = Math.min(
    96,
    46 + (productionSpend / 52_000_000) * 48
  );

  const directorGenreFit = input.director.best_genres.includes(
    input.primaryGenre
  )
    ? 1.08
    : 0.94;

  const crewTechBonus =
    (input.dop ? (input.dop.stats.overall - 75) * 0.16 : -2) +
    (input.composer ? (input.composer.stats.overall - 75) * 0.14 : -1.5) +
    (input.vfx ? (input.vfx.stats.overall - 75) * 0.16 : -2);

  const ensembleDepthBonus =
    (input.antagonist ? 2.5 : 0) +
    Math.min(3, input.supporting.length * 1.5);

  const scriptPenalty = words < 8 ? -9 : words < 14 ? -3 : words >= 24 ? 4 : 1;
  const onSetQualityMod = input.qualityModifier || 0;

  let rawQuality =
    (input.director.stats.overall * 0.27 * directorGenreFit +
      playerScriptCraft * 0.16 +
      castActingAvg * 0.35 +
      productionQualityScore * 0.22 +
      chemistryReport.synergyBonus * 0.4 +
      crewTechBonus +
      departmentQualityDelta +
      ensembleDepthBonus +
      scriptPenalty +
      onSetQualityMod) *
    synergyReport.multiplier;

  if (input.founderPerk === 'visionary_director') {
    rawQuality *= 1.08;
  }

  if (input.ageRating === '+18') {
    rawQuality += 2.5;
  }

  const technicalQuality = Math.min(96, Math.max(32, Math.round(rawQuality)));

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
        impactMultiplier: 0.85,
      });
      twistMultiplier *= 0.85;
    } else if (repeatedCount === 0) {
      simulationTwists.push({
        id: 'genre_fresh_wave',
        label: 'موجة انتعاش جماهيري لتقديم لون درامي متجدد',
        impactMultiplier: 1.12,
      });
      twistMultiplier *= 1.12;
    }
  }

  const idealMarketingForScreens = input.screensCount * 85_000;
  const marketingEfficiency =
    input.marketingBudget >= idealMarketingForScreens * 0.8
      ? 1.06
      : input.marketingBudget < idealMarketingForScreens * 0.4
      ? 0.88
      : 1.0;

  const marketingBoost = 0.84 + (input.marketingBudget / 45_000_000) * 0.48;
  const screensBoost =
    input.format === 'film'
      ? (0.68 + (input.screensCount / 220) * 0.56) * marketingEfficiency
      : 1.0;

  const ageRatingCommercialMod =
    input.ageRating === 'G' ? 1.12 : input.ageRating === '+18' ? 0.82 : 1.0;

  const filmSeason = input.filmSeason || 'eid_adha';
  const seriesSeason = input.seriesSeason || 'ramadan';
  const episodes = input.episodes || 15;

  const seasonMultiplier =
    input.format === 'film'
      ? filmSeason === 'eid_adha'
        ? 1.25
        : filmSeason === 'eid_fitr'
        ? 1.18
        : filmSeason === 'summer'
        ? 1.1
        : 0.94
      : seriesSeason === 'ramadan'
      ? 1.28
      : 1.0;

  const commercialAppeal = Math.min(
    98,
    Math.round(
      (castPullAvg * 0.52 +
        input.hypeScore * 0.3 +
        technicalQuality * 0.18 +
        cameoBoost) *
        ageRatingCommercialMod
    )
  );

  const qualityCurve = Math.pow(technicalQuality / 76, 1.48);
  const appealCurve = Math.pow(commercialAppeal / 76, 1.32);

  const baseTicketRevenue =
    input.format === 'film'
      ? 16_500_000 *
        qualityCurve *
        appealCurve *
        marketingBoost *
        screensBoost *
        seasonMultiplier *
        twistMultiplier
      : 0;

  const perkMarketingMod =
    input.founderPerk === 'marketing_whale' ? 1.1 : 1.0;

  const clampedAiMult = Math.min(
    1.32,
    Math.max(0.38, input.aiBoxOfficeMultiplier)
  );

  const marketCapMult = Math.min(1.42, combinedRevenueMultiplier);

  const firstWeekRevenue =
    input.format === 'film'
      ? Math.round(
          baseTicketRevenue *
            0.33 *
            perkMarketingMod *
            clampedAiMult *
            marketCapMult
        )
      : 0;

  const wordOfMouthLegs =
    technicalQuality >= 86
      ? 2.85
      : technicalQuality >= 76
      ? 2.35
      : technicalQuality >= 65
      ? 1.85
      : 1.3;

  const totalBoxOfficeRevenue =
    input.format === 'film'
      ? Math.round(firstWeekRevenue * wordOfMouthLegs)
      : 0;

  const episodeScale =
    input.format === 'series'
      ? episodes === 30
        ? 1.28
        : episodes === 15
        ? 1.12
        : episodes === 10
        ? 1.0
        : 0.86
      : 1.0;

  const totalStreamingRevenue =
    input.format === 'series'
      ? Math.round(
          (input.platformDealAmount * 0.92 +
            14_500_000 * qualityCurve * appealCurve * seasonMultiplier) *
            episodeScale *
            clampedAiMult *
            marketCapMult *
            twistMultiplier
        )
      : Math.round(
          input.platformDealAmount *
            0.55 *
            (technicalQuality >= 76 ? 1.08 : 0.78) *
            clampedAiMult
        );

  const totalGrossRevenue = totalBoxOfficeRevenue + totalStreamingRevenue;

  return {
    technicalQuality,
    commercialAppeal,
    firstWeekRevenue,
    totalBoxOfficeRevenue,
    totalStreamingRevenue,
    totalGrossRevenue,
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
  format?: ProjectFormat;
  year?: number;
  status?: 'released' | 'delayed';
  delayReason?: string;
}

const RIVAL_FILM_TITLES = [
  'الرصاصة الذهبية',
  'ولاد الحارة 4',
  'كازابلانكا الجديدة',
  'الفيل الأزرق 3',
  'الهروب من طرة',
  'شمس الزناتي الجديد',
  'صقر الصعيد',
  'ليلة سقوط القناع',
  'خطة جهنمية',
  'الممر السري',
];

const RIVAL_SERIES_TITLES = [
  'الاختيار الحاسم',
  'الحشاشين: العهد الجديد',
  'جعفر العمدة 2',
  'لعبة نيوتن الجديدة',
  'تحت الوصاية الكاملة',
  'الكتيبة 102',
  'سر الغرفة 207',
  'الكبير أوي 9',
];

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
  format: ProjectFormat = 'film'
): RivalRelease[] {
  const availableStars = allActors.filter(
    (a) =>
      !excludedActorIds.includes(a.id) &&
      (a.tier === 'S' || a.tier === 'A') &&
      a.status !== 'retired' &&
      a.status !== 'deceased'
  );
  const titles = format === 'series' ? RIVAL_SERIES_TITLES : RIVAL_FILM_TITLES;

  const activeSeasonCount = (seedOffset % 2) + 2;
  const rotatedCompetitors = [...competitors].sort((a, b) => {
    const hashA = (a.name.charCodeAt(0) * 17 + seedOffset * 31) % 97;
    const hashB = (b.name.charCodeAt(0) * 17 + seedOffset * 31) % 97;
    return hashB - hashA;
  });

  const selectedStudios = rotatedCompetitors.slice(0, activeSeasonCount);

  return selectedStudios.map((studio, idx) => {
    const star =
      availableStars[(idx + seedOffset) % Math.max(1, availableStars.length)] ||
      allActors[0];
    const title = titles[(idx * 3 + seedOffset) % titles.length];

    const isRareDelay =
      (seedOffset + idx * 7) % 11 === 0 && idx === selectedStudios.length - 1;
    if (isRareDelay) {
      return {
        studioName: studio.name,
        title,
        genre: studio.preferred_genres[0] || 'action',
        leadStarName: star?.name || 'نجم شباك',
        boxOfficeRevenue: 0,
        criticScore: 0,
        format,
        status: 'delayed',
        delayReason: `قررت شركة «${studio.name}» تأجيل طرح «${title}» للموسم القادم لاستكمال مراحل المونتاج.`,
      };
    }

    const powerFactor = Math.max(0.95, studio.market_power / 80);
    const starPull = Math.max(0.95, (star?.stats.box_office_pull || 88) / 82);
    const wave = idx === 0 ? 1.32 : idx === 1 ? 1.05 : 0.84;
    const baseMarketAnchor = format === 'series' ? 88_000_000 : 76_000_000;
    const baseRev =
      baseMarketAnchor *
      powerFactor *
      starPull *
      Math.max(1.0, Math.min(1.35, regionMultiplier)) *
      wave;

    const criticBase =
      7.1 +
      ((studio.market_power - 72) / 25) * 1.35 +
      (idx === 0 ? 0.65 : idx === 1 ? 0.25 : -0.15);

    return {
      studioName: studio.name,
      title,
      genre: studio.preferred_genres[0] || 'action',
      leadStarName: star?.name || 'نجم شباك',
      boxOfficeRevenue: Math.round(baseRev),
      criticScore: Number(Math.min(9.3, Math.max(6.4, criticBase)).toFixed(1)),
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
