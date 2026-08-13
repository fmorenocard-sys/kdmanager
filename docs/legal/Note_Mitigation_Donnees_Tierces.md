# Note technique de mitigation — Données de joueurs tiers (scans)

> ⚠️ **PROJET — à faire valider par un juriste avant toute décision engageante ou
> publication.** Ce document n'est **pas** un avis juridique. Il est rédigé par un
> agent IA (rôle « responsable juridique & conformité » du projet), sans qualité
> d'avocat, à partir de la documentation du produit, d'une lecture du code
> (`firestore.rules`, `functions/discordAuth.js`, `src/config/data-mapping.js`)
> et de sources publiques (RGPD, CNIL, EDPB) citées en fin de document. Les choix
> qui engagent (base légale, seuil d'anonymisation, suffisance d'une mesure) sont
> signalés comme **à confirmer par un avocat**.

> Date : 2026-08-13 · Auteur : agent `legal` · Demandeur : le Roi · Rattaché à
> `docs/legal/Etude_Cadrage_Juridique_Lancement_UE.md` (risques R-1, R-2 — cette
> note les creuse techniquement, elle ne les remplace pas) · Hypothèses associées :
> A-044, A-045, A-046 (`docs/pm/Assumptions_Log.md`).

---

## 0. La question posée, et la réponse courte

**Question du Roi (mot pour mot)** : « il me faut une réponse technique pour les
données joueurs tiers, type anonymisation ou quelque chose ? »

**Réponse courte, avant le détail** : non, l'anonymisation seule n'est **pas** la
réponse — elle casserait le produit, dont le cœur est justement de savoir *qui*
est *qui* dans le royaume (assigner un objectif KvK nominatif, suivre un
gouverneur d'une saison à l'autre, décider d'un statut Deadweight). La vraie
réponse est un **combo de cinq leviers**, dont un seul est bloquant et immédiat
(le contrôle d'accès), et dont le fond juridique (base légale + transparence +
opposition) ne se remplace par aucune mesure technique.

| Levier | Suffisant seul, juridiquement ? | Compatible avec le cœur du produit (gestion nominative) ? | Rôle dans la réponse |
|---|---|---|---|
| **1. Contrôle d'accès** | Non — réduit l'*exposition*, ne fonde pas la *licéité* | Oui, pleinement | **Bloquant, à faire en premier** |
| **2. Pseudonymisation** (« c'est déjà un pseudo de jeu ») | Non — reste une donnée personnelle sous RGPD | Oui (c'est déjà l'état actuel) | Argument de minimisation/sécurité, pas d'exemption |
| **3. Anonymisation vraie / agrégation** | Oui, *pour les données concernées* — mais seulement si le test à 3 critères est vérifié | **Non pour le produit nominatif** — seulement pour une vitrine publique | Utile en périphérie (vue visiteur), inutile au centre |
| **4. Minimisation** | Non seule, mais réduit le risque et est une obligation propre (art. 5.1.c) | Oui | Hygiène continue, pas un answer à elle seule |
| **5. Base légale (intérêt légitime) + information (art. 14) + opposition (art. 21)** | **C'est la seule réponse qui traite la licéité elle-même** | Oui, compatible avec la gestion nominative | **Le fond du dossier** |

Le reste de cette note développe chaque ligne, distingue bien à chaque fois
**(a) suffisance juridique** et **(b) viabilité technique compte tenu du besoin
produit**, puis termine par une séquence priorisée.

---

## 1. Un point de méthode à ne jamais perdre de vue : exposition ≠ licéité

Deux questions différentes, souvent confondues :

- **« Qui peut lire la donnée ? »** — une question de **sécurité/architecture**
  (contrôle d'accès, `firestore.rules`). La répondre ne dit rien sur si la
  collecte et le traitement de cette donnée sont **légaux** en premier lieu.
- **« Ai-je le droit de traiter cette donnée, pour cette finalité ? »** — une
  question de **licéité RGPD** (art. 6 : base légale). Elle reste posée même si
  la donnée n'est lisible que par le King, en interne, jamais exposée à
  personne d'autre.

Aujourd'hui, le produit a un problème sur **les deux axes en même temps** :
l'exposition est excessive (§2.1) *et* la licéité n'est pas encore établie par
écrit (§2.5). Fermer l'accès ne réglera **que** le premier axe — c'est
nécessaire, ça ne suffit pas.

---

## 2. Les cinq leviers, un par un

### 2.1 Contrôle d'accès — le point bloquant immédiat

**Constat technique (lu dans `firestore.rules`, lignes 49-62)** :

```
match /static_data/{document=**} {
  allow read: if true;
  allow write: if false;
}

match /kvk_history/{kvkId} {
  allow read: if true;
  ...
}
```

`static_data/*` couvre **toutes** les vues du royaume (roster, KP, puissance,
et — point à souligner, pas assez visible ailleurs — **le document
`static_data/deadweight`, avec les notes libres d'officier et les statuts de
performance**, cf. `docs/qa/SSOT.md` BR-009 : *« the underlying
static_data/deadweight document remains publicly readable at the Firestore
level — UI-level gating only »*). Autrement dit, **la donnée la plus sensible
du produit** — des jugements de performance individuels — est aujourd'hui à un
`fetch()` de distance pour n'importe qui sur Internet, y compris les moteurs de
recherche. C'est le point le plus exposé, pas seulement `static_data/kvk`.

**(a) Est-ce juridiquement suffisant ?** Non, seul. Ça réduit la gravité du
risque R-1 (exposition mondiale non authentifiée) identifié dans l'étude de
cadrage, ce qui est nécessaire et probablement l'action la plus rentable de
toute cette note — mais ça ne fonde **aucune** base légale. Un joueur qui doit
se créer un compte avant de lire les données reste un joueur dont les données
sont traitées **sans base légale documentée** (§2.5) tant que ce chantier n'est
pas fait séparément.

**(b) Est-ce techniquement viable ?** Oui, sans réserve — c'est la modification
la plus simple des cinq leviers, elle ne touche à aucune logique produit.
Proposition concrète, alignée sur le motif déjà connu du projet
(`docs/qa/Audit_Securite_Firestore_2026-07-22.md`, B-1 « ouvert — arbitrage
produit ») :

```
match /static_data/{document=**} {
  allow read: if isAuthenticated();
  allow write: if false;
}

match /kvk_history/{kvkId} {
  allow read: if isAuthenticated();
  ...
}
```

**Nuance technique à ne pas manquer** : dans ce projet, `isAuthenticated()`
n'équivaut **pas** à « membre vérifié du royaume ». La lecture de
`functions/discordAuth.js` montre que le rôle par défaut de **tout** compte
connecté (y compris via Google, sans lien Discord) est `Guest`
(`updateFirestoreRole(uid, 'Guest')` en repli) — la vérification
d'appartenance au serveur Discord ne conditionne que la **promotion** vers
Warrior/Officer/King, pas la création de compte elle-même. Concrètement,
n'importe qui dans le monde peut créer un compte Google gratuit sur l'app et
devenir un `Guest` authentifié. `allow read: if isAuthenticated()` élimine donc
le scraping anonyme, l'indexation par les moteurs de recherche et le partage
de lien brut — un gain réel — mais **n'élimine pas** un accès par une personne
extérieure au royaume qui prend la peine de créer un compte. Deux options, à
trancher avec le PM/le Roi, pas seulement un choix technique :

| Option | Effet | Coût |
|---|---|---|
| **Minimum : `isAuthenticated()`** | Stoppe l'exposition publique/moteurs de recherche ; laisse un accès résiduel à qui crée un compte | Nul — un remplacement de règle |
| **Durci : `isKingOrOfficer()`** pour le document `deadweight` (déjà l'intention de BR-009, aujourd'hui non appliquée au niveau données), lecture `Guest`/`Warrior` restreinte aux champs de roster non-jugeants | Aligne enfin le comportement Firestore sur l'intention UI déjà actée par le Roi (BR-009) | Faible — même schéma que `roles`/`user_profiles` déjà en place |

**Le sujet produit qui accroche là-dessus** : `B-1` dans l'audit sécurité était
resté ouvert *« tant que le sort du Dashboard visiteur (accès sans connexion)
n'est pas tranché »*. Cette note recommande de **trancher ce point avec le
levier 3 (§2.3)** : garder une vitrine visiteur, mais **agrégée/anonyme**, pas
un accès direct à `static_data`/`kvk_history` en clair.

### 2.2 Pseudonymisation — l'argument « c'est déjà un pseudo de jeu »

**L'argument tel qu'il pourrait être posé** : le nom de gouverneur et l'ID
in-game ne sont pas l'identité civile du joueur ; c'est déjà un pseudonyme
choisi par la personne, pas une donnée directement identifiante comme un
nom-prénom réel.

**(a) Est-ce juridiquement suffisant ?** Non, et c'est important de le nommer
clairement pour éviter une fausse impression de sécurité. Sous le RGPD, la
**pseudonymisation est définie par l'art. 4(5) comme réversible et reste, par
définition, une donnée à caractère personnel** — le considérant 26 pose le test
de « l'ensemble des moyens raisonnablement susceptibles d'être utilisés » pour
identifier une personne, **directement ou indirectement, par le responsable du
traitement ou par toute autre personne**. Trois éléments jouent contre
l'argument « pseudonyme donc protégé » dans ce produit précis :

1. **La combinaison de champs est fortement identifiante à l'intérieur de la
   communauté visée.** Un royaume de quelques centaines de joueurs qui se
   connaissent entre eux (alliance, Discord commun) peut associer un nom de
   gouverneur à une personne réelle **sans effort déraisonnable** — le test du
   considérant 26 ne se limite pas à ce que l'éditeur, seul, peut faire ; il
   inclut ce que « toute autre personne » (un membre du royaume) peut
   raisonnablement faire. La barre du « risque de ré-identification non
   insignifiant », reprise par la doctrine et la CNIL, est donc probablement
   franchie **par construction du produit** (un royaume est une communauté qui
   se connaît).
2. **Le SSO Discord change directement la donne pour les comptes liés** —
   c'est le point 2 explicitement posé par la question du Roi. Le mécanisme
   multi-comptes (F-025, `user_profiles.accounts[]`) crée un **lien technique
   direct et permanent** entre `governorId` (le pseudonyme in-game) et un
   compte Discord authentifié (pseudo Discord, avatar, ID Discord — et
   potentiellement l'email si l'utilisateur relie aussi Google). Pour tout
   joueur qui **s'auto-lie** (le cas visé, encouragé par le produit), la
   pseudonymisation est **techniquement levée par le produit lui-même** — ce
   n'est plus un pseudonyme non rattaché, c'est un attribut de compte
   utilisateur identifié.
3. **Le résultat Deadweight/notes** (§2.1) rend l'enjeu plus concret qu'abstrait
   : un pseudonyme rattachable à une décision d'exclusion ou à une note
   d'officier négative n'est pas une donnée neutre.

**(b) Est-ce techniquement viable, sachant le besoin produit ?** Oui — c'est
déjà, de fait, l'état actuel du produit (le stockage utilise des identifiants
de jeu, pas des noms civils), et ça reste la **bonne pratique par défaut**
recommandée par le RGPD lui-même comme **mesure de sécurité** (art. 32.1.a,
« la pseudonymisation… des données à caractère personnel »). Rien à changer
techniquement dans l'immédiat — mais il faut **arrêter d'en faire un argument
de conformité** dans la documentation destinée à l'avocat ou à un joueur qui
poserait la question. C'est un argument de **minimisation/sécurité**, pas un
argument d'**exemption RGPD**.

### 2.3 Anonymisation vraie / agrégation — utile en périphérie, pas au centre

**(a) Est-ce juridiquement suffisant ?** Oui, mais seulement si le résultat
franchit vraiment le seuil de l'anonymisation — ce qui est **exigeant**, pas un
simple retrait du nom. Les lignes directrices EDPB les plus récentes sur le
sujet (Guidelines 02/2026 sur l'anonymisation, adoptées en version projet le
7 juillet 2026 — mise à jour de l'ancien avis WP216 de 2014, **encore en
consultation publique jusqu'au 30/10/2026 au moment de la rédaction, à ne pas
traiter comme définitivement stabilisées**) retiennent un test à **3
critères** : aucune **individualisation** possible (isoler un enregistrement
qui identifie une personne), aucune **corrélation** possible (relier deux
enregistrements à la même personne), aucune **inférence** possible (déduire
une information sur la personne avec une certitude significative). Une
donnée réellement anonyme au sens de ce test **sort du champ du RGPD**
(considérant 26) — c'est un vrai gain, pas un pis-aller.

**(b) Est-ce techniquement viable, sachant le besoin produit ?** **Non, pour le
cœur du produit** — et il faut le dire sans détour au Roi. Gérer un royaume
suppose structurellement de savoir *qui* a quelle puissance, *qui* est en
retard sur ses KP, *à qui* assigner un camp de course, *qui* contacter en
Discord pour un rappel de déclaration. Anonymiser ces vues détruirait la
proposition de valeur — ce n'est pas une option de durcissement, c'est un
changement de produit.

**Là où le levier fonctionne réellement — et c'est directement pertinent pour
le Dashboard visiteur (B-1) laissé ouvert dans l'audit sécurité** : une
**vitrine publique séparée**, sans connexion, destinée à la démo commerciale ou
à un affichage de fierté collective, construite sur des **agrégats** qui
passent le test des 3 critères : total de puissance du royaume, KP cumulés,
nombre de participants par tranche de performance, rang du royaume dans une
coalition — **sans ligne nominative**, sans classement affichant un pseudonyme
associé à un chiffre individuel. C'est un chantier produit distinct (une vue
agrégée à construire, pas une simple bascule de règle Firestore) — à cadrer
avec le PM si le Roi veut garder un accès public sans connexion plutôt que de
tout basculer derrière `isAuthenticated()` (§2.1).

**Recommandation nette** : ne pas présenter l'anonymisation comme *la* réponse
au Roi. La bonne formulation est « on garde deux vues : une vue interne
nominative (auth-gated, c'est le produit), une vue publique agrégée-anonyme
(marketing/vitrine, hors RGPD si le test à 3 critères est vérifié) » — pas
« on anonymise les données du produit ».

### 2.4 Minimisation — hygiène continue, pas une réponse à elle seule

**(a) Est-ce juridiquement suffisant ?** Non seul, mais c'est une obligation
autonome (art. 5.1.c RGPD, « minimisation des données ») qui réduit le risque
sur tous les autres axes.

**(b) Est-ce techniquement viable ?** Oui, et l'étude de cadrage a déjà repéré
les cibles les plus concrètes (`docs/legal/Etude_Cadrage_Juridique_Lancement_UE.md`
§2 T1, risque R-8) : les champs Deadweight `NOTES`/`REASON` (texte libre
d'officier, potentiellement disproportionné) et l'absence de durée de
rétention définie sur `kvk_history` (conservé indéfiniment). Deux actions
distinctes, pas la même :
- **Revue de contenu** (côté produit/officier) : encadrer ce qui est
  acceptable dans un champ `NOTES` libre — pas un chantier technique, un
  chantier d'usage/formation du leadership.
- **Restriction de lecture** du champ Deadweight au strict leadership au
  niveau **Firestore** (pas seulement UI), cohérente avec le durcissement déjà
  proposé en §2.1.

### 2.5 Base légale + information (art. 14) + droit d'opposition (art. 21) — le fond du dossier

C'est la réponse que la question du Roi appelle vraiment, même si elle est
moins « technique » au sens code — mais elle a des **corollaires techniques
concrets**, détaillés ci-dessous.

**(a) Est-ce juridiquement suffisant ?** C'est la **seule** ligne de ce tableau
qui répond réellement à la question de la licéité. Sans elle, aucun des quatre
autres leviers — même combinés — ne rend le traitement licite ; avec elle, la
gestion nominative du royaume devient défendable.

- **Base légale envisagée : intérêt légitime (art. 6.1.f)** — gérer une
  communauté de jeu que ces joueurs ont rejointe. Nécessite un **test en 3
  temps documenté** (finalité légitime / nécessité du traitement / mise en
  balance avec les attentes raisonnables des joueurs), recommandé par la CNIL
  pour la collecte par moissonnage — **non fait à ce jour**, signalé dans
  l'étude de cadrage (§2, §10 point 2) et **non recréé ici**. Le champ le plus
  fragile pour ce test reste `NOTES`/`REASON` (Deadweight) : l'intérêt
  légitime d'un royaume à gérer sa performance collective ne couvre pas
  automatiquement un commentaire libre d'officier sur une personne — **à
  trancher avec un avocat, champ par champ si nécessaire**, pas en bloc.
- **Information des personnes (art. 14)** — obligation légale distincte de la
  base légale elle-même : informer chaque personne concernée, au plus tard un
  mois après la collecte, via un mécanisme accessible **sans connexion**
  (annonce royaume Discord, lien public vers une notice, MOTD in-app). C'est
  une **priorité de contrôle CNIL 2026** d'après l'étude de cadrage. Sans
  connexion requise, ce mécanisme est un **chantier produit**, pas seulement
  documentaire — à cadrer avec le PM.
- **Droit d'opposition (art. 21)** — parce que la base légale envisagée est
  l'intérêt légitime (pas le consentement), chaque joueur scanné dispose d'un
  **droit de s'opposer à tout moment**, pour des raisons tenant à sa situation
  particulière, sauf motifs légitimes et impérieux démontrés par le
  responsable de traitement (art. 21.1). **Corollaire technique concret,
  aujourd'hui absent du produit** : comme la donnée vient d'un **re-scan
  périodique** (le pipeline d'ingestion réimporte le classement à chaque
  campagne), un joueur qui obtient le retrait de sa ligne aujourd'hui la
  verrait **revenir automatiquement au prochain scan** sans mécanisme
  d'exclusion. Il faut, techniquement, une **liste d'exclusion consultée par
  le pipeline d'ingestion** (`data-mapping.js` / la fonction de digestion) qui
  filtre les `governorId` ayant exercé leur droit avant d'écrire dans
  `static_data`/`kvk_history` — sans quoi le droit d'opposition/d'effacement
  n'est pas réellement exerçable dans ce produit, seulement sur le papier.
  **C'est un chantier produit à cadrer avec le PM**, distinct des quatre
  premiers leviers, et probablement le plus structurant à moyen terme.

**(b) Est-ce techniquement viable, sachant le besoin produit ?** Oui,
pleinement — c'est le seul levier des cinq qui **ne dégrade en rien** la valeur
du produit (gestion nominative intacte) tout en traitant le fond légal. C'est
aussi le plus lourd à mettre en œuvre correctement (notice, mécanisme de
contact, liste d'exclusion, test de mise en balance documenté) — mais c'est le
prix d'un traitement de données de tiers sans consentement individuel, il n'y
a pas de raccourci technique qui l'évite.

---

## 3. Synthèse — ce que change concrètement le SSO Discord (point 2 de la demande)

Pour répondre directement et une seule fois au point précis posé : le SSO
Discord ne change **rien** à la donnée brute du scan elle-même (elle reste un
`governorId`/pseudo, comme avant) — il change la **chaîne de ré-identification**
disponible pour tout joueur qui relie volontairement son compte :

```
governorId (scan, pseudonyme in-game)
     │  lié par le joueur lui-même (F-025, accounts[])
     ▼
uid Firebase Auth ←→ Discord ID + pseudo Discord + avatar (+ email si Google lié)
```

Avant liaison : le pseudonyme reste un pseudonyme au sens strict (réversible
seulement via des moyens que l'éditeur ne détient pas nativement — mais
rappel §2.2 point 1, la communauté elle-même peut souvent faire ce lien sans
Discord). Après liaison (le cas que le produit encourage activement) : le
pseudonyme est rattaché à un compte utilisateur identifié, ce qui **renforce**
l'argument que la donnée du scan est une donnée personnelle au sens plein, pas
un argument qui l'affaiblirait. **Aucune action technique corrective requise
sur ce point spécifique** — c'est un constat qui alimente le dossier
« pseudonymisation ≠ exemption » du §2.2, pas un risque autonome nouveau.

---

## 4. Recommandation séquencée

### Strict minimum avant d'ouvrir/facturer (bloquant)

1. **Contrôle d'accès (§2.1)** — remplacer `allow read: if true` par
   `allow read: if isAuthenticated()` sur `static_data/*` et `kvk_history` ;
   évaluer en plus un durcissement `isKingOrOfficer()` spécifique au document
   `static_data/deadweight` pour aligner enfin la règle Firestore sur
   l'intention déjà actée par le Roi (BR-009). **Action technique la plus
   simple des quatre, à faire en premier**, indépendamment du reste — elle ne
   dépend d'aucun arbitrage juridique préalable.
2. **Notice art. 14 accessible sans connexion + mécanisme minimal d'exercice
   des droits** (§2.5) — document juridique **et** point d'entrée produit
   (lien public, annonce royaume) pour qu'un joueur scanné puisse être informé
   et exercer son droit d'opposition/effacement.
3. **Test de l'intérêt légitime en 3 temps, documenté par écrit** (§2.5) —
   avec un avocat, en distinguant si besoin le cœur du produit (puissance/KP,
   défendable) des champs les plus fragiles (`NOTES`/`REASON` Deadweight,
   à traiter séparément si le test ne les couvre pas de la même façon).
4. **Mécanisme technique d'opt-out réel** (liste d'exclusion consultée par le
   pipeline d'ingestion, §2.5) — sans lui, le point 2 promet un droit que le
   produit ne peut pas honorer au scan suivant.

### Confort — peut suivre, sans bloquer le lancement

5. **Vitrine publique agrégée-anonyme** (§2.3) si le Roi veut conserver un
   accès sans connexion (résout B-1 côté « Dashboard visiteur » autrement
   qu'en fermant tout) — chantier produit à part entière, pas une bascule de
   règle.
6. **Revue de minimisation fine** des champs Deadweight (§2.4) — contenu et
   rétention, peut s'inscrire dans une itération produit normale.
7. **Durcissement de pseudonymisation technique** (ex. table de correspondance
   séparée `governorId ↔ identifiant interne`) — gain marginal vu que la
   communauté elle-même connaît déjà les correspondances (§2.2), donc **basse
   priorité**, à ne considérer que si un usage futur (revente de données
   agrégées à un tiers, analytics cross-royaume) l'exige.

**Message clé à retenir pour la décision du Roi** : l'anonymisation, seule,
**n'est pas** la réponse — elle casserait le produit. La réponse réaliste est
le combo **accès restreint (§2.1) + pseudonymat assumé et documenté comme tel,
pas comme une exemption (§2.2) + base légale et transparence écrites (§2.5) +
mécanisme d'opposition réellement exerçable (§2.5)** — avec l'anonymisation/
agrégation réservée à la seule vue qui peut se permettre de perdre le
nominatif : une vitrine publique, pas le produit.

---

## 5. Points laissés ouverts, à trancher avec un avocat

1. Le test de mise en balance de l'intérêt légitime (§2.5) couvre-t-il
   l'ensemble des champs ingérés, y compris les champs Deadweight les plus
   qualitatifs (`NOTES`, `REASON`), ou faut-il une base légale/segmentation
   différente pour ces champs ? *(Repris de l'étude de cadrage §10 point 2,
   creusé ici sans être tranché.)*
2. Le rattachement Discord (§3) change-t-il la qualification de risque pour
   les seuls comptes liés, justifiant un traitement différencié (information
   renforcée au moment de la liaison de compte, par exemple) ?
3. Le niveau d'accès « `isAuthenticated()` » (§2.1, option minimum) est-il une
   mitigation suffisante en soi, ou l'absence de vérification réelle
   d'appartenance au royaume (n'importe qui peut créer un compte Google)
   oblige-t-elle à retenir l'option durcie (`isKingOrOfficer()` pour
   Deadweight a minima) dès le lancement plutôt qu'en confort ?
4. Le test d'anonymisation à 3 critères (§2.3, Guidelines EDPB 02/2026,
   **encore en projet/consultation**) est-il suffisamment stabilisé pour
   documenter une vitrine publique comme « hors RGPD », ou faut-il une
   position plus prudente en attendant le texte définitif ?

---

## Sources consultées

- RGPD — art. 4(1) (définition de donnée à caractère personnel), art. 4(5)
  (pseudonymisation), art. 5.1.c (minimisation), art. 6.1.f (intérêt légitime),
  art. 14 (information — collecte indirecte), art. 21 (droit d'opposition),
  art. 32.1.a (pseudonymisation comme mesure de sécurité), considérant 26
  (test des « moyens raisonnablement susceptibles d'être utilisés » pour
  l'identification).
- [EDPB — Guidelines 02/2026 on Anonymisation, version 1.0 adoptée le 7 juillet 2026 (en consultation publique jusqu'au 30/10/2026)](https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202602_anonymisation_v1_en_0.pdf)
- [EDPB — page de consultation publique, Guidelines 02/2026 on Anonymisation](https://www.edpb.europa.eu/public-consultations/guidelines-022026-on-anonymisation_en)
- Article 29 Working Party — Opinion 05/2014 on Anonymisation Techniques (WP216, 2014), texte historique mis à jour par les Guidelines 02/2026 ci-dessus.
- [CNIL — Identifier les données personnelles](https://www.cnil.fr/fr/identifier-les-donnees-personnelles)
- [CNIL — L'anonymisation de données personnelles](https://www.cnil.fr/fr/technologies/lanonymisation-de-donnees-personnelles)
- [CNIL — L'intérêt légitime : comment fonder un traitement sur cette base légale](https://www.cnil.fr/fr/les-bases-legales/interet-legitime)
- [CNIL — Focus intérêt légitime : mesures à prendre en cas de collecte par moissonnage (web scraping)](https://www.cnil.fr/fr/focus-interet-legitime-collecte-par-moissonnage)
- Recherche web (2026-08-13) sur le droit d'opposition (art. 21) et son
  articulation avec l'intérêt légitime (charge de la preuve sur le responsable
  de traitement pour écarter l'opposition).

*Sources internes* : `docs/legal/Etude_Cadrage_Juridique_Lancement_UE.md`,
`docs/qa/SSOT.md` (BR-008, BR-009, BR-020), `docs/qa/Audit_Securite_Firestore_2026-07-22.md`
(constat B-1, ouvert), `firestore.rules`, `functions/discordAuth.js`,
`src/config/data-mapping.js`.
