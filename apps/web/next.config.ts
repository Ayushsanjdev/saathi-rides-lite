import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  transpilePackages: ['@saathi/contracts'],
  output: 'standalone',
};
export default config;
