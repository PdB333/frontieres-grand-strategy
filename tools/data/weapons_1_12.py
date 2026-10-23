#!/usr/bin/env python3
"""Frontieres 1.12 special weapons: railway guns, ballistic rockets, atomic bombs (idempotent).

  python3 tools/data/weapons_1_12.py

Run after intel_1_11.py. Adds the technologies, equipment, models and
buildings of the special weapons to data/catalog.json. Names, texts and
values are original game content.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

TECHS = [
    {'id': 'railway_guns', 'name': 'Artillerie lourde sur voie ferrée', 'group': 'infantry', 'year': 1937, 'days': 120, 'req': ['artillerie1'], 'effect': {}, 'unlock': ['model:railgun_1937'], 'v': 112},
    {'id': 'railway_guns2', 'name': 'Canons sur rail à très longue portée', 'group': 'infantry', 'year': 1941, 'days': 160, 'req': ['railway_guns'], 'effect': {}, 'unlock': ['model:railgun_1941'], 'v': 112},
    {'id': 'v_rockets', 'name': 'Missiles balistiques', 'group': 'electronics', 'year': 1943, 'days': 210, 'req': ['el_rockets'], 'effect': {}, 'unlock': ['model:rocket_ballistic_1943'], 'v': 112},
    {'id': 'atomic_bomb', 'name': 'Arme atomique', 'group': 'electronics', 'year': 1945, 'days': 280, 'req': ['el_atomic2'], 'effect': {}, 'unlock': [], 'v': 112},
]
ids = {t['id'] for t in TECHS}
catalog['techs'] = [t for t in catalog['techs'] if t['id'] not in ids] + TECHS

catalog['equipment']['railwayGuns'] = {'name': 'Canons sur rail', 'cost': 40, 'steel': 3, 'icon': 'crosshair', 'domain': 'land'}
catalog['equipment']['rockets'] = {'name': 'Missiles balistiques', 'cost': 30, 'steel': 1, 'aluminium': 1, 'icon': 'bomb', 'domain': 'land'}
catalog['models']['railwayGuns'] = [
    {'id': 'railgun_1937', 'name': 'Canon sur rail', 'year': 1937, 'tech': 'railway_guns', 'cost': 1, 'stats': {}},
    {'id': 'railgun_1941', 'name': 'Canon sur rail lourd', 'year': 1941, 'tech': 'railway_guns2', 'cost': 1.2, 'stats': {'attack': 1.5}},
]
catalog['models']['rockets'] = [
    {'id': 'rocket_ballistic_1943', 'name': 'Missile balistique', 'year': 1943, 'tech': 'v_rockets', 'cost': 1, 'stats': {}},
]
catalog['buildings']['rocketSite'] = {'name': 'Base de lancement', 'cost': 300, 'max': 2, 'tech': 'v_rockets'}
catalog['buildings']['reactor'] = {'name': 'Réacteur nucléaire', 'cost': 1500, 'max': 1, 'tech': 'el_atomic2'}

CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('techs', len(TECHS), 'equipment railwayGuns, rockets', 'buildings rocketSite, reactor')
