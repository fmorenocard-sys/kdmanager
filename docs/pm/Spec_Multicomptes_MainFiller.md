# Spec — Multi-comptes par utilisateur (comptes de guerre + fillers)

> Date : 2026-07-27 (4 passes d'arbitrage le même jour) · Statut :
> **entièrement arbitrée et prête à implémenter** (§3 + §3bis + §3ter + §3quater).
> Tous les points ouverts tranchés par le Roi, y compris la migration (A-024,
> option A). Seule sous-question laissée en défaut : statut de dispo séparé
> pour un filler (A-020, défaut « pas de statut séparé »).
> Épic **E-007**, features **F-025 / F-026 / F-027**, règles **BR-016 / BR-017 / BR-018**
> (amendées, pas de nouvelle règle créée — voir §3quater), user stories
> **US-027 à US-030** + **US-031** (idée future hors périmètre) (nouveaux IDs,
> aucun renumérotage — derniers ID utilisés avant cette spec : E-006, F-024,
> BR-015, US-026, A-018).
>
> ⚠️ **Terminologie — piège à éviter.** Le type de compte introduit ici
> s'appelle **« compte de guerre » (`war`)**, jamais « guerrier »/« warrior » :
> ce mot est déjà pris par le **rôle RBAC** Roi/Officier/**Guerrier**/Invité
> (R-002, §9). Les deux notions sont indépendantes (un Officer peut avoir des
> comptes `war` et `filler`, un Guerrier aussi) — ne jamais les confondre dans
> le code, l'UI ou les docs.
>
> Origine : un utilisateur possède souvent plusieurs comptes de jeu — un ou
> plusieurs comptes de guerre à part entière et un ou plusieurs comptes
> secondaires (« fillers », ex. Helios et Kaelen en comptes de guerre, Aurion
> et Solinar en fillers). Aujourd'hui il ne peut en réclamer qu'un seul.

---

## 1. Le besoin, reformulé

Le lien `utilisateur ↔ gouverneur` est aujourd'hui **1:1**. Le besoin est de
le rendre **1:N** : un utilisateur réclame plusieurs comptes réels, type
chacun (compte de guerre ou filler) et désigne l'un d'eux comme son compte
principal, puis peut agir (déclarer sa dispo de guerre, voir ses objectifs)
**au nom de chacun séparément** — pas une fusion des comptes en une seule
identité, mais **N identités de jeu gérées depuis un seul compte applicatif**.

Trois capacités concrètes en découlent, qui correspondent aux trois features
attribuées ci-dessous :
1. Gérer la liste de ses comptes dans le profil, avec leur type (F-025).
2. Déclarer une disponibilité de guerre distincte pour chaque compte, adaptée
   à son type (F-026).
3. Recevoir un objectif adapté au type du compte — barème puissance inchangé
   pour un compte de guerre, barème filler nouveau et simplifié (F-027).

---

## 2. État actuel — vérifié dans le code

**Lien utilisateur ↔ gouverneur (mono-compte).**
`src/context/AuthContext.jsx` : `user_profiles/{uid}.governorId` est une
**chaîne unique**. `linkGovernor(id)` écrase toute valeur précédente (aucune
liste, aucun historique) et écrit en miroir dans `localStorage
gov_link_${uid}` ; `unlinkGovernor()` supprime les deux. Le `useEffect`
d'authentification résout `governorId` dans cet ordre : `localStorage` d'abord
(vue optimiste), Firestore ensuite, avec re-synchronisation si les deux
divergent. **Rien dans le code actuel ne vérifie qu'un `governorId` n'est pas
déjà réclamé par un autre `uid`** — ce n'est pas introduit par cette spec,
c'est un fait préexistant (voir A-023).

**Firestore rules (`firestore.rules`, bloc `user_profiles`).**
```
allow create: if isOwner(userId) && writesOnly(['governorId', 'updatedAt']);
allow update: if isOwner(userId) && changesOnly(['governorId', 'updatedAt']);
```
Toute évolution du schéma vers plusieurs comptes est **bloquée par les règles
actuelles** tant qu'elles ne sont pas étendues (§8).

**ProfilePage (`src/pages/ProfilePage.jsx`).** Un seul bloc « Gouverneur lié »
(compte trouvé ou recherche). La recherche de claim interroge **uniquement
`players`** (contexte `DataContext`, alimenté par `static_data/players`, dont
le fichier source est `Top 300 ...xlsx` — c'est le **roster Top 300**, pas un
roster de tous les gouverneurs connus). **Constat important, tranché par le
Roi (A-022, §11)** : les comptes filler ne font *a priori* pas partie du Top
300 par construction — ils vivent dans une collection séparée, campagne-scoped
(voir plus bas). La recherche de claim doit donc être **étendue** pour
matcher par governor ID au-delà du seul `players` (§6) — exigence ferme du
MVP, pas une option.

**Déclaration de guerre (`AvailabilityForm.jsx`).** Un seul document par
utilisateur et par campagne : `docId = ${kvkId}_${uid}` (ou
`${kvkId}_guest_${governorId}` si non connecté). Au `submit`, si l'utilisateur
tape manuellement un `governorId` différent de celui déjà lié, le formulaire
**réappelle `linkGovernor()` et écrase le lien existant** — mécanisme conçu
pour du mono-compte, incompatible tel quel avec du multi-compte (§7).

**Consommateurs de `war_availabilities` — bonne nouvelle.** `WarDashboard.jsx`,
`KvkGoalsPanel.jsx`, `KvKConfigForm.jsx` et l'outil de fusion de campagnes
(`MaintenanceTools.jsx`) lisent **toute la collection** et travaillent
document par document (filtrage par `kvkId`, regroupement par `governorId`) —
**aucun ne suppose « un seul document par `uid` »** à la lecture. Le
changement de schéma de `docId` (§7.2) n'impacte donc que les écrivains
(`AvailabilityForm`) et un outil d'admin qui reconstruit des `docId`
(`MaintenanceTools`, voir §7.3) — pas les lecteurs.

**Objectifs main (`src/lib/kvkGoals.js`, `KvkGoalsPanel.jsx`).**
`computeKvkGoals(power)` : polynômes validés contre le classeur SoC 4,
inchangés par cette spec (décision 2 du Roi). `KvkGoalsPanel` indexe déjà les
statistiques par `governorId` en fusionnant `kvkStats` **et**
`kvkFillerStats` (`[...(kvkStats||[]), ...(kvkFillerStats||[])]`) — la vue
« Objectifs » sait donc déjà, structurellement, traiter des lignes de nature
différente ; elle applique juste aujourd'hui le **même** barème à toutes.

**Socle filler existant (`static_data/kvk_filler`).** Alimenté par l'onglet
« Filler Accounts » du classeur KvK (mapping `KVK_FILLER` dans
`src/config/data-mapping.js`) : `id, name, initialPower, finalPower, kp,
t4Dead, t5Dead, pass4Dead, klDead, totalDead, goalPercent`. **Deux faits
structurants** :
- Ce document est **campagne-scoped et réécrit à chaque synchro**, exactement
  comme `static_data/kvk` (même fragilité documentée dans
  `FeatureInventory.md`, ligne « Problèmes connus » F-002/F-015). Il n'existe
  donc pas hors-saison / avant le premier scan d'une nouvelle campagne.
  L'historique par campagne est conservé séparément via `kvk_history.fillerList[]`
  (A-006).
- Il contient déjà **`t4Dead` et `t5Dead`** — précisément les deux compteurs
  dont la formule d'objectif filler du Roi a besoin côté « réalisé » (§7).
  **Aucune nouvelle ingestion de données n'est nécessaire pour mesurer
  l'atteinte de l'objectif filler** — seule la déclaration *a priori* (T4/T5
  disponibles) est une donnée nouvelle.

**RBAC.** `RoleContext.jsx` lit `roles/{uid}`, clé sur l'utilisateur
Discord-authentifié — **aucun rapport avec le `governorId`**. Un Officer avec
3 comptes réclamés reste Officer pour ses 3 déclarations ; le rôle ne se
réclame pas par compte. Inchangé par cette spec.

---

## 3. Décisions du Roi (à refléter, non rediscutées)

| # | Décision |
|---|---|
| 1 | Périmètre complet : chaque compte réclamé (main ou filler) peut déclarer sa propre dispo KvK et a ses propres objectifs. |
| 2 | Barème d'objectif **main** inchangé (`computeKvkGoals`, `KvkGoalsPanel`). |
| 3 | Barème d'objectif **filler**, nouveau et paramétrable : déclaration = nombre de T4 + nombre de T5 ; pouvoir déclaré (en points) = **4×T4 + 10×T5** ; objectif = perdre, en morts, **50 % du pouvoir déclaré** (base = points, pas le nombre d'unités) ; le 50 % est **paramétrable**. |

---

## 3bis. Décisions du Roi — 2ᵉ passe (2026-07-27, même jour)

Réponses aux questions ouvertes du §11 initial. Corrige et remplace certains
points de la première version de cette spec (§5, §6, §7.1) — le détail des
sections concernées est mis à jour en conséquence.

| # | Sujet | Arbitrage |
|---|---|---|
| 4 | **Distinction main/filler** | **Choix explicite par compte, pas de dérivation.** L'utilisateur désigne lui-même ses fillers parmi les gouverneurs du Top 300 (`static_data/players`). Rejeté explicitement : l'auto-désignation « 1 main, le reste devient filler par élimination » (l'option initialement recommandée par cette spec, §5) et la dérivation depuis `static_data/kvk_filler`. Corrige **A-019 / BR-016** — tranchée. |
| 5 | **Déclaration filler — mécanique du formulaire** | Le joueur **sélectionne un ou plusieurs** de ses comptes filler réclamés dans un même flux, et saisit T4/T5 **pour chacun** des comptes sélectionnés — pas un compte à la fois via un sélecteur onglet-par-onglet. Formulaire allégé, distinct du formulaire main complet. Corrige **F-026, §7.1**. |
| 6 | **Statut de disponibilité pour un filler** | **Non tranché explicitement.** Reste question ouverte (A-020), avec une proposition par défaut : **pas de statut séparé** — un filler déclaré (sélectionné + T4/T5 saisis) **vaut présence**. |
| 7 | **Ratio de perte cible filler** | **Confirmé paramétrable par campagne**, stocké dans `kvk_config/current` (pas global). Corrige **A-021 / F-027** — tranchée, conforme à la proposition initiale de cette spec. |
| 8 | **Trouvabilité du filler (ex-point bloquant)** | Un filler est identifié **uniquement par son governor ID**, recherché dans un scan KvK (`static_data/kvk`) **ou** un scan interne (`static_data/players` Top 300, et `static_data/kvk_filler` s'il existe pour la campagne en cours). Le cas d'un gouverneur réel absent de ces trois sources (très gros royaumes dont le roster dépasse le Top 300 scanné) est **explicitement hors périmètre**, solution différée. **2997 et 3341 ne sont pas concernés** — leurs rosters couvrent la totalité de leurs comptes. Corrige **A-022** — tranchée, avec la recherche de claim **étendue** posée comme **exigence ferme du MVP** (§6), pas une option. |
| 9 | **Anti-abus / unicité du claim** | Le gap actuel (un `governorId` réclamable par plusieurs utilisateurs, ou par un utilisateur autre que son propriétaire réel) reste **acceptable pour le MVP** — self-service, sans validation. **Piste future notée, hors périmètre** : vérification d'appartenance par code envoyé en message privé in-game (2FA in-game). Enregistrée en **US-031** (idée future, non priorisée). Corrige **A-023** — tranchée (statu quo confirmé + piste future actée). |

## 3ter. Décision du Roi — 3ᵉ passe (2026-07-27, migration — dernier point ouvert)

| # | Sujet | Arbitrage |
|---|---|---|
| 10 | **Migration des déclarations existantes** | **Option A retenue : on laisse les documents existants tels quels** (ancien `docId` `${kvkId}_${uid}`), lus avec un repli au runtime (§7.2). **Aucune réécriture, aucun script de backfill.** Justification du Roi : le KvK 41 (pilote KD 3341) n'a pas encore commencé — très peu voire aucune déclaration existante à ce jour, donc sans conséquence pratique. **Option B (script de backfill réécrivant les documents existants) est explicitement écartée pour le MVP.** Corrige **A-024** — **tranchée.** |

Avec cette décision, **toutes les questions ouvertes de cette spec sont
tranchées**, à l'exception d'un point mineur laissé par défaut plutôt que
tranché explicitement : le **statut de disponibilité séparé pour un filler**
(A-020) — proposition par défaut retenue faute d'arbitrage explicite : pas de
statut séparé, un filler déclaré (sélectionné + T4/T5 saisis) vaut présence.

## 3quater. Décision du Roi — 4ᵉ passe (2026-07-27, révision du modèle)

Après la 3ᵉ passe, le Roi révise le mécanisme de distinction retenu en §3bis
(décision 4). Changement de modèle, pas un simple renommage :

| # | Sujet | Arbitrage |
|---|---|---|
| 11 | **Type par compte, pas « main + fillers »** | Chaque compte réclamé porte un **type** : **`war`** (« compte de guerre » en UI) ou **`filler`**. Le type est **fixé au claim** et **librement modifiable ensuite** dans ProfilePage — mais il n'est **jamais choisi à la déclaration** : le formulaire du War Tracker s'adapte automatiquement au type déjà connu du compte (§7.1). |
| 12 | **Terminologie — piège RBAC** | Le type `war` se nomme **« compte de guerre »** en français, jamais « guerrier »/« warrior » : ce mot désigne déjà le **rôle RBAC** Guerrier (R-002). Un compte de type `war` et un utilisateur de rôle Guerrier sont deux notions indépendantes. |
| 13 | **Plusieurs comptes `war` autorisés** | Il n'y a plus de contrainte « un seul main » sur le type : un utilisateur peut avoir **plusieurs comptes de guerre** (cas réel confirmé par le Roi : 2 comptes de guerre sur KD 3341). Le concept « main unique » est abandonné pour le type. |
| 14 | **Compte principal (`isPrimary`), séparé du type** | Un flag léger **`isPrimary`** (un seul par utilisateur, dès qu'au moins un compte est réclamé) porte l'**identité d'affichage** (en-tête de profil) et le **miroir `governorId`** — indépendant du type : un compte principal peut être `war` ou `filler`. |

**Conséquence directe sur les règles métier** : **BR-016 est amendée** pour
refléter ce modèle (type par compte piloté par l'utilisateur, plusieurs `war`
autorisés, `isPrimary` distinct) ; **BR-017 et BR-018 sont amendées** pour
remplacer le vocabulaire « main » par « compte de guerre »/`isPrimary`. **Aucune
nouvelle règle BR n'est créée** — le principe « le type pilote le barème
d'objectif » est une conséquence directe de BR-016 (modèle de compte), pas une
règle indépendante ; il est documenté dans BR-016 et rappelé dans BR-018.

Cette spec est **prête à implémenter** sur la base des sections 4 à 13
ci-dessous, mises à jour pour ce modèle.

---

## 4. Modèle de données proposé

### 4.1 `user_profiles/{uid}` — évolution

```jsonc
{
  // LEGACY — conservé tel quel, toujours égal au governorId du compte
  // "isPrimary: true" (pas d'un "main" — ce concept n'existe plus). Tous les
  // lecteurs actuels du champ (AvailabilityForm pré-remplissage,
  // WarDashboard.getPlayerName, ProfilePage, le bot Discord côté Functions)
  // continuent de fonctionner sans modification.
  "governorId": "111",

  // NOUVEAU — liste ordonnée des comptes réclamés par cet utilisateur.
  // `type` : choisi par l'utilisateur au claim, librement modifiable ensuite,
  // sans contrainte de singularité (plusieurs `war` autorisés).
  // `isPrimary` : indépendant du type, un seul `true` par utilisateur.
  "accounts": [
    { "governorId": "111", "type": "war",    "isPrimary": true,  "claimedAt": "<timestamp>" },
    { "governorId": "444", "type": "war",    "isPrimary": false, "claimedAt": "<timestamp>" },
    { "governorId": "222", "type": "filler", "isPrimary": false, "claimedAt": "<timestamp>" },
    { "governorId": "333", "type": "filler", "isPrimary": false, "claimedAt": "<timestamp>" }
  ],

  "updatedAt": "<timestamp>"
}
```

**Migration douce (pas de réécriture batch).** Un profil existant n'a que
`governorId`. À la première lecture après déploiement, le client traite
l'absence de `accounts` comme `accounts: [{ governorId, type: 'war', isPrimary:
true }]` — l'ancien compte unique devient **le compte de guerre par défaut**,
marqué principal. C'est une **migration paresseuse côté lecture**, pas une
migration de données : aucun script de backfill n'est nécessaire, le champ
`accounts` n'est écrit qu'au premier appel d'une action multi-compte (ajout
d'un 2ᵉ compte, changement de type, changement de compte principal). Un
utilisateur qui n'utilise jamais la nouvelle fonctionnalité garde un profil
strictement identique à aujourd'hui.

**`governorId` reste le miroir du compte `isPrimary: true`**, recalculé à
chaque écriture de `accounts` — c'est le prix à payer pour ne pas casser tout
ce qui lit déjà ce champ directement (y compris côté Functions/bot, hors
périmètre de cette spec puisqu'aucun fichier de code n'est modifié ici, mais
que la spec doit anticiper). Un compte principal peut être `war` ou `filler`
— les deux notions sont indépendantes (§3quater, décision 14).

### 4.2 Pourquoi pas une sous-collection

Une sous-collection `user_profiles/{uid}/accounts/{governorId}` a été
envisagée et écartée pour le MVP : le nombre de comptes par utilisateur est
faible (2–5 dans l'usage décrit), un tableau dans le document parent évite une
lecture supplémentaire à chaque affichage du profil et reste dans l'esprit
« pas de sur-ingénierie » déjà appliqué ailleurs dans le projet (cf.
`Etude_Activation_Modules.md` §3, choix du fichier de config plutôt que d'une
architecture élaborée). À revoir si un usage à N comptes très élevé apparaissait.

---

## 5. Type de compte (guerre/filler) et compte principal — arbitrage du Roi

### 5.1 Historique de l'arbitrage (traçabilité)

| Option | Principe | Devenir |
|---|---|---|
| **A — Désignation par élimination (initialement recommandée par le PM)** | L'utilisateur réclame ses comptes puis désigne **exactement un** compte « main » ; tous les autres deviennent fillers par construction (dérivé, pas un tag séparé). | **Écartée dès le §3bis** (décision 4) : « pas d'auto-désignation 1 main, le reste fillers ». |
| **B — Dérivé de `static_data/kvk_filler`** | Un compte est filler s'il apparaît dans le roster filler de la campagne en cours. | **Écartée** (PM et Roi concordent, §2) : collection campagne-scoped, réécrite à chaque synchro, indéterminée hors-saison. |
| **C — Tag explicite main/filler par compte (retenue au §3bis)** | L'utilisateur désigne lui-même chaque compte comme « main » ou « filler », choix actif au claim. | **Retenue provisoirement au §3bis, puis affinée au §3quater** : le concept binaire « main/filler » est remplacé par un **type** (§5.2), et la singularité qui restait sur le « main » est déplacée sur un flag séparé, `isPrimary` (§5.3). |

### 5.2 Type de compte (`war` / `filler`) — décision finale (§3quater)

Chaque compte réclamé porte un **type**, `war` (« compte de guerre ») ou
`filler`, qui détermine son formulaire de déclaration (§7) et son barème
d'objectif (§8) :

- **Choisi explicitement par l'utilisateur au moment du claim** — jamais
  déduit, jamais par défaut implicite.
- **Librement modifiable ensuite**, compte par compte, dans `ProfilePage`.
- **Sans contrainte de singularité** : un utilisateur peut avoir plusieurs
  comptes `war` (cas réel confirmé par le Roi : 2 comptes de guerre sur
  KD 3341). Il n'y a donc plus de notion de « main unique » côté type.

⚠️ **Terminologie** : `war` s'affiche **« Compte de guerre »** en français, et
seulement ça — jamais « Guerrier »/« Warrior », déjà pris par le rôle RBAC
(R-002, §9).

### 5.3 Compte principal (`isPrimary`) — séparé du type

Le besoin d'un **miroir `governorId` unique** pour la rétrocompatibilité
(§4.1) ne disparaît pas avec l'abandon du « main » — il est porté par un flag
dédié, **indépendant du type** :

- **Un seul compte `isPrimary: true`** par utilisateur, dès qu'au moins un
  compte est réclamé.
- Détermine l'identité affichée en en-tête de profil et le miroir `governorId`
  consommé par tout le code existant (§4.1).
- **Un compte principal peut être `war` ou `filler`** — les deux notions ne se
  contraignent pas l'une l'autre.
- Réassignation **simple** (sélection unique, façon bouton radio) : marquer un
  autre compte comme principal dé-marque automatiquement l'ancien. **Pas
  besoin** du garde-fou en deux temps décrit dans une version antérieure de
  cette spec pour le « main » — ce garde-fou visait à empêcher une
  **requalification de type implicite** (ce que le Roi a rejeté, §3bis
  décision 4) ; changer le compte principal ne touche **ni** le type **ni**
  le barème d'objectif d'aucun compte, donc rien à protéger par un blocage.

---

## 6. Flux ProfilePage — claim / unlink / type / compte principal (F-025)

Remplace le bloc unique « Gouverneur lié » par une liste **« Mes comptes »** :

- Chaque compte réclamé est affiché (nom, ID, puissance si connue, badge de
  **type** — « Compte de guerre » ou « Filler » — et badge **Principal** s'il
  porte `isPrimary: true`).
- **Au moment du claim** (recherche + « Réclamer »), l'utilisateur **choisit
  explicitement** le type du compte — Compte de guerre ou Filler (§5.2) — ce
  n'est jamais déduit ni par défaut.
- **Le type reste modifiable ensuite**, librement, compte par compte
  (« Changer de type ») — sans contrainte de singularité : rien n'empêche
  d'avoir plusieurs comptes de guerre (§5.2).
- **Le compte principal** se désigne séparément (« Désigner comme principal »)
  — réassignation simple, un seul à la fois, indépendante du type (§5.3).
- Chaque compte porte un bouton **« Retirer »** (équivalent de l'`unlinkGovernor`
  actuel, mais compte par compte). **Règle à respecter** (déduite du besoin de
  miroir `governorId`, non explicitement énoncée par le Roi) : si le compte
  retiré est le compte principal et qu'il reste d'autres comptes, l'utilisateur
  doit d'abord désigner un nouveau principal — retirer le dernier compte
  restant ramène au « aucun compte lié » actuel, sans principal à désigner.
- Le bloc de recherche existant (déjà dans `ProfilePage.jsx`) devient
  **répétable** — « Ajouter un compte » — et **étendu** (§3bis, décision 8) :
  la recherche par governor ID doit matcher au-delà du seul `players`
  (Top 300) — voir périmètre exact ci-dessous.
- Aucune limite produit fixée sur le nombre de comptes.

### 6.1 Trouvabilité du filler — recherche étendue (exigence ferme du MVP)

Tranché au §3bis (décision 8). Un compte, quel que soit son type, est
identifié **uniquement par son governor ID**, recherché dans :
- un scan KvK (`static_data/kvk`, c'est-à-dire `kvkStats`) ;
- **ou** un scan/roster interne : `static_data/players` (Top 300) **et**
  `static_data/kvk_filler` s'il existe pour la campagne en cours.

Ces trois sources sont déjà chargées côté client dans `DataContext`
(`players`, `kvkStats`, `kvkFillerStats`) — `KvkGoalsPanel` les fusionne déjà
par `governorId` pour un usage différent (§2). La recherche de claim doit
faire de même : matcher un ID exact (et, si possible, un nom) à travers les
trois listes, pas seulement `players`.

**Hors périmètre, explicitement différé** : un gouverneur réel absent des
trois sources (cas des très gros royaumes dont le roster dépasse le Top 300
scanné) reste introuvable au claim — solution différée, non traitée par cette
spec. **2997 et 3341 ne sont pas concernés** : leurs rosters couvrent la
totalité de leurs comptes réels.

### 6.2 Anti-abus / vérification — tranché

Le self-service actuel (n'importe quel utilisateur connecté réclame n'importe
quel `governorId` non protégé par mot de passe) est **conservé tel quel**
pour le claim multi-compte — pas de validation officier introduite. C'est
cohérent avec le principe déjà appliqué à BR-009/BR-011 : ce n'est pas une
frontière de sécurité, c'est une fonctionnalité de confort déclarative,
auditable a posteriori par le leadership (qui voit toutes les déclarations
dans le War Dashboard). Une validation officier ajouterait de la friction
pour un gain de contrôle marginal, sur un mécanisme qui n'a jamais posé
problème en mono-compte.

**Confirmé par le Roi (§3bis, décision 9) : le gap reste acceptable pour le
MVP.** Rien n'empêche aujourd'hui deux utilisateurs différents de réclamer le
**même** `governorId` (aucune contrainte d'unicité, ni dans le code ni dans
les règles) — pas un problème introduit par le multi-compte, mais le
multi-compte **multiplie par le nombre de comptes réclamés** la surface où ça
pourrait arriver. **Statu quo acté, non traité par cette spec.**

**Piste future actée, hors périmètre** : vérification d'appartenance du
compte par un code envoyé en message privé **in-game** (2FA in-game) —
enregistrée en **US-031** (idée future, non priorisée, voir `ProductBacklog.md`).

---

## 7. Flux War Tracker — déclaration par compte (F-026)

### 7.1 Le formulaire s'adapte au type du compte — pas de choix à la déclaration

Le type (`war`/`filler`) est fixé sur le profil (§6), **jamais choisi ici** :
le War Tracker lit le type de chaque compte réclamé et adapte l'affichage en
conséquence (§3quater, décision 11).

- **Comptes de type `war`** (un ou plusieurs, §5.2) : chacun garde le
  formulaire complet actuel, inchangé (ressources, marches, tech, plages
  horaires). S'il y en a plusieurs, un sélecteur (pills : « Helios · Compte de
  guerre », « Kaelen · Compte de guerre ») bascule d'un compte à l'autre,
  chacun ayant sa propre déclaration.
- **Comptes de type `filler`** : flux **dédié**, distinct du formulaire
  complet (§3bis, décision 5) — une liste à cocher de tous les comptes filler
  réclamés ; l'utilisateur **sélectionne un ou plusieurs** comptes et saisit
  **T4/T5 pour chacun** des comptes cochés, puis enregistre en une seule
  action. Seuls les comptes cochés sont écrits/mis à jour — un filler non
  coché cette fois-ci n'est pas réinitialisé à zéro (+ point ouvert sur le
  statut de disponibilité, voir A-020 : par défaut, cocher + saisir T4/T5 vaut
  présence, sans champ de statut séparé).

Avec un seul compte réclamé (le cas d'aujourd'hui), le comportement actuel est
préservé à l'identique — **aucune régression pour un utilisateur mono-compte**.

### 7.2 Identité du document — nouveau schéma de `docId`

| | Aujourd'hui | Proposé |
|---|---|---|
| Utilisateur connecté | `${kvkId}_${uid}` | `${kvkId}_${uid}_${governorId}` |
| Invité (non connecté) | `${kvkId}_guest_${governorId}` | **Inchangé** — un invité n'a pas de profil multi-compte |

**Migration — lecture avec repli, pas de réécriture** (confirmé par le Roi,
§3ter, décision 10 — option A, aucun backfill). Les documents existants
(`${kvkId}_${uid}`, sans segment `governorId`) restent en l'état. Ils
représentent, par construction, la déclaration de l'unique compte que
l'utilisateur avait au moment de la création — c'est-à-dire son compte
**`isPrimary: true`, de type `war`** sous le nouveau modèle (§4.1). Toute
lecture « ma déclaration pour le compte X » doit donc :
1. chercher `${kvkId}_${uid}_${X}` (nouveau schéma) ;
2. si absent **et** `X` est le compte principal (`isPrimary`) de l'utilisateur,
   replier sur `${kvkId}_${uid}` (ancien schéma) pour ne pas faire disparaître
   une déclaration déjà saisie le jour du déploiement.

Les **nouvelles** déclarations (y compris pour le compte principal, à partir
de cette livraison) s'écrivent toujours sous le nouveau schéma à 3 segments —
la coexistence des deux schémas est transitoire, uniquement pour les
documents antérieurs au déploiement.

### 7.3 Impact sur les autres écrivains

- **`MaintenanceTools.jsx` (fusion de campagnes)** reconstruit aujourd'hui
  `${target.id}_${uid}` en supposant un document par `uid`. Avec le
  multi-compte, cette reconstruction **écraserait plusieurs déclarations
  d'un même utilisateur en une seule** — régression concrète à corriger :
  la reconstruction doit inclure le `governorId` du document source
  (`${target.id}_${uid}_${data.governorId}`), symétrique au calcul de
  `AvailabilityForm`.
- **`WarDashboard.jsx`** (outil de migration similaire, ligne 147) — même
  correctif à appliquer, même raisonnement.
- **`KvkGoalsPanel.jsx`** n'a besoin d'aucun changement de logique : il groupe
  déjà par `governorId` (pas par `uid`), donc N déclarations d'un même
  utilisateur pour N comptes apparaissent naturellement comme N lignes
  distinctes.

---

## 8. Calcul d'objectif filler (F-027)

### 8.1 Formule

```
pouvoirDéclaré (points) = 4 × T4_disponibles + 10 × T5_disponibles
objectifPerte (points)  = ratio × pouvoirDéclaré        // ratio par défaut = 0,50
```

**Mise en garde explicite — à ne jamais mélanger (mirroir de BR-010).** Cette
échelle de points (T4=4, T5=10) est **propre au barème filler** et n'a
**aucun rapport** avec :
- la puissance réelle du jeu (unités affichées pour un compte de type `war`,
  ex. `player.power`) ;
- l'échelle « points de morts » du barème des comptes `war`
  (`DEAD_POINTS_PER_T5 = 200` dans `kvkGoals.js`, complètement différente).

Ce sont **trois référentiels de points distincts** coexistant dans l'app.
Toute UI affichant un chiffre filler doit l'étiqueter explicitement (« points
de pouvoir filler », pas « Puissance ») pour ne jamais laisser croire à une
comparaison valide avec les chiffres main — même logique de prudence que
BR-010 pour le DKP course vs DKP interne.

### 8.2 Suivi de l'atteinte — aucune nouvelle donnée à ingérer

`static_data/kvk_filler` contient déjà `t4Dead` et `t5Dead` par compte (§2).
L'atteinte de l'objectif se calcule donc, une fois la campagne en cours :

```
pertesRéelles (points) = 4 × t4Dead + 10 × t5Dead
% atteinte              = pertesRéelles / objectifPerte
```

Seule la déclaration *a priori* (T4/T5 disponibles, saisie par le joueur
avant/au début du KvK) est une donnée réellement nouvelle ; le côté « réalisé »
réutilise un champ déjà ingéré par le pipeline existant.

### 8.3 Où stocker le ratio paramétrable

**Proposition : `kvk_config/current.goals.fillerDeathRatio`** (défaut `0.5`),
par campagne — pas une valeur globale. Deux raisons :
- Cohérent avec le seul précédent existant dans le code, `resolveReqDkp()`
  (`kvkGoals.js`), qui anticipe déjà un bloc `goals` dans la configuration de
  campagne pour des paramètres de barème modifiables par le Roi. **Précision
  importante** : ce bloc `goals`/`reqDkp` est aujourd'hui un **scaffold non
  câblé** — `resolveReqDkp` n'est appelé nulle part dans le code actuel. Ce
  n'est donc pas un pattern éprouvé en production, seulement une intention déjà
  posée dans le code ; cette spec serait la première à réellement l'utiliser.
- Un ratio global figerait la règle pour toujours ; un ratio par campagne
  permet de l'ajuster si l'expérience d'une saison montre que 50 % est trop
  dur ou trop facile, sans toucher au code (même logique que BR-010 : chaque
  domaine configurable par campagne).

Édition : nouveau champ dans `KvKConfigForm.jsx`, King-only (US-030) —
c'est une **nouvelle surface UI**, il n'existe aujourd'hui aucun champ de
configuration de barème dans ce formulaire (vérifié : `reqDkpValue`/`reqDkpMode`
n'y sont pas câblés).

### 8.4 Affichage

Étendre `KvkGoalsPanel` (pas de page dédiée) : la vue reste « qui a déclaré,
quel est son objectif » (le cadrage déjà en commentaire dans le fichier), mais
le rendu d'une ligne dépend désormais du **type** du compte (`war`/`filler`),
pas d'un statut main/filler :
- **`war`** : colonnes actuelles inchangées (Min KP, Goal KP, Min Dead, % Goal).
- **`filler`** : nouvelles colonnes (T4/T5 déclarés, pouvoir déclaré en points,
  objectif de perte en points, % d'atteinte une fois `t4Dead`/`t5Dead`
  connus) — pas de colonnes KP/DKP, qui n'ont aucun sens pour ce barème.

---

## 9. RBAC — inchangé

Le rôle vient de `roles/{uid}`, lié à l'utilisateur Discord-authentifié, **pas**
au compte de jeu. Un utilisateur avec 3 comptes garde un seul rôle pour les 3 ;
aucune règle de rôle par compte n'est introduite. Rien à modifier dans
`RoleContext.jsx` ni dans la logique de synchronisation Discord.

⚠️ **Rappel terminologique** : le rôle RBAC **Guerrier** (`ROLES.WARRIOR`,
R-002) et le **type de compte** `war` (« compte de guerre », F-025/BR-016)
sont deux notions **totalement indépendantes** — un utilisateur de rôle
Officier ou Roi peut très bien posséder des comptes de type `war` et
`filler`, et un Guerrier peut n'avoir que des fillers. Ne jamais les
confondre dans le vocabulaire produit ni dans une future implémentation.

---

## 10. Impact `firestore.rules`

### 10.1 `user_profiles`

Règle actuelle :
```
allow create: if isOwner(userId) && writesOnly(['governorId', 'updatedAt']);
allow update: if isOwner(userId) && changesOnly(['governorId', 'updatedAt']);
```
Doit devenir (forme conceptuelle, pas le code final) :
```
allow create: if isOwner(userId) && writesOnly(['governorId', 'accounts', 'updatedAt']);
allow update: if isOwner(userId) && changesOnly(['governorId', 'accounts', 'updatedAt']);
```
**Validation de forme** (`accounts` est un tableau d'objets `{governorId,
type, isPrimary}` avec `type` ∈ {war, filler} et exactement un
`isPrimary: true`) : Firestore Rules peut valider le type de donnée (`is
list`) et des contraintes simples, mais valider « exactement un élément à
`isPrimary: true` » dans un tableau demande une logique plus lourde (boucle
non native aux rules). **Recommandation** : valider la forme grossière côté
rules (c'est un tableau, chaque élément a les bonnes clés), laisser la
contrainte d'unicité de `isPrimary` au client — cohérent avec le niveau de
validation déjà appliqué ailleurs dans ce fichier de règles (garde-fous de
forme, pas de logique métier complète). **Note** : contrairement à la version
précédente de cette spec, `type` **n'a aucune contrainte de singularité** à
valider — seul `isPrimary` en a une (§5.3).

### 10.2 `war_availabilities`

**Aucun changement de règle nécessaire.** La règle actuelle ne dépend pas du
format du `docId` :
```
allow create: if isAuthenticated()
  && (request.resource.data.userId == request.auth.uid || isKingOrOfficer());
```
Elle continue de fonctionner à l'identique pour N documents par `uid`. Seule
amélioration optionnelle (non bloquante) : contraindre `governorId` à être
une chaîne non vide à la création, pour fiabiliser le regroupement en aval —
à évaluer séparément, hors périmètre strict de cette spec.

---

## 11. Questions ouvertes / Assumptions — état final

Toutes tranchées sauf une (A-020). Détail dans `Assumptions_Log.md`.

- **A-019 — ✅ Tranchée (4ᵉ passe, §3quater).** Chaque compte porte un type
  explicite (`war`/`filler`), choisi au claim, librement modifiable, sans
  singularité — plusieurs comptes `war` autorisés. Un flag séparé `isPrimary`
  (singulier, indépendant du type) porte l'identité/le miroir `governorId`.
  Remplace la version « 1 main + reste filler par élimination » puis « tag
  explicite main/filler » des passes précédentes.
- **A-020 — ⏳ Reste ouverte.** Le formulaire filler garde-t-il un sélecteur
  de disponibilité (Available/Partial/Unavailable) en plus de T4/T5 ? Non
  tranché explicitement par le Roi. **Défaut retenu en l'absence d'arbitrage**
  : pas de statut séparé — un filler sélectionné + T4/T5 saisis vaut présence.
- **A-021 — ✅ Tranchée (§3bis, décision 7).** Ratio de perte cible filler
  paramétrable **par campagne** (`kvk_config/current.goals.fillerDeathRatio`),
  pas globalement.
- **A-022 — ✅ Tranchée (§3bis, décision 8).** Recherche de claim étendue,
  exigence ferme du MVP : matcher par governor ID dans `players` (Top 300),
  `kvkStats` (scan KvK) et `kvkFillerStats` (`static_data/kvk_filler`, s'il
  existe). Hors périmètre : gouverneur absent des trois sources (très gros
  royaumes) — 2997 et 3341 non concernés.
- **A-023 — ✅ Tranchée (§3bis, décision 9).** Le gap d'unicité de claim
  (un `governorId` réclamable par plusieurs utilisateurs) reste acceptable
  pour le MVP, self-service sans validation. Piste future actée, hors
  périmètre : vérification par 2FA in-game (US-031).
- **A-024 — ✅ Tranchée (§3ter, décision 10).** Migration par repli en
  lecture sur l'ancien `docId` (`${kvkId}_${uid}`, traité comme le compte
  `isPrimary`/`war` par défaut), sans réécriture batch — option retenue faute
  d'enjeu réel (KvK 41 pas commencé au moment de l'arbitrage).

---

## 12. Critères d'acceptation

1. Un utilisateur mono-compte (cas d'aujourd'hui) ne voit **aucune**
   différence : pas de sélecteur de compte affiché, formulaire de compte de
   guerre inchangé, `governorId` toujours lisible où il l'était.
2. Un utilisateur peut réclamer un 2ᵉ (puis Nᵉ) compte depuis `ProfilePage`
   sans perdre le premier, en choisissant explicitement son type (Compte de
   guerre ou Filler) à la réclamation.
3. Un utilisateur peut avoir **plusieurs comptes de type Compte de guerre**
   simultanément — aucune contrainte de singularité sur le type. Un seul
   compte porte le badge Principal à la fois ; le désigner sur un autre
   compte dé-marque automatiquement l'ancien (réassignation simple, pas de
   blocage).
4. Un utilisateur peut retirer un compte sans affecter ses autres comptes ni
   ses déclarations passées (elles restent visibles dans l'historique/le War
   Dashboard, rattachées à leur `governorId`) ; retirer le compte principal
   alors qu'il en reste d'autres impose d'en désigner un nouveau.
5. Depuis le War Tracker, un utilisateur multi-compte peut déclarer sa
   disponibilité pour chacun de ses comptes séparément ; chaque compte a son
   propre document `war_availabilities`, retrouvable indépendamment. Le
   formulaire affiché dépend du **type** du compte, jamais d'un choix fait à
   la déclaration.
6. Le flux de déclaration filler permet de **sélectionner plusieurs** comptes
   filler réclamés et de saisir T4/T5 pour chacun en une seule action ; un
   filler non sélectionné cette fois n'est pas réinitialisé.
7. L'onglet Objectifs affiche, pour un compte filler ayant déclaré T4/T5, le
   pouvoir déclaré en points, l'objectif de perte, et — une fois
   `t4Dead`/`t5Dead` connus pour la campagne — le pourcentage d'atteinte.
8. Le ratio de perte cible filler est visible et modifiable par le Roi dans
   la configuration de campagne ; le changer recalcule l'objectif affiché
   sans redéploiement.
9. `WarDashboard`, `KvkGoalsPanel` et l'outil de fusion de campagnes
   (`MaintenanceTools`) continuent de fonctionner sans régression sur les
   campagnes existantes (documents à l'ancien `docId`).
10. Aucun chiffre filler (points de pouvoir déclaré, objectif) n'est jamais
    affiché sous un libellé qui pourrait le faire confondre avec la puissance
    réelle du jeu ou avec les points de morts du barème des comptes de guerre.
11. Nulle part dans l'UI ou les libellés le type de compte « Compte de
    guerre » n'est désigné par « Guerrier »/« Warrior » — terme réservé au
    rôle RBAC (R-002).
12. La recherche de claim dans `ProfilePage` trouve un gouverneur présent
    dans `players` (Top 300), `kvkStats` ou `kvkFillerStats`, pas seulement
    dans le Top 300.

---

## 13. Récapitulatif des IDs attribués

| ID | Intitulé |
|---|---|
| **E-007** | Multi-comptes par utilisateur (comptes de guerre + fillers) |
| **F-025** | Multi-comptes de profil — claim, retrait, type par compte, compte principal |
| **F-026** | Déclaration de guerre par compte, adaptée au type (War Tracker multi-comptes) |
| **F-027** | Objectifs filler paramétrables |
| **BR-016** | Modèle multi-comptes — type par compte (`war`/`filler`, plusieurs `war` autorisés) + `isPrimary` séparé, claim self-service inchangé *(amendée le 2026-07-27, 4ᵉ passe — remplace le modèle « un main désigné »)* |
| **BR-017** | Identité des déclarations de guerre par compte — `docId` à 3 segments, migration en lecture *(amendée — vocabulaire « main » remplacé par « compte principal/`isPrimary`»)* |
| **BR-018** | Barème d'objectif filler — échelle de points dédiée (T4=4, T5=10), jamais mélangée aux autres référentiels ; le type du compte sélectionne le barème (BR-016) *(amendée — vocabulaire)* |
| **US-027** | Gérer mes comptes (ajouter / retirer / typer / désigner le compte principal) |
| **US-028** | Déclarer la dispo de guerre pour chacun de mes comptes, formulaire adapté au type |
| **US-029** | Voir mon objectif filler dans l'onglet Objectifs |
| **US-030** | Le Roi configure le ratio de perte cible filler par campagne |
| **US-031** | *(Idée future, hors périmètre E-007)* Vérification d'appartenance de compte par 2FA in-game — voir §6.2 / `ProductBacklog.md` |

**Aucune nouvelle règle BR créée pour « le type pilote l'objectif »** (§3quater,
décision 14) : ce principe est documenté comme conséquence directe de BR-016
(modèle de compte) et rappelé dans BR-018 (formule filler), plutôt que d'ouvrir
une BR-019 redondante.
