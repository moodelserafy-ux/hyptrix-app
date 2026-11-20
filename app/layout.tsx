import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import {
  Cairo,
  Lalezar,
  Aref_Ruqaa,
  Courier_Prime,
} from 'next/font/google';
import { resolveRequestSiteUrl } from '@/lib/site-url';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const changa = Lalezar({
  subsets: ['arabic', 'latin'],
  weight: ['400'],
  variable: '--font-changa',
  display: 'swap',
});

const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-ruqaa',
  display: 'swap',
});

const spaceMono = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1A2530',
};

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = resolveRequestSiteUrl(await headers());

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'Neelyo | Cinema & TV Production Studio Tycoon Game',
      template: '%s | Neelyo',
    },
    description:
      'Build and run your own film and television production empire in Neelyo. Write scripts, negotiate with 180+ stars and directors, manage on-set crises, dominate the box office & streaming platforms, and sweep annual awards.',
    applicationName: 'Neelyo',
    keywords: [
      'Neelyo',
      'Neelyo Cinema & TV Tycoon',
      'Movie Studio Tycoon Game',
      'Film Production Simulation Game',
      'TV Series Tycoon Game',
      'Box Office Strategy Game',
      'Cinema Management Browser Game',
      'Telegram Mini App Tycoon Game',
      'AI Film Studio Simulator',
      'Actor Negotiation Game',
      'نيليو',
      'لعبة إدارة استوديو سينمائي',
      'لعبة إنتاج أفلام ومسلسلات',
      'محاكاة شباك التذاكر ودراما رمضان',
    ],
    authors: [{ name: 'Neelyo Studio' }],
    creator: 'Neelyo',
    publisher: 'Neelyo',
    category: 'Simulation Game',
    classification: 'Business & Entertainment Studio Tycoon Simulation Game',
    alternates: {
      canonical: '/',
      languages: {
        en: '/',
        'en-US': '/',
        ar: '/',
        'ar-EG': '/',
      },
    },
    icons: {
      icon: [
        { url: '/favicon.png', sizes: '96x96', type: 'image/png' },
        { url: '/images/neelyo-icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/images/neelyo-icon.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcut: ['/favicon.png'],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['ar_EG', 'ar_SA'],
      url: siteUrl,
      siteName: 'Neelyo',
      title: 'Neelyo | Cinema & TV Production Studio Tycoon',
      description:
        'Found your own movie & TV production studio in Neelyo. Write scripts, negotiate with 180+ stars & directors, handle on-set crises, conquer regional & global box offices, and win annual festival awards.',
      images: [
        {
          url: `${siteUrl}/images/neelyo-og.png`,
          width: 1200,
          height: 630,
          alt: 'Neelyo — Cinema & TV Production Studio Tycoon Game',
        },
        {
          url: `${siteUrl}/images/neelyo-icon.png`,
          width: 512,
          height: 512,
          alt: 'Neelyo Logo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Neelyo | Cinema & TV Production Studio Tycoon',
      description:
        'Lead a full-scale cinema & TV studio in Neelyo: write screenplays, negotiate contracts with 180+ stars and directors, manage shoots, sign streaming deals, and top the global box office.',
      images: [`${siteUrl}/images/neelyo-og.png`],
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    other: {
      'llms-txt': `${siteUrl}/llms.txt`,
      'llms-full-txt': `${siteUrl}/llms-full.txt`,
      'ai-crawl-policy': 'allow-all',
      'geo-entity-name': 'Neelyo (Cinema & TV Tycoon)',
      'geo-entity-type': 'VideoGame, WebApplication, SimulationGame',
      'geo-language': 'en, en-US, ar, ar-EG',
      'geo-domain': 'Cinema & Television Production Studio Management Simulation',
      'geo-core-features':
        'Studio founding, film & TV scriptwriting, contract negotiations with 180+ actors and 1-2 directors, 2-3 day agent response windows, on-set crisis management, regional & global theatrical/streaming distribution, daily box office & viewership races, Star Forge 99 OVR custom talent creator, and automatic annual awards galas.',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteUrl = resolveRequestSiteUrl(await headers());
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['VideoGame', 'WebApplication', 'SoftwareApplication'],
        '@id': `${siteUrl}/#game`,
        name: 'Neelyo',
        alternateName: [
          'Neelyo — Cinema & TV Tycoon',
          'Neelyo Movie & TV Studio Simulator',
          'نيليو — لعبة محاكاة الإنتاج السينمائي والدرامي',
        ],
        url: siteUrl,
        image: `${siteUrl}/images/neelyo-og.png`,
        inLanguage: ['en', 'ar', 'ar-EG'],
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Business & Cinema Studio Tycoon Simulation',
        genre: [
          'Simulation',
          'Strategy',
          'Business Tycoon',
          'Entertainment Management',
          'Role Playing',
        ],
        playMode: 'SinglePlayer',
        operatingSystem:
          'Any Web Browser (iOS, Android, Telegram Mini App, Windows, macOS, Linux)',
        isAccessibleForFree: true,
        abstract:
          'Neelyo is an AI-powered cinema and television studio tycoon simulation available in English and Arabic. Step into the founder’s chair to produce films and series, negotiate contracts with stars and directors, manage budgets and on-set crises, and compete for box office supremacy and annual festival awards.',
        description:
          'Neelyo is a comprehensive strategic business simulation game in English and Arabic that puts you in charge of your own film and television production empire. Craft studio identity, greenlight movies or 7–30 episode series, negotiate multi-day contracts with 180+ actors, 1–2 directors, cinematographers, composers, and editors, balance set design and VFX budgets, resolve live production crises, license streaming and broadcast rights, expand across regional and global markets, and compete at annual awards ceremonies.',
        featureList: [
          'Found your cinema & TV studio with 75M starting capital, custom royal emblem, and a strategic founder perk',
          'Two distinct production tracks: theatrical feature films (box office revenue & screen count) and TV series from 7 to 30 episodes (million-viewer ratings, streaming & broadcast deals)',
          'Deep talent roster of 180+ S/A/B/C-tier stars plus AI-discovered rising talents emerging dynamically over time',
          'Flexible directing system supporting 1 or 2 co-directors per project with realistic agent negotiations',
          'Multi-day contract negotiation system (2–3 in-game days) weighing role billing, star tier, ego, genre fit, script quality, fee, and backend profit share',
          'The Star Forge: custom casting studio to build your own exclusive actor or actress up to a legendary 99 OVR Diamond Card',
          'Live daily box-office & episode viewership tracking against rival studios',
          'Multi-market expansion across Egypt, Saudi Arabia & Gulf, European Festivals, and Worldwide Hollywood distribution',
          'Automatic annual awards gala at the close of every calendar year',
        ],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Neelyo Studio',
          email: 'neelyotycoon@gmail.com',
          url: siteUrl,
          logo: `${siteUrl}/images/neelyo-icon.png`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${siteUrl}/#stages`,
        name: 'Six Stages of Cinema & TV Production in Neelyo',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Studio Founding & Executive Identity',
            description:
              'Choose your studio name, CEO identity, emblem, market world, and strategic founder perk.',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Project Setup & Scriptwriting',
            description:
              'Select film or TV series format, episode count, release window, age rating, dual genres, title, and synopsis.',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Crew Hiring, Star Casting & Budget Allocation',
            description:
              'Sign 1–2 directors, cinematographer, composer, editor, and negotiate with 180+ actors while allocating set, costume, and VFX budgets.',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'Principal Photography & On-Set Crises',
            description:
              'Navigate live shooting days and decisive on-set dilemmas that impact critical quality, hype, and budget.',
          },
          {
            '@type': 'ListItem',
            position: 5,
            name: 'Marketing, Platforms & Box Office Tracking',
            description:
              'Book theater screens, close streaming and satellite broadcast deals, expand internationally, and track daily box office and viewership.',
          },
          {
            '@type': 'ListItem',
            position: 6,
            name: 'Annual Awards Galas & Studio Rankings',
            description:
              'Compete each year-end at prestigious cinema festivals and climb the global studio market-value leaderboard.',
          },
        ],
      },
      {
        '@type': 'HowTo',
        '@id': `${siteUrl}/#howto`,
        name: 'How to Build a Box-Office Film & TV Empire in Neelyo',
        description:
          'Step-by-step guide to founding your studio, negotiating blockbuster casts, dominating box office and streaming charts, and sweeping annual awards.',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Found Your Studio & Choose a Founder Perk',
            text: 'Name your studio and CEO, customize your crest, and select a founder perk (Visionary Director for higher critic scores, Marketing Shark for opening-weekend surges, or Tough Negotiator for lower talent fees).',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Greenlight & Write Your Screenplay',
            text: 'Pick a feature film or a 7/10/15/30-episode TV series, choose the release season and age rating, combine primary and secondary genres, and write your title and story synopsis.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Negotiate with Directors, Crew & Stars',
            text: 'Contract 1–2 directors plus key department heads, then send tailored offers to actors specifying role size, fee, and backend percentage; agents respond within 2–3 in-game days.',
          },
          {
            '@type': 'HowToStep',
            position: 4,
            name: 'Direct Production & Close Distribution Deals',
            text: 'Balance production budgets across sets, costumes, and VFX, resolve live on-set crises, and lock in theatrical screens, streaming platforms, satellite channels, and international distribution territories.',
          },
          {
            '@type': 'HowToStep',
            position: 5,
            name: 'Release & Sweep the Annual Awards',
            text: 'Track daily box-office totals or episode-by-episode viewership through live press dispatches, then compete automatically in the year-end Awards Gala.',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteUrl}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Neelyo (Cinema & TV Studio Tycoon)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Neelyo is a strategic business and entertainment simulation game playable in English and Arabic directly in the browser or Telegram Mini App. You found and manage a cinema & TV production company, write scripts, negotiate with 180+ actors and directors, manage budgets and shoots, and compete for box office records and annual awards.',
            },
          },
          {
            '@type': 'Question',
            name: 'How many directors can be hired for a single production?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You can sign 1 or up to 2 co-directors per project. Once 2 directors are locked in, additional director hiring locks automatically to keep creative vision balanced.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do stars and directors decide whether to accept or reject an offer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Talent agents review offers over 2–3 in-game days, weighing role billing (Solo Lead, Co-Lead, Villain, Supporting, or Cameo) against the star’s tier (S/A/B/C), ego, overall rating, genre fit, script quality, studio reputation, director prestige, cash fee, and backend profit share.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the difference between producing a Feature Film and a TV Series?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Feature films release in cinema seasons and are measured by theatrical box-office gross and screen counts over a 10-day run, whereas TV series span 7, 10, 15, or 30 episodes and earn through streaming licenses, satellite broadcasts, and million-viewer ratings episode by episode.',
            },
          },
          {
            '@type': 'Question',
            name: 'What happens to the game clock when a popup opens or I leave the tab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The simulation clock pauses automatically whenever any modal, contract response, breaking news dispatch, or awards gala appears—and whenever you switch tabs—resuming seamlessly as soon as you return.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which distribution markets can my studio unlock?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Your studio starts in its home market (Egypt or Saudi Arabia) and can unlock regional Gulf/Egypt expansion (+45% gross), European Festival distribution (+35% gross), and Worldwide Hollywood distribution (+80% gross).',
            },
          },
          {
            '@type': 'Question',
            name: 'When does the Annual Awards Gala take place?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Annual Awards Gala triggers automatically at the close of every calendar year (Day 120), pitting all films and series released that year against rival studios across major festival categories.',
            },
          },
        ],
      },
    ],
  };

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${cairo.variable} ${changa.variable} ${arefRuqaa.variable} ${spaceMono.variable}`}
    >
      <head>
        <link rel="llms" href="/llms.txt" />
        <link rel="llms-full" href="/llms-full.txt" />
        <link rel="author" href="/about-us" />
        {/* Telegram Mini App WebApp SDK (graceful no-op outside Telegram) */}
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          defer
        />
        {/* Monetag Rewarded Interstitial SDK (disabled during AdsGram review; enable via NEXT_PUBLIC_ENABLE_MONETAG=true) */}
        {process.env.NEXT_PUBLIC_ENABLE_MONETAG === 'true' && (
          <script
            src="https://libtl.com/sdk.js"
            data-zone="12307661"
            data-sdk="show_12307661"
            async
          />
        )}
        {/* AdsGram Rewarded Video SDK (Block ID 60901) */}
        <script
          src="https://sad.adsgram.ai/js/sad.min.js"
          async
        />
      </head>
      <body className="min-h-dvh w-full overflow-x-hidden bg-[#F9F6F0] text-[#1A2530] antialiased selection:bg-[#D91624] selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Semantic SSR Knowledge Graph for Search Engines & AI Agents (zero fabricated ratings) */}
        <aside
          className="sr-only"
          aria-label="Neelyo Official Reference Overview for Search Engines and AI Agents"
        >
          <h1>
            Neelyo — AI-Powered Cinema &amp; Television Studio Tycoon Simulation Game
          </h1>
          <p>
            Neelyo is a bilingual (English &amp; Arabic) strategic cinema and television production tycoon game where you found and lead your own studio starting with 75M virtual capital. Powered by dynamic AI storytelling, the world evolves continuously with rising actors, rival studios, script evaluations, multi-day contract negotiations, on-set crises, PR trend wars, theatrical box-office races, streaming contracts, and annual awards ceremonies.
          </p>
          <h2>The Star Forge (99 OVR Diamond Card Creator)</h2>
          <p>
            Right on the Executive Desk sits the confidential crimson dossier sealed with two golden locks, unlocking the Star Forge casting booth where players sculpt an exclusive male or female box-office star from scratch—uploading a custom portrait or monogram and distributing six core attributes up to a legendary 99 OVR rating.
          </p>
          <p>Official Contact: neelyotycoon@gmail.com</p>
          <nav aria-label="About and Legal Documentation Links">
            <a href="/about-us">
              About Us, Privacy Policy &amp; Terms of Use — Neelyo
            </a>
            <a href="/llms.txt">Quick Reference Documentation (llms.txt)</a>
            <a href="/llms-full.txt">Complete Neelyo Encyclopedia (llms-full.txt)</a>
          </nav>
        </aside>

        <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#F9F6F0] text-[#1A2530]">
          {children}
        </div>
      </body>
    </html>
  );
}
