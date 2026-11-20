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
    background_color: '#0D1824',
    theme_color: '#0D1824',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      {
        src: '/images/neelyo-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/neelyo-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/neelyo-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
