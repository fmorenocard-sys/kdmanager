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
  * **F-022 / US-023 : Timeline du Royaume (🟢 Opportunité — proposée 2026-07-18, décisions D1–D4 à arbitrer)** — frise chronologique des campagnes avec agrégats royaume, adossée à `kvk_history` (E-004 déjà Live, effort faible). Voir `Etude_Timeline_Royaume.md`. *Dépendances : F-015. Risques : champs null SoC 1/2 ; résultat officiel non stocké (D2).*
* **Dépendances :** Storage ou traitement Cloud Functions, API Discord (Bot Token déjà configuré).

### Long terme (3–6 mois)
* **Objectif :** Scalabilité & Outils Différenciants
* **Attendu :**
  * Bot Interactif Avancé (Gestion de banque /bank, rapports complexes, `/mykvk <campagne>` — US-014, extension de F-015).
  * ~~Historisation multi-KvK sur l'ensemble de l'app~~ → **remontée en Moyen terme (E-004, décision du 2026-07-11)**.
  * API publique (si applicable).
  * **E-005 (proposé, arbitrage Roi requis — voir `Etude_Fusion_KvK_Manager.md`)** : module « KvK Race » absorbant le KvK Manager Python. *Objectif : course à l'étoile centralisée dans l'app avant la prochaine saison (estimée ~oct.–nov. 2026). Résultat attendu : Phase 1 (ingestion scans F-018 + dashboard course F-019) prête inter-saisons ; Phases 2–3 (analytique F-020, scouting F-021) ensuite. Dépendances : Cloud Storage, audit Rules BUG-002 ; cadre DKP arbitré le 2026-07-14 (deux domaines étanches — interne vs coalition — paramétrables par campagne, BR-010). Risques : format des scans tiers, coûts Firestore/Storage, parité des calculs Python→JS.*
