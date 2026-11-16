import type { Metadata } from 'next';
import Link from 'next/link';

const baseUrl = (process.env.APP_URL || 'https://hyptrix.app').replace(/\/$/, '');
const title = 'عن Hyptrix | لعبة إدارة استوديو السينما والتلفزيون';
const description =
  'اكتشف Hyptrix بالتفصيل: لعبة عربية لإدارة شركة إنتاج سينمائي وتلفزيوني، والتفاوض مع الممثلين والمخرجين، وتخطيط التصوير، وإدارة الميزانية والتوزيع والإيرادات.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: '/about',
    languages: { 'ar-EG': '/about', ar: '/about' },
  },
  openGraph: {
    title,
    description,
    url: `${baseUrl}/about`,
    siteName: 'Hyptrix — Cinema & TV Tycoon',
    locale: 'ar_EG',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

const questions = [
  {
    question: 'ما هي Hyptrix؟',
    answer:
      'Hyptrix لعبة محاكاة وإدارة عربية تضع اللاعب في موقع مؤسس شركة إنتاج فني، وتجعله يدير الأفلام والمسلسلات من الفكرة إلى الإنتاج والتوزيع والنتائج المالية.',
  },
  {
    question: 'هل يمكن إنشاء فيلم ومسلسل داخل اللعبة؟',
    answer:
      'نعم. يستطيع اللاعب إنشاء فيلم سينمائي أو مسلسل تلفزيوني، وتحديد التصنيفات والموسم والتصنيف العمري، ثم اختيار الطاقم وإدارة التصوير والعرض.',
  },
  {
    question: 'كيف يعمل التفاوض مع الممثلين والمخرجين؟',
    answer:
      'العروض ليست تعاقداً تلقائياً. تتأثر استجابة الموهبة بالأجر ونسبة الأرباح والملاءمة الفنية وخبرة التصنيف وحجم الدور ومكانة الفنان وشروط المشروع.',
  },
  {
    question: 'هل تؤثر قرارات التصوير على نتائج المشروع؟',
    answer:
      'نعم. بعض الخيارات الإنتاجية تغيّر الخزينة والسمعة والقيمة السوقية وجودة العمل وترقب الجمهور ومدة التصوير وموعد الإصدار.',
  },
  {
    question: 'هل التقييمات التي تظهر داخل اللعبة مراجعات حقيقية؟',
    answer:
      'لا. درجات النقاد وتفاعل الجمهور والجوائز والأخبار داخل عالم اللعبة نتائج محاكاة خيالية وليست مراجعات Google أو شهادات حقيقية عن الموقع.',
  },
  {
    question: 'هل توجد شراكات حقيقية مع المنصات والقنوات الظاهرة؟',
    answer:
      'المنصات والقنوات في عالم اللعبة كيانات خيالية لأغراض المحاكاة. تخصيص شعاراتها يغيّر العرض البصري فقط ولا يعني وجود شراكة أو اعتماد تجاري.',
  },
];

const aboutSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoGame',
      name: 'Hyptrix — Cinema & TV Tycoon',
      url: baseUrl,
      inLanguage: 'ar-EG',
      applicationCategory: 'GameApplication',
      genre: ['Simulation', 'Strategy', 'Tycoon', 'Business Management'],
      gamePlatform: ['Web browser', 'Mobile browser', 'Desktop browser'],
      playMode: 'SinglePlayer',
      description,
      featureList: [
        'تأسيس شركة إنتاج وإدارة الخزينة والسمعة والقيمة السوقية',
        'تطوير أفلام ومسلسلات وكتابة ملخصات أصلية',
        'التفاوض مع الممثلين والمخرجين والمتخصصين حسب الأجر والملاءمة وحجم الدور',
        'تخطيط الميزانية والموارد وجدول التصوير',
        'قرارات إنتاجية تؤثر في الجودة والسمعة والمال والترقب والجدول',
        'اختيار أسواق التوزيع والمنصات والقنوات ومتابعة الإيرادات',
        'المنافسة والأحداث والجوائز السنوية داخل عالم محاكاة خيالي',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: questions.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
};

export default function AboutHyptrixPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#F2F5FF] px-4 py-8 text-slate-900 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <article className="mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-violet-100 bg-white shadow-[0_24px_70px_-35px_rgba(79,70,229,0.35)]">
        <header className="bg-gradient-to-l from-[#1E1B4B] via-[#3730A3] to-[#6D28D9] px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="text-xs font-black tracking-wide text-cyan-200">لعبة محاكاة وإدارة صناعة الترفيه</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Hyptrix — Cinema &amp; TV Tycoon</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-indigo-50 sm:text-base">
            ابنِ شركة إنتاج سينمائي وتلفزيوني، وقرّر ما الذي ستصنعه، ومن سيشارك فيه، وكيف ستُنتجه وتبيعه وتنافس به في سوق ترفيهي متغير.
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-black text-indigo-800 shadow-lg transition hover:bg-cyan-50">
            ابدأ اللعب
          </Link>
        </header>

        <div className="space-y-10 px-5 py-8 sm:px-10 sm:py-10">
          <section>
            <h2 className="text-xl font-black text-slate-950">ما هي Hyptrix؟</h2>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              Hyptrix لعبة عربية لإدارة شركة إنتاج فني خيالية. لا يقتصر دور اللاعب على اختيار فيلم أو مشاهدة نتيجة؛ بل يتخذ قرارات إدارية وفنية وتجارية متتابعة. يبدأ بتأسيس الاستوديو وتحديد هويته، ثم ينشئ مشروعاً سينمائياً أو تلفزيونياً، ويكوّن فريقه، ويموّل الإنتاج، ويدير التصوير، ويختار أسواق العرض والتوزيع، ثم يتابع الإيرادات والسمعة والمنافسة والجوائز مع مرور الوقت.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">رحلة المشروع داخل اللعبة</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['١. تأسيس الاستوديو', 'اختر اسم شركة الإنتاج وشعارها، وحدد ميزة المؤسس، وابدأ بإدارة السيولة والسمعة والقيمة السوقية.'],
                ['٢. تطوير المشروع', 'اختر فيلماً أو مسلسلاً، وحدد الموسم والتصنيف العمري والتصنيفات الدرامية، واكتب ملخص قصتك بحرية.'],
                ['٣. التعاقد مع المواهب', 'تصفح الممثلين والمخرجين ومديري التصوير والموسيقيين والمونتيرين، ثم قدّم عروضاً مالية وفنية قابلة للقبول أو الرفض.'],
                ['٤. بناء الميزانية', 'وزّع الإنفاق على مواقع التصوير والديكور والملابس والمكياج والمؤثرات والمشاهد الخطرة والحشود والتسويق.'],
                ['٥. إدارة التصوير', 'تابع الجدول والأخبار والأزمات، واختر بين بدائل تحمل تكاليف ومخاطر ومكاسب مختلفة.'],
                ['٦. التوزيع والعرض', 'اختر أسواق التوزيع والمنصات الرقمية والقنوات التلفزيونية، ثم ابدأ العرض وتابع النتائج.'],
                ['٧. متابعة المنافسة', 'راقب الشركات المنافسة وتطور المواهب وأخبار الصناعة والتغيرات التي تظهر مع أيام اللعبة.'],
                ['٨. المهرجانات والجوائز', 'تابع حصاد أعمالك في المهرجانات والاحتفالات السنوية التي يطلقها تقويم اللعبة تلقائياً.'],
              ].map(([heading, body]) => (
                <section key={heading} className="rounded-2xl border border-indigo-100 bg-[#F8FAFF] p-4">
                  <h3 className="text-sm font-black text-violet-950">{heading}</h3>
                  <p className="mt-2 text-xs leading-7 text-slate-700">{body}</p>
                </section>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">عمق التفاوض وإدارة المواهب</h2>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              كل عرض تعاقدي هو قرار تفاوضي. الأجر المقترح ونسبة الأرباح ومكانة الاستوديو وخبرة الموهبة في التصنيف وملاءمتها للشخصية أو للمهمة الفنية وحجم الدور كلها عوامل تدخل في الاستجابة المحاكية. البطولة ليست مثل الدور المساعد أو الظهور القصير؛ فحجم الالتزام والتوقعات السوقية يغيّران قيمة العرض واحتمال الموافقة. ويمكن للاعب اختيار جلسة عشاء عمل مدفوعة بشكل اختياري، وتُخصم تكلفتها منفصلة عن أجر العقد.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">القرارات لها عواقب</h2>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              خلال الإنتاج قد يواجه الاستوديو خلافاً بين النجوم، أو مشكلة في موقع التصوير، أو تسريباً دعائياً، أو تعديلاً رقابياً، أو حاجة لإعادة تنفيذ مشهد. لكل اختيار مفاضلة مختلفة. بعض الحلول تستهلك المال والوقت لكنها ترفع الجودة أو الحماس أو السمعة؛ وحلول أخرى تحافظ على السيولة لكنها قد تؤثر سلباً في العمل أو موعده. تنعكس هذه التغييرات داخل حالة المشروع ونتائجه اللاحقة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">التوزيع والنتائج المالية</h2>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              يختار اللاعب الأسواق التي يريد دخولها، ويتفاوض على حقوق العرض مع منصات رقمية وقنوات تلفزيونية خيالية. الفيلم يتابع أداءه السينمائي ثم حقوق البث، بينما يُتابع المسلسل حلقة بحلقة. ويمكن تخصيص الشعارات البصرية لهذه الجهات داخل اللعبة، دون أن يعني ذلك وجود اتفاق أو شراكة حقيقية. وتتأثر الإيرادات المحاكية بخيارات المشروع وميزانيته وجودته وترقب الجمهور والانتشار.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">أسئلة شائعة</h2>
            <div className="mt-4 space-y-3">
              {questions.map(({ question, answer }) => (
                <details key={question} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer list-none text-sm font-black text-slate-900">{question}</summary>
                  <p className="mt-3 text-xs leading-7 text-slate-700">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="border-t border-slate-100 pt-5 text-xs leading-7 text-slate-500">
            ملاحظة: الكيانات والشخصيات والمنصات والقنوات والأخبار والنتائج داخل اللعبة جزء من محاكاة خيالية، ولا تمثل بالضرورة جهات أو شراكات أو تقييمات حقيقية. درجات النقاد والجوائز داخل اللعبة ليست مراجعات عامة للموقع.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <span className="text-xs font-bold text-slate-500">Hyptrix — لعبة إدارة السينما والتلفزيون باللغة العربية</span>
            <Link href="/" className="text-sm font-black text-violet-700 hover:text-violet-900">العودة إلى اللعبة</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
