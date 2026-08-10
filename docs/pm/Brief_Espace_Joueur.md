# Brief — « Mon espace joueur » (exploration design)

> Date : 2026-08-10
> Statut : **Brief d'exploration, à destination de Claude Design (claude.ai/design, projet « KD Manager
> Design System »).** Ce n'est ni une spec d'implémentation ni un engagement de chantier — c'est la
> matière pour explorer des directions visuelles/structurelles, à arbitrer ensuite par le Roi.
> Origine : prolongement direct de la section **« Mon jeu »** de `Etude_Architecture_Information.md`
> (E-009) — l'espace joueur est la matérialisation à l'écran de cette section, aujourd'hui purement
> documentaire (un classement, pas une page).

---

## 0. Cadrage — ce que ce brief est et n'est pas

**Demandé** : explorer à quoi ressemblerait un espace regroupé pour le Warrior — un « chez moi » qui
fédère ses actions et informations personnelles, aujourd'hui dispersées sur plusieurs surfaces sans
lien entre elles.

**Pas demandé** : une refonte de nav, un big-bang de regroupement de pages, ni une décision de
migration. `Etude_Architecture_Information.md` §5 est explicite — aucune bascule de nav visible n'est
engagée sans justification propre. Ce brief prépare une exploration design ; la décision d'exécuter
(et comment) reste au Roi, après retour de Claude Design.

**Ce que je tranche seul dans ce brief** : le périmètre fonctionnel proposé (§3, dérivé mécaniquement
de la grille E-009), l'analyse de fragmentation (§1, vérifiée code), les JTBD (§2, avec l'hypothèse
mobile nommée explicitement). **Ce qui reste ouvert pour Claude Design** (§7a) et **pour le Roi**
(§7b) est distingué en fin de document.

---

## 1. Intention & problème

Le Warrior n'a **aucun endroit qui lui appartient** dans l'app. Ses fonctions personnelles sont
éparpillées sur quatre surfaces distinctes, sans lien croisé entre elles — vérifié dans le code
(`App.jsx`, `BottomNav.jsx`, `ProfilePage.jsx`), pas supposé :

| Surface | Où | Ce qu'elle porte pour lui |
| :--- | :--- | :--- |
| `War Tracker → Déclaration` (`?tab=declaration`) | Onglet dans `/war-tracker`, atteint via BottomNav (« Guerre ») | Déclarer sa dispo (F-006) |
| `War Tracker → Objectifs` (`?tab=goals`) | Même page, onglet voisin — partagé avec le War Dashboard leadership dans la même page (écart de fond déjà noté en E-009 §1.2) | Ses objectifs KvK (F-014), le bandeau Calendrier F-031 niché en tête |
| `/profile` | **Pas dans la BottomNav** (plafonnée à 6 entrées fixes, M4) — accessible uniquement via le menu déroulant de l'avatar en haut à droite (`App.jsx` L.198-207) | Gestion des comptes réclamés (F-025/026/027), avatar (F-016) |
| Bot Discord `/mystats`, `/mykvk`, `/mykvkgoals` | Canal Discord, hors de l'app web | Résumé stats/objectifs — **même info qu'Objectifs, dans un canal totalement séparé, sans lien retour vers l'app** |

Aucune de ces quatre surfaces ne référence les autres. Rien sur l'onglet Objectifs ne renvoie vers le
profil ; rien sur le profil ne renvoie vers la déclaration ; le bot Discord duplique une partie de
l'information sans passerelle. Un Warrior doit **savoir par cœur** où chaque chose se trouve — c'est
exactement la fragmentation que E-009 a nommée sans la corriger (« Mon jeu » est un classement
documentaire, pas une page qui existe à l'écran).

**Ce que ce brief n'affirme pas** : que cette fragmentation est vécue comme un problème par les
joueurs — aucune remontée utilisateur documentée en ce sens (voir §8, zone d'ombre nommée). L'angle
mort est structurel (visible dans le code et la grille E-009), pas mesuré empiriquement.

---

## 2. Utilisateur cible — le Warrior

**Su** : rôle R-002 (`Matrice_Acces.md`) — joueur vérifié, déclare ses dispos, voit ses propres
stats/objectifs. Hiérarchie Guest < Warrior < Officer < King (BR-002). Rise of Kingdoms est un jeu
mobile.

**Supposé, nommé** : que le Warrior consulte majoritairement l'app **depuis son téléphone**, entre
deux sessions de jeu ou en réaction à un ping Discord — aucune donnée d'usage par device n'est
recensée dans les docs du projet à ce jour. C'est une hypothèse de contexte forte pour ce brief
(elle motive le mobile-first de facto de tout KD Manager, `.agent/rules/responsiveness.md`), mais
non vérifiée spécifiquement pour ce persona. Nommée ici comme **A-038-bis candidate** (voir §9).

### Jobs-to-be-done

| JTBD | Réponse aujourd'hui | Feature |
| :--- | :--- | :--- |
| « Qu'attend-on de moi ce KvK ? » | Onglet Objectifs — sa ligne seule | F-014 (+ F-027 si compte filler) |
| « Suis-je prêt / à jour ? » | Onglet Déclaration — doit vérifier manuellement s'il a rempli, pour chacun de ses comptes | F-006, F-026 |
| « Quand est la prochaine bataille / le prochain jalon ? » | Bandeau Calendrier, niché en tête d'un onglet qu'il faut déjà savoir ouvrir | F-031 |
| « Comment je progresse / je performe ? » | Partiel côté web (taux d'atteinte affiché dans Objectifs) — la vue complète équivalente à `/mystats` n'existe qu'en Discord | F-014 web + **candidat non couvert web** (§3) |
| « Gérer mes comptes (main + fillers) » | Menu avatar → Profil, hors BottomNav | F-025/026/027 |
| (secondaire) « Qui suis-je dans le royaume » | Avatar affiché ponctuellement (carte joueur, `/mystats`) | F-016 |

Ces six JTBD couvrent l'intégralité de ce que la grille E-009 range sous « Agir pour moi-même »
(§2.2 de l'étude) — aucun JTBD supplémentaire n'a été inventé pour ce brief.

---

## 3. Périmètre fonctionnel

### Dedans

| ID | Feature | Rôle dans l'espace | Note |
| :--- | :--- | :--- | :--- |
| **F-006** | Déclaration de dispo | **Action centrale** — le geste que l'espace doit rendre le plus rapide à faire/vérifier | Live |
| **F-014** | Mes objectifs KvK (vue personnelle uniquement, pas « Top du royaume » qui est leadership) | Contenu principal — statut & progression | Live |
| **F-031** | Bandeau Calendrier KvK | Contexte temporel — countdown, prochain jalon | Live (MVP 2026-08-10) |
| **F-025/026/027** | Multi-comptes main+fillers (ajout/retrait/type/principal, déclaration et objectifs par compte) | Bloc de gestion de comptes | ⚠️ **Écart documentaire constaté** — `FeatureInventory.md` les liste « Spec, non démarré », mais le code (`ProfilePage.jsx`, `AuthContext.jsx`, `FillerDeclarationBlock.jsx`, `KvkGoalsPanel.jsx`) montre les trois **livrées et actives**. À corriger dans `FeatureInventory.md` en dehors de ce brief (signalé, pas traité ici — voir §9) |
| **F-016** | Profil + avatar | Identité du joueur dans l'espace | Live |
| **Candidat, pas un F-xxx figé** | « Mes stats » web — équivalent de `/mystats` Discord (résumé puissance, KP, morts, statut) | Explorable, pas engagé | **N'existe pas en web aujourd'hui** — vérifié, aucun composant équivalent dans `src/` (seul `/mystats` côté bot Discord, `functions/`) |

### Dehors — explicitement

Tout ce qui relève de l'intention « Piloter le royaume » (grille E-009 §2.2), sans exception :

- **War Dashboard** (`?tab=dashboard`, leadership)
- **Deadweight** (F-004, `/deadweight`)
- **Course KvK** (F-018/019/020, onglet Course du Hub KvK)
- **Progression du Royaume** (F-022, sous-vue leadership de Progressions)
- **Config, ingestion, clôture, maintenance** (Administration, `/admin`)

Cas à la marge, tranchés par la grille E-009, pas par ce brief :

- **Banque** (F-005) reste **« Le Royaume »**, pas « Mon jeu » — intention dominante = consulter la
  trésorerie collective, le dépôt Officer+ est une action secondaire embarquée (E-009 §2.3). **Reste
  dehors de l'espace joueur.**
- **Trophées** (F-003) est un palmarès **collectif** (MGE/Zenith du royaume), pas une donnée
  individuelle — reste **« Le Royaume »**, dehors.

---

## 4. Hiérarchie & priorité d'écran — le cœur de l'exploration

Question posée à Claude Design : **pour un Warrior qui ouvre l'espace, qu'est-ce qui doit apparaître
en premier ?**

### Hypothèse à challenger

**« Ma prochaine action »** en tête d'écran, avec deux états mutuellement exclusifs :

1. **Dispo non déclarée pour la campagne active** → carte d'action prioritaire, CTA amber-500
   (« Déclarer ma disponibilité », F-006) — l'urgence prime sur tout le reste.
2. **Dispo déjà déclarée** → carte de statut : prochain jalon du calendrier + countdown (F-031),
   avec le % d'atteinte de l'objectif courant (F-014) en évidence secondaire.

En dessous : accès aux blocs Comptes (F-025/026/027), Profil (F-016), et — si retenu — Mes stats.

### Ce qui doit être challengé, pas supposé résolu

- **État hors-KvK** (entre deux campagnes) : pas de dispo à déclarer, pas de countdown pertinent —
  l'espace a besoin d'un état « creux » distinct, pas juste l'absence de la carte prioritaire. Non
  cadré ici, à explorer.
- **Multi-comptes** : si l'utilisateur a plusieurs comptes réclamés (main + fillers), la carte
  d'action doit-elle résumer un agrégat (« 2/3 comptes déclarés ») ou rester compte par compte ? Pas
  tranché — impacte directement la densité de la carte prioritaire.
- **Hiérarchie objectifs vs calendrier une fois déclaré** : lequel prime, le jalon temporel ou le
  score de progression ? Les deux sont candidats à la position n°2, pas démontré lequel convertit
  mieux l'attention du joueur (aucune donnée d'usage disponible pour trancher).

---

## 5. Pistes de structure à explorer

Trois directions, à peser — pas une liste neutre, une recommandation argumentée suit.

### A. Page unique scrollable (« player home »)

Un seul écran, sections empilées verticalement (action prioritaire → calendrier → objectifs →
comptes → profil), aucun sous-onglet. Cohérent avec le mobile-first de facto du produit et la
contrainte no-scroll-horizontal — tout le scroll est vertical, naturel sur téléphone.

- **+** Zéro navigation à apprendre en plus ; résout réellement la fragmentation (tout est visible en
  scrollant, pas en cliquant entre pages).
  **−** Devient dense si « Mes stats » web est ajouté ; nécessite une vraie revue de hiérarchie
  visuelle pour ne pas noyer l'action prioritaire.

### B. Hub à onglets (pattern War Tracker / Hub KvK existant)

Onglets `Dispo | Objectifs | Comptes | Profil` sous une page dédiée, réutilisant le pattern `?tab=`
déjà codé.

- **+** Le moins coûteur à implémenter techniquement (pattern déjà en place, testé, i18n déjà
  câblée pour ce genre de structure).
  **−** **Recrée le problème qu'on veut résoudre** — l'utilisateur clique toujours entre des
  sections cloisonnées, seule la porte d'entrée change. Ne répond pas à l'intention du brief (un
  « chez moi » unifié, pas un nouveau silo à onglets).

### C. Carte d'accueil fédératrice + accès rapides

Une page de synthèse condensée (cartes résumé : dispo, prochain jalon, % objectif, comptes) qui
**deep-linke** vers les pages existantes (`?tab=declaration`, `?tab=goals`, `/profile`) sans les
dupliquer ni les fusionner.

- **+** Coût quasi nul à faire cohabiter avec l'existant — aucune page actuelle ne bouge, cohérent
  avec la doctrine « pas de big-bang » de E-009 §5.
  **−** Résout la **découvrabilité** (un point d'entrée unique, visible) mais pas la
  **fragmentation** elle-même — après le clic, le contenu réel reste dispersé sur plusieurs
  routes.

### Recommandation

**Piste A comme cible, en commençant l'exploration par C comme point d'entrée transitoire.** B est
écarté — c'est un anti-pattern qui coûte du développement pour reproduire le problème sous une
nouvelle porte. La logique : demander à Claude Design d'explorer A directement (une vraie page
unique) évite de payer deux fois le travail de design si C n'est retenue que comme un pis-aller ; le
Roi tranchera si l'exécution démarre par une version C bon marché (fédération de liens) avant de
construire A en profondeur, ou si elle vise A directement — c'est une décision de séquencement
produit, pas de design (§7b).

---

## 6. Principes & contraintes de design

- **Mobile-first strict** — l'espace doit être pensé d'abord pour 360px, pas adapté après coup
  depuis un mockup desktop.
- **Charte v2** (`CLAUDE.md` §Design system) : cartes glass raffinées (bordure gradient hairline),
  **CTA en amber-500** (jamais indigo), **indigo réservé à l'état actif/onglet courant** — la carte
  « prochaine action » (§4) est un CTA, donc amber, pas indigo. Tokens dark/light déjà en place
  (`src/index.css` `@theme`), source de vérité = code, pas le mockup.
- **Aucun scroll horizontal**, à aucun breakpoint (`.agent/rules/responsiveness.md`) — la piste A
  (scroll vertical) est nativement conforme ; toute grille de cartes doit rester en colonne unique
  ou wrap, jamais en scroll latéral.
- **Cibles tactiles ≥ 44×44px**, focus ring visible sur tout élément interactif, contraste WCAG AA.
- **Propriétés logiques** (`start`/`end`, `ms-`/`me-`) — l'arabe RTL est supporté, aucune classe
  `left`/`right` codée en dur dans les maquettes à produire.
- **i18n 10 langues** — toute chaîne visible dans les maquettes devra, à l'implémentation, exister
  dans `src/locales/*/translation.json` **et** `public/locales/*/translation.json` (fr, en, es, de,
  ar, pl, tr, uk, vi + la 10ᵉ si comptée à part) ; les maquettes Claude Design peuvent être produites
  en français ou anglais, mais **pas de texte codé en dur dans l'intention finale**.
- **Cohérence avec la nav M3 existante** — ne rien casser : `BottomNav` est plafonnée à 6 entrées
  fixes en grille sans scroll (commentaire code « 6 entrées max », choix M4 explicite). Si l'espace
  joueur a besoin d'une entrée de nav propre, **c'est une contrainte dure**, pas un détail
  d'exécution — voir §7b.

---

## 7. Questions ouvertes

### 7a. Pour Claude Design — à explorer dans les maquettes

1. Direction visuelle de la piste **A** (page unique scrollable) en dark **et** light, avec la carte
   « prochaine action » en état amber (non-déclaré) vs état neutre/informatif (déjà déclaré).
2. Un composant « résumé multi-comptes » (X/Y comptes déclarés) compact, réutilisable en tête de
   carte prioritaire.
3. L'état « creux » hors-campagne (pas de KvK actif) — que montre l'espace quand il n'y a ni dispo à
   déclarer ni countdown pertinent ?
4. Un traitement visuel pour le candidat « Mes stats » web (§3) qui ne recrée pas un doublon lourd de
   l'onglet Objectifs — carte compacte, secondaire, ou écran dédié ?
5. Le point d'entrée transitoire de la piste **C** (fédération par cartes + deep-links) — à quoi il
   ressemble s'il doit cohabiter visuellement avec l'IA actuelle sans lui ressembler à un doublon.

### 7b. Pour le Roi — décisions produit, pas design

1. **L'espace joueur remplace-t-il l'onglet War Tracker actuel** (Déclaration + Objectifs fusionnés
   dedans, la page actuelle disparaît) **ou vit-il à côté**, comme point d'entrée fédérateur qui
   renvoie vers les pages existantes sans les remplacer ? Détermine si le chantier touche des routes
   existantes (coût i18n/tests, cf. E-009 §5.1) ou seulement une page neuve.
2. **Faut-il construire « Mes stats » web** (parité `/mystats`) ou rester Discord-only pour cette
   information ? Impacte les joueurs sans compte Discord lié (BR-008) — sans web, ils n'ont aucun
   accès à ce résumé.
3. **Où l'espace joueur rentre-t-il dans la nav** — `BottomNav` est plafonnée à 6 entrées fixes
   (M4). Remplace-t-il un slot existant (lequel ?), ou nécessite-t-il un rework de nav que E-009 §5.1
   chiffre justement comme coûteux (9 langues × 2 emplacements, `BottomNav.jsx` à replafonner) ?
   **C'est une bascule de nav visible — réservée au Roi par la doctrine E-009 §2.4, pas tranchable
   par ce brief.**
4. **Tiering** : les features du périmètre (§3) sont déjà classées **Gratuit** dans
   `FeatureInventory.md` §Frontière (F-006, F-014, F-025/026/027). L'espace joueur devrait donc être
   gratuit par construction — **à confirmer**, pas à rouvrir (la frontière du 2026-08-08 est figée).

---

## 8. Zones d'ombre — su vs supposé

**Su (code + docs vérifiés)** : la structure actuelle des 4 surfaces fragmentées (§1, lu directement
dans `App.jsx`, `BottomNav.jsx`, `ProfilePage.jsx`) ; le périmètre F-006/014/016/025-027/031 et leurs
accès (`Matrice_Acces.md`) ; la grille de classement E-009 (§2.2 de l'étude) ; l'absence de composant
« Mes stats » web dans `src/` ; l'écart de statut F-025/026/027 entre `FeatureInventory.md` (« Spec,
non démarré ») et le code (livré).

**Supposé, nommé explicitement** :

- **Usage majoritairement mobile du Warrior** — pas de donnée de télémétrie par device recensée dans
  les docs du projet. Hypothèse forte pour ce brief, non vérifiée spécifiquement pour ce persona.
- **La fragmentation est vécue comme un problème par les joueurs** — c'est un constat structurel
  (code + grille E-009), pas une plainte utilisateur documentée. Même réserve que celle déjà posée
  par E-009 pour ses propres écarts de nav (§7 de l'étude).
- **La priorité « prochaine action » (§4) convertit mieux que « objectifs d'abord »** — non testé,
  aucune base pour trancher entre les deux sans expérimentation ou retour direct du Roi/joueurs.

---

## 9. Rattachement aux référentiels

- **E-009** — ce brief est le prolongement direct de la section « Mon jeu » de
  `Etude_Architecture_Information.md`. Ne rouvre aucune décision de l'étude (§2 grille, §5 doctrine
  no-big-bang) — l'exploite pour cadrer le périmètre (§3) et signale que « Mon jeu » reste une
  section documentaire tant que ce brief n'a pas débouché sur une décision d'exécution.
- **US-038 (E-009) [À L'ÉTUDE]** — nouvelle entrée ajoutée à `ProductBacklog.md` : exploration d'un
  espace joueur regroupé, brief transmis à Claude Design, aucune décision d'exécution engagée.
- **A-038 (nouvelle hypothèse)** — ajoutée à `Assumptions_Log.md` : le regroupement matérialisé de
  « Mon jeu » en un espace dédié réduit la friction ressentie par le Warrior — non vérifié, pas de
  signal utilisateur documenté à ce jour ; couvre aussi la question ouverte remplace/coexiste avec
  War Tracker (§7b.1) et le candidat « Mes stats » web (§7b.2).
- **Pas de nouveau `F-xxx`** — ce brief n'engage aucune fonctionnalité livrable ; le périmètre (§3)
  référence des `F-xxx` existants uniquement.
- **Pas de nouveau `BR-xxx`** — aucune règle d'accès nouvelle ; tous les gates du périmètre (§3)
  réutilisent les patterns déjà en place (login-only, role-match Warrior+).
- **Signalé, non traité ici** : l'écart `FeatureInventory.md` sur le statut F-025/026/027 (§3) — à
  corriger lors d'un prochain passage QA/PM sur ce fichier, hors périmètre de ce brief.
