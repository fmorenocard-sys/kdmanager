# Plan d'exécution — Pilote sur un royaume ami (prochain KvK)

> Date : 2026-07-24 · Statut : **cadré, prêt à exécuter** · Lié à `Etude_Commercialisation_SaaS.md` (§8)
> Objectif : faire tourner le Kingdom Manager sur un **deuxième royaume** (petit,
> ami) pendant le prochain KvK, pour valider la faisabilité, faire remonter les
> problèmes de données, et sentir la disposition à payer.

## Paramètres du pilote (confirmés 2026-07-24)

| Paramètre | Valeur |
|---|---|
| **Royaume** | **KD 3341** — ~156 hôtels de ville niveau 25 éligibles au KvK, moins de joueurs que 2997 (petit royaume, idéal pour un premier pilote) |
| **KvK** | **31/07/2026 → 19/09/2026** (~7 semaines) |
| **Discord** | Oui, actif — sert à l'**OAuth** (chemin rôdé, pas de contournement de rôles). Serveur fourni. |
| **Scans** | **Fournis par toi via ProKingdoms.** → le pilote ne teste **que** le chemin ProKingdoms ; l'abstraction multi-fournisseurs (étude §4) reste à tester sur un futur pilote. |

## La seule vraie échéance : le scan de BASE

Pas de chiffrage en jours-homme ici — il n'apporte rien à notre façon de
travailler. Ce qui compte, c'est **une seule échéance dure et externe** : le
**scan de BASE**, pris au point de référence du KvK (démarrage / fin de
préparation, selon la cadence de ton KvK, autour du **31/07**). Tout le module de
course en dépend pour toute la saison, et il n'est **pas rattrapable**.

Tout le reste (instance, données, onboarding) n'est pas une question de durée mais
de **séquence** : chaque étape débloque la suivante. On avance aussi vite qu'on
exécute — l'important est de ne rien laisser bloquer le chemin vers le scan de
BASE.

## Ce que ce pilote prouve — et ce qu'il ne prouve pas

**Il prouve** : que l'app fonctionne avec les données d'un autre royaume ; où sont
les problèmes de données (formats, IDs, cas limites) ; si le produit apporte de la
valeur à un roi qui n'est pas nous.

**Il ne prouve PAS** : la disposition à payer (c'est gratuit) ni la scalabilité
(une instance clonée à la main ne scale pas — c'est assumé). Ces deux questions se
traitent séparément, en parallèle et après (cf. étude §8).

## Approche technique retenue : instance clonée, pas de multi-tenant

Le modèle de données actuel est mono-royaume (tout vit à la racine, cf. étude §3).
Ajouter un royaume à l'instance de 2997 le ferait entrer en collision avec nos
données. Pour un pilote, on **clone une instance dédiée** : nouveau projet Firebase
+ marque blanche (item 6 du §3). **Zéro refonte multi-tenant** — c'est le chemin le
moins cher, et c'est le but d'un pilote scrappy. On assume que cette instance sera
maintenue à la main : acceptable pour **un** royaume, pas au-delà.

---

## Phase 0 — Cadrage ✅ *(fait le 2026-07-24)*

Royaume, dates, Discord, source de scan : tous confirmés (voir « Paramètres »).
Reste à obtenir de leur Roi les **identifiants Discord techniques** (Phase 1) :
- **ID du serveur (guild ID)** de KD 3341 ;
- **IDs des rôles** Roi / Officier / Guerrier de leur serveur.
> *(Se récupèrent en activant le Mode Développeur dans Discord, puis clic droit →
> « Copier l'identifiant » sur le serveur et sur chaque rôle. À me transmettre.)*

## Phase 1 — Instance dédiée *(en premier)*

| Tâche |
|---|
| Créer un nouveau projet Firebase `kd-3341-manager` (+ facturation, APIs) |
| **Créer une application Discord dédiée à KD 3341** — voir la note ci-dessous |
| Déployer le stack : hosting, functions, firestore rules, indexes |
| Marque blanche : nom « KD 3341 », logo, couleurs (item 6) |
| Config Discord : guild ID + IDs de rôles de KD 3341 en secrets |
| Bucket de scans dédié + règles Storage |
| Smoke test : l'app charge à vide, l'OAuth Discord fonctionne bout en bout |

> **Note technique — pourquoi une appli Discord dédiée.** Une application Discord a
> **une seule** URL de redirection OAuth et **une seule** URL d'interactions. Si on
> réutilisait l'appli de 2997, les connexions et commandes de KD 3341 seraient
> renvoyées vers l'instance de 2997 (mauvais royaume). Il faut donc **une appli
> Discord séparée** pour KD 3341 (client ID/secret, bot token, public key), URLs
> pointant vers l'instance 3341. Le **bot / slash commands** (`/mystats`…) sont
> **optionnels** pour le pilote : on peut lancer avec l'OAuth + l'app web seuls, et
> ajouter le bot ensuite — ça allège la mise en route.

## Phase 2 — Données du royaume *(après la Phase 1 — le cœur du pilote)*

| Tâche |
|---|
| Ingestion du roster de KD 3341 (les ~156 CH25 éligibles ; source : ton scan ProKingdoms) |
| Pas d'historique KvK attendu — on part de zéro, c'est normal |
| **Test du dépôt de scan** : scanner KD 3341 via ProKingdoms, vérifier la digestion |
| Config de la campagne KvK (31/07→19/09, objectifs, course si applicable) |
| **Noter chaque problème de données** — c'est le livrable principal du pilote |

## Phase 3 — Pré-KvK & scan de BASE *(avant/au démarrage du KvK)*

| Tâche |
|---|
| Onboarding des dirigeants : connexion Discord, liaison de leur ID de gouverneur |
| **Capturer le scan de BASE au point de référence du KvK** — échéance dure, tout le module de course en dépend |
| Test du **War Tracker** : quelques déclarations de disponibilité |
| Vérifier les **objectifs individuels** (F-014) sur leurs joueurs |
| Démo de 30 min à leur Roi / officiers |

## Phase 4 — Pendant le KvK *(le run)*

| Tâche |
|---|
| Scanner régulièrement (toi, via ProKingdoms) et déposer les scans |
| Suivre dashboard, objectifs, (course si applicable) au fil de l'eau |
| Rester réactif sur les bugs — c'est ta promesse de service |
| Tenir un **journal des incidents** (data, produit, UX) |

## Phase 5 — Débrief *(après le KvK — l'apprentissage)*

| Tâche |
|---|
| Clôturer la campagne, archiver |
| **Débrief avec leur Roi** : ce qui a marché, ce qui manque, **paierait-il ?** |
| Consolider : problèmes data, gaps produit, signaux de valeur / de paiement |
| Mettre à jour `Etude_Commercialisation_SaaS.md` avec les apprentissages réels |
| **Décision** : go/no-go sur l'investissement multi-tenant |

---

## Risques du pilote

| Risque | Gravité | Traitement |
|---|---|---|
| **Chemin critique vers le scan de BASE** | **Haute** | La séquence bloquante : projet Firebase → déploiement → URLs Discord → OAuth testé → scan de BASE au démarrage. Aucune étape ne doit rester en attente. Question de séquence, pas de durée. |
| **Scan de BASE manqué** | **Haute** | Sans scan de BASE au bon moment, le module de course n'a pas de référence pour toute la saison. Échéance non rattrapable → priorité absolue de la Phase 3. |
| **Coût d'un 2ᵉ projet Firebase** | Faible | Petit royaume, trafic minime → plan gratuit/quasi-gratuit. À surveiller mais négligeable pour un pilote. |
| **Fournisseur unique (ProKingdoms)** | Faible (assumé) | Le pilote ne teste pas le multi-fournisseurs (§4 de l'étude) — choix conscient, à couvrir sur un pilote ultérieur. |
| **Ton temps (scans manuels)** | Moyenne | 1 seul royaume en plus → gérable. C'est précisément ce que le pilote mesure : combien ça te coûte en heures. À chiffrer pendant le run. |

## Critères de succès du pilote

1. **Technique** : l'app tourne un KvK entier avec les données de KD 3341, sans blocage majeur.
2. **Données** : on a identifié et documenté les vrais problèmes de format / d'IDs.
3. **Valeur** : leur Roi utilise l'outil de lui-même et dit ce qui lui manque.
4. **Signal business** : à froid, en débrief, il indique s'il paierait — et combien.

## Prochaine action *(cette semaine)*

- **Toi** : récupérer auprès de leur Roi le **guild ID** de KD 3341 et les **IDs
  des rôles** (Roi/Officier/Guerrier), et me les transmettre. C'est le seul
  prérequis externe de la Phase 1.
- **Ensemble** : lancer la Phase 1 (projet Firebase + appli Discord + déploiement)
  dès que possible — l'échéance du scan de BASE au 31/07 ne laisse pas de marge.
