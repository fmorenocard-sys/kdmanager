# Roadmap (KD 2997)

## Horizon

### Court terme (0–4 semaines)
* **Objectif :** Stabilisation & Adoption du War Tracker (DONE)
* **Attendu :** 
  * [DONE] Tous les joueurs se connectent et lient leur ID (via SSO Discord 100% opérationnel).
  * [DONE] Premier test de collecte de disponibilités KvK via le nouveau "Active Campaign set".
* **Nouveau Focus :** Pivot sur l'Epic E-003 pour les interactions Discord.

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
  * **E-005 [GO — décision Roi 2026-07-21 · Phase 1 EN EXÉCUTION, voir `Plan_Execution_E005_Phase1.md`]** : module « KvK Race » absorbant le KvK Manager Python. *Cadrage technique fait le 2026-07-21 (moteur source analysé, jeu de parité généré depuis les 6 scans réels SoC 4 et versionné dans `tests/fixtures/kvk_race_parity/`).* *Objectif : course à l'étoile centralisée dans l'app avant la prochaine saison (estimée ~oct.–nov. 2026). Périmètre acté (5/5 décisions au 2026-07-21) : **Phase 1 immédiate** (ingestion scans F-018 + dashboard course F-019, prioritaire sur US-008/F-014) pendant l'inter-saison en cours, Phase 2 (analytique F-020) ensuite ; vue course **réservée King/Officer** (modèle BR-011) ; **Phase 3 scouting abandonnée** (F-021/US-022, A-012 invalidée). Dépendances : Cloud Storage, audit Rules BUG-002 ; cadre DKP arbitré (BR-010). Risques : format des scans tiers, coûts Firestore/Storage, parité des calculs Python→JS.*
