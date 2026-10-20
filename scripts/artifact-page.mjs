// Gera uma cópia do build (dist/) adaptada para publicação como página do claude.ai:
// remove doctype/html/head/body (o publicador adiciona o esqueleto).
// Uso: node scripts/artifact-page.mjs <pasta-destino>
import { cpSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('informe a pasta de destino');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('dist', out, { recursive: true });
const html = readFileSync(join(out, 'index.html'), 'utf8')
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<meta charset[^>]*>/i, '');
writeFileSync(join(out, 'index.html'), html.trim() + '\n');
console.log('ok');
