import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.APP_URL ||
  'https://ais-pre-rocpe6ymx4aaq2syvt4glo-1004117229529.europe-west2.run.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          ar: APP_URL,
          'ar-EG': APP_URL,
        },
      },
    },
    {
      url: `${APP_URL}/about-us`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.98,
    },
    {
      url: `${APP_URL}/llms.txt`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${APP_URL}/llms-full.txt`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
  ];
}
