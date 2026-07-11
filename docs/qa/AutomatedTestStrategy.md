# Stratégie de Tests Automatisés - KD Manager

## 1. Outils pour l'Automatisation (E2E & Composants)

Pour assurer la qualité des parcours existants, l'implémentation de tests automatiques de type End-to-End (E2E) est la solution la plus pertinente.
**Recommandation d'outil : Playwright (ou Cypress)**
*   **Pourquoi Playwright ?** Temps d'exécution rapide, bonne gestion du multi-onglets (utile pour test SSO OAuth), exécution parallèle, tests faciles à écrire en TypeScript, bonne intégration CI (GitHub Actions).
*   **Alternative (Composants purs) :** Vitest + React Testing Library pour les algorithmes purs de formatage ou parsing de données sans UI.

## 2. Environnements de Tests

Pour éviter d'altérer les données de production (Firestore) pendant les tests automatisés :
**Stratégie : Firebase Local Emulator Suite**
*   **Principe :** Les tests ne pointeront **jamais** vers le vrai projet Firebase. On utilise l'émulateur local pour l'Authentification, Firestore, et Cloud Functions.
*   **Setup :** Côté frontend, les appels (Firestore, Auth, Functions) sont interceptés pour pointer sur `localhost`. L'application React doit être configurée pour pointer vers ces émulateurs locaux grâce à une variable d'environnement (ex: `VITE_USE_EMULATORS=true`).

## 3. Jeux de Données (Test Data Strategy)

Avoir des données prévisibles est crucial pour les tests E2E.
*   **Seeding Initial :** Création d'un dossier `emulators_data/` contenant une exportation propre (Seed) de l'état souhaité dans Firestore à l'instant T0.
    *   *Collections à mocker :* `player_data` (avec quelques Kills, Power pour des Rois, Officiers, Guerriers), `kvk_config/current` (une campagne active), quelques entrées dans `war_availabilities`.
*   **Processus CI/Test :**
    1.  Démarrage des émulateurs Firebase en important le jeu de données par défaut.
        `firebase emulators:start --import=./emulators_data`
    2.  Démarrage du frontend (ex: mode `dev` pointant vers émulateurs).
    3.  Lancement de la suite Playwright pour faire les assertions.
    4.  Fermeture de l'environnement (sans écraser le `emulators_data/` initial pour garantir l'idempotence des runs suivants, option `--export-on-exit` désactivée en CI).

## 4. Parcours Candidats (Top Priorité d'Automatisation)

Selon le TestPack, il faut automatiser en priorité les chemins critiques (P0) et les suites de validation (P1) les plus chronophages :
1.  **Parcours Auth & RBAC (Critique)** : Connexion SSO simulée (via API Playwright request context + Auth Emulator) -> Vérification de l'accès selon le rôle (King voit l'onglet Config, Guest ne voit rien ou accès réduit).
2.  **Parcours War Tracker (Formulaire)** : Soumission du formulaire de disponibilité par un Warrior -> Vérification d'absence de régressions sur les champs obligatoires (Troupes, Créneaux) -> Vérification de l'affichage de confirmation globale.
3.  **Parcours Data Ingestion (Cloud Sync)** : Upload d'un faux fichier Excel structuré "Top300" -> Vérification de la prise en charge Cloud Function (émulateur) -> Vérification d'update des stats sur un dashboard E2E.
4.  **Parcours Visualisation & Tri** : Vérification que les tris de KP et filtres (Tableaux KvK Performance et Dashboard) fonctionnent avec les données de l'émulateur.

## 5. Prochaines Étapes Techniques (Actionnables)
1.  **Configuration App** : Activer dynamiquement le support complet des émulateurs dans `firebase.js` via `import.meta.env.VITE_USE_FIREBASE_EMULATOR`.
2.  **Génération BDD Test** : Importer manuellement des données représentatives et faire `firebase emulators:export ./emulators_data`.
3.  **Initialisation Playwright** : Installer Playwright (`npm init playwright@latest`).
4.  **Proof of Concept** : Écrire un premier test E2E confirmant le chargement du Dashboard "Total Power" correspondant à la Data du Seed Firestore local.
