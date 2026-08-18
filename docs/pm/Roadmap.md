# Roadmap (KD 2997)

## Horizon

### Court terme (0–4 semaines)
* **Objectif :** Stabilisation & Adoption du War Tracker (DONE)
* **Attendu :** 
  * [DONE] Tous les joueurs se connectent et lient leur ID (via SSO Discord 100% opérationnel).
  * [DONE] Premier test de collecte de disponibilités KvK via le nouveau "Active Campaign set".
* **Nouveau Focus :** Pivot sur l'Epic E-003 pour les interactions Discord.
* **Point produit du 2026-08-13 — après une session de livraisons dense.** F-032 (Espace perso « Moi », 6 lots) et F-033 (« Voir en tant que ») **mergés dans `main`** après revue de branche ; **BR-022** (gel des déclarations au démarrage de campagne) et **BR-023** (rôle Admin/opérateur super-admin, F-034, activé sur le pilote 41) livrés le même jour ; inventaire de dette technique priorisé livré (`docs/qa/Dette_Technique_2026-08.md`, BUG-007) ; première étude de cadrage juridique UE (`docs/legal/`), qui **requalifie bloquant** un point de sécurité déjà connu (lecture publique de `static_data`/`kvk_history`, BUG-002 B-1). **État de déploiement** : `main` non encore poussé sur le remote ; pilote 41 à jour (front + rules + functions) ; **2997 volontairement gelé** (déclarations en cours, non déployé). Voir `ChangeLog_Strategique.md` 2026-08-13 pour le détail.
* **Priorités court terme, dans l'ordre (arbitrage à confirmer par le Roi) :**
  1. **Pousser `main` sur le remote et déployer la mise à jour hors du gel de 2997** (dès la fenêtre de déclarations close) — le travail livré aujourd'hui reste invisible pour le royaume tant que ce n'est pas fait ; le pilote 41 sert de terrain de validation en attendant.
  2. **Fermer la lecture publique des règles Firestore (`static_data`/`kvk_history`, dont `deadweight`)** — croisement sécurité (BUG-002 B-1) × juridique (A-045/A-047/A-048) : correctif prêt (D-01, P0 de `Dette_Technique_2026-08.md`), **bloquant avant toute ouverture commerciale**, à déployer d'abord sur 41 puis 97.
  3. **Chantier dette technique BUG-007** — dérouler le séquencement livré : D-03/D-04 (lint front-only) puis D-06/D-07/D-11 (nav/docId/SSOT), D-09 (code-split) ; D-02/D-05 (liste d'exclusion RGPD, stamp `campaignId`) avec D-01, hors gel.
  4. **Rédaction des documents réglementaires** (politique de confidentialité, notice art. 14, CGU/CGV, mentions légales) — séquencement détaillé en `docs/legal/Etude_Cadrage_Juridique_Lancement_UE.md` §9 ; dépend de la qualification éditeur/royaume-client (coresponsabilité vs sous-traitance) à trancher avec un avocat avant rédaction.
  5. **Raffinements du rôle Admin (F-034/BR-023)** — V1 = équivalent Roi par instance ; reste à concevoir : split fin des pouvoirs ops (ingestion/config technique) vs pouvoirs de jeu (Roi), et un super-admin **cross-tenant** pour l'industrialisation multi-royaumes (`Etude_Industrialisation_Onboarding.md`).
  6. **F-031 V2 (Calendrier KvK — pings Discord) et suite d'E-007 (multi-comptes)** restent au calendrier mais après les points 1-5 — fenêtre KvK 3341 toujours ouverte jusqu'au 19/09.
* **BUG-008** (harnais de test/preview des écrans connectés avec fixtures) reste tracé, non priorisé dans cette liste — à ordonnancer par le Roi face aux 6 points ci-dessus. Voir `docs/pm/ProductBacklog.md` §Bugs/Dette.
* **F-036/US-047 [SPEC PRÊTE À CONSTRUIRE — cadrage 2026-08-13, gate levé le même jour]** : Performance KvK dérivée du scan ProKingdoms (source unique avec la course), demandée par le Roi — décision de direction prise, cadrage produit livré (`docs/pm/Spec_Performance_KvK_Source_Scan.md`). Les 2 hypothèses bloquantes sont **résolues** (vérifiées sur le scan 006 SoC 4 de 2997 vs la feuille, médiane des ratios = 1,0000) : `totalDead ← dead_diff` (têtes, aucune conversion), `totalKpGained ← kill_points_diff`. **Plus rien ne bloque le démarrage du code** — reste un chantier dev non engagé (effort M : jointure Basic+Full Data, flag « source Performance » par instance, pilote en premier, 2997 inchangé). Répare directement le manque du pilote (Performance vide côté morts/objectifs) sans risque sur 2997 (reste `sheet` par défaut). À arbitrer par le Roi dans l'ordonnancement face aux points 1-6 ci-dessus — candidat naturel après le point 1 (déploiement), désormais sans préalable de vérification.

### Moyen terme (1–3 mois)
* **Objectif :** Historique KvK & Automatisation Discord (Repriorisation 2026-07-11)
* **Attendu :**
  * **E-004 / F-015 : Historique des KvK (🟠 Important — nouveau focus)** — clôture manuelle des campagnes, sélecteur de campagne, vue progression joueur, import SoC 1/2/3. Voir `Etude_Historique_KvK.md`. *Dépendances : F-006 (kvk_config), sauvegarde SoC 3, Sheets Drive SoC 1/2. Risques : formats hétérogènes des anciennes campagnes.* Le redéploiement functions associé embarque le correctif BUG-003.
  * E-001: Uploader In-app. Remplacement total de `digest-data.js` par un module backend/frontend.
  * E-003: Bot Discord - Slash Commands (`/mystats`, `/mykvk`) pour consultation in-chat (Priorité P1).
  * E-003: Bot Discord - Pings Automatisés pour les "Missing Forms" (Priorité P1).
  * F-014: Moteur de calcul des objectifs individuels KvK (KP, Deads, DKP) intégré au War Tracker et via `/mykvkgoals` sur Discord.
  * Firestore Rules consolidées & Audit de Sécurité.
  * Rétrodocumentation terminée.
  * **[DONE 2026-07-18] F-022 / US-023 : Timeline du Royaume** — arbitrée 🔴 priorité immédiate par le Roi (D1–D4) et livrée le jour même : onglet « Progression du Royaume » (King/Officer) sur Performance KvK, agrégats par campagne + résultat officiel saisi par le Roi. Voir `Etude_Timeline_Royaume.md`.
* **Dépendances :** Storage ou traitement Cloud Functions, API Discord (Bot Token déjà configuré).

### Long terme (3–6 mois)
* **Objectif :** Scalabilité & Outils Différenciants
* **Attendu :**
  * Bot Interactif Avancé (Gestion de banque /bank, rapports complexes, `/mykvk <campagne>` — US-014, extension de F-015).
  * ~~Historisation multi-KvK sur l'ensemble de l'app~~ → **remontée en Moyen terme (E-004, décision du 2026-07-11)**.
  * API publique (si applicable).
  * **E-005 [LIVRÉ EN PROD le 2026-07-22 — Phase 1 (jalons 1–4 + US-015, voir `Plan_Execution_E005_Phase1.md`) et Phase 2 (F-020 : US-019, US-021, vue Efficacité, archivage du résumé de course). Phase 3 abandonnée.]** : module « KvK Race » absorbant le KvK Manager Python. *Cadrage technique fait le 2026-07-21 (moteur source analysé, jeu de parité généré depuis les 6 scans réels SoC 4 et versionné dans `tests/fixtures/kvk_race_parity/`).* *Objectif : course à l'étoile centralisée dans l'app avant la prochaine saison (estimée ~oct.–nov. 2026). Périmètre acté (5/5 décisions au 2026-07-21) : **Phase 1 immédiate** (ingestion scans F-018 + dashboard course F-019, prioritaire sur US-008/F-014) pendant l'inter-saison en cours, Phase 2 (analytique F-020) ensuite ; vue course **réservée King/Officer** (modèle BR-011) ; **Phase 3 scouting abandonnée** (F-021/US-022, A-012 invalidée). Dépendances : Cloud Storage, audit Rules BUG-002 ; cadre DKP arbitré (BR-010). Risques : format des scans tiers, coûts Firestore/Storage, parité des calculs Python→JS.*
