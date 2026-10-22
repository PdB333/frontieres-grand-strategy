#!/usr/bin/env python3
"""Frontieres 1.6 catalogue pass (idempotent).

  python3 tools/data/catalog_1_6.py

Adds the data used by the 1.6 systems to data/catalog.json. Every value is an
original game-balance value written for Frontieres; names are descriptive
French labels, not names taken from another game. Entries generated here carry
"v": 16 (lists) or live under keys owned by this script, so re-running the
script replaces them instead of duplicating them.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

# --- Terrain -----------------------------------------------------------------
terrain = catalog['terrain']
for key, attrition in {'plains': 0, 'forest': .1, 'mountains': .3, 'desert': .3, 'urban': 0}.items():
    terrain[key]['attrition'] = attrition
terrain['hills'] = {'name': 'Collines', 'defense': 1.3, 'move': 1.5, 'width': 80, 'attrition': .05}
terrain['marsh'] = {'name': 'Marais', 'defense': 1.35, 'move': 2.3, 'width': 60, 'attrition': .3}
terrain['jungle'] = {'name': 'Jungle', 'defense': 1.3, 'move': 2.0, 'width': 60, 'attrition': .4}

# --- Buildings ----------------------------------------------------------------
buildings = catalog['buildings']
for key in ('civ', 'mil', 'dock'):
    buildings[key]['shared'] = True
buildings['refinery'] = {'name': 'Raffinerie synthétique', 'cost': 420, 'max': 3, 'shared': True, 'tech': 'synthetic1'}
buildings['aa'] = {'name': 'Défense antiaérienne', 'cost': 150, 'max': 5}
buildings['coastalFort'] = {'name': 'Fort côtier', 'cost': 180, 'max': 5, 'coast': True}

# --- States -------------------------------------------------------------------
catalog['stateCategories'] = [
    {'id': 'wasteland', 'name': 'Terres désolées', 'score': 0, 'slots': 0},
    {'id': 'pastoral', 'name': 'Pastoral', 'score': .6, 'slots': 1},
    {'id': 'rural', 'name': 'Rural', 'score': 1.5, 'slots': 2},
    {'id': 'town', 'name': 'Bourg', 'score': 3, 'slots': 4},
    {'id': 'large_town', 'name': 'Grande ville', 'score': 5, 'slots': 5},
    {'id': 'city', 'name': 'Ville', 'score': 8, 'slots': 6},
    {'id': 'large_city', 'name': 'Grande cité', 'score': 14, 'slots': 8},
    {'id': 'metropolis', 'name': 'Métropole', 'score': 24, 'slots': 10},
    {'id': 'megalopolis', 'name': 'Mégalopole', 'score': 40, 'slots': 12},
]

# --- Weather --------------------------------------------------------------------
catalog['weather'] = {
    'clear': {'name': 'Clair', 'attack': 1, 'move': 1, 'air': 1, 'attrition': 0},
    'rain': {'name': 'Pluie', 'attack': .92, 'move': .85, 'air': .7, 'attrition': 0},
    'storm': {'name': 'Orage', 'attack': .86, 'move': .8, 'air': .4, 'attrition': .05},
    'snow': {'name': 'Neige', 'attack': .8, 'move': .65, 'air': .5, 'attrition': .2},
    'blizzard': {'name': 'Blizzard', 'attack': .65, 'move': .45, 'air': .15, 'attrition': .5},
    'frost': {'name': 'Grand froid', 'attack': .7, 'move': .7, 'air': .6, 'attrition': .6},
    'mud': {'name': 'Boue', 'attack': .78, 'move': .45, 'air': .8, 'attrition': .1},
    'monsoon': {'name': 'Mousson', 'attack': .8, 'move': .55, 'air': .45, 'attrition': .15},
    'sandstorm': {'name': 'Tempête de sable', 'attack': .82, 'move': .7, 'air': .35, 'attrition': .1},
    'heat': {'name': 'Chaleur extrême', 'attack': .9, 'move': .9, 'air': .95, 'attrition': .25},
}
catalog['seaWeather'] = {
    'calm': {'name': 'Mer calme', 'naval': 1, 'air': 1, 'invasion': True},
    'swell': {'name': 'Houle', 'naval': .85, 'air': .8, 'invasion': True},
    'gale': {'name': 'Tempête', 'naval': .6, 'air': .3, 'invasion': False},
}

# --- Resources ------------------------------------------------------------------
catalog['resources'] = {
    'steel': {'name': 'Acier', 'base': 8},
    'oil': {'name': 'Pétrole', 'base': 1},
    'rubber': {'name': 'Caoutchouc', 'base': 1},
    'aluminium': {'name': 'Aluminium', 'base': 1},
    'tungsten': {'name': 'Tungstène', 'base': 1},
    'chromium': {'name': 'Chrome', 'base': 1},
}

# --- Laws -------------------------------------------------------------------------
catalog['laws'] = {
    'economy': [
        {'id': 'isolation', 'name': 'Isolement', 'consumer': .5, 'production': -.15, 'construction': -.1, 'cost': 60},
        {'id': 'civilian', 'name': 'Économie civile', 'consumer': .4, 'production': -.1, 'construction': 0, 'cost': 60},
        {'id': 'early', 'name': 'Mobilisation précoce', 'consumer': .33, 'production': -.05, 'construction': .05, 'cost': 60},
        {'id': 'partial', 'name': 'Mobilisation partielle', 'consumer': .28, 'production': 0, 'construction': .1, 'cost': 60, 'tension': 25},
        {'id': 'war', 'name': 'Économie de guerre', 'consumer': .17, 'production': .15, 'construction': .15, 'cost': 100, 'tension': 50},
        {'id': 'total', 'name': 'Mobilisation totale', 'consumer': .1, 'production': .25, 'construction': .2, 'cost': 120, 'war': True, 'stability': -10},
    ],
    'conscription': [
        {'id': 'disarmed', 'name': 'Nation désarmée', 'pool': .4, 'recruit': .4, 'cost': 40},
        {'id': 'volunteer', 'name': 'Armée de volontaires', 'pool': 1, 'recruit': 1, 'cost': 40},
        {'id': 'limited', 'name': 'Service limité', 'pool': 1.35, 'recruit': 1.3, 'cost': 80},
        {'id': 'extensive', 'name': 'Service étendu', 'pool': 1.7, 'recruit': 1.6, 'cost': 80, 'production': -.03},
        {'id': 'service', 'name': 'Service obligatoire', 'pool': 2.05, 'recruit': 1.9, 'cost': 80, 'production': -.06, 'tension': 25},
        {'id': 'all_adults', 'name': 'Service de tous les adultes', 'pool': 2.6, 'recruit': 2.3, 'cost': 120, 'production': -.1, 'war': True, 'stability': -6},
        {'id': 'scraping', 'name': 'Levée en masse', 'pool': 3.2, 'recruit': 2.8, 'cost': 150, 'production': -.18, 'war': True, 'stability': -12},
    ],
    'trade': [
        {'id': 'free', 'name': 'Libre-échange', 'export': .8, 'production': .1, 'construction': .1, 'research': .05, 'cost': 60},
        {'id': 'export', 'name': 'Priorité aux exportations', 'export': .5, 'production': .05, 'construction': .05, 'research': .02, 'cost': 60},
        {'id': 'limited', 'name': 'Exportations limitées', 'export': .25, 'production': 0, 'construction': 0, 'research': 0, 'cost': 60},
        {'id': 'closed', 'name': 'Autarcie', 'export': 0, 'production': -.08, 'construction': -.05, 'research': -.03, 'cost': 60},
    ],
}

CATALOG.write_text(json.dumps(catalog, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
print('catalog keys', sorted(catalog))
