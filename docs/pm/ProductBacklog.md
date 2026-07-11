# Product Backlog

## Epics
* **E-001**: Automatisation Complète Ingestion Data
  * *Objectif*: Remplacer le parsing local/manuel par un upload web 100% sécurisé via l'appli.
  * *Valeur*: Gain de temps massif pour les officiers.
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
* **US-010 (E-004)**: En tant que Roi, je veux pouvoir « Clôturer la campagne » active pour archiver ses données dans l'historique, afin qu'elles ne soient pas écrasées par la campagne suivante.
* **US-011 (E-004)**: En tant qu'utilisateur, je veux un sélecteur de campagne sur la page Performance KvK, afin de consulter le tableau complet de n'importe quelle campagne passée.
* **US-012 (E-004)**: En tant que Roi ou joueur, je veux voir la progression d'un joueur à travers les campagnes (KP gagnés, morts, % objectif, note), afin d'évaluer sa trajectoire long-terme.
* **US-013 (E-004)**: En tant que Roi, je veux que les campagnes SoC 1 (Tides of War), SoC 2 (Storm of Stratagems) et SoC 3 (Heroic Anthem) soient importées dans l'historique, afin de démarrer avec la mémoire complète du royaume.
* **US-014 (E-004) [V2]**: En tant que joueur, je veux `/mykvk <campagne>` sur Discord, afin de consulter mes performances passées sans ouvrir l'app.

## Bugs / Dette
* **BUG-001**: Dette technique liée à la rigidité du parsing XLSX (`digest-data.js`). *Sévérité: Moyenne*. *(Partiellement réduite le 2026-07-11 : téléchargement direct du classeur KvK depuis Google Sheets.)*
* **BUG-002**: Les règles de sécurité Firestore actuelles sont vraisemblablement trop permissives ou limitées. Besoin d'un audit de sécurité. *Sévérité: Haute*. *(Rules durcies commit b4b905c — audit complet restant à faire.)*
* **BUG-003**: La function `syncData` déployée utilise l'ancien mapping fillers (`GOAL_PERCENT` colonne S au lieu de T) — un clic sur « Sync » in-app écraserait les données fillers corrigées. Correctif committé, **redéploiement functions à faire avec E-004** (décision du 2026-07-11). *Sévérité: Moyenne*.
