import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/scan', '/privacy', '/terms'],
        disallow: ['/admin', '/dashboard', '/report/', '/api/'],
      },
    ],
    sitemap: 'https://www.devguardia.cloud/sitemap.xml',
  };
}
