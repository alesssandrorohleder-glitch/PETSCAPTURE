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

**Regras gerais**
- Personagens e monstros precisam de **fundo transparente** (PNG ou WebP). Fichas com várias vistas
  (frente/lado/costas) precisam ser **recortadas em arquivos separados**, uma vista por arquivo, sem o texto.
- **Qualquer proporção funciona**: o jogo encaixa a imagem no espaço sem distorcer.
- Deixe pouca margem vazia em volta do desenho (recorte rente), senão ele aparece pequeno.

| O quê | Arquivo | Tamanho recomendado |
|---|---|---|
| Retrato do treinador (tela de escolha) | `public/assets/trainers/<id>.png` | ~400 px de altura (busto ou corpo inteiro) |
| Treinador no mapa — frente | `public/assets/overworld/<id>_down.png` | ~64×96 (corpo inteiro pequeno) |
| Treinador no mapa — costas | `public/assets/overworld/<id>_up.png` | ~64×96 |
| Treinador no mapa — lado | `public/assets/overworld/<id>_side.png` | ~64×96, **olhando para a DIREITA** (o jogo espelha para a esquerda) |
| Monstro — frente (inimigo, menus) | `public/assets/monsters/<espécie>.png` | ~256×256 |
| Monstro — costas (seu pet na batalha) | `public/assets/monsters/<espécie>_back.png` | ~256×256 (opcional: sem ela, a frente é espelhada) |
| Tiles do mapa | `public/assets/tiles/<bioma>/<tile>.png` | 32×32 |
| Prédios | `public/assets/buildings/<tipo>.png` | heal/shop 160×128, house 128×96 |
| Placa | `public/assets/objects/sign.png` | 32×32 |

Se você tiver só uma imagem do personagem para o mapa, use `overworld/<id>.png` (será espelhada ao andar para a esquerda).

**Exemplo com a ficha do Kael/Ignis:**
```
public/assets/trainers/kael.png          ← "Front view" do Kael
public/assets/overworld/kael_down.png    ← "Front view" reduzida
public/assets/overworld/kael_side.png    ← "Side view" (virada para a direita)
public/assets/overworld/kael_up.png      ← "Back view" reduzida
public/assets/monsters/ignis.png         ← "Front view" do Ignis
public/assets/monsters/ignis_back.png    ← "Back view" do Ignis
```

**Ids dos treinadores:** `kael`, `marina`, `raijin`, `bruno`, `yuki`, `noctis`.
NPCs usam o id deles (ex.: `overworld/anciao_down.png`, `overworld/menina_down.png`).

**Ids das espécies:**
- Pets: `ignis`, `aquaris`, `voltix`, `terragon`, `frostelle`, `umbrel` e as formas evoluídas com `_evo` (ex.: `ignis_evo`)
- Floresta: `verdakor`, `larvilo`, `brotinho`
- Praia: `conchilo`, `medulume`
- Planalto: `zumbolt`, `voltabico`
- Cânion: `pedrusco`, `escorpedra`
- Picos: `pinguelo`, `nevasco`
- Ruínas: `sombrelo`, `corvanoite`

**Tiles:** biomas `vila`, `floresta`, `praia`, `planalto`, `canion`, `picos`, `ruinas`;
nomes `ground`, `path`, `tallgrass`, `tree`, `water`, `rock`, `flowers`, `fence`.
Exemplo: `public/assets/tiles/picos/tallgrass.png`. (Em cada bioma, `tree` é o obstáculo:
palmeira na praia, pinheiro nos picos, coluna nas ruínas…)

**Prédios:** `heal` (Centro/Posto de Cura), `shop` (Loja), `house` (casa).

## Como adicionar conteúdo

- **Treinador:** `src/data/trainers.ts`
- **Monstro:** `src/data/monsters.ts`
- **Mapa:** `src/data/maps.ts` — o mapa é desenhado com texto (a legenda está no topo do arquivo).
  Rode `npm test` depois de editar: os testes avisam linhas com tamanho errado, saídas para tiles bloqueados etc.
