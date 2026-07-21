# Product Backlog

## Epics
* **E-001 [LIVRÉ 2026-07-12]**: Automatisation Complète Ingestion Data
  * *Objectif (révisé puis atteint)*: Zéro fichier — Google Sheets → synchro quotidienne/bouton Sync → Firestore → app & bot en temps réel. Les JSON statiques de build et leur course de données ont été retirés le 2026-07-12 : Firestore est l'unique source de lecture.
  * *Valeur*: Plus aucune manipulation de fichier ; fraîcheur garantie ≤ 24 h.
* **E-002**: Scalabilité Frontend & Sécurité
  * *Objectif*: Sécuriser toutes les lectures Firestore avec des Security Rules et optimiser le bundle.
  * *Valeur*: Performance, sécurité des données des joueurs.
* **E-003**: Discord Ecosystem Integration
  * *Objectif*: Faire de la web app une extension naturelle du Discord via SSO Auth, Sync des rôles et Bot de notifications.
  * *Valeur*: Réduction massive de la friction d'authentification et automatisation des pings de joueurs (Missing forms).
* **E-004**: Historique des KvK (voir `Etude_Historique_KvK.md`)
  * *Objectif*: Conserver et consulter les données de toutes les campagnes KvK passées (aujourd'hui écrasées à chaque cycle), avec vue de progression par joueur.
  * *Valeur*: Décisions leadership multi-campagnes (deadweight, promotions), mémoire du royaume, engagement joueurs.
  * *Métrique d'impact*: Nombre de campagnes archivées ; consultations de la vue historique/progression.
* **E-005 [GO — 5/5 décisions rendues au 2026-07-21 : Phase 1 immédiate (inter-saison), vue course réservée King/Officer, Phase 3 scouting abandonnée]**: Fusion KvK Manager — module « KvK Race » centralisé (voir `Etude_Fusion_KvK_Manager.md`)
  * *Objectif*: Absorber le dashboard Python/Streamlit local de suivi de compétition (32 royaumes, DKP net multi-scans, duel de camps) et les classeurs Excel de scouting dans le Kingdom Manager — un seul outil, multi-utilisateurs, capitalisé de saison en saison.
  * *Valeur*: La course à l'étoile lisible par tout le leadership (aujourd'hui : le poste du Roi uniquement) ; DKP unique et paramétrable ; fin de la re-création de l'outil à chaque saison.
  * *Métrique d'impact*: Utilisateurs distincts de la vue course ; délai scan→visible ; abandon des classeurs Excel.

## User Stories
* **US-001 (E-001)**: En tant qu'officier, je veux pouvoir uploader les fichiers XLSX directement sur la page "Config" ou "Data" pour mettre à jour la BDD, afin de ne pas lancer de script local.
* **US-002 (E-004)**: En tant que Roi, je veux voir l'évolution historique globale d'un joueur, afin d'évaluer sa progression long-terme. *(Concrétisée par US-012.)*
* **US-003**: En tant qu'utilisateur mobile, je veux que la Data Table soit facilement scrollable sans perte de contexte (Sticky Headers/Columns), afin de lire les stats confortablement.
* **US-004 (E-003) [DONE]**: En tant que joueur, je veux pouvoir m'inscrire/me connecter via mon compte Discord, afin de ne pas utiliser mon compte Google personnel.
* **US-005 (E-003)**: En tant qu'officier, je veux qu'un bot Discord annonce automatiquement l'ouverture d'un nouveau KvK sur notre serveur de royaume, avec le lien direct vers le formulaire.
* **US-006 (E-003) [DONE]**: En tant qu'officier, je veux que les permissions in-app (King, Officer) de mes joueurs soient synchronisées avec leurs rôles sur le serveur Discord, afin d'automatiser la gestion des accès.
* **US-007 (E-003) [LIVE]**: En tant que joueur, je veux interagir avec le Bot Discord via des commandes (ex: `/mystats`, `/mykvk`) pour recevoir un résumé de mes statistiques (Power, KP, Objectifs) directement dans le chat, sans ouvrir l'application web.
* **US-008 (E-003)**: En tant qu'officier, je veux pouvoir déclencher depuis l'application web une alerte "Missing Forms" qui ping automatiquement sur Discord tous les membres du Top 300 n'ayant pas encore rempli leurs disponibilités pour le KvK.
* **US-009**: En tant que joueur ou officier, je veux voir mes objectifs Minimums et mes Goals (KP, Dead, DKP) basés sur ma Puissance directement dans un onglet du War Tracker et via une commande Discord `/mykvkgoals`, afin de savoir facilement ce qui est attendu de moi.
* **US-010 (E-004) [LIVE 2026-07-11]**: En tant que Roi, je veux pouvoir « Clôturer la campagne » active pour archiver ses données dans l'historique, afin qu'elles ne soient pas écrasées par la campagne suivante.
* **US-011 (E-004) [LIVE 2026-07-11]**: En tant qu'utilisateur, je veux un sélecteur de campagne sur la page Performance KvK, afin de consulter le tableau complet de n'importe quelle campagne passée.
* **US-012 (E-004) [LIVE 2026-07-11]**: En tant que Roi ou joueur, je veux voir la progression d'un joueur à travers les campagnes (KP gagnés, morts, % objectif, note), afin d'évaluer sa trajectoire long-terme.
* **US-013 (E-004) [DONE 2026-07-11]**: En tant que Roi, je veux que les campagnes SoC 1 (Tides of War), SoC 2 (Storm of Stratagems) et SoC 3 (Heroic Anthem) soient importées dans l'historique, afin de démarrer avec la mémoire complète du royaume.
* **US-014 (E-004) [LIVE 2026-07-20]**: En tant que joueur, je veux `/mykvk <campagne>` sur Discord, afin de consulter mes performances passées sans ouvrir l'app. *(Option `campaign` avec autocomplete dynamique depuis `kvk_history` — titre, dates et résultat officiel affichés dans l'embed.)*
* **US-015 (E-005) [Partiellement LIVE 2026-07-21]**: En tant qu'officier, je veux déposer un scan KvK dans l'app et le voir digéré automatiquement, afin que la course soit à jour sans manipulation locale. *(Pipeline signé + digestion Live — BR-014 ; le bouton d'upload UI branché sur `getRaceScanUploadUrl` reste à ajouter sur P-008.)*
* **US-016 (E-005) [LIVE 2026-07-21]**: En tant que Roi, je veux configurer la campagne de course (camps, duel hero, royaumes épinglés, poids DKP, base scan), afin d'adapter l'outil à chaque saison sans code. *(RaceConfigForm dans KvK Config + callable de recalcul immédiat.)*
* **US-017 (E-005) [LIVE 2026-07-21]**: En tant que membre du leadership, je veux voir le duel de camps (DKP net, écart, variation) et le classement des 32 royaumes, afin de suivre la course à l'étoile en temps quasi réel. *(Page P-008, accès King/Officer — §9.4.)*
* **US-018 (E-005) [LIVE 2026-07-21]**: En tant que membre du leadership, je veux les courbes d'évolution multi-scans du duel, afin de voir si l'écart se creuse ou se réduit.
* **US-019 (E-005)**: En tant qu'officier, je veux le top N joueurs de la compétition avec recherche et carte joueur, croisé avec les profils 2997, afin d'identifier qui porte l'effort.
* **US-020 (E-005)**: En tant que Roi, je veux définir des exclusions anti-triche (gel d'un royaume entre deux scans), afin que les classements restent crédibles.
* **US-021 (E-005)**: En tant qu'officier, je veux que le snapshot du duel soit publié sur Discord après chaque ingestion, afin de remplacer les copies d'écran manuelles.
* **US-022 (E-005) [ABANDONNÉE 2026-07-21]**: ~~En tant que Roi, je veux des fiches de scouting persistantes par royaume adverse (tier, notes, statut), afin de préparer les saisons sans classeur Excel.~~ *(Décision Roi : le scouting reste un outil personnel — pas de digitalisation.)*
* **US-023 (E-004) [LIVE 2026-07-18]**: En tant que membre du leadership, je veux une timeline chronologique des campagnes KvK avec les performances agrégées du royaume et leur résultat officiel, afin de visualiser notre trajectoire collective et entretenir la mémoire du royaume. *(Décisions D1–D4 arbitrées et livrées le 2026-07-18 — onglet « Progression du Royaume », réservé King/Officer ; voir `Etude_Timeline_Royaume.md`.)*

## Bugs / Dette
* **BUG-001 [CLOS 2026-07-12]**: Dette du parsing XLSX local : `digest-data.js` est sorti du build (E-001) — l'app ne dépend plus d'aucun fichier local (script conservé comme outil d'archivage manuel). Le parsing des Sheets vit uniquement dans les Cloud Functions.
* **BUG-002**: Les règles de sécurité Firestore actuelles sont vraisemblablement trop permissives ou limitées. Besoin d'un audit de sécurité. *Sévérité: Haute*. *(Rules durcies commit b4b905c — audit complet restant à faire.)*
* **BUG-003 [RÉSOLU 2026-07-11]**: La function `syncData` déployée utilisait l'ancien mapping fillers (`GOAL_PERCENT` colonne S au lieu de T). Correctif déployé avec la release E-004 — le bouton « Sync » in-app est de nouveau sûr.
* **BUG-004 [RÉSOLU 2026-07-11]**: `/mystats` affichait des données de profil du 23 mai (aucune synchro déclenchée depuis). Résolu par la synchro quotidienne automatique `scheduledSync` (05:00 UTC) + footer de fraîcheur des données dans les embeds Discord. La fiabilité ne dépend plus d'un déclenchement humain.
* **BUG-005 [RÉSOLU 2026-07-12]**: Le Dashboard affichait des données de février (graphe Puissance Totale arrêté au 14/2, trésorerie 7.2B) alors que Firestore était à jour : `fetchData` (JSON statiques de build, générés depuis les xlsx locaux de février) résolvait après les snapshots Firestore et les **écrasait**. Résolu : les listeners Firestore sont désormais autoritaires (`fsArrived`), les JSON ne remplissent que les trous. *Dette résiduelle : les snapshots statiques de `public/data` restent générés depuis les xlsx locaux périmés — premier paint potentiellement vieux ~1 s avant l'arrivée Firestore ; à moderniser en étendant le téléchargement live du digest aux 4 autres classeurs.*
* **BUG-006 [RÉSOLU 2026-07-12]**: Les onglets réservés Discord (BR-008) restaient invisibles en production pour les comptes liés — course lecture/écriture sur le profil (vue optimiste Firestore). Corrigé dans AuthContext : lecture unique avant écriture.
