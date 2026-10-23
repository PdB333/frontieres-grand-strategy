#!/usr/bin/env python3
"""Frontieres 1.11 intelligence and occupation (idempotent).

  python3 tools/data/intel_1_11.py

Run after rails_1_10.py. Adds to data/catalog.json the departments of the
intelligence agency, the missions of operatives, the covert operations and
the occupation laws. Names, texts and values are original game content.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

# Departments of the agency. effect keys read by the engine (systems.js,
# "Intelligence"): slots (operatives), skill (starting skill of recruits),
# counter (enemy networks grow slower here), speed (operations), success,
# propaganda, steal (research bonus of stolen plans), cipher (decryption).
catalog['agencyUpgrades'] = [
    {'id': 'foreign_network', 'name': 'Réseaux à l’étranger', 'desc': 'Des correspondants permanents dans les capitales étrangères.', 'cost': 50, 'effect': {'slots': 1}},
    {'id': 'agent_school', 'name': 'École des agents', 'desc': 'Les recrues apprennent le chiffre, la filature et le parachutage.', 'cost': 60, 'effect': {'slots': 1, 'skill': 1}},
    {'id': 'counter_intelligence', 'name': 'Contre-espionnage', 'desc': 'Surveillance des ambassades et des ports, arrestation des agents ennemis.', 'cost': 50, 'effect': {'counter': .4}},
    {'id': 'cipher_bureau', 'name': 'Bureau du chiffre', 'desc': 'Mathématiciens et machines au service du décryptement.', 'cost': 60, 'effect': {'cipher': .3}},
    {'id': 'special_operations', 'name': 'Section des opérations spéciales', 'desc': 'Des équipes entraînées au sabotage et aux coups de main.', 'cost': 60, 'effect': {'speed': .25, 'success': .1}},
    {'id': 'propaganda_office', 'name': 'Bureau de propagande', 'desc': 'Tracts, radios clandestines et rumeurs savamment dosées.', 'cost': 40, 'effect': {'propaganda': .5}},
    {'id': 'technical_lab', 'name': 'Laboratoire technique', 'desc': 'Faussaires, photographes et ingénieurs exploitent les plans dérobés.', 'cost': 40, 'effect': {'steal': .5}},
]

# Daily missions of operatives.
catalog['agentMissions'] = [
    {'id': 'network', 'name': 'Tisser un réseau', 'desc': 'Recrute des informateurs dans le pays visé : le réseau ouvre les opérations et le renseignement militaire.', 'foreign': True},
    {'id': 'counter', 'name': 'Contre-espionnage', 'desc': 'Démantèle les réseaux étrangers sur le territoire national et arrête leurs agents.', 'foreign': False},
    {'id': 'propaganda', 'name': 'Propagande', 'desc': 'Sape la stabilité et le soutien à la guerre du pays visé (réseau de 30 % au moins).', 'foreign': True},
    {'id': 'resistance', 'name': 'Armer la résistance', 'desc': 'Fournit armes et liaisons aux résistants des territoires que le pays visé occupe (réseau de 20 % au moins).', 'foreign': True},
]

# One-off operations: network = network strength required in the target,
# agents = operatives committed, days = base duration, chance = base success.
catalog['operations16'] = [
    {'id': 'sabotage_industry', 'name': 'Sabotage industriel', 'desc': 'Explosifs dans les ateliers : plusieurs sites d’usines militaires sont endommagés.', 'network': 30, 'cost': 40, 'days': 30, 'agents': 1, 'chance': .75},
    {'id': 'sabotage_rail', 'name': 'Sabotage ferroviaire', 'desc': 'Ponts et aiguillages sautent sur les grandes lignes : le ravitaillement de l’ennemi ralentit.', 'network': 30, 'cost': 35, 'days': 25, 'agents': 1, 'chance': .75},
    {'id': 'steal_plans', 'name': 'Vol de plans', 'desc': 'Des plans techniques dérobés accélèrent une recherche que l’ennemi maîtrise déjà.', 'network': 50, 'cost': 50, 'days': 45, 'agents': 1, 'chance': .65},
    {'id': 'capture_cipher', 'name': 'Capture du chiffre', 'desc': 'Une machine et ses tables de codage : pendant quatre mois, ses messages sont lus, ses armées connues et combattues avec avantage (+6 %).', 'network': 60, 'cost': 60, 'days': 60, 'agents': 2, 'chance': .55},
    {'id': 'collaboration', 'name': 'Gouvernement de collaboration', 'desc': 'Des notables acceptent de gouverner sous votre tutelle : la conformité monte et la résistance retombe dans ses territoires que vous occupez.', 'network': 60, 'cost': 80, 'days': 60, 'agents': 2, 'chance': .6},
]

# Occupation laws, from the mildest to the harshest. resistance: daily drift
# of resistance before garrisons; compliance: daily drift; extraction: share
# of the occupied resources and factories put to use; garrison: troops needed
# per occupied province (relative); losses: reprisals and attacks on garrisons.
catalog['occupationLaws'] = [
    {'id': 'autonomy', 'name': 'Gouvernement autonome', 'desc': 'Les autorités locales administrent sous contrôle lointain.', 'resistance': .0, 'compliance': .1, 'extraction': .2, 'garrison': .5, 'losses': 0},
    {'id': 'civil', 'name': 'Administration civile', 'desc': 'Des fonctionnaires civils remplacent l’ancienne administration.', 'resistance': .03, 'compliance': .07, 'extraction': .3, 'garrison': .75, 'losses': 0},
    {'id': 'police', 'name': 'Police d’occupation', 'desc': 'Couvre-feu, contrôles et réquisitions encadrées.', 'resistance': .01, 'compliance': .03, 'extraction': .4, 'garrison': 1, 'losses': .02},
    {'id': 'military', 'name': 'Administration militaire', 'desc': 'L’armée gouverne et prélève ce dont elle a besoin.', 'resistance': -.02, 'compliance': -.01, 'extraction': .5, 'garrison': 1.3, 'losses': .05},
    {'id': 'terror', 'name': 'Régime de terreur', 'desc': 'Otages, déportations et pillage systématique.', 'resistance': .05, 'compliance': -.04, 'extraction': .65, 'garrison': 1.7, 'losses': .08},
]

# Occupation of China: in the 1939 scenario the Japanese army is spread thin
# over the occupied provinces and worn by two years of war.
SPIRIT = {'id': 'china_incident', 'name': 'Enlisement en Chine', 'desc': 'Deux années de guerre en Chine dispersent et usent les divisions japonaises entre garnisons et colonnes de ravitaillement.',
          'effect': {'attack': -.1, 'organization': -.05, 'supply': -.1}, 'c16': True}
catalog['spirits'] = [x for x in catalog['spirits'] if x['id'] != SPIRIT['id']] + [SPIRIT]
start = catalog['startSpirits']['1939'].setdefault('JPN', [])
if SPIRIT['id'] not in start:
    start.append(SPIRIT['id'])

CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('upgrades', len(catalog['agencyUpgrades']), 'operations', len(catalog['operations16']), 'occupation laws', len(catalog['occupationLaws']))
