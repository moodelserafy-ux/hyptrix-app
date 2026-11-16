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

const appUrl = (process.env.APP_URL || 'https://hyptrix.app').replace(/\/$/, '');
const appTitle = 'Hyptrix — Cinema & TV Tycoon';
const appDescription =
  'لعبة محاكاة وإدارة صناعة السينما والتلفزيون باللغة العربية. أسّس شركة إنتاج، طوّر أفلامك ومسلسلاتك، تفاوض مع الممثلين والمخرجين، أدر الميزانيات وقرارات التصوير، اختر التوزيع والمنصات والقنوات، وتابع الإيرادات والمنافسة والجوائز.';

export const metadata: Metadata = {
  metadataBase: new URL(`${appUrl}/`),
  title: {
    default: `${appTitle} | لعبة إدارة استوديو سينمائي وتلفزيوني`,
    template: `%s | ${appTitle}`,
  },
  description: appDescription,
  applicationName: appTitle,
  keywords: [
    'Hyptrix',
    'لعبة إدارة استوديو سينمائي',
    'لعبة محاكاة إنتاج الأفلام',
    'لعبة إدارة إنتاج المسلسلات',
    'محاكاة صناعة السينما والتلفزيون',
    'لعبة مدير شركة إنتاج فني',
    'لعبة شباك التذاكر',
    'لعبة التفاوض مع الممثلين والمخرجين',
    'لعبة إدارة ميزانية التصوير',
    'movie studio management game',
    'cinema tycoon game',
    'TV production simulation',
  ],
  authors: [{ name: 'Hyptrix' }],
  creator: 'Hyptrix',
  publisher: 'Hyptrix',
  manifest: '/manifest.webmanifest',
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
    noarchive: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: `${appTitle} | إمبراطورية إنتاجك السينمائي والتلفزيوني`,
    description: appDescription,
    url: appUrl,
    siteName: appTitle,
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appTitle} | لعبة إدارة استوديو سينمائي وتلفزيوني`,
    description: appDescription,
  },
  category: 'games',
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoGame',
      name: appTitle,
      alternateName: [
        'هايبتريكس: لعبة إدارة استوديو السينما والتلفزيون',
        'Hyptrix Movie and TV Studio Tycoon',
      ],
      url: appUrl,
      inLanguage: ['ar', 'ar-EG'],
      applicationCategory: 'GameApplication',
      genre: ['Simulation', 'Strategy', 'Business Management', 'Tycoon'],
      gamePlatform: ['Web browser', 'Mobile browser', 'Desktop browser'],
      playMode: 'SinglePlayer',
      isAccessibleForFree: true,
      description: appDescription,
      featureList: [
        'تأسيس شركة إنتاج واختيار اسمها وهويتها وشعارها',
        'إنشاء مشروع فيلم سينمائي أو مسلسل تلفزيوني',
        'اختيار التصنيفات الدرامية والتصنيف العمري وموسم العرض',
        'كتابة فكرة المشروع وملخصه بحرية',
        'التفاوض على العقود والأجور ونسب الأرباح مع الممثلين والمخرجين وأفراد الطاقم',
        'اختيار أدوار البطولة والخصم والأدوار المساعدة والظهور الخاص',
        'إدارة ميزانيات الإنتاج ومواقع التصوير والديكور والملابس والمؤثرات',
        'اتخاذ قرارات أثناء التصوير تؤثر في التكلفة والجودة وترقب الجمهور والجدول',
        'اختيار أسواق التوزيع والمنصات الرقمية والقنوات التلفزيونية',
        'محاكاة إيرادات شباك التذاكر أو متابعة بث المسلسل حلقة بحلقة',
        'متابعة المنافسين والأخبار وتطور المواهب والنتائج السنوية',
        'المشاركة في المهرجانات والجوائز ضمن عالم اللعبة',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EGP',
        availability: 'https://schema.org/InStock',
        url: appUrl,
      },
    },
    {
      '@type': 'WebSite',
      name: appTitle,
      url: appUrl,
      inLanguage: 'ar-EG',
      description: appDescription,
    },

  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar-EG" dir="rtl" className={`${alexandria.variable} ${readexPro.variable}`}>
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
