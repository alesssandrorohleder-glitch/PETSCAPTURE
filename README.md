# Elementais: A Jornada dos Domadores

RPG de navegador de captura de monstrinhos, feito com **Phaser 3 + TypeScript + Vite**.
Funciona no computador (teclado/mouse) e no celular (toque, com direcional na tela), em até Full HD.

**Conteúdo:** 5 domadores + o rival Noctis · 6 biomas e a vila · 28 espécies · batalhas por turnos com
tipos, status, golpes supremos, XP e evolução · captura, equipe de 6, Caixa, loja · história com 3
encontros com o Noctis, desafios dos amigos e treinadores andarilhos · salvamento automático · anúncios.

### ✅ Antes de publicar (checklist)

1. Coloque suas imagens em `public/assets/` (veja **Suas imagens**) e rode `npm run cover` para atualizar a capa.
2. `src/ads.config.ts`: seu ID do AdSense. `public/ads.txt`: o mesmo número.
3. `public/privacy.html`: troque **[SEU NOME OU EMPRESA]** e **[SEU E-MAIL]**.
4. Publique (veja **Publicar grátis**) e, se usar domínio próprio, defina `SITE_URL`.

## Rodar localmente

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes da lógica (Vitest)
npm run build      # build de produção em dist/
npm run smoke      # teste automático no navegador (após o build) — precisa do Chromium
npm run cover      # gera public/og-cover.png (imagem de compartilhamento) a partir do jogo
```

Endereços úteis para testar: `?ads=sim|test|live|off` (modo dos anúncios), `?scale=1|2`
(resolução: 2 = Full HD) e `?pad=1` (direcional de toque no PC).

O progresso é **salvo automaticamente** no navegador (ao trocar de mapa, depois de batalhas, a cada 30 s e
ao fechar a aba) e também pelo menu **☰ Menu → Salvar**. No menu inicial, use **Continuar**.

Controles: **setas/WASD** andam, **Enter/Espaço/Z** interagem, **Esc/X** abre o menu ou volta.
No celular aparecem um direcional e os botões **A** (interagir) e **B** (menu/voltar).
Para ver o direcional no PC, abra com `?pad=1` no endereço.

**Resolução:** o jogo desenha na resolução da tela, até 1920×1080 (Full HD). Em telas menores ele usa menos
pixels e fica mais leve; textos e desenhos são gerados em alta resolução, então continuam nítidos.

## Estrutura

```
src/scenes/   telas do jogo (menu, seleção, mundo, batalha...)
src/data/     dados editáveis: elementos, treinadores, monstros, mapas
src/systems/  lógica: estado do jogo, controles, áudio, placeholders
src/ui/       componentes de interface (menus, diálogo, direcional, aviso de cookies)
src/ads.config.ts   configuração dos anúncios (único arquivo a editar)
public/assets imagens e sons (veja abaixo)
public/       ads.txt, privacy.html, robots.txt, og-cover.png, favicon.svg
tests/        testes automáticos da lógica (Vitest)
scripts/      teste no navegador (smoke) e gerador da capa
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
- Pets: `ignis` → `ignis_evo` (Ignara, Nv 10) → `ignis_evo2` (Solaryx, Nv 24); `aquaris`, `voltix`, `terragon`, `frostelle`, `umbrel` e as formas evoluídas com `_evo` (ex.: `aquaris_evo`)
- Floresta: `verdaki` → `verdamantis` (Nv 10) → `verdakor` (Nv 20), `larvilo`, `brotinho`
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

## Áudio

Coloque arquivos `.mp3` ou `.ogg` em `public/assets/audio/`. Enquanto um efeito sonoro não existir, o jogo toca
um som sintetizado simples; músicas sem arquivo ficam em silêncio. O botão de som (Opções / menu) desliga tudo.

| Tipo | Arquivo |
|---|---|
| Música do menu | `audio/music/menu.mp3` |
| Música de cada mapa | `audio/music/vila.mp3`, `floresta`, `praia`, `planalto`, `canion`, `picos`, `ruinas` |
| Batalhas | `audio/music/battle_wild.mp3`, `audio/music/battle_trainer.mp3`, `audio/music/noctis.mp3` |
| Evolução | `audio/music/evolution.mp3` |
| Golpe de cada elemento | `audio/sfx/fogo.mp3`, `agua`, `eletrico`, `terra`, `gelo`, `sombra`, `grama`, `inseto` |
| Outros efeitos | `audio/sfx/hit`, `faint`, `levelup`, `heal`, `capsula`, `captured`, `select`, `confirm` |

Dica: músicas em loop de 1–2 min, 96–128 kbps, para o jogo carregar rápido.

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

## Publicar grátis

O jogo é um site estático: o comando `npm run build` gera a pasta `dist/`, que pode ser hospedada em qualquer lugar.
As configurações para **Vercel** (`vercel.json`) e **Netlify** (`netlify.toml`) já estão no projeto.

### 1. Coloque o projeto no GitHub
1. Crie uma conta em [github.com](https://github.com) e um repositório novo (ex.: `elementais`).
2. Envie esta pasta para ele (pelo GitHub Desktop, ou no terminal):
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/elementais.git
   git push -u origin main
   ```

### 2a. Vercel (recomendado)
1. Entre em [vercel.com](https://vercel.com) com sua conta do GitHub.
2. **Add New… → Project** → escolha o repositório `elementais` → **Deploy**. (O framework é detectado como Vite;
   build `npm run build`, saída `dist`.)
3. Em ~1 minuto o jogo está no ar em `https://elementais-xxxx.vercel.app`. Cada `git push` publica de novo.
4. Domínio próprio: **Settings → Domains**. Depois, em **Settings → Environment Variables**, crie
   `SITE_URL = https://seudominio.com.br` e faça um novo deploy (usado na imagem de compartilhamento).

### 2b. Netlify
1. Entre em [netlify.com](https://netlify.com) com sua conta do GitHub.
2. **Add new site → Import an existing project** → GitHub → `elementais`. O `netlify.toml` já define
   build `npm run build` e pasta `dist` → **Deploy**.
3. Domínio próprio: **Domain management**. A URL é detectada automaticamente para as meta tags.

> Sem GitHub: rode `npm run build` e arraste a pasta `dist/` em [app.netlify.com/drop](https://app.netlify.com/drop).

### 3. Depois de publicar
1. Abra `https://SEU-SITE/ads.txt` e confira se mostra seu ID.
2. No AdSense, adicione o site e aguarde a aprovação (pode levar dias). Até lá o jogo funciona sem anúncios.
3. Teste o compartilhamento colando o link no WhatsApp/Discord (deve aparecer a capa).
4. Opcional: cadastre o site no [Google Search Console](https://search.google.com/search-console).
