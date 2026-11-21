'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import { getCurrencyLabel, type UiLanguageId } from '@/lib/market-profiles';
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

const BUBBLE_LIFETIME_MS = 1450;
const BUBBLE_MAX_AGE_MS = 1700;

const SCREEN_TITLES: Record<string, { en: string; ar: string }> = {
  STUDIO_CREATION: { en: 'Studio Foundation', ar: 'تأسيس الاستوديو' },
  STUDIO_HUB: { en: "Emperor's Desk", ar: 'مكتب الإمبراطور' },
  PROJECT_SETUP: { en: "Writers' Room", ar: 'ورشة كتابة السيناريو' },
  CREW_CAST_CARDS: { en: 'Casting Board', ar: 'سبورة الكاستينج والنجوم' },
  PRODUCTION_CRISES: { en: 'Live Soundstage', ar: 'بلاتوه التصوير الميداني' },
  RELEASE_SIMULATION: { en: 'Box-Office Exchange', ar: 'بورصة شباك التذاكر' },
  FESTIVALS_AWARDS: { en: 'Golden Awards Stage', ar: 'المسرح الذهبي للجوائز' },
  LEADERBOARD_SETTINGS: { en: 'Global Rankings', ar: 'التصنيف العالمي' },
};

function getSceneTitle(screen: string, lang: UiLanguageId): string {
  const entry = SCREEN_TITLES[screen];
  if (entry) return lang === 'en' ? entry.en : entry.ar;
  return lang === 'en' ? 'Next Scene' : 'مشهد جديد';
}

export function GameFeelEffects() {
  const worldMarket = useGameStore((s) => s.worldMarket);
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const currencyLabel = getCurrencyLabel(worldMarket, uiLanguage);

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

  useEffect(() => {
    const timersMap = bubbleTimersRef.current;

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // 1. Snappy GPU-only Clapperboard transition when switching screens
      if (state.activeScreen !== prevState.activeScreen) {
        playClapperboardSnap();
        setClapperTransition({
          active: true,
          sceneName: getSceneTitle(state.activeScreen, state.uiLanguage),
        });
        if (clapperTimerRef.current) {
          clearTimeout(clapperTimerRef.current);
        }
        clapperTimerRef.current = setTimeout(() => {
          setClapperTransition((prev) => ({ ...prev, active: false }));
          clapperTimerRef.current = null;
        }, 320);
      }

      // 2. Floating Cash Deltas when cash changes meaningfully
      const diff = state.cash - prevState.cash;
      if (Math.abs(diff) >= 50_000) {
        const now = Date.now();
        const id = `delta_${now}_${Math.random().toString(36).slice(2, 6)}`;
        const xOffset = Math.round((Math.random() - 0.5) * 76);
        playCashRegisterChaChing();

        setFloatingDeltas((prev) => {
          const fresh = prev.filter(
            (item) => now - item.createdAt < BUBBLE_MAX_AGE_MS
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
        }, 580);
      }
    });

    return () => {
      unsubscribe();
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
      if (clapperTimerRef.current) clearTimeout(clapperTimerRef.current);
      if (crisisTimerRef.current) clearTimeout(crisisTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* FLOATING MONEY DELTAS */}
      <div className="pointer-events-none fixed top-16 right-0 left-0 z-[70] flex justify-center">
        <AnimatePresence>
          {floatingDeltas.map((item) => {
            const isNegative = item.delta < 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14, x: item.xOffset, scale: 0.88 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [14, -12, -38, -64],
                  x: item.xOffset,
                  scale: [0.88, 1.04, 1, 0.92],
                }}
                exit={{ opacity: 0, y: -70, scale: 0.9 }}
                transition={{
                  duration: 1.38,
                  times: [0, 0.16, 0.72, 1],
                  ease: 'easeOut',
                }}
                dir="ltr"
                className={`absolute rounded-2xl border-2 px-3.5 py-1.5 font-typewriter text-sm font-black shadow-xl will-change-transform ${
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
            animate={{ opacity: [0, 0.38, 0.1, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="pointer-events-none fixed inset-0 z-[65] bg-[#D91624]/40"
          />
        )}
      </AnimatePresence>

      {/* SNAPPY GPU-ONLY CLAPPERBOARD TRANSITION (Zero full-screen backdrop-blur lag) */}
      <AnimatePresence>
        {clapperTransition.active && (
          <motion.div
            key="clapper_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center bg-[#1A2530]/40"
          >
            <motion.div
              initial={{ scale: 0.86, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 1.06, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-64 overflow-hidden rounded-2xl border-3 border-[#D4AF37] bg-[#1A2530] text-[#F9F6F0] shadow-2xl will-change-transform"
            >
              <motion.div
                initial={{ rotate: -22 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.11, ease: 'easeIn' }}
                style={{
                  transformOrigin: 'left bottom',
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, #1A2530, #1A2530 14px, #D4AF37 14px, #D4AF37 28px)',
                }}
                className="h-6 w-full border-b-2 border-[#D4AF37]"
              />
              <div className="p-3.5 text-center">
                <div className="font-typewriter text-[10px] font-bold tracking-widest text-[#D4AF37]">
                  NEELYO · SCENE TAKE
                </div>
                <div className="font-display mt-1 text-base font-black text-white">
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
