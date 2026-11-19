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
  FileJson,
  Globe,
} from 'lucide-react';

function normalizeClientDirectUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'github.com') {
      const blobMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
      if (blobMatch) {
        return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`;
      }
    }
  } catch {
    // Let validation handle malformed URLs
  }
  return trimmed;
}

function summarizePackChanges(data: Partial<MasterDatabase>): string {
  const parts: string[] = [];
  if (Array.isArray(data.actors) && data.actors.length > 0) {
    parts.push(`${data.actors.length} ممثل`);
  }
  if (Array.isArray(data.crew) && data.crew.length > 0) {
    parts.push(`${data.crew.length} طاقم إخراج/تصوير`);
  }
  if (Array.isArray(data.streaming_platforms) && data.streaming_platforms.length > 0) {
    parts.push(`${data.streaming_platforms.length} منصة/قناة`);
  }
  if (Array.isArray(data.competitor_studios) && data.competitor_studios.length > 0) {
    parts.push(`${data.competitor_studios.length} شركة منافسة`);
  }
  return parts.length > 0 ? ` (${parts.join(' · ')})` : '';
}

export function CustomDbLoaderPanel({ compact = false }: { compact?: boolean }) {
  const {
    worldMarket,
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

  const resolvedDb = getResolvedDatabase(customDbPatch, worldMarket);

  const handleFetchFromUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) {
      setStatusMsg({
        type: 'error',
        text: 'يرجى لصق رابط ملف JSON مباشر أولاً (مثل GitHub Raw أو jsDelivr أو Cloudflare Pages).',
      });
      return;
    }

    if (/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i.test(raw)) {
      setStatusMsg({
        type: 'error',
        text: 'روابط منشورات تيليجرام ليست ملفات JSON خام. استخدم رابطاً مباشراً (GitHub Raw / jsDelivr / Cloudflare Pages) أو نزّل الملف واضغط على زر «رفع ملف المود من جهازك» بالأسفل.',
      });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    const directUrl = normalizeClientDirectUrl(raw);

    try {
      // 1. Fast path: Direct browser fetch for CORS-enabled raw hosts (GitHub Raw, jsDelivr, Cloudflare Pages)
      let loadedData: Partial<MasterDatabase> | null = null;
      let finalSavedUrl = directUrl;

      try {
        const directRes = await fetch(directUrl, {
          headers: { Accept: 'application/json, text/plain' },
        });
        if (directRes.ok) {
          const text = await directRes.text();
          if (!text.trim().startsWith('<')) {
            const json = JSON.parse(text);
            const validation = validateCustomDatabase(json, worldMarket);
            if (validation.valid && validation.data) {
              loadedData = validation.data;
            } else if (validation.error) {
              setStatusMsg({ type: 'error', text: validation.error });
              return;
            }
          }
        }
      } catch {
        // Blocked by CORS or non-raw host -> automatically fall back to server proxy
      }

      // 2. Fallback path: Server-side proxy (handles CORS restrictions + Google Drive / Dropbox / GitHub links)
      if (!loadedData) {
        const proxyRes = await fetch('/api/fetch-mod-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw, expectedMarket: worldMarket }),
        });
        const proxyPayload = (await proxyRes.json()) as {
          ok?: boolean;
          data?: Partial<MasterDatabase>;
          normalizedUrl?: string;
          error?: string;
        };

        if (!proxyRes.ok || !proxyPayload.ok || !proxyPayload.data) {
          setStatusMsg({
            type: 'error',
            text:
              proxyPayload.error ||
              'تعذر تحميل الرابط المباشر. تأكد أنه رابط JSON خام أو ارفع الملف من جهازك.',
          });
          return;
        }

        loadedData = proxyPayload.data;
        finalSavedUrl = proxyPayload.normalizedUrl || directUrl;
      }

      importCustomDatabase(loadedData, finalSavedUrl);
      setUrlInput(finalSavedUrl);
      setStatusMsg({
        type: 'success',
        text: `تم تفعيل الحزمة بنجاح: ${loadedData.meta?.pack_name || 'حزمة مخصصة'}${summarizePackChanges(loadedData)}`,
      });
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'تعذر تحميل الرابط المباشر. تأكد من صحة الرابط أو استخدم زر رفع الملف من جهازك.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so re-uploading an edited file with the same name always triggers onChange
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        const validation = validateCustomDatabase(parsed, worldMarket);
        if (!validation.valid || !validation.data) {
          setStatusMsg({
            type: 'error',
            text: validation.error || 'ملف الحزمة غير متوافق.',
          });
        } else {
          importCustomDatabase(validation.data, file.name);
          setStatusMsg({
            type: 'success',
            text: `تم استيراد ودمج حزمة "${validation.data.meta?.pack_name || file.name}" بنجاح${summarizePackChanges(validation.data)}!`,
          });
        }
      } catch {
        setStatusMsg({
          type: 'error',
          text: 'فشل قراءة ملف JSON. تأكد أن الملف سليم وغير تالف.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-3xl border-2 border-[#1A2530]/20 bg-white p-4 text-right text-[#1A2530] shadow-xs space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2530]/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1A2530]">
              إدارة حزم المود والأسماء والصور المخصصة
            </h3>
            {!compact && (
              <p className="text-[11px] font-bold text-[#1A2530]/65">
                يدمج أسماء وصور الممثلين والمخرجين وشعارات المنصات تلقائياً
              </p>
            )}
          </div>
        </div>
        <span className="rounded-full border border-[#D4AF37]/70 bg-[#FFF9E6] px-2.5 py-0.5 text-[10px] font-black text-[#1A2530] tabular-nums">
          {resolvedDb.meta.pack_name}
        </span>
      </div>

      {/* Method 1: Direct CORS-friendly JSON Link */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs font-black text-[#1A2530]">
            <Globe className="h-3.5 w-3.5 text-[#D91624]" />
            <span>الطريقة 1: لصق رابط ملف JSON مباشر</span>
          </label>
          <span className="text-[10px] font-bold text-[#1A2530]/60">
            GitHub Raw · jsDelivr · Cloudflare Pages
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#1A2530]/40" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://raw.githubusercontent.com/.../mod.json"
              aria-label="رابط حزمة البيانات الخارجية"
              className="w-full rounded-xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] py-2 pr-9 pl-3 text-left text-sm font-medium text-[#1A2530] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
              dir="ltr"
            />
          </div>
          <button
            type="button"
            onClick={handleFetchFromUrl}
            disabled={loading}
            className="min-h-[42px] shrink-0 rounded-xl border border-[#D4AF37] bg-[#D91624] px-4 py-2 text-xs font-black text-white shadow-xs transition hover:brightness-110 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'جاري التحميل...' : 'تفعيل الرابط'}
          </button>
        </div>
      </div>

      {/* Method 2: Prominent Device File Upload Button */}
      <div className="space-y-2 pt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="رفع ملف المود JSON من جهازك"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#D4AF37] bg-[#FFF9E6] px-4 py-3 text-right transition hover:border-[#D91624] hover:bg-[#FEF3C7] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37] shadow-xs transition group-hover:scale-105">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#1A2530]">
                الطريقة 2: رفع ملف المود (.json) من جهازك
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                اضغط هنا لاختيار ملف JSON المحفوظ على هاتفك أو جهازك وتفعيله فوراً
              </div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1A2530] px-3 py-2 text-xs font-black text-[#D4AF37] shadow-xs">
            <Upload className="h-3.5 w-3.5" />
            <span>اختيار ملف</span>
          </span>
        </button>

        {customDbPatch && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                clearCustomDatabase();
                setUrlInput('');
                setStatusMsg({
                  type: 'success',
                  text: 'تمت استعادة قاعدة البيانات الافتراضية بنجاح.',
                });
              }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D91624]/40 bg-[#D91624]/10 px-3 py-1.5 text-xs font-black text-[#D91624] hover:bg-[#D91624]/15 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>استعادة قاعدة البيانات الافتراضية</span>
            </button>
          </div>
        )}
      </div>

      {statusMsg && (
        <div
          className={`flex items-start gap-2 rounded-xl p-2.5 text-xs font-bold leading-relaxed ${
            statusMsg.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}

export default CustomDbLoaderPanel;
