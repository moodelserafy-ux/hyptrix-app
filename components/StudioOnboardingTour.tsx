'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore } from '@/lib/store';
import { getUiDir, tr } from '@/lib/i18n';
import { StudioLogoSvg } from './StudioLogoSvg';
import {
  Play,
  SkipForward,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Users,
  Smartphone,
  ShieldCheck,
  Crown,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';

interface TourStepConfig {
  id: string;
  selector: string;
  title: string;
  description: string;
  proTip: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function StudioOnboardingTour() {
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const studioCreated = useGameStore((s) => s.studioCreated);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const studioName = useGameStore((s) => s.studioName);
  const ceoName = useGameStore((s) => s.ceoName);
  const logo = useGameStore((s) => s.logo);
  const onboardingTourStatus = useGameStore((s) => s.onboardingTourStatus);
  const setOnboardingTourStatus = useGameStore((s) => s.setOnboardingTourStatus);

  const isEn = uiLanguage === 'en';
  const uiDir = getUiDir(uiLanguage);

  const tourSteps: TourStepConfig[] = useMemo(
    () => [
      {
        id: 'finance',
        selector: '[data-tour-id="tour-finance"]',
        title: tr(uiLanguage, 'Cash Treasury & Market Valuation', 'خزينة السيولة والقيمة السوقية'),
        description: tr(
          uiLanguage,
          'Track your liquid cash for greenlighting movies and signing stars, alongside your total Studio Valuation that decides your rank against rival studios.',
          'هنا تتابع رصيدك النقدي المتاح لتمويل الأفلام والتعاقد مع النجوم، وبجانبه القيمة السوقية الإجمالية لاستوديوك التي تحدد ترتيبك أمام الشركات المنافسة.'
        ),
        proTip: tr(
          uiLanguage,
          'Tap the Cash Treasury anytime to open the Armored Safe and acquire permanent soundstages.',
          'اضغط على خزينة السيولة في أي وقت لفتح الخزنة المصفحة وشراء البلاتوهات.'
        ),
        icon: Crown,
      },
      {
        id: 'script',
        selector: '[data-tour-id="tour-script"]',
        title: tr(uiLanguage, 'Screenplay Script — Start Every Project', 'ورق السيناريو — نقطة بداية كل عمل'),
        description: tr(
          uiLanguage,
          'Every blockbuster begins right here! Tap the Script to greenlight a Feature Film or TV Series, craft its title & plot, pick genres, and lock the release season.',
          'هنا تبدأ رحلتك الإنتاجية! اضغط على ورق السيناريو لإنشاء فيلم أو مسلسل جديد، اختيار اسمه وقصته، التصنيف الدرامي، وموسم العرض المناسب.'
        ),
        proTip: tr(
          uiLanguage,
          'Matching the release season to your genre multiplies opening-week box office turnout.',
          'اختيار موسم العرض المناسب لنوع العمل يضاعف إقبال الجمهور في شباك التذاكر.'
        ),
        icon: FileText,
      },
      {
        id: 'corkboard',
        selector: '[data-tour-id="tour-corkboard"]',
        title: tr(uiLanguage, 'Casting Corkboard — Stars & Crew', 'سبورة الفلين — الكاستينج والنجوم'),
        description: tr(
          uiLanguage,
          'After writing your script, open the Corkboard to negotiate with directors, writers, and A-list stars while balancing cast chemistry.',
          'بعد كتابة السيناريو، افتح السبورة للتفاوض مع المخرجين والكتاب ونجوم الصف الأول، ومراقبة التوافق الفني (الكيمياء) بين طاقم العمل.'
        ),
        proTip: tr(
          uiLanguage,
          'Be careful pairing two high-ego superstars without smart handling—it can trigger on-set clashes.',
          'احذر من جمع نجمين بغرور مرتفع دون إدارة ذكية حتى لا تنشب أزمات في البلاتوه.'
        ),
        icon: Users,
      },
      {
        id: 'starforge',
        selector: '[data-tour-id="tour-starforge"]',
        title: tr(uiLanguage, 'Top Secret Folder — The Star Forge', 'الملف السري — غرفة صناعة النجوم'),
        description: tr(
          uiLanguage,
          'Unlock just 2 golden locks to forge your own exclusive star, upload their custom portrait, tune 6 radar attributes, and mint their 3D Diamond Card.',
          'افتح القفلين الذهبيين لتصنع نجمك أو نجمتك الحصرية، ترفع صورته الخاصة، وتوزع مهاراته الست على الرادار ليصبح بطل أعمالك الألماظ.'
        ),
        proTip: tr(
          uiLanguage,
          'Custom forged stars stay fiercely loyal to your studio with priority signing.',
          'نجومك المصنوعون يتمتعون بولاء كامل لاستوديوك وأولوية تعاقد فورية.'
        ),
        icon: Sparkles,
      },
      {
        id: 'phone',
        selector: '[data-tour-id="tour-phone"]',
        title: tr(uiLanguage, "Emperor's Smartphone — PR & Viral Trends", 'موبايل الإمبراطور — اللجان والتريند'),
        description: tr(
          uiLanguage,
          'Your media war room! Launch viral social waves to boost opening buzz, run counter-PR against rivals, and watch live audience reactions roll in.',
          'غرفة إدارة الرأي العام! وجّه اللجان لدعم فيلمك ورفع الضجة الجماهيرية قبل العرض، أو أطلق حملات مضادة ضد منافسيك وتابع تفاعل الجمهور مباشرة.'
        ),
        proTip: tr(
          uiLanguage,
          'High pre-release buzz fuels explosive opening-day box office numbers.',
          'الضجة الإعلامية المرتفعة تصنع افتتاحية نارية في الأيام الأولى للعرض.'
        ),
        icon: Smartphone,
      },
      {
        id: 'vault',
        selector: '[data-tour-id="tour-vault-shelf"]',
        title: tr(uiLanguage, 'Soundstage Vault, Awards & Global Markets', 'خزنة البلاتوهات ورف الجوائز والترتيب'),
        description: tr(
          uiLanguage,
          'Own permanent soundstages & VFX suites to cut production costs and block crises, and use the bottom shelf to access Annual Festivals, Global Markets, and Rankings.',
          'امتلك بلاتوهات وأصول ثابتة لتقليل تكلفة كل مشروع وحمايتك من الأزمات، ومن الرف السفلي تابع قاعة الجوائز السنوية، والأسواق العالمية، وترتيب الشركات.'
        ),
        proTip: tr(
          uiLanguage,
          'Investing early in fixed studio assets saves tens of millions across your career.',
          'الاستثمار المبكر في الأصول الثابتة يوفر عليك عشرات الملايين على المدى الطويل.'
        ),
        icon: ShieldCheck,
      },
    ],
    [uiLanguage]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });

  const isVisibleOnHub = studioCreated && activeScreen === 'STUDIO_HUB';
  const currentStep = tourSteps[stepIndex] || tourSteps[0];

  const measureCurrentTarget = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });

    const el = document.querySelector(currentStep.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [currentStep.selector]);

  useEffect(() => {
    if (!isVisibleOnHub || onboardingTourStatus !== 'active') return;

    const el = document.querySelector(currentStep.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const initialTimer = setTimeout(measureCurrentTarget, 120);
    const settledTimer = setTimeout(measureCurrentTarget, 460);

    const onUpdate = () => {
      window.requestAnimationFrame(measureCurrentTarget);
    };

    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, { passive: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOnboardingTourStatus('completed');
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(settledTimer);
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    isVisibleOnHub,
    onboardingTourStatus,
    currentStep.selector,
    measureCurrentTarget,
    setOnboardingTourStatus,
  ]);

  if (!isVisibleOnHub || onboardingTourStatus === 'completed') {
    return null;
  }

  if (onboardingTourStatus === 'pending_choice') {
    return (
      <AnimatePresence>
        <motion.div
          key="onboarding_choice_backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F171E]/82 p-4 backdrop-blur-md"
          dir={uiDir}
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[32px] border-3 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_32px_90px_rgba(0,0,0,0.75)]"
          >
            <div className="relative overflow-hidden bg-gradient-to-b from-[#1E2D3D] via-[#1A2530] to-[#121B24] px-6 pt-7 pb-6 text-center text-[#F9F6F0] border-b-3 border-[#D4AF37]">
              <div className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-[#D4AF37]/20 blur-3xl" />

              <motion.div
                initial={{ scale: 0.85, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 320 }}
                className="relative mx-auto mb-3.5 inline-flex rounded-[26px] border-2 border-[#D4AF37] bg-[#0F171E]/75 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
              >
                <StudioLogoSvg config={logo} size={78} />
              </motion.div>

              <p className="text-[11px] font-extrabold text-[#D4AF37] tracking-wide">
                {tr(
                  uiLanguage,
                  `"${studioName}" IS OFFICIALLY OPEN`,
                  `تم افتتاح «${studioName}» رسمياً بنجاح`
                )}
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-[26px] font-black text-white leading-snug text-balance">
                {tr(
                  uiLanguage,
                  `Welcome to the Emperor's Desk, ${ceoName}!`,
                  `أهلاً بك في مكتب الإمبراطور، ${ceoName}!`
                )}
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-bold text-[#F9F6F0]/80 leading-relaxed max-w-md mx-auto">
                {tr(
                  uiLanguage,
                  'Before greenlighting your first hit, would you like a quick guided walkthrough of your studio desk, or jump straight into action?',
                  'قبل أن تبدأ إنتاجك الأول، هل تود مشاهدة العرض التقديمي السريع بالأسهم لشرح أدوات مكتبك خطوة بخطوة، أم تفضل التخطي والدخول مباشرة؟'
                )}
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-2xl border border-[#1A2530]/12 bg-white p-3">
                  <FileText className="w-5 h-5 text-[#D91624] mx-auto mb-1.5" />
                  <span className="block text-[11px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Greenlight Hits', 'إنشاء المشاريع')}
                  </span>
                  <span className="block text-[10px] font-bold text-[#1A2530]/60 mt-0.5">
                    {tr(uiLanguage, 'Scripts & Seasons', 'السيناريو والموسم')}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#1A2530]/12 bg-white p-3">
                  <Users className="w-5 h-5 text-[#D4AF37] mx-auto mb-1.5" />
                  <span className="block text-[11px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'Stars & Casting', 'النجوم والكاستينج')}
                  </span>
                  <span className="block text-[10px] font-bold text-[#1A2530]/60 mt-0.5">
                    {tr(uiLanguage, '& Star Forge', 'والملف السري')}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#1A2530]/12 bg-white p-3">
                  <Smartphone className="w-5 h-5 text-[#15803D] mx-auto mb-1.5" />
                  <span className="block text-[11px] font-black text-[#1A2530]">
                    {tr(uiLanguage, 'PR & Trends', 'اللجان والتريند')}
                  </span>
                  <span className="block text-[10px] font-bold text-[#1A2530]/60 mt-0.5">
                    {tr(uiLanguage, '& Soundstages', 'وخزنة البلاتوهات')}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setStepIndex(0);
                    setOnboardingTourStatus('active');
                  }}
                  className="w-full min-h-[50px] rounded-2xl border-2 border-[#1A2530] bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] px-5 py-3 font-display text-sm sm:text-base font-black text-[#1A2530] shadow-lg transition hover:brightness-105 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-[#1A2530]" />
                  <span>
                    {tr(uiLanguage, 'Yes, Start Quick Guided Tour', 'نعم، ابدأ العرض التقديمي والشرح')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnboardingTourStatus('completed')}
                  className="w-full min-h-[46px] rounded-2xl border-2 border-[#1A2530]/20 bg-white hover:border-[#1A2530]/50 hover:bg-[#EFE9DC]/60 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#1A2530]/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>
                    {tr(uiLanguage, 'Skip & Enter Studio Desk', 'تخطي والدخول مباشرة للمكتب')}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const pad = 10;
  const spotTop = targetRect ? Math.max(8, targetRect.top - pad) : 0;
  const spotLeft = targetRect ? Math.max(8, targetRect.left - pad) : 0;
  const spotWidth = targetRect
    ? Math.min(viewport.width - 16, targetRect.width + pad * 2)
    : 0;
  const spotHeight = targetRect ? targetRect.height + pad * 2 : 0;

  const spaceBelow = targetRect
    ? viewport.height - (targetRect.top + targetRect.height)
    : 0;
  const placeBelow = !targetRect || spaceBelow >= 235 || targetRect.top < 220;

  const tooltipWidth = Math.min(390, viewport.width - 24);
  const targetCenterX = targetRect
    ? targetRect.left + targetRect.width / 2
    : viewport.width / 2;
  const tooltipLeft = Math.max(
    12,
    Math.min(viewport.width - tooltipWidth - 12, targetCenterX - tooltipWidth / 2)
  );
  const tooltipTop = targetRect
    ? placeBelow
      ? Math.min(viewport.height - 220, spotTop + spotHeight + 18)
      : Math.max(14, spotTop - 218)
    : Math.max(24, viewport.height / 2 - 110);

  const arrowRelativeLeft = Math.max(
    28,
    Math.min(tooltipWidth - 44, targetCenterX - tooltipLeft - 14)
  );

  const StepIcon = currentStep.icon;
  const isLastStep = stepIndex === tourSteps.length - 1;
  const PrevArrow = isEn ? ArrowLeft : ArrowRight;
  const NextArrow = isEn ? ArrowRight : ArrowLeft;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-auto" dir={uiDir}>
      {targetRect ? (
        <motion.div
          animate={{
            top: spotTop,
            left: spotLeft,
            width: spotWidth,
            height: spotHeight,
          }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          style={{
            boxShadow: '0 0 0 9999px rgba(15, 23, 30, 0.80)',
          }}
          className="fixed rounded-[26px] border-3 border-[#D4AF37] pointer-events-none"
        >
          <div className="absolute inset-0 rounded-[23px] ring-2 ring-[#FFF3B0]/50" />
        </motion.div>
      ) : (
        <div className="fixed inset-0 bg-[#0F171E]/80" />
      )}

      <motion.div
        key={currentStep.id}
        initial={{ opacity: 0, scale: 0.94, y: placeBelow ? 10 : -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
        }}
        className="fixed z-[130]"
      >
        {targetRect && placeBelow && (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: arrowRelativeLeft }}
            className="absolute -top-8 flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-[#1A2530] border-2 border-[#1A2530] shadow-lg"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.8]" />
          </motion.div>
        )}

        <div className="rounded-[26px] border-3 border-[#D4AF37] bg-[#F9F6F0] text-[#1A2530] shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="bg-[#1A2530] px-4 py-3 text-[#F9F6F0] flex items-center justify-between gap-2 border-b-2 border-[#D4AF37]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D91624] text-[#D4AF37] border border-[#D4AF37]">
                <StepIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#D4AF37]">
                  {tr(
                    uiLanguage,
                    `Studio Tour · Step ${stepIndex + 1} of ${tourSteps.length}`,
                    `العرض التقديمي · خطوة ${stepIndex + 1} من ${tourSteps.length}`
                  )}
                </span>
                <h3 className="font-display text-sm sm:text-base font-black text-white truncate">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOnboardingTourStatus('completed')}
              aria-label={tr(uiLanguage, 'Skip tour', 'تخطي الشرح')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-[#D91624] text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs sm:text-[13px] font-bold leading-relaxed text-[#1A2530]/90">
              {currentStep.description}
            </p>

            <div className="rounded-xl bg-[#FFF9E6] border border-[#D4AF37]/80 px-3 py-2 text-[11px] font-extrabold text-[#1A2530]">
              ★ {tr(uiLanguage, 'Pro Tip:', 'نصيحة سريعة:')} {currentStep.proTip}
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {tourSteps.map((st, idx) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  aria-label={tr(uiLanguage, `Step ${idx + 1}`, `الخطوة ${idx + 1}`)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === stepIndex
                      ? 'w-6 bg-[#D91624]'
                      : idx < stepIndex
                      ? 'w-2 bg-[#15803D]'
                      : 'w-2 bg-[#1A2530]/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-[#1A2530]/20 hover:border-[#1A2530]/50 text-xs font-black text-[#1A2530] flex items-center gap-1 cursor-pointer"
                  >
                    <PrevArrow className="w-3.5 h-3.5" />
                    <span>{tr(uiLanguage, 'Back', 'السابق')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOnboardingTourStatus('completed')}
                  className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold text-[#1A2530]/65 hover:text-[#D91624] cursor-pointer"
                >
                  {tr(uiLanguage, 'Skip', 'تخطي')}
                </button>
              </div>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() =>
                    setStepIndex((i) => Math.min(tourSteps.length - 1, i + 1))
                  }
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#D91624] hover:brightness-110 text-white font-display text-xs sm:text-sm font-black border border-[#D4AF37] shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{tr(uiLanguage, 'Next', 'التالي')}</span>
                  <NextArrow className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOnboardingTourStatus('completed')}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#B8860B] text-[#1A2530] font-display text-xs sm:text-sm font-black border border-[#1A2530] shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                  <span>{tr(uiLanguage, "Got it — Let's Play!", 'فهمت.. ابدأ اللعب!')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {targetRect && !placeBelow && (
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: arrowRelativeLeft }}
            className="absolute -bottom-8 flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-[#1A2530] border-2 border-[#1A2530] shadow-lg"
          >
            <ArrowDown className="w-4 h-4 stroke-[2.8]" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
