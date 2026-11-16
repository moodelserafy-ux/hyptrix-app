import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.APP_URL || 'https://hyptrix.app').replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Claude-User',
          'GPTBot',
          'Bytespider',
        ],
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
