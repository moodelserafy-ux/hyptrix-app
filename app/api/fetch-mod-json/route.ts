import { NextRequest, NextResponse } from 'next/server';
import { validateCustomDatabase } from '@/lib/db-resolver';
import type { WorldMarketId } from '@/lib/market-profiles';

const MAX_MOD_BYTES = 4 * 1024 * 1024; // 4 MB safety cap

const MAX_REDIRECT_HOPS = 3;

function isPrivateIpv4(a: number, b: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
    (a === 169 && b === 254) || // Link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !lower ||
    lower === 'localhost' ||
    lower === 'metadata' ||
    lower === 'metadata.google.internal' ||
    lower === '::1' ||
    lower === '::' ||
    lower === '0:0:0:0:0:0:0:1' ||
    lower === '0:0:0:0:0:0:0:0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost')
  ) {
    return true;
  }

  // Block IPv4 loopback, private RFC1918, CGNAT, and link-local / cloud metadata ranges
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return isPrivateIpv4(Number(ipv4Match[1]), Number(ipv4Match[2]));
  }

  // Block IPv6 ULA (fc00::/7), link-local (fe80::/10), multicast (ff00::/8),
  // and IPv4-mapped IPv6 addresses (::ffff:...)
  if (lower.includes(':')) {
    if (
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('ff') ||
      lower.startsWith('::ffff:') ||
      lower.startsWith('0:0:0:0:0:ffff:')
    ) {
      return true;
    }
  }

  return false;
}

function validateRemoteModUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'صيغة الرابط غير صالحة. تأكد من بدئه بـ https://' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'يُسمح فقط بروابط HTTPS الآمنة لتحميل حزم البيانات.' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'الروابط التي تحتوي على بيانات اعتماد مضمّنة غير مسموح بها.' };
  }

  if (isBlockedHostname(parsed.hostname)) {
    return { ok: false, error: 'هذا النطاق غير مسموح به.' };
  }

  if (
    parsed.hostname === 't.me' ||
    parsed.hostname.endsWith('.t.me') ||
    parsed.hostname === 'telegram.me'
  ) {
    return {
      ok: false,
      error:
        'روابط منشورات تيليجرام ليست ملفات JSON خام. استخدم رابطاً مباشراً من GitHub Raw أو jsDelivr أو Cloudflare Pages، أو قم بتنزيل الملف ثم رفعه من جهازك عبر زر "رفع ملف المود (.json)".',
    };
  }

  return { ok: true, url: parsed };
}

function normalizeExternalModUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  // Convert standard GitHub blob page -> raw.githubusercontent.com
  if (parsed.hostname === 'github.com') {
    const blobMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (blobMatch) {
      return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`;
    }
  }

  // Convert Google Drive share link -> direct download URL
  if (parsed.hostname === 'drive.google.com') {
    const fileIdMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    const queryId = parsed.searchParams.get('id');
    const fileId = fileIdMatch?.[1] || queryId;
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    }
  }

  // Convert Dropbox share link to direct raw download
  if (parsed.hostname.endsWith('dropbox.com')) {
    parsed.searchParams.set('dl', '1');
    return parsed.toString();
  }

  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      expectedMarket?: WorldMarketId;
    };
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    const expectedMarket = body?.expectedMarket;

    if (!rawUrl) {
      return NextResponse.json(
        { ok: false, error: 'يرجى إدخال رابط حزمة بيانات صالح.' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeExternalModUrl(rawUrl);
    const initialValidation = validateRemoteModUrl(normalizedUrl);
    if (!initialValidation.ok) {
      return NextResponse.json(
        { ok: false, error: initialValidation.error },
        { status: 400 }
      );
    }

    let currentUrl = initialValidation.url.toString();
    let response: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
          'User-Agent': 'NeelyoModLoader/1.0',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return NextResponse.json(
            { ok: false, error: 'أعاد الخادم تحويلاً غير مكتمل بدون وجهة.' },
            { status: 502 }
          );
        }
        if (hop === MAX_REDIRECT_HOPS) {
          return NextResponse.json(
            { ok: false, error: 'تجاوز الرابط الحد الأقصى المسموح به من التحويلات.' },
            { status: 400 }
          );
        }
        let nextResolved: string;
        try {
          nextResolved = new URL(location, currentUrl).toString();
        } catch {
          return NextResponse.json(
            { ok: false, error: 'وجهة التحويل غير صالحة.' },
            { status: 400 }
          );
        }
        const hopValidation = validateRemoteModUrl(nextResolved);
        if (!hopValidation.ok) {
          return NextResponse.json(
            { ok: false, error: hopValidation.error },
            { status: 400 }
          );
        }
        currentUrl = hopValidation.url.toString();
        continue;
      }

      response = res;
      break;
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `تعذر جلب الملف من الخادم الخارجي (رمز الحالة HTTP ${response?.status ?? 502}). تأكد أن الرابط عام ومباشر.`,
        },
        { status: 502 }
      );
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_MOD_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'حجم ملف الحزمة يتجاوز الحد المسموح به (4 ميجابايت).' },
        { status: 413 }
      );
    }

    const rawText = await response.text();
    if (rawText.length > MAX_MOD_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'حجم ملف الحزمة يتجاوز الحد المسموح به (4 ميجابايت).' },
        { status: 413 }
      );
    }

    const trimmedText = rawText.trim();
    if (trimmedText.startsWith('<')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'الرابط يعيد صفحة ويب HTML وليس ملف JSON خام! استخدم رابطاً مباشراً (مثل GitHub Raw أو jsDelivr أو Cloudflare Pages) أو ارفع الملف من جهازك.',
        },
        { status: 422 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(trimmedText);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'محتوى الرابط ليس ملف JSON سليم. راجع صيغة الملف قبل التفعيل.',
        },
        { status: 422 }
      );
    }

    const validation = validateCustomDatabase(parsedJson, expectedMarket);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { ok: false, error: validation.error || 'ملف الحزمة غير متوافق مع اللعبة.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      normalizedUrl,
      data: validation.data,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout
          ? 'انتهت مهلة الاتصال بالرابط الخارجي. جرب رابطاً أسرع (GitHub Raw / jsDelivr / Cloudflare Pages) أو ارفع الملف من جهازك.'
          : 'تعذر تحميل الرابط المباشر. تأكد من صحة الرابط أو ارفع ملف JSON مباشرة من جهازك.',
      },
      { status: 500 }
    );
  }
}
