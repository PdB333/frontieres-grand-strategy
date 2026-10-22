#!/usr/bin/env python3
"""Frontieres 1.6 world data pass (idempotent).

  python3 tools/data/world_1_6.py

* Terrain: adds hills, marsh and jungle to the original five terrain types.
  The rules are schematic gameplay heuristics (latitude bands, mountain
  neighbours and a few documented wetland / rainforest boxes), not a survey.
* Straits: short sea crossings that land units may cross under fire.
* Resources: aluminium, tungsten and chromium deposits, placed in the regions
  that dominated their production in the 1930s. Quantities are game values.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / 'data' / 'world.json'

world = json.loads(WORLD.read_text(encoding='utf-8'))
P = world['provinces']


def inside(p, box):
    x0, x1, y0, y1 = box
    return x0 <= p['x'] <= x1 and y0 <= p['y'] <= y1


def spread(pid):
    # Deterministic pseudo-random choice per province (Knuth multiplicative hash).
    return (pid * 2654435761) % 4294967296 / 4294967296


# --- Terrain ---------------------------------------------------------------
MARSH = [
    (23.5, 31.5, 51.0, 53.2),    # Polesie / Pripiat
    (28.6, 30.2, 44.6, 45.6),    # Danube delta
    (45.5, 48.5, 30.0, 32.5),    # Mesopotamian marshes
    (29.0, 32.5, 5.5, 9.5),      # Sudd
    (-58.5, -55.0, -20.5, -16.0),  # Pantanal
    (-81.8, -80.0, 25.0, 26.8),  # Everglades
    (74.0, 83.0, 55.5, 59.5),    # Vasyugan
    (4.5, 7.0, 52.5, 53.5),      # Frisian / Groningen polders
    (21.0, 24.0, 53.0, 54.5),    # Masurian lakes and Biebrza
]
JUNGLE = [
    (9.0, 31.0, -9.0, 5.5),      # Congo basin
    (-79.0, -48.0, -14.0, 6.0),  # Amazon
    (93.0, 152.0, -11.0, 21.0),  # South-East Asia and the islands
    (-93.0, -76.0, 6.5, 18.5),   # Central America
    (-14.0, 10.5, 4.0, 9.5),     # Guinea coast
    (72.0, 77.5, 8.0, 13.0),     # Malabar
]
HILLS = [
    (1.0, 5.0, 44.0, 46.5),      # Massif central
    (4.6, 6.6, 49.5, 50.6),      # Ardennes
    (18.0, 26.5, 41.0, 45.0),    # Balkan interior
    (30.0, 42.0, 37.0, 40.5),    # Anatolian plateau
    (-84.5, -75.0, 35.0, 42.0),  # Appalachians
    (-6.0, -3.0, 56.0, 58.6),    # Scottish highlands
    (11.0, 16.5, 40.0, 44.2),    # Apennines
    (-8.0, -1.5, 39.5, 42.5),    # Meseta
    (36.0, 45.0, 31.0, 37.0),    # Levant and upper Mesopotamia hills
    (73.0, 80.0, 15.0, 22.0),    # Deccan
    (102.0, 111.0, 22.0, 30.0),  # Yunnan-Guizhou plateau
    (-104.0, -98.0, 17.0, 23.5),  # Mexican highlands
]

original = {p['id']: p['terrain'] for p in P}
changed = {'hills': 0, 'marsh': 0, 'jungle': 0}
for p in P:
    t = original[p['id']]
    if t not in ('plains', 'forest'):
        continue
    if any(inside(p, b) for b in MARSH):
        p['terrain'] = 'marsh'
    elif t == 'forest' and abs(p['y']) < 12 or any(inside(p, b) for b in JUNGLE):
        p['terrain'] = 'jungle'
    else:
        mountains = sum(1 for n in p['neighbors'] if original[n] == 'mountains')
        if any(inside(p, b) for b in HILLS) or mountains >= 2 or (mountains == 1 and spread(p['id']) < .6):
            p['terrain'] = 'hills'
    if p['terrain'] != t:
        changed[p['terrain']] += 1

# --- Straits ----------------------------------------------------------------
STRAITS = [
    ('Détroit de Gibraltar', (-5.6, 36.05), (-5.75, 35.8)),
    ('Dardanelles', (26.4, 40.3), (26.6, 40.05)),
    ('Bosphore', (28.98, 41.1), (29.1, 40.98)),
    ('Øresund', (12.6, 55.68), (13.0, 55.6)),
    ('Grand Belt', (10.85, 55.3), (11.15, 55.33)),
    ('Petit Belt', (9.7, 55.5), (9.9, 55.42)),
    ('Détroit de Messine', (15.55, 38.2), (15.65, 38.15)),
    ('Détroit de Kertch', (36.45, 45.3), (36.7, 45.2)),
    ('Bouches de Bonifacio', (9.2, 41.4), (9.2, 41.2)),
    ('Bab-el-Mandeb', (43.45, 12.65), (43.3, 12.45)),
    ("Détroit d'Ormuz", (56.3, 26.25), (56.3, 27.0)),
    ('Détroit de Johor', (103.82, 1.35), (103.75, 1.5)),
    ('Détroit de Shimonoseki', (130.95, 34.0), (130.9, 33.9)),
    ('Détroit de Tsugaru', (140.8, 41.2), (140.6, 41.6)),
    ('Détroit de la Sonde', (105.8, -5.9), (105.95, -6.1)),
    ('Détroit de Palk', (79.4, 9.3), (79.9, 9.05)),
    ('Détroit de Mackinac', (-84.72, 45.78), (-84.72, 45.86)),
]


def point_in_ring(x, y, ring):
    inside_ = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            inside_ = not inside_
        j = i
    return inside_


def nearest(point):
    x, y = point
    for p in P:
        if any(point_in_ring(x, y, ring) for ring in p['polygons']):
            return p
    return min(P, key=lambda p: min(math.hypot(vx - x, vy - y) for ring in p['polygons'] for vx, vy in ring))


straits = {}
for name, a, b in STRAITS:
    pa, pb = nearest(a), nearest(b)
    if pa['id'] == pb['id']:
        continue
    key = ':'.join(str(i) for i in sorted((pa['id'], pb['id'])))
    straits[key] = name
    if pb['id'] not in pa['neighbors']:
        pa['neighbors'] = sorted(pa['neighbors'] + [pb['id']])
        pb['neighbors'] = sorted(pb['neighbors'] + [pa['id']])
world['straits'] = straits

# --- Strategic resources -----------------------------------------------------
DEPOSITS = {
    'aluminium': [
        ('FRA', (5.0, 7.2, 43.0, 44.2), 8), ('HUN', (16.5, 19.5, 46.3, 47.8), 6),
        ('YUG', (15.5, 19.0, 42.8, 44.8), 6), ('ITA', (12.5, 16.5, 41.3, 45.8), 4),
        ('USA', (-94.0, -91.0, 33.5, 35.5), 10), ('HOL', (-58.5, -53.5, 2.0, 6.5), 8),
        ('GBR', (-61.5, -56.5, 1.5, 8.5), 6), ('GRE', (21.5, 24.0, 37.8, 39.2), 3),
        ('SOV', (32.5, 35.0, 58.5, 60.5), 5), ('SOV', (58.0, 62.0, 55.5, 60.0), 5),
        ('GBR', (-3.5, 1.5, 4.5, 8.0), 3), ('HOL', (103.5, 105.5, 0.3, 1.8), 4),
        ('GER', (11.5, 13.0, 50.0, 51.5), 2), ('RAJ', (83.0, 86.0, 21.0, 24.0), 2),
    ],
    'tungsten': [
        ('CHI', (111.0, 117.0, 23.5, 28.0), 20), ('RAJ', (96.5, 99.5, 12.5, 19.0), 8),
        ('POR', (-8.8, -6.5, 39.5, 42.2), 6), ('SPA', (-9.3, -6.5, 41.8, 43.8), 3),
        ('USA', (-121.0, -114.0, 34.5, 41.5), 6), ('JPN', (125.5, 129.8, 35.0, 39.5), 5),
        ('SOV', (68.0, 90.0, 46.0, 53.0), 3), ('BOL', (-68.5, -64.5, -21.0, -15.5), 5),
        ('ARG', (-68.0, -64.0, -32.0, -26.0), 2), ('SIA', (98.0, 101.0, 7.0, 15.0), 2),
        ('AST', (144.0, 148.5, -43.5, -40.0), 2), ('GBR', (100.5, 104.0, 1.5, 6.5), 2),
    ],
    'chromium': [
        ('TUR', (27.0, 42.0, 36.0, 40.5), 12), ('SOV', (56.0, 62.0, 49.5, 56.5), 10),
        ('SAF', (25.5, 31.5, -26.5, -22.5), 8), ('GBR', (28.5, 32.5, -21.5, -16.5), 8),
        ('YUG', (20.3, 23.0, 40.8, 42.6), 4), ('GRE', (20.5, 24.5, 39.0, 41.5), 3),
        ('PHI', (118.5, 122.5, 13.5, 18.5), 4), ('FRA', (163.5, 168.0, -23.0, -19.5), 5),
        ('CUB', (-78.0, -74.0, 19.8, 21.5), 3), ('RAJ', (65.5, 68.5, 28.5, 31.5), 3),
        ('ALB', (19.5, 20.8, 40.5, 42.5), 2),
    ],
}
for resource in DEPOSITS:
    for p in P:
        p[resource] = 0
placed = {}
for resource, rows in DEPOSITS.items():
    for owner, box, amount in rows:
        cx, cy = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
        sites = [p for p in P if inside(p, box) and p['owner'] == owner]
        # Large schematic provinces may have their centroid outside a small box:
        # fall back to the owner's provinces nearest to the deposit.
        sites = sites or [p for p in P if p['owner'] == owner]
        sites.sort(key=lambda p: (math.hypot(p['x'] - cx, p['y'] - cy), p['id']))
        sites = sites[:3]
        for i, p in enumerate(sites):
            share = amount // len(sites) + (1 if i < amount % len(sites) else 0)
            p[resource] += share
        placed[resource] = placed.get(resource, 0) + amount

world['version'] = '1.6.0'
WORLD.write_text(json.dumps(world, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
print('terrain', changed, 'straits', len(straits), 'resources', placed)
