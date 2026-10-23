#!/usr/bin/env python3
"""Frontieres 1.8 sea and air layers, built on the 1.7 province map.

  python3 -I tools/data/seas_1_8.py --ne DIR

DIR holds ne_10m_geography_marine_polys.geojson (Natural Earth 1:10m named
seas, gulfs and straits, public domain). Run after map_1_7.py; the script
rewrites data/world.json in place and is idempotent.

* Sea provinces: the world ocean is divided into about 2,500 cells, small
  along the coasts and large in the open ocean (weighted k-means, Voronoi).
  Inland water (Caspian, Great Lakes) is left out; canals and narrow straits
  are linked explicitly.
* Sea regions: sea provinces are grouped under the most specific named sea of
  Natural Earth; large seas and oceans are split. Fleets, convoys, mines,
  invasions and naval air missions work on these regions.
* Air regions: land provinces are grouped into about 160 strategic regions of
  similar province counts (dense in Europe), each named after its main city.
* Every region keeps the 1.7 zone it mostly covers as its "theatre", which
  keeps seasonal storms and historical references working.
"""
import argparse
import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
import shapely
from scipy.spatial import cKDTree
from shapely.geometry import MultiPoint, MultiPolygon, Point, Polygon, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / 'data' / 'world.json'
KM = 111.32
SOUTH, NORTH = -66.0, 84.0
SEA_TARGET = 2500
SEA_COASTAL = 1000000     # km2 per region of an ocean near the coasts
SEA_SEA = 700000          # km2 per region of a named sea
SEA_OPEN = 9000000        # km2 per sea region in the open ocean
SEA_MIN = 400000          # smaller pieces of an ocean merge into a neighbour
AIR_PER_REGION = 72          # land provinces per air region on average
DIRECTIONS = ['est', 'nord-est', 'nord', 'nord-ouest', 'ouest', 'sud-ouest', 'sud', 'sud-est']
OCEANS = {'North Atlantic Ocean': 'Atlantique Nord', 'South Atlantic Ocean': 'Atlantique Sud',
          'North Pacific Ocean': 'Pacifique Nord', 'South Pacific Ocean': 'Pacifique Sud',
          'INDIAN OCEAN': 'Océan Indien', 'Arctic Ocean': 'Océan Arctique', 'SOUTHERN OCEAN': 'Océan Austral'}
# Canals and straits too narrow for the simplified coastline: (name, side A, side B).
LINKS = [
    ('Canal de Suez', (32.45, 31.45), (32.62, 29.75)),
    ('Canal de Panama', (-79.85, 9.55), (-79.45, 8.75)),
    ('Canal de Kiel', (10.25, 54.55), (8.85, 54.0)),
    ('Bosphore et Dardanelles', (26.15, 40.05), (29.35, 41.35)),
    ('Détroit de Kertch', (36.45, 45.55), (36.65, 45.05)),
    ('Øresund', (12.75, 55.45), (12.45, 56.15)),
    ('Détroit de Messine', (15.75, 38.35), (15.55, 38.0)),
]


def km2(g):
    parts = g.geoms if hasattr(g, 'geoms') else [g]
    return sum(p.area * KM * KM * math.cos(math.radians(p.centroid.y)) for p in parts if not p.is_empty)


def polygons(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    if hasattr(g, 'geoms'):
        return [p for x in g.geoms for p in polygons(x)]
    return []


def xyz(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.column_stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])


def lonlat(v):
    v = v / np.linalg.norm(v, axis=1, keepdims=True)
    return np.degrees(np.arctan2(v[:, 1], v[:, 0])), np.degrees(np.arcsin(np.clip(v[:, 2], -1, 1)))


def dist_km(a, b):
    return math.hypot((a[0] - b[0]) * math.cos(math.radians((a[1] + b[1]) / 2)), a[1] - b[1]) * KM


def direction(c, centre):
    angle = math.atan2(c[1] - centre[1], (c[0] - centre[0]) * math.cos(math.radians(centre[1])))
    return DIRECTIONS[int(round(angle / (math.pi / 4))) % 8]


def rings(g, digits=2):
    out = []
    for part in sorted(polygons(g), key=lambda p: -p.area):
        for ring in [part.exterior, *part.interiors]:
            pts = []
            for x, y in ring.coords:
                q = [round(x, digits), round(y, digits)]
                if not pts or pts[-1] != q:
                    pts.append(q)
            if len(pts) >= 4:
                out.append(pts)
    return out


def kmeans3(points, weights, k, rng, iters=20):
    """Weighted k-means on the unit sphere (3D chord distance)."""
    order = list(range(len(points)))
    rng.shuffle(order)
    centres = points[order[:k]].copy()
    for _ in range(iters):
        lab = cKDTree(centres).query(points)[1]
        for d in range(3):
            num = np.bincount(lab, weights=weights * points[:, d], minlength=k)
            den = np.bincount(lab, weights=weights, minlength=k)
            ok = den > 0
            centres[ok, d] = num[ok] / den[ok]
        centres /= np.linalg.norm(centres, axis=1, keepdims=True)
    lab = cKDTree(centres).query(points)[1]
    return centres, lab


# --- Land ---------------------------------------------------------------------------------
def land_geometry(world):
    parts = []
    for p in world['provinces']:
        for ring in p['polygons']:
            if len(ring) >= 4:
                q = Polygon(ring)
                parts.append(q if q.is_valid else shapely.make_valid(q))
    land = unary_union(parts).buffer(0)
    return [g for g in polygons(land) if g.area > 1e-6]


# --- Sea provinces ------------------------------------------------------------------------
def sea_provinces(world, land_parts, rng, log):
    land_tree = STRtree(land_parts)
    frame = shapely.box(-180, SOUTH, 180, NORTH)
    # Sample the ocean uniformly by area.
    n = 160000
    xs = np.array([rng.uniform(-180, 180) for _ in range(n * 2)])
    ys = np.degrees(np.arcsin(np.array([rng.uniform(math.sin(math.radians(SOUTH)), math.sin(math.radians(NORTH))) for _ in range(n * 2)])))
    pts = shapely.points(xs, ys)
    hit = np.zeros(len(pts), dtype=bool)
    idx_pt, _ = land_tree.query(pts, predicate='within')
    hit[idx_pt] = True
    xs, ys = xs[~hit][:n], ys[~hit][:n]
    sea_pts = shapely.points(xs, ys)
    near, dist = land_tree.query_nearest(sea_pts, return_distance=True)
    order = np.argsort(near[0])
    d_km = np.empty(len(xs))
    d_km[near[0][order]] = dist[order] * KM
    # Target area by distance to the coast (km2 per sea province).
    europe = (xs > -15) & (xs < 45) & (ys > 30) & (ys < 72)
    area = np.where(d_km < 120, np.where(europe, 9000, 20000), np.where(d_km < 500, np.where(europe, 30000, 60000), 450000))
    ocean_area = 361e6 * (1 - 0.06)
    per_point = ocean_area / len(xs)
    weights = per_point / area
    k = SEA_TARGET
    # Points are drawn in proportion to the wanted density, then clustered.
    keep = np.array([rng.random() < w / weights.max() for w in weights])
    P = xyz(xs[keep], ys[keep])
    centres, _ = kmeans3(P, np.ones(len(P)), k, rng)
    cx, cy = lonlat(centres)
    log('sea centres', k)
    # Voronoi on a plate carree, clipped to the ocean.
    cells = shapely.voronoi_polygons(MultiPoint(list(zip(cx, cy))), extend_to=frame, ordered=True).geoms
    out = []
    for i, cell in enumerate(cells):
        cell = cell.intersection(frame)
        hits = land_tree.query(cell, predicate='intersects')
        if len(hits):
            box = cell.bounds
            near = [shapely.clip_by_rect(land_parts[int(h)], *box) for h in hits]
            water = cell.difference(unary_union([g for g in near if not g.is_empty]).buffer(0))
        else:
            water = cell
        bits = [b for b in polygons(water) if km2(b) > 50]
        if not bits:
            continue
        cp = Point(cx[i], cy[i])
        home = min(range(len(bits)), key=lambda j: (bits[j].distance(cp), -bits[j].area))
        out.append({'geom': bits[home], 'centre': (cx[i], cy[i]), 'extra': [b for j, b in enumerate(bits) if j != home]})
    # Detached bits (behind a cape or an island) join the cell they touch most.
    tree = STRtree([o['geom'] for o in out])
    for o in out:
        for b in o['extra']:
            grown = b.buffer(.02)
            cands = [int(h) for h in tree.query(grown, predicate='intersects')]
            if not cands:
                continue
            best = max(cands, key=lambda j: (grown.intersection(out[j]['geom']).area, -j))
            out[best].setdefault('more', []).append(b)
    for o in out:
        if o.get('more'):
            o['geom'] = unary_union([o['geom']] + o['more'])
            o['geom'] = max(polygons(o['geom']), key=lambda p: p.area) if len(polygons(o['geom'])) > 3 else o['geom']
    return out


def sea_graph(cells, log):
    geoms = [c['geom'] for c in cells]
    tree = STRtree(geoms)
    a_idx, b_idx = tree.query(geoms, predicate='dwithin', distance=.01)
    nb = [set() for _ in cells]
    for a, b in zip(a_idx, b_idx):
        a, b = int(a), int(b)
        if a != b:
            nb[a].add(b)
            nb[b].add(a)
    links = []
    for name, pa, pb in LINKS:
        a = int(tree.query_nearest(Point(pa))[0])
        b = int(tree.query_nearest(Point(pb))[0])
        if a != b:
            nb[a].add(b)
            nb[b].add(a)
            links.append((name, a, b))
    # Keep the world ocean (the largest connected body) and what the links join to it.
    comp = [-1] * len(cells)
    sizes = {}
    for i in range(len(cells)):
        if comp[i] >= 0:
            continue
        comp[i] = i
        queue = [i]
        for q in queue:
            for n in nb[q]:
                if comp[n] < 0:
                    comp[n] = i
                    queue.append(n)
        sizes[i] = sum(km2(cells[q]['geom']) for q in queue)
    main = max(sizes, key=sizes.get)
    keep = [i for i in range(len(cells)) if comp[i] == main]
    log('sea provinces kept', len(keep), 'of', len(cells), 'dropped water bodies', len(sizes) - 1)
    remap = {old: new for new, old in enumerate(keep)}
    cells = [cells[i] for i in keep]
    nb = [sorted(remap[n] for n in nb[i] if n in remap) for i in keep]
    links = [(name, remap[a], remap[b]) for name, a, b in links if a in remap and b in remap]
    return cells, nb, links


# --- Sea regions --------------------------------------------------------------------------
def marine_areas(ne):
    data = json.loads((ne / 'ne_10m_geography_marine_polys.geojson').read_text(encoding='utf-8'))
    out = []
    for f in data['features']:
        p = f['properties']
        if p.get('featurecla') in ('river', 'reef', 'lagoon', 'fjord', 'inlet'):
            continue
        g = shape(f['geometry'])
        g = g if g.is_valid else shapely.make_valid(g)
        a = km2(g)
        if a < 60000:
            continue
        en = (p.get('name_en') or p.get('name') or '').strip()
        fr = OCEANS.get(p.get('name') or '') or OCEANS.get(en) or (p.get('name_fr') or en).strip()
        out.append({'geom': g, 'area': a, 'name': fr[:1].upper() + fr[1:], 'ocean': p.get('featurecla') == 'ocean'})
    return out


def sea_regions(cells, nb, areas, coast_dist, rng, log, cities=()):
    """Sea provinces grouped under named seas; large seas split, small pieces merged."""
    tree = STRtree([a['geom'] for a in areas])
    owner = []
    for c in cells:
        pt = Point(c['centre'])
        hits = [int(h) for h in tree.query(pt, predicate='intersects')]
        if not hits:
            hits = [int(tree.query_nearest(pt)[0])]
        owner.append(min(hits, key=lambda h: (areas[h]['area'], h)))
    region_of = [-1] * len(cells)
    regions = []
    groups = {}
    for i, a in enumerate(owner):
        groups.setdefault(a, []).append(i)
    for a in sorted(groups, key=lambda k: (areas[k]['name'], k)):
        for comp in components(groups[a], nb):
            area = sum(cells[i]['area'] for i in comp)
            coastal = sum(1 for i in comp if coast_dist[i] < 300) / len(comp)
            target = (SEA_COASTAL if coastal > .5 else SEA_OPEN) if areas[a]['ocean'] else SEA_SEA
            k = min(len(comp), max(1, int(round(area / target))))
            labels = [0] * len(comp)
            if k > 1:
                P = xyz(np.array([cells[i]['centre'][0] for i in comp]), np.array([cells[i]['centre'][1] for i in comp]))
                _, labels = kmeans3(P, np.array([cells[i]['area'] for i in comp]), k, rng)
            base = len(regions)
            used = sorted(set(int(l) for l in labels))
            for _ in used:
                regions.append({'group': a})
            for i, l in zip(comp, labels):
                region_of[i] = base + used.index(int(l))
    # Contiguity, then small regions merge into a neighbour (same sea first).
    def members_of():
        out = [[] for _ in regions]
        for i, r in enumerate(region_of):
            out[r].append(i)
        return out

    def neighbour_counts(members, r):
        touch = {}
        for i in members:
            for n in nb[i]:
                if region_of[n] != r:
                    touch[region_of[n]] = touch.get(region_of[n], 0) + 1
        return touch

    for _ in range(4):
        mem = members_of()
        for r, members in enumerate(mem):
            comps = sorted(components(members, nb), key=lambda c: -sum(cells[i]['area'] for i in c))
            for frag in comps[1:]:
                touch = neighbour_counts(frag, r)
                if touch:
                    t = max(touch, key=lambda k: (touch[k], -k))
                    for i in frag:
                        region_of[i] = t
    changed = True
    while changed:
        changed = False
        mem = members_of()
        size = [sum(cells[i]['area'] for i in m) for m in mem]
        for r in sorted(range(len(regions)), key=lambda r: size[r]):
            # Named seas stay whole; pieces of the oceans merge when small.
            if not mem[r] or size[r] >= SEA_MIN or not areas[regions[r]['group']]['ocean'] and size[r] >= 60000:
                continue
            touch = neighbour_counts(mem[r], r)
            if not touch:
                continue
            same = [t for t in touch if regions[t]['group'] == regions[r]['group']]
            pool = same or list(touch)
            t = min(pool, key=lambda k: (size[k], -touch[k], k))
            for i in mem[r]:
                region_of[i] = t
            changed = True
            break
    mem = members_of()
    final = [{'group': regions[r]['group'], 'members': m} for r, m in enumerate(mem) if m]
    # Names: the sea, with a direction when a sea is split.
    by_group = {}
    for reg in final:
        by_group.setdefault(reg['group'], []).append(reg)
    used = {}
    for g, regs in by_group.items():
        base = areas[g]['name']
        if len(regs) == 1:
            regs[0]['name'] = base
            continue
        centre = weighted_centre(cells, [i for reg in regs for i in reg['members']])
        for reg in regs:
            c = weighted_centre(cells, reg['members'])
            # Pieces of an ocean are named after the nearest large port.
            near = min(cities, key=lambda t: dist_km(c, (t[1], t[2]))) if cities and areas[g]['ocean'] else None
            if near and dist_km(c, (near[1], near[2])) < 1200:
                of = "d'" if near[0][:1].upper() in 'AEIOUYÉÈÊÎÔÛ' else 'de '
                reg['name'] = '%s (large %s%s)' % (base, of, near[0])
            else:
                reg['name'] = '%s (%s)' % (base, direction(c, centre))
    for reg in final:
        n = reg['name']
        used[n] = used.get(n, 0) + 1
        if used[n] > 1:
            reg['name'] = '%s %d' % (n, used[n])
    log('sea regions', len(final))
    return final


def weighted_centre(cells, members):
    P = xyz(np.array([cells[i]['centre'][0] for i in members]), np.array([cells[i]['centre'][1] for i in members]))
    w = np.array([cells[i]['area'] for i in members])[:, None]
    x, y = lonlat((P * w).sum(axis=0, keepdims=True))
    return (float(x[0]), float(y[0]))


def components(members, nb):
    inside = set(members)
    seen = set()
    out = []
    for m in members:
        if m in seen:
            continue
        comp = [m]
        seen.add(m)
        for q in comp:
            for n in nb[q]:
                if n in inside and n not in seen:
                    seen.add(n)
                    comp.append(n)
        out.append(comp)
    return out


# --- Air regions --------------------------------------------------------------------------
def air_regions(world, rng, log):
    P = world['provinces']
    nb = [set(p['neighbors']) for p in P]
    comps = components(list(range(len(P))), nb)
    region_of = [-1] * len(P)
    regions = []
    small = []
    for comp in sorted(comps, key=lambda c: (-len(c), c[0])):
        if len(comp) < AIR_PER_REGION * .35:
            small.append(comp)
            continue
        k = max(1, int(round(len(comp) / AIR_PER_REGION)))
        pts = xyz(np.array([P[i]['x'] for i in comp]), np.array([P[i]['y'] for i in comp]))
        if k == 1:
            labels = [0] * len(comp)
        else:
            _, labels = kmeans3(pts, np.ones(len(comp)), k, rng, iters=30)
        base = len(regions)
        for j in range(k):
            regions.append({'members': []})
        for i, l in zip(comp, labels):
            region_of[i] = base + int(l)
    for r in range(len(regions)):
        regions[r]['members'] = [i for i in range(len(P)) if region_of[i] == r]
    # Contiguity on land.
    for r, reg in enumerate(regions):
        comps_r = components(reg['members'], nb)
        if len(comps_r) <= 1:
            continue
        comps_r.sort(key=len, reverse=True)
        for frag in comps_r[1:]:
            touch = {}
            for i in frag:
                for n in nb[i]:
                    if region_of[n] >= 0 and region_of[n] != r:
                        touch[region_of[n]] = touch.get(region_of[n], 0) + 1
            if touch:
                t = max(touch, key=lambda k: (touch[k], -k))
                for i in frag:
                    region_of[i] = t
    # Small islands join the nearest region.
    assigned = [i for i in range(len(P)) if region_of[i] >= 0]
    tree = cKDTree(xyz(np.array([P[i]['x'] for i in assigned]), np.array([P[i]['y'] for i in assigned])))
    for comp in small:
        c = xyz(np.array([P[comp[0]]['x']]), np.array([P[comp[0]]['y']]))
        j = assigned[int(tree.query(c)[1][0])]
        for i in comp:
            region_of[i] = region_of[j]
    out = []
    for r in range(len(regions)):
        members = [i for i in range(len(P)) if region_of[i] == r]
        if members:
            out.append(members)
    log('air regions', len(out))
    return out


# --- Assembly -----------------------------------------------------------------------------
def build(world, ne, log=print):
    rng = random.Random(19360101)
    P = world['provinces']
    legacy_seas = {s['id']: s for s in world.get('legacySeas', world['seas'])}
    legacy_zones = {z['id']: z for z in world.get('legacyZones', world['zones'])}
    # Theatres are the zones of the 1.7 map; keep them across runs.
    for p in P:
        p.setdefault('theatre', p['zone'] if p['zone'] in legacy_zones else p.get('theatre'))
        if p.get('seaZone') in legacy_seas:
            p['seaTheatre'] = p['seaZone']
    land_parts = land_geometry(world)
    log('land parts', len(land_parts))
    cells = sea_provinces(world, land_parts, rng, log)
    cells, snb, links = sea_graph(cells, log)
    for c in cells:
        c['area'] = km2(c['geom'])
    land_tree = STRtree(land_parts)
    _, cd = land_tree.query_nearest([Point(c['centre']) for c in cells], return_distance=True)
    coast_dist = list(cd * KM)
    cities = [(p['name'], p['x'], p['y']) for p in P if p['city'] and p['coast'] and p['vp'] >= 3]
    regions = sea_regions(cells, snb, marine_areas(ne), coast_dist, rng, log, cities)

    # Coasts: each coastal land province faces the sea provinces it touches.
    sea_tree = STRtree([c['geom'] for c in cells])
    prov_geoms = []
    for p in P:
        parts = [Polygon(r) for r in p['polygons'] if len(r) >= 4]
        parts = [q if q.is_valid else shapely.make_valid(q) for q in parts]
        prov_geoms.append(unary_union(parts) if parts else Point(p['x'], p['y']).buffer(.01))
    faces = [[] for _ in P]
    li, si = sea_tree.query(prov_geoms, predicate='dwithin', distance=.03)
    for l, s_ in zip(li, si):
        faces[int(l)].append(int(s_))
    region_of_cell = {}
    for r, reg in enumerate(regions):
        for i in reg['members']:
            region_of_cell[i] = r
    sea_ids = ['S%03d' % r for r in range(len(regions))]
    coast_of_cell = [[] for _ in cells]
    lost_ports = 0
    for i, p in enumerate(P):
        f = sorted(set(faces[i]), key=lambda s_: (prov_geoms[i].distance(cells[s_]['geom']), s_))
        if f:
            p['coast'] = True
            p['seaProvince'] = f[0]
            p['seaZone'] = sea_ids[region_of_cell[f[0]]]
            for s_ in f:
                coast_of_cell[s_].append(i)
        else:
            if p.get('port'):
                lost_ports += 1
            p['coast'] = False
            p['seaProvince'] = None
            p['seaZone'] = None
            p['port'] = 0
    log('ports without open sea', lost_ports)

    # Region theatres: the 1.7 sea zone of the coasts they wash, else the nearest one.
    seas = []
    for r, reg in enumerate(regions):
        votes = {}
        for i in reg['members']:
            for l in coast_of_cell[i]:
                t = P[l].get('seaTheatre')
                if t:
                    votes[t] = votes.get(t, 0) + 1
        c = weighted_centre(cells, reg['members'])
        theatre = max(votes, key=lambda k: (votes[k], k)) if votes else min(legacy_seas, key=lambda k: dist_km(c, (legacy_seas[k]['x'], legacy_seas[k]['y'])))
        anchor = min(reg['members'], key=lambda i: (dist_km(c, cells[i]['centre']), i))
        outline = unary_union([cells[i]['geom'] for i in reg['members']]).buffer(.01).simplify(.05, preserve_topology=True)
        seas.append({'id': sea_ids[r], 'name': reg['name'], 'x': round(cells[anchor]['centre'][0], 3), 'y': round(cells[anchor]['centre'][1], 3),
                     'theatre': theatre, 'provinces': sorted(reg['members']), 'polygons': rings(outline)})
    for r, s in enumerate(seas):
        nbr = set()
        for i in s['provinces']:
            for n in snb[i]:
                if region_of_cell[n] != r:
                    nbr.add(sea_ids[region_of_cell[n]])
        s['neighbors'] = sorted(nbr)
    sea_provs = []
    for i, c in enumerate(cells):
        sea_provs.append({'id': i, 'region': sea_ids[region_of_cell[i]], 'x': round(c['centre'][0], 3), 'y': round(c['centre'][1], 3),
                          'polygons': rings(c['geom'].simplify(.02, preserve_topology=True)), 'neighbors': snb[i], 'coast': sorted(coast_of_cell[i])})

    # Sea routes between ports follow the regions on the shortest path.
    graph = {s['id']: s['neighbors'] for s in seas}
    centre = {s['id']: (s['x'], s['y']) for s in seas}

    def route(a, b):
        if a == b:
            return [a], 0.0
        dist = {a: 0.0}
        prev = {}
        todo = [(0.0, a)]
        import heapq
        while todo:
            d, u = heapq.heappop(todo)
            if u == b:
                break
            if d > dist[u]:
                continue
            for v in graph[u]:
                nd = d + dist_km(centre[u], centre[v])
                if nd < dist.get(v, 1e18):
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(todo, (nd, v))
        if b not in dist:
            return None, None
        path = [b]
        while path[-1] != a:
            path.append(prev[path[-1]])
        return path[::-1], dist[b]

    kept = dropped = 0
    for p in P:
        edges = []
        for e in p.get('sea', []):
            q = P[e['to']]
            if not p['port'] or not q['port'] or not p['seaZone'] or not q['seaZone']:
                dropped += 1
                continue
            path, km = route(p['seaZone'], q['seaZone'])
            if path is None:
                dropped += 1
                continue
            km += dist_km((p['x'], p['y']), centre[p['seaZone']]) * .5 + dist_km((q['x'], q['y']), centre[q['seaZone']]) * .5
            edges.append({'to': e['to'], 'days': round(max(1.0, km / 550), 2), 'zones': path})
            kept += 1
        p['sea'] = edges
    log('sea routes kept', kept, 'dropped', dropped)

    # Air regions.
    groups = air_regions(world, rng, log)
    zones = []
    used = {}
    for r, members in enumerate(sorted(groups, key=lambda m: (min(P[i]['id'] for i in m)))):
        zid = 'A%03d' % r
        cx = sum(P[i]['x'] for i in members) / len(members)
        cy = sum(P[i]['y'] for i in members) / len(members)
        city = max(members, key=lambda i: (P[i]['vp'] + (5 if P[i]['city'] else 0), -dist_km((cx, cy), (P[i]['x'], P[i]['y'])), -i))
        town = P[city]['name'].split(' (')[0]
        town = town[2:] if town.startswith("d'") else town
        of = "d'" if town[:1].upper() in 'AEIOUYÉÈÊÎÔÛ' else 'de '
        name = 'Région ' + of + town if P[city]['city'] or P[city]['vp'] else world['states'][P[city]['state']]['name']
        if name in used:
            used[name] += 1
            name = '%s (%s)' % (name, direction((cx, cy), (P[city]['x'], P[city]['y'])))
        used.setdefault(name, 1)
        votes = {}
        for i in members:
            t = P[i].get('theatre')
            votes[t] = votes.get(t, 0) + 1
        anchor = min(members, key=lambda i: (dist_km((cx, cy), (P[i]['x'], P[i]['y'])), i))
        outline = unary_union([prov_geoms[i] for i in members]).buffer(.01).simplify(.05, preserve_topology=True)
        zones.append({'id': zid, 'name': name, 'x': P[anchor]['x'], 'y': P[anchor]['y'], 'theatre': max(votes, key=lambda k: (votes[k], str(k))),
                      'polygons': rings(outline)})
        for i in members:
            P[i]['zone'] = zid
    world['legacySeas'] = list(legacy_seas.values())
    world['legacyZones'] = list(legacy_zones.values())
    world['seas'] = seas
    world['seaProvinces'] = sea_provs
    world['seaLinks'] = [{'name': n, 'a': a, 'b': b} for n, a, b in links]
    world['zones'] = zones
    return world


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ne', required=True, type=Path, help='folder with ne_10m_geography_marine_polys.geojson')
    args = ap.parse_args()
    world = json.loads(WORLD.read_text(encoding='utf-8'))
    world = build(world, args.ne)
    text = json.dumps(world, ensure_ascii=False, separators=(',', ':'))
    WORLD.write_text(text, encoding='utf-8')
    print('seas', len(world['seas']), 'sea provinces', len(world['seaProvinces']), 'air regions', len(world['zones']),
          'size %.1f MB' % (len(text.encode('utf-8')) / 1e6))


if __name__ == '__main__':
    main()
