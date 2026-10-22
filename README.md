# Frontières

**A single-player grand strategy game for the browser — build a nation, shape history, and command a world at war.**

**Current playable version:** `1.5` &nbsp;|&nbsp; **Project status:** Alpha / actively developed &nbsp;|&nbsp; **Interface:** French &nbsp;|&nbsp; **Documentation:** English &nbsp;|&nbsp; **License:** MIT (original code)

[Play / download `index.html`](./index.html) · [Source code](./src/) · [Game data](./data/) · [Roadmap](#development-roadmap) · [Modding](#modding-and-custom-scenarios) · [Report an issue](https://github.com/PdB333/frontieres-grand-strategy/issues)

---

## What is Frontières?

**Frontières** is an original, turnless, day-by-day grand strategy simulation inspired by the *genre* of historical WWII strategy games. It runs in a modern web browser, focuses on **single-player campaigns**, and combines national leadership, production, research, diplomacy, intelligence, land warfare, air operations, naval strategy, and an extensible JSON modding system.

Start in **1936** and navigate the crises leading to World War II, or select the **1939** starting point and enter a world already close to global conflict. Select a country, develop its industrial base, choose a political direction, prepare your military forces, and respond to the decisions of other nations.

The goal is **not** to recreate another game's code or assets. Frontières is its own lightweight strategy project with its own rules, interface, data formats, and roadmap. The historical world is an *approximation for gameplay*, not an authoritative historical atlas.

> **Important:** This is a **development build, not a finished commercial-quality simulation**. Many systems are playable but deliberately abstracted; the AI, aerial and naval warfare, historical borders, and balance still need substantial work. The UI is currently in French. Multiplayer is **not planned**.

## Quick start

### Option A — Run it locally (recommended)

There is **no Node.js package installation or backend required to play**.

1. Download this repository or clone it.
2. In the repository directory, start a basic local HTTP server.
3. Open the URL in your browser and choose a country.

```bash
git clone https://github.com/PdB333/frontieres-grand-strategy.git
cd frontieres-grand-strategy
python -m http.server 8000
```

Open **http://localhost:8000/** to load `index.html`.

Python is used here **only to serve the files**; it is not the game engine. You can use another static-file HTTP server instead.

### Option B — Open the standalone HTML

Download [`index.html`](./index.html) and open it in Chrome, Chromium, Edge, or another modern browser. The playable HTML embeds the game logic and core data.

Some browsers restrict Web Workers, local file access, or storage under `file://`. If double-clicking does not work, use **Option A**. Browser support outside the tested Chromium development environment is not yet certified.

The core simulation does **not** require a connection to a game server. Optional historical portraits loaded from Wikimedia Commons may require Internet access.

## Game at a glance

| Category | Included in version 1.5 |
| --- | --- |
| World map | **74** starting countries and **3,396** gameplay provinces |
| Starting scenarios | **1936** and **1939** historical bookmarks |
| Campaign engine | Pausable, day-by-day simulation with 5 speed settings and AI-controlled countries |
| Historical content | **71** historical event/government entries and documentary references |
| National focus trees | **8** country-specific trees plus a generic tree; **22** focuses per tree |
| Technology | **60** technologies across 7 research categories |
| Production | **13** equipment types and **10** construction categories |
| Ground forces | Division design, recruitment, armies, officers, front plans, combat, supply, and encirclements |
| Air and sea | Air-zone missions, airbases, fleets, naval missions, convoys, ports, and invasions (abstracted) |
| State management | Political decisions, institutions, public finances, industry, logistics, and diplomacy |
| Intelligence | Relations, espionage and intelligence-based information (abstracted) |
| Modding | Declarative JSON scenarios, countries, territory changes, new provinces, technologies, focuses, and events |
| Saves | Browser storage plus JSON export/import, with compatibility checks |
| Display | Canvas-based interactive map, overlays, minimap, accessibility and performance controls |
| Online services | **None required for core gameplay** |
| Multiplayer | **Not planned** |

### Recommended first campaign

1. Select **France in 1936** to learn the systems, or another available country.
2. Pause the game and review your **national priorities**, **research**, **industry**, and **political situation**.
3. Choose a focus and begin one or more research projects.
4. Allocate civilian factories, construct useful infrastructure, and assign military production lines.
5. Recruit divisions, configure their templates, assign generals and organize armies.
6. Set a defensive front or an offensive plan, monitor supply, and choose diplomatic actions.
7. Start the clock, react to crises, and **export a JSON save** before making large changes.

## Features in detail

### 1. Countries, history, and the map

- **74 starting countries** with names, ideologies, industries, military forces, and initial leadership information.
- **Two historical starts:** January 1936 and late August 1939, with scenario-specific geopolitical adjustments.
- **3,396 base provinces** with terrain, owners, infrastructure, industry, resources, supply connections, and other gameplay properties.
- Interactive, zoomable Canvas map with selectable provinces, countries, units, and army overlays.
- Multiple map views, including political control, terrain, supply, industry, diplomacy, air zones, and naval areas.
- An **historical atlas** with timelines, country dossiers, and documentary links.
- Named historical leaders and commanders where data is available; optional archival portrait references.
- **71 historical entries** covering government changes, decisions, and documentary events; the direction of a campaign can diverge from history.

**Accuracy note:** The map draws on Natural Earth low-resolution modern geography and applies schematic historical modifications. Borders, province geometry, troop placements, military statistics, and some political values are **not exact reconstructions of 1936 or 1939**. Names and documentary links do not imply that every individual biography has been independently verified.

### 2. Politics and national leadership

- Government ideology, political power, stability, popular support, and national legitimacy.
- Institutional and civic reforms, coalition negotiations, political campaigns, and elections where applicable.
- Political cooldowns and consequences for unpopular or disruptive decisions.
- Civil unrest, tensions, strikes, and interactions with the national economy.
- Economic organization and wartime laws that change the country's available capacity.
- National focus trees for **France, Germany, the United Kingdom, the Soviet Union, the United States, Italy, Japan, and China**, plus a generic tree for other countries.
- Focus prerequisites, branching decisions, bonuses, and country-specific strategic directions.

These political systems are **simulation abstractions** rather than historically measured election results or an exhaustive representation of individual states.

### 3. Economy, budgets, and industry

- Civilian factories, military factories, dockyards, and construction queues.
- **Ten construction categories:** civilian factories, military factories, dockyards, infrastructure, railways, logistics hubs, forts, ports, airbases, and radar stations.
- **Thirteen equipment categories:** rifles, support equipment, artillery, trucks, tanks, fighters, bombers, destroyers, submarines, convoys, cruisers, battleships, and aircraft carriers.
- Production-line allocation, efficiency, equipment stockpiles, resource shortages, and industrial bottlenecks.
- Economic resources including **steel, oil, and rubber**, plus fuel and logistics constraints.
- National budget controls: taxation, welfare/services, spending, treasury, borrowing, debt limits, interest, inflation, and fiscal balance.
- Financial crises with **arrears**, which can affect national production and social stability.
- Rationing, national economic models, investment choices, and the political costs of difficult decisions.
- Economic charts, monthly history, and projections for assessing policy choices.

**All GDP, treasury, debt, employment, and electoral quantities are gameplay indices or fictional units**, not claims about actual national accounts.

### 4. Research and national development

The base game includes **60 technologies**:

| Research field | Technologies |
| --- | ---: |
| Industry | 11 |
| Infantry | 9 |
| Armor | 6 |
| Aircraft | 7 |
| Navy | 11 |
| Logistics | 8 |
| Doctrine | 8 |
| **Total** | **60** |

Technology prerequisites, research time, national bonuses, and production improvements encourage long-term planning. Focus trees and modded technologies can add different paths through a campaign.

### 5. Armies, divisions, and ground warfare

- Form armies, assign available officers and commanders, and group divisions.
- Create or modify division templates with infantry, motorized forces, artillery, tanks, and support companies.
- Support options include engineers, logistics, reconnaissance, anti-tank teams, and field hospitals.
- Division statistics cover manpower, equipment, soft/hard attack, defense, breakthrough, armor, piercing, organization, speed, combat width, and more.
- Recruit and reequip divisions; shortages can reduce combat effectiveness.
- Give movement orders manually or configure army-level **fronts, postures, objectives, and offensive plans**.
- Choose tactical approaches including balanced combined-arms fighting, concentrated breakthrough, and elastic defense.
- Simulated combat considers terrain, weather, fortifications, supply, planning, organization, equipment, and tactical bonuses.
- Detect encircled divisions; cut-off forces can suffer attrition and lose access to routine reinforcement.
- Battle reports, casualties, territorial changes, and a dedicated military/operations interface.

The AI can operate fronts and react to wars, but it is **heuristic**. Version 1.6 aims to make it much better at preparing, coordinating, and sustaining strategic campaigns.

### 6. Logistics and supply

- Province supply values affected by national access, infrastructure, railways, logistics hubs, ports, terrain, and damage.
- Sea connections and convoy availability matter for overseas supply.
- Poor supply affects movement, organization, attack effectiveness, and reinforcement.
- Isolation and encirclement can make an otherwise strong army collapse.
- Version 1.5 optimizes repeated supply calculations and minimap redraws without deliberately changing the underlying combat rules.

The supply network is a gameplay model, **not** a full historical railroad or transportation simulation.

### 7. Air operations

- Produce fighters and bombers and organize air wings.
- Select operating regions, airbases, and available mission types.
- Air activity can affect battlefield support, air control, and infrastructure damage.
- Range, weather, radar, base conditions, strength, and aircraft losses influence operations.

Air warfare is **region-based and simplified**. Detailed interception, air logistics, detection, and strategic bombing balance are roadmap goals.

### 8. Navies and overseas warfare

- Build fleets using destroyers, submarines, cruisers, battleships, and aircraft carriers.
- Manage fleets, ports, sea zones, missions, and convoy-related operations.
- Use naval presence to escort routes, raid shipping, and support or interfere with overseas transport.
- Carry out amphibious or overseas operations subject to game rules and infrastructure.
- Track naval equipment, losses, resources, and operational limitations.

Naval battles currently use **aggregated combat mechanics**, rather than a ship-by-ship tactical simulation.

### 9. Diplomacy, international politics, and intelligence

- Improve or worsen relations with other nations.
- Negotiate military access and form or join diplomatic groupings.
- Manage guarantees, non-aggression arrangements, and war justifications.
- Declare war and negotiate forms of peace or armistice when conditions are met.
- Trade strategic resources, support partners, and organize lend-lease-style assistance.
- Use intelligence and espionage mechanics to gather information and influence decisions.

These systems are interconnected but still **less deep than the diplomatic and intelligence mechanics of larger commercial strategy games**.

### 10. Campaign events, victories, and saves

- Historical and conditional events with choices, effects, and state changes.
- Active wars, occupied provinces, government transitions, and national capitulation rules.
- Campaign progress, reports, journals, and victory/defeat outcomes.
- Autosave and save slots through browser storage, plus **exportable/importable JSON saves**.
- Validation for incompatible or malformed saves; modded saves record world/mod identity information.

**Backup advice:** Export your campaign as a file before updating the game or changing active mods. Browser storage behavior varies by browser, privacy settings, and launch method.

### 11. Interface, accessibility, and performance

- Self-contained HTML application using a responsive layout and interactive Canvas map.
- Map zoom/pan, province inspection, unit selection, army plans, and contextual actions.
- Minimap with caching, optional minimap visibility, and configurable rendering quality:
  **Economy / Balanced / Sharp**.
- Accessibility options including increased contrast, larger text, and optional manual-order confirmation.
- A **Performance & Diagnostics** panel showing simulation timing, 95th-percentile processing time, map rendering metrics, and current world size.
- Speed control and pause while the simulation runs separately from the main UI.

The interface is accessible on smaller screens, but **desktop play is recommended** for complex military planning.

## Controls

| Control | Action |
| --- | --- |
| Left-click a province | Inspect it or select friendly units |
| Right-click a destination | Order selected units to move |
| Shift + selection | Add units to the selection |
| Drag selection | Select an area of units where supported |
| Mouse wheel / map controls | Zoom the map |
| `Space` | Pause / resume |
| `1`–`5` | Set simulation speed |
| `A` | Armies |
| `O` | Operations |
| `C` | Campaign |
| `I` | Industry |
| `R` | Research |
| `D` | Diplomacy |
| `P` | National focuses |
| `F` | Recenter the map |
| `Esc` | Close a dialog |

There is also an on-screen **Order** action for touch input where right-click is unavailable. In-game labels and instructions are currently in French.

## Modding and custom scenarios

A central goal of Frontières is to support **original alternate-history worlds** through structured **JSON mods**. The current format is **declarative**: it specifies data and supported actions rather than loading arbitrary JavaScript supplied by a mod.

### Mod features available in 1.5

| Capability | Status |
| --- | --- |
| Change scenario description and start bookmark | Available |
| Create new playable countries | Available |
| Change country names, leaders, ideology, industry, and starting armies | Available |
| Transfer existing provinces between countries | Available |
| Add polygonal provinces and define links/sea routes | Available with limits |
| Change selected existing province geometry/data | Available with limits |
| Add or change national focus trees | Available |
| Add technologies and research effects | Available |
| Add events with conditions, choices, and supported state-changing actions | Available |
| Combine compatible mods and detect some conflicts | Available |
| Preview, validate, import, and export JSON in the in-game workshop | Available |
| Track map/mod compatibility when loading saves | Available |
| Replace the *entire* world map with a separate geography | **Not yet supported** |
| Directly import HOI4 or TNO mod files | **Not supported** |
| Load arbitrary JavaScript or executable mod plugins | **Not supported** |

Map extension currently supports **up to 120 additional provinces** and edits to **up to 180 existing provinces** on the base map. Complex custom worlds remain constrained by the existing province model.

### Minimal event mod example

The following shows the basic structure of a small custom event, using the format illustrated by the bundled map demo:

```json
{
  "id": "sample_future",
  "name": "A Different Future",
  "version": 2,
  "scenario": {
    "title": "A Different Future",
    "description": "A fictional alternate timeline.",
    "bookmark": "1936",
    "historical": false
  },
  "events": [
    {
      "id": "first_decision",
      "day": 3,
      "country": "FRA",
      "title": "A New Direction",
      "text": "The government must decide its next move.",
      "choices": [
        {
          "text": "Prepare a national initiative",
          "effect": { "pp": 25 }
        }
      ]
    }
  ]
}
```

To test a mod:

1. Launch Frontières and open **Mods / Atelier de mondes**.
2. Import or paste the JSON, or select one of the included examples.
3. Use **Preview and Validate** to inspect any errors.
4. Activate the mod **before starting a new campaign**.
5. Start the selected scenario and export a save if you wish to keep it.

The repository includes [`data/map-demo.json`](./data/map-demo.json), an example that adds fictional islands, land/sea connections, a new country, and an event. Treat the example and the built-in validation UI as the current format reference.

**Save compatibility:** Changing a mod's map, manifest, or country definitions can intentionally make an old save incompatible. Keep a copy of your mod JSON alongside its corresponding save.

## Repository structure

```text
frontieres-grand-strategy/
├── index.html             # Current self-contained playable build (v1.5)
├── README.md              # Project overview and roadmap
├── LICENSE                # MIT license for original code
├── THIRD_PARTY.md         # Geographic data and image credits
├── .github/workflows/    # CI: syntax, build freshness, engine smoke test
├── tools/
│   ├── build.mjs          # Rebuilds index.html from src/ and data/
│   └── smoke.mjs          # Headless engine smoke test (Node.js)
├── src/
│   ├── shell.html         # Page template; build.mjs inlines the files below
│   ├── engine.js          # Simulation engine source
│   ├── worker.js          # Background simulation worker
│   ├── ui.js              # Interface and user actions
│   └── styles.css         # Interface styles
└── data/
    ├── world.json         # World/province data
    ├── catalog.json       # Technologies, focuses, equipment, events
    ├── people.json        # Country/biographical references
    ├── portraits.json     # Licensed image metadata/references
    ├── sources.json       # Documentary source links
    └── map-demo.json      # Example geography mod
```

### Technical design

- **Vanilla HTML, CSS, and JavaScript** — no React runtime, no game-server requirement.
- A **Web Worker** advances the simulation away from the main interface thread.
- Canvas rendering handles the world map and overlays.
- World, event, equipment, and character data are structured as JSON.
- The game uses deterministic, seeded simulation logic for repeatable internal testing.
- Save files and mod packages use structured JSON.

### Building and testing

`index.html` is generated from `src/shell.html`, which inlines `src/` and `data/`. After editing any of these files, rebuild it with [Node.js](https://nodejs.org/) 18 or newer (no dependencies to install):

```bash
node tools/build.mjs           # rebuild index.html
node tools/build.mjs --check   # fail if index.html is stale
node tools/smoke.mjs           # headless engine test: 1936/1939 campaigns, invariants, save/load, determinism
```

GitHub Actions runs all three checks on every push and pull request. Historical test fixtures, automated browser tests, and development ZIP tools are not yet published.

## Development roadmap

Features listed as **planned** are goals, **not** claims about what the current build already does. Timing and scope may change as testing identifies constraints.

### Development milestones so far

| Milestone | Main emphasis | Status |
| --- | --- | --- |
| `0.1–0.2` | Browser prototype, simulation worker, initial world map, early gameplay | Completed in development |
| `1.0` | Deeper technologies, production, national focuses and operational mechanics | Completed in development |
| `1.1 / 1.1.1` | Historical scenarios, national dossiers, stable province identifiers and save migration | Completed in development |
| `1.2 / 1.2.1` | Armies, battle planning, division templates, encirclement and military corrections | Completed in development |
| `1.3 / 1.3.1` | Domestic politics, budget, taxation, debt, arrears, crises and elections | Completed in development |
| `1.4 / 1.4.1` | JSON mod workshop, custom countries, conditional events, map extensions and validation | Completed in development |
| **`1.5`** | Supply-path and map-rendering optimizations, graphics settings, diagnostic tools | **Current public snapshot** |

These are **project development milestones**, not a claim that each version is separately tagged as a GitHub release.

### Next: v1.6 — Strategic Warfare Update

**Target:** Make multi-year solo campaigns feel coherent, demanding, and distinct between major powers.

- [ ] **Strategic AI:** war preparation, realistic prioritization, front management, reserves, withdrawals, coordinated attacks, and fewer self-destructive offensives.
- [ ] **Operational planning:** multi-army battle plans with preparation stages, territorial objectives, breakthrough exploitation, and defensive fallback plans.
- [ ] **Ground balance:** improve planning bonuses, logistics penalties, entrenchment, attrition, encirclements, and equipment consumption.
- [ ] **Air warfare:** clearer regional air superiority, missions, interception, aircraft range, airfield capacity, ground support, and strategic bombing.
- [ ] **Naval warfare:** task-force behavior, convoy escort/raiding, submarine operations, blockade effects, carrier roles, and amphibious support.
- [ ] **Logistics and wartime industry:** make fuel, infrastructure, convoy losses, and equipment deficits more consequential.
- [ ] **National campaigns:** richer historical and alternative decisions for Germany, France, the United Kingdom, the USSR, the USA, and Japan.
- [ ] **Military UX:** clearer battle reports, frontline alerts, losses, supply forecasts, and operational objectives.
- [ ] **Balance scenarios:** automated and hands-on playthroughs for European and Pacific theatres, 1936–1945.

**Acceptance goal:** The AI should meaningfully wage war on multiple fronts and sustain a campaign. Presence of a UI button alone will not count as feature completion.

### Next: v1.6.1 — Stability and Campaign Validation

- [ ] Resolve regressions introduced by the warfare update.
- [ ] Test long-running 1936–1945 campaigns, including save/export/reload cycles.
- [ ] Validate key historical decision chains and starting configurations.
- [ ] Test modded world compatibility, migration errors, and save corruption handling.
- [ ] Test ordinary local HTTP launch, persistent browser storage, and additional browsers.
- [ ] Profile large armies, frequent wars, and complex modded maps.
- [ ] Improve bug reports, diagnostics, and reproducible automated tests.

### Long-term: v2.0 — First Complete Single-Player Release

- [ ] A well-balanced, documented solo campaign experience across the main playable nations.
- [ ] More consistent military, air, naval, diplomatic, and economic AI.
- [ ] Polished onboarding, tutorial, notifications, accessibility, and map feedback.
- [ ] Release packaging and changelog discipline (reproducible build script and CI checks are in place).
- [ ] A stable mod format with compatibility guidelines and documented examples.
- [ ] Better historical data review, portrait handling, citations, and asset-license auditing.
- [ ] Clear win/lose states, campaign objectives, and post-campaign reporting.

### Beyond v2.0 — Larger alternate-history worlds

Long-term experiments may include a **full map-replacement format**, deeper scripted narrative events, more expressive political systems, campaign-specific UIs, localization, and extensive fictional cold-war scenarios.

A TNO-scale alternate-history experience is a **future inspiration, not current compatibility**: existing HOI4/TNO assets or mods cannot simply be loaded into Frontières. Any future scenario should use original content and assets with appropriate permissions.

### Explicitly out of scope

- Multiplayer networking, lobbies, and online competitive play.
- Direct reuse of Paradox Interactive source code or proprietary game assets.
- Claims of one-to-one historical, military, or economic accuracy.

## Known limitations

Please read this section before reporting a feature as broken:

1. **Historical accuracy is approximate.** Modern low-resolution base geography is adapted for gameplay; not all country borders, names, military deployments, or leaders are exhaustively researched.
2. **The AI is heuristic.** Strategic preparation and combined-arms coordination need substantial improvement.
3. **Air and naval operations are abstracted.** They affect the campaign but are not deep tactical simulations.
4. **The economy is game-scaled.** GDP, budgets, votes, demographics, and industrial outputs are not real-world historical datasets.
5. **Modding extends the current world.** It cannot yet replace all 3,396 base provinces with a wholly independent map.
6. **Save compatibility is conditional.** Export backups and preserve the original mod data used for each campaign.
7. **The UI is currently French.** This README is English; full UI localization is a future goal.
8. **Browser support needs broader testing.** Development testing has focused on Chromium. The original automated environment did not certify real `file://` behavior or persistence across normal user browser sessions.
9. **Some portraits require Internet access.** Portrait files are generally referenced rather than bundled. Third-party licensing varies.
10. **The GitHub source snapshot is not yet a full developer SDK.** The build script and CI are available (see [Building and testing](#building-and-testing)), but historical test fixtures and browser tests are not published yet.

## Contributing and bug reports

Feedback, testing, well-scoped pull requests, and original scenario/mod contributions are welcome.

To report a bug, open a [GitHub issue](https://github.com/PdB333/frontieres-grand-strategy/issues) and include:

- Game version and browser/operating system.
- Starting country, start year, speed, and relevant difficulty/historical settings.
- Steps to reproduce, the expected result, and what actually happened.
- Whether mods were active; include the relevant mod JSON where possible.
- A screenshot, the in-game diagnostic information, and a **redacted** save file if useful.

For feature proposals, reference the corresponding roadmap section and explain the gameplay problem you want to solve. Avoid uploading proprietary game assets, unlicensed portraits, credentials, or personal data.

## Frequently asked questions

**Is this a Hearts of Iron IV mod?**  
No. Frontières is an independent browser strategy project and does not contain the HOI4 engine or its assets.

**Can I play without Internet?**  
Yes, core gameplay is local after the files are available. Wikimedia-hosted portraits and external documentary links may need a connection.

**Can I play on a phone?**  
The responsive interface has been exercised in a mobile-sized Chromium viewport, but detailed operations are more comfortable on desktop.

**Can I use my HOI4 or TNO mods?**  
No. Frontières uses its own declarative JSON schema. Direct import/conversion is not supported.

**Does it support multiplayer?**  
No, and there are no plans to add it.

**Is there a hosted demo?**  
The source and standalone game are here on GitHub. GitHub Pages is **not currently configured** for this repository. Run the HTML locally using the instructions above.

**How do I preserve my campaign?**  
Export a JSON save and keep a backup of any active mods. Browser autosaves should not be treated as your only copy.

## License, assets, and acknowledgements

The **original project code and original written game content** are published under the [MIT License](./LICENSE). Third-party data and images are **not automatically covered by MIT**.

- **Geographic basemap:** [Natural Earth](https://www.naturalearthdata.com/) (public-domain map data); in-game 1936/1939 approximations were created for this simulation.
- **Historical portraits and documentary references:** Individual Wikimedia Commons assets and other references have separate rights and attribution requirements. See [`THIRD_PARTY.md`](./THIRD_PARTY.md).
- **Historical subjects:** The inclusion of political leaders, flags, military uniforms, conflicts, or regimes is for historical/educational gameplay context, **not endorsement**.

Frontières is **unaffiliated with Paradox Interactive, Hearts of Iron IV, The New Order, or their respective developers**.

---

*Frontières is a work in progress. Build carefully, document what actually works, and keep the game playable as it grows.*