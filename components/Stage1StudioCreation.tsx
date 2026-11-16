'use client';

import React, { useState } from 'react';
import { StepModalFrame } from './StepModalFrame';
import { FloatingToast } from './FloatingToast';
import { motion, AnimatePresence } from 'motion/react';
import {
  useGameStore,
  CoreEmblemId,
  LogoFrameId,
  LogoPaletteId,
} from '@/lib/store';
import { FounderPerk, MarketRegion } from '@/lib/game-engine';
import {
  StudioLogoSvg,
  EMBLEM_OPTIONS,
  FRAME_OPTIONS,
  PALETTE_OPTIONS,
  PREMADE_LOGO_COMBINATIONS,
} from './StudioLogoSvg';
import {
  Sparkles,
  TrendingUp,
  Handshake,
  Play,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Shuffle,
  Wand2,
  Shapes,
  Frame,
  Palette,
  Compass,
  Zap,
} from 'lucide-react';

export function Stage1StudioCreation() {
  const {
    studioName: initialStudioName,
    ceoName: initialCeoName,
    logo: initialLogo,
    founderPerk: initialPerk,
    initializeStudio,
  } = useGameStore();

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [logoDrawerTab, setLogoDrawerTab] = useState<'presets' | 'emblems' | 'frames' | 'colors'>('presets');

  const [studioName, setStudioName] = useState(initialStudioName || 'العقرب ستوديوز');
  const [ceoName, setCeoName] = useState(initialCeoName || 'محمود الصيرفي');
  const [emblem, setEmblem] = useState<CoreEmblemId>(initialLogo.emblem || 'golden_scorpion');
  const [frame, setFrame] = useState<LogoFrameId>(initialLogo.frame || 'royal_shield');
  const [palette, setPalette] = useState<LogoPaletteId>('amethyst_pearl');
  const [founderPerk, setFounderPerk] = useState<FounderPerk>(initialPerk);
  const [region] = useState<MarketRegion>('egypt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const unlockAndGoTo = (nextStep: 1 | 2 | 3 | 4) => {
    if (nextStep === 2 && (!studioName.trim() || !ceoName.trim())) {
      setErrorMsg('يرجى كتابة اسم الاستوديو واسم المدير التنفيذي أولاً للمتابعة.');
      return;
    }
    setErrorMsg(null);
    setWizardStep(nextStep);
  };

  const handleRandomizeLogo = () => {
    const rEmblem = EMBLEM_OPTIONS[Math.floor(Math.random() * EMBLEM_OPTIONS.length)].id;
    const rFrame = FRAME_OPTIONS[Math.floor(Math.random() * FRAME_OPTIONS.length)].id;
    const rPalette = PALETTE_OPTIONS[Math.floor(Math.random() * PALETTE_OPTIONS.length)].id;
    setEmblem(rEmblem);
    setFrame(rFrame);
    setPalette(rPalette);
  };

  const handleCreateStudio = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studioName.trim() || !ceoName.trim()) {
      setErrorMsg('يرجى إدخال اسم شركة الإنتاج واسم المدير التنفيذي للبدء.');
      setWizardStep(1);
      return;
    }
    setErrorMsg(null);
    initializeStudio({
      studioName: studioName.trim(),
      ceoName: ceoName.trim(),
      logo: { emblem, frame, palette },
      founderPerk,
      region,
    });
  };

  return (
    <StepModalFrame compactTop label="تأسيس الاستوديو">
      <div className="mx-auto max-w-3xl space-y-4 py-1 sm:py-2">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_8px_28px_-14px_rgba(79,70,229,0.28)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-black text-violet-700">
                  <Zap className="h-3 w-3" />
                  تأسيس الاستوديو
                </span>
                <h1 className="font-display mt-1 truncate text-base font-black text-slate-900 sm:text-lg">
                  بناء إمبراطورية الإنتاج السينمائي والدرامي
                </h1>
              </div>
              <span className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-black tabular-nums text-violet-800">
                {wizardStep} / 4
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-cyan-400 via-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${(wizardStep / 4) * 100}%` }}
              />
            </div>
          </div>
          <FloatingToast message={errorMsg} onDismiss={() => setErrorMsg(null)} />



      {/* Single Focused Step Card Deck */}
      <AnimatePresence mode="wait">
        {wizardStep === 1 && (
          <motion.div
            key="create-step-1"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            {/* Floating Studio Identity Badge */}
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-l from-violet-50/80 via-indigo-50/40 to-cyan-50/60 p-4">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl bg-white p-2 shadow-md shadow-indigo-500/10"
              >
                <StudioLogoSvg config={{ emblem, frame, palette }} size={60} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black text-violet-600">الخطوة 1 من 4 · البطاقة التأسيسية</span>
                <div className="font-display truncate text-lg font-black text-slate-900">
                  {studioName || 'العقرب ستوديوز'}
                </div>
                <div className="truncate text-xs font-bold text-indigo-600">
                  المدير التنفيذي: {ceoName || 'محمود الصيرفي'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="studio-name-input" className="block text-xs font-black text-slate-700">
                  اسم شركة الإنتاج السينمائي
                </label>
                <input
                  id="studio-name-input"
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="مثال: العقرب ستوديوز"
                  className="mt-2 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] px-4 py-3.5 text-sm font-black text-slate-900 transition focus:border-violet-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ceo-name-input" className="block text-xs font-black text-slate-700">
                  اسم المدير التنفيذي (اللاعب)
                </label>
                <input
                  id="ceo-name-input"
                  type="text"
                  value={ceoName}
                  onChange={(e) => setCeoName(e.target.value)}
                  placeholder="مثال: محمود الصيرفي"
                  className="mt-2 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] px-4 py-3.5 text-sm font-black text-slate-900 transition focus:border-violet-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Tactile 3D Mobile Action Buttons */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => unlockAndGoTo(2)}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>تأكيد والانتقال لتصميم الشعار</span>
                <ArrowLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-start="true"
                onClick={() => handleCreateStudio()}
                className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-indigo-50 px-4 py-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 active:border-b-2 active:translate-y-0.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>لعب فوري سريع</span>
              </button>
            </div>
          </motion.div>
        )}

        {wizardStep === 2 && (
          <motion.div
            key="create-step-2"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            {/* Interactive 3D Floating Logo Stage */}
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 text-center">
              <button
                type="button"
                onClick={handleRandomizeLogo}
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl border-2 border-violet-200 border-b-4 border-b-violet-300 bg-white px-3 py-1.5 text-[11px] font-black text-violet-700 shadow-xs transition active:border-b-2 active:translate-y-0.5"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>عشوائي ساحر</span>
              </button>

              <motion.div
                key={`${emblem}-${frame}-${palette}`}
                initial={{ scale: 0.75, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                className="rounded-3xl border-2 border-indigo-100 bg-white p-3 shadow-xl shadow-indigo-500/15"
              >
                <StudioLogoSvg config={{ emblem, frame, palette }} size={88} />
              </motion.div>

              <div className="font-display mt-2.5 text-lg font-black text-slate-900">
                {studioName}
              </div>
              <span className="text-[11px] font-bold text-indigo-600">
                أكثر من 1,440 تركيبة بصرية بدون أي نصوص مزدحمة
              </span>
            </div>

            {/* Focused Single-Category Tray Switcher (Only ONE grid shown at a time!) */}
            <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-[#F2F5FF] p-1.5">
              {[
                { id: 'presets' as const, label: 'جاهز', icon: <Wand2 className="h-3.5 w-3.5" /> },
                { id: 'emblems' as const, label: 'الرمز', icon: <Shapes className="h-3.5 w-3.5" /> },
                { id: 'frames' as const, label: 'الإطار', icon: <Frame className="h-3.5 w-3.5" /> },
                { id: 'colors' as const, label: 'الألوان', icon: <Palette className="h-3.5 w-3.5" /> },
              ].map((t) => {
                const active = logoDrawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLogoDrawerTab(t.id)}
                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all ${
                      active
                        ? 'bg-white text-violet-700 shadow-sm border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Visual Tray (Zero text labels on the visual tiles!) */}
            <div className="mt-4 min-h-[195px]">
              <AnimatePresence mode="wait">
                {logoDrawerTab === 'presets' && (
                  <motion.div
                    key="tray-presets"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-4 gap-2.5 sm:grid-cols-6"
                  >
                    {PREMADE_LOGO_COMBINATIONS.slice(0, 18).map((combo, idx) => {
                      const isSelected =
                        combo.emblem === emblem &&
                        combo.frame === frame &&
                        combo.palette === palette;
                      return (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`تركيبة شعار رقم ${idx + 1}`}
                          onClick={() => {
                            setEmblem(combo.emblem);
                            setFrame(combo.frame);
                            setPalette(combo.palette);
                          }}
                          className={`flex items-center justify-center rounded-2xl border-2 p-2 transition-transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 shadow-md'
                              : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                          }`}
                        >
                          <StudioLogoSvg config={combo} size={46} />
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {logoDrawerTab === 'emblems' && (
                  <motion.div
                    key="tray-emblems"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-4 gap-2.5 sm:grid-cols-6"
                  >
                    {EMBLEM_OPTIONS.map((item, idx) => {
                      const isSelected = emblem === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`رمز شعار رقم ${idx + 1}`}
                          onClick={() => setEmblem(item.id)}
                          className={`flex items-center justify-center rounded-2xl border-2 p-2 transition-transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 shadow-md'
                              : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                          }`}
                        >
                          <StudioLogoSvg config={{ emblem: item.id, frame, palette }} size={46} />
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {logoDrawerTab === 'frames' && (
                  <motion.div
                    key="tray-frames"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-4 gap-3"
                  >
                    {FRAME_OPTIONS.map((item, idx) => {
                      const isSelected = frame === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`إطار شعار رقم ${idx + 1}`}
                          onClick={() => setFrame(item.id)}
                          className={`flex items-center justify-center rounded-2xl border-2 p-3 transition-transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 shadow-md'
                              : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                          }`}
                        >
                          <StudioLogoSvg config={{ emblem, frame: item.id, palette }} size={54} />
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {logoDrawerTab === 'colors' && (
                  <motion.div
                    key="tray-colors"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-5 gap-3"
                  >
                    {PALETTE_OPTIONS.map((item, idx) => {
                      const isSelected = palette === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`باليت ألوان رقم ${idx + 1}`}
                          onClick={() => setPalette(item.id)}
                          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-transform hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50 shadow-md'
                              : 'border-indigo-100 bg-[#F8FAFF]'
                          }`}
                        >
                          <div className="flex items-center -space-x-2 space-x-reverse">
                            <span
                              className="h-7 w-7 rounded-full border-2 border-white shadow-xs"
                              style={{ backgroundColor: item.primary }}
                            />
                            <span
                              className="h-7 w-7 rounded-full border-2 border-white shadow-xs"
                              style={{ backgroundColor: item.secondary }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 active:border-b-2 active:translate-y-0.5"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => unlockAndGoTo(3)}
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>اعتماد الشعار والانتقال لخريطة السوق</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {wizardStep === 3 && (
          <motion.div
            key="create-step-3"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-cyan-700">الخطوة 3 من 4 · خريطة التوسع</span>
                <h2 className="font-display text-lg font-black text-slate-900">
                  نقطة الانطلاق الجغرافية للاستوديو
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  id: 'egypt',
                  name: 'السوق المصري (هوليوود الشرق)',
                  badge: 'المستوى 1 · متاح للانطلاق الآن',
                  desc: 'قوة جماهيرية كاسحة في مواسم العيدين وموسم دراما رمضان الإعلاني.',
                  unlocked: true,
                },
                {
                  id: 'gulf',
                  name: 'السوق الخليجي (صناديق التمويل)',
                  badge: 'يفتح عند ثروة 220M ج.م',
                  desc: 'تمويل ضخم وشاشات عرض حديثة تضاعف عوائد التذاكر 1.75x.',
                  unlocked: false,
                },
                {
                  id: 'europe',
                  name: 'السوق الأوروبي (المهرجانات الدولية)',
                  badge: 'يفتح عند ثروة 450M ج.م',
                  desc: 'إنتاج مشترك وجوائز نقدية ترفع عوائد التوزيع إلى 2.4x.',
                  unlocked: false,
                },
                {
                  id: 'hollywood',
                  name: 'هوليوود العالمية (القمة السينمائية)',
                  badge: 'يفتح عند ثروة 900M ج.م',
                  desc: 'التوزيع العالمي الشامل وعوائد شباك تذاكر أسطورية 4.0x.',
                  unlocked: false,
                },
              ].map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 ${
                    m.unlocked
                      ? 'border-cyan-400 border-b-4 border-b-cyan-500 bg-gradient-to-l from-cyan-50/80 to-indigo-50/40'
                      : 'border-slate-100 bg-slate-50/80 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-black text-slate-900">{m.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          m.unlocked ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{m.desc}</p>
                  </div>
                  {m.unlocked ? (
                    <Check className="h-5 w-5 shrink-0 text-cyan-600 stroke-[3]" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 active:border-b-2 active:translate-y-0.5"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => unlockAndGoTo(4)}
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-900/40 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <span>التالي: اختيار قدرة المؤسس</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {wizardStep === 4 && (
          <motion.div
            key="create-step-4"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200/90 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.16)]"
          >
            <span className="text-[11px] font-black text-violet-600">الخطوة 4 من 4 · قدرة المؤسس الخارقة</span>
            <h2 className="font-display mt-1 text-xl font-black text-slate-900">
              اختر الميزة الاستراتيجية الدائمة لشركتك
            </h2>

            <div className="mt-4 space-y-3">
              {(
                [
                  {
                    id: 'visionary_director' as FounderPerk,
                    title: 'مخرج عبقري (Visionary Director)',
                    Bonus: '+10% جودة فنية وتقييم نقاد',
                    desc: 'يرفع تقييم النقاد لكل أعمالك الفنية ويزيد فرص اكتساح جوائز المهرجانات.',
                    icon: <Sparkles className="h-5 w-5 text-violet-600" />,
                  },
                  {
                    id: 'marketing_whale' as FounderPerk,
                    title: 'حوت تسويق (Marketing Whale)',
                    Bonus: '+15% إيرادات الأسبوع الافتتاحي',
                    desc: 'يضمن حملات ترويجية صاخبة تضاعف الإقبال الجماهيري في دور العرض.',
                    icon: <TrendingUp className="h-5 w-5 text-rose-600" />,
                  },
                  {
                    id: 'shark_negotiator' as FounderPerk,
                    title: 'مفاوض شرس (Shark Negotiator)',
                    Bonus: 'خصم 15% من أجور كل النجوم',
                    desc: 'يمنحك قدرة تفاوضية حاسمة تخفض أجور نجوم الصف الأول والمخرجين.',
                    icon: <Handshake className="h-5 w-5 text-emerald-600" />,
                  },
                ]
              ).map((perk) => {
                const selected = founderPerk === perk.id;
                return (
                  <button
                    key={perk.id}
                    type="button"
                    onClick={() => setFounderPerk(perk.id)}
                    className={`flex w-full items-start gap-3.5 rounded-2xl border-2 p-4 text-right transition-all ${
                      selected
                        ? 'border-violet-600 border-b-4 border-b-violet-700 bg-violet-50/70 shadow-sm'
                        : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs">
                      {perk.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-sm font-black text-slate-900">
                          {perk.title}
                        </span>
                        <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                          {perk.Bonus}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{perk.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-indigo-50 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="flex min-h-[50px] items-center gap-1.5 rounded-2xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 active:border-b-2 active:translate-y-0.5"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                data-start="true"
                onClick={() => handleCreateStudio()}
                className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-900/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition active:border-b-0 active:translate-y-1"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>انطلاق! افتح مقر الاستوديو الآن</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </StepModalFrame>
  );
}
