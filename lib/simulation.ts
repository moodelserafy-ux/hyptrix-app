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
  const contractedSalaries = project.contracts?.length
    ? project.contracts.reduce((sum, contract) => sum + contract.negotiatedSalary, 0)
    : (() => {
        const actorIds = [...project.cast.leads, project.cast.antagonist, ...project.cast.supporting, ...project.cast.cameos];
        const castCost = actors.filter((x) => actorIds.includes(x.id)).reduce((sum, x) => sum + x.base_salary * (x.id === project.negotiatedActorId ? 1 - project.negotiationDiscount : 1), 0);
        const crewIds = [project.crew.director, ...project.crew.writers, project.crew.cinematographer, project.crew.composer, project.crew.editor_vfx];
        const crewCost = crew.filter((x) => crewIds.includes(x.id)).reduce((sum, x) => sum + x.base_salary, 0);
        return (castCost + crewCost) * (studio?.perk === "negotiator" ? 0.85 : 1);
      })();
  return Math.round(contractedSalaries + budget + project.marketingBudget);
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
  const productionValue = Math.min(12, Math.log10(Math.max(avgBudget, 100000)) * 1.25);
  const scriptQuality = Math.min(100, 48 + Math.min(project.summary.length / 20, 18) + (project.summary.includes("لكن") ? 3 : 0));
  const ageCritic = project.ageRating === "18+" ? 0.22 : project.ageRating === "G" ? -0.18 : 0;
  const ageAudience = project.ageRating === "18+" ? -0.42 : project.ageRating === "G" ? 0.32 : 0;
  const critic = clamp(4.8 + crewScore * 0.035 + scriptQuality * 0.025 + synergy * 0.09 + ageCritic, 1, 9.8);
  const audience = clamp(4.2 + castScore * 0.042 + hype * 0.08 + productionValue * 0.09 + ageAudience, 1, 9.9);
  const multiplier = clamp(0.42 + audience * 0.13 + (project.marketingBudget / 10000000) * 0.08 + synergy * 0.012, 0.35, 2.4);
  const topActor = actors.find((a) => a.id === project.cast.leads[0]);
  const director = crew.find((c) => c.id === project.crew.director);
  return {
    critics_score: Number(critic.toFixed(1)), audience_score: Number(audience.toFixed(1)), box_office_multiplier: Number(multiplier.toFixed(2)),
    reviews: [
      `قراءة سيناريو: ${project.summary.trim().slice(0, 105)}${project.summary.length > 105 ? "…" : ""} — الفكرة تملك مدخلًا واضحًا، لكن تماسك التحولات الدرامية هو ما سيحدد قيمتها بعد المشاهدة الثانية.`,
      `من مقعد الجمهور: حضور ${topActor?.name ?? "البطل الرئيسي"} يمنح الحكاية نقطة جذب سهلة، والإيقاع يخدم ${project.format === "series" ? "متابعة الحلقات" : "المشاهدة السينمائية"}، حتى لو احتاجت بعض اللحظات إلى اختصار.`,
      `مراجعة للصنعة: اختيارات ${director?.name ?? "المخرج"} في مزج ${project.primaryGenre.replaceAll("_", " ")} مع ${project.secondaryGenre.replaceAll("_", " ")} تمنح العمل شخصية، بينما يظل التوازن بين الصورة والحكاية موضع نقاش.`,
    ],
    headlines: [`${project.title} يشعل النقاش: رهان جريء أم مغامرة أكبر من ميزانيتها؟`, `الجمهور يمنح ${project.title} دفعة قوية في أسبوعه الأول`],
    social_posts: [`"المشهد الأخير في ${project.title} محتاج نقاش طويل!"`, `"أداء يستحق التصفيق.. والإيقاع كان محتاج شوية شد."`],
    summary: "تقييم تجريبي محلي مبني على قوة الطاقم والتصنيف والميزانية. اربط مزود الذكاء الاصطناعي لإنتاج مراجعات أكثر تخصيصاً.",
    award_nominations: critic >= 7.8 ? ["أفضل عمل", "أفضل مخرج", "أفضل أداء رئيسي", "أفضل سيناريو"] : ["أفضل أداء رئيسي"],
  };
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function calculateRevenue(project: Project, result: EvaluationResult, actors: Actor[], studio: Studio) {
  const leads = actors.filter((a) => project.cast.leads.includes(a.id));
  const pull = leads.reduce((sum, actor, index) => sum + (actor.stats.box_office_pull ?? 55) * (index === 0 ? 0.6 : 0.4 / Math.max(1, leads.length - 1)), 0);
  const marketFactor = ({ egypt: 1, gulf: 1.25, europe: 1.5, hollywood: 2 } as const)[studio.market];
  const screensFactor = Math.max(0.5, Math.min(project.screens / 500, 2.2));
  const seasonFactor = project.format === "series" ? (project.season === "ramadan" ? 1.18 : 0.96) : 1;
  const releaseWindowFactor = ({ "عيد الفطر": 1.16, "عيد الأضحى": 1.14, "الصيف": 1.12, "إجازة نصف العام": 1.05 } as Record<string, number>)[project.releaseSeason] ?? 1;
  const base = project.format === "film" ? 18000000 : 12000000 + project.episodes * 650000;
  const openingBonus = studio.perk === "marketer" ? 1.15 : 1;
  return Math.round(base * result.box_office_multiplier * (0.55 + pull / 100) * screensFactor * marketFactor * seasonFactor * releaseWindowFactor * openingBonus);
}

export function randomCompetitorNames(names: string[]) {
  return [...names].sort(() => Math.random() - 0.5).slice(0, Math.min(3, names.length));
}
