# REX — Onboarding instance démo KD 2293 (Kingdom of Arcelia)

> Date : 2026-08-22/23 · Auteur : exécution ops (Claude Code) · Statut : **retour d'expérience**
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

## 5. ⭐ Découverte majeure — le fallback non-Discord existe DÉJÀ
La question récurrente « faut-il construire un fallback pour ne pas dépendre de Discord ? » est **résolue** : **le login Google est déjà câblé** (`AuthContext.loginWithGoogle`, bouton `App.jsx:158`). Et les **règles autorisent tout utilisateur authentifié (Google, sans rôle) à déclarer sa propre dispo et voir son /me** → **la console (War Tracker + objectifs) marche via Google, sans Discord**. Le **leadership** obtient son rôle par attribution (`roles/{uid}` posé via firebase-admin). → **Pour tout prospect dont on ne contrôle pas le Discord : Google login + pin de rôle. Rien à construire.** (Détail : activer le provider Google en console + mettre le « nom public du projet » à « Kingdom Manager » — le défaut `project-XXXX` s'affiche sur la pop-up OAuth.)

## 6. Recommandations pour l'industrialisation (voie C)
- **Scripter** en une commande d'onboarding : enable APIs → create named DB → **create rules release** → register web app → write `.env`/`firebase.<x>.json`/alias → ingest → (Discord-less) créer secrets dummy + activer Google + pin rôle.
- **Documenter le chemin Discord-less** (Google login + pin) comme le mode par défaut de prospection (on ne contrôle jamais le Discord d'un prospect avant la vente).
- **Refactor à envisager** : rendre les `defineSecret` Discord optionnels (ne pas bloquer un deploy d'instance sans Discord), et un **flag « auth mode » par instance** (discord | google).
- **Seed pour la démo, pipeline pour le client** : garder le seed local (rapide) pour prospecter, déployer le pipeline complet à la conversion.

## 7. Effort
Gros de l'onboarding = automatisable (scripts). Le temps humain irréductible : **actions console du Roi** (création projet + billing + clé SA + toggle Google) et le **scan** (fourni par le fondateur). Cohérent avec le plafond « temps fondateur » de `Etude_Commercialisation_SaaS.md`.
