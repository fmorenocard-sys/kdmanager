# ChangeLog Stratégique (KD 2997)

Ce fichier logue les évolutions majeures et décisions stratégiques modifiant le cap du produit.

## 2026-07-21
* **GO E-005 — Fusion KvK Manager (décisions Roi §9.1 et §9.5)** : feu vert à l'absorption du KvK Manager Python dans l'app (module « KvK Race », page P-008) ; la **Phase 3 scouting est abandonnée** — le garde-fou A-012 a joué (usage personnel du Roi, on ne digitalise pas) : F-021 et US-022 sorties du périmètre. E-005 se recentre sur Phase 1 (ingestion scans + dashboard de course, fenêtre inter-saison en cours) puis Phase 2 (analytique/intégrité). *Complément (même jour)* : §9.3 et §9.4 rendues — **Phase 1 immédiate** pendant l'inter-saison (prioritaire sur US-008 et F-014, qui passent après) et **vue course réservée King/Officer** (modèle BR-011, la recommandation « publique » n'est pas retenue à ce stade). E-005 est intégralement arbitrée : l'exécution de la Phase 1 peut démarrer.

## 2026-07-20
* **Clôture de SoC 4 & décisions inter-saison (Roi)** : première clôture in-app d'une campagne (US-010) — elle a révélé que l'étape « marquer la campagne clôturée » (étude E-004 §5.4) n'avait pas été livrée : SoC 4 apparaissait en double (En cours + Archivée) et le War Tracker la croyait active. Arbitrages rendus : masquage automatique de la pseudo-campagne courante déjà archivée (l'archive fait foi — **BR-013**) ; statut `closed` écrit dans `kvk_config` à la clôture, gelant le formulaire de disponibilité jusqu'à la saison suivante ; **résultat SoC 4 = victoire sans étoile** ; fin officielle **25/07** confirmée (A-008 amendée). Le royaume est désormais formellement **en inter-saison** — fenêtre d'exécution idéale pour E-005 Phase 1 si le Go est donné.

## 2026-07-18 (suite)
* **Décisions & livraison — Timeline du Royaume (F-022 / US-023, Live)** : le Roi a arbitré les 4 décisions le jour même — D1 : onglet « Progression du Royaume » dans Performance KvK, **réservé King/Officer pour le moment** (BR-011, invalide A-014) ; D2 : résultat officiel par campagne, victoire **avec ou sans étoile** ou défaite, saisi par le Roi sur les archives (BR-012, champ `outcome`, règles Firestore amendées en update mono-champ) ; D3 : périmètre strictement KvK ; D4 : 🔴 priorité immédiate. Livrée et déployée le 2026-07-18. La valeur « engagement Warriors » de l'étude (§2) reste en réserve — réévaluer l'ouverture de l'onglet plus tard.

## 2026-07-18
* **Nouvelle idée produit — Timeline du Royaume (F-022 / US-023, proposée)** : sur idée du Roi, frise chronologique des campagnes KvK avec les performances agrégées du royaume (KP, morts, participants, % objectif, résultat officiel optionnel). Concrétise le « hors périmètre V2+ » de F-015 (statistiques agrégées royaume par campagne) en s'appuyant sur `kvk_history` déjà Live — effort faible, classée 🟢 Opportunité inter-saisons. Étude : `Etude_Timeline_Royaume.md` (4 décisions demandées : emplacement, résultat officiel, périmètre de la frise, priorité). Synergie identifiée avec F-020 (archivage du résumé de course E-005 à la clôture).

## 2026-07-14
* **Étude produit — Fusion KvK Manager (E-005, proposée)** : étude complète de la fusion du dashboard Python/Streamlit « KvK Manager » (suivi de compétition SoC 4 : 32 royaumes, DKP net multi-scans, duel East-Anglia vs Wessex, exclusions anti-triche) et des classeurs Excel de scouting dans le Kingdom Manager, sous forme d'un module « KvK Race » (page P-008). Recommandation : absorption dans la web app (ingestion Cloud Storage + Function, documents Firestore pré-agrégés), phasée en 3 temps (course → analytique/intégrité → scouting). Nouveaux IDs : E-005, F-018 → F-021, US-015 → US-022, A-009 → A-012. Étude : `Etude_Fusion_KvK_Manager.md` (5 décisions demandées en §9).
* **Décision — cadre DKP (Roi, 2026-07-14)** : il existe **deux DKP distincts qui ne doivent jamais être mélangés** — le **DKP interne 2997** (scans internes : Performance KvK F-002, objectifs F-014) et le **DKP de course/coalition** (KvK Race, formule convenue avec les alliés). Chacun est **paramétrable par campagne** (la formule de course peut évoluer d'un KvK à l'autre). Formalisé dans l'étude §5 et la règle métier proposée **BR-010** (configs étanches `kvk_config` vs `kvk_race/{campaignId}`, libellé explicite du domaine sur chaque affichage). Conséquence : A-005 (« Required DKP ») ne bloque plus que F-014, plus la course F-019.

## 2026-07-11
* **Nouvelle donnée live** : Ingestion de la campagne « SoC 4 : King of All Britain (2026) » directement depuis Google Sheets (47 mains + 23 fillers). Le pipeline `digest-data.js` télécharge désormais le classeur live — première brique de la dé-rigidification de F-008 (BUG-001).
* **Déploiement** : Release hosting du 2026-07-11 publiant l'ensemble des travaux de février (RTL/arabe, locale FR, cartes mobiles, footer) + titre SoC 4.
* **Décision stratégique — E-004 Historique des KvK** : sur demande du Roi, l'historisation multi-KvK est remontée du Long terme au Moyen terme comme nouveau focus. Arbitrages produit rendus : MVP = consultation + progression joueur ; migration SoC 1 (Tides of War), SoC 2 (Storm of Stratagems), SoC 3 (Heroic Anthem) ; clôture manuelle par le Roi. Étude complète : `Etude_Historique_KvK.md`. Nouvelle feature F-015, user stories US-010 → US-014, dette BUG-003 (mapping fillers de la function déployée) rattachée à cette epic.

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
