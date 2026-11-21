'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { readSavedUiLanguage } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

const OFFICIAL_EMAIL = 'neelyotycoon@gmail.com';

const CONTENT = {
  en: {
    dir: 'ltr' as const,
    navLabel: 'Document sections',
    quickNavLabel: 'Quick index',
    navAbout: 'About',
    navPillars: 'Experience',
    navPrivacy: 'Privacy Policy',
    navTerms: 'Terms of Use',
    navContact: 'Contact',
    backToGame: 'Back to Game',
    toggleLabel: 'العربية',
    eyebrow: 'Official Overview & Legal Documentation · Neelyo Studio · 2026 Edition',
    headline: 'About Neelyo & Official Legal Documentation',
    introLead:
      'is a full-scale strategic simulation game for founding and running a cinema and television production empire. It blends realistic box-office and streaming economics with a living, AI-driven entertainment world that dynamically generates rising stars, rival studios, script critiques, and multi-day contract negotiations.',
    pillarsEyebrow: '01 · Overview',
    pillarsTitle: 'What does the world of Neelyo offer?',
    pillars: [
      {
        num: '01',
        title: 'Studio Founding & The Executive Desk',
        body: 'Launch your studio with 75M virtual starting capital, customize your company name, royal crest, and strategic founder perk, and command every decision directly from the interactive Executive Desk.',
      },
      {
        num: '02',
        title: 'Two Independent Cinema & TV Tracks',
        body: 'Produce theatrical feature films measured by box-office gross and screen counts, or 7–30 episode TV series driven by million-viewer ratings, streaming licenses, and satellite broadcast deals.',
      },
      {
        num: '03',
        title: 'Realistic Negotiations with 180+ Stars & Directors',
        body: 'Sign 1 or 2 co-directors alongside cinematographers, composers, editors, and an expansive cast. Send tailored offers reviewed by talent agents over 2–3 in-game days.',
      },
      {
        num: '04',
        title: 'The Star Forge & Fixed Studio Assets',
        body: 'Sculpt your own exclusive star from scratch inside the Star Forge casting booth up to a legendary 99 OVR Diamond Card, and invest in permanent soundstages and VFX units for lasting cost discounts and quality boosts.',
      },
    ],
    privacyEyebrow: '02 · Privacy Policy',
    privacyTitle: 'How We Handle Your Data & Privacy',
    privacyIntro:
      'We are committed to full transparency regarding what is saved locally on your device and what is processed or synced on our secure cloud infrastructure to keep gameplay smooth and fair.',
    privacyArticles: [
      {
        code: 'Article 1',
        title: 'Local Saves & Optional Cloud Sync',
        body: 'Neelyo saves your studio progress, filmography, and finances locally on your device so you can resume immediately without creating an account. Secure cloud servers are used for optional cloud saves, global studio leaderboard synchronization, and server-side ledger verification to protect fair play.',
      },
      {
        code: 'Article 2',
        title: 'Custom Portraits & Visual Assets',
        body: 'Any portrait uploaded for your custom star in the Star Forge is stored within your local game save on your device. Selected in-game visual assets may use secure cloud media hosting for fast and reliable loading. We never sell or commercially exploit user-uploaded images.',
      },
      {
        code: 'Article 3',
        title: 'Global Leaderboard Information',
        body: 'When leaderboard sync is active, only fictional in-game studio statistics are displayed (studio name, executive name, virtual market value, completed productions, and awards won). Each studio is linked to a unique technical identifier so similar studio names never collide.',
      },
      {
        code: 'Article 4',
        title: 'In-Game Text Processing',
        body: 'When you write a project title, screenplay synopsis, or trigger dynamic story events inside Neelyo, those texts are processed solely by our gameplay AI endpoints to generate critiques, box-office reactions, and press dispatches inside the game world—never tied to a real-world personal identity.',
      },
      {
        code: 'Article 5',
        title: 'Optional Rewarded Ads & Data Deletion',
        body: 'Neelyo offers strictly optional rewarded features (such as unlocking Star Forge dossiers or emergency investor bailouts) supported by vetted ad partners adhering to industry-standard privacy practices. You may wipe your local data anytime from Studio Settings or request cloud data deletion by emailing us.',
      },
    ],
    termsEyebrow: '03 · Terms of Use',
    termsTitle: 'Fair Play & Usage Guidelines',
    termsArticles: [
      {
        code: 'Clause 1',
        title: 'Fictional Entertainment Simulation',
        body: 'Neelyo is a fictional business and entertainment simulation game centered on managing film and television production studios. All characters, ratings, press reports, rivalries, and crises exist purely for entertainment and strategic gameplay.',
      },
      {
        code: 'Clause 2',
        title: 'Virtual Currencies & Balances',
        body: 'All monetary amounts shown in the game (including treasury cash, studio valuation, production budgets, and box-office gross) are purely virtual in-game figures with zero real-world monetary value and cannot be exchanged or redeemed for real currency.',
      },
      {
        code: 'Clause 3',
        title: 'Fair Play & Leaderboard Integrity',
        body: 'Players agree to use respectful names for studios, projects, and custom stars and to compete fairly. Our automated financial ledger verification reserves the right to reject or adjust tampered balances that do not match verified server records.',
      },
      {
        code: 'Clause 4',
        title: 'Updates & Intellectual Property',
        body: 'All visual identity, UI craftsmanship, game mechanics, and brand assets of Neelyo remain reserved. We may refine economic balance, introduce new features, and update these terms periodically to maintain a high-quality experience across web, mobile, and Telegram Mini App.',
      },
    ],
    contactEyebrow: '04 · Official Contact & Support',
    contactTitle: 'Reach the Neelyo Team',
    contactDesc:
      'For technical support, feedback, data deletion requests, or legal and partnership inquiries, contact us directly via our official email:',
    emailSubject: 'Inquiry regarding Neelyo',
    emailCta: 'Email the Team',
    playCta: 'Return to Game',
    footerCopy: '© 2026 Neelyo Studio — All rights reserved',
  },
  ar: {
    dir: 'rtl' as const,
    navLabel: 'أقسام الوثيقة',
    quickNavLabel: 'فهرس سريع',
    navAbout: 'عن اللعبة',
    navPillars: 'أركان التجربة',
    navPrivacy: 'سياسة الخصوصية',
    navTerms: 'شروط الاستخدام',
    navContact: 'التواصل',
    backToGame: 'العودة إلى اللعبة',
    toggleLabel: 'English',
    eyebrow: 'الوثيقة التعريفية والقانونية الرسمية · Neelyo Studio · إصدار 2026',
    headline: 'معلومات عن لعبة Neelyo والوثائق القانونية المعتمدة',
    introLead:
      'هي لعبة محاكاة استراتيجية متكاملة لإدارة وتأسيس شركات الإنتاج السينمائي والتلفزيوني. تجمع اللعبة بين الاقتصاد الواقعي لشباك التذاكر ومواسم الدراما والمنصات، وبين عالم ديناميكي متجدد بالذكاء الاصطناعي يبتكر المواهب الصاعدة، الشركات المنافسة، تقييمات السيناريو، ومفاوضات العقود بصورة حية لا تتكرر.',
    pillarsEyebrow: '01 · نظرة عامة',
    pillarsTitle: 'ماذا يقدم لك عالم Neelyo؟',
    pillars: [
      {
        num: '01',
        title: 'تأسيس الاستوديو ومكتب الإمبراطور',
        body: 'ابدأ برأس مال تأسيسي 75 مليون عملة افتراضية، واختر اسم شركتك وشعارها الملكي وميزة المؤسس الاستراتيجية، وأدر كافة قراراتك من مكتب الإمبراطور التفاعلي.',
      },
      {
        num: '02',
        title: 'مساران مستقلان للسينما والدراما',
        body: 'أنتج أفلاماً سينمائية تُقاس بشباك التذاكر وعدد قاعات العرض، أو مسلسلات درامية من 7 إلى 30 حلقة تُقاس بالمشاهدات المليونية وعقود المنصات والقنوات الفضائية.',
      },
      {
        num: '03',
        title: 'تفاوض واقعي مع أكثر من 180 نجماً ومخرجاً',
        body: 'اختر مخرجاً واحداً أو مخرجين مع مدير التصوير والموسيقار والمونتير وطاقم التمثيل، وأرسل عروضك لتخضع لدراسة حقيقية خلال يومين إلى 3 أيام داخل اللعبة.',
      },
      {
        num: '04',
        title: 'غرفة صناعة النجوم والأصول الثابتة',
        body: 'صمّم نجمك الحصري من الصفر عبر كابينة الكاستينج والرادار السداسي حتى تقييم 99، واستثمر في بلاتوهات ووحدات مؤثرات ثابتة تمنحك خصماً دائماً وجودة إنتاج أعلى.',
      },
    ],
    privacyEyebrow: '02 · سياسة الخصوصية',
    privacyTitle: 'كيف نتعامل مع بياناتك وخصوصيتك',
    privacyIntro:
      'نلتزم بالشفافية الكاملة في توضيح ما يُحفظ محلياً على جهازك وما يُعالج أو يُخزن عبر خوادمنا السحابية الآمنة لضمان تجربة لعب سلسة وعادلة.',
    privacyArticles: [
      {
        code: 'المادة 1',
        title: 'الحفظ المحلي والمزامنة السحابية لتقدم اللعبة',
        body: 'تعتمد لعبة Neelyo على حفظ بيانات استوديوك وأعمالك وتقدمك محلياً على جهازك لتمكينك من استكمال اللعب فوراً دون إلزامك بإنشاء حساب. كما تُستخدم خوادم سحابية آمنة لحفظ التقدم السحابي الاختياري، ومزامنة الترتيب العالمي لشركات الإنتاج، والتحقق من نزاهة الأرصدة الافتراضية ومنع التلاعب.',
      },
      {
        code: 'المادة 2',
        title: 'الصور المخصصة والأصول المرئية',
        body: 'الصورة التي يرفعها اللاعب لبطاقة نجمه المخصص في غرفة صناعة النجوم تُحفظ ضمن بيانات حفظ اللعبة على جهازه، كما قد تعتمد بعض الأصول المرئية أو الصور المخصصة داخل اللعبة على خدمات استضافة وسائط سحابية آمنة لضمان سرعة العرض واستقراره. لا نقوم مطلقاً ببيع صور المستخدمين أو استغلالها لأغراض تجارية خارج نطاق اللعبة.',
      },
      {
        code: 'المادة 3',
        title: 'بيانات لوحة الصدارة العالمية',
        body: 'عند تفعيل المزامنة في لوحة الترتيب العالمي للاعبين، تُعرض فقط البيانات الخاصة بعالم اللعبة (اسم الاستوديو، اسم المدير الافتراضي، القيمة السوقية، عدد الأعمال المنتجة، وعدد الجوائز)، ويُربط كل استوديو بمعرّف تقني مستقل حتى لا تتداخل أسماء الشركات المتشابهة.',
      },
      {
        code: 'المادة 4',
        title: 'معالجة النصوص داخل تجربة اللعب',
        body: 'عند كتابة عنوان عمل أو ملخص سيناريو أو طلب توليد أحداث درامية داخل Neelyo، تُعالج هذه النصوص عبر خوادم المعالجة الذكية المخصصة لإنتاج التقييمات والردود والأخبار الفنية داخل عالم اللعبة فقط، ولا تُربط بهوية شخصية حقيقية للمستخدم.',
      },
      {
        code: 'المادة 5',
        title: 'الإعلانات الاختيارية بمكافأة وحذف البيانات',
        body: 'تقدم Neelyo مزايا اختيارية بمكافأة (مثل فتح أقفال غرفة صناعة النجوم أو تمويل الإنقاذ العاجل في حالات الأزمة)، وقد تعتمد على مزودي إعلانات معتمدين يلتزمون بسياسات الخصوصية القياسية. ويمكنك مسح بياناتك المحلية في أي وقت من إعدادات الاستوديو داخل اللعبة أو طلب حذف بياناتك السحابية عبر مراسلتنا رسمياً.',
      },
    ],
    termsEyebrow: '03 · شروط الاستخدام',
    termsTitle: 'ضوابط استخدام اللعبة واللعب النظيف',
    termsArticles: [
      {
        code: 'البند 1',
        title: 'طبيعة المحاكاة الترفيهية والخيالية',
        body: 'Neelyo هي لعبة محاكاة ترفيهية وإدارية خيالية تدور حول إدارة شركات الإنتاج السينمائي والتلفزيوني. جميع الشخصيات والمؤسسات والتقييمات والأخبار والأزمات الواردة داخل اللعبة مصممة لأغراض التسلية والتحدي الاستراتيجي فقط.',
      },
      {
        code: 'البند 2',
        title: 'افتراضية العملات والأرصدة المالية',
        body: 'جميع المبالغ والعملات الافتراضية المعروضة داخل اللعبة (بما في ذلك الخزينة، القيمة السوقية، الميزانيات، وإيرادات شباك التذاكر) هي أرصدة رقمية افتراضية تماماً داخل المحاكاة، ولا تملك أي قيمة نقدية حقيقية ولا يجوز استبدالها أو تحويلها إلى أموال فعلية.',
      },
      {
        code: 'البند 3',
        title: 'اللعب النظيف ونزاهة لوحة الصدارة',
        body: 'يلتزم المستخدم باختيار أسماء لائقة للاستوديو والأعمال والنجوم، وباحترام قواعد اللعب النظيف. يحق لنظام التحقق المالي الآلي رفض أو تعديل أي أرصدة متلاعب بها أو غير متطابقة مع السجل الموثق حفاظاً على عدالة المنافسة في الترتيب العالمي.',
      },
      {
        code: 'البند 4',
        title: 'التحديثات والملكية الفكرية',
        body: 'كافة حقوق الهوية البصرية والتصميم وآليات اللعب الخاصة بـ Neelyo محفوظة. نحتفظ بحق تطوير توازن الاقتصاد الداخلي والميزات وتحديث هذه الشروط بصورة دورية لضمان استقرار التجربة على المتصفح والهواتف وتطبيق تيليجرام المصغر.',
      },
    ],
    contactEyebrow: '04 · التواصل الرسمي والدعم',
    contactTitle: 'تواصل مع فريق Neelyo',
    contactDesc:
      'للدعم الفني، المقترحات، طلبات حذف البيانات، أو الاستفسارات القانونية والتجارية، راسلنا مباشرة عبر البريد الرسمي:',
    emailSubject: 'تواصل بخصوص لعبة Neelyo',
    emailCta: 'مراسلة الفريق',
    playCta: 'العودة إلى اللعب',
    footerCopy: '© 2026 Neelyo Studio — جميع الحقوق محفوظة',
  },
} as const;

export default function AboutUsContent() {
  const uiLanguage = useGameStore((s) => s.uiLanguage);
  const setUiLanguage = useGameStore((s) => s.setUiLanguage);

  useEffect(() => {
    const saved = readSavedUiLanguage();
    if (saved && saved !== useGameStore.getState().uiLanguage) {
      setUiLanguage(saved, true);
    }
  }, [setUiLanguage]);

  const lang: 'en' | 'ar' = uiLanguage === 'ar' ? 'ar' : 'en';
  const copy = CONTENT[lang];
  const isRtl = copy.dir === 'rtl';

  return (
    <div
      dir={copy.dir}
      className="min-h-screen bg-[#F9F6F0] text-[#1A2530] selection:bg-[#D91624] selection:text-white"
    >
      {/* Clean 3-Zone Editorial Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1A2530]/12 bg-[#F9F6F0]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl tracking-tight text-[#1A2530] whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D1824] p-1.5 shadow-xs">
              <Image
                src="/images/neelyo-logo.png"
                alt="Neelyo"
                width={24}
                height={24}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </span>
            <span>Neelyo</span>
          </Link>

          <nav
            aria-label={copy.navLabel}
            className="hidden md:flex items-center gap-6 text-sm font-bold text-[#1A2530]/75"
          >
            <a
              href="#about"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navAbout}
            </a>
            <a
              href="#pillars"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navPillars}
            </a>
            <a
              href="#privacy"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navPrivacy}
            </a>
            <a
              href="#terms"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navTerms}
            </a>
            <a
              href="#contact"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.navContact}
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher variant="compact" tone="light" />

            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1A2530] px-4 py-2 text-xs font-extrabold text-[#F9F6F0] hover:bg-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              {isRtl ? (
                <ArrowRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowLeft className="h-3.5 w-3.5" />
              )}
              <span>{copy.backToGame}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Editorial Document Masthead */}
        <section id="about" className="pb-12 border-b border-[#1A2530]/15">
          <p className="text-xs font-bold text-[#1A2530]/55 mb-3">
            {copy.eyebrow}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-[#1A2530] leading-[1.2] max-w-3xl [text-wrap:balance]">
            {copy.headline}
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-[1.85] text-[#1A2530]/80 max-w-3xl font-medium">
            <strong>Neelyo</strong> {copy.introLead}
          </p>

          {/* Quiet Mobile Chapter Links */}
          <nav
            aria-label={copy.quickNavLabel}
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-extrabold text-[#D91624] md:hidden"
          >
            <a href="#pillars" className="underline underline-offset-4">
              {copy.navPillars}
            </a>
            <a href="#privacy" className="underline underline-offset-4">
              {copy.navPrivacy}
            </a>
            <a href="#terms" className="underline underline-offset-4">
              {copy.navTerms}
            </a>
            <a href="#contact" className="underline underline-offset-4">
              {copy.navContact}
            </a>
          </nav>
        </section>

        {/* Section 01: Experience Pillars */}
        <section id="pillars" className="py-12 border-b border-[#1A2530]/15">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#B8860B] mb-1.5">
              {copy.pillarsEyebrow}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              {copy.pillarsTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {copy.pillars.map((item) => (
              <article
                key={item.num}
                className="pt-4 border-t border-[#1A2530]/15"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-mono text-xs font-bold text-[#D91624] tabular-nums">
                    {item.num}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#1A2530]">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm sm:text-[15px] leading-[1.8] text-[#1A2530]/75 font-medium">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Section 02: Privacy Policy */}
        <section id="privacy" className="py-12 border-b border-[#1A2530]/15">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#B8860B] mb-1.5">
              {copy.privacyEyebrow}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              {copy.privacyTitle}
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] leading-[1.8] text-[#1A2530]/70 max-w-2xl">
              {copy.privacyIntro}
            </p>
          </div>

          <dl className="divide-y divide-[#1A2530]/12">
            {copy.privacyArticles.map((article) => (
              <div
                key={article.code}
                className="py-6 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-8"
              >
                <dt className="sm:col-span-4">
                  <span className="block text-xs font-bold text-[#D91624] mb-1">
                    {article.code}
                  </span>
                  <span className="text-base font-black text-[#1A2530] leading-snug">
                    {article.title}
                  </span>
                </dt>
                <dd className="sm:col-span-8 text-sm sm:text-[15px] leading-[1.85] text-[#1A2530]/80 font-medium">
                  {article.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section 03: Terms of Use */}
        <section id="terms" className="py-12 border-b border-[#1A2530]/15">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#B8860B] mb-1.5">
              {copy.termsEyebrow}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              {copy.termsTitle}
            </h2>
          </div>

          <dl className="divide-y divide-[#1A2530]/12">
            {copy.termsArticles.map((article) => (
              <div
                key={article.code}
                className="py-6 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-8"
              >
                <dt className="sm:col-span-4">
                  <span className="block text-xs font-bold text-[#1A2530]/55 mb-1">
                    {article.code}
                  </span>
                  <span className="text-base font-black text-[#1A2530] leading-snug">
                    {article.title}
                  </span>
                </dt>
                <dd className="sm:col-span-8 text-sm sm:text-[15px] leading-[1.85] text-[#1A2530]/80 font-medium">
                  {article.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section 04: Official Contact */}
        <section id="contact" className="pt-12 pb-6">
          <div className="rounded-2xl bg-[#1A2530] text-[#F9F6F0] p-7 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <p className="text-xs font-bold text-[#D4AF37]">
                {copy.contactEyebrow}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-[#F9F6F0]">
                {copy.contactTitle}
              </h2>
              <p className="text-sm leading-[1.8] text-[#F9F6F0]/80">
                {copy.contactDesc}
              </p>
              <p
                dir="ltr"
                className="font-mono text-base font-bold text-[#FFF3B0] pt-1"
              >
                {OFFICIAL_EMAIL}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={`mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(
                  copy.emailSubject
                )}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D91624] px-5 py-2.5 text-sm font-extrabold text-white hover:brightness-110 transition whitespace-nowrap shrink-0"
              >
                <Mail className="h-4 w-4" />
                <span>{copy.emailCta}</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-extrabold text-[#1A2530] hover:brightness-105 transition whitespace-nowrap shrink-0"
              >
                <span>{copy.playCta}</span>
              </Link>
            </div>
          </div>

          <footer className="mt-10 pt-6 border-t border-[#1A2530]/12 flex flex-wrap items-center justify-between gap-3 text-xs text-[#1A2530]/55 font-bold">
            <span>{copy.footerCopy}</span>
            <span dir="ltr">{OFFICIAL_EMAIL}</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
