import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveRequestSiteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = resolveRequestSiteUrl(await headers());

  return {
    rules: [
      {
        userAgent: [
          '*',
          'Googlebot',
          'Bingbot',
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
          'Applebot',
          'Applebot-Extended',
          'FacebookBot',
          'Meta-ExternalAgent',
          'Meta-ExternalFetcher',
          'Amazonbot',
          'YouBot',
          'DuckAssistBot',
          'cohere-ai',
          'CCBot',
        ],
        allow: ['/', '/about-us', '/llms.txt', '/llms-full.txt'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
