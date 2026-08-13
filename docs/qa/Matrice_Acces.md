# Matrice d'accès — qui voit / fait quoi (KD Manager)

> Vue consolidée du contrôle d'accès. **Source de vérité** : les rôles `R-xxx` et
> règles `BR-xxx` du [SSOT](SSOT.md), et l'**application réelle** dans
> [`firestore.rules`](../../firestore.rules) (données) + `RoleContext.jsx` (UI).
> Ce fichier est un récapitulatif dérivé — en cas de doute, les règles Firestore
> et le SSOT font foi. Dernière synchro : 2026-08-13 (F-032 Lot 6 — hub nav
> « Pilotage », dernier lot structurel du chantier).

## Rôles (SSOT §4, hiérarchie BR-002)

**Guest < Warrior < Officer < King** — chaque niveau hérite des droits du précédent.
Les rôles sont attribués par **synchro Discord** (BR-003 : King > Officer > Warrior ;
sinon Guest). Un utilisateur Google non lié à Discord est traité comme **Guest** pour
les vues « Discord-gated » (BR-008), mais garde son rôle pour les vues « role-gated »
(BR-011).

| Rôle | En bref |
| :--- | :--- |
| **Guest** (R-001) | Non connecté / non lié. Lecture des métriques publiques uniquement. |
| **Warrior** (R-002) | Joueur vérifié. Déclare ses disponibilités, voit ses propres stats/objectifs. |
| **Officer** (R-003) | Déclenche les synchros de données, voit le War Dashboard et l'analytique leadership. |
| **King** (R-004) | Configure les campagnes KvK, clôture/archive, gère la config d'instance. |

## Accès par page (gating UI — post-refonte navigation, vérifié code 2026-08-09)

Légende : ✅ accès · 👁️ lecture partielle · 🔒 masqué/refusé · 🔑 login requis (pas un gate de rôle).
**Architecture** : pas de `<ProtectedRoute>` — chaque page/onglet s'auto-garde (early-return
`AccessGate` ou rendu conditionnel). Les sous-onglets sont dans l'URL (`?tab=`) et un **redirect**
renvoie les deep-links non autorisés vers un onglet public. `isAuthorized` est un **match exact**
de liste (pas de hiérarchie) — mais tous les checks « leadership » passent la paire
`[King, Officer]`, donc le King voit bien tout ce que voit l'Officer.

| Surface | Guest | Warrior | Officer | King | Base / source |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Dashboard** `/` | ✅ | ✅ | ✅ | ✅ | Public. Bloc Banque en cascade du module (BR-015). Renommé « Royaume » (`/royaume`) ; connecté → aiguillé vers **Moi** (`/me`, décision Roi 2026-08-12 #4). |
| **Espace perso « Moi »** `/me` | 🔑 | ✅ | ✅ | ✅ | **Login requis**, pas de rôle : **même espace pour tous** (décision Roi 2026-08-12 #2) — Warrior/Officer/King identiques, aucune couche leadership. Compose Déclaration (F-006), Mon objectif (F-014, Lot 2), Calendrier (F-031), Mes comptes (F-025, Lot 3), Mes stats (Lot 4) — vue scopée sur l'utilisateur courant uniquement, jamais de roster tiers (A-039, pas de gate BR-008). Depuis le **Lot 5 (2026-08-13)**, `/me` est l'**unique** surface de déclaration et d'objectif perso : le War Tracker/Pilotage ne les héberge plus. **F-032, Lots 1-6 livrés — chantier complet.** Section IA cible (E-009 §5.3) : **Mon jeu**. |
| **Pilotage (hub)** `/pilotage` | 🔒 | 🔒 | ✅ | ✅ | **Nouveau depuis F-032 Lot 6 (2026-08-13)**, livré sur `feat/espace-perso-moi` + staging — **entrée de navigation leadership** (`PilotagePage`) en **remplacement du slot nav « Deadweight »**, `AccessGate` niveau page. Fédère en onglets URL-persistants **War Dashboard**, **Objectifs** (Déclarants + Top du royaume, F-029) et **Deadweight** (embarqué via une prop `embedded` qui masque son propre header — même page que `/deadweight`, gate module inchangé). `/war-tracker` **redirige** vers `/pilotage`. C'est la **cible nav** de `Etude_Architecture_Information.md` §7.2 : fin de l'**interim §7.3** (le War Dashboard n'est plus joignable seulement par URL directe, il a retrouvé une entrée dédiée dans la barre). Section IA : **Pilotage**. |
| Pilotage — Objectifs `?tab=goals` | 🔒 | 🔒 | ✅ | ✅ | Identique à l'ancien War Tracker — Objectifs (Lot 5) : **Déclarants** (`KvkGoalsPanel`) + **Top du royaume** (F-029). L'objectif perso du Warrior reste porté exclusivement par `MyGoalCard` dans `/me`. Statuts masqués tant que non révélés (BR-019). |
| Pilotage — War Dashboard `?tab=dashboard` | 🔒 | 🔒 | ✅ | ✅ | Identique à l'ancien War Tracker — War Dashboard (Lot 5). Actions de migration = King seul. |
| Pilotage — Deadweight `?tab=deadweight` | 🔒 | 🔒 | ✅ | ✅ | Rend `DeadweightPage` en mode `embedded` (BR-009 + module gate inchangés) — même donnée/gate que `/deadweight` en autonome, simple point d'entrée supplémentaire. |
| **War Tracker (page)** `/war-tracker` | — | — | — | — | **Route de redirection** depuis F-032 Lot 6 (2026-08-13) : renvoie systématiquement vers `/pilotage` (plus de rendu propre). Gate/comportement historique (Lot 5, leadership-only) conservés jusqu'au Lot 6 — voir Pilotage ci-dessus pour l'état courant. |
| **KvK Hub — Performance** `/kvk?tab=performance` | ✅ | ✅ | ✅ | ✅ | Public. Sous-chip **Fillers** = comptes **Discord-vérifiés** (BR-008). |
| **KvK Hub — Progressions** `?tab=progressions` | 🔒 | ✅ᵈ | ✅ | ✅ | ᵈ**Discord-vérifié OU leadership**. Sous-vue « Progression du Royaume » = leadership seul (BR-011). |
| **KvK Hub — Course** `?tab=course` | 🔒 | 🔒 | ✅ | ✅ | Leadership (redirect si deep-link). **Dépôt de scan** = King **et** Officer (`RaceView`). |
| **Trophies** `/trophies` | ✅ | ✅ | ✅ | ✅ | Public + module (BR-015). |
| **Deadweight** `/deadweight` | 🔒 | 🔒 | ✅ | ✅ | Leadership (`AccessGate`, BR-009) + module. Depuis **F-032 Lot 6 (2026-08-13)**, sort de la nav (remplacée par le slot **Pilotage**) mais reste accessible en **autonome par URL directe** (module-gated, non supprimée) ; embarquée aussi comme onglet de `/pilotage` (rendu `embedded`, même donnée/gate). |
| **Bank** `/bank` | 🔑 | 👁️ | ✅ | ✅ | Page visible (module) ; lecture = authentifié ; **dépôts = Officer+**. |
| **Profil** `/profile` | 🔑 | ✅ | ✅ | ✅ | Login ; chacun gère **son** profil (F-025). |
| **Administration** `/admin` | 🔒 | 🔒 | 🔒 | ✅ | **King only** (`AccessGate`). Détail ci-dessous. |
| *(legacy)* `/kvk-race` | 🔒 | 🔒 | ✅ | ✅ | Route de **compatibilité** (leadership) — la Course vit désormais dans le Hub KvK, **plus d'entrée de nav**. |

### Détail de l'Administration `/admin` — King only

La page entière est King-only ; chaque section l'est aussi (défense en profondeur, garde par composant).

| Section | Rôle | Composant |
| :--- | :---: | :--- |
| Synchro / ingestion de données (xlsx) | **King** | `DataRefreshControl` — ⚠️ **King-only** aujourd'hui (écart SSOT, voir plus bas) |
| Config de campagne KvK (interrupteur BR-019, ratio filler F-027) | King | `KvKConfigForm` (déplacé depuis War Tracker — M3) |
| Clôture / archivage de campagne | King | `CampaignArchiveControl` (update = `outcome` seul, BR-006/BR-012) |
| Config de course (KvK Race) | King | `RaceConfigForm` |
| Maintenance : fusion de campagnes, danger zone (suppression) | King | `MaintenanceTools` |

### Écarts SSOT ↔ code — réconciliés (2026-08-09)

La refonte navigation (M3) avait déplacé des surfaces sans que le SSOT §3 suive. Réglé :
1. **Ingestion King-only** — **intentionnel** (confirmé par le Roi) : c'est le **SSOT** qui est corrigé (R-003/R-004 + **BR-020**), pas le code. **Direction future** : un **rôle admin/opérateur découplé du Roi** pour les ops techniques (ingestion, config), surtout en multi-tenant où c'est le *fondateur* qui opère les instances — même esprit que le « provider/super-admin au-dessus du Roi » de **BR-015** (voir BR-020, A-033).
2. **`KvKConfigForm`** — SSOT §3 corrigé : déplacé sous **P-009 Administration** (`/admin`).
3. **KvK Race** — SSOT §3 corrigé : la Course est un onglet du **Hub KvK** (P-003) ; `/kvk-race` = **P-008 legacy** sans entrée de nav.

## Accès par collection Firestore (application réelle — `firestore.rules`)

C'est le contrôle **effectif** : même si une page est masquée en UI, seule cette couche
empêche réellement une lecture/écriture directe. ⚠️ `static_data/**` et `kvk_history`
restent **lisibles publiquement** au niveau règles (B-1 non traité) : le masquage de
certaines pages (Deadweight, Timeline) est **UI seulement**.

| Collection | Lecture | Écriture | Note |
| :--- | :--- | :--- | :--- |
| `static_data/**` | 🌐 public | ❌ (Admin SDK) | Dashboard, players, kvk, deadweight, avatars. Écrit par Functions/scripts. |
| `kvk_history` | 🌐 public | King (create) ; King `outcome` seul (update) ; jamais delete | Archive immuable (BR-006/BR-012). |
| `roles/{uid}` | Propriétaire **ou** King/Officer | ❌ (Admin SDK) | Écrit par la synchro Discord (B-2). |
| `user_profiles/{uid}` | Propriétaire **ou** King/Officer | Propriétaire (`governorId`+`accounts` seuls) | H-1 : chacun n'écrit que sa liaison (F-025). |
| `kvk_config` | Authentifié | **King** | Campagne active, ratio filler, interrupteur BR-019 (M-2). |
| `war_availabilities` | Authentifié | Soi-même **ou** King/Officer | Le leadership peut écrire pour autrui (fusion, guests — M-1). |
| `bank_deposits` | Authentifié | **King/Officer** | Dépôts de banque. |
| `deadweight_list` | Authentifié | **King/Officer** | |
| `kvk_race/{campaignId}` | **King/Officer** | King (create/update) ; jamais delete | Seule collection **non** lisible publiquement. Agrégats = Admin SDK. |
| *(tout le reste, dont caches OAuth Discord)* | ❌ | ❌ | Refusé par défaut aux clients. |

## Commandes Discord (bot)

| Commande | Accès | Note |
| :--- | :--- | :--- |
| `/mystats`, `/mykvk`, `/mykvkgoals` | Warrior+ (joueur vérifié/lié) | `resolvePlayer` exige un profil lié (F-012). Statut du KvK en cours masqué tant que non révélé (BR-019) ; archivé = note finale visible. |

## Notes transverses

- **Discord-gated ≠ role-gated.** Certaines vues (BR-008 : Fillers/Progression) exigent
  une **identité Discord vérifiée** indépendamment du rôle ; d'autres (BR-009/BR-011)
  dépendent du **rôle** (accessibles à un King authentifié via Google). Ne pas confondre.
- **UI vs règles.** Le masquage d'une page en UI n'est pas une barrière de sécurité si la
  collection sous-jacente est publique (`static_data`, `kvk_history`). La vraie barrière
  est `firestore.rules`. Arbitrage produit B-1 (lecture publique du Dashboard visiteur)
  toujours en attente — voir `Audit_Securite_Firestore_2026-07-22.md`.
- **Activation de modules (BR-015).** Banque / Trophées / Deadweight peuvent être
  **désactivés par instance** (marque blanche) : sur une instance donnée, une page « autorisée
  par le rôle » peut être **absente** si le module n'est pas activé — c'est une couche
  orthogonale au rôle (autorité fournisseur, pas King).
- **Nav interim F-032 résolue (2026-08-12 → 2026-08-13, `feat/espace-perso-moi`).** Le slot
  « Guerre » de `BottomNav`/Sidebar avait été repointé vers `/me` au Lot 1 (2026-08-12), le
  War Dashboard leadership perdant temporairement sa place dans la barre (joignable par
  `/war-tracker` seul, sur le précédent `/admin`). Cette dette de navigabilité est **résolue
  par le Lot 6 (2026-08-13, US-043)** : la nouvelle entrée **Pilotage** (`/pilotage`) réintroduit
  un point d'entrée leadership dédié dans la barre — en **remplacement du slot « Deadweight »**
  (Deadweight n'a pas disparu : elle reste accessible en autonome par URL, module-gated, et est
  aussi embarquée comme onglet de Pilotage). `/war-tracker` redirige désormais vers `/pilotage`.
  C'est la **cible nav §7.2** de `Etude_Architecture_Information.md`/`Spec_Espace_Perso.md` §7 —
  décision Roi 2026-08-12 §12.1. **Dernier lot structurel du chantier F-032** : plus d'interim
  de navigation en cours.
