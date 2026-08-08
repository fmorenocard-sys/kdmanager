# Spec — Ingestion de progression unifiée (Course + Objectifs, un seul dépôt)

> Date : 2026-08-08 · Auteur : PM/Tech · Statut : **spec de cadrage (aide à la décision, avant construction)**
> Origine : constat du Roi (2026-08-08) — « c'est pas très logique » d'avoir à lancer
> un script local pour faire progresser les objectifs alors que la course, elle, se
> met à jour d'un simple dépôt in-app, **et que la donnée vient du même fichier**.
> Références : `F-030` / `US-034` (backlog), dette `F-008` (ingestion full in-app),
> `Spec_Format_Interne_Adaptateurs_Scan.md`, incident cross-tenant du 2026-08-07.

> **Objectif de ce document** : cadrer une unification qui soit **compatible et logique
> pour les DEUX modèles d'instance** (2997 Sheet vs royaumes clients Scan), sans fix
> bancal. Ce n'est pas encore un plan d'implémentation engagé — il pose le modèle, les
> garde-fous et l'effort.

---

## 1. État actuel — deux pipelines, deux déclencheurs

| Donnée | Alimentée par | Déclencheur | Instance |
|---|---|---|---|
| **Course** (`kvk_race`, DKP des camps) | scan multi-camps | **dépôt in-app** → `digestRaceScan` | toutes |
| **Objectifs — progression** (`static_data/kvk.totalKpGained`) | Google Sheet (Performance Analysis) | sync quotidienne `scheduledSync` | **2997** |
| idem | scan SoC (KP courant − `initialKp` figé) | **script LOCAL** `ingest-soc-scan --kvk-progress` | **pilote / clients** |

**Lecture.** Sur le pilote, un même KvK exige **deux gestes** (dépôt in-app pour la
course + script local pour les objectifs) alors que le scan SoC contient déjà le KP
courant du royaume. Sur 2997, les objectifs se mettent à jour tout seuls (Sheet), mais
par un chemin **différent** de la course. Incohérent d'une instance à l'autre, et
clunky côté client.

---

## 2. Le vrai enjeu — DEUX modèles de source d'objectifs

C'est le point qui empêche un fix naïf « le dépôt course met à jour les objectifs » :
les deux instances ne tirent pas leurs objectifs de la même source.

- **2997 = modèle Sheet.** Les objectifs (initialPower + totalKpGained) viennent de la
  **Performance Analysis** du Google Sheet ProKingdoms, écrite par la sync quotidienne.
  → Un dépôt de scan course ne doit **surtout pas** écraser cette donnée (sinon on
  casse la source de vérité de 2997).
- **Clients = modèle Scan.** Pas de Sheet ; les objectifs viennent d'un **scan SoC**.
  → Là, le dépôt in-app **peut** légitimement alimenter les objectifs, puisque le
  scan contient le KP courant du royaume.

**Conséquence de cadrage** : l'unification doit être **pilotée par une « source
d'objectifs » déclarée par instance** — `sheet` (2997) ou `scan` (clients) — et ne
s'appliquer qu'au modèle `scan`. C'est ce qui la rend « logique pour tout le monde »
sans imposer le même chemin aux deux.

---

## 3. Proposition — un dépôt in-app, deux mises à jour, selon la source

**Principe** : le dépôt de scan in-app reste le **geste unique**. Après la digestion
de la course, une étape additionnelle met à jour la **progression des objectifs de
NOTRE royaume**, *si et seulement si* l'instance est en modèle `scan`.

```
Dépôt in-app (scan)  →  digestRaceScan
                         ├─ (toujours) agrégats de course : camps, DKP, duel  → kvk_race
                         └─ (si source d'objectifs = 'scan') MAJ progression objectifs
                              pour NOTRE royaume : totalKpGained = max_points − initialKp figé,
                              finalPower = pouvoir courant  → static_data/kvk
                              (initialPower / initialKp : JAMAIS touchés)
```

- **2997 (`sheet`)** : la branche objectifs **ne s'exécute pas** → le Sheet reste la
  source, aucun risque d'écrasement. La course, elle, marche comme aujourd'hui.
- **Clients (`scan`)** : un seul dépôt met à jour course **et** objectifs. Fin du
  script local pour le cas courant.

**Où vit le flag.** Une « source d'objectifs » par instance : `sheet` | `scan`.
Emplacement naturel = config d'instance (cohérent avec `Etude_Activation_Modules.md`
§3b `instance_config`, ou `kvk_config/current`). Défaut = `sheet` pour ne rien changer
à 2997 tant que le flag n'est pas posé.

---

## 4. Garde-fous (non négociables)

1. **Ne jamais toucher la référence figée.** `initialPower` et `initialKp` sont gelés
   au scan de base (fin pré-KvK, anti-abus max_power). La MAJ de progression n'écrit
   que `totalKpGained` et `finalPower`. (Déjà le comportement de `--kvk-progress`.)
2. **Isolation par instance.** Une instance ne met à jour QUE les objectifs de **son**
   royaume (celui de `our_camp` / du numéro de royaume de l'instance). Rappel de
   l'incident 2026-08-07 : la sync 2997 déployée sur le pilote a écrasé ses données —
   le garde-fou `runFullSync` (no-op hors `kd-97-manager`) reste en place ; cette
   spec ne le contourne pas.
3. **`sheet` = intouchable par le scan.** En modèle `sheet`, la branche objectifs du
   digest est un no-op strict.
4. **Nouveaux arrivants.** Un gouverneur présent au scan mais absent de la réf figée
   est ajouté avec sa référence = maintenant (comme `--kvk-progress`).
5. **Dégradation propre.** Champ manquant (ex. pas d'`initialKp`) → pas de calcul faux,
   `totalKpGained` non renseigné plutôt que 0 trompeur (cf. `Spec_Format_Interne`).

---

## 5. La profondeur du scan — limite à assumer

Le scan **course** est multi-camps (large) donc **moins profond par royaume** qu'un
scan dédié : il couvre les tops de notre royaume, pas forcément la queue faible. Donc
la MAJ objectifs via le dépôt course actualise **les joueurs qui comptent**, pas les
300 systématiquement.

Deux options, non exclusives :
- **(a) Accepter** : la course actualise les tops à chaque dépôt ; suffisant pour le
  pilotage. *Recommandé pour le flux courant.*
- **(b) « Rafraîchissement complet » in-app** : permettre le dépôt d'un **scan dédié
  du royaume** (profond) dans l'app, qui exécute la même MAJ objectifs sur les 300.
  Remplace le script local `--kvk-progress` par un geste in-app (dette `F-008`). À
  faire si la couverture partielle de (a) gêne.

---

## 6. Plan d'implémentation (si engagé)

1. **Flag « source d'objectifs »** par instance (`sheet`|`scan`), défaut `sheet`. Poser
   `scan` sur le pilote, `sheet` sur 2997.
2. **Étendre `digestRaceScan`** : après les agrégats de course, si `scan`, calculer et
   écrire `totalKpGained`/`finalPower` de notre royaume (réutiliser la logique
   `--kvk-progress` — mutualiser le code de calcul avec le script pour éviter la
   divergence, cf. leçon de parité `kvkGoals`).
3. **Déprécier `--kvk-progress` pour le cas courant** (garder comme outil de
   rafraîchissement complet / fallback, option 5b).
4. **Tests** : parité script/fonction sur le calcul du gain ; test que `sheet` est
   bien no-op ; test isolation royaume.
5. **Déploiement** : Functions par instance concernée (pilote + toute instance `scan`).
6. Effort global : **M** (fonction + flag + tests ; pas de refonte de données).

---

## 7. Alternatives écartées

| Option | Pourquoi écartée |
|---|---|
| **Le dépôt course écrase toujours les objectifs** (sans flag) | Casse 2997 (écraserait la Performance Analysis du Sheet). |
| **Garder deux gestes** (statu quo) | C'est le problème signalé : illogique et clunky côté client. |
| **Migrer 2997 du Sheet vers le Scan** pour tout unifier sur un modèle | Chantier plus lourd, touche la source de vérité d'un royaume en prod ; hors périmètre. Le flag par instance suffit à rendre les deux modèles compatibles. |

---

## 8. Hypothèses & renvois

- **Hypothèse** : la couverture « tops » du scan course suffit au pilotage des
  objectifs entre deux scans dédiés (option 5a). À valider à l'usage sur le pilote.
- **Hypothèse** : mutualiser le calcul du gain entre le script et la fonction est
  faisable sans dupliquer (comme `src/lib/kvkGoals.js` ↔ `functions/kvkGoals.js` avec
  test de parité).
- **Renvois** : `F-030`/`US-034` (backlog), `F-008` (ingestion full in-app),
  `Spec_Format_Interne_Adaptateurs_Scan.md` (normaliser à l'ingestion, un format
  interne), `Etude_Activation_Modules.md` §3b (config par instance), incident
  cross-tenant 2026-08-07 (garde-fou `runFullSync`), `Etude_Industrialisation_Onboarding.md`
  (config par instance à l'onboarding).
