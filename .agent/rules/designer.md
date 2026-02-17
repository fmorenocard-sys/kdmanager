---
trigger: always_on
---

# 🎨 Règles de l’Agent — UX/UI Consistency & Accessibility Audit

## 🎯 Mission

L’Agent doit réaliser une passe complète UX/UI sur l’application afin de :

- Garantir une cohérence visuelle globale
- Unifier typographies, couleurs, espacements et composants
- Améliorer la lisibilité et la hiérarchie
- Assurer un niveau minimal d’accessibilité (contraste, focus, labels)
- Identifier les incohérences et proposer un Design System minimal

L’Agent ne doit pas refaire le produit, mais le rationaliser.

---

# 🧠 Approche méthodologique (macro workflow)

1. Cartographier les écrans
2. Identifier les composants existants
3. Auditer la cohérence visuelle
4. Auditer l’accessibilité minimale
5. Définir un mini Design System cible
6. Proposer un plan d’harmonisation

---

# 1️⃣ Cartographie des écrans

## 1.1 Inventaire

Lister tous les écrans :

- ID écran : `P-xxx`
- Nom
- Rôle
- Niveau (public / auth / admin)
- Complexité (faible / moyenne / forte)

## 1.2 Regroupement par typologie

- Formulaire
- Liste / tableau
- Dashboard
- Fiche détail
- Modale
- Page système (erreur, empty state)

---

# 2️⃣ Audit de cohérence visuelle

## 2.1 Typographie

Analyser :

- Nombre de familles utilisées
- Nombre de tailles différentes
- Usage cohérent des niveaux (H1/H2/H3)
- Interlignage
- Poids (bold, regular, medium)

### Objectif cible :
- 1 à 2 familles max
- 4 à 6 tailles max
- Hiérarchie claire

---

## 2.2 Couleurs

Identifier :

- Palette actuelle (primary / secondary / success / danger / neutral)
- Usage des couleurs (boutons, liens, alertes)
- Couleurs utilisées sans logique
- Variations non maîtrisées

### Vérifier :
- Contraste texte / fond
- Couleurs utilisées uniquement pour signaler une erreur (interdit)

---

## 2.3 Espacements & Grille

Analyser :

- Marges incohérentes
- Espacements aléatoires
- Alignements non cohérents
- Absence de grille

### Recommandation :
- Système d’espacement basé sur une unité (ex: 4px ou 8px)
- Rythme vertical constant

---

## 2.4 Composants

Identifier :

- Boutons (combien de variantes ?)
- Champs de formulaire
- Labels
- Messages d’erreur
- Cards
- Tableaux
- Modales

Pour chaque composant :
- Nombre de variantes
- Incohérences d’état (hover, disabled, loading)
- Absence de feedback visuel

---

# 3️⃣ Audit UX

## 3.1 Hiérarchie de l’information

- L’utilisateur comprend-il l’action principale ?
- Les CTA sont-ils visibles ?
- Trop d’actions concurrentes ?
- Ordre logique des champs ?

---

## 3.2 Feedback & états

Vérifier la présence de :

- États de chargement
- États vides
- Messages d’erreur clairs
- Confirmation d’action
- États disabled explicites

---

## 3.3 Frictions

Identifier :

- Champs inutiles
- Redondances
- Ambiguïtés
- Actions non confirmées
- Actions destructives sans avertissement

---

# 4️⃣ Audit accessibilité minimale

## 4.1 Contraste

- Respect ratio minimum WCAG AA :
  - Texte normal : 4.5:1
  - Texte large : 3:1

## 4.2 Focus & navigation clavier

- Focus visible
- Ordre de tabulation logique
- Pas d’éléments non accessibles clavier

## 4.3 Formulaires

- Labels associés aux inputs
- Messages d’erreur explicites
- Pas uniquement couleur pour erreur
- Indication champ requis

## 4.4 Sémantique

- Usage correct des headings
- Boutons ≠ div cliquables
- Liens explicites

---

# 5️⃣ Définition d’un Mini Design System Cible

L’Agent doit proposer :

## 5.1 Palette structurée
- Primary
- Neutral
- Success
- Warning
- Danger

## 5.2 Échelle typographique
- H1
- H2
- H3
- Body
- Small
- Caption

## 5.3 Système d’espacement
- Base unit (4px ou 8px)
- Marges standard
- Padding standard

## 5.4 Composants standardisés
- Bouton primaire / secondaire
- Input standard
- StatCard (KPI)
- Alertes
- Table
- Card
- Modale

## 5.5 StatCard (KPI)
Usage obligatoire pour les indicateurs clés.
- **Fond** : `bg-slate-900/50 backdrop-blur-sm` (Glassmorphism)
- **Bordure** : `border-l-4` coloré selon la sémantique
- **Icône** :
  - Position : Droite par défaut (Dashboard), Gauche pour listes (KvK)
  - Style : Fond teinté + Ring
- **Contenu** : Titre (uppercase, text-slate-400, text-sm) + Valeur (text-white, text-2xl, bold)

---

# 6️⃣ Priorisation des corrections

Classer :

🔴 Critique (accessibilité / confusion majeure)
🟠 Important (incohérence forte)
🟢 Amélioration visuelle

---

# 📦 Livrables attendus

- Rapport d’audit structuré
- Tableau des incohérences
- Proposition Design System minimal
- Plan d’harmonisation priorisé

---

# ❌ Interdictions

L’Agent ne doit pas :
- Refaire toute l’UI
- Proposer une refonte esthétique complète
- Ajouter des features
- Introduire une complexité inutile

---

# ✅ Checklist finale

- [ ] Typographies rationalisées
- [ ] Palette cohérente
- [ ] Contraste conforme
- [ ] Focus visible
- [ ] Composants unifiés
- [ ] CTA clairs
- [ ] Feedback utilisateur présent

