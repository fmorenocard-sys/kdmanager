# Étude — Activation de modules par instance (marque blanche)

> Date : 2026-07-27 · Statut : **cadrage, décisions à rendre par le Roi**
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

| Module | Route(s) | Nav | ID(s) SSOT | Accès aujourd'hui | Candidat à l'activation ? |
|---|---|---|---|---|---|
| **Dashboard** | `/` | Sidebar + BottomNav | F-001 / P-001 | Tous | Non — page d'accueil, toujours présente |
| **War Tracker** | `/war-tracker` (disponibilités, War Dashboard, onglet Objectifs F-014) | Sidebar + BottomNav | F-011/F-013/F-014 / P-002 | Warriors+ | Non — c'est le module « hook » gratuit identifié par l'étude commerciale (§5bis), le cœur du produit |
| **KvK Performance** (onglets Performance / Comptes secondaires / Progressions / **Course**) | `/kvk` | Sidebar + BottomNav | F-008/F-015/F-016/F-022 / P-003 | Tous (onglets Fillers et Progressions Discord-gated BR-008, Timeline King/Officer BR-011) | Le conteneur non ; **son onglet Course, oui** (voir ligne KvK Race) |
| **Trophées** | `/trophies` | Sidebar + BottomNav | F-004 / P-004 | Tous | **Oui** — un royaume qui ne suit pas MGE/Zenith n'a rien à y montrer |
| **Deadweight** | `/deadweight` | Sidebar + BottomNav (King/Officer, BR-009) | F-002 / P-005 | King/Officer | **Oui** — suppose une doctrine de suivi des inactifs que tout royaume n'a pas forcément adoptée |
| **Banque** | `/bank` | Sidebar + BottomNav | F-003 / P-006 | Tous | **Oui** — suppose une banque de royaume organisée ; tous les royaumes n'en tiennent pas une |
| **KvK Race** (course de coalition) | `/kvk-race` (legacy, compat) + onglet **Course** dans le Hub KvK | Aucune entrée de nav dédiée depuis la refonte — vit comme onglet | F-018/F-019/F-020 / P-008 | King/Officer | **Oui — c'est le cas déclencheur.** Suppose une coalition et un moteur de scan de course déployés (E-005) ; KD 3341 n'a ni l'un ni l'autre aujourd'hui |
| **Admin** | `/admin` | Sidebar (zone dédiée) | — *(non listé en P-xxx dans SSOT — écart mineur à signaler à la QA, hors périmètre ici)* | King | Non — c'est l'endroit où vivraient les interrupteurs de modules ; il doit rester présent tant qu'au moins un module a de la config |
| **Profil** | `/profile` | Menu compte | P-007 | Tous | Non — personnel, pas un module métier |

**Lecture** : le module réellement déclencheur (KvK Race) n'est déjà **pas**
un item de navigation de premier niveau — c'est un **onglet** à l'intérieur de
la page KvK Performance. Le mécanisme d'activation doit donc opérer à deux
granularités, pas une seule : **page complète** (Trophées, Deadweight,
Banque) et **onglet interne** (Course dans le Hub KvK). Un registre par ID de
module, consommé indépendamment à chaque endroit d'affichage, couvre les deux
cas sans code spécifique par surface.

---

## 3. Proposition — un registre de modules, en deux temps

**Principe** : une **troisième dimension** de filtrage, orthogonale à celle
qui existe déjà. Aujourd'hui, `Sidebar`, `BottomNav` et les onglets du Hub KvK
filtrent déjà leurs listes par rôle (`isAuthorized([...])`, BR-008/BR-009/
BR-011). Il s'agit d'ajouter le même genre de filtre, mais sur un axe
différent :

- **« Qui peut voir ce module »** = rôle (existant, ne change pas).
- **« Ce royaume propose-t-il ce module »** = activation d'instance (nouveau,
  objet de cette étude).

Les deux se cumulent : KvK Race reste réservé King/Officer **et** peut être
désactivé pour un royaume qui n'en a pas l'usage — les deux filtres
s'appliquent indépendamment, exactement comme le code le fait déjà pour les
rôles à trois endroits distincts (Sidebar, BottomNav, tabs du Hub KvK).

### (a) MVP — build-time, aligné sur `branding.js`

Le mécanisme le plus rapide reprend exactement le pattern déjà en place pour
la marque blanche : des variables d'environnement Vite, lues au build, avec
des valeurs par défaut qui ne changent rien pour Unitas 2997.

- Un fichier `src/config/modules.js` miroir de `branding.js` : un objet
  `MODULES = { kvkRace: true, trophies: true, deadweight: true, bank: true }`
  par défaut (2997 ne change rien), surchargeable par `.env.pilot` (ex.
  `VITE_MODULE_KVK_RACE=false` pour KD 3341).
- `Sidebar`, `BottomNav` et la liste d'onglets du Hub KvK filtrent leur tableau
  d'items par `MODULES.xxx`, en plus du filtre de rôle déjà présent — un
  `.filter()` de plus, pas une nouvelle architecture.
- Les `Route` correspondantes ne sont **pas** retirées du routeur (voir §5,
  risque des deep-links) : elles rendent un écran « module non disponible sur
  ce royaume » plutôt que de disparaître silencieusement.
- **Modules concernés au MVP** : uniquement ceux dont la variation entre
  instances est déjà prouvée par le cas réel (KvK Race, Trophées, Deadweight,
  Banque). Dashboard, War Tracker, Profil et Admin restent le socle toujours
  actif — ne pas construire un interrupteur pour des modules dont on n'a
  aucune preuve qu'un royaume voudrait s'en passer.
- **Effort : S.** Même famille de changement que `branding.js` — un fichier de
  config, un `.filter()` par surface d'affichage, pas de nouvelle collection
  Firestore, pas de schéma. Compatible avec l'approche « instance clonée, zéro
  refonte » déjà retenue pour KD 3341 (`Plan_Pilote_KvK.md`).

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
  de toggles, un par module du §2, effet immédiat (pas de redéploiement,
  c'est tout l'intérêt du passage au runtime).
- Un contexte léger (`ModulesContext`, calqué sur `RoleContext`) alimente
  Sidebar/BottomNav/onglets/Routes à la place de l'import statique `MODULES`.
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
  `/kvk-race` sur une instance sans course de coalition ne doit ni 404 ni
  planter en tentant de lire un document Firestore qui n'existe probablement
  même pas pour ce royaume. Recommandation : garder la `Route` déclarée et
  rendre un écran explicite (réutiliser le composant `AccessGate` existant,
  avec une copie et une icône distinctes de celle des restrictions de rôle —
  voir point suivant).
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
  aucun des modules candidats à la désactivation (Trophées, Deadweight,
  Banque, Course) d'après une lecture rapide des commandes — mais si un futur
  module désactivable devait avoir un équivalent bot, celui-ci devrait lire la
  **même** source de vérité (le doc Firestore en cible, pas une resaisie côté
  Functions) pour éviter que le bot réponde pour un module que le web a
  masqué. Point de vigilance, pas un chantier ouvert par cette étude.

---

## 6. Questions ouvertes / hypothèses à trancher

Trois hypothèses nommées, à confirmer par le Roi avant tout développement :

- **A-016** — Les modules réellement instance-optionnels sont *KvK Race,
  Trophées, Deadweight, Banque* ; Dashboard, War Tracker, Profil et Admin
  restent le socle toujours actif. Classification proposée dans cette étude,
  non confirmée.
- **A-017** — L'activation de module est **purement présentationnelle** (pas
  de fermeture de règles Firestore en plus) pour le MVP, symétrique au
  traitement déjà appliqué aux gates de rôle (BR-009/BR-011). À confirmer :
  le Roi pourrait attendre qu'« éteindre » la Banque, par exemple, bloque
  aussi l'écriture (formulaires de contribution), pas seulement la navigation.
- **A-018** — Le mécanisme d'activation par module est construit ici pour la
  **propreté de la marque blanche uniquement**, pas comme brique de
  tarification. Il devient réutilisable pour un futur tiering (frontière
  gratuit/payant de `Etude_Commercialisation_SaaS.md` §8) sans travail
  supplémentaire — mais cette étude ne décide **pas** de tiering, et la
  terminologie choisie (« module non activé sur ce royaume ») ne doit pas être
  écrite en dur d'une façon qui présupposerait un jour « pas inclus dans votre
  offre » — à garder neutre.

**Question factuelle à poser directement au Roi pour KD 3341** : au-delà de
KvK Race (cas confirmé), le royaume pilote suit-il des Trophées (MGE/Zenith) ?
Tient-il une Banque organisée ? Applique-t-il une doctrine Deadweight ? Sans
réponse module par module, l'inventaire du §2 reste une hypothèse de PM, pas
un fait confirmé.

---

## 7. Recommandation

Construire la version **(a) build-time** maintenant — même famille de coût
qu'une variable de `branding.js`, cohérente avec le traitement déjà réservé à
KD 3341 (instance clonée, maintenue à la main). Ne pas construire la version
runtime (b) tant qu'aucun des deux signaux de bascule (§3) ne s'est produit :
ce serait investir dans une généralisation avant que la douleur qu'elle
résout (redéploiement pour changer un module) se soit manifestée.

**Prochaines étapes**, si le Roi valide :
1. Réponses aux questions du §6 (A-016 à confirmer module par module pour
   KD 3341).
2. Enregistrement dans les référentiels une fois arbitré : un épic (prochain
   `E-006` libre), une feature (`F-023`), une règle métier proposée
   (`BR-015`, sur le modèle de BR-010 « proposed »), deux user stories
   (`US-024` MVP build-time, `US-025` cible runtime) — non créés dans ce
   document pour ne pas préempter une décision non encore rendue.
3. Implémentation MVP : `src/config/modules.js`, filtre dans Sidebar/
   BottomNav/tabs du Hub KvK, écran « module non disponible » réutilisant
   `AccessGate`.
