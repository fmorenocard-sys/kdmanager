# Inventaire priorisé de la dette technique — 2026-08-13

> **Livrable du Chantier 1 (BUG-007)**, produit après le merge de F-032/F-033 dans `main`
> (`e5939c1`). Établi en **exécutant réellement** les outils (ESLint, build) sur le code mergé,
> pas seulement à partir des notes. Complète `docs/project_context.md` §5 (dette connue) et
> le `docs/pm/ProductBacklog.md` (BUG-007).
>
> Contrainte du moment (Roi, 2026-08-13) : **2997 gelé** (période de déclarations) → tout ce qui
> exige un **déploiement backend/rules en prod 97** est **PARQUÉ** jusqu'à la levée du gel. Le
> pilote 41 est déployé et sert de terrain de validation.

Légende effort : **S** < 1 h · **M** quelques heures · **L** ≥ 1 jour. Impact/risque : ⬤ fort · ◑ moyen · ○ faible.

---

## P0 — Sécurité / juridique, BLOQUANT pré-lancement (⚠️ pas front-only)

### D-01 · Lecture PUBLIQUE non authentifiée de données de joueurs tiers
`firestore.rules` : `allow read: if true` sur `static_data/*` (dont **`static_data/deadweight`** = notes libres d'officier + statuts de performance, la donnée la plus sensible) et `kvk_history`. Constaté **en live** sur la vitrine du pilote (322 joueurs nommés lisibles sans login).
- **Correctif** : `allow read: if isAuthenticated()` sur les collections de roster ; **`isKingOrOfficer()`** pour `static_data/deadweight` (BR-009 n'est aujourd'hui appliqué qu'en UI). Attention : `isAuthenticated()` ≠ membre du royaume (tout compte Google → Guest peut lire).
- **Effort** S (rules) · **Impact** ⬤ · **Risque** ◑ (durcir sans casser la lecture légitime des membres/guests attendus → à valider hors gel, sur 41 d'abord).
- **Réf** : `docs/legal/Note_Mitigation_Donnees_Tierces.md`, `docs/qa/Audit_Securite_Firestore_2026-07-22.md` (constat B-1 resté ouvert), A-045/A-047.
- **Statut** : nécessite `firebase deploy --only firestore:rules` sur les 2 bases → **valider sur 41, 97 hors gel**.

### D-02 · Pas de liste d'exclusion pour le droit d'opposition (art. 21)
Un joueur qui obtiendrait un retrait le verrait **réapparaître au scan suivant** (le pipeline d'ingestion ne consulte aucune liste d'exclusion).
- **Correctif** : liste d'exclusion consultée par `digest-data.js` **et** la Cloud Function d'ingestion (garder les deux en phase, cf. D-08).
- **Effort** M · **Impact** ⬤ (conformité) · **Risque** ○ · **Statut** : backend → **parqué (gel 97)** + à cadrer avec l'avocat.

---

## P1 — Fiabilité de la chaîne (lint/CI) — front-only, faisable MAINTENANT

### D-03 · `npm run lint` est ROUGE (et non déterministe)
`eslint .` échoue aujourd'hui : **~650 erreurs**. Décomposition :
- **~17 erreurs + 8 warnings dans `src/`** (voir D-04) — **masquées** jusqu'ici (des runs antérieurs passaient ; aucune n'est dans le code de cette session).
- **~625 erreurs dans `tests/render-smoke/.out.cjs`** : dump généré de 30 k lignes, **git-ignoré mais PAS eslint-ignoré** (`eslint.config.js` ne `globalIgnores` que `dist`), avec des règles `@typescript-eslint/*` non chargées.
- **`vite.config.js` + `tests/render-smoke/entry.jsx`** : `'process' is not defined` (globals node absents pour ces fichiers).
- **Correctif** : `globalIgnores(['dist', 'tests/render-smoke/.out.cjs'])` (ou `**/.out.cjs`) ; bloc de config dédié `globals.node` pour `vite.config.js` + scripts + `tests/**`. Puis traiter D-04.
- **Effort** S · **Impact** ⬤ (CI/qualité) · **Risque** ○.

### D-04 · ~17 erreurs ESLint pré-existantes dans `src/`
Toutes antérieures à cette session (fichiers non touchés par F-032). Regroupées :
- **`react-refresh/only-export-components`** (contexts exportant hooks/constantes) : `AuthContext`, `DataContext`, `LangContext`, `RoleContext` → extraire hooks/constantes dans des fichiers séparés.
- **Imports/vars inutilisés** : `WarDashboard` (`setDoc`, `deleteDoc`), `firebase.js` (`analytics`), `Card` (`hoverEffect`), `StatCard` (`Icon`), `DataContext` (`type`, cf. #2 revue), `BankPage` (`i`).
- **`react-hooks/set-state-in-effect`** : `RoleContext` (l.36), `WarDashboard` (l.114 `fetchData()`) — anti-pattern réel (cascades de rendus), à revoir (pas qu'un silence de lint).
- **`react-hooks/preserve-manual-memoization`** (React Compiler) : `BankPage`, `KingdomTrophiesPage` — mémoïsation manuelle non préservée (deps inférées ≠ déclarées).
- **Effort** M · **Impact** ◑ · **Risque** ○ (mais `set-state-in-effect` à traiter avec soin).

---

## P2 — Cohérence des données (backend) — PARQUÉ (gel 97)

### D-05 · `static_data/kvk` sans `campaignId` (UXA11Y-010, la plus structurante)
3 espaces d'id de campagne déconnectés (`kvk_config/current.id` · `war_availabilities.kvkId` · `slugify(titre)` de `kvk_history`) ; `static_data/kvk` = singleton « dernier scan » sans id. Contourné en front (`useMyKvkGoals` : `scanIsArchived` + `campaignNotStarted` + sélecteur de campagne), mais le fix robuste = **stamper `campaignId` au scan** (`functions/…/syncKvk`).
- **Effort** M · **Impact** ⬤ · **Risque** ◑ (déploiement Functions prod) · **Statut** : **parqué (gel 97)**.

---

## P3 — Qualité / architecture — front-only, faisable

### D-06 · Nav dupliquée (2, voire 3, sources de vérité)
`BottomNav.jsx` et `App.jsx` (Sidebar) portent **deux tableaux `NAV_ITEMS` non partagés**, désynchronisés à chaque refonte (F-032 en a fait un 3e point de contact). → extraire une **source unique** `src/config/nav.js` (items + gating leadership + module).
- **Effort** M · **Impact** ◑ · **Risque** ○.

### D-07 · Fallback docId `war_availabilities` triplé (#2 de la revue)
`${kvkId}_${uid}_${gid}` avec repli `${kvkId}_${uid}` réimplémenté dans `AvailabilityForm`, `MeLandingPage`, `useMyKvkGoals`. → helper `availabilityDocRef(kvkId, uid, gid, primaryGid)`.
- **Effort** S · **Impact** ◑ · **Risque** ○.

### D-08 · Mapping XLSX dupliqué `src/config/data-mapping.js` ⇄ `functions/data-mapping.js`
Deux copies à garder en phase manuellement (dette de longue date, cf. project_context §5). Aggravé par D-02 (liste d'exclusion à câbler des deux côtés).
- **Effort** L · **Impact** ◑ · **Risque** ◑ (touche l'ingestion).

---

## P4 — Performance / confort

### D-09 · Bundle monolithique 2,1 Mo (gzip 632 ko)
Aucun code-split : tout dans `index-*.js`. Avertissement Vite « chunks > 500 kB ». De plus `firebase.js` est à la fois statiquement et dynamiquement importé (le dynamic import ne code-splitte donc pas). → `React.lazy` sur les pages/routes + `manualChunks` (firebase, recharts).
- **Effort** M · **Impact** ◑ (perf mobile) · **Risque** ◑ (à valider).

### D-10 · Leaderboard charge tout `player_data`
Coût de lecture Firestore (project_context §5) — préférer des agrégations/pagination.
- **Effort** L · **Impact** ◑ · **Risque** ◑.

---

## P5 — Documentation

### D-11 · `docs/qa/SSOT.md` §3 (P-002 War Tracker) obsolète
Décrit encore 3 onglets Déclaration/Objectifs/War Dashboard — jamais mis à jour pour F-032 (Lot 5 scission + Lot 6 → hub Pilotage).
- **Effort** S · **Impact** ○ · **Risque** ○.

---

## Séquencement recommandé (hors gel 97)

1. **D-03 + D-04** (fiabiliser le lint, traiter les 17 erreurs src) — front-only, débloque une CI verte. *Point de départ retenu à faire suivre.*
2. **D-06 + D-07 + D-11** (nav unifiée, helper docId, doc SSOT) — nettoyage sûr, sans risque prod.
3. **D-09** (code-split) — gain perf, à valider au navigateur.
4. **Hors gel / avec avocat** : **D-01, D-02, D-05** (rules + liste d'exclusion + stamp campaignId), à valider sur 41 puis 97.

> Rien de tout ceci ne concerne le code de F-032/F-033 lui-même (jugé sain à la revue de branche) :
> c'est de la dette d'infrastructure et pré-existante, exhumée par une exécution réelle des outils.
