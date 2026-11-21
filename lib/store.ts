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
  RevenueTrajectory,
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
  LedgerVerificationRequest,
} from './supabase';
import {
  WorldMarketId,
  UiLanguageId,
  getMarketProfile,
  getMarketConfigsForWorld,
  getPrimaryMarketRegion,
  getCurrencyLabel,
  getMarketAiContext,
} from './market-profiles';
import {
  getLocalizedSlotLabel,
  localizeEntityName,
  PR_CAMPAIGNS_EN,
  STUDIO_ASSETS_EN,
  readSavedUiLanguage,
  writeSavedUiLanguage,
} from './i18n';

export const DAYS_PER_GAME_YEAR = 120; // 10 game days per month × 12 months
export const STAR_FORGE_REQUIRED_LOCKS = 2; // Reduced from 5 → 2 to eliminate any ad-farming friction

// Serialized FIFO queue for server ledger synchronization so rapid sequential
// cash actions (e.g., film release -> daily revenue -> asset purchase) always
// reach /api/verify-ledger in exact order with the latest HMAC signature.
let ledgerSyncChain: Promise<void> = Promise.resolve();

function countStudioTotalAwards(projects: { awardsWon?: string[] }[]): number {
  return projects.reduce((sum, p) => sum + (p.awardsWon?.length || 0), 0);
}

function enqueueServerLedgerSync(
  getState: () => NeelyoGameState,
  setState: (partial: Partial<NeelyoGameState>) => void,
  tx: {
    transactionType: LedgerVerificationRequest['transactionType'];
    amountDelta: number;
    previousCash: number;
    expectedNewCash: number;
    itemId?: string;
    itemLabel?: string;
  }
) {
  if (typeof window === 'undefined') return;
  ledgerSyncChain = ledgerSyncChain
    .then(async () => {
      const current = getState();
      const res = await verifyAndRecordServerTransaction({
        studioInstanceId: getOrCreateStudioInstanceId(),
        studioName: current.studioName,
        ceoName: current.ceoName,
        userEmail: current.supabaseUserEmail,
        transactionType: tx.transactionType,
        amountDelta: tx.amountDelta,
        previousCash: tx.previousCash,
        expectedNewCash: tx.expectedNewCash,
        marketValue: current.marketValue,
        reputation: current.reputation,
        releasedCount: current.releasedProjects.length,
        totalAwards: countStudioTotalAwards(current.releasedProjects),
        ownedAssets: current.ownedStudioAssets || [],
        itemId: tx.itemId,
        itemLabel: tx.itemLabel,
        previousSignature: current.ledgerSignature,
      });

      if (res && res.ok) {
        if (res.tamperDetected) {
          setState({
            cash: res.correctedCash,
            marketValue: res.correctedMarketValue,
            ledgerSignature: res.ledgerSignature,
          });
        } else if (res.ledgerSignature) {
          setState({ ledgerSignature: res.ledgerSignature });
        }
      }
    })
    .catch(() => {
      // Keep client gameplay smooth if network temporarily hiccups
    });
}

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
    badgeLabel: 'لجان الدعم السريع · 2 مليون',
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
    badgeLabel: 'حرب الإشاعات · 5 مليون',
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
      'إطلاق حملة حسابات ترويجية واسعة على إكس لتصدير اسم عملك واستوديوك في المركز الأول بالتريند المحلي والعربي.',
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

const PRIMARY_STORAGE_KEY = 'neelyo_tycoon_state_v1';

// Hybrid IndexedDB + localStorage storage adapter
const hybridStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const localVal = window.localStorage.getItem(name);
      if (localVal) return localVal;
      const idbVal = await idbGet<string>(name);
      if (idbVal) return idbVal;
      return null;
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
  | 'sunburst_eye'
  | 'royal_crescent'
  | 'lotus_crown'
  | 'spotlight_tower'
  | 'director_megaphone'
  | 'golden_scarab'
  | 'cinema_ribbon';

export type LogoFrameId =
  | 'royal_shield'
  | 'laurel_wreath'
  | 'neon_circle'
  | 'hex_geometry'
  | 'no_frame'
  | 'art_deco_arch'
  | 'octagon_crest'
  | 'double_diamond'
  | 'starburst_seal'
  | 'film_strip_frame'
  | 'crest_banner'
  | 'vintage_oval';

export type LogoPaletteId =
  | 'obsidian_gold'
  | 'velvet_crimson'
  | 'midnight_navy'
  | 'pharaoh_turquoise'
  | 'emerald_empire'
  | 'ivory_bronze'
  | 'silver_noir'
  | 'sunset_amber'
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
  customImageUrl?: string;
}

export type OnboardingTourStatus = 'pending_choice' | 'active' | 'completed';

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
  rejectionCount?: number;
  syndicateMediationUsed?: boolean;
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
  previousBoxOfficeRank?: number;
  lastDailyRevenueDelta?: number;
  trajectory?: RevenueTrajectory;
  revenueHistory?: { day: number; playerTotal: number; topRivalTotal: number }[];
  reviews: CriticReviewItem[];
  socialPosts: SocialPostItem[];
  viralTrendLabel: string;
  rivalReleases: RivalRelease[];
  trollsCampaigned?: boolean;
  intlDistributionAdUsed?: boolean;
  awardsWon: string[];
  releaseDayStart?: number;
  daysTracked?: number;
  dailyNews?: DailyAiNewsItem[];
  festivalsTriggered?: boolean;
  juryCommentary?: string;
  backendPointsTotalPercent?: number;
  backendRoyaltiesPaid?: number;
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
  | 'openai/gpt-oss-20b'
  | 'openai/gpt-oss-120b';

export const GROQ_MODEL_OPTIONS: { id: GroqModelId; label: string; provider: string }[] = [
  { id: 'auto', label: 'تبديل تلقائي ذكي (Auto)', provider: 'Groq Task Router' },
  { id: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b', provider: 'OpenAI (20B Fast)' },
  { id: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b', provider: 'OpenAI (120B)' },
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
export function formatGameDate(
  gameDay: number,
  year: number,
  uiLanguage: UiLanguageId = 'ar'
): string {
  const monthsAr = [
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
  const monthsEn = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dayInYear = Math.max(0, (gameDay - 1) % DAYS_PER_GAME_YEAR); // 0..119
  const monthIdx = Math.min(11, Math.floor(dayInYear / 10));
  const stepInMonth = dayInYear % 10; // 0..9
  const calendarDay = Math.min(30, stepInMonth * 3 + 3); // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
  if (uiLanguage === 'en') {
    return `${monthsEn[monthIdx]} ${calendarDay}, ${year}`;
  }
  return `${calendarDay} ${monthsAr[monthIdx]} ${year}`;
}

export function getDaysRemainingUntilAnnualAwards(gameDay: number): number {
  const dayInYear = Math.max(0, (gameDay - 1) % DAYS_PER_GAME_YEAR);
  return Math.max(1, DAYS_PER_GAME_YEAR - dayInYear);
}

/**
 * Returns a trajectory weight for a given normalized progress (0..1) through the release run:
 * - front_loaded: huge early opening (Days 1-3), steeper drop-off later (Days 5-10)
 * - sleeper: modest early opening, surging word-of-mouth mid/late run (overtakes front-loaded films!)
 * - steady: consistent hold with realistic weekend spikes
 */
function getDailyTrajectoryCurveFactor(
  trajectory: RevenueTrajectory | undefined,
  stepIndex: number,
  maxSteps: number,
  criticScore: number,
  audienceScore: number
): number {
  const progress = Math.min(1, Math.max(0, stepIndex / Math.max(1, maxSteps)));
  const isWeekendPeak = stepIndex === 3 || stepIndex === 4 || stepIndex === 8 || stepIndex === 9;
  const weekendBoost = isWeekendPeak ? 1.16 : 0.95;

  let curve = 1.0;
  if (trajectory === 'front_loaded') {
    // Starts hot, fades later unless audience loved it
    curve = progress <= 0.35 ? 1.24 : progress <= 0.65 ? 0.94 : 0.72;
  } else if (trajectory === 'sleeper') {
    // Slower start, strong mid-to-late surge from word-of-mouth!
    curve = progress <= 0.3 ? 0.84 : progress <= 0.75 ? 1.28 : 1.12;
  } else {
    curve = progress <= 0.5 ? 1.06 : 0.96;
  }

  const receptionBlend = audienceScore * 0.62 + criticScore * 0.38;
  const womFactor =
    receptionBlend >= 8.5
      ? 1.14
      : receptionBlend >= 7.6
      ? 1.06
      : receptionBlend >= 6.4
      ? 0.98
      : 0.84;

  return curve * weekendBoost * womFactor;
}

/**
 * Progressively steps a released film/series forward by 1 day/episode:
 * - Uses decoupled trajectory curves (front_loaded / steady / sleeper) + weekend surges + independent rival waves
 * - Enables genuine day-by-day rank swaps (#1 -> #2, sleeper climbing from #4 -> #1)
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

  // Record previous rankings before stepping so UI can show rank climb/drop arrows (▲ / ▼)
  const prevBoard = [
    { key: 'PLAYER', rev: proj.totalGrossRevenue },
    ...proj.rivalReleases
      .filter((r) => r.status !== 'delayed')
      .map((r, idx) => ({ key: `RIVAL_${idx}`, rev: r.boxOfficeRevenue })),
  ].sort((a, b) => b.rev - a.rev);

  const prevRankMap: Record<string, number> = {};
  prevBoard.forEach((entry, i) => {
    prevRankMap[entry.key] = i + 1;
  });

  const playerTrajectory: RevenueTrajectory =
    proj.trajectory ||
    (proj.criticScore >= 8.2 && proj.audienceScore >= 8.0
      ? 'sleeper'
      : proj.audienceScore >= proj.criticScore + 1.1
      ? 'front_loaded'
      : 'steady');

  const playerCurve = getDailyTrajectoryCurveFactor(
    playerTrajectory,
    nextStep,
    maxSteps,
    proj.criticScore,
    proj.audienceScore
  );

  // Subtle deterministic daily market pulse so no two days feel static
  const playerDayHash = Array.from(`${proj.id}_d${nextStep}`).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const playerDailyPulse = 0.9 + ((playerDayHash % 23) / 100); // 0.90 .. 1.12

  const effectivePlayerMom = Math.max(
    0.62,
    Math.min(1.62, playerMomentum * playerCurve * playerDailyPulse)
  );

  const baseRemaining = Math.max(1_800_000, targetGross - proj.totalGrossRevenue);
  const revenueDelta = Math.max(
    900_000,
    Math.round((baseRemaining / remainingSteps) * effectivePlayerMom)
  );

  const nextGross = proj.totalGrossRevenue + revenueDelta;
  const backendRate = Math.min(
    0.45,
    Math.max(0, Number(proj.backendPointsTotalPercent || 0)) / 100
  );
  const royaltyDeduction = Math.round(revenueDelta * backendRate);
  const netCashDelta = Math.max(0, revenueDelta - royaltyDeduction);
  const nextRoyaltiesPaid = (proj.backendRoyaltiesPaid || 0) + royaltyDeduction;
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

  const updatedRivals = proj.rivalReleases.map((r, idx) => {
    if (r.status === 'delayed') return r;
    const rTarget =
      r.targetBoxOfficeRevenue || Math.round(r.boxOfficeRevenue * 2.5);
    const rAud = r.audienceScore ?? r.criticScore;
    const rTraj: RevenueTrajectory =
      r.trajectory ||
      (r.criticScore >= 8.3
        ? 'sleeper'
        : r.criticScore < 6.8
        ? 'front_loaded'
        : 'steady');

    const rCurve = getDailyTrajectoryCurveFactor(
      rTraj,
      nextStep,
      maxSteps,
      r.criticScore,
      rAud
    );

    // Independent per-rival daily momentum swing so rivals overtake each other & the player dynamically!
    const rivalHash = Array.from(`${r.title}_${r.studioName}_d${nextStep}_${idx}`).reduce(
      (acc, ch, i) => acc + ch.charCodeAt(0) * (i + 3),
      0
    );
    const rivalDailyWave = 0.76 + ((rivalHash % 49) / 100); // 0.76 .. 1.24

    const rEffectiveMom = Math.max(
      0.58,
      Math.min(1.58, rivalMomentum * rCurve * rivalDailyWave)
    );
    const rRem = Math.max(1_200_000, rTarget - r.boxOfficeRevenue);
    const rDelta = Math.max(
      750_000,
      Math.round((rRem / remainingSteps) * rEffectiveMom)
    );
    return {
      ...r,
      boxOfficeRevenue: r.boxOfficeRevenue + rDelta,
      targetBoxOfficeRevenue: rTarget,
      previousRank: prevRankMap[`RIVAL_${idx}`],
      lastDailyDelta: rDelta,
    };
  });

  const activeRivals = updatedRivals.filter((r) => r.status !== 'delayed');
  const allRevs = [
    nextGross,
    ...activeRivals.map((r) => r.boxOfficeRevenue),
  ].sort((a, b) => b - a);
  const nextRank = Math.max(1, allRevs.indexOf(nextGross) + 1);
  const topRivalTotal =
    activeRivals.length > 0
      ? Math.max(...activeRivals.map((r) => r.boxOfficeRevenue))
      : 0;

  const prevHistory =
    Array.isArray(proj.revenueHistory) && proj.revenueHistory.length > 0
      ? proj.revenueHistory
      : [
          {
            day: 1,
            playerTotal: proj.totalGrossRevenue,
            topRivalTotal:
              proj.rivalReleases.filter((r) => r.status !== 'delayed').length > 0
                ? Math.max(
                    ...proj.rivalReleases
                      .filter((r) => r.status !== 'delayed')
                      .map((r) => r.boxOfficeRevenue)
                  )
                : 0,
          },
        ];

  return {
    updatedProject: {
      ...proj,
      daysTracked: nextStep,
      boxOfficeRevenue: proj.boxOfficeRevenue + boDelta,
      streamingRevenue: proj.streamingRevenue + streamDelta,
      totalGrossRevenue: nextGross,
      backendRoyaltiesPaid: nextRoyaltiesPaid,
      netProfit: nextGross - nextRoyaltiesPaid - proj.totalBudget,
      viewershipMillions: nextViews,
      previousBoxOfficeRank: prevRankMap.PLAYER || proj.boxOfficeRank,
      boxOfficeRank: nextRank,
      lastDailyRevenueDelta: netCashDelta,
      trajectory: playerTrajectory,
      revenueHistory: [
        ...prevHistory,
        { day: nextStep, playerTotal: nextGross, topRivalTotal },
      ],
      rivalReleases: updatedRivals,
      dailyNews: updatedNews,
    },
    revenueDelta: netCashDelta,
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
  worldMarket?: WorldMarketId;
  uiLanguage?: UiLanguageId;
}): {
  ceremonies: AutomaticFestivalCeremonyItem[];
  awardsByProjectId: Record<string, string[]>;
  winningActorIds: string[];
  rivalAwardsCountByStudio: Record<string, number>;
} {
  const { playerProjectsInYear, rivalReleasesInYear, studioName, year, db } = params;
  const uiLang: UiLanguageId = params.uiLanguage || 'en';
  const isEn = uiLang === 'en';

  const activeRivals = rivalReleasesInYear.filter((r) => r.status !== 'delayed');

  // Ensure strong rival contenders exist for both Film and Series in the annual pool
  const rivalFilms = activeRivals.filter((r) => r.format !== 'series');
  const rivalSeries = activeRivals.filter((r) => r.format === 'series');
  const marketId = params.worldMarket || (db.meta?.targetMarket as WorldMarketId) || 'egypt';
  const marketProfile = getMarketProfile(marketId);
  const curLabel = getCurrencyLabel(marketId, uiLang);
  const compList = db.competitor_studios || [];
  const starList = db.actors || [];
  const dirList = (db.crew || []).filter((c) => c.role === 'director');

  const locName = (raw?: string, fallbackEn = '', fallbackAr = '') =>
    raw ? localizeEntityName(raw, uiLang) : isEn ? fallbackEn : fallbackAr;

  const fallbackDir1 = locName(dirList[0]?.name, 'Top Season Director', 'مخرج الموسم الأول');
  const fallbackDir2 = locName(dirList[1]?.name, fallbackDir1, fallbackDir1);
  const fallbackDir3 = locName(dirList[2]?.name, fallbackDir2, fallbackDir2);

  const enFilmTitles =
    marketId === 'saudi'
      ? ['Riyadh Horizon', 'Dunes of Thunder', 'The Diriyah Cipher']
      : ['Cairo Underground', 'The Nile Syndicate', 'Operation Citadel'];
  const enSeriesTitles =
    marketId === 'saudi'
      ? ['House of Najd', 'The Diriyah Chronicles', 'Crown of the Dunes']
      : ['The Zamalek Dynasty', 'Alley of Secrets', 'Empire of El-Hussein'];

  const fallbackFilmTitle3 = isEn
    ? enFilmTitles[2]
    : marketProfile.rivalFilmTitles[2] || marketProfile.rivalFilmTitles[0] || 'ملحمة الموسم';
  const fallbackSeriesTitle3 = isEn
    ? enSeriesTitles[2]
    : marketProfile.rivalSeriesTitles[2] || marketProfile.rivalSeriesTitles[0] || 'دراما الموسم';

  const normalizeRival = (r: RivalRelease): RivalRelease => ({
    ...r,
    studioName: localizeEntityName(r.studioName, uiLang),
    leadStarName: localizeEntityName(r.leadStarName, uiLang),
    directorName: r.directorName
      ? localizeEntityName(r.directorName, uiLang)
      : undefined,
  });

  const topRivalFilm1: RivalRelease = rivalFilms[0]
    ? normalizeRival(rivalFilms[0])
    : {
        id: `annual_rf1_${year}`,
        title: isEn ? enFilmTitles[0] : marketProfile.rivalFilmTitles[0] || 'شفرة العقرب',
        studioName: locName(
          compList[0]?.name || marketProfile.aiContext.fallbackRivalStudios[0],
          'Rival Pictures',
          'استوديو منافس'
        ),
        leadStarName: locName(
          starList[0]?.name || marketProfile.aiContext.fallbackStars[0],
          'A-List Star',
          'نجم شباك'
        ),
        directorName: fallbackDir1,
        format: 'film',
        genre: 'action',
        criticScore: 8.1,
        audienceScore: 8.5,
        boxOfficeRevenue: 92_000_000,
        status: 'released',
      };

  const topRivalFilm2: RivalRelease = rivalFilms[1]
    ? normalizeRival(rivalFilms[1])
    : {
        id: `annual_rf2_${year}`,
        title: isEn ? enFilmTitles[1] : marketProfile.rivalFilmTitles[1] || 'فرسان الشاشة',
        studioName: locName(
          compList[1]?.name ||
            marketProfile.aiContext.fallbackRivalStudios[1] ||
            marketProfile.aiContext.fallbackRivalStudios[0],
          'Crown Media',
          'شركة منافسة'
        ),
        leadStarName: locName(
          starList[1]?.name ||
            marketProfile.aiContext.fallbackStars[1] ||
            marketProfile.aiContext.fallbackStars[0],
          'Leading Star',
          'نجم بارز'
        ),
        directorName: fallbackDir2,
        format: 'film',
        genre: 'historical',
        criticScore: 7.8,
        audienceScore: 8.0,
        boxOfficeRevenue: 74_000_000,
        status: 'released',
      };

  const topRivalSeries1: RivalRelease = rivalSeries[0]
    ? normalizeRival(rivalSeries[0])
    : {
        id: `annual_rs1_${year}`,
        title: isEn ? enSeriesTitles[0] : marketProfile.rivalSeriesTitles[0] || 'ملف الغموض',
        studioName: locName(
          compList[2]?.name ||
            compList[0]?.name ||
            marketProfile.aiContext.fallbackRivalStudios[0],
          'Prime Drama Studio',
          'شركة دراما'
        ),
        leadStarName: locName(
          starList[2]?.name ||
            marketProfile.aiContext.fallbackStars[2] ||
            marketProfile.aiContext.fallbackStars[0],
          'Drama Lead',
          'نجم دراما'
        ),
        directorName: fallbackDir3,
        format: 'series',
        genre: 'crime_mystery',
        criticScore: 8.2,
        audienceScore: 8.4,
        boxOfficeRevenue: 64_000_000,
        status: 'released',
      };

  const topRivalSeries2: RivalRelease = rivalSeries[1]
    ? normalizeRival(rivalSeries[1])
    : {
        id: `annual_rs2_${year}`,
        title: isEn ? enSeriesTitles[1] : marketProfile.rivalSeriesTitles[1] || 'ليالي الدراما',
        studioName: locName(
          compList[3]?.name ||
            compList[1]?.name ||
            marketProfile.aiContext.fallbackRivalStudios[0],
          'Horizon Productions',
          'إنتاج درامي'
        ),
        leadStarName: locName(
          starList[3]?.name ||
            marketProfile.aiContext.fallbackStars[3] ||
            marketProfile.aiContext.fallbackStars[0],
          'Series Star',
          'بطل الموسم'
        ),
        directorName: locName(dirList[3]?.name, fallbackDir1, fallbackDir1),
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
    const festDisplayName = localizeEntityName(fest.name, uiLang);

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

    const bestPlayerDirectorLoc = bestPlayerOverall
      ? localizeEntityName(bestPlayerOverall.directorName, uiLang)
      : fallbackDir1;
    const bestPlayerLeadLoc = bestPlayerOverall?.leadNames?.[0]
      ? localizeEntityName(bestPlayerOverall.leadNames[0], uiLang)
      : isEn
      ? 'Lead Star'
      : 'بطل العمل';

    const scriptLabel = (title: string) =>
      isEn ? `Screenplay: "${title}"` : `سيناريو «${title}»`;

    const awards: FestivalAwardWinnerItem[] = [
      {
        category: isEn
          ? 'Best Motion Picture of the Year'
          : 'جائزة أفضل فيلم سينمائي للعام',
        nominees: bestPlayerFilm
          ? [bestPlayerFilm.title, topRivalFilm1.title, topRivalFilm2.title]
          : [topRivalFilm1.title, topRivalFilm2.title, fallbackFilmTitle3],
        winner: playerWinsBestFilm && bestPlayerFilm ? bestPlayerFilm.title : winningRivalFilm.title,
        winningProjectTitle:
          playerWinsBestFilm && bestPlayerFilm ? bestPlayerFilm.title : winningRivalFilm.title,
        winningStudioName:
          playerWinsBestFilm && bestPlayerFilm ? studioName : winningRivalFilm.studioName,
        isPlayerWinner: Boolean(playerWinsBestFilm && bestPlayerFilm),
      },
      {
        category: isEn
          ? 'Best Drama Series of the Year'
          : 'جائزة أفضل مسلسل درامي للعام',
        nominees: bestPlayerSeries
          ? [bestPlayerSeries.title, topRivalSeries1.title, topRivalSeries2.title]
          : [topRivalSeries1.title, topRivalSeries2.title, fallbackSeriesTitle3],
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
        category: isEn
          ? 'Best Director of the Year'
          : 'جائزة أفضل إخراج في العام',
        nominees: bestPlayerOverall
          ? [
              bestPlayerDirectorLoc,
              topRivalFilm1.directorName || fallbackDir1,
              topRivalSeries1.directorName || fallbackDir2,
            ]
          : [
              topRivalFilm1.directorName || fallbackDir1,
              topRivalFilm2.directorName || fallbackDir2,
              topRivalSeries1.directorName || fallbackDir3,
            ],
        winner:
          playerWinsDirector && bestPlayerOverall
            ? bestPlayerDirectorLoc
            : topRivalFilm1.directorName || fallbackDir1,
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
        category: isEn
          ? 'Best Lead Performance'
          : 'جائزة أفضل تمثيل (دور أول)',
        nominees: bestPlayerOverall
          ? [
              bestPlayerLeadLoc,
              topRivalFilm1.leadStarName,
              topRivalSeries1.leadStarName,
            ]
          : [topRivalFilm1.leadStarName, topRivalSeries1.leadStarName, topRivalFilm2.leadStarName],
        winner:
          playerWinsActor && bestPlayerOverall
            ? bestPlayerLeadLoc
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
        category: isEn
          ? 'Best Screenplay & Dramatic Writing'
          : 'جائزة أفضل سيناريو وحبكة درامية',
        nominees: bestPlayerOverall
          ? [scriptLabel(bestPlayerOverall.title), scriptLabel(topRivalSeries1.title)]
          : [scriptLabel(topRivalSeries1.title), scriptLabel(topRivalFilm2.title)],
        winner:
          playerWinsScript && bestPlayerOverall
            ? scriptLabel(bestPlayerOverall.title)
            : scriptLabel(topRivalSeries1.title),
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
        category: isEn
          ? 'Golden Box Office Crown (Highest Annual Gross)'
          : 'جائزة قمة شباك التذاكر الذهبية (أعلى إيراد سنوي)',
        nominees: playerTopBoxOffice
          ? [playerTopBoxOffice.title, topRivalFilm1.title, topRivalFilm2.title]
          : [topRivalFilm1.title, topRivalFilm2.title],
        winner:
          playerWinsBoxOffice && playerTopBoxOffice
            ? `${playerTopBoxOffice.title} (${formatMoney(playerTopBoxOffice.totalGrossRevenue)} ${curLabel})`
            : `${topRivalFilm1.title} (${formatMoney(topRivalFilm1.boxOfficeRevenue)} ${curLabel})`,
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
            `${aw.category} (${festDisplayName})`,
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
        ? playerProjectsInYear
            .map((p) => (isEn ? `"${p.title}"` : `«${p.title}»`))
            .join(isEn ? ' & ' : ' و')
        : isEn
        ? 'No eligible releases'
        : 'لا توجد أعمال مشاركة';

    ceremonies.push({
      id: `annual_gala_${year}_${fest.id}`,
      festivalId: fest.id,
      festivalName: isEn
        ? `${festDisplayName} — ${year} Annual Gala`
        : `${fest.name} — الحفل السنوي لعام ${year}`,
      prestige: fest.prestige,
      year,
      playerProjectTitle:
        bestPlayerOverall?.title ||
        (isEn ? `${year} Cinema Season` : 'موسم العام السينمائي'),
      juryStatement: isEn
        ? playerProjectsInYear.length === 0
          ? `${festDisplayName} (${year}) concluded with ${topRivalFilm1.studioName} and ${topRivalSeries1.studioName} sweeping the top prizes in the absence of releases from ${studioName} this year.`
          : playerWonCount >= 3
          ? `A historic night for ${studioName} at ${festDisplayName} (${year})! The jury praised ${playerTitlesSummary} and awarded you ${playerWonCount} major honors after a fierce showdown with ${topRivalFilm1.studioName}.`
          : playerWonCount >= 1
          ? `Fierce competition at ${festDisplayName} (${year}): ${studioName} (${playerTitlesSummary}) claimed ${playerWonCount} well-earned award(s), while ${topRivalFilm1.studioName} and ${topRivalSeries1.studioName} split the remaining honors.`
          : `An intense race at ${festDisplayName} (${year}): despite shortlist nominations for ${playerTitlesSummary}, releases from ${topRivalFilm1.studioName} and ${topRivalSeries1.studioName} edged ahead on critics’ scores.`
        : playerProjectsInYear.length === 0
        ? `اختتمت فعاليات ${fest.name} لعام ${year}، وحسمت أعمال «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» جوائز العام الكبرى في غياب مشاركات من استوديو «${studioName}» هذا العام.`
        : playerWonCount >= 3
        ? `ليلة تاريخية لاستوديو «${studioName}» في الحفل السنوي لـ ${fest.name} (${year})! أشادت لجنة التحكيم بأعمالكم ${playerTitlesSummary} ومنحتكم ${playerWonCount} جوائز كبرى بعد منافسة شرسة مع «${topRivalFilm1.studioName}».`
        : playerWonCount >= 1
        ? `منافسة قوية في الحفل السنوي لـ ${fest.name} (${year})؛ حصدت أعمال «${studioName}» (${playerTitlesSummary}) ${playerWonCount} جائزة مستحقة، بينما انتزعت «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» باقي جوائز العام.`
        : `شهد الحفل السنوي لـ ${fest.name} (${year}) منافسة نارية؛ ورغم ترشح ${playerTitlesSummary} في القائمة القصيرة، تفوقت أفلام ومسلسلات «${topRivalFilm1.studioName}» و«${topRivalSeries1.studioName}» بفارق التقييمات النقدية.`,
      festivalBuzz: isEn
        ? `Year-End Awards Gala (${year}) — red carpet packed with top stars, filmmakers, and industry press.`
        : `حفل توزيع جوائز نهاية العام (${year}) وسط حضور كافة نجوم وصناع السينما والدراما على السجادة الحمراء.`,
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
  uiLanguage?: UiLanguageId;
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
    uiLanguage: params.uiLanguage,
  });
  const allWon = Object.values(res.awardsByProjectId).flat();
  return {
    ceremonies: res.ceremonies,
    allWonAwardLabels: allWon,
    leadActorWonCount: res.winningActorIds.length,
  };
}

export interface NeelyoGameState {
  uiLanguage: UiLanguageId;
  hasManuallySelectedLanguage: boolean;
  worldMarket: WorldMarketId;
  hasSelectedMarket: boolean;
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
  talentRejectionCounts: Record<string, number>;
  syndicateMediationUnlocked: Record<string, boolean>;
  bankruptcyDeadlineDay: number | null;
  bankruptcyDebtAmount: number;
  isBankruptLiquidated: boolean;
  lastEmergencyBailoutDay: number | null;
  onboardingTourStatus: OnboardingTourStatus;

  // Actions
  setChildModalOpen: (open: boolean) => void;
  setPrWarRoomOpen: (open: boolean) => void;
  setStarForgeOpen: (open: boolean) => void;
  setOnboardingTourStatus: (status: OnboardingTourStatus) => void;
  unlockNextStarForgeLockWithAd: () => void;
  watchRewardedAdForVipCoins: () => void;
  resolveCrisisWithCash8M: (crisisId: string) => void;
  resolveCrisisWithRewardedAd: (crisisId: string) => void;
  unlockSyndicateMediationWithAd: (talentId: string, talentName: string) => void;
  claimInternationalDistributionAdBonus: (projectId: string) => void;
  claimEmergencyInvestorBailoutWithAd: (customNeededAmount?: number) => void;
  liquidateAndStartNewStudioInSameWorld: () => void;
  spendForStarForgeUpgrade: (cashCost: number, gemCost: number) => boolean;
  refundStarForgeCash: (cashAmount: number) => void;
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
  selectLanguageAndMarket: (language: UiLanguageId, market: WorldMarketId) => void;
  setUiLanguage: (language: UiLanguageId, isManual?: boolean) => void;
  openMarketSelector: () => void;
  initializeStudio: (params: {
    studioName: string;
    ceoName: string;
    logo: StudioLogoConfig;
    founderPerk: FounderPerk;
    region?: MarketRegion;
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
  setProjectJuryCommentary: (projectId: string, commentary: string) => void;
  claimReferralReward: (type: 'cash' | 'star_lock', amount?: number) => void;
  hydrateCloudState: (snapshot: Record<string, unknown>) => void;
}

const DEFAULT_DRAFT: ActiveDraftProject = {
  format: 'film',
  episodes: 15,
  seriesSeason: 'ramadan',
  filmSeason: 'eid_adha',
  primaryGenre: 'action',
  secondaryGenre: 'popular_drama',
  ageRating: '+12',
  title: '',
  scriptSynopsis: '',
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
  hypeScore: 30,
  qualityModifier: 0,
  crises: [],
  juryBribed: false,
  filmingStartDay: null,
  filmingDurationDays: 8,
  scheduledReleaseDay: null,
  filmingDaysElapsed: 0,
  productionNews: [],
};

function getDefaultDistributionForMarket(
  worldMarket: WorldMarketId,
  customDbPatch?: Partial<MasterDatabase> | null
): { selectedPlatformId: string; selectedTvChannelId: string } {
  const marketDb = getResolvedDatabase(customDbPatch, worldMarket);
  const firstVod = marketDb.streaming_platforms.find(
    (p) => p.platform_type !== 'tv_channel' && !p.id.startsWith('tv_')
  );
  const firstTv = marketDb.streaming_platforms.find(
    (p) => p.platform_type === 'tv_channel' || p.id.startsWith('tv_')
  );
  return {
    selectedPlatformId:
      firstVod?.id || (worldMarket === 'saudi' ? 'sa_plat_shashat' : 'plat_1'),
    selectedTvChannelId:
      firstTv?.id || (worldMarket === 'saudi' ? 'tv_sa_riyadh1' : 'tv_1'),
  };
}

export const useGameStore = create<NeelyoGameState>()(
  persist(
    (set, get) => ({
      uiLanguage: 'en',
      hasManuallySelectedLanguage: false,
      worldMarket: 'egypt',
      hasSelectedMarket: false,
      studioCreated: false,
      studioName: 'Scorpion Studios',
      ceoName: 'Mahmoud El-Seirafy',
      logo: {
        emblem: 'winged_lion',
        frame: 'royal_shield',
        palette: 'obsidian_gold',
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
          eventText: 'Founded a new production studio aiming to dominate the cinema and drama industry.',
          category: 'milestone',
        },
      ],
      aiMemoryLog: [
        'A new cinema season kicks off amid fierce competition among major production studios.',
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
      talentRejectionCounts: {},
      syndicateMediationUnlocked: {},
      bankruptcyDeadlineDay: null,
      bankruptcyDebtAmount: 0,
      isBankruptLiquidated: false,
      lastEmergencyBailoutDay: null,
      onboardingTourStatus: 'pending_choice',

      setChildModalOpen: (open) => set({ isChildModalOpen: open }),
      setPrWarRoomOpen: (open) => set({ isPrWarRoomOpen: open }),
      setStarForgeOpen: (open) => set({ isStarForgeOpen: open }),
      setOnboardingTourStatus: (status) => set({ onboardingTourStatus: status }),

      unlockNextStarForgeLockWithAd: () =>
        set((state) => {
          const nextLocks = Math.min(
            STAR_FORGE_REQUIRED_LOCKS,
            (state.starForgeLocksOpened || 0) + 1
          );
          return {
            starForgeLocksOpened: nextLocks,
          };
        }),

      watchRewardedAdForVipCoins: () => {
        get().claimEmergencyInvestorBailoutWithAd(15_000_000);
      },

      resolveCrisisWithCash8M: (crisisId) => {
        const state = get();
        const crisis = state.draft.crises.find((c) => c.id === crisisId);
        if (!crisis || crisis.resolved) return;
        const cost = 8_000_000;
        const nextCash = state.cash - cost;
        const nextRep = Math.min(100, state.reputation + 2);
        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: nextRep,
          releasedProjects: state.releasedProjects,
          marketValueModifier: state.marketValueModifier || 0,
        });
        const enteringDistress =
          nextCash <= 0 && state.bankruptcyDeadlineDay === null;

        set((cur) => ({
          cash: nextCash,
          reputation: nextRep,
          marketValue: nextMv,
          bankruptcyDeadlineDay: enteringDistress
            ? cur.gameDay + 30
            : nextCash > 5_000_000
            ? null
            : cur.bankruptcyDeadlineDay,
          bankruptcyDebtAmount:
            nextCash < 0 ? Math.abs(nextCash) + 15_000_000 : cur.bankruptcyDebtAmount,
          draft: {
            ...cur.draft,
            qualityModifier: cur.draft.qualityModifier + 3,
            hypeScore: Math.min(100, cur.draft.hypeScore + 3),
            crises: cur.draft.crises.map((c) =>
              c.id === crisisId ? { ...c, resolved: true, chosenOption: 'A' } : c
            ),
          },
        }));
        enqueueServerLedgerSync(get, set, {
          transactionType: 'RESOLVE_CRISIS_SPEND',
          amountDelta: -cost,
          previousCash: state.cash,
          expectedNewCash: nextCash,
          itemId: crisisId,
          itemLabel: 'حسم أزمة بلاتوه عاجلة (8M)',
        });
        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        get().showToast(
          isEn
            ? `On-set crisis resolved immediately for 8M ${curLabel}!`
            : `تم حسم أزمة البلاتوه فورياً مقابل 8 مليون ${curLabel} من الخزينة!`,
          'success',
          isEn ? '+3 Quality · +3 Audience Buzz' : '+3 جودة فنية · +3 ضجة جماهيرية'
        );
      },

      resolveCrisisWithRewardedAd: (crisisId) => {
        const state = get();
        const crisis = state.draft.crises.find((c) => c.id === crisisId);
        if (!crisis || crisis.resolved) return;
        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        set((cur) => ({
          draft: {
            ...cur.draft,
            qualityModifier: cur.draft.qualityModifier + 4,
            hypeScore: Math.min(100, cur.draft.hypeScore + 5),
            crises: cur.draft.crises.map((c) =>
              c.id === crisisId ? { ...c, resolved: true, chosenOption: 'B' } : c
            ),
          },
        }));
        get().showToast(
          isEn
            ? `Free PR settlement resolved the set crisis (saved 8M ${curLabel})!`
            : `تمت التسوية الإعلامية المجانية لأزمة البلاتوه بنجاح (وفّرت 8 مليون ${curLabel})!`,
          'magic',
          isEn
            ? `Cost: 0 ${curLabel} · +4 Quality · +5 Audience Buzz`
            : `تكلفة 0 ${curLabel} · +4 جودة فنية · +5 ضجة جماهيرية`
        );
      },

      unlockSyndicateMediationWithAd: (talentId, talentName) => {
        const isEn = get().uiLanguage === 'en';
        set((state) => {
          const updatedOffers = { ...state.draft.talentOffers };
          if (updatedOffers[talentId]) {
            delete updatedOffers[talentId];
          }
          return {
            syndicateMediationUnlocked: {
              ...(state.syndicateMediationUnlocked || {}),
              [talentId]: true,
            },
            talentRejectionCounts: {
              ...(state.talentRejectionCounts || {}),
              [talentId]: 0,
            },
            draft: {
              ...state.draft,
              talentOffers: updatedOffers,
            },
          };
        });
        get().showToast(
          isEn
            ? `Actors' Guild mediation unlocked a final round of talks with "${talentName}"!`
            : `تدخلت نقابة المهن التمثيلية وتم فتح جولة مفاوضات أخيرة مع «${talentName}»!`,
          'magic',
          isEn
            ? 'Tensions eased and next offer acceptance chance boosted +25%'
            : 'تمت تهدئة الخلاف ورفع فرص قبول العرض الجديد بنسبة +25%'
        );
      },

      claimInternationalDistributionAdBonus: (projectId) => {
        const state = get();
        const target =
          state.releasedProjects.find((p) => p.id === projectId) ||
          state.lastReleasedProject;
        if (!target || target.intlDistributionAdUsed) return;

        const bonusAmount = Math.max(
          8_000_000,
          Math.round(target.totalGrossRevenue * 0.25)
        );
        const nextCash = state.cash + bonusAmount;

        const updatedProjects = state.releasedProjects.map((p) => {
          if (p.id !== target.id) return p;
          return {
            ...p,
            totalGrossRevenue: p.totalGrossRevenue + bonusAmount,
            boxOfficeRevenue: p.boxOfficeRevenue + bonusAmount,
            netProfit: p.netProfit + bonusAmount,
            intlDistributionAdUsed: true,
          };
        });

        const updatedLast =
          state.lastReleasedProject?.id === target.id
            ? {
                ...state.lastReleasedProject,
                totalGrossRevenue:
                  state.lastReleasedProject.totalGrossRevenue + bonusAmount,
                boxOfficeRevenue:
                  state.lastReleasedProject.boxOfficeRevenue + bonusAmount,
                netProfit: state.lastReleasedProject.netProfit + bonusAmount,
                intlDistributionAdUsed: true,
              }
            : state.lastReleasedProject;

        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: state.reputation,
          releasedProjects: updatedProjects,
          marketValueModifier: state.marketValueModifier || 0,
        });

        set((cur) => ({
          cash: nextCash,
          marketValue: nextMv,
          releasedProjects: updatedProjects,
          lastReleasedProject: updatedLast,
          bankruptcyDeadlineDay: nextCash > 5_000_000 ? null : cur.bankruptcyDeadlineDay,
          bankruptcyDebtAmount: nextCash > 5_000_000 ? 0 : cur.bankruptcyDebtAmount,
          isBankruptLiquidated: false,
        }));

        enqueueServerLedgerSync(get, set, {
          transactionType: 'PROJECT_BOX_OFFICE_REVENUE',
          amountDelta: bonusAmount,
          previousCash: state.cash,
          expectedNewCash: nextCash,
          itemId: target.id,
          itemLabel: `توزيع دولي إضافي (+25%): ${target.title}`,
        });

        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        get().showToast(
          isEn
            ? `International distribution boost (+25% revenue) activated for "${target.title}"!`
            : `تم تفعيل صفقة التوزيع الدولي الإضافي (+25% أرباح) لـ «${target.title}»!`,
          'magic',
          isEn
            ? `+${formatMoney(bonusAmount)} ${curLabel} overseas profits wired straight to your treasury`
            : `+${formatMoney(bonusAmount)} ${curLabel} أرباح توزيع دولي دخلت خزينة الاستوديو فوراً`
        );
      },

      claimEmergencyInvestorBailoutWithAd: (customNeededAmount) => {
        const state = get();
        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        const isInLiquidityEmergency =
          state.cash <= 10_000_000 || state.bankruptcyDeadlineDay !== null;

        if (!isInLiquidityEmergency) {
          state.showToast(
            isEn
              ? 'Emergency bailout is only available during critical liquidity!'
              : 'تمويل الإنقاذ متاح فقط في حالات السيولة الحرجة!',
            'warning',
            isEn
              ? `Unlocks automatically when studio cash drops to 10M ${curLabel} or below.`
              : `يُفتح هذا الخيار تلقائياً عندما ينخفض رصيد الخزينة إلى 10 مليون ${curLabel} أو أقل.`
          );
          return;
        }

        const BAILOUT_COOLDOWN_DAYS = 30;
        if (
          state.lastEmergencyBailoutDay !== null &&
          state.gameDay - state.lastEmergencyBailoutDay < BAILOUT_COOLDOWN_DAYS
        ) {
          const remaining =
            BAILOUT_COOLDOWN_DAYS -
            (state.gameDay - state.lastEmergencyBailoutDay);
          state.showToast(
            isEn
              ? `Bailout on cooldown (${remaining} days remaining)`
              : `تمويل الإنقاذ تحت فترة التبريد (${remaining} يوماً متبقياً)`,
            'warning',
            isEn
              ? 'Emergency investor bailout can be triggered once every 30 game days.'
              : 'يمكن تفعيل تمويل إنقاذ المستثمرين مرة واحدة كل 30 يوماً فقط.'
          );
          return;
        }

        const deficit = state.cash < 0 ? Math.abs(state.cash) : 0;
        const bailoutAmount = Math.max(
          15_000_000,
          Math.min(60_000_000, customNeededAmount || 0),
          deficit + 15_000_000
        );
        const nextCash = state.cash + bailoutAmount;
        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: state.reputation,
          releasedProjects: state.releasedProjects,
          marketValueModifier: state.marketValueModifier || 0,
        });

        set((cur) => ({
          cash: nextCash,
          marketValue: nextMv,
          bankruptcyDeadlineDay: null,
          bankruptcyDebtAmount: 0,
          isBankruptLiquidated: false,
          lastEmergencyBailoutDay: cur.gameDay,
          worldHistory: [
            {
              year: cur.currentYear,
              eventText: isEn
                ? `Emergency investor bailout of ${formatMoney(bailoutAmount)} ${curLabel} rescued "${cur.studioName}" from bankruptcy and restarted production.`
                : `تمويل إنقاذ استثماري عاجل بقيمة ${formatMoney(bailoutAmount)} ${curLabel} أنقذ شركة «${cur.studioName}» من الإفلاس وأعاد تدوير عجلة الإنتاج.`,
              category: 'milestone',
            },
            ...cur.worldHistory,
          ],
        }));

        enqueueServerLedgerSync(get, set, {
          transactionType: 'VIP_PACKAGE_TOPUP',
          amountDelta: bailoutAmount,
          previousCash: state.cash,
          expectedNewCash: nextCash,
          itemId: `bailout_day_${state.gameDay}`,
          itemLabel: 'Emergency Investor Bailout',
        });

        get().showToast(
          isEn
            ? `Emergency bailout of ${formatMoney(bailoutAmount)} ${curLabel} wired to your treasury!`
            : `تم ضخ تمويل إنقاذ استثماري بقيمة ${formatMoney(bailoutAmount)} ${curLabel} في الخزينة!`,
          'magic',
          isEn
            ? 'All debts settled and bankruptcy warning cleared'
            : 'تمت تسوية المديونية بالكامل وإلغاء إنذار الإفلاس'
        );
      },

      liquidateAndStartNewStudioInSameWorld: () => {
        set((state) => {
          const isEn = state.uiLanguage === 'en';
          const primaryReg = getPrimaryMarketRegion(state.worldMarket);
          const oldStudioName = state.studioName;
          const oldCeo = state.ceoName;
          const soldStudioCompetitor: CompetitorStudio = {
            id: `liquidated_${Date.now()}`,
            name: isEn
              ? `${oldStudioName} (Investor Takeover)`
              : `${oldStudioName} (تحت إدارة المستثمرين)`,
            ceoName: isEn
              ? 'Acquisition Investors Consortium'
              : 'تحالف مستثمري الاستحواذ',
            logo_url: '',
            specialty: 'popular_drama',
            preferred_genres: ['popular_drama', 'action', 'comedy'],
            market_power: Math.max(58, state.reputation),
            estimated_net_worth: Math.max(120_000_000, state.marketValue),
            isEmergingStudio: true,
            foundedYear: state.currentYear,
          };

          const liquidationEvent = isEn
            ? `Liquidated and sold "${oldStudioName}" to investors to settle debts — launching a brand-new production studio in the same ${state.currentYear} cinema world.`
            : `تصفية وبيع شركة «${oldStudioName}» للمستثمرين لسداد الديون، وبداية رحلة تأسيس شركة إنتاج جديدة في نفس العالم لعام ${state.currentYear}.`;

          return {
            studioCreated: false,
            activeScreen: 'STUDIO_CREATION',
            currentRegion: primaryReg,
            unlockedRegions: [primaryReg],
            cash: 75_000_000,
            marketValue: 110_000_000,
            marketValueModifier: 0,
            reputation: 60,
            ownedStudioAssets: [],
            releasedProjects: [],
            lastReleasedProject: null,
            talentRejectionCounts: {},
            syndicateMediationUnlocked: {},
            bankruptcyDeadlineDay: null,
            bankruptcyDebtAmount: 0,
            isBankruptLiquidated: false,
            draft: {
              ...DEFAULT_DRAFT,
              ...getDefaultDistributionForMarket(state.worldMarket, state.customDbPatch),
              title: '',
              scriptSynopsis: '',
              selectedDistributionMarkets: [primaryReg],
              talentOffers: {},
              crises: [],
            },
            // Keep the exact same world timeline, year, day, actors, and rival studios!
            emergingCompetitors: [
              soldStudioCompetitor,
              ...(state.emergingCompetitors || []),
            ],
            worldHistory: [
              {
                year: state.currentYear,
                eventText: liquidationEvent,
                category: 'scandal',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [
              `اضطر المنتج ${oldCeo} لبيع وتصفية شركته السابقة "${oldStudioName}" بعد أزمة سيولة، ويستعد الآن لتأسيس شركة إنتاج جديدة في نفس العالم.`,
              ...(state.aiMemoryLog || []),
            ].slice(0, 30),
          };
        });
        enqueueServerLedgerSync(get, set, {
          transactionType: 'INIT_STUDIO',
          amountDelta: 0,
          previousCash: 75_000_000,
          expectedNewCash: 75_000_000,
          itemLabel: 'تصفية وتأسيس استوديو جديد',
        });
      },

      spendForStarForgeUpgrade: (cashCost, _gemCost) => {
        const state = get();
        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        const effectiveCash = Math.max(0, cashCost);
        if (effectiveCash > 0 && state.cash < effectiveCash) {
          state.showToast(
            isEn
              ? 'Not enough studio cash for this stat upgrade!'
              : 'رصيد الخزينة لا يكفي لترقية هذه الطاقة!',
            'warning',
            isEn
              ? `Requires ${formatMoney(effectiveCash)} ${curLabel}, or use the free Training Camp ad.`
              : `تحتاج إلى ${formatMoney(effectiveCash)} ${curLabel} أو يمكنك تفعيل التدريب المجاني عبر الإعلان.`
          );
          return false;
        }
        const nextCash = Math.max(0, state.cash - effectiveCash);
        set({
          cash: nextCash,
        });
        if (effectiveCash > 0) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'RESOLVE_CRISIS_SPEND',
            amountDelta: -effectiveCash,
            previousCash: state.cash,
            expectedNewCash: nextCash,
            itemLabel: 'Star Forge Stat Upgrade',
          });
        }
        return true;
      },

      refundStarForgeCash: (cashAmount) => {
        const safeAmount = Math.max(0, Math.min(10_000_000, Math.round(cashAmount)));
        if (safeAmount <= 0) return;
        const prevCash = get().cash;
        const nextCash = prevCash + safeAmount;
        set({
          cash: nextCash,
        });
        enqueueServerLedgerSync(get, set, {
          transactionType: 'SYNC_CHECKPOINT',
          amountDelta: safeAmount,
          previousCash: prevCash,
          expectedNewCash: nextCash,
          itemLabel: 'Star Forge Refund',
        });
      },

      createCustomVipStar: (actor) =>
        set((state) => {
          const isEn = state.uiLanguage === 'en';
          const customStar: ActorItem = {
            ...actor,
            isCustomStar: true,
            isAiGenerated: false,
            isRisingDiscovery: false,
            status: 'active',
          };
          const headline = isEn
            ? `A Star Is Born: "${state.studioName}" officially unveils exclusive diamond-tier star "${customStar.name}" (${customStar.stats.overall} OVR)!`
            : `ولادة أسطورة سينمائية: «${state.studioName}» تكشف رسمياً عن نجمها الحصري «${customStar.name}» بكارت ألماظ وتقييم ${customStar.stats.overall}!`;
          return {
            starForgeLocksOpened: 0,
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
        await ledgerSyncChain;
        const state = get();
        const instanceId = getOrCreateStudioInstanceId();
        const res = await fetchAuthoritativeStudioWallet(
          instanceId,
          state.cash,
          state.marketValue,
          state.ownedStudioAssets || [],
          state.ledgerSignature || '',
          {
            releasedCount: state.releasedProjects.length,
            totalAwards: countStudioTotalAwards(state.releasedProjects),
            reputation: state.reputation,
          }
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
        await ledgerSyncChain;
        const state = get();
        const isEn = state.uiLanguage === 'en';
        const asset = STUDIO_FIXED_ASSETS.find((a) => a.id === assetId);
        if (!asset) return false;
        const assetDisplayName = isEn
          ? STUDIO_ASSETS_EN[asset.id]?.name || asset.name
          : asset.name;
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);

        if ((state.ownedStudioAssets || []).includes(assetId)) {
          state.showToast(
            isEn
              ? 'This fixed asset is already owned by your studio!'
              : 'هذا الأصل مملوك بالفعل ضمن أصول الاستوديو الثابتة!',
            'info'
          );
          return false;
        }
        if (state.cash < asset.price) {
          state.showToast(
            isEn
              ? 'Insufficient treasury cash to acquire this fixed studio asset!'
              : 'السيولة النقدية في الخزينة لا تكفي لشراء هذا الأصل الثابت حالياً!',
            'warning',
            isEn
              ? `You need ${formatMoney(asset.price)} ${curLabel} to complete the acquisition.`
              : `تحتاج إلى ${formatMoney(asset.price)} ${curLabel} لإتمام الشراء.`
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
          releasedCount: state.releasedProjects.length,
          totalAwards: countStudioTotalAwards(state.releasedProjects),
          ownedAssets: nextAssets,
          itemId: asset.id,
          itemLabel: assetDisplayName,
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
            // Permanent quality bonus from ownedStudioAssets is now computed live on every release
            // so it persists across ALL future projects and never double-counts.
            hypeScore: Math.min(100, cur.draft.hypeScore + asset.hypeBonus),
          },
          worldHistory: [
            {
              year: cur.currentYear,
              eventText: isEn
                ? `Strategic acquisition: purchased "${assetDisplayName}" for ${formatMoney(asset.price)} ${curLabel} to lower production costs and shield against on-set crises.`
                : `استحواذ استراتيجي: شراء «${asset.name}» بقيمة ${formatMoney(asset.price)} ${curLabel} كأصل ثابت يخفض تكاليف الإنتاج ويحمي من أزمات التصوير.`,
              category: 'milestone',
            },
            ...cur.worldHistory,
          ],
          aiMemoryLog: [
            isEn
              ? `Studio "${cur.studioName}" acquired the fixed asset "${assetDisplayName}" for ${formatMoney(asset.price)} ${curLabel}, boosting valuation and permanently cutting production costs.`
              : `اشترت شركة "${cur.studioName}" الأصل الثابت "${asset.name}" بقيمة ${formatMoney(asset.price)} ${curLabel} مما رفع قيمتها السوقية وخفض تكاليف إنتاجها.`,
            ...(cur.aiMemoryLog || []),
          ].slice(0, 25),
        }));

        get().showToast(
          isEn
            ? `Acquired "${assetDisplayName}" as a permanent studio asset!`
            : `تم شراء وتوثيق «${asset.name}» ضمن أصول الاستوديو الثابتة!`,
          'success',
          isEn
            ? `Permanent -${asset.costDiscountPercent}% production cost discount + on-set crisis shield`
            : `خصم دائم -${asset.costDiscountPercent}% على تكاليف الإنتاج + درع حماية في البلاتوه`
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
        await ledgerSyncChain;
        const state = get();
        const campaign = SOCIAL_PR_CAMPAIGNS.find((c) => c.id === campaignId);
        if (!campaign) return false;
        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        const aiCtx = getMarketAiContext(state.worldMarket);
        const marketDb = getResolvedDatabase(state.customDbPatch, state.worldMarket);
        const localizedCampaign = isEn ? PR_CAMPAIGNS_EN[campaign.id] : null;
        const campaignDisplayTitle = localizedCampaign?.title || campaign.title;
        const campaignDisplayImpact =
          localizedCampaign?.impactSummary || campaign.impactSummary;

        if (state.cash < campaign.cost) {
          state.showToast(
            isEn
              ? 'Insufficient studio treasury cash to fund this media campaign!'
              : 'السيولة النقدية في الخزينة لا تكفي لتمويل هذه الحملة الإعلامية!',
            'warning',
            isEn
              ? `You need ${formatMoney(campaign.cost)} ${curLabel} to launch this campaign.`
              : `تحتاج إلى ${formatMoney(campaign.cost)} ${curLabel} لإطلاق الحملة.`
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
          releasedCount: state.releasedProjects.length,
          totalAwards: countStudioTotalAwards(state.releasedProjects),
          ownedAssets: state.ownedStudioAssets || [],
          itemId: campaign.id,
          itemLabel: campaignDisplayTitle,
          previousSignature: state.ledgerSignature,
        });

        const finalCash = verification.ok
          ? verification.correctedCash
          : expectedNewCash;

        const activeProjectTitle =
          state.lastReleasedProject?.title ||
          state.draft.title ||
          (isEn ? 'New Release' : 'العمل الجديد');
        const rawRivalStudio =
          targetRivalStudio ||
          state.lastReleasedProject?.rivalReleases?.[0]?.studioName ||
          state.yearlyRivalReleases?.[0]?.studioName ||
          marketDb.competitor_studios[0]?.name ||
          aiCtx.fallbackRivalStudios[0];
        const rivalStudio = localizeEntityName(rawRivalStudio, state.uiLanguage);
        const rivalFilmTitle =
          state.lastReleasedProject?.rivalReleases?.find(
            (r) => r.studioName === rawRivalStudio || r.studioName === rivalStudio
          )?.title ||
          state.yearlyRivalReleases?.find(
            (r) => r.studioName === rawRivalStudio || r.studioName === rivalStudio
          )?.title ||
          (isEn ? 'Rival Feature' : 'العمل المنافس');

        const cleanTag = activeProjectTitle.replace(/\s+/g, '_');
        const rivalTag = rivalFilmTitle.replace(/\s+/g, '_');
        const [handle1, handle2, handle3] = aiCtx.socialHandles;
        const unitCoinWord = isEn
          ? state.worldMarket === 'saudi'
            ? 'riyal'
            : 'pound'
          : state.worldMarket === 'saudi'
          ? 'ريال'
          : 'جنيه';
        const countryLabelLoc = isEn
          ? state.worldMarket === 'saudi'
            ? 'Saudi Arabia'
            : 'Egypt'
          : aiCtx.countryLabel;

        // Call Groq AI (openai/gpt-oss-20b / openai/gpt-oss-120b) for contextual media response
        let aiGeneratedPosts: LiveSocialFeedPost[] = [];
        let aiOfficialStatement = '';
        try {
          const aiRes = await fetch('/api/generate-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'generate_pr_media_response',
              studioInstanceId: getOrCreateStudioInstanceId(),
              groqKeyOverride: state.groqApiKeyClient,
              preferredModel: state.preferredGroqModel,
              payload: {
                worldMarket: state.worldMarket,
                uiLanguage: state.uiLanguage,
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
              isEn
                ? {
                    id: `supp_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'Cinema Crowd Watch',
                    handle: handle1,
                    content: `Hands down, "${activeProjectTitle}" is the strongest release of the season! Standout performances and world-class direction from ${state.studioName}.`,
                    hashtag: `#${cleanTag}_NumberOne`,
                    likes: '94.2K',
                    shares: '27.8K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'Just now · Viral Surge',
                  }
                : {
                    id: `supp_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'حملة جمهور السينما',
                    handle: handle1,
                    content: `بكل صراحة «${activeProjectTitle}» أقوى عمل هذا الموسم بلا منازع! أداء جبار وإخراج عالمي من شركة «${state.studioName}» 👏🔥`,
                    hashtag: `#${cleanTag}_رقم_واحد`,
                    likes: '94.2K',
                    shares: '27.8K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'الآن · هجوم إيجابي كاسح',
                  },
              isEn
                ? {
                    id: `supp_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'Box Office Pulse',
                    handle: handle3,
                    content: `Record-breaking ticket lines outside cinemas for "${activeProjectTitle}"! Worth every ${unitCoinWord}.`,
                    hashtag: `#${cleanTag}`,
                    likes: '175K',
                    shares: '34.1K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'Just now · TikTok',
                  }
                : {
                    id: `supp_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'تريندات الشباك',
                    handle: handle3,
                    content: `الطوابير أمام قاعات السينما على «${activeProjectTitle}» قياسية! العمل يستاهل كل ${unitCoinWord} 🍿🎬`,
                    hashtag: `#${cleanTag}`,
                    likes: '175K',
                    shares: '34.1K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'الآن · تيك توك',
                  }
            );
          } else if (campaign.id === 'rival_rumor_trolls') {
            newPosts.push(
              isEn
                ? {
                    id: `rumor_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'Backlot Insider Leaks',
                    handle: handle2,
                    content: `Confirmed reports of fierce on-set clashes and walkouts behind "${rivalFilmTitle}" from ${rivalStudio} — audiences are slamming the choppy editing!`,
                    hashtag: `#${rivalTag}_Crisis`,
                    likes: '68.4K',
                    shares: '31.9K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'Just now · Trending Rumor',
                  }
                : {
                    id: `rumor_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'تسريبات الفن السابع',
                    handle: handle2,
                    content: `أنباء مؤكدة عن خلافات حادة وانسحابات في كواليس «${rivalFilmTitle}» التابع لشركة «${rivalStudio}» والجمهور يشتكي من ضعف المونتاج! ⚡📉`,
                    hashtag: `#أزمة_${rivalTag}`,
                    likes: '68.4K',
                    shares: '31.9K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'الآن · إشاعة متصدرة',
                  },
              isEn
                ? {
                    id: `rumor_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'Star Radar Live',
                    handle: handle3,
                    content: `Moviegoers are walking out of "${rivalFilmTitle}" and booking tickets for "${activeProjectTitle}" instead — the gap in craft is night and day!`,
                    hashtag: `#Skip_${rivalTag}`,
                    likes: '142K',
                    shares: '29.5K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'Just now · Viral Clip',
                  }
                : {
                    id: `rumor_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'رادار النجوم',
                    handle: handle3,
                    content: `الجمهور يغادر قاعات «${rivalFilmTitle}» ويتجه لحجز تذاكر «${activeProjectTitle}»! الفارق في المستوى واضح جداً 🎯`,
                    hashtag: `#مقاطعة_${rivalTag}`,
                    likes: '142K',
                    shares: '29.5K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'الآن · فيديو مسرب',
                  }
            );
          } else if (campaign.id === 'tiktok_viral_wave') {
            newPosts.push(
              isEn
                ? {
                    id: `tt_${Date.now()}_1`,
                    platform: 'TikTok',
                    authorName: 'Screen Critics Daily',
                    handle: handle1,
                    content: `The confrontation scene in "${activeProjectTitle}" by ${state.studioName} is taking over TikTok with millions of views! Direction and acting on another level.`,
                    hashtag: `#${cleanTag}`,
                    likes: '284K',
                    shares: '49.2K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'Just now · #1 on TikTok',
                  }
                : {
                    id: `tt_${Date.now()}_1`,
                    platform: 'TikTok',
                    authorName: 'مراجعات الشباك',
                    handle: handle1,
                    content: `مشهد المواجهة في «${activeProjectTitle}» من إنتاج ${state.studioName} يتصدر تيك توك بملايين المشاهدات! الإخراج والتمثيل في مستوى آخر 🔥🎬`,
                    hashtag: `#${cleanTag}`,
                    likes: '284K',
                    shares: '49.2K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'الآن · تريند #1 تيك توك',
                  },
              isEn
                ? {
                    id: `tt_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'Seventh Art Trends',
                    handle: handle3,
                    content: `The entire theater burst into applause at the credits of "${activeProjectTitle}" — an unmissable weekend premiere!`,
                    hashtag: `#${cleanTag}_Sweeps`,
                    likes: '162K',
                    shares: '28.5K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'Just now · Trending Clip',
                  }
                : {
                    id: `tt_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'تريندات الفن السابع',
                    handle: handle3,
                    content: `القاعة كاملة صفّقت عند نهاية عرض «${activeProjectTitle}».. تجربة لا تُفوّت في نهاية الأسبوع! 🍿✨`,
                    hashtag: `#${cleanTag}_يكتسح`,
                    likes: '162K',
                    shares: '28.5K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'الآن · مقطع رائج',
                  }
            );
          } else if (campaign.id === 'x_hashtag_storm') {
            newPosts.push(
              isEn
                ? {
                    id: `x_${Date.now()}_1`,
                    platform: 'X',
                    authorName: `Box Office Monitor — ${countryLabelLoc}`,
                    handle: handle1,
                    content: `#${cleanTag} hits #1 trending in ${countryLabelLoc} after massive opening crowds turn out for ${state.studioName}, led by ${state.ceoName}.`,
                    hashtag: `#${cleanTag}`,
                    likes: '54.8K',
                    shares: '19.4K',
                    sentiment: 'viral_boost',
                    timestampLabel: `Just now · Trending #1 in ${countryLabelLoc}`,
                  }
                : {
                    id: `x_${Date.now()}_1`,
                    platform: 'X',
                    authorName: `مرصد شباك التذاكر — ${aiCtx.countryLabel}`,
                    handle: handle1,
                    content: `تصدر هاشتاج #${cleanTag} قائمة ${aiCtx.trendHashtagLabel} بعد إقبال جماهيري قياسي على عروض شركة «${state.studioName}» بقيادة ${state.ceoName}.`,
                    hashtag: `#${cleanTag}`,
                    likes: '54.8K',
                    shares: '19.4K',
                    sentiment: 'viral_boost',
                    timestampLabel: `الآن · متصدر في ${aiCtx.countryLabel}`,
                  },
              isEn
                ? {
                    id: `x_${Date.now()}_2`,
                    platform: 'X',
                    authorName: 'Cinema Buffs Hub',
                    handle: handle2,
                    content: `${state.studioName} proves once again they are the heavyweight champion of prestige blockbusters with "${activeProjectTitle}"!`,
                    hashtag: `#${state.studioName.replace(/\s+/g, '_')}`,
                    likes: '31.2K',
                    shares: '9.1K',
                    sentiment: 'viral_boost',
                    timestampLabel: '2m ago',
                  }
                : {
                    id: `x_${Date.now()}_2`,
                    platform: 'X',
                    authorName: 'عشاق الفن السابع',
                    handle: handle2,
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
              isEn
                ? {
                    id: `smear_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'Unfiltered Film Critic',
                    handle: handle2,
                    content: `Huge letdown from "${rivalFilmTitle}" by ${rivalStudio} — lazy writing and bloated pacing killed all audience excitement!`,
                    hashtag: `#${rivalTag}_Flop`,
                    likes: '41.6K',
                    shares: '16.3K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'Just now · Heated Debate',
                  }
                : {
                    id: `smear_${Date.now()}_1`,
                    platform: 'X',
                    authorName: 'ناقد بدون مجاملة',
                    handle: handle2,
                    content: `خيبة أمل كبيرة في مستوى «${rivalFilmTitle}» التابع لشركة «${rivalStudio}».. استسهال واضح في الكتابة ومط وتطويل أفقد الجمهور حماسه للعمل! 👎`,
                    hashtag: `#سقوط_${rivalTag}`,
                    likes: '41.6K',
                    shares: '16.3K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'الآن · جدل واسع',
                  },
              isEn
                ? {
                    id: `smear_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'Social Buzz Insider',
                    handle: handle3,
                    content: `Sharp attendance drop for "${rivalFilmTitle}" as crowds flock to ${state.studioName}'s slate this week.`,
                    hashtag: '#SeasonShowdown',
                    likes: '118K',
                    shares: '22.4K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'Just now · TikTok',
                  }
                : {
                    id: `smear_${Date.now()}_2`,
                    platform: 'TikTok',
                    authorName: 'كواليس السوشيال',
                    handle: handle3,
                    content: `تراجع ملحوظ في إقبال الجمهور على «${rivalFilmTitle}» أمام زخم أعمال «${state.studioName}» هذا الأسبوع 📉`,
                    hashtag: `#مقارنة_الموسم`,
                    likes: '118K',
                    shares: '22.4K',
                    sentiment: 'rival_attack',
                    timestampLabel: 'الآن · تيك توك',
                  }
            );
          } else {
            newPosts.push(
              isEn
                ? {
                    id: `vip_${Date.now()}_1`,
                    platform: 'X',
                    authorName: `Film Critics Guild — ${countryLabelLoc}`,
                    handle: handle2,
                    content: `Rave reviews following the VIP critics screening of "${activeProjectTitle}" from ${state.studioName} — visual and dramatic mastery puts it squarely in awards contention.`,
                    hashtag: `#${cleanTag}`,
                    likes: '38.9K',
                    shares: '11.2K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'Just now · VIP Critics Screening',
                  }
                : {
                    id: `vip_${Date.now()}_1`,
                    platform: 'X',
                    authorName: `رابطة نقاد السينما — ${aiCtx.countryLabel}`,
                    handle: handle2,
                    content: `إشادات نقدية واسعة بعد العرض الخاص لـ «${activeProjectTitle}» من إنتاج «${state.studioName}»؛ تكامل بصري ودرامي يضعه في صدارة ترشيحات جوائز العام 🏆🎬`,
                    hashtag: `#${cleanTag}`,
                    likes: '38.9K',
                    shares: '11.2K',
                    sentiment: 'viral_boost',
                    timestampLabel: 'الآن · عرض النقاد الخاص',
                  }
            );
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
                viralTrendLabel: isEn
                  ? `#${cleanTag} sweeps social media with viral hype`
                  : `#${cleanTag} يكتسح السوشيال ميديا بدعم اللجان 🔥`,
              };
            }
          } else if (campaign.id === 'rival_rumor_trolls') {
            const prevRival = nextCompDelta[rawRivalStudio] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[rawRivalStudio] = {
              ...prevRival,
              netWorthDelta: prevRival.netWorthDelta - 35_000_000,
            };
            if (nextLast) {
              const updatedRivals = nextLast.rivalReleases.map((r) => {
                if (
                  r.studioName === rawRivalStudio ||
                  r.studioName === rivalStudio ||
                  r.title === rivalFilmTitle
                ) {
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
                viralTrendLabel: isEn
                  ? `#${cleanTag} dominates TikTok with millions of views`
                  : `#${cleanTag} يتصدر تيك توك بملايين المشاهدات 🔥`,
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
                viralTrendLabel: isEn
                  ? `#${cleanTag} trending #1 on X`
                  : `#${cleanTag} تريند رقم #1 على منصة X 🚀`,
              };
            }
          } else if (campaign.id === 'rival_smear_campaign') {
            const prevRival = nextCompDelta[rawRivalStudio] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[rawRivalStudio] = {
              ...prevRival,
              netWorthDelta: prevRival.netWorthDelta - 48_000_000,
            };
            if (nextLast) {
              const updatedRivals = nextLast.rivalReleases.map((r) => {
                if (
                  r.studioName === rawRivalStudio ||
                  r.studioName === rivalStudio ||
                  r.title === rivalFilmTitle
                ) {
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
              isEn
                ? `${cur.studioName} launched PR campaign "${campaignDisplayTitle}" (${formatMoney(campaign.cost)} ${curLabel}) across social platforms.`
                : `أطلقت شركة "${cur.studioName}" حملة (${campaign.title}) بتكلفة ${formatMoney(campaign.cost)} ${curLabel} على منصات التواصل الاجتماعي.`,
              ...(cur.aiMemoryLog || []),
            ].slice(0, 25),
          };
        });

        get().showToast(
          aiOfficialStatement ||
            (isEn
              ? `Launched "${campaignDisplayTitle}" — dominating social feeds now!`
              : `تم إطلاق «${campaign.title}» وتصدر المشهد على منصات التواصل!`),
          'success',
          campaignDisplayImpact
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

      selectLanguageAndMarket: (language, market) => {
        writeSavedUiLanguage(language);
        const safeMarket: WorldMarketId = market === 'saudi' ? 'saudi' : 'egypt';
        const profile = getMarketProfile(safeMarket);
        const primaryReg = profile.primaryRegion;
        const isEn = language === 'en';
        const defaultStudioEn =
          safeMarket === 'saudi' ? 'Al-Qimmah Pictures' : 'Scorpion Studios';
        const defaultCeoEn =
          safeMarket === 'saudi' ? 'Turki Al-Mansour' : 'Mahmoud El-Seirafy';
        set((state) => {
          const patchTarget = state.customDbPatch?.meta?.targetMarket;
          const keepPatch = !patchTarget || patchTarget === safeMarket;
          if (!keepPatch && typeof window !== 'undefined') {
            try {
              window.localStorage.removeItem(CUSTOM_DB_STORAGE_KEY);
              idbDel(CUSTOM_DB_STORAGE_KEY).catch(() => {});
            } catch {
              // ignore
            }
          }
          const nextPatch = keepPatch ? state.customDbPatch : null;
          return {
            uiLanguage: language,
            hasManuallySelectedLanguage: true,
            worldMarket: safeMarket,
            hasSelectedMarket: true,
            studioCreated: false,
            activeScreen: 'STUDIO_CREATION',
            studioName: isEn ? defaultStudioEn : profile.defaultStudioName,
            ceoName: isEn ? defaultCeoEn : profile.defaultCeoName,
            currentRegion: primaryReg,
            unlockedRegions: [primaryReg],
            customDbPatch: nextPatch,
            customDbUrl: keepPatch ? state.customDbUrl : '',
            draft: {
              ...DEFAULT_DRAFT,
              ...getDefaultDistributionForMarket(safeMarket, nextPatch),
              title: '',
              scriptSynopsis: '',
              selectedDistributionMarkets: [primaryReg],
            },
          };
        });
      },

      setUiLanguage: (language, isManual = true) => {
        if (isManual) {
          writeSavedUiLanguage(language);
        }
        set((state) => ({
          uiLanguage: language,
          hasManuallySelectedLanguage: isManual
            ? true
            : state.hasManuallySelectedLanguage,
        }));
      },

      openMarketSelector: () => {
        get().resetEntireGameAndStartFresh();
        set({ hasSelectedMarket: false });
      },

      initializeStudio: ({ studioName, ceoName, logo, founderPerk, region }) => {
        set((state) => {
          const profile = getMarketProfile(state.worldMarket);
          const isEn = state.uiLanguage === 'en';
          const primaryReg = region || profile.primaryRegion;
          const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
          const isContinuingSameWorld = state.gameDay > 1;
          const cleanStudio =
            studioName.trim() ||
            (isEn
              ? state.worldMarket === 'saudi'
                ? 'Al-Qimmah Pictures'
                : 'Scorpion Studios'
              : profile.defaultStudioName);
          const cleanCeo =
            ceoName.trim() || (isEn ? 'Chief Executive' : 'المدير التنفيذي');
          const marketCountryEn =
            state.worldMarket === 'saudi' ? 'Saudi Arabia' : 'Egypt';
          return {
            hasSelectedMarket: true,
            studioCreated: true,
            studioName: cleanStudio,
            ceoName: cleanCeo,
            logo,
            founderPerk,
            currentRegion: primaryReg,
            unlockedRegions: [primaryReg],
            cash: 75_000_000,
            marketValue: 110_000_000,
            marketValueModifier: 0,
            currentYear: isContinuingSameWorld ? state.currentYear : 2026,
            gameDay: isContinuingSameWorld ? state.gameDay : 1,
            lastAwardsGalaYear: isContinuingSameWorld ? state.lastAwardsGalaYear : 2025,
            bankruptcyDeadlineDay: null,
            bankruptcyDebtAmount: 0,
            isBankruptLiquidated: false,
            talentRejectionCounts: {},
            syndicateMediationUnlocked: {},
            activeScreen: 'STUDIO_HUB',
            onboardingTourStatus: isContinuingSameWorld
              ? 'completed'
              : 'pending_choice',
            draft: {
              ...DEFAULT_DRAFT,
              ...getDefaultDistributionForMarket(state.worldMarket, state.customDbPatch),
              title: '',
              scriptSynopsis: '',
              selectedDistributionMarkets: [primaryReg],
            },
            worldHistory: isContinuingSameWorld
              ? [
                  {
                    year: state.currentYear,
                    eventText: isEn
                      ? `Dramatic comeback: founded "${cleanStudio}" led by ${cleanCeo} with 75M ${curLabel} in the ${state.currentYear} cinema market.`
                      : `عودة مدوية للسوق: تأسيس شركة "${cleanStudio}" بقيادة ${cleanCeo} بسيولة 75M ${curLabel} في نفس العالم السينمائي لعام ${state.currentYear}.`,
                    category: 'milestone',
                  },
                  ...state.worldHistory,
                ]
              : [
                  {
                    year: 2026,
                    eventText: isEn
                      ? `Founded "${cleanStudio}" led by ${cleanCeo} in ${marketCountryEn} with 75M ${curLabel} cash and 110M ${curLabel} valuation.`
                      : `تأسيس شركة "${cleanStudio}" بقيادة ${cleanCeo} في سوق ${profile.countryNameAr} بسيولة خزينة 75M ${curLabel} وقيمة سوقية 110M ${curLabel}.`,
                    category: 'milestone',
                  },
                ],
            aiMemoryLog: isContinuingSameWorld
              ? [
                  isEn
                    ? `Producer ${cleanCeo} founded "${cleanStudio}" with 75M ${curLabel} in ${state.currentYear} after selling their previous studio.`
                    : `أسس المنتج ${cleanCeo} شركة جديدة باسم "${cleanStudio}" بسيولة 75M ${curLabel} في عام ${state.currentYear} بعد بيع شركته السابقة للمستثمرين.`,
                  ...(state.aiMemoryLog || []),
                ].slice(0, 25)
              : [
                  isEn
                    ? `Producer ${cleanCeo} launched "${cleanStudio}" in the ${marketCountryEn} cinema market with 75M ${curLabel} treasury and 110M ${curLabel} valuation.`
                    : `أسس المنتج ${cleanCeo} شركة "${cleanStudio}" في عالم ${profile.marketHeadline} بسيولة خزينة 75M ${curLabel} وقيمة سوقية ابتدائية 110M ${curLabel}.`,
                ],
          };
        });
        enqueueServerLedgerSync(get, set, {
          transactionType: 'INIT_STUDIO',
          amountDelta: 0,
          previousCash: 75_000_000,
          expectedNewCash: 75_000_000,
          itemLabel: get().uiLanguage === 'en' ? 'New Studio Founded' : 'تأسيس استوديو جديد',
        });
      },

      quickStartDemoStudio: () =>
        set((state) => {
          const profile = getMarketProfile(state.worldMarket);
          const isEn = state.uiLanguage === 'en';
          const defaultStudioEn =
            state.worldMarket === 'saudi'
              ? 'Diriyah Pictures'
              : state.worldMarket === 'egypt'
              ? 'Scorpion Pictures'
              : 'Neelyo Studios';
          const defaultCeoEn =
            state.worldMarket === 'saudi' ? 'Fahad Al-Mansour' : 'Tarek Al-Mansour';
          return {
            hasSelectedMarket: true,
            studioCreated: true,
            studioName: isEn ? defaultStudioEn : profile.defaultStudioName,
            ceoName: isEn ? defaultCeoEn : profile.defaultCeoName,
            currentRegion: profile.primaryRegion,
            unlockedRegions: [profile.primaryRegion],
            activeScreen: 'STUDIO_HUB',
          };
        }),

      setActiveScreen: (screen) => set({ activeScreen: screen }),

      unlockMarketRegionWithCash: (region) => {
        const state = get();
        if (state.unlockedRegions.includes(region)) return true;
        const marketConfigs = getMarketConfigsForWorld(state.worldMarket);
        const primaryReg = getPrimaryMarketRegion(state.worldMarket);
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        const isEn = state.uiLanguage === 'en';
        const cfg = marketConfigs.find((c) => c.id === region) || MARKET_CONFIGS.find((c) => c.id === region);
        if (!cfg) return false;
        const regionLabel = isEn
          ? region === 'egypt'
            ? 'Egyptian Market'
            : region === 'gulf'
            ? 'Gulf Market'
            : region === 'europe'
            ? 'European Festivals Market'
            : 'Global Hollywood Distribution'
          : cfg.name;

        // If studio market value already meets the threshold, unlock for free!
        if (state.marketValue >= cfg.unlockMarketValue) {
          set({
            unlockedRegions: [...state.unlockedRegions, region],
            currentRegion: region,
            draft: {
              ...state.draft,
              selectedDistributionMarkets: Array.from(
                new Set([...(state.draft.selectedDistributionMarkets || [primaryReg]), region])
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
              new Set([...(state.draft.selectedDistributionMarkets || [primaryReg]), region])
            ),
          },
          worldHistory: [
            {
              year: state.currentYear,
              eventText: isEn
                ? `Opened a regional distribution office in ${regionLabel} for ${formatMoney(cfg.earlyLicenseCost)} ${curLabel}.`
                : `افتتاح مكتب توزيع إقليمي ودولي للشركة في «${cfg.name}» باستثمار ${formatMoney(cfg.earlyLicenseCost)} ${curLabel}.`,
              category: 'milestone',
            },
            ...state.worldHistory,
          ],
        });
        enqueueServerLedgerSync(get, set, {
          transactionType: 'UNLOCK_MARKET_REGION',
          amountDelta: -cfg.earlyLicenseCost,
          previousCash: state.cash,
          expectedNewCash: nextCash,
          itemId: region,
          itemLabel: isEn
            ? `Distribution Office License: ${regionLabel}`
            : `ترخيص مكتب توزيع: ${cfg.name}`,
        });
        return true;
      },

      toggleDraftDistributionMarket: (region) =>
        set((state) => {
          const primaryReg = getPrimaryMarketRegion(state.worldMarket);
          if (region === primaryReg) return state; // Base market is always active
          if (!state.unlockedRegions.includes(region)) return state;
          const currentList = state.draft.selectedDistributionMarkets || [primaryReg];
          const exists = currentList.includes(region);
          const nextList: MarketRegion[] = exists
            ? currentList.filter((r) => r !== region)
            : [...currentList, region];
          return {
            draft: {
              ...state.draft,
              selectedDistributionMarkets: nextList.length > 0 ? nextList : [primaryReg],
            },
          };
        }),

      triggerAnnualAwardsCeremonyNow: () =>
        set((state) => {
          const db = getResolvedDatabase(state.customDbPatch, state.worldMarket);
          const yearToJudge = state.currentYear;
          const playerProjectsThisYear = state.releasedProjects.filter(
            (p) => p.year === yearToJudge
          );

          // Ensure rival releases exist for this year
          let rivalsPool = state.yearlyRivalReleases.filter(
            (r) => !r.year || r.year === yearToJudge
          );
          if (rivalsPool.length < 3) {
            const marketDirectors = db.crew.filter((c) => c.role === 'director');
            const extraFilmRivals = generateRivalReleases(
              [...db.competitor_studios, ...state.emergingCompetitors],
              db.actors,
              [],
              1.05,
              yearToJudge,
              'film',
              state.worldMarket,
              marketDirectors,
              state.uiLanguage
            );
            const extraSeriesRivals = generateRivalReleases(
              [...db.competitor_studios, ...state.emergingCompetitors],
              db.actors,
              [],
              1.0,
              yearToJudge + 5,
              'series',
              state.worldMarket,
              marketDirectors,
              state.uiLanguage
            );
            rivalsPool = [...rivalsPool, ...extraFilmRivals, ...extraSeriesRivals];
          }

          const gala = buildAnnualAwardsGalaForYear({
            playerProjectsInYear: playerProjectsThisYear,
            rivalReleasesInYear: rivalsPool,
            studioName: state.studioName,
            year: yearToJudge,
            db,
            worldMarket: state.worldMarket,
            uiLanguage: state.uiLanguage,
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
          const isEn = state.uiLanguage === 'en';

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
                eventText: isEn
                  ? `${yearToJudge} Annual Cinema & Drama Awards Gala held — studio claimed ${totalPlayerWon} award(s).`
                  : `إقامة الحفل السنوي لتوزيع جوائز السينما والدراما لعام ${yearToJudge} وحصد الاستوديو ${totalPlayerWon} جائزة.`,
                category: 'award',
              },
              ...state.worldHistory,
            ],
          };
        }),

      advanceGameDay: (days = 1) => {
        const cashBeforeDay = get().cash;
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

          const db = getResolvedDatabase(state.customDbPatch, state.worldMarket);
          const isEn = state.uiLanguage === 'en';
          const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
          const liveActors = getLiveActorsWithEvolution({
            baseActors: db.actors,
            aiGeneratedActors: nextAiActors,
            actorDynamicState: nextActorDynamic,
            currentYear: newYear,
            gameDay: newGameDay,
          });

          const nextRejectionCounts = { ...(state.talentRejectionCounts || {}) };

          // 1. Evaluate pending talent offers that have reached their responseDueDay (2–3 full game days)
          for (const key of Object.keys(updatedOffers)) {
            const offer = updatedOffers[key];
            if (offer.status === 'pending' && newGameDay >= offer.responseDueDay) {
              const slotLabel = getLocalizedSlotLabel(offer.roleSlot, state.uiLanguage);
              const talentDisplay = localizeEntityName(offer.talentName, state.uiLanguage);
              const roleDisplay = offer.customRoleName || slotLabel;
              const projTitleDisplay =
                updatedDraft.title || (isEn ? 'Untitled Project' : 'العمل الجديد');

              if (!offer.willAccept) {
                updatedOffers[key] = { ...offer, status: 'rejected' };
                const newRejCount = (nextRejectionCounts[offer.talentId] || 0) + 1;
                nextRejectionCounts[offer.talentId] = newRejCount;
                nextMarketValMod -= 2_500_000;
                updatedDraft.hypeScore = Math.max(15, updatedDraft.hypeScore - 3);
                const headline = isEn
                  ? `${talentDisplay} declined your offer for "${roleDisplay}"`
                  : `اعتذر «${offer.talentName}» عن عرض دور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}»`;
                newNewsItems.push({
                  id: `news_rej_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: isEn
                    ? newRejCount >= 2
                      ? 'Talks Closed · Guild Mediation Required'
                      : 'Official Agent Reply · Offer Declined'
                    : newRejCount >= 2
                    ? 'إغلاق باب التفاوض · يتطلب وساطة النقابة ⚠️'
                    : 'رد رسمي من وكيل الأعمال · اعتذار عن التعاقد',
                  headline,
                  detail: offer.aiReason,
                  highlightName: talentDisplay,
                  extraStatBadge: isEn
                    ? `Offer: ${formatMoney(offer.offeredSalary)} ${curLabel}`
                    : `العرض: ${formatMoney(offer.offeredSalary)} ${curLabel}`,
                  gameImpactLabel: isEn
                    ? newRejCount >= 2
                      ? 'Declined twice and closed talks — use "Actors Guild Mediation (Ad)" for one final negotiation'
                      : 'Revise your terms or cast an alternative talent from the roster'
                    : newRejCount >= 2
                    ? 'رفض العرض مرتين وأغلق باب التفاوض — يمكنك تفعيل «وساطة نقابة المهن التمثيلية (إعلان)» لفرصة أخيرة'
                    : 'يمكنك التفاوض بشروط جديدة أو اختيار بديل آخر من القائمة',
                });
                nextHistory.unshift({
                  year: newYear,
                  eventText: `${headline} — ${offer.aiReason}`,
                  category: 'milestone',
                });
                nextMemory.unshift(
                  isEn
                    ? `${talentDisplay} declined ${state.studioName}'s offer for "${roleDisplay}" on "${projTitleDisplay}".`
                    : `رفض النجم ${offer.talentName} عرض شركة "${state.studioName}" لدور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" في عمل "${updatedDraft.title || 'مشروع جديد'}".`
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
                const headline = isEn
                  ? `${talentDisplay} officially signed for "${projTitleDisplay}" (${slotLabel})!`
                  : `وافق «${offer.talentName}» رسمياً على عقد «${updatedDraft.title || 'العمل الجديد'}» (${SLOT_ARABIC_NAMES[offer.roleSlot]})! ✓`;
                newNewsItems.push({
                  id: `news_acc_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: isEn
                    ? 'Official Agent Reply · Contract Signed ✓'
                    : 'رد رسمي من وكيل الأعمال · قبول التعاقد ✓',
                  headline,
                  detail: offer.aiReason,
                  highlightName: talentDisplay,
                  extraStatBadge: isEn
                    ? `Salary: ${formatMoney(offer.offeredSalary)} ${curLabel}`
                    : `الأجر: ${formatMoney(offer.offeredSalary)} ${curLabel}`,
                  gameImpactLabel: isEn
                    ? exceedsCrewCapacity
                      ? `Multiple acceptances for ${slotLabel} — pick who joins your final roster`
                      : `Officially attached to your production (${slotLabel})`
                    : exceedsCrewCapacity
                    ? `وافق أكثر من العدد الأقصى لفئة (${SLOT_ARABIC_NAMES[offer.roleSlot]}) — اختر من تعتمده في الفريق النهائي`
                    : `تم اعتماده رسمياً في فريق العمل (${SLOT_ARABIC_NAMES[offer.roleSlot]})`,
                });
                nextHistory.unshift({
                  year: newYear,
                  eventText: isEn
                    ? `${headline} for ${formatMoney(offer.offeredSalary)} ${curLabel}.`
                    : `${headline} مقابل ${formatMoney(offer.offeredSalary)} ${curLabel}.`,
                  category: 'milestone',
                });
                nextMemory.unshift(
                  isEn
                    ? `${talentDisplay} signed with ${state.studioName} (CEO ${state.ceoName}) as "${roleDisplay}" for ${formatMoney(offer.offeredSalary)} ${curLabel}.`
                    : `وقّع النجم ${offer.talentName} مع شركة "${state.studioName}" بقيادة ${state.ceoName} لأداء دور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" بأجر ${formatMoney(offer.offeredSalary)} ${curLabel}.`
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

          // No idle passive cash drip. Cash only grows when an actively released film/series
          // earns its daily box office / broadcast revenue during its automatic release run.
          let nextCash = state.cash;

          // 2b. Automatically advance ALL active released projects whose run has not yet finished
          // (so starting a new project early still collects remaining box office / episode revenue!)
          nextReleasedProjects = nextReleasedProjects.map((proj) => {
            const maxReleaseSteps =
              proj.format === 'series' ? proj.episodes || 15 : 10;
            const currentTracked = proj.daysTracked || 1;
            if (currentTracked >= maxReleaseSteps) return proj;

            let workingProj = proj;
            const stepsToRun = Math.min(days, maxReleaseSteps - currentTracked);
            for (let sIdx = 0; sIdx < stepsToRun; sIdx++) {
              const nextDayNum = (workingProj.daysTracked || 1) + 1;
              const isSeriesProj = workingProj.format === 'series';
              const autoNews: DailyAiNewsItem = {
                id: `auto_bo_${workingProj.id}_d${nextDayNum}_${newGameDay}`,
                day: newGameDay,
                headline: isEn
                  ? isSeriesProj
                    ? `Episode ${nextDayNum} of "${workingProj.title}" airs — Viewership Race Update`
                    : `Day ${nextDayNum} Box Office Report for "${workingProj.title}"`
                  : isSeriesProj
                  ? `عرض الحلقة ${nextDayNum} من «${workingProj.title}» وتحديث سباق المشاهدات`
                  : `تقرير اليوم ${nextDayNum} لشباك تذاكر «${workingProj.title}»`,
                detail: isEn
                  ? isSeriesProj
                    ? `New episodes continue drawing TV and streaming audiences with live daily season chart updates.`
                    : `Strong theatrical turnout on Day ${nextDayNum} with live ranking shifts against rival releases.`
                  : isSeriesProj
                  ? `تواصل الحلقات جذب الجمهور والمنصات الرقمية مع تحرك يومي حي في ترتيب الموسم.`
                  : `شهدت قاعات العرض إقبالاً جديداً في اليوم ${nextDayNum} مع تحديث مباشر لترتيب المنافسين.`,
                impactType: workingProj.criticScore >= 6.8 ? 'positive' : 'rival',
                hypeDelta: 0,
              };
              const stepped = stepProjectRevenueProgress(
                workingProj,
                1.0,
                1.0,
                autoNews
              );
              workingProj = stepped.updatedProject;
              if (stepped.revenueDelta > 0) {
                nextCash += stepped.revenueDelta;
              }
            }
            return workingProj;
          });

          if (nextLastReleased) {
            const refreshedLast = nextReleasedProjects.find(
              (p) => p.id === nextLastReleased?.id
            );
            if (refreshedLast) {
              nextLastReleased = refreshedLast;
            }
          }

          // 3. Organic Rival Studio Releases during the year (every 30 game days):
          if (newGameDay > 5 && newGameDay % 30 === 0) {
            const allCompetitors = [...db.competitor_studios, ...nextEmergingStudios];
            const isSeriesWindow = (newGameDay / 30) % 2 === 0;
            const marketDirectors = db.crew.filter((c) => c.role === 'director');
            const organicRivals = generateRivalReleases(
              allCompetitors,
              liveActors,
              updatedDraft.leadActorIds,
              1.0,
              newGameDay,
              isSeriesWindow ? 'series' : 'film',
              state.worldMarket,
              marketDirectors,
              state.uiLanguage
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
              const vetName = localizeEntityName(chosenVet.name, state.uiLanguage);
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

              const headline = isEn
                ? isDeceased
                  ? `Breaking: Veteran screen legend ${vetName} passes away at ${chosenVet.age}`
                  : `Veteran star ${vetName} (${chosenVet.age}) announces retirement from acting`
                : isDeceased
                ? `نبأ عاجل: رحيل الفنان القدير «${chosenVet.name}» عن عمر يناهز ${chosenVet.age} عاماً`
                : `الفنان القدير «${chosenVet.name}» (${chosenVet.age} سنة) يعلن اعتزاله التمثيل نهائياً`;
              const detail = isEn
                ? isDeceased
                  ? `The entertainment industry mourns the passing of acclaimed icon ${vetName}, leaving behind an unforgettable cinematic legacy.`
                  : `${vetName} announced a permanent retirement from film and television to widespread tribute from peers and fans.`
                : isDeceased
                ? `خيّم الحزن على الوسط الفني بعد إعلان وفاة الفنان القدير «${chosenVet.name}» تاركاً إرثاً خالداً في ذاكرة السينما والدراما.`
                : `أعلن الفنان «${chosenVet.name}» اكتفاءه بمسيرته الفنية الحافلة واعتزاله العمل السينمائي والدرامي وسط تكريم واسع من صناع السينما.`;

              newNewsItems.push({
                id: `world_vet_${chosenVet.id}_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: isDeceased ? 'actor_deceased' : 'actor_retired',
                badgeLabel: isEn
                  ? isDeceased
                    ? 'Breaking · Industry Tribute'
                    : 'Press Flash · Career Retirement'
                  : isDeceased
                  ? 'خبر عاجل · الوسط الفني 🕊️'
                  : 'خبر صحفي · اعتزال فني',
                headline,
                detail,
                highlightName: vetName,
                extraStatBadge: isEn
                  ? `Age: ${chosenVet.age}`
                  : `العمر: ${chosenVet.age} سنة`,
                gameImpactLabel: isEn
                  ? `Market Impact: ${vetName} is no longer available for casting`
                  : `تأثير الخبر: خروج «${chosenVet.name}» من قائمة الممثلين المتاحين للتعاقد`,
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
              const marketDirectors = db.crew.filter((c) => c.role === 'director');
              rivalsInYear = [
                ...rivalsInYear,
                ...generateRivalReleases(
                  [...db.competitor_studios, ...nextEmergingStudios],
                  liveActors,
                  [],
                  1.05,
                  completedYear,
                  'film',
                  state.worldMarket,
                  marketDirectors,
                  state.uiLanguage
                ),
                ...generateRivalReleases(
                  [...db.competitor_studios, ...nextEmergingStudios],
                  liveActors,
                  [],
                  1.0,
                  completedYear + 3,
                  'series',
                  state.worldMarket,
                  marketDirectors,
                  state.uiLanguage
                ),
              ];
            }

            const gala = buildAnnualAwardsGalaForYear({
              playerProjectsInYear: playerProjectsInCompletedYear,
              rivalReleasesInYear: rivalsInYear,
              studioName: state.studioName,
              year: completedYear,
              db,
              worldMarket: state.worldMarket,
              uiLanguage: state.uiLanguage,
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
              eventText: isEn
                ? `${completedYear} Annual Awards Gala kicked off — studio won ${totalPlayerWon} official award(s).`
                : `انطلاق الحفل السنوي لجوائز السينما والدراما (${completedYear}) وحصد الاستوديو ${totalPlayerWon} جوائز رسمية.`,
              category: 'award',
            });
            nextHistory.unshift({
              year: newYear,
              eventText: isEn
                ? `New cinema year (${newYear}) begins — every talent across the market ages by one year.`
                : `بداية عام سينمائي جديد (${newYear}) وتقدم أعمار جميع النجوم في السوق بعام إضافي.`,
              category: 'milestone',
            });
          }

          const nextMarketValue = calculateStudioMarketValue({
            cash: nextCash,
            reputation: nextRep,
            releasedProjects: nextReleasedProjects,
            marketValueModifier: nextMarketValMod,
          });

          // 6. Bankruptcy Grace Period & Mandatory Liquidation Tracking (30 game days = 3 game months)
          let nextBankruptcyDeadline = state.bankruptcyDeadlineDay;
          let nextBankruptcyDebt = state.bankruptcyDebtAmount || 0;
          let nextIsBankruptLiquidated = state.isBankruptLiquidated || false;

          if (nextCash <= 0) {
            nextBankruptcyDebt = Math.abs(nextCash);
            if (nextBankruptcyDeadline === null) {
              nextBankruptcyDeadline = newGameDay + 30;
              newNewsItems.push({
                id: `bankruptcy_warning_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'production_news',
                badgeLabel: isEn
                  ? 'Official Bankruptcy Notice · 3-Month Grace Period'
                  : 'إنذار إفلاس رسمي · مهلة سداد 3 أشهر ⚠️',
                headline: isEn
                  ? `${state.studioName} treasury hits deficit — banks issue a 3-month liquidation warning!`
                  : `خزينة «${state.studioName}» تسجل عجزاً مالياً والبنوك تمنح مهلة 3 أشهر قبل التصفية!`,
                detail: isEn
                  ? `Your cash balance dropped to (${formatMoney(nextCash)} ${curLabel}). You have 30 game days (3 months) to cover the debt or activate an Emergency Investor Bailout before forced liquidation.`
                  : `وصل رصيد السيولة في الخزينة إلى (${formatMoney(nextCash)} ${curLabel}). أمامك مهلة 3 أشهر (30 يوماً في التقويم) لتسديد المديونية أو الحصول على «تمويل إنقاذ من مستثمر (مقابل إعلان)»، وإلا ستُجبر على بيع الشركة وتصفيتها!`,
                highlightName: state.studioName,
                extraStatBadge: isEn
                  ? `Deficit: ${formatMoney(Math.abs(nextCash))} ${curLabel}`
                  : `العجز: ${formatMoney(Math.abs(nextCash))} ${curLabel}`,
                gameImpactLabel: isEn
                  ? 'Activate an emergency investor bailout or earn revenue before the deadline'
                  : 'احصل على تمويل إنقاذ فوري من مستثمر أو حقق إيرادات قبل انتهاء المهلة',
              });
            } else if (newGameDay >= nextBankruptcyDeadline) {
              nextIsBankruptLiquidated = true;
            }
          } else {
            nextBankruptcyDeadline = null;
            nextBankruptcyDebt = 0;
            nextIsBankruptLiquidated = false;
          }

          return {
            cash: nextCash,
            gameDay: newGameDay,
            currentYear: newYear,
            lastAwardsGalaYear: nextLastGalaYear,
            reputation: nextRep,
            marketValueModifier: nextMarketValMod,
            marketValue: nextMarketValue,
            draft: updatedDraft,
            talentRejectionCounts: nextRejectionCounts,
            bankruptcyDeadlineDay: nextBankruptcyDeadline,
            bankruptcyDebtAmount: nextBankruptcyDebt,
            isBankruptLiquidated: nextIsBankruptLiquidated,
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
        });
        const cashAfterDay = get().cash;
        const dailyRevenueDelta = cashAfterDay - cashBeforeDay;
        if (dailyRevenueDelta !== 0) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'PROJECT_BOX_OFFICE_REVENUE',
            amountDelta: dailyRevenueDelta,
            previousCash: cashBeforeDay,
            expectedNewCash: cashAfterDay,
            itemLabel: `إيرادات شباك التذاكر اليومية (اليوم ${get().gameDay})`,
          });
        }
      },

      submitTalentOffer: (offer) => {
        const prevCash = get().cash;
        const dinnerFee = offer.vipDinner ? (offer.vipDinnerCost ?? VIP_DINNER_COST) : 0;
        set((state) => {
          const nextCash = Math.max(0, state.cash - dinnerFee);
          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: state.reputation,
            releasedProjects: state.releasedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });
          const isEn = state.uiLanguage === 'en';
          const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
          const slotLabel = getLocalizedSlotLabel(offer.roleSlot, state.uiLanguage);
          const talentDisplay = localizeEntityName(offer.talentName, state.uiLanguage);
          const memoryEntry = isEn
            ? `${state.studioName} sent a contract offer to ${talentDisplay} for "${offer.customRoleName || slotLabel}" on "${state.draft.title || 'New Project'}" (${formatMoney(offer.offeredSalary)} ${curLabel}, ${offer.backendPoints}% backend; reply due Day ${offer.responseDueDay}).`
            : `أرسلت شركة "${state.studioName}" عرض تعاقد إلى ${offer.talentName} لأداء دور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" في «${state.draft.title || 'عمل جديد'}» بأجر ${formatMoney(offer.offeredSalary)} ${curLabel} ونسبة أرباح ${offer.backendPoints}% (الرد في اليوم ${offer.responseDueDay}).`;
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
        });
        if (dinnerFee > 0) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'RESOLVE_CRISIS_SPEND',
            amountDelta: -dinnerFee,
            previousCash: prevCash,
            expectedNewCash: Math.max(0, prevCash - dinnerFee),
            itemId: offer.talentId,
            itemLabel:
              get().uiLanguage === 'en'
                ? `VIP Business Dinner with ${localizeEntityName(offer.talentName, 'en')}`
                : `عشاء عمل وتفاوض مع ${offer.talentName}`,
          });
        }
      },

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
                      state.uiLanguage === 'en'
                        ? 'Maximum directing team is 2 directors (1 to 2)! Deselect one director first to pick another.'
                        : 'الحد الأقصى لفريق الإخراج هو مخرجان اثنان فقط (من 1 إلى 2)! ألغِ اعتماد أحد المخرجين أولاً لاختيار مخرج آخر.',
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
            ...getDefaultDistributionForMarket(state.worldMarket, state.customDbPatch),
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
          talentRejectionCounts: {},
          syndicateMediationUnlocked: {},
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

      watchVipAdStep: () => {
        const prevCash = get().cash;
        const willUnlock = Math.min(5, get().vipAdProgress + 1) >= 5;
        set((state) => {
          const nextStep = Math.min(5, state.vipAdProgress + 1);
          const unlocked = nextStep >= 5;
          return {
            vipAdProgress: nextStep,
            vipPassExpiresAt: unlocked ? Date.now() + 24 * 60 * 60 * 1000 : state.vipPassExpiresAt,
            cash: unlocked ? state.cash + 40_000_000 : state.cash,
            vipCoins: unlocked ? state.vipCoins + 500 : state.vipCoins + 50,
          };
        });
        if (willUnlock) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'VIP_PACKAGE_TOPUP',
            amountDelta: 40_000_000,
            previousCash: prevCash,
            expectedNewCash: prevCash + 40_000_000,
            itemLabel: 'مكافأة دعم استثماري للمنتج',
          });
        }
      },

      resolveCrisisOption: (crisisId, choice) => {
        const beforeState = get();
        const crisis = beforeState.draft.crises.find((c) => c.id === crisisId);
        if (!crisis || crisis.resolved) return;
        const opt = choice === 'A' ? crisis.optionA : crisis.optionB;
        const prevCash = beforeState.cash;
        const nextCash = prevCash - opt.cost;
        set((state) => {
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
        });
        if (opt.cost !== 0) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'RESOLVE_CRISIS_SPEND',
            amountDelta: -opt.cost,
            previousCash: prevCash,
            expectedNewCash: nextCash,
            itemId: crisisId,
            itemLabel: `قرار أزمة إنتاجية (${choice})`,
          });
        }
      },

      completeProjectRelease: (record) => {
        const prevCash = get().cash;
        const backendRate = Math.min(
          0.45,
          Math.max(0, Number(record.backendPointsTotalPercent || 0)) / 100
        );
        const initialRoyalty = Math.round(record.totalGrossRevenue * backendRate);
        const netInitialGross = Math.max(
          0,
          record.totalGrossRevenue - initialRoyalty
        );
        const finalRecord: ReleasedProjectRecord = {
          ...record,
          backendRoyaltiesPaid: initialRoyalty,
          netProfit: netInitialGross - record.totalBudget,
        };
        set((state) => {
          const newCash = state.cash - finalRecord.totalBudget + netInitialGross;
          const nextProjects = [finalRecord, ...state.releasedProjects];

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
          const marketConfigs = getMarketConfigsForWorld(state.worldMarket);
          for (const cfg of marketConfigs) {
            if (cfg.unlockMarketValue > 0 && nextMarketValue >= cfg.unlockMarketValue && !unlocked.includes(cfg.id)) {
              unlocked.push(cfg.id);
            }
          }

          const nextActorDynamic = { ...state.actorDynamicState };
          const newNewsItems: WorldBreakingNewsModalItem[] = [];
          const db = getResolvedDatabase(state.customDbPatch, state.worldMarket);
          const curLabel = getCurrencyLabel(state.worldMarket);
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

            const isEn = state.uiLanguage === 'en';
            const actorDisplay = localizeEntityName(baseActor.name, state.uiLanguage);

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
                lastEvolutionNote: isEn
                  ? `Card upgrade (+${boostOvr}) after the hit "${record.title}"`
                  : `تطور البطاقة (+${boostOvr}) بعد نجاح «${record.title}»`,
              };

              if (isBreakoutCandidate) {
                newNewsItems.push({
                  id: `breakout_${actorId}_${Date.now()}`,
                  day: state.gameDay,
                  year: state.currentYear,
                  category: 'actor_evolution',
                  badgeLabel: isEn
                    ? 'Breakout Star · Card Upgrade'
                    : 'انفجار موهبة وتطور بطاقة ممثل 🔥',
                  headline: isEn
                    ? `${actorDisplay} rockets to box-office stardom after "${record.title}"!`
                    : `تحول «${baseActor.name}» إلى نجم شباك بعد تألقه في «${record.title}»!`,
                  detail: isEn
                    ? `Following the critical and commercial triumph of "${record.title}", ${actorDisplay} surged by +${boostOvr} OVR to ${newOvr} (Tier ${newTier}), sparking a bidding war across rival studios!`
                    : `بفضل السيناريو المتقن والنجاح النقدي والجماهيري لـ «${record.title}»، قفزت طاقة بطاقة الممثل «${baseActor.name}» بمقدار (+${boostOvr} نقاط) ليصل إلى تقييم ${newOvr} (فئة ${newTier})، وارتفع أجره السوقي وسط تهافت الشركات المنافسة عليه!`,
                  highlightName: actorDisplay,
                  extraStatBadge: isEn
                    ? `New Rating: ${newOvr} (+${boostOvr}) · Tier ${newTier}`
                    : `التقييم الجديد: ${newOvr} (+${boostOvr}) · فئة ${newTier}`,
                  gameImpactLabel: isEn
                    ? `Card Impact: ${actorDisplay} promoted to Tier ${newTier}`
                    : `تأثير الحدث: ترقية بطاقة «${baseActor.name}» إلى الفئة ${newTier}`,
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
                lastEvolutionNote: isEn
                  ? `Card drop (${dropOvr}) after "${record.title}" underperformed`
                  : `هبوط البطاقة (${dropOvr}) بعد تعثر «${record.title}»`,
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

          const isEnRelease = state.uiLanguage === 'en';
          const releaseCurLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
          const nextMemory = [
            isEnRelease
              ? `${state.studioName} (CEO ${state.ceoName}) released ${record.format === 'film' ? 'film' : 'series'} "${record.title}" (Budget: ${formatMoney(record.totalBudget)} ${releaseCurLabel}, Gross: ${formatMoney(record.totalGrossRevenue)} ${releaseCurLabel}, Net: ${formatMoney(record.netProfit)} ${releaseCurLabel}, Rank #${record.boxOfficeRank}, Critics ${record.criticScore}/10).`
              : `طرحت شركة "${state.studioName}" بقيادة ${state.ceoName} ${record.format === 'film' ? 'فيلم' : 'مسلسل'} "${record.title}" بتكلفة ${formatMoney(record.totalBudget)} ${releaseCurLabel} وحقق إجمالي إيرادات ${formatMoney(record.totalGrossRevenue)} ${releaseCurLabel} (صافي الربح: ${formatMoney(record.netProfit)} ${releaseCurLabel}) والمركز #${record.boxOfficeRank} في الموسم وتقييم نقاد ${record.criticScore}/10.`,
            ...(state.aiMemoryLog || []),
          ].slice(0, 25);

          let nextBankruptcyDeadline = state.bankruptcyDeadlineDay;
          let nextBankruptcyDebt = state.bankruptcyDebtAmount || 0;
          let nextIsBankruptLiquidated = state.isBankruptLiquidated || false;

          if (newCash <= 0) {
            nextBankruptcyDebt = Math.abs(newCash);
            if (nextBankruptcyDeadline === null) {
              nextBankruptcyDeadline = state.gameDay + 30;
            }
          } else {
            nextBankruptcyDeadline = null;
            nextBankruptcyDebt = 0;
            nextIsBankruptLiquidated = false;
          }

          return {
            cash: newCash,
            marketValue: nextMarketValue,
            reputation: nextRep,
            unlockedRegions: unlocked,
            bankruptcyDeadlineDay: nextBankruptcyDeadline,
            bankruptcyDebtAmount: nextBankruptcyDebt,
            isBankruptLiquidated: nextIsBankruptLiquidated,
            draft: {
              ...DEFAULT_DRAFT,
              ...getDefaultDistributionForMarket(state.worldMarket, state.customDbPatch),
              title: '',
              scriptSynopsis: '',
              selectedDistributionMarkets: [...unlocked],
            },
            releasedProjects: nextProjects,
            lastReleasedProject: finalRecord,
            yearlyRivalReleases: nextYearlyRivals,
            actorDynamicState: nextActorDynamic,
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            aiMemoryLog: nextMemory,
            worldHistory: [
              {
                year: state.currentYear,
                eventText: isEnRelease
                  ? `Released ${finalRecord.format === 'film' ? 'film' : 'series'} "${finalRecord.title}" — ${formatMoney(finalRecord.totalGrossRevenue)} ${releaseCurLabel} gross (Rank #${finalRecord.boxOfficeRank}, Critics ${finalRecord.criticScore}/10).`
                  : `طرح ${finalRecord.format === 'film' ? 'فيلم' : 'مسلسل'} "${finalRecord.title}" بإيرادات ${formatMoney(finalRecord.totalGrossRevenue)} ${releaseCurLabel} (المركز #${finalRecord.boxOfficeRank}) وتقييم نقاد ${finalRecord.criticScore}/10.`,
                category: 'release',
              },
              ...state.worldHistory,
            ],
          };
        });
        const afterReleaseCash = get().cash;
        enqueueServerLedgerSync(get, set, {
          transactionType: 'PROJECT_BOX_OFFICE_REVENUE',
          amountDelta: afterReleaseCash - prevCash,
          previousCash: prevCash,
          expectedNewCash: afterReleaseCash,
          itemId: finalRecord.id,
          itemLabel: `طرح عمل: ${finalRecord.title}`,
        });
      },

      setProjectJuryCommentary: (projectId, commentary) => {
        if (!projectId || !commentary.trim()) return;
        set((state) => ({
          releasedProjects: state.releasedProjects.map((p) =>
            p.id === projectId ? { ...p, juryCommentary: commentary } : p
          ),
          lastReleasedProject:
            state.lastReleasedProject?.id === projectId
              ? { ...state.lastReleasedProject, juryCommentary: commentary }
              : state.lastReleasedProject,
        }));
      },

      claimReferralReward: (type, amount = 15_000_000) => {
        const prevCash = get().cash;
        const isEn = get().uiLanguage === 'en';
        if (type === 'star_lock') {
          set((state) => ({
            starForgeLocksOpened: Math.min(
              STAR_FORGE_REQUIRED_LOCKS,
              (state.starForgeLocksOpened || 0) + 1
            ),
            activeToast: {
              id: `ref_lock_${Date.now()}`,
              message: isEn
                ? 'Referral reward unlocked! 1 free golden lock opened in the Star Forge ⭐'
                : 'تم تفعيل مكافأة الدعوة! فُتح قفل مجاني في غرفة صناعة النجوم ⭐',
              type: 'success',
            },
          }));
          return;
        }

        const bonus = Math.max(1_000_000, Math.min(25_000_000, Math.round(amount)));
        set((state) => {
          const nextCash = state.cash + bonus;
          const nextMarketVal = calculateStudioMarketValue({
            cash: nextCash,
            reputation: state.reputation,
            releasedProjects: state.releasedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });
          return {
            cash: nextCash,
            marketValue: nextMarketVal,
            activeToast: {
              id: `ref_cash_${Date.now()}`,
              message: isEn
                ? `Referral Bonus: +${formatMoney(bonus)} ${getCurrencyLabel(state.worldMarket, 'en')} added to your treasury!`
                : `مكافأة الدعوة: +${formatMoney(bonus)} ${getCurrencyLabel(state.worldMarket, 'ar')} أُضيفت لخزينة الاستوديو!`,
              type: 'success',
            },
          };
        });
        const afterCash = get().cash;
        if (afterCash !== prevCash) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'VIP_PACKAGE_TOPUP',
            amountDelta: afterCash - prevCash,
            previousCash: prevCash,
            expectedNewCash: afterCash,
            itemLabel: 'مكافأة دعوة صديق (Neelyo Referral)',
          });
        }
      },

      hydrateCloudState: (snapshot) => {
        if (!snapshot || typeof snapshot !== 'object') return;
        const savedLocalLang = readSavedUiLanguage();
        set((state) => {
          const cloudDay = Number(snapshot.gameDay || 0);
          const cloudCreated = Boolean(snapshot.studioCreated);
          // Only overwrite if local hasn't started yet OR cloud save is strictly ahead
          if (state.studioCreated && cloudDay <= state.gameDay) {
            return state;
          }
          if (!cloudCreated) return state;
          const merged = {
            ...state,
            ...(snapshot as Partial<NeelyoGameState>),
          };
          // Never let a cloud snapshot revert the player's explicitly chosen local language
          if (savedLocalLang) {
            merged.uiLanguage = savedLocalLang;
            merged.hasManuallySelectedLanguage = true;
          } else if (state.hasManuallySelectedLanguage) {
            merged.uiLanguage = state.uiLanguage;
            merged.hasManuallySelectedLanguage = true;
          }
          return merged;
        });
      },

      advanceReleaseTrackingDay: (newsItem, playerMomentum = 1.0, rivalMomentum = 1.0) => {
        const prevCash = get().cash;
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
        });
        const afterCash = get().cash;
        if (afterCash !== prevCash) {
          enqueueServerLedgerSync(get, set, {
            transactionType: 'PROJECT_BOX_OFFICE_REVENUE',
            amountDelta: afterCash - prevCash,
            previousCash: prevCash,
            expectedNewCash: afterCash,
            itemLabel: `تحديث إيرادات شباك التذاكر: ${get().lastReleasedProject?.title || 'العمل'}`,
          });
        }
      },

      triggerElectronicTrollsCampaign: (projectId) => {
        const TROLLS_CAMPAIGN_COST = 2_000_000;
        const state = get();
        const targetProj = state.releasedProjects.find((p) => p.id === projectId);
        if (!targetProj || targetProj.trollsCampaigned) return;

        const isEn = state.uiLanguage === 'en';
        const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
        if (state.cash < TROLLS_CAMPAIGN_COST) {
          state.showToast(
            isEn
              ? 'Not enough cash to launch the viral trend campaign!'
              : 'السيولة لا تكفي لإطلاق حملة التريند الإلكتروني!',
            'warning',
            isEn
              ? `You need ${formatMoney(TROLLS_CAMPAIGN_COST)} ${curLabel} in treasury to fund this campaign.`
              : `تحتاج إلى ${formatMoney(TROLLS_CAMPAIGN_COST)} ${curLabel} من الخزينة لتنفيذ الحملة.`
          );
          return;
        }

        const bonusRev = Math.round(targetProj.totalGrossRevenue * 0.15);
        const boostedTargetRev = Math.round(
          (targetProj.targetGrossRevenue || targetProj.totalGrossRevenue) * 1.15
        );
        const nextCash = state.cash - TROLLS_CAMPAIGN_COST + bonusRev;

        const updatedProjects = state.releasedProjects.map((p) => {
          if (p.id !== projectId || p.trollsCampaigned) return p;
          return {
            ...p,
            audienceScore: Number(Math.min(9.5, p.audienceScore + 0.9).toFixed(1)),
            totalGrossRevenue: p.totalGrossRevenue + bonusRev,
            targetGrossRevenue: boostedTargetRev,
            netProfit: p.netProfit + bonusRev - TROLLS_CAMPAIGN_COST,
            trollsCampaigned: true,
            viralTrendLabel: isEn
              ? '#1 Trending after a massive viral push!'
              : 'تريند رقم #1 بعد حملة ترويجية واسعة!',
          };
        });
        const updatedLast =
          state.lastReleasedProject?.id === projectId
            ? updatedProjects.find((p) => p.id === projectId) || state.lastReleasedProject
            : state.lastReleasedProject;

        const nextMv = calculateStudioMarketValue({
          cash: nextCash,
          reputation: state.reputation,
          releasedProjects: updatedProjects,
          marketValueModifier: state.marketValueModifier || 0,
        });

        set({
          releasedProjects: updatedProjects,
          lastReleasedProject: updatedLast,
          cash: nextCash,
          marketValue: nextMv,
        });

        enqueueServerLedgerSync(get, set, {
          transactionType: 'PROJECT_BOX_OFFICE_REVENUE',
          amountDelta: bonusRev - TROLLS_CAMPAIGN_COST,
          previousCash: state.cash,
          expectedNewCash: nextCash,
          itemId: projectId,
          itemLabel: isEn
            ? `Viral Push Returns: ${targetProj.title}`
            : `عوائد حملة التريند لـ ${targetProj.title}`,
        });

        get().showToast(
          isEn
            ? `Viral social push launched for "${targetProj.title}" (-2M cost · +${formatMoney(bonusRev)} ${curLabel} gross)`
            : `تم إطلاق حملة التريند لـ «${targetProj.title}» (-2M تكلفة · +${formatMoney(bonusRev)} ${curLabel} عوائد)`,
          'success'
        );
      },

      triggerFestivalJuryPR: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            juryBribed: true,
          },
        })),

      recordFestivalAwards: (festivalName, awards, winningActorIds) =>
        set((state) => {
          const isEn = state.uiLanguage === 'en';
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
                eventText: isEn
                  ? `At ${localizeEntityName(festivalName, 'en')}: Studio won ${awards.length} award(s) (${awards.join(', ')}).`
                  : `في ${festivalName}: حصد الاستوديو ${awards.length} جوائز (${awards.join('، ')}).`,
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
          const isEn = state.uiLanguage === 'en';
          const cleanActor: ActorItem = {
            ...actor,
            isAiGenerated: false,
            lastEvolutionNote: undefined,
          };
          const actorNameDisplay = localizeEntityName(cleanActor.name, state.uiLanguage);
          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_star_${cleanActor.id}_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'rising_talent',
            badgeLabel: isEn ? 'New Rising Talent' : 'اكتشاف سينمائي جديد ⭐',
            headline:
              newsHeadline ||
              (isEn
                ? `Rising face ${actorNameDisplay} breaks onto the star roster!`
                : `تألق الوجه السينمائي الجديد «${cleanActor.name}» وانضمامه لبورصة النجوم!`),
            detail:
              newsDetail ||
              (isEn
                ? `Young performer ${actorNameDisplay} (Age ${cleanActor.age}) caught producers' attention with commanding screen presence and is now open for casting offers.`
                : `لفت الفنان الشاب «${cleanActor.name}» (${cleanActor.age} سنة) أنظار صناع السينما والدراما بفضل حضوره القوي، وأصبح متاحاً الآن للتعاقد في سوق الممثلين.`),
            highlightName: actorNameDisplay,
            extraStatBadge: isEn
              ? `OVR ${cleanActor.stats.overall} · Age ${cleanActor.age}`
              : `تقييم ${cleanActor.stats.overall} · العمر ${cleanActor.age} سنة`,
            gameImpactLabel: isEn
              ? `Market Update: ${actorNameDisplay} is now available on the casting market`
              : `تأثير الخبر: انضمام «${cleanActor.name}» رسمياً لسوق الممثلين`,
          };
          return {
            aiGeneratedActors: [cleanActor, ...state.aiGeneratedActors],
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem].slice(-6),
            worldHistory: [
              {
                year: state.currentYear,
                eventText: newsItem.headline,
                category: 'milestone',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [
              isEn
                ? `Rising actor "${actorNameDisplay}" (Age ${cleanActor.age}) debuted on the talent market at ${cleanActor.stats.overall} OVR.`
                : `ظهر الفنان الشاب الجديد "${cleanActor.name}" (${cleanActor.age} سنة) في الساحة الفنية بتقييم ${cleanActor.stats.overall}.`,
              ...(state.aiMemoryLog || []),
            ].slice(0, 25),
          };
        }),

      addAiEmergingStudio: (studio, newsHeadline, newsDetail) =>
        set((state) => {
          if (state.emergingCompetitors.some((s) => s.name === studio.name)) {
            return state;
          }
          const isEn = state.uiLanguage === 'en';
          const enrichedStudio: CompetitorStudio = {
            ...studio,
            ceoName:
              studio.ceoName ||
              (studio as unknown as { ceo?: string }).ceo ||
              (isEn ? 'Film Producer' : 'منتج سينمائي'),
            isEmergingStudio: true,
            foundedYear: state.currentYear,
          };
          const studioDisp = localizeEntityName(enrichedStudio.name, state.uiLanguage);
          const ceoDisp = localizeEntityName(enrichedStudio.ceoName || '', state.uiLanguage);
          const headline =
            newsHeadline ||
            (isEn
              ? `New Market Rival: ${studioDisp} launches under ${ceoDisp}!`
              : `منافس جديد في السوق: تدشين شركة «${enrichedStudio.name}» بقيادة ${enrichedStudio.ceoName}!`);
          const detail =
            newsDetail ||
            (isEn
              ? `${studioDisp} officially entered the industry standings at ${enrichedStudio.market_power}% market power to challenge ${state.studioName}.`
              : `دخلت شركة «${enrichedStudio.name}» رسمياً إلى جدول ترتيب شركات الإنتاج بقوة سوقية ${enrichedStudio.market_power}% لمنافسة «${state.studioName}».`);

          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_studio_${enrichedStudio.id}_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'new_studio',
            badgeLabel: isEn
              ? 'New Production Studio Launches'
              : 'شركة إنتاج جديدة في السوق 🎬',
            headline,
            detail,
            highlightName: studioDisp,
            extraStatBadge: isEn
              ? `Market Power ${enrichedStudio.market_power}%`
              : `قوة سوقية ${enrichedStudio.market_power}%`,
            gameImpactLabel: isEn
              ? `Market Update: ${studioDisp} joins the studio leaderboard`
              : `تأثير الخبر: دخول «${enrichedStudio.name}» رسمياً في جدول ترتيب الشركات`,
          };

          return {
            emergingCompetitors: [...state.emergingCompetitors, enrichedStudio],
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem].slice(-6),
            worldHistory: [
              {
                year: state.currentYear,
                eventText: headline,
                category: 'milestone',
              },
              ...state.worldHistory,
            ],
            aiMemoryLog: [
              isEn
                ? `A rival studio "${studioDisp}" launched under CEO ${ceoDisp}.`
                : `تأسست شركة إنتاج منافسة جديدة باسم "${enrichedStudio.name}" بقيادة ${enrichedStudio.ceoName}.`,
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
          const isEn = state.uiLanguage === 'en';
          const mvDelta = event.marketValueDelta || 0;
          const cashDelta = 0;
          const repDelta = event.reputationDelta || 0;
          const hypeDelta = event.hypeDelta || 0;

          const nextCash = state.cash;
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

          const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
          const impactParts: string[] = [];
          if (mvDelta !== 0) {
            impactParts.push(
              isEn
                ? `${mvDelta > 0 ? '+' : ''}${formatMoney(mvDelta)} ${curLabel} Valuation`
                : `${mvDelta > 0 ? '+' : ''}${formatMoney(mvDelta)} ${curLabel} القيمة السوقية`
            );
          }
          if (cashDelta !== 0) {
            impactParts.push(
              isEn
                ? `${cashDelta > 0 ? '+' : ''}${formatMoney(cashDelta)} ${curLabel} Cash`
                : `${cashDelta > 0 ? '+' : ''}${formatMoney(cashDelta)} ${curLabel} السيولة`
            );
          }
          if (repDelta !== 0) {
            impactParts.push(
              isEn
                ? `${repDelta > 0 ? '+' : ''}${repDelta}% Reputation`
                : `${repDelta > 0 ? '+' : ''}${repDelta}% السمعة`
            );
          }
          if (hypeDelta !== 0) {
            impactParts.push(
              isEn
                ? `${hypeDelta > 0 ? '+' : ''}${hypeDelta}% Audience Hype`
                : `${hypeDelta > 0 ? '+' : ''}${hypeDelta}% حماس الجمهور`
            );
          }
          if (event.rivalStudioName && event.rivalNetWorthDelta) {
            impactParts.push(
              `${localizeEntityName(event.rivalStudioName, state.uiLanguage)}: ${event.rivalNetWorthDelta > 0 ? '+' : ''}${formatMoney(event.rivalNetWorthDelta)} ${curLabel}`
            );
          }

          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_ctx_news_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: event.category || 'production_news',
            badgeLabel:
              event.badgeLabel ||
              (isEn ? 'Exclusive Press Report' : 'تغطية صحفية حصرية 📰'),
            headline: event.headline,
            detail: event.detail,
            highlightName: event.rivalStudioName
              ? localizeEntityName(event.rivalStudioName, state.uiLanguage)
              : state.studioName,
            gameImpactLabel:
              impactParts.length > 0
                ? isEn
                  ? `Impact: ${impactParts.join(' · ')}`
                  : `تأثير الخبر: ${impactParts.join(' · ')}`
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
          const isEn = state.uiLanguage === 'en';
          const curLabel = getCurrencyLabel(state.worldMarket, state.uiLanguage);
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
          const rivalStudioDisp = localizeEntityName(topRival.studioName, state.uiLanguage);
          const rivalStarDisp = localizeEntityName(topRival.leadStarName, state.uiLanguage);
          const headline =
            newsHeadline ||
            (isEn
              ? `Box Office Heats Up: ${rivalStudioDisp} launches "${topRival.title}" starring ${rivalStarDisp}!`
              : `اشتعال المنافسة: «${topRival.studioName}» تطلق «${topRival.title}» ببطولة ${topRival.leadStarName}!`);
          const detail =
            newsDetail ||
            (isEn
              ? `${rivalStudioDisp} premiered "${topRival.title}" to a ${topRival.criticScore}/10 critic score and projected ${formatMoney(topRival.boxOfficeRevenue)} ${curLabel} gross.`
              : `طرحت «${topRival.studioName}» عملها الضخم «${topRival.title}» بتقييم نقدي (${topRival.criticScore}/10) وإيرادات متوقعة ${formatMoney(topRival.boxOfficeRevenue)} ${curLabel}.`);

          const newsItem: WorldBreakingNewsModalItem = {
            id: `news_ai_riv_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'rival_project',
            badgeLabel: isEn
              ? 'Box Office & Streaming Rivalry'
              : 'منافسة شباك التذاكر والمنصات 🔥',
            headline,
            detail,
            highlightName: rivalStudioDisp,
            extraStatBadge: isEn
              ? `Score ${topRival.criticScore}/10 · ${formatMoney(topRival.boxOfficeRevenue)} ${curLabel}`
              : `تقييم ${topRival.criticScore}/10 · ${formatMoney(topRival.boxOfficeRevenue)} ${curLabel}`,
            gameImpactLabel: isEn
              ? `Rival Release in Race: "${topRival.title}" starring ${rivalStarDisp}`
              : `عمل منافس في السباق: «${topRival.title}» ببطولة ${topRival.leadStarName}`,
          };

          return {
            yearlyRivalReleases: nextYearlyRivals.slice(0, 18),
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem].slice(-6),
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
        const currentMarket = get().worldMarket || 'egypt';
        const isEn = get().uiLanguage === 'en';
        const profile = getMarketProfile(currentMarket);
        const primaryReg = profile.primaryRegion;
        const defaultStudioEn =
          currentMarket === 'saudi'
            ? 'Diriyah Pictures'
            : currentMarket === 'egypt'
            ? 'Scorpion Pictures'
            : 'Neelyo Studios';
        const defaultCeoEn =
          currentMarket === 'saudi' ? 'Fahad Al-Mansour' : 'Tarek Al-Mansour';
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(PRIMARY_STORAGE_KEY);
            window.localStorage.removeItem(CUSTOM_DB_STORAGE_KEY);
            idbDel(PRIMARY_STORAGE_KEY).catch(() => {});
            idbDel(CUSTOM_DB_STORAGE_KEY).catch(() => {});
          } catch {
            // ignore
          }
        }
        set({
          studioCreated: false,
          hasSelectedMarket: false,
          studioName: isEn ? defaultStudioEn : profile.defaultStudioName,
          ceoName: isEn ? defaultCeoEn : profile.defaultCeoName,
          logo: {
            emblem: 'winged_lion',
            frame: 'royal_shield',
            palette: 'obsidian_gold',
          },
          founderPerk: 'visionary_director',
          currentRegion: primaryReg,
          unlockedRegions: [primaryReg],
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
          onboardingTourStatus: 'pending_choice',
          draft: {
            ...DEFAULT_DRAFT,
            ...getDefaultDistributionForMarket(currentMarket, null),
            title: '',
            scriptSynopsis: '',
            selectedDistributionMarkets: [primaryReg],
          },
          releasedProjects: [],
          lastReleasedProject: null,
          yearlyRivalReleases: [],
          worldHistory: [
            {
              year: 2026,
              eventText: isEn
                ? 'Founded a brand-new production studio with bold ambitions to dominate the film & television industry.'
                : 'تأسيس استوديو جديد بطموحات ضخمة للسيطرة على صناعة السينما والدراما.',
              category: 'milestone',
            },
          ],
          aiMemoryLog: [
            isEn
              ? 'The cinema season opens amid fierce box-office rivalry among the industry’s top production studios.'
              : 'انطلاق الموسم السينمائي وسط منافسة شرسة بين كبرى شركات الإنتاج على شباك التذاكر.',
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
          talentRejectionCounts: {},
          syndicateMediationUnlocked: {},
          bankruptcyDeadlineDay: null,
          bankruptcyDebtAmount: 0,
          isBankruptLiquidated: false,
          lastEmergencyBailoutDay: null,
          ownedStudioAssets: [],
          starForgeLocksOpened: 0,
        });
        enqueueServerLedgerSync(get, set, {
          transactionType: 'INIT_STUDIO',
          amountDelta: 0,
          previousCash: 75_000_000,
          expectedNewCash: 75_000_000,
          itemLabel: isEn ? 'Full Studio Reset' : 'إعادة التأسيس الكاملة للاستوديو',
        });
      },

      setSupabaseUserEmail: (email) => set({ supabaseUserEmail: email }),
      setGroqApiKeyClient: (key) => set({ groqApiKeyClient: key.trim() }),
      setPreferredGroqModel: (model) => set({ preferredGroqModel: model }),
    }),
    {
      name: PRIMARY_STORAGE_KEY,
      storage: createJSONStorage(() => hybridStorage),
      // Store customDbPatch ONLY in CUSTOM_DB_STORAGE_KEY (avoid doubling localStorage quota)
      partialize: (state) => {
        const { customDbPatch: _omittedCustomPatch, ...persisted } = state;
        void _omittedCustomPatch;
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isChildModalOpen = false;
          state.isPrWarRoomOpen = false;
          if (!state.worldMarket) state.worldMarket = 'egypt';
          const savedLocalLang = readSavedUiLanguage();
          if (savedLocalLang) {
            state.uiLanguage = savedLocalLang;
            state.hasManuallySelectedLanguage = true;
          } else if (!state.uiLanguage) {
            state.uiLanguage = 'en';
          } else if (state.hasManuallySelectedLanguage) {
            writeSavedUiLanguage(state.uiLanguage);
          }
          if (state.studioCreated && !state.hasSelectedMarket) {
            state.hasSelectedMarket = true;
          }
          if ((state.starForgeLocksOpened || 0) > STAR_FORGE_REQUIRED_LOCKS) {
            state.starForgeLocksOpened = STAR_FORGE_REQUIRED_LOCKS;
          }

          // Hydrate customDbPatch from its dedicated storage slot (single source of truth)
          if (typeof window !== 'undefined') {
            try {
              const rawPatch = window.localStorage.getItem(CUSTOM_DB_STORAGE_KEY);
              if (rawPatch) {
                const parsed = JSON.parse(rawPatch) as Partial<MasterDatabase>;
                const patchMarket = parsed?.meta?.targetMarket;
                if (!patchMarket || patchMarket === state.worldMarket) {
                  state.customDbPatch = parsed;
                }
              } else if (state.customDbPatch) {
                // One-time migration for players upgrading from versions that stored customDbPatch inline
                window.localStorage.setItem(
                  CUSTOM_DB_STORAGE_KEY,
                  JSON.stringify(state.customDbPatch)
                );
                idbSet(
                  CUSTOM_DB_STORAGE_KEY,
                  JSON.stringify(state.customDbPatch)
                ).catch(() => {});
              } else {
                // Async IndexedDB fallback if localStorage lacked the mod key
                idbGet<string>(CUSTOM_DB_STORAGE_KEY)
                  .then((idbPatch) => {
                    if (!idbPatch) return;
                    const parsed = JSON.parse(idbPatch) as Partial<MasterDatabase>;
                    const activeMarket = useGameStore.getState().worldMarket || 'egypt';
                    const patchMarket = parsed?.meta?.targetMarket;
                    if (!patchMarket || patchMarket === activeMarket) {
                      useGameStore.setState({ customDbPatch: parsed });
                    }
                  })
                  .catch(() => {});
              }
            } catch {
              // ignore malformed patch
            }
          }

          // Ensure draft platform/TV IDs belong to the active market (e.g. Saudi vs Egypt)
          if (state.draft) {
            const resolvedDb = getResolvedDatabase(state.customDbPatch, state.worldMarket);
            const defaults = getDefaultDistributionForMarket(
              state.worldMarket,
              state.customDbPatch
            );
            const validIds = new Set(resolvedDb.streaming_platforms.map((p) => p.id));
            if (
              !state.draft.selectedPlatformId ||
              !validIds.has(state.draft.selectedPlatformId)
            ) {
              state.draft.selectedPlatformId = defaults.selectedPlatformId;
            }
            if (
              !state.draft.selectedTvChannelId ||
              !validIds.has(state.draft.selectedTvChannelId)
            ) {
              state.draft.selectedTvChannelId = defaults.selectedTvChannelId;
            }
          }

          // Ensure Star Forge re-locks cleanly if a custom star was already minted in an earlier version
          if (
            (state.starForgeLocksOpened || 0) >= STAR_FORGE_REQUIRED_LOCKS &&
            Array.isArray(state.aiGeneratedActors) &&
            state.aiGeneratedActors.some((a) => a.isCustomStar)
          ) {
            state.starForgeLocksOpened = 0;
          }
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
