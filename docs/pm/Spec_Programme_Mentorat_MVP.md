# Spec — Programme de mentorat, fiche d'état de compte (MVP)

> Date : 2026-10-21 · Auteur : PM · Statut : **socle construit, formulaire à faire**
> Épic **E-010**. Demandeur : **Helios**, responsable du programme. Arbitrages du Roi
> du 2026-10-21 intégrés.
>
> Origine : brief métier d'Helios (« Brief KD Manager — Recueil des fiches de
> compte »). Ce document n'en est pas la copie : il acte ce qui a été **coupé,
> réduit ou retourné** après confrontation au code et à la prod.

---

## 1. Ce que le brief demandait, et ce qu'on livre

Le brief décrit ~80 points de données, une saisie en 10 minutes sur mobile, des
captures d'écran en preuve, et un accès « mentor → ses mentorés seulement ».
Trois de ces quatre éléments ont été écartés, chacun pour une raison mesurée.

### 1.1 Les captures d'écran sont retirées (décision du Roi)

Elles représentaient **3 à 4 j-ing sur 18-24** : nouveau bucket UE, CORS à poser et
à tester, trois callables, compression client, règle de cycle de vie, rétention à
arbitrer, et une surface RGPD nouvelle sur des inventaires nominatifs.

**Conséquence à assumer et à annoncer** : sans dépôt in-app, les joueurs enverront
leurs captures **sur Discord**, ce qui est *pire* pour la confidentialité.
L'annonce doit dire explicitement « n'envoyez pas vos captures sur Discord ».

### 1.2 Les deux blocs matriciels sont réduits, pas supprimés (décision du Roi)

| Bloc du brief | Demandé | Livré |
|---|---|---|
| Matériaux | cuir / fer / ébène / os **par rareté** ≈ 20 nombres | **`legendaryMaterials`** — 1 nombre |
| Têtes | dorées, argentées, **sculptures par commandant** ≈ 10-15 nombres | **`goldenHeads`** — 1 nombre |

Raison : ce sont les champs les plus lents à saisir et les moins décisionnels. Un
mentor ne fixe pas un objectif sur « 1 240 cuirs épiques », il dit « monte
Charlemagne à 5-5-1-1 ». La réduction garde le signal et supprime la matrice.

**~80 points de données → 27.** C'est ce qui fait tenir le lot 1 en une semaine.

### 1.3 L'accès « scopé par mentor » n'existe pas, et n'a pas lieu d'être

La matrice du brief se contredit : les 9 mentors **sont** membres du Conseil, et le
Conseil « lit toutes les fiches » (B11). Le « et seulement celles-là » de B7 est
donc un **filtre d'affichage**, pas une frontière de sécurité.

Mesuré sur 2997 : **Officer = 13, King = 1 → 14 lecteurs**. Le gate `rôle ≥ Officer`
suffit. Économie : ~2 j-ing et une mécanique relationnelle en moins.

> Si Helios retire « lire toutes » au Conseil, le scoping redevient nécessaire. La
> solution est alors de **dénormaliser `mentorUid` sur la fiche** —
> `resource.data.mentorUid == request.auth.uid`, sans aucun `get()`. Un
> `squads.mentees[]` ne marcherait pas : **les règles Firestore ne savent pas
> faire de requête**, donc le mentor ne pourrait pas lister ses fiches.

### 1.4 Le levier qui change tout : la fiche remplie par le mentor

Le brief suppose une saisie en self-service. **Elle ne peut pas atteindre 100 %** :

```
Liste de suivi du Roi (static_data/kvk) : 41 comptes principaux
  réclamés par un utilisateur           : 18
  SANS aucun utilisateur                : 23      (mesuré le 2026-10-21)
Utilisateurs ayant un rôle : 45, dont 28 sans compte principal réclamé
```

Autoriser un mentor ou le leadership à remplir **à la place** d'un mentoré débloque
trois choses d'un coup : les 23 comptes orphelins peuvent avoir une fiche, le
critère « 100 % » devient atteignable, et la contrainte « 10 minutes sur mobile »
cesse d'être bloquante (le mentor saisit au calme pendant l'entretien).

**Et ça déplace la redevabilité** : Helios suit **9 mentors** responsables de 3-4
fiches, au lieu de relancer 40 joueurs. B10 devient « où en est chaque escouade ».

---

## 2. Décisions structurantes

### BR-027 — La fiche est clée par `governorId`, pas par `uid`

Un compte orphelin n'a pas d'`uid`. Clé par uid ⇒ 23 comptes sans fiche possible.

**Contrepartie assumée** : la propriété côté joueur repose sur la réclamation de
compte, qui n'est **pas vérifiée** (A-023). Quelqu'un pourrait réclamer le
gouverneur d'un autre pour lire sa fiche.

Ce risque est réel mais **marginal aujourd'hui** : `war_availabilities` expose déjà
`resources`, `speedups.total` et les paires de commandants de **123 joueurs** à
tout compte connecté (`allow read: if isAuthenticated()`). Durcissement prévu en
1b (`claimVerified` posé par le leadership), à traiter avec le correctif ci-dessous.

### Correctif préalable — `war_availabilities` (bloquant avant l'annonce)

Le brief promet « aucun joueur ne peut ouvrir la fiche d'un autre », justifié par
« un ennemi qui connaît nos accélérateurs de soin sait combien de temps nous
pouvons tenir ». **Cette information est déjà lisible de tous**, pour 123 joueurs.

Livrer une fiche confidentielle à côté d'une collection ouverte portant les mêmes
données serait du théâtre. Lecture à restreindre à « propriétaire ou leadership ».
Estimation : 0,5 j-ing. **À faire avant l'annonce du programme.**

### BR-028 — Versions figées, horodatées par le serveur

Critère de réussite n°5 : « l'ancienne version reste consultable ». Les versions
sont **create-only**, `takenAt == request.time` (donc inantidatables), et
supprimables par leur propriétaire ou le Roi (droit à l'effacement).

### BR-031 — Périmètre copié, jamais lu en direct

Le dénominateur du « qui doit avoir une fiche » est la **liste de suivi du Roi**
(`static_data/kvk`, 41 comptes, semée depuis l'onglet `BS_Report`). Elle est
**copiée** dans `mentoring_program/main` au lancement, jamais lue en direct :
`static_data/kvk` est réécrite à chaque ouverture de KvK, et le périmètre du
programme changerait tout seul.

---

## 3. Modèle de données

```
mentoring_program/main          // Roi écrit, Conseil lit
  { title, deadline, startsAt, scopeGovernorIds[], schemaVersion }

mentoring_sheets/{governorId}   // fiche courante
  { governorId, name, blocks, blockMeta, status,
    enteredBy, enteredByRole, createdAt, updatedAt }

mentoring_sheets/{governorId}/versions/{kvkId}_{pre|post}   // IMMUABLE
  { takenAt (serveur), takenBy, blocks }
```

`enteredBy` trace **qui a saisi** : le joueur voit « fiche remplie par ton mentor »,
et le Conseil sait à quel mentor réclamer une fiche manquante.

Le versionnage reprend la clé des déclarations (`${kvkId}_…`), ce qui aligne
gratuitement « comparer deux fiches dans le temps » (B8) sur des bornes de campagne
que l'app connaît déjà.

### Le schéma pilote tout

`src/lib/mentoringSchema.js` décrit les 27 champs **une fois**, et pilote le rendu,
la complétude (B4), la comparaison de versions (B8), l'export (B14) et les clés
i18n. Ajouter un champ le fait apparaître partout sans toucher un écran.

**`null` n'est pas `0`.** C'est le piège d'`AvailabilityForm`, dont les défauts à 0
rendent « je n'ai rien » indiscernable de « je n'ai pas répondu ». Tout part à
`null` ; `0` est une réponse valide et compte pour la complétude.

### Ce qu'on récupère de la déclaration existante

Mesuré sur les 143 déclarations de 2997 : **123** portent `resources`
(food/wood/stone/gold), **123** portent `speedups.total`, **110** portent les paires
de commandants. La fiche s'ouvre **pré-remplie** depuis la dernière déclaration —
le joueur corrige au lieu de saisir.

> **On ne fusionne pas les deux collections.** `war_availabilities` est gelée au
> démarrage de campagne (BR-022), alors que la fiche doit se mettre à jour **après**
> le KvK (critère n°5). On réutilise les **composants** et les **données**, pas le
> document.

---

## 4. Le gain caché : zéro Cloud Function

Sans captures, sans agrégats, sans relances automatiques, **le lot 1 est du front +
`firestore.rules`**. Rien d'autre.

Cela supprime tout ce qui a mal tourné cette année sur 2997 : pas de déploiement
Functions, donc pas de piège `PERFORMANCE_SOURCE` dans un `.env` gitignoré, pas de
`scheduledSync` recréé, pas de CORS à poser, pas de bucket. Le déploiement se
résume à `node scripts/deploy-rules.cjs prod` et un front.

---

## 5. État d'avancement

| Pièce | État |
|---|---|
| Règles d'accès + matrice (BR-027/028/031) | **Fait** — `firestore.rules` |
| Tests de règles en émulateur | **Fait** — 18 cas neufs, **57 tests verts** |
| Schéma des 27 champs + complétude + diff | **Fait** — `src/lib/mentoringSchema.js` |
| Tests du schéma | **Fait** — 11 cas, verts |
| Miroir `warGovernorIds` (AuthContext) | **Fait**, + backfill des 20 profils concernés |
| Formulaire 4 étapes + mode « au nom de » | À faire |
| Carte « Ma fiche » sur `/me` | À faire |
| Écran de suivi Conseil | À faire |
| i18n (~60 clés × 10 locales) | À faire |

**Reste estimé : 4 à 6 j-ing.** Le socle le plus risqué (accès, immuabilité des
versions) est posé et prouvé.

---

## 6. Ce qui n'est pas tranché

- **Helios** : les dates absolues du calendrier, et confirmation que la liste de
  suivi (41) est bien le périmètre du mentorat — elle peut inclure des partants ou
  manquer des recrues.
- **Le Roi** : classement Gratuit/Premium du module ; rétention des fiches ; et le
  statut de l'étiquette « Deadweight » sur `/me`, que le brief interdit côté joueur
  alors qu'elle s'y affiche aujourd'hui (prolonge BR-019).
- **Juridique** : la collecte est faite *auprès de la personne* (art. 13), ce qui
  est plus simple que le scraping des scans, mais **aucune notice n'existe** et
  « obligatoire pour tous » retire la liberté du consentement. Une notice d'une
  page est à écrire avant l'annonce.

## 7. Lot 0 — réclamation de compte (non prévu au brief, bloquant)

**28 joueurs sont déjà venus dans l'app** (ils ont un rôle) mais n'ont jamais
réclamé leur gouverneur. Un rappel bloquant sur `/me` en récupérerait une grande
part ; les 23 orphelins restants passent par la saisie mentor.

Sans ce lot, le critère « 100 % » reste inatteignable quelle que soit la qualité du
formulaire.

---

## 8. Numérotation

Épic **E-010**. Features **F-039** (fiche, lot 1), **F-040** (escouades, lot 2),
**F-041** (pilotage, lot 3). Règles **BR-027** (accès), **BR-028** (versions
immuables), **BR-031** (périmètre copié, fillers exclus, fiche hors gel BR-022).

> ⚠️ **Collision à corriger** (hors périmètre) : `Spec_Rappels_Milestones.md`
> réserve BR-024/025/026 et F-037 sans les avoir inscrits au SSOT, et **BR-024 a
> été repris** entre-temps par `Spec_Parametrage_Objectifs_KvK.md`.
