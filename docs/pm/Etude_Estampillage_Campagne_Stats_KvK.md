# Étude — Estampiller `static_data/kvk` d'un identifiant de campagne

> Statut : **cadrage**, à arbitrer par le Roi. Rédigée le 2026-10-31, après BUG-025.
> Voisines : `Etude_Objectifs_KvK.md` (F-014), `Spec_Performance_KvK_Source_Scan.md` (F-036),
> `Assumptions_Log.md` (A-041, A-052, A-055).

---

## 1. Le problème, en une phrase

`static_data/kvk` est un **singleton « dernier scan » qui ne dit pas à quelle campagne
il appartient**. Toute vue qui le lit doit donc *deviner* s'il est encore d'actualité —
et quatre fois en deux mois, une vue a oublié de deviner.

---

## 2. Quatre épisodes, une seule cause

| Date | Où | Ce que le Roi a vu | Remède posé |
|---|---|---|---|
| 2026-09-06 | Cron `syncKvk` (2997) | **70/70 lignes identiques à l'archive SoC 4** : le classeur source n'avait pas été repointé, le cron réécrivait chaque matin la saison passée (BUG-013) | Flag d'instance `PERFORMANCE_SOURCE=scan` |
| avant le 2026-10-14 | `/me` | Objectifs personnels calculés sur la saison précédente | Garde-fou local dans `useMyKvkGoals` (UXA11Y-010) |
| 2026-10-14 | Frise du royaume, pilote 3341 | **421 comptes de « 001_Troy » affichés sous « 002_MightyAssembly »** | Règle extraite dans `lib/campaignFreshness.js`, câblée dans `KvKPerformancePage` |
| 2026-10-31 | Pilotage → Objectifs, pilote 3341 | « des chiffres **et des joueurs** du KvK passé » dans le Top du royaume (BUG-025) | Même règle, câblée dans `KvkGoalsPanel` |

Quatre épisodes, trois remèdes, **aucun à la source**. À chaque fois le correctif a consisté
à apprendre à une vue de plus à se méfier de la donnée.

L'en-tête de `campaignFreshness.js`, écrit le 2026-10-14, promettait pourtant :

> « Deux signaux […] désormais **PARTAGÉS** : une vue ne doit plus pouvoir en bénéficier
> pendant qu'une autre les ignore. »

Seize jours plus tard, une vue l'ignorait. Ce n'est pas un défaut de rigueur : c'est
qu'une promesse de ce genre ne tient pas quand rien dans le code ne l'impose.

---

## 3. État des lieux

### 3.1 Qui écrit `static_data/kvk` — trois chemins

| Chemin | Déclencheur | Écrit |
|---|---|---|
| `functions/index.js:405` (`syncKvk`) | cron 05:00, depuis la feuille Google | `{ list, updatedAt }` |
| `functions/kvkRace/perfExport.js:135` (F-036) | après chaque digest de scan, si `PERFORMANCE_SOURCE=scan` | `{ list, updatedAt, perfSource, lastScanSeq, lastScanCampaign }` |
| `scripts/ingest-soc-scan.mjs` | manuel (`--kvk-base`, `--kvk-progress`) | `{ list, … }` |

### 3.2 Qui le lit — six consommateurs, dont un hors du front

| Lecteur | Usage | Lié à la campagne ? |
|---|---|---|
| `useMyKvkGoals` (`/me`) | objectifs personnels | **oui** — gardé |
| `KvKPerformancePage` | performance + frise | **oui** — gardé |
| `KvkGoalsPanel` (Pilotage) | objectifs + Top du royaume | **oui** — gardé depuis BUG-025 |
| `functions/discordBot.js:170` | réponses du bot, masquage BR-019 | **oui** — **non gardé** |
| `ProfilePage` | index nom + puissance pour la recherche de compte | **non** — périmé = acceptable |
| `DataContext` | source, redistribue | — |

Deux enseignements. D'abord **le bot Discord lit la même donnée et n'a aucun garde-fou** :
il peut répondre les chiffres de la saison passée, et personne ne l'a encore remarqué.
Ensuite **tous les lecteurs ne sont pas logés à la même enseigne** : `ProfilePage` ne cherche
que des noms, un roster périmé y est parfaitement valable. Un garde-fou global appliqué
sans discernement *dégraderait* cette page.

### 3.3 Un estampillage existe déjà — et personne ne le lit

`perfExport.js` écrit depuis F-036 :

```js
perfSource: "scan",
lastScanSeq: latestSeq,
lastScanCampaign: campaignId,
```

`lastScanCampaign` est **écrit et jamais lu** — vérifié sur tout le dépôt. La moitié du
travail est donc déjà faite, par un seul des trois écrivains, et dort.

Attention cependant : ce `campaignId` est celui de la **course** (`kvk_race/{cid}`), qui
n'est pas forcément `kvk_config/current.id`. Le réutiliser tel quel serait une erreur de
référentiel.

### 3.4 L'identité d'une campagne est elle-même floue

`campaignLabel.js` le dit sans détour :

> « Il n'y a **PAS d'ID commun joignable** : `kvk_history` est clé-é sur `slugify(title)`
> (titre final) »

Trois identifiants coexistent : `kvk_config/current.id` (que portent aussi les
déclarations, `d.kvkId`), le slug du titre final dans `kvk_history`, et l'id de course
`kvk_race/{cid}`. `resolveCampaignArchive` les réconcilie par heuristique.

**Choisir ce qu'on estampille fait donc partie du cadrage, et pas seulement de la mise
en œuvre.**

---

## 4. Pourquoi le remède actuel ne suffit pas

`liveStatsAreCurrent` repose sur **deux signaux indirects** :

1. la campagne n'a pas commencé (`startDate` dans le futur) ;
2. les stats live sont, au chiffre près, celles de la dernière archive
   (`initialPower` + `totalDead`).

Le second est une **inférence**, pas une preuve. Deux limites :

- **Faux positif possible.** Une campagne démarrée dont personne n'a encore perdu de
  troupes présente les mêmes `initialPower` et `totalDead` que l'archive. La règle la
  déclarerait périmée alors qu'elle est fraîche. Le cas est étroit — il demande que la
  référence figée n'ait pas encore bougé — mais il existe.
- **Opt-in silencieux.** Rien n'empêche une septième vue de lire `kvkStats` sans appeler
  la règle. C'est très exactement ce qui s'est produit deux fois.

Un identifiant rend le test **exact** (`stats.campaignId === config.id`) et surtout permet
de le poser **une fois**, au point d'entrée.

---

## 5. Proposition

### 5.1 Quel identifiant

**`kvk_config/current.id`**, parce que c'est déjà l'identité que portent les déclarations
(`d.kvkId`) et contre laquelle le front compare (`selectedIsCurrent`). On ne crée pas un
quatrième référentiel.

`lastScanCampaign` (id de course) est **conservé à part**, pour la traçabilité : il répond
à « quel scan a produit ces chiffres », pas à « de quelle campagne parlent-ils ».

### 5.2 Les trois écritures

Chaque écrivain lit `kvk_config/current.id` et l'écrit en `campaignId` :

| Écrivain | Note |
|---|---|
| `syncKvk` | chemin feuille — c'est celui qui a produit BUG-013 |
| `perfExport` (F-036) | ajoute `campaignId` à côté du `lastScanCampaign` existant |
| `ingest-soc-scan.mjs` | manuel ; `--kvk-base` **fige** la référence, c'est le moment naturel |

Si `kvk_config/current.id` est absent, on écrit `campaignId: null` — **jamais** une valeur
inventée. Un document non estampillé doit rester reconnaissable.

### 5.3 La lecture : une règle, un endroit

`DataContext` compare `static_data/kvk.campaignId` à `kvk_config/current.id` et expose :

- `kvkStats` — brut, inchangé, pour les usages **non liés à la campagne** (`ProfilePage`) ;
- `kvkStatsCurrent` — **vide** si l'estampille ne correspond pas ;
- `kvkStatsAreCurrent` — le booléen, pour les vues qui veulent l'expliquer à l'écran.

Les trois vues liées à la campagne basculent sur `kvkStatsCurrent` et perdent leur
garde-fou local. Le bot Discord fait le même test côté serveur.

Ça ne supprime pas totalement la possibilité de se tromper — une vue peut encore choisir
`kvkStats`. Mais le nom du champ dit ce qu'il contient, et le mauvais choix devient
visible en relecture, alors qu'aujourd'hui l'oubli est invisible.

### 5.4 L'existant

Les documents en production n'ont pas de `campaignId`. Deux régimes possibles pendant la
transition :

- **`null` = inconnu → on retombe sur l'heuristique actuelle.** Aucune rupture, la bascule
  se fait d'elle-même à la première écriture suivante. C'est la voie recommandée.
- **`null` = périmé.** Plus strict, mais vide les trois vues sur les quatre instances
  jusqu'au prochain scan. À éviter.

`campaignFreshness.js` est donc **conservé** comme repli, et non supprimé.

---

## 6. Ce que ça ne règle pas

- **La cause de BUG-013** — un classeur source pointé sur la mauvaise saison. L'estampille
  le rendrait *visible* au lieu de silencieux, elle ne l'empêcherait pas.
- **Le singleton lui-même.** `static_data/kvk` ne contiendra toujours qu'une campagne à la
  fois ; l'historique reste dans `kvk_history`. Passer à un document par campagne est un
  autre chantier, plus lourd, et rien ne le réclame aujourd'hui.
- **Le flou des trois identifiants** (§3.4). L'étude choisit lequel utiliser ; elle ne les
  unifie pas.

---

## 7. Risques

| Risque | Portée | Atténuation |
|---|---|---|
| Un écrivain oublié continue d'écrire sans estampille | le document redevient « inconnu » et retombe sur l'heuristique | les trois chemins sont recensés §3.1 ; le repli couvre le cas |
| `ProfilePage` perd des noms si on gate trop large | recherche de compte dégradée | `kvkStats` reste exposé brut — c'est la raison d'être des deux champs |
| Décalage entre l'id de course et l'id de config | estampille fausse | on n'estampille **que** depuis `kvk_config/current.id` (§5.1) |
| Le bot Discord répond des chiffres périmés | déjà le cas aujourd'hui | le chantier le corrige ; à ne pas oublier dans le lot |

---

## 8. Découpage

| Lot | Contenu | Effort |
|---|---|---|
| 1 | Les trois écritures posent `campaignId` | ~1 h |
| 2 | `DataContext` : `kvkStatsCurrent` + `kvkStatsAreCurrent`, repli heuristique si `null` | ~1 h |
| 3 | Les trois vues basculent et perdent leur garde-fou local | ~1 h |
| 4 | Bot Discord | ~1 h |
| 5 | Tests (estampille présente / absente / discordante) + déploiement des 4 instances | ~1–2 h |

**Une demi-journée**, lot 4 compris. Les lots 1 et 2 ont déjà de la valeur seuls : à partir
du lot 2, le test est exact là où il est posé.

---

## 9. Décisions demandées

1. **Fait-on le chantier ?** Le symptôme est corrigé partout aujourd'hui ; c'est un
   investissement contre la cinquième occurrence, pas un correctif urgent.
2. **`campaignId: null` = inconnu (repli) ou périmé (strict) ?** Recommandation : inconnu.
3. **Le bot Discord est-il dans le lot** ou traité à part ? Recommandation : dedans — c'est
   le seul lecteur non gardé, et personne ne surveille ce qu'il répond.
4. **Garde-t-on `campaignFreshness.js` ?** Recommandation : oui, comme repli documenté.

---

## 10. Hypothèse ouverte

**A-060** — `kvk_config/current.id` est supposé présent et stable sur les quatre instances.
A-041 rappelle qu'une heuristique a déjà été abandonnée parce qu'un champ supposé présent
(`static_data/kvk.updatedAt`) s'est révélé **absent ou null en production**. À **vérifier
sur les quatre instances avant le lot 1**, et non à supposer : c'est exactement l'erreur
que A-041 documente.
