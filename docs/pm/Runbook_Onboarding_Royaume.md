# Runbook — Onboarding d'un nouveau royaume (marque blanche)

> Date : 2026-08-18 · Auteur : PM · Statut : **runbook opérationnel, tel que vécu**
> Source unique de vérité : le pilote **KD 3341** (projet Firebase `kd-41-manager`,
> alias `.firebaserc` `pilot`), du 2026-07-27 (première infra) au 2026-08-18
> (dernière rechute cross-tenant corrigée). C'est le **seul** onboarding réel
> effectué à ce jour — tout ce qui suit vient de son historique, pas d'un idéal.

> **Ce document est descriptif, pas prescriptif.** Il documente le processus tel
> qu'il est aujourd'hui : très majoritairement manuel, avec ses pièges connus.
> Il ne les corrige pas — l'Annexe B liste ce qui serait automatisable, sans
> l'automatiser ici. Pour le cadrage stratégique (faut-il industrialiser, quelle
> voie, quel coût), voir `Etude_Industrialisation_Onboarding.md`, dont ce
> document est le complément opérationnel : cette étude pose la question « à
> quel coût peut-on aller plus vite ? », ce runbook répond à « comment fait-on,
> pas à pas, aujourd'hui ? ».

---

## 1. Vue d'ensemble

### 1.1 Prérequis

- Un compte Google Cloud / Firebase du **fournisseur** (pas du client), avec
  facturation active (plan Blaze) — chaque royaume consomme un projet Firebase
  distinct rattaché à ce compte.
- Firebase CLI installée et authentifiée en local (`firebase login`), avec des
  **Application Default Credentials** (ADC) posées — `deploy-rules.cjs` les lit
  directement (`%APPDATA%\firebase\<compte>_application_default_credentials.json`
  sous Windows).
- Le repo cloné, dépendances installées (`npm install` à la racine **et** dans
  `functions/`).
- Côté royaume client, un interlocuteur (le Roi ou un officier) capable de
  fournir, à son rythme (ce sont les dépendances externes qui allongent le
  délai calendaire, voir §1.3) :
  - le numéro/nom du royaume et un logo ;
  - un scan KvK initial (ProKingdoms ou autre fournisseur) pour peupler le
    roster — ou, en amorçage, le fondateur peut fournir lui-même le premier
    scan avec son propre abonnement (`Etude_Commercialisation_SaaS.md` §5bis) ;
  - *si* Discord est retenu pour ce royaume : le guild ID, les IDs de rôles, et
    un admin du serveur capable d'inviter le bot.

### 1.2 Acteurs

| Acteur | Rôle dans l'onboarding |
|---|---|
| **Opérateur** (toi, fournisseur) | Exécute l'intégralité du runbook. Seul détenteur des clés service-account et de l'accès admin des deux projets Firebase (2997 et le nouveau). Aujourd'hui, l'onboarding n'est **pas** self-service (A-028) : l'opérateur reste le seul exécutant. |
| **Roi client** | Fournit les identifiants Discord/logo/scans (dépendances externes, §1.3). Configure la campagne KvK (`/admin`) une fois l'instance en ligne — geste laissé à l'utilisateur, pas scripté. Devient soit épinglé Roi (`ROLE_KING_USER_IDS`), soit — modèle recommandé aujourd'hui — l'**opérateur lui-même** devient rôle **Admin** (`ROLE_ADMIN_USER_IDS`, F-034/BR-023) et le Roi client reste sur son rôle de jeu (voir Phase 7). |
| **User final** (guerriers) | Se connecte via Discord SSO (ou Google si le royaume n'a pas Discord) une fois le bot invité et les rôles synchronisés. N'intervient à aucune étape du runbook. |

### 1.3 Durée estimée par phase

> **Zone d'ombre assumée (A-030, ouverte)** : ces temps sont des ordres de
> grandeur déduits de la nature de chaque étape (console vs script vs attente
> tierce), **pas chronométrés** sur le pilote réel. `Etude_Industrialisation_
> Onboarding.md` §2 pose déjà cette réserve pour son propre chiffrage — ce
> runbook en hérite. À instrumenter réellement au prochain onboarding.

| Phase | Nature dominante | Temps actif estimé | Dépendance externe ? |
|---|---|---|---|
| 1 — Infra Firebase | Manuel (console) | 40–55 min + délai de propagation | Non |
| 2 — Marque blanche | Manuel + scriptable | 35–60 min | Oui (logo à recevoir) |
| 3 — Règles Firestore | **Déjà scriptable** | ~10 min | Non |
| 4 — Functions | **Déjà scriptable** | 10–15 min | Non |
| 5 — Ingestion des données | Scriptable (ProKingdoms) | 15 min à plusieurs jours (nouvel adaptateur) | Oui (scan à recevoir) |
| 6 — Pipeline Race | Manuel (bucket/CORS/campagne) | 30–45 min hors debug de premier trigger | Non (mais optionnel — dépend si le royaume fait la course) |
| 7 — Rôles & Admin | Manuel (portail Discord) + scriptable (secrets) | 40–60 min | **Oui, la plus lourde** (guild ID, rôles, invitation bot) |
| 8 — Recette / go-live | Manuel (checklist) | 15–20 min | Non |

**Total exécution active** : de l'ordre de 3h à 3h30 (cohérent avec le
« 2h30 à 3h30 » de l'étude d'industrialisation, la Phase 6 — Race — n'étant
apparue qu'après cette étude, début août). Le **délai calendaire réel** peut
s'étaler sur plusieurs jours si le royaume client répond lentement aux
dépendances des Phases 2, 5 et 7 — c'est structurel, pas un problème d'outillage
interne (voir Annexe B).

### 1.4 Isolé vs partagé — le principe qui gouverne tout le reste

| | Isolé par royaume | Partagé entre toutes les instances |
|---|---|---|
| **DONNÉES** | Projet Firebase dédié (`kd-XX-manager`), base Firestore **nommée** `kdmanagerdb`, clé service-account dédiée, secrets Discord dédiés, bucket Race dédié (`${PROJECT_ID}-kvk-race`) | Rien — aucune collection Firestore cross-royaume |
| **CODE** | Rien — un seul repo, une seule branche `main` | Le code applicatif entier : `src/`, `functions/`, `firestore.rules`, les locales i18n |

**Conséquence directe, et cause de la majorité des pièges de ce runbook** :
toute évolution de code (une nouvelle fonction, un correctif, un nouveau rôle)
touche **potentiellement toutes les instances** au prochain déploiement sur
chacune. `firebase deploy --only functions` déploie **tout** le dossier
`functions/`, y compris des fonctions qui n'ont de sens que pour 2997
(`scheduledSync`, `syncData`) — c'est la source directe de l'incident détaillé
en Annexe A. Ce runbook part de ce fait, il ne le corrige pas.

---

## 2. Runbook phase par phase

### Phase 1 — Infra Firebase

**Objectif.** Un projet Firebase isolé, avec sa base Firestore nommée, prêt à
recevoir Hosting/Functions.

**Préconditions.** Compte GCP/Firebase avec facturation active ; nom de code du
royaume choisi (convention observée : `kd-<numéro>-manager`, ex. `kd-41-manager`
pour KD 3341).

**Étapes** (aujourd'hui très majoritairement manuel — console, voir Annexe B
pour ce qui est automatisable) :

1. Console Firebase → *Ajouter un projet* → nom `kd-<numéro>-manager` → activer
   le plan **Blaze** (nécessaire pour Cloud Functions).
2. Firestore → *Créer une base de données* → choisir **« Base nommée »** et la
   nommer **exactement `kdmanagerdb`** — pas `(default)`.

   > **⚠️ PIÈGE — le nom de base n'est pas cosmétique.** Tout le code (client
   > SDK, scripts, Cloud Functions) cible explicitement `kdmanagerdb`
   > (`getFirestore(app, 'kdmanagerdb')`). `firebase.pilot.json` déclare
   > uniquement cette base dans sa section `firestore`. Créer une base
   > `(default)` à la place laisse toute l'app pointer dans le vide sans
   > erreur explicite au démarrage — le symptôme est un écran vide/en
   > chargement perpétuel, pas un message d'erreur clair.

3. Hosting → activer (aucune configuration supplémentaire à ce stade, le
   contenu vient au déploiement, Phase 2).
4. **Ne pas activer Firebase Storage.**

   > **⚠️ PIÈGE — Storage n'existe pas dans ce produit.** Le fichier
   > `storage.rules` du repo est explicitement **dormant** (absent de
   > `firebase.json`, commenté « Firebase Storage n'est pas activé sur le
   > projet `kd-97-manager` » — vérifié 2026-07-22, aucune occurrence de
   > `getStorage`/`firebase/storage` côté client). Le seul stockage de
   > fichiers du produit est un **bucket GCS brut** dédié à la Race
   > (`${PROJECT_ID}-kvk-race`), provisionné séparément en Phase 6, protégé
   > par IAM/CORS — **pas** par le SDK Firebase Storage. Activer Storage à ce
   > stade ne sert à rien et peut faire échouer un futur déploiement global
   > si `storage.rules` était rebranché par erreur dans `firebase.json`.

5. Générer la clé service-account du **nouveau** projet : Console → Paramètres
   du projet → Comptes de service → *Générer une nouvelle clé privée*. La
   déposer en local sous un nom déjà couvert par `.gitignore`
   (`functions/kd-<projet>.json`, patterns `functions/kd-*-manager.json` /
   `functions/*-firebase-adminsdk-*.json` / `*serviceAccount*.json`).

   > **⚠️ PIÈGE LE PLUS GRAVE DU RUNBOOK, À ÉVITER DÈS CETTE ÉTAPE.** Ne
   > **jamais** laisser une clé service-account **de 2997**
   > (`functions/service-account.json`) traîner dans le dossier `functions/`
   > au moment d'un déploiement destiné à une instance client — elle part
   > avec le bundle de Functions et reste un secret-au-repos actif sur
   > l'instance client (voir Annexe A, follow-up sécurité non traité à ce
   > jour). Chaque instance doit avoir **sa propre** clé, et les clés des
   > autres projets doivent être absentes du dossier au moment du build/deploy.

6. `.firebaserc` : ajouter un alias pour le nouveau projet. `default` **reste
   `kd-97-manager`** — garde-fou : un déploiement lancé sans `--project`
   explicite retombe sur 2997, jamais sur un projet client par accident.

   ```json
   {
     "projects": {
       "default": "kd-97-manager",
       "pilot": "kd-41-manager"
     }
   }
   ```

7. `firebase.<royaume>.json` (ex. `firebase.pilot.json`) : copier
   `firebase.json`, adapter uniquement la section `firestore` — **une seule
   entrée**, base `kdmanagerdb` (pas de `(default)` pour une instance qui n'a
   que la base nommée) :

   ```json
   {
     "firestore": [
       { "database": "kdmanagerdb", "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
     ],
     "hosting": { "...": "identique à firebase.json" },
     "functions": [ "...": "identique à firebase.json" ]
   }
   ```

**Vérification.** `firebase projects:list` montre le nouveau projet ; la base
`kdmanagerdb` apparaît dans Firestore → Bases de données (console).

---

### Phase 2 — Marque blanche

**Objectif.** L'app affiche l'identité du nouveau royaume — jamais 2997 — sans
toucher au code partagé.

**Fichiers touchés.** `.env.<royaume>` (ex. `.env.pilot`, racine, **jamais
commité**), `functions/.env.<project-id>` (secrets Functions, jamais commité),
`public/logo-<royaume>.<ext>` (committé — pas un secret).

**Contenu type** (`.env.pilot`, calqué sur `.env.example`) :

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=kd-41-manager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kd-41-manager
VITE_FIREBASE_STORAGE_BUCKET=kd-41-manager.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_APP_NAME=Kingdom Manager
VITE_KINGDOM_NAME=KD 3341
VITE_KINGDOM_NUMBER=3341
VITE_LOGO_URL=/logo-3341.jpg
# Favicon et avatar par défaut suivent VITE_LOGO_URL — pas besoin de les
# redéfinir sauf cas particulier (VITE_FAVICON_URL / VITE_DEFAULT_AVATAR_URL).
VITE_PUBLIC_URL=https://kd-41-manager.web.app

# Activation de modules (F-023 / BR-015) — décision du Roi client à faire
# confirmer explicitement AVANT le déploiement, pas une valeur devinée.
VITE_MODULE_BANK=false
VITE_MODULE_TROPHIES=false
# VITE_MODULE_DEADWEIGHT=false   (laisser activé si une doctrine deadweight existe)
```

**Build et déploiement dédiés** :

```bash
npm run build:pilot      # vite build --mode pilot -> lit .env.pilot
firebase deploy --only hosting --config firebase.pilot.json --project pilot
```

**Vérification locale avant déploiement** (recommandé) :

```bash
npm run dev:pilot        # vite --mode pilot --port 5175
```

> **⚠️ PIÈGE — les chaînes en dur passent inaperçues jusqu'au déploiement.**
> Les locales (`src/locales/*/translation.json`) sont **partagées** entre
> toutes les instances (bundlées au build, pas de `public/locales` chargé au
> runtime — voir CLAUDE.md). Toute mention du numéro/nom de royaume dans une
> chaîne i18n doit passer par l'interpolation `{{kingdom}}` alimentée par
> `BRANDING.kingdomNumber`, **jamais** un numéro codé en dur. Un cas réel :
> `src/pages/DashboardPage.jsx:137` portait `"Kingdom 2997"` en dur — trouvé
> et corrigé le 2026-07-27 avant que le pattern d'interpolation ne soit
> généralisé aux 6 clés du module Race (`kvk_hub.domain_internal`,
> `kvk_race.dkp_hint`, `goals.footnote`, etc. — commit `51faec1`). **Grep
> systématique du numéro de royaume sortant (`2997`) dans `src/locales/`
> après toute modification de copie**, avant de considérer la marque blanche
> complète sur une nouvelle instance.

> **⚠️ PIÈGE — l'activation de modules est une décision produit, pas un
> défaut.** Banque/Trophées/Deadweight doivent être explicitement confirmés
> par le Roi client (BR-015) — ne pas laisser les valeurs par défaut
> (« activé ») sans lui avoir posé la question. À l'inverse, **KvK
> Race/Performance/Progressions restent FIXES dans tous les cas** — même sans
> scan de course déposé, l'onglet reste visible et affiche un état vide,
> jamais masqué (décision Roi, `Etude_Activation_Modules.md`).

**Vérification.** En local (`dev:pilot`), titre d'onglet, logo, favicon et
toutes les pages affichent le nouveau royaume — aucune trace de « 2997 » ou
« Unitas ».

---

### Phase 3 — Règles Firestore

**Objectif.** Les Security Rules de production (fichier `firestore.rules`,
**code partagé**, identique sur toutes les instances) sont posées sur les deux
bases potentielles du nouveau projet.

**Commande canonique** :

```bash
node scripts/deploy-rules.cjs pilot
# ou, avec l'alias npm existant :
npm run deploy-rules:pilot
```

Ce que fait le script (`scripts/deploy-rules.cjs`) : il lit `firestore.rules`,
crée un `ruleset` via l'API REST `firebaserules.googleapis.com`, puis tente de
pousser ce ruleset sur **les deux** releases `(default)` et
`.../kdmanagerdb`. Un `404` sur `(default)` est attendu et ignoré pour une
instance qui n'a que `kdmanagerdb` (cas de toute instance client) — la sortie
du script le confirme explicitement (`ℹ️ (default) absent sur ce projet — ignoré`).

> **⚠️ PIÈGE CRITIQUE (vécu, a cassé F-025 en prod pilote, 2026-07-28) —
> `firebase deploy --only firestore:rules` ne suffit PAS.** Cette commande
> standard répond « Deploy complete » **mais ne met pas à jour la base
> nommée `kdmanagerdb`** — bug du CLI standard sur les bases non-`(default)`.
> Symptôme vécu : le champ `accounts` de `user_profiles` (multi-comptes,
> F-025) était silencieusement rejeté côté pilote alors que le déploiement
> affichait un succès complet — les comptes réclamés disparaissaient au
> rechargement de la page, sans erreur visible côté client. **Ne jamais
> utiliser `firebase deploy --only firestore:rules` sur une instance dont la
> base s'appelle `kdmanagerdb`** — toujours `node scripts/deploy-rules.cjs
> <alias>`.
>
> *Note historique* : un script antérieur, `scripts/deploy-rules-pilot.mjs`,
> résolvait spécifiquement ce même bug pour `kd-41-manager` (nécessite la clé
> `functions/kd-41-manager.json` en local) avant que `deploy-rules.cjs` ne
> soit généralisé par projet (commit *« deploy-rules.cjs paramétré par projet
> (prod/pilot) — corrige le trou du pilote »*, 2026-08-18). `deploy-rules.cjs`
> est désormais la référence pour toute instance, prod comme client ;
> `deploy-rules-pilot.mjs` reste dans le repo par historique, ce n'est plus la
> voie recommandée.

**Vérification.** Lire le `rulesetName` effectivement déployé via l'API
`firebaserules` et grep une règle attendue récente (ex. `accounts`), ou —
plus simple — exercer un vrai chemin d'écriture gaté par les règles (ex.
réclamer un compte) et confirmer qu'il persiste après rechargement.

---

### Phase 4 — Functions

**Objectif.** Déployer **uniquement** les Cloud Functions pertinentes pour une
instance client — jamais la synchro 2997.

**À déployer, utile pour un royaume client :**
- `digestRaceScan` (trigger Storage sur `${PROJECT_ID}-kvk-race`, moteur de la
  Race, F-018/F-019/F-020) ;
- `getRaceScanUploadUrl` (URL signée d'upload, BR-014) ;
- Les callables Discord (`discordLogin`, `discordCallback`, synchro de rôles)
  — **si** Discord est retenu pour ce royaume (voir Phase 7).

**À ne JAMAIS laisser actif sur une instance client :**
- `scheduledSync` (cron quotidien 05:00 UTC, lit le Google Sheet **et** le
  scan ProKingdoms **de 2997**) ;
- `syncData` (même pipeline, déclenché en HTTP) ;
- toute clé `functions/service-account.json` **de 2997** embarquée dans le
  bundle déployé (voir Phase 1, étape 5 et Annexe A).

**Commande** :

```bash
$env:FUNCTIONS_DISCOVERY_TIMEOUT=180   # PowerShell — contournement, voir piège ci-dessous
firebase deploy --only functions --config firebase.pilot.json --project pilot
```

> **⚠️ PIÈGE — timeout d'analyse de la CLI.** Le déploiement peut échouer avec
> `Cannot determine backend specification. Timeout after 10000` pendant
> l'analyse du code des Functions. Contournement vécu :
> `FUNCTIONS_DISCOVERY_TIMEOUT=120` à `180` (secondes) selon la charge de la
> machine.

> **⚠️ PIÈGE LE PLUS DANGEREUX DE TOUT LE RUNBOOK — un `firebase deploy
> --only functions` déploie TOUT `functions/`, sans sélection fine.** Ce
> projet n'a qu'une seule codebase (`default`) — il n'y a pas de mécanisme
> pour déployer seulement `digestRaceScan` sans embarquer aussi
> `scheduledSync`/`syncData`, qui vivent dans le **même** `functions/index.js`
> partagé. Conséquence directe : **toute Functions redeploy sur une instance
> client RECRÉE `scheduledSync` et `syncData` s'ils avaient été supprimés
> précédemment** — c'est arrivé deux fois sur le pilote 41 (2026-08-07, puis
> à nouveau le 2026-08-13 lors du déploiement du rôle Admin). Voir Annexe A
> pour la procédure de nettoyage obligatoire **après chaque** déploiement
> Functions sur une instance client, sans exception.

**Vérification.** `firebase functions:list --project pilot` (ou console) —
confirmer la liste exacte des fonctions actives, **puis immédiatement**
exécuter la commande de suppression du cron listée en Annexe A, avant de
passer à la suite.

---

### Phase 5 — Ingestion des données

**Objectif.** Peupler `static_data/players` (et `static_data/kvk`, référence
des objectifs) du nouveau royaume, depuis un scan fourni par le client — ou par
le fondateur en amorçage (`Etude_Commercialisation_SaaS.md` §5bis).

**Script.** `scripts/ingest-soc-scan.mjs`, pour un scan ProKingdoms **SoC**
(Scan of Champions — export KvK complet, structure min/max/diff, onglets
`Basic Data`/`Full Data`). Pour tout autre fournisseur (RokStats CSV,
RokTracker xlsx, HeroScroll…), il n'existe **pas** d'adaptateur aujourd'hui —
c'est un chantier de code par fournisseur, voir Annexe B et
`Spec_Format_Interne_Adaptateurs_Scan.md`.

**Dry-run (défaut, n'écrit rien)** :

```bash
node scripts/ingest-soc-scan.mjs --file "scan.xlsx" --kingdom 3341 --roster detailed --top 300
```

Décisions à faire trancher explicitement par le Roi client **avant** le
premier `--write` :

| Option | Effet | Décision retenue sur le pilote 3341 |
|---|---|---|
| `--roster` | `detailed` (seuls les gouverneurs présents en `Full Data`, stats complètes) vs `all`/`threshold` | `detailed` — évite les hauts-tier sans stats de combat (95 comptes puissants filtrés sur 3341, non retenus) |
| `--top N` | Plafonne le roster aux N plus puissants | `300` (Top 300 du royaume) |
| `--kvk-base` | Fige `static_data/kvk.initialPower = max_power` (pic anti-abus, ancré fin de pré-KvK) — **référence des objectifs** | À lancer **une seule fois**, sur le scan de référence choisi par le Roi |
| `--history` | Accumule un point `{date, power, kp}` dans `static_data/history` (courbe PxKP du Dashboard) | À passer sur **chaque** scan (base + progression) |

> **⚠️ PIÈGE — `--kvk-base` déplace l'ancre si on le relance.** Ne jamais
> relancer `--kvk-base` sur un scan ultérieur sans discussion explicite avec
> le Roi — cela re-fige la référence des objectifs sur une date plus tardive,
> ce qui change silencieusement tous les objectifs déjà communiqués aux
> joueurs. Un scan de progression utilise `--kvk-progress`, jamais
> `--kvk-base`.

> **⚠️ PIÈGE (mineur, hygiène UX) — oublier `--history` laisse le Dashboard
> cassé.** Sans `--history` sur chaque scan, `static_data/history` reste vide
> et le bloc « Puissance Totale » du Dashboard reste indéfiniment sur un état
> vide (corrigé pour ne plus tourner en spinner infini, mais reste vide tant
> que la courbe n'est pas alimentée).

**Écriture réelle** (scan de base) :

```bash
node scripts/ingest-soc-scan.mjs --file "scan.xlsx" --kingdom 3341 --roster detailed --top 300 \
  --kvk-base --history --credentials functions/kd-41-manager.json --write
```

**Scans de progression suivants** (sans re-figer la référence) :

```bash
node scripts/ingest-soc-scan.mjs --file "scan_progress.xlsx" --kingdom 3341 --roster detailed --top 300 \
  --kvk-progress --history --credentials functions/kd-41-manager.json --write
```

> **⚠️ PIÈGE (garde-fou, pas un bug) — les clés locales de 2997 sont
> refusées.** Les clés `functions/*.json` déjà présentes en local sont celles
> de 2997 ; le script les **rejette explicitement** pour tout `--project`
> différent (`REFUSED: credentials are for project "kd-97-manager", not
> "kd-41-manager"`). Il faut la clé SA générée à la Phase 1 (étape 5), propre
> au nouveau projet.

**Backup et revert.** Le script sauvegarde automatiquement chaque doc
(`static_data/players`/`kvk`/`history`) **avant** de l'écraser
(`scratch/pilot-ingest/backup_<doc>_<project>_<timestamp>.json`) :

```bash
node scripts/ingest-soc-scan.mjs --restore "scratch/pilot-ingest/backup_players_kd-41-manager_....json" \
  --credentials functions/kd-41-manager.json
```

Si aucun document n'existait avant la toute première écriture, le « revert »
consiste à supprimer le doc `static_data/players` en console — il n'y a rien à
restaurer.

**Vérification.** Lecture directe des docs Firestore, ou un script de contrôle
ad hoc (motif observé : `scratch/verify-pilot-players.mjs` sur le pilote — non
généralisé, voir Suites) ; puis vérifier l'hydratation UI (Leaderboard,
totaux du Dashboard).

**Identité de la campagne en cours** (ajout 2026-08-23, REX 2293 §4bis.10).
Le nom et les dates affichés sur la carte de campagne (hub KvK, onglet
Progressions) viennent de **`kvk_config/current`** (`name`, `startDate`,
`endDate`) — doc saisi par le Roi dans `/admin`. Les constantes
`DATA_CONFIG.KVK` de `src/config/data-mapping.js` ne sont qu'un **repli**, et
elles portent les valeurs du 2997 : si le doc n'est pas rempli, l'instance
cliente affiche la fenêtre de campagne du 2997. Le même doc préremplit le
formulaire d'archivage — donc une campagne clôturée sans lui entre dans
`kvk_history` avec un titre et des dates faux, définitivement (archive
create-only). **À vérifier avant la Phase 8.**

**Timeline du royaume — vide par construction sur une instance neuve.**
`kvk_history` est à 0 doc : l'onglet Progressions n'affiche que la campagne en
cours. C'est normal, mais ça donne une page qui a l'air cassée en démo. Deux
options à trancher **avec le Roi client** : assumer (l'historique se
construira à la première clôture) ou **backfiller ses saisons passées** — un
seul export de fin de saison suffit par campagne (`maxkill_points − minkill_points`,
`maxdead − mindead` ; précédent : `scripts/import-kvk-history.js` pour les 3
saisons de 2997). `goalPercent` reste `null` faute des objectifs de l'époque
(affiché « — », jamais `0`). **Ne jamais fabriquer de saisons fictives sur une
instance cliente.**

---

### Phase 6 — Pipeline Race

**Objectif.** Activer le module Course de coalition (F-018/F-019/F-020) —
optionnel (module fixe une fois activé, mais un royaume peut ne pas participer
à une course multi-royaumes).

**Préconditions.** Phase 4 faite (`digestRaceScan` déployée).

**Création du bucket GCS** (**pas** Firebase Storage — un bucket brut, nommé
`${PROJECT_ID}-kvk-race`, dérivé automatiquement du `GCLOUD_PROJECT` runtime
par `functions/kvkRace/digest.js`) :

```bash
gcloud storage buckets create gs://kd-41-manager-kvk-race \
  --location=us-central1 --uniform-bucket-level-access --public-access-prevention=enforced
```

> **Note de fidélité** : les paramètres exacts observés en production
> (« us-central1, uniform, PAP ») viennent de la mémoire opérationnelle, pas
> d'une commande capturée littéralement au moment de l'exécution — la commande
> ci-dessus est **reconstituée** pour produire ce même résultat, pas une copie
> vérifiée. À valider/capturer au mot près au prochain onboarding.

**CORS** (nécessaire pour l'upload signé PUT depuis le navigateur) :

```bash
gcloud storage buckets update gs://kd-41-manager-kvk-race --cors-file=cors.json
```
```json
[{"origin": ["https://kd-41-manager.web.app"], "method": ["PUT"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]
```

**Service agents Eventarc/GCS.** Le trigger Storage de `digestRaceScan`
(`onObjectFinalized`) requiert que les service agents GCS/Eventarc du projet
aient le rôle `pubsub.publisher` — normalement posé automatiquement au premier
déploiement d'une fonction Storage-triggered sur ce bucket. À vérifier
manuellement (IAM du projet) si le trigger reste silencieux après un dépôt de
scan.

**Créer la campagne de course** (`kvk_race/{campaignId}`, via l'UI d'admin une
fois l'app en ligne — pas de script dédié) : nom de campagne, camps, et
**`our_camp`** = le camp du royaume client.

> **⚠️ PIÈGE — `our_camp` mal réglé.** Sur le pilote, `our_camp` a d'abord été
> posé sur le mauvais camp (Dardania au lieu d'Aeolia, où siège réellement
> 3341) — à vérifier explicitement avant le premier scan déposé, l'erreur ne
> se révèle que visuellement (le royaume du client n'apparaît pas dans « son »
> camp sur le dashboard).

> **⚠️ PIÈGE — libellés de camps ↔ numéros de camps (2293, 2026-08-23).** Le
> Roi nomme les camps dans l'ordre où il les voit sur la carte du fournisseur ;
> l'export les numérote autrement. Sur Arcelia, Fire (1) et Earth (2) tombaient
> juste mais **Wind et Water étaient intervertis** → `our_camp` posé sur un camp
> quasi vide et duel héros inexploitable. **La seule vérification qui tranche :
> quel `campid` contient le royaume épinglé ?** (compter les gouverneurs par
> `campid` dans le scan et comparer aux royaumes de la carte). À faire **avant**
> d'annoncer la démo — le libellé saisi ne prouve rien.

> **⚠️ PIÈGE — changer le duel ne suffit pas.** `hero_duel` est appliqué **au
> moment de la digestion** : le duel et l'écart sont figés dans
> `kvk_race/{cid}/scans/*` et `latestDuel`. Après correction de la config, il
> faut **rejouer les scans** (`recomputeRaceCampaign` si les Functions sont
> déployées, sinon rejeu local depuis les `derived/` du bucket).

> **⚠️ PIÈGE — le seed local est un cul-de-sac s'il saute le bucket.** Seeder
> `kvk_race/{cid}` directement (moteur `buildAll` en local, utile pour une démo
> sans Functions) n'écrit **aucun** fichier `derived/` : tout recompute ultérieur
> ne trouve rien à rejouer, et l'upload in-app reste impossible. Seeder **sous
> l'id de campagne définitif du client** (pas un id de démo) et déposer les
> `kvk_race/{cid}/derived/gov_values_NNN.json` dans le bucket. Sinon : migration
> des agrégats + suppression de la campagne fantôme par script Admin SDK
> (`allow delete: if false` côté règles — aucun geste possible depuis l'UI).

> **⚠️ PIÈGE — un scan mono-royaume ne peuple pas la course.** La Race a
> besoin d'un scan **multi-camps** (toute la carte KvK, 32+ royaumes). Le scan
> filtré « royaume seul » utile pour l'ingestion Phase 5 (option implicite du
> fournisseur de scan) ne peuple qu'un seul camp côté course — la Course
> restera visible mais vide pour les autres camps tant qu'un scan complet
> n'est pas déposé.

**Vérification.** Déposer un scan via le panneau de dépôt (UI, King/Officer)
→ `digestRaceScan` s'exécute (logs Cloud Functions) → `kvk_race/{campaignId}`
se peuple → le dashboard Course affiche les 4 camps et le duel.

---

### Phase 7 — Rôles & Admin

**Objectif.** Donner l'accès au Roi client et/ou à l'opérateur ; activer la
synchro Discord si ce royaume la retient.

**Attribution des rôles — deux mécanismes, non exclusifs** (env
`functions/.env.<project-id>`, posés **avant** le déploiement Functions, voir
Phase 4) :

```bash
# Épinglage Roi legacy — le user est reconnu King quoi que dise Discord
ROLE_KING_USER_IDS=<id_discord_du_roi>

# Rôle Admin/opérateur (F-034 / BR-023, recommandé pour l'onboarding fournisseur)
# — au-dessus du Roi, hérite de TOUS ses pouvoirs, distinct par attribution
# (env, pas un rôle de jeu Discord) et par intention (opérer sans être le Roi).
ROLE_ADMIN_USER_IDS=<id_discord_de_l_operateur>
```

Sur le pilote (décision du Roi, 2026-08-13) : `ROLE_KING_USER_IDS` a été **vidé**
et seul `ROLE_ADMIN_USER_IDS` (l'opérateur) est conservé — séparation nette
entre l'opérateur fournisseur et le Roi in-game.

> **⚠️ PIÈGE — ces variables sont INERTES tant que les Functions ne sont pas
> redéployées avec elles.** Poser l'env seule ne suffit pas
> (`functions/discordAuth.js` la lit à l'exécution, pas au build) — il faut
> un `firebase deploy --only functions`, ce qui **retombe directement sur le
> piège de la Phase 4** : re-supprimer `scheduledSync` après ce déploiement,
> sans exception, même pour un simple changement d'attribution de rôle.

**Bot Discord** (uniquement si Discord est retenu pour ce royaume — sinon
sauter cette section entière, le royaume tourne sur l'auth Google) :

1. Portail développeur Discord → nouvelle application OAuth2 **dédiée à ce
   royaume** (pas d'API de création d'application — geste manuel, ~30–45 min,
   le poste de friction le plus lourd du runbook, voir Annexe B).
2. Poser les 7 secrets (`firebase functions:secrets:set <NOM> --project pilot`
   ou console) : `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_KING`,
   `DISCORD_ROLE_OFFICER`, `DISCORD_ROLE_WARRIOR`.
3. `DISCORD_REDIRECT_URI` — dérivée du `PROJECT_ID`
   (`functions/discordAuth.js`), à poser dans le portail Discord **et** dans
   les env Functions du projet.
4. OAuth2 URL Generator (scope **`bot`**) → générer un lien d'invitation → le
   Roi/un admin du serveur client invite le bot sur **son** serveur —
   **dépendance externe**, hors de tout contrôle interne, source de délai
   calendaire plutôt que de charge de travail.
5. Un premier login Discord d'un membre déclenche `syncUserRolesFromDiscord`,
   qui écrit `roles/{uid}` selon le mapping rôle Discord → rôle app
   (King/Officer/Warrior, priorité BR-003).

**Vérification.** Le Roi/opérateur se connecte via Discord → badge de rôle
correct dans `/profile` (Admin en rose, King en doré…) ; accès `/admin`
fonctionnel.

---

### Phase 8 — Recette / go-live

Checklist avant d'annoncer l'instance au royaume client :

- [ ] **Branding** : logo/favicon/nom affichés partout ; grep `2997`/`Unitas`
      dans les pages rendues → aucun résultat.
- [ ] **Hydratation UI** : Dashboard (totaux, courbe PxKP), Leaderboard
      peuplés depuis l'ingestion Phase 5.
- [ ] **Modules** : Banque/Trophées/Deadweight dans l'état confirmé par le Roi
      (`.env.<royaume>`).
- [ ] **Objectifs KvK** : `static_data/kvk.initialPower` posé (via
      `--kvk-base`), le panneau Objectifs affiche des cibles cohérentes.
- [ ] **Course** (si activée) : 4 camps visibles, `our_camp` correct, duel
      affiché.
- [ ] **Course — une seule campagne** dans `kvk_race`, et c'est celle du
      client (pas la campagne de seed/démo) ; ses `derived/` sont dans le
      bucket (sinon aucun recompute possible).
- [ ] **Course — camp vérifié contre le scan**, pas contre le libellé saisi :
      le `campid` qui contient le royaume épinglé est bien celui marqué
      « nous », et `hero_duel` commence par ce camp (sinon l'écart s'affiche
      à l'envers).
- [ ] **Identité de campagne** : le nom et les dates affichés sont ceux de
      `kvk_config/current`, pas la fenêtre du 2997 (11/06 → 07/07 = signal de
      repli non renseigné).
- [ ] **Timeline** : `kvk_history` backfillé, ou vide **assumé et annoncé** au
      Roi client.
- [ ] **SSO** : connexion Discord (ou Google en fallback) fonctionnelle, rôle
      correctement affecté.
- [ ] **`firebase functions:list --project <alias>` ne contient PAS
      `scheduledSync`** — dernier geste avant d'annoncer le go-live, à
      re-vérifier même si déjà fait en Phase 4 : un redeploy tardif (Phase 7)
      a pu le recréer entre-temps.
- [ ] **Règles Firestore vérifiées sur `kdmanagerdb` spécifiquement** (pas
      seulement « deploy complete » — voir vérification Phase 3).

---

## Annexe A — Registre des pièges cross-tenant

C'est le sujet le plus dangereux de tout le runbook : **une seule base de
code partagée** signifie qu'un geste anodin sur une instance peut réintroduire
un comportement pensé pour 2997 sur une instance client, avec un effet radical
(écrasement de données) et silencieux (aucune erreur visible côté UI).

### L'incident fondateur — 2026-08-07

Le déploiement des Cloud Functions sur le pilote (pour activer la Race) a
embarqué, sans intention, `scheduledSync` (cron 05:00 UTC) + `syncData`
(HTTP) + la clé `functions/service-account.json` **de 2997**. `runFullSync`
s'est authentifié avec cette clé, a lu le Google Sheet **de 2997**, et le cron
de 05:00 UTC a **écrasé tout `static_data` du pilote** (players, kvk, stats,
avatars, bank) **par les données de 2997**. Symptôme observé : des noms de
joueurs 2997 (Pisontije, Guineapig…) sont apparus dans l'onglet Objectifs
« Top du royaume » du pilote. La collection `kvk_race` (Course) est restée
intacte — elle n'est jamais touchée par `runFullSync`.

**Corrections posées ce jour-là** :
1. **Le garde-fou** dans `functions/index.js` (ligne ~496) :

   ```js
   const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "kd-97-manager";
   if (PROJECT_ID !== "kd-97-manager") {
       logger.warn(`runFullSync ignoré sur le projet ${PROJECT_ID} (synchro réservée à kd-97-manager, multi-instance).`);
       return { serviceAccountEmail: "skipped", results: { skipped: `non-2997 project (${PROJECT_ID})` } };
   }
   ```

2. Restauration des données 3341 (re-run `ingest-soc-scan --kvk-base` +
   réécriture propre de `static_data/history`).
3. Suppression effective de `scheduledSync` et `syncData` sur le pilote :
   ```bash
   firebase functions:delete scheduledSync --project pilot --region us-central1 --force
   firebase functions:delete syncData --project pilot --region us-central1 --force
   ```

### La rechute résiduelle — découverte et nettoyée le 2026-08-18, 11 jours après

La restauration du 07/08 n'avait couvert que trois documents
(`players`/`kvk`/`history`). **Six autres documents `static_data`** du pilote
sont restés contaminés par des données 2997, **pendant 11 jours**, sans que
personne ne le remarque immédiatement : `kvk_filler` (23 entrées), `deadweight`
(19), `bank` (24 semaines + total), `trophies` (12 semaines), `avatars` (28),
`stats` (`totalPowerCH25`) — tous datés du cron `2026-08-07T05:00`. Détecté
quand le Roi a ouvert l'onglet Performance → Fillers et reconnu des noms 2997
(Guineapig, Pisontije, « Bank97 »…).

**Nettoyage** (2026-08-18) : vérification que 100 % des IDs présents dans ces
6 documents étaient étrangers au roster 3341 **et** croisement avec le roster
2997 pour confirmer l'origine (`kvk_filler`/`deadweight` : 100 % étrangers ;
`kvk` : 99 entrées hors-roster 3341 mais **0** dans le roster 2997 → identifiées
comme de vrais joueurs 3341 bas-tier, laissées intactes). Les 6 documents
contaminés ont été vidés au bon type de champ (REST PATCH, token owner), avec
un champ `clearedReason` posé pour traçabilité. Le front est resté défensif
pendant l'incident (`bank?.total || {}`, `?.weekly || []`, repli
`stats.power`) — pas de plantage, juste des données fausses affichées comme
vraies.

**Cause de la rechute — le vrai piège opérationnel** : un redéploiement des
Functions du pilote (2026-08-13, pour activer le rôle Admin) a **recréé**
`scheduledSync` + `syncData`, alors que le Roi les avait explicitement
supprimés en août. Le garde-fou côté code a tenu (aucune nouvelle exécution
n'a re-clobberé les données après le 13/08 — le résidu détecté datait bien du
07/08, pas d'une nouvelle exécution), mais **la contamination résiduelle du
premier incident est restée invisible pendant 11 jours** faute d'un audit
systématique après restauration.

### Règle d'or

> **Les données d'une instance client viennent UNIQUEMENT de son ingestion
> dédiée** (Phase 5). Le garde-fou `runFullSync` (no-op si `GCLOUD_PROJECT !=
> kd-97-manager`) est **le filet**, pas la solution — il empêche `runFullSync`
> de *faire* des dégâts s'il tourne, il n'empêche pas `scheduledSync` d'exister
> et d'être appelé.

**Procédure obligatoire, sans exception, après TOUT redeploy de Functions sur
une instance client** (Phase 4 comme Phase 7, aussi pour un simple changement
d'env comme `ROLE_ADMIN_USER_IDS`) :

```bash
firebase functions:delete scheduledSync --project <alias> --region us-central1 --force
```

Le cron est **le seul vecteur qui tourne sans action humaine** — un `syncData`
recréé mais jamais appelé manuellement ne fait aucun dégât par lui-même (le
garde-fou renvoie `{success:true, skipped}` sur toute instance non-2997) ;
`syncData` a d'ailleurs été **laissé** délibérément sur le pilote (le front
`DataContext.triggerSync` le référence — le supprimer casserait le bouton de
sync côté UI pour aucun bénéfice, le garde-fou couvrant déjà le risque).
`scheduledSync`, lui, s'exécute chaque jour sans que personne n'y pense.

### Follow-up sécurité ouvert, non traité à ce jour

La clé service-account **de 2997** (`functions/service-account.json`) reste
**bundlée** dans les Functions déployées du pilote (`syncData`,
`digestRaceScan`) — un secret-au-repos sur une instance client, jamais utilisé
grâce au garde-fou, mais présent. À corriger : redéployer le pilote **sans**
cette clé dans le dossier `functions/` au moment du build (Phase 1, piège de
l'étape 5), ou migrer vers **Secret Manager** plutôt qu'un fichier bundlé.
Non fait à ce jour — c'est une dette de sécurité ouverte, à traiter avant tout
troisième onboarding.

---

## Annexe B — Candidats à l'automatisation (voie C)

Reprend et complète `Etude_Industrialisation_Onboarding.md` §3/§4 — verdict
déjà rendu : **voie C** (automatiser la voie A par petits incréments,
**ne pas** engager le multi-tenant tant que la demande et le paiement ne sont
pas prouvés sur plusieurs royaumes, A-032). Cette annexe reclasse chaque étape
concrète du runbook §2 selon sa scriptabilité réelle.

| Étape du runbook | Scriptable one-shot ? | Nécessite du multi-tenant ? | Commentaire |
|---|---|---|---|
| Création du projet Firebase + facturation (Phase 1.1) | Non — geste humain obligatoire au moins au bootstrap (rattacher une nouvelle identité de facturation). **Ensuite**, l'API Cloud Billing permet de rattacher un projet à un compte déjà vérifié, scriptable | Non | A-026 (quotas de création de projets) non vérifiée — à valider avant de compter sur un rythme soutenu |
| Création de la base Firestore nommée `kdmanagerdb` (Phase 1.2) | **Oui** — Firebase Management API / `gcloud firestore databases create` | Non | Aujourd'hui manuel faute de script écrit, pas faute de capacité API |
| Génération de la clé service-account (Phase 1.5) | **Oui** — API IAM (`projects.serviceAccounts.keys.create`) depuis un compte orchestrateur | Non | Manuel aujourd'hui uniquement par absence d'ADC/gcloud configuré dans l'environnement de dev — dette d'outillage, pas limite Firebase |
| `.firebaserc` / `firebase.<royaume>.json` (Phase 1.6-1.7) | **Oui** — templating trivial depuis un fichier de config royaume (même pattern que `branding.js`) | Non | Effort quasi nul (S) |
| `.env.<royaume>` / `functions/.env.<projet>` (Phase 2) | **Oui pour la structure**, **non pour le contenu** (logo/numéro de royaume = fournis par le client) | Non | Le templating élimine la faute de frappe, pas l'attente du logo |
| Déploiement des règles Firestore (Phase 3) | **Déjà scriptable** — `deploy-rules.cjs` | Non | Fait, à généraliser en template paramétrable par royaume (trivial) |
| Déploiement des Functions (Phase 4) | **Déjà scriptable** (la commande CLI), mais le **nettoyage post-deploy** (suppression du cron) ne l'est pas encore | Non | Candidat direct : un script `functions:deploy:client` qui enchaîne déploiement **puis** suppression automatique de `scheduledSync`/`syncData`, éliminant la classe entière de piège de l'Annexe A |
| Ingestion du scan initial (Phase 5) | **Oui pour ProKingdoms** (`ingest-soc-scan.mjs` existe) ; **non** pour tout autre fournisseur (nouvel adaptateur = code neuf, S à M par source) | Non — indépendant du modèle d'hébergement | Cf. `Spec_Format_Interne_Adaptateurs_Scan.md` §5/§7 |
| Bucket Race + CORS (Phase 6) | **Oui** — quelques commandes `gcloud storage`, templating trivial | Non | Jamais scripté à ce jour, mais sans obstacle connu |
| Création de la campagne de course (Phase 6) | Partiel — passe par l'UI d'admin aujourd'hui, pourrait être un script Admin SDK | Non | Faible priorité, peu fréquent (une fois par saison) |
| **Création de l'app Discord OAuth** (Phase 7) | **Non** — pas d'API publique de création d'application dans le portail développeur Discord | Non directement, mais une **app partagée** avec résolution dynamique d'URI de redirection réduirait ce poste (A-027, non prototypée) | **Irréductible** tant que le modèle « 1 app par royaume » est gardé — le vrai levier n'est pas ici (voir ligne suivante) |
| **Obtention du guild ID / IDs de rôles** (Phase 7) | Non — dépend d'une action du royaume client | Non | Dépendance externe pure, latence calendaire non maîtrisable |
| **Invitation du bot sur le serveur client** (Phase 7) | Non — seul un admin du serveur Discord client peut le faire | Non | Idem |
| Pose des secrets Discord (Phase 7) | **Oui** — `firebase functions:secrets:set` scriptable une fois les valeurs connues | Non | Le blocage est en amont (obtenir les valeurs), pas la pose |
| Recette / checklist go-live (Phase 8) | **Oui** — script de vérification automatisé possible (lecture Firestore + `functions:list` + assertions) | Non | Non écrit à ce jour, candidat simple |

**Lecture** : la quasi-totalité du runbook est **techniquement** scriptable
(colonne 2, majorité « Oui »). Le vrai plafond n'est **pas** l'outillage
interne — ce sont les **trois dépendances externes de la Phase 7** (app
Discord, guild ID/rôles, invitation du bot), seule partie du runbook qui
dépend d'un geste que **seul le royaume client** peut faire, à son rythme. Le
levier le plus direct reste donc, comme conclu par l'étude d'industrialisation
(§5/§7) : **retirer Discord du chemin d'onboarding du tier de base**
(prérequis : fallback in-app pour l'auth et l'attribution des rôles, chantier
**L**, non construit à ce jour) — pas l'automatisation de la Phase 1 à 6, qui
ne fait que réduire un temps déjà secondaire face à la latence externe.

---

## Suites (lacunes process repérées — pas d'ID créé ici)

- Un script de vérification post-ingestion existe en usage ad hoc
  (`scratch/verify-pilot-players.mjs`) mais n'est ni versionné dans
  `scripts/` ni généralisé à un second royaume — candidat à formaliser.
- Les scripts de nettoyage cross-tenant du 2026-08-18
  (`scratch/clean-crosstenant-pilot.mjs` et sa variante `...2.mjs`) sont ad
  hoc et non versionnés dans `scripts/` — s'il faut refaire ce nettoyage sur
  une future instance, il faudra les reconstruire de zéro plutôt que les
  rejouer.
- Aucune procédure documentée pour la base Firestore orpheline `kd3341`
  mentionnée dans la mémoire opérationnelle (créée par erreur pendant le setup
  initial du pilote, jamais nettoyée) — un onboarding suivant pourrait
  reproduire la même erreur de nommage sans un contrôle explicite.
- Pas de checklist « post-redeploy Functions » outillée : aujourd'hui, la
  suppression de `scheduledSync` (Annexe A, règle d'or) repose entièrement sur
  la mémoire humaine de l'opérateur — c'est précisément ce qui a causé la
  rechute du 2026-08-18. Un script unique `functions:deploy:client` qui
  enchaîne déploiement **et** nettoyage supprimerait la classe d'erreur
  entière plutôt que de compter sur la discipline.
- Le follow-up sécurité « clé SA 2997 bundlée dans les Functions du pilote »
  (Annexe A) n'a pas de propriétaire ni d'échéance — à faire trancher par le
  Roi avant un troisième onboarding.
- **Outillage course ad hoc, non versionné** (2026-08-23, démo 2293) : la
  migration d'une campagne de course vers un autre `campaignId`, le rejeu
  local des scans depuis les `derived/` du bucket (équivalent hors-ligne de
  `recomputeRace`, indispensable tant que les Functions ne sont pas déployées)
  et l'inventaire des campagnes d'une instance ont été écrits dans `scratch/`
  pendant la démo. Même statut que les scripts de nettoyage cross-tenant
  ci-dessus : à reconstruire de zéro à la prochaine occurrence s'ils ne sont
  pas formalisés dans `scripts/`.
- **Pas de contrôle automatisé « config course vs scan »** : la cohérence
  entre le camp marqué « nous » et le `campid` qui contient réellement le
  royaume épinglé repose entièrement sur une vérification manuelle (Phase 6).
  C'est exactement la classe d'erreur qui s'est produite deux fois sur deux
  onboardings (pilote 3341 puis Arcelia 2293) — candidat produit **US-050**
  plutôt que discipline d'opérateur.

---

## Sources

Mémoire opérationnelle `pilote-kd3341.md` (source n°1, runbook vécu) ;
`industrialisation-multi-royaumes.md`, `role-admin-operateur.md`,
`commercialisation-tiering.md`, `kdmanager-antigravity-symbiosis.md`.
Docs : `CLAUDE.md`, `docs/project_context.md`,
`Etude_Commercialisation_SaaS.md`, `Etude_Activation_Modules.md`,
`Etude_Industrialisation_Onboarding.md`,
`Spec_Format_Interne_Adaptateurs_Scan.md`, `Assumptions_Log.md`,
`FeatureInventory.md`, `ProductBacklog.md`, `Roadmap.md`, `docs/qa/SSOT.md`.
Code : `scripts/deploy-rules.cjs`, `scripts/deploy-rules-pilot.mjs`,
`scripts/ingest-soc-scan.mjs`, `package.json`, `.firebaserc`,
`firebase.json`, `firebase.pilot.json`, `.env.example`, `.gitignore`,
`functions/index.js` (`runFullSync`, garde-fou ligne ~496),
`functions/discordAuth.js` (`ROLE_ADMIN_USER_IDS`, secrets Discord),
`functions/kvkRace/digest.js` (`RACE_BUCKET`, trigger Storage),
`src/config/branding.js`, `src/config/modules.js`, `storage.rules`
(fichier dormant), `vite.config.js` (plugin `html-branding-meta`).
