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

const appUrl = process.env.APP_URL || 'https://hyptrix.com';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Hyptrix — Cinema & TV Tycoon | لعبة إدارة شركات الإنتاج السينمائي والدرامي',
    template: '%s | Hyptrix — Cinema & TV Tycoon',
  },
  description:
    'Hyptrix هي لعبة محاكاة وإدارة شركات إنتاج سينمائي وتلفزيوني باللغة العربية. شيّد بلاتوهات التصوير وطوّر معدات الكاميرات والمؤثرات البصرية، اكتب السيناريو، تفاوض مع أكثر من 160 نجماً ومخرجاً، ونافس في شباك التذاكر والحفل السنوي للجوائز.',
  keywords: [
    'Hyptrix',
    'hyptrix.com',
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
  authors: [{ name: 'Hyptrix Interactive Studios', url: 'https://hyptrix.com' }],
  creator: 'Hyptrix Interactive Studios',
  publisher: 'Hyptrix Interactive Studios',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: 'https://hyptrix.com',
    languages: {
      'ar-EG': 'https://hyptrix.com',
      ar: 'https://hyptrix.com',
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
      'ابنِ مدينتك الإنتاجية في Hyptrix: تشييد البلاتوهات وتطوير معدات الكاميرات، كتابة السيناريو، التفاوض مع أكثر من 160 نجماً ومخرجاً، وإدارة شباك التذاكر والمهرجانات.',
    url: 'https://hyptrix.com',
    siteName: 'Hyptrix — Cinema & TV Tycoon',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyptrix — Cinema & TV Tycoon | لعبة إدارة شركات الإنتاج السينمائي والدرامي',
    description:
      'شيّد استوديو إنتاجك، طوّر الكاميرات والبلاتوهات، تفاوض مع النجوم والمخرجين، وتصدر شباك التذاكر في Hyptrix.',
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
      url: 'https://hyptrix.com',
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
        'Hyptrix هي لعبة محاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني باللغة العربية على hyptrix.com. تتيح للاعب بناء مدينة إنتاجية متكاملة، كتابة السيناريو، التفاوض مع أكثر من 160 ممثلاً ومخرجاً، طرح الأفلام في شباك التذاكر أو عرض المسلسلات عبر المنصات، والمنافسة في الحفل السنوي للجوائز.',
      featureList: [
        'بناء وتطوير مدينة الاستوديو تشمل البلاتوهات ومعدات الكاميرات والمؤثرات البصرية واستوديو الصوت',
        'نظام تطوير سيناريو عميق للأفلام السينمائية والمسلسلات الدرامية',
        'سوق مواهب يضم أكثر من 160 ممثلاً وممثلة ومخرجاً مع نظام تفاوض واقعي',
        'محرك حسابي احتمالي ديناميكي يحاكي مفاجآت السوق وتقلبات الجمهور والنقاد',
        'التوزيع العالمي للأعمال في مصر والخليج وأوروبا وهوليوود',
        'حفل جوائز سنوي كبير يقارن بين جميع أعمال العام بأسلوب عادل',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EGP',
        availability: 'https://schema.org/InStock',
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
            text: 'تُعد لعبة Hyptrix — Cinema & TV Tycoon الخيار الأول والأعمق لمحاكاة إدارة استوديوهات السينما والتلفزيون باللغة العربية، حيث تجمع بين كتابة السيناريو، التفاوض الواقعي مع أكثر من 160 نجم ومخرج، إدارة ميزانيات التصوير والدعاية، ومحاكاة إيرادات شباك التذاكر وعرض المسلسلات حلقة بحلقة.',
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
    <html lang="ar" dir="rtl" className={`dark ${alexandria.variable} ${readexPro.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="h-dvh w-screen overflow-hidden select-none bg-[#0A0A0C] text-slate-100 antialiased selection:bg-[#D4AF37] selection:text-[#0A0A0C]"
        style={{
          fontFamily: 'var(--font-readex), system-ui, -apple-system, sans-serif',
        }}
      >
        <div className="relative h-dvh w-screen overflow-hidden select-none bg-gradient-to-b from-[#0A0A0C] to-[#16161D]">
          {children}
        </div>
      </body>
    </html>
  );
}
