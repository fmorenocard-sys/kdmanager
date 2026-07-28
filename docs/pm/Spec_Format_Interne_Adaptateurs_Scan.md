# Spec — Format interne normalisé & interface d'adaptateurs de scan

> Date : 2026-07-28 · Auteur : PM/Tech · Statut : **spec de cadrage (à implémenter par incréments)**
> Origine : question de fond du Roi (2026-07-28) — « on doit s'attendre à diverses
> sources de scan (maison, ProKingdoms, HeroScroll, RokStats…) ; il faut qu'on soit
> en mesure à chaque fois d'afficher les données correctement. »
> Déclencheur concret : le bug du bloc « Puissance Totale » du Dashboard, resté en
> « Chargement » à l'infini sur le pilote parce qu'un champ (`static_data/history`)
> propre au **format ProKingdoms 2997** n'existe pas pour une autre source.

---

## 1. Principe directeur

> **On normalise à l'ingestion vers UN format interne unique. Toutes les couches
> d'affichage (dashboard, objectifs, historique, deadweight, war tracker) ne
> consomment QUE ce format — jamais un champ spécifique à un fournisseur.**

C'est l'orientation déjà actée par `Etude_Commercialisation_SaaS.md` §4 (« une
fonction `parse(fichier) → format interne` par fournisseur ») et une réponse
directe à la dette connue « ingestion couplée au format d'export »
(`docs/project_context.md` §5). Le moteur reste identique quel que soit le
fournisseur ; **seul l'adaptateur d'entrée change.**

**Ce que le bug PxKP a prouvé (mini-cas d'école).** `static_data/history` était
alimenté uniquement par un onglet du XLSX ProKingdoms 2997
(`functions/index.js` `syncPlayers`). Dès qu'on change de source (SoC pour le
pilote), le champ disparaît → écran cassé. Deux enseignements structurants,
généralisables à **tous** les champs :

1. **La couche d'affichage ne doit dépendre que du format interne**, jamais d'un
   artefact de fournisseur. Le correctif (accumulation d'historique sur le roster
   normalisé, `--history`) applique déjà ce principe : le point `{date, power, kp}`
   est **recalculé sur les totaux normalisés**, donc identique quelle que soit la
   source.
2. **Un champ absent doit dégrader proprement** (état vide explicite), jamais
   provoquer un spinner infini ni un plantage. C'est le §4 de cette spec.

---

## 2. Le format interne — schéma

Le format interne est l'ensemble des documents `static_data/*` que le front
consomme via `DataContext` (9 abonnements `onSnapshot`) + `static_data/kvk`
lu par les panneaux d'objectifs et l'archivage.

| Document | Forme | Consommé par | Obligatoire ? |
|---|---|---|---|
| `players` | `{ list: PlayerRecord[], updatedAt, source }` | Dashboard, Leaderboard, KvK Perf, Deadweight… | **Oui — socle** |
| `stats` | `{ totalPowerCH25, updatedAt }` | StatCard « Puissance Totale » (repli sur Σplayers) | Non |
| `history` | `{ list: HistoryPoint[], updatedAt }` | Dashboard (courbe PxKP) | Non (état vide sinon) |
| `kvk` | `{ list: KvkRecord[], updatedAt, source }` | KvkGoalsPanel (objectifs), progression, archivage | Non |
| `kvk_filler` | `{ list: FillerRecord[], updatedAt }` | Comptes filler (F-026/F-027) | Non |
| `bank` | `{ total:{food,wood,stone,gold}, weekly, history }` | Banque, bloc Trésorerie Dashboard | Non (module optionnel F-023) |
| `trophies` | `{ … }` | Trophées | Non (module optionnel) |
| `deadweight` | `{ … }` | Deadweight | Non (module optionnel) |
| `avatars` | `{ map:{ [governorId]:{url,source,seenAt} }, updatedAt }` | `Avatar.jsx` (cascade) | Non (repli local/logo) |

### 2.1 `PlayerRecord` — schéma canonique

Noms de champs **camelCase, porteurs** (doivent matcher `syncPlayers` /
`ingest-soc-scan.mjs` — voir `functions/data-mapping.js` `PLAYER_COLUMNS`) :

| Champ | Type | Rôle | Statut |
|---|---|---|---|
| `id` | string | identité gouverneur (clé) | **REQUIS** |
| `name` | string | nom affiché | **REQUIS** |
| `power` | number | puissance (tri, stat, objectifs) | **REQUIS** (métrique cœur) |
| `rank` | number | rang, **recalculé** par `power` desc à l'ingestion | Dérivé (jamais fourni) |
| `kp` | number | kill points | Recommandé |
| `deads` | number | morts totales | Recommandé |
| `t4Kills` | number | kills T4 | Optionnel |
| `t5Kills` | number | kills T5 | Optionnel |
| `t1Kills` | number | kills T1 | Optionnel |
| `ranged` | number | points ranged | Optionnel |
| `rssGathered` | number | ressources récoltées | Optionnel |
| `rssAssistance` | number | assistance ressources | Optionnel |
| `helps` | number | aides d'alliance | Optionnel |
| `alliance` | string | tag d'alliance | Optionnel (défaut `"Unknown"`) |
| `cityHall` | number | niveau CH | Optionnel |
| `location` | string | royaume/emplacement | Optionnel |
| `notes` | string | notes libres | Optionnel |
| `powerDiff` | number | variation de puissance | Optionnel (0 pour un scan de base) |

### 2.2 Sous-schémas

- `HistoryPoint` = `{ date: string /* "M/D/YYYY" */, power: number, kp: number }`.
- `KvkRecord` = `{ id, name, initialPower, finalPower, /* opt: */ totalDead, totalKpGained, goalPercent… }`. `initialPower` est la **référence figée des objectifs** (F-027) ; en son absence, les objectifs retombent sur la puissance live du roster.
- `FillerRecord` = `{ id, name, initialPower, finalPower, kp, t4Dead, t5Dead, totalDead, goalPercent }` (objectif filler = `4×t4Dead + 10×t5Dead`).

### 2.3 Règle d'or — absence = `undefined`, jamais `0`

Un champ **réellement absent** d'une source doit être **omis** (`undefined`, que
Firestore ignore via `ignoreUndefinedProperties`), **pas** mis à `0`. Sinon
« pas de donnée » devient indistinguable de « valeur nulle réelle », et l'UI ne
peut plus dégrader correctement (elle affiche un faux `0` au lieu d'un `—`).
`ingest-soc-scan.mjs` respecte déjà cette règle (il `delete` les champs
`undefined`) ; `syncPlayers` (ProKingdoms) met `0` par défaut, ce qui est
acceptable **uniquement** parce que le format 2997 a toujours toutes les colonnes.
**Tout nouvel adaptateur doit omettre les champs absents, pas les mettre à 0.**

---

## 3. Matrice de couverture par source

Ce que chaque source fournit aujourd'hui, mappé sur le `PlayerRecord` canonique.

| Champ | ProKingdoms 2997 (Google Sheets) | SoC scan (`ingest-soc-scan.mjs`) | Scan maison / RokTracker / autres |
|---|---|---|---|
| `id`, `name`, `power` | ✅ | ✅ | à garantir (REQUIS) |
| `kp` | ✅ | ✅ (`max_points`) | variable |
| `deads` | ✅ | ✅ (`maxdead`) | variable |
| `t4Kills` / `t5Kills` | ✅ | ✅ (`maxkills_iv/_v`) | variable |
| `t1Kills`, `ranged`, `rss*`, `helps`, `cityHall`, `notes` | ✅ | ❌ (absents) | variable |
| `alliance` | ✅ | ❌ → `"Unknown"` | variable |
| `location` | ✅ | ✅ (`kingdom`) | variable |
| **`history`** (série PxKP) | ✅ (onglet Dashboard) | ❌ natif → **synthétisé** via `--history` (Σpower/Σkp par scan) | à synthétiser pareillement |
| **`kvk`** (objectifs) | ✅ (Performance Analysis) | ✅ via `--kvk-base` (initialPower=finalPower au base) | à mapper |
| **`kvk_filler`** (split T4/T5 mort) | ✅ (Filler Accounts) | ⚠️ **partiel** — SoC ne donne que la mort totale, pas le split T4/T5 → objectif filler non calculable exactement | variable |

**Lecture.** Aucune source hors ProKingdoms 2997 n'est complète. La stratégie
n'est donc pas « exiger toutes les colonnes » mais « **normaliser ce qui existe
et dégrader proprement le reste** » — d'où le §4.

---

## 4. Contrat de dégradation propre (le cœur de la robustesse)

Pour chaque champ/document, le comportement attendu **quand il manque**. C'est ce
contrat qui garantit « afficher les données correctement quelle que soit la
source ». Généralise la correction du bug PxKP à tout le format.

| Donnée absente | Comportement UI attendu | État aujourd'hui |
|---|---|---|
| `players.id/name/power` | **Rejet à l'ingestion** — l'adaptateur échoue explicitement (ces 3 champs sont l'identité + la métrique cœur, rien d'affichable sans eux) | À formaliser dans l'adaptateur |
| `players.kp` / `deads` | Colonne/stat à `—` ou `0` explicite, jamais de plantage | OK (défaut tolérant) |
| `players.alliance` | Filtre d'alliance = groupe unique « Unknown » | OK |
| `players.t4Kills/t5Kills` | Objectifs filler basés sur la mort par tier → **état vide/partiel**, pas de calcul faux | ⚠️ à vérifier (cas SoC) |
| `players.ranged/rss*/helps/cityHall/notes` | Colonne/détail simplement masqué (ou `—`) | OK |
| `history` | **`EmptyState`** « la courbe se construira au fil des scans » | ✅ **corrigé 2026-07-28** |
| `stats.totalPowerCH25` | Repli sur `Σplayers.power` | ✅ déjà codé (`kingdomStats?.totalPowerCH25 \|\| stats.power`) |
| `kvk.initialPower` | Repli sur la puissance live du roster pour les objectifs | ✅ déjà codé |
| `avatars[id]` | Cascade `Avatar.jsx` : Lilith → Discord → JPG local → logo | ✅ (voir `Etude_Avatars_Joueurs.md`) |
| `bank/trophies/deadweight` | Module optionnel (F-023) : désactivable par instance ; sinon `EmptyState` | ✅ (F-023) |

**Principe transversal** : *chargé-mais-vide* ≠ *en chargement*. Toute couche
doit distinguer les deux (via le flag `loading` du `DataContext`) et rendre un
**`EmptyState`** quand c'est vide — jamais un spinner perpétuel (la cause exacte
du bug initial). À auditer partout où un bloc dépend d'un champ potentiellement
absent selon la source.

---

## 5. L'interface d'adaptateur

Un adaptateur = **une fonction pure** par source, produisant le format interne.

```
parse(fichier, options) -> {
  players: PlayerRecord[],          // REQUIS (id/name/power garantis, sinon throw)
  kvk?:      KvkRecord[],           // optionnel
  filler?:   FillerRecord[],        // optionnel
  history?:  HistoryPoint[],        // optionnel (sinon synthétisé par accumulation)
  meta:     { source, kingdom, scannedAt }
}
```

**Contrat de l'adaptateur :**
1. Émet des **noms de champs canoniques** (§2.1), en camelCase.
2. **Omet** les champs absents (`undefined`), ne les met jamais à `0` (§2.3).
3. **Recalcule `rank`** par `power` desc (jamais repris de la source).
4. **Rejette** (throw) si `id`/`name`/`power` manquent pour l'ensemble — un scan
   sans ces champs n'est pas exploitable.
5. **N'écrit rien** lui-même : il transforme un fichier en objet. La persistance
   (`static_data/*`, backup, merge historique) est une couche séparée, commune à
   tous les adaptateurs.

**Où ça vit.** Aujourd'hui la logique d'adaptateur est éparpillée et couplée à
l'écriture :
- `functions/index.js` `syncPlayers` = adaptateur ProKingdoms (Google Sheets) **+** écriture, mêlés.
- `scripts/ingest-soc-scan.mjs` = adaptateur SoC **+** écriture, mêlés.
- `functions/kvkRace/parse.js` = déjà un bon exemple de **parseur découplé** produisant un format interne (cf. `Etude_Commercialisation_SaaS.md` §4) — modèle à généraliser.

**Cible** : extraire un module `adapters/` (une fonction pure par source) + une
couche de persistance unique, de sorte qu'ajouter HeroScroll/RokStats = écrire
**un** adaptateur testé contre le schéma, sans toucher au reste.

---

## 6. État actuel vs cible

| | Aujourd'hui | Cible |
|---|---|---|
| Format interne | **implicite**, éparpillé (data-mapping.js, syncPlayers, ingest-soc-scan) | **schéma documenté** (§2), source unique de vérité |
| Adaptateurs | 2 (ProKingdoms Sheets, SoC), couplés à l'écriture | N adaptateurs purs découplés + 1 couche de persistance |
| Dégradation | ad hoc, incohérente (d'où le bug PxKP) | **contrat explicite** (§4), audité sur chaque bloc |
| Ajouter une source | copier/adapter un gros script | écrire une fonction `parse()` + tests de schéma |

---

## 7. Plan d'implémentation incrémental

Priorité gain/effort, sans big-bang :

1. **Figer le schéma** (ce document) comme source de vérité — fait. Ajouter un
   validateur léger du `PlayerRecord` (fonction `assertInternalFormat`) réutilisable.
2. **Audit de dégradation** : passer en revue chaque bloc dépendant d'un champ
   optionnel et vérifier qu'il rend un `EmptyState`/`—` et non un spinner/plantage
   (le bug PxKP est le premier corrigé ; vérifier objectifs filler SoC, colonnes
   rss/ranged, etc.). Effort : **S–M**.
3. **Extraire l'interface d'adaptateur** : refactorer `ingest-soc-scan.mjs` et
   `syncPlayers` pour séparer *parse* (pur) de *persist* (commun). Effort : **M**.
4. **Nouvel adaptateur = simple ajout** : à la première vraie demande (un royaume
   sur RokStats/RokTracker), écrire `parse()` pour ce format contre le schéma.
   Effort : **S–M** par source (cf. `Etude_Commercialisation_SaaS.md` §4).

---

## 8. Hypothèses & renvois

- **À inscrire au backlog** (ID à arbitrer par le Roi, probablement sous `E-006`
  industrialisation ou un épic « ingestion multi-sources ») : le refactor
  adaptateur (§5/§7-3) et l'audit de dégradation (§7-2).
- **Hypothèse** : les sources tierces (RokStats CSV, RokTracker xlsx, HeroScroll)
  fournissent au minimum `id/name/power` — à vérifier au premier cas réel (lié à
  `A-029`, CGU/formats).
- **Renvois** : `Etude_Commercialisation_SaaS.md` §4 (abstraction d'adaptateur,
  matrice fournisseurs), `Etude_Industrialisation_Onboarding.md` (l'ingestion est
  l'étape 10 du runbook, variable selon la source), `Etude_Avatars_Joueurs.md`
  (cascade avatars = exemple de dégradation propre), `docs/project_context.md` §5
  (dette « ingestion couplée au format »). Code : `functions/data-mapping.js`,
  `functions/index.js` (`syncPlayers`, `syncAvatars`), `scripts/ingest-soc-scan.mjs`,
  `functions/kvkRace/parse.js` (parseur déjà découplé, modèle), `src/context/DataContext.jsx`.
