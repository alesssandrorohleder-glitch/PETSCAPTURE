import Phaser from 'phaser';
import type { BiomeTheme, BuildingKind, Facing } from '../data/maps';
import { getSpecies } from '../data/monsters';
import { drawCreature } from './CreatureArt';
import type { TrainerData } from '../data/trainers';
import { TEXTURE_SCALE, TILE } from '../config';

/**
 * Se existir uma imagem carregada com a chave `key` (arquivo em public/assets),
 * usa a imagem. Caso contrário, desenha um placeholder e devolve a chave dele.
 */
function ensure(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (scene.textures.exists(key)) return key;
  const ph = `ph:${key}`;
  if (!scene.textures.exists(ph)) {
    // desenhado em resolução dobrada (Full HD); quem exibe usa setDisplaySize/fitInto
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.scaleCanvas(TEXTURE_SCALE, TEXTURE_SCALE);
    draw(g);
    g.generateTexture(ph, w * TEXTURE_SCALE, h * TEXTURE_SCALE);
    g.destroy();
  }
  return ph;
}

const shade = (c: number, f: number): number => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  const k = (v: number) => Phaser.Math.Clamp(Math.round(v * f), 0, 255);
  return Phaser.Display.Color.GetColor(k(col.red), k(col.green), k(col.blue));
};

/** Pseudo-aleatório determinístico para detalhes dos tiles. */
const rng = (seed: number) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

// ---------------------------------------------------------------- tiles
/** Biomas de chão gramado (os outros são areia, neve, pedra...). */
const GRASSY = new Set(['vila', 'floresta', 'planalto', 'vento']);
/** Quantas variações de cada tile de chão são sorteadas pelo mapa (evita o efeito "xadrez"). */
export const TILE_VARIANTS = 4;

const mixc = (a: number, b: number, t: number): number => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return Phaser.Display.Color.GetColor(m(ca.red, cb.red), m(ca.green, cb.green), m(ca.blue, cb.blue));
};

/** Desenha repetindo nas bordas, para o tile emendar sem costura com os vizinhos. */
const wrapped = (x: number, y: number, pad: number, fn: (x: number, y: number) => void): void => {
  for (const ox of [-TILE, 0, TILE]) {
    for (const oy of [-TILE, 0, TILE]) {
      const px = x + ox;
      const py = y + oy;
      if (px > -pad && px < TILE + pad && py > -pad && py < TILE + pad) fn(px, py);
    }
  }
};

/** Folha de grama: base escura, ponta clara, levemente curva. */
function blade(g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, lean: number, w: number, dark: number, light: number): void {
  const V2 = Phaser.Math.Vector2;
  const tipX = x + lean;
  const tipY = y - len;
  g.fillStyle(dark).fillPoints([new V2(x - w, y), new V2(x + lean * 0.45 - w * 0.4, y - len * 0.55), new V2(tipX, tipY), new V2(x + lean * 0.45 + w * 0.4, y - len * 0.55), new V2(x + w, y)], true);
  g.fillStyle(light).fillPoints([new V2(x + lean * 0.3 - w * 0.45, y - len * 0.35), new V2(tipX, tipY), new V2(x + lean * 0.3 + w * 0.2, y - len * 0.35)], true);
}

/** Textura orgânica de chão: manchas suaves e tufinhos de grama com luz e sombra (ou grãos de areia/neve/pedra). */
function drawGround(g: Phaser.GameObjects.Graphics, theme: BiomeTheme, r: () => number): void {
  const base = theme.ground;
  const grassy = GRASSY.has(theme.id);
  g.fillStyle(base).fillRect(0, 0, TILE, TILE);
  // manchas suaves e discretas (a variação grande de cor é feita no mapa inteiro, sem costura)
  for (let i = 0; i < 6; i++) {
    const d = grassy ? 0.025 : 0.02;
    const col = shade(base, r() < 0.5 ? 1 - d : 1 + d);
    const rad = 5 + r() * 8;
    wrapped(r() * TILE, r() * TILE, rad, (x, y) => g.fillStyle(col, grassy ? 0.6 : 0.4).fillCircle(x, y, rad));
  }
  if (grassy) {
    const shadow = shade(base, 0.72);
    // tufinhos: 3 a 5 folhas em leque, cada um com sombra na base
    for (let i = 0; i < 16; i++) {
      const cx = r() * TILE;
      const cy = r() * TILE;
      const n = 3 + Math.floor(r() * 3);
      const size = 0.6 + r() * 0.45;
      const tone = 0.97 + r() * 0.08;
      wrapped(cx, cy, 8, (x, y) => {
        g.fillStyle(shadow, 0.22).fillEllipse(x, y + 0.6, 6 * size, 1.8 * size);
        for (let k = 0; k < n; k++) {
          const t = n === 1 ? 0 : k / (n - 1) - 0.5;
          blade(g, x + t * 3 * size, y, (3.2 + (1 - Math.abs(t) * 1.4) * 2.6) * size, t * 3.4 * size, 0.55 * size, shade(base, 0.83 * tone), shade(base, 1.2 * tone));
        }
      });
    }
    // pontinhos de luz e, às vezes, uma florzinha miúda
    for (let i = 0; i < 6; i++) g.fillStyle(shade(base, 1.3), 0.7).fillCircle(r() * TILE, r() * TILE, 0.35);
    if (r() < 0.3) {
      const fx = 4 + r() * 24;
      const fy = 4 + r() * 24;
      g.fillStyle(r() < 0.5 ? 0xffffff : 0xffe066, 0.95).fillCircle(fx, fy, 0.8).fillCircle(fx + 1.4, fy + 0.6, 0.7).fillCircle(fx + 0.4, fy - 1.2, 0.7);
    }
  } else {
    for (let i = 0; i < 26; i++) {
      g.fillStyle(shade(base, 0.82 + r() * 0.32), 0.8).fillCircle(r() * TILE, r() * TILE, 0.5 + r() * 0.9);
    }
  }
}

export function tileTexture(scene: Phaser.Scene, theme: BiomeTheme, name: string, variant = 0): string {
  const baseKey = `tiles/${theme.id}/${name}`;
  // imagem própria do tile vale para todas as variações
  if (scene.textures.exists(baseKey)) return baseKey;
  const key = variant ? `${baseKey}_${variant}` : baseKey;
  return ensure(scene, key, TILE, TILE, (g) => {
    const r = rng(name.length * 31 + theme.ground + variant * 977);
    const ground = () => drawGround(g, theme, r);
    switch (name) {
      case 'ground':
        ground();
        break;
      case 'path': {
        // terra batida: tons misturados, pedrinhas com brilho e marcas de passagem
        g.fillStyle(theme.path).fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 8; i++) g.fillStyle(shade(theme.path, r() < 0.5 ? 0.92 : 1.06), 0.6).fillCircle(r() * TILE, r() * TILE, 3 + r() * 6);
        for (let i = 0; i < 30; i++) g.fillStyle(shade(theme.path, 0.8 + r() * 0.15), 0.8).fillCircle(r() * TILE, r() * TILE, 0.4 + r() * 0.6);
        for (let i = 0; i < 5; i++) {
          const x = r() * TILE;
          const y = r() * TILE;
          const s = 0.9 + r() * 1.3;
          g.fillStyle(shade(theme.path, 0.68)).fillEllipse(x, y + 0.5, s * 2.3, s * 1.6);
          g.fillStyle(shade(theme.path, 1.12)).fillEllipse(x - 0.2, y - 0.2, s * 2, s * 1.3);
        }
        break;
      }
      case 'tallgrass':
        // o mato alto em si é um objeto (tallGrassTexture) que passa do tile; aqui só o chão mais escuro
        ground();
        break;
      case 'tree':
        // o tile é só chão; a árvore em si é um objeto alto (treeTexture)
        ground();
        g.fillStyle(shade(theme.ground, 0.8), 0.8).fillEllipse(16, 26, 26, 10);
        break;
      case 'water': {
        // água lisa com reflexos curtos (repetidos nas bordas: emenda sem costura)
        g.fillStyle(theme.water).fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 4; i++) {
          const col = shade(theme.water, r() < 0.5 ? 0.97 : 1.04);
          const rad = 7 + r() * 8;
          wrapped(r() * TILE, r() * TILE, rad, (x, y) => g.fillStyle(col, 0.6).fillCircle(x, y, rad));
        }
        for (let i = 0; i < 6; i++) {
          const len = 2.5 + r() * 4;
          const a0 = 1.25 + r() * 0.1;
          wrapped(r() * TILE, r() * TILE, 10, (x, y) => {
            g.lineStyle(0.9, shade(theme.water, 1.3), 0.55).beginPath().arc(x, y + len, len, Math.PI * a0, Math.PI * (a0 + 0.45)).strokePath();
          });
        }
        break;
      }
      case 'rock': {
        ground();
        const rc = theme.rock;
        const V2 = Phaser.Math.Vector2;
        // sombra difusa no chão
        g.fillStyle(0x000000, 0.2).fillEllipse(16.5, 25.5, 31, 10);
        g.fillStyle(0x000000, 0.18).fillEllipse(17, 25.5, 23, 6);
        // contorno irregular de rocha
        const cx = 15.5 + r();
        const cy = 17;
        const rx = 12 + r() * 2;
        const ry = 9 + r() * 2;
        const pts: Phaser.Math.Vector2[] = [];
        for (let k = 0; k < 11; k++) {
          const a = (k / 11) * Math.PI * 2;
          const rr = 0.8 + r() * 0.24;
          pts.push(new V2(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr - (Math.sin(a) < 0 ? r() * 2.5 : 0)));
        }
        const scaled = (k: number, dx: number, dy: number) => pts.map((p) => new V2(cx + (p.x - cx) * k + dx, cy + (p.y - cy) * k + dy));
        g.fillStyle(shade(rc, 0.58)).fillPoints(pts, true); // lado na sombra
        g.fillStyle(shade(rc, 0.9)).fillPoints(scaled(0.9, -0.8, -1.4), true); // corpo iluminado
        // face de cima (mais clara), só a metade superior
        const top = scaled(0.7, -1.4, -3.2).filter((p) => p.y < cy - 1);
        if (top.length > 2) g.fillStyle(shade(rc, 1.12)).fillPoints(top, true);
        // arestas e rachaduras
        g.lineStyle(0.8, shade(rc, 0.5), 0.75);
        g.lineBetween(cx - 2, cy - 5, cx + 3 + r() * 3, cy + 6);
        g.lineBetween(cx - 2, cy - 5, cx - 8, cy + 3);
        const kx = cx + 3 + r() * 4;
        g.lineStyle(0.6, shade(rc, 0.45), 0.8).beginPath().moveTo(kx, cy - 6).lineTo(kx + 1.5, cy - 3).lineTo(kx - 0.5, cy - 1).lineTo(kx + 1, cy + 2).strokePath();
        // granulado
        for (let i = 0; i < 16; i++) {
          const p = pts[Math.floor(r() * pts.length)];
          const t = 0.2 + r() * 0.7;
          g.fillStyle(shade(rc, 0.7 + r() * 0.6), 0.85).fillCircle(cx + (p.x - cx) * t, cy + (p.y - cy) * t - 1, 0.35 + r() * 0.35);
        }
        // brilho
        g.fillStyle(0xffffff, 0.22).fillEllipse(cx - 4, cy - 5.5, 5, 2);
        // musgo nos mapas verdes
        if (GRASSY.has(theme.id)) {
          for (let i = 0; i < 4; i++) g.fillStyle(shade(theme.tallgrass, 0.9 + r() * 0.3), 0.85).fillCircle(cx - 6 + r() * 7, cy - 6 + r() * 3, 1.2 + r() * 1.3);
        }
        // pedrinhas em volta
        for (let i = 0; i < 2; i++) {
          const px = r() < 0.5 ? 3 + r() * 4 : 25 + r() * 4;
          const py = 24 + r() * 4;
          g.fillStyle(shade(rc, 0.6)).fillEllipse(px + 0.3, py + 0.4, 3.2, 2.2);
          g.fillStyle(shade(rc, 1)).fillEllipse(px, py, 2.8, 1.8);
        }
        break;
      }
      case 'flowers':
        ground();
        for (let i = 0; i < 6; i++) {
          const fx = 4 + r() * 24;
          const fy = 5 + r() * 24;
          g.lineStyle(1, shade(theme.ground, 0.7)).lineBetween(fx, fy, fx, fy + 4);
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            g.fillStyle(theme.flowers).fillCircle(fx + Math.cos(a) * 1.8, fy + Math.sin(a) * 1.8, 1.4);
          }
          g.fillStyle(0xffe066).fillCircle(fx, fy, 1);
        }
        break;
      case 'fence':
        ground();
        g.fillStyle(0x000000, 0.15).fillRect(0, 27, 32, 3);
        g.fillStyle(0x8b5a2b).fillRect(0, 12, 32, 4).fillRect(0, 22, 32, 4).fillRect(4, 8, 4, 22).fillRect(24, 8, 4, 22);
        g.fillStyle(0xa47148).fillRect(0, 12, 32, 1.5).fillRect(0, 22, 32, 1.5);
        break;
      default:
        g.fillStyle(0xff00ff).fillRect(0, 0, TILE, TILE);
    }
  });
}

/**
 * Mato alto: tufo de folhas curvas que passa um pouco do tile, desenhado na frente das pernas
 * de quem pisa nele. Arquivo próprio (opcional): public/assets/objects/tallgrass_<bioma>.png
 */
export const TALLGRASS_SIZE = { w: 40, h: 24 };
export function tallGrassTexture(scene: Phaser.Scene, theme: BiomeTheme, variant = 0): string {
  const { w, h } = TALLGRASS_SIZE;
  const real = `objects/tallgrass_${theme.id}`;
  if (scene.textures.exists(real)) return real;
  // desenhado em escala 2 dentro do quadro (mais detalhe), exibido em w×h
  return ensure(scene, variant ? `${real}_${variant}` : real, w * 2, h * 2, (g) => {
    const W = w * 2;
    const H = h * 2;
    const r = rng(theme.tallgrass + variant * 131);
    const c = theme.tallgrass;
    const blades = 52;
    for (let i = 0; i < blades; i++) {
      // de trás (escuras e altas) para a frente (claras e mais baixas)
      const t = i / blades;
      const edge = Math.abs(r() - 0.5) * 2; // folhas das pontas são mais baixas: silhueta arredondada
      const bx = W / 2 + (r() - 0.5) * (W - 8);
      const root = H - 2 - r() * 8 * (1 - t);
      const len = (26 + r() * 20) * (1 - (Math.abs(bx - W / 2) / W) * 0.8) - t * 6 + edge;
      const lean = (bx - W / 2) * 0.35 + (r() - 0.5) * 10;
      const tone = 0.74 + t * 0.4 + (r() - 0.5) * 0.12;
      blade(g, bx, root, len, lean, 2.2 + r() * 1.6, shade(c, tone * 0.82), shade(c, tone * 1.28));
    }
    for (let i = 0; i < 3; i++) g.fillStyle(mixc(c, 0xffffff, 0.5), 0.9).fillCircle(W / 2 + (r() - 0.5) * (W - 16), H - 26 - r() * 10, 1.4);
  });
}

/** Borda irregular de grama/chão por cima da estrada (some com o "quadrado" das estradas). */
export function pathEdgeTexture(scene: Phaser.Scene, theme: BiomeTheme, variant = 0): string {
  const w = TILE + 6;
  const h = 9;
  return ensure(scene, `ph-edge/${theme.id}/${variant}`, w, h, (g) => {
    const r = rng(theme.path + variant * 53);
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(w, 0)];
    for (let x = w; x >= 0; x -= 2) pts.push(new Phaser.Math.Vector2(x, 1.5 + r() * 3 + Math.sin(x * 0.35 + variant) * 1.2));
    g.fillStyle(shade(theme.path, 0.82), 0.6).fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y + 1.2)), true);
    g.fillStyle(theme.ground).fillPoints(pts, true);
    if (GRASSY.has(theme.id)) {
      for (let i = 0; i < 18; i++) {
        const x = r() * w;
        const len = 2 + r() * 4;
        g.lineStyle(0.9, shade(theme.ground, r() < 0.5 ? 0.8 : 1.15)).lineBetween(x, 2, x + (r() - 0.5) * 2, 2 + len);
      }
    } else {
      for (let i = 0; i < 10; i++) g.fillStyle(shade(theme.ground, 0.85 + r() * 0.25)).fillCircle(r() * w, 3 + r() * 3, 0.8);
    }
  });
}

/** Brilho que pisca na água. */
export function glintTexture(scene: Phaser.Scene): string {
  return ensure(scene, 'ph-glint', 8, 8, (g) => {
    g.fillStyle(0xffffff, 0.9).fillTriangle(4, 0, 5, 4, 3, 4).fillTriangle(4, 8, 5, 4, 3, 4).fillTriangle(0, 4, 4, 3, 4, 5).fillTriangle(8, 4, 4, 3, 4, 5);
    g.fillStyle(0xffffff).fillCircle(4, 4, 1);
  });
}

/** Ondinha (anel) que se espalha na água. */
export function rippleTexture(scene: Phaser.Scene): string {
  return ensure(scene, 'ph-ripple', 24, 12, (g) => {
    g.lineStyle(1.2, 0xffffff, 0.8).strokeEllipse(12, 6, 22, 10);
  });
}

/** Sombra oval sob personagens e pets. */
export function shadowTexture(scene: Phaser.Scene): string {
  return ensure(scene, 'ph-shadow', 24, 8, (g) => {
    g.fillStyle(0x000000, 0.12).fillEllipse(12, 4, 24, 8);
    g.fillStyle(0x000000, 0.14).fillEllipse(12, 4, 17, 5.5);
  });
}

/** Tamanho (em unidades de layout) do obstáculo alto de cada bioma. */
export const TREE_SIZE = { w: 44, h: 60 };

/**
 * Obstáculo do bioma desenhado como objeto alto (passa do tile para cima),
 * para o personagem poder andar "atrás" da copa. Arquivo: public/assets/objects/tree_<bioma>.png
 */
export function treeTexture(scene: Phaser.Scene, theme: BiomeTheme): string {
  const { w, h } = TREE_SIZE;
  return ensure(scene, `objects/tree_${theme.id}`, w, h, (g) => {
    const c = theme.tree;
    const dark = shade(c, 0.7);
    const light = shade(c, 1.3);
    const cx = w / 2;
    g.fillStyle(0x000000, 0.22).fillEllipse(cx, h - 4, 34, 9);
    switch (theme.treeStyle) {
      case 'palm': {
        // tronco curvo em gomos
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const x = cx - 2 + Math.sin(t * 1.6) * 7;
          const y = h - 6 - t * 38;
          g.fillStyle(i % 2 ? 0x9c7a54 : 0x8a6a46).fillEllipse(x, y, 9 - t * 2, 7);
        }
        const tx = cx - 2 + Math.sin(1.6) * 7;
        const ty = h - 44;
        // folhas
        const frond = (ang: number, len: number, col: number) => {
          const ex = tx + Math.cos(ang) * len;
          const ey = ty + Math.sin(ang) * len * 0.7 + 6;
          const nx = Math.cos(ang + Math.PI / 2) * 4;
          const ny = Math.sin(ang + Math.PI / 2) * 4;
          g.fillStyle(col).fillTriangle(tx + nx, ty + ny, tx - nx, ty - ny, ex, ey);
          g.fillStyle(shade(col, 0.8)).fillTriangle(tx, ty, (tx + ex) / 2 + nx, (ty + ey) / 2 + ny + 3, ex, ey);
        };
        [Math.PI * 1.05, Math.PI * 1.35, Math.PI * 1.65, Math.PI * 1.95, Math.PI * 0.2, Math.PI * 0.8].forEach((a, i) => frond(a, 20, i % 2 ? c : light));
        g.fillStyle(0x6b4226).fillCircle(tx - 3, ty + 3, 3).fillCircle(tx + 3, ty + 4, 3).fillCircle(tx, ty + 6, 3);
        break;
      }
      case 'pine': {
        g.fillStyle(0x5c4033).fillRect(cx - 3, h - 14, 6, 11);
        const tiers: [number, number, number][] = [[h - 12, 20, 18], [h - 24, 16, 16], [h - 35, 12, 15]];
        tiers.forEach(([base, half, height], i) => {
          g.fillStyle(dark).fillTriangle(cx, base - height, cx - half, base, cx + half, base);
          g.fillStyle(i === 2 ? light : c).fillTriangle(cx, base - height, cx - half + 4, base - 2, cx + 2, base - 2);
          if (theme.id === 'picos') {
            g.fillStyle(0xffffff, 0.95).fillTriangle(cx, base - height, cx - half * 0.45, base - height * 0.5, cx + half * 0.45, base - height * 0.5);
            g.fillStyle(0xffffff, 0.9).fillEllipse(cx - half + 4, base - 1, 8, 3).fillEllipse(cx + half - 5, base - 1, 7, 3);
          }
        });
        break;
      }
      case 'mesa': {
        const base = h - 4;
        g.fillStyle(dark).fillRoundedRect(4, 18, w - 8, base - 18, 4);
        g.fillStyle(c).fillRoundedRect(6, 16, w - 16, base - 18, 4);
        for (let y = 24; y < base - 4; y += 8) g.fillStyle(shade(c, y % 16 ? 1.12 : 0.88)).fillRect(6, y, w - 16, 3);
        g.fillStyle(light).fillRoundedRect(4, 12, w - 8, 8, 3);
        g.fillStyle(0x6a8d3a).fillEllipse(14, 12, 10, 4).fillEllipse(30, 13, 8, 3);
        g.fillStyle(0x000000, 0.15).fillRect(w - 12, 20, 6, base - 22);
        break;
      }
      case 'spire': {
        // pináculo de obsidiana com veios de lava
        const base = h - 4;
        g.fillStyle(shade(c, 0.8)).fillTriangle(cx - 16, base, cx - 2, 6, cx + 16, base);
        g.fillStyle(c).fillTriangle(cx - 16, base, cx - 2, 6, cx - 1, base);
        g.fillStyle(light).fillTriangle(cx - 6, 22, cx - 2, 6, cx - 2, 30);
        g.lineStyle(2, 0xff7b00, 0.9).beginPath().moveTo(cx + 1, 18).lineTo(cx + 5, 30).lineTo(cx + 2, 40).lineTo(cx + 7, base - 2).strokePath();
        g.fillStyle(0xffba08, 0.8).fillCircle(cx + 5, 30, 1.5);
        g.fillStyle(0x3d3d3d).fillEllipse(cx, base, 36, 7);
        break;
      }
      case 'crystal': {
        // cacho de cristais
        const prism = (x: number, w: number, top: number, col: number) => {
          g.fillStyle(shade(col, 0.75)).fillPoints([new Phaser.Math.Vector2(x - w, h - 6), new Phaser.Math.Vector2(x - w, top + w), new Phaser.Math.Vector2(x, top), new Phaser.Math.Vector2(x + w, top + w), new Phaser.Math.Vector2(x + w, h - 6)], true);
          g.fillStyle(col).fillPoints([new Phaser.Math.Vector2(x - w, h - 6), new Phaser.Math.Vector2(x - w, top + w), new Phaser.Math.Vector2(x, top), new Phaser.Math.Vector2(x, h - 6)], true);
          g.fillStyle(0xffffff, 0.55).fillRect(x - w + 2, top + w + 2, 2, (h - 6 - top - w) * 0.5);
        };
        prism(cx - 9, 6, 24, shade(c, 0.85));
        prism(cx + 9, 6, 28, light);
        prism(cx, 8, 8, c);
        g.fillStyle(0x495057).fillEllipse(cx, h - 5, 36, 8);
        break;
      }
      case 'pillar': {
        const base = h - 4;
        g.fillStyle(dark).fillRect(cx - 14, base - 7, 28, 7);
        g.fillStyle(c).fillRect(cx - 10, 14, 20, base - 21);
        for (let x = cx - 7; x <= cx + 7; x += 5) g.fillStyle(shade(c, 0.8)).fillRect(x, 16, 2, base - 25);
        g.fillStyle(light).fillRect(cx - 14, 8, 28, 7);
        g.fillStyle(dark).fillTriangle(cx + 4, 8, cx + 14, 8, cx + 14, 3); // topo quebrado
        g.lineStyle(1.5, 0x241640, 0.8).beginPath().moveTo(cx - 4, 18).lineTo(cx - 1, 26).lineTo(cx - 5, 33).strokePath();
        g.fillStyle(0xc77dff, 0.35).fillCircle(cx + 1, 36, 6);
        g.fillStyle(0xe0aaff).fillCircle(cx + 1, 36, 2.5);
        g.fillStyle(0x5a189a).fillEllipse(cx - 9, 30, 4, 12).fillEllipse(cx + 9, base - 16, 4, 10);
        break;
      }
      default: {
        // árvore frondosa
        g.fillStyle(0x5d3a1a).fillRect(cx - 3.5, h - 24, 7, 20);
        g.fillStyle(0x4a2c12).fillRect(cx + 0.5, h - 24, 3, 20);
        g.fillStyle(0x5d3a1a).fillTriangle(cx - 3.5, h - 6, cx - 9, h - 3, cx - 2, h - 9).fillTriangle(cx + 3.5, h - 6, cx + 9, h - 3, cx + 2, h - 9);
        g.fillStyle(dark).fillCircle(cx - 9, h - 30, 11).fillCircle(cx + 9, h - 30, 11).fillCircle(cx, h - 26, 12);
        g.fillStyle(c).fillCircle(cx, h - 38, 14).fillCircle(cx - 10, h - 34, 10).fillCircle(cx + 10, h - 34, 10).fillCircle(cx, h - 47, 10);
        g.fillStyle(light).fillCircle(cx - 5, h - 46, 5).fillCircle(cx + 5, h - 40, 4).fillCircle(cx - 11, h - 36, 3.5);
        g.fillStyle(shade(c, 1.5), 0.7).fillCircle(cx - 6, h - 48, 2).fillCircle(cx + 7, h - 42, 1.5);
      }
    }
  });
}

// ---------------------------------------------------------------- prédios
export function buildingTexture(scene: Phaser.Scene, kind: BuildingKind, wTiles: number, hTiles: number): string {
  const w = wTiles * TILE;
  const h = hTiles * TILE;
  const roof = kind === 'heal' ? 0xd62839 : kind === 'shop' ? 0x2f6fd6 : 0xb5562c;
  const wall = kind === 'house' ? 0xf3dfc1 : 0xf6ecd9;
  return ensure(scene, `buildings/${kind}`, w, h, (g) => {
    const roofH = Math.round(h * 0.48);
    const wallTop = roofH - 4;
    const baseH = 6;
    // sombra no chão
    g.fillStyle(0x000000, 0.2).fillRect(6, h - 4, w - 8, 5);

    // parede de tábuas + base de pedra
    g.fillStyle(wall).fillRect(4, wallTop, w - 8, h - wallTop - 2);
    for (let y = wallTop + 6; y < h - baseH; y += 6) g.fillStyle(shade(wall, 0.93)).fillRect(4, y, w - 8, 1);
    g.fillStyle(0x9a9a9a).fillRect(4, h - baseH - 2, w - 8, baseH);
    for (let x = 6; x < w - 8; x += 9) g.fillStyle(0x7d7d7d).fillRect(x, h - baseH - 2, 1, baseH);
    g.lineStyle(1.5, 0x5c4a3a).strokeRect(4, wallTop, w - 8, h - wallTop - 2);
    // pilares de madeira nos cantos
    g.fillStyle(0x7a5232).fillRect(4, wallTop, 4, h - wallTop - 2).fillRect(w - 8, wallTop, 4, h - wallTop - 2);

    // telhado em trapézio com fileiras de telhas
    const pts = [new Phaser.Math.Vector2(0, roofH), new Phaser.Math.Vector2(w, roofH), new Phaser.Math.Vector2(w - 12, 6), new Phaser.Math.Vector2(12, 6)];
    g.fillStyle(roof).fillPoints(pts, true);
    for (let y = 10, row = 0; y < roofH - 2; y += 6, row++) {
      const inset = 12 - ((y - 6) / (roofH - 6)) * 12;
      g.fillStyle(shade(roof, 0.82)).fillRect(inset, y + 4, w - inset * 2, 1.5);
      for (let x = inset + (row % 2 ? 4 : 0); x < w - inset; x += 8) g.fillStyle(shade(roof, 0.88)).fillRect(x, y, 1, 5);
    }
    g.fillStyle(shade(roof, 0.6)).fillRect(10, 3, w - 20, 5); // cumeeira
    g.fillStyle(shade(roof, 0.7)).fillRect(-1, roofH - 3, w + 2, 5); // beiral
    g.fillStyle(0x000000, 0.18).fillRect(4, roofH + 2, w - 8, 4); // sombra do beiral

    if (kind === 'house') {
      // chaminé
      g.fillStyle(0x8c3b2b).fillRect(w - 34, 0, 10, 16);
      g.fillStyle(0x6e2c20).fillRect(w - 36, -1, 14, 4);
      g.fillStyle(0xdddddd, 0.6).fillCircle(w - 28, -4, 3);
    }

    // janelas com moldura, cruz e floreira
    const win = (x: number) => {
      const y = roofH + 9;
      g.fillStyle(0xffffff).fillRect(x - 1.5, y - 1.5, 21, 17);
      g.fillStyle(0x7cc6f2).fillRect(x, y, 18, 14);
      g.fillStyle(0xb9e3fb).fillTriangle(x, y, x + 9, y, x, y + 9);
      g.fillStyle(0xffffff).fillRect(x + 8, y, 2, 14).fillRect(x, y + 6, 18, 2);
      g.fillStyle(0x7a5232).fillRect(x - 2, y + 15, 22, 4);
      [3, 8, 13, 17].forEach((dx, i) => g.fillStyle([0xff6b8b, 0xffd166, 0xff8fab, 0xf4a261][i]).fillCircle(x + dx, y + 15, 2));
    };
    win(14);
    win(w - 32);

    // porta
    const dx = Math.floor(wTiles / 2) * TILE;
    const doorTop = h - 30;
    g.fillStyle(0x4a2f1f).fillRoundedRect(dx + 5, doorTop - 2, TILE - 10, 30, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(0x7a4a2e).fillRoundedRect(dx + 7, doorTop, TILE - 14, 27, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(0x6a3d24).fillRect(dx + 10, doorTop + 6, 5, 8).fillRect(dx + 17, doorTop + 6, 5, 8).fillRect(dx + 10, doorTop + 16, 5, 8).fillRect(dx + 17, doorTop + 16, 5, 8);
    g.fillStyle(0xffd166).fillCircle(dx + TILE - 11, doorTop + 15, 1.6);
    g.fillStyle(0xbdbdbd).fillRect(dx + 3, h - 3, TILE - 6, 3); // degrau

    if (kind === 'heal') {
      // placa redonda com cruz
      g.fillStyle(0xffffff).fillCircle(w / 2, roofH * 0.52, 11);
      g.lineStyle(2, shade(roof, 0.7)).strokeCircle(w / 2, roofH * 0.52, 11);
      g.fillStyle(0xe63946).fillRect(w / 2 - 7, roofH * 0.52 - 2.5, 14, 5).fillRect(w / 2 - 2.5, roofH * 0.52 - 7, 5, 14);
    } else if (kind === 'shop') {
      // toldo listrado sobre a porta e placa com moeda
      const ax = dx - 6;
      const aw = TILE + 12;
      for (let i = 0; i < 6; i++) g.fillStyle(i % 2 ? 0xffffff : 0x2f6fd6).fillRect(ax + (i * aw) / 6, doorTop - 10, aw / 6 + 0.5, 8);
      for (let i = 0; i < 6; i++) g.fillStyle(i % 2 ? 0xffffff : 0x2f6fd6).fillCircle(ax + (i + 0.5) * (aw / 6), doorTop - 2, aw / 12);
      g.fillStyle(0xffd166).fillCircle(w / 2, roofH * 0.52, 10);
      g.lineStyle(2, 0xb7881f).strokeCircle(w / 2, roofH * 0.52, 10);
      g.fillStyle(0xb7881f).fillRect(w / 2 - 1.5, roofH * 0.52 - 6, 3, 12);
    }
  });
}

// ---------------------------------------------------------------- treinadores
export function trainerPortrait(scene: Phaser.Scene, t: Pick<TrainerData, 'id' | 'look'>): string {
  const { hair, outfit, accent, skin } = t.look;
  return ensure(scene, `trainers/${t.id}`, 160, 180, (g) => {
    g.fillStyle(outfit).fillRoundedRect(25, 110, 110, 80, 30);
    g.fillStyle(accent).fillRect(74, 112, 12, 68);
    g.fillStyle(skin).fillRect(68, 90, 24, 26);
    g.fillStyle(skin).fillCircle(80, 70, 38);
    g.fillStyle(hair);
    g.fillEllipse(80, 42, 84, 40);
    g.fillTriangle(42, 50, 52, 14, 66, 40).fillTriangle(66, 36, 80, 6, 94, 36).fillTriangle(94, 40, 108, 14, 118, 50);
    g.fillStyle(0x222222).fillCircle(66, 74, 5).fillCircle(94, 74, 5);
    g.fillStyle(0xffffff).fillCircle(68, 72, 1.6).fillCircle(96, 72, 1.6);
    g.lineStyle(3, 0x8a4b3a).beginPath().arc(80, 88, 9, 0.2, Math.PI - 0.2).strokePath();
  });
}

/** Encaixa a imagem numa caixa w×h sem distorcer (qualquer proporção de arquivo funciona). */
export function fitInto<T extends Phaser.GameObjects.Image>(img: T, w: number, h: number): T {
  const f = img.frame;
  img.setScale(Math.min(w / f.realWidth, h / f.realHeight));
  return img;
}

export interface SpriteRef {
  key: string;
  flipX: boolean;
}

/**
 * Sprite do mapa. Ordem de procura em public/assets/overworld/:
 *   <id>_down.png / <id>_up.png / <id>_side.png (lado olhando para a DIREITA)
 *   <id>.png (uma imagem só, espelhada para a esquerda)
 *   senão, placeholder.
 */
export function overworldSprite(scene: Phaser.Scene, id: string, look: TrainerData['look'], facing: Facing): SpriteRef {
  const has = (k: string) => scene.textures.exists(`overworld/${k}`);
  if (has(`${id}_${facing}`)) return { key: `overworld/${id}_${facing}`, flipX: false };
  if ((facing === 'left' || facing === 'right') && has(`${id}_side`)) return { key: `overworld/${id}_side`, flipX: facing === 'left' };
  if (has(`${id}_down`)) return { key: `overworld/${id}_down`, flipX: facing === 'left' };
  if (has(id)) return { key: `overworld/${id}`, flipX: facing === 'left' };
  return { key: overworldTexture(scene, id, look, facing), flipX: false };
}

export function overworldTexture(scene: Phaser.Scene, id: string, look: TrainerData['look'], facing: Facing): string {
  return ensure(scene, `overworld/${id}-${facing}`, TILE, TILE, (g) => {
    const { hair, outfit, accent, skin } = look;
    g.fillStyle(0x000000, 0.25).fillEllipse(16, 29, 20, 6);
    g.fillStyle(outfit).fillRoundedRect(8, 15, 16, 13, 4);
    g.fillStyle(accent).fillRect(15, 16, 2, 11);
    g.fillStyle(skin).fillCircle(16, 11, 7);
    g.fillStyle(hair);
    if (facing === 'up') g.fillCircle(16, 10, 7.5);
    else g.fillEllipse(16, 6, 16, 7);
    g.fillStyle(0x111111);
    if (facing === 'down') g.fillRect(12, 11, 2, 2).fillRect(18, 11, 2, 2);
    if (facing === 'left') g.fillRect(10, 11, 2, 2);
    if (facing === 'right') g.fillRect(20, 11, 2, 2);
  });
}

export function signTexture(scene: Phaser.Scene): string {
  return ensure(scene, 'objects/sign', TILE, TILE, (g) => {
    g.fillStyle(0x6b4226).fillRect(14, 16, 4, 14);
    g.fillStyle(0xc68642).fillRoundedRect(4, 4, 24, 15, 3);
    g.lineStyle(2, 0x6b4226).strokeRoundedRect(4, 4, 24, 15, 3);
    g.fillStyle(0x6b4226).fillRect(8, 9, 16, 2).fillRect(8, 13, 12, 2);
  });
}

/**
 * Cápsula de captura (public/assets/objects/capsule.png): frasco em forma de pílula,
 * metade turquesa e metade dourada, com uma runa de cristal no centro.
 */
export function capsuleTexture(scene: Phaser.Scene): string {
  return ensure(scene, 'objects/capsule', 28, 20, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(14, 18, 22, 4);
    g.fillStyle(0x1f8a80).fillRoundedRect(1, 2, 26, 14, 7);
    g.fillStyle(0x2ec4b6).fillRoundedRect(1, 2, 14, 14, { tl: 7, bl: 7, tr: 0, br: 0 });
    g.fillStyle(0xffd166).fillRoundedRect(13, 2, 14, 14, { tl: 0, bl: 0, tr: 7, br: 7 });
    g.fillStyle(0xd4a017).fillRect(13, 2, 2, 14);
    g.lineStyle(1.2, 0x14112b).strokeRoundedRect(1, 2, 26, 14, 7);
    // runa de cristal
    g.fillStyle(0xe0fbfc).fillPoints([new Phaser.Math.Vector2(14, 4.5), new Phaser.Math.Vector2(18, 9), new Phaser.Math.Vector2(14, 13.5), new Phaser.Math.Vector2(10, 9)], true);
    g.fillStyle(0x7fdbff).fillPoints([new Phaser.Math.Vector2(14, 6.5), new Phaser.Math.Vector2(16, 9), new Phaser.Math.Vector2(14, 11.5), new Phaser.Math.Vector2(12, 9)], true);
    g.fillStyle(0xffffff, 0.55).fillRoundedRect(4, 4, 8, 3, 1.5);
  });
}

// ---------------------------------------------------------------- partículas de efeito
export type FxShape = 'flame' | 'drop' | 'spark' | 'rock' | 'snow' | 'smoke' | 'leaf' | 'orb';

/** Texturas brancas das partículas (a cor vem do tint). Arquivos opcionais: public/assets/fx/<nome>.png */
export function fxTexture(scene: Phaser.Scene, shape: FxShape): string {
  return ensure(scene, `fx/${shape}`, 16, 16, (g) => {
    g.fillStyle(0xffffff);
    switch (shape) {
      case 'flame':
        g.fillCircle(8, 10, 5).fillTriangle(3, 10, 8, 0, 13, 10);
        break;
      case 'drop':
        g.fillCircle(8, 10, 4.5).fillTriangle(3.8, 9, 8, 1, 12.2, 9);
        break;
      case 'spark':
        g.fillPoints([new Phaser.Math.Vector2(8, 0), new Phaser.Math.Vector2(10, 6), new Phaser.Math.Vector2(16, 8), new Phaser.Math.Vector2(10, 10), new Phaser.Math.Vector2(8, 16), new Phaser.Math.Vector2(6, 10), new Phaser.Math.Vector2(0, 8), new Phaser.Math.Vector2(6, 6)], true);
        break;
      case 'rock':
        g.fillPoints([new Phaser.Math.Vector2(3, 4), new Phaser.Math.Vector2(10, 1), new Phaser.Math.Vector2(15, 7), new Phaser.Math.Vector2(12, 14), new Phaser.Math.Vector2(4, 14), new Phaser.Math.Vector2(1, 9)], true);
        break;
      case 'snow':
        g.lineStyle(2, 0xffffff);
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI) / 3;
          g.lineBetween(8 - Math.cos(a) * 7, 8 - Math.sin(a) * 7, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7);
        }
        g.fillCircle(8, 8, 2);
        break;
      case 'smoke':
        g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8);
        g.fillStyle(0xffffff, 0.5).fillCircle(8, 8, 5);
        break;
      case 'leaf':
        g.fillEllipse(8, 8, 14, 7);
        g.lineStyle(1, 0xcccccc).lineBetween(2, 8, 14, 8);
        break;
      case 'orb':
        g.fillStyle(0xffffff, 0.3).fillCircle(8, 8, 8);
        g.fillStyle(0xffffff, 0.7).fillCircle(8, 8, 5);
        g.fillStyle(0xffffff, 1).fillCircle(8, 8, 3);
        break;
    }
  });
}

// ---------------------------------------------------------------- monstros
export const MONSTER_TEX_SIZE = 128;

/** Monstro em batalha. Do lado do jogador usa <id>_back.png se existir; senão espelha a frente. */
export function monsterSprite(scene: Phaser.Scene, speciesId: string, back: boolean): SpriteRef {
  if (back && scene.textures.exists(`monsters/${speciesId}_back`)) return { key: `monsters/${speciesId}_back`, flipX: false };
  return { key: monsterTexture(scene, speciesId), flipX: back };
}

export function monsterTexture(scene: Phaser.Scene, speciesId: string): string {
  const sp = getSpecies(speciesId);
  return ensure(scene, `monsters/${speciesId}`, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE, (g) => drawCreature(g, sp));
}
