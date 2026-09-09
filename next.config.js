/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/', destination: '/index.html' }];
  },
};

module.exports = nextConfig;
