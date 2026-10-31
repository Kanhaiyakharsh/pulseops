import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  tsconfig: 'tsconfig.json',
  // @pulseops/shared ships TypeScript source, so it has to be bundled into the output.
  noExternal: [/^@pulseops\//],
});
