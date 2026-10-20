import Phaser from 'phaser';
import type { BiomeTheme, BuildingKind, Facing } from '../data/maps';
import { getSpecies, type PlaceholderShape } from '../data/monsters';
import { ELEMENTS } from '../data/elements';
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
export function tileTexture(scene: Phaser.Scene, theme: BiomeTheme, name: string): string {
  return ensure(scene, `tiles/${theme.id}/${name}`, TILE, TILE, (g) => {
    const r = rng(name.length * 31 + theme.ground);
    const ground = () => {
      g.fillStyle(theme.ground).fillRect(0, 0, TILE, TILE);
      g.fillStyle(shade(theme.ground, 0.88));
      for (let i = 0; i < 5; i++) g.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2);
    };
    switch (name) {
      case 'ground':
        ground();
        break;
      case 'path':
        g.fillStyle(theme.path).fillRect(0, 0, TILE, TILE);
        g.fillStyle(shade(theme.path, 0.85));
        for (let i = 0; i < 6; i++) g.fillCircle(r() * 32, r() * 32, 1.5);
        break;
      case 'tallgrass':
        ground();
        g.fillStyle(theme.tallgrass);
        for (let i = 0; i < 4; i++) {
          const bx = 2 + i * 8;
          g.fillTriangle(bx, 30, bx + 3, 8 + r() * 6, bx + 6, 30);
          g.fillTriangle(bx + 3, 30, bx + 6, 14 + r() * 6, bx + 9, 30);
        }
        g.fillStyle(shade(theme.tallgrass, 0.75)).fillRect(0, 28, 32, 4);
        break;
      case 'tree':
        // o tile é só chão; a árvore em si é um objeto alto (treeTexture)
        ground();
        g.fillStyle(shade(theme.ground, 0.8)).fillEllipse(16, 26, 26, 10);
        break;
      case 'water':
        g.fillStyle(theme.water).fillRect(0, 0, TILE, TILE);
        g.lineStyle(2, shade(theme.water, 1.35), 0.8);
        g.beginPath().arc(8, 12, 5, Math.PI * 1.1, Math.PI * 1.9).strokePath();
        g.beginPath().arc(22, 24, 5, Math.PI * 1.1, Math.PI * 1.9).strokePath();
        break;
      case 'rock':
        ground();
        g.fillStyle(theme.rock).fillEllipse(16, 18, 26, 20);
        g.fillStyle(shade(theme.rock, 1.3)).fillEllipse(12, 13, 8, 5);
        break;
      case 'flowers':
        ground();
        for (let i = 0; i < 5; i++) {
          const fx = 4 + r() * 24;
          const fy = 4 + r() * 24;
          g.fillStyle(theme.flowers).fillCircle(fx, fy, 3);
          g.fillStyle(0xffffff).fillCircle(fx, fy, 1);
        }
        break;
      case 'fence':
        ground();
        g.fillStyle(0x8b5a2b).fillRect(0, 12, 32, 4).fillRect(0, 22, 32, 4).fillRect(4, 8, 4, 22).fillRect(24, 8, 4, 22);
        break;
      default:
        g.fillStyle(0xff00ff).fillRect(0, 0, TILE, TILE);
    }
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

// ---------------------------------------------------------------- monstros
function shapePath(g: Phaser.GameObjects.Graphics, shape: PlaceholderShape, cx: number, cy: number, r: number): void {
  const poly = (n: number, rot: number, inner?: number) => {
    const pts: Phaser.Math.Vector2[] = [];
    const total = inner ? n * 2 : n;
    for (let i = 0; i < total; i++) {
      const rr = inner && i % 2 ? inner : r;
      const a = rot + (i / total) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
  };
  switch (shape) {
    case 'circle': g.fillCircle(cx, cy, r); g.strokeCircle(cx, cy, r); break;
    case 'triangle': poly(3, -Math.PI / 2); break;
    case 'diamond': poly(4, -Math.PI / 2); break;
    case 'square': g.fillRoundedRect(cx - r * 0.85, cy - r * 0.75, r * 1.7, r * 1.5, 14); g.strokeRoundedRect(cx - r * 0.85, cy - r * 0.75, r * 1.7, r * 1.5, 14); break;
    case 'star': poly(5, -Math.PI / 2, r * 0.55); break;
    case 'hexagon': poly(6, 0); break;
    case 'blob': g.fillEllipse(cx, cy + r * 0.1, r * 2.1, r * 1.6); g.strokeEllipse(cx, cy + r * 0.1, r * 2.1, r * 1.6); break;
  }
}

export const MONSTER_TEX_SIZE = 128;

/** Monstro em batalha. Do lado do jogador usa <id>_back.png se existir; senão espelha a frente. */
export function monsterSprite(scene: Phaser.Scene, speciesId: string, back: boolean): SpriteRef {
  if (back && scene.textures.exists(`monsters/${speciesId}_back`)) return { key: `monsters/${speciesId}_back`, flipX: false };
  return { key: monsterTexture(scene, speciesId), flipX: back };
}

export function monsterTexture(scene: Phaser.Scene, speciesId: string): string {
  const sp = getSpecies(speciesId);
  const size = MONSTER_TEX_SIZE;
  return ensure(scene, `monsters/${speciesId}`, size, size, (g) => {
    const main = ELEMENTS[sp.types[0]].color;
    const second = sp.types[1] ? ELEMENTS[sp.types[1]].color : shade(main, 1.3);
    const evolved = sp.id.endsWith('_evo');
    const r = evolved ? 54 : 42;
    const cx = size / 2;
    const cy = size / 2 + (evolved ? 4 : 10);
    g.fillStyle(0x000000, 0.25).fillEllipse(cx, size - 8, r * 1.6, 12);
    if (evolved) {
      // "coroa" de pontas para formas evoluídas
      g.fillStyle(second);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        g.fillTriangle(cx + Math.cos(a - 0.15) * r * 0.8, cy + Math.sin(a - 0.15) * r * 0.8, cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18), cx + Math.cos(a + 0.15) * r * 0.8, cy + Math.sin(a + 0.15) * r * 0.8);
      }
    }
    g.lineStyle(4, shade(main, 0.55));
    g.fillStyle(main);
    shapePath(g, sp.shape, cx, cy, r);
    g.fillStyle(second, 0.9).fillEllipse(cx, cy + r * 0.35, r * 0.9, r * 0.45);
    // olhos
    const ey = cy - r * 0.12;
    g.fillStyle(0xffffff).fillCircle(cx - r * 0.3, ey, 9).fillCircle(cx + r * 0.3, ey, 9);
    g.fillStyle(0x1a1a2e).fillCircle(cx - r * 0.27, ey + 1, 5).fillCircle(cx + r * 0.33, ey + 1, 5);
    g.fillStyle(0xffffff).fillCircle(cx - r * 0.25, ey - 2, 1.8).fillCircle(cx + r * 0.35, ey - 2, 1.8);
  });
}
