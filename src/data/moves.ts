import type { ElementId } from './elements';
import type { StatusId } from '../systems/Monster';

export type StatKey = 'atk' | 'def' | 'spd' | 'acc';

/** Efeitos extras de um golpe. `chance` vai de 0 a 1 (padrão 1). */
export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance?: number }
  | { kind: 'stat'; stat: StatKey; stages: number; target: 'self' | 'enemy'; chance?: number }
  | { kind: 'heal'; fraction: number }
  | { kind: 'drain'; fraction: number }
  | { kind: 'shield'; reduction: number; turns: number }
  | { kind: 'protect' }
  | { kind: 'evade' }
  | { kind: 'reflect'; fraction: number; turns: number }
  | { kind: 'dot'; fraction: number; turns: number }
  | { kind: 'stun'; chance: number };

export interface MoveData {
  id: string;
  name: string;
  type: ElementId;
  /** 0 = golpe de status (não causa dano) */
  power: number;
  /** 0–100 */
  accuracy: number;
  description: string;
  priority?: number;
  /** chance de crítico (padrão 1/16) */
  critRate?: number;
  /** [mín, máx] de acertos */
  hits?: [number, number];
  /** Golpe supremo: 1 uso por batalha */
  supreme?: boolean;
  effects?: MoveEffect[];
}

const m = (d: MoveData): MoveData => d;

export const MOVES: Record<string, MoveData> = {
  // ------------------------------------------------ Fogo (Ignis)
  faisca: m({ id: 'faisca', name: 'Faísca', type: 'fogo', power: 40, accuracy: 100, description: 'Uma pequena explosão de fagulhas.' }),
  cauda_brasa: m({ id: 'cauda_brasa', name: 'Cauda Brasa', type: 'fogo', power: 55, accuracy: 95, description: 'Golpeia com a cauda em chamas.' }),
  garra_ignea: m({ id: 'garra_ignea', name: 'Garra Ígnea', type: 'fogo', power: 65, accuracy: 95, critRate: 0.3, description: 'Garras flamejantes. Chance alta de crítico.' }),
  escudo_chamas: m({ id: 'escudo_chamas', name: 'Escudo de Chamas', type: 'fogo', power: 0, accuracy: 100, description: 'Reduz pela metade o dano recebido por 2 turnos.', effects: [{ kind: 'shield', reduction: 0.5, turns: 2 }] }),
  rajada_solar: m({ id: 'rajada_solar', name: 'Rajada Solar', type: 'fogo', power: 90, accuracy: 90, description: 'Um feixe concentrado de calor solar.' }),
  fenix_ancestral: m({ id: 'fenix_ancestral', name: 'Fênix Ancestral', type: 'fogo', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: invoca o espírito de uma fênix.' }),

  // ------------------------------------------------ Água (Aquaris)
  jato_dagua: m({ id: 'jato_dagua', name: "Jato d'Água", type: 'agua', power: 40, accuracy: 100, description: 'Dispara um jato de água.' }),
  bolha_prisao: m({ id: 'bolha_prisao', name: 'Bolha Prisão', type: 'agua', power: 45, accuracy: 95, description: 'Prende o alvo numa bolha. Reduz a velocidade.', effects: [{ kind: 'stat', stat: 'spd', stages: -1, target: 'enemy' }] }),
  onda_cortante: m({ id: 'onda_cortante', name: 'Onda Cortante', type: 'agua', power: 65, accuracy: 95, description: 'Uma onda afiada como lâmina.' }),
  cura_mare: m({ id: 'cura_mare', name: 'Cura da Maré', type: 'agua', power: 0, accuracy: 100, description: 'Recupera metade da vida.', effects: [{ kind: 'heal', fraction: 0.5 }] }),
  redemoinho: m({ id: 'redemoinho', name: 'Redemoinho', type: 'agua', power: 70, accuracy: 90, description: 'Prende o alvo num redemoinho: dano extra por 2 turnos.', effects: [{ kind: 'dot', fraction: 1 / 8, turns: 2 }] }),
  tsunami_abissal: m({ id: 'tsunami_abissal', name: 'Tsunami Abissal', type: 'agua', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: uma onda gigante das profundezas.' }),

  // ------------------------------------------------ Elétrico (Voltix)
  choque: m({ id: 'choque', name: 'Choque', type: 'eletrico', power: 40, accuracy: 100, description: 'Uma descarga elétrica.' }),
  investida_relampago: m({ id: 'investida_relampago', name: 'Investida Relâmpago', type: 'eletrico', power: 45, accuracy: 100, priority: 1, description: 'Sempre ataca primeiro.' }),
  campo_magnetico: m({ id: 'campo_magnetico', name: 'Campo Magnético', type: 'eletrico', power: 0, accuracy: 100, description: 'Aumenta muito a defesa.', effects: [{ kind: 'stat', stat: 'def', stages: 2, target: 'self' }] }),
  paralisia: m({ id: 'paralisia', name: 'Paralisia', type: 'eletrico', power: 0, accuracy: 90, description: 'Paralisa o alvo: ele pode perder o turno.', effects: [{ kind: 'status', status: 'paralisado' }] }),
  trovao_celeste: m({ id: 'trovao_celeste', name: 'Trovão Celeste', type: 'eletrico', power: 90, accuracy: 85, description: 'Um raio cai do céu. Pode paralisar.', effects: [{ kind: 'status', status: 'paralisado', chance: 0.1 }] }),
  tempestade_mil_raios: m({ id: 'tempestade_mil_raios', name: 'Tempestade de Mil Raios', type: 'eletrico', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: uma tempestade de raios.' }),

  // ------------------------------------------------ Terra (Terragon)
  arremesso_pedra: m({ id: 'arremesso_pedra', name: 'Arremesso de Pedra', type: 'terra', power: 40, accuracy: 100, description: 'Atira uma pedra.' }),
  rolar_blindado: m({ id: 'rolar_blindado', name: 'Rolar Blindado', type: 'terra', power: 55, accuracy: 95, description: 'Rola encouraçado. Aumenta a defesa.', effects: [{ kind: 'stat', stat: 'def', stages: 1, target: 'self' }] }),
  muralha_rocha: m({ id: 'muralha_rocha', name: 'Muralha de Rocha', type: 'terra', power: 0, accuracy: 100, description: 'Bloqueia o próximo golpe recebido.', effects: [{ kind: 'protect' }] }),
  tremor: m({ id: 'tremor', name: 'Tremor', type: 'terra', power: 60, accuracy: 95, description: 'Sacode o chão. Pode atordoar o alvo.', effects: [{ kind: 'stun', chance: 0.3 }] }),
  lanca_cristal: m({ id: 'lanca_cristal', name: 'Lança de Cristal', type: 'terra', power: 90, accuracy: 90, critRate: 0.2, description: 'Uma lança de cristal afiada.' }),
  furia_montanha: m({ id: 'furia_montanha', name: 'Fúria da Montanha', type: 'terra', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: a montanha inteira desaba.' }),

  // ------------------------------------------------ Gelo (Frostelle)
  rajada_gelida: m({ id: 'rajada_gelida', name: 'Rajada Gélida', type: 'gelo', power: 40, accuracy: 100, description: 'Um sopro de vento gelado.' }),
  espinhos_gelo: m({ id: 'espinhos_gelo', name: 'Espinhos de Gelo', type: 'gelo', power: 55, accuracy: 95, description: 'Dispara espinhos de gelo.' }),
  espelho_congelado: m({ id: 'espelho_congelado', name: 'Espelho Congelado', type: 'gelo', power: 0, accuracy: 100, description: 'Reflete parte do dano recebido por 2 turnos.', effects: [{ kind: 'reflect', fraction: 0.4, turns: 2 }] }),
  nevasca: m({ id: 'nevasca', name: 'Nevasca', type: 'gelo', power: 75, accuracy: 85, description: 'Tempestade de neve. Pode congelar o alvo.', effects: [{ kind: 'status', status: 'congelado', chance: 0.3 }] }),
  prisao_cristal: m({ id: 'prisao_cristal', name: 'Prisão de Cristal', type: 'gelo', power: 90, accuracy: 90, description: 'Envolve o alvo em cristal. Pode congelar.', effects: [{ kind: 'status', status: 'congelado', chance: 0.2 }] }),
  aurora_eterna: m({ id: 'aurora_eterna', name: 'Aurora Eterna', type: 'gelo', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: a luz congelante da aurora.' }),

  // ------------------------------------------------ Sombra (Umbrel)
  garra_sombria: m({ id: 'garra_sombria', name: 'Garra Sombria', type: 'sombra', power: 40, accuracy: 100, description: 'Arranha com garras de sombra.' }),
  passo_fantasma: m({ id: 'passo_fantasma', name: 'Passo Fantasma', type: 'sombra', power: 0, accuracy: 100, description: 'Esquiva do próximo golpe.', effects: [{ kind: 'evade' }] }),
  ilusao: m({ id: 'ilusao', name: 'Ilusão', type: 'sombra', power: 0, accuracy: 100, description: 'Confunde o alvo: ele pode errar os golpes.', effects: [{ kind: 'stat', stat: 'acc', stages: -2, target: 'enemy' }] }),
  drenar_energia: m({ id: 'drenar_energia', name: 'Drenar Energia', type: 'sombra', power: 60, accuracy: 100, description: 'Rouba metade do dano causado como vida.', effects: [{ kind: 'drain', fraction: 0.5 }] }),
  lua_negra: m({ id: 'lua_negra', name: 'Lua Negra', type: 'sombra', power: 90, accuracy: 90, description: 'Uma lua sombria esmaga o alvo.' }),
  eclipse_total: m({ id: 'eclipse_total', name: 'Eclipse Total', type: 'sombra', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: escuridão absoluta.' }),

  // ------------------------------------------------ Grama/Inseto (Verdakor)
  folha_navalha: m({ id: 'folha_navalha', name: 'Folha Navalha', type: 'grama', power: 40, accuracy: 95, critRate: 0.2, description: 'Folhas afiadas. Chance alta de crítico.' }),
  picada_venenosa: m({ id: 'picada_venenosa', name: 'Picada Venenosa', type: 'inseto', power: 35, accuracy: 100, description: 'Pode envenenar.', effects: [{ kind: 'status', status: 'envenenado', chance: 0.4 }] }),
  chicote_vinha: m({ id: 'chicote_vinha', name: 'Chicote de Vinha', type: 'grama', power: 55, accuracy: 100, description: 'Chicoteia com vinhas espinhosas.' }),
  enxame: m({ id: 'enxame', name: 'Enxame', type: 'inseto', power: 15, accuracy: 90, hits: [2, 5], description: 'Vários golpes pequenos seguidos.' }),
  esporos_sono: m({ id: 'esporos_sono', name: 'Esporos do Sono', type: 'grama', power: 0, accuracy: 75, description: 'Faz o alvo adormecer por 1 a 2 turnos.', effects: [{ kind: 'status', status: 'adormecido' }] }),
  floresta_devoradora: m({ id: 'floresta_devoradora', name: 'Floresta Devoradora', type: 'grama', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: a floresta engole o alvo.' }),

  picada: m({ id: 'picada', name: 'Picada', type: 'inseto', power: 30, accuracy: 100, description: 'Uma picada rápida.' }),
  fio_seda: m({ id: 'fio_seda', name: 'Fio de Seda', type: 'inseto', power: 0, accuracy: 95, description: 'Enrola o alvo em seda. Reduz a velocidade.', effects: [{ kind: 'stat', stat: 'spd', stages: -1, target: 'enemy' }] }),

  absorver: m({ id: 'absorver', name: 'Absorver', type: 'grama', power: 35, accuracy: 100, description: 'Suga a energia do alvo e recupera vida.', effects: [{ kind: 'drain', fraction: 0.5 }] }),

  // ------------------------------------------------ Fogo (selvagens do Vulcão)
  brasa: m({ id: 'brasa', name: 'Brasa', type: 'fogo', power: 35, accuracy: 100, description: 'Atira uma brasa incandescente.' }),
  bafo_quente: m({ id: 'bafo_quente', name: 'Bafo Quente', type: 'fogo', power: 50, accuracy: 100, description: 'Um sopro de ar escaldante. Pode baixar a precisão.', effects: [{ kind: 'stat', stat: 'acc', stages: -1, target: 'enemy', chance: 0.3 }] }),
  chifre_magma: m({ id: 'chifre_magma', name: 'Chifre de Magma', type: 'fogo', power: 70, accuracy: 95, critRate: 0.2, description: 'Investida com chifres em brasa. Chance alta de crítico.' }),
  lava_ardente: m({ id: 'lava_ardente', name: 'Lava Ardente', type: 'fogo', power: 85, accuracy: 90, description: 'Uma onda de lava. Pode atordoar.', effects: [{ kind: 'stun', chance: 0.2 }] }),
  coracao_vulcao: m({ id: 'coracao_vulcao', name: 'Coração do Vulcão', type: 'fogo', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: o vulcão inteiro entra em erupção.' }),

  // ------------------------------------------------ Pedra
  lasca_pedra: m({ id: 'lasca_pedra', name: 'Lasca de Pedra', type: 'pedra', power: 40, accuracy: 100, description: 'Atira lascas afiadas de rocha.' }),
  po_rocha: m({ id: 'po_rocha', name: 'Pó de Rocha', type: 'pedra', power: 0, accuracy: 95, description: 'Uma nuvem de poeira: o alvo erra mais.', effects: [{ kind: 'stat', stat: 'acc', stages: -1, target: 'enemy' }] }),
  pele_granito: m({ id: 'pele_granito', name: 'Pele de Granito', type: 'pedra', power: 0, accuracy: 100, description: 'Endurece o corpo. Aumenta muito a defesa.', effects: [{ kind: 'stat', stat: 'def', stages: 2, target: 'self' }] }),
  avalanche: m({ id: 'avalanche', name: 'Avalanche Rochosa', type: 'pedra', power: 75, accuracy: 90, description: 'Rochas desabam sobre o alvo. Pode atordoar.', effects: [{ kind: 'stun', chance: 0.25 }] }),
  martelo_rocha: m({ id: 'martelo_rocha', name: 'Martelo de Rocha', type: 'pedra', power: 95, accuracy: 85, description: 'Um golpe esmagador de pedra maciça.' }),
  queda_meteoro: m({ id: 'queda_meteoro', name: 'Queda de Meteoro', type: 'pedra', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: um meteoro despenca do céu.' }),

  // ------------------------------------------------ Vento
  brisa_cortante: m({ id: 'brisa_cortante', name: 'Brisa Cortante', type: 'vento', power: 40, accuracy: 100, description: 'Uma lâmina de vento.' }),
  asa_veloz: m({ id: 'asa_veloz', name: 'Asa Veloz', type: 'vento', power: 45, accuracy: 100, priority: 1, description: 'Sempre ataca primeiro.' }),
  rajada: m({ id: 'rajada', name: 'Rajada', type: 'vento', power: 60, accuracy: 95, description: 'Uma rajada forte. Reduz a velocidade do alvo.', effects: [{ kind: 'stat', stat: 'spd', stages: -1, target: 'enemy', chance: 0.3 }] }),
  manto_nuvem: m({ id: 'manto_nuvem', name: 'Manto de Nuvem', type: 'vento', power: 0, accuracy: 100, description: 'Some entre as nuvens e esquiva do próximo golpe.', effects: [{ kind: 'evade' }] }),
  ciclone: m({ id: 'ciclone', name: 'Ciclone', type: 'vento', power: 90, accuracy: 85, description: 'Um ciclone violento. Pode atordoar.', effects: [{ kind: 'stun', chance: 0.2 }] }),
  furacao_celeste: m({ id: 'furacao_celeste', name: 'Furacão Celeste', type: 'vento', power: 140, accuracy: 100, supreme: true, description: 'SUPREMO: um furacão desce dos céus.' }),

  // ------------------------------------------------ Genérico
  investida: m({ id: 'investida', name: 'Investida', type: 'terra', power: 35, accuracy: 100, description: 'Avança contra o alvo.' }),
};

export const getMove = (id: string): MoveData => {
  const mv = MOVES[id];
  if (!mv) throw new Error(`Golpe desconhecido: ${id}`);
  return mv;
};
