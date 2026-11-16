import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Hyptrix — Cinema & TV Tycoon',
    short_name: 'Hyptrix',
    description:
      'لعبة محاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني باللغة العربية: تطوير السيناريو، التفاوض مع أكثر من 160 نجماً ومخرجاً، وإدارة شباك التذاكر ومواسم المسلسلات.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#0A0A0C',
    theme_color: '#D4AF37',
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
