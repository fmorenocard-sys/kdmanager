# Étude — Industrialisation de l'onboarding multi-royaumes

> Date : 2026-07-28 · Auteur : PM · Statut : **exploratoire (aide à la décision)**
> Question posée par le Roi : le setup du pilote KD 3341 a semblé complexe. Si on
> doit industrialiser pour onboarder **~10 royaumes en un mois**, comment s'y
> prendre / optimiser ?

> **Nature du document** : cadrage, pas un plan d'exécution engagé. **Précision
> du Roi (2026-07-28)** : « 10 royaumes/mois » n'est pas un engagement pris —
> c'est un **test de faisabilité** : le Roi veut savoir si c'est atteignable,
> et à quel coût, avant de se prononcer sur un chiffre. Cette étude objective
> donc ce que « complexe » veut dire (baseline chiffrée du runbook actuel,
> §2), pose la bifurcation d'architecture (§3–4), isole le levier d'onboarding
> le plus direct — rendre Discord optionnel (§5) —, tranche la question
> d'isolation des données (§6) et rend un **verdict de faisabilité chiffré**
> (§7) — pas une liste d'options renvoyée au Roi.

---

## 1. La question, reformulée — et le verdict attendu

Trois questions se cachent derrière « comment industrialiser » :

1. **Le setup actuel est-il vraiment complexe, ou juste nouveau ?** KD 3341 est
   le **seul** cas réel d'onboarding à ce jour (`Plan_Pilote_KvK.md`). Une
   partie de la friction ressentie est structurelle (documentée §2), une autre
   est un coût d'apprentissage à ne pas payer deux fois.
2. **10 royaumes en un mois, c'est faisable ou non — et à quel coût ?** C'est
   la question que pose réellement le Roi. **Précision du 2026-07-28** :
   « 10/mois » n'est pas un engagement pris, **c'est un test de faisabilité.**
   Le Roi ne demande pas « construis pour tenir ce chiffre », il demande
   « dis-moi si c'est tenable, et ce que ça coûterait d'y arriver par chaque
   voie » — avant de se prononcer sur un volume cible. Cette étude répond
   directement par un verdict chiffré en §7, plutôt que par une liste
   d'options renvoyées au Roi.
3. **Quelle architecture, et à quel prix ?** C'est la bifurcation multi-
   instance automatisé (voie A) vs multi-tenant (voie B) vs un pont entre les
   deux (voie C) — §3, avec le chiffrage du coût de la voie B demandé
   explicitement par le Roi (§7), et l'arbitrage sur l'isolation des données
   qu'il demande également à cette étude de trancher (§6).

Ce recadrage ne change pas le principe déjà acté par
`Etude_Commercialisation_SaaS.md` (décisions du Roi, 2026-07-24) de
**différer le multi-tenant jusqu'à demande et paiement prouvés** (Objection 1
et 2 du §8) — il l'applique au cas « 10/mois » en répondant exactement à la
question posée (faisabilité et coût, pas engagement), ce qui renforce plutôt
qu'affaiblit la doctrine « scrappy d'abord » déjà en place.

---

## 2. Baseline — le runbook d'onboarding actuel, chiffré

Ce que « complexe » veut dire concrètement : les 11 étapes vécues sur KD 3341,
dans l'ordre. Colonne **Nature** = manuel (console/portail, geste humain
obligatoire) / scriptable (déjà outillé ou automatisable sans obstacle
connu) / **externe** (dépend d'une action du royaume client, hors de notre
contrôle).

| # | Étape | Nature | Temps estimé* |
|---|---|---|---|
| 1 | Créer le projet Firebase dédié + activer la facturation | Manuel (console) | 15–20 min, + délai de propagation |
| 2 | Provisionner Hosting, Firestore (base **nommée** `kdmanagerdb`), Storage | Manuel aujourd'hui, scriptable | 15 min |
| 3 | Générer la clé service-account à la main (console, gitignorée) | Manuel (pas d'ADC/gcloud dans l'environnement) | 5–10 min |
| 4 | Déployer les règles Firestore via `scripts/deploy-rules-pilot.mjs` (contournement du bug CLI multi-base) | **Déjà scriptable** | ~10 min d'exécution |
| 5 | `.firebaserc` alias + `firebase.pilot.json` par royaume | Manuel (copier-éditer), scriptable | 5–10 min |
| 6 | `.env.<royaume>` (branding public) + `functions/.env.<projet>` (secrets) | Manuel | 20–30 min |
| 7 | **App Discord OAuth dédiée** + 7 secrets `defineSecret` + `ROLE_KING_USER_IDS` + épinglage du Roi — **poste de friction le plus lourd du runbook, voir §5** | Manuel (portail Discord) + scriptable (pose des secrets) | 30–45 min, **+ attente externe** pour guild ID/IDs de rôles |
| 8 | Déploiement des Cloud Functions (par projet) | **Déjà scriptable** | 10–15 min |
| 9 | Assets de branding (logo, favicon, avatar défaut) | Manuel, dépend d'un fourni externe | 15–30 min |
| 10 | Ingestion du roster + scan initial (`scripts/ingest-soc-scan.mjs`, format ProKingdoms) | Scriptable pour ProKingdoms ; nouveau code si autre fournisseur | 15 min (ProKingdoms) à plusieurs jours (nouvel adaptateur) |
| 11 | Config campagne KvK (Administration) + **invitation du bot Discord** — dépend directement de l'étape 7, voir §5 | Config = quelques min (UI existante) ; invitation bot = **externe** (admin du serveur client) | 10–15 min + attente externe |

**Total « exécution propre »** (hors attentes externes, hors debug de
première fois) : de l'ordre de **2h30 à 3h30** de travail actif du fondateur.

*\* Estimations d'ordre de grandeur, pas des mesures.* Le plan du pilote
exclut explicitement le chiffrage (`Plan_Pilote_KvK.md` : « Pas de chiffrage
en jours-homme ici — il n'apporte rien à notre façon de travailler »). Les
temps ci-dessus sont déduits de la nature de chaque étape (console vs script
vs attente tierce), **pas chronométrés** sur le pilote réel. C'est une zone
d'ombre à combler — voir hypothèse A-030 en fin de document.

**Lecture PM — ce qui rend le setup « complexe » n'est pas la somme des
minutes, c'est trois choses qui se combinent :**

1. **Deux systèmes distincts à opérer en parallèle** (console Google Cloud/
   Firebase + portail développeur Discord), chacun avec ses propres pièges —
   le bug CLI multi-base (étape 4) en est l'exemple concret : des heures de
   debug la première fois, invisibles dans le total ci-dessus parce que déjà
   contournées et scriptées.
2. **Des dépendances externes qui allongent le délai calendaire sans coûter de
   temps actif** (étapes 7, 9, 11) : guild ID, IDs de rôles, logo, invitation
   du bot — toutes des actions que **seul le royaume client** peut faire.
   `Plan_Pilote_KvK.md` le documente déjà : « Reste à obtenir de leur Roi les
   identifiants Discord techniques ». Un onboarding qui prend « une demi-
   journée de travail » peut s'étaler sur plusieurs jours calendaires si le
   client répond lentement — et ceci **ne se résout pas en interne**, quelle
   que soit l'architecture choisie (repris en §4).
3. **Un seul cas réel vécu.** Une partie de la friction ressentie sur KD 3341
   est un coût d'apprentissage (bug CLI découvert et corrigé, séquence
   clarifiée) qui ne se reproduira pas à l'identique au 2ᵉ onboarding — à ne
   pas extrapoler telle quelle sur 10 instances.
4. **Discord (étapes 7 et 11) concentre à lui seul le geste manuel le plus
   lourd ET la dépendance externe la plus incertaine** — les deux causes de
   friction cumulées sur un seul chantier, alors qu'ailleurs elles sont
   séparées. C'est développé en détail en §5, avec une piste du Roi pour le
   retirer purement et simplement du chemin d'onboarding de base.

---

## 3. Les trois voies — effort par chantier, impact sur le scale 10/mois

Effort : **S** (petit) / **M** (moyen) / **L** (lourd, structurant) — même
échelle que `Etude_Commercialisation_SaaS.md` §3.

| Chantier | Voie A — multi-instance automatisé | Voie B — multi-tenant | Voie C — pont (A maintenant, B si prouvé) |
|---|---|---|---|
| Provisioning infra (projet, Hosting, Firestore, Storage) | **M** — CLI/Terraform + Firebase Admin API, template par royaume, élimine la plupart des clics console | **S** — un seul projet à faire évoluer, plus de provisioning répété | = Voie A tant que B n'est pas engagé |
| Clés SA / secrets | **S–M** — scriptable via l'API IAM une fois un bootstrap en place (aujourd'hui manuel : pas d'ADC/gcloud dans l'environnement, dette d'outillage plutôt que limite Firebase) | **S** — un seul jeu de secrets pour tout le service | = Voie A |
| Auth Discord par royaume | **L** — app OAuth créée à la main par royaume (pas d'API publique de création d'app Discord), 7 secrets + URI de redirection dérivée du project ID à reposer à chaque fois — irréductible tant que le modèle « 1 app par royaume » est gardé (nuance possible, voir A-027 et §4) | **L** — réécriture de `discordAuth.js` pour dispatcher par tenant (guild → kingdomId), mais **une seule** app Discord à gérer une fois pour toutes | Court terme = Voie A (douleur assumée, plafonne le débit) |
| Ingestion / adaptateurs de scan | **M** — déjà partiellement scriptable (`ingest-soc-scan.mjs`), un adaptateur par nouveau format tiers (item 5, `Etude_Commercialisation_SaaS.md` §4) | **M** — même chantier, indépendant du modèle d'hébergement | = même effort dans les deux voies, non affecté par le choix A/B |
| Modèle de données | **S** — déjà isolé par projet, rien à refondre | **L** — re-namespacer `tenants/{kingdomId}/…`, réécrire règles/requêtes/bot/Functions (item 1, étude SaaS §3) | Différé tant que B n'est pas engagé |
| Firestore rules | **S** — template déjà versionné et scriptable (le bug multi-base est déjà contourné, §2 étape 4), à généraliser en template paramétrable | **L** — nouvelle structure de règles multi-tenant à écrire et auditer | Différé |
| Bot Discord | **M** — un bot/token par royaume, invitation manuelle (externe) mais code déjà générique | **M** — un seul bot multi-guild, mais routage des interactions par guild à coder | = Voie A à court terme |
| Assets marque blanche | **S** — déjà fait (`branding.js`, F-023/BR-015 réutilisables) | **S** — ne change pas selon le modèle d'hébergement | = |
| Exploitation continue (support, debug, scans manuels) | **Croît linéairement avec N** — pas de mutualisation, c'est le vrai plafond du modèle | **Mutualisé** — un seul environnement à surveiller, mais explosion du rayon d'impact en cas de bug (un incident touche tout le monde) | Voie A jusqu'à un seuil de charge, puis bascule |

**Impact sur le scale « 10 royaumes/mois » :**

- **Voie A** réduit le temps *actif* d'onboarding (§2) mais **chaque royaume
  ajoute un projet Firebase distinct** — à vérifier : les quotas de création
  de projets par compte de facturation Google/Firebase supportent-ils un tel
  rythme sans intervention manuelle de déblocage (hypothèse A-026, non
  vérifiée) ? Et surtout : l'automatisation interne ne supprime **pas** les
  dépendances externes (§2, §4) qui plafonnent le débit réel, quel que soit
  l'outillage.
- **Voie B** supprime la répétition d'infra et de règles, mais c'est un
  chantier de plusieurs semaines à mois (items 1/2/7/8 de l'étude SaaS §3),
  incompatible avec un objectif à un mois — construire du multi-tenant **et**
  livrer 10 onboardings dans le même mois n'est pas réaliste avec les moyens
  actuels (fondateur solo).
- **Voie C** est la seule qui produit un résultat utilisable dans un délai
  d'un mois : elle n'attend pas la refonte pour commencer à réduire la
  friction du runbook §2.
- **Un levier orthogonal aux trois voies existe** : retirer Discord du
  chemin d'onboarding du tier de base (§5). Il ne remplace pas l'arbitrage
  A/B/C ci-dessus — il s'y ajoute, et réduit la friction quelle que soit la
  voie retenue par ailleurs.

---

## 4. Voie A — ce qui est irréductiblement manuel, et ce qui ne l'est pas

Distinction utile pour ne pas sur-vendre l'automatisation interne : une partie
des 11 étapes ne dépend **pas** de notre outillage.

| Étape | Irréductible ou automatisable | Pourquoi |
|---|---|---|
| Activation de la facturation | **Irréductible au bootstrap**, automatisable ensuite | Google exige un geste humain pour lier une nouvelle carte/identité une première fois. **Mais** l'API Cloud Billing permet de rattacher un projet à un compte de facturation **déjà vérifié** — si un compte « maître » est mis en place une fois, le rattachement des projets suivants devient scriptable. Non vérifié en pratique ici — hypothèse A-026. |
| Provisioning Hosting/Firestore/Storage | **Automatisable** | Firebase Management API / gcloud, effort M pour construire le script une fois. |
| Génération de la clé service-account | **Manuel aujourd'hui, automatisable** | L'API IAM (`projects.serviceAccounts.keys.create`) le permet depuis un compte orchestrateur avec les droits — l'environnement de dev actuel n'a simplement pas gcloud/ADC configuré. C'est une dette d'outillage, pas une limite Firebase. |
| Déploiement des règles Firestore | **Déjà automatisé** | `scripts/deploy-rules-pilot.mjs` existe et contourne le bug CLI multi-base — à généraliser en template par royaume, effort quasi nul. |
| Templating `.env`/`.firebaserc` | **Automatisable (S)** | Un générateur à partir d'un fichier de config royaume (YAML/JSON) sort les fichiers ; même pattern que `branding.js`. |
| **Création de l'app Discord OAuth** | **Irréductible tant que le modèle « 1 app par royaume » est gardé** | Pas d'API publique de création d'application dans le portail développeur Discord — geste humain obligatoire par royaume. **Piste d'automatisation possible mais non vérifiée** (A-027) : une app Discord unique **partagée**, avec plusieurs URIs de redirection enregistrées, moyennant un refactor de `discordAuth.js` pour résoudre dynamiquement la bonne URI/le bon tenant. Chantier non trivial (effort M), jamais prototypé. |
| Pose des secrets `defineSecret` | **Automatisable (S–M)** | `firebase functions:secrets:set` est scriptable — à condition d'avoir déjà les valeurs (bloc suivant). |
| **Obtention du guild ID / IDs de rôles du royaume client** | **Irréductible, externe** | Dépend d'une action du Roi/Officier du royaume client (Mode développeur Discord, copier l'ID). Latence hors de notre contrôle, quel que soit l'outillage interne. |
| Déploiement des Cloud Functions | **Déjà automatisé** | `firebase deploy --only functions`, juste à déclencher par royaume. |
| **Fourniture du logo/branding** | **Irréductible, externe** | Le royaume client doit fournir ses assets ; le placement/redimensionnement est automatisable une fois reçus. |
| Ingestion du scan initial | **Automatisable pour ProKingdoms** ; nouveau code par fournisseur tiers | Adaptateur existant pour ProKingdoms ; chaque nouveau format (RokStats, etc.) reste un chantier de code, indépendant de la voie A/B choisie (item 5, étude SaaS §4). |
| **Invitation du bot sur le serveur Discord client** | **Irréductible, externe** | Seul un admin du serveur Discord du client peut inviter le bot avec les bonnes permissions OAuth. |

**Lecture PM.** En comptant large, la voie A automatisée pourrait ramener le
temps *actif* du fondateur par onboarding de ~3h à ~1h (étapes 1–6, 8
scriptées) — un gain réel. Mais **quatre points restent structurellement
hors de notre contrôle interne** : la création de l'app Discord par royaume
(sauf refactor non vérifié, A-027), et trois dépendances externes (guild
ID/rôles, logo, invitation du bot) qui imposent des allers-retours avec
chaque royaume client. Sur 10 royaumes en un mois, ce ne sont **pas** les
minutes d'exécution qui posent problème — c'est la coordination simultanée de
10 clients externes répondant à des rythmes différents, plus la création
manuelle de 10 apps Discord (30–45 min chacune, §2) si le modèle « 1 app par
royaume » n'est pas remis en cause. **Une alternative plus radicale que
l'automatisation ou le partage d'app existe : ne pas optimiser Discord, le
retirer purement et simplement du chemin d'onboarding de base — développée
en §5.**

---

## 5. Le levier le plus direct — rendre Discord optionnel/premium à l'onboarding

Indépendamment du choix d'architecture (voie A/B/C, §3), il y a une
optimisation d'onboarding plus directe que tout ce qui précède : **retirer
Discord du chemin d'onboarding du tier de base.** Proposition du Roi, à
traiter ici uniquement sous l'angle onboarding — le packaging/pricing
(Discord payant, à quel prix, pour qui) relève de
`Etude_Commercialisation_SaaS.md`, pas de cette étude.

### Discord est le plus gros poste de friction du runbook actuel

Dans le runbook baseline (§2), l'étape 7 (app Discord OAuth dédiée + 7
secrets `defineSecret` + `ROLE_KING_USER_IDS` + épinglage du Roi) est, de
loin, la plus lourde et la moins scalable :

- app OAuth créée à la main par royaume, pas d'API de création — geste
  humain obligatoire, ~30–45 min par royaume, avec en plus l'URI de
  redirection **dérivée du `PROJECT_ID`**, codée en dur dans
  `discordAuth.js` ;
- 7 secrets à poser par projet (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
  `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_KING/OFFICER/
  WARRIOR`) + `ROLE_KING_USER_IDS` ;
- l'étape 11 (invitation du bot sur le serveur du client, mapping des rôles)
  en dépend directement et ajoute sa propre latence externe (§2, §4).

Sur les douze lignes du tableau §4, Discord est la **seule** dont
l'irréductible (création de l'app) cumule à la fois un geste manuel lourd
**et** une dépendance externe (guild ID/rôles) — les deux causes de friction
réunies sur un seul chantier, alors qu'ailleurs elles sont séparées.

### La proposition du Roi : Discord en option, pas en socle

Si l'intégration Discord (SSO OAuth + synchro des rôles + bot + snapshots)
devient un **module opt-in/premium** plutôt qu'un passage obligé, le chemin
d'onboarding du **tier de base** n'exécute plus l'étape 7 (ni l'étape 11) du
tout. C'est la brique la plus coûteuse du parcours répétable qui disparaît du
chemin critique — un gain d'onboarding plus direct que n'importe quelle
automatisation de la voie A, et **orthogonal au choix A/B/C** : que
l'infra soit mono-instance ou multi-tenant, retirer Discord de l'onboarding
de base réduit la friction dans les deux cas.

**Le mécanisme existe déjà, partiellement.** Le registre de modules `F-023`/
`E-006` (`src/config/modules.js`, `VITE_MODULE_*`) sait déjà activer/
désactiver Banque, Trophées, Deadweight par instance, à la granularité
**page**. Étendre ce principe à l'auth/aux rôles Discord suppose de
descendre à une granularité plus fine — ce n'est plus « telle page existe ou
non », c'est « telle **méthode d'authentification et d'attribution des
rôles** existe ou non » — un chantier distinct de F-023, pas une simple
entrée supplémentaire dans `MODULES`.

### Le prérequis à nommer explicitement

Cette proposition est **le revers de la Décision 3** de
`Etude_Commercialisation_SaaS.md` (« Discord = pas obligatoire », §0) : un
royaume sans Discord doit déjà fonctionner. Or aujourd'hui, sans Discord, le
produit n'a **pas** de mécanisme d'attribution des rôles — l'auth Google
existe déjà, mais l'attribution des rôles (King/Officer/Warrior) sans passer
par les rôles d'un serveur Discord est une **surface neuve**, déjà identifiée
comme un chantier **L** dans l'étude SaaS (§3, item 8 : « l'affectation des
rôles sans Discord est une surface neuve »).

**Discord ne peut devenir un module premium proprement que si le tier de
base fonctionne sans lui.** Séquence obligée, pas optionnelle :

1. **D'abord**, construire le fallback in-app (auth non-Discord déjà là +
   attribution des rôles in-app à construire, item 8 étude SaaS — **L**).
2. **Ensuite seulement**, Discord devient un module additionnel posé
   par-dessus un socle qui fonctionne déjà sans lui — à ce moment, retirer
   Discord de l'onboarding du tier de base devient un vrai gain net,
   pas une régression fonctionnelle déguisée.

Construire le module opt-in Discord **avant** le fallback in-app produirait
l'inverse de l'effet recherché : un tier de base qui n'a ni Discord ni
mécanisme de rôles fonctionnel — inutilisable, pas plus simple à onboarder.
Ce prérequis est repris dans le chiffrage §7.

---

## 6. Isolation des données — projet (voie A) vs logique `kingdomId` (voie B)

Question posée explicitement par le Roi : il ne tranche pas lui-même le
modèle d'isolation, il demande que l'étude pose le pour/contre — y compris
l'angle RGPD, puisque le produit héberge des données de joueurs tiers
(rosters, IDs de gouverneur, parfois liés à un ID Discord) appartenant à des
royaumes clients distincts — et rende une recommandation.

### Isolation par projet (voie A — modèle actuel)

**Pour**
- Isolation forte *by construction* : chaque royaume a son propre projet
  Firebase, sa propre base Firestore nommée, son propre bucket, ses propres
  clés et secrets. Aucune requête, même mal écrite, ne peut techniquement
  traverser d'un royaume à l'autre — il n'y a pas de collection partagée à
  mal filtrer.
- **Blast radius contenu** : une faille de sécurité, une clé compromise ou un
  bug de règles (le projet en a déjà connu un — `BUG-002`, constat `B-1`
  encore ouvert) touche **un seul royaume**, jamais les autres.
- **RGPD plus simple à honorer** : une demande de suppression, un audit ou
  une notification de fuite pour un royaume se traite projet par projet —
  au pire, supprimer le projet efface tout, sans risque d'oubli d'une
  collection partagée.

**Contre**
- **Coût d'exploitation × N** : un correctif de sécurité, une mise à jour de
  règles ou de Functions doit être repoussé sur chaque projet séparément —
  rien ne garantit que les 10 instances tournent la même version au même
  moment.
- **Aucune économie d'échelle** : le coût marginal d'un royaume de plus reste
  élevé indéfiniment (§2–4) ; pas de vue consolidée native pour l'opérateur
  (support, monitoring, facturation).

### Isolation logique par `kingdomId` (voie B — multi-tenant)

**Pour**
- **Un seul environnement à opérer** : un correctif de sécurité s'applique
  instantanément à tous les tenants ; économie d'échelle réelle sur
  l'exploitation et la maintenance.
- **Vue consolidée native** pour l'opérateur, et onboarding quasi instantané
  une fois construit (un document de config, pas de provisioning d'infra) —
  la seule voie qui rendrait un vrai 10/mois soutenable dans la durée.

**Contre — l'angle RGPD que le Roi demande à trancher**
- L'isolation ne repose plus sur une frontière infrastructurelle mais
  **entièrement sur la rigueur du code applicatif** : chaque requête
  Firestore et chaque règle de sécurité doit filtrer par `kingdomId`. Un
  oubli de filtre devient une **fuite de données cross-royaumes** — un
  incident qui, dans ce modèle, peut exposer plusieurs royaumes clients à la
  fois dans un seul bug, alors que l'isolation par projet limite
  structurellement ce même bug à un seul royaume. C'est le risque RGPD le
  plus sérieux du modèle : on hébergerait des données personnelles
  (identifiants liés à un compte Discord) de plusieurs royaumes distincts
  dans un espace logique unique.
- Les règles Firestore multi-tenant sont notoirement plus difficiles à
  auditer et à prouver correctes que des règles mono-royaume — le projet a
  déjà un précédent direct : l'audit du 2026-07-22 a trouvé et corrigé
  plusieurs failles de règles sur un modèle **mono-royaume**, plus simple que
  ce que le multi-tenant demanderait (`BUG-002`). Multiplier la surface de
  règles conditionnelles multiplie le risque de ce type de faille.
- La suppression ou la portabilité des données d'un royaume qui part
  (churn) devient une purge ciblée par `kingdomId`, collection par
  collection, avec un vrai risque d'oubli — contre une suppression de projet
  qui efface tout par construction en voie A.

### Recommandation sur l'isolation

**Garder l'isolation par projet tant que le volume reste faible** (situation
actuelle) : c'est l'option qui minimise le risque et l'effort d'audit avec le
moins d'investissement, et le produit héberge déjà des données de joueurs
tiers sans avoir construit l'appareil de sécurité (audit récurrent, suite de
tests de règles exhaustive) qu'un multi-tenant sûr exigerait en continu. Le
multi-tenant devient défendable à l'échelle, mais **seulement s'il est
accompagné d'un chantier de sécurité dédié** — tests de règles multi-tenant
obligatoires en CI (le projet a déjà `npm run test:rules`, bonne base à
étendre), audit de sécurité spécifique avant bascule, revue systématique de
chaque requête pour la présence du filtre `kingdomId`. Ce chantier de
sécurité doit être compté dans le coût de la voie B (§7) — ce n'est pas un
simple refactor de requêtes, c'est un changement de la nature de la garantie
d'isolation, de « le système ne peut pas fuiter » à « le code ne doit jamais
oublier de filtrer ».

---

## 7. Verdict de faisabilité & coût — recommandation

### Verdict direct

**« 10 royaumes/mois » est atteignable en volume d'infrastructure, mais pas
en un mois, avec le niveau d'outillage actuel (quasi tout manuel, §2).** Le
goulot n'est pas la capacité de l'infra à porter 10 royaumes — c'est (a) le
temps actif du fondateur sur les étapes encore manuelles et (b) les
dépendances externes (§4 : app Discord par royaume, guild ID/rôles, logo,
invitation du bot) qui imposent une coordination avec 10 interlocuteurs
distincts, à leur rythme, hors du contrôle du fondateur. Le levier le plus
direct pour réduire ce goulot n'est **pas** d'abord architectural — c'est de
retirer Discord du chemin d'onboarding du tier de base (§5), ce qui supprime
précisément l'étape la plus lourde des deux facteurs (a) et (b) à la fois.
Mais ce levier a un prix d'entrée (chantier **L**, fallback in-app) qu'il
faut compter avant d'en tirer le bénéfice — ce n'est pas un raccourci
gratuit.

### Coût de chaque voie / levier

| Voie / levier | Coût pour construire | Coût marginal par onboarding une fois construit | Rapproche-t-elle de 10/mois ? |
|---|---|---|---|
| **A — multi-instance automatisé** | **S–M** : quelques jours à ~2 semaines de scripting (provisioning, templating env/règles, déploiement) — la majorité des briques techniques du §2 sont déjà scriptables ou proches | ~1h de temps actif fondateur (contre ~3h aujourd'hui) **+ latence externe incompressible** (§4) | Réduit le temps actif, ne lève pas le plafond externe à lui seul. Rapproche partiellement, ne suffit pas seule. |
| **B — multi-tenant** | **L** : ordre de grandeur **4 à 8 semaines équivalent temps plein** pour le cœur technique seul (re-namespacer le modèle de données, réécrire les règles Firestore, dispatcher l'auth Discord par tenant — items 1/2/7 de `Etude_Commercialisation_SaaS.md` §3) **+ le chantier de sécurité dédié à l'isolation** (§6, non chiffré séparément mais nécessaire avant mise en prod) **+** les entrants non-techniques déjà signalés par l'étude SaaS (facturation, support, self-service). Ordre de grandeur, pas un chiffrage détaillé — à affiner si la voie est engagée. | Quasi nul (un document de config) | Seule voie qui lève réellement le plafond externe **si** elle est accompagnée d'un onboarding self-service (sinon les mêmes dépendances externes — Discord, logo, invitation bot — subsistent, juste sans le provisioning d'infra derrière). |
| **C — pont (A maintenant, B si prouvé)** | Coût de A maintenant, coût de B différé et conditionné | Idem A à court terme | Ne prétend pas atteindre 10/mois ce mois-ci ; construit la capacité à en rediscuter avec des données réelles (2–3 onboardings vécus avec l'outillage A) avant d'engager le coût de B. |
| **Levier Discord opt-in (orthogonal à A/B/C, §5)** | **L** : chantier d'attribution des rôles in-app (item 8, étude SaaS) — prérequis avant que Discord puisse devenir optionnel proprement | Élimine les étapes 7 et 11 du tier de base : ~30–60 min de friction manuelle **et** toute la latence externe (guild ID, invitation bot) disparaissent de l'onboarding de base | Réduit fortement le goulot externe **quelle que soit la voie A/B/C** — mais seulement une fois le chantier L construit ; ne réduit rien avant. |

**Pendant les 4 à 8 semaines de la voie B, rien d'autre n'avance** — coût
d'opportunité réel pour un fondateur solo (KvK Race, E-007, etc. à l'arrêt),
à mettre en face du fait qu'il n'existe **aucun signal de demande confirmée**
sur un deuxième ou un dixième royaume à ce jour (KD 3341 encore en cours,
débrief à venir).

### Objection franche — « 10/mois » n'est probablement pas atteignable ce mois-ci, quelle que soit la voie

Même en poussant l'automatisation interne au maximum (voie A complète) et en
retirant Discord du chemin de base (§5, une fois son prérequis L construit),
il resterait une coordination avec **10 interlocuteurs externes différents**
(billing, logo, réactivité), chacun à son propre rythme de réponse — un
facteur que le fondateur solo ne pilote pas. La voie B, seule à supprimer
réellement la répétition, est un chantier de 4 à 8 semaines (tableau
ci-dessus) : elle ne peut pas être livrée **et** servir à onboarder 10
royaumes dans le même mois. Avec un seul cas réel d'onboarding à ce jour et
aucun signal de demande confirmée sur un deuxième ou un dixième royaume, ceci
reste avant tout un exercice de dimensionnement — pas un plan à exécuter tel
quel ce mois-ci.

### Recommandation

**Voie C pour l'architecture** : construire l'outillage voie A par petits
incréments dès maintenant (templating env/règles, provisioning infra,
prototype d'app Discord partagée pour le tier premium) — utile quel que soit
le volume final. **Ne pas engager la voie B** tant que le signal de demande
et de paiement n'est pas confirmé sur plusieurs royaumes distincts (même
garde-fou que `Etude_Commercialisation_SaaS.md` §8) — son coût (4–8 semaines
+ chantier de sécurité dédié, §6) est trop élevé pour être déclenché par un
test de faisabilité seul.

**En parallèle, évaluer le chantier fallback in-app (rôles) comme option
concurrente ou complémentaire à l'automatisation voie A** : son coût est du
même ordre de grandeur (**L**) que le début du chantier multi-tenant, mais
son bénéfice ne dépend ni du volume ni de la voie d'hébergement — il
simplifie l'onboarding dès le royaume suivant, Discord inclus ou non. Avec
les moyens d'un fondateur solo, ne pas construire les deux gros chantiers en
parallèle : l'ordre à choisir est probablement le fallback in-app d'abord,
puisqu'il retire justement l'étape la plus lourde du runbook (§2/§5) — la
voie A légère (scripts de provisioning/templating) peut avancer en tâche de
fond sans concurrencer ce chantier.

### Séquence proposée

1. **Terminer et débriefer le pilote KD 3341** (`Plan_Pilote_KvK.md`, Phase 5)
   — premier signal réel de valeur et de disposition à payer.
2. **Construire le fallback in-app (auth + attribution des rôles)** — chantier
   L déjà identifié par l'étude SaaS (item 8), prérequis pour que Discord
   devienne optionnel (§5).
3. **Une fois ce socle en place, considérer Discord comme module opt-in/
   premium à l'onboarding** — packaging/pricing renvoyés à
   `Etude_Commercialisation_SaaS.md`, hors périmètre de cette étude.
4. **En tâche de fond, construire l'outillage voie A par petits incréments**,
   priorité gain/effort : templating env + règles (déjà scriptées, à
   généraliser — S) → provisioning infra (M) → prototype d'app Discord
   partagée pour le tier premium (A-027, à valider avant de compter dessus
   dans un futur chiffrage).
5. **Mesurer réellement** le temps actif et le délai calendaire au prochain
   onboarding (A-030) — remplacer l'estimation du §2 par une donnée mesurée.
6. **Ne pas engager la voie B** avant un signal de demande + paiement
   confirmé sur au moins deux ou trois royaumes distincts — et, si ce signal
   arrive, chiffrer précisément l'effort (au-delà de l'ordre de grandeur
   donné ici) et budgéter le chantier de sécurité dédié à l'isolation (§6)
   dans le même geste, pas après coup.

---

## 8. Nouvelles hypothèses ouvertes

Ajoutées à `Assumptions_Log.md` dans la continuité de la numérotation (A-025 à
A-031) :

- **A-025** — ✅ **Tranchée par le Roi le 2026-07-28** — « 10 royaumes/mois »
  n'est pas un engagement daté avec un pipeline de prospects signés : c'est
  un **test de faisabilité**. Le Roi veut savoir si c'est atteignable et à
  quel coût avant de se prononcer sur un chiffre engagé. Oriente tout le
  document vers un verdict de faisabilité chiffré (§7) plutôt qu'une liste
  d'options en attente d'arbitrage.
- **A-026** — Les quotas Firebase/GCP (nombre de projets actifs par compte de
  facturation, limites de création de projets) supportent la création d'au
  moins une dizaine d'instances sans intervention manuelle de déblocage
  auprès de Google. Non vérifié, non mesuré.
- **A-027** — Une app Discord OAuth peut être mutualisée entre plusieurs
  royaumes moyennant un refactor de `discordAuth.js` (résolution dynamique de
  l'URI de redirection / du tenant), ce qui réduirait l'irréductibilité
  manuelle de l'étape 7 du runbook pour le **tier premium Discord** (§2/§4/
  §5 — moins urgent si le tier de base ne passe plus par Discord). Hypothèse
  technique non prototypée — à valider avant de la compter dans un effort.
- **A-028** — L'onboarding reste opéré par le fondateur (pas de self-service
  client) tant que le volume mensuel le permet ; le CLI/outillage de la voie
  A est un outil pour le fondateur, pas un flux ouvert au client. À rouvrir
  si le volume dépasse sa capacité de traitement (seuil de bascule vers le
  self-service, cohérent avec `Etude_Activation_Modules.md` §3).
- **A-029** — Les CGU de ProKingdoms tolèrent le scan de plusieurs royaumes
  tiers dans un contexte d'onboarding industrialisé et récurrent (et pas
  seulement l'amorçage ponctuel déjà discuté). Reprise et formalisation du
  « Point 2 — capacité ≠ permission » soulevé dans
  `Etude_Commercialisation_SaaS.md` §5bis, jamais logué formellement jusqu'ici.
  Enjeu élevé si le fondateur continue de fournir les scans à l'échelle (coupure
  possible) — à vérifier dans les CGU avant d'en dépendre pour l'industrialisation.
- **A-030** — Les temps du runbook baseline (§2) sont des estimations
  d'ordre de grandeur, non chronométrées sur le pilote réel
  (`Plan_Pilote_KvK.md` exclut explicitement le chiffrage). À instrumenter
  réellement lors du prochain onboarding pour remplacer l'estimation par une
  mesure.
- **A-031** — Rendre Discord optionnel/premium retire la principale friction
  d'onboarding (étapes 7 et 11 du runbook, §2/§5) **et** crée une frontière
  gratuit/payant naturelle (packaging/pricing renvoyés à
  `Etude_Commercialisation_SaaS.md`) — **conditionné à l'existence du
  fallback in-app** (auth + attribution des rôles, item 8 étude SaaS,
  chantier L). Non vérifié : aucun bénéfice d'onboarding tant que ce
  fallback n'est pas construit.

---

> **Complément opérationnel (2026-08-18)** : `docs/pm/Runbook_Onboarding_Royaume.md`
> capture désormais le processus vécu sur le pilote KD 3341 phase par phase,
> commandes exactes et pièges compris (dont le registre cross-tenant complet).
> Cette étude reste le cadrage stratégique (faut-il industrialiser, quelle
> voie, quel coût) ; le runbook répond à « comment fait-on aujourd'hui, pas à
> pas » — les deux se lisent ensemble.

## Sources
`Etude_Commercialisation_SaaS.md` (décisions du Roi 2026-07-24, §0, §3, §5bis,
§5ter, §8) · `Plan_Pilote_KvK.md` (runbook vécu KD 3341, Phases 0–5) ·
`Etude_Activation_Modules.md` (registre de modules F-023/E-006, seuil de
bascule build-time → runtime, §3) · `Sondage_Besoins_Rois.md` (pipeline de
prospects, Q21) · code : `functions/discordAuth.js`,
`scripts/deploy-rules-pilot.mjs`, `scripts/ingest-soc-scan.mjs`,
`src/config/branding.js`, `src/config/modules.js` (faits techniques fournis
comme établis, non ré-audités dans cette étude).
