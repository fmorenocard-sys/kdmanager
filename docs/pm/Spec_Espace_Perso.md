# Spec — Espace perso « Moi » (ex-« My Space »)

> Date : 2026-08-12 · Statut : **§12 tranché par le Roi le 2026-08-12 — en implémentation (Lot 1)**.
> Les 4 décisions restantes sont verrouillées (voir §12) : nav interim puis Pilotage · paliers différés
> (cible unique 100 %) · rappels différés (US-036) · Mes stats web dans le périmètre MVP (Lot 4).
> Chantier mené **sur branche `feat/espace-perso-moi` + canal de preview staging**, jamais direct en prod.
> Prolonge **E-009** (`Etude_Architecture_Information.md`) et son prolongement `Brief_Espace_Joueur.md`
> (**US-038**). Matérialise la section « Mon jeu » de la grille E-009 en une page réelle.
> Entrée fixe : **F-032**, épic **E-009** (pas de nouvel épic — c'est l'exécution de son prolongement).
> User stories nouvelles : **US-039 à US-044**. Assumptions nouvelles : **A-039, A-040**.
> Décisions du Roi verrouillées le 2026-08-12 (§1) — non rediscutées ici, seulement inscrites et
> déclinées en implémentation.

---

## 0. Ce que cette spec est et n'est pas

**Demandé** : le passage brief → design → construction. Le mock hi-fi
(`design_references/My Space - Exploration.dc.html`, Turn 2, piste 1a) a fixé la structure, les 7 états
et les copies de référence — cette spec les traduit en composants réels (composés ou créés), routing,
modèle de données consommé (déjà existant, rien de nouveau côté Firestore), impact nav, i18n, et lots
d'effort.

**Pas demandé** : retrancher les décisions déjà actées par le Roi le 2026-08-12 (§1) — je les inscris,
je ne les remets pas en question. Je ne construis pas non plus les paliers 60/100/150 % ni les rappels
(différés explicitement, §1 point de périmètre + §9).

**Ce que je tranche seul** : le mapping composant-par-composant (composer vs créer, §5), la hiérarchie
d'écran mobile/desktop (§6, déjà dessinée par le mock — je la documente, je ne la réinvente pas), le
traitement de BR-008 pour « Mes stats » web (§8.3 — clarifié, pas un nouveau gate), le découpage en lots
(§10). **Ce qui reste au Roi** : §12 — placement du War Dashboard dans la nav (bascule de nav visible,
réservée par doctrine E-009 §2.4), paliers oui/non, rappels MVP ou différés (déjà tranché différé par le
brief mais à confirmer), Mes stats web oui/non (déjà largement instruit par le périmètre demandé —
présenté comme acté sauf objection).

---

## 1. Décisions du Roi (2026-08-12) — verrouillées, inscrites

| # | Décision |
|---|---|
| 1 | **Nom : « Moi » (nav) / « Me » en anglais** — pronom, pas un acronyme (HQ écarté : pas d'abréviation propre en ES/IT/TR/UK/PL/VI/AR). Clé i18n dédiée dans les **10 langues** (voir §11, correction du chiffre CLAUDE.md — 10 dossiers de locale existent réellement, `it/` inclus, pas 9). |
| 2 | **Espace universel** : Warrior, Officier, Roi ont le **même** espace — les rôles ajoutent des **couches** (Pilotage, Administration) au-dessus, ils n'ont pas un espace personnel différent. **Discipline stricte** : « Moi » reste perso même pour le Roi — aucun raccourci leadership dedans. |
| 3 | **Scission du War Tracker** : part perso (F-006 déclaration + F-014/F-026/F-027 mon objectif) migre dans Moi, pour **tous**. Part leadership (War Dashboard = déclarations de tout le royaume + table d'objectifs campagne-entière/F-029) reste une surface **Pilotage**. Zéro duplication de code ni de données. |
| 4 | **Landing auth-dépendante** : connecté → **Moi** ; visiteur/non connecté → **Dashboard royaume** (public, vitrine, renommé entrée **« Royaume »**). Route `/` = aiguillage. |

**Périmètre acté avec ces décisions (rappel des instructions de cadrage, non rediscuté)** :
- **MVP** : structure action-first (prochaine action → sinon jalon+countdown → % objectif) + les 7 états
  du mock (loading, erreur scan, hors-campagne, objectifs pas publiés, non déclaré, déclaré, multi-compte)
  + blocs existants composés (mon objectif cible unique 100 %, calendrier read-only, mes comptes,
  déclaration filler par compte) + Mes stats **minimal**, **sans Kingdom rank**.
- **Différé** : paliers 60/100/150 % + récompenses (mécanique leadership inexistante — §9), rappels
  « Remind me to declare » (= F-031 V2/US-036, Cloud Scheduler + fallback in-app A-031, §9).

---

## 2. État actuel vérifié — ce qui existe déjà et ce qui n'existe pas

**Déclaration (F-006/F-026, `AvailabilityForm.jsx`).** Live. Distingue déjà comptes `war` (formulaire
complet, sélecteur si plusieurs) et `filler` (bloc dédié `FillerDeclarationBlock.jsx`, sélection multiple
+ T4/T5 par compte). Lit `useAuth().accounts` (`[{governorId, type, isPrimary}]`) et
`kvk_config/current` pour la fenêtre de campagne. Détecte déjà `kvkConfig?.status === 'closed'` (BR-013)
pour désactiver la saisie hors-saison.

**Objectifs (F-014/F-027, `KvkGoalsPanel.jsx`).** Live, mais **construit pour le leadership**, pas pour
Moi : c'est une **table** (recherche, tri, `viewMode` Déclarants/Top du royaume) qui, pour un
non-leadership, filtre déjà `scoped.filter(r => r.isMe)` — **la logique « ma ligne » existe donc déjà**,
noyée dans un composant de table pensé pour l'audience leadership. Le mock ne dessine **pas** une table :
il dessine une **carte compacte** (barre + paliers/tiers + KP/morts). Ces deux formes ne sont **pas** le
même composant — voir §5.2, décision de refactor.

**Calendrier (F-031, `CampaignTimelineBanner.jsx`).** Live (MVP 2026-08-10), déjà **prop-driven**
(`{ timeline, campaignName }`), déjà composable tel quel dans une nouvelle page sans modification.

**Comptes (F-025, `ProfilePage.jsx`).** Live. Recherche/claim, changement de type, désignation
principal — `useAuth().{accounts, claimAccount, unclaimAccount, setAccountType, setPrimaryAccount}`.
Page complète (recherche + roster combiné Top 300 + fillers + mains KvK), pas un composant condensé —
le bloc « Mes comptes » du mock (résumé + lien « Gérer ») est un **sous-ensemble d'affichage**, pas
la page entière.

**Mes stats web.** **N'existe pas.** Vérifié : aucun composant dans `src/` ; seule la commande Discord
`/mystats` (`functions/`, F-012) calcule l'équivalent, réservée au canal Discord. C'est un **candidat à
construire**, pas un composant existant à réutiliser (§5.3).

**War Dashboard (leadership, `WarDashboard.jsx`).** Live, à part, lit toute la collection
`war_availabilities` (groupée par `governorId`, pas par `uid` — non affecté par la scission). Reste
strictement Pilotage, hors périmètre de Moi (décision 3).

**Nav actuelle (`src/components/BottomNav.jsx` + `App.jsx` Sidebar desktop).** **Deux fichiers, deux
tableaux `NAV_ITEMS` distincts, non partagés** — dette déjà connue (à garder en tête pour l'effort §10,
pas un fait nouveau introduit par cette spec). État observé : **6 slots pleins pour le leadership**
aujourd'hui (`/` Dashboard, `/war-tracker`, `/kvk`, `/trophies`, `/deadweight` [leadership], `/bank`) —
**déjà au plafond**, avant même d'ajouter Moi. Pour un Warrior : 5 slots (pas de Deadweight). `/profile`
et `/admin` ne sont **pas** dans les 6 — Profil via le menu avatar, Admin via une icône de rail desktop
séparée du plafond des 6 (absente du mobile). C'est le précédent qui rend possible la recommandation
du §7.3 : une surface leadership peut vivre hors des 6 slots.

---

## 3. Routing — l'aiguillage `/`

```
/                → Aiguillage (nouveau composant léger, pas une page)
                     - authentifié  → <Navigate to="/me" replace />
                     - non authentifié → <Navigate to="/royaume" replace /> (ou rendu direct du
                       Dashboard si on préfère éviter un redirect visible ; HashRouter + SPA sans
                       SEO réel, donc pas d'enjeu de crawl — choix d'implémentation libre)
/royaume         → Dashboard actuel (`DashboardPage`), renommé d'intention seulement — **aucun
                     changement de contenu**. Route neuve, alias de l'ancienne racine.
/me              → **Nouvelle route**, la page Moi (§6).
/war-tracker     → Conservée, mais **son contenu change** (§4) : ne porte plus que le War Dashboard
                     (Déclaration + Objectifs en sont retirés, migrés dans /me). Onglets `?tab=` réduits
                     à un seul contenu — le sélecteur d'onglets de `WarTrackerPage.jsx` disparaît côté
                     UI (plus qu'une seule vue), la route reste pour compat / lien direct.
```

**Pourquoi une route dédiée `/me` plutôt que faire porter le contenu par `/` directement** : le mock
lui-même distingue « Moi » et « Royaume » comme deux entrées de nav séparées (pas une seule repointée
selon l'auth) — un utilisateur connecté doit pouvoir revenir consulter le Royaume sans perdre son point
d'entrée personnel, et un visiteur qui se connecte en cours de session doit atterrir sur une URL stable
`/me`, partageable, cohérente avec le pattern HashRouter déjà en place (`/profile`, `/bank`, etc., tous
des routes nommées, pas des vues conditionnelles sur `/`).

**BR-002 (hiérarchie de rôle)** : `/me` est **login-only**, pas de gate de rôle — Warrior, Officer, King
y accèdent identiquement (décision 2). Pattern `AccessGate` existant (login-only 🔑, déjà utilisé pour
`/profile` et l'onglet Déclaration).

---

## 4. Scission du War Tracker — ce qui bouge, ce qui reste

| Bloc | Aujourd'hui | Après cette spec |
|---|---|---|
| Déclaration (F-006/F-026) | `WarTrackerPage` onglet `declaration`, `AvailabilityForm` | **Déplacé** dans `/me` (composé tel quel, §5.1) |
| Objectifs — ma ligne (F-014/F-027) | `WarTrackerPage` onglet `goals`, `KvkGoalsPanel` filtré `isMe` pour un Warrior | **Nouveau composant condensé** `MyGoalCard` dans `/me` (§5.2), alimenté par la même logique de calcul, pas dupliquée |
| Objectifs — Top du royaume (F-029) + table Déclarants (leadership) | `WarTrackerPage` onglet `goals`, `KvkGoalsPanel`, `viewMode` | **Reste** dans `KvkGoalsPanel`, qui **reste** accessible — mais depuis où ? Sa page hôte (`WarTrackerPage`, onglet `goals`) n'a plus de raison d'exister pour un Warrior une fois Déclaration et Objectifs-perso partis. Pour le leadership, cet onglet doit **rester** quelque part — voir §7 (rattaché à War Dashboard/Pilotage) |
| War Dashboard (leadership) | `WarTrackerPage` onglet `dashboard`, `WarDashboard` | **Reste** Pilotage. Sans changement de composant. Seul son point d'entrée nav est en question (§7) |
| Calendrier (F-031) | Bandeau en tête de l'onglet `goals` (`CampaignTimelineBanner`) | **Déplacé** dans `/me` (composé tel quel, §5.1) — il était déjà mal placé (niché dans un onglet qu'il fallait savoir ouvrir, constat du brief §1) |

**Conséquence directe sur `WarTrackerPage.jsx`** : la page ne garde, pour le leadership, que deux
onglets utiles — **Objectifs (vue Déclarants/Top du royaume)** et **War Dashboard** — les deux
100 % Pilotage désormais (l'objectif « ma ligne » n'a plus besoin d'y vivre, il est dans Moi). Pour un
Warrior, la page n'a **plus aucun contenu accessible** (les deux onglets restants sont leadership-only).
**Recommandation** : renommer conceptuellement `WarTrackerPage` en surface **Pilotage — Guerre**
(le libellé nav change, voir §7), gardée derrière un `AccessGate` leadership au niveau page, pas
seulement par onglet — cohérent avec §7.2 de `Etude_Architecture_Information.md` (le War Dashboard
était déjà identifié comme un écart de regroupement).

---

## 5. Composer vs créer — mapping composant par composant

### 5.1 Composés tels quels, aucune modification de logique

| Composant | Réutilisation dans `/me` |
|---|---|
| `AvailabilityForm.jsx` | Monté directement — porte déjà la logique multi-compte `war`/`filler`, BR-013 (hors-saison), tout le flux de déclaration. **Aucune modification requise.** |
| `CampaignTimelineBanner.jsx` | Monté directement, `{ timeline, campaignName }` déjà prop-driven. **Aucune modification requise.** |
| `FillerDeclarationBlock.jsx` | Déjà consommé par `AvailabilityForm` (pas un montage séparé) — inclus par transitivité. |

### 5.2 À factoriser — extraire la logique « ma ligne » de `KvkGoalsPanel`

`KvkGoalsPanel.jsx` construit déjà, en interne, la donnée d'un utilisateur non-leadership
(`scoped.filter(r => r.isMe)`, jointure `kvkStats`/`kvkFillerStats`/déclarations par `governorId`,
appel à `computeKvkGoals`/barème filler). C'est la **bonne source de vérité**, mais son rendu est une
ligne de table (colonnes KP min/objectif/statut), pas la carte du mock (barre + paliers + KP/morts en
grille 2×1).

**Décision de refactor** : extraire cette logique dans un **hook partagé** `useMyKvkGoals()` (nouveau
fichier, `src/hooks/useMyKvkGoals.js` ou intégré à `src/lib/kvkGoals.js`), qui retourne, pour l'
utilisateur courant, un tableau de lignes (une par compte réclamé, `war` et `filler` mêlés, chacune avec
son propre barème — cf. BR-016/018) — la même donnée que `KvkGoalsPanel` calcule déjà pour `isMe`, mais
exposée sans dépendance à un composant de table.

- `KvkGoalsPanel.jsx` consomme le hook pour sa ligne « moi » **quand elle existe** (pas de duplication
  de calcul), garde son rendu table pour le leadership et le Top du royaume — **changement interne
  minime**, aucun changement de comportement visible pour le leadership.
- **Nouveau composant** `MyGoalCard.jsx` (`src/components/war/` ou `src/components/me/`) consomme le
  même hook et rend la carte du mock : barre de progression, repères 60 %/100 %, KP/morts en grille,
  mention `BR-019` (statut masqué en campagne — le hook expose déjà `revealed`/`statusLabel` sur le
  même mécanisme que `KvkGoalsPanel`). **S'il y a plusieurs comptes**, une carte par compte, ou une
  carte par défaut sur le compte principal (`isPrimary`) + sélecteur — **calé sur le même pattern** que
  `AvailabilityForm` (pills de sélection si plusieurs comptes `war`, liste pour les `filler`) — pas un
  nouveau pattern d'interaction à inventer.

**Sans les paliers 60/100/150 %** (différé, §9), la carte du mock se réduit à ce qu'elle montre déjà
en `#2a` (états `notDeclared`/`declared`/`multi`) : barre simple + cible 100 % unique + repère 60 %
minimum (celui-ci **existe déjà** dans le barème `war` actuel — `computeKvkGoals` calcule un minimum,
donc le repère 60 % du mock n'est **pas** un palier de récompense nouveau, juste l'affichage d'une
donnée déjà calculée). Seuls les paliers **150 % + récompenses** sont hors MVP.

### 5.3 À créer — nouveaux composants

| Composant | Rôle | Donnée |
|---|---|---|
| `MeLandingPage.jsx` (`src/pages/`) | Page `/me`, orchestration des 7 états (§6), assemble les blocs ci-dessous | Combine `AuthContext` (accounts, currentUser), `DataContext` (loading/error, players/kvkStats/kvkFillerStats), `kvk_config/current` (statut campagne) |
| `NextActionCard.jsx` | Carte amber « prochaine action » — état non-déclaré vs déclaré (reçu compact) — cœur de la hiérarchie action-first | Dérivée de la présence/absence de doc(s) `war_availabilities` pour les comptes de l'utilisateur (même requête que `AvailabilityForm` fait déjà pour savoir si un compte a déjà déclaré) |
| `MyGoalCard.jsx` | Voir §5.2 | `useMyKvkGoals()` (nouveau hook) |
| `MyAccountsSummary.jsx` | Résumé condensé « Mes comptes » (liste + badges type/principal + lien « Gérer » → `/profile`) — **pas** une réplique du flux claim/type/principal complet de `ProfilePage` | `useAuth().accounts` |
| `MyStatsCard.jsx` | Carte compacte parité `/mystats`, **sans Kingdom rank** (périmètre acté §1) : puissance, KP gagné, morts T5. Retirable sans laisser de trou dans la mise en page (le mock le dit explicitement) | `players`/`kvkStats`/`kvkFillerStats` filtrés sur les `governorId` de l'utilisateur |
| États `OffCampaignCard`, `NoGoalPublishedCard`, `ErrorCard`, `LoadingSkeleton` | Les 4 états non couverts par une simple absence/présence de données — copies calées sur le mock (§6.2) | `kvk_config/current.status`, erreurs `DataContext`, absence de `kvkStats`/`initialPower` pour l'utilisateur |

**Aucun de ces composants nouveaux ne touche Firestore en écriture au-delà de ce qui existe déjà**
(`AvailabilityForm`/`FillerDeclarationBlock` gèrent déjà toutes les écritures) — `/me` est
essentiellement une **couche de lecture + orchestration**, pas une nouvelle source de vérité.

---

## 6. Hiérarchie d'écran — mobile 360 et desktop

Reprend directement l'ordre validé par le mock (`#2a`/`#1a`), pas une réinterprétation :

### 6.1 Ordre vertical (mobile, scroll unique, conforme `.agent/rules/responsiveness.md`)

1. En-tête (avatar, pseudo, rôle, royaume — pattern `PageHeader` existant)
2. **Carte « Prochaine action »** (amber si non déclaré, reçu compact vert si déclaré) — `NextActionCard`
3. **Calendrier** (`CampaignTimelineBanner`, composé tel quel)
4. **Mon objectif KvK** (`MyGoalCard`)
5. **Mes stats** (`MyStatsCard`) — retirable sans trou (§5.3)
6. **Mes comptes** (`MyAccountsSummary`, lien « Gérer » → `/profile`)

**Multi-compte** : si l'utilisateur a plusieurs comptes non déclarés, l'étape 2 devient une **liste** de
cartes amber (une par compte en attente), comme dans l'état `isMulti` du mock — pas un agrégat texte
seul. Rollup compact (« 2/4 déclarés ») en tête de cette section, barre de progression fine.

### 6.2 Les 7 états (repris du mock, un seul écran change de contenu, pas de nouvelle page)

| État | Déclenchement | Contenu |
|---|---|---|
| **Loading** | `DataContext.loading` ou fetch `kvk_config` en cours | Squelettes calés sur la géométrie réelle des cartes (pas de spinner, pas de saut de layout) |
| **Erreur scan** | `DataContext.error` (ex. échec de lecture Firestore) | Bandeau rouge « chiffres périmés », dernier scan réussi horodaté, bouton **Réessayer** ; en dessous, l'objectif **grisé, pas caché** (un chiffre périmé vaut mieux qu'une page vide) |
| **Hors-campagne** | `kvk_config/current.status === 'closed'` (BR-013, déjà détecté par `AvailabilityForm`) | « KvK N est terminé, rien à déclarer » + carte résultat final (BR-019 : statut **visible** une fois la campagne close, contrairement à l'état live) + carte « prochaine campagne : pas encore annoncée » |
| **Objectifs pas publiés** | Compte a une déclaration mais pas de `initialPower`/référence dans `kvkStats` pour la campagne courante | Carte pointillée « pas encore publié », **pas** une barre à 0 % (se lirait comme un échec) ; le reçu de déclaration reste visible au-dessus |
| **Non déclaré** | Aucun doc `war_availabilities` pour un/plusieurs comptes, campagne active | `NextActionCard` amber, CTA « Déclarer ma disponibilité » |
| **Déclaré** | Doc(s) présents | Reçu compact vert + bouton Modifier |
| **Multi-compte** | `accounts.length > 1` | Rollup + liste des comptes en attente (amber) et déclarés (vert), voir §6.1 |

Ces 7 états ne sont **pas mutuellement indépendants dans le code** : Hors-campagne/Erreur/Loading sont
des états de **page entière** (remplacent tout le contenu sous l'en-tête) ; Non déclaré/Déclaré/Objectifs
pas publiés/Multi-compte sont des variantes de la **carte action** à l'intérieur d'une page par ailleurs
identique (calendrier, stats, comptes restent affichés). `MeLandingPage.jsx` doit distinguer ces deux
familles d'état dans son arbre de rendu, pas les traiter comme 7 branches `if` au même niveau.

### 6.3 Desktop ≥ 1024px

Grille 2 colonnes (1.25fr/1fr ou 1.15fr/1fr selon densité), calée sur le mock desktop : colonne gauche
= carte action + (si multi-compte) lignes de comptes en attente déclarables en place ; colonne droite =
objectif + calendrier/stats + comptes. Au-delà de 3 comptes en attente, les cartes empilées cèdent la
place à des **lignes** dans une carte amber unique (le mock le documente explicitement comme le point de
bascule) — pas une règle inventée ici, reprise telle quelle.

---

## 7. Impact bottom-nav / sidebar (6 slots) — recommandation

### 7.1 Le constat chiffré

Aujourd'hui, pour le leadership, les 6 slots sont **déjà pleins** (`/`, `/war-tracker`, `/kvk`,
`/trophies`, `/deadweight`, `/bank`). Après la scission (§4), **7 intentions distinctes** ont besoin
d'un point d'entrée : Moi, Royaume, KvK, Trophées, Banque (universels) + War Dashboard, Deadweight
(leadership). 7 > 6 — quelque chose doit céder la place, pour tout le monde ou pour le leadership.

### 7.2 Option recommandée (cible) — fusionner War Dashboard et Deadweight sous « Pilotage »

Les deux sont déjà classés dans la **même** section cible par la grille E-009 adoptée (§3.1 de
l'étude : *Pilotage = War Dashboard, Deadweight, Course, Progression du Royaume*). Les fusionner sous
une entrée unique **« Pilotage »** (leadership-only, deux onglets internes ou vue unique selon densité)
libère exactement le slot qu'il faut :

- Universel (5) : Moi, Royaume, KvK, Trophées, Banque
- + leadership (1) : Pilotage (War Dashboard + Deadweight)
- **= 6 pour le leadership, 5 pour un Warrior** — sous le plafond, marge d'un slot pour un Warrior.

**Coût** : ce n'est pas un renommage cosmétique gratuit — ça touche 2 fichiers nav dupliqués
(`BottomNav.jsx` + `App.jsx` Sidebar, dette déjà notée §2), l'i18n du nouveau libellé « Pilotage » dans
les 10 langues × 2 emplacements (`src/locales/` + `public/locales/`), et la suite Playwright qui
référence les routes/libellés actuels. **C'est une bascule de nav visible** au sens de la doctrine
E-009 §2.4 — réservée au Roi, pas tranchable par cette spec seule. Effort classé **M** (§10).

### 7.3 Option interim — repointer seulement le slot « Guerre » vers Moi

Repointer `/war-tracker` (actuel slot « Guerre ») vers `/me` pour tout le monde. War Dashboard **perd sa
place dans la barre** dès le lancement de Moi, reste joignable par son URL directe (`/war-tracker`,
désormais mono-contenu) — précédent déjà en place pour `/admin` (rail desktop séparé du plafond,
absent du mobile, cf. §2). Dette de navigabilité temporaire pour un public restreint (leadership),
acceptable le temps que l'option §7.2 soit construite. Effort **S** — seul le libellé/route d'un slot
existant change, pas de nouvelle section, pas de nouveau composant nav.

### 7.4 Recommandation

**Lancer Moi avec l'option interim (§7.3)** — c'est le seul chemin qui ne bloque pas la livraison de
Moi sur un chantier de nav plus large, cohérent avec la doctrine « pas de big-bang » déjà actée par
E-009 (§5, migration opportuniste). **Programmer §7.2 (Pilotage) en suivi rapproché**, pas en différé
indéfini — c'est le moment où le coût marginal est le plus bas (on touche déjà la nav pour Moi). Le Roi
tranche laquelle des deux séquences retenir (§12).

---

## 8. i18n, RTL, BR-019, BR-008

### 8.1 i18n — 10 langues, pas 9

`src/locales/*/translation.json` compte **10 dossiers** (`en, fr, de, tr, uk, ar, pl, es, vi, it`) —
correction du chiffre de `CLAUDE.md` (« 9 langues »), qui est **obsolète** (italien absent de sa liste).
Toute nouvelle chaîne (« Moi », les 7 états, libellés de carte) va dans les **10** fichiers
`src/locales/*/translation.json` **et** `public/locales/*/translation.json`, comme pour toute feature du
projet — aucune dérogation.

### 8.2 RTL (arabe)

`MeLandingPage` et ses cartes suivent le pattern déjà en place ailleurs (propriétés logiques
`start`/`end`, `ms-`/`me-`) — pas de nouveau pattern, les composants composés (`AvailabilityForm`,
`CampaignTimelineBanner`) sont déjà RTL-safe.

### 8.3 BR-019 (statut masqué en campagne)

Déjà géré par le hook `useMyKvkGoals()` proposé (§5.2), qui reprend le même mécanisme que
`KvkGoalsPanel` (`kvk_config/current.revealGoalStatus`, King-only). Les **chiffres** (KP, %, morts)
restent toujours visibles ; seul le **label de statut** (Dead Weight/Excellent…) est gaté — `MyGoalCard`
n'affiche donc **jamais** de pastille de statut pendant une campagne active, exactement comme
`KvkGoalsPanel` aujourd'hui.

### 8.4 BR-008 (Discord-gate) — clarification, pas un nouveau gate

**Vérifié dans le code, pas supposé** : BR-008 gate deux surfaces précises — l'onglet **Comptes
Secondaires (fillers)** et l'onglet **Progression** de la page KvK Performance — parce qu'elles exposent
le **roster collectif** (identités d'autres joueurs). `/me` n'expose **jamais** que les données du
compte de l'utilisateur courant (login-only, pas de rendu d'un roster tiers) — **BR-008 ne s'applique
donc pas à `/me`**, sur le même principe que Déclaration/Objectifs (déjà login-only aujourd'hui, jamais
Discord-only). Le seul point de dégradation pour un utilisateur non lié Discord est **cosmétique** :
l'avatar (F-016, cascade Lilith CDN → Discord → JPG local → logo) retombe simplement sur un palier
inférieur de la cascade déjà existante — aucun nouveau traitement à construire. **A-039 (nouvelle
hypothèse)** nomme ce point pour mémoire (aucune vérification a posteriori nécessaire, le mécanisme
existe déjà et est déjà exercé par F-016 partout ailleurs dans l'app).

---

## 9. Hors périmètre MVP — nommé, pas oublié

- **Paliers 60/100/150 % + récompenses.** Le mock l'annonce lui-même comme un point ouvert (« Tier
  rewards. 60/100/150 % ... are placeholders. If tiers aren't a real leadership mechanic, the block
  collapses back to a single 100 % target »). **Aucune mécanique de récompense par palier n'existe
  aujourd'hui côté leadership** (ni en Firestore, ni en UI) — construire l'affichage sans la mécanique
  produirait une promesse vide. `MyGoalCard` livre donc la version simple : barre + cible 100 % + repère
  60 % minimum (déjà calculé par le barème existant, pas un nouveau champ). Le palier 150 % ne
  s'affiche **pas** au MVP.
- **Rappels « Remind me to declare ».** Couvert par **US-036** (déjà loggée, E-008, F-031 V2) — exige
  Cloud Scheduler (brique non posée) et le fallback in-app (chantier L, A-031) pour les royaumes sans
  Discord. Pas repris par cette spec, juste référencé comme dépendance externe déjà trackée.
- **Off-campaign — visibilité du rating final.** Le mock nomme explicitement l'hypothèse : « Showing
  112 % after the season assumes the rating becomes public at season end. » C'est **déjà couvert par
  BR-019** (le statut est révélé une fois la campagne close, indépendamment de `revealGoalStatus` qui ne
  gate que la campagne live) — pas une nouvelle question, une confirmation que la carte hors-campagne du
  §6.2 peut afficher le statut sans gate supplémentaire.

---

## 10. Lots d'implémentation (effort S/M/L)

| Lot | Contenu | Effort | Dépend de |
|---|---|---|---|
| **Lot 1 — Socle** | Route `/me` + `/royaume` + aiguillage `/` ; `MeLandingPage` ; états Loading/Erreur/Hors-campagne/Objectifs-pas-publiés ; composition `AvailabilityForm` + `CampaignTimelineBanner` ; nav interim §7.3 (repointer le slot Guerre) | **M** | Rien (tout le socle Firestore existe) |
| **Lot 2 — Objectif perso** | Hook `useMyKvkGoals()` (extraction depuis `KvkGoalsPanel`) ; `MyGoalCard` (barre + repère 60 % + cible 100 %, sans paliers) ; câblage BR-019 | **M** | Lot 1 (page hôte) |
| **Lot 3 — Comptes** | `MyAccountsSummary` (résumé + lien Gérer) ; multi-compte dans `NextActionCard` (rollup, liste pending/done) | **S** | Lot 1, Lot 2 (partagent le state des comptes) |
| **Lot 4 — Mes stats web** | `MyStatsCard` (parité `/mystats` sans Kingdom rank) — nouveau composant, nouvelle logique de lecture (pas de duplication de calcul, juste un filtre sur `players`/`kvkStats`/`kvkFillerStats` déjà chargés) | **S** | Lot 1 — **sous réserve de la décision Roi §12.4** |
| **Lot 5 — Scission WarTrackerPage** | Retirer les onglets Déclaration/Objectifs-perso de `WarTrackerPage` ; `AccessGate` leadership au niveau page ; renommage nav interne | **S** | Lot 1 (une fois Déclaration/Objectifs vivent ailleurs, sûr de ne rien casser) |
| **Lot 6 — Pilotage (cible nav, §7.2)** | Fusion War Dashboard + Deadweight sous une entrée « Pilotage » ; nav 2 fichiers + i18n 10 langues × 2 + tests Playwright | **M** | Lot 5 — **sous réserve de la décision Roi §12.1** |
| *(Différé)* Paliers 60/100/150 % | Nécessite d'abord une mécanique de récompense leadership (hors périmètre produit actuel) | — | Décision Roi préalable (§9) |
| *(Différé)* Rappels déclaration | US-036 (E-008), Cloud Scheduler + A-031 | — | Chantier séparé, déjà trackée |

**Séquencement recommandé** : Lot 1 → Lot 2 → Lot 3 en continu (un seul chantier cohérent, la page
n'a de sens qu'avec ces trois blocs) ; Lot 5 immédiatement après (éviter de laisser `WarTrackerPage`
dans un état incohérent — deux surfaces qui affichent la même donnée en parallèle le temps d'un
sprint serait une régression de confusion, pas une transition propre) ; Lot 4 et Lot 6 sont chacun
indépendamment reportables sans casser le reste.

---

## 11. Rattachement aux référentiels

- **F-032 — Espace perso « Moi »** (nouveau) : page `/me`, orchestration action-first des 7 états,
  compose F-006/F-014/F-026/F-027/F-031, nouveau bloc Mes stats web. Épic **E-009** (pas de nouvel
  épic — exécution du prolongement déjà noté dans `ProductBacklog.md` ligne 38).
- **US-039 (E-009)** : En tant que Warrior/Officer/King connecté, je veux atterrir sur mon espace perso
  à la connexion plutôt que sur le Dashboard collectif, afin de voir en un écran ce qu'on attend de moi.
  *(Décision 4, §3 — routing.)*
- **US-040 (E-009)** : En tant qu'utilisateur multi-compte, je veux voir en un coup d'œil combien de mes
  comptes ont déclaré et lesquels sont en attente, afin de ne pas oublier un compte filler. *(§6.1,
  Lot 3.)*
- **US-041 (E-009)** : En tant que joueur, je veux voir mon objectif KvK sous forme de carte condensée
  (barre + KP/morts), sans naviguer vers une table pensée pour le leadership. *(§5.2, Lot 2.)*
- **US-042 (E-009)** : En tant que joueur, je veux un résumé compact de mes stats de campagne
  (puissance, KP gagné, morts) directement dans l'app web, sans dépendre de Discord. *(§5.3, Lot 4 —
  sous réserve §12.4.)*
- **US-043 (E-009)** : En tant que Roi/Officier, je veux retrouver le War Dashboard et Deadweight sous
  une même entrée de navigation « Pilotage », afin que l'espace « Moi » universel tienne dans le
  plafond des 6 slots. *(§7.2, Lot 6 — sous réserve §12.1.)*
- **US-044 (E-009)** : En tant que joueur, je veux que mon calendrier de campagne et ma prochaine
  action vivent au même endroit que ma déclaration, plutôt que nichés dans un onglet du War Tracker.
  *(§4/§6.1, Lot 1.)*
- **A-039 (nouvelle)** : `/me` n'a pas besoin d'un gate BR-008 — seules les vues de roster collectif
  (Comptes Secondaires, Progression) le nécessitent ; `/me` n'expose que les données de l'utilisateur
  courant. Vérifié dans le code (§8.4), pas une hypothèse à confirmer a posteriori — nommée par
  discipline documentaire, pas par doute réel.
- **A-040 (nouvelle)** : la carte « prochaine action » en tête d'écran (structure action-first du mock)
  convertit mieux le taux de déclaration que l'ordre alternatif « objectif d'abord » (piste 1b,
  archivée) — **non vérifié, aucune donnée d'usage disponible** (le mock le dit lui-même : « No usage
  data exists to choose between 1a and 1b »). Reprend et confirme l'hypothèse déjà nommée dans
  `Brief_Espace_Joueur.md` §8 plutôt que d'en ouvrir une redondante. À confirmer par un A/B sur le taux
  de déclaration d'une campagne, si le sujet redevient un point de friction observé.
- **Pas de nouvelle règle BR** : BR-019, BR-008, BR-013, BR-016/017/018 sont **consommées telles
  quelles** par cette spec, aucune n'est amendée.
- **`FeatureInventory.md`** : ajouter F-032 (Espace perso « Moi »), statut *Spec, non démarré*, tier
  **Gratuit** par construction (compose exclusivement des features déjà classées Gratuit — F-006, F-014,
  F-025/026/027 ; aucune nouvelle fonctionnalité premium introduite). Mettre à jour la ligne F-006/F-014
  pour noter que leur part perso est désormais matérialisée dans F-032 (sans dupliquer leur description).
- **`Matrice_Acces.md`** : ajouter une ligne **P-0xx « Espace perso » `/me`** — 🔑 login-only, tous
  rôles identiques (décision 2) ; ajouter la colonne « Section IA cible » recommandée par E-009 §5.3 à
  cette occasion (coût marginal proche de zéro puisqu'on touche déjà ce fichier).

---

## 12. Décisions du Roi — TRANCHÉES le 2026-08-12

| # | Sujet | Décision | Conséquence |
|---|---|---|---|
| 1 | **Placement du War Dashboard dans la nav** | **Interim (§7.3)** : lancer Moi en repointant le slot « Guerre » vers `/me` ; War Dashboard reste joignable par URL. **Puis** fusion « Pilotage » (§7.2, Lot 6) en **suivi rapproché**, pas en différé indéfini. | Lot 1 embarque la nav interim (effort S). Lot 6 programmé juste après Lot 5. Ne bloque pas Moi. |
| 2 | **Paliers 60/100/150 % + récompenses** | **Différé** — MVP = **cible unique 100 %** + repère 60 % (déjà calculé par le barème war). Palier 150 % + récompenses attendent une vraie mécanique leadership. | `MyGoalCard` livre la version simple (§5.2). Hors périmètre (§9). |
| 3 | **Rappels de déclaration** | **Différé** — = US-036 (F-031 V2), dépend de Cloud Scheduler + fallback in-app A-031. Chantier séparé déjà tracké. | Aucun impact sur le MVP de Moi (§9). |
| 4 | **Mes stats web (Lot 4)** | **Dans le périmètre MVP** — parité `/mystats` en web (puissance, KP gagné, morts T5), **sans Kingdom rank**. | Lot 4 confirmé (effort S, front pur). Retirable sans trou de layout si besoin (§5.3). |

**Cadre d'exécution acté avec ces décisions** : chantier sur branche **`feat/espace-perso-moi`**,
validé sur le **canal de preview staging** (`firebase hosting:channel:deploy staging`) avant toute
fusion dans `main`. Comme `/me` n'introduit **aucune nouvelle règle Firestore ni Cloud Function** (§13),
le staging front couvre l'intégralité du risque de ce chantier — rien à déployer côté backend prod.

---

## 13. Fichiers impactés (résumé technique, pour le chantier d'implémentation)

**Nouveaux** : `src/pages/MeLandingPage.jsx`, `src/pages/RoyaumePage.jsx` (ou alias route), composant
d'aiguillage `/`, `src/components/me/NextActionCard.jsx`, `MyGoalCard.jsx`, `MyAccountsSummary.jsx`,
`MyStatsCard.jsx`, états `OffCampaignCard`/`NoGoalPublishedCard`/`ErrorCard`/`LoadingSkeleton`,
`src/hooks/useMyKvkGoals.js`.

**Modifiés** : `src/App.jsx` (routes + Sidebar NAV_ITEMS), `src/components/BottomNav.jsx` (NAV_ITEMS),
`src/pages/WarTrackerPage.jsx` (retrait onglets perso, gate leadership niveau page),
`src/components/war/KvkGoalsPanel.jsx` (délégation au hook partagé pour la ligne « moi »),
`src/locales/*/translation.json` **et** `public/locales/*/translation.json` (10 langues, nouvelles
clés « Moi »/états), `docs/pm/FeatureInventory.md` (F-032), `docs/qa/Matrice_Acces.md` (P-0xx `/me`),
`docs/pm/ProductBacklog.md` (US-039 à US-044), `docs/pm/Assumptions_Log.md` (A-039, A-040).

**Non modifiés** : `firestore.rules` (aucune nouvelle collection, aucune nouvelle règle d'écriture —
`/me` est une couche de lecture/orchestration sur des collections déjà accessibles), `functions/`
(aucun changement Cloud Functions).
