import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from 'dotenv';

/**
 * Loads `.env` files without overriding variables that are already set.
 * `backend/.env` (if present) wins over the repo-root `.env`; real environment variables win over both.
 */
export function loadDotenvFiles(cwd: string = process.cwd()): string[] {
  const candidates = [resolve(cwd, '.env'), resolve(cwd, '..', '.env')];
  const loaded: string[] = [];
  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path, quiet: true });
      loaded.push(path);
    }
  }
  return loaded;
}
