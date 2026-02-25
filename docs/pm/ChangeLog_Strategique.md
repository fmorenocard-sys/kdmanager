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
* **Impact Stratégique** : Le produit n'est plus un simple dashboard de visualisation de données statiques mais devient un outil web communautaire et persistant.
