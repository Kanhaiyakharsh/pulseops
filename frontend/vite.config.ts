import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// The repo-root .env is shared by the backend, Docker Compose and this app.
const envDir = resolve(import.meta.dirname, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  const apiTarget = env.API_PROXY_TARGET ?? `http://localhost:${env.PORT ?? '4000'}`;
  const proxy = { '/api': { target: apiTarget, changeOrigin: true } };

  return {
    plugins: [react(), tsconfigPaths()],
    envDir,
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
