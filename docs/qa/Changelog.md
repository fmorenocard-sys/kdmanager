# QA Changelog

## v2.5 - 2026-07-11
### Added
- **F-016 Avatars dynamiques** : étape `syncAvatars` dans `runFullSync` (pagination lente du leaderboard ProKingdoms — gestion 429, merge-only, jamais de downgrade lilith→discord) alimentant `static_data/avatars` ; fallback avatar Discord pour les profils liés ; cascade frontend dans `Avatar.jsx` (src → URL fraîche → JPG local → logo, bascule automatique sur erreur de chargement) ; thumbnail dans l'embed `/mystats`. Vérifié en production : 27 avatars frais, 54 images servies par le CDN Lilith sur la page KvK. Timeout des functions de sync porté à 300 s.

## v2.4 - 2026-07-11
### Fixed
- **BUG-004 — `/mystats` données périmées (F-012)** : les blocs GENERAL PROFILE / COMBAT / ECONOMY affichaient des données du 23 mai (dernière synchro manuelle) alors que le bloc KvK était à jour. Cause racine : `static_data/players` n'est rafraîchi que par `syncData`, jamais déclenchée depuis mai. Correctifs : (1) synchro exécutée immédiatement (Top300_7_7_2026), (2) **`scheduledSync`** — synchro automatique quotidienne à 05:00 UTC via Cloud Scheduler, (3) **footer de fraîcheur** dans les embeds `/mystats` et `/mykvk` (« Profile data: 2026-07-11 • KvK data: 2026-07-11 ») pour rendre toute obsolescence visible. Refactor : `runFullSync()` partagé entre l'endpoint HTTP et le scheduler, isolation d'erreur par source conservée.

## v2.3 - 2026-07-11
### Added
- **F-015 Historique KvK (E-004)** : SSOT enrichie (F-015, BR-006 immutabilité des archives, BR-007 jointure par ID gouverneur), suite de tests TS-011 (TC-019 → TC-022), matrice de traçabilité mise à jour. Implémentation livrée : collection `kvk_history` (rules create-only King, lecture publique — vérifiées positivement ET négativement), import SoC 1/2/3 (139+9, 177+17, 64+17 comptes, chaîne KP inter-saisons validée), sélecteur de campagne, vue progression joueur, clôture manuelle (`CampaignArchiveControl`), 21 clés i18n × 9 langues.

## v2.2 - 2026-07-11
### Changed
- **Données KvK (F-008)** : Ingestion de la nouvelle campagne « SoC 4: King of All Britain (2026) » (47 comptes principaux, 23 fillers) directement depuis Google Sheets. `scripts/digest-data.js` télécharge désormais le classeur live (variable `KVK_SHEET_ID` dans `.env`, repli sur le snapshot xlsx committé). Documents Firestore `static_data/kvk` et `static_data/kvk_filler` mis à jour (anciens documents sauvegardés).
### Fixed
- **Mapping Fillers** : `KVK_FILLER.GOAL_PERCENT` pointait sur la colonne S (« %min Dead ») au lieu de T (« %Goal ») — corrigé dans `src/config/data-mapping.js` ET `functions/data-mapping.js` (⚠️ redéploiement des functions requis pour que la synchro in-app utilise le bon mapping).

## v2.1 - 2026-02-26
### Added
- **AutomatedTestStrategy**: Création du document recommandant Playwright et l'utilisation de Firebase Emulator Suite.
- **TestPack**: Ajout des tests manquants de la SSOT v2.0 (`TC-014` pour Trophies, `TC-015` pour Player Detail, `TC-016` pour i18n, `TC-017` pour E-002, `TC-018` pour E-003).
- **TraceabilityMatrix**: Mise à jour pour inclure les nouveaux tests (F-004, F-006, F-014, E-002, E-003).
- **ImpactReport** & **OpenQuestions** : Création pour documenter les couvertures manquantes et ambiguïtés.

## v1.1 - 2026-02-17
### Added
- **SSOT**: Added `F-008` (KvK Performance), `P-005` (KvK Page), `D-005` (KvK Data).
- **TestPack**: Added `TS-007` (KvK) with tests `TC-011`, `TC-012`, `TC-013`.
- **Traceability**: Mapped keys for new features.

## v1.0 - 2026-02-16
- Initial creation of SSOT and TestPack.
