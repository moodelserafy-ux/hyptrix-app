import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolveRequestSiteUrl } from '@/lib/site-url';
import AboutUsContent from '@/components/AboutUsContent';

const OFFICIAL_EMAIL = 'neelyotycoon@gmail.com';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = resolveRequestSiteUrl(await headers());

  return {
    title: 'About Us, Privacy Policy & Terms of Use',
    description:
      'Official overview, privacy policy, terms of use, and contact details for Neelyo — the AI-powered Cinema & TV Production Studio Tycoon simulation game.',
    alternates: {
      canonical: `${siteUrl}/about-us`,
      languages: {
        en: `${siteUrl}/about-us`,
        ar: `${siteUrl}/about-us`,
      },
    },
    openGraph: {
      title: 'About Us, Privacy Policy & Terms of Use | Neelyo',
      description:
        'Official overview, privacy policy, terms of use, and contact details for Neelyo — Cinema & TV Production Studio Tycoon.',
      url: `${siteUrl}/about-us`,
      siteName: 'Neelyo',
      locale: 'en_US',
      alternateLocale: ['ar_EG', 'ar_SA'],
      images: [
        {
          url: `${siteUrl}/images/neelyo-og.png`,
          width: 1200,
          height: 630,
          alt: 'Neelyo — Cinema & TV Production Studio Tycoon',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'About Us & Legal | Neelyo',
      description:
        'Official overview, privacy policy, and terms of use for Neelyo — Cinema & TV Production Studio Tycoon.',
      images: [`${siteUrl}/images/neelyo-og.png`],
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
}

export default async function AboutUsPage() {
  const siteUrl = resolveRequestSiteUrl(await headers());
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${siteUrl}/about-us#about`,
    url: `${siteUrl}/about-us`,
    name: 'About Us, Privacy Policy & Terms of Use — Neelyo',
    inLanguage: ['en', 'ar', 'ar-EG'],
    description:
      'Official overview and legal documentation for Neelyo, an AI-powered cinema and television production studio tycoon simulation game.',
    mainEntity: {
      '@type': 'VideoGame',
      name: 'Neelyo',
      alternateName: 'Neelyo — Cinema & TV Tycoon',
      url: siteUrl,
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
        'Business Simulation Game',
      ],
      author: {
        '@type': 'Organization',
        name: 'Neelyo Studio',
        email: OFFICIAL_EMAIL,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutUsContent />
    </>
  );
}
