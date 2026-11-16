'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCcw, Maximize2, Play } from 'lucide-react';
import { playClickSound } from '@/lib/game-audio';

export default function LandscapeGuard({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) {
        setDismissedPrompt(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleLockLandscapeAndFullscreen = async () => {
    playClickSound();
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      const screenAny = window.screen as Screen & {
        orientation?: {
          lock?: (orientation: string) => Promise<void>;
        };
      };
      if (screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
        await screenAny.orientation.lock('landscape');
      }
    } catch {
      // Browsers on iOS or embedded frames may disallow programmatic lock
    } finally {
      setDismissedPrompt(true);
    }
  };

  return (
    <div className="relative fixed inset-0 w-screen h-dvh overflow-hidden select-none bg-[#0A0A0C] text-slate-100">
      {/* Main Fixed Widescreen Game Viewport */}
      <div className="relative w-full h-full overflow-hidden">
        {children}
      </div>

      {/* Sleek Cinematic Portrait Rotation Overlay */}
      {isPortrait && !dismissedPrompt && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0A0A0C]/95 backdrop-blur-xl p-4 text-center"
        >
          <div className="relative max-w-xs w-full rounded-2xl border border-amber-500/30 bg-slate-950/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <div className="relative flex items-center justify-center">
                <Smartphone className="h-6 w-6 animate-[spin_3s_ease-in-out_infinite] text-amber-400" />
                <RotateCcw className=" -right-1.5 -top-1.5 h-3.5 w-3.5 text-amber-300" />
              </div>
            </div>

            <div className="mb-1 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
              تجربة سينمائية بالعرض (Landscape)
            </div>

            <h2 className="mt-1.5 text-sm font-black text-white">
              يرجى تدوير هاتفك للوضع الأفقي
            </h2>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              صُممت مدينة الإنتاج في <span className="font-bold text-amber-400">HYPTRIX</span> لتعمل بالعرض الكامل كألعاب الاستراتيجية السينمائية.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLockLandscapeAndFullscreen}
                className="flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md transition-all active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                تفعيل ملء الشاشة والوضع الأفقي
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setDismissedPrompt(true);
                }}
                className="flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:border-amber-500/30 hover:text-white active:scale-95 transition-all"
              >
                <Play className="h-3 w-3 text-amber-400" />
                المتابعة في الشاشة الحالية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
