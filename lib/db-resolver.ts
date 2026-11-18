import defaultDbJson from '@/data/default_db.json';

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
  icon: string;
  description: string;
}

export const GENRES: GenreInfo[] = [
  { id: 'action', name: 'أكشن ومطاردات', icon: 'Flame', description: 'معارك، مطاردات، وإثارة عالية الميزانية' },
  { id: 'popular_drama', name: 'دراما شعبية', icon: 'Users', description: 'صراعات الحارة والبطولات الجماهيرية' },
  { id: 'comedy', name: 'كوميديا ساخرة', icon: 'Smile', description: 'مواقف كوميدية وإفيهات جماهيرية' },
  { id: 'light_comedy', name: 'لايت كوميدي عائلي', icon: 'Sparkles', description: 'كوميديا عائلية خفيفة ومبهجة' },
  { id: 'psychological_horror', name: 'رعب نفسي', icon: 'Brain', description: 'توتر نفسي وغموض يحبس الأنفاس' },
  { id: 'supernatural_horror', name: 'رعب ما وراء الطبيعة', icon: 'Ghost', description: 'لعنات، أساطير، وأجواء مرعبة' },
  { id: 'crime_mystery', name: 'جريمة وغموض', icon: 'Search', description: 'تحقيقات بوليسية وألغاز معقدة' },
  { id: 'sci_fi', name: 'خيال علمي', icon: 'Rocket', description: 'عوالم مستقبلية وتقنيات متطورة' },
  { id: 'romance', name: 'رومانسية', icon: 'Heart', description: 'قصص حب ومشاعر إنسانية دافئة' },
  { id: 'historical', name: 'تاريخي وملحمي', icon: 'Crown', description: 'ملاحم تاريخية وحقب زمنية كبرى' },
  { id: 'biography', name: 'سيرة ذاتية', icon: 'BookOpen', description: 'قصص حياة شخصيات مؤثرة وتاريخية' },
  { id: 'heist', name: 'سطو وذكاء', icon: 'KeyRound', description: 'خطط سرقة محكمة وخداع بصري' },
  { id: 'fantasy', name: 'فانتازيا وأساطير', icon: 'Wand2', description: 'عوالم سحرية وأساطير خيالية' },
  { id: 'superhero', name: 'أبطال خارقين', icon: 'Shield', description: 'قوى خارقة ومعارك إنقاذ كبرى' },
];

export interface ActorStats {
  overall: number;
  acting: number;
  charisma: number;
  box_office_pull: number;
  ego: number;
}

export interface ActorItem {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'M' | 'F';
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
  overallDelta?: number;
  lastEvolutionNote?: string;
  stats: ActorStats;
  genre_mastery: Partial<Record<GenreId, number>>;
}

export type CrewRole =
  | 'director'
  | 'writer'
  | 'cinematographer'
  | 'composer'
  | 'editor_vfx';

export interface CrewStats {
  overall: number;
  vision: number;
  pacing: number;
  efficiency: number;
  control?: number;
  plot_strength?: number;
  dialogue?: number;
}

export interface CrewItem {
  id: string;
  name: string;
  role: CrewRole;
  image_url: string;
  base_salary: number;
  specialty?: string;
  stats: CrewStats;
  best_genres: GenreId[];
}

export interface CompetitorStudio {
  id: string;
  name: string;
  ceoName?: string;
  ceo?: string;
  logo_url: string;
  market_power: number;
  estimated_net_worth?: number;
  specialty?: string;
  preferred_genres: GenreId[];
  isEmergingStudio?: boolean;
  foundedYear?: number;
}

export type CompetitorStudioItem = CompetitorStudio;

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

export type GameDatabase = MasterDatabase;

const ALL_GENRE_IDS: GenreId[] = GENRES.map((g) => g.id);

// 100% Fictional / Parody Male Actor Profiles (No real celebrity names in the default DB!)
const EXTRA_MALE_PROFILES: {
  name: string;
  age: number;
  tier: 'S' | 'A' | 'B' | 'C';
  archetype: string;
  primary: GenreId;
  secondary: GenreId;
}[] = [
  { name: 'كريم العزاوي', age: 48, tier: 'S', archetype: 'أسطورة شباك التذاكر والأكشن الكوميدي', primary: 'action', secondary: 'heist' },
  { name: 'أحمد عزمي النجار', age: 51, tier: 'S', archetype: 'فارس الأكشن والتشويق والبطولات الكبرى', primary: 'action', secondary: 'crime_mystery' },
  { name: 'أمير الكراري', age: 46, tier: 'S', archetype: 'نجم البطولات الشعبية والملاحم الوطنية', primary: 'popular_drama', secondary: 'action' },
  { name: 'أدهم الصقر', age: 50, tier: 'S', archetype: 'رائد الأكشن الحقيقي والمطاردات الخطرة', primary: 'action', secondary: 'popular_drama' },
  { name: 'محمود رضوان', age: 36, tier: 'S', archetype: 'نجم الدراما الشعبية الجماهيرية', primary: 'popular_drama', secondary: 'action' },
  { name: 'تامر حسان', age: 45, tier: 'S', archetype: 'نجم الكوميديا الرومانسية وشباك التذاكر', primary: 'light_comedy', secondary: 'romance' },
  { name: 'ماجد الكيلاني', age: 56, tier: 'S', archetype: 'عبقري التمثيل الدرامي والكوميدي', primary: 'comedy', secondary: 'crime_mystery' },
  { name: 'يحيى الفخراني الحسيني', age: 77, tier: 'S', archetype: 'عميد الدراما الكلاسيكية والتاريخية', primary: 'historical', secondary: 'biography' },
  { name: 'عادل الهمام', age: 81, tier: 'S', archetype: 'الزعيم وأسطورة الكوميديا والسينما', primary: 'comedy', secondary: 'popular_drama' },
  { name: 'أمجد حليم', age: 52, tier: 'S', archetype: 'برنس الكوميديا الذكية والفانتازيا', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'مراد الهنيدي', age: 58, tier: 'S', archetype: 'رائد كوميديا الشباك الحديثة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'خالد النبراوي', age: 56, tier: 'S', archetype: 'نجم الملاحم التاريخية والعالمية', primary: 'historical', secondary: 'biography' },
  { name: 'محمود الحميدي', age: 70, tier: 'S', archetype: 'إمبراطور الشاشة والهيبة السينمائية', primary: 'crime_mystery', secondary: 'popular_drama' },
  { name: 'هشام مجدي', age: 43, tier: 'S', archetype: 'نجم شباك الكوميديا العصرية', primary: 'comedy', secondary: 'sci_fi' },
  { name: 'مازن الهمام', age: 39, tier: 'S', archetype: 'نجم الأكشن الكوميدي الجماهيري', primary: 'action', secondary: 'comedy' },
  { name: 'تيم الحسنات', age: 47, tier: 'S', archetype: 'نجم الهيبة والبطولات التاريخية', primary: 'historical', secondary: 'action' },
  { name: 'عمرو يونس', age: 44, tier: 'A', archetype: 'نجم الإثارة والغموض والسطو', primary: 'heist', secondary: 'crime_mystery' },
  { name: 'ياسر الجلالي', age: 54, tier: 'A', archetype: 'فارس الفانتازيا والتاريخ والدراما', primary: 'fantasy', secondary: 'historical' },
  { name: 'آسر يحيى', age: 42, tier: 'A', archetype: 'نجم الأكشن العصري والغموض', primary: 'heist', secondary: 'sci_fi' },
  { name: 'أحمد المكي', age: 44, tier: 'S', archetype: 'أسطورة الكوميديا الفانتازية والشعبية', primary: 'comedy', secondary: 'fantasy' },
  { name: 'ظافر العائدي', age: 51, tier: 'A', archetype: 'نجم الرومانسية والتشويق النفسي', primary: 'romance', secondary: 'psychological_horror' },
  { name: 'باسل الخياط', age: 47, tier: 'A', archetype: 'أستاذ المركبات النفسية والغموض', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'إياد نصار الدين', age: 52, tier: 'A', archetype: 'مشخصاتي السير الذاتية والتاريخ', primary: 'biography', secondary: 'historical' },
  { name: 'قصي الخولي', age: 48, tier: 'A', archetype: 'عبقري التحولات الدرامية المركبة', primary: 'crime_mystery', secondary: 'popular_drama' },
  { name: 'أكرم أمين', age: 44, tier: 'A', archetype: 'نجم الكوميديا الدافئة وما وراء الطبيعة', primary: 'supernatural_horror', secondary: 'light_comedy' },
  { name: 'وسيم حسني', age: 49, tier: 'A', archetype: 'صانع البهجة والكوميديا الموسيقية', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'فهمي السعيد', age: 43, tier: 'A', archetype: 'كوميديان الفانتازيا والجريمة الساخرة', primary: 'comedy', secondary: 'crime_mystery' },
  { name: 'شريف شاكر', age: 44, tier: 'A', archetype: 'نجم الكوميديا الساخرة والمغامرات', primary: 'comedy', secondary: 'fantasy' },
  { name: 'فؤاد بيومي', age: 59, tier: 'A', archetype: 'جوكر الكوميديا والدراما', primary: 'light_comedy', secondary: 'comedy' },
  { name: 'سيد الرجباني', age: 72, tier: 'A', archetype: 'عملاق الأداء الواقعي والشر المركب', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'فتحي الوهاب', age: 52, tier: 'A', archetype: 'سيد أدوار الغموض والرعب النفسي', primary: 'psychological_horror', secondary: 'supernatural_horror' },
  { name: 'خالد الصاوي التميمي', age: 60, tier: 'A', archetype: 'وحش التمثيل المركب والإثارة', primary: 'crime_mystery', secondary: 'psychological_horror' },
  { name: 'عمرو سعدان', age: 46, tier: 'A', archetype: 'بطل الدراما الشعبية القوية', primary: 'popular_drama', secondary: 'action' },
  { name: 'مصطفى شعباني', age: 53, tier: 'A', archetype: 'نجم المواسم الرمضانية والحارة', primary: 'popular_drama', secondary: 'heist' },
  { name: 'شريف المنيري', age: 64, tier: 'A', archetype: 'نجم الدراما الاجتماعية والتشويق', primary: 'crime_mystery', secondary: 'romance' },
  { name: 'داود السليمان', age: 40, tier: 'A', archetype: 'نجم البطولات الشبابية والشباك', primary: 'action', secondary: 'light_comedy' },
  { name: 'باسم السمراني', age: 52, tier: 'A', archetype: 'معلم الأداء الشعبي والواقعي الحاد', primary: 'popular_drama', secondary: 'comedy' },
  { name: 'زاهر الأحمدي', age: 49, tier: 'A', archetype: 'أستاذ أدوار الانتقام والشر الدرامي', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'حمادة الهلالي', age: 44, tier: 'A', archetype: 'بطل سلاسل الرعب الروحاني والتشويق', primary: 'supernatural_horror', secondary: 'popular_drama' },
  { name: 'كريم الفهمي', age: 41, tier: 'A', archetype: 'فارس الرومانسية والأكشن العصري', primary: 'romance', secondary: 'crime_mystery' },
  { name: 'فراج المنشاوي', age: 42, tier: 'A', archetype: 'موهبة استثنائية في المركبات النفسية', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'ممدوح تايسون الشرقاوي', age: 43, tier: 'A', archetype: 'غول التمثيل الدرامي والتشويق', primary: 'crime_mystery', secondary: 'popular_drama' },
  { name: 'عيد المنصوري', age: 55, tier: 'A', archetype: 'نجم الكوميديا السوداء والدراما الثقيلة', primary: 'comedy', secondary: 'historical' },
  { name: 'جليل العامري', age: 60, tier: 'A', archetype: 'صاحب الإفيهات الساخرة والدراما', primary: 'comedy', secondary: 'popular_drama' },
  { name: 'صلاح العبدلي', age: 68, tier: 'A', archetype: 'عملاق التمثيل الأبوي والكوميدي', primary: 'popular_drama', secondary: 'light_comedy' },
  { name: 'رياض الخولاني', age: 70, tier: 'A', archetype: 'كبير الدراما الصعيدية والشعبية', primary: 'popular_drama', secondary: 'historical' },
  { name: 'حسين الفهمي الكبير', age: 82, tier: 'A', archetype: 'برنس السينما الكلاسيكية', primary: 'romance', secondary: 'biography' },
  { name: 'أشرف الباقي', age: 60, tier: 'A', archetype: 'مؤسس مسرح الكوميديا الحديث', primary: 'light_comedy', secondary: 'biography' },
  { name: 'سعداوي اللمبي', age: 55, tier: 'A', archetype: 'أسطورة الكاركترات الكوميدية الجماهيرية', primary: 'comedy', secondary: 'action' },
  { name: 'عابد الفهدي', age: 59, tier: 'A', archetype: 'عملاق الأداء التراجيدي والتاريخي', primary: 'historical', secondary: 'crime_mystery' },
  { name: 'أمجد السعداوي', age: 45, tier: 'A', archetype: 'نجم الدراما الاجتماعية الثقيلة', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'ثروت القاضي', age: 45, tier: 'A', archetype: 'قنبلة الكوميديا والارتجال السينمائي', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'بدير الكناني', age: 78, tier: 'A', archetype: 'مدرسة المسرح والدراما الوطنية', primary: 'historical', secondary: 'popular_drama' },
  { name: 'رشوان التوفيقي', age: 89, tier: 'A', archetype: 'رمز الوقار والدراما الكلاسيكية', primary: 'biography', secondary: 'popular_drama' },
  { name: 'عبد الرحمن الزهراوي', age: 88, tier: 'A', archetype: 'إمبراطور الأداء المسرحي والتاريخي', primary: 'historical', secondary: 'fantasy' },
  { name: 'هاني السلامي', age: 46, tier: 'B', archetype: 'نجم الدراما الرومانسية والغموض', primary: 'romance', secondary: 'crime_mystery' },
  { name: 'حسن الردادي', age: 40, tier: 'B', archetype: 'نجم الكوميديا والأكشن الخفيف', primary: 'light_comedy', secondary: 'action' },
  { name: 'رامز الجلالي', age: 50, tier: 'B', archetype: 'نجم كوميديا المغامرات', primary: 'light_comedy', secondary: 'comedy' },
  { name: 'فيشاوي الصغير', age: 43, tier: 'B', archetype: 'متمرد السينما المستقلة والأكشن', primary: 'crime_mystery', secondary: 'heist' },
  { name: 'حاتم المنصور', age: 36, tier: 'B', archetype: 'نجم الرومانسية والتشويق الشبابي', primary: 'romance', secondary: 'sci_fi' },
  { name: 'مصطفى الخاطري', age: 38, tier: 'B', archetype: 'كوميديان المواقف السريعة', primary: 'comedy', secondary: 'heist' },
  { name: 'حمدي المرغني', age: 36, tier: 'B', archetype: 'نجم الارتجال الكوميدي', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'صبري الفواز', age: 55, tier: 'B', archetype: 'داهية الشخصيات الدرامية', primary: 'popular_drama', secondary: 'biography' },
  { name: 'دياب الصعيدي', age: 44, tier: 'B', archetype: 'نجم أدوار الشر والجبروت الدرامي', primary: 'popular_drama', secondary: 'action' },
  { name: 'لطفي الشهم', age: 55, tier: 'B', archetype: 'نجم الأكشن والشهامة الشعبية', primary: 'action', secondary: 'popular_drama' },
  { name: 'منذر الرياحني', age: 45, tier: 'B', archetype: 'بطل الملاحم والأكشن العربي', primary: 'historical', secondary: 'action' },
  { name: 'مكسيم الخليل', age: 45, tier: 'B', archetype: 'نجم الدراما النفسية والتشويق', primary: 'psychological_horror', secondary: 'romance' },
  { name: 'نيقولا المعوض', age: 44, tier: 'B', archetype: 'نجم الرومانسية والدراما العربية', primary: 'romance', secondary: 'biography' },
  { name: 'معتصم النهاري', age: 39, tier: 'B', archetype: 'نجم البطولات العربية المشتركة', primary: 'action', secondary: 'romance' },
  { name: 'هاني الرمزي', age: 59, tier: 'B', archetype: 'نجم الكوميديا السياسية والاجتماعية', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'آدم القرموطي', age: 65, tier: 'B', archetype: 'صاحب الكاركترات الكوميدية الشهيرة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'قمر الإسكندراني', age: 57, tier: 'B', archetype: 'نجم الأفلام الغنائية والرومانسية', primary: 'romance', secondary: 'light_comedy' },
  { name: 'رزق البحيري', age: 47, tier: 'B', archetype: 'نجم الكوميديا والدراما الشعبية', primary: 'popular_drama', secondary: 'comedy' },
  { name: 'محمود المغني', age: 45, tier: 'B', archetype: 'نجم الأكشن والدراما الواقعية', primary: 'action', secondary: 'crime_mystery' },
  { name: 'نور الدين النبراوي', age: 26, tier: 'B', archetype: 'نجم شباك الجيل الجديد', primary: 'light_comedy', secondary: 'popular_drama' },
  { name: 'طه الدسوقي', age: 32, tier: 'B', archetype: 'موهبة استثنائية في الكوميديا والدراما', primary: 'light_comedy', secondary: 'biography' },
  { name: 'عصام العمري', age: 31, tier: 'B', archetype: 'بطل الكوميديا الواقعية الشابة', primary: 'light_comedy', secondary: 'crime_mystery' },
  { name: 'مالك الزيات', age: 29, tier: 'B', archetype: 'نجم سينما المهرجانات والبطولات الشابة', primary: 'biography', secondary: 'historical' },
  { name: 'داش الشاب', age: 24, tier: 'B', archetype: 'نجم البطولات الشعبية الشابة', primary: 'popular_drama', secondary: 'heist' },
  { name: 'أمير المهاجر', age: 34, tier: 'B', archetype: 'نجم السينما العالمية والمصرية', primary: 'biography', secondary: 'light_comedy' },
  { name: 'صدقي الصخري', age: 39, tier: 'B', archetype: 'نجم دراما المنصات الحديثة', primary: 'crime_mystery', secondary: 'romance' },
  { name: 'كامل الباشوي', age: 61, tier: 'B', archetype: 'حائز جوائز المهرجانات الدولية', primary: 'crime_mystery', secondary: 'biography' },
  { name: 'نبيل التهامي', age: 37, tier: 'B', archetype: 'موهبة التحقيقات والرعب النفسي', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'علي القاسمي', age: 38, tier: 'B', archetype: 'نجم الأدوار الواقعية المركبة', primary: 'crime_mystery', secondary: 'heist' },
  { name: 'مجدي الصغير', age: 38, tier: 'B', archetype: 'نجم السينما المستقلة والمنصات', primary: 'psychological_horror', secondary: 'romance' },
  { name: 'شاهين المصري', age: 44, tier: 'B', archetype: 'جوكر الدراما النفسية والكوميديا', primary: 'psychological_horror', secondary: 'comedy' },
  { name: 'علاء الجبالي', age: 42, tier: 'B', archetype: 'صاحب الحضور الدرامي الطاغي', primary: 'crime_mystery', secondary: 'historical' },
  { name: 'صالح الخالدي', age: 32, tier: 'B', archetype: 'امتداد مدرسة التمثيل الأصيل', primary: 'supernatural_horror', secondary: 'popular_drama' },
  { name: 'قاسم الساحل', age: 37, tier: 'B', archetype: 'نجم أفلام المهرجانات والكوميديا', primary: 'light_comedy', secondary: 'heist' },
  { name: 'ربيع الكوميدي', age: 35, tier: 'B', archetype: 'نجم الكوميديا العفوية الشبابية', primary: 'comedy', secondary: 'fantasy' },
  { name: 'سليمان البهجت', age: 62, tier: 'B', archetype: 'تميمة البهجة في أفلام الكوميديا', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'إدوارد الساحلي', age: 51, tier: 'B', archetype: 'فاكهة الأدوار المساعدة', primary: 'light_comedy', secondary: 'popular_drama' },
  { name: 'لبيب الحكيم', age: 76, tier: 'B', archetype: 'أيقونة الكوميديا والبهجة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'مخيون الكبير', age: 79, tier: 'B', archetype: 'أيقونة الشخصيات التاريخية', primary: 'historical', secondary: 'biography' },
  { name: 'سامي المغاوري', age: 72, tier: 'B', archetype: 'خبير الكوميديا والدراما المسرحية', primary: 'comedy', secondary: 'historical' },
  { name: 'وليد الفوازي', age: 43, tier: 'C', archetype: 'ممثل الحارة والبطولات الشعبية', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'الليثي الضاحك', age: 35, tier: 'C', archetype: 'كوميديان الارتجال وخفة الظل', primary: 'light_comedy', secondary: 'comedy' },
  { name: 'إسلام البرادعي', age: 34, tier: 'C', archetype: 'نجم الكوميديا السوداء', primary: 'comedy', secondary: 'supernatural_horror' },
  { name: 'حازم الإيهابي', age: 29, tier: 'C', archetype: 'وجه شاب في الإثارة والتشويق', primary: 'crime_mystery', secondary: 'sci_fi' },
  { name: 'يوسف العثماني', age: 30, tier: 'C', archetype: 'ممثل شاب متعدد المواهب', primary: 'heist', secondary: 'romance' },
  { name: 'أنور الخالدي', age: 28, tier: 'C', archetype: 'نجم الدراما الشبابية', primary: 'action', secondary: 'popular_drama' },
  { name: 'غزي الفارس', age: 26, tier: 'C', archetype: 'موهبة شابة في السينما العالمية والمصرية', primary: 'historical', secondary: 'action' },
  { name: 'عمران الشناوي', age: 38, tier: 'C', archetype: 'ممثل الدراما العائلية والرومانسية', primary: 'romance', secondary: 'crime_mystery' },
  { name: 'نبيل العيسوي', age: 45, tier: 'C', archetype: 'ممثل الإثارة والأدوار المركبة', primary: 'crime_mystery', secondary: 'supernatural_horror' },
  { name: 'أوس المسرحي', age: 36, tier: 'C', archetype: 'كوميديان المسرح والشباك', primary: 'comedy', secondary: 'fantasy' },
  { name: 'عفيفي السريع', age: 37, tier: 'C', archetype: 'ممثل المواقف الكوميدية السريعة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'حجاج العظيم', age: 63, tier: 'C', archetype: 'ممثل الكاركترات الشعبية الكوميدية', primary: 'popular_drama', secondary: 'comedy' },
];

// 100% Fictional / Parody Female Actress Profiles
const EXTRA_FEMALE_PROFILES: {
  name: string;
  age: number;
  tier: 'S' | 'A' | 'B' | 'C';
  archetype: string;
  primary: GenreId;
  secondary: GenreId;
}[] = [
  { name: 'منى زاهر', age: 46, tier: 'S', archetype: 'سيدة الشاشة العربية وأيقونة البطولات', primary: 'biography', secondary: 'psychological_horror' },
  { name: 'ياسمين عبد المجيد', age: 43, tier: 'S', archetype: 'ملكة شباك التذاكر والكوميديا والدراما', primary: 'light_comedy', secondary: 'popular_drama' },
  { name: 'نيللي كرم', age: 48, tier: 'S', archetype: 'أيقونة الدراما النفسية والاجتماعية', primary: 'psychological_horror', secondary: 'heist' },
  { name: 'منة شهاب', age: 41, tier: 'S', archetype: 'نجمة المهرجانات العالمية والتمثيل الصادق', primary: 'romance', secondary: 'crime_mystery' },
  { name: 'هند صابر', age: 44, tier: 'S', archetype: 'نجمة البطولات المركبة وشباك التذاكر', primary: 'historical', secondary: 'crime_mystery' },
  { name: 'يسرا اللوزي الكبرى', age: 68, tier: 'S', archetype: 'أيقونة السينما والدراما العربية', primary: 'popular_drama', secondary: 'light_comedy' },
  { name: 'عبلة الكامل', age: 63, tier: 'S', archetype: 'أيقونة التلقائية والتمثيل الأصيل', primary: 'popular_drama', secondary: 'comedy' },
  { name: 'غادة الرازق', age: 53, tier: 'S', archetype: 'ملكة الدراما التلفزيونية القوية', primary: 'crime_mystery', secondary: 'popular_drama' },
  { name: 'دنيا الغانم', age: 38, tier: 'S', archetype: 'نجمة الاستعراض والكوميديا العائلية', primary: 'light_comedy', secondary: 'fantasy' },
  { name: 'ريهام الغفوري', age: 45, tier: 'S', archetype: 'سيدة التحولات التمثيلية المذهلة', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'نادين النجيم', age: 39, tier: 'S', archetype: 'ملكة الدراما العربية المشتركة', primary: 'action', secondary: 'romance' },
  { name: 'أمينة الخليل', age: 35, tier: 'A', archetype: 'نجمة الرومانسية العصرية والكوميديا', primary: 'romance', secondary: 'light_comedy' },
  { name: 'أسماء الجلال', age: 29, tier: 'A', archetype: 'نجمة الشباك والكوميديا والمنصات', primary: 'light_comedy', secondary: 'romance' },
  { name: 'سوسن البدري', age: 66, tier: 'A', archetype: 'نفرتيتي الشاشة العربية', primary: 'historical', secondary: 'supernatural_horror' },
  { name: 'إلهام الشاهين', age: 63, tier: 'A', archetype: 'نجمة الدراما الجريئة والمهرجانات', primary: 'popular_drama', secondary: 'biography' },
  { name: 'ليلى العلوي', age: 61, tier: 'A', archetype: 'قطة السينما الجميلة', primary: 'romance', secondary: 'light_comedy' },
  { name: 'درة التونسية', age: 43, tier: 'A', archetype: 'أيقونة الأناقة والدراما الاجتماعية', primary: 'romance', secondary: 'supernatural_horror' },
  { name: 'صبا المبارك', age: 43, tier: 'A', archetype: 'بطلة التشويق والدراما العربية', primary: 'crime_mystery', secondary: 'historical' },
  { name: 'حنان المطاوع', age: 44, tier: 'A', archetype: 'عملاقة الأداء النفسي والتراجيدي', primary: 'psychological_horror', secondary: 'historical' },
  { name: 'روجينا الزكي', age: 50, tier: 'A', archetype: 'نجمة الدراما الشعبية والاجتماعية', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'مي العز', age: 43, tier: 'A', archetype: 'برنسيسة الرومانسية والكوميديا', primary: 'romance', secondary: 'light_comedy' },
  { name: 'إيمي الغانم', age: 36, tier: 'A', archetype: 'ملكة الكوميديا العفوية', primary: 'comedy', secondary: 'supernatural_horror' },
  { name: 'دينا الشربيني الصغرى', age: 38, tier: 'A', archetype: 'نجمة الدراما العصرية والتشويق', primary: 'crime_mystery', secondary: 'light_comedy' },
  { name: 'زينة الوردي', age: 46, tier: 'A', archetype: 'نجمة شباك التذاكر والدراما', primary: 'popular_drama', secondary: 'action' },
  { name: 'وفاء العامر', age: 55, tier: 'A', archetype: 'سيدة الأدوار القوية والملحمية', primary: 'popular_drama', secondary: 'biography' },
  { name: 'هالة الصدقي', age: 62, tier: 'A', archetype: 'ملكة الكوميديا والدراما الرمضانية', primary: 'popular_drama', secondary: 'comedy' },
  { name: 'نبيلة العبيدي', age: 77, tier: 'A', archetype: 'نجمة الشباك الأولى الكلاسيكية', primary: 'crime_mystery', secondary: 'romance' },
  { name: 'نادية الجنداوي', age: 76, tier: 'A', archetype: 'نجمة الجماهير وأفلام الجاسوسية', primary: 'action', secondary: 'heist' },
  { name: 'ميرفت الأمين', age: 75, tier: 'A', archetype: 'جميلة السينما الكلاسيكية', primary: 'romance', secondary: 'biography' },
  { name: 'ماجدة الزكي', age: 61, tier: 'A', archetype: 'ست الكل في الدراما العائلية والكوميديا', primary: 'light_comedy', secondary: 'popular_drama' },
  { name: 'صابرين الحسيني', age: 56, tier: 'A', archetype: 'عبقرية تقمص الشخصيات التاريخية', primary: 'biography', secondary: 'historical' },
  { name: 'مي العمري', age: 35, tier: 'A', archetype: 'نجمة البطولات الرمضانية والشباك', primary: 'popular_drama', secondary: 'romance' },
  { name: 'ياسمين الصبري', age: 35, tier: 'A', archetype: 'نجمة الأكشن الرومانسي والواجهة السينمائية', primary: 'action', secondary: 'romance' },
  { name: 'هنا الزاهدي', age: 30, tier: 'A', archetype: 'باربي الشاشة ونجمة الكوميديا والرومانسية', primary: 'light_comedy', secondary: 'romance' },
  { name: 'سيرين النور', age: 46, tier: 'A', archetype: 'نجمة الرومانسية والتشويق', primary: 'romance', secondary: 'crime_mystery' },
  { name: 'ياسمين الريس', age: 38, tier: 'B', archetype: 'نجمة سينما المهرجانات والشباك', primary: 'heist', secondary: 'romance' },
  { name: 'كندة العلوش', age: 41, tier: 'B', archetype: 'نجمة الأداء الدرامي الهادئ', primary: 'crime_mystery', secondary: 'romance' },
  { name: 'شيري العادل', age: 35, tier: 'B', archetype: 'وجه الرومانسية الهادئة', primary: 'romance', secondary: 'light_comedy' },
  { name: 'أروى الجودة', age: 44, tier: 'B', archetype: 'نجمة الأناقة والشخصيات المركبة', primary: 'crime_mystery', secondary: 'sci_fi' },
  { name: 'هنا الشيحة', age: 38, tier: 'B', archetype: 'نجمة الدراما المستقلة والاجتماعية', primary: 'romance', secondary: 'psychological_horror' },
  { name: 'حلا الشيحة', age: 44, tier: 'B', archetype: 'بطلة الكلاسيكيات الرومانسية', primary: 'romance', secondary: 'light_comedy' },
  { name: 'آيتن العامر', age: 37, tier: 'B', archetype: 'نجمة الكوميديا والدراما الشعبية', primary: 'popular_drama', secondary: 'light_comedy' },
  { name: 'انتصار البهجة', age: 52, tier: 'B', archetype: 'نجمة الكوميديا الساخرة', primary: 'comedy', secondary: 'popular_drama' },
  { name: 'سلوى الخطاب', age: 64, tier: 'B', archetype: 'صاحبة الحضور المسرحي والدرامي', primary: 'supernatural_horror', secondary: 'popular_drama' },
  { name: 'جميلة العوضي', age: 32, tier: 'B', archetype: 'نجمة البطولات النفسية الشابة', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'سلمى الضيف', age: 30, tier: 'B', archetype: 'نجمة دراما المنصات والمهرجانات', primary: 'popular_drama', secondary: 'psychological_horror' },
  { name: 'تارا العماد', age: 30, tier: 'B', archetype: 'نجمة الأكشن والرومانسية العصرية', primary: 'action', secondary: 'romance' },
  { name: 'آية السماحي', age: 31, tier: 'B', archetype: 'نجمة الكوميديا والمنصات الرقمية', primary: 'light_comedy', secondary: 'supernatural_horror' },
  { name: 'جيهان الشماشرجي الصغرى', age: 33, tier: 'B', archetype: 'تألق لافت في الدراما والسينما', primary: 'popular_drama', secondary: 'romance' },
  { name: 'بوسي نور', age: 70, tier: 'B', archetype: 'أيقونة الرومانسية السينمائية', primary: 'romance', secondary: 'biography' },
  { name: 'سمية الخشابي', age: 57, tier: 'B', archetype: 'نجمة الدراما الشعبية والاستعراضية', primary: 'popular_drama', secondary: 'supernatural_horror' },
  { name: 'فيفي العبد', age: 70, tier: 'B', archetype: 'أيقونة الحضور الشعبي والكوميدي', primary: 'popular_drama', secondary: 'comedy' },
  { name: 'إنعام السالوسي', age: 84, tier: 'B', archetype: 'بهجة الشاشة الأصيلة', primary: 'light_comedy', secondary: 'biography' },
  { name: 'فردوس الحميد', age: 76, tier: 'B', archetype: 'سيدة الملاحم الدرامية الكبرى', primary: 'historical', secondary: 'popular_drama' },
  { name: 'شيماء السيف', age: 35, tier: 'B', archetype: 'نجمة الكوميديا التلقائية', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'نسرين الطافش', age: 41, tier: 'B', archetype: 'نجمة الدراما العربية والرومانسية', primary: 'romance', secondary: 'historical' },
  { name: 'بشرى الشامسي', age: 47, tier: 'B', archetype: 'فنانة شاملة في التمثيل والإنتاج', primary: 'light_comedy', secondary: 'romance' },
  { name: 'لقاء الخميس', age: 45, tier: 'B', archetype: 'نجمة الكوميديا الاجتماعية والدراما', primary: 'light_comedy', secondary: 'crime_mystery' },
  { name: 'رانيا اليوسفي', age: 49, tier: 'B', archetype: 'نجمة الإثارة والدراما الاجتماعية', primary: 'crime_mystery', secondary: 'popular_drama' },
  { name: 'عبير الصبري', age: 52, tier: 'B', archetype: 'نجمة الدراما المركبة', primary: 'popular_drama', secondary: 'crime_mystery' },
  { name: 'نجلاء البدري', age: 49, tier: 'B', archetype: 'نجمة أدوار التشويق والغموض', primary: 'psychological_horror', secondary: 'crime_mystery' },
  { name: 'سهر الصايغ الصغرى', age: 34, tier: 'B', archetype: 'موهبة استثنائية في الدراما والشر النفسي', primary: 'supernatural_horror', secondary: 'popular_drama' },
  { name: 'هدى المفتي الشابة', age: 29, tier: 'B', archetype: 'وجه سينمائي شاب في الأكشن والرومانسية', primary: 'romance', secondary: 'action' },
  { name: 'مايان السعيد', age: 26, tier: 'C', archetype: 'نجمة الجيل الشاب الصاعدة', primary: 'romance', secondary: 'light_comedy' },
  { name: 'رحمة الأحمد', age: 29, tier: 'C', archetype: 'موهبة الكوميديا الصاعدة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'نشوى المصطفى', age: 55, tier: 'C', archetype: 'نجمة الكوميديا العائلية الدافئة', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'بدرية الطلبة', age: 52, tier: 'C', archetype: 'صاحبة الإفيهات الشعبية الشهيرة', primary: 'comedy', secondary: 'popular_drama' },
  { name: 'ويزو الضاحكة', age: 33, tier: 'C', archetype: 'كوميديانة المسرح والسينما', primary: 'comedy', secondary: 'light_comedy' },
  { name: 'هاجر الأحمدي', age: 29, tier: 'C', archetype: 'وجه سينمائي شاب في الرومانسية', primary: 'romance', secondary: 'popular_drama' },
  { name: 'هنادي المهنا', age: 27, tier: 'C', archetype: 'نجمة شابة في الكوميديا والرومانسية', primary: 'light_comedy', secondary: 'romance' },
  { name: 'ليلى الزاهر', age: 21, tier: 'C', archetype: 'موهبة الجيل الجديد في الدراما', primary: 'romance', secondary: 'light_comedy' },
  { name: 'فدوى العابد', age: 41, tier: 'C', archetype: 'موهبة الكوميديا الاجتماعية الساخرة', primary: 'light_comedy', secondary: 'comedy' },
];

function buildExpanded160ActorRoster(seedActors: ActorItem[]): ActorItem[] {
  const result: ActorItem[] = seedActors.map((a) => ({
    ...a,
    unlockDay: 1,
    isRisingDiscovery: false,
    status: a.status || 'active',
  }));

  const usedNames = new Set(result.map((a) => a.name.trim()));
  let idxCounter = result.length + 1;

  const createProfiledActor = (
    prof: {
      name: string;
      age: number;
      tier: 'S' | 'A' | 'B' | 'C';
      archetype: string;
      primary: GenreId;
      secondary: GenreId;
    },
    gender: 'male' | 'female'
  ): ActorItem => {
    const n = idxCounter++;
    const baseOvr =
      prof.tier === 'S'
        ? 90 + (n % 6)
        : prof.tier === 'A'
        ? 84 + (n % 6)
        : prof.tier === 'B'
        ? 78 + (n % 6)
        : 71 + (n % 6);

    const acting = Math.min(98, baseOvr + ((n * 3) % 5) - 1);
    const charisma = Math.min(98, baseOvr + ((n * 7) % 5) - 1);
    const box_office_pull = Math.min(99, baseOvr + ((n * 5) % 6) - 2);
    const ego =
      prof.tier === 'S'
        ? 82 + (n % 15)
        : prof.tier === 'A'
        ? 68 + (n % 18)
        : prof.tier === 'B'
        ? 54 + (n % 16)
        : 42 + (n % 14);

    const base_salary =
      prof.tier === 'S'
        ? (24 + (n % 12)) * 1_000_000
        : prof.tier === 'A'
        ? (12 + (n % 8)) * 1_000_000
        : prof.tier === 'B'
        ? (5 + (n % 5)) * 1_000_000
        : (1.8 + (n % 3) * 0.7) * 1_000_000;

    const thirdGenre = ALL_GENRE_IDS[(n * 3) % ALL_GENRE_IDS.length];

    return {
      id: `act_${n}`,
      name: prof.name,
      gender,
      age: prof.age,
      tier: prof.tier,
      image_url: '',
      base_salary: Math.round(base_salary),
      archetype: prof.archetype,
      unlockDay: 1,
      isRisingDiscovery: false,
      status: 'active',
      stats: {
        overall: baseOvr,
        acting,
        charisma,
        box_office_pull,
        ego,
      },
      genre_mastery: {
        [prof.primary]: Math.min(98, baseOvr + 5),
        [prof.secondary]: Math.min(96, baseOvr + 2),
        [thirdGenre]: Math.max(70, baseOvr - 4),
      },
    };
  };

  for (const m of EXTRA_MALE_PROFILES) {
    if (usedNames.has(m.name)) continue;
    usedNames.add(m.name);
    result.push(createProfiledActor(m, 'male'));
  }

  for (const f of EXTRA_FEMALE_PROFILES) {
    if (usedNames.has(f.name)) continue;
    usedNames.add(f.name);
    result.push(createProfiledActor(f, 'female'));
  }

  return result;
}

// 100% Fictional / Parody Crew Roster (Directors, DOPs, Composers, Editors/VFX)
const EXTRA_DIRECTORS: {
  name: string;
  ovr: number;
  salary: number;
  specialty: string;
  best_genres: GenreId[];
}[] = [
  { name: 'مروان حافظ', ovr: 95, salary: 16_500_000, specialty: 'أسطورة الإخراج الملحمي والأكشن والغموض النفسي', best_genres: ['action', 'historical', 'psychological_horror', 'crime_mystery'] },
  { name: 'بطرس فهمي', ovr: 92, salary: 14_000_000, specialty: 'صانع سلاسل الأكشن والملاحم الوطنية والتاريخية', best_genres: ['action', 'historical', 'superhero', 'popular_drama'] },
  { name: 'تامر محسن الزيادي', ovr: 93, salary: 13_500_000, specialty: 'أستاذ الدراما النفسية والخطوط الزمنية المتشابكة', best_genres: ['crime_mystery', 'psychological_horror', 'romance'] },
  { name: 'كاملة الذكري', ovr: 92, salary: 13_000_000, specialty: 'مخرجة الواقعية الاجتماعية والكوميديا الإنسانية', best_genres: ['popular_drama', 'light_comedy', 'biography'] },
  { name: 'ياسين التاجي', ovr: 91, salary: 12_500_000, specialty: 'عرّاب الدراما التاريخية والملحمية الكبرى', best_genres: ['historical', 'biography', 'crime_mystery'] },
  { name: 'شريف علام', ovr: 95, salary: 17_000_000, specialty: 'شيخ المخرجين وصانع الكلاسيكيات والأفلام الضخمة', best_genres: ['action', 'comedy', 'historical', 'heist'] },
  { name: 'سامي الجندي', ovr: 90, salary: 13_000_000, specialty: 'ملك الدراما الشعبية الجماهيرية والصراعات الحادة', best_genres: ['popular_drama', 'action', 'crime_mystery'] },
  { name: 'نادر جلال الدين', ovr: 91, salary: 12_800_000, specialty: 'ملك الأكشن السينمائي السريع والتشويق البوليسي', best_genres: ['action', 'heist', 'crime_mystery'] },
  { name: 'عمرو سلامة الذهبي', ovr: 88, salary: 9_500_000, specialty: 'رائد الفانتازيا وما وراء الطبيعة والكوميديا', best_genres: ['supernatural_horror', 'light_comedy', 'fantasy'] },
  { name: 'دياب العالمي', ovr: 90, salary: 11_800_000, specialty: 'مخرج الأبطال الخارقين والإثارة العالمية', best_genres: ['superhero', 'action', 'psychological_horror'] },
  { name: 'أحمد الجنداوي', ovr: 90, salary: 11_500_000, specialty: 'رائد مدرسة الكوميديا الحديثة والباروديا الذكية', best_genres: ['comedy', 'light_comedy', 'fantasy'] },
  { name: 'رامي الهمام', ovr: 88, salary: 10_000_000, specialty: 'خبير الكوميديا الجماهيرية الكبرى والدراما الساخرة', best_genres: ['comedy', 'light_comedy', 'popular_drama'] },
  { name: 'معتز التوني الصغير', ovr: 87, salary: 8_500_000, specialty: 'صانع البهجة والكوميديا العائلية السريعة', best_genres: ['comedy', 'light_comedy', 'heist'] },
  { name: 'هاني الخليفة', ovr: 89, salary: 10_500_000, specialty: 'مخرج الدراما الواقعية الحساسة والتشويق النفسي', best_genres: ['romance', 'psychological_horror', 'crime_mystery'] },
  { name: 'خالد المرعي', ovr: 89, salary: 10_200_000, specialty: 'مخرج الفانتازيا والكوميديا السوداء والدراما', best_genres: ['comedy', 'fantasy', 'historical'] },
  { name: 'حسين المنباوي الكناني', ovr: 88, salary: 9_200_000, specialty: 'مخرج الأكشن التاريخي والبطولات الجماهيرية', best_genres: ['action', 'historical', 'popular_drama'] },
  { name: 'طارق العريان الميرغني', ovr: 92, salary: 14_500_000, specialty: 'إمبراطور أفلام الأكشن والعصابات والمعارك', best_genres: ['action', 'heist', 'crime_mystery'] },
  { name: 'كريم الشناوي المخرج', ovr: 88, salary: 9_200_000, specialty: 'مخرج التشويق النفسي والدراما الاجتماعية المعاصرة', best_genres: ['psychological_horror', 'crime_mystery', 'romance'] },
  { name: 'شاكر خضير', ovr: 90, salary: 11_000_000, specialty: 'مخرج الرومانسية الكلاسيكية والتشويق الدرامي', best_genres: ['romance', 'historical', 'light_comedy'] },
  { name: 'مريم العوفي', ovr: 86, salary: 8_000_000, specialty: 'مخرجة التشويق الاجتماعي والكوميديا الراقية', best_genres: ['light_comedy', 'crime_mystery', 'supernatural_horror'] },
];

const EXTRA_DOPS: {
  name: string;
  ovr: number;
  salary: number;
  specialty: string;
  best_genres: GenreId[];
}[] = [
  { name: 'أحمد المرسي البصري', ovr: 94, salary: 6_500_000, specialty: 'عبقري التصوير السينمائي والملاحم البصرية', best_genres: ['action', 'historical', 'psychological_horror', 'heist'] },
  { name: 'تيمور النور', ovr: 91, salary: 5_200_000, specialty: 'تصوير الكادرات الملحمية والإضاءة الساحرة', best_genres: ['historical', 'fantasy', 'comedy'] },
  { name: 'مازن المتجول السينمائي', ovr: 92, salary: 5_600_000, specialty: 'إضاءة المعارك الكبرى والعروض البصرية العالمية', best_genres: ['action', 'superhero', 'sci_fi'] },
  { name: 'عبد السلام موسى الكاميرا', ovr: 90, salary: 4_800_000, specialty: 'التصوير الجوي وحركة الكاميرا السريعة', best_genres: ['action', 'crime_mystery', 'heist'] },
  { name: 'بشاري الضوئي', ovr: 89, salary: 4_400_000, specialty: 'إضاءة الغموض والتشويق النفسي والكادرات الواقعية', best_genres: ['psychological_horror', 'supernatural_horror', 'crime_mystery'] },
  { name: 'حسين عسر العدسة', ovr: 89, salary: 4_500_000, specialty: 'تصوير المطاردات وتكوينات الشاشة العريضة', best_genres: ['action', 'heist', 'sci_fi'] },
  { name: 'سامح السليم', ovr: 88, salary: 4_100_000, specialty: 'الكاميرا المحمولة والدراما الاجتماعية الحية', best_genres: ['popular_drama', 'light_comedy', 'romance'] },
  { name: 'أيمن المكارم', ovr: 87, salary: 3_800_000, specialty: 'الألوان الدافئة والتصوير التاريخي والكلاسيكي', best_genres: ['historical', 'biography', 'romance'] },
  { name: 'نانسي الفتاح', ovr: 87, salary: 3_900_000, specialty: 'الصورة الشاعرية وسينما المهرجانات', best_genres: ['romance', 'biography', 'light_comedy'] },
  { name: 'فيكتور الكريدي', ovr: 88, salary: 4_200_000, specialty: 'الواقعية البصرية الحادة وأفلام الغموض', best_genres: ['crime_mystery', 'psychological_horror'] },
];

const EXTRA_COMPOSERS: {
  name: string;
  ovr: number;
  salary: number;
  specialty: string;
  best_genres: GenreId[];
}[] = [
  { name: 'عمر الخيرات', ovr: 96, salary: 7_800_000, specialty: 'أسطورة الموسيقى التصويرية الأوركسترالية الخالدة', best_genres: ['historical', 'biography', 'romance', 'popular_drama'] },
  { name: 'هشام النزيه', ovr: 95, salary: 7_200_000, specialty: 'الموسيقار العالمي للملاحم والأساطير والغموض', best_genres: ['action', 'historical', 'psychological_horror', 'superhero'] },
  { name: 'ياسر الرحماني', ovr: 94, salary: 6_200_000, specialty: 'شجن الكمان الشرقي والملاحم الدرامية الكبرى', best_genres: ['popular_drama', 'historical', 'biography'] },
  { name: 'راجح الداودي', ovr: 92, salary: 5_400_000, specialty: 'الموسيقى السينمائية العميقة وأفلام المهرجانات', best_genres: ['biography', 'romance', 'crime_mystery'] },
  { name: 'خالد الكمار السيمفوني', ovr: 91, salary: 4_900_000, specialty: 'التوزيع السيمفوني الحديث والخيال الدرامي', best_genres: ['supernatural_horror', 'fantasy', 'sci_fi'] },
  { name: 'أمين بوحافة التونسي', ovr: 91, salary: 5_100_000, specialty: 'الموسيقى العالمية الساحرة والتشويق النفسي', best_genres: ['psychological_horror', 'crime_mystery', 'historical'] },
  { name: 'تامر الكروان', ovr: 90, salary: 4_600_000, specialty: 'موسيقى التوتر النفسي والغموض والدراما الحديثة', best_genres: ['crime_mystery', 'romance', 'popular_drama'] },
  { name: 'عمرو إسماعيل الإيقاعي', ovr: 89, salary: 4_200_000, specialty: 'موسيقى الأكشن والإيقاعات الحماسية والملحمية', best_genres: ['action', 'heist', 'supernatural_horror'] },
];

const EXTRA_EDITORS_VFX: {
  name: string;
  ovr: number;
  salary: number;
  specialty: string;
  best_genres: GenreId[];
}[] = [
  { name: 'أحمد الحافظ للمونتاج', ovr: 94, salary: 6_000_000, specialty: 'مونتاج الإثارة العالمي وتقفيل الخطوط المتوازية', best_genres: ['action', 'superhero', 'psychological_horror', 'heist'] },
  { name: 'عمرو العاكف للجرافيك', ovr: 90, salary: 4_600_000, specialty: 'بناء العوالم الافتراضية والجرافيك ثلاثي الأبعاد CGI', best_genres: ['sci_fi', 'fantasy', 'historical', 'superhero'] },
  { name: 'دينا الفاروق', ovr: 89, salary: 4_200_000, specialty: 'المونتاج الدرامي النفسي وضبط الإيقاع التمثيلي', best_genres: ['psychological_horror', 'romance', 'crime_mystery'] },
  { name: 'معتز الكاتب السريع', ovr: 88, salary: 3_900_000, specialty: 'مونتاج الكوميديا السريعة والمطاردات', best_genres: ['comedy', 'light_comedy', 'action'] },
  { name: 'رحيب العويلي VFX', ovr: 87, salary: 3_800_000, specialty: 'تصميم الخدع البصرية والانفجارات الرقمية VFX', best_genres: ['action', 'supernatural_horror', 'sci_fi'] },
  { name: 'سلافة النور', ovr: 86, salary: 3_500_000, specialty: 'مونتاج المسلسلات التشويقية والقفلات الدرامية', best_genres: ['crime_mystery', 'popular_drama'] },
  { name: 'باهر الرشيد', ovr: 87, salary: 3_700_000, specialty: 'مونتاج الأكشن والمعارك البصرية', best_genres: ['action', 'historical', 'heist'] },
  { name: 'ياسر النجار البصري', ovr: 88, salary: 4_100_000, specialty: 'تصحيح الألوان السينمائي DI والمؤثرات البصرية', best_genres: ['supernatural_horror', 'psychological_horror', 'sci_fi'] },
];

function buildExpandedCrewRoster(seedCrew: CrewItem[]): CrewItem[] {
  const result: CrewItem[] = [...seedCrew];
  const usedNames = new Set(result.map((c) => c.name.trim()));

  let dirIdx = 10;
  for (const d of EXTRA_DIRECTORS) {
    if (usedNames.has(d.name)) continue;
    usedNames.add(d.name);
    result.push({
      id: `dir_ext_${dirIdx++}`,
      name: d.name,
      role: 'director',
      image_url: '',
      base_salary: d.salary,
      specialty: d.specialty,
      stats: {
        overall: d.ovr,
        vision: Math.min(98, d.ovr + 2),
        pacing: Math.max(78, d.ovr - 1),
        efficiency: Math.max(76, d.ovr - 3),
        control: Math.min(97, d.ovr + 1),
      },
      best_genres: d.best_genres,
    });
  }

  let dopIdx = 10;
  for (const dop of EXTRA_DOPS) {
    if (usedNames.has(dop.name)) continue;
    usedNames.add(dop.name);
    result.push({
      id: `dop_ext_${dopIdx++}`,
      name: dop.name,
      role: 'cinematographer',
      image_url: '',
      base_salary: dop.salary,
      specialty: dop.specialty,
      stats: {
        overall: dop.ovr,
        vision: Math.min(98, dop.ovr + 3),
        pacing: Math.max(78, dop.ovr - 2),
        efficiency: Math.max(78, dop.ovr - 1),
      },
      best_genres: dop.best_genres,
    });
  }

  let compIdx = 10;
  for (const comp of EXTRA_COMPOSERS) {
    if (usedNames.has(comp.name)) continue;
    usedNames.add(comp.name);
    result.push({
      id: `mus_ext_${compIdx++}`,
      name: comp.name,
      role: 'composer',
      image_url: '',
      base_salary: comp.salary,
      specialty: comp.specialty,
      stats: {
        overall: comp.ovr,
        vision: Math.min(99, comp.ovr + 2),
        pacing: Math.max(80, comp.ovr - 1),
        efficiency: Math.max(80, comp.ovr - 1),
      },
      best_genres: comp.best_genres,
    });
  }

  let vfxIdx = 10;
  for (const vfx of EXTRA_EDITORS_VFX) {
    if (usedNames.has(vfx.name)) continue;
    usedNames.add(vfx.name);
    result.push({
      id: `vfx_ext_${vfxIdx++}`,
      name: vfx.name,
      role: 'editor_vfx',
      image_url: '',
      base_salary: vfx.salary,
      specialty: vfx.specialty,
      stats: {
        overall: vfx.ovr,
        vision: Math.min(96, vfx.ovr + 1),
        pacing: Math.min(98, vfx.ovr + 3),
        efficiency: Math.max(78, vfx.ovr - 1),
      },
      best_genres: vfx.best_genres,
    });
  }

  return result;
}

const rawDefaultDb = defaultDbJson as unknown as MasterDatabase;

const EXTRA_TV_CHANNELS: StreamingPlatform[] = [
  {
    id: 'tv_nile_gold',
    name: 'شبكة قنوات النيل الذهبية',
    logo_url: '',
    budget_capacity: 95,
    platform_type: 'tv_channel',
  },
  {
    id: 'tv_mahrousa_drama',
    name: 'قناة المحروسة دراما',
    logo_url: '',
    budget_capacity: 88,
    platform_type: 'tv_channel',
  },
  {
    id: 'tv_cairo_one',
    name: 'قناة كايرو وان دراما',
    logo_url: '',
    budget_capacity: 90,
    platform_type: 'tv_channel',
  },
  {
    id: 'tv_capital_net',
    name: 'شبكة تليفزيون العاصمة',
    logo_url: '',
    budget_capacity: 82,
    platform_type: 'tv_channel',
  },
  {
    id: 'tv_arabia_screen',
    name: 'شبكة الشاشة العربية',
    logo_url: '',
    budget_capacity: 78,
    platform_type: 'tv_channel',
  },
];

const EXPANDED_DEFAULT_DB: MasterDatabase = {
  ...rawDefaultDb,
  actors: buildExpanded160ActorRoster(rawDefaultDb.actors),
  crew: buildExpandedCrewRoster(rawDefaultDb.crew),
  streaming_platforms: [
    ...rawDefaultDb.streaming_platforms.map((p) => ({
      ...p,
      platform_type: p.id.startsWith('tv_')
        ? ('tv_channel' as const)
        : ('digital_platform' as const),
    })),
    ...EXTRA_TV_CHANNELS,
  ],
};

export const CUSTOM_DB_STORAGE_KEY = 'hyptrix_custom_db_patch_v1';

function mergeById<T extends { id: string }>(
  baseList: T[],
  overrideList?: Partial<T>[]
): T[] {
  if (!overrideList || !Array.isArray(overrideList)) return baseList;

  const map = new Map<string, T>();
  for (const item of baseList) {
    map.set(item.id, { ...item });
  }

  for (const patch of overrideList) {
    if (!patch || !patch.id) continue;
    const existing = map.get(patch.id);
    if (existing) {
      map.set(patch.id, { ...existing, ...patch });
    } else {
      map.set(patch.id, patch as T);
    }
  }

  return Array.from(map.values());
}

export function mergeDatabases(
  base: MasterDatabase,
  custom?: Partial<MasterDatabase> | null
): MasterDatabase {
  if (!custom) return base;

  return {
    meta: {
      pack_name: custom.meta?.pack_name || base.meta.pack_name,
      version: custom.meta?.version || base.meta.version,
    },
    actors: mergeById(base.actors, custom.actors),
    crew: mergeById(base.crew, custom.crew),
    competitor_studios: mergeById(
      base.competitor_studios,
      custom.competitor_studios
    ),
    streaming_platforms: mergeById(
      base.streaming_platforms,
      custom.streaming_platforms
    ),
    festivals: mergeById(base.festivals, custom.festivals),
  };
}

export function validateCustomDatabase(data: unknown): {
  valid: boolean;
  error?: string;
  data?: Partial<MasterDatabase>;
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'الملف لا يحتوي على كائن JSON صالح.' };
  }

  const obj = data as Record<string, unknown>;
  const hasKnownKey =
    'actors' in obj ||
    'crew' in obj ||
    'competitor_studios' in obj ||
    'streaming_platforms' in obj ||
    'festivals' in obj ||
    'meta' in obj;

  if (!hasKnownKey) {
    return {
      valid: false,
      error:
        'يجب أن يحتوي الملف على قسم واحد على الأقل من: actors, crew, competitor_studios, streaming_platforms, festivals.',
    };
  }

  return { valid: true, data: obj as Partial<MasterDatabase> };
}

export function getResolvedDatabase(
  customPatch?: Partial<MasterDatabase> | null
): MasterDatabase {
  return mergeDatabases(EXPANDED_DEFAULT_DB, customPatch);
}
