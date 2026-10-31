import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const example = resolve(root, '.env.example');
const target = resolve(root, '.env');

if (existsSync(target)) {
  console.log('.env already exists, leaving it untouched.');
} else {
  copyFileSync(example, target);
  console.log('Created .env from .env.example. Review the values before deploying anywhere.');
}
