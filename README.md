# Frontières

**A single-player grand strategy game for the browser — build a nation, shape history, and command a world at war.**

**Current playable version:** `1.9` &nbsp;|&nbsp; **Project status:** Alpha / actively developed &nbsp;|&nbsp; **Interface:** French &nbsp;|&nbsp; **Documentation:** English &nbsp;|&nbsp; **License:** MIT (original code)

[Play / download `index.html`](./index.html) · [Source code](./src/) · [Game data](./data/) · [Roadmap](#development-roadmap) · [Modding](#modding-and-custom-scenarios) · [Report an issue](https://github.com/PdB333/frontieres-grand-strategy/issues)

---

## What is Frontières?

**Frontières** is an original, turnless, day-by-day grand strategy simulation inspired by the *genre* of historical WWII strategy games. It runs in a modern web browser, focuses on **single-player campaigns**, and combines national leadership, production, research, diplomacy, intelligence, land warfare, air operations, naval strategy, and an extensible JSON modding system.

Start in **1936** and navigate the crises leading to World War II, or select the **1939** starting point and enter a world already close to global conflict. Select a country, develop its industrial base, choose a political direction, prepare your military forces, and respond to the decisions of other nations.

The goal is **not** to recreate another game's code or assets. Frontières is its own lightweight strategy project with its own rules, interface, data formats, and roadmap. The historical world is an *approximation for gameplay*, not an authoritative historical atlas.

> **Important:** This is a **development build, not a finished commercial-quality simulation**. Many systems are playable but deliberately abstracted; the AI, historical borders and balance still need work, and the content volume (map detail, focus trees, events) is far smaller than in large commercial games. The UI is currently in French. Multiplayer is **not planned**.

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

| Category | Included in version 1.6 |
| --- | --- |
| World map | **81** starting countries, **11,592** land provinces cut from the Natural Earth 1:10m regions and grouped into **1,735** states, **8** terrain types, **12** straits |
| Starting scenarios | **1936** and **1939** historical bookmarks |
| Campaign engine | Pausable, day-by-day simulation with 5 speed settings, hourly battles and AI-controlled countries |
| Historical content | **71** historical event/government entries, **82** conditional events (45 of them national), **44** releasable nations |
| National focus trees | **23** country-specific trees plus a generic tree; **64–70** focuses per tree with exclusive regime paths |
| Technology | **150** technologies across 10 research categories, including exclusive land, naval and air doctrines |
| Production | **24** equipment types, **73** equipment models, tank/aircraft/ship designers, **13** building types |
| Ground forces | **20** battalion and **15** support types, battle plans, reserves, combat width, weather and attrition |
| Air and sea | **2,487** sea provinces in **226** named sea regions, **158** air regions; air superiority, interception, close support, strategic and naval bombing, paradrops, carriers; patrols, strike forces, convoy raiding along the sea routes, mines, sea control and naval invasions |
| State management | **17** laws (economy, conscription, trade), **33** advisors, **59** national spirits, **76** decisions, budgets and elections |
| Intelligence | Relations, espionage and intelligence-based information (abstracted) |
| Modding | Declarative JSON scenarios, countries, territory changes, new provinces, technologies, focuses, and events |
| Saves | Browser storage plus JSON export/import, with compatibility checks |
| Display | Canvas-based interactive map, overlays, minimap, accessibility and performance controls |
| Online services | **None required for core gameplay** |
| Multiplayer | **Not planned** |

### What's new in 1.9 — generals

- **129 historical commanders** for 23 countries (Manstein, Guderian, Joukov, Wavell, Juin, Yamashita, Mannerheim…), with a skill level, four statistics and traits; other countries raise officers whose names come from their language. Commander names are historical; levels, statistics and traits are original game values.
- **25 traits:** personality traits (offensive spirit, master of defence, planner, logistician, cunning, cautious, reckless…), terrain traits learnt in battle (mountaineer, desert fox, jungle rat, street fighter, winter general, river crosser…) and arms traits (armour leader, infantry officer, artilleryman, engineer, commando).
- **Experience and levels:** each day of battle earns experience; a level raises one statistic; terrain and arms traits are learnt after enough days of fighting in the matching conditions.
- **Marshals and army groups:** a general of level 3 or more can be promoted to marshal (50 political power); only a marshal commands an army group, and passes half of their traits to each of its armies. An army is built for 24 divisions: beyond that its general's bonuses thin out.
- **Battle tactics:** each day of battle the attacker (frontal assault, infiltration, artillery preparation, envelopment, armoured assault, methodical attack) and the defender (hold the line, counter-attack, elastic withdrawal, ambush, dig in) pick a tactic; each counters one tactic of the other side, and the commander with the initiative can adapt to the opponent's choice.
- **The Soviet purges** remove Tukhachevsky, Yegorov and Blyukher from the roster on their historical dates (historical mode).
- **AI:** each front sector is split into armies of at most 24 divisions with their own generals, grouped under a marshal; the AI recruits officers at war and promotes marshals.
- New **staff screen** (Armées → État-major): levels, experience, traits, learning progress, recruitment, promotion and dismissal. Battle reports show the tactics of the day.

### What's new in 1.8 — seas and skies

- **2,487 sea provinces** cover the world ocean: small along the coasts, large in the open ocean. Canals and narrow straits (Suez, Panama, Kiel, the Turkish straits, Kerch, the Øresund, Messina) are linked; inland waters such as the Caspian are left out.
- **226 sea regions** named after the seas of Natural Earth (Manche, golfe de Gascogne, mer Tyrrhénienne, mer Égée, golfe de Botnie…); the oceans are split into pieces named after their nearest large port ("Atlantique Nord (large de Brest)").
- **158 air regions** grouped like strategic regions (Région de Paris, de Brest, de Lyon…), outlined in the air view.
- Fleets take days to cross regions (about 800 km a day); invasions and convoys need control of every region on the way; **raiders only sink the convoys whose routes cross their region**.
- AI: a weaker navy stays in port as a fleet in being; air wings are shared out between fronts and home air defence and avoid hopeless air battles.
- The naval view tints each region by sea control and shows fleets at sea; region lists are grouped by theatre.
- 1.7 saves are converted on load (fleets go to the region of their port, wings to the region of their base); mods may still use the old zone names.

### What's new in 1.7 — the detailed map

- **11,592 land provinces** instead of 3,396. They are cut from the 4,594 first-level administrative regions of Natural Earth 1:10m (public domain) along the borders of January 1936: the Polish corridor, Danzig, East Prussia, Bessarabia, Ruthenia, the Karelian isthmus, the Chinese regional powers and the colonial empires keep their 1936 owners.
- **1,735 states** follow the real regions (Bavaria, Silesia, the French departments grouped by area, Russian oblasts…); small regions are grouped and large ones split. Provinces are Voronoi cells of a weighted k-means, centred on the main cities.
- **Density by theatre:** about 1,700 km² per province in Europe, larger in Russia, much larger in deserts, the tundra, Siberia and the oceans' islands.
- **Ranges in kilometres:** supply losses and movement times follow the real distance between provinces, so smaller provinces do not shorten supply lines; starting factories gather in the cities.
- **Warfare on a finer map:** taking an undefended province means marching through it, so armour exploits a breach about twice as fast as infantry; a civil war ends with the winner holding the whole country; the AI no longer prefers puppets just because a country has many states.
- **Performance:** cached province borders, a faster path search, a daily rim of each country, a cached world view (1–3 ms per frame zoomed out) and compact saves (about half the size, provinces stored by columns).
- **Content:** national focus trees, events and decisions for 15 secondary powers.
- 1.6 saves cannot be opened on the new map.

### What's new in 1.6 — the strategic warfare update

- **States and resources:** provinces are grouped into states with shared building slots and categories; six strategic resources (steel, oil, rubber, aluminium, tungsten, chromium), synthetic refineries and trade laws.
- **Terrain and weather:** hills, marshes and jungles; straits; seasonal mud, snow, frost and storms; attrition.
- **Divisions and equipment:** 20 battalions and 15 support companies; equipment generations, tank/aircraft/ship designers and modernisation.
- **Land war:** battles last several days and are resolved hour by hour, with combat width, reserves and reinforcements; battle plans with front lines, offensive arrows and fallback lines.
- **Navy and air:** fleet missions (patrol, strike, escort, raid, mines, sweep), detection and sea control, naval invasions; air superiority, interception, close air support, strategic, logistics and naval bombing, paradrops and carriers.
- **Peace and diplomacy:** capitulation with governments in exile, peace conferences with state-by-state demands, war goals, volunteers and expeditionary forces, subject autonomy, releasable nations and ideological civil wars.
- **Politics:** extended laws, advisors and chiefs of staff, national spirits, decisions, regime paths in the focus trees and conditional events.
- **AI:** country profiles, front sectors sized by the enemy facing them, doctrine-driven production and research, air and naval missions, naval invasions, advisors and decisions.
- **Scale:** Chinese regional powers and Iceland as new playable countries; indexed war lookups and a faster supply flood (about 40 % less time per simulated day in a 1939 world war).

All rules, names and texts are original to Frontières; no file, text, icon or map data comes from another game.

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

- **81 starting countries** with names, ideologies, industries, military forces, and initial leadership information, including the Chinese regional powers of 1936 (Yan'an communists, Shanxi, Guangxi, Yunnan, the Muslim north-west, Xinjiang) and Iceland.
- **1,735 states** following the Natural Earth regions: shared building slots, categories (from wasteland to megalopolis) and core territory.
- **Eight terrain types** (plains, forest, hills, mountains, marsh, jungle, desert, urban), **12 straits** crossable under fire, and seasonal weather (mud, snow, frost, sea storms).
- **Two historical starts:** January 1936 and late August 1939, with scenario-specific geopolitical adjustments.
- **11,592 land provinces** cut from the Natural Earth 1:10m administrative regions along the 1936 borders, with terrain, owners, infrastructure, industry, resources, supply connections, and other gameplay properties.
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
- National focus trees for **France, Germany, the United Kingdom, the Soviet Union, the United States, Italy, Japan, and China**, plus a generic tree for other countries: 64 to 69 focuses each, with political, economic, military research and foreign policy branches.
- National trees for **15 secondary powers** (Poland, Spain, Romania, Czechoslovakia, Turkey, Yugoslavia, Hungary, the Netherlands, Belgium, Sweden, Finland, Canada, Australia, India and Brazil): national names, three regime paths of their own and a branch of national priorities (fortified lines, strategic resources, alliances, claims, research), with three national events and two national decisions each, taken by the AI as well.
- Mutually exclusive **regime paths** (democratic, fascist, communist, authoritarian) that can change the government, grant national spirits, join factions, guarantee neighbours or justify war goals; OR prerequisites and conditions.
- **Laws** for the economy (6), conscription (7) and trade (4); **33 advisors** and chiefs of staff in six offices; **59 national spirits**; **76 decisions** in five categories.
- **82 conditional events** (strikes, scandals, discoveries, mutinies, partisans, codebreaking, Danzig, the Sudetenland, Finland's winter, the Bengal shortage…) with a mean time to happen, answered by the AI as well; the draws depend on the campaign seed.

These political systems are **simulation abstractions** rather than historically measured election results or an exhaustive representation of individual states.

### 3. Economy, budgets, and industry

- Civilian factories, military factories, dockyards, and construction queues; factories, dockyards and refineries share each state's building slots.
- **Thirteen building types:** civilian and military factories, dockyards, synthetic refineries, infrastructure, railways, logistics hubs, forts, coastal forts, anti-aircraft defences, ports, airbases, and radar stations.
- **24 equipment types** (from rifles and anti-tank guns to heavy tanks, naval bombers and carriers) with **73 models** across generations; tank, aircraft and ship **designers** with **61 modules**; production lines can modernise existing stocks.
- Production-line allocation, efficiency, equipment stockpiles, resource shortages, and industrial bottlenecks.
- **Six strategic resources** — steel, oil, rubber, aluminium, tungsten and chromium — with trade laws deciding how much is exported.
- National budget controls: taxation, welfare/services, spending, treasury, borrowing, debt limits, interest, inflation, and fiscal balance.
- Financial crises with **arrears**, which can affect national production and social stability.
- Rationing, national economic models, investment choices, and the political costs of difficult decisions.
- Economic charts, monthly history, and projections for assessing policy choices.

**All GDP, treasury, debt, employment, and electoral quantities are gameplay indices or fictional units**, not claims about actual national accounts.

### 4. Research and national development

The base game includes **150 technologies**:

| Research field | Technologies |
| --- | ---: |
| Industry | 16 |
| Infantry | 18 |
| Armor | 15 |
| Aircraft | 17 |
| Navy | 13 |
| Logistics | 11 |
| Land doctrines | 25 |
| Naval doctrines | 12 |
| Air doctrines | 10 |
| Electronics | 13 |
| **Total** | **150** |

Land doctrines offer four exclusive paths (motorised manoeuvre, battle of materiel, methodical battle, nation in arms); naval and air doctrines three each. Technologies unlock battalions, support companies, equipment models, designer modules and buildings. Focuses and events grant research bonuses for a domain.

### 5. Armies, divisions, and ground warfare

- Form armies, assign available officers and commanders, and group divisions.
- **Generals and marshals** with levels, experience and traits; army groups under a marshal; daily battle tactics that can counter each other.
- Create or modify division templates from **20 battalion types** (infantry, mountain, marines, paratroopers, cavalry, motorised, mechanised, light/medium/heavy armour, artillery, anti-tank, anti-air…) and **15 support companies**.
- Battles last several days and are resolved **hour by hour**: combat width depends on terrain and attack directions, reserves enter the line, and disorganised divisions withdraw.
- **Battle plans:** draw a front line, offensive arrows and a fallback line; planning builds up and decays while attacking.
- Division statistics cover manpower, equipment, soft/hard attack, defense, breakthrough, armor, piercing, organization, speed, combat width, and more.
- Recruit and reequip divisions; shortages can reduce combat effectiveness.
- Give movement orders manually or configure army-level **fronts, postures, objectives, and offensive plans**.
- Choose tactical approaches including balanced combined-arms fighting, concentrated breakthrough, and elastic defense.
- Simulated combat considers terrain, weather, fortifications, supply, planning, organization, equipment, and tactical bonuses.
- Detect encircled divisions; cut-off forces can suffer attrition and lose access to routine reinforcement.
- Battle reports, casualties, territorial changes, and a dedicated military/operations interface.

The AI splits each border into sectors, sizes an army for each according to the enemy facing it, attacks when the odds allow and probes quiet fronts every few months. It remains **heuristic**.

### 6. Logistics and supply

- Province supply values affected by national access, infrastructure, railways, logistics hubs, ports, terrain, and damage.
- Sea connections and convoy availability matter for overseas supply.
- Poor supply affects movement, organization, attack effectiveness, and reinforcement.
- Isolation and encirclement can make an otherwise strong army collapse.
- Supply flows from capitals and ports (weighted by convoys and blockades) through accessible territory; each province is settled once at its best value, and the loss along the way follows the distance in kilometres.
- Weather and terrain cause attrition; winter gear and doctrines reduce it.

The supply network is a gameplay model, **not** a full historical railroad or transportation simulation.

### 7. Air operations

- Produce fighters, close-support aircraft, tactical, strategic and naval bombers and transport planes, and organise air wings.
- Missions per aircraft type: air superiority, interception, close air support, strategic bombing, logistics strikes, naval strikes, port strikes, air supply and paradrops.
- Air control in each of the 158 air regions, anti-aircraft defences and aircraft range; air superiority penalises the enemy's land combat.

Air wings count their planes and fight in waves, but they operate over regions rather than flying individual routes.

### 8. Navies and overseas warfare

- Build fleets using destroyers, submarines, cruisers, battleships, and aircraft carriers, from designed ship models.
- Fleet missions: patrol, strike force, convoy escort, raiding, minelaying, minesweeping and invasion support; detection and **sea control** in each of the 226 sea regions, crossed at about 800 km a day.
- **Naval invasions** need sea control and convoys; landings fight at a penalty, marines reduce it.
- Carriers project naval aircraft; mines and submarines threaten convoys and supply.

Naval battles still use **aggregated combat mechanics**, rather than a ship-by-ship tactical simulation.

### 9. Diplomacy, international politics, and intelligence

- Improve or worsen relations with other nations.
- Negotiate military access and form or join diplomatic groupings.
- Manage guarantees, non-aggression arrangements, and war justifications.
- Declare war with a **war goal** (conquest, vassalisation, border rectification); send **volunteers** or **expeditionary forces**.
- **Capitulation** depends on lost victory points and land; a defeated country can continue the war in **exile** with an ally.
- **Peace conferences** distribute states, puppets and liberated nations between the winners according to their contribution.
- Subjects gain or lose **autonomy**; **44 releasable nations**; ideological **civil wars** when a rival party dominates an unstable country.
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

### Mod features available in 1.7

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
├── index.html             # Current self-contained playable build (v1.7)
├── README.md              # Project overview and roadmap
├── LICENSE                # MIT license for original code
├── THIRD_PARTY.md         # Geographic data and image credits
├── .github/workflows/    # CI: syntax, build freshness, engine smoke test
├── tools/
│   ├── build.mjs          # Rebuilds index.html from src/ and data/
│   ├── smoke.mjs          # Headless engine smoke test (Node.js)
│   ├── browser-smoke.mjs  # Starts a campaign in headless Chromium (Playwright)
│   └── data/              # Map generator (1.7) and idempotent data passes (catalogue, content)
│       └── legacy/        # The 1.6 map, kept as the 1936 reference of the generator
├── src/
│   ├── shell.html         # Page template; build.mjs inlines the files below
│   ├── engine.js          # Simulation engine source (1.5 rules)
│   ├── systems.js         # 1.6 systems layered on the engine
│   ├── worker.js          # Background simulation worker
│   ├── ui.js              # Interface and user actions
│   ├── ui16.js            # 1.6 panels, map modes and dialogs
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

`tools/browser-smoke.mjs` opens `index.html` in headless Chromium, starts a campaign, runs the clock and fails on any page error, console error or in-game error notification. It needs Playwright:

```bash
npm install --no-save playwright && npx playwright install chromium
node tools/browser-smoke.mjs
```

`tools/bench.mjs` is a balance bench: it runs AI-only campaigns with several seeds in parallel and prints when each major power capitulated (`node tools/bench.mjs 1939 1400 1,2,3,4`).

GitHub Actions runs all of these checks on every push and pull request. Historical test fixtures and development ZIP tools are not yet published.

The map is generated by `python3 -I tools/data/map_1_7.py --ne DIR`, where `DIR` holds `ne_10m_admin_1_states_provinces.geojson` and `ne_10m_populated_places.geojson` from the `geojson/` folder of [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) (it needs `shapely`, `numpy`; about one minute), then `python3 -I tools/data/seas_1_8.py --ne DIR` adds the sea provinces, sea regions and air regions (it also needs `scipy` and `ne_10m_geography_marine_polys.geojson`; about two minutes). The 1936 reference (owners, borders, terrain, cities, ports, resources, regions, straits) is the 1.6 map in `tools/data/legacy/`, itself produced by `tools/data/world_1_6.py`, which only runs on that map. The catalogue comes from two idempotent scripts run in this order: `python3 tools/data/catalog_1_6.py` (buildings, laws, equipment, battalions, advisors, spirits, decisions, AI profiles) and `python3 tools/data/content_1_6.py` (focus trees, doctrines, events, AI plans), then `python3 tools/data/generals_1_9.py` adds commander traits, rosters, name pools and battle tactics.

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
| `1.5` | Supply-path and map-rendering optimizations, graphics settings, diagnostic tools | Completed in development |
| `1.6` | States, resources, weather, battalions and designers, hourly battles and plans, air and naval war, peace conferences, politics, AI, content | Completed in development |
| `1.7` | Detailed map: 11,592 provinces from Natural Earth 1:10m regions, national content for 15 secondary powers | Completed in development |
| `1.8` | Sea provinces and 226 sea regions, 158 air regions, regional naval and air AI | Completed in development |
| **`1.9`** | Generals and marshals: traits, experience, army groups, battle tactics | **Current public snapshot** |

These are **project development milestones**, not a claim that each version is separately tagged as a GitHub release.

### v1.9 — Generals (current)

- [x] **Commanders:** 129 historical commanders, levels, experience, 25 traits learnt or innate.
- [x] **Command structure:** marshals and army groups, 24-division armies.
- [x] **Battle tactics:** eleven tactics with counters and initiative.
- [x] **AI:** armies split by sector under marshals, recruitment and promotions.

### v1.8 — Seas and Skies

- [x] **Sea provinces and regions:** 2,487 sea provinces, 226 named sea regions, canals and straits.
- [x] **Air regions:** 158 strategic air regions.
- [x] **Naval and air rules:** travel times between regions, convoy raiding along the routes, control along invasion paths.
- [x] **AI:** fleets in being, air wings shared between fronts and home defence.

### v1.7 — Detailed Map

- [x] **Map:** 11,592 provinces and 1,735 states cut from the Natural Earth 1:10m regions along the 1936 borders.
- [x] **Distances:** supply and movement measured in kilometres.
- [x] **Performance:** faster path search, cached borders and world view, compact saves.
- [x] **Content:** national trees, events and decisions for 15 secondary powers.

### v1.6 — Strategic Warfare Update

- [x] **States and economy:** state building slots, six strategic resources, refineries, trade laws, extended economy and conscription laws.
- [x] **Terrain and weather:** hills, marshes, jungles, straits, mud, snow, frost, storms and attrition.
- [x] **Divisions and equipment:** battalions and support companies, equipment generations, designers and modernisation.
- [x] **Operational planning:** multi-day hourly battles with reserves; front lines, offensive arrows and fallback lines.
- [x] **Air warfare:** air superiority, interception, close support, strategic, logistics and naval bombing, paradrops, carriers.
- [x] **Naval warfare:** fleet missions, detection, sea control, mines, raiding and naval invasions.
- [x] **Peace and diplomacy:** capitulation and exile, peace conferences, war goals, volunteers, expeditionary forces, autonomy, releasables, civil wars.
- [x] **Politics and content:** advisors, national spirits, decisions, larger focus trees with regime paths, doctrines, electronics, conditional events.
- [x] **Strategic AI:** front sectors, doctrine-driven production and research, air and naval missions, invasions, decisions.
- [x] **Scale:** new starting countries and a faster simulation.

### Next: logistics, intelligence, special weapons, presentation

- [ ] **Logistics:** trucks and trains consumed by supply, railway lines.
- [ ] **Intelligence and occupation:** an intelligence agency, operatives and operations, occupation laws and resistance.
- [ ] **Special weapons:** atomic research, rockets, railway guns.
- [ ] **Presentation:** flags, relief, sound, an English interface.
- [ ] **Content:** fully unique national trees.
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

1. **Historical accuracy is approximate.** Modern low-resolution base geography is adapted for gameplay; not all country borders, names, military deployments, or leaders are exhaustively researched. The 11,592 provinces follow modern administrative regions cut along schematic 1936 borders, so a border can be off by a province or two.
2. **The AI is heuristic.** It manages fronts, production, research, air, navy and invasions, but long campaigns can still diverge strongly from history (a civil war can last seven months or three years depending on the seed).
3. **Air and naval movement is regional.** Ships are tracked individually and air wings count their planes, but fleets and wings are assigned to sea and air regions; they do not follow individual tracks inside a region.
4. **The economy is game-scaled.** GDP, budgets, votes, demographics, and industrial outputs are not real-world historical datasets.
5. **Modding extends the current world.** It cannot yet replace the 11,592 base provinces with a wholly independent map. Mod effects accept the 1.6 bonus keys (organization, breakthrough, entrench, attrition, surrender…), but mods cannot yet define new battalions, laws, advisors or decisions.
6. **Content volume is limited.** Focus trees, events and decisions are original and playable, but far less numerous than in commercial games.
7. **Save compatibility is conditional.** Saves made before 1.7 belong to the old map and cannot be opened; 1.7 saves are converted to the 1.8 regions on load, and 1.8 saves keep their officers, who receive levels and roles. Compact saves weigh about 2 MB, so the browser's local storage only holds a few of them. Export backups and preserve the original mod data used for each campaign.
8. **The UI is currently French.** This README is English; full UI localization is a future goal.
9. **Browser support needs broader testing.** Development testing has focused on Chromium. The original automated environment did not certify real `file://` behavior or persistence across normal user browser sessions.
10. **Some portraits require Internet access.** Portrait files are generally referenced rather than bundled. Third-party licensing varies.
11. **The GitHub source snapshot is not yet a full developer SDK.** The build script and CI are available (see [Building and testing](#building-and-testing)), but historical test fixtures are not published yet.

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