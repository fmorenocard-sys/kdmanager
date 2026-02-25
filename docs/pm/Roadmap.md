# Roadmap (KD 2997)

## Horizon

### Court terme (0–4 semaines)
* **Objectif :** Stabilisation & Adoption du War Tracker
* **Attendu :** 
  * Tous les joueurs se connectent et lient leur ID (désormais facilité par le SSO Discord 100% opérationnel).
  * Premier test de collecte de disponibilités KvK via le nouveau "Active Campaign set".
* **Risques :** Erreurs d'adoption, joueurs qui ne trouvent pas leur ID in-game.

### Moyen terme (1–3 mois)
* **Objectif :** Automatisation & Sécurisation & Intégration Écosystème (Phase 2)
* **Attendu :**
  * E-001: Uploader In-app. Remplacement total de `digest-data.js` par un module backend/frontend.
  * E-003: Bot Discord (Alertes Webhook pour l'ouverture de KvK & Sync des Rôles RBAC - Priorité P1).
  * Firestore Rules consolidées.
  * Rétrodocumentation terminée.
* **Dépendances :** Storage ou traitement Cloud Functions, API Discord (Bot Token).

### Long terme (3–6 mois)
* **Objectif :** Scalabilité & Outils Différenciants
* **Attendu :**
  * E-003: Bot Interactif (Commandes Slash Discord pour consulter les stats in-chat).
  * Historisation multi-KvK sur l'ensemble de l'app (pas uniquement War Tracker).
  * API publique (si applicable).
