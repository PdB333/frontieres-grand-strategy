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
catalog['spirits'] = [s for s in catalog['spirits'] if not s.get('c16')] + NEW_SPIRITS

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
