'use client';

import React, { useId } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import type { UiLanguageId } from '@/lib/market-profiles';
import { triggerTelegramHaptic } from './TelegramMiniAppBridge';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'card';
  tone?: 'light' | 'dark';
  className?: string;
}

const OPTIONS: {
  id: UiLanguageId;
  shortLabel: string;
  fullLabel: string;
  subLabel: string;
}[] = [
  {
    id: 'en',
    shortLabel: 'EN',
    fullLabel: 'English',
    subLabel: 'Global · LTR',
  },
  {
    id: 'ar',
    shortLabel: 'عربي',
    fullLabel: 'العربية',
    subLabel: 'عربي · RTL',
  },
];

/**
 * Sleek segmented bilingual language switcher (EN | عربي).
 * Keeps internal LTR ordering so options never jump under the thumb when toggled.
 */
export function LanguageSwitcher({
  variant = 'compact',
  tone = 'light',
  className = '',
}: LanguageSwitcherProps) {
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const setUiLanguage = useGameStore((s) => s.setUiLanguage);
  const pillLayoutId = useId();

  const activeLang: UiLanguageId = uiLanguage === 'ar' ? 'ar' : 'en';

  const handleSelect = (next: UiLanguageId) => {
    if (next === activeLang) return;
    triggerTelegramHaptic('selection');
    setUiLanguage(next, true);
  };

  if (variant === 'card') {
    const isDark = tone === 'dark';
    return (
      <div
        dir="ltr"
        role="radiogroup"
        aria-label="Interface language"
        className={`grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 ${
          isDark
            ? 'bg-[#0F171E] border border-[#D4AF37]/30'
            : 'bg-[#EDE6D6] border border-[#1A2530]/10 shadow-[inset_0_1px_2px_rgba(26,37,48,0.06)]'
        } ${className}`}
      >
        {OPTIONS.map((opt) => {
          const isActive = activeLang === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(opt.id)}
              className={`relative flex min-h-[54px] flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                isActive
                  ? isDark
                    ? 'text-[#1A2530]'
                    : 'text-[#F9F6F0]'
                  : isDark
                  ? 'text-[#F9F6F0]/70 hover:text-[#F9F6F0]'
                  : 'text-[#1A2530]/70 hover:text-[#1A2530]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={`lang-card-pill-${pillLayoutId}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className={`absolute inset-0 rounded-xl ${
                    isDark
                      ? 'bg-[#D4AF37] shadow-[0_6px_16px_rgba(212,175,55,0.28)]'
                      : 'bg-[#1A2530] shadow-[0_6px_18px_rgba(26,37,48,0.22)] ring-1 ring-[#D4AF37]/70'
                  }`}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 text-sm font-black leading-tight whitespace-nowrap">
                <span>{opt.fullLabel}</span>
                {isActive && (
                  <Check
                    className={`h-3.5 w-3.5 stroke-[3] ${
                      isDark ? 'text-[#1A2530]' : 'text-[#D4AF37]'
                    }`}
                  />
                )}
              </span>
              <span
                className={`relative z-10 mt-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap ${
                  isActive
                    ? isDark
                      ? 'text-[#1A2530]/75'
                      : 'text-[#D4AF37]/90'
                    : isDark
                    ? 'text-[#F9F6F0]/45'
                    : 'text-[#1A2530]/45'
                }`}
              >
                {opt.subLabel}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact sleek header segmented toggle (EN | عربي)
  const isDark = tone === 'dark';
  return (
    <div
      dir="ltr"
      role="radiogroup"
      aria-label="Interface language"
      className={`inline-flex items-center rounded-xl p-1 ${
        isDark
          ? 'bg-[#0F171E] border border-[#D4AF37]/40'
          : 'bg-[#EDE6D6]/95 border border-[#D4AF37]/55 shadow-[inset_0_1px_2px_rgba(26,37,48,0.07)]'
      } ${className}`}
    >
      {OPTIONS.map((opt) => {
        const isActive = activeLang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(opt.id)}
            className={`relative flex min-h-[36px] min-w-[46px] items-center justify-center rounded-lg px-2.5 text-xs font-black tracking-tight transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
              isActive
                ? isDark
                  ? 'text-[#1A2530]'
                  : 'text-[#FFF3B0]'
                : isDark
                ? 'text-[#F9F6F0]/65 hover:text-[#F9F6F0]'
                : 'text-[#1A2530]/65 hover:text-[#1A2530]'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`lang-compact-pill-${pillLayoutId}`}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className={`absolute inset-0 rounded-lg ${
                  isDark
                    ? 'bg-[#D4AF37] shadow-xs'
                    : 'bg-[#1A2530] shadow-[0_3px_10px_rgba(26,37,48,0.22)]'
                }`}
              />
            )}
            <span className="relative z-10">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
