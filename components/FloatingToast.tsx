'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'warning' | 'success' | 'info';

interface FloatingToastProps {
  message: string | null | undefined;
  onDismiss: () => void;
  tone?: ToastTone;
  duration?: number;
}

export function FloatingToast({
  message,
  onDismiss,
  tone = 'warning',
  duration = 3600,
}: FloatingToastProps) {
  const [visible, setVisible] = useState(Boolean(message));
  const [portalReady, setPortalReady] = useState(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;

    const timeout = window.setTimeout(() => {
      setVisible(false);
      onDismissRef.current();
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [message, duration]);

  const toneStyles = {
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-100 text-amber-700',
      title: 'تنبيه سريع',
    },
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-100 text-emerald-700',
      title: 'تم بنجاح',
    },
    info: {
      icon: Info,
      border: 'border-violet-200/80',
      iconBg: 'bg-violet-100 text-violet-700',
      title: 'معلومة',
    },
  }[tone];
  const Icon = toneStyles.icon;

  if (!portalReady || typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-5 z-[100] flex justify-center" dir="rtl">
      <AnimatePresence>
        {visible && message && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: 22, scale: 0.94, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border ${toneStyles.border} bg-white/95 p-3 shadow-[0_18px_54px_-16px_rgba(15,23,42,0.45)] backdrop-blur-xl`}
          >
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneStyles.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black text-slate-500">{toneStyles.title}</div>
              <p className="mt-0.5 text-xs font-bold leading-relaxed text-slate-800">{message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onDismissRef.current();
              }}
              aria-label="إغلاق التنبيه"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
