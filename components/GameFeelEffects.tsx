'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getCurrencyLabel } from '@/lib/market-profiles';
import {
  playCashRegisterChaChing,
  playClapperboardSnap,
  playCrisisRedAlert,
} from '@/lib/sound-fx';

interface FloatingMoneyItem {
  id: string;
  delta: number;
  xOffset: number;
  createdAt: number;
}

const BUBBLE_LIFETIME_MS = 1650;
const BUBBLE_SWEEP_MAX_AGE_MS = 1950;

const SCREEN_TITLES: Record<string, string> = {
  STUDIO_CREATION: 'تأسيس الاستوديو',
  STUDIO_HUB: 'مكتب الإمبراطور',
  PROJECT_SETUP: 'ورشة كتابة السيناريو',
  CREW_CAST_CARDS: 'سبورة الكاستينج والنجوم',
  PRODUCTION_CRISES: 'بلاتوه التصوير الميداني',
  RELEASE_SIMULATION: 'بورصة شباك التذاكر',
  FESTIVALS_AWARDS: 'المسرح الذهبي للجوائز',
};

export function GameFeelEffects() {
  const worldMarket = useGameStore((s) => s.worldMarket);
  const currencyLabel = getCurrencyLabel(worldMarket);

  const [clapperTransition, setClapperTransition] = useState<{
    active: boolean;
    sceneName: string;
  }>({ active: false, sceneName: '' });

  const [floatingDeltas, setFloatingDeltas] = useState<FloatingMoneyItem[]>([]);
  const [crisisRedFlash, setCrisisRedFlash] = useState(false);

  const bubbleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const clapperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crisisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe once to Zustand store changes so rapid sequential cash/screen updates
  // never cancel earlier floating bubble removal timers.
  useEffect(() => {
    const timersMap = bubbleTimersRef.current;

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // 1. Clapperboard transition when switching screens
      if (state.activeScreen !== prevState.activeScreen) {
        playClapperboardSnap();
        setClapperTransition({
          active: true,
          sceneName: SCREEN_TITLES[state.activeScreen] || 'مشهد جديد',
        });
        if (clapperTimerRef.current) {
          clearTimeout(clapperTimerRef.current);
        }
        clapperTimerRef.current = setTimeout(() => {
          setClapperTransition((prev) => ({ ...prev, active: false }));
          clapperTimerRef.current = null;
        }, 620);
      }

      // 2. Floating Cash Deltas when cash changes
      const diff = state.cash - prevState.cash;
      if (Math.abs(diff) >= 50_000) {
        const now = Date.now();
        const id = `delta_${now}_${Math.random().toString(36).slice(2, 6)}`;
        const xOffset = Math.round((Math.random() - 0.5) * 84);
        playCashRegisterChaChing();

        setFloatingDeltas((prev) => {
          const fresh = prev.filter(
            (item) => now - item.createdAt < BUBBLE_SWEEP_MAX_AGE_MS
          );
          return [...fresh.slice(-3), { id, delta: diff, xOffset, createdAt: now }];
        });

        const removalTimer = setTimeout(() => {
          setFloatingDeltas((prev) => prev.filter((item) => item.id !== id));
          timersMap.delete(id);
        }, BUBBLE_LIFETIME_MS);

        timersMap.set(id, removalTimer);
      }

      // 3. Red Flash + Alarm when new filming crises erupt
      const nextCount =
        state.draft.crises?.filter((c) => !c.resolved).length || 0;
      const prevCount =
        prevState.draft.crises?.filter((c) => !c.resolved).length || 0;
      if (nextCount > prevCount && nextCount > 0) {
        playCrisisRedAlert();
        setCrisisRedFlash(true);
        if (crisisTimerRef.current) {
          clearTimeout(crisisTimerRef.current);
        }
        crisisTimerRef.current = setTimeout(() => {
          setCrisisRedFlash(false);
          crisisTimerRef.current = null;
        }, 680);
      }
    });

    // Safety sweeper guarantees no floating bubble can ever get stuck even if the tab is throttled
    const sweepInterval = setInterval(() => {
      const now = Date.now();
      setFloatingDeltas((prev) => {
        if (prev.length === 0) return prev;
        const remaining = prev.filter(
          (item) => now - item.createdAt < BUBBLE_SWEEP_MAX_AGE_MS
        );
        return remaining.length === prev.length ? prev : remaining;
      });
    }, 750);

    return () => {
      unsubscribe();
      clearInterval(sweepInterval);
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
      if (clapperTimerRef.current) clearTimeout(clapperTimerRef.current);
      if (crisisTimerRef.current) clearTimeout(crisisTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* FLOATING MONEY DELTAS (-5,000,000 ج.م / +12,000,000 ج.م) */}
      <div className="pointer-events-none fixed top-16 right-0 left-0 z-[70] flex justify-center">
        <AnimatePresence>
          {floatingDeltas.map((item) => {
            const isNegative = item.delta < 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16, x: item.xOffset, scale: 0.86 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [16, -12, -40, -68],
                  x: item.xOffset,
                  scale: [0.86, 1.05, 1, 0.92],
                }}
                exit={{ opacity: 0, y: -76, scale: 0.9 }}
                transition={{
                  duration: 1.55,
                  times: [0, 0.16, 0.72, 1],
                  ease: 'easeOut',
                }}
                dir="ltr"
                className={`absolute rounded-2xl border-2 px-3.5 py-1.5 font-typewriter text-sm font-black shadow-xl ${
                  isNegative
                    ? 'border-[#1A2530] bg-[#D91624] text-white'
                    : 'border-[#1A2530] bg-[#D4AF37] text-[#1A2530]'
                }`}
              >
                {isNegative ? '' : '+'}
                {formatMoney(item.delta)} {currencyLabel}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* CRISIS RED FLASH OVERLAY */}
      <AnimatePresence>
        {crisisRedFlash && (
          <motion.div
            key="crisis_red_flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.42, 0.12, 0.35, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
            className="pointer-events-none fixed inset-0 z-[65] bg-[#D91624]/45 mix-blend-multiply"
          />
        )}
      </AnimatePresence>

      {/* CINEMA CLAPPERBOARD SCREEN TRANSITION */}
      <AnimatePresence>
        {clapperTransition.active && (
          <motion.div
            key="clapper_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center bg-[#1A2530]/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.78, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 1.12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className="w-72 overflow-hidden rounded-2xl border-3 border-[#D4AF37] bg-[#1A2530] text-[#F9F6F0] shadow-2xl"
            >
              {/* Top Clapper Arm */}
              <motion.div
                initial={{ rotate: -26 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.14, ease: 'easeIn' }}
                style={{
                  transformOrigin: 'left bottom',
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, #1A2530, #1A2530 14px, #D4AF37 14px, #D4AF37 28px)',
                }}
                className="h-7 w-full border-b-2 border-[#D4AF37]"
              />
              <div className="p-4 text-center">
                <div className="font-typewriter text-[10px] font-bold tracking-widest text-[#D4AF37]">
                  SCENE TAKE · DAYLIGHT STUDIO
                </div>
                <div className="font-display mt-1 text-lg font-black text-white">
                  {clapperTransition.sceneName}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
