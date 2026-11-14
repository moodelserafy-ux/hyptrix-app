'use client';

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ReleasedProjectRecord, StudioLogoConfig } from '@/lib/store';
import { StudioLogoSvg } from './StudioLogoSvg';
import { GENRES } from '@/lib/db-resolver';
import { formatMoney } from '@/lib/game-engine';
import { Share2, Download, Sparkles, Flame, Trophy, Check } from 'lucide-react';

export function ViralShareCard({
  project,
  studioName,
  ceoName,
  logo,
}: {
  project: ReleasedProjectRecord;
  studioName: string;
  ceoName: string;
  logo: StudioLogoConfig;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportedDataUrl, setExportedDataUrl] = useState<string | null>(null);

  const primaryGenreName =
    GENRES.find((g) => g.id === project.primaryGenre)?.name || project.primaryGenre;
  const secondaryGenreName = project.secondaryGenre
    ? GENRES.find((g) => g.id === project.secondaryGenre)?.name
    : null;

  const topReview = project.reviews[0] || {
    criticName: 'النقاد السينمائيون',
    publication: 'الشاشة الذهبية',
    quote: 'عمل سينمائي يفرض سيطرته الكاملة على شباك التذاكر!',
    score: project.criticScore,
  };

  const handleGeneratePng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        cacheBust: true,
      });
      setExportedDataUrl(dataUrl);

      const link = document.createElement('a');
      link.download = `Hyptrix-${project.title.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate viral PNG:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        data-testid="viral-share-poster"
        className="relative overflow-hidden rounded-3xl border-2 border-violet-300 border-b-4 border-b-violet-400 bg-gradient-to-br from-[#F5F3FF] via-white to-[#ECFEFF] p-5 text-right shadow-xl"
      >
        {/* Top Studio Branding & Watermark */}
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <StudioLogoSvg config={logo} size={48} />
            <div>
              <div className="font-display text-sm font-black text-slate-900">{studioName}</div>
              <div className="text-[11px] font-bold text-slate-500">
                إنتاج: {ceoName} · عام {project.year}
              </div>
            </div>
          </div>

          <div className="text-left">
            <div className="font-display text-xs font-black tracking-widest text-violet-700">
              HYPTRIX
            </div>
            <div className="text-[9px] font-black text-cyan-600">MOBILE TYCOON</div>
          </div>
        </div>

        {/* Movie Poster Title & Genre Line */}
        <div className="mt-4 text-center">
          <div className="inline-block rounded-full bg-violet-100 px-3 py-0.5 text-[10px] font-black text-violet-700">
            {project.format === 'film' ? 'فيلم سينمائي' : `مسلسل (${project.episodes} حلقة)`} ·{' '}
            {primaryGenreName}
            {secondaryGenreName ? ` / ${secondaryGenreName}` : ''} · {project.ageRating}
          </div>
          <h2 className="font-display mt-2 text-2xl font-black tracking-tight text-slate-900">
            « {project.title} »
          </h2>
          <p className="mt-1.5 text-xs font-medium text-slate-600">
            بطولة: <strong className="text-slate-900">{project.leadNames.join(' ، ')}</strong>
            {project.antagonistName ? ` · ضد: ${project.antagonistName}` : ''}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-indigo-600">إخراج: {project.directorName}</p>
        </div>

        {/* Box Office Millions/Billions & Ratings Strip */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border-2 border-indigo-100 bg-white p-3 text-center shadow-xs tabular-nums">
          <div>
            <div className="text-[10px] font-bold text-slate-400">الإيرادات</div>
            <div className="font-display mt-0.5 text-lg font-black text-emerald-600">
              {formatMoney(project.totalGrossRevenue)}
            </div>
            <div className="text-[9px] font-bold text-slate-400">ج.م إجمالي</div>
          </div>
          <div className="border-x border-indigo-50">
            <div className="text-[10px] font-bold text-slate-400">تقييم النقاد</div>
            <div className="font-display mt-0.5 text-lg font-black text-violet-700">
              {project.criticScore} <span className="text-[10px] text-slate-400">/10</span>
            </div>
            <div className="text-[9px] font-bold text-cyan-600">جمهور {project.audienceScore}/10</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">الترتيب</div>
            <div className="font-display mt-0.5 text-lg font-black text-rose-600">
              #{project.boxOfficeRank}
            </div>
            <div className="text-[9px] font-bold text-slate-400 truncate">{project.seasonName}</div>
          </div>
        </div>

        {/* Critic Quote Highlight */}
        <div className="mt-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center justify-between text-[11px] text-violet-700">
            <span className="font-black">{topReview.criticName}</span>
            <span className="font-bold">{topReview.publication}</span>
          </div>
          <p className="mt-1 text-xs italic leading-relaxed text-slate-700">
            &ldquo;{topReview.quote}&rdquo;
          </p>
        </div>

        {/* Viral Trend Impact Footer */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-black text-rose-700">
            <Flame className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="truncate">{project.viralTrendLabel}</span>
          </div>
          {project.awardsWon.length > 0 && (
            <div className="flex items-center gap-1 font-black text-amber-600 tabular-nums">
              <Trophy className="h-3.5 w-3.5" />
              <span>{project.awardsWon.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Share & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handleGeneratePng}
          disabled={exporting}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition active:border-b-0 active:translate-y-1 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>جاري استخراج البوستر...</span>
            </>
          ) : exportedDataUrl ? (
            <>
              <Check className="h-4 w-4" />
              <span>تم التحميل (استخراج مجدداً)</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>تحميل بوستر الشير الفيروسي (PNG)</span>
            </>
          )}
        </button>

        {exportedDataUrl && (
          <a
            href={exportedDataUrl}
            download={`Hyptrix-${project.title}.png`}
            className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 bg-white px-4 py-2.5 text-xs font-black text-violet-700"
          >
            <Download className="h-4 w-4" />
            <span>حفظ</span>
          </a>
        )}
      </div>
    </div>
  );
}
