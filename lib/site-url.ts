const DEFAULT_SITE_URL = 'https://neelyo.vercel.app';

const PLACEHOLDER_TOKENS = [
  'my_app_url',
  'your-domain',
  'your-project',
  'example.com',
];

function isInternalOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '[::1]'
  );
}

function normalizeCandidateUrl(
  raw?: string | null,
  options?: { allowLocalhost?: boolean }
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_TOKENS.some((token) => lower.includes(token))) {
    return null;
  }

  const withProtocol =
    lower.startsWith('http://') || lower.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!options?.allowLocalhost && isInternalOrLocalHost(parsed.hostname)) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves the canonical site origin dynamically across AI Studio (Cloud Run),
 * Vercel production/preview deployments, custom domains (e.g. neelyo.com),
 * and browser runtime — with zero hardcoded environment URLs.
 */
export function getSiteUrl(): string {
  const envCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of envCandidates) {
    const normalized = normalizeCandidateUrl(raw);
    if (normalized) return normalized;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const browserOrigin = normalizeCandidateUrl(window.location.origin, {
      allowLocalhost: true,
    });
    if (browserOrigin) return browserOrigin;
  }

  return DEFAULT_SITE_URL;
}

/**
 * Server-side request-aware URL resolver for metadata, sitemap, robots.txt,
 * and llms.txt routes. Respects explicit production env vars first, then
 * inspects incoming `x-forwarded-host` / `host` headers so custom domains work
 * automatically even with zero environment variables configured.
 */
export function resolveRequestSiteUrl(
  reqHeaders?: { get(name: string): string | null } | null
): string {
  const explicitEnvCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  for (const raw of explicitEnvCandidates) {
    const normalized = normalizeCandidateUrl(raw);
    if (normalized) return normalized;
  }

  if (reqHeaders) {
    const forwardedHost = reqHeaders
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim();
    const rawHost = forwardedHost || reqHeaders.get('host')?.trim() || '';
    if (rawHost) {
      const forwardedProto = reqHeaders
        .get('x-forwarded-proto')
        ?.split(',')[0]
        ?.trim();
      const proto =
        forwardedProto === 'http' || forwardedProto === 'https'
          ? forwardedProto
          : 'https';
      const normalizedFromHeader = normalizeCandidateUrl(`${proto}://${rawHost}`);
      if (normalizedFromHeader) return normalizedFromHeader;
    }
  }

  return getSiteUrl();
}
