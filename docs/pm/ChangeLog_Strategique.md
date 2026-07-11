# ChangeLog Stratégique (KD 2997)

Ce fichier logue les évolutions majeures et décisions stratégiques modifiant le cap du produit.

## 2026-02-24
* **Évolution Stratégique** : Transition d'une architecture orientée GitHub Pages (statique) vers Firebase (Auth, Firestore, Hosting, etc.).
* **Nouveaux Ajouts** :
  * Moteur multilingue (i18n) pour accueillir une base de joueurs internationale (8 langues supportées).
  * Feature : Ajout de la gestion de campagnes multiples KvK avec capacité à visualiser les historiques (Dropdown "Campaign") et effacer la donnée obsolète ("Danger Zone").
  * Feature : Ajout du support pour les marches "Siege" complétant l'arsenal classique (Infanterie/Cavalerie/Archer), ainsi qu'une correction majeure UX sur l'ajout de composition de marches.
  * Feature : Module d'Auth complet + RBAC permettant aux Rois, Officiers et Warriors d'avoir des vues dédiées.
  * Stratégie : Étude de Faisabilité (Discovery) complétée pour l'intégration de Discord. L'Epic E-003 a été ajouté au product backlog (SSO Discord, Sync Rôles, Bots interactifs).
  * Feature (E-003 Phase 1) : Livraison complète du Single Sign-On (SSO) Discord via un backend custom Firebase Cloud Functions, incluant la récupération de l'avatar et du nom global du joueur.
* **Impact Stratégique** : Le produit n'est plus un simple dashboard de visualisation de données statiques mais devient un outil web communautaire et persistant. La friction d'authentification est drastiquement réduite grâce à Discord.

## 2026-02-25
* **Évolution Stratégique** : Pivot sur l'Epic E-003 (Discord Integration). La fonctionnalité de "Bot d'alerte global" est mise en pause au profit d'un développement ciblé sur :
  * Les Slash Commands in-server (`/mystats`, `/mykvk`) pour un accès friction-less à la donnée (US-007).
  * L'automatisation des "Pings" (Missing Forms) pour soulager la charge mentale des R4/R5 lors de la préparation des KvK (US-008).

## 2026-03-14
* **Résolution & Déploiement** : Lancement complet (Live) des bots Discord (US-007 / F-012). C'est un point d'étape majeur pour sortir l'application "du navigateur" et l'intégrer directement là où les joueurs interagissent.
  * *Correction Critique (Bugfix)* : Résolution d'un bug majeur lié au parsing Firestore pour les utilisateurs s'authentifiant exclusivement via le SSO Discord (sans attachement à un compte Google préalable). Le resolveur de profils gère désormais correctement la fallback `discordUid`.

## 2026-03-18
* **Nouveaux Ajouts** :
  * Étude PM finalisée pour l'implémentation du Calculateur d'Objectifs Individuels KvK (F-014). Les objectifs (KP, Deads, DKP) seront calculés de façon algorithmique (fonctions quadratiques) sur la base de la puissance du joueur, offrant une approche juste et automatisée pour remplacer les quotas fixés manuellement.

## [2026-05-21] Pivot Stratégique : Verrouillage de la Déclaration KvK
- **Décision :** La soumission anonyme (ouverte) pour la disponibilité KvK (War Tracker) a été abandonnée.
- **Raison :** Haut risque de fausses données / spam, détruisant la fiabilité du War Dashboard pour les officiers.
- **Action :** Implémentation d'une barrière d'authentification forcée (Discord/Google) sur le composant `AvailabilityForm`. Les utilisateurs invités voient désormais un message explicatif les invitant à se connecter.
