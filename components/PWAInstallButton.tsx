'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);

      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
    }, 0);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex min-h-[38px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-2.5 py-1.5 text-xs font-black text-indigo-700 transition active:border-b-2 active:translate-y-0.5 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5 shrink-0 text-violet-600" />
        <span className="hidden sm:inline">تطبيق الموبايل</span>
        <span className="sm:hidden">APP</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white p-5 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-violet-600" />
                <h3 className="text-sm font-black text-slate-900">تثبيت لعبة Hyptrix على هاتفك</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="إغلاق نافذة التثبيت"
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
              {isIOS ? (
                <>
                  <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.</p>
                  <p>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> للعب بملء الشاشة كتطبيق أصلي.</p>
                </>
              ) : (
                <>
                  <p>1. افتح قائمة المتصفح (النقاط الثلاث أعلى الشاشة).</p>
                  <p>2. اختر <strong>تثبيت التطبيق (Install App)</strong> لتشغيل Hyptrix كتطبيق موبايل مستقل.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-black text-white"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}
