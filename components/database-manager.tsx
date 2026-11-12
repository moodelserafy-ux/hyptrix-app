"use client";
import { useRef, useState } from "react";
import { Database, FileJson, Link2, Upload, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { validateDatabase } from "@/lib/database";
import { useGameStore } from "@/lib/store";

export function DatabaseManager({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setCustomDb = useGameStore((s) => s.setCustomDb);
  const customDb = useGameStore((s) => s.customDb);

  async function activate(raw: unknown) {
    setBusy(true); setMessage(""); setIsError(false);
    try {
      const db = validateDatabase(raw);
      if (!db.actors.length || !db.crew.length) throw new Error("الحزمة لازم تحتوي على ممثل واحد وعضو طاقم واحد على الأقل.");
      setCustomDb(db);
      setMessage(`تم التفعيل: ${db.meta?.pack_name ?? "قاعدة بيانات مخصصة"} — ${db.actors.length} ممثل و${db.crew.length} من الطاقم.`);
    } catch (error) {
      setIsError(true); setMessage(error instanceof Error ? error.message : "ملف JSON غير صالح أو لا يطابق الهيكل القياسي.");
    } finally { setBusy(false); }
  }
  async function importUrl() {
    if (!url.trim()) return;
    try {
      const parsed = new URL(url.trim());
      if (!(["http:", "https:"].includes(parsed.protocol))) throw new Error("الرابط يجب أن يبدأ بـ HTTPS أو HTTP.");
      setBusy(true); setMessage("جارٍ جلب الحزمة وفحصها..."); setIsError(false);
      const response = await fetch(parsed.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`فشل تحميل الرابط (${response.status}).`);
      const text = await response.text();
      if (text.length > 5_000_000) throw new Error("حجم الحزمة يتجاوز الحد المسموح (5MB).");
      await activate(JSON.parse(text));
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "تعذر جلب الحزمة. تأكد من أن الرابط Raw ويدعم CORS."); setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") || file.size > 5_000_000) {
      setIsError(true); setMessage("اختر ملف .json لا يتجاوز 5MB."); return;
    }
    try { await activate(JSON.parse(await file.text())); }
    catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "تعذر قراءة الملف."); }
  }

  return <section className={`panel ${compact ? "p-4" : "p-5 sm:p-6"}`}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div><div className="section-kicker">DATA MODDING SYSTEM</div><h3 className="text-lg font-black mt-1">إدارة حزم البيانات الواقعية</h3><p className="text-xs text-muted mt-1">استيراد أسماء وصور وإحصائيات خارجية دون تعديل ملفات اللعبة</p></div>
      <div className="icon-tile"><Database size={20}/></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="field-wrap"><span className="field-label"><Link2 size={13}/> رابط JSON مباشر (Raw URL)</span><input className="field" placeholder="https://.../database.json" value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr"/></label>
      <button className="btn btn-gold self-end" disabled={busy || !url.trim()} onClick={importUrl}>{busy ? "جارٍ التحقق..." : "تفعيل الحزمة"}</button>
    </div>
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <button className="btn btn-outline" onClick={() => inputRef.current?.click()}><Upload size={15}/> رفع ملف من الهاتف</button>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])}/>
      {customDb && <button className="btn btn-ghost" onClick={() => { setCustomDb(null); setMessage("تمت استعادة القاعدة الخيالية الافتراضية."); setIsError(false); }}><RotateCcw size={14}/> استعادة الافتراضي</button>}
      {customDb && <span className="text-[11px] text-green-300"><CheckCircle2 size={13} className="inline ml-1"/> حزمة مفعلة</span>}
    </div>
    {message && <div className={`notice mt-3 ${isError ? "notice-error" : "notice-success"}`}><span>{isError ? <AlertCircle size={15}/> : <CheckCircle2 size={15}/>}</span><p>{message}</p></div>}
    <div className="mt-4 flex gap-2 text-[11px] text-muted leading-5"><FileJson size={16} className="shrink-0 mt-0.5"/><p>تتم مطابقة العناصر عبر <code>id</code>. الحقول غير الموجودة تحتفظ بالقيم الافتراضية. قد تمنع بعض الاستضافات جلب JSON بسبب CORS؛ استخدم رابط Raw مباشر أو ارفع الملف من جهازك.</p></div>
  </section>;
}
