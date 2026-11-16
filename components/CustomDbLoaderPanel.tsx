'use client';

import React, { useRef, useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  getResolvedDatabase,
  validateCustomDatabase,
  MasterDatabase,
} from '@/lib/db-resolver';
import { playClickSound, playContractSignedSound } from '@/lib/game-audio';
import { Database, Upload, Link2, CheckCircle2, RotateCcw, AlertTriangle, FileJson } from 'lucide-react';

const SAMPLE_MOD_PACK: Partial<MasterDatabase> = {
  meta: {
    pack_name: 'حزمة نجوم الشاشة العربية بلس 2026 (Mod Pack)',
    version: '2.4',
  },
  actors: [
    {
      id: 'act_1',
      name: 'كريم عبد العزيز (حزمة واقعية)',
      gender: 'male',
      age: 48,
      tier: 'S',
      image_url: '',
      base_salary: 50000000,
      stats: { overall: 96, acting: 94, charisma: 99, box_office_pull: 99, ego: 88 },
      genre_mastery: { action: 98, popular_drama: 96, comedy: 92, historical: 97 },
    },
    {
      id: 'act_2',
      name: 'أحمد عز (حزمة واقعية)',
      gender: 'male',
      age: 50,
      tier: 'S',
      image_url: '',
      base_salary: 48000000,
      stats: { overall: 95, acting: 91, charisma: 97, box_office_pull: 98, ego: 91 },
      genre_mastery: { action: 99, crime_mystery: 95, heist: 96, historical: 94 },
    },
    {
      id: 'act_3',
      name: 'منى زكي (حزمة واقعية)',
      gender: 'female',
      age: 46,
      tier: 'S',
      image_url: '',
      base_salary: 38000000,
      stats: { overall: 94, acting: 98, charisma: 94, box_office_pull: 92, ego: 85 },
      genre_mastery: { popular_drama: 96, biography: 98, psychological_horror: 93, romance: 95 },
    },
  ],
  crew: [
    {
      id: 'dir_1',
      name: 'مروان حامد (حزمة واقعية)',
      role: 'director',
      image_url: '',
      base_salary: 22000000,
      stats: { overall: 96, vision: 99, pacing: 94, efficiency: 88, control: 96 },
      best_genres: ['action', 'crime_mystery', 'historical', 'psychological_horror'],
    },
  ],
  competitor_studios: [
    {
      id: 'comp_1',
      name: 'سينرجي للإنتاج الفني (Mod)',
      logo_url: '',
      market_power: 97,
      preferred_genres: ['action', 'historical', 'popular_drama'],
    },
    {
      id: 'comp_2',
      name: 'السبكي فيلم للإنتاج السينمائي (Mod)',
      logo_url: '',
      market_power: 91,
      preferred_genres: ['popular_drama', 'light_comedy', 'action'],
    },
  ],
  streaming_platforms: [
    {
      id: 'plat_1',
      name: 'شاهد VIP (Shahid Mod)',
      logo_url: '',
      budget_capacity: 97,
    },
    {
      id: 'plat_2',
      name: 'واتش إت (WATCH IT Mod)',
      logo_url: '',
      budget_capacity: 94,
    },
  ],
  festivals: [
    {
      id: 'fest_1',
      name: 'مهرجان القاهرة السينمائي الدولي (Mod)',
      logo_url: '',
      prestige: 97,
    },
    {
      id: 'fest_2',
      name: 'مهرجان الجونة السينمائي (Mod)',
      logo_url: '',
      prestige: 93,
    },
    {
      id: 'fest_3',
      name: 'حفل صناع الترفيه (Joy Awards Mod)',
      logo_url: '',
      prestige: 99,
    },
  ],
};

export function CustomDbLoaderPanel({ compact = false }: { compact?: boolean }) {
  const { customDbPatch, customDbUrl, importCustomDatabase, clearCustomDatabase } = useGameStore();
  const [urlInput, setUrlInput] = useState(customDbUrl || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedDb = getResolvedDatabase(customDbPatch);

  const handleFetchFromUrl = async () => {
    playClickSound();
    if (!urlInput.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال رابط ملف JSON صالح أولاً.' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(urlInput.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const validation = validateCustomDatabase(json);
      if (!validation.valid || !validation.data) {
        setStatusMsg({ type: 'error', text: validation.error || 'ملف غير صالح' });
      } else {
        importCustomDatabase(validation.data, urlInput.trim());
        playContractSignedSound();
        setStatusMsg({
          type: 'success',
          text: `تم تفعيل الحزمة بنجاح: ${validation.data.meta?.pack_name || 'حزمة مخصصة'}`,
        });
      }
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'تعذر تحميل الرابط المباشر. تأكد من أنه رابط Raw JSON مباشر يدعم CORS أو ارفع الملف من جهازك.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        const validation = validateCustomDatabase(parsed);
        if (!validation.valid || !validation.data) {
          setStatusMsg({ type: 'error', text: validation.error || 'ملف JSON غير متوافق مع هيكل Hyptrix.' });
        } else {
          importCustomDatabase(validation.data, file.name);
          playContractSignedSound();
          setStatusMsg({
            type: 'success',
            text: `تم استيراد ودمج ملف "${validation.data.meta?.pack_name || file.name}" بنجاح!`,
          });
        }
      } catch {
        setStatusMsg({ type: 'error', text: 'فشل قراءة ملف JSON. تأكد من سلامة الصياغة.' });
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleMod = () => {
    playContractSignedSound();
    importCustomDatabase(SAMPLE_MOD_PACK, 'local://arabic-cinema-2026-pack.json');
    setStatusMsg({
      type: 'success',
      text: 'تم تفعيل حزمة المحاكاة الواقعية التجريبية بنجاح وتم تحديث الأسماء!',
    });
  };

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-[#16161D]/90 p-5 text-right text-slate-100 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#D4AF37]">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-black text-white">
            إدارة حزم البيانات الواقعية (JSON Mod Pack)
          </h3>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-[#0A0A0C] px-2.5 py-0.5 text-[10px] font-black text-[#D4AF37] tabular-nums">
          {resolvedDb.meta.pack_name}
        </span>
      </div>

      {!compact && (
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          الصق رابط JSON خارجي أو ارفع ملف <code className="font-bold text-[#D4AF37]">.json</code> من جهازك لدمج الأسماء والصور الواقعية تلقائياً.
        </p>
      )}

      <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://gist.githubusercontent.com/.../hyptrix_db.json"
            aria-label="رابط حزمة البيانات الخارجية JSON URL"
            className="w-full rounded-xl border border-amber-500/30 bg-[#0A0A0C] py-2.5 pr-9 pl-3 text-left text-xs font-medium text-slate-100 focus:border-[#D4AF37] focus:outline-none"
            dir="ltr"
          />
        </div>
        <button
          type="button"
          onClick={handleFetchFromUrl}
          disabled={loading}
          className="min-h-[42px] rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-4 py-2 text-xs font-black text-[#0A0A0C] whitespace-nowrap shrink-0 shadow-md"
        >
          {loading ? 'جاري التحقق...' : 'تفعيل الرابط'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="رفع ملف JSON من الجهاز"
        />
        <button
          type="button"
          onClick={() => {
            playClickSound();
            fileInputRef.current?.click();
          }}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-500/30 bg-[#0A0A0C] px-3.5 py-2 text-xs font-black text-slate-200 hover:border-[#D4AF37]"
        >
          <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
          رفع ملف .json
        </button>

        <button
          type="button"
          onClick={handleLoadSampleMod}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3.5 py-2 text-xs font-black text-[#D4AF37] hover:bg-[#D4AF37]/25"
        >
          <FileJson className="h-3.5 w-3.5" />
          تفعيل الحزمة الواقعية التجريبية
        </button>

        {customDbPatch && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              clearCustomDatabase();
              setStatusMsg({ type: 'success', text: 'تمت استعادة قاعدة البيانات الافتراضية.' });
            }}
            className="flex min-h-[40px] items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-black text-rose-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            استعادة الافتراضي
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold ${
            statusMsg.type === 'success'
              ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}
