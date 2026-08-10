# Étude — Calendrier KvK (F-031 / E-008)

> Date : 2026-08-10
> Statut : **Étude courte — D1–D4 tranchées par le Roi (2026-08-10), D5 différée. MVP à construire, PRIORITAIRE (avant E-007).**
> Origine : proposition du Roi — s'inspirer de l'écran « Event Timeline » de ProKingdoms (dates
> d'ouverture des Passes, comptes à rebours, UTC/local) mais avec un angle **planification
> joueur**, pas une simple copie. Donnée de départ : le déroulé KvK 3341 « Song of Troy », tenu
> à la main dans le Google Sheet personnel du Roi.

---

## ⚖️ Décisions déjà rendues

| Décision | Arbitrage |
| :--- | :--- |
| **D1 — Visibilité** | **Warriors+ / tous les membres connectés.** Inverse assumé de F-022 (King/Officer, BR-011) — cohérent avec l'objectif « planification joueur ». |
| **D2 — Saisie King** | **Formulaire ligne-à-ligne, pré-rempli depuis la saison précédente** (pas d'import/parseur en MVP). |
| **D3 — Périmètre MVP** | **Confirmé : frise + countdown + bascule UTC/local, sans pings ni ICS.** |
| **D4 — Priorité** | **Prioritaire — AVANT E-007** (le Roi place le Calendrier devant les multi-comptes ; override assumé de la reco « après E-007 » : la fenêtre KvK 3341 live jusqu'au 19/09 borne la valeur). |

Tout tranché le 2026-08-10 (Roi). Reste **D5** (placement de l'ICS) — différée avec le lot V3, sans objet tant que pings/ICS ne sont pas construits. Voir §8.

---

## 1. Contexte

Aujourd'hui, le déroulé d'un KvK (≈52 jours, séquence de Passes/événements sensiblement stable
d'une « histoire » à l'autre) n'existe **nulle part dans l'app**. Il vit dans un Google Sheet
personnel du Roi, invisible du reste du leadership et des joueurs. Deux conséquences :

- **Risque opérationnel** : la donnée dépend d'une seule personne (bus factor), hors Discord,
  hors app.
- **Trou fonctionnel** : F-014 (Objectifs KvK) affiche un objectif KP sur toute la campagne, sans
  jalon intermédiaire — aucun moyen de savoir *quand* la performance est mesurée (Passes, Altar of
  Darkness, Ziggurat...).

À ne pas confondre avec **F-022 « Timeline du Royaume »** (`Etude_Timeline_Royaume.md`, onglet
« Progression du Royaume ») : F-022 est une frise **rétrospective inter-campagnes** (résultats des
KvK passés, King/Officer). Le sujet ici est **prospectif et intra-campagne** (le déroulé du KvK
en cours) — deux surfaces distinctes, à ne jamais nommer pareil en UI/nav pour éviter la
confusion.

**Exemple concret — KvK 3341 « Song of Troy »** (source : Google Sheet du Roi) :

| Événement | Date UTC | Offset depuis LK Opening |
| :--- | :--- | :--- |
| LK Opening | 31 Jul 0:00 | +0 |
| Trojan Horse | 2 Aug 3:00 | +2j 3h |
| Ancient Ruins (1st) / Olympian Arena (1st) | 4 Aug 15:00 | +4j 15h |
| Emblem of Nike (Artifact) | 5 Aug 3:00 | +5j 3h |
| Pass 4 (Z5) | 7 Aug 15:00 | +7j 15h |
| Patron Adjustment (1st) | 9 Aug 3:00 | +9j 3h |
| Pass 5 (Free Z6) / Olympian Arena (2nd) | 14 Aug 15:00 | +14j 15h |
| Altar of Darkness (1st→4th) | 17/21/24/28 Aug 15:00 | +17j/+21j/+24j/+28j |
| Pass 7 Clash | 31 Aug 15:00 | +31j 15h |
| Pass 8 (KL) | 4 Sep 15:00 | +35j 15h |
| Ziggurat Capture | 6 Sep 15:00 | +37j 15h |
| Pass 9 | 11 Sep 15:00 | +42j 15h |
| Olympian Arena (4th) | 13 Sep 15:00 | +44j 15h |

Constat clé : les offsets **ne suivent aucune formule régulière** (cadence Altar of Darkness
irrégulière : +4j/+3j/+4j ; heures variables 0:00/3:00/15:00 UTC). C'est une **liste curée**, pas
un calcul — ça dimensionne le modèle de donnée (§4) et l'effort (§5).

## 2. Utilisateurs & valeur

| Rôle | Valeur |
| :--- | :--- |
| **Tous les joueurs (Warriors+)** | Savoir *quand* se préparer, sans dépendre d'un ping manuel ou d'un tiers externe (ProKingdoms) — planification personnelle, retour dans l'app pendant les 52 jours, pas seulement à la déclaration et à la clôture. |
| **Roi / Officiers** | Ne plus être le seul point de connaissance du calendrier ; communication de campagne facilitée (pings ciblés au lieu de rappels manuels). |

**Challenge à assumer** : la frise nue (liste de dates) a une valeur différenciante **faible** —
c'est ce que ProKingdoms offre déjà, gratuitement, sans compte. La vraie valeur est dans le
croisement que ProKingdoms ne peut pas faire (§3) et dans la réduction du risque « single point of
failure » du Sheet personnel. Le MVP se justifie comme **infrastructure** pour les extensions
(pings, ICS), pas comme killer feature en soi.

**Métriques d'impact proposées** : consultations de l'onglet pendant la fenêtre d'un événement à
venir (J-3 à J0) ; taux de déclaration War Tracker en amont d'un Pass (corrélation, pas de lien
direct de donnée en MVP).

## 3. Différenciation vs ProKingdoms

| | ProKingdoms « Event Timeline » | Notre Calendrier KvK |
| :--- | :--- | :--- |
| Nature | Écran informatif, anonyme, consultation passive | Connecté à l'identité du joueur (objectifs, déclaration, rôle Discord) |
| Croisement | Aucun | Événement × Objectifs (F-014) × Déclarations (F-025/026/027) × roster Discord |
| Action | Aucune | Ping ciblé (« la fenêtre de Pass 7 ouvre dans 3h **et** tu n'as pas déclaré ») |
| Sortie | Reste sur leur site | Export ICS vers l'agenda perso |

La parité (frise + UTC/local + countdown) ne différencie rien — elle évite juste que le joueur
aille chercher l'info ailleurs. La différenciation réelle, et la valeur vendable, c'est le
croisement événement × donnée qu'on a déjà en base et que ProKingdoms n'a pas (pas d'accès à nos
objectifs ni à nos déclarations). C'est la base du découpage tiering proposé en §6.

**Hors périmètre assumé (pas MVP, pas V2 immédiat)** : lier un événement à une déclaration
*spécifique* à cet événement (« es-tu prêt pour CE Pass ») supposerait un grain de déclaration par
événement qui n'existe pas dans le modèle F-006/F-026 (déclaration = campagne entière, pas par
bataille). Effort **L**, à cadrer séparément si jamais retenu — ne pas le glisser dans le scope de
cette étude.

## 4. Modèle de données

- **Stockage** : config Firestore **par instance et par campagne** (jamais un tableau codé en dur
  dans le JS) — impératif multi-tenant : le pilote KD 3341 tourne potentiellement une « histoire »
  différente de 2997 en simultané. Schéma indicatif : `kvk_config/{campaignId}.timeline: [{key,
  category, offsetDays, hourUtc, minuteUtc, labelKey}]`, calculé en datetime absolu à partir de
  `kvk_config.startDate` (champ déjà existant, SSOT F-013 « KvK Configuration »).
- **Pré-remplissage** : à l'ouverture d'une nouvelle campagne, initialiser depuis la structure
  (offsets) de la campagne précédente, éditable par le Roi — hypothèse de gain de saisie, voir
  A-035. Sans ce pré-remplissage, le Roi retape ~15-20 lignes à chaque saison et la feature
  s'atrophie comme n'importe quel référentiel non maintenu (cf. F-028 sur `commanders.js`).
- **Origine de la donnée** : le Google Sheet personnel du Roi — aucune API officielle Lilith/
  ProKingdoms pour ces dates. Même statut de fiabilité que A-009 (format des scans tiers) : une
  hypothèse à surveiller, pas un fait acquis.

> **Implémentation livrée (2026-08-10) — écart assumé vs le schéma indicatif ci-dessus :**
> la timeline vit dans un **doc dédié `kvk_config/timeline`** (champ `events: [{key, label, at,
> category}]`), **pas** dans `kvk_config/current` — sinon le `setDoc` **sans merge** de
> `KvKConfigForm` l'effacerait à chaque sauvegarde de config. Même collection ⇒ déjà King-writable
> (aucune règle ajoutée). Les datetimes sont stockées en **absolu UTC** (`at` ISO), pas en offsets
> depuis `startDate` : plus simple pour l'affichage et sans ambiguïté d'ancrage (A-015, deux dates
> de début). Le **pré-remplissage saison-à-saison (D2)** est réalisé par un **décalage global « N
> jours »** dans l'éditeur (heures conservées) plutôt qu'un recalcul d'offsets. Bandeau =
> `CampaignTimelineBanner` (onglet Objectifs) ; éditeur = `CampaignTimelineEditor` (section
> « Calendrier » de `/admin`, King-only).
>
> **Amendement 2026-08-10 (retour terrain du Roi) — D2 révisée + lien campagne :** la saisie
> ligne-à-ligne s'est révélée pénible → ajout d'un **coller-importer** (parse le format copié
> depuis Google Sheets : `Libellé <tab> "Fri, 31 Jul 0:00 UTC"`, devine le type, remplace la
> liste). D2 « pas d'import » est donc **rouverte et invalidée par l'usage**. **Lien campagne** :
> le doc `kvk_config/timeline` est **estampillé** `campaignId`/`campaignName` à l'enregistrement ;
> le bandeau ne s'affiche que si l'estampille correspond à la campagne courante (ou est absente =
> rétro-compat), et l'éditeur alerte si le calendrier vient d'une autre campagne. (Archivage du
> calendrier *avec* `kvk_history` à la clôture = amélioration future non faite.)

## 5. Effort par lot

| Lot | Contenu | Effort | Notes |
| :--- | :--- | :--- | :--- |
| **MVP** | Schéma Firestore par campagne + formulaire King (saisie/pré-remplissage) + frise/liste (mobile = liste verticale) + countdown prochain jalon + bascule UTC/local | **M** | Comparable à F-022 côté affichage, mais avec un vrai formulaire d'admin en plus (~15-20 lignes) — pas un livrable en un jour comme F-022. |
| **V2 — Pings Discord** | Ping automatique avant une fenêtre de bataille | **M** | **Pas** le pattern F-013 (déclenchement manuel par un officier) : nécessite un déclenchement **planifié** (Cloud Scheduler côté `functions/`), vraie nouvelle brique d'infra. |
| **V3 — Export ICS** | Fichier `.ics` téléchargeable généré depuis la même donnée | **S** | Un flux « abonnement » auto-actualisé (plutôt qu'un fichier statique) serait S+ — judgment call, voir D5. |
| *Hors scope* | Déclaration par événement (lien War Tracker fin) | **L** | Nouveau grain de donnée, étude à part si retenu. |

## 6. Tiering proposé (modèle de travail convergé produit × commercial)

**Le placement dans un tier reste une décision du Roi — la frontière commerciale est figée
(`FeatureInventory.md` §Frontière). Ce qui suit est un ajout proposé, non actif tant que non
confirmé.**

| Tranche | Contenu | Tier proposé | Justification |
| :--- | :--- | :--- | :--- |
| **« Calendrier »** | Frise + dates UTC/local + countdown (MVP) | **GRATUIT (hook)** | C'est de la *vue* — parité ProKingdoms, déjà gratuite ailleurs ; le rendre payant affaiblirait le hook sans rempart réel. Sert la rétention pendant les 52 jours (levier direct du KvK 3341 en cours, live jusqu'au 19/09). |
| **« Planification »** | Pings Discord pré-fenêtre (V2) + export ICS (V3) | **PREMIUM** | C'est de l'*automation* — cohérent avec la value-ladder déjà actée (F-013 pings est déjà classé Premium ; même logique). Le croisement événement × objectifs × déclarations × roster est ce que ProKingdoms ne peut pas vendre. |

**Prérequis bloquant à rappeler** : le premium « Planification » s'appuie aujourd'hui sur Discord.
Sans le **fallback in-app** (chantier L, `Etude_Commercialisation_SaaS.md` §3 item 8 / A-031), un
royaume sans Discord n'a pas de mécanisme de ping — la valeur premium ne lui est pas servable.
Séquence à respecter : fallback in-app d'abord, extension premium Discord ensuite (même ordre déjà
acté par A-031).

**Go-to-market** : construire la frise gratuite **maintenant** — effort M, forte visibilité
pendant la fenêtre du KvK 3341 (live jusqu'au 19/09/2026), signal utile avant le test de
disposition à payer du pilote (A-032). **Différer** pings/ICS jusqu'à (a) le fallback in-app cadré
et (b) un signal de conversion sur le pilote — le bundle « Planification » sert alors d'item
concret pour la conversation de conversion, pas de pari construit à l'aveugle.

## 7. Zones d'ombre / risques

- **Attrition de saisie** : sans pré-remplissage saison sur saison, la feature devient une corvée
  répétée et se dégrade (A-035).
- **Source sans API officielle** : sheet personnel du Roi, fiabilité non garantie (même statut que
  A-009/A-029).
- **Révélation progressive des dates** (A-036) : si les événements de fin de campagne ne sont pas
  tous connus à J0, le formulaire d'admin doit tolérer une saisie incrémentale, pas une saisie
  unique figée à l'ouverture — à vérifier avec le Roi avant de figer l'UI.
- **Confusion avec F-022** : nom, emplacement, libellés à choisir pour ne jamais mélanger
  « Progression du Royaume » (rétrospectif) et ce Calendrier (prospectif).
- **RBAC inverse assumé** : D1 diverge volontairement du précédent le plus proche (F-022/BR-011) —
  décision actée, à documenter clairement dans SSOT au moment de l'implémentation pour ne pas être
  lue comme un oubli de cohérence.
- **Infra pings nouvelle** : Cloud Scheduler, pas une extension gratuite de F-013 — à chiffrer et
  tester séparément, pas en sous-tâche du MVP.

## 8. Décisions à trancher (Roi)

- **D1 — Visibilité** : ✅ **Tranchée** — Warriors+ / tous les membres connectés. Ne pas rouvrir.
- **D2 — Mécanisme de saisie King** : ✅ **Tranchée** — formulaire ligne-à-ligne, **pré-rempli
  depuis la saison précédente**. Pas d'import/parseur du Sheet en MVP (gain marginal pour ~15-20
  lignes saisies par un seul King).
- **D3 — Périmètre MVP** : ✅ **Confirmé** — frise + countdown + bascule UTC/local, **sans** pings
  ni ICS.
- **D4 — Priorité** : ✅ **Tranchée — AVANT E-007.** Le Roi place le Calendrier devant les
  multi-comptes (override assumé de la reco « après E-007 » : la fenêtre KvK 3341 live jusqu'au
  19/09 borne la valeur du timing). **C'est le prochain chantier d'implémentation.**
- **D5 — Placement de l'ICS** : ⏳ **Différée** — sans objet tant que le lot V3 (ICS) n'est pas
  construit ; reco commerciale = premium groupé avec les pings, à confirmer au moment du lot V3.

## 9. Priorisation (grille §3 des règles PM)

Valeur Moyenne (hook + rétention pendant la fenêtre KvK 3341 live) × Impact Moyen (joueurs, pas
leadership) × Urgence Moyenne (fenêtre d'opportunité 3341 jusqu'au 19/09) / **Effort M** (MVP) →
🟡 **à prioriser sciemment**, pas une opportunité inter-saison à laisser traîner comme F-022 l'a
été avant son arbitrage — la fenêtre KvK 3341 borne la valeur du timing.

## 10. User Stories (→ ProductBacklog E-008)

- **US-035** : En tant que membre du royaume (Warrior+), je veux voir le déroulé chronologique du
  KvK en cours (Passes, artefacts, Altar of Darkness, Ziggurat...) avec les dates UTC/heure locale
  et un compte à rebours vers le prochain jalon, afin de planifier ma préparation sans dépendre
  d'une source externe. *(MVP — F-031, config Firestore par campagne, saisie King pré-remplie
  depuis la saison précédente.)*
- **US-036** : En tant que joueur, je veux recevoir un ping Discord avant l'ouverture d'une
  fenêtre de bataille importante, afin de ne pas la manquer. *(V2 — Cloud Scheduler, tier premium
  proposé §6, bloqué par le fallback in-app pour les royaumes sans Discord.)*
- **US-037** : En tant que joueur, je veux exporter le calendrier KvK vers mon agenda personnel
  (ICS), afin de recevoir mes propres rappels sans ouvrir l'app ni Discord. *(V3 — placement tier à
  trancher, D5.)*
