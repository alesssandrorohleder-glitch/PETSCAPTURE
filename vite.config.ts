/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Gera o módulo virtual "virtual:asset-manifest" com a lista de imagens/áudios
 * presentes em /public/assets. O jogo só tenta carregar arquivos que existem;
 * os que faltam são substituídos por placeholders coloridos.
 */
function assetManifest(): Plugin {
  const id = 'virtual:asset-manifest';
  const resolved = '\0' + id;
  const root = join(__dirname, 'public', 'assets');
  const list = (dir: string): string[] =>
    !existsSync(dir)
      ? []
      : readdirSync(dir).flatMap((f) => {
          const p = join(dir, f);
          return statSync(p).isDirectory() ? list(p) : [relative(root, p).replace(/\\/g, '/')];
        });
  return {
    name: 'asset-manifest',
    resolveId: (s) => (s === id ? resolved : null),
    load: (s) => (s === resolved ? `export default ${JSON.stringify(list(root))};` : null),
    configureServer(server) {
      server.watcher.add(root);
      const reload = (file: string) => {
        if (!file.startsWith(root)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [assetManifest()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
