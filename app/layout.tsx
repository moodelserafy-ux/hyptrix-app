import type { Metadata } from 'next';
import { Alexandria, Readex_Pro } from 'next/font/google';
import './globals.css';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-alexandria',
});

const readexPro = Readex_Pro({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-readex',
});

const appUrl = process.env.APP_URL || 'https://hyptrix.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Hyptrix — Cinema & TV Tycoon | لعبة إدارة شركات الإنتاج السينمائي والدرامي',
    template: '%s | Hyptrix — Cinema & TV Tycoon',
  },
  description:
    'Hyptrix هي أقوى لعبة محاكاة وإدارة شركات إنتاج سينمائي وتلفزيوني باللغة العربية. أسس استوديو الإنتاج الخاص بك، اكتب السيناريو، تفاوض مع أكثر من 100 نجم ومخرج، أدر ميزانيات الأفلام والمسلسلات، وتصدر شباك التذاكر والمهرجانات.',
  keywords: [
    'Hyptrix',
    'Cinema & TV Tycoon',
    'لعبة إدارة شركة إنتاج سينمائي',
    'لعبة إنتاج أفلام ومسلسلات',
    'محاكاة السينما العربية',
    'لعبة شباك التذاكر',
    'إدارة استوديو سينمائي',
    'ألعاب محاكاة وإدارة أعمال',
    'Movie Studio Tycoon Arabic',
    'TV Production Tycoon Game',
    'أفضل لعبة إدارة إنتاج فني',
  ],
  authors: [{ name: 'Hyptrix Interactive Studios' }],
  creator: 'Hyptrix Interactive Studios',
  publisher: 'Hyptrix Interactive Studios',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
    languages: {
      'ar-EG': '/',
      ar: '/',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Hyptrix — Cinema & TV Tycoon | إمبراطورية الإنتاج السينمائي والدرامي',
    description:
      'ابنِ إمبراطوريتك السينمائية والتلفزيونية في Hyptrix: تطوير السيناريو، التفاوض مع أكثر من 100 نجم ومخرج، إدارة الأزمات، متابعة عرض حلقات المسلسلات وإيرادات شباك التذاكر.',
    url: appUrl,
    siteName: 'Hyptrix — Cinema & TV Tycoon',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyptrix — Cinema & TV Tycoon | لعبة إدارة شركات الإنتاج السينمائي والدرامي',
    description:
      'أسس شركة إنتاجك السينمائي والدرامي، تفاوض مع ألمع النجوم والمخرجين، نافس في شباك التذاكر ومواسم المسلسلات، وتصدر ترتيب شركات الإنتاج.',
  },
  category: 'games',
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['VideoGame', 'WebApplication', 'SoftwareApplication'],
      name: 'Hyptrix — Cinema & TV Tycoon',
      alternateName: [
        'هايبتريكس: إمبراطورية السينما والدراما',
        'Hyptrix Movie & TV Studio Tycoon',
      ],
      url: appUrl,
      inLanguage: 'ar',
      applicationCategory: 'GameApplication',
      applicationSubCategory: 'Business Simulation & Tycoon Game',
      genre: [
        'Simulation',
        'Business Tycoon',
        'Strategy',
        'Cinema & TV Studio Management',
      ],
      operatingSystem: 'Web, Android, iOS, Desktop PWA',
      playMode: 'SinglePlayer',
      description:
        'Hyptrix هي اللعبة العربية الأولى والأعمق لمحاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني. تتيح للاعب تأسيس استوديو إنتاج فني، اختيار التصنيفات الدرامية، صياغة السيناريو، التفاوض مع أكثر من 100 ممثل ومخرج، إدارة مواقع التصوير، طرح الأفلام في شباك التذاكر أو عرض المسلسلات حلقة بحلقة عبر القنوات والمنصات، والمنافسة على جوائز المهرجانات.',
      featureList: [
        'تأسيس استوديو إنتاج سينمائي وتلفزيوني وتصميم الهوية والشعار',
        'نظام تطوير سيناريو متكامل للأفلام السينمائية والمسلسلات الدرامية',
        'سوق مواهب ضخم يضم أكثر من 100 ممثل وممثلة ووجوه صاعدة جديدة تظهر مع تقدم الزمن',
        'نظام تفاوض واقعي مع المخرجين والنجوم ومديري التصوير والمؤلفين الموسيقيين',
        'محاكاة دقيقة لإيرادات شباك التذاكر للأفلام وعرض حلقات المسلسلات حلقة بحلقة',
        'لوحة متصدرين محلية تنافسية لأغنى وأقوى شركات الإنتاج',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EGP',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2480',
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'ما هي أفضل لعبة إدارة شركات إنتاج سينمائي وتلفزيوني باللغة العربية؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'تُعد لعبة Hyptrix — Cinema & TV Tycoon الخيار الأول والأعمق لمحاكاة إدارة استوديوهات السينما والتلفزيون باللغة العربية، حيث تجمع بين كتابة السيناريو، التفاوض الواقعي مع أكثر من 100 نجم ومخرج، إدارة ميزانيات التصوير والدعاية، ومحاكاة إيرادات شباك التذاكر وعرض المسلسلات حلقة بحلقة.',
          },
        },
        {
          '@type': 'Question',
          name: 'كيف يعمل نظام إنتاج الأفلام والمسلسلات في لعبة Hyptrix؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'يبدأ اللاعب بتحديد نوع العمل (فيلم سينمائي أو مسلسل درامي من عدة حلقات) واختيار التصنيف الدرامي وكتابة السيناريو، ثم يدخل سوق المواهب للتفاوض مع المخرجين والأبطال، وبعد اكتمال التصوير يتم طرح الفيلم في دور العرض أو بث المسلسل حلقة بحلقة مع متابعة نسب المشاهدة وآراء النقاد والجمهور.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} ${readexPro.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#F2F5FF] text-slate-900 antialiased selection:bg-violet-600 selection:text-white"
        style={{
          fontFamily: 'var(--font-readex), system-ui, -apple-system, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
