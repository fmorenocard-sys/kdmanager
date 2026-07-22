# Issue Backlog - UX / A11y / Responsive

Ce backlog regroupe les améliorations identifiées lors de l'audit systématique de l'interface et de l'accessibilité.

## 🔴 Critiques (Bloque l'usage optimal ou viole une règle stricte)

| ID | Page(s) | Breakpoint | Type | Description | Résultat Attendu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UXA11Y-001** | `P-001`, `P-003`, `P-005` | Mobile (<768px) | Responsive | Les tableaux de données (Leaderboard, KvK, Bank) forcent le scroll horizontal. | Casser le tableau en vue "Cartes" individuelles sur mobile pour supprimer le scroll X (Responsive Rule: "Absolute No-No: Horizontal scroll"). |
| **UXA11Y-002** | Toutes | Tous | A11y | Aucune indication visuelle native de focus clavier sur la majorité des boutons et inputs (Tabulation). | Ajouter `:focus-visible` ring sur `<button>`, `<a>`, `<input>` (ex: `focus:ring-2 focus:ring-blue-500`). |

## 🟠 Importants (Gêne forte, mais contournement possible)

| ID | Page(s) | Breakpoint | Type | Description | Résultat Attendu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UXA11Y-003** | `P-001`, `P-004` | Tous | A11y | Les inputs de recherche (`Search`) n'ont pas de `<label>` sémantique ou d'`aria-label`. | Ajouter `aria-label="Search players"` sur le composant `<Input>`. |
| **UXA11Y-004** | `P-003` | Tactile | UX | Les chevrons de tri du tableau ne sont visibles qu'au "hover" de la souris. Inutilisable sur mobile. | Afficher l'icône de tri avec une opacité de 50% par défaut sur les terminaux tactiles, et 100% quand actif. |

## 🟢 Améliorables (Polish UI, cohérence)

| ID | Page(s) | Breakpoint | Type | Description | Résultat Attendu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UXA11Y-005** | `P-003` | Tous | A11y | Le composant custom `StatusFilter` (les pastilles de rate) n'est pas atteignable via le clavier (Tab). | Ajouter `tabIndex={0}` et gérer l'event `onKeyDown` (Enter/Space) pour activer les filtres. |
| **UXA11Y-006 (à requalifier)** | `P-002` | Mobile | UI | Les tabs de navigation (Declaration, Dashboard, Config) overflowent et nécessitent un scroll horizontal ou un swipe. **Depuis la refonte du 2026-07-22, l'onglet Config est parti vers la page Administration : il ne reste que deux onglets, le symptôme a probablement disparu.** | Vérifier à 360px avant de clore. Si le débordement subsiste : menu select "Type de vue" sur très petits écrans. |
| **UXA11Y-008 (🟢)** | Toutes (header) | Mobile 375px | UI | Les boutons de connexion du header (Discord + Google) débordent de ~2px du viewport (masqué par l'`overflow-x-hidden` du body — sans effet visible, mais mesurable et fragile). Préexistant, constaté le 2026-07-21 pendant le fix nav KvK Race. | Réduire padding/gap du bloc header sous 400px ou autoriser le wrap. |
| **UXA11Y-007 (périmètre réduit)** | `P-009` (page Administration) | Tous | UX/UI | **Demande du Roi (2026-07-21)**, portée à l'origine sur l'onglet KvK Config et son empilement de 6 blocs hétérogènes. **Cet onglet n'existe plus** : la refonte du 2026-07-22 a réparti ces blocs en 4 sections de la page Administration, ce qui traite le volet « regroupement par domaine ». **Ce qui subsiste** : l'anglais codé en dur (legacy) dans les formulaires repris tels quels, et la cohabitation de styles v1 et v2 à l'intérieur des blocs. | i18n complet du legacy anglais, harmonisation charte v2 dans `KvKConfigForm`, `CampaignArchiveControl` et `MaintenanceTools`. Ne plus traiter le regroupement : fait. |
