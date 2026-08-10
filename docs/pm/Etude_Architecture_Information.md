# Étude — Architecture de l'information (grille de décision « ça va où ? »)

> Date : 2026-08-10
> Statut : **Cadre livré — grille de décision adoptée, migration opportuniste (pas de chantier dédié).**
> Origine : irritant nommé par le Roi — la question « ça va où ? » se repose à chaque nouvelle
> feature, faute de grille de décision d'architecture de l'information (IA). Demande explicite :
> **un cadre, pas une refonte.**

---

## 0. Cadrage de la demande

**Ce qui est demandé** : une règle réutilisable qui, pour une feature donnée, tranche son
emplacement (section de nav) et son niveau d'accès sans rouvrir un débat à chaque fois.

**Ce qui n'est pas demandé** : une refonte de la navigation. La refonte M3 est récente (livrée et
validée sur 2997 et le pilote 3341) — ce document ne remet en cause aucune route, aucun libellé,
aucun découpage d'onglet existant. Il **explique** pourquoi la question revient, **fournit** la
règle qui devrait s'appliquer aux prochaines features, et **cartographie** les écarts entre cette
règle et l'état actuel — sans les corriger d'office.

**Ce que je tranche seul dans cette étude** : la méthode de classement (§2), sa validation sur des
cas réels (§4), la doctrine de migration (§5 — opportuniste, pas de projet dédié).

**Ce qui reste au Roi** : toute bascule de nav *visible* (déplacer un onglet, en extraire un dans
une nouvelle page), toute décision de tiering nouvelle (le classement gratuit/premium reste figé,
`FeatureInventory.md` §Frontière), la création effective d'un rôle Admin découplé (A-033) et son
périmètre exact.

---

## 1. Diagnostic — pourquoi la question se repose à chaque fois

### 1.1 Quatre axes qui se mélangent, jamais nommés séparément

En croisant `Matrice_Acces.md` et `FeatureInventory.md`, quatre axes indépendants gouvernent
« où va une feature » — et aucun n'est aujourd'hui la clé de rangement de la nav :

| Axe | Ce qu'il répond | Valeurs observées |
| :--- | :--- | :--- |
| **Sujet** (l'axe de rangement actuel) | De quel module fonctionnel s'agit-il ? | Dashboard, War Tracker, Hub KvK, Trophées, Deadweight, Banque, Profil, Admin |
| **Intention / audience** (jamais nommé explicitement) | Pour quoi l'utilisateur vient-il, et pour qui la feature existe-t-elle ? | Agir pour moi · Consulter le collectif · Piloter le royaume · Opérer l'instance |
| **Accès effectif** | Qui a le droit d'y entrer ? | Public · connecté (🔑) · Warriors+ · Discord-vérifié (BR-008) · leadership King+Officer (BR-009/011) · King (BR-020) |
| **Tier commercial** | La feature est-elle gratuite, premium, ou socle ? | Gratuit (hook) · Premium · Socle (`FeatureInventory.md` §Frontière) |

La nav actuelle range par **Sujet**. Chaque nouvelle feature doit donc répondre, isolément et à
chaque fois : « dans quel sujet je la range ? » (pas de règle), « quel accès je lui donne ? » (pas
de règle non plus, juste le catalogue de patterns `AccessGate` déjà codés), et de plus en plus
souvent « quel tier ? » (la frontière commerciale du 2026-08-08 a ajouté un 4ᵉ axe à trancher). Sans
grille reliant Sujet à Intention, chaque décision repart de zéro.

### 1.2 Preuve par le code — deux pages bundlent déjà des intentions différentes

Ce n'est pas hypothétique : deux pages existantes, sous un seul libellé de « sujet », mélangent
déjà plusieurs intentions/accès en onglets adjacents (`Matrice_Acces.md`, SSOT §3) :

| Page (sujet) | Onglets qu'elle bundle | Intentions mélangées |
| :--- | :--- | :--- |
| **War Tracker** (P-002) | Déclaration · Objectifs · War Dashboard | *Agir pour moi* (×2, Warriors+) + *Piloter* (×1, leadership) sous un seul libellé « War Tracker » |
| **Hub KvK** (P-003) | Performance · Progressions (+ sous-vue « Progression du Royaume ») · Course | *Consulter le collectif* (×2, dont une sous-vue en réalité leadership-only) + *Piloter* (×1) sous un seul libellé « KvK Hub » |

Ce n'est pas cassé au sens fonctionnel — chaque onglet a son propre `AccessGate` et un redirect si
deep-link non autorisé (`Matrice_Acces.md`, note d'architecture). Mais ça illustre concrètement
pourquoi « ça va où ? » revient : le libellé de la page (Sujet) ne dit rien de qui elle sert, donc
chaque ajout d'onglet oblige à retrancher l'accès au cas par cas.

### 1.3 Preuve par l'exception qui confirme la règle — l'Admin

`/admin` (P-009) est la **seule** section où Sujet, Intention et Accès coïncident déjà : « opérer
l'instance » = King uniquement = une page dédiée. C'est précisément pourquoi plus personne ne
débat de l'emplacement de `KvKConfigForm` ou de `DataRefreshControl` depuis que M3 les a extraits
du War Tracker vers `/admin` (`Matrice_Acces.md` §Écarts SSOT ↔ code réconciliés) : la question
« ça va où ? » ne se pose plus pour rien de ce qui est King-only, parce que la section est déjà
scopée par **intention** (opérer), pas par sujet. La grille proposée en §2 généralise cet
instinct — qui existe déjà pour un cas — au reste de la nav.

### 1.4 Une page révèle un cinquième problème : le masquage n'est pas un signal de section

`Deadweight` est 100 % réservée au leadership (BR-009) mais siège comme item de nav **au même
niveau** que `Dashboard` (100 % public) et `Trophées` (100 % public). Fonctionnellement le
`AccessGate` masque bien la page aux non-autorisés — mais il n'y a **aucun signal structurel**
(regroupement, en-tête de section) qui dirait a priori « ceci est un outil de pilotage réservé »
avant d'avoir codé le gate. C'est un problème différent de 1.2 : pas des intentions mélangées dans
une même page, mais une absence de regroupement visuel entre pages de même intention.

---

## 2. La grille de décision (livrable central)

### 2.1 Trois questions, dans l'ordre

1. **Qui bénéficie de la feature, et pour quoi faire ?** (intention/audience) → détermine la
   **section**.
2. **Quel est le niveau d'accès minimal effectif qui la protège ?** (rôle, Discord-vérifié,
   King) → détermine le **gate** à l'intérieur de la section — réutilise les patterns déjà codés
   (`AccessGate` role-match, Discord-gate BR-008, login-only 🔑, King-only), **pas** une nouvelle
   section.
3. **Est-ce de la vue/du hook, ou de la profondeur/gestion/automation ?** (uniquement si la
   feature est tiering-candidate) → oriente le **tier**, axe orthogonal (voir §6) — reste un
   arbitrage du Roi, la grille ne fait que pré-suggérer.

### 2.2 Table de correspondance intention × accès → section

| Intention / audience | Accès effectif rencontré | **Section cible** | Pattern de gate à réutiliser |
| :--- | :--- | :--- | :--- |
| Agir pour moi-même (déclarer, voir mes objectifs, gérer mon profil, planifier ma préparation) | Connecté — souvent Warriors+, parfois juste login | **Mon jeu** | Login-only 🔑 ou role-match Warrior+ |
| Consulter le collectif (stats du royaume, palmarès, trésorerie, historique, progression d'un joueur) | Public par défaut ; Discord-vérifié pour les sous-vues nominatives sensibles | **Le Royaume** | Public par défaut ; gate BR-008 (Discord-vérifié) sur les sous-vues qui exposent des identités |
| Gérer l'activité du royaume (arbitrer, suivre la course, cibler les inactifs, décisions leadership) | Leadership (`[King, Officer]`, match par paire) | **Pilotage** | `AccessGate` leadership + redirect sur deep-link non autorisé (pattern déjà en place BR-009/011/Course) |
| Opérer l'instance techniquement (ingestion, config de campagne, maintenance, entitlement) | King aujourd'hui (BR-020) → rôle Admin/Opérateur demain (A-033) | **Administration** | `AccessGate` King-only aujourd'hui ; remplaçable par un check de rôle Admin **sans toucher la section** (§6.2) |

### 2.3 Corollaire — un gate plus dur n'est pas un signal de déplacement

Un sous-élément plus restreint à l'intérieur d'une section **n'implique pas** de le faire migrer
vers une autre section, tant que l'**intention** reste la même :

- La Banque reste **Le Royaume** même si les dépôts sont Officer+ : l'intention dominante de la
  page est « consulter la trésorerie du royaume », le dépôt est une action secondaire embarquée.
- L'onglet Objectifs reste **Mon jeu** même si le leadership y voit une vue agrégée en plus
  (« Top du royaume », F-029) : l'intention d'origine et l'audience principale sont Warriors+.
- Le dépôt de scan dans l'onglet Course reste dans **Pilotage** (Officer+ écrit, King+Officer
  lisent) : toute la page est déjà leadership, l'écriture resserrée n'ajoute rien de nouveau.

Ce qui **justifie** une migration de section, ce n'est jamais « l'accès est plus dur qu'ailleurs
dans la page » — c'est **l'intention elle-même qui change**. C'est le cas exact de la sous-vue
« Progression du Royaume » (§3.3) : ce n'est pas « la vue Progressions avec un gate plus dur », ce
sont deux intentions différentes (consulter mes stats vs décision leadership rétrospective) qui
partagent un onglet par accident de construction.

### 2.4 Qui tranche quoi, avec cette grille

- **Le PM applique la grille mécaniquement** pour toute nouvelle feature : §2.2 donne la section,
  le catalogue de gates existant donne l'accès. Pas de débat, sauf ambiguïté réelle (rare — voir
  §4, aucun cas testé n'en a soulevé).
- **Le Roi reste seul décideur** sur : tout déplacement de nav *visible* d'une feature déjà
  livrée, toute décision de tier nouvelle, le périmètre du futur rôle Admin (A-033).

---

## 3. IA cible proposée + mapping intégral current → target

### 3.1 Les quatre sections, amendées après pressurisation

La proposition initiale du Roi tient sur 3 des 4 sections telles quelles. Deux amendements
factuels, pas des choix de goût :

- **« Le Royaume » listait la Timeline (Progression du Royaume) — c'est une erreur de
  classement, pas un choix.** BR-011 la réserve explicitement au leadership (King/Officer). Une
  page « publique, consulter » ne peut pas contenir une sous-vue 100 % leadership-only sans que la
  section perde son sens. C'est exactement le type d'erreur que cette étude cherche à empêcher —
  et elle apparaît dans le brief de cadrage lui-même, ce qui confirme le diagnostic : même en
  connaissant les rôles, on se trompe sans grille explicite. **Corrigé : Progression du Royaume va
  en Pilotage.**
- **La Banque n'était pas mentionnée dans la proposition initiale** (angle mort, pas un oubli
  anodin — c'est justement le genre de feature qui, sans grille, aurait rouvert le débat). Placée
  en **Le Royaume** par le corollaire §2.3 (consultation collective dominante, dépôt = action
  secondaire Officer+).

| Section | Contenu (mis à jour) |
| :--- | :--- |
| **Mon jeu** | Déclaration, Objectifs (vue personnelle), Calendrier KvK (F-031), Profil |
| **Le Royaume** | Dashboard, Performance, Progressions (hors sous-vue Timeline), Trophées, Banque |
| **Pilotage** | War Dashboard, Deadweight, Course, **Progression du Royaume** (déplacée depuis « Le Royaume ») |
| **Administration** | Config de campagne, Ingestion, Clôture/archivage, Config de course, Maintenance |

### 3.2 Ce que ça change concrètement — aucune décision de mouvement n'est prise ici

Important : ce tableau classe des **onglets et sous-vues**, pas des **pages/routes**. La plupart
des cibles ci-dessous **ne bougent pas physiquement** — c'est de la lecture, pas un plan de refonte
(§5 explique pourquoi).

### 3.3 Mapping intégral, surface par surface (base : `Matrice_Acces.md`)

| Surface actuelle | Accès (rappel Matrice_Acces) | Section cible | Bouge / reste |
| :--- | :--- | :--- | :--- |
| Dashboard `/` | Public | Le Royaume | **Reste.** Déjà aligné. |
| War Tracker — Déclaration `?tab=declaration` | Login requis | Mon jeu | **Reste.** Déjà aligné. |
| War Tracker — Objectifs `?tab=goals` | Warrior : sa ligne · leadership : tout + Top royaume | Mon jeu (vue leadership nichée, §2.3) | **Reste.** Le nichage est correct, pas un défaut. |
| War Tracker — War Dashboard `?tab=dashboard` | Leadership | Pilotage | **Écart de fond** — vit dans la même page que 2 onglets « Mon jeu » (§1.2). Pas de correction forcée (§5). |
| KvK Hub — Performance `?tab=performance` | Public | Le Royaume | **Reste.** Déjà aligné. |
| KvK Hub — Progressions `?tab=progressions` (hors sous-vue) | Discord-vérifié ou leadership | Le Royaume | **Reste.** Le gate BR-008 est un gate d'identité, pas un changement d'intention (§2.3). |
| KvK Hub — Progressions → sous-vue **Progression du Royaume** | Leadership only (BR-011) | **Pilotage** | **Écart de fond, le plus net de l'étude** — nichée dans une page « Le Royaume », devrait vivre côté Pilotage. Cible corrigée en §3.1. Pas de correction forcée (§5). |
| KvK Hub — Course `?tab=course` | Leadership (dépôt King+Officer) | Pilotage | **Reste.** Déjà aligné. |
| Trophées `/trophies` | Public | Le Royaume | **Reste.** Déjà aligné (mais Premium — voir §6.1, tier orthogonal). |
| Deadweight `/deadweight` | Leadership | Pilotage | **Écart de regroupement** (§1.4) — accès correct, mais siège comme pair visuel de pages publiques dans la nav actuelle plutôt que groupée avec War Dashboard/Course. Pas de correction forcée (§5). |
| Banque `/bank` | Lecture connectée, dépôts Officer+ | Le Royaume | **Reste** (angle mort comblé, §3.1). Jugement, pas un fait — noté explicitement en zone d'ombre (§7). |
| Profil `/profile` | Login | Mon jeu | **Reste.** Déjà aligné. |
| Administration `/admin` | King only | Administration | **Reste — section qui a déjà raison** (§1.3), et future ancre du rôle Admin (A-033, §6.2). |
| *(legacy)* `/kvk-race` | Leadership, compat | — | Route de compatibilité sans entrée de nav ; hors périmètre (à retirer quand jugé sûr, sujet distinct). |

**Bilan** : sur 13 surfaces actives, **10 sont déjà à leur cible** (aucun mouvement à faire, la
nav M3 est globalement saine) ; **3 écarts identifiés**, dont un seul net et actionnable
(Progression du Royaume) — les deux autres (War Dashboard dans War Tracker, Deadweight isolée
visuellement) sont des écarts de regroupement, pas de mauvais accès. Aucun des trois n'est corrigé
dans cette étude (§5).

---

## 4. Cas de test — la grille tranche-t-elle sans débat ?

### 4.1 Calendrier KvK (F-031, déjà arbitré le 2026-08-10)

- **Q1 (intention)** : planification personnelle du joueur pendant la campagne, explicitement
  distincte du rétrospectif leadership (`Etude_Calendrier_KvK.md` §1) → **Mon jeu**.
- **Q2 (accès)** : Warriors+ / tous les membres connectés (D1 de l'étude) → gate login+role
  standard, aucun Discord-gate ni leadership-gate requis.
- **Q3 (tier)** : la frise nue est de la vue (parité ProKingdoms) → gratuit hook ; pings/ICS sont
  de l'automation → premium (`Etude_Calendrier_KvK.md` §6).
- **Verdict** : la grille aurait produit exactement D1 sans débat — y compris l'inversion assumée
  par rapport au précédent le plus proche (F-022/BR-011, qui est justement l'écart corrigé en
  §3.1). Ce n'est pas une coïncidence : F-022 et F-031 sont formellement les deux faces d'une même
  distinction (rétrospectif leadership vs prospectif joueur) que la grille rend explicite au lieu
  de la laisser implicite dans la tête du Roi.

### 4.2 Multi-comptes (E-007 — F-025/026/027)

- Gestion des comptes (ajouter/retirer/typer/désigner principal) → **Mon jeu** (Profil).
- Déclaration par compte (F-026) → **Mon jeu** (Déclaration, même page).
- Objectifs filler (F-027) → **Mon jeu** (Objectifs, même onglet que le barème `war` existant).
- **Verdict** : zéro nouvelle section, zéro nouveau débat — tout E-007 se range dans les onglets
  « Mon jeu » déjà existants. La grille confirme que la spec actuelle (`Spec_Multicomptes_MainFiller.md`)
  n'a jamais eu besoin de créer une nouvelle page, ce qui n'était pas garanti a priori.

### 4.3 Un futur premium réel — Couverture méta des marches (F-028, opportunité non cadrée)

- **Q1** : croiser les marches déclarées avec un référentiel méta pour piloter la montée en
  puissance du royaume — décision leadership, pas un besoin joueur individuel → **Pilotage**.
- **Q2** : accès leadership (cohérent avec Deadweight, War Dashboard, Course — même bucket).
- **Q3** : profondeur analytique construite sur une donnée déjà interne (marches déclarées) →
  candidat naturel Premium, cohérent avec le classement déjà figé de F-028 dans
  `FeatureInventory.md` §Frontière (Premium).
- **Verdict** : la grille retombe sur le tier déjà arbitré sans avoir eu besoin de le consulter —
  confirme l'heuristique §6.1 (Pilotage skew Premium), sans en faire une preuve suffisante à elle
  seule (un seul cas).

### 4.4 Rôle Admin découplé (A-033)

- **Q1** : opérer l'instance techniquement — l'intention ne change **pas** quand le rôle change de
  King à Admin/Opérateur. C'est le point clé : **A-033 est un changement d'accès (Q2), pas un
  changement de section (Q1)**.
- **Verdict** : la grille absorbe A-033 sans aucun rework de nav — voir détail §6.2. C'est la
  démonstration la plus forte de la valeur du cadre : le jour où le rôle Admin existe, `/admin`
  ne bouge pas, ne se renomme pas, ne se scinde pas. Seul le gate change de `isKing()` à
  `isAdmin()`.

**Synthèse des 4 cas** : aucun n'a nécessité de repasser par le Roi pour la question « ça va
où ? » — exactement l'objectif de la demande. Le seul point qui reste un arbitrage humain est le
tier (Q3), et seulement pour les features réellement nouvelles (F-028 était déjà tranché).

---

## 5. Migration sans big-bang

### 5.1 Pourquoi pas un chantier dédié

Un big-bang de renommage/regroupement de nav coûterait, pour une valeur strictement cosmétique
(aucun accès ne change, seul l'agencement visuel bouge) :

- **9 langues × 2 emplacements** de fichiers de traduction (`src/locales/*/translation.json` +
  `public/locales/*/translation.json`) si des libellés de section sont introduits ou déplacés.
- **La contrainte mobile déjà difficile** : `BottomNav.jsx` est plafonné à 6 entrées en grille
  fixe sans scroll (choix M4 explicite, commentaire code « 6 entrées max »). Réorganiser en 4
  sections visibles sur cette surface est un sous-projet à part entière, pas un sous-produit
  gratuit de cette étude.
- **Suite Playwright** (`tests/`) qui référence routes et libellés — non-régression à revalider.
- **`Matrice_Acces.md` et SSOT §3** (P-xxx) à resynchroniser pour chaque route qui bougerait
  réellement.
- **Un pilote KD 3341 en KvK live jusqu'au 19/09** et une fenêtre de test de disposition à payer
  (A-032) — le pire moment pour dérouter des utilisateurs actifs avec une nav qui change de
  visage.
- **Un coût d'opportunité direct** face à la roadmap engagée (E-008 Calendrier, puis E-007) : ce
  chantier ne livre aucune valeur joueur, aucune valeur leadership, aucun signal commercial — il
  répare un inconfort de rangement, pas un manque fonctionnel.

Pour un gain qui est un **confort de navigation interne**, pas une fonctionnalité — le rapport
coût/valeur d'un chantier dédié est mauvais tant qu'aucun utilisateur ne s'est plaint de l'IA
elle-même (le seul signal recueilli à ce jour est l'irritant du Roi sur le *processus de décision*
produit, pas sur l'expérience utilisateur de la nav).

### 5.2 La doctrine retenue — migration opportuniste

1. **Toute feature nouvelle applique la grille dès sa conception** (§2) — placement direct dans
   la section cible, pas de placement provisoire « on rangera plus tard ». C'est déjà effectivement
   le cas pour F-031 (§4.1) et la spec E-007 (§4.2).
2. **Une surface existante qui est retouchée pour une autre raison** (nouvelle feature qui
   s'accroche à elle, refactor, bug) est reclassée dans la même bascule **seulement si le coût
   marginal est proche de zéro** (renommer un libellé, déplacer un item dans le même fichier de
   nav) — jamais si ça touche routes, i18n multi-fichiers ou tests, auquel cas ça reste différé.
3. **Les 3 écarts identifiés en §3.3 sont trackés, pas corrigés d'office** — ils ne disparaissent
   pas silencieusement de la liste, mais n'ouvrent pas non plus de ticket dédié. Ils se règlent le
   jour où quelqu'un touche cette zone pour une autre raison suffisante.

### 5.3 Prochaine étape concrète, à coût quasi nul (recommandée, non exécutée ici)

Ajouter une colonne « Section IA cible » à `Matrice_Acces.md` (doc uniquement, aucun code) —
donne à quiconque consulte la matrice d'accès la réponse à « ça va où ? » en même temps que « qui y
accède ? », sans attendre une vraie bascule de nav. C'est la version *documentaire* de la grille,
qui capture 80 % de la valeur pour ~0 risque. Recommandé au prochain passage sur ce fichier
(propriété QA — hors du lot de fichiers PM édité par cette étude).

### 5.4 Ce qui n'est PAS recommandé maintenant

Scinder War Tracker ou le Hub KvK en pages distinctes par section, extraire physiquement
« Progression du Royaume », réorganiser `BottomNav`/`Sidebar` en 4 blocs visuels — tout ça reste
différé jusqu'à un moment où une refonte nav est de toute façon justifiée pour une autre raison
(ex. construction du rôle Admin A-033, ou un futur v2 de nav porté par un besoin produit réel,
pas par ce confort de rangement seul).

---

## 6. Liens — tiering (BR-015) et rôle admin (A-033)

### 6.1 Tiering — une heuristique utile, pas une règle

Observée sur le classement figé (`FeatureInventory.md` §Frontière) : **Mon jeu + Le Royaume
skewent Gratuit** (hook — vue, engagement individuel), **Pilotage + Administration skewent
Premium/Socle** (profondeur, gestion, automation — cohérent avec le principe value-ladder déjà
acté). Mais ce n'est **pas dérivable automatiquement** de la section — deux contre-exemples réels
et déjà tranchés le prouvent :

- **Trophées** est *Le Royaume* (consultation publique) mais **Premium**.
- **Multi-comptes** (F-025/026/027) est *Mon jeu* mais **Gratuit** malgré sa complexité de
  construction.

Le tier reste et doit rester un **3ᵉ axe indépendant**, arbitré par le Roi feature par feature
(comme la frontière commerciale l'a déjà fait) — la grille peut pré-suggérer (§4.3 l'a montré
juste), jamais trancher seule.

### 6.2 Rôle Admin (A-033) — la démonstration de valeur du cadre

C'est le lien le plus direct avec cette étude : **A-033 demande que « Administration » cesse
d'être « le truc du Roi » pour devenir une couche opérateur.** Avec la grille, cette bascule est
déjà acquise *par construction* — la section Administration est scopée depuis le départ par
**intention** (« opérer l'instance techniquement »), pas par le rôle qui l'opère aujourd'hui.
Faire atterrir A-033 revient à changer une seule ligne de gate (`isKing()` → `isAdmin()`
équivalent), pas à repenser où vit l'ingestion, la config ou la maintenance. C'est exactement
l'inverse du problème diagnostiqué en §1 : parce que la section est déjà nommée par ce qu'on y
fait et non par qui a le droit d'y entrer aujourd'hui, un changement de titulaire de l'accès ne
force aucun changement de nav.

---

## 7. Zones d'ombre / risques — su vs supposé

**Su (vérifié code + docs)** : la structure actuelle des pages/onglets et leurs gates
(`Matrice_Acces.md`, `App.jsx`, `BottomNav.jsx` lus directement) ; le classement tiering figé
(`FeatureInventory.md` §Frontière) ; les décisions D1–D4 du Calendrier KvK
(`Etude_Calendrier_KvK.md`) ; BR-008/009/011/015/020 et A-033 (`SSOT.md`,
`Assumptions_Log.md`).

**Supposé / zones d'ombre, nommées explicitement** :

- **A-037 (nouvelle)** : la grille intention × accès est supposée suffisante pour trancher le
  placement d'une feature sans repasser par le Roi. Testée sur 4 cas (§4), tous rétrospectifs ou
  déjà tranchés — **aucun cas réellement ambigu ou inédit n'a encore été soumis à la grille en
  amont d'une décision**. À confirmer sur les 2-3 prochaines features réellement nouvelles
  (candidats probables : Deadweight croisé F-024, US-034 ingestion unifiée).
- **Le placement de la Banque en « Le Royaume » est un jugement, pas un fait** (§3.1) — absente
  de la proposition initiale du Roi, donc pas validée par lui. À confirmer ou amender à la
  prochaine occasion sans urgence à trancher isolément.
- **La gêne réelle des 3 écarts (§3.3) n'est pas mesurée** — signalés comme un smell
  architectural repéré par cette étude, pas comme une plainte utilisateur documentée. Ne pas les
  traiter comme urgents sur cette seule base.

---

## 8. Priorisation (grille §3 des règles PM)

Valeur Haute (résout un irritant nommé, transverse à *toutes* les features futures) × Impact
Transverse (PM + dev, chaque décision de placement à venir) × Urgence Faible (aucune deadline,
aucun accès cassé aujourd'hui) / **Effort S** (document + politique, zéro ligne de code, zéro
migration forcée) → 🟢 **à adopter immédiatement** — c'est précisément le profil d'un cadre : gain
structurel élevé pour un coût d'entrée quasi nul, à l'inverse d'un chantier de refonte (§5.1).

---

## 9. Recommandation

1. **Adopter la grille (§2) comme politique PM effective dès maintenant** pour toute nouvelle
   feature — elle a déjà validé, sans écart, le placement de F-031 et de la spec E-007.
2. **Ne rien bouger dans le code ou la nav aujourd'hui** — les 3 écarts identifiés (§3.3) sont
   trackés, pas corrigés ; ils se résorbent au fil de l'eau (§5.2), jamais par un chantier dédié.
3. **Prochaine étape à coût quasi nul** : ajouter la colonne « Section IA cible » à
   `Matrice_Acces.md` au prochain passage QA sur ce fichier (§5.3) — capture la valeur
   documentaire sans toucher au produit.
4. **Revisiter le sujet nav uniquement si un chantier plus large l'exige déjà** — construction du
   rôle Admin (A-033), ou un besoin produit réel de refonte v2 — jamais pour la seule raison du
   confort de rangement.

---

## 10. Rattachement aux référentiels

- **E-009 (nouvel epic)** — Cadre d'architecture de l'information. Statut : **CADRÉ — grille
  livrée et adoptée, appliquée au fil de l'eau, aucun chantier dédié**. Ajouté à
  `ProductBacklog.md`.
- **A-037 (nouvelle hypothèse)** — la grille intention × accès suffit à trancher le placement
  d'une feature sans repasser par un arbitrage du Roi à chaque fois ; validée sur 4 cas
  rétrospectifs, à confirmer sur les prochaines features réellement inédites. Ajoutée à
  `Assumptions_Log.md`.
- Pas de nouveau `BR-xxx` : ce cadre est une convention de rangement/nav, pas une règle d'accès
  aux données — les règles d'accès existantes (BR-008/009/011/015/020) restent la source de
  vérité, la grille les organise, ne les remplace pas.
- Pas de nouveau `F-xxx` : ce n'est pas une fonctionnalité livrable, c'est un cadre de décision
  interne — `FeatureInventory.md` reste inchangé, référencé en croisement uniquement.
