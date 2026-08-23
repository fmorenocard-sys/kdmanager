# ChangeLog Stratégique (KD 2997)

Ce fichier logue les évolutions majeures et décisions stratégiques modifiant le cap du produit.

## 2026-08-23 — Démo Arcelia 2293 : la friction d'onboarding s'est déplacée de l'infra vers la donnée
* **Constat** : le REX d'onboarding du 2293 documentait neuf frictions, toutes d'**infra** (release
  de règles sur base neuve, secrets dummy, Eventarc, signBlob, cache). En exploitant réellement la
  démo, cinq frictions supplémentaires sont apparues — toutes de **couche données/config**, donc
  **reproductibles à chaque prospect** puisqu'elles tiennent au produit et non au projet Firebase.
  Addendum `REX_Onboarding_Arcelia_2293.md` §4bis, reporté en Runbook (Phases 5, 6, 8) et backlog.
* **Le leak de marque blanche n'était pas refermé** (BUG-009, corrigé) : le correctif `VITE_KVK_TITLE`
  du 2026-08-22 n'avait traité que le titre ; les **dates** de campagne restaient codées sur le 2997 et
  auraient été gravées dans l'`kvk_history` du client à sa première clôture (archive create-only).
  **Règle retenue** : toute constante de `data-mapping.js` rendue à l'écran est un leak en puissance —
  la source de vérité par instance est Firestore (`kvk_config/current`), jamais le build.
* **Deux erreurs de config course sur deux onboardings** (pilote 3341 puis Arcelia) : le camp du
  royaume mal désigné, parce que la numérotation `campid` de l'export ne suit pas l'ordre de la carte
  du fournisseur (A-058). Requalifié **défaut produit**, pas inattention d'opérateur → **US-050**
  (contrôle config vs scan) plutôt qu'une ligne de plus dans une checklist manuelle.
* **Le seed de démo est un cul-de-sac s'il saute le bucket** : campagne fantôme + aucun `derived/`
  → recompute impossible, migration et suppression par script Admin SDK. Le principe « seed pour la
  démo, pipeline pour le client » (REX §6) tient toujours, mais le seed doit écrire **sous l'id de
  campagne définitif** et déposer ses dérivés.
* **La timeline vide est un angle mort commercial** : sur une instance neuve, l'onglet qui porte la
  promesse « mémoire du royaume » (E-004) est le plus pauvre de la démo. Backfill possible sans rien
  inventer (**US-052**), avec un garde-fou explicite : aucune saison fictive sur une instance cliente.

## 2026-08-13 (suite 2) — Arbitrage go-to-market : partenariat ProKingdoms écarté (pas maintenant)
* **Question du Roi** : proposer un partenariat au fondateur de ProKingdoms (audience/distribution
  établie de l'écosystème RoK) plutôt que continuer en solo à chercher des royaumes intéressés ?
  **Arbitrage conjoint `commercial` + `product-manager`, verdict : non, pas maintenant.** Détail :
  `Arbitrage_Partenariat_ProKingdoms.md`.
* **Raisonnement clé** : (1) « solo + royaumes intéressés » n'est pas une alternative à trancher —
  c'est **déjà** la décision 1 du Roi (freemium, pas de démarchage à froid), en cours d'exécution
  sur le pilote 3341 ; (2) un partenariat ajouterait de la distribution à un entonnoir de conversion
  **non prouvé** (A-032 non levée) — ça déplace le problème, ça ne le résout pas ; (3) ProKingdoms
  est déjà fournisseur *et* concurrent (`Etude_Commercialisation_SaaS.md` §4) — un partenariat
  formaliserait une double dépendance (donnée + canal) au même acteur, avec un rapport de force nul
  côté KD Manager (zéro royaume payant à ce jour) ; (4) risque de copie réel — notre wedge
  (« console qu'on opère vs observatoire qu'on regarde », `Etude_Differenciation_Visuelle.md`) est
  une couche produit, pas une techno protégée, et leur montrer qu'elle convertit leur donnerait le
  business case pour la construire eux-mêmes.
* **Convergence produit actée** : un co-branding ProKingdoms **diluerait le wedge de nature**
  (console vs observatoire) — toute relation future doit rester une **couche data/technique**
  (intégration BYO, API), **jamais une couche de marque**. Ligne rouge commerciale ET produit.
* **Nuance A-029 précisée** : la clarification des CGU ProKingdoms sur la fourniture de scans à
  l'échelle ne doit **pas** passer par l'ouverture d'un partenariat (risque de transformer une
  tolérance implicite en refus explicite, qui tuerait le modèle B d'amorçage « je scanne pour
  toi ») — uniquement par une lecture factuelle discrète des CGU publiques.
* **Séquencement retenu** : maintenant = terminer le test de paiement sur 3341 (A-032, chemin
  critique déjà acté), rien d'autre ; préalable à tout contact = A-032 levée positivement (2-3
  royaumes) + outillage d'onboarding minimal + blocages légaux RGPD en cours (A-044 à A-049) ;
  déclencheur = signal de demande/paiement confirmé, et alors une demande ciblée (intégration BYO),
  jamais un partenariat de marque large.
* Nouvelles hypothèses **A-050** (distribution ProKingdoms sans valeur nette avant A-032, tranchée)
  et **A-051** (ProKingdoms accepterait une relation technique sans marque — non vérifié) loguées
  dans `Assumptions_Log.md`. Renvoi ajouté depuis `Etude_Commercialisation_SaaS.md` §8bis.

## 2026-08-13 (suite 3) — F-036 : les 2 hypothèses bloquantes sont RÉSOLUES, gate levé
* **Vérification sur données réelles** : scan **006 (SoC 4) de 2997** comparé à `static_data/kvk` (feuille), 46/47 joueurs retrouvés, médiane des ratios par joueur.
* **A-052 (échelle des morts) RÉSOLUE** : `sheet.totalDead / scan.dead_diff = 1,0000` — `dead_diff` est en **têtes**, même échelle que la feuille (ex. Lord Guineapig : 3 262 800 feuille vs 3 262 802 scan, écart de bruit de timing). **Aucune conversion ×200.** Mapping figé : `totalDead ← dead_diff`.
* **A-055 (colonne KP) RÉSOLUE** : `sheet.totalKpGained / scan.kill_points_diff = 1,0000` — c'est **`kill_points_diff`** (feuille « Full Data ») qui nourrit `totalKpGained`. `points_difference` donne le même chiffre sur ce scan mais on retient la colonne nommée KP. Mapping figé : `totalKpGained ← kill_points_diff`.
* **Structure du scan précisée au parse** : 2 feuilles — **Basic Data** (tous les gouverneurs : identité, puissance, `points_difference`) et **Full Data** (sous-ensemble haut-tier : + morts/KP-diff détaillés). Plan de construction (§4 de la spec) finalisé sur cette base : filtre `kingdom`, LEFT JOIN Full sur Basic par `governor_id`, repli documenté pour les gouverneurs bas-tier (`totalDead` omis, `totalKpGained` sur `points_difference` de Basic — 1/47 sur l'échantillon vérifié).
* **A-053 (couverture Full Data) et A-054 (fillers, split T4/T5 absent)** restent **ouvertes**, mais **ne bloquent pas** ce périmètre — gérées par repli documenté (A-053) ou exclusion de périmètre déjà actée (A-054).
* **Gate retiré** : `Spec_Performance_KvK_Source_Scan.md` passe de « cadrage, effort/risque avant construction » à « prêt à construire ». Effort revu à M (la persistance de `Basic Data` dans le pipeline de course n'existe pas encore — §4.4 de la spec, note d'implémentation). Risque revu de « moyen-élevé » à « faible-à-moyen ».
* **Pas de commit** — fichiers laissés pour revue du Roi.

## 2026-08-13 (suite 2) — Cadrage : Performance KvK dérivée du scan ProKingdoms (F-036/US-047)
* **Nouvelle demande du Roi, décision de direction déjà prise** : le scan ProKingdoms qui alimente déjà la course (`kvk_race`, E-005) doit aussi alimenter `static_data/kvk` (onglet Performance), à la place de la feuille Google maintenue à la main — une seule source pour course **et** performance. Cadrage produit livré le jour même : `docs/pm/Spec_Performance_KvK_Source_Scan.md`, généralise **F-030/US-034** (`Spec_Ingestion_Progression_Unifiee.md`, 2026-08-08) qui ne couvrait que la progression du KP, pas l'ensemble du document.
* **Constat technique le plus notable** : aucun document Firestore actuel ne contient le détail complet de notre seul royaume avec les diffs nets par gouverneur — `players_top` (course) est tronqué au Top 200 **mondial** de la coalition, pas filtré par royaume. La donnée complète existe déjà en mémoire côté Cloud Function (`buildAll`) mais n'est jamais persistée — premier trou technique à combler, indépendant du reste.
* **Deux hypothèses bloquantes nommées** avant toute mise en prod : **A-052** (l'échelle des morts du scan — têtes brutes ou points pondérés — n'a jamais été comparée à la colonne Sheet, déjà résolue en points par A-005) et **A-055** (deux colonnes de diff distinctes dans le moteur de course, `kill_points_diff` vs `points_difference`, laquelle correspond au KP gagné n'est pas vérifié). Les deux se lèvent par comparaison manuelle sur 2997 (seule instance ayant les deux sources en parallèle), effort S, préalable non négociable.
* **Fillers explicitement descopés** (A-054) : le scan ProKingdoms n'expose pas le split T4/T5 des morts requis par la formule filler (BR-018) — une unification produirait un objectif faux plutôt qu'absent, pire que le statu quo.
* **Recommandation** : coexistence avec `syncKvk`/la feuille Google (pas de dépréciation), via le flag « source Performance » par instance déjà cadré pour F-030 (`sheet`/`scan`) — 2997 reste `sheet` par défaut (zéro risque), le pilote bascule `scan` (répare son manque actuel). Migrer 2997 est un chantier ultérieur séparé, conditionné à la levée d'A-052/A-055.
* **IDs créés** : F-036 (rattaché à E-005), US-047, A-052 à A-055 — numérotées après A-050/A-051, déjà pris le même jour par `Arbitrage_Partenariat_ProKingdoms.md` (chantier commercial concurrent).
* **Lien commercial signalé, non traité** : renforce le modèle « BYO scans → une source alimente tout » (`Etude_Commercialisation_SaaS.md` §4) — à chiffrer séparément par l'agent `commercial` si utile.
* **Pas de commit** — fichiers laissés pour revue du Roi.

## 2026-08-13 (suite) — Point produit : F-032/F-033 mergés, BR-022/BR-023 livrées, dette technique inventoriée
* **Merge — F-032 (Espace perso « Moi », 6 lots) et F-033 (« Voir en tant que ») dans `main`** (`--no-ff`), après une **revue de branche** qui a corrigé 2 constats avant fusion : lecture Firestore unique sur `/me` (l'ancienne double lecture recréait le bug BR-008 déjà corrigé ailleurs — BUG-006) et purge du miroir mort `public/locales` (6/10 langues, jamais chargé au runtime — le bundle i18n réel est `src/locales`). Chantier complet : socle `/me`, objectif perso, multi-compte, Mes stats web, scission du War Tracker en surface leadership, fusion nav « Pilotage ». Voir `FeatureInventory.md` F-032/F-033, `ProductBacklog.md` US-039→US-045.
* **BR-022 — gel des déclarations au démarrage de campagne (décidé et livré le jour même)** : dès `kvk_config/current.startDate` passée, plus aucune soumission/édition de disponibilité pour Warrior/Officer/Guest — seul le Roi/Admin garde l'écriture pour corriger. Double enforcement (UI `/me` + règles Firestore serveur), 34/34 tests `firestore-rules.test.mjs`. Révision du jour : le périmètre a été resserré de « tout le leadership » à **King-only** en cours de journée. Déployé sur le pilote 41, dont la campagne live (démarrée le 31/07) avait révélé le trou. Voir SSOT `BR-022`.
* **BR-023 — rôle Admin/opérateur, super-admin au-dessus du Roi (V1 livrée et ACTIVÉE sur le pilote 41)** : répond à A-033 (couche opérateur orthogonale aux rôles de jeu, demandée par le Roi le 2026-08-09). Attribution par env `ROLE_ADMIN_USER_IDS`, hérite de tous les pouvoirs Roi (niveau 5 dans une hiérarchie désormais `RoleContext` par niveau plutôt que par égalité stricte). L'opérateur du pilote 41 est passé Admin le jour même. V1 = équivalent Roi en pouvoirs, par instance — le split fin ops/jeu et un super-admin cross-tenant restent à concevoir. Voir SSOT `BR-023`/`R-005`, `FeatureInventory.md` F-034.
* **Outil de version** : footer affichant branche · commit court · date de build (résolu via `git rev-parse` au build dans `vite.config.js`), pour savoir quelle version tourne sur quelle instance sans consulter les logs de déploiement.
* **Inventaire priorisé de la dette technique (BUG-007)** livré en **exécutant réellement** ESLint/build sur le code mergé (pas seulement sur les notes) : `docs/qa/Dette_Technique_2026-08.md`, 11 items classés P0→P5. Constat le plus notable : `npm run lint` est **rouge** (masqué jusqu'ici) et `static_data/deadweight` est en lecture publique — le même fait que l'étude légale du matin qualifie de bloquant RGPD (voir entrée précédente du jour, A-045/A-047/A-048). Items backend/rules **parqués** tant que 2997 reste gelé.
* **État de déploiement à la clôture de session** : `main` (avec F-032/F-033) **n'est pas encore poussé sur le remote** ; le **pilote 41 est à jour** (front + rules + functions, terrain de validation) ; **2997 est volontairement non déployé** (période de déclarations en cours — décision de ne pas perturber un cycle actif). Le travail livré aujourd'hui n'est donc pas encore visible sur le royaume principal.
* **Arbitrages à soumettre au Roi** : ordonnancement des 6 priorités listées dans `Roadmap.md` (pousser `main` + déployer 2997 hors gel ; fermer la lecture publique des rules ; dérouler BUG-007 ; engager la rédaction des documents réglementaires ; raffiner le rôle Admin — split ops/jeu et cross-tenant ; reprendre F-031 V2/E-007) — et decision de prioriser BUG-008 (harnais de fixtures) dans cette liste ou après.

## 2026-08-13
* **Première étude de cadrage juridique — lancement UE (agent `legal`)** : à la demande du Roi, en vue du lancement commercial du Kingdom Manager dans l'UE, cartographie complète des traitements de données personnelles (accent sur le point sensible du projet — l'ingestion de données de joueurs tiers via les scans, sans consentement individuel), liste des documents réglementaires à produire (politique de confidentialité, notice art. 14, CGU/CGV, mentions légales, registre des traitements, DPA/accord de coresponsabilité), risques priorisés et séquencement recommandé avant/après l'ouverture commerciale. **Statut : cadrage seulement, aucun document contractuel encore rédigé, rien de tranché sans avocat.** Deux découvertes notables faites pendant l'étude, formalisées en A-044/A-045/A-046 : (1) la qualification éditeur/royaume-client penche vers une **coresponsabilité (art. 26)** plutôt qu'une sous-traitance simple, faute d'être tranchée par un avocat ; (2) des collections Firestore portant des données de joueurs tiers sont **lisibles sans authentification** — fait déjà connu côté sécurité (`BUG-002`, « B-1 non traité ») mais **jamais requalifié RGPD avant cette étude**, et documenté comme bloquant avant l'ouverture commerciale. Voir `docs/legal/Etude_Cadrage_Juridique_Lancement_UE.md`.

## 2026-08-10
* **Décisions — Calendrier KvK (E-008 / F-031)** : après avis convergents PM + commercial sur l'idée du Roi (timeline des événements du KvK **en cours**, distincte de F-022 « Timeline du Royaume » qui est rétrospective), le Roi tranche — **D1** visibilité **Warriors+** (inverse assumé de F-022/BR-011) ; **D2** saisie King = **formulaire pré-rempli** depuis la saison précédente ; **D3** périmètre MVP **confirmé** (frise + countdown + bascule UTC/local, sans pings ni ICS) ; **D4** **PRIORITAIRE, avant E-007** (override de la reco « après E-007 » — la fenêtre du KvK 3341 live jusqu'au 19/09 borne la valeur du timing). D5 (placement de l'ICS) différée avec le lot V3. Tiering proposé (Calendrier gratuit / Planification premium) **en attente de confirmation**, non actif dans la frontière figée. **Prochain chantier d'implémentation = MVP frise (US-035).** Voir `Etude_Calendrier_KvK.md`.

## 2026-08-08
* **DÉCISION PIVOT — Commercialisation : frontière gratuit/payant, packaging & prix (Roi)** : la décision qui « fait ou défait le modèle » (`Etude_Commercialisation_SaaS.md` §8) est **prise**. Le Roi a réparti les ~27 features en 3 tiers (**0 restée à débattre**), figés dans `FeatureInventory.md` §« Frontière commerciale ». **Principe = value-ladder** (basiques gratuits, profondeur/gestion/automation payantes), croisant volontairement le principe « coût » de l'étude : scan-dépendants _gratuits_ en hook (Dashboard, Performance, Objectifs), données internes gratuites _premium_ sur leur valeur analytique (Deadweight, Trophées, Banque). **Décision compagnon** : le gratuit est **plafonné sur les deux dimensions coûteuses** (fréquence de scans **et** rétention d'historique) — le gratuit donne _la vue_, le premium _la fréquence + profondeur + automation_. **Packaging** : 2 tiers (Découverte gratuit / Royaume premium) + couche service modèle B (setup + « je scanne pour toi ») pour l'amorçage, trajectoire B→D hybride. **Prix** : **25-30 $/mois par royaume** (unité = royaume, pas coalition), annuel −25 % — hypothèse de disposition à payer **non vérifiée** (A-032), à tester sur le pilote 3341 = **chemin critique du go-to-market**, avant tout engagement multi-tenant. Détail : `Etude_Commercialisation_SaaS.md` §8bis.

## 2026-07-21
* **GO E-005 — Fusion KvK Manager (décisions Roi §9.1 et §9.5)** : feu vert à l'absorption du KvK Manager Python dans l'app (module « KvK Race », page P-008) ; la **Phase 3 scouting est abandonnée** — le garde-fou A-012 a joué (usage personnel du Roi, on ne digitalise pas) : F-021 et US-022 sorties du périmètre. E-005 se recentre sur Phase 1 (ingestion scans + dashboard de course, fenêtre inter-saison en cours) puis Phase 2 (analytique/intégrité). *Complément (même jour)* : §9.3 et §9.4 rendues — **Phase 1 immédiate** pendant l'inter-saison (prioritaire sur US-008 et F-014, qui passent après) et **vue course réservée King/Officer** (modèle BR-011, la recommandation « publique » n'est pas retenue à ce stade). E-005 est intégralement arbitrée : l'exécution de la Phase 1 peut démarrer.

## 2026-07-20
* **Clôture de SoC 4 & décisions inter-saison (Roi)** : première clôture in-app d'une campagne (US-010) — elle a révélé que l'étape « marquer la campagne clôturée » (étude E-004 §5.4) n'avait pas été livrée : SoC 4 apparaissait en double (En cours + Archivée) et le War Tracker la croyait active. Arbitrages rendus : masquage automatique de la pseudo-campagne courante déjà archivée (l'archive fait foi — **BR-013**) ; statut `closed` écrit dans `kvk_config` à la clôture, gelant le formulaire de disponibilité jusqu'à la saison suivante ; **résultat SoC 4 = victoire sans étoile** ; fin officielle **25/07** confirmée (A-008 amendée). Le royaume est désormais formellement **en inter-saison** — fenêtre d'exécution idéale pour E-005 Phase 1 si le Go est donné.

## 2026-07-18 (suite)
* **Décisions & livraison — Timeline du Royaume (F-022 / US-023, Live)** : le Roi a arbitré les 4 décisions le jour même — D1 : onglet « Progression du Royaume » dans Performance KvK, **réservé King/Officer pour le moment** (BR-011, invalide A-014) ; D2 : résultat officiel par campagne, victoire **avec ou sans étoile** ou défaite, saisi par le Roi sur les archives (BR-012, champ `outcome`, règles Firestore amendées en update mono-champ) ; D3 : périmètre strictement KvK ; D4 : 🔴 priorité immédiate. Livrée et déployée le 2026-07-18. La valeur « engagement Warriors » de l'étude (§2) reste en réserve — réévaluer l'ouverture de l'onglet plus tard.

## 2026-07-18
* **Nouvelle idée produit — Timeline du Royaume (F-022 / US-023, proposée)** : sur idée du Roi, frise chronologique des campagnes KvK avec les performances agrégées du royaume (KP, morts, participants, % objectif, résultat officiel optionnel). Concrétise le « hors périmètre V2+ » de F-015 (statistiques agrégées royaume par campagne) en s'appuyant sur `kvk_history` déjà Live — effort faible, classée 🟢 Opportunité inter-saisons. Étude : `Etude_Timeline_Royaume.md` (4 décisions demandées : emplacement, résultat officiel, périmètre de la frise, priorité). Synergie identifiée avec F-020 (archivage du résumé de course E-005 à la clôture).

## 2026-07-14
* **Étude produit — Fusion KvK Manager (E-005, proposée)** : étude complète de la fusion du dashboard Python/Streamlit « KvK Manager » (suivi de compétition SoC 4 : 32 royaumes, DKP net multi-scans, duel East-Anglia vs Wessex, exclusions anti-triche) et des classeurs Excel de scouting dans le Kingdom Manager, sous forme d'un module « KvK Race » (page P-008). Recommandation : absorption dans la web app (ingestion Cloud Storage + Function, documents Firestore pré-agrégés), phasée en 3 temps (course → analytique/intégrité → scouting). Nouveaux IDs : E-005, F-018 → F-021, US-015 → US-022, A-009 → A-012. Étude : `Etude_Fusion_KvK_Manager.md` (5 décisions demandées en §9).
* **Décision — cadre DKP (Roi, 2026-07-14)** : il existe **deux DKP distincts qui ne doivent jamais être mélangés** — le **DKP interne 2997** (scans internes : Performance KvK F-002, objectifs F-014) et le **DKP de course/coalition** (KvK Race, formule convenue avec les alliés). Chacun est **paramétrable par campagne** (la formule de course peut évoluer d'un KvK à l'autre). Formalisé dans l'étude §5 et la règle métier proposée **BR-010** (configs étanches `kvk_config` vs `kvk_race/{campaignId}`, libellé explicite du domaine sur chaque affichage). Conséquence : A-005 (« Required DKP ») ne bloque plus que F-014, plus la course F-019.

## 2026-07-11
* **Nouvelle donnée live** : Ingestion de la campagne « SoC 4 : King of All Britain (2026) » directement depuis Google Sheets (47 mains + 23 fillers). Le pipeline `digest-data.js` télécharge désormais le classeur live — première brique de la dé-rigidification de F-008 (BUG-001).
* **Déploiement** : Release hosting du 2026-07-11 publiant l'ensemble des travaux de février (RTL/arabe, locale FR, cartes mobiles, footer) + titre SoC 4.
* **Décision stratégique — E-004 Historique des KvK** : sur demande du Roi, l'historisation multi-KvK est remontée du Long terme au Moyen terme comme nouveau focus. Arbitrages produit rendus : MVP = consultation + progression joueur ; migration SoC 1 (Tides of War), SoC 2 (Storm of Stratagems), SoC 3 (Heroic Anthem) ; clôture manuelle par le Roi. Étude complète : `Etude_Historique_KvK.md`. Nouvelle feature F-015, user stories US-010 → US-014, dette BUG-003 (mapping fillers de la function déployée) rattachée à cette epic.

## 2026-02-24
* **Évolution Stratégique** : Transition d'une architecture orientée GitHub Pages (statique) vers Firebase (Auth, Firestore, Hosting, etc.).
* **Nouveaux Ajouts** :
  * Moteur multilingue (i18n) pour accueillir une base de joueurs internationale (8 langues supportées).
  * Feature : Ajout de la gestion de campagnes multiples KvK avec capacité à visualiser les historiques (Dropdown "Campaign") et effacer la donnée obsolète ("Danger Zone").
  * Feature : Ajout du support pour les marches "Siege" complétant l'arsenal classique (Infanterie/Cavalerie/Archer), ainsi qu'une correction majeure UX sur l'ajout de composition de marches.
  * Feature : Module d'Auth complet + RBAC permettant aux Rois, Officiers et Warriors d'avoir des vues dédiées.
  * Stratégie : Étude de Faisabilité (Discovery) complétée pour l'intégration de Discord. L'Epic E-003 a été ajouté au product backlog (SSO Discord, Sync Rôles, Bots interactifs).
  * Feature (E-003 Phase 1) : Livraison complète du Single Sign-On (SSO) Discord via un backend custom Firebase Cloud Functions, incluant la récupération de l'avatar et du nom global du joueur.
* **Impact Stratégique** : Le produit n'est plus un simple dashboard de visualisation de données statiques mais devient un outil web communautaire et persistant. La friction d'authentification est drastiquement réduite grâce à Discord.

## 2026-02-25
* **Évolution Stratégique** : Pivot sur l'Epic E-003 (Discord Integration). La fonctionnalité de "Bot d'alerte global" est mise en pause au profit d'un développement ciblé sur :
  * Les Slash Commands in-server (`/mystats`, `/mykvk`) pour un accès friction-less à la donnée (US-007).
  * L'automatisation des "Pings" (Missing Forms) pour soulager la charge mentale des R4/R5 lors de la préparation des KvK (US-008).

## 2026-03-14
* **Résolution & Déploiement** : Lancement complet (Live) des bots Discord (US-007 / F-012). C'est un point d'étape majeur pour sortir l'application "du navigateur" et l'intégrer directement là où les joueurs interagissent.
  * *Correction Critique (Bugfix)* : Résolution d'un bug majeur lié au parsing Firestore pour les utilisateurs s'authentifiant exclusivement via le SSO Discord (sans attachement à un compte Google préalable). Le resolveur de profils gère désormais correctement la fallback `discordUid`.

## 2026-03-18
* **Nouveaux Ajouts** :
  * Étude PM finalisée pour l'implémentation du Calculateur d'Objectifs Individuels KvK (F-014). Les objectifs (KP, Deads, DKP) seront calculés de façon algorithmique (fonctions quadratiques) sur la base de la puissance du joueur, offrant une approche juste et automatisée pour remplacer les quotas fixés manuellement.

## [2026-05-21] Pivot Stratégique : Verrouillage de la Déclaration KvK
- **Décision :** La soumission anonyme (ouverte) pour la disponibilité KvK (War Tracker) a été abandonnée.
- **Raison :** Haut risque de fausses données / spam, détruisant la fiabilité du War Dashboard pour les officiers.
- **Action :** Implémentation d'une barrière d'authentification forcée (Discord/Google) sur le composant `AvailabilityForm`. Les utilisateurs invités voient désormais un message explicatif les invitant à se connecter.
