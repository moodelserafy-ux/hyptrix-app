import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCurrencyLabel,
  type UiLanguageId,
  type WorldMarketId,
} from '@/lib/market-profiles';

/**
 * Shared World Events Pool API (/api/world-pool)
 *
 * Eliminates per-player background Groq calls (0 AI cost per player!):
 * - Maintains a shared 12-hour batch of Rising Stars, Emerging Studios, Rival Releases,
 *   and Industry Market News per `(market, lang)` inside Supabase `world_events_pool`
 *   (with in-memory caching & rich bilingual EN/AR procedural fallbacks).
 * - GET pulls a deterministic-but-unique item seeded by `studioInstanceId + gameDay`,
 *   so every player gets a completely different experience at 0 token cost.
 * - POST (protected by CRON_SECRET) refreshes Egypt & Saudi pools in both EN and AR.
 */

interface PoolBatch {
  refreshedAt: string;
  risingStars: Array<{
    name: string;
    gender: 'M' | 'F';
    age: number;
    archetype: string;
    base_salary: number;
    overall: number;
    headline: string;
    detail: string;
  }>;
  emergingStudios: Array<{
    name: string;
    ceo: string;
    specialty: string;
    estimated_net_worth: number;
    market_power: number;
    preferred_genres: string[];
    headline: string;
    detail: string;
  }>;
  rivalReleases: Array<{
    studioName: string;
    title: string;
    genre: string;
    leadStarName: string;
    boxOfficeRevenue: number;
    criticScore: number;
    format: 'film' | 'series';
    headline: string;
    detail: string;
  }>;
  marketNews: Array<{
    headline: string;
    detail: string;
    badgeLabel: string;
    category: 'ai_industry_report' | 'rival_project';
    marketValueDelta: number;
    cashDelta: number;
    reputationDelta: number;
    hypeDelta: number;
    rivalStudioName: string;
    rivalNetWorthDelta: number;
  }>;
}

const POOL_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const memoryPoolCache: Record<string, { fetchedAt: number; batch: PoolBatch }> = {};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildProceduralBatch(
  market: WorldMarketId,
  lang: UiLanguageId
): PoolBatch {
  const isSaudi = market === 'saudi';
  const cur = getCurrencyLabel(market, lang);

  if (lang !== 'ar') {
    const studios = isSaudi
      ? ['Najd Pictures', 'AlUla Studios', 'Mada Productions', 'Riyadh Horizon Films', 'Red Sea Vision']
      : ['Cairo Production House', 'Golden Nile Studios', 'Orient Cinema', 'Atlas Filmworks', 'Midan Pictures'];
    const stars = isSaudi
      ? ['Rakan Al-Dosari', 'Nouf Al-Subaie', 'Badr Al-Qahtani', 'Sadeem Al-Harbi', 'Fahad Al-Zahrani', 'Lamar Al-Otaibi']
      : ['Marwan El-Shafei', 'Dalia El-Mansouri', 'Ziad El-Hawary', 'Salma Afifi', 'Asser El-Beheiry', 'Nourine Fahmy'];

    const risingStars = stars.map((name, i) => {
      const gender: 'M' | 'F' = i % 2 === 1 ? 'F' : 'M';
      const age = 20 + (i % 6);
      const ovr = 72 + (i % 6);
      return {
        name,
        gender,
        age,
        archetype:
          gender === 'F'
            ? 'Breakout Drama & Suspense Talent'
            : 'Rising Action & Mystery Performer',
        base_salary: (1.9 + (i % 5) * 0.3) * 1_000_000,
        overall: ovr,
        headline: `Season Breakout: "${name}" Rockets Up the Talent Market!`,
        detail: `Young breakout talent "${name}" (${age}) stunned directors and critics with electrifying auditions this week and is now open for studio offers.`,
      };
    });

    const emergingStudios = (
      isSaudi
        ? [
            { name: 'Modern Diriyah Studios', ceo: 'Sultan Al-Majed', specialty: 'Historical Epics & Tentpole Action' },
            { name: 'Jeddah Peak Productions', ceo: 'Reema Al-Fawzan', specialty: 'Thrillers & Prestige Streaming Series' },
            { name: 'Desert Mirage Films', ceo: 'Nawaf Al-Ajlan', specialty: 'Sci-Fi & Global Cinema' },
            { name: 'Eastern Reel Cinema', ceo: 'Talal Al-Jabr', specialty: 'Family Comedies & Box-Office Hits' },
          ]
        : [
            { name: 'Pyramids New Media', ceo: 'Sherif El-Gendy', specialty: 'Blockbuster Action & Crowd-Pleasers' },
            { name: 'Maadi Pictures', ceo: 'Noha El-Saadany', specialty: 'Psychological Drama & Originals' },
            { name: 'Alexandria Gate Films', ceo: 'Hazem Barakat', specialty: 'Festival Prestige & Crime Thrillers' },
            { name: 'Zamalek Nights Productions', ceo: 'Karim Azzam', specialty: 'Holiday Comedies & Ensemble Hits' },
          ]
    ).map((st, idx) => {
      const worth = (210 + idx * 55) * 1_000_000;
      return {
        ...st,
        estimated_net_worth: worth,
        market_power: 70 + idx * 3,
        preferred_genres: idx % 2 === 0 ? ['Action', 'Thriller'] : ['Drama', 'Comedy'],
        headline: `New Market Challenger: "${st.name}" Launches with ${(worth / 1_000_000).toFixed(0)}M ${cur} Capital!`,
        detail: `Producer ${st.ceo} unveiled "${st.name}", specializing in ${st.specialty}, aiming to challenge top studios across upcoming seasons.`,
      };
    });

    const rivalReleases = (
      isSaudi
        ? [
            { title: 'Nafud Storm', genre: 'Action Thriller', format: 'film' as const },
            { title: 'Secrets of the Diplomatic Quarter', genre: 'Crime Mystery', format: 'series' as const },
            { title: 'Journey to AlUla', genre: 'Adventure Drama', format: 'film' as const },
            { title: 'One Night in Jeddah', genre: 'Social Comedy', format: 'film' as const },
            { title: 'Heir to the Old Palace', genre: 'Suspense Drama', format: 'series' as const },
            { title: 'Gulf Cipher', genre: 'Espionage Action', format: 'film' as const },
          ]
        : [
            { title: 'Downtown Deal', genre: 'Crime Thriller', format: 'film' as const },
            { title: 'The Last Shadow', genre: 'Psychological Drama', format: 'series' as const },
            { title: 'Corniche Pursuit', genre: 'Action Comedy', format: 'film' as const },
            { title: 'Family Trap', genre: 'Family Comedy', format: 'film' as const },
            { title: 'Dossier 2030', genre: 'Mystery Thriller', format: 'series' as const },
            { title: 'Guardians of the Nile', genre: 'Action Epic', format: 'film' as const },
          ]
    ).map((item, idx) => ({
      studioName: studios[idx % studios.length],
      title: item.title,
      genre: item.genre,
      leadStarName: stars[idx % stars.length],
      boxOfficeRevenue: (92 + (idx % 5) * 28) * 1_000_000,
      criticScore: Number((7.2 + (idx % 4) * 0.5).toFixed(1)),
      format: item.format,
      headline: `Fierce Competition: "${studios[idx % studios.length]}" Premieres "${item.title}" Starring ${stars[idx % stars.length]}!`,
      detail: `Audiences rushed to opening screenings of "${item.title}", with analysts forecasting massive box-office numbers that raise the seasonal bar.`,
    }));

    const marketNews = [
      {
        headline: `Sudden Box-Office Surge Across ${isSaudi ? 'Saudi IMAX Theaters' : 'Egyptian Cinemas'} Lifts Active Studio Valuations`,
        detail: `Exhibition chains reported record ticket attendance this week, boosting investor appetite and sponsorship budgets for active studios.`,
        badgeLabel: 'Breaking · Studio Market',
        category: 'ai_industry_report' as const,
        marketValueDelta: 14_000_000,
        cashDelta: 3_500_000,
        reputationDelta: 2,
        hypeDelta: 4,
        rivalStudioName: studios[0],
        rivalNetWorthDelta: -32_000_000,
      },
      {
        headline: `Financing Stalls Inside "${studios[1]}" — Opening a Window for Rival Studios!`,
        detail: `Industry insiders report two tentpole projects at "${studios[1]}" were shelved, giving competing studios a golden shot at top talent.`,
        badgeLabel: 'Industry Insider',
        category: 'rival_project' as const,
        marketValueDelta: 11_000_000,
        cashDelta: 0,
        reputationDelta: 1,
        hypeDelta: 3,
        rivalStudioName: studios[1],
        rivalNetWorthDelta: -58_000_000,
      },
      {
        headline: `Top Streaming Platforms Expand Exclusive Acquisition Budgets by 20%`,
        detail: `Leading regional streaming services announced a major spending push to secure first-window rights for high-rated films and series.`,
        badgeLabel: 'Exclusive Trade Report',
        category: 'ai_industry_report' as const,
        marketValueDelta: 16_000_000,
        cashDelta: 4_500_000,
        reputationDelta: 2,
        hypeDelta: 5,
        rivalStudioName: studios[2],
        rivalNetWorthDelta: 36_000_000,
      },
      {
        headline: `New Distribution Alliance Led by "${studios[3]}" Heats Up the Box-Office Race`,
        detail: `"${studios[3]}" inked a wide regional exhibition deal to expand screen counts for its upcoming theatrical slate.`,
        badgeLabel: 'Breaking · Studio Market',
        category: 'rival_project' as const,
        marketValueDelta: 6_000_000,
        cashDelta: 0,
        reputationDelta: 0,
        hypeDelta: 2,
        rivalStudioName: studios[3],
        rivalNetWorthDelta: 48_000_000,
      },
    ];

    return {
      refreshedAt: new Date().toISOString(),
      risingStars,
      emergingStudios,
      rivalReleases,
      marketNews,
    };
  }

  // Arabic procedural batch
  const studios = isSaudi
    ? ['نجد بيكتشرز', 'العلا ستوديوز', 'مدى الإنتاج', 'أفق الرياض فيلمز', 'رؤية البحر الأحمر']
    : ['القاهرة للإنتاج', 'النيل الذهبي', 'صوت الشرق فيلمز', 'أطلس سينما', 'ميدان الفن'];
  const stars = isSaudi
    ? ['راكان الدوسري', 'نوف السبيعي', 'بدر القحطاني', 'سديم الحربي', 'فهد الزهراني', 'لمار العتيبي']
    : ['مروان الشافعي', 'داليا المنصوري', 'زياد الهواري', 'سلمى عفيفي', 'آسر البحيري', 'نورين فهمي'];

  const risingStars = stars.map((name, i) => {
    const gender: 'M' | 'F' = i % 2 === 1 ? 'F' : 'M';
    const age = 20 + (i % 6);
    const ovr = 72 + (i % 6);
    return {
      name,
      gender,
      age,
      archetype:
        gender === 'F'
          ? 'موهبة صاعدة في الدراما والتشويق'
          : 'وجه شاب لافت في الأكشن والغموض',
      base_salary: (1.9 + (i % 5) * 0.3) * 1_000_000,
      overall: ovr,
      headline: `اكتشاف الموسم: صعود «${name}» بقوة إلى بورصة النجوم!`,
      detail: `خطفت الموهبة الشابة «${name}» (${age} سنة) أنظار المخرجين والنقاد بعد عروض لافتة هذا الأسبوع، وأصبحت متاحة الآن للتعاقد.`,
    };
  });

  const emergingStudios = (
    isSaudi
      ? [
          { name: 'ستوديوهات الدرعية الحديثة', ceo: 'سلطان الماجد', specialty: 'ملحميات تاريخية وأكشن ضخم' },
          { name: 'قمة جدة للإنتاج', ceo: 'ريما الفوزان', specialty: 'أفلام تشويق ومسلسلات منصات' },
          { name: 'سراب الصحراء فيلمز', ceo: 'نواف العجلان', specialty: 'خيال علمي ودراما عالمية' },
          { name: 'رواق الشرقية سينما', ceo: 'طلال الجبر', specialty: 'كوميديا عائلية وشباك تذاكر' },
        ]
      : [
          { name: 'أهرامات نيو ميديا', ceo: 'شريف الجندي', specialty: 'أكشن جماهيري وشباك تذاكر' },
          { name: 'المعادي بيكتشرز', ceo: 'نهى السعدني', specialty: 'دراما نفسية ومسلسلات منصات' },
          { name: 'بوابة الإسكندرية فيلمز', ceo: 'حازم بركات', specialty: 'سينما مهرجانات وجريمة' },
          { name: 'ليالي الزمالك للإنتاج', ceo: 'كريم عزام', specialty: 'كوميديا وموسم الأعياد' },
        ]
  ).map((st, idx) => {
    const worth = (210 + idx * 55) * 1_000_000;
    return {
      ...st,
      estimated_net_worth: worth,
      market_power: 70 + idx * 3,
      preferred_genres: idx % 2 === 0 ? ['Action', 'Thriller'] : ['Drama', 'Comedy'],
      headline: `منافس جديد في البورصة: إطلاق «${st.name}» برأس مال ${(worth / 1_000_000).toFixed(0)}M ${cur}!`,
      detail: `أعلن المنتج ${st.ceo} تدشين «${st.name}» المتخصصة في ${st.specialty} لمنافسة الاستوديوهات الكبرى في المواسم القادمة.`,
    };
  });

  const rivalReleases = (
    isSaudi
      ? [
          { title: 'عاصفة النفود', genre: 'أكشن وإثارة', format: 'film' as const },
          { title: 'خفايا حي السفارات', genre: 'جريمة وغموض', format: 'series' as const },
          { title: 'الرحلة إلى العلا', genre: 'دراما ومغامرة', format: 'film' as const },
          { title: 'ليلة في جدة', genre: 'كوميديا اجتماعية', format: 'film' as const },
          { title: 'وريث القصر القديم', genre: 'دراما تشويقية', format: 'series' as const },
          { title: 'شفرة الخليج', genre: 'أكشن تجسس', format: 'film' as const },
        ]
      : [
          { title: 'صفقة وسط البلد', genre: 'جريمة وإثارة', format: 'film' as const },
          { title: 'الظل الأخير', genre: 'دراما نفسية', format: 'series' as const },
          { title: 'سباق الكورنيش', genre: 'أكشن كوميدي', format: 'film' as const },
          { title: 'عائلة في المصيدة', genre: 'كوميديا عائلية', format: 'film' as const },
          { title: 'ملف 2030', genre: 'غموض وتشويق', format: 'series' as const },
          { title: 'حراس النيل', genre: 'أكشن ملحمي', format: 'film' as const },
        ]
  ).map((item, idx) => ({
    studioName: studios[idx % studios.length],
    title: item.title,
    genre: item.genre,
    leadStarName: stars[idx % stars.length],
    boxOfficeRevenue: (92 + (idx % 5) * 28) * 1_000_000,
    criticScore: Number((7.2 + (idx % 4) * 0.5).toFixed(1)),
    format: item.format,
    headline: `منافسة شرسة: «${studios[idx % studios.length]}» تطلق «${item.title}» ببطولة ${stars[idx % stars.length]}!`,
    detail: `شهد السوق إقبالاً قوياً على «${item.title}» وسط توقعات بإيرادات ضخمة ترفع وتيرة التحدي في شباك التذاكر.`,
  }));

  const marketNews = [
    {
      headline: `انتعاش مفاجئ في مبيعات تذاكر ${isSaudi ? 'السينما السعودية' : 'دور العرض المصرية'} يرفع أسهم الاستوديوهات النشطة`,
      detail: `سجلت شبكات التوزيع نمواً قياسياً في الإقبال الجماهيري هذا الأسبوع، مما عزز ثقة الرعاة والمستثمرين في الاستوديوهات الصاعدة.`,
      badgeLabel: 'عاجل · بورصة الإنتاج',
      category: 'ai_industry_report' as const,
      marketValueDelta: 14_000_000,
      cashDelta: 3_500_000,
      reputationDelta: 2,
      hypeDelta: 4,
      rivalStudioName: studios[0],
      rivalNetWorthDelta: -32_000_000,
    },
    {
      headline: `تعثّر مفاوضات تمويل كبرى داخل «${studios[1]}» يفتح المجال أمام المنافسين!`,
      detail: `كشفت مصادر اقتصادية عن تأجيل مشروعين ضخمين لشركة «${studios[1]}»، مما يمنح الاستوديوهات المنافسة فرصة ذهبية لاقتناص النجوم.`,
      badgeLabel: 'كواليس الصناعة',
      category: 'rival_project' as const,
      marketValueDelta: 11_000_000,
      cashDelta: 0,
      reputationDelta: 1,
      hypeDelta: 3,
      rivalStudioName: studios[1],
      rivalNetWorthDelta: -58_000_000,
    },
    {
      headline: `منصات البث الرقمي ترفع ميزانيات الاستحواذ الحصري للموسم الجديد بنسبة 20%`,
      detail: `أعلنت كبرى المنصات العربية عن خطة توسعية لشراء حقوق العرض الأول للأفلام والمسلسلات ذات التقييم النقدي المرتفع.`,
      badgeLabel: 'تقرير صحفي خاص',
      category: 'ai_industry_report' as const,
      marketValueDelta: 16_000_000,
      cashDelta: 4_500_000,
      reputationDelta: 2,
      hypeDelta: 5,
      rivalStudioName: studios[2],
      rivalNetWorthDelta: 36_000_000,
    },
    {
      headline: `تحالف توزيع جديد تقوده «${studios[3]}» يشعل السباق على صدارة الشباك`,
      detail: `أبرمت «${studios[3]}» شراكة توزيع إقليمية واسعة لرفع عدد قاعات العرض المتاحة لإنتاجاتها القادمة.`,
      badgeLabel: 'عاجل · بورصة الإنتاج',
      category: 'rival_project' as const,
      marketValueDelta: 6_000_000,
      cashDelta: 0,
      reputationDelta: 0,
      hypeDelta: 2,
      rivalStudioName: studios[3],
      rivalNetWorthDelta: 48_000_000,
    },
  ];

  return {
    refreshedAt: new Date().toISOString(),
    risingStars,
    emergingStudios,
    rivalReleases,
    marketNews,
  };
}

async function generateFreshBatchWithGroq(
  market: WorldMarketId,
  lang: UiLanguageId
): Promise<PoolBatch> {
  const fallback = buildProceduralBatch(market, lang);
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return fallback;

  const isSaudi = market === 'saudi';
  const isEn = lang !== 'ar';
  const cur = getCurrencyLabel(market, lang);

  const outputLanguageDirective = isEn
    ? 'Write EVERY string value strictly in crisp, natural entertainment-trade English (Variety / Hollywood Reporter / Deadline tone). Zero Arabic letters anywhere.'
    : `Write every string value in vivid, authentic ${isSaudi ? 'Saudi/Gulf' : 'Egyptian'} cinema press Arabic.`;

  const systemPrompt = `You generate a shared 12-hour cinema world pool for a ${isSaudi ? 'Saudi/Gulf' : 'Egyptian/Arab'} movie studio tycoon game. Return strict JSON.
${outputLanguageDirective}
All names of actors, CEOs, and studios MUST be 100% fictional.
JSON schema:
{
  "risingStars": [{"name": "fictional 2-word name", "gender": "M|F", "age": 22, "archetype": "short role type", "base_salary": 2200000, "overall": 75, "headline": "news headline", "detail": "1-2 vivid sentences"}],
  "emergingStudios": [{"name": "fictional studio name", "ceo": "fictional CEO name", "specialty": "studio specialty", "estimated_net_worth": 260000000, "market_power": 74, "preferred_genres": ["Action","Drama"], "headline": "headline", "detail": "1-2 vivid sentences"}],
  "rivalReleases": [{"studioName": "fictional studio", "title": "creative title", "genre": "genre label", "leadStarName": "fictional star", "boxOfficeRevenue": 125000000, "criticScore": 8.1, "format": "film|series", "headline": "headline", "detail": "1-2 vivid sentences"}],
  "marketNews": [{"headline": "press headline", "detail": "1-2 vivid sentences", "badgeLabel": "${isEn ? 'Breaking · Studio Market' : 'عاجل · بورصة الإنتاج'}", "category": "ai_industry_report", "marketValueDelta": 15000000, "cashDelta": 3000000, "reputationDelta": 2, "hypeDelta": 4, "rivalStudioName": "fictional studio", "rivalNetWorthDelta": -45000000}]
}
Provide 4 risingStars, 3 emergingStudios, 4 rivalReleases, and 4 marketNews. Currency: ${cur}.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0.78,
        max_completion_tokens: 1300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate the 12-hour ${market} cinema world batch JSON in ${isEn ? 'English' : 'Arabic'} now.`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return fallback;
    const json = await res.json();
    const rawText: string = json?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(rawText);

    return {
      refreshedAt: new Date().toISOString(),
      risingStars:
        Array.isArray(parsed.risingStars) && parsed.risingStars.length >= 2
          ? parsed.risingStars
          : fallback.risingStars,
      emergingStudios:
        Array.isArray(parsed.emergingStudios) && parsed.emergingStudios.length >= 2
          ? parsed.emergingStudios
          : fallback.emergingStudios,
      rivalReleases:
        Array.isArray(parsed.rivalReleases) && parsed.rivalReleases.length >= 2
          ? parsed.rivalReleases
          : fallback.rivalReleases,
      marketNews:
        Array.isArray(parsed.marketNews) && parsed.marketNews.length >= 2
          ? parsed.marketNews
          : fallback.marketNews,
    };
  } catch {
    return fallback;
  }
}

async function getOrRefreshMarketPool(
  market: WorldMarketId,
  lang: UiLanguageId,
  forceRefresh = false
): Promise<PoolBatch> {
  const poolKey = `${market}_${lang}`;
  const now = Date.now();
  const cached = memoryPoolCache[poolKey];
  if (!forceRefresh && cached && now - cached.fetchedAt < POOL_TTL_MS) {
    return cached.batch;
  }

  const supabase = getSupabaseAdmin();
  if (!forceRefresh && supabase) {
    try {
      const { data } = await supabase
        .from('world_events_pool')
        .select('payload_json, refreshed_at')
        .eq('market_id', poolKey)
        .maybeSingle();

      if (data?.payload_json && data.refreshed_at) {
        const ageMs = now - new Date(data.refreshed_at).getTime();
        if (ageMs < POOL_TTL_MS) {
          const batch = data.payload_json as PoolBatch;
          memoryPoolCache[poolKey] = { fetchedAt: now, batch };
          return batch;
        }
      }
    } catch {
      // Table might not exist yet — seamlessly fall back
    }
  }

  // Refresh pool once for ALL players (max 1 Groq call per 12h per market+lang)
  const freshBatch = await generateFreshBatchWithGroq(market, lang);
  memoryPoolCache[poolKey] = { fetchedAt: now, batch: freshBatch };

  if (supabase) {
    try {
      await supabase.from('world_events_pool').upsert(
        {
          market_id: poolKey,
          payload_json: freshBatch,
          refreshed_at: freshBatch.refreshedAt,
        },
        { onConflict: 'market_id' }
      );
    } catch {
      // Non-fatal if table not created yet
    }
  }

  return freshBatch;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketParam: WorldMarketId =
    searchParams.get('market') === 'saudi' ? 'saudi' : 'egypt';
  const langParam: UiLanguageId =
    searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const isAr = langParam === 'ar';
  const type = searchParams.get('type') || 'market_news';
  const seedKey = searchParams.get('seed') || 'default_player';
  const gameDay = Number(searchParams.get('gameDay') || 15);
  const currentYear = Number(searchParams.get('currentYear') || 2026);
  const studioName = searchParams.get('studioName') || '';
  const formatFilter = searchParams.get('format') === 'series' ? 'series' : 'film';

  const batch = await getOrRefreshMarketPool(marketParam, langParam, false);
  const seed = hashSeed(
    `${seedKey}_${marketParam}_${langParam}_${type}_${gameDay}_${currentYear}`
  );

  if (type === 'rising_star') {
    const item = batch.risingStars[seed % batch.risingStars.length];
    const ovr = Math.min(79, Math.max(70, Number(item.overall || 74)));
    return NextResponse.json({
      source: 'shared_world_pool',
      actor: {
        id: `act_pool_${seed}_${gameDay}`,
        name: item.name,
        gender: item.gender === 'F' ? 'F' : 'M',
        age: Math.min(28, Math.max(19, Number(item.age || 23))),
        tier: 'C' as const,
        image_url: '',
        base_salary: Math.min(4_200_000, Math.max(1_500_000, Number(item.base_salary || 2_200_000))),
        archetype: item.archetype || (isAr ? 'موهبة صاعدة' : 'Rising Talent'),
        stats: {
          overall: ovr,
          acting: Math.min(88, ovr + 3),
          box_office_pull: Math.max(66, ovr - 2),
          charisma: Math.min(88, ovr + 2),
          ego: 45,
        },
        genre_mastery: {
          popular_drama: 85,
          crime_mystery: 83,
          action: 80,
          comedy: 79,
          light_comedy: 81,
          romance: 82,
        },
        synergy_with: [],
        rivalries: [],
        isAiGenerated: false,
        isRisingDiscovery: true,
        status: 'active' as const,
      },
      headline: item.headline,
      detail: studioName
        ? isAr
          ? `${item.detail} فرصة متاحة الآن أمام «${studioName}».`
          : `${item.detail} A golden signing window is now open for "${studioName}".`
        : item.detail,
    });
  }

  if (type === 'emerging_studio') {
    const item = batch.emergingStudios[seed % batch.emergingStudios.length];
    const colors = ['#7C3AED', '#0284C7', '#E11D48', '#059669', '#D97706', '#4F46E5'];
    return NextResponse.json({
      source: 'shared_world_pool',
      studio: {
        id: `comp_pool_${seed}_${gameDay}`,
        name: item.name,
        ceo: item.ceo,
        logo_url: '',
        market_power: Math.min(85, Math.max(64, Number(item.market_power || 73))),
        estimated_net_worth: Math.min(520_000_000, Math.max(165_000_000, Number(item.estimated_net_worth || 260_000_000))),
        specialty: item.specialty || (isAr ? 'إنتاج سينمائي ودرامي' : 'Film & Drama Production'),
        preferred_genres: Array.isArray(item.preferred_genres) ? item.preferred_genres : ['Drama', 'Thriller'],
        rival_aggression: 76,
        color: colors[seed % colors.length],
      },
      headline: item.headline,
      detail: item.detail,
    });
  }

  if (type === 'rival_releases') {
    const list = batch.rivalReleases;
    const first = list[seed % list.length];
    const second = list[(seed + 1) % list.length];
    const rivals = [first, second].map((r, idx) => ({
      id: `pool_riv_${seed}_${gameDay}_${idx}`,
      studioName: r.studioName,
      title: r.title,
      genre: r.genre,
      leadStarName: r.leadStarName,
      boxOfficeRevenue: Math.min(245_000_000, Math.max(75_000_000, Number(r.boxOfficeRevenue || 115_000_000))),
      criticScore: Number(Math.min(9.4, Math.max(6.8, Number(r.criticScore || 7.8))).toFixed(1)),
      status: 'released' as const,
      format: r.format || formatFilter,
      year: currentYear,
    }));

    return NextResponse.json({
      source: 'shared_world_pool',
      rivals,
      headline: first.headline,
      detail: studioName
        ? isAr
          ? `${first.detail} المنافسة تشتعل مباشرة أمام «${studioName}».`
          : `${first.detail} The box-office clash is heating up directly against "${studioName}".`
        : first.detail,
    });
  }

  // Default: market_news
  const news = batch.marketNews[seed % batch.marketNews.length];
  return NextResponse.json({
    source: 'shared_world_pool',
    ...news,
  });
}

/**
 * Scheduled Cron Endpoint (runs every 12h via GitHub Actions / Cloud Scheduler / Vercel Cron)
 * Refreshes Egypt & Saudi shared world pools in both EN and AR inside Supabase.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret === 'your-random-cron-secret') {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured on server' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const customHeader = req.headers.get('x-cron-secret') || '';
  if (authHeader !== `Bearer ${cronSecret}` && customHeader !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [egyptEn, saudiEn, egyptAr, saudiAr] = await Promise.all([
    getOrRefreshMarketPool('egypt', 'en', true),
    getOrRefreshMarketPool('saudi', 'en', true),
    getOrRefreshMarketPool('egypt', 'ar', true),
    getOrRefreshMarketPool('saudi', 'ar', true),
  ]);

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    counts: {
      egypt_en: {
        stars: egyptEn.risingStars.length,
        studios: egyptEn.emergingStudios.length,
        rivals: egyptEn.rivalReleases.length,
        news: egyptEn.marketNews.length,
      },
      saudi_en: {
        stars: saudiEn.risingStars.length,
        studios: saudiEn.emergingStudios.length,
        rivals: saudiEn.rivalReleases.length,
        news: saudiEn.marketNews.length,
      },
      egypt_ar: {
        stars: egyptAr.risingStars.length,
        studios: egyptAr.emergingStudios.length,
        rivals: egyptAr.rivalReleases.length,
        news: egyptAr.marketNews.length,
      },
      saudi_ar: {
        stars: saudiAr.risingStars.length,
        studios: saudiAr.emergingStudios.length,
        rivals: saudiAr.rivalReleases.length,
        news: saudiAr.marketNews.length,
      },
    },
  });
}
