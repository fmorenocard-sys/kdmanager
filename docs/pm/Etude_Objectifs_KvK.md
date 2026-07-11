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

## 3. Zones d'Ombre (Assumptions & Missing Data)
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
*   [ ] Clarifier l'obtention de la valeur cible "Req DKP" en fonction de la puissance (ou via une variable système).
*   [ ] Développer l'UI "KvK Goals" dans le War Tracker.
*   [ ] Développer la nouvelle command Discord `/mykvkgoals`.
