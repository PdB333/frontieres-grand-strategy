#!/usr/bin/env python3
"""Frontieres 1.10 railway network, supply hubs and locomotives (idempotent).

  python3 -I tools/data/rails_1_10.py

Run after seas_1_8.py and generals_1_9.py. Adds to every province of
data/world.json a railway level ("rail", 0 to 5) and a supply hub level
("hub", 0 to 2), and the list of railway links between provinces
("railLinks"). The network is schematic: within each country (and each
landmass of it) the main town of every state is linked to the others by a
minimum spanning tree of land paths that avoid mountains, jungles and
marshes; densely built regions (western Europe, the north-east of the United
States, Japan) receive extra links between neighbouring towns, sparse regions
only keep lines between their main cities and ports, and international lines
join the towns facing each other across a border. The density classes are a
rough approximation of the 1936 networks, not survey data. The catalogue
receives the locomotive equipment used by the railways.
"""
import heapq
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / 'data' / 'world.json'
CATALOG = ROOT / 'data' / 'catalog.json'
world = json.loads(WORLD.read_text(encoding='utf-8'))
P = world['provinces']

# Density classes: A dense, B medium, C sparse (the default). Boxes are
# (west, south, east, north) in degrees; the first matching box wins.
DENSE = [
    ('A', (-10.5, 35.5, 24.5, 59.5)),    # western and central Europe
    ('A', (-98, 29, -66, 49)),           # north-east and middle west of the United States
    ('A', (129, 30.5, 146, 45.6)),       # Japan
    ('B', (24.5, 42, 60, 62)),           # European Russia and Ukraine
    ('B', (5, 59.5, 32, 66)),            # southern Scandinavia and Finland
    ('B', (13, 36, 30, 48)),             # Balkans
    ('B', (-125, 25, -98, 49.5)),        # western United States
    ('B', (-125, 42, -60, 54.5)),        # southern Canada
    ('B', (-106.5, 15.5, -95, 26)),      # central Mexico
    ('B', (68, 8, 92, 33)),              # India
    ('B', (120, 38.5, 131.5, 50)),       # Manchuria
    ('B', (124.5, 33.5, 130.5, 43)),     # Korea
    ('B', (119.5, 21.8, 122.2, 25.5)),   # Taiwan
    ('B', (105, -9, 115, -5.5)),         # Java
    ('B', (-66, -39.5, -57, -26.5)),     # Argentine pampas
    ('B', (-51, -26, -40, -19)),         # south-east Brazil
    ('B', (-73.5, -40, -70, -30)),       # central Chile
    ('B', (138, -39.5, 154, -26)),       # south-east Australia
    ('B', (114.5, -35.5, 119, -30)),     # south-west Australia
    ('B', (16, -35, 33, -22)),           # South Africa
    ('B', (29, 22, 34.5, 32)),           # Nile valley
    ('B', (-10, 30, 11, 37.5)),          # Maghreb coast
    ('B', (26, 36, 34, 42)),             # western Anatolia
    ('B', (34, 29, 37, 37.5)),           # Levant
]
# No railways: polar and empty lands.
EMPTY = [
    (-180, 66.5, 180, 90),               # Arctic
    (-170, 56, -50, 66.5),               # northern Canada and Alaska
    (-60, 59, -10, 66.5),                # Greenland and Iceland
    (60, 58.5, 180, 66.5),               # northern Siberia
    (-12, 17.5, 28.5, 29),               # Sahara
    (-79, -12, -50, 3),                  # Amazon basin
    (36, 15, 56, 29.5),                  # Arabian peninsula
    (78, 28.5, 100, 37),                 # Tibet
    (87, 41, 119.5, 50),                 # Mongolia
]


def density(p):
    x, y = p['x'], p['y']
    for w, s, e, n in EMPTY:
        if w <= x <= e and s <= y <= n:
            return None
    for cls, (w, s, e, n) in DENSE:
        if w <= x <= e and s <= y <= n:
            return cls
    return 'C'


def km(a, b):
    la1, la2 = math.radians(a['y']), math.radians(b['y'])
    d = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(math.radians(b['x'] - a['x']) / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(d)))


# Railways follow valleys and plains.
TERRAIN_COST = {'plains': 1, 'urban': 1, 'forest': 1.25, 'hills': 1.6, 'desert': 1.8, 'marsh': 2.6, 'jungle': 3.2, 'mountains': 3.2}
straits = set()
for key in world.get('straits', {}):
    a, b = map(int, key.split(':'))
    straits.add((a, b))
    straits.add((b, a))
cls = [density(p) for p in P]


def step(i, j):
    return km(P[i], P[j]) * (TERRAIN_COST.get(P[i]['terrain'], 1.5) + TERRAIN_COST.get(P[j]['terrain'], 1.5)) / 2


def dijkstra(src, allowed, targets=None, limit=math.inf):
    dist = {src: 0.0}
    prev = {}
    heap = [(0.0, src)]
    left = set(targets) if targets else None
    while heap:
        d, i = heapq.heappop(heap)
        if d > dist.get(i, math.inf) or d > limit:
            continue
        if left is not None:
            left.discard(i)
            if not left:
                break
        for j in P[i]['neighbors']:
            if (i, j) in straits or not allowed(j):
                continue
            nd = d + step(i, j)
            if nd < dist.get(j, math.inf):
                dist[j] = nd
                prev[j] = i
                heapq.heappush(heap, (nd, j))
    return dist, prev


def path(prev, src, dst):
    out = [dst]
    while out[-1] != src:
        out.append(prev[out[-1]])
    return out


# The main town of each state: most victory points, then cities and ports.
seat = {}
for p in P:
    best = seat.get(p['state'])
    key = (p['vp'], p['city'], p['port'], -p['id'])
    if best is None or key > (P[best]['vp'], P[best]['city'], P[best]['port'], -best):
        seat[p['state']] = p['id']
seats = set(seat.values())
# Sparse regions keep their main towns at least this far apart (km).
SPACING = {'A': 0, 'B': 90, 'C': 420}


def candidate(p, c):
    if p['capital'] or p['city']:
        return True
    if c == 'A':
        return p['vp'] >= 1 or p['id'] in seats
    if c == 'B':
        return p['vp'] >= 2 or p['port'] >= 3 or p['id'] in seats
    return p['port'] >= 3 or p['id'] in seats


def pick_nodes(ids):
    order = sorted((i for i in ids if candidate(P[i], cls[i])), key=lambda i: (-P[i]['capital'], -P[i]['city'], -P[i]['vp'], -P[i]['port'], i))
    chosen = []
    for i in order:
        gap = SPACING[cls[i]]
        if P[i]['capital'] or P[i]['city'] or not gap or all(km(P[i], P[j]) >= gap for j in chosen if cls[j] == cls[i]):
            chosen.append(i)
    return sorted(chosen)


# Lines of sparse regions longer than this (path cost) only join major towns.
SPARSE_REACH = 1300


def major(i):
    return P[i]['capital'] or P[i]['city'] or P[i]['vp'] >= 5


level = [0] * len(P)
links = {}
RANK = {'trunk': 0, 'main': 1, 'branch': 2}
LEVELS = {'A': (4, 3, 2), 'B': (3, 2, 1), 'C': (2, 1, 1)}


def lay(route, kind):
    for i in route:
        c = cls[i]
        if c is None:
            continue
        level[i] = max(level[i], LEVELS[c][RANK[kind]])
    for a, b in zip(route, route[1:]):
        key = (min(a, b), max(a, b))
        links[key] = min(links.get(key, 9), RANK[kind])


def kind_of(a, b):
    pa, pb = P[a], P[b]
    if pa['capital'] or pb['capital'] or (pa['vp'] >= 5 and pb['vp'] >= 5):
        return 'trunk'
    if pa['vp'] >= 3 or pb['vp'] >= 3:
        return 'main'
    return 'branch'


owners = sorted({p['owner'] for p in P})
nodes_of = {}
lines = 0
for owner in owners:
    mine = {p['id'] for p in P if p['owner'] == owner and cls[p['id']] is not None}
    nodes = pick_nodes(mine)
    nodes_of[owner] = nodes
    if len(nodes) < 2:
        continue
    allowed = lambda j, mine=mine: j in mine
    # Prim's tree over the cities; path costs come from one search per city.
    searches = {}
    for i in nodes:
        searches[i] = dijkstra(i, allowed, targets=nodes)
    remaining = set(nodes)
    while remaining:
        root = min(remaining, key=lambda i: (-P[i]['vp'] - 100 * P[i]['capital'], i))
        tree = {root}
        remaining.discard(root)
        frontier = []
        for j in remaining:
            d = searches[root][0].get(j)
            if d is not None:
                heapq.heappush(frontier, (d, root, j))
        while frontier:
            d, a, b = heapq.heappop(frontier)
            if b in tree:
                continue
            tree.add(b)
            remaining.discard(b)
            if 'C' in (cls[a], cls[b]) and d > SPARSE_REACH and not (major(a) and major(b)):
                pass
            else:
                lay(path(searches[a][1], a, b), kind_of(a, b))
                lines += 1
            for j in remaining:
                dj = searches[b][0].get(j)
                if dj is not None:
                    heapq.heappush(frontier, (dj, b, j))
    # Dense and medium regions: extra links to the nearest cities.
    for i in nodes:
        c = cls[i]
        if c == 'C':
            continue
        extra, reach = (2, 380) if c == 'A' else (1, 300)
        near = sorted((d, j) for j, d in searches[i][0].items() if j in searches and j != i and d <= reach)
        for d, j in near[:extra]:
            lay(path(searches[i][1], i, j), kind_of(i, j))
            lines += 1

# International lines: the closest pair of cities across each land border
# between two countries of the dense or medium classes.
pairs = {}
for p in P:
    for j in p['neighbors']:
        q = P[j]
        if q['owner'] == p['owner'] or (p['id'], j) in straits:
            continue
        if cls[p['id']] is not None and cls[j] is not None:
            key = tuple(sorted((p['owner'], q['owner'])))
            pairs.setdefault(key, []).append((p['id'], j))
for (a, b), border in sorted(pairs.items()):
    na, nb = nodes_of.get(a, []), nodes_of.get(b, [])
    # Sparse borders are only crossed between major towns.
    if all(cls[x] == 'C' or cls[y] == 'C' for x, y in border):
        na, nb = [n for n in na if major(n)], [n for n in nb if major(n)]
    if not na or not nb:
        continue
    crossings = 0
    # One crossing per 600 km of border, at most three.
    span = max(1, min(3, round(sum(km(P[x], P[y]) for x, y in border[:200]) / 600)))
    used = []
    for x, y in sorted(border, key=lambda e: (min(km(P[e[0]], P[n]) for n in na) + min(km(P[e[1]], P[n]) for n in nb), e)):
        if crossings >= span or any(km(P[x], P[u]) < 400 for u in used):
            continue
        sa = min(na, key=lambda n: (km(P[x], P[n]), n))
        sb = min(nb, key=lambda n: (km(P[y], P[n]), n))
        if km(P[sa], P[sb]) > (900 if cls[sa] == 'C' or cls[sb] == 'C' else 450):
            continue
        both = {i for i in range(len(P)) if P[i]['owner'] in (a, b) and cls[i] is not None}
        dist, prev = dijkstra(sa, lambda j: j in both, targets=[sb], limit=1800)
        if sb in dist:
            lay(path(prev, sa, sb), 'main')
            used.append(x)
            crossings += 1
            lines += 1

# Capitals and large cities sit on the busiest junctions.
for p in P:
    i = p['id']
    if cls[i] is None:
        continue
    if p['capital']:
        level[i] = min(5, max(level[i], LEVELS[cls[i]][0]) + 1)
    elif p['vp'] >= 10 and level[i]:
        level[i] = min(5, level[i] + 1)

# Supply hubs: the capital (level 2) and the main railway city of each state.
hub = [0] * len(P)
states = {}
for p in P:
    states.setdefault(p['state'], []).append(p['id'])
for pids in states.values():
    best = max((i for i in pids if level[i] > 0), key=lambda i: (P[i]['vp'], level[i], -i), default=None)
    if best is not None and (cls[best] in ('A', 'B') or P[best]['vp'] >= 2 or P[best]['city']):
        hub[best] = 1
for p in P:
    if p['capital']:
        hub[p['id']] = 2

for p in P:
    p['rail'] = level[p['id']]
    p['hub'] = hub[p['id']]
world['railLinks'] = [[a, b] for (a, b) in sorted(links) if level[a] and level[b]]
WORLD.write_text(json.dumps(world, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

count = sum(1 for v in level if v)
by = {}
for i, v in enumerate(level):
    if v:
        by[v] = by.get(v, 0) + 1
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
catalog['equipment']['trains'] = {'name': 'Locomotives', 'cost': 10, 'steel': 2, 'icon': 'train', 'domain': 'land'}
catalog['models']['trains'] = [{'id': 'trains_1930', 'name': 'Locomotives', 'year': 1930, 'tech': None, 'cost': 1, 'stats': {}}]
CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

print('links', len(world['railLinks']), 'lines', lines, 'rail provinces', count, 'levels', dict(sorted(by.items())), 'hubs', sum(1 for h in hub if h))
