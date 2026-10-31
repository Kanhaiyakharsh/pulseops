import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Fast, dependency-free tests (no running stack needed).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['unit/**/*.test.ts'] },
});
