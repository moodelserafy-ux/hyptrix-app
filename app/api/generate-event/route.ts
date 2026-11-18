import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  evaluateTalentOfferDeep,
  RoleBillingSize,
  ROLE_BILLING_META,
} from '@/lib/game-engine';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_TEXT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
] as const;

const GEMINI_TEXT_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, payload, groqKeyOverride, preferredModel } = body;
    const p = (payload || body || {}) as Record<string, unknown>;

    if (mode === 'generate_script_idea') {
      return await handleGenerateScriptIdea(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'analyze_script_synopsis') {
      return await handleAnalyzeScriptSynopsis(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'generate_character_role') {
      return await handleGenerateCharacterRole(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'evaluate_talent_offer') {
      return await handleEvaluateTalentOffer(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'evaluate_series_episode') {
      return await handleEvaluateSeriesEpisode(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'generate_daily_news') {
      return await handleGenerateDailyNews(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'mid_production_crises') {
      return await handleGenerateCrises(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'evaluate_festival_ceremony') {
      return await handleEvaluateFestivalCeremony(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'discover_ai_rising_star') {
      return await handleDiscoverAiRisingStar(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'discover_ai_emerging_studio') {
      return await handleDiscoverAiEmergingStudio(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'generate_ai_rival_releases') {
      return await handleGenerateAiRivalReleases(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'generate_ai_memory_news') {
      return await handleGenerateAiMemoryNews(p, groqKeyOverride, preferredModel);
    }

    return await handleEvaluateRelease(p, groqKeyOverride, preferredModel);
  } catch (err) {
    console.error('Narrative Engine Error:', err);
    return NextResponse.json(buildGroundedEgyptianReleaseEvaluation({}), { status: 200 });
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
  _preferredModel?: string
): Promise<{ data: Record<string, unknown>; modelUsed: string } | null> {
  const strictJsonSystemPrompt = `${systemPrompt}\n\nتنبيه تقني صارم جداً: يجب أن يكون ردك عبارة عن كائن JSON صالح فقط يبدأ بـ { وينتهي بـ } بدون أي نص إضافي خارج الـ JSON، وتجنب تكرار أي جمل نمطية.`;

  // 1. Primary Server-Side Gemini Engine (@google/genai)
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    for (const modelName of GEMINI_TEXT_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `${strictJsonSystemPrompt}\n\n${userPrompt}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.85,
          },
        });
        const text = response.text || '';
        const extracted = extractJsonFromText(text);
        if (extracted) {
          return { data: extracted, modelUsed: modelName };
        }
      } catch {
        // Fallback to next Gemini model or Groq
      }
    }
  }

  // 2. Secondary Groq Engine (if configured)
  const groqKey = (
    groqKeyOverride ||
    process.env.GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    ''
  ).trim();

  if (groqKey && groqKey !== 'MY_GROQ_API_KEY') {
    const orderedModels = [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
    ] as const;

    for (const model of orderedModels) {
      try {
        const response = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.82,
            max_completion_tokens: 2048,
            messages: [
              { role: 'system', content: strictJsonSystemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = resJson.choices?.[0]?.message?.content || '';
          const extracted = extractJsonFromText(content);
          if (extracted) {
            return { data: extracted, modelUsed: model };
          }
        }
      } catch {
        // Try next model or deterministic engine
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
  const format = String(payload.format || 'film');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || 'أكشن');
  const secondaryGenre = String(payload.secondaryGenreName || payload.secondaryGenre || '');
  const ageRating = String(payload.ageRating || '+12');
  const seedTitle = String(payload.currentTitle || '').trim();

  const systemPrompt = `أنت سيناريست ومؤلف سينمائي ودرامي مصري محترف.
المطلوب منك تأليف فكرة وسيناريو جذاب جداً ومبتكر لـ ${format === 'film' ? 'فيلم سينمائي' : 'مسلسل درامي'} مصري:
- التصنيف الأساسي: ${primaryGenre} ${secondaryGenre ? `مع تصنيف فرعي: ${secondaryGenre}` : ''}
- التصنيف العمري: ${ageRating}
${seedTitle ? `- عنوان مقترح من المنتج لبناء القصة عليه: "${seedTitle}"` : ''}

اكتب بأسلوب سينمائي مصري سلس وطبيعي ومشوق (من 3 إلى 4 جمل تصف البطل، الصراع الرئيسي، والمفاجأة الدرامية في النهاية) بدون أي مبالغة أو ألفاظ سوقية.
أرجع كائن JSON فقط يحتوي على:
- title: اسم الفيلم أو المسلسل (عنوان سينمائي مصري جذاب)
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

  const ideas = [
    {
      title: seedTitle || 'شفرة باب الخلق',
      synopsis: `خبير فك شفرات يعثر على خريطة سرية داخل ساعة أثرية في خان الخليلي، فيدخل في مطاردة خطيرة عبر شوارع القاهرة مع شبكة دولية، قبل أن يكتشف في المشهد الأخير أن شريكه المقرب هو العقل المدبر للعملية.`,
    },
    {
      title: seedTitle || 'العقد الأخير في الزمالك',
      synopsis: `محامٍ شهير يتولى الدفاع في قضية ميراث غامضة داخل قصر قديم بالزمالك، ومع كل جلسة تتكشف أسرار عائلية تقلب الرأي العام، حتى يفجر مفاجأة غير متوقعة أمام المحكمة في المشهد الختامي.`,
    },
    {
      title: seedTitle || 'ليلة سقوط الكينج',
      synopsis: `ضابط عمليات خاصة متقاعد يضطر للعودة في مهمة سرية لمدة 48 ساعة لإحباط صفقة تهريب كبرى في الميناء، ليجد نفسه في مواجهة مباشرة مع خصمه القديم في معركة حاسمة تحبس الأنفاس.`,
    },
    {
      title: seedTitle || 'المسار المفقود',
      synopsis: `طبيبة نفسية تحقق في اختفاء غامض لركاب قطار ليلي متجه إلى أسوان، وتكتشف أن كل راكب يخفي سراً يربطه بحادث قديم وقع قبل عشر سنوات، وتنتهي القصة بمواجهة كاشفة فوق السد العالي.`,
    },
    {
      title: seedTitle || 'مزاد منتصف الليل',
      synopsis: `تاجر تحف شاب يدخل مزاداً سرياً لبيع لوحة نادرة، ليكتشف أن اللوحة تحتوي على ميكروفيلم يفضح شبكة فساد كبرى، فيخوض سباقاً مع الزمن للنجاة بحياته وكشف الحقيقة.`,
    },
  ];
  const chosen = ideas[Math.floor(Math.random() * ideas.length)];
  return NextResponse.json({
    source: 'ورشة تطوير السيناريو',
    ...chosen,
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
  const title = String(payload.title || 'الفرعون الأخير');
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || 'دراما');
  const format = String(payload.format || 'film');

  const { openingClause, conflictClause, wordCount } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `أنت مستشار سيناريو وناقد درامي مصري محترف.
المنتج كتب سيناريو ${format === 'film' ? 'فيلم' : 'مسلسل'} بعنوان "${title}" (النوع: ${primaryGenre}):
"${synopsis}"

قيّم السيناريو بصدق وموضوعية وبأسلوب مصري احترافي طبيعي (بدون مبالغة في العامية وبدون فصحى جامدة):
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
  const talentName = String(payload.talentName || 'النجم');
  const archetype = String(payload.archetype || '');
  const roleBillingSize = (payload.roleBillingSize as RoleBillingSize) || 'lead_star';
  const title = String(payload.projectTitle || payload.title || 'الفرعون الأخير');
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenre || 'دراما');

  const billingLabel = ROLE_BILLING_META[roleBillingSize]?.label || 'بطولة';
  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `أنت مؤلف وسيناريست مصري محترف.
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
  const title = String(payload.projectTitle || payload.title || 'الفرعون الأخير');
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
  });

  const billingArabic = isActor
    ? ROLE_BILLING_META[roleBillingSize]?.label || roleLabel
    : String(payload.roleTitle || roleLabel);

  const defaultWaitDays = starTier === 'S' || ego >= 85 ? 3 : 2;
  const memoryBlock =
    aiMemoryLog.length > 0
      ? `\nسجل ذاكرة الصناعة وتاريخ الاستوديو ("${studioName}"):\n- ${aiMemoryLog.join('\n- ')}`
      : '';

  const systemPrompt = `أنت الفنان/المخرج المصري "${talentName}" (الفئة: ${starTier}، التقييم العام: ${overall}/100، الغرور الفني: ${ego}/100).
تلقيت عرضاً رسمياً من شركة "${studioName}" للمشاركة في عمل فني عنوانه "${title}" (التصنيف: ${genreName}).
عوامل تقييم العرض بالكامل:
1. حجم الدور ومكانته مقارنة بحجم نجوميتك: ${billingArabic} — (${deepEval.roleFitVerdict} · درجة الملاءمة: ${deepEval.roleFitScore}/100)
2. وصف الشخصية والدور: "${roleLabel}"
3. ملخص السيناريو والقصة: "${synopsis}"
4. العرض المالي ونسبة الأرباح: معروض عليك ${(offeredSalary / 1_000_000).toFixed(1)} مليون ج.م (مقابل أجرك المتوقع ${(deepEval.expectedMinimumSalary / 1_000_000).toFixed(1)} مليون ج.م) + نسبة أرباح من الشباك ${backendPoints}% ${vipDinner ? '+ دعوة عشاء عمل خاص وقراءة سيناريو VIP' : ''}.
5. إتقانك للتصنيف (${genreName}): ${genreMasteryScore}/100، وسمعة الاستوديو: ${studioReputation}/100${directorName ? `، والمخرج المتعاقد: ${directorName}` : ''}.${memoryBlock}

قرار التقييم الفني والمالي النهائي: ${deepEval.willAccept ? 'الموافقة على العرض (accepted: true)' : `الاعتذار ورفض العرض (accepted: false) بسبب: ${deepEval.rejectionCategory}`}.

المطلوب:
- حدد عدد الأيام التي ستستغرقها لدراسة السيناريو والعقد مع وكيل أعمالك قبل إعلان قرارك الرسمي: waitDays (إما 2 أو 3 أيام).
- اكتب ردك الرسمي المعمق (reason) في جملتين أو ثلاث جمل طبيعية توضح بدقة لماذا قبلت أو رفضت بناءً على حجم الدور مقارنة بمكانتك، وقوة القصة ("${openingClause}" / "${conflictClause}")، والراتب ونسبة الأرباح، وتاريخ الاستوديو.

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
  const episodeNumber = Number(payload.episodeNumber || 1);
  const totalEpisodes = Number(payload.totalEpisodes || 15);
  const title = String(payload.projectTitle || payload.title || 'الفرعون الأخير');
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

  const systemPrompt = `أنت ناقد درامي ومحرر متابعة مسلسلات في لعبة Hyptrix.
تم الآن عرض الحلقة رقم ${episodeNumber} من أصل ${totalEpisodes} حلقة من مسلسل "${title}".
قصة المسلسل: "${synopsis}".
البطل: "${leadName}"، الخصم: "${antagonistName}"، المخرج: "${directorName}".
تركيز الحلقة الحالية: ${arcFocus}.
إجمالي عوائد العرض والإعلانات حتى هذه الحلقة: ${currentRevenueMillions} مليون ج.م.

اكتب تقريراً موجزاً ومميزاً وغير مكرر بلغة مصرية طبيعية واحترافية يصف ما حدث في الحلقة ${episodeNumber} وكيف تفاعل الجمهور والنقاد معها.
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
      detail: `حسمت الحلقة الأخيرة مصير الصراع عند "${endingClause}" في مواجهة تمثيلية قوية بين ${leadName} و${antagonistName}، ووصلت إجمالي عوائد المسلسل إلى ${currentRevenueMillions}M ج.م.`,
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
      detail: `تفاعل المشاهدون مع تطور خط "${openingClause}" في الحلقة ${episodeNumber}، بينما أشاد النقاد بتماسك الإيقاع الدرامي وارتفاع عوائد البث إلى ${currentRevenueMillions}M ج.م.`,
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
  const phase = String(payload.phase || 'box_office');
  const day = Number(payload.gameDay || payload.day || 1);
  const title = String(payload.projectTitle || payload.title || 'الفرعون الأخير');
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

  const systemPrompt = `أنت محرر صحافة فنية في لعبة Hyptrix.
اكتب خبراً فنياً واحداً مميزاً وغير مكرر بلغة مصرية طبيعية واحترافية (بدون مبالغة سوقية) عن اليوم رقم ${day}:
- المرحلة: ${phase === 'filming' ? 'كواليس التصوير والإنتاج' : 'منافسة شباك التذاكر السينمائي'}
- اسم العمل: "${title}"
- القصة: "${synopsis}"
- البطل: "${leadName}" والمخرج: "${directorName}"
- المنافس: "${rivalTitle}"
- الإيرادات الحالية: ${currentRevenueMillions} مليون ج.م${memoryContext}

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
      detail: `وصلت إيرادات «${title}» إلى ${currentRevenueMillions}M ج.م بدعم من الإقبال الجماهيري على مشاهدة خط "${conflictClause.slice(0, 38)}...".`,
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
      headline: `اليوم ${day}: الحفلات المسائية ترفع حصيلة «${title}» إلى ${currentRevenueMillions}M ج.م`,
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
      detail: `استمر تدفق العائلات والشباب على القاعات لترتفع الحصيلة التراكمية إلى ${currentRevenueMillions}M ج.م في سباق الموسم.`,
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
 * Stage 4: Generate 3 Mid-Production Filming Crises
 */
async function handleGenerateCrises(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const title = String(payload?.title || 'الفرعون الأخير');
  const synopsis = String(payload?.synopsis || '');
  const leadName = String(payload?.leadName || 'بطل العمل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const ageRating = String(payload?.ageRating || '+12');
  const hasEgoClash = Boolean(payload?.hasEgoClash);

  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `أنت محرك مواقف وأزمات إنتاجية في لعبة إدارة الاستوديو السينمائي Hyptrix.
ولّد 3 مواقف إنتاجية واقعية تحدث أثناء تصوير عمل "${title}" الذي تدور قصته حول: "${synopsis}".
البطل: "${leadName}"، الخصم: "${antagonistName}"، التصنيف العمري: "${ageRating}"، توتر بين النجوم: ${hasEgoClash}.
يجب أن تكون المواقف مرتبطة بأحداث سيناريو اللاعب ("${openingClause}" و "${conflictClause}") ومكتوبة بلغة مصرية طبيعية واحترافية.
أرجع JSON فقط يحتوي على مصفوفة crises من 3 عناصر، كل عنصر يحتوي على:
id, title, description, optionA (label, cost, hypeDelta, qualityDelta), optionB (label, cost, hypeDelta, qualityDelta).`;

  const userPrompt = `ولّد 3 مواقف إنتاجية أثناء تصوير «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && Array.isArray(groqRes.data.crises) && groqRes.data.crises.length >= 2) {
    return NextResponse.json({
      source: 'إدارة الإنتاج',
      crises: groqRes.data.crises,
    });
  }

  const fallbackCrises = [
    {
      id: `crisis_plot_${Date.now()}_1`,
      title: `تعديل مفاجئ في تنفيذ مشهد "${openingClause.slice(0, 38)}..."`,
      description: `أثناء تصوير المشهد المحوري في «${title}»، طلب ${leadName} ومدير التصوير إعادة بناء جزء من الديكور ليظهر المشهد بواقعية أعلى، وهو ما يتطلب ميزانية إضافية.`,
      optionA: {
        label: 'الموافقة على تطوير الديكور وتنفيذ المشهد بأعلى جودة (3.5M ج.م)',
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
        label: 'تصوير مشاهد إضافية بديلة واستثمار الحدث دعائياً (2.5M ج.م)',
        cost: 2_500_000,
        hypeDelta: 10,
        qualityDelta: 4,
      },
      optionB: {
        label: 'تشديد الحراسة على اللوكيشن واستكمال الجدول كما هو (0.5M ج.م)',
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
        label: 'إعادة صياغة وتصوير المشهد بمعالجة درامية ذكية (1.8M ج.م)',
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

  return NextResponse.json({ source: 'إدارة الإنتاج', crises: fallbackCrises });
}

/**
 * Stage 6: Generate Festival Jury Speech & Commentary
 */
async function handleEvaluateFestivalCeremony(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const festivalName = String(payload.festivalName || 'مهرجان القاهرة السينمائي');
  const title = String(payload.title || 'الفرعون الأخير');
  const synopsis = String(payload.synopsis || '');
  const directorName = String(payload.directorName || 'المخرج');
  const leadName = String(payload.leadName || 'البطل');
  const criticScore = Number(payload.criticScore || 7.2);
  const wonCount = Number(payload.wonCount || 0);

  const { openingClause } = extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `أنت رئيس لجنة التحكيم في "${festivalName}".
تم عرض عمل "${title}" (تقييم النقاد: ${criticScore}/10، إخراج: ${directorName}، بطولة: ${leadName}) والذي تدور قصته حول: "${synopsis}".
العمل فاز بـ ${wonCount} جوائز في المهرجان.
اكتب بيان لجنة التحكيم بأسلوب سينمائي مصري راقٍ وطبيعي (جملتين فقط) يوضح رأي اللجنة في معالجة العمل ("${openingClause}") وأداء الأبطال.
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

  const systemPrompt = `أنت كشاف مواهب سينمائية ودرامية في مصر والوطن العربي.
سياق عالم اللاعب الحالي: شركة "${studioName}" بقيادة "${ceoName}" في اليوم #${gameDay} من عام ${currentYear}.
آخر أحداث عالم هذا اللاعب: ${memoryArr.slice(0, 4).join(' | ') || 'انطلاق الموسم السينمائي'}.
المطلوب منك ابتكار ممثل شاب صاعد جديد تماماً أو ممثلة شابة صاعدة جديدة تماماً (اسم ثنائي مصري/عربي واقعي ومبتكر غير موجود في القائمة الحالية: ${existingNames.slice(0, 500)}).
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
    const bestGenre = String(groqRes.data.best_genre || 'Drama');
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

  // Unique procedural seed tied to player's studioName + ceoName + gameDay + timestamp
  const firstMale = ['زياد', 'مروان', 'آدم', 'سيف', 'نديم', 'فارس', 'باسل', 'تيم', 'رامي', 'مازن', 'كريم', 'ياسين'];
  const firstFemale = ['لينا', 'مريم', 'ملك', 'تيا', 'داليدا', 'فريدة', 'نور', 'سارة', 'جنى', 'كرمة', 'سلسبيل', 'تمارا'];
  const lastNames = ['الشناوي', 'النبوي', 'ذو الفقار', 'المنسترلي', 'الداغر', 'السيوفي', 'العلايلي', 'المهدي', 'الرفاعي', 'الشهابي', 'البنداري', 'سرحان'];
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

  const systemPrompt = `أنت محلل اقتصادي لصناعة السينما والدراما في مصر والشرق الأوسط.
سياق العالم الحالي: شركة اللاعب هي "${studioName}" بقيادة "${ceoName}" في عام ${currentYear} (اليوم #${gameDay}).
الشركات الموجودة حالياً في السوق: (${existingStudios}).
آخر أحداث السوق: ${memoryArr.slice(0, 4).join(' | ') || 'منافسة محتدمة على شباك التذاكر'}.

المطلوب منك ابتكار شركة إنتاج سينمائي ودرامي جديدة تماماً تدخل السوق الآن برأس مال قوي لتنافس "${studioName}" وباقي الشركات (اختر اسماً عربياً/مصرياً فخماً ومبتكراً غير مكرر في القائمة أعلاه).
أرجع JSON فقط يحتوي على:
- name: اسم شركة الإنتاج الجديدة
- ceo: اسم المؤسس والمدير التنفيذي للشركة الجديدة
- specialty: تخصص الشركة الفني (مثلاً "أفلام الإثارة والمنصات الرقمية" أو "الإنتاجات التاريخية والأكشن الضخم")
- estimated_net_worth: القيمة السوقية المبدئية للشركة بالجنيه (رقم بين 180000000 و 460000000)
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
          : `بورصة الإنتاج: الإعلان رسمياً عن تأسيس «${newStudio.name}» بقيمة سوقية ${(netWorth / 1_000_000).toFixed(0)}M ج.م!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : `أعلن المنتج «${newStudio.ceo}» إطلاق شركة «${newStudio.name}» (${newStudio.specialty}) لتدخل سباق الترتيب العام مباشرة إلى جانب «${studioName}».`,
    });
  }

  const studioPrefixes = ['مجموعة كليوباترا', 'استوديوهات أوريون', 'شركة الصقر الذهبي', 'دار الفنون الحديثة', 'كيان ميديا', 'أفلام المحروسة الجديدة', 'بوابة الشرق'];
  const studioSuffixes = ['للإنتاج السينمائي', 'للصناعات الإبداعية', 'للإنتاج الفني والمنصات', 'للسينما والدراما'];
  const ceoFirst = ['شريف', 'طارق', 'نديم', 'عاصم', 'هشام', 'باهر', 'سلطان'];
  const ceoLast = ['الدمرداش', 'المنشاوي', 'الألفي', 'الكيلاني', 'التهامي', 'البهنساوي'];

  const genStudioName = `${studioPrefixes[seed % studioPrefixes.length]} ${studioSuffixes[(seed >> 2) % studioSuffixes.length]}`;
  const genCeoName = `${ceoFirst[(seed >> 3) % ceoFirst.length]} ${ceoLast[(seed >> 4) % ceoLast.length]}`;
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
    headline: `منافس جديد في السوق: تدشين «${genStudioName}» بقيادة ${genCeoName} بقيمة ${(netWorth / 1_000_000).toFixed(0)}M ج.م!`,
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
      : `تأسيس شركة «${studioName}» بقيادة «${ceoName}» بقيمة سوقية ${(marketValue / 1_000_000).toFixed(0)}M ج.م`;

  const rivalPool = [
    'المتحدون ميديا جروب',
    'سيرجي للإنتاج الفني',
    'العدلي جروب للدراما',
    'نيو سينما للقرن الجديد',
    'السباعي للإنتاج السينمائي',
    'أفلام النيل الدولية',
  ];
  const chosenRival = rivalPool[(gameDay + currentYear) % rivalPool.length];

  const systemPrompt = `أنت رئيس تحرير جريدة وبوابة أخبار فنية واقتصادية متخصصة في صناعة السينما والدراما في مصر والشرق الأوسط.
لديك ذاكرة كاملة بكل ما حدث في عالم اللعبة حتى اليوم #${gameDay} من عام ${currentYear}:
- اسم شركة اللاعب: "${studioName}"، المؤسس والمدير التنفيذي: "${ceoName}"
- القيمة السوقية الحالية لشركة اللاعب: ${(marketValue / 1_000_000).toFixed(1)}M ج.م، والسيولة بالخزينة: ${(cash / 1_000_000).toFixed(1)}M ج.م
- سجل ذاكرة الأحداث الأخيرة في عالم اللعبة:
- ${memoryContext}

المطلوب منك:
كتابة خبر صحفي عاجل وحقيقي الصياغة (بأسلوب صحفي فني واقتصادي رصين ومشوق مثل عناوين الصحف الفنية الكبرى) يربط بين أحداث الذاكرة السابقة، ويكون له تأثير فعلي ومباشر على عالم اللعبة (إما رفع/خفض القيمة السوقية لشركة "${studioName}"، أو صفقة رعاية تضخ سيولة، أو هزة/قفزة كبيرة في القيمة السوقية لشركة منافسة مثل "${chosenRival}" تغير ترتيب الشركات).

أرجع كائن JSON فقط يحتوي على:
- headline: عنوان صحفي عاجل وقوي
- detail: تفاصيل التقرير الصحفي في جملتين تذكران اسم "${studioName}" أو "${ceoName}" أو "${chosenRival}" وما حدث في الذاكرة
- badgeLabel: تصنيف الخبر (مثل "عاجل · بورصة الإنتاج" أو "تقرير صحفي خاص" أو "كواليس الصناعة")
- category: "ai_industry_report" أو "rival_project"
- marketValueDelta: رقم التأثير على القيمة السوقية لشركة اللاعب بالجنيه (بين -18000000 و +26000000، أو 0 لو الخبر عن شركة منافسة فقط)
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
  const studioName = String(payload?.studioName || 'استوديو اللاعب');
  const ceoName = String(payload?.ceoName || 'المنتج التنفيذي');
  const currentYear = Number(payload?.currentYear || 2026);
  const gameDay = Number(payload?.gameDay || 15);
  const format = String(payload?.format || (gameDay % 2 === 0 ? 'series' : 'film'));
  const isSeries = format === 'series';

  const studios = normalizeNameList(payload?.competitorStudios, [
    'المتحدون ميديا جروب',
    'سيرجي للإنتاج الفني',
    'العدلي جروب للدراما',
    'نيو سينما للقرن الجديد',
    'السباعي للإنتاج السينمائي',
    'أفلام النيل الدولية',
  ]);
  const stars = normalizeNameList(payload?.availableStars, [
    'كريم عبدون',
    'أحمد عزمي',
    'أمير كرم',
    'منى زاهر',
    'ياسمين العبد',
    'ماجد الكدواني',
    'عمرو يونس',
    'هند صبري',
  ]);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 6)
    : [];

  const systemPrompt = `أنت محرك الذكاء الاصطناعي المسؤول عن إدارة الشركات المنافسة وإنتاجاتها الضخمة في لعبة إمبراطور السينما والدراما.
سياق العالم الحالي: اليوم #${gameDay} من عام ${currentYear}. شركة اللاعب هي "${studioName}" بقيادة "${ceoName}".
الشركات المنافسة النشطة في السوق: (${studios.slice(0, 8).join('، ')}).
نجوم الصف الأول المتاحون للشركات المنافسة: (${stars.slice(0, 12).join('، ')}).
ذاكرة الأحداث الأخيرة: ${memoryArr.join(' | ') || 'منافسة محتدمة على صدارة السوق'}.

المطلوب منك ابتكار عملين منافسين قويين جداً وعاليي الميزانية (${isSeries ? 'مسلسلات درامية ضخمة' : 'أفلام سينمائية ضخمة'}) تطرحها الشركات المنافسة الآن لتشعل المنافسة ضد "${studioName}" في شباك التذاكر والترتيب العام وموسم الجوائز السنوي.
اجعل المنافسة شرسة وعالية جداً:
- عناوين عربية مبتكرة وجذابة جداً وغير مكررة
- إيرادات متوقعة ضخمة وواقعية (boxOfficeRevenue بين 95000000 و 245000000 ج.م)
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
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const studios = normalizeNameList(payload?.competitorStudios, [
    'المتحدون ميديا جروب',
    'سيرجي للإنتاج الفني',
    'العدلي جروب للدراما',
    'نيو سينما للقرن الجديد',
    'السباعي للإنتاج السينمائي',
  ]);
  const stars = normalizeNameList(payload?.availableStars, [
    'كريم عبدون',
    'أحمد عزمي',
    'أمير كرم',
    'منى زاهر',
    'ياسمين العبد',
  ]);

  const sampleTitles = isSeries
    ? [
        'العهد السري',
        'شارع السلطان',
        'الوريث الأخير',
        'ليالي المحروسة',
        'دائرة الشك',
        'متاهة القصر',
        'خيط الدخان',
        'أبواب الظل',
      ]
    : [
        'الرصاصة الذهبية',
        'خط النار',
        'سر الغرفة 204',
        'ليلة في الزمالك',
        'طريق الهروب',
        'الصفقة الكبرى',
        'شفرة الميناء',
        'الحصار الأخير',
      ];

  const seed = hashSeed(`${payload?.title || 'film'}_${studios[0] || ''}_${Date.now()}`);
  const count = 3;

  return studios.slice(0, count).map((studioName, idx) => {
    const title = sampleTitles[(seed + idx) % sampleTitles.length];
    const leadStarName = stars[(seed + idx) % Math.max(1, stars.length)] || 'نجم شباك';
    const baseRev = isSeries
      ? idx === 0
        ? 185_000_000
        : idx === 1
        ? 142_000_000
        : 108_000_000
      : idx === 0
      ? 172_000_000
      : idx === 1
      ? 134_000_000
      : 98_000_000;
    const criticScore = idx === 0 ? 8.8 : idx === 1 ? 8.2 : 7.7;
    return {
      studioName,
      title,
      genre: idx === 0 ? 'أكشن وتشويق' : idx === 1 ? 'دراما اجتماعية' : 'جريمة وغموض',
      leadStarName,
      boxOfficeRevenue: baseRev,
      criticScore,
      status: 'released',
    };
  });
}

function evaluateSilentScriptQuality(synopsis: string, title: string): number {
  const clean = synopsis.trim();
  if (!clean) return 38;
  const words = clean.split(/\s+/).filter(Boolean).length;
  const sentences = clean.split(/[،.,!؟\n]+/).filter((s) => s.trim().length > 6).length;
  const uniqueWords = new Set(clean.split(/\s+/).map((w) => w.replace(/[^\u0600-\u06FF]/g, ''))).size;
  const titleRelevance = title.trim().length >= 3 ? 6 : 0;

  const lengthScore = words >= 35 ? 38 : words >= 22 ? 30 : words >= 14 ? 22 : words >= 8 ? 14 : 6;
  const structureScore = Math.min(26, sentences * 6.5);
  const richnessScore = Math.min(24, uniqueWords * 0.9);
  return Math.min(95, Math.max(28, Math.round(lengthScore + structureScore + richnessScore + titleRelevance)));
}

function buildGroundedEgyptianReleaseEvaluation(payload: Record<string, unknown>) {
  const title = String(payload?.title || 'الفرعون الأخير');
  const synopsis = String(payload?.synopsis || '');
  const directorName = String(payload?.directorName || 'المخرج');
  const leadName = String(payload?.leadName || 'بطل العمل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const primaryGenre = String(payload?.primaryGenre || 'دراما');
  const technicalQuality = Number(payload?.technicalQuality || 68);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';

  const { openingClause, conflictClause, endingClause } =
    extractSynopsisHighlights(synopsis, title);

  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  const blendedQuality = technicalQuality * 0.62 + silentScriptScore * 0.38;

  const rawCritic = (blendedQuality / 10) * 0.92;
  const criticScore = Number(Math.min(9.1, Math.max(3.8, rawCritic)).toFixed(1));
  const audienceScore = Number(
    Math.min(
      9.3,
      Math.max(4.0, criticScore + (silentScriptScore >= 72 ? 0.35 : -0.35))
    ).toFixed(1)
  );

  const box_office_multiplier = Number(
    Math.min(
      1.32,
      Math.max(
        0.38,
        ((criticScore - 3.0) / 5.5) * (0.65 + (silentScriptScore / 100) * 0.52)
      )
    ).toFixed(2)
  );

  const posScore = Number(Math.min(9.4, criticScore + 0.7).toFixed(1));
  const mixedScore = criticScore;
  const negScore = Number(Math.max(3.5, criticScore - 1.4).toFixed(1));

  const seed = hashSeed(`${title}_${leadName}_${directorName}`);

  const positiveQuotes = [
    `معالجة فكرة "${openingClause}" في «${title}» منحت المخرج ${directorName} أرضية صلبة للبناء عليها، ونجح ${leadName} في تقديم أداء متماسك ومقنع طوال مشاهد المواجهة.`,
    `يحسب لصناع «${title}» تقديم خط "${openingClause}" بإيقاع مشدود وصورة بصرية متميزة، مع حضور لافت لـ ${leadName} جعل العمل يفرض نفسه بقوة هذا الموسم.`,
    `تجربة ناضجة فنياً؛ الانطلاقة من "${openingClause}" إلى تصاعد الصراع في "${conflictClause}" عكست تفاهماً واضحاً بين رؤية ${directorName} وحضور ${leadName}.`,
  ];

  const negativeQuotes = [
    `رغم جاذبية الفكرة في بداية "${openingClause}"، إلا أن تطور الصراع عند "${conflictClause}" عانى من بعض الإطالة، وكان يمكن رسم دوافع شخصية ${antagonistName} بعمق أكبر.`,
    `اعتمد «${title}» بشكل زائد على حضور ${leadName} الكاريزمي لتجاوز بعض الثغرات الدرامية في النصف الثاني، خاصة في معالجة خط "${conflictClause}".`,
    `البداية كانت واعدة جداً، لكن الإيقاع الدرامي تراجع قبل الوصول إلى "${endingClause}"، وكان السيناريو يحتاج تكثيفاً أكبر في مشاهد الذروة.`,
  ];

  const mixedQuotes = [
    `«${title}» عمل يوازن بين الجاذبية الجماهيرية والصنعة الفنية في إطار الـ (${primaryGenre})؛ البداية عند "${openingClause}" متقنة، وإن كانت النهاية عند "${endingClause}" ستقسم آراء المشاهدين.`,
    `قدم ${directorName} صورة بصرية محترمة وأداءً جيداً من ${leadName} و${antagonistName}، لكن بعض التحولات في "${conflictClause}" مرت بشكل أسرع مما ينبغي.`,
    `تجربة تستحق المشاهدة لعشاق هذا النوع الدرامي؛ عناصر الإنتاج متكاملة وإن بقيت قفلة "${endingClause}" مفتوحة للجدل النقدي.`,
  ];

  return {
    critic_score: criticScore,
    audience_score: audienceScore,
    box_office_multiplier,
    viral_trend_label:
      criticScore >= 7.5
        ? isSeries
          ? `#${title.replace(/\s+/g, '_')} يتصدر قوائم المشاهدة وإشادة بمعالجة "${openingClause}"`
          : `#${title.replace(/\s+/g, '_')} يتصدر شباك التذاكر وإشادة بمعالجة "${openingClause}"`
        : criticScore >= 6.0
        ? `تباين الآراء حول نهاية «${title}» وأداء الأبطال`
        : `ملاحظات نقدية على حبكة «${title}» رغم حضور ${leadName}`,
    rival_releases: buildGroundedRivalReleases(payload),
    reviews: [
      {
        criticName: 'طارق الشهاوي',
        publication: 'الشاشة الذهبية',
        sentiment: posScore >= 7.0 ? 'positive' : 'mixed',
        quote: positiveQuotes[seed % positiveQuotes.length],
        score: posScore,
      },
      {
        criticName: 'ماجدة خيرت',
        publication: 'بوابة الفن السابع',
        sentiment: 'negative',
        quote: negativeQuotes[(seed + 1) % negativeQuotes.length],
        score: negScore,
      },
      {
        criticName: 'نديم محسن',
        publication: 'سينما إنسايدر',
        sentiment: 'mixed',
        quote: mixedQuotes[(seed + 2) % mixedQuotes.length],
        score: mixedScore,
      },
    ],
    social_posts: [
      {
        handle: '@CinemaMasr_Fan',
        platform: 'X',
        content: isSeries
          ? `متابع حلقات «${title}» من أول يوم.. مشهد "${openingClause}" وأداء ${leadName} عاملين نسب مشاهدة قوية الموسم ده 🎬✨`
          : `لسه خارج من عرض «${title}» في السينما.. مشهد "${openingClause}" شد القاعة كلها، و${leadName} مقدم دور مختلف فعلاً 🎬🔥`,
        likes: criticScore >= 7.2 ? '34.5K' : '8.2K',
      },
      {
        handle: '@FilmCritic_Cairo',
        platform: 'X',
        content: `المواجهة بين ${leadName} و${antagonistName} في خط "${conflictClause}" هي أقوى نقطة في «${title}».. تقييمي الواقعي للعمل ${mixedScore}/10.`,
        likes: '11.4K',
      },
      {
        handle: '@DramaTrends_EG',
        platform: 'TikTok',
        content: `نقاشات الجمهور على قفلة «${title}» ولحظة "${endingClause}".. العمل عامل صدى واسع هذا الموسم 🍿`,
        likes: criticScore >= 7.5 ? '145K' : '42K',
      },
    ],
  };
}

async function handleEvaluateRelease(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const title = String(payload?.title || 'الفرعون الأخير');
  const synopsis = String(payload?.synopsis || '');
  const directorName = String(payload?.directorName || 'المخرج');
  const leadName = String(payload?.leadName || 'البطل');
  const antagonistName = String(payload?.antagonistName || 'الخصم الدرامي');
  const technicalQuality = Number(payload?.technicalQuality || 68);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  const competitorStudios = normalizeNameList(payload?.competitorStudios, [
    'المتحدون ميديا جروب',
    'سيرجي للإنتاج الفني',
    'العدلي جروب للدراما',
    'نيو سينما للقرن الجديد',
  ]).join('، ');
  const availableStars = normalizeNameList(payload?.availableStars, [
    'كريم عبدون',
    'أحمد عزمي',
    'أمير كرم',
    'منى زاهر',
  ]).join('، ');

  const systemPrompt = `أنت لجنة نقاد سينمائيين ودراميين مصريين ومحللي ${isSeries ? 'نسب مشاهدات المسلسلات والمنصات' : 'إيرادات شباك التذاكر السينمائي'}.
المطلوب منك أولاً تقييم جودة السيناريو الفعلي الذي كتبه المنتج بصمت وبموضوعية شديدة (قوة الحبكة، تماسك الصراع، منطقية النهاية، مدى ملاءمته لـ ${isSeries ? 'مسلسل درامي يقاس بالمشاهدات واستمرارية الحلقات' : 'فيلم سينمائي يقاس بإيرادات شباك التذاكر وإقبال القاعات'}):
عنوان العمل: "${title}"
نص السيناريو: "${synopsis}"
المخرج: ${directorName}، البطل: ${leadName}، الخصم: ${antagonistName}، الجودة الإنتاجية والفنية: ${technicalQuality}/100، التقييم الأولي لعمق الورق: ${silentScriptScore}/100.

الشركات المنافسة في السوق هذا الموسم: (${competitorStudios}).
النجوم المتاحون للشركات المنافسة: (${availableStars}).

قواعد التقييم الصارمة:
1. قيّم السيناريو بصدق: إذا كان السيناريو قصيراً أو سطحياً أو تقليدياً، اخفض box_office_multiplier (بين 0.38 و 0.72) واجعل الأعمال المنافسة تتفوق عليه في ${isSeries ? 'المشاهدات والعوائد' : 'إيرادات شباك التذاكر'}. أما إذا كان السيناريو عميقاً ومبتكراً ومتكاملاً مع أبطاله، فامنحه box_office_multiplier بين 0.85 و 1.32.
2. اكتب آراء النقاد ومنشورات الجمهور بلغة مصرية طبيعية وراقية واحترافية تذكر تفاصيل حقيقية من قصة المنتج.
3. ولّد أعمال الشركات المنافسة (3 شركات منافسة تنزل في نفس الموسم) ضمن مصفوفة rival_releases بأرقام واقعية قوية وشرسة في السوق المصري والعربي (بين 85,000,000 و 220,000,000) وتقييمات بين 7.4 و 9.2 حتى تكون المنافسة حقيقية وشرسة جداً.

أرجع JSON فقط يحتوي على:
- critic_score (رقم من 3.8 إلى 9.2)
- audience_score (رقم من 4.0 إلى 9.4)
- box_office_multiplier (رقم واقعي بين 0.38 و 1.32 يعكس جودة السيناريو والعمل مقارنة بالمنافسين)
- viral_trend_label (عنوان الصدى الجماهيري)
- reviews: مصفوفة من 3 نقاد (criticName, publication, sentiment: "positive"|"mixed"|"negative", quote يذكر تفاصيل القصة، score)
- social_posts: مصفوفة من 3 منشورات سوشيال ميديا (handle, platform, content, likes)
- rival_releases: مصفوفة من 3 عناصر، كل عنصر يحتوي على (studioName, title, genre, leadStarName, boxOfficeRevenue: رقم بين 85000000 و 220000000, criticScore, status: "released")`;

  const userPrompt = `قيّم ${isSeries ? 'مسلسل' : 'فيلم'} «${title}» وولّد منافسات الموسم الشرسة الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.critic_score === 'number' &&
    Array.isArray(groqRes.data.reviews) &&
    groqRes.data.reviews.length >= 2
  ) {
    const clampedCritic = Number(
      Math.min(9.2, Math.max(3.8, Number(groqRes.data.critic_score))).toFixed(1)
    );
    const clampedAudience = Number(
      Math.min(9.4, Math.max(4.0, Number(groqRes.data.audience_score || clampedCritic))).toFixed(1)
    );
    const rawAiMult = Number(groqRes.data.box_office_multiplier || 0.85);
    const scriptWeightedMult =
      rawAiMult * 0.7 + (0.42 + (silentScriptScore / 100) * 0.82) * 0.3;
    const clampedMult = Number(
      Math.min(1.32, Math.max(0.38, scriptWeightedMult)).toFixed(2)
    );

    const fallbackRivals = buildGroundedRivalReleases(payload);
    const rivalReleases =
      Array.isArray(groqRes.data.rival_releases) &&
      groqRes.data.rival_releases.length >= 2
        ? (groqRes.data.rival_releases as Record<string, unknown>[])
            .slice(0, 3)
            .map((r, i) => {
              const fb = fallbackRivals[i % fallbackRivals.length];
              const rawRev = Number(r.boxOfficeRevenue || 0);
              const realisticRev =
                rawRev >= 65_000_000
                  ? Math.min(245_000_000, rawRev)
                  : fb?.boxOfficeRevenue || 125_000_000;
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
                criticScore: Number(
                  Math.min(9.3, Math.max(7.2, Number(r.criticScore || 8.0))).toFixed(1)
                ),
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
    ...buildGroundedEgyptianReleaseEvaluation(payload),
  });
}
