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

O progresso é **salvo automaticamente** no navegador (ao trocar de mapa, depois de batalhas, a cada 30 s e
ao fechar a aba) e também pelo menu **☰ Menu → Salvar**. No menu inicial, use **Continuar**.

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
| Tiles do mapa | `public/assets/tiles/<bioma>/<tile>.png` | 64×64 (exibido em 32×32 de layout) |
| Árvore/obstáculo alto do bioma | `public/assets/objects/tree_<bioma>.png` | 88×120, base no rodapé da imagem |
| Prédios | `public/assets/buildings/<tipo>.png` | heal/shop 320×256, house 256×192 |
| Placa | `public/assets/objects/sign.png` | 64×64 |
| Cápsula de captura | `public/assets/objects/capsule.png` | 56×40 |

O jogo roda em **Full HD (1920×1080)**. O layout interno usa 960×540 com zoom 2, por isso os
tamanhos acima são o dobro das medidas "de layout" — use imagens nesse tamanho (ou maiores) para ficarem nítidas.

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
Treinadores andarilhos (1 por mapa, em `src/data/wanderers.ts`): `w_pedrinho`, `w_bia`, `w_davi`,
`w_lucia`, `w_jorge`, `w_sofia`, `w_ravi` — retrato em `trainers/<id>.png` e sprites em `overworld/<id>_down.png` etc.

**Ids das espécies:**
- Pets: `ignis`, `aquaris`, `voltix`, `terragon`, `frostelle`, `umbrel` e as formas evoluídas com `_evo` (ex.: `ignis_evo`)
- Floresta: `verdaki` (evolui no Nv 14 para `verdakor`), `larvilo`, `brotinho`
- Praia: `conchilo`, `medulume`
- Planalto: `zumbolt`, `voltabico`
- Cânion: `pedrusco`, `escorpedra`
- Picos: `pinguelo`, `nevasco`
- Ruínas: `sombrelo`, `corvanoite`

**Tiles:** biomas `vila`, `floresta`, `praia`, `planalto`, `canion`, `picos`, `ruinas`;
nomes `ground`, `path`, `tallgrass`, `tree`, `water`, `rock`, `flowers`, `fence`.
Exemplo: `public/assets/tiles/picos/tallgrass.png`. O tile `tree` é só o chão embaixo da árvore;
a árvore em si (palmeira na praia, pinheiro nos picos, coluna nas ruínas…) é `objects/tree_<bioma>.png`,
mais alta que um tile para o personagem poder passar "atrás" da copa.

**Prédios:** `heal` (Centro/Posto de Cura), `shop` (Loja), `house` (casa).

**Dica para gerar as artes com IA:** as ilustrações com cenário (16:9) são ótimas para capa e divulgação,
mas no jogo cada monstro precisa aparecer **sozinho, de corpo inteiro e com fundo transparente**.
Gere também uma versão com algo como *"full body, centered, isolated on plain white background, no scenery"*
e remova o fundo (ou peça para mim). Para o lado do jogador na batalha, gere a vista de costas (`_back`).

## Anúncios (Google H5 Games Ads)

Tudo fica em **`src/ads.config.ts`**, o único arquivo que você precisa editar:

1. Crie/acesse sua conta no AdSense e **solicite o acesso a jogos H5** (AdSense para Jogos / H5 Games Ads).
2. Em `src/ads.config.ts`, troque `publisherId: 'ca-pub-0000000000000000'` pelo seu ID.
3. Em `public/ads.txt`, troque `pub-0000000000000000` pelo mesmo número (sem o `ca-`).
4. Publique o site. Até o AdSense aprovar o domínio, os anúncios podem não aparecer — o jogo segue normalmente.

Modos (mude pela URL para testar): `?ads=sim` (anúncio simulado, padrão enquanto o ID for o de exemplo),
`?ads=test` (anúncios de teste do Google, atributo `data-adbreak-test="on"` — confira na documentação da
Ad Placement API se o atributo continua o mesmo), `?ads=live`, `?ads=off`.

Onde aparecem:
- **Intersticial:** só entre batalhas, no máximo 1 a cada 3 minutos e nunca nos 3 primeiros minutos de jogo.
- **Recompensados (sempre opcionais):** reviver o pet depois de perder (1x por batalha), +50 moedas
  (menu de pausa e loja) e dobrar o XP depois de vencer.
- Se o anúncio for bloqueado ou não carregar, o jogo continua sem travar.

**Privacidade:** na primeira visita aparece o aviso de cookies (Aceitar / Recusar — recusar = anúncios não
personalizados). A escolha pode ser mudada em **Opções → Privacidade e cookies**. Edite `public/privacy.html`
com seu nome e e-mail. Para visitantes do Espaço Econômico Europeu/Reino Unido, o Google exige uma plataforma de
consentimento certificada: ative a **mensagem de GDPR em AdSense → Privacidade e mensagens** (ela aparece
automaticamente junto com os anúncios).

## Como adicionar conteúdo

- **Treinador:** `src/data/trainers.ts`
- **Monstro:** `src/data/monsters.ts`
- **História e batalhas de treinador:** `src/data/story.ts` (Noctis, amigos, gatilhos no mapa)
- **Treinadores andarilhos:** `src/data/wanderers.ts`
- **Mapa:** `src/data/maps.ts` — o mapa é desenhado com texto (a legenda está no topo do arquivo).
  Rode `npm test` depois de editar: os testes avisam linhas com tamanho errado, saídas para tiles bloqueados etc.
