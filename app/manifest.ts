import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Hyptrix — Cinema & TV Tycoon',
    short_name: 'Hyptrix',
    description:
      'لعبة محاكاة وإدارة عربية لتأسيس شركة إنتاج سينمائي وتلفزيوني، والتفاوض مع المواهب، وإدارة ميزانيات التصوير والتوزيع والإيرادات.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F2F5FF',
    theme_color: '#6D28D9',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      {
        src: '/api/pwa-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512&maskable=1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
