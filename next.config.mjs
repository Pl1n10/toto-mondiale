/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slice #9: emit a self-contained server bundle (.next/standalone) so the
  // Docker image can run `node server.js` with a minimal node_modules.
  output: 'standalone',
};

export default nextConfig;
