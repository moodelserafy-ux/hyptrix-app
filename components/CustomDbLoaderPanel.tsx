'use client';

import React, { useRef, useState } from 'react';
import { useGameStore } from '@/lib/store';
import {
  getResolvedDatabase,
  validateCustomDatabase,
  MasterDatabase,
} from '@/lib/db-resolver';
import type { UiLanguageId } from '@/lib/market-profiles';
import { getUiDir, tr } from '@/lib/i18n';
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

function summarizePackChanges(
  data: Partial<MasterDatabase>,
  lang: UiLanguageId
): string {
  const parts: string[] = [];
  if (Array.isArray(data.actors) && data.actors.length > 0) {
    parts.push(
      lang === 'ar' ? `${data.actors.length} ممثل` : `${data.actors.length} actors`
    );
  }
  if (Array.isArray(data.crew) && data.crew.length > 0) {
    parts.push(
      lang === 'ar'
        ? `${data.crew.length} طاقم إخراج/تصوير`
        : `${data.crew.length} crew members`
    );
  }
  if (Array.isArray(data.streaming_platforms) && data.streaming_platforms.length > 0) {
    parts.push(
      lang === 'ar'
        ? `${data.streaming_platforms.length} منصة/قناة`
        : `${data.streaming_platforms.length} platforms`
    );
  }
  if (Array.isArray(data.competitor_studios) && data.competitor_studios.length > 0) {
    parts.push(
      lang === 'ar'
        ? `${data.competitor_studios.length} شركة منافسة`
        : `${data.competitor_studios.length} rival studios`
    );
  }
  return parts.length > 0 ? ` (${parts.join(' · ')})` : '';
}

export function CustomDbLoaderPanel({ compact = false }: { compact?: boolean }) {
  const {
    worldMarket,
    uiLanguage,
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
  const dir = getUiDir(uiLanguage);
  const isAr = uiLanguage === 'ar';

  const handleFetchFromUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) {
      setStatusMsg({
        type: 'error',
        text: tr(
          uiLanguage,
          'Please paste a direct raw JSON URL first (e.g., GitHub Raw, jsDelivr, or Cloudflare Pages).',
          'يرجى لصق رابط ملف JSON مباشر أولاً (مثل GitHub Raw أو jsDelivr أو Cloudflare Pages).'
        ),
      });
      return;
    }

    if (/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i.test(raw)) {
      setStatusMsg({
        type: 'error',
        text: tr(
          uiLanguage,
          'Telegram post links are not raw JSON files. Paste a direct raw URL (GitHub Raw / jsDelivr) or download the file and use "Upload Mod File" below.',
          'روابط منشورات تيليجرام ليست ملفات JSON خام. استخدم رابطاً مباشراً (GitHub Raw / jsDelivr / Cloudflare Pages) أو نزّل الملف واضغط على زر «رفع ملف المود من جهازك» بالأسفل.'
        ),
      });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    const directUrl = normalizeClientDirectUrl(raw);

    try {
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
              tr(
                uiLanguage,
                'Could not fetch the direct URL. Ensure it points to a raw JSON file or upload from your device.',
                'تعذر تحميل الرابط المباشر. تأكد أنه رابط JSON خام أو ارفع الملف من جهازك.'
              ),
          });
          return;
        }

        loadedData = proxyPayload.data;
        finalSavedUrl = proxyPayload.normalizedUrl || directUrl;
      }

      importCustomDatabase(loadedData, finalSavedUrl);
      setUrlInput(finalSavedUrl);
      const packName =
        loadedData.meta?.pack_name || tr(uiLanguage, 'Custom Pack', 'حزمة مخصصة');
      setStatusMsg({
        type: 'success',
        text: tr(
          uiLanguage,
          `Pack activated successfully: ${packName}${summarizePackChanges(loadedData, uiLanguage)}`,
          `تم تفعيل الحزمة بنجاح: ${packName}${summarizePackChanges(loadedData, uiLanguage)}`
        ),
      });
    } catch {
      setStatusMsg({
        type: 'error',
        text: tr(
          uiLanguage,
          'Could not load the URL. Verify the link or upload the JSON file directly from your device.',
          'تعذر تحميل الرابط المباشر. تأكد من صحة الرابط أو استخدم زر رفع الملف من جهازك.'
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
            text:
              validation.error ||
              tr(uiLanguage, 'Incompatible mod pack file.', 'ملف الحزمة غير متوافق.'),
          });
        } else {
          importCustomDatabase(validation.data, file.name);
          const packLabel = validation.data.meta?.pack_name || file.name;
          setStatusMsg({
            type: 'success',
            text: tr(
              uiLanguage,
              `Imported and merged "${packLabel}" successfully${summarizePackChanges(validation.data, uiLanguage)}!`,
              `تم استيراد ودمج حزمة "${packLabel}" بنجاح${summarizePackChanges(validation.data, uiLanguage)}!`
            ),
          });
        }
      } catch {
        setStatusMsg({
          type: 'error',
          text: tr(
            uiLanguage,
            'Failed to parse JSON file. Make sure the file is valid and uncorrupted.',
            'فشل قراءة ملف JSON. تأكد أن الملف سليم وغير تالف.'
          ),
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      dir={dir}
      className={`rounded-3xl border-2 border-[#1A2530]/20 bg-white p-4 ${
        isAr ? 'text-right' : 'text-left'
      } text-[#1A2530] shadow-xs space-y-3`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2530]/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1A2530]">
              {tr(
                uiLanguage,
                'Custom Mod Packs, Names & Portraits',
                'إدارة حزم المود والأسماء والصور المخصصة'
              )}
            </h3>
            {!compact && (
              <p className="text-[11px] font-bold text-[#1A2530]/65">
                {tr(
                  uiLanguage,
                  'Automatically merges custom talent names, portraits, and platform logos',
                  'يدمج أسماء وصور الممثلين والمخرجين وشعارات المنصات تلقائياً'
                )}
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
            <span>
              {tr(
                uiLanguage,
                'Method 1: Paste a Direct JSON URL',
                'الطريقة 1: لصق رابط ملف JSON مباشر'
              )}
            </span>
          </label>
          <span className="text-[10px] font-bold text-[#1A2530]/60">
            GitHub Raw · jsDelivr · Cloudflare
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
              aria-label={tr(uiLanguage, 'External database pack URL', 'رابط حزمة البيانات الخارجية')}
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
            {loading
              ? tr(uiLanguage, 'Loading...', 'جاري التحميل...')
              : tr(uiLanguage, 'Activate URL', 'تفعيل الرابط')}
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
          aria-label={tr(uiLanguage, 'Upload JSON mod file from device', 'رفع ملف المود JSON من جهازك')}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`group flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#D4AF37] bg-[#FFF9E6] px-4 py-3 ${
            isAr ? 'text-right' : 'text-left'
          } transition hover:border-[#D91624] hover:bg-[#FEF3C7] cursor-pointer`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A2530] text-[#D4AF37] shadow-xs transition group-hover:scale-105">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#1A2530]">
                {tr(
                  uiLanguage,
                  'Method 2: Upload Mod File (.json) from Device',
                  'الطريقة 2: رفع ملف المود (.json) من جهازك'
                )}
              </div>
              <div className="text-[11px] font-bold text-[#1A2530]/70">
                {tr(
                  uiLanguage,
                  'Tap to select a local JSON mod pack from your phone or computer',
                  'اضغط هنا لاختيار ملف JSON المحفوظ على هاتفك أو جهازك وتفعيله فوراً'
                )}
              </div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1A2530] px-3 py-2 text-xs font-black text-[#D4AF37] shadow-xs">
            <Upload className="h-3.5 w-3.5" />
            <span>{tr(uiLanguage, 'Choose File', 'اختيار ملف')}</span>
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
                  text: tr(
                    uiLanguage,
                    'Default database restored successfully.',
                    'تمت استعادة قاعدة البيانات الافتراضية بنجاح.'
                  ),
                });
              }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D91624]/40 bg-[#D91624]/10 px-3 py-1.5 text-xs font-black text-[#D91624] hover:bg-[#D91624]/15 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>
                {tr(
                  uiLanguage,
                  'Restore Default Database',
                  'استعادة قاعدة البيانات الافتراضية'
                )}
              </span>
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
