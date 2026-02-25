# Étude de Faisabilité & Ajout de Valeur : Intégration Discord (KD 2997)

**Date :** 2026-02-24
**Auteur :** Agent Product Manager
**Statut :** À l'étude (Discovery)

---

## 🎯 1. Contexte & Problématique
Le Kingdom Manager (KD 2997) propose actuellement un portail web où les joueurs s'authentifient via Google pour déclarer leurs présences KvK et consulter leurs statistiques. Cependant, le hub social et stratégique de l'immense majorité des royaumes (et alliances) sur *Rise of Kingdoms* repose sur **Discord**.

L'obligation de basculer entre Discord (pour lire les annonces) et la Web App (pour interagir) crée de la friction. Une intégration fluide permettrait de transformer la web app en un prolongement naturel du serveur Discord du royaume.

---

## 🚀 2. Axes de création de valeur (Les Opportunités)

### Axe 1 : Authentification Sans Friction (Discord SSO)
* **Description** : Permettre l'authentification (`Sign In with Discord`) au lieu (ou en plus) de Google.
* **Valeur Utilisateur** : Élimine la friction. Les joueurs n’ont pas besoin d'exposer leur e-mail Google personnel et utilisent l'identité avec laquelle ils jouent tous les jours.
* **Valeur R4/R5** : Permet de mapper dynamiquement l'ID Discord du joueur à son `governor_id` dans la base de données.

### Axe 2 : Synchronisation des Rôles (RBAC Dynamique)
* **Description** : Lier les permissions de l'application (King, Officer, Warrior) directement aux Rôles du serveur Discord (ex: rôle `@Conseil` = Officer).
* **Valeur** : Les administrateurs n'ont plus à maintenir deux bases de permissions distinctes. Donner un grade sur Discord donne instantanément accès aux Dashboards restreints sur la Web App.

### Axe 3 : Notifications & Rappels Automatisés (Push & Ping)
* **Description** : Création d'un bot Discord branché sur la base de données Firestore.
* **Cas d'usage** :
    * **KvK Alert** : Dès qu'une nouvelle campagne KvK est configurée sur la Web App ➔ Message d'annonce auto sur Discord (`@everyone Les inscriptions KvK sont ouvertes sur le portal !`).
    * **Missing Players** : Bouton dans le *War Dashboard* "Ping les retardataires" ➔ Le bot mentionne directement les joueurs sur Discord qui n'ont pas encore rempli leur formulaire de disponibilité.
    * **Deadweight Report** : Envoi d'un récapitulatif masqué aux officiers sur un salon privé lors de l'upload des data de DKP.

### Axe 4 : Commandes Discord (Slash Commands)
* **Description** : Consulter ses statistiques directement depuis le chat Discord.
* **Cas d'usage** :
    * `/mystats` ➔ Le bot répond avec les KP gagnés et le power diff du joueur.
    * `/bank` ➔ Affiche le solde actuel de ressources dans la banque du royaume.

---

## ⚖️ 3. Matrice Effort / Impact (Priorisation)

| Fonctionnalité / Epic | Impact Business | Effort Technique | Complexité | Recommandation Priorité |
|---|:---:|:---:|:---:|:---:|
| **Discord SSO (Auth)** | 🔴 Fort | 🟢 Faible | Firebase propose un provider Discord natif. | **P0** - Quick Win (Prochaine itération) |
| **Alertes Webhook (1-way)** | 🟠 Moyen | 🟢 Faible | Déclencher un webhook depuis les Cloud Functions lors de création de KvK. | **P1** |
| **Sync Rôles Discord ⟷ App** | 🔴 Fort | 🟠 Moyen | Nécessite un Bot Discord et une base Node.js. | **P1** |
| **Bot Interactif (/commands)** | 🟠 Moyen | 🔴 Fort | Maintien d'un bot 24/7, interactions complexes. | **P2** - Long Terme |
| **Ping ciblé (Retardataires)** | 🔴 Fort | 🔴 Fort | Mapping parfait requis entre ID Discord et ID in-game. | **P2** |

---

## 🛠️ 4. Analyse Technique P0 (Discord SSO via Firebase)
1. **Créer une application Discord** sur developper.discord.com pour obtenir un `Client ID` et `Client Secret`.
2. **Configurer l'Identity Provider** sur Firebase Auth (fournir les identifiants Discord).
3. **Mettre à jour le Frontend** (`AuthContext.js` et `SignIn.jsx`) pour inclure le bouton de connexion Discord.
4. **Gérer l'Onboarding** : Si un compte est créé via Discord, lui demander son `governorId` comme on le fait pour Google.

---

## 📦 5. Mises à jour stratégiques suggérées pour les documents
1. **ProductBacklog** : Création de l'Epic `E-003: Discord Ecosystem Integration`.
2. **Roadmap** : Placer le SSO Discord à Moyen Terme (1-3 mois), et le Bot Interactif à Long Terme.
3. **Assumptions_Log** : Ajouter l'hypothèse (A-004) "Les joueurs sont plus réceptifs et cliquent plus sur des liens s'authentifiant via Discord plutôt que Google".

---

**Conclusion du PM :** L'intégration Discord est un levier majeur de rétention et d'usage pour un outil de gestion d'alliances ROK. Le SSO Discord doit devenir le moyen primaire d'authentification. Les notifications poussées réduiront grandement la charge de "micro-management" des officiers.
