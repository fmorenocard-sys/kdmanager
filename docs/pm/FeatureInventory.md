# Feature Inventory (KD 2997)

Ce document centralise l'état de toutes les fonctionnalités du Kingdom Manager.

| ID | Nom | Description courte | Statut | Criticité | Impact | Dépendances |
|---|---|---|---|---|---|---|
| F-001 | General Dashboard | Affichage global des stats du royaume (Puissance, KP, RSS) | Live | P1 | Fort | Data Ingestion |
| F-002 | Player Performance | Suivi Kills/Morts pendant KvK vs Objectifs | Live | P1 | Fort | Data Ingestion |
| F-003 | Trophies Tracking | Historique des victoires (MGE, Zenith) | Live | P2 | Moyen | Data Ingestion |
| F-004 | Deadweight Analysis | Tracking des inactifs/non-performants vs Puissance | Live | P1 | Fort | Data Ingestion |
| F-005 | Bank Ledger | Suivi des dépôts de ressources hebdomadaires | Live | P1 | Fort | Data Ingestion |
| F-006 | War Tracker / Disponibilités | Formulaire de déclaration (Troupes incluant Siege, Tech) avec support de multi-campagnes KvK (Danger Zone & Switcher). | Live | P0 | Fort | Auth (F-007), RBAC (F-010) |
| F-007 | User Profile & Auth | Authentification Google & Discord SSO + Liaison avec un ID de Gouverneur. | Live | P0 | Fort | Firebase Auth |
| F-008 | Data Ingestion | Conversion des XLSX en JSON/Firestore. Depuis 2026-07-11 : téléchargement direct du classeur KvK depuis Google Sheets (`KVK_SHEET_ID`). | Partiellement Live | P0 | Fort | Fichiers XLSX / Google Sheets |
| F-009 | Internationalisation (i18n) | Support multilingue de l'UI (9 langues dont FR ajouté 2026-07). | Live | P1 | Moyen | - |
| F-010 | RBAC (Rôles) & Discord Sync | Gestion des rôles (King, Officer, Warrior). Synchronisation automatique depuis Discord. | Live | P0 | Fort | F-007, Discord API |
| F-011 | Legacy Migration | Outil de migration des anciennes données vers le nouveau format KvK. | Live | P2 | Faible | F-006 |
| F-012 | Discord Slash Commands | Bot Discord permettant aux joueurs de requêter leurs stats via `/mystats` ou `/mykvk`. Accès Warrior+ uniquement. | Live | P2 | Fort | F-007, F-010 |
| F-013 | Discord "Missing Forms" Pings | Système permettant aux officiers de déclencher un ping automatique groupé sur Discord pour les retardataires du KvK. | À développer | P1 | Fort | F-006, F-007 |
| F-014 | KvK Goals Calculator | Calcul algorithmique des objectifs de chaque joueur (KP, Deads, DKP) selon sa Puissance (courbe quadratique). | À développer | P1 | Fort | Formule "Req DKP" |
| F-015 | Historique des KvK | Archivage des campagnes KvK (clôture manuelle par le Roi vers `kvk_history`), sélecteur de campagne sur Performance KvK et vue progression multi-campagnes par joueur. SoC 1/2/3 importées le 2026-07-11. Reste : `/mykvk <campagne>` Discord (US-014, V2). | Live | P1 | Fort | F-005, F-006 |
| F-016 | Avatars dynamiques | Cascade d'avatars joueurs : URL Lilith CDN fraîche (pass quotidien `syncAvatars` via ProKingdoms) → avatar Discord (profils liés) → JPG local → logo. Doc `static_data/avatars`, thumbnail dans `/mystats`. | Live | P2 | Moyen | F-007 (SSO), scheduledSync, Etude_Avatars_Joueurs |
| F-017 | Design System v2 & mode clair | Direction « Glass Raffiné + gradients » conçue dans Claude Design puis portée dans le code : tokens CSS dark/light, boutons gradient, cartes hairline, toggle thème persistant. Migration progressive des classes codées en dur via shim light. | Live (shim transitoire) | P2 | Moyen | Projet Claude Design (v2/tokens.css) |
| F-018 | KvK Race — Ingestion des scans | Upload des scans de compétition (32 royaumes, ~20 Mo) via Cloud Storage + Function de digestion (nets base-scan, agrégats camps/royaumes, tops joueurs) ; config de campagne (camps, duel, pins, poids DKP) par le Roi. Portage du moteur Python `2026_06_KingOfAllBritain`. | À développer (proposé — arbitrage Roi requis, E-005) | P1 | Fort | F-008, Storage, Etude_Fusion_KvK_Manager |
| F-019 | KvK Race — Dashboard de course | Vues Camps (duel hero + écart + variation), Royaumes (32 KD triables, pins 2997/1523) et Évolution multi-scans, dans l'app (page P-008). DKP de course paramétrable par campagne, distinct du DKP interne (BR-010 proposée). | À développer (proposé — arbitrage Roi requis, E-005) | P1 | Fort | F-018 |
| F-020 | KvK Race — Analytique & intégrité | Vue Joueurs (top N, recherche, carte joueur croisée profils 2997), vue Efficacité (Power vs DKP), exclusions anti-triche (config King), publication du snapshot du duel sur Discord, archivage du résumé de course à la clôture F-015. | À développer (proposé, E-005) | P2 | Fort | F-018, F-019, F-012, F-015 |
| F-021 | Scouting royaumes adverses | Digitalisation des classeurs `KvK_Compositions` : fiches persistantes par royaume (tier S/A/B/C, notes de renseignement, statut de scouting), alimentées par les agrégats de scans. | À développer (proposé, usage à confirmer A-012) | P2 | Moyen | F-018 |
| F-022 | Timeline du Royaume | Onglet « Progression du Royaume » (Performance KvK, réservé King/Officer — BR-011) : frise chronologique des campagnes avec agrégats royaume (KP gagnés, morts, comptes, % objectif) et résultat officiel (victoire avec/sans étoile, défaite) saisi par le Roi (BR-012). SSOT : F-016. Voir `Etude_Timeline_Royaume.md`. | Live (2026-07-18) | P2 | Moyen | F-015 (`kvk_history`) |

## Problèmes connus actuels
* **F-008 (Data Ingestion)**: L'ingestion repose encore fortement sur des traitements manuels de fichiers XLSX avant de nourrir le frontend (ou un script local `digest-data.js`). Le processus mériterait d'être full in-app ou automatisé via Cloud Functions.
* **F-001 à F-005**: Fortement couplé à la structure exacte des fichiers Excel. Une modification de colonne dans le jeu casse le parsing.
* **F-002/F-015**: Chaque campagne KvK écrase la précédente dans `static_data/kvk` — c'est le problème que F-015 résout (voir BUG-003 pour le risque transitoire lié au bouton Sync).
