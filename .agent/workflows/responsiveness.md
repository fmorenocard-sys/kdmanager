---
description: Workflow — Vérification Responsive & Accessibilité (Desktop / Tablette / Mobile)
---

# ✅ Workflow — Vérification Responsive & Accessibilité (Desktop / Tablette / Mobile)

## 🎯 Objectif
Vérifier que l’application est :
- **Responsive** (mise en page + composants) sur **Desktop / Tablette / Mobile**
- **Accessible au minimum** (contraste, focus, clavier, formulaires, sémantique)
- **Cohérente** (typos, espacements, comportements) sur tous les breakpoints

Le workflow produit un **rapport actionnable** + une **checklist réutilisable**.

---

## ✅ Périmètre & Pré-requis
### Inputs
- Liste des écrans/pages `P-xxx`
- Liste des composants clés (header, nav, forms, tables, modals…)
- Parcours critiques (login, import XLSX, consult JSON, etc.)
- Environnement de test (staging recommandé)

### Breakpoints de référence (à adapter si besoin)
- **Mobile** : 360×800 (ou 375×812)
- **Tablette** : 768×1024
- **Desktop** : 1440×900

### Navigateurs minimum
- Chrome (desktop + mobile emulation)
- Safari iOS (si possible) / ou équivalent
- Firefox (optionnel mais utile)

---

## 📦 Livrables attendus
- `Responsive_A11y_Report.md`
- `Issue_Backlog.md` (liste priorisée 🔴🟠🟢)
- `Screens_Checklist.md` (checklist réutilisable)
- `Evidence/` (captures écran + notes par page et breakpoint)

---

## 🧩 Workflow (pas à pas)

### 1) Cartographier & prioriser
1. Lister toutes les pages `P-xxx`
2. Identifier les pages **critiques** (P0) :
   - entrée (landing / login)
   - pages formulaire
   - pages data (tableaux, listes)
   - import XLSX / erreurs / succès
3. Définir un échantillon minimal si l’app est grande :
   - P0 : 100% des pages critiques
   - P1 : pages secondaires
   - P2 : pages rarement utilisées

**Output :**
- Tableau `Pages x Priorité x Parcours`

---

### 2) Préparer un “kit de test” (données + scénarios)
- Comptes de test (si auth)
- Exemples de fichiers XLSX :
  - valide
  - invalide (colonnes manquantes, formats faux)
  - gros fichier (test perf/UI)
- Scénarios :
  - Happy path (succès)
  - Erreurs (validation, 404, 500, timeout si possible)

**Output :**
- `TestData` + `Scenarios`

---

### 3) Audit responsive par page (3 breakpoints)
Pour chaque page `P-xxx`, tester sur Mobile / Tablette / Desktop :

#### 3.1 Layout & overflow
- Pas de scroll horizontal non voulu
- Grille/colonnes se réorganisent correctement
- Sections lisibles sans zoom
- Composants ne se chevauchent pas
- Les modales restent visibles (pas hors écran)
- Les tableaux : stratégie claire (scroll interne, cartes, colonnes masquées, etc.)

#### 3.2 Lisibilité
- Taille de texte lisible (mobile)
- Hiérarchie H1/H2/H3 respectée visuellement
- Espacements cohérents (rythme vertical)

#### 3.3 Interactions
- Menus et navigation utilisables (burger / sidebar)
- Boutons et champs “tap targets” suffisants (mobile)
- États hover/active/disabled cohérents
- Feedback présent (loading, succès, erreur)

**Evidence :**
- Capture avant/après si bug + note (breakpoint, navigateur)

---

### 4) Audit accessibilité minimale (par page critique)
#### 4.1 Contraste (WCAG AA minimal)
- Texte normal : ratio ≥ 4.5:1
- Texte large : ratio ≥ 3:1
- Éviter “gris clair sur blanc” pour infos importantes

#### 4.2 Clavier & focus
- Navigation au clavier possible (Tab / Shift+Tab)
- Focus visible (outline) sur tous les éléments interactifs
- Ordre de tabulation logique
- Aucun piège au focus (modale/menus)

#### 4.3 Formulaires
- Label associé à chaque champ
- Champs requis indiqués (pas uniquement par couleur)
- Messages d’erreur :
  - explicites (quoi / où / comment corriger)
  - proches du champ
- Aide à la saisie (placeholder ≠ label)

#### 4.4 Sémantique & composants
- Boutons = `<button>` (pas div cliquable)
- Titres structurés (H1 unique par page si possible)
- Liens explicites (“Voir détails” → préciser contexte)
- Images : alt si informative (sinon décorative)

#### 4.5 États & annonces (minimum)
- États “loading” visibles
- États “empty” expliquent quoi faire
- Notifications importantes visibles et non seulement par couleur

---

### 5) Tests outillés (rapides + reproductibles)
> But : détecter vite les gros problèmes, sans remplacer le test humain.

- Lighthouse / équivalent :
  - Accessibility score + points bloquants
  - Best practices
- Vérification CSS :
  - `prefers-reduced-motion` si animations importantes (optionnel)
- Console :
  - erreurs JS qui cassent l’interaction (à logger)

**Output :**
- Liste des findings outillés (avec URL + screenshot)

---

### 6) Consolidation & priorisation des issues
Créer un backlog d’issues structuré :

Pour chaque issue :
- ID : `UXA11Y-xxx`
- Page(s) `P-xxx`
- Breakpoint(s) : mobile/tablet/desktop
- Type : Responsive / A11y / UI consistency
- Sévérité : 🔴 Critique / 🟠 Important / 🟢 Améliorable
- Repro steps
- Résultat attendu
- Evidence (capture)

**Règles de sévérité**
- 🔴 Critique : bloque usage, illisible, non accessible (focus absent, contraste insuffisant sur action principale)
- 🟠 Important : gêne forte, contournement possible
- 🟢 Améliorable : polish, cohérence, micro-UX

---

### 7) Plan d’harmonisation (recommandé)
Produire des actions “systémiques” :
- Standardiser composants (boutons, inputs, alertes, modales)
- Définir tokens :
  - typographies (tailles/poids)
  - couleurs (primary/neutral/success/warn/danger)
  - espacements (4px ou 8px)
- Définir règles responsive :
  - comportement des tables
  - navigation (sidebar/burger)
  - grilles (1 col mobile, 2 tablette, 3+ desktop)

**Output :**
- `DesignTokens_Minimal.md`
- `ResponsiveRules.md`

---

## ✅ Checklist rapide (à réutiliser)
### Responsive
- [ ] Aucun scroll horizontal
- [ ] Navigation OK (desktop/sidebar + mobile/burger)
- [ ] CTA principal visible sans effort
- [ ] Tables lisibles (stratégie claire)
- [ ] Modales/menus utilisables sur mobile
- [ ] Tap targets suffisants (mobile)

### Accessibilité minimale
- [ ] Contraste OK sur contenus et actions principales
- [ ] Focus visible partout
- [ ] Clavier utilisable (tab order logique)
- [ ] Labels/form errors corrects
- [ ] Pas uniquement la couleur pour signaler une erreur

---

## 📌 Recommandation d’organisation (pragmatique)
1) Faire d’abord un **Smoke Responsive+A11y** sur les pages P0 (2–3h)
2) Corriger les 🔴
3) Faire une passe complète P1/P2
4) Ensuite seulement lancer le workflow “exécution des cahiers de test”
