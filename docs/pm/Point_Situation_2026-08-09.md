# Point de situation — Kingdom Manager (KD 2997)

> Date : 2026-08-09 · Auteur : PM · Statut : synthèse d'étape, pas une étude.
> Sources : `ProductBacklog.md`, `Roadmap.md`, `FeatureInventory.md`,
> `Assumptions_Log.md`, `ChangeLog_Strategique.md`, `docs/qa/SSOT.md`,
> `docs/qa/Matrice_Acces.md`, `Etude_Commercialisation_SaaS.md` §8/§8bis,
> `Plan_Pilote_KvK.md`, code (`index.html`, `functions/kvkRace/snapshot.js`,
> `src/components/war/KvkGoalsPanel.jsx`). Tout écart entre l'attendu et ce
> qui est vérifié en code/docs est signalé explicitement — pas de supposition
> silencieuse.

---

## 1. En un coup d'œil

Le produit est **fonctionnellement mûr sur KD 2997** : War Tracker, objectifs,
historique multi-saisons, timeline, module Course (KvK Race) et activation de
modules sont tous **Live**. Le chantier du moment n'est plus fonctionnel mais
**stratégique** : la frontière gratuit/payant, le packaging et le prix sont
**arbitrés** (25-30 $/royaume, value-ladder, `Etude_Commercialisation_SaaS.md`
§8bis) mais **aucun euro n'a encore été encaissé** — le pilote KD 3341 tourne
gratuitement. Le chemin critique n'est plus produit, il est **go-to-market** :
prouver la disposition à payer avant d'investir dans le multi-tenant. En
parallèle, deux décisions de gouvernance viennent d'être prises (BR-019 statuts
masqués en cours de bataille, BR-020 ingestion King-only + direction d'un rôle
admin découplé) — de la maturation de la couche rôles, pas de nouvelle valeur
utilisateur.

---

## 2. Livré récemment (depuis le dernier point d'étape, ~2026-08-06 → 08-09)

| Item | ID(s) | Statut vérifié |
|---|---|---|
| Frontière gratuit/premium figée + prix 25-30 $/royaume + packaging (B→D hybride) | `Etude_Commercialisation_SaaS.md` §8bis, A-032, `FeatureInventory.md` §Frontière | **Décidé 2026-08-08**, non implémenté (pas de gating produit à ce jour — la frontière est documentaire, prête à câbler) |
| BR-019 — statuts d'objectifs (Dead Weight/Good/Excellent…) masqués pendant la campagne, révélés par interrupteur King `kvk_config.revealGoalStatus` | BR-019, F-014 | **Livré** — vérifié dans `KvkGoalsPanel.jsx` (masquage) et SSOT (portée : panneau Objectifs + `/mykvkgoals` + `/mystats`, jamais l'archive) |
| BR-020 — ingestion xlsx King-only entérinée (pas Officer) ; direction d'un rôle admin/opérateur découplé du Roi | BR-020, A-033 | **Décision documentaire** — le code (`DataRefreshControl` King-only) était déjà ainsi ; c'est le SSOT qui a été corrigé pour matcher le code. Le rôle admin découplé n'est **pas construit** (direction actée, pas cadrée) |
| Refonte navigation M3 — hub KvK 3 onglets (Performance/Progressions/Course), `/admin`, sous-onglets persistants dans l'URL | Roadmap E-005/E-006, `Matrice_Acces.md` | **Live**, matrice d'accès resynchronisée le 2026-08-09 |
| Tri mobile du panneau Objectifs | — | **Vérifié en code** (`sortRows`/`nextSort` dans `KvkGoalsPanel.jsx`), non documenté par un ID F-/US- dédié |
| Morts affichées en troupes (≈ k T5) au lieu de points DKP | — | **Vérifié en code** (2026-08-09, commentaire explicite « demande du Roi 2026-08-09 ») ; UI seulement, le calcul interne (points, `DEAD_POINTS_PER_T5`) est inchangé — BR-018 (jamais mélanger les échelles) reste respectée |
| Pilote KD 3341 — objectifs mis à jour, correctif du dépôt de 1er scan course (v2.37) | `Plan_Pilote_KvK.md`, `Changelog.md` v2.37 | **Live** |
| Correctif marque blanche — aperçus de lien (Open Graph par instance) | index.html + `vite.config.js` (plugin `html-branding-meta`) | **Vérifié en code** : titre/favicon/OG réécrits au build par instance |
| Correctif marque blanche — snapshot Discord en anglais | `functions/kvkRace/snapshot.js` | **Non vérifié en code — probable écart avec l'énoncé.** L'embed du duel (« Gap », « in the lead », « Change since last scan », « favoring… ») est **encore intégralement codé en dur en anglais**, sans paramètre de locale par campagne/instance. Si un correctif a été discuté, il n'est pas dans le code actuel — à clarifier avant de le classer « livré ». |

---

## 3. État par domaine

**War Tracker / Objectifs (F-006, F-014)** — Live, stable. BR-019 vient d'ajouter
une couche de contrôle Roi sur la révélation des statuts. F-029 (« Top du
royaume », sans inscription) livré 2026-08-06, atteinte active après re-scan de
base (référence `max_power`, anti-abus). F-030 (ingestion de progression
unifiée — un seul dépôt de scan pour Course + Objectifs) est **spécifiée**
(`Spec_Ingestion_Progression_Unifiee.md`) mais **non priorisée** : aujourd'hui
2 mécanismes distincts alimentent les objectifs (script local `--kvk-progress`
sur 2997, futur scan in-app sur les instances clientes) — c'est la dette F-008
qui persiste sous une forme nouvelle.

**Hub KvK — Performance / Progressions / Course (E-004, E-005)** — Live,
Phase 1 et Phase 2 de la fusion KvK Race complètes. Course en temps quasi réel
depuis v2.38 (`onSnapshot`), réservée King/Officer (BR-011/BR-014). Timeline du
royaume (F-022) Live, réservée leadership. Dette signalée : le snapshot Discord
du duel reste non localisé (voir §2).

**Discord (E-003)** — SSO + sync rôles + bot (`/mystats`, `/mykvk`,
`/mykvkgoals`) Live. BR-008 (Discord-gated) et BR-019 (statuts masqués)
s'appliquent aussi aux commandes bot. Reste ouvert depuis longtemps :
US-005/US-008/F-013 (pings « missing forms » automatisés) — jamais construit,
derrière la Course dans les priorités depuis l'arbitrage E-005 du 2026-07-21.
**Dépendance stratégique** : le modèle de commercialisation classe F-010/F-012/
F-013 en **premium**, mais §8bis note explicitement que ce premium est
**conditionné au fallback in-app** (chantier L, item 8 de l'étude) — sans lui,
un royaume sans Discord n'est pas servable, gratuit ou payant.

**Multi-comptes E-007 (F-025/026/027)** — **Spécifié, non démarré**
(`Spec_Multicomptes_MainFiller.md`). Arbitré intégralement par le Roi le
2026-07-27 (BR-016/017/018). Classé **gratuit** dans la frontière commerciale —
cohérent avec le principe « le War Tracker est le hook ».

**Activation de modules E-006 (F-023, BR-015)** — Arbitré (deux couches
entitlement/préférence), MVP build-time (`VITE_MODULE_*`) livré via US-024. La
couche runtime (table tier→modules + rôle super-admin au-dessus du Roi) est la
**brique technique qui manque** pour appliquer la frontière commerciale
décidée en §8bis — aujourd'hui rien ne bloque un royaume gratuit d'utiliser une
feature classée premium, la frontière est documentaire, pas appliquée.

**Historique / Timeline (F-015/F-022)** — Live. Classés **premium** dans la
frontière commerciale (historique multi-saisons + timeline) ; le gratuit garde
la saison en cours seulement (plafond décidé en §8bis) — non implémenté non
plus (pas de code de plafonnement d'historique aujourd'hui).

**Marque blanche / pilote KD 3341** — Instance clonée (pas de multi-tenant,
`Plan_Pilote_KvK.md`), gratuite, KvK du 31/07 au 19/09/2026 en cours. Objectifs
mis à jour, dépôt de 1er scan débloqué (v2.37). Le débrief prévu en Phase 5 du
plan pilote (paierait-il ? combien ?) **n'a pas encore eu lieu** — le KvK est
en cours, pas terminé.

---

## 4. Commercialisation

Décision prise et figée le 2026-08-08 (`Etude_Commercialisation_SaaS.md` §8bis,
`ChangeLog_Strategique.md`) :
- **Frontière** : value-ladder, 0 feature restée à débattre (table complète
  dans `FeatureInventory.md`).
- **Plafonds gratuits** : fréquence de scans limitée + historique saison en
  cours seulement (pas encore chiffré — « fixer le quota exact » reste une
  tâche ouverte de la décision elle-même).
- **Packaging** : 2 tiers (Découverte gratuit / Royaume premium) + couche
  service modèle B (setup + « je scanne pour toi ») comme dispositif
  d'amorçage. Trajectoire B → D hybride.
- **Prix** : 25-30 $/mois/royaume, annuel −25 %, unité = le royaume.

**Ce qui n'est pas prouvé — le chemin critique (A-032)** : c'est une
**hypothèse de disposition à payer**, non testée. Aucun royaume n'a payé à ce
jour. Le test le moins cher, déjà identifié dans l'étude, est de proposer au
pilote 3341 de payer 25-30 $ après quelques semaines d'usage (Phase 5 du plan
pilote). **Ne pas engager le multi-tenant avant ce signal** — c'est la
discipline de séquence déjà actée (§8, séquence en 4 étapes), et rien dans les
docs ne montre qu'elle a été rouverte.

---

## 5. Chantiers ouverts / prochaines décisions (priorisé)

1. **Tester la disposition à payer sur le pilote 3341** — chemin critique du
   go-to-market (A-032). Rien à construire, une conversation à avoir en fin de
   KvK (19/09/2026). C'est la décision qui conditionne tout le reste de cette
   section.
2. **Fallback in-app pour Discord-premium** (chantier L, §3 item 8 de l'étude
   SaaS) — sans lui, un royaume sans Discord ne peut pas utiliser le produit du
   tout, et le tier premium Discord (F-010/F-012/F-013) n'est pas vendable à ce
   public. Effort **L**, item structurant du multi-tenant.
3. **Appliquer la frontière commerciale en code** — aujourd'hui la table
   tier→features (§8bis) et les plafonds gratuits (scans, historique) sont
   décidés mais **non câblés** ; le mécanisme d'activation de modules (F-023,
   BR-015) donne la brique technique (couche entitlement), reste à construire
   la couche runtime (table + rôle super-admin) et les plafonds quantitatifs
   (scans/campagne, rétention). Prérequis avant tout premier paiement réel.
4. **Rôle admin/opérateur découplé du Roi** (A-033, BR-020) — direction actée,
   non cadrée. Devient nécessaire dès qu'un opérateur (le fondateur) gère
   plusieurs instances sans être le Roi in-game de chacune ; à traiter avec le
   chantier multi-tenant, pas isolément.
5. **CGU ProKingdoms — fourniture de scans à l'échelle** (A-029) — risque de
   coupure si l'onboarding industrialisé s'appuie sur le fondateur scannant
   pour le compte de plusieurs royaumes tiers ; à vérifier avant tout
   engagement d'industrialisation (voie A de `Etude_Industrialisation_Onboarding.md`).
6. **Multi-tenant technique** (§3 de l'étude SaaS, items 1/2/7/8) — refonte
   d'architecture (namespacing Firestore, Discord par royaume, choix mutualisé
   vs projet-par-client). **Explicitement conditionné** aux points 1 et 2
   ci-dessus — ne pas l'engager avant le signal de paiement.
7. **Clarifier le snapshot Discord non localisé** (§2) — écart entre l'énoncé
   de correctif et le code vérifié ; à trancher : bug réel à corriger, ou
   décision assumée de garder l'embed en anglais pour toutes les instances (à
   documenter explicitement si c'est le cas, pour ne pas rouvrir la question à
   chaque pilote).

---

## 6. Risques & zones d'ombre (nommées)

| Zone d'ombre | Type | Impact | Note |
|---|---|---|---|
| Disposition à payer 25-30 $/royaume | Hypothèse non vérifiée (A-032) | Élevé — c'est la décision qui fait ou défait le modèle SaaS | Test prévu mais pas encore mené, KvK 3341 en cours jusqu'au 19/09 |
| TAM (nombre de royaumes actifs, qui paie) | Non sourcé (§7 étude SaaS) | Moyen | Aucune recherche primaire menée à ce jour |
| Dépendance aux fournisseurs de scans tiers (ProKingdoms) | Assumée (décision Roi §0.2) | Élevé | Zone grise ToS non qualifiée légalement (A-029) ; matière première venant d'un concurrent potentiel |
| Dette d'ingestion (F-008) | Connue de longue date, ré-émergente sous F-030 | Moyen | Deux mécanismes distincts (Sheet 2997 / scan clients) à maintenir en parallèle tant que F-030 n'est pas priorisée |
| B-1 — lecture publique de `static_data`/`kvk_history` | Ouvert depuis l'audit sécurité 2026-07-22 (BUG-002) | À arbitrer | Le masquage de pages premium (Deadweight, Timeline, Historique) reste **UI seulement** si cette lecture publique subsiste — un plafond commercial contournable par un accès direct Firestore tant que ce n'est pas fermé |
| Snapshot Discord en anglais | Écart énoncé/code (§2, §5.7) | Faible en usage actuel, bloquant pour un royaume non-anglophone en marque blanche | À vérifier/trancher avant le prochain pilote non-francophone/non-anglophone |
| Coût du freemium par royaume | Risque nommé dans l'étude (§7, §8 objection 2) | Moyen à élevé | Chaque royaume gratuit consomme infra + support ; les plafonds §8bis (scans, historique) sont la mitigation décidée mais pas encore implémentée (voir §5.3) |
| Frontière commerciale non appliquée en code | Constat de cette synthèse | Moyen | Toute feature « premium » reste utilisable gratuitement aujourd'hui — écart entre décision produit et réalité technique |

---

## 7. Ce qui n'a pas bougé depuis le dernier arbitrage majeur

Pour mémoire, ces éléments restent en l'état documenté précédemment et ne sont
pas concernés par les livraisons récentes : US-026 (deadweight croisé
performance, F-024) et US-032 (couverture méta des marches, F-028) restent des
opportunités non cadrées ; US-034/F-030 (ingestion unifiée) reste spécifiée
mais non priorisée ; le rôle admin découplé (A-033) est une direction, pas une
spec.
