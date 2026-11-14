'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { validateCustomDatabase } from '@/lib/db-resolver';
import {
  Settings,
  Upload,
  FileJson,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    customDbPatch,
    importCustomDatabase,
    clearCustomDatabase,
    resetEntireGameAndStartFresh,
  } = useGameStore();

  const [jsonText, setJsonText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = String(event.target?.result || '');
        const parsed = JSON.parse(content);
        const validation = validateCustomDatabase(parsed);
        if (!validation.valid || !validation.data) {
          setStatusMsg({
            type: 'error',
            text: validation.error || 'ملف JSON غير متوافق مع هيكل بيانات اللعبة.',
          });
          return;
        }
        importCustomDatabase(validation.data, file.name);
        setStatusMsg({
          type: 'success',
          text: `تم استيراد ملف البيانات (${file.name}) وتحديث قائمة الممثلين والشركات بنجاح!`,
        });
      } catch {
        setStatusMsg({
          type: 'error',
          text: 'تعذر قراءة ملف JSON. تأكد من صحة صياغة الملف.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyPastedJson = () => {
    if (!jsonText.trim()) return;
    setStatusMsg(null);
    try {
      const parsed = JSON.parse(jsonText);
      const validation = validateCustomDatabase(parsed);
      if (!validation.valid || !validation.data) {
        setStatusMsg({
          type: 'error',
          text: validation.error || 'النص المدخل لا يحتوي على أقسام البيانات المطلوبة.',
        });
        return;
      }
      importCustomDatabase(validation.data, 'ملف مخصص');
      setJsonText('');
      setStatusMsg({
        type: 'success',
        text: 'تم تطبيق بيانات ملف JSON المخصص بنجاح!',
      });
    } catch {
      setStatusMsg({
        type: 'error',
        text: 'صيغة JSON غير صحيحة. تأكد من إغلاق الأقواس وعلامات التنصيص.',
      });
    }
  };

  const handleRestoreDefaultDb = () => {
    clearCustomDatabase();
    setStatusMsg({
      type: 'success',
      text: 'تمت استعادة قاعدة البيانات الافتراضية للعبة بنجاح.',
    });
  };

  const handleConfirmResetAll = () => {
    resetEntireGameAndStartFresh();
    setConfirmReset(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-300 bg-white p-5 shadow-2xl sm:p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-black text-slate-900">
                  إعدادات الاستوديو وإدارة البيانات
                </h2>
                <p className="text-[11px] font-bold text-slate-500">
                  تخصيص ملف البيانات أو إعادة ضبط اللعبة من البداية
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              aria-label="إغلاق الإعدادات"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-5">
            {/* Section 1: Upload or Paste Custom JSON Database */}
            <div className="rounded-2xl border-2 border-indigo-100 bg-[#F8FAFF] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-violet-600" />
                  <h3 className="font-display text-sm font-black text-slate-900">
                    إضافة ملف بيانات مخصص (JSON)
                  </h3>
                </div>
                {customDbPatch && (
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    ملف مخصص مفعل ✓
                  </span>
                )}
              </div>

              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">
                يمكنك رفع ملف JSON يحتوي على أسماء وصور الممثلين والمخرجين والشركات والمنصات المفضلة لديك، أو لصق محتوى الملف مباشرة:
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-xs transition hover:brightness-105 active:border-b-0 active:translate-y-0.5"
                >
                  <Upload className="h-4 w-4" />
                  <span>اختيار ملف JSON من جهازك</span>
                </button>

                {customDbPatch && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultDb}
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>استعادة الافتراضي</span>
                  </button>
                )}
              </div>

              <div className="mt-3">
                <textarea
                  rows={3}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='أو الصق كود JSON هنا مباشرة ثم اضغط "تطبيق الكود"...'
                  dir="ltr"
                  className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 font-mono text-[11px] text-slate-800 focus:border-violet-600 focus:outline-none"
                />
                {jsonText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyPastedJson}
                    className="mt-2 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تطبيق كود JSON المنسوخ</span>
                  </button>
                )}
              </div>
            </div>

            {statusMsg && (
              <div
                className={`flex items-center gap-2 rounded-2xl border p-3 text-xs font-bold ${
                  statusMsg.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Section 2: Reset Current Data & Start Fresh */}
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <h3 className="font-display text-sm font-black text-rose-950">
                  مسح البيانات الحالية والبدء من جديد
                </h3>
              </div>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-rose-900">
                سيؤدي هذا الخيار إلى مسح شركتك الحالية، رصيد الخزينة، سجل الأفلام والمسلسلات، والعودة لشاشة تأسيس شركة إنتاج جديدة من الصفر.
              </p>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-600 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>مسح البيانات الحالية والبدء من جديد</span>
                </button>
              ) : (
                <div className="mt-3 space-y-2 rounded-xl border border-rose-300 bg-white p-3">
                  <div className="text-center text-xs font-black text-rose-800">
                    هل أنت متأكد من مسح كافة بيانات الاستوديو والبدء من الصفر؟
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmResetAll}
                      className="min-h-[40px] rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700"
                    >
                      نعم، امسح وابدأ من جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
