export default async function ({ page, press, wait, shot, expectScene, mobile, port }) {
  const st = () => page.evaluate(() => { const s = window.__state.get(); return { map: s.mapId, x: s.x, y: s.y, facing: s.facing, trainer: s.trainerId }; });
  const world = (expr) => page.evaluate(`(() => { const w = window.__game.scene.getScene('World'); return ${expr}; })()`);
  /** anda n passos numa direção (espera cada passo terminar) */
  const walk = async (key, n) => {
    for (let i = 0; i < n; i++) {
      const before = await st();
      await page.keyboard.press(key); // toque rápido = 1 passo
      // espera o passo terminar (ou só virar, se bloqueado)
      await page.waitForFunction(
        (b) => {
          const g = window.__game;
          if (!g.scene.isActive('World')) return true;
          const s = window.__state.get();
          const w = g.scene.getScene('World');
          return !w.moving && (s.x !== b.x || s.y !== b.y || s.mapId !== b.map);
        },
        before,
        { timeout: 700 },
      ).catch(() => {});
      if (!(await page.evaluate(() => window.__game.scene.isActive('World')))) return;
    }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); console.log('  ✓', msg); };

  await expectScene('Menu');
  await shot('01-menu');
  // Opções -> alterna som -> volta
  await press('ArrowDown'); await press('Enter'); // 'Continuar' desabilitado é pulado
  await expectScene('Options');
  await press('Enter'); await shot('02-options');
  await press('Escape');
  await expectScene('Menu');

  // Seleção de treinador: escolhe Marina (2º card)
  await press('Enter');
  await expectScene('TrainerSelect');
  await press('ArrowRight', 400);
  await shot('03-select');
  await press('Enter', 600);
  await shot('04-select-confirm');
  await press('Enter');
  await expectScene('World');
  let s = await st();
  assert(s.trainer === 'marina' && s.map === 'vila' && s.x === 14 && s.y === 7, `começa na vila com Marina (${JSON.stringify(s)})`);
  // introdução do Ancião ao começar
  await page.waitForFunction(() => window.__game.scene.getScene('World').dialog?.open, null, { timeout: 4000 }).catch(() => {});
  await shot('05a-intro');
  for (let i = 0; i < 10 && (await world('w.dialog.open')); i++) await press('Enter', 400);
  assert(await page.evaluate(() => !!window.__state.get().flags.intro), 'introdução mostrada');
  // o encontro com o Noctis e os andarilhos são testados na etapa 7
  await page.evaluate(() => { const f = window.__state.get().flags; f.noctis1 = true; for (const id of ['pedrinho', 'bia', 'davi', 'lucia', 'jorge', 'sofia', 'ravi']) f['beat_w_' + id] = true; });
  await shot('05-vila');
  if (mobile) await touchPad({ page, wait });
  await walk('ArrowLeft', 1); await walk('ArrowRight', 1);
  // volta ao x=14 caso o pad tenha andado
  for (let i = 0; i < 5 && (await st()).x > 14; i++) await walk('ArrowLeft', 1);

  // Colisão: árvore na borda esquerda
  await walk('ArrowLeft', 14);
  s = await st();
  assert(s.x === 1, `para na árvore (x=${s.x})`);
  await walk('ArrowRight', 9); // x=10

  // NPC Ancião (10,8): olhar para baixo e falar
  await walk('ArrowDown', 1); // bloqueado pelo NPC, só vira
  s = await st();
  assert(s.y === 7 && s.facing === 'down', `NPC bloqueia passagem (${JSON.stringify(s)})`);
  await press('Enter', 700);
  assert(await world('w.dialog.open'), 'diálogo do NPC abre');
  await shot('06-dialog');
  for (let i = 0; i < 6 && (await world('w.dialog.open')); i++) await press('Enter', 500);
  assert(!(await world('w.dialog.open')), 'diálogo fecha');

  // Centro de Cura: porta em (6,5) → ficar em (6,6) e subir
  await walk('ArrowLeft', 4); // x=6
  await walk('ArrowUp', 1); // y=6
  await walk('ArrowUp', 1); // porta
  await wait(600);
  assert(await world('w.dialog.open'), 'Centro de Cura pergunta');
  await shot('07-heal');
  await press('Enter', 500); // Sim
  for (let i = 0; i < 6 && (await world('w.dialog.open')); i++) await press('Enter', 500);

  // Menu de pausa
  await press('Escape', 500);
  assert(await world('!!w.menu'), 'menu de pausa abre');
  await shot('08-pause');
  await press('Escape', 500);
  assert(!(await world('!!w.menu')), 'menu de pausa fecha');

  // Ir para a floresta: caminho do meio (x=14) até o topo
  await walk('ArrowDown', 1); // y=7
  await walk('ArrowRight', 8); // x=14
  await walk('ArrowUp', 7);
  await expectScene('World');
  await wait(400);
  s = await st();
  assert(s.map === 'floresta' && s.y === 22, `chegou na floresta (${JSON.stringify(s)})`);
  await walk('ArrowLeft', 3);
  await walk('ArrowUp', 5); // entra no mato alto
  await shot('09-floresta');
  await walk('ArrowRight', 3);
  await walk('ArrowDown', 6);
  await wait(500);
  s = await st();
  assert(s.map === 'vila', `voltou para a vila (${JSON.stringify(s)})`);

  // ---------------- Etapa 3: encontro no mato alto e batalha
  await walk('ArrowUp', 1);
  await expectScene('World');
  await wait(400);
  await walk('ArrowLeft', 6); // x=8, y=22 (mato alto em x 5..9, y 17..19)
  await page.evaluate(() => { window.__game.scene.getScene('World').encounterRate = 1; });
  await walk('ArrowUp', 3); // entra no mato alto (y=19)
  await expectScene('Battle');
  await wait(2500);
  await shot('10-battle-intro');
  const active = (k) => page.evaluate((key) => window.__game.scene.isActive(key), k);
  // Lutar -> golpe
  await press('Enter', 400);
  await shot('11-battle-moves');
  await press('Enter', 300);
  await wait(900);
  await shot('12-battle-attack');
  let guard = 0;
  while ((await active('Battle')) && guard++ < 150) await press('Enter', 300);
  const after = (await active('World')) ? 'World' : (await active('GameOver')) ? 'GameOver' : 'outro';
  assert(after === 'World' || after === 'GameOver', `batalha terminou (${after})`);
  if (after === 'GameOver') { await wait(600); await press('Enter'); }
  await expectScene('World');
  const money = await page.evaluate(() => window.__state.get().money);
  console.log('    moedas:', money);

  // Segunda batalha: fugir (garante estar na floresta, caso tenha perdido e voltado à vila)
  await page.evaluate(() => { Object.assign(window.__state.get(), { mapId: 'floresta', x: 8, y: 20 }); window.__game.scene.getScene('World').scene.restart({}); });
  await expectScene('World');
  await page.evaluate(() => { const w = window.__game.scene.getScene('World'); w.startEncounter(); });
  await expectScene('Battle');
  await wait(2500);
  for (let i = 0; i < 3; i++) await press('ArrowDown', 120); // Lutar -> Item -> ... navega até Fugir
  await press('ArrowRight', 150);
  guard = 0;
  while ((await active('Battle')) && guard++ < 60) await press('Enter', 300);
  // se a fuga falhar o inimigo ataca; perder também é um fim válido
  await page.waitForFunction(() => !window.__game.scene.isActive('Battle'), null, { timeout: 5000 }).catch(() => {});
  if (await active('GameOver')) { await wait(600); await press('Enter'); }
  await expectScene('World');

  // ---------------- Etapa 4: XP, aprender golpe (escolha) e evolução
  await page.evaluate(() => {
    const pet = window.__state.get().party[0];
    pet.level = 9; pet.xp = 999; pet.moves = ['jato_dagua', 'bolha_prisao', 'onda_cortante', 'cura_mare'];
    pet.hp = 28; pet.status = null;
    const w = window.__game.scene.getScene('World');
    w.scene.start('Battle', { kind: 'wild', enemies: [window.__create('larvilo', 2)] });
  });
  await expectScene('Battle');
  await wait(2500);
  let sawLearn = false, sawEvo = false;
  guard = 0;
  while (guard++ < 200) {
    if (await active('Evolution')) { sawEvo = true; break; }
    if (!(await active('Battle'))) {
      // pode estar no meio da troca de cena
      await page.waitForFunction(() => window.__game.scene.isActive('Evolution') || window.__game.scene.isActive('World'), null, { timeout: 4000 }).catch(() => {});
      sawEvo = await active('Evolution');
      break;
    }
    const overlay = await page.evaluate(() => !!window.__game.scene.getScene('Battle').overlay);
    if (overlay && !sawLearn) { sawLearn = true; await shot('13-learn-move'); }
    await press('Enter', 250);
  }
  assert(sawLearn, 'pediu para escolher golpe a esquecer');
  assert(sawEvo, 'animação de evolução começou');
  await wait(3500);
  await shot('14-evolution');
  await expectScene('World');
  const pet = await page.evaluate(() => { const p = window.__state.get().party[0]; return { sp: p.species, lv: p.level, moves: p.moves }; });
  assert(pet.sp === 'aquaris_evo' && pet.lv === 10 && pet.moves.includes('redemoinho'), `evoluiu e aprendeu (${JSON.stringify(pet)})`);

  // ---------------- Etapa 5: passeio pelos biomas (entra pela saída de baixo e anda até a de cima)
  for (const map of ['praia', 'planalto', 'canion', 'picos', 'ruinas']) {
    await page.evaluate((m) => { Object.assign(window.__state.get(), { mapId: m, x: 14, y: 22, facing: 'up' }); const w = window.__game.scene.getScene('World'); w.scene.restart({}); }, map);
    await expectScene('World');
    await page.evaluate(() => { window.__game.scene.getScene('World').encounterRate = 0; });
    await walk('ArrowUp', 2);
    await shot(`20-${map}`);
    const cur = await st();
    assert(cur.map === map, `bioma ${map} carregou`);
  }
  // Ruínas -> Picos pela saída de baixo
  await walk('ArrowDown', 3);
  await wait(500);
  assert((await st()).map === 'picos', 'Ruínas ligam aos Picos');

  // ---------------- Etapa 6: loja, captura, Caixa, equipe e mochila
  // Loja: porta em (23,5); fica em (23,6) e sobe
  await page.evaluate(() => { window.__state.healParty(); Object.assign(window.__state.get(), { mapId: 'vila', x: 23, y: 6, facing: 'up', money: 1000 }); window.__game.scene.getScene('World').scene.restart({}); });
  await expectScene('World');
  await walk('ArrowUp', 1);
  await expectScene('Shop');
  await shot('30-shop');
  const caps0 = await page.evaluate(() => window.__state.get().inventory.capsula);
  await press('Enter', 500); // Cápsula
  await shot('31-shop-qty');
  await press('ArrowDown', 200); // 5x
  await press('Enter', 500);
  await press('Enter', 500); // OK
  const inv = await page.evaluate(() => ({ caps: window.__state.get().inventory.capsula, money: window.__state.get().money }));
  assert(inv.caps === caps0 + 5 && inv.money === 0, `comprou 5 cápsulas (${JSON.stringify(inv)})`);
  await press('Escape');
  await expectScene('World');

  // Captura: Larvilo com 1 de vida; joga cápsulas até pegar (chance ~78% por tentativa)
  const capture = async () => {
    await page.evaluate(() => { window.__battleLog = []; const m = window.__create('larvilo', 2); m.hp = 1; window.__game.scene.getScene('World').scene.start('Battle', { kind: 'wild', enemies: [m] }); });
    await expectScene('Battle');
    let g = 0, shotTaken = false;
    while ((await active('Battle')) && g++ < 120) {
      const atMenu = await page.evaluate(() => { const b = window.__game.scene.getScene('Battle'); return !!b.menu && !b.overlay && !b.advance && b.msg.text.startsWith('O que'); });
      if (atMenu) {
        await press('ArrowDown', 300); // Item
        await press('Enter', 500);
        if (!shotTaken) { await shot('32-bag-in-battle'); shotTaken = true; }
        await press('Enter', 300); // Cápsula
      } else await wait(300); // mensagens avançam sozinhas
    }
    if (!(await active('World')) && !(await page.waitForFunction(() => window.__game.scene.isActive('World'), null, { timeout: 4000 }).catch(() => false))) {
      console.log('    log da batalha:', await page.evaluate(() => window.__battleLog.join(' | ')));
    }
    await expectScene('World');
  };
  const n0 = await page.evaluate(() => window.__state.get().party.length);
  await capture();
  const n1 = await page.evaluate(() => window.__state.get().party.length);
  assert(n1 === n0 + 1, `capturou e entrou na equipe (${n0} -> ${n1})`);
  // equipe cheia -> Caixa
  await page.evaluate(() => { const p = window.__state.get().party; while (p.length < 6) p.push(window.__create('brotinho', 4)); });
  await capture();
  const box = await page.evaluate(() => window.__state.get().box.length);
  const dbg = await page.evaluate(() => ({ box: window.__state.get().box.length, party: window.__state.get().party.length, scene: window.__game.scene.getScenes(true).map(s => s.scene.key) }));
  assert(box === 1, `com equipe cheia foi para a Caixa (${JSON.stringify(dbg)})`);

  // Equipe pelo menu de pausa
  await press('Escape', 500);
  await press('Enter');
  await expectScene('Party');
  await press('ArrowRight', 300);
  await shot('33-party');
  await press('Enter', 300); // foco nas ações
  await press('Enter', 600); // "Ser o primeiro"
  const first = await page.evaluate(() => window.__state.get().party[0].species);
  assert(first !== 'aquaris_evo', `mudou o primeiro da equipe (${first})`);
  // Caixa
  await page.evaluate(() => window.__game.scene.getScene('Party').switchMode('box'));
  await wait(400);
  await shot('34-box');
  await press('Escape');
  await expectScene('World');
  // Mochila
  await press('Escape', 500);
  await press('ArrowDown', 150);
  await press('Enter');
  await expectScene('Inventory');
  await shot('35-inventory');
  await press('Escape');
  await expectScene('World');

  // ---------------- Etapa 7: história (Noctis e amigos)
  const flags = () => page.evaluate(() => window.__state.get().flags);
  const goto = (m, x, y, facing, extra = '') => page.evaluate(([m, x, y, f, extra]) => {
    const s = window.__state.get();
    Object.assign(s, { mapId: m, x, y, facing: f });
    if (extra) new Function('s', extra)(s);
    window.__game.scene.getScene('World').scene.restart({});
  }, [m, x, y, facing, extra]);
  /** passa por diálogos e batalha apertando Enter até voltar ao mapa sem diálogo */
  const playThrough = async (label, until = () => page.evaluate(() => window.__game.scene.isActive('World') && !window.__game.scene.getScene('World').dialog.open && !window.__game.scene.getScene('World').moving)) => {
    let g = 0, sawBattle = false;
    while (g++ < 300) {
      if (await active('Battle')) {
        if (!sawBattle) { sawBattle = true; await wait(1800); await shot(`40-${label}-battle`); }
      } else if (await until()) break;
      await press('Enter', 300);
    }
    return sawBattle;
  };
  // equipe forte para os testes de história
  const strong = "s.party.length = 1; const p = window.__create('aquaris_evo', 60); s.party[0] = p;";

  // Noctis 1: saída da vila
  await goto('vila', 14, 3, 'up', strong + "s.flags.noctis1 = false;");
  await expectScene('World');
  await walk('ArrowUp', 2);
  await wait(800);
  assert(await world('w.dialog.open'), 'Noctis aparece na saída da vila');
  await shot('41-noctis1');
  assert(await playThrough('noctis1'), 'batalha contra Noctis começou');
  assert((await flags()).noctis1 === true, 'venceu Noctis 1 e a história avançou');

  // Amigo: Kael na floresta (20,11) — jogador em (19,11) olhando para a direita
  await goto('floresta', 19, 11, 'right');
  await expectScene('World');
  await press('Enter', 800);
  assert(await world('w.dialog.open'), 'Kael pergunta se quer batalhar');
  assert(await playThrough('kael'), 'batalha contra Kael começou');
  assert((await flags()).beat_kael === true, 'venceu Kael');

  // Noctis 3: chefe final nas Ruínas
  await goto('ruinas', 15, 5, 'up', strong + "s.flags.noctis2 = true;");
  await expectScene('World');
  await walk('ArrowUp', 2);
  await wait(600);
  assert(await world('w.dialog.open'), 'Noctis espera no altar');
  await playThrough('noctis3', () => page.evaluate(() => window.__game.scene.isActive('GameOver')));
  await expectScene('GameOver');
  await shot('42-fim');
  assert((await flags()).noctis3 === true, 'zerou: venceu Noctis nas Ruínas');
  await press('Enter');
  await expectScene('World');

  // Andarilho: Pedrinho vê o jogador e desafia
  await goto('vila', 20, 12, 'up', strong + "s.flags.beat_w_pedrinho = false;");
  await expectScene('World');
  await page.evaluate(() => { const w = window.__game.scene.getScene('World'); const n = w.npcs.find((n) => n.def.id === 'w_pedrinho'); n.x = 20; n.y = 8; n.nextMove = 1e12; w.placeNpc(n); w.faceNpc(n, 'down'); });
  await walk('ArrowUp', 1);
  await wait(1500);
  await shot('44-andarilho');
  assert(await world('w.dialog.open'), 'Pedrinho viu o jogador e veio desafiar');
  assert(await playThrough('pedrinho'), 'batalha contra o andarilho começou');
  assert((await flags()).beat_w_pedrinho === true, 'venceu o andarilho');
  // revanche: falar com ele de novo
  const money0 = await page.evaluate(() => window.__state.get().money);
  await goto('vila', 20, 9, 'up');
  await expectScene('World');
  await page.evaluate(() => { const w = window.__game.scene.getScene('World'); const n = w.npcs.find((n) => n.def.id === 'w_pedrinho'); n.x = 20; n.y = 8; n.nextMove = 1e12; w.placeNpc(n); });
  await press('Enter', 800);
  assert(await world('w.dialog.open'), 'andarilho oferece revanche');
  assert(await playThrough('pedrinho2'), 'revanche começou');
  const money1 = await page.evaluate(() => window.__state.get().money);
  assert(money1 > money0, `revanche deu moedas (${money0} -> ${money1})`);

  // ---------------- Etapa 8: save — recarrega o site e continua
  const saved = await st();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 15000 });
  await wait(600);
  await shot('43-menu-continuar');
  await press('Enter'); // Continuar
  await expectScene('World');
  const loaded = await st();
  const fl = await flags();
  assert(loaded.map === saved.map && loaded.x === saved.x && loaded.y === saved.y && fl.noctis3 === true, `progresso restaurado após recarregar (${JSON.stringify(loaded)})`);
  // ---------------- Etapa 9: anúncios (modo simulado)
  await page.evaluate(() => { try { localStorage.removeItem('elementais.consent'); } catch {} });
  await page.goto(`http://localhost:${port}/?scale=1&ads=sim`);
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 15000 });
  await wait(800);
  assert(await page.locator('.consent').isVisible(), 'aviso de cookies aparece na primeira visita');
  await shot('50-consent');
  await page.click('.consent button[data-c="accepted"]');
  assert(await page.evaluate(() => localStorage.getItem('elementais.consent')) === '"accepted"', 'consentimento salvo');
  await press('Enter'); // Continuar
  await expectScene('World');
  await wait(1200);
  // +50 moedas pelo menu de pausa (assiste até o fim)
  const coins0 = await page.evaluate(() => window.__state.get().money);
  await page.evaluate(() => window.__game.scene.getScene('World').toggleMenu());
  await wait(400);
  await page.evaluate(() => { const w = window.__game.scene.getScene('World'); const list = w.menu.list.find((o) => o.select); list.select(3); });
  await press('Enter', 800);
  assert(await page.locator('.sim-ad').isVisible(), 'anúncio recompensado simulado aparece');
  await shot('51-reward-ad');
  await page.waitForSelector('.sim-ad__done:not([disabled])', { timeout: 9000 });
  await page.click('.sim-ad__done');
  await wait(800);
  const coins1 = await page.evaluate(() => window.__state.get().money);
  assert(coins1 === coins0 + 50, `ganhou 50 moedas (${coins0} -> ${coins1})`);
  for (let i = 0; i < 4 && (await world('w.dialog.open')); i++) await press('Enter', 400);
  // fechar antes do fim não dá recompensa
  const r = await page.evaluate(() => { const p = window.__ads.rewarded('teste'); setTimeout(() => document.querySelector('.sim-ad__skip').click(), 300); return p; });
  assert(r === 'dismissed', 'fechar o anúncio antes do fim não dá recompensa');
  // intersticial depois de batalha (forçando o tempo de sessão)
  await page.evaluate(() => { window.__ads.sessionStart = 0; const m = window.__create('larvilo', 2); m.hp = 1; window.__game.scene.getScene('World').scene.start('Battle', { kind: 'wild', enemies: [m] }); });
  await expectScene('Battle');
  let g = 0, sawAd = false;
  while (g++ < 80) {
    if (await page.locator('.sim-ad').isVisible().catch(() => false)) { sawAd = true; break; }
    if (await active('World')) break;
    await press('Enter', 350);
  }
  assert(sawAd, 'intersticial aparece entre batalhas');
  await shot('52-interstitial');
  await page.waitForSelector('.sim-ad__done:not([disabled])', { timeout: 9000 });
  await page.click('.sim-ad__done');
  await expectScene('World');
  assert(!(await page.evaluate(() => window.__ads.canShowInterstitial())), 'não mostra outro intersticial antes de 3 minutos');
  // anúncio bloqueado/indisponível não trava
  const blocked = await page.evaluate(async () => { window.__ads.mode = 'live'; const r = await window.__ads.rewarded('x'); window.__ads.mode = 'simulated'; return r; });
  assert(blocked === 'unavailable', 'sem script do Google, o recompensado responde "indisponível" e o jogo segue');

  // ---------------- Login e salvamento online (servidor simulado)
  const saved0 = await page.evaluate(() => { const s = window.__state.get(); return { trainer: s.trainerId, money: s.money }; });
  await page.evaluate(() => { window.__state.get().money = 7777; window.dispatchEvent(new Event('pagehide')); localStorage.removeItem('elementais.mockcloud'); });
  await page.goto(`http://localhost:${port}/?scale=1&ads=off&cloud=mock`);
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 15000 });
  await wait(800);
  await page.evaluate(() => window.__game.scene.getScene('Menu').openAccount());
  await page.waitForSelector('.acct');
  await page.click('.acct [data-act="signup"]');
  await page.fill('#acct-name', 'Tester');
  await page.fill('#acct-email', 'tester@exemplo.com');
  await page.fill('#acct-pass', 'segredo123');
  await shot('60-signup');
  await page.click('.acct button[type="submit"]');
  await page.waitForSelector('.acct__user', { timeout: 5000 });
  await shot('61-conta');
  const cloudMoney = await page.evaluate(() => JSON.parse(localStorage.getItem('elementais.mockcloud')).accounts[0].save?.state.money);
  assert(cloudMoney === 7777, `criar conta enviou o progresso para a nuvem (moedas ${cloudMoney})`);
  await page.click('.acct [data-act="close"]');
  await wait(400);
  const label = await page.evaluate(() => window.__game.scene.getScene('Menu').menu.items.map((i) => i.label).join(' | '));
  assert(label.includes('Conta: Tester'), `menu mostra a conta conectada (${label})`);
  // sair e simular outro aparelho (sem save local)
  await page.evaluate(() => window.__game.scene.getScene('Menu').openAccount());
  await page.click('.acct [data-act="signout"]');
  await page.waitForSelector('.acct form[data-form="login"]');
  await page.evaluate(() => { localStorage.removeItem('elementais.save'); localStorage.removeItem('elementais.cloudsync'); });
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 15000 });
  await wait(800);
  const noSave = await page.evaluate(() => window.__game.scene.getScene('Menu').menu.items[0].disabled);
  assert(noSave, 'no "outro aparelho", Continuar começa desativado');
  await page.evaluate(() => window.__game.scene.getScene('Menu').openAccount());
  await page.fill('#acct-email', 'tester@exemplo.com');
  await page.fill('#acct-pass', 'senha-errada');
  await page.click('.acct button[type="submit"]');
  await page.waitForSelector('.acct__msg--err');
  assert((await page.textContent('.acct__msg--err')).includes('incorretos'), 'senha errada mostra mensagem clara');
  await page.fill('#acct-pass', 'segredo123');
  await page.click('.acct button[type="submit"]');
  await page.waitForSelector('.acct__user', { timeout: 5000 });
  await page.click('.acct [data-act="close"]');
  await wait(500);
  await press('Enter'); // Continuar
  await expectScene('World');
  const restored = await page.evaluate(() => ({ trainer: window.__state.get().trainerId, money: window.__state.get().money }));
  assert(restored.trainer === saved0.trainer && restored.money === 7777, `progresso baixado da nuvem em outro aparelho (${JSON.stringify(restored)})`);
}

/** Teste do direcional por toque (só no modo --mobile). */
export async function touchPad({ page, wait }) {
  const cdp = await page.context().newCDPSession(page);
  const box = await page.locator('canvas').boundingBox();
  const k = box.width / 960;
  const at = (gx, gy) => ({ x: box.x + gx * k, y: box.y + gy * k });
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ ...p, id: 1 }] : [] });
  const before = await page.evaluate(() => ({ ...window.__state.get() }));
  // segura a seta "direita" do pad (centro 110,430; direita +50)
  await touch('touchStart', at(160, 430));
  await wait(700);
  await touch('touchEnd');
  await wait(400);
  const after = await page.evaluate(() => ({ ...window.__state.get() }));
  if (!(after.x > before.x)) throw new Error(`pad não moveu o jogador (${before.x} -> ${after.x})`);
  console.log(`  ✓ direcional por toque moveu ${after.x - before.x} passo(s)`);
  // botão A abre diálogo com a placa? Apenas verifica que o toque no A não quebra.
  await touch('touchStart', at(880, 420));
  await touch('touchEnd');
  await wait(300);
}
