'use client';

import React, { useState } from 'react';
import { useGameStore, StudioLogoConfig, formatGameDate } from '@/lib/store';
import { MarketRegion, FounderPerk } from '@/lib/game-engine';
import {
  StudioLogoSvg,
  EMBLEM_OPTIONS,
  FRAME_OPTIONS,
  PALETTE_OPTIONS,
  PREMADE_LOGO_COMBINATIONS,
} from './StudioLogoSvg';
import {
  Sparkles,
  Film,
  Megaphone,
  Handshake,
  Building2,
  UserCheck,
  Globe,
  Check,
  Palette,
  Shuffle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PERKS: {
  id: FounderPerk;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}[] = [
  {
    id: 'visionary_director',
    title: 'المخرج العبقري',
    subtitle: 'عين فنية لا تخطئ الكادر',
    desc: 'يمنح جميع أعمالك دفعة دائمة +8% في الجودة الفنية وتقييمات النقاد والمهرجانات.',
    icon: Film,
    badge: '+8% جودة فنية',
  },
  {
    id: 'marketing_whale',
    title: 'حوت الدعاية والتسويق',
    subtitle: 'سيطرة كاملة على شباك التذاكر',
    desc: 'يرفع إيرادات أسبوع الافتتاح بنسبة +10% ويمنحك صفقات منصات رقمية أعلى.',
    icon: Megaphone,
    badge: '+10% شباك التذاكر',
  },
  {
    id: 'shark_negotiator',
    title: 'صديق النجوم والوكلاء',
    subtitle: 'علاقات ذهبية في الوسط الفني',
    desc: 'يخفض أجور نجوم الصف الأول والمخرجين الكبار بنسبة 15% ويقلل صدامات الغرور.',
    icon: Handshake,
    badge: '-15% أجور النجوم',
  },
];

const REGIONS: {
  id: MarketRegion;
  name: string;
  flag: string;
  desc: string;
}[] = [
  {
    id: 'egypt',
    name: 'مصر (هوليوود الشرق)',
    flag: '🇪🇬',
    desc: 'سوق سينمائي ودرامي ضخم وتاريخ عريق في صناعة النجوم.',
  },
  {
    id: 'gulf',
    name: 'السعودية والخليج',
    flag: '🇸🇦',
    desc: 'قوة شرائية عالية، شاشات عرض حديثة، وصناديق تمويل ضخمة.',
  },
  {
    id: 'europe',
    name: 'أوروبا والمغتربين العرب',
    flag: '🌍',
    desc: 'توزيع دولي واسع وحضور قوي في المهرجانات السينمائية الكبرى.',
  },
];

export function Stage1StudioCreation() {
  const {
    initializeStudio,
    logo: initialLogo,
    showToast,
    gameDay,
    currentYear,
  } = useGameStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [studioName, setStudioName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [logoConfig, setLogoConfig] = useState<StudioLogoConfig>(initialLogo);
  const [selectedPerk, setSelectedPerk] = useState<FounderPerk>('visionary_director');
  const [selectedRegion, setSelectedRegion] = useState<MarketRegion>('egypt');

  const handleRandomizeLogo = () => {
    const randomEmblem =
      EMBLEM_OPTIONS[Math.floor(Math.random() * EMBLEM_OPTIONS.length)].id;
    const randomFrame =
      FRAME_OPTIONS[Math.floor(Math.random() * FRAME_OPTIONS.length)].id;
    const randomPalette =
      PALETTE_OPTIONS[Math.floor(Math.random() * PALETTE_OPTIONS.length)].id;
    setLogoConfig({
      emblem: randomEmblem,
      frame: randomFrame,
      palette: randomPalette,
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!studioName.trim() || !ceoName.trim()) {
        showToast('يرجى كتابة اسم شركة الإنتاج واسم المنتج التنفيذي أولاً', 'warning');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = () => {
    if (!studioName.trim() || !ceoName.trim()) {
      showToast('يرجى كتابة اسم شركة الإنتاج واسم المنتج التنفيذي أولاً', 'warning');
      setStep(1);
      return;
    }
    initializeStudio({
      studioName: studioName.trim(),
      ceoName: ceoName.trim(),
      logo: logoConfig,
      founderPerk: selectedPerk,
      region: selectedRegion,
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-3.5 pt-3 pb-24" dir="rtl">
      {gameDay > 1 && (
        <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] border-2 border-[#D4AF37] p-3.5 shadow-lg">
          <div className="text-xs font-extrabold text-[#D4AF37]">
            عودة للسوق في نفس العالم السينمائي ({formatGameDate(gameDay, currentYear)})
          </div>
          <p className="text-[11px] font-bold text-[#F9F6F0]/85 mt-0.5">
            بعد بيع شركتك السابقة للمستثمرين، تبدأ الآن بتأسيس شركة إنتاج جديدة برأس مال 75M ج.م في نفس الزمن ومع نفس النجوم والشركات المنافسة!
          </p>
        </div>
      )}

      {/* Unified Royal Cinema Header Card */}
      <div className="rounded-3xl border-2 border-[#D4AF37] bg-[#1A2530] p-4 text-[#F9F6F0] shadow-xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="shrink-0 rounded-2xl border-2 border-[#D4AF37] bg-[#F9F6F0] p-1.5 shadow-sm"
            >
              <StudioLogoSvg config={logoConfig} size={54} />
            </motion.div>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-black text-[#D4AF37]">
                <Sparkles className="h-3 w-3" />
                <span>تأسيس إمبراطورية الإنتاج · خطوة {step} من 3</span>
              </span>
              <h1 className="mt-1 font-display text-lg font-black text-[#F9F6F0] sm:text-xl">
                {step === 1 && 'هوية الشركة وتصميم الشعار الرسمي'}
                {step === 2 && 'اختيار المقر الإقليمي للشركة'}
                {step === 3 && 'الميزة القيادية للمنتج التنفيذي'}
              </h1>
              <p className="text-[11px] font-bold text-emerald-400">
                سيولة الخزينة: 75M ج.م · القيمة السوقية الابتدائية: 110M ج.م
              </p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-2.5 rounded-full transition-all ${
                  step === s
                    ? 'w-7 bg-[#D4AF37]'
                    : step > s
                    ? 'w-2.5 bg-[#15803D]'
                    : 'w-2.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Studio & CEO Names */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-3.5 sm:p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#D91624]" />
                <h2 className="font-display text-sm font-black text-[#1A2530]">
                  1. اسم الشركة والمدير التنفيذي
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black text-[#1A2530]">
                    اسم شركة الإنتاج السينمائي
                  </label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="مثال: العقرب ستوديوز / كليوباترا"
                    className="w-full rounded-2xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] px-3.5 py-2.5 text-xs font-bold text-[#1A2530] placeholder:text-[#1A2530]/40 focus:border-[#D4AF37] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-black text-[#1A2530]">
                    <UserCheck className="h-3.5 w-3.5 text-[#D91624]" />
                    <span>اسم المؤسس والمدير التنفيذي (CEO)</span>
                  </label>
                  <input
                    type="text"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    placeholder="اكتب اسمك كمنتج تنفيذي..."
                    className="w-full rounded-2xl border-2 border-[#1A2530]/20 bg-[#F9F6F0] px-3.5 py-2.5 text-xs font-bold text-[#1A2530] placeholder:text-[#1A2530]/40 focus:border-[#D4AF37] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Studio Logo Designer */}
            <div className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-4 shadow-sm space-y-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#D91624]" />
                  <h2 className="font-display text-sm font-black text-[#1A2530]">
                    2. تصميم شعار الاستوديو الرسمي
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleRandomizeLogo}
                  className="flex items-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#FFF9E6] px-3 py-1.5 text-[11px] font-black text-[#1A2530] transition hover:bg-[#FFF3B0]"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[#D91624]" />
                  <span>تصميم عشوائي</span>
                </button>
              </div>

              {/* Quick Visual Presets */}
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {PREMADE_LOGO_COMBINATIONS.slice(0, 16).map((preset, idx) => {
                  const isCurrent =
                    logoConfig.emblem === preset.emblem &&
                    logoConfig.frame === preset.frame &&
                    logoConfig.palette === preset.palette;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLogoConfig(preset)}
                      className={`flex items-center justify-center rounded-2xl border-2 p-1.5 transition ${
                        isCurrent
                          ? 'border-[#D91624] bg-[#FFF9E6] scale-105 shadow-xs'
                          : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                      }`}
                    >
                      <StudioLogoSvg config={preset} size={38} />
                    </button>
                  );
                })}
              </div>

              {/* Color Palettes */}
              <div className="pt-1">
                <span className="mb-1.5 block text-[11px] font-black text-[#1A2530]/75">
                  ألوان الهوية البصرية:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PALETTE_OPTIONS.map((pal) => {
                    const active = logoConfig.palette === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() =>
                          setLogoConfig((prev) => ({ ...prev, palette: pal.id }))
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                          active ? 'border-[#1A2530] scale-110 ring-2 ring-[#D4AF37]' : 'border-transparent'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${pal.primary}, ${pal.secondary})`,
                        }}
                        aria-label={`لون ${pal.name}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-black text-[#1A2530]">
                  المقر الإقليمي الرئيسي
                </h2>
                <p className="text-xs text-[#1A2530]/65">
                  اختر السوق الأساسي الذي تنطلق منه إنتاجاتك
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {REGIONS.map((reg) => {
                const isSelected = selectedRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedRegion(reg.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3.5 text-right transition-all ${
                      isSelected
                        ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] shadow-xs'
                        : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reg.flag}</span>
                      <div>
                        <p className="text-sm font-black text-[#1A2530]">{reg.name}</p>
                        <p className="text-xs text-[#1A2530]/70">{reg.desc}</p>
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isSelected
                          ? 'bg-[#D91624] text-white'
                          : 'border border-[#1A2530]/30 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border-2 border-[#1A2530]/20 border-b-4 border-b-[#1A2530]/35 bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#1A2530] text-[#D4AF37]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-black text-[#1A2530]">
                  التخصص القيادي للمنتج
                </h2>
                <p className="text-xs text-[#1A2530]/65">
                  اختر الميزة الاستراتيجية الدائمة لشركتك
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {PERKS.map((perk) => {
                const Icon = perk.icon;
                const isSelected = selectedPerk === perk.id;
                return (
                  <button
                    key={perk.id}
                    type="button"
                    onClick={() => setSelectedPerk(perk.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-2xl border-2 p-3.5 text-right transition-all ${
                      isSelected
                        ? 'border-[#D91624] border-b-4 border-b-[#9E0F19] bg-[#FFF9E6] shadow-xs'
                        : 'border-[#1A2530]/15 bg-[#F9F6F0] hover:border-[#D4AF37]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isSelected
                            ? 'border border-[#D4AF37] bg-[#D91624] text-white'
                            : 'bg-[#1A2530]/10 text-[#1A2530]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#1A2530]">
                            {perk.title}
                          </span>
                          <span className="rounded-lg bg-[#1A2530] px-2 py-0.5 text-[10px] font-black text-[#D4AF37]">
                            {perk.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#1A2530]/75">
                          {perk.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Step Navigation Box — Royal Cinema Theme */}
      <div className="fixed bottom-3 right-0 left-0 z-30 mx-auto max-w-xl px-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#D4AF37] bg-[#1A2530]/95 p-3 shadow-xl backdrop-blur-md">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-black text-[#F9F6F0] transition hover:bg-white/20"
            >
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#D4AF37] bg-[#D91624] px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 active:translate-y-0.5"
            >
              <span>التالي</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[#F9F6F0]/30 bg-[#D4AF37] px-6 py-2.5 text-xs font-black text-[#1A2530] shadow-md transition hover:brightness-105 active:translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>تدشين الاستوديو والانطلاق</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
