# Roadmap (KD 2997)

## Horizon

### Court terme (0–4 semaines)
* **Objectif :** Stabilisation & Adoption du War Tracker
* **Attendu :** 
  * Tous les joueurs se connectent et lient leur ID.
  * Premier test de collecte de disponibilités KvK via le nouveau "Active Campaign set".
* **Risques :** Erreurs d'adoption, joueurs qui ne trouvent pas leur ID.

### Moyen terme (1–3 mois)
* **Objectif :** Automatisation & Sécurisation & Intégration Écosystème
* **Attendu :**
  * E-001: Uploader In-app. Remplacement total de `digest-data.js` par un module backend/frontend.
  * E-003: SSO Discord Auth (Priorité P0) pour supprimer la friction de login.
  * Firestore Rules consolidées.
  * Rétrodocumentation terminée.
* **Dépendances :** Storage ou traitement Cloud Functions, API Discord (OAuth2).

### Long terme (3–6 mois)
* **Objectif :** Scalabilité & Outils Différenciants
* **Attendu :**
  * E-003: Bot Discord (Push Notifications KvK & Commandes interactives).
  * Historisation multi-KvK sur l'ensemble de l'app (pas uniquement War Tracker).
  * API publique (si applicable).
