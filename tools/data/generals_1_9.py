#!/usr/bin/env python3
"""Frontieres 1.9 commanders: traits, historical rosters and name pools (idempotent).

  python3 tools/data/generals_1_9.py

Run after catalog_1_6.py and content_1_6.py. Commander names are historical
facts (the generals and marshals of 1936-1945); levels, statistics and
traits are original game values, not data from another game.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

# Traits: effects are read by the engine (systems.js, "Commanders").
#   attack / defense: combat multipliers for the divisions of the army
#   terrain: [terrains] the bonus applies to; units: battalion families
#   supply, planning (speed of plan preparation), org (organisation),
#   losses (strength lost), winter (share of the winter penalty removed),
#   river (share of the river penalty removed), entrench, initiative (tactics)
# kind: personality (from the start), terrain / units (learnt in battle),
# earned (level). learn: battle days needed to learn the trait.
TRAITS = [
    ('offensif', 'Esprit offensif', 'personality', 'Pousse ses divisions à l’attaque.', {'attack': .08}),
    ('defensif', 'Maître de la défense', 'personality', 'Tient le terrain pied à pied.', {'defense': .08}),
    ('strategiste', 'Stratège', 'personality', 'Prépare ses offensives avec méthode.', {'planning': .3, 'breakthrough': .05}),
    ('logisticien', 'Logisticien', 'personality', 'Ses dépôts suivent les troupes.', {'supply': .1}),
    ('organisateur', 'Organisateur', 'personality', 'Remet vite ses unités en ordre.', {'org': .08}),
    ('ruse', 'Rusé', 'personality', 'Devine les intentions de l’adversaire.', {'initiative': 2, 'attack': .03}),
    ('prudent', 'Prudent', 'personality', 'Épargne ses hommes, au prix de l’élan.', {'losses': -.12, 'attack': -.04}),
    ('temeraire', 'Téméraire', 'personality', 'Frappe fort sans compter les pertes.', {'attack': .12, 'losses': .15}),
    ('meneur', 'Meneur d’hommes', 'personality', 'Ses soldats le suivent partout.', {'org': .06, 'defense': .03}),
    ('vieille_garde', 'Vieille garde', 'personality', 'Formé à la guerre précédente ; n’apprend plus.', {'attack': -.05, 'defense': .02, 'noLearning': 1}),
    ('impitoyable', 'Impitoyable', 'personality', 'Exige l’impossible de ses troupes.', {'attack': .05, 'org': -.04}),
    ('montagnard', 'Montagnard', 'terrain', 'Expert du combat en montagne et sur les hauteurs.', {'attack': .15, 'defense': .15, 'terrain': ['mountains', 'hills'], 'learn': 40}),
    ('desert', 'Renard du désert', 'terrain', 'Manœuvre avec aisance dans les sables.', {'attack': .15, 'defense': .1, 'supply': .1, 'terrain': ['desert'], 'learn': 40}),
    ('jungle', 'Rat de jungle', 'terrain', 'Rompu aux forêts tropicales et aux marais.', {'attack': .15, 'defense': .15, 'terrain': ['jungle', 'marsh'], 'learn': 40}),
    ('foret', 'Coureur des bois', 'terrain', 'Tire parti des forêts.', {'attack': .1, 'defense': .12, 'terrain': ['forest'], 'learn': 50}),
    ('urbain', 'Combat de rues', 'terrain', 'Spécialiste des combats en ville.', {'attack': .15, 'defense': .15, 'terrain': ['urban'], 'learn': 30}),
    ('hiver', 'Général Hiver', 'terrain', 'Ses troupes souffrent moins du froid.', {'winter': .5, 'learn': 60}),
    ('fleuves', 'Franchisseur', 'terrain', 'Passe les fleuves sous le feu.', {'river': .5, 'learn': 30}),
    ('blindes', 'Chef de blindés', 'units', 'Emploie les chars en masse.', {'attack': .1, 'units': ['armor'], 'learn': 60}),
    ('infanterie', 'Officier d’infanterie', 'units', 'Ménage et entraîne son infanterie.', {'defense': .1, 'units': ['infantry'], 'learn': 80}),
    ('cavalerie', 'Officier de cavalerie', 'units', 'Mène ses unités rapides avec audace.', {'attack': .08, 'units': ['mobile'], 'learn': 60}),
    ('commando', 'Commando', 'units', 'Commande parachutistes, marines et troupes de montagne.', {'attack': .15, 'defense': .1, 'units': ['special'], 'learn': 40}),
    ('artilleur', 'Artilleur', 'units', 'Règle des barrages d’une grande précision.', {'attack': .06, 'units': ['artillery'], 'learn': 60}),
    ('genie', 'Officier du génie', 'units', 'Retranche ses lignes en un temps record.', {'entrench': .25, 'fortAttack': .1, 'learn': 60}),
    ('veteran', 'Vétéran', 'earned', 'Des années de campagne derrière lui.', {'attack': .04, 'defense': .04}),
]
catalog['commanderTraits'] = [
    {'id': t, 'name': n, 'kind': k, 'desc': d, 'effect': {x: v for x, v in e.items() if x not in ('terrain', 'units', 'learn')},
     **({'terrain': e['terrain']} if 'terrain' in e else {}), **({'units': e['units']} if 'units' in e else {}),
     **({'learn': e['learn']} if 'learn' in e else {})}
    for t, n, k, d, e in TRAITS
]


def g(name, role, skill, attack, defense, planning, logistics, traits=(), until=None):
    entry = {'name': name, 'role': role, 'skill': skill, 'attack': attack, 'defense': defense, 'planning': planning,
             'logistics': logistics, 'traits': list(traits)}
    if until:
        entry['until'] = until
    return entry


M, G = 'marshal', 'general'
ROSTERS = {
    'GER': [
        g('Walther von Brauchitsch', M, 3, 3, 3, 3, 3, ['organisateur']),
        g('Gerd von Rundstedt', M, 4, 4, 4, 4, 3, ['strategiste', 'vieille_garde']),
        g('Fedor von Bock', M, 4, 4, 3, 4, 3, ['offensif']),
        g('Wilhelm Ritter von Leeb', M, 3, 2, 4, 3, 3, ['defensif', 'vieille_garde']),
        g('Erich von Manstein', G, 4, 5, 4, 5, 3, ['strategiste', 'ruse']),
        g('Heinz Guderian', G, 4, 5, 3, 4, 3, ['blindes', 'offensif']),
        g('Erwin Rommel', G, 3, 5, 3, 3, 2, ['temeraire', 'meneur']),
        g('Ewald von Kleist', G, 3, 4, 3, 3, 3, ['blindes', 'cavalerie']),
        g('Hermann Hoth', G, 3, 4, 3, 4, 3, ['blindes']),
        g('Walther von Reichenau', G, 3, 4, 3, 3, 3, ['offensif', 'impitoyable']),
        g('Günther von Kluge', G, 3, 3, 4, 3, 3, ['infanterie']),
        g('Wilhelm List', G, 3, 3, 3, 3, 4, ['montagnard']),
        g('Walter Model', G, 3, 3, 5, 3, 3, ['defensif', 'organisateur']),
        g('Erich Hoepner', G, 3, 4, 2, 3, 3, ['blindes']),
        g('Eduard Dietl', G, 2, 3, 4, 2, 3, ['montagnard', 'hiver']),
        g('Friedrich Paulus', G, 2, 3, 3, 4, 2, ['prudent']),
    ],
    'SOV': [
        g('Kliment Vorochilov', M, 2, 2, 3, 2, 3, ['vieille_garde']),
        g('Semion Boudienny', M, 2, 3, 2, 2, 2, ['vieille_garde', 'cavalerie']),
        g('Mikhaïl Toukhatchevski', M, 4, 5, 3, 5, 3, ['strategiste', 'blindes'], until='1937-06-11'),
        g('Alexandre Iegorov', M, 3, 3, 3, 4, 3, ['strategiste'], until='1938-02-23'),
        g('Vassili Blücher', M, 3, 4, 3, 3, 3, ['meneur'], until='1938-10-22'),
        g('Gueorgui Joukov', G, 4, 5, 4, 4, 4, ['offensif', 'impitoyable', 'organisateur']),
        g('Semion Timochenko', G, 3, 3, 4, 3, 3, ['defensif']),
        g('Boris Chapochnikov', G, 3, 3, 3, 5, 4, ['strategiste']),
        g('Ivan Koniev', G, 3, 4, 3, 3, 3, ['offensif']),
        g('Konstantine Rokossovski', G, 3, 4, 4, 4, 3, ['meneur', 'cavalerie']),
        g('Nikolaï Vatoutine', G, 3, 4, 3, 4, 3, ['strategiste']),
        g('Alexandre Vassilevski', G, 3, 3, 3, 5, 3, ['strategiste']),
        g('Kirill Meretskov', G, 2, 3, 3, 3, 3, ['hiver']),
        g('Andreï Ieremenko', G, 2, 3, 4, 2, 3, ['defensif']),
        g('Pavel Rotmistrov', G, 2, 4, 2, 3, 2, ['blindes']),
        g('Vassili Tchouïkov', G, 2, 3, 4, 2, 3, ['urbain']),
    ],
    'GBR': [
        g('Edmund Ironside', M, 3, 3, 3, 3, 3, ['vieille_garde']),
        g('John Gort', M, 3, 3, 4, 3, 3, ['meneur']),
        g('Archibald Wavell', G, 4, 4, 3, 4, 3, ['strategiste', 'desert']),
        g('Alan Brooke', G, 4, 3, 4, 5, 4, ['organisateur', 'strategiste']),
        g('Bernard Montgomery', G, 3, 3, 4, 4, 5, ['prudent', 'logisticien']),
        g('Harold Alexander', G, 3, 3, 4, 3, 3, ['meneur']),
        g('Claude Auchinleck', G, 3, 3, 4, 3, 3, ['desert']),
        g('Richard O’Connor', G, 3, 5, 3, 4, 3, ['offensif', 'desert']),
        g('William Slim', G, 3, 3, 4, 3, 5, ['logisticien', 'jungle']),
        g('Henry Maitland Wilson', G, 2, 3, 3, 3, 3, []),
    ],
    'FRA': [
        g('Maurice Gamelin', M, 3, 2, 4, 3, 3, ['prudent', 'vieille_garde']),
        g('Alphonse Georges', M, 3, 2, 4, 3, 3, ['defensif']),
        g('Maxime Weygand', M, 3, 3, 3, 3, 3, ['vieille_garde']),
        g('Charles Huntziger', G, 2, 2, 3, 2, 3, ['prudent']),
        g('Gaston Billotte', G, 2, 3, 3, 3, 3, []),
        g('Henri Giraud', G, 3, 3, 3, 3, 2, ['temeraire']),
        g('Charles de Gaulle', G, 2, 4, 2, 4, 2, ['blindes', 'offensif']),
        g('Alphonse Juin', G, 3, 4, 3, 4, 3, ['montagnard']),
        g('Jean de Lattre de Tassigny', G, 3, 4, 4, 3, 3, ['meneur']),
        g('Philippe Leclerc de Hauteclocque', G, 2, 4, 3, 3, 3, ['desert', 'temeraire']),
    ],
    'USA': [
        g('George Marshall', M, 4, 3, 3, 5, 5, ['organisateur', 'strategiste']),
        g('Douglas MacArthur', M, 4, 4, 3, 4, 3, ['meneur', 'jungle']),
        g('Dwight Eisenhower', G, 3, 3, 3, 4, 5, ['logisticien', 'organisateur']),
        g('George Patton', G, 3, 5, 2, 3, 3, ['blindes', 'temeraire']),
        g('Omar Bradley', G, 3, 3, 4, 3, 4, ['prudent']),
        g('Mark Clark', G, 2, 3, 3, 3, 3, []),
        g('Walter Krueger', G, 3, 3, 4, 3, 4, ['jungle']),
        g('Joseph Stilwell', G, 2, 3, 3, 3, 3, ['jungle', 'impitoyable']),
        g('Lucian Truscott', G, 2, 4, 3, 3, 3, ['commando']),
    ],
    'ITA': [
        g('Pietro Badoglio', M, 3, 3, 3, 3, 3, ['vieille_garde', 'prudent']),
        g('Rodolfo Graziani', M, 3, 3, 3, 2, 2, ['impitoyable', 'desert']),
        g('Italo Balbo', G, 3, 3, 3, 3, 3, ['meneur', 'desert']),
        g('Giovanni Messe', G, 3, 3, 4, 3, 3, ['defensif', 'organisateur']),
        g('Ugo Cavallero', G, 2, 2, 3, 3, 3, []),
        g('Alfredo Guzzoni', G, 2, 3, 3, 2, 3, []),
        g('Ettore Bastico', G, 2, 3, 3, 2, 3, ['desert']),
        g('Mario Roatta', G, 2, 3, 2, 3, 2, []),
        g('Annibale Bergonzoli', G, 2, 3, 3, 2, 2, []),
    ],
    'JPN': [
        g('Hajime Sugiyama', M, 3, 3, 3, 3, 3, ['organisateur']),
        g('Shunroku Hata', M, 3, 3, 3, 3, 3, []),
        g('Tomoyuki Yamashita', G, 4, 5, 3, 4, 3, ['jungle', 'offensif']),
        g('Masaharu Homma', G, 3, 4, 3, 3, 3, ['jungle']),
        g('Yasuji Okamura', G, 3, 3, 4, 4, 3, ['organisateur']),
        g('Iwane Matsui', G, 2, 3, 3, 2, 3, ['impitoyable']),
        g('Seishirō Itagaki', G, 2, 3, 3, 2, 3, ['temeraire']),
        g('Hideki Tōjō', G, 2, 3, 3, 3, 3, ['impitoyable']),
        g('Kenkichi Ueda', G, 2, 3, 3, 2, 3, ['cavalerie']),
        g('Renya Mutaguchi', G, 2, 4, 2, 2, 1, ['temeraire']),
    ],
    'CHI': [
        g('Li Zongren', M, 3, 3, 4, 3, 3, ['defensif']),
        g('Bai Chongxi', G, 4, 4, 4, 5, 3, ['ruse', 'strategiste']),
        g('Chen Cheng', G, 3, 3, 4, 3, 3, ['organisateur']),
        g('Xue Yue', G, 3, 3, 5, 3, 3, ['defensif', 'ruse']),
        g('Gu Zhutong', G, 2, 3, 3, 2, 3, []),
        g('Wei Lihuang', G, 2, 3, 3, 3, 3, []),
        g('Sun Liren', G, 3, 4, 3, 3, 3, ['jungle']),
        g('Zhang Fakui', G, 2, 3, 3, 3, 3, []),
    ],
    'PRC': [
        g('Zhu De', M, 3, 3, 3, 3, 3, ['meneur']),
        g('Peng Dehuai', G, 3, 4, 3, 3, 2, ['temeraire']),
        g('Lin Biao', G, 3, 4, 3, 4, 3, ['ruse']),
        g('Liu Bocheng', G, 3, 3, 4, 4, 3, ['ruse']),
    ],
    'POL': [
        g('Edward Rydz-Śmigły', M, 3, 3, 3, 3, 3, ['vieille_garde']),
        g('Kazimierz Sosnkowski', G, 3, 3, 4, 3, 3, ['defensif']),
        g('Tadeusz Kutrzeba', G, 3, 4, 3, 4, 3, ['strategiste']),
        g('Władysław Anders', G, 3, 4, 3, 3, 3, ['cavalerie']),
        g('Stanisław Maczek', G, 2, 4, 2, 3, 3, ['blindes']),
        g('Juliusz Rómmel', G, 2, 3, 3, 2, 3, ['urbain']),
    ],
    'FIN': [
        g('Carl Gustaf Mannerheim', M, 4, 3, 5, 4, 3, ['defensif', 'hiver']),
        g('Hugo Österman', G, 2, 2, 3, 3, 3, []),
        g('Paavo Talvela', G, 3, 4, 3, 3, 3, ['hiver', 'foret']),
        g('Erik Heinrichs', G, 3, 3, 4, 4, 3, ['strategiste']),
        g('Harald Öhquist', G, 2, 3, 4, 2, 3, ['defensif']),
    ],
    'NAT': [
        g('Francisco Franco', M, 4, 3, 4, 4, 3, ['ruse', 'prudent']),
        g('Emilio Mola', G, 3, 4, 3, 3, 3, ['impitoyable']),
        g('José Enrique Varela', G, 3, 4, 3, 3, 3, ['offensif']),
        g('Juan Yagüe', G, 2, 4, 2, 2, 3, ['temeraire', 'desert']),
        g('Fidel Dávila', G, 2, 3, 3, 3, 3, []),
    ],
    'SPA': [
        g('José Miaja', M, 3, 2, 4, 3, 3, ['defensif', 'urbain']),
        g('Vicente Rojo', G, 3, 3, 3, 5, 3, ['strategiste']),
        g('Juan Modesto', G, 2, 3, 3, 3, 2, []),
        g('Enrique Líster', G, 2, 4, 2, 2, 2, ['temeraire']),
    ],
    'ROM': [
        g('Ion Antonescu', M, 3, 3, 3, 3, 3, ['impitoyable']),
        g('Petre Dumitrescu', G, 2, 3, 3, 2, 3, []),
        g('Constantin Constantinescu-Claps', G, 2, 3, 3, 2, 3, []),
    ],
    'HUN': [g('Ferenc Szombathelyi', M, 2, 3, 3, 3, 3, []), g('Gusztáv Jány', G, 2, 3, 3, 2, 3, ['hiver'])],
    'YUG': [g('Dušan Simović', M, 2, 3, 3, 3, 3, []), g('Milan Nedić', G, 2, 3, 3, 2, 3, ['montagnard'])],
    'GRE': [g('Alexandros Papagos', M, 3, 3, 4, 3, 3, ['defensif', 'montagnard'])],
    'CZE': [g('Ludvík Krejčí', M, 3, 3, 4, 3, 3, ['defensif']), g('Sergej Vojcechovský', G, 3, 3, 3, 3, 3, [])],
    'HOL': [g('Henri Winkelman', M, 2, 2, 3, 3, 3, ['defensif'])],
    'BEL': [g('Raoul Van Overstraeten', M, 2, 2, 3, 3, 3, ['defensif'])],
    'CAN': [g('Andrew McNaughton', M, 3, 3, 3, 3, 4, ['artilleur']), g('Harry Crerar', G, 2, 3, 3, 3, 3, [])],
    'AST': [g('Thomas Blamey', M, 3, 3, 3, 3, 4, ['organisateur']), g('Leslie Morshead', G, 3, 3, 5, 3, 3, ['defensif', 'urbain'])],
    'TUR': [g('Fevzi Çakmak', M, 3, 3, 4, 3, 3, ['vieille_garde'])],
}
catalog['commanderRosters'] = ROSTERS

# Surnames for generals raised during a campaign, by language.
NAMES = {
    'de': ['Albrecht', 'Bayerlein', 'Brandt', 'Eberhardt', 'Fischer', 'Hartmann', 'Keller', 'Krüger', 'Lange', 'Lorenz', 'Meyer', 'Neumann', 'Richter', 'Schäfer', 'Schmitt', 'Vogel', 'Wagner', 'Weber', 'Winter', 'Zimmermann'],
    'fr': ['Arnaud', 'Barbier', 'Bertrand', 'Bonnet', 'Chevalier', 'Dumas', 'Fabre', 'Fournier', 'Garnier', 'Girard', 'Lambert', 'Leroy', 'Marchand', 'Mercier', 'Morel', 'Perrin', 'Renaud', 'Roussel', 'Vidal', 'Vincent'],
    'en': ['Ashworth', 'Barnes', 'Carver', 'Dawson', 'Ellis', 'Fletcher', 'Graham', 'Harper', 'Hughes', 'Kendall', 'Lawrence', 'Mitchell', 'Norton', 'Palmer', 'Reid', 'Sinclair', 'Turner', 'Walker', 'Wells', 'Yates'],
    'ru': ['Antonov', 'Belov', 'Fedorov', 'Golikov', 'Ivanov', 'Kamenev', 'Kovalev', 'Kuznetsov', 'Lebedev', 'Morozov', 'Nikitine', 'Orlov', 'Pavlov', 'Petrov', 'Romanov', 'Smirnov', 'Sokolov', 'Volkov', 'Zaïtsev', 'Zakharov'],
    'it': ['Barbieri', 'Bianchi', 'Colombo', 'Conti', 'De Luca', 'Esposito', 'Ferrari', 'Fontana', 'Galli', 'Greco', 'Lombardi', 'Marino', 'Moretti', 'Ricci', 'Rinaldi', 'Romano', 'Russo', 'Santoro', 'Testa', 'Villa'],
    'ja': ['Abe', 'Fujita', 'Hasegawa', 'Ikeda', 'Inoue', 'Ishikawa', 'Kato', 'Kimura', 'Kobayashi', 'Maeda', 'Matsumoto', 'Mori', 'Nakamura', 'Ogawa', 'Saito', 'Sakamoto', 'Takahashi', 'Tanaka', 'Watanabe', 'Yoshida'],
    'zh': ['Chen', 'Deng', 'Feng', 'Gao', 'Guo', 'He', 'Hu', 'Huang', 'Li', 'Liang', 'Lin', 'Liu', 'Luo', 'Ma', 'Song', 'Wang', 'Wu', 'Xu', 'Zhang', 'Zhou'],
    'es': ['Aguilar', 'Castro', 'Delgado', 'Domínguez', 'Fernández', 'García', 'Gil', 'Gómez', 'Herrera', 'Jiménez', 'López', 'Martín', 'Molina', 'Morales', 'Navarro', 'Ortiz', 'Ramos', 'Romero', 'Ruiz', 'Torres'],
    'pl': ['Dąbrowski', 'Grabowski', 'Jankowski', 'Kamiński', 'Kowalski', 'Krawczyk', 'Lewandowski', 'Mazur', 'Nowak', 'Wiśniewski', 'Wójcik', 'Zieliński'],
    'nordic': ['Andersson', 'Berg', 'Eriksson', 'Hansen', 'Holm', 'Johansson', 'Karlsson', 'Larsen', 'Lindqvist', 'Nielsen', 'Nyström', 'Virtanen'],
    'generic': ['Almeida', 'Costa', 'Dimitrov', 'Horváth', 'Ionescu', 'Kaya', 'Kovač', 'Novák', 'Papadopoulos', 'Pereira', 'Silva', 'Yılmaz'],
}
LANG = {'GER': 'de', 'AUS': 'de', 'SWI': 'de', 'FRA': 'fr', 'BEL': 'fr', 'LUX': 'fr', 'VIC': 'fr', 'GBR': 'en', 'USA': 'en', 'CAN': 'en',
        'AST': 'en', 'NZL': 'en', 'SAF': 'en', 'IRE': 'en', 'RAJ': 'en', 'SOV': 'ru', 'ITA': 'it', 'JPN': 'ja', 'MAN': 'ja',
        'CHI': 'zh', 'PRC': 'zh', 'SHX': 'zh', 'GXC': 'zh', 'YUN': 'zh', 'XSM': 'zh', 'SIK': 'zh', 'SPA': 'es', 'NAT': 'es',
        'MEX': 'es', 'ARG': 'es', 'CHL': 'es', 'COL': 'es', 'PRU': 'es', 'VEN': 'es', 'BOL': 'es', 'PAR': 'es', 'URU': 'es',
        'ECU': 'es', 'POL': 'pl', 'SWE': 'nordic', 'NOR': 'nordic', 'DEN': 'nordic', 'FIN': 'nordic', 'ICE': 'nordic'}
catalog['commanderNames'] = {'pools': NAMES, 'lang': LANG}

# Combat tactics: each day of battle the attacker and the defender pick one.
# A tactic "counters" one tactic of the other side, which then loses its
# bonus and suffers a penalty. need: condition for the tactic to be offered.
TACTICS = [
    ('assault', 'a', 'Assaut frontal', 'Les vagues d’infanterie montent droit sur l’objectif.', {'attack': .1}, 'ambush', None),
    ('infiltration', 'a', 'Infiltration', 'De petits groupes se glissent entre les points d’appui.', {'attack': .05, 'enemyDefense': -.1}, 'hold', None),
    ('barrage', 'a', 'Préparation d’artillerie', 'Un feu roulant écrase les positions avant l’assaut.', {'attack': .15}, 'digin', 'artillery'),
    ('envelopment', 'a', 'Enveloppement', 'Les ailes débordent la position par plusieurs côtés.', {'attack': .18}, 'elastic', 'approaches'),
    ('armored', 'a', 'Assaut blindé', 'Les chars mènent l’attaque en masse.', {'attack': .1, 'breakthrough': .25}, 'counterattack', 'armor'),
    ('methodical', 'a', 'Attaque méthodique', 'Progression lente, appuyée et économe en hommes.', {'attack': .04, 'losses': -.15}, None, None),
    ('hold', 'd', 'Tenir la ligne', 'Chaque position est tenue sans recul.', {'defense': .1}, 'methodical', None),
    ('counterattack', 'd', 'Contre-attaque', 'Les réserves frappent l’assaillant dès qu’il s’arrête.', {'attack': .25}, 'envelopment', None),
    ('elastic', 'd', 'Repli élastique', 'On cède du terrain pour mieux briser l’élan adverse.', {'defense': .05, 'enemyBreakthrough': -.15}, 'armored', None),
    ('ambush', 'd', 'Embuscade', 'Des feux croisés attendent l’ennemi sur ses axes.', {'enemyAttack': -.1}, 'infiltration', None),
    ('digin', 'd', 'Retranchement', 'Les tranchées et abris encaissent le choc.', {'defense': .18}, 'assault', 'entrenched'),
]
catalog['combatTactics'] = [
    {'id': t, 'side': s, 'name': n, 'desc': d, 'effect': e, **({'counters': c} if c else {}), **({'need': need} if need else {})}
    for t, s, n, d, e, c, need in TACTICS
]

CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('traits', len(TRAITS), 'rosters', len(ROSTERS), 'commanders', sum(len(v) for v in ROSTERS.values()))
