/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://sdk.mercadopago.com https://http2.mlstatic.com https://static.cloudflareinsights.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.devguardia.cloud https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://api.mercadopago.com https://sdk.mercadopago.com https://http2.mlstatic.com https://*.mercadolibre.com https://api.mercadolibre.com https://vercel.live",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.googleapis.com https://*.mercadopago.com https://*.mercadolibre.com https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
