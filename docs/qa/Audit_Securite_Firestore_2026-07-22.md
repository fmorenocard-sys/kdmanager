# Audit de sécurité Firestore & Storage — BUG-002

> Date : 2026-07-22 · Portée : `firestore.rules` (bases `(default)` et `kdmanagerdb`), règles Storage,
> et les chemins de confiance côté client (`RoleContext`, `AuthContext`) et Functions (`discordBot`, `discordAuth`).
> État du code audité : `main` au commit `79af810`.

## Résumé

Le modèle de rôles est sain : `roles/{uid}` est en écriture `false` pour tous les clients et n'est
alimenté que par la synchro Discord côté Admin SDK, donc **aucun chemin d'élévation vers King ou
Officer n'a été trouvé**. Les agrégats `kvk_race` sont en écriture Functions uniquement, l'historique
KvK est immuable hors champ `outcome`, et aucun fichier de secret n'est suivi par git.

Les problèmes se concentrent ailleurs : les collections écrivables par l'utilisateur n'imposent
aucune contrainte de champ, ce qui laisse écrire des **clés d'identité** que le reste du système
traite comme vérifiées ; et les règles Storage ne sont ni versionnées ni déployées par le dépôt.

| # | Sévérité | Constat |
|---|---|---|
| H-1 | **Haute** | `user_profiles` accepte n'importe quel champ écrit par son propriétaire, dont `discordId` / `discordUid` / `governorId` |
| H-2 | ~~Haute~~ → **Sans objet** | Aucune règle Storage dans le dépôt — s'avère être l'absence totale de surface Firebase Storage (voir le constat révisé) |
| M-1 | Moyenne | `war_availabilities` : la création n'exige aucun lien de propriété |
| M-2 | Moyenne | `kvk_config` est écrivable par un Officier alors que l'UI est réservée au Roi |
| M-3 | Moyenne | Aucune validation de forme ni de taille sur les collections écrivables |
| B-1 | Basse | `static_data` et `kvk_history` sont lisibles sans authentification |
| B-2 | Basse | `roles/{uid}` est lisible publiquement |
| B-3 | Basse | `isKingOrOfficer()` consomme deux lectures par évaluation |

---

## H-1 — `user_profiles` accepte l'écriture de clés d'identité

**Règle actuelle** (`firestore.rules:63-66`) :

```
match /user_profiles/{userId} {
  allow read:  if isAuthenticated() && (isOwner(userId) || isKingOrOfficer());
  allow write: if isAuthenticated() && (isOwner(userId) || isKingOrOfficer());
}
```

`allow write` sans restriction de champ : le propriétaire du document peut y écrire **n'importe
quelle clé**. Or trois de ces clés sont consommées ailleurs comme des faits vérifiés.

**1. Contournement du niveau « Discord vérifié » (BR-008).**
`AuthContext.jsx:135` calcule `isDiscordUser` ainsi :

```js
setIsDiscordUser(user.uid.startsWith('discord:') || !!(profile.discordId || profile.discordUid));
```

Un compte Google authentifié qui écrit `{ discordId: "0" }` dans son propre profil passe vérifié.
Cela débloque l'onglet Progressions et les vues fillers du hub KvK
(`KvKPerformancePage.jsx:262, 340, 551`).

*Impact réel limité* : les données servies derrière ce gate viennent de `static_data` et
`kvk_history`, déjà lisibles publiquement (B-1). Le gate est donc décoratif aujourd'hui — mais il
est cité comme un niveau de permission dans le modèle produit, et l'arbitrage BR-008 en cours
suppose qu'il veut dire quelque chose.

**2. Confusion d'identité dans le bot Discord.**
`discordBot.js:81-83`, `resolvePlayer()` résout un joueur ainsi :

```js
db.collection("user_profiles").where("discordId", "==", discordId).limit(1).get()
```

La requête n'est bornée par aucune preuve de possession : elle prend le premier document dont le
champ `discordId` correspond, dans un ordre non spécifié. Un membre qui écrit dans **son propre**
document le `discordId` d'un autre membre insère un candidat concurrent à cette requête. Selon le
document retourné, la victime qui tape `/mystats` peut recevoir les statistiques du gouverneur
choisi par l'attaquant.

Symétriquement, `governorId` n'est vérifié nulle part : n'importe quel compte peut lier son profil
à n'importe quel ID de gouverneur du royaume et lire ses statistiques via le bot. C'est un choix
d'origine (la liaison est déclarative, sans preuve), mais il devient exploitable dès que la donnée
sert d'index de recherche.

**Point rassurant** : `resolvePlayer` renvoie aussi `role: data.role || "Warrior"`, lu depuis ce
document client-écrivable — mais cette valeur **n'est consommée nulle part** dans le bot
(vérifié : seuls les appelants lignes 265 et 383 utilisent `governorId`). Il n'y a donc pas
d'élévation de privilège par ce biais. Le champ mériterait d'être supprimé avant que quelqu'un
s'en serve.

**Correctif proposé** : restreindre l'écriture propriétaire à `governorId` et `updatedAt`, réserver
`discordId` / `discordUid` / `role` aux Functions, et retirer l'écriture au leadership (aucun code
client ne l'utilise — vérifié : seuls `AuthContext.jsx:128,142` écrivent, toujours sur son propre
document).

---

## H-2 — Aucune règle Storage dans le dépôt → **sans objet, revu le 2026-07-22**

> **Constat révisé après tentative de déploiement.** Firebase Storage n'a jamais été initialisé
> sur `kd-97-manager` : `firebase deploy --only storage` répond *« Firebase Storage has not been
> set up on project »*. Il n'existe donc **aucun bucket Firebase Storage**, et par conséquent
> aucune règle manquante — il n'y a rien à gouverner.
>
> Le seul bucket réel, `kd-97-manager-kvk-race`, est un bucket **GCS brut** : les règles Firebase
> Storage ne s'y appliquent pas, quoi qu'on écrive. Il est protégé par l'IAM du projet et par
> *public access prevention*, et son état se vérifie en console GCP.
>
> `storage.rules` est conservé dans le dépôt en **fichier dormant**, volontairement absent de
> `firebase.json` : l'y déclarer ferait échouer tout déploiement global. Il sera prêt le jour où
> Storage serait activé.
>
> La sévérité tombe donc de Haute à sans objet. L'analyse ci-dessous est conservée pour mémoire :
> elle reste valable si Firebase Storage venait à être activé.

### Analyse d'origine (conservée pour mémoire)

`firebase.json` ne déclare **aucun bloc `storage`**, et il n'existe pas de `storage.rules`. Les
règles réellement appliquées sont donc celles saisies dans la console Firebase : non versionnées,
non revues, non redéployables depuis le dépôt, et absentes de tout diff de PR.

Ce qui vit dans Storage : les scans de compétition (~20 Mo, ~14 000 lignes joueur par fichier,
32 royaumes) et les dérivés `derived/gov_values_{seq}.json`, c'est-à-dire le détail par gouverneur
de toute la coalition — la donnée la plus sensible du projet.

Atténuation en place, d'après `Plan_Execution_E005_Phase1.md` : le bucket `kd-97-manager-kvk-race`
est dédié, privé, avec *public access prevention*, et les clients n'y accèdent que par URL signée
V4 de 15 minutes émise par `getRaceScanUploadUrl` après vérification du rôle (BR-014). Le risque
n'est donc pas « le bucket est ouvert » mais « rien dans le dépôt ne le garantit ni ne le rejoue ».

**Correctif proposé** : créer `storage.rules` (deny par défaut, y compris sur le bucket par défaut
du projet), le déclarer dans `firebase.json`, et vérifier en console l'état actuel des deux buckets.

---

## M-1 — Création de déclarations sans lien de propriété

`firestore.rules:73-77` :

```
allow create: if isAuthenticated();
allow update, delete: if isAuthenticated() && (resource.data.userId == request.auth.uid || isKingOrOfficer());
```

La mise à jour est correctement bornée, la création ne l'est pas. Tout membre authentifié peut
créer une déclaration à l'ID de document de son choix, avec le `userId` d'un autre.

L'exploitation est bornée par le fait qu'une déclaration existante bascule en `update` : on ne peut
pas écraser une déclaration déjà remplie, seulement occuper la place de ceux qui n'ont pas encore
déclaré (l'ID est déterministe : `${kvkId}_${uid}`). L'intéressé peut ensuite corriger la sienne.
Impact : pollution du War Tracker et faussage des relances, pas de perte de données.

**Attention au correctif** : l'outil de fusion de campagnes (`MaintenanceTools.jsx:100-111`, Roi)
recrée légitimement des documents portant le `userId` d'autrui, et il existe des déclarations
historiques avec `userId: 'guest'`. La règle doit donc autoriser `userId == request.auth.uid`
**ou** le leadership.

---

## M-2 — `kvk_config` écrivable par un Officier

`firestore.rules:68-71` autorise l'écriture à King **ou** Officer. Or tous les écrans qui écrivent
cette collection vivent dans la page Administration, réservée au Roi : `KvKConfigForm`,
`CampaignArchiveControl` et `MaintenanceTools`. Un Officier peut donc, par appel direct au SDK,
repointer la campagne active — ce à quoi toutes les déclarations sont rattachées.

Écart entre l'intention affichée par l'UI et ce que les règles autorisent. À aligner sur King.

---

## M-3 — Aucune contrainte de forme ni de taille

Aucune règle ne valide `request.resource.data`. Un membre authentifié peut écrire dans
`war_availabilities` un document d'un mégaoctet, ou des champs arbitraires que l'app ne lit pas.
Pas de vol de données, mais un levier de coût et de pollution, et rien n'empêche une future
régression client d'écrire des formes invalides.

Correctif minimal proposé : plafonner les clés attendues sur `war_availabilities` et
`user_profiles`. Une validation exhaustive n'est pas rentable ici — le plafond de taille l'est.

---

## B-1 — `static_data` et `kvk_history` en lecture publique

```
match /static_data/{document=**} { allow read: if true; }
match /kvk_history/{kvkId}       { allow read: if true; }
```

Toute personne connaissant l'ID du projet peut lire le roster complet : noms de gouverneurs,
puissance, kills, morts, dépôts, et l'intégralité des campagnes archivées — sans compte.

**C'est peut-être voulu** : le Dashboard est servi aux visiteurs non connectés (aucun gate dans
`DashboardPage.jsx`), donc passer ces collections en `isAuthenticated()` casserait la page
d'accueil publique. Je ne l'ai pas modifié : c'est un arbitrage produit, pas un correctif technique.

Deux options si tu veux fermer : exiger l'authentification et remplacer le Dashboard public par un
écran de connexion ; ou garder public mais restreindre les champs exposés (ce qui suppose de
séparer les documents, plus lourd).

---

## B-2 — `roles/{uid}` en lecture publique

`allow read: if true` permet d'énumérer les UID et de savoir qui est Roi ou Officier. L'écriture
est correctement fermée, donc pas d'élévation — c'est une fuite de structure, utile seulement à un
attaquant qui prépare autre chose. À restreindre au propriétaire et au leadership.

---

## B-3 — Deux lectures par vérification de rôle

`isKingOrOfficer()` appelle `getUserRole()` deux fois, soit deux `get()` facturés par évaluation de
règle. Par ailleurs `get(...).data.role` lève une erreur si le document de rôle n'existe pas — le
refus qui en résulte est le bon comportement, mais il est obtenu par accident plutôt que par
intention. Un `.data.get('role', 'Guest')` rend l'intention explicite et divise les lectures par deux.

---

## Ce qui a été vérifié et ne pose pas de problème

- **Aucun secret suivi par git** : `service-account.json`, `serviceAccountKey.json`, `.env`,
  `users.json` et les dumps `functions/all_users*.json` sont tous couverts par `.gitignore`, et
  `git ls-files` ne remonte rien.
- **Pas d'élévation vers King/Officer** : `roles/{uid}` est en écriture `false` ; seul
  `updateFirestoreRole()` (Admin SDK, `discordAuth.js:358`) y écrit, à partir des rôles Discord.
- **`kvk_race`** : lecture leadership, config racine réservée au Roi, sous-collections d'agrégats en
  écriture `false` — conforme à la décision §9.4.
- **`kvk_history`** : création par le Roi, mise à jour restreinte au seul champ `outcome` par
  `diff().affectedKeys().hasOnly()`, suppression interdite. L'archive est bien immuable.
- **`_discord_oauth_cache` et `_discord_link_tokens`** : absentes des règles, donc refusées par
  défaut aux clients. Elles ne sont manipulées que par l'Admin SDK.
- **Les deux bases** (`(default)` et `kdmanagerdb`) partagent le même fichier de règles, donc pas de
  base oubliée — le client utilise `kdmanagerdb` (`src/config/firebase.js:26`).

---

## Correctifs proposés

Un jeu de règles durcies est prêt dans **`firestore.rules.proposed`** (non déployé). Il couvre
H-1, M-1, M-2, M-3, B-2 et B-3 — c'est-à-dire tout ce qui ne demande pas d'arbitrage produit.

Il ne touche **pas** B-1 : la lecture publique de `static_data` et `kvk_history` reste en l'état
tant que le sort du Dashboard visiteur n'est pas tranché.

**Avant de déployer** : ces règles changent des chemins d'écriture réels. Le dépôt dispose d'un
harnais Playwright sur émulateur (`npm run test:e2e`) — à faire tourner contre les nouvelles
règles, en couvrant au minimum la liaison d'un gouverneur, la déclaration de disponibilité, la
fusion de campagne par le Roi et la sauvegarde de la config de course.

Restent à traiter hors fichier de règles :

1. **H-2** — créer `storage.rules` et le déclarer dans `firebase.json` ; vérifier l'état réel des
   deux buckets en console.
2. **H-1, volet bot** — donner à `resolvePlayer` une source d'identité digne de confiance : ne
   résoudre que par `user_profiles/{discord:<id>}` (document dont l'ID est l'identité) plutôt que par
   requête sur un champ écrit par le client, et supprimer le champ `role` renvoyé.
3. **B-1** — arbitrage produit sur le Dashboard visiteur.

---

# Clôture — 2026-07-22

## Ce qui a été livré

| Constat | État | Où |
|---|---|---|
| H-1 (règles) | **Corrigé** | `user_profiles` : écriture propriétaire limitée à `governorId`/`updatedAt` ; `discordId`, `discordUid` et `role` deviennent Functions-only |
| H-1 (bot) | **Corrigé** | `resolvePlayer` : ID de document d'abord, `limit(2)` + refus si ambiguïté, `role` retiré du retour |
| H-2 | **Sans objet** | Firebase Storage non activé — aucune surface à protéger (voir constat révisé) |
| M-1 | **Corrigé** | Création de déclaration liée à son propre `userId`, leadership excepté (outil de fusion) |
| M-2 | **Corrigé** | `kvk_config` en écriture King only, aligné sur l'UI |
| M-3 | **Corrigé** | Clés plafonnées sur `user_profiles` via `keys().hasOnly()` / `diff().affectedKeys()` |
| B-1 | **Ouvert — arbitrage produit** | `static_data` et `kvk_history` restent en lecture publique |
| B-2 | **Corrigé** | `roles` fermé au propriétaire et au leadership |
| B-3 | **Corrigé** | `role()` : un `get()` par évaluation, défaut explicite |

Déployé sur les deux bases le 2026-07-22 et vérifié par sonde anonyme sur l'API REST (voir
« Vérification » ci-dessous). Commits : `cefe7f8` (règles), `bed6ad6` (bot).

## Vérification par sonde

Un document **inexistant** distingue les deux cas sans authentification : `404` signifie « lecture
autorisée, document absent », `403` signifie « lecture refusée ». `roles` est le seul témoin qui
sépare l'ancien et le nouveau jeu de règles — les autres collections fermées l'étaient déjà.

```bash
curl -s -o /dev/null -w "%{http_code}" \
  https://firestore.googleapis.com/v1/projects/kd-97-manager/databases/kdmanagerdb/documents/roles/probe_audit
# 404 = anciennes règles encore en place · 403 = durcissement actif
```

Résultat après déploiement : `403` sur `kdmanagerdb` **et** sur `(default)`. `static_data` et
`kvk_history` restent en `404`, conformément à B-1 laissé ouvert.

## Piège de déploiement à connaître

**`firebase deploy --only firestore:rules` ne déploie rien sur ce projet** — et ne le dit pas.

`firebase.json` déclare deux bases dans un tableau `firestore` (`(default)` et `kdmanagerdb`).
Le filtre `firestore:rules` ne matche aucune des deux entrées : le CLI affiche `Deploy complete!`
sans jamais imprimer de ligne `released rules`, et les anciennes règles restent en production.
C'est un faux positif silencieux — le pire genre pour un correctif de sécurité.

La commande correcte est :

```bash
npx firebase deploy --only firestore
```

Elle imprime `released rules firestore.rules to cloud.firestore` **deux fois**, une par base.
Vérifier la présence de ces deux lignes, puis confirmer par la sonde ci-dessus. Compter environ
une minute de propagation sur `kdmanagerdb` ; `(default)` bascule immédiatement.

## Suite

- **B-1** — seul constat encore ouvert. Fermer `static_data` et `kvk_history` suppose de décider du
  sort du Dashboard visiteur, aujourd'hui servi sans authentification.
- **Non-régression** — `npm run test:rules` (29 cas sur émulateur) est à lancer à chaque
  modification de `firestore.rules`. À câbler en CI si un workflow GitHub Actions est mis en place.
- **Données existantes** — le durcissement empêche d'écrire `discordId` depuis un client, mais ne
  nettoie pas d'éventuelles valeurs antérieures. Le refus d'ambiguïté de `resolvePlayer` couvre le
  risque d'exploitation ; un balayage de `user_profiles` à la recherche de `discordId` en doublon
  confirmerait qu'aucun profil suspect n'existe.
