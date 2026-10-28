import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The real 'server-only' package throws outside Next's build pipeline; tests run in
      // plain Node, so swap in a no-op for anything that imports it transitively.
      'server-only': path.resolve(__dirname, './src/test/serverOnlyStub.ts'),
    },
  },
});
