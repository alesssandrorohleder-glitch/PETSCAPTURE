// Teste de fumaça: sobe o build (vite preview), abre no Chromium, navega pelas cenas,
// tira prints em ./screenshots e falha se houver erro no console.
// Uso: npm run build && npm run smoke [-- --mobile]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4173;
const mobile = process.argv.includes('--mobile');
const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync('screenshots', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
const stopServer = () => { try { process.kill(-server.pid); } catch {} };
process.on('exit', stopServer);
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && res());
  server.on('exit', rej);
  setTimeout(() => rej(new Error('preview não iniciou')), 15000);
});

const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage(
  mobile ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } },
);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const scene = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const wait = (ms) => page.waitForTimeout(ms);
const press = async (k, ms = 200) => { await page.keyboard.press(k); await wait(ms); };
const shot = async (name) => page.screenshot({ path: `screenshots/${mobile ? 'm-' : ''}${name}.png` });
const expectScene = async (key) => {
  try {
    // espera a cena ficar ativa e o fade terminar (renderização headless é lenta)
    await page.waitForFunction(
      (k) => {
        const s = window.__game.scene.getScene(k);
        return window.__game.scene.isActive(k) && !s.cameras.main.fadeEffect.isRunning;
      },
      key,
      { timeout: 8000 },
    );
  } catch {
    throw new Error(`esperava cena ${key}, está em ${await scene()}`);
  }
  await wait(150);
  console.log('  ✓', key);
};

// Roteiro de etapas: exporta funções em scripts/smoke-steps.mjs
const { default: steps } = await import('./smoke-steps.mjs');
let failed = false;
try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 15000 });
  await wait(400);
  await steps({ page, press, wait, shot, scene, expectScene, mobile });
} catch (e) {
  failed = true;
  console.error('✗ FALHOU:', e.message);
  await shot('failure');
}
if (errors.length) {
  failed = true;
  console.error('Erros no console:\n' + errors.join('\n'));
}
await browser.close();
stopServer();
console.log(failed ? 'SMOKE: FALHOU' : 'SMOKE: OK');
process.exit(failed ? 1 : 0);
