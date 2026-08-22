import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';
import path from 'path';

import {
  readCommercialEditionVersion,
  readSiresEditionVersion,
} from './scripts/readProductVersion';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siresChangelogPath = path.resolve(__dirname, '../backend/CHANGELOG-SIRES.md');
const commercialChangelogPath = path.resolve(__dirname, '../backend/CHANGELOG-RAMAZZINI.md');
const siresVersion = readSiresEditionVersion(siresChangelogPath);
const commercialVersion = readCommercialEditionVersion(commercialChangelogPath);

export default defineConfig({
  define: {
    __APP_VERSION_SIRES__: JSON.stringify(siresVersion),
    __APP_VERSION_COMMERCIAL__: JSON.stringify(commercialVersion),
  },
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
