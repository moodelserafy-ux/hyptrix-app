import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Neelyo — محاكاة السينما والدراما',
    short_name: 'Neelyo',
    description:
      'لعبة Neelyo لمحاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني باللغة العربية: تطوير السيناريو، التفاوض مع أكثر من 180 نجماً ومخرجاً، وإدارة شباك التذاكر ومواسم المسلسلات.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F9F6F0',
    theme_color: '#1A2530',
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
