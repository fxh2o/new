/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' https://raw.githubusercontent.com; style-src 'self' 'unsafe-inline' https://raw.githubusercontent.com; img-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' https:; frame-src 'self' https:; media-src 'self' https: blob:;" },
      ],
    }];
  },
};

module.exports = nextConfig;
