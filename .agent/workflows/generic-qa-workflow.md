---
description:  Workflow générique — Cahier de test auto-généré + auto-mis à jour (doc évolutive)
---

# Workflow générique — Cahier de test auto-généré + auto-mis à jour (doc évolutive)

## 🎯 Objectif
Générer et maintenir un **cahier de test** (test plan + test cases) à partir du **périmètre fonctionnel** documenté, avec **mise à jour automatique** lorsque la rétrodocumentation évolue, tout en conservant :
- traçabilité (requirements → tests)
- stabilité (IDs)
- historisation (versions)
- contrôle humain (validation des changements)

---

## 🧠 Principe d’architecture (recommandé)
Ne pas générer les tests directement depuis la documentation texte.

✅ Mettre en place une **Source de Vérité Structurée (SSOT)** :
- Features : `F-xxx`
- Règles métier : `BR-xxx`
- Écrans/pages : `P-xxx`
- Rôles/permissions : `R-xxx`
- Statuts/états : `S-xxx`
- API (si applicable) : `API-xxx`
- Erreurs attendues : `E-xxx`

Les tests sont générés depuis la SSOT (stable), et la rétrodoc texte est une vue “humaine”.

---

## ✅ Entrées attendues
- Périmètre fonctionnel (features + flows)
- SSOT à jour (ou à initialiser)
- Critères de qualité (niveau attendu : smoke / régression / complet)
- Environnements (dev/staging/prod) + jeux de données si existants

---

## 📦 Sorties attendues
1. **Test Plan** (stratégie + périmètre + niveaux)
2. **Cahier de test** (test suites + test cases)
3. **Matrice de traçabilité** (requirements → tests)
4. **Changelog** (ajouts/modifs/suppressions) à chaque évolution doc/spec
5. **Backlog des zones floues** (hypothèses / questions ouvertes)

---

## 🧩 Workflow (cycle complet)

### 0) Initialisation (une seule fois)
**But :** poser les fondations pour éviter les changements chaotiques.

- Créer SSOT avec IDs stables (`F-001`, `BR-001`…)
- Définir conventions :
  - nomenclature
  - format des données (tables)
  - règle de versionning (ex: `Spec v1.0`, `TestPack v1.0`)
- Définir le “niveau” de test attendu :
  - Smoke : critique uniquement
  - Regression : flux majeurs + erreurs standard
  - Full : variantes + rôles + edge cases

**Output :**
- `SSOT_v1`
- `TestPack_v1 (baseline)`

---

### 1) Ingestion du périmètre fonctionnel
**But :** comprendre ce qui est testable et ce qui est hors scope.

- Lister features (F-xxx)
- Pour chaque feature :
  - goal
  - acteurs / rôles
  - préconditions
  - happy path
  - erreurs/variantes
  - données manipulées
  - dépendances

**Output :**
- `Feature catalog`
- `Flow map`

---

### 2) Génération du Test Plan (niveau “stratégie”)
**Contenu minimal :**
- Objectifs
- Périmètre IN/OUT
- Risques / priorités
- Typologie de tests (UI, API, data, sécurité-lite, accessibilité-lite)
- Environnements & données
- Définition de “Done” de la campagne

**Output :**
- `TestPlan.md`

---

### 3) Génération du Cahier de test (test suites + test cases)
**Règles de génération :**
- 1 Feature `F-xxx` → 1 ou plusieurs Suites `TS-xxx`
- 1 règle métier `BR-xxx` → au moins 1 test associé
- Chaque test case a un ID stable `TC-xxx`
- Un test = une intention claire (pas de “test monolithe”)

**Structure d’un test case (obligatoire) :**
- `TC-ID`
- Titre
- Requirement(s) liés : `F-xxx`, `BR-xxx`, `P-xxx`
- Priorité : P0/P1/P2
- Type : Smoke/Regression/Full
- Préconditions
- Données de test
- Étapes
- Résultat attendu
- Variantes/notes
- Statut d’exécution (vide au départ)

**Output :**
- `TestPack.md` + `TraceabilityMatrix.md`

---

### 4) Mécanisme de rétro-alimentation (doc/spec évolue → tests se mettent à jour)
**But :** maintenir les tests en synchro sans tout casser.

#### 4.1 Détection de changement
À chaque mise à jour de la rétrodoc/spec :
- comparer `SSOT_previous` vs `SSOT_current`
- identifier :
  - Ajouts (`+F`, `+BR`, `+P`)
  - Modifications (`~F`, `~BR`, `~P`)
  - Suppressions (`-F`, `-BR`, `-P`)

**Output :**
- `ChangeSet` (liste structurée des deltas)

#### 4.2 Impact analysis (obligatoire)
Pour chaque delta :
- quels tests `TC-xxx` sont impactés ?
- quel type de changement ?
  - `update_expected`
  - `update_steps`
  - `add_new_tests`
  - `deprecate_tests`
  - `needs_human_review` (si ambigu)

**Output :**
- `ImpactReport`

#### 4.3 Mise à jour contrôlée des tests
Règles :
- Ne jamais renuméroter les IDs existants
- Les suppressions deviennent **Deprecated** (pas supprimées) sauf décision explicite
- Les changements ambigus passent en **Review required**

**Output :**
- `TestPack_vN+1`
- `Changelog_vN+1`

---

### 5) Boucle Qualité (anti-dérive)
À chaque cycle :
- vérifier que chaque `F-xxx` a au moins 1 `TC-xxx`
- vérifier couverture des erreurs standard (401/403/404/409/500/timeout) si applicable
- vérifier cohérence des données (préconditions réalistes)
- signaler les trous (features sans flows, règles non testées, etc.)
- vérifier l'orthographe et la cohérence terminologique (typos, noms techniques)

**Output :**
- `CoverageReport`
- `OpenQuestionsBacklog`

---

## 🔐 Règles critiques (sinon ça ne tient pas)
1) Les tests se basent sur la **SSOT structurée**, pas sur la doc narrative.
2) Toute évolution produit un `ChangeSet` + `ImpactReport` + `Changelog`.
3) Les suppressions = **Deprecated**, pas supprimées par défaut.
4) Les changements “flous” = **Review required** (validation humaine).

---

## 🧩 Préparation du workflow d’exécution (phase suivante)
Le workflow d’exécution viendra ensuite et consommera :
- `TestPack_vN`
- jeux de données / comptes de test
- environnement (staging)
- et produira :
  - résultats (Pass/Fail)
  - anomalies (bugs)
  - demandes de clarification (doc/spec à corriger)

---

## ✅ Cohérence globale
Oui, la séquence est cohérente :
1) Rétrodoc → SSOT
2) SSOT → Cahier de test (auto-maintenu)
3) Exécution des tests (plus tard)

**Recommandation d’amélioration :**
Ajouter dès maintenant une étape “ChangeSet + Impact analysis”, sinon la maintenance devient vite ingérable.
