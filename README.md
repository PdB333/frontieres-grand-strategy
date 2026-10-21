# Frontières 1.5 — Optimisation et finition

**Jeu de grande stratégie solo original pour navigateur.** La 1.5 prend la suite de la 1.4.1, sans changer les règles de combat, de politique, d'économie ou les identifiants de géographie. Elle accélère la simulation, réduit les calculs graphiques inutiles et fournit un diagnostic de performance accessible au joueur.

## Lancer

- **Jeu autonome :** ouvrez `Frontieres.html` dans un navigateur récent. Sur certaines machines, la politique de sécurité des fichiers locaux peut bloquer les Web Workers.
- **Alternative locale :** avec Python 3 installé, depuis ce dossier : `python lancer.py`, puis ouvrez l'adresse affichée dans votre navigateur.
- Aucun serveur externe, abonnement ou connexion Internet n'est nécessaire pour la simulation. Certains portraits d'archives Wikimedia peuvent nécessiter Internet et leur licence doit être conservée.
- Le multijoueur n'est pas prévu.

## Changements 1.5

- Calcul de ravitaillement accéléré par **matrice d'accès pré-calculée**, mutualisation des permissions entre alliés, index des ports et mémorisation temporaire des données navales.
- La minicarte n'est recalculée qu'après **changement de territoire, couleur nationale ou géométrie**. Déplacer ou zoomer la caméra ne déclenche plus 3 396 redessins de provinces sur ce composant.
- Nouveaux réglages : **Économie, Équilibrée, Précision**, masquage facultatif de la minicarte, contraste renforcé et texte agrandi conservés.
- **Performance et diagnostic** accessible via Menu : latence moyenne du Worker, 95e percentile, dernier temps d'affichage de la carte, nombre de divisions/provinces et recalculs de minicarte.
- Snapshots de simulation légèrement moins fréquents lorsque le moteur est chargé, sans limiter les commandes immédiates.
- Identifiant de sauvegarde porté à **1.5** et contrôle du manifeste de mod conservé. Les sauvegardes 1.4.1 et les anciennes sauvegardes compatibles peuvent être chargées avec la même carte.

## Mesures sur la machine de test

Mesures Node.js avec deux moteurs exécutés dans le même processus, 10 jours d'échauffement, 100 jours chronométrés et **trois répétitions par scénario**, en alternant l'ordre des versions. Ce sont des mesures locales, pas des performances garanties sur tous les PC.

| Campagne | 1.4.1 (ms/jour) | 1.5 (ms/jour) | Gain observé |
|---|---:|---:|---:|
| Paix | 15,34 | 10,73 | 30,1 % |
| Deux guerres | 20,34 | 12,91 | 36,5 % |

Le système reste une simulation simplifiée. **Ces gains ne signifient pas une IA ou une marine équivalente à Hearts of Iron IV.**

## Tests et fichiers

Les 9 suites de tests héritées totalisent **210 vérifications moteur/mods** réussies. S'ajoutent **9 nouveaux tests d'intégration, 5 tests différentiels** (4 scénarios et une migration), **14 vérifications géographiques** et **32 contrôles navigateur** (Chromium bureau et mobile), tous réussis. Un essai de 500 jours et sa reprise pendant 15 jours ont réussi.

- `docs/OPTIMISATION_15.md` : explication technique et benchmark.
- `docs/TESTS_15.md` : périmètre et limites de la validation.
- `docs/LIMITES_15.md` : fonctionnalités encore incomplètes.
- `tests/benchmark15.cjs` : benchmark comparatif reproductible, utilise le moteur 1.4.1 de référence dans `tests/fixtures-1.5`.
- `tests/test_differential15.cjs` : vérifie que la 1.5 conserve les règles du jeu, à métadonnées de version près.
- `tests/test_perf15_browser.py` : contrôle des paramètres de rendu dans Chromium.
- `src/engine_base.js` : moteur ; `src/mod15.inc.js` : compatibilité de version ; `src/worker.js` et `src/ui.js` : télémétrie et carte.
- `tools/build.py` : reconstruction du HTML autonome à partir de ses sources.
- `mods/archipel_des_brises_v2.json` : exemple cartographique compatible.

### Reconstruire

```bash
python tools/build.py
node tests/test_release15.cjs
node tests/test_differential15.cjs
node tests/test_engine.cjs
python tests/test_map.py
python tests/test_perf15_browser.py
```

Les tests Node.js nécessitent Node.js, les tests de navigateur Playwright et Chromium ; **jouer au HTML préconstruit n'en a pas besoin**.

## Compatibilité, limites et droits

- La carte de base contient 74 pays et 3 396 provinces de jeu. Les corrections historiques restent approximatives.
- Les mods 1.4.1 sont compatibles. Une sauvegarde modée exige le même manifeste et la même carte ; faites un export avant migration.
- Les mods existants HOI4/TNO ne sont pas importables directement. Les mods Frontières sont des JSON déclaratifs.
- Le moteur militaire, l'aviation, la marine et l'IA restent simplifiés. La 1.5 n'ajoute pas de nouveau système de guerre.
- Les essais de ce projet ont exécuté le **contenu exact du HTML en Chromium avec `page.set_content`**. Le navigateur de test interdit les navigations `file://` et `localhost`, et n'a pas permis de certifier la persistance réelle du stockage entre sessions utilisateur.
- Les portraits Wikimedia ne sont pas tous présents hors ligne. Consultez `THIRD_PARTY.md` pour leur attribution.

Code original sous licence MIT (`LICENSE`) ; ne contient ni le code ni les ressources de Paradox Interactive.