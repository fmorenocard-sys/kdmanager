# Étude — Activation de modules par instance (marque blanche)

> Date : 2026-07-27 · Statut : **arbitrée par le Roi le 2026-07-27** — épic
> `E-006`, feature `F-023`, règle `BR-015`, user stories `US-024`/`US-025`
> inscrites dans les référentiels (voir `ProductBacklog.md`,
> `FeatureInventory.md`, `docs/qa/SSOT.md`).
> Origine : sur le pilote KD 3341, plusieurs pages/onglets sont vides — pas
> par manque de données à venir, mais parce que le module n'a **pas lieu
> d'exister** pour ce royaume (ex. KvK Race : pas de course de coalition
> déployée sur 3341). Question posée : faut-il pouvoir déclarer, par instance,
> quels modules un royaume propose ?

> **Hors périmètre — déjà tranché.** Les **états vides** (placeholder explicite
> quand un bloc n'a pas encore de données, ex. Trophées avant le premier
> événement) sont traités séparément comme hygiène UX. Ce document ne les
> rediscute pas : il porte uniquement sur la question distincte de **savoir si
> un module doit exister du tout** pour une instance donnée.

---

## ⚖️ Décisions du Roi (2026-07-27, corrigées le même jour)

| Décision | Arbitrage |
| :--- | :--- |
| **Classification des modules** | **Fixes** (jamais désactivables) : Dashboard, Profil, Admin, War Tracker, Hub KvK **entier** — onglets **Performance**, **Progressions** et **Race/Course**. **Optionnels** (activables/désactivables par instance) : Banque, Trophées, Deadweight — **tous au niveau page**. Tranche A-016 (ci-dessous, §6). |
| **Granularité** | **Corrigée : page uniquement.** Plus aucun module optionnel n'étant un onglet, la granularité « onglet » envisagée au §2/§3 initial n'est plus nécessaire — le mécanisme se réduit à un filtre au niveau page. |
| **Historique de la décision — KvK Race** | Initialement classé **optionnel, granularité onglet** (c'était le cas déclencheur de cette étude — KD 3341 sans coalition de course). **Reclassé FIXE le jour même** : « la KvK Race a forcément lieu du moment qu'il y a un KvK, donc elle doit être présente » (le Roi). Conséquence : quand aucun scan de course n'est chargé sur une instance, l'onglet Race affiche un **état vide** (composant `EmptyState` existant), il n'est **pas masqué** — c'est un problème d'hygiène UX (hors périmètre de cette étude, cf. encadré en tête de document), pas un problème d'activation de module. |
| **Cascade Dashboard** *(inchangée)* | Le Dashboard est fixe, mais il embarque un **bloc Banque** et un **bloc évolution de pouvoir**. Le bloc Banque doit **disparaître** si le module Banque est désactivé sur l'instance — le toggle se propage aux blocs embarqués, pas seulement à la nav/aux routes. Le bloc évolution de pouvoir est un cas d'**état vide** (pas d'historique) — hors périmètre de cette étude, traité ailleurs. |
| **Contexte pilote KD 3341** *(note, pas une décision d'implémentation)* | Trophées : pas suivi régulièrement aujourd'hui, « mais ça peut évoluer ». Deadweight : doctrine active. KvK Race : non déployé — l'onglet restera visible sur l'instance et affichera son état vide, il ne sera pas désactivé (Race n'est plus désactivable). |

Ces décisions remplacent les hypothèses ouvertes du §6 initial (A-016 à A-018,
désormais tranchées ou reformulées) et sont reflétées dans les sections
ci-dessous.

---

## 1. Le problème, reformulé

Deux questions se ressemblent et se sont mélangées dans la demande initiale —
il faut les séparer :

1. *« Ce bloc n'a pas encore de données »* → état vide. Résolu ailleurs.
2. *« Ce module ne concerne pas ce royaume »* → **activation de modules**.
   Objet de cette étude.

La distinction compte parce que les réponses sont opposées : un état vide doit
rassurer (« pas de données pour l'instant, revenez plus tard ») ; un module
non pertinent doit **disparaître de la navigation**, pas s'afficher vide — le
faire apparaître videmment inviterait la question « pourquoi ce bloc existe
et ne sert à rien ? ».

**Trois enjeux motivent le sujet**, dans un projet qui est déjà en marque
blanche (`src/config/branding.js`, pilote KD 3341, voir `Plan_Pilote_KvK.md`) :

- **Découvrabilité / professionnalisme** — une navigation à six entrées dont
  deux ne mènent nulle part d'utile donne une impression de produit inachevé,
  précisément sur l'instance qui sert de vitrine commerciale (le pilote).
- **Démo commerciale** — `Etude_Commercialisation_SaaS.md` (§8) pose la
  logique freemium : un socle gratuit qui montre la valeur. Un futur Roi
  prospect qui visite une instance de démo ne doit voir que ce qui est
  réellement opérationnel pour lui, pas un inventaire complet de fonctions
  vides qui ne racontent rien.
- **Notion d'offre/tier (à venir, pas décidée ici)** — la frontière
  gratuit/payant de l'étude commerciale (§8) n'est pas tranchée. Mais si elle
  l'est un jour, elle se traduira très probablement par « telle instance a
  accès à tel module » — c'est-à-dire exactement ce mécanisme. Ce document ne
  décide **pas** de tiering ; il pose la brique qui le rendra possible plus
  tard sans repasser par une refonte.

---

## 2. Inventaire des modules — état réel du code

Lu depuis `src/App.jsx`, `src/components/BottomNav.jsx`, `src/pages/`.

| Module | Route(s) | Nav | ID(s) SSOT | Accès aujourd'hui | Classification (Roi, 2026-07-27) |
|---|---|---|---|---|---|
| **Dashboard** | `/` | Sidebar + BottomNav | F-001 / P-001 | Tous | **Fixe** — mais embarque un bloc Banque (cascade, voir plus bas) et un bloc évolution de pouvoir (état vide, hors périmètre) |
| **War Tracker** | `/war-tracker` (disponibilités, War Dashboard, onglet Objectifs F-014) | Sidebar + BottomNav | F-011/F-013/F-014 / P-002 | Warriors+ | **Fixe** — module « hook » gratuit identifié par l'étude commerciale (§5bis), le cœur du produit |
| **KvK Performance** (onglets Performance / Comptes secondaires / Progressions / **Course**) | `/kvk` | Sidebar + BottomNav | F-008/F-015/F-016/F-022 / P-003 | Tous (onglets Fillers et Progressions Discord-gated BR-008, Timeline King/Officer BR-011) | **Fixe — conteneur et tous ses onglets**, y compris Course (voir ligne KvK Race pour l'historique de la décision) |
| **Trophées** | `/trophies` | Sidebar + BottomNav | F-004 / P-004 | Tous | **Optionnel (page)** — un royaume qui ne suit pas MGE/Zenith n'a rien à y montrer (cas KD 3341 : pas suivi aujourd'hui, mais susceptible d'évoluer) |
| **Deadweight** | `/deadweight` | Sidebar + BottomNav (King/Officer, BR-009) | F-002 / P-005 | King/Officer | **Optionnel (page)** — suppose une doctrine de suivi des inactifs que tout royaume n'a pas forcément adoptée (KD 3341 : doctrine active — resterait activé) |
| **Banque** | `/bank` | Sidebar + BottomNav | F-003 / P-006 | Tous | **Optionnel (page)** — suppose une banque de royaume organisée ; désactiver ce module fait **cascader** la disparition du bloc Banque du Dashboard |
| **KvK Race** (course de coalition) | `/kvk-race` (legacy, compat) + onglet **Course** dans le Hub KvK | Aucune entrée de nav dédiée depuis la refonte — vit comme onglet | F-018/F-019/F-020 / P-008 | King/Officer | **Fixe.** *Historique* : classé optionnel à granularité onglet dans la première version de cette étude (c'était le cas déclencheur — KD 3341 sans coalition de course) ; **reclassé fixe le 2026-07-27** — « la KvK Race a forcément lieu du moment qu'il y a un KvK » (le Roi). Sans scan chargé : état vide (`EmptyState`), pas de masquage |
| **Admin** | `/admin` | Sidebar (zone dédiée) | — *(non listé en P-xxx dans SSOT — écart mineur à signaler à la QA, hors périmètre ici)* | King | **Fixe** — c'est l'endroit où vivraient les interrupteurs de modules ; il doit rester présent tant qu'au moins un module a de la config |
| **Profil** | `/profile` | Menu compte | P-007 | Tous | **Fixe** — personnel, pas un module métier |

**Lecture (corrigée le 2026-07-27).** Le module initialement déclencheur de
cette étude (KvK Race) a finalement été reclassé **fixe** par le Roi : une
course a lieu dès qu'il y a un KvK, elle ne peut donc jamais être « en trop »
sur une instance ; l'absence de scan relève d'un état vide, pas d'une
désactivation. Conséquence directe : **plus aucun module optionnel n'est un
onglet** — les trois modules optionnels (Banque, Trophées, Deadweight) sont
tous des pages de premier niveau. Le mécanisme d'activation se réduit donc à
**une seule granularité, la page** ; la granularité « onglet » envisagée dans
la première version de cette étude n'est plus nécessaire et est retirée du
périmètre.

**Exigence ferme — cascade Dashboard (inchangée).** Le Dashboard est fixe,
mais n'est pas monolithique : il embarque un bloc « données Banque » qui
dépend directement du module Banque. Si Banque est désactivé sur une
instance, ce bloc doit disparaître du Dashboard — le registre de modules ne
filtre donc pas seulement la nav/les routes de premier niveau, il doit aussi
être consultable par un composant enfant (le bloc Banque du Dashboard) pour
se masquer lui-même. Le second bloc du Dashboard, évolution de pouvoir, ne
dépend d'aucun module optionnel : son absence de données relève d'un état
vide, hors périmètre de cette étude (cf. encadré en tête de document).

---

## 3. Proposition — un registre de modules, en deux temps

**Principe** : une **troisième dimension** de filtrage, orthogonale à celle
qui existe déjà. Aujourd'hui, `Sidebar` et `BottomNav` filtrent déjà leurs
listes par rôle (`isAuthorized([...])`, BR-008/BR-009/BR-011). Il s'agit
d'ajouter le même genre de filtre, mais sur un axe différent :

- **« Qui peut voir ce module »** = rôle (existant, ne change pas).
- **« Ce royaume propose-t-il ce module »** = activation d'instance (nouveau,
  objet de cette étude).

Les deux se cumulent : Deadweight reste réservé King/Officer **et** peut être
désactivé pour un royaume qui n'applique pas cette doctrine — les deux
filtres s'appliquent indépendamment, exactement comme le code le fait déjà
pour les rôles dans Sidebar et BottomNav.

**Granularité — page uniquement (corrigé le 2026-07-27).** Les trois modules
optionnels (Banque, Trophées, Deadweight) sont tous des pages de premier
niveau ; KvK Race, seul module qui aurait justifié une granularité « onglet »,
a été reclassé fixe (§2). Le mécanisme ne filtre donc que des entrées de
navigation et des routes de page — il n'a plus besoin de filtrer une liste
d'onglets internes au Hub KvK.

### (a) MVP — build-time, aligné sur `branding.js`

Le mécanisme le plus rapide reprend exactement le pattern déjà en place pour
la marque blanche : des variables d'environnement Vite, lues au build, avec
des valeurs par défaut qui ne changent rien pour Unitas 2997.

- Un fichier `src/config/modules.js` miroir de `branding.js` : un objet
  `MODULES = { bank: true, trophies: true, deadweight: true }` par défaut
  (2997 ne change rien), surchargeable par `.env.pilot` (ex.
  `VITE_MODULE_TROPHIES=false` pour KD 3341).
- `Sidebar` et `BottomNav` filtrent leur tableau d'items par `MODULES.xxx`, en
  plus du filtre de rôle déjà présent — un `.filter()` de plus, pas une
  nouvelle architecture. Le Hub KvK et ses onglets ne sont plus concernés :
  ils sont fixes dans leur intégralité.
- Les `Route` correspondantes ne sont **pas** retirées du routeur (voir §5,
  risque des deep-links) : elles rendent un écran « module non disponible sur
  ce royaume » plutôt que de disparaître silencieusement.
- **Modules concernés au MVP — classification tranchée par le Roi** :
  **optionnels** (interrupteur, niveau page) : Banque, Trophées, Deadweight.
  **Fixes** (aucun interrupteur, socle toujours actif) : Dashboard, Profil,
  Admin, War Tracker, et le Hub KvK entier (Performance, Progressions, Race).
- **Cascade Dashboard (exigence ferme du Roi, inchangée).** `MODULES.bank`
  n'est pas consommé que par Sidebar/BottomNav : le bloc Banque du Dashboard
  doit l'importer aussi et se masquer lui-même si `false`. Le registre doit
  donc être un module partagé et importable depuis n'importe quel composant,
  pas seulement depuis les deux surfaces de navigation — c'est le seul écart
  par rapport à un simple copier-coller du pattern `branding.js`, qui n'a
  jusqu'ici jamais eu besoin d'être lu par un composant de contenu.
- **Effort : S** (revu à la baisse par la simplification à une seule
  granularité). Même famille de changement que `branding.js` — un fichier de
  config, un `.filter()` par surface de navigation plus une lecture directe
  dans le bloc Banque du Dashboard, pas de nouvelle collection Firestore, pas
  de schéma. Compatible avec l'approche « instance clonée, zéro refonte » déjà
  retenue pour KD 3341 (`Plan_Pilote_KvK.md`).

### (b) Cible — runtime, doc Firestore + toggle admin (Roi)

Une fois qu'une instance a besoin de changer ses modules **sans** repasser
par un redéploiement (plusieurs royaumes, ou un Roi qui veut ajuster seul) :

- Un document `instance_config/modules` (même projet Firebase — l'architecture
  actuelle est **un projet par royaume**, pas encore multi-tenant ; si
  `Etude_Commercialisation_SaaS.md` §3 item 1 aboutit un jour à
  `tenants/{kingdomId}/…`, ce document suit sous le même chemin, sans
  changement de forme).
- Une nouvelle section « Modules » dans `AdminPage`, roi-only, dans le même
  rail sticky que Data/Campagne/Course/Maintenance déjà en place — une liste
  de toggles, un par module optionnel du §2 (Banque, Trophées, Deadweight),
  effet immédiat (pas de redéploiement, c'est tout l'intérêt du passage au
  runtime).
- Un contexte léger (`ModulesContext`, calqué sur `RoleContext`) alimente
  Sidebar/BottomNav/Routes/le bloc Banque du Dashboard à la place de l'import
  statique `MODULES`.
- **Qui tranche** : le Roi uniquement — cohérent avec le fait que toute la
  configuration d'`AdminPage` (campagne, course, maintenance) est déjà
  King-only.

**Recommandation de séquencement** : rester en (a) tant qu'il n'y a qu'une ou
deux instances en marque blanche maintenues à la main (situation actuelle,
assumée par `Plan_Pilote_KvK.md` — « acceptable pour un royaume, pas
au-delà »). Basculer en (b) quand l'un de ces deux signaux apparaît : un
troisième royaume, ou un Roi qui demande à changer ses modules sans passer
par le développeur. Construire (b) avant l'un de ces deux signaux serait de
l'anticipation non demandée, dans un projet où le multi-tenant lui-même
(item 1/7 de `Etude_Commercialisation_SaaS.md` §3) n'est pas encore décidé.

---

## 4. Alternatives écartées

| Option | Pourquoi écartée |
|---|---|
| **Auto-masquage silencieux** (cacher un bloc dès qu'il n'a aucune donnée) | Non découvrable (le Roi ne sait pas si le module existe ou a été retiré) ; sujet au clignotement des lectures Firestore asynchrones — le projet a déjà connu ce piège précis (BUG-006 : onglets Discord-gated invisibles en prod à cause d'une lecture optimiste avant écriture) ; indémontrable commercialement (une instance de démo sans données affiche un produit vide, contre-productif pour le motif §1) ; indistinguable d'un bug — impossible d'auditer « est-ce coupé ou cassé ? » sans aller lire Firestore. |
| **Feature flags ad hoc** (conditions dispersées dans le code, ex. `if (kingdomId === 'kd3341')`) | Ne passe pas à l'échelle au-delà de 2 instances ; chaque nouveau cas exige un redéploiement et une revue de code ; contredit le précédent déjà posé par `branding.js`, qui a justement centralisé la configuration au lieu de la disperser (c'est l'item 6 de `Etude_Commercialisation_SaaS.md` §3 — un couplage en dur à corriger, pas un pattern à reproduire). |

---

## 5. Impact technique & risques

- **Deep-links vers un module désactivé.** Un lien Discord ou un favori vers
  `/bank`, `/trophies` ou `/deadweight` sur une instance où le module est
  désactivé ne doit ni 404 ni planter en tentant de lire un document
  Firestore qui n'existe probablement même pas pour ce royaume. Recommandation :
  garder la `Route` déclarée et rendre un écran explicite (réutiliser le
  composant `AccessGate` existant, avec une copie et une icône distinctes de
  celle des restrictions de rôle — voir point suivant).
- **Interaction avec le RBAC existant.** Les deux filtres (rôle, activation)
  se cumulent mais ne doivent pas partager le même message. Le texte actuel
  de BR-009 (« Accès restreint, connectez-vous via Discord ») serait **faux**
  et trompeur affiché à un Warrior sur un module simplement désactivé par le
  Roi — il n'y a rien à débloquer en se connectant. Il faut une copie dédiée
  (« Module non activé sur ce royaume ») distincte de la copie de restriction
  de rôle.
- **i18n.** Toute nouvelle chaîne (écran « module non disponible », labels de
  la section Admin) passe dans les 9 langues, `src/locales/*` **et**
  `public/locales/*`, par module concerné — mécanique mais pas gratuit.
- **SEO / deep-links** : non pertinent ici — l'app est un SPA en `HashRouter`
  sans rendu serveur, aucune page n'est indexée aujourd'hui ; ce point n'ajoute
  pas de risque nouveau.
- **Ce n'est pas une frontière de sécurité.** Comme pour BR-009 et BR-011,
  désactiver un module ne doit **pas** être confondu avec sécuriser la
  donnée sous-jacente : c'est un filtre de présentation, au même niveau que
  les gates de rôle actuels (qui, eux aussi, laissent les documents Firestore
  lisibles au niveau des règles — cf. BR-009). À documenter explicitement pour
  ne pas laisser croire qu'« éteindre » un module ferme un accès Firestore.
- **Bot Discord.** `/mystats`, `/mykvk`, `/mykvkgoals` ne recoupent aujourd'hui
  aucun des trois modules optionnels (Trophées, Deadweight, Banque) d'après
  une lecture rapide des commandes — mais si un futur
  module désactivable devait avoir un équivalent bot, celui-ci devrait lire la
  **même** source de vérité (le doc Firestore en cible, pas une resaisie côté
  Functions) pour éviter que le bot réponde pour un module que le web a
  masqué. Point de vigilance, pas un chantier ouvert par cette étude.

---

## 6. Hypothèses

Statut au 2026-07-27, après l'arbitrage du Roi (voir encadré en tête de
document) :

- **A-016 — ✅ Tranchée, corrigée le 2026-07-27 (même jour).** Classification
  finale : optionnels (page) = Banque, Trophées, Deadweight ; fixes =
  Dashboard, Profil, Admin, War Tracker, Hub KvK **entier** (Performance,
  Progressions, Race). KvK Race, d'abord classé optionnel à granularité
  onglet, est reclassé fixe — une course a lieu dès qu'il y a un KvK ; sans
  scan, l'onglet affiche un état vide. Pour KD 3341 spécifiquement : Trophées
  non suivi aujourd'hui (susceptible d'évoluer — pas figé), Deadweight actif
  (doctrine en place), Race non déployé (l'onglet restera visible, à l'état
  vide). Ces faits sont une **note contextuelle pour le pilote**, pas une
  décision d'implémentation — la configuration réelle de l'instance 3341 se
  règle au déploiement, pas dans cette étude.
- **A-017 — non retranchée, reste l'hypothèse de travail du MVP.** Le Roi n'a
  pas demandé que désactiver un module ferme aussi les chemins d'écriture
  (ex. formulaires de contribution Banque) — le MVP reste donc
  présentationnel, symétrique au traitement déjà appliqué aux gates de rôle
  (BR-009/BR-011). À rouvrir si un usage réel prouve le contraire.
- **A-018 — non retranchée, reste l'hypothèse de travail.** Le mécanisme est
  construit pour la propreté de la marque blanche, pas comme brique de
  tarification ; il restera réutilisable pour un futur tiering sans travail
  supplémentaire. Toujours vrai, toujours à garder en tête pour le choix de
  copie UI (rester neutre, ne pas écrire « pas inclus dans votre offre »).

---

## 7. Recommandation

Construire la version **(a) build-time** maintenant — même famille de coût
qu'une variable de `branding.js`, cohérente avec le traitement déjà réservé à
KD 3341 (instance clonée, maintenue à la main), en intégrant l'exigence de
cascade Dashboard (§3a) dès le MVP — ce n'est pas un lot séparé, c'est une
conséquence directe de la classification tranchée par le Roi. La granularité
« onglet » envisagée initialement disparaît du périmètre (§2/§3) : le
mécanisme ne filtre plus que des pages. Ne pas construire la version runtime
(b) tant qu'aucun des deux signaux de bascule (§3) ne s'est produit : ce
serait investir dans une généralisation avant que la douleur qu'elle résout
(redéploiement pour changer un module) se soit manifestée.

**Références définitives**, inscrites dans les référentiels suite à
l'arbitrage : épic `E-006`, feature `F-023`, règle métier `BR-015`, user
stories `US-024` (MVP build-time, avec cascade Dashboard) et `US-025` (cible
runtime + toggle Admin). Voir `ProductBacklog.md`, `FeatureInventory.md`,
`docs/qa/SSOT.md`.

**Prochaines étapes** :
1. Configuration réelle du pilote KD 3341 (Trophées off, Deadweight on) au
   moment du déploiement — pas un chantier de cette étude. L'onglet Race
   reste visible sur l'instance et affichera son état vide tant qu'aucun scan
   n'est chargé.
2. Implémentation `US-024` : `src/config/modules.js`, filtre dans Sidebar/
   BottomNav, lecture directe dans le bloc Banque du Dashboard (cascade),
   écran « module non disponible » réutilisant `AccessGate`.

> **Signal de bascule US-025 déclenché — 2026-07-28.** Le Roi a demandé comment
> activer un module (la Banque) sur l'instance 3341 sans passer par le
> développeur — c'est exactement le second des deux signaux du §3b (« un Roi
> qui demande à changer ses modules sans passer par le développeur »). La
> condition de construction de la cible runtime (`US-025` : doc Firestore
> `instance_config/modules` + section toggles dans l'Admin, effet immédiat sans
> redéploiement) est donc remplie. Construction **non engagée** à la demande du
> Roi (« rien pour l'instant ») ; à reprendre quand il le décidera. Lien direct
> avec `Etude_Industrialisation_Onboarding.md` (la config build-time est une
> friction de redéploiement par royaume qui ne scale pas).

---

## 8. Opportunité PM soulevée en marge — Deadweight croisé performance/progression

Distincte de l'activation de modules : pendant l'arbitrage, le Roi a
soulevé une évolution **fonctionnelle** du module Deadweight lui-même,
indépendante de la question « ce module existe-t-il sur cette instance ».
Enregistrée séparément pour ne pas polluer le périmètre de cette étude :

- **Constat** : `Deadweight` (F-002) et les vues de performance/progression
  (F-008, F-015 progression joueur) vivent aujourd'hui côte à côte sans se
  croiser. Un joueur n'est marqué deadweight que sur des critères propres au
  module Deadweight ; sa trajectoire de performance à travers les campagnes
  (KvK Goals F-014, progression multi-campagnes F-015) n'alimente pas ce
  statut.
- **Piste** : qu'un joueur puisse devenir/sortir du statut « deadweight » sur
  la base de critères de performance mesurés (ex. sous le seuil KP Goal sur
  N campagnes consécutives), avec une vue croisée trajectoire ↔ statut
  deadweight pour le leadership.
- **Enregistrement** : `F-024` (voir `FeatureInventory.md`), `US-026` (voir
  `ProductBacklog.md`) — non priorisé, non cadré en détail ; une étude dédiée
  sera nécessaire avant tout développement (définition du/des critères, seuils,
  fenêtre de campagnes, interaction avec le statut manuel existant).
