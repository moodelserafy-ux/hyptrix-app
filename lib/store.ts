import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import {
  MarketRegion,
  MARKET_CONFIGS,
  FounderPerk,
  ProjectFormat,
  SeriesEpisodes,
  SeriesSeason,
  FilmReleaseSeason,
  AgeRating,
  ProductionBudgetAllocation,
  RivalRelease,
  formatMoney,
  calculateStudioMarketValue,
  generateRivalReleases,
  RoleBillingSize,
  VIP_DINNER_COST,
} from './game-engine';
import {
  GenreId,
  MasterDatabase,
  CUSTOM_DB_STORAGE_KEY,
  ActorItem,
  CompetitorStudio,
  getResolvedDatabase,
} from './db-resolver';
import {
  verifyAndRecordServerTransaction,
  fetchAuthoritativeStudioWallet,
  getOrCreateStudioInstanceId,
} from './supabase';

export const DAYS_PER_GAME_YEAR = 120; // 10 game days per month × 12 months

export interface StudioFixedAssetItem {
  id: string;
  name: string;
  categoryLabel: string;
  price: number;
  marketValueBoost: number;
  costDiscountPercent: number;
  qualityBonus: number;
  hypeBonus: number;
  crisisShieldLabel: string;
  description: string;
}

export const STUDIO_FIXED_ASSETS: StudioFixedAssetItem[] = [
  {
    id: 'soundstage_complex',
    name: 'مجمع بلاتوهات التصوير الخاصة',
    categoryLabel: 'بنية تحتية واستوديوهات',
    price: 28_000_000,
    marketValueBoost: 38_000_000,
    costDiscountPercent: 12,
    qualityBonus: 4,
    hypeBonus: 3,
    crisisShieldLabel: 'حماية فورية من أزمات المواقع والديكور وتأخر التصاريح الميدانية',
    description:
      'امتلاك بلاتوهات داخلية وخارجية مجهزة بالكامل يخفض تكلفة الديكور والمواقع في كافة أعمالك القادمة بنسبة 12% ويحميك مجاناً من أزمات البلاتوه.',
  },
  {
    id: 'vfx_post_suite',
    name: 'وحدة مونتاج ومؤثرات بصرية وتلوين دولية',
    categoryLabel: 'ما بعد الإنتاج والمؤثرات',
    price: 22_000_000,
    marketValueBoost: 30_000_000,
    costDiscountPercent: 10,
    qualityBonus: 6,
    hypeBonus: 4,
    crisisShieldLabel: 'حسم مجاني لأزمات الجرافيكس والمونتاج وتلف النسخ المصورة',
    description:
      'غرف مونتاج وتصحيح ألوان وسيرفرات مؤثرات خاصة تقلل تكاليف الجرافيكس والأكشن 10% وتمنح كل عمل +6 نقاط جودة فنية.',
  },
  {
    id: 'cinema_camera_fleet',
    name: 'أسطول كاميرات وعدسات سينمائية IMAX',
    categoryLabel: 'معدات تصوير وإضاءة',
    price: 16_000_000,
    marketValueBoost: 22_000_000,
    costDiscountPercent: 8,
    qualityBonus: 5,
    hypeBonus: 2,
    crisisShieldLabel: 'حماية كاملة من أعطال الكاميرات والإضاءة والصوت في موقع التصوير',
    description:
      'تملك أحدث الكاميرات والعدسات السينمائية بدلاً من إيجارها لكل فيلم، مما يوفر 8% من ميزانية الإنتاج ويرفع جودة الصورة.',
  },
  {
    id: 'legal_censorship_shield',
    name: 'القطاع القانوني ومكتب العلاقات الرقابية',
    categoryLabel: 'حماية قانونية وتراخيص',
    price: 14_000_000,
    marketValueBoost: 18_000_000,
    costDiscountPercent: 5,
    qualityBonus: 2,
    hypeBonus: 4,
    crisisShieldLabel: 'تحييد فوري لأزمات الرقابة والدعاوى القضائية وخلافات العقود',
    description:
      'فريق مستشارين قانونيين يحسم أي نزاع رقابي أو أزمة عقود في البلاتوه بصفر تكلفة إضافية ويحمي سمعة الاستوديو.',
  },
  {
    id: 'talent_academy',
    name: 'أكاديمية تدريب الأبطال وورش التمثيل',
    categoryLabel: 'تطوير مواهب وبروفات',
    price: 19_000_000,
    marketValueBoost: 25_000_000,
    costDiscountPercent: 7,
    qualityBonus: 4,
    hypeBonus: 6,
    crisisShieldLabel: 'منع أزمات إرهاق الممثلين وتأخر البروفات ومشاكل الأداء',
    description:
      'مركز بروفات وتأهيل بدني وتمثيلي يرفع جاهزية النجوم ويوفر 7% من نفقات التحضير والملابس والمجاميع.',
  },
];

export function getStudioAssetBenefits(ownedAssets: string[] = []) {
  const ownedItems = STUDIO_FIXED_ASSETS.filter((a) =>
    ownedAssets.includes(a.id)
  );
  const totalDiscountPercent = Math.min(
    35,
    ownedItems.reduce((sum, item) => sum + item.costDiscountPercent, 0)
  );
  const totalQualityBonus = ownedItems.reduce(
    (sum, item) => sum + item.qualityBonus,
    0
  );
  const totalHypeBonus = ownedItems.reduce(
    (sum, item) => sum + item.hypeBonus,
    0
  );
  const totalMarketValueBoost = ownedItems.reduce(
    (sum, item) => sum + item.marketValueBoost,
    0
  );
  return {
    ownedItems,
    totalDiscountPercent,
    costMultiplier: Number((1 - totalDiscountPercent / 100).toFixed(2)),
    totalQualityBonus,
    totalHypeBonus,
    totalMarketValueBoost,
  };
}

export interface SocialPrCampaignItem {
  id:
    | 'support_film_trolls'
    | 'rival_rumor_trolls'
    | 'tiktok_viral_wave'
    | 'x_hashtag_storm'
    | 'rival_smear_campaign'
    | 'critics_vip_screening';
  title: string;
  platform: 'TikTok' | 'X' | 'Mix';
  cost: number;
  type: 'boost_player' | 'attack_rival';
  badgeLabel: string;
  impactSummary: string;
  description: string;
}

export const SOCIAL_PR_CAMPAIGNS: SocialPrCampaignItem[] = [
  {
    id: 'support_film_trolls',
    title: 'توجيه اللجان لدعم الفيلم (يكلف 2 مليون)',
    platform: 'Mix',
    cost: 2_000_000,
    type: 'boost_player',
    badgeLabel: 'لجان الدعم السريع · 2 مليون ج.م',
    impactSummary: '+12 ضجة جماهيرية · قلب تعليقات السوشيال لإشادات حماسية فورية',
    description:
      'ضخ آلاف الحسابات والتعليقات الإيجابية على X وتيك توك للإشادة بفيلمك وتحويل دفة الجمهور لصالحك فوراً.',
  },
  {
    id: 'rival_rumor_trolls',
    title: 'نشر إشاعة عن فيلم المنافس (يكلف 5 مليون)',
    platform: 'X',
    cost: 5_000_000,
    type: 'attack_rival',
    badgeLabel: 'حرب الإشاعات · 5 مليون ج.م',
    impactSummary: '-18% إيرادات المنافس · -35M من قيمة الشركة المنافسة · تصدر التريند',
    description:
      'إطلاق شائعات مسربة عن مشاكل داخل بلاتوه الفيلم المنافس وضعف قصته لسحب الجمهور نحو قاعات عرضك.',
  },
  {
    id: 'tiktok_viral_wave',
    title: 'حملة مشاهد ومقاطع تريند على TikTok',
    platform: 'TikTok',
    cost: 4_500_000,
    type: 'boost_player',
    badgeLabel: 'تيك توك · #1 تريند المشاهدات',
    impactSummary: '+15 ضجة جماهيرية · +0.5 تقييم جمهور · +12% دفعة إيرادات',
    description:
      'تمويل صناع المحتوى لنشر أقوى مشاهد وكواليس عملك على تيك توك لجذب جمهور الشباب والعائلات لقاعات العرض والمنصات.',
  },
  {
    id: 'x_hashtag_storm',
    title: 'عاصفة هاشتاج متصدر على منصة X',
    platform: 'X',
    cost: 6_000_000,
    type: 'boost_player',
    badgeLabel: 'منصة X · تصدر النقاشات الفنية',
    impactSummary: '+18 ضجة جماهيرية · +14M قيمة سوقية · +15% دفعة شباك تذاكر',
    description:
      'إطلاق حملة حسابات ترويجية واسعة على إكس لتصدير اسم عملك واستوديوك في المركز الأول بالتريند المصري والعربي.',
  },
  {
    id: 'rival_smear_campaign',
    title: 'حملة لجان إلكترونية مضادة لضرب المنافسين',
    platform: 'Mix',
    cost: 8_500_000,
    type: 'attack_rival',
    badgeLabel: 'حرب تكسير عظام · ضرب المنافسين',
    impactSummary: '-22% إيرادات المنافس · -48M من قيمة الشركة المنافسة · تقدم في الترتيب',
    description:
      'توجيه لجان إلكترونية على X وتيك توك لكشف ثغرات العمل المنافس وإثارة الجدل حوله لسحب البساط الجماهيري لصالحك.',
  },
  {
    id: 'critics_vip_screening',
    title: 'عرض خاص لكبار النقاد والمؤثرين السينمائيين',
    platform: 'X',
    cost: 5_500_000,
    type: 'boost_player',
    badgeLabel: 'علاقات عامة VIP · إشادات نقدية',
    impactSummary: '+0.6 تقييم النقاد · +4% سمعة الاستوديو · +10 ضجة جماهيرية',
    description:
      'تنظيم عرض سجادة حمراء خاص لأبرز نقاد السينما وكتاب الرأي لرفع التقييم النقدي وتعزيز فرص العمل في جوائز نهاية العام.',
  },
];

export interface LiveSocialFeedPost {
  id: string;
  platform: 'X' | 'TikTok';
  authorName: string;
  handle: string;
  content: string;
  hashtag: string;
  likes: string;
  shares: string;
  sentiment: 'viral_boost' | 'rival_attack';
  timestampLabel: string;
}

// Hybrid IndexedDB + localStorage storage adapter
const hybridStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const localVal = window.localStorage.getItem(name);
      if (localVal) return localVal;
      const idbVal = await idbGet<string>(name);
      return idbVal || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
      await idbSet(name, value);
    } catch {
      // Fallback
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
      await idbDel(name);
    } catch {
      // Fallback
    }
  },
};

export type CoreEmblemId =
  | 'winged_lion'
  | 'classic_camera'
  | 'golden_scorpion'
  | 'royal_crown'
  | 'glowing_pyramid'
  | 'film_reel'
  | 'falcon'
  | 'theater_mask'
  | 'cinema_star'
  | 'pro_lens'
  | 'phoenix_crest'
  | 'crystal_diamond'
  | 'clapper_shield'
  | 'pegasus_wings'
  | 'sphinx_monument'
  | 'oscar_torch'
  | 'griffin_royal'
  | 'sunburst_eye';

export type LogoFrameId =
  | 'royal_shield'
  | 'laurel_wreath'
  | 'neon_circle'
  | 'hex_geometry'
  | 'no_frame'
  | 'art_deco_arch'
  | 'octagon_crest'
  | 'double_diamond';

export type LogoPaletteId =
  | 'gold_black'
  | 'crimson_silver'
  | 'cyber_purple'
  | 'emerald_white'
  | 'fire_slate'
  | 'royal_ivory'
  | 'sapphire_gold'
  | 'rose_champagne'
  | 'amethyst_pearl'
  | 'teal_copper';

export interface StudioLogoConfig {
  emblem: CoreEmblemId;
  frame: LogoFrameId;
  palette: LogoPaletteId;
}

export type OfferRoleSlot =
  | 'director'
  | 'cinematographer'
  | 'composer'
  | 'editor_vfx'
  | 'lead'
  | 'antagonist'
  | 'supporting'
  | 'cameo';

export const SLOT_MAX_CAPACITY: Record<OfferRoleSlot, number> = {
  director: 2,
  lead: 2,
  antagonist: 1,
  supporting: 4,
  cameo: 2,
  cinematographer: 1,
  composer: 1,
  editor_vfx: 1,
};

export const SLOT_ARABIC_NAMES: Record<OfferRoleSlot, string> = {
  director: 'مخرج العمل',
  lead: 'البطل الأساسي (نجم الشباك)',
  antagonist: 'الشرير الرئيسي',
  supporting: 'الأدوار المساعدة',
  cameo: 'ضيوف الشرف',
  cinematographer: 'مدير التصوير',
  composer: 'الموسيقار',
  editor_vfx: 'المونتير والخدع البصرية',
};

export type TalentOfferStatus =
  | 'pending'
  | 'accepted'
  | 'accepted_awaiting_choice'
  | 'rejected'
  | 'released_by_studio';

export interface TalentOfferRecord {
  talentId: string;
  talentName: string;
  roleSlot: OfferRoleSlot;
  roleBillingSize?: RoleBillingSize;
  customRoleName?: string;
  offeredSalary: number;
  backendPoints: number;
  vipDinner: boolean;
  vipDinnerCost?: number;
  submittedDay: number;
  responseDueDay: number;
  status: TalentOfferStatus;
  willAccept: boolean;
  aiReason: string;
  aiSource?: string;
}

export interface DailyAiNewsItem {
  id: string;
  day: number;
  headline: string;
  detail: string;
  impactType: 'positive' | 'drama' | 'rival';
  hypeDelta: number;
  source?: string;
}

export interface WorldBreakingNewsModalItem {
  id: string;
  day: number;
  year: number;
  category:
    | 'rival_project'
    | 'new_studio'
    | 'rising_talent'
    | 'actor_evolution'
    | 'actor_retired'
    | 'actor_deceased'
    | 'contract_reply'
    | 'production_news';
  badgeLabel: string;
  headline: string;
  detail: string;
  highlightName?: string;
  extraStatBadge?: string;
  gameImpactLabel?: string;
}

export interface FestivalAwardWinnerItem {
  category: string;
  nominees: string[];
  winner: string;
  winningProjectTitle: string;
  winningStudioName: string;
  isPlayerWinner: boolean;
}

export interface AutomaticFestivalCeremonyItem {
  id: string;
  festivalId: string;
  festivalName: string;
  prestige: number;
  year: number;
  playerProjectTitle: string;
  juryStatement: string;
  festivalBuzz: string;
  awards: FestivalAwardWinnerItem[];
  playerWonCount: number;
}

export interface FloatingToastItem {
  id: string;
  message: string;
  subtext?: string;
  type: 'warning' | 'success' | 'info' | 'magic';
}

export interface ActorDynamicEvolutionState {
  overallDelta: number;
  actingDelta: number;
  charismaDelta: number;
  pullDelta: number;
  salaryMultiplier: number;
  tierOverride?: 'S' | 'A' | 'B' | 'C';
  status?: 'active' | 'retired' | 'deceased';
  busyUntilDay?: number;
  busyWithStudio?: string;
  lastEvolutionNote?: string;
}

export interface CrisisEventItem {
  id: string;
  title: string;
  description: string;
  optionA: {
    label: string;
    cost: number;
    hypeDelta: number;
    qualityDelta: number;
  };
  optionB: {
    label: string;
    cost: number;
    hypeDelta: number;
    qualityDelta: number;
  };
  resolved?: boolean;
  chosenOption?: 'A' | 'B';
}

export interface CriticReviewItem {
  criticName: string;
  publication: string;
  sentiment: 'positive' | 'mixed' | 'negative';
  quote: string;
  score: number;
}

export interface SocialPostItem {
  handle: string;
  platform: 'X' | 'TikTok' | 'Instagram' | 'Headline';
  content: string;
  likes: string;
}

export interface ReleasedProjectRecord {
  id: string;
  title: string;
  year: number;
  format: ProjectFormat;
  episodes?: SeriesEpisodes;
  seasonName: string;
  primaryGenre: GenreId;
  secondaryGenre: GenreId | null;
  ageRating: AgeRating;
  synopsis: string;
  directorId: string;
  directorName: string;
  leadNames: string[];
  antagonistName?: string;
  cameoNames: string[];
  actorIdsInCast?: string[];
  castCustomRoles?: Record<string, string>;
  totalBudget: number;
  distributionFeesTotal?: number;
  selectedDistributionMarkets?: MarketRegion[];
  marketRevenueBreakdown?: Record<MarketRegion, number>;
  firstWeekRevenue: number;
  boxOfficeRevenue: number;
  streamingRevenue: number;
  totalGrossRevenue: number;
  targetGrossRevenue?: number;
  targetBoxOfficeRevenue?: number;
  targetStreamingRevenue?: number;
  viewershipMillions?: number;
  targetViewershipMillions?: number;
  netProfit: number;
  criticScore: number;
  audienceScore: number;
  boxOfficeRank: number;
  reviews: CriticReviewItem[];
  socialPosts: SocialPostItem[];
  viralTrendLabel: string;
  rivalReleases: RivalRelease[];
  trollsCampaigned?: boolean;
  awardsWon: string[];
  releaseDayStart?: number;
  daysTracked?: number;
  dailyNews?: DailyAiNewsItem[];
  festivalsTriggered?: boolean;
}

export interface WorldHistoryEntry {
  year: number;
  eventText: string;
  category: 'release' | 'award' | 'scandal' | 'milestone';
}

export interface ActiveDraftProject {
  format: ProjectFormat;
  episodes: SeriesEpisodes;
  seriesSeason: SeriesSeason;
  filmSeason: FilmReleaseSeason;
  primaryGenre: GenreId;
  secondaryGenre: GenreId | null;
  ageRating: AgeRating;
  title: string;
  scriptSynopsis: string;
  directorId: string | null;
  directorIds: string[];
  writerIds: string[];
  dopId: string | null;
  composerId: string | null;
  vfxId: string | null;
  leadActorIds: string[];
  antagonistId: string | null;
  supportingActorIds: string[];
  cameoActorIds: string[];
  castCustomRoles: Record<string, string>;
  negotiatedDiscounts: Record<string, { backendPoints: number; vipDinner: boolean }>;
  talentOffers: Record<string, TalentOfferRecord>;
  budgetAllocation: ProductionBudgetAllocation;
  marketingBudget: number;
  screensCount: number;
  selectedDistributionMarkets: MarketRegion[];
  selectedPlatformId: string | null;
  platformDealAmount: number;
  selectedTvChannelId: string | null;
  tvChannelDealAmount: number;
  hypeScore: number;
  qualityModifier: number;
  crises: CrisisEventItem[];
  juryBribed: boolean;
  filmingStartDay: number | null;
  filmingDurationDays: number;
  scheduledReleaseDay: number | null;
  filmingDaysElapsed: number;
  productionNews: DailyAiNewsItem[];
  aiScriptAnalysis?: {
    score: number;
    verdict: string;
    castingAdvice: string;
    modelUsed: string;
  } | null;
}

export type GroqModelId =
  | 'auto'
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'qwen/qwen3.8-27b';

export const GROQ_MODEL_OPTIONS: { id: GroqModelId; label: string; provider: string }[] = [
  { id: 'auto', label: 'تبديل تلقائي ذكي (Auto)', provider: 'Groq Task Router' },
  { id: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b', provider: 'OpenAI (120B)' },
  { id: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b', provider: 'OpenAI (20B Fast)' },
  { id: 'qwen/qwen3.8-27b', label: 'qwen/qwen3.8-27b', provider: 'Alibaba Cloud (Qwen 3.8)' },
];

export type ActiveStageScreen =
  | 'STUDIO_CREATION'
  | 'STUDIO_HUB'
  | 'PROJECT_SETUP'
  | 'CREW_CAST_CARDS'
  | 'PRODUCTION_CRISES'
  | 'RELEASE_SIMULATION'
  | 'FESTIVALS_AWARDS'
  | 'LEADERBOARD_SETTINGS';

/**
 * Maps a 120-day game year (10 game ticks per month × 12 months) into a realistic calendar date
 * such as "9 نوفمبر 2037" (Never prints raw cumulative day numbers like "اليوم 1421").
 */
export function formatGameDate(gameDay: number, year: number): string {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  const dayInYear = Math.max(0, (gameDay - 1) % DAYS_PER_GAME_YEAR); // 0..119
  const monthIdx = Math.min(11, Math.floor(dayInYear / 10));
  const stepInMonth = dayInYear % 10; // 0..9
  const calendarDay = Math.min(30, stepInMonth * 3 + 3); // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
  return `${calendarDay} ${months[monthIdx]} ${year}`;
}

export function getDaysRemainingUntilAnnualAwards(gameDay: number): number {
  const dayInYear = Math.max(0, (gameDay - 1) % DAYS_PER_GAME_YEAR);
  return Math.max(1, DAYS_PER_GAME_YEAR - dayInYear);
}

/**
 * Progressively steps a released film/series forward by 1 day/episode:
 * - Grows box-office & streaming revenues toward targetGrossRevenue modulated by AI & critic/audience momentum
 * - Grows rival studio releases' revenues and dynamically recalculates the season leaderboard rank (#1, #2, ...)
 */
function stepProjectRevenueProgress(
  proj: ReleasedProjectRecord,
  playerMomentum = 1.0,
  rivalMomentum = 1.0,
  newsItem?: DailyAiNewsItem
): { updatedProject: ReleasedProjectRecord; revenueDelta: number } {
  const maxSteps = proj.format === 'series' ? proj.episodes || 15 : 10;
  const currentStep = proj.daysTracked || 1;
  const updatedNews = newsItem
    ? [newsItem, ...(proj.dailyNews || [])]
    : proj.dailyNews || [];

  if (currentStep >= maxSteps) {
    return {
      updatedProject: {
        ...proj,
        dailyNews: updatedNews,
      },
      revenueDelta: 0,
    };
  }

  const nextStep = currentStep + 1;
  const remainingSteps = Math.max(1, maxSteps - currentStep);
  const targetGross =
    proj.targetGrossRevenue || Math.round(proj.totalGrossRevenue * 2.4);

  const wordOfMouthBoost =
    proj.criticScore >= 8.0 && proj.audienceScore >= 8.0
      ? 1.08
      : proj.criticScore >= 7.2
      ? 1.03
      : proj.criticScore < 5.8
      ? 0.9
      : 1.0;

  const effectivePlayerMom = Math.max(
    0.72,
    Math.min(1.48, playerMomentum * wordOfMouthBoost)
  );

  const baseRemaining = Math.max(2_200_000, targetGross - proj.totalGrossRevenue);
  const revenueDelta = Math.max(
    1_100_000,
    Math.round((baseRemaining / remainingSteps) * effectivePlayerMom)
  );

  const nextGross = proj.totalGrossRevenue + revenueDelta;
  const boShare =
    proj.totalGrossRevenue > 0
      ? proj.boxOfficeRevenue / proj.totalGrossRevenue
      : proj.format === 'series'
      ? 0.35
      : 0.72;
  const boDelta = Math.round(revenueDelta * boShare);
  const streamDelta = revenueDelta - boDelta;

  let nextViews = proj.viewershipMillions;
  if (proj.format === 'series') {
    const curViews = proj.viewershipMillions || 1.4;
    const targetViews =
      proj.targetViewershipMillions || Math.max(curViews * 2.5, 7.5);
    const viewsRem = Math.max(0.5, targetViews - curViews);
    const viewsDelta = Math.max(
      0.25,
      (viewsRem / remainingSteps) * effectivePlayerMom
    );
    nextViews = Number((curViews + viewsDelta).toFixed(1));
  }

  const updatedRivals = proj.rivalReleases.map((r) => {
    if (r.status === 'delayed') return r;
    const rTarget =
      r.targetBoxOfficeRevenue || Math.round(r.boxOfficeRevenue * 2.5);
    const rQualityBoost =
      r.criticScore >= 7.8 ? 1.06 : r.criticScore < 5.8 ? 0.91 : 1.0;
    const rEffectiveMom = Math.max(
      0.75,
      Math.min(1.42, rivalMomentum * rQualityBoost)
    );
    const rRem = Math.max(1_800_000, rTarget - r.boxOfficeRevenue);
    const rDelta = Math.max(
      850_000,
      Math.round((rRem / remainingSteps) * rEffectiveMom)
    );
    return {
      ...r,
      boxOfficeRevenue: r.boxOfficeRevenue + rDelta,
      targetBoxOfficeRevenue: rTarget,
    };
  });

  const allRevs = [
    nextGross,
    ...updatedRivals
      .filter((r) => r.status !== 'delayed')
      .map((r) => r.boxOfficeRevenue),
  ].sort((a, b) => b - a);
  const nextRank = Math.max(1, allRevs.indexOf(nextGross) + 1);

  return {
    updatedProject: {
      ...proj,
      daysTracked: nextStep,
      boxOfficeRevenue: proj.boxOfficeRevenue + boDelta,
      streamingRevenue: proj.streamingRevenue + streamDelta,
      totalGrossRevenue: nextGross,
      netProfit: nextGross - proj.totalBudget,
      viewershipMillions: nextViews,
      boxOfficeRank: nextRank,
      rivalReleases: updatedRivals,
      dailyNews: updatedNews,
    },
    revenueDelta,
  };
}

export function getSignedIdsForSlot(draft: ActiveDraftProject, slot: OfferRoleSlot): string[] {
  if (slot === 'director') {
    const acceptedInOffers = Object.values(draft.talentOffers || {})
      .filter((o) => o.roleSlot === 'director' && o.status === 'accepted')
      .map((o) => o.talentId);
    const combined = Array.from(
      new Set([
        ...(draft.directorIds || []),
        ...(draft.directorId ? [draft.directorId] : []),
        ...acceptedInOffers,
      ])
    );
    return combined.slice(0, 2);
  }
  if (slot === 'cinematographer') return draft.dopId ? [draft.dopId] : [];
  if (slot === 'composer') return draft.composerId ? [draft.composerId] : [];
  if (slot === 'editor_vfx') return draft.vfxId ? [draft.vfxId] : [];
  if (slot === 'lead') return draft.leadActorIds;
  if (slot === 'antagonist') return draft.antagonistId ? [draft.antagonistId] : [];
  if (slot === 'supporting') return draft.supportingActorIds;
  if (slot === 'cameo') return draft.cameoActorIds;
  return [];
}

export function getLiveActorsWithEvolution(params: {
  baseActors: ActorItem[];
  aiGeneratedActors: ActorItem[];
  actorDynamicState: Record<string, ActorDynamicEvolutionState>;
  currentYear: number;
  gameDay: number;
}): ActorItem[] {
  const { baseActors, aiGeneratedActors, actorDynamicState, currentYear, gameDay } = params;
  const yearsElapsed = Math.max(0, currentYear - 2026);
  const allRaw = [...aiGeneratedActors, ...baseActors];

  return allRaw.map((actor) => {
    const dyn = actorDynamicState[actor.id];
    const currentAge = actor.age + yearsElapsed;

    if (!dyn) {
      return {
        ...actor,
        age: currentAge,
        status: actor.status || 'active',
      };
    }

    const nextOverall = Math.min(99, Math.max(55, actor.stats.overall + (dyn.overallDelta || 0)));
    const nextActing = Math.min(99, Math.max(55, actor.stats.acting + (dyn.actingDelta || 0)));
    const nextCharisma = Math.min(99, Math.max(55, actor.stats.charisma + (dyn.charismaDelta || 0)));
    const nextPull = Math.min(99, Math.max(50, actor.stats.box_office_pull + (dyn.pullDelta || 0)));

    const computedTier: 'S' | 'A' | 'B' | 'C' =
      dyn.tierOverride ||
      (nextOverall >= 90 ? 'S' : nextOverall >= 82 ? 'A' : nextOverall >= 73 ? 'B' : 'C');

    const isStillBusy = dyn.busyUntilDay && dyn.busyUntilDay > gameDay;

    return {
      ...actor,
      age: currentAge,
      tier: computedTier,
      base_salary: Math.round(actor.base_salary * (dyn.salaryMultiplier || 1)),
      status: dyn.status || actor.status || 'active',
      busyUntilDay: isStillBusy ? dyn.busyUntilDay : undefined,
      busyWithStudio: isStillBusy ? dyn.busyWithStudio : undefined,
      lastEvolutionNote: dyn.lastEvolutionNote,
      overallDelta: dyn.overallDelta,
      stats: {
        ...actor.stats,
        overall: nextOverall,
        acting: nextActing,
        charisma: nextCharisma,
        box_office_pull: nextPull,
      },
    };
  });
}

function applyAcceptedOfferToDraft(
  draft: ActiveDraftProject,
  offer: TalentOfferRecord
): ActiveDraftProject {
  const id = offer.talentId;
  const slot = offer.roleSlot;
  const next = { ...draft };

  next.negotiatedDiscounts = {
    ...next.negotiatedDiscounts,
    [id]: { backendPoints: offer.backendPoints, vipDinner: offer.vipDinner },
  };

  if (offer.customRoleName) {
    next.castCustomRoles = {
      ...(next.castCustomRoles || {}),
      [id]: offer.customRoleName,
    };
  }

  if (slot === 'director') {
    const existingDirs = Array.from(
      new Set([
        ...(next.directorIds || []),
        ...(next.directorId ? [next.directorId] : []),
      ])
    );
    if (!existingDirs.includes(id) && existingDirs.length < 2) {
      const updatedDirs = [...existingDirs, id];
      next.directorIds = updatedDirs;
      next.directorId = updatedDirs[0] || null;
    } else {
      next.directorIds = existingDirs;
      next.directorId = existingDirs[0] || null;
    }
  } else if (slot === 'cinematographer') {
    if (!next.dopId) next.dopId = id;
  } else if (slot === 'composer') {
    if (!next.composerId) next.composerId = id;
  } else if (slot === 'editor_vfx') {
    if (!next.vfxId) next.vfxId = id;
  } else {
    const alreadyInCast =
      next.leadActorIds.includes(id) ||
      next.antagonistId === id ||
      next.supportingActorIds.includes(id) ||
      next.cameoActorIds.includes(id);

    if (!alreadyInCast) {
      const billing = offer.roleBillingSize;
      if (billing === 'antagonist' || slot === 'antagonist') {
        if (!next.antagonistId) {
          next.antagonistId = id;
        } else {
          next.leadActorIds = [...next.leadActorIds, id];
        }
      } else if (billing === 'cameo' || slot === 'cameo') {
        next.cameoActorIds = [...next.cameoActorIds, id];
      } else if (billing === 'supporting' || slot === 'supporting') {
        next.supportingActorIds = [...next.supportingActorIds, id];
      } else if (billing === 'lead_star' || billing === 'co_lead') {
        if (next.leadActorIds.length < 3) {
          next.leadActorIds = [...next.leadActorIds, id];
        } else {
          next.supportingActorIds = [...next.supportingActorIds, id];
        }
      } else if (next.leadActorIds.length < 2) {
        next.leadActorIds = [...next.leadActorIds, id];
      } else if (!next.antagonistId) {
        next.antagonistId = id;
      } else {
        next.supportingActorIds = [...next.supportingActorIds, id];
      }
    }
  }
  return next;
}

/**
 * Builds the Annual Grand Awards Ceremonies for a given year, evaluating ALL player projects
 * released in that year against ALL strong rival studio releases from that year!
 */
export function buildAnnualAwardsGalaForYear(params: {
  playerProjectsInYear: ReleasedProjectRecord[];
  rivalReleasesInYear: RivalRelease[];
  studioName: string;
  year: number;
  db: MasterDatabase;
}): {
  ceremonies: AutomaticFestivalCeremonyItem[];
  awardsByProjectId: Record<string, string[]>;
  winningActorIds: string[];
  rivalAwardsCountByStudio: Record<string, number>;
} {
  const { playerProjectsInYear, rivalReleasesInYear, studioName, year, db } = params;

  const activeRivals = rivalReleasesInYear.filter((r) => r.status !== 'delayed');

  // Ensure strong rival contenders exist for both Film and Series in the annual pool
  const rivalFilms = activeRivals.filter((r) => r.format !== 'series');
  const rivalSeries = activeRivals.filter((r) => r.format === 'series');

  const topRivalFilm1: RivalRelease = rivalFilms[0] || {
    id: `annual_rf1_${year}`,
    title: 'شفرة العقرب',
    studioName: 'الإمبراطورية للإنتاج السينمائي',
    leadStarName: 'كريم العزاوي',
    directorName: 'مروان حافظ',
    format: 'film',
    genre: 'action',
    criticScore: 8.1,
    audienceScore: 8.5,
    boxOfficeRevenue: 92_000_000,
    status: 'released',
  };

  const topRivalFilm2: RivalRelease = rivalFilms[1] || {
    id: `annual_rf2_${year}`,
    title: 'فرسان المحروسة',
    studioName: 'مجموعة سينما تاج للترفيه',
    leadStarName: 'أحمد عزمي النجار',
    directorName: 'شريف علام',
    format: 'film',
    genre: 'historical',
    criticScore: 7.8,
    audienceScore: 8.0,
    boxOfficeRevenue: 74_000_000,
    status: 'released',
  };

  const topRivalSeries1: RivalRelease = rivalSeries[0] || {
    id: `annual_rs1_${year}`,
    title: 'لغز جريمة الزمالك',
    studioName: 'الرواد جروب للدراما والسينما',
    leadStarName: 'منى زاهر',
    directorName: 'تامر محسن الزيادي',
    format: 'series',
    genre: 'crime_mystery',
    criticScore: 8.2,
    audienceScore: 8.4,
    boxOfficeRevenue: 64_000_000,
    status: 'released',
  };

  const topRivalSeries2: RivalRelease = rivalSeries[1] || {
    id: `annual_rs2_${year}`,
    title: 'ملوك الحارة القديمة',
    studioName: 'نيو فيجن بيكتشرز',
    leadStarName: 'أمير الكراري',
    directorName: 'نديم العسكري',
    format: 'series',
    genre: 'popular_drama',
    criticScore: 7.6,
    audienceScore: 7.9,
    boxOfficeRevenue: 52_000_000,
    status: 'released',
  };

  const playerFilms = [...playerProjectsInYear]
    .filter((p) => p.format === 'film')
    .sort((a, b) => b.criticScore - a.criticScore);
  const playerSeries = [...playerProjectsInYear]
    .filter((p) => p.format === 'series')
    .sort((a, b) => b.criticScore - a.criticScore);
  const allPlayerSorted = [...playerProjectsInYear].sort(
    (a, b) => b.criticScore - a.criticScore
  );
  const playerTopBoxOffice = [...playerProjectsInYear].sort(
    (a, b) => b.totalGrossRevenue - a.totalGrossRevenue
  )[0];

  const bestPlayerFilm = playerFilms[0] || null;
  const bestPlayerSeries = playerSeries[0] || null;
  const bestPlayerOverall = allPlayerSorted[0] || null;

  const awardsByProjectId: Record<string, string[]> = {};
  const winningActorIds: string[] = [];
  const rivalAwardsCountByStudio: Record<string, number> = {};
  const ceremonies: AutomaticFestivalCeremonyItem[] = [];

  // Use the top 2 major annual festivals so the annual ceremony is grand, focused, and never repetitive
  const annualFestivals = db.festivals.slice(0, 2);

  annualFestivals.forEach((fest, fIdx) => {
    const strictnessOffset = fIdx === 0 ? 0.1 : -0.15;

    // 1. Best Film of the Year
    const rivalFilmTargetScore = (fIdx === 0 ? topRivalFilm1.criticScore : topRivalFilm2.criticScore) + strictnessOffset;
    const playerWinsBestFilm =
      Boolean(bestPlayerFilm) &&
      bestPlayerFilm.criticScore >= rivalFilmTargetScore;
    const winningRivalFilm = fIdx === 0 ? topRivalFilm1 : topRivalFilm2;

    // 2. Best Series of the Year
    const rivalSeriesTargetScore = (fIdx === 0 ? topRivalSeries1.criticScore : topRivalSeries2.criticScore) + strictnessOffset;
    const playerWinsBestSeries =
      Boolean(bestPlayerSeries) &&
      bestPlayerSeries.criticScore >= rivalSeriesTargetScore;
    const winningRivalSeries = fIdx === 0 ? topRivalSeries1 : topRivalSeries2;

    // 3. Best Director of the Year
    const rivalDirectorTarget = Math.max(topRivalFilm1.criticScore, topRivalSeries1.criticScore) - 0.1 + strictnessOffset;
    const playerWinsDirector =
      Boolean(bestPlayerOverall) &&
      bestPlayerOverall.criticScore >= rivalDirectorTarget;

    // 4. Best Lead Actor / Actress of the Year
    const playerWinsActor =
      Boolean(bestPlayerOverall) &&
      bestPlayerOverall.criticScore >= 7.5 + strictnessOffset &&
      bestPlayerOverall.audienceScore >= 7.6;

    // 5. Best Screenplay of the Year
    const bestPlayerScriptWords = bestPlayerOverall
      ? bestPlayerOverall.synopsis.trim().split(/\s+/).length
      : 0;
    const playerWinsScript =
      Boolean(bestPlayerOverall) &&
      bestPlayerScriptWords >= 15 &&
      bestPlayerOverall.criticScore >= 7.6 + strictnessOffset;

    // 6. Golden Box Office Crown (Highest Grossing Work of the Year)
    const highestRivalGross = Math.max(
      topRivalFilm1.boxOfficeRevenue,
      topRivalFilm2.boxOfficeRevenue,
      topRivalSeries1.boxOfficeRevenue
    );
    const playerWinsBoxOffice =
      Boolean(playerTopBoxOffice) &&
      playerTopBoxOffice.totalGrossRevenue >= highestRivalGross;

    const awards: FestivalAwardWinnerItem[] = [
      {
        category: 'جائزة أفضل فيلم سينمائي للعام',
        nominees: bestPlayerFilm
          ? [bestPlayerFilm.title, topRivalFilm1.title, topRivalFilm2.title]
          : [topRivalFilm1.title, topRivalFilm2.title, 'العملية 99'],
        winner: playerWinsBestFilm && bestPlayerFilm ? bestPlayerFilm.title : winningRivalFilm.title,
        winningProjectTitle:
          playerWinsBestFilm && bestPlayerFilm ? bestPlayerFilm.title : winningRivalFilm.title,
        winningStudioName:
          playerWinsBestFilm && bestPlayerFilm ? studioName : winningRivalFilm.studioName,
        isPlayerWinner: Boolean(playerWinsBestFilm && bestPlayerFilm),
      },
      {
        category: 'جائزة أفضل مسلسل درامي للعام',
        nominees: bestPlayerSeries
          ? [bestPlayerSeries.title, topRivalSeries1.title, topRivalSeries2.title]
          : [topRivalSeries1.title, topRivalSeries2.title, 'ليالي المحروسة'],
        winner:
          playerWinsBestSeries && bestPlayerSeries
            ? bestPlayerSeries.title
            : winningRivalSeries.title,
        winningProjectTitle:
          playerWinsBestSeries && bestPlayerSeries
            ? bestPlayerSeries.title
            : winningRivalSeries.title,
        winningStudioName:
          playerWinsBestSeries && bestPlayerSeries
            ? studioName
            : winningRivalSeries.studioName,
        isPlayerWinner: Boolean(playerWinsBestSeries && bestPlayerSeries),
      },
      {
        category: 'جائزة أفضل إخراج في العام',
        nominees: bestPlayerOverall
          ? [
              bestPlayerOverall.directorName,
              topRivalFilm1.directorName || 'مروان حافظ',
              topRivalSeries1.directorName || 'تامر محسن الزيادي',
            ]
          : ['مروان حافظ', 'شريف علام', 'تامر محسن الزيادي'],
        winner:
          playerWinsDirector && bestPlayerOverall
            ? bestPlayerOverall.directorName
            : topRivalFilm1.directorName || 'مروان حافظ',
        winningProjectTitle:
          playerWinsDirector && bestPlayerOverall
            ? bestPlayerOverall.title
            : topRivalFilm1.title,
        winningStudioName:
          playerWinsDirector && bestPlayerOverall
            ? studioName
            : topRivalFilm1.studioName,
        isPlayerWinner: Boolean(playerWinsDirector && bestPlayerOverall),
      },
      {
        category: 'جائزة أفضل تمثيل (دور أول)',
        nominees: bestPlayerOverall
          ? [
              bestPlayerOverall.leadNames[0] || 'بطل العمل',
              topRivalFilm1.leadStarName,
              topRivalSeries1.leadStarName,
            ]
          : [topRivalFilm1.leadStarName, topRivalSeries1.leadStarName, topRivalFilm2.leadStarName],
        winner:
          playerWinsActor && bestPlayerOverall
            ? bestPlayerOverall.leadNames[0] || 'بطل العمل'
            : fIdx === 0
            ? topRivalFilm1.leadStarName
            : topRivalSeries1.leadStarName,
        winningProjectTitle:
          playerWinsActor && bestPlayerOverall
            ? bestPlayerOverall.title
            : fIdx === 0
            ? topRivalFilm1.title
            : topRivalSeries1.title,
        winningStudioName:
          playerWinsActor && bestPlayerOverall
            ? studioName
            : fIdx === 0
            ? topRivalFilm1.studioName
            : topRivalSeries1.studioName,
        isPlayerWinner: Boolean(playerWinsActor && bestPlayerOverall),
      },
      {
        category: 'جائزة أفضل سيناريو وحبكة درامية',
        nominees: bestPlayerOverall
          ? [`سيناريو «${bestPlayerOverall.title}»`, `سيناريو «${topRivalSeries1.title}»`]
          : [`سيناريو «${topRivalSeries1.title}»`, `سيناريو «${topRivalFilm2.title}»`],
        winner:
          playerWinsScript && bestPlayerOverall
            ? `سيناريو «${bestPlayerOverall.title}»`
            : `سيناريو «${topRivalSeries1.title}»`,
        winningProjectTitle:
          playerWinsScript && bestPlayerOverall
            ? bestPlayerOverall.title
            : topRivalSeries1.title,
        winningStudioName:
          playerWinsScript && bestPlayerOverall
            ? studioName
            : topRivalSeries1.studioName,
        isPlayerWinner: Boolean(playerWinsScript && bestPlayerOverall),
      },
      {
        category: 'جائزة قمة شباك التذاكر الذهبية (أعلى إيراد سنوي)',
        nominees: playerTopBoxOffice
          ? [playerTopBoxOffice.title, topRivalFilm1.title, topRivalFilm2.title]
          : [topRivalFilm1.title, topRivalFilm2.title],
        winner:
          playerWinsBoxOffice && playerTopBoxOffice
            ? `${playerTopBoxOffice.title} (${formatMoney(playerTopBoxOffice.totalGrossRevenue)} ج.م)`
            : `${topRivalFilm1.title} (${formatMoney(topRivalFilm1.boxOfficeRevenue)} ج.م)`,
        winningProjectTitle:
          playerWinsBoxOffice && playerTopBoxOffice
            ? playerTopBoxOffice.title
            : topRivalFilm1.title,
        winningStudioName:
          playerWinsBoxOffice && playerTopBoxOffice
            ? studioName
            : topRivalFilm1.studioName,
        isPlayerWinner: Boolean(playerWinsBoxOffice && playerTopBoxOffice),
      },
    ];

    // Record awards per project and per rival studio
    awards.forEach((aw) => {
      if (aw.isPlayerWinner) {
        const matchedProj =
          playerProjectsInYear.find((p) => p.title === aw.winningProjectTitle) ||
          bestPlayerOverall;
        if (matchedProj) {
          awardsByProjectId[matchedProj.id] = [
            ...(awardsByProjectId[matchedProj.id] || []),
            `${aw.category} (${fest.name})`,
          ];
        }
      } else {
        rivalAwardsCountByStudio[aw.winningStudioName] =
          (rivalAwardsCountByStudio[aw.winningStudioName] || 0) + 1;
      }
    });

    if (playerWinsActor && bestPlayerOverall?.actorIdsInCast?.[0]) {
      winningActorIds.push(bestPlayerOverall.actorIdsInCast[0]);
    }

    const playerWonCount = awards.filter((a) => a.isPlayerWinner).length;
    const playerTitlesSummary =
      playerProjectsInYear.length > 0
        ? playerProjectsInYear.map((p) => `«${p.title}»`).join(' و')
        : 'لا توجد أعمال مشاركة';

    ceremonies.push({
      id: `annual_gala_${year}_${fest.id}`,
      festivalId: fest.id,
      festivalName: `${fest.name} — الحفل السنوي لعام ${year}`,
      prestige: fest.prestige,
      year,
      playerProjectTitle: bestPlayerOverall?.title || 'موسم العام السينمائي',
      juryStatement:
        playerProjectsInYear.length === 0
          ? `اختتمت فعاليات ${fest.name} لعام ${year}، وحسمت أعمال «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» جوائز العام الكبرى في غياب مشاركات من استوديو «${studioName}» هذا العام.`
          : playerWonCount >= 3
          ? `ليلة تاريخية لاستوديو «${studioName}» في الحفل السنوي لـ ${fest.name} (${year})! أشادت لجنة التحكيم بأعمالكم ${playerTitlesSummary} ومنحتكم ${playerWonCount} جوائز كبرى بعد منافسة شرسة مع «${topRivalFilm1.studioName}».`
          : playerWonCount >= 1
          ? `منافسة قوية في الحفل السنوي لـ ${fest.name} (${year})؛ حصدت أعمال «${studioName}» (${playerTitlesSummary}) ${playerWonCount} جائزة مستحقة، بينما انتزعت «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» باقي جوائز العام.`
          : `شهد الحفل السنوي لـ ${fest.name} (${year}) منافسة نارية؛ ورغم ترشح ${playerTitlesSummary} في القائمة القصيرة، تفوقت أفلام ومسلسلات «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» بفارق التقييمات النقدية.`,
      festivalBuzz: `حفل توزيع جوائز نهاية العام (${year}) وسط حضور كافة نجوم وصناع السينما والدراما على السجادة الحمراء.`,
      awards,
      playerWonCount,
    });
  });

  return {
    ceremonies,
    awardsByProjectId,
    winningActorIds,
    rivalAwardsCountByStudio,
  };
}

// Backward-compatible helper for Stage6FestivalsAwards
export function buildThreeSeasonFestivals(params: {
  project: ReleasedProjectRecord;
  studioName: string;
  currentYear: number;
  db: MasterDatabase;
}): {
  ceremonies: AutomaticFestivalCeremonyItem[];
  allWonAwardLabels: string[];
  leadActorWonCount: number;
} {
  const res = buildAnnualAwardsGalaForYear({
    playerProjectsInYear: [params.project],
    rivalReleasesInYear: params.project.rivalReleases || [],
    studioName: params.studioName,
    year: params.currentYear,
    db: params.db,
  });
  const allWon = Object.values(res.awardsByProjectId).flat();
  return {
    ceremonies: res.ceremonies,
    allWonAwardLabels: allWon,
    leadActorWonCount: res.winningActorIds.length,
  };
}

export interface HyptrixGameState {
  studioCreated: boolean;
  studioName: string;
  ceoName: string;
  logo: StudioLogoConfig;
  founderPerk: FounderPerk;
  currentRegion: MarketRegion;
  unlockedRegions: MarketRegion[];
  cash: number;
  marketValue: number;
  marketValueModifier: number;
  reputation: number;
  currentYear: number;
  gameDay: number;
  lastAwardsGalaYear: number;
  vipCoins: number;
  vipPassExpiresAt: number | null;
  vipAdProgress: number;
  activeScreen: ActiveStageScreen;
  draft: ActiveDraftProject;
  releasedProjects: ReleasedProjectRecord[];
  lastReleasedProject: ReleasedProjectRecord | null;
  yearlyRivalReleases: RivalRelease[];
  worldHistory: WorldHistoryEntry[];
  aiMemoryLog: string[];
  actorAwardCounts: Record<string, number>;
  actorDynamicState: Record<string, ActorDynamicEvolutionState>;
  aiGeneratedActors: ActorItem[];
  emergingCompetitors: CompetitorStudio[];
  competitorNetWorthDelta: Record<string, { netWorthDelta: number; releasesDelta: number; awardsDelta: number }>;
  breakingNewsQueue: WorldBreakingNewsModalItem[];
  festivalModalQueue: AutomaticFestivalCeremonyItem[];
  activeToast: FloatingToastItem | null;
  isChildModalOpen: boolean;
  customDbPatch: Partial<MasterDatabase> | null;
  customDbUrl: string;
  supabaseUserEmail: string | null;
  groqApiKeyClient: string;
  preferredGroqModel: GroqModelId;
  ownedStudioAssets: string[];
  ledgerSignature: string;
  socialFeedLog: LiveSocialFeedPost[];
  isPrWarRoomOpen: boolean;
  starForgeLocksOpened: number;
  isStarForgeOpen: boolean;

  // Actions
  setChildModalOpen: (open: boolean) => void;
  setPrWarRoomOpen: (open: boolean) => void;
  setStarForgeOpen: (open: boolean) => void;
  unlockNextStarForgeLockWithAd: () => void;
  buyVipGemPackage: (packageEgp: 10 | 30 | 50) => Promise<void>;
  spendForStarForgeUpgrade: (cashCost: number, gemCost: number) => boolean;
  createCustomVipStar: (actor: ActorItem) => void;
  purchaseStudioAsset: (assetId: string) => Promise<boolean>;
  resolveCrisisWithStudioAsset: (crisisId: string) => void;
  launchSocialPrCampaign: (
    campaignId: SocialPrCampaignItem['id'],
    targetRivalStudio?: string,
    contextSituation?: {
      headline?: string;
      detail?: string;
      customAngle?: string;
    }
  ) => Promise<boolean>;
  verifyWalletWithServer: () => Promise<void>;
  showToast: (
    message: string,
    type?: FloatingToastItem['type'],
    subtext?: string
  ) => void;
  dismissToast: () => void;
  initializeStudio: (params: {
    studioName: string;
    ceoName: string;
    logo: StudioLogoConfig;
    founderPerk: FounderPerk;
    region: MarketRegion;
  }) => void;
  quickStartDemoStudio: () => void;
  setActiveScreen: (screen: ActiveStageScreen) => void;
  advanceGameDay: (days?: number) => void;
  unlockMarketRegionWithCash: (region: MarketRegion) => boolean;
  toggleDraftDistributionMarket: (region: MarketRegion) => void;
  triggerAnnualAwardsCeremonyNow: () => void;
  submitTalentOffer: (offer: TalentOfferRecord) => void;
  toggleCrewSelectionForSlot: (slot: OfferRoleSlot, talentId: string) => void;
  confirmMultiAcceptedChoice: (slot: OfferRoleSlot, chosenTalentIds: string[]) => void;
  removeTalentFromDraft: (talentId: string) => void;
  updateDraft: (partial: Partial<ActiveDraftProject>) => void;
  resetDraftForNewProject: (targetScreen?: ActiveStageScreen) => void;
  toggleVipDinnerForTalent: (talentId: string) => void;
  setBackendPointsForTalent: (talentId: string, points: number) => void;
  watchVipAdStep: () => void;
  resolveCrisisOption: (crisisId: string, choice: 'A' | 'B') => void;
  completeProjectRelease: (record: ReleasedProjectRecord) => void;
  advanceReleaseTrackingDay: (
    newsItem?: DailyAiNewsItem,
    playerMomentum?: number,
    rivalMomentum?: number
  ) => void;
  triggerElectronicTrollsCampaign: (projectId: string) => void;
  triggerFestivalJuryPR: () => void;
  recordFestivalAwards: (festivalName: string, awards: string[], winningActorIds: string[]) => void;
  pushBreakingNewsModal: (news: WorldBreakingNewsModalItem) => void;
  dismissBreakingNewsModal: () => void;
  pushFestivalCeremonyModal: (ceremony: AutomaticFestivalCeremonyItem) => void;
  dismissFestivalCeremonyModal: () => void;
  addAiDiscoveredActor: (actor: ActorItem, newsHeadline?: string, newsDetail?: string) => void;
  addAiEmergingStudio: (studio: CompetitorStudio, newsHeadline?: string, newsDetail?: string) => void;
  addAiRivalReleases: (rivals: RivalRelease[], newsHeadline?: string, newsDetail?: string) => void;
  pushAiContextualNewsEvent: (event: {
    headline: string;
    detail: string;
    badgeLabel?: string;
    category?: WorldBreakingNewsModalItem['category'];
    marketValueDelta?: number;
    cashDelta?: number;
    reputationDelta?: number;
    hypeDelta?: number;
    rivalStudioName?: string;
    rivalNetWorthDelta?: number;
  }) => void;
  importCustomDatabase: (patch: Partial<MasterDatabase>, sourceUrl?: string) => void;
  clearCustomDatabase: () => void;
  resetEntireGameAndStartFresh: () => void;
  setSupabaseUserEmail: (email: string | null) => void;
  setGroqApiKeyClient: (key: string) => void;
  setPreferredGroqModel: (model: GroqModelId) => void;
}

const DEFAULT_DRAFT: ActiveDraftProject = {
  format: 'film',
  episodes: 15,
  seriesSeason: 'ramadan',
  filmSeason: 'eid_adha',
  primaryGenre: 'action',
  secondaryGenre: 'popular_drama',
  ageRating: '+12',
  title: 'الفرعون الأخير',
  scriptSynopsis:
    'ضابط عمليات خاصة سابق يكتشف شبكة دولية لتهريب الآثار تحت شوارع القاهرة القديمة، فيخوض معركة شرسة ضد إمبراطور الجريمة لإنقاذ كنز فرعوني مفقود قبل فوات الأوان.',
  directorId: null,
  directorIds: [],
  writerIds: [],
  dopId: null,
  composerId: null,
  vfxId: null,
  leadActorIds: [],
  antagonistId: null,
  supportingActorIds: [],
  cameoActorIds: [],
  castCustomRoles: {},
  negotiatedDiscounts: {},
  talentOffers: {},
  budgetAllocation: {
    setsAndLocations: 8_000_000,
    costumesAndMakeup: 4_000_000,
    vfxAndStunts: 10_000_000,
    extrasAndCrowds: 3_000_000,
  },
  marketingBudget: 15_000_000,
  screensCount: 140,
  selectedDistributionMarkets: ['egypt'],
  selectedPlatformId: 'plat_1',
  platformDealAmount: 28_000_000,
  selectedTvChannelId: 'tv_1',
  tvChannelDealAmount: 22_000_000,
  hypeScore: 68,
  qualityModifier: 0,
  crises: [],
  juryBribed: false,
  filmingStartDay: null,
  filmingDurationDays: 8,
  scheduledReleaseDay: null,
  filmingDaysElapsed: 0,
  productionNews: [],
};

export const useGameStore = create<HyptrixGameState>()(
  persist(
    (set, get) => ({
      studioCreated: false,
      studioName: 'العقرب ستوديوز',
      ceoName: 'محمود الصيرفي',
      logo: {
        emblem: 'golden_scorpion',
        frame: 'royal_shield',
        palette: 'amethyst_pearl',
      },
      founderPerk: 'visionary_director',
      currentRegion: 'egypt',
      unlockedRegions: ['egypt'],
      cash: 75_000_000,
      marketValue: 110_000_000,
      marketValueModifier: 0,
      reputation: 62,
      currentYear: 2026,
      gameDay: 1,
      lastAwardsGalaYear: 2025,
      vipCoins: 250,
      vipPassExpiresAt: null,
      vipAdProgress: 0,
      activeScreen: 'STUDIO_CREATION',
      draft: { ...DEFAULT_DRAFT },
      releasedProjects: [],
      lastReleasedProject: null,
      yearlyRivalReleases: [],
      worldHistory: [
        {
          year: 2026,
          eventText: 'تأسيس استوديو جديد بطموحات ضخمة للسيطرة على صناعة السينما والدراما.',
          category: 'milestone',
        },
      ],
      aiMemoryLog: [
        'انطلاق الموسم السينمائي وسط منافسة شرسة بين كبرى شركات الإنتاج على شباك التذاكر.',
      ],
      actorAwardCounts: {},
      actorDynamicState: {},
      aiGeneratedActors: [],
      emergingCompetitors: [],
      competitorNetWorthDelta: {},
      breakingNewsQueue: [],
      festivalModalQueue: [],
      activeToast: null,
      isChildModalOpen: false,
      customDbPatch: null,
      customDbUrl: '',
      supabaseUserEmail: null,
      groqApiKeyClient: '',
      preferredGroqModel: 'auto',
      ownedStudioAssets: [],
      ledgerSignature: '',
      socialFeedLog: [],
      isPrWarRoomOpen: false,
      starForgeLocksOpened: 0,
      isStarForgeOpen: false,

      setChildModalOpen: (open) => set({ isChildModalOpen: open }),
      setPrWarRoomOpen: (open) => set({ isPrWarRoomOpen: open }),
      setStarForgeOpen: (open) => set({ isStarForgeOpen: open }),

      unlockNextStarForgeLockWithAd: () =>
        set((state) => {
          const nextLocks = Math.min(5, (state.starForgeLocksOpened || 0) + 1);
          return {
            starForgeLocksOpened: nextLocks,
            vipCoins: state.vipCoins + 15,
          };
        }),

      buyVipGemPackage: async (packageEgp) => {
        const state = get();
        const rewardMap: Record<10 | 30 | 50, { gems: number; cashBonus: number; label: string }> = {
          10: { gems: 150, cashBonus: 12_000_000, label: 'باقة النجم الصاعد (10 ج.م)' },
          30: { gems: 500, cashBonus: 40_000_000, label: 'باقة المنتج الذهبي (30 ج.م)' },
          50: { gems: 1200, cashBonus: 90_000_000, label: 'باقة الإمبراطور الألماظ (50 ج.م)' },
        };
        const pkg = rewardMap[packageEgp];
        const prevCash = state.cash;
        const nextCash = prevCash + pkg.cashBonus;
        const nextMvMod = (state.marketValueModifier || 0) + pkg.cashBonus;
        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: state.reputation,
          releasedProjects: state.releasedProjects,
          marketValueModifier: nextMvMod,
        });

        await verifyAndRecordServerTransaction({
          studioInstanceId: getOrCreateStudioInstanceId(),
          studioName: state.studioName,
          ceoName: state.ceoName,
          userEmail: state.supabaseUserEmail,
          transactionType: 'VIP_PACKAGE_TOPUP',
          amountDelta: pkg.cashBonus,
          previousCash: prevCash,
          expectedNewCash: nextCash,
          marketValue: nextMv,
          reputation: state.reputation,
          ownedAssets: state.ownedStudioAssets || [],
          itemId: `vip_pkg_${packageEgp}`,
          itemLabel: pkg.label,
          previousSignature: state.ledgerSignature,
        });

        set((cur) => ({
          vipCoins: cur.vipCoins + pkg.gems,
          cash: nextCash,
          marketValueModifier: nextMvMod,
          marketValue: nextMv,
          starForgeLocksOpened: 5,
        }));

        get().showToast(
          `تم شحن «${pkg.label}» بنجاح!`,
          'magic',
          `+${pkg.gems} عملة ذهبية VIP · +${formatMoney(pkg.cashBonus)} ج.م سيولة خزينة`
        );
      },

      spendForStarForgeUpgrade: (cashCost, gemCost) => {
        const state = get();
        if (cashCost > 0 && state.cash < cashCost) {
          state.showToast(
            'رصيد الخزينة لا يكفي لترقية هذه الطاقة!',
            'warning',
            `تحتاج إلى ${formatMoney(cashCost)} ج.م.`
          );
          return false;
        }
        if (gemCost > 0 && state.vipCoins < gemCost) {
          state.showToast(
            'تحتاج إلى عملات VIP ذهبية لكسر حاجز الـ 80 والوصول لطاقة أسطورية (99)!',
            'warning',
            'اشحن باقة الـ 10 أو 30 أو 50 جنيه من الخزنة فوراً.'
          );
          return false;
        }
        set((cur) => ({
          cash: Math.max(0, cur.cash - cashCost),
          vipCoins: Math.max(0, cur.vipCoins - gemCost),
        }));
        return true;
      },

      createCustomVipStar: (actor) =>
        set((state) => {
          const customStar: ActorItem = {
            ...actor,
            isCustomStar: true,
            isAiGenerated: false,
            isRisingDiscovery: false,
            status: 'active',
          };
          const headline = `ولادة أسطورة سينمائية: «${state.studioName}» تكشف رسمياً عن نجمها الحصري «${customStar.name}» بكارت ألماظ وتقييم ${customStar.stats.overall}!`;
          return {
            aiGeneratedActors: [
              customStar,
              ...state.aiGeneratedActors.filter((a) => a.id !== customStar.id),
            ],
            reputation: Math.min(100, state.reputation + 5),
            marketValueModifier: (state.marketValueModifier || 0) + 25_000_000,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: headline,
                category: 'milestone',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [headline, ...(state.aiMemoryLog || [])].slice(0, 25),
          };
        }),

      verifyWalletWithServer: async () => {
        const state = get();
        const instanceId = getOrCreateStudioInstanceId();
        const res = await fetchAuthoritativeStudioWallet(
          instanceId,
          state.cash,
          state.marketValue,
          state.ownedStudioAssets || [],
          state.ledgerSignature || ''
        );
        if (res && res.ok) {
          if (res.tamperDetected) {
            set({
              cash: res.correctedCash,
              marketValue: res.correctedMarketValue,
              ownedStudioAssets: res.ownedAssets,
              ledgerSignature: res.ledgerSignature,
            });
            get().showToast(
              res.message ||
                'تمت مطابقة خزينة الاستوديو مع السجل المالي الموثق على الخادم.',
              'warning'
            );
          } else {
            set({
              ledgerSignature: res.ledgerSignature,
              ownedStudioAssets:
                res.ownedAssets.length > 0
                  ? res.ownedAssets
                  : state.ownedStudioAssets,
            });
          }
        }
      },

      purchaseStudioAsset: async (assetId) => {
        const state = get();
        const asset = STUDIO_FIXED_ASSETS.find((a) => a.id === assetId);
        if (!asset) return false;
        if ((state.ownedStudioAssets || []).includes(assetId)) {
          state.showToast('هذا الأصل مملوك بالفعل ضمن أصول الاستوديو الثابتة!', 'info');
          return false;
        }
        if (state.cash < asset.price) {
          state.showToast(
            'السيولة النقدية في الخزينة لا تكفي لشراء هذا الأصل الثابت حالياً!',
            'warning',
            `تحتاج إلى ${formatMoney(asset.price)} ج.م لإتمام الشراء.`
          );
          return false;
        }

        const previousCash = state.cash;
        const optimisticCash = previousCash - asset.price;
        const nextAssets = [...(state.ownedStudioAssets || []), assetId];
        const nextMvMod = (state.marketValueModifier || 0) + asset.marketValueBoost;
        const nextMarketVal = calculateStudioMarketValue({
          cash: optimisticCash,
          reputation: state.reputation,
          releasedProjects: state.releasedProjects,
          marketValueModifier: nextMvMod,
        });

        // Verify purchase on server
        const verification = await verifyAndRecordServerTransaction({
          studioInstanceId: getOrCreateStudioInstanceId(),
          studioName: state.studioName,
          ceoName: state.ceoName,
          userEmail: state.supabaseUserEmail,
          transactionType: 'PURCHASE_STUDIO_ASSET',
          amountDelta: -asset.price,
          previousCash,
          expectedNewCash: optimisticCash,
          marketValue: nextMarketVal,
          reputation: state.reputation,
          ownedAssets: nextAssets,
          itemId: asset.id,
          itemLabel: asset.name,
          previousSignature: state.ledgerSignature,
        });

        const finalCash = verification.ok
          ? verification.correctedCash
          : optimisticCash;
        const finalAssets = verification.ok
          ? verification.ownedAssets
          : nextAssets;

        set((cur) => ({
          cash: finalCash,
          ownedStudioAssets: finalAssets,
          marketValueModifier: nextMvMod,
          marketValue: nextMarketVal,
          ledgerSignature: verification.ledgerSignature || cur.ledgerSignature,
          draft: {
            ...cur.draft,
            qualityModifier: cur.draft.qualityModifier + asset.qualityBonus,
            hypeScore: Math.min(100, cur.draft.hypeScore + asset.hypeBonus),
          },
          worldHistory: [
            {
              year: cur.currentYear,
              eventText: `استحواذ استراتيجي: شراء «${asset.name}» بقيمة ${formatMoney(asset.price)} ج.م كأصل ثابت يخفض تكاليف الإنتاج ويحمي من أزمات التصوير.`,
              category: 'milestone',
            },
            ...cur.worldHistory,
          ],
          aiMemoryLog: [
            `اشترت شركة "${cur.studioName}" الأصل الثابت "${asset.name}" بقيمة ${formatMoney(asset.price)} ج.م مما رفع قيمتها السوقية وخفض تكاليف إنتاجها.`,
            ...(cur.aiMemoryLog || []),
          ].slice(0, 25),
        }));

        get().showToast(
          `تم شراء وتوثيق «${asset.name}» ضمن أصول الاستوديو الثابتة!`,
          'success',
          `خصم دائم -${asset.costDiscountPercent}% على تكاليف الإنتاج + درع حماية في البلاتوه`
        );
        return true;
      },

      resolveCrisisWithStudioAsset: (crisisId) =>
        set((state) => {
          const crisis = state.draft.crises.find((c) => c.id === crisisId);
          if (!crisis || crisis.resolved) return state;
          const benefits = getStudioAssetBenefits(state.ownedStudioAssets);
          if (benefits.ownedItems.length === 0) return state;

          const bonusQuality = Math.max(4, crisis.optionA.qualityDelta, crisis.optionB.qualityDelta);
          const bonusHype = Math.max(4, crisis.optionA.hypeDelta, crisis.optionB.hypeDelta);

          return {
            reputation: Math.min(100, state.reputation + 2),
            draft: {
              ...state.draft,
              hypeScore: Math.min(100, state.draft.hypeScore + bonusHype),
              qualityModifier: state.draft.qualityModifier + bonusQuality,
              crises: state.draft.crises.map((c) =>
                c.id === crisisId ? { ...c, resolved: true, chosenOption: 'A' } : c
              ),
            },
          };
        }),

      launchSocialPrCampaign: async (
        campaignId,
        targetRivalStudio,
        contextSituation
      ) => {
        const state = get();
        const campaign = SOCIAL_PR_CAMPAIGNS.find((c) => c.id === campaignId);
        if (!campaign) return false;
        if (state.cash < campaign.cost) {
          state.showToast(
            'السيولة النقدية في الخزينة لا تكفي لتمويل هذه الحملة الإعلامية!',
            'warning',
            `تحتاج إلى ${formatMoney(campaign.cost)} ج.م لإطلاق الحملة.`
          );
          return false;
        }

        const previousCash = state.cash;
        const expectedNewCash = previousCash - campaign.cost;

        const verification = await verifyAndRecordServerTransaction({
          studioInstanceId: getOrCreateStudioInstanceId(),
          studioName: state.studioName,
          ceoName: state.ceoName,
          userEmail: state.supabaseUserEmail,
          transactionType: 'LAUNCH_PR_CAMPAIGN',
          amountDelta: -campaign.cost,
          previousCash,
          expectedNewCash,
          marketValue: state.marketValue,
          reputation: state.reputation,
          ownedAssets: state.ownedStudioAssets || [],
          itemId: campaign.id,
          itemLabel: campaign.title,
          previousSignature: state.ledgerSignature,
        });

        const finalCash = verification.ok
          ? verification.correctedCash
          : expectedNewCash;

        const activeProjectTitle =
          state.lastReleasedProject?.title ||
          state.draft.title ||
          'العمل الجديد';
        const rivalStudio =
          targetRivalStudio ||
          state.lastReleasedProject?.rivalReleases?.[0]?.studioName ||
          state.yearlyRivalReleases?.[0]?.studioName ||
          'المتحدون ميديا جروب';
        const rivalFilmTitle =
          state.lastReleasedProject?.rivalReleases?.find(
            (r) => r.studioName === rivalStudio
          )?.title ||
          state.yearlyRivalReleases?.find((r) => r.studioName === rivalStudio)
            ?.title ||
          'العمل المنافس';

        const cleanTag = activeProjectTitle.replace(/\s+/g, '_');
        const rivalTag = rivalFilmTitle.replace(/\s+/g, '_');

        // Call Groq AI (qwen/qwen3.8-27b / openai/gpt-oss-120b / openai/gpt-oss-20b) for contextual media response
        let aiGeneratedPosts: LiveSocialFeedPost[] = [];
        let aiOfficialStatement = '';
        try {
          const aiRes = await fetch('/api/generate-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'generate_pr_media_response',
              groqKeyOverride: state.groqApiKeyClient,
              preferredModel: state.preferredGroqModel,
              payload: {
                studioName: state.studioName,
                ceoName: state.ceoName,
                activeProjectTitle,
                rivalStudioName: rivalStudio,
                rivalFilmTitle,
                campaignId: campaign.id,
                situationHeadline:
                  contextSituation?.headline ||
                  state.breakingNewsQueue?.[0]?.headline ||
                  '',
                situationDetail:
                  contextSituation?.detail ||
                  state.breakingNewsQueue?.[0]?.detail ||
                  '',
                customPlayerAngle: contextSituation?.customAngle || '',
              },
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (Array.isArray(aiData?.posts) && aiData.posts.length > 0) {
              aiGeneratedPosts = aiData.posts;
            }
            if (typeof aiData?.officialStatement === 'string') {
              aiOfficialStatement = aiData.officialStatement;
            }
          }
        } catch {
          // Fallback to deterministic posts below if offline
        }

        const newPosts: LiveSocialFeedPost[] = [...aiGeneratedPosts];
        if (newPosts.length === 0) {
          if (campaign.id === 'support_film_trolls') {
          newPosts.push(
            {
              id: `supp_${Date.now()}_1`,
              platform: 'X',
              authorName: 'حملة جمهور السينما',
              handle: '@CinemaLoversEG',
              content: `بصراحة «${activeProjectTitle}» أفضل عمل نزل السنادي من غير منازع! أداء جبار وإخراج عالمي من شركة «${state.studioName}» 👏🔥`,
              hashtag: `#${cleanTag}_رقم_واحد`,
              likes: '94.2K',
              shares: '27.8K',
              sentiment: 'viral_boost',
              timestampLabel: 'الآن · هجوم إيجابي كاسح',
            },
            {
              id: `supp_${Date.now()}_2`,
              platform: 'TikTok',
              authorName: 'تريندات الشباك',
              handle: '@BoxOfficeWave',
              content: `الطوابير قدام السينمات على «${activeProjectTitle}» مش طبيعية! الفيلم يستاهل كل جنيه 🍿🎬`,
              hashtag: `#${cleanTag}`,
              likes: '175K',
              shares: '34.1K',
              sentiment: 'viral_boost',
              timestampLabel: 'الآن · تيك توك',
            }
          );
        } else if (campaign.id === 'rival_rumor_trolls') {
          newPosts.push(
            {
              id: `rumor_${Date.now()}_1`,
              platform: 'X',
              authorName: 'تسريبات الفن السابع',
              handle: '@InsiderLeakEG',
              content: `أنباء مؤكدة عن خلافات حادة وانسحابات في كواليس «${rivalFilmTitle}» التابع لشركة «${rivalStudio}» والجمهور يشتكي من ضعف المونتاج! ⚡📉`,
              hashtag: `#أزمة_${rivalTag}`,
              likes: '68.4K',
              shares: '31.9K',
              sentiment: 'rival_attack',
              timestampLabel: 'الآن · إشاعة متصدرة',
            },
            {
              id: `rumor_${Date.now()}_2`,
              platform: 'TikTok',
              authorName: 'رادار النجوم',
              handle: '@StarRadarClips',
              content: `الجمهور بيخرج من نص عرض «${rivalFilmTitle}» وبيدخل قاعة «${activeProjectTitle}»! الفرق واضح جداً 🎯`,
              hashtag: `#مقاطعة_${rivalTag}`,
              likes: '142K',
              shares: '29.5K',
              sentiment: 'rival_attack',
              timestampLabel: 'الآن · فيديو مسرب',
            }
          );
        } else if (campaign.id === 'tiktok_viral_wave') {
          newPosts.push(
            {
              id: `tt_${Date.now()}_1`,
              platform: 'TikTok',
              authorName: 'عمر سينما ريفيو',
              handle: '@OmarCinemaEG',
              content: `مشهد المواجهة في «${activeProjectTitle}» من إنتاج ${state.studioName} كسر الدنيا على تيك توك! الإخراج والتمثيل في حتة تانية خالص 🔥🎬`,
              hashtag: `#${cleanTag}`,
              likes: '284K',
              shares: '49.2K',
              sentiment: 'viral_boost',
              timestampLabel: 'الآن · تريند #1 تيك توك',
            },
            {
              id: `tt_${Date.now()}_2`,
              platform: 'TikTok',
              authorName: 'سارة تريندات الفن',
              handle: '@SaraPopTrends',
              content: `القاعة كلها كانت بتصقف في عرض «${activeProjectTitle}».. لازم تشوفوه في الويك إند ده! 🍿✨`,
              hashtag: `#${cleanTag}_يكتسح`,
              likes: '162K',
              shares: '28.5K',
              sentiment: 'viral_boost',
              timestampLabel: 'الآن · مقطع رائج',
            }
          );
        } else if (campaign.id === 'x_hashtag_storm') {
          newPosts.push(
            {
              id: `x_${Date.now()}_1`,
              platform: 'X',
              authorName: 'مرصد شباك التذاكر المصري',
              handle: '@BoxOffice_Masr',
              content: `تصدر هاشتاج #${cleanTag} قائمة الأكثر تداولاً في مصر والخليج بعد إقبال جماهيري قياسي على حفلات شركة «${state.studioName}» بقيادة ${state.ceoName}.`,
              hashtag: `#${cleanTag}`,
              likes: '54.8K',
              shares: '19.4K',
              sentiment: 'viral_boost',
              timestampLabel: 'الآن · متصدر في مصر',
            },
            {
              id: `x_${Date.now()}_2`,
              platform: 'X',
              authorName: 'عشاق الفن السابع',
              handle: '@ArabicFilmClub',
              content: `«${state.studioName}» تثبت هذا الموسم أنها الرقم الأصعب في معادلة الإنتاج الضخم مع «${activeProjectTitle}» 👏🔥`,
              hashtag: `#${state.studioName.replace(/\s+/g, '_')}`,
              likes: '31.2K',
              shares: '9.1K',
              sentiment: 'viral_boost',
              timestampLabel: 'منذ دقيقتين',
            }
          );
        } else if (campaign.id === 'rival_smear_campaign') {
          newPosts.push(
            {
              id: `smear_${Date.now()}_1`,
              platform: 'X',
              authorName: 'ناقد بدون مجاملة',
              handle: '@NoFilterCritic',
              content: `خيبة أمل كبيرة في مستوى «${rivalFilmTitle}» التابع لشركة «${rivalStudio}».. استسهال واضح في الكتابة ومط وتطويل أفقد الجمهور حماسه للعمل! 👎`,
              hashtag: `#سقوط_${rivalTag}`,
              likes: '41.6K',
              shares: '16.3K',
              sentiment: 'rival_attack',
              timestampLabel: 'الآن · جدل واسع',
            },
            {
              id: `smear_${Date.now()}_2`,
              platform: 'TikTok',
              authorName: 'كواليس السوشيال',
              handle: '@SocialRadarEG',
              content: `تراجع ملحوظ في إقبال الجمهور على «${rivalFilmTitle}» أمام زخم أعمال «${state.studioName}» هذا الأسبوع 📉`,
              hashtag: `#مقارنة_الموسم`,
              likes: '118K',
              shares: '22.4K',
              sentiment: 'rival_attack',
              timestampLabel: 'الآن · تيك توك',
            }
          );
        } else {
          newPosts.push({
            id: `vip_${Date.now()}_1`,
            platform: 'X',
            authorName: 'رابطة نقاد السينما',
            handle: '@CairoCriticsGuild',
            content: `إشادات نقدية واسعة بعد العرض الخاص لـ «${activeProjectTitle}» من إنتاج «${state.studioName}»؛ تكامل بصري ودرامي يضعه في صدارة ترشيحات جوائز العام 🏆🎬`,
            hashtag: `#${cleanTag}`,
            likes: '38.9K',
            shares: '11.2K',
            sentiment: 'viral_boost',
            timestampLabel: 'الآن · عرض النقاد الخاص',
          });
          }
        }

        set((cur) => {
          let nextLast = cur.lastReleasedProject;
          let nextProjects = cur.releasedProjects;
          const nextCompDelta = { ...cur.competitorNetWorthDelta };
          let nextMvMod = cur.marketValueModifier || 0;
          let nextRep = cur.reputation;
          let nextHype = cur.draft.hypeScore;

          if (campaign.id === 'support_film_trolls') {
            nextHype = Math.min(100, nextHype + 12);
            nextMvMod += 8_000_000;
            if (nextLast) {
              const revBoost = Math.round(nextLast.totalGrossRevenue * 0.09) + 4_500_000;
              nextLast = {
                ...nextLast,
                audienceScore: Number(Math.min(9.6, nextLast.audienceScore + 0.4).toFixed(1)),
                boxOfficeRevenue: nextLast.boxOfficeRevenue + revBoost,
                totalGrossRevenue: nextLast.totalGrossRevenue + revBoost,
                targetGrossRevenue: (nextLast.targetGrossRevenue || nextLast.totalGrossRevenue) + revBoost,
                netProfit: nextLast.netProfit + revBoost,
                viralTrendLabel: `#${cleanTag} يكتسح السوشيال ميديا بدعم اللجان 🔥`,
              };
            }
          } else if (campaign.id === 'rival_rumor_trolls') {
            const prevRival = nextCompDelta[rivalStudio] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[rivalStudio] = {
              ...prevRival,
              netWorthDelta: prevRival.netWorthDelta - 35_000_000,
            };
            if (nextLast) {
              const updatedRivals = nextLast.rivalReleases.map((r) => {
                if (r.studioName === rivalStudio || r.title === rivalFilmTitle) {
                  const reducedRev = Math.max(
                    16_000_000,
                    Math.round(r.boxOfficeRevenue * 0.82)
                  );
                  return {
                    ...r,
                    boxOfficeRevenue: reducedRev,
                    targetBoxOfficeRevenue: Math.round(
                      (r.targetBoxOfficeRevenue || reducedRev) * 0.82
                    ),
                    criticScore: Number(Math.max(4.5, r.criticScore - 0.6).toFixed(1)),
                  };
                }
                return r;
              });
              const allRevs = [
                nextLast.totalGrossRevenue,
                ...updatedRivals.map((r) => r.boxOfficeRevenue),
              ].sort((a, b) => b - a);
              const newRank = Math.max(
                1,
                allRevs.indexOf(nextLast.totalGrossRevenue) + 1
              );
              nextLast = {
                ...nextLast,
                rivalReleases: updatedRivals,
                boxOfficeRank: newRank,
              };
            }
          } else if (campaign.id === 'tiktok_viral_wave') {
            nextHype = Math.min(100, nextHype + 15);
            if (nextLast) {
              const revBoost = Math.round(nextLast.totalGrossRevenue * 0.12) + 6_500_000;
              nextLast = {
                ...nextLast,
                audienceScore: Number(Math.min(9.6, nextLast.audienceScore + 0.5).toFixed(1)),
                boxOfficeRevenue: nextLast.boxOfficeRevenue + revBoost,
                totalGrossRevenue: nextLast.totalGrossRevenue + revBoost,
                targetGrossRevenue: (nextLast.targetGrossRevenue || nextLast.totalGrossRevenue) + revBoost,
                netProfit: nextLast.netProfit + revBoost,
                viralTrendLabel: `#${cleanTag} يتصدر تيك توك بملايين المشاهدات 🔥`,
              };
            }
          } else if (campaign.id === 'x_hashtag_storm') {
            nextHype = Math.min(100, nextHype + 18);
            nextMvMod += 14_000_000;
            if (nextLast) {
              const revBoost = Math.round(nextLast.totalGrossRevenue * 0.15) + 8_000_000;
              nextLast = {
                ...nextLast,
                audienceScore: Number(Math.min(9.6, nextLast.audienceScore + 0.4).toFixed(1)),
                boxOfficeRevenue: nextLast.boxOfficeRevenue + revBoost,
                totalGrossRevenue: nextLast.totalGrossRevenue + revBoost,
                targetGrossRevenue: (nextLast.targetGrossRevenue || nextLast.totalGrossRevenue) + revBoost,
                netProfit: nextLast.netProfit + revBoost,
                viralTrendLabel: `#${cleanTag} تريند رقم #1 على منصة X 🚀`,
              };
            }
          } else if (campaign.id === 'rival_smear_campaign') {
            const prevRival = nextCompDelta[rivalStudio] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[rivalStudio] = {
              ...prevRival,
              netWorthDelta: prevRival.netWorthDelta - 48_000_000,
            };
            if (nextLast) {
              const updatedRivals = nextLast.rivalReleases.map((r) => {
                if (r.studioName === rivalStudio || r.title === rivalFilmTitle) {
                  const reducedRev = Math.max(
                    18_000_000,
                    Math.round(r.boxOfficeRevenue * 0.78)
                  );
                  return {
                    ...r,
                    boxOfficeRevenue: reducedRev,
                    targetBoxOfficeRevenue: Math.round(
                      (r.targetBoxOfficeRevenue || reducedRev) * 0.78
                    ),
                    criticScore: Number(Math.max(4.5, r.criticScore - 0.7).toFixed(1)),
                  };
                }
                return r;
              });
              const allRevs = [
                nextLast.totalGrossRevenue,
                ...updatedRivals.map((r) => r.boxOfficeRevenue),
              ].sort((a, b) => b - a);
              const newRank = Math.max(
                1,
                allRevs.indexOf(nextLast.totalGrossRevenue) + 1
              );
              nextLast = {
                ...nextLast,
                rivalReleases: updatedRivals,
                boxOfficeRank: newRank,
              };
            }
          } else if (campaign.id === 'critics_vip_screening') {
            nextRep = Math.min(100, nextRep + 4);
            nextHype = Math.min(100, nextHype + 10);
            if (nextLast) {
              nextLast = {
                ...nextLast,
                criticScore: Number(Math.min(9.5, nextLast.criticScore + 0.6).toFixed(1)),
              };
            }
          }

          if (nextLast) {
            nextProjects = cur.releasedProjects.map((p) =>
              p.id === nextLast!.id ? nextLast! : p
            );
          }

          const nextMarketVal = calculateStudioMarketValue({
            cash: finalCash,
            reputation: nextRep,
            releasedProjects: nextProjects,
            marketValueModifier: nextMvMod,
          });

          return {
            cash: finalCash,
            reputation: nextRep,
            marketValueModifier: nextMvMod,
            marketValue: nextMarketVal,
            competitorNetWorthDelta: nextCompDelta,
            lastReleasedProject: nextLast,
            releasedProjects: nextProjects,
            ledgerSignature:
              verification.ledgerSignature || cur.ledgerSignature,
            draft: {
              ...cur.draft,
              hypeScore: nextHype,
            },
            socialFeedLog: [...newPosts, ...(cur.socialFeedLog || [])].slice(
              0,
              20
            ),
            aiMemoryLog: [
              `أطلقت شركة "${cur.studioName}" حملة (${campaign.title}) بتكلفة ${formatMoney(campaign.cost)} ج.م على منصات التواصل الاجتماعي.`,
              ...(cur.aiMemoryLog || []),
            ].slice(0, 25),
          };
        });

        get().showToast(
          aiOfficialStatement ||
            `تم إطلاق «${campaign.title}» وتصدر المشهد على منصات التواصل!`,
          'success',
          campaign.impactSummary
        );
        return true;
      },

      showToast: (message, type = 'warning', subtext) =>
        set({
          activeToast: {
            id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            message,
            type,
            subtext,
          },
        }),

      dismissToast: () => set({ activeToast: null }),

      initializeStudio: ({ studioName, ceoName, logo, founderPerk, region }) =>
        set({
          studioCreated: true,
          studioName: studioName.trim() || 'العقرب ستوديوز',
          ceoName: ceoName.trim() || 'المدير التنفيذي',
          logo,
          founderPerk,
          currentRegion: region,
          unlockedRegions: ['egypt'],
          cash: 75_000_000,
          marketValue: 110_000_000,
          marketValueModifier: 0,
          currentYear: 2026,
          gameDay: 1,
          lastAwardsGalaYear: 2025,
          activeScreen: 'STUDIO_HUB',
          worldHistory: [
            {
              year: 2026,
              eventText: `تأسيس شركة "${studioName.trim() || 'العقرب ستوديوز'}" بقيادة ${ceoName.trim() || 'المدير التنفيذي'} بسيولة خزينة 75M ج.م وقيمة سوقية 110M ج.م.`,
              category: 'milestone',
            },
          ],
          aiMemoryLog: [
            `أسس المنتج ${ceoName.trim() || 'المدير التنفيذي'} شركة "${studioName.trim() || 'العقرب ستوديوز'}" بسيولة خزينة 75M ج.م وقيمة سوقية ابتدائية 110M ج.م.`,
          ],
        }),

      quickStartDemoStudio: () =>
        set({
          studioCreated: true,
          studioName: 'العقرب ستوديوز',
          ceoName: 'محمود الصيرفي',
          activeScreen: 'STUDIO_HUB',
        }),

      setActiveScreen: (screen) => set({ activeScreen: screen }),

      unlockMarketRegionWithCash: (region) => {
        const state = get();
        if (state.unlockedRegions.includes(region)) return true;
        const cfg = MARKET_CONFIGS.find((c) => c.id === region);
        if (!cfg) return false;

        // If studio market value already meets the threshold, unlock for free!
        if (state.marketValue >= cfg.unlockMarketValue) {
          set({
            unlockedRegions: [...state.unlockedRegions, region],
            currentRegion: region,
            draft: {
              ...state.draft,
              selectedDistributionMarkets: Array.from(
                new Set([...(state.draft.selectedDistributionMarkets || ['egypt']), region])
              ),
            },
          });
          return true;
        }

        // Otherwise allow early licensing using treasury cash
        if (state.cash < cfg.earlyLicenseCost) return false;
        const nextCash = state.cash - cfg.earlyLicenseCost;
        const nextMvMod = (state.marketValueModifier || 0) + Math.round(cfg.earlyLicenseCost * 0.65);
        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: state.reputation,
          releasedProjects: state.releasedProjects,
          marketValueModifier: nextMvMod,
        });

        set({
          cash: nextCash,
          marketValueModifier: nextMvMod,
          marketValue: nextMv,
          unlockedRegions: [...state.unlockedRegions, region],
          currentRegion: region,
          draft: {
            ...state.draft,
            selectedDistributionMarkets: Array.from(
              new Set([...(state.draft.selectedDistributionMarkets || ['egypt']), region])
            ),
          },
          worldHistory: [
            {
              year: state.currentYear,
              eventText: `افتتاح مكتب توزيع إقليمي ودولي للشركة في «${cfg.name}» باستثمار ${formatMoney(cfg.earlyLicenseCost)} ج.م.`,
              category: 'milestone',
            },
            ...state.worldHistory,
          ],
        });
        return true;
      },

      toggleDraftDistributionMarket: (region) =>
        set((state) => {
          if (region === 'egypt') return state; // Base market is always active
          if (!state.unlockedRegions.includes(region)) return state;
          const currentList = state.draft.selectedDistributionMarkets || ['egypt'];
          const exists = currentList.includes(region);
          const nextList: MarketRegion[] = exists
            ? currentList.filter((r) => r !== region)
            : [...currentList, region];
          return {
            draft: {
              ...state.draft,
              selectedDistributionMarkets: nextList.length > 0 ? nextList : ['egypt'],
            },
          };
        }),

      triggerAnnualAwardsCeremonyNow: () =>
        set((state) => {
          const db = getResolvedDatabase(state.customDbPatch);
          const yearToJudge = state.currentYear;
          const playerProjectsThisYear = state.releasedProjects.filter(
            (p) => p.year === yearToJudge
          );

          // Ensure rival releases exist for this year
          let rivalsPool = state.yearlyRivalReleases.filter(
            (r) => !r.year || r.year === yearToJudge
          );
          if (rivalsPool.length < 3) {
            const extraFilmRivals = generateRivalReleases(
              [...db.competitor_studios, ...state.emergingCompetitors],
              db.actors,
              [],
              1.05,
              yearToJudge,
              'film'
            );
            const extraSeriesRivals = generateRivalReleases(
              [...db.competitor_studios, ...state.emergingCompetitors],
              db.actors,
              [],
              1.0,
              yearToJudge + 5,
              'series'
            );
            rivalsPool = [...rivalsPool, ...extraFilmRivals, ...extraSeriesRivals];
          }

          const gala = buildAnnualAwardsGalaForYear({
            playerProjectsInYear: playerProjectsThisYear,
            rivalReleasesInYear: rivalsPool,
            studioName: state.studioName,
            year: yearToJudge,
            db,
          });

          const updatedProjects = state.releasedProjects.map((proj) => {
            const wonForProj = gala.awardsByProjectId[proj.id] || [];
            if (wonForProj.length === 0) return { ...proj, festivalsTriggered: true };
            return {
              ...proj,
              awardsWon: Array.from(new Set([...proj.awardsWon, ...wonForProj])),
              festivalsTriggered: true,
            };
          });

          const updatedActorAwards = { ...state.actorAwardCounts };
          for (const aId of gala.winningActorIds) {
            updatedActorAwards[aId] = (updatedActorAwards[aId] || 0) + 1;
          }

          const nextCompDelta = { ...state.competitorNetWorthDelta };
          for (const [stName, awCount] of Object.entries(gala.rivalAwardsCountByStudio)) {
            const prev = nextCompDelta[stName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[stName] = {
              ...prev,
              awardsDelta: prev.awardsDelta + awCount,
              netWorthDelta: prev.netWorthDelta + awCount * 14_000_000,
            };
          }

          const totalPlayerWon = Object.values(gala.awardsByProjectId).flat().length;
          const nextRep = Math.min(100, state.reputation + totalPlayerWon * 3);
          const nextMarketVal = calculateStudioMarketValue({
            cash: state.cash,
            reputation: nextRep,
            releasedProjects: updatedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });

          // Advance to the start of the new year if not already there
          const currentYearIndex = Math.floor((state.gameDay - 1) / DAYS_PER_GAME_YEAR);
          const nextYearStartDay = (currentYearIndex + 1) * DAYS_PER_GAME_YEAR + 1;
          const shouldAdvanceYear = state.lastAwardsGalaYear < yearToJudge;

          return {
            gameDay: shouldAdvanceYear ? Math.max(state.gameDay, nextYearStartDay) : state.gameDay,
            currentYear: shouldAdvanceYear ? yearToJudge + 1 : state.currentYear,
            lastAwardsGalaYear: yearToJudge,
            releasedProjects: updatedProjects,
            lastReleasedProject: updatedProjects[0] || state.lastReleasedProject,
            actorAwardCounts: updatedActorAwards,
            competitorNetWorthDelta: nextCompDelta,
            reputation: nextRep,
            marketValue: nextMarketVal,
            festivalModalQueue: gala.ceremonies,
            yearlyRivalReleases: [],
            worldHistory: [
              {
                year: yearToJudge,
                eventText: `إقامة الحفل السنوي لتوزيع جوائز السينما والدراما لعام ${yearToJudge} وحصد الاستوديو ${totalPlayerWon} جائزة.`,
                category: 'award',
              },
              ...state.worldHistory,
            ],
          };
        }),

      advanceGameDay: (days = 1) =>
        set((state) => {
          const newGameDay = state.gameDay + days;
          const prevYearOffset = Math.floor((state.gameDay - 1) / DAYS_PER_GAME_YEAR);
          const nextYearOffset = Math.floor((newGameDay - 1) / DAYS_PER_GAME_YEAR);
          const yearsAdded = Math.max(0, nextYearOffset - prevYearOffset);
          const completedYear = state.currentYear;
          const newYear = state.currentYear + yearsAdded;

          let updatedDraft = { ...state.draft };
          const updatedOffers = { ...updatedDraft.talentOffers };
          const newNewsItems: WorldBreakingNewsModalItem[] = [];
          const nextActorDynamic = { ...state.actorDynamicState };
          const nextAiActors = [...state.aiGeneratedActors];
          const nextEmergingStudios = [...state.emergingCompetitors];
          const nextHistory = [...state.worldHistory];
          const nextMemory = [...(state.aiMemoryLog || [])];
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          let nextYearlyRivals = [...(state.yearlyRivalReleases || [])];
          let nextMarketValMod = state.marketValueModifier || 0;
          let nextRep = state.reputation;
          let nextReleasedProjects = [...state.releasedProjects];
          let nextLastReleased = state.lastReleasedProject;
          let nextFestivalQueue = [...state.festivalModalQueue];
          const nextActorAwardCounts = { ...state.actorAwardCounts };
          let nextLastGalaYear = state.lastAwardsGalaYear || 2025;
          let nextActiveToast = state.activeToast;

          const db = getResolvedDatabase(state.customDbPatch);
          const liveActors = getLiveActorsWithEvolution({
            baseActors: db.actors,
            aiGeneratedActors: nextAiActors,
            actorDynamicState: nextActorDynamic,
            currentYear: newYear,
            gameDay: newGameDay,
          });

          // 1. Evaluate pending talent offers that have reached their responseDueDay (2–3 full game days)
          for (const key of Object.keys(updatedOffers)) {
            const offer = updatedOffers[key];
            if (offer.status === 'pending' && newGameDay >= offer.responseDueDay) {
              if (!offer.willAccept) {
                updatedOffers[key] = { ...offer, status: 'rejected' };
                nextMarketValMod -= 2_500_000;
                updatedDraft.hypeScore = Math.max(15, updatedDraft.hypeScore - 3);
                const headline = `اعتذر «${offer.talentName}» عن عرض دور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}»`;
                newNewsItems.push({
                  id: `news_rej_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'رد رسمي من وكيل الأعمال · اعتذار عن التعاقد',
                  headline,
                  detail: offer.aiReason,
                  highlightName: offer.talentName,
                  extraStatBadge: `العرض: ${formatMoney(offer.offeredSalary)} ج.م`,
                  gameImpactLabel:
                    'يمكنك التفاوض بشروط جديدة أو اختيار بديل آخر من القائمة',
                });
                nextHistory.unshift({
                  year: newYear,
                  eventText: `${headline} — ${offer.aiReason}`,
                  category: 'milestone',
                });
                nextMemory.unshift(
                  `رفض النجم ${offer.talentName} عرض شركة "${state.studioName}" لدور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" في عمل "${updatedDraft.title || 'مشروع جديد'}".`
                );
              } else {
                // Check if the crew slot is already at max capacity (e.g., 2 directors already signed, or 1 DOP/Composer/VFX already signed)
                const currentSlotIds = getSignedIdsForSlot(updatedDraft, offer.roleSlot);
                const isCrewSlot =
                  offer.roleSlot === 'director' ||
                  offer.roleSlot === 'cinematographer' ||
                  offer.roleSlot === 'composer' ||
                  offer.roleSlot === 'editor_vfx';
                const maxForSlot = SLOT_MAX_CAPACITY[offer.roleSlot] || 1;
                const exceedsCrewCapacity =
                  isCrewSlot &&
                  !currentSlotIds.includes(offer.talentId) &&
                  currentSlotIds.length >= maxForSlot;

                const signedOffer: TalentOfferRecord = {
                  ...offer,
                  status: exceedsCrewCapacity
                    ? 'accepted_awaiting_choice'
                    : 'accepted',
                };
                updatedOffers[key] = signedOffer;

                if (!exceedsCrewCapacity) {
                  updatedDraft = applyAcceptedOfferToDraft(updatedDraft, signedOffer);
                }

                nextMarketValMod += 4_500_000;
                updatedDraft.hypeScore = Math.min(100, updatedDraft.hypeScore + 5);
                const headline = `وافق «${offer.talentName}» رسمياً على عقد «${updatedDraft.title || 'العمل الجديد'}» (${SLOT_ARABIC_NAMES[offer.roleSlot]})! ✓`;
                newNewsItems.push({
                  id: `news_acc_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'رد رسمي من وكيل الأعمال · قبول التعاقد ✓',
                  headline,
                  detail: offer.aiReason,
                  highlightName: offer.talentName,
                  extraStatBadge: `الأجر: ${formatMoney(offer.offeredSalary)} ج.م`,
                  gameImpactLabel: exceedsCrewCapacity
                    ? `وافق أكثر من العدد الأقصى لفئة (${SLOT_ARABIC_NAMES[offer.roleSlot]}) — اختر من تعتمده في الفريق النهائي`
                    : `تم اعتماده رسمياً في فريق العمل (${SLOT_ARABIC_NAMES[offer.roleSlot]})`,
                });
                nextHistory.unshift({
                  year: newYear,
                  eventText: `${headline} مقابل ${formatMoney(offer.offeredSalary)} ج.م.`,
                  category: 'milestone',
                });
                nextMemory.unshift(
                  `وقّع النجم ${offer.talentName} مع شركة "${state.studioName}" بقيادة ${state.ceoName} لأداء دور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" بأجر ${formatMoney(offer.offeredSalary)} ج.م.`
                );
              }
            }
          }

          updatedDraft.talentOffers = updatedOffers;

          // 2. If filming has started, advance filming days automatically
          if (
            updatedDraft.filmingStartDay !== null &&
            newGameDay >= updatedDraft.filmingStartDay &&
            updatedDraft.filmingDaysElapsed < updatedDraft.filmingDurationDays
          ) {
            updatedDraft.filmingDaysElapsed = Math.min(
              updatedDraft.filmingDurationDays,
              updatedDraft.filmingDaysElapsed + days
            );
          }

          // 2b. Progressive Daily Box Office / Viewership Growth for Active Released Project!
          let nextCash = state.cash;
          if (nextLastReleased) {
            for (let d = 0; d < days; d++) {
              const stepped = stepProjectRevenueProgress(
                nextLastReleased,
                1.0,
                1.0
              );
              if (stepped.revenueDelta > 0) {
                nextLastReleased = stepped.updatedProject;
                nextCash += stepped.revenueDelta;
              }
            }
            const activeReleasedSnap = nextLastReleased;
            nextReleasedProjects = nextReleasedProjects.map((p) =>
              p.id === activeReleasedSnap.id ? activeReleasedSnap : p
            );
          }

          // 3. Organic Rival Studio Releases during the year (every 30 game days):
          if (newGameDay > 5 && newGameDay % 30 === 0) {
            const allCompetitors = [...db.competitor_studios, ...nextEmergingStudios];
            const isSeriesWindow = (newGameDay / 30) % 2 === 0;
            const organicRivals = generateRivalReleases(
              allCompetitors,
              liveActors,
              updatedDraft.leadActorIds,
              1.0,
              newGameDay,
              isSeriesWindow ? 'series' : 'film'
            ).map((r) => ({ ...r, year: newYear }));

            for (const riv of organicRivals) {
              if (riv.status === 'delayed') continue;
              nextYearlyRivals.push(riv);
              const prevComp = nextCompDelta[riv.studioName] || {
                netWorthDelta: 0,
                releasesDelta: 0,
                awardsDelta: 0,
              };
              const estimatedProfit =
                riv.criticScore >= 7.2
                  ? Math.round(riv.boxOfficeRevenue * 0.42)
                  : riv.criticScore >= 6.0
                  ? Math.round(riv.boxOfficeRevenue * 0.22)
                  : -14_000_000;

              nextCompDelta[riv.studioName] = {
                netWorthDelta: prevComp.netWorthDelta + estimatedProfit,
                releasesDelta: prevComp.releasesDelta + 1,
                awardsDelta: prevComp.awardsDelta,
              };
            }
          }

          // 4. Rare Veteran Actor Retirement or Passing Away (only every 80 days when on Hub and no popup is active)
          if (
            newGameDay > 20 &&
            newGameDay % 80 === 0 &&
            state.activeScreen === 'STUDIO_HUB' &&
            state.breakingNewsQueue.length === 0 &&
            newNewsItems.length === 0
          ) {
            const veteranActors = liveActors.filter(
              (a) =>
                a.status === 'active' &&
                a.age >= 64 &&
                !updatedDraft.leadActorIds.includes(a.id) &&
                updatedDraft.antagonistId !== a.id &&
                !updatedDraft.supportingActorIds.includes(a.id)
            );
            if (veteranActors.length > 0) {
              const chosenVet = veteranActors[newGameDay % veteranActors.length];
              const isDeceased = chosenVet.age >= 74 && newGameDay % 2 === 0;
              const prevDyn = nextActorDynamic[chosenVet.id] || {
                overallDelta: 0,
                actingDelta: 0,
                charismaDelta: 0,
                pullDelta: 0,
                salaryMultiplier: 1,
              };
              nextActorDynamic[chosenVet.id] = {
                ...prevDyn,
                status: isDeceased ? 'deceased' : 'retired',
              };

              const headline = isDeceased
                ? `نبأ عاجل: رحيل الفنان القدير «${chosenVet.name}» عن عمر يناهز ${chosenVet.age} عاماً`
                : `الفنان القدير «${chosenVet.name}» (${chosenVet.age} سنة) يعلن اعتزاله التمثيل نهائياً`;
              const detail = isDeceased
                ? `خيّم الحزن على الوسط الفني بعد إعلان وفاة الفنان القدير «${chosenVet.name}» تاركاً إرثاً خالداً في ذاكرة السينما والدراما.`
                : `أعلن الفنان «${chosenVet.name}» اكتفاءه بمسيرته الفنية الحافلة واعتزاله العمل السينمائي والدرامي وسط تكريم واسع من صناع السينما.`;

              newNewsItems.push({
                id: `world_vet_${chosenVet.id}_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: isDeceased ? 'actor_deceased' : 'actor_retired',
                badgeLabel: isDeceased ? 'خبر عاجل · الوسط الفني 🕊️' : 'خبر صحفي · اعتزال فني',
                headline,
                detail,
                highlightName: chosenVet.name,
                extraStatBadge: `العمر: ${chosenVet.age} سنة`,
                gameImpactLabel: `تأثير الخبر: خروج «${chosenVet.name}» من قائمة الممثلين المتاحين للتعاقد`,
              });
              nextHistory.unshift({
                year: newYear,
                eventText: headline,
                category: 'milestone',
              });
              nextMemory.unshift(headline);
            }
          }

          // 5. ANNUAL SURPRISE AWARDS CEREMONY!
          // Triggers automatically at the exact end of each calendar year (every 120 game days)!
          if (yearsAdded > 0 && nextLastGalaYear < completedYear) {
            nextLastGalaYear = completedYear;
            const playerProjectsInCompletedYear = nextReleasedProjects.filter(
              (p) => p.year === completedYear
            );

            let rivalsInYear = nextYearlyRivals.filter(
              (r) => !r.year || r.year === completedYear
            );
            if (rivalsInYear.length < 3) {
              rivalsInYear = [
                ...rivalsInYear,
                ...generateRivalReleases(
                  [...db.competitor_studios, ...nextEmergingStudios],
                  liveActors,
                  [],
                  1.05,
                  completedYear,
                  'film'
                ),
                ...generateRivalReleases(
                  [...db.competitor_studios, ...nextEmergingStudios],
                  liveActors,
                  [],
                  1.0,
                  completedYear + 3,
                  'series'
                ),
              ];
            }

            const gala = buildAnnualAwardsGalaForYear({
              playerProjectsInYear: playerProjectsInCompletedYear,
              rivalReleasesInYear: rivalsInYear,
              studioName: state.studioName,
              year: completedYear,
              db,
            });

            nextReleasedProjects = nextReleasedProjects.map((proj) => {
              const wonForProj = gala.awardsByProjectId[proj.id] || [];
              if (wonForProj.length === 0) return { ...proj, festivalsTriggered: true };
              return {
                ...proj,
                awardsWon: Array.from(new Set([...proj.awardsWon, ...wonForProj])),
                festivalsTriggered: true,
              };
            });
            if (nextLastReleased) {
              nextLastReleased =
                nextReleasedProjects.find((p) => p.id === nextLastReleased?.id) ||
                nextLastReleased;
            }

            for (const aId of gala.winningActorIds) {
              nextActorAwardCounts[aId] = (nextActorAwardCounts[aId] || 0) + 1;
            }

            for (const [stName, awCount] of Object.entries(gala.rivalAwardsCountByStudio)) {
              const prev = nextCompDelta[stName] || {
                netWorthDelta: 0,
                releasesDelta: 0,
                awardsDelta: 0,
              };
              nextCompDelta[stName] = {
                ...prev,
                awardsDelta: prev.awardsDelta + awCount,
                netWorthDelta: prev.netWorthDelta + awCount * 14_000_000,
              };
            }

            const totalPlayerWon = Object.values(gala.awardsByProjectId).flat().length;
            nextRep = Math.min(100, nextRep + totalPlayerWon * 3);
            nextFestivalQueue = gala.ceremonies;
            nextYearlyRivals = [];

            nextHistory.unshift({
              year: completedYear,
              eventText: `انطلاق الحفل السنوي لجوائز السينما والدراما (${completedYear}) وحصد الاستوديو ${totalPlayerWon} جوائز رسمية.`,
              category: 'award',
            });
            nextHistory.unshift({
              year: newYear,
              eventText: `بداية عام سينمائي جديد (${newYear}) وتقدم أعمار جميع النجوم في السوق بعام إضافي.`,
              category: 'milestone',
            });
          }

          const nextMarketValue = calculateStudioMarketValue({
            cash: nextCash,
            reputation: nextRep,
            releasedProjects: nextReleasedProjects,
            marketValueModifier: nextMarketValMod,
          });

          return {
            cash: nextCash,
            gameDay: newGameDay,
            currentYear: newYear,
            lastAwardsGalaYear: nextLastGalaYear,
            reputation: nextRep,
            marketValueModifier: nextMarketValMod,
            marketValue: nextMarketValue,
            draft: updatedDraft,
            releasedProjects: nextReleasedProjects,
            lastReleasedProject: nextLastReleased,
            yearlyRivalReleases: nextYearlyRivals,
            actorAwardCounts: nextActorAwardCounts,
            actorDynamicState: nextActorDynamic,
            aiGeneratedActors: nextAiActors,
            emergingCompetitors: nextEmergingStudios,
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            festivalModalQueue: nextFestivalQueue,
            worldHistory: nextHistory,
            aiMemoryLog: nextMemory.slice(0, 25),
            activeToast: nextActiveToast,
          };
        }),

      submitTalentOffer: (offer) =>
        set((state) => {
          const dinnerFee = offer.vipDinner ? (offer.vipDinnerCost ?? VIP_DINNER_COST) : 0;
          const nextCash = Math.max(0, state.cash - dinnerFee);
          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: state.reputation,
            releasedProjects: state.releasedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });
          const memoryEntry = `أرسلت شركة "${state.studioName}" عرض تعاقد إلى ${offer.talentName} لأداء دور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" في «${state.draft.title || 'عمل جديد'}» بأجر ${formatMoney(offer.offeredSalary)} ج.م ونسبة أرباح ${offer.backendPoints}% (الرد في اليوم ${offer.responseDueDay}).`;
          return {
            cash: nextCash,
            marketValue: nextMarketVal,
            aiMemoryLog: [memoryEntry, ...(state.aiMemoryLog || [])].slice(0, 35),
            draft: {
              ...state.draft,
              talentOffers: {
                ...state.draft.talentOffers,
                [offer.talentId]: offer,
              },
            },
          };
        }),

      toggleCrewSelectionForSlot: (slot, talentId) =>
        set((state) => {
          const updatedDraft = { ...state.draft };
          const updatedOffers = { ...updatedDraft.talentOffers };

          if (slot === 'director') {
            const currentDirs = Array.from(
              new Set([
                ...(updatedDraft.directorIds || []),
                ...(updatedDraft.directorId ? [updatedDraft.directorId] : []),
              ])
            );
            let nextDirs: string[];
            if (currentDirs.includes(talentId)) {
              nextDirs = currentDirs.filter((id) => id !== talentId);
            } else {
              if (currentDirs.length >= 2) {
                return {
                  activeToast: {
                    id: `toast_dir_limit_${Date.now()}`,
                    message:
                      'الحد الأقصى لفريق الإخراج هو مخرجان اثنان فقط (من 1 إلى 2)! ألغِ اعتماد أحد المخرجين أولاً لاختيار مخرج آخر.',
                    type: 'warning',
                  },
                };
              }
              nextDirs = [...currentDirs, talentId];
            }
            updatedDraft.directorIds = nextDirs;
            updatedDraft.directorId = nextDirs[0] || null;

            for (const key of Object.keys(updatedOffers)) {
              const off = updatedOffers[key];
              if (
                off.roleSlot === 'director' &&
                (off.status === 'accepted' || off.status === 'accepted_awaiting_choice')
              ) {
                updatedOffers[key] = {
                  ...off,
                  status: nextDirs.includes(off.talentId)
                    ? 'accepted'
                    : 'accepted_awaiting_choice',
                };
              }
            }
          } else if (
            slot === 'cinematographer' ||
            slot === 'composer' ||
            slot === 'editor_vfx'
          ) {
            if (slot === 'cinematographer') updatedDraft.dopId = talentId;
            if (slot === 'composer') updatedDraft.composerId = talentId;
            if (slot === 'editor_vfx') updatedDraft.vfxId = talentId;

            for (const key of Object.keys(updatedOffers)) {
              const off = updatedOffers[key];
              if (
                off.roleSlot === slot &&
                (off.status === 'accepted' || off.status === 'accepted_awaiting_choice')
              ) {
                updatedOffers[key] = {
                  ...off,
                  status:
                    off.talentId === talentId
                      ? 'accepted'
                      : 'accepted_awaiting_choice',
                };
              }
            }
          }

          updatedDraft.talentOffers = updatedOffers;
          return { draft: updatedDraft };
        }),

      confirmMultiAcceptedChoice: (slot, chosenTalentIds) =>
        set((state) => {
          let updatedDraft = { ...state.draft };
          const updatedOffers = { ...updatedDraft.talentOffers };

          if (slot === 'director') {
            const finalDirs = chosenTalentIds.slice(0, 2);
            updatedDraft.directorIds = finalDirs;
            updatedDraft.directorId = finalDirs[0] || null;
          } else if (slot === 'cinematographer') {
            updatedDraft.dopId = chosenTalentIds[0] || null;
          } else if (slot === 'composer') {
            updatedDraft.composerId = chosenTalentIds[0] || null;
          } else if (slot === 'editor_vfx') {
            updatedDraft.vfxId = chosenTalentIds[0] || null;
          }

          for (const key of Object.keys(updatedOffers)) {
            const offer = updatedOffers[key];
            if (offer.roleSlot !== slot) continue;

            if (chosenTalentIds.includes(offer.talentId)) {
              const signedOffer: TalentOfferRecord = {
                ...offer,
                status: 'accepted',
              };
              updatedOffers[key] = signedOffer;
              updatedDraft = applyAcceptedOfferToDraft(updatedDraft, signedOffer);
            } else if (
              offer.status === 'accepted' ||
              offer.status === 'accepted_awaiting_choice' ||
              offer.status === 'pending'
            ) {
              updatedOffers[key] = {
                ...offer,
                status: 'released_by_studio',
              };
            }
          }

          updatedDraft.talentOffers = updatedOffers;
          return { draft: updatedDraft };
        }),

      removeTalentFromDraft: (talentId) =>
        set((state) => {
          const nextOffers = { ...state.draft.talentOffers };
          delete nextOffers[talentId];
          const nextRoles = { ...(state.draft.castCustomRoles || {}) };
          delete nextRoles[talentId];
          const nextDirectorIds = Array.from(
            new Set([
              ...(state.draft.directorIds || []),
              ...(state.draft.directorId ? [state.draft.directorId] : []),
            ])
          ).filter((id) => id !== talentId);
          return {
            draft: {
              ...state.draft,
              directorIds: nextDirectorIds,
              directorId: nextDirectorIds[0] || null,
              dopId: state.draft.dopId === talentId ? null : state.draft.dopId,
              composerId: state.draft.composerId === talentId ? null : state.draft.composerId,
              vfxId: state.draft.vfxId === talentId ? null : state.draft.vfxId,
              leadActorIds: state.draft.leadActorIds.filter((id) => id !== talentId),
              antagonistId: state.draft.antagonistId === talentId ? null : state.draft.antagonistId,
              supportingActorIds: state.draft.supportingActorIds.filter((id) => id !== talentId),
              cameoActorIds: state.draft.cameoActorIds.filter((id) => id !== talentId),
              castCustomRoles: nextRoles,
              talentOffers: nextOffers,
            },
          };
        }),

      updateDraft: (partial) =>
        set((state) => ({
          draft: { ...state.draft, ...partial },
        })),

      resetDraftForNewProject: (targetScreen = 'STUDIO_HUB') =>
        set((state) => ({
          draft: {
            ...DEFAULT_DRAFT,
            title: '',
            scriptSynopsis: '',
            selectedDistributionMarkets: [...state.unlockedRegions],
            crises: [],
            castCustomRoles: {},
            negotiatedDiscounts: {},
            talentOffers: {},
            juryBribed: false,
            filmingStartDay: null,
            filmingDurationDays: 8,
            scheduledReleaseDay: null,
            filmingDaysElapsed: 0,
            productionNews: [],
          },
          activeScreen: targetScreen,
        })),

      toggleVipDinnerForTalent: (talentId) =>
        set((state) => {
          const existing = state.draft.negotiatedDiscounts[talentId] || {
            backendPoints: 0,
            vipDinner: false,
          };
          return {
            draft: {
              ...state.draft,
              negotiatedDiscounts: {
                ...state.draft.negotiatedDiscounts,
                [talentId]: {
                  ...existing,
                  vipDinner: !existing.vipDinner,
                },
              },
            },
          };
        }),

      setBackendPointsForTalent: (talentId, points) =>
        set((state) => {
          const existing = state.draft.negotiatedDiscounts[talentId] || {
            backendPoints: 0,
            vipDinner: false,
          };
          return {
            draft: {
              ...state.draft,
              negotiatedDiscounts: {
                ...state.draft.negotiatedDiscounts,
                [talentId]: {
                  ...existing,
                  backendPoints: points,
                },
              },
            },
          };
        }),

      watchVipAdStep: () =>
        set((state) => {
          const nextStep = Math.min(5, state.vipAdProgress + 1);
          const unlocked = nextStep >= 5;
          return {
            vipAdProgress: nextStep,
            vipPassExpiresAt: unlocked ? Date.now() + 24 * 60 * 60 * 1000 : state.vipPassExpiresAt,
            cash: unlocked ? state.cash + 40_000_000 : state.cash,
            vipCoins: unlocked ? state.vipCoins + 500 : state.vipCoins + 50,
          };
        }),

      resolveCrisisOption: (crisisId, choice) =>
        set((state) => {
          const crisis = state.draft.crises.find((c) => c.id === crisisId);
          if (!crisis || crisis.resolved) return state;
          const opt = choice === 'A' ? crisis.optionA : crisis.optionB;
          const nextCash = state.cash - opt.cost;
          const repDelta =
            opt.qualityDelta >= 3 ? 1 : opt.qualityDelta <= -4 ? -2 : 0;
          const nextRep = Math.max(15, Math.min(100, state.reputation + repDelta));
          const schedulePenalty = opt.qualityDelta <= -5 ? 1 : 0;
          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: nextRep,
            releasedProjects: state.releasedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });
          return {
            cash: nextCash,
            reputation: nextRep,
            marketValue: nextMarketVal,
            draft: {
              ...state.draft,
              hypeScore: Math.max(10, Math.min(100, state.draft.hypeScore + opt.hypeDelta)),
              qualityModifier: state.draft.qualityModifier + opt.qualityDelta,
              filmingDurationDays: state.draft.filmingDurationDays + schedulePenalty,
              crises: state.draft.crises.map((c) =>
                c.id === crisisId ? { ...c, resolved: true, chosenOption: choice } : c
              ),
            },
          };
        }),

      completeProjectRelease: (record) =>
        set((state) => {
          const newCash = state.cash - record.totalBudget + record.totalGrossRevenue;
          const nextProjects = [record, ...state.releasedProjects];

          const repDelta =
            record.criticScore >= 7.8
              ? 6
              : record.criticScore >= 6.6
              ? 2
              : record.criticScore < 5.6
              ? -5
              : -1;
          const nextRep = Math.min(100, Math.max(15, state.reputation + repDelta));

          const nextMarketValue = calculateStudioMarketValue({
            cash: newCash,
            reputation: nextRep,
            releasedProjects: nextProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });

          const unlocked = [...state.unlockedRegions];
          if (nextMarketValue >= 220_000_000 && !unlocked.includes('gulf')) unlocked.push('gulf');
          if (nextMarketValue >= 450_000_000 && !unlocked.includes('europe')) unlocked.push('europe');
          if (nextMarketValue >= 850_000_000 && !unlocked.includes('hollywood')) unlocked.push('hollywood');

          const nextActorDynamic = { ...state.actorDynamicState };
          const newNewsItems: WorldBreakingNewsModalItem[] = [];
          const db = getResolvedDatabase(state.customDbPatch);
          const allActors = [...state.aiGeneratedActors, ...db.actors];

          const castIds = record.actorIdsInCast || [
            ...state.draft.leadActorIds,
            ...(state.draft.antagonistId ? [state.draft.antagonistId] : []),
            ...state.draft.supportingActorIds,
          ];

          const projectedNetProfit =
            (record.targetGrossRevenue || record.totalGrossRevenue) - record.totalBudget;
          const isMajorHit = record.criticScore >= 7.4 && projectedNetProfit >= 15_000_000;
          const isFlop = record.criticScore < 5.8 || projectedNetProfit < -5_000_000;

          for (const actorId of castIds) {
            const baseActor = allActors.find((a) => a.id === actorId);
            if (!baseActor) continue;
            const prev = nextActorDynamic[actorId] || {
              overallDelta: 0,
              actingDelta: 0,
              charismaDelta: 0,
              pullDelta: 0,
              salaryMultiplier: 1,
            };

            const currentOvr = baseActor.stats.overall + prev.overallDelta;

            if (isMajorHit) {
              const isBreakoutCandidate = currentOvr < 82;
              const boostOvr = isBreakoutCandidate ? 5 : 2;
              const salaryBoost = isBreakoutCandidate ? 1.35 : 1.15;
              const newOvr = Math.min(99, currentOvr + boostOvr);
              const newTier: 'S' | 'A' | 'B' | 'C' =
                newOvr >= 90 ? 'S' : newOvr >= 82 ? 'A' : newOvr >= 73 ? 'B' : 'C';

              nextActorDynamic[actorId] = {
                ...prev,
                overallDelta: prev.overallDelta + boostOvr,
                actingDelta: prev.actingDelta + boostOvr,
                charismaDelta: prev.charismaDelta + boostOvr,
                pullDelta: prev.pullDelta + boostOvr + 1,
                salaryMultiplier: Number((prev.salaryMultiplier * salaryBoost).toFixed(2)),
                tierOverride: newTier,
                lastEvolutionNote: `تطور البطاقة (+${boostOvr}) بعد نجاح «${record.title}»`,
              };

              if (isBreakoutCandidate) {
                newNewsItems.push({
                  id: `breakout_${actorId}_${Date.now()}`,
                  day: state.gameDay,
                  year: state.currentYear,
                  category: 'actor_evolution',
                  badgeLabel: 'انفجار موهبة وتطور بطاقة ممثل 🔥',
                  headline: `تحول «${baseActor.name}» إلى نجم شباك بعد تألقه في «${record.title}»!`,
                  detail: `بفضل السيناريو المتقن والنجاح النقدي والجماهيري لـ «${record.title}»، قفزت طاقة بطاقة الممثل «${baseActor.name}» بمقدار (+${boostOvr} نقاط) ليصل إلى تقييم ${newOvr} (فئة ${newTier})، وارتفع أجره السوقي وسط تهافت الشركات المنافسة عليه!`,
                  highlightName: baseActor.name,
                  extraStatBadge: `التقييم الجديد: ${newOvr} (+${boostOvr}) · فئة ${newTier}`,
                  gameImpactLabel: `تأثير الحدث: ترقية بطاقة «${baseActor.name}» إلى الفئة ${newTier}`,
                });
              }
            } else if (isFlop) {
              const dropOvr = -2;
              const newOvr = Math.max(58, currentOvr + dropOvr);
              const newTier: 'S' | 'A' | 'B' | 'C' =
                newOvr >= 90 ? 'S' : newOvr >= 82 ? 'A' : newOvr >= 73 ? 'B' : 'C';

              nextActorDynamic[actorId] = {
                ...prev,
                overallDelta: prev.overallDelta + dropOvr,
                actingDelta: prev.actingDelta - 1,
                charismaDelta: prev.charismaDelta - 1,
                pullDelta: prev.pullDelta - 3,
                salaryMultiplier: Number(Math.max(0.65, prev.salaryMultiplier * 0.88).toFixed(2)),
                tierOverride: newTier,
                lastEvolutionNote: `هبوط البطاقة (${dropOvr}) بعد تعثر «${record.title}»`,
              };
            }
          }

          // Update competitor studios' net worths realistically based on their actual box-office results!
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          const nextYearlyRivals = [...(state.yearlyRivalReleases || [])];

          for (const rival of record.rivalReleases) {
            const prevComp = nextCompDelta[rival.studioName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            if (rival.status === 'delayed') {
              nextCompDelta[rival.studioName] = {
                ...prevComp,
                netWorthDelta: prevComp.netWorthDelta - 12_000_000,
              };
              continue;
            }

            nextYearlyRivals.push({
              ...rival,
              format: record.format,
              year: state.currentYear,
            });

            // Realistic net profit & brand value addition from this rival release
            const rivalValuationGain =
              rival.criticScore >= 7.5 && rival.boxOfficeRevenue >= 45_000_000
                ? Math.round(rival.boxOfficeRevenue * 0.48)
                : rival.criticScore >= 6.2
                ? Math.round(rival.boxOfficeRevenue * 0.28)
                : -16_000_000;

            nextCompDelta[rival.studioName] = {
              netWorthDelta: prevComp.netWorthDelta + rivalValuationGain,
              releasesDelta: prevComp.releasesDelta + 1,
              awardsDelta: prevComp.awardsDelta,
            };
          }

          const nextMemory = [
            `طرحت شركة "${state.studioName}" بقيادة ${state.ceoName} ${record.format === 'film' ? 'فيلم' : 'مسلسل'} "${record.title}" بتكلفة ${formatMoney(record.totalBudget)} ج.م وحقق إجمالي إيرادات ${formatMoney(record.totalGrossRevenue)} ج.م (صافي الربح: ${formatMoney(record.netProfit)} ج.م) والمركز #${record.boxOfficeRank} في الموسم وتقييم نقاد ${record.criticScore}/10.`,
            ...(state.aiMemoryLog || []),
          ].slice(0, 25);

          return {
            cash: newCash,
            marketValue: nextMarketValue,
            reputation: nextRep,
            unlockedRegions: unlocked,
            releasedProjects: nextProjects,
            lastReleasedProject: record,
            yearlyRivalReleases: nextYearlyRivals,
            actorDynamicState: nextActorDynamic,
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            aiMemoryLog: nextMemory,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: `طرح ${record.format === 'film' ? 'فيلم' : 'مسلسل'} "${record.title}" بإيرادات ${formatMoney(record.totalGrossRevenue)} ج.م (المركز #${record.boxOfficeRank}) وتقييم نقاد ${record.criticScore}/10.`,
                category: 'release',
              },
              ...state.worldHistory,
            ],
          };
        }),

      advanceReleaseTrackingDay: (newsItem, playerMomentum = 1.0, rivalMomentum = 1.0) =>
        set((state) => {
          const current = state.lastReleasedProject;
          if (!current) return state;

          const { updatedProject: updatedLast, revenueDelta } =
            stepProjectRevenueProgress(
              current,
              playerMomentum,
              rivalMomentum,
              newsItem
            );

          const nextCash = state.cash + revenueDelta;
          const updatedProjects = state.releasedProjects.map((p) =>
            p.id === updatedLast.id ? updatedLast : p
          );

          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: state.reputation,
            releasedProjects: updatedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });

          return {
            cash: nextCash,
            marketValue: nextMarketVal,
            lastReleasedProject: updatedLast,
            releasedProjects: updatedProjects,
          };
        }),

      triggerElectronicTrollsCampaign: (projectId) =>
        set((state) => {
          const updatedProjects = state.releasedProjects.map((p) => {
            if (p.id !== projectId || p.trollsCampaigned) return p;
            const bonusRev = Math.round(p.totalGrossRevenue * 0.15);
            return {
              ...p,
              audienceScore: Number(Math.min(9.5, p.audienceScore + 0.9).toFixed(1)),
              totalGrossRevenue: p.totalGrossRevenue + bonusRev,
              netProfit: p.netProfit + bonusRev,
              trollsCampaigned: true,
              viralTrendLabel: 'تريند رقم #1 بعد حملة ترويجية واسعة!',
            };
          });
          const updatedLast =
            state.lastReleasedProject?.id === projectId
              ? updatedProjects.find((p) => p.id === projectId) || state.lastReleasedProject
              : state.lastReleasedProject;

          return {
            releasedProjects: updatedProjects,
            lastReleasedProject: updatedLast,
            cash: state.cash + 10_000_000,
          };
        }),

      triggerFestivalJuryPR: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            juryBribed: true,
          },
        })),

      recordFestivalAwards: (festivalName, awards, winningActorIds) =>
        set((state) => {
          const updatedCounts = { ...state.actorAwardCounts };
          for (const actorId of winningActorIds) {
            updatedCounts[actorId] = (updatedCounts[actorId] || 0) + 1;
          }
          const latestProj = state.lastReleasedProject;
          const mergedAwards = latestProj
            ? Array.from(new Set([...latestProj.awardsWon, ...awards]))
            : awards;
          const updatedLast = latestProj
            ? { ...latestProj, awardsWon: mergedAwards, festivalsTriggered: true }
            : null;
          const updatedProjects = state.releasedProjects.map((p) =>
            p.id === latestProj?.id ? { ...p, awardsWon: mergedAwards, festivalsTriggered: true } : p
          );
          const nextRep = Math.min(100, state.reputation + awards.length * 3);
          const nextMarketVal = calculateStudioMarketValue({
            cash: state.cash,
            reputation: nextRep,
            releasedProjects: updatedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });

          return {
            reputation: nextRep,
            marketValue: nextMarketVal,
            actorAwardCounts: updatedCounts,
            lastReleasedProject: updatedLast,
            releasedProjects: updatedProjects,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: `في ${festivalName}: حصد الاستوديو ${awards.length} جوائز (${awards.join('، ')}).`,
                category: 'award',
              },
              ...state.worldHistory,
            ],
          };
        }),

      pushBreakingNewsModal: (news) =>
        set((state) => ({
          breakingNewsQueue: [...state.breakingNewsQueue, news],
        })),

      dismissBreakingNewsModal: () =>
        set((state) => ({
          breakingNewsQueue: state.breakingNewsQueue.slice(1),
        })),

      pushFestivalCeremonyModal: (ceremony) =>
        set((state) => {
          if (state.festivalModalQueue.some((c) => c.festivalId === ceremony.festivalId)) {
            return state;
          }
          return {
            festivalModalQueue: [...state.festivalModalQueue, ceremony].slice(0, 3),
          };
        }),

      dismissFestivalCeremonyModal: () =>
        set((state) => ({
          festivalModalQueue: state.festivalModalQueue.slice(1),
        })),

      addAiDiscoveredActor: (actor, newsHeadline, newsDetail) =>
        set((state) => {
          if (state.aiGeneratedActors.some((a) => a.name === actor.name)) {
            return state;
          }
          const cleanActor: ActorItem = {
            ...actor,
            isAiGenerated: false,
            lastEvolutionNote: undefined,
          };
          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_star_${cleanActor.id}_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'rising_talent',
            badgeLabel: 'اكتشاف سينمائي جديد ⭐',
            headline:
              newsHeadline ||
              `تألق الوجه السينمائي الجديد «${cleanActor.name}» وانضمامه لبورصة النجوم!`,
            detail:
              newsDetail ||
              `لفت الفنان الشاب «${cleanActor.name}» (${cleanActor.age} سنة) أنظار صناع السينما والدراما بفضل حضوره القوي، وأصبح متاحاً الآن للتعاقد في سوق الممثلين.`,
            highlightName: cleanActor.name,
            extraStatBadge: `تقييم ${cleanActor.stats.overall} · العمر ${cleanActor.age} سنة`,
            gameImpactLabel: `تأثير الخبر: انضمام «${cleanActor.name}» رسمياً لسوق الممثلين`,
          };
          return {
            aiGeneratedActors: [cleanActor, ...state.aiGeneratedActors],
            breakingNewsQueue:
              state.breakingNewsQueue.length === 0
                ? [newsItem]
                : state.breakingNewsQueue,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: newsItem.headline,
                category: 'milestone',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [
              `ظهر الفنان الشاب الجديد "${cleanActor.name}" (${cleanActor.age} سنة) في الساحة الفنية بتقييم ${cleanActor.stats.overall}.`,
              ...(state.aiMemoryLog || []),
            ].slice(0, 25),
          };
        }),

      addAiEmergingStudio: (studio, newsHeadline, newsDetail) =>
        set((state) => {
          if (state.emergingCompetitors.some((s) => s.name === studio.name)) {
            return state;
          }
          const enrichedStudio: CompetitorStudio = {
            ...studio,
            ceoName: studio.ceoName || (studio as unknown as { ceo?: string }).ceo || 'منتج سينمائي',
            isEmergingStudio: true,
            foundedYear: state.currentYear,
          };
          const headline =
            newsHeadline ||
            `منافس جديد في السوق: تدشين شركة «${enrichedStudio.name}» بقيادة ${enrichedStudio.ceoName}!`;
          const detail =
            newsDetail ||
            `دخلت شركة «${enrichedStudio.name}» رسمياً إلى جدول ترتيب شركات الإنتاج بقوة سوقية ${enrichedStudio.market_power}% لمنافسة «${state.studioName}».`;

          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_studio_${enrichedStudio.id}_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'new_studio',
            badgeLabel: 'شركة إنتاج جديدة في السوق 🎬',
            headline,
            detail,
            highlightName: enrichedStudio.name,
            extraStatBadge: `قوة سوقية ${enrichedStudio.market_power}%`,
            gameImpactLabel: `تأثير الخبر: دخول «${enrichedStudio.name}» رسمياً في جدول ترتيب الشركات`,
          };

          return {
            emergingCompetitors: [...state.emergingCompetitors, enrichedStudio],
            breakingNewsQueue:
              state.breakingNewsQueue.length === 0
                ? [newsItem]
                : state.breakingNewsQueue,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: headline,
                category: 'milestone',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [
              `تأسست شركة إنتاج منافسة جديدة باسم "${enrichedStudio.name}" بقيادة ${enrichedStudio.ceoName}.`,
              ...(state.aiMemoryLog || []),
            ].slice(0, 25),
          };
        }),

      pushAiContextualNewsEvent: (event) =>
        set((state) => {
          if (
            state.breakingNewsQueue.length > 0 ||
            (state.aiMemoryLog || []).includes(event.headline)
          ) {
            return state;
          }
          const mvDelta = event.marketValueDelta || 0;
          const cashDelta = event.cashDelta || 0;
          const repDelta = event.reputationDelta || 0;
          const hypeDelta = event.hypeDelta || 0;

          const nextCash = Math.max(5_000_000, state.cash + cashDelta);
          const nextRep = Math.min(100, Math.max(15, state.reputation + repDelta));
          const nextMvMod = (state.marketValueModifier || 0) + mvDelta;
          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: nextRep,
            releasedProjects: state.releasedProjects,
            marketValueModifier: nextMvMod,
          });

          const nextCompDelta = { ...state.competitorNetWorthDelta };
          if (event.rivalStudioName && event.rivalNetWorthDelta) {
            const prev = nextCompDelta[event.rivalStudioName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[event.rivalStudioName] = {
              ...prev,
              netWorthDelta: prev.netWorthDelta + event.rivalNetWorthDelta,
            };
          }

          const impactParts: string[] = [];
          if (mvDelta !== 0) {
            impactParts.push(
              `${mvDelta > 0 ? '+' : ''}${formatMoney(mvDelta)} ج.م القيمة السوقية`
            );
          }
          if (cashDelta !== 0) {
            impactParts.push(
              `${cashDelta > 0 ? '+' : ''}${formatMoney(cashDelta)} ج.م السيولة`
            );
          }
          if (repDelta !== 0) {
            impactParts.push(`${repDelta > 0 ? '+' : ''}${repDelta}% السمعة`);
          }
          if (hypeDelta !== 0) {
            impactParts.push(`${hypeDelta > 0 ? '+' : ''}${hypeDelta}% حماس الجمهور`);
          }
          if (event.rivalStudioName && event.rivalNetWorthDelta) {
            impactParts.push(
              `${event.rivalStudioName}: ${event.rivalNetWorthDelta > 0 ? '+' : ''}${formatMoney(event.rivalNetWorthDelta)} ج.م`
            );
          }

          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_ctx_news_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: event.category || 'production_news',
            badgeLabel: event.badgeLabel || 'تغطية صحفية حصرية 📰',
            headline: event.headline,
            detail: event.detail,
            highlightName: event.rivalStudioName || state.studioName,
            gameImpactLabel:
              impactParts.length > 0
                ? `تأثير الخبر: ${impactParts.join(' · ')}`
                : undefined,
          };

          return {
            cash: nextCash,
            reputation: nextRep,
            marketValueModifier: nextMvMod,
            marketValue: nextMarketVal,
            competitorNetWorthDelta: nextCompDelta,
            draft: {
              ...state.draft,
              hypeScore: Math.min(100, Math.max(15, state.draft.hypeScore + hypeDelta)),
            },
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem],
            aiMemoryLog: [event.headline, ...(state.aiMemoryLog || [])].slice(0, 25),
          };
        }),

      addAiRivalReleases: (rivals, newsHeadline, newsDetail) =>
        set((state) => {
          if (!Array.isArray(rivals) || rivals.length === 0) return state;
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          const nextYearlyRivals = [...(state.yearlyRivalReleases || [])];

          for (const riv of rivals) {
            nextYearlyRivals.unshift({
              ...riv,
              year: riv.year || state.currentYear,
            });
            const stName = riv.studioName;
            const prev = nextCompDelta[stName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            const estimatedProfit = Math.round((riv.boxOfficeRevenue || 120_000_000) * 0.45);
            nextCompDelta[stName] = {
              netWorthDelta: prev.netWorthDelta + estimatedProfit,
              releasesDelta: prev.releasesDelta + 1,
              awardsDelta: prev.awardsDelta,
            };
          }

          const topRival = rivals[0];
          const headline =
            newsHeadline ||
            `اشتعال المنافسة: «${topRival.studioName}» تطلق «${topRival.title}» ببطولة ${topRival.leadStarName}!`;
          const detail =
            newsDetail ||
            `طرحت «${topRival.studioName}» عملها الضخم «${topRival.title}» بتقييم نقدي (${topRival.criticScore}/10) وإيرادات متوقعة ${formatMoney(topRival.boxOfficeRevenue)} ج.م.`;

          const newsItem: WorldBreakingNewsModalItem = {
            id: `news_ai_riv_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'rival_project',
            badgeLabel: 'منافسة شباك التذاكر والمنصات 🔥',
            headline,
            detail,
            highlightName: topRival.studioName,
            extraStatBadge: `تقييم ${topRival.criticScore}/10 · ${formatMoney(topRival.boxOfficeRevenue)} ج.م`,
            gameImpactLabel: `عمل منافس في السباق: «${topRival.title}» ببطولة ${topRival.leadStarName}`,
          };

          return {
            yearlyRivalReleases: nextYearlyRivals.slice(0, 18),
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue:
              state.breakingNewsQueue.length === 0
                ? [newsItem]
                : state.breakingNewsQueue,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: `${headline} — ${detail}`,
                category: 'release',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [headline, ...(state.aiMemoryLog || [])].slice(0, 25),
          };
        }),

      importCustomDatabase: (patch, sourceUrl = '') => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(CUSTOM_DB_STORAGE_KEY, JSON.stringify(patch));
            idbSet(CUSTOM_DB_STORAGE_KEY, JSON.stringify(patch)).catch(() => {});
          } catch {
            // ignore
          }
        }
        set({ customDbPatch: patch, customDbUrl: sourceUrl });
      },

      clearCustomDatabase: () => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(CUSTOM_DB_STORAGE_KEY);
            idbDel(CUSTOM_DB_STORAGE_KEY).catch(() => {});
          } catch {
            // ignore
          }
        }
        set({ customDbPatch: null, customDbUrl: '' });
      },

      resetEntireGameAndStartFresh: () => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('hyptrix_tycoon_state_v2');
            window.localStorage.removeItem(CUSTOM_DB_STORAGE_KEY);
            idbDel('hyptrix_tycoon_state_v2').catch(() => {});
            idbDel(CUSTOM_DB_STORAGE_KEY).catch(() => {});
          } catch {
            // ignore
          }
        }
        set({
          studioCreated: false,
          studioName: 'العقرب ستوديوز',
          ceoName: 'محمود الصيرفي',
          logo: {
            emblem: 'golden_scorpion',
            frame: 'royal_shield',
            palette: 'amethyst_pearl',
          },
          founderPerk: 'visionary_director',
          currentRegion: 'egypt',
          unlockedRegions: ['egypt'],
          cash: 75_000_000,
          marketValue: 110_000_000,
          marketValueModifier: 0,
          reputation: 62,
          currentYear: 2026,
          gameDay: 1,
          lastAwardsGalaYear: 2025,
          vipCoins: 250,
          vipPassExpiresAt: null,
          vipAdProgress: 0,
          activeScreen: 'STUDIO_CREATION',
          draft: { ...DEFAULT_DRAFT },
          releasedProjects: [],
          lastReleasedProject: null,
          yearlyRivalReleases: [],
          worldHistory: [
            {
              year: 2026,
              eventText: 'تأسيس استوديو جديد بطموحات ضخمة للسيطرة على صناعة السينما والدراما.',
              category: 'milestone',
            },
          ],
          aiMemoryLog: [
            'انطلاق الموسم السينمائي وسط منافسة شرسة بين كبرى شركات الإنتاج على شباك التذاكر.',
          ],
          actorAwardCounts: {},
          actorDynamicState: {},
          aiGeneratedActors: [],
          emergingCompetitors: [],
          competitorNetWorthDelta: {},
          breakingNewsQueue: [],
          festivalModalQueue: [],
          customDbPatch: null,
          customDbUrl: '',
        });
      },

      setSupabaseUserEmail: (email) => set({ supabaseUserEmail: email }),
      setGroqApiKeyClient: (key) => set({ groqApiKeyClient: key.trim() }),
      setPreferredGroqModel: (model) => set({ preferredGroqModel: model }),
    }),
    {
      name: 'hyptrix_tycoon_state_v2',
      storage: createJSONStorage(() => hybridStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isChildModalOpen = false;
          state.isPrWarRoomOpen = false;
          // Sanitize any legacy cached actors so no "موهبة صاعدة" or AI note remains
          if (Array.isArray(state.aiGeneratedActors)) {
            state.aiGeneratedActors = state.aiGeneratedActors.map((a) => ({
              ...a,
              isAiGenerated: false,
              lastEvolutionNote:
                a.lastEvolutionNote &&
                (a.lastEvolutionNote.includes('موهبة صاعدة') ||
                  a.lastEvolutionNote.includes('الذكاء'))
                  ? undefined
                  : a.lastEvolutionNote,
            }));
          }
          // Trigger server-side financial verification on load
          setTimeout(() => {
            state.verifyWalletWithServer?.();
          }, 400);
        }
      },
    }
  )
);
