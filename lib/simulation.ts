import type { Actor, CrewMember, EvaluationResult, Genre, Project, Studio, Crisis } from "@/lib/types";

const genrePairs = new Set([
  "crime_mystery|psychological_horror", "action|popular_drama", "historical|biography",
  "crime_mystery|heist", "romance|popular_drama", "sci_fi|superhero",
  "fantasy|supernatural_horror", "action|heist", "dark_comedy|crime_mystery",
]);
const keyPair = (a: Genre, b: Genre) => [a, b].sort().join("|");
export function getGenreSynergy(a: Genre, b: Genre) {
  if (a === b) return { score: 4, label: "هوية مركزة", tone: "gold" as const };
  if (genrePairs.has(keyPair(a, b))) return { score: 12, label: "تناغم قوي", tone: "green" as const };
  return { score: -7, label: "خلطة جريئة", tone: "red" as const };
}

export function calculateCrewScore(project: Project, crew: CrewMember[]) {
  const ids = [project.crew.director, ...project.crew.writers, project.crew.cinematographer, project.crew.composer, project.crew.editor_vfx].filter(Boolean);
  const selected = crew.filter((member) => ids.includes(member.id));
  if (!selected.length) return 30;
  const avg = selected.reduce((sum, member) => sum + (member.stats.overall ?? 60), 0) / selected.length;
  const matched = selected.reduce((sum, member) => sum + (member.best_genres.includes(project.primaryGenre) ? 4 : 0), 0);
  return Math.min(100, avg + matched / Math.max(1, selected.length));
}

export function calculateCastScore(project: Project, actors: Actor[]) {
  const ids = [...project.cast.leads, project.cast.antagonist, ...project.cast.supporting, ...project.cast.cameos].filter(Boolean);
  const selected = actors.filter((actor) => ids.includes(actor.id));
  if (!selected.length) return 30;
  const core = actors.filter((actor) => [...project.cast.leads, project.cast.antagonist].includes(actor.id));
  const average = selected.reduce((sum, actor) => sum + (actor.stats.overall ?? 60), 0) / selected.length;
  const pull = core.reduce((sum, actor, index) => sum + (actor.stats.box_office_pull ?? 50) * (index === 0 ? 0.6 : 0.4 / Math.max(1, core.length - 1)), 0);
  const genreFit = selected.reduce((sum, actor) => sum + (actor.genre_mastery[project.primaryGenre] ?? 50), 0) / selected.length;
  return Math.min(100, average * 0.55 + pull * 0.3 + genreFit * 0.15);
}

export function estimateCost(project: Project, actors: Actor[], crew: CrewMember[], studio?: Studio | null) {
  const budget = Object.values(project.budget).reduce((a, b) => a + b, 0);
  const activeContracts = project.contracts?.filter((contract) => contract.response === "accepted" || contract.response === undefined) ?? [];
  const contractedSalaries = activeContracts.length
    ? activeContracts.reduce((sum, contract) => sum + contract.negotiatedSalary, 0)
    : (() => {
        const actorIds = [...project.cast.leads, project.cast.antagonist, ...project.cast.supporting, ...project.cast.cameos];
        const castCost = actors.filter((x) => actorIds.includes(x.id)).reduce((sum, x) => sum + x.base_salary * (x.id === project.negotiatedActorId ? 1 - project.negotiationDiscount : 1), 0);
        const crewIds = [project.crew.director, ...project.crew.writers, project.crew.cinematographer, project.crew.composer, project.crew.editor_vfx];
        const crewCost = crew.filter((x) => crewIds.includes(x.id)).reduce((sum, x) => sum + x.base_salary, 0);
        return (castCost + crewCost) * (studio?.perk === "negotiator" ? 0.85 : 1);
      })();
  // Marketing cash is committed when the campaign begins, not on day one of filming.
  return Math.round(contractedSalaries + budget);
}

export function detectEgoRisk(project: Project, actors: Actor[]) {
  const ids = [...project.cast.leads, project.cast.antagonist, ...project.cast.supporting, ...project.cast.cameos];
  const selected = actors.filter((a) => ids.includes(a.id));
  return selected.filter((a) => (a.stats.ego ?? 0) > 90).length >= 2;
}

const crisisPool: Omit<Crisis, "id" | "resolved">[] = [
  { title: "النجم يرفض المشهد الخطر", description: "بطل العمل يطلب دوبلير محترفاً ويريد إعادة التفاوض على أجره قبل استكمال التصوير.", choices: [
    { label: "تأمين دوبلير محترف", cash: -1800000, hype: 3, quality: 8 },
    { label: "إعادة كتابة المشهد", cash: -350000, hype: -1, quality: 1 },
    { label: "الإصرار على الجدول", cash: 0, hype: -7, quality: -8 },
  ] },
  { title: "تسريب مشهد محوري", description: "لقطة من العمل انتشرت على منصات التواصل قبل اكتمال المونتاج. الصحافة بدأت تتكهن بالنهاية.", choices: [
    { label: "حملة تشويق مضادة", cash: -1200000, hype: 12, quality: 0 },
    { label: "تحرك قانوني وإزالة المحتوى", cash: -700000, hype: 2, quality: 1 },
    { label: "تجاهل التسريب", cash: 0, hype: -9, quality: -1 },
  ] },
  { title: "اعتراض رقابي على مشهد", description: "جهة التصنيف تطلب تعديلات على مشهد أساسي، والتأخير قد يرفع تكلفة اللوكيشن.", choices: [
    { label: "تعديل ذكي يحافظ على المعنى", cash: -550000, hype: 1, quality: 4 },
    { label: "تصعيد إعلامي", cash: -250000, hype: 7, quality: -2 },
    { label: "حذف المشهد", cash: -100000, hype: -3, quality: -6 },
  ] },
  { title: "تعطل موقع التصوير", description: "مشكلة لوجستية توقف التصوير ليومين، والفريق يطلب تعويض ساعات العمل.", choices: [
    { label: "نقل التصوير لاستوديو بديل", cash: -1400000, hype: 0, quality: 5 },
    { label: "تمديد الجدول", cash: -650000, hype: -1, quality: 1 },
    { label: "تقليص مشاهد اليوم", cash: -150000, hype: -2, quality: -4 },
  ] },
  { title: "خلاف على ترتيب الأسماء", description: "نجمين من أصحاب الغرور المرتفع يختلفان على مكان اسميهما في التتر والبوستر.", choices: [
    { label: "بوستر مزدوج متوازن", cash: -400000, hype: 5, quality: 2 },
    { label: "جلسة تفاوض مغلقة", cash: -150000, hype: 1, quality: 3 },
    { label: "اترك الخلاف يتصاعد", cash: 0, hype: 8, quality: -9 },
  ] },
];
export function createCrises(projectId: string, count = 2): Crisis[] {
  const shuffled = [...crisisPool].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((crisis, index) => ({ ...crisis, id: `${projectId}-crisis-${index + 1}`, resolved: false }));
}

export function localEvaluation(project: Project, actors: Actor[], crew: CrewMember[], hype = 0): EvaluationResult {
  const synergy = getGenreSynergy(project.primaryGenre, project.secondaryGenre).score;
  const crewScore = calculateCrewScore(project, crew);
  const castScore = calculateCastScore(project, actors);
  const avgBudget = Object.values(project.budget).reduce((a, b) => a + b, 0);
  const marketingRatio = project.marketingBudget / Math.max(1, avgBudget + project.marketingBudget);
  const scriptLength = project.summary.trim().length;
  const scriptQuality = clamp(42 + Math.min(scriptLength / 34, 17) + (/[؟?!]/.test(project.summary) ? 1 : 0) + (project.summary.split(/[.!؟]/).filter((part) => part.trim().length > 0).length >= 4 ? 4 : 0), 38, 72);
  const crewFit = clamp((crewScore - 60) * 0.025, -0.7, 0.9);
  const castFit = clamp((castScore - 60) * 0.025, -0.7, 0.9);
  const ageCritic = project.ageRating === "18+" ? 0.12 : project.ageRating === "G" ? -0.12 : 0;
  const ageAudience = project.ageRating === "18+" ? -0.28 : project.ageRating === "G" ? 0.18 : 0;
  const critic = clamp(4.4 + crewFit + (scriptQuality - 55) * 0.055 + synergy * 0.035 + (project.qualityModifier ?? 0) * 0.025 + ageCritic, 2.2, 8.8);
  const audience = clamp(4.2 + castFit + (scriptQuality - 55) * 0.035 + Math.min(1.0, hype * 0.025) + marketingRatio * 0.8 + ageAudience, 2.0, 9.0);
  const multiplier = clamp(0.52 + (audience - 5) * 0.16 + (critic - 5) * 0.06 + marketingRatio * 0.24 + synergy * 0.008, 0.42, 1.85);
  const topActor = actors.find((a) => a.id === project.cast.leads[0]);
  const secondActor = actors.find((a) => a.id === project.cast.leads[1]);
  const director = crew.find((c) => c.id === project.crew.director);
  const writerNames = project.crew.writers.map((id) => crew.find((member) => member.id === id)?.name).filter(Boolean);
  const plotExcerpt = project.summary.trim().replace(/\s+/g, " ").slice(0, 125);
  const variance = (Math.random() - 0.5) * 1.1;
  const audienceVoice = audience >= critic + 0.8 ? "فيه قبول جماهيري أوسع من الإشادة النقدية" : critic >= audience + 0.8 ? "العمل أقرب لتقدير النقاد من الجمهور العام" : "الانطباعات متقاربة مع اختلافات في التفاصيل";
  return {
    critics_score: Number(critic.toFixed(1)), audience_score: Number(clamp(audience + variance, 1.8, 9.2).toFixed(1)), box_office_multiplier: Number(multiplier.toFixed(2)),
    reviews: [
      `ناقد السيناريو: «${plotExcerpt}${project.summary.length > 125 ? "…" : ""}». نقطة القوة هي وضوح الفكرة، لكن الملخص وحده لا يثبت أن التحولات الدرامية متماسكة؛ لذلك التقييم هنا متحفظ بانتظار تنفيذ فعلي أقوى.`,
      `قراءة جماهيرية: ${topActor?.name ?? "البطل الرئيسي"}${secondActor ? ` و${secondActor.name}` : ""} يقدمان نقطة جذب واضحة، لكن الإيقاع والانسجام بين الشخصيات هما ما سيحسمان تجربة الجمهور. ${audienceVoice}.`,
      `الجانب الفني: إدارة ${director?.name ?? "المخرج"} للصورة مع كتابة ${writerNames.join(" و") || "فريق الكتابة"} تضع أساسًا للعمل، لكن لا توجد بيانات إنتاج فعلية كافية لتبرير إشادة استثنائية قبل مشاهدة النسخة النهائية.`,
    ],
    headlines: [`${project.title}: الرهان الحقيقي في قوة الحكاية لا في حجم الأسماء`, `انطباعات أولية منقسمة حول ${project.title} بين الأداء والإيقاع`],
    social_posts: [`«الفكرة شدتني، بس محتاج أشوف التنفيذ قبل ما أحكم» — نقاش متداول حول ${project.title}.`, `«أداء ${topActor?.name ?? "البطل"} لافت، لكن في مشاهد كان ممكن تتقص» — رأي من جمهور العرض.`],
    summary: `تقييم احتياطي مبني على بيانات السيناريو والطاقم والميزانية المتاحة، وليس مراجعة مشاهدة فعلية. ${audienceVoice}.`,
    award_nominations: critic >= 8.1 ? ["أفضل سيناريو", "أفضل إخراج"] : critic >= 7.1 ? ["أفضل أداء رئيسي"] : [],
  };
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function calculateRevenue(project: Project, result: EvaluationResult, actors: Actor[], studio: Studio) {
  const leads = actors.filter((actor) => project.cast.leads.includes(actor.id));
  const pull = leads.length
    ? leads.reduce((sum, actor, index) => sum + (actor.stats.box_office_pull ?? 50) * (index === 0 ? 0.6 : 0.4 / Math.max(1, leads.length - 1)), 0)
    : 50;
  const marketFactor = ({ egypt: 1, gulf: 1.12, europe: 1.22, hollywood: 1.35 } as const)[studio.market];
  // Reach is tied to the actual booked screen count, not an arbitrary fixed baseline.
  const screensFactor = clamp(project.screens / 300, 0.45, 1.45);
  const seasonFactor = project.format === "series" ? (project.season === "ramadan" ? 1.08 : 0.94) : 1;
  const releaseWindowFactor = ({ "عيد الفطر": 1.08, "عيد الأضحى": 1.06, "الصيف": 1.04, "إجازة نصف العام": 1.01 } as Record<string, number>)[project.releaseSeason] ?? 1;
  const productionBudget = Object.values(project.budget).reduce((sum, amount) => sum + amount, 0);
  const talentBudget = (project.contracts ?? [])
    .filter((contract) => contract.response === "accepted" || contract.response === undefined)
    .reduce((sum, contract) => sum + contract.negotiatedSalary, 0);
  const campaignBudget = Math.max(0, project.marketingBudget ?? 0);
  const investedCapital = Math.max(5_000_000, productionBudget + talentBudget + campaignBudget);
  const episodeScale = project.format === "series" ? clamp(Math.max(1, project.episodes) / 10, 0.75, 2.2) : 1;
  // A normal title aims around break-even against its full spend; exceptional titles
  // can outperform, while weak scripts, low reach, or poor casting can lose money.
  const qualityFactor = clamp(0.66 + (result.box_office_multiplier - 0.85) * 0.48, 0.42, 1.28);
  const audiencePullFactor = clamp(0.62 + pull / 145, 0.85, 1.35);
  const marketingFactor = clamp(0.90 + campaignBudget / investedCapital * 0.60, 0.88, 1.10);
  const openingBonus = studio.perk === "marketer" ? 1.04 : 1;
  const formatFactor = project.format === "series" ? 0.88 : 1;
  return Math.round(investedCapital * episodeScale * formatFactor * qualityFactor * audiencePullFactor * screensFactor * marketFactor * seasonFactor * releaseWindowFactor * marketingFactor * openingBonus);
}

export function advanceRevenueDays(current: number, target: number, dailyRate: number, days: number) {
  let gross = 0;
  let rate = Math.max(0.004, dailyRate);
  const remainingTarget = Math.max(0, target - current);
  const daysToProcess = Math.max(0, Math.min(120, Math.floor(days)));
  for (let day = 0; day < daysToProcess && gross < remainingTarget; day += 1) {
    const remaining = remainingTarget - gross;
    const volatility = 0.72 + Math.random() * 0.56;
    const daily = Math.min(remaining, Math.max(0, Math.round(target * rate * volatility)));
    gross += daily;
    rate = Math.max(0.003, rate * 0.96);
  }
  return { gross, nextRate: rate };
}

export function randomCompetitorNames(names: string[]) {
  return [...names].sort(() => Math.random() - 0.5).slice(0, Math.min(3, names.length));
}
