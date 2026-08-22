# Spec — Transparence & paramétrage de la formule d'objectifs KvK (interne)

> Date : 2026-08-22 · Statut : **cadrage, prêt à découper en deux lots** (affichage
> d'abord, paramétrage ensuite). Domaine **interne** (BR-010, F-014) — ne touche pas
> le DKP de course (E-005/F-018-020), qui est **déjà** paramétrable par campagne
> (`kvk_race/{cid}.dkp`, `RaceConfigForm.jsx`) et sert de précédent à reproduire, pas
> à fusionner. IDs proposés : **F-038**, **US-048/049**, **BR-024**, **A-056/057**
> (aucun renumérotage — derniers ID pris avant cette spec : F-037, US-047, BR-023,
> A-055).

---

## 1. Le besoin, reformulé

Les objectifs KvK internes affichés au joueur (Min KP, KP Goal, Min Dead, statut
Dead Weight/Good/Excellent) sortent de trois polynômes du second degré et de trois
seuils de notation **codés en dur** dans `src/lib/kvkGoals.js` / `kvkScoring.js` (et
leur miroir `functions/kvkGoals.js`). Le Roi demande deux choses, à ne pas traiter
comme une seule tâche :

1. **Transparence** : que la formule/les paramètres réellement appliqués soient
   visibles dans l'app — au joueur comme au leadership — au lieu d'être une boîte
   noire qui sort un chiffre.
2. **Paramétrage** : pouvoir modifier ces coefficients sans redéploiement, sur le
   modèle déjà existant du DKP de course (`RaceConfigForm`, poids `kills_iv/kills_v/
   dead` stockés par campagne).

Les deux ont un coût et une valeur très différents (§3) et ne doivent pas être
livrés comme un seul chantier.

---

## 2. État actuel — vérifié dans le code

**Les trois courbes.** `rawMinKp`, `rawGoalKp`, `rawMinDead` (`src/lib/kvkGoals.js`
lignes 73-75) sont des constantes fermées sur `P` (puissance initiale, en millions).
Validées une fois contre le classeur SoC 4 (A-005, résolue 2026-07-22, 45 joueurs
réels, ratio réel/formule = 1,0000). Trois garde-fous dérivés de ces mêmes courbes
sont eux aussi codés en dur : `DOMAIN_MIN_MPOWER = 16.44` (sommet de la parabole
`minKp`), `VALIDATED_RANGE_MPOWER = {36.7, 119.9}` (plage observée dans l'échantillon
SoC 4), `DEAD_POINTS_PER_T5 = 200` (poids d'une mort T5 dans l'unité « points de
morts » que renvoie `minDead`).

**Le rating.** `RATE_THRESHOLDS` (`kvkScoring.js`) : `needImprovement=0.15`,
`good=0.25`, `excellent=0.60` — seuils relevés sur 47 joueurs notés, avec une zone
floue documentée (56-64 %) entre Good et Excellent.

**Duplication assumée, pas un bug.** `functions/kvkGoals.js` est une copie
caractère pour caractère des mêmes constantes, parce que `functions/` est un paquet
séparé qui ne peut pas importer `src/` (commentaire en tête de fichier). Le
garde-fou est `tests/kvkGoals.parity.test.mjs`, qui balaie les puissances et casse
à la première divergence entre les deux implémentations. **Ce test devra être
étendu** (§5), pas contourné, par toute paramétrisation.

**Un chemin de code mort à ne pas paramétrer par erreur.** `computeKvkGoals(power,
opts)` accepte déjà `reqDkp` et `capMPower`, et exporte `minDkpRatio`/`resolveReqDkp`
— mais **aucun appelant ne les utilise** : `KvkGoalsPanel.jsx` (lignes 190, 283),
`useMyKvkGoals.js` (ligne 143) et `functions/discordBot.js` (ligne 365) appellent
tous `computeKvkGoals(power)` **sans options**. C'est cohérent avec A-005, déjà
résolue : le Roi a confirmé que le « Req DKP » n'existe pas — le *statut DKP* du
royaume **est** le taux d'atteinte du KP Goal, il n'y a pas de quantité
intermédiaire à pourcenter. `minDkp`/`goalDkp`/`minDkpRatio` ne s'affichent
**nulle part** dans l'app aujourd'hui. Les compter dans le périmètre à paramétrer
ajouterait de la surface à une fonctionnalité qui n'existe pas côté produit — voir
recommandation de nettoyage en §7.

**Un précédent d'architecture directement réutilisable.** `functions/discordBot.js`
lit déjà `kvk_config/current` en direct depuis une Cloud Function pour un paramètre
King-only (`loadRevealGoalStatus`, ligne 196, BR-019) :

```js
async function loadRevealGoalStatus(db) {
    const snap = await db.collection("kvk_config").doc("current").get();
    return snap.exists && snap.data()?.revealGoalStatus === true;
}
```

C'est le patron exact dont le paramétrage a besoin (§5) : les deux côtés (web,
Discord) lisent le **même document Firestore**, avec les **mêmes valeurs par
défaut codées en dur** en repli. Pas besoin d'inventer un nouveau mécanisme.

**Un second précédent, côté formulaire.** `RaceConfigForm.jsx` (DKP de course,
F-018) et `KvKConfigForm.jsx` (`fillerDeathRatio`, F-027) montrent déjà le patron
UI : un bloc de champs numériques dans un formulaire King-only, sauvegardé par
`setDoc(..., {merge: true})`, avec des valeurs par défaut visibles au premier
chargement. Le paramétrage d'objectifs internes doit suivre ce même patron, pas en
inventer un nouveau.

---

## 3. Découpage — deux lots, pas un seul chantier

### Lot A — Affichage (S, quick win)

Rendre lisible la formule **déjà appliquée aujourd'hui**, sans toucher au calcul ni
au modèle de données. Purement une lecture des constantes déjà exportées par
`kvkGoals.js`/`kvkScoring.js`, mises en forme et traduites. Zéro risque de parité
(rien de nouveau à synchroniser entre `src/` et `functions/`), zéro migration de
données. C'est le lot à livrer en premier, indépendamment d'une décision sur le
paramétrage.

### Lot B — Paramétrage (M)

Permettre au Roi de modifier les coefficients depuis l'app, stockés par campagne,
lus identiquement par le web et par la commande Discord. Plus lourd parce qu'il
touche : le modèle de données (`kvk_config`), les deux implémentations dupliquées
(front + functions), le test de parité (à étendre, pas à contourner), et un
formulaire d'admin. Recommandation : **ne pas démarrer avant que le Lot A soit
livré et que le Roi ait confirmé qu'un besoin réel de changer les chiffres existe**
(voir Décision 1, §9) — livrer la transparence peut suffire à répondre au besoin
exprimé si le motif réel est « je veux comprendre », pas « je veux changer ».

---

## 4. Modèle de données (Lot B)

Nouveau champ sur le document déjà King-only et déjà campagne-scopé
`kvk_config/current`, à côté de `fillerDeathRatio` (F-027) et `revealGoalStatus`
(BR-019) :

```js
kvk_config/current.goalsFormula = {
    minKp:   { a: 0.0556843, b: -1.83037,  c: 38.477 },
    goalKp:  { a: 0.0642424, b: -0.198182, c: -10.6061 },
    minDead: { a: 0.0216159, b: 3.06256,   c: -123.036, outerMult: 0.5 },
    rateThresholds: { needImprovement: 0.15, good: 0.25, excellent: 0.60 }
}
```

**Absent → défauts codés en dur** (les valeurs actuelles, dupliquées identiquement
dans `src/lib/kvkGoals.js` et `functions/kvkGoals.js`). Aucune migration requise :
toute campagne déjà créée (2997, 3341) continue de calculer exactement comme
aujourd'hui tant que le Roi ne touche pas au formulaire. `firestore.rules` n'a
**rien à changer** : la règle `kvk_config/{document}` (`allow write: if isKing()`)
ne restreint déjà pas les champs.

**Ce qui n'est PAS exposé** (voir justification détaillée en §7) : `DOMAIN_MIN_MPOWER`,
`VALIDATED_RANGE_MPOWER`, `DEAD_POINTS_PER_T5`, et tout le chemin
`reqDkp`/`minDkpRatio`/`minDkp`/`goalDkp`. Le plafond `capMPower` (question ouverte
depuis l'étude d'origine, jamais activé) reste hors périmètre — décision séparée,
non redemandée par le Roi ici.

**Reprise d'une campagne à l'autre.** `KvKConfigForm.handleStartNew` réinitialise
aujourd'hui `fillerDeathRatio` à sa valeur par défaut à chaque nouvelle campagne — un
seul nombre, coût de ressaisie négligeable. `goalsFormula` porte ~10 nombres : le
même réflexe (tout remettre aux valeurs codées en dur) imposerait au Roi de
retaper une page de coefficients à chaque saison même quand rien n'a changé.
**Recommandation** : pré-remplir le formulaire de la nouvelle campagne avec les
valeurs de la **dernière campagne configurée** (pas les défauts codés en dur), sur
le même principe que la décision D2 du calendrier KvK (A-035, pré-remplissage
depuis la saison précédente) — le Roi ne retape que ce qui change.

---

## 5. Tenir la parité `src/lib` ↔ `functions` (le point dur)

Le principe retenu n'invente rien : **les deux côtés lisent le même document
Firestore**, et convertissent son contenu (ou son absence) en un objet `coeffs`
avant d'appeler `computeKvkGoals`. Concrètement :

1. `computeKvkGoals(power, opts)` gagne un nouveau paramètre optionnel
   `opts.coeffs` (et `kvkScoring.rateFromGoalPct` un `thresholds` — **déjà le cas**,
   il suffit de le renseigner). Les valeurs actuelles deviennent les défauts
   explicites (`coeffs ?? DEFAULT_COEFFS`), **dupliqués à l'identique** dans les deux
   fichiers exactement comme les constantes le sont déjà aujourd'hui.
2. Côté web : `KvkGoalsPanel`/`useMyKvkGoals` reçoivent déjà `config` (le doc
   `kvk_config/current`) en prop — passer `config?.goalsFormula` à
   `computeKvkGoals` est un changement d'appel, pas une nouvelle lecture Firestore.
3. Côté Discord : ajouter `loadGoalsFormula(db)` dans `functions/discordBot.js`,
   copie conforme de `loadRevealGoalStatus` (même fichier, ligne 196 — précédent
   direct, §2), et le passer à `computeKvkGoals`.
4. **Pas de logique de fusion/merge à dupliquer** : si `goalsFormula` est absent, on
   utilise le bloc de défauts en entier (pas de fusion champ par champ) — ça évite
   d'avoir à répliquer une logique de merge sur les deux côtés, seule surface où une
   divergence pourrait se glisser.
5. **Étendre** `tests/kvkGoals.parity.test.mjs` (pas le remplacer) : en plus du
   balayage actuel sur les défauts, ajouter un balayage avec 2-3 jeux de coefficients
   arbitraires passés explicitly aux deux implémentations, pour verrouiller que la
   nouvelle voie de code reste, elle aussi, à parité.

**Recalcul des garde-fous dérivés.** Si un jour un jeu de coefficients personnalisé
est enregistré, `DOMAIN_MIN_MPOWER` (le sommet de la parabole `minKp`) ne vaut plus
16,44 pour ces nouveaux coefficients — c'est une valeur **dérivée** (`-b/(2a)`), pas
un nombre indépendant. **C'est précisément pour ça que ce garde-fou n'est pas
exposé à l'édition** (§7) : il doit être **recalculé programmatiquement** depuis les
`coeffs` effectifs à chaque appel, sur les deux côtés, plutôt que rester une
constante figée qui deviendrait fausse dès le premier coefficient personnalisé.
Un oubli ici serait silencieux (pas d'erreur, juste un `outOfDomain`/clamp faux) —
à couvrir explicitement par le test de parité étendu.

---

## 6. Affichage (Lot A, et socle commun aux deux lots)

**Où.** Deux surfaces déjà identifiées par le brief, avec un niveau de détail
différent parce que l'audience diffère :

- **`MyGoalCard.jsx` (`/me`)** — vue joueur, un seul compte à la fois. Le point
  d'ancrage existe déjà : la ligne `goals.footnote` (*« Internal {{kingdom}} scale,
  indexed on power. Unrelated to the coalition race DKP »*) est affichée mais ne
  montre pas la formule. Proposition : transformer ce footnote en élément cliquable
  (icône info) ouvrant un détail qui montre **le calcul de ce joueur en particulier** —
  pas un mur de maths abstrait, mais « Pour ta puissance (74,3 M) : Min KP = 249,1,
  KP Goal = 349,2 » avec la formule littérale en dessous, repliée par défaut. C'est
  la version la plus convaincante de la transparence : le joueur voit *son* calcul,
  pas une formule anonyme.
- **`KvkGoalsPanel.jsx` (onglet Objectifs, `/pilotage`)** — vue leadership, table de
  tous les déclarants. Un seul encart de formule **en tête de page** (pas par ligne,
  la table en a déjà trop) : mêmes informations que ci-dessus mais sans puissance
  d'un joueur particulier — la formule brute + un exemple chiffré à une puissance
  ronde (ex. 60 M).

**Ce qui n'est pas dans le périmètre du Lot A** : la commande Discord
`/mykvkgoals`. Elle est déjà contrainte en espace (embed éphémère) et n'a **aucun
système i18n côté `functions/`** (A-034 — tout y est codé en dur en anglais). Ajouter
la formule là impliquerait soit de l'anglais dur au milieu d'un embed déjà dense,
soit de rouvrir le chantier i18n `functions/` (hors sujet ici). Recommandation :
renvoyer vers l'app (« Voir le détail du calcul dans l'app ») plutôt que dupliquer
l'affichage.

**i18n.** Nouvelles clés (10 langues, `src/locales/*/translation.json`), dans le
namespace `goals.*` existant :
`goals.formula_title`, `goals.formula_cta` (bouton/lien d'ouverture),
`goals.formula_min_kp`/`formula_goal_kp`/`formula_min_dead` (libellé littéral de
chaque courbe, `P` explicité comme « puissance initiale en millions »),
`goals.formula_example` (« Pour {{power}} M de puissance : {{value}} »),
`goals.formula_validated_note` (rappel : validé sur le classeur SoC 4, hors de la
plage observée = extrapolation — réutilise `warn_extrapolated` déjà existant).

---

## 7. Ce qui n'est délibérément PAS paramétré, et pourquoi

| Constante | Pourquoi elle reste figée |
|---|---|
| `DOMAIN_MIN_MPOWER`, `VALIDATED_RANGE_MPOWER` | **Dérivées** des coefficients de courbe, pas des paramètres indépendants — les exposer créerait deux sources de vérité pour une même courbe, avec un risque réel d'incohérence silencieuse (§5). |
| `DEAD_POINTS_PER_T5` (200) | Poids d'une mort T5 dans l'unité de sortie de `minDead` — c'est une **définition d'unité**, pas un curseur de difficulté. Le changer sans changer aussi `rawMinDead` produirait un nombre incohérent avec sa propre formule. |
| `reqDkp` / `minDkpRatio` / `minDkp` / `goalDkp` | **Code mort** — n'a jamais été câblé (§2), et le concept qu'il représentait a été explicitement invalidé par le Roi (A-005 : « Req DKP n'existe pas »). Paramétrer une fonctionnalité inexistante n'a pas de valeur. **Recommandation séparée** (hors périmètre de cette spec, ticket de dette) : supprimer ce chemin mort de `kvkGoals.js`/`kvkGoals.js` (functions) plutôt que le laisser trainer — un futur contributeur pourrait le lire dans `Etude_Objectifs_KvK.md` et croire qu'il est vivant. |
| `capMPower` (plafond de puissance) | Question ouverte depuis l'étude d'origine, jamais activée, jamais redemandée. Reste un champ latent dans `computeKvkGoals`, pas ajouté au formulaire du Lot B — décision séparée si le besoin resurgit (baleines à très forte puissance). |

Ce qui **est** exposé au Lot B, donc : les 3×3 coefficients de courbe (`a`, `b`,
`c` de `minKp`/`goalKp`/`minDead`), le multiplicateur externe de `minDead`
(`outerMult`, aujourd'hui 0,5) et les 3 seuils de notation
(`needImprovement`/`good`/`excellent`). Neuf champs numériques au total pour les
courbes, trois pour le rating — un formulaire dense mais fini, pas une refonte du
moteur.

---

## 8. Zones d'ombre — hypothèses à nommer

**A-056 (nouvelle) — nature de la formule.** Cette spec suppose que les
coefficients codés en dur sont la **grille officielle de notation de la saison
KvK en cours** (reconstituée depuis le classeur SoC 4 fourni par le jeu/l'
organisation de l'événement), et non un réglage propre au royaume au sens où
l'est le DKP de course (BR-010 : « formula agreed with allies », un accord entre
camps). Si cette hypothèse est vraie, la formule change **par saison**, pas par
royaume — ce qui justifie un stockage **par campagne** (`kvk_config/current`,
Décision 1 ci-dessous) plutôt qu'un réglage royaume permanent. Non vérifiée
auprès du Roi : le motif réel de sa demande (« je veux comprendre » vs « je
soupçonne que la formule est mal calée pour nous ») change la réponse.

**A-057 (nouvelle) — stabilité de la forme fonctionnelle.** Cette spec suppose
que toute future saison KvK garde la **même forme** de formule (polynôme du
second degré à 3 coefficients par courbe). Si un futur type d'événement KvK
change de forme (ex. barème linéaire, ou une variable supplémentaire au-delà de
la seule puissance), le paramétrage par coefficients ne suffit plus — il faudrait
alors reprendre le calcul lui-même, pas seulement ses constantes. Non vérifiable
avant d'observer une saison au format différent ; un seul jeu de coefficients
(SoC 4) a été observé à ce jour.

Ces deux hypothèses **conditionnent directement** l'intérêt du Lot B : si A-056
est fausse (le Roi veut en réalité régler un curseur royaume, pas suivre une
grille officielle qui change), le scope par campagne est le mauvais choix. Si
A-057 est fausse, tout le Lot B tel que cadré ici devient obsolète à la première
saison de forme différente — sans qu'on puisse le savoir avant.

---

## 9. Décisions à arbitrer par le Roi

1. **Motif réel de la demande** — transparence seule (Lot A suffit), ou
   changement de valeurs anticipé (Lot B nécessaire) ? Conditionne si on construit
   le Lot B du tout. *Recommandation : livrer le Lot A seul d'abord, redemander
   après usage.*
2. **Portée du paramétrage (si Lot B retenu)** — par campagne (recommandé, §8/A-056)
   ou par royaume (persistant, jamais réinitialisé) ? *Recommandation : par
   campagne, cohérent avec `fillerDeathRatio`/`revealGoalStatus`/DKP de course —
   mais seulement si A-056 est confirmée par le Roi.*
3. **Quels paramètres exposer** — la liste du §7 (9 coefficients + `outerMult` +
   3 seuils), ou un sous-ensemble plus restreint (ex. seulement les seuils de
   rating, jamais les courbes elles-mêmes, moins risqué à mal saisir) ?
   *Recommandation : commencer par les seuils de rating seuls si le Roi hésite —
   trois nombres, risque de faute de saisie bien moindre qu'neuf coefficients de
   polynôme, valeur de paramétrage déjà réelle (zone floue Good/Excellent connue,
   §2).*
4. **Nettoyage du chemin mort `reqDkp`** (§7) — supprimer maintenant (petit ticket
   de dette, aucun risque, aucun appelant) ou laisser pour plus tard ? *Décision
   du Roi/PM, pas bloquante pour le reste.*

---

## 10. Effort et phasage

| Lot | Effort | Risque | Dépendances |
|---|---|---|---|
| **A — Affichage** | **S** | Faible (lecture seule, pas de nouvelle donnée Firestore, pas de risque de parité) | Aucune |
| **B — Paramétrage** | **M** | Moyen — parité front/functions (§5, mitigée par le patron `loadRevealGoalStatus` déjà existant), risque de saisie (coefficients de polynôme peu intuitifs à éditer à la main) | Lot A livré, Décisions 1-3 tranchées |
| Nettoyage `reqDkp` (optionnel) | XS | Aucun (code mort, aucun appelant) | Aucune |

Le Lot B ne doit pas démarrer avant que le Lot A ait tourné au moins une saison —
c'est le test le moins cher pour savoir si un vrai besoin de changer les chiffres
existe, plutôt que de construire un formulaire de neuf coefficients sur une
supposition.

---

## 11. Mises à jour des référentiels

- **`docs/pm/FeatureInventory.md`** — nouvelle ligne **F-038** « Transparence &
  paramétrage de la formule d'objectifs KvK », statut *Spec, non démarré*,
  dépendances F-014, F-018 (précédent RaceConfigForm), F-027 (précédent
  fillerDeathRatio).
- **`docs/pm/ProductBacklog.md`** — **US-048** (Lot A, affichage) et **US-049**
  (Lot B, paramétrage), épic-less comme US-026/031/032 (pas d'épic dédié, extension
  ponctuelle de F-014).
- **`docs/qa/SSOT.md`** — nouvelle règle **BR-024** (« Internal goal formula —
  configurable per campaign, coded defaults as fallback »), section 2 (Business
  Rules), en anglais pour rester cohérent avec les BR-001→023 existantes (fichier
  historiquement rédigé en anglais — écart déjà présent avec la convention
  générale « docs en français », non introduit par cette spec, signalé ici plutôt
  que corrigé silencieusement).
- **`docs/pm/Assumptions_Log.md`** — **A-056** (nature de la formule, saisonnière
  vs royaume) et **A-057** (stabilité de la forme fonctionnelle), toutes deux
  ouvertes.

**Note sur une incohérence pré-existante, non introduite ici** : `docs/qa/SSOT.md`
utilise sa propre numérotation `F-xxx` (F-014 y désigne l'i18n), disjointe de celle
de `docs/pm/FeatureInventory.md` (F-014 y désigne les objectifs KvK, celui utilisé
dans ce document). Les deux fichiers ne partagent pas le même espace de noms de
features — seul l'espace `BR-xxx` de SSOT est le registre continu et à jour. Pas
un problème créé par cette spec, mais à garder en tête pour ne pas confondre les
deux F-014 dans une conversation future.
