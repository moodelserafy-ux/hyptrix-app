import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSize = Number(searchParams.get('size') || 512);
  const size = [192, 512].includes(rawSize) ? rawSize : 512;
  const padding = Math.round(size * 0.11);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 30% 20%, #2B3D4E 0%, #1A2530 58%, #0E151C 100%)',
          padding,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: Math.round(size * 0.2),
            border: `${Math.max(4, Math.round(size * 0.022))}px solid #D4AF37`,
            background:
              'linear-gradient(155deg, rgba(212,175,55,0.18) 0%, rgba(15,23,30,0.92) 60%, rgba(217,22,36,0.22) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          }}
        >
          <div
            style={{
              fontSize: Math.round(size * 0.43),
              fontWeight: 900,
              color: '#D4AF37',
              lineHeight: 0.95,
              letterSpacing: -2,
              textShadow: '0 6px 24px rgba(0,0,0,0.55)',
            }}
          >
            N
          </div>
          <div
            style={{
              marginTop: Math.round(size * 0.025),
              padding: `${Math.round(size * 0.012)}px ${Math.round(size * 0.06)}px`,
              borderRadius: Math.round(size * 0.03),
              background: '#D91624',
              border: `2px solid #D4AF37`,
              fontSize: Math.round(size * 0.088),
              fontWeight: 900,
              color: '#F9F6F0',
              letterSpacing: Math.round(size * 0.016),
            }}
          >
            NEELYO
          </div>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
