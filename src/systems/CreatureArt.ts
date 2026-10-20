import Phaser from 'phaser';
import { ELEMENTS, type ElementId } from '../data/elements';
import { evolutionStage, rootSpecies, type SpeciesData } from '../data/monsters';

/**
 * Desenho provisório de cada monstro, gerado a partir do elemento e da forma
 * evolutiva (enquanto as artes finais não são colocadas em public/assets/monsters).
 * Coordenadas num quadro de 128×128 (a textura é gerada em 2x).
 */

type G = Phaser.GameObjects.Graphics;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

const shade = (c: number, f: number): number => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  const k = (v: number) => Phaser.Math.Clamp(Math.round(v * f), 0, 255);
  return Phaser.Display.Color.GetColor(k(col.red), k(col.green), k(col.blue));
};
const mix = (a: number, b: number, t: number): number => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return Phaser.Display.Color.GetColor(m(ca.red, cb.red), m(ca.green, cb.green), m(ca.blue, cb.blue));
};
const hash = (s: string): number => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Cor de destaque típica de cada elemento (chamas, raios, cristais...). */
const ACCENT: Record<ElementId, number> = {
  fogo: 0xffd166, agua: 0xcaf0f8, grama: 0xd8f3dc, inseto: 0xf2e8cf, eletrico: 0x4cc9f0, terra: 0xf1e3c8,
  gelo: 0xe0fbfc, sombra: 0xc77dff, pedra: 0xced4da, vento: 0xffffff,
};

/** Traços tirados da descrição da espécie (ex.: "ouriço" → espinhos nas costas). */
interface Features {
  body: 'quad' | 'round' | 'bird';
  bigEars: boolean;
  catEars: boolean;
  horns: boolean;
  spikes: boolean;
  shell: boolean;
  antennae: boolean;
  mothWings: boolean;
  beak: boolean;
  tentacles: boolean;
  scythes: boolean;
  stinger: boolean;
  crown: boolean;
  mane: boolean;
}

function featuresOf(sp: SpeciesData): Features {
  const t = `${sp.name} ${sp.description}`.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  const fox = has(/raposa|feneco|lebre|lontra/);
  return {
    body: has(/larva|seixo|geodo|pedregulho|bolinha|água-viva|lanterna|penugem|broto saltitante/) ? 'round' : !fox && has(/pássaro|passarinho|\bave\b|águia|corvo|pinguim/) ? 'bird' : 'quad',
    bigEars: has(/feneco|lebre|orelhas enormes/),
    catEars: has(/gato|pantera|felino/),
    horns: has(/bode|cabrit|chifre|rinoceronte/),
    spikes: has(/ouriço|espinhos de|espinhos incandescentes/),
    shell: has(/besouro|carapaça|concha|tatu|armadura|couraça/),
    antennae: has(/antena|mariposa|louva-a-deus|besouro/),
    mothWings: has(/mariposa/),
    beak: has(/pássaro|passarinho|\bave\b|águia|corvo|pinguim|coruja/),
    tentacles: has(/água-viva/),
    scythes: has(/louva-a-deus/),
    stinger: has(/escorpião|ferrão/),
    crown: has(/coroa/),
    mane: has(/juba/),
  };
}

interface Ctx {
  g: G;
  k: number;
  stage: number;
  cx: number;
  headX: number;
  headY: number;
  headR: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
  tail: { x: number; y: number };
  main: number;
  dark: number;
  light: number;
  accent: number;
  f: Features;
}

// ------------------------------------------------------------------ partes por elemento
function flame(g: G, x: number, y: number, s: number): void {
  g.fillStyle(0xe63946).fillCircle(x, y, 6 * s).fillTriangle(x - 6 * s, y, x, y - 16 * s, x + 6 * s, y);
  g.fillStyle(0xff9f1c).fillCircle(x, y + 1, 4.2 * s).fillTriangle(x - 4.2 * s, y + 1, x + 1, y - 11 * s, x + 4.2 * s, y + 1);
  g.fillStyle(0xffd166).fillCircle(x, y + 2, 2.4 * s);
}

function leaf(g: G, x: number, y: number, s: number, dir: number, col: number): void {
  const tipX = x + Math.cos(dir) * 14 * s;
  const tipY = y + Math.sin(dir) * 14 * s;
  const nx = Math.cos(dir + Math.PI / 2) * 5 * s;
  const ny = Math.sin(dir + Math.PI / 2) * 5 * s;
  const mx = (x + tipX) / 2;
  const my = (y + tipY) / 2;
  g.fillStyle(col).fillPoints([V(x, y), V(mx + nx, my + ny), V(tipX, tipY), V(mx - nx, my - ny)], true);
  g.lineStyle(1, shade(col, 0.7)).lineBetween(x, y, tipX, tipY);
}

function bolt(g: G, x: number, y: number, s: number, col: number): void {
  g.fillStyle(col).fillPoints([V(x - 2 * s, y), V(x + 6 * s, y - 10 * s), V(x + 2 * s, y - 9 * s), V(x + 7 * s, y - 18 * s), V(x - 3 * s, y - 6 * s), V(x + 1 * s, y - 7 * s)], true);
}

function crystal(g: G, x: number, y: number, w: number, h: number, col: number): void {
  g.fillStyle(shade(col, 0.8)).fillPoints([V(x, y - h), V(x + w, y - h * 0.35), V(x, y), V(x - w, y - h * 0.35)], true);
  g.fillStyle(col).fillPoints([V(x, y - h), V(x, y), V(x - w, y - h * 0.35)], true);
}

function rock(g: G, x: number, y: number, s: number, col: number): void {
  g.fillStyle(col).fillPoints([V(x - 6 * s, y), V(x - 4 * s, y - 7 * s), V(x + 2 * s, y - 9 * s), V(x + 7 * s, y - 4 * s), V(x + 6 * s, y)], true);
  g.fillStyle(shade(col, 1.25)).fillPoints([V(x - 4 * s, y - 7 * s), V(x + 2 * s, y - 9 * s), V(x, y - 4 * s)], true);
}

function ears(c: Ctx, el: ElementId): void {
  const { g, headX, headY, headR, k, stage, main, dark, light, accent } = c;
  const h = headR * (1.0 + stage * 0.15);
  const ear = (side: number, tall: number, inner = true) => {
    const bx = headX + side * headR * 0.55;
    const by = headY - headR * 0.55;
    g.fillStyle(dark).fillTriangle(bx - 7 * k, by + 4, bx + side * 4 * k, by - tall, bx + 7 * k, by + 4);
    if (inner) g.fillStyle(mix(main, 0xffb4a2, 0.5)).fillTriangle(bx - 3.5 * k, by + 2, bx + side * 3 * k, by - tall * 0.7, bx + 3.5 * k, by + 2);
  };
  switch (el) {
    case 'fogo':
      ear(-1, h * 1.15);
      ear(1, h * 1.15);
      flame(c.g, headX, headY - headR * 0.85, 0.7 * k + stage * 0.15);
      break;
    case 'eletrico':
      for (const side of [-1, 1]) {
        const bx = headX + side * headR * 0.5;
        const by = headY - headR * 0.6;
        g.fillStyle(main).fillPoints([V(bx - 5 * k, by + 4), V(bx + side * 8 * k, by - h * 0.55), V(bx + side * 2 * k, by - h * 0.5), V(bx + side * 9 * k, by - h * 1.1), V(bx + 5 * k, by + 4)], true);
        g.fillStyle(0xffffff, 0.85).fillTriangle(bx + side * 5 * k, by - h * 0.75, bx + side * 9 * k, by - h * 1.1, bx + side * 7 * k, by - h * 0.6);
      }
      break;
    case 'sombra':
      for (const side of [-1, 1]) {
        const bx = headX + side * headR * 0.6;
        const by = headY - headR * 0.5;
        g.fillStyle(dark).fillPoints([V(bx - 8 * k, by + 5), V(bx + side * 6 * k, by - h * 1.05), V(bx + 9 * k * side * 0.2, by - h * 0.45), V(bx + side * 12 * k, by - h * 0.7), V(bx + 8 * k, by + 5)], true);
      }
      break;
    case 'agua':
      g.fillStyle(light).fillPoints([V(headX - 6 * k, headY - headR * 0.8), V(headX + 2 * k, headY - headR - 12 * k - stage * 4), V(headX + 8 * k, headY - headR * 0.75)], true);
      g.fillStyle(dark).fillCircle(headX - headR * 0.75, headY - headR * 0.35, 5 * k).fillCircle(headX + headR * 0.75, headY - headR * 0.35, 5 * k);
      break;
    case 'grama':
      leaf(g, headX - 3 * k, headY - headR * 0.85, k + stage * 0.2, -Math.PI * 0.62, mix(main, 0x2d6a4f, 0.3));
      leaf(g, headX + 3 * k, headY - headR * 0.85, k + stage * 0.2, -Math.PI * 0.38, light);
      break;
    case 'inseto':
      g.lineStyle(2 * k, dark);
      for (const side of [-1, 1]) {
        const ex = headX + side * (headR * 0.55 + 6 * k);
        const ey = headY - headR - 10 * k - stage * 3;
        g.beginPath().moveTo(headX + side * headR * 0.25, headY - headR * 0.8).lineTo(ex, ey).strokePath();
        g.fillStyle(accent).fillCircle(ex, ey, 3 * k);
      }
      break;
    case 'terra':
      g.fillStyle(dark).fillCircle(headX - headR * 0.7, headY - headR * 0.5, 5 * k).fillCircle(headX + headR * 0.7, headY - headR * 0.5, 5 * k);
      g.fillStyle(accent).fillTriangle(headX - 4 * k, headY - headR * 0.55, headX + 1 * k, headY - headR - 10 * k - stage * 4, headX + 5 * k, headY - headR * 0.55);
      break;
    case 'pedra':
      rock(g, headX - headR * 0.5, headY - headR * 0.6, k * (0.9 + stage * 0.2), shade(main, 0.85));
      rock(g, headX + headR * 0.35, headY - headR * 0.75, k * (1.1 + stage * 0.2), main);
      break;
    case 'gelo':
      for (const [dx, hh] of [[-8, 14], [0, 20], [8, 14]] as const) crystal(g, headX + dx * k, headY - headR * 0.7, 4 * k, (hh + stage * 5) * k, accent);
      g.fillStyle(dark).fillTriangle(headX - headR * 0.85, headY - headR * 0.2, headX - headR * 0.6, headY - headR - 4 * k, headX - headR * 0.3, headY - headR * 0.6);
      g.fillStyle(dark).fillTriangle(headX + headR * 0.85, headY - headR * 0.2, headX + headR * 0.6, headY - headR - 4 * k, headX + headR * 0.3, headY - headR * 0.6);
      break;
    case 'vento':
      for (let i = 0; i < 3 + stage; i++) {
        const a = -Math.PI / 2 + (i - (2 + stage) / 2) * 0.35;
        const x0 = headX + Math.cos(a) * headR * 0.7;
        const y0 = headY + Math.sin(a) * headR * 0.7;
        g.fillStyle(i % 2 ? light : accent).fillTriangle(x0 - 3 * k, y0, x0 + Math.cos(a) * 16 * k + 4 * k, y0 + Math.sin(a) * 16 * k, x0 + 3 * k, y0);
      }
      break;
  }
}

function tailTip(c: Ctx, el: ElementId): void {
  const { g, tail, k, stage, main, light, accent, dark } = c;
  const s = k * (0.9 + stage * 0.25);
  switch (el) {
    case 'fogo': flame(g, tail.x, tail.y, s * 1.2); break;
    case 'agua': g.fillStyle(light).fillTriangle(tail.x, tail.y, tail.x - 12 * s, tail.y - 10 * s, tail.x - 3 * s, tail.y + 2).fillTriangle(tail.x, tail.y, tail.x + 12 * s, tail.y - 8 * s, tail.x + 3 * s, tail.y + 3); break;
    case 'grama': leaf(g, tail.x, tail.y, s * 1.1, -Math.PI * 0.3, light); break;
    case 'inseto': g.fillStyle(dark).fillTriangle(tail.x - 4 * s, tail.y + 2, tail.x + 6 * s, tail.y - 10 * s, tail.x + 4 * s, tail.y + 3); break;
    case 'eletrico': bolt(g, tail.x, tail.y + 4, s * 1.1, 0xffee32); break;
    case 'terra': g.fillStyle(dark).fillCircle(tail.x, tail.y, 6 * s); g.fillStyle(accent).fillCircle(tail.x - 2, tail.y - 2, 2 * s); break;
    case 'pedra': rock(g, tail.x, tail.y + 4, s * 1.1, shade(main, 0.9)); break;
    case 'gelo': crystal(g, tail.x, tail.y + 4, 5 * s, 16 * s, accent); break;
    case 'sombra': for (let i = 0; i < 4; i++) g.fillStyle(mix(main, 0x10002b, 0.3), 0.55 - i * 0.1).fillCircle(tail.x + i * 4 * s, tail.y - i * 5 * s, (6 - i) * s); break;
    case 'vento': for (let i = 0; i < 3; i++) g.fillStyle(i % 2 ? accent : light).fillTriangle(tail.x, tail.y, tail.x + (8 + i * 3) * s, tail.y - (14 - i * 5) * s, tail.x + 4 * s, tail.y + 2); break;
  }
}

function wings(c: Ctx, el: ElementId): void {
  const { g, cx, bodyY, bodyW, k, stage, light, dark, accent, main } = c;
  const span = bodyW * (0.55 + stage * 0.18);
  for (const side of [-1, 1]) {
    const x0 = cx + side * bodyW * 0.15;
    const y0 = bodyY - c.bodyH * 0.3;
    if (el === 'inseto') {
      g.fillStyle(0xffffff, 0.45).fillEllipse(x0 + side * span * 0.6, y0 - 10 * k, span, 16 * k);
      g.lineStyle(1, dark, 0.6).strokeEllipse(x0 + side * span * 0.6, y0 - 10 * k, span, 16 * k);
    } else if (el === 'sombra') {
      g.fillStyle(shade(main, 0.45)).fillPoints([V(x0, y0), V(x0 + side * span * 1.3, y0 - 22 * k), V(x0 + side * span * 1.1, y0 - 4 * k), V(x0 + side * span * 0.8, y0 + 4 * k), V(x0 + side * span * 0.4, y0 + 2 * k)], true);
    } else {
      for (let f = 0; f < 3; f++) g.fillStyle(f % 2 ? light : accent).fillTriangle(x0, y0 + f * 4 * k, x0 + side * span * (1.2 - f * 0.2), y0 - (18 - f * 6) * k, x0 + side * span * 0.3, y0 + 6 * k + f * 3 * k);
    }
  }
}

/** Tom da linha evolutiva: mesmo elemento, mas cada linha com sua variação de matiz/brilho. */
function lineColor(base: number, hv: number, stage: number): number {
  const c = Phaser.Display.Color.IntegerToColor(base);
  const hsv = Phaser.Display.Color.RGBToHSV(c.red, c.green, c.blue);
  const h = (hsv.h + (hv - 0.5) * 0.1 + 1) % 1;
  const sat = Phaser.Math.Clamp(hsv.s * (0.85 + ((hv * 7) % 1) * 0.3), 0, 1);
  const val = Phaser.Math.Clamp(hsv.v * (0.9 + ((hv * 13) % 1) * 0.15) * (1 - stage * 0.05), 0, 1);
  return Phaser.Display.Color.HSVToRGB(h, sat, val).color;
}

function horns(c: Ctx): void {
  const { g, headX, headY, headR, k, stage, accent } = c;
  const col = c.f.horns && c.stage >= 2 ? 0xff7b00 : mix(accent, 0x6c584c, 0.4);
  for (const side of [-1, 1]) {
    const pts: Phaser.Math.Vector2[] = [];
    const len = (10 + stage * 6) * k;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(V(headX + side * (headR * 0.45 + t * len * 0.9), headY - headR * 0.75 - Math.sin(t * Math.PI * 0.8) * len));
    }
    g.lineStyle((5 - stage * 0) * k, col).strokePoints(pts);
  }
}

function shell(c: Ctx): void {
  const { g, cx, bodyY, bodyW, bodyH, k, main, dark } = c;
  const col = shade(main, 1.12);
  g.fillStyle(col).fillEllipse(cx + 3 * k, bodyY - bodyH * 0.22, bodyW * 0.85, bodyH * 0.75);
  g.lineStyle(1.5, dark).strokeEllipse(cx + 3 * k, bodyY - bodyH * 0.22, bodyW * 0.85, bodyH * 0.75);
  g.lineBetween(cx + 3 * k, bodyY - bodyH * 0.58, cx + 3 * k, bodyY + bodyH * 0.12);
  g.lineBetween(cx - bodyW * 0.3, bodyY - bodyH * 0.22, cx + bodyW * 0.45, bodyY - bodyH * 0.22);
}

function backSpikes(c: Ctx, count: number): void {
  const { g, cx, bodyY, bodyW, bodyH, k, stage } = c;
  const col = c.f.spikes && (c.main & 0xff0000) > 0x900000 ? 0xff9f1c : c.accent;
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const a = Math.PI * (1.15 + t * 0.7);
    const x = cx + Math.cos(a) * bodyW * 0.45;
    const y = bodyY + Math.sin(a) * bodyH * 0.5;
    const len = (6 + stage * 3) * k;
    g.fillStyle(i % 2 ? col : shade(col, 0.85)).fillTriangle(x - 3 * k, y + 2, x + Math.cos(a) * len, y + Math.sin(a) * len, x + 3 * k, y + 2);
  }
}

function mothWings(c: Ctx): void {
  const { g, cx, bodyY, k, stage } = c;
  const span = (34 + stage * 8) * k;
  const cols = [0xd9480f, 0xf08c00, 0xfab005];
  for (const side of [-1, 1]) {
    for (let w = 0; w < 2; w++) {
      const y0 = bodyY - (w ? 4 : 22) * k;
      const x1 = cx + side * span * (w ? 0.85 : 1);
      g.fillStyle(cols[w + (stage > 1 ? 1 : 0)], 0.92).fillPoints([V(cx, y0), V(x1, y0 - (w ? 4 : 20) * k), V(x1 + side * 4 * k, y0 + (w ? 18 : 6) * k), V(cx + side * span * 0.3, y0 + 14 * k)], true);
      g.lineStyle(1, 0x7f4f24, 0.7).lineBetween(cx, y0, x1, y0 - (w ? 0 : 12) * k);
    }
  }
}

function scythes(c: Ctx): void {
  const { g, cx, bodyY, bodyH, k, light, dark } = c;
  for (const side of [-1, 1]) {
    const x = cx + side * 10 * k;
    const y = bodyY - bodyH * 0.2;
    g.lineStyle(4 * k, dark).beginPath().moveTo(x, y).lineTo(x + side * 10 * k, y - 10 * k).strokePath();
    g.fillStyle(light).fillTriangle(x + side * 10 * k, y - 10 * k, x + side * 18 * k, y - 2 * k, x + side * 8 * k, y - 4 * k);
    g.fillStyle(0x2d6a4f).fillCircle(x + side * 13 * k, y - 4 * k, 1.5 * k);
  }
}

function tentacles(c: Ctx, bottom: number): void {
  const { g, cx, k, light, accent } = c;
  for (let i = 0; i < 5; i++) {
    const x0 = cx + (i - 2) * 9 * k;
    const pts: Phaser.Math.Vector2[] = [];
    for (let j = 0; j <= 6; j++) pts.push(V(x0 + Math.sin(j * 1.1 + i) * 3 * k, bottom + j * 3.2 * k));
    g.lineStyle(3 * k, i % 2 ? light : accent, 0.9).strokePoints(pts);
  }
}

/** Desenha a criatura no Graphics (quadro 128×128). */
export function drawCreature(g: G, sp: SpeciesData): void {
  const el = sp.types[0];
  const el2 = sp.types[1];
  const stage = Math.min(2, evolutionStage(sp.id));
  const f = featuresOf(sp);
  const k = [0.92, 1.06, 1.2][stage];
  const hv = (hash(rootSpecies(sp.id)) % 1000) / 1000;
  const main = lineColor(ELEMENTS[el].color, hv, stage);
  const c: Ctx = {
    g, k, stage, f, cx: 62, main,
    dark: shade(main, 0.6),
    light: shade(main, 1.3),
    accent: el2 ? ELEMENTS[el2].color : ACCENT[el],
    headX: 0, headY: 0, headR: 0, bodyY: 0, bodyW: 0, bodyH: 0, tail: { x: 0, y: 0 },
  };
  const ground = 124;
  const belly = mix(main, 0xfff1e6, 0.55);

  // ---------- medidas por tipo de corpo
  if (f.body === 'round') {
    const R = (sp.shape === 'square' ? 30 : 28) * k;
    c.bodyW = R * 2;
    c.bodyH = R * 2;
    c.bodyY = ground - R - (f.tentacles ? 22 * k : 4 * k);
    c.headX = c.cx;
    c.headY = c.bodyY;
    c.headR = R;
    c.tail = { x: c.cx + R * 0.95, y: c.bodyY - R * 0.6 };
  } else if (f.body === 'bird') {
    c.bodyW = 34 * k;
    c.bodyH = 40 * k;
    c.bodyY = ground - 12 * k - c.bodyH / 2;
    c.headR = 18 * k;
    c.headX = c.cx - 3 * k;
    c.headY = c.bodyY - c.bodyH * 0.42 - c.headR * 0.55;
    c.tail = { x: c.cx + c.bodyW * 0.6, y: c.bodyY + c.bodyH * 0.2 };
  } else {
    const shapeW = sp.shape === 'square' ? 1.15 : sp.shape === 'blob' || sp.shape === 'circle' ? 1.06 : sp.shape === 'triangle' || sp.shape === 'diamond' ? 0.92 : 1;
    c.bodyW = 46 * k * shapeW;
    c.bodyH = 32 * k * (sp.shape === 'square' ? 1.1 : 1);
    c.bodyY = ground - 12 * k - c.bodyH * 0.4;
    c.headR = (stage === 0 ? 23 : 20) * k * (sp.shape === 'square' ? 1.05 : 1);
    c.headX = c.cx - 4 * k;
    c.headY = c.bodyY - c.bodyH * 0.45 - c.headR * 0.6;
    c.tail = { x: c.cx + c.bodyW * 0.62 + 12 * k, y: c.bodyY - c.bodyH * 0.5 - 18 * k };
  }

  // ---------- atrás do corpo
  g.fillStyle(0x000000, 0.25).fillEllipse(c.cx, ground, Math.max(c.bodyW * 1.4, 40), 9);
  if (stage === 2) {
    g.fillStyle(c.accent, 0.16).fillCircle(c.headX, c.headY - 2, c.headR + 18 * k);
    g.lineStyle(2, c.accent, 0.55).strokeCircle(c.headX, c.headY - 2, c.headR + 18 * k);
  }
  if (f.mothWings) mothWings(c);
  else if (f.body === 'bird' || el === 'vento' || el2 === 'vento') wings(c, 'vento');
  else if (el === 'inseto' || el2 === 'inseto') wings(c, 'inseto');
  else if (el === 'sombra' && stage === 2) wings(c, 'sombra');
  if (f.mane) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = c.headR + (8 + stage * 4) * k;
      g.fillStyle(i % 2 ? c.accent : shade(c.accent, 0.8)).fillTriangle(c.headX + Math.cos(a - 0.25) * c.headR * 0.8, c.headY + Math.sin(a - 0.25) * c.headR * 0.8, c.headX + Math.cos(a) * len, c.headY + Math.sin(a) * len, c.headX + Math.cos(a + 0.25) * c.headR * 0.8, c.headY + Math.sin(a + 0.25) * c.headR * 0.8);
    }
  }
  if (f.body === 'quad') {
    // cauda: bolinhas que afinam até a ponta (ferrão curvo no escorpião)
    const t0 = { x: c.cx + c.bodyW * 0.42, y: c.bodyY };
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = t0.x + (c.tail.x - t0.x) * t - (f.stinger ? Math.sin(t * Math.PI) * 6 * k : 0);
      const y = t0.y + (c.tail.y - t0.y) * t * t;
      g.fillStyle(i % 3 === 0 ? c.dark : c.main).fillCircle(x, y, (7 - t * 4) * k);
    }
    if (f.stinger) g.fillStyle(c.accent).fillTriangle(c.tail.x - 5 * k, c.tail.y, c.tail.x - 12 * k, c.tail.y + 10 * k, c.tail.x + 2 * k, c.tail.y + 4 * k);
    else tailTip(c, el);
  } else if (f.body === 'bird') {
    for (let i = 0; i < 3; i++) g.fillStyle(i % 2 ? c.light : c.dark).fillTriangle(c.tail.x - 6 * k, c.tail.y - 4 * k, c.tail.x + (12 + i * 2) * k, c.tail.y + (i * 6 - 4) * k, c.tail.x - 4 * k, c.tail.y + 6 * k);
  }

  // ---------- corpo
  if (f.body === 'round') {
    if (f.tentacles) tentacles(c, c.bodyY + c.headR * 0.6);
    else g.fillStyle(c.dark).fillEllipse(c.cx - c.headR * 0.45, ground - 3 * k, 14 * k, 7 * k).fillEllipse(c.cx + c.headR * 0.45, ground - 3 * k, 14 * k, 7 * k);
    if (f.tentacles) g.fillStyle(c.main, 0.85).fillEllipse(c.cx, c.bodyY, c.headR * 2.1, c.headR * 1.7);
    else g.fillStyle(c.main).fillCircle(c.cx, c.bodyY, c.headR);
    g.lineStyle(2, c.dark, 0.8).strokeCircle(c.cx, c.bodyY, c.headR);
    g.fillStyle(belly).fillEllipse(c.cx, c.bodyY + c.headR * 0.5, c.headR * 1.1, c.headR * 0.6);
    if (f.shell || el === 'pedra') backSpikes(c, 3 + stage * 2);
  } else {
    const legH = 12 * k;
    const leg = (x: number, col: number, thin = false) => {
      if (thin) {
        g.lineStyle(2.5 * k, 0xf4a261).lineBetween(x, c.bodyY + c.bodyH * 0.3, x, ground - 2);
        g.fillStyle(0xf4a261).fillEllipse(x + 2 * k, ground - 1, 9 * k, 3 * k);
        return;
      }
      g.fillStyle(col).fillRoundedRect(x - 4.5 * k, c.bodyY, 9 * k, legH + c.bodyH * 0.3, 4 * k);
      g.fillStyle(shade(col, 0.6)).fillEllipse(x, ground - 1, 11 * k, 5 * k);
    };
    if (f.body === 'quad') {
      leg(c.cx - c.bodyW * 0.34, c.dark);
      leg(c.cx + c.bodyW * 0.34, c.dark);
    }
    g.fillStyle(c.main).fillEllipse(c.cx, c.bodyY, c.bodyW, c.bodyH);
    g.lineStyle(2, c.dark, 0.8).strokeEllipse(c.cx, c.bodyY, c.bodyW, c.bodyH);
    g.fillStyle(belly).fillEllipse(c.cx - 3 * k, c.bodyY + c.bodyH * 0.12, c.bodyW * 0.5, c.bodyH * 0.55);
    if (f.shell) shell(c);
    if (f.spikes) backSpikes(c, 7 + stage * 2);
    else if (stage >= 1) backSpikes(c, 2 + stage * 2);
    if (stage >= 1) {
      for (let i = 0; i < stage + 1; i++) {
        const x = c.cx + c.bodyW * (0.12 + i * 0.12);
        const y = c.bodyY + (i % 2 ? 4 : -3) * k;
        g.fillStyle(c.accent, 0.85).fillPoints([V(x, y - 3 * k), V(x + 3 * k, y), V(x, y + 3 * k), V(x - 3 * k, y)], true);
      }
    }
    if (el === 'pedra' || el2 === 'pedra') g.lineStyle(1.5, c.dark, 0.9).beginPath().moveTo(c.cx - 8 * k, c.bodyY - 8 * k).lineTo(c.cx - 3 * k, c.bodyY).lineTo(c.cx - 7 * k, c.bodyY + 7 * k).strokePath();
    if (f.body === 'quad') {
      leg(c.cx - c.bodyW * 0.18, c.main);
      leg(c.cx + c.bodyW * 0.16, c.main);
    } else {
      leg(c.cx - 6 * k, c.main, true);
      leg(c.cx + 6 * k, c.main, true);
    }
    if (f.scythes) scythes(c);
  }

  // ---------- cabeça
  if (f.body !== 'round') {
    if (f.catEars) {
      for (const side of [-1, 1]) {
        const bx = c.headX + side * c.headR * 0.55;
        const by = c.headY - c.headR * 0.5;
        g.fillStyle(c.dark).fillTriangle(bx - 8 * k, by + 4, bx + side * 2 * k, by - (16 + stage * 3) * k, bx + 8 * k, by + 4);
        g.fillStyle(c.accent, 0.8).fillTriangle(bx - 4 * k, by + 2, bx + side * 1 * k, by - (10 + stage * 2) * k, bx + 4 * k, by + 2);
      }
    } else if (f.bigEars) {
      for (const side of [-1, 1]) {
        const bx = c.headX + side * c.headR * 0.5;
        const by = c.headY - c.headR * 0.45;
        const tall = (30 + stage * 6) * k;
        g.fillStyle(c.dark).fillTriangle(bx - 9 * k, by + 6, bx + side * 10 * k, by - tall, bx + 9 * k, by + 4);
        g.fillStyle(mix(c.main, 0xffd6a5, 0.6)).fillTriangle(bx - 5 * k, by + 3, bx + side * 8 * k, by - tall * 0.75, bx + 5 * k, by + 2);
      }
      if (el === 'fogo') flame(g, c.headX, c.headY - c.headR * 0.85, 0.6 * k + stage * 0.15);
    } else if (!f.beak || f.body !== 'bird') ears(c, el);
    if (f.beak && f.body === 'bird') {
      for (const side of [-1, 1]) g.fillStyle(c.dark).fillTriangle(c.headX + side * c.headR * 0.3, c.headY - c.headR * 0.7, c.headX + side * c.headR * 0.75, c.headY - c.headR * 1.25 - stage * 3, c.headX + side * c.headR * 0.8, c.headY - c.headR * 0.45);
    }
  } else {
    // corpo redondo: o "topo" é a cabeça
    if (el === 'pedra' || f.shell) ears(c, 'pedra');
    else if (!f.tentacles) ears(c, el);
  }
  if (f.horns) horns(c);
  if (f.antennae && !(el === 'inseto' && f.body !== 'round')) ears(c, 'inseto');
  if (f.body !== 'round') {
    g.fillStyle(c.main).fillCircle(c.headX, c.headY, c.headR);
    g.lineStyle(2, c.dark, 0.8).strokeCircle(c.headX, c.headY, c.headR);
    g.fillStyle(mix(c.main, 0xfff1e6, 0.5)).fillEllipse(c.headX, c.headY + c.headR * 0.45, c.headR * 1.1, c.headR * 0.7);
  }
  if (f.crown) {
    for (let i = 0; i < 5; i++) {
      const x = c.headX + (i - 2) * 6 * k;
      const top = c.headY - c.headR - (i % 2 ? 8 : 13) * k;
      g.fillStyle(i % 2 ? 0xff8fab : 0xff4d6d).fillTriangle(x - 3 * k, c.headY - c.headR * 0.8, x, top, x + 3 * k, c.headY - c.headR * 0.8);
    }
  }
  if (el2 && el2 !== el) g.fillStyle(ELEMENTS[el2].color).fillCircle(c.headX, c.headY - c.headR * 0.6, 3 * k);

  // ---------- rosto
  const er = c.headR * (stage === 0 ? 0.3 : 0.26) * (f.body === 'round' ? 0.8 : 1);
  const eyH = stage === 2 ? 0.78 : 1;
  const iris = el === 'sombra' ? 0xc77dff : el === 'fogo' ? 0xffb703 : el === 'gelo' ? 0x48cae4 : el === 'grama' && f.mothWings ? 0xff9f1c : 0x1d1d2b;
  const eyeY = c.headY - c.headR * (f.body === 'round' ? 0.2 : 0.05);
  for (const side of [-1, 1]) {
    const ex = c.headX + side * c.headR * 0.4;
    g.fillStyle(0xffffff).fillEllipse(ex, eyeY, er * 2, er * 2.2 * eyH);
    g.fillStyle(iris).fillEllipse(ex + side * 0.5, eyeY + 1, er * 1.3, er * 1.6 * eyH);
    g.fillStyle(0x10101a).fillEllipse(ex + side * 0.5, eyeY + 1.5, er * 0.7, er * 1.0 * eyH);
    g.fillStyle(0xffffff).fillCircle(ex - er * 0.3, eyeY - er * 0.4, er * 0.32).fillCircle(ex + er * 0.25, eyeY + er * 0.35, er * 0.15);
  }
  const mouthY = eyeY + c.headR * 0.45;
  if (f.beak) {
    g.fillStyle(0xf4a261).fillTriangle(c.headX - 5 * k, mouthY - 3 * k, c.headX + 5 * k, mouthY - 3 * k, c.headX, mouthY + 6 * k);
  } else {
    g.lineStyle(1.6, 0x3d1f1f).beginPath().arc(c.headX, mouthY, c.headR * 0.14, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
  }
  if (stage === 0) g.fillStyle(0xff8fa3, 0.5).fillEllipse(c.headX - c.headR * 0.62, eyeY + c.headR * 0.35, 7 * k, 4 * k).fillEllipse(c.headX + c.headR * 0.62, eyeY + c.headR * 0.35, 7 * k, 4 * k);
}
