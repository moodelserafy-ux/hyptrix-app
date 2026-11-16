'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';


function splitStepNavigation(node: React.ReactNode): {
  content: React.ReactNode;
  navigation: React.ReactNode[];
} {
  if (Array.isArray(node)) {
    const parts = node.map(splitStepNavigation);
    return {
      content: parts.map((part) => part.content),
      navigation: parts.flatMap((part) => part.navigation),
    };
  }

  if (!React.isValidElement(node)) {
    return { content: node, navigation: [] };
  }

  const element = node as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  if (typeof element.props.className === 'string' && element.props.className.split(/\s+/).includes('step-navigation')) {
    return { content: null, navigation: [element] };
  }

  if (element.props.children === undefined) {
    return { content: element, navigation: [] };
  }

  const nested = splitStepNavigation(element.props.children);
  return {
    content: React.cloneElement(element, undefined, nested.content),
    navigation: nested.navigation,
  };
}

interface StepModalFrameProps {
  children: React.ReactNode;
  compactTop?: boolean;
  embedded?: boolean;
  label?: string;
  className?: string;
}

/**
 * Full-height work surface. The page behind it is locked, while this explicit
 * scroll region remains independently scrollable on touch and desktop devices.
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
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [embedded]);

  if (embedded) return <>{children}</>;

  const { content, navigation } = splitStepNavigation(children);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[69] bg-slate-950/45 backdrop-blur-[6px]"
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className={`fixed inset-x-2 bottom-2 z-[70] mx-auto flex min-h-0 max-w-6xl flex-col overflow-hidden rounded-[26px] border border-white/80 bg-[#F7F8FF]/[0.98] shadow-[0_28px_90px_-22px_rgba(15,23,42,0.62)] ring-1 ring-violet-200/50 sm:inset-x-4 sm:bottom-3 sm:rounded-[30px] ${
          compactTop ? 'top-[112px] sm:top-[108px]' : 'top-[112px] sm:top-[116px]'
        } ${className}`}
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div
          data-step-scroll
          className="step-modal-scroll relative min-h-0 flex-1 px-3 py-3 sm:px-6 sm:py-5"
          tabIndex={0}
          aria-label={`محتوى ${label} قابل للتمرير`}
        >
          {content}
        </div>
        {navigation.length > 0 && (
          <div className="relative z-20 max-h-[28vh] shrink-0 overflow-y-auto border-t border-indigo-100/80 bg-[#F7F8FF]/[0.99] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-28px_rgba(30,41,59,0.65)] sm:max-h-[22vh] sm:px-6 sm:py-3">
            <div className="mx-auto w-full max-w-4xl space-y-2">
              {navigation.map((item, index) => (
                <React.Fragment key={`step-navigation-${index}`}>{item}</React.Fragment>
              ))}
            </div>
          </div>
        )}
        <div className="pointer-events-none h-1 shrink-0 bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-400" />
      </motion.section>
    </>
  );
}
