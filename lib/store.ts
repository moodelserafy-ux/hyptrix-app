import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import {
  MarketRegion,
  FounderPerk,
  ProjectFormat,
  SeriesEpisodes,
  SeriesSeason,
  FilmReleaseSeason,
  AgeRating,
  ProductionBudgetAllocation,
  RivalRelease,
  formatMoney,
} from './game-engine';
import {
  GenreId,
  MasterDatabase,
  CUSTOM_DB_STORAGE_KEY,
  ActorItem,
  CompetitorStudio,
  getResolvedDatabase,
} from './db-resolver';

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
  director: 1,
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
  customRoleName?: string; // Free-text role written by the player!
  offeredSalary: number;
  backendPoints: number;
  vipDinner: boolean;
  submittedDay: number;
  responseDueDay: number; // takes 2-4 game days
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
  chosenOption?: 'A' | 'B' | 'VIP_BAILOUT';
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
  firstWeekRevenue: number;
  boxOfficeRevenue: number;
  streamingRevenue: number;
  totalGrossRevenue: number;
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
  writerIds: string[];
  dopId: string | null;
  composerId: string | null;
  vfxId: string | null;
  leadActorIds: string[];
  antagonistId: string | null;
  supportingActorIds: string[];
  cameoActorIds: string[];
  castCustomRoles: Record<string, string>; // actorId -> custom role description written by player
  negotiatedDiscounts: Record<string, { backendPoints: number; vipDinner: boolean }>;
  talentOffers: Record<string, TalentOfferRecord>;
  budgetAllocation: ProductionBudgetAllocation;
  marketingBudget: number;
  screensCount: number;
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
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'qwen/qwen3.8-27b';

export const GROQ_MODEL_OPTIONS: { id: GroqModelId; label: string; provider: string }[] = [
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
  const zeroBased = Math.max(0, gameDay - 1);
  const dayOfMonth = (zeroBased % 30) + 1;
  const monthIdx = Math.floor((zeroBased / 30) % 12);
  return `${dayOfMonth} ${months[monthIdx]} ${year}`;
}

export function getSignedIdsForSlot(draft: ActiveDraftProject, slot: OfferRoleSlot): string[] {
  if (slot === 'director') return draft.directorId ? [draft.directorId] : [];
  if (slot === 'cinematographer') return draft.dopId ? [draft.dopId] : [];
  if (slot === 'composer') return draft.composerId ? [draft.composerId] : [];
  if (slot === 'editor_vfx') return draft.vfxId ? [draft.vfxId] : [];
  if (slot === 'lead') return draft.leadActorIds;
  if (slot === 'antagonist') return draft.antagonistId ? [draft.antagonistId] : [];
  if (slot === 'supporting') return draft.supportingActorIds;
  if (slot === 'cameo') return draft.cameoActorIds;
  return [];
}

/**
 * Computes the live actor roster with age progression (currentYear - 2026),
 * stat evolution / drop after hit or flop films, AI-generated rising stars,
 * rival studio contracts, and retirement/death statuses.
 */
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
    next.directorId = id;
  } else if (slot === 'cinematographer') {
    next.dopId = id;
  } else if (slot === 'composer') {
    next.composerId = id;
  } else if (slot === 'editor_vfx') {
    next.vfxId = id;
  } else {
    // Unified Actor Casting: place first 2 actors in leadActorIds, 3rd in antagonistId, and rest in supportingActorIds
    const alreadyInCast =
      next.leadActorIds.includes(id) ||
      next.antagonistId === id ||
      next.supportingActorIds.includes(id) ||
      next.cameoActorIds.includes(id);

    if (!alreadyInCast) {
      if (slot === 'antagonist' && !next.antagonistId) {
        next.antagonistId = id;
      } else if (slot === 'cameo' && next.cameoActorIds.length < 2) {
        next.cameoActorIds = [...next.cameoActorIds, id];
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

// Pool of Fictional Emerging Studios that can enter the market over time
const FICTIONAL_EMERGING_STUDIOS_POOL: CompetitorStudio[] = [
  {
    id: 'comp_fictional_1',
    name: 'كليوباترا بيكتشرز للإنتاج',
    ceoName: 'طارق الدمنهوري',
    logo_url: '',
    market_power: 87,
    preferred_genres: ['action', 'heist', 'crime_mystery'],
    isEmergingStudio: true,
  },
  {
    id: 'comp_fictional_2',
    name: 'سفنكس ميديا فينتشرز',
    ceoName: 'نهال الألفي',
    logo_url: '',
    market_power: 84,
    preferred_genres: ['psychological_horror', 'sci_fi', 'fantasy'],
    isEmergingStudio: true,
  },
  {
    id: 'comp_fictional_3',
    name: 'أورينت ستوديوز القاهرة',
    ceoName: 'مراد الششتاوي',
    logo_url: '',
    market_power: 90,
    preferred_genres: ['popular_drama', 'historical', 'action'],
    isEmergingStudio: true,
  },
  {
    id: 'comp_fictional_4',
    name: 'نايل كراون للسينما والدراما',
    ceoName: 'ياسين الببلاوي',
    logo_url: '',
    market_power: 86,
    preferred_genres: ['comedy', 'light_comedy', 'romance'],
    isEmergingStudio: true,
  },
  {
    id: 'comp_fictional_5',
    name: 'إمباير فينيكس للإنتاج الفني',
    ceoName: 'حازم الفرماوي',
    logo_url: '',
    market_power: 91,
    preferred_genres: ['superhero', 'action', 'sci_fi'],
    isEmergingStudio: true,
  },
];

// Pool of AI-invented sudden rising actors
const DYNAMIC_AI_ACTORS_POOL: {
  name: string;
  gender: 'male' | 'female';
  archetype: string;
  primaryGenre: GenreId;
  secondaryGenre: GenreId;
}[] = [
  { name: 'تيم الكرداني', gender: 'male', archetype: 'اكتشاف سينمائي مفاجئ في الأكشن', primaryGenre: 'action', secondaryGenre: 'crime_mystery' },
  { name: 'نورين الشربيني', gender: 'female', archetype: 'نجمة شابة خطفت الأنظار في الدراما', primaryGenre: 'popular_drama', secondaryGenre: 'romance' },
  { name: 'مازن السيوطي', gender: 'male', archetype: 'عبقري التشويق النفسي الصاعد', primaryGenre: 'psychological_horror', secondaryGenre: 'crime_mystery' },
  { name: 'جيداء المنصوري', gender: 'female', archetype: 'وجه سينمائي جديد في الكوميديا', primaryGenre: 'light_comedy', secondaryGenre: 'comedy' },
  { name: 'آسر الدمرداش', gender: 'male', archetype: 'بطل واعد في أفلام السطو والذكاء', primaryGenre: 'heist', secondaryGenre: 'sci_fi' },
  { name: 'عهد الغمراوي', gender: 'female', archetype: 'موهبة استثنائية في التاريخي والسيرة', primaryGenre: 'historical', secondaryGenre: 'biography' },
  { name: 'سادن الفيومي', gender: 'male', archetype: 'نجم صاعد بقوة في دراما الحارة', primaryGenre: 'popular_drama', secondaryGenre: 'action' },
  { name: 'تالين الأرنؤوطي', gender: 'female', archetype: 'بطلة الفانتازيا والأساطير الجديدة', primaryGenre: 'fantasy', secondaryGenre: 'supernatural_horror' },
];

export interface HyptrixGameState {
  studioCreated: boolean;
  studioName: string;
  ceoName: string;
  logo: StudioLogoConfig;
  founderPerk: FounderPerk;
  currentRegion: MarketRegion;
  unlockedRegions: MarketRegion[];
  cash: number;
  reputation: number;
  currentYear: number;
  gameDay: number;
  vipCoins: number;
  vipPassExpiresAt: number | null;
  vipAdProgress: number;
  activeScreen: ActiveStageScreen;
  draft: ActiveDraftProject;
  releasedProjects: ReleasedProjectRecord[];
  lastReleasedProject: ReleasedProjectRecord | null;
  worldHistory: WorldHistoryEntry[];
  actorAwardCounts: Record<string, number>;
  actorDynamicState: Record<string, ActorDynamicEvolutionState>;
  aiGeneratedActors: ActorItem[];
  emergingCompetitors: CompetitorStudio[];
  competitorNetWorthDelta: Record<string, { netWorthDelta: number; releasesDelta: number; awardsDelta: number }>;
  breakingNewsQueue: WorldBreakingNewsModalItem[];
  festivalModalQueue: AutomaticFestivalCeremonyItem[];
  customDbPatch: Partial<MasterDatabase> | null;
  customDbUrl: string;
  supabaseUserEmail: string | null;
  groqApiKeyClient: string;
  preferredGroqModel: GroqModelId;

  // Actions
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
  submitTalentOffer: (offer: TalentOfferRecord) => void;
  confirmMultiAcceptedChoice: (slot: OfferRoleSlot, chosenTalentIds: string[]) => void;
  removeTalentFromDraft: (talentId: string) => void;
  updateDraft: (partial: Partial<ActiveDraftProject>) => void;
  resetDraftForNewProject: () => void;
  toggleVipDinnerForTalent: (talentId: string) => void;
  setBackendPointsForTalent: (talentId: string, points: number) => void;
  watchVipAdStep: () => void;
  applyEmergencyGulfBailout: (crisisId: string) => void;
  resolveCrisisOption: (crisisId: string, choice: 'A' | 'B') => void;
  completeProjectRelease: (record: ReleasedProjectRecord) => void;
  advanceReleaseTrackingDay: (newsItem?: DailyAiNewsItem) => void;
  triggerElectronicTrollsCampaign: (projectId: string) => void;
  triggerFestivalJuryPR: () => void;
  recordFestivalAwards: (festivalName: string, awards: string[], winningActorIds: string[]) => void;
  pushBreakingNewsModal: (news: WorldBreakingNewsModalItem) => void;
  dismissBreakingNewsModal: () => void;
  pushFestivalCeremonyModal: (ceremony: AutomaticFestivalCeremonyItem) => void;
  dismissFestivalCeremonyModal: () => void;
  addAiDiscoveredActor: (actor: ActorItem, newsHeadline?: string, newsDetail?: string) => void;
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
  writerIds: ['wri_1'],
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
    (set) => ({
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
      cash: 185_000_000,
      reputation: 65,
      currentYear: 2026,
      gameDay: 1,
      vipCoins: 250,
      vipPassExpiresAt: null,
      vipAdProgress: 0,
      activeScreen: 'STUDIO_CREATION',
      draft: { ...DEFAULT_DRAFT },
      releasedProjects: [],
      lastReleasedProject: null,
      worldHistory: [
        {
          year: 2026,
          eventText: 'تأسيس استوديو جديد بطموحات ضخمة للسيطرة على صناعة السينما والدراما.',
          category: 'milestone',
        },
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
      supabaseUserEmail: null,
      groqApiKeyClient: '',
      preferredGroqModel: 'openai/gpt-oss-120b',

      initializeStudio: ({ studioName, ceoName, logo, founderPerk, region }) =>
        set({
          studioCreated: true,
          studioName: studioName.trim() || 'العقرب ستوديوز',
          ceoName: ceoName.trim() || 'المدير التنفيذي',
          logo,
          founderPerk,
          currentRegion: region,
          activeScreen: 'STUDIO_HUB',
          worldHistory: [
            {
              year: 2026,
              eventText: `تأسيس شركة "${studioName.trim() || 'العقرب ستوديوز'}" بقيادة ${ceoName.trim() || 'المدير التنفيذي'} في السوق المصري.`,
              category: 'milestone',
            },
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

      advanceGameDay: (days = 1) =>
        set((state) => {
          const newGameDay = state.gameDay + days;
          const prevYearOffset = Math.floor((state.gameDay - 1) / 360);
          const nextYearOffset = Math.floor((newGameDay - 1) / 360);
          const yearsAdded = Math.max(0, nextYearOffset - prevYearOffset);
          const newYear = state.currentYear + yearsAdded;

          let updatedDraft = { ...state.draft };
          const updatedOffers = { ...updatedDraft.talentOffers };
          const newNewsItems: WorldBreakingNewsModalItem[] = [];
          const nextActorDynamic = { ...state.actorDynamicState };
          let nextAiActors = [...state.aiGeneratedActors];
          let nextEmergingStudios = [...state.emergingCompetitors];
          const nextHistory = [...state.worldHistory];

          // 1. Evaluate pending talent offers that have reached their responseDueDay
          for (const key of Object.keys(updatedOffers)) {
            const offer = updatedOffers[key];
            if (offer.status === 'pending' && newGameDay >= offer.responseDueDay) {
              if (!offer.willAccept) {
                updatedOffers[key] = { ...offer, status: 'rejected' };
                newNewsItems.push({
                  id: `news_offer_rej_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'رد رسمي من وكيل الفنان',
                  headline: `${offer.talentName} يعتذر عن دور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}»`,
                  detail: offer.aiReason,
                  highlightName: offer.talentName,
                });
              } else {
                const signedOffer: TalentOfferRecord = {
                  ...offer,
                  status: 'accepted',
                };
                updatedOffers[key] = signedOffer;
                updatedDraft = applyAcceptedOfferToDraft(updatedDraft, signedOffer);
                newNewsItems.push({
                  id: `news_offer_acc_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'توقيع عقد رسمي ✓',
                  headline: `${offer.talentName} يوقّع رسمياً لدور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}»!`,
                  detail: offer.aiReason,
                  highlightName: offer.talentName,
                  extraStatBadge: `الأجر المتفق عليه: ${formatMoney(offer.offeredSalary)} ج.م`,
                });
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

          // 3. Dynamic World Events as days pass (every 6 days, trigger an authentic cinema world event)
          const db = getResolvedDatabase(state.customDbPatch);
          const allStudios = [...db.competitor_studios, ...nextEmergingStudios];
          const liveActors = getLiveActorsWithEvolution({
            baseActors: db.actors,
            aiGeneratedActors: nextAiActors,
            actorDynamicState: nextActorDynamic,
            currentYear: newYear,
            gameDay: newGameDay,
          });

          if (newGameDay > 2 && newGameDay % 6 === 0 && state.breakingNewsQueue.length === 0) {
            const eventRoll = (newGameDay / 6) % 5;

            if (eventRoll === 1 && nextAiActors.length < DYNAMIC_AI_ACTORS_POOL.length) {
              // Event A: Sudden AI-invented Rising Talent emerges!
              const template = DYNAMIC_AI_ACTORS_POOL[nextAiActors.length];
              const newId = `act_ai_sudden_${newGameDay}`;
              const newOverall = 76 + (newGameDay % 8);
              const newActor: ActorItem = {
                id: newId,
                name: template.name,
                gender: template.gender,
                age: 20 + (newGameDay % 6),
                tier: newOverall >= 82 ? 'A' : 'B',
                image_url: '',
                base_salary: 4_500_000 + (newGameDay % 5) * 500_000,
                archetype: `موهبة صاعدة · ${template.archetype}`,
                unlockDay: 1,
                isRisingDiscovery: true,
                isAiGenerated: true,
                status: 'active',
                stats: {
                  overall: newOverall,
                  acting: newOverall + 4,
                  charisma: newOverall + 3,
                  box_office_pull: newOverall - 2,
                  ego: 45,
                },
                genre_mastery: {
                  [template.primaryGenre]: 92,
                  [template.secondaryGenre]: 87,
                },
              };
              nextAiActors = [newActor, ...nextAiActors];
              const headline = `ظهور موهبة صاعدة جديدة: «${newActor.name}» يخطف أنظار المخرجين!`;
              const detail = `أشادت لجان النقاد بالموهبة الشابة «${newActor.name}» (${newActor.age} سنة - ${template.archetype}) بعد تألقه اللافت، وأصبح متاحاً الآن للتعاقد في سوق الممثلين بتقييم ${newOverall} وأجر ${formatMoney(newActor.base_salary)} ج.م.`;
              newNewsItems.push({
                id: `world_rising_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'rising_talent',
                badgeLabel: 'اكتشاف موهبة صاعدة جديدة ✨',
                headline,
                detail,
                highlightName: newActor.name,
                extraStatBadge: `تقييم ${newOverall} · العمر ${newActor.age} سنة`,
              });
              nextHistory.unshift({
                year: newYear,
                eventText: headline,
                category: 'milestone',
              });
            } else if (
              eventRoll === 2 &&
              nextEmergingStudios.length < FICTIONAL_EMERGING_STUDIOS_POOL.length
            ) {
              // Event B: New Fictional Studio enters the market to compete!
              const newStudio = FICTIONAL_EMERGING_STUDIOS_POOL[nextEmergingStudios.length];
              nextEmergingStudios = [...nextEmergingStudios, { ...newStudio, foundedYear: newYear }];
              const headline = `تأسيس شركة إنتاج منافسة جديدة: «${newStudio.name}» تدخل السوق بقوة!`;
              const detail = `أعلن المنتج ${newStudio.ceoName} عن إطلاق شركة «${newStudio.name}» برأس مال ضخم لمنافسة كبار المنتجين على صدارة شباك التذاكر واستقطاب نجوم الصف الأول.`;
              newNewsItems.push({
                id: `world_studio_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'new_studio',
                badgeLabel: 'منافس جديد في السوق 🎬',
                headline,
                detail,
                highlightName: newStudio.name,
                extraStatBadge: `قوة سوقية ${newStudio.market_power}%`,
              });
              nextHistory.unshift({
                year: newYear,
                eventText: headline,
                category: 'milestone',
              });
            } else if (eventRoll === 3) {
              // Event C: Rival Studio signs an actor for their upcoming film/series (or delays a film)
              const studio = allStudios[newGameDay % allStudios.length];
              const availableStars = liveActors.filter(
                (a) =>
                  a.status === 'active' &&
                  !updatedDraft.leadActorIds.includes(a.id) &&
                  updatedDraft.antagonistId !== a.id &&
                  !updatedDraft.supportingActorIds.includes(a.id) &&
                  (a.unlockDay ?? 1) <= newGameDay
              );
              const targetActor = availableStars[(newGameDay * 3) % Math.max(1, availableStars.length)];
              if (studio && targetActor) {
                const isDelayNews = newGameDay % 12 === 0;
                if (isDelayNews) {
                  const headline = `تأجيل طرح الفيلم الجديد لشركة «${studio.name}» بطولة ${targetActor.name}`;
                  const detail = `قررت شركة «${studio.name}» تأجيل موعد عرض عملها الضخم الذي يقوم ببطولته ${targetActor.name} لاستكمال أعمال المونتاج وتفادي الزحام في شباك التذاكر.`;
                  newNewsItems.push({
                    id: `world_delay_${newGameDay}`,
                    day: newGameDay,
                    year: newYear,
                    category: 'rival_project',
                    badgeLabel: 'أخبار الشركات المنافسة',
                    headline,
                    detail,
                    highlightName: studio.name,
                  });
                } else {
                  const prevDyn = nextActorDynamic[targetActor.id] || {
                    overallDelta: 0,
                    actingDelta: 0,
                    charismaDelta: 0,
                    pullDelta: 0,
                    salaryMultiplier: 1,
                  };
                  nextActorDynamic[targetActor.id] = {
                    ...prevDyn,
                    busyUntilDay: newGameDay + 4,
                    busyWithStudio: studio.name,
                    overallDelta: prevDyn.overallDelta + 1,
                    pullDelta: prevDyn.pullDelta + 1,
                    salaryMultiplier: Number((prevDyn.salaryMultiplier * 1.05).toFixed(2)),
                    lastEvolutionNote: `تألق في عمل مع ${studio.name} (+1 تقييم)`,
                  };
                  const headline = `شركة «${studio.name}» تتعاقد مع ${targetActor.name} لبطولة عملها الجديد!`;
                  const detail = `وقّع النجم ${targetActor.name} (${targetActor.age} سنة) عقد بطولة عمل جديد مع «${studio.name}»، مما رفع أسهمه في السوق السينمائي وزاد من تقييمه الجماهيري.`;
                  newNewsItems.push({
                    id: `world_rival_sign_${newGameDay}`,
                    day: newGameDay,
                    year: newYear,
                    category: 'rival_project',
                    badgeLabel: 'تحركات الشركات المنافسة 🔥',
                    headline,
                    detail,
                    highlightName: targetActor.name,
                    extraStatBadge: `ارتفع تقييم البطاقة +1`,
                  });
                }
              }
            } else if (eventRoll === 4) {
              // Event D: Veteran Actor Retirement or Passing Away (for older actors age >= 52)
              const veteranActors = liveActors.filter(
                (a) =>
                  a.status === 'active' &&
                  a.age >= 50 &&
                  !updatedDraft.leadActorIds.includes(a.id) &&
                  updatedDraft.antagonistId !== a.id &&
                  !updatedDraft.supportingActorIds.includes(a.id)
              );
              if (veteranActors.length > 0) {
                const chosenVet = veteranActors[newGameDay % veteranActors.length];
                const isDeceased = chosenVet.age >= 57 && newGameDay % 2 === 0;
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
                  ? `رحيل الفنان القدير «${chosenVet.name}» عن عمر يناهز ${chosenVet.age} عاماً`
                  : `الفنان القدير «${chosenVet.name}» (${chosenVet.age} سنة) يعلن اعتزاله التمثيل نهائياً`;
                const detail = isDeceased
                  ? `خيّم الحزن على الوسط الفني بعد إعلان وفاة الفنان القدير «${chosenVet.name}» تاركاً إرثاً سينمائياً ودرامياً خالداً في ذاكرة الجمهور والنقاد.`
                  : `أعلن الفنان «${chosenVet.name}» اكتفاءه بمسيرته الفنية الطويلة واعتزاله العمل السينمائي والدرامي وسط تكريم واسع من نقابة السينمائيين.`;

                newNewsItems.push({
                  id: `world_vet_${chosenVet.id}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: isDeceased ? 'actor_deceased' : 'actor_retired',
                  badgeLabel: isDeceased ? 'نبأ حزين في الوسط الفني 🕊️' : 'خبر اعتزال فني',
                  headline,
                  detail,
                  highlightName: chosenVet.name,
                  extraStatBadge: `العمر: ${chosenVet.age} سنة`,
                });
                nextHistory.unshift({
                  year: newYear,
                  eventText: headline,
                  category: 'milestone',
                });
              }
            }
          }

          if (yearsAdded > 0) {
            nextHistory.unshift({
              year: newYear,
              eventText: `بداية عام سينمائي جديد (${newYear}) وتقدم أعمار جميع النجوم في السوق بعام إضافي.`,
              category: 'milestone',
            });
          }

          return {
            gameDay: newGameDay,
            currentYear: newYear,
            draft: updatedDraft,
            actorDynamicState: nextActorDynamic,
            aiGeneratedActors: nextAiActors,
            emergingCompetitors: nextEmergingStudios,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            worldHistory: nextHistory,
          };
        }),

      submitTalentOffer: (offer) =>
        set((state) => ({
          draft: {
            ...state.draft,
            talentOffers: {
              ...state.draft.talentOffers,
              [offer.talentId]: offer,
            },
          },
        })),

      confirmMultiAcceptedChoice: (slot, chosenTalentIds) =>
        set((state) => {
          let updatedDraft = { ...state.draft };
          const updatedOffers = { ...updatedDraft.talentOffers };

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
          return {
            draft: {
              ...state.draft,
              directorId: state.draft.directorId === talentId ? null : state.draft.directorId,
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

      resetDraftForNewProject: () =>
        set({
          draft: {
            ...DEFAULT_DRAFT,
            title: '',
            scriptSynopsis: '',
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
          activeScreen: 'PROJECT_SETUP',
        }),

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

      applyEmergencyGulfBailout: (crisisId) =>
        set((state) => ({
          cash: state.cash + 30_000_000,
          draft: {
            ...state.draft,
            hypeScore: Math.min(100, state.draft.hypeScore + 12),
            qualityModifier: state.draft.qualityModifier + 6,
            crises: state.draft.crises.map((c) =>
              c.id === crisisId ? { ...c, resolved: true, chosenOption: 'VIP_BAILOUT' } : c
            ),
          },
        })),

      resolveCrisisOption: (crisisId, choice) =>
        set((state) => {
          const crisis = state.draft.crises.find((c) => c.id === crisisId);
          if (!crisis || crisis.resolved) return state;
          const opt = choice === 'A' ? crisis.optionA : crisis.optionB;
          return {
            cash: state.cash - opt.cost,
            draft: {
              ...state.draft,
              hypeScore: Math.max(10, Math.min(100, state.draft.hypeScore + opt.hypeDelta)),
              qualityModifier: state.draft.qualityModifier + opt.qualityDelta,
              crises: state.draft.crises.map((c) =>
                c.id === crisisId ? { ...c, resolved: true, chosenOption: choice } : c
              ),
            },
          };
        }),

      completeProjectRelease: (record) =>
        set((state) => {
          const newCash = state.cash + record.netProfit;
          const unlocked = [...state.unlockedRegions];
          if (newCash >= 220_000_000 && !unlocked.includes('gulf')) unlocked.push('gulf');
          if (newCash >= 450_000_000 && !unlocked.includes('europe')) unlocked.push('europe');
          if (newCash >= 900_000_000 && !unlocked.includes('hollywood')) unlocked.push('hollywood');

          const repDelta =
            record.criticScore >= 7.8
              ? 6
              : record.criticScore >= 6.5
              ? 2
              : record.criticScore < 5.5
              ? -4
              : 0;

          // Actor Card Evolution / Downgrade based on the film/series quality & success!
          const nextActorDynamic = { ...state.actorDynamicState };
          const newNewsItems: WorldBreakingNewsModalItem[] = [];
          const db = getResolvedDatabase(state.customDbPatch);
          const allActors = [...state.aiGeneratedActors, ...db.actors];

          const castIds = record.actorIdsInCast || [
            ...state.draft.leadActorIds,
            ...(state.draft.antagonistId ? [state.draft.antagonistId] : []),
            ...state.draft.supportingActorIds,
          ];

          const isMajorHit = record.criticScore >= 7.4 || record.netProfit >= 25_000_000;
          const isFlop = record.criticScore < 5.6 && record.netProfit < 0;

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
              // Bronze/C or B-tier actors get a massive breakout leap!
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
                  detail: `بفضل السيناريو القوي والنجاح النقدي والجماهيري لـ «${record.title}»، قفزت طاقة بطاقة الممثل «${baseActor.name}» بمقدار (+${boostOvr} نقاط) ليصل إلى تقييم ${newOvr} (فئة ${newTier})، وبدأت شركات الإنتاج المنافسة تتهافت للتعاقد معه بأجر مضاعف!`,
                  highlightName: baseActor.name,
                  extraStatBadge: `التقييم الجديد: ${newOvr} (+${boostOvr}) · فئة ${newTier}`,
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

          // Update competitor studios' net worths based on their actual AI-generated rival releases
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          for (const rival of record.rivalReleases) {
            if (rival.status === 'delayed') continue;
            const prevComp = nextCompDelta[rival.studioName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            nextCompDelta[rival.studioName] = {
              netWorthDelta: prevComp.netWorthDelta + Math.round(rival.boxOfficeRevenue * 0.45),
              releasesDelta: prevComp.releasesDelta + 1,
              awardsDelta: prevComp.awardsDelta + (rival.criticScore >= 8.0 ? 1 : 0),
            };
          }

          return {
            cash: newCash,
            reputation: Math.min(100, Math.max(15, state.reputation + repDelta)),
            unlockedRegions: unlocked,
            releasedProjects: [record, ...state.releasedProjects],
            lastReleasedProject: record,
            actorDynamicState: nextActorDynamic,
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            worldHistory: [
              {
                year: state.currentYear,
                eventText: `طرح ${record.format === 'film' ? 'فيلم' : 'مسلسل'} "${record.title}" بإيرادات ${formatMoney(record.totalGrossRevenue)} ج.م وتقييم نقاد ${record.criticScore}/10.`,
                category: 'release',
              },
              ...state.worldHistory,
            ],
          };
        }),

      advanceReleaseTrackingDay: (newsItem) =>
        set((state) => {
          const current = state.lastReleasedProject;
          if (!current) return state;
          const maxSteps = current.format === 'series' ? current.episodes || 15 : 10;
          const nextDaysTracked = Math.min(maxSteps, (current.daysTracked || 1) + 1);
          const updatedNews = newsItem
            ? [newsItem, ...(current.dailyNews || [])]
            : current.dailyNews || [];

          // Check if we just finished the release run and haven't triggered the automatic festivals yet!
          const shouldAutoTriggerFestivals =
            nextDaysTracked >= maxSteps && !current.festivalsTriggered;

          const updatedLast: ReleasedProjectRecord = {
            ...current,
            daysTracked: nextDaysTracked,
            dailyNews: updatedNews,
            festivalsTriggered: current.festivalsTriggered || shouldAutoTriggerFestivals,
          };

          const autoFestivals: AutomaticFestivalCeremonyItem[] = [];
          const updatedCounts = { ...state.actorAwardCounts };
          let totalNewAwardsForProject: string[] = [];

          if (shouldAutoTriggerFestivals) {
            const db = getResolvedDatabase(state.customDbPatch);
            const activeRivals = current.rivalReleases.filter((r) => r.status !== 'delayed');
            const rival1 = activeRivals[0]?.title || 'الرصاصة الأخيرة';
            const rival1Studio = activeRivals[0]?.studioName || 'المتحدة للإنتاج';
            const rival1Star = activeRivals[0]?.leadStarName || 'نجم منافس';
            const rival2 = activeRivals[1]?.title || 'ملوك الحارة';
            const rival2Studio = activeRivals[1]?.studioName || 'سينرجي';

            // Generate 2 distinct festival ceremonies that pop up one after another automatically!
            db.festivals.slice(0, 2).forEach((fest, fIdx) => {
              const scoreThresholdOffset = fIdx === 0 ? 0 : 0.3;
              const effScore = current.criticScore - scoreThresholdOffset;

              const winBestWork = effScore >= 7.6;
              const winDirector = effScore >= 7.4;
              const winLead = effScore >= 7.2;
              const winScript = current.synopsis.length > 35 && effScore >= 7.0;

              const awards: FestivalAwardWinnerItem[] = [
                {
                  category:
                    current.format === 'film'
                      ? 'جائزة أفضل فيلم سينمائي للعام'
                      : 'جائزة أفضل مسلسل درامي للعام',
                  nominees: [current.title, rival1, rival2],
                  winner: winBestWork ? current.title : rival1,
                  winningProjectTitle: winBestWork ? current.title : rival1,
                  winningStudioName: winBestWork ? state.studioName : rival1Studio,
                  isPlayerWinner: winBestWork,
                },
                {
                  category: 'جائزة أفضل إخراج',
                  nominees: [current.directorName, 'مروان حامد', 'تامر محسن'],
                  winner: winDirector ? current.directorName : 'مروان حامد',
                  winningProjectTitle: winDirector ? current.title : rival1,
                  winningStudioName: winDirector ? state.studioName : rival1Studio,
                  isPlayerWinner: winDirector,
                },
                {
                  category: 'جائزة أفضل ممثل / بطولة مطلقة',
                  nominees: [current.leadNames[0] || 'بطل العمل', rival1Star],
                  winner: winLead ? current.leadNames[0] || 'بطل العمل' : rival1Star,
                  winningProjectTitle: winLead ? current.title : rival1,
                  winningStudioName: winLead ? state.studioName : rival1Studio,
                  isPlayerWinner: winLead,
                },
                {
                  category: 'جائزة أفضل سيناريو وحبكة درامية',
                  nominees: [`سيناريو «${current.title}»`, `سيناريو «${rival2}»`],
                  winner: winScript ? `سيناريو «${current.title}»` : `سيناريو «${rival2}»`,
                  winningProjectTitle: winScript ? current.title : rival2,
                  winningStudioName: winScript ? state.studioName : rival2Studio,
                  isPlayerWinner: winScript,
                },
              ];

              const playerWonList = awards.filter((a) => a.isPlayerWinner);
              totalNewAwardsForProject = [
                ...totalNewAwardsForProject,
                ...playerWonList.map((a) => `${a.category} (${fest.name})`),
              ];

              if (winLead) {
                for (const aId of state.draft.leadActorIds) {
                  updatedCounts[aId] = (updatedCounts[aId] || 0) + 1;
                }
              }

              autoFestivals.push({
                id: `auto_fest_${fest.id}_${Date.now()}_${fIdx}`,
                festivalId: fest.id,
                festivalName: fest.name,
                prestige: fest.prestige,
                year: state.currentYear,
                playerProjectTitle: current.title,
                juryStatement:
                  playerWonList.length >= 2
                    ? `أشادت لجنة تحكيم ${fest.name} بالتكامل الفني والدرامي في «${current.title}» ومنحته ${playerWonList.length} جوائز كبرى وسط تصفيق حار.`
                    : playerWonList.length === 1
                    ? `نال «${current.title}» إشادة نقدية مميزة في ${fest.name} وحصد جائزة مستحقة وسط منافسة شرسة.`
                    : `شهد ${fest.name} منافسة محتدمة هذا العام؛ ورغم وصول «${current.title}» للقائمة القصيرة للترشيحات، ذهبت الجوائز الكبرى للأعمال المنافسة.`,
                festivalBuzz: `تغطية إعلامية واسعة على السجادة الحمراء في ${fest.name} لإعلان جوائز الموسم.`,
                awards,
                playerWonCount: playerWonList.length,
              });
            });
          }

          if (totalNewAwardsForProject.length > 0) {
            updatedLast.awardsWon = [...updatedLast.awardsWon, ...totalNewAwardsForProject];
          }

          return {
            lastReleasedProject: updatedLast,
            releasedProjects: state.releasedProjects.map((p) =>
              p.id === updatedLast.id ? updatedLast : p
            ),
            actorAwardCounts: updatedCounts,
            reputation: Math.min(100, state.reputation + totalNewAwardsForProject.length * 3),
            festivalModalQueue: [...state.festivalModalQueue, ...autoFestivals],
          };
        }),

      triggerElectronicTrollsCampaign: (projectId) =>
        set((state) => {
          const updatedProjects = state.releasedProjects.map((p) => {
            if (p.id !== projectId || p.trollsCampaigned) return p;
            const bonusRev = Math.round(p.totalGrossRevenue * 0.18);
            return {
              ...p,
              audienceScore: Number(Math.min(9.6, p.audienceScore + 1.2).toFixed(1)),
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
            cash: state.cash + 15_000_000,
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
          const updatedLast = latestProj
            ? { ...latestProj, awardsWon: [...latestProj.awardsWon, ...awards] }
            : null;

          return {
            currentYear: state.currentYear + 1,
            reputation: Math.min(100, state.reputation + awards.length * 4),
            actorAwardCounts: updatedCounts,
            lastReleasedProject: updatedLast,
            releasedProjects: state.releasedProjects.map((p) =>
              p.id === latestProj?.id ? { ...p, awardsWon: [...p.awardsWon, ...awards] } : p
            ),
            worldHistory: [
              {
                year: state.currentYear,
                eventText: `في ${festivalName}: حصد الاستوديو ${awards.length} جوائز كبرى (${awards.join('، ')}).`,
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
        set((state) => ({
          festivalModalQueue: [...state.festivalModalQueue, ceremony],
        })),

      dismissFestivalCeremonyModal: () =>
        set((state) => ({
          festivalModalQueue: state.festivalModalQueue.slice(1),
        })),

      addAiDiscoveredActor: (actor, newsHeadline, newsDetail) =>
        set((state) => {
          if (state.aiGeneratedActors.some((a) => a.name === actor.name)) {
            return state;
          }
          const newsItem: WorldBreakingNewsModalItem = {
            id: `ai_star_${actor.id}_${Date.now()}`,
            day: state.gameDay,
            year: state.currentYear,
            category: 'rising_talent',
            badgeLabel: 'موهبة جديدة في الساحة الفنية ✨',
            headline:
              newsHeadline ||
              `اكتشاف الموهبة الصاعدة «${actor.name}» وانضمامه لبورصة النجوم!`,
            detail:
              newsDetail ||
              `لفت الوجه الجديد «${actor.name}» (${actor.age} سنة) أنظار صناع السينما والدراما بفضل حضوره القوي، وأصبح متاحاً الآن للتعاقد في سوق الممثلين.`,
            highlightName: actor.name,
            extraStatBadge: `تقييم ${actor.stats.overall} · العمر ${actor.age} سنة`,
          };
          return {
            aiGeneratedActors: [actor, ...state.aiGeneratedActors],
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem],
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
          cash: 185_000_000,
          reputation: 65,
          currentYear: 2026,
          gameDay: 1,
          vipCoins: 250,
          vipPassExpiresAt: null,
          vipAdProgress: 0,
          activeScreen: 'STUDIO_CREATION',
          draft: { ...DEFAULT_DRAFT },
          releasedProjects: [],
          lastReleasedProject: null,
          worldHistory: [
            {
              year: 2026,
              eventText: 'تأسيس استوديو جديد بطموحات ضخمة للسيطرة على صناعة السينما والدراما.',
              category: 'milestone',
            },
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
    }
  )
);
