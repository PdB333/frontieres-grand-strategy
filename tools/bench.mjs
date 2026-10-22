#!/usr/bin/env node
// Balance bench: runs AI-only campaigns with several seeds in parallel and
// prints the date of the main historical milestones of each one.
//   node tools/bench.mjs [scenario=1939] [days=1400] [seeds=1,2,3,4]
// A milestone is the month a country capitulated (or was annexed);
// FRA_arm is the month of the French armistice. snap1942 lists the number of
// provinces controlled by the main powers in January 1942.
import {fork} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WATCH = ['POL', 'FIN', 'BEL', 'HOL', 'FRA', 'YUG', 'GRE', 'GER', 'ITA', 'SOV', 'GBR', 'CHI', 'JPN', 'SPA', 'NAT'];

if (process.argv[2] === '--child') {
  const [, , , scenario, days, seed] = process.argv;
  const {Engine} = createRequire(import.meta.url)(join(root, 'src', 'engine.js'));
  const world = JSON.parse(readFileSync(join(root, 'data', 'world.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8'));
  const engine = new Engine(world, catalog);
  engine.newGame('USA', {scenario, seed: Number(seed)});
  const month = day => new Date(Date.UTC(1936, 0, 1 + day)).toISOString().slice(0, 7);
  const out = {seed: Number(seed)}, snap = {}, started = Date.now();
  for (let i = 0; i < Number(days); i++) {
    while (engine.s.pending) engine.dispatch('event', {index: 0});
    if (engine.s.conference16 && engine.blocked16()) engine.dispatch('peaceAuto', {});
    if (engine.s.outcome) {
      if (engine.s.outcome.type !== 'victory') break;
      engine.dispatch('campaignContinue', {});
    }
    engine.tick();
    for (const id of WATCH) {
      const c = engine.nation(id);
      if (c && !out[id] && (!c.alive || c.capitulated16)) out[id] = month(engine.s.day);
    }
    if (engine.s.historyState?.flags?.france_armistice && !out.FRA_arm) out.FRA_arm = month(engine.s.day);
    if (month(engine.s.day) === '1942-01' && !Object.keys(snap).length)
      for (const id of ['GER', 'SOV', 'FRA', 'GBR', 'ITA', 'JPN', 'CHI']) snap[id] = engine.nation(id)?.alive ? engine.owned(id).length : 0;
  }
  engine.checkInvariants();
  out.snap1942 = snap;
  out.msPerDay = Math.round((Date.now() - started) / Number(days));
  process.send(out);
} else {
  const [scenario = '1939', days = '1400', seeds = '1,2,3,4'] = process.argv.slice(2);
  const runs = seeds.split(',').map(seed => new Promise((resolve, reject) => {
    const child = fork(fileURLToPath(import.meta.url), ['--child', scenario, days, seed]);
    child.on('message', resolve);
    child.on('exit', code => code && reject(new Error(`seed ${seed} failed (${code})`)));
  }));
  for (const result of await Promise.all(runs)) console.log(JSON.stringify(result));
}
