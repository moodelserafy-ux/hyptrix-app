import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_DATABASE } from "@/lib/database";
import { localEvaluation } from "@/lib/simulation";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
const requestSchema = z.object({
  type: z.enum(["evaluate", "crisis"]),
  project: z.record(z.string(), z.unknown()),
  worldHistory: z.array(z.object({ year: z.number(), text: z.string(), kind: z.string() })).max(60).default([]),
  context: z.string().max(12000).optional().default(""),
});

const evaluationSchema = z.object({
  critics_score: z.number().min(0).max(10), audience_score: z.number().min(0).max(10),
  box_office_multiplier: z.number().min(0.2).max(3.5), reviews: z.array(z.string()).min(2).max(5),
  headlines: z.array(z.string()).min(1).max(5), social_posts: z.array(z.string()).min(1).max(5),
  summary: z.string(), award_nominations: z.array(z.string()).max(8),
});
const crisisSchema = z.object({ title: z.string(), description: z.string(), choices: z.array(z.object({ label: z.string(), cash: z.number(), hype: z.number(), quality: z.number() })).length(3) });

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
    if (body.type === "evaluate") {
      const prompt = `${base}\n\nقيّم العمل كما لو أنك لجنة نقاد وجمهور في سوق ترفيهي خيالي. أرسل JSON بالحقول التالية فقط: critics_score رقم 0-10، audience_score رقم 0-10، box_office_multiplier رقم 0.2-3.5، reviews مصفوفة 3 مراجعات نقدية قصيرة تذكر عناصر ملموسة من القصة والطاقم، headlines مصفوفة 2 مانشيت، social_posts مصفوفة 2 منشور، summary فقرة، award_nominations مصفوفة ترشيحات. اجعل الإيرادات منطقية قياساً بالجودة والميزانية والتسويق. لا تخترع أسماء أشخاص أو شركات غير موجودة في بيانات العمل.`;
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
