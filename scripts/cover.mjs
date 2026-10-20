// Gera public/og-cover.png (1200×630) a partir da cena de capa (?cover=1).
// Uso: npm run build && node scripts/cover.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PORT = 4176;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((r) => server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && r()));
const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
await page.goto(`http://localhost:${PORT}/?cover=1&scale=2&ads=off`);
await page.waitForFunction(() => window.__game?.scene.isActive('Cover'), null, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'public/og-cover.png', clip: { x: 0, y: 22, width: 1200, height: 630 } });
await browser.close();
process.kill(-server.pid);
console.log('public/og-cover.png gerado');
