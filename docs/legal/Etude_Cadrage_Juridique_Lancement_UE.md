# Cadrage juridique — Lancement commercial du Kingdom Manager dans l'UE

> ⚠️ **PROJET — à faire valider par un juriste avant toute décision engageante ou
> publication.** Ce document n'est **pas** un avis juridique. Il est rédigé par un
> agent IA (rôle « responsable juridique & conformité » du projet), sans qualité
> d'avocat, à partir de la documentation du produit et de sources publiques
> (RGPD, CNIL, EDPB, Légifrance) citées en fin de document. Il **cadre** les
> sujets et **priorise les risques** ; il ne **tranche** aucune question de droit.
> Chaque affirmation qui engage (base légale, qualification responsable/
> sous-traitant, exposition d'une obligation) est signalée comme **à faire
> confirmer par un avocat**.

> Date : 2026-08-13 · Auteur : agent `legal` · Statut : **première étude de
> cadrage (pas encore d'action engagée)** · Demandeur : le Roi, en préparation du
> lancement commercial du Kingdom Manager (KD 2997 + pilote 3341 + futures
> instances) dans l'UE.

---

## 0. Lecture rapide — ce qu'il faut retenir en 3 minutes

1. **Le risque central n'est pas le paiement, c'est la donnée de tiers.** L'app
   ingère aujourd'hui les données de **tout un royaume** (pseudos, IDs de
   gouverneur, puissance, KP, morts, notes internes de type « raison de départ »)
   sans qu'aucun de ces joueurs n'ait consenti individuellement ni été informé.
   C'est le RGPD **art. 14** (données non collectées auprès de la personne) qui
   s'applique, pas le consentement classique — et il n'est **pas respecté
   aujourd'hui** (§2, §5).
2. **Découverte faite pendant cette étude, à traiter en priorité absolue** :
   plusieurs collections Firestore contenant ces données de tiers
   (`static_data/*`, `kvk_history`) sont **lisibles sans authentification**
   (`firestore.rules`, `allow read: if true`) — donc **exposées publiquement sur
   Internet**, y compris à des moteurs de recherche, sans qu'aucun joueur n'ait
   eu son mot à dire. C'est un fait déjà connu côté sécurité (audit `BUG-002`,
   noté « B-1 non traité ») mais **jamais qualifié sous l'angle RGPD** — c'est
   fait ici, voir §7 Risque R-1.
3. **La qualification juridique du Roi (royaume-client) et de l'éditeur n'est pas
   tranchée**, et elle conditionne tout le reste (qui rédige quoi, qui répond aux
   demandes de droits, qui est responsable en cas de manquement). L'hypothèse la
   plus prudente à date est une **coresponsabilité (art. 26)**, pas un simple
   sous-traitant qui exécute les instructions du Roi — parce que l'éditeur
   choisit lui-même des paramètres structurants (visibilité par défaut,
   rétention, hébergement). **À confirmer par un avocat**, voir §5.
4. **Rien ne bloque de continuer à développer en interne** (KD 2997, pilote 3341
   gratuit) ; ce qui est **bloquant, c'est l'ouverture commerciale** (premier
   euro facturé à un royaume tiers) sans un socle minimal de documents et de
   correctifs — liste priorisée en §9.
5. Le cadre commercial (prix 25-30 $/royaume, freemium, B→D) est **déjà décidé
   par le Roi** (`Etude_Commercialisation_SaaS.md` §8bis) — cette étude ne le
   rediscute pas, elle en tire les conséquences réglementaires (droit de la
   consommation, CGV, cf. §6).

---

## 1. Périmètre et méthode

Cette étude couvre le lancement du Kingdom Manager comme **SaaS commercialisé
dans l'UE**, sur la base de :
- l'architecture actuelle (`CLAUDE.md`, `docs/project_context.md`) : Firebase/
  Firestore (deux bases), Cloud Functions, Auth Google + Discord OAuth2, scans
  XLSX ingérés côté client ;
- les décisions produit et commerciales déjà rendues (`docs/pm/
  Etude_Commercialisation_SaaS.md`, `FeatureInventory.md` §Frontière
  commerciale, `Assumptions_Log.md` A-025 à A-033) ;
- les règles métier ayant une lecture RGPD (`docs/qa/SSOT.md` BR-008, BR-009,
  BR-011, BR-015, BR-020) ;
- une lecture du code (`functions/discordAuth.js`, `firestore.rules`, `src/
  config/data-mapping.js`) pour établir la liste réelle des données traitées,
  pas une liste supposée.

**Ce que cette étude ne fait pas** : elle ne rédige pas encore les documents
contractuels eux-mêmes (politique de confidentialité, CGU/CGV — objet d'une
prochaine itération, une fois le cadrage validé) ; elle ne chiffre pas la TVA/
OSS (nommé en §6, renvoyé à un expert-comptable) ; elle ne qualifie pas
juridiquement l'entité qui facturera (statut du Roi — auto-entrepreneur, société,
association — non connu de ce document, **question posée en §10**).

**Hypothèse de juridiction** : France comme droit de base (le Roi semble opérer
depuis la France, langue FR du projet), UE comme cadre (RGPD, droit de la
consommation harmonisé par la directive 2011/83/UE). Si une future instance
marque blanche vise un autre État membre ou un acheteur hors UE, le cadrage
devra être repris localement — **signalé, pas traité ici**.

---

## 2. Cartographie des traitements

Raisonnement par traitement (finalité, base légale, données, personnes,
rétention, destinataires, transferts), norme de fond de l'art. 30 RGPD (registre
des traitements — livrable de la §6).

### T1 — LE POINT SENSIBLE : ingestion de données de joueurs tiers via les scans

| Axe | Détail |
|---|---|
| **Finalité** | Piloter le royaume : classement/performance KvK, objectifs individuels, banque, deadweight, historique multi-saisons. |
| **Personnes concernées** | **Tout membre du royaume scanné** (jusqu'à ~300+ joueurs), qu'il utilise l'app ou non. Comprend des comptes secondaires (« fillers ») et, pour Deadweight, des joueurs explicitement catégorisés comme sous-performants ou en partance. |
| **Données réellement ingérées** (`src/config/data-mapping.js`) | ID de gouverneur, pseudo, puissance (initiale/finale/diff), kill points, morts (par tier T1/T4/T5), points ranged, ressources récoltées/assistance, alliance/tag, city hall, **localisation** (« kingdom »), et pour Deadweight : **raison** de sous-performance, **notes libres d'officier**, statut « prêt/pas prêt », don de ressources, **date d'émigration**, besoin d'un nouveau royaume. |
| **Source** | Scan tiers (ProKingdoms aujourd'hui — cf. `Etude_Commercialisation_SaaS.md` §4/§5bis), produit par **web-scraping/OCR d'un classement public in-game**, déposé dans l'app par le King/Officier (BR-020, King-only). Les joueurs scannés **n'ont pas consenti** à cette collecte ni à sa réutilisation dans l'app. |
| **Base légale envisageable** | **Pas le consentement** (aucun recueil individuel réaliste sur un royaume de centaines de joueurs). Piste à instruire : **intérêt légitime** (art. 6.1.f) du royaume/King — gérer une communauté de jeu que ces joueurs ont rejointe. Nécessite un **test en 3 temps** documenté (finalité légitime / nécessité / mise en balance avec les attentes raisonnables des joueurs) — voir méthodologie CNIL §11. **Non fait à ce jour.** À trancher avec un avocat : l'intérêt légitime tient-il pour les champs les plus intrusifs (notes Deadweight, historique multi-saisons indéfini) autant que pour le cœur (KP/puissance affichés en jeu) ? |
| **Information des personnes (art. 14)** | **Non satisfaite aujourd'hui.** L'art. 14 impose d'informer la personne **au plus tard 1 mois après collecte**, ou dès le premier contact — via une annonce royaume (Discord, MOTD in-app...) pointant vers une politique de confidentialité publique. C'est une priorité de contrôle CNIL 2026 (§11). **Aucun mécanisme de ce type n'existe dans le produit aujourd'hui** — action produit à cadrer avec le PM (voir note en fin de §2). |
| **Minimisation** | Douteuse sur les champs Deadweight `NOTES`/`REASON` (texte libre potentiellement intrusif) et sur la rétention multi-saisons **sans durée définie** (`kvk_history`, conservé indéfiniment — F-015). |
| **Droits des personnes** | Aucun mécanisme d'exercice des droits (accès/rectification/effacement/opposition) n'est documenté ni construit. Le caractère « snapshot re-scanné » complique l'effacement (une donnée supprimée revient au prochain scan sans liste d'exclusion) — **implication produit à cadrer**, pas seulement documentaire. |
| **Exposition** | **Lue sans authentification** pour `static_data/*` et `kvk_history` (`firestore.rules` ligne 51-62, `allow read: if true`) — accessible à quiconque a l'URL de l'API, y compris hors du royaume. C'est le risque R-1 du §7. |
| **Rétention** | Non définie formellement. `kvk_history` conservé sans limite (valeur produit assumée : historique communautaire) — à documenter et justifier, pas nécessairement à supprimer. |

**Angle mort explicite** : la donnée source vient d'un **scraping/OCR tiers**
(ProKingdoms) dont on ne connaît ni les garanties RGPD ni le statut légal en
Europe. Le fournisseur amont n'est vraisemblablement **pas un sous-traitant
RGPD** au sens strict (pas de contrat entre lui et l'éditeur ou le royaume) — sa
propre conformité échappe totalement au contrôle du Kingdom Manager, et pourtant
sa donnée nourrit tout le produit. C'est distinct de l'angle commercial déjà
tracé (A-029, CGU de revente) — ici la question est **la licéité de la donnée
en amont**, pas le droit de la revendre. **À signaler explicitement à l'avocat**,
un point sur lequel l'éditeur n'a aucune maîtrise contractuelle.

### T2 — Comptes utilisateurs (SSO Discord / Google)

| Axe | Détail |
|---|---|
| **Finalité** | Authentifier l'utilisateur, attribuer un rôle (RBAC), personnaliser l'expérience. |
| **Personnes** | Toute personne créant un compte sur l'app (King, Officiers, Warriors, Invités connectés). |
| **Données** (`functions/discordAuth.js`) | Via Discord OAuth (`scope: identify`) : ID Discord, pseudo/`global_name`, avatar (URL CDN Discord) → écrit dans `user_profiles` et Firebase Auth. Via rôle : appartenance au serveur Discord + rôle mappé (King/Officer/Warrior/Guest), lu via **le bot** sur l'API Discord (`GET /guilds/{id}/members/{discordId}`) — **par utilisateur qui se connecte**, pas de pull massif observé dans le code actuel. Via Google : email, nom, photo (SDK Firebase Auth standard). |
| **Base légale** | **Exécution du contrat** (art. 6.1.b) — fournir le service demandé par l'utilisateur qui crée un compte. Solide, peu de doute. |
| **Destinataires/sous-traitance** | Firebase/Google Cloud (infra), Discord Inc. (fournisseur d'identité tiers — Discord est **responsable de traitement indépendant** pour ce qu'il fait de ses propres données, pas un sous-traitant du Kingdom Manager). |
| **Transferts hors UE** | Voir §8 (Firebase/Google), Discord Inc. étant une société US soumise à ses propres conditions. |
| **Point à vérifier** | Le cache anti-rejeu OAuth (`_discord_oauth_cache`, tokens temporaires) et les liens de compte (`_discord_link_tokens`) stockent des identifiants/tokens — durée de vie courte à documenter (purge ?), pas d'élément dans le code lu indiquant un TTL Firestore automatique. **À vérifier techniquement.** |

### T3 — Déclarations de disponibilité de guerre (War Tracker / `/me`)

| Axe | Détail |
|---|---|
| **Finalité** | Coordination des guerres/KvK du royaume. |
| **Personnes** | Utilisateurs connectés qui déclarent leur disponibilité. |
| **Données** | Type/quantité de troupes, disponibilité, compte(s) associé(s) (F-025/026). |
| **Base légale** | **Auto-déclaratif** par la personne connectée sur son propre compte — le plus propre des traitements du produit : la personne fournit elle-même sa donnée, en connaissance de cause, avec un compte authentifié (verrouillé depuis le pivot du 2026-05-21, `ChangeLog_Strategique.md`). Assimilable à l'exécution du contrat/service demandé. |
| **Remarque** | Visible par le leadership et, selon les règles Firestore actuelles, par tout utilisateur **authentifié** (`allow read: if isAuthenticated()`) — pas public, contrairement à T1. Cohérent, pas de risque particulier identifié au-delà de la minimisation générale. |

### T4 — Rôles & permissions (RBAC + synchro Discord)

Sous-ensemble de T2. Donnée : mapping rôle applicatif ↔ rôle Discord, stocké
dans `roles/{uid}`. Base légale : exécution du contrat (contrôle d'accès
nécessaire au service). Pas de risque RGPD propre identifié, au-delà de la
lecture croisée avec BR-015/A-033 (rôle opérateur découplé du King, pertinent
pour la répartition des responsabilités en multi-tenant — cf. §5).

### T5 — Scoring / objectifs KvK, statuts Deadweight (profilage potentiel)

| Axe | Détail |
|---|---|
| **Finalité** | Calculer un statut de performance (Excellent / Good / Need Improvement / **Dead Weight**) à partir de la puissance et des KP d'un joueur (F-014, `kvkGoals.js`). |
| **Personnes** | Tous les joueurs déclarés/scannés (mains et fillers). |
| **Qualification** | Ceci **est une forme de profilage** au sens RGPD (évaluation d'aspects personnels — performance — à partir d'un traitement automatisé de données, art. 4.4). Ce n'est probablement **pas** une « décision individuelle automatisée » au sens strict de l'art. 22 (un humain — le King/Officer — décide ensuite quoi faire du statut, pas l'algorithme seul), mais c'est **à documenter**, pas à ignorer. |
| **Impact réel** | Le statut « Dead Weight » peut conditionner des décisions humaines réelles (exclusion du royaume, pression sociale) — un effet potentiellement significatif pour la personne, ce qui pèse dans le test de nécessité d'une DPIA (voir §5, critères EDPB). |
| **Garde-fou produit déjà en place** | **BR-019** : les pastilles de statut sont masquées pendant la campagne, révélées seulement par un interrupteur King-only — une mitigation UX, pas une mitigation RGPD, mais un signal que le Roi est déjà sensible au caractère « jugeant » de la donnée. À valoriser dans la documentation (transparence légitime, cf. §5). |

### T6 — Bot Discord (commandes, pings)

Extension de T2/T3 côté Discord (`/mystats`, `/mykvk`, pings « formulaires
manquants »). Même base légale que T2/T3 (exécution du service demandé par
l'utilisateur, via une interface Discord plutôt que web). Pas de risque
nouveau identifié, sous réserve que les logs de commandes (le cas échéant) ne
soient pas conservés indéfiniment sans raison — **à vérifier techniquement**.

### T7 — Facturation / paiement (premium, PAS ENCORE CONSTRUIT)

Aucune intégration de paiement trouvée dans le code (pas de Stripe/PayPal —
cohérent avec `Etude_Commercialisation_SaaS.md`, le pilote 3341 est gratuit et
« tester la disposition à payer » est le chemin critique commercial, pas encore
franchi). **Traitement futur, à cadrer avant le premier paiement encaissé** :
identité de facturation, moyen de paiement (données bancaires **jamais** stockées
en direct — passer par un PSP conforme PCI-DSS type Stripe), obligations
comptables. Base légale : exécution du contrat + obligation légale (facturation).
Voir §6/§9.

### T8 — Logs techniques & sécurité

Logs Cloud Functions (Firebase/GCP), cache anti-rejeu OAuth. Base légale :
intérêt légitime (sécurité du service, art. 6.1.f, cas d'usage classique et peu
disputé). Point de vigilance directement lié à l'historique du projet :
l'incident du 2026-07-11 (secrets committés, `users.json` avec de la vraie PII
utilisateur committée en clair — `CLAUDE.md` §Sécurité) montre que la
**gouvernance de la donnée en dev/CI** est un sujet réel, pas théorique, pour ce
projet. La branche `backup/pre-secret-scrub-20260711` contiendrait encore des
secrets selon la mémoire du projet — **à ne jamais pousser**, déjà une règle
connue, rappelée ici parce qu'elle a une lecture RGPD directe (art. 32, sécurité
du traitement ; notification de violation art. 33/34 si applicable — l'incident
2026-07-11 aurait mérité une **qualification formelle** : était-ce une violation
de données au sens RGPD nécessitant une analyse de notification ? **Point à
statuer avec un avocat, même rétroactivement.**

### T9 — Cookies / traceurs

**État actuel constaté dans le code** : aucun outil d'analytics tiers, publicité
ou tracking (Google Analytics, Sentry, Hotjar, Mixpanel…) trouvé dans `src/`.
Usage de `localStorage`/`sessionStorage` limité à des préférences (thème,
langue) et à la persistance de session Firebase Auth — **catégorie
« strictement nécessaire/fonctionnel »**, présumée **exemptée de consentement**
sous ePrivacy (mais **pas d'obligation d'information**, une politique cookies
courte reste due). **Ce constat doit être revérifié à chaque ajout** (un futur
PSP de paiement, un outil d'analytics pour mesurer la conversion freemium,
souvent envisagé en pratique commerciale, changerait ce statut et imposerait une
bannière de consentement CNIL-conforme).

---

## 3. Qui traite quoi — cartographie des rôles (à valider avec un avocat)

Trois relations distinctes, à ne pas confondre :

1. **Éditeur (le Roi/le projet) ↔ Google/Firebase.** L'éditeur est
   **responsable de traitement**, Google est **sous-traitant** (Firebase Data
   Processing and Security Terms, DPA standard Google Cloud). Relation la plus
   simple des trois — le DPA de Google existe déjà, il « suffit » de
   l'accepter/le documenter (§6).

2. **Éditeur ↔ royaume-client (King d'un royaume tiers payant).** C'est **la
   question ouverte la plus structurante**. Deux lectures possibles :
   - **Sous-traitance classique** : le royaume est responsable de traitement
     pour ses membres, l'éditeur n'est qu'un sous-traitant qui héberge et
     traite sur instruction (le royaume choisirait quoi ingérer, quand, avec
     quelle rétention). Nécessiterait un DPA royaume↔éditeur (art. 28).
   - **Coresponsabilité (art. 26)** : selon les lignes directrices EDPB
     07/2020, deux entités sont coresponsables dès qu'elles déterminent
     **conjointement** finalités et **moyens**. Or l'éditeur **détermine déjà
     seul** des moyens structurants — visibilité par défaut des données
     (`allow read: if true`), durée de rétention par défaut (illimitée pour
     `kvk_history`), quels champs sont ingérés (`data-mapping.js`, identique
     pour tous les royaumes), l'hébergeur. Le royaume ne « configure » quasiment
     rien de ces moyens aujourd'hui (à part le contenu du scan lui-même). Cette
     répartition penche plutôt vers la **coresponsabilité** que vers la
     sous-traitance pure — **hypothèse de travail prudente, pas une
     conclusion : à faire trancher par un avocat**, car la qualification change
     qui rédige le DPA, qui répond aux demandes de droits, et l'exposition en
     cas de manquement.
   - **Ce que cette qualification décide concrètement** : si coresponsabilité,
     un **accord de coresponsabilité (art. 26)** est requis en plus/au lieu du
     DPA classique, répartissant explicitement qui informe les joueurs, qui
     répond aux demandes d'accès/effacement, qui gère les violations. Ce n'est
     **pas un détail de paperasse** — c'est ce qui protège l'éditeur d'être seul
     exposé si un royaume-client ingère mal ses données ou ne les explique pas
     à ses joueurs.

3. **Royaume-client ↔ ses propres joueurs (tiers scannés).** Le royaume/King
   est a minima responsable (seul ou conjoint, cf. ci-dessus) vis-à-vis de ses
   joueurs. C'est **lui qui a la relation directe** avec les personnes
   concernées (son royaume) — mais l'éditeur ne peut pas se désintéresser de
   cette relation puisqu'il fournit l'outil et héberge la donnée qui en résulte.

**Recommandation de méthode (pas une décision)** : documenter le rôle par
défaut comme **coresponsabilité**, avec un contrat-type (à faire rédiger par
l'avocat) que chaque royaume-client accepte à l'onboarding, plutôt que d'assumer
silencieusement une sous-traitance qui ne correspond pas à la réalité technique.
C'est plus lourd à mettre en place mais plus défendable — **à trancher avant le
premier royaume-client payant**, pas après.

---

## 4. Zone hors périmètre légal strict mais nommée (protection des mineurs)

Les joueurs de Rise of Kingdoms ne sont pas tous majeurs, et **aucune
vérification d'âge** n'existe côté app (elle hérite implicitement de celle de
Discord — 13 ans minimum, politique Discord — et de Google). Pour les
**utilisateurs de l'app** (T2), le RGPD fixe la majorité numérique par défaut à
16 ans, **abaissée à 15 ans en France** (loi Informatique et Libertés art. 45).
Pour les **joueurs scannés tiers** (T1), il n'existe **aucun moyen de savoir**
si certains sont mineurs — un facteur aggravant dans l'appréciation du risque
d'un traitement à but commercial sur des données non consenties. **Point à
signaler à l'avocat, sans sur-pondérer** : ni le produit ni le marché RoK ne
ciblent des mineurs, mais l'app ne peut pas non plus démontrer leur absence.

---

## 5. DPIA — dépistage (à faire, pas encore fait)

Sur les 9 critères EDPB (WP248) de déclenchement d'une analyse d'impact,
au moins **3 critères plausibles** sont réunis rien qu'à la lecture du produit :
**évaluation/scoring** (T5, statuts de performance) ; **surveillance
systématique** (scans répétés à chaque campagne, historique multi-saisons) ;
**croisement/combinaison de données** (plusieurs sources de scan, plusieurs
campagnes, comptes principaux + fillers reliés). S'y ajoute un facteur
aggravant nommé en §4 (personnes potentiellement mineures, non vérifiable).
Cela **ne signifie pas automatiquement qu'une DPIA formelle est obligatoire**
(le seuil dépend aussi de l'échelle réelle — quelques centaines de joueurs par
royaume, pas des millions), mais **le dépistage lui-même n'a jamais été fait** —
c'est une action concrète, à faible coût, à réaliser avant l'ouverture
commerciale (§9), qui produira soit une DPIA formelle soit une justification
écrite de son absence (les deux sont défendables, l'absence de dépistage ne
l'est pas).

---

## 6. Documents réglementaires à produire

| Document | Fondement | Statut | Priorité |
|---|---|---|---|
| **Politique de confidentialité** (utilisateurs de l'app, art. 13) | RGPD art. 13 | À rédiger | 🔴 Bloquant |
| **Notice d'information des joueurs tiers scannés** (art. 14) — distincte de la précédente, publique, sans connexion requise | RGPD art. 14 | À rédiger + **mécanisme produit de diffusion à cadrer avec le PM** (annonce royaume, lien visible) | 🔴 Bloquant |
| **Mentions légales** (éditeur, hébergeur, contact) | LCEN (droit FR) | À rédiger — **bloqué tant que le statut juridique de facturation du Roi n'est pas fixé** (§10) | 🔴 Bloquant pour facturer |
| **CGU** | Droit des contrats + RGPD (droits d'accès etc.) | À rédiger | 🔴 Bloquant |
| **CGV** (offre premium) | Droit de la consommation UE (dir. 2011/83/UE), Code conso FR | À rédiger — **seulement quand la facturation est prête à s'ouvrir** | 🟠 Avant le 1er paiement |
| **Politique cookies/traceurs** | ePrivacy, recommandations CNIL | À rédiger (contenu léger vu §T9, à muscler si analytics/paiement ajoutent des traceurs) | 🟡 Avant l'ouverture publique |
| **Registre des traitements (art. 30)** | RGPD art. 30 | Amorcé par cette étude (§2), à formaliser en registre structuré | 🟠 Avant l'ouverture commerciale |
| **Dépistage DPIA** (+ DPIA formelle si le dépistage le confirme) | RGPD art. 35, WP248 EDPB | À faire (§5) | 🟠 Avant l'ouverture commerciale |
| **DPA royaume-client ↔ éditeur** (ou accord de coresponsabilité, §3) | RGPD art. 26 ou 28 selon qualification tranchée | À rédiger **après tranchage de la qualification** (§3) — avocat requis | 🔴 Bloquant pour un client tiers payant |
| **Confirmation DPA Google/Firebase** | RGPD art. 28 | Déjà proposé par Google (Cloud Data Processing Addendum) — à **accepter/documenter formellement**, pas à rédiger | 🟠 Avant l'ouverture commerciale |
| **Note de transferts hors UE** | RGPD chap. V | Voir §8 — dépend d'une vérification technique (région Firestore/Functions) | 🟠 Avant l'ouverture commerciale |

---

## 7. Risques majeurs — priorisés

| # | Risque | Gravité | Pourquoi | Action |
|---|---|---|---|---|
| **R-1** | **Données de joueurs tiers exposées publiquement sans authentification** (`static_data/*`, `kvk_history`, `firestore.rules` `allow read: if true`) | 🔴 **Bloquant** | Aucune base légale ne couvre une exposition **au monde entier**, y compris hors du royaume, y compris aux moteurs de recherche — même si l'intérêt légitime pouvait couvrir un usage interne au royaume. C'est le facteur qui aggrave le plus la position vis-à-vis des joueurs scannés. Déjà connu côté sécurité (`BUG-002`, « B-1 non traité ») mais **jamais requalifié RGPD avant cette étude**. | Décision produit à trancher avec le Roi/PM : authentification minimale requise pour lire ces collections, ou justification écrite explicite de l'exposition publique (peu défendable en l'état). |
| **R-2** | **Aucune information des joueurs tiers (art. 14) ni mécanisme de droits** | 🔴 **Bloquant** | Obligation légale non respectée aujourd'hui ; priorité de contrôle CNIL 2026 (§0). | Notice art. 14 (§6) + mécanisme minimal de contact/effacement à cadrer avec le PM. |
| **R-3** | **Qualification responsable/coresponsable/sous-traitant non tranchée** entre éditeur et futurs royaumes-clients | 🔴 **Bloquant pour vendre à un tiers** | Détermine qui répond légalement en cas de manquement d'un royaume-client ; sans DPA/accord, l'éditeur est en risque juridique direct dès le premier client payant. | Avocat, avant le premier contrat client (§3). |
| **R-4** | **Identité juridique de facturation du Roi non connue de ce document** | 🔴 **Bloquant pour facturer** | Sans statut clair (SIRET/société), pas de mentions légales valides, pas de facture conforme, exposition personnelle possible. | Le Roi doit clarifier (§10) — hors périmètre de cet agent. |
| **R-5** | **Dépendance à un fournisseur de scan (ProKingdoms) dont la licéité RGPD amont n'est pas vérifiée** | 🟠 À sécuriser rapidement | La donnée qui nourrit tout le produit vient d'un scraping tiers non maîtrisé contractuellement. Distinct de A-029 (droit de revente) — ici c'est la licéité de la collecte initiale. | Nommer le risque au commercial/avocat ; pas de solution produit à ce stade (le scan natif est écarté, décision déjà actée). |
| **R-6** | **Transferts hors UE non documentés** (région Firestore/Functions non vérifiée dans le code, DPF sous pression judiciaire — voir §8) | 🟠 À sécuriser rapidement | Sans savoir où les données vivent réellement, impossible de conclure sur les art. 44+ RGPD. Le fondement légal actuel des transferts UE→US (Data Privacy Framework) est **contesté devant la CJUE en 2026** (affaire pendante C-703/25 P, alertes noyb suite à une décision de la Cour suprême US du 29/06/2026 sur l'indépendance de la FTC) — un fondement qui a déjà été invalidé deux fois (Safe Harbor, Privacy Shield). | Vérifier la région des projets Firebase (console GCP) ; documenter la clause de transfert Google actuelle (SCC + DPF) ; **surveiller l'issue de C-703/25 P**, ne pas la considérer acquise. |
| **R-7** | **Aucun DPIA/dépistage réalisé** malgré des critères de déclenchement plausibles (§5) | 🟠 À sécuriser rapidement | Absence de dépistage documenté = pas défendable en cas de contrôle, même si la conclusion finale est « pas de DPIA formelle requise ». | Réaliser le dépistage (faible coût, §5). |
| **R-8** | **Champs Deadweight potentiellement intrusifs** (`NOTES`, `REASON`, `DATE_EMIGRATION`) sans minimisation ni durée de rétention définie | 🟠 À sécuriser rapidement | Notes libres d'officier = risque de contenu disproportionné (jugements de valeur, données non nécessaires à la finalité). | Revue de minimisation avec le PM ; définir une politique de rétention. |
| **R-9** | **Incident 2026-07-11 (PII committée en clair) jamais qualifié RGPD** | 🟡 À surveiller | Pas de trace d'une analyse formelle « était-ce une violation de données au sens art. 33/34 » — même rétroactivement, la documenter protège en cas de question future. | Qualification rétroactive avec l'avocat, faible urgence (déjà corrigé techniquement). |
| **R-10** | **Droit de rétractation numérique mal géré au checkout premium** (futur) | 🟡 À surveiller (pas encore construit) | Si l'app facture avant d'avoir capté le consentement exprès + la renonciation expresse du consommateur à son droit de rétractation (art. L221-28 Code conso), le client peut réclamer un remboursement sans justification. | À cadrer dans le tunnel de paiement, avant le lancement du premium (§6, §9). |
| **R-11** | **Mineurs potentiellement présents parmi les joueurs tiers scannés, sans moyen de le savoir** | 🟡 À surveiller | Facteur aggravant générique (§4), pas un risque autonome actionnable à ce stade. | Nommé, pas d'action produit proportionnée identifiée aujourd'hui. |

---

## 8. Transferts hors UE — ce qu'on sait, ce qu'il faut vérifier

**Ce qu'on sait** : Google propose un DPA standard (Cloud Data Processing
Addendum) couvrant Firebase, avec deux mécanismes de transfert alternatifs —
certification au **EU-US Data Privacy Framework** (adéquation Commission
européenne 2023) et, en secours, des **clauses contractuelles types (SCC)**.

**Ce qu'il faut vérifier techniquement** (pas fait dans cette étude, aucune
mention de région trouvée dans `firebase.json`/`.firebaserc`) : **dans quelle
région** vivent réellement `(default)` et `kdmanagerdb` (Firestore) et les Cloud
Functions des projets `kd-97-manager` / `kd-41-manager` — console Firebase/GCP,
pas le code. Si les données restent dans une région UE (`europe-west*`), la
question des transferts hors UE se pose surtout pour le **support/l'admin
Google** et l'authentification (Discord, systématiquement US), pas pour le
stockage lui-même — ce qui change la réponse. **À vérifier avant de rédiger la
clause de transfert de la politique de confidentialité.**

**Ce qui bouge et qu'il ne faut pas considérer acquis** : le Data Privacy
Framework est **le troisième mécanisme de ce type** après Safe Harbor (invalidé
2015) et Privacy Shield (invalidé 2020, « Schrems II »). Une décision de la
Cour suprême américaine du 29 juin 2026 sur l'indépendance des commissaires de
la FTC a ouvert une nouvelle contestation (noyb, lettre du 30/06/2026 ; recours
Latombe pendant devant la CJUE sous le numéro C-703/25 P). **Ne pas documenter
le DPF comme une garantie définitive** — prévoir une clause de révision et
suivre l'issue de cette procédure avant le lancement si le calendrier le permet.

---

## 9. Recommandation de séquencement

### Avant d'ouvrir commercialement (premier euro facturé à un royaume tiers) — bloquant

1. **Trancher la qualification éditeur/royaume-client** (§3) avec un avocat —
   conditionne le DPA/accord de coresponsabilité, donc le contrat client
   lui-même.
2. **Corriger ou justifier l'exposition publique non authentifiée** des
   données de tiers (R-1) — c'est le point le plus exposé si un joueur ou une
   autorité regarde le produit de près.
3. **Mettre en place la notice art. 14** + un mécanisme minimal de contact/
   droits pour les joueurs tiers (R-2) — document + décision produit (annonce
   royaume, lien accessible sans connexion).
4. **Régler le statut juridique de facturation du Roi** (R-4, §10) — sans ça,
   ni mentions légales ni CGV valides.
5. **Rédiger et publier** : politique de confidentialité, notice art. 14,
   mentions légales, CGU (§6).
6. **Faire le dépistage DPIA** (§5) — faible coût, protège en cas de contrôle.
7. **Vérifier la région d'hébergement réelle** et documenter les transferts
   (§8).

### Avant le premier paiement effectif (peut suivre l'ouverture du produit premium en test)

8. Tunnel de paiement conforme (info précontractuelle, gestion du droit de
   rétractation numérique — R-10) + CGV.
9. DPA/accord de coresponsabilité royaume-client signé à l'onboarding de chaque
   client payant (découle du point 1).
10. Politique cookies si un PSP ou un outil d'analytics de conversion est ajouté
    (§T9).

### Peut suivre, à surveiller sans bloquer le lancement

11. Qualification rétroactive de l'incident 2026-07-11 (R-9).
12. Suivi de l'issue C-703/25 P (DPF) — pas actionnable avant une décision de
    la CJUE, à revisiter périodiquement.
13. Revue fine de minimisation des champs Deadweight (R-8) — peut s'inscrire
    dans une itération produit normale plutôt qu'un chantier séparé.

---

## 10. Points à trancher avec un avocat — liste consolidée

1. **Qualification éditeur ↔ royaume-client** : sous-traitance simple (art. 28)
   ou coresponsabilité (art. 26) ? (§3) — **le plus structurant**.
2. **Base légale de l'ingestion de données de joueurs tiers** (T1) : l'intérêt
   légitime tient-il pour l'ensemble des champs ingérés (y compris Deadweight
   `NOTES`/`REASON`) et pour une rétention multi-saisons indéfinie, ou faut-il
   segmenter (base légale différente selon la sensibilité du champ) ?
3. **Le statut juridique de facturation du Roi** (auto-entrepreneur, société,
   association informelle ?) — conditionne mentions légales, CGV, TVA/OSS.
   *(Hors périmètre RGPD strict, mais bloquant pour tout le reste.)*
4. **L'incident 2026-07-11** constituait-il une violation de données au sens
   art. 33/34, nécessitant une notification (même tardive/rétroactive) ?
5. **La licéité de la donnée amont** (scan ProKingdoms, scraping/OCR d'un
   classement de jeu) — dans quelle mesure son caractère possiblement
   irrégulier expose l'éditeur qui la réutilise commercialement ?
6. **Le statut B2C/B2B du client type** (le Roi paie-t-il en tant que personne
   physique consommatrice, ou le royaume a-t-il une structure juridique
   propre ?) — conditionne l'application pleine du droit de la consommation.
7. **Faut-il désigner un DPO** ? Probablement non au stade actuel (pas de
   traitement à grande échelle au sens strict), mais le seuil se déplace avec
   la croissance multi-tenant — à réévaluer, pas juste à écarter une fois.
8. **La clause de transfert Google (DPF + SCC)** est-elle suffisante en l'état
   du contentieux en cours (§8), ou faut-il une clause de révision explicite
   dans la politique de confidentialité ?

---

## 11. Signalé au product-manager / commercial

- **PM** : un mécanisme d'information des joueurs tiers scannés (annonce
  royaume, lien public sans connexion vers une notice art. 14) est une
  **contrainte légale qui devient un chantier produit** — pas seulement un
  document. De même pour un futur mécanisme minimal de demande de droits
  (contact/effacement). L'exposition publique non authentifiée des données de
  tiers (R-1) est aussi un arbitrage produit, pas seulement juridique — à
  ouvrir en lien avec l'audit sécurité déjà existant (`BUG-002`, « B-1 »).
- **Commercial** : la vérification des CGU ProKingdoms (A-029, déjà signalée)
  reste d'actualité côté droit de revente — cette étude ajoute un angle
  distinct et plus lourd, la **licéité RGPD de la collecte amont** (§2 T1, §10
  point 5), à traiter ensemble avec l'avocat plutôt que comme deux sujets
  séparés.

---

## Sources consultées

- [RGPD — article 14 : informations à fournir lorsque les données n'ont pas été collectées auprès de la personne concernée](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence) — CNIL
- [CNIL — Conformité RGPD : information des personnes et transparence (priorités de contrôle 2026)](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence)
- [CNIL — L'intérêt légitime : comment fonder un traitement sur cette base légale](https://www.cnil.fr/fr/les-bases-legales/interet-legitime)
- [CNIL — Focus intérêt légitime : mesures à prendre en cas de collecte par moissonnage (web scraping)](https://www.cnil.fr/fr/focus-interet-legitime-collecte-par-moissonnage)
- [CNIL — Responsable du traitement, sous-traitants : comment bien identifier son rôle](https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role)
- [EDPB — Lignes directrices 07/2020 sur les notions de responsable du traitement et de sous-traitant (version FR)](https://www.edpb.europa.eu/system/files/2023-10/edpb_guidelines_202007_controllerprocessor_final_fr.pdf)
- [Légifrance — Article L221-28 du Code de la consommation (exceptions au droit de rétractation, contenu numérique)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563170)
- [Firebase — Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms)
- [Google Cloud — Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum)
- [Google Cloud — Alternative Transfer Solution (EU-US Data Privacy Framework)](https://cloud.google.com/terms/alternative-transfer-solution)
- Recherche web (2026-08-13) sur le statut contentieux du EU-US Data Privacy
  Framework à date de rédaction (affaire C-703/25 P pendante devant la CJUE,
  alerte noyb du 30/06/2026 consécutive à une décision de la Cour suprême
  américaine du 29/06/2026 sur l'indépendance de la FTC) — **à vérifier à
  nouveau avant publication**, situation évolutive.

*Sources internes* : `CLAUDE.md`, `docs/project_context.md`,
`docs/pm/Etude_Commercialisation_SaaS.md`, `docs/pm/FeatureInventory.md`,
`docs/pm/Assumptions_Log.md`, `docs/pm/Etude_Industrialisation_Onboarding.md`,
`docs/qa/SSOT.md`, `firestore.rules`, `functions/discordAuth.js`, `src/config/
data-mapping.js`.
