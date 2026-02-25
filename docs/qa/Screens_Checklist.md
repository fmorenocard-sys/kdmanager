# Screens Checklist - KD Manager Responsive & A11y

Cette checklist sert de base validatrice avant tout futur déploiement des interfaces de l'application. Elle dérive des constats remontés dans le `Issue_Backlog.md`.

## Pages Globales (Dashboard, Bank)
- [ ] La page s'affiche sans "overflow horizontal" sur la fenêtre (Aucun scroll scrollbar sur `body`).
- [ ] Les grilles de `StatCards` se transforment correctement de 4 colonnes (Desk) à 2 ou 1 (Mobile).
- [ ] **Data Tables** : Si l'écran < 768px, la Table est convertie en "Liste de Cartes" (Responsive strategy V2 - Bloquant).
- [ ] Les icônes de tri (sort) sur les tableaux sont visibles en permanence sur mobile, et au hover sur desktop.
- [ ] Un contour rouge (`outline` ou `ring`) bien défini apparait lors de l'utilisation de la touche `Tab`.

## Pages Formulaires (War Tracker, Profile)
- [ ] Les entrées textuelles (`<Input />`) possèdent toutes un `aria-label` ou un `<label>` associé pour les screen readers.
- [ ] Les zones de drop (Uploader XLSX) ont un minimum de cible tactile de 44x44px sur mobile.
- [ ] Les boutons d'action (Save, Link, Force Sync) ont un état "disabled" ou "loading" pour éviter le double clic.
- [ ] L'icône Avatar conserve un aspect rond et visible sans déformation css (`aspect-ratio: 1/1`).
- [ ] Les modales ou overlays bloquent le scroll de la page de fond (`overflow-hidden` sur body).

## Navigation & Layout
- [ ] Sur mobile (< 768px), la Sidebar principale devient logiquement un "Bottom Navigation" ou reste camouflée derrière un Burger Menu (Pas de chevauchement sur les Data).
- [ ] Les sous-onglets horizontaux (ex: War Tracker config) masquent leur overflow et autorisent le `scroll-x` natif pour le swipe.
- [ ] Les contrastes des badges "Status" (Rate, Deadweight info) respectent le ratio AA sur fond Slate-900.
