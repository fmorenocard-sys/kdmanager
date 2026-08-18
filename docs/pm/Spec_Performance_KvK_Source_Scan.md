# Spec — Performance KvK dérivée du scan ProKingdoms (source unique course + performance)

> Date : 2026-08-13 · Auteur : PM · Statut : **cadrage validé, GATE LEVÉ — prêt pour construction (§4 finalisé)**
> Mise à jour 2026-08-18 : ajout de **`totalPowerDiff`** au mapping §4.2 (champ **vivant**, sommé
> par la carte « TOTAL POWER DIFF » de l'onglet Performance, mais absent du tableau de mapping
> initial). Révélé par l'aperçu manuel du pilote qui affichait **0** faute de dériver ce champ ;
> corrigé en stopgap le 2026-08-18. Dérivation figée : `finalPower − initialPower`.
> Mise à jour 2026-08-13 : **A-052 et A-055 RÉSOLUES** par vérification sur données réelles
> (scan 006 SoC 4 de 2997 vs `static_data/kvk`, 46/47 joueurs, médiane des ratios = 1,0000
> sur les deux mappings). Le gate qui bloquait toute mise en prod tant que ces deux
> hypothèses n'étaient pas levées est **retiré**. §4 (plan de construction) finalisé en
> conséquence. A-053 (couverture `Full Data`) et A-054 (fillers) restent ouvertes, sans
> bloquer ce périmètre (voir §5).
> Origine : demande du Roi — **décision de direction prise, non redébattue ici** : le
> scan ProKingdoms qui alimente déjà la course (`kvk_race`) doit aussi alimenter
> `static_data/kvk` (onglet Performance), à la place de la feuille Google maintenue à la
> main. Ce document cadre **le comment** (mécanisme, périmètre, séquencement, risques),
> pas le pourquoi.
> Rattaché à **E-005** (KvK Race), généralise **F-030/US-034** et
> `Spec_Ingestion_Progression_Unifiee.md` (2026-08-08, qui ne couvrait que la progression
> du KP, pas l'ensemble du document) ; s'appuie sur `Spec_Format_Interne_Adaptateurs_Scan.md`
> (§3, qui avait déjà identifié la limite fillers reprise ici).
> **IDs** : à ne pas confondre avec A-050/A-051 (`Arbitrage_Partenariat_ProKingdoms.md`,
> pris le même jour par un autre chantier) — les hypothèses de cette spec sont numérotées
> A-052 à A-055.

---

## 1. Ce qui est décidé, ce qui est cadré ici

**Décidé (Roi)** : une seule source — le scan ProKingdoms — doit pouvoir alimenter à la
fois la course et la Performance KvK. **Cadré ici** : le mécanisme technique, ses limites
réelles (vérifiées dans le code, pas supposées), le périmètre exact d'un premier
engagement, et l'articulation avec la feuille Google existante sur 2997.

---

## 2. État actuel — deux pipelines, vérifiés dans le code

| | Feuille Google → `syncKvk` | Scan ProKingdoms → `digestRaceScan` |
|---|---|---|
| Code | `functions/index.js:363` (`syncKvk`), lit l'onglet `Performance Analysis` | `functions/kvkRace/digest.js` + `engine.js` (E-005/F-018) |
| Écrit | `static_data/kvk.list` — **toujours les 11 champs** : `id,name,initialPower,finalPower,initialKp,finalKp,totalKills,totalDead,totalAcclaim,totalPowerDiff,totalKpGained,goalPercent,rate` | `kvk_race/{cid}` : `scans/{seq}` (camps), `kingdoms/{seq}` (agrégats par royaume), `players_top/{seq}` (**Top 200 mondial** du `dkp_net`, **toute la coalition**, pas filtré par royaume) |
| Instances | 2997 uniquement (`SPREADSHEET_ID` configuré) | Toutes (2997 et pilote 41) |
| Diff base→courant | Fait par les formules du Sheet lui-même (hors app) | Fait par `engine.js` `computeNetPlayers` : net par gouverneur vs scan de base (`net_kills_iv_diff`/T4, `net_kills_v_diff`/T5, `net_dead_diff`, `net_kill_points_diff`, `net_power_diff`…) |

**Sur le pilote (kd-41-manager)**, il n'existe **aucune** feuille Google KvK configurée :
`static_data/kvk` y est un **snapshot figé**, écrit une fois **manuellement en local**
via `scripts/ingest-soc-scan.mjs --kvk-base` (6 champs seulement :
`id,name,initialPower,finalPower,initialKp,totalKpGained`), jamais rafraîchi depuis. C'est
la cause directe du symptôme signalé : Performance vide côté morts/objectifs alors que la
donnée existe dans le scan qui alimente déjà la course.

**Constat clé, vérifié dans `digest.js`** : **aucun document Firestore actuel ne contient
le détail complet de notre seul royaume** avec les diffs nets par gouverneur. Le seul
document par-joueur (`players_top`) est tronqué au **Top 200 mondial** du DKP de course —
nos propres joueurs peuvent en être partiellement ou totalement absents selon leur
classement face aux ~32 royaumes de la coalition. `data.players` (le détail complet,
tous royaumes, calculé en mémoire par `buildAll`) existe mais n'est **jamais persisté**.
C'est le premier trou technique à combler (§4.1), indépendant du reste.

**F-030/`Spec_Ingestion_Progression_Unifiee.md` avait déjà cadré une unification, mais
plus étroite** : seule la **progression** (`totalKpGained`/`finalPower`) était dans son
périmètre, via un flag `sheet`/`scan` par instance, **2997 explicitement exclu** (reste
`sheet`). Cette nouvelle demande élargit le périmètre à **l'ensemble** du document
`static_data/kvk` (dont `totalDead`, `goalPercent`, `rate`) — ce document généralise F-030,
il ne le remplace pas.

---

## 3. Les 6 angles instruits

### 3.1 Le scan contient-il fiablement notre royaume, avec morts + KP ?

- **Identification du royaume** : oui, chaque ligne `Full Data`/`Basic Data` porte
  `kingdom` (vérifié `parse.js`, déjà utilisé par `ingest-soc-scan.mjs` :
  `.filter(r => String(r.kingdom) === KINGDOM)`). « Notre royaume » a déjà un porteur de
  config **existant et réutilisable sans rien inventer** : `kvk_race/{cid}.pinned_kingdoms[0]`
  (`RaceConfigForm`, défaut `BRANDING.kingdomNumber` — déjà per-instance).
- **Couverture partielle, déjà connue et acceptée ailleurs (F-029, `Spec_Format_Interne` §3)** :
  `Basic Data` couvre **tous** les gouverneurs du royaume (puissance seule) ; `Full Data`
  n'est qu'un **« sous-ensemble détaillé »** (commentaire du script d'ingestion) — morts/KP
  disponibles seulement pour ce sous-ensemble, dont le seuil ProKingdoms exact n'est **pas
  documenté**. → Puissance dérivable pour tout le royaume, morts/KP/objectifs seulement pour
  le sous-ensemble détaillé (nommé **A-053**, reste ouverte — voir §5 : 46/47 sur un
  échantillon réel, un seul scan/royaume, ne généralise pas encore).
- **Morts sans split T4/T5** : le scan expose un agrégat `dead_diff` (toutes tiers
  confondus), **pas** de colonnes séparées T4/T5. Déjà identifié pour les fillers
  (`Spec_Format_Interne_Adaptateurs_Scan.md` §3) — s'applique **aussi** aux comptes
  principaux, fillers explicitement hors périmètre (**A-054**, §3.4).
- **✅ A-052 RÉSOLUE (2026-08-13)** — A-005 avait établi que le `totalDead` **actuel** (issu
  du Sheet) est en **points** (~200/mort T5), pas en têtes. **Vérifié sur le scan 006 SoC 4
  de 2997 vs la feuille** (46/47 joueurs, médiane des ratios) : `sheet.totalDead /
  scan.dead_diff = 1,0000` — `dead_diff` est en **têtes**, sur la **même échelle** que la
  feuille. **Aucune conversion nécessaire.** Mapping figé : `totalDead ← dead_diff`
  (§4.2). Voir `Assumptions_Log.md` A-052 pour la preuve détaillée.
- **✅ A-055 RÉSOLUE (2026-08-13)** — `metrics.js` liste **deux** colonnes diff distinctes,
  `kill_points_diff` **et** `points_difference`. **Vérifié sur le même scan 006** :
  `sheet.totalKpGained / scan.kill_points_diff = 1,0000` (médiane) — c'est
  **`kill_points_diff`** (colonne « Full Data », nommée KP) qui correspond au `totalKpGained`
  interne. `points_difference` donne le même chiffre sur ce scan précis, mais on retient la
  colonne sémantiquement correcte plutôt qu'une coïncidence numérique. Mapping figé :
  `totalKpGained ← kill_points_diff` (§4.2).

### 3.2 Diff base → courant (initial vs final)

C'est **exactement** ce que fait déjà le moteur de course (`engine.js`
`computeNetPlayers` : scan de base = marqueur `BASE` ou plus petite séquence, net = valeur
au scan N − valeur au scan de base, par gouverneur). Pas une nouvelle brique — un
alignement naturel sur la séquence de scans **déjà déposée** pour la course, sans double
geste.

**Contrainte opérationnelle à documenter (pas un bug de code)** : le **premier scan de
la campagne (marqueur `BASE`)** doit être posé **après la fin du pré-KvK**, pour rester
cohérent avec la règle déjà actée `max_power` (A-005/F-029 — puissance de référence = pic
observé, anti-abus). Si le leadership dépose son premier scan de course trop tôt, la
référence d'objectifs se déplacerait silencieusement. À inscrire dans le runbook de dépôt
de scan, pas à corriger en code.

### 3.3 Sort de la feuille Google / `syncKvk`

**Recommandation : coexistence, pas de dépréciation.** Réutiliser le modèle **déjà cadré et
implicitement approuvé** par `Spec_Ingestion_Progression_Unifiee.md` : un flag **« source
Performance »** par instance (`sheet` | `scan`), défaut `sheet`. **2997 reste `sheet`** —
la feuille fonctionne, zéro risque, aucun changement de comportement. Le **pilote** (et
toute future instance sans feuille) bascule `scan`. `syncKvk` n'est **pas supprimé** : il
continue de tourner sur 2997 tant que le flag n'y est pas changé. Migrer 2997 vers `scan`
est un **chantier ultérieur séparé**, distinct (touche une source de vérité en prod) — hors
périmètre de cette spec. **A-052/A-055 (échelle, colonne KP) sont désormais résolues**, ce
qui ne bloque plus une bascule 2997 sur ce plan technique précis ; le risque résiduel qui
la retient est différent (§3.5 — la référence `max_power` du Sheet n'est pas vérifiée
comme équivalente à celle du scan), pas une raison d'engager cette migration ici.

### 3.4 Fillers — même unification ?

**Hors périmètre pour cette itération.** Le scan ne fournit pas le split T4/T5 des morts
(§3.1), condition strictement nécessaire à la formule filler BR-018
(`4×T4 + 10×T5`). Unifier produirait un objectif filler **faux** plutôt qu'absent — plus
mauvais que le statu quo. Le pilote reste **sans fillers** tant qu'aucune source scan ne
porte ce détail (pas une régression : c'est déjà l'état actuel). `syncKvkFiller` continue
sur 2997, inchangé.

### 3.5 Impact sur la référence d'objectifs (A-005 / `max_power`)

- **Pilote : aucun changement de méthodologie.** La référence actuelle
  (`ingest-soc-scan.mjs --kvk-base`) est **déjà** dérivée du même scan SoC/ProKingdoms,
  déjà ancrée sur `max_power`. Cette spec **automatise en pipeline** ce qui se fait
  aujourd'hui **manuellement en local** — elle ne change pas la règle, elle en industrialise
  l'exécution. Garde-fou à préserver explicitement dans le code : le scan de base
  (marqueur `BASE`) reste le pic de puissance fin pré-KvK, **jamais** recalculé à un scan
  ultérieur (§4.3).
- **2997 (si bascule future) : rupture potentielle, non vérifiée.** Rien ne garantit que
  la colonne `INITIAL_POWER` du Sheet suive la même règle `max_power` — jamais comparé.
  Encore une raison de garder 2997 sur `sheet` par défaut tant que ce n'est pas vérifié.

### 3.6 Multi-instance : opt-in ou global ?

**Recommandation : opt-in par instance**, pas global — cohérent avec la position déjà
actée pour F-030. Cette spec **étend le même flag** plutôt que d'en créer un second (un
flag « source objectifs/progression » ET un flag « source Performance complète » séparés
serait une source de confusion inutile — un seul flag `sheet`/`scan` par instance couvre
les deux granularités, la version `scan` implique simplement un mapping plus complet).

---

## 4. Plan de construction (finalisé — gate levé, prêt pour implémentation)

### 4.1 Extraire « notre royaume » du pipeline de course déjà en place

Dans `recomputeRace` (`digest.js`), ajouter un document par scan écrivant le sous-ensemble
« notre royaume », **tous** les gouverneurs (pas tronqué à un Top N, contrairement à
`players_top`) :

1. **Filtre royaume** : `kingdom === pinned_kingdoms[0]` (`kvk_race/{cid}` config, déjà
   per-instance, `RaceConfigForm`) — pas de nouvelle config à créer.
2. **Jointure Basic + Full** (constatée au parse, à coder explicitement — ce n'est pas ce
   que fait `buildAll` aujourd'hui, qui ne travaille que sur `Full Data`) :
   - **Basic Data** = univers de référence pour le royaume filtré : **tous** les
     gouverneurs (`governor_id, name, kingdom, power`/`kp`, `min_points`/`max_points`/
     `points_difference`).
   - **LEFT JOIN Full Data** par `governor_id` : ajoute `dead_diff`, `kill_points_diff`,
     `kills_iv_diff`, `kills_v_diff` **quand disponibles** (sous-ensemble haut-tier
     uniquement — cf. A-053).
3. Écrire le résultat de la jointure (léger, un document par scan) — donnée dérivée en
   mémoire à partir de ce que `buildAll`/les fichiers `derived/` contiennent déjà pour
   `Full Data` + un accès à `Basic Data` du scan à ajouter au pipeline (aujourd'hui
   `LIGHT_COLS`/`digest.js` ne conserve que `Full Data`, cf. §4.4 note d'implémentation).
   Coût marginal, aucune nouvelle lecture externe.

### 4.2 Mapping scan → `static_data/kvk` (mappings figés, vérifiés A-052/A-055)

Nouvelle fonction (ou extension de `recomputeRace`), déclenchée uniquement si le flag
d'instance = `scan` :

| Champ `KvkRecord` | Source (haut-tier, `Full Data` présent) | Repli (bas-tier, `Basic Data` seul) |
|---|---|---|
| `initialPower` / `initialKp` | valeurs au scan de base (`baseIdx`) | idem, depuis `Basic Data` (`power`/`min_points`) |
| `finalPower` | `latest_power`/`power` au dernier scan | idem, `Basic Data` |
| `totalPowerDiff` | **`finalPower − initialPower`**, calculé à l'écriture (équivaut au `net_power_diff` du moteur de course, §2/`engine.js` — value au scan N − value au scan de base) | idem, sur les puissances `Basic Data` (**disponible pour tout le royaume** — la puissance est dans `Basic Data`, contrairement aux morts) |
| `totalKpGained` | **`kill_points_diff`** *(figé — A-055)* | `points_difference` de `Basic Data` (≈ même valeur sur l'échantillon vérifié, mais source distincte — repli documenté, pas une garantie générale sur tous les royaumes/scans) |
| `totalDead` | **`dead_diff`** *(figé — A-052, aucune conversion)* | **absent** (`undefined`, jamais `0` — pas de morts détaillées hors `Full Data`) |
| `goalPercent` / `rate` | **calculés à l'écriture** via `src/lib/kvkGoals.js` `computeKvkGoals()` + `kvkScoring.js` `rateFromGoalPct()` (miroir `functions/kvkGoals.js`, déjà testé en parité) | calculés si `totalDead` disponible ; sinon `goalPercent` reste calculable sur KP seul si le composant le permet, `rate` (BR-019, qui dépend des deux) omis proprement |
| `totalKills` | `kills_iv_diff + kills_v_diff` (dérivable) | **Abandonné** — grep confirme **aucun usage** dans l'UI aujourd'hui, sur les deux tiers |
| `totalAcclaim` | **non dérivable** (absent du scan) | **Abandonné** — idem, sans usage UI |

**Décision figée sur le cas bas-tier** (1/47 sur l'échantillon vérifié, cf. A-053) :
`totalDead` **absent** plutôt que `0` (règle « 0 trompeur », `Spec_Format_Interne` §2.3) ;
`totalKpGained` replié sur `points_difference` de `Basic Data`, marqué **repli**, pas
équivalent garanti à `kill_points_diff` en dehors de l'échantillon observé.

**Simplification actée** : `totalKills` et `totalAcclaim` ne sont **pas portés** dans le
nouveau schéma — champs déjà morts côté UI sur le format Sheet actuel (aucun composant ne
les lit, sur aucun tier). Les reconduire serait de la dette ajoutée pour rien.

**`totalPowerDiff` — piège vérifié en conditions réelles (2026-08-18)** : contrairement à
`totalDead` (limité au haut-tier), ce champ est **dérivable pour tout le royaume** (la
puissance est dans `Basic Data`). La carte « TOTAL POWER DIFF » (`KvKPerformancePage.jsx`,
`stats.totalPowerDiff = Σ curr.totalPowerDiff`) **somme le champ stocké tel quel** — elle ne
recalcule pas `final − init` à la volée. Conséquence observée : l'aperçu manuel du pilote,
qui n'écrivait pas ce champ, affichait un total à **0** alors que toute la donnée existait
(initialPower figé + `latest_power` du scan récent). La construction §4 **doit** écrire ce
champ explicitement (stopgap posé le 2026-08-18 : Σ = −109 M sur le pilote, cohérent avec la
perte de puissance liée aux morts). Signe usuel **négatif** en KvK (perte), la carte le rend
en rouge (BR-non-numérotée d'affichage, cf. `KvKPerformancePage`).

**Garde-fou BR-010 (rappel, non négociable)** : `totalKpGained` (domaine DKP **interne**,
F-014) ne doit **jamais** être confondu avec `dkp_net` (domaine DKP **de course**,
formule de camp paramétrable). Les deux domaines cohabitent déjà dans le même scan
source — le mapping doit lire les colonnes de diff **brutes** (`kill_points_diff`),
jamais `dkp_net` lui-même.

### 4.3 Garde-fous (repris/étendus de `Spec_Ingestion_Progression_Unifiee.md` §4)

1. **Jamais** recalculer `initialPower`/`initialKp` après le scan de base (préserve
   A-005/`max_power`, §3.5).
2. **Isolation stricte par royaume/instance** — même leçon que l'incident cross-tenant du
   2026-08-07 (garde-fou `runFullSync`), à répliquer explicitement dans la nouvelle
   fonction.
3. **Dégradation propre** (règle déjà actée, `Spec_Format_Interne` §2.3) : gouverneur en
   `Basic Data` mais absent de `Full Data` → `totalDead` **omis** (`undefined`), jamais
   `0` ; `totalKpGained` replié sur `points_difference` (marqué comme repli, §4.2).
4. **Flag « source Performance » par instance** (`sheet`|`scan`, réutilise le flag déjà
   cadré par F-030) : `sheet` = comportement 2997 inchangé (branche `scan` jamais
   exécutée) ; `scan` = pilote et toute future instance sans feuille.
5. **Domaine BR-010** : voir §4.2 ci-dessus.
6. **A-053 (couverture `Full Data`) reste ouverte** : le mapping doit fonctionner
   correctement même si la proportion bas-tier/haut-tier varie fortement d'un royaume à
   l'autre (l'échantillon vérifié — 1/47 — ne généralise pas la règle « Top 300 »).

### 4.4 Note d'implémentation — jointure Basic Data

Point technique à traiter en amont du code (pas cadré plus loin ici, hors périmètre PM) :
`digest.js`/`LIGHT_COLS` ne conserve aujourd'hui que les colonnes de `Full Data` dans les
fichiers `derived/*.json` — `Basic Data` (nécessaire pour couvrir les gouverneurs bas-tier,
§4.1/§4.2) n'est pas persistée par le pipeline de course actuel. Ajouter cette lecture est
un détail d'implémentation du chantier dev, pas une nouvelle hypothèse produit.

### 4.5 État de construction — Phase 1 livrée (2026-08-18, code)

**Construit** (`functions/kvkRace/perfExport.js`, branché dans `recomputeRace` en fin de
digest, isolé en try/catch) : à chaque scan de course, si le flag d'instance
`PERFORMANCE_SOURCE=scan` (pilote ; **jamais 2997** — garde-fou dur sur `PROJECT_ID`),
`static_data/kvk` est rafraîchi depuis le **dernier scan** pour `cfg.pinned_kingdoms[0]` :
`finalPower ← latest_power`, `totalDead ← dead_diff`, `totalKpGained ← kill_points_diff`
(colonnes **brutes** du scan, BR-010 — jamais `dkp_net`/`net_*`), `totalPowerDiff =
finalPower − initialPower`, `goalPercent`/`rate` via `kvkGoals.js`. `initialPower`/`initialKp`
**préservés** (jamais recalculés, §4.3.1). Test : `tests/perfExport.test.mjs` (mapping pur, 4/4).

**Approche « préserver la référence figée + rafraîchir le courant »** : F-036 ne **crée** pas
la référence d'objectifs — elle vient toujours du scan de base manuel (`ingest-soc-scan.mjs
--kvk-base`, §3.5) ; F-036 la maintient fraîche à chaque scan. Sans référence figée → no-op.

**Reporté hors Phase 1** (assumé) : join `Basic Data` pour les bas-tiers (§4.4 — le dérivé de
course ne persiste que `Full Data`, donc seuls les gouverneurs de la référence figée présents
dans `Full Data` sont rafraîchis) ; fillers (A-054) ; bascule 2997.

**Reste avant « live »** : `PERFORMANCE_SOURCE=scan` posé (`functions/.env.kd-41-manager`) →
déployer les functions du pilote (**⚠️ resupprimer `scheduledSync` après** — cf. runbook,
Annexe cross-tenant) → `recomputeRaceCampaign` pour peupler.

---

## 5. Zones d'ombre nommées (2 résolues, 2 restent ouvertes sans bloquer)

| ID | Hypothèse | Statut |
|---|---|---|
| **A-052** | Échelle de `dead_diff` (têtes ? points ?) vs `TOTAL_DEAD` du Sheet. | ✅ **RÉSOLUE 2026-08-13** — médiane des ratios = 1,0000 (scan 006 SoC 4 de 2997, 46/47 joueurs). `dead_diff` = têtes, même échelle que la feuille. Mapping figé §4.2. |
| **A-053** | Couverture réelle de `Full Data` (« sous-ensemble détaillé »), seuil non documenté. | **Ouverte, informée** — 46/47 sur l'échantillon vérifié (1 gouverneur bas-tier absent de `Full Data`). Un seul scan/royaume : ne bloque pas ce périmètre (le cas bas-tier est géré, §4.2), mais ne généralise pas encore la règle « Top 300 » à toute instance. |
| **A-054** *(reprend Spec_Format_Interne §3)* | Le scan ProKingdoms n'expose pas le split T4/T5 des morts. | **Ouverte, non bloquante pour ce périmètre** — fillers explicitement hors périmètre de F-036 (§3.4), aucune dépendance de la construction §4 sur cette hypothèse. |
| **A-055** | `kill_points_diff` vs `points_difference` — laquelle nourrit `totalKpGained`. | ✅ **RÉSOLUE 2026-08-13** — médiane des ratios = 1,0000 sur le même scan. `kill_points_diff` retenu (colonne nommée KP). Mapping figé §4.2. |

---

## 6. Effort / impact / risque

- **Effort global : M, gate levé.** Étend un pipeline déjà existant (pas de nouvelle
  ingestion, pas de nouveau bucket/scan/upload) — réutilise `engine.js`, `digest.js`,
  `kvkGoals.js`, `kvkScoring.js`. Détail : §4.1 **M** (jointure Basic+Full à coder — plus
  qu'une simple écriture, cf. §4.4, `Basic Data` pas encore persistée par le pipeline
  actuel) · §4.2 **M** (fonction de mapping figée + repli bas-tier + tests de parité, sur
  le modèle `kvkGoals.js` ↔ `functions/kvkGoals.js`) · §4.3 **S–M** (garde-fous + tests
  `firestore-rules`/parité). **A-052/A-055 vérifiées** (2026-08-13) — l'effort de
  vérification (S) est consommé, plus rien ne bloque le démarrage du code.
- **Impact : Fort sur le pilote** (répare Performance, seul geste manquant à date, sans
  script local) ; **Moyen sur 2997** (aucun changement tant qu'il reste `sheet`, bénéfice
  différé si bascule future) ; **structurant pour l'industrialisation** — chaque nouveau
  royaume client scan-based récupère Performance gratuitement, sans feuille à maintenir
  (lien commercial, §7).
- **Risque : Faible-à-moyen, réduit par la vérification.** Le risque principal (mapping
  d'échelle/colonne faux, §3.1) est **levé** — mappings figés et vérifiés sur données
  réelles. Risque résiduel : **A-053** (généralisation de la couverture `Full Data` à
  d'autres royaumes/scans que l'échantillon vérifié — géré par un repli documenté, pas
  supprimé) et le cross-tenant (même garde-fou que l'incident du 2026-08-07, à répliquer
  explicitement, §4.3.2). **Nul sur 2997** (flag `sheet` par défaut, comportement inchangé
  tant que non activé).

---

## 7. Lien commercial (signalé, non traité ici)

Renforce le modèle « BYO scans → une source alimente tout » déjà évoqué
(`Etude_Commercialisation_SaaS.md` §4, agent `commercial`) : un royaume client scan-based
n'a plus besoin d'une feuille Google maintenue à la main pour avoir Performance **et**
Course. Réduit une étape du runbook d'onboarding
(`Etude_Industrialisation_Onboarding.md`). À chiffrer séparément par l'agent `commercial`
si utile — non instruit ici.

---

## 8. Recommandation & séquencement — prêt à construire

1. ~~Lever A-052 et A-055~~ ✅ **fait le 2026-08-13** (scan 006 SoC 4 de 2997 vs Sheet,
   médiane des ratios = 1,0000 sur les deux mappings).
2. **§4.4/§4.1** — étendre le pipeline de course pour persister `Basic Data` (nécessaire au
   repli bas-tier) et écrire le sous-ensemble « notre royaume, jointure Basic+Full » (M —
   revu à la hausse depuis le cadrage initial, la persistance de `Basic Data` n'existe pas
   encore dans `digest.js`).
3. **§4.2** — écrire la fonction de mapping scan → `KvkRecord` (mappings figés :
   `totalDead ← dead_diff`, `totalKpGained ← kill_points_diff`, repli bas-tier sur
   `points_difference`) + poser le flag « source Performance » par instance (réutilise le
   flag déjà cadré par F-030) ; déployer d'abord sur le **pilote** (répare un vrai manque,
   risque contenu par l'isolation d'instance).
4. **Ne pas toucher 2997** (reste `sheet`) — aucune demande explicite du Roi de basculer
   2997 à ce jour ; le risque résiduel §3.5 (référence `max_power` du Sheet non vérifiée
   équivalente à celle du scan) reste un motif de prudence propre à 2997, indépendant
   d'A-052/A-055.
5. **Fillers (§3.4)** : ne pas engager tant qu'aucune source scan ne porte le split T4/T5
   (A-054, inchangée).

---

## 9. IDs & référentiels

- **F-036** *(nouveau, extension de F-030)* — Performance KvK dérivée du scan ProKingdoms,
  rattachée à **E-005**.
- **US-047** *(E-005)* — voir `ProductBacklog.md`.
- **A-052, A-055** *(RÉSOLUES 2026-08-13)* et **A-053, A-054** *(ouvertes, non bloquantes)* —
  numérotées après A-050/A-051, déjà pris le même jour par `Arbitrage_Partenariat_ProKingdoms.md`.
  Voir `Assumptions_Log.md`.
- Amende (sans les remplacer) **F-030/US-034** et `Spec_Ingestion_Progression_Unifiee.md` —
  cette spec les généralise à l'ensemble du document `static_data/kvk`.
