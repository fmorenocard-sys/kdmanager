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
| F-015 | Historique des KvK | Archivage des campagnes KvK (clôture manuelle par le Roi vers `kvk_history`), sélecteur de campagne sur Performance KvK et vue progression multi-campagnes par joueur. Import initial SoC 1/2/3. | À développer | P1 | Fort | F-005, F-006, Backup SoC 3, Sheets SoC 1/2 |

## Problèmes connus actuels
* **F-008 (Data Ingestion)**: L'ingestion repose encore fortement sur des traitements manuels de fichiers XLSX avant de nourrir le frontend (ou un script local `digest-data.js`). Le processus mériterait d'être full in-app ou automatisé via Cloud Functions.
* **F-001 à F-005**: Fortement couplé à la structure exacte des fichiers Excel. Une modification de colonne dans le jeu casse le parsing.
* **F-002/F-015**: Chaque campagne KvK écrase la précédente dans `static_data/kvk` — c'est le problème que F-015 résout (voir BUG-003 pour le risque transitoire lié au bouton Sync).
