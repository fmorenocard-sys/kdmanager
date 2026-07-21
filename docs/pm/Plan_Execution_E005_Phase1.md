# Plan d'exécution — E-005 Phase 1 « KvK Race » (F-018 + F-019)

> Date : 2026-07-21 · Statut : **En exécution** (GO 5/5, voir `Etude_Fusion_KvK_Manager.md` §9)
> Source à porter : `C:\Users\fmore\Documents\RoK\2997\2026_06_KingOfAllBritain` (moteur Python ~800 lignes : `src/ingest.py`, `src/transform.py`, `src/metrics.py` ; UI Streamlit `app.py`)

## 1. Ce que fait le moteur (compris et validé sur les 6 scans réels SoC 4)

1. **Ingestion** (`ingest.py`) : scans `.xlsx` ~19 Mo, 4 feuilles (`Basic Data` ~14 k lignes, `Full Data` ~8,3 k — table de référence joueurs, `Summary`/`Summary Full` — 32 royaumes). Parse séquence + horodatage + marqueur `BASE_` depuis le nom de fichier ; cast texte→entier (valeurs jusqu'à ~20 Md) ; mapping royaume→camp **reconstruit dynamiquement** (les Summary n'ont pas `campid`).
2. **Nets base-scan** (`transform.py`) : `net = scan_N − base` **par `governor_id`** (absent du base → 0 ; absent du scan N → non inventé ; nets de score négatifs tronqués à 0 avec log ; `power_diff` garde ses négatifs). Agrégation royaume/camp **après** la soustraction, jamais l'inverse.
3. **Exclusions anti-triche** : gel de la progression d'un périmètre (royaume/camp) entre deux scans, composables, fenêtres absorbées par la base ignorées. Cas réel : guerre civile KD 3567 scans 2→4.
4. **DKP de course** (`metrics.py`) : poids **effectifs 40/200/6** sur les compteurs (Classic DKP : T4 10 KP×4, T5 20 KP×10, deads ×6), **surchargeables par config** — conforme BR-010 (domaine coalition, jamais mélangé au DKP interne).
5. **Vues** : duel de camps (écart + variation), classement royaumes (pins 2997/1523, couverture), tops joueurs, vitesse inter-scans, ratios d'efficacité (`dkp_per_mpower`, `dkp_per_gov`).

## 2. Architecture cible (rappel étude, affinée)

```
Officier dépose le scan .xlsx (~20 Mo)
  → Cloud Storage  gs://…/kvk_race/{campaignId}/scans/{fichier}
  → Function digestScan (trigger onFinalize, Node, mem 1–2 Go, SheetJS)
      1. parse le nom (seq/ts/BASE) + les 4 feuilles, cast numérique
      2. si BASE : écrit base_index.json (valeurs par governor_id) dans Storage
      3. sinon : charge base_index.json, applique exclusions puis nets, agrège
      4. écrit dans Firestore (pré-agrégé, 1–2 reads par vue) :
         kvk_race/{campaignId}                    → config campagne (King, US-016)
         kvk_race/{campaignId}/scans/{seq}        → méta scan + agrégats camps + duel
         kvk_race/{campaignId}/kingdoms/{seq}     → 32 royaumes (~15 Ko)
         kvk_race/{campaignId}/players_top/{seq}  → top 200 joueurs (~80 Ko)
  → Page P-008 « KvK Race » (React), réservée King/Officer (modèle BR-011)
```

- **Config de campagne** (US-016, éditée par le Roi) : labels/rôles des camps, duel hero, royaumes épinglés, poids DKP, override du base scan, exclusions — iso-fonctionnelle avec `config/camp_labels.json` du moteur Python.
- **Le per-gouverneur complet reste dans Storage** (base_index + nets par scan si besoin) — Firestore ne porte que le pré-agrégé, conformément au chiffrage de l'étude.
- Rules : `kvk_race/**` read King/Officer (décision §9.4) ; write Functions uniquement ; Storage upload Officer+ (A-010, BR à créer).

## 3. Parité Python → JS (fait dès aujourd'hui)

Le jeu de référence est **généré et versionné** : `tests/fixtures/kvk_race_parity/`
(`camps.csv` 24 lignes, `kingdoms.csv` 192, `duel.csv` 6, `players_top200.csv` 1 200, `manifest.json` — produit par le moteur Python sur les 6 scans réels SoC 4, config et exclusions incluses ; duel final : East-Anglia 1 075 586 926 506 vs Wessex 991 332 234 138, écart +84 254 692 368).

**Critère d'acceptation du portage (F-018)** : le module JS, nourri des mêmes 6 xlsx, reproduit ces CSV à **tolérance 0** (test automatisé, hors emulator).

## 4. Découpage du chantier

| # | Livrable | Contenu | Sortie de validation |
|---|---|---|---|
| 1 | ✅ **Moteur JS** (`functions/kvkRace/` : `parse.js`, `engine.js`, `metrics.js`, `runParity.mjs`) — **fait le 2026-07-21** | Portage ingest/transform/metrics (sans pandas : maps par governor_id) | **Parité totale au premier run** : 6 scans (56 326 lignes joueur, 12 s de lecture), exclusion KD 3567 identique (433 gouverneurs), camps 24/24 · royaumes 192/192 · duel 6/6 · top200 1200/1200 à tolérance 0. Relance : `cd functions && node kvkRace/runParity.mjs <scansDir>` |
| 2 | **Pipeline Storage + Function** | Bucket + règle upload Officer+, trigger `digestScan`, écritures Firestore, base_index | Digestion des 6 scans SoC 4 rejoués via le bucket |
| 3 | **Config campagne (US-016)** | Doc `kvk_race/{id}` + formulaire King (camps, duel, pins, DKP, exclusions) | Création de la campagne « SoC 4 replay » sans code |
| 4 | **Page P-008 (F-019)** | Vues Camps (duel hero), Royaumes (pins + couverture), Évolution (courbes + écart) — charte v2, gating King/Officer, i18n ×9 | Vérif navigateur + données réelles |
| 5 | **Docs & QA** | SSOT (F-018/F-019 + BR upload/visibilité), TestPack, changelogs | Artefacts à jour au commit |

Jalons 1–2 = cœur de risque (parité + mémoire/coûts) ; 3–4 = surface produit ; l'ordre est séquentiel.

## 5. Risques suivis (de l'étude, avec mitigation en place)

- **Format des scans tiers** (A-009) : parseur isolé + versionné, scans bruts conservés dans Storage pour re-digestion.
- **Parité des calculs** : fixtures §3, tolérance 0 — le portage ne peut pas dériver silencieusement.
- **Mémoire Function** (xlsx 20 Mo / 14 k lignes) : SheetJS en mode dense + mem 1 Go, à mesurer au jalon 2.
- **Coûts** : tout pré-agrégé (≤ ~100 Ko par scan côté Firestore), purge Storage post-saison.
