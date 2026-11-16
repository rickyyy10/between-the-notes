import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const root = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(new URL('../qa/', import.meta.url), { recursive: true });
export const demoUrl = (suffix = '') => new URL(suffix, process.env.DEMO_URL || 'http://127.0.0.1:4187/').href;
export const launchBrowser = () => chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});
