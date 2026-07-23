# Étude : Calcul des Objectifs Individuels KvK

## 1. Contexte & Objectif
Le Kingdom Manager (KD 2997) souhaite intégrer le calcul individuel des objectifs KvK (Kill Points & Death Kill Points) pour chaque joueur en fonction de sa puissance. Cette fonctionnalité permettra d'afficher directement les "Minimum Requirements" et "Player Goals" dans le profil du joueur ou via les commandes Discord (`/mykvk`).

## 2. Analyse de la Formule Fournie
La formule utilisée lors du précédent KvK repose sur une approche mathématique (polynôme du second degré) indexée sur la Puissance du joueur ($P$).

*Note : On suppose que $P$ est exprimé en millions (ex: $P=50$ pour 50M de puissance).*

### A. Prérequis Minimums (Minimum Requirements)
*   **Minimum KP** : $0.0556843 \times P^2 - 1.83037 \times P + 38.477$
*   **Minimum Dead** : $0.5 \times (0.0216159 \times P^2 + 3.06256 \times P - 123.036)$
*   **Minimum DKP** dépend de la puissance du joueur :
    *   **Power < 50M** : 25% du "Required DKP"
    *   **Power 50-70M** : 35% du "Required DKP"
    *   **Power > 70M** : 45% du "Required DKP"

### B. Objectifs du Joueur (Player Goal)
*   **KP Goal** : $0.0642424 \times P^2 - 0.198182 \times P - 10.6061$
*   **DKP Goal** : "Req DKP" $\times 200\%$

## 2bis. Résolution — 2026-07-22

> Les trois zones d'ombre de la §3 ont été levées par rétro-ingénierie du classeur
> SoC 4 (onglets « Performance Analysis » et « Dashboard », 45 joueurs). Voir A-005
> dans `Assumptions_Log.md` et le changelog QA v2.32.

1. **« Req DKP » n'existe pas.** Confirmé par le Roi : le *statut DKP* du royaume **est**
   le taux d'atteinte du KP Goal. Le `DKP STATUS` du Dashboard est au chiffre près le
   `% Goal` de Performance Analysis. Les paliers 25 / 35 / 45 % de la §A n'ont donc
   pas d'objet — il n'y a pas de quantité intermédiaire à pourcenter.
2. **Unité de P** : puissance **initiale** de campagne, en millions. Les sorties KP sont
   en **millions de KP**. Vérifié : `minKp(117,97) = 597,4 M`, valeur affichée telle quelle
   par le classeur pour Lord Guineapig.
3. **Unité des morts** : la formule renvoie des **points de morts** (~200 par mort T5),
   pas un nombre de troupes. `(morts × 200) / (minDead(P) × 1e6)` reproduit `% Min Dead`
   à 0,00 % près. Le poids des morts T4 reste inconnu — le classeur ne donne pas la
   répartition par palier.
4. **Caps** : toujours ouvert. Aucun plafond n'apparaît dans le classeur, mais la courbe
   quadratique croît vite (1 405 M de KP visés à 150 M de puissance). Un plafond
   configurable est prévu dans le code (`capMPower`), non activé.

**Défauts numériques des courbes brutes**, mesurés et corrigés dans l'implémentation :
morts négatives sous 32,7 M, KP Goal négatif sous 14,5 M, et `minKp` non monotone sous
16,44 M (un joueur de 5 M devrait 30,7 quand un joueur de 20 M ne doit que 24,1).

**Seuils de notation** relevés sur les 47 joueurs notés : Dead Weight 0-15 %,
Need Improvement 17-25 %, Good 29-64 %, Excellent 56-201 %. La frontière Good/Excellent
est floue entre 56 % et 64 % — arbitrage manuel probable.

## 3. Zones d'Ombre (Assumptions & Missing Data)

> ⚠️ **Section historique — résolue le 2026-07-22, voir §2bis.**

1.  **Définition du "Req DKP" (Required DKP)** : 
    * Le calcul du score DKP (Death Kill Points) par le royaume est défini par la formule : `T4 KILLS * 2 + T5 KILLS * 4 + T4 DEAD * 4 + T5 DEAD * 5`.
    * Cependant, l'équivalent purement mathématique indexé sur la puissance pour obtenir le nombre cible "Req DKP" n'est pas encore totalement défini mathématiquement dans le tableau initial (soit il dérive des Minimum KP/Deads, soit c'est une constante fixée par le Roi).
2.  **Unité de la Puissance ($P$)** : Les constantes suggèrent que $P$ correspond aux millions (ex: 60 pour 60 000 000). Il faudra normaliser la donnée provenant de l'ingestion Firestore avant de l'injecter dans la fonction.
3.  **Caps/Plafonds** : Y a-t-il des limites (caps) mathématiques pour les très grosses puissances (baleines) où la courbe quadratique exploserait ? (ex: Cap à 100M ou 120M Power).

## 4. Recommandation d'Implémentation
1.  **Backend / Utils** : Créer un service utilitaire `KvKGoalCalculator.ts` exposant :
    *   `calculateMinimums(power: number): { minKP, minDead, minDKP }`
    *   `calculateGoals(power: number): { goalKP, goalDKP }`
2.  **Interface Utilisateur** :
    *   **Application Web** : Intégration dans un **nouvel onglet "KvK Goals" au sein du War Tracker**. Cela permet de contextualiser ces objectifs au moment où le joueur déclare ses troupes/disponibilités.
    *   **Bot Discord** : Création d'une nouvelle slash command dédiée (`/mykvkgoals` ou approchant) affichant une carte claire de ces objectifs sans polluer l'historique de `/mykvk`.

## 5. Prochaines Étapes
*   [x] ~~Clarifier l'obtention de la valeur cible "Req DKP"~~ — sans objet : la quantité n'existe pas (§2bis).
*   [x] Développer l'UI "KvK Goals" dans le War Tracker — livré le 2026-07-22, en **vue de campagne** (tous les déclarants) plutôt que pour le seul joueur connecté : la question utile est « qui doit atteindre quoi ».
*   [x] Développer la nouvelle command Discord `/mykvkgoals` — livrée le 2026-07-22, personnelle et éphémère.
*   [ ] Trancher le plafond de puissance pour les très grosses puissances (`capMPower`, prévu mais non activé).
*   [ ] Confirmer la règle exacte de la frontière Good/Excellent, floue dans les données d'origine.
