import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = parseInt(searchParams.get('size') || '512', 10);
  const validSize = [180, 192, 512].includes(size) ? size : 512;

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
          background: 'linear-gradient(135deg, #0A0A0C 0%, #16161D 100%)',
          border: '12px solid #D4AF37',
          borderRadius: validSize === 180 ? '0px' : '64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
            fontSize: validSize * 0.42,
            fontWeight: 900,
            letterSpacing: '-0.05em',
          }}
        >
          H
        </div>
        <div
          style={{
            color: '#E50914',
            fontSize: validSize * 0.11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            marginTop: -12,
          }}
        >
          HYPTRIX
        </div>
      </div>
    ),
    {
      width: validSize,
      height: validSize,
    }
  );
}
