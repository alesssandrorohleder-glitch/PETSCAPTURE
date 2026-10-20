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

/**
 * Endereço público do site, usado nas meta tags de compartilhamento (og:image precisa de URL completa).
 * Defina SITE_URL no painel da Vercel/Netlify, ou deixe que seja detectado automaticamente.
 */
function siteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    process.env.URL || // Netlify
    '';
  return raw.replace(/\/$/, '');
}

function siteMeta(): Plugin {
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      const url = siteUrl();
      // sem URL conhecida, usa caminhos relativos (funciona, mas alguns apps não mostram a imagem)
      return html.replace(/%SITE_URL%\//g, url ? `${url}/` : './').replace(/%SITE_URL%/g, url || '.');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [assetManifest(), siteMeta()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
