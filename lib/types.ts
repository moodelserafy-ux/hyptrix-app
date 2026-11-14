export type Genre =
  | "action" | "popular_drama" | "dark_comedy" | "light_comedy"
  | "psychological_horror" | "supernatural_horror" | "crime_mystery"
  | "sci_fi" | "romance" | "historical" | "biography" | "heist"
  | "fantasy" | "superhero";

export type Stats = Record<string, number>;
export interface Actor {
  id: string; name: string; gender: "male" | "female" | "other"; age: number;
  tier: "S" | "A" | "B" | "C"; image_url?: string; base_salary: number;
  stats: Stats; genre_mastery: Partial<Record<Genre, number>>;
}
export interface CrewMember {
  id: string; name: string; role: "director" | "screenwriter" | "cinematographer" | "composer" | "editor_vfx";
  image_url?: string; base_salary: number; stats: Stats; best_genres: Genre[];
}
export interface CompetitorStudio { id: string; name: string; logo_url?: string; market_power: number; preferred_genres: Genre[] }
export interface Platform { id: string; name: string; logo_url?: string; budget_capacity: number }
export interface Festival { id: string; name: string; logo_url?: string; prestige: number }
export interface GameDatabase {
  meta?: { pack_name?: string; version?: string };
  actors: Actor[]; crew: CrewMember[]; competitor_studios: CompetitorStudio[];
  streaming_platforms: Platform[]; festivals: Festival[];
}
export type FounderPerk = "visionary" | "marketer" | "negotiator";
export type Market = "egypt" | "gulf" | "europe" | "hollywood";
export interface Studio {
  name: string; ceo: string; market: Market; cash: number; reputation: number;
  logo: { emblem: string; frame: string; palette: string }; perk: FounderPerk;
  foundedYear: number;
}
export interface CastSelection { leads: string[]; antagonist: string; supporting: string[]; cameos: string[] }
export interface ContractTerms { memberId: string; memberName: string; role: string; baseSalary: number; negotiatedSalary: number; backendPoints: number; ego: number; response?: "pending" | "accepted" | "rejected"; responseReason?: string; responseDay?: number }
export interface CrewSelection { director: string; writers: string[]; cinematographer: string; composer: string; editor_vfx: string }
export type ProjectStatus = "draft" | "production" | "post" | "released";
export interface RivalRelease { studioName: string; boxOffice: number; revenueTarget?: number; dailyGross?: number }
export interface Project {
  id: string; title: string; summary: string; format: "film" | "series"; episodes: number;
  season: "ramadan" | "off_season"; primaryGenre: Genre; secondaryGenre: Genre;
  ageRating: "G" | "12+" | "16+" | "18+"; crew: CrewSelection; cast: CastSelection;
  budget: { sets: number; costumes: number; vfx: number; extras: number };
  marketingBudget: number; releaseSeason: string; screens: number; platformId: string;
  status: ProjectStatus; productionProgress: number; crises: Crisis[]; hype: number; qualityModifier: number; negotiationDiscount: number; negotiatedActorId?: string; contracts: ContractTerms[];
  result?: EvaluationResult; boxOffice?: number; backendPayout?: number; rivalReleases?: RivalRelease[]; createdYear: number; proposalDay?: number; productionStartDay?: number; plannedEndDay?: number; productionEndDay?: number; releaseDay?: number; revenueTarget?: number; dailyGross?: number;
}
export interface Crisis {
  id: string; title: string; description: string; choices: { label: string; cash: number; hype: number; quality: number }[];
  resolved: boolean;
}
export interface EvaluationResult {
  critics_score: number; audience_score: number; box_office_multiplier: number;
  reviews: string[]; headlines: string[]; social_posts: string[];
  summary: string; award_nominations: string[];
}
export interface WorldHistoryEntry { year: number; text: string; kind: "release" | "award" | "crisis" | "business" }
export interface GameState {
  hydrated: boolean; hasStudio: boolean; studio: Studio | null; year: number; week: number; gameDay: number; lastTickAt: number;
  customDb: GameDatabase | null; projects: Project[]; activeProjectId: string | null;
  worldHistory: WorldHistoryEntry[]; careerAwards: Record<string, number>;
  vipExpiresAt: number | null; notification: string | null;
}
