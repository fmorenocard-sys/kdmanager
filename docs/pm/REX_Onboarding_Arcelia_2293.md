# REX — Onboarding instance démo KD 2293 (Kingdom of Arcelia)

> Date : 2026-08-22/23 · Auteur : exécution ops (Claude Code) · Statut : **retour d'expérience**
> Addendum 2026-08-23 : §4bis (couche données & config, vécu en exploitant la démo) + §6 complété.
> Complète `Runbook_Onboarding_Royaume.md` (le vécu réel d'un 2ᵉ onboarding après le pilote 3341)
> et alimente `Etude_Industrialisation_Onboarding.md` (voie C).

## 1. Contexte
Prospect **premium** : gros royaume compétitif, **gros KvK en cours** (~466 gouv, coalition de 12 royaumes). Objectif : **démo avec ses vraies données live**. **Contrainte forte : aucun accès au Discord d'Arcelia, ni droits admin** → le SSO Discord (bâti sur l'appartenance au serveur du royaume + sync des rôles) est **inutilisable** pour eux. Projet Firebase `kd-2293-manager`, URL `kd-2293-manager.web.app`.

## 2. Ce qui a été monté (chronologie condensée)
1. Projet Firebase + Blaze + clé SA (**actions console du Roi** — billing/clé non automatisables).
2. Base Firestore **nommée `kdmanagerdb`** (nam5) créée explicitement.
3. APIs activées via Service Usage (firestore, hosting, firebaserules, puis functions : cloudfunctions/cloudbuild/artifactregistry/run/eventarc/pubsub/secretmanager/storage).
4. Web app enregistrée (`apps:create WEB` + `apps:sdkconfig`) → `.env.arcelia`.
5. Marque blanche : `.env.arcelia`, `firebase.arcelia.json`, alias `.firebaserc`, logo générique.
6. Règles Firestore déployées.
7. Ingestion : `ingest-soc-scan --kvk-base` (players + kvk + history) + enrichissement Performance F-036 (morts/KP/power-diff/objectif) + Deadweight (30 sous-perf) + Race seedée (moteur `buildAll` local sur 000+001).
8. Login Google + rôle Admin posé (`roles/{uid}`) → console débloquée **sans Discord**.
9. Pipeline Race live (bucket + CORS + secrets + functions) pour permettre l'upload via l'admin.

## 3. Ce qui a bien marché
- **`static_data` en lecture publique** → l'**observatoire** (dashboard, leaderboard, Performance, Deadweight) est démo-able **en invité, sans login** — 90 % de la valeur visible immédiatement.
- **`ingest-soc-scan.mjs`** a tout roulé (443 gouv, top 300 détaillé) — outil mûr.
- **Enrichissement F-036 en local** (colonnes brutes du scan) → Performance riche sans le pipeline.
- **Seed Race via `buildAll` local** → Race pleine (camps/duel/royaumes) **sans déployer de functions** — bon pour une démo rapide.

## 4. ⚠️ Frictions & correctifs (le cœur du REX)
1. **Piège release des règles sur base NEUVE** : `firebase deploy --only firestore:rules --config firebase.arcelia.json` dit « Deploy complete » mais **ne crée PAS** la release `cloud.firestore/kdmanagerdb` → l'invité prend `permission-denied` (base en règles fermées par défaut). `deploy-rules.cjs` ne fait qu'**UPDATE** des releases existantes (ne CRÉE pas). **Fix : créer ruleset + release via l'API firebaserules directement** (POST /rulesets puis POST /releases `cloud.firestore/kdmanagerdb`). → **RUNBOOK : pour une instance neuve, créer la release de règles explicitement.**
2. **Leak de marque blanche — nom de campagne** : `DATA_CONFIG.KVK.TITLE` codé en dur (« SoC 4: King of All Britain », = 2997) s'affichait en invité sur TOUTE instance. **Fix : `VITE_KVK_TITLE || défaut 2997`** (data-mapping.js). Idem logo : défaut générique `public/logo-default.svg` pour les clients (2997 garde son aigle).
3. **DÉPENDANCE DISCORD = le vrai blocage** (voir §5).
4. **Deploy functions exige TOUS les secrets Discord du codebase** (`DISCORD_CLIENT_ID`…), même en déployant un sous-ensemble (Race) et même si les fonctions Discord ne sont pas déployées — la découverte du backend valide tous les `defineSecret`. **Fix : créer des secrets dummy** (Secret Manager API) sur une instance sans Discord. → RUNBOOK : étape « secrets dummy » pour instance Discord-less (ou refactor pour rendre les secrets Discord optionnels).
5. **`requireLeadership` refusait le rôle Admin** (functions Race) — corrigé (commit `4249f0b`) : accepte King/Officer/Admin.
6. **Cache navigateur** : une correction déployée peut sembler non appliquée (ancien bundle) → vérifier avec cache-bust.
7. **Seed ≠ pipeline** : le seed Race direct ne permet pas l'**upload via l'admin** (`getRaceScanUploadUrl` absent) → « Upload failed ». Pour l'upload/auto-update, il faut le **pipeline complet** (bucket + CORS + secrets + functions).
8. **Deploy functions : chaîne de prérequis fastidieuse sur projet neuf** — (a) tous les `defineSecret` Discord doivent exister (secrets dummy) ; (b) `defineString('DISCORD_REDIRECT_URI')` à poser dans `functions/.env.<projet>` ; (c) **Eventarc** 1er usage → propagation du Service Agent (retry) ; (d) warning politique de nettoyage des artefacts → `--force`.
9. **⚠️ URLs signées — `iam.serviceAccounts.signBlob` denied** : `getRaceScanUploadUrl` échoue (auth OK, mais signature impossible) sur projet neuf car le **SA d'exécution** (`{PN}-compute@developer.gserviceaccount.com`) n'a pas le droit de signer. **Fix : lui accorder `roles/iam.serviceAccountTokenCreator` sur lui-même** (propagation ~1-2 min). C'était la cause finale du « Upload failed » persistant après le déploiement des functions.

## 4bis. Frictions de la couche DONNÉES & CONFIG (addendum 2026-08-23)

Le §4 couvre l'infra (règles, secrets, IAM, pipeline). Ces frictions-là sont
apparues **après** que tout fonctionnait techniquement, en exploitant la démo —
et ce sont celles qui se reproduiront à chaque prospect, car elles tiennent au
produit, pas au projet Firebase.

10. **Le leak de marque blanche n'était pas refermé** (complète §4.2). Le
    correctif `VITE_KVK_TITLE` n'a traité que le **titre** : `START_DATE` /
    `END_DATE` de `DATA_CONFIG.KVK` sont restés codés en dur sur la fenêtre du
    2997 (11/06 → 07/07) et s'affichaient sur la carte de campagne du 2293,
    dont le KvK réel court du 31/07 au 19/09 — alors que la bonne info était
    déjà dans `kvk_config/current`, saisie par le Roi. Seconde face du même
    bug : `CampaignArchiveControl` préremplissait titre **et** dates depuis ces
    mêmes constantes → la première clôture de campagne aurait gravé de
    l'historique faux dans `kvk_history` de l'instance cliente. **Fix
    (2026-08-23)** : `src/lib/currentCampaign.js` lit `kvk_config/current`
    (nom + dates, `Timestamp` → `YYYY-MM-DD`), repli sur les constantes ; hub
    KvK et formulaire d'archivage branchés dessus. **Leçon générale, à
    appliquer au-delà de ce cas** : *toute constante de `data-mapping.js`
    visible à l'écran est un leak 2997 en puissance ; la source de vérité par
    instance est Firestore, jamais le build.*

11. **Le seed a créé une campagne de course fantôme.** La Race a été seedée
    sous `demo_2293_kvk` (« KvK en cours ») pendant que le Roi créait sa vraie
    campagne `soc_tow_01_2026` (« Tides of War 2026 ») dans l'admin :
    **deux campagnes**, toutes les données dans la mauvaise, et l'autre vide.
    Aggravant : le seed écrit Firestore **sans passer par le bucket**, donc
    aucun fichier `derived/` — un recompute (changement de duel, de poids DKP,
    d'exclusion) n'aurait **rien** trouvé à rejouer. Il a fallu migrer les
    scans sous la vraie campagne, déposer les dérivés, puis supprimer la
    campagne de démo (`allow delete: if false` dans les règles → suppression
    par script Admin SDK obligatoire). **Leçon** : seeder **sous l'id de
    campagne que le client utilisera**, et toujours écrire les `derived/` dans
    le bucket — sinon le seed est un cul-de-sac qu'il faudra défaire.

12. **Le mapping camp ↔ numéro de camp n'est pas devinable** (généralise le
    piège `our_camp` du Runbook Phase 6). Le Roi a nommé les 4 camps dans
    l'ordre où il les voyait sur la carte ProKingdoms ; l'export les numérote
    autrement. Résultat : Fire et Earth corrects, **Wind et Water intervertis**
    → le rôle « nous » posé sur un camp quasi vide (0,4 Md de DKP net contre
    1 113 Md pour le vrai camp du royaume) et un duel héros inexploitable
    (écart affiché −1 112 Md). Ce n'est pas une erreur de saisie isolée : rien
    dans l'UI ne relie un libellé à son contenu réel. La vérification qui
    tranche en une ligne : **quel `campid` contient le royaume épinglé ?**
    (ici camp 3 → 2293, 3248, 3517 = le « Wind Camp » de la carte).
    Correction = libellés + rôles + `hero_duel`, puis **rejeu des scans**, car
    le duel est figé dans les agrégats au moment de la digestion — un
    changement de config seul ne le met pas à jour. → candidat produit
    **US-050**.

13. **L'horodatage du nom de fichier n'est pas l'heure de capture.** Les trois
    scans du 2293 ont été exportés le même soir : `000` porte 22h43 et `001`
    22h08, ce qui donne un scan de base « postérieur » à son suivant.
    Les **données**, elles, sont dans le bon ordre (`last_update` : 09/08 →
    11/08 → 22/08 ; 28 compteurs cumulatifs croissants, aucune inversion).
    Seul l'affichage est trompeur (`scan_ts` vient du nom de fichier) : les
    courbes sont tracées sur `scan_seq`, donc rien n'est déformé. À savoir
    avant de conclure à des données incohérentes devant un prospect. →
    candidat produit **US-051**, hypothèse **A-059**.

14. **Une instance neuve a une timeline de royaume vide.** `kvk_history` = 0
    doc → l'onglet Progressions n'affiche que la campagne en cours, ce qui
    donne une page qui a l'air cassée en démo alors que la valeur du produit
    (« mémoire du royaume », E-004) est précisément là. Le backfill est
    faisable **sans rien inventer** : un seul export de fin de saison suffit
    par campagne passée (`maxkill_points − minkill_points`, `maxdead − mindead`
    = le calcul de F-036), le précédent existe (`scripts/import-kvk-history.js`
    pour les 3 saisons de 2997). Limite connue : `goalPercent` suppose les
    objectifs de la saison en question — absent, il s'affiche « — » et la
    tuile « % objectif moyen » reste vide (jamais `0`). **Ne jamais fabriquer
    de fausses saisons sur une instance cliente** : un dirigeant qui reconnaît
    un historique qui n'a pas eu lieu perd confiance dans tout le reste. →
    candidat produit **US-052**.

## 5. ⭐ Découverte majeure — le fallback non-Discord existe DÉJÀ
La question récurrente « faut-il construire un fallback pour ne pas dépendre de Discord ? » est **résolue** : **le login Google est déjà câblé** (`AuthContext.loginWithGoogle`, bouton `App.jsx:158`). Et les **règles autorisent tout utilisateur authentifié (Google, sans rôle) à déclarer sa propre dispo et voir son /me** → **la console (War Tracker + objectifs) marche via Google, sans Discord**. Le **leadership** obtient son rôle par attribution (`roles/{uid}` posé via firebase-admin). → **Pour tout prospect dont on ne contrôle pas le Discord : Google login + pin de rôle. Rien à construire.** (Détail : activer le provider Google en console + mettre le « nom public du projet » à « Kingdom Manager » — le défaut `project-XXXX` s'affiche sur la pop-up OAuth.)

## 6. Recommandations pour l'industrialisation (voie C)
- **Scripter** en une commande d'onboarding : enable APIs → create named DB → **create rules release** → register web app → write `.env`/`firebase.<x>.json`/alias → ingest → (Discord-less) créer secrets dummy + activer Google + pin rôle. **Pour le pipeline Race** : create bucket + CORS → secrets dummy → deploy functions (`--force`) → **grant `roles/iam.serviceAccountTokenCreator` au SA compute (signBlob des URLs signées)** → (retry si Eventarc pas propagé).
- **Documenter le chemin Discord-less** (Google login + pin) comme le mode par défaut de prospection (on ne contrôle jamais le Discord d'un prospect avant la vente).
- **Refactor à envisager** : rendre les `defineSecret` Discord optionnels (ne pas bloquer un deploy d'instance sans Discord), et un **flag « auth mode » par instance** (discord | google).
- **Seed pour la démo, pipeline pour le client** : garder le seed local (rapide) pour prospecter, déployer le pipeline complet à la conversion. **Précision issue de §4bis.11** : même en mode seed, écrire sous l'**id de campagne définitif** et déposer les `derived/` dans le bucket — sinon la conversion impose une migration + suppression par script.
- **Recette « données » distincte de la recette « infra »** (§4bis) : après le go-live technique, vérifier l'identité de campagne (nom + dates depuis `kvk_config/current`, pas les constantes de build), l'unicité de la campagne de course, le camp du royaume **vérifié contre le scan** et non contre le libellé saisi, et l'état de la timeline (`kvk_history` vide = à backfiller ou à assumer). Reporté dans la checklist Phase 8 du Runbook.
- **Chasse au leak par requête, pas par mémoire** : un `grep` des constantes de `data-mapping.js` rendues à l'écran vaut mieux qu'une relecture — le leak du titre (§4.2) et celui des dates (§4bis.10) ont été trouvés à 10 jours d'écart sur le même fichier.

## 7. Effort
Gros de l'onboarding = automatisable (scripts). Le temps humain irréductible : **actions console du Roi** (création projet + billing + clé SA + toggle Google) et le **scan** (fourni par le fondateur). Cohérent avec le plafond « temps fondateur » de `Etude_Commercialisation_SaaS.md`.
