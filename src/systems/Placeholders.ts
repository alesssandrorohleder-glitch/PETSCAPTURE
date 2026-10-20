import Phaser from 'phaser';
import type { BiomeTheme, BuildingKind, Facing } from '../data/maps';
import { getSpecies, type PlaceholderShape } from '../data/monsters';
import { ELEMENTS } from '../data/elements';
import type { TrainerData } from '../data/trainers';
import { TILE } from '../config';

/**
 * Se existir uma imagem carregada com a chave `key` (arquivo em public/assets),
 * usa a imagem. Caso contrário, desenha um placeholder e devolve a chave dele.
 */
function ensure(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (scene.textures.exists(key)) return key;
  const ph = `ph:${key}`;
  if (!scene.textures.exists(ph)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(ph, w, h);
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
        ground();
        g.fillStyle(0x6b4226).fillRect(13, 20, 6, 10);
        g.fillStyle(theme.tree).fillCircle(16, 14, 13);
        g.fillStyle(shade(theme.tree, 1.25)).fillCircle(12, 10, 5);
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

// ---------------------------------------------------------------- prédios
export function buildingTexture(scene: Phaser.Scene, kind: BuildingKind, wTiles: number, hTiles: number): string {
  const w = wTiles * TILE;
  const h = hTiles * TILE;
  const roof = kind === 'heal' ? 0xe63946 : kind === 'shop' ? 0x3a86ff : 0x9c6644;
  return ensure(scene, `buildings/${kind}`, w, h, (g) => {
    const roofH = Math.floor(h * 0.45);
    g.fillStyle(0xf1e3c8).fillRect(2, roofH - 4, w - 4, h - roofH + 4);
    g.lineStyle(2, 0x5c4a3a).strokeRect(2, roofH - 4, w - 4, h - roofH + 4);
    g.fillStyle(roof).fillTriangle(-2, roofH, w / 2, 0, w + 2, roofH);
    g.fillStyle(shade(roof, 0.75)).fillRect(0, roofH - 6, w, 6);
    // porta
    const dx = Math.floor(wTiles / 2) * TILE;
    g.fillStyle(0x5c3d2e).fillRect(dx + 6, h - 26, TILE - 12, 26);
    // janelas
    g.fillStyle(0x9ad1f5);
    g.fillRect(10, roofH + 10, 18, 14).fillRect(w - 28, roofH + 10, 18, 14);
    if (kind === 'heal') {
      g.fillStyle(0xffffff).fillRect(w / 2 - 10, roofH * 0.35, 20, 6).fillRect(w / 2 - 3, roofH * 0.35 - 7, 6, 20);
    } else if (kind === 'shop') {
      g.fillStyle(0xffd166).fillCircle(w / 2, roofH * 0.5, 9);
      g.fillStyle(0x3a86ff).fillRect(w / 2 - 2, roofH * 0.5 - 6, 4, 12);
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

export function overworldTexture(scene: Phaser.Scene, id: string, look: TrainerData['look'], facing: Facing): string {
  if (scene.textures.exists(`overworld/${id}`)) return `overworld/${id}`;
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
