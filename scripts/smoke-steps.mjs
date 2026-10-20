export default async function ({ page, press, wait, shot, expectScene, mobile }) {
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
  await page.evaluate(() => { Object.assign(window.__state.get(), { mapId: 'floresta', x: 8, y: 20 }); window.__game.scene.getScene('World').scene.restart(); });
  await expectScene('World');
  await page.evaluate(() => { const w = window.__game.scene.getScene('World'); w.startEncounter(); });
  await expectScene('Battle');
  await wait(2500);
  for (let i = 0; i < 3; i++) await press('ArrowDown', 120); // Lutar -> Item -> ... navega até Fugir
  await press('ArrowRight', 150);
  guard = 0;
  while ((await active('Battle')) && guard++ < 60) await press('Enter', 300);
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
    if (!(await active('Battle'))) break;
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
    await page.evaluate((m) => { Object.assign(window.__state.get(), { mapId: m, x: 14, y: 22, facing: 'up' }); const w = window.__game.scene.getScene('World'); w.scene.restart(); }, map);
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
