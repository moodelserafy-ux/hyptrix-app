'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface StepModalFrameProps {
  children: React.ReactNode;
  compactTop?: boolean;
  embedded?: boolean;
  label?: string;
  className?: string;
}

/**
 * A focused, viewport-sized workspace for multi-step game flows.
 * The game HUD stays visible above it while only the active step scrolls.
 */
export function StepModalFrame({
  children,
  compactTop = false,
  embedded = false,
  label = 'نافذة العمل',
  className = '',
}: StepModalFrameProps) {
  useEffect(() => {
    if (embedded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [embedded]);

  if (embedded) return <>{children}</>;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[25] bg-slate-950/35 backdrop-blur-[5px]"
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className={`fixed inset-x-2 bottom-2 z-[26] mx-auto flex max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/75 bg-[#F7F8FF]/95 shadow-[0_28px_90px_-22px_rgba(15,23,42,0.55)] ring-1 ring-violet-200/40 ${
          compactTop ? 'top-[76px]' : 'top-[104px]'
        } ${className}`}
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-5">
          {children}
        </div>
        <div className="pointer-events-none h-1 shrink-0 bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-400" />
      </motion.section>
    </>
  );
}
