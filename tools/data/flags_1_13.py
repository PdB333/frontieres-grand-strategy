#!/usr/bin/env python3
"""Frontieres 1.13 flags (idempotent).

  python3 tools/data/flags_1_13.py

Adds to data/catalog.json a simplified flag for each starting and releasable
country, drawn by the game from a short description (stripes, crosses,
discs, cantons, stars, crescents): no image file. The designs follow the
national colours of the period in simplified form; regimes whose emblems are
banned or offensive are shown with their plain national tricolour instead.
Countries created during a game without a flag use their map colour.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'data' / 'catalog.json'
catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

R, W, B, K, G, Y = '#c8312e', '#f2efe6', '#22407a', '#1d1d1d', '#2f7a3d', '#e2b93b'
LB, DG, OR, MR = '#5d9bd5', '#1f5e3b', '#e07b2c', '#8a1f2b'


def h(*c, w=None):
    return {'t': 'h', 'c': list(c), **({'w': w} if w else {})}


def v(*c, w=None):
    return {'t': 'v', 'c': list(c), **({'w': w} if w else {})}


def cross(bg, fg, rim=None):
    return {'t': 'cross', 'c': [bg, fg] + ([rim] if rim else [])}


def disc(bg, fg):
    return {'t': 'disc', 'c': [bg, fg]}


def canton(base, box, star=None):
    return {**base, 'canton': box, **({'star': star} if star else {})}


FLAGS = {
    'FRA': v(B, W, R), 'GER': h(K, W, R), 'GBR': {'t': 'union', 'c': [B, W, R]}, 'SOV': {'t': 'plain', 'c': [R], 'star': Y, 'at': 'canton'},
    'USA': canton(h(*([R, W] * 6 + [R])), B, W), 'ITA': v(G, W, R), 'JPN': disc(W, R), 'CHI': canton(h(R), B, W),
    'CAN': {'t': 'ensign', 'c': [R]}, 'AST': {'t': 'ensign', 'c': [B], 'star': W}, 'NZL': {'t': 'ensign', 'c': [B], 'star': R}, 'SAF': h(OR, W, LB),
    'RAJ': {'t': 'ensign', 'c': [R], 'star': Y}, 'ETH': h(G, Y, R), 'SPA': h(R, Y, '#6b2d6b'), 'POR': v(G, R, w=[2, 3]),
    'BEL': v(K, Y, R), 'HOL': h(R, W, B), 'LUX': h(R, W, LB), 'SWI': {'t': 'swiss', 'c': [R, W]}, 'IRE': v(G, W, OR),
    'DEN': cross(R, W), 'NOR': cross(R, B, W), 'SWE': cross(LB, Y), 'FIN': cross(W, B), 'ICE': cross(B, R, W),
    'EST': h(LB, K, W), 'LAT': h(MR, W, MR, w=[2, 1, 2]), 'LIT': h(Y, G, R), 'POL': h(W, R), 'CZE': {'t': 'wedge', 'c': [W, R, B]},
    'AUS': h(R, W, R), 'HUN': h(R, W, G), 'ROM': v(B, Y, R), 'BUL': h(W, G, R), 'YUG': h(B, W, R), 'GRE': canton(h(*([B, W] * 4 + [B])), B, None),
    'ALB': {'t': 'plain', 'c': [R], 'star': K, 'at': 'centre'}, 'TUR': {'t': 'crescent', 'c': [R, W]}, 'IRN': h(G, W, R), 'AFG': v(K, R, G),
    'IRQ': {'t': 'wedge', 'c': [K, W, G, R]}, 'SAU': {'t': 'plain', 'c': [DG], 'star': W, 'at': 'bar'}, 'YEM': {'t': 'plain', 'c': [R], 'star': W, 'at': 'centre'},
    'OMA': {'t': 'plain', 'c': [R]}, 'SIA': h(R, W, B, W, R, w=[1, 1, 2, 1, 1]), 'NEP': {'t': 'plain', 'c': [R], 'star': W, 'at': 'centre'},
    'BHU': {'t': 'diag', 'c': [Y, OR]}, 'MON': v(R, B, R), 'MAN': canton(h(Y), R, None), 'MEX': v(G, W, R), 'BRA': {'t': 'rhomb', 'c': [G, Y, B]},
    'ARG': h(LB, W, LB), 'CHL': canton(h(W, R), B, W), 'BOL': h(R, Y, G), 'PRU': v(R, W, R), 'ECU': h(Y, B, R, w=[2, 1, 1]), 'COL': h(Y, B, R, w=[2, 1, 1]),
    'VEN': h(Y, B, R), 'URU': canton(h(W, LB, W, LB, W, LB, W, LB, W), W, Y), 'PAR': h(R, W, B), 'PAN': {'t': 'quarters', 'c': [W, R, B, W]},
    'COS': h(B, W, R, W, B, w=[1, 1, 2, 1, 1]), 'NIC': h(B, W, B), 'HON': h(B, W, B), 'ELS': h(B, W, B), 'GUA': v(LB, W, LB), 'CUB': {'t': 'wedge', 'c': [B, W, R]},
    'HAI': h(B, R), 'DOM': {'t': 'quarters', 'c': [B, R, R, B]}, 'LIB': canton(h(*([R, W] * 5 + [R])), B, W), 'PHI': {'t': 'wedge', 'c': [B, R, W]},
    'EGY': {'t': 'crescent', 'c': [G, W]}, 'DNZ': {'t': 'plain', 'c': [R], 'star': Y, 'at': 'centre'}, 'TIB': {'t': 'diag', 'c': [R, B]},
    'PRC': {'t': 'plain', 'c': [R], 'star': Y, 'at': 'canton'}, 'SHX': h(R, Y, B, W, K), 'GXC': canton(h(R), B, W), 'YUN': h(R, Y, B, W, K),
    'XSM': {'t': 'crescent', 'c': [DG, W]}, 'SIK': h(R, Y, B, W, K), 'NAT': h(R, Y, R, w=[1, 2, 1]),
    # Releasable countries.
    'SLO': h(W, B, R), 'UKR': h(LB, Y), 'BLR': h(W, R, W), 'AZR': h(LB, R, G), 'KAZ': {'t': 'plain', 'c': [LB], 'star': Y, 'at': 'centre'},
    'UZB': h(LB, W, G), 'TMS': {'t': 'plain', 'c': [G]}, 'KYR': {'t': 'plain', 'c': [R], 'star': Y, 'at': 'centre'}, 'TAJ': h(R, W, G),
    'CRO': h(R, W, B), 'SLV': h(W, B, R), 'BOS': {'t': 'plain', 'c': [B], 'star': Y, 'at': 'centre'}, 'MNT': h(R, B, W), 'MKD': {'t': 'plain', 'c': [R], 'star': Y, 'at': 'centre'},
    'MOL': v(B, Y, R), 'ALG': v(G, W), 'MOR': {'t': 'plain', 'c': [R], 'star': G, 'at': 'centre'}, 'TUN': {'t': 'crescent', 'c': [R, W]},
    'SYR': h(G, W, K), 'LEB': h(R, W, R, w=[1, 2, 1]), 'INC': h(Y, R, Y), 'MAD': {'t': 'wedge', 'c': [W, R, G]}, 'FWA': v(G, Y, R), 'FEA': v(G, Y, R),
    'JOR': {'t': 'wedge', 'c': [K, W, G, R]}, 'KEN': h(K, R, G), 'NGA': v(G, W, G), 'GLD': h(R, Y, G), 'MAL': canton(h(R, W, R, W, R, W, R), B, Y),
    'CEY': {'t': 'plain', 'c': [MR], 'star': Y, 'at': 'centre'}, 'SUD': h(B, Y, G), 'RHO': {'t': 'ensign', 'c': [LB]}, 'CYP': {'t': 'plain', 'c': [W], 'star': OR, 'at': 'centre'},
    'INS': h(R, W), 'COG': {'t': 'diag', 'c': [G, Y, R]}, 'LBA': h(R, K, G, w=[1, 2, 1]), 'SOM': {'t': 'plain', 'c': [LB], 'star': W, 'at': 'centre'},
    'ERI': {'t': 'wedge', 'c': [LB, R, G]}, 'KOR': disc(W, R), 'ANG': h(R, K), 'MZB': {'t': 'wedge', 'c': [G, R, K, Y]}, 'BRM': h(Y, G, R),
    'PAK': v(W, DG, w=[1, 3]),
}
catalog['flags16'] = FLAGS
CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('flags', len(FLAGS))
