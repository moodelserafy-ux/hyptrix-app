'use client';

import React, { useState } from 'react';
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
  Shuffle,
  Lock,
  Wand2,
  Shapes,
  Frame,
  Palette,
  Compass,
  Building2,
  Film,
  Trophy,
} from 'lucide-react';

export function Stage1StudioCreation() {
  const {
    studioName: initialStudioName,
    ceoName: initialCeoName,
    logo: initialLogo,
    founderPerk: initialPerk,
    initializeStudio,
  } = useGameStore();

  const [showLandingHero, setShowLandingHero] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<1 | 2 | 3 | 4>(1);
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
    if (nextStep > maxUnlockedStep) {
      setMaxUnlockedStep(nextStep);
    }
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

  const stepMeta = [
    { step: 1 as const, title: '1. الهوية' },
    { step: 2 as const, title: '2. الشعار' },
    { step: 3 as const, title: '3. السوق' },
    { step: 4 as const, title: '4. الميزة' },
  ];

  // Widescreen Landscape Welcome Hero (Light Theme, Clean 2-Column Layout)
  if (showLandingHero) {
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center py-1">
        <div className="w-full rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur-md sm:p-6">
          <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-12">
            {/* Right Column: Title, Brief Pitch & Actions */}
            <div className="space-y-3 md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">
                <span>Hyptrix · محاكاة إدارة الإنتاج السينمائي والدرامي</span>
              </div>

              <h1 className="font-display text-xl font-black leading-snug text-slate-900 sm:text-2xl lg:text-3xl">
                أسّس استوديو الإنتاج الخاص بك، تعاقد مع النجوم، وتصدّر شباك التذاكر.
              </h1>

              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                ابدأ برأس مال تأسيسي 75 مليون ج.م لتطوير البلاتوهات ومعدات التصوير، وإنتاج الأفلام والمسلسلات للمنافسة في المواسم السينمائية وحفل الجوائز السنوي.
              </p>

              {/* 3 Horizontal Game Pillars */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3">
                  <div className="flex items-center gap-1.5 font-display text-xs font-black text-violet-700">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>تطوير المرافق</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    طوّر البلاتوهات والكاميرات وغرف المونتاج والصوت لرفع جودة أعمالك.
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3">
                  <div className="flex items-center gap-1.5 font-display text-xs font-black text-cyan-700">
                    <Film className="h-3.5 w-3.5 shrink-0" />
                    <span>كتابة وتفاوض</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    اختر التصنيف الدرامي، طوّر القصة، وتفاوض مع النجوم والمخرجين.
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3">
                  <div className="flex items-center gap-1.5 font-display text-xs font-black text-amber-700">
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    <span>توزيع وجوائز</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    وزّع أعمالك محلياً ودولياً ونافس الشركات الكبرى في المهرجان السنوي.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => handleCreateStudio()}
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 active:border-b-0 active:translate-y-0.5 whitespace-nowrap"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>ابدأ اللعب فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLandingHero(false)}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 border-b-4 border-b-indigo-300 bg-indigo-50/70 px-4 py-2.5 text-xs font-black text-indigo-800 transition hover:bg-indigo-100 whitespace-nowrap"
                >
                  <span>تخصيص اسم وشعار الاستوديو</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Left Column: Live Studio Identity Preview Card */}
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-indigo-100 bg-gradient-to-b from-[#F5F7FF] via-white to-cyan-50/50 p-5 text-center md:col-span-5">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-3xl border-2 border-indigo-100 bg-white p-3.5 shadow-md"
              >
                <StudioLogoSvg config={{ emblem, frame, palette }} size={80} />
              </motion.div>

              <div className="font-display mt-3 text-lg font-black text-slate-900">
                {studioName}
              </div>
              <div className="text-xs font-bold text-indigo-600">
                المدير التنفيذي: {ceoName}
              </div>

              <div className="mt-3 grid w-full grid-cols-2 gap-2 border-t border-indigo-100 pt-3 text-xs tabular-nums">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
                  <div className="text-[10px] font-bold text-emerald-600">رأس المال التأسيسي</div>
                  <div className="font-display font-black">75,000,000 ج.م</div>
                </div>
                <div className="rounded-xl bg-violet-50 p-2 text-violet-800">
                  <div className="text-[10px] font-bold text-violet-600">السوق الافتتاحي</div>
                  <div className="font-display font-black">السوق المصري</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Widescreen 4-Step Studio Creation Board (2-Column Landscape Split)
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center py-1">
      <div className="w-full rounded-3xl border-2 border-indigo-100 border-b-4 border-b-indigo-200 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-md sm:p-5">
        {/* Top Horizontal Stepper Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-base font-black text-slate-900 sm:text-lg">
              تأسيس استوديو الإنتاج ({wizardStep}/4)
            </h1>
            <button
              type="button"
              onClick={() => setShowLandingHero(true)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              المقدمة
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:w-96">
            {stepMeta.map((item) => {
              const isCurrent = wizardStep === item.step;
              const isUnlocked = item.step <= maxUnlockedStep;
              const isCompleted = item.step < wizardStep;

              return (
                <button
                  key={item.step}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && setWizardStep(item.step)}
                  className={`flex items-center justify-center gap-1 rounded-xl border-2 py-1.5 px-2 text-[11px] font-black transition-all ${
                    isCurrent
                      ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isUnlocked
                      ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700'
                      : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 shrink-0 stroke-[3]" />
                  ) : !isUnlocked ? (
                    <Lock className="h-2.5 w-2.5 shrink-0" />
                  ) : null}
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* 2-Column Landscape Content Area */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-12">
          {/* Left Preview Column (4 Cols): Always shows Live Studio Identity & Emblem */}
          <div className="flex flex-col items-center justify-between rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-[#F5F7FF] via-white to-cyan-50/40 p-4 text-center md:col-span-4">
            <div className="flex flex-col items-center">
              <div className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
                <StudioLogoSvg config={{ emblem, frame, palette }} size={68} />
              </div>
              <div className="font-display mt-2.5 text-base font-black text-slate-900">
                {studioName || 'العقرب ستوديوز'}
              </div>
              <div className="text-xs font-bold text-indigo-600">
                المدير التنفيذي: {ceoName || 'محمود الصيرفي'}
              </div>
            </div>

            <div className="mt-3 w-full space-y-1.5 border-t border-indigo-100 pt-3 text-right text-[11px]">
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5">
                <span className="text-slate-500">السيولة الابتدائية:</span>
                <span className="font-black text-emerald-700 tabular-nums">75M ج.م</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5">
                <span className="text-slate-500">الميزة المختارة:</span>
                <span className="font-black text-violet-700">
                  {founderPerk === 'visionary_director'
                    ? 'مخرج عبقري'
                    : founderPerk === 'marketing_whale'
                    ? 'حوت تسويق'
                    : 'مفاوض شرس'}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={() => handleCreateStudio()}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>دخول مباشر بالبيانات الحالية</span>
            </button>
          </div>

          {/* Right Interactive Step Column (8 Cols) */}
          <div className="flex flex-col justify-between md:col-span-8">
            <AnimatePresence mode="wait">
              {wizardStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex h-full flex-col justify-between space-y-4"
                >
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                        className="mt-1.5 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] px-4 py-3 text-sm font-black text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
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
                        className="mt-1.5 w-full rounded-2xl border-2 border-indigo-100 bg-[#F5F7FF] px-4 py-3 text-sm font-black text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-3.5 text-xs leading-relaxed text-slate-600">
                    سيظهر اسم شركتك وشعارها على البوابة الرئيسية للمدينة الإنتاجية وفي العقود الرسمية مع النجوم وشباك التذاكر.
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => unlockAndGoTo(2)}
                      className="flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-2.5 text-xs font-black text-white shadow-md transition active:border-b-0 active:translate-y-0.5"
                    >
                      <span>التالي: تصميم الشعار</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex h-full flex-col justify-between space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl bg-[#F2F5FF] p-1">
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
                            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition ${
                              active
                                ? 'bg-white text-violet-700 shadow-2xs border border-indigo-100'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {t.icon}
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleRandomizeLogo}
                      className="flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      <span>تشكيل عشوائي</span>
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto pr-1">
                    {logoDrawerTab === 'presets' && (
                      <div className="grid grid-cols-6 gap-2">
                        {PREMADE_LOGO_COMBINATIONS.slice(0, 12).map((combo, idx) => {
                          const isSelected =
                            combo.emblem === emblem &&
                            combo.frame === frame &&
                            combo.palette === palette;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEmblem(combo.emblem);
                                setFrame(combo.frame);
                                setPalette(combo.palette);
                              }}
                              className={`flex items-center justify-center rounded-xl border-2 p-1.5 transition ${
                                isSelected
                                  ? 'border-violet-600 bg-violet-50'
                                  : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                              }`}
                            >
                              <StudioLogoSvg config={combo} size={38} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {logoDrawerTab === 'emblems' && (
                      <div className="grid grid-cols-6 gap-2">
                        {EMBLEM_OPTIONS.map((item) => {
                          const isSelected = emblem === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setEmblem(item.id)}
                              className={`flex items-center justify-center rounded-xl border-2 p-1.5 transition ${
                                isSelected
                                  ? 'border-violet-600 bg-violet-50'
                                  : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                              }`}
                            >
                              <StudioLogoSvg config={{ emblem: item.id, frame, palette }} size={38} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {logoDrawerTab === 'frames' && (
                      <div className="grid grid-cols-4 gap-2">
                        {FRAME_OPTIONS.map((item) => {
                          const isSelected = frame === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFrame(item.id)}
                              className={`flex items-center justify-center rounded-xl border-2 p-2 transition ${
                                isSelected
                                  ? 'border-violet-600 bg-violet-50'
                                  : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                              }`}
                            >
                              <StudioLogoSvg config={{ emblem, frame: item.id, palette }} size={42} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {logoDrawerTab === 'colors' && (
                      <div className="grid grid-cols-5 gap-2">
                        {PALETTE_OPTIONS.map((item) => {
                          const isSelected = palette === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPalette(item.id)}
                              className={`flex items-center justify-center rounded-xl border-2 p-2.5 transition ${
                                isSelected
                                  ? 'border-violet-600 bg-violet-50'
                                  : 'border-indigo-100 bg-[#F8FAFF]'
                              }`}
                            >
                              <div className="flex items-center -space-x-2 space-x-reverse">
                                <span
                                  className="h-6 w-6 rounded-full border-2 border-white shadow-2xs"
                                  style={{ backgroundColor: item.primary }}
                                />
                                <span
                                  className="h-6 w-6 rounded-full border-2 border-white shadow-2xs"
                                  style={{ backgroundColor: item.secondary }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="flex min-h-[44px] items-center gap-1 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => unlockAndGoTo(3)}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-2 text-xs font-black text-white shadow-md"
                    >
                      <span>التالي: خريطة السوق</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex h-full flex-col justify-between space-y-3"
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {[
                      {
                        id: 'egypt',
                        name: 'السوق المصري',
                        badge: 'نقطة الانطلاق · متاح الآن',
                        desc: 'قوة جماهيرية كبيرة في مواسم الأعياد وموسم دراما رمضان.',
                        unlocked: true,
                      },
                      {
                        id: 'gulf',
                        name: 'السوق الخليجي',
                        badge: 'يفتح عند 220M ج.م',
                        desc: 'شاشات عرض حديثة تضاعف عوائد التذاكر (+75%).',
                        unlocked: false,
                      },
                      {
                        id: 'europe',
                        name: 'السوق الأوروبي',
                        badge: 'يفتح عند 450M ج.م',
                        desc: 'توزيع دولي ومهرجانات ترفع العوائد (+140%).',
                        unlocked: false,
                      },
                      {
                        id: 'hollywood',
                        name: 'هوليوود العالمية',
                        badge: 'يفتح عند 900M ج.م',
                        desc: 'التوزيع العالمي الشامل وعوائد شباك التذاكر الكبرى.',
                        unlocked: false,
                      },
                    ].map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col justify-between rounded-2xl border-2 p-3 ${
                          m.unlocked
                            ? 'border-cyan-500 bg-cyan-50/60'
                            : 'border-slate-100 bg-slate-50 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display text-xs font-black text-slate-900">
                            {m.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                              m.unlocked
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {m.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">{m.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="flex min-h-[44px] items-center gap-1 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => unlockAndGoTo(4)}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl border-b-4 border-indigo-950/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-6 py-2 text-xs font-black text-white shadow-md"
                    >
                      <span>التالي: ميزة المؤسس</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex h-full flex-col justify-between space-y-3"
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {(
                      [
                        {
                          id: 'visionary_director' as FounderPerk,
                          title: 'مخرج عبقري',
                          Bonus: '+10% جودة فنية',
                          desc: 'يرفع تقييم النقاد لكل أعمالك ويزيد فرص الفوز بالجوائز.',
                          icon: <Sparkles className="h-4 w-4 text-violet-600" />,
                        },
                        {
                          id: 'marketing_whale' as FounderPerk,
                          title: 'حوت تسويق',
                          Bonus: '+15% افتتاحية',
                          desc: 'يضمن حملات ترويجية قوية تضاعف إقبال الجمهور.',
                          icon: <TrendingUp className="h-4 w-4 text-rose-600" />,
                        },
                        {
                          id: 'shark_negotiator' as FounderPerk,
                          title: 'مفاوض شرس',
                          Bonus: '-15% أجور النجوم',
                          desc: 'يمنحك قدرة تفاوضية تخفض أجور الممثلين والمخرجين.',
                          icon: <Handshake className="h-4 w-4 text-emerald-600" />,
                        },
                      ]
                    ).map((perk) => {
                      const selected = founderPerk === perk.id;
                      return (
                        <button
                          key={perk.id}
                          type="button"
                          onClick={() => setFounderPerk(perk.id)}
                          className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-right transition ${
                            selected
                              ? 'border-violet-600 bg-violet-50/80 shadow-xs'
                              : 'border-indigo-100 bg-[#F8FAFF] hover:border-violet-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs">
                                {perk.icon}
                              </div>
                              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-black text-white">
                                {perk.Bonus}
                              </span>
                            </div>
                            <div className="font-display mt-2 text-xs font-black text-slate-900">
                              {perk.title}
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-slate-600">
                              {perk.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="flex min-h-[44px] items-center gap-1 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => handleCreateStudio()}
                      className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border-b-4 border-emerald-900/30 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2.5 text-xs font-black text-white shadow-lg"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>اعتماد الهوية وافتتاح الاستوديو الآن</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
