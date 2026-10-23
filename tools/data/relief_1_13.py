#!/usr/bin/env python3
"""Frontieres 1.13 relief: mountain ranges and deserts drawn on the map (idempotent).

  python3 -I tools/data/relief_1_13.py --ne DIR

DIR holds ne_50m_geography_regions_polys.geojson from the geojson/ folder of
natural-earth-vector (public domain). The mountain ranges, plateaus and
deserts are simplified and stored in data/world.json ("relief") with their
French names, to be drawn as hachures and labels.
"""
import argparse
import json
from pathlib import Path

from shapely.geometry import shape
from shapely.geometry.polygon import orient

ROOT = Path(__file__).resolve().parents[2]
WORLD = ROOT / 'data' / 'world.json'
parser = argparse.ArgumentParser()
parser.add_argument('--ne', required=True)
args = parser.parse_args()
source = json.loads((Path(args.ne) / 'ne_50m_geography_regions_polys.geojson').read_text(encoding='utf-8'))
KINDS = {'Range/mtn': 'range', 'Plateau': 'plateau', 'Desert': 'desert'}
# High plateaus drawn as relief; the other plateaus are plains on the map.
HIGH_PLATEAUS = {'Plateau tibétain', 'Altiplano', 'Plateau mexicain', 'Plateau du Colorado', 'Plateau Yunnan-Guizhou', 'Plateau de Lœss', "Massif de l'Adamaoua", 'Plateau Shan'}
SKIP = {'Pendjab'}


def clean(name):
    name = (name or '').strip()
    return name[:1].upper() + name[1:]


relief = []
for f in source['features']:
    p = f['properties']
    kind = KINDS.get(p['FEATURECLA'])
    if not kind or p.get('REGION') == 'Antarctica':
        continue
    name = clean(p.get('NAME_FR') or p.get('NAME'))
    if name in SKIP or kind == 'plateau' and name not in HIGH_PLATEAUS:
        continue
    geom = shape(f['geometry']).buffer(0).simplify(.08, preserve_topology=True)
    if geom.is_empty or geom.area < .3:
        continue
    parts = list(geom.geoms) if geom.geom_type == 'MultiPolygon' else [geom]
    polygons = []
    for g in parts:
        if g.area < .2:
            continue
        ring = orient(g, 1).exterior.coords
        polygons.append([[round(x, 2), round(y, 2)] for x, y in ring])
    if not polygons:
        continue
    point = geom.representative_point()
    relief.append({'name': name, 'kind': kind, 'rank': int(p.get('SCALERANK') or 5),
                   'x': round(point.x, 2), 'y': round(point.y, 2), 'polygons': polygons})
relief.sort(key=lambda r: (r['rank'], r['name']))
world = json.loads(WORLD.read_text(encoding='utf-8'))
world['relief'] = relief
WORLD.write_text(json.dumps(world, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('relief', len(relief), {k: sum(1 for r in relief if r['kind'] == k) for k in ('range', 'plateau', 'desert')}, 'points', sum(len(ring) for r in relief for ring in r['polygons']))
