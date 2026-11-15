import { createClient } from '@supabase/supabase-js';
import { MarketRegion } from './game-engine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project.supabase.co');

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface LeaderboardStudioEntry {
  rank: number;
  studioName: string;
  ceoName: string;
  region: MarketRegion;
  netWorth: number;
  releasesCount: number;
  awardsCount: number;
  specialtyLabel?: string;
  isPlayer?: boolean;
}

export const LOCAL_LEAGUE_STUDIOS: Omit<LeaderboardStudioEntry, 'rank'>[] = [
  {
    studioName: 'الإمبراطورية للإنتاج السينمائي',
    ceoName: 'تامر المرسي',
    region: 'egypt',
    netWorth: 1_280_000_000,
    releasesCount: 24,
    awardsCount: 29,
    specialtyLabel: 'أفلام مواسم الأعياد ودراما رمضان الضخمة',
  },
  {
    studioName: 'مجموعة سينما تاج للترفيه',
    ceoName: 'شريف المعلم',
    region: 'egypt',
    netWorth: 940_000_000,
    releasesCount: 19,
    awardsCount: 21,
    specialtyLabel: 'أفلام الأكشن والملاحم التاريخية',
  },
  {
    studioName: 'الرواد جروب للدراما والسينما',
    ceoName: 'جمال العدلي',
    region: 'egypt',
    netWorth: 760_000_000,
    releasesCount: 17,
    awardsCount: 23,
    specialtyLabel: 'المسلسلات الدرامية وأفلام البطولة الجماعية',
  },
  {
    studioName: 'نيو فيجن بيكتشرز',
    ceoName: 'وليد الكردي',
    region: 'egypt',
    netWorth: 610_000_000,
    releasesCount: 15,
    awardsCount: 16,
    specialtyLabel: 'أفلام الغموض والتشويق البوليسي',
  },
  {
    studioName: 'السباعي للإنتاج السينمائي',
    ceoName: 'أحمد السباعي',
    region: 'egypt',
    netWorth: 495_000_000,
    releasesCount: 21,
    awardsCount: 9,
    specialtyLabel: 'الدراما الشعبية والكوميديا الجماهيرية',
  },
  {
    studioName: 'أفلام الكنانة الدولية',
    ceoName: 'فؤاد السوهاجي',
    region: 'egypt',
    netWorth: 420_000_000,
    releasesCount: 12,
    awardsCount: 19,
    specialtyLabel: 'الأعمال النقدية وأفلام المهرجانات',
  },
  {
    studioName: 'بلو فريم ستوديوز القاهرة',
    ceoName: 'كريم الألفي',
    region: 'egypt',
    netWorth: 335_000_000,
    releasesCount: 10,
    awardsCount: 11,
    specialtyLabel: 'الخيال العلمي والرعب النفسي',
  },
  {
    studioName: 'كايرو فريم للإنتاج الفني',
    ceoName: 'مدحت الزيني',
    region: 'egypt',
    netWorth: 260_000_000,
    releasesCount: 8,
    awardsCount: 7,
    specialtyLabel: 'مسلسلات المنصات القصيرة',
  },
  {
    studioName: 'المحروسة فيلم',
    ceoName: 'عاصم المنياوي',
    region: 'egypt',
    netWorth: 190_000_000,
    releasesCount: 6,
    awardsCount: 5,
    specialtyLabel: 'الكوميديا العائلية والشبابية',
  },
  {
    studioName: 'أطلس سينما الزمالك',
    ceoName: 'نبيل الحكيم',
    region: 'egypt',
    netWorth: 145_000_000,
    releasesCount: 4,
    awardsCount: 3,
    specialtyLabel: 'الأفلام الرومانسية والاجتماعية',
  },
  {
    studioName: 'لايت هاوس للإنتاج المستقل',
    ceoName: 'سلمى الدالي',
    region: 'egypt',
    netWorth: 95_000_000,
    releasesCount: 3,
    awardsCount: 4,
    specialtyLabel: 'أفلام البطولة الشبابية والمواهب الصاعدة',
  },
];

export async function syncStudioWithSupabase(playerEntry: {
  studioName: string;
  ceoName: string;
  region: MarketRegion;
  netWorth: number;
  releasesCount: number;
  awardsCount: number;
  email?: string | null;
}): Promise<void> {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('hyptrix_leaderboard').upsert(
      {
        studio_name: playerEntry.studioName,
        ceo_name: playerEntry.ceoName,
        region: playerEntry.region,
        net_worth: playerEntry.netWorth,
        releases_count: playerEntry.releasesCount,
        awards_count: playerEntry.awardsCount,
        user_email: playerEntry.email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'studio_name' }
    );
  } catch {
    // Silent fallback when offline or table not yet migrated
  }
}

export async function fetchGlobalLeaderboard(playerEntry: {
  studioName: string;
  ceoName: string;
  region: MarketRegion;
  netWorth: number;
  releasesCount: number;
  awardsCount: number;
}): Promise<LeaderboardStudioEntry[]> {
  if (supabaseClient) {
    try {
      await syncStudioWithSupabase(playerEntry);
      const { data, error } = await supabaseClient
        .from('hyptrix_leaderboard')
        .select('*')
        .order('net_worth', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Omit<LeaderboardStudioEntry, 'rank'>[] = data.map((row) => ({
          studioName: row.studio_name,
          ceoName: row.ceo_name,
          region: (row.region as MarketRegion) || 'egypt',
          netWorth: Number(row.net_worth || 0),
          releasesCount: Number(row.releases_count || 0),
          awardsCount: Number(row.awards_count || 0),
          specialtyLabel: 'شركة إنتاج مسجلة في الدوري المحلي',
        }));
        return combineAndRankLocal(mapped, playerEntry);
      }
    } catch {
      // Fallback to local league
    }
  }

  return combineAndRankLocal(LOCAL_LEAGUE_STUDIOS, playerEntry);
}

export function combineAndRankLocal(
  list: Omit<LeaderboardStudioEntry, 'rank'>[],
  playerEntry: Omit<LeaderboardStudioEntry, 'rank'>
): LeaderboardStudioEntry[] {
  const combined: Omit<LeaderboardStudioEntry, 'rank'>[] = [
    ...list.filter((item) => item.studioName !== playerEntry.studioName),
    {
      ...playerEntry,
      specialtyLabel: 'شركتك الإنتاجية',
      isPlayer: true,
    },
  ];

  // Strictly sort descending by netWorth, then awardsCount, then releasesCount
  combined.sort((a, b) => {
    if (b.netWorth !== a.netWorth) return b.netWorth - a.netWorth;
    if (b.awardsCount !== a.awardsCount) return b.awardsCount - a.awardsCount;
    return b.releasesCount - a.releasesCount;
  });

  return combined.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
