import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Social Growth API (/api/social-growth)
 *
 * Powers two zero-AI-cost viral & retention engines:
 * 1. Weekly Global Challenge (`weekly_challenges` table + deterministic weekly rotation)
 * 2. Viral Referral System (`referrals` table + anti-self-referral & anti-duplicate)
 *
 * Supports full bilingual English (default) & Arabic responses via `lang` param/field.
 */

type ApiLang = 'en' | 'ar';

function resolveLang(raw?: string | null): ApiLang {
  return raw === 'ar' ? 'ar' : 'en';
}

interface WeeklyChallengeDef {
  weekKey: string;
  title: string;
  description: string;
  requiredGenre: string;
  requiredGenreAr: string;
  requiredGenreLabel: string;
  maxBudget: number;
  rewardLabel: string;
  endsInDays: number;
}

interface ChallengeLeaderboardRow {
  studio_instance_id: string;
  studio_name: string;
  ceo_name: string;
  project_title: string;
  world_market: string;
  score_value: number;
  budget_used: number;
  critic_score: number;
}

const memoryChallenges: Record<string, ChallengeLeaderboardRow[]> = {};
const memoryReferrals: Array<{
  referrerId: string;
  inviteeId: string;
  createdAt: string;
}> = [];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getCurrentWeeklyChallenge(lang: ApiLang): WeeklyChallengeDef {
  const isEn = lang === 'en';
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNum = Math.floor(dayOfYear / 7) + 1;
  const weekKey = `${now.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  const dayOfWeek = now.getUTCDay();
  const endsInDays = Math.max(1, 7 - dayOfWeek);

  const rotation = [
    {
      title: isEn ? 'Low-Budget Horror Challenge' : 'تحدي الرعب الاقتصادي',
      description: isEn
        ? 'Score the highest net profit with a horror release under a 40M total budget!'
        : 'حقق أعلى صافي ربح بفيلم رعب بميزانية إجمالية تحت 40M!',
      requiredGenre: 'psychological_horror',
      requiredGenreAr: isEn
        ? 'Psychological / Supernatural Horror'
        : 'رعب نفسي / خارق',
      requiredGenreLabel: isEn
        ? 'Psychological / Supernatural Horror'
        : 'رعب نفسي / خارق',
      maxBudget: 40_000_000,
      rewardLabel: isEn
        ? '"Master of Horror" Title + Weekly Crest'
        : 'لقب «سيد الرعب» + وسام الأسبوع',
    },
    {
      title: isEn ? 'King of Smart Comedy' : 'ملك الكوميديا الذكية',
      description: isEn
        ? 'Release a comedy under a 45M total budget and top the global profit chart!'
        : 'أطلق فيلماً كوميدياً بميزانية تحت 45M وحقق أعلى أرباح في الشباك!',
      requiredGenre: 'comedy',
      requiredGenreAr: isEn ? 'Comedy' : 'كوميديا',
      requiredGenreLabel: isEn ? 'Comedy' : 'كوميديا',
      maxBudget: 45_000_000,
      rewardLabel: isEn
        ? '"Box Office Comedy King" Title + Weekly Crest'
        : 'لقب «ملك شباك الكوميديا» + وسام الأسبوع',
    },
    {
      title: isEn ? 'Crime & Mystery Masterpiece' : 'تحفة الجريمة والغموض',
      description: isEn
        ? 'Produce a crime & mystery release under 55M with top net profit and reviews!'
        : 'أنتج عمل جريمة وغموض بميزانية تحت 55M بأعلى صافي ربح وتقييم!',
      requiredGenre: 'crime_mystery',
      requiredGenreAr: isEn ? 'Crime & Mystery' : 'جريمة وغموض',
      requiredGenreLabel: isEn ? 'Crime & Mystery' : 'جريمة وغموض',
      maxBudget: 55_000_000,
      rewardLabel: isEn
        ? '"Thriller Mastermind" Title + Weekly Crest'
        : 'لقب «عقل الإثارة المدبر» + وسام الأسبوع',
    },
    {
      title: isEn ? 'Blockbuster Action Architect' : 'صانع الملاحم الجماهيرية',
      description: isEn
        ? 'Deliver an action feature under 65M and post the highest global net profit!'
        : 'أنتج فيلم أكشن بميزانية تحت 65M وسجّل أعلى صافي ربح عالمي!',
      requiredGenre: 'action',
      requiredGenreAr: isEn ? 'Action' : 'أكشن',
      requiredGenreLabel: isEn ? 'Action' : 'أكشن',
      maxBudget: 65_000_000,
      rewardLabel: isEn
        ? '"Action Emperor" Title + Weekly Crest'
        : 'لقب «إمبراطور الأكشن» + وسام الأسبوع',
    },
  ];

  const picked = rotation[weekNum % rotation.length];
  return {
    weekKey,
    ...picked,
    endsInDays,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studioInstanceId = (searchParams.get('studioInstanceId') || '').trim();
  const lang = resolveLang(searchParams.get('lang'));
  const challenge = getCurrentWeeklyChallenge(lang);
  const supabase = getSupabaseAdmin();

  let topEntries: ChallengeLeaderboardRow[] =
    memoryChallenges[challenge.weekKey] || [];
  let referralCount = studioInstanceId
    ? memoryReferrals.filter((r) => r.referrerId === studioInstanceId).length
    : 0;

  if (supabase) {
    try {
      const { data: rows } = await supabase
        .from('weekly_challenges')
        .select(
          'studio_instance_id, studio_name, ceo_name, project_title, world_market, score_value, budget_used, critic_score'
        )
        .eq('week_key', challenge.weekKey)
        .order('score_value', { ascending: false })
        .limit(10);
      if (Array.isArray(rows) && rows.length > 0) {
        topEntries = rows as ChallengeLeaderboardRow[];
      }
    } catch {
      // Fall back to in-memory entries
    }

    if (studioInstanceId) {
      try {
        const { count } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_studio_id', studioInstanceId);
        if (typeof count === 'number') {
          referralCount = count;
        }
      } catch {
        // Ignore if table not created yet
      }
    }
  }

  return NextResponse.json({
    ok: true,
    challenge,
    topEntries,
    referralCount,
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '');
    const lang = resolveLang(body?.lang || body?.uiLanguage);
    const isEn = lang === 'en';
    const supabase = getSupabaseAdmin();

    if (action === 'claim_referral') {
      const referrerId = String(body?.referrerStudioId || '').trim();
      const inviteeId = String(body?.inviteeStudioId || '').trim();
      const rewardType = body?.rewardType === 'star_lock' ? 'star_lock' : 'cash';

      if (!referrerId || !inviteeId || referrerId === inviteeId) {
        return NextResponse.json(
          {
            ok: false,
            error: isEn
              ? 'You cannot redeem your own studio referral code.'
              : 'لا يمكنك تفعيل كود الدعوة الخاص بك.',
          },
          { status: 400 }
        );
      }

      const alreadyLocal = memoryReferrals.some((r) => r.inviteeId === inviteeId);
      if (alreadyLocal) {
        return NextResponse.json(
          {
            ok: false,
            error: isEn
              ? 'A referral reward has already been claimed for this studio.'
              : 'تم تفعيل مكافأة الدعوة لهذا الاستوديو مسبقاً.',
          },
          { status: 409 }
        );
      }

      if (supabase) {
        try {
          const { data: existing } = await supabase
            .from('referrals')
            .select('id')
            .eq('invitee_studio_id', inviteeId)
            .maybeSingle();

          if (existing) {
            return NextResponse.json(
              {
                ok: false,
                error: isEn
                  ? 'A referral reward has already been claimed for this studio.'
                  : 'تم تفعيل مكافأة الدعوة لهذا الاستوديو مسبقاً.',
              },
              { status: 409 }
            );
          }

          await supabase.from('referrals').insert({
            referrer_studio_id: referrerId,
            invitee_studio_id: inviteeId,
            reward_type: rewardType,
            reward_amount: rewardType === 'cash' ? 15_000_000 : 1,
          });
        } catch {
          // Continue with in-memory fallback
        }
      }

      memoryReferrals.push({
        referrerId,
        inviteeId,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        rewardType,
        rewardAmount: rewardType === 'cash' ? 15_000_000 : 1,
        message:
          rewardType === 'star_lock'
            ? isEn
              ? 'Referral claimed! You unlocked 1 free Star Forge golden lock.'
              : 'تم تفعيل الدعوة! حصلت على قفل مجاني لغرفة صناعة النجوم.'
            : isEn
            ? 'Referral claimed! +15M added to your studio treasury.'
            : 'تم تفعيل الدعوة! أُضيف +15M إلى خزينة الاستوديو.',
      });
    }

    if (action === 'submit_challenge') {
      const challenge = getCurrentWeeklyChallenge(lang);
      const studioInstanceId = String(body?.studioInstanceId || '').trim();
      const studioName = String(
        body?.studioName || (isEn ? 'Neelyo Studio' : 'استوديو Neelyo')
      ).slice(0, 70);
      const ceoName = String(
        body?.ceoName || (isEn ? 'Chief Executive' : 'المدير التنفيذي')
      ).slice(0, 70);
      const projectTitle = String(body?.projectTitle || '').slice(0, 80);
      const worldMarket = body?.worldMarket === 'saudi' ? 'saudi' : 'egypt';
      const primaryGenre = String(body?.primaryGenre || '');
      const budgetUsed = Math.max(0, Math.round(Number(body?.budgetUsed || 0)));
      const netProfit = Math.round(Number(body?.netProfit || 0));
      const criticScore = Number(
        Math.min(10, Math.max(1, Number(body?.criticScore || 7))).toFixed(1)
      );

      if (!studioInstanceId || !projectTitle) {
        return NextResponse.json(
          {
            ok: false,
            error: isEn
              ? 'Incomplete project submission data.'
              : 'بيانات المشروع غير مكتملة.',
          },
          { status: 400 }
        );
      }

      // Check genre match (horror allows both psychological_horror & supernatural_horror; comedy allows light_comedy)
      const genreMatches =
        primaryGenre === challenge.requiredGenre ||
        (challenge.requiredGenre === 'psychological_horror' &&
          primaryGenre === 'supernatural_horror') ||
        (challenge.requiredGenre === 'comedy' && primaryGenre === 'light_comedy');

      if (!genreMatches) {
        return NextResponse.json(
          {
            ok: false,
            error: isEn
              ? `This week's challenge requires a "${challenge.requiredGenreLabel}" release.`
              : `يتطلب التحدي الحالي عملاً من تصنيف «${challenge.requiredGenreAr}».`,
          },
          { status: 400 }
        );
      }

      if (budgetUsed > challenge.maxBudget) {
        return NextResponse.json(
          {
            ok: false,
            error: isEn
              ? `Project budget exceeds this week's cap (${(challenge.maxBudget / 1_000_000).toFixed(0)}M).`
              : `تجاوزت الميزانية سقف التحدي المسموح (${(challenge.maxBudget / 1_000_000).toFixed(0)}M).`,
          },
          { status: 400 }
        );
      }

      const entry: ChallengeLeaderboardRow = {
        studio_instance_id: studioInstanceId,
        studio_name: studioName,
        ceo_name: ceoName,
        project_title: projectTitle,
        world_market: worldMarket,
        score_value: Math.max(0, netProfit),
        budget_used: budgetUsed,
        critic_score: criticScore,
      };

      const curList = memoryChallenges[challenge.weekKey] || [];
      const filtered = curList.filter(
        (r) => r.studio_instance_id !== studioInstanceId
      );
      filtered.push(entry);
      filtered.sort((a, b) => b.score_value - a.score_value);
      memoryChallenges[challenge.weekKey] = filtered.slice(0, 15);

      if (supabase) {
        try {
          await supabase.from('weekly_challenges').upsert(
            {
              id: `${challenge.weekKey}__${studioInstanceId}`,
              week_key: challenge.weekKey,
              ...entry,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {
          // Non-fatal fallback
        }
      }

      return NextResponse.json({
        ok: true,
        entry,
        topEntries: memoryChallenges[challenge.weekKey].slice(0, 10),
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Unsupported action' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
