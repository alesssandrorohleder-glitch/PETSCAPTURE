// Tira prints de todas as páginas da galeria de espécies (?gallery=1).
// Uso: node scripts/gallery.mjs [pasta]   (padrão: screenshots/)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const PORT = 4177;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((r) => server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && r()));
const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
try {
  for (let p = 0; ; p++) {
    await page.goto(`http://localhost:${PORT}/?gallery=1&scale=1&ads=off&page=${p}`);
    await page.waitForFunction(() => window.__game?.scene.isActive('Gallery'), null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const title = await page.evaluate(() => window.__game.scene.getScene('Gallery').children.list.find((o) => o.text?.startsWith('Galeria'))?.text);
    const [cur, total] = title.match(/(\d+)\/(\d+)/).slice(1).map(Number);
    await page.screenshot({ path: `${out}/gallery-${cur}.png` });
    console.log(`${out}/gallery-${cur}.png`);
    if (cur >= total) break;
  }
} finally {
  await browser.close();
  process.kill(-server.pid);
}
