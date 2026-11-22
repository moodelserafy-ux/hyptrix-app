import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateTalentOfferDeep,
  RoleBillingSize,
  ROLE_BILLING_META,
} from '@/lib/game-engine';
import {
  getMarketAiContext,
  getMarketProfile,
  getCurrencyLabel,
  WorldMarketId,
  UiLanguageId,
} from '@/lib/market-profiles';
import { localizeEntityName } from '@/lib/i18n';
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
  evaluate_talent_offer: 240,
  generate_character_role: 210,
  generate_daily_news: 240,
  evaluate_series_episode: 260,
  evaluate_festival_ceremony: 250,
  generate_script_idea: 300,
  analyze_script_synopsis: 280,
  generate_pr_media_response: 400,
  mid_production_crises: 820,
  evaluate_release: 1350,
  discover_ai_rising_star: 280,
  discover_ai_emerging_studio: 300,
  generate_ai_rival_releases: 380,
  generate_ai_memory_news: 300,
};

function resolveMarketContext(payload: Record<string, unknown>) {
  const worldMarket = (
    typeof payload?.worldMarket === 'string' ? payload.worldMarket : 'egypt'
  ) as WorldMarketId;
  const uiLanguage = (
    typeof payload?.uiLanguage === 'string' ? payload.uiLanguage : 'en'
  ) as UiLanguageId;
  const isEn = uiLanguage === 'en';
  const profile = getMarketProfile(worldMarket);
  const ctx = getMarketAiContext(worldMarket);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);
  const industryEn =
    worldMarket === 'saudi'
      ? 'Saudi & Gulf Cinema & TV Industry'
      : 'Egyptian & Arab Cinema & TV Industry';
  const countryEn = worldMarket === 'saudi' ? 'Saudi Arabia & the Gulf' : 'Egypt & the Arab World';
  const landmarksEn =
    worldMarket === 'saudi'
      ? 'Riyadh Boulevard, AlUla canyons, Historic Jeddah, Diriyah, and Red Sea studios'
      : 'Cairo, Alexandria, Giza soundstages, Luxor, Red Sea resorts, and El Gouna';
  const festivalEn =
    worldMarket === 'saudi'
      ? 'Red Sea International Film Festival'
      : 'Cairo International Film Festival';
  const trendEn = worldMarket === 'saudi' ? 'Saudi & Gulf Trending' : 'Cairo & Regional Trending';

  const languageRule = isEn
    ? `CRITICAL OUTPUT LANGUAGE: Write 100% of every JSON string value in vivid, idiomatic, publication-grade English with rich cinematic depth (Variety / Hollywood Reporter / Screen Daily editorial craft). NEVER output Arabic script or Arabic words anywhere in the JSON values. Transliterate regional names naturally into English.`
    : `CRITICAL OUTPUT LANGUAGE: Write 100% of every JSON string value in natural, vivid, editorial ${
        worldMarket === 'saudi' ? 'Saudi/Gulf' : 'Egyptian'
      } Arabic tailored to ${industryEn}.`;

  const directive = `${languageRule}
Market Setting: ${industryEn} (${countryEn}; signature locations: ${landmarksEn}). Currency unit: ${currencyLabel}.`;

  return {
    worldMarket,
    uiLanguage,
    isEn,
    profile,
    ctx,
    currencyLabel,
    industryEn,
    countryEn,
    landmarksEn,
    festivalEn,
    trendEn,
    directive,
  };
}

export type GroqTaskModel = 'openai/gpt-oss-20b' | 'openai/gpt-oss-120b';

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
    const { mode, payload, groqKeyOverride } = body;
    const rawPayload = (payload || body || {}) as Record<string, unknown>;
    const p: Record<string, unknown> = {
      ...rawPayload,
      worldMarket: rawPayload.worldMarket ?? body.worldMarket ?? 'egypt',
      uiLanguage: rawPayload.uiLanguage ?? body.uiLanguage ?? 'en',
    };
    const taskTag = String(mode || 'evaluate_release');

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
    const effectiveKeyOverride = rateAllowed ? groqKeyOverride : '__RATE_LIMITED__';

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
      return await handleGeneratePrMediaResponse(p, effectiveKeyOverride, taskTag);
    }

    return await handleEvaluateRelease(p, effectiveKeyOverride, taskTag);
  } catch (err) {
    console.error('Narrative Engine Error:', err);
    return NextResponse.json(buildGroundedReleaseEvaluation({ uiLanguage: 'en' }), {
      status: 200,
    });
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

  const strictJsonSystemPrompt = `${systemPrompt}\nOutput ONLY a single valid JSON object starting with { and ending with }. No prose, no markdown fences.`;

  const groqKey = (
    groqKeyOverride ||
    process.env.GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    ''
  ).trim();

  if (groqKey && groqKey !== 'MY_GROQ_API_KEY') {
    const taskKey = taskModeOrPreferred || 'evaluate_release';
    const orderedModels = getTaskOrderedGroqModels(taskKey);
    const maxTokens = maxTokensOverride || TASK_MAX_TOKENS[taskKey] || 360;

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

function extractSynopsisHighlights(
  synopsis: string,
  title: string,
  isEn: boolean
) {
  const clean = synopsis.trim();
  if (!clean) {
    return {
      openingClause: isEn ? `the opening act of "${title}"` : `أحداث عمل «${title}»`,
      conflictClause: isEn ? `the central conflict of "${title}"` : `الصراع الدرامي في «${title}»`,
      endingClause: isEn ? `the shocking third-act twist` : `النهاية المفاجئة للعمل`,
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

const FALLBACK_EN_IDEAS: Record<string, Array<{ title: string; synopsis: string }>> = {
  egypt: [
    {
      title: 'Midnight Over Cairo',
      synopsis:
        'A disgraced investigative journalist uncovers a covert art-smuggling syndicate operating beneath Cairo’s historic downtown palaces. As he races to expose the mastermind before a high-profile auction, he discovers his own late father’s signature on the forged ledgers.',
    },
    {
      title: 'The Nile Protocol',
      synopsis:
        'When a retired intelligence cryptographer is pulled back for one final operation in Alexandria, a routine extraction spirals into a city-wide manhunt. Torn between loyalty to his former agency and the truth hidden inside an encrypted reel, he must outwit a mole sitting at the top of the command chain.',
    },
    {
      title: 'Last Screening in Zamalek',
      synopsis:
        'Inside a fading art-house cinema slated for demolition, a young projectionist finds an unreleased 1970s film reel containing evidence of a decades-old scandal. With rival tycoons closing in, the neighborhood bands together for one unforgettable premiere that flips the city upside down.',
    },
  ],
  saudi: [
    {
      title: 'Mirage of AlUla',
      synopsis:
        'An ambitious archaeologist working among AlUla’s ancient sandstone canyons unearths a sealed relic that triggers an international bidding war. Caught between ruthless treasure brokers and a fiercely protective desert guide, she must decode the inscription before a sandstorm buries the site forever.',
    },
    {
      title: 'Boulevard Zero',
      synopsis:
        'On the eve of Riyadh’s biggest tech summit, a brilliant cybersecurity architect spots a silent breach threatening to black out the entire financial district. With only six hours until dawn, she teams up with a street-smart investigator to trace the ghost hacker across the glittering skyline.',
    },
    {
      title: 'Tides of Old Jeddah',
      synopsis:
        'Two estranged brothers reunite in Historic Jeddah to save their grandfather’s legendary maritime trading house from a hostile takeover. As family secrets resurface behind the carved wooden roshan balconies, they realize the real prize isn’t the fortune—it’s the betrayal that tore them apart.',
    },
  ],
};

const FALLBACK_EN_RIVAL_FILMS: Record<string, string[]> = {
  egypt: ['The Golden Bullet', 'Line of Fire', 'Cairo Underground', 'The Grand Heist', 'Shadows on the Corniche'],
  saudi: ['Desert Falcon', 'Riyadh After Dark', 'Red Sea Syndicate', 'Canyon of Echoes', 'The Diriyah Pact'],
};

const FALLBACK_EN_RIVAL_SERIES: Record<string, string[]> = {
  egypt: ['The Secret Covenant', 'The Final Heir', 'Circle of Doubt', 'Palace Labyrinth', 'House of Mirrors'],
  saudi: ['Sands of Empire', 'The Seventh Gate', 'Crown of the Dunes', 'Heirs of Al-Balad', 'The Night Ledger'],
};

const FALLBACK_EN_CRITICS: Record<string, Array<{ name: string; publication: string }>> = {
  egypt: [
    { name: 'Karim El-Mansoury', publication: 'Silver Screen Review' },
    { name: 'Nadia Abdelrahman', publication: 'Cairo Cinema Weekly' },
    { name: 'Tarek Shawky', publication: 'Seventh Art Journal' },
  ],
  saudi: [
    { name: 'Faisal Al-Harbi', publication: 'Red Sea Film Dispatch' },
    { name: 'Lama Al-Otaibi', publication: 'Gulf Cinema Insider' },
    { name: 'Badr Al-Qahtani', publication: 'Riyadh Screen Review' },
  ],
};

/**
 * Stage 2 Mode A: Generate an original movie/series title and full dramatic synopsis
 */
async function handleGenerateScriptIdea(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { worldMarket, isEn, ctx, industryEn, countryEn, landmarksEn, directive } =
    resolveMarketContext(payload);
  const format = String(payload.format || 'film');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || (isEn ? 'Action' : 'أكشن'));
  const secondaryGenre = String(payload.secondaryGenreName || payload.secondaryGenre || '');
  const ageRating = String(payload.ageRating || '+12');
  const seedTitle = String(payload.currentTitle || '').trim();

  const systemPrompt = `${directive}
Role: Veteran award-winning screenwriter & story architect in the ${industryEn}.
Task: Pitch an original, high-concept, commercially magnetic ${
    format === 'film' ? 'theatrical feature film' : 'prestige TV/streaming drama series'
  } set authentically in ${countryEn} (drawing flavor from ${landmarksEn}).
Specifications:
- Primary Genre: ${primaryGenre}${secondaryGenre ? ` | Secondary Genre: ${secondaryGenre}` : ''}
- Age Rating: ${ageRating}
${seedTitle ? `- Producer's working title to build around: "${seedTitle}"` : ''}

Craft Requirements:
- Write 3 to 4 crisp, cinematic sentences introducing a compelling protagonist, the high-stakes central conflict, escalating tension, and an intriguing dramatic twist—clean, elevated, zero clichés.
Return JSON with keys:
- title: Punchy, marquee-worthy title suited for ${industryEn}
- synopsis: The 3–4 sentence logline/synopsis with protagonist, conflict, and twist`;

  const userPrompt = `Generate an original ${format} title and gripping synopsis JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.title === 'string' &&
    typeof groqRes.data.synopsis === 'string'
  ) {
    return NextResponse.json({
      source: isEn ? 'Writers’ Room' : 'ورشة تطوير السيناريو',
      title: groqRes.data.title,
      synopsis: groqRes.data.synopsis,
    });
  }

  if (isEn) {
    const enPool = FALLBACK_EN_IDEAS[worldMarket] || FALLBACK_EN_IDEAS.egypt;
    const picked = enPool[Math.floor(Math.random() * enPool.length)];
    return NextResponse.json({
      source: 'Writers’ Room',
      title: seedTitle || picked.title,
      synopsis: picked.synopsis,
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
  const { isEn, industryEn, directive } = resolveMarketContext(payload);
  const title = String(payload.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenreName || payload.primaryGenre || (isEn ? 'Drama' : 'دراما'));
  const format = String(payload.format || 'film');

  const { openingClause, conflictClause, wordCount } = extractSynopsisHighlights(
    synopsis,
    title,
    isEn
  );

  const systemPrompt = `${directive}
Role: Senior script consultant & story editor in the ${industryEn}.
The producer submitted a ${format === 'film' ? 'feature film' : 'TV series'} concept titled "${title}" (Genre: ${primaryGenre}):
"${synopsis}"

Evaluation Rubric (be candid, sharp, and constructive):
- If the pitch is very brief or underdeveloped, score between 55 and 70 and pinpoint what story beats need deepening.
- If the pitch has clear stakes, character motivation, and a compelling hook/twist, score between 75 and 92.

Return JSON with keys:
- score: integer 45..95 reflecting script strength
- verdict: 2 sharp editorial sentences referencing specific story beats from the pitch
- castingAdvice: 1–2 actionable sentences advising what caliber of stars and director fit this material.`;

  const userPrompt = `Analyze the script treatment for "${title}" and return JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.verdict === 'string' &&
    typeof groqRes.data.castingAdvice === 'string'
  ) {
    const score = Math.min(96, Math.max(45, Number(groqRes.data.score || 78)));
    return NextResponse.json({
      source: isEn ? 'Script Coverage Desk' : 'لجنة القراءة الدرامية',
      score,
      verdict: groqRes.data.verdict,
      castingAdvice: groqRes.data.castingAdvice,
    });
  }

  const baseScore = wordCount >= 22 ? 86 : wordCount >= 12 ? 76 : 63;
  if (isEn) {
    return NextResponse.json({
      source: 'Script Coverage Desk',
      score: baseScore,
      verdict:
        wordCount >= 14
          ? `The dramatic architecture of "${title}" holds together well—opening cleanly on "${openingClause}" before raising the stakes through "${conflictClause}", giving audiences a clear emotional hook.`
          : `The core hook of "${title}" around "${openingClause}" shows real commercial promise, but the treatment needs a sharper midpoint turn and climax to lure S-tier stars.`,
      castingAdvice:
        wordCount >= 14
          ? `Top (${primaryGenre}) performers will respond strongly to this material, though marquee leads will expect their full quote or backend profit points.`
          : `Because the treatment is still concise, A-list talent may hesitate unless backed by an aggressive compensation package or a prestige director.`,
    });
  }

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
  const { isEn, uiLanguage, industryEn, directive } = resolveMarketContext(payload);
  const rawTalentName = String(payload.talentName || (isEn ? 'Lead Star' : 'النجم'));
  const talentName = localizeEntityName(rawTalentName, uiLanguage);
  const archetype = String(payload.archetype || '');
  const roleBillingSize = (payload.roleBillingSize as RoleBillingSize) || 'lead_star';
  const title = String(payload.projectTitle || payload.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload.synopsis || '');
  const primaryGenre = String(payload.primaryGenre || (isEn ? 'Drama' : 'دراما'));

  const billingEnMap: Record<RoleBillingSize, string> = {
    lead_star: 'Top-Billed Lead',
    co_lead: 'Co-Lead',
    antagonist: 'Central Antagonist',
    supporting: 'Supporting Role',
    cameo: 'Special Guest Cameo',
  };
  const billingLabel = isEn
    ? billingEnMap[roleBillingSize] || 'Lead Role'
    : ROLE_BILLING_META[roleBillingSize]?.label || 'بطولة';
  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title, isEn);

  const systemPrompt = `${directive}
Role: Lead screenwriter & casting architect in the ${industryEn}.
Task: Invent a memorable character name and magnetic one-sentence dramatic role pitch (10–18 words) tailored specifically for actor "${talentName}" (${archetype}) in the (${billingLabel}) billing slot of "${title}" (Genre: ${primaryGenre}).
Story Synopsis: "${synopsis}"
Tie the character directly to the plot's core tension.
Return JSON with key:
- roleDescription: single evocative sentence describing the character and their stakes`;

  const userPrompt = `Create the tailored character role description for "${talentName}" in "${title}" as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.roleDescription === 'string') {
    return NextResponse.json({
      roleDescription: groqRes.data.roleDescription.trim(),
    });
  }

  const seed = hashSeed(`${talentName}_${title}_${roleBillingSize}`);
  if (isEn) {
    const fallbackEn =
      roleBillingSize === 'antagonist'
        ? [
            `The shadowy mastermind orchestrating "${conflictClause.slice(0, 42)}" and the most dangerous rival in "${title}"`,
            `A charismatic power-broker pulling the strings behind "${openingClause.slice(0, 42)}" to topple the hero`,
          ]
        : roleBillingSize === 'cameo'
        ? [
            `An unforgettable special appearance who reveals the hidden truth at the climax of "${title}"`,
            `A legendary insider whose brief intervention flips the confrontation over "${conflictClause.slice(0, 42)}"`,
          ]
        : [
            `The relentless protagonist caught at the center of "${openingClause.slice(0, 42)}" fighting to expose the truth in "${title}"`,
            `A complex lead forced into a high-stakes showdown at the heart of "${conflictClause.slice(0, 42)}"`,
          ];
    return NextResponse.json({
      roleDescription: fallbackEn[seed % fallbackEn.length],
    });
  }

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
 * Stage 3: Evaluate Talent Offer (Actor / Director / Crew)
 */
async function handleEvaluateTalentOffer(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { isEn, uiLanguage, currencyLabel, industryEn, directive } =
    resolveMarketContext(payload);
  const talentName = localizeEntityName(
    String(payload.talentName || (isEn ? 'Star' : 'النجم')),
    uiLanguage
  );
  const isActor = payload.isActor !== false;
  const starTier = (payload.starTier as 'S' | 'A' | 'B' | 'C') || 'B';
  const overall = Number(payload.overall || 82);
  const roleBillingSize = (payload.roleBillingSize as RoleBillingSize) || 'lead_star';
  const roleLabel = String(
    payload.customRoleDescription || payload.roleLabel || payload.roleTitle || (isEn ? 'Lead Role' : 'البطولة')
  );
  const ego = Number(payload.ego || 78);
  const baseSalary = Number(payload.baseSalary || 20_000_000);
  const offeredSalary = Number(payload.offeredSalary || baseSalary);
  const backendPoints = Number(payload.backendPoints || 0);
  const vipDinner = Boolean(payload.vipDinner);
  const title = String(payload.projectTitle || payload.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload.scriptSynopsis || payload.synopsis || '');
  const genreName = String(payload.primaryGenre || payload.genreName || (isEn ? 'Drama' : 'دراما'));
  const genreMasteryScore = Number(payload.genreMasteryScore || 75);
  const studioName = String(payload.studioName || (isEn ? 'Production Studio' : 'استوديو الإنتاج'));
  const studioReputation = Number(payload.studioReputation || 65);
  const directorName = payload.directorName
    ? localizeEntityName(String(payload.directorName), uiLanguage)
    : null;
  const directorOverall = payload.directorOverall ? Number(payload.directorOverall) : null;
  const aiMemoryLog = Array.isArray(payload.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 8)
    : [];

  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title, isEn);

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
    currencyLabel,
    uiLanguage,
  });

  const billingEnMap: Record<RoleBillingSize, string> = {
    lead_star: 'Top-Billed Lead',
    co_lead: 'Co-Lead',
    antagonist: 'Central Antagonist',
    supporting: 'Supporting Role',
    cameo: 'Special Cameo',
  };
  const billingLabel = isActor
    ? billingEnMap[roleBillingSize] || roleLabel
    : String(payload.roleTitle || roleLabel);

  const defaultWaitDays = starTier === 'S' || ego >= 85 ? 3 : 2;
  const memoryBlock =
    aiMemoryLog.length > 0
      ? `\nIndustry Memory & Track Record for "${studioName}":\n- ${aiMemoryLog.join('\n- ')}`
      : '';

  const systemPrompt = `${directive}
Role: You are ${isActor ? 'actor' : 'filmmaker/crew'} "${talentName}" in the ${industryEn} (Tier: ${starTier}, Overall: ${overall}/100, Ego: ${ego}/100).
You received an official contract offer from "${studioName}" for "${title}" (Genre: ${genreName}).
Offer Dossier:
1. Billing & Fit: ${billingLabel} — (${deepEval.roleFitVerdict}; Fit Score: ${deepEval.roleFitScore}/100)
2. Role Description: "${roleLabel}"
3. Story Synopsis: "${synopsis}"
4. Financial Package: ${(offeredSalary / 1_000_000).toFixed(1)}M ${currencyLabel} offered (vs. expected quote ${(deepEval.expectedMinimumSalary / 1_000_000).toFixed(1)}M ${currencyLabel}) + ${backendPoints}% backend profit points${vipDinner ? ' + private VIP table-read dinner' : ''}.
5. Genre Mastery (${genreName}): ${genreMasteryScore}/100 | Studio Reputation: ${studioReputation}/100${directorName ? ` | Attached Director: ${directorName}` : ''}.${memoryBlock}

Binding Business & Creative Decision: ${
    deepEval.willAccept
      ? 'ACCEPT OFFER (accepted: true)'
      : `DECLINE OFFER (accepted: false) — primary cause: ${deepEval.rejectionCategory}`
  }.

Instructions:
- Pick waitDays (2 or 3 in-game days) spent consulting your talent agent.
- Write your authentic first-person response (reason) in 2–3 natural, sharp sentences explaining precisely why you accepted or declined based on billing stature, script substance ("${openingClause}" / "${conflictClause}"), financial terms, and studio prestige.

Return JSON with keys:
- accepted: boolean (${deepEval.willAccept})
- waitDays: number (2 or 3)
- reason: your detailed official agency/talent reply`;

  const userPrompt = `Write "${talentName}"'s official contract reply for "${title}" as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.reason === 'string') {
    const rawWait = Number(groqRes.data.waitDays);
    const waitDays = rawWait === 3 ? 3 : rawWait === 2 ? 2 : defaultWaitDays;
    return NextResponse.json({
      source: isEn ? 'Talent Agency' : 'وكيل أعمال الفنان',
      accepted: deepEval.willAccept,
      willAccept: deepEval.willAccept,
      waitDays,
      reason: groqRes.data.reason,
      roleFitVerdict: deepEval.roleFitVerdict,
      rejectionCategory: deepEval.rejectionCategory,
    });
  }

  return NextResponse.json({
    source: isEn ? 'Talent Agency' : 'وكيل أعمال الفنان',
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
  const { isEn, uiLanguage, currencyLabel, industryEn, directive } =
    resolveMarketContext(payload);
  const episodeNumber = Number(payload.episodeNumber || 1);
  const totalEpisodes = Number(payload.totalEpisodes || 15);
  const title = String(payload.projectTitle || payload.title || (isEn ? 'New Series' : 'العمل الدرامي الجديد'));
  const synopsis = String(payload.synopsis || '');
  const leadName = localizeEntityName(
    String(payload.leadName || (isEn ? 'Lead Star' : 'بطل المسلسل')),
    uiLanguage
  );
  const antagonistName = localizeEntityName(
    String(payload.antagonistName || (isEn ? 'Main Antagonist' : 'الخصم الدرامي')),
    uiLanguage
  );
  const directorName = localizeEntityName(
    String(payload.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const currentRevenueMillions = String(payload.currentRevenueMillions || '25.0');

  const { openingClause, conflictClause, endingClause } = extractSynopsisHighlights(
    synopsis,
    title,
    isEn
  );

  const isPremiere = episodeNumber <= 2;
  const isFinale = episodeNumber === totalEpisodes;
  const isClimax = episodeNumber >= totalEpisodes - 2 && !isFinale;
  const isMidpoint = !isPremiere && !isFinale && !isClimax;

  const arcFocus = isPremiere
    ? `world-building and inciting incident around "${openingClause}"`
    : isFinale
    ? `season finale payoff and showdown resolving "${endingClause}"`
    : isClimax
    ? `penultimate climax and major secret revealed around "${conflictClause}"`
    : `escalating mid-season intrigue and twists around "${conflictClause}"`;

  const systemPrompt = `${directive}
Role: Senior TV critic & streaming ratings analyst in the ${industryEn}.
Episode ${episodeNumber} of ${totalEpisodes} of the drama series "${title}" just aired.
Plot: "${synopsis}".
Lead: "${leadName}" | Antagonist: "${antagonistName}" | Director: "${directorName}".
Episode Narrative Focus: ${arcFocus}.
Cumulative streaming & ad revenue so far: ${currentRevenueMillions}M ${currencyLabel}.

Write a fresh, vivid episode recap (zero clichés) capturing the standout scene and viewer/critic buzz.
Return JSON with keys:
- headline: punchy recap headline for Episode ${episodeNumber}
- detail: 2 crisp sentences covering the breakout moment and viewer/critic reaction
- impact_type: "positive" or "drama"
- hype_delta: integer 2..7
- daily_revenue_multiplier: float 0.85..1.38 reflecting episode viewership surge
- rival_momentum: float 0.85..1.25 reflecting competing series momentum`;

  const userPrompt = `Generate the Episode ${episodeNumber} ratings & critical recap JSON for "${title}" now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: isEn ? 'Drama Ratings Watch' : 'مرصد الدراما',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? 4),
      daily_revenue_multiplier: Math.min(
        1.4,
        Math.max(0.8, Number(groqRes.data.daily_revenue_multiplier || 1.08))
      ),
      rival_momentum: Math.min(
        1.3,
        Math.max(0.82, Number(groqRes.data.rival_momentum || 1.0))
      ),
    });
  }

  const seed = hashSeed(`${title}_ep_${episodeNumber}`);
  if (isEn) {
    if (isFinale) {
      return NextResponse.json({
        source: 'Drama Ratings Watch',
        headline: `Season Finale (Ep ${episodeNumber}): "${title}" Delivers a Knockout Payoff That Takes Over Social Feeds!`,
        detail: `The finale settled the long-simmering war over "${endingClause}" with an electrifying face-off between ${leadName} and ${antagonistName}, pushing cumulative revenue to ${currentRevenueMillions}M ${currencyLabel}.`,
        impact_type: 'positive',
        hype_delta: 7,
      });
    }
    if (isClimax) {
      return NextResponse.json({
        source: 'Drama Ratings Watch',
        headline: `Episode ${episodeNumber} of "${title}": A Jaw-Dropping Twist Sends Streaming Numbers Soaring!`,
        detail: `Director ${directorName} cranked the tension to a breaking point around "${conflictClause}", leaving viewers scrambling with theories ahead of the finale.`,
        impact_type: 'drama',
        hype_delta: 6,
      });
    }
    const enMid = [
      {
        headline: `Episode ${episodeNumber}: ${leadName} Commands the Screen as "${title}" Shifts Into High Gear`,
        detail: `Audiences raved about how Episode ${episodeNumber} escalated "${openingClause}", while critics praised the razor-sharp pacing as revenue reached ${currentRevenueMillions}M ${currencyLabel}.`,
        impact_type: 'positive',
        hype_delta: 4,
      },
      {
        headline: `Episode ${episodeNumber} of "${title}": That Final-Minute Cliffhanger Has Everyone Talking`,
        detail: `A bold late-episode turn tied to "${conflictClause}" sparked massive online debate over ${leadName}'s next move.`,
        impact_type: 'drama',
        hype_delta: 5,
      },
      {
        headline: `Critics Applaud the Electric Chemistry Between ${leadName} and ${antagonistName} in Episode ${episodeNumber}`,
        detail: `Their gripping verbal duel over "${conflictClause}" earned "${title}" its highest single-episode completion rate yet.`,
        impact_type: 'positive',
        hype_delta: 5,
      },
      {
        headline: `Episode ${episodeNumber}: Rising Stakes Draw a Fresh Wave of Viewers to "${title}"`,
        detail: `${directorName}'s moody visual framing of "${openingClause}" stood out across primetime slots in a fiercely contested season.`,
        impact_type: 'positive',
        hype_delta: 4,
      },
    ];
    return NextResponse.json({
      source: 'Drama Ratings Watch',
      ...enMid[(seed + (isMidpoint ? episodeNumber : 0)) % enMid.length],
    });
  }

  if (isFinale) {
    return NextResponse.json({
      source: 'مرصد الدراما',
      headline: `الحلقة الأخيرة (${episodeNumber}): نهاية حاسمة لمسلسل «${title}» تتصدر نقاشات الجمهور!`,
      detail: `حسمت الحلقة الأخيرة مصير الصراع عند "${endingClause}" في مواجهة تمثيلية قوية بين ${leadName} و${antagonistName}، ووصلت إجمالي عوائد المسلسل إلى ${currentRevenueMillions}M ${currencyLabel}.`,
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
      detail: `تفاعل المشاهدون مع تطور خط "${openingClause}" في الحلقة ${episodeNumber}، بينما أشاد النقاد بتماسك الإيقاع الدرامي وارتفاع عوائد البث إلى ${currentRevenueMillions}M ${currencyLabel}.`,
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
 * Stage 4 & Stage 5: Generate Milestone News from Filming Set or Box Office
 */
async function handleGenerateDailyNews(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { isEn, uiLanguage, currencyLabel, industryEn, directive } =
    resolveMarketContext(payload);
  const phase = String(payload.phase || 'box_office');
  const day = Number(payload.gameDay || payload.day || 1);
  const title = String(payload.projectTitle || payload.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload.synopsis || '');
  const leadName = localizeEntityName(
    String(payload.leadActorName || payload.leadName || (isEn ? 'Lead Star' : 'بطل العمل')),
    uiLanguage
  );
  const directorName = localizeEntityName(
    String(payload.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const rivalTitle = String(payload.rivalTitle || (isEn ? 'Rival Release' : 'العمل المنافس'));
  const currentRevenueMillions = String(payload.currentRevenueMillions || '12.5');
  const aiMemoryLog = Array.isArray(payload.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 6)
    : [];

  const { openingClause, conflictClause, endingClause } = extractSynopsisHighlights(
    synopsis,
    title,
    isEn
  );

  const memoryContext =
    aiMemoryLog.length > 0
      ? `\n- Recent Studio & Industry Memory:\n  * ${aiMemoryLog.join('\n  * ')}`
      : '';

  const systemPrompt = `${directive}
Role: Entertainment trade journalist covering the ${industryEn}.
Write ONE distinctive, non-repetitive trade dispatch for Day #${day}:
- Phase: ${phase === 'filming' ? 'On-set production & behind-the-scenes' : 'Live box-office race'}
- Title: "${title}" | Plot: "${synopsis}"
- Lead: "${leadName}" | Director: "${directorName}"
- Key Rival: "${rivalTitle}"
- Gross to date: ${currentRevenueMillions}M ${currencyLabel}${memoryContext}

Weave in concrete plot elements ("${openingClause}" or "${conflictClause}") and recent studio memory if available.
Return JSON with keys:
- headline: crisp trade headline
- detail: 2 vivid sentences of trade reporting
- impact_type: "positive" | "drama" | "rival"
- hype_delta: integer -3..7
- daily_revenue_multiplier: float 0.80..1.40
- rival_momentum: float 0.85..1.30`;

  const userPrompt = `Write the Day ${day} entertainment trade dispatch for "${title}" as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.headline === 'string') {
    return NextResponse.json({
      source: isEn ? 'Entertainment Press' : 'الصحافة الفنية',
      headline: groqRes.data.headline,
      detail: groqRes.data.detail || '',
      impact_type: groqRes.data.impact_type || groqRes.data.impactType || 'positive',
      hype_delta: Number(groqRes.data.hype_delta ?? groqRes.data.hypeDelta ?? 4),
      daily_revenue_multiplier: Math.min(
        1.42,
        Math.max(0.78, Number(groqRes.data.daily_revenue_multiplier || 1.06))
      ),
      rival_momentum: Math.min(
        1.32,
        Math.max(0.82, Number(groqRes.data.rival_momentum || 1.0))
      ),
    });
  }

  const seed = hashSeed(`${title}_${phase}_${day}`);

  if (isEn) {
    const filmingEn = [
      {
        headline: `On Set of "${title}": Precision Prep for the Pivotal "${openingClause.slice(0, 38)}..." Sequence`,
        detail: `Director ${directorName} and ${leadName} put in extended night shoots to capture the sequence with theatrical scale ahead of post-production.`,
        impact_type: 'positive',
        hype_delta: 5,
      },
      {
        headline: `${leadName} Wraps High-Stakes Showdown Scenes on "${title}"`,
        detail: `Production insiders report the "${conflictClause.slice(0, 40)}..." dailies look electric, sharply raising exhibitor expectations.`,
        impact_type: 'positive',
        hype_delta: 4,
      },
      {
        headline: `Industry Buzz Builds After First Stills Surface From "${title}"`,
        detail: `Leaked frames from the "${openingClause.slice(0, 38)}..." set drew immediate praise from critics for the film's bold visual palette.`,
        impact_type: 'drama',
        hype_delta: 5,
      },
      {
        headline: `${directorName} Enters Early Assembly Cut on "${title}"`,
        detail: `The director is personally tightening the climax around "${endingClause.slice(0, 38)}..." to keep audiences on the edge of their seats.`,
        impact_type: 'positive',
        hype_delta: 4,
      },
    ];
    const releaseEn = [
      {
        headline: `Day ${day}: Box-Office Slugfest Heats Up Between "${title}" and "${rivalTitle}"`,
        detail: `"${title}" climbed to ${currentRevenueMillions}M ${currencyLabel} as packed evening crowds turned out for the dramatic clash around "${conflictClause.slice(0, 38)}...".`,
        impact_type: 'rival',
        hype_delta: 4,
      },
      {
        headline: `Day ${day}: Moviegoers Debate the Ending of "${title}" and ${leadName}'s Turn`,
        detail: `Fans praised the gripping hook of "${openingClause.slice(0, 35)}...", while the bold third-act twist at "${endingClause.slice(0, 35)}..." fueled passionate online threads.`,
        impact_type: 'drama',
        hype_delta: 5,
      },
      {
        headline: `Day ${day}: Sold-Out Night Showings Push "${title}" to ${currentRevenueMillions}M ${currencyLabel}`,
        detail: `Multiplex chains reported strong evening occupancy driven by glowing word-of-mouth for ${leadName}'s performance.`,
        impact_type: 'positive',
        hype_delta: 5,
      },
      {
        headline: `Day ${day}: Critics Spotlight ${directorName}'s Visual Craft in "${title}"`,
        detail: `Trade reviewers singled out the cinematography and tension in "${conflictClause.slice(0, 35)}..." as a standout benchmark this season.`,
        impact_type: 'positive',
        hype_delta: 4,
      },
    ];
    const pool = phase === 'filming' ? filmingEn : releaseEn;
    return NextResponse.json({
      source: 'Entertainment Press',
      ...pool[(seed + day) % pool.length],
    });
  }

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
      detail: `وصلت إيرادات «${title}» إلى ${currentRevenueMillions}M ${currencyLabel} بدعم من الإقبال الجماهيري على مشاهدة خط "${conflictClause.slice(0, 38)}...".`,
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
      headline: `اليوم ${day}: الحفلات المسائية ترفع حصيلة «${title}» إلى ${currentRevenueMillions}M ${currencyLabel}`,
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
      detail: `استمر تدفق العائلات والشباب على القاعات لترتفع الحصيلة التراكمية إلى ${currentRevenueMillions}M ${currencyLabel} في سباق الموسم.`,
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
 * Stage 4 (Merged Golden Moment #1): Generate 3 Mid-Production Filming Crises + 1 Initial Press News in ONE JSON call
 */
async function handleGenerateCrises(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { worldMarket, isEn, uiLanguage, currencyLabel, directive } =
    resolveMarketContext(payload);
  const title = String(payload?.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload?.synopsis || '');
  const directorName = localizeEntityName(
    String(payload?.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const leadName = localizeEntityName(
    String(payload?.leadActorName || payload?.leadName || (isEn ? 'Lead Star' : 'بطل العمل')),
    uiLanguage
  );
  const antagonistName = localizeEntityName(
    String(payload?.antagonistName || (isEn ? 'Antagonist' : 'الخصم الدرامي')),
    uiLanguage
  );
  const studioName = String(payload?.studioName || (isEn ? 'the Studio' : 'الاستوديو'));
  const ageRating = String(payload?.ageRating || '+12');
  const hasEgoClash = Boolean(payload?.hasEgoClash);

  const { openingClause, conflictClause } = extractSynopsisHighlights(synopsis, title, isEn);
  const proceduralNews = composeProceduralFilmingNews({
    worldMarket,
    uiLanguage,
    projectTitle: title,
    studioName,
    directorName,
    leadName,
    synopsis,
    format: payload?.format === 'series' ? 'series' : 'film',
  });

  const systemPrompt = `${directive}
Generate 3 distinct, high-stakes on-set production crises AND 1 filming press news dispatch for "${title}" (lead: ${leadName}, antagonist: ${antagonistName}, director: ${directorName}, rating: ${ageRating}, egoClash: ${hasEgoClash}, plot: "${synopsis.slice(0, 240)}").
Each crisis must offer two meaningful executive choices (optionA = costly prestige/damage-control move, optionB = budget-conscious or risky trade-off).
Return JSON with keys:
- crises: array of 3 objects { id, title, description (1-2 sentences), optionA: { label, cost (number in ${currencyLabel}, e.g. 1500000..4000000), hypeDelta, qualityDelta }, optionB: { label, cost (number 0..800000), hypeDelta, qualityDelta } }
- pressNews: { headline, detail (1-2 sentences), impactType: "positive"|"drama"|"rival", hypeDelta (2..6) }`;

  const userPrompt = `Generate 3 tailored on-set crises + 1 filming pressNews item for "${title}" as JSON now.`;

  const groqRes = await callGroqJson(
    systemPrompt,
    userPrompt,
    groqKeyOverride,
    preferredModel || 'mid_production_crises',
    820
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
      source: isEn ? 'Line Production Office' : 'إدارة الإنتاج',
      crises: groqRes.data.crises,
      pressNews,
    });
  }

  const fallbackCrises = isEn
    ? [
        {
          id: `crisis_plot_${Date.now()}_1`,
          title: `Last-Minute Set Overhaul for "${openingClause.slice(0, 36)}..."`,
          description: `Midway through shooting the signature sequence of "${title}", ${leadName} and the cinematographer pushed to rebuild key practical sets for greater realism—requiring an unplanned budget boost.`,
          optionA: {
            label: `Approve the full set upgrade for peak visual quality (3.5M ${currencyLabel})`,
            cost: 3_500_000,
            hypeDelta: 6,
            qualityDelta: 5,
          },
          optionB: {
            label: 'Hold the line on budget and shoot with existing rigging',
            cost: 0,
            hypeDelta: -4,
            qualityDelta: -5,
          },
        },
        {
          id: `crisis_clash_${Date.now()}_2`,
          title: hasEgoClash
            ? `Creative Clash Between ${leadName} & ${antagonistName} Over Screen Time`
            : `Leaked Set Footage From the ${leadName} vs. ${antagonistName} Showdown`,
          description: hasEgoClash
            ? `Filming briefly stalled after a heated standoff between ${leadName} and ${antagonistName} over dialogue dominance and close-ups during "${conflictClause.slice(0, 38)}...".`
            : `Unauthorized clips from the pivotal "${conflictClause.slice(0, 38)}..." scene leaked online, spoiling part of the plot twist.`,
          optionA: {
            label: `Shoot an alternate twist & spin the leak into viral PR (2.5M ${currencyLabel})`,
            cost: 2_500_000,
            hypeDelta: 10,
            qualityDelta: 4,
          },
          optionB: {
            label: `Lock down set security and keep the current schedule (0.5M ${currencyLabel})`,
            cost: 500_000,
            hypeDelta: -3,
            qualityDelta: -2,
          },
        },
        {
          id: `crisis_censor_${Date.now()}_3`,
          title: `Rating Board Notes on "${title}" (${ageRating})`,
          description: `The classification board flagged intense beats in "${conflictClause.slice(0, 38)}..." and requested adjustments to preserve the (${ageRating}) theatrical rating without delaying release.`,
          optionA: {
            label: `Re-shoot the sequence with sharper dramatic framing (1.8M ${currencyLabel})`,
            cost: 1_800_000,
            hypeDelta: 4,
            qualityDelta: 3,
          },
          optionB: {
            label: 'Trim the flagged frames directly in the edit bay for free',
            cost: 0,
            hypeDelta: -3,
            qualityDelta: -6,
          },
        },
      ]
    : [
        {
          id: `crisis_plot_${Date.now()}_1`,
          title: `تعديل مفاجئ في تنفيذ مشهد "${openingClause.slice(0, 38)}..."`,
          description: `أثناء تصوير المشهد المحوري في «${title}»، طلب ${leadName} ومدير التصوير إعادة بناء جزء من الديكور ليظهر المشهد بواقعية أعلى، وهو ما يتطلب ميزانية إضافية.`,
          optionA: {
            label: `الموافقة على تطوير الديكور وتنفيذ المشهد بأعلى جودة (3.5M ${currencyLabel})`,
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
            label: `تصوير مشاهد إضافية بديلة واستثمار الحدث دعائياً (2.5M ${currencyLabel})`,
            cost: 2_500_000,
            hypeDelta: 10,
            qualityDelta: 4,
          },
          optionB: {
            label: `تشديد الحراسة على اللوكيشن واستكمال الجدول كما هو (0.5M ${currencyLabel})`,
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
            label: `إعادة صياغة وتصوير المشهد بمعالجة درامية ذكية (1.8M ${currencyLabel})`,
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
    source: isEn ? 'Line Production Office' : 'إدارة الإنتاج',
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
  const { isEn, uiLanguage, ctx, festivalEn, industryEn, directive } =
    resolveMarketContext(payload);
  const festivalName = localizeEntityName(
    String(payload.festivalName || (isEn ? festivalEn : ctx.defaultFestival)),
    uiLanguage
  );
  const title = String(payload.projectTitle || payload.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload.synopsis || '');
  const directorName = localizeEntityName(
    String(payload.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const leadName = Array.isArray(payload.leadActors)
    ? (payload.leadActors as string[])
        .map((n) => localizeEntityName(n, uiLanguage))
        .join(isEn ? ' & ' : ' و')
    : localizeEntityName(String(payload.leadName || (isEn ? 'Lead Star' : 'البطل')), uiLanguage);
  const criticScore = Number(payload.criticScore || 7.2);
  const wonCount = Array.isArray(payload.wonAwards)
    ? payload.wonAwards.length
    : Number(payload.wonCount || 0);

  const { openingClause } = extractSynopsisHighlights(synopsis, title, isEn);

  const systemPrompt = `${directive}
Role: Jury President at "${festivalName}" (${industryEn}).
Screened Entry: "${title}" (Critic Score: ${criticScore}/10, Directed by ${directorName}, Starring ${leadName}).
Plot: "${synopsis}".
Trophies Won Tonight: ${wonCount}.

Write a dignified, authoritative 2-sentence official jury statement addressing the craft of "${openingClause}" and the performances, plus a 1-sentence red-carpet buzz note.
Return JSON with keys:
- juryStatement: 2-sentence official jury citation
- festivalBuzz: 1-sentence red-carpet reaction`;

  const userPrompt = `Write the ${festivalName} Jury Statement for "${title}" as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (groqRes && typeof groqRes.data.juryStatement === 'string') {
    return NextResponse.json({
      source: isEn ? 'Festival Jury' : 'لجنة تحكيم المهرجان',
      juryStatement: groqRes.data.juryStatement,
      festivalBuzz:
        typeof groqRes.data.festivalBuzz === 'string'
          ? groqRes.data.festivalBuzz
          : isEn
          ? `Thunderous applause filled the grand gala hall following the announcement for "${title}"!`
          : `تصفيق حار في القاعة الكبرى عقب إعلان نتائج «${title}»!`,
    });
  }

  if (isEn) {
    return NextResponse.json({
      source: 'Festival Jury',
      juryStatement:
        wonCount >= 3
          ? `The ${festivalName} jury salutes the assured dramatic craft of "${openingClause}" in "${title}", recognizing the seamless synergy between ${directorName}'s direction and ${leadName}'s commanding turn as a defining milestone of the year.`
          : wonCount >= 1
          ? `The ${festivalName} jury commended "${title}" for its bold, textured handling of "${openingClause}", earning well-deserved honors amid an exceptionally competitive slate.`
          : `While applauding the commitment of ${leadName} and ${directorName} on "${title}", the ${festivalName} jury felt the narrative around "${openingClause}" needed sharper depth to claim top prizes this season.`,
      festivalBuzz:
        wonCount >= 2
          ? `Photographers swarmed the makers of "${title}" on the red carpet after their triumphant gala haul!`
          : `Lively critical debates echoed across the closing-night reception at ${festivalName}.`,
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
  const { isEn, uiLanguage, ctx, industryEn, countryEn, directive } =
    resolveMarketContext(payload);
  const existingNames = Array.isArray(payload?.existingNames)
    ? (payload.existingNames as string[]).join(', ')
    : '';
  const studioName = String(payload?.studioName || (isEn ? 'Player Studio' : 'استوديو اللاعب'));
  const ceoName = String(payload?.ceoName || (isEn ? 'Executive Producer' : 'المنتج التنفيذي'));
  const gameDay = Number(payload?.gameDay || 16);
  const currentYear = Number(payload?.currentYear || 2026);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const systemPrompt = `${directive}
Role: Elite talent scout & casting director in ${countryEn} (${industryEn}).
World Context: Player studio "${studioName}" led by "${ceoName}" on Day #${gameDay} of ${currentYear}.
Recent World Events: ${memoryArr.slice(0, 4).join(' | ') || 'New cinema season underway'}.
Task: Invent ONE completely fictional, culturally authentic rising young actor or actress (two-part name NOT present in: ${existingNames.slice(0, 500)}).
Return JSON with keys:
- name: fictional two-part stage name
- gender: "M" or "F"
- age: integer 19..27
- archetype: concise casting specialty (e.g., "Rising psychological thriller breakout" or "Sharp romantic-comedy scene-stealer")
- base_salary: integer 1600000..3400000
- overall: integer 71..78
- best_genre: one of ("Drama", "Thriller", "Comedy", "Action", "Romance", "Horror", "Sci-Fi", "Historical")
- headline: crisp trade headline announcing this breakout discovery
- detail: 2 vivid sentences explaining how they stole the spotlight and entered the casting market for studios like "${studioName}".`;

  const userPrompt = `Discover a brand-new rising star on Day ${gameDay} of ${currentYear} as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);

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
          : isEn
          ? 'Breakout Dramatic Talent'
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
          : isEn
          ? `Breakout Talent Alert: "${actor.name}" Enters the Casting Market!`
          : `انضمام الوجه السينمائي الجديد «${actor.name}» لبورصة النجوم!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : isEn
          ? `Critics raved about ${actor.name}'s (${actor.age}) magnetic stage-to-screen presence, making them one of the hottest free agents available to "${studioName}".`
          : `أشاد النقاد بحضور «${actor.name}» (${actor.age} سنة) في العروض المسرحية والسينمائية الأخيرة، وأصبح متاحاً الآن للتعاقد.`,
    });
  }

  const firstMale = ctx.risingFirstMale;
  const firstFemale = ctx.risingFirstFemale;
  const lastNames = ctx.risingLastNames;
  const seed = hashSeed(`${studioName}_${ceoName}_${gameDay}_${currentYear}_${Date.now()}`);
  const isFem = seed % 2 === 0;
  const fName = isFem
    ? firstFemale[seed % firstFemale.length]
    : firstMale[seed % firstMale.length];
  const lName = lastNames[(seed >> 3) % lastNames.length];
  const generatedName = localizeEntityName(`${fName} ${lName}`, uiLanguage);
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
    archetype: isEn
      ? isFem
        ? 'Rising Drama & Suspense Actress'
        : 'Rising Action & Mystery Actor'
      : isFem
      ? 'ممثلة دراما وتشويق شابة'
      : 'ممثل أكشن وغموض شاب',
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
    headline: isEn
      ? `Fresh Face on the Lot: Breakout Star "${generatedName}" Joins the Roster!`
      : `اكتشاف فني جديد: تألق «${generatedName}» وانضمامه لسوق النجوم!`,
    detail: isEn
      ? `Young performer ${generatedName} (${age}) caught the eye of top casting directors with a standout showcase, and is now open to offers from "${studioName}" and rival houses.`
      : `لفت الفنان الشاب «${generatedName}» (${age} سنة) أنظار المخرجين والنقاد بأدائه المتقن، ليصبح متاحاً الآن للتعاقد أمام «${studioName}» والشركات المنافسة.`,
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
  const { isEn, uiLanguage, ctx, currencyLabel, industryEn, countryEn, directive } =
    resolveMarketContext(payload);
  const studioName = String(payload?.studioName || (isEn ? 'Player Studio' : 'استوديو اللاعب'));
  const ceoName = String(payload?.ceoName || (isEn ? 'Executive Producer' : 'المنتج التنفيذي'));
  const currentYear = Number(payload?.currentYear || 2026);
  const gameDay = Number(payload?.gameDay || 20);
  const existingStudios = Array.isArray(payload?.existingStudios)
    ? (payload.existingStudios as string[]).join(', ')
    : '';
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const systemPrompt = `${directive}
Role: Media M&A and box-office business analyst for the ${industryEn}.
Context: Player studio "${studioName}" led by "${ceoName}" in ${currentYear} (Day #${gameDay}).
Existing Rival Studios: (${existingStudios}).
Recent Market Beat: ${memoryArr.slice(0, 4).join(' | ') || 'Fierce box-office competition'}.

Task: Invent ONE brand-new, heavily capitalized fictional production studio launching in ${countryEn} to challenge "${studioName}" (name must NOT duplicate any existing studio above).
Return JSON with keys:
- name: prestigious studio name
- ceo: fictional founder/CEO name
- specialty: concise editorial slate specialty (e.g., "High-budget thrillers & prestige streaming originals")
- estimated_net_worth: integer 180000000..460000000 (in ${currencyLabel})
- market_power: integer 66..83
- preferred_genres: array of 2 genres from ("Action", "Drama", "Thriller", "Comedy", "Horror", "Sci-Fi", "Romance", "Historical")
- headline: breaking business-desk headline announcing the new rival studio
- detail: 2 crisp sentences outlining the founder's strategy to rival "${studioName}" next season.`;

  const userPrompt = `Create a new rival production studio entering the market as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);

  const colors = ['#7C3AED', '#0284C7', '#E11D48', '#059669', '#D97706', '#4F46E5'];
  const seed = hashSeed(`${studioName}_${ceoName}_${gameDay}_${currentYear}_${Date.now()}`);

  if (groqRes && typeof groqRes.data.name === 'string' && typeof groqRes.data.ceo === 'string') {
    const netWorth = Math.min(
      520_000_000,
      Math.max(165_000_000, Number(groqRes.data.estimated_net_worth || 260_000_000))
    );
    const power = Math.min(85, Math.max(64, Number(groqRes.data.market_power || 73)));
    const genres =
      Array.isArray(groqRes.data.preferred_genres) && groqRes.data.preferred_genres.length > 0
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
          : isEn
          ? 'Theatrical Tentpoles & Streaming Originals'
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
          : isEn
          ? `Studio Shake-Up: "${newStudio.name}" Launches With ${(netWorth / 1_000_000).toFixed(0)}M ${currencyLabel} Backing!`
          : `بورصة الإنتاج: الإعلان رسمياً عن تأسيس «${newStudio.name}» بقيمة سوقية ${(netWorth / 1_000_000).toFixed(0)}M ${currencyLabel}!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : isEn
          ? `Mogul ${newStudio.ceo} unveiled "${newStudio.name}" (${newStudio.specialty}), immediately entering the studio leaderboard right alongside "${studioName}".`
          : `أعلن المنتج «${newStudio.ceo}» إطلاق شركة «${newStudio.name}» (${newStudio.specialty}) لتدخل سباق الترتيب العام مباشرة إلى جانب «${studioName}».`,
    });
  }

  const genStudioName = localizeEntityName(
    ctx.emergingStudioNames[seed % ctx.emergingStudioNames.length],
    uiLanguage
  );
  const genCeoName = localizeEntityName(
    ctx.emergingCeoNames[(seed >> 3) % ctx.emergingCeoNames.length],
    uiLanguage
  );
  const netWorth = (195 + (seed % 180)) * 1_000_000;

  const fallbackStudio = {
    id: `comp_ai_${Date.now()}_${gameDay}`,
    name: genStudioName,
    ceo: genCeoName,
    logo_url: '',
    market_power: 70 + (seed % 12),
    estimated_net_worth: netWorth,
    specialty: isEn
      ? 'High-Budget Theatrical Features & Streaming Series'
      : 'الإنتاجات السينمائية الضخمة ومسلسلات المنصات',
    preferred_genres: ['Action', 'Thriller'],
    rival_aggression: 75,
    color: colors[seed % colors.length],
  };

  return NextResponse.json({
    studio: fallbackStudio,
    headline: isEn
      ? `New Rival Enters the Arena: "${genStudioName}" Debuts Under ${genCeoName} at ${(netWorth / 1_000_000).toFixed(0)}M ${currencyLabel}!`
      : `منافس جديد في السوق: تدشين «${genStudioName}» بقيادة ${genCeoName} بقيمة ${(netWorth / 1_000_000).toFixed(0)}M ${currencyLabel}!`,
    detail: isEn
      ? `"${genStudioName}" formally entered the industry rankings with aggressive financing, vowing to court A-list talent and challenge "${studioName}" for box-office supremacy.`
      : `دخلت «${genStudioName}» رسمياً إلى جدول ترتيب شركات الإنتاج برأس مال ضخم، معلنة استهدافها استقطاب نجوم الصف الأول ومنافسة «${studioName}».`,
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
  const { isEn, uiLanguage, ctx, currencyLabel, industryEn, countryEn, directive } =
    resolveMarketContext(payload);
  const studioName = String(payload?.studioName || (isEn ? 'Player Studio' : 'استوديو اللاعب'));
  const ceoName = String(payload?.ceoName || (isEn ? 'Executive Producer' : 'المنتج التنفيذي'));
  const gameDay = Number(payload?.gameDay || 10);
  const currentYear = Number(payload?.currentYear || 2026);
  const marketValue = Number(payload?.marketValue || 55_000_000);
  const cash = Number(payload?.cash || 25_000_000);
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[])
    : [];

  const memoryContext =
    memoryArr.length > 0
      ? memoryArr.slice(0, 10).join('\n- ')
      : isEn
      ? `Founded "${studioName}" under CEO ${ceoName} at ${(marketValue / 1_000_000).toFixed(0)}M ${currencyLabel} valuation.`
      : `تأسيس شركة «${studioName}» بقيادة «${ceoName}» بقيمة سوقية ${(marketValue / 1_000_000).toFixed(0)}M ${currencyLabel}`;

  const rivalPool = ctx.fallbackRivalStudios;
  const chosenRival = localizeEntityName(
    rivalPool[(gameDay + currentYear) % rivalPool.length],
    uiLanguage
  );

  const systemPrompt = `${directive}
Role: Editor-in-Chief of the premier entertainment & media-finance trade publication in ${countryEn} (${industryEn}).
Full World Memory up to Day #${gameDay}, ${currentYear}:
- Player Studio: "${studioName}" | CEO: "${ceoName}"
- Current Valuation: ${(marketValue / 1_000_000).toFixed(1)}M ${currencyLabel} | Cash Reserve: ${(cash / 1_000_000).toFixed(1)}M ${currencyLabel}
- Recent Industry Log:
- ${memoryContext}

Task: Write ONE breaking entertainment-finance story tying directly into the memory log above with real economic impact (e.g., investor rally/dip for "${studioName}", a sponsorship cash injection, or a dramatic valuation swing for rival "${chosenRival}").
Return JSON with keys:
- headline: punchy breaking trade headline
- detail: 2 crisp journalistic sentences naming "${studioName}", "${ceoName}", or "${chosenRival}" and connecting to recent events
- badgeLabel: short desk tag (e.g., "BREAKING · STUDIO EXCHANGE" or "EXCLUSIVE REPORT")
- category: "ai_industry_report" or "rival_project"
- marketValueDelta: integer -18000000..26000000 (in ${currencyLabel})
- cashDelta: integer -5000000..12000000
- reputationDelta: integer -3..5
- hypeDelta: integer -4..8
- rivalStudioName: "${chosenRival}"
- rivalNetWorthDelta: integer -85000000..95000000`;

  const userPrompt = `Write a breaking industry-memory dispatch JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);

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
          : isEn
          ? 'BREAKING · STUDIO EXCHANGE'
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
      reputationDelta: Math.min(6, Math.max(-4, Number(groqRes.data.reputationDelta || 2))),
      hypeDelta: Math.min(10, Math.max(-5, Number(groqRes.data.hypeDelta || 4))),
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

  const latestMemory =
    memoryArr[0] ||
    (isEn
      ? `bold slate moves inside "${studioName}" led by ${ceoName}`
      : `تحركات إنتاجية جديدة داخل «${studioName}» بقيادة ${ceoName}`);
  const isRivalDrop = gameDay % 2 === 0;

  if (isEn) {
    if (isRivalDrop) {
      return NextResponse.json({
        headline: `Market Watch: "${studioName}" Shares Rally Under ${ceoName} as "${chosenRival}" Suffers Costly Setback!`,
        detail: `Following recent industry momentum (${latestMemory}), regional financiers raised their outlook on "${studioName}", while unexpected production overruns dented "${chosenRival}"'s valuation this month.`,
        badgeLabel: 'BREAKING · STUDIO EXCHANGE',
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
      headline: `Regional Distribution Deal Boosts "${studioName}" Amid Heated Race With "${chosenRival}"`,
      detail: `Building on (${latestMemory}), CEO ${ceoName} drew fresh interest from major regional networks, lifting studio valuation as the leaderboard race intensifies.`,
      badgeLabel: 'SPECIAL TRADE REPORT',
      category: 'ai_industry_report',
      marketValueDelta: 15_000_000,
      cashDelta: 3_500_000,
      reputationDelta: 2,
      hypeDelta: 4,
      rivalStudioName: chosenRival,
      rivalNetWorthDelta: 52_000_000,
    });
  }

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

function normalizeNameList(
  rawList: unknown,
  fallback: string[],
  uiLanguage: UiLanguageId
): string[] {
  const source =
    Array.isArray(rawList) && rawList.length > 0
      ? rawList
          .map((item) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object' && 'name' in item) {
              return String((item as { name?: unknown }).name || '').trim();
            }
            return '';
          })
          .filter(Boolean)
      : fallback;
  const finalArr = source.length > 0 ? source : fallback;
  return finalArr.map((n) => localizeEntityName(n, uiLanguage));
}

/**
 * World Simulation Mode: AI generates fierce competitor films & series
 */
async function handleGenerateAiRivalReleases(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { isEn, uiLanguage, ctx, currencyLabel, industryEn, directive } =
    resolveMarketContext(payload);
  const studioName = String(payload?.studioName || (isEn ? 'Player Studio' : 'استوديو اللاعب'));
  const ceoName = String(payload?.ceoName || (isEn ? 'Executive Producer' : 'المنتج التنفيذي'));
  const currentYear = Number(payload?.currentYear || 2026);
  const gameDay = Number(payload?.gameDay || 15);
  const format = String(payload?.format || (gameDay % 2 === 0 ? 'series' : 'film'));
  const isSeries = format === 'series';

  const studios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios,
    uiLanguage
  );
  const stars = normalizeNameList(
    payload?.availableStars,
    ctx.fallbackStars,
    uiLanguage
  );
  const memoryArr = Array.isArray(payload?.aiMemoryLog)
    ? (payload.aiMemoryLog as string[]).slice(0, 6)
    : [];

  const systemPrompt = `${directive}
Role: Box-office slate architect simulating rival studios in the ${industryEn}.
Context: Day #${gameDay} of ${currentYear}. Player studio: "${studioName}" (CEO: ${ceoName}).
Active Rival Studios: (${studios.slice(0, 8).join(', ')}).
Available Marquee Stars: (${stars.slice(0, 12).join(', ')}).
Recent Events: ${memoryArr.join(' | ') || 'High-stakes seasonal box-office battle'}.

Task: Create 2 formidable, high-budget rival ${
    isSeries ? 'prestige drama series' : 'theatrical tentpole films'
  } launching now to challenge "${studioName}" for seasonal dominance and year-end awards.
- Invent fresh, magnetic titles tailored to ${industryEn}
- Realistic blockbuster boxOfficeRevenue: 95000000..245000000 ${currencyLabel}
- Strong criticScore: 7.5..9.2

Return JSON with keys:
- headline: breaking box-office rivalry headline mentioning "${studioName}"
- detail: 2 sharp sentences highlighting these rival tentpoles and their stars
- rivals: array of 2 objects { studioName, title, genre, leadStarName, boxOfficeRevenue, criticScore }`;

  const userPrompt = `Generate 2 rival tentpole ${format} releases as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);

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
            typeof r.title === 'string' && r.title.trim() ? r.title.trim() : fb.title,
          genre:
            typeof r.genre === 'string' && r.genre.trim() ? r.genre.trim() : fb.genre,
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
          : isEn
          ? `Rivalry Ignites: "${rivals[0].studioName}" Drops "${rivals[0].title}" Starring ${rivals[0].leadStarName}!`
          : `اشتعال المنافسة: «${rivals[0].studioName}» تطرح «${rivals[0].title}» ببطولة ${rivals[0].leadStarName}!`,
      detail:
        typeof groqRes.data.detail === 'string'
          ? groqRes.data.detail
          : isEn
          ? `Competing studios rolled out heavy-hitting releases led by "${rivals[0].title}" (${rivals[0].criticScore}/10 critics) to challenge "${studioName}" for seasonal glory and year-end trophies.`
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
    headline: isEn
      ? `Fierce Box-Office Battle: "${enrichedFallback[0].studioName}" Launches "${enrichedFallback[0].title}" With ${enrichedFallback[0].leadStarName}!`
      : `منافسة شرسة في السوق: «${enrichedFallback[0].studioName}» تطلق «${enrichedFallback[0].title}» ببطولة ${enrichedFallback[0].leadStarName}!`,
    detail: isEn
      ? `"${enrichedFallback[0].studioName}" unveiled its tentpole "${enrichedFallback[0].title}" to strong critical buzz (${enrichedFallback[0].criticScore}/10), raising the bar for "${studioName}".`
      : `أعلنت «${enrichedFallback[0].studioName}» طرح عملها الضخم «${enrichedFallback[0].title}» وسط إشادات نقدية واسعة (${enrichedFallback[0].criticScore}/10)، مما يرفع سقف التحدي أمام «${studioName}».`,
  });
}

function buildGroundedRivalReleases(payload: Record<string, unknown>) {
  const { worldMarket, isEn, uiLanguage, profile, ctx } = resolveMarketContext(payload);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const studios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios,
    uiLanguage
  );
  const stars = normalizeNameList(
    payload?.availableStars,
    ctx.fallbackStars,
    uiLanguage
  );

  const sampleTitles = isEn
    ? isSeries
      ? FALLBACK_EN_RIVAL_SERIES[worldMarket] || FALLBACK_EN_RIVAL_SERIES.egypt
      : FALLBACK_EN_RIVAL_FILMS[worldMarket] || FALLBACK_EN_RIVAL_FILMS.egypt
    : isSeries
    ? profile.rivalSeriesTitles.length > 0
      ? profile.rivalSeriesTitles
      : ['العهد السري', 'الوريث الأخير', 'دائرة الشك', 'متاهة القصر']
    : profile.rivalFilmTitles.length > 0
    ? profile.rivalFilmTitles
    : ['الرصاصة الذهبية', 'خط النار', 'طريق الهروب', 'الصفقة الكبرى'];

  const seed = hashSeed(`${payload?.title || 'film'}_${studios[0] || ''}_${Date.now()}`);
  const count = 4;

  const archetypes = [
    {
      revRange: isSeries ? [95_000_000, 148_000_000] : [88_000_000, 145_000_000],
      criticRange: [5.5, 6.9],
      audienceRange: [7.6, 8.8],
      genre: isEn ? 'Action-Comedy Blockbuster' : 'أكشن كوميدي تجاري',
      trajectory: 'front_loaded' as const,
    },
    {
      revRange: isSeries ? [65_000_000, 112_000_000] : [58_000_000, 108_000_000],
      criticRange: [8.4, 9.3],
      audienceRange: [8.1, 9.2],
      genre: isEn ? 'Psychological Thriller' : 'دراما نفسية وتشويق',
      trajectory: 'sleeper' as const,
    },
    {
      revRange: isSeries ? [78_000_000, 128_000_000] : [70_000_000, 124_000_000],
      criticRange: [7.2, 8.3],
      audienceRange: [7.4, 8.5],
      genre: isEn ? 'Crime & Mystery' : 'جريمة وإثارة',
      trajectory: 'steady' as const,
    },
    {
      revRange: isSeries ? [34_000_000, 66_000_000] : [28_000_000, 58_000_000],
      criticRange: [4.5, 6.3],
      audienceRange: [4.9, 6.6],
      genre: isEn ? 'Social Drama' : 'دراما اجتماعية',
      trajectory: 'front_loaded' as const,
    },
  ];

  return studios.slice(0, count).map((studioName, idx) => {
    const arch = archetypes[(seed + idx) % archetypes.length];
    const title = sampleTitles[(seed + idx * 2) % sampleTitles.length];
    const leadStarName =
      stars[(seed + idx * 3) % Math.max(1, stars.length)] || (isEn ? 'Marquee Star' : 'نجم شباك');
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
  // Support BOTH Arabic & Latin/English scripts accurately!
  const uniqueWords = new Set(
    clean
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(Boolean)
  ).size;
  const titleRelevance = title.trim().length >= 3 ? 6 : 0;

  const lengthScore = words >= 32 ? 38 : words >= 20 ? 32 : words >= 12 ? 24 : words >= 7 ? 15 : 7;
  const structureScore = Math.min(28, sentences * 7);
  const richnessScore = Math.min(26, uniqueWords * 1.05);
  return Math.min(
    96,
    Math.max(26, Math.round(lengthScore + structureScore + richnessScore + titleRelevance))
  );
}

function buildGroundedReleaseEvaluation(payload: Record<string, unknown>) {
  const { worldMarket, isEn, uiLanguage, ctx, trendEn } = resolveMarketContext(payload);
  const title = String(payload?.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload?.synopsis || '');
  const directorName = localizeEntityName(
    String(payload?.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const leadName = localizeEntityName(
    String(payload?.leadName || (isEn ? 'Lead Star' : 'بطل العمل')),
    uiLanguage
  );
  const antagonistName = localizeEntityName(
    String(payload?.antagonistName || (isEn ? 'Antagonist' : 'الخصم الدرامي')),
    uiLanguage
  );
  const primaryGenre = String(payload?.primaryGenre || payload?.genre || (isEn ? 'Drama' : 'دراما'));
  const technicalQuality = Number(payload?.technicalQuality || 72);
  const commercialAppeal = Number(payload?.commercialAppeal || 72);
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';

  const { openingClause, conflictClause, endingClause } = extractSynopsisHighlights(
    synopsis,
    title,
    isEn
  );

  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  const blendedQuality = technicalQuality * 0.68 + silentScriptScore * 0.32;
  const criticScore = Number(Math.min(9.6, Math.max(2.6, blendedQuality / 10)).toFixed(1));

  const rawAudience =
    (commercialAppeal * 0.44 + technicalQuality * 0.36 + silentScriptScore * 0.2) / 10;
  const audienceScore = Number(Math.min(9.7, Math.max(2.9, rawAudience)).toFixed(1));

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
  const enCritics = FALLBACK_EN_CRITICS[worldMarket] || FALLBACK_EN_CRITICS.egypt;
  const criticA = isEn
    ? enCritics[0]
    : ctx.fallbackCritics[0] || { name: 'ناقد أول', publication: 'الشاشة الذهبية' };
  const criticB = isEn
    ? enCritics[1]
    : ctx.fallbackCritics[1] || { name: 'ناقد ثانٍ', publication: 'سينما إنسايدر' };
  const criticC = isEn
    ? enCritics[2]
    : {
        name: ctx.fallbackCritics[0]?.name ? `أ. ${ctx.fallbackCritics[0].name}` : 'ماجد الشريف',
        publication: 'بوابة الفن السابع',
      };

  const masterpieceQuotes = isEn
    ? [
        `An instant modern classic! From "${openingClause}" to the explosive payoff of "${conflictClause}", director ${directorName} operates at peak mastery while ${leadName} delivers a career-defining turn.`,
        `A rare triumph that raises the bar for the entire industry—tight writing, ${directorName}'s razor-sharp framing, and ${leadName}'s magnetism make "${title}" a frontrunner to sweep the year-end awards.`,
      ]
    : [
        `تحفة سينمائية متكاملة! معالجة «${title}» بداية من "${openingClause}" وحتى ذروة "${conflictClause}" تثبت نضج رؤية المخرج ${directorName}، وقدم ${leadName} واحداً من أعظم أدواره.`,
        `عمل استثنائي يرفع سقف الصناعة؛ التناغم بين السيناريو المحكم وإخراج ${directorName} وحضور ${leadName} يجعل «${title}» مرشحاً بقوة لاكتساح جوائز العام.`,
      ];

  const positiveQuotes = isEn
    ? [
        `Anchoring "${title}" around "${openingClause}" gave director ${directorName} a compelling runway, and ${leadName} brings real grit and conviction to every confrontation.`,
        `Credit to the makers of "${title}" for executing "${openingClause}" with taut pacing and handsome visuals—${leadName}'s screen command makes this a standout seasonal event.`,
      ]
    : [
        `معالجة فكرة "${openingClause}" في «${title}» منحت المخرج ${directorName} أرضية صلبة للبناء عليها، ونجح ${leadName} في تقديم أداء متماسك ومقنع طوال مشاهد المواجهة.`,
        `يحسب لصناع «${title}» تقديم خط "${openingClause}" بإيقاع مشدود وصورة بصرية متميزة، مع حضور لافت لـ ${leadName} جعل العمل يفرض نفسه بقوة هذا الموسم.`,
      ];

  const negativeQuotes = isEn
    ? [
        `Despite a promising hook in "${openingClause}", the central conflict around "${conflictClause}" loses steam, and ${antagonistName}'s character deserved far richer motivation.`,
        `"${title}" leans too heavily on ${leadName}'s star power to paper over uneven pacing and thin second-act turns around "${conflictClause}".`,
      ]
    : [
        `رغم جاذبية الفكرة في بداية "${openingClause}"، إلا أن تطور الصراع عند "${conflictClause}" عانى من ضعف البناء الدرامي، وكان يمكن رسم دوافع شخصية ${antagonistName} بعمق أكبر.`,
        `اعتمد «${title}» بشكل زائد على اسم ${leadName} لتغطية ثغرات واضحة في السيناريو والإخراج، خاصة في النصف الثاني عند "${conflictClause}".`,
      ];

  const mixedQuotes = isEn
    ? [
        `"${title}" walks a nimble line between crowd-pleasing (${primaryGenre}) thrills and craft; "${openingClause}" lands smoothly, though the finale around "${endingClause}" is bound to divide audiences.`,
        `${directorName} delivers polished visuals and an engaging turn from ${leadName}, even if a few dramatic leaps around "${conflictClause}" rush past too quickly.`,
      ]
    : [
        `«${title}» عمل يوازن بين الجاذبية الجماهيرية والصنعة الفنية في إطار (${primaryGenre})؛ البداية عند "${openingClause}" متقنة، وإن كانت النهاية عند "${endingClause}" ستقسم آراء المشاهدين.`,
        `قدم ${directorName} صورة بصرية جيدة وأداءً مقنعاً من ${leadName}، لكن بعض التحولات في "${conflictClause}" مرت بشكل أسرع مما ينبغي.`,
      ];

  const isMasterpiece = criticScore >= 8.3;
  const isWeak = criticScore < 5.8;

  const viral_trend_label = isEn
    ? isMasterpiece
      ? `#${title.replace(/\s+/g, '_')} Sweeps Critics & Audiences Across ${trendEn}!`
      : audienceScore >= 7.8 && criticScore < 7.0
      ? `#${title.replace(/\s+/g, '_')} Dominates Ticket Sales Despite Divided Critics!`
      : criticScore >= 6.8
      ? `#${title.replace(/\s+/g, '_')} Tops ${trendEn} With Strong Turnout`
      : `Sharp Backlash Over "${title}"'s Script Sparks Industry Debate`
    : isMasterpiece
    ? `#${title.replace(/\s+/g, '_')} إشادة نقدية وجماهيرية كاسحة في ${ctx.trendHashtagLabel}`
    : audienceScore >= 7.8 && criticScore < 7.0
    ? `#${title.replace(/\s+/g, '_')} يكتسح شباك التذاكر رغم انقسام النقاد!`
    : criticScore >= 6.8
    ? `#${title.replace(/\s+/g, '_')} يتصدر ${ctx.trendHashtagLabel} بإقبال قوي`
    : `انتقادات حادة لحبكة «${title}» ومطالبات بمراجعة الاختيارات القادمة`;

  return {
    critic_score: criticScore,
    audience_score: audienceScore,
    box_office_multiplier,
    viral_trend_label,
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
            quote: isEn
              ? `Even with minor pacing quibbles in the middle act, "${title}" stands tall as one of the year's defining releases.`
              : `رغم تحفظي البسيط على إيقاع بعض مشاهد المنتصف، إلا أن «${title}» يظل علامة فنية فارقة هذا العام.`,
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
    social_posts: isEn
      ? [
          {
            handle: ctx.socialHandles[0],
            platform: 'X',
            content:
              audienceScore >= 8.0
                ? isSeries
                  ? `"${title}" is all anyone is talking about tonight—"${openingClause}" and ${leadName} just stole the entire season! 🎬🔥`
                  : `Just walked out of "${title}"—the whole theater applauded at the credits! ${leadName} delivered a powerhouse turn! 🎬🔥`
                : audienceScore >= 6.4
                ? `"${title}" is a fun, crowd-pleasing watch overall—especially ${leadName}'s scenes—despite a slightly stretched middle act 🍿`
                : `Honestly, "${title}" fell short of the hype... promising premise, but the execution didn't quite land 😕`,
            likes: audienceScore >= 8.0 ? '54.2K' : audienceScore >= 6.5 ? '18.4K' : '6.1K',
          },
          {
            handle: ctx.socialHandles[1],
            platform: 'X',
            content: `The face-off between ${leadName} and ${antagonistName} over "${conflictClause}" is the clear highlight of "${title}" — solid ${criticScore}/10 from me.`,
            likes: '12.8K',
          },
          {
            handle: ctx.socialHandles[2],
            platform: 'TikTok',
            content:
              audienceScore >= 7.5
                ? `Everyone is breaking down the ending of "${title}" and that "${endingClause}" twist — dominating ${trendEn} right now! 🍿✨`
                : `Wildly split reactions after Day 1 of "${title}"... worth a weekend ticket or wait for streaming? 👀`,
            likes: audienceScore >= 7.5 ? '168K' : '44K',
          },
        ]
      : [
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

/**
 * Stage 5 (Golden Moment #2): Full Critical, Audience & Seasonal Rival Evaluation
 */
async function handleEvaluateRelease(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { isEn, uiLanguage, ctx, currencyLabel, industryEn, directive } =
    resolveMarketContext(payload);
  const title = String(payload?.title || (isEn ? 'Untitled Project' : 'العمل الفني الجديد'));
  const synopsis = String(payload?.synopsis || '');
  const directorName = localizeEntityName(
    String(payload?.directorName || (isEn ? 'the Director' : 'المخرج')),
    uiLanguage
  );
  const leadName = localizeEntityName(
    String(payload?.leadName || (isEn ? 'Lead Star' : 'البطل')),
    uiLanguage
  );
  const antagonistName = localizeEntityName(
    String(payload?.antagonistName || (isEn ? 'Antagonist' : 'الخصم الدرامي')),
    uiLanguage
  );
  const technicalQuality = Number(payload?.technicalQuality || 72);
  const commercialAppeal = Number(payload?.commercialAppeal || 72);
  const expectedCriticScore = Number(
    payload?.expectedCriticScore || (technicalQuality / 10).toFixed(1)
  );
  const expectedAudienceScore = Number(
    payload?.expectedAudienceScore ||
      ((technicalQuality * 0.5 + commercialAppeal * 0.5) / 10).toFixed(1)
  );
  const genre = String(payload?.genre || (isEn ? 'Drama' : 'دراما'));
  const format = String(payload?.format || 'film');
  const isSeries = format === 'series';
  const silentScriptScore = evaluateSilentScriptQuality(synopsis, title);
  const competitorStudios = normalizeNameList(
    payload?.competitorStudios,
    ctx.fallbackRivalStudios,
    uiLanguage
  ).join(', ');
  const availableStars = normalizeNameList(
    payload?.availableStars,
    ctx.fallbackStars,
    uiLanguage
  ).join(', ');

  const systemPrompt = `${directive}
Role: Panel of senior film/TV critics and ${
    isSeries ? 'streaming ratings' : 'box-office'
  } analysts in the ${industryEn}.
Evaluate this release with complete fairness and realism (reward true excellence; penalize weak craft):
- Title: "${title}" (${isSeries ? 'TV/Streaming Series' : 'Theatrical Film'} — Genre: ${genre})
- Synopsis: "${synopsis}"
- Director: ${directorName} | Lead: ${leadName} | Antagonist: ${antagonistName}
- Actual On-Set Technical Quality: ${technicalQuality}/100 (expected critic anchor ~${expectedCriticScore}/10)
- Commercial & Marketing Pull: ${commercialAppeal}/100 (expected audience anchor ~${expectedAudienceScore}/10)
- Script Depth Score: ${silentScriptScore}/100

Active Rival Studios This Season: (${competitorStudios}).
Available Marquee Stars for Rivals: (${availableStars}).

Strict Calibration Rules:
1. Honest Critic Score (critic_score on 2.5..9.6 scale):
   - Masterpiece tier (quality 82+ & rich script): award 8.3..9.5 with celebratory reviews.
   - Solid/mid tier: award 6.2..7.6.
   - Weak tier (quality <58 or thin script): award realistic 2.8..5.4.
2. Market Realism (Critics vs. Box Office split):
   - A glossy commercial action/comedy can score 5.8–6.9 with critics yet earn 8.2+ audience score and huge box office; an artful prestige drama can earn 9.1 critics with a slow-burning sleeper run.
3. Generate 4 varied, balanced rivals in rival_releases representing real seasonal competition:
   - Commercial crowd-pleaser (critics 5.6..6.9, revenue 85M..145M ${currencyLabel}, trajectory: "front_loaded")
   - Prestige sleeper gem (critics 8.4..9.3, revenue 60M..110M ${currencyLabel}, trajectory: "sleeper")
   - Balanced strong contender (critics 7.3..8.3, revenue 70M..125M ${currencyLabel}, trajectory: "steady")
   - Underperforming/mixed release (critics 4.6..6.3, revenue 28M..60M ${currencyLabel}, trajectory: "front_loaded")

Return JSON with keys:
- critic_score (float 2.5..9.6)
- audience_score (float 2.8..9.7)
- box_office_multiplier (float 0.52..1.34)
- viral_trend_label (catchy trending headline)
- reviews: array of 3 critics { criticName, publication, sentiment: "positive"|"mixed"|"negative", quote (referencing specific story elements), score (out of 10) }
- social_posts: array of 3 fan posts { handle, platform ("X"|"TikTok"), content, likes }
- rival_releases: array of 4 objects { studioName, title, genre, leadStarName, boxOfficeRevenue (28000000..155000000), criticScore (4.5..9.3), audienceScore (4.8..9.4), trajectory ("front_loaded"|"steady"|"sleeper"), status: "released" }`;

  const userPrompt = `Evaluate ${isSeries ? 'series' : 'film'} "${title}" objectively and generate 4 seasonal rivals as JSON now.`;

  const groqRes = await callGroqJson(systemPrompt, userPrompt, groqKeyOverride, preferredModel);
  if (
    groqRes &&
    typeof groqRes.data.critic_score === 'number' &&
    Array.isArray(groqRes.data.reviews) &&
    groqRes.data.reviews.length >= 2
  ) {
    const rawCriticNum = Number(groqRes.data.critic_score);
    const normalizedCritic = rawCriticNum > 10 ? rawCriticNum / 10 : rawCriticNum;
    const clampedCritic = Number(Math.min(9.6, Math.max(2.5, normalizedCritic)).toFixed(1));

    const rawAudienceNum = Number(groqRes.data.audience_score ?? expectedAudienceScore);
    const normalizedAudience = rawAudienceNum > 10 ? rawAudienceNum / 10 : rawAudienceNum;
    const clampedAudience = Number(Math.min(9.7, Math.max(2.8, normalizedAudience)).toFixed(1));

    const rawAiMult = Number(groqRes.data.box_office_multiplier || 1.0);
    const clampedMult = Number(Math.min(1.34, Math.max(0.52, rawAiMult)).toFixed(2));

    const fallbackRivals = buildGroundedRivalReleases(payload);
    const rivalReleases =
      Array.isArray(groqRes.data.rival_releases) && groqRes.data.rival_releases.length >= 2
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
              const rawRivalAud = Number(
                r.audienceScore || fb.audienceScore || normRivalCrit + 0.3
              );
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
                  typeof r.title === 'string' && r.title.trim() ? r.title.trim() : fb.title,
                genre:
                  typeof r.genre === 'string' && r.genre.trim() ? r.genre.trim() : fb.genre,
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
      source: isEn ? 'Critics Circle' : 'لجنة النقاد',
      ...groqRes.data,
      critic_score: clampedCritic,
      audience_score: clampedAudience,
      box_office_multiplier: clampedMult,
      rival_releases: rivalReleases,
    });
  }

  return NextResponse.json({
    source: isEn ? 'Critics Circle' : 'لجنة النقاد',
    ...buildGroundedReleaseEvaluation(payload),
  });
}

/**
 * AI-Powered Contextual PR & Media Response Handler
 */
async function handleGeneratePrMediaResponse(
  payload: Record<string, unknown>,
  groqKeyOverride?: string,
  preferredModel?: string
) {
  const { isEn, uiLanguage, profile, ctx, industryEn, trendEn, directive } =
    resolveMarketContext(payload);
  const studioName = String(
    payload?.studioName ||
      (isEn ? localizeEntityName(profile.defaultStudioName, 'en') : profile.defaultStudioName)
  );
  const ceoName = String(payload?.ceoName || (isEn ? 'the Producer' : 'المنتج'));
  const activeProjectTitle = String(
    payload?.activeProjectTitle || (isEn ? 'the New Release' : 'العمل الجديد')
  );
  const rivalStudioName = localizeEntityName(
    String(payload?.rivalStudioName || ctx.fallbackRivalStudios[0]),
    uiLanguage
  );
  const rivalFilmTitle = String(
    payload?.rivalFilmTitle || (isEn ? 'the Rival Release' : 'العمل المنافس')
  );
  const campaignId = String(payload?.campaignId || 'support_film_trolls');
  const situationHeadline = String(payload?.situationHeadline || '');
  const situationDetail = String(payload?.situationDetail || '');
  const customPlayerAngle = String(payload?.customPlayerAngle || '');
  const isAttack =
    campaignId === 'rival_rumor_trolls' || campaignId === 'rival_smear_campaign';

  const systemPrompt = `${directive}
Role: Social-media PR war-room & viral buzz strategist in the ${industryEn}.
Player Studio: "${studioName}" (CEO: ${ceoName}) | Current Release: "${activeProjectTitle}".
Target Rival Studio: "${rivalStudioName}" (Release: "${rivalFilmTitle}").
Campaign Type: "${campaignId}" (${
    isAttack
      ? 'aggressive counter-PR & rumor campaign to undercut the rival'
      : 'official press push & viral hype wave to propel the studio release to #1 trending'
  }).
${situationHeadline ? `Active Situation: "${situationHeadline} — ${situationDetail}"` : ''}
${customPlayerAngle ? `Executive Spin Direction: "${customPlayerAngle}"` : ''}

Deliverables:
1. Craft a razor-sharp officialStatement tailored to this exact moment.
2. Generate 3 lively, realistic X and TikTok posts reacting to the statement/rumor and naming the titles and studios.
3. Set realistic hypeDelta (8..22) and reputationDelta (-2..6).

Return JSON matching:
{
  "officialStatement": "crisp press statement or viral spin",
  "impactHeadline": "short immediate PR result summary",
  "hypeDelta": 14,
  "reputationDelta": 3,
  "posts": [
    {
      "platform": "X",
      "authorName": "Account Display Name",
      "handle": "${ctx.socialHandles[0]}",
      "content": "Post text",
      "hashtag": "#RelevantTag",
      "likes": "64.2K",
      "shares": "19.1K"
    },
    {
      "platform": "TikTok",
      "authorName": "Creator Display Name",
      "handle": "${ctx.socialHandles[2]}",
      "content": "Trending video caption",
      "hashtag": "#TikTokTag",
      "likes": "182K",
      "shares": "41.5K"
    }
  ]
}`;

  const userPrompt = `Generate the interactive PR statement and X/TikTok reaction posts as JSON now.`;
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
        authorName: String(p.authorName || (isEn ? 'Film Insider' : 'ناقد سينمائي')),
        handle: String(p.handle || ctx.socialHandles[idx % ctx.socialHandles.length]),
        content: String(p.content || ''),
        hashtag: String(p.hashtag || `#${activeProjectTitle.replace(/\s+/g, '_')}`),
        likes: String(p.likes || '52.4K'),
        shares: String(p.shares || '14.8K'),
        sentiment: isAttack ? ('rival_attack' as const) : ('viral_boost' as const),
        timestampLabel: isEn ? 'Just now · Live PR Push' : 'الآن · رد إعلامي مباشر',
      }));

    return NextResponse.json({
      ok: true,
      modelUsed: groqRes.modelUsed,
      officialStatement: String(
        groqRes.data.officialStatement ||
          (isEn
            ? `Breaking statement from "${studioName}" flips social buzz squarely behind "${activeProjectTitle}"!`
            : `بيان عاجل من «${studioName}» يقلب موازين التريند لصالح «${activeProjectTitle}»!`)
      ),
      impactHeadline: String(
        groqRes.data.impactHeadline ||
          (isEn
            ? 'Massive viral surge across X & TikTok'
            : 'تفاعل جماهيري واسع على منصتي X وTikTok')
      ),
      hypeDelta: Math.min(24, Math.max(6, Number(groqRes.data.hypeDelta || 14))),
      reputationDelta: Math.min(8, Math.max(-3, Number(groqRes.data.reputationDelta || 3))),
      posts: cleanPosts,
    });
  }

  return NextResponse.json({
    ok: false,
    officialStatement: isEn
      ? isAttack
        ? `Exclusive leaks point to backstage jitters inside "${rivalStudioName}" as advance bookings for "${rivalFilmTitle}" slip behind "${activeProjectTitle}"!`
        : `"${studioName}"'s press office unleashed a viral campaign for "${activeProjectTitle}", shooting straight to #1 on ${trendEn}!`
      : isAttack
      ? `تسريبات حصرية تكشف ارتباكاً داخل «${rivalStudioName}» وتراجع الحجوزات لـ «${rivalFilmTitle}» أمام زخم «${activeProjectTitle}»!`
      : `المكتب الإعلامي لـ «${studioName}» يطلق حملة تفاعلية موسعة لـ «${activeProjectTitle}» تتصدر ${ctx.trendHashtagLabel}!`,
    hypeDelta: 12,
    reputationDelta: 2,
    posts: [],
  });
}
