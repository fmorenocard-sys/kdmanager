# Brief Claude Design — Refonte navigation & agencement (2026-07-21)

> Destinataire : projet **« KD Manager Design System »** sur claude.ai/design
> Origine : arbitrage Roi post-livraison E-005 Phase 1 — [arborescences actuelle vs cible](https://whimsical.com/PW4Ur8XVhVgidzh49wjiMc)
> Tickets liés : **UXA11Y-007** (KvK Config fourre-tout), **UXA11Y-008** (header 2px), fix nav v2.27

---

## 1. Contexte

L'app a grossi vite (E-004 Historique, F-022 Timeline, E-005 KvK Race) et l'agencement n'a pas suivi :
- **Deux entrées de nav « KvK »** qui se ressemblent (Performance interne vs Race coalition) ;
- **KvK Config** est devenu un empilement de 6 blocs hétérogènes (campagne active, historique, merge, danger zone, clôture, config Race) mêlant anglais legacy et i18n, styles v1 et v2 ;
- **Bottom nav mobile saturée** : 7 entrées pour le leadership, avec scroll horizontal de dépannage ;
- Le Data Management (Roi) occupe le haut du Dashboard de tout le monde.

**La charte v2 ne change pas** (tokens, glass raffiné, gradients). C'est un chantier d'**architecture de l'information**, pas de direction artistique.

## 2. Cible arbitrée (voir Whimsical)

1. **Hub KvK** — une seule entrée nav, trois onglets :
   - *Performance* : domaine **interne 2997** (mains + fillers, campagnes archivées) ;
   - *Progressions* : joueur (multi-KvK) + royaume (timeline F-022, leadership) ;
   - *Course* : domaine **coalition** (duel de camps, 32 royaumes, évolution — leadership §9.4) + bouton « Déposer un scan » (US-015).
   - **BR-010 à matérialiser** : chaque onglet affiche explicitement son domaine DKP (« DKP interne » vs « DKP de course ») — les deux ne doivent jamais sembler comparables.
2. **Page Administration** (Roi, sidebar uniquement) absorbant tout le rouge : Data Management, Campagne KvK (config + clôture + saisie du résultat), Config Course (camps/DKP/exclusions), Maintenance (merge, danger zone). Le War Tracker redevient préparation pure (déclaration + War Dashboard).
3. **Navigation** : sidebar avec zone Admin visuellement séparée ; bottom nav mobile **≤ 6 entrées sans scroll** ; état actif exclusif.

## 3. Maquettes demandées (pages HTML autonomes, à créer dans `v2/pages/`)

| # | Fichier suggéré | Contenu | Largeur |
|---|---|---|---|
| M1 | `Hub KvK.html` | Le hub desktop : bandeau campagne, 3 onglets `v2-tab`, onglet **Course** ouvert (duel hero + royaumes épinglés + bouton dépôt de scan), badge de domaine DKP visible | 1360 |
| M2 | `Hub KvK — Performance.html` *(option B)* | Même hub, onglet Performance ouvert (continuité avec l'existant) | 1360 |
| M3 | `Administration.html` | La page Roi : sous-navigation interne (rail latéral ou accordéons — proposer), sections Data / Campagne / Course / Maintenance, **une seule hiérarchie d'action par bloc** (CTA ambre unique) | 1360 |
| M4 | `Navigation mobile.html` | Bottom nav 6 entrées (Dashboard, War, KvK, Trophées, Banque, Deadweight) + sidebar drawer avec zone Admin séparée ; états actifs | 390 |

## 4. Contraintes (rappel charte & règles)

- **Tokens** : `v2/tokens.css` du projet (surfaces glass, `--grad-primary` ambre 2b pour les CTA, `--grad-accent` indigo pour onglets/nav actifs, pills de rating).
- **Composants existants à réutiliser** : `v2-tab`, `v2-nav-item`, `v2-glass`, StatCards, badges — voir `v2/components/*` et la carte `Système / AccessGate`.
- Breakpoints 360/768/1024 ; tap targets ≥ 44px ; propriétés logiques (RTL arabe) ; textes des maquettes en **français**.
- **Permissions à matérialiser** : badges de niveau (Public / Connecté / Leadership / Roi) sur les zones concernées — reprendre le code couleur du Whimsical (vert/bleu/orange/rouge).
- Données réelles pour la crédibilité : duel SoC 4 East-Anglia 1 075,6 Md vs Wessex 991,3 Md (écart +84,3 Md, variation +35,1 Md), campagnes SoC 1→4, joueurs réels (Lord Guineapig, ᵁᴺPisontije…).

## 5. Références dans le projet Design

- `v2/pages/Dashboard Home B.html` — le précédent : maquette adoptée puis implémentée telle quelle.
- `v2/components/navigation.html` (tabs/sidebar/bottom nav), `v2/foundations/*`.
- `Système / AccessGate` — la carte des accès restreints (à réutiliser pour les vues non-leadership).

## 6. Questions ouvertes (proposer, ne pas trancher)

- **Fusion du niveau « Discord vérifié » (BR-008) dans « Connecté »** : présenter la matrice de permissions dans les deux variantes si cela change les maquettes.
- Position de l'onglet *Progressions* dans le hub (2e ou 3e position ?), et sort du sélecteur de campagnes archivées (dans Performance ou onglet propre ?).
- Sur mobile, l'Admin est-elle accessible depuis le drawer uniquement, ou aussi via une tuile sur le Dashboard du Roi ?

## 7. Suivi d'implémentation — validation staging (2026-07-22)

Branche `feat/refonte-navigation`, déployée sur https://kd-97-manager--staging-7dmagnyt.web.app
(prod `main` non touchée). Constats de la passe de validation Roi et corrections apportées :

| # | Constat | Cause | Correctif | Commit |
|---|---|---|---|---|
| 1 | Page Admin desktop : au scroll, le haut du rail interne disparaît, l'item *Data* devient incliquable | Rail collé à `top-6` (24px) alors que le header global est `h-16 sticky top-0 z-40` → il passe sous le header | Rail calé à 88px (64 + 24) ; `scroll-mt` des 4 sections aligné sur le même offset | `538149b` |
| 2 | Page Admin mobile : l'item *Maintenance* déborde de la bordure du rail | Le `<nav>` est un grid item : `min-width:auto` le laisse s'étendre à la largeur de son contenu au lieu de scroller | `min-w-0 max-w-full` sur le nav | `538149b` |
| 3 | **Administration invisible en mobile** — page atteignable seulement en tapant `/admin` | Le drawer porte bien la zone Admin (M4), mais son unique déclencheur (hamburger) était en `hidden md:flex` : aucun point d'entrée sous 768px | Hamburger visible à tous les breakpoints, groupé avec le logo mobile ; `aria-label` (`nav.menu`, 9 locales) + `aria-expanded` | `247f2ce` |

**Effet de bord assumé du correctif 3** : le drawer mobile expose désormais tout le rail de
navigation (Dashboard, War, KvK…) en doublon de la bottom nav. C'est le comportement décrit
en M4 ; à revoir si l'on préfère un drawer mobile réduit à la seule zone Admin.

**Question ouverte §6 toujours non tranchée** — accès mobile à l'Administration. L'état livré
répond à la variante « drawer uniquement ». Elle fonctionne (2 taps : hamburger → Administration)
mais reste peu découvrable pour le Roi, aucun affordance ne signalant que le drawer contient
autre chose que la bottom nav. La variante « tuile sur le Dashboard du Roi » reste à arbitrer ;
elle n'est pas implémentée.

## 8. Hors périmètre

- Aucune nouvelle fonctionnalité, aucun changement de charte graphique, pas de refonte des pages Dashboard/Banque/Trophées (déjà v2).
- L'implémentation suivra maquette par maquette, comme pour Dashboard Home B — ne pas produire de code React.
