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
  calculateStudioMarketValue,
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

/**
 * Builds strictly 3 distinct festival ceremonies for the season without duplication.
 * Includes BOTH "جائزة أفضل فيلم سينمائي للعام" AND "جائزة أفضل مسلسل درامي للعام"
 * and evaluates each category independently against rival studios so no single work sweeps everything automatically.
 */
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
  const { project, studioName, currentYear, db } = params;
  const activeRivals = project.rivalReleases.filter(
    (r) => r.status !== 'delayed'
  );

  const topRival1 = activeRivals[0] || {
    title: 'الرصاصة الذهبية',
    studioName: 'المتحدة للإنتاج السينمائي',
    leadStarName: 'كريم عبد العزيز',
    criticScore: 7.9,
  };
  const topRival2 = activeRivals[1] || {
    title: 'شارع السلطان',
    studioName: 'مجموعة سينرجي للترفيه',
    leadStarName: 'أحمد عز',
    criticScore: 7.5,
  };
  const topRival3 = activeRivals[2] || {
    title: 'الوريث الأخير',
    studioName: 'العدل جروب للدراما والسينما',
    leadStarName: 'منى زكي',
    criticScore: 7.3,
  };

  const isPlayerFilm = project.format === 'film';
  const ceremonies: AutomaticFestivalCeremonyItem[] = [];
  const allWonAwardLabels: string[] = [];
  let leadActorWonCount = 0;

  // Strictly 3 distinct festivals per season
  const threeFestivals = db.festivals.slice(0, 3);

  threeFestivals.forEach((fest, fIdx) => {
    // Each festival has its own critical strictness & taste so results vary across the 3 festivals!
    const festivalLensOffset = fIdx === 0 ? 0.15 : fIdx === 1 ? -0.1 : 0.35;
    const rivalBestScore = Math.max(
      topRival1.criticScore || 7.6,
      7.4 + fIdx * 0.2
    );

    const playerEffectiveScore = project.criticScore - festivalLensOffset;

    // 1. Best Film Category (Player only competes here if they made a Film AND beat the top rival film)
    const playerWinsBestFilm =
      isPlayerFilm && playerEffectiveScore >= rivalBestScore + 0.1;

    // 2. Best Series Category (Player only competes here if they made a Series AND beat the top rival series)
    const playerWinsBestSeries =
      !isPlayerFilm && playerEffectiveScore >= rivalBestScore;

    // 3. Best Director (Requires strong score; festival #2 might favor a rival visionary director)
    const playerWinsDirector =
      playerEffectiveScore >= rivalBestScore - 0.1 &&
      (fIdx !== 2 || project.criticScore >= 8.2);

    // 4. Best Lead Actor (Can be won by the player's star even if the film/series lost Best Picture, or vice versa!)
    const playerWinsActor =
      project.criticScore >= 7.3 + (fIdx === 1 ? 0 : 0.35) &&
      (fIdx !== 0 || project.audienceScore >= 7.5);

    // 5. Best Screenplay (Requires rich script synopsis AND high critic score)
    const scriptWords = project.synopsis.trim().split(/\s+/).length;
    const playerWinsScript =
      scriptWords >= 16 &&
      playerEffectiveScore >= 7.5 + (fIdx === 2 ? 0.2 : 0);

    const awards: FestivalAwardWinnerItem[] = [
      {
        category: 'جائزة أفضل فيلم سينمائي للعام',
        nominees: isPlayerFilm
          ? [project.title, topRival1.title, topRival2.title]
          : [topRival1.title, topRival2.title, 'ليلة سقوط الكينج'],
        winner: playerWinsBestFilm ? project.title : topRival1.title,
        winningProjectTitle: playerWinsBestFilm
          ? project.title
          : topRival1.title,
        winningStudioName: playerWinsBestFilm
          ? studioName
          : topRival1.studioName,
        isPlayerWinner: playerWinsBestFilm,
      },
      {
        category: 'جائزة أفضل مسلسل درامي للعام',
        nominees: !isPlayerFilm
          ? [project.title, topRival2.title, topRival3.title]
          : ['الحشاشين: العهد السري', topRival3.title, 'ليالي المحروسة'],
        winner: playerWinsBestSeries
          ? project.title
          : !isPlayerFilm
          ? topRival2.title
          : topRival3.title,
        winningProjectTitle: playerWinsBestSeries
          ? project.title
          : !isPlayerFilm
          ? topRival2.title
          : topRival3.title,
        winningStudioName: playerWinsBestSeries
          ? studioName
          : !isPlayerFilm
          ? topRival2.studioName
          : topRival3.studioName,
        isPlayerWinner: playerWinsBestSeries,
      },
      {
        category: 'جائزة أفضل إخراج',
        nominees: [project.directorName, 'مروان حامد', 'تامر محسن'],
        winner: playerWinsDirector
          ? project.directorName
          : fIdx === 1
          ? 'تامر محسن'
          : 'مروان حامد',
        winningProjectTitle: playerWinsDirector
          ? project.title
          : fIdx === 1
          ? topRival3.title
          : topRival1.title,
        winningStudioName: playerWinsDirector
          ? studioName
          : fIdx === 1
          ? topRival3.studioName
          : topRival1.studioName,
        isPlayerWinner: playerWinsDirector,
      },
      {
        category: 'جائزة أفضل تمثيل (دور أول)',
        nominees: [
          project.leadNames[0] || 'بطل العمل',
          topRival1.leadStarName,
          topRival2.leadStarName,
        ],
        winner: playerWinsActor
          ? project.leadNames[0] || 'بطل العمل'
          : fIdx % 2 === 0
          ? topRival1.leadStarName
          : topRival2.leadStarName,
        winningProjectTitle: playerWinsActor
          ? project.title
          : fIdx % 2 === 0
          ? topRival1.title
          : topRival2.title,
        winningStudioName: playerWinsActor
          ? studioName
          : fIdx % 2 === 0
          ? topRival1.studioName
          : topRival2.studioName,
        isPlayerWinner: playerWinsActor,
      },
      {
        category: 'جائزة أفضل سيناريو وحبكة درامية',
        nominees: [
          `سيناريو «${project.title}»`,
          `سيناريو «${topRival2.title}»`,
        ],
        winner: playerWinsScript
          ? `سيناريو «${project.title}»`
          : `سيناريو «${topRival2.title}»`,
        winningProjectTitle: playerWinsScript ? project.title : topRival2.title,
        winningStudioName: playerWinsScript
          ? studioName
          : topRival2.studioName,
        isPlayerWinner: playerWinsScript,
      },
    ];

    const playerWonList = awards.filter((a) => a.isPlayerWinner);
    playerWonList.forEach((a) => {
      allWonAwardLabels.push(`${a.category} (${fest.name})`);
    });
    if (playerWinsActor) {
      leadActorWonCount += 1;
    }

    ceremonies.push({
      id: `season_fest_${fest.id}_${project.id}`,
      festivalId: fest.id,
      festivalName: fest.name,
      prestige: fest.prestige,
      year: currentYear,
      playerProjectTitle: project.title,
      juryStatement:
        playerWonList.length >= 2
          ? `أشادت لجنة تحكيم ${fest.name} بالتكامل الدرامي والفني في «${project.title}» من إنتاج «${studioName}» ومنحته ${playerWonList.length} جوائز وسط منافسة شرسة.`
          : playerWonList.length === 1
          ? `حصد «${project.title}» جائزة مستحقة في ${fest.name}، بينما تقاسمت الشركات المنافسة باقي جوائز الموسم الكبرى.`
          : `شهد ${fest.name} منافسة محتدمة هذا العام؛ ورغم ترشح «${project.title}» في القائمة القصيرة، حسمت أعمال «${topRival1.studioName}» و«${topRival2.studioName}» الجوائز الكبرى بفارق التقييمات النقدية.`,
      festivalBuzz: `تغطية إعلامية واسعة على السجادة الحمراء في ${fest.name} لإعلان الفائزين في فئات السينما والدراما.`,
      awards,
      playerWonCount: playerWonList.length,
    });
  });

  return { ceremonies, allWonAwardLabels, leadActorWonCount };
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
  vipCoins: number;
  vipPassExpiresAt: number | null;
  vipAdProgress: number;
  activeScreen: ActiveStageScreen;
  draft: ActiveDraftProject;
  releasedProjects: ReleasedProjectRecord[];
  lastReleasedProject: ReleasedProjectRecord | null;
  worldHistory: WorldHistoryEntry[];
  aiMemoryLog: string[];
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
      cash: 75_000_000,
      marketValue: 110_000_000,
      marketValueModifier: 0,
      reputation: 62,
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
      aiMemoryLog: [
        'انطلاق الموسم السينمائي في مصر وسط منافسة شرسة بين كبرى شركات الإنتاج على شباك التذاكر.',
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
          cash: 75_000_000,
          marketValue: 110_000_000,
          marketValueModifier: 0,
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
          const nextMemory = [...(state.aiMemoryLog || [])];
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          let nextMarketValMod = state.marketValueModifier || 0;
          let nextRep = state.reputation;

          // 1. Evaluate pending talent offers that have reached their responseDueDay
          for (const key of Object.keys(updatedOffers)) {
            const offer = updatedOffers[key];
            if (offer.status === 'pending' && newGameDay >= offer.responseDueDay) {
              if (!offer.willAccept) {
                updatedOffers[key] = { ...offer, status: 'rejected' };
                nextMarketValMod -= 2_500_000;
                updatedDraft.hypeScore = Math.max(15, updatedDraft.hypeScore - 3);
                const headline = `بيان فني: ${offer.talentName} يعتذر رسمياً عن بطولة عمل شركة «${state.studioName}»`;
                newNewsItems.push({
                  id: `news_offer_rej_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'خبر صحفي · مفاوضات النجوم',
                  headline,
                  detail: `${offer.aiReason} — وأشارت مصادر صحفية إلى أن اعتذار ${offer.talentName} عن دور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}» دفع المنتج ${state.ceoName} للبحث عن بديل سريع.`,
                  highlightName: offer.talentName,
                  gameImpactLabel: 'تأثير الخبر: -3% ترقب الجمهور · -2.5M ج.م القيمة السوقية',
                });
                nextMemory.unshift(
                  `رفض النجم ${offer.talentName} عرض شركة "${state.studioName}" لدور "${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}" في عمل "${updatedDraft.title || 'مشروع جديد'}".`
                );
              } else {
                const signedOffer: TalentOfferRecord = {
                  ...offer,
                  status: 'accepted',
                };
                updatedOffers[key] = signedOffer;
                updatedDraft = applyAcceptedOfferToDraft(updatedDraft, signedOffer);
                nextMarketValMod += 4_500_000;
                updatedDraft.hypeScore = Math.min(100, updatedDraft.hypeScore + 5);
                const headline = `انفراد صحفي: ${offer.talentName} يوقّع عقد «${updatedDraft.title || 'العمل الجديد'}» مع المنتج ${state.ceoName}!`;
                newNewsItems.push({
                  id: `news_offer_acc_${offer.talentId}_${newGameDay}`,
                  day: newGameDay,
                  year: newYear,
                  category: 'contract_reply',
                  badgeLabel: 'عاجل · تعاقدات الموسم ✓',
                  headline,
                  detail: `${offer.aiReason} — وقد ارتفعت القيمة السوقية لشركة «${state.studioName}» عقب الإعلان الرسمي عن انضمام ${offer.talentName} في دور «${offer.customRoleName || SLOT_ARABIC_NAMES[offer.roleSlot]}» مقابل ${formatMoney(offer.offeredSalary)} ج.م.`,
                  highlightName: offer.talentName,
                  extraStatBadge: `قيمة العقد: ${formatMoney(offer.offeredSalary)} ج.م`,
                  gameImpactLabel: 'تأثير الخبر: +5% ترقب الجمهور · +4.5M ج.م القيمة السوقية',
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

          // 3. Dynamic World Events as days pass (every 6 days, trigger an impactful cinema world event)
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
                base_salary: 4_000_000 + (newGameDay % 5) * 500_000,
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
              const headline = `تقرير فني: صعود مفاجئ للموهبة الشابة «${newActor.name}» وتنافس الشركات على ضمه!`;
              const detail = `أشادت الصحافة النقدية بالحضور اللافت للممثل الصاعد «${newActor.name}» (${newActor.age} سنة - ${template.archetype})، وأصبحت بطاقته متاحة الآن في سوق الممثلين بتقييم ${newOverall} وأجر ${formatMoney(newActor.base_salary)} ج.م.`;
              newNewsItems.push({
                id: `world_rising_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'rising_talent',
                badgeLabel: 'بورصة النجوم · اكتشاف جديد ✨',
                headline,
                detail,
                highlightName: newActor.name,
                extraStatBadge: `تقييم ${newOverall} · العمر ${newActor.age} سنة`,
                gameImpactLabel: 'تأثير الحدث: إضافة موهبة صاعدة جديدة لسوق الممثلين',
              });
              nextHistory.unshift({
                year: newYear,
                eventText: headline,
                category: 'milestone',
              });
              nextMemory.unshift(`ظهور الموهبة الصاعدة "${newActor.name}" (${newActor.age} سنة) في سوق الممثلين.`);
            } else if (
              eventRoll === 2 &&
              nextEmergingStudios.length < FICTIONAL_EMERGING_STUDIOS_POOL.length
            ) {
              // Event B: New Fictional Studio enters the market to compete!
              const newStudio = FICTIONAL_EMERGING_STUDIOS_POOL[nextEmergingStudios.length];
              nextEmergingStudios = [...nextEmergingStudios, { ...newStudio, foundedYear: newYear }];
              const headline = `زلزال في سوق الإنتاج: إطلاق شركة «${newStudio.name}» برأس مال ضخم لمنافسة «${state.studioName}»!`;
              const detail = `أعلن المنتج ${newStudio.ceoName} عن تأسيس «${newStudio.name}» وضخ استثمارات كبرى لخطف نجوم الصف الأول ومنافسة شركة «${state.studioName}» التي يديرها ${state.ceoName} في جدول الترتيب العام.`;
              newNewsItems.push({
                id: `world_studio_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'new_studio',
                badgeLabel: 'أخبار السوق · منافس جديد 🎬',
                headline,
                detail,
                highlightName: newStudio.name,
                extraStatBadge: `قوة سوقية ${newStudio.market_power}%`,
                gameImpactLabel: `تأثير الحدث: دخول «${newStudio.name}» في جدول ترتيب الشركات`,
              });
              nextHistory.unshift({
                year: newYear,
                eventText: headline,
                category: 'milestone',
              });
              nextMemory.unshift(`تأسست شركة منافسة جديدة باسم "${newStudio.name}" بقيادة ${newStudio.ceoName}.`);
            } else if (eventRoll === 3) {
              // Event C: Major Rival Studio Leaderboard Shakeup OR Rival Star Signing!
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
                const isRivalFlopCrisis = newGameDay % 12 === 0;
                const prevComp = nextCompDelta[studio.name] || {
                  netWorthDelta: 0,
                  releasesDelta: 0,
                  awardsDelta: 0,
                };
                if (isRivalFlopCrisis) {
                  const dropAmount = -85_000_000;
                  nextCompDelta[studio.name] = {
                    ...prevComp,
                    netWorthDelta: prevComp.netWorthDelta + dropAmount,
                  };
                  const headline = `خسائر فادحة تهز شركة «${studio.name}» وتراجع قيمتها السوقية بـ 85M ج.م!`;
                  const detail = `تعرض المشروع الضخم لشركة «${studio.name}» لأزمة إنتاجية وتسويقية حادة أدت إلى تراجع أسهم الشركة في البورصة السينمائية وتغير مراكز الصدارة في الدوري المحلي.`;
                  newNewsItems.push({
                    id: `world_shakeup_${newGameDay}`,
                    day: newGameDay,
                    year: newYear,
                    category: 'rival_project',
                    badgeLabel: 'شقلبة في ترتيب الشركات 📉',
                    headline,
                    detail,
                    highlightName: studio.name,
                    gameImpactLabel: `تأثير الخبر: هبوط القيمة السوقية لـ «${studio.name}» بـ -85M ج.م`,
                  });
                  nextMemory.unshift(`تعرضت شركة "${studio.name}" لخسارة سوقية بقيمة 85M ج.م مما هز ترتيب الشركات.`);
                } else {
                  const surgeAmount = 75_000_000;
                  nextCompDelta[studio.name] = {
                    ...prevComp,
                    netWorthDelta: prevComp.netWorthDelta + surgeAmount,
                    releasesDelta: prevComp.releasesDelta + 1,
                  };
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
                    salaryMultiplier: Number((prevDyn.salaryMultiplier * 1.06).toFixed(2)),
                    lastEvolutionNote: `تألق في بطولة مع ${studio.name} (+1 تقييم)`,
                  };
                  const headline = `صفقة مدوية: «${studio.name}» تخطف النجم ${targetActor.name} وتقفز قيمتها السوقية +75M ج.م!`;
                  const detail = `أبرمت شركة «${studio.name}» عقد احتكار مؤقت مع النجم ${targetActor.name} (${targetActor.age} سنة) لبطولة أضخم أعمالها، مما أشعل المنافسة في جدول الترتيب العام ورفع أجر النجم في السوق.`;
                  newNewsItems.push({
                    id: `world_rival_sign_${newGameDay}`,
                    day: newGameDay,
                    year: newYear,
                    category: 'rival_project',
                    badgeLabel: 'تحركات الشركات المنافسة 🔥',
                    headline,
                    detail,
                    highlightName: targetActor.name,
                    extraStatBadge: `انشغال النجم 4 أيام · تقييم +1`,
                    gameImpactLabel: `تأثير الخبر: قفزة سوقية +75M ج.م لشركة «${studio.name}»`,
                  });
                  nextMemory.unshift(`تعاقدت شركة "${studio.name}" مع النجم ${targetActor.name} وقفزت قيمتها السوقية بـ 75M ج.م.`);
                }
              }
            } else if (eventRoll === 4) {
              // Event D: Veteran Actor Retirement or Passing Away (for older actors age >= 50)
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
                  ? `نبأ عاجل: رحيل الفنان القدير «${chosenVet.name}» عن عمر يناهز ${chosenVet.age} عاماً`
                  : `الفنان القدير «${chosenVet.name}» (${chosenVet.age} سنة) يعلن اعتزاله التمثيل نهائياً`;
                const detail = isDeceased
                  ? `خيّم الحزن على الوسط الفني المصري والعربي بعد إعلان وفاة الفنان القدير «${chosenVet.name}» تاركاً إرثاً خالداً في ذاكرة السينما والدراما.`
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
            } else {
              // Event E: Media spotlight on the player's CEO & Studio valuation!
              const isPositiveSpotlight = state.reputation >= 64;
              const valShift = isPositiveSpotlight ? 14_000_000 : -9_000_000;
              nextMarketValMod += valShift;
              nextRep = Math.min(100, Math.max(15, state.reputation + (isPositiveSpotlight ? 2 : -2)));
              const headline = isPositiveSpotlight
                ? `تقرير اقتصادي: أسهم شركة «${state.studioName}» بقيادة ${state.ceoName} تجذب أنظار المستثمرين!`
                : `تقرير نقدي يطالب شركة «${state.studioName}» بمغامرة فنية أكبر في مشروعها القادم`;
              const detail = isPositiveSpotlight
                ? `أشاد محللو سوق الترفيه بالاستراتيجية الإنتاجية للمدير التنفيذي ${state.ceoName}، مما رفع القيمة السوقية لشركة «${state.studioName}» بمقدار +14M ج.م.`
                : `أشار نقاد الصناعة إلى أن الجمهور ينتظر من المنتج ${state.ceoName} وشركة «${state.studioName}» عملاً قوياً يعيد ترتيب أوراق المنافسة هذا الموسم.`;
              newNewsItems.push({
                id: `world_ceo_spotlight_${newGameDay}`,
                day: newGameDay,
                year: newYear,
                category: 'production_news',
                badgeLabel: 'بورصة شركات الإنتاج 📊',
                headline,
                detail,
                highlightName: state.studioName,
                gameImpactLabel: isPositiveSpotlight
                  ? 'تأثير الخبر: +14M ج.م القيمة السوقية · +2% سمعة الشركة'
                  : 'تأثير الخبر: -9M ج.م القيمة السوقية · -2% سمعة الشركة',
              });
            }
          }

          if (yearsAdded > 0) {
            nextHistory.unshift({
              year: newYear,
              eventText: `بداية عام سينمائي جديد (${newYear}) وتقدم أعمار جميع النجوم في السوق بعام إضافي.`,
              category: 'milestone',
            });
          }

          const nextMarketValue = calculateStudioMarketValue({
            cash: state.cash,
            reputation: nextRep,
            releasedProjects: state.releasedProjects,
            marketValueModifier: nextMarketValMod,
          });

          return {
            gameDay: newGameDay,
            currentYear: newYear,
            reputation: nextRep,
            marketValueModifier: nextMarketValMod,
            marketValue: nextMarketValue,
            draft: updatedDraft,
            actorDynamicState: nextActorDynamic,
            aiGeneratedActors: nextAiActors,
            emergingCompetitors: nextEmergingStudios,
            competitorNetWorthDelta: nextCompDelta,
            breakingNewsQueue: [...state.breakingNewsQueue, ...newNewsItems],
            worldHistory: nextHistory,
            aiMemoryLog: nextMemory.slice(0, 25),
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
          if (nextMarketValue >= 900_000_000 && !unlocked.includes('hollywood')) unlocked.push('hollywood');

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

          const isMajorHit = record.criticScore >= 7.4 && record.netProfit >= 15_000_000;
          const isFlop = record.criticScore < 5.8 || record.netProfit < -5_000_000;

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

          // Update competitor studios' net worths & trigger dramatic Leaderboard Shakeups!
          const nextCompDelta = { ...state.competitorNetWorthDelta };
          for (const [rIdx, rival] of record.rivalReleases.entries()) {
            const prevComp = nextCompDelta[rival.studioName] || {
              netWorthDelta: 0,
              releasesDelta: 0,
              awardsDelta: 0,
            };
            if (rival.status === 'delayed') {
              // Delayed project costs the rival studio market valuation
              nextCompDelta[rival.studioName] = {
                ...prevComp,
                netWorthDelta: prevComp.netWorthDelta - 38_000_000,
              };
              continue;
            }
            // Top rival gets a massive valuation surge; bottom rival suffers a painful loss to shake up rankings!
            const valuationShift =
              rIdx === 0 && rival.boxOfficeRevenue >= 65_000_000
                ? Math.round(rival.boxOfficeRevenue * 1.45)
                : rIdx === 2 || rival.criticScore < 5.8
                ? -72_000_000
                : Math.round(rival.boxOfficeRevenue * 0.65);

            nextCompDelta[rival.studioName] = {
              netWorthDelta: prevComp.netWorthDelta + valuationShift,
              releasesDelta: prevComp.releasesDelta + 1,
              awardsDelta: prevComp.awardsDelta + (rival.criticScore >= 8.0 ? 1 : 0),
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

      advanceReleaseTrackingDay: (newsItem) =>
        set((state) => {
          const current = state.lastReleasedProject;
          if (!current) return state;
          const maxSteps = current.format === 'series' ? current.episodes || 15 : 10;
          const nextDaysTracked = Math.min(maxSteps, (current.daysTracked || 1) + 1);
          const updatedNews = newsItem
            ? [newsItem, ...(current.dailyNews || [])]
            : current.dailyNews || [];

          const shouldAutoTriggerFestivals =
            nextDaysTracked >= maxSteps && !current.festivalsTriggered;

          const updatedLast: ReleasedProjectRecord = {
            ...current,
            daysTracked: nextDaysTracked,
            dailyNews: updatedNews,
            festivalsTriggered: current.festivalsTriggered || shouldAutoTriggerFestivals,
          };

          let nextFestivalQueue = [...state.festivalModalQueue];
          const updatedCounts = { ...state.actorAwardCounts };
          let totalNewAwardsForProject: string[] = [];

          if (shouldAutoTriggerFestivals) {
            const db = getResolvedDatabase(state.customDbPatch);
            const built = buildThreeSeasonFestivals({
              project: current,
              studioName: state.studioName,
              currentYear: state.currentYear,
              db,
            });

            totalNewAwardsForProject = built.allWonAwardLabels;
            if (built.leadActorWonCount > 0) {
              for (const aId of state.draft.leadActorIds) {
                updatedCounts[aId] = (updatedCounts[aId] || 0) + built.leadActorWonCount;
              }
            }
            // Replace festivalModalQueue with strictly the 3 unique ceremonies for this project!
            nextFestivalQueue = built.ceremonies;
          }

          if (totalNewAwardsForProject.length > 0 && current.awardsWon.length === 0) {
            updatedLast.awardsWon = totalNewAwardsForProject;
          }

          const updatedProjects = state.releasedProjects.map((p) =>
            p.id === updatedLast.id ? updatedLast : p
          );
          const nextRep = Math.min(100, state.reputation + totalNewAwardsForProject.length * 3);
          const nextMarketVal = calculateStudioMarketValue({
            cash: state.cash,
            reputation: nextRep,
            releasedProjects: updatedProjects,
            marketValueModifier: state.marketValueModifier || 0,
          });

          return {
            lastReleasedProject: updatedLast,
            releasedProjects: updatedProjects,
            actorAwardCounts: updatedCounts,
            reputation: nextRep,
            marketValue: nextMarketVal,
            festivalModalQueue: nextFestivalQueue,
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
          // Deduplicate by festivalId so we NEVER queue more than the 3 season festivals!
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
            gameImpactLabel: `تأثير الخبر: انضمام «${actor.name}» رسمياً لسوق الممثلين`,
          };
          return {
            aiGeneratedActors: [actor, ...state.aiGeneratedActors],
            breakingNewsQueue: [...state.breakingNewsQueue, newsItem],
            aiMemoryLog: [
              `ظهر الممثل الصاعد الجديد "${actor.name}" (${actor.age} سنة) في الساحة الفنية بتقييم ${actor.stats.overall}.`,
              ...(state.aiMemoryLog || []),
            ].slice(0, 25),
          };
        }),

      pushAiContextualNewsEvent: (event) =>
        set((state) => {
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
          aiMemoryLog: [
            'انطلاق الموسم السينمائي في مصر وسط منافسة شرسة بين كبرى شركات الإنتاج على شباك التذاكر.',
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
