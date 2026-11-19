import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateTalentOfferDeep,
  RoleBillingSize,
  ROLE_BILLING_META,
} from '@/lib/game-engine';
import {
  getMarketAiContext,
  getMarketProfile,
  getLanguageDisplayName,
  WorldMarketId,
  UiLanguageId,
} from '@/lib/market-profiles';
import { composeProceduralFilmingNews } from '@/lib/procedural-dialogue';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Sliding-window hourly rate limiter (25 Groq calls/hour per studioInstanceId or IP)
const RATE_LIMIT_MAX_PER_HOUR = 25;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const aiRateBuckets = new Map<string, number[]>();

function consumeAiRateLimit(bucketKey: string): boolean {
  const now = Date.now();
  const prev = aiRateBuckets.get(bucketKey) || [];
  const active = prev.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX_PER_HOUR) {
    aiRateBuckets.set(bucketKey, active);
    return false;
  }
  active.push(now);
  aiRateBuckets.set(bucketKey, active);
  if (aiRateBuckets.size > 4000) {
    const firstKey = aiRateBuckets.keys().next().value;
    if (firstKey) aiRateBuckets.delete(firstKey);
  }
  return true;
}

const TASK_MAX_TOKENS: Record<string, number> = {
  evaluate_talent_offer: 220,
  generate_character_role: 200,
  generate_daily_news: 220,
  evaluate_series_episode: 240,
  evaluate_festival_ceremony: 240,
  generate_script_idea: 280,
  analyze_script_synopsis: 260,
  generate_pr_media_response: 380,
  mid_production_crises: 520,
  evaluate_release: 760,
  discover_ai_rising_star: 260,
  discover_ai_emerging_studio: 280,
  generate_ai_rival_releases: 360,
  generate_ai_memory_news: 280,
};

function resolveMarketContext(payload: Record<string, unknown>) {
  const worldMarket = (
    typeof payload?.worldMarket === 'string' ? payload.worldMarket : 'egypt'
  ) as WorldMarketId;
  const uiLanguage = (
    typeof payload?.uiLanguage === 'string' ? payload.uiLanguage : 'ar'
  ) as UiLanguageId;
  const profile = getMarketProfile(worldMarket);
  const ctx = getMarketAiContext(worldMarket);
  const langName = getLanguageDisplayName(uiLanguage);
  const marketTone =
    worldMarket === 'saudi' ? 'Saudi/Gulf cinema tone' : 'Egyptian cinema tone';
  // Ultra-concise English directive (~35 tokens instead of ~120 Arabic tokens!)
  const directive = `Return strict JSON with ${langName} values in natural ${marketTone}. Market: ${ctx.industryLabel}, currency: ${ctx.currencyLabel}.`;
  return { worldMarket, uiLanguage, profile, ctx, langName, directive };
}

export type GroqTaskModel =
  | 'openai/gpt-oss-20b'
  | 'openai/gpt-oss-120b';

/**
 * Cost-optimized model router (~85-90% cost reduction):
 * - ONLY `evaluate_release` (the climactic Golden Moment) uses `openai/gpt-oss-120b` first, falling back to `20b`.
 * - ALL other tasks strictly use fast/cheap `openai/gpt-oss-20b` ONLY.
 */
function getTaskOrderedGroqModels(taskMode: string): GroqTaskModel[] {
  if (taskMode === 'evaluate_release') {
    return ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  }
  return ['openai/gpt-oss-20b'];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, payload, groqKeyOverride, preferredModel } = body;
    const rawPayload = (payload || body || {}) as Record<string, unknown>;
    const p: Record<string, unknown> = {
      ...rawPayload,
      worldMarket: rawPayload.worldMarket ?? body.worldMarket ?? 'egypt',
      uiLanguage: rawPayload.uiLanguage ?? body.uiLanguage ?? 'ar',
    };
    const taskTag = String(mode || 'evaluate_release');

    // Enforce hourly rate limit per studioInstanceId or client IP; when exceeded,
    // pass a sentinel key that skips Groq and returns the rich procedural fallback cleanly.
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const studioId =
      typeof body?.studioInstanceId === 'string' && body.studioInstanceId.trim()
        ? body.studioInstanceId.trim()
        : typeof rawPayload?.studioName === 'string' && rawPayload.studioName.trim()
        ? `${clientIp}_${rawPayload.studioName.trim().slice(0, 24)}`
        : clientIp;

    const rateAllowed = consumeAiRateLimit(studioId);
    const effectiveKeyOverride = rateAllowed
      ? groqKeyOverride
      : '__RATE_LIMITED__';

    if (mode === 'generate_script_idea') {
      return await handleGenerateScriptIdea(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'analyze_script_synopsis') {
      return await handleAnalyzeScriptSynopsis(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'generate_character_role') {
      return await handleGenerateCharacterRole(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'evaluate_talent_offer') {
      return await handleEvaluateTalentOffer(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'evaluate_series_episode') {
      return await handleEvaluateSeriesEpisode(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'generate_daily_news') {
      return await handleGenerateDailyNews(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'mid_production_crises') {
      return await handleGenerateCrises(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'evaluate_festival_ceremony') {
      return await handleEvaluateFestivalCeremony(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'discover_ai_rising_star') {
      return await handleDiscoverAiRisingStar(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'discover_ai_emerging_studio') {
      return await handleDiscoverAiEmergingStudio(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'generate_ai_rival_releases') {
      return await handleGenerateAiRivalReleases(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'generate_ai_memory_news') {
      return await handleGenerateAiMemoryNews(p, effectiveKeyOverride, taskTag);
    }

    if (mode === 'generate_pr_media_response') {
      return await handleGeneratePrMediaResponse(
        p,
        effectiveKeyOverride,
        preferredModel || 'generate_pr_media_response'
      );
    }

    return await handleEvaluateRelease(p, effectiveKeyOverride, taskTag);
  } catch (err) {
    console.error('Narrative Engine Error:', err);
    return NextResponse.json(buildGroundedReleaseEvaluation({}), { status: 200 });
  }
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function extractJsonFromText(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null;
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Extract first {...} block
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonSlice);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function callGroqJson(
  systemPrompt: string,
  userPrompt: string,
  groqKeyOverride?: string,
  taskModeOrPreferred?: string,
  maxTokensOverride?: number
): Promise<{ data: Record<string, unknown>; modelUsed: string } | null> {
  if (groqKeyOverride === '__RATE_LIMITED__') {
    return null;
  }

  const strictJsonSystemPrompt = `${systemPrompt}\nOutput ONLY valid JSON object starting with { and ending with }. No prose, no markdown.`;

  const groqKey = (
    groqKeyOverride ||
    process.env.GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    ''
  ).trim();

  if (groqKey && groqKey !== 'MY_GROQ_API_KEY') {
    const taskKey = taskModeOrPreferred || 'evaluate_release';
    const orderedModels = getTaskOrderedGroqModels(taskKey);
    const maxTokens =
      maxTokensOverride || TASK_MAX_TOKENS[taskKey] || 360;

    for (const model of orderedModels) {
      const attemptBody = (includeReasoningEffort: boolean) =>
        JSON.stringify({
          model,
          temperature: 0.78,
          max_completion_tokens: maxTokens,
          response_format: { type: 'json_object' },
          ...(includeReasoningEffort ? { reasoning_effort: 'low' } : {}),
          messages: [
            { role: 'system', content: strictJsonSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

      try {
        let response = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: attemptBody(true),
        });

        // Graceful retry without reasoning_effort if endpoint rejects the optional field
        if (response.status === 400) {
          response = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: attemptBody(false),
          });
        }

        if (response.ok) {
          const resJson = await response.json();
          const content = resJson.choices?.[0]?.message?.content || '';
          const extracted = extractJsonFromText(content);
          if (extracted) {
            return { data: extracted, modelUsed: model };
          }
        }
      } catch {
        // Switch to next model or procedural fallback
      }
    }
  }

  return null;
}

function extractSynopsisHighlights(synopsis: string, title: string) {
  const clean = synopsis.trim();
  if (!clean) {
    return {
      openingClause: `أحداث عمل «${title}»`,
      conflictClause: `الصراع الدرامي في «${title}»`,
      endingClause: `النهاية المفاجئة للعمل`,
      wordCount: 0,
    };
  }
  const parts = clean
    .split(/[،.,!؟\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 6);

  const openingClause = parts[0] || clean.slice(0, 65);
  const conflictClause = parts[1] || parts[0] || clean.slice(0, 65);
  const endingClause = parts[parts.length - 1] || conflictClause;
  const wordCount = clean.split(/\s+/).length;

  return { openingClause, conflictClause, endingClause, wordCount };
}

/**
 * Stage 2 Mode A: Generate an original movie/series title and full dramatic synopsis
 */
async function handleGenerateScriptIdea(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const format = String(payload.format || 'film');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || 'أكشن');
  const secondaryGenre = String(payload.secondaryGenreName || payload.secondaryGenre || '');
  const ageRating = String(payload.ageRating || '+12');
  const seedTitle = String(payload.currentTitle || '').trim();

  const systemPrompt = `${directive}
أنت سيناريست ومؤلف سينمائي ودرامي محترف في عالم ${ctx.industryLabel}.
المطلوب منك تأليف فكرة وسيناريو جذاب جداً ومبتكر لـ ${format === 'film' ? 'فيلم سينمائي' : 'مسلسل درامي'} يناسب أجواء ${ctx.countryLabel} (${ctx.citiesAndLandmarks}):
- التصنيف الأساسي: ${primaryGenre} ${secondaryGenre ? `مع تصنيف فرعي: ${secondaryGenre}` : ''}
- التصنيف العمري: ${ageRating}
${seedTitle ? `- عنوان مقترح من المنتج لبناء القصة عليه: "${seedTitle}"` : ''}

اكتب بـ ${ctx.dialectStyle} (من 3 إلى 4 جمل تصف البطل، الصراع الرئيسي، والمفاجأة الدرامية في النهاية) بدون أي مبالغة أو ألفاظ سوقية.
أرجع كائن JSON فقط يحتوي على:
- title: اسم الفيلم أو المسلسل (عنوان سينمائي جذاب مناسب لـ ${ctx.industryLabel})
- synopsis: ملخص القصة والحبكة والصراع والنهاية المفاجئة`;

  const userPrompt = `ولّد عنوان وسيناريو جديد ومميز الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.title === 'string' && typeof groqRes.data.synopsis === 'string') {
    return NextResponse.json({
      source: 'ورشة تطوير السيناريو',
      title: groqRes.data.title,
      synopsis: groqRes.data.synopsis,
    });
  }

  const ideas = ctx.fallbackIdeas;
  const picked = ideas[Math.floor(Math.random() * ideas.length)] || {
    title: 'المسار المفقود',
    synopsis: 'قصة إثارة ودراما مشوقة تكشف أسراراً غير متوقعة في سباق مع الزمن.',
  };
  return NextResponse.json({
    source: 'ورشة تطوير السيناريو',
    title: seedTitle || picked.title,
    synopsis: picked.synopsis,
  });
}

/**
 * Stage 2 Mode B: Analyze the player's written script synopsis
 */
async function handleAnalyzeScriptSynopsis(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const title = String(payload.title || 'العمل الفني الجديد');
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || 'دراما');
  const format = String(payload.format || 'film');

  const { openingClause, conflictClause, wordCount } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `${directive}
أنت مستشار سيناريو وناقد درامي محترف في ${ctx.industryLabel}.
المنتج كتب سيناريو ${format === 'film' ? 'فيلم' : 'مسلسل'} بعنوان "${title}" (النوع: ${primaryGenre}):
"${synopsis}"

قيّم السيناريو بصدق وموضوعية بـ ${ctx.dialectStyle}:
- لو السيناريو قصير أو سطحي، اعطِه تقييماً متوسطاً (55 إلى 70) ووضح بهدوء ما يحتاجه.
- لو السيناريو فيه حبكة وصراع واضح ونهاية مشوقة، اعطِه تقييماً قوياً (75 إلى 92).

أرجع JSON فقط يحتوي على:
- score: رقم من 45 إلى 95 يعبر عن قوة السيناريو
- verdict: رأيك الفني في القصة (جملتان تذكران تفاصيل من القصة نفسها)
- castingAdvice: نصيحة للمنتج عن نوعية النجوم والمخرجين المناسبين لهذا الورق.`;

  const userPrompt = `حلل سيناريو «${title}» الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.verdict === 'string' &&
    typeof groqRes.data.castingAdvice === 'string'
  ) {
    const score = Math.min(96, Math.max(45, Number(groqRes.data.score || 78)));
    return NextResponse.json({
      source: 'لجنة القراءة الدرامية',
      score,
      verdict: groqRes.data.verdict,
      castingAdvice: groqRes.data.castingAdvice,
    });
  }

  const baseScore = wordCount >= 22 ? 86 : wordCount >= 12 ? 76 : 63;
  return NextResponse.json({
    source: 'لجنة القراءة الدرامية',
    score: baseScore,
    verdict:
      wordCount >= 14
        ? `معالجة «${title}» متماسكة درامياً، وخاصة البداية عند "${openingClause}" وتصاعد الصراع في "${conflictClause}"، ما يمنح العمل جاذبية حقيقية لدى الجمهور.`
        : `فكرة «${title}» عند "${openingClause}" مبشرة كبداية، لكن الورق يحتاج تفصيلاً أعمق في نقطة التحول والنهاية لإقناع نجوم الصف الأول.`,
    castingAdvice:
      wordCount >= 14
        ? `نجوم تصنيف (${primaryGenre}) سيتحمسون للدور، لكن النجوم الكبار سيطالبون بأجرهم الكامل أو نسبة من عوائد العرض.`
        : `نظراً لاختصار المعالجة الدرامية، قد يتردد بعض النجوم الكبار إلا في حال تقديم عرض مالي قوي ومغري.`,
  });
}

/**
 * Stage 3 Helper: Generate a tailored dramatic character role description for an actor based on the script
 */
async function handleGenerateCharacterRole(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const talentName = String(payload.talentName || 'النجم');
  const archetype = String(payload.archetype || '');
  const roleBillingSize = (payload.roleBillingSize as RoleBillingSize) || 'lead_star';
  const title = String(payload.projectTitle || payload.title || 'العمل الفني الجديد');
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenre || 'دراما');

  const billingLabel = ROLE_BILLING_META[roleBillingSize]?.label || 'بطولة';
  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `${directive}
أنت مؤلف وسيناريست محترف في ${ctx.industryLabel}.
المطلوب ابتكار اسم ووصف شخصية درامية عميقة ومغرية للفنان "${talentName}" (${archetype}) ليؤديها بحجم دور (${billingLabel}) في عمل "${title}" (النوع: ${primaryGenre}) والذي تدور قصته حول: "${synopsis}".
اجعل وصف الشخصية من جملة واحدة مركزة وقوية (10 إلى 18 كلمة) مترابطة مباشرة مع أحداث القصة.
أرجع JSON فقط يحتوي على:
- roleDescription: وصف الشخصية الدرامية في العمل`;

  const userPrompt = `ابتكر وصف الشخصية الدرامية لـ "${talentName}" في «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.roleDescription === 'string') {
    return NextResponse.json({
      roleDescription: groqRes.data.roleDescription.trim(),
    });
  }

  const seed = hashSeed(`${talentName}_${title}_${roleBillingSize}`);
  const fallbackRoles =
    roleBillingSize === 'antagonist'
      ? [
          `العقل المدبر الخفي وراء أزمة "${conflictClause.slice(0, 35)}" والخصم الأخطر في «${title}»`,
          `رجل النفوذ الغامض الذي يحرك خيوط الصراع في "${openingClause.slice(0, 35)}" ويقلب الموازين`,
        ]
      : roleBillingSize === 'cameo'
      ? [
          `ظهور استثنائي حاسم يكشف السر المفقود في ذروة أحداث «${title}»`,
          `ضيف شرف مفاجئ يغير مسار المواجهة عند "${conflictClause.slice(0, 35)}"`,
        ]
      : [
          `المحور الرئيسي الذي يقود مواجهة "${openingClause.slice(0, 35)}" ويكشف الحقيقة في «${title}»`,
          `الشخصية القيادية التي تخوض صراعاً مصيرياً في قلب "${conflictClause.slice(0, 35)}"`,
        ];

  return NextResponse.json({
    roleDescription: fallbackRoles[seed % fallbackRoles.length],
  });
}

/**
 * Stage 3: Evaluate Talent Offer (Actor / Director / Crew) — Non-repetitive, natural Egyptian professional tone
 */
async function handleEvaluateTalentOffer(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const talentName = String(payload.talentName || 'النجم');
  const isActor = payload.isActor !== false;
  const starTier = (payload.starTier as 'S' | 'A' | 'B' | 'C') || 'B';
  const overall = Number(payload.overall || 82);
  const roleBillingSize = (payload.roleBillingSize as RoleBillingSize) || 'lead_star';
  const roleLabel = String(
    payload.customRoleDescription || payload.roleLabel || payload.roleTitle || 'البطولة'
  );
  const ego = Number(payload.ego || 78);
  const baseSalary = Number(payload.baseSalary || 20_000_000);
  const offeredSalary = Number(payload.offeredSalary || baseSalary);
  const backendPoints = Number(payload.backendPoints || 0);
  const vipDinner = Boolean(payload.vipDinner);
  const title = String(payload.projectTitle || payload.title || 'العمل الفني الجديد');
  const synopsis = String(payload.scriptSynopsis || payload.synopsis || '');
  const genreName = String(payload.primaryGenre || payload.genreName || 'دراما');
  const genreMasteryScore = Number(payload.genreMasteryScore || 75);
  const studioName = String(payload.studioName || 'استوديو الإنتاج');
  const studioReputation = Number(payload.studioReputation || 65);
  const directorName = payload.directorName ? String(payload.directorName) : null;
  const directorOverall = payload.directorOverall ? Number(payload.directorOverall) : null;
  const aiMemoryLog = Array.isArray(payload.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 8)
    : [];

  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title);

  const deepEval = evaluateTalentOfferDeep({
    talentName,
    isActor,
    starTier,
    overall,
    ego,
    baseSalary,
    offeredSalary,
    backendPoints,
    vipDinner,
    roleBillingSize,
    customRoleDescription: roleLabel,
    projectTitle: title,
    scriptSynopsis: synopsis,
    genreName,
    genreMasteryScore,
    studioReputation,
    directorName,
    directorOverall,
    currencyLabel: ctx.currencyLabel,
  });

  const billingArabic = isActor
    ? ROLE_BILLING_META[roleBillingSize]?.label || roleLabel
    : String(payload.roleTitle || roleLabel);

  const defaultWaitDays = starTier === 'S' || ego >= 85 ? 3 : 2;
  const memoryBlock =
    aiMemoryLog.length > 0
      ? `\nسجل ذاكرة الصناعة وتاريخ الاستوديو ("${studioName}"):\n- ${aiMemoryLog.join('\n- ')}`
      : '';

  const systemPrompt = `${directive}
أنت الفنان/المخرج "${talentName}" في عالم ${ctx.industryLabel} (الفئة: ${starTier}، التقييم العام: ${overall}/100، الغرور الفني: ${ego}/100).
تلقيت عرضاً رسمياً من شركة "${studioName}" للمشاركة في عمل فني عنوانه "${title}" (التصنيف: ${genreName}).
عوامل تقييم العرض بالكامل:
1. حجم الدور ومكانته مقارنة بحجم نجوميتك: ${billingArabic} — (${deepEval.roleFitVerdict} · درجة الملاءمة: ${deepEval.roleFitScore}/100)
2. وصف الشخصية والدور: "${roleLabel}"
3. ملخص السيناريو والقصة: "${synopsis}"
4. العرض المالي ونسبة الأرباح: معروض عليك ${(offeredSalary / 1_000_000).toFixed(1)} مليون ${ctx.currencyLabel} (مقابل أجرك المتوقع ${(deepEval.expectedMinimumSalary / 1_000_000).toFixed(1)} مليون ${ctx.currencyLabel}) + نسبة أرباح من الشباك ${backendPoints}% ${vipDinner ? '+ دعوة عشاء عمل خاص وقراءة سيناريو VIP' : ''}.
5. إتقانك للتصنيف (${genreName}): ${genreMasteryScore}/100، وسمعة الاستوديو: ${studioReputation}/100${directorName ? `، والمخرج المتعاقد: ${directorName}` : ''}.${memoryBlock}

قرار التقييم الفني والمالي النهائي: ${deepEval.willAccept ? 'الموافقة على العرض (accepted: true)' : `الاعتذار ورفض العرض (accepted: false) بسبب: ${deepEval.rejectionCategory}`}.

المطلوب:
- حدد عدد الأيام التي ستستغرقها لدراسة السيناريو والعقد مع وكيل أعمالك قبل إعلان قرارك الرسمي: waitDays (إما 2 أو 3 أيام).
- اكتب ردك الرسمي المعمق (reason) في جملتين أو ثلاث جمل طبيعية بـ ${ctx.dialectStyle} توضح بدقة لماذا قبلت أو رفضت بناءً على حجم الدور مقارنة بمكانتك، وقوة القصة ("${openingClause}" / "${conflictClause}")، والراتب ونسبة الأرباح، وتاريخ الاستوديو.

أرجع JSON فقط يحتوي على:
- accepted: بوليان (${deepEval.willAccept})
- waitDays: رقم (2 أو 3)
- reason: ردك التفصيلي الواضح الذي سيتسلمه المنتج بعد انتهاء أيام الدراسة.`;

  const userPrompt = `قيّم عرض دور "${roleLabel}" (${billingArabic}) لـ "${talentName}" في «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.reason === 'string') {
    const rawWait = Number(groqRes.data.waitDays);
    const waitDays = rawWait === 3 ? 3 : rawWait === 2 ? 2 : defaultWaitDays;
    return NextResponse.json({
      source: 'وكيل أعمال الفنان',
      accepted: deepEval.willAccept,
      willAccept: deepEval.willAccept,
      waitDays,
      reason: groqRes.data.reason,
      roleFitVerdict: deepEval.roleFitVerdict,
      rejectionCategory: deepEval.rejectionCategory,
    });
  }

  return NextResponse.json({
    source: 'وكيل أعمال الفنان',
    accepted: deepEval.willAccept,
    willAccept: deepEval.willAccept,
    waitDays: defaultWaitDays,
    reason: deepEval.detailedReason,
    roleFitVerdict: deepEval.roleFitVerdict,
    rejectionCategory: deepEval.rejectionCategory,
  });
}

/**
 * Stage 5 Series Mode: Evaluate a newly aired TV Series Episode (Episode 1 .. N)
 */
async function handleEvaluateSeriesEpisode(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const episodeNumber = Number(payload.episodeNumber || 1);
  const totalEpisodes = Number(payload.totalEpisodes || 15);
  const title = String(payload.projectTitle || payload.title || 'العمل الدرامي الجديد');
  const synopsis = String(payload.synopsis || '');
  const leadName = String(payload.leadName || 'بطل المسلسل');
  const antagonistName = String(payload.antagonistName || 'الخصم الدرامي');
  const directorName = String(payload.directorName || 'المخرج');
  const currentRevenueMillions = String(payload.currentRevenueMillions || '25.0');

  const { openingClause, conflictClause, endingClause } =
    extractSynopsisHighlights(synopsis, title);

  const isPremiere = episodeNumber <= 2;
  const isFinale = episodeNumber === totalEpisodes;
  const isClimax = episodeNumber >= totalEpisodes - 2 && !isFinale;
  const isMidpoint = !isPremiere && !isFinale && !isClimax;

  const arcFocus = isPremiere
    ? `تأسيس الشخصيات وانطلاق الأحداث عند "${openingClause}"`
    : isFinale
    ? `الحلقة الأخيرة وحسم الصراع النهائي عند "${endingClause}"`
    : isClimax
    ? `ذروة المواجهة الدرامية وانكشاف الأسرار الكبرى في "${conflictClause}"`
    : `تصاعد الصراع وتشابك الخطوط الدرامية حول "${conflictClause}"`;

  const systemPrompt = `${directive}
أنت ناقد درامي ومحرر متابعة مسلسلات في عالم ${ctx.industryLabel}.
تم الآن عرض الحلقة رقم ${episodeNumber} من أصل ${totalEpisodes} حلقة من مسلسل "${title}".
قصة المسلسل: "${synopsis}".
البطل: "${leadName}"، الخصم: "${antagonistName}"، المخرج: "${directorName}".
تركيز الحلقة الحالية: ${arcFocus}.
إجمالي عوائد العرض والإعلانات حتى هذه الحلقة: ${currentRevenueMillions} مليون ${ctx.currencyLabel}.

اكتب تقريراً موجزاً ومميزاً وغير مكرر بـ ${ctx.dialectStyle} يصف ما حدث في الحلقة ${episodeNumber} وكيف تفاعل الجمهور والنقاد معها.
أرجع JSON فقط يحتوي على:
- headline: عنوان تقرير الحلقة ${episodeNumber}
- detail: جملتان تصفان أبرز مشهد في الحلقة ${episodeNumber} ورد فعل المشاهدين والنقاد
- impact_type: "positive" أو "drama"
- hype_delta: رقم بين 2 و 7
- daily_revenue_multiplier: رقم بين 0.85 و 1.38 يحدد قوة إقبال المشاهدين والإعلانات في هذه الحلقة مقارنة بالمنافسين
- rival_momentum: رقم بين 0.85 و 1.25 يحدد زخم المسلسلات المنافسة في هذه الحلقة`;

  const userPrompt = `اكتب تقرير عرض الحلقة ${episodeNumber} من مسلسل «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: 'مرصد الدراما',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? 4),
      daily_revenue_multiplier: Math.min(1.4, Math.max(0.8, Number(groqRes.data.daily_revenue_multiplier || 1.08))),
      rival_momentum: Math.min(1.3, Math.max(0.82, Number(groqRes.data.rival_momentum || 1.0))),
    });
  }

  const seed = hashSeed(`${title}_ep_${episodeNumber}`);
  if (isFinale) {
    return NextResponse.json({
      source: 'مرصد الدراما',
      headline: `الحلقة الأخيرة (${episodeNumber}): نهاية حاسمة لمسلسل «${title}» تتصدر نقاشات الجمهور!`,
      detail: `حسمت الحلقة الأخيرة مصير الصراع عند "${endingClause}" في مواجهة تمثيلية قوية بين ${leadName} و${antagonistName}، ووصلت إجمالي عوائد المسلسل إلى ${currentRevenueMillions}M ${ctx.currencyLabel}.`,
      impact_type: 'positive',
      hype_delta: 7,
    });
  }

  if (isClimax) {
    return NextResponse.json({
      source: 'مرصد الدراما',
      headline: `الحلقة ${episodeNumber} من «${title}»: انكشاف السر الأكبر يرفع نسب المشاهدة لذروتها!`,
      detail: `شهدت الحلقة ${episodeNumber} نقطة التحول الكبرى في خط "${conflictClause}" بإدارة إخراجية مشدودة من ${directorName}، مع ترقب واسع لأحداث الحلقة القادمة.`,
      impact_type: 'drama',
      hype_delta: 6,
    });
  }

  const midVariants = [
    {
      headline: `الحلقة ${episodeNumber}: مواجهة قوية لـ ${leadName} تغير مسار الأحداث في «${title}»`,
      detail: `تفاعل المشاهدون مع تطور خط "${openingClause}" في الحلقة ${episodeNumber}، بينما أشاد النقاد بتماسك الإيقاع الدرامي وارتفاع عوائد البث إلى ${currentRevenueMillions}M ${ctx.currencyLabel}.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
    {
      headline: `الحلقة ${episodeNumber} من «${title}»: مفاجأة في المشهد الأخير تشعل توقعات الحلقة القادمة`,
      detail: `انتهت الحلقة ${episodeNumber} على قفلة درامية مشوقة تتعلق بـ "${conflictClause}"، ما دفع الجمهور للتفاعل بكثافة حول مصير شخصية ${leadName}.`,
      impact_type: 'drama',
      hype_delta: 5,
    },
    {
      headline: `إشادات نقدية بأداء ${leadName} و${antagonistName} في الحلقة ${episodeNumber} من «${title}»`,
      detail: `قدم الثنائي مشهداً محورياً في سياق "${conflictClause}" منح الحلقة ${episodeNumber} أعلى نسبة مشاهدة منذ انطلاق عرض المسلسل.`,
      impact_type: 'positive',
      hype_delta: 5,
    },
    {
      headline: `الحلقة ${episodeNumber}: تصاعد التوتر الدرامي في «${title}» يجذب شريحة جديدة من المشاهدين`,
      detail: `نجح المخرج ${directorName} في تقديم معالجة بصرية مميزة لتفاصيل "${openingClause}" خلال الحلقة ${episodeNumber}، وسط منافسة قوية على صدارة الموسم.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
  ];

  const chosen = midVariants[(seed + (isMidpoint ? episodeNumber : 0)) % midVariants.length];
  return NextResponse.json({
    source: 'مرصد الدراما',
    ...chosen,
  });
}

/**
 * Stage 4 & Stage 5: Generate Milestone News from Filming Set or Box Office (Non-repetitive)
 */
async function handleGenerateDailyNews(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const phase = String(payload.phase || 'box_office');
  const day = Number(payload.gameDay || payload.day || 1);
  const title = String(payload.projectTitle || payload.title || 'العمل الفني الجديد');
  const synopsis = String(payload.synopsis || '');
  const leadName = String(payload.leadActorName || payload.leadName || 'بطل العمل');
  const directorName = String(payload.directorName || 'المخرج');
  const rivalTitle = String(payload.rivalTitle || 'العمل المنافس');
  const currentRevenueMillions = String(payload.currentRevenueMillions || '12.5');
  const aiMemoryLog = Array.isArray(payload.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 6)
    : [];

  const { openingClause, conflictClause, endingClause } =
    extractSynopsisHighlights(synopsis, title);

  const memoryContext =
    aiMemoryLog.length > 0
      ? `\n- ذاكرة الأحداث السابقة في الاستوديو والصناعة:\n  * ${aiMemoryLog.join('\n  * ')}`
      : '';

  const systemPrompt = `${directive}
أنت محرر صحافة فنية في عالم ${ctx.industryLabel}.
اكتب خبراً فنياً واحداً مميزاً وغير مكرر بـ ${ctx.dialectStyle} عن اليوم رقم ${day}:
- المرحلة: ${phase === 'filming' ? 'كواليس التصوير والإنتاج' : 'منافسة شباك التذاكر السينمائي'}
- اسم العمل: "${title}"
- القصة: "${synopsis}"
- البطل: "${leadName}" والمخرج: "${directorName}"
- المنافس: "${rivalTitle}"
- الإيرادات الحالية: ${currentRevenueMillions} مليون ${ctx.currencyLabel}${memoryContext}

اربط الخبر بتفاصيل القصة ("${openingClause}" أو "${conflictClause}") وبسجل أحداث الاستوديو إن وجد.
أرجع JSON فقط يحتوي على:
- headline: عنوان الخبر
- detail: تفاصيل الخبر في جملتين
- impact_type: "positive" أو "drama" أو "rival"
- hype_delta: رقم بين -3 و +7
- daily_revenue_multiplier: رقم بين 0.80 و 1.40 يحدد زخم شباك التذاكر اليومي للفيلم بناءً على تفاعل الجمهور والنقاد
- rival_momentum: رقم بين 0.85 و 1.30 يحدد زخم الأفلام المنافسة في شباك التذاكر اليوم`;

  const userPrompt = `اكتب تقريراً صحفياً فنياً عن «${title}» في اليوم ${day} بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: 'الصحافة الفنية',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || groqRes.data.impactType || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? groqRes.data.hypeDelta ?? 4),
      daily_revenue_multiplier: Math.min(1.42, Math.max(0.78, Number(groqRes.data.daily_revenue_multiplier || 1.06))),
      rival_momentum: Math.min(1.32, Math.max(0.82, Number(groqRes.data.rival_momentum || 1.0))),
    });
  }

  const seed = hashSeed(`${title}_${phase}_${day}`);

  const filmingNews = [
    {
      headline: `كواليس تصوير «${title}»: تحضيرات خاصة لتنفيذ مشهد "${openingClause.slice(0, 35)}..."`,
      detail: `كثف المخرج ${directorName} ساعات التصوير مع ${leadName} لتقديم المشهد بأعلى دقة بصرية ممكنة قبل موعد الطرح.`,
      impact_type: 'positive',
      hype_delta: 5,
    },
    {
      headline: `${leadName} ينتهي من تصوير المشاهد الرئيسية للصراع في «${title}»`,
      detail: `أكد فريق الإنتاج أن مشاهد "${conflictClause.slice(0, 40)}..." خرجت بصورة سينمائية متميزة ترفع سقف التوقعات للعمل.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
    {
      headline: `ترقب في الوسط الفني بعد الكشف عن اللقطات الأولى من «${title}»`,
      detail: `أثارت اللقطات المسربة من موقع تصوير "${openingClause.slice(0, 35)}..." اهتمام النقاد والجمهور بفضل الأجواء البصرية المختلفة.`,
      impact_type: 'drama',
      hype_delta: 5,
    },
    {
      headline: `المخرج ${directorName} يبدأ مراحل المونتاج الأولي لمشاهد «${title}»`,
      detail: `يشرف ${directorName} شخصياً على ضبط إيقاع المشاهد الختامية الخاصة بـ "${endingClause.slice(0, 35)}..." لضمان تجربة مشدودة.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
  ];

  const releaseNews = [
    {
      headline: `اليوم ${day}: منافسة قوية في شباك التذاكر بين «${title}» و«${rivalTitle}»`,
      detail: `وصلت إيرادات «${title}» إلى ${currentRevenueMillions}M ${ctx.currencyLabel} بدعم من الإقبال الجماهيري على مشاهدة خط "${conflictClause.slice(0, 38)}...".`,
      impact_type: 'rival',
      hype_delta: 4,
    },
    {
      headline: `اليوم ${day}: نقاشات فنية واسعة حول نهاية «${title}» وأداء ${leadName}`,
      detail: `أشاد قطاع كبير من المشاهدين ببداية "${openingClause.slice(0, 35)}..."، بينما أثارت قفلة العمل عند "${endingClause.slice(0, 35)}..." حوارات نقدية متباينة.`,
      impact_type: 'drama',
      hype_delta: 5,
    },
    {
      headline: `اليوم ${day}: الحفلات المسائية ترفع حصيلة «${title}» إلى ${currentRevenueMillions}M ${ctx.currencyLabel}`,
      detail: `سجلت قاعات العرض نسب إشغال مرتفعة مع توصيات الجمهور بمشاهدة المواجهة التمثيلية التي يقودها ${leadName}.`,
      impact_type: 'positive',
      hype_delta: 5,
    },
    {
      headline: `اليوم ${day}: قراءة نقدية في رؤية ${directorName} الإخراجية لفيلم «${title}»`,
      detail: `أشار نقاد السينما إلى أن توظيف الكاميرا والإضاءة في مشاهد "${conflictClause.slice(0, 35)}..." منح الفيلم ثقلاً فنياً وسط أفلام الموسم.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
    {
      headline: `اليوم ${day}: «${title}» يحافظ على زخمه الجماهيري ويقترب من حاجز جديد في الإيرادات`,
      detail: `استمر تدفق العائلات والشباب على القاعات لترتفع الحصيلة التراكمية إلى ${currentRevenueMillions}M ${ctx.currencyLabel} في سباق الموسم.`,
      impact_type: 'positive',
      hype_delta: 4,
    },
  ];

  const pool = phase === 'filming' ? filmingNews : releaseNews;
  return NextResponse.json({
    source: 'الصحافة الفنية',
    ...pool[(seed + day) % pool.length],
  });
}

/**
 * Stage 4 (Merged Golden Moment #1): Generate 3 Mid-Production Filming Crises + 1 Initial Press News in ONE JSON call!
 */
async function handleGenerateCrises(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { worldMarket, ctx, directive } = resolveMarketContext(payload);
  const title = String(payload?.title || 'العمل الفني الجديد');
  const synopsis = String(payload?.synopsis || '');
  const directorName = String(payload?.directorName || 'المخرج');
  const leadName = String(payload?.leadActorName || payload?.leadName || 'بطل العمل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const studioName = String(payload?.studioName || 'الاستوديو');
  const ageRating = String(payload?.ageRating || '+12');
  const hasEgoClash = Boolean(payload?.hasEgoClash);

  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title);
  const proceduralNews = composeProceduralFilmingNews({
    worldMarket,
    projectTitle: title,
    studioName,
    directorName,
    leadName,
    synopsis,
    format: payload?.format === 'series' ? 'series' : 'film',
  });

  const systemPrompt = `${directive}
Generate 3 concise on-set production crises AND 1 filming press news item for "${title}" (lead: ${leadName}, antagonist: ${antagonistName}, director: ${directorName}, rating: ${ageRating}, egoClash: ${hasEgoClash}, plot: "${synopsis.slice(0, 220)}").
JSON keys:
- crises: array of 3 objects { id, title, description (1-2 sentences), optionA: { label, cost (number), hypeDelta, qualityDelta }, optionB: { label, cost (number), hypeDelta, qualityDelta } }
- pressNews: { headline, detail (1-2 sentences), impactType: "positive"|"drama"|"rival", hypeDelta (2..6) }`;

  const userPrompt = `Generate 3 crises + 1 filming pressNews for "${title}" now.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel || 'mid_production_crises',
    520
  );
  if (groqRes && Array.isArray(groqRes.data.crises) && groqRes.data.crises.length >= 2) {
    const rawNews = groqRes.data.pressNews as Record<string, unknown> | undefined;
    const pressNews =
      rawNews && typeof rawNews.headline === 'string' && typeof rawNews.detail === 'string'
        ? {
            headline: rawNews.headline,
            detail: rawNews.detail,
            impactType:
              rawNews.impactType === 'drama' || rawNews.impactType === 'rival'
                ? (rawNews.impactType as 'drama' | 'rival')
                : ('positive' as const),
            hypeDelta: Math.min(8, Math.max(-4, Number(rawNews.hypeDelta ?? 4))),
          }
        : proceduralNews;

    return NextResponse.json({
      source: 'إدارة الإنتاج',
      crises: groqRes.data.crises,
      pressNews,
    });
  }

  const fallbackCrises = [
    {
      id: `crisis_plot_${Date.now()}_1`,
      title: `تعديل مفاجئ في تنفيذ مشهد "${openingClause.slice(0, 38)}..."`,
      description: `أثناء تصوير المشهد المحوري في «${title}»، طلب ${leadName} ومدير التصوير إعادة بناء جزء من الديكور ليظهر المشهد بواقعية أعلى، وهو ما يتطلب ميزانية إضافية.`,
      optionA: {
        label: `الموافقة على تطوير الديكور وتنفيذ المشهد بأعلى جودة (3.5M ${ctx.currencyLabel})`,
        cost: 3_500_000,
        hypeDelta: 6,
        qualityDelta: 5,
      },
      optionB: {
        label: 'الاكتفاء بالتجهيزات الحالية التزاماً بسقف الميزانية',
        cost: 0,
        hypeDelta: -4,
        qualityDelta: -5,
      },
    },
    {
      id: `crisis_clash_${Date.now()}_2`,
      title: hasEgoClash
        ? `خلاف فني بين ${leadName} و${antagonistName} حول مساحة المشاهد`
        : `تسريب لقطات من كواليس المواجهة بين ${leadName} و${antagonistName}`,
      description: hasEgoClash
        ? `توقف التصوير مؤقتاً بسبب نقاش حاد بين ${leadName} و${antagonistName} حول صياغة الحوار في مشهد "${conflictClause.slice(0, 40)}..." وترتيب الظهور.`
        : `انتشرت عبر منصات التواصل لقطات مسربة من كواليس تصوير مشهد "${conflictClause.slice(0, 40)}..." مما كشف جزءاً من مفاجأة العمل.`,
      optionA: {
        label: `تصوير مشاهد إضافية بديلة واستثمار الحدث دعائياً (2.5M ${ctx.currencyLabel})`,
        cost: 2_500_000,
        hypeDelta: 10,
        qualityDelta: 4,
      },
      optionB: {
        label: `تشديد الحراسة على اللوكيشن واستكمال الجدول كما هو (0.5M ${ctx.currencyLabel})`,
        cost: 500_000,
        hypeDelta: -3,
        qualityDelta: -2,
      },
    },
    {
      id: `crisis_censor_${Date.now()}_3`,
      title: `ملاحظات رقابية على بعض مشاهد «${title}» (${ageRating})`,
      description: `طلبت اللجنة الرقابية تخفيف حدة بعض التفاصيل في خط "${conflictClause.slice(0, 40)}..." للحفاظ على التصنيف العمري (${ageRating}) دون تأجيل موعد العرض.`,
      optionA: {
        label: `إعادة صياغة وتصوير المشهد بمعالجة درامية ذكية (1.8M ${ctx.currencyLabel})`,
        cost: 1_800_000,
        hypeDelta: 4,
        qualityDelta: 3,
      },
      optionB: {
        label: 'حذف اللقطات مباشرة في غرفة المونتاج دون إعادة تصوير',
        cost: 0,
        hypeDelta: -3,
        qualityDelta: -6,
      },
    },
  ];

  return NextResponse.json({
    source: 'إدارة الإنتاج',
    crises: fallbackCrises,
    pressNews: proceduralNews,
  });
}

/**
 * Stage 6: Generate Festival Jury Speech & Commentary
 */
async function handleEvaluateFestivalCeremony(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const festivalName = String(payload.festivalName || ctx.defaultFestival);
  const title = String(payload.projectTitle || payload.title || 'العمل الفني الجديد');
  const synopsis = String(payload.synopsis || '');
  const directorName = String(payload.directorName || 'المخرج');
  const leadName = String(
    Array.isArray(payload.leadActors)
      ? (payload.leadActors as string[]).join(' و')
      : payload.leadName || 'البطل'
  );
  const criticScore = Number(payload.criticScore || 7.2);
  const wonCount = Array.isArray(payload.wonAwards)
    ? payload.wonAwards.length
    : Number(payload.wonCount || 0);

  const { openingClause } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `${directive}
أنت رئيس لجنة التحكيم في "${festivalName}" ضمن عالم ${ctx.industryLabel}.
تم عرض عمل "${title}" (تقييم النقاد: ${criticScore}/10، إخراج: ${directorName}، بطولة: ${leadName}) والذي تدور قصته حول: "${synopsis}".
العمل فاز بـ ${wonCount} جوائز في المهرجان.
اكتب بيان لجنة التحكيم بـ ${ctx.dialectStyle} (جملتين فقط) يوضح رأي اللجنة في معالجة العمل ("${openingClause}") وأداء الأبطال.
أرجع JSON فقط يحتوي على:
- juryStatement: نص بيان لجنة التحكيم
- festivalBuzz: جملة قصيرة تصف أصداء الحفل على السجادة الحمراء.`;

  const userPrompt = `اكتب بيان لجنة تحكيم ${festivalName} عن «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.juryStatement === 'string') {
    return NextResponse.json({
      source: 'لجنة تحكيم المهرجان',
      juryStatement: groqRes.data.juryStatement,
      festivalBuzz:
        typeof groqRes.data.festivalBuzz === 'string'
          ? groqRes.data.festivalBuzz
          : `تصفيق حار في القاعة الكبرى عقب إعلان نتائج «${title}»!`,
    });
  }

  return NextResponse.json({
    source: 'لجنة تحكيم المهرجان',
    juryStatement:
      wonCount >= 3
        ? `أشادت لجنة تحكيم ${festivalName} بالمعالجة الدرامية المتقنة لخط "${openingClause}" في «${title}»، واعتبرت التكامل بين رؤية ${directorName} وأداء ${leadName} من أبرز علامات الموسم الفني.`
        : wonCount >= 1
        ? `أكدت لجنة تحكيم ${festivalName} أن «${title}» قدّم معالجة جادة ومميزة لفكرة "${openingClause}" استحق عليها التتويج وسط منافسة قوية في باقي الفئات.`
        : `رغم التقدير الواضح لجهود ${leadName} والمخرج ${directorName} في «${title}»، رأت لجنة تحكيم ${festivalName} أن معالجة "${openingClause}" كانت بحاجة إلى تعميق أكبر لحسم الجوائز الكبرى هذا العام.`,
    festivalBuzz:
      wonCount >= 2
        ? `حفاوة كبيرة بصناع «${title}» على السجادة الحمراء بعد حصد جوائز المهرجان!`
        : `نقاشات فنية ثرية بين النقاد وصناع السينما في ختام فعاليات ${festivalName}.`,
  });
}

/**
 * World Simulation Mode: Invent a brand-new Rising Star Actor/Actress via AI
 */
async function handleDiscoverAiRisingStar(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const existingNames = Array.isArray(payload?.existingNames)
    ? (payload.existingNames as string[]).join('، ')
    : '';
  const studioName = String(payload?.studioName || 'استوديو اللاعب');
  const ceoName = String(payload?.ceoName || 'المنتج التنفيذي');
  const gameDay = Number(payload?.gameDay || 16);
  const currentYear = Number(payload?.currentYear || 2026);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const systemPrompt = `${directive}
أنت كشاف مواهب سينمائية ودرامية في ${ctx.countryLabel} (${ctx.industryLabel}).
سياق عالم اللاعب الحالي: شركة "${studioName}" بقيادة "${ceoName}" في اليوم #${gameDay} من عام ${currentYear}.
آخر أحداث عالم هذا اللاعب: ${memoryArr.slice(0, 4).join(' | ') || 'انطلاق الموسم السينمائي'}.
المطلوب منك ابتكار ممثل شاب صاعد جديد تماماً أو ممثلة شابة صاعدة جديدة تماماً (اسم ثنائي واقعي ومبتكر مناسب لـ ${ctx.countryLabel} وغير موجود في القائمة الحالية: ${existingNames.slice(0, 500)}).
أرجع JSON فقط يحتوي على:
- name: الاسم الثنائي للموهبة الصاعدة
- gender: "M" أو "F"
- age: رقم بين 19 و 27
- archetype: وصف قصير لنوعية الأدوار التي يبرع فيها (مثلاً: "موهبة صاعدة في الإثارة النفسية" أو "نجمة كوميديا ورومانسية شابة")
- base_salary: رقم بين 1600000 و 3400000
- overall: رقم بين 71 و 78
- best_genre: واحد من ("Drama", "Thriller", "Comedy", "Action", "Romance", "Horror", "Sci-Fi", "Historical")
- headline: عنوان خبر فني صحفي عن ظهور هذه الموهبة الصاعدة وتألقها
- detail: جملتان تصفان كيف خطفت الأنظار في الوسط الفني وأصبحت متاحة الآن للتعاقد أمام شركات الإنتاج ومنها "${studioName}".`;

  const userPrompt = `ابتكر موهبة تمثيلية صاعدة جديدة تماماً في اليوم ${gameDay} من عام ${currentYear} بصيغة JSON.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel
  );

  if (groqRes && typeof groqRes.data.name === 'string') {
    const ovr = Math.min(79, Math.max(70, Number(groqRes.data.overall || 74)));
    const actor = {
      id: `act_ai_${Date.now()}_${gameDay}`,
      name: groqRes.data.name.trim(),
      gender: (groqRes.data.gender === 'F' ? 'F' : 'M') as 'M' | 'F',
      age: Math.min(28, Math.max(19, Number(groqRes.data.age || 23))),
      tier: 'C' as const,
      image_url: '',
      base_salary: Math.min(
        4_200_000,
        Math.max(1_500_000, Number(groqRes.data.base_salary || 2_300_000))
      ),
      archetype:
        typeof groqRes.data.archetype === 'string'
          ? groqRes.data.archetype
          : 'موهبة تمثيلية صاعدة',
      stats: {
        overall: ovr,
        acting: Math.min(88, ovr + 3),
        box_office_pull: Math.max(66, ovr - 2),
        charisma: Math.min(88, ovr + 2),
        ego: 46,
      },
      genre_mastery: {
        popular_drama: 86,
        crime_mystery: 84,
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
    };

    return NextResponse.json({
      actor,
      headline:
        typeof groqRes.data.headline === 'string'
          ? groqRes.data.headline
          : `انضمام الوجه السينمائي الجديد «${actor.name}» لبورصة النجوم!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : `أشاد النقاد بحضور «${actor.name}» (${actor.age} سنة) في العروض المسرحية والسينمائية الأخيرة، وأصبح متاحاً الآن للتعاقد.`,
    });
  }

  // Unique procedural seed tied to player's market, studioName, ceoName & gameDay
  const firstMale = ctx.risingFirstMale;
  const firstFemale = ctx.risingFirstFemale;
  const lastNames = ctx.risingLastNames;
  const seed = hashSeed(`${studioName}_${ceoName}_${gameDay}_${currentYear}_${Date.now()}`);
  const isFem = seed % 2 === 0;
  const fName = isFem
    ? firstFemale[seed % firstFemale.length]
    : firstMale[seed % firstMale.length];
  const lName = lastNames[(seed >> 3) % lastNames.length];
  const generatedName = `${fName} ${lName}`;
  const ovr = 72 + (seed % 6);
  const age = 20 + (seed % 7);

  const fallbackActor = {
    id: `act_ai_${Date.now()}_${gameDay}`,
    name: generatedName,
    gender: (isFem ? 'F' : 'M') as 'M' | 'F',
    age,
    tier: 'C' as const,
    image_url: '',
    base_salary: (1.8 + (seed % 14) * 0.1) * 1_000_000,
    archetype: isFem ? 'ممثلة دراما وتشويق شابة' : 'ممثل أكشن وغموض شاب',
    stats: {
      overall: ovr,
      acting: ovr + 3,
      box_office_pull: ovr - 2,
      charisma: ovr + 2,
      ego: 45,
    },
    genre_mastery: {
      popular_drama: 86,
      crime_mystery: 84,
      action: 80,
      comedy: 78,
      light_comedy: 81,
      romance: 82,
    },
    synergy_with: [],
    rivalries: [],
    isAiGenerated: false,
    isRisingDiscovery: true,
    status: 'active' as const,
  };

  return NextResponse.json({
    actor: fallbackActor,
    headline: `اكتشاف فني جديد: تألق «${generatedName}» وانضمامه لسوق النجوم!`,
    detail: `لفت الفنان الشاب «${generatedName}» (${age} سنة) أنظار المخرجين والنقاد بأدائه المتقن، ليصبح متاحاً الآن للتعاقد أمام «${studioName}» والشركات المنافسة.`,
  });
}

/**
 * World Simulation Mode: Invent a brand-new Emerging Production Studio via AI
 */
async function handleDiscoverAiEmergingStudio(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { profile, ctx, directive } = resolveMarketContext(payload);
  const studioName = String(payload?.studioName || 'استوديو اللاعب');
  const ceoName = String(payload?.ceoName || 'المنتج التنفيذي');
  const currentYear = Number(payload?.currentYear || 2026);
  const gameDay = Number(payload?.gameDay || 20);
  const existingStudios = Array.isArray(payload?.existingStudios)
    ? (payload.existingStudios as string[]).join('، ')
    : '';
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const systemPrompt = `${directive}
أنت محلل اقتصادي لصناعة ${ctx.industryLabel}.
سياق العالم الحالي: شركة اللاعب هي "${studioName}" بقيادة "${ceoName}" في عام ${currentYear} (اليوم #${gameDay}).
الشركات الموجودة حالياً في السوق: (${existingStudios}).
آخر أحداث السوق: ${memoryArr.slice(0, 4).join(' | ') || 'منافسة محتدمة على شباك التذاكر'}.

المطلوب منك ابتكار شركة إنتاج سينمائي ودرامي جديدة تماماً تدخل السوق الآن برأس مال قوي لتنافس "${studioName}" وباقي الشركات (اختر اسماً فخماً ومبتكراً يلائم ${ctx.countryLabel} وغير مكرر في القائمة أعلاه).
أرجع JSON فقط يحتوي على:
- name: اسم شركة الإنتاج الجديدة
- ceo: اسم المؤسس والمدير التنفيذي للشركة الجديدة
- specialty: تخصص الشركة الفني (مثلاً "أفلام الإثارة والمنصات الرقمية" أو "الإنتاجات التاريخية والأكشن الضخم")
- estimated_net_worth: القيمة السوقية المبدئية للشركة بعملة ${profile.currencyFullName} (رقم بين 180000000 و 460000000)
- market_power: رقم بين 66 و 83
- preferred_genres: مصفوفة من تصنيفين من ("Action", "Drama", "Thriller", "Comedy", "Horror", "Sci-Fi", "Romance", "Historical")
- headline: عنوان خبر صحفي اقتصادي عاجل عن تأسيس الشركة ودخولها المنافسة
- detail: جملتان تصفان خطة الشركة الجديدة بقيادة مؤسسها لمنافسة "${studioName}" في الموسم القادم.`;

  const userPrompt = `ابتكر شركة إنتاج سينمائي منافسة جديدة تماماً بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel
  );

  const colors = ['#7C3AED', '#0284C7', '#E11D48', '#059669', '#D97706', '#4F46E5'];
  const seed = hashSeed(`${studioName}_${ceoName}_${gameDay}_${currentYear}_${Date.now()}`);

  if (groqRes && typeof groqRes.data.name === 'string' && typeof groqRes.data.ceo === 'string') {
    const netWorth = Math.min(
      520_000_000,
      Math.max(165_000_000, Number(groqRes.data.estimated_net_worth || 260_000_000))
    );
    const power = Math.min(85, Math.max(64, Number(groqRes.data.market_power || 73)));
    const genres = Array.isArray(groqRes.data.preferred_genres) && groqRes.data.preferred_genres.length > 0
      ? (groqRes.data.preferred_genres as string[])
      : ['Drama', 'Thriller'];

    const newStudio = {
      id: `comp_ai_${Date.now()}_${gameDay}`,
      name: groqRes.data.name.trim(),
      ceo: groqRes.data.ceo.trim(),
      logo_url: '',
      market_power: power,
      estimated_net_worth: netWorth,
      specialty:
        typeof groqRes.data.specialty === 'string'
          ? groqRes.data.specialty
          : 'إنتاج سينمائي ودرامي مشترك',
      preferred_genres: genres,
      rival_aggression: 76,
      color: colors[seed % colors.length],
    };

    return NextResponse.json({
      studio: newStudio,
      headline:
        typeof groqRes.data.headline === 'string'
          ? groqRes.data.headline
          : `بورصة الإنتاج: الإعلان رسمياً عن تأسيس «${newStudio.name}» بقيمة سوقية ${(netWorth / 1_000_000).toFixed(0)}M ${ctx.currencyLabel}!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : `أعلن المنتج «${newStudio.ceo}» إطلاق شركة «${newStudio.name}» (${newStudio.specialty}) لتدخل سباق الترتيب العام مباشرة إلى جانب «${studioName}».`,
    });
  }

  const genStudioName =
    ctx.emergingStudioNames[seed % ctx.emergingStudioNames.length];
  const genCeoName =
    ctx.emergingCeoNames[(seed >> 3) % ctx.emergingCeoNames.length];
  const netWorth = (195 + (seed % 180)) * 1_000_000;

  const fallbackStudio = {
    id: `comp_ai_${Date.now()}_${gameDay}`,
    name: genStudioName,
    ceo: genCeoName,
    logo_url: '',
    market_power: 70 + (seed % 12),
    estimated_net_worth: netWorth,
    specialty: 'الإنتاجات السينمائية الضخمة ومسلسلات المنصات',
    preferred_genres: ['Action', 'Thriller'],
    rival_aggression: 75,
    color: colors[seed % colors.length],
  };

  return NextResponse.json({
    studio: fallbackStudio,
    headline: `منافس جديد في السوق: تدشين «${genStudioName}» بقيادة ${genCeoName} بقيمة ${(netWorth / 1_000_000).toFixed(0)}M ${ctx.currencyLabel}!`,
    detail: `دخلت «${genStudioName}» رسمياً إلى جدول ترتيب شركات الإنتاج برأس مال ضخم، معلنة استهدافها استقطاب نجوم الصف الأول ومنافسة «${studioName}».`,
  });
}

/**
 * World Simulation Mode: Generate Contextual Journalistic Breaking News from Background AI Memory Log
 */
async function handleGenerateAiMemoryNews(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { profile, ctx, directive } = resolveMarketContext(payload);
  const studioName = String(payload?.studioName || 'استوديو اللاعب');
  const ceoName = String(payload?.ceoName || 'المنتج التنفيذي');
  const gameDay = Number(payload?.gameDay || 10);
  const currentYear = Number(payload?.currentYear || 2026);
  const marketValue = Number(payload?.marketValue || 110_000_000);
  const cash = Number(payload?.cash || 75_000_000);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const memoryContext =
    memoryArr.length > 0
      ? memoryArr.slice(0, 10).join('\n- ')
      : `تأسيس شركة «${studioName}» بقيادة «${ceoName}» بقيمة سوقية ${(marketValue / 1_000_000).toFixed(0)}M ${ctx.currencyLabel}`;

  const rivalPool = ctx.fallbackRivalStudios;
  const chosenRival = rivalPool[(gameDay + currentYear) % rivalPool.length];

  const systemPrompt = `${directive}
أنت رئيس تحرير جريدة وبوابة أخبار فنية واقتصادية متخصصة في صناعة ${ctx.industryLabel}.
لديك ذاكرة كاملة بكل ما حدث في عالم اللعبة حتى اليوم #${gameDay} من عام ${currentYear}:
- اسم شركة اللاعب: "${studioName}"، المؤسس والمدير التنفيذي: "${ceoName}"
- القيمة السوقية الحالية لشركة اللاعب: ${(marketValue / 1_000_000).toFixed(1)}M ${ctx.currencyLabel}، والسيولة بالخزينة: ${(cash / 1_000_000).toFixed(1)}M ${ctx.currencyLabel}
- سجل ذاكرة الأحداث الأخيرة في عالم اللعبة:
- ${memoryContext}

المطلوب منك:
كتابة خبر صحفي عاجل وحقيقي الصياغة (بأسلوب صحفي فني واقتصادي رصين ومشوق يناسب ${ctx.countryLabel}) يربط بين أحداث الذاكرة السابقة، ويكون له تأثير فعلي ومباشر على عالم اللعبة (إما رفع/خفض القيمة السوقية لشركة "${studioName}"، أو صفقة رعاية تضخ سيولة، أو هزة/قفزة كبيرة في القيمة السوقية لشركة منافسة مثل "${chosenRival}" تغير ترتيب الشركات).

أرجع كائن JSON فقط يحتوي على:
- headline: عنوان صحفي عاجل وقوي
- detail: تفاصيل التقرير الصحفي في جملتين تذكران اسم "${studioName}" أو "${ceoName}" أو "${chosenRival}" وما حدث في الذاكرة
- badgeLabel: تصنيف الخبر (مثل "عاجل · بورصة الإنتاج" أو "تقرير صحفي خاص" أو "كواليس الصناعة")
- category: "ai_industry_report" أو "rival_project"
- marketValueDelta: رقم التأثير على القيمة السوقية لشركة اللاعب بعملة ${profile.currencyFullName} (بين -18000000 و +26000000، أو 0 لو الخبر عن شركة منافسة فقط)
- cashDelta: رقم التأثير على خزينة السيولة لشركة اللاعب (بين -5000000 و +12000000، أو 0)
- reputationDelta: رقم بين -3 و +5
- hypeDelta: رقم بين -4 و +8
- rivalStudioName: اسم الشركة المنافسة المتأثرة (مثلاً "${chosenRival}")
- rivalNetWorthDelta: رقم التأثير على القيمة السوقية للشركة المنافسة (بين -85000000 و +95000000)`;

  const userPrompt = `اكتب خبراً صحفياً عاجلاً مبنياً على ذاكرة اللعبة الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel
  );

  if (
    groqRes &&
    typeof groqRes.data.headline === 'string' &&
    typeof groqRes.data.detail === 'string'
  ) {
    return NextResponse.json({
      headline: groqRes.data.headline,
      detail: groqRes.data.detail,
      badgeLabel:
        typeof groqRes.data.badgeLabel === 'string'
          ? groqRes.data.badgeLabel
          : 'عاجل · بورصة الإنتاج السينمائي',
      category:
        groqRes.data.category === 'rival_project'
          ? 'rival_project'
          : 'ai_industry_report',
      marketValueDelta: Math.min(
        35_000_000,
        Math.max(-22_000_000, Number(groqRes.data.marketValueDelta || 0))
      ),
      cashDelta: Math.min(
        15_000_000,
        Math.max(-6_000_000, Number(groqRes.data.cashDelta || 0))
      ),
      reputationDelta: Math.min(
        6,
        Math.max(-4, Number(groqRes.data.reputationDelta || 2))
      ),
      hypeDelta: Math.min(
        10,
        Math.max(-5, Number(groqRes.data.hypeDelta || 4))
      ),
      rivalStudioName:
        typeof groqRes.data.rivalStudioName === 'string'
          ? groqRes.data.rivalStudioName
          : chosenRival,
      rivalNetWorthDelta: Math.min(
        110_000_000,
        Math.max(-90_000_000, Number(groqRes.data.rivalNetWorthDelta || 0))
      ),
    });
  }

  // Grounded contextual fallback using the player's actual memory log
  const latestMemory = memoryArr[0] || `تحركات إنتاجية جديدة داخل «${studioName}» بقيادة ${ceoName}`;
  const isRivalDrop = gameDay % 2 === 0;

  if (isRivalDrop) {
    return NextResponse.json({
      headline: `تقرير اقتصادي: صعود أسهم «${studioName}» بقيادة ${ceoName} مقابل تعثر مشروع ضخم لـ «${chosenRival}»!`,
      detail: `أشارت تقارير سوق الإنتاج بعد (${latestMemory}) إلى ارتفاع ثقة المستثمرين والمنصات في خطة «${studioName}»، بالتزامن مع خسائر إنتاجية مفاجئة تعرضت لها «${chosenRival}» هذا الشهر.`,
      badgeLabel: 'عاجل · بورصة الإنتاج',
      category: 'ai_industry_report',
      marketValueDelta: 18_000_000,
      cashDelta: 4_500_000,
      reputationDelta: 2,
      hypeDelta: 5,
      rivalStudioName: chosenRival,
      rivalNetWorthDelta: -68_000_000,
    });
  }

  return NextResponse.json({
    headline: `صفقة بث إقليمية تعزز القيمة السوقية لـ «${studioName}» ومنافسة محتدمة مع «${chosenRival}»`,
    detail: `في أعقاب (${latestMemory})، نجح المنتج التنفيذي ${ceoName} في جذب اهتمام شبكات التوزيع العربية لترتفع القيمة السوقية للاستوديو وسط سباق محتدم على قمة الترتيب.`,
    badgeLabel: 'تقرير صحفي خاص',
    category: 'ai_industry_report',
    marketValueDelta: 15_000_000,
    cashDelta: 3_500_000,
    reputationDelta: 2,
    hypeDelta: 4,
    rivalStudioName: chosenRival,
    rivalNetWorthDelta: 52_000_000,
  });
}

function normalizeNameList(rawList: unknown, fallback: string[]): string[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return fallback;
  const extracted = rawList
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name?: unknown }).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
  return extracted.length > 0 ? extracted : fallback;
}

/**
 * World Simulation Mode: AI generates fierce competitor films & series + rival studio surges
 */
async function handleGenerateAiRivalReleases(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const studioName = String(payload?.studioName || 'استوديو اللاعب');
  const ceoName = String(payload?.ceoName || 'المنتج التنفيذي');
  const currentYear = Number(payload?.currentYear || 2026);
  const gameDay = Number(payload?.gameDay || 15);
  const format = String(payload?.format || (gameDay % 2 === 0 ? 'series' : 'film'));
  const isSeries = format === 'series';

  const studios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios
  );
  const stars = normalizeNameList(payload?.availableStars, ctx.fallbackStars);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 6)
    : [];

  const systemPrompt = `${directive}
أنت محرك الذكاء الاصطناعي المسؤول عن إدارة الشركات المنافسة وإنتاجاتها الضخمة في عالم ${ctx.industryLabel}.
سياق العالم الحالي: اليوم #${gameDay} من عام ${currentYear}. شركة اللاعب هي "${studioName}" بقيادة "${ceoName}".
الشركات المنافسة النشطة في السوق: (${studios.slice(0, 8).join('، ')}).
نجوم الصف الأول المتاحون للشركات المنافسة: (${stars.slice(0, 12).join('، ')}).
ذاكرة الأحداث الأخيرة: ${memoryArr.join(' | ') || 'منافسة محتدمة على صدارة السوق'}.

المطلوب منك ابتكار عملين منافسين قويين جداً وعاليي الميزانية (${isSeries ? 'مسلسلات درامية ضخمة' : 'أفلام سينمائية ضخمة'}) تطرحها الشركات المنافسة الآن لتشعل المنافسة ضد "${studioName}" في شباك التذاكر والترتيب العام وموسم الجوائز السنوي.
اجعل المنافسة شرسة وعالية جداً:
- عناوين مبتكرة وجذابة جداً تعكس روح ${ctx.industryLabel} وغير مكررة
- إيرادات متوقعة ضخمة وواقعية (boxOfficeRevenue بين 95000000 و 245000000 ${ctx.currencyLabel})
- تقييمات نقدية قوية (criticScore بين 7.5 و 9.2)

أرجع كائن JSON فقط يحتوي على:
- headline: عنوان خبر عاجل عن إطلاق الشركات المنافسة لهذه الأعمال الضخمة واشتعال المنافسة ضد "${studioName}"
- detail: جملتان تصفان تفاصيل هذه الأعمال المنافسة وأبطالها وحجم ميزانياتها الضخمة
- rivals: مصفوفة من عملين منافسين، كل عنصر يحتوي على:
  - studioName: اسم الشركة المنافسة المنتجة من القائمة أعلاه
  - title: عنوان الفيلم أو المسلسل المبتكر
  - genre: التصنيف الدرامي (مثلاً "أكشن وإثارة" أو "دراما تشويقية" أو "جريمة وغموض")
  - leadStarName: اسم البطل من قائمة النجوم المتاحين
  - boxOfficeRevenue: رقم بين 95000000 و 245000000
  - criticScore: رقم بين 7.5 و 9.2`;

  const userPrompt = `ولّد إنتاجات الشركات المنافسة الضخمة الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel
  );

  const fallbackList = buildGroundedRivalReleases({
    ...payload,
    format,
    title: `season_${gameDay}_${currentYear}`,
  });

  if (groqRes && Array.isArray(groqRes.data.rivals) && groqRes.data.rivals.length >= 1) {
    const rivals = (groqRes.data.rivals as Record<string, unknown>[])
      .slice(0, 3)
      .map((r, idx) => {
        const fb = fallbackList[idx % fallbackList.length];
        const rawRev = Number(r.boxOfficeRevenue || 0);
        return {
          id: `ai_yr_riv_${Date.now()}_${gameDay}_${idx}`,
          studioName:
            typeof r.studioName === 'string' && r.studioName.trim()
              ? r.studioName.trim()
              : fb.studioName,
          title:
            typeof r.title === 'string' && r.title.trim()
              ? r.title.trim()
              : fb.title,
          genre:
            typeof r.genre === 'string' && r.genre.trim()
              ? r.genre.trim()
              : fb.genre,
          leadStarName:
            typeof r.leadStarName === 'string' && r.leadStarName.trim()
              ? r.leadStarName.trim()
              : fb.leadStarName,
          boxOfficeRevenue:
            rawRev >= 75_000_000
              ? Math.min(265_000_000, rawRev)
              : fb.boxOfficeRevenue,
          criticScore: Number(
            Math.min(9.4, Math.max(7.3, Number(r.criticScore || fb.criticScore))).toFixed(1)
          ),
          status: 'released' as const,
          year: currentYear,
        };
      });

    return NextResponse.json({
      rivals,
      headline:
        typeof groqRes.data.headline === 'string'
          ? groqRes.data.headline
          : `اشتعال المنافسة: «${rivals[0].studioName}» تطرح «${rivals[0].title}» ببطولة ${rivals[0].leadStarName}!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : `دفعت الشركات المنافسة بأعمال ضخمة الميزانية في مقدمتها «${rivals[0].title}» بتقييم نقدي (${rivals[0].criticScore}/10) لمزاحمة «${studioName}» على قمة الموسم وجوائز نهاية العام.`,
    });
  }

  const enrichedFallback = fallbackList.slice(0, 2).map((fb, idx) => ({
    ...fb,
    id: `ai_yr_riv_${Date.now()}_${gameDay}_${idx}`,
    status: 'released' as const,
    year: currentYear,
  }));

  return NextResponse.json({
    rivals: enrichedFallback,
    headline: `منافسة شرسة في السوق: «${enrichedFallback[0].studioName}» تطلق «${enrichedFallback[0].title}» ببطولة ${enrichedFallback[0].leadStarName}!`,
    detail: `أعلنت «${enrichedFallback[0].studioName}» طرح عملها الضخم «${enrichedFallback[0].title}» وسط إشادات نقدية واسعة (${enrichedFallback[0].criticScore}/10)، مما يرفع سقف التحدي أمام «${studioName}».`,
  });
}

function buildGroundedRivalReleases(payload: Record<string, unknown>) {
  const { profile, ctx } = resolveMarketContext(payload);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const studios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios
  );
  const stars = normalizeNameList(payload?.availableStars, ctx.fallbackStars);

  const sampleTitles = isSeries
    ? profile.rivalSeriesTitles.length > 0
      ? profile.rivalSeriesTitles
      : ['العهد السري', 'الوريث الأخير', 'دائرة الشك', 'متاهة القصر']
    : profile.rivalFilmTitles.length > 0
    ? profile.rivalFilmTitles
    : ['الرصاصة الذهبية', 'خط النار', 'طريق الهروب', 'الصفقة الكبرى'];

  const seed = hashSeed(`${payload?.title || 'film'}_${studios[0] || ''}_${Date.now()}`);
  const count = 4;

  // Fair, varied seasonal rivals across 4 realistic cinema archetypes:
  // 0: Commercial popcorn crowd-pleaser (lower critics, big opening, front-loaded)
  // 1: Prestige sleeper gem (high critics, slower opening, builds strong word-of-mouth)
  // 2: Balanced mid-high contender
  // 3: Underperforming / mixed release (low critics & modest box office)
  const archetypes = [
    {
      revRange: isSeries ? [95_000_000, 148_000_000] : [88_000_000, 145_000_000],
      criticRange: [5.5, 6.9],
      audienceRange: [7.6, 8.8],
      genre: 'أكشن كوميدي تجاري',
      trajectory: 'front_loaded' as const,
    },
    {
      revRange: isSeries ? [65_000_000, 112_000_000] : [58_000_000, 108_000_000],
      criticRange: [8.4, 9.3],
      audienceRange: [8.1, 9.2],
      genre: 'دراما نفسية وتشويق',
      trajectory: 'sleeper' as const,
    },
    {
      revRange: isSeries ? [78_000_000, 128_000_000] : [70_000_000, 124_000_000],
      criticRange: [7.2, 8.3],
      audienceRange: [7.4, 8.5],
      genre: 'جريمة وإثارة',
      trajectory: 'steady' as const,
    },
    {
      revRange: isSeries ? [34_000_000, 66_000_000] : [28_000_000, 58_000_000],
      criticRange: [4.5, 6.3],
      audienceRange: [4.9, 6.6],
      genre: 'دراما اجتماعية',
      trajectory: 'front_loaded' as const,
    },
  ];

  return studios.slice(0, count).map((studioName, idx) => {
    const arch = archetypes[(seed + idx) % archetypes.length];
    const title = sampleTitles[(seed + idx * 2) % sampleTitles.length];
    const leadStarName = stars[(seed + idx * 3) % Math.max(1, stars.length)] || 'نجم شباك';
    const frac = ((seed * (idx + 3) * 29) % 100) / 100;
    const baseRev = Math.round(
      arch.revRange[0] + (arch.revRange[1] - arch.revRange[0]) * frac
    );
    const criticScore = Number(
      (arch.criticRange[0] + (arch.criticRange[1] - arch.criticRange[0]) * frac).toFixed(1)
    );
    const audienceScore = Number(
      (arch.audienceRange[0] + (arch.audienceRange[1] - arch.audienceRange[0]) * frac).toFixed(1)
    );

    return {
      studioName,
      title,
      genre: arch.genre,
      leadStarName,
      boxOfficeRevenue: baseRev,
      criticScore,
      audienceScore,
      trajectory: arch.trajectory,
      status: 'released',
    };
  });
}

function evaluateSilentScriptQuality(synopsis: string, title: string): number {
  const clean = synopsis.trim();
  if (!clean) return 32;
  const words = clean.split(/\s+/).filter(Boolean).length;
  const sentences = clean.split(/[،.,!؟\n]+/).filter((s) => s.trim().length > 6).length;
  const uniqueWords = new Set(clean.split(/\s+/).map((w) => w.replace(/[^\u0600-\u06FF]/g, ''))).size;
  const titleRelevance = title.trim().length >= 3 ? 6 : 0;

  const lengthScore = words >= 32 ? 38 : words >= 20 ? 32 : words >= 12 ? 24 : words >= 7 ? 15 : 7;
  const structureScore = Math.min(28, sentences * 7);
  const richnessScore = Math.min(26, uniqueWords * 1.05);
  return Math.min(96, Math.max(26, Math.round(lengthScore + structureScore + richnessScore + titleRelevance)));
}

function buildGroundedReleaseEvaluation(payload: Record<string, unknown>) {
  const { ctx } = resolveMarketContext(payload);
  const title = String(payload?.title || 'العمل الفني الجديد');
  const synopsis = String(payload?.synopsis || '');
  const directorName = String(payload?.directorName || 'المخرج');
  const leadName = String(payload?.leadName || 'بطل العمل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const primaryGenre = String(payload?.primaryGenre || payload?.genre || 'دراما');
  const technicalQuality = Number(payload?.technicalQuality || 72);
  const commercialAppeal = Number(payload?.commercialAppeal || 72);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';

  const { openingClause, conflictClause, endingClause } =
    extractSynopsisHighlights(synopsis, title);

  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  // Honest, un-nerfed quality blend: great works score 8.4–9.6, weak works score 2.8–5.3
  const blendedQuality = technicalQuality * 0.68 + silentScriptScore * 0.32;
  const criticScore = Number(Math.min(9.6, Math.max(2.6, blendedQuality / 10)).toFixed(1));

  // Audience score blends entertainment/commercial appeal with quality — can differ noticeably from critics!
  const rawAudience =
    (commercialAppeal * 0.44 + technicalQuality * 0.36 + silentScriptScore * 0.2) / 10;
  const audienceScore = Number(Math.min(9.7, Math.max(2.9, rawAudience)).toFixed(1));

  // Box office multiplier depends more on commercial momentum + audience buzz than pure critic prestige
  const commercialComposite = audienceScore * 0.65 + (commercialAppeal / 10) * 0.35;
  const box_office_multiplier = Number(
    Math.min(
      1.34,
      Math.max(0.52, 0.48 + ((commercialComposite - 3.0) / 6.5) * 0.84)
    ).toFixed(2)
  );

  const posScore = Number(Math.min(9.7, criticScore + 0.6).toFixed(1));
  const mixedScore = criticScore;
  const negScore = Number(Math.max(2.5, criticScore - 1.2).toFixed(1));

  const seed = hashSeed(`${title}_${leadName}_${directorName}`);
  const criticA = ctx.fallbackCritics[0] || { name: 'ناقد أول', publication: 'الشاشة الذهبية' };
  const criticB = ctx.fallbackCritics[1] || { name: 'ناقد ثانٍ', publication: 'سينما إنسايدر' };
  const criticC = {
    name: ctx.fallbackCritics[0]?.name ? `أ. ${ctx.fallbackCritics[0].name}` : 'ماجد الشريف',
    publication: 'بوابة الفن السابع',
  };

  const masterpieceQuotes = [
    `تحفة سينمائية متكاملة! معالجة «${title}» بداية من "${openingClause}" وحتى ذروة "${conflictClause}" تثبت نضج رؤية المخرج ${directorName}، وقدم ${leadName} واحداً من أعظم أدواره.`,
    `عمل استثنائي يرفع سقف الصناعة؛ التناغم بين السيناريو المحكم وإخراج ${directorName} وحضور ${leadName} يجعل «${title}» مرشحاً بقوة لاكتساح جوائز العام.`,
  ];

  const positiveQuotes = [
    `معالجة فكرة "${openingClause}" في «${title}» منحت المخرج ${directorName} أرضية صلبة للبناء عليها، ونجح ${leadName} في تقديم أداء متماسك ومقنع طوال مشاهد المواجهة.`,
    `يحسب لصناع «${title}» تقديم خط "${openingClause}" بإيقاع مشدود وصورة بصرية متميزة، مع حضور لافت لـ ${leadName} جعل العمل يفرض نفسه بقوة هذا الموسم.`,
  ];

  const negativeQuotes = [
    `رغم جاذبية الفكرة في بداية "${openingClause}"، إلا أن تطور الصراع عند "${conflictClause}" عانى من ضعف البناء الدرامي، وكان يمكن رسم دوافع شخصية ${antagonistName} بعمق أكبر.`,
    `اعتمد «${title}» بشكل زائد على اسم ${leadName} لتغطية ثغرات واضحة في السيناريو والإخراج، خاصة في النصف الثاني عند "${conflictClause}".`,
  ];

  const mixedQuotes = [
    `«${title}» عمل يوازن بين الجاذبية الجماهيرية والصنعة الفنية في إطار (${primaryGenre})؛ البداية عند "${openingClause}" متقنة، وإن كانت النهاية عند "${endingClause}" ستقسم آراء المشاهدين.`,
    `قدم ${directorName} صورة بصرية جيدة وأداءً مقنعاً من ${leadName}، لكن بعض التحولات في "${conflictClause}" مرت بشكل أسرع مما ينبغي.`,
  ];

  const isMasterpiece = criticScore >= 8.3;
  const isWeak = criticScore < 5.8;

  return {
    critic_score: criticScore,
    audience_score: audienceScore,
    box_office_multiplier,
    viral_trend_label:
      isMasterpiece
        ? `#${title.replace(/\s+/g, '_')} إشادة نقدية وجماهيرية كاسحة في ${ctx.trendHashtagLabel}`
        : audienceScore >= 7.8 && criticScore < 7.0
        ? `#${title.replace(/\s+/g, '_')} يكتسح شباك التذاكر رغم انقسام النقاد!`
        : criticScore >= 6.8
        ? `#${title.replace(/\s+/g, '_')} يتصدر ${ctx.trendHashtagLabel} بإقبال قوي`
        : `انتقادات حادة لحبكة «${title}» ومطالبات بمراجعة الاختيارات القادمة`,
    rival_releases: buildGroundedRivalReleases(payload),
    reviews: isMasterpiece
      ? [
          {
            criticName: criticA.name,
            publication: criticA.publication,
            sentiment: 'positive',
            quote: masterpieceQuotes[seed % masterpieceQuotes.length],
            score: Number(Math.min(9.8, criticScore + 0.4).toFixed(1)),
          },
          {
            criticName: criticB.name,
            publication: criticB.publication,
            sentiment: 'positive',
            quote: positiveQuotes[seed % positiveQuotes.length],
            score: criticScore,
          },
          {
            criticName: criticC.name,
            publication: criticC.publication,
            sentiment: 'positive',
            quote: `رغم تحفظي البسيط على إيقاع بعض مشاهد المنتصف، إلا أن «${title}» يظل علامة فنية فارقة هذا العام.`,
            score: Number(Math.max(7.8, criticScore - 0.5).toFixed(1)),
          },
        ]
      : isWeak
      ? [
          {
            criticName: criticC.name,
            publication: criticC.publication,
            sentiment: 'negative',
            quote: negativeQuotes[seed % negativeQuotes.length],
            score: negScore,
          },
          {
            criticName: criticB.name,
            publication: criticB.publication,
            sentiment: 'negative',
            quote: negativeQuotes[(seed + 1) % negativeQuotes.length],
            score: criticScore,
          },
          {
            criticName: criticA.name,
            publication: criticA.publication,
            sentiment: 'mixed',
            quote: mixedQuotes[seed % mixedQuotes.length],
            score: Number(Math.min(6.5, criticScore + 0.7).toFixed(1)),
          },
        ]
      : [
          {
            criticName: criticA.name,
            publication: criticA.publication,
            sentiment: posScore >= 7.0 ? 'positive' : 'mixed',
            quote: positiveQuotes[seed % positiveQuotes.length],
            score: posScore,
          },
          {
            criticName: criticC.name,
            publication: criticC.publication,
            sentiment: 'negative',
            quote: negativeQuotes[(seed + 1) % negativeQuotes.length],
            score: negScore,
          },
          {
            criticName: criticB.name,
            publication: criticB.publication,
            sentiment: 'mixed',
            quote: mixedQuotes[(seed + 2) % mixedQuotes.length],
            score: mixedScore,
          },
        ],
    social_posts: [
      {
        handle: ctx.socialHandles[0],
        platform: 'X',
        content:
          audienceScore >= 8.0
            ? isSeries
              ? `مسلسل «${title}» حديث الجمهور الليلة.. مشهد "${openingClause}" وأداء ${leadName} خطفوا الموسم كله 🎬🔥`
              : `للتو خارج من عرض «${title}» في السينما.. القاعة كلها صفقت في النهاية، ${leadName} قدّم أداءً مذهلاً! 🎬🔥`
            : audienceScore >= 6.4
            ? `«${title}» تجربة ممتعة ومسلية في المجمل، خصوصاً حضور ${leadName} رغم بعض الإطالة في المنتصف 🍿`
            : `بصراحة «${title}» كان أقل من التوقعات.. الفكرة كانت واعدة لكن التنفيذ لم يرتقِ للمستوى للأسف 😕`,
        likes: audienceScore >= 8.0 ? '54.2K' : audienceScore >= 6.5 ? '18.4K' : '6.1K',
      },
      {
        handle: ctx.socialHandles[1],
        platform: 'X',
        content: `المواجهة بين ${leadName} و${antagonistName} في خط "${conflictClause}" هي النقطة الأبرز في «${title}».. تقييمي الواقعي ${criticScore}/10.`,
        likes: '12.8K',
      },
      {
        handle: ctx.socialHandles[2],
        platform: 'TikTok',
        content:
          audienceScore >= 7.5
            ? `نقاشات الجمهور مشتعلة حول نهاية «${title}» ولحظة "${endingClause}".. العمل مسيطر على ${ctx.trendHashtagLabel} 🍿✨`
            : `آراء الجمهور متباينة جداً حول «${title}» بعد أول يوم عرض.. هل يستحق التذكرة أم لا؟ 👀`,
        likes: audienceScore >= 7.5 ? '168K' : '44K',
      },
    ],
  };
}

async function handleEvaluateRelease(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { ctx, directive } = resolveMarketContext(payload);
  const title = String(payload?.title || 'العمل الفني الجديد');
  const synopsis = String(payload?.synopsis || '');
  const directorName = String(payload?.directorName || 'المخرج');
  const leadName = String(payload?.leadName || 'البطل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const technicalQuality = Number(payload?.technicalQuality || 72);
  const commercialAppeal = Number(payload?.commercialAppeal || 72);
  const expectedCriticScore = Number(
    payload?.expectedCriticScore || (technicalQuality / 10).toFixed(1)
  );
  const expectedAudienceScore = Number(
    payload?.expectedAudienceScore ||
      ((technicalQuality * 0.5 + commercialAppeal * 0.5) / 10).toFixed(1)
  );
  const genre = String(payload?.genre || 'دراما');
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  const competitorStudios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios
  ).join('، ');
  const availableStars = normalizeNameList(
    payload?.availableStars,
    ctx.fallbackStars
  ).join('، ');

  const systemPrompt = `${directive}
أنت لجنة نقاد سينمائيين ودراميين ومحللي ${isSeries ? 'نسب مشاهدات المسلسلات والمنصات' : 'إيرادات شباك التذاكر السينمائي'} في ${ctx.industryLabel}.
المطلوب منك تقييم العمل بعدالة وواقعية تامة (لا تقسُ على الأعمال الرائعة ولا تجامل الأعمال الضعيفة):
- عنوان العمل: "${title}" (${isSeries ? 'مسلسل' : 'فيلم'} — تصنيف: ${genre})
- نص السيناريو: "${synopsis}"
- المخرج: ${directorName}، البطل: ${leadName}، الخصم: ${antagonistName}
- الجودة الإنتاجية والفنية الفعلية في البلاتوه: ${technicalQuality}/100 (المتوقع نقدياً حوالي ${expectedCriticScore}/10)
- القوة التجارية والنجومية والتسويق: ${commercialAppeal}/100 (المتوقع جماهيرياً حوالي ${expectedAudienceScore}/10)
- عمق الورق المكتوب: ${silentScriptScore}/100

الشركات المنافسة في السوق هذا الموسم: (${competitorStudios}).
النجوم المتاحون للشركات المنافسة: (${availableStars}).

قواعد الواقعية والعدالة الصارمة:
1. التقييم النقدي الحقيقي (critic_score على مقياس من 2.5 إلى 9.6):
   - إذا كان العمل قوياً جداً (جودة فنية 82+ وسيناريو متماسك)، امنحه تقييماً ممتازاً حقيقياً (8.3 إلى 9.5) ومراجعات تحتفي بقوته!
   - إذا كان متوسطاً، امنحه (6.2 إلى 7.6).
   - إذا كان ضعيفاً فعلاً (جودة أقل من 58 أو سيناريو سطحي قصير جداً)، امنحه تقييماً منخفضاً واقعياً (2.8 إلى 5.4).
2. فصل التقييم عن الإيرادات (قاعدة السوق الحقيقي):
   - ليس بالضرورة أن يكون الأعلى تقييماً نقدياً هو الأعلى إيرادات! قد يحقق عمل تجاري جماهيري (أكشن/كوميديا بنجوم كبار) إيرادات ضخمة وتقييم جمهور عالٍ (8.2+) رغم تقييم نقاد متوسط (5.8–6.9)، بينما قد يحقق عمل فني عميق تقييم نقاد 9.1 وإيرادات متوسطة تنمو بالتدريج.
3. ولّد 4 أعمال منافسة متنوعة وعادلة في rival_releases تمثل السوق الحقيقي:
   - عمل تجاري ضخم (تقييم نقاد متوسط 5.6–6.9 لكن إيراداته قوية 85M–145M، trajectory: "front_loaded")
   - عمل فني/نقدي رائع (تقييم نقاد عالٍ 8.4–9.3 وإيرادات متوسطة تنمو بالتدريج 60M–110M، trajectory: "sleeper")
   - عمل متوازن قوي (تقييم 7.3–8.3، إيرادات 70M–125M، trajectory: "steady")
   - عمل متعثر أو متوسط (تقييم 4.6–6.3، إيرادات 28M–60M، trajectory: "front_loaded")

أرجع JSON فقط يحتوي على:
- critic_score (رقم من 2.5 إلى 9.6 — مقياس من 10)
- audience_score (رقم من 2.8 إلى 9.7 — مقياس من 10)
- box_office_multiplier (رقم واقعي بين 0.52 و 1.34 يعكس قوة الإقبال التجاري للعمل)
- viral_trend_label (عنوان الصدى الجماهيري)
- reviews: مصفوفة من 3 نقاد (criticName, publication, sentiment: "positive"|"mixed"|"negative", quote يذكر تفاصيل القصة بصدق، score من 10)
- social_posts: مصفوفة من 3 منشورات سوشيال ميديا (handle, platform, content, likes)
- rival_releases: مصفوفة من 4 عناصر، كل عنصر يحتوي على (studioName, title, genre, leadStarName, boxOfficeRevenue: رقم بين 28000000 و 155000000, criticScore من 4.5 إلى 9.3, audienceScore من 4.8 إلى 9.4, trajectory: "front_loaded"|"steady"|"sleeper", status: "released")`;

  const userPrompt = `قيّم ${isSeries ? 'مسلسل' : 'فيلم'} «${title}» بموضوعية وعدالة تامة وولّد 4 منافسين متنوعين بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.critic_score === 'number' &&
    Array.isArray(groqRes.data.reviews) &&
    groqRes.data.reviews.length >= 2
  ) {
    const rawCriticNum = Number(groqRes.data.critic_score);
    const normalizedCritic = rawCriticNum > 10 ? rawCriticNum / 10 : rawCriticNum;
    const clampedCritic = Number(
      Math.min(9.6, Math.max(2.5, normalizedCritic)).toFixed(1)
    );

    const rawAudienceNum = Number(groqRes.data.audience_score ?? expectedAudienceScore);
    const normalizedAudience = rawAudienceNum > 10 ? rawAudienceNum / 10 : rawAudienceNum;
    const clampedAudience = Number(
      Math.min(9.7, Math.max(2.8, normalizedAudience)).toFixed(1)
    );

    const rawAiMult = Number(groqRes.data.box_office_multiplier || 1.0);
    const clampedMult = Number(
      Math.min(1.34, Math.max(0.52, rawAiMult)).toFixed(2)
    );

    const fallbackRivals = buildGroundedRivalReleases(payload);
    const rivalReleases =
      Array.isArray(groqRes.data.rival_releases) &&
      groqRes.data.rival_releases.length >= 2
        ? (groqRes.data.rival_releases as Record<string, unknown>[])
            .slice(0, 4)
            .map((r, i) => {
              const fb = fallbackRivals[i % fallbackRivals.length];
              const rawRev = Number(r.boxOfficeRevenue || 0);
              const realisticRev =
                rawRev >= 22_000_000
                  ? Math.min(170_000_000, Math.round(rawRev))
                  : fb?.boxOfficeRevenue || 78_000_000;
              const rawRivalCrit = Number(r.criticScore || fb.criticScore || 7.2);
              const normRivalCrit = rawRivalCrit > 10 ? rawRivalCrit / 10 : rawRivalCrit;
              const rawRivalAud = Number(r.audienceScore || fb.audienceScore || normRivalCrit + 0.3);
              const normRivalAud = rawRivalAud > 10 ? rawRivalAud / 10 : rawRivalAud;
              const traj =
                r.trajectory === 'front_loaded' ||
                r.trajectory === 'sleeper' ||
                r.trajectory === 'steady'
                  ? r.trajectory
                  : fb.trajectory;
              return {
                studioName:
                  typeof r.studioName === 'string' && r.studioName.trim()
                    ? r.studioName.trim()
                    : fb.studioName,
                title:
                  typeof r.title === 'string' && r.title.trim()
                    ? r.title.trim()
                    : fb.title,
                genre:
                  typeof r.genre === 'string' && r.genre.trim()
                    ? r.genre.trim()
                    : fb.genre,
                leadStarName:
                  typeof r.leadStarName === 'string' && r.leadStarName.trim()
                    ? r.leadStarName.trim()
                    : fb.leadStarName,
                boxOfficeRevenue: realisticRev,
                criticScore: Number(Math.min(9.4, Math.max(4.4, normRivalCrit)).toFixed(1)),
                audienceScore: Number(Math.min(9.5, Math.max(4.5, normRivalAud)).toFixed(1)),
                trajectory: traj,
                status: 'released',
              };
            })
        : fallbackRivals;

    return NextResponse.json({
      source: 'لجنة النقاد',
      ...groqRes.data,
      critic_score: clampedCritic,
      audience_score: clampedAudience,
      box_office_multiplier: clampedMult,
      rival_releases: rivalReleases,
    });
  }

  return NextResponse.json({
    source: 'لجنة النقاد',
    ...buildGroundedReleaseEvaluation(payload),
  });
}

/**
 * AI-Powered Contextual PR & Media Response Handler (via Groq openai/gpt-oss-20b / openai/gpt-oss-120b)
 */
async function handleGeneratePrMediaResponse(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { profile, ctx, directive } = resolveMarketContext(payload);
  const studioName = String(payload?.studioName || profile.defaultStudioName);
  const ceoName = String(payload?.ceoName || 'المنتج');
  const activeProjectTitle = String(payload?.activeProjectTitle || 'العمل الجديد');
  const rivalStudioName = String(
    payload?.rivalStudioName || ctx.fallbackRivalStudios[0]
  );
  const rivalFilmTitle = String(payload?.rivalFilmTitle || 'العمل المنافس');
  const campaignId = String(payload?.campaignId || 'support_film_trolls');
  const situationHeadline = String(payload?.situationHeadline || '');
  const situationDetail = String(payload?.situationDetail || '');
  const customPlayerAngle = String(payload?.customPlayerAngle || '');
  const isAttack =
    campaignId === 'rival_rumor_trolls' || campaignId === 'rival_smear_campaign';

  const systemPrompt = `${directive}
أنت محرك السوشيال ميديا والردود الإعلامية واللجان الإلكترونية في عالم ${ctx.industryLabel}.
شركة اللاعب: "${studioName}" بقيادة "${ceoName}".
عمل اللاعب الحالي: "${activeProjectTitle}".
الشركة المنافسة المستهدفة: "${rivalStudioName}" وعملها "${rivalFilmTitle}".
نوع التحرك الإعلامي: "${campaignId}" (${isAttack ? 'هجوم إعلامي وإشاعات مضادة لضرب المنافس' : 'رد إعلامي رسمي وتوجيه اللجان لدعم عمل الاستوديو وتصدير التريند'}).
${situationHeadline ? `الموقف أو الخبر الذي نرد عليه الآن: "${situationHeadline} — ${situationDetail}"` : ''}
${customPlayerAngle ? `توجيه خاص من المنتج للرد الإعلامي: "${customPlayerAngle}"` : ''}

المطلوب:
1. صياغة بيان أو عنوان رد إعلامي ناري وذكي جداً يناسب هذا الموقف تحديداً (officialStatement).
2. توليد 3 منشورات تفاعلية حية على منصتي X و TikTok بـ ${ctx.dialectStyle} تتفاعل مع هذا الرد أو الإشاعة وتذكر أسماء الأعمال والشركات.
3. تحديد التأثير الرقمي المنطقي على ضجة الفيلم (hypeDelta بين 8 و 22) والسمعة (reputationDelta بين -2 و 6).

أرجع JSON فقط بهذا الشكل:
{
  "officialStatement": "نص الرد الإعلامي أو التكتيك الذي انتشر في الصحافة والسوشيال ميديا",
  "impactHeadline": "ملخص النتيجة الفورية للرد الإعلامي",
  "hypeDelta": 14,
  "reputationDelta": 3,
  "posts": [
    {
      "platform": "X",
      "authorName": "اسم الحساب",
      "handle": "${ctx.socialHandles[0]}",
      "content": "نص التغريدة أو التعليق",
      "hashtag": "#هاشتاج_مناسب",
      "likes": "64.2K",
      "shares": "19.1K"
    },
    {
      "platform": "TikTok",
      "authorName": "اسم صانع المحتوى",
      "handle": "${ctx.socialHandles[2]}",
      "content": "نص الفيديو أو التعليق الرائج",
      "hashtag": "#هاشتاج_تيك_توك",
      "likes": "182K",
      "shares": "41.5K"
    }
  ]
}`;

  const userPrompt = `ولّد الرد الإعلامي التفاعلي ومنشورات X و TikTok الآن بصيغة JSON.`;
  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel || 'generate_pr_media_response'
  );

  if (groqRes && Array.isArray(groqRes.data.posts) && groqRes.data.posts.length > 0) {
    const cleanPosts = (groqRes.data.posts as Record<string, unknown>[])
      .slice(0, 3)
      .map((p, idx) => ({
        id: `groq_pr_${Date.now()}_${idx}`,
        platform: p.platform === 'TikTok' ? ('TikTok' as const) : ('X' as const),
        authorName: String(p.authorName || 'ناقد سينمائي'),
        handle: String(p.handle || ctx.socialHandles[idx % ctx.socialHandles.length]),
        content: String(p.content || ''),
        hashtag: String(p.hashtag || `#${activeProjectTitle.replace(/\s+/g, '_')}`),
        likes: String(p.likes || '52.4K'),
        shares: String(p.shares || '14.8K'),
        sentiment: isAttack ? ('rival_attack' as const) : ('viral_boost' as const),
        timestampLabel: 'الآن · رد إعلامي مباشر',
      }));

    return NextResponse.json({
      ok: true,
      modelUsed: groqRes.modelUsed,
      officialStatement: String(
        groqRes.data.officialStatement ||
          `بيان عاجل من «${studioName}» يقلب موازين التريند لصالح «${activeProjectTitle}»!`
      ),
      impactHeadline: String(
        groqRes.data.impactHeadline || 'تفاعل جماهيري واسع على منصتي X وTikTok'
      ),
      hypeDelta: Math.min(24, Math.max(6, Number(groqRes.data.hypeDelta || 14))),
      reputationDelta: Math.min(8, Math.max(-3, Number(groqRes.data.reputationDelta || 3))),
      posts: cleanPosts,
    });
  }

  return NextResponse.json({
    ok: false,
    officialStatement: isAttack
      ? `تسريبات حصرية تكشف ارتباكاً داخل «${rivalStudioName}» وتراجع الحجوزات لـ «${rivalFilmTitle}» أمام زخم «${activeProjectTitle}»!`
      : `المكتب الإعلامي لـ «${studioName}» يطلق حملة تفاعلية موسعة لـ «${activeProjectTitle}» تتصدر ${ctx.trendHashtagLabel}!`,
    hypeDelta: 12,
    reputationDelta: 2,
    posts: [],
  });
}

