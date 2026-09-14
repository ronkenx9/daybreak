import type { MetadataRoute } from 'next';

const SITE = 'https://www.daybreakcircles.lol';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-09-14T00:00:00.000Z');
  return [
    { url: SITE, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/stats`, lastModified, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE}/thesis`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/references`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
