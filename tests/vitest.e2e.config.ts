import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Black-box tests against a running stack (`npm run dev` in another terminal).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['e2e/**/*.test.ts'], testTimeout: 15_000 },
});
