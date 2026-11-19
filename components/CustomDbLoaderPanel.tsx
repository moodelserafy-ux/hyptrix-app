'use client';

import React, { useRef, useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  getResolvedDatabase,
  validateCustomDatabase,
  MasterDatabase,
} from '@/lib/db-resolver';
import {
  Database,
  Upload,
  Link2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export function CustomDbLoaderPanel({ compact = false }: { compact?: boolean }) {
  const {
    customDbPatch,
    customDbUrl,
    importCustomDatabase,
    clearCustomDatabase,
  } = useGameStore();
  const [urlInput, setUrlInput] = useState(customDbUrl || '');
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedDb = getResolvedDatabase(customDbPatch);

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'يرجى إدخال رابط حزمة بيانات صالح أولاً.',
      });
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
        setStatusMsg({
          type: 'error',
          text: validation.error || 'ملف غير صالح',
        });
      } else {
        importCustomDatabase(validation.data, urlInput.trim());
        setStatusMsg({
          type: 'success',
          text: `تم تفعيل الحزمة بنجاح: ${validation.data.meta?.pack_name || 'حزمة مخصصة'}`,
        });
      }
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'تعذر تحميل الرابط المباشر. تأكد من صحة الرابط أو ارفع الحزمة مباشرة من جهازك.',
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
          setStatusMsg({
            type: 'error',
            text: validation.error || 'ملف الحزمة غير متوافق.',
          });
        } else {
          importCustomDatabase(validation.data, file.name);
          setStatusMsg({
            type: 'success',
            text: `تم استيراد ودمج حزمة "${validation.data.meta?.pack_name || file.name}" بنجاح!`,
          });
        }
      } catch {
        setStatusMsg({
          type: 'error',
          text: 'فشل قراءة ملف الحزمة. تأكد من سلامة البيانات.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-4 text-right text-[#1A2530] shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2530]/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-black text-[#1A2530]">
            إدارة حزم الأسماء والشعارات المخصصة
          </h3>
        </div>
        <span className="rounded-full border border-[#D4AF37]/70 bg-[#FFF9E6] px-2.5 py-0.5 text-[10px] font-black text-[#1A2530] tabular-nums">
          {resolvedDb.meta.pack_name}
        </span>
      </div>

      {!compact && (
        <p className="mt-2 text-xs leading-relaxed text-[#1A2530]/75">
          الصق رابط حزمة بيانات خارجية أو ارفع ملف الحزمة من جهازك لدمج
          الأسماء والصور وشعارات المنصات والقنوات تلقائياً.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#1A2530]/40" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://.../studio_pack"
            aria-label="رابط حزمة البيانات الخارجية"
            className="w-full rounded-xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] py-2 pr-9 pl-3 text-left text-xs font-medium text-[#1A2530] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
            dir="ltr"
          />
        </div>
        <button
          type="button"
          onClick={handleFetchFromUrl}
          disabled={loading}
          className="min-h-[40px] shrink-0 rounded-xl border border-[#D4AF37] bg-[#D91624] px-4 py-2 text-xs font-black text-white shadow-xs hover:brightness-110"
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
          aria-label="رفع حزمة بيانات من الجهاز"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#1A2530]/20 bg-[#F9F6F0] px-3 py-1.5 text-xs font-black text-[#1A2530] hover:border-[#D4AF37]"
        >
          <Upload className="h-3.5 w-3.5 text-[#D91624]" />
          رفع حزمة بيانات
        </button>

        {customDbPatch && (
          <button
            type="button"
            onClick={() => {
              clearCustomDatabase();
              setStatusMsg({
                type: 'success',
                text: 'تمت استعادة قاعدة البيانات الافتراضية.',
              });
            }}
            className="flex min-h-[38px] items-center gap-1 rounded-xl border border-[#D91624]/40 bg-[#D91624]/10 px-3 py-1.5 text-xs font-black text-[#D91624]"
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
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}

export default CustomDbLoaderPanel;
