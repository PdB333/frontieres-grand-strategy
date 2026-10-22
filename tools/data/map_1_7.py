#!/usr/bin/env python3
"""Frontieres 1.7 map: Natural Earth 1:10m regions adjusted to the 1936 world.

  python3 -I tools/data/map_1_7.py --ne DIR

DIR holds two Natural Earth 1:10m GeoJSON files (public domain), taken from
https://github.com/nvkelso/natural-earth-vector (folder geojson/):
  ne_10m_admin_1_states_provinces.geojson
  ne_10m_populated_places.geojson

The previous 1936 map (tools/data/legacy/world-1936-v11.json.gz, 3,396
provinces) remains the reference for everything historical: 1936 owners and
borders, administrations, terrain, air zones, sea zones, documented regions,
cities, victory points, ports, resources, straits, sea routes and rivers.
The new geometry comes from the 1:10m first-order administrative regions:

1. The region coverage is simplified with shared borders preserved.
2. Each region is cut along the 1936 borders of the reference map; thin
   slivers caused by the coarser reference borders are merged back.
3. Regions are grouped (small ones) or split (large ones) into states.
4. Each state is divided into provinces by weighted k-means and Voronoi
   cells, with the main cities as fixed centres. The density follows the
   theatre: dense in Europe, sparse in deserts, tundra and oceans' islands.
5. Attributes are inherited from the reference province under each new
   province; point features (cities, ports, resources) go to the province
   that contains them.

The output replaces data/world.json. Saves of the previous map do not load.
"""
import argparse
import gzip
import hashlib
import json
import math
import random
import unicodedata
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import LineString, MultiPoint, MultiPolygon, Point, Polygon, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / 'tools' / 'data' / 'legacy' / 'world-1936-v11.json.gz'
OUT = ROOT / 'data' / 'world.json'
MAP_ID = 'frontieres-1936-history-v12'

TARGET_PROVINCES = 11500
PROVINCES_PER_STATE = 8
SIMPLIFY = 0.03          # degrees, shared borders preserved
MIN_ISLAND = 150         # km2; smaller islands are dropped unless they carry a reference province
KM = 111.32

# Square kilometres per province before the global scaling, by theatre
# (first matching box: lon0, lon1, lat0, lat1), then multiplied by terrain
# and latitude factors. Europe is dense, deserts, tundra and oceans sparse.
DENSITY = [
    ((-11, 32, 35, 60), 1700),      # Europe
    ((32, 60, 42, 62), 5000),       # European Russia, Ukraine
    ((-25, 32, 60, 72), 2400),      # Nordic countries (then the latitude factor)
    ((32, 60, 62, 72), 9000),       # Karelia, Russian north
    ((26, 50, 36, 43.5), 2600),     # Anatolia, Caucasus
    ((-18, 37, 27, 38), 8000),      # North African coast
    ((34, 63, 12, 40), 12000),      # Middle East
    ((46, 90, 35, 56), 20000),      # Central Asia
    ((60, 180, 50, 90), 50000),     # Siberia
    ((124, 146, 30, 46), 2500),     # Japan, Korea
    ((118, 135, 38, 54), 6000),     # Manchuria
    ((97, 125, 18, 42), 6000),      # China proper
    ((73, 125, 25, 56), 25000),     # Mongolia, Xinjiang, Tibet
    ((60, 98, 5, 37), 9000),        # India
    ((92, 160, -11, 25), 10000),    # South-East Asia, Indonesia, Philippines
    ((-20, 55, -36, 27), 35000),    # Sub-Saharan Africa
    ((-125, -66, 25, 49), 18000),   # United States
    ((-170, -50, 49, 85), 30000),   # Canada, Alaska
    ((-118, -77, 7, 25), 12000),    # Mexico, Central America
    ((-90, -59, 10, 27), 6000),     # Caribbean
    ((-82, -34, -56, 13), 30000),   # South America
    ((110, 180, -50, -11), 50000),  # Australia, New Zealand
]
TERRAIN_AREA = {'desert': 3.0, 'jungle': 1.6, 'mountains': 1.3, 'marsh': 1.4}
DIRECTIONS = ['est', 'nord-est', 'nord', 'nord-ouest', 'ouest', 'sud-ouest', 'sud', 'sud-est']


def km2(g):
    """Approximate area in km2 of a lon/lat geometry."""
    if g.is_empty:
        return 0.0
    parts = g.geoms if hasattr(g, 'geoms') else [g]
    return sum(p.area * KM * KM * math.cos(math.radians(p.centroid.y)) for p in parts)


def polygons(g):
    """Polygon parts of any geometry."""
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    if hasattr(g, 'geoms'):
        return [p for x in g.geoms for p in polygons(x)]
    return []


def merge(parts):
    parts = [p for p in parts if not p.is_empty]
    if not parts:
        return Polygon()
    u = unary_union(parts)
    return unary_union(polygons(u)) if not isinstance(u, (Polygon, MultiPolygon)) else u


def dist_km(a, b):
    return math.hypot((a[0] - b[0]) * math.cos(math.radians((a[1] + b[1]) / 2)), a[1] - b[1]) * KM


def direction(c, centre):
    angle = math.atan2(c[1] - centre[1], (c[0] - centre[0]) * math.cos(math.radians(centre[1])))
    return DIRECTIONS[int(round(angle / (math.pi / 4))) % 8]


# --- Reference map -------------------------------------------------------------------
def load_legacy():
    legacy = json.loads(gzip.open(LEGACY).read().decode('utf-8'))
    geoms = []
    for p in legacy['provinces']:
        parts = []
        for ring in p['polygons']:
            if len(ring) >= 3:
                q = Polygon(ring)
                parts.append(q if q.is_valid else shapely.make_valid(q))
        geoms.append(merge(parts))
    return legacy, geoms


class Reference:
    def __init__(self, legacy, geoms):
        self.world = legacy
        self.P = legacy['provinces']
        self.geoms = geoms
        self.tree = STRtree(geoms)
        owners = {}
        for p, g in zip(self.P, geoms):
            owners.setdefault(p['owner'], []).append(g)
        self.owner_names = sorted(owners)
        self.owner_geoms = [merge(owners[o]) for o in self.owner_names]
        self.owner_area = {o: km2(g) for o, g in zip(self.owner_names, self.owner_geoms)}
        self.owner_tree = STRtree(self.owner_geoms)
        self.coastal = [i for i, p in enumerate(self.P) if p['coast']]
        self.coast_tree = STRtree([geoms[i] for i in self.coastal])

    def at(self, x, y):
        """Index of the reference province under a point (nearest if none)."""
        pt = Point(x, y)
        hits = self.tree.query(pt, predicate='intersects')
        if len(hits):
            return int(min(hits))
        return int(self.tree.query_nearest(pt)[0])

    def nearest_coastal(self, g):
        j = self.coast_tree.query_nearest(g, return_distance=True)
        return self.coastal[int(j[0][0])], float(j[1][0])


# --- Step 1-2: regions cut along the 1936 borders ---------------------------------------
def load_regions(ne):
    data = json.loads((ne / 'ne_10m_admin_1_states_provinces.geojson').read_text(encoding='utf-8'))
    geoms, meta = [], []
    for f in data['features']:
        p = f['properties']
        if p['adm0_a3'] == 'ATA':
            continue
        g = shape(f['geometry'])
        geoms.append(g if g.is_valid else shapely.make_valid(g))
        name = (p.get('name_fr') or p.get('name') or p.get('admin') or '').strip()
        meta.append({'name': name, 'adm0': p['adm0_a3'], 'admin': p.get('admin') or ''})
    geoms = list(shapely.coverage_simplify(geoms, SIMPLIFY))
    return [shapely.make_valid(g) if not g.is_valid else g for g in geoms], meta


def substantial(piece, unit_area, owner, ref):
    area = km2(piece)
    if ref.owner_area.get(owner, 0) < 6000:
        return area > 30
    if area >= .15 * unit_area:
        return True
    if area < 1500:
        return False
    core = piece.buffer(-.1)
    return core.area >= .25 * piece.area


def cut_regions(geoms, meta, ref):
    pieces = []
    for ui, g in enumerate(geoms):
        hits = [ref.owner_names[i] for i in ref.owner_tree.query(g, predicate='intersects')]
        if len(hits) <= 1:
            owner = hits[0] if hits else ref.P[ref.at(*g.representative_point().coords[0])]['owner']
            pieces.append((owner, g, ui))
            continue
        inter = {}
        for o in hits:
            x = merge(polygons(g.intersection(ref.owner_geoms[ref.owner_names.index(o)])))
            if not x.is_empty and x.area > 1e-7:
                inter[o] = x
        if not inter:
            pieces.append((ref.P[ref.at(*g.representative_point().coords[0])]['owner'], g, ui))
            continue
        # Land outside the coarse reference borders (coasts, islands) joins
        # the piece it touches most, or the reference owner under it.
        rest = polygons(g.difference(merge(list(inter.values()))))
        extra = {}
        for part in rest:
            if part.area < 1e-8:
                continue
            grown = part.buffer(.02)
            touch = {o: grown.intersection(x).area for o, x in inter.items()}
            o = max(touch, key=lambda k: (touch[k], k))
            if touch[o] <= 0:
                o = ref.P[ref.at(*part.representative_point().coords[0])]['owner']
            extra.setdefault(o, []).append(part)
        for o, parts in extra.items():
            inter[o] = merge([inter.get(o, Polygon())] + parts)
        unit_area = km2(g)
        keep = {o: x for o, x in inter.items() if substantial(x, unit_area, o, ref)}
        if not keep:
            o = max(inter, key=lambda k: (inter[k].area, k))
            keep = {o: g}
        else:
            # Slivers along borders that did not change since 1936 merge back
            # into the neighbouring piece they share most border with.
            for o, x in inter.items():
                if o in keep:
                    continue
                grown = x.buffer(.02)
                best = max(keep, key=lambda k: (grown.intersection(keep[k]).area, keep[k].area, k))
                keep[best] = merge([keep[best], x])
        for o, x in sorted(keep.items()):
            pieces.append((o, x, ui))
    return pieces


# --- Island filter ---------------------------------------------------------------------
def explode(pieces, ref):
    """Polygon parts of every piece; small islands survive only when they carry a reference province."""
    parts = []
    for o, g, ui in pieces:
        for poly in polygons(g):
            parts.append({'owner': o, 'geom': poly, 'unit': ui, 'area': km2(poly)})
    # Small parts touching other land are small regions, not islands.
    tree = STRtree([p['geom'] for p in parts])
    a_idx, b_idx = tree.query([p['geom'] for p in parts], predicate='dwithin', distance=.003)
    attached = {int(a) for a, b in zip(a_idx, b_idx) if a != b}
    big = [p for i, p in enumerate(parts) if p['area'] >= MIN_ISLAND or i in attached]
    small = [p for i, p in enumerate(parts) if not (p['area'] >= MIN_ISLAND or i in attached)]
    big_tree = STRtree([p['geom'] for p in big])
    small_tree = STRtree([p['geom'] for p in small]) if small else None
    rescued = set()
    for lp in ref.P:
        pt = Point(lp['x'], lp['y'])
        j, d = big_tree.query_nearest(pt, return_distance=True)
        if d[0] <= .05 or small_tree is None:
            continue
        k, dk = small_tree.query_nearest(pt, return_distance=True)
        if dk[0] < min(1.0, d[0]):
            rescued.add(int(k[0]))
    return big + [small[k] for k in sorted(rescued)]


# --- Step 3: states ---------------------------------------------------------------------
def province_area(part, ref):
    c = part['geom'].representative_point()
    lp = ref.P[ref.at(c.x, c.y)]
    area = next((a for (x0, x1, y0, y1), a in DENSITY if x0 <= c.x <= x1 and y0 <= c.y <= y1), 20000)
    area *= TERRAIN_AREA.get(lp['terrain'], 1.0)
    lat = abs(c.y)
    if lat > 66:
        area *= 4
    elif lat > 60:
        area *= 2.2
    return area


def build_states(parts, meta, ref):
    for p in parts:
        p['weight'] = p['area'] / province_area(p, ref)
    total = sum(p['weight'] for p in parts)
    scale = TARGET_PROVINCES / total
    for p in parts:
        p['weight'] *= scale
    blocks = []
    by_owner = {}
    for p in parts:
        by_owner.setdefault(p['owner'], []).append(p)
    for owner in sorted(by_owner):
        own = by_owner[owner]
        # A block is a region piece; islands far from it stand alone.
        groups = {}
        for p in own:
            groups.setdefault(p['unit'], []).append(p)
        units = []
        for ui in sorted(groups):
            ps = sorted(groups[ui], key=lambda p: -p['area'])
            main = [ps[0]]
            alone = []
            for p in ps[1:]:
                (main if p['geom'].distance(ps[0]['geom']) < 1.5 else alone).append(p)
            units.append(main)
            units += [[p] for p in alone]
        own_blocks = [{'owner': owner, 'parts': u, 'weight': sum(p['weight'] for p in u),
                       'geom': merge([p['geom'] for p in u]), 'units': {u[0]['unit']}} for u in units]
        blocks += merge_blocks(own_blocks, meta)
    states = []
    for b in blocks:
        states += split_block(b)
    return states, scale


def merge_blocks(blocks, meta):
    """Small neighbouring regions of one owner are grouped into states."""
    small = .45 * PROVINCES_PER_STATE
    alive = list(range(len(blocks)))
    while True:
        alive.sort(key=lambda i: (blocks[i]['weight'], i))
        geoms = [blocks[i]['geom'] for i in alive]
        tree = STRtree(geoms)
        merged = False
        for pos, i in enumerate(alive):
            b = blocks[i]
            if b['weight'] >= small:
                break
            near = [alive[j] for j in tree.query(b['geom'].buffer(.02), predicate='intersects') if alive[j] != i]
            if not near:
                near = [alive[j] for j in tree.query(b['geom'].buffer(2.0), predicate='intersects') if alive[j] != i]
                near = [j for j in near if b['geom'].distance(blocks[j]['geom']) < 2.5]
            near = [j for j in near if blocks[j]['weight'] + b['weight'] <= 2.2 * PROVINCES_PER_STATE]
            if not near:
                continue
            adm0 = {meta[u]['adm0'] for u in b['units']}
            j = min(near, key=lambda j: (not adm0 & {meta[u]['adm0'] for u in blocks[j]['units']}, blocks[j]['weight'], j))
            t = blocks[j]
            t['parts'] += b['parts']
            t['weight'] += b['weight']
            t['geom'] = merge([t['geom'], b['geom']])
            t['units'] |= b['units']
            alive.remove(i)
            merged = True
            break
        if not merged:
            return [blocks[i] for i in sorted(alive)]


def sample(geom, n, rng):
    """Points spread over a geometry in proportion to the real area."""
    minx, miny, maxx, maxy = geom.bounds
    shapely.prepare(geom)
    pts = []
    tries = 0
    while len(pts) < n and tries < 60:
        tries += 1
        k = max(64, n * 3)
        xs = np.array([rng.uniform(minx, maxx) for _ in range(k)])
        ys = np.array([math.degrees(math.asin(rng.uniform(math.sin(math.radians(miny)), math.sin(math.radians(maxy))))) for _ in range(k)])
        ok = shapely.contains_xy(geom, xs, ys)
        pts += list(zip(xs[ok], ys[ok]))
    if not pts:
        c = geom.representative_point()
        pts = [(c.x, c.y)]
    return np.array(pts[:n])


def kmeans(points, k, fixed, rng, lat0, iters=14):
    """Lloyd iterations in a local equal-scale plane; fixed centres never move."""
    cos0 = math.cos(math.radians(lat0))
    X = np.column_stack([points[:, 0] * cos0, points[:, 1]])
    centres = [(x * cos0, y) for x, y in fixed]
    order = list(range(len(X)))
    rng.shuffle(order)
    for i in order:
        if len(centres) >= k:
            break
        if all((X[i][0] - c[0]) ** 2 + (X[i][1] - c[1]) ** 2 > 1e-6 for c in centres):
            centres.append(tuple(X[i]))
    C = np.array(centres[:k], dtype=float)
    nfix = min(len(fixed), k)
    for _ in range(iters):
        d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        for j in range(nfix, len(C)):
            sel = X[lab == j]
            if len(sel):
                C[j] = sel.mean(axis=0)
    return [(x / cos0, y) for x, y in C]


def split_geom(geom, centres, lat0):
    """Voronoi cells of the centres, clipped to the geometry; detached bits join a neighbour."""
    seen = set()
    centres = [c for c in centres if not ((round(c[0], 5), round(c[1], 5)) in seen or seen.add((round(c[0], 5), round(c[1], 5))))]
    if len(centres) == 1:
        return [geom]
    cos0 = math.cos(math.radians(lat0))
    pts = MultiPoint([(x * cos0, y) for x, y in centres])
    minx, miny, maxx, maxy = geom.bounds
    frame = shapely.box(minx * cos0 - 5, miny - 5, maxx * cos0 + 5, maxy + 5)
    cells = shapely.voronoi_polygons(pts, extend_to=frame, ordered=True).geoms
    cells = [shapely.affinity.scale(c, xfact=1 / cos0, yfact=1, origin=(0, 0)) for c in cells]
    out = [[] for _ in centres]
    orphans = []
    for i, (cell, c) in enumerate(zip(cells, centres)):
        bits = polygons(cell.intersection(geom))
        if not bits:
            continue
        cp = Point(c)
        home = min(range(len(bits)), key=lambda k: (bits[k].distance(cp), -bits[k].area))
        out[i].append(bits[home])
        orphans += [b for k, b in enumerate(bits) if k != home]
    for b in sorted(orphans, key=lambda g: -g.area):
        grown = b.buffer(.01)
        touch = [(grown.intersection(merge(o)).area if o else 0, -i) for i, o in enumerate(out)]
        best = max(range(len(out)), key=lambda i: touch[i])
        if touch[best][0] <= 0:
            bp = b.representative_point()
            best = min(range(len(centres)), key=lambda i: dist_km((bp.x, bp.y), centres[i]))
        out[best].append(b)
    return [merge(o) for o in out if o]


def split_block(b):
    """A block heavier than two states is split into several states."""
    k = int(round(b['weight'] / PROVINCES_PER_STATE))
    if k <= 1 or b['weight'] < 2.2 * PROVINCES_PER_STATE:
        return [dict(b, split=False)]
    rng = random.Random(hash32(b['owner'] + str(sorted(b['units']))))
    lat0 = b['geom'].representative_point().y
    centres = kmeans(sample(b['geom'], k * 40, rng), k, [], rng, lat0)
    out = []
    for g in split_geom(b['geom'], centres, lat0):
        share = km2(g) / max(1e-9, km2(b['geom']))
        out.append({'owner': b['owner'], 'parts': b['parts'], 'weight': b['weight'] * share, 'geom': g,
                    'units': b['units'], 'split': True})
    return out


def hash32(text):
    return int(hashlib.sha1(text.encode('utf-8')).hexdigest()[:8], 16)


# --- Step 4: provinces --------------------------------------------------------------------
def fold(name):
    text = unicodedata.normalize('NFKD', name or '').encode('ascii', 'ignore').decode('ascii')
    return ''.join(ch for ch in text.lower() if ch.isalnum())


# 1936 names of the reference map and their present-day spellings.
ALIASES = {
    'Fort-Lamy': ["N'Djamena", 'Ndjamena'], 'Tananarive': ['Antananarivo'], 'Saigon': ['Ho Chi Minh City'],
    'Stettin': ['Szczecin'], 'Breslau': ['Wroclaw', 'Wrocław'], 'Konigsberg': ['Kaliningrad'], 'Salisbury': ['Harare'],
    'Leningrad': ['Saint Petersburg', 'St. Petersburg', 'Saint-Petersbourg'], 'Stalingrad': ['Volgograd'],
    'Sverdlovsk': ['Yekaterinburg', 'Iekaterinbourg'], 'Taihoku': ['Taipei'], 'Keijo': ['Seoul'],
    'Karafuto': ['Yuzhno-Sakhalinsk'], 'Madras': ['Chennai'], 'Lourenço Marques': ['Maputo'],
    'Stanleyville': ['Kisangani'], 'Leopoldville': ['Kinshasa'], 'Batavia': ['Jakarta'], 'Viipuri': ['Vyborg'],
    'Petsamo': ['Pechenga', 'Nikel'], 'Memel': ['Klaipeda'], 'Vilno': ['Vilnius'], 'Lwow': ['Lviv', 'Lvov'],
    'Uzhhorod': ['Uzhgorod'], 'Cernauti': ['Chernivtsi', 'Tchernivtsi'], 'Mukden': ['Shenyang'],
}


def city_anchors(ref, places):
    """Reference cities placed on their Natural Earth town: by name first, then
    the capital coordinates of the country, then the largest town nearby."""
    by_name = {}
    for pl in places:
        for key in {fold(pl['name']), fold(pl.get('alt'))}:
            if key:
                by_name.setdefault(key, []).append(pl)
    capitals = {c['capital']: c for c in ref.world['countries']}
    tree = STRtree([Point(p['x'], p['y']) for p in places])
    anchors = []
    for i, lp in enumerate(ref.P):
        if not (lp['city'] or lp['vp'] >= 3):
            continue
        x, y = lp['x'], lp['y']
        name = lp['name'].split(' / ')[0]
        keys = [fold(name)] + [fold(k) for k in ALIASES.get(name, [])]
        named = [pl for k in keys for pl in by_name.get(k, []) if dist_km((x, y), (pl['x'], pl['y'])) < 450]
        if i in capitals:
            x, y = capitals[i]['lon'], capitals[i]['lat']
        elif named:
            best = max(named, key=lambda pl: (pl['pop'], -dist_km((x, y), (pl['x'], pl['y']))))
            x, y = best['x'], best['y']
        else:
            best = None
            for h in tree.query(Point(x, y).buffer(.6)):
                pl = places[int(h)]
                if dist_km((x, y), (pl['x'], pl['y'])) < 40 and pl['pop'] >= 30000 and (best is None or pl['pop'] > best['pop']):
                    best = pl
            if best:
                x, y = best['x'], best['y']
        anchors.append({'ref': i, 'x': x, 'y': y, 'vp': lp['vp']})
    return anchors


def load_places(ne):
    data = json.loads((ne / 'ne_10m_populated_places.geojson').read_text(encoding='utf-8'))
    out = []
    for f in data['features']:
        p = f['properties']
        name = (p.get('NAME_FR') or p.get('NAME') or '').strip()
        if name:
            out.append({'name': name, 'alt': p.get('NAME') or '', 'x': float(p['LONGITUDE']), 'y': float(p['LATITUDE']),
                        'pop': int(p.get('POP_MAX') or 0)})
    return out


def make_provinces(states, anchors):
    anchor_tree = STRtree([Point(a['x'], a['y']) for a in anchors])
    provinces = []
    for si, st in enumerate(states):
        g = st['geom']
        n = max(1, int(round(st['weight'])))
        inside = [anchors[int(j)] for j in anchor_tree.query(g, predicate='intersects')]
        inside.sort(key=lambda a: (-a['vp'], a['ref']))
        fixed = [(a['x'], a['y']) for a in inside[:n]]
        n = max(n, len(fixed))
        if n == 1:
            cells = [g]
        else:
            rng = random.Random(hash32('state%d' % si))
            lat0 = g.representative_point().y
            centres = kmeans(sample(g, n * 35, rng), n, fixed, rng, lat0)
            cells = split_geom(g, centres, lat0)
        for cell in cells:
            provinces.append({'state': si, 'geom': cell})
    return provinces


# --- Step 5: attributes ---------------------------------------------------------------------
def label_point(g):
    part = max(polygons(g), key=lambda p: p.area)
    try:
        c = shapely.ops.polylabel(part, tolerance=.02)
    except Exception:
        c = part.representative_point()
    return (round(c.x, 4), round(c.y, 4))


def rings(g):
    out = []
    for part in sorted(polygons(g), key=lambda p: -p.area):
        for ring in [part.exterior, *part.interiors]:
            pts = []
            for x, y in ring.coords:
                q = [round(x, 2), round(y, 2)]
                if not pts or pts[-1] != q:
                    pts.append(q)
            if len(pts) >= 4:
                out.append(pts)
    return out


def neighbours(provs):
    geoms = [p['geom'] for p in provs]
    tree = STRtree(geoms)
    a_idx, b_idx = tree.query(geoms, predicate='dwithin', distance=.004)
    shared = {}
    for a, b in zip(a_idx, b_idx):
        a, b = int(a), int(b)
        if a >= b:
            continue
        length = geoms[a].boundary.intersection(geoms[b].buffer(.005)).length
        if length > .01:
            shared[(a, b)] = length
    return shared


def unique(names, wanted, centre, c):
    name = wanted
    if name in names:
        name = '%s (%s)' % (wanted, direction(c, centre))
    k = 2
    while name in names:
        name = '%s (%s %d)' % (wanted, direction(c, centre), k)
        k += 1
    names.add(name)
    return name


def build_world(states, meta, anchors, ref, places, log=print):
    L = ref.P
    provs = make_provinces(states, anchors)
    log('provinces', len(provs))
    for p in provs:
        p['area'] = km2(p['geom'])
        p['x'], p['y'] = label_point(p['geom'])
        p['ref'] = ref.at(p['x'], p['y'])
        p['owner'] = states[p['state']]['owner']
    geoms = [p['geom'] for p in provs]
    tree = STRtree(geoms)

    def containing(x, y, owner=None):
        pt = Point(x, y)
        hits = [int(h) for h in tree.query(pt, predicate='intersects')]
        hits = [h for h in hits if owner is None or provs[h]['owner'] == owner] or hits
        if hits:
            return hits[0]
        near = [int(h) for h in tree.query(pt.buffer(1.5))]
        near = [h for h in near if owner is None or provs[h]['owner'] == owner] or near
        if not near:
            return int(tree.query_nearest(pt)[0])
        return min(near, key=lambda h: (geoms[h].distance(pt), h))

    # Cities, victory points, airbases and resources of the reference map.
    for p in provs:
        p.update(city=False, capital=False, vp=0, airbase=0, port=0, name=None, regions=set(),
                 steel=0, oil=0, rubber=0, aluminium=0, tungsten=0, chromium=0, refs=set())
    city_of = {}
    for a in anchors:
        lp = L[a['ref']]
        h = containing(a['x'], a['y'], lp['owner'])
        city_of[a['ref']] = h
        p = provs[h]
        if lp['city'] and (not p['city'] or lp['vp'] > p['vp']):
            p.update(city=True, name=lp['name'].split(' / ')[0], x=round(a['x'], 4), y=round(a['y'], 4))
        p['vp'] += lp['vp']
        p['airbase'] = max(p['airbase'], lp['airbase'])
        p['capital'] = p['capital'] or lp['capital']
        p['refs'].add(a['ref'])
    for i, lp in enumerate(L):
        h = city_of.get(i)
        if h is None:
            h = containing(lp['x'], lp['y'], lp['owner'])
            provs[h]['vp'] += lp['vp']
            provs[h]['airbase'] = max(provs[h]['airbase'], lp['airbase'])
            provs[h]['refs'].add(i)
        for r in ('steel', 'oil', 'rubber', 'aluminium', 'tungsten', 'chromium'):
            provs[h][r] += lp.get(r, 0)

    # Inherited attributes.
    for p in provs:
        lp = L[p['ref']]
        p['zone'] = lp['zone']
        p['terrain'] = 'urban' if p['city'] else ('plains' if lp['terrain'] == 'urban' else lp['terrain'])
        p['administration'] = lp['administration']
        p['confidence'] = lp['cartographicConfidence']
        p['overseas'] = lp['overseas']
        p['regions'] |= set(lp['historicalRegions'])

    # Land borders, coasts and sea zones.
    shared = neighbours(provs)
    log('borders', len(shared))
    nb = [set() for _ in provs]
    free = [p['geom'].boundary.length for p in provs]
    for (a, b), length in shared.items():
        nb[a].add(b)
        nb[b].add(a)
        free[a] -= length
        free[b] -= length
    for i, p in enumerate(provs):
        p['coast'] = False
        p['seaZone'] = None
        if free[i] > .05:
            j, d = ref.nearest_coastal(p['geom'])
            if d < 1.0:
                p['coast'] = True
                p['seaZone'] = L[j]['seaZone']

    # Ports: each reference port goes to the nearest coastal province it covers.
    coastal = [i for i, p in enumerate(provs) if p['coast']]
    ctree = STRtree([geoms[i] for i in coastal])
    port_of = {}
    for i, lp in enumerate(L):
        if not lp['port']:
            continue
        anchor = next((a for a in anchors if a['ref'] == i), None)
        pt = Point(anchor['x'], anchor['y']) if anchor else Point(lp['x'], lp['y'])
        cands = [k for k in coastal if provs[k]['ref'] == i or i in provs[k]['refs']]
        if not cands:
            near = [coastal[int(h)] for h in ctree.query(pt.buffer(2.0))]
            cands = [k for k in near if provs[k]['owner'] == lp['owner']] or near
        if not cands:
            cands = [coastal[int(ctree.query_nearest(pt)[0])]]
        k = min(cands, key=lambda k: (geoms[k].distance(pt), k))
        provs[k]['port'] = max(provs[k]['port'], lp['port'])
        port_of[i] = k

    # Links across water kept from the reference map (straits, island chains).
    by_ref = {}
    for i, p in enumerate(provs):
        by_ref.setdefault(p['ref'], []).append(i)
        for r in p['refs']:
            by_ref.setdefault(r, []).append(i)

    def closest(A, B):
        best = None
        for a in set(A):
            for b in set(B):
                if a == b:
                    continue
                d = geoms[a].distance(geoms[b])
                if best is None or d < best[0]:
                    best = (d, min(a, b), max(a, b))
        return best

    straits = {}
    for key, name in ref.world['straits'].items():
        a, b = map(int, key.split(':'))
        c = closest(by_ref.get(a, []), by_ref.get(b, []))
        if c and c[1] != c[2]:
            nb[c[1]].add(c[2])
            nb[c[2]].add(c[1])
            straits[c[1], c[2]] = name
    # Landmasses of the new map; reference neighbours that now sit on two
    # landmasses keep a link across the water between their closest provinces.
    comp = [-1] * len(provs)
    for i in range(len(provs)):
        if comp[i] >= 0:
            continue
        comp[i] = i
        queue = [i]
        for q in queue:
            for n in nb[q]:
                if comp[n] < 0:
                    comp[n] = i
                    queue.append(n)
    cross = 0
    for a, lp in enumerate(L):
        for b in lp['neighbors']:
            if b <= a:
                continue
            A, B = by_ref.get(a, []), by_ref.get(b, [])
            if not A or not B or {comp[x] for x in A} & {comp[y] for y in B}:
                continue
            c = closest(A, B)
            if c and c[1] != c[2] and c[0] < .6:
                nb[c[1]].add(c[2])
                nb[c[2]].add(c[1])
                cross += 1
    # Islands a few kilometres off another landmass are linked as well.
    ctree2 = STRtree(geoms)
    ia, ib = ctree2.query(geoms, predicate='dwithin', distance=.08)
    for a, b in zip(ia, ib):
        a, b = int(a), int(b)
        if a < b and comp[a] != comp[b] and provs[a]['coast'] and provs[b]['coast'] and b not in nb[a]:
            nb[a].add(b)
            nb[b].add(a)
            cross += 1
    log('straits', len(straits), 'links across water', cross)

    # Order: by country (reference order), state, importance.
    order_c = {c['id']: i for i, c in enumerate(ref.world['countries'])}
    idx = sorted(range(len(provs)), key=lambda i: (order_c[provs[i]['owner']], provs[i]['state'], -provs[i]['vp'], -provs[i]['y'], provs[i]['x']))
    new_id = {old: new for new, old in enumerate(idx)}
    state_order = []
    for i in idx:
        if provs[i]['state'] not in state_order:
            state_order.append(provs[i]['state'])
    state_id = {s: k for k, s in enumerate(state_order)}

    # Names: states after their region (or main town when a region is split),
    # provinces after their city or largest town.
    place_tree = STRtree([Point(pl['x'], pl['y']) for pl in places])
    town = {}
    pi, gi = place_tree.query(geoms, predicate='contains')
    for g, q in zip(pi, gi):
        g, q = int(g), int(q)
        if places[q]['pop'] >= 1000 and (g not in town or places[q]['pop'] > places[town[g]]['pop']):
            town[g] = q
    state_names = {}
    used_by_owner = {}
    for s in state_order:
        st = states[s]
        members = [i for i in idx if provs[i]['state'] == s]
        centre = label_point(st['geom'])
        if st['split']:
            best = max(members, key=lambda i: (provs[i]['vp'], places[town[i]]['pop'] if i in town else -1, -i))
            wanted = provs[best]['name'] or (places[town[best]]['name'] if best in town else None)
            region = meta[max(st['units'], key=lambda u: (u in {p['unit'] for p in st['parts']}, -u))]['name']
            wanted = wanted or '%s (%s)' % (region, direction(centre, label_point(merge([p['geom'] for p in st['parts']]))))
        else:
            # A group of regions is named after the region of its main city.
            main = max(st['parts'], key=lambda p: (p['area'], -p['unit']))
            cities = [i for i in members if provs[i]['city']]
            if cities:
                town_pt = Point(provs[max(cities, key=lambda i: (provs[i]['vp'], -i))]['x'], provs[max(cities, key=lambda i: (provs[i]['vp'], -i))]['y'])
                main = min(st['parts'], key=lambda p: (p['geom'].distance(town_pt), -p['area']))
            wanted = meta[main['unit']]['name'] or (provs[members[0]]['name'] or 'Région')
        state_names[s] = unique(used_by_owner.setdefault(st['owner'], set()), wanted, centre, centre)
    for s in state_order:
        members = [i for i in idx if provs[i]['state'] == s]
        centre = label_point(states[s]['geom'])
        names = set()
        for i in members:
            p = provs[i]
            wanted = p['name'] or (places[town[i]]['name'] if i in town else state_names[s])
            p['name'] = unique(names, wanted, centre, (p['x'], p['y']))

    # Output.
    out = []
    for new, i in enumerate(idx):
        p = provs[i]
        key = 'geo-' + hashlib.sha1(('%s|%s|%.3f|%.3f' % (p['owner'], state_names[p['state']], p['x'], p['y'])).encode('utf-8')).hexdigest()[:20]
        out.append({
            'id': new, 'owner': p['owner'], 'name': p['name'], 'state': state_id[p['state']], 'city': p['city'],
            'capital': p['capital'], 'x': p['x'], 'y': p['y'], 'zone': p['zone'], 'terrain': p['terrain'],
            'coast': p['coast'], 'port': p['port'], 'airbase': p['airbase'], 'vp': p['vp'], 'steel': p['steel'],
            'oil': p['oil'], 'rubber': p['rubber'], 'polygons': rings(p['geom']),
            'neighbors': sorted(new_id[n] for n in nb[i]), 'sea': [], 'seaZone': p['seaZone'],
            'historicalRegions': sorted(p['regions']), 'administration': p['administration'],
            'cartographicConfidence': p['confidence'], 'overseas': p['overseas'], 'geoKey': key,
            'aluminium': p['aluminium'], 'tungsten': p['tungsten'], 'chromium': p['chromium'],
        })
    keys = [p['geoKey'] for p in out]
    assert len(set(keys)) == len(keys)
    # Sea routes between the ports that replace the reference ports.
    for a, k in port_of.items():
        for e in L[a]['sea']:
            if e['to'] in port_of and port_of[e['to']] != k:
                out[new_id[k]]['sea'].append({'to': new_id[port_of[e['to']]], 'days': e['days'], 'zones': e.get('zones', [])})
    for p in out:
        seen = set()
        p['sea'] = [e for e in sorted(p['sea'], key=lambda e: (e['to'], e['days'])) if not (e['to'] in seen or seen.add(e['to']))]
    world = {k: v for k, v in ref.world.items()}
    world['version'] = '1.7.0'
    world['mapId'] = MAP_ID
    world['provinces'] = out
    world['states'] = [{'id': k, 'name': state_names[s], 'owner': states[s]['owner']} for k, s in enumerate(state_order)]
    countries = []
    for c in ref.world['countries']:
        c = dict(c)
        c['provinces'] = [p['id'] for p in out if p['owner'] == c['id']]
        cap = city_of.get(c['capital'])
        if cap is None or out[new_id[cap]]['owner'] != c['id']:
            cands = [p for p in out if p['owner'] == c['id']]
            cap_p = min(cands, key=lambda p: (dist_km((p['x'], p['y']), (c['lon'], c['lat'])), p['id']))
        else:
            cap_p = out[new_id[cap]]
        for p in out:
            if p['owner'] == c['id'] and p['capital'] and p['id'] != cap_p['id']:
                p['capital'] = False
        cap_p['capital'] = True
        c['capital'] = cap_p['id']
        countries.append(c)
    world['countries'] = countries
    regions = []
    for r in ref.world['historicalRegions']:
        r = dict(r)
        r['provinces'] = [p['id'] for p in out if r['id'] in p['historicalRegions']]
        if not r['provinces']:
            for lp_i in [i for i, lp in enumerate(L) if r['id'] in lp['historicalRegions']]:
                for k in by_ref.get(lp_i, []):
                    out[new_id[k]]['historicalRegions'] = sorted(set(out[new_id[k]]['historicalRegions']) | {r['id']})
            r['provinces'] = [p['id'] for p in out if r['id'] in p['historicalRegions']]
        regions.append(r)
    world['historicalRegions'] = regions
    # River crossings: neighbours whose centres lie on both sides of a river.
    lines = [(r['id'], LineString(r['points'])) for r in world['rivers']]
    crossings = {}
    for p in out:
        for n in p['neighbors']:
            if n <= p['id']:
                continue
            seg = LineString([(p['x'], p['y']), (out[n]['x'], out[n]['y'])])
            for rid, line in lines:
                if seg.intersects(line):
                    crossings['%d:%d' % (p['id'], n)] = rid
                    break
    world['riverCrossings'] = crossings
    world['straits'] = {'%d:%d' % tuple(sorted((new_id[a], new_id[b]))): name for (a, b), name in straits.items()}
    world['source'] = 'Natural Earth 1:10m (domaine public) : régions administratives découpées selon les frontières de 1936 de la carte de référence.'
    carto = dict(world.get('cartography', {}))
    carto['basis'] = 'Natural Earth 1:10m (régions de premier niveau) + frontières 1936 de la carte de référence + corrections manuelles'
    world['cartography'] = carto
    world['geoOrderFingerprint'] = hashlib.sha256(','.join(keys).encode('utf-8')).hexdigest()
    return world


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ne', required=True, type=Path, help='folder with the Natural Earth 1:10m GeoJSON files')
    ap.add_argument('--out', type=Path, default=OUT)
    args = ap.parse_args()
    legacy, lgeoms = load_legacy()
    ref = Reference(legacy, lgeoms)
    geoms, meta = load_regions(args.ne)
    pieces = cut_regions(geoms, meta, ref)
    parts = explode(pieces, ref)
    states, _ = build_states(parts, meta, ref)
    places = load_places(args.ne)
    anchors = city_anchors(ref, places)
    world = build_world(states, meta, anchors, ref, places)
    text = json.dumps(world, ensure_ascii=False, separators=(',', ':'))
    args.out.write_text(text, encoding='utf-8')
    print('provinces', len(world['provinces']), 'states', len(world['states']), 'size %.1f MB' % (len(text.encode('utf-8')) / 1e6))


if __name__ == '__main__':
    main()
