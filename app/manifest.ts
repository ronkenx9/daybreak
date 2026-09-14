import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daybreak',
    short_name: 'Daybreak',
    description: 'Tokenized stocks find their people.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#f7f7f2',
    theme_color: '#0210ef',
    icons: [{ src: '/assets/daybreak-icon-v2.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
