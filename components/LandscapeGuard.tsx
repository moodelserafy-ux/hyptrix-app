'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Smartphone, RotateCw, Maximize2, Sparkles } from 'lucide-react';

export function LandscapeGuard() {
  const [mustRotate, setMustRotate] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  const updateOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const compactScreen = Math.min(window.innerWidth, window.innerHeight) <= 720;
    setMustRotate(compactScreen && window.innerHeight > window.innerWidth);
  }, []);

  useEffect(() => {
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, [updateOrientation]);

  const enterImmersiveMode = async () => {
    setFullscreenError(false);
    try {
      const root = document.documentElement;
      if (root.requestFullscreen && !document.fullscreenElement) {
        await root.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: 'landscape') => Promise<void>;
      };
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => undefined);
      }
    } catch {
      setFullscreenError(true);
    }
    updateOrientation();
  };

  return (
    <AnimatePresence>
      {mustRotate && (
        <motion.div
          key="hyptrix-landscape-guard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#07070a] px-5 py-6 text-center text-white"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landscape-guard-title"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(212,175,55,.19),transparent_52%),radial-gradient(ellipse_at_90%_100%,rgba(229,9,20,.12),transparent_45%)]" />
          <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-amber-400/40 bg-slate-950/70 shadow-[0_0_60px_rgba(212,175,55,.13)]">
              <motion.div
                animate={{ rotate: [0, 0, -90, -90, 0] }}
                transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, times: [0, 0.25, 0.48, 0.78, 1] }}
                className="relative flex h-14 w-9 flex-col items-center justify-between rounded-xl border-2 border-amber-300 bg-[#16161d] p-1.5 shadow-[0_0_24px_rgba(212,175,55,.25)]"
              >
                <span className="h-1 w-3 rounded-full bg-amber-300/70" />
                <Smartphone className="h-5 w-5 text-amber-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, 90, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-red-500/50 bg-red-950 text-red-300"
              >
                <RotateCw className="h-4 w-4" />
              </motion.div>
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> HYPTRIX · CINEMATIC MODE
            </div>
            <h2 id="landscape-guard-title" className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              إمبراطورية السينما تستحق شاشة أعرض
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">
              لفّ هاتفك للوضع الأفقي لفتح مدينة الاستوديو والتحكم في اللعبة بكامل مساحتها.
            </p>
            <button
              type="button"
              onClick={enterImmersiveMode}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-500 to-amber-300 px-6 text-sm font-black text-[#17120a] shadow-[0_12px_35px_rgba(212,175,55,.2)] transition hover:brightness-110 active:scale-[.98]"
            >
              <Maximize2 className="h-4 w-4" />
              تدوير الشاشة وبدء الوضع السينمائي
            </button>
            {fullscreenError && (
              <p className="mt-3 text-[11px] font-semibold text-amber-200/80">
                قد يمنع المتصفح ملء الشاشة تلقائياً؛ أدر الهاتف يدوياً للمتابعة.
              </p>
            )}
            <div className="mt-7 flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-500">
              <span className="h-px w-8 bg-slate-700" /> LANDSCAPE ONLY <span className="h-px w-8 bg-slate-700" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
