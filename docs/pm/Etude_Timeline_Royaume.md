# Étude — Timeline du Royaume (F-022 / E-004)

> Date : 2026-07-18
> Statut : **Cadrée & livrée le 2026-07-18** (décisions D1–D4 arbitrées par le Roi le jour même — voir encadré)
> Origine : « On pourrait avoir une timeline du royaume avec les performances KvK. »

---

## ⚖️ Décisions du Roi (2026-07-18)

| Décision | Arbitrage |
| :--- | :--- |
| **D1 — Emplacement** | Onglet « **Progression du Royaume** » dans Performance KvK (variante de l'option A). **Accès réservé King/Officer pour le moment** (BR-011) — invalide A-014. |
| **D2 — Résultat officiel** | **Oui** : victoire ou défaite par campagne, la victoire pouvant être **avec ou sans étoile** → 3 valeurs (`victory_star`, `victory`, `defeat`) + non renseigné. Saisie King-only sur les campagnes archivées (BR-012), rétro-saisie SoC 1–3 dans l'onglet lui-même. |
| **D3 — Périmètre** | **Strictement KvK.** |
| **D4 — Priorité** | **🔴 Priorité immédiate** — livrée le jour même. |

Implémentation : `KingdomProgression.jsx`, règles Firestore amendées (update King limité au champ `outcome`, BR-006/BR-012), 8 clés i18n ×9 langues. Entrées QA : SSOT F-016, BR-011, BR-012 ; Changelog QA v2.20.

---

## 1. Contexte

L'infrastructure nécessaire existe depuis la livraison d'E-004 (2026-07-11) :
- `kvk_history` contient SoC 1 (Tides of War), SoC 2 (Storm of Stratagems), SoC 3 (Heroic Anthem), et SoC 4 (King of All Britain) est en cours ;
- les dates officielles des 4 campagnes sont établies (A-008) ;
- le sélecteur de campagne et la vue progression **joueur** sont Live (US-011/US-012).

Ce qui manque : une lecture **royaume** — la trajectoire collective à travers les campagnes. C'était explicitement hors périmètre du MVP F-015 (« statistiques agrégées royaume par campagne, comparatifs inter-campagnes », §3 de `Etude_Historique_KvK.md`). L'idée du Roi la concrétise sous forme narrative : une frise chronologique.

## 2. Utilisateurs & Valeur

| Rôle | Valeur |
| :--- | :--- |
| **Tous les membres** | Mémoire et fierté collectives : « d'où on vient, où on va » — engagement communautaire. |
| **Roi / Officiers** | Comparatif inter-campagnes en un regard (le royaume progresse-t-il ?) ; support de communication avant/après KvK. |

**Métriques d'impact proposées** : consultations de la timeline ; partages Discord ; corrélation avec le taux de déclaration War Tracker en début de campagne.

## 3. Périmètre proposé (MVP)

Une **frise chronologique** des campagnes KvK, une carte par campagne :
1. **Identité** : titre officiel, dates (A-008), badge « En cours » pour la campagne active.
2. **Agrégats royaume** (calculés depuis `kvk_history` / données courantes) : KP gagnés totaux, morts totaux, nombre de comptes (mains + fillers), % objectif moyen.
3. **Résultat officiel** (optionnel — décision D2) : victoire/défaite, étoile gagnée, camp. Champ inexistant aujourd'hui → saisie manuelle à la clôture (extension légère d'US-010) + rétro-saisie SoC 1–3 par le Roi.
4. **Navigation** : carte cliquable → Performance KvK avec la campagne pré-sélectionnée (réutilise US-011).

### Hors périmètre (V2+)
- Jalons non-KvK (trophées F-003, événements du royaume) sur la même frise.
- Courbes comparatives inter-campagnes (KP par campagne en graphe).
- Résumé de course E-005 : à la clôture, F-020 prévoit déjà d'archiver le résumé de la course — la timeline en serait la surface d'affichage naturelle (synergie, pas une dépendance).

## 4. Options d'emplacement (décision D1)

| Option | Description | Pour | Contre |
| :--- | :--- | :--- | :--- |
| **A — Section sur Performance KvK** | Frise horizontale compacte au-dessus du sélecteur de campagne. | Effort minimal, zéro navigation nouvelle | Noyée dans une page dense ; peu « mémoire du royaume » |
| **B — Page dédiée (P-009, recommandée)** | Page « Histoire du Royaume » accessible de la sidebar ; frise verticale riche. | Porte l'ambition de l'idée ; extensible (trophées, résumés de course E-005) | Une entrée de nav en plus ; effort un peu supérieur |
| **C — Widget Dashboard** | Mini-frise sur le Dashboard. | Visibilité maximale | Le Dashboard vient d'être re-layouté (Home B) ; surcharge |

**Recommandation : B**, avec A en repli si l'on veut livrer vite. C écarté (conflit avec le layout fraîchement livré).

## 5. Données, coûts, risques

- **Lecture** : 3–4 documents `kvk_history` (~25–90 Ko chacun) + données courantes déjà chargées — coût Firestore négligeable, agrégats calculables côté client ; cache sessionStorage possible (même mitigation que F-015).
- **Écriture** : uniquement si D2 retenue (champ `outcome` dans le doc de clôture + rétro-saisie).
- **Risques** : SoC 1/2 ont des champs `null` (formats anciens) → afficher « — » plutôt que 0 ; ne pas laisser croire à une régression du royaume sur des données partielles. Libellé DKP : si un agrégat DKP est affiché un jour, respecter BR-010 (domaine interne explicite).
- **i18n** : toutes les chaînes ×9 langues (src + public) ; responsive : frise verticale en mobile (pas de scroll horizontal).

## 6. Décisions demandées au Roi

- **D1 — Emplacement** : page dédiée « Histoire du Royaume » (recommandé), section Performance KvK, ou widget Dashboard ?
- **D2 — Résultat officiel** : ajouter victoire/défaite/étoile par campagne (saisie manuelle à la clôture + rétro-saisie SoC 1–3) ou agrégats seuls ?
- **D3 — Périmètre de la frise** : strictement KvK (recommandé pour le MVP) ou inclure d'autres jalons (trophées, fondation du royaume) ?
- **D4 — Priorité** : 🟢 Opportunité inter-saisons (recommandé — après US-008 et l'arbitrage E-005) ou remontée 🟠 ?

## 7. Priorisation (grille §3 des règles PM)

Valeur Moyenne-Forte × Impact Moyen × Urgence Faible / **Effort Faible** (les données existent, lecture seule pour l'essentiel) → **🟢 Opportunité** — bon candidat inter-saisons, avant la prochaine campagne (~oct.–nov. 2026), sans percuter E-005 Phase 1.

## 8. User Story (→ ProductBacklog E-004)

- **US-023** : En tant que membre du royaume, je veux une timeline chronologique des campagnes KvK avec les performances agrégées du royaume (et leur résultat), afin de visualiser notre trajectoire collective et entretenir la mémoire du royaume.
