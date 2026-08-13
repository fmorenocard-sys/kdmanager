# Brief — « Voir en tant que rôle » (impersonation UI, King-only)

> Date : 2026-08-13
> Statut : **V1 LIVRÉE (2026-08-13)** sur branche `feat/espace-perso-moi` + canal de preview staging,
> à valider avant fusion `main`. Voir F-033 (`FeatureInventory.md`) et US-045 (`ProductBacklog.md`)
> pour le détail de ce qui a été construit. Ce brief reste la référence de cadrage — les 3 points
> ouverts du §6 ont été tranchés **par défaut** (recommandations de ce brief retenues telles
> quelles, sans arbitrage Roi explicite distinct) : **King-only strict** (pas d'extension Officier),
> **persistance en mémoire** (option (a), reset au rechargement). Le 3ᵉ point — disponibilité sur
> les instances pilotes en marque blanche (KD 3341) — **reste ouvert**, non tranché, la V1 n'a été
> déployée que sur 2997/staging.
> Origine : proposition du Roi, inspirée de la fonctionnalité Discord « Visualiser le serveur en
> tant que rôle ».

---

## 0. Cadrage — ce que c'est et ce que ce n'est pas

**Demandé** : un mode King-only qui bascule le **rôle affiché** dans l'app (Guest / Warrior /
Officer / King) pour prévisualiser ce que voit chaque rôle — gating de navigation, `AccessGate`,
rendus conditionnels — sans se déconnecter ni ouvrir un second compte de test.

**Ce que ce n'est pas** : ce n'est **pas** un outil de test de sécurité, ni un mécanisme
d'impersonation serveur. C'est un **outil de démo/QA UI** au service du Roi et — accessoirement —
des officiers si le Roi choisit d'étendre l'accès (question ouverte, §4). Voir la nuance
présentation/sécurité, cœur de ce brief, en §2.

**Ce que je tranche seul dans ce brief** : le périmètre V1 (§3), la lecture du mécanisme technique
existant qui rend l'outil possible sans toucher aux règles serveur (§2), le placement recommandé
(§4), les garde-fous (§5). **Ce qui reste au Roi** : go/no-go de construction, et l'ouverture
éventuelle au-delà du King seul (§6).

---

## 1. Problème & intention

Aujourd'hui, vérifier ce que voit un Warrior ou un Officer suppose soit de se souvenir du
comportement attendu en relisant le code (`RoleContext.isAuthorized`, les `AccessGate` par page),
soit de disposer d'un second compte réellement affecté à ce rôle. Le premier est lent et sujet à
erreur (un oubli de gate se découvre en prod, pas en revue) ; le second n'existe pas de façon
outillée aujourd'hui — c'est exactement le trou nommé par **BUG-008** (`ProductBacklog.md`),
actuellement sans solution.

L'idée du Roi cible un besoin plus léger que BUG-008 : pas un harnais de test e2e avec fixtures,
juste un **œil rapide en une bascule** sur le gating UI d'un rôle donné, en conditions quasi
réelles (données de prod, dans le vrai navigateur), sans monter une infrastructure de fixtures.

---

## 2. La nuance qui doit être dite — présentation, pas sécurité

**Vérifié dans le code** (`src/context/RoleContext.jsx`) : le rôle affiché dans toute l'app vient
d'un seul état React, `role`, alimenté par un `onSnapshot` sur `roles/{uid}` (le **vrai** uid
Firebase Auth de l'utilisateur connecté). Tout le gating UI — `BottomNav`/`Sidebar` (filtrage
d'entrées), `AccessGate` (pages leadership, BR-009/BR-011), les rendus conditionnels `isKing`/
`isOfficer` dans les pages — lit ce même état via `useRole()`.

Un override King-only de cet état (`viewAsRole`) est donc **mécaniquement suffisant** pour
prévisualiser tout le gating UI existant : c'est la même variable que tout le monde lit. Techniquement
peu coûteux — c'est précisément pour ça que l'idée est attractive.

**Mais** — et c'est le point que ce brief refuse de laisser implicite — **les Security Rules
Firestore ne lisent jamais cet état React.** Elles évaluent `request.auth.uid` côté serveur contre
`roles/{uid}` (BR-002, `isKing()`/`isKingOrOfficer()` dans `firestore.rules`). Basculer l'affichage
sur « Warrior » ne change strictement rien à ce que Firestore autorise le Roi à lire ou écrire : ses
requêtes continuent de s'exécuter avec **ses vraies permissions de King**.

Conséquence concrète : si un composant visible en mode « vue Warrior » interroge une collection
leadership-only (`kvk_race`, par exemple), la donnée **reviendra quand même** — parce que c'est
le vrai uid du Roi qui l'a demandée, pas un uid Warrior. Le seul rempart qui empêcherait
effectivement un vrai Warrior de voir cette donnée, c'est la règle serveur — que l'outil ne
simule pas. **L'outil prévisualise le gating UI/nav (menus, onglets, `AccessGate`), jamais les
restrictions de données côté serveur.**

C'est exactement le pattern déjà assumé pour BR-009/BR-011/BR-015 (A-017) : le masquage de page est
« presentation-only », la vraie barrière reste `firestore.rules`. Ce brief ne fait qu'étendre ce
principe déjà en place à un nouvel outil, sans le rouvrir.

**Risque produit si ce n'est pas dit clairement** : une bascule « Voir en tant que Warrior » qui
« marche » visuellement (l'UI se comporte bien) peut donner une fausse impression de garantie de
sécurité — alors qu'aucune règle serveur n'a été exercée. Le nom de la fonctionnalité, la copie du
bandeau et la doc doivent lever toute ambiguïté (§5).

---

## 3. Périmètre proposé (V1)

**Dedans**

- Sélecteur King-only (4 options : Guest, Warrior, Officer, King) — probablement dans
  l'Administration (§4).
- Bandeau persistant, visible sur **toutes** les pages tant que l'override est actif : « Tu
  visualises en tant que {rôle} » + bouton de sortie immédiate.
- L'override porte uniquement sur `role` (`RoleContext`) — rien d'autre.
- Reset automatique à la navigation hors de session (rechargement de page) — voir §5, décision de
  persistance à trancher.

**Dehors, explicitement (V1)**

- Simuler l'état Discord-vérifié (BR-008) — le Roi reste Discord-vérifié quel que soit le rôle
  affiché ; les vues Fillers/Progressions gérées par BR-008 ne changent pas avec cette bascule.
- Simuler un état multi-compte (F-025) différent du sien — le Roi ne peut pas prévisualiser l'UI
  « 2 comptes réclamés, 1 filler en attente » d'un Warrior donné sans en avoir réellement un.
- Simuler l'activation de modules par instance (BR-015) — orthogonale au rôle, déjà couverte par
  les variables de build par instance.
- Toute élévation de privilège inverse (un Officer qui se verrait King) — le sélecteur ne doit
  jamais permettre de monter au-dessus du rôle réel de l'acteur (non pertinent en V1 puisque
  King-only, mais à garder si l'accès est un jour étendu, §6).

---

## 4. Placement — recommandation argumentée

Deux options posées par la demande initiale :

**A. Administration (`/admin`)** — nouvelle section du rail interne (aux côtés de Data/Campagne/
Calendrier/Course/Maintenance), cohérent avec BR-020 (l'ingestion et les outils d'ops vivent déjà
là) et avec la direction déjà actée d'un futur rôle opérateur (A-033).

**B. Switch dans le menu de compte** (avatar, en haut à droite) — accessible depuis n'importe quelle
page sans détour par `/admin`.

**Recommandation : A, avec un bandeau global qui survit à la navigation hors de `/admin`.** Trois
raisons : (1) c'est un outil d'ops/QA, pas une fonction de compte personnel — il rejoint la famille
d'outils déjà groupée dans `/admin` (BR-020, MaintenanceTools) plutôt que le menu de compte qui sert
aujourd'hui à la gestion du profil personnel (F-025) ; (2) le coût d'implémentation est identique
(le bandeau global doit exister dans les deux cas pour rester visible pendant la navigation — seul
le point d'activation change) ; (3) ranger l'activation dans `/admin` la rend moins « facile à
déclencher par accident » qu'un item de menu toujours visible en haut de chaque écran. Le bandeau,
lui, doit être rendu au niveau du layout global (`App.jsx`), pas seulement sur `/admin`, sinon la
bascule perd tout son intérêt dès qu'on quitte la page.

---

## 5. Garde-fous — ce qui doit être vrai avant construction

1. **Copie sans ambiguïté.** Le bandeau et le libellé du sélecteur doivent dire « aperçu du gating
   d'écran » ou équivalent — jamais un mot qui suggère un test de permissions serveur. Proposition :
   *« Tu visualises l'interface en tant que {rôle} — les données restent celles de ton compte
   King »* plutôt qu'un simple « Tu visualises en tant que {rôle} » elliptique.
2. **Le contrôle de sortie ne doit jamais dépendre du rôle simulé.** Le bandeau/bouton de sortie
   doit être rendu à partir du **rôle réel** de l'acteur (celui qui vient de `roles/{uid}`), jamais
   du rôle affiché — sinon basculer sur « Guest » masquerait potentiellement sa propre sortie de
   secours si le bandeau était mal câblé.
3. **Persistance à trancher, pas supposée.** Deux options : (a) état en mémoire uniquement (reset à
   chaque rechargement — le plus sûr, oblige à réactiver consciemment) ou (b) persisté en
   `sessionStorage` (survit à un refresh, mais jamais entre deux sessions/onglets). Recommandation :
   (a) par défaut — un override qui « colle » silencieusement après un refresh est le scénario où un
   Roi oublie qu'il est en train de visualiser en Warrior et croit, à tort, que son compte a perdu
   ses accès. **Décision Roi si (b) est préféré pour le confort d'usage** (§6).
4. **Ne jamais toucher `firestore.rules`.** Ce brief exclut explicitement toute évolution des règles
   serveur — le mécanisme reste strictement client-side. S'il s'avérait qu'on veuille un jour une
   vraie impersonation serveur (Firebase Admin SDK, custom claims temporaires), ce serait un chantier
   distinct, avec sa propre analyse de risque — pas une extension naturelle de celui-ci.

---

## 6. Zones d'ombre — su vs supposé

**Su (code vérifié)** : `RoleContext.jsx` centralise le rôle dans un seul état consommé par tout le
gating UI (§2) ; `firestore.rules` évalue le vrai `uid`, indépendamment de tout état client (BR-002) ;
le pattern « masquage UI ≠ barrière de sécurité » est déjà assumé ailleurs dans le produit (BR-009,
BR-011, BR-015/A-017) — cette feature ne l'invente pas, elle l'étend à un nouvel outil.

**Supposé, nommé (A-043)** : que le périmètre « rôle seul » (sans Discord-vérifié, sans
multi-compte, sans module) reste utile en pratique — un Roi qui veut vérifier « est-ce que
`KvkGoalsPanel` s'affiche bien pour un Warrior » y trouve son compte, mais un Roi qui voudrait
vérifier « que voit un Warrior avec 2 comptes fillers non déclarés » ne le pourra pas avec cet
outil seul (il faudrait un vrai compte de test — le terrain de BUG-008, pas de celui-ci).

**Tranché par défaut pour la V1 livrée (2026-08-13, sans arbitrage Roi distinct — recommandations
de ce brief retenues telles quelles)** :
- Accès **King-only strict** — pas d'extension Officier en V1. `canImpersonate` est câblé sur
  `realRole === King` dans le code livré (`RoleContext.jsx`). Rouvrir l'extension Officier reste
  possible plus tard mais suppose une décision Roi explicite, pas un acquis de la V1.
- Persistance **en mémoire** (option (a)) — reset au rechargement, pas de `sessionStorage`.

**Reste non tranché** :
- Faut-il aussi le proposer sur les instances pilotes en marque blanche (KD 3341) ou le réserver à
  2997 pour l'instant ? Aucun blocage technique identifié, mais pas demandé explicitement par le
  Roi à ce stade — à confirmer plutôt que supposé inclus. La V1 livrée n'a été déployée que sur
  2997/staging ; extension à 3341 non engagée.

---

## 7. Lien avec BUG-008 — complémentaire, pas substitut

BUG-008 (`ProductBacklog.md`) vise un harnais de fixtures + bypass d'auth en émulateur pour tester
et prévisualiser des écrans connectés avec des **données factices** couvrant rôle **et** identité
(Discord-vérifié, multi-compte, état de campagne) — un chantier de test e2e/QA, plus lourd, qui
exerce aussi les vraies restrictions Firestore via un uid de fixture distinct.

« Voir en tant que rôle » est plus léger et plus rapide à construire, mais couvre strictement moins :
un seul acteur (le Roi lui-même), en prod, avec un seul axe de variation (le rôle). Les deux outils
répondent à des besoins différents et peuvent coexister : celui-ci pour un coup d'œil manuel rapide
sur le gating UI, BUG-008 pour une couverture de test automatisée et fidèle aux identités réelles.
Aucune des deux features ne rend l'autre inutile.

---

## 8. Recommandation & prochaines étapes

**Recommandation** : construire une **V1 volontairement étroite** — rôle seul, King-only,
placement Administration + bandeau global, override en mémoire (non persisté). Effort estimé
**faible** (un état dans `RoleContext`, un composant de bandeau, un sélecteur dans `/admin`) —
mais non chiffré formellement ici, à faire avant priorisation face au reste du backlog (F-032
staging, E-007 restant, BUG-007/BUG-008).

**Prochaines étapes** :
1. Le Roi tranche les 3 points ouverts du §6 (accès King-only ou extensible, persistance,
   pilotes marque blanche).
2. Si go : découpage en une User Story exécutable unique (le périmètre V1 tient dans un seul lot,
   pas besoin d'un découpage multi-lots façon F-032).
3. Pas de maquette Claude Design nécessaire pour la V1 — un bandeau + un sélecteur simple, pattern
   déjà couvert par la charte v2 existante (bannières `AccessGate`, boutons rail admin).

---

## 9. Rattachement aux référentiels

- **F-033** (nouvelle entrée `FeatureInventory.md`) — « Voir en tant que (rôle) », statut *Idée, à
  cadrer*.
- **US-045** (nouvelle entrée `ProductBacklog.md`) — opportunité non priorisée, sans epic dédié
  (outil d'ops/QA, pas une fonctionnalité joueur), référence F-033 et BUG-008.
- **BR-021** (nouvelle règle `SSOT.md`) — codifie le caractère *presentation-only* et *King-only* du
  mécanisme, et son articulation avec BR-002/BR-008/BR-009/BR-011/BR-015.
- **A-043** (nouvelle hypothèse `Assumptions_Log.md`) — le périmètre « rôle seul » est supposé
  suffisant pour l'usage visé ; nomme explicitement ce qu'il ne couvre pas (Discord-vérifié,
  multi-compte, modules, contexte de campagne).
- **`Matrice_Acces.md`** — note ajoutée en « Notes transverses » signalant l'outil (proposé, non
  construit) et rappelant la distinction présentation/sécurité pour quiconque relit la matrice.
- **Pas de renumérotation** — `docs/qa/SSOT.md` a son propre espace `F-xxx` indépendant de
  `FeatureInventory.md` (dérive déjà connue et documentée dans **BUG-007**, ex. P-002 obsolète) ;
  ce brief n'ajoute délibérément **pas** de nouvelle entrée `F-xxx` dans `SSOT.md` pour ne pas
  aggraver cette dérive avec un nouveau doublon — seule `BR-021` y est ajoutée (l'espace `BR-xxx`
  est, lui, partagé et tenu à jour entre les deux documents).
