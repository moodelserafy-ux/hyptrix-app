'use client';

import React, { useState } from 'react';
import { useGameStore, StudioLogoConfig } from '@/lib/store';
import { FounderPerk, MarketRegion } from '@/lib/game-engine';
import {
  StudioLogoSvg,
  EMBLEM_OPTIONS,
  FRAME_OPTIONS,
  PALETTE_OPTIONS,
  PREMADE_LOGO_COMBINATIONS,
} from './StudioLogoSvg';
import {
  Clapperboard,
  Sparkles,
  Award,
  Coins,
  Building2,
  Play,
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Flame,
} from 'lucide-react';
import {
  playClickSound,
  playTabSwitchSound,
  playContractSignedSound,
} from '@/lib/game-audio';

const FOUNDER_PERKS: {
  id: FounderPerk;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'visionary_director',
    title: 'رؤية فنية ومهرجانات (Visionary)',
    subtitle: 'يرفع الجودة الفنية لكل أعمالك +5% ويزيد فرص الفوز بالجوائز السنوية',
    icon: Award,
  },
  {
    id: 'marketing_whale',
    title: 'حوت تسويق وشباك تذاكر (Blockbuster)',
    subtitle: 'يرفع إيرادات الأسبوع الافتتاحي +8% في دور العرض السينمائي',
    icon: Coins,
  },
  {
    id: 'shark_negotiator',
    title: 'مفاوض شرس (Shark Negotiator)',
    subtitle: 'يمنحك خصماً دائماً 15% على أجور النجوم والمخرجين عند التعاقد',
    icon: Shield,
  },
];

export default function Stage1StudioCreation() {
  const {
    studioName: savedName,
    ceoName: savedCeo,
    logo: savedLogo,
    initializeStudio,
  } = useGameStore();

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const [studioName, setStudioName] = useState(savedName || 'العقرب ستوديوز');
  const [ceoName, setCeoName] = useState(savedCeo || 'محمود الصيرفي');
  const [logoConfig, setLogoConfig] = useState<StudioLogoConfig>(
    savedLogo || {
      emblem: 'golden_scorpion',
      frame: 'royal_shield',
      palette: 'royal_ivory',
    }
  );
  const [founderPerk, setFounderPerk] =
    useState<FounderPerk>('visionary_director');
  const [region] = useState<MarketRegion>('egypt');

  const handleLaunchStudio = () => {
    playContractSignedSound();
    initializeStudio({
      studioName: studioName.trim() || 'العقرب ستوديوز',
      ceoName: ceoName.trim() || 'محمود الصيرفي',
      logo: logoConfig,
      founderPerk,
      region,
    });
  };

  // =========================================================================
  // SCREEN 1: COMPACT WIDESCREEN LANDING HERO (5-SECOND HOOK, ZERO SCROLL)
  // =========================================================================
  if (!showWizard) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-slate-950/85 p-3.5 sm:p-4 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Right 7 Columns: Headline, Value Proposition, Primary CTA */}
          <div className="col-span-12 md:col-span-7 space-y-2 text-right">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>محاكاة إدارة الإمبراطورية السينمائية والتلفزيونية</span>
            </div>

            <h1 className="text-sm sm:text-base font-black text-white leading-snug">
              ابنِ مدينتك الإنتاجية، تعاقد مع نخبة النجوم، ونافس على صدارة شباك التذاكر والمهرجانات العالمية
            </h1>

            <p className="text-[11px] leading-relaxed text-slate-300">
              أدر ميزانيات الإنتاج والتسويق، طوّر البلاتوهات واستوديوهات المؤثرات، وواجه أزمات التصوير الحية وقرارات الرقابة ومنصات البث في عالم ديناميكي متكامل.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowWizard(true);
                }}
                className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md transition-all hover:brightness-110 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>ابدأ تأسيس الاستوديو الآن</span>
              </button>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>حفظ تلقائي فوري • واجهة سينمائية بالعرض</span>
              </div>
            </div>
          </div>

          {/* Left 5 Columns: 3 Compact Feature Cards */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/80 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">مدينة إنتاج تفاعلية</h3>
                <p className="text-[10px] text-slate-400">
                  طوّر الكاميرات والبلاتوهات ومختبرات المؤثرات البصرية لرفع سقف جودة أعمالك.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/80 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">مفاوضات النجوم وإدارة الأزمات</h3>
                <p className="text-[10px] text-slate-400">
                  تعاقد مع المخرجين والممثلين بذكاء ووازن بين الأجر ونسبة الأرباح الخلفية.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/80 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">شباك التذاكر وموسم الجوائز</h3>
                <p className="text-[10px] text-slate-400">
                  افتح أسواق التوزيع العالمية ونافس الشركات الكبرى في حفل الجوائز السنوي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: 3-STEP COMPACT STUDIO CREATION WIZARD (NO VERTICAL SCROLL)
  // =========================================================================
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-slate-950/90 p-3 sm:p-4 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
      {/* Top Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <Clapperboard className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs sm:text-sm font-black text-white">
            تأسيس إمبراطورية الاستوديو ({wizardStep} / 3)
          </h2>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1">
          {[
            { s: 1, label: 'الاسم والتخصص' },
            { s: 2, label: 'تصميم الشعار' },
            { s: 3, label: 'اعتماد التأسيس' },
          ].map((item) => (
            <button
              key={item.s}
              type="button"
              onClick={() => {
                playTabSwitchSound();
                setWizardStep(item.s as 1 | 2 | 3);
              }}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all ${
                wizardStep === item.s
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {item.s}. {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: STUDIO NAME, CEO & FOUNDER PERK */}
      {wizardStep === 1 && (
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-5 space-y-2">
            <div>
              <label className="block text-[11px] font-black text-slate-200 mb-1">
                اسم شركة الإنتاج السينمائي
              </label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="مثال: العقرب ستوديوز..."
                maxLength={28}
                className="w-full rounded-xl border border-amber-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-black text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-200 mb-1">
                اسم الرئيس التنفيذي (المنتج)
              </label>
              <input
                type="text"
                value={ceoName}
                onChange={(e) => setCeoName(e.target.value)}
                placeholder="اسمك كمنتج..."
                maxLength={28}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-7 space-y-1.5">
            <span className="block text-[11px] font-black text-slate-200">
              ميزة المؤسس الاستراتيجية
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {FOUNDER_PERKS.map((perk) => {
                const Icon = perk.icon;
                const active = founderPerk === perk.id;
                return (
                  <button
                    key={perk.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setFounderPerk(perk.id);
                    }}
                    className={`flex items-center justify-between rounded-xl border p-2 text-right transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate">
                          {perk.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {perk.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: STUDIO EMBLEM DESIGNER */}
      {wizardStep === 2 && (
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left Preview Card */}
          <div className="col-span-12 sm:col-span-4 flex flex-col items-center justify-center rounded-xl border border-amber-500/25 bg-slate-900/80 p-3 text-center">
            <StudioLogoSvg config={logoConfig} size={64} />
            <h3 className="mt-2 text-xs font-black text-white truncate max-w-full">
              {studioName || 'العقرب ستوديوز'}
            </h3>
            <span className="mt-0.5 text-[10px] font-bold text-amber-300">
              بقيادة: {ceoName || 'المدير التنفيذي'}
            </span>
          </div>

          {/* Right Pickers */}
          <div className="col-span-12 sm:col-span-8 space-y-2">
            {/* Quick Premade Combinations */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-1">
                تشكيلات شعارات جاهزة (اختر بلمسة واحدة)
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {PREMADE_LOGO_COMBINATIONS.slice(0, 10).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setLogoConfig(preset);
                    }}
                    className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-1 hover:border-amber-400 transition-all"
                  >
                    <StudioLogoSvg config={preset} size={32} />
                  </button>
                ))}
              </div>
            </div>

            {/* Emblem Picker */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-1">
                الرمز والألوان والإطار
              </span>
              <div className="flex flex-wrap gap-1">
                {EMBLEM_OPTIONS.slice(0, 8).map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setLogoConfig((prev) => ({ ...prev, emblem: em.id }));
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                      logoConfig.emblem === em.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    رمز {em.name}
                  </button>
                ))}
                {FRAME_OPTIONS.slice(0, 4).map((fr) => (
                  <button
                    key={fr.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setLogoConfig((prev) => ({ ...prev, frame: fr.id }));
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                      logoConfig.frame === fr.id
                        ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    إطار {fr.name}
                  </button>
                ))}
                {PALETTE_OPTIONS.slice(0, 5).map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setLogoConfig((prev) => ({ ...prev, palette: pal.id }));
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                      logoConfig.palette === pal.id
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    لون {pal.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUMMARY & LAUNCH */}
      {wizardStep === 3 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-slate-900/80 p-3">
          <div className="flex items-center gap-3">
            <StudioLogoSvg config={logoConfig} size={56} />
            <div>
              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black text-amber-300">
                سيولة التأسيس: 75M • القيمة السوقية: 110M
              </span>
              <h3 className="mt-1 text-sm font-black text-white">
                {studioName || 'العقرب ستوديوز'}
              </h3>
              <p className="text-[10px] text-slate-400">
                المنتج التنفيذي: {ceoName || 'محمود الصيرفي'} • جاهز لاستلام مدينة الإنتاج الثلاثية الأبعاد.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLaunchStudio}
            className="flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md transition-all hover:brightness-110 active:scale-95"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>افتتاح مدينة الإنتاج والبدء</span>
          </button>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            if (wizardStep === 1) {
              setShowWizard(false);
            } else {
              setWizardStep((prev) => (prev - 1) as 1 | 2 | 3);
            }
          }}
          className="flex min-h-[32px] items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
        >
          <ArrowRight className="h-3 w-3" />
          <span>السابق</span>
        </button>

        {wizardStep < 3 ? (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setWizardStep((prev) => (prev + 1) as 1 | 2 | 3);
            }}
            className="flex min-h-[32px] items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1 text-[11px] font-black text-slate-950"
          >
            <span>التالي</span>
            <ArrowLeft className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLaunchStudio}
            className="flex min-h-[32px] items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-1 text-[11px] font-black text-slate-950"
          >
            <Check className="h-3.5 w-3.5" />
            <span>تأكيد التأسيس</span>
          </button>
        )}
      </div>
    </div>
  );
}
