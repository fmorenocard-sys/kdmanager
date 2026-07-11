# Roadmap (KD 2997)

## Horizon

### Court terme (0–4 semaines)
* **Objectif :** Stabilisation & Adoption du War Tracker (DONE)
* **Attendu :** 
  * [DONE] Tous les joueurs se connectent et lient leur ID (via SSO Discord 100% opérationnel).
  * [DONE] Premier test de collecte de disponibilités KvK via le nouveau "Active Campaign set".
* **Nouveau Focus :** Pivot sur l'Epic E-003 pour les interactions Discord.

### Moyen terme (1–3 mois)
* **Objectif :** Automatisation & Engagement Discord (Pivot 2026-02-25)
* **Attendu :**
  * E-001: Uploader In-app. Remplacement total de `digest-data.js` par un module backend/frontend.
  * E-003: Bot Discord - Slash Commands (`/mystats`, `/mykvk`) pour consultation in-chat (Priorité P1).
  * E-003: Bot Discord - Pings Automatisés pour les "Missing Forms" (Priorité P1).
  * F-014: Moteur de calcul des objectifs individuels KvK (KP, Deads, DKP) intégré au War Tracker et via `/mykvkgoals` sur Discord.
  * Firestore Rules consolidées & Audit de Sécurité.
  * Rétrodocumentation terminée.
* **Dépendances :** Storage ou traitement Cloud Functions, API Discord (Bot Token déjà configuré).

### Long terme (3–6 mois)
* **Objectif :** Scalabilité & Outils Différenciants
* **Attendu :**
  * Bot Interactif Avancé (Gestion de banque /bank, rapports complexes).
  * Historisation multi-KvK sur l'ensemble de l'app (pas uniquement War Tracker).
  * API publique (si applicable).
