export type ItemKind = 'capture' | 'heal' | 'cure';

export interface ItemData {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  description: string;
  /** cura de HP (heal) */
  amount?: number;
  /** status curado (cure) */
  cures?: string;
  /** bônus de captura (capture) */
  catchBonus?: number;
}

export const ITEMS: Record<string, ItemData> = {
  capsula: { id: 'capsula', name: 'Cápsula', kind: 'capture', price: 200, catchBonus: 1, description: 'Usada para capturar monstros selvagens.' },
  pocao: { id: 'pocao', name: 'Poção', kind: 'heal', price: 150, amount: 30, description: 'Recupera 30 de vida de um pet.' },
  antidoto: { id: 'antidoto', name: 'Antídoto', kind: 'cure', price: 100, cures: 'envenenado', description: 'Cura o envenenamento.' },
};

export const getItem = (id: string): ItemData => {
  const it = ITEMS[id];
  if (!it) throw new Error(`Item desconhecido: ${id}`);
  return it;
};
