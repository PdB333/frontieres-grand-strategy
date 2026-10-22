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
        {'id': 'disarmed', 'name': 'Nation désarmée', 'pool': .4, 'share': 0.01, 'recruit': .4, 'cost': 40},
        {'id': 'volunteer', 'name': 'Armée de volontaires', 'pool': 1, 'share': 0.015, 'recruit': 1, 'cost': 40},
        {'id': 'limited', 'name': 'Service limité', 'pool': 1.35, 'share': 0.025, 'recruit': 1.3, 'cost': 80},
        {'id': 'extensive', 'name': 'Service étendu', 'pool': 1.7, 'share': 0.04, 'recruit': 1.6, 'cost': 80, 'production': -.03},
        {'id': 'service', 'name': 'Service obligatoire', 'pool': 2.05, 'share': 0.07, 'recruit': 1.9, 'cost': 80, 'production': -.06, 'tension': 25},
        {'id': 'all_adults', 'name': 'Service de tous les adultes', 'pool': 2.6, 'share': 0.11, 'recruit': 2.3, 'cost': 120, 'production': -.1, 'war': True, 'stability': -6},
        {'id': 'scraping', 'name': 'Levée en masse', 'pool': 3.2, 'share': 0.15, 'recruit': 2.8, 'cost': 150, 'production': -.18, 'war': True, 'stability': -12},
    ],
    'trade': [
        {'id': 'free', 'name': 'Libre-échange', 'export': .8, 'production': .1, 'construction': .1, 'research': .05, 'cost': 60},
        {'id': 'export', 'name': 'Priorité aux exportations', 'export': .5, 'production': .05, 'construction': .05, 'research': .02, 'cost': 60},
        {'id': 'limited', 'name': 'Exportations limitées', 'export': .25, 'production': 0, 'construction': 0, 'research': 0, 'cost': 60},
        {'id': 'closed', 'name': 'Autarcie', 'export': 0, 'production': -.08, 'construction': -.05, 'research': -.03, 'cost': 60},
    ],
}

# --- Equipment ------------------------------------------------------------------
# cost: production points per item; resources per factory line.
EQUIPMENT = {
    'rifles': ('Armement d’infanterie', .5, {'steel': 1}, 'rifle', 'land'),
    'supportEq': ('Matériel de soutien', 2, {'steel': 1}, 'box', 'land'),
    'artillery': ('Artillerie', 4, {'steel': 2, 'tungsten': 1}, 'crosshair', 'land'),
    'antiTank': ('Canons antichars', 4, {'steel': 2, 'tungsten': 1}, 'crosshair', 'land'),
    'antiAir': ('Canons antiaériens', 3.5, {'steel': 2}, 'crosshair', 'land'),
    'rocketArtillery': ('Lance-roquettes', 5, {'steel': 2}, 'crosshair', 'land'),
    'trucks': ('Camions', 3, {'steel': 1, 'rubber': 1}, 'truck', 'land'),
    'mechanized': ('Véhicules de transport blindés', 6, {'steel': 2, 'rubber': 1, 'chromium': 1}, 'truck', 'land'),
    'armoredCars': ('Automitrailleuses', 5, {'steel': 2, 'rubber': 1}, 'truck', 'land'),
    'lightTanks': ('Chars légers', 7, {'steel': 2, 'rubber': 1}, 'tank', 'land'),
    'tanks': ('Chars moyens', 10, {'steel': 3, 'tungsten': 1}, 'tank', 'land'),
    'heavyTanks': ('Chars lourds', 18, {'steel': 4, 'tungsten': 1, 'chromium': 1}, 'tank', 'land'),
    'fighters': ('Chasseurs', 14, {'aluminium': 2, 'rubber': 1}, 'plane', 'air'),
    'cas': ('Avions d’appui rapproché', 16, {'aluminium': 2, 'rubber': 1}, 'plane', 'air'),
    'bombers': ('Bombardiers tactiques', 22, {'aluminium': 3, 'rubber': 1}, 'plane', 'air'),
    'strategicBombers': ('Bombardiers stratégiques', 40, {'aluminium': 4, 'rubber': 2}, 'plane', 'air'),
    'navalBombers': ('Bombardiers navals', 20, {'aluminium': 3, 'rubber': 1}, 'plane', 'air'),
    'transportPlanes': ('Avions de transport', 18, {'aluminium': 3, 'rubber': 1}, 'plane', 'air'),
    'convoys': ('Convois', 12, {'steel': 1}, 'anchor', 'naval'),
    'destroyers': ('Destroyers', 140, {'steel': 3}, 'anchor', 'naval'),
    'submarines': ('Sous-marins', 90, {'steel': 2}, 'anchor', 'naval'),
    'cruisers': ('Croiseurs', 360, {'steel': 4, 'chromium': 1}, 'anchor', 'naval'),
    'battleships': ('Cuirassés', 850, {'steel': 6, 'chromium': 2}, 'anchor', 'naval'),
    'carriers': ('Porte-avions', 1000, {'steel': 5, 'aluminium': 1}, 'anchor', 'naval'),
}
FAMILY = {'lightTanks': 'tank', 'tanks': 'tank', 'heavyTanks': 'tank', 'fighters': 'plane', 'cas': 'plane', 'bombers': 'plane',
          'strategicBombers': 'plane', 'navalBombers': 'plane', 'transportPlanes': 'plane', 'destroyers': 'ship',
          'submarines': 'ship', 'cruisers': 'ship', 'battleships': 'ship', 'carriers': 'ship'}
equipment = {}
for key, (name, cost, res, icon, domain) in EQUIPMENT.items():
    entry = {'name': name, 'cost': cost, **res, 'icon': icon, 'domain': domain}
    if domain == 'naval':
        entry['naval'] = True
    if key in FAMILY:
        entry['family'] = FAMILY[key]
    equipment[key] = entry
catalog['equipment'] = equipment

# Generations. stats are multipliers of the first model of the type.
def model(mid, name, year, tech, cost=1, **stats):
    return {'id': mid, 'name': name, 'year': year, 'tech': tech, 'cost': cost, 'stats': stats}

catalog['models'] = {
    'rifles': [model('rifles_1918', 'Fusils réglementaires', 1918, None),
               model('rifles_1936', 'Armement d’infanterie 1936', 1936, 'armes1', 1.1, attack=1.12, defense=1.08),
               model('rifles_1939', 'Armement d’infanterie 1939', 1939, 'armes2', 1.2, attack=1.25, defense=1.16),
               model('rifles_1942', 'Armes automatiques 1942', 1942, 'armes3', 1.3, attack=1.4, defense=1.25)],
    'supportEq': [model('support_1918', 'Matériel de soutien', 1918, None),
                  model('support_1939', 'Matériel de soutien modernisé', 1939, 'logistique2', 1.1, attack=1.05, defense=1.05, reliability=1.1)],
    'artillery': [model('art_1918', 'Canons de campagne', 1918, None),
                  model('art_1936', 'Artillerie 1936', 1936, 'artillerie1', 1.1, attack=1.15),
                  model('art_1939', 'Artillerie 1939', 1939, 'artillerie2', 1.2, attack=1.3, piercing=1.1),
                  model('art_1942', 'Artillerie 1942', 1942, 'artillerie3', 1.3, attack=1.45, piercing=1.2)],
    'antiTank': [model('at_1936', 'Canons antichars légers', 1934, None),
                 model('at_1938', 'Canons antichars 1938', 1938, 'defense1', 1.1, piercing=1.25, attack=1.1),
                 model('at_1940', 'Canons antichars lourds', 1940, 'defense2', 1.25, piercing=1.55, attack=1.2),
                 model('at_1943', 'Canons antichars à haute vélocité', 1943, 'defense3', 1.4, piercing=1.9, attack=1.3)],
    'antiAir': [model('aa_1934', 'Mitrailleuses antiaériennes', 1934, None),
                model('aa_1936', 'Canons antiaériens 1936', 1936, 'aa1', 1.1, air=1.2),
                model('aa_1939', 'Canons antiaériens 1939', 1939, 'aa2', 1.2, air=1.45, piercing=1.15),
                model('aa_1942', 'Canons antiaériens lourds', 1942, 'aa3', 1.35, air=1.75, piercing=1.3)],
    'rocketArtillery': [model('rocket_1940', 'Lance-roquettes', 1940, 'rocket_artillery'),
                        model('rocket_1943', 'Lance-roquettes lourds', 1943, 'rocket2', 1.15, attack=1.25)],
    'trucks': [model('trucks_1930', 'Camions', 1930, None)],
    'mechanized': [model('mech_1939', 'Semi-chenillés', 1939, 'mechanized1'),
                   model('mech_1942', 'Transports blindés', 1942, 'mechanized2', 1.15, armor=1.2, defense=1.15)],
    'armoredCars': [model('ac_1934', 'Automitrailleuses', 1934, None),
                    model('ac_1938', 'Automitrailleuses blindées', 1938, 'armored_recon', 1.1, armor=1.2, attack=1.1)],
    'lightTanks': [model('lt_1934', 'Chars légers 1934', 1934, None),
                   model('lt_1936', 'Chars légers 1936', 1936, 'mobile1', 1.1, armor=1.15, attack=1.1, speed=1.05),
                   model('lt_1939', 'Chars légers 1939', 1939, 'mobile2', 1.2, armor=1.3, attack=1.2, speed=1.08),
                   model('lt_1942', 'Chars légers 1942', 1942, 'mobile3', 1.3, armor=1.45, attack=1.3, speed=1.1)],
    'tanks': [model('mt_1934', 'Chars moyens 1934', 1934, None),
              model('mt_1936', 'Chars moyens 1936', 1936, 'blindage1', 1.12, armor=1.2, attack=1.12, piercing=1.15),
              model('mt_1939', 'Chars moyens 1939', 1939, 'blindage2', 1.25, armor=1.45, attack=1.25, piercing=1.35),
              model('mt_1942', 'Chars moyens 1942', 1942, 'blindage3', 1.38, armor=1.7, attack=1.4, piercing=1.6)],
    'heavyTanks': [model('ht_1938', 'Chars lourds 1938', 1938, 'heavy_armor'),
                   model('ht_1942', 'Chars lourds 1942', 1942, 'heavy_armor2', 1.2, armor=1.35, attack=1.25, piercing=1.35)],
    'fighters': [model('fi_1933', 'Chasseurs 1933', 1933, None),
                 model('fi_1936', 'Chasseurs 1936', 1936, 'chasse1', 1.1, air=1.2, speed=1.12, defense=1.1),
                 model('fi_1940', 'Chasseurs 1940', 1940, 'chasse2', 1.2, air=1.45, speed=1.25, defense=1.2),
                 model('fi_1943', 'Chasseurs 1943', 1943, 'chasse3', 1.3, air=1.7, speed=1.38, defense=1.3),
                 model('fi_1944', 'Chasseurs à réaction', 1944, 'jet_propulsion', 1.6, air=2.2, speed=1.8, defense=1.4)],
    'cas': [model('cas_1936', 'Avions d’assaut 1936', 1936, None),
            model('cas_1939', 'Bombardiers en piqué 1939', 1939, 'cas1', 1.1, ground=1.25, defense=1.1),
            model('cas_1941', 'Avions d’assaut 1941', 1941, 'cas2', 1.2, ground=1.5, defense=1.2),
            model('cas_1943', 'Avions d’assaut blindés', 1943, 'cas3', 1.3, ground=1.75, defense=1.35)],
    'bombers': [model('tac_1933', 'Bombardiers 1933', 1933, None),
                model('tac_1936', 'Bombardiers 1936', 1936, 'bombardement1', 1.1, ground=1.2, speed=1.1, defense=1.1),
                model('tac_1940', 'Bombardiers 1940', 1940, 'bombardement2', 1.2, ground=1.4, speed=1.2, defense=1.2),
                model('tac_1943', 'Bombardiers 1943', 1943, 'bombardement3', 1.3, ground=1.6, speed=1.3, defense=1.3)],
    'strategicBombers': [model('str_1938', 'Bombardiers lourds 1938', 1938, 'strategic1'),
                         model('str_1941', 'Bombardiers lourds 1941', 1941, 'strategic2', 1.15, ground=1.3, defense=1.2, range=1.2),
                         model('str_1944', 'Bombardiers stratégiques 1944', 1944, 'strategic3', 1.3, ground=1.6, defense=1.4, range=1.4)],
    'navalBombers': [model('nav_1936', 'Bombardiers navals 1936', 1936, 'naval_bomber1'),
                     model('nav_1940', 'Bombardiers torpilleurs 1940', 1940, 'naval_bomber2', 1.15, naval=1.3, defense=1.15),
                     model('nav_1943', 'Bombardiers navals 1943', 1943, 'naval_bomber3', 1.3, naval=1.6, defense=1.3)],
    'transportPlanes': [model('tr_1936', 'Avions de transport', 1936, 'transport1')],
    'convoys': [model('convoy_1930', 'Convois marchands', 1930, None)],
    'destroyers': [model('dd_1922', 'Destroyers 1922', 1922, None),
                   model('dd_1936', 'Destroyers 1936', 1936, 'escorte1', 1.1, attack=1.15, subAttack=1.25, air=1.1),
                   model('dd_1940', 'Destroyers 1940', 1940, 'escorte2', 1.2, attack=1.3, subAttack=1.5, air=1.25),
                   model('dd_1944', 'Destroyers 1944', 1944, 'escorte3', 1.3, attack=1.45, subAttack=1.8, air=1.45)],
    'submarines': [model('ss_1922', 'Sous-marins 1922', 1922, None),
                   model('ss_1936', 'Sous-marins 1936', 1936, 'sousmarins1', 1.1, attack=1.15, stealth=1.15),
                   model('ss_1940', 'Sous-marins 1940', 1940, 'sousmarins2', 1.2, attack=1.3, stealth=1.3),
                   model('ss_1944', 'Sous-marins 1944', 1944, 'sousmarins3', 1.3, attack=1.5, stealth=1.5)],
    'cruisers': [model('ca_1922', 'Croiseurs 1922', 1922, None),
                 model('ca_1936', 'Croiseurs 1936', 1936, 'cruiser_hull', 1.1, attack=1.15, hp=1.1),
                 model('ca_1940', 'Croiseurs 1940', 1940, 'cruiser2', 1.2, attack=1.3, hp=1.2, air=1.3)],
    'battleships': [model('bb_1922', 'Cuirassés 1922', 1922, None),
                    model('bb_1936', 'Cuirassés 1936', 1936, 'capital_ships', 1.12, attack=1.15, hp=1.15),
                    model('bb_1940', 'Cuirassés rapides 1940', 1940, 'battleship2', 1.25, attack=1.3, hp=1.25, speed=1.2)],
    'carriers': [model('cv_1922', 'Porte-avions 1922', 1922, None),
                 model('cv_1936', 'Porte-avions 1936', 1936, 'carrier_ops', 1.12, air=1.2, hp=1.1),
                 model('cv_1941', 'Porte-avions d’escadre 1941', 1941, 'carrier_ops2', 1.25, air=1.45, hp=1.25)],
}

# Designer modules. Every effect is a multiplier of the chosen base model.
def module(mid, name, slot, families, tech=None, cost=1, types=None, **stats):
    entry = {'id': mid, 'name': name, 'slot': slot, 'families': families, 'tech': tech, 'cost': cost, 'stats': stats}
    if types:
        entry['types'] = types
    return entry

T, PL, SH = ['tank'], ['plane'], ['ship']
catalog['modules'] = [
    module('mg', 'Mitrailleuses', 'gun', T, cost=.9, attack=.95, piercing=.6),
    module('light_gun', 'Canon léger', 'gun', T),
    module('medium_gun', 'Canon moyen', 'gun', T, 'blindage1', 1.15, attack=1.15, piercing=1.3),
    module('hv_gun', 'Canon à haute vélocité', 'gun', T, 'blindage2', 1.3, attack=1.05, piercing=1.65),
    module('howitzer', 'Obusier court', 'gun', T, cost=1.12, attack=1.35, piercing=.85),
    module('flamethrower', 'Lance-flammes', 'gun', T, 'flame_tanks', 1.05, attack=1.25, piercing=.4, breakthrough=1.15),
    module('turret1', 'Tourelle à un homme', 'turret', T, cost=.95, attack=.9, reliability=1.05),
    module('turret2', 'Tourelle à deux hommes', 'turret', T),
    module('turret3', 'Tourelle à trois hommes', 'turret', T, 'blindage1', 1.1, attack=1.1, breakthrough=1.08),
    module('thin', 'Blindage léger', 'armor', T, cost=.9, armor=.8, speed=1.1),
    module('riveted', 'Blindage riveté', 'armor', T, reliability=.95),
    module('welded', 'Blindage soudé', 'armor', T, 'blindage1', 1.08, armor=1.15),
    module('cast', 'Blindage moulé', 'armor', T, 'blindage2', 1.12, armor=1.25, speed=.95),
    module('sloped', 'Blindage incliné', 'armor', T, 'blindage3', 1.2, armor=1.4),
    module('petrol', 'Moteur à essence', 'engine', T),
    module('diesel', 'Moteur diesel', 'engine', T, 'mobile1', 1.03, speed=.95, reliability=1.08),
    module('tuned', 'Moteur poussé', 'engine', T, 'mobile2', 1.08, speed=1.15, reliability=.9),
    module('none_t', 'Aucun équipement', 'special', T),
    module('radio', 'Radio de bord', 'special', T, cost=1.04, attack=1.04, defense=1.04),
    module('smoke', 'Lance-fumigènes', 'special', T, cost=1.02, defense=1.06),
    module('skirts', 'Jupes de blindage', 'special', T, 'blindage2', 1.05, armor=1.08, speed=.97),
    module('wet', 'Soutes à munitions protégées', 'special', T, cost=1.03, reliability=1.06),
    module('pl_mg', 'Mitrailleuses d’aile', 'armament', PL),
    module('pl_cannon', 'Canons d’aile', 'armament', PL, 'chasse2', 1.15, air=1.2, ground=1.05),
    module('pl_bombs', 'Soutes à bombes', 'armament', PL, cost=1.1, ground=1.3, air=.75),
    module('pl_heavy_bombs', 'Grandes soutes à bombes', 'armament', PL, 'strategic1', 1.25, ground=1.5, air=.6, types=['bombers', 'strategicBombers']),
    module('pl_torpedo', 'Torpille aérienne', 'armament', PL, 'naval_bomber1', 1.15, naval=1.45, types=['navalBombers', 'cas', 'bombers']),
    module('pl_single', 'Moteur standard', 'engine', PL),
    module('pl_upgraded', 'Moteur amélioré', 'engine', PL, 'chasse1', 1.1, speed=1.1),
    module('pl_twin', 'Bimoteur', 'engine', PL, cost=1.2, speed=1.05, range=1.25, defense=1.05),
    module('pl_turbo', 'Moteur à compresseur', 'engine', PL, 'chasse3', 1.25, speed=1.2, air=1.05),
    module('pl_bare', 'Sans protection', 'armor', PL),
    module('pl_sealing', 'Réservoirs auto-obturants', 'armor', PL, cost=1.05, defense=1.15),
    module('pl_plate', 'Plaques de blindage', 'armor', PL, 'cas1', 1.1, defense=1.3, speed=.95),
    module('pl_none', 'Aucun équipement', 'special', PL),
    module('pl_radar', 'Radar embarqué', 'special', PL, 'radar2', 1.1, air=1.1, naval=1.1),
    module('pl_droptanks', 'Réservoirs largables', 'special', PL, cost=1.03, range=1.3),
    module('pl_divebrakes', 'Aérofreins de piqué', 'special', PL, 'cas1', 1.05, ground=1.15, naval=1.1),
    module('sh_light', 'Batterie légère', 'battery', SH),
    module('sh_medium', 'Batterie moyenne', 'battery', SH, 'cruiser_hull', 1.15, attack=1.25, types=['cruisers', 'battleships']),
    module('sh_heavy', 'Batterie lourde', 'battery', SH, 'capital_ships', 1.3, attack=1.6, types=['battleships']),
    module('sh_flightdeck', 'Pont d’envol', 'battery', SH, types=['carriers']),
    module('sh_nobattery', 'Sans artillerie principale', 'battery', SH, cost=.9, attack=.5, types=['submarines', 'carriers']),
    module('sh_nosecondary', 'Sans armement secondaire', 'secondary', SH),
    module('sh_dp', 'Canons à double usage', 'secondary', SH, cost=1.05, air=1.25),
    module('sh_aa', 'Batterie antiaérienne', 'secondary', SH, 'aa1', 1.08, air=1.45),
    module('sh_notorpedo', 'Sans torpilles', 'torpedo', SH),
    module('sh_torpedo', 'Tubes lance-torpilles', 'torpedo', SH, cost=1.04, attack=1.15),
    module('sh_heavy_torpedo', 'Torpilles lourdes', 'torpedo', SH, 'escorte2', 1.08, attack=1.28),
    module('sh_light_armor', 'Cuirasse légère', 'armor', SH),
    module('sh_medium_armor', 'Cuirasse moyenne', 'armor', SH, 'cruiser_hull', 1.1, hp=1.2, speed=.95),
    module('sh_heavy_armor', 'Cuirasse lourde', 'armor', SH, 'capital_ships', 1.25, hp=1.45, speed=.9, types=['battleships', 'cruisers', 'carriers']),
    module('sh_standard', 'Machines standard', 'engine', SH),
    module('sh_fast', 'Machines rapides', 'engine', SH, cost=1.1, speed=1.12),
    module('sh_eco', 'Machines économiques', 'engine', SH, cost=.95, speed=.95),
    module('sh_none', 'Aucun équipement', 'special', SH),
    module('sh_sonar', 'Sonar', 'special', SH, 'escorte1', 1.04, subAttack=1.4, detection=1.15),
    module('sh_radar', 'Radar de surface', 'special', SH, 'radar2', 1.06, detection=1.3, attack=1.05),
    module('sh_depth', 'Grenadeurs anti-sous-marins', 'special', SH, cost=1.03, subAttack=1.3),
    module('sh_hangar', 'Hangar agrandi', 'special', SH, 'carrier_ops', 1.08, air=1.25, types=['carriers']),
    module('sh_snorkel', 'Schnorchel', 'special', SH, 'sousmarins2', 1.06, stealth=1.3, types=['submarines']),
]
catalog['designSlots'] = {'tank': ['gun', 'turret', 'armor', 'engine', 'special'],
                          'plane': ['armament', 'engine', 'armor', 'special'],
                          'ship': ['battery', 'secondary', 'torpedo', 'armor', 'engine', 'special']}

# --- Battalions and support companies ---------------------------------------------
def bat(bid, name, group, men, width, org, soft, hard, defense, bt, eq, armor=0, piercing=4, ap=0, hardness=0,
        speed=1.0, tech=None, terrain=None, special=None):
    entry = {'id': bid, 'name': name, 'group': group, 'men': men, 'width': width, 'org': org, 'soft': soft,
             'hard': hard, 'defense': defense, 'breakthrough': bt, 'armor': armor, 'piercing': piercing, 'ap': ap,
             'hardness': hardness, 'speed': speed, 'eq': eq, 'tech': tech}
    if terrain:
        entry['terrain'] = terrain
    if special:
        entry['special'] = special
    return entry

catalog['battalions'] = [
    bat('infantry', 'Infanterie', 'inf', 1000, 2, 60, 12, 2, 24, 5, {'rifles': 100}),
    bat('mountain', 'Troupes de montagne', 'inf', 1000, 2, 62, 11, 2, 23, 5, {'rifles': 120, 'supportEq': 5}, tech='mountain_troops',
        terrain={'mountains': {'attack': .25, 'defense': .2, 'move': .3}, 'hills': {'attack': .12, 'defense': .1, 'move': .15}}),
    bat('marines', 'Infanterie de marine', 'inf', 1000, 2, 60, 12, 2, 22, 5, {'rifles': 120, 'supportEq': 5}, tech='marines',
        terrain={'marsh': {'attack': .15, 'move': .2}, 'jungle': {'attack': .1}}, special={'amphibious': .7}),
    bat('paratroopers', 'Parachutistes', 'inf', 1000, 2, 60, 11, 2, 20, 5, {'rifles': 120, 'supportEq': 10}, tech='paratroopers',
        special={'paradrop': True}),
    bat('cavalry', 'Cavalerie', 'inf', 1000, 2, 65, 13, 2, 20, 6, {'rifles': 120}, speed=1.6,
        terrain={'desert': {'attack': .1}, 'plains': {'attack': .05}}),
    bat('militia', 'Milice de garnison', 'inf', 700, 2, 40, 8, 1, 18, 3, {'rifles': 60}, speed=.9, special={'police': .2}),
    bat('motorized', 'Infanterie motorisée', 'motor', 1000, 2, 60, 14, 3, 22, 9, {'rifles': 100, 'trucks': 65}, speed=1.9),
    bat('mechanized', 'Infanterie mécanisée', 'motor', 1000, 2, 60, 16, 6, 26, 14, {'mechanized': 40, 'rifles': 100}, armor=8,
        piercing=10, hardness=.5, speed=1.8, tech='mechanized1'),
    bat('armored_car', 'Automitrailleuses', 'motor', 450, 2, 50, 14, 5, 10, 12, {'armoredCars': 30, 'rifles': 20}, armor=6,
        piercing=8, hardness=.5, speed=2.2),
    bat('light_tank', 'Chars légers', 'tank', 500, 2, 25, 20, 8, 8, 26, {'lightTanks': 50}, armor=10, piercing=14, hardness=.8, speed=1.9),
    bat('medium_tank', 'Chars moyens', 'tank', 650, 2, 20, 24, 25, 16, 30, {'tanks': 45}, armor=19, piercing=20, hardness=.9, speed=1.65),
    bat('heavy_tank', 'Chars lourds', 'tank', 650, 3, 15, 26, 32, 22, 34, {'heavyTanks': 40}, armor=38, piercing=34, hardness=.95,
        speed=1.1, tech='heavy_armor'),
    bat('tank_destroyer', 'Chasseurs de chars', 'tank', 600, 2, 18, 8, 30, 18, 10, {'tanks': 30, 'antiTank': 12}, armor=22,
        piercing=40, hardness=.9, speed=1.5, tech='tank_destroyers'),
    bat('sp_artillery', 'Artillerie automotrice', 'tank', 600, 2, 18, 34, 8, 8, 10, {'tanks': 24, 'artillery': 20}, armor=10,
        piercing=10, hardness=.85, speed=1.6, tech='sp_artillery'),
    bat('sp_aa', 'DCA automotrice', 'tank', 500, 2, 18, 4, 4, 6, 4, {'lightTanks': 20, 'antiAir': 20}, armor=8, piercing=8, ap=20,
        hardness=.85, speed=1.7, tech='sp_aa'),
    bat('artillery', 'Artillerie de campagne', 'art', 500, 3, 0, 32, 8, 7, 4, {'artillery': 30}, piercing=6),
    bat('anti_tank', 'Antichars', 'art', 500, 1, 0, 3, 24, 6, 2, {'antiTank': 24}, piercing=45),
    bat('anti_air', 'Défense antiaérienne', 'art', 500, 1, 0, 3, 6, 4, 1, {'antiAir': 24}, piercing=10, ap=22),
    bat('rocket', 'Artillerie à roquettes', 'art', 500, 3, 0, 40, 6, 5, 5, {'rocketArtillery': 24}, piercing=5, tech='rocket_artillery'),
    bat('heavy_artillery', 'Artillerie lourde', 'art', 600, 4, 0, 44, 14, 9, 4, {'artillery': 45, 'trucks': 10}, piercing=12,
        speed=.8, tech='heavy_artillery'),
]

def sup(sid, name, men, eq, tech=None, **mods):
    return {'id': sid, 'name': name, 'men': men, 'eq': eq, 'tech': tech, 'mods': mods}

catalog['supports'] = [
    sup('engineer', 'Génie', 300, {'supportEq': 30}, defense=5, entrench=.15, river=.3),
    sup('bridge', 'Pontonniers', 300, {'supportEq': 40}, 'bridging', river=.6, speed=.03),
    sup('recon', 'Reconnaissance', 300, {'supportEq': 30, 'rifles': 10}, speed=.05, attack=.03, recon=1),
    sup('armored_recon', 'Reconnaissance blindée', 200, {'armoredCars': 20}, 'armored_recon', speed=.08, attack=.05, breakthrough=8, recon=1),
    sup('logistics', 'Compagnie logistique', 300, {'trucks': 30, 'supportEq': 20}, supply=.12, supplyUse=-.15),
    sup('hospital', 'Hôpital de campagne', 300, {'supportEq': 30}, 'medical_support', casualtyReturn=.22),
    sup('signal', 'Transmissions', 300, {'supportEq': 35}, 'signal_company', org=3, reinforce=.3),
    sup('police', 'Police militaire', 300, {'rifles': 20, 'supportEq': 10}, police=.3),
    sup('maintenance', 'Maintenance', 300, {'supportEq': 40, 'trucks': 10}, 'maintenance_company', reliability=.15),
    sup('art_support', 'Artillerie divisionnaire', 300, {'artillery': 12}, soft=12, hard=3),
    sup('at_support', 'Compagnie antichar', 300, {'antiTank': 12}, hard=12, piercing=40),
    sup('aa_support', 'Compagnie antiaérienne', 300, {'antiAir': 12}, ap=12, airShield=.15),
    sup('rocket_support', 'Batterie de roquettes', 300, {'rocketArtillery': 12}, 'rocket_artillery', soft=16),
    sup('flame', 'Chars lance-flammes', 200, {'lightTanks': 10}, 'flame_tanks', breakthrough=6, fortAttack=.2),
    sup('camo', 'Section de camouflage', 200, {'supportEq': 25}, 'camouflage', defense=3, airShield=.25),
]

GROUP = {b['id']: b['group'] for b in catalog['battalions']}
LEGACY_SUPPORT = {'engineer': 'engineer', 'logistics': 'logistics', 'recon': 'recon', 'antiTank': 'at_support', 'hospital': 'hospital'}


def with_legacy(template):
    # 1.5 code and saves read these summary fields; they are derived, never edited.
    counts = {'inf': 0, 'art': 0, 'tank': 0, 'motor': 0}
    for bid, n in template['bat'].items():
        counts[GROUP[bid]] += n
    template.update({k: min(15, v) for k, v in counts.items()})
    template.update({flag: sid in template['sup'] for flag, sid in LEGACY_SUPPORT.items()})
    template['recon'] = template['recon'] or 'armored_recon' in template['sup']
    return template


catalog['templates'] = [
    {'id': 'infantry', 'name': 'Division d’infanterie', 'bat': {'infantry': 9, 'artillery': 1}, 'sup': ['engineer']},
    {'id': 'assault', 'name': 'Division d’assaut', 'bat': {'infantry': 7, 'artillery': 3}, 'sup': ['engineer']},
    {'id': 'armored', 'name': 'Division blindée', 'bat': {'light_tank': 2, 'medium_tank': 2, 'motorized': 5, 'artillery': 1}, 'sup': ['engineer', 'logistics', 'recon']},
    {'id': 'motorized', 'name': 'Division motorisée', 'bat': {'motorized': 8, 'artillery': 1}, 'sup': ['logistics']},
    {'id': 'garrison', 'name': 'Brigade de garnison', 'bat': {'militia': 4}, 'sup': []},
    {'id': 'cavalry', 'name': 'Division de cavalerie', 'bat': {'cavalry': 4, 'artillery': 1}, 'sup': ['recon']},
    {'id': 'line_at', 'name': 'Division d’infanterie antichar', 'bat': {'infantry': 7, 'artillery': 2, 'anti_tank': 1}, 'sup': ['engineer', 'at_support']},
]
catalog['templates'] = [with_legacy(t) for t in catalog['templates']]

# --- Technologies that unlock the 1.6 units, models, modules and buildings ------------
def tech(tid, name, group, year, days, req, effect=None, unlock=None):
    return {'id': tid, 'name': name, 'group': group, 'year': year, 'days': days, 'req': req, 'effect': effect or {},
            'unlock': unlock or [], 'v': 16}

NEW_TECHS = [
    tech('mountain_troops', 'Troupes de montagne', 'infantry', 1936, 100, [], unlock=['battalion:mountain']),
    tech('marines', 'Infanterie de marine', 'infantry', 1937, 110, [], {'invasion': .05}, ['battalion:marines']),
    tech('paratroopers', 'Troupes aéroportées', 'infantry', 1938, 120, ['marines'], {'paradrop': .05}, ['battalion:paratroopers']),
    tech('heavy_artillery', 'Artillerie lourde', 'infantry', 1937, 105, ['artillerie1'], unlock=['battalion:heavy_artillery']),
    tech('rocket_artillery', 'Artillerie à roquettes', 'infantry', 1940, 130, ['artillerie2'], unlock=['battalion:rocket', 'support:rocket_support', 'model:rocket_1940']),
    tech('rocket2', 'Roquettes lourdes', 'infantry', 1943, 150, ['rocket_artillery'], unlock=['model:rocket_1943']),
    tech('aa1', 'Défense antiaérienne I', 'infantry', 1936, 95, [], {'airDefense': .05}, ['model:aa_1936', 'module:sh_aa']),
    tech('aa2', 'Défense antiaérienne II', 'infantry', 1938, 125, ['aa1'], {'airDefense': .05}, ['model:aa_1939']),
    tech('aa3', 'Défense antiaérienne III', 'infantry', 1941, 150, ['aa2'], {'airDefense': .08}, ['model:aa_1942']),
    tech('armored_recon', 'Reconnaissance blindée', 'armor', 1938, 105, ['mobile1'], unlock=['support:armored_recon', 'model:ac_1938']),
    tech('heavy_armor', 'Chars lourds', 'armor', 1938, 130, ['blindage1'], unlock=['battalion:heavy_tank', 'model:ht_1938']),
    tech('heavy_armor2', 'Chars lourds modernes', 'armor', 1942, 160, ['heavy_armor', 'blindage2'], unlock=['model:ht_1942']),
    tech('mechanized1', 'Infanterie mécanisée', 'armor', 1939, 130, ['mobile2'], unlock=['battalion:mechanized', 'model:mech_1939']),
    tech('mechanized2', 'Transports blindés', 'armor', 1942, 150, ['mechanized1'], unlock=['model:mech_1942']),
    tech('tank_destroyers', 'Chasseurs de chars', 'armor', 1940, 130, ['blindage2', 'defense2'], unlock=['battalion:tank_destroyer']),
    tech('sp_artillery', 'Artillerie automotrice', 'armor', 1940, 130, ['blindage2', 'artillerie2'], unlock=['battalion:sp_artillery']),
    tech('sp_aa', 'DCA automotrice', 'armor', 1941, 130, ['sp_artillery', 'aa2'], unlock=['battalion:sp_aa']),
    tech('flame_tanks', 'Chars lance-flammes', 'armor', 1941, 120, ['blindage2'], unlock=['support:flame', 'module:flamethrower']),
    tech('bridging', 'Pontonniers', 'logistics', 1938, 100, [], unlock=['support:bridge']),
    tech('signal_company', 'Transmissions de campagne', 'logistics', 1937, 100, [], {'planning': .03}, ['support:signal']),
    tech('maintenance_company', 'Maintenance mobile', 'logistics', 1939, 110, ['field_recovery'], {'reliability': .05}, ['support:maintenance']),
    tech('camouflage', 'Camouflage et dissimulation', 'doctrine', 1940, 110, [], unlock=['support:camo']),
    tech('synthetic1', 'Carburant synthétique', 'industry', 1937, 120, ['outillage1'], unlock=['building:refinery']),
    tech('synthetic2', 'Caoutchouc synthétique', 'industry', 1940, 140, ['synthetic1'], {'production': .03}),
    tech('excavation1', 'Techniques d’extraction I', 'industry', 1936, 100, [], {'resources': .1}),
    tech('excavation2', 'Techniques d’extraction II', 'industry', 1939, 130, ['excavation1'], {'resources': .1}),
    tech('excavation3', 'Techniques d’extraction III', 'industry', 1942, 155, ['excavation2'], {'resources': .1}),
    tech('cas1', 'Appui aérien rapproché I', 'air', 1938, 115, [], {'bombing': .05}, ['model:cas_1939', 'module:pl_plate', 'module:pl_divebrakes']),
    tech('cas2', 'Appui aérien rapproché II', 'air', 1941, 140, ['cas1'], {'bombing': .05}, ['model:cas_1941']),
    tech('cas3', 'Appui aérien rapproché III', 'air', 1943, 160, ['cas2'], {'bombing': .05}, ['model:cas_1943']),
    tech('naval_bomber1', 'Bombardiers navals', 'air', 1936, 110, [], unlock=['model:nav_1936', 'module:pl_torpedo']),
    tech('naval_bomber2', 'Bombardiers torpilleurs', 'air', 1940, 135, ['naval_bomber1'], unlock=['model:nav_1940']),
    tech('naval_bomber3', 'Bombardiers navals modernes', 'air', 1943, 155, ['naval_bomber2'], unlock=['model:nav_1943']),
    tech('strategic1', 'Bombardement stratégique I', 'air', 1938, 130, ['bombardement1'], {'bombing': .05}, ['model:str_1938', 'module:pl_heavy_bombs']),
    tech('strategic2', 'Bombardement stratégique II', 'air', 1941, 150, ['strategic1'], {'bombing': .05}, ['model:str_1941']),
    tech('strategic3', 'Bombardement stratégique III', 'air', 1944, 170, ['strategic2'], {'bombing': .05}, ['model:str_1944']),
    tech('transport1', 'Transport aérien', 'air', 1937, 110, [], {'paradrop': .05}, ['model:tr_1936']),
    tech('cruiser2', 'Croiseurs modernes', 'navy', 1940, 140, ['cruiser_hull'], unlock=['model:ca_1940']),
    tech('battleship2', 'Cuirassés rapides', 'navy', 1940, 160, ['capital_ships'], unlock=['model:bb_1940']),
]
catalog['techs'] = [t for t in catalog['techs'] if t.get('v') != 16] + NEW_TECHS
# Unlock lists on the original techs that now drive models and modules.
UNLOCKS = {
    'armes1': ['model:rifles_1936'], 'armes2': ['model:rifles_1939'], 'armes3': ['model:rifles_1942'],
    'artillerie1': ['model:art_1936'], 'artillerie2': ['model:art_1939'], 'artillerie3': ['model:art_1942'],
    'defense1': ['model:at_1938'], 'defense2': ['model:at_1940'], 'defense3': ['model:at_1943'],
    'blindage1': ['model:mt_1936', 'module:medium_gun', 'module:turret3', 'module:welded'],
    'blindage2': ['model:mt_1939', 'module:hv_gun', 'module:cast', 'module:skirts'],
    'blindage3': ['model:mt_1942', 'module:sloped'],
    'mobile1': ['model:lt_1936', 'module:diesel'], 'mobile2': ['model:lt_1939', 'module:tuned'], 'mobile3': ['model:lt_1942'],
    'chasse1': ['model:fi_1936', 'module:pl_upgraded'], 'chasse2': ['model:fi_1940', 'module:pl_cannon'],
    'chasse3': ['model:fi_1943', 'module:pl_turbo'], 'jet_propulsion': ['model:fi_1944'],
    'bombardement1': ['model:tac_1936'], 'bombardement2': ['model:tac_1940'], 'bombardement3': ['model:tac_1943'],
    'escorte1': ['model:dd_1936', 'module:sh_sonar'], 'escorte2': ['model:dd_1940', 'module:sh_heavy_torpedo'], 'escorte3': ['model:dd_1944'],
    'sousmarins1': ['model:ss_1936'], 'sousmarins2': ['model:ss_1940', 'module:sh_snorkel'], 'sousmarins3': ['model:ss_1944'],
    'cruiser_hull': ['model:ca_1936', 'module:sh_medium', 'module:sh_medium_armor'],
    'capital_ships': ['model:bb_1936', 'module:sh_heavy', 'module:sh_heavy_armor'],
    'carrier_ops': ['model:cv_1936', 'module:sh_hangar'], 'carrier_ops2': ['model:cv_1941'],
    'logistique2': ['model:support_1939'], 'radar2': ['module:pl_radar', 'module:sh_radar'],
    'medical_support': ['support:hospital'],
}
for t in catalog['techs']:
    if t['id'] in UNLOCKS:
        t['unlock'] = UNLOCKS[t['id']]
# Industrial construction techniques also open new building slots.
for t in catalog['techs']:
    if t['id'] in ('construction1', 'construction2', 'construction3'):
        t['effect']['buildingSlots'] = .15

# --- Releasable nations ---------------------------------------------------------------
# Territory = provinces whose "administration" matches (optionally only from listed owners).
def rel(rid, name, admins, ideology, color, owners=None, leader='Gouvernement provisoire'):
    entry = {'id': rid, 'name': name, 'admins': admins, 'ideology': ideology, 'color': color, 'leader': leader}
    if owners:
        entry['owners'] = owners
    return entry

catalog['releasables'] = [
    rel('SLO', 'Slovaquie', ['Slovakia'], 'authoritarian', '#5d7fa3'),
    rel('UKR', 'Ukraine', ['Ukraine'], 'authoritarian', '#c7b25c'),
    rel('BLR', 'Biélorussie', ['Belarus'], 'authoritarian', '#9a8a6a'),
    rel('AZR', 'Azerbaïdjan', ['Azerbaijan'], 'authoritarian', '#5f9b8f'),
    rel('KAZ', 'Kazakhstan', ['Kazakhstan'], 'authoritarian', '#6aa0b8'),
    rel('UZB', 'Ouzbékistan', ['Uzbekistan'], 'authoritarian', '#7b9f6a'),
    rel('TMS', 'Turkménistan', ['Turkmenistan'], 'authoritarian', '#8aa36f'),
    rel('KYR', 'Kirghizistan', ['Kyrgyzstan'], 'authoritarian', '#b0705f'),
    rel('TAJ', 'Tadjikistan', ['Tajikistan'], 'authoritarian', '#a57e5c'),
    rel('CRO', 'Croatie', ['Croatia'], 'authoritarian', '#7b8fb4'),
    rel('SLV', 'Slovénie', ['Slovenia'], 'democratic', '#8db08e'),
    rel('BOS', 'Bosnie', ['Bosnia and Herz.'], 'authoritarian', '#a8a06c'),
    rel('MNT', 'Monténégro', ['Montenegro'], 'authoritarian', '#9c6a5f'),
    rel('MKD', 'Macédoine', ['Macedonia', 'Kosovo'], 'authoritarian', '#b38f60'),
    rel('MOL', 'Moldavie', ['Moldova'], 'authoritarian', '#8c9a6d'),
    rel('ICE', 'Islande', ['Iceland'], 'democratic', '#7aa3c7'),
    rel('ALG', 'Algérie', ['Algérie'], 'authoritarian', '#5e9a6e'),
    rel('MOR', 'Maroc', ['Maroc'], 'authoritarian', '#b0644e'),
    rel('TUN', 'Tunisie', ['Tunisie'], 'authoritarian', '#b37b6e'),
    rel('SYR', 'Syrie', ['Syrie mandataire'], 'authoritarian', '#a29266'),
    rel('LEB', 'Liban', ['Liban mandataire'], 'democratic', '#8db38a'),
    rel('INC', 'Indochine', ['Indochine'], 'authoritarian', '#b0855c'),
    rel('MAD', 'Madagascar', ['Madagascar'], 'authoritarian', '#8f9e6b'),
    rel('FWA', 'Afrique-Occidentale', ['Senegal', 'Mauritania', 'Soudan français', 'Guinea', "Côte d'Ivoire", 'Niger', 'Burkina Faso', 'Benin', 'Togo'], 'authoritarian', '#9d8f62'),
    rel('FEA', 'Afrique-Équatoriale', ['Tchad', 'Central African Rep.', 'Congo', 'Gabon'], 'authoritarian', '#7e9467'),
    rel('JOR', 'Transjordanie', ['Jordan'], 'authoritarian', '#a99168'),
    rel('KEN', 'Kenya', ['Kenya'], 'authoritarian', '#8a6f52'),
    rel('NGA', 'Nigeria', ['Nigeria'], 'authoritarian', '#6c9466'),
    rel('GLD', 'Côte-de-l’Or', ['Ghana'], 'authoritarian', '#b2a05f'),
    rel('MAL', 'Malaisie', ['Malaysia'], 'authoritarian', '#a46e60'),
    rel('CEY', 'Ceylan', ['Ceylan'], 'democratic', '#b0855f'),
    rel('SUD', 'Soudan', ['Sudan', 'S. Sudan'], 'authoritarian', '#9a8458'),
    rel('RHO', 'Rhodésie', ['Rhodésie du Sud', 'Rhodésie du Nord'], 'authoritarian', '#7d8e63'),
    rel('CYP', 'Chypre', ['Cyprus'], 'democratic', '#c09b6b'),
    rel('INS', 'Indonésie', ['Indes néerlandaises'], 'authoritarian', '#b06c5e'),
    rel('COG', 'Congo', ['Congo belge'], 'authoritarian', '#6f8c6c'),
    rel('LBA', 'Libye', ['Libya'], 'authoritarian', '#9f9b6a'),
    rel('SOM', 'Somalie', ['Somalia', 'Somaliland'], 'authoritarian', '#6f9fb3'),
    rel('ERI', 'Érythrée', ['Eritrea'], 'authoritarian', '#90a066'),
    rel('KOR', 'Corée', ['Corée'], 'authoritarian', '#8f8fb4'),
    rel('ANG', 'Angola', ['Angola'], 'authoritarian', '#a5765e'),
    rel('MZB', 'Mozambique', ['Mozambique'], 'authoritarian', '#6e9a77'),
    rel('BRM', 'Birmanie', ['Birmanie'], 'authoritarian', '#a99a5a'),
    rel('PAK', 'Pakistan', ['Pakistan'], 'authoritarian', '#5f8a5b'),
]

# --- Government: advisors, national spirits, decisions -------------------------------
catalog['advisorSlots'] = {'political': ['Conseiller politique', 3], 'army': ['Chef d’état-major de l’armée', 1],
                           'navy': ['Chef d’état-major de la marine', 1], 'air': ['Chef d’état-major de l’air', 1],
                           'command': ['Haut commandement', 3], 'theorist': ['Théoricien', 1]}

def adv(aid, name, slot, cost, effect, ideology=None):
    entry = {'id': aid, 'name': name, 'slot': slot, 'cost': cost, 'effect': effect}
    if ideology:
        entry['ideology'] = ideology
    return entry

catalog['advisors'] = [
    adv('industrialist', 'Grand industriel', 'political', 100, {'construction': .1}),
    adv('economist', 'Économiste réformateur', 'political', 90, {'production': .05, 'consumer': -.02}),
    adv('scientist', 'Directeur de la recherche', 'political', 100, {'research': .08}),
    adv('propagandist', 'Ministre de l’information', 'political', 80, {'supportGrowth': .4}),
    adv('diplomat', 'Diplomate chevronné', 'political', 80, {'ppGain': .12}),
    adv('logistician', 'Intendant général', 'political', 90, {'supply': .1}),
    adv('spymaster', 'Chef du renseignement', 'political', 90, {'intel': .15}),
    adv('prospector', 'Directeur des mines', 'political', 80, {'resources': .08}),
    adv('reconciler', 'Médiateur social', 'political', 80, {'stabilityGrowth': .4}, ['democratic', 'authoritarian']),
    adv('commissar', 'Commissaire politique', 'political', 80, {'stabilityGrowth': .3, 'organization': .03}, ['communist']),
    adv('party_chief', 'Chef du parti unique', 'political', 80, {'supportGrowth': .3, 'ppGain': .05}, ['fascist']),
    adv('army_offense', 'Chef d’état-major offensif', 'army', 120, {'attack': .08}),
    adv('army_defense', 'Chef d’état-major défensif', 'army', 120, {'defense': .08}),
    adv('army_org', 'Chef d’état-major organisateur', 'army', 120, {'organization': .1}),
    adv('army_mobile', 'Maître de la manœuvre', 'army', 120, {'speed': .06, 'breakthrough': .06}),
    adv('navy_fleet', 'Amiral d’escadre', 'navy', 110, {'navy': .1}),
    adv('navy_raider', 'Amiral de la guerre de course', 'navy', 110, {'raiding': .2}),
    adv('navy_convoy', 'Amiral des convois', 'navy', 110, {'convoy': .25}),
    adv('navy_mines', 'Spécialiste de la guerre des mines', 'navy', 100, {'mines': .4}),
    adv('air_fighter', 'Chef de la chasse', 'air', 110, {'air': .1}),
    adv('air_bomber', 'Chef du bombardement', 'air', 110, {'bombing': .12}),
    adv('air_defense', 'Chef de la défense aérienne', 'air', 100, {'airDefense': .25}),
    adv('air_airborne', 'Chef des troupes aéroportées', 'air', 100, {'paradrop': .25}),
    adv('hc_infantry', 'Expert de l’infanterie', 'command', 90, {'defense': .04, 'attack': .03}),
    adv('hc_armor', 'Expert des blindés', 'command', 90, {'armor': .1, 'breakthrough': .04}),
    adv('hc_artillery', 'Expert de l’artillerie', 'command', 90, {'attack': .05}),
    adv('hc_planner', 'Planificateur', 'command', 90, {'planning': .1}),
    adv('hc_amphibious', 'Expert des opérations amphibies', 'command', 90, {'invasion': .2}),
    adv('hc_climate', 'Expert des climats extrêmes', 'command', 90, {'attrition': .25}),
    adv('hc_engineer', 'Inspecteur du génie', 'command', 90, {'entrench': .2, 'defense': .02}),
    adv('theorist_army', 'Théoricien de la guerre terrestre', 'theorist', 90, {'research': .03, 'planning': .04}),
    adv('theorist_navy', 'Théoricien naval', 'theorist', 90, {'research': .02, 'navy': .05}),
    adv('theorist_air', 'Théoricien de l’aviation', 'theorist', 90, {'research': .02, 'air': .05}),
]

def spirit(sid, name, desc, effect):
    return {'id': sid, 'name': name, 'desc': desc, 'effect': effect}

catalog['spirits'] = [
    spirit('isolation', 'Isolationnisme', 'L’opinion refuse tout engagement extérieur.', {'consumer': .05, 'stabilityGrowth': .2, 'supportGrowth': -.3}),
    spirit('maginot', 'Mentalité défensive', 'Les fortifications rassurent plus que les plans d’offensive.', {'defense': .1, 'attack': -.05, 'entrench': .2}),
    spirit('divided', 'Société divisée', 'Grèves et affrontements politiques minent le gouvernement.', {'stabilityGrowth': -.3}),
    spirit('empire', 'Ressources impériales', 'Les routes de l’empire acheminent matières premières et convois.', {'resources': .1, 'convoy': .15}),
    spirit('purges', 'Purges de l’armée', 'L’encadrement militaire est décimé par la répression.', {'organization': -.15, 'planning': -.1}),
    spirit('plans', 'Planification industrielle', 'Les plans quinquennaux concentrent l’investissement.', {'production': .05, 'construction': .1}),
    spirit('rearmament', 'Réarmement accéléré', 'L’industrie est orientée vers l’armement.', {'production': .08, 'consumer': -.03}),
    spirit('colonial', 'Ambitions coloniales', 'Le régime cherche des victoires outre-mer.', {'attack': .03}),
    spirit('zaibatsu', 'Conglomérats industriels', 'Les grands groupes dominent l’économie.', {'production': .05}),
    spirit('rivalry', 'Rivalité armée-marine', 'Deux états-majors se disputent les crédits.', {'research': -.05}),
    spirit('warlords', 'Seigneurs de la guerre', 'L’autorité centrale reste contestée et les armées provinciales sont mal équipées.', {'stabilityGrowth': -.3, 'organization': -.15, 'recruitment': .2, 'attack': -.12, 'defense': -.05, 'surrender': .15}),
    spirit('rationalization', 'Rationalisation industrielle', 'Normes et méthodes modernes dans les ateliers.', {'production': .08}),
    spirit('export_drive', 'Campagne d’exportation', 'Les entreprises sont incitées à vendre à l’étranger.', {'construction': .04}),
    spirit('prospecting', 'Prospection minière', 'Des géologues ouvrent de nouveaux gisements.', {'resources': .1}),
    spirit('officer_schools', 'Écoles d’officiers', 'Une nouvelle génération de cadres est formée.', {'organization': .05}),
    spirit('winter_gear', 'Équipement d’hiver', 'Vêtements et lubrifiants adaptés au grand froid.', {'attrition': .25}),
    spirit('emergency', 'Production d’urgence', 'Les usines tournent jour et nuit.', {'production': .12}),
    spirit('scorched', 'Terre brûlée', 'Rien ne doit tomber intact aux mains de l’ennemi.', {'defense': .05}),
    spirit('social_reforms', 'Réformes sociales', 'Congés et protections apaisent le pays.', {'consumer': .02, 'stabilityGrowth': .2}),
    spirit('cult', 'Culte de la personnalité', 'Le chef incarne la nation.', {'ppGain': .15, 'stabilityGrowth': .2, 'research': -.03}),
    spirit('purged_army', 'Armée épurée', 'La loyauté prime sur la compétence.', {'organization': -.1}),
    spirit('free_press', 'Presse libre', 'Le débat public stimule les idées.', {'research': .03}),
    spirit('national_union', 'Union nationale', 'Les partis font bloc derrière le gouvernement.', {'supportGrowth': .3}),
    spirit('arms_race', 'Course aux armements', 'Chaque puissance surveille l’arsenal des autres.', {'production': .05}),
    spirit('foreign_advisers', 'Conseillers étrangers', 'Des officiers alliés forment l’état-major.', {'planning': .05}),
    spirit('popular_front', 'Front populaire', 'Les réformes sociales l’emportent sur la production.', {'stabilityGrowth': .3, 'production': -.05}),
    spirit('four_year', 'Plan de quatre ans', 'Autarcie, carburants synthétiques et grands travaux.', {'production': .05, 'resources': .1, 'construction': .05}),
    spirit('arsenal', 'Arsenal des démocraties', 'L’industrie civile se convertit massivement.', {'production': .1}),
    spirit('mare_nostrum', 'Mare Nostrum', 'La marine domine la Méditerranée.', {'navy': .08}),
    spirit('burma_road', 'Route d’approvisionnement', 'Une route lointaine maintient l’aide étrangère.', {'supply': .1, 'resources': .05}),
    spirit('united_front', 'Front uni', 'Les factions rivales combattent l’envahisseur ensemble.', {'stabilityGrowth': .2, 'organization': .05, 'surrender': .1}),
    spirit('strategic_depth', 'Profondeur stratégique', 'L’immensité du territoire permet d’échanger l’espace contre le temps.', {'surrender': .25, 'attrition': .15, 'supply': .1}),
    spirit('civil_war', 'Guerre civile', 'Le pays se déchire : milices improvisées, cadres divisés, nul ne veut capituler.', {'attack': -.3, 'breakthrough': -.2, 'defense': .1, 'organization': -.05, 'surrender': .3, 'production': -.1}),
    spirit('popular_militias', 'Milices populaires', 'Partis et syndicats lèvent leurs propres colonnes ; l’armée régulière se reconstruit lentement.', {'attack': -.1, 'organization': -.1, 'planning': -.1}),
    spirit('africa_army', 'Armée d’Afrique', 'Les troupes coloniales aguerries forment le noyau du camp insurgé.', {'attack': .15, 'organization': .1, 'defense': .05}),
    spirit('phoney_war', 'Drôle de guerre', 'L’armée attend derrière ses fortifications : commandement lent, transmissions par estafette, réserves mal placées.', {'attack': -.15, 'defense': -.1, 'planning': -.15, 'organization': -.1}),
    spirit('sickle_cut', 'Coup de faux', 'Les blindés traversent un massif réputé infranchissable et frappent la charnière du front adverse.', {'breakthrough': .3, 'attack': .15, 'speed': .1}),
    spirit('surprise_offensive', 'Offensive surprise', 'Des millions d’hommes franchissent la frontière à l’aube, sur toute sa longueur.', {'attack': .1, 'breakthrough': .2, 'speed': .1}),
    spirit('caught_unprepared', 'Armée prise au dépourvu', 'Unités en cours de réorganisation, aviation détruite au sol, ordres contradictoires.', {'defense': -.1, 'organization': -.1, 'planning': -.15}),
    spirit('blitz_doctrine', 'École de la manœuvre', 'Radio dans chaque char, aviation d’appui et chefs formés à l’initiative.', {'breakthrough': .2, 'attack': .1, 'planning': .1, 'organization': .05}),
    spirit('sisu', 'Sisu', 'Skieurs, forêts et lacs gelés : chaque position se défend jusqu’au bout.', {'defense': .15, 'attrition': .3, 'surrender': .25}),
    spirit('national_redoubt', 'Réduit national', 'Le relief et une armée de milice préparée de longue date protègent le pays.', {'defense': .1, 'entrench': .2, 'surrender': .05}),
]
catalog['startSpirits'] = {
    '1936': {'USA': ['isolation'], 'FRA': ['maginot', 'divided'], 'GBR': ['empire'], 'SOV': ['purges', 'plans', 'strategic_depth'],
             'GER': ['rearmament'], 'ITA': ['colonial'], 'JPN': ['zaibatsu', 'rivalry'], 'CHI': ['warlords', 'strategic_depth'],
             'FIN': ['sisu'], 'SWI': ['national_redoubt'], 'PRC': ['revolutionary_army'], 'SHX': ['warlords'], 'GXC': ['warlords'],
             'YUN': ['warlords'], 'XSM': ['warlords'], 'SIK': ['warlords']},
    '1939': {'USA': ['isolation'], 'FRA': ['maginot', 'phoney_war'], 'GBR': ['empire'], 'SOV': ['purged_army', 'plans', 'strategic_depth'],
             'GER': ['rearmament', 'four_year', 'blitz_doctrine'], 'ITA': ['colonial'], 'JPN': ['zaibatsu', 'rivalry'], 'CHI': ['united_front', 'strategic_depth'],
             'FIN': ['sisu'], 'SWI': ['national_redoubt'], 'PRC': ['revolutionary_army'], 'SHX': ['warlords'], 'GXC': ['warlords'],
             'YUN': ['warlords'], 'XSM': ['warlords'], 'SIK': ['warlords']},
}

def dec(did, name, category, cost, desc, requires=None, effect=None, spirit_id=None, days=None, cooldown=0, once=False,
        special=None, remove=None):
    entry = {'id': did, 'name': name, 'category': category, 'cost': cost, 'desc': desc, 'requires': requires or {},
             'effect': effect or {}, 'cooldown': cooldown, 'once': once}
    if spirit_id:
        entry['spirit'] = spirit_id
        entry['days'] = days
    if special:
        entry['special'] = special
    if remove:
        entry['removeSpirit'] = remove
    return entry

catalog['decisionCategories'] = {'economy': 'Économie', 'military': 'Armée et défense', 'politics': 'Politique intérieure',
                                 'foreign': 'Affaires étrangères', 'national': 'Décisions nationales'}
catalog['decisions'] = [
    dec('war_bonds', 'Emprunt de guerre', 'economy', 40, 'Un emprunt patriotique finance l’effort de guerre.', {'war': True}, {'support': 4}, cooldown=180, special={'treasury': 300}),
    dec('gold_reserves', 'Mobiliser les réserves d’or', 'economy', 30, 'Les réserves de la banque centrale paient les importations.', {}, {}, once=True, special={'treasury': 600}),
    dec('factory_conversion', 'Reconversion d’usines civiles', 'economy', 70, 'Deux usines civiles passent à la production militaire.', {'war': True}, cooldown=365, special={'convert': 2}),
    dec('rationalize', 'Rationalisation industrielle', 'economy', 80, 'Six mois de méthodes modernes dans les ateliers.', {}, spirit_id='rationalization', days=180, cooldown=365),
    dec('export_drive', 'Campagne d’exportation', 'economy', 40, 'Le commerce extérieur finance les chantiers.', {'peace': True}, spirit_id='export_drive', days=120, cooldown=240),
    dec('prospecting', 'Prospection minière', 'economy', 50, 'Une année d’exploration géologique.', {}, spirit_id='prospecting', days=365, cooldown=540),
    dec('public_works', 'Grands travaux d’infrastructure', 'economy', 60, 'Routes et voies ferrées dans cinq provinces.', {}, {'stability': 2}, cooldown=365, special={'infra': 5}),
    dec('synthetic_program', 'Programme de carburant synthétique', 'economy', 70, 'Une raffinerie synthétique dans l’État de la capitale.', {'tech': 'synthetic1'}, once=True, special={'refinery': 1}),
    dec('mobilize_reserves', 'Rappel des réservistes', 'military', 50, 'Les classes de réserve rejoignent les dépôts.', {'tension': 60}, cooldown=180, special={'manpower': .2}),
    dec('officer_training', 'Écoles d’officiers', 'military', 50, 'Former les cadres de l’armée de demain.', {}, {'xp': 25}, 'officer_schools', 180, cooldown=365),
    dec('war_exercises', 'Grandes manœuvres', 'military', 40, 'Des exercices à grande échelle aguerrissent l’armée.', {'peace': True}, {'xp': 20, 'stability': -1}, cooldown=180),
    dec('winter_gear', 'Équipement d’hiver', 'military', 40, 'Préparer l’armée aux campagnes hivernales.', {}, spirit_id='winter_gear', days=365, cooldown=400),
    dec('border_forts', 'Fortifier la frontière', 'military', 60, 'Des ouvrages défensifs face aux voisins menaçants.', {'tension': 30}, cooldown=365, special={'forts': 6}),
    dec('coastal_defense', 'Défense côtière', 'military', 50, 'Batteries et blockhaus sur quatre côtes exposées.', {}, cooldown=365, special={'coastal': 4}),
    dec('air_defense_program', 'Défense passive', 'military', 50, 'Batteries antiaériennes autour des grandes villes.', {}, cooldown=365, special={'aa': 4}),
    dec('emergency_production', 'Production d’urgence', 'military', 60, 'Deux mois de production à marche forcée.', {'war': True}, {'stability': -3}, 'emergency', 60, cooldown=150),
    dec('scorched_earth', 'Terre brûlée', 'military', 40, 'Détruire les installations au contact de l’ennemi.', {'war': True}, spirit_id='scorched', days=120, cooldown=365, special={'scorch': True}),
    dec('militia_call', 'Levée des milices', 'military', 30, 'Quatre brigades de garnison défendent la capitale.', {'war': True}, cooldown=365, special={'militia': 4}),
    dec('propaganda', 'Campagne de propagande', 'politics', 40, 'Affiches, radio et cinéma mobilisent l’opinion.', {}, {'support': 8}, cooldown=60),
    dec('sacred_union', 'Union sacrée', 'politics', 60, 'La nation se rassemble face au danger.', {'war': True}, {'stability': 10, 'support': 10}, cooldown=365),
    dec('crackdown', 'Répression des opposants', 'politics', 50, 'Arrestations et censure étouffent l’opposition.', {'notIdeology': ['democratic']}, {'stability': 6}, cooldown=120, special={'unrest': -10, 'party': 5}),
    dec('reforms', 'Réformes sociales', 'politics', 50, 'Congés payés et protections sociales.', {'ideology': ['democratic']}, {'stability': 5}, 'social_reforms', 365, cooldown=400, special={'legitimacy': 5}),
    dec('personality_cult', 'Culte de la personnalité', 'politics', 80, 'Le chef devient l’incarnation de l’État.', {'ideology': ['fascist', 'communist']}, spirit_id='cult', once=True),
    dec('army_purge', 'Épuration de l’armée', 'politics', 50, 'La fidélité politique avant tout.', {'ideology': ['fascist', 'communist']}, {'stability': 5}, 'purged_army', 365, once=True),
    dec('free_press', 'Liberté de la presse', 'politics', 30, 'Garantir l’indépendance des journaux.', {'ideology': ['democratic']}, {'stability': 2}, 'free_press', once=True),
    dec('national_union', 'Gouvernement d’union nationale', 'politics', 70, 'Tous les partis entrent au gouvernement.', {'war': True, 'ideology': ['democratic']}, spirit_id='national_union', once=True),
    dec('international_conference', 'Conférence internationale', 'foreign', 60, 'Une conférence pour apaiser les tensions.', {'peace': True, 'ideology': ['democratic']}, {'tension': -5}, cooldown=180),
    dec('arms_race', 'Course aux armements', 'foreign', 40, 'Annoncer un grand programme d’armement.', {}, {'tension': 3}, 'arms_race', 180, cooldown=365),
    dec('colonial_recruitment', 'Recrutement colonial', 'foreign', 50, 'Des régiments levés outre-mer.', {'overseas': True}, cooldown=365, special={'colonial': True}),
    dec('foreign_advisers', 'Conseillers militaires étrangers', 'foreign', 40, 'Des officiers alliés forment votre état-major.', {'faction': True}, {'xp': 15}, 'foreign_advisers', 180, cooldown=365),
    dec('maginot_extension', 'Prolonger la ligne fortifiée', 'national', 80, 'Étendre les ouvrages le long de la frontière nord-est.', {'country': ['FRA'], 'tension': 20}, once=True, special={'forts': 10, 'fortLevel': 2}),
    dec('popular_front', 'Réformes du Front populaire', 'national', 60, 'Semaine de quarante heures et conventions collectives.', {'country': ['FRA'], 'peace': True, 'ideology': ['democratic']}, {'stability': 8}, 'popular_front', 365, once=True, remove=['divided']),
    dec('four_year_plan', 'Plan de quatre ans', 'national', 100, 'Préparer l’économie à la guerre en quatre ans.', {'country': ['GER']}, spirit_id='four_year', once=True),
    dec('westwall', 'Mur de l’Ouest', 'national', 80, 'Fortifier la frontière occidentale.', {'country': ['GER']}, once=True, special={'forts': 8, 'fortLevel': 2, 'facing': ['FRA', 'BEL', 'HOL', 'LUX']}),
    dec('imperial_conference', 'Conférence impériale', 'national', 60, 'Resserrer les liens avec les dominions.', {'country': ['GBR']}, once=True, special={'dominions': True}),
    dec('radar_chain', 'Chaîne de radars côtiers', 'national', 60, 'Un réseau de stations de détection sur la côte.', {'country': ['GBR'], 'tech': 'radar1'}, once=True, special={'radar': 4}),
    dec('five_year_plan', 'Troisième plan quinquennal', 'national', 100, 'Trois combinats civils et trois arsenaux.', {'country': ['SOV']}, once=True, special={'build': {'civ': 3, 'mil': 3}}),
    dec('evacuate_industry', 'Évacuation industrielle vers l’Est', 'national', 80, 'Démonter les usines de l’ouest et les remonter loin du front.', {'country': ['SOV'], 'war': True}, once=True, special={'evacuate': 8}),
    dec('end_isolation', 'Fin de l’isolationnisme', 'national', 100, 'L’opinion accepte l’engagement international.', {'country': ['USA'], 'tension': 50, 'spirit': 'isolation'}, {'support': 15}, once=True, remove=['isolation']),
    dec('arsenal_of_democracy', 'Arsenal des démocraties', 'national', 120, 'Convertir l’industrie civile en arsenal.', {'country': ['USA'], 'tension': 40}, spirit_id='arsenal', once=True),
    dec('mare_nostrum', 'Mare Nostrum', 'national', 80, 'Faire de la Méditerranée une mer italienne.', {'country': ['ITA']}, spirit_id='mare_nostrum', once=True),
    dec('zaibatsu_mobilization', 'Mobilisation des conglomérats', 'national', 80, 'Les zaibatsu construisent trois arsenaux.', {'country': ['JPN']}, once=True, special={'build': {'mil': 3}}),
    dec('integrate_province', 'Rallier un gouverneur provincial', 'national', 120, 'Le gouverneur le mieux disposé accepte l’autorité de Nankin : ses provinces, ses troupes et ses arsenaux rejoignent l’État central.', {'country': ['CHI'], 'warlord': True}, cooldown=240, special={'integrate': True}),
    dec('united_front', 'Front uni', 'national', 60, 'Suspendre la guerre civile face à l’invasion.', {'country': ['CHI'], 'war': True}, {'stability': 10}, 'united_front', once=True, remove=['warlords']),
    dec('supply_road', 'Route d’approvisionnement', 'national', 50, 'Ouvrir une route vers les ports alliés.', {'country': ['CHI'], 'war': True}, spirit_id='burma_road', once=True),
    dec('central_industrial_region', 'Région industrielle centrale', 'national', 80, 'Un pôle industriel à l’abri des frontières.', {'country': ['POL']}, once=True, special={'build': {'civ': 2, 'mil': 2}}),
]

# --- AI profiles and the 1939 order of battle --------------------------------------
R_LAND = ['industry', 'infantry', 'logistics', 'air', 'armor', 'doctrine', 'navy']
# Population in millions around 1936 (colonial empires: metropolis plus a small
# effective share of their colonies). Conscription laws recruit a share of the
# population of the controlled territory.
catalog['population16'] = {
    'FRA': 48, 'GER': 67, 'GBR': 52, 'SOV': 165, 'USA': 128, 'ITA': 43, 'JPN': 75, 'CHI': 380, 'CAN': 11, 'AST': 6.8,
    'NZL': 1.6, 'SAF': 9.6, 'RAJ': 300, 'ETH': 10, 'SPA': 25, 'POR': 7.3, 'BEL': 9, 'HOL': 11.5, 'LUX': .3, 'SWI': 4.2,
    'IRE': 3, 'DEN': 3.7, 'NOR': 2.9, 'SWE': 6.3, 'FIN': 3.7, 'EST': 1.1, 'LAT': 1.95, 'LIT': 2.5, 'POL': 34, 'CZE': 15,
    'AUS': 6.8, 'HUN': 9, 'ROM': 19, 'BUL': 6.2, 'YUG': 15.4, 'GRE': 7, 'ALB': 1, 'TUR': 16.5, 'IRN': 15, 'AFG': 7,
    'IRQ': 3.5, 'SAU': 3, 'YEM': 3, 'OMA': .5, 'SIA': 14, 'NEP': 6, 'BHU': .3, 'MON': .75, 'MAN': 34, 'MEX': 18.5,
    'BRA': 40, 'ARG': 13, 'CHL': 4.7, 'BOL': 3, 'PRU': 7, 'ECU': 2.5, 'COL': 8.7, 'VEN': 3.5, 'URU': 2, 'PAR': 1,
    'PAN': .6, 'COS': .6, 'NIC': 1, 'HON': 1, 'ELS': 1.6, 'GUA': 2.2, 'CUB': 4.2, 'HAI': 3, 'DOM': 1.6, 'LIB': 1.5,
    'PHI': 15, 'EGY': 16, 'DNZ': .4, 'TIB': 3, 'PRC': 1.5, 'SHX': 12, 'GXC': 13, 'YUN': 12, 'XSM': 6, 'SIK': 4, 'ICE': .12,
}

catalog['aiProfiles'] = {
    'default': {'aggression': .2, 'army': 'infantry', 'navy': .1, 'air': .15, 'research': R_LAND},
    'GER': {'aggression': .9, 'army': 'armor', 'navy': .15, 'air': .25, 'research': ['industry', 'armor', 'air', 'infantry', 'doctrine', 'logistics', 'navy']},
    'ITA': {'aggression': .6, 'army': 'infantry', 'navy': .3, 'air': .2, 'research': ['industry', 'infantry', 'navy', 'air', 'armor', 'doctrine', 'logistics']},
    'JPN': {'aggression': .8, 'army': 'infantry', 'navy': .45, 'air': .25, 'research': ['navy', 'air', 'industry', 'infantry', 'doctrine', 'armor', 'logistics']},
    'SOV': {'aggression': .5, 'army': 'mass', 'navy': .05, 'air': .2, 'research': ['industry', 'armor', 'infantry', 'air', 'doctrine', 'logistics', 'navy']},
    'USA': {'aggression': .3, 'army': 'armor', 'navy': .4, 'air': .3, 'research': ['industry', 'air', 'navy', 'armor', 'infantry', 'logistics', 'doctrine']},
    'GBR': {'aggression': .3, 'army': 'infantry', 'navy': .45, 'air': .3, 'research': ['industry', 'navy', 'air', 'infantry', 'logistics', 'armor', 'doctrine']},
    'FRA': {'aggression': .2, 'army': 'firepower', 'navy': .2, 'air': .2, 'research': ['industry', 'infantry', 'armor', 'air', 'doctrine', 'logistics', 'navy']},
    'CHI': {'aggression': .2, 'army': 'mass', 'navy': 0, 'air': .05, 'research': ['industry', 'infantry', 'logistics', 'doctrine', 'air', 'armor', 'navy']},
    'POL': {'aggression': .2, 'army': 'infantry', 'navy': .02, 'air': .1, 'research': R_LAND},
}
OOB_1939 = {
    'GER': {'divisions': 100, 'civ': 36, 'mil': 46, 'air': 1100, 'armor': .14},
    'FRA': {'divisions': 50, 'civ': 34, 'mil': 24, 'air': 600, 'armor': .06},
    'GBR': {'divisions': 30, 'civ': 38, 'mil': 26, 'air': 900, 'armor': .05},
    'POL': {'divisions': 34, 'civ': 15, 'mil': 12, 'air': 200},
    'SOV': {'divisions': 96, 'civ': 48, 'mil': 40, 'air': 1300, 'armor': .1},
    'ITA': {'divisions': 46, 'civ': 22, 'mil': 20, 'air': 500, 'armor': .04},
    'JPN': {'divisions': 56, 'civ': 28, 'mil': 30, 'air': 800, 'armor': .03},
    'CHI': {'divisions': 60, 'civ': 22, 'mil': 12},
    'USA': {'divisions': 26, 'civ': 66, 'mil': 24, 'air': 700, 'armor': .05},
    'ROM': {'divisions': 22}, 'HUN': {'divisions': 14}, 'YUG': {'divisions': 20}, 'FIN': {'divisions': 14}, 'BEL': {'divisions': 16},
    'HOL': {'divisions': 12}, 'TUR': {'divisions': 22}, 'SPA': {'divisions': 24}, 'CAN': {'divisions': 10}, 'RAJ': {'divisions': 24},
}
for b in catalog['bookmarks']:
    if b['id'] == '1939':
        b['oob'] = OOB_1939

CATALOG.write_text(json.dumps(catalog, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
print('catalog keys', sorted(catalog))
