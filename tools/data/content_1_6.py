#!/usr/bin/env python3
"""Frontieres 1.6 content pass (idempotent).

  python3 tools/data/content_1_6.py

* National focus trees: every tree keeps its 22 original priorities and gains
  a political branch (three or four mutually exclusive regime paths), an
  economic branch, a military research branch and a foreign policy branch.
* Doctrines: four exclusive land doctrines, three naval and three air
  doctrines, plus an electronics domain.
* Dynamic events: conditional events with a mean time to happen.

Run it after catalog_1_6.py, which rewrites the spirit list and AI profiles.
Every name and text is original French writing for Frontieres. Entries carry
"c16": true (or live under keys owned by this script), so a re-run replaces
them instead of duplicating them.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))


def node(fid, name, col, row, days, req=(), effect=None, **extra):
    entry = {'id': fid, 'name': name, 'days': days, 'req': list(req), 'effect': effect or {}, 'col': col, 'row': row,
             'exclusive': extra.pop('exclusive', None), 'c16': True}
    entry.update({k: v for k, v in extra.items() if v is not None})
    return entry


# --- Spirits used by the new content ------------------------------------------------------
def spirit(sid, name, desc, effect):
    return {'id': sid, 'name': name, 'desc': desc, 'effect': effect, 'c16': True}


NEW_SPIRITS = [
    spirit('democratic_resolve', 'Démocratie combative', 'Les libertés publiques deviennent une cause à défendre les armes à la main.',
           {'defense': .05, 'stabilityGrowth': .2, 'supportGrowth': .2}),
    spirit('one_party', 'Parti unique', 'Un seul parti encadre l’administration, la jeunesse et les usines.',
           {'ppGain': .1, 'supportGrowth': .3, 'research': -.02}),
    spirit('revolutionary_army', 'Armée révolutionnaire', 'Commissaires et volontaires remplacent l’ancien corps des officiers.',
           {'recruitment': .15, 'organization': -.05, 'attack': .05}),
    spirit('military_state', 'État militaire', 'L’état-major dirige l’économie et contrôle la vie publique.',
           {'organization': .05, 'planning': .05, 'consumer': -.02, 'stabilityGrowth': -.1}),
    spirit('decrypt', 'Codes ennemis percés', 'Les messages de l’adversaire sont lus avant d’arriver à destination.',
           {'planning': .06, 'attack': .03, 'intel': .1}),
    spirit('black_market', 'Marché noir', 'Une partie de la production disparaît dans les circuits parallèles.',
           {'production': -.03, 'stabilityGrowth': .1}),
    spirit('strikes', 'Vague de grèves', 'Les ateliers débrayent les uns après les autres.',
           {'production': -.05, 'stabilityGrowth': -.1}),
    spirit('war_enthusiasm', 'Élan patriotique', 'Les bureaux de recrutement ne désemplissent pas.',
           {'supportGrowth': .3, 'organization': .02, 'recruitment': .05}),
    spirit('rationing', 'Rationnement', 'Tickets et files d’attente rythment la vie quotidienne.',
           {'consumer': -.02, 'stabilityGrowth': -.1}),
    spirit('women_workforce', 'Main-d’œuvre féminine', 'Les femmes remplacent dans les usines les hommes partis au front.',
           {'production': .04, 'construction': .03}),
    spirit('refugee_scientists', 'Savants réfugiés', 'Des chercheurs chassés de leur pays rejoignent vos laboratoires.',
           {'research': .05}),
    spirit('scandal', 'Gouvernement discrédité', 'Un scandale financier éclabousse les ministres.',
           {'ppGain': -.1, 'stabilityGrowth': -.15}),
]
NEW_SPIRITS += [
    spirit('ethnic_tensions', 'Tensions entre nationalités', 'Le centralisme de la capitale heurte les autres peuples du royaume.',
           {'stabilityGrowth': -.15, 'recruitment': -.05, 'ppGain': -.05}),
    spirit('people_army', 'Armée populaire', 'Les milices sont fondues dans des brigades régulières encadrées par des officiers de carrière.',
           {'organization': .05, 'recruitment': .1, 'defense': .05}),
    spirit('air_training_plan', 'Plan d’entraînement aérien', 'Des dizaines d’écoles forment les équipages de tout le Commonwealth.',
           {'air': .1, 'airDefense': .05}),
    spirit('armed_neutrality', 'Neutralité armée', 'Le pays commerce avec tous mais garde ses frontières sous les armes.',
           {'defense': .05, 'stabilityGrowth': .1, 'ppGain': .05}),
    spirit('kemalist_reforms', 'Réformes kémalistes', 'Écoles, routes et usines d’État transforment un pays agricole.',
           {'research': .03, 'construction': .03, 'stabilityGrowth': .05}),
]
catalog['spirits'] = [s for s in catalog['spirits'] if not s.get('c16')] + NEW_SPIRITS
for scenario, tags in {'1936': {'YUG': 'ethnic_tensions', 'TUR': 'kemalist_reforms'},
                       '1939': {'YUG': 'ethnic_tensions', 'SWE': 'armed_neutrality', 'TUR': 'kemalist_reforms'}}.items():
    for tag, sid in tags.items():
        lst = catalog['startSpirits'].setdefault(scenario, {}).setdefault(tag, [])
        if sid not in lst:
            lst.append(sid)

# --- Focus trees ---------------------------------------------------------------------------
PATH_DEFAULT = {
    'democratic': {
        'names': ['Ouverture démocratique', 'Élections libres', 'Démocratie combative', 'Solidarité des démocraties',
                  'Garanties d’indépendance'],
        'four': {'faction': {'with': ['GBR', 'FRA', 'USA'], 'name': 'Alliés'}, 'relations': {'GBR': 25, 'FRA': 25, 'USA': 25}},
        'five': {'guarantee': 'neighbours', 'effect': {'defense': .05}},
        'spirit': 'democratic_resolve',
    },
    'fascist': {
        'names': ['Mouvement national', 'Prise du pouvoir', 'Parti unique', 'Pacte des régimes nationaux',
                  'Revendications territoriales'],
        'four': {'faction': {'with': ['GER', 'ITA'], 'name': 'Axe'}, 'relations': {'GER': 25, 'ITA': 25}},
        'five': {'claims': 'weakest', 'effect': {'attack': .05, 'tension': 4}},
        'spirit': 'one_party',
    },
    'communist': {
        'names': ['Syndicats révolutionnaires', 'Gouvernement des conseils', 'Armée révolutionnaire',
                  'Rejoindre l’internationale', 'Planification socialiste'],
        'four': {'faction': {'with': ['SOV'], 'name': 'Comintern'}, 'relations': {'SOV': 30}},
        'five': {'spirit': 'plans', 'effect': {'mil': 2}},
        'spirit': 'revolutionary_army',
    },
    'authoritarian': {
        'names': ['Ligue patriotique', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
        'four': {'special': {'forts': 4}, 'effect': {'defense': .05}},
        'five': {'effect': {'resources': .08, 'fuel': 3000}},
        'spirit': 'military_state',
    },
}

# Regime paths per tree (in column order) with country-specific names and effects.
POLITICS = {
    'generic': {'root': 'La question du régime', 'paths': {'democratic': {}, 'fascist': {}, 'communist': {}, 'authoritarian': {}}},
    'FRA': {'root': 'L’avenir de la République', 'paths': {
        'democratic': {'names': ['Défendre la République', 'Rassemblement républicain', 'Démocratie combative',
                                 'Renouveler l’Entente cordiale', 'Garanties à l’Europe centrale'],
                       'four': {'faction': {'with': ['GBR'], 'name': 'Alliés'}, 'relations': {'GBR': 30, 'BEL': 20}},
                       'five': {'guarantee': ['CZE', 'POL', 'BEL', 'HOL', 'ROM', 'YUG'], 'effect': {'defense': .05}}},
        'authoritarian': {'names': ['Ligues et anciens combattants', 'Gouvernement d’autorité', 'État militaire',
                                    'Rapprochement latin', 'Autarcie impériale'],
                          'four': {'relations': {'ITA': 40, 'SPA': 30, 'POR': 30}, 'effect': {'pp': 40}}},
        'communist': {'names': ['Grève générale', 'Commune nationale', 'Armée révolutionnaire', 'Pacte avec Moscou',
                                'Planification socialiste']},
    }},
    'GER': {'root': 'L’emprise du régime', 'paths': {
        'fascist': {'names': ['Discipline du parti', 'Consolider le régime', 'Parti unique', 'Pacte avec Rome',
                              'Revendications à l’Est'],
                    'four': {'faction': {'with': ['ITA'], 'name': 'Axe'}, 'relations': {'ITA': 30, 'JPN': 20}},
                    'five': {'claims': ['CZE', 'POL'], 'effect': {'attack': .05, 'tension': 5}}},
        'authoritarian': {'names': ['Opposition des généraux', 'Gouvernement des généraux', 'État militaire',
                                    'Paix séparée à l’Ouest', 'Autarcie nationale'],
                          'four': {'relations': {'FRA': 40, 'GBR': 40}, 'effect': {'stability': 5}}},
        'democratic': {'names': ['Résistance intérieure', 'Rétablir la république', 'Démocratie combative',
                                 'Réconciliation européenne', 'Garanties d’indépendance'],
                       'four': {'faction': {'with': ['GBR', 'FRA'], 'name': 'Alliés'}, 'relations': {'FRA': 40, 'GBR': 40, 'POL': 30}}},
    }},
    'GBR': {'root': 'Le gouvernement de Sa Majesté', 'paths': {
        'democratic': {'names': ['Gouvernement d’union', 'Cabinet de guerre', 'Démocratie combative', 'Alliance avec la France',
                                 'Garanties continentales'],
                       'four': {'invite': {'list': ['FRA', 'BEL', 'HOL', 'NOR', 'DEN'], 'ideology': True}, 'relations': {'FRA': 30}},
                       'five': {'guarantee': ['POL', 'ROM', 'GRE', 'BEL', 'HOL'], 'effect': {'defense': .05}}},
        'authoritarian': {'names': ['Union impériale', 'Gouvernement d’exception', 'État militaire', 'Préférence impériale',
                                    'Autarcie de l’Empire'],
                          'four': {'relations': {'CAN': 30, 'AST': 30, 'SAF': 30}, 'effect': {'resources': .05}}},
        'fascist': {'names': ['Mouvement national britannique', 'Gouvernement national-impérial', 'Parti unique',
                              'Entente avec Berlin', 'Revendications impériales'],
                    'four': {'relations': {'GER': 40, 'ITA': 30}, 'effect': {'pp': 40}},
                    'five': {'effect': {'attack': .05, 'navy': .05}}},
    }},
    'SOV': {'root': 'La ligne du parti', 'paths': {
        'communist': {'names': ['Autorité du Politburo', 'Constitution nouvelle', 'Armée révolutionnaire', 'Front des partis frères',
                                'Planification socialiste'],
                      'four': {'invite': {'list': ['MON', 'TAN'], 'name': 'Comintern'}, 'relations': {'MON': 30}}},
        'authoritarian': {'names': ['Mécontentement de l’état-major', 'Directoire militaire', 'État militaire',
                                    'Sécurité des frontières', 'Autarcie eurasienne']},
        'democratic': {'names': ['Dégel politique', 'Assemblée constituante', 'Démocratie combative', 'Ouverture vers l’Ouest',
                                 'Garanties d’indépendance'],
                       'four': {'faction': {'with': ['GBR', 'FRA'], 'name': 'Alliés'}, 'relations': {'FRA': 40, 'GBR': 40, 'USA': 30}}},
    }},
    'USA': {'root': 'Le rôle de l’Amérique', 'paths': {
        'democratic': {'names': ['Défense de l’hémisphère', 'Troisième mandat', 'Démocratie combative', 'Soutenir les démocraties',
                                 'Garanties du Pacifique'],
                       'four': {'faction': {'with': ['GBR'], 'name': 'Alliés'}, 'relations': {'GBR': 30, 'FRA': 20, 'CHI': 20},
                                'requires': {'war': True}},
                       'five': {'guarantee': ['PHI', 'MEX', 'CUB'], 'effect': {'defense': .05}}},
        'authoritarian': {'names': ['Comités de vigilance', 'Exécutif d’urgence', 'État militaire', 'Forteresse Amérique',
                                    'Autarcie continentale']},
        'communist': {'names': ['Mouvement ouvrier', 'Gouvernement du travail', 'Armée révolutionnaire',
                                'Solidarité internationale', 'Planification socialiste']},
    }},
    'ITA': {'root': 'Le régime et la Couronne', 'paths': {
        'fascist': {'names': ['Discipline fasciste', 'Corporatisme d’État', 'Parti unique', 'Pacte avec Berlin',
                              'Revendications méditerranéennes'],
                    'four': {'faction': {'with': ['GER'], 'name': 'Axe'}, 'relations': {'GER': 30}},
                    'five': {'claims': ['ALB', 'YUG'], 'effect': {'attack': .05, 'tension': 4}}},
        'authoritarian': {'names': ['Fidélité à la Couronne', 'Gouvernement du roi', 'État militaire', 'Neutralité armée',
                                    'Autarcie nationale']},
        'democratic': {'names': ['Opposition libérale', 'Restaurer le Statut', 'Démocratie combative', 'Rapprochement avec Londres',
                                 'Garanties d’indépendance'],
                       'four': {'faction': {'with': ['GBR', 'FRA'], 'name': 'Alliés'}, 'relations': {'GBR': 30, 'FRA': 30}}},
    }},
    'JPN': {'root': 'L’équilibre du pouvoir', 'paths': {
        'authoritarian': {'names': ['Prééminence de l’armée', 'Cabinet militaire', 'État militaire', 'Sphère de prospérité',
                                    'Revendications continentales'],
                          'four': {'invite': {'list': ['SIA', 'MAN'], 'name': 'Sphère japonaise'}, 'relations': {'SIA': 30}},
                          'five': {'claims': 'weakest', 'effect': {'attack': .05, 'tension': 4}}},
        'democratic': {'names': ['Gouvernement des partis', 'Retour au parlementarisme', 'Démocratie combative', 'Accords navals',
                                 'Détente dans le Pacifique'],
                       'four': {'relations': {'USA': 40, 'GBR': 40}, 'effect': {'pp': 40}},
                       'five': {'effect': {'stability': 8, 'production': .03}}},
        'fascist': {'names': ['Associations nationalistes', 'Gouvernement d’union nationale', 'Parti unique',
                              'Pacte anticommuniste', 'Revendications du Sud'],
                    'four': {'faction': {'with': ['GER', 'ITA'], 'name': 'Axe'}, 'relations': {'GER': 30, 'ITA': 30}}},
    }},
    'CHI': {'root': 'L’unité de la Chine', 'paths': {
        'authoritarian': {'names': ['Gouvernement central renforcé', 'Commission militaire suprême', 'État militaire',
                                    'Front de résistance', 'Reconquête des provinces'],
                          'four': {'relations': {'USA': 30, 'GBR': 20, 'SOV': 20}, 'spirit': 'united_front', 'effect': {}},
                          'five': {'effect': {'defense': .05, 'manpower': 80000}}},
        'democratic': {'names': ['Gouvernement constitutionnel', 'Assemblée nationale', 'Démocratie combative',
                                 'Aide des démocraties', 'Garanties d’indépendance'],
                       'four': {'relations': {'USA': 40, 'GBR': 40}, 'effect': {'rifles': 3000, 'trucks': 300}}},
        'communist': {'names': ['Front uni avec les communistes', 'Gouvernement de coalition populaire', 'Armée révolutionnaire',
                                'Alliance avec Moscou', 'Réforme agraire'],
                      'five': {'effect': {'stability': 8, 'manpower': 120000}}},
    }},
}

ECONOMY_NAMES = {
    'GER': {'c16_synthetic': 'Usines d’hydrogénation', 'c16_roads': 'Réseau autoroutier', 'c16_plan': 'Office du plan'},
    'SOV': {'c16_plan': 'Commission du plan renforcée', 'c16_basin': 'Combinats de l’Oural et de Sibérie', 'c16_survey': 'Expéditions géologiques'},
    'USA': {'c16_power': 'Barrages fédéraux', 'c16_plan': 'Agences fédérales', 'c16_basin': 'Arsenal du Middle West'},
    'JPN': {'c16_survey': 'Ressources de Mandchourie', 'c16_synthetic': 'Carburants de la houille', 'c16_basin': 'Ceinture industrielle'},
    'GBR': {'c16_survey': 'Ressources de l’Empire', 'c16_basin': 'Usines de réserve'},
    'FRA': {'c16_roads': 'Réseau ferré national', 'c16_basin': 'Décentralisation industrielle', 'c16_survey': 'Ressources de l’empire colonial'},
    'ITA': {'c16_survey': 'Bauxite et minerais nationaux', 'c16_power': 'Houille blanche des Alpes'},
    'CHI': {'c16_roads': 'Routes de l’arrière', 'c16_basin': 'Arsenaux de l’intérieur', 'c16_plan': 'Commission des ressources'},
}


def political(tag, start):
    spec = POLITICS[tag]
    paths = list(spec['paths'].items())
    nodes = [node('pol_root', spec['root'], start + (1 if len(paths) == 3 else 1), 0, 35, effect={'pp': 40})]
    firsts = ['pol_%s_1' % ide for ide, _ in paths]
    for i, (ide, custom) in enumerate(paths):
        base = PATH_DEFAULT[ide]
        names = custom.get('names', base['names'])
        col = start + i
        four = dict(base['four'])
        four.update(custom.get('four', {}))
        five = dict(base['five'])
        five.update(custom.get('five', {}))
        others = [f for f in firsts if f != 'pol_%s_1' % ide]
        pid = 'pol_' + ide
        nodes += [
            node(pid + '_1', names[0], col, 1, 35, ['pol_root'], {'pp': 30}, exclusive=others, path=ide, partyShift={ide: 15}),
            node(pid + '_2', names[1], col, 2, 50, [pid + '_1'], {}, path=ide, govern=ide),
            node(pid + '_3', names[2], col, 3, 60, [pid + '_2'], {}, path=ide, spirits=[base['spirit']]),
            node(pid + '_4', names[3], col, 4, 60, [pid + '_3'], four.pop('effect', {}), path=ide, **four),
            node(pid + '_5', names[4], col, 5, 70, [pid + '_4'], five.pop('effect', {}), path=ide,
                 spirits=[five.pop('spirit')] if 'spirit' in five else None, **five),
        ]
    return nodes


def economy(tag, col):
    n = ECONOMY_NAMES.get(tag, {})
    name = lambda fid, default: n.get(fid, default)
    return [
        node('c16_plan', name('c16_plan', 'Commissariat au plan'), col, 0, 45, effect={'construction': .05, 'pp': 25}),
        node('c16_survey', name('c16_survey', 'Prospection des gisements'), col, 1, 50, ['c16_plan'], {'resources': .1}),
        node('c16_roads', name('c16_roads', 'Routes et voies ferrées'), col + 1, 1, 55, ['c16_plan'], special={'infra': 6}),
        node('c16_synthetic', name('c16_synthetic', 'Raffineries synthétiques'), col, 2, 70, ['c16_survey'], {'fuel': 6000},
             special={'refinery': 1}),
        node('c16_power', name('c16_power', 'Électrification'), col + 1, 2, 60, ['c16_roads'], {'civ': 2}),
        node('c16_metals', name('c16_metals', 'Métaux stratégiques'), col, 3, 60, ['c16_synthetic'], {'resources': .05},
             researchBonus=[{'group': 'industry', 'value': .5, 'uses': 2}]),
        node('c16_basin', name('c16_basin', 'Nouveau bassin industriel'), col + 1, 3, 70, ['c16_power'],
             special={'build': {'civ': 2, 'mil': 1}}),
        node('c16_civilian', name('c16_civilian', 'Priorité aux biens civils'), col, 4, 60, ['c16_metals'], {'civ': 3, 'stability': 5},
             exclusive=['c16_armament']),
        node('c16_armament', name('c16_armament', 'Priorité à l’armement'), col + 1, 4, 60, ['c16_basin'], {'mil': 3, 'production': .04},
             exclusive=['c16_civilian']),
        node('c16_labs', name('c16_labs', 'Centres de recherche appliquée'), col, 5, 80, [], {'slots': 1},
             reqAny=['c16_civilian', 'c16_armament']),
        node('c16_reserves', name('c16_reserves', 'Stocks stratégiques'), col + 1, 5, 60, [], {'fuel': 8000, 'supportEq': 500},
             reqAny=['c16_civilian', 'c16_armament']),
    ]


def military(col):
    return [
        node('c16_academy', 'Académie de guerre', col, 0, 45, effect={'xp': 20, 'planning': .03}),
        node('c16_doctrine', 'Réforme doctrinale', col, 1, 50, ['c16_academy'],
             researchBonus=[{'group': 'doctrine', 'value': 1, 'uses': 2}]),
        node('c16_engineers', 'Génie et fortifications', col + 1, 1, 55, ['c16_academy'], {'entrench': .1}, special={'forts': 4}),
        node('c16_armor', 'Bureau d’études des blindés', col, 2, 50, ['c16_doctrine'],
             researchBonus=[{'group': 'armor', 'value': .6, 'uses': 2}]),
        node('c16_infantry', 'Équipement de l’infanterie', col + 1, 2, 50, ['c16_engineers'],
             researchBonus=[{'group': 'infantry', 'value': .6, 'uses': 2}]),
        node('c16_aviation', 'Bureau d’études aéronautiques', col, 3, 50, ['c16_armor'],
             researchBonus=[{'group': 'air', 'value': .6, 'uses': 2}, {'group': 'air_doctrine', 'value': 1, 'uses': 1}]),
        node('c16_naval', 'Bureau d’études navales', col + 1, 3, 50, ['c16_infantry'],
             researchBonus=[{'group': 'navy', 'value': .6, 'uses': 2}, {'group': 'naval_doctrine', 'value': 1, 'uses': 1}]),
        node('c16_signals', 'Transmissions et chiffre', col, 4, 50, ['c16_aviation'], {'planning': .03},
             researchBonus=[{'group': 'electronics', 'value': .6, 'uses': 2}]),
        node('c16_combined', 'Opérations combinées', col + 1, 4, 55, ['c16_naval'], {'invasion': .15, 'paradrop': .1}),
        node('c16_high_command', 'Haut commandement unifié', col, 5, 70, ['c16_signals', 'c16_combined'],
             {'planning': .06, 'organization': .05}),
    ]


def foreign(col):
    return [
        node('c16_ministry', 'Réseau diplomatique', col, 0, 40, effect={'pp': 40, 'intel': .03}),
        node('c16_intelligence', 'Service de renseignement', col, 1, 50, ['c16_ministry'], {'intel': .1}),
        node('c16_attaches', 'Attachés militaires', col, 2, 45, ['c16_intelligence'], {'xp': 10, 'planning': .02}),
        node('c16_trade', 'Accords commerciaux', col, 3, 45, ['c16_attaches'], {'resources': .05, 'pp': 20}),
        node('c16_propaganda', 'Propagande à l’étranger', col, 4, 50, ['c16_trade'], {'ppGain': .05, 'supportGrowth': .1}),
    ]


# --- National trees for secondary powers --------------------------------------------------
# Each tree takes the structure of the generic tree with national names, its
# own regime paths and a branch of national priorities. Names and effects are
# original game content.
BASE_IDS = ['cabinet', 'industry', 'army', 'diplomacy', 'social', 'mobilization', 'research', 'logistics', 'air', 'navy',
            'peace', 'expansion', 'arsenals', 'strategic', 'v1_modern', 'v1_diplomacy', 'v1_supply', 'v1_reserve',
            'v1_shipyards', 'v1_carriers', 'v1_command', 'v1_rebuild']


def u(fid, name, col, row, days, req=(), effect=None, **extra):
    return (fid, name, col, row, days, list(req), effect or {}, extra)


NATIONAL = {
    'POL': {
        'names': ['Gouvernement des colonels', 'Région industrielle centrale', 'Moderniser l’armée', 'Diplomatie de l’équilibre',
                  'Réforme agraire', 'Réserves mobilisables', 'Institut technique de Varsovie', 'Chemins de fer stratégiques',
                  'Aviation polonaise', 'Port de Gdynia', 'Pacte avec les démocraties', 'Puissance régionale', 'Arsenaux de Radom',
                  'Stocks de guerre', 'Plan de modernisation sexennal', 'Entente avec Bucarest', 'Routes vers la Roumanie',
                  'Brigades motorisées', 'Chantiers de Gdynia', 'Défense côtière', 'Commandement unifié', 'Reconstruction nationale'],
        'root': 'L’héritage du maréchal',
        'paths': {'authoritarian': ['Régime des colonels', 'Camp de l’unité nationale', 'État militaire', 'Bloc intermédiaire', 'Autarcie nationale'],
                  'democratic': ['Opposition de Morges', 'Gouvernement d’union', 'Démocratie combative', 'Alliance occidentale', 'Garanties d’indépendance'],
                  'fascist': ['Camp national-radical', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales']},
        'unique': [
            u('pol_intermarium', 'Fédération des mers', 12, 0, 70, (), {'pp': 30}, invite={'list': ['ROM', 'LIT', 'LAT', 'EST', 'HUN'], 'name': 'Intermarium'}),
            u('pol_west_wall', 'Fortifier la frontière occidentale', 12, 1, 60, ['pol_intermarium'], {}, special={'forts': 6, 'facing': ['GER'], 'fortLevel': 2}),
            u('pol_east_wall', 'Couvrir la frontière orientale', 13, 1, 60, ['pol_intermarium'], {}, special={'forts': 5, 'facing': ['SOV']}),
            u('pol_cipher', 'Bureau du chiffre', 12, 2, 70, ['pol_west_wall'], {'intel': .12}, researchBonus={'group': 'electronics', 'value': .8, 'uses': 2}),
            u('pol_cavalry', 'Cavalerie et chars', 13, 2, 60, ['pol_east_wall'], {'tanks': 120}, researchBonus={'group': 'armor', 'value': .6, 'uses': 2}),
            u('pol_warsaw', 'Défendre la capitale', 12, 3, 60, ['pol_cipher', 'pol_cavalry'], {'defense': .05}, special={'aa': 3, 'militia': 2}),
        ],
    },
    'SPA': {
        'names': ['Gouvernement de la République', 'Électrification des Asturies', 'Réformer l’armée', 'Neutralité active',
                  'Réforme agraire', 'Milices de réserve', 'Universités de Madrid', 'Chemins de fer péninsulaires', 'Aviation militaire',
                  'Flotte de Carthagène', 'Société des Nations', 'Ambitions africaines', 'Arsenaux de Tolède', 'Stocks stratégiques',
                  'Plan de reconstruction', 'Amitié ibérique', 'Routes de l’intérieur', 'Brigades mixtes', 'Arsenal du Ferrol',
                  'Défense des Baléares', 'État-major central', 'Reconstruire le pays'],
        'root': 'La crise du régime',
        'paths': {'democratic': ['Front des gauches', 'Majorité républicaine', 'Démocratie combative', 'Appel aux démocraties', 'Garanties d’indépendance'],
                  'fascist': ['Phalange', 'Mouvement national', 'Parti unique', 'Rapprochement avec Rome', 'Revendications africaines'],
                  'communist': ['Comités ouvriers', 'Gouvernement des conseils', 'Armée révolutionnaire', 'Aide de Moscou', 'Collectivisation']},
        'unique': [
            u('spa_mines', 'Mines du Rif et des Asturies', 12, 0, 60, (), {'resources': .1}),
            u('spa_tungsten', 'Wolfram galicien', 12, 1, 50, ['spa_mines'], {'pp': 40}, relations={'GBR': 15, 'GER': 15}),
            u('spa_morocco', 'Armée d’Afrique', 13, 1, 60, ['spa_mines'], {'xp': 20, 'manpower': 30000}),
            u('spa_mountains', 'Défendre les sierras', 12, 2, 60, ['spa_tungsten'], {'defense': .05}, special={'forts': 4}),
            u('spa_gibraltar', 'Question de Gibraltar', 13, 2, 70, ['spa_morocco'], {'tension': 3}, claims=['GBR'], requires={'ideology': ['fascist']}),
            u('spa_neutral', 'Neutralité armée', 12, 3, 60, ['spa_mountains'], {'stability': 8, 'defense': .03}, requires={'peace': True}),
        ],
    },
    'ROM': {
        'names': ['Gouvernement royal', 'Industries de Ploiești', 'Réorganiser l’armée', 'Petite Entente', 'Réforme rurale',
                  'Réserves territoriales', 'Écoles polytechniques', 'Chemins de fer des Carpates', 'Aviation royale', 'Flotte du Danube',
                  'Entente balkanique', 'Grande Roumanie', 'Arsenaux de Reșița', 'Réserves de pétrole', 'Plan d’armement décennal',
                  'Alliance avec Varsovie', 'Routes de Moldavie', 'Divisions de montagne', 'Chantiers de Galați', 'Défense de Constanța',
                  'Haut commandement', 'Reconstruction'],
        'root': 'Le roi et les partis',
        'paths': {'authoritarian': ['Dictature royale', 'Front de la renaissance nationale', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'fascist': ['Légion', 'État national-légionnaire', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales'],
                  'democratic': ['Parti national-paysan', 'Élections libres', 'Démocratie combative', 'Fidélité à l’Entente', 'Garanties d’indépendance']},
        'unique': [
            u('rom_oil', 'Moderniser Ploiești', 12, 0, 60, (), {'fuel': 8000, 'resources': .08}, special={'refinery': 1}),
            u('rom_carpathians', 'Ligne des Carpates', 12, 1, 60, ['rom_oil'], {}, special={'forts': 5}),
            u('rom_oil_export', 'Pétrole contre armes', 13, 1, 50, ['rom_oil'], {'rifles': 3000, 'artillery': 300}),
            u('rom_bessarabia', 'Défendre la Bessarabie', 12, 2, 60, ['rom_carpathians'], {}, special={'forts': 4, 'facing': ['SOV']}),
            u('rom_mountain', 'Chasseurs de montagne', 13, 2, 60, ['rom_oil_export'], {'attack': .03}, researchBonus={'group': 'infantry', 'value': .6, 'uses': 2}),
            u('rom_navy', 'Escadrille de la mer Noire', 12, 3, 60, ['rom_bessarabia'], {'destroyers': 2, 'submarines': 1}),
        ],
    },
    'CZE': {
        'names': ['Gouvernement de Prague', 'Industries de Bohême', 'Armée tchécoslovaque', 'Petite Entente', 'Compromis national',
                  'Réservistes', 'Instituts techniques', 'Chemins de fer de Moravie', 'Aviation militaire', 'Flottille du Danube',
                  'Alliance française', 'Fermeté face à Berlin', 'Usines Škoda', 'Stocks d’armement', 'Programme d’armement',
                  'Pacte avec Moscou', 'Routes de Slovaquie', 'Divisions rapides', 'Chantiers de Bratislava', 'Défense des cols',
                  'État-major central', 'Reconstruction'],
        'root': 'L’héritage de la Première République',
        'paths': {'democratic': ['Défendre la république', 'Gouvernement d’union', 'Démocratie combative', 'Alliance avec la France', 'Garanties d’indépendance'],
                  'authoritarian': ['Parti de l’unité nationale', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'communist': ['Syndicats ouvriers', 'Gouvernement des conseils', 'Armée révolutionnaire', 'Pacte avec Moscou', 'Planification socialiste']},
        'unique': [
            u('cze_bunkers', 'Ligne de casemates', 12, 0, 70, (), {}, special={'forts': 8, 'facing': ['GER', 'AUS', 'HUN'], 'fortLevel': 2}),
            u('cze_skoda', 'Expansion des usines Škoda', 13, 0, 70, (), {'mil': 2}, researchBonus={'group': 'armor', 'value': .5, 'uses': 2}),
            u('cze_lt38', 'Char léger national', 13, 1, 60, ['cze_skoda'], {'lightTanks': 150}),
            u('cze_defend', 'Défendre la Bohême', 12, 1, 60, ['cze_bunkers'], {'defense': .05}, spirits=['national_redoubt']),
            u('cze_allies', 'Appel aux garants', 12, 2, 50, ['cze_defend'], {'pp': 40}, relations={'FRA': 30, 'SOV': 30, 'GBR': 20}),
            u('cze_export', 'Exportations d’armes', 13, 2, 50, ['cze_lt38'], {'pp': 50, 'rifles': 2000}),
        ],
    },
    'TUR': {
        'names': ['Héritage kémaliste', 'Plan quinquennal turc', 'Réformer l’armée', 'Diplomatie de l’équilibre', 'Réformes sociales',
                  'Réservistes d’Anatolie', 'Université d’Istanbul', 'Chemins de fer d’Anatolie', 'Aviation turque', 'Flotte des détroits',
                  'Pacte balkanique', 'Revendications du Hatay', 'Arsenaux de Kırıkkale', 'Stocks stratégiques', 'Programme de modernisation',
                  'Pacte de Saadabad', 'Routes de l’Est', 'Divisions de cavalerie', 'Chantiers de Gölcük', 'Défense des Dardanelles',
                  'État-major général', 'Développement national'],
        'root': 'La république et ses six flèches',
        'paths': {'authoritarian': ['Parti républicain du peuple', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'democratic': ['Multipartisme', 'Élections libres', 'Démocratie combative', 'Rapprochement occidental', 'Garanties d’indépendance'],
                  'fascist': ['Mouvement panturc', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales']},
        'unique': [
            u('tur_straits', 'Remilitariser les détroits', 12, 0, 60, (), {'pp': 30}, special={'coastal': 4, 'forts': 2}),
            u('tur_chrome', 'Chrome d’Anatolie', 13, 0, 50, (), {'resources': .1}),
            u('tur_hatay', 'Question du Hatay', 12, 1, 60, ['tur_straits'], {'tension': 2}, claims=['FRA'], requires={'tension': 40}),
            u('tur_neutral', 'Neutralité active', 13, 1, 60, ['tur_chrome'], {'stability': 8, 'pp': 40}, requires={'peace': True}),
            u('tur_east', 'Développer l’Anatolie orientale', 13, 2, 70, ['tur_neutral'], {'civ': 2}, special={'infra': 5}),
            u('tur_village', 'Instituts de village', 12, 2, 60, ['tur_hatay'], {'research': .05, 'stability': 5}),
        ],
    },
    'YUG': {
        'names': ['Gouvernement royal', 'Industrialiser la Serbie', 'Armée royale', 'Petite Entente', 'Accord serbo-croate',
                  'Réserves mobilisables', 'Instituts de Belgrade', 'Chemins de fer des Balkans', 'Aviation royale', 'Flotte adriatique',
                  'Entente balkanique', 'Ambitions balkaniques', 'Arsenaux de Kragujevac', 'Stocks stratégiques', 'Plan d’armement',
                  'Rapprochement avec Paris', 'Routes de Bosnie', 'Divisions de montagne', 'Chantiers de Split', 'Défense de la côte',
                  'État-major royal', 'Reconstruction'],
        'root': 'La couronne et les nations',
        'paths': {'authoritarian': ['Régence royale', 'Gouvernement d’autorité', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'democratic': ['Accord national', 'Élections libres', 'Démocratie combative', 'Alliance occidentale', 'Garanties d’indépendance'],
                  'communist': ['Partisans ouvriers', 'Gouvernement des conseils', 'Armée révolutionnaire', 'Pacte avec Moscou', 'Planification socialiste']},
        'unique': [
            u('yug_sporazum', 'Autonomie croate', 12, 0, 60, (), {'stability': 12}, removeSpirits=['ethnic_tensions']),
            u('yug_bauxite', 'Bauxite et cuivre', 13, 0, 50, (), {'resources': .1}),
            u('yug_mountains', 'Réduit des montagnes', 12, 1, 60, ['yug_sporazum'], {'defense': .05}, special={'forts': 4}),
            u('yug_partisan', 'Préparer la guérilla', 12, 2, 60, ['yug_mountains'], {'attrition': .2}, special={'militia': 2}),
            u('yug_mining', 'Combinat de Bor', 13, 1, 60, ['yug_bauxite'], {'mil': 1, 'resources': .05}),
            u('yug_adriatic', 'Défense de l’Adriatique', 13, 2, 50, ['yug_mining'], {}, special={'coastal': 3}),
        ],
    },
    'HUN': {
        'names': ['Régence de l’amiral', 'Programme de Győr', 'Honvéd moderne', 'Révisionnisme diplomatique', 'Réforme agraire',
                  'Réserves du Honvéd', 'Université technique', 'Chemins de fer de la plaine', 'Aviation hongroise', 'Flottille du Danube',
                  'Prudence diplomatique', 'Réviser Trianon', 'Arsenaux de Csepel', 'Bauxite stratégique', 'Plan d’armement de Győr',
                  'Amitié avec Rome', 'Routes de Transylvanie', 'Divisions rapides', 'Chantiers de Budapest', 'Défense du Danube',
                  'État-major du Honvéd', 'Reconstruction'],
        'root': 'Un royaume sans roi',
        'paths': {'authoritarian': ['Parti de l’unité', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'fascist': ['Croix fléchées', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales'],
                  'democratic': ['Opposition libérale', 'Élections libres', 'Démocratie combative', 'Rapprochement occidental', 'Garanties d’indépendance']},
        'unique': [
            u('hun_gyor', 'Programme de réarmement', 12, 0, 70, (), {'mil': 2, 'rifles': 2000}),
            u('hun_bauxite', 'Bauxite hongroise', 13, 0, 50, (), {'resources': .1}),
            u('hun_trianon', 'Revendications de Trianon', 12, 1, 60, ['hun_gyor'], {'tension': 3}, claims=['CZE', 'ROM'], requires={'tension': 35}),
            u('hun_tanks', 'Char national', 13, 1, 60, ['hun_bauxite'], {'lightTanks': 80}, researchBonus={'group': 'armor', 'value': .5, 'uses': 1}),
            u('hun_hussars', 'Tradition des hussards', 12, 2, 50, ['hun_trianon'], {'xp': 15, 'attack': .03}),
            u('hun_danube', 'Ligne du Danube', 13, 2, 50, ['hun_tanks'], {}, special={'forts': 3}),
        ],
    },
    'HOL': {
        'names': ['Gouvernement de coalition', 'Industrie de Rotterdam', 'Moderniser l’armée', 'Neutralité néerlandaise', 'Compromis social',
                  'Réserves territoriales', 'Université de Delft', 'Canaux et voies ferrées', 'Aviation militaire', 'Flotte des Indes',
                  'Neutralité stricte', 'Engagement occidental', 'Arsenaux de Hembrug', 'Pétrole des Indes', 'Plan de défense',
                  'Coopération avec Londres', 'Ravitaillement des Indes', 'Divisions légères', 'Chantiers de Rotterdam', 'Aviation navale des Indes',
                  'Commandement interarmes', 'Reconstruction'],
        'root': 'Le royaume et ses colonies',
        'paths': {'democratic': ['Défendre la démocratie', 'Cabinet d’union', 'Démocratie combative', 'Coopération avec Londres', 'Garanties d’indépendance'],
                  'fascist': ['Mouvement national-socialiste', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales'],
                  'authoritarian': ['Ligue nationale', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale']},
        'unique': [
            u('hol_water', 'Ligne d’eau hollandaise', 12, 0, 60, (), {'defense': .05}, special={'forts': 4, 'fortLevel': 2}),
            u('hol_indies_oil', 'Pétrole de Sumatra', 13, 0, 60, (), {'fuel': 10000, 'resources': .08}),
            u('hol_fortress', 'Forteresse Hollande', 12, 1, 60, ['hol_water'], {'entrench': .1}, spirits=['national_redoubt']),
            u('hol_indies_navy', 'Flotte des Indes orientales', 13, 1, 70, ['hol_indies_oil'], {'cruisers': 1, 'destroyers': 3, 'submarines': 2}),
            u('hol_indies_army', 'Armée royale des Indes', 13, 2, 60, ['hol_indies_navy'], {'manpower': 30000}, special={'coastal': 3}),
            u('hol_exile', 'Gouvernement de réserve', 12, 2, 50, ['hol_fortress'], {'stability': 6, 'surrender': .05}),
        ],
    },
    'BEL': {
        'names': ['Gouvernement d’union', 'Industrie wallonne', 'Moderniser l’armée', 'Politique d’indépendance', 'Concertation sociale',
                  'Réserves mobilisables', 'Université de Louvain', 'Chemins de fer belges', 'Aéronautique militaire', 'Port d’Anvers',
                  'Neutralité armée', 'Accords avec la France', 'Arsenal de Herstal', 'Cuivre du Katanga', 'Plan de défense',
                  'Coopération franco-britannique', 'Routes du Congo', 'Chasseurs ardennais', 'Chantiers d’Anvers', 'Défense côtière',
                  'État-major', 'Reconstruction'],
        'root': 'Le roi et la neutralité',
        'paths': {'democratic': ['Défendre la constitution', 'Cabinet d’union', 'Démocratie combative', 'Retour aux alliances', 'Garanties d’indépendance'],
                  'fascist': ['Mouvement rexiste', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales'],
                  'authoritarian': ['Pouvoir royal', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale']},
        'unique': [
            u('bel_forts', 'Forts de la Meuse', 12, 0, 70, (), {}, special={'forts': 4, 'facing': ['GER'], 'fortLevel': 2}),
            u('bel_congo', 'Ressources du Congo', 13, 0, 60, (), {'resources': .1}),
            u('bel_kw', 'Ligne de défense', 12, 1, 60, ['bel_forts'], {'entrench': .1, 'defense': .03}),
            u('bel_ardennes', 'Chasseurs ardennais', 13, 1, 50, ['bel_congo'], {'attrition': .15, 'xp': 10}),
            u('bel_uranium', 'Uranium du Katanga', 13, 2, 60, ['bel_ardennes'], {'pp': 30}, researchBonus={'group': 'electronics', 'value': .5, 'uses': 1}),
            u('bel_neutral', 'Neutralité garantie', 12, 2, 50, ['bel_kw'], {'stability': 6}, relations={'FRA': 15, 'GBR': 15}),
        ],
    },
    'SWE': {
        'names': ['Gouvernement social-démocrate', 'Industrie suédoise', 'Défense nationale', 'Neutralité scandinave', 'Modèle suédois',
                  'Réserves territoriales', 'Institut royal de technologie', 'Chemins de fer du Norrland', 'Aviation suédoise', 'Flotte côtière',
                  'Neutralité stricte', 'Solidarité nordique', 'Usines Bofors', 'Minerai de Kiruna', 'Plan de défense de 1936',
                  'Coopération nordique', 'Routes du Norrland', 'Brigades d’hiver', 'Chantiers de Karlskrona', 'Défense côtière',
                  'Commandement suprême', 'Reconstruction'],
        'root': 'La maison du peuple',
        'paths': {'democratic': ['Maison du peuple', 'Gouvernement d’union', 'Démocratie combative', 'Coopération nordique', 'Garanties d’indépendance'],
                  'authoritarian': ['Mouvement paysan', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'fascist': ['Union nationale', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales']},
        'unique': [
            u('swe_ore', 'Minerai de fer de Kiruna', 12, 0, 50, (), {'resources': .12}),
            u('swe_bofors', 'Canons Bofors', 13, 0, 60, (), {'antiAir': 300, 'artillery': 300}, researchBonus={'group': 'infantry', 'value': .5, 'uses': 1}),
            u('swe_neutral', 'Neutralité armée', 12, 1, 60, ['swe_ore'], {'stability': 6, 'defense': .05}),
            u('swe_trade', 'Commerce avec les belligérants', 12, 2, 50, ['swe_neutral'], {'pp': 50}, requires={'tension': 40}),
            u('swe_volunteers', 'Volontaires pour la Finlande', 13, 1, 50, ['swe_bofors'], {'rifles': -1500}, relations={'FIN': 40}),
            u('swe_air', 'Défense aérienne du Sud', 13, 2, 50, ['swe_volunteers'], {'airDefense': .15}, special={'aa': 3}),
        ],
    },
    'FIN': {
        'names': ['Gouvernement national', 'Industrie forestière', 'Armée finlandaise', 'Orientation scandinave', 'Réconciliation nationale',
                  'Garde civique', 'Université d’Helsinki', 'Routes de Carélie', 'Aviation finlandaise', 'Défense du golfe',
                  'Neutralité nordique', 'Grande Finlande', 'Arsenaux de Tampere', 'Stocks de guerre', 'Programme de défense',
                  'Coopération avec Stockholm', 'Routes de Laponie', 'Bataillons de skieurs', 'Chantiers de Turku', 'Défense des îles',
                  'Quartier général', 'Reconstruction'],
        'root': 'Une jeune république',
        'paths': {'democratic': ['Défendre la république', 'Gouvernement d’union', 'Démocratie combative', 'Coopération nordique', 'Garanties d’indépendance'],
                  'authoritarian': ['Mouvement de Lapua', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'fascist': ['Mouvement patriotique', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales']},
        'unique': [
            u('fin_line', 'Ligne fortifiée de l’isthme', 12, 0, 70, (), {}, special={'forts': 4, 'facing': ['SOV'], 'fortLevel': 2}),
            u('fin_skis', 'Guerre d’hiver', 13, 0, 60, (), {'attrition': .2, 'xp': 15}),
            u('fin_motti', 'Tactique des encerclements', 13, 1, 60, ['fin_skis'], {'attack': .05, 'breakthrough': .05}),
            u('fin_civic', 'Garde civique', 12, 1, 50, ['fin_line'], {'manpower': 25000}, special={'militia': 2}),
            u('fin_nordic', 'Solidarité nordique', 12, 2, 50, ['fin_civic'], {'pp': 30}, relations={'SWE': 30, 'NOR': 20}),
            u('fin_lotta', 'Auxiliaires féminines', 13, 2, 50, ['fin_motti'], {'production': .03, 'stability': 5}),
        ],
    },
    'CAN': {
        'names': ['Gouvernement fédéral', 'Industries de l’Ontario', 'Milice permanente', 'Statut de Westminster', 'Relance de l’emploi',
                  'Réserves de la milice', 'Conseil national de recherches', 'Chemins de fer transcontinentaux', 'Aviation royale canadienne',
                  'Marine royale canadienne', 'Autonomie nationale', 'Engagement impérial', 'Arsenaux de Montréal', 'Ressources du Bouclier',
                  'Programme de guerre', 'Coopération avec Washington', 'Routes de l’Atlantique', 'Divisions canadiennes', 'Chantiers d’Halifax',
                  'Escorte des convois', 'Quartier général outre-mer', 'Reconstruction'],
        'root': 'Un dominion souverain',
        'paths': {'democratic': ['Libéraux et conservateurs', 'Union nationale', 'Démocratie combative', 'Fidélité au Commonwealth', 'Garanties d’indépendance'],
                  'authoritarian': ['Union nationale du Québec', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'communist': ['Mouvement ouvrier', 'Gouvernement du travail', 'Armée révolutionnaire', 'Solidarité internationale', 'Planification socialiste']},
        'unique': [
            u('can_training', 'Plan d’entraînement aérien', 12, 0, 70, (), {'air': .08}, researchBonus={'group': 'air', 'value': .5, 'uses': 2}),
            u('can_nickel', 'Nickel et aluminium', 13, 0, 60, (), {'resources': .12}),
            u('can_convoys', 'Escorte de l’Atlantique', 12, 1, 60, ['can_training'], {'convoy': .15, 'destroyers': 4, 'convoys': 40}),
            u('can_arsenal', 'Arsenal du Commonwealth', 13, 1, 70, ['can_nickel'], {'mil': 2, 'civ': 2}),
            u('can_mutual', 'Aide mutuelle', 13, 2, 50, ['can_arsenal'], {'pp': 40}, relations={'GBR': 25, 'USA': 25}),
            u('can_army', 'Armée canadienne outre-mer', 12, 2, 60, ['can_convoys'], {'xp': 15, 'manpower': 40000}),
        ],
    },
    'AST': {
        'names': ['Gouvernement fédéral', 'Industries de Nouvelle-Galles', 'Forces citoyennes', 'Statut de Westminster', 'Relance de l’emploi',
                  'Milice territoriale', 'Conseil scientifique', 'Chemins de fer transcontinentaux', 'Aviation royale australienne',
                  'Marine royale australienne', 'Défense du Pacifique', 'Engagement impérial', 'Usines de Lithgow', 'Ressources du continent',
                  'Programme de défense', 'Rapprochement avec Washington', 'Routes du Nord', 'Divisions du désert', 'Chantiers de Sydney',
                  'Défense de Darwin', 'Quartier général', 'Reconstruction'],
        'root': 'Un continent à défendre',
        'paths': {'democratic': ['Travaillistes et unionistes', 'Union nationale', 'Démocratie combative', 'Fidélité au Commonwealth', 'Garanties d’indépendance'],
                  'authoritarian': ['Ligue nationale', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'communist': ['Syndicats de mineurs', 'Gouvernement du travail', 'Armée révolutionnaire', 'Solidarité internationale', 'Planification socialiste']},
        'unique': [
            u('ast_bhp', 'Aciéries de Newcastle', 12, 0, 60, (), {'civ': 2, 'resources': .08}),
            u('ast_darwin', 'Fortifier Darwin', 13, 0, 60, (), {}, special={'coastal': 3, 'aa': 2}),
            u('ast_aircraft', 'Usines aéronautiques', 12, 1, 60, ['ast_bhp'], {'fighters': 80}, researchBonus={'group': 'air', 'value': .5, 'uses': 1}),
            u('ast_desert', 'Divisions du désert', 13, 1, 50, ['ast_darwin'], {'xp': 15, 'attrition': .1}),
            u('ast_usa', 'Se tourner vers l’Amérique', 13, 2, 50, ['ast_desert'], {'pp': 40}, relations={'USA': 40}, requires={'tension': 50}),
            u('ast_jungle', 'Guerre dans la jungle', 12, 2, 60, ['ast_aircraft'], {'attrition': .15, 'defense': .03}),
        ],
    },
    'RAJ': {
        'names': ['Gouvernement de l’Inde', 'Industries de Bombay', 'Armée des Indes', 'Diplomatie impériale', 'Réformes provinciales',
                  'Recrutement volontaire', 'Institut des sciences de Bangalore', 'Chemins de fer des Indes', 'Aviation indienne',
                  'Marine royale indienne', 'Autonomie provinciale', 'Engagement impérial', 'Arsenaux de Kanpur', 'Ressources de l’Inde',
                  'Programme de guerre', 'Coopération avec Londres', 'Routes de Birmanie', 'Divisions indiennes', 'Chantiers de Bombay',
                  'Défense du golfe du Bengale', 'Commandement de l’Inde', 'Reconstruction'],
        'root': 'Le chemin de l’autonomie',
        'paths': {'democratic': ['Congrès national', 'Gouvernements provinciaux', 'Démocratie combative', 'Fidélité au Commonwealth', 'Garanties d’indépendance'],
                  'authoritarian': ['Princes et notables', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'communist': ['Mouvement paysan', 'Gouvernement des conseils', 'Armée révolutionnaire', 'Solidarité internationale', 'Réforme agraire']},
        'unique': [
            u('raj_volunteers', 'Plus grande armée de volontaires', 12, 0, 70, (), {'manpower': 150000}),
            u('raj_tata', 'Aciéries de Jamshedpur', 13, 0, 60, (), {'civ': 2, 'mil': 1}),
            u('raj_burma', 'Défendre la Birmanie', 12, 1, 60, ['raj_volunteers'], {}, special={'forts': 3}),
            u('raj_mountain', 'Frontière du Nord-Ouest', 13, 1, 50, ['raj_tata'], {'xp': 15, 'attrition': .1}),
            u('raj_congress', 'Négocier avec le Congrès', 12, 2, 60, ['raj_burma'], {'stability': 10}, partyShift={'democratic': 10}),
            u('raj_jungle', 'Divisions de jungle', 13, 2, 60, ['raj_mountain'], {'attrition': .15}, researchBonus={'group': 'infantry', 'value': .5, 'uses': 1}),
        ],
    },
    'BRA': {
        'names': ['Estado Novo', 'Industrie de São Paulo', 'Armée brésilienne', 'Bon voisinage', 'Lois du travail', 'Réserves nationales',
                  'Instituts de recherche', 'Chemins de fer de l’intérieur', 'Aviation brésilienne', 'Escadre du Brésil', 'Neutralité continentale',
                  'Puissance sud-américaine', 'Arsenaux de Rio', 'Caoutchouc d’Amazonie', 'Plan d’équipement', 'Accords avec Washington',
                  'Routes de l’Amazonie', 'Divisions expéditionnaires', 'Chantiers de Rio', 'Défense du Nordeste', 'État-major', 'Développement national'],
        'root': 'L’État nouveau',
        'paths': {'authoritarian': ['État nouveau', 'Gouvernement fort', 'État militaire', 'Neutralité armée', 'Autarcie nationale'],
                  'democratic': ['Opposition libérale', 'Élections libres', 'Démocratie combative', 'Solidarité panaméricaine', 'Garanties d’indépendance'],
                  'fascist': ['Mouvement intégraliste', 'Prise du pouvoir', 'Parti unique', 'Pacte avec Berlin', 'Revendications territoriales']},
        'unique': [
            u('bra_volta', 'Aciéries de Volta Redonda', 12, 0, 70, (), {'civ': 2, 'mil': 1}),
            u('bra_rubber', 'Caoutchouc d’Amazonie', 13, 0, 50, (), {'resources': .12}),
            u('bra_bases', 'Bases contre aide', 12, 1, 60, ['bra_volta'], {'pp': 40, 'trucks': 400}, relations={'USA': 40}, requires={'tension': 50}),
            u('bra_feb', 'Corps expéditionnaire', 12, 2, 60, ['bra_bases'], {'xp': 20, 'manpower': 40000}),
            u('bra_northeast', 'Défendre le Nordeste', 13, 1, 50, ['bra_rubber'], {}, special={'coastal': 3, 'aa': 2}),
            u('bra_interior', 'Marche vers l’Ouest', 13, 2, 60, ['bra_northeast'], {'stability': 5}, special={'infra': 5}),
        ],
    },
}

generic_base = [f for f in catalog['focus']['generic'] if not f.get('c16')]
assert [f['id'] for f in generic_base] == BASE_IDS, [f['id'] for f in generic_base]
for tag, spec in NATIONAL.items():
    assert len(spec['names']) == len(BASE_IDS), tag
    nodes = []
    for f, name in zip(generic_base, spec['names']):
        g = json.loads(json.dumps(f))
        g['name'] = name
        nodes.append(g)
    catalog['focus'][tag] = nodes
    paths = {}
    for ide, names in spec['paths'].items():
        paths[ide] = {'names': names}
    POLITICS[tag] = {'root': spec['root'], 'paths': paths}

for tag, tree in catalog['focus'].items():
    base = [f for f in tree if not f.get('c16')]
    width = len(POLITICS[tag]['paths'])
    col = 4
    added = political(tag, col)
    col += width
    added += economy(tag, col)
    col += 2
    added += military(col)
    col += 2
    added += foreign(col)
    for fid, name, ucol, row, days, req, effect, extra in NATIONAL.get(tag, {}).get('unique', []):
        added.append(node(fid, name, col + 1 + ucol - 12, row, days, req, effect, national=True, **extra))
    cells = [(f['col'], f['row']) for f in base + added]
    assert len(cells) == len(set(cells)), (tag, sorted(c for c in cells if cells.count(c) > 1))
    ids = {f['id'] for f in base}
    for f in added:
        assert f['id'] not in ids, (tag, f['id'])
        ids.add(f['id'])
    for f in added:
        for r in f['req'] + f.get('reqAny', []) + (f['exclusive'] if isinstance(f['exclusive'], list) else []):
            assert r in ids, (tag, f['id'], r)
    catalog['focus'][tag] = base + added

# --- Doctrines and electronics --------------------------------------------------------------
def tech(tid, name, group, year, days, req=(), effect=None, excl=None, ai=None):
    entry = {'id': tid, 'name': name, 'group': group, 'year': year, 'days': days, 'req': list(req), 'effect': effect or {},
             'unlock': [], 'c16': True}
    if excl:
        entry['excl'] = excl
    if ai:
        entry['ai'] = ai
    return entry


def branch(prefix, group, levels, roots, ai):
    out = []
    for i, (name, year, days, effect) in enumerate(levels):
        tid = '%s%d' % (prefix, i + 1)
        out.append(tech(tid, name, group, year, days, ['%s%d' % (prefix, i)] if i else [], effect,
                        [r for r in roots if r != tid] if i == 0 else None, ai if i == 0 else None))
    return out


LAND_ROOTS = ['ld_mobile1', 'ld_fire1', 'ld_method1', 'ld_mass1']
NAVAL_ROOTS = ['nd_line1', 'nd_raid1', 'nd_carrier1']
AIR_ROOTS = ['ad_strat1', 'ad_cas1', 'ad_sup1']
CONTENT_TECHS = (
    branch('ld_mobile', 'doctrine', [
        ('Manœuvre motorisée', 1936, 100, {'speed': .05, 'breakthrough': .05}),
        ('Percées concentrées', 1938, 130, {'breakthrough': .08, 'armor': .04}),
        ('Exploitation en profondeur', 1940, 160, {'speed': .06, 'organization': .04}),
        ('Encerclements rapides', 1942, 190, {'attack': .06, 'breakthrough': .06}),
    ], LAND_ROOTS, ['armor', 'GER'])
    + branch('ld_fire', 'doctrine', [
        ('Bataille de matériel', 1936, 100, {'attack': .05, 'piercing': .03}),
        ('Barrages roulants', 1938, 130, {'attack': .06}),
        ('Feux coordonnés', 1940, 160, {'attack': .05, 'defense': .04}),
        ('Logistique d’abondance', 1942, 190, {'supply': .1, 'attack': .04}),
    ], LAND_ROOTS, ['firepower', 'USA', 'GBR'])
    + branch('ld_method', 'doctrine', [
        ('Bataille conduite', 1936, 100, {'planning': .1, 'defense': .04}),
        ('Fronts continus', 1938, 130, {'entrench': .15, 'defense': .04}),
        ('Préparation méthodique', 1940, 160, {'planning': .1, 'attack': .03}),
        ('Offensive planifiée', 1942, 190, {'organization': .05, 'attack': .05}),
    ], LAND_ROOTS, ['infantry', 'FRA', 'default'])
    + branch('ld_mass', 'doctrine', [
        ('Nation en armes', 1936, 100, {'recruitment': .1, 'organization': .03}),
        ('Vagues d’assaut', 1938, 130, {'attack': .05, 'recruitment': .05}),
        ('Guérilla et partisans', 1940, 160, {'attrition': .2, 'defense': .04}),
        ('Espace contre le temps', 1942, 190, {'surrender': .1, 'supply': .06}),
    ], LAND_ROOTS, ['mass', 'SOV', 'CHI'])
    + branch('nd_line', 'naval_doctrine', [
        ('Flotte de ligne', 1936, 100, {'navy': .06}),
        ('Escadres de bataille', 1938, 130, {'navy': .06, 'naval': .04}),
        ('Bataille décisive', 1940, 160, {'navy': .08}),
    ], NAVAL_ROOTS, ['GBR', 'USA', 'FRA', 'default'])
    + branch('nd_raid', 'naval_doctrine', [
        ('Guerre de course', 1936, 100, {'raiding': .12}),
        ('Meutes sous-marines', 1938, 130, {'raiding': .12, 'mines': .1}),
        ('Blocus total', 1940, 160, {'raiding': .15}),
    ], NAVAL_ROOTS, ['GER', 'ITA', 'SOV'])
    + branch('nd_carrier', 'naval_doctrine', [
        ('Puissance aéronavale', 1936, 100, {'naval': .08}),
        ('Groupes de porte-avions', 1938, 130, {'naval': .08, 'air': .03}),
        ('Frappes à longue portée', 1940, 160, {'naval': .1, 'bombing': .04}),
    ], NAVAL_ROOTS, ['JPN'])
    + [tech('nd_convoy', 'Escorte des convois', 'naval_doctrine', 1937, 110, [], {'convoy': .2}),
       tech('nd_mines', 'Guerre des mines', 'naval_doctrine', 1937, 110, [], {'mines': .2}),
       tech('nd_landing', 'Débarquements de vive force', 'naval_doctrine', 1939, 130, ['amphibious'], {'invasion': .15})]
    + branch('ad_strat', 'air_doctrine', [
        ('Bombardement stratégique', 1936, 100, {'bombing': .08}),
        ('Destruction industrielle', 1938, 130, {'bombing': .1}),
        ('Escortes à long rayon', 1940, 160, {'air': .05, 'bombing': .06}),
    ], AIR_ROOTS, ['GBR', 'USA'])
    + branch('ad_cas', 'air_doctrine', [
        ('Coopération air-sol', 1936, 100, {'air': .04, 'attack': .02}),
        ('Contrôleurs avancés', 1938, 130, {'attack': .03, 'air': .03}),
        ('Interdiction du champ de bataille', 1940, 160, {'air': .05, 'breakthrough': .03}),
    ], AIR_ROOTS, ['GER', 'ITA', 'JPN', 'default'])
    + branch('ad_sup', 'air_doctrine', [
        ('Maîtrise du ciel', 1936, 100, {'air': .08}),
        ('Réseau d’alerte', 1938, 130, {'airDefense': .15, 'air': .04}),
        ('Défense aérienne intégrée', 1940, 160, {'airDefense': .2, 'air': .05}),
    ], AIR_ROOTS, ['SOV', 'FRA'])
    + [tech('ad_airborne', 'Doctrine aéroportée', 'air_doctrine', 1938, 120, [], {'paradrop': .2})]
    + [
        tech('el_radio1', 'Radio de campagne', 'electronics', 1936, 95, [], {'planning': .04}),
        tech('el_radio2', 'Radiogoniométrie', 'electronics', 1938, 125, ['el_radio1'], {'intel': .06, 'convoy': .05}),
        tech('el_crypto1', 'Chiffrement mécanique', 'electronics', 1937, 110, [], {'intel': .08}),
        tech('el_crypto2', 'Cryptanalyse', 'electronics', 1940, 150, ['el_crypto1'], {'intel': .12, 'planning': .03}),
        tech('el_avionics', 'Électronique embarquée', 'electronics', 1941, 160, ['el_radio2'], {'naval': .04, 'air': .03}),
        tech('el_proximity', 'Fusée de proximité', 'electronics', 1943, 180, ['el_avionics'], {'airDefense': .15}),
        tech('el_rockets', 'Fusées expérimentales', 'electronics', 1940, 150, [], {'bombing': .04}),
        tech('el_jets', 'Propulsion à réaction', 'electronics', 1943, 190, ['el_rockets'], {'air': .08}),
        tech('el_computers', 'Calculateurs électroniques', 'electronics', 1943, 180, ['calcul3'], {'research': .08}),
        tech('el_atomic1', 'Physique nucléaire', 'electronics', 1940, 160, [], {'research': .04}),
        tech('el_atomic2', 'Programme atomique', 'electronics', 1944, 220, ['el_atomic1'], {'research': .05}),
        tech('el_medicine', 'Médecine de guerre', 'electronics', 1939, 130, [], {'casualties': .15}),
        tech('el_reliability', 'Contrôle de la qualité', 'electronics', 1939, 130, [], {'reliability': .05, 'production': .02}),
    ]
)
known = {t['id'] for t in catalog['techs'] if not t.get('c16')}
for t in CONTENT_TECHS:
    assert t['id'] not in known, t['id']
    known.add(t['id'])
for t in CONTENT_TECHS:
    assert all(r in known for r in t['req']), t['id']
catalog['techs'] = [t for t in catalog['techs'] if not t.get('c16')] + CONTENT_TECHS
for profile in catalog['aiProfiles'].values():
    for group in ('electronics', 'naval_doctrine', 'air_doctrine'):
        if group not in profile['research']:
            profile['research'].append(group)

# --- Dynamic events --------------------------------------------------------------------------
def event(eid, title, text, conditions, choices, mtth=720, cooldown=540, once=False):
    entry = {'id': eid, 'title': title, 'text': text, 'conditions': conditions, 'mtth': mtth, 'cooldown': cooldown, 'choices': choices}
    if once:
        entry['once'] = True
    return entry


def choice(text, effect=None, ai=1, **extra):
    entry = {'text': text, 'effect': effect or {}, 'ai': ai}
    entry.update(extra)
    return entry


catalog['events16'] = [
    # Economy and society
    event('strike', 'Grève dans la métallurgie',
          'Les ouvriers des grandes forges cessent le travail : salaires, cadences et prix du pain sont en cause.',
          {'stabilityBelow': 45}, [
              choice('Négocier des hausses de salaire', {'pp': -25, 'stability': 4}, 2),
              choice('Réquisitionner les usines', {'stability': -4, 'support': 3}, spirit='strikes', spiritDays=60),
          ], mtth=500),
    event('inflation', 'Poussée inflationniste',
          'La planche à billets finance la guerre ; les prix s’envolent sur les marchés.',
          {'war': True, 'warDays': 120}, [
              choice('Bloquer les prix', {'pp': -30, 'stability': 2}, 2, spirit='rationing', spiritDays=180),
              choice('Laisser filer la monnaie', {'stability': -5, 'production': .01}),
          ], mtth=600, cooldown=720),
    event('harvest', 'Récolte exceptionnelle',
          'Un été clément remplit les greniers ; les campagnes respirent.',
          {'months': [7, 8]}, [
              choice('Baisser le prix du pain', {'stability': 5}, 2),
              choice('Constituer des réserves', {'pp': 30}),
          ], mtth=900, cooldown=365),
    event('drought', 'Sécheresse',
          'Les rivières sont basses et les récoltes compromises dans plusieurs provinces.',
          {'months': [6, 7, 8]}, [
              choice('Financer des secours', {'pp': -25, 'stability': 1}, 2),
              choice('Laisser les provinces se débrouiller', {'stability': -5}),
          ], mtth=1200, cooldown=730),
    event('arsenal_blast', 'Explosion dans un arsenal',
          'Un dépôt de munitions saute en pleine nuit ; plusieurs ateliers sont détruits.',
          {'tensionAbove': 25}, [
              choice('Ouvrir une commission d’enquête', {'pp': -15, 'rifles': -1500, 'stability': 1}, 2),
              choice('Reconstruire sans attendre', {'rifles': -1500, 'production': -.01}),
          ], mtth=1500, cooldown=900),
    event('ore_find', 'Découverte d’un gisement',
          'Des prospecteurs annoncent un filon prometteur dans une province reculée.',
          {}, [
              choice('Exploiter le gisement', {'resources': .03}, 2),
              choice('Vendre la concession', {'pp': 40}),
          ], mtth=1500, once=True),
    event('black_market', 'Marché noir',
          'Viande, essence et tabac circulent à prix d’or hors des circuits officiels.',
          {'war': True, 'stabilityBelow': 55}, [
              choice('Réprimer les trafiquants', {'stability': -2, 'pp': 15}, 2),
              choice('Fermer les yeux', {'stability': 2}, spirit='black_market', spiritDays=180),
          ], mtth=600, cooldown=720),
    event('women_factories', 'Les femmes à l’usine',
          'Les directions d’usine réclament l’embauche massive de femmes pour remplacer les mobilisés.',
          {'war': True, 'yearMin': 1939}, [
              choice('Ouvrir les ateliers aux femmes', {'stability': 2}, 2, spirit='women_workforce'),
              choice('Maintenir l’organisation actuelle', {'pp': 20}),
          ], mtth=400, once=True),
    event('rationing', 'Instaurer le rationnement ?',
          'Les stocks de vivres fondent et les ministères demandent des cartes d’alimentation.',
          {'war': True, 'warDays': 60, 'notSpirit': 'rationing'}, [
              choice('Instaurer le rationnement', {'stability': -2, 'production': .01}, 2, spirit='rationing', spiritDays=365),
              choice('Compter sur les importations', {'pp': -30}),
          ], mtth=500, cooldown=720),
    event('fuel_crisis', 'Pénurie de carburant',
          'Les réservoirs se vident : camions et avions risquent de rester au sol.',
          {'war': True, 'fuelBelow': 3000}, [
              choice('Construire une raffinerie d’urgence', {'pp': -50}, 2, special={'refinery': 1}),
              choice('Rationner l’essence civile', {'fuel': 2500, 'stability': -3}),
          ], mtth=120, cooldown=365),
    # Science
    event('scientists', 'Des savants demandent l’asile',
          'Chassés par les persécutions, des physiciens et des chimistes frappent à votre porte.',
          {'ideology': ['democratic', 'authoritarian'], 'tensionAbove': 30}, [
              choice('Les accueillir dans nos universités', {'stability': -1}, 2, spirit='refugee_scientists'),
              choice('Refuser poliment', {'pp': 10}),
          ], mtth=900, once=True),
    event('breakthrough', 'Découverte en laboratoire',
          'Une équipe annonce un résultat inattendu ; le ministère doit décider de son orientation.',
          {'yearMin': 1937}, [
              choice('Orienter vers l’aviation', {}, 1, researchBonus={'group': 'air', 'value': .5, 'uses': 1}),
              choice('Orienter vers les blindés', {}, 1, researchBonus={'group': 'armor', 'value': .5, 'uses': 1}),
              choice('Orienter vers l’électronique', {}, 1, researchBonus={'group': 'electronics', 'value': .5, 'uses': 1}),
          ], mtth=900, cooldown=720),
    event('tank_trials', 'Essais d’un nouveau char',
          'Le prototype a franchi le terrain d’essai sans panne ; les ingénieurs veulent poursuivre.',
          {'tech': 'blindage1'}, [
              choice('Financer une nouvelle série d’essais', {'pp': -20}, 2, researchBonus={'group': 'armor', 'value': .5, 'uses': 1}),
              choice('S’en tenir aux modèles éprouvés', {'production': .01}),
          ], mtth=1200, once=True),
    event('air_show', 'Meeting aérien international',
          'Les constructeurs du monde entier présentent leurs appareils devant la presse.',
          {'war': False, 'yearMax': 1939, 'major': True}, [
              choice('Observer les appareils étrangers', {}, 2, researchBonus={'group': 'air', 'value': .4, 'uses': 1}),
              choice('Exhiber nos propres prototypes', {'support': 4, 'pp': 15}),
          ], mtth=1000, once=True),
    event('naval_review', 'Grande revue navale',
          'La flotte défile devant les dignitaires ; les attachés étrangers prennent des notes.',
          {'war': False, 'coast': True, 'major': True}, [
              choice('Une démonstration de force', {'support': 4, 'tension': 1}, 2),
              choice('Étudier les escadres étrangères', {}, researchBonus={'group': 'navy', 'value': .4, 'uses': 1}),
          ], mtth=1200, once=True),
    # Politics
    event('scandal', 'Scandale financier',
          'La presse révèle des malversations impliquant plusieurs ministres.',
          {'ideology': ['democratic'], 'stabilityBelow': 65}, [
              choice('Démission du cabinet', {'stability': -2, 'pp': -30}, 2),
              choice('Étouffer l’affaire', {'stability': -3}, spirit='scandal', spiritDays=180),
          ], mtth=900, cooldown=900),
    event('attempt', 'Attentat manqué contre le chef de l’État',
          'Une bombe explose au passage du cortège officiel ; le chef de l’État est indemne.',
          {'ideology': ['fascist', 'authoritarian', 'communist']}, [
              choice('Frapper les opposants', {'stability': 3, 'support': 5}, 2, partyShift={'democratic': -5}),
              choice('Faire preuve de clémence', {'stability': -2, 'pp': 30}),
          ], mtth=1500, cooldown=1095),
    event('generals', 'Fronde des généraux',
          'Plusieurs commandants critiquent ouvertement la conduite politique de la défense.',
          {'ideology': ['fascist', 'authoritarian'], 'stabilityBelow': 50}, [
              choice('Mettre les mécontents à la retraite', {'planning': -.03, 'stability': 3}, 2),
              choice('Leur accorder des crédits', {'pp': -40, 'xp': 10}),
          ], mtth=900, cooldown=900),
    event('rally', 'Grand rassemblement national',
          'Des centaines de milliers de partisans défilent sous les bannières du régime.',
          {'ideology': ['fascist', 'communist'], 'tensionAbove': 30}, [
              choice('Galvaniser la nation', {'support': 8, 'pp': 20}, 2),
          ], mtth=900, cooldown=730),
    event('elections', 'Élections générales',
          'Le pays vote ; la campagne a été âpre et la majorité incertaine.',
          {'ideology': ['democratic'], 'war': False}, [
              choice('La majorité sortante l’emporte', {'stability': 5, 'support': 3}, 2),
              choice('Une coalition fragile se forme', {'stability': -4, 'pp': 40}),
          ], mtth=700, cooldown=1460),
    event('party_split', 'Scission au sein du parti',
          'Une faction dissidente quitte le parti au pouvoir et fonde son propre mouvement.',
          {'stabilityBelow': 40}, [
              choice('Exclure les dissidents', {'stability': -3, 'pp': 20}, 2),
              choice('Négocier leur retour', {'pp': -35, 'stability': 2}),
          ], mtth=900, cooldown=900),
    event('neutrality', 'Le débat sur la neutralité',
          'Les journaux s’affrontent : faut-il rester à l’écart des querelles du monde ?',
          {'ideology': ['democratic'], 'war': False, 'tensionAbove': 50, 'hasSpirit': 'isolation'}, [
              choice('Préparer la défense nationale', {'support': 5, 'tension': 1}, 2, removeSpirit='isolation'),
              choice('Rester fidèle à la neutralité', {'stability': 3}),
          ], mtth=400, cooldown=365),
    event('purge_end', 'Les séquelles des purges',
          'Faute de cadres, des régiments entiers sont commandés par de jeunes lieutenants.',
          {'hasSpirit': 'purges', 'yearMin': 1938}, [
              choice('Réhabiliter les officiers emprisonnés', {'pp': -50, 'stability': -2}, 2, removeSpirit='purges'),
              choice('Former de nouveaux cadres', {'xp': 15}),
          ], mtth=400, once=True),
    event('colonial_unrest', 'Agitation coloniale',
          'Des manifestations réclament réformes et représentation dans les territoires d’outre-mer.',
          {'overseas': True, 'stabilityBelow': 60, 'ideology': ['democratic', 'authoritarian']}, [
              choice('Promettre des réformes', {'pp': -35, 'stability': 2}, 2),
              choice('Maintenir l’ordre', {'manpower': -5000, 'stability': -1}),
          ], mtth=1000, cooldown=900),
    event('refugees', 'Afflux de réfugiés',
          'Fuyant les combats chez nos voisins, des colonnes de civils franchissent la frontière.',
          {'war': False, 'neighbourWar': True}, [
              choice('Accueillir les réfugiés', {'manpower': 15000, 'stability': -2}, 2),
              choice('Fermer la frontière', {'support': 3}),
          ], mtth=500, cooldown=730),
    event('spy_ring', 'Réseau d’espionnage démantelé',
          'La police arrête des agents qui photographiaient nos installations militaires.',
          {'tensionAbove': 40}, [
              choice('Retourner les agents', {'intel': .03}, 2),
              choice('Un procès retentissant', {'support': 5, 'pp': 15}),
          ], mtth=900, cooldown=900),
    # War
    event('volunteers_wave', 'Élan patriotique',
          'La déclaration de guerre provoque un afflux de volontaires dans les bureaux de recrutement.',
          {'war': True}, [
              choice('Accueillir les volontaires', {'manpower': 20000}, 2, spirit='war_enthusiasm', spiritDays=120),
          ], mtth=60, once=True),
    event('front_lessons', 'Retour d’expérience du front',
          'Les rapports des unités engagées révèlent les forces et les faiblesses de nos méthodes.',
          {'war': True, 'warDays': 60}, [
              choice('Réviser les règlements', {'planning': .02, 'xp': 15}, 2),
              choice('Réviser les programmes de recherche', {}, researchBonus={'group': 'doctrine', 'value': .5, 'uses': 1}),
          ], mtth=300, cooldown=540),
    event('codebreak', 'Codes ennemis percés',
          'Nos cryptologues lisent désormais une partie des transmissions adverses.',
          {'war': True, 'tech': 'el_crypto1'}, [
              choice('Exploiter discrètement les messages', {}, 2, spirit='decrypt', spiritDays=180),
              choice('Prévenir nos alliés', {'pp': 30, 'intel': .02}),
          ], mtth=500, cooldown=720),
    event('mutiny', 'Mutinerie dans les dépôts',
          'Épuisées par les revers, des unités refusent de remonter en ligne.',
          {'war': True, 'losing': True, 'stabilityBelow': 40}, [
              choice('Faire des concessions', {'pp': -30, 'stability': 3}, 2, orgLoss=.05),
              choice('Rétablir la discipline', {'stability': -2}, orgLoss=.15),
          ], mtth=200, cooldown=365),
    event('heroic_defense', 'Défense héroïque',
          'La résistance acharnée d’une garnison encerclée devient un symbole national.',
          {'war': True, 'losing': True}, [
              choice('Célébrer les défenseurs', {'support': 10, 'defense': .02}, 2),
              choice('Pratiquer la terre brûlée', {'stability': -2}, spirit='scorched', spiritDays=180, special={'scorch': True}),
          ], mtth=200, cooldown=365),
    event('victory', 'Victoire célébrée',
          'Les cloches sonnent : nos troupes sont entrées en territoire ennemi.',
          {'war': True, 'winning': True}, [
              choice('Défilé de la victoire', {'support': 8, 'stability': 4}, 2),
          ], mtth=200, cooldown=540),
    event('partisans', 'Maquis et partisans',
          'Dans les régions occupées, des groupes armés se forment et demandent des ordres.',
          {'war': True, 'losing': True}, [
              choice('Organiser la résistance', {'stability': 2}, 2, special={'militia': 2}),
              choice('Interdire les actions armées', {'pp': 20}),
          ], mtth=300, cooldown=540),
    event('desertion', 'Désertions',
          'Les gendarmes signalent des déserteurs sur toutes les routes de l’arrière.',
          {'war': True, 'stabilityBelow': 30}, [
              choice('Amnistie pour ceux qui reviennent', {'manpower': -8000, 'stability': 2}, 2),
              choice('Tribunaux militaires', {'manpower': -4000, 'stability': -3}),
          ], mtth=300, cooldown=365),
    event('winter_gear', 'L’hiver arrive',
          'Les intendants préviennent : l’armée manque de vêtements chauds et de lubrifiants adaptés.',
          {'war': True, 'months': [9, 10], 'notSpirit': 'winter_gear'}, [
              choice('Programme d’urgence', {'pp': -30}, 2, spirit='winter_gear', spiritDays=180),
              choice('Improviser sur place', {'stability': -1}),
          ], mtth=120, cooldown=300),
    event('foreign_aid', 'Offre d’aide étrangère',
          'Des sympathisants à l’étranger proposent fusils, camions et munitions.',
          {'war': True, 'losing': True}, [
              choice('Accepter l’aide', {'rifles': 2500, 'trucks': 300}, 2),
          ], mtth=400, cooldown=720),
    event('bombing', 'Raid sur une ville industrielle',
          'Les sirènes ont retenti trop tard ; des quartiers ouvriers sont en ruine.',
          {'war': True, 'warDays': 90}, [
              choice('Renforcer la défense passive', {'pp': -20}, 2, special={'aa': 3}),
              choice('Appeler à la vengeance', {'support': 6, 'stability': -2}),
          ], mtth=500, cooldown=540),
]

# --- National events of the secondary powers ------------------------------------------------
def nat(tag, eid, title, text, conditions, choices, mtth=600, cooldown=720, once=True):
    return event(eid, title, text, dict(conditions, countries=[tag]), choices, mtth, cooldown, once)


NATIONAL_EVENTS = [
    nat('POL', 'pol_danzig', 'La question de Dantzig',
        'Berlin exige le rattachement de la ville libre et une route à travers le corridor.',
        {'tensionAbove': 45, 'yearMin': 1938, 'peace': None}, [
            choice('Refuser toute concession', {'stability': 5, 'tension': 2}, 2, spirit='war_enthusiasm', spiritDays=120,
                   relations={'GER': -20, 'GBR': 10, 'FRA': 10}),
            choice('Proposer une route extraterritoriale', {'pp': -30, 'stability': -5, 'tension': -3}, relations={'GER': 15}),
        ]),
    nat('POL', 'pol_teschen', 'Le litige de Teschen',
        'La région disputée depuis 1920 redevient un sujet brûlant à mesure que Prague s’affaiblit.',
        {'tensionAbove': 35}, [
            choice('Revendiquer la région', {'tension': 2}, 1, claims=['CZE']),
            choice('Rester solidaire de Prague', {'pp': 20}, 2, relations={'CZE': 20, 'FRA': 10}),
        ]),
    nat('POL', 'pol_cipher_breakthrough', 'Les mathématiciens du chiffre',
        'Trois jeunes cryptologues ont reconstitué la machine de chiffrement de l’armée allemande.',
        {'yearMin': 1937}, [
            choice('Partager le secret avec Paris et Londres', {}, 2, relations={'FRA': 20, 'GBR': 20},
                   researchBonus={'group': 'electronics', 'value': 1, 'uses': 1}),
            choice('Garder le secret', {}, 1, spirit='decrypt', spiritDays=365),
        ], mtth=500),
    nat('SPA', 'spa_gold', 'L’or de la Banque d’Espagne',
        'Les réserves d’or de la nation sont menacées par l’avance ennemie. Où les mettre à l’abri ?',
        {'war': True}, [
            choice('Les envoyer à Moscou contre des armes', {'rifles': 3000, 'artillery': 300, 'tanks': 40}, 2, relations={'SOV': 30}),
            choice('Les garder à Carthagène', {'stability': 3, 'pp': 20}),
        ], mtth=200),
    nat('SPA', 'spa_brigades', 'Les volontaires étrangers',
        'Des milliers de volontaires venus de toute l’Europe se présentent aux bureaux de recrutement.',
        {'war': True, 'warDays': 60}, [
            choice('Former des brigades internationales', {'manpower': 20000, 'xp': 10}, 2),
            choice('Les répartir dans les milices', {'manpower': 12000, 'stability': 2}),
        ], mtth=150),
    nat('SPA', 'spa_militias', 'Querelles entre milices',
        'Anarchistes, communistes et républicains se disputent armes et commandement.',
        {'war': True, 'hasSpirit': 'popular_militias'}, [
            choice('Militariser les milices', {'stability': -4, 'pp': -20}, 2, removeSpirit='popular_militias', spirit='people_army'),
            choice('Respecter les comités', {'stability': 4, 'support': 4}),
        ], mtth=300),
    nat('ROM', 'rom_oil_pressure', 'Pétrole contre garanties',
        'Berlin propose des armes et une garantie de frontières contre des livraisons massives de pétrole.',
        {'tensionAbove': 50}, [
            choice('Livrer le pétrole', {'fuel': -4000, 'rifles': 2000, 'artillery': 200}, 1, relations={'GER': 30}),
            choice('Rester fidèle aux alliés', {'pp': 20}, 2, relations={'FRA': 15, 'GBR': 15, 'GER': -10}),
        ]),
    nat('ROM', 'rom_legion', 'Agitation légionnaire',
        'Les « chemises vertes » multiplient défilés, attentats et assassinats politiques.',
        {'stabilityBelow': 60, 'notIdeology': ['fascist']}, [
            choice('Dissoudre la Légion', {'stability': 5, 'pp': -25}, 2, partyShift={'fascist': -8}),
            choice('Composer avec les légionnaires', {'stability': -3, 'pp': 15}, partyShift={'fascist': 8}),
        ], mtth=500, cooldown=900, once=False),
    nat('ROM', 'rom_transylvania', 'Pressions sur la Transylvanie',
        'Budapest réclame les territoires perdus en 1920 et cherche l’appui de Rome et de Berlin.',
        {'tensionAbove': 65, 'war': False}, [
            choice('Refuser tout arbitrage', {'tension': 3}, 2, spirit='war_enthusiasm', spiritDays=180, relations={'HUN': -25}),
            choice('Accepter l’arbitrage', {'stability': -10, 'tension': -3}, relations={'GER': 15, 'ITA': 15}),
        ]),
    nat('CZE', 'cze_sudeten', 'La crise des Sudètes',
        'Le parti des Allemands des Sudètes exige l’autonomie ; Berlin menace d’intervenir.',
        {'tensionAbove': 40, 'yearMin': 1938}, [
            choice('Mobiliser l’armée', {'manpower': 60000, 'tension': 4}, 2, spirit='war_enthusiasm', spiritDays=180, relations={'FRA': 10}),
            choice('Négocier un statut d’autonomie', {'stability': -8, 'tension': -3, 'pp': 20}),
        ], mtth=300),
    nat('CZE', 'cze_order', 'Une commande étrangère',
        'Plusieurs pays veulent acheter les canons et les chars de nos usines.',
        {'war': False}, [
            choice('Livrer la commande', {'pp': 30}, 1, special={'treasury': 300}),
            choice('Réserver la production à l’armée', {'artillery': 250, 'rifles': 1500}, 2),
        ], mtth=500, cooldown=720, once=False),
    nat('CZE', 'cze_slovak', 'L’autonomie slovaque',
        'À Bratislava, le parti populaire réclame un gouvernement slovaque.',
        {'stabilityBelow': 65}, [
            choice('Accorder l’autonomie', {'stability': 6, 'pp': -20}, 2),
            choice('Défendre l’État unitaire', {'stability': -4, 'pp': 10}),
        ]),
    nat('TUR', 'tur_succession', 'La mort du fondateur',
        'Le père de la république s’est éteint ; le pays entier porte son deuil.',
        {'yearMin': 1938}, [
            choice('Continuité du parti', {'stability': 5, 'pp': 25}, 2),
            choice('Ouverture politique', {'stability': -3}, 1, partyShift={'democratic': 10}),
        ], mtth=400),
    nat('TUR', 'tur_straits_conference', 'La conférence des détroits',
        'Les puissances acceptent de discuter du statut des détroits et de leur remilitarisation.',
        {'yearMax': 1937}, [
            choice('Remilitariser les détroits', {'pp': 20}, 2, special={'coastal': 3}),
            choice('Garanties britanniques', {}, 1, relations={'GBR': 20, 'FRA': 10}),
        ], mtth=200),
    nat('TUR', 'tur_courted', 'Courtisée par les belligérants',
        'Les deux camps multiplient les offres de crédits et d’armes pour attirer Ankara.',
        {'tensionAbove': 70, 'war': False}, [
            choice('Neutralité active', {'stability': 4}, 2, spirit='armed_neutrality'),
            choice('Vendre le chrome au plus offrant', {'pp': 30}, 1, special={'treasury': 300}, relations={'GER': 15}),
        ]),
    nat('YUG', 'yug_croat_question', 'La question croate',
        'Les députés croates boycottent le parlement et réclament une large autonomie.',
        {'hasSpirit': 'ethnic_tensions'}, [
            choice('Conclure un accord', {'pp': -40, 'stability': 6}, 2, removeSpirit='ethnic_tensions'),
            choice('Maintenir le centralisme', {'stability': -3, 'pp': 10}),
        ], mtth=500),
    nat('YUG', 'yug_coup', 'Coup d’État à Belgrade',
        'Des officiers aviateurs renversent le gouvernement qui venait de signer avec l’Axe.',
        {'tensionAbove': 70, 'faction': True, 'notIdeology': ['democratic']}, [
            choice('Le nouveau gouvernement rompt le pacte', {'stability': 5}, 2, spirit='war_enthusiasm', spiritDays=180,
                   relations={'GER': -30, 'GBR': 20}),
            choice('Rétablir l’ordre', {'stability': -6}, 1, relations={'GER': 10}),
        ], mtth=400),
    nat('YUG', 'yug_resistance', 'Maquis dans les montagnes',
        'Des officiers et des militants refusent la défaite et gagnent les montagnes.',
        {'war': True, 'losing': True}, [
            choice('Armer les maquis', {'rifles': -1000}, 2, special={'militia': 3}),
            choice('Attendre les alliés', {'stability': 2}),
        ], mtth=150),
    nat('HUN', 'hun_award', 'L’arbitrage de Vienne',
        'Rome et Berlin proposent de redessiner les frontières de 1920 en faveur de Budapest.',
        {'tensionAbove': 55}, [
            choice('Accepter l’arbitrage', {'tension': 2}, 2, claims=['CZE'], relations={'GER': 20, 'ITA': 20}),
            choice('Refuser l’ingérence', {'stability': 3}, 1, relations={'GBR': 10}),
        ]),
    nat('HUN', 'hun_transit', 'Les troupes de passage',
        'Berlin demande le droit de faire transiter ses divisions par la Hongrie.',
        {'tensionAbove': 65, 'war': False}, [
            choice('Laisser passer les troupes', {'stability': -6}, 2, relations={'GER': 25}),
            choice('Refuser le transit', {'stability': 4}, 1, relations={'GER': -20, 'GBR': 10}),
        ]),
    nat('HUN', 'hun_arrow', 'La montée des Croix fléchées',
        'Le mouvement national-socialiste gagne les faubourgs ouvriers et les campagnes.',
        {'stabilityBelow': 60, 'notIdeology': ['fascist']}, [
            choice('Interdire le parti', {'stability': 4, 'pp': -25}, 2, partyShift={'fascist': -8}),
            choice('Reprendre leurs idées', {'stability': -2}, 1, partyShift={'fascist': 8}),
        ], mtth=500, cooldown=900, once=False),
    nat('HOL', 'hol_neutrality', 'Neutralité en péril',
        'Les attachés militaires rapportent des concentrations de troupes de l’autre côté de la frontière.',
        {'tensionAbove': 60, 'war': False}, [
            choice('Préparer les inondations', {'pp': -25}, 2, special={'forts': 3}),
            choice('Faire confiance à la neutralité', {'stability': 4}),
        ]),
    nat('HOL', 'hol_indies', 'Le gouverneur des Indes',
        'Batavia réclame des renforts face aux ambitions japonaises dans le Pacifique.',
        {'tensionAbove': 50}, [
            choice('Renforcer l’armée des Indes', {'manpower': -5000, 'xp': 10}, 2, special={'coastal': 2}),
            choice('Développer les puits de pétrole', {'fuel': 6000}, 1),
        ]),
    nat('HOL', 'hol_february_strike', 'La grève de février',
        'Dans les villes occupées, ouvriers et employés cessent le travail pour protester contre les persécutions.',
        {'war': True, 'losing': True}, [
            choice('Soutenir la grève depuis l’exil', {'support': 6, 'stability': 3}, 2),
            choice('Appeler au calme', {'stability': 1}),
        ], mtth=300),
    nat('BEL', 'bel_independence', 'La politique d’indépendance',
        'Le roi annonce que la Belgique ne sera plus liée par l’alliance militaire avec la France.',
        {'yearMax': 1937}, [
            choice('Neutralité armée', {'stability': 5}, 2, spirit='armed_neutrality', relations={'FRA': -15}),
            choice('Rester liés à Paris', {'tension': 1}, 1, relations={'FRA': 20}),
        ], mtth=300),
    nat('BEL', 'bel_rex', 'La montée du rexisme',
        'Un jeune tribun dénonce la corruption des partis et remplit les salles de meeting.',
        {'stabilityBelow': 60, 'notIdeology': ['fascist']}, [
            choice('Une élection partielle pour le battre', {'pp': -20, 'stability': 4}, 2, partyShift={'fascist': -6}),
            choice('Ignorer le mouvement', {}, 1, partyShift={'fascist': 6}),
        ], mtth=500),
    nat('BEL', 'bel_king_army', 'Le roi et l’armée',
        'Le roi refuse de quitter ses soldats alors que le gouvernement prépare son départ pour Londres.',
        {'war': True, 'losing': True}, [
            choice('Le roi reste avec l’armée', {'stability': 4, 'defense': .03}, 1),
            choice('Le gouvernement poursuit la guerre en exil', {'support': 6}, 2),
        ], mtth=100),
    nat('SWE', 'swe_transit', 'Les trains de permissionnaires',
        'Un belligérant demande le passage de ses troupes sur le réseau ferré suédois.',
        {'tensionAbove': 60, 'war': False, 'neighbourWar': True}, [
            choice('Autoriser le transit', {'stability': -5, 'pp': 20}, 1, relations={'GER': 20}),
            choice('Refuser le passage', {'stability': 3}, 2, relations={'GER': -15}),
        ]),
    nat('SWE', 'swe_ore', 'Commandes de minerai',
        'Les aciéries étrangères réclament le minerai de Kiruna en quantités record.',
        {'tensionAbove': 45}, [
            choice('Exporter sans restriction', {'pp': 40}, 1, special={'treasury': 300}, relations={'GER': 15, 'GBR': -10}),
            choice('Limiter les exportations', {'stability': 2}, 2, relations={'GBR': 15}),
        ], mtth=500),
    nat('SWE', 'swe_finland_volunteers', 'Volontaires pour le voisin',
        'Des milliers de Suédois veulent aller combattre aux côtés des Finlandais.',
        {'neighbourWar': True, 'war': False}, [
            choice('Laisser partir les volontaires', {'manpower': -8000, 'rifles': -1500}, 2, relations={'FIN': 30}),
            choice('Neutralité stricte', {'stability': 2}),
        ], mtth=400),
    nat('FIN', 'fin_demands', 'Les exigences soviétiques',
        'Moscou réclame l’isthme de Carélie et une base navale à l’entrée du golfe.',
        {'tensionAbove': 50, 'war': False}, [
            choice('Refuser', {'tension': 2}, 2, spirit='war_enthusiasm', spiritDays=180, relations={'SOV': -20}),
            choice('Proposer un échange de territoires', {'stability': -8}, 1, relations={'SOV': 15}),
        ], mtth=300),
    nat('FIN', 'fin_marshal', 'Le maréchal reprend du service',
        'Le vieux chef de 1918 accepte le commandement suprême.',
        {'war': True}, [
            choice('Lui confier toute l’armée', {'planning': .05, 'xp': 15}, 2),
            choice('Garder un contrôle civil', {'stability': 5}),
        ], mtth=60),
    nat('FIN', 'fin_aid', 'Aide des pays nordiques',
        'Fusils, avions et volontaires arrivent de Suède et de Norvège.',
        {'war': True, 'warDays': 30}, [
            choice('Accepter l’aide', {'manpower': 8000, 'rifles': 2000, 'fighters': 20}, 2),
        ], mtth=120),
    nat('CAN', 'can_conscription', 'La crise de la conscription',
        'Le Québec rejette la conscription pour le service outre-mer ; le gouvernement est divisé.',
        {'war': True, 'warDays': 365}, [
            choice('Conscription pour l’outre-mer', {'manpower': 70000, 'stability': -8}, 1),
            choice('Volontariat seulement', {'stability': 4, 'manpower': 15000}, 2),
        ], mtth=300),
    nat('CAN', 'can_halifax', 'Les convois de Halifax',
        'Les cargos s’entassent dans le port en attendant leurs escortes.',
        {'war': True}, [
            choice('Priorité aux escorteurs', {'destroyers': 2}, 2),
            choice('Priorité aux cargos', {'convoys': 30}, 1),
        ], mtth=300),
    nat('CAN', 'can_research', 'Recherche commune',
        'Des scientifiques britanniques proposent de travailler dans les laboratoires d’Ottawa.',
        {'tensionAbove': 50}, [
            choice('Accueillir les équipes', {}, 2, spirit='refugee_scientists', spiritDays=365, relations={'GBR': 10}),
            choice('Financer nos propres programmes', {'pp': 20}),
        ]),
    nat('AST', 'ast_singapore', 'La stratégie de Singapour',
        'La défense du continent repose sur une base britannique lointaine et une flotte qui n’y est pas.',
        {'tensionAbove': 55}, [
            choice('Préparer la défense du continent', {'pp': -20}, 2, special={'coastal': 3, 'forts': 2}),
            choice('Faire confiance à Londres', {'stability': 3}, 1, relations={'GBR': 15}),
        ]),
    nat('AST', 'ast_appeal', 'Appel à l’Amérique',
        'Le Premier ministre déclare que l’Australie se tourne désormais vers les États-Unis.',
        {'war': True, 'warDays': 180}, [
            choice('Se tourner vers Washington', {'stability': 3}, 2, relations={'USA': 30, 'GBR': -5}),
            choice('Fidélité impériale', {'stability': 2}, 1, relations={'GBR': 15}),
        ], mtth=400),
    nat('AST', 'ast_coastwatchers', 'Les guetteurs côtiers',
        'Planteurs et missionnaires des îles signalent par radio les mouvements ennemis.',
        {'war': True}, [
            choice('Organiser le réseau', {'pp': -15, 'intel': .08}, 2),
        ], mtth=300),
    nat('RAJ', 'raj_independence', 'Agitation pour l’indépendance',
        'Le Congrès exige l’indépendance immédiate en échange de sa participation à la guerre.',
        {'war': True, 'warDays': 365}, [
            choice('Promettre l’autonomie après la guerre', {'pp': -30, 'stability': 4}, 2, partyShift={'democratic': 6}),
            choice('Arrêter les dirigeants', {'stability': -6, 'pp': 10}),
        ], mtth=300),
    nat('RAJ', 'raj_famine', 'Disette au Bengale',
        'Les réquisitions et la perte des rizières birmanes provoquent une terrible disette.',
        {'war': True, 'yearMin': 1942}, [
            choice('Importer du grain', {'pp': -40, 'stability': 2}, 2),
            choice('Priorité à l’armée', {'stability': -10, 'support': -6}),
        ], mtth=400),
    nat('RAJ', 'raj_recruits', 'Vague d’engagements',
        'Les dépôts de recrutement du Pendjab débordent de volontaires.',
        {'tensionAbove': 50}, [
            choice('Former de nouvelles divisions', {'manpower': 80000, 'pp': -15}, 2),
        ], mtth=400),
    nat('BRA', 'bra_integralists', 'Tentative de coup intégraliste',
        'Des militants en chemise verte attaquent le palais présidentiel.',
        {'yearMax': 1938, 'notIdeology': ['fascist']}, [
            choice('Réprimer le mouvement', {'stability': 4}, 2, partyShift={'fascist': -8}),
            choice('Composer avec les insurgés', {'stability': -4}, 1, partyShift={'fascist': 6}),
        ], mtth=500),
    nat('BRA', 'bra_bases', 'Bases contre crédits',
        'Washington propose de financer une aciérie en échange de bases aériennes dans le Nordeste.',
        {'tensionAbove': 60}, [
            choice('Accepter l’accord', {'civ': 1}, 2, relations={'USA': 30}),
            choice('Rester neutre', {'stability': 3}, 1, relations={'GER': 10}),
        ]),
    nat('BRA', 'bra_rubber_soldiers', 'Les soldats du caoutchouc',
        'Des milliers de travailleurs partent pour les plantations de l’Amazonie.',
        {'war': True}, [
            choice('Organiser le recrutement', {'resources': .05, 'stability': -2}, 2),
            choice('Laisser faire le marché', {'pp': 10}),
        ], mtth=300),
]
for e in NATIONAL_EVENTS:
    e['conditions'] = {k: v for k, v in e['conditions'].items() if v is not None}
catalog['events16'] += NATIONAL_EVENTS


# --- National decisions of the secondary powers ---------------------------------------------
def ndec(tag, did, name, cost, desc, requires=None, effect=None, spirit_id=None, days=None, cooldown=0, once=True,
         special=None, remove=None):
    entry = {'id': did, 'name': name, 'category': 'national', 'cost': cost, 'desc': desc,
             'requires': dict(requires or {}, country=[tag]), 'effect': effect or {}, 'cooldown': cooldown, 'once': once,
             'ai': True, 'c16': True}
    if spirit_id:
        entry['spirit'] = spirit_id
        entry['days'] = days
    if special:
        entry['special'] = special
    if remove:
        entry['removeSpirit'] = remove
    return entry


NATIONAL_DECISIONS = [
    ndec('POL', 'pol_secret_mobilization', 'Mobilisation secrète', 70, 'Rappeler discrètement les réservistes et fortifier la frontière ouest.',
         {'tension': 60}, special={'manpower': .25, 'forts': 4, 'facing': ['GER']}),
    ndec('POL', 'pol_gold_evacuation', 'Évacuer l’or de la Banque', 40, 'Mettre les réserves d’or à l’abri à l’étranger.',
         {'war': True}, {'stability': 3}, special={'treasury': 500}),
    ndec('SPA', 'spa_people_army', 'Armée populaire', 80, 'Fondre les milices dans des brigades régulières.',
         {'war': True, 'spirit': 'popular_militias'}, spirit_id='people_army', days=None, remove=['popular_militias']),
    ndec('SPA', 'spa_reconstruction', 'Reconstruction nationale', 90, 'Relever les villes, les ponts et les usines détruits.',
         {'peace': True}, {'stability': 5}, special={'build': {'civ': 2}, 'infra': 4}),
    ndec('ROM', 'rom_ploiesti_defense', 'Défense de Ploiești', 50, 'Batteries antiaériennes et ballons autour des raffineries.',
         {'tension': 50}, special={'aa': 3}),
    ndec('ROM', 'rom_royal_front', 'Front de la renaissance nationale', 60, 'Un parti unique au service de la couronne.',
         {'ideology': ['authoritarian']}, {'stability': 6}, special={'party': 6, 'unrest': -10}),
    ndec('CZE', 'cze_mobilize', 'Mobilisation générale', 70, 'Un million d’hommes rejoignent les casemates.',
         {'tension': 45}, spirit_id='war_enthusiasm', days=180, special={'manpower': .3}),
    ndec('CZE', 'cze_skoda_contracts', 'Contrats d’exportation', 40, 'Vendre canons et chars aux armées étrangères.',
         {'peace': True}, cooldown=365, once=False, special={'treasury': 400}),
    ndec('TUR', 'tur_etatism', 'Étatisme industriel', 90, 'L’État construit les usines que le capital privé ne bâtit pas.',
         {}, special={'build': {'civ': 2, 'mil': 1}}),
    ndec('TUR', 'tur_close_straits', 'Fermer les détroits', 50, 'Interdire le passage des navires de guerre et fortifier les rives.',
         {'tension': 60}, special={'coastal': 4}),
    ndec('YUG', 'yug_mountain_redoubt', 'Réduit des montagnes', 60, 'Replier l’armée dans les montagnes de Bosnie.',
         {'war': True}, special={'militia': 3, 'forts': 4}),
    ndec('YUG', 'yug_bor_mines', 'Mines de Bor', 50, 'Développer les mines de cuivre de l’Est.',
         {}, spirit_id='prospecting', days=365),
    ndec('HUN', 'hun_gyor_program', 'Programme de Győr', 90, 'Un milliard de pengős pour l’armement.',
         {}, special={'build': {'mil': 2}}),
    ndec('HUN', 'hun_honved_expansion', 'Agrandir le Honvéd', 60, 'Rétablir le service militaire et doubler les effectifs.',
         {'tension': 50}, {'xp': 15}, special={'manpower': .2}),
    ndec('HOL', 'hol_inundation', 'Inonder la ligne d’eau', 50, 'Ouvrir les écluses pour noyer les polders devant l’ennemi.',
         {'war': True}, spirit_id='national_redoubt', days=365, special={'forts': 4, 'fortLevel': 2}),
    ndec('HOL', 'hol_indies_defense', 'Défense des Indes', 60, 'Batteries côtières et aérodromes à Java et Sumatra.',
         {'tension': 50}, special={'coastal': 4, 'aa': 2}),
    ndec('BEL', 'bel_kw_line', 'Ligne de défense de la Dyle', 60, 'Un fossé antichar et des abris entre Anvers et Namur.',
         {'tension': 45}, special={'forts': 5, 'facing': ['GER']}),
    ndec('BEL', 'bel_congo_gold', 'L’or du Congo', 40, 'Les ressources de la colonie financent la guerre.',
         {'war': True}, special={'treasury': 600}),
    ndec('SWE', 'swe_rearmament', 'Réarmement suédois', 80, 'Deux arsenaux et un programme d’aviation.',
         {'tension': 45}, special={'build': {'mil': 2}}),
    ndec('SWE', 'swe_civil_defense', 'Défense civile', 40, 'Abris et batteries autour des grandes villes.',
         {'tension': 55}, special={'aa': 4}),
    ndec('FIN', 'fin_isthmus_line', 'Fortifier l’isthme', 60, 'Bunkers et pièges antichars face à Leningrad.',
         {}, special={'forts': 4, 'facing': ['SOV']}),
    ndec('FIN', 'fin_total_mobilization', 'Mobilisation totale', 50, 'Toute la nation se met au service de l’armée.',
         {'war': True}, spirit_id='war_enthusiasm', days=120, special={'manpower': .3}),
    ndec('CAN', 'can_air_training', 'Plan d’entraînement aérien', 70, 'Des écoles de pilotage pour tout le Commonwealth.',
         {'tension': 40}, spirit_id='air_training_plan', days=None),
    ndec('CAN', 'can_victory_bonds', 'Emprunts de la victoire', 40, 'Les citoyens financent l’effort de guerre.',
         {'war': True}, {'support': 4}, cooldown=240, once=False, special={'treasury': 400}),
    ndec('AST', 'ast_northern_defense', 'Défense du Nord', 60, 'Fortifier Darwin et les côtes du Queensland.',
         {'tension': 55}, special={'coastal': 3, 'forts': 3}),
    ndec('AST', 'ast_war_cabinet', 'Cabinet de guerre', 50, 'Toute l’économie au service de la défense du continent.',
         {'war': True}, {'stability': 8}, spirit_id='women_workforce', days=365),
    ndec('RAJ', 'raj_volunteer_drive', 'Campagne de recrutement', 40, 'Des bureaux de recrutement dans tous les districts.',
         {}, cooldown=365, once=False, special={'manpower': .05}),
    ndec('RAJ', 'raj_tata_expansion', 'Expansion de Jamshedpur', 80, 'Agrandir les aciéries et les arsenaux de l’Inde.',
         {}, special={'build': {'civ': 1, 'mil': 2}}),
    ndec('BRA', 'bra_volta_redonda', 'Aciérie nationale', 90, 'Construire la première grande aciérie du pays.',
         {}, special={'build': {'civ': 2, 'mil': 1}}),
    ndec('BRA', 'bra_expeditionary', 'Corps expéditionnaire', 50, 'Envoyer une division combattre outre-mer.',
         {'war': True}, {'xp': 20}, special={'manpower': .05}),
]
catalog['decisions'] = [d for d in catalog['decisions'] if not d.get('c16')] + NATIONAL_DECISIONS

# --- AI strategic plans ----------------------------------------------------------------------
# Per country and target: a mode (attack, defend, hold, prepare), a weight on
# the fronts facing that target and objectives given by coordinates, so that
# they survive changes to the province map. "historical" plans only apply in
# historical campaigns; "from"/"until" are dates, "when"/"unless" test wars.
def obj(name, lon, lat):
    return {'name': name, 'lon': lon, 'lat': lat}


WARSAW, DANZIG = obj('Varsovie', 21.01, 52.23), obj('Dantzig', 18.65, 54.35)
PARIS, SEDAN, DUNKIRK = obj('Paris', 2.35, 48.86), obj('Sedan', 4.94, 49.70), obj('Dunkerque', 2.38, 51.03)
BRUSSELS, ROTTERDAM = obj('Bruxelles', 4.35, 50.85), obj('Rotterdam', 4.48, 51.92)
MINSK, SMOLENSK, MOSCOW = obj('Minsk', 27.56, 53.90), obj('Smolensk', 32.05, 54.78), obj('Moscou', 37.62, 55.75)
KIEV, LENINGRAD, ROSTOV = obj('Kiev', 30.52, 50.45), obj('Leningrad', 30.31, 59.94), obj('Rostov', 39.72, 47.24)
BERLIN, KONIGSBERG, VIENNA = obj('Berlin', 13.40, 52.52), obj('Königsberg', 20.51, 54.71), obj('Vienne', 16.37, 48.21)
catalog['aiPlans16'] = {
    'GER': [
        {'target': 'POL', 'mode': 'attack', 'weight': 3, 'objectives': [WARSAW, DANZIG]},
        {'target': 'FRA', 'mode': 'hold', 'weight': .7, 'historical': True, 'unless': {'war': ['BEL', 'HOL']}},
        {'target': 'FRA', 'mode': 'attack', 'weight': 1.5, 'objectives': [SEDAN, PARIS, DUNKIRK]},
        {'target': 'BEL', 'mode': 'attack', 'weight': 3, 'objectives': [BRUSSELS, SEDAN]},
        {'target': 'HOL', 'mode': 'attack', 'weight': 1.2, 'objectives': [ROTTERDAM]},
        {'target': 'SOV', 'mode': 'prepare', 'weight': 3, 'historical': True, 'from': '1941-03-15'},
        {'target': 'SOV', 'mode': 'attack', 'weight': 3, 'objectives': [MINSK, KIEV, LENINGRAD, SMOLENSK, MOSCOW, ROSTOV]},
        {'target': 'YUG', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Belgrade', 20.46, 44.82), obj('Zagreb', 15.98, 45.81)]},
        {'target': 'GRE', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Thessalonique', 22.94, 40.64), obj('Athènes', 23.73, 37.98)]},
        {'target': 'DEN', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Copenhague', 12.57, 55.68)]},
        {'target': 'NOR', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Oslo', 10.75, 59.91), obj('Narvik', 17.43, 68.44)]},
        {'target': 'CZE', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Prague', 14.42, 50.09)]},
        {'target': 'GBR', 'mode': 'defend', 'weight': 1, 'share': .12, 'historical': True},
    ],
    'SOV': [
        {'target': 'POL', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Lwów', 24.03, 49.84), obj('Brest-Litovsk', 23.70, 52.10)]},
        {'target': 'FIN', 'mode': 'attack', 'weight': 2, 'share': .3, 'limited': True, 'historical': True, 'until': '1941-01-01',
         'objectives': [obj('Viipuri', 28.73, 60.71), obj('Sortavala', 30.70, 61.70)]},
        {'target': 'FIN', 'mode': 'attack', 'weight': 2, 'share': .3, 'objectives': [obj('Viipuri', 28.73, 60.71), obj('Helsinki', 24.94, 60.17)]},
        {'target': 'GER', 'mode': 'defend', 'weight': 2, 'until': '1942-11-01', 'historical': True},
        {'target': 'GER', 'mode': 'attack', 'weight': 2.5, 'objectives': [KONIGSBERG, WARSAW, BERLIN]},
        {'target': 'ROM', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Bucarest', 26.10, 44.43)]},
        {'target': 'JPN', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Harbin', 126.63, 45.75), obj('Moukden', 123.43, 41.80)]},
        {'target': 'MAN', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Harbin', 126.63, 45.75), obj('Moukden', 123.43, 41.80)]},
    ],
    'JPN': [
        {'target': 'CHI', 'mode': 'attack', 'weight': 3, 'objectives': [obj('Pékin', 116.40, 39.90), obj('Shanghai', 121.47, 31.23),
                                                                        obj('Nankin', 118.80, 32.06), obj('Wuhan', 114.30, 30.59), obj('Canton', 113.26, 23.13)]},
        {'target': 'USA', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Manille', 120.98, 14.60), obj('Guam', 144.79, 13.44)]},
        {'target': 'GBR', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Hong Kong', 114.17, 22.30), obj('Singapour', 103.82, 1.35), obj('Rangoun', 96.16, 16.84)]},
        {'target': 'HOL', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Batavia', 106.85, -6.21), obj('Palembang', 104.75, -2.98)]},
        {'target': 'SOV', 'mode': 'defend', 'weight': 1},
    ],
    'ITA': [
        {'target': 'ETH', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Addis-Abeba', 38.75, 9.03)]},
        {'target': 'FRA', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Nice', 7.26, 43.70), obj('Marseille', 5.37, 43.30)]},
        {'target': 'GBR', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Alexandrie', 29.92, 31.20), obj('Suez', 32.55, 29.97)]},
        {'target': 'GRE', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Ioannina', 20.85, 39.66), obj('Athènes', 23.73, 37.98)]},
        {'target': 'ALB', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Tirana', 19.82, 41.33)]},
        {'target': 'YUG', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Ljubljana', 14.51, 46.06)]},
    ],
    'FRA': [
        {'target': 'GER', 'mode': 'hold', 'weight': 2, 'historical': True, 'until': '1940-09-01'},
        {'target': 'GER', 'mode': 'defend', 'weight': 2, 'until': '1943-01-01'},
        {'target': 'GER', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Sarrebruck', 6.99, 49.24), obj('Francfort', 8.68, 50.11), BERLIN]},
        {'target': 'ITA', 'mode': 'defend', 'weight': 1},
    ],
    'GBR': [
        {'target': 'GER', 'mode': 'defend', 'weight': 2, 'until': '1943-06-01', 'historical': True, 'share': .35},
        {'target': 'GER', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Ruhr', 7.10, 51.45), BERLIN]},
        {'target': 'ITA', 'mode': 'attack', 'weight': 1.5, 'objectives': [obj('Tobrouk', 23.96, 32.08), obj('Tripoli', 13.19, 32.89), obj('Rome', 12.50, 41.90)]},
        {'target': 'JPN', 'mode': 'defend', 'weight': 1},
    ],
    'USA': [
        {'target': 'JPN', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Manille', 120.98, 14.60), obj('Okinawa', 127.68, 26.21), obj('Kyūshū', 130.70, 32.80)]},
        {'target': 'GER', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Normandie', -0.37, 49.18), PARIS, BERLIN]},
        {'target': 'ITA', 'mode': 'attack', 'weight': 1, 'objectives': [obj('Sicile', 14.00, 37.50), obj('Rome', 12.50, 41.90)]},
    ],
    'POL': [{'target': 'GER', 'mode': 'defend', 'weight': 2}, {'target': 'SOV', 'mode': 'defend', 'weight': 1}],
    'CHI': [{'target': 'JPN', 'mode': 'defend', 'weight': 2}, {'target': 'MAN', 'mode': 'defend', 'weight': 1}],
    'FIN': [{'target': 'SOV', 'mode': 'defend', 'weight': 2}],
    'CZE': [{'target': 'GER', 'mode': 'defend', 'weight': 2}],
    'BEL': [{'target': 'GER', 'mode': 'defend', 'weight': 2}],
    'HOL': [{'target': 'GER', 'mode': 'defend', 'weight': 2}],
    'YUG': [{'target': 'GER', 'mode': 'defend', 'weight': 1.5}, {'target': 'ITA', 'mode': 'defend', 'weight': 1}],
    'GRE': [{'target': 'ITA', 'mode': 'defend', 'weight': 1.5}, {'target': 'GER', 'mode': 'defend', 'weight': 1.5}],
    'NAT': [{'target': 'SPA', 'mode': 'attack', 'weight': 2, 'objectives': [obj('Madrid', -3.70, 40.42), obj('Barcelone', 2.17, 41.39)]}],
    'SPA': [{'target': 'NAT', 'mode': 'defend', 'weight': 2}],
}
for tag, plans in catalog['aiPlans16'].items():
    for plan in plans:
        assert plan['mode'] in ('attack', 'defend', 'hold', 'prepare'), (tag, plan)

CATALOG.write_text(json.dumps(catalog, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
print('focus', {k: len(v) for k, v in catalog['focus'].items()}, 'techs', len(catalog['techs']), 'events16', len(catalog['events16']))
