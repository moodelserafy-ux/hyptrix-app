"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Award, Banknote, BarChart3, Bell, BriefcaseBusiness, CalendarDays, Camera,
  Check, CheckCircle2, ChevronDown, Clapperboard, Coins, Crown, Database, Film, Flame,
  FolderPlus, Gauge, Globe2, HeartHandshake, Home, Info, Landmark, LogIn, LogOut,
  Megaphone, Menu, Mic2, MonitorPlay, Newspaper, Play, Plus, Rocket, Settings, Shield,
  Sparkles, Star, Target, Trophy, Tv, Upload, Users, Wallet, WandSparkles, X, Zap,
} from "lucide-react";
import { toPng } from "html-to-image";
import { LogoMark, EMBLEMS, FRAMES, PALETTES } from "@/components/logo-mark";
import { DatabaseManager } from "@/components/database-manager";
import { getResolvedDatabase } from "@/lib/database";
import { showRewardedAd, type AdPlacement, type RewardedAdResult } from "@/lib/monetization";
import { useGameStore } from "@/lib/store";
import { calculateRevenue, createCrises, detectEgoRisk, estimateCost, getGenreSynergy, localEvaluation } from "@/lib/simulation";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { Actor, CrewMember, EvaluationResult, FounderPerk, GameDatabase, Genre, Market, Project, Studio } from "@/lib/types";

const GENRES: { id: Genre; label: string }[] = [
  { id: "action", label: "أكشن ومطاردات" }, { id: "popular_drama", label: "دراما شعبية / حارة" },
  { id: "dark_comedy", label: "كوميديا ساخرة / سوداء" }, { id: "light_comedy", label: "كوميديا عائلية / خفيفة" },
  { id: "psychological_horror", label: "رعب نفسي" }, { id: "supernatural_horror", label: "رعب ما وراء الطبيعة" },
  { id: "crime_mystery", label: "غموض وتحقيقات بوليسية" }, { id: "sci_fi", label: "خيال علمي ومستقبلي" },
  { id: "romance", label: "رومانسي درامي" }, { id: "historical", label: "تاريخي وحربي" },
  { id: "biography", label: "سيرة ذاتية" }, { id: "heist", label: "سرقة وعمليات معقدة" },
  { id: "fantasy", label: "فانتازيا وأساطير" }, { id: "superhero", label: "أبطال خارقين" },
];
const MARKET_LABELS: Record<Market, string> = { egypt: "السوق المصري", gulf: "الخليج العربي", europe: "أوروبا", hollywood: "هوليوود" };
const MARKET_REQUIREMENTS: { key: Market; cash: number; rep: number; tagline: string }[] = [
  { key: "gulf", cash: 250_000_000, rep: 25, tagline: "250 مليون + سمعة 25" },
  { key: "europe", cash: 800_000_000, rep: 50, tagline: "800 مليون + سمعة 50" },
  { key: "hollywood", cash: 2_500_000_000, rep: 78, tagline: "2.5 مليار + سمعة 78" },
];
const RELEASE_SEASONS = ["عيد الفطر", "عيد الأضحى", "الصيف", "إجازة نصف العام"];
const initialForm = {
  title: "", summary: "", format: "film" as "film" | "series", episodes: 10,
  season: "off_season" as "ramadan" | "off_season", primaryGenre: "action" as Genre,
  secondaryGenre: "crime_mystery" as Genre, ageRating: "16+" as "G" | "12+" | "16+" | "18+",
  releaseSeason: "الصيف", screens: 300, marketingBudget: 5_000_000, platformId: "plat_1",
  budget: { sets: 4_000_000, costumes: 2_500_000, vfx: 3_000_000, extras: 1_000_000 },
  director: "dir_1", writer1: "wr_1", writer2: "", cinematographer: "dop_1", composer: "mus_1", editor: "ed_1",
  lead1: "act_1", lead2: "act_2", antagonist: "act_5", support1: "act_4", support2: "act_7", support3: "", support4: "", cameo1: "", cameo2: "",
};
type FormState = typeof initialForm;
type Screen = "overview" | "create" | "production" | "results" | "awards" | "leaderboard" | "settings";

function money(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} مليار`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} م`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} ألف`;
  return `${Math.round(value).toLocaleString("en-US")}`;
}
function fullMoney(value: number) { return `${Math.round(value).toLocaleString("en-US")} ج.م`; }
function labelGenre(id: Genre) { return GENRES.find((g) => g.id === id)?.label ?? id; }
function tierName(actor: Actor) { return actor.stats.overall >= 90 ? "أيقونة" : actor.stats.overall >= 80 ? "نجم صف أول" : actor.stats.overall >= 70 ? "محترف" : "وجه صاعد"; }
function averageStats(stats: Record<string, number>) { return Math.round(stats.overall ?? 0); }
function uniq(values: string[]) { return [...new Set(values.filter(Boolean))]; }

function PageHeading({ kicker, title, desc, action }: { kicker: string; title: string; desc?: string; action?: ReactNode }) {
  return <div className="page-head"><div className="page-head-copy"><div className="eyebrow"><Sparkles size={12}/>{kicker}</div><h1 className="page-title">{title}</h1>{desc && <p className="page-desc">{desc}</p>}</div>{action && <div className="page-head-action">{action}</div>}<span className="page-head-orb page-head-orb-one"/><span className="page-head-orb page-head-orb-two"/></div>;
}
function Metric({ label, value, foot, icon: Icon, tone = "gold" }: { label: string; value: string; foot?: string; icon: ElementType; tone?: "gold" | "red" | "green" }) {
  return <div className={`metric-card metric-${tone}`}><div className="metric-top"><div className="metric-icon"><Icon size={19}/></div><span className="metric-label">{label}</span></div><div className="metric-value">{value}</div>{foot && <div className="metric-foot">{foot}</div>}<span className="metric-glow"/></div>;
}
function SelectField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string }) {
  return <label className="field-wrap"><span className="field-label">{label}</span><select className="field" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder ?? "اختر..."}</option>{options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select></label>;
}
function ActorCard({ actor, selected, onClick }: { actor: Actor; selected?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`tier-card talent-card tier-${actor.tier} text-right w-full ${selected ? "selected" : ""}`}>
    <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2 min-w-0">{actor.image_url ? <img src={actor.image_url} alt={actor.name} loading="lazy" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-white/10"/> : <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 grid place-items-center"><Users size={14} className="text-muted"/></div>}<div className="min-w-0"><div className="text-xs font-black leading-5 truncate">{actor.name}</div><div className="text-[9px] text-muted mt-1">{tierName(actor)} · {actor.age} سنة</div></div></div><div className="text-xl font-black gold-text">{averageStats(actor.stats)}</div></div>
    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{[["تمثيل", actor.stats.acting], ["كاريزما", actor.stats.charisma], ["سحب جماهيري", actor.stats.box_office_pull], ["غرور", actor.stats.ego]].map(([name, stat]) => <div key={String(name)}><div className="flex justify-between text-[8px] text-muted mb-1"><span>{name}</span><span>{stat}</span></div><div className="stat-bar"><span style={{ width: `${Number(stat)}%` }}/></div></div>)}</div>
  </button>;
}
function CrewCard({ member, selected, onClick }: { member: CrewMember; selected?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`tier-card talent-card crew-talent-card w-full text-right ${selected ? "selected" : ""}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0">{member.image_url ? <img src={member.image_url} alt={member.name} loading="lazy" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-white/10"/> : <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 grid place-items-center"><Clapperboard size={13} className="text-muted"/></div>}<div className="min-w-0"><div className="text-xs font-black truncate">{member.name}</div><div className="text-[9px] text-muted mt-1">{member.role === "director" ? "مخرج" : member.role === "screenwriter" ? "مؤلف" : member.role === "cinematographer" ? "مدير تصوير" : member.role === "composer" ? "موسيقار" : "مونتير / VFX"}</div></div></div><div className="text-lg font-black gold-text">{member.stats.overall}</div></div><div className="mt-2 text-[9px] text-muted">{member.best_genres.slice(0, 3).map(labelGenre).join(" · ")}</div></button>;
}

export function GameShell() {
  const hydrated = useGameStore((s) => s.hydrated);
  const hasStudio = useGameStore((s) => s.hasStudio);
  const studio = useGameStore((s) => s.studio);
  const year = useGameStore((s) => s.year);
  const week = useGameStore((s) => s.week);
  const gameDay = useGameStore((s) => s.gameDay);
  const customDb = useGameStore((s) => s.customDb);
  const projects = useGameStore((s) => s.projects);
  const activeProjectId = useGameStore((s) => s.activeProjectId);
  const worldHistory = useGameStore((s) => s.worldHistory);
  const vipExpiresAt = useGameStore((s) => s.vipExpiresAt);
  const notification = useGameStore((s) => s.notification);
  const hydrate = useGameStore((s) => s.hydrate);
  const createStudio = useGameStore((s) => s.createStudio);
  const createProject = useGameStore((s) => s.createProject);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateContract = useGameStore((s) => s.updateContract);
  const setActiveProject = useGameStore((s) => s.setActiveProject);
  const addCash = useGameStore((s) => s.addCash);
  const addHistory = useGameStore((s) => s.addHistory);
  const syncClock = useGameStore((s) => s.syncClock);
  const setVip = useGameStore((s) => s.setVip);
  const setNotification = useGameStore((s) => s.setNotification);
  const resetGame = useGameStore((s) => s.resetGame);
  const db = useMemo(() => getResolvedDatabase(customDb), [customDb]);
  const [screen, setScreen] = useState<Screen>("overview");
  const [showVip, setShowVip] = useState(false);
  const [vipProgress, setVipProgress] = useState(0);
  const [busyAd, setBusyAd] = useState(false);
  const [busyAi, setBusyAi] = useState(false);
  const [adDemoNotice, setAdDemoNotice] = useState("");
  const [toast, setToast] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [vipCloud, setVipCloud] = useState<{ configured: boolean; vipBalance: number | null; package?: { status?: string; expires_at?: string; plan_code?: string } | null; packageStatus?: string; rewardedProgress?: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ studio_name: string; market: string; net_worth: number; reputation: number }[]>([]);
  const [leaderboardConfigured, setLeaderboardConfigured] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<Market | "all">("all");
  const [setup, setSetup] = useState({ name: "", ceo: "", market: "egypt" as Market, perk: "visionary" as FounderPerk, emblem: "winged-lion", frame: "shield", palette: "gold" });
  const [form, setForm] = useState<FormState>(initialForm);
  const [createStep, setCreateStep] = useState<"concept" | "casting">("concept");
  const processingOffers = useRef<Set<string>>(new Set());
  const hydrationStartedRef = useRef(false);
  const newsDayRef = useRef(0);
  const previousDayRef = useRef(gameDay);
  const simulationInitializedRef = useRef(false);
  const [draftDiscount, setDraftDiscount] = useState(0);
  const [negotiationTarget, setNegotiationTarget] = useState("act_1");
  const [resultToast, setResultToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    if (hydrationStartedRef.current) return;
    hydrationStartedRef.current = true;
    void Promise.resolve(useGameStore.persist.rehydrate())
      .catch(() => undefined)
      .then(() => hydrate())
      .catch(() => {
        useGameStore.setState({ hydrated: true });
        setToast("تعذر استعادة بعض بيانات الحفظ. تم فتح اللعبة بالبيانات المتاحة على الجهاز.");
      });
  }, [hydrate]);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => { setUserEmail(data.session?.user.email ?? ""); });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? ""));
      return () => listener.subscription.unsubscribe();
    }
  }, [supabase]);
  useEffect(() => {
    if (notification) { setToast(notification); const timer = window.setTimeout(() => { setToast(""); setNotification(null); }, 3800); return () => window.clearTimeout(timer); }
  }, [notification, setNotification]);
  useEffect(() => {
    if (userEmail) refreshVip();
  }, [userEmail]);
  useEffect(() => { if (screen === "leaderboard") loadLeaderboard("all"); }, [screen]);
  // One real minute equals one in-game day. Reconcile elapsed time so background-tab throttling cannot lose days.
  useEffect(() => {
    if (!hydrated || !hasStudio) return;
    syncClock();
    const timer = window.setInterval(syncClock, 10_000);
    return () => window.clearInterval(timer);
  }, [hydrated, hasStudio, syncClock]);
  useEffect(() => {
    for (const project of projects) {
      const due = project.contracts.filter((contract) => contract.response === "pending" && (contract.responseDay ?? Number.MAX_SAFE_INTEGER) <= gameDay);
      for (const contract of due) {
        if (processingOffers.current.has(`${project.id}:${contract.memberId}`)) continue;
        processingOffers.current.add(`${project.id}:${contract.memberId}`);
        const actorCandidate = db.actors.find((actor) => actor.id === contract.memberId);
        const crewCandidate = db.crew.find((member) => member.id === contract.memberId);
        const candidate = actorCandidate ?? crewCandidate;
        const candidateDetails = {
          ...contract,
          stats: candidate?.stats,
          ...(actorCandidate ? { genre_mastery: actorCandidate.genre_mastery } : {}),
          ...(crewCandidate ? { best_genres: crewCandidate.best_genres } : {}),
        };
        fetch("/api/generate-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "negotiation", project, candidate: candidateDetails, worldHistory: worldHistory.slice(0, 25), context: `يوم اللعبة ${gameDay}. اسم الاستوديو ${studio?.name ?? ""}.` }) })
          .then(async (response) => { if (!response.ok) throw new Error("negotiation unavailable"); return response.json(); })
          .then((payload) => {
            const decision: "accepted" | "rejected" = payload.data?.decision === "accepted" ? "accepted" : "rejected";
            const reason = String(payload.data?.reason ?? "لم يصل رد واضح من ممثل الأعمال.");
            updateContract(project.id, contract.memberId, { response: decision, responseReason: reason });
            addHistory({ year, kind: "business", text: `${contract.memberName}: ${decision === "accepted" ? "وافق على العرض" : "رفض العرض"} لـ ${project.title}. ${reason}` });
            setToast(`${contract.memberName} ${decision === "accepted" ? "وافق على الانضمام" : "رفض العرض"}: ${reason}`);
          }).catch(() => {
            updateContract(project.id, contract.memberId, { response: "rejected", responseReason: "تعذر الحصول على رد من وكيل الأعمال؛ حاول إعادة إرسال العرض عند استقرار الاتصال." });
          }).finally(() => processingOffers.current.delete(`${project.id}:${contract.memberId}`));
      }
    }
  }, [gameDay, projects, db, studio, worldHistory, year, updateContract, addHistory]);
  useEffect(() => {
    if (!hydrated || !hasStudio) {
      previousDayRef.current = gameDay;
      simulationInitializedRef.current = false;
      return;
    }
    // Establish the cursor from the persisted day first. The clock effect above
    // may then advance it by only the real offline minutes since lastTickAt.
    if (!simulationInitializedRef.current) {
      previousDayRef.current = gameDay;
      simulationInitializedRef.current = true;
      return;
    }
    const elapsedDays = gameDay - previousDayRef.current;
    if (elapsedDays <= 0) return;
    previousDayRef.current = gameDay;

    for (const project of projects.filter((item) => item.status === "production" && item.crises.every((crisis) => crisis.resolved))) {
      const progress = Math.min(100, project.productionProgress + 14 * elapsedDays);
      const completed = progress >= 100;
      updateProject(project.id, {
        productionProgress: progress,
        status: completed ? "post" : "production",
        ...(completed ? { productionEndDay: gameDay } : {}),
      });
      if (completed) addHistory({ year, kind: "business", text: `اكتمل تصوير ${project.title} تلقائيًا في اليوم ${gameDay}، وانتقل إلى ما بعد الإنتاج.` });
    }

    for (const project of projects.filter((item) => item.status === "released" && (item.revenueTarget ?? 0) > (item.boxOffice ?? 0))) {
      const remaining = Math.max(0, (project.revenueTarget ?? 0) - (project.boxOffice ?? 0));
      const daily = Math.min(remaining, Math.max(250_000, Math.round((project.revenueTarget ?? 0) * (project.dailyGross ?? 0.035) * elapsedDays * (0.82 + Math.random() * 0.36))));
      if (daily <= 0) continue;
      const rivals = (project.rivalReleases ?? []).map((rival) => {
        const rivalRemaining = Math.max(0, (rival.revenueTarget ?? rival.boxOffice) - rival.boxOffice);
        const rivalDaily = Math.min(rivalRemaining, Math.max(100_000, Math.round((rival.revenueTarget ?? rival.boxOffice) * (rival.dailyGross ?? 0.04) * elapsedDays * (0.8 + Math.random() * 0.4))));
        return { ...rival, boxOffice: rival.boxOffice + rivalDaily, dailyGross: Math.max(.012, (rival.dailyGross ?? .04) * Math.pow(.94, elapsedDays)) };
      });
      updateProject(project.id, { boxOffice: (project.boxOffice ?? 0) + daily, dailyGross: Math.max(0.012, (project.dailyGross ?? 0.035) * Math.pow(.94, elapsedDays)), rivalReleases: rivals });
      addCash(Math.round(daily * (1 - Math.min(.28, (project.backendPayout ?? 0) / Math.max(1, project.revenueTarget ?? 1)))));
      if (gameDay % 7 === 0) addHistory({ year, kind: "release", text: `تقرير أسبوعي: ${project.title} أضاف ${money(daily)} جنيه إلى شباك التذاكر خلال ${elapsedDays} يوم، والإجمالي ${money((project.boxOffice ?? 0) + daily)}.` });
    }

    if (gameDay % 3 === 0 && newsDayRef.current !== gameDay) {
      newsDayRef.current = gameDay;
      const focus = projects.find((item) => item.status === "released" || item.status === "production" || item.status === "post" || item.status === "draft") ?? {
        id: "world-market", title: "سوق صناعة السينما", summary: "تغطية عامة لحركة الإنتاج والتوزيع والمنصات والمنافسة بين شركات السينما والتلفزيون.",
      };
      fetch("/api/generate-event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "daily_news", project: focus, worldHistory: worldHistory.slice(0, 30), context: `اليوم ${gameDay} في عالم Hyptrix. لا تكرر العناوين السابقة، وغطِّ السوق كله إذا لم يكن هناك مشروع نشط.` }),
      }).then((response) => response.ok ? response.json() : null).then((payload) => {
        if (payload?.data?.headline) {
          addHistory({ year, kind: payload.data.kind ?? "business", text: `${payload.data.headline} — ${payload.data.story}` });
          setToast(payload.data.headline);
        }
      }).catch(() => undefined);
    }
  }, [hydrated, hasStudio, gameDay, projects, worldHistory, year, updateProject, addCash, addHistory]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects.find((project) => project.status === "production" || project.status === "post" || project.status === "released") ?? null;
  const studioCash = studio?.cash ?? 0;
  const resolvedCrew = db.crew;
  const cloudPackage = (vipCloud as { package?: { status?: string; expires_at?: string } } | null)?.package;
  const isVip = Boolean((vipExpiresAt && vipExpiresAt > Date.now()) || (cloudPackage?.status === "active" && cloudPackage.expires_at && new Date(cloudPackage.expires_at).getTime() > Date.now()));

  async function refreshVip() {
    if (!supabase) { setVipCloud({ configured: false, vipBalance: null, package: null, rewardedProgress: 0 }); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const response = await fetch("/api/vip", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
    if (response.ok) { const payload = await response.json(); setVipCloud({ ...payload, packageStatus: payload.package?.status ?? "inactive" }); setVipProgress(payload.rewardedProgress ?? 0); }
  }
  async function signIn() {
    if (!supabase) { setAuthMessage("أضف بيانات Supabase في ملف .env.local لتفعيل تسجيل الدخول."); return; }
    if (!authEmail.includes("@")) { setAuthMessage("اكتب بريدًا إلكترونيًا صحيحًا."); return; }
    setAuthLoading(true); setAuthMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail, options: { emailRedirectTo: window.location.origin } });
    setAuthMessage(error ? error.message : "أرسلنا رابط الدخول إلى بريدك. افتح الرسالة لإتمام تسجيل الدخول.");
    setAuthLoading(false);
  }
  async function signOut() {
    await supabase?.auth.signOut(); setUserEmail(""); setVipCloud(null); setAuthMessage("تم تسجيل الخروج.");
  }
  async function publishLeaderboard() {
    if (!supabase) { setToast("اربط Supabase أولاً لنشر الشركة على لوحة المتصدرين."); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session || !studio) { setToast("سجّل الدخول أولاً لنشر ترتيب شركتك."); return; }
    const response = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ studioName: studio.name, market: studio.market, netWorth: studio.cash, reputation: studio.reputation }) });
    setToast(response.ok ? "تم تحديث ترتيب الشركة عالميًا." : "تعذر تحديث لوحة المتصدرين. راجع إعدادات Supabase.");
    if (response.ok) loadLeaderboard();
  }
  async function loadLeaderboard(scope: Market | "all" = leaderboardScope) {
    setLeaderboardScope(scope);
    const response = await fetch(`/api/leaderboard${scope === "all" ? "" : `?market=${scope}`}`);
    if (response.ok) { const data = await response.json(); setLeaderboard(data.entries ?? []); setLeaderboardConfigured(Boolean(data.configured)); }
  }
  async function rewardAd(placement: AdPlacement): Promise<RewardedAdResult> {
    setBusyAd(true); setAdDemoNotice("");
    const result = await showRewardedAd(placement);
    setBusyAd(false);
    if (!result.completed) {
      setAdDemoNotice("شبكة الإعلانات غير مربوطة بعد. اربط SDK عبر window.HyptrixAds.showRewarded؛ لن تُمنح المكافأة قبل تأكيد مشاهدة الإعلان.");
    }
    return result;
  }
  async function nextVipAd() {
    const result = await rewardAd("vip_pass");
    if (!result.completed) return;
    if (result.simulated) {
      const next = vipProgress + 1;
      setVipProgress(next);
      if (next >= 5) {
        setVip(Date.now() + 24 * 60 * 60 * 1000);
        addCash(20_000_000);
        addHistory({ year, kind: "business", text: "مكافأة رئيس الاستوديو التجريبية: تمويل طوارئ بقيمة 20 مليون لمدة جلسة التطوير." });
        setShowVip(false); setVipProgress(0);
        setToast("وضع VIP تجريبي اتفعل لهذه الجلسة مع 20 مليون تمويل طوارئ. التفعيل الدائم يحتاج تحققًا سحابيًا.");
      }
      return;
    }
    if (!result.receipt || !supabase) {
      setAdDemoNotice("الإعلان اكتمل لكن لا يوجد إثبات مكافأة صالح أو إعداد Supabase. لم يتم احتساب المشاهدة.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setAdDemoNotice("سجّل الدخول حتى يتم تسجيل المشاهدات الخمس والتحقق منها سحابيًا."); return; }
    const response = await fetch("/api/vip/rewarded", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ receipt: result.receipt, placement: "vip_pass" }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setAdDemoNotice(payload.error ?? "تعذر التحقق من إيصال الإعلان على الخادم."); return; }
    setVipProgress(payload.progress ?? 0);
    await refreshVip();
    if (payload.active) { addCash(20_000_000); addHistory({ year, kind: "business", text: "مكافأة VIP موثقة: تمويل طوارئ بقيمة 20 مليون لحساب رئيس الاستوديو." }); setShowVip(false); setVipProgress(0); setToast("تم تفعيل رئيس الاستوديو VIP لمدة 24 ساعة على حسابك مع تمويل طوارئ 20 مليون."); }
  }
  async function triggerContextReward(placement: AdPlacement, onSuccess: () => void, failMessage?: string) {
    const result = await rewardAd(placement);
    if (!result.completed) { if (failMessage) setToast(failMessage); return; }
    if (result.simulated) { onSuccess(); setToast("تم تطبيق مكافأة تجريبية محلية؛ لا تُسجّل كمشاهدة مدفوعة."); return; }
    if (!result.receipt || !supabase) {
      setAdDemoNotice("اكتمل الإعلان دون إيصال قابل للتحقق، أو لم يتم إعداد Supabase. لم تُمنح المكافأة.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setAdDemoNotice("سجّل الدخول حتى نتحقق من إيصال الإعلان على الخادم قبل منح المكافأة."); return; }
    const response = await fetch("/api/vip/rewarded", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` },
      body: JSON.stringify({ receipt: result.receipt, placement }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setAdDemoNotice(payload.error ?? "تعذر التحقق من إيصال الإعلان."); return; }
    onSuccess();
    if (placement === "vip_pass") { setVipProgress(payload.progress ?? 0); await refreshVip(); }
    setToast("تم التحقق من المشاهدة ومنح المكافأة.");
  }

  function startStudio() {
    if (!setup.name.trim() || !setup.ceo.trim()) { setToast("اكتب اسم الاستوديو واسم المدير التنفيذي أولاً."); return; }
    const newStudio: Studio = {
      name: setup.name.trim(), ceo: setup.ceo.trim(), market: setup.market,
      cash: 250_000_000, reputation: 12,
      logo: { emblem: setup.emblem, frame: setup.frame, palette: setup.palette }, perk: setup.perk, foundedYear: 2026,
    };
    createStudio(newStudio);
    addHistory({ year: 2026, kind: "business", text: `تأسست شركة ${newStudio.name} بقيادة ${newStudio.ceo} في ${MARKET_LABELS[newStudio.market]}.` });
  }
  const changeForm = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((old) => ({ ...old, [key]: value }));
  function createNewProject() {
    if (!form.title.trim() || form.summary.trim().length < 30) { setToast("اكتب اسم العمل وملخصًا من 30 حرفًا على الأقل."); return; }
    const castIds = uniq([form.lead1, form.lead2, form.antagonist, form.support1, form.support2, form.support3, form.support4, form.cameo1, form.cameo2]);
    const selectedActors = db.actors.filter((actor) => castIds.includes(actor.id));
    const selectedCrew = db.crew.filter((member) => formCrewIds.includes(member.id));
    const requiredRoles: CrewMember["role"][] = ["director", "screenwriter", "cinematographer", "composer", "editor_vfx"];
    if (selectedActors.length < 5 || requiredRoles.some((role) => !selectedCrew.some((member) => member.role === role))) {
      setToast("التشكيل يحتاج 5 ممثلين على الأقل، ومخرجًا ومؤلفًا ومدير تصوير وموسيقارًا ومونتيرًا من الكتالوج الحالي."); return;
    }
    const project: Project = {
      id: crypto.randomUUID(), title: form.title.trim(), summary: form.summary.trim(), format: form.format, episodes: form.format === "film" ? 0 : form.episodes,
      season: form.season, primaryGenre: form.primaryGenre, secondaryGenre: form.secondaryGenre, ageRating: form.ageRating,
      crew: { director: form.director, writers: uniq([form.writer1, form.writer2]), cinematographer: form.cinematographer, composer: form.composer, editor_vfx: form.editor },
      cast: { leads: uniq([form.lead1, form.lead2]), antagonist: form.antagonist, supporting: uniq([form.support1, form.support2, form.support3, form.support4]), cameos: uniq([form.cameo1, form.cameo2]) },
      budget: { ...form.budget }, marketingBudget: form.marketingBudget, releaseSeason: form.releaseSeason, screens: form.screens, platformId: form.platformId,
      status: "draft", productionProgress: 0, crises: [], hype: 0, qualityModifier: studio?.perk === "visionary" ? 10 : 0, negotiationDiscount: draftDiscount, negotiatedActorId: draftDiscount > 0 ? negotiationTarget : undefined, contracts: [], createdYear: year,
    };
    const founderSalaryFactor = studio?.perk === "negotiator" ? 0.85 : 1;
    const contractRows = [
      ...db.actors.filter((actor) => castIds.includes(actor.id)).map((actor) => ({
        memberId: actor.id, memberName: actor.name,
        role: project.cast.leads.includes(actor.id) ? "lead" : project.cast.antagonist === actor.id ? "antagonist" : project.cast.cameos.includes(actor.id) ? "cameo" : "supporting",
        baseSalary: actor.base_salary,
        negotiatedSalary: Math.round(actor.base_salary * founderSalaryFactor * (actor.id === project.negotiatedActorId ? 1 - project.negotiationDiscount : 1)),
        backendPoints: project.cast.leads.includes(actor.id) ? 4 : project.cast.antagonist === actor.id ? 2 : project.cast.cameos.includes(actor.id) ? 0.5 : 1,
        ego: actor.stats.ego ?? 0,
      })),
      ...db.crew.filter((member) => formCrewIds.includes(member.id)).map((member) => ({
        memberId: member.id, memberName: member.name, role: member.role, baseSalary: member.base_salary,
        negotiatedSalary: Math.round(member.base_salary * founderSalaryFactor), backendPoints: member.role === "director" ? 2 : 1, ego: 0,
      })),
    ];
    project.contracts = contractRows.map((contract) => ({ ...contract, response: "pending" as const, responseDay: gameDay + 1 }));
    project.proposalDay = gameDay;
    createProject(project); setScreen("production");
    setToast("تم إرسال ملف الفكرة والعروض. ستصل ردود الوكلاء بعد يوم داخل اللعبة.");
  }
  async function startProduction(project: Project) {
    if (!project.contracts.length || project.contracts.some((contract) => contract.response !== "accepted")) {
      setToast("لا يمكن بدء التصوير قبل اكتمال موافقات كل أفراد الطاقم."); return;
    }
    if (Object.values(project.budget).some((amount) => amount <= 0) || project.marketingBudget <= 0) {
      setToast("حدد ميزانية موجبة لكل بند، وميزانية تسويق، قبل اعتماد التصوير."); return;
    }
    const cost = estimateCost(project, db.actors, db.crew, studio);
    if (studioCash < cost) { setToast(`السيولة غير كافية. تحتاج ${fullMoney(cost - studioCash)} إضافية.`); return; }

    setBusyAi(true);
    setToast("يجري تجهيز خطة التصوير وأزمات مرتبطة بظروف المشروع...");
    try {
      const fallbackCrises = createCrises(project.id, 2 + (Math.random() > 0.55 ? 1 : 0));
      const crisisAngles = ["مشكلة موقع تصوير أو معدات أو جدول لوجستي", "خلاف إبداعي بين أفراد الطاقم أو إعادة كتابة", "تسريب أو اعتراض رقابي أو أزمة توزيع وتسويق"];
      const crises = await Promise.all(fallbackCrises.map(async (fallback, index) => {
        try {
          const response = await fetch("/api/generate-event", {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35_000),
            body: JSON.stringify({ type: "crisis", project, worldHistory: worldHistory.slice(0, 35), context: `اليوم ${gameDay}. هذه الأزمة رقم ${index + 1} ويجب أن تختلف تمامًا عن باقي الأزمات. زاوية الأزمة المطلوبة: ${crisisAngles[index]}. اربطها بميزانية العمل وطاقمه ونوعه.` }),
          });
          if (!response.ok) return fallback;
          const payload = await response.json();
          const data = payload?.data;
          if (!data?.title || !data?.description || !Array.isArray(data?.choices) || data.choices.length !== 3) return fallback;
          return {
            id: fallback.id,
            title: String(data.title),
            description: String(data.description),
            choices: data.choices.map((choice: { label?: unknown; cash?: unknown; hype?: unknown; quality?: unknown }) => ({
              label: String(choice.label ?? "قرار إداري"),
              cash: Number(choice.cash ?? 0),
              hype: Number(choice.hype ?? 0),
              quality: Number(choice.quality ?? 0),
            })),
            resolved: false,
          };
        } catch {
          return fallback;
        }
      }));

      const plannedDays = Math.ceil((100 - 5) / 14);
      updateProject(project.id, {
        status: "production", productionProgress: 5, crises,
        productionStartDay: gameDay, plannedEndDay: gameDay + plannedDays, productionEndDay: undefined,
      });
      addCash(-cost);
      addHistory({ year, kind: "business", text: `بدأ تصوير ${project.title} بميزانية إجمالية ${money(cost)}. الموعد المخطط لانتهاء التصوير: اليوم ${gameDay + plannedDays}.` });
      setToast(`بدأ التصوير. الموعد المخطط لانتهائه اليوم ${gameDay + plannedDays}، وتوجد ${crises.length} أزمات مرتبطة بالإنتاج.`);
    } catch {
      setToast("تعذر تجهيز التصوير الآن. لم يتم خصم الميزانية؛ جرّب مرة أخرى.");
    } finally {
      setBusyAi(false);
    }
  }
  function resolveCrisis(project: Project, crisisId: string, choiceIndex: number) {
    const crisis = project.crises.find((item) => item.id === crisisId);
    if (!crisis || crisis.resolved) return;
    const choice = crisis.choices[choiceIndex];
    addCash(choice.cash);
    const crises = project.crises.map((item) => item.id === crisisId ? { ...item, resolved: true } : item);
    const allResolved = crises.every((item) => item.resolved);
    updateProject(project.id, {
      crises, hype: project.hype + choice.hype, qualityModifier: project.qualityModifier + choice.quality,
      ...(allResolved ? { plannedEndDay: gameDay + Math.ceil((100 - project.productionProgress) / 14) } : {}),
    });
    addHistory({ year, kind: "crisis", text: `${project.title}: ${crisis.title} — القرار: ${choice.label}.` });
    setToast(`تم اتخاذ القرار: ${choice.label}`);
  }
  async function releaseProject(project: Project) {
    if (!studio) return;
    setBusyAi(true); setResultToast("");
    try {
      const previousReviews = projects
        .filter((item) => item.id !== project.id && item.result)
        .flatMap((item) => item.result?.reviews ?? [])
        .map((review) => review.slice(0, 240))
        .slice(0, 12);
      const payload = {
        type: "evaluate",
        project: { ...project, hype: project.hype, qualityModifier: project.qualityModifier },
        worldHistory: worldHistory.slice(0, 50),
        context: `معلومات إضافية: اسم الاستوديو ${studio.name}، السوق ${MARKET_LABELS[studio.market]}، ميزة المؤسس ${studio.perk}. مراجعات سابقة يجب تجنب تكرار تعبيراتها: ${previousReviews.join(" | ") || "لا توجد مراجعات سابقة"}.`,
      };
      let result: EvaluationResult;
      let provider = "local";
      try {
        const response = await fetch("/api/generate-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error("تعذر الاتصال بمحرك الذكاء الاصطناعي");
        const data = await response.json(); provider = data.provider ?? "local"; result = provider === "local" ? localEvaluation(project, db.actors, db.crew, project.hype) : data.data as EvaluationResult;
      } catch { result = localEvaluation(project, db.actors, db.crew, project.hype); provider = "local"; }
      result = { ...result, critics_score: Math.max(0, Math.min(10, result.critics_score + project.qualityModifier * 0.06)), audience_score: Math.max(0, Math.min(10, result.audience_score + project.hype * 0.02)) };
      const platformCapacity = db.streaming_platforms.find((p) => p.id === project.platformId)?.budget_capacity ?? 50;
      const licensingRevenue = platformCapacity * (project.format === "series" ? 190000 : 85000);
      const revenue = calculateRevenue(project, result, db.actors, studio) + licensingRevenue;
      const backendRate = Math.min(0.28, project.contracts.reduce((sum, contract) => sum + contract.backendPoints, 0) / 240);
      const backendPayout = Math.round(revenue * backendRate);
      const rivalCount = Math.min(db.competitor_studios.length, 2 + (Math.random() > 0.52 ? 1 : 0));
      const rivalReleases = [...db.competitor_studios].sort(() => Math.random() - 0.5).slice(0, rivalCount).map((rival) => {
        const genreFactor = rival.preferred_genres.includes(project.primaryGenre) ? 1.16 : 0.88;
        const marketStrength = 0.48 + rival.market_power / 165;
        const seasonalSwing = 0.72 + Math.random() * 0.56;
        return { studioName: rival.name, boxOffice: Math.round(revenue * marketStrength * genreFactor * seasonalSwing) };
      });
      const openingGross = Math.round(revenue * 0.12);
      const released: Project = { ...project, status: "released", result, boxOffice: openingGross, revenueTarget: revenue, dailyGross: 0.055, releaseDay: gameDay, backendPayout, rivalReleases: rivalReleases.map((rival) => ({ ...rival, revenueTarget: rival.boxOffice, boxOffice: Math.round(rival.boxOffice * 0.12), dailyGross: 0.05 })) };
      updateProject(project.id, released);
      addCash(openingGross - Math.round(backendPayout * 0.12));
      useGameStore.setState((state) => ({ studio: state.studio ? { ...state.studio, reputation: Math.min(100, state.studio.reputation + (result.critics_score >= 7.5 ? 5 : 2)) } : state.studio }));
      addHistory({ year, kind: "release", text: `صدر ${project.format === "film" ? "فيلم" : "مسلسل"} ${project.title}: تقييم النقاد ${result.critics_score}/10، الجمهور ${result.audience_score}/10، وإيرادات افتتاحية ${money(openingGross)}، والهدف المتوقع ${money(revenue)}. يبدأ تتبع الشباك يومًا بيوم.` });
      setResultToast(provider === "local" ? "استخدمنا محرك التقييم المحلي؛ أضف مفاتيح Groq أو Gemini لتفعيل التقييم التوليدي." : `تم التقييم بواسطة ${provider === "groq" ? "Groq" : "Gemini"}.`);
      setScreen("results"); setActiveProject(project.id);
    } catch {
      setResultToast("حصلت مشكلة أثناء تجهيز تقرير الطرح. لم نغيّر حالة المشروع؛ أعد المحاولة.");
    } finally {
      setBusyAi(false);
    }
  }
  async function shareResult() {
    if (!shareRef.current) return;
    try {
      const dataUrl = await toPng(shareRef.current, { pixelRatio: 3, cacheBust: true, backgroundColor: "#FFFFFF" });
      const link = document.createElement("a"); link.download = `hyptrix-${(activeProject?.title ?? "film").replace(/[^\p{L}\p{N}-]/gu, "-")}.png`; link.href = dataUrl; link.click();
      setToast("تم تجهيز بطاقة المشاركة PNG بجودة عالية.");
    } catch { setToast("تعذر تحويل البطاقة إلى صورة. حاول مرة أخرى."); }
  }
  async function unlockMarket(target: Market) {
    const req = MARKET_REQUIREMENTS.find((x) => x.key === target);
    if (!req || !studio) return;
    if (studio.cash < req.cash || studio.reputation < req.rep) { setToast(`فتح ${MARKET_LABELS[target]} يتطلب ${req.tagline}.`); return; }
    useGameStore.setState((state) => ({ studio: state.studio ? { ...state.studio, market: target } : state.studio }));
    addHistory({ year, kind: "business", text: `توسعت ${studio.name} إلى ${MARKET_LABELS[target]}.` });
    setToast(`تم فتح ${MARKET_LABELS[target]}!`);
  }
  async function runAwards() {
    if (week < 52) { setToast("حفل الجوائز السنوي يُقام في الأسبوع 52 من كل عام."); return; }
    if (worldHistory.some((entry) => entry.kind === "award" && entry.year === year)) { setToast("أُقيم حفل هذا العام بالفعل. نلتقي في الموسم القادم."); return; }
    const released = projects.filter((p) => p.status === "released" && p.result);
    if (!released.length) { setToast("لا توجد أعمال مطروحة لتدخل سباق الجوائز بعد."); return; }
    const festival = db.festivals.slice().sort((a, b) => b.prestige - a.prestige)[0];
    const winner = [...released].sort((a, b) => (b.result?.critics_score ?? 0) - (a.result?.critics_score ?? 0))[0];
    const directorCandidates = released.flatMap((project) => {
      const member = db.crew.find((person) => person.id === project.crew.director);
      return member ? [{ project, member }] : [];
    });
    const writerCandidates = released.flatMap((project) => project.crew.writers.flatMap((id) => {
      const member = db.crew.find((person) => person.id === id);
      return member ? [{ project, member }] : [];
    }));
    const leadCandidates = released.flatMap((project) => project.cast.leads.flatMap((id) => {
      const member = db.actors.find((person) => person.id === id);
      return member ? [{ project, member }] : [];
    }));
    const supportCandidates = released.flatMap((project) => project.cast.supporting.flatMap((id) => {
      const member = db.actors.find((person) => person.id === id);
      return member ? [{ project, member }] : [];
    }));
    const bestDirector = directorCandidates.sort((a, b) => ((b.member.stats.vision ?? b.member.stats.overall) + (b.project.result?.critics_score ?? 0) * 5) - ((a.member.stats.vision ?? a.member.stats.overall) + (a.project.result?.critics_score ?? 0) * 5))[0];
    const bestWriter = writerCandidates.sort((a, b) => ((b.member.stats.plot_strength ?? b.member.stats.overall) + (b.project.result?.critics_score ?? 0) * 4) - ((a.member.stats.plot_strength ?? a.member.stats.overall) + (a.project.result?.critics_score ?? 0) * 4))[0];
    const bestLead = leadCandidates.sort((a, b) => ((b.member.stats.acting ?? b.member.stats.overall) * .7 + (b.member.stats.charisma ?? 50) * .2 + (b.project.result?.critics_score ?? 0) * 2) - ((a.member.stats.acting ?? a.member.stats.overall) * .7 + (a.member.stats.charisma ?? 50) * .2 + (a.project.result?.critics_score ?? 0) * 2))[0];
    const bestSupport = supportCandidates.sort((a, b) => ((b.member.stats.acting ?? b.member.stats.overall) + (b.project.result?.critics_score ?? 0) * 2) - ((a.member.stats.acting ?? a.member.stats.overall) + (a.project.result?.critics_score ?? 0) * 2))[0];
    const updatedAwards = { ...useGameStore.getState().careerAwards };
    for (const actorId of new Set([bestLead?.member.id, bestSupport?.member.id].filter((id): id is string => Boolean(id)))) {
      updatedAwards[actorId] = (updatedAwards[actorId] ?? 0) + 1;
    }
    useGameStore.setState({ careerAwards: updatedAwards });
    addCash(festival.prestige * 110000);
    const winnersText = [
      `أفضل عمل: ${winner.title}`,
      bestDirector ? `أفضل مخرج: ${bestDirector.member.name}` : "",
      bestLead ? `أفضل ممثل دور أول: ${bestLead.member.name}` : "",
      bestSupport ? `أفضل ممثل دور ثانٍ: ${bestSupport.member.name}` : "",
      bestWriter ? `أفضل سيناريو: ${bestWriter.member.name}` : "",
    ].filter(Boolean).join(" · ");
    addHistory({ year, kind: "award", text: `في ${festival.name} — ${winnersText}.` });
    setToast(`اكتمل حفل ${festival.name}! أفضل عمل: ${winner.title}.`);
  }

  const navItems: { id: Screen; label: string; icon: ElementType }[] = [
    { id: "overview", label: "مركز القيادة", icon: Home }, { id: "create", label: "إنتاج عمل جديد", icon: FolderPlus },
    { id: "production", label: "غرفة الإنتاج", icon: Clapperboard }, { id: "awards", label: "المهرجانات والجوائز", icon: Trophy },
    { id: "leaderboard", label: "لوحة المتصدرين", icon: BarChart3 }, { id: "settings", label: "الإعدادات والبيانات", icon: Settings },
  ];
  const projectsReleased = projects.filter((p) => p.status === "released");
  const totalRevenue = projectsReleased.reduce((sum, p) => sum + (p.boxOffice ?? 0), 0);
    const rosterActors = db.actors;
  const actorOptions = rosterActors.map((actor) => ({ value: actor.id, label: `${actor.name} · ${actor.stats.overall} OVR` }));
  const crewOptions = (role: CrewMember["role"]) => db.crew.filter((member) => member.role === role).map((member) => ({ value: member.id, label: `${member.name} · ${member.stats.overall} OVR` }));
  const formCastIds = uniq([form.lead1, form.lead2, form.antagonist, form.support1, form.support2, form.support3, form.support4, form.cameo1, form.cameo2]);
  const formCrewIds = uniq([form.director, form.writer1, form.writer2, form.cinematographer, form.composer, form.editor]);
  const founderSalaryFactor = studio?.perk === "negotiator" ? .85 : 1;
  const estimatedSalary = rosterActors.filter((actor) => formCastIds.includes(actor.id)).reduce((sum, actor) => sum + actor.base_salary * founderSalaryFactor * (actor.id === negotiationTarget ? 1 - draftDiscount : 1), 0)
    + db.crew.filter((member) => formCrewIds.includes(member.id)).reduce((sum, member) => sum + member.base_salary * founderSalaryFactor, 0);
  const synergy = getGenreSynergy(form.primaryGenre, form.secondaryGenre);

  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="brand-word text-2xl">HYP<span>TRIX</span></div><div className="mt-3 text-xs text-muted">جارٍ تحميل أرشيف الاستوديو المحلي...</div><div className="progress-track mt-4 w-48"><span style={{ width: "70%" }}/></div></div></div>;
  }

  if (!hasStudio || !studio) {
    return <main className="founder-screen">
      <div className="founder-layout">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="founder-hero panel">
          <div className="absolute -top-28 -left-24 w-72 h-72 rounded-full bg-amber-300/10 blur-3xl"/>
          <div className="relative"><div className="brand"><div className="logo-stage !min-h-0 !w-12 !h-12"><LogoMark size={43}/></div><div><div className="brand-word">HYP<span>TRIX</span></div><div className="brand-sub">CINEMA & TELEVISION TYCOON</div></div></div>
            <div className="founder-hero-copy"><div className="eyebrow">YOUR EMPIRE STARTS HERE</div><h1 className="text-4xl sm:text-5xl font-black leading-[1.2] mt-4">من فكرة صغيرة...<br/><span className="gold-text">إلى إمبراطورية</span><br/>سينمائية.</h1><p className="text-sm text-muted leading-8 mt-5 max-w-md">وقّع النجوم، اصنع الحكايات، راهن بميزانيتك، وواجه منافسين لا ينتظرون أحدًا. كل قرار يترك أثرًا في تاريخ شركتك.</p></div>
          </div>
          <div className="founder-facts relative grid grid-cols-3 gap-2"><div className="panel-soft p-3"><Film size={18} className="gold-text"/><div className="text-lg font-black mt-2">∞</div><div className="text-[9px] text-muted">قصص لا تنتهي</div></div><div className="panel-soft p-3"><Users size={18} className="gold-text"/><div className="text-lg font-black mt-2">40+</div><div className="text-[9px] text-muted">شعار مركب</div></div><div className="panel-soft p-3"><Sparkles size={18} className="gold-text"/><div className="text-lg font-black mt-2">AI</div><div className="text-[9px] text-muted">عالم يتذكر</div></div></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="founder-form panel">
          <div className="flex items-center justify-between"><div><div className="eyebrow">STUDIO FOUNDING</div><h2 className="text-2xl font-black mt-2">تأسيس شركة الإنتاج</h2><p className="text-xs text-muted mt-2">الخطوة الأولى في صناعة اسم لا ينسى.</p></div><span className="tag tag-gold">01 / 04</span></div>
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <label className="field-wrap"><span className="field-label">اسم شركة الإنتاج</span><input className="field" placeholder="مثال: العقرب ستوديوز" value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })}/></label>
            <label className="field-wrap"><span className="field-label">اسم المدير التنفيذي</span><input className="field" placeholder="اسمك داخل عالم اللعبة" value={setup.ceo} onChange={(e) => setSetup({ ...setup, ceo: e.target.value })}/></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <SelectField label="نقطة الانطلاق الجغرافية" value={setup.market} onChange={(value) => setSetup({ ...setup, market: value as Market })} options={[{ value: "egypt", label: "مصر — المستوى الأول" }]}/>
            <SelectField label="خلفية المؤسس / الميزة" value={setup.perk} onChange={(value) => setSetup({ ...setup, perk: value as FounderPerk })} options={[{ value: "visionary", label: "مخرج عبقري سابق · +10% جودة فنية" }, { value: "marketer", label: "حوت تسويق · +15% افتتاحية الشباك" }, { value: "negotiator", label: "مفاوض شرس · خصم 15% أجور" }]}/>
          </div>
          <div className="divider"/>
          <div className="flex items-center justify-between gap-3"><div><div className="section-title">هوية الاستوديو — نظام شعارات مركبة</div><div className="section-sub">10 رموز × 5 إطارات × 5 لوحات = 250 تركيبة أصلية.</div></div><div className="logo-stage !min-h-0 w-24 h-24 shrink-0"><LogoMark emblem={setup.emblem} frame={setup.frame} palette={setup.palette} size={82}/></div></div>
          <div className="mt-4"><div className="field-label mb-2">الرمز الأساسي</div><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{EMBLEMS.map((e) => <button key={e.id} className={`chip-option ${setup.emblem === e.id ? "selected" : ""}`} onClick={() => setSetup({ ...setup, emblem: e.id })}>{e.label}</button>)}</div></div>
          <div className="mt-4"><div className="field-label mb-2">الإطار الخارجي</div><div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{FRAMES.map((f) => <button key={f.id} className={`chip-option ${setup.frame === f.id ? "selected" : ""}`} onClick={() => setSetup({ ...setup, frame: f.id })}>{f.label}</button>)}</div></div>
          <div className="mt-4"><div className="field-label mb-2">الباليت اللوني</div><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{PALETTES.map((p) => <button key={p.id} className={`chip-option flex items-center gap-2 ${setup.palette === p.id ? "selected" : ""}`} onClick={() => setSetup({ ...setup, palette: p.id })}><span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg,${p.main},${p.secondary})` }}/>{p.label}</button>)}</div></div>
          <div className="divider"/>
          <div className="grid sm:grid-cols-3 gap-2 mb-5">
            <div className="panel-soft p-3"><Sparkles size={16} className="gold-text"/><div className="text-xs font-black mt-2">الرؤية الفنية</div><div className="text-[9px] text-muted mt-1">جودة أعلى للعمل</div></div>
            <div className="panel-soft p-3"><Megaphone size={16} className="gold-text"/><div className="text-xs font-black mt-2">التسويق</div><div className="text-[9px] text-muted mt-1">دفعة في أسبوع الافتتاح</div></div>
            <div className="panel-soft p-3"><HeartHandshake size={16} className="gold-text"/><div className="text-xs font-black mt-2">التفاوض</div><div className="text-[9px] text-muted mt-1">توفير في الأجور</div></div>
          </div>
          <button className="btn btn-gold w-full !min-h-12 text-sm" onClick={startStudio}>تأسيس الاستوديو وبدء اللعبة <Rocket size={17}/></button>
          <div className="mt-4"><DatabaseManager compact/></div>
        </motion.div>
      </div>
    </main>;
  }

  // The outer setup gate above guarantees a studio for every in-game screen.
  // Capture the narrowed value so nested render functions retain the non-null type.
  const activeStudio = studio;

  function renderOverview() {
    return <>
      <PageHeading kicker="EXECUTIVE CONTROL ROOM" title={`صباح السينما، ${activeStudio.ceo}`} desc={`أنت الآن تقود ${activeStudio.name}. كل أسبوع يفتح فرصة أو يصنع أزمة.`} action={<button className="btn btn-gold" onClick={() => { setForm(initialForm); setDraftDiscount(0); setCreateStep("concept"); setScreen("create"); }}><Plus size={16}/> إنتاج عمل جديد</button>}/>
      <div className="dashboard-metrics grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="السيولة المتاحة" value={money(activeStudio.cash)} foot="جنيه مصري · نقد متاح" icon={Wallet}/>
        <Metric label="إجمالي إيرادات الأعمال" value={money(totalRevenue)} foot={`${projectsReleased.length} إصدار مطروح`} icon={Banknote} tone="green"/>
        <Metric label="سمعة الشركة" value={`${activeStudio.reputation}/100`} foot="تفتح أسواقًا ومهرجانات" icon={Star}/>
        <Metric label="الأسبوع / السنة" value={`${week} / ${year}`} foot={MARKET_LABELS[activeStudio.market]} icon={CalendarDays}/>
      </div>
      <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4 mt-4">
        <div className="panel p-5">
          <div className="flex items-start justify-between"><div><div className="section-kicker">STUDIO PORTFOLIO</div><h3 className="section-title mt-1">أعمال الاستوديو</h3><p className="section-sub">ملفات الإنتاج، الحالة الحالية، والعوائد المحققة.</p></div><button className="btn btn-outline" onClick={() => setScreen("create")}><Plus size={14}/> عمل جديد</button></div>
          {projects.length === 0 ? <div className="empty-state mt-5"><Clapperboard size={27} className="mx-auto gold-text"/><div className="text-sm font-black text-white mt-3">أول كرسي مخرج ينتظرك</div><p className="text-xs mt-2">ابدأ بأول فيلم أو مسلسل، وابنِ طاقمك بحساب.</p><button className="btn btn-gold mt-4" onClick={() => setScreen("create")}>إنشاء أول مشروع <ArrowIcon/></button></div> : <div className="mt-5 space-y-2">{projects.slice(0, 5).map((p) => <button key={p.id} onClick={() => { setActiveProject(p.id); setScreen(p.status === "released" ? "results" : "production"); }} className="w-full panel-soft p-3 flex items-center gap-3 text-right hover:border-amber-300/30 transition"><div className="w-10 h-10 rounded-xl bg-amber-300/10 grid place-items-center text-amber-300"><Film size={18}/></div><div className="flex-1 min-w-0"><div className="text-xs font-black truncate">{p.title}</div><div className="text-[9px] text-muted mt-1">{p.format === "film" ? "فيلم سينمائي" : `مسلسل · ${p.episodes} حلقة`} · {labelGenre(p.primaryGenre)}</div></div><span className={`tag ${p.status === "released" ? "tag-gold" : ""}`}>{p.status === "released" ? "مطروح" : p.status === "post" ? "ما بعد الإنتاج" : p.status === "production" ? "قيد التصوير" : "بانتظار الطاقم"}</span>{p.boxOffice ? <b className="text-xs gold-text">{money(p.boxOffice)}</b> : null}</button>)}</div>}
        </div>
        <div className="space-y-4">
          <div className="panel p-5"><div className="flex items-center gap-3"><div className="logo-stage !min-h-0 w-16 h-16 shrink-0"><LogoMark {...activeStudio.logo} size={58}/></div><div className="min-w-0"><div className="text-[9px] text-muted">PRODUCTION HOUSE</div><div className="text-sm font-black truncate mt-1">{activeStudio.name}</div><div className="text-[10px] text-muted mt-1">الرئيس التنفيذي: {activeStudio.ceo}</div></div></div><div className="divider"/><div className="flex items-center justify-between"><span className="text-[10px] text-muted">السوق الحالي</span><span className="tag tag-gold">{MARKET_LABELS[activeStudio.market]}</span></div><div className="mt-4 space-y-3">{MARKET_REQUIREMENTS.map((m) => { const unlocked = activeStudio.cash >= m.cash && activeStudio.reputation >= m.rep; const already = ["egypt", "gulf", "europe", "hollywood"].indexOf(activeStudio.market) >= ["egypt", "gulf", "europe", "hollywood"].indexOf(m.key); return <div key={m.key} className="flex items-center gap-2"><div className="flex-1"><div className="flex justify-between text-[10px]"><span>{MARKET_LABELS[m.key]}</span><span className="text-muted">{m.tagline}</span></div><div className="progress-track mt-1.5"><span style={{ width: `${Math.min(100, Math.max(activeStudio.cash / m.cash * 65, activeStudio.reputation / m.rep * 35))}%` }}/></div></div>{already ? <CheckCircle2 size={15} className="green-text"/> : <button disabled={!unlocked} onClick={() => unlockMarket(m.key)} className="btn btn-outline !px-2 !min-h-7 !text-[9px]">فتح</button>}</div>; })}</div></div>
          <div className="panel p-5"><div className="flex items-center gap-2"><Activity size={16} className="gold-text"/><h3 className="section-title">نبض السوق</h3></div><p className="section-sub">كل دقيقة حقيقية تساوي يومًا داخل عالم اللعبة.</p><div className="flex items-center justify-between mt-4"><div><div className="text-2xl font-black">اليوم {gameDay}<span className="text-sm text-muted"> · W{week} / 52</span></div><div className="text-[9px] text-muted">السنة {year}</div></div><span className="tag">دقيقة حقيقية = يوم</span></div><div className="progress-track mt-3"><span style={{ width: `${week / 52 * 100}%` }}/></div></div>
        </div>
      </div>
      <div className="panel p-5 mt-4"><div className="flex items-center justify-between gap-3"><div><div className="section-kicker">WORLD HISTORY / MEMORY</div><h3 className="section-title mt-1">ذاكرة عالم السينما</h3><p className="section-sub">الأحداث السابقة تُرسل كسياق تراكمي إلى محرك التقييم.</p></div><span className="tag">{worldHistory.length} حدث مسجل</span></div>{worldHistory.length ? <div className="mt-4 space-y-2 max-h-48 overflow-auto">{worldHistory.slice(0, 5).map((entry, i) => <div key={`${entry.year}-${i}`} className="flex items-start gap-3 text-[11px]"><span className="text-[9px] gold-text font-black pt-0.5">{entry.year}</span><p className="text-muted leading-6">{entry.text}</p></div>)}</div> : <p className="text-xs text-muted mt-4">سجل التاريخ فارغ. أول قرار تجاري أو عرض سينمائي سيبدأ كتابة الحكاية.</p>}</div>
      <div className="flex flex-wrap gap-2 mt-4"><button className="btn btn-outline" onClick={() => setShowVip(true)}><Crown size={15}/> العرق مقابل VIP</button><button className="btn btn-ghost" onClick={publishLeaderboard}><Globe2 size={15}/> نشر شركتي عالميًا</button><button className="btn btn-ghost" onClick={() => setScreen("awards")}><Trophy size={15}/> إدارة الجوائز</button></div>
    </>;
  }

  function renderCreate() {
    return <>
      <PageHeading kicker="DEVELOPMENT & GREENLIGHT" title={createStep === "concept" ? "اصنع فكرة فيلمك أولًا" : "كوّن طاقم الحلم"} desc={createStep === "concept" ? "ابدأ بالعنوان والنوع والحبكة. بعد اعتماد الفكرة نعرض لك سوق النجوم والطاقم للتفاوض." : "اختَر المخرج والمؤلفين والنجوم، ثم أرسل عروضًا رسمية وانتظر ردودهم داخل زمن اللعبة."} action={<button className="btn btn-ghost" onClick={() => createStep === "casting" ? setCreateStep("concept") : setScreen("overview")}>{createStep === "casting" ? "العودة للفكرة" : "العودة لمركز القيادة"}</button>}/>
      <div className="create-workspace grid xl:grid-cols-[1fr_310px] gap-4 items-start">
        <div className="create-sections space-y-4">
          <section className="panel p-5"><div className="flex items-center gap-2"><Film size={17} className="gold-text"/><h3 className="section-title">01 — بيانات المشروع والصيغة</h3></div><div className="grid sm:grid-cols-2 gap-3 mt-4"><label className="field-wrap"><span className="field-label">اسم الفيلم / المسلسل</span><input className="field" placeholder="عنوان يعلق في أذهان الجمهور" value={form.title} onChange={(e) => changeForm("title", e.target.value)}/></label><SelectField label="صيغة العمل" value={form.format} onChange={(v) => changeForm("format", v as FormState["format"])} options={[{ value: "film", label: "فيلم سينمائي — دور عرض أولاً" }, { value: "series", label: "مسلسل درامي — تلفزيون / منصة" }]}/></div>
            {form.format === "series" && <div className="grid sm:grid-cols-2 gap-3 mt-3"><SelectField label="عدد حلقات الموسم" value={String(form.episodes)} onChange={(v) => changeForm("episodes", Number(v))} options={[7, 10, 15, 30].map((n) => ({ value: String(n), label: `${n} حلقة` }))}/><SelectField label="موسم العرض" value={form.season} onChange={(v) => changeForm("season", v as FormState["season"])} options={[{ value: "ramadan", label: "موسم رمضان — منافسة وإعلانات ضخمة" }, { value: "off_season", label: "خارج الموسم — منصة أولاً" }]}/></div>}
            <div className="grid sm:grid-cols-2 gap-3 mt-3"><SelectField label="التصنيف الأساسي" value={form.primaryGenre} onChange={(v) => changeForm("primaryGenre", v as Genre)} options={GENRES.map((g) => ({ value: g.id, label: g.label }))}/><SelectField label="التصنيف الفرعي" value={form.secondaryGenre} onChange={(v) => changeForm("secondaryGenre", v as Genre)} options={GENRES.map((g) => ({ value: g.id, label: g.label }))}/></div>
            <div className={`notice mt-3 ${synergy.score > 0 ? "notice-success" : "notice-error"}`}><Sparkles size={16}/><p><b>{synergy.label}</b> — {isVip ? (synergy.score > 0 ? `توافق التصنيفين يمنح +${synergy.score} نقطة.` : `الخلطة جريئة وتحتاج مخرجًا ومؤلفًا شديدي التميز (${synergy.score} نقطة).`) : "تفاصيل نقاط التوافق المخفية تظهر في وضع رئيس الاستوديو VIP."}</p></div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3"><SelectField label="التصنيف العمري" value={form.ageRating} onChange={(v) => changeForm("ageRating", v as FormState["ageRating"])} options={[{ value: "G", label: "G — عائلي للجميع" }, { value: "12+", label: "12+ — مراهقون" }, { value: "16+", label: "16+ — جمهور ناضج" }, { value: "18+", label: "18+ — للكبار فقط" }]}/><SelectField label="موسم الطرح السينمائي" value={form.releaseSeason} onChange={(v) => changeForm("releaseSeason", v)} options={RELEASE_SEASONS.map((v) => ({ value: v, label: v }))}/></div>
            <label className="field-wrap mt-3"><span className="field-label">ملخص القصة والحبكة والنهاية — اكتب بحرية</span><textarea className="field textarea" placeholder="اكتب القصة كما تتخيلها. اذكر دوافع الشخصيات، العقدة، التحولات، والنهاية..." value={form.summary} onChange={(e) => changeForm("summary", e.target.value)}/></label><div className="text-[9px] text-muted mt-1">{form.summary.length} حرف · سيُستخدم النص كاملًا في تقييم العمل.</div>
          </section>
          {createStep === "concept" && <section className="panel p-5"><div className="flex items-center gap-2"><Sparkles className="text-violet-500"/><h3 className="section-title">ملف الفكرة جاهز للعرض</h3></div><p className="section-sub">راجع العنوان والحبكة والتصنيف. الخطوة التالية تفتح لك كتالوج المخرجين والمؤلفين والممثلين.</p><button className="btn btn-gold w-full mt-4" disabled={!form.title.trim() || form.summary.trim().length < 30} onClick={() => setCreateStep("casting")}>اعتماد الفكرة واختيار الطاقم <ChevronDown size={16}/></button></section>}
          {createStep === "casting" && <><section className="panel p-5"><div className="flex items-center gap-2"><Users size={17} className="gold-text"/><h3 className="section-title">02 — تشكيل فريق العمل (FC Cards)</h3></div><p className="section-sub">كوّن ورشة فنية وطاقم تمثيل متوازن. الحد الأدنى خمسة ممثلين.</p>
            <div className="mt-4"><div className="text-xs font-black mb-2 gold-text">كتالوج المخرجين والمؤلفين والطاقم</div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">{db.crew.map((member) => <CrewCard key={member.id} member={member} selected={formCrewIds.includes(member.id)} onClick={() => { if (member.role === "director") changeForm("director", member.id); else if (member.role === "screenwriter") { if (!form.writer1 || form.writer1 === member.id) changeForm("writer1", member.id); else changeForm("writer2", member.id); } else if (member.role === "cinematographer") changeForm("cinematographer", member.id); else if (member.role === "composer") changeForm("composer", member.id); else changeForm("editor", member.id); }}/>)}</div></div>
            <div className="mt-5"><div className="text-xs font-black mb-2 gold-text">كتالوج الممثلين بالكامل</div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">{db.actors.map((actor) => <ActorCard key={actor.id} actor={actor} selected={formCastIds.includes(actor.id)} onClick={() => { if (!form.lead1 || form.lead1 === actor.id) { changeForm("lead1", actor.id); setNegotiationTarget(actor.id); } else if (!form.lead2 || form.lead2 === actor.id) changeForm("lead2", actor.id); else if (!form.support1 || form.support1 === actor.id) changeForm("support1", actor.id); else if (!form.support2 || form.support2 === actor.id) changeForm("support2", actor.id); else if (!form.antagonist || form.antagonist === actor.id) changeForm("antagonist", actor.id); else setToast("اكتملت خانات التمثيل الأساسية. استخدم القوائم لتغيير الأدوار أو إضافة ضيوف الشرف."); }}/>)}</div><p className="text-[9px] text-muted mt-2">اضغط على بطاقة لتعيينها تلقائيًا في خانة الدور المتاحة التالية، ويمكنك ضبط الدور بدقة من القوائم بالأسفل.</p></div>
            <div className="mt-4"><div className="text-xs font-black mb-2 gold-text">الطاقم الفني خلف الكاميرا</div><div className="grid sm:grid-cols-2 gap-3"><SelectField label="المخرج — إجباري" value={form.director} onChange={(v) => changeForm("director", v)} options={crewOptions("director")}/><SelectField label="المؤلف الأول — إجباري" value={form.writer1} onChange={(v) => changeForm("writer1", v)} options={crewOptions("screenwriter")}/><SelectField label="المؤلف الثاني — اختياري" value={form.writer2} onChange={(v) => changeForm("writer2", v)} options={crewOptions("screenwriter")}/><SelectField label="مدير التصوير" value={form.cinematographer} onChange={(v) => changeForm("cinematographer", v)} options={crewOptions("cinematographer")}/><SelectField label="الموسيقار" value={form.composer} onChange={(v) => changeForm("composer", v)} options={crewOptions("composer")}/><SelectField label="المونتير / مشرف VFX" value={form.editor} onChange={(v) => changeForm("editor", v)} options={crewOptions("editor_vfx")}/></div></div>
            <div className="divider"/><div className="text-xs font-black mb-2 gold-text">التمثيل — الأدوار الرئيسية والمساندة</div><div className="grid sm:grid-cols-2 gap-3"><SelectField label="البطل / النجمة الأولى" value={form.lead1} onChange={(v) => { changeForm("lead1", v); setNegotiationTarget(v); }} options={actorOptions}/><SelectField label="البطل الثاني — اختياري" value={form.lead2} onChange={(v) => changeForm("lead2", v)} options={actorOptions}/><SelectField label="الشرير الرئيسي / الخصم" value={form.antagonist} onChange={(v) => changeForm("antagonist", v)} options={actorOptions}/><SelectField label="دور مساعد 1" value={form.support1} onChange={(v) => changeForm("support1", v)} options={actorOptions}/><SelectField label="دور مساعد 2" value={form.support2} onChange={(v) => changeForm("support2", v)} options={actorOptions}/><SelectField label="دور مساعد 3 — اختياري" value={form.support3} onChange={(v) => changeForm("support3", v)} options={actorOptions}/><SelectField label="دور مساعد 4 — اختياري" value={form.support4} onChange={(v) => changeForm("support4", v)} options={actorOptions}/><SelectField label="ضيف شرف 1 — اختياري" value={form.cameo1} onChange={(v) => changeForm("cameo1", v)} options={actorOptions}/><SelectField label="ضيف شرف 2 — اختياري" value={form.cameo2} onChange={(v) => changeForm("cameo2", v)} options={actorOptions}/></div>
            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mt-4"><SelectField label="النجم المستهدف بالتفاوض" value={negotiationTarget} onChange={setNegotiationTarget} options={actorOptions.filter((option) => formCastIds.includes(option.value))}/><button className="btn btn-outline" onClick={() => triggerContextReward("vip_dinner", () => { setDraftDiscount(.2); setToast("تم تخفيض أجر النجم المختار 20% عبر عزومة VIP."); })}><HeartHandshake size={15}/> عزومة عشاء VIP لتخفيض الأجر 20%</button></div><div className="mt-2"><span className="tag">{formCastIds.length} ممثل في التشكيل</span></div>
            {draftDiscount > 0 && <div className="notice notice-success mt-3"><CheckCircle2 size={15}/><p>خصم تفاوضي مُفعّل: 20% من أجر الممثلين في تقدير المشروع.</p></div>}
            {detectEgoRisk({ id: "preview", title: "", summary: "", format: "film", episodes: 0, season: "off_season", primaryGenre: form.primaryGenre, secondaryGenre: form.secondaryGenre, ageRating: "16+", crew: { director: form.director, writers: [form.writer1], cinematographer: form.cinematographer, composer: form.composer, editor_vfx: form.editor }, cast: { leads: [form.lead1, form.lead2], antagonist: form.antagonist, supporting: [form.support1, form.support2, form.support3, form.support4], cameos: [form.cameo1, form.cameo2] }, budget: form.budget, marketingBudget: form.marketingBudget, releaseSeason: form.releaseSeason, screens: form.screens, platformId: form.platformId, status: "draft", productionProgress: 0, crises: [], hype: 0, qualityModifier: 0, negotiationDiscount: draftDiscount, contracts: [], createdYear: year }, db.actors) && <div className="notice notice-error mt-3"><Shield size={15}/><p>خطر غرور مرتفع: يوجد نجمان من أصحاب Ego أعلى من 90 في الأدوار الرئيسية. خلاف محتمل على ترتيب الأسماء والبوستر.</p></div>}
            <div className="mt-4"><div className="text-[10px] text-muted mb-2">معاينة بطاقات الطاقم الفني</div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{db.crew.filter((member) => formCrewIds.includes(member.id)).map((member) => <CrewCard key={member.id} member={member}/>)}</div><div className="text-[10px] text-muted mb-2 mt-4">معاينة بطاقات الأبطال</div><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{db.actors.filter((actor) => formCastIds.includes(actor.id)).slice(0, 4).map((actor) => <ActorCard key={actor.id} actor={actor}/>)}</div></div>
          </section>
          </>}
        </div>
        <aside className="create-summary space-y-4 xl:sticky xl:top-24"><div className="panel p-5"><div className="section-kicker">GREENLIGHT SUMMARY</div><h3 className="section-title mt-1">ملف القرار</h3><div className="poster-card mt-4 !min-h-[190px]"><LogoMark {...activeStudio.logo} size={58}/><div className="text-[9px] tracking-[.25em] gold-text mt-3">A {activeStudio.name.toUpperCase()} PRODUCTION</div><div className="poster-title mt-3">{form.title || "عنوان العمل"}</div><div className="text-[9px] text-muted mt-3">{labelGenre(form.primaryGenre)} / {labelGenre(form.secondaryGenre)}</div></div><div className="divider"/><div className="flex justify-between text-[11px]"><span className="text-muted">الأجور التعاقدية التقديرية</span><b className="gold-text">{money(estimatedSalary)}</b></div><div className="flex justify-between text-[11px] mt-3"><span className="text-muted">الميزانية</span><b>بعد موافقة الطاقم</b></div><div className="flex justify-between text-[11px] mt-3"><span className="text-muted">عدد الممثلين</span><b>{formCastIds.length} / 9</b></div><div className="flex justify-between text-[11px] mt-3"><span className="text-muted">ملاءمة الأنواع</span><b className={synergy.score > 0 ? "green-text" : "red-text"}>{synergy.label}</b></div><div className="divider"/><div className="flex justify-between text-[11px]"><span className="text-muted">السيولة قبل الميزانية</span><b className={activeStudio.cash >= estimatedSalary ? "green-text" : "red-text"}>{money(activeStudio.cash - estimatedSalary)}</b></div>{createStep === "concept" ? <button className="btn btn-gold w-full mt-4 !min-h-12" disabled={!form.title.trim() || form.summary.trim().length < 30} onClick={() => setCreateStep("casting")}>اعتماد الفكرة واختيار الطاقم <ChevronDown size={16}/></button> : <button className="btn btn-gold w-full mt-4 !min-h-12" disabled={!form.title.trim() || formCastIds.length < 5} onClick={createNewProject}>عرض فكرة الفيلم والتفاوض مع الطاقم <HeartHandshake size={16}/></button>}<p className="text-[9px] text-muted mt-3 leading-5">ستحدد ميزانية الإنتاج والتسويق بعد موافقة جميع أفراد الطاقم، ولن تُخصم أي أموال عند إرسال العروض.</p></div>
          <div className="panel p-4"><div className="flex items-center gap-2"><Info size={15} className="gold-text"/><span className="text-xs font-black">نصائح مدير الاستوديو</span></div><ul className="text-[10px] text-muted leading-7 mt-2 list-disc pr-4"><li>التوافق بين النوع والمخرج والمؤلف يؤثر في سقف النقاد.</li><li>سحب النجم الجماهيري مؤثر بقوة في افتتاحية الشباك.</li><li>المسلسلات تتطلب بيع الحقوق إلى منصة بميزانية مناسبة.</li></ul></div>
        </aside>
      </div>
    </>;
  }

  function renderProduction() {
    if (!activeProject) return <><PageHeading kicker="PRODUCTION FLOOR" title="غرفة الإنتاج" desc="لا توجد مشاريع نشطة في الوقت الحالي."/><div className="empty-state"><Clapperboard size={28} className="mx-auto gold-text"/><p className="text-sm font-black text-white mt-3">ابدأ بتطوير أول عمل</p><button className="btn btn-gold mt-4" onClick={() => setScreen("create")}>إنتاج عمل جديد <Plus size={15}/></button></div></>;
    const project = activeProject;
    const cost = estimateCost(project, db.actors, db.crew, studio);
    const openCrisis = project.crises.find((crisis) => !crisis.resolved);
    return <>
      <PageHeading kicker="PRODUCTION & CRISIS MANAGEMENT" title="غرفة الإنتاج" desc={`متابعة مراحل تنفيذ «${project.title}» والتحكم في الأزمات.`} action={<span className="tag tag-gold">{project.status === "draft" ? "بانتظار موافقات الطاقم" : project.status === "production" ? "التصوير جارٍ" : project.status === "post" ? "ما بعد الإنتاج" : "تم الطرح"}</span>}/>
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="space-y-4">
          <section className="panel p-5"><div className="flex items-center gap-3"><div className="logo-stage !min-h-0 w-16 h-16 shrink-0"><LogoMark {...activeStudio.logo} size={57}/></div><div className="min-w-0"><div className="section-kicker">PROJECT FILE / {project.format === "film" ? "FEATURE FILM" : "SERIES"}</div><h2 className="text-xl font-black mt-1 truncate">{project.title}</h2><div className="text-[10px] text-muted mt-1">{labelGenre(project.primaryGenre)} · {labelGenre(project.secondaryGenre)} · {project.ageRating}</div></div></div><div className="divider"/><div className="grid grid-cols-3 gap-2"><div className="panel-soft p-3"><div className="text-[9px] text-muted">تقدم التصوير</div><div className="text-lg font-black gold-text mt-1">{project.productionProgress}%</div></div><div className="panel-soft p-3"><div className="text-[9px] text-muted">الأزمات المتبقية</div><div className="text-lg font-black mt-1">{project.crises.filter((c) => !c.resolved).length}</div></div><div className="panel-soft p-3"><div className="text-[9px] text-muted">ضجة إعلامية</div><div className="text-lg font-black mt-1">{project.hype}</div></div></div><div className="progress-track mt-4 !h-3"><span style={{ width: `${project.productionProgress}%` }}/></div><div className="flex justify-between text-[9px] text-muted mt-2"><span>تجهيز اللوكيشن</span><span>التصوير</span><span>المونتاج والتسليم</span></div>{project.productionStartDay !== undefined && <div className="panel-soft p-3 mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px]"><span className="text-muted">بداية التصوير: اليوم {project.productionStartDay}</span><span className="text-muted">{project.productionEndDay !== undefined ? `انتهى فعليًا في اليوم ${project.productionEndDay}` : `الموعد المخطط: اليوم ${project.plannedEndDay ?? "—"} · متبقي ${Math.max(0, (project.plannedEndDay ?? gameDay) - gameDay)} يوم`}</span></div>}</section>
          {project.status === "draft" && <section className="panel p-5">
            <div className="flex items-center gap-2"><HeartHandshake size={18} className="gold-text"/><h3 className="section-title">عروض التعاقد وردود الوكلاء</h3></div>
            <p className="section-sub">تم إرسال الفكرة والسيناريو. كل عضو يراجع الدور والأجر والتوافق، وتصل الردود بعد مرور يوم داخل اللعبة.</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="panel-soft p-3"><div className="text-[9px] text-muted">وافقوا</div><b className="text-xl green-text">{project.contracts.filter((c) => c.response === "accepted").length}</b></div>
              <div className="panel-soft p-3"><div className="text-[9px] text-muted">بانتظار الرد</div><b className="text-xl">{project.contracts.filter((c) => c.response === "pending").length}</b></div>
              <div className="panel-soft p-3"><div className="text-[9px] text-muted">رفضوا</div><b className="text-xl red-text">{project.contracts.filter((c) => c.response === "rejected").length}</b></div>
            </div>
            <div className="space-y-2 mt-4">{project.contracts.map((contract) => <div key={contract.memberId} className="panel-soft p-3">
              <div className="flex items-center justify-between gap-2"><b className="text-xs">{contract.memberName}</b><span className={`tag ${contract.response === "accepted" ? "tag-gold" : ""}`}>{contract.response === "accepted" ? "وافق" : contract.response === "rejected" ? "رفض" : `يرد في اليوم ${contract.responseDay}`}</span></div>
              <div className="text-[10px] text-muted mt-1">عرض {money(contract.negotiatedSalary)} · {contract.role}</div>
              {contract.responseReason && <p className="text-xs leading-6 mt-2">{contract.responseReason}</p>}
            </div>)}</div>
            {project.contracts.some((c) => c.response === "rejected") && <button className="btn btn-outline w-full mt-3" onClick={() => {
              const contracts = project.contracts.map((c) => c.response === "rejected" ? { ...c, response: "pending" as const, responseDay: gameDay + 1, responseReason: undefined } : c);
              updateProject(project.id, { contracts });
              setToast("أعدنا إرسال العروض المرفوضة. انتظر يومًا داخل اللعبة.");
            }}>إعادة التفاوض مع الرافضين</button>}
            {project.contracts.length > 0 && project.contracts.every((c) => c.response === "accepted") && <>
              <div className="notice notice-success mt-3"><CheckCircle2 size={16}/><p>اكتمل الطاقم بالكامل. الآن حدد ميزانية الإنتاج والتسويق قبل بدء التصوير.</p></div>
              <section className="panel-soft p-4 mt-4">
                <div className="flex items-center gap-2"><Banknote size={17} className="gold-text"/><h4 className="text-sm font-black">تحديد ميزانية المشروع</h4></div>
                <p className="text-[10px] text-muted mt-1">الميزانية هنا قابلة للتعديل قبل اعتمادها، ولن تُخصم إلا عند بدء التصوير.</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  {([["sets", "الديكور والمواقع"], ["costumes", "الملابس والإكسسوارات"], ["vfx", "الخدع البصرية VFX"], ["extras", "المجاميع والكومبارس"]] as const).map(([key, label]) => <label key={key} className="panel p-3 block">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold"><span>{label}</span><b className="gold-text">{money(project.budget[key])}</b></div>
                    <input className="range mt-3" type="range" min={250000} max={20000000} step={250000} value={project.budget[key]} onChange={(event) => updateProject(project.id, { budget: { ...project.budget, [key]: Number(event.target.value) } })}/>
                  </label>)}
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <label className="field-wrap"><span className="field-label">ميزانية الإعلانات والتسويق: {money(project.marketingBudget)}</span><input className="range" type="range" min={500000} max={40000000} step={500000} value={project.marketingBudget} onChange={(event) => updateProject(project.id, { marketingBudget: Number(event.target.value) })}/></label>
                  <label className="field-wrap"><span className="field-label">عدد شاشات العرض: {project.screens}</span><input className="range" type="range" min={50} max={1000} step={25} value={project.screens} onChange={(event) => updateProject(project.id, { screens: Number(event.target.value) })}/></label>
                </div>
                <div className="mt-3"><SelectField label={project.format === "series" ? "منصة البث / القناة المستهدفة" : "بيع حقوق العرض للمنصة بعد السينما"} value={project.platformId} onChange={(value) => updateProject(project.id, { platformId: value })} options={db.streaming_platforms.map((platform) => ({ value: platform.id, label: `${platform.name} · قدرة شراء ${platform.budget_capacity}` }))}/></div>
              </section>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="panel-soft p-3"><div className="text-[10px] text-muted">تكلفة الإنتاج والتعاقد</div><div className="text-xl font-black gold-text mt-1">{money(cost)}</div></div>
                <div className="panel-soft p-3"><div className="text-[10px] text-muted">السيولة بعد الاعتماد</div><div className="text-xl font-black mt-1">{money(activeStudio.cash - cost)}</div></div>
              </div>
              <button className="btn btn-gold w-full mt-4 !min-h-12" disabled={activeStudio.cash < cost || busyAi} onClick={() => { void startProduction(project); }}>{busyAi ? "جارٍ إعداد أزمات وخطة التصوير..." : "اعتماد الميزانية وبدء التصوير"} <Play size={16}/></button>
            </>}
          </section>}
          {project.status === "production" && <>
            {openCrisis ? <section className="panel p-5 border border-red-500/20"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><div className="icon-tile !bg-red-500/10 !border-red-500/20 !text-red-300"><Zap size={18}/></div><div><div className="section-kicker !text-red-300">LIVE PRODUCTION CRISIS</div><h3 className="section-title mt-1">{openCrisis.title}</h3></div></div><span className="tag !border-red-500/30 !text-red-300">قرار مطلوب</span></div><p className="text-xs text-muted leading-7 mt-4">{openCrisis.description}</p><div className="space-y-2 mt-4">{openCrisis.choices.map((choice, index) => <button key={choice.label} onClick={() => resolveCrisis(project, openCrisis.id, index)} className="w-full panel-soft p-3 text-right hover:border-amber-300/30 transition"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black">{choice.label}</span><span className="text-[9px] text-muted">{choice.cash > 0 ? "+" : ""}{money(choice.cash)} ج.م</span></div><div className="flex gap-3 mt-2 text-[9px]"><span className={choice.hype >= 0 ? "green-text" : "red-text"}>Hype {choice.hype > 0 ? "+" : ""}{choice.hype}</span><span className={choice.quality >= 0 ? "green-text" : "red-text"}>جودة {choice.quality > 0 ? "+" : ""}{choice.quality}</span></div></button>)}</div><div className="divider"/><button className="btn btn-outline w-full" onClick={() => triggerContextReward("gulf_rescue", () => { addCash(20_000_000); addHistory({ year, kind: "business", text: `تمويل خليجي طارئ بقيمة 20 مليون أنقذ ميزانية ${project.title}.` }); })}><Landmark size={15}/> تمويل خليجي طارئ لإنقاذ ميزانية التصوير</button></section>
              : <section className="panel p-5"><div className="flex items-center gap-2"><CheckCircle2 size={18} className="green-text"/><h3 className="section-title">اللوكيشن جاهز — لا توجد أزمة معلّقة</h3></div><p className="section-sub">التصوير يتقدم تلقائيًا بنسبة 14% مع كل يوم داخل اللعبة. لا حاجة لأي قفز يدوي في الجدول.</p><div className="progress-track mt-4"><span style={{ width: `${project.productionProgress}%` }}/></div><div className="text-[10px] text-muted mt-2">المتبقي حتى التسليم: {Math.max(0, Math.ceil((100 - project.productionProgress) / 14))} أيام لعبة تقريبًا.</div></section>}
            <section className="panel p-5"><h3 className="section-title">سجل الأزمات</h3><div className="mt-3 space-y-2">{project.crises.map((crisis) => <div key={crisis.id} className="flex items-center justify-between gap-3 panel-soft p-3"><div className="text-[11px] font-bold">{crisis.title}</div><span className={`tag ${crisis.resolved ? "tag-gold" : ""}`}>{crisis.resolved ? "تم الحسم" : "مفتوحة"}</span></div>)}</div></section>
          </>}
          {project.status === "post" && <section className="panel p-5"><div className="flex items-center gap-2"><Sparkles size={18} className="gold-text"/><h3 className="section-title">مرحلة ما بعد الإنتاج جاهزة</h3></div><p className="section-sub">انتهى التصوير. حان الآن وقت التقييم النقدي والجماهيري ومحاكاة المنافسين في موسم الطرح.</p><div className="grid sm:grid-cols-2 gap-3 mt-4"><div className="panel-soft p-3"><div className="text-[10px] text-muted">ميزانية التسويق</div><div className="text-lg font-black mt-1">{money(project.marketingBudget)}</div></div><div className="panel-soft p-3"><div className="text-[10px] text-muted">شاشات العرض</div><div className="text-lg font-black mt-1">{project.screens.toLocaleString("en-US")}</div></div></div><button className="btn btn-gold w-full mt-4 !min-h-12" disabled={busyAi} onClick={() => releaseProject(project)}>{busyAi ? "النقاد يشاهدون العرض الخاص..." : "إطلاق العمل ومحاكاة السوق"} <Sparkles size={16}/></button><p className="text-[9px] text-muted mt-2">سيُرسل ملخص السيناريو وبيانات العمل وذاكرة العالم إلى محرك AI عند توفر المفاتيح.</p></section>}
          {project.status === "released" && <section className="panel p-5"><div className="flex items-center gap-2"><Trophy size={18} className="gold-text"/><h3 className="section-title">العمل مطروح في السوق</h3></div><p className="section-sub">الإيرادات الحالية: <b className="gold-text">{fullMoney(project.boxOffice ?? 0)}</b> · اليوم {gameDay - (project.releaseDay ?? gameDay)} من العرض</p><div className="progress-track mt-3"><span style={{ width: `${Math.min(100, ((project.boxOffice ?? 0) / Math.max(1, project.revenueTarget ?? 1)) * 100)}%` }}/></div><button className="btn btn-gold w-full mt-4" onClick={() => setScreen("results")}>فتح تقرير النتائج والمراجعات <Newspaper size={16}/></button></section>}
        </div>
        <aside className="space-y-4"><div className="panel p-5"><div className="section-kicker">PRODUCTION CREW</div><h3 className="section-title mt-1">الطاقم الفني</h3><div className="mt-3 space-y-3">{[["المخرج", project.crew.director], ["المؤلف", project.crew.writers.join(" + ")], ["التصوير", project.crew.cinematographer], ["الموسيقى", project.crew.composer], ["المونتاج", project.crew.editor_vfx]].map(([label, id]) => { const members = String(id).split(" + ").map((item) => db.crew.find((member) => member.id === item)?.name).filter(Boolean); return <div key={String(label)} className="flex items-center justify-between gap-2 text-[10px]"><span className="text-muted">{label}</span><b>{members.join("، ") || "—"}</b></div>; })}</div><div className="divider"/><div className="text-[10px] text-muted mb-2">أبطال العمل</div><div className="space-y-2">{[...project.cast.leads, project.cast.antagonist, ...project.cast.supporting, ...project.cast.cameos].map((id) => db.actors.find((actor) => actor.id === id)).filter(Boolean).map((actor) => <div key={actor!.id} className="flex justify-between text-[10px]"><span>{actor!.name}</span><span className="gold-text">{actor!.stats.overall}</span></div>)}</div></div><div className="panel p-5"><div className="flex items-center gap-2"><Gauge size={16} className="gold-text"/><h3 className="section-title">تحكم إنتاجي</h3></div><div className="flex justify-between text-[10px] mt-4"><span className="text-muted">ضجة العمل</span><b>{project.hype}</b></div><div className="progress-track mt-2"><span style={{ width: `${Math.min(100, Math.max(0, project.hype * 4))}%` }}/></div><div className="flex justify-between text-[10px] mt-4"><span className="text-muted">تعديل الجودة</span><b>{project.qualityModifier > 0 ? "+" : ""}{project.qualityModifier}</b></div><div className="progress-track mt-2"><span style={{ width: `${Math.min(100, Math.max(0, 50 + project.qualityModifier * 3))}%` }}/></div><div className="divider"/><div className="text-[10px] text-muted mb-2">العقود والأجور ونقاط الأرباح</div><div className="space-y-2">{project.contracts.slice(0, 10).map((contract) => <div key={contract.memberId} className="panel-soft p-2.5"><div className="flex justify-between gap-2 text-[10px]"><b>{contract.memberName}</b><span className="gold-text">{money(contract.negotiatedSalary)}</span></div><div className="flex justify-between gap-2 text-[8px] text-muted mt-1"><span>{contract.role} · {contract.backendPoints} Backend pts</span><span className={contract.ego > 90 ? "red-text" : ""}>Ego {contract.ego}</span></div></div>)}</div></div></aside>
      </div>
    </>;
  }

  function renderResults() {
    const project = activeProject;
    const result = project?.result;
    if (!project || !result) return <><PageHeading kicker="BOX OFFICE & CRITICS" title="نتائج الإصدار" desc="بعد طرح العمل ستظهر هنا المراجعات، الإيرادات، والضجة الإعلامية."/><div className="empty-state"><Newspaper size={28} className="mx-auto gold-text"/><p className="text-xs mt-3">لا يوجد إصدار مكتمل لعرض نتائجه.</p><button className="btn btn-gold mt-4" onClick={() => setScreen("production")}>الذهاب لغرفة الإنتاج</button></div></>;
    const marketBoard = [
      ...(project.rivalReleases ?? []).map((rival) => ({ studioName: rival.studioName, boxOffice: rival.boxOffice, player: false })),
      { studioName: studio?.name ?? "استوديو اللاعب", boxOffice: project.boxOffice ?? 0, player: true },
    ].sort((a, b) => b.boxOffice - a.boxOffice);
    const playerRank = marketBoard.findIndex((entry) => entry.player) + 1;
    return <>
      <PageHeading kicker="RELEASE PERFORMANCE REPORT" title="تقرير شباك التذاكر والنقاد" desc={`قراءة السوق بعد إطلاق «${project.title}».`} action={<button className="btn btn-outline" onClick={shareResult}><Upload size={15}/> تصدير بطاقة PNG</button>}/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="إجمالي الإيرادات حتى اليوم" value={money(project.boxOffice ?? 0)} foot={`من أصل متوقع ${money(project.revenueTarget ?? project.boxOffice ?? 0)}`} icon={Banknote} tone="green"/><Metric label="تقييم النقاد" value={`${result.critics_score.toFixed(1)} / 10`} foot="جودة فنية وسيناريو" icon={Star}/><Metric label="تقييم الجمهور" value={`${result.audience_score.toFixed(1)} / 10`} foot="التفاعل والرضا الجماهيري" icon={Users} tone="green"/><Metric label="معامل شباك التذاكر" value={`${result.box_office_multiplier.toFixed(2)}×`} foot="المضاعف الأسبوعي" icon={BarChart3}/></div>
      <div className="panel-soft p-3 mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px]"><span className="text-muted">صافي السيولة بعد توزيع نقاط الأرباح التعاقدية</span><b className="green-text">{money((project.boxOffice ?? 0) - (project.backendPayout ?? 0))}</b><span className="text-muted">مستحقات Backend</span><b>{money(project.backendPayout ?? 0)}</b></div>
      <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-4 mt-4">
        <div className="panel p-5"><div className="section-kicker">OFFICIAL RELEASE POSTER</div><div ref={shareRef} className="poster-card mt-3"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(135deg,transparent 45%,rgba(212,175,55,.13) 46%,transparent 48%),linear-gradient(45deg,transparent 45%,rgba(229,9,20,.1) 46%,transparent 48%)", backgroundSize: "40px 40px" }}/><div className="relative z-10 flex flex-col items-center"><LogoMark {...activeStudio.logo} size={83}/><div className="text-[9px] tracking-[.24em] gold-text mt-3">{activeStudio.name.toUpperCase()}</div><div className="poster-title mt-7">{project.title}</div><div className="text-[10px] text-white/65 mt-3">{labelGenre(project.primaryGenre)} · {labelGenre(project.secondaryGenre)}</div><div className="flex flex-wrap items-center justify-center gap-2 mt-5">{project.cast.leads.map((id) => db.actors.find((a) => a.id === id)?.name).filter(Boolean).map((name) => <span key={name} className="tag !text-white !border-white/20">{name}</span>)}</div><div className="mt-7 border-t border-amber-300/30 pt-4 w-full"><div className="text-[8px] tracking-[.25em] text-amber-200/70">WORLDWIDE BOX OFFICE + RIGHTS</div><div className="text-2xl font-black gold-text mt-1">{money(project.boxOffice ?? 0)} EGP</div><div className="text-[10px] text-white/70 mt-1">CRITICS {result.critics_score.toFixed(1)} · AUDIENCE {result.audience_score.toFixed(1)}</div><p className="text-[9px] leading-5 text-white/75 italic mt-4">“{result.reviews[0] ?? result.summary}”</p></div><div className="mt-6 text-[10px] tracking-[.3em] font-black">HYPTRIX</div></div></div><button className="btn btn-gold w-full mt-3" onClick={shareResult}><Upload size={15}/> إنشاء صورة عالية الجودة</button><p className="text-[9px] text-muted mt-2 text-center">1080px+ · مناسبة لمشاركتها على منصات التواصل</p></div>
        <div className="space-y-4"><section className="panel p-5"><div className="flex items-center justify-between gap-2"><div><div className="section-kicker">CRITICS & AUDIENCE</div><h3 className="section-title mt-1">قراءة المراجعات النقدية</h3></div><span className="tag tag-gold">{result.critics_score >= 8 ? "إشادة واسعة" : result.critics_score >= 6.5 ? "استقبال إيجابي" : "انقسام نقدي"}</span></div><p className="text-xs text-muted leading-7 mt-3">{result.summary}</p><div className="space-y-3 mt-4">{result.reviews.map((review, i) => <div key={i} className="panel-soft p-3 flex gap-3"><div className="shrink-0"><div className="text-lg gold-text font-black">0{i + 1}</div><div className="text-[8px] text-muted mt-1">{["ناقد السيناريو", "صحافة الجمهور", "الناقد الفني"][i] ?? "قراءة نقدية"}</div></div><p className="text-xs leading-7">{review}</p></div>)}</div></section>
          <section className="panel p-5"><div className="flex items-center gap-2"><Newspaper size={16} className="gold-text"/><h3 className="section-title">مانشيتات الصحافة ومنشورات الجمهور</h3></div><div className="space-y-2 mt-3">{result.headlines.map((headline, i) => <div key={i} className="panel-soft p-3 text-xs font-black leading-6">“{headline}”</div>)}{result.social_posts.map((post, i) => <div key={`s${i}`} className="p-3 text-[11px] leading-6 text-muted border-r-2 border-red-500/50 bg-white/[.02]">{post}</div>)}</div><button className="btn btn-outline mt-3 w-full" onClick={() => triggerContextReward("reputation_campaign", () => { const updated = { ...result, audience_score: Math.min(10, result.audience_score + .35), headlines: [...result.headlines, "حملة جماهيرية تعيد إشعال النقاش حول العمل."] }; updateProject(project.id, { result: updated, hype: project.hype + 10 }); })}><Megaphone size={15}/> حملة لجان إلكترونية لتلميع الفيلم بعد هجوم النقاد</button></section>
          <section className="panel p-5"><div className="flex items-center gap-2"><Target size={16} className="gold-text"/><h3 className="section-title">سباق الموسم ضد المنافسين</h3></div><p className="section-sub">تمت محاكاة إصدارات منافسة من شركات العالم المتاحة في قاعدة البيانات.</p><div className="flex items-center justify-between mt-3 mb-2 text-[10px]"><span className="text-muted">ترتيب شباك التذاكر</span><b className={playerRank === 1 ? "green-text" : "gold-text"}>#{playerRank} من {marketBoard.length}</b></div><div className="space-y-2">{marketBoard.map((entry, i) => <div key={entry.player ? "player" : entry.studioName} className={`flex items-center justify-between panel-soft p-3 ${entry.player ? "border-amber-300/30" : ""}`}><div className="flex items-center gap-2"><b className="text-xs gold-text">#{i + 1}</b><span className={`text-xs font-bold ${entry.player ? "text-white" : ""}`}>{entry.player ? `★ ${entry.studioName} (أنت)` : entry.studioName}</span></div><span className={`text-[10px] font-black ${entry.player ? "green-text" : "text-muted"}`}>{money(entry.boxOffice)}</span></div>)}</div></section>
        </div>
      </div>
      {resultToast && <div className="notice notice-success mt-4"><Info size={15}/><p>{resultToast}</p></div>}
      <div className="flex flex-wrap gap-2 mt-4"><button className="btn btn-outline" onClick={() => setScreen("awards")}><Trophy size={15}/> متابعة الجوائز والترشيحات</button><button className="btn btn-ghost" onClick={() => setScreen("create")}><Plus size={15}/> إنتاج عمل جديد</button></div>
    </>;
  }

  function renderAwards() {
    const nominees = projects.filter((p) => p.status === "released" && p.result).sort((a, b) => (b.result?.critics_score ?? 0) - (a.result?.critics_score ?? 0));
    const festival = db.festivals.slice().sort((a, b) => b.prestige - a.prestige)[0];
    const awardLeaders = Object.entries(useGameStore.getState().careerAwards).map(([id, count]) => ({ actor: db.actors.find((a) => a.id === id), count })).filter((x) => x.actor).sort((a, b) => b.count - a.count);
    return <>
      <PageHeading kicker="FESTIVAL SEASON / ANNUAL GALA" title="المهرجانات وحفلات الجوائز" desc="تُبنى الترشيحات على أداء الأعمال، ويحفظ العالم سجل الفائزين ليتذكرهم في السنوات القادمة." action={<button className="btn btn-gold" onClick={runAwards} disabled={week < 52 || worldHistory.some((entry) => entry.kind === "award" && entry.year === year)}><Trophy size={15}/> إقامة حفل نهاية السنة</button>}/>
      <div className="grid lg:grid-cols-[1fr_310px] gap-4 items-start"><div className="space-y-4"><section className="panel p-5"><div className="flex items-center justify-between gap-3"><div><div className="section-kicker">FEATURED FESTIVAL</div><h3 className="section-title mt-1">{festival?.name ?? "مهرجان العالم"}</h3><p className="section-sub">هيبة المهرجان: {festival?.prestige ?? 50}/100</p></div><div className="icon-tile !w-12 !h-12"><Award size={23}/></div></div><div className="divider"/><div className="grid grid-cols-3 gap-2">{db.festivals.map((f) => <div key={f.id} className="panel-soft p-3 text-center"><div className="text-[10px] font-black leading-5">{f.name}</div><div className="text-lg font-black gold-text mt-1">{f.prestige}</div><div className="text-[8px] text-muted">Prestige</div></div>)}</div><button className="btn btn-outline w-full mt-4" onClick={() => triggerContextReward("festival_pr", () => { const target = nominees[0]; if (target?.result) updateProject(target.id, { result: { ...target.result, critics_score: Math.min(10, target.result.critics_score + .25), award_nominations: uniq([...target.result.award_nominations, "أفضل حملة علاقات عامة"]) } }); })}><Megaphone size={15}/> حملة علاقات عامة للمهرجان قبل إعلان الجوائز</button></section>
        <section className="panel p-5"><div className="flex items-center justify-between"><div><div className="section-kicker">OFFICIAL NOMINEES</div><h3 className="section-title mt-1">قائمة الترشيحات</h3></div><span className="tag">{nominees.length} عمل</span></div>{nominees.length ? <div className="mt-4 space-y-3">{nominees.map((project, index) => <div key={project.id} className="panel-soft p-4"><div className="flex items-center gap-3"><div className="text-2xl font-black gold-text">{String(index + 1).padStart(2, "0")}</div><div className="flex-1"><div className="text-sm font-black">{project.title}</div><div className="text-[9px] text-muted mt-1">{project.format === "film" ? "أفضل فيلم" : "أفضل مسلسل"} · {labelGenre(project.primaryGenre)}</div></div><div className="text-lg font-black">{project.result?.critics_score.toFixed(1)}</div></div><div className="flex flex-wrap gap-1.5 mt-3">{(project.result?.award_nominations ?? []).map((nomination) => <span key={nomination} className="tag">{nomination}</span>)}</div></div>)}</div> : <div className="empty-state mt-4"><Trophy size={24} className="mx-auto gold-text"/><p className="text-xs mt-2">لا توجد ترشيحات بعد. اطرح عملاً واحدًا على الأقل لتدخل موسم الجوائز.</p></div>}</section>
        </div><aside className="space-y-4"><div className="panel p-5"><div className="flex items-center gap-2"><Crown size={16} className="gold-text"/><h3 className="section-title">سجل الأساطير</h3></div><p className="section-sub">عدد الجوائز المتراكمة لكل ممثل.</p>{awardLeaders.length ? <div className="mt-3 space-y-3">{awardLeaders.map(({ actor, count }, i) => <div key={actor!.id} className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-amber-300/10 grid place-items-center text-[10px] gold-text font-black">{i + 1}</div><div className="flex-1"><div className="text-[11px] font-bold">{actor!.name}</div><div className="text-[8px] text-muted">{tierName(actor!)}</div></div><b className="gold-text text-sm">{count}×</b></div>)}</div> : <p className="text-xs text-muted mt-4">سجل الجوائز سيبدأ بعد أول حفل سنوي.</p>}</div><div className="panel p-5"><div className="flex items-center gap-2"><CalendarDays size={16} className="gold-text"/><h3 className="section-title">التقويم السنوي</h3></div><div className="text-3xl font-black mt-4">{year}</div><div className="text-[10px] text-muted mt-1">الأسبوع {week} من 52</div><div className="progress-track mt-3"><span style={{ width: `${week / 52 * 100}%` }}/></div><div className="panel-soft p-3 mt-4 text-[10px] text-muted leading-6">التقويم يتقدم تلقائيًا مع مرور الوقت الحقيقي: كل دقيقة تساوي يومًا واحدًا داخل اللعبة.</div></div></aside></div>
    </>;
  }

  function renderLeaderboard() {
    return <>
      <PageHeading kicker="GLOBAL PRODUCER RANKINGS" title="لوحة المتصدرين" desc="أغنى 100 شركة إنتاج. التقدم الشخصي محفوظ محليًا، ولا يُنشر إلا عند تسجيل الدخول والموافقة على النشر." action={<button className="btn btn-outline" onClick={() => loadLeaderboard()}><Activity size={15}/> تحديث الترتيب</button>}/>
      <div className="panel p-5"><div className="flex items-center justify-between gap-2"><div><div className="section-kicker">{leaderboardScope === "all" ? "GLOBAL TOP 100" : `REGIONAL TOP 100 / ${leaderboardScope.toUpperCase()}`}</div><h3 className="section-title mt-1">أفضل شركات الإنتاج</h3></div><span className={`tag ${leaderboardConfigured ? "tag-gold" : ""}`}>{leaderboardConfigured ? "Supabase متصل" : "وضع محلي / غير مربوط"}</span></div>
        <div className="flex flex-wrap gap-2 mt-4">{([{ value: "all", label: "كل الأسواق" }, { value: "egypt", label: "مصر" }, { value: "gulf", label: "الخليج" }, { value: "europe", label: "أوروبا" }, { value: "hollywood", label: "هوليوود" }] as const).map((item) => <button key={item.value} className={`chip-option ${leaderboardScope === item.value ? "selected" : ""}`} onClick={() => loadLeaderboard(item.value)}>{item.label}</button>)}</div>
        {leaderboard.length ? <div className="overflow-x-auto mt-4"><table className="w-full text-right min-w-[520px]"><thead><tr className="text-[9px] text-muted border-b border-white/10"><th className="py-3">الترتيب</th><th>الشركة</th><th>السوق</th><th>صافي الثروة</th><th>السمعة</th></tr></thead><tbody>{leaderboard.map((entry, i) => <tr key={`${entry.studio_name}-${i}`} className="border-b border-white/[.06] text-[11px]"><td className="py-3 gold-text font-black">#{i + 1}</td><td className="font-bold">{entry.studio_name}</td><td className="text-muted">{MARKET_LABELS[entry.market as Market] ?? entry.market}</td><td className="font-black">{money(entry.net_worth)}</td><td>{entry.reputation}/100</td></tr>)}</tbody></table></div> : <div className="empty-state mt-4"><Globe2 size={26} className="mx-auto gold-text"/><p className="text-xs font-black text-white mt-3">لا توجد بيانات متاحة حاليًا</p><p className="text-[10px] mt-2">اربط مشروع Supabase وشغّل ملف SQL، ثم سجّل الدخول وانشر ترتيب شركتك.</p></div>}
        <div className="divider"/><div className="flex flex-wrap justify-between items-center gap-3"><div className="text-[10px] text-muted">تُرسل للمتصدرين: اسم الشركة والسوق وصافي الثروة والسمعة فقط.</div><button className="btn btn-gold" onClick={publishLeaderboard}><Globe2 size={15}/> نشر شركتي على اللوحة</button></div>
      </div>
    </>;
  }

  function renderSettings() {
    return <>
      <PageHeading kicker="SYSTEM CONFIGURATION" title="الإعدادات ومركز البيانات" desc="إدارة الحزم الخارجية، الحساب، والاتصالات السحابية. تقدم اللعبة نفسه يظل على جهازك."/>
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4 items-start"><div className="space-y-4"><DatabaseManager/><section className="panel p-5"><div className="flex items-center justify-between gap-2"><div><div className="section-kicker">PLAYER ACCOUNT</div><h3 className="section-title mt-1">تسجيل الدخول والمزامنة</h3><p className="section-sub">الحساب مطلوب فقط للوحة المتصدرين ورصيد VIP وحالة الباقة.</p></div><div className="icon-tile"><LogIn size={18}/></div></div>{userEmail ? <div className="notice notice-success mt-4"><CheckCircle2 size={15}/><p>مسجل الدخول: {userEmail}</p></div> : <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-2"><input className="field" type="email" dir="ltr" placeholder="you@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}/><button className="btn btn-gold" onClick={signIn} disabled={authLoading}>{authLoading ? "جارٍ الإرسال..." : "إرسال رابط الدخول"}</button></div>}{authMessage && <p className="text-[10px] text-muted mt-3">{authMessage}</p>}{userEmail && <button className="btn btn-ghost mt-3" onClick={signOut}><LogOut size={14}/> تسجيل الخروج</button>}{vipCloud && <div className="panel-soft p-3 mt-4"><div className="flex justify-between text-[10px]"><span className="text-muted">رصيد VIP السحابي</span><b className="gold-text">{vipCloud.vipBalance === null ? "—" : vipCloud.vipBalance.toLocaleString("en-US")}</b></div><div className="flex justify-between text-[10px] mt-2"><span className="text-muted">حالة الباقة</span><b>{vipCloud.package?.status ?? vipCloud.packageStatus ?? "غير متاح"}</b></div></div>}</section>
        <section className="panel p-5"><div className="flex items-center gap-2"><Shield size={16} className="gold-text"/><h3 className="section-title">خصوصية وتخزين البيانات</h3></div><div className="space-y-3 mt-4 text-[10px] leading-6 text-muted"><p>• كل تقدم اللاعب، المشاريع، العقود، التاريخ التراكمي، وقاعدة البيانات الخارجية محفوظة محليًا في IndexedDB عبر idb-keyval.</p><p>• Supabase لا يستقبل ملفات المشاريع أو نصوص القصص؛ يقتصر على Auth ورصيد VIP وحالة الباقة ولوحة المتصدرين.</p><p>• النص الذي تكتبه في ملخص العمل يُرسل إلى مزود AI عند طلب التقييم، لذلك لا تضع فيه معلومات شخصية أو حساسة.</p></div></section></div>
        <div className="space-y-4"><section className="panel p-5"><div className="flex items-center gap-2"><Zap size={16} className="gold-text"/><h3 className="section-title">حالة الخدمات</h3></div><div className="space-y-2 mt-4">{[{ label: "الحفظ المحلي IndexedDB", state: "نشط" }, { label: "القاعدة الافتراضية الخيالية", state: "نشطة" }, { label: "حزمة بيانات خارجية", state: customDb ? "مفعلة" : "غير مفعلة" }, { label: "Supabase", state: supabase ? "مُعدّ بالمفاتيح" : "يحتاج إعداد" }, { label: "Groq / Gemini", state: "يتطلب مفاتيح الخادم" }, { label: "شبكات Rewarded Ads", state: "تحتاج SDK Adapter" }].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 panel-soft p-3"><span className="text-[10px]">{item.label}</span><span className="tag">{item.state}</span></div>)}</div></section>
          <section className="panel p-5"><div className="flex items-center gap-2"><Crown size={17} className="gold-text"/><h3 className="section-title">العرق مقابل الـ VIP</h3></div><p className="section-sub">خمس مشاهدات Rewarded متتالية تمنح وضع رئيس الاستوديو VIP لمدة 24 ساعة بعد تأكيد الشبكة لكل مشاهدة.</p><div className="flex items-center gap-1 mt-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < vipProgress ? "bg-amber-300" : "bg-white/10"}`}/>)}</div><button className="btn btn-outline w-full mt-4" onClick={() => { setShowVip(true); setScreen("overview"); }}><Crown size={15}/> فتح نافذة VIP</button><p className="text-[9px] text-muted mt-2">المكافأة لا تُمنح في وضع الإنتاج إلا بعد تأكيد SDK للإعلان.</p></section>
          <section className="panel p-5 border border-red-500/20"><div className="flex items-center gap-2"><Shield size={16} className="red-text"/><h3 className="section-title">إعادة ضبط اللعبة</h3></div><p className="section-sub">يمسح التقدم المحلي من هذا الجهاز. لا يمكن التراجع عن العملية.</p><button className="btn btn-red w-full mt-4" onClick={() => { if (window.confirm("هل أنت متأكد من حذف تقدم Hyptrix المحلي من هذا الجهاز؟")) { resetGame(); setScreen("overview"); } }}>حذف الأرشيف المحلي وإعادة البدء</button></section></div></div>
    </>;
  }

  const screenContent = screen === "overview" ? renderOverview()
    : screen === "create" ? renderCreate()
    : screen === "production" ? renderProduction()
    : screen === "results" ? renderResults()
    : screen === "awards" ? renderAwards()
    : screen === "leaderboard" ? renderLeaderboard()
    : renderSettings();

  return <div className="app-shell">
    <header className="topbar app-topbar"><div className="brand"><LogoMark {...activeStudio.logo} size={44}/><div><div className="brand-word">HYP<span>TRIX</span></div><div className="brand-sub">CINEMA EMPIRE SIMULATOR</div></div></div><div className="top-stats"><div className="stat-pill"><Wallet size={14}/><span>{money(activeStudio.cash)}</span></div><div className="stat-pill"><Star size={14}/><span>{activeStudio.reputation} REP</span></div><div className="stat-pill"><CalendarDays size={14}/><span>يوم {gameDay} · {year}</span></div></div><div className="top-actions"><button className={`btn ${isVip ? "btn-gold" : "btn-outline"}`} onClick={() => setShowVip(true)}><Crown size={14}/>{isVip ? "VIP ACTIVE" : "GET VIP"}</button><button className="btn btn-ghost !px-2" title="الإعدادات" onClick={() => setScreen("settings")}><Settings size={16}/></button></div></header>
    <div className="main-layout"><aside className="sidebar"><div className="sidebar-brandline"><span className="sidebar-brand-dot"/><div><b>مساحة الاستوديو</b><small>STUDIO WORKSPACE</small></div></div>{navItems.map((item) => <button key={item.id} className={`nav-button ${screen === item.id ? "active" : ""}`} onClick={() => { setScreen(item.id); setMobileMenuOpen(false); }}><item.icon/><span>{item.label}</span>{item.id === "production" && projects.some((p) => p.status === "production" || p.status === "post") && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-red-500"/>}</button>)}<div className="nav-footer"><div className="flex items-center gap-2"><LogoMark {...activeStudio.logo} size={31}/><div><b>{activeStudio.name}</b><div>تأسست {activeStudio.foundedYear}</div></div></div><div className="mt-3">نسخة تشغيل محلية · Build 1.0.0</div></div></aside>
      <main className="content"><AnimatePresence mode="wait"><motion.div key={screen} initial={{ opacity: 0, y: 14, scale: .994 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -7, scale: .997 }} transition={{ duration: .3, ease: [0.22, 1, 0.36, 1] }}>{screenContent}</motion.div></AnimatePresence><div className="bottom-legal"><span>HYPTRIX</span> · عالم سينمائي من صنعك · تقدمك محفوظ على جهازك</div></main></div>
    <nav className="mobile-nav" aria-label="التنقل الرئيسي">{navItems.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><span className="mobile-nav-icon"><item.icon/></span><span>{item.id === "overview" ? "الرئيسية" : item.id === "create" ? "مشروع" : item.id === "production" ? "الإنتاج" : item.id === "awards" ? "الجوائز" : item.id === "leaderboard" ? "الترتيب" : "المزيد"}</span></button>)}</nav>
    <AnimatePresence>{showVip && <motion.div className="fixed inset-0 z-50 vip-backdrop flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div initial={{ opacity: 0, scale: .94, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} className="panel w-full max-w-md p-5 sm:p-6 relative"><button className="absolute left-4 top-4 text-muted hover:text-white" onClick={() => setShowVip(false)}><X size={19}/></button><div className="text-center"><div className="w-14 h-14 rounded-2xl mx-auto grid place-items-center bg-amber-300/10 border border-amber-300/20 text-amber-300"><Crown size={27}/></div><div className="eyebrow mt-4">PRESIDENT ACCESS / 24 HOURS</div><h2 className="text-2xl font-black mt-2">العرق مقابل الـ VIP</h2><p className="text-xs text-muted leading-7 mt-2">شاهد 5 إعلانات Rewarded متتالية لفتح ميزانية طوارئ، وإحصائيات توافق متقدمة، وأولوية توليد AI لمدة 24 ساعة.</p></div><div className="flex gap-2 mt-6">{Array.from({ length: 5 }).map((_, i) => <div key={i} className={`flex-1 rounded-lg border p-2 text-center ${i < vipProgress ? "bg-amber-300/10 border-amber-300/40 text-amber-300" : "border-white/10 text-muted"}`}><div className="text-xs font-black">{i + 1}</div><div className="text-[8px] mt-1">{i < vipProgress ? "تم" : "إعلان"}</div></div>)}</div><div className="progress-track mt-4 !h-2"><span style={{ width: `${vipProgress * 20}%` }}/></div><div className="flex items-center justify-between mt-2 text-[9px] text-muted"><span>التقدم</span><span>{vipProgress} / 5</span></div>{adDemoNotice && <div className="notice notice-error mt-3"><Info size={14}/><p>{adDemoNotice}</p></div>}<button className="btn btn-gold w-full mt-5 !min-h-12" disabled={busyAd || vipProgress >= 5} onClick={nextVipAd}>{busyAd ? "جارٍ طلب الإعلان..." : `مشاهدة الإعلان ${Math.min(vipProgress + 1, 5)} / 5`} <Play size={15}/></button><p className="text-[9px] text-muted text-center leading-5 mt-3">في نسخة التطوير يمكن تفعيل المحاكاة عبر NEXT_PUBLIC_ENABLE_AD_DEMO=true. لا يتم احتساب مشاهدة حقيقية دون SDK معتمد.</p></motion.div></motion.div>}</AnimatePresence>
    {toast && <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-8 z-[60] max-w-md mx-auto lg:mx-0"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel p-3 flex items-start gap-3 border-amber-300/25"><Bell size={16} className="gold-text mt-0.5 shrink-0"/><p className="text-xs leading-6 flex-1">{toast}</p><button onClick={() => { setToast(""); setNotification(null); }} className="text-muted"><X size={15}/></button></motion.div></div>}
    <div className="hidden">{mobileMenuOpen ? "menu" : ""}</div>
  </div>;
}

function ArrowIcon() { return <ChevronDown size={15} className="rotate-[-90deg]"/>; }
