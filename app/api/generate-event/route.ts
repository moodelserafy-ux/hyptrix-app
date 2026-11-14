import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_DATABASE } from "@/lib/database";
import { localEvaluation } from "@/lib/simulation";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
const requestSchema = z.object({
  type: z.enum(["evaluate", "crisis", "negotiation", "daily_news"]),
  candidate: z.record(z.string(), z.unknown()).optional(),
  project: z.record(z.string(), z.unknown()),
  worldHistory: z.array(z.object({ year: z.number(), text: z.string(), kind: z.string() })).max(60).default([]),
  context: z.string().max(12000).optional().default(""),
});

const evaluationSchema = z.object({
  critics_score: z.number().min(0).max(10), audience_score: z.number().min(0).max(10),
  box_office_multiplier: z.number().min(0.2).max(3.5), reviews: z.array(z.string().min(20).max(700)).length(3),
  headlines: z.array(z.string()).min(1).max(5), social_posts: z.array(z.string()).min(1).max(5),
  summary: z.string(), award_nominations: z.array(z.string()).max(8),
});
const crisisSchema = z.object({ title: z.string(), description: z.string(), choices: z.array(z.object({ label: z.string(), cash: z.number(), hype: z.number(), quality: z.number() })).length(3) });
const negotiationSchema = z.object({ decision: z.enum(["accepted", "rejected"]), reason: z.string().min(12).max(500) });
const newsSchema = z.object({ headline: z.string().min(8).max(180), story: z.string().min(20).max(700), kind: z.enum(["business", "crisis", "release"]) });

async function callGroq(prompt: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", temperature: 0.78, max_tokens: 1800,
      response_format: { type: "json_object" }, messages: [
        { role: "system", content: "You are the simulation engine of a fictional Arabic film-industry tycoon. Return only valid JSON. Do not invent external factual claims or entities. You may reference only names already present in supplied project data, including imported cast and crew. Write fluent Egyptian Arabic." },
        { role: "user", content: prompt },
      ] }), signal: AbortSignal.timeout(28000),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
}

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.78, maxOutputTokens: 1800 } }),
    signal: AbortSignal.timeout(28000),
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const payload = await response.json();
  const content = payload.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "{}";
  return JSON.parse(content);
}

async function generateWithFallback(prompt: string) {
  try { return { data: await callGroq(prompt), provider: "groq" as const }; }
  catch (groqError) {
    try { return { data: await callGemini(prompt), provider: "gemini" as const }; }
    catch (geminiError) {
      return { data: null, provider: "local" as const, reason: `${groqError instanceof Error ? groqError.message : "Groq unavailable"}; ${geminiError instanceof Error ? geminiError.message : "Gemini unavailable"}` };
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const project = body.project as unknown as Project;
    const memory = body.worldHistory.slice(0, 35).map((entry) => `[${entry.year}] ${entry.text}`).join("\n") || "لا يوجد تاريخ سابق بعد.";
    const base = `سياق العالم التراكمي:\n${memory}\n\nبيانات المشروع (JSON):\n${JSON.stringify(project)}\n\nنص إضافي من اللاعب:\n${body.context}`;
    if (body.type === "negotiation") {
      const candidate = body.candidate ?? {};
      const prompt = `${base}\n\nأنت وكيل أعمال محترف. قيّم العرض المقدم إلى ${String(candidate.memberName ?? "عضو الطاقم")} لدور ${String(candidate.role ?? "")}. الراتب المعروض ${String(candidate.negotiatedSalary ?? "غير محدد")} مقابل الأجر الأساسي ${String(candidate.baseSalary ?? "غير محدد")}. ضع في الاعتبار مستوى النجم والغرور والتوافق مع النوع وسمعة الاستوديو وملخص القصة. أجب بقرار واقعي غير مضمون القبول؛ الرفض يجب أن يكون له سبب محدد وقابل للتفاوض، والقبول يذكر ما أقنعه. JSON فقط: decision accepted أو rejected، وreason باللهجة المصرية، لا تقل عن 12 حرفًا.`;
      const result = await generateWithFallback(prompt);
      const overall = Number((candidate.stats as Record<string, unknown> | undefined)?.overall ?? 70);
      const ego = Number(candidate.ego ?? 50);
      const offeredSalary = Number(candidate.negotiatedSalary ?? 0);
      const baseSalary = Number(candidate.baseSalary ?? 0);
      const compensationRatio = baseSalary > 0 && offeredSalary > 0 ? offeredSalary / baseSalary : 1;
      const acceptanceChance = Math.max(.18, Math.min(.9, .58 + (overall - 75) / 180 - Math.max(0, ego - 85) / 150 + (compensationRatio - 1) * .3));
      const accepted = Math.random() < acceptanceChance;
      const memberName = String(candidate.memberName ?? "عضو الطاقم");
      const role = String(candidate.role ?? "الدور المعروض");
      const localDecision = {
        decision: accepted ? "accepted" as const : "rejected" as const,
        reason: accepted
          ? `${memberName} شايف إن ${role} مناسب لخبرته وإن المقابل المعروض مقبول مبدئيًا، فوافق على الدخول في المشروع.`
          : `${memberName} مهتم بالفكرة، لكنه شايف إن ${role} محتاج تفاصيل أو مقابل مالي أفضل قبل ما يلتزم بالتصوير.`,
      };
      if (!result.data) return NextResponse.json({ data: localDecision, provider: "local", fallback: true });
      const parsed = negotiationSchema.safeParse(result.data);
      if (!parsed.success) return NextResponse.json({ data: localDecision, provider: "local", fallback: true, notice: "تم استخدام قرار محلي لأن رد مزود AI لم يطابق التنسيق المطلوب." });
      return NextResponse.json({ data: parsed.data, provider: result.provider, fallback: false });
    }
    if (body.type === "daily_news") {
      const prompt = `${base}\n\nاكتب خبرًا واحدًا جديدًا وغير مكرر يناسب اليوم الحالي في عالم اللعبة. استند إلى أحداث المشروع وحالته وأرقامه فقط. لا تختلق أسماء كيانات جديدة. JSON فقط: headline عنوان صحفي، story خبر من 2-4 جمل فيه تفاصيل ملموسة، kind واحدة من business أو crisis أو release.`;
      const result = await generateWithFallback(prompt);
      const dayNumber = Number(body.context.match(/اليوم\s+(\d+)/)?.[1] ?? 0);
      const newsAngles = ["سباق جديد على مواعيد العرض", "تحركات لافتة في سوق الإنتاج", "مفاوضات تغيّر خريطة الموسم", "ضغوط متزايدة على ميزانيات الأعمال", "منصات تراقب عناوين الموسم"];
      const localNews = {
        headline: `${newsAngles[dayNumber % newsAngles.length]} · اليوم ${dayNumber}`,
        story: `تتابع الأوساط الفنية تطورات ${project.title} بالتزامن مع تغيرات جدول العمل ومؤشرات السوق، وسط ترقب لخطوات الاستوديوهات والمنصات خلال الأيام المقبلة.`,
        kind: "business" as const,
      };
      if (!result.data) return NextResponse.json({ data: localNews, provider: "local", fallback: true });
      const parsed = newsSchema.safeParse(result.data);
      if (!parsed.success) return NextResponse.json({ data: localNews, provider: "local", fallback: true, notice: "تم استخدام خبر محلي لأن رد مزود AI لم يطابق التنسيق المطلوب." });
      return NextResponse.json({ data: parsed.data, provider: result.provider, fallback: false });
    }
    if (body.type === "evaluate") {
      const prompt = `${base}\n\nقيّم العمل كما لو أنك لجنة مستقلة تضم ثلاثة أصوات نقدية مختلفة فعلًا في سوق ترفيهي خيالي. أرسل JSON بالحقول التالية فقط: critics_score رقم 0-10، audience_score رقم 0-10، box_office_multiplier رقم 0.2-3.5، reviews مصفوفة من 3 مراجعات (كل مراجعة 2-4 جمل، مختلفة في اللغة والزوايا والاستنتاج). المراجع الأول ناقد سيناريو يهتم ببناء الحبكة والشخصيات والإيقاع؛ الثاني صحفي جماهيري يركز على التمثيل والتفاعل والمتعة؛ الثالث ناقد فني يراجع الإخراج والتصوير والموسيقى والمونتاج. لا تجعل الأصوات الثلاثة تتفق تلقائيًا، ومن الطبيعي أن يعجب أحدهم بعنصر وينتقده الآخر. تجنب الجمل الجاهزة والتكرار بين المراجعات أو مع الأخبار السابقة، واستشهد بتفاصيل محددة من ملخص القصة وأسماء الطاقم المتاحة فقط. headlines مصفوفة 2 مانشيت، social_posts مصفوفة 2 منشور، summary فقرة، award_nominations مصفوفة ترشيحات. اجعل الإيرادات منطقية قياساً بالجودة والميزانية والتسويق. لا تخترع أسماء أشخاص أو شركات غير موجودة في بيانات العمل.`;
      const result = await generateWithFallback(prompt);
      if (!result.data) {
        const fallback = localEvaluation(project, DEFAULT_DATABASE.actors, DEFAULT_DATABASE.crew);
        return NextResponse.json({ data: evaluationSchema.parse(fallback), provider: "local", fallback: true, notice: "لم تتوفر مفاتيح AI أو تعذر الاتصال؛ تم استخدام المحرك المحلي." });
      }
      const parsed = evaluationSchema.safeParse(result.data);
      if (!parsed.success) throw new Error("AI response failed the evaluation JSON schema");
      return NextResponse.json({ data: parsed.data, provider: result.provider, fallback: false });
    }
    const prompt = `${base}\n\nاكتب أزمة تصوير تفاعلية واحدة مناسبة لهذا المشروع. أعد JSON فقط بالحقول title وdescription وchoices، وتحتوي choices على 3 خيارات ولكل خيار label وcash وhype وquality كأرقام صحيحة. اجعل القرارات لها مفاضلات حقيقية ولا تخترع أسماء خارج بيانات المشروع.`;
    const result = await generateWithFallback(prompt);
    if (!result.data) return NextResponse.json({ error: "AI providers unavailable", provider: "local" }, { status: 503 });
    const parsed = crisisSchema.safeParse(result.data);
    if (!parsed.success) throw new Error("AI response failed the crisis JSON schema");
    return NextResponse.json({ data: parsed.data, provider: result.provider, fallback: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
