import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';

const APP_URL =
  process.env.APP_URL ||
  'https://ais-pre-rocpe6ymx4aaq2syvt4glo-1004117229529.europe-west2.run.app';

const OFFICIAL_EMAIL = 'neelyotycoon@gmail.com';

export const metadata: Metadata = {
  title: 'معلومات عنا وسياسة الخصوصية وشروط الاستخدام | Neelyo',
  description:
    'التعريف الرسمي للعبة Neelyo لمحاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني العربية، إلى جانب سياسة الخصوصية، شروط الاستخدام، وبيانات التواصل الرسمية.',
  alternates: {
    canonical: `${APP_URL}/about-us`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
};

const GAME_PILLARS = [
  {
    num: '01',
    title: 'تأسيس الاستوديو ومكتب الإمبراطور',
    body: 'ابدأ برأس مال تأسيسي 75 مليون جنيه افتراضي، واختر اسم شركتك وشعارها الملكي وميزة المؤسس الاستراتيجية، وأدر كافة قراراتك من مكتب الإمبراطور التفاعلي.',
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
];

const PRIVACY_ARTICLES = [
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
];

const TERMS_ARTICLES = [
  {
    code: 'البند 1',
    title: 'طبيعة المحاكاة الترفيهية والخيالية',
    body: 'Neelyo هي لعبة محاكاة ترفيهية وإدارية خيالية تدور حول إدارة شركات الإنتاج السينمائي والتلفزيوني. جميع الشخصيات والمؤسسات والتقييمات والأخبار والأزمات الواردة داخل اللعبة مصممة لأغراض التسلية والتحدي الاستراتيجي فقط.',
  },
  {
    code: 'البند 2',
    title: 'افتراضية العملات والأرصدة المالية',
    body: 'جميع المبالغ المعروضة بالجنيه المصري داخل اللعبة (بما في ذلك الخزينة، القيمة السوقية، الميزانيات، وإيرادات شباك التذاكر) هي أرصدة رقمية افتراضية تماماً داخل المحاكاة، ولا تملك أي قيمة نقدية حقيقية ولا يجوز استبدالها أو تحويلها إلى أموال فعلية.',
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
];

export default function AboutUsPage() {
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${APP_URL}/about-us#about`,
    url: `${APP_URL}/about-us`,
    name: 'معلومات عنا وسياسة الخصوصية وشروط الاستخدام — Neelyo',
    inLanguage: ['ar', 'ar-EG'],
    description:
      'الصفحة التعريفية والقانونية الرسمية للعبة Neelyo: لعبة محاكاة عربية لإدارة استوديوهات الإنتاج السينمائي والتلفزيوني بالذكاء الاصطناعي.',
    mainEntity: {
      '@type': 'VideoGame',
      name: 'Neelyo',
      alternateName: 'Neelyo — Cinema & TV Tycoon',
      url: APP_URL,
      gamePlatform: [
        'Web Browser',
        'Mobile Web',
        'Telegram Mini App',
        'Desktop Web',
      ],
      applicationCategory: 'GameApplication',
      genre: [
        'Cinema Studio Tycoon',
        'AI-Driven Strategy Simulation',
        'Entertainment & Media Management',
        'Arabic Business Simulation Game',
      ],
      author: {
        '@type': 'Organization',
        name: 'Neelyo Studio',
        email: OFFICIAL_EMAIL,
      },
    },
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F9F6F0] text-[#1A2530] selection:bg-[#D91624] selection:text-white"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* Clean 3-Zone Editorial Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1A2530]/12 bg-[#F9F6F0]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="font-display text-xl tracking-tight text-[#1A2530] whitespace-nowrap shrink-0"
          >
            Neelyo
          </Link>

          <nav
            aria-label="أقسام الوثيقة"
            className="hidden md:flex items-center gap-6 text-sm font-bold text-[#1A2530]/75"
          >
            <a
              href="#about"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              عن اللعبة
            </a>
            <a
              href="#pillars"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              أركان التجربة
            </a>
            <a
              href="#privacy"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              سياسة الخصوصية
            </a>
            <a
              href="#terms"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              شروط الاستخدام
            </a>
            <a
              href="#contact"
              className="hover:text-[#D91624] transition-colors whitespace-nowrap shrink-0"
            >
              التواصل
            </a>
          </nav>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A2530] px-4 py-2 text-xs font-extrabold text-[#F9F6F0] hover:bg-[#D91624] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة إلى اللعبة</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Editorial Document Masthead */}
        <section id="about" className="pb-12 border-b border-[#1A2530]/15">
          <p className="text-xs font-bold text-[#1A2530]/55 mb-3">
            الوثيقة التعريفية والقانونية الرسمية · Neelyo Studio · إصدار 2026
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-[#1A2530] leading-[1.2] max-w-3xl [text-wrap:balance]">
            معلومات عن لعبة Neelyo والوثائق القانونية المعتمدة
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-[1.85] text-[#1A2530]/80 max-w-3xl font-medium">
            <strong>Neelyo</strong> هي لعبة محاكاة استراتيجية عربية متكاملة لإدارة وتأسيس شركات الإنتاج السينمائي والتلفزيوني. تجمع اللعبة بين الاقتصاد الواقعي لشباك التذاكر وموسم دراما رمضان، وبين عالم ديناميكي متجدد بالذكاء الاصطناعي يبتكر المواهب الصاعدة، الشركات المنافسة، تقييمات السيناريو، ومفاوضات العقود بصورة حية لا تتكرر.
          </p>

          {/* Quiet Mobile Chapter Links */}
          <nav
            aria-label="فهرس سريع"
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-extrabold text-[#D91624] md:hidden"
          >
            <a href="#pillars" className="underline underline-offset-4">
              أركان التجربة
            </a>
            <a href="#privacy" className="underline underline-offset-4">
              سياسة الخصوصية
            </a>
            <a href="#terms" className="underline underline-offset-4">
              شروط الاستخدام
            </a>
            <a href="#contact" className="underline underline-offset-4">
              التواصل الرسمي
            </a>
          </nav>
        </section>

        {/* Section 01: Experience Pillars */}
        <section id="pillars" className="py-12 border-b border-[#1A2530]/15">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#B8860B] mb-1.5">01 · نظرة عامة</p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              ماذا يقدم لك عالم Neelyo؟
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {GAME_PILLARS.map((item) => (
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
              02 · سياسة الخصوصية
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              كيف نتعامل مع بياناتك وخصوصيتك
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] leading-[1.8] text-[#1A2530]/70 max-w-2xl">
              نلتزم بالشفافية الكاملة في توضيح ما يُحفظ محلياً على جهازك وما يُعالج أو يُخزن عبر خوادمنا السحابية الآمنة لضمان تجربة لعب سلسة وعادلة.
            </p>
          </div>

          <dl className="divide-y divide-[#1A2530]/12">
            {PRIVACY_ARTICLES.map((article) => (
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
              03 · شروط الاستخدام
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#1A2530]">
              ضوابط استخدام اللعبة واللعب النظيف
            </h2>
          </div>

          <dl className="divide-y divide-[#1A2530]/12">
            {TERMS_ARTICLES.map((article) => (
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
                04 · التواصل الرسمي والدعم
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-[#F9F6F0]">
                تواصل مع فريق Neelyo
              </h2>
              <p className="text-sm leading-[1.8] text-[#F9F6F0]/80">
                للدعم الفني، المقترحات، طلبات حذف البيانات، أو الاستفسارات القانونية والتجارية، راسلنا مباشرة عبر البريد الرسمي:
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
                  'تواصل بخصوص لعبة Neelyo'
                )}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D91624] px-5 py-2.5 text-sm font-extrabold text-white hover:brightness-110 transition whitespace-nowrap shrink-0"
              >
                <Mail className="h-4 w-4" />
                <span>مراسلة الفريق</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-extrabold text-[#1A2530] hover:brightness-105 transition whitespace-nowrap shrink-0"
              >
                <span>العودة إلى اللعب</span>
              </Link>
            </div>
          </div>

          <footer className="mt-10 pt-6 border-t border-[#1A2530]/12 flex flex-wrap items-center justify-between gap-3 text-xs text-[#1A2530]/55 font-bold">
            <span>© 2026 Neelyo Studio — جميع الحقوق محفوظة</span>
            <span dir="ltr">{OFFICIAL_EMAIL}</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
