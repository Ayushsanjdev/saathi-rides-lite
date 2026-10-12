import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  distDir: process.env.SAATHI_NEXT_DIST_DIR || '.next',
  devIndicators: process.env.SAATHI_NEXT_DIST_DIR ? false : undefined,
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  transpilePackages: ['@saathi/contracts','@saathi/core'],
  output: 'standalone',
};
export default config;
