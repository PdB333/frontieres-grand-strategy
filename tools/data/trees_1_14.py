#!/usr/bin/env python3
"""Frontieres 1.14 national focus trees for the great powers (idempotent).

  python3 tools/data/trees_1_14.py

Run after content_1_6.py (and the later data passes). Replaces the focus
trees of Germany, the Soviet Union, the United Kingdom, France, the United
States, Italy, Japan and China with trees of their own: national branches
for industry and research, the army, the air force, the navy, intelligence
and foreign policy, tied to the systems added since 1.9 (generals, railways
and rolling stock, intelligence, special weapons). The political paths of
content_1_6.py (regime changes) are kept, to the right of the national
branches. Focus names refer to historical programmes and events of the
period; their effects and the structure of the trees are original game
content. The totals stay close to those of the 1.6 trees, which the AI
balance was tuned with.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
SPIRITS = {s['id'] for s in catalog['spirits']}
TECH_GROUPS = {t['group'] for t in catalog['techs']}
EFFECTS = {'pp', 'stability', 'support', 'manpower', 'xp', 'civ', 'mil', 'dock', 'slots', 'tension', 'fuel', 'production',
           'construction', 'research', 'attack', 'defense', 'supply', 'planning', 'speed', 'armor', 'air', 'bombing', 'navy',
           'raiding', 'intel', 'organization', 'breakthrough', 'entrench', 'attrition', 'convoy', 'naval', 'resources',
           'surrender', 'recruitment', 'invasion', 'paradrop', 'airDefense', 'consumer', 'ppGain', 'supportGrowth',
           'stabilityGrowth'} | set(catalog['equipment'])
SPECIALS = {'build', 'refinery', 'infra', 'forts', 'facing', 'fortLevel', 'coastal', 'aa', 'radar', 'militia', 'colonial',
            'integrate', 'dominions'}


def n(fid, name, col, row, days, req=(), effect=None, **extra):
    entry = {'id': fid, 'name': name, 'days': days, 'req': list(req), 'effect': effect or {}, 'col': col, 'row': row,
             'exclusive': extra.pop('exclusive', None), 'c16': True, 'national': True}
    entry.update({k: v for k, v in extra.items() if v is not None})
    return entry


def rb(group, value=.6, uses=2):
    return {'group': group, 'value': value, 'uses': uses}


# Extra keys read by systems.js ("National trees (1.14)"): agency (found the
# intelligence agency), agents (recruit operatives), officers (raise
# generals of a given skill), rail (raise by one the railway level of the
# busiest provinces). Equipment keys in effect (trains, railwayGuns...) go
# to the national stock.
TREES = {}

TREES['GER'] = [
    # Industry and research: the four-year plan, synthetic fuel, armament.
    n('ger_four_year', 'Plan de quatre ans', 0, 0, 70, (), {'pp': 25, 'civ': 3}, spirits=['four_year']),
    n('ger_reichswerke', 'Aciéries d’État', 0, 1, 60, ['ger_four_year'], {'resources': .08}, special={'build': {'mil': 3}}),
    n('ger_buna', 'Caoutchouc synthétique', 1, 1, 60, ['ger_four_year'], {'fuel': 4000, 'resources': .04}, special={'refinery': 1}),
    n('ger_reichsbahn', 'Reichsbahn militaire', 0, 2, 60, ['ger_reichswerke'], {'trains': 120, 'supply': .08}, rail=10),
    n('ger_leuna', 'Hydrogénation du charbon', 1, 2, 70, ['ger_buna'], {'fuel': 10000}, special={'refinery': 1},
      researchBonus=[rb('industry', .5, 2)]),
    n('ger_autobahn', 'Autoroutes du Reich', 0, 3, 60, ['ger_reichsbahn'], {'trucks': 800, 'civ': 3, 'construction': .08},
      special={'infra': 8}),
    n('ger_volkswagen', 'Usines automobiles', 1, 3, 60, ['ger_leuna'], {'civ': 2, 'production': .04, 'trucks': 600}),
    n('ger_institutes', 'Instituts de recherche du Reich', 0, 4, 60, ['ger_autobahn'], {'slots': 1, 'research': .04}),
    n('ger_speer', 'Rationalisation de l’armement', 1, 4, 80, ['ger_volkswagen'], {'production': .1, 'mil': 3}, requires={'war': True}),
    n('ger_peenemunde', 'Centre d’essais de Peenemünde', 0, 5, 70, ['ger_institutes'], {'slots': 1, 'research': .04},
      researchBonus=[rb('electronics', .6, 2)]),
    n('ger_total_war', 'Économie de guerre totale', 1, 5, 90, ['ger_speer'], {'mil': 4, 'consumer': -.03, 'construction': .08},
      spirits=['women_workforce']),
    n('ger_uranium', 'Club de l’uranium', 0, 6, 90, ['ger_peenemunde'], {'research': .05}, requires={'year': 1939},
      researchBonus=[rb('electronics', 1, 2)]),
    n('ger_underground', 'Usines souterraines', 1, 6, 70, ['ger_total_war'], {'construction': .05}, special={'build': {'mil': 3, 'civ': 2}}),
    # Army: rearmament, armoured doctrine, the general staff.
    n('ger_wehrmacht', 'Wehrmacht', 2, 0, 60, (), {'manpower': 100000, 'xp': 20, 'pp': 20}),
    n('ger_panzer', 'Divisions blindées', 2, 1, 70, ['ger_wehrmacht'], {'tanks': 300, 'armor': .05}, researchBonus=[rb('armor', .8, 3)]),
    n('ger_general_staff', 'Grand état-major', 3, 1, 60, ['ger_wehrmacht'], {'planning': .1}, officers={'count': 2, 'skill': 3}),
    n('ger_blitz', 'Guerre éclair', 2, 2, 80, ['ger_panzer'], {'breakthrough': .08, 'speed': .05, 'attack': .05},
      spirits=['blitz_doctrine'], exclusive=['ger_mass_assault']),
    n('ger_mass_assault', 'Infanterie de masse', 3, 2, 80, ['ger_general_staff'], {'defense': .05, 'attack': .03, 'manpower': 150000},
      exclusive=['ger_blitz']),
    n('ger_paratroopers', 'Troupes aéroportées', 2, 3, 60, [], {'paradrop': .2, 'transportPlanes': 60}, reqAny=['ger_blitz', 'ger_mass_assault']),
    n('ger_mountain', 'Chasseurs alpins', 3, 3, 50, [], {'xp': 15, 'attack': .03}, reqAny=['ger_blitz', 'ger_mass_assault'],
      researchBonus=[rb('infantry', .6, 2)]),
    n('ger_railway_guns', 'Artillerie lourde sur rail', 2, 4, 60, ['ger_paratroopers'], {'railwayGuns': 4}, researchBonus=[rb('infantry', .5, 1)]),
    n('ger_westwall', 'Mur de l’Ouest', 3, 4, 70, ['ger_mountain'], {'entrench': .05, 'defense': .05}, special={'forts': 8, 'facing': ['FRA']}),
    n('ger_motorised', 'Infanterie motorisée', 2, 5, 60, ['ger_railway_guns'], {'trucks': 1500, 'supply': .08, 'speed': .03}),
    n('ger_war_academy', 'Académie de guerre', 3, 5, 60, ['ger_westwall'], {'xp': 30, 'planning': .1, 'organization': .05}),
    n('ger_winter', 'Préparer la campagne d’hiver', 2, 6, 50, ['ger_motorised'], {'attrition': .1}, spirits=['winter_gear'],
      requires={'year': 1941}),
    # Air force.
    n('ger_luftwaffe', 'Luftwaffe', 4, 0, 60, (), {'fighters': 150, 'air': .05}, researchBonus=[rb('air', .6, 2)]),
    n('ger_stuka', 'Bombardiers en piqué', 4, 1, 60, ['ger_luftwaffe'], {'cas': 120}, researchBonus=[rb('air_doctrine', 1, 1)]),
    n('ger_spain_lessons', 'Leçons de la guerre d’Espagne', 4, 2, 50, ['ger_stuka'], {'air': .05, 'xp': 15}),
    n('ger_radar', 'Réseau radar', 4, 3, 60, ['ger_spain_lessons'], {'airDefense': .1}, special={'radar': 4, 'aa': 6}),
    n('ger_v_weapons', 'Armes de représailles', 4, 4, 90, ['ger_radar'], {}, requires={'year': 1941}, researchBonus=[rb('electronics', 1, 2)]),
    n('ger_jets', 'Chasseurs à réaction', 4, 5, 90, ['ger_v_weapons'], {}, requires={'year': 1942}, researchBonus=[rb('air', 1, 2)]),
    # Navy and intelligence.
    n('ger_plan_z', 'Plan Z', 5, 0, 70, (), {'dock': 2, 'navy': .05}, exclusive=['ger_u_boats']),
    n('ger_u_boats', 'Arme sous-marine', 6, 0, 70, (), {'submarines': 12, 'raiding': .1}, exclusive=['ger_plan_z']),
    n('ger_enigma', 'Machines à chiffrer', 5, 1, 50, [], {'intel': .05}, reqAny=['ger_plan_z', 'ger_u_boats'], agency=True),
    n('ger_wolfpacks', 'Tactique des meutes', 6, 1, 60, ['ger_u_boats'], {'raiding': .1, 'submarines': 10}),
    n('ger_abwehr', 'Abwehr', 5, 2, 50, ['ger_enigma'], {'intel': .1}, agents=2),
    n('ger_b_dienst', 'Service d’écoute navale', 6, 2, 50, ['ger_enigma'], {'naval': .05, 'intel': .05}),
    n('ger_atlantic_wall', 'Mur de l’Atlantique', 5, 3, 70, ['ger_abwehr'], {}, special={'coastal': 6, 'forts': 4}, requires={'war': True}),
    # Foreign policy: the road to war.
    n('ger_rhineland', 'Remilitariser la Rhénanie', 7, 0, 40, (), {'pp': 40, 'tension': 5}),
    n('ger_anschluss', 'L’Anschluss', 7, 1, 60, ['ger_rhineland'], {'pp': 30, 'tension': 10}, claims=['AUS'], requires={'tension': 25}),
    n('ger_sudetes', 'Les Sudètes', 7, 2, 60, ['ger_anschluss'], {'pp': 30, 'tension': 10}, claims=['CZE'], requires={'tension': 40}),
    n('ger_steel_pact', 'Rapprochement avec Rome', 8, 2, 50, ['ger_anschluss'], {'pp': 20}, relations={'ITA': 40}),
    n('ger_danzig', 'Dantzig ou la guerre', 7, 3, 60, ['ger_sudetes'], {'pp': 30, 'tension': 10}, claims=['POL'], requires={'tension': 55}),
    n('ger_molotov', 'Pacte germano-soviétique', 8, 3, 50, ['ger_steel_pact'], {'pp': 30}, relations={'SOV': 50},
      exclusive=['ger_anti_comintern']),
    n('ger_anti_comintern', 'Pacte anti-Komintern', 9, 3, 50, ['ger_steel_pact'], {'pp': 20}, relations={'JPN': 50, 'ITA': 20},
      exclusive=['ger_molotov']),
    n('ger_balkans', 'Ordre nouveau dans les Balkans', 7, 4, 60, ['ger_danzig'], {'fuel': 6000, 'resources': .04},
      relations={'HUN': 30, 'ROM': 30, 'BUL': 30}),
    n('ger_lebensraum', 'Espace vital à l’Est', 8, 4, 80, [], {'attack': .05}, reqAny=['ger_molotov', 'ger_anti_comintern'],
      claims=['SOV'], requires={'ideology': ['fascist']}),
    n('ger_propaganda', 'Ministère de la Propagande', 9, 0, 50, (), {'stability': 8, 'support': 10, 'ppGain': .05}),
    n('ger_olympics', 'Jeux olympiques de Berlin', 9, 1, 40, ['ger_propaganda'], {'pp': 40, 'stability': 5}),
    n('ger_labour_front', 'Front du travail', 9, 2, 50, ['ger_olympics'], {'stability': 6, 'production': .04}),
]

TREES['SOV'] = [
    # Industry and research: the five-year plans and the industry of the Urals.
    n('sov_second_plan', 'Deuxième plan quinquennal', 0, 0, 70, (), {'civ': 4, 'construction': .05, 'pp': 25}),
    n('sov_magnitogorsk', 'Combinats de l’Oural', 0, 1, 60, ['sov_second_plan'], {'resources': .08}, special={'build': {'mil': 3}}),
    n('sov_stakhanov', 'Mouvement stakhanoviste', 1, 1, 60, ['sov_second_plan'], {'production': .05, 'stability': -3, 'civ': 3}),
    n('sov_third_plan', 'Troisième plan quinquennal', 0, 2, 80, ['sov_magnitogorsk'], {'mil': 3, 'civ': 3, 'construction': .08, 'production': .04}),
    n('sov_baikal', 'Doubler le Transsibérien', 1, 2, 70, ['sov_stakhanov'], {'trains': 200, 'supply': .05}, rail=16),
    n('sov_academy', 'Académie des sciences', 0, 3, 60, ['sov_third_plan'], {'slots': 1, 'research': .04}),
    n('sov_baku', 'Pétrole de Bakou', 1, 3, 60, ['sov_baikal'], {'fuel': 10000, 'resources': .05}, special={'refinery': 1}),
    n('sov_design_bureaus', 'Bureaux d’études', 0, 4, 70, ['sov_academy'], {'slots': 1, 'research': .04}, researchBonus=[rb('industry', .5, 2)]),
    n('sov_evacuation', 'Plans d’évacuation des usines', 1, 4, 60, ['sov_baku'], {'construction': .05}, special={'build': {'mil': 2, 'civ': 1}}),
    n('sov_lab2', 'Laboratoire n° 2', 0, 5, 90, ['sov_design_bureaus'], {'research': .05}, requires={'year': 1942},
      researchBonus=[rb('electronics', 1, 3)]),
    n('sov_ural_arsenal', 'Arsenal de l’Oural', 1, 5, 90, ['sov_evacuation'], {'mil': 4, 'production': .06}, requires={'war': True}),
    n('sov_lend_lease', 'Routes du prêt-bail', 1, 6, 50, ['sov_ural_arsenal'], {'trucks': 1500}, relations={'GBR': 20, 'USA': 20},
      requires={'war': True}),
    # Army: the purges and the rebuilding of command.
    n('sov_red_army', 'Armée rouge', 2, 0, 60, (), {'manpower': 150000, 'xp': 15, 'pp': 20}),
    n('sov_purges_end', 'Mettre fin aux purges', 2, 1, 60, ['sov_red_army'], {'stability': -5, 'planning': .05},
      removeSpirits=['purges', 'purged_army'], requires={'year': 1938}),
    n('sov_mech_corps', 'Corps mécanisés', 3, 1, 70, ['sov_red_army'], {'tanks': 250}, researchBonus=[rb('armor', .8, 3)]),
    n('sov_deep_battle', 'Bataille en profondeur', 2, 2, 70, ['sov_purges_end'], {'breakthrough': .06, 'attack': .05},
      researchBonus=[rb('doctrine', 1, 2)], exclusive=['sov_mass_assault']),
    n('sov_mass_assault', 'Assaut de masse', 3, 2, 70, ['sov_mech_corps'], {'manpower': 300000, 'recruitment': .1, 'defense': .05},
      exclusive=['sov_deep_battle']),
    n('sov_stavka', 'Stavka', 2, 3, 60, [], {'planning': .1}, reqAny=['sov_deep_battle', 'sov_mass_assault'], officers={'count': 3, 'skill': 3}),
    n('sov_t34', 'Char moyen T-34', 3, 3, 80, [], {'tanks': 300, 'armor': .05}, reqAny=['sov_deep_battle', 'sov_mass_assault'],
      researchBonus=[rb('armor', .8, 2)]),
    n('sov_stalin_line', 'Ligne Staline', 2, 4, 70, ['sov_stavka'], {'entrench': .05, 'defense': .05}, special={'forts': 10}),
    n('sov_katyusha', 'Lance-roquettes Katioucha', 3, 4, 60, ['sov_t34'], {'rocketArtillery': 200}, researchBonus=[rb('infantry', .6, 2)]),
    n('sov_winter_war', 'Leçons de la guerre d’hiver', 2, 5, 60, ['sov_stalin_line'], {'xp': 20}, spirits=['winter_gear']),
    n('sov_guards', 'Divisions de la Garde', 3, 5, 60, ['sov_katyusha'], {'organization': .05, 'xp': 30, 'attack': .04}),
    n('sov_partisans', 'Mouvement des partisans', 2, 6, 50, ['sov_winter_war'], {'intel': .05}, special={'militia': 4},
      requires={'war': True}),
    # Air force.
    n('sov_vvs', 'Forces aériennes soviétiques', 4, 0, 60, (), {'fighters': 200, 'cas': 100}, researchBonus=[rb('air', .6, 2)]),
    n('sov_sturmovik', 'Avions d’assaut blindés', 4, 1, 60, ['sov_vvs'], {'cas': 150}, researchBonus=[rb('air_doctrine', 1, 1)]),
    n('sov_long_range', 'Aviation à long rayon d’action', 4, 2, 60, ['sov_sturmovik'], {'bombers': 80, 'bombing': .05}),
    n('sov_airborne', 'Troupes aéroportées', 4, 3, 60, ['sov_long_range'], {'paradrop': .2, 'transportPlanes': 60}),
    # Navy and intelligence.
    n('sov_big_fleet', 'Grande flotte océanique', 5, 0, 80, (), {'dock': 3, 'navy': .05}, exclusive=['sov_coastal_fleet']),
    n('sov_coastal_fleet', 'Flotte de défense côtière', 6, 0, 50, (), {'submarines': 10, 'destroyers': 6}, special={'coastal': 4},
      exclusive=['sov_big_fleet']),
    n('sov_nkvd', 'NKVD', 5, 1, 50, [], {'intel': .1}, reqAny=['sov_big_fleet', 'sov_coastal_fleet'], agency=True),
    n('sov_red_orchestra', 'Réseaux à l’étranger', 5, 2, 60, ['sov_nkvd'], {'intel': .05}, agents=3),
    n('sov_smersh', 'Contre-espionnage militaire', 6, 2, 50, ['sov_nkvd'], {'intel': .05, 'stability': 3}),
    # Foreign policy.
    n('sov_comintern', 'Komintern', 7, 0, 40, (), {'pp': 50, 'stability': 5}),
    n('sov_collective', 'Sécurité collective', 7, 1, 50, ['sov_comintern'], {'pp': 20}, relations={'FRA': 40, 'GBR': 30},
      exclusive=['sov_partition']),
    n('sov_partition', 'Partage de l’Europe orientale', 8, 1, 50, ['sov_comintern'], {'pp': 20}, relations={'GER': 40},
      exclusive=['sov_collective']),
    n('sov_spain', 'Aide à la République espagnole', 7, 2, 40, ['sov_collective'], {'xp': 15}, relations={'SPA': 50}),
    n('sov_baltic', 'Bases dans la Baltique', 8, 2, 60, ['sov_partition'], {'tension': 5}, claims=['EST', 'LAT', 'LIT']),
    n('sov_karelia', 'Sécurité de Leningrad', 7, 3, 60, [], {'tension': 5}, reqAny=['sov_spain', 'sov_baltic'], claims=['FIN']),
    n('sov_bessarabia', 'Bessarabie', 8, 3, 60, ['sov_baltic'], {'tension': 5}, claims=['ROM']),
    n('sov_great_patriotic', 'Grande Guerre patriotique', 7, 4, 50, [], {'support': 15, 'manpower': 300000, 'stability': 10},
      reqAny=['sov_karelia', 'sov_bessarabia'], requires={'war': True}, spirits=['war_enthusiasm']),
    n('sov_mongolia', 'Protéger la Mongolie', 9, 0, 40, (), {'pp': 20, 'ppGain': .05}, guarantee=['MON'], relations={'MON': 30}),
    n('sov_khalkhin', 'Leçons du Khalkhin Gol', 9, 1, 50, ['sov_mongolia'], {'xp': 20, 'armor': .03}),
    n('sov_far_east', 'Front d’Extrême-Orient', 9, 2, 60, ['sov_khalkhin'], {'defense': .05}, special={'forts': 4, 'facing': ['JPN', 'MAN']}),
]

TREES['GBR'] = [
    # Industry and research.
    n('gbr_shadow', 'Usines fantômes', 0, 0, 60, (), {'mil': 2, 'civ': 3, 'production': .04}),
    n('gbr_rearm', 'Réarmement britannique', 0, 1, 70, ['gbr_shadow'], {'production': .06}, special={'build': {'mil': 2}},
      requires={'tension': 20}),
    n('gbr_empire_res', 'Ressources de l’Empire', 1, 1, 60, ['gbr_shadow'], {'resources': .1, 'fuel': 6000, 'civ': 2}),
    n('gbr_ministry_supply', 'Ministère du ravitaillement', 0, 2, 60, ['gbr_rearm'], {'supply': .08, 'trucks': 600, 'trains': 80}),
    n('gbr_sterling', 'Zone sterling', 1, 2, 50, ['gbr_empire_res'], {'pp': 40, 'civ': 3}, relations={'CAN': 20, 'AST': 20, 'SAF': 20}),
    n('gbr_ministry_aircraft', 'Ministère de la production aéronautique', 0, 3, 70, ['gbr_ministry_supply'], {'fighters': 150},
      special={'build': {'mil': 2}}, researchBonus=[rb('air', .7, 2)]),
    n('gbr_tizard', 'Comité scientifique de défense', 1, 3, 60, ['gbr_sterling'], {'slots': 1, 'research': .04}),
    n('gbr_arsenal', 'Usines de l’Empire', 0, 4, 80, ['gbr_ministry_aircraft'], {'mil': 3}, special={'build': {'civ': 2}}),
    n('gbr_cambridge', 'Laboratoires universitaires', 1, 4, 60, ['gbr_tizard'], {'slots': 1, 'research': .04},
      researchBonus=[rb('electronics', .6, 2)]),
    n('gbr_war_cabinet', 'Cabinet de guerre', 0, 5, 50, ['gbr_arsenal'], {'stability': 5, 'support': 10, 'production': .06,
                                                                           'construction': .08}, requires={'war': True}),
    n('gbr_tube_alloys', 'Projet Tube Alloys', 1, 5, 90, ['gbr_cambridge'], {'research': .05}, requires={'year': 1940},
      researchBonus=[rb('electronics', 1, 2)]),
    n('gbr_mobilisation', 'Mobilisation de l’économie', 0, 6, 70, ['gbr_war_cabinet'], {'mil': 3, 'construction': .08},
      spirits=['women_workforce'], requires={'war': True}),
    # Army.
    n('gbr_regular_army', 'Armée de métier', 2, 0, 60, (), {'manpower': 100000, 'xp': 15, 'pp': 20}),
    n('gbr_bef', 'Corps expéditionnaire', 2, 1, 60, ['gbr_regular_army'], {'attack': .04, 'defense': .05}),
    n('gbr_mechanisation', 'Mécanisation de la cavalerie', 3, 1, 60, ['gbr_regular_army'], {'tanks': 200, 'trucks': 600},
      researchBonus=[rb('armor', .7, 2)]),
    n('gbr_staff_college', 'Collège d’état-major', 2, 2, 50, ['gbr_bef'], {'planning': .1}, officers={'count': 2, 'skill': 3}),
    n('gbr_armoured', 'Divisions blindées', 3, 2, 70, ['gbr_mechanisation'], {'breakthrough': .05, 'attack': .04}),
    n('gbr_eighth_army', 'Armée du désert', 2, 3, 60, ['gbr_staff_college'], {'xp': 20, 'supply': .08, 'trucks': 800}),
    n('gbr_commandos', 'Commandos', 3, 3, 50, ['gbr_armoured'], {'invasion': .15, 'xp': 15}),
    n('gbr_home_guard', 'Garde territoriale', 2, 4, 50, ['gbr_eighth_army'], {'defense': .05}, special={'militia': 4}, requires={'war': True}),
    n('gbr_airborne', 'Division aéroportée', 3, 4, 60, ['gbr_commandos'], {'paradrop': .2, 'transportPlanes': 50}),
    # Air force: radar and the commands.
    n('gbr_radar', 'Chaîne radar côtière', 4, 0, 70, (), {'airDefense': .1}, special={'radar': 6}, researchBonus=[rb('electronics', .8, 2)]),
    n('gbr_fighter_command', 'Commandement de la chasse', 4, 1, 60, ['gbr_radar'], {'air': .05, 'fighters': 100}),
    n('gbr_bomber_command', 'Commandement du bombardement', 4, 2, 60, ['gbr_fighter_command'], {'strategicBombers': 40, 'bombing': .1}),
    n('gbr_air_training', 'Plan d’entraînement aérien de l’Empire', 4, 3, 60, ['gbr_bomber_command'], {'air': .05},
      spirits=['air_training_plan']),
    # Navy.
    n('gbr_home_fleet', 'Flotte métropolitaine', 5, 0, 60, (), {'navy': .05, 'dock': 1}),
    n('gbr_convoys', 'Système des convois', 5, 1, 50, ['gbr_home_fleet'], {'convoys': 60, 'convoy': .2}),
    n('gbr_asdic', 'Asdic et escortes', 6, 1, 60, ['gbr_home_fleet'], {'destroyers': 10}, researchBonus=[rb('naval_doctrine', 1, 1)]),
    n('gbr_carriers', 'Aéronavale', 5, 2, 70, ['gbr_convoys'], {}, researchBonus=[rb('navy', .8, 2)]),
    n('gbr_singapore', 'Bastion de Singapour', 6, 2, 60, ['gbr_asdic'], {}, special={'coastal': 5, 'forts': 2}),
    n('gbr_mediterranean', 'Flotte de Méditerranée', 5, 3, 60, ['gbr_carriers'], {'cruisers': 4, 'naval': .05}),
    # Intelligence.
    n('gbr_secret_service', 'Service de renseignement secret', 7, 0, 50, (), {'intel': .05}, agency=True),
    n('gbr_ultra', 'Station de décryptement', 7, 1, 60, ['gbr_secret_service'], {'intel': .1}, spirits=['decrypt']),
    n('gbr_soe', 'Opérations spéciales', 7, 2, 50, ['gbr_ultra'], {}, agents=3),
    # Foreign policy: appeasement or resistance.
    n('gbr_entente', 'Entente cordiale', 8, 0, 40, (), {'pp': 30}, relations={'FRA': 40}),
    n('gbr_appeasement', 'Apaisement', 8, 1, 50, ['gbr_entente'], {'pp': 40, 'stability': 5}, exclusive=['gbr_guarantees']),
    n('gbr_guarantees', 'Garanties à l’Europe', 9, 1, 50, ['gbr_entente'], {'pp': 20}, guarantee=['POL', 'ROM', 'GRE'],
      requires={'tension': 40}, exclusive=['gbr_appeasement']),
    n('gbr_dominions', 'Conférence impériale', 8, 2, 50, [], {'pp': 20}, reqAny=['gbr_appeasement', 'gbr_guarantees'],
      special={'dominions': True}),
    n('gbr_raj', 'Armée des Indes', 9, 2, 60, ['gbr_guarantees'], {'manpower': 300000}, relations={'RAJ': 30}),
    n('gbr_special_relation', 'Relation spéciale', 8, 3, 60, ['gbr_dominions'], {'trucks': 600, 'rifles': 4000}, relations={'USA': 50}),
    n('gbr_blood_toil', 'Du sang, du labeur, des larmes', 9, 3, 40, [], {'support': 20, 'surrender': .1},
      reqAny=['gbr_raj', 'gbr_dominions'], requires={'war': True}, spirits=['national_union']),
    n('gbr_broadcasting', 'Service mondial de la radio', 9, 0, 50, (), {'stability': 5, 'support': 10, 'ppGain': .05}),
]

TREES['FRA'] = [
    # Industry and research.
    n('fra_popular_front', 'Accords Matignon', 0, 0, 50, (), {'stability': 6, 'production': -.03}, spirits=['social_reforms'],
      exclusive=['fra_decree_laws']),
    n('fra_decree_laws', 'Décrets-lois', 1, 0, 50, (), {'production': .05, 'stability': -4}, exclusive=['fra_popular_front']),
    n('fra_nationalisation', 'Nationaliser l’armement', 0, 1, 60, [], {'mil': 3, 'civ': 2}, reqAny=['fra_popular_front', 'fra_decree_laws']),
    n('fra_sncf', 'Société nationale des chemins de fer', 1, 1, 50, [], {'trains': 120, 'civ': 2}, rail=10,
      reqAny=['fra_popular_front', 'fra_decree_laws']),
    n('fra_plan_1936', 'Plan de réarmement de 1936', 0, 2, 80, ['fra_nationalisation'], {'production': .06}, special={'build': {'mil': 2}}),
    n('fra_dispersal', 'Décentralisation industrielle', 1, 2, 70, ['fra_sncf'], {}, special={'build': {'mil': 2, 'civ': 2}}),
    n('fra_armament_ministry', 'Ministère de l’Armement', 0, 3, 60, ['fra_plan_1936'], {'mil': 3, 'construction': .08},
      requires={'tension': 40}),
    n('fra_imperial_res', 'Ressources de l’empire colonial', 1, 3, 60, ['fra_dispersal'], {'resources': .1, 'fuel': 6000, 'civ': 2}),
    n('fra_cnrs', 'Centre national de la recherche', 0, 4, 60, ['fra_armament_ministry'], {'slots': 1, 'research': .04}),
    n('fra_aluminium', 'Bauxite et aluminium', 1, 4, 60, ['fra_imperial_res'], {'resources': .05, 'production': .04, 'civ': 2}),
    n('fra_labs', 'Laboratoires de l’Armement', 0, 5, 70, ['fra_cnrs'], {'slots': 1, 'research': .04}, researchBonus=[rb('electronics', .6, 2)]),
    n('fra_war_economy', 'Économie de guerre', 1, 5, 70, ['fra_aluminium'], {'production': .06, 'construction': .08, 'mil': 2},
      requires={'war': True}),
    n('fra_heavy_water', 'Eau lourde', 0, 6, 90, ['fra_labs'], {'research': .05}, requires={'year': 1939},
      researchBonus=[rb('electronics', 1, 2)]),
    # Army: the Maginot line or armoured divisions.
    n('fra_maginot_ext', 'Prolonger la ligne Maginot', 2, 0, 70, (), {'entrench': .05, 'defense': .05},
      special={'forts': 8, 'facing': ['GER', 'BEL']}, exclusive=['fra_dcr']),
    n('fra_dcr', 'Divisions cuirassées', 3, 0, 70, (), {'tanks': 200, 'armor': .05}, researchBonus=[rb('armor', .8, 2)],
      exclusive=['fra_maginot_ext']),
    n('fra_methodical', 'Bataille conduite', 2, 1, 60, ['fra_maginot_ext'], {'defense': .05, 'planning': .05}),
    n('fra_mobile_doctrine', 'Doctrine de la manœuvre', 3, 1, 60, ['fra_dcr'], {'breakthrough': .06, 'speed': .05}),
    n('fra_ecole_guerre', 'École supérieure de guerre', 2, 2, 50, [], {'xp': 20, 'planning': .1},
      reqAny=['fra_methodical', 'fra_mobile_doctrine'], officers={'count': 2, 'skill': 3}),
    n('fra_colonial_army', 'Armée d’Afrique', 3, 2, 60, [], {'manpower': 100000}, reqAny=['fra_methodical', 'fra_mobile_doctrine'],
      special={'colonial': True}),
    n('fra_alpine', 'Défense des Alpes', 2, 3, 50, ['fra_ecole_guerre'], {}, special={'forts': 4, 'facing': ['ITA']}),
    n('fra_firepower', 'Puissance de feu', 3, 3, 60, ['fra_colonial_army'], {'attack': .05, 'artillery': 300},
      researchBonus=[rb('infantry', .6, 2)]),
    n('fra_motorisation', 'Motorisation de l’infanterie', 2, 4, 60, ['fra_alpine'], {'trucks': 1000, 'supply': .08, 'speed': .03}),
    n('fra_free_france', 'Continuer la lutte', 3, 4, 40, ['fra_firepower'], {'surrender': .1, 'support': 10}, requires={'war': True}),
    n('fra_reserves', 'Divisions de réserve', 2, 5, 60, ['fra_motorisation'], {'manpower': 150000, 'defense': .05, 'xp': 20}),
    # Air force.
    n('fra_armee_air', 'Armée de l’air', 4, 0, 60, (), {'fighters': 120}, researchBonus=[rb('air', .7, 2)]),
    n('fra_plan_v', 'Plan V', 4, 1, 70, ['fra_armee_air'], {'fighters': 150, 'bombers': 60}, requires={'tension': 35}),
    n('fra_air_defense', 'Défense aérienne du territoire', 4, 2, 60, ['fra_plan_v'], {'airDefense': .1}, special={'aa': 6}),
    # Intelligence and navy.
    n('fra_deuxieme_bureau', 'Deuxième Bureau', 5, 0, 50, (), {'intel': .1, 'pp': 20}, agency=True),
    n('fra_cipher', 'Section du chiffre', 5, 1, 50, ['fra_deuxieme_bureau'], {'intel': .05}, agents=2),
    n('fra_networks', 'Réseaux clandestins', 5, 2, 50, ['fra_cipher'], {'intel': .05}, requires={'war': True}),
    n('fra_marine', 'Marine nationale', 6, 0, 60, (), {'navy': .05, 'destroyers': 6}),
    n('fra_richelieu', 'Cuirassés rapides', 6, 1, 80, ['fra_marine'], {'dock': 2}, researchBonus=[rb('navy', .7, 2)]),
    n('fra_north_africa', 'Bases d’Afrique du Nord', 6, 2, 50, ['fra_richelieu'], {}, special={'coastal': 4}),
    n('fra_submarines', 'Sous-marins de croisière', 6, 3, 50, ['fra_north_africa'], {'submarines': 8, 'raiding': .05}),
    # Foreign policy.
    n('fra_little_entente', 'Petite Entente', 7, 0, 40, (), {'pp': 30}, relations={'CZE': 40, 'ROM': 30, 'YUG': 30}),
    n('fra_franco_soviet', 'Pacte franco-soviétique', 7, 1, 50, ['fra_little_entente'], {'pp': 20}, relations={'SOV': 40},
      exclusive=['fra_london']),
    n('fra_london', 'Alignement sur Londres', 8, 1, 50, ['fra_little_entente'], {'intel': .05}, relations={'GBR': 50},
      exclusive=['fra_franco_soviet']),
    n('fra_guarantee_east', 'Garantir l’Europe centrale', 7, 2, 50, [], {'pp': 20}, reqAny=['fra_franco_soviet', 'fra_london'],
      guarantee=['CZE', 'POL']),
    n('fra_belgium', 'Coordination avec Bruxelles', 8, 2, 50, ['fra_london'], {}, relations={'BEL': 40, 'HOL': 20}),
    n('fra_union_sacree', 'Union sacrée', 7, 3, 40, ['fra_guarantee_east'], {'stability': 8}, removeSpirits=['divided'],
      requires={'tension': 50}),
    n('fra_exposition', 'Exposition internationale', 9, 0, 40, (), {'pp': 40, 'stability': 4, 'ppGain': .05}),
    n('fra_empire_defense', 'Défense de l’Empire', 9, 1, 60, ['fra_exposition'], {'pp': 20}, special={'coastal': 4, 'aa': 2}),
]

TREES['USA'] = [
    # Industry and research.
    n('usa_new_deal', 'Deuxième New Deal', 0, 0, 60, (), {'civ': 4, 'stability': 5}),
    n('usa_tva', 'Barrages de la vallée du Tennessee', 0, 1, 60, ['usa_new_deal'], {'resources': .05, 'civ': 1},
      special={'build': {'civ': 2}}),
    n('usa_wpa', 'Grands travaux', 1, 1, 60, ['usa_new_deal'], {'construction': .08}, special={'infra': 10}, rail=10),
    n('usa_cash_carry', 'Payer et emporter', 0, 2, 50, ['usa_tva'], {'pp': 40, 'civ': 3}, requires={'tension': 30}),
    n('usa_ndrc', 'Comité de recherche pour la défense', 1, 2, 60, ['usa_wpa'], {'slots': 1, 'research': .04}),
    n('usa_arsenal', 'Arsenal de la démocratie', 0, 3, 80, ['usa_cash_carry'], {'mil': 5}, spirits=['arsenal'], requires={'tension': 50}),
    n('usa_universities', 'Laboratoires universitaires', 1, 3, 60, ['usa_ndrc'], {'slots': 1, 'research': .04}),
    n('usa_victory_program', 'Programme de la victoire', 0, 4, 90, ['usa_arsenal'], {'production': .1, 'mil': 4}, requires={'war': True}),
    n('usa_refugees', 'Savants réfugiés', 1, 4, 50, ['usa_universities'], {}, spirits=['refugee_scientists']),
    n('usa_liberty_ships', 'Cargos de la liberté', 0, 5, 60, ['usa_victory_program'], {'convoys': 120, 'dock': 3}),
    n('usa_manhattan', 'Projet atomique', 1, 5, 120, ['usa_refugees'], {'research': .05}, requires={'year': 1941},
      researchBonus=[rb('electronics', 1.5, 3)]),
    n('usa_trucks', 'Camions pour le monde', 0, 6, 60, ['usa_liberty_ships'], {'trucks': 3000, 'trains': 200, 'construction': .08},
      special={'build': {'mil': 3}}),
    # Army.
    n('usa_draft', 'Service sélectif', 2, 0, 50, (), {'manpower': 300000}, removeSpirits=['isolation'], requires={'tension': 40}),
    n('usa_louisiana', 'Grandes manœuvres', 2, 1, 60, ['usa_draft'], {'xp': 30}, officers={'count': 3, 'skill': 3}),
    n('usa_armored_force', 'Force blindée', 3, 1, 70, ['usa_draft'], {'tanks': 300}, researchBonus=[rb('armor', .8, 2)]),
    n('usa_motor_pool', 'Armée motorisée', 2, 2, 60, ['usa_louisiana'], {'trucks': 1500, 'speed': .05, 'supply': .08}),
    n('usa_artillery_fdc', 'Centres de conduite de tir', 3, 2, 60, ['usa_armored_force'], {'attack': .05},
      researchBonus=[rb('infantry', .6, 2)]),
    n('usa_airborne', 'Divisions aéroportées', 2, 3, 60, ['usa_motor_pool'], {'paradrop': .25, 'transportPlanes': 80}),
    n('usa_amphibious', 'Doctrine amphibie', 3, 3, 60, ['usa_artillery_fdc'], {'invasion': .25}),
    n('usa_war_department', 'Réforme du département de la Guerre', 2, 4, 60, ['usa_airborne'], {'planning': .1, 'organization': .05,
                                                                                               'defense': .05}),
    n('usa_marines', 'Corps des Marines', 3, 4, 60, ['usa_amphibious'], {'invasion': .1, 'xp': 15, 'attack': .04}),
    # Air force.
    n('usa_air_corps', 'Corps aérien', 4, 0, 60, (), {'fighters': 150}, researchBonus=[rb('air', .7, 2)]),
    n('usa_b17', 'Forteresses volantes', 4, 1, 70, ['usa_air_corps'], {'strategicBombers': 60, 'bombing': .1}),
    n('usa_50000_planes', 'Cinquante mille avions', 4, 2, 90, ['usa_b17'], {'fighters': 400, 'production': .05}, requires={'war': True}),
    n('usa_escorts', 'Chasseurs d’escorte à long rayon', 4, 3, 60, ['usa_50000_planes'], {'air': .05}, researchBonus=[rb('air', .8, 2)]),
    # Navy.
    n('usa_two_ocean', 'Marine des deux océans', 5, 0, 80, (), {'dock': 3, 'navy': .05}),
    n('usa_carriers', 'Groupes de porte-avions', 5, 1, 70, ['usa_two_ocean'], {}, researchBonus=[rb('navy', .8, 3)]),
    n('usa_pacific_bases', 'Bases du Pacifique', 5, 2, 50, ['usa_carriers'], {}, special={'coastal': 5, 'aa': 4}),
    n('usa_submarine_war', 'Guerre sous-marine dans le Pacifique', 5, 3, 60, ['usa_pacific_bases'], {'submarines': 12, 'raiding': .1}),
    # Intelligence.
    n('usa_oss', 'Bureau des services stratégiques', 6, 0, 50, (), {'intel': .1}, agency=True),
    n('usa_magic', 'Décryptement des codes diplomatiques', 6, 1, 60, ['usa_oss'], {}, agents=3, spirits=['decrypt']),
    n('usa_fbi', 'Contre-espionnage fédéral', 6, 2, 50, ['usa_magic'], {'intel': .05, 'stability': 3}),
    # Foreign policy.
    n('usa_good_neighbor', 'Politique de bon voisinage', 7, 0, 40, (), {'pp': 30}, relations={'MEX': 30, 'BRA': 30, 'ARG': 20}),
    n('usa_neutrality', 'Lois de neutralité', 7, 1, 50, ['usa_good_neighbor'], {'stability': 5}, exclusive=['usa_quarantine']),
    n('usa_quarantine', 'Discours de la quarantaine', 8, 1, 50, ['usa_good_neighbor'], {'support': 10}, exclusive=['usa_neutrality']),
    n('usa_hemisphere', 'Défense de l’hémisphère', 7, 2, 50, ['usa_neutrality'], {'pp': 20}, special={'coastal': 4}),
    n('usa_lend_lease', 'Prêt-bail', 8, 2, 60, [], {'pp': 30}, reqAny=['usa_quarantine', 'usa_neutrality'], relations={'GBR': 40, 'CHI': 30},
      requires={'tension': 50}),
    n('usa_atlantic_charter', 'Charte de l’Atlantique', 8, 3, 50, ['usa_lend_lease'], {}, faction={'with': ['GBR'], 'name': 'Alliés'},
      requires={'war': True}),
    n('usa_fireside', 'Causeries au coin du feu', 9, 0, 40, (), {'stability': 6, 'support': 10, 'ppGain': .05}),
    n('usa_pan_american', 'Conférence panaméricaine', 9, 1, 50, ['usa_fireside'], {'pp': 30}, relations={'MEX': 20, 'BRA': 20, 'ARG': 20}),
]

TREES['ITA'] = [
    # Industry and research.
    n('ita_autarky', 'Autarcie', 0, 0, 60, (), {'resources': .08, 'civ': 2}),
    n('ita_iri', 'Institut pour la reconstruction industrielle', 0, 1, 60, ['ita_autarky'], {'civ': 3, 'construction': .05, 'production': .03}),
    n('ita_ansaldo', 'Grands arsenaux', 1, 1, 60, ['ita_autarky'], {'mil': 3}),
    n('ita_libyan_oil', 'Prospection en Libye', 0, 2, 70, ['ita_iri'], {'fuel': 6000}, special={'refinery': 1}),
    n('ita_ferrovie', 'Électrification des chemins de fer', 1, 2, 60, ['ita_ansaldo'], {'trains': 80}, rail=8),
    n('ita_cnr', 'Conseil national de la recherche', 0, 3, 60, ['ita_libyan_oil'], {'slots': 1, 'research': .04}),
    n('ita_war_production', 'Mobilisation industrielle', 1, 3, 70, ['ita_ferrovie'], {'production': .06, 'mil': 3}, requires={'tension': 40}),
    n('ita_guidonia', 'Centre d’essais aéronautiques', 0, 4, 60, ['ita_cnr'], {'slots': 1, 'research': .04}, researchBonus=[rb('air', .6, 2)]),
    n('ita_automobile', 'Usines automobiles du Nord', 1, 4, 60, ['ita_war_production'], {'trucks': 1000, 'civ': 2},
      special={'build': {'mil': 2}}),
    n('ita_radio_labs', 'Laboratoires de radio', 0, 5, 60, ['ita_guidonia'], {'research': .05}, researchBonus=[rb('electronics', .6, 2)]),
    n('ita_corporations', 'État corporatif', 1, 5, 60, ['ita_automobile'], {'construction': .08, 'production': .05, 'mil': 2},
      special={'build': {'civ': 2}}),
    # Army.
    n('ita_guerra_rapida', 'Guerre de mouvement rapide', 2, 0, 60, (), {'speed': .05, 'breakthrough': .04, 'pp': 20}),
    n('ita_alpini', 'Troupes de montagne', 2, 1, 50, ['ita_guerra_rapida'], {'xp': 15, 'defense': .05}, researchBonus=[rb('infantry', .6, 2)]),
    n('ita_ariete', 'Divisions blindées', 3, 1, 70, ['ita_guerra_rapida'], {'tanks': 150}, researchBonus=[rb('armor', .7, 2)]),
    n('ita_marshals', 'Maréchaux de l’Empire', 2, 2, 50, ['ita_alpini'], {'planning': .1}, officers={'count': 2, 'skill': 3}),
    n('ita_colonial_army', 'Troupes coloniales', 3, 2, 60, ['ita_ariete'], {'manpower': 120000}),
    n('ita_bersaglieri', 'Bersagliers', 2, 3, 50, ['ita_marshals'], {'speed': .03, 'attack': .04, 'xp': 15}),
    n('ita_desert_supply', 'Ravitaillement du désert', 3, 3, 50, ['ita_colonial_army'], {'trucks': 1000, 'supply': .08}),
    n('ita_alpine_wall', 'Rempart alpin', 2, 4, 60, ['ita_bersaglieri'], {'defense': .05}, special={'forts': 6, 'facing': ['FRA', 'YUG']}),
    n('ita_assault_engineers', 'Sapeurs d’assaut', 3, 4, 50, ['ita_desert_supply'], {'attack': .04, 'xp': 15}),
    # Air force.
    n('ita_regia_aeronautica', 'Aviation royale', 4, 0, 60, (), {'fighters': 120, 'bombers': 60}),
    n('ita_torpedo', 'Avions torpilleurs', 4, 1, 60, ['ita_regia_aeronautica'], {'navalBombers': 60}),
    n('ita_long_range', 'Raids à longue distance', 4, 2, 60, ['ita_torpedo'], {'bombers': 40, 'bombing': .05}),
    # Navy and intelligence.
    n('ita_regia_marina', 'Marine royale', 5, 0, 70, (), {'navy': .05, 'dock': 2}),
    n('ita_mare_nostrum', 'Notre mer', 5, 1, 70, ['ita_regia_marina'], {}, spirits=['mare_nostrum']),
    n('ita_decima', 'Flottille de nageurs de combat', 5, 2, 50, ['ita_mare_nostrum'], {'raiding': .1}, agents=1),
    n('ita_sim', 'Service de renseignement militaire', 6, 0, 50, (), {'intel': .1, 'pp': 20}, agency=True),
    n('ita_ovra', 'Police politique', 6, 1, 50, ['ita_sim'], {'stability': 4, 'intel': .05}),
    # Foreign policy and the Empire.
    n('ita_empire', 'L’Empire', 7, 0, 50, (), {'pp': 40, 'stability': 4}),
    n('ita_ethiopia', 'Pacifier l’Éthiopie', 7, 1, 60, ['ita_empire'], {'stability': 4, 'pp': 20}, special={'infra': 4}),
    n('ita_axis', 'Axe Rome-Berlin', 8, 1, 50, ['ita_empire'], {'pp': 20}, relations={'GER': 40}, exclusive=['ita_stresa']),
    n('ita_stresa', 'Front de Stresa', 9, 1, 50, ['ita_empire'], {'pp': 20}, relations={'FRA': 40, 'GBR': 40}, exclusive=['ita_axis']),
    n('ita_balkan_bloc', 'Bloc danubien', 7, 2, 50, ['ita_ethiopia'], {}, relations={'HUN': 30, 'YUG': 20, 'AUS': 30}),
    n('ita_albania', 'Protectorat d’Albanie', 8, 2, 60, ['ita_axis'], {'tension': 5}, claims=['ALB']),
    n('ita_neutral', 'Non-belligérance', 9, 2, 50, ['ita_stresa'], {'stability': 6}, requires={'peace': True}),
    n('ita_spain', 'Volontaires en Espagne', 7, 3, 50, ['ita_balkan_bloc'], {'xp': 20}, relations={'SPA': 40}),
    n('ita_greece', 'Revendications en Grèce', 8, 3, 60, ['ita_albania'], {'tension': 5}, claims=['GRE'], requires={'tension': 50}),
    n('ita_propaganda', 'Ministère de la culture populaire', 9, 0, 40, (), {'stability': 5, 'support': 10, 'ppGain': .05}),
]

TREES['JPN'] = [
    # Industry and research.
    n('jpn_manchuria_dev', 'Plan quinquennal de Mandchourie', 0, 0, 70, (), {'resources': .08, 'civ': 2}, relations={'MAN': 20}),
    n('jpn_showa_steel', 'Aciéries de Mandchourie', 0, 1, 60, ['jpn_manchuria_dev'], {'mil': 3}, special={'build': {'mil': 2}}),
    n('jpn_synthetic', 'Carburant synthétique', 1, 1, 70, ['jpn_manchuria_dev'], {'fuel': 6000}, special={'refinery': 1}),
    n('jpn_mantetsu', 'Chemin de fer de Mandchourie du Sud', 0, 2, 60, ['jpn_showa_steel'], {'trains': 100, 'civ': 2}, rail=10),
    n('jpn_national_mobilisation', 'Loi de mobilisation nationale', 1, 2, 60, ['jpn_synthetic'], {'production': .06},
      removeSpirits=['rivalry']),
    n('jpn_riken', 'Institut de recherche physique et chimique', 0, 3, 60, ['jpn_mantetsu'], {'slots': 1, 'research': .04}),
    n('jpn_zaibatsu_war', 'Conglomérats au service de l’armée', 1, 3, 70, ['jpn_national_mobilisation'], {'mil': 3, 'civ': 2, 'production': .04}),
    n('jpn_naval_tech', 'Arsenal technique naval', 0, 4, 60, ['jpn_riken'], {'slots': 1, 'research': .04}, researchBonus=[rb('navy', .6, 2)]),
    n('jpn_planning_board', 'Bureau de planification', 1, 4, 60, ['jpn_zaibatsu_war'], {'construction': .08, 'civ': 2},
      special={'build': {'civ': 2}}),
    n('jpn_electronics', 'Recherche électronique', 0, 5, 60, ['jpn_naval_tech'], {'research': .05}, researchBonus=[rb('electronics', .6, 2)]),
    n('jpn_war_economy', 'Économie de guerre', 1, 5, 70, ['jpn_planning_board'], {'mil': 3, 'production': .05}, requires={'war': True}),
    # Army: north or south.
    n('jpn_kwantung', 'Armée du Kwantung', 2, 0, 60, (), {'xp': 20, 'manpower': 100000, 'pp': 20}),
    n('jpn_hokushin', 'Doctrine de l’expansion au nord', 2, 1, 60, ['jpn_kwantung'], {'attrition': .1, 'armor': .03},
      exclusive=['jpn_nanshin']),
    n('jpn_nanshin', 'Doctrine de l’expansion au sud', 3, 1, 60, ['jpn_kwantung'], {'invasion': .2}, exclusive=['jpn_hokushin']),
    n('jpn_night_attack', 'Combat de nuit', 2, 2, 50, [], {'attack': .04}, reqAny=['jpn_hokushin', 'jpn_nanshin']),
    n('jpn_jungle', 'Entraînement à la jungle', 3, 2, 50, ['jpn_nanshin'], {'attrition': .1, 'xp': 10}),
    n('jpn_staff', 'État-major impérial', 2, 3, 60, ['jpn_night_attack'], {'planning': .1}, officers={'count': 2, 'skill': 3}),
    n('jpn_china_garrison', 'Pacifier les zones occupées', 3, 3, 60, [], {'stability': 4, 'organization': .03},
      reqAny=['jpn_jungle', 'jpn_night_attack'], requires={'war': True}),
    n('jpn_tank_corps', 'Corps blindé', 2, 4, 60, ['jpn_staff'], {'tanks': 150, 'defense': .05}, researchBonus=[rb('armor', .6, 2)]),
    n('jpn_naval_landing', 'Forces de débarquement navales', 3, 4, 50, ['jpn_china_garrison'], {'invasion': .15, 'attack': .04}),
    # Naval air power and the fleet.
    n('jpn_kido_butai', 'Force aéronavale', 4, 0, 70, (), {'navy': .05}, researchBonus=[rb('navy', .8, 2)]),
    n('jpn_zero', 'Chasseur embarqué', 4, 1, 60, ['jpn_kido_butai'], {'fighters': 150}, researchBonus=[rb('air', .7, 2)]),
    n('jpn_long_lance', 'Torpilles à oxygène', 5, 1, 60, ['jpn_kido_butai'], {'naval': .05, 'destroyers': 8}),
    n('jpn_decisive_battle', 'Bataille décisive', 4, 2, 60, ['jpn_zero'], {'navalBombers': 80}),
    n('jpn_yamato', 'Cuirassés géants', 5, 2, 90, ['jpn_long_lance'], {'dock': 2}),
    n('jpn_naval_aviators', 'Écoles d’aviation navale', 4, 3, 60, ['jpn_decisive_battle'], {'air': .05, 'xp': 15}),
    # Intelligence.
    n('jpn_kempeitai', 'Police militaire', 6, 0, 50, (), {'intel': .05, 'pp': 20}, agency=True),
    n('jpn_tokumu', 'Services spéciaux', 6, 1, 50, ['jpn_kempeitai'], {'intel': .05}, agents=2),
    n('jpn_tokko', 'Police spéciale', 6, 2, 50, ['jpn_tokumu'], {'stability': 4}),
    # Foreign policy.
    n('jpn_anti_comintern', 'Pacte anti-Komintern', 7, 0, 50, (), {'pp': 30}, relations={'GER': 40}),
    n('jpn_tripartite', 'Entente avec Berlin et Rome', 7, 1, 50, ['jpn_anti_comintern'], {'pp': 20}, relations={'GER': 40, 'ITA': 30},
      requires={'tension': 50}),
    n('jpn_co_prosperity', 'Sphère de coprospérité', 8, 1, 60, ['jpn_anti_comintern'], {'pp': 30}, relations={'MAN': 30, 'SIA': 30}),
    n('jpn_soviet_pact', 'Pacte de neutralité avec Moscou', 7, 2, 50, ['jpn_tripartite'], {'pp': 20}, relations={'SOV': 40}),
    n('jpn_indochina', 'Bases en Indochine', 8, 2, 60, ['jpn_co_prosperity'], {'tension': 5, 'resources': .05}, relations={'FRA': -20},
      requires={'tension': 60}),
    n('jpn_southern_resources', 'Ressources du Sud', 8, 3, 70, ['jpn_indochina'], {'tension': 5, 'fuel': 8000}, claims=['HOL'],
      requires={'tension': 70}),
    n('jpn_spiritual', 'Mobilisation spirituelle', 9, 0, 40, (), {'stability': 6, 'support': 10, 'ppGain': .05}),
    n('jpn_manchukuo_army', 'Armée du Mandchoukouo', 9, 1, 50, ['jpn_spiritual'], {'manpower': 100000}, relations={'MAN': 30}),
]

TREES['CHI'] = [
    # Industry and research: the interior provinces.
    n('chi_new_life', 'Mouvement de la vie nouvelle', 0, 0, 50, (), {'stability': 6, 'civ': 2, 'pp': 20}),
    n('chi_currency', 'Réforme monétaire', 0, 1, 50, ['chi_new_life'], {'pp': 30, 'civ': 2}),
    n('chi_hankou_canton', 'Ligne Hankou–Canton', 1, 1, 60, ['chi_new_life'], {'trains': 60, 'supply': .05}, rail=8),
    n('chi_interior', 'Industries de l’intérieur', 0, 2, 70, ['chi_currency'], {'civ': 2, 'construction': .05}, special={'build': {'mil': 2}}),
    n('chi_burma_road', 'Route de Birmanie', 1, 2, 70, ['chi_hankou_canton'], {'trucks': 800}, spirits=['burma_road']),
    n('chi_arsenals', 'Arsenaux de l’intérieur', 0, 3, 70, ['chi_interior'], {'mil': 2, 'rifles': 5000, 'production': .05}),
    n('chi_yunnan', 'Mines du Yunnan', 1, 3, 60, ['chi_burma_road'], {'resources': .1, 'civ': 2}),
    n('chi_academia', 'Académie centrale de recherche', 0, 4, 60, ['chi_arsenals'], {'slots': 1, 'research': .04}),
    n('chi_sichuan', 'Industrialiser le Sichuan', 1, 4, 70, ['chi_yunnan'], {'construction': .08, 'mil': 2, 'production': .05},
      special={'build': {'mil': 2, 'civ': 2}}),
    n('chi_universities', 'Universités repliées', 0, 5, 60, ['chi_academia'], {'slots': 1, 'research': .04}),
    # Army: German advisers or Soviet aid.
    n('chi_german_advisers', 'Conseillers allemands', 2, 0, 60, (), {'planning': .05}, relations={'GER': 30}, exclusive=['chi_soviet_aid']),
    n('chi_soviet_aid', 'Aide soviétique', 3, 0, 60, (), {'fighters': 80, 'artillery': 200}, relations={'SOV': 30},
      exclusive=['chi_german_advisers']),
    n('chi_central_army', 'Armée centrale', 2, 1, 60, [], {'xp': 15, 'attack': .03}, reqAny=['chi_german_advisers', 'chi_soviet_aid']),
    n('chi_mass_levy', 'Levée de masse', 3, 1, 60, [], {'manpower': 400000, 'recruitment': .1}, reqAny=['chi_german_advisers', 'chi_soviet_aid']),
    n('chi_yangzi_line', 'Ligne fortifiée du Yangzi', 2, 2, 60, ['chi_central_army'], {'entrench': .05, 'defense': .05},
      special={'forts': 6, 'facing': ['JPN']}),
    n('chi_trade_space', 'Échanger l’espace contre le temps', 3, 2, 60, ['chi_mass_levy'], {'attrition': .1}, spirits=['scorched']),
    n('chi_whampoa', 'Académie militaire centrale', 2, 3, 50, ['chi_yangzi_line'], {'xp': 20, 'planning': .05}, officers={'count': 2, 'skill': 2}),
    n('chi_guerrilla', 'Guerre de guérilla', 3, 3, 60, ['chi_trade_space'], {'defense': .05}),
    n('chi_x_force', 'Force expéditionnaire en Inde', 2, 4, 60, ['chi_whampoa'], {'xp': 20, 'attack': .04}, requires={'war': True}),
    # Intelligence and air.
    n('chi_juntong', 'Bureau des enquêtes', 4, 0, 50, (), {'intel': .1}, agency=True),
    n('chi_occupied_networks', 'Réseaux en zone occupée', 4, 1, 50, ['chi_juntong'], {}, agents=2),
    n('chi_flying_tigers', 'Volontaires de l’air', 4, 2, 60, ['chi_occupied_networks'], {'fighters': 100}, relations={'USA': 30}),
    # National unity.
    n('chi_united_front', 'Second front uni', 5, 0, 50, (), {'stability': 5}, removeSpirits=['warlords'], spirits=['united_front'],
      requires={'war': True}),
    n('chi_integrate', 'Rallier les seigneurs de la guerre', 5, 1, 70, ['chi_united_front'], {}, special={'integrate': True}),
    # Foreign policy.
    n('chi_appeal_league', 'Appel à la Société des Nations', 6, 0, 40, (), {'pp': 30, 'ppGain': .05}, relations={'GBR': 20, 'FRA': 20, 'USA': 20}),
    n('chi_allies', 'Appel aux Alliés', 6, 1, 50, ['chi_appeal_league'], {'pp': 20}, relations={'GBR': 30, 'USA': 30}, requires={'war': True}),
    n('chi_lend_lease', 'Aide américaine', 6, 2, 50, ['chi_allies'], {'trucks': 1500, 'rifles': 8000}),
]

for tag, nodes in TREES.items():
    political = [f for f in catalog['focus'][tag] if f['id'].startswith('pol_')]
    assert political, tag
    shift = max(f['col'] for f in nodes) + 1 - min(f['col'] for f in political)
    kept = [{**f, 'col': f['col'] + shift} for f in political]
    ids = [f['id'] for f in nodes + kept]
    assert len(ids) == len(set(ids)), tag
    cells = [(f['col'], f['row']) for f in nodes + kept]
    assert len(cells) == len(set(cells)), (tag, sorted(c for c in cells if cells.count(c) > 1))
    known = set(ids)
    for f in nodes:
        assert f['req'] or f.get('reqAny') or f['row'] == 0, (tag, f['id'])
        for r in f['req'] + f.get('reqAny', []) + (f['exclusive'] or []):
            assert r in known, (tag, f['id'], r)
        for s in f.get('spirits', []) + f.get('removeSpirits', []):
            assert s in SPIRITS, (tag, f['id'], s)
        for k in f['effect']:
            assert k in EFFECTS, (tag, f['id'], k)
        for k in f.get('special', {}):
            assert k in SPECIALS, (tag, f['id'], k)
        for b in f.get('researchBonus', []):
            assert b['group'] in TECH_GROUPS, (tag, f['id'], b)
    catalog['focus'][tag] = nodes + kept

CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print({tag: len(catalog['focus'][tag]) for tag in TREES})
