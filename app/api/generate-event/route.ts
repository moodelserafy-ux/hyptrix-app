import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_DATABASE } from "@/lib/database";
import { localEvaluation } from "@/lib/simulation";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const requestSchema = z.object({
  type: z.enum(["evaluate", "crisis", "negotiation", "daily_news"]),
  candidate: z.record(z.string(), z.unknown()).optional(),
  project: z.record(z.string(), z.unknown()),
  worldHistory: z.array(z.object({ year: z.number(), text: z.string(), kind: z.string() })).max(60).default([]),
  context: z.string().max(12000).optional().default(""),
  talentContext: z.string().max(12000).optional().default(""),
});

const evaluationSchema = z.object({
  critics_score: z.number().min(0).max(10), audience_score: z.number().min(0).max(10),
  box_office_multiplier: z.number().min(0.2).max(3.5), reviews: z.array(z.string().min(20).max(700)).length(3),
  headlines: z.array(z.string()).min(1).max(5), social_posts: z.array(z.string()).min(1).max(5),
  summary: z.string(), award_nominations: z.array(z.string()).max(8),
});
const crisisSchema = z.object({ title: z.string(), description: z.string(), choices: z.array(z.object({ label: z.string(), cash: z.number(), hype: z.number(), quality: z.number() })).length(3) });
const newsSchema = z.object({ headline: z.string().min(8).max(180), story: z.string().min(20).max(700), kind: z.enum(["business", "crisis", "release"]) });

async function callGroq(prompt: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", temperature: 0.62, max_tokens: 2400,
      response_format: { type: "json_object" }, messages: [
        { role: "system", content: "You are the simulation engine of a fictional Arabic film-industry tycoon. Return only valid JSON. Do not invent external factual claims or entities. You may reference only names already present in supplied project data, including imported cast and crew. Write fluent Egyptian Arabic." },
        { role: "user", content: prompt },
      ] }), signal: AbortSignal.timeout(28000),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
}

async function generateWithGroq(prompt: string) {
  try { return { data: await callGroq(prompt), provider: "groq" as const, reason: "" }; }
  catch (error) {
    return { data: null, provider: "local" as const, reason: error instanceof Error ? error.message : "Groq unavailable" };
  }
}

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  if (!key) {
    return NextResponse.json({ active: false, model, message: "GROQ_API_KEY مش متضاف في Environment Variables على Vercel." }, { status: 200 });
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return NextResponse.json({ active: false, model, message: `Groq رفض المفتاح أو الطلب (HTTP ${response.status}). راجع صلاحية GROQ_API_KEY.` }, { status: 200 });
    }
    const payload = await response.json();
    const available = Array.isArray(payload.data) && payload.data.some((entry: { id?: string }) => entry.id === model);
    return NextResponse.json({ active: available, model, message: available ? "Groq متصل والموديل المختار متاح." : "المفتاح صحيح، لكن الموديل المحدد غير ظاهر ضمن الموديلات المتاحة لهذا الحساب." }, { status: 200 });
  } catch {
    return NextResponse.json({ active: false, model, message: "مفتاح Groq موجود لكن تعذر الوصول إلى Groq API حاليًا." }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const project = body.project as unknown as Project;
    const memory = body.worldHistory.slice(0, 35).map((entry) => `[${entry.year}] ${entry.text}`).join("\n") || "لا يوجد تاريخ سابق بعد.";
    const base = `سياق العالم التراكمي:\n${memory}\n\nبيانات المشروع (JSON):\n${JSON.stringify(project)}\n\nأسماء ومعلومات الطاقم الفعلية:\n${body.talentContext || "استخدم أسماء العقود وبيانات المشروع كما هي."}\n\nنص إضافي من اللاعب:\n${body.context}`;
    if (body.type === "negotiation") {
      const candidate = body.candidate ?? {};
      const stats = (candidate.stats as Record<string, unknown> | undefined) ?? {};
      const overall = Number(stats.overall ?? 65);
      const ego = Number(candidate.ego ?? stats.ego ?? 50);
      const offeredSalary = Number(candidate.negotiatedSalary ?? 0);
      const baseSalary = Math.max(1, Number(candidate.baseSalary ?? 1));
      const ratio = offeredSalary / baseSalary;
      const genreMastery = (candidate.genre_mastery as Record<string, unknown> | undefined) ?? {};
      const projectGenre = String(project.primaryGenre ?? "");
      const genreFit = Number(genreMastery[projectGenre] ?? (Array.isArray(candidate.best_genres) && candidate.best_genres.includes(projectGenre) ? 78 : 50));
      const studioRep = Number(candidate.studioReputation ?? (project as unknown as { studioReputation?: number }).studioReputation ?? 12);
      const role = String(candidate.role ?? "عضو الطاقم");
      const isLead = role === "lead_candidate" || role === "lead";
      const isCrew = ["director", "screenwriter", "cinematographer", "composer", "editor_vfx"].includes(role);
      const baseChance = isLead ? 0.37 : isCrew ? 0.54 : 0.46;
      const rawChance = baseChance + (ratio - 1) * 0.68 + (overall - 70) * 0.0045 + (genreFit - 50) * 0.0028 - (ego - 50) * 0.0038 + (studioRep - 12) * 0.0018;
      const acceptanceChance = Math.max(0.08, Math.min(0.92, rawChance));
      const accepted = Math.random() < acceptanceChance;
      const memberName = String(candidate.memberName ?? "عضو الطاقم");
      const reasonContext = `الاسم: ${memberName}. الدور: ${role}. الأجر المعروض ${offeredSalary} مقابل أجر أساسي ${baseSalary} (نسبة العرض ${ratio.toFixed(2)}). مستوى الموهبة ${overall}/100، الغرور ${ego}/100، توافق النوع ${genreFit}/100، سمعة الاستوديو ${studioRep}/100.`;
      const prompt = `${base}\n\nأنت وكيل أعمال داخل محاكاة صناعة سينما مصرية واقعية. اكتب سبب رد قصير ومحدد باللهجة المصرية البيضاء، من جملتين إلى 3 جمل، ولا تستخدم قوالب عامة ولا تذكر أن هذا نظام لعبة. بيانات المرشح: ${reasonContext}\nالقرار الفعلي الذي حسمته المحاكاة هو: ${accepted ? "accepted (موافقة)" : "rejected (رفض)"}. اجعل السبب متسقًا تمامًا مع القرار، واربطه بعامل أو عاملين حقيقيين من الأجر أو حجم الدور أو التوافق الفني أو سمعة الاستوديو. لا تغيّر القرار ولا تذكر نسبة الاحتمال. لا تخترع مواعيد أو ارتباطات غير موجودة. أجب JSON فقط بحقل reason.`;
      const result = await generateWithGroq(prompt);
      const reasonText = typeof result.data?.reason === "string" ? result.data.reason.trim() : "";
      const localReason = accepted
        ? ratio >= 1 && genreFit >= 60
          ? `${memberName} وافق لأن المقابل مناسب والنوع قريب من اختياراته. الوكيل طلب تثبيت جدول التصوير وبنود المستحقات في العقد.`
          : `${memberName} وافق بعد مراجعة مساحة الدور وظروف المشروع، رغم إن العرض مش الأعلى في السوق. الموافقة مشروطة بالالتزام ببنود التنفيذ المتفق عليها.`
        : ratio < 0.9
          ? `${memberName} رفض لأن الأجر المعروض أقل من الحد اللي شايفه مناسب للدور. ممكن تعيد التفاوض برقم أعلى أو تقلل متطلبات الدور.`
          : ego > 78
            ? `${memberName} اعتذر لأن مساحة الدور وترتيبه مش على قد توقعاته الحالية. محتاج عرض يوضح مكانته بشكل أفضل.`
            : genreFit < 42
              ? `${memberName} مش متحمس للنوع ده من الأعمال في المرحلة الحالية، ووكيله شايف إن الاختيار مش مناسب لمساره الفني.`
              : `${memberName} اعتذر عن العرض بعد مراجعة شروط المشروع. المقابل أو ظروف الدور مش مقنعة كفاية بالنسبة له في الوقت الحالي.`;
      return NextResponse.json({ data: { decision: accepted ? "accepted" : "rejected", reason: reasonText.length >= 12 ? reasonText : localReason }, provider: result.provider, fallback: result.provider !== "groq", acceptanceChance: Number(acceptanceChance.toFixed(2)), notice: result.reason || undefined });
    }
    if (body.type === "daily_news") {
      const prompt = `${base}\n\nاكتب خبرًا واحدًا جديدًا وغير مكرر يناسب اليوم الحالي في عالم اللعبة. استند إلى أحداث المشروع وحالته وأرقامه فقط. لا تختلق أسماء كيانات جديدة. JSON فقط: headline عنوان صحفي، story خبر من 2-4 جمل فيه تفاصيل ملموسة، kind واحدة من business أو crisis أو release.`;
      const result = await generateWithGroq(prompt);
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
      const prompt = `${base}\n\nأنت لجنة نقدية مستقلة داخل عالم محاكاة. لا تكافئ الإنفاق أو شهرة الممثل تلقائيًا. ابدأ من حكم متحفظ: أغلب الأعمال العادية تقع بين 5.0 و7.2، العمل الجيد جدًا قد يصل 7.5-8.4، و9+ نادر للغاية ويحتاج أدلة واضحة في الحبكة والتنفيذ. استخرج نقاط القوة والضعف من ملخص السيناريو نفسه: دوافع الشخصيات، الصراع، التحول، منطق النهاية، الأصالة، الإيقاع. لو المعلومات غير كافية لا تفترض جودة غير مذكورة.\nأرسل JSON بالحقول التالية فقط: critics_score رقم 2.0-9.2، audience_score رقم 2.0-9.3، box_office_multiplier رقم 0.42-2.0، reviews مصفوفة 3 مراجعات، كل واحدة 2-4 جمل وبصوت نقدي مختلف: ناقد سيناريو (حبكة وشخصيات وإيقاع)، صحفي جمهور (الأداء والتفاعل والمتعة)، ناقد فني (إخراج وتصوير وموسيقى ومونتاج). لازم تختلف الأحكام فعلًا، وقد يختلف النقاد على نفس العنصر. اذكر تفاصيل حرفية من القصة وأسماء الطاقم من قائمة المعلومات الفعلية فقط. لا تقل إنك شاهدت الفيلم؛ أنت تقيّم ملف المشروع قبل العرض. headlines عنوانان صحفيان غير دعائيين، social_posts منشوران بآراء متباينة، summary خلاصة صريحة، award_nominations ترشيحات لا تمنح ترشيحات إلا للأعمال التي تستحق. ضاعف احتمالات التقييم المتوسط والمنخفض مقارنة بالتقييم الممتاز. لا تخترع أسماء أشخاص أو شركات أو أحداثًا خارج البيانات.`;
      const result = await generateWithGroq(prompt);
      if (!result.data) {
        const fallback = localEvaluation(project, DEFAULT_DATABASE.actors, DEFAULT_DATABASE.crew);
        return NextResponse.json({ data: evaluationSchema.parse(fallback), provider: "local", fallback: true, notice: "لم تتوفر مفاتيح AI أو تعذر الاتصال؛ تم استخدام المحرك المحلي." });
      }
      const parsed = evaluationSchema.safeParse(result.data);
      if (!parsed.success) throw new Error("AI response failed the evaluation JSON schema");
      const calibrated = { ...parsed.data, critics_score: Math.max(2, Math.min(9.2, parsed.data.critics_score)), audience_score: Math.max(2, Math.min(9.3, parsed.data.audience_score)), box_office_multiplier: Math.max(.42, Math.min(2, parsed.data.box_office_multiplier)) };
      return NextResponse.json({ data: calibrated, provider: result.provider, fallback: false });
    }
    const prompt = `${base}\n\nاكتب أزمة تصوير تفاعلية واحدة مناسبة لهذا المشروع. أعد JSON فقط بالحقول title وdescription وchoices، وتحتوي choices على 3 خيارات ولكل خيار label وcash وhype وquality كأرقام صحيحة. اجعل القرارات لها مفاضلات حقيقية ولا تخترع أسماء خارج بيانات المشروع.`;
    const result = await generateWithGroq(prompt);
    if (!result.data) {
      const fallback = { title: "تأخير مفاجئ في موقع التصوير", description: `مشكلة تشغيلية أثرت على تصوير «${project.title}». الفريق محتاج قرار سريع لتقليل الخسائر ومنع تضخم الجدول.`, choices: [{ label: "استئجار موقع بديل", cash: -650000, hype: 0, quality: 4 }, { label: "تعديل جدول التصوير", cash: -250000, hype: -1, quality: 1 }, { label: "إيقاف اليوم وخفض النفقات", cash: -80000, hype: -3, quality: -2 }] };
      return NextResponse.json({ data: fallback, provider: "local", fallback: true, notice: result.reason });
    }
    const parsed = crisisSchema.safeParse(result.data);
    if (!parsed.success) throw new Error("AI response failed the crisis JSON schema");
    const budget = Object.values(project.budget ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
    const salaries = (project.contracts ?? []).reduce((sum, contract) => sum + Number(contract.negotiatedSalary ?? 0), 0);
    const cashLimit = Math.max(250_000, Math.min(35_000_000, (budget + salaries) * 0.15));
    const safeChoices = parsed.data.choices.map((choice) => ({
      label: choice.label.trim().slice(0, 100) || "قرار إداري",
      cash: Math.round(Math.max(-cashLimit, Math.min(cashLimit, Number.isFinite(choice.cash) ? choice.cash : 0))),
      hype: Math.round(Math.max(-12, Math.min(12, Number.isFinite(choice.hype) ? choice.hype : 0))),
      quality: Math.round(Math.max(-10, Math.min(10, Number.isFinite(choice.quality) ? choice.quality : 0))),
    }));
    return NextResponse.json({ data: { ...parsed.data, title: parsed.data.title.trim().slice(0, 120), description: parsed.data.description.trim().slice(0, 700), choices: safeChoices }, provider: result.provider, fallback: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
