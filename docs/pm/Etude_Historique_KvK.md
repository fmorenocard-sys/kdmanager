# Étude — Historique des KvK (F-015 / E-004)

> Date : 2026-07-11
> Statut : Cadrée (décisions produit arbitrées par le Roi le 2026-07-11)
> Périmètre décidé : **Consultation + Progression joueur** · Migration **SoC 1, 2 et 3** · **Clôture manuelle** par le Roi

---

## 1. Contexte & Problème

Aujourd'hui, chaque nouvelle campagne KvK **écrase** la précédente :
- `static_data/kvk` et `static_data/kvk_filler` (Firestore) sont réécrits à chaque synchro ;
- `public/data/kvk_stats.json` est régénéré à chaque digest ;
- Les données des campagnes passées ne survivent que dans des sauvegardes ad hoc (backup SoC 3 du 2026-07-11) et dans l'historique git.

Conséquences :
- Impossible d'évaluer la **progression long-terme** d'un joueur (demande US-002, ouverte depuis février).
- Les décisions leadership (promotions, deadweight, kicks) se prennent sur une seule campagne.
- La mémoire du royaume (titres, résultats, participants) se perd à chaque cycle.

## 2. Utilisateurs & Valeur

| Rôle | Valeur |
| :--- | :--- |
| **Roi / Officiers** | Évaluation multi-campagnes des joueurs (tendance vs photo instantanée), arbitrages deadweight documentés, historique officiel du royaume. |
| **Warriors** | Consultation de leur propre progression (fierté, engagement, transparence des attentes). |

**Métriques d'impact proposées** : consultations de la vue historique ; nombre de campagnes archivées ; utilisation de la vue progression lors des revues deadweight.

## 3. Périmètre

### MVP (décidé)
1. **Sélecteur de campagne** sur la page Performance KvK : consulter le tableau complet (mains + fillers) de n'importe quelle campagne archivée, avec titre et dates.
2. **Vue progression joueur** : pour un joueur donné (ID gouverneur), évolution à travers les campagnes (KP gagnés, morts, % objectif, note) — concrétise **US-002**.
3. **Clôture manuelle** : action « Clôturer la campagne » (rôle King) dans la config KvK, qui archive les données courantes.
4. **Import initial** : SoC 1, SoC 2, SoC 3 (voir §6).

### Hors périmètre (V2+)
- Commande Discord `/mykvk <campagne>` (extension naturelle de F-012).
- Statistiques agrégées royaume par campagne (totaux, comparatifs inter-campagnes).
- Archivage automatique (à la date de fin ou à la création d'une campagne).

## 4. Modèle de données — options étudiées

### Option A — Collection Firestore `kvk_history` (recommandée)
Un document par campagne : `kvk_history/{kvkId}` contenant `{ title, startDate, endDate, list[], fillerList[], archivedAt, source }`.
- ✅ Cohérent avec l'architecture actuelle (le bot Discord et l'app lisent déjà Firestore).
- ✅ Clôture = simple copie de `static_data/kvk` + `static_data/kvk_filler` vers `kvk_history/{id}` ; les documents courants restent inchangés (zéro impact bot / app existants).
- ✅ Lecture à la demande : 1 read par campagne consultée (~25–90 Ko par doc, sous la limite Firestore de 1 Mo pour ~47–64 comptes ; à surveiller si le royaume dépasse ~300 comptes archivés par campagne).
- ⚠️ Coûts de lecture Firestore si consultation massive → mitigable par cache local (sessionStorage).

### Option B — JSON statiques par campagne
`public/data/kvk/<kvkId>.json` + manifeste, servis par Hosting.
- ✅ Lectures gratuites, versionné dans git.
- ❌ Chaque clôture exige un build + déploiement hosting (friction pour le Roi, dépendance à un développeur).
- ❌ Inaccessible au bot Discord sans fetch HTTP supplémentaire.

**Recommandation : Option A.** L'option B peut servir plus tard de cache statique pour les campagnes anciennes si les coûts de lecture deviennent visibles.

## 5. Workflow de clôture (décidé : manuel, rôle King)

1. Le Roi ouvre la config KvK (`KvKConfigForm`) → bouton **« Clôturer la campagne »** sur la campagne active.
2. Confirmation explicite (récapitulatif : titre, dates, nombre de comptes).
3. Archive : copie des documents courants vers `kvk_history/{kvkId}` (idempotente — une campagne déjà archivée ne peut pas être écrasée sans confirmation renforcée).
4. La campagne est marquée `closed` dans `kvk_config` (registre existant des campagnes du War Tracker — dépendance F-006).

**Garde-fous** : règles Firestore `kvk_history` en écriture réservée au rôle King ; lecture publique (cohérent avec A-003 : les dashboards sont lisibles par tous).

## 6. Migration initiale (décidé : SoC 1 + SoC 2 + SoC 3)

| Campagne | Source | Fiabilité | Effort |
| :--- | :--- | :--- | :--- |
| **SoC 3 : Heroic Anthem (2026)** | Sauvegarde exacte des documents Firestore (64 comptes) faite le 2026-07-11 avant écrasement. | 🟢 Totale — zéro parsing | Faible |
| **SoC 2 : Storm of Stratagems (2025)** | `public/data/SoC_2_StormOfStratagems_2025.xlsx` (repo). | 🟠 Format ancien → mapping à reconstruire et valider | Moyen |
| **SoC 1 : Tides of War (17/9 – 6/11 2025)** | Google Sheet `SoC_1_TidesOfWar_17_9_2025` retrouvé sur Drive (dossier « Tides of War - 17_9-6_11_2025 », propriétaire buqamber@gmail.com, partagé avec le Roi). | 🟠 Format sept. 2025 à inspecter | Moyen |

Méthode : script d'import one-shot (hors app), avec **validation manuelle par le Roi** des totaux de chaque campagne avant écriture définitive dans `kvk_history`.

## 7. Impacts & Dépendances

- **UI** : `KvKPerformancePage` (sélecteur + vue progression), `KvKConfigForm` (bouton clôture). Respect des règles responsiveness (.agent/rules/responsiveness.md) — la vue progression doit avoir une carte mobile.
- **Firestore Rules** : nouvelle collection `kvk_history` (read: all ; write: King).
- **Cloud Functions** : le déploiement functions requis par cette feature embarquera le correctif du mapping fillers (**BUG-003**) — décision du Roi du 2026-07-11 de traiter les deux ensemble.
- **QA (persona Testeur)** : nouvelle entrée SSOT F-015 + règles BR (clôture idempotente, rôle King) + cas de test (consultation, progression, clôture, double-clôture) à produire.
- **i18n** : toutes les nouvelles chaînes dans les 9 langues (src + public locales).

## 8. Risques

| Risque | Impact | Mitigation |
| :--- | :--- | :--- |
| Formats hétérogènes des anciennes campagnes (SoC 1/2) | Données incomplètes ou faussées | Import supervisé + validation manuelle des totaux ; champs manquants explicitement `null` plutôt que 0 |
| Changements de pseudo entre campagnes | Progression joueur cassée | Clé de jointure = **ID gouverneur** (stable), le nom n'est qu'un affichage |
| Document Firestore > 1 Mo (campagnes futures très larges) | Écriture impossible | Surveiller la taille ; basculer en sous-collection par campagne si nécessaire |
| Oubli de clôture avant nouvelle synchro | Perte des données de la campagne finie | Alerte dans l'UI si une nouvelle campagne est configurée alors que la précédente n'est pas archivée |

## 9. Hypothèses & À clarifier

- **Hypothèse** : les fillers (comptes secondaires) font partie de l'archive au même titre que les mains. *(A confirmer — supposé oui.)*
- **À clarifier** : titres et dates officiels exacts de SoC 1 et SoC 2 pour l'affichage dans le sélecteur.
- **À clarifier** : la vue progression doit-elle être accessible aux Warriors pour *tous* les joueurs ou uniquement pour eux-mêmes ? *(Hypothèse : tous, cohérent avec A-003.)*

## 10. Découpage en User Stories (→ ProductBacklog E-004)

- **US-010** : Clôture manuelle d'une campagne par le Roi (archive vers `kvk_history`).
- **US-011** : Sélecteur de campagne sur Performance KvK (consultation des archives).
- **US-012** : Vue progression multi-KvK par joueur (concrétise US-002).
- **US-013** : Import initial des campagnes SoC 1, SoC 2, SoC 3.
- **US-014 (V2)** : `/mykvk <campagne>` sur Discord.

**Priorisation (grille §3 des règles PM)** : Valeur Forte × Impact Fort × Urgence Moyenne / Effort Moyen → **🟠 Important** — cible : prochain cycle (moyen terme), après quoi l'historisation sort du « Long terme » où elle figurait depuis février.
