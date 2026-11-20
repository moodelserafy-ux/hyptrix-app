import type { GenreId } from './db-resolver';
import type {
  FounderPerk,
  MarketConfig,
  MarketRegion,
  RoleBillingSize,
} from './game-engine';
import {
  getMarketProfile,
  type MarketFilmSeasonOption,
  type UiLanguageId,
  type WorldMarketId,
} from './market-profiles';

export function isEnglishLang(lang?: UiLanguageId | string | null): boolean {
  return lang === 'en';
}

export function getUiDir(lang?: UiLanguageId | string | null): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Concise inline bilingual text picker.
 * Base/default language is English (`en`), switching seamlessly to Arabic (`ar`).
 */
export function tr<T = string>(
  lang: UiLanguageId | string | null | undefined,
  en: T,
  ar: T
): T {
  return lang === 'ar' ? ar : en;
}

/**
 * Auto-detects the player's preferred interface language on first entry:
 * 1. Telegram Mini App user `language_code` (ar* -> 'ar', everything else -> 'en').
 * 2. Browser `navigator.languages` / `navigator.language` (ar* -> 'ar', everything else -> 'en').
 * 3. Defaults to English ('en') as the global base language.
 */
export function detectPreferredUiLanguage(): UiLanguageId {
  if (typeof window === 'undefined') return 'en';

  const tgLang = (
    window as Window & {
      Telegram?: {
        WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } };
      };
    }
  ).Telegram?.WebApp?.initDataUnsafe?.user?.language_code;

  if (typeof tgLang === 'string' && tgLang.trim().length > 0) {
    return tgLang.trim().toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  const browserLangs =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || 'en'];

  const primary = String(browserLangs[0] || 'en').trim().toLowerCase();
  return primary.startsWith('ar') ? 'ar' : 'en';
}

/**
 * Formats the in-game calendar date cleanly in English or Arabic.
 */
export function formatLocalizedGameDate(
  gameDay: number,
  currentYear: number,
  lang?: UiLanguageId | null
): string {
  const safeDay = Math.max(1, Number(gameDay || 1));
  const dayOfYear = ((safeDay - 1) % 120) + 1;
  const month = Math.min(12, Math.floor((dayOfYear - 1) / 10) + 1);
  const dayOfMonth = ((dayOfYear - 1) % 10) + 1;
  if (lang === 'ar') {
    return `سنة ${currentYear} · شهر ${month} · يوم ${dayOfMonth}`;
  }
  return `Year ${currentYear} · Month ${month} · Day ${dayOfMonth}`;
}

export const GENRE_LOCALIZED: Record<
  GenreId,
  { en: { name: string; description: string }; ar: { name: string; description: string } }
> = {
  action: {
    en: { name: 'Action & Thrillers', description: 'High-octane chases, stunts, and blockbuster spectacle' },
    ar: { name: 'أكشن ومطاردات', description: 'معارك، مطاردات، وإثارة عالية الميزانية' },
  },
  popular_drama: {
    en: { name: 'Street Drama', description: 'Gritty neighborhood sagas and crowd-favorite heroes' },
    ar: { name: 'دراما شعبية', description: 'صراعات الحارة والبطولات الجماهيرية' },
  },
  comedy: {
    en: { name: 'Satirical Comedy', description: 'Sharp wit, big laughs, and crowd-pleasing gags' },
    ar: { name: 'كوميديا ساخرة', description: 'مواقف كوميدية وإفيهات جماهيرية' },
  },
  light_comedy: {
    en: { name: 'Family Light Comedy', description: 'Warm, feel-good comedy built for every audience' },
    ar: { name: 'لايت كوميدي عائلي', description: 'كوميديا عائلية خفيفة ومبهجة' },
  },
  psychological_horror: {
    en: { name: 'Psychological Horror', description: 'Slow-burn dread, mind games, and breathless suspense' },
    ar: { name: 'رعب نفسي', description: 'توتر نفسي وغموض يحبس الأنفاس' },
  },
  supernatural_horror: {
    en: { name: 'Supernatural Horror', description: 'Ancient curses, folklore, and chilling hauntings' },
    ar: { name: 'رعب ما وراء الطبيعة', description: 'لعنات، أساطير، وأجواء مرعبة' },
  },
  crime_mystery: {
    en: { name: 'Crime & Mystery', description: 'Detective thrillers, twists, and high-stakes investigations' },
    ar: { name: 'جريمة وغموض', description: 'تحقيقات بوليسية وألغاز معقدة' },
  },
  sci_fi: {
    en: { name: 'Sci-Fi', description: 'Futuristic worlds, bold concepts, and sleek tech' },
    ar: { name: 'خيال علمي', description: 'عوالم مستقبلية وتقنيات متطورة' },
  },
  romance: {
    en: { name: 'Romance', description: 'Heartfelt love stories and unforgettable emotional arcs' },
    ar: { name: 'رومانسية', description: 'قصص حب ومشاعر إنسانية دافئة' },
  },
  historical: {
    en: { name: 'Historical Epic', description: 'Grand historical eras, legends, and prestige scale' },
    ar: { name: 'تاريخي وملحمي', description: 'ملاحم تاريخية وحقب زمنية كبرى' },
  },
  biography: {
    en: { name: 'Biopic', description: 'Inspiring true-to-life portraits of iconic figures' },
    ar: { name: 'سيرة ذاتية', description: 'قصص حياة شخصيات مؤثرة وتاريخية' },
  },
  heist: {
    en: { name: 'Heist & Caper', description: 'Precision masterplans, double-crosses, and slick deception' },
    ar: { name: 'سطو وذكاء', description: 'خطط سرقة محكمة وخداع بصري' },
  },
  fantasy: {
    en: { name: 'Fantasy & Myth', description: 'Mythic realms, magic, and legendary quests' },
    ar: { name: 'فانتازيا وأساطير', description: 'عوالم سحرية وأساطير خيالية' },
  },
  superhero: {
    en: { name: 'Superhero', description: 'Extraordinary powers and world-saving clashes' },
    ar: { name: 'أبطال خارقين', description: 'قوى خارقة ومعارك إنقاذ كبرى' },
  },
};

export function getLocalizedGenreInfo(
  id: GenreId,
  lang?: UiLanguageId | null
): { name: string; description: string } {
  const entry = GENRE_LOCALIZED[id] || GENRE_LOCALIZED.popular_drama;
  return lang === 'ar' ? entry.ar : entry.en;
}

export const ROLE_BILLING_LOCALIZED: Record<
  RoleBillingSize,
  { en: { label: string; subtitle: string }; ar: { label: string; subtitle: string } }
> = {
  lead_star: {
    en: {
      label: 'Solo Lead (Top Billing)',
      subtitle: 'Commands the poster, marketing spotlight, and core dramatic arc',
    },
    ar: {
      label: 'بطولة مطلقة (نجم الشباك الأول)',
      subtitle: 'يتصدر الأفيش والدعاية ويتحمل عبء العمل الدرامي بالكامل',
    },
  },
  co_lead: {
    en: {
      label: 'Co-Lead (Shared Billing)',
      subtitle: 'Equal screen weight alongside a star-studded ensemble',
    },
    ar: {
      label: 'بطولة مشتركة (محور رئيسي)',
      subtitle: 'بطولة ثنائية أو جماعية متساوية المساحة والتأثير في الأحداث',
    },
  },
  antagonist: {
    en: {
      label: 'Main Antagonist (Villain)',
      subtitle: 'The primary force of conflict driving tension against the hero',
    },
    ar: {
      label: 'الشرير المحوري (الخصم الدرامي)',
      subtitle: 'المحرك الرئيسي للصراع في مواجهة البطل طوال الأحداث',
    },
  },
  supporting: {
    en: {
      label: 'Key Supporting Role',
      subtitle: 'Memorable scene-stealer who deepens the plot and momentum',
    },
    ar: {
      label: 'دور ثانٍ / مساعد مؤثر',
      subtitle: 'شخصية مساندة تثري الحبكة وتدعم مسار الأحداث',
    },
  },
  cameo: {
    en: {
      label: 'Special Guest Cameo',
      subtitle: 'Surprise high-impact appearance at a fraction of standard fees',
    },
    ar: {
      label: 'ضيف شرف خاص (ظهور استثنائي)',
      subtitle: 'مشهد أو حلقة مفاجئة ترفع حماس الجمهور بتكلفة مخفضة',
    },
  },
};

export function getLocalizedRoleBilling(
  size: RoleBillingSize,
  lang?: UiLanguageId | null
): { label: string; subtitle: string } {
  const entry = ROLE_BILLING_LOCALIZED[size] || ROLE_BILLING_LOCALIZED.lead_star;
  return lang === 'ar' ? entry.ar : entry.en;
}

export function getLocalizedSlotLabel(
  slot: string,
  lang?: UiLanguageId | null
): string {
  const map: Record<string, { en: string; ar: string }> = {
    director: { en: 'Director', ar: 'مخرج العمل' },
    lead: { en: 'Lead Star (Box Office Headliner)', ar: 'البطل الأساسي (نجم الشباك)' },
    antagonist: { en: 'Main Antagonist', ar: 'الشرير الرئيسي' },
    supporting: { en: 'Supporting Cast', ar: 'الأدوار المساعدة' },
    cameo: { en: 'Guest Cameos', ar: 'ضيوف الشرف' },
    cinematographer: { en: 'Director of Photography (DOP)', ar: 'مدير التصوير' },
    composer: { en: 'Film Composer', ar: 'الموسيقار' },
    editor_vfx: { en: 'Editor & VFX Supervisor', ar: 'المونتير والخدع البصرية' },
    writer: { en: 'Screenwriter', ar: 'السيناريست' },
  };
  const found = map[slot];
  if (!found) return slot;
  return lang === 'ar' ? found.ar : found.en;
}

export const FOUNDER_PERKS_LOCALIZED: Record<
  FounderPerk,
  {
    en: { title: string; badge: string; description: string; shortBonus: string };
    ar: { title: string; badge: string; description: string; shortBonus: string };
  }
> = {
  visionary_director: {
    en: {
      title: 'Visionary Auteur',
      badge: 'Prestige & Awards',
      description:
        'Elevates every production’s artistic quality (+10 Quality) and boosts festival awards odds.',
      shortBonus: '+10 Artistic Quality & Higher Critic Scores',
    },
    ar: {
      title: 'مخرج عبقري',
      badge: 'جودة ونقاد ومهرجانات',
      description:
        'يرفع الجودة الفنية لكل عمل تنتجه (+10 جودة) ويعزز فرص حصد جوائز المهرجانات.',
      shortBonus: '+10 جودة فنية وتقييم نقاد أعلى',
    },
  },
  marketing_whale: {
    en: {
      title: 'Box-Office Mogul',
      badge: 'Opening Weekend Power',
      description:
        'Supercharges launch campaigns (+20% Opening Weekend Revenue) and amplifies public buzz.',
      shortBonus: '+20% Opening Box Office & Viral Hype',
    },
    ar: {
      title: 'حوت تسويق',
      badge: 'شباك تذاكر وضجة',
      description:
        'يضاعف قوة الحملات الدعائية (+20% إيرادات افتتاحية) ويشعل تريند الجمهور.',
      shortBonus: '+20% إيرادات افتتاحية وضجة أعلى',
    },
  },
  shark_negotiator: {
    en: {
      title: 'Shark Negotiator',
      badge: 'Deal-Maker Edge',
      description:
        'Slashes talent contract fees (-15% Cast & Crew Salaries) and raises deal acceptance odds.',
      shortBonus: '-15% Talent Salaries & Easier Negotiations',
    },
    ar: {
      title: 'مفاوض شرس',
      badge: 'توفير أجور وعقود',
      description:
        'يخفض أجور التعاقد مع النجوم والطاقم (-15% توفير في الأجور) ويرفع فرص قبول العروض.',
      shortBonus: '-15% خصم على الأجور وتسهيل العقود',
    },
  },
};

export function getLocalizedFounderPerk(
  perk: FounderPerk,
  lang?: UiLanguageId | null
) {
  const entry =
    FOUNDER_PERKS_LOCALIZED[perk] || FOUNDER_PERKS_LOCALIZED.visionary_director;
  return lang === 'ar' ? entry.ar : entry.en;
}

export const STUDIO_ASSETS_EN: Record<
  string,
  {
    name: string;
    categoryLabel: string;
    crisisShieldLabel: string;
    description: string;
  }
> = {
  soundstage_complex: {
    name: 'Private Soundstage Complex',
    categoryLabel: 'Studio Infrastructure',
    crisisShieldLabel:
      'Instant free shield against set, decor, and location permit crises',
    description:
      'Owning turnkey indoor & outdoor soundstages cuts production set costs by 12% across all future projects and resolves location crises for free.',
  },
  vfx_post_suite: {
    name: 'International VFX & Color-Grading Suite',
    categoryLabel: 'Post-Production & VFX',
    crisisShieldLabel:
      'Free resolution for VFX, editing, and corrupted footage emergencies',
    description:
      'In-house editing bays, color-grading theaters, and render farms reduce VFX costs by 10% and grant +6 Artistic Quality on every release.',
  },
  cinema_camera_fleet: {
    name: 'IMAX Cinema Camera & Lens Fleet',
    categoryLabel: 'Camera & Lighting Gear',
    crisisShieldLabel:
      'Complete protection from on-set camera, lighting, and sound breakdowns',
    description:
      'Own flagship cinema cameras and lenses instead of renting per shoot — saving 8% of production budgets while sharpening visual polish.',
  },
  legal_censorship_shield: {
    name: 'Legal Affairs & Regulatory Relations Bureau',
    categoryLabel: 'Legal & Clearance Shield',
    crisisShieldLabel:
      'Zero-cost resolution for censorship notes, lawsuits, and contract disputes',
    description:
      'Veteran entertainment attorneys neutralize regulatory clearances and contract flare-ups at zero extra cost while protecting studio prestige.',
  },
  talent_academy: {
    name: 'Star Rehearsal & Performance Academy',
    categoryLabel: 'Talent Development',
    crisisShieldLabel:
      'Prevents cast burnout, rehearsal delays, and on-set performance friction',
    description:
      'Dedicated stunt, rehearsal, and acting facility that cuts prep costs by 7% and lifts cast readiness and audience buzz.',
  },
};

export const PR_CAMPAIGNS_EN: Record<
  string,
  {
    title: string;
    badgeLabel: string;
    impactSummary: string;
    description: string;
  }
> = {
  support_film_trolls: {
    title: 'Fan Buzz Boost Campaign (2M)',
    badgeLabel: 'Rapid Fan Boost · 2M',
    impactSummary: '+12 Public Hype · Flips social feeds into instant rave buzz',
    description:
      'Activate coordinated fan communities across X and TikTok to flood feeds with hype and turn word-of-mouth in your favor immediately.',
  },
  rival_rumor_trolls: {
    title: 'Leak Rival Production Rumors (5M)',
    badgeLabel: 'Rumor Warfare · 5M',
    impactSummary: '-18% Rival Revenue · -35M Rival Studio Value · Trend Takeover',
    description:
      'Seed behind-the-scenes rumors about script trouble on a rival shoot to cool their momentum and pull moviegoers to your screens.',
  },
  tiktok_viral_wave: {
    title: 'TikTok Viral Clips & Behind-the-Scenes Wave',
    badgeLabel: 'TikTok · #1 Trending Clips',
    impactSummary: '+15 Public Hype · +0.5 Audience Score · +12% Revenue Lift',
    description:
      'Partner with top creators to drop electrifying clips and set moments on TikTok, pulling young and family crowds into theaters and streams.',
  },
  x_hashtag_storm: {
    title: 'Trending Hashtag Storm on X',
    badgeLabel: 'Platform X · #1 Entertainment Trend',
    impactSummary: '+18 Public Hype · +14M Market Value · +15% Box Office Boost',
    description:
      'Dominate the #1 trending spot across entertainment timelines to lock your title and studio at the center of cultural conversation.',
  },
  rival_smear_campaign: {
    title: 'Full-Scale Counter-PR Blitz Against Rivals',
    badgeLabel: 'Heavy PR Offensive · Rival Takedown',
    impactSummary: '-22% Rival Revenue · -48M Rival Valuation · Rank Climb',
    description:
      'Unleash a relentless X and TikTok counter-campaign dissecting flaws in a rival blockbuster to steal the seasonal spotlight.',
  },
  critics_vip_screening: {
    title: 'VIP Red-Carpet Screening for Top Critics',
    badgeLabel: 'VIP Press · Critical Acclaim',
    impactSummary: '+0.6 Critic Score · +4% Studio Reputation · +10 Public Hype',
    description:
      'Host an exclusive press premiere for leading film critics and columnists to lift review scores and supercharge annual awards momentum.',
  },
};

export interface LocalizedMarketDisplay {
  id: WorldMarketId;
  countryName: string;
  shortName: string;
  nativeTitle: string;
  marketHeadline: string;
  hqSubtitle: string;
  cardSummary: string;
  highlights: string[];
  badgeLabel: string;
  currencyLabel: string;
  currencyFullName: string;
  defaultStudioName: string;
  defaultCeoName: string;
  studioNameSuggestions: string[];
  filmSeasons: MarketFilmSeasonOption[];
  seriesSeasonPrimaryLabel: string;
  seriesSeasonPrimarySub: string;
  seriesSeasonOffLabel: string;
  seriesSeasonOffSub: string;
  expansionMarkets: MarketConfig[];
}

const MARKET_EN_DISPLAY: Record<WorldMarketId, LocalizedMarketDisplay> = {
  egypt: {
    id: 'egypt',
    countryName: 'Egypt',
    shortName: 'Egypt',
    nativeTitle: 'Egypt — Hollywood of the East',
    marketHeadline: 'Eid Blockbusters, Ramadan Drama Race & Egyptian Box Office',
    hqSubtitle: 'Cairo · Media Production City',
    cardSummary:
      'Launch from the historic heart of Middle Eastern cinema; conquer Eid box-office seasons and the Ramadan TV marathon to build a lasting empire.',
    highlights: ['Eid Seasons', 'Ramadan Race', 'Cairo Box Office', 'Currency: EGP'],
    badgeLabel: 'Open Now',
    currencyLabel: 'EGP',
    currencyFullName: 'Egyptian Pound',
    defaultStudioName: 'Scorpion Pictures',
    defaultCeoName: 'Alex Mercer',
    studioNameSuggestions: [
      'Golden Nile Studios',
      'Cleopatra Pictures',
      'Cairo Cinema House',
      'Horus Films',
      'Sphinx Entertainment',
    ],
    filmSeasons: [
      {
        id: 'eid_adha',
        label: 'Eid Al-Adha Blockbuster Season',
        bonus: 'Peak Box Office (+25%)',
        risk: 'Fierce Competition',
      },
      {
        id: 'eid_fitr',
        label: 'Eid Al-Fitr Holiday Season',
        bonus: 'Strong Ticket Surge (+18%)',
        risk: 'High Competition',
      },
      {
        id: 'summer',
        label: 'Summer Cinema Season',
        bonus: 'Steady Returns (+12%)',
        risk: 'Moderate Competition',
      },
      {
        id: 'mid_year',
        label: 'Mid-Year Winter Break',
        bonus: 'Lower Marketing Cost (+6%)',
        risk: 'Calm Competition',
      },
    ],
    seriesSeasonPrimaryLabel: 'Ramadan Drama Marathon',
    seriesSeasonPrimarySub: 'Peak ad deals & viewership (+35%), fierce rivalry',
    seriesSeasonOffLabel: 'Off-Season Streaming Window',
    seriesSeasonOffSub: 'High spotlight on streaming platforms with calmer competition',
    expansionMarkets: [
      {
        id: 'egypt',
        name: 'Egyptian Market (Hollywood of the East)',
        description:
          'Your home territory — huge cinema turnout during Eid holidays and the legendary Ramadan TV race.',
        unlockMarketValue: 0,
        earlyLicenseCost: 0,
        distributionFeePerProject: 0,
        revenueBonusFactor: 1.0,
        budgetMultiplier: 1.0,
        revenueMultiplier: 1.0,
      },
      {
        id: 'gulf',
        name: 'Saudi & Gulf Market (IMAX & Streaming)',
        description:
          'Opens powerhouse Gulf multiplexes and boosts total project revenue by +45% for a regional distribution fee.',
        unlockMarketValue: 220_000_000,
        earlyLicenseCost: 22_000_000,
        distributionFeePerProject: 6_000_000,
        revenueBonusFactor: 0.45,
        budgetMultiplier: 1.35,
        revenueMultiplier: 1.45,
      },
      {
        id: 'europe',
        name: 'European & Diaspora Circuit',
        description:
          'Theatrical rollout across European capitals and international festivals adds +65% revenue and boosts award prestige.',
        unlockMarketValue: 450_000_000,
        earlyLicenseCost: 48_000_000,
        distributionFeePerProject: 12_000_000,
        revenueBonusFactor: 0.65,
        budgetMultiplier: 1.75,
        revenueMultiplier: 1.65,
      },
      {
        id: 'hollywood',
        name: 'Worldwide Global Distribution',
        description:
          'Maximum international theatrical and streaming reach — surges total earnings by +110% for high-craft releases.',
        unlockMarketValue: 850_000_000,
        earlyLicenseCost: 95_000_000,
        distributionFeePerProject: 24_000_000,
        revenueBonusFactor: 1.1,
        budgetMultiplier: 2.5,
        revenueMultiplier: 2.1,
      },
    ],
  },
  saudi: {
    id: 'saudi',
    countryName: 'Saudi Arabia',
    shortName: 'Saudi Arabia',
    nativeTitle: 'Saudi Arabia — Riyadh Season & Gulf Cinema',
    marketHeadline: 'IMAX Screens, Riyadh Season, Red Sea Festival & Gulf Platforms',
    hqSubtitle: 'Riyadh · Boulevard City · AlUla Studios',
    cardSummary:
      'Lead the booming Saudi and Gulf cinema wave; premiere in luxury IMAX halls during Riyadh Season and compete at the Red Sea Film Festival.',
    highlights: ['Riyadh Season', 'IMAX Screens', 'Red Sea Festival', 'Currency: SAR'],
    badgeLabel: 'Open Now',
    currencyLabel: 'SAR',
    currencyFullName: 'Saudi Riyal',
    defaultStudioName: 'Diriyah Pictures',
    defaultCeoName: 'Faisal Al-Otaibi',
    studioNameSuggestions: [
      'Diriyah Pictures',
      'Riyadh Cinema Group',
      'AlUla Studios',
      'Tuwaiq Entertainment',
      'Boulevard Films',
    ],
    filmSeasons: [
      {
        id: 'eid_adha',
        label: 'Riyadh Cinema Season',
        bonus: 'Highest IMAX Box Office (+25%)',
        risk: 'Fierce Competition',
      },
      {
        id: 'eid_fitr',
        label: 'Eid Al-Adha Season',
        bonus: 'Massive Family Turnout (+18%)',
        risk: 'High Competition',
      },
      {
        id: 'summer',
        label: 'Eid Al-Fitr Season',
        bonus: 'Strong Steady Returns (+12%)',
        risk: 'Moderate Competition',
      },
      {
        id: 'mid_year',
        label: 'Jeddah & Eastern Summer',
        bonus: 'Lower Marketing Cost (+6%)',
        risk: 'Calm Competition',
      },
    ],
    seriesSeasonPrimaryLabel: 'Gulf Ramadan Season',
    seriesSeasonPrimarySub: 'Major sponsorships & platform dominance (+35%), fierce rivalry',
    seriesSeasonOffLabel: 'Streaming Originals & Weekend Slate',
    seriesSeasonOffSub: 'Wide reach across Gulf VIP streaming platforms with calmer rivalry',
    expansionMarkets: [
      {
        id: 'gulf',
        name: 'Saudi Home Market (Riyadh, Jeddah & Dammam)',
        description:
          'Your base market — flagship IMAX theaters, Riyadh Season crowds, and the region’s highest ticket yields.',
        unlockMarketValue: 0,
        earlyLicenseCost: 0,
        distributionFeePerProject: 0,
        revenueBonusFactor: 1.0,
        budgetMultiplier: 1.0,
        revenueMultiplier: 1.0,
      },
      {
        id: 'egypt',
        name: 'Egyptian & Pan-Arab Market',
        description:
          'Unlocks Egypt’s massive theatrical footprint and regional TV syndication for +45% extra revenue.',
        unlockMarketValue: 220_000_000,
        earlyLicenseCost: 22_000_000,
        distributionFeePerProject: 6_000_000,
        revenueBonusFactor: 0.45,
        budgetMultiplier: 1.35,
        revenueMultiplier: 1.45,
      },
      {
        id: 'europe',
        name: 'European & Diaspora Circuit',
        description:
          'Premieres across European capitals and international festivals add +65% revenue and awards prestige.',
        unlockMarketValue: 450_000_000,
        earlyLicenseCost: 48_000_000,
        distributionFeePerProject: 12_000_000,
        revenueBonusFactor: 0.65,
        budgetMultiplier: 1.75,
        revenueMultiplier: 1.65,
      },
      {
        id: 'hollywood',
        name: 'Worldwide Global Distribution',
        description:
          'Full international theatrical & global streaming rollout — boosts total revenue by +110%.',
        unlockMarketValue: 850_000_000,
        earlyLicenseCost: 95_000_000,
        distributionFeePerProject: 24_000_000,
        revenueBonusFactor: 1.1,
        budgetMultiplier: 2.5,
        revenueMultiplier: 2.1,
      },
    ],
  },
  turkey: {
    id: 'turkey',
    countryName: 'Turkey',
    shortName: 'Turkey',
    nativeTitle: 'Türkiye — Istanbul Dizi & Cinema',
    marketHeadline: 'Istanbul Drama Hits, Weekly Ratings Race & Golden Butterfly',
    hqSubtitle: 'Istanbul · Bosphorus',
    cardSummary:
      'Istanbul drama exports, weekly TV ratings battles, and the Golden Butterfly Awards.',
    highlights: ['Istanbul Dizi', 'Weekly Ratings', 'Golden Butterfly'],
    badgeLabel: 'Coming Soon',
    currencyLabel: 'TRY',
    currencyFullName: 'Turkish Lira',
    defaultStudioName: 'Bosphorus Studios',
    defaultCeoName: 'Kerem Ozturk',
    studioNameSuggestions: ['Bosphorus Studios', 'Istanbul Films', 'Galata Media'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'Winter Dizi Season',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'Summer Slate',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
  },
  korea: {
    id: 'korea',
    countryName: 'South Korea',
    shortName: 'Korea',
    nativeTitle: 'South Korea — K-Drama & Seoul Box Office',
    marketHeadline: 'Seoul & Busan, Global Streaming Hits, Baeksang & Blue Dragon',
    hqSubtitle: 'Seoul · Busan',
    cardSummary:
      'Seoul box-office thrillers, global streaming originals, and Baeksang & Blue Dragon honors.',
    highlights: ['Seoul & Busan', 'Global Streaming', 'Baeksang Awards'],
    badgeLabel: 'Coming Soon',
    currencyLabel: 'KRW',
    currencyFullName: 'Korean Won',
    defaultStudioName: 'Seoul Studios',
    defaultCeoName: 'Min-ho Kim',
    studioNameSuggestions: ['Seoul Studios', 'Busan Pictures', 'Hangang Films'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'Prime K-Drama Season',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'Streaming Originals',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
  },
  usa: {
    id: 'usa',
    countryName: 'United States',
    shortName: 'Hollywood',
    nativeTitle: 'USA — Hollywood',
    marketHeadline: 'Global Box Office, Summer Tentpoles & The Oscars',
    hqSubtitle: 'Los Angeles · Hollywood',
    cardSummary:
      'Worldwide tentpole blockbusters, global IMAX openings, and the race for the Academy Awards.',
    highlights: ['Global Box Office', 'Summer Tentpoles', 'Academy Awards'],
    badgeLabel: 'Coming Soon',
    currencyLabel: 'USD',
    currencyFullName: 'US Dollar',
    defaultStudioName: 'Sunset Studios',
    defaultCeoName: 'Lucas Vance',
    studioNameSuggestions: ['Sunset Studios', 'Hollywood Prime', 'Pacific Pictures'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'Summer Tentpole Slate',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'Awards Season',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
  },
};

export function getLocalizedMarketInfo(
  worldMarket?: WorldMarketId | null,
  lang?: UiLanguageId | null
): LocalizedMarketDisplay {
  const safeId: WorldMarketId =
    worldMarket && worldMarket in MARKET_EN_DISPLAY ? worldMarket : 'egypt';

  if (lang !== 'ar') {
    return MARKET_EN_DISPLAY[safeId];
  }

  const p = getMarketProfile(safeId);
  return {
    id: p.id,
    countryName: p.countryNameAr,
    shortName:
      p.id === 'turkey'
        ? 'تركيا'
        : p.id === 'korea'
        ? 'كوريا'
        : p.id === 'usa'
        ? 'هوليوود'
        : p.countryNameAr,
    nativeTitle: p.nativeTitle,
    marketHeadline: p.marketHeadline,
    hqSubtitle: p.hqSubtitle,
    cardSummary: p.cardSummary,
    highlights: p.highlights,
    badgeLabel: p.badgeLabel,
    currencyLabel: p.currencyLabel,
    currencyFullName: p.currencyFullName,
    defaultStudioName: p.defaultStudioName,
    defaultCeoName: p.defaultCeoName,
    studioNameSuggestions: p.studioNameSuggestions,
    filmSeasons: p.filmSeasons,
    seriesSeasonPrimaryLabel: p.seriesSeasonPrimaryLabel,
    seriesSeasonPrimarySub: p.seriesSeasonPrimarySub,
    seriesSeasonOffLabel: p.seriesSeasonOffLabel,
    seriesSeasonOffSub: p.seriesSeasonOffSub,
    expansionMarkets: p.expansionMarkets,
  };
}

export function getLocalizedExpansionMarkets(
  worldMarket?: WorldMarketId | null,
  lang?: UiLanguageId | null
): MarketConfig[] {
  const info = getLocalizedMarketInfo(worldMarket, lang);
  if (info.expansionMarkets.length > 0) return info.expansionMarkets;
  return getLocalizedMarketInfo('egypt', lang).expansionMarkets;
}

export function getLocalizedMarketRegionName(
  region: MarketRegion,
  worldMarket?: WorldMarketId | null,
  lang?: UiLanguageId | null
): string {
  const list = getLocalizedExpansionMarkets(worldMarket, lang);
  const found = list.find((m) => m.id === region);
  if (found) return found.name;
  return region;
}

/**
 * Cleanly translates festival names, award categories, platforms, and Arabic talent/studio
 * names into crisp readable English when `lang === 'en'`, while leaving Arabic untouched in AR mode.
 */
const KNOWN_ENGLISH_ENTITY_MAP: Record<string, string> = {
  // Festivals
  'مهرجان القاهرة السينمائي الدولي': 'Cairo International Film Festival',
  'مهرجان الجونة السينمائي': 'El Gouna Film Festival',
  'مهرجان البحر الأحمر السينمائي': 'Red Sea International Film Festival',
  'مهرجان البحر الأحمر السينمائي الدولي': 'Red Sea International Film Festival',
  'حفل جوائز صناع الترفيه': 'Joy Entertainment Awards',
  'جوائز صناع الترفيه (Joy Awards)': 'Joy Entertainment Awards',
  'مهرجان الإسكندرية السينمائي': 'Alexandria Mediterranean Film Festival',
  'مهرجان أفلام السعودية': 'Saudi Film Festival',
  'جوائز الموريكس دور': 'Murex d’Or Awards',
  'مهرجان كان السينمائي': 'Cannes Film Festival',
  // Platforms & Channels
  'شاهد VIP': 'Shahid VIP',
  'واتش إت': 'Watch It',
  'نتفليكس': 'Netflix MENA',
  'نتفليكس الشرق الأوسط': 'Netflix MENA',
  'أو إس إن بلس': 'OSN+',
  'يانجو بلاي': 'Yango Play',
  'فيو العربية': 'Viu Arabia',
  'شاشات بلس': 'Shashat Plus',
  'نجوم VIP': 'Nojoom VIP',
  'المتحدون ميديا جروب': 'Al-Muttahidun Media Group',
  'سيرجي للإنتاج الفني': 'Synergy Art Productions',
  'العدلي جروب للدراما': 'Al-Adly Drama Group',
  'نيو سينما للقرن الجديد': 'New Century Cinema',
  'السباعي للإنتاج السينمائي': 'Al-Sebaie Film Productions',
  'استوديوهات العلا للإنتاج': 'AlUla Production Studios',
  'مجموعة الدرعية ميديا': 'Diriyah Media Group',
  'بوليفارد بيكتشرز': 'Boulevard Pictures',
  'أفلام البحر الأحمر': 'Red Sea Films',
  'المملكة للترفيه': 'Kingdom Entertainment',
  // Award categories
  'أفضل فيلم / عمل درامي': 'Best Picture / Drama Series',
  'أفضل إخراج': 'Best Director',
  'أفضل ممثل رئيسي': 'Best Lead Actor',
  'أفضل سيناريو': 'Best Screenplay',
  'أفضل تصوير ومؤثرات': 'Best Cinematography & VFX',
  'جائزة اختيار الجمهور': 'Audience Choice Award',
};

const ARABIC_CHAR_LATIN_MAP: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'g',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ة: 'a',
  و: 'w',
  ؤ: 'o',
  ي: 'y',
  ى: 'a',
  ئ: 'e',
  ء: '',
};

const COMMON_ARABIC_NAME_WORDS: Record<string, string> = {
  أحمد: 'Ahmed',
  احمد: 'Ahmed',
  محمد: 'Mohamed',
  محمود: 'Mahmoud',
  كريم: 'Karim',
  أمير: 'Amir',
  امير: 'Amir',
  عمر: 'Omar',
  عمرو: 'Amr',
  يوسف: 'Youssef',
  طارق: 'Tarek',
  خالد: 'Khaled',
  وليد: 'Walid',
  ياسر: 'Yasser',
  ماجد: 'Maged',
  تامر: 'Tamer',
  هشام: 'Hisham',
  عادل: 'Adel',
  مراد: 'Mourad',
  سيف: 'Seif',
  آدم: 'Adam',
  زياد: 'Ziad',
  مروان: 'Marwan',
  شريف: 'Sherif',
  حسين: 'Hussein',
  حسن: 'Hassan',
  إبراهيم: 'Ibrahim',
  مصطفى: 'Mostafa',
  باسم: 'Bassem',
  باسل: 'Bassel',
  رامي: 'Ramy',
  هاني: 'Hany',
  أشرف: 'Ashraf',
  فيصل: 'Faisal',
  سعود: 'Saud',
  فهد: 'Fahad',
  بندر: 'Bandar',
  راكان: 'Rakan',
  تركي: 'Turki',
  نايف: 'Naif',
  طلال: 'Talal',
  سعد: 'Saad',
  سلطان: 'Sultan',
  نواف: 'Nawaf',
  عبدالله: 'Abdullah',
  عبد: 'Abdel',
  الرحمن: 'Rahman',
  العزيز: 'Aziz',
  المجيد: 'Magid',
  منى: 'Mona',
  ياسمين: 'Yasmine',
  نيللي: 'Nelly',
  منة: 'Menna',
  هند: 'Hend',
  يسرا: 'Yousra',
  غادة: 'Ghada',
  دنيا: 'Donia',
  ريهام: 'Reham',
  نادين: 'Nadine',
  أمينة: 'Amina',
  أسماء: 'Asmaa',
  سوسن: 'Sawsan',
  ليلى: 'Laila',
  سلمى: 'Salma',
  سارة: 'Sara',
  نورة: 'Noura',
  نور: 'Nour',
  ريم: 'Reem',
  مريم: 'Mariam',
  دينا: 'Dina',
  زينة: 'Zeina',
  هنا: 'Hana',
  تارا: 'Tara',
  مي: 'Mai',
  آية: 'Aya',
  سماح: 'Samah',
  فريدة: 'Farida',
  العنود: 'Al-Anoud',
  لمى: 'Lama',
  جود: 'Joud',
  ستوديوز: 'Studios',
  بيكتشرز: 'Pictures',
  سينما: 'Cinema',
  فيلمز: 'Films',
  ميديا: 'Media',
  جروب: 'Group',
  للإنتاج: 'Productions',
  الفني: 'Art',
  السينمائي: 'Cinema',
  مهرجان: 'Festival',
  قناة: 'TV',
  شبكة: 'Network',
  منصة: 'Platform',
};

function hasArabicChars(str: string): boolean {
  return /[\u0600-\u06FF]/.test(str);
}

/**
 * Renders any Arabic talent/studio/festival/platform name into clean English when `lang === 'en'`.
 * Already-Latin names pass through untouched!
 */
export function localizeEntityName(
  rawName: string | undefined | null,
  lang?: UiLanguageId | null
): string {
  const name = String(rawName || '').trim();
  if (!name || lang === 'ar' || !hasArabicChars(name)) return name;
  if (KNOWN_ENGLISH_ENTITY_MAP[name]) return KNOWN_ENGLISH_ENTITY_MAP[name];

  const words = name.split(/\s+/);
  const converted = words.map((word) => {
    const cleaned = word.replace(/[\u064B-\u0652]/g, '');
    if (!hasArabicChars(cleaned)) return cleaned;
    if (COMMON_ARABIC_NAME_WORDS[cleaned]) return COMMON_ARABIC_NAME_WORDS[cleaned];

    let prefix = '';
    let core = cleaned;
    if (core.startsWith('ال') && core.length > 3) {
      prefix = 'Al-';
      core = core.slice(2);
      if (COMMON_ARABIC_NAME_WORDS[core]) {
        return `${prefix}${COMMON_ARABIC_NAME_WORDS[core]}`;
      }
    }

    let out = '';
    for (let i = 0; i < core.length; i++) {
      const ch = core[i];
      if (ch === 'و' && i > 0) {
        out += i === core.length - 1 ? 'o' : 'ou';
      } else if (ch === 'ي' && i > 0) {
        out += i === core.length - 1 ? 'y' : 'i';
      } else if (ARABIC_CHAR_LATIN_MAP[ch] !== undefined) {
        out += ARABIC_CHAR_LATIN_MAP[ch];
      } else {
        out += ch;
      }
    }
    const squeezed = out.replace(/(.)\1{2,}/g, '$1$1').replace(/^a+/, 'A');
    const titled = squeezed
      ? squeezed.charAt(0).toUpperCase() + squeezed.slice(1)
      : cleaned;
    return `${prefix}${titled}`;
  });

  return converted.join(' ');
}

/**
 * Translates Arabic actor archetypes & crew specialties into natural English phrases in EN mode.
 */
export function localizeTalentBio(
  rawBio: string | undefined | null,
  lang?: UiLanguageId | null,
  fallbackRole?: string
): string {
  const text = String(rawBio || '').trim();
  if (!text || lang === 'ar' || !hasArabicChars(text)) return text;

  const tags: string[] = [];
  if (/أسطورة|عميد|إمبراطور|شيخ|الزعيم|أيقونة/.test(text)) tags.push('Legendary');
  else if (/نجم|نجمة|ملك|ملكة|فارس|سيدة|بطل|بطلة/.test(text)) tags.push('Star');
  else if (/صاعد|صاعدة|شاب|شابة|جديد/.test(text)) tags.push('Rising');
  else if (/عبقري|أستاذ|خبير|رائد|معلم/.test(text)) tags.push('Master');

  const domains: string[] = [];
  if (/شباك/.test(text)) domains.push('Box-Office');
  if (/أكشن|مطاردات|معارك/.test(text)) domains.push('Action');
  if (/كوميد|ضاحك|بهجة|ارتجال|إفيهات/.test(text)) domains.push('Comedy');
  if (/رومانس/.test(text)) domains.push('Romance');
  if (/رعب|ما وراء الطبيعة/.test(text)) domains.push('Horror');
  if (/نفس|مركب|غموض|جريمة|تشويق|إثارة|تحقيق/.test(text)) domains.push('Thriller');
  if (/تاريخ|ملحم|سير/.test(text)) domains.push('Historical Epic');
  if (/فانتازيا|أساطير/.test(text)) domains.push('Fantasy');
  if (/أبطال خارق/.test(text)) domains.push('Superhero');
  if (/شعبي|الحارة|واقعي|اجتماعي|دراما/.test(text)) domains.push('Drama');
  if (/مهرجان/.test(text)) domains.push('Festival Prestige');
  if (/تصوير|كاميرا|إضاءة|بصري|كادرات/.test(text)) domains.push('Cinematography');
  if (/موسيق|ألحان|سمفوني/.test(text)) domains.push('Film Score');
  if (/مونتاج|مؤثرات|جرافيكس|خدع/.test(text)) domains.push('Editing & VFX');
  if (/إخراج|مخرج/.test(text)) domains.push('Directing');

  const uniqueDomains = Array.from(new Set(domains)).slice(0, 3);
  if (uniqueDomains.length > 0) {
    const prefix = tags[0] ? `${tags[0]} ` : '';
    const suffix =
      fallbackRole === 'director'
        ? 'Director'
        : fallbackRole === 'cinematographer'
        ? 'Cinematographer'
        : fallbackRole === 'composer'
        ? 'Composer'
        : fallbackRole === 'editor_vfx'
        ? 'VFX & Post Specialist'
        : 'Performer';
    return `${prefix}${uniqueDomains.join(' & ')} ${suffix}`.trim();
  }

  return fallbackRole === 'director'
    ? 'Acclaimed Cinema & Drama Director'
    : 'Acclaimed Screen Talent';
}
