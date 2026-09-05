import type { NextConfig } from 'next';

const nextConfig: NextConfig =
  process.env.PAPERSTRIKE_TARGET === 'vercel' ? { output: 'export' } : {};

export default nextConfig;
