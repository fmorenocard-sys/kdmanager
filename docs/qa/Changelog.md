# QA Changelog

## v2.10 - 2026-07-12
### Changed
- **E-001 finalisé — Firestore source unique** : suppression du fetch des JSON statiques dans `DataContext` (listeners Firestore seuls, chargement résolu au premier snapshot, gestion d'erreur ajoutée), `digest-data.js` retiré du build, JSON générés supprimés de `public/data` (xlsx d'archives et `avatars/` conservés). Vérifié : zéro requête `/data/*.json`, Dashboard alimenté en direct. *Note : la suite Playwright devra seeder `static_data` dans l'émulateur pour tester avec données.*
### Added
- **BR-008 (F-008/F-015)** : onglets « Comptes Secondaires » et « Progression » réservés aux comptes vérifiés Discord (`isDiscordUser` : uid SSO `discord:` ou `discordId` lié au profil). Vérifié en invité : seul l'onglet principal est rendu.

## v2.9 - 2026-07-12
### Fixed
- **BUG-005 — Dashboard périmé (F-001)** : course de données dans `DataContext` — le fetch des JSON statiques (snapshots de build, février) résolvait après les premiers snapshots Firestore et les écrasait ; le Dashboard restait donc sur le graphe arrêté au 14/2 et la trésorerie 7.2B malgré une synchro quotidienne saine. Correctif : réf `fsArrived` — un dataset livré par Firestore n'est plus jamais écrasé par le fallback JSON. Vérifié : graphe → 7/7/2026, Food → 15.9B.

## v2.8 - 2026-07-12
### Changed
- **F-017 passe d'alignement exhaustive sur la v2 consolidée (Claude Design)** : migration complète **Lucide → Phosphor** (~55 icônes, 19 fichiers, module compat `ui/icons.js` ; regular par défaut, `fill` sur états actifs, `duotone` dans les bulles StatCard ; mapping domaine appliqué à la sidebar et à la bottom nav : castle-turret/shield/trend-up/trophy/skull/bank). Navigation active en **gradient accent + glow** (sidebar, bottom nav 48px/11px, onglets 44px via `.v2-tab`). **Table v2** : rangées 40px, texte 13px, en-têtes 11px uppercase text-meta, bordures/hover par tokens. **Ratings** en `.v2-pill` (tokens light/dark recalibrés), **% Goal** en mono coloré par tokens. Titres : `v2-title` (ambre KvK, neutre Dashboard). ThemeToggle bordé avec libellé. Tokens sémantiques et ratings ajoutés (`--success`, `--rating-*`…). Vérifié programmatiquement dans les deux modes.

## v2.7 - 2026-07-12
### Fixed
- **F-017 mode clair — fond restant sombre** : le wrapper racine portait un hex codé en dur (`bg-[#0b1121]`) hors de portée du shim → supprimé, le body piloté par tokens reprend la main. Contrôles du Dashboard migrés vers `var(--surface-input)`. **Garde-fou `theme-switching`** : les `transition-all` v1 ne convergeaient jamais au basculement de thème (transitions relancées en boucle) — toutes les transitions sont suspendues ~80 ms pendant le flip. Vérifié : bascule propre dans les deux sens (body, sidebar, inputs).
### Added
- **Compléments v2 depuis Claude Design** : `Input` v2 (44px min, radius 10, focus ambre, état erreur + message, tokens surface/bordure), `Avatar` ring gradient indigo (remplace l'anneau plat), `StatCard` v2 (accent gauche 3px, bulle d'icône 44px, surface glass pure), badge « En cours » en gradient accent, barres % objectif v2 (9px, fills gradient vert/ambre/rouge, bordure token).

## v2.6 - 2026-07-12
### Added
- **F-017 Design System v2 & mode clair** : tokens v2 (conçus dans Claude Design, dossier `v2/` du projet design system) portés dans `src/index.css` — variables CSS dark/light, boutons gradient (primaire ambre→orange, accent indigo→violet, glow), cartes glass à bordure gradient hairline (`.v2-glass`), contraste des textes secondaires renforcé. **Toggle clair/sombre** dans le header (`ThemeToggle`, persistance localStorage `kd_theme`, classe `light` sur `<html>`, clé i18n ×9 langues). Shim de compatibilité light pour les ~600 classes de couleur codées en dur (audit : top 25 = 90 % de couverture) en attendant la migration progressive des pages. Vérifié dans les deux modes (dashboard + KvK). Cartes `buttons` et `glass` du design system re-synchronisées.

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
