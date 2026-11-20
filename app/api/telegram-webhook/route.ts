import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestSiteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  const siteUrl = resolveRequestSiteUrl(req.headers);
  return NextResponse.json({
    ok: true,
    webhook: 'telegram-webhook',
    launchUrl: siteUrl,
    botConfigured: Boolean(
      process.env.TELEGRAM_BOT_TOKEN &&
        !process.env.TELEGRAM_BOT_TOKEN.includes('your-telegram-bot-token')
    ),
  });
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token.includes('your-telegram-bot-token')) {
    return NextResponse.json(
      { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' },
      { status: 500 }
    );
  }

  try {
    const siteUrl = resolveRequestSiteUrl(req.headers);
    const update = await req.json();
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string =
      typeof message?.text === 'string' ? message.text.trim() : '';

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    let launchUrl = siteUrl;
    const refMatch = text.match(/^\/start(?:@\w+)?\s+ref_([A-Za-z0-9_-]+)/);
    if (refMatch?.[1]) {
      launchUrl = `${siteUrl}/?ref=${encodeURIComponent(refMatch[1])}`;
    }

    const userLangCode = String(message?.from?.language_code || '').toLowerCase();
    const isArabicUser = userLangCode.startsWith('ar');

    const rawFirstName =
      typeof message?.from?.first_name === 'string' &&
      message.from.first_name.trim()
        ? message.from.first_name.trim()
        : isArabicUser
        ? 'يا بطل'
        : 'Producer';
    const safeFirstName = escapeHtml(rawFirstName);

    const welcomeText = isArabicUser
      ? `أهلاً بك ${safeFirstName} في عالم 🎬 <b>Neelyo Tycoon</b>!\n\nأسّس شركة إنتاجك السينمائي والدرامي في مصر أو السعودية، تفاوض مع النجوم، وتصدّر شباك التذاكر وموسم الجوائز 🏆\n\nاضغط على الزر بالأسفل لفتح مكتب الإمبراطور فوراً 👇`
      : `Welcome, ${safeFirstName}, to 🎬 <b>Neelyo Tycoon</b>!\n\nFound your own cinema & TV production empire, sign A-list stars and directors, dominate the box office, and sweep the annual awards 🏆\n\nTap below to open your Studio Desk right now 👇`;

    const buttonLabel = isArabicUser
      ? '🎬 العب Neelyo الآن'
      : '🎬 Play Neelyo Now';

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: buttonLabel,
                web_app: { url: launchUrl },
              },
            ],
          ],
        },
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
