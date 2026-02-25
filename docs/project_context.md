# Documentation & Analyse de l'Existant - Rétrodocumentation KD 2997

## 1. Vue d’ensemble du produit

### 1.1 Finalité supposée de l’application
*   **Objectif métier** : Fournir une plateforme centralisée de gestion communautaire pour le leadership d’un Royaume (KD 2997) dans le jeu Rise of Kingdoms.
*   **Problème utilisateur adressé** : Faciliter la gestion des présences en guerre (War Tracker), le suivi des performances lors des KVK (Kills, Deads), la gestion des contributions bancaires, et authentifier facilement les joueurs de l'alliance.
*   **Cible utilisateur identifiée** : 
    * Leadership (Roi) : Configuration Globale
    * Officiers : Mise à jour des datas, suivi des présences
    * Joueurs (Warriors) : Déclaration des disponibilités pour les guerres, consultation de leurs statistiques.

### 1.2 Positionnement fonctionnel
*   **Type d’application** : Dashboard analytique et outil interne (SaaS-like pour une guilde/royaume).
*   **Complexité globale** : Moyenne à Morte. Intègre de la Data Visualization riche, de l'authentification tierce (Auth Google + SSO Discord), une synchronisation de rôles via Discord, des bases de données temps réel (Firestore) et des Cloud Functions pour l'ingestion de données et la sécurité.

---

## 2. Cartographie fonctionnelle

### 2.1 Liste des fonctionnalités identifiées

| Fonctionnalité | Description | Pages concernées | État |
| :--- | :--- | :--- | :--- |
| **Authentification** | Login via Google, ou directement via le SSO Discord (OAuth2 complet). | `App.jsx`, `ProfilePage` | 🟢 Fonctionnelle |
| **Synchronisation des Rôles** | Synchronisation automatique des rôles sur l'app (King/Officer/Warrior) selon le grade de l'utilisateur sur le serveur Discord de la guilde. | `ProfilePage.jsx` | 🟢 Fonctionnelle |
| **Dashboard** | Vue agrégée des données du Royaume (Top 300, Trésorerie globale). | `DashboardPage.jsx` | 🟢 Fonctionnelle |
| **Tableaux de Performance** | Analyse des joueurs pour le KvK en cours (Objectifs, KP, Deads). | `KvKPerformancePage.jsx` | 🟢 Fonctionnelle |
| **Trophées** | Historique événementiel du royaume hebdomadaire. | `KingdomTrophiesPage.jsx` | 🟢 Fonctionnelle |
| **Deadweight (Poids Mort)** | Suivi des joueurs inactifs ou non performants. | `DeadweightPage.jsx` | 🟢 Fonctionnelle |
| **Banque** | Tracking des dons (Ressources) par joueur par semaine. | `BankPage.jsx` | 🟢 Fonctionnelle |
| **War Tracker** | Formulaire de déclaration de présence pour les guerres de garnison/ralliement (incluant engins de siège) et Dashboard Officiers pour suivre les présences globales. | `WarTrackerPage.jsx` | 🟢 Fonctionnelle |
| **Upload de Données** | Composant pour uploader les fichiers Excel (Top 300, etc) qui synchronise automatiquement vers la DB. | `DataRefreshControl.jsx` | 🟢 Fonctionnelle |
| **Multi-Langues (i18n)** | Traduction complète de l'application en 8 langues. | `LanguageSwitcher.jsx` | 🟢 Fonctionnelle |

### 2.2 Mapping des User Flows

*   **Connexion / SSO Flow**
    *   *Point d’entrée* : N'importe quelle page bloquée.
    *   *Action* : Clic sur Connexion Discord. L'utilisateur est redirigé vers l'OAuth2 Discord.
    *   *Résultat attendu* : Assignation automatique des rôles via Cloud Function et connexion de l'utilisateur.

*   **Flow War Tracker (Joueur)**
    *   *Point d’entrée* : Rubrique "War Tracker".
    *   *Action* : Remplissage des types de marches disponibles (Infanterie, Cavalerie, Archers, Siège) et nombre pour une campagne KvK active.
    *   *Résultat attendu* : Envoi instantané vers Firestore et visibilité pour les officiers.

*   **Flow Ingestion des données (Officier/King)**
    *   *Point d’entrée* : Dashboard Admin ou composant DataRefresh.
    *   *Action* : Dépôt d'un fichier .xlsx (issu du jeu/scanner).
    *   *Résultat attendu* : Le code parse le fichier via SheetJS (`xlsx`), formate en JSON et envoie un blob chiffré aux Cloud Functions pour persister dans Firestore.

---

## 3. Architecture technique observée

### 3.1 Structure des pages
*   Routeur : Basé sur `react-router-dom` (HashRouter).
*   **Pages** : Sécurisées par un HOC de protection (`RoleGuard.jsx` ou contexte conditionnel).
    *   `/` : Dashboard
    *   `/war-tracker` : Guerre (Formulaires + Tableaux de bord officiers + Configs Roi).
    *   `/kvk` : Stats de guerre individuelles.
    *   `/profile` : Paramétrages persos et link des profils.

### 3.2 Structure des données

Modèle de données principal (basé sur Cloud Firestore) :

| Collection Firestore | Rôle / Description |
| :--- | :--- |
| `kvk_config` | Contient un document `current` gérant la campagne active du royaume. |
| `war_availabilities` | Stocke les déclarations de présence aux guerres des joueurs, liées par un `kvkId`. |
| `user_profiles` | Données de l’utilisateur authentifié (ID Discord, grade assigné). |
| `player_data` / `bank_data` | Collections (ou blobs JSON gérés en interne par functions) de la data Ingame parsée depuis les Excel. |

### 3.3 Logique métier
*   **Parsing Excel Client-side** : Exécution sur le thread principal front avec structuration via un mapping externe `data-mapping.js`.
*   **Sécurité API** : Les appels à Firestore en modification sont validés via Security Rules et limités (seuls King/Officers écrivent la DB de stats). Le système Discord utilise un JWT Token Minté par des Cloud Functions (Firebase Admin SDK).
*   **RBAC (Role Based Access Control)** : Hiérarchie stricte via Context (`RoleContext.jsx`). Accès : Guest < Warrior < Officer < King.

---

## 4. Analyse UX / UI

### 4.1 Cohérence interface
*   **Thème** : "Glassmorphism" sombre/premium (Slate-900). Modèles visuels constants.
*   **Design System** : Utilisation intensive de Tailwind CSS (et non un framework composants lourd). Les icônes `lucide-react` et des animations simples (`framer-motion` et CSS transitions) donnent une vraie vitalité à la SPA.
*   **Responsive** : Barre de navigation latérale dynamique, devenant Sidebar/BottomNav sur mobile. Tableaux scrollables horizontalement.
*   **Palette** : Primary (Indigo/Purple), Success (Emerald), Warnings (Amber). Contraste et accessibilité (WCAG) généralement respectés.

### 4.2 Expérience utilisateur
*   **Points de friction résiduels** : L'ingestion des Excel pourrait planter de façon opaque si le format du fichier change inopinément, ce qui produit un message d'erreur dur à interpréter pour un utilisateur lambda.

---

## 5. Dette technique et risques

| Type de Dette | Évaluation | Commentaire |
| :--- | :--- | :--- |
| **Structure des données Excel** | 🔴 Critique | Le système est extrêmement couplé au format exact d'un `.xlsx` exporté de ROK. Les headers et tab-names évoluent et requièrent une maintenance du `data-mapping.js`. |
| **Coût Firestore (Reads)** | 🟠 Important | L'affichage du leaderboard demande de charger tout le `player_data`. Il est important de maintenir le batching et la compression côté Cloud Functions. |
| **Complexité OAuth2 (React Router)** | 🟢 Améliorable | Le hack pour parse le token (gestion du `#` dans HashRouter via Redirect) fonctionne mais méritrait peut-être une lib Auth0 ou refactoring si la complexité augmente. |

---

## 6. Hypothèses et zones d’ombre
*   **Bot d’Alerte Discord** : Il est mentionné dans le backlog ("Bot de notifications") mais n'est pas encore programmé (Phase 3). L'infrastructure est cependant prête puisqu'on a le Token Bot Discord et l'intent de serveur installés dans Google Cloud Secrets.
*   **Gestion des logs de Sync** : Actuellement, aucune trace de l'historique d'import n'est facilement lisible par le Roi sur l'interface si un upload foire côté backend Cloud Function.

---

## 7. Recommandations pour un rebuild propre
Bien que l'application actuelle soit fonctionnelle en l'état V2:
1. **Abstraction de la data source** : Isoler totalement le parsing Excel en Backend via Node (`Busboy`/`Multer`). Alléger le client lourd frontend et ajouter des Logs Cloud.
2. **Utiliser des Aggregations Firestore** : Éviter de fetch 300 docs de la DB juste pour compter le nombre de points d'une alliance, utiliser `count()` de Firebase 9+.
