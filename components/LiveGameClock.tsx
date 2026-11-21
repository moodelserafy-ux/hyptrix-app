'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore, formatGameDate } from '@/lib/store';
import { tr } from '@/lib/i18n';

const DAY_DURATION_SECONDS = 18;

/**
 * Isolated 1-second game clock & floating scroll capsule.
 *
 * Isolating `secondsLeft`, `isPageActive`, and `isClockDetached` inside this tiny leaf
 * component guarantees that every 1-second tick NEVER re-renders `HomePage`, `StudioHubView`,
 * casting grids, or any active production stage!
 */
export function LiveGameClock({
  isPausedByOverlay,
  isAnyModalOpen,
}: {
  isPausedByOverlay: boolean;
  isAnyModalOpen: boolean;
}) {
  const studioCreated = useGameStore((s) => s.studioCreated);
  const gameDay = useGameStore((s) => s.gameDay);
  const currentYear = useGameStore((s) => s.currentYear);
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const advanceGameDay = useGameStore((s) => s.advanceGameDay);

  const [secondsLeft, setSecondsLeft] = useState(DAY_DURATION_SECONDS);
  const [isPageActive, setIsPageActive] = useState(true);
  const [isClockDetached, setIsClockDetached] = useState(false);

  const isPageActiveRef = useRef(true);
  const secondsRef = useRef(DAY_DURATION_SECONDS);
  const detachedRef = useRef(false);

  // Hysteresis scroll listener (detach > 68px, re-dock < 28px) eliminates scroll-edge jitter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;

    const syncScroll = () => {
      rafId = 0;
      const y = window.scrollY;
      if (!detachedRef.current && y > 68) {
        detachedRef.current = true;
        setIsClockDetached(true);
      } else if (detachedRef.current && y < 28) {
        detachedRef.current = false;
        setIsClockDetached(false);
      }
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(syncScroll);
      }
    };

    syncScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Automatically pause clock when user switches tab/app and resume immediately on return
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateActiveState = () => {
      const visible = document.visibilityState === 'visible' && !document.hidden;
      const focused =
        typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      const active = visible && focused;
      isPageActiveRef.current = active;
      setIsPageActive(active);
    };

    const handleFocus = () => {
      isPageActiveRef.current = true;
      setIsPageActive(true);
    };
    const handleBlur = () => {
      isPageActiveRef.current = false;
      setIsPageActive(false);
    };

    updateActiveState();
    document.addEventListener('visibilitychange', updateActiveState);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pagehide', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', updateActiveState);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pagehide', handleBlur);
    };
  }, []);

  // Crisp 1-second day ticker (re-renders ONLY this compact capsule)
  useEffect(() => {
    if (!studioCreated) return;
    const timer = setInterval(() => {
      const isHiddenOrBlurred =
        !isPageActiveRef.current ||
        (typeof document !== 'undefined' && document.hidden);

      if (isPausedByOverlay || isHiddenOrBlurred) {
        return;
      }

      if (secondsRef.current <= 1) {
        secondsRef.current = DAY_DURATION_SECONDS;
        setSecondsLeft(DAY_DURATION_SECONDS);
        advanceGameDay(1);
      } else {
        secondsRef.current -= 1;
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [studioCreated, isPausedByOverlay, advanceGameDay]);

  const isPaused = isPausedByOverlay || !isPageActive;
  const dayProgressPercent = Math.min(
    100,
    Math.max(
      4,
      Math.round(
        ((DAY_DURATION_SECONDS - secondsLeft) / DAY_DURATION_SECONDS) * 100
      )
    )
  );
  const formattedDate = formatGameDate(gameDay, currentYear, uiLanguage);

  const renderInner = (floating: boolean) => (
    <div
      className={`relative overflow-hidden ${
        floating
          ? 'rounded-2xl bg-[#1A2530]/96 text-[#F9F6F0] border-2 border-[#D4AF37] px-3 py-1.5 shadow-[0_12px_28px_rgba(26,37,48,0.42)]'
          : 'rounded-xl bg-[#F9F6F0]/10 text-[#F9F6F0] border border-[#D4AF37]/50 px-2.5 py-1'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg bg-[#D91624] text-[#D4AF37] border border-[#D4AF37]/60 ${
            floating ? 'h-6 w-6' : 'h-5 w-5'
          }`}
        >
          <Calendar className={floating ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        </span>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs font-extrabold tracking-tight text-[#F9F6F0] whitespace-nowrap">
              {formattedDate}
            </span>
            <span
              dir="ltr"
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-typewriter text-[10px] font-black tabular-nums ${
                isPaused
                  ? 'bg-[#D4AF37]/25 text-[#FFF3B0] border border-[#D4AF37]/40'
                  : 'bg-[#15803D] text-white'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              {isPaused ? tr(uiLanguage, 'Paused', 'مؤقت') : `${secondsLeft}s`}
            </span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] to-[#D91624] transition-[width] duration-300 ease-linear"
              style={{ width: `${dayProgressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Docked Navbar Capsule (stays in layout flow with zero layout shift) */}
      <div
        className={`flex items-center justify-center min-h-[36px] transition-opacity duration-200 ${
          isClockDetached ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {renderInner(false)}
      </div>

      {/* GPU-Only Floating HUD Capsule when scrolled past Navbar */}
      <AnimatePresence>
        {studioCreated && isClockDetached && (
          <motion.div
            key="floating-cinema-clock"
            initial={{ opacity: 0, y: -12, scale: 0.94 }}
            animate={{ opacity: isAnyModalOpen ? 0.38 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.94 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`fixed top-3 left-3 sm:top-4 sm:left-4 z-40 will-change-transform ${
              isAnyModalOpen ? 'pointer-events-none' : ''
            }`}
          >
            {renderInner(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
