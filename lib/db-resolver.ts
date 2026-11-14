import defaultDbRaw from '@/data/default_db.json';

export type GenreId =
  | 'action'
  | 'popular_drama'
  | 'comedy'
  | 'light_comedy'
  | 'psychological_horror'
  | 'supernatural_horror'
  | 'crime_mystery'
  | 'sci_fi'
  | 'romance'
  | 'historical'
  | 'biography'
  | 'heist'
  | 'fantasy'
  | 'superhero';

export interface GenreInfo {
  id: GenreId;
  name: string;
  enName: string;
  description: string;
}

export const GENRES: GenreInfo[] = [
  { id: 'action', name: 'أكشن ومطاردات', enName: 'Action', description: 'مشاهد قتالية وانفجارات تجذب شباك التذاكر' },
  { id: 'popular_drama', name: 'دراما شعبية / حارة', enName: 'Popular / Street Drama', description: 'صراعات الحارة والانتقام الشعبي المحبب للجمهور' },
  { id: 'comedy', name: 'كوميديا ساخرة / سوداء', enName: 'Satire / Dark Comedy', description: 'كوميديا ذكية تحمل رسائل نقدية عميقة' },
  { id: 'light_comedy', name: 'كوميديا عائلية / خفيفة', enName: 'Slapstick / Light Comedy', description: 'ضحك عائلي مضمون لجميع الأعمار' },
  { id: 'psychological_horror', name: 'رعب نفسي', enName: 'Psychological Thriller', description: 'توتر نفسي وغموض يثير إعجاب النقاد' },
  { id: 'supernatural_horror', name: 'رعب ما وراء الطبيعة', enName: 'Supernatural Horror', description: 'أساطير مرعبة وتأثيرات بصرية تجذب الشباب' },
  { id: 'crime_mystery', name: 'غموض وتحقيقات بوليسية', enName: 'Crime & Mystery', description: 'جرائم معقدة وألغاز تحبس الأنفاس' },
  { id: 'sci_fi', name: 'خيال علمي ومستقبلي', enName: 'Sci-Fi & Cyberpunk', description: 'عوالم مستقبلية تتطلب خدعاً بصرية ضخمة' },
  { id: 'romance', name: 'رومانسي درامي', enName: 'Romance & Melodrama', description: 'قصص حب مؤثرة وموسيقى تصويرية ساحرة' },
  { id: 'historical', name: 'تاريخي وحربي', enName: 'Historical & War Epic', description: 'ملاحم تاريخية ضخمة الإنتاج والديكورات' },
  { id: 'biography', name: 'سيرة ذاتية', enName: 'Biography', description: 'قصص شخصيات استثنائية تنافس بقوة في المهرجانات' },
  { id: 'heist', name: 'سرقة وعمليات معقدة', enName: 'Heist', description: 'تخطيط ذكي وعصابات محترفة وإيقاع سريع' },
  { id: 'fantasy', name: 'فانتازيا وأساطير', enName: 'Fantasy', description: 'عوالم سحرية وأساطير قديمة مبهرة بصرياً' },
  { id: 'superhero', name: 'أبطال خارقين', enName: 'Superhero', description: 'قوى خارقة ومعارك ملحمية عالية التكلفة' },
];

export interface ActorItem {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  tier: 'S' | 'A' | 'B' | 'C';
  image_url: string;
  base_salary: number;
  archetype?: string;
  unlockDay?: number;
  isRisingDiscovery?: boolean;
  isAiGenerated?: boolean;
  status?: 'active' | 'retired' | 'deceased';
  busyUntilDay?: number;
  busyWithStudio?: string;
  lastEvolutionNote?: string;
  overallDelta?: number;
  stats: {
    overall: number;
    acting: number;
    charisma: number;
    box_office_pull: number;
    ego: number;
  };
  genre_mastery: Partial<Record<GenreId, number>>;
}

export type CrewRole = 'director' | 'writer' | 'cinematographer' | 'composer' | 'editor_vfx';

export interface CrewItem {
  id: string;
  name: string;
  role: CrewRole;
  image_url: string;
  base_salary: number;
  stats: {
    overall: number;
    vision: number;
    pacing: number;
    efficiency: number;
    control?: number;
    plot_strength?: number;
    dialogue?: number;
  };
  best_genres: string[];
}

export interface CompetitorStudio {
  id: string;
  name: string;
  ceoName?: string;
  logo_url: string;
  market_power: number;
  preferred_genres: string[];
  isEmergingStudio?: boolean;
  foundedYear?: number;
}

export interface StreamingPlatform {
  id: string;
  name: string;
  logo_url: string;
  budget_capacity: number;
  platform_type?: 'digital_platform' | 'tv_channel';
}

export interface FestivalItem {
  id: string;
  name: string;
  logo_url: string;
  prestige: number;
}

export interface MasterDatabase {
  meta: {
    pack_name: string;
    version: string;
  };
  actors: ActorItem[];
  crew: CrewItem[];
  competitor_studios: CompetitorStudio[];
  streaming_platforms: StreamingPlatform[];
  festivals: FestivalItem[];
}

export const CUSTOM_DB_STORAGE_KEY = 'hyptrix_custom_db';

// Curated rosters to build a complete 100-actor market + 20 rising talents that emerge over time
const EXTRA_MALE_NAMES = [
  'ياسين عبد المقصود', 'آدم الشرقاوي', 'حمزة السيوفي', 'عمران الفرماوي', 'فارس الدمرداش',
  'كريم الأسيوطي', 'تيمور الششتاوي', 'نديم الغمراوي', 'باهر السنهوري', 'رامي القليوبي',
  'وليد العشماوي', 'معتز الدسوقي', 'شادي الزيناتي', 'إيهاب السنباطي', 'ماجد الألفي',
  'حازم البنا', 'شريف الطرابيشي', 'أدهم الكيلاني', 'محمود السروجي', 'سامح النقاش',
  'خالد المهدي', 'زياد الحلواني', 'نبيل الجندي', 'مراد الخولي', 'رشيد التلاوي',
  'فادي العطار', 'تامر السعدني', 'جلال المنيري', 'عاصم الرفاعي', 'منصور الشربيني',
  'وسيم الببلاوي', 'رائد الفيومي', 'سراج العدوي', 'هيثم الجابري', 'بلال الشاذلي',
  'أكرم الزيات', 'نادر القاضي', 'بسام التميمي', 'غسان المراغي', 'كمال الأباصيري',
  'فؤاد الدالي', 'سليم الأنصاري', 'جمال العيسوي', 'عزت الهواري', 'لطفي المنشاوي',
];

const EXTRA_FEMALE_NAMES = [
  'سلمى الأرنؤوطي', 'دليلة الشافعي', 'مريم الجوهري', 'نورهان البدري', 'تارا العقاد',
  'ياسمين السويفي', 'كارمن البلتاجي', 'ملك الديب', 'رقية الحناوي', 'سارة المنياوي',
  'لينا الفخراني', 'هدى الطويل', 'كاميليا الشيمي', 'أميرة النجار', 'غادة السعيد',
  'رانيا الملاح', 'شيرين الأزهري', 'تقى الفيومي', 'دينا العلايلي', 'بسمة الغزالي',
  'هاجر السنهوري', 'شهد الكردي', 'ندى الوكيل', 'حلا المنصوري', 'مايا الزيني',
  'إنجي العروسي', 'ريم الشناوي', 'رضوى التهامي', 'سمر القبطان', 'نهى الفرماوي',
  'عاليا السيوطي', 'جيهان الدجوي', 'لورا الحكيم', 'ميرنا الحلواني', 'سندس الألفي',
  'يارا البنا', 'فجر الششتاوي', 'آية الدمرداش', 'رباب السيوفي', 'لمياء الخولي',
  'سهير الجارحي', 'نيرمين المهدي',
];

const RISING_TALENT_PROFILES: {
  name: string;
  gender: 'male' | 'female';
  archetype: string;
  primaryGenre: GenreId;
  secondaryGenre: GenreId;
  unlockDay: number;
}[] = [
  { name: 'مالك النبراوي', gender: 'male', archetype: 'نجم أكشن صاعد بقوة', primaryGenre: 'action', secondaryGenre: 'heist', unlockDay: 5 },
  { name: 'سيلا الغندور', gender: 'female', archetype: 'موهبة دراما نفسية', primaryGenre: 'psychological_horror', secondaryGenre: 'romance', unlockDay: 12 },
  { name: 'يحيى الفضالي', gender: 'male', archetype: 'كوميديان ارتجالي موهوب', primaryGenre: 'comedy', secondaryGenre: 'light_comedy', unlockDay: 20 },
  { name: 'كنزي الشافعي', gender: 'female', archetype: 'بطلة مسلسلات رمضانية', primaryGenre: 'popular_drama', secondaryGenre: 'crime_mystery', unlockDay: 30 },
  { name: 'عز الدين البارودي', gender: 'male', archetype: 'شرير كاريزمي استثنائي', primaryGenre: 'crime_mystery', secondaryGenre: 'action', unlockDay: 42 },
  { name: 'ليان الألفي', gender: 'female', archetype: 'وجه سينمائي عالمي', primaryGenre: 'sci_fi', secondaryGenre: 'fantasy', unlockDay: 55 },
  { name: 'داوود السوهاجي', gender: 'male', archetype: 'بطل الملاحم التاريخية', primaryGenre: 'historical', secondaryGenre: 'biography', unlockDay: 70 },
  { name: 'نغم الدمنهوري', gender: 'female', archetype: 'ملكة الرومانسية الحديثة', primaryGenre: 'romance', secondaryGenre: 'light_comedy', unlockDay: 85 },
  { name: 'ريان الشربيني', gender: 'male', archetype: 'عبقري أفلام الغموض', primaryGenre: 'crime_mystery', secondaryGenre: 'psychological_horror', unlockDay: 105 },
  { name: 'جودت العطار', gender: 'male', archetype: 'نجم الحارة الشعبية الجديد', primaryGenre: 'popular_drama', secondaryGenre: 'action', unlockDay: 125 },
  { name: 'ميرا الكيلاني', gender: 'female', archetype: 'بطلة الفانتازيا والرعب', primaryGenre: 'supernatural_horror', secondaryGenre: 'fantasy', unlockDay: 150 },
  { name: 'صفوان المنشاوي', gender: 'male', archetype: 'خريج أول معهد التمثيل', primaryGenre: 'biography', secondaryGenre: 'popular_drama', unlockDay: 180 },
  { name: 'تيا الجوهري', gender: 'female', archetype: 'نجمة شباك كوميدية', primaryGenre: 'light_comedy', secondaryGenre: 'comedy', unlockDay: 210 },
  { name: 'نزار الهواري', gender: 'male', archetype: 'بطل أفلام السطو والذكاء', primaryGenre: 'heist', secondaryGenre: 'sci_fi', unlockDay: 245 },
  { name: 'فريدة السنهوري', gender: 'female', archetype: 'أيقونة المهرجانات القادمة', primaryGenre: 'biography', secondaryGenre: 'historical', unlockDay: 280 },
  { name: 'بدران التميمي', gender: 'male', archetype: 'مقاتل الفنون القتالية', primaryGenre: 'action', secondaryGenre: 'superhero', unlockDay: 320 },
  { name: 'سيرين الملاح', gender: 'female', archetype: 'نجمة التشويق البوليسي', primaryGenre: 'crime_mystery', secondaryGenre: 'heist', unlockDay: 360 },
  { name: 'تميم الأنصاري', gender: 'male', archetype: 'موهبة المسرح القومي', primaryGenre: 'historical', secondaryGenre: 'popular_drama', unlockDay: 400 },
  { name: 'لارا البلتاجي', gender: 'female', archetype: 'نجمة المنصات الرقمية', primaryGenre: 'psychological_horror', secondaryGenre: 'sci_fi', unlockDay: 450 },
  { name: 'جسور الفرماوي', gender: 'male', archetype: 'بطل خارق للجيل الجديد', primaryGenre: 'superhero', secondaryGenre: 'action', unlockDay: 500 },
];

const ARCHETYPE_BY_GENRE: Record<GenreId, string> = {
  action: 'بطل أكشن ومطاردات',
  popular_drama: 'نجم دراما شعبية',
  comedy: 'كوميديان ساخر',
  light_comedy: 'نجم كوميديا عائلية',
  psychological_horror: 'متخصص دراما نفسية',
  supernatural_horror: 'نجم تشويق ورعب',
  crime_mystery: 'بطل غموض وبوليسي',
  sci_fi: 'نجم خيال علمي',
  romance: 'أيقونة رومانسية',
  historical: 'بطل ملاحم تاريخية',
  biography: 'ممثل شخصيات مركبة',
  heist: 'نجم أفلام السطو والذكاء',
  fantasy: 'بطل فانتازيا وأساطير',
  superhero: 'نجم أبطال خارقين',
};

const ALL_GENRE_IDS: GenreId[] = GENRES.map((g) => g.id);

function buildExpanded100ActorRoster(baseActors: ActorItem[]): ActorItem[] {
  const result: ActorItem[] = baseActors.map((a, idx) => {
    const topGenre =
      (Object.entries(a.genre_mastery).sort((x, y) => (y[1] || 0) - (x[1] || 0))[0]?.[0] as GenreId) ||
      ALL_GENRE_IDS[idx % ALL_GENRE_IDS.length];
    return {
      ...a,
      archetype: a.archetype || ARCHETYPE_BY_GENRE[topGenre],
      unlockDay: 1,
      isRisingDiscovery: false,
    };
  });

  let maleIdx = 0;
  let femaleIdx = 0;

  while (result.length < 100) {
    const idx = result.length + 1;
    const isFemale = idx % 2 === 0;
    const name = isFemale
      ? EXTRA_FEMALE_NAMES[femaleIdx++ % EXTRA_FEMALE_NAMES.length]
      : EXTRA_MALE_NAMES[maleIdx++ % EXTRA_MALE_NAMES.length];

    // Distribute across S (12%), A (28%), B (35%), C (25%)
    const tier: 'S' | 'A' | 'B' | 'C' =
      idx <= 16 ? 'S' : idx <= 44 ? 'A' : idx <= 78 ? 'B' : 'C';

    const baseOverall =
      tier === 'S'
        ? 90 + (idx % 6)
        : tier === 'A'
        ? 82 + (idx % 7)
        : tier === 'B'
        ? 74 + (idx % 7)
        : 66 + (idx % 7);

    const acting = Math.min(98, Math.max(62, baseOverall + ((idx * 3) % 9) - 4));
    const charisma = Math.min(98, Math.max(62, baseOverall + ((idx * 5) % 9) - 4));
    const pull = Math.min(99, Math.max(60, baseOverall + ((idx * 7) % 9) - 4));
    const ego =
      tier === 'S'
        ? 82 + (idx % 15)
        : tier === 'A'
        ? 70 + (idx % 18)
        : tier === 'B'
        ? 55 + (idx % 20)
        : 40 + (idx % 20);

    const salary =
      tier === 'S'
        ? (30 + (idx % 16)) * 1_000_000
        : tier === 'A'
        ? (14 + (idx % 12)) * 1_000_000
        : tier === 'B'
        ? (6 + (idx % 7)) * 1_000_000
        : (2 + (idx % 4)) * 1_000_000;

    const g1 = ALL_GENRE_IDS[idx % ALL_GENRE_IDS.length];
    const g2 = ALL_GENRE_IDS[(idx * 3 + 2) % ALL_GENRE_IDS.length];
    const g3 = ALL_GENRE_IDS[(idx * 5 + 4) % ALL_GENRE_IDS.length];

    const mastery: Partial<Record<GenreId, number>> = {
      [g1]: Math.min(98, baseOverall + 5),
      [g2]: Math.min(95, baseOverall + 2),
      [g3]: Math.min(90, baseOverall - 3),
    };

    result.push({
      id: `act_${idx}`,
      name,
      gender: isFemale ? 'female' : 'male',
      age: 21 + ((idx * 7) % 34),
      tier,
      image_url: '',
      base_salary: salary,
      archetype: ARCHETYPE_BY_GENRE[g1],
      unlockDay: 1,
      isRisingDiscovery: false,
      stats: {
        overall: baseOverall,
        acting,
        charisma,
        box_office_pull: pull,
        ego,
      },
      genre_mastery: mastery,
    });
  }

  // Add the 20 Dynamic Rising Talents that emerge as game days progress
  RISING_TALENT_PROFILES.forEach((p, i) => {
    const idNum = 101 + i;
    const tier: 'A' | 'B' = i % 3 === 0 ? 'A' : 'B';
    const overall = tier === 'A' ? 85 + (i % 5) : 78 + (i % 6);
    result.push({
      id: `act_rising_${idNum}`,
      name: p.name,
      gender: p.gender,
      age: 20 + (i % 8),
      tier,
      image_url: '',
      base_salary: tier === 'A' ? 11_000_000 + (i % 5) * 1_000_000 : 5_500_000 + (i % 4) * 500_000,
      archetype: `موهبة صاعدة · ${p.archetype}`,
      unlockDay: p.unlockDay,
      isRisingDiscovery: true,
      stats: {
        overall,
        acting: Math.min(96, overall + 4),
        charisma: Math.min(96, overall + 3),
        box_office_pull: overall - 2,
        ego: 48 + (i % 15),
      },
      genre_mastery: {
        [p.primaryGenre]: 94,
        [p.secondaryGenre]: 89,
      },
    });
  });

  return result;
}

const EXPANDED_BASE_DB: MasterDatabase = (() => {
  const raw = defaultDbRaw as unknown as MasterDatabase;
  return {
    ...raw,
    actors: buildExpanded100ActorRoster(raw.actors),
  };
})();

export function validateCustomDatabase(raw: unknown): { valid: boolean; error?: string; data?: Partial<MasterDatabase> } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'ملف البيانات غير صالح.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.meta && !obj.actors && !obj.crew && !obj.competitor_studios && !obj.streaming_platforms && !obj.festivals) {
    return { valid: false, error: 'الملف لا يحتوي على أقسام البيانات المطلوبة.' };
  }
  return { valid: true, data: obj as Partial<MasterDatabase> };
}

export function mergeDatabases(baseDb: MasterDatabase, customPatch?: Partial<MasterDatabase> | null): MasterDatabase {
  if (!customPatch) return baseDb;

  const customActorsMap = new Map<string, Partial<ActorItem>>();
  const extraActors: ActorItem[] = [];
  if (Array.isArray(customPatch.actors)) {
    for (const a of customPatch.actors) {
      if (a && typeof a.id === 'string') {
        if (baseDb.actors.some((b) => b.id === a.id)) {
          customActorsMap.set(a.id, a);
        } else if (a.name && a.stats) {
          extraActors.push(a as ActorItem);
        }
      }
    }
  }

  const mergedActors: ActorItem[] = [
    ...baseDb.actors.map((baseActor) => {
      const patch = customActorsMap.get(baseActor.id);
      if (!patch) return baseActor;
      return {
        ...baseActor,
        ...patch,
        name: patch.name || baseActor.name,
        image_url: patch.image_url !== undefined ? patch.image_url : baseActor.image_url,
        base_salary: patch.base_salary ?? baseActor.base_salary,
        stats: {
          ...baseActor.stats,
          ...(patch.stats || {}),
        },
        genre_mastery: {
          ...baseActor.genre_mastery,
          ...(patch.genre_mastery || {}),
        },
      };
    }),
    ...extraActors,
  ];

  const customCrewMap = new Map<string, Partial<CrewItem>>();
  const extraCrew: CrewItem[] = [];
  if (Array.isArray(customPatch.crew)) {
    for (const c of customPatch.crew) {
      if (c && typeof c.id === 'string') {
        if (baseDb.crew.some((b) => b.id === c.id)) {
          customCrewMap.set(c.id, c);
        } else if (c.name && c.role && c.stats) {
          extraCrew.push(c as CrewItem);
        }
      }
    }
  }

  const mergedCrew: CrewItem[] = [
    ...baseDb.crew.map((baseMember) => {
      const patch = customCrewMap.get(baseMember.id);
      if (!patch) return baseMember;
      return {
        ...baseMember,
        ...patch,
        name: patch.name || baseMember.name,
        image_url: patch.image_url !== undefined ? patch.image_url : baseMember.image_url,
        base_salary: patch.base_salary ?? baseMember.base_salary,
        stats: {
          ...baseMember.stats,
          ...(patch.stats || {}),
        },
        best_genres: patch.best_genres || baseMember.best_genres,
      };
    }),
    ...extraCrew,
  ];

  const mergeSimpleList = <T extends { id: string; name: string }>(baseList: T[], patchList?: Partial<T>[]): T[] => {
    if (!Array.isArray(patchList)) return baseList;
    const map = new Map<string, Partial<T>>();
    const extras: T[] = [];
    for (const item of patchList) {
      if (item && typeof item.id === 'string') {
        if (baseList.some((b) => b.id === item.id)) {
          map.set(item.id, item);
        } else if (item.name) {
          extras.push(item as T);
        }
      }
    }
    return [
      ...baseList.map((b) => {
        const p = map.get(b.id);
        return p ? { ...b, ...p, name: p.name || b.name } : b;
      }),
      ...extras,
    ];
  };

  return {
    meta: {
      pack_name: customPatch.meta?.pack_name || baseDb.meta.pack_name,
      version: customPatch.meta?.version || baseDb.meta.version,
    },
    actors: mergedActors,
    crew: mergedCrew,
    competitor_studios: mergeSimpleList(baseDb.competitor_studios, customPatch.competitor_studios),
    streaming_platforms: mergeSimpleList(baseDb.streaming_platforms, customPatch.streaming_platforms),
    festivals: mergeSimpleList(baseDb.festivals, customPatch.festivals),
  };
}

export function getResolvedDatabase(customPatchOverride?: Partial<MasterDatabase> | null): MasterDatabase {
  const baseDb = EXPANDED_BASE_DB;
  if (customPatchOverride !== undefined) {
    return mergeDatabases(baseDb, customPatchOverride);
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(CUSTOM_DB_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MasterDatabase>;
        return mergeDatabases(baseDb, parsed);
      }
    } catch {
      // Fallback to defaultDb
    }
  }
  return baseDb;
}
