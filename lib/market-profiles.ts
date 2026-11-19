import type { FilmReleaseSeason, MarketConfig, MarketRegion } from './game-engine';

export type WorldMarketId = 'egypt' | 'saudi' | 'turkey' | 'korea' | 'usa';
export type UiLanguageId = 'ar' | 'en' | 'tr' | 'ko';

export interface UiLanguageOption {
  id: UiLanguageId;
  nativeLabel: string;
  arabicLabel: string;
  dir: 'rtl' | 'ltr';
  available: boolean;
  statusBadge: string;
  subtitle: string;
}

export const UI_LANGUAGE_OPTIONS: UiLanguageOption[] = [
  {
    id: 'ar',
    nativeLabel: 'العربية',
    arabicLabel: 'اللغة العربية',
    dir: 'rtl',
    available: true,
    statusBadge: 'متاحة الآن · RTL',
    subtitle: 'التجربة الكاملة بجميع تفاصيلها الدرامية والسينمائية',
  },
  {
    id: 'en',
    nativeLabel: 'English',
    arabicLabel: 'الإنجليزية',
    dir: 'ltr',
    available: false,
    statusBadge: 'Coming Soon · قريباً',
    subtitle: 'Global Hollywood & International Interface',
  },
  {
    id: 'tr',
    nativeLabel: 'Türkçe',
    arabicLabel: 'التركية',
    dir: 'ltr',
    available: false,
    statusBadge: 'Yakında · قريباً',
    subtitle: 'İstanbul Dizi & Sinema Deneyimi',
  },
  {
    id: 'ko',
    nativeLabel: '한국어',
    arabicLabel: 'الكورية',
    dir: 'ltr',
    available: false,
    statusBadge: '곧 출시 · قريباً',
    subtitle: 'K-Drama & Seoul Box Office Edition',
  },
];

export interface MarketFilmSeasonOption {
  id: FilmReleaseSeason;
  label: string;
  bonus: string;
  risk: string;
}

export interface MarketAiContextConfig {
  countryLabel: string;
  industryLabel: string;
  currencyLabel: string;
  dialectStyle: string;
  citiesAndLandmarks: string;
  boxOfficeVibe: string;
  socialHandles: [string, string, string];
  trendHashtagLabel: string;
  defaultFestival: string;
  fallbackRivalStudios: string[];
  fallbackStars: string[];
  fallbackCritics: { name: string; publication: string }[];
  fallbackIdeas: { title: string; synopsis: string }[];
  risingFirstMale: string[];
  risingFirstFemale: string[];
  risingLastNames: string[];
  emergingStudioNames: string[];
  emergingCeoNames: string[];
}

export interface WorldMarketProfile {
  id: WorldMarketId;
  available: boolean;
  tier: 'featured' | 'upcoming';
  countryNameAr: string;
  nativeTitle: string;
  marketHeadline: string;
  hqSubtitle: string;
  cardSummary: string;
  highlights: string[];
  badgeLabel: string;
  currencyLabel: string;
  currencyFullName: string;
  primaryRegion: MarketRegion;
  defaultStudioName: string;
  defaultCeoName: string;
  studioNameSuggestions: string[];
  filmSeasons: MarketFilmSeasonOption[];
  seriesSeasonPrimaryLabel: string;
  seriesSeasonPrimarySub: string;
  seriesSeasonOffLabel: string;
  seriesSeasonOffSub: string;
  expansionMarkets: MarketConfig[];
  rivalFilmTitles: string[];
  rivalSeriesTitles: string[];
  aiContext: MarketAiContextConfig;
}

export const MARKET_AI_CONTEXT: Record<WorldMarketId, MarketAiContextConfig> = {
  egypt: {
    countryLabel: 'مصر',
    industryLabel: 'السينما والدراما المصرية',
    currencyLabel: 'ج.م',
    dialectStyle: 'أسلوب سينمائي مصري سلس وطبيعي ومشوق',
    citiesAndLandmarks: 'القاهرة، الزمالك، خان الخليلي، الإسكندرية، أسوان، وسط البلد',
    boxOfficeVibe: 'مواسم الأعياد ورمضان وقاعات وسط البلد والمولات الكبرى',
    socialHandles: ['@CinemaMasr_Fan', '@FilmCritic_Cairo', '@DramaTrends_EG'],
    trendHashtagLabel: 'التريند المصري',
    defaultFestival: 'مهرجان القاهرة السينمائي الدولي',
    fallbackRivalStudios: [
      'المتحدون ميديا جروب',
      'سيرجي للإنتاج الفني',
      'العدلي جروب للدراما',
      'نيو سينما للقرن الجديد',
      'السباعي للإنتاج السينمائي',
    ],
    fallbackStars: [
      'كريم عبدون',
      'أحمد عزمي',
      'أمير كرم',
      'منى زاهر',
      'يارا المنشاوي',
      'مراد الكناني',
      'عمرو يونس',
      'هدى صفوت',
    ],
    fallbackCritics: [
      { name: 'شريف المهدي', publication: 'صحيفة المشهد الفني' },
      { name: 'عادل فكري', publication: 'مجلة كواليس الشاشة' },
    ],
    fallbackIdeas: [
      {
        title: 'شفرة باب الخلق',
        synopsis:
          'خبير ترميم مخطوطات يكتشف خريطة سرية مخبأة داخل مبنى أثري في قلب القاهرة، ليجد نفسه مطارَداً من عصابة تهريب دولية في سباق محموم عبر شوارع وسط البلد وخان الخليلي قبل فوات الأوان.',
      },
      {
        title: 'ليلة الزمالك الأخيرة',
        synopsis:
          'في حفل عشاء فاخر بقصر مطل على النيل تنقطع الكهرباء وتختفي وصية ملياردير شهير، فتتحول الأمسية إلى تحقيق نفسي مشوّق يكشف أسرار كل ضيف واحدًا تلو الآخر.',
      },
      {
        title: 'عاصفة النيل',
        synopsis:
          'ملاحمة إثارة وأكشن تدور بين القاهرة وأسوان حين يكتشف ضابط سابق مؤامرة ضخمة تستهدف شحنة نادرة، فيضطر لتكوين تحالف غير متوقع لإيقافها.',
      },
    ],
    risingFirstMale: ['زياد', 'مروان', 'آدم', 'سيف', 'نديم', 'ياسين', 'كريم', 'طارق'],
    risingFirstFemale: ['لينا', 'مريم', 'ملك', 'فريدة', 'نور', 'سلمى', 'هنا', 'ليلى'],
    risingLastNames: [
      'الشناوي',
      'النبوي',
      'ذو الفقار',
      'العلايلي',
      'المهدي',
      'الكيلاني',
      'الجوهري',
      'المنشاوي',
    ],
    emergingStudioNames: [
      'ستوديو المعادي سينما',
      'المتحدون بلس للإنتاج',
      'الأهرام الذهبية للأفلام',
      'إيجيبت وود بيكتشرز',
    ],
    emergingCeoNames: ['طارق السيوفي', 'هشام الجوهري', 'نادر الكاشف', 'عمر البلتاجي'],
  },
  saudi: {
    countryLabel: 'المملكة العربية السعودية والخليج',
    industryLabel: 'السينما والدراما السعودية والخليجية',
    currencyLabel: 'ر.س',
    dialectStyle:
      'أسلوب عربي سعودي وخليجي راقٍ وطبيعي ومشوق (سلس ومفهوم بدون تكلف)',
    citiesAndLandmarks:
      'الرياض، بوليفارد سيتي، جدة التاريخية، العلا، الدرعية، الخبر، أبها، البحر الأحمر',
    boxOfficeVibe:
      'موسم الرياض، شاشات IMAX الفاخرة، إقبال العائلات والشباب في الويك إند، ومنصات البث الخليجية',
    socialHandles: ['@SaudiCinema_Hub', '@RiyadhCritic', '@KSA_BoxOffice'],
    trendHashtagLabel: 'التريند السعودي والخليجي',
    defaultFestival: 'مهرجان البحر الأحمر السينمائي',
    fallbackRivalStudios: [
      'استوديوهات العلا للإنتاج',
      'مجموعة الدرعية ميديا',
      'بوليفارد بيكتشرز',
      'أفلام البحر الأحمر',
      'المملكة للترفيه',
    ],
    fallbackStars: [
      'نايف السديري',
      'طلال العتيبي',
      'سعد القحطاني',
      'نورة الدوسري',
      'العنود الحربي',
      'راكان التميمي',
      'بندر الشمري',
      'لمى الغامدي',
    ],
    fallbackCritics: [
      { name: 'فهد الرشيد', publication: 'صحيفة شاشة الرياض' },
      { name: 'سارة المنصور', publication: 'مجلة أضواء الخليج' },
    ],
    fallbackIdeas: [
      {
        title: 'طريق العلا المفقود',
        synopsis:
          'باحث آثار سعودي يكتشف مخطوطة نادرة بين صخور العلا تقوده إلى لغز قديم يربط بين تجار القوافل وشبكة تهريب دولية، فيخوض مطاردة مشوقة من العلا حتى جدة التاريخية قبل انكشاف الحقيقة الصادمة في النهاية.',
      },
      {
        title: 'ليلة في بوليفارد',
        synopsis:
          'منتج شاب يواجه ليلة مصيرية في الرياض بعد اختفاء النسخة الوحيدة من فيلمه قبل العرض الافتتاحي بـ 12 ساعة، ليدخل في سباق كوميدي وتشويقي مجنون عبر شوارع العاصمة لكشف المتورط.',
      },
      {
        title: 'أهل الدرعية',
        synopsis:
          'ملحمة تاريخية ودرامية تروي قصة شجاعة وولاء في قلب نجد، حيث يقف بطل شاب أمام مؤامرة تهدد قافلة تجارية كبرى وتقلب موازين التحالفات.',
      },
    ],
    risingFirstMale: [
      'فيصل',
      'سعود',
      'تركي',
      'بندر',
      'راكان',
      'نواف',
      'فهد',
      'مشعل',
      'سلطان',
    ],
    risingFirstFemale: [
      'نورة',
      'العنود',
      'لمى',
      'سارة',
      'ريم',
      'جود',
      'دانة',
      'هيفاء',
      'شهد',
    ],
    risingLastNames: [
      'العتيبي',
      'القحطاني',
      'الدوسري',
      'الحربي',
      'الشمري',
      'الغامدي',
      'الزهراني',
      'المطيري',
      'التميمي',
    ],
    emergingStudioNames: [
      'طويق بيكتشرز للإنتاج',
      'شاشات نيوم السينمائية',
      'واحة الدرعية للأفلام',
      'شعاع جدة ستوديوز',
    ],
    emergingCeoNames: ['سلمان البابطين', 'تركي الماجد', 'عبدالله السبيعي', 'وليد العليان'],
  },
  turkey: {
    countryLabel: 'تركيا',
    industryLabel: 'الديزي والسينما التركية',
    currencyLabel: '₺',
    dialectStyle: 'أسلوب درامي تركي شاعري ومشوق ومليء بالتقلبات العاطفية',
    citiesAndLandmarks: 'إسطنبول، البوسفور، أنطاليا، كابادوكيا، إزمير',
    boxOfficeVibe: 'سباق الرايتنج الأسبوعي، مسلسلات المساء الطويلة، وحفل الفراشة الذهبية',
    socialHandles: ['@DiziRating_TR', '@IstanbulCinema', '@BosphorusFilm'],
    trendHashtagLabel: 'التريند التركي',
    defaultFestival: 'جوائز الفراشة الذهبية',
    fallbackRivalStudios: ['البوسفور ميديا', 'إسطنبول بيكتشرز', 'الأناضول للإنتاج'],
    fallbackStars: ['كرم أوزتورك', 'إليف يلماز', 'بوراك شاهين', 'زينب كايا'],
    fallbackCritics: [
      { name: 'مراد أرسلان', publication: 'سينما إسطنبول' },
      { name: 'سيلين دمير', publication: 'نقد البوسفور' },
    ],
    fallbackIdeas: [
      {
        title: 'ضباب البوسفور',
        synopsis:
          'قصة صراع عائلي محتدم بين قصرين مطلين على مضيق البوسفور تنقلب رأساً على عقب بعد عودة الوريث المفقود.',
      },
    ],
    risingFirstMale: ['كرم', 'بوراك', 'إيمره', 'جان', 'أراس'],
    risingFirstFemale: ['إليف', 'زينب', 'أصلي', 'ليلى', 'ميرا'],
    risingLastNames: ['يلماز', 'كايا', 'أوزتورك', 'شاهين', 'دمير'],
    emergingStudioNames: ['قصر البوسفور للإنتاج', 'غالاطا فيلمز'],
    emergingCeoNames: ['مراد تشيليك', 'أورهان كايا'],
  },
  korea: {
    countryLabel: 'كوريا الجنوبية',
    industryLabel: 'K-Drama والسينما الكورية',
    currencyLabel: '₩',
    dialectStyle: 'أسلوب سينمائي كوري حاد، بصري، عاطفي ومتقن البناء',
    citiesAndLandmarks: 'سيول، بوسان، جزيرة جيجو، جانجنام، إنتشون',
    boxOfficeVibe: 'شباك تذاكر سيول، المنصات العالمية، ومهرجان بوسان وبيكسانج',
    socialHandles: ['@KBoxOffice_KR', '@SeoulFilmCritic', '@KDramaPulse'],
    trendHashtagLabel: 'التريند الكوري',
    defaultFestival: 'مهرجان بوسان وجوائز بيكسانج',
    fallbackRivalStudios: ['سيول ستوديوز', 'بوسان بيكتشرز', 'هانجانج ميديا'],
    fallbackStars: ['مين هو كيم', 'سو يون بارك', 'جي هون لي', 'ها نا تشوي'],
    fallbackCritics: [
      { name: 'جونغ وو هان', publication: 'سيول فيلم ريفيو' },
      { name: 'مي را شين', publication: 'سينما بوسان' },
    ],
    fallbackIdeas: [
      {
        title: 'أضواء سيول الخلفية',
        synopsis:
          'محققة شابة في سيول تتعقب لغزاً رقمياً يقودها إلى كواليس أكبر إمبراطورية ترفيهية في العاصمة.',
      },
    ],
    risingFirstMale: ['مين هو', 'جي هون', 'دو هيون', 'سيو جون', 'تاي هيون'],
    risingFirstFemale: ['سو يون', 'ها نا', 'جي وون', 'يو جين', 'مين جي'],
    risingLastNames: ['كيم', 'لي', 'بارك', 'تشوي', 'جونغ'],
    emergingStudioNames: ['استوديو هانجانج', 'نامسان بيكتشرز'],
    emergingCeoNames: ['سونغ هو كيم', 'هيون جين بارك'],
  },
  usa: {
    countryLabel: 'الولايات المتحدة وهوليوود',
    industryLabel: 'هوليوود وشباك التذاكر العالمي',
    currencyLabel: '$',
    dialectStyle: 'أسلوب هوليوودي ملحمي سريع الإيقاع وضخم الإنتاج',
    citiesAndLandmarks: 'لوس أنجلوس، هوليوود، نيويورك، شيكاغو، سان فرانسيسكو',
    boxOfficeVibe: 'أفلام الصيف الضخمة، شاشات IMAX العالمية، وسباق الأوسكار',
    socialHandles: ['@BoxOfficeGlobal', '@HollywoodInsider', '@OscarWatchLive'],
    trendHashtagLabel: 'التريند العالمي',
    defaultFestival: 'حفل جوائز الأوسكار',
    fallbackRivalStudios: ['صن سيت بيكتشرز', 'ميترو جولدن ويف', 'باسيفيك ستوديوز'],
    fallbackStars: ['لوكاس فانس', 'كلارا ميرسر', 'إيثان كول', 'مايا ستيرلينج'],
    fallbackCritics: [
      { name: 'آرثر هولمز', publication: 'سينيما ريفيو العالمية' },
      { name: 'إيلينا فوستر', publication: 'هوليوود كرونيكل' },
    ],
    fallbackIdeas: [
      {
        title: 'الأفق الأخير',
        synopsis:
          'فيلم خيال علمي وإثارة ضخم عن مهمة إنقاذ في مدار بعيد تتحول إلى اختبار أخلاقي لبقاء البشرية.',
      },
    ],
    risingFirstMale: ['لوكاس', 'إيثان', 'نوح', 'ليام', 'مايلز'],
    risingFirstFemale: ['كلارا', 'مايا', 'إيما', 'صوفيا', 'هانا'],
    risingLastNames: ['فانس', 'ميرسر', 'ستيرلينج', 'كول', 'بينيت'],
    emergingStudioNames: ['صن سيت فيلمز', 'أتلانتيك بيكتشرز'],
    emergingCeoNames: ['ماركوس ريد', 'ديانا كولينز'],
  },
};

export const MARKET_PROFILES: Record<WorldMarketId, WorldMarketProfile> = {
  egypt: {
    id: 'egypt',
    available: true,
    tier: 'featured',
    countryNameAr: 'مصر',
    nativeTitle: 'مصر — هوليوود الشرق',
    marketHeadline: 'مواسم العيدين، سباق رمضان، وشباك التذاكر المصري',
    hqSubtitle: 'القاهرة · مدينة الإنتاج الإعلامي',
    cardSummary:
      'انطلق من قلب صناعة السينما والدراما العربية؛ تنافس في مواسم عيد الفطر وعيد الأضحى وماراثون رمضان واصنع أسطورتك في شباك التذاكر.',
    highlights: ['مواسم العيدين', 'سباق رمضان', 'شباك التذاكر المصري', 'العملة: ج.م'],
    badgeLabel: 'مفتوح الآن',
    currencyLabel: 'ج.م',
    currencyFullName: 'جنيه مصري',
    primaryRegion: 'egypt',
    defaultStudioName: 'العقرب ستوديوز',
    defaultCeoName: 'محمود الصيرفي',
    studioNameSuggestions: [
      'الذهب ستوديوز',
      'كليوباترا بيكتشرز',
      'القاهرة سينما',
      'أسد الشاشة للإنتاج',
      'حورس فيلمز',
    ],
    filmSeasons: [
      {
        id: 'eid_adha',
        label: 'موسم عيد الأضحى',
        bonus: 'أعلى شباك تذاكر (+25%)',
        risk: 'منافسة نارية',
      },
      {
        id: 'eid_fitr',
        label: 'موسم عيد الفطر',
        bonus: 'إيرادات ممتازة (+18%)',
        risk: 'منافسة قوية',
      },
      {
        id: 'summer',
        label: 'الموسم الصيفي',
        bonus: 'عائد مستقر (+12%)',
        risk: 'منافسة متوسطة',
      },
      {
        id: 'mid_year',
        label: 'إجازة نصف العام',
        bonus: 'تكلفة تسويق أقل (+6%)',
        risk: 'منافسة هادئة',
      },
    ],
    seriesSeasonPrimaryLabel: 'الماراثون الرمضاني',
    seriesSeasonPrimarySub: 'إعلانات ومشاهدات مضاعفة (+35%) ولكن منافسة شرسة',
    seriesSeasonOffLabel: 'موسم الأوف سيزون (Off-Season)',
    seriesSeasonOffSub: 'فرصة تفرد عالية على المنصات الرقمية ومنافسة أهدأ',
    expansionMarkets: [
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
        name: 'السوق السعودي والخليجي (دور العرض والمنصات)',
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
    ],
    rivalFilmTitles: [
      'ولاد الحارة 4',
      'صقر الصعيد',
      'كود القاهرة 2030',
      'الظل الأسود',
      'مهمة في الإسكندرية',
      'المليونير المجهول',
      'عاصفة الصحراء',
      'حكاية حب في الزمالك',
      'مطاردة منتصف الليل',
      'بيت الأشباح القديم',
      'ليلة السقوط',
      'البحث عن الكنز',
    ],
    rivalSeriesTitles: [
      'جعفر العمدة: الفصل الجديد',
      'المداح: أسطورة العهد',
      'ملوك الحارة الشعبية',
      'الكبير أوي 9',
      'الحشاشين: ظل القلعة',
      'لعبة الانتقام',
      'سوق السلاح',
      'البيت الغامض',
      'الاختيار الحاسم',
      'أشغال شاقة جداً',
    ],
    aiContext: MARKET_AI_CONTEXT.egypt,
  },

  saudi: {
    id: 'saudi',
    available: true,
    tier: 'featured',
    countryNameAr: 'السعودية',
    nativeTitle: 'السعودية — موسم الرياض والسينما الخليجية',
    marketHeadline: 'شاشات IMAX، موسم الرياض، مهرجان البحر الأحمر، والمنصات الخليجية',
    hqSubtitle: 'الرياض · بوليفارد سيتي · استوديوهات العلا',
    cardSummary:
      'قُد ثورة السينما والدراما السعودية والخليجية؛ أطلق أفلامك في شاشات IMAX وموسم الرياض ونافس على جوائز مهرجان البحر الأحمر وصناع الترفيه.',
    highlights: ['موسم الرياض', 'شاشات IMAX', 'مهرجان البحر الأحمر', 'العملة: ر.س'],
    badgeLabel: 'مفتوح الآن',
    currencyLabel: 'ر.س',
    currencyFullName: 'ريال سعودي',
    primaryRegion: 'gulf',
    defaultStudioName: 'الدرعية ستوديوز',
    defaultCeoName: 'فيصل العتيبي',
    studioNameSuggestions: [
      'الدرعية بيكتشرز',
      'الرياض سينما',
      'العلا ستوديوز',
      'صقر الجزيرة للإنتاج',
      'بوليفارد فيلمز',
    ],
    filmSeasons: [
      {
        id: 'eid_adha',
        label: 'موسم الرياض السينمائي',
        bonus: 'أعلى شباك تذاكر IMAX (+25%)',
        risk: 'منافسة نارية',
      },
      {
        id: 'eid_fitr',
        label: 'موسم عيد الأضحى',
        bonus: 'إقبال عائلي ضخم (+18%)',
        risk: 'منافسة قوية',
      },
      {
        id: 'summer',
        label: 'موسم عيد الفطر',
        bonus: 'عوائد قوية ومستقرة (+12%)',
        risk: 'منافسة متوسطة',
      },
      {
        id: 'mid_year',
        label: 'صيف جدة والمنطقة الشرقية',
        bonus: 'تكلفة تسويق أقل (+6%)',
        risk: 'منافسة هادئة',
      },
    ],
    seriesSeasonPrimaryLabel: 'موسم رمضان الخليجي',
    seriesSeasonPrimarySub: 'رعايات ضخمة وتصدر منصات البث (+35%) مع منافسة شرسة',
    seriesSeasonOffLabel: 'عروض المنصات وموسم الويك إند',
    seriesSeasonOffSub: 'انتشار واسع على منصات شاشات بلس ونجوم VIP بمنافسة أهدأ',
    expansionMarkets: [
      {
        id: 'gulf',
        name: 'السوق السعودي (الرياض وجدة والدمام)',
        description:
          'السوق الأساسي للشركة — شاشات IMAX الحديثة، إقبال موسم الرياض والويك إند، وأقوى متوسط سعر تذكرة بالمنطقة.',
        unlockMarketValue: 0,
        earlyLicenseCost: 0,
        distributionFeePerProject: 0,
        revenueBonusFactor: 1.0,
        budgetMultiplier: 1.0,
        revenueMultiplier: 1.0,
      },
      {
        id: 'egypt',
        name: 'السوق المصري والعربي',
        description:
          'يفتح دور العرض المصرية والعربية الواسعة ويرفع إجمالي إيرادات العمل بنسبة +45% مع قاعدة جماهيرية هائلة.',
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
          'توزيع في العواصم الأوروبية والمهرجانات الدولية يضيف +65% لإيرادات العمل ويدعم فرص الجوائز العالمية.',
        unlockMarketValue: 450_000_000,
        earlyLicenseCost: 48_000_000,
        distributionFeePerProject: 12_000_000,
        revenueBonusFactor: 0.65,
        budgetMultiplier: 1.75,
        revenueMultiplier: 1.65,
      },
      {
        id: 'hollywood',
        name: 'التوزيع العالمي الشامل',
        description:
          'أعلى درجات الانتشار السينمائي العالمي — يضاعف عوائد التذاكر والمنصات الدولية بنسبة +110% للأعمال الكبرى.',
        unlockMarketValue: 850_000_000,
        earlyLicenseCost: 95_000_000,
        distributionFeePerProject: 24_000_000,
        revenueBonusFactor: 1.1,
        budgetMultiplier: 2.5,
        revenueMultiplier: 2.1,
      },
    ],
    rivalFilmTitles: [
      'صقور العلا',
      'رحلة بوليفارد السريعة',
      'أسرار جدة التاريخية',
      'ليلة في الدرعية',
      'نداء الصحراء',
      'مهمة الرياض 2030',
      'سائق الربع الخالي',
      'شباب التحلية',
      'خلف جبال طويق',
      'الكنز المدفون في الخبر',
      'ظل البحر الأحمر',
      'عاصفة نجد',
    ],
    rivalSeriesTitles: [
      'حارة البجيري',
      'طاش الخليج: الموسم الذهبي',
      'ديوانية الكبار',
      'شباب الحارة الجديدة',
      'سيرة طويق',
      'أبناء الميناء: جدة',
      'عزوة الشمال',
      'ملف الرياض السري',
      'ليالي الدرعية',
      'سوق القيصرية',
    ],
    aiContext: MARKET_AI_CONTEXT.saudi,
  },

  turkey: {
    id: 'turkey',
    available: false,
    tier: 'upcoming',
    countryNameAr: 'تركيا',
    nativeTitle: 'Türkiye — الديزي والسينما التركية',
    marketHeadline: 'مسلسلات إسطنبول، سباق الرايتنج الأسبوعي، والفراشة الذهبية',
    hqSubtitle: 'إسطنبول · البوسفور',
    cardSummary:
      'مسلسلات إسطنبول، سباق الرايتنج الأسبوعي، وحفل جوائز الفراشة الذهبية.',
    highlights: ['مسلسلات إسطنبول', 'سباق الرايتنج', 'الفراشة الذهبية'],
    badgeLabel: 'قريباً',
    currencyLabel: '₺',
    currencyFullName: 'ليرة تركية',
    primaryRegion: 'europe',
    defaultStudioName: 'البوسفور ستوديوز',
    defaultCeoName: 'كرم أوزتورك',
    studioNameSuggestions: ['البوسفور ستوديوز', 'إسطنبول فيلمز', 'غالاطا ميديا'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'الموسم الشتوي للديزي',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'موسم الصيف',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
    rivalFilmTitles: [],
    rivalSeriesTitles: [],
    aiContext: MARKET_AI_CONTEXT.turkey,
  },

  korea: {
    id: 'korea',
    available: false,
    tier: 'upcoming',
    countryNameAr: 'كوريا الجنوبية',
    nativeTitle: '대한민국 — K-Drama والسينما الكورية',
    marketHeadline: 'سيول وبوسان، نتفليكس العالمية، جوائز بيكسانج والتنين الأزرق',
    hqSubtitle: 'سيول · بوسان',
    cardSummary:
      'سيول وبوسان، الإنتاجات العالمية للمنصات، وجوائز بيكسانج والتنين الأزرق.',
    highlights: ['سيول وبوسان', 'المنصات العالمية', 'بيكسانج والتنين الأزرق'],
    badgeLabel: 'قريباً',
    currencyLabel: '₩',
    currencyFullName: 'وون كوري',
    primaryRegion: 'hollywood',
    defaultStudioName: 'سيول ستوديوز',
    defaultCeoName: 'مين هو كيم',
    studioNameSuggestions: ['سيول ستوديوز', 'بوسان بيكتشرز', 'هانجانج فيلمز'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'موسم الدراما الرئيسي',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'إطلاقات المنصات',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
    rivalFilmTitles: [],
    rivalSeriesTitles: [],
    aiContext: MARKET_AI_CONTEXT.korea,
  },

  usa: {
    id: 'usa',
    available: false,
    tier: 'upcoming',
    countryNameAr: 'الولايات المتحدة',
    nativeTitle: 'USA — هوليوود',
    marketHeadline: 'شباك التذاكر العالمي، أفلام الصيف الضخمة، والأوسكار',
    hqSubtitle: 'لوس أنجلوس · هوليوود',
    cardSummary:
      'شباك التذاكر العالمي، أفلام الصيف الضخمة، وسباق جوائز الأوسكار.',
    highlights: ['شباك التذاكر العالمي', 'أفلام الصيف الضخمة', 'الأوسكار'],
    badgeLabel: 'قريباً',
    currencyLabel: '$',
    currencyFullName: 'دولار أمريكي',
    primaryRegion: 'hollywood',
    defaultStudioName: 'صن سيت ستوديوز',
    defaultCeoName: 'لوكاس فانس',
    studioNameSuggestions: ['صن سيت ستوديوز', 'هوليوود برايم', 'باسيفيك بيكتشرز'],
    filmSeasons: [],
    seriesSeasonPrimaryLabel: 'موسم الصيف الضخم',
    seriesSeasonPrimarySub: '',
    seriesSeasonOffLabel: 'موسم الجوائز',
    seriesSeasonOffSub: '',
    expansionMarkets: [],
    rivalFilmTitles: [],
    rivalSeriesTitles: [],
    aiContext: MARKET_AI_CONTEXT.usa,
  },
};

export function getMarketProfile(worldMarket?: WorldMarketId | null): WorldMarketProfile {
  if (worldMarket && worldMarket in MARKET_PROFILES) {
    return MARKET_PROFILES[worldMarket];
  }
  return MARKET_PROFILES.egypt;
}

export function getCurrencyLabel(worldMarket?: WorldMarketId | null): string {
  return getMarketProfile(worldMarket).currencyLabel;
}

export function getPrimaryMarketRegion(worldMarket?: WorldMarketId | null): MarketRegion {
  return getMarketProfile(worldMarket).primaryRegion;
}

export function getMarketConfigsForWorld(worldMarket?: WorldMarketId | null): MarketConfig[] {
  const profile = getMarketProfile(worldMarket);
  return profile.expansionMarkets.length > 0
    ? profile.expansionMarkets
    : MARKET_PROFILES.egypt.expansionMarkets;
}

export function getMarketAiContext(worldMarket?: WorldMarketId | null): MarketAiContextConfig {
  return getMarketProfile(worldMarket).aiContext;
}

export function getLanguageDisplayName(uiLanguage?: UiLanguageId | null): string {
  switch (uiLanguage) {
    case 'en':
      return 'English';
    case 'tr':
      return 'Türkçe';
    case 'ko':
      return '한국어';
    case 'ar':
    default:
      return 'العربية';
  }
}
