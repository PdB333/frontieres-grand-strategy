#!/usr/bin/env node
// Headless smoke test of the simulation engine (no browser needed).
//   node tools/smoke.mjs [days]
// For each bookmark: start a campaign, simulate, resolve events with their first
// choice, check invariants, round-trip a save and verify determinism.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const {Engine} = createRequire(import.meta.url)(join(root, 'src/engine.js'));
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const world = json('data/world.json');
const catalog = json('data/catalog.json');
const days = Number(process.argv[2]) || 60;

function play(player, scenario) {
  const engine = new Engine(world, catalog);
  engine.newGame(player, {scenario});
  for (let i = 0; i < days; i++) {
    while (engine.s.pending) engine.dispatch('event', {index: 0});
    engine.tick();
  }
  engine.checkInvariants();
  return engine;
}

let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failures++;
};

for (const [player, scenario] of [['FRA', '1936'], ['GER', '1936'], ['FRA', '1939']]) {
  const label = `${player} ${scenario}`;
  try {
    const start = Date.now();
    const engine = play(player, scenario);
    check(`${label}: ${days} days simulated (${Date.now() - start} ms)`, true);
    const saved = JSON.parse(JSON.stringify(engine.save()));
    const reloaded = new Engine(world, catalog);
    reloaded.load(saved);
    check(`${label}: save/load round trip`, JSON.stringify(reloaded.s) === JSON.stringify(saved));
    check(`${label}: deterministic with the same seed`, JSON.stringify(play(player, scenario).s) === JSON.stringify(engine.s));
  } catch (error) {
    check(`${label}: ${error.message}`, false);
  }
}

if (failures) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
