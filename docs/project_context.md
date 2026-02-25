# Documentation & Analyse de l'Existant - Refonte Application Royaume 2997

Ce document synthétise le contexte, l'architecture et les besoins de l'application existante en vue de sa refonte (V2).

## 1. Vue d’ensemble du produit

### 1.1 Finalité supposée de l’application
*   **Objectif métier** : Fournir un tableau de bord de gestion et d’analyse pour le leadership d’un Royaume (KD 2997) dans le jeu Rise of Kingdoms.
*   **Problème utilisateur adressé** : Centraliser et visualiser les données dispersées (fichiers Excel multiples) concernant la puissance des joueurs, les contributions (banques), et les performances (trophées/kills), afin de faciliter la prise de décision (migrations, tracking de "poids mort").
*   **Cible utilisateur identifiée** : Officiers et Leadership du Royaume 2997.

### 1.2 Positionnement fonctionnel
*   **Type d’application** : Outil interne de gestion communautaire (Dashboard analytique).
*   **Complexité globale** : Moyenne. L’application agrège plusieurs sources de données (Excel) et propose des visualisations interactives (graphiques, tables triables) mais ne possède pas (encore) de backend complexe ou de base de données relationnelle persistante (reposant sur du local storage et des fichiers statiques).

## 2. Cartographie fonctionnelle

### 2.1 Liste des fonctionnalités identifiées

| Fonctionnalité | Description | Pages concernées | État |
| :--- | :--- | :--- | :--- |
| **Dashboard** | General KD stats (Power, Kill Points, RSS). | `DashboardPage.jsx` | 🟢 Live |
| **Performance** | KvK Player analysis (Kills, Dead, Goals). | `KvKPerformancePage.jsx` | 🟢 Live |
| **Trophies** | Weekly wins & event history. | `KingdomTrophiesPage.jsx` | 🟢 Live |
| **Deadweight** | Tracking inactive/non-compliant players. | `DeadweightPage.jsx` | 🟢 Live |
| **Bank** | Resource tracking & weekly deposits. | `BankPage.jsx` | 🟢 Live |
| **War Tracker** | Readiness, tech budget, marched list. | `WarTrackerPage.jsx` | 🟢 Live |
| **Profile** | User settings (Google Auth), linking ID. | `ProfilePage.jsx` | 🟢 Live |
| **Data Sync** | Officer-only XLSX upload trigger. | `DataRefreshControl.jsx` | 🟢 Live |

### 2.2 Mapping des User Flows

#### Flow : Mise à jour des données
*   **Entrée** : Bouton "Update" sur n'importe quelle page (Dashboard, Bank, etc.).
*   **Action** : L'utilisateur sélectionne/glisse un fichier Excel local.
*   **Traitement** : Le composant `DataRefreshControl` parse le fichier via `xlsx`.
*   **Résultat** : Les graphiques et tableaux se mettent à jour instantanément (état local ou persisté si implémenté).

#### Flow : Analyse de Contribution (Banque)
*   **Entrée** : Page "Kingdom Bank".
*   **Visualisation** : Graphiques des entrées RSS par semaine.
*   **Détail** : Tableau croisé dynamique des contributions par semaine.

## 3. Architecture technique observée

### 3.1 Structure des pages
*   `App.jsx` : Routeur principal (gestion d'état `activePage`). Layout avec `Sidebar`.
*   `DashboardPage.jsx` : Page d'accueil. Agrège Top 300 et Bank Ledger pour une vue synthétique.
*   `DeadweightPage.jsx` : Focus sur l'optimisation du matchmaking (puissance vs performance).
*   `BankPage.jsx` : Focus sur la trésorerie.
*   `KingdomTrophiesPage.jsx` : Focus sur l'historique événementiel.

### 3.2 Structure des données
Les données proviennent exclusivement de fichiers Excel statiques situés dans `/public/data/` ou uploadés par l'utilisateur.

**Fichiers Sources :**
1.  **`Top 300 [Date].xlsx`** (ex: `Top 300 14_2_2026.xlsx`) :
    *   Onglet `[Date]` : Données joueurs (ID, Nom, Puissance, KP, etc.).
    *   Onglet `Dashboard` : Historique d'évolution (Date, Puissance Totale, KP Totaux).
2.  **`KD 97 Bank Ledger.xlsx`** :
    *   Onglet `Weekly Contribution` : Matrice Joueurs x Semaines (RSS donnés).
    *   Onglet `Dashboard` : État actuel de la trésorerie (Food, Wood, Stone, Gold).
3.  **`KD 97 Deadweight.xlsx`** :
    *   Fichier spécifique pour le tracking des poids morts (structure similaire au Top 300).
4.  **`Offseason_KingTrophies_[Year].xlsx`** :
    *   Format vertical par semaine. Liste des gagnants par catégorie (Zenith, MGE, etc.).

Tous les fichiers sont centralisés dans `/public/data/`.

### 3.3 Logique métier
*   **Parsing Excel** : Utilisation intensive de la librairie `xlsx`.
*   **Logique de Détection** :
    *   **Headers Dynamiques** : `BankPage` scanne les premières lignes pour trouver la ligne des "Semaines".
    *   **Fusion de Données** : `DashboardPage` croise les données de deux fichiers Excel différents pour afficher à la fois les stats joueurs et la trésorerie.
*   **Persistance** : Utilisation partielle de `localStorage` pour sauvegarder les URLs de Google Sheets (feature existante dans le code mais moins mise en avant récemment au profit des fichiers locaux).

## 4. Analyse UX / UI

### 4.1 Cohérence interface
*   **Thème** : "Glassmorphism" sombre/premium cohérent (fonds translucides, bordures fines, dégradés de texte).
*   **Navigation** : Sidebar latérale persistante.
*   **Feedback** : Loaders pendant le chargement des fichiers. Alertes lors des mises à jour réussies.

### 4.2 Expérience utilisateur
*   **Points forts** : Interface très réactive (SPA), visuels impactants (Recharts, Lucide icons).
*   **Frictions potentielles** :
    *   La dépendance aux noms de fichiers/onglets exacts dans les Excel peut être source d'erreurs (fragilité du parsing).
    *   Pas de backend : Les données ne sont mises à jour que si l'utilisateur a le fichier ou si le déploiement est mis à jour avec de nouveaux fichiers dans `/public/data/`.

## 5. Dette technique et risques

| Problème | Sévérité | Description |
| :--- | :--- | :--- |
| **Dépendance structure Excel** | 🔴 Critique | Le code attend des formats très spécifiques (noms d'onglets, positions de colonnes). Un changement mineur dans l'Excel casse l'app. (Atténué partiellement par la recherche dynamique de headers récente). |
| **Pas de Backend** | 🟠 Important | Les données sont "statiques" pour chaque utilisateur à moins d'upload manuel. Pas de "source de vérité" partagée en temps réel sans redéploiement. |
| **Performance Parsing** | 🟢 Améliorable | Parser des gros fichiers Excel (Top 300 complet) côté client à chaque chargement pourrait devenir lent sur mobile. |
| **Hardcoded Paths** | 🟢 Améliorable | Les noms de fichiers (14_2_2026) sont en dur dans le code. À chaque scan, il faut changer le code ou renommer le fichier. |

## 6. Hypothèses et zones d’ombre
*   **Google Sheets** : Le code contient des traces d'intégration Google Sheets (`fetchCsv`, `localStorage`), mais l'usage actuel semble pivoter vers des fichiers Excel locaux/statiques. La stratégie finale d'alimentation des données est floue.
*   **Authentification** : Aucune gestion utilisateur/rôle n'est visible. L'app est accessible à tous ceux qui ont le lien (ok pour un dashboard lecture seule, risqué si fonctionnalités d'écriture ajoutées).

## 7. Recommandations pour un rebuild propre (v2)
*   **Fichier de Configuration** : Externaliser les noms de fichiers cibles et les mappings de colonnes dans un `config.js` ou `constants.js` pour éviter de toucher aux composants React lors des changements de format Excel.
*   **Middleware d'Ingestion** : Idéalement, créer un script (Node.js/Python) qui transforme les Excels bruts en JSON standardisé (`players.json`, `history.json`) lors du build ou via une API simple. L'app frontend ne consommerait que ce JSON propre, découplant la logique d'affichage de la complexité du parsing Excel.
*   **Mode "Live" vs "Archive"** : Pour les trophées et l'historique, gérer explicitement les années/saisons via une structure de dossiers `/data/2026/`, `/data/2025/` pour la scalabilité.
