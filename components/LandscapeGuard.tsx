'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw, Maximize2, Sparkles } from 'lucide-react';
import { playClickSound } from '@/lib/game-audio';

export default function LandscapeGuard({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [showIntroFlip, setShowIntroFlip] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait((prev) => {
        if (!prev && portrait) {
          setShowIntroFlip(true);
        }
        return portrait;
      });
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (!showIntroFlip) return;
    const timer = setTimeout(() => {
      setShowIntroFlip(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [showIntroFlip]);

  const handleEnterLandscapeNow = async () => {
    playClickSound();
    setShowIntroFlip(false);
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
      // CSS 90deg rotation below guarantees landscape even when browser blocks orientation.lock
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-dvh overflow-hidden select-none bg-[#0A0A0C] text-slate-100">
      {/*
        TRUE MANDATORY LANDSCAPE VIEWPORT:
        When the device/window is in Portrait (height > width), this container automatically
        flips 90 degrees with width = 100dvh and height = 100vw so the entire game runs
        horizontally in Landscape! When already in Landscape (width >= height), it fills 100vw x 100dvh.
      */}
      <div
        style={
          isPortrait
            ? {
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: '100dvh',
                height: '100vw',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
              }
            : {
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100dvh',
              }
        }
        className="overflow-hidden bg-[#0A0A0C]"
      >
        <div className="relative w-full h-full overflow-hidden">
          {children}
        </div>

        {/* Animated Phone Flip Transition Splash (Auto-dismisses after 2.4s or on tap) */}
        {isPortrait && showIntroFlip && (
          <div
            dir="rtl"
            onClick={handleEnterLandscapeNow}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-[#0A0A0C]/90 backdrop-blur-xl p-4 text-center cursor-pointer animate-fade-in"
          >
            <div className="max-w-md w-full rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
                <Smartphone className="h-7 w-7 animate-[spin_1.6s_ease-in-out_infinite] text-amber-400" />
                <RotateCw className="absolute -top-1 -right-1 h-4 w-4 text-amber-300" />
              </div>

              <div className="text-right flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  <span>تم تفعيل وضع الألعاب بالعرض تلقائياً</span>
                </div>
                <h2 className="mt-1 text-xs sm:text-sm font-black text-white">
                  اقلب الهاتف بالعرض للاستمتاع بمدينة الإنتاج السينمائية
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  تم تدوير واجهة اللعبة بالعرض تلقائياً — اضغط في أي مكان للبدء فوراً أو ملء الشاشة.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterLandscapeNow();
                }}
                className="flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-md active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>ابدأ بالعرض</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
