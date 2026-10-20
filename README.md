# Elementais: A Jornada dos Domadores

RPG de navegador de captura de monstrinhos, feito com **Phaser 3 + TypeScript + Vite**.
Funciona no computador (teclado/mouse) e no celular (toque, com direcional na tela).

## Rodar localmente

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes da lógica (Vitest)
npm run build      # build de produção em dist/
npm run smoke      # teste automático no navegador (após o build)
```

Controles: **setas/WASD** andam, **Enter/Espaço/Z** interagem, **Esc/X** abre o menu ou volta.
No celular aparecem um direcional e os botões **A** (interagir) e **B** (menu/voltar).
Para ver o direcional no PC, abra com `?pad=1` no endereço.

## Estrutura

```
src/scenes/   telas do jogo (menu, seleção, mundo, batalha...)
src/data/     dados editáveis: elementos, treinadores, monstros, mapas
src/systems/  lógica: estado do jogo, controles, áudio, placeholders
src/ui/       componentes de interface (menus, diálogo, direcional)
public/assets imagens e sons (veja abaixo)
```

## Suas imagens

Enquanto uma imagem não existir, o jogo desenha um placeholder colorido no lugar.
Basta colocar o arquivo com o **nome exato** na pasta indicada e recarregar
(no `npm run dev`, a página recarrega sozinha). Formatos aceitos: `.png`, `.webp`, `.jpg`.
Use PNG com fundo transparente para personagens e monstros.

| O quê | Arquivo | Tamanho recomendado |
|---|---|---|
| Retrato do treinador (tela de escolha) | `public/assets/trainers/<id>.png` | 320×360 (proporção 8:9) |
| Treinador andando no mapa | `public/assets/overworld/<id>.png` | 32×32, olhando para baixo* |
| Monstro (batalha e menus) | `public/assets/monsters/<espécie>.png` | 256×256 (quadrado) |
| Tiles do mapa | `public/assets/tiles/<bioma>/<tile>.png` | 32×32 |
| Prédios | `public/assets/buildings/<tipo>.png` | heal/shop 160×128, house 128×96 |
| Placa | `public/assets/objects/sign.png` | 32×32 |

\* O sprite do mapa é espelhado para olhar à esquerda; para frente/costas usa a mesma imagem.

**Ids dos treinadores:** `kael`, `marina`, `raijin`, `bruno`, `yuki`, `noctis`.
NPCs usam o id deles (ex.: `overworld/anciao.png`, `overworld/menina.png`).

**Ids das espécies:** `ignis`, `ignis_evo`, `aquaris`, `aquaris_evo`, `voltix`, `voltix_evo`,
`terragon`, `terragon_evo`, `frostelle`, `frostelle_evo`, `umbrel`, `umbrel_evo`
(a lista completa, com os selvagens, está em `src/data/monsters.ts`).

**Tiles:** biomas `vila`, `floresta` (mais nas próximas etapas); nomes `ground`, `path`,
`tallgrass`, `tree`, `water`, `rock`, `flowers`, `fence`.
Exemplo: `public/assets/tiles/floresta/tallgrass.png`.

**Prédios:** `heal` (Centro de Cura), `shop` (Loja), `house` (casa).

## Como adicionar conteúdo

- **Treinador:** `src/data/trainers.ts`
- **Monstro:** `src/data/monsters.ts`
- **Mapa:** `src/data/maps.ts` — o mapa é desenhado com texto (a legenda está no topo do arquivo).
  Rode `npm test` depois de editar: os testes avisam linhas com tamanho errado, saídas para tiles bloqueados etc.
