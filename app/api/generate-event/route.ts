import { NextRequest, NextResponse } from 'next/server';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_TEXT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, payload, groqKeyOverride, preferredModel } = body;
    const p = (payload || {}) as Record<string, unknown>;

    if (mode === 'generate_script_idea') {
      return await handleGenerateScriptIdea(p, groqKeyOverride, preferredModel);
    }

    if (mode === 'analyze_script_synopsis') {
      return await handleAnalyzeScriptSynopsis(p, groqKeyOverride, preferredModel);
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
  preferredModel?: string
): Promise<{ data: Record<string, unknown>; modelUsed: string } | null> {
  const groqKey = (
    groqKeyOverride ||
    process.env.GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    ''
  ).trim();

  if (!groqKey || groqKey === 'MY_GROQ_API_KEY') {
    return null;
  }

  const orderedModels = [
    ...(preferredModel &&
    GROQ_TEXT_MODELS.includes(preferredModel as (typeof GROQ_TEXT_MODELS)[number])
      ? [preferredModel]
      : []),
    ...GROQ_TEXT_MODELS.filter((m) => m !== preferredModel),
  ];

  const strictJsonSystemPrompt = `${systemPrompt}\n\nتنبيه تقني صارم جداً: يجب أن يكون ردك عبارة عن كائن JSON صالح فقط يبدأ بـ { وينتهي بـ } بدون أي نص إضافي خارج الـ JSON.`;

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
          temperature: 0.78,
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
      } else {
        const retryRes = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.72,
            messages: [
              { role: 'system', content: strictJsonSystemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
          }),
        });
        if (retryRes.ok) {
          const retryJson = await retryRes.json();
          const retryContent = retryJson.choices?.[0]?.message?.content || '';
          const extractedRetry = extractJsonFromText(retryContent);
          if (extractedRetry) {
            return { data: extractedRetry, modelUsed: model };
          }
        }
      }
    } catch {
      // Try next model
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
 * Stage 3: Evaluate Talent Offer (Actor / Director / Crew) — Non-repetitive, natural Egyptian professional tone
 */
async function handleEvaluateTalentOffer(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const talentName = String(payload.talentName || 'النجم');
  const roleLabel = String(payload.roleLabel || 'البطولة');
  const ego = Number(payload.ego || 78);
  const baseSalary = Number(payload.baseSalary || 20_000_000);
  const expectedMinSalary = Number(payload.expectedMinSalary || baseSalary);
  const offeredSalary = Number(payload.offeredSalary || baseSalary);
  const backendPoints = Number(payload.backendPoints || 0);
  const vipDinner = Boolean(payload.vipDinner);
  const title = String(payload.projectTitle || payload.title || 'الفرعون الأخير');
  const synopsis = String(payload.synopsis || '');
  const genreName = String(payload.primaryGenre || payload.genreName || 'دراما');
  const genreMasteryScore = Number(payload.genreMasteryScore || 75);
  const studioReputation = Number(payload.studioReputation || 65);

  const { openingClause, conflictClause, endingClause, wordCount } =
    extractSynopsisHighlights(synopsis, title);

  const effectiveValue =
    offeredSalary * (1 + backendPoints * 0.018 + (vipDinner ? 0.08 : 0));
  const financialRatio = effectiveValue / Math.max(1, expectedMinSalary);

  const scriptFactor = wordCount >= 18 ? 0.06 : wordCount < 8 ? -0.14 : 0;
  const genreFactor =
    genreMasteryScore >= 88
      ? 0.08
      : genreMasteryScore >= 78
      ? 0
      : -0.16;

  const seed = hashSeed(`${talentName}_${title}_${offeredSalary}_${backendPoints}`);
  const personalityStrictness = ((seed % 9) - 4) * 0.022;

  const totalScore = financialRatio + scriptFactor + genreFactor - personalityStrictness;
  const requiredThreshold = ego >= 90 ? 1.05 : ego >= 82 ? 0.99 : 0.93;

  const baselineShouldAccept = totalScore >= requiredThreshold;
  const isUnderpaid = offeredSalary < expectedMinSalary * 0.95;
  const isWeakGenreFit = genreMasteryScore < 78;
  const isWeakScript = wordCount < 10;

  const systemPrompt = `أنت الفنان/المخرج المصري "${talentName}".
تلقيت عرضاً للمشاركة في دور "${roleLabel}" بعمل فني عنوانه "${title}" (التصنيف: ${genreName}).
ملخص السيناريو: "${synopsis}".
أجرك المتوقع في السوق: ${(expectedMinSalary / 1_000_000).toFixed(1)} مليون ج.م، والعرض المالي المقدم لك: ${(offeredSalary / 1_000_000).toFixed(1)} مليون ج.م + ${backendPoints}% نسبة من الأرباح ${vipDinner ? '+ جلسة عمل خاصة' : ''}.
درجة ملاءمة الدور لتخصصك (${genreName}): ${genreMasteryScore}/100، ومكانة شركة الإنتاج: ${studioReputation}/100.
توصية المحرك المالي والفني: ${baselineShouldAccept ? 'موافقة على العرض (accepted: true)' : 'الاعتذار عن العرض (accepted: false)'}.

قواعد الأسلوب (مهمة جداً):
- اكتب ردك بلغة مصرية طبيعية وراقية واحترافية (مثل حديث النجوم والمخرجين في اللقاءات التلفزيونية الفنية، بدون أي مبالغة سوقية وبدون جمل مكررة).
- اربط ردك مباشرة بتفاصيل سيناريو العمل نفسه ("${openingClause}" أو "${conflictClause}").

أرجع JSON فقط يحتوي على:
- accepted: بوليان (true أو false) (${baselineShouldAccept})
- reason: ردك في جملتين واضحتين ومميزتين يوضح سبب قبولك أو اعتذارك.`;

  const userPrompt = `اكتب رد الفنان "${talentName}" بخصوص دور "${roleLabel}" في «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.reason === 'string') {
    const finalAccepted =
      typeof groqRes.data.accepted === 'boolean'
        ? financialRatio < 0.82
          ? false
          : groqRes.data.accepted
        : baselineShouldAccept;
    return NextResponse.json({
      source: 'وكيل أعمال الفنان',
      accepted: finalAccepted,
      reason: groqRes.data.reason,
    });
  }

  let egyptianReason = '';
  if (baselineShouldAccept) {
    const acceptVariants = [
      `قريت معالجة «${title}» وعجبني جداً بناء الشخصية بداية من "${openingClause}"، وبما إن التقدير المالي مناسب لتفرغي، يسعدني التوقيع معاكم.`,
      `الخط الدرامي الخاص بـ "${conflictClause}" في «${title}» مكتوب بذكاء ويقدم منطقة تمثيلية جديدة ليا في الـ ${genreName}، وأنا جاهز لبداية التحضير.`,
      `تفاصيل الدور في «${title}» وتحديداً التحول عند "${endingClause}" حمسني جداً للتجربة، والعرض المالي متوازن ومحترم، اعتبروني معاكم في العمل.`,
      `سيناريو «${title}» مختلف عن السائد في السوق حالياً، وفكرة "${openingClause}" فيها مساحة إبداع حقيقية، موافق على بنود التعاقد.`,
      `بعد مناقشة الورق مع إدارة أعمالي، شايف إن شخصية (${roleLabel}) في «${title}» خطوة مهمة في توقيتها، والاتفاق المالي مرضي للطرفين.`,
      `إيقاع الأحداث في «${title}» من لحظة "${openingClause}" لحد "${conflictClause}" مشدود ومقنع جداً، يسعدني الانضمام لفريق العمل.`,
    ];
    egyptianReason = acceptVariants[seed % acceptVariants.length];
  } else {
    if (isUnderpaid) {
      const underpaidVariants = [
        `فكرة «${title}» وتفاصيل "${openingClause}" جيدة، لكن العرض المالي (${(offeredSalary / 1_000_000).toFixed(1)}M ج.م) أقل من أجري المعتاد في السوق (${(expectedMinSalary / 1_000_000).toFixed(1)}M ج.م) ولا يناسب حجم التفرغ المطلوب.`,
        `إدارة أعمالي راجعت العرض المالي لـ «${title}»، ورغم إعجابي بخط "${conflictClause}" إلا أن الرقم المعروض بعيد عن تعاقداتي الأخيرة؛ لو تم تعديل الأجر أو إضافة نسبة أرباح مناسبة نقدر نتفق.`,
        `الدور في «${title}» يتطلب مجهوداً كبيراً وتفرغاً كاملاً، والمقابل المادي المعروض حالياً (${(offeredSalary / 1_000_000).toFixed(1)}M ج.م) لا يعكس قيمتي التسويقية في شباك التذاكر.`,
        `بصراحة معالجة «${title}» محترمة، لكن شروط العقد المالي أقل من الحد الأدنى اللي بقبل بيه (${(expectedMinSalary / 1_000_000).toFixed(1)}M ج.م)، ياريت تراجعوا الميزانية ونعيد التفاوض.`,
      ];
      egyptianReason = underpaidVariants[seed % underpaidVariants.length];
    } else if (isWeakGenreFit) {
      const genreVariants = [
        `قريت سيناريو «${title}» بالكامل، لكن حاسس إن تصنيف (${genreName}) وتفاصيل "${openingClause}" بعيدة عن المنطقة الفنية اللي بفضل أقدمها لجمهوري في المرحلة دي.`,
        `أعتذر عن الدور في «${title}» لأن تركيبة الشخصية في إطار الـ (${genreName}) لا تشبه اختياراتي الحالية، إلا لو كان هناك عرض استثنائي يعوض هذه المجازفة الفنية.`,
      ];
      egyptianReason = genreVariants[seed % genreVariants.length];
    } else if (isWeakScript) {
      egyptianReason = `ملخص سيناريو «${title}» لا يزال مختصراً ولا يوضح أبعاد الشخصية أو تطور الصراع الدرامي الكافي؛ أفضل الانتظار حتى تكتمل المعالجة الدرامية بشكل أوضح.`;
    } else {
      const generalRejectVariants = [
        `رغم إن خط "${conflictClause}" في «${title}» فكرته واعدة، إلا أن بنود التعاقد الحالية لا تتناسب مع جدول ارتباطاتي الفنية وأجري في السوق حالياً.`,
        `أعتذر عن المشاركة في «${title}» بالتقييم المالي الحالي؛ الدور يحتاج التزاماً طويلاً في التصوير ويتطلب تقديراً مالياً أفضل أو نسبة واضحة من الإيرادات.`,
      ];
      egyptianReason = generalRejectVariants[seed % generalRejectVariants.length];
    }
  }

  return NextResponse.json({
    source: 'وكيل أعمال الفنان',
    accepted: baselineShouldAccept,
    reason: egyptianReason,
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
- hype_delta: رقم بين 2 و 7`;

  const userPrompt = `اكتب تقرير عرض الحلقة ${episodeNumber} من مسلسل «${title}» بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: 'مرصد الدراما',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? 4),
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
  const leadName = String(payload.leadName || 'بطل العمل');
  const directorName = String(payload.directorName || 'المخرج');
  const rivalTitle = String(payload.rivalTitle || 'العمل المنافس');
  const currentRevenueMillions = String(payload.currentRevenueMillions || '12.5');

  const { openingClause, conflictClause, endingClause } =
    extractSynopsisHighlights(synopsis, title);

  const systemPrompt = `أنت محرر صحافة فنية في لعبة Hyptrix.
اكتب خبراً فنياً واحداً مميزاً وغير مكرر بلغة مصرية طبيعية واحترافية (بدون مبالغة سوقية) عن اليوم رقم ${day}:
- المرحلة: ${phase === 'filming' ? 'كواليس التصوير والإنتاج' : 'منافسة شباك التذاكر السينمائي'}
- اسم العمل: "${title}"
- القصة: "${synopsis}"
- البطل: "${leadName}" والمخرج: "${directorName}"
- المنافس: "${rivalTitle}"
- الإيرادات الحالية: ${currentRevenueMillions} مليون ج.م

اربط الخبر بتفاصيل القصة ("${openingClause}" أو "${conflictClause}").
أرجع JSON فقط يحتوي على:
- headline: عنوان الخبر
- detail: تفاصيل الخبر في جملتين
- impact_type: "positive" أو "drama" أو "rival"
- hype_delta: رقم بين -3 و +7`;

  const userPrompt = `اكتب تقريراً صحفياً فنياً عن «${title}» في اليوم ${day} بصيغة JSON الآن.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: 'الصحافة الفنية',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || groqRes.data.impactType || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? groqRes.data.hypeDelta ?? 4),
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
 * World Simulation Mode: Invent a brand-new Rising Star Actor/Actress
 */
async function handleDiscoverAiRisingStar(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const existingNames = Array.isArray(payload?.existingNames)
    ? (payload.existingNames as string[]).join('، ')
    : '';

  const systemPrompt = `أنت كشاف مواهب سينمائية ودرامية في مصر.
المطلوب منك ابتكار ممثل شاب صاعد جديد تماماً أو ممثلة شابة صاعدة جديدة تماماً (اسم مصري واقعي وجذاب غير موجود في هذه القائمة: ${existingNames}).
أرجع JSON فقط يحتوي على:
- name: الاسم الثنائي للموهبة الصاعدة
- gender: "M" أو "F"
- age: رقم بين 19 و 27
- archetype: وصف قصير لنوعية الأدوار التي يبرع فيها (مثلاً: "بطل دراما وتشويق شاب" أو "نجمة كوميديا ورومانسية صاعدة")
- base_salary: رقم بين 1800000 و 3500000
- overall: رقم بين 70 و 77
- headline: عنوان خبر فني عاجل عن ظهور هذه الموهبة الصاعدة وتألقها
- detail: جملتان تصفان كيف خطفت الأنظار في الوسط الفني وأصبحت متاحة للتعاقد.`;

  const userPrompt = `ابتكر موهبة تمثيلية مصرية صاعدة جديدة الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel
  );

  if (groqRes && typeof groqRes.data.name === 'string') {
    const ovr = Math.min(79, Math.max(69, Number(groqRes.data.overall || 73)));
    const actor = {
      id: `act_ai_${Date.now()}`,
      name: groqRes.data.name,
      gender: groqRes.data.gender === 'F' ? 'F' : 'M',
      age: Math.min(29, Math.max(19, Number(groqRes.data.age || 23))),
      tier: 'C' as const,
      base_salary: Math.min(
        4_500_000,
        Math.max(1_500_000, Number(groqRes.data.base_salary || 2_400_000))
      ),
      archetype:
        typeof groqRes.data.archetype === 'string'
          ? groqRes.data.archetype
          : 'موهبة تمثيلية صاعدة',
      stats: {
        overall: ovr,
        acting: ovr + 2,
        box_office: ovr - 3,
        charisma: ovr + 1,
        ego: 48,
      },
      genre_mastery: {
        Drama: 84,
        Thriller: 80,
        Comedy: 78,
        Action: 76,
        Romance: 80,
      },
      synergy_with: [],
      rivalries: [],
      isAiGenerated: true,
      status: 'active' as const,
      lastEvolutionNote: 'موهبة صاعدة جديدة في السوق ✨',
    };

    return NextResponse.json({
      actor,
      headline:
        typeof groqRes.data.headline === 'string'
          ? groqRes.data.headline
          : `موهبة صاعدة تخطف الأنظار: انضمام «${actor.name}» لسوق الممثلين!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : `أشاد النقاد بحضور «${actor.name}» (${actor.age} سنة) كأبرز الوجوه الصاعدة هذا الموسم، وأصبحت بطاقته متاحة الآن للتعاقد.`,
    });
  }

  return NextResponse.json({ actor: null });
}

function buildGroundedRivalReleases(payload: Record<string, unknown>) {
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const studios = Array.isArray(payload?.competitorStudios)
    ? (payload.competitorStudios as string[])
    : [
        'المتحدة للإنتاج السينمائي',
        'سينرجي تامر مرسي',
        'العدل جروب',
        'نيو سينشري',
        'السبكي للإنتاج السينمائي',
      ];
  const stars = Array.isArray(payload?.availableStars)
    ? (payload.availableStars as string[])
    : ['كريم عبد العزيز', 'أحمد عز', 'أمير كرارة', 'منى زكي', 'ياسمين عبد العزيز'];

  const sampleTitles = isSeries
    ? ['العهد السري', 'شارع السلطان', 'الوريث الأخير', 'ليالي المحروسة', 'دائرة الشك']
    : ['الرصاصة الذهبية', 'خط النار', 'سر الغرفة 204', 'ليلة في الزمالك', 'طريق الهروب'];

  return studios.slice(0, 4).map((studioName, idx) => {
    const isDelayed = idx === 3;
    const title = sampleTitles[idx % sampleTitles.length];
    const leadStarName = stars[idx % Math.max(1, stars.length)] || 'نجم شباك';
    if (isDelayed) {
      return {
        studioName,
        title,
        genre: 'دراما وتشويق',
        leadStarName,
        boxOfficeRevenue: 0,
        criticScore: 0,
        status: 'delayed',
        delayReason: `قررت شركة «${studioName}» تأجيل طرح «${title}» للموسم القادم لاستكمال مراحل المونتاج.`,
      };
    }
    const baseRev =
      idx === 0 ? 92_000_000 : idx === 1 ? 68_000_000 : 44_000_000;
    const criticScore = idx === 0 ? 7.9 : idx === 1 ? 7.2 : 6.4;
    return {
      studioName,
      title,
      genre: idx === 0 ? 'أكشن وتشويق' : idx === 1 ? 'دراما اجتماعية' : 'كوميديا',
      leadStarName,
      boxOfficeRevenue: baseRev,
      criticScore,
      status: 'released',
    };
  });
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

  const { openingClause, conflictClause, endingClause, wordCount } =
    extractSynopsisHighlights(synopsis, title);

  const scriptDepthDelta =
    wordCount >= 22 ? 0.5 : wordCount >= 12 ? 0.1 : -0.8;
  const rawCritic = (technicalQuality / 10) * 0.88 + scriptDepthDelta;
  const criticScore = Number(Math.min(9.1, Math.max(3.6, rawCritic)).toFixed(1));
  const audienceScore = Number(
    Math.min(9.3, Math.max(4.0, criticScore + (technicalQuality >= 70 ? 0.4 : -0.3))).toFixed(1)
  );

  const box_office_multiplier = Number(
    Math.min(1.55, Math.max(0.45, (criticScore - 2.2) / 5.2)).toFixed(2)
  );

  const posScore = Number(Math.min(9.4, criticScore + 0.8).toFixed(1));
  const mixedScore = criticScore;
  const negScore = Number(Math.max(3.4, criticScore - 1.5).toFixed(1));

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
        ? `#${title.replace(/\s+/g, '_')} يتصدر النقاشات وإشادة بمعالجة "${openingClause.slice(0, 25)}..."`
        : criticScore >= 6.0
        ? `تباين الآراء حول نهاية «${title}» وأداء الأبطال`
        : `ملاحظات نقدية على حبكة «${title}» رغم حضور ${leadName}`,
    rival_releases: buildGroundedRivalReleases(payload),
    reviews: [
      {
        criticName: 'طارق الشناوي',
        publication: 'الشاشة الذهبية',
        sentiment: posScore >= 7.0 ? 'positive' : 'mixed',
        quote: positiveQuotes[seed % positiveQuotes.length],
        score: posScore,
      },
      {
        criticName: 'ماجدة خير الله',
        publication: 'بوابة الفن السابع',
        sentiment: 'negative',
        quote: negativeQuotes[(seed + 1) % negativeQuotes.length],
        score: negScore,
      },
      {
        criticName: 'أندرو محسن',
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
          ? `متابع حلقات «${title}» من أول يوم.. مشهد "${openingClause.slice(0, 40)}" وأداء ${leadName} عاملين حالة درامية ممتازة الموسم ده 🎬✨`
          : `لسه خارج من عرض «${title}».. مشهد "${openingClause.slice(0, 40)}" شد القاعة كلها، و${leadName} مقدم دور مختلف فعلاً 🎬🔥`,
        likes: criticScore >= 7.2 ? '34.5K' : '8.2K',
      },
      {
        handle: '@FilmCritic_Cairo',
        platform: 'X',
        content: `المواجهة بين ${leadName} و${antagonistName} في خط "${conflictClause.slice(0, 38)}" هي أقوى نقطة في «${title}».. تقييمي الواقعي للعمل ${mixedScore}/10.`,
        likes: '11.4K',
      },
      {
        handle: '@DramaTrends_EG',
        platform: 'TikTok',
        content: `نقاشات الجمهور على قفلة «${title}» ولحظة "${endingClause.slice(0, 35)}".. العمل عامل صدى واسع هذا الموسم 🍿`,
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
  const competitorStudios = Array.isArray(payload?.competitorStudios)
    ? (payload.competitorStudios as string[]).join('، ')
    : 'المتحدة للإنتاج السينمائي، سينرجي، العدل جروب، نيو سينشري';
  const availableStars = Array.isArray(payload?.availableStars)
    ? (payload.availableStars as string[]).join('، ')
    : 'كريم عبد العزيز، أحمد عز، أمير كرارة، منى زكي';

  const systemPrompt = `أنت لجنة نقاد سينمائيين ودراميين مصريين ومحللي شباك تذاكر.
حلل ${format === 'series' ? 'مسلسل' : 'فيلم'} "${title}" بناءً على السيناريو الفعلي الذي كتبه المنتج:
"${synopsis}"
المخرج: ${directorName}، البطل: ${leadName}، الخصم: ${antagonistName}، الجودة الفنية المحسوبة: ${technicalQuality}/100.

الشركات المنافسة في السوق هذا الموسم: (${competitorStudios}).
النجوم المتاحون للشركات المنافسة: (${availableStars}).

قواعد الأسلوب:
1. اكتب آراء النقاد ومنشورات الجمهور بلغة مصرية طبيعية وراقية واحترافية (تذكر تفاصيل حقيقية من قصة وسيناريو المنتج).
2. اجعل آراء النقاد الثلاثة متباينة بصدق (إشادة نقدية، نقد فني صريح لنقاط الضعف، ورأي متوازن).
3. ولّد أيضاً أعمال الشركات المنافسة في هذا الموسم ضمن مصفوفة rival_releases (4 شركات منافسة: 3 منها طرحت أعمالاً بإيرادات وتقييمات متفاوتة بواقعية بين نجاح كبير أو متوسط أو إخفاق، وشركة واحدة تأخرت وأجلت عرض عملها هذا الموسم status: "delayed").

أرجع JSON فقط يحتوي على:
- critic_score (رقم من 3.5 إلى 9.2)
- audience_score (رقم من 4.0 إلى 9.4)
- box_office_multiplier (رقم واقعي بين 0.45 و 1.55)
- viral_trend_label (عنوان الصدى الجماهيري)
- reviews: مصفوفة من 3 نقاد (criticName, publication, sentiment: "positive"|"mixed"|"negative", quote يذكر تفاصيل القصة، score)
- social_posts: مصفوفة من 3 منشورات سوشيال ميديا (handle, platform, content, likes)
- rival_releases: مصفوفة من 4 عناصر، كل عنصر يحتوي على (studioName, title, genre, leadStarName, boxOfficeRevenue, criticScore, status: "released"|"delayed", delayReason)`;

  const userPrompt = `قيّم عمل «${title}» وولّد منافسات الموسم الآن بصيغة JSON.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.critic_score === 'number' &&
    Array.isArray(groqRes.data.reviews) &&
    groqRes.data.reviews.length >= 2
  ) {
    const clampedCritic = Number(
      Math.min(9.2, Math.max(3.5, Number(groqRes.data.critic_score))).toFixed(1)
    );
    const clampedAudience = Number(
      Math.min(9.4, Math.max(3.8, Number(groqRes.data.audience_score || clampedCritic))).toFixed(1)
    );
    const clampedMult = Number(
      Math.min(1.55, Math.max(0.45, Number(groqRes.data.box_office_multiplier || 0.95))).toFixed(2)
    );
    const rivalReleases = Array.isArray(groqRes.data.rival_releases) &&
      groqRes.data.rival_releases.length >= 2
      ? groqRes.data.rival_releases
      : buildGroundedRivalReleases(payload);

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
