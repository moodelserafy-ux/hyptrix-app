'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { formatMoney } from '@/lib/game-engine';
import {
  playCashRegisterChaChing,
  playClapperboardSnap,
  playCrisisRedAlert,
} from '@/lib/sound-fx';

interface FloatingMoneyItem {
  id: string;
  delta: number;
  xOffset: number;
}

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
  const { activeScreen, cash, draft } = useGameStore();

  const prevScreenRef = useRef<string>(activeScreen);
  const prevCashRef = useRef<number>(cash);
  const prevCrisisCountRef = useRef<number>(draft.crises?.length || 0);

  const [clapperTransition, setClapperTransition] = useState<{
    active: boolean;
    sceneName: string;
  }>({ active: false, sceneName: '' });

  const [floatingDeltas, setFloatingDeltas] = useState<FloatingMoneyItem[]>([]);
  const [crisisRedFlash, setCrisisRedFlash] = useState(false);

  // 1. Clapperboard transition when switching screens
  useEffect(() => {
    if (prevScreenRef.current !== activeScreen) {
      prevScreenRef.current = activeScreen;
      playClapperboardSnap();
      setClapperTransition({
        active: true,
        sceneName: SCREEN_TITLES[activeScreen] || 'مشهد جديد',
      });
      const timer = setTimeout(() => {
        setClapperTransition((prev) => ({ ...prev, active: false }));
      }, 620);
      return () => clearTimeout(timer);
    }
  }, [activeScreen]);

  // 2. Floating Cash Deltas when cash changes
  useEffect(() => {
    const diff = cash - prevCashRef.current;
    prevCashRef.current = cash;
    if (Math.abs(diff) >= 50_000) {
      const id = `delta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const xOffset = (Math.random() - 0.5) * 90;
      setFloatingDeltas((prev) => [...prev.slice(-4), { id, delta: diff, xOffset }]);
      playCashRegisterChaChing();
      const timer = setTimeout(() => {
        setFloatingDeltas((prev) => prev.filter((item) => item.id !== id));
      }, 1750);
      return () => clearTimeout(timer);
    }
  }, [cash]);

  // 3. Red Flash + Alarm when new filming crises erupt
  useEffect(() => {
    const count = draft.crises?.filter((c) => !c.resolved).length || 0;
    if (count > prevCrisisCountRef.current && count > 0) {
      playCrisisRedAlert();
      setCrisisRedFlash(true);
      const timer = setTimeout(() => setCrisisRedFlash(false), 680);
      prevCrisisCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevCrisisCountRef.current = count;
  }, [draft.crises]);

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
                initial={{ opacity: 0, y: 18, x: item.xOffset, scale: 0.85 }}
                animate={{ opacity: 1, y: -42, x: item.xOffset, scale: 1.08 }}
                exit={{ opacity: 0, y: -78, scale: 0.92 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                dir="ltr"
                className={`absolute rounded-2xl border-2 px-3.5 py-1.5 font-typewriter text-sm font-black shadow-xl ${
                  isNegative
                    ? 'border-[#1A2530] bg-[#D91624] text-white'
                    : 'border-[#1A2530] bg-[#D4AF37] text-[#1A2530]'
                }`}
              >
                {isNegative ? '' : '+'}
                {formatMoney(item.delta)} EGP
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
                  🎬 {clapperTransition.sceneName}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
