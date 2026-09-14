import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/stats', '/thesis', '/references'], disallow: ['/api/', '/app/'] },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ClaudeBot'], allow: ['/', '/llms.txt', '/stats', '/thesis', '/references'] },
    ],
    sitemap: 'https://www.daybreakcircles.lol/sitemap.xml',
    host: 'https://www.daybreakcircles.lol',
  };
}
