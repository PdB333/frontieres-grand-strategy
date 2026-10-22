#!/usr/bin/env node
// Opens the built index.html in headless Chromium, starts a campaign, lets the
// clock run and fails on any page error or console error.
//   npm install --no-save playwright && npx playwright install chromium
//   node tools/browser-smoke.mjs
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Resolve playwright from the project, then from the global install.
const require = createRequire(join(root, 'package.json'));
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = await import('playwright')); }

// Serve over HTTP: Workers built from Blob URLs behave differently under file://.
const html = readFileSync(join(root, 'index.html'));
const server = createServer((_, res) => res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}).end(html));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const errors = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  // Portraits come from Wikimedia: block the network so the test stays offline and deterministic.
  await page.route(target => !target.href.startsWith(url), route => route.abort());
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(message.text())) errors.push(`console: ${message.text()}`);
  });

  // Simulation errors reach the player as red toasts, not as console errors.
  await page.exposeFunction('reportToastError', text => errors.push(`toast: ${text}`));
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(node => {
      if (node.classList?.contains('error')) window.reportToastError(node.textContent);
    }))).observe(document.getElementById('toasts'), {childList: true});
  }));
  await page.goto(url);
  await page.locator('#modal [data-a=start]').click();
  await page.waitForFunction(() => Number.isInteger(window.Frontieres.state()?.day), null, {timeout: 30000});
  const startDay = await page.evaluate(() => window.Frontieres.state().day);

  await page.evaluate(() => window.Frontieres.command('speed', {value: 5}));
  const deadline = Date.now() + 60000;
  for (;;) {
    const s = await page.evaluate(() => {
      const {day, pending, paused} = window.Frontieres.state();
      return {day, pending: !!pending, paused};
    });
    if (s.day >= startDay + 10 || errors.length) break;
    if (Date.now() > deadline) throw new Error(`clock stuck at day ${s.day}`);
    // An event popup pauses the game: answer it with its first choice, then resume.
    if (s.pending) await page.evaluate(() => window.Frontieres.command('event', {index: 0}));
    else if (s.paused) await page.evaluate(() => window.Frontieres.command('pause'));
    await page.waitForTimeout(300);
  }

  // Every panel, sub-panel and map mode must render without throwing.
  await page.evaluate(() => window.Frontieres.command('pause'));
  const tabs = await page.$$eval('#rail [data-a=tab]', buttons => buttons.map(b => JSON.parse(decodeURIComponent(b.dataset.p)).id));
  for (const id of tabs) {
    await page.evaluate(tab => window.Frontieres.tab(tab), id);
    for (const sub of await page.$$eval('#panel .subtabs [data-a]', buttons => buttons.map(b => b.dataset.p))) {
      await page.locator(`#panel .subtabs [data-p="${sub}"]`).first().click();
    }
  }
  for (const mode of await page.$$eval('#map-modes [data-a=mode]', buttons => buttons.map(b => b.dataset.p))) {
    await page.locator(`#map-modes [data-p="${mode}"]`).click();
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => window.Frontieres.selectProvince(window.Frontieres.state().countries[window.Frontieres.state().player].identity.capital));
  // Modal views built from catalogue content: focus tree and a focus detail.
  await page.evaluate(() => { window.showTree(); window.showFocusDetail('pol_root'); window.showHelp(); });
  console.log(`ok   ${tabs.length} panels and every map mode rendered`);

  const state = await page.evaluate(() => ({day: window.Frontieres.state().day, player: window.Frontieres.state().player}));
  if (!errors.length) console.log(`ok   campaign started as ${state.player} and advanced from day ${startDay} to day ${state.day}`);
} catch (error) {
  errors.push(error.message);
} finally {
  await browser.close();
  server.close();
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log('ok   no page or console errors');
