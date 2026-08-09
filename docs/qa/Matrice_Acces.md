# Matrice d'accès — qui voit / fait quoi (KD Manager)

> Vue consolidée du contrôle d'accès. **Source de vérité** : les rôles `R-xxx` et
> règles `BR-xxx` du [SSOT](SSOT.md), et l'**application réelle** dans
> [`firestore.rules`](../../firestore.rules) (données) + `RoleContext.jsx` (UI).
> Ce fichier est un récapitulatif dérivé — en cas de doute, les règles Firestore
> et le SSOT font foi. Dernière synchro : 2026-08-09.

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

## Accès par page (gating UI)

Légende : ✅ accès · 👁️ lecture partielle · 🔒 masqué/refusé · ⓘ voir note.

| Page (route) | Guest | Warrior | Officer | King | Base / source |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Dashboard** `/` | ✅ | ✅ | ✅ | ✅ | Lecture publique. Bloc Banque en cascade du module (BR-015). |
| **War Tracker — déclaration** `/war-tracker` | 🔒 | ✅¹ | ✅ | ✅ | Déclarer = utilisateur authentifié (BR-002, R-002). ¹Son propre compte. |
| **War Tracker — War Dashboard** | 🔒 | 🔒 | ✅ | ✅ | Résultats agrégés = Officer+ (R-003). |
| **War Tracker — Objectifs (Goals)** | 🔒 | 👁️² | ✅ | ✅ | ²Le Warrior ne voit **que sa ligne** ; leadership voit tout le monde (code `isLeadership`). Statuts masqués tant que non révélés (BR-019). |
| **War Tracker — Config KvK / Admin** | 🔒 | 🔒 | 🔒 | ✅ | King-only (`KvKConfigForm`, M-2). Inclut l'interrupteur BR-019. |
| **KvK Performance — comptes principaux** `/kvk` | ✅ | ✅ | ✅ | ✅ | Lecture publique (table principale). |
| **KvK Performance — Fillers & Progression** | 🔒 | ✅³ | ✅ | ✅ | ³**Discord-gated** : uniquement comptes Discord-vérifiés (BR-008). |
| **KvK Performance — Progression du Royaume (Timeline)** | 🔒 | 🔒 | ✅ | ✅ | **Role-gated** King/Officer (BR-011, F-022). |
| **Trophies** `/trophies` | ✅ | ✅ | ✅ | ✅ | Lecture publique. Module optionnel par instance (BR-015). |
| **Deadweight** `/deadweight` | 🔒 | 🔒 | ✅ | ✅ | Leadership uniquement (BR-009). Module optionnel (BR-015). |
| **KvK Race / Course** `/kvk-race` | 🔒 | 🔒 | ✅ | ✅ | Leadership uniquement (§9.4) — **renforcé côté données** (voir table suivante). |
| **Bank** `/bank` | 🔒⁴ | 👁️⁴ | ✅ | ✅ | ⁴Lecture = authentifié ; écriture (dépôts) = Officer+. Module optionnel (BR-015). |
| **Profil** `/profile` | 🔒 | ✅ | ✅ | ✅ | Chacun gère **son** profil (liaison gouverneur, comptes multi F-025). |

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
