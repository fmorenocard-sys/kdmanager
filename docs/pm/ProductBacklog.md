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

## User Stories
* **US-001 (E-001)**: En tant qu'officier, je veux pouvoir uploader les fichiers XLSX directement sur la page "Config" ou "Data" pour mettre à jour la BDD, afin de ne pas lancer de script local.
* **US-002**: En tant que Roi, je veux voir l'évolution historique globale d'un joueur, afin d'évaluer sa progression long-terme.
* **US-003**: En tant qu'utilisateur mobile, je veux que la Data Table soit facilement scrollable sans perte de contexte (Sticky Headers/Columns), afin de lire les stats confortablement.
* **US-004 (E-003) [DONE]**: En tant que joueur, je veux pouvoir m'inscrire/me connecter via mon compte Discord, afin de ne pas utiliser mon compte Google personnel.
* **US-005 (E-003)**: En tant qu'officier, je veux qu'un bot Discord annonce automatiquement l'ouverture d'un nouveau KvK sur notre serveur de royaume, avec le lien direct vers le formulaire.
* **US-006 (E-003) [DONE]**: En tant qu'officier, je veux que les permissions in-app (King, Officer) de mes joueurs soient synchronisées avec leurs rôles sur le serveur Discord, afin d'automatiser la gestion des accès.
* **US-007 (E-003)**: En tant que joueur, je veux interagir avec le Bot Discord via des commandes (ex: `/mystats`, `/mykvk`) pour recevoir un résumé de mes statistiques (Power, KP, Objectifs) directement dans le chat, sans ouvrir l'application web.
* **US-008 (E-003)**: En tant qu'officier, je veux pouvoir déclencher depuis l'application web une alerte "Missing Forms" qui ping automatiquement sur Discord tous les membres du Top 300 n'ayant pas encore rempli leurs disponibilités pour le KvK.

## Bugs / Dette
* **BUG-001**: Dette technique liée à la rigidité du parsing XLSX (`digest-data.js`). *Sévérité: Moyenne*.
* **BUG-002**: Les règles de sécurité Firestore actuelles sont vraisemblablement trop permissives ou limitées. Besoin d'un audit de sécurité. *Sévérité: Haute*.
