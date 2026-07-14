# Étude — Fusion Kingdom Manager × KvK Manager en un outil centralisé (E-005)

> Date : 2026-07-14
> Statut : **Proposée — en attente d'arbitrage du Roi** (décisions à rendre en §9)
> Sources : inventaire complet des deux outils (repo `kdmanager` + dossier `2026_06_KingOfAllBritain`), `BRIEF.md` du KvK Manager, règles `.agent/rules/product-manager.md` et `.agent/rules/designer.md`

---

## 1. Contexte & Problème

Le leadership de KD 2997 pilote aujourd'hui la communauté avec **trois outils déconnectés** :

| Outil | Nature | Périmètre | Utilisateurs | Limites structurelles |
| :--- | :--- | :--- | :--- | :--- |
| **Kingdom Manager** (ce repo) | Web app React + Firebase, multi-utilisateurs, SSO Discord | Le royaume 2997 : ~300 joueurs, War Tracker, perf KvK vs objectifs, banque, deadweight, historique des campagnes | King / Officers / Warriors / Guests (9 langues) | Ne voit **que notre royaume** ; aucune vision coalition/adversaires pendant un KvK |
| **KvK Manager** (`2026_06_KingOfAllBritain/app.py`) | Dashboard Python/Streamlit **local, mono-poste, sans auth** | La compétition KvK entière : 32 royaumes, 4 camps, ~8 300 gouverneurs, DKP net multi-scans, duel East-Anglia vs Wessex, efficacité, exclusions anti-triche | Le Roi seul (partage par copies d'écran / CSV collés sur Discord) | Invisible pour les officiers et les joueurs ; ingestion manuelle de scans xlsx ~20 Mo ; re-créé à chaque saison |
| **Classeurs Compositions** (`KvK_Compositions_KD2997*.xlsx`) | Excel manuel autonome | Scouting / tiering S-A-B-C des 32 royaumes, notes de renseignement, matchmaking pré-saison | Le Roi seul | Aucune passerelle avec les deux autres ; entités royaume/camp dupliquées à la main |

Conséquences concrètes observées pendant SoC 4 « King of All Britain » (11/6 → 7/7 2026) :

- La lecture n°1 du leadership (**East-Anglia est-il devant Wessex dans la course à l'étoile ?**) n'est accessible qu'au Roi, sur son poste, après dépôt manuel du scan.
- **Trois définitions du DKP coexistent** sans arbitrage (voir §5) — un même joueur peut avoir trois scores selon l'outil qui le calcule.
- Le pivot joueur existe des deux côtés (`governor_id`) mais **rien ne relie** la perf individuelle du War Tracker (objectifs F-014, historique F-015) aux données de course du KvK Manager.
- À chaque saison, le KvK Manager est reconstruit (dossier daté, config par saison) alors que le Kingdom Manager, lui, capitalise (archives `kvk_history`).

## 2. Utilisateurs & Valeur

| Rôle | Valeur d'un outil centralisé |
| :--- | :--- |
| **Roi** | Une seule source de vérité ; la course à l'étoile consultable partout (mobile inclus) ; scouting et exclusions anti-triche persistés de saison en saison ; DKP unique et paramétrable. |
| **Officiers** | Accès direct au suivi de course (aujourd'hui réservé au poste du Roi) ; upload des scans sans dépendre du Roi ; croisement immédiat course ↔ disponibilités War Tracker. |
| **Warriors** | Voir leur contribution **dans le contexte de la coalition** (mon DKP net vs la course du camp) ; transparence = engagement (même levier que F-015). |
| **Coalition (1523 & alliés)** | Optionnel V2+ : lecture partagée du dashboard de course (lien public), remplaçant les CSV collés sur Discord. |

**Métriques d'impact proposées** : consultations de la vue course pendant un KvK ; délai entre scan disponible et scan visible en ligne ; nombre d'utilisateurs distincts de la vue (aujourd'hui : 1) ; abandon effectif des classeurs Excel de scouting.

## 3. Ce que chaque outil apporte (inventaire de fusion)

### Acquis du Kingdom Manager réutilisables tels quels
- **Socle produit** : auth SSO Discord + RBAC 4 rôles (F-007/F-010), i18n 9 langues (F-009), design system v2 tokens dark/light (F-017), bot Discord (F-012), archives `kvk_history` (F-015).
- **Pipeline d'ingestion existant** : Cloud Functions `syncData`/`scheduledSync` (E-001) — à étendre, pas à réinventer.
- **Pivot d'identité** : `governor_id` comme clé stable (BR-007), déjà la règle des archives.

### Acquis du KvK Manager à transposer (logique éprouvée en production sur SoC 4)
- **Règle du base scan** (`src/transform.py`) : net = scan N − base, soustrait **au grain joueur** puis agrégé ; cas limites gérés (absent du base, net négatif, scans partiels).
- **DKP paramétrable** (`src/metrics.py`, `config/camp_labels.json`) : poids par campagne, jamais codés en dur.
- **Exclusions anti-triche** : gel de la progression d'un royaume/camp entre deux scans (cas réel : guerre civile KD 3567, scans 2→4) — règles composables persistées en config.
- **Analytique** : duel de camps + variation d'écart, efficacité (`DKP/M power`, `DKP/gouverneur`), vitesse inter-scans, couverture de scan (garde-fou qualité).
- **Parsing des scans** (`src/ingest.py`) : 4 feuilles, cast texte→int (valeurs ~20 Md), reconstruction du mapping royaume→camp par vote majoritaire, ordre par séquence + horodatage du nom de fichier.

### Ce qui n'existe nulle part en logiciel
- Le **scouting/tiering des 32 royaumes** (classeurs Excel v1/v2) : notes de renseignement, statut « Scouted », tier S/A/B/C — candidat à digitalisation en Phase 3.

## 4. Vision cible — un module « KvK Race » dans le Kingdom Manager

**Recommandation : absorber le KvK Manager dans le Kingdom Manager** (et non l'inverse, ni un pont entre deux apps). Justification : tout le socle coûteux (auth, rôles, i18n, design system, bot, hébergement) existe déjà côté Kingdom Manager ; le KvK Manager n'apporte que de la logique métier pure (~3 modules Python bien isolés), exactement la partie la moins chère à porter.

Nouvelle page **« KvK Race »** (P-008), visible pendant les KvK, avec 4 vues héritées du Streamlit :

1. **Camps** — bandeau hero du duel (2 camps configurables), écart + variation, classement des 4 camps.
2. **Royaumes** — les 32 royaumes triables, royaumes épinglés (2997, 1523) en tête, couverture affichée.
3. **Joueurs** — top N par DKP net, recherche, carte joueur avec évolution ; **lien croisé** vers le profil Kingdom Manager si le `governor_id` appartient à 2997.
4. **Évolution** — courbes multi-scans du duel + écart (le différenciant clé du BRIEF §4.4).

La vue « Efficacité » (scatter Power vs DKP) passe en Phase 2 : forte valeur leadership mais non bloquante pour la lecture n°1.

### Architecture d'ingestion (décision structurante)

Contraintes : scans `.xlsx` de ~20 Mo (> limite 10 Mo de `syncData`, E-003 SSOT) ; ~8 300 gouverneurs × N scans ; leaderboard actuel déjà identifié comme coûteux en lectures Firestore (dette §5 retro-doc).

| Option | Principe | Verdict |
| :--- | :--- | :--- |
| **A. Upload Cloud Storage + Function de digestion** (recommandée) | L'officier dépose le scan brut sur la page (upload direct Storage, pas de limite 10 Mo) ; une Function le parse, calcule les nets/agrégats et écrit des **documents pré-agrégés** dans Firestore. | ✅ Zéro install locale, serveur = source de calcul unique, logs centralisés |
| B. Parsing client (SheetJS) + écriture des agrégats | Réutilise le pattern historique du repo ; mais 20 Mo parsés dans le navigateur mobile d'un officier, et des écritures client à sécuriser par Rules complexes. | ⚠️ Fallback acceptable, pas la cible |
| C. Garder le Python comme moteur local qui pousse vers Firestore | Hybride : script `push_to_firestore.py`. Rapide à obtenir mais conserve la dépendance au poste du Roi et un runtime de plus à maintenir. | ❌ Reconduit le problème n°1 (mono-poste) ; au mieux une étape de transition |

**Modèle de données proposé (tout pré-agrégé, jamais de fetch des 8 300 lignes par le client)** :

```
kvk_race/{campaignId}                    → config : labels des camps, duel [a,b], pins, poids DKP, base scan, exclusions
kvk_race/{campaignId}/scans/{seq}        → 1 doc/scan : agrégats des 4 camps + tableau des 32 royaumes + méta (ts, couverture)   (~30–60 Ko)
kvk_race/{campaignId}/tops/{seq}         → top N gouverneurs (N ≈ 200) en DKP net + composantes                                   (~40–80 Ko)
kvk_race/{campaignId}/kd2997/{seq}       → détail complet des gouverneurs de 2997 (et 1523 si souhaité) pour le croisement joueur
```

Lecture d'une vue = 1 à 2 reads (vs 8 300). Les séries temporelles se construisent en lisant les docs `scans/*` de la campagne (≤ ~30 scans/saison). Le scan brut reste dans Storage (audit, recalcul si les poids DKP changent). À la clôture (F-015), le résumé de course s'archive avec la campagne.

## 5. Point d'arbitrage majeur — unifier le DKP (BR à créer)

Trois définitions coexistent aujourd'hui :

| Source | Formule | Unité |
| :--- | :--- | :--- |
| `BRIEF.md` §5.1 (« formule officielle KD 2997 ») | `T4×4 + T5×10 + deads×6` | poids exprimés en équivalent kill points |
| Code `metrics.py` (implémentée, alignée « Classic DKP » ~99 %) | `T4×40 + T5×200 + deads×6` | poids effectifs par kill (T4 = 10 KP × 4 ; T5 = 20 KP × 10) — même formule que ci-dessus, unité différente |
| `Assumptions_Log` A-005 / Étude F-014 (score « in-game ») | `T4 kills×2 + T5 kills×4 + T4 dead×4 + T5 dead×5` | formule distincte, utilisée comme référence des objectifs individuels |

Les deux premières sont réconciliables (documentation d'unité). La troisième ne l'est pas : **F-014 (objectifs individuels) et la course de camps utiliseraient deux DKP différents dans la même app** — inacceptable en l'état.

**Proposition** : un service unique `dkpService` avec **poids par campagne** stockés dans `kvk_race/{campaignId}` (le KvK Manager le fait déjà via `config/camp_labels.json`), et une règle métier **BR-010** : « tout affichage de DKP référence explicitement la formule de sa campagne ; une campagne a une et une seule formule ». L'arbitrage de la formule par défaut appartient au Roi (lié au blocage A-005 de F-014).

## 6. Périmètre proposé & phasage

### Phase 1 — MVP « Course à l'étoile » (F-018, F-019)
1. **F-018 Ingestion des scans KvK** : upload Storage (Officer+), Function de digestion (nets par gouverneur, agrégats, tops), gestion base scan + scans partiels. Config de campagne (camps, duel, pins, poids) par le Roi.
2. **F-019 Dashboard de course** : vues Camps / Royaumes / Évolution (duel + écart). Lecture publique (cohérent A-003).

### Phase 2 — Analytique & intégrité (F-020)
3. Vue Joueurs (top N, recherche, carte joueur, croisement profil 2997) + vue Efficacité.
4. Exclusions anti-triche (config King, bandeau explicite sur les vues affectées).
5. Intégrations : archivage du résumé de course à la clôture F-015 ; bot Discord — publication du snapshot du duel (`/kvkrace` ou post automatique après ingestion), remplaçant l'export PNG jamais construit du BRIEF §4.5.

### Phase 3 — Scouting & préparation (F-021)
6. Digitalisation des classeurs Compositions : fiche par royaume adverse (tier, notes, statut de scouting, contact), alimentée par les agrégats de scans passés — mémoire inter-saisons dans Firestore.

### Hors périmètre (explicitement)
- Toute écriture in-game ou connexion API RoK (A-002 inchangée).
- Multi-tenant / autres royaumes que l'écosystème 2997.
- Le matchmaking automatique (le tiering reste un outil d'aide à la décision humaine).

## 7. Impacts transverses

- **RBAC / Rules** : `kvk_race` read public, write Functions only ; config campagne write King ; upload Storage restreint Officer+ (**BR-011** à formaliser). S'inscrit dans l'audit BUG-002.
- **Coûts Firebase** : writes = 1 digestion/scan (~30/saison) ; reads = docs agrégés uniquement. Storage ~20 Mo × 30 scans/saison — prévoir une politique de purge/archivage. À chiffrer en cadrage.
- **QA** : nouvelles entrées SSOT (F/BR), cas de test prioritaires : soustraction du base scan (net=0 sur base seul), joueur absent du base, scan partiel (couverture), exclusion appliquée, limite 1 Mo des docs agrégés.
- **i18n** : tout le vocabulaire de course (camp, duel, écart, couverture…) dans les 9 langues, `src/locales` **et** `public/locales` (corriger au passage l'absence de fr/pl/vi côté public).
- **Dette évitée** : le portage tue la re-création annuelle de l'outil Python et la double maintenance des entités royaume/camp dans Excel.

## 8. Déclinaison UX/UI (règles designer)

Conformément à `.agent/rules/designer.md` : **rationaliser, ne pas refondre** — la page KvK Race doit être indiscernable du reste de l'app.

- **Écran** : P-008 « KvK Race », typologie *dashboard + listes* ; niveau d'accès : public en lecture, actions gated.
- **Réutilisation stricte des composants existants** : `StatCard` pour les KPI (icône **à gauche**, convention listes KvK ; bordure sémantique — notre camp = indigo « current », adversaires = neutre, écart positif = emerald / négatif = red), `Card`/`PageHeader`/`Table` (sticky header, scroll dans son conteneur), `AccessGate` pour l'upload (officer) et la config (King), `Button` primaire existant. Aucune nouvelle variante de composant sans passage par le design system (re-sync des cards Claude Design après coup).
- **Graphes** : **Recharts** (déjà dans le bundle) et non Plotly — une seule bibliothèque de charts dans l'app. Courbes du duel = 2 séries + série d'écart en barres ; couleurs sémantiques tokens, jamais la couleur seule comme signal (étiquettes ↑/↓ + valeur).
- **Bandeau hero du duel** : 2 StatCards jumelles + une carte « écart » centrale avec variation depuis le scan précédent — l'action de lecture n°1 du BRIEF, au-dessus de la ligne de flottaison, y compris à 360 px.
- **Responsive** : tableau des 32 royaumes → cartes empilées en mobile (pattern existant des pages KvK) ; **aucun scroll horizontal de page** ; épinglage 2997/1523 = section « Nos royaumes » séparée en mobile plutôt qu'un tri figé.
- **RTL & formats** : propriétés logiques (`ms-`/`me-`) ; le format « 1,01 Md » du Python rejoint le formateur de nombres existant, **localisé** (les 9 langues n'abrègent pas les milliards pareil).
- **États obligatoires** : vide (« aucun scan — comment en déposer un »), chargement, scan partiel (badge de couverture), exclusion active (bandeau explicatif), base scan seul (message « la course démarre à zéro », pas un classement).
- **Accessibilité** : contrastes AA sur les couleurs de camps, focus visibles, `<table>` sémantique, tri annoncé.

## 9. Décisions demandées au Roi

1. **Go/No-Go** sur la cible « absorption dans le Kingdom Manager » (vs statu quo outil local par saison).
2. **Formule DKP de référence** et résolution conjointe de A-005 (conditionne F-014 ET F-019 — voir §5).
3. **Priorité relative** vs le reste du moyen terme : F-013 (pings Missing Forms) et F-014 (objectifs) restent-ils devant ? Proposition : Phase 1 planifiée **entre deux saisons**, prête avant le prochain KvK (SoC 4 clôturé le 7/7 ; prochaine saison estimée ~oct.–nov. 2026 sur le rythme observé).
4. **Visibilité** : la vue course est-elle publique (recommandé, cohérent A-003) ou réservée aux membres connectés ?
5. **Phase 3 scouting** : le workflow Excel doit-il vraiment être digitalisé, ou reste-t-il un outil personnel du Roi ? (Ne pas construire si l'usage est solitaire.)

## 10. Risques

| Risque | Impact | Mitigation |
| :--- | :--- | :--- |
| Dépendance au tracker public tiers (format des scans xlsx) | Le format change → ingestion cassée (même famille de dette que BR-005) | Parseur isolé + versionné par saison ; scan brut conservé dans Storage pour re-digestion ; tests sur les 6 scans réels de SoC 4 |
| Coûts Firestore/Storage mal anticipés | Facture en hausse pendant les KvK | Tout pré-agrégé (1–2 reads/vue), chiffrage en cadrage, purge Storage post-saison |
| Docs agrégés > 1 Mo (tops trop larges) | Écriture impossible | N borné (top 200), tableau royaumes ≤ 32 lignes, monitoring taille à l'ingestion |
| Structure de la compétition différente à la prochaine saison (≠ 4 camps × 8) | Modèle trop rigide | Config par campagne (nb de camps, labels, duel) — le KvK Manager l'a déjà prouvé faisable |
| Effort de portage sous-estimé (Python → JS, parité des calculs) | Retard, écarts de calcul | Jeu de tests de non-régression : mêmes scans SoC 4 en entrée, sorties comparées au Streamlit (tolérance 0) |
| Trois formules DKP non arbitrées | Perte de confiance des joueurs dans les chiffres | Blocage assumé : pas de Phase 1 sans décision §9.2 |

## 11. Hypothèses (→ Assumptions_Log)

- **A-009** : le tracker public utilisé pour produire les scans restera disponible et au même format pour la prochaine saison.
- **A-010** : les scans sont produits/déposés par le leadership uniquement (pas de dépôt par les Warriors) — dimensionne BR-011.
- **A-011** : la structure « camps configurables » couvre les formats de KvK à venir (SoC et suivants).
- **A-012** : le besoin scouting (Phase 3) est réel au-delà d'un usage personnel du Roi — à confirmer avant tout développement.

## 12. Découpage backlog (→ ProductBacklog E-005)

- **US-015** : En tant qu'officier, je veux déposer un scan KvK dans l'app et le voir digéré automatiquement, afin que la course soit à jour sans manipulation locale. *(F-018)*
- **US-016** : En tant que Roi, je veux configurer la campagne de course (camps, duel hero, royaumes épinglés, poids DKP, base scan), afin d'adapter l'outil à chaque saison sans code. *(F-018)*
- **US-017** : En tant que membre, je veux voir le duel de camps (DKP net, écart, variation) et le classement des royaumes, afin de suivre la course à l'étoile en temps quasi réel. *(F-019)*
- **US-018** : En tant que membre, je veux les courbes d'évolution multi-scans du duel, afin de voir si l'écart se creuse ou se réduit. *(F-019)*
- **US-019** : En tant qu'officier, je veux le top N joueurs de la compétition avec recherche et carte joueur, croisé avec les profils 2997, afin d'identifier qui porte l'effort. *(F-020)*
- **US-020** : En tant que Roi, je veux définir des exclusions anti-triche (gel d'un royaume entre deux scans), afin que les classements restent crédibles. *(F-020)*
- **US-021** : En tant qu'officier, je veux que le snapshot du duel soit publié sur Discord après chaque ingestion, afin de remplacer les copies d'écran manuelles. *(F-020, ext. F-012)*
- **US-022** : En tant que Roi, je veux des fiches de scouting persistantes par royaume adverse (tier, notes, statut), afin de préparer les saisons sans classeur Excel. *(F-021)*

**Priorisation (grille §3 des règles PM)** : Valeur Forte × Impact Fort (leadership + engagement joueurs) × Urgence Moyenne (fenêtre inter-saisons) / Effort Élevé (ingestion + portage calculs + 4 vues) → **🟠 Important** — cible : cadrage court terme (décisions §9), Phase 1 en moyen terme, Phases 2–3 en long terme.
