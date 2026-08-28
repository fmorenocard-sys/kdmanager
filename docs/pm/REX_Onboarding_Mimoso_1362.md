# REX — Onboarding client KD 1362 (Mimoso)

> Date : 2026-08-28 · Auteur : exécution ops (Claude Code) · Statut : **retour d'expérience**
> Projet Firebase `kd-1362-manager`, URL `https://kd-1362-manager.web.app`.
> **3ᵉ onboarding réel** après le pilote 3341 (2026-07/08) et la démo Arcelia 2293 (2026-08-22/23).
> Complète `Runbook_Onboarding_Royaume.md` et `REX_Onboarding_Arcelia_2293.md`.

## 1. Contexte

Client **complet** (pas une démo) : pipeline Race déployé, pas seulement seedé.
Mode d'authentification **Google-only** — le chemin Discord-less du REX 2293 §5
est désormais le mode par défaut, pas un contournement.

Scan fourni : un **SoC ProKingdoms de base** (`00_1739957_08_28_2026,…xlsx`,
10,9 Mo), export KvK complet — 32 royaumes, 4 camps, 6 219 gouverneurs, dont
**196 pour 1362** et **156 en `Full Data`** (roster `detailed`).

Décisions Roi : modules Banque et Trophées **off**, Deadweight **on** ;
identité « KD 1362 — Mimoso » ; logo générique conservé.

## 2. Ce qui a été monté

1. Projet Firebase créé **par CLI** (`firebase projects:create`) — seul le Blaze
   est resté un geste console.
2. Base `kdmanagerdb` en **nam5**, via l'API Firestore Admin (convention des
   instances clientes : 41 et 2293 sont en nam5 ; seul 2997 est en eur3).
3. 14 APIs activées via Service Usage (REST, sans `gcloud` — non installé).
4. Web app + `apps:sdkconfig` → `.env.mimoso` ; `firebase.mimoso.json` ; alias
   `mimoso` ; scripts `build:mimoso` / `dev:mimoso` / `deploy-rules:mimoso`.
5. Clé SA générée **par l'API IAM** (`serviceAccounts/…/keys`) — le runbook la
   donnait comme un geste console, elle ne l'est pas.
6. Règles déployées (release **créée**, voir §3.1).
7. Ingestion `--kvk-base --history` : 156 gouverneurs, `initialPower` figé
   (vérifié 156/156 contre le scan), 1 point d'historique.
8. Pipeline Race complet : bucket + CORS + 8 secrets placeholder + Functions +
   `signBlob` ; scan déposé dans le bucket, digéré par `digestRaceScan`.
9. `kvk_config/current` = « Heroic Anthem », 28/08 → 17/10/2026.

## 3. Frictions & correctifs

### 3.1 `deploy-rules.cjs` ne créait pas la release sur une instance neuve — CORRIGÉ

Le REX 2293 §4.1 avait identifié le problème (le script ne fait qu'**UPDATE**)
mais laissait le correctif à l'état de recommandation. Reproduit à l'identique
ici : `ℹ️ kdmanagerdb absent sur ce projet — ignoré` alors que la base existait,
puis `❌ Aucune base mise à jour`.

**Fait** : le script liste maintenant les bases réellement présentes (API
Firestore Admin) et **crée** la release quand le PATCH renvoie 404. Garde-fou :
la création n'est tentée que si la base existe, donc jamais une release
`(default)` sur un projet client qui n'a que la base nommée. Alias `arcelia` et
`mimoso` ajoutés au passage. Non-régression vérifiée en lecture seule : sur 97 /
41 / 2293 les releases existent déjà, le chemin UPDATE est inchangé.

### 3.2 ⚠️ Fuite de secrets cross-tenant dans le bundle Functions — plus large que documenté

Le runbook (Phase 1 étape 5, Annexe A) ne signalait que la clé **de 2997**.
En réalité `firebase deploy --only functions` embarque **tout** `functions/`,
qui contient aujourd'hui :

- `serviceAccountKey.json` et `service-account.json` (2997) ;
- `kd-41-manager.json` et `kd-2293-manager.json` — **les clés admin des deux
  autres clients** ;
- `all_users.json` — **PII réelles** d'utilisateurs.

Vérifié dans le code que rien de tout cela n'est nécessaire à une instance
cliente : `serviceAccountKey.json` n'est lu que sous `FUNCTIONS_EMULATOR`
(`functions/index.js:12`) et `service-account.json` uniquement dans
`runFullSync`, **après** le garde-fou qui sort sur tout projet ≠ 2997
(`functions/index.js:496` avant `:505`).

**Fait pour 1362** : bloc `ignore` dans `firebase.mimoso.json` excluant
`serviceAccountKey.json`, `service-account.json`, `kd-*-manager.json`,
`all_users*.json`, `output.json`.

**NON fait, exposition vivante** : `firebase.pilot.json` et
`firebase.arcelia.json` n'ont pas ce bloc → les clés au repos sont toujours sur
les instances de 3341 et d'Arcelia. Correctif = même bloc + redéploiement de
leurs Functions.

### 3.3 ⚠️ Les classeurs de 2997 sont servis publiquement par TOUTES les instances

Découverte de cet onboarding, absente du runbook. `public/data/` contient les
classeurs bruts de 2997 — `KD 97 Bank Ledger.xlsx`, `KD 97 Deadweight.xlsx`
(joueurs nommés), les scans SoC, `Top 300`, plus 120 avatars — soit 128
fichiers. Vite copie `public/` tel quel dans `dist/`, donc `firebase deploy
--only hosting` les publie.

Mesuré le 2026-08-28, sans authentification :

| URL | Résultat |
|---|---|
| `kd-97-manager.web.app/data/KD 97 Bank Ledger.xlsx` | 679 781 o, type xlsx |
| `kd-41-manager.web.app/data/KD 97 Deadweight.xlsx` | 138 114 o, type xlsx |
| `kd-2293-manager.web.app/data/KD 97 Bank Ledger.xlsx` | 679 781 o, type xlsx |

Rien ne les lit au runtime : les trois imports `data/` du code pointent
`src/data/` (bundlé), et `DataContext.jsx:39` documente que le repli
`public/data` a été supprimé. C'est du poids mort exposé.

**Fait pour 1362** : `"**/data/**"` dans `hosting.ignore` de
`firebase.mimoso.json`. Vérifié de bout en bout — le build régénère 128 fichiers
`dist/data/`, le déploiement en publie 163 et aucun n'est servi.

> **Piège de méthode, à retenir** : la forme `"data/**"` **ne matche pas**,
> `"**/data/**"` oui. Et surtout, **un code HTTP ne prouve rien ici** : la
> réécriture SPA `**` renvoie `index.html` en **200** pour n'importe quel
> chemin. La vérification qui tranche est le **type MIME et la taille**
> (`curl -w "%{content_type} %{size_download}"`), pas `%{http_code}`. J'ai
> conclu à tort à une non-régression sur ce seul critère avant de corriger.

**NON fait** : les trois autres instances. Correctif = même motif + redéploiement
de leur Hosting.

### 3.4 Le mapping camp ↔ campid était FAUX — la vérification du REX 2293 §12 a payé

Le Roi a donné ses camps dans l'ordre « Fire, Earth, Water, Wind ». Appliqué
naïvement aux campid 1→4, Mimoso aurait été étiqueté **Wind**.

Vérité terrain, obtenue en demandant **un royaume connu par camp** et en le
cherchant dans le scan :

| campid | Libellé réel | Royaume témoin |
|---|---|---|
| 1 | Fire | 3157 |
| 2 | Earth | 1707 |
| 3 | **Wind** | 1043 |
| 4 | **Water** ← Mimoso | 1362 |

**Water et Wind étaient intervertis** — exactement le même couple que sur
Arcelia. Ce n'est donc pas un accident isolé : à traiter comme la règle.
`our_camp = '4'` et `hero_duel = [4, 1]` (Water vs Fire) ont été posés sur la
vérité du scan.

> **Précision qui corrige le runbook** : les données dérivées stockent le
> **numéro** de camp (`camp: 4`), pas le libellé. Renommer un camp après coup
> n'impose **aucun** rejeu de scan. Seul un changement de `hero_duel` l'exige
> (le duel est agrégé à la digestion).

### 3.5 Premier déploiement Functions : échec attendu, puis succès au 2ᵉ essai

Conforme au REX 2293 §4.8c. Premier passage : `confirmDiscordLink` en 409
(« Could not create bucket gcf-v2-sources… ») et `digestRaceScan` en 400
(« Permission denied while using the Eventarc Service Agent »). Une seule
fonction créée sur dix.

Les service agents ayant été provisionnés **pendant** cet échec
(`eventarc.serviceAgent`, `pubsub.publisher` sur le SA GCS), la **relance sans
autre action** a tout déployé. Ne pas chercher à corriger l'IAM entre les deux :
il suffit de relancer.

### 3.6 `scheduledSync` : suppression bloquée en 409 par Cloud Scheduler

L'Annexe A impose de supprimer le cron juste après le déploiement. Ici,
`functions:delete scheduledSync` a échoué **quatre fois** en
`409 sync mutate calls cannot be queued` — le job venait d'être créé et portait
une opération en vol.

**Parade appliquée** : **mettre le job en pause d'abord**
(`cloudscheduler…/jobs/{job}:pause`), ce qui neutralise immédiatement le risque,
puis relancer la suppression en boucle. Passée à la 4ᵉ tentative (~2 min).
À intégrer au runbook : la pause est le geste qui protège, la suppression peut
attendre.

### 3.7 Provider Google : irréductiblement console

`identityPlatform:initializeAuth` s'appelle bien par API, mais activer
`google.com` échoue en `INVALID_CONFIG : client_id cannot be empty` — seule la
console provisionne le client OAuth. À ajouter à la liste courte des gestes
console incompressibles, avec le Blaze.

## 4. Ce qui a bien marché

- **Tout le reste de l'infra est passé en REST/CLI**, sans `gcloud` : création
  de projet, APIs, base nommée, web app, clé SA, bucket, CORS, IAM, secrets.
  La recommandation « scripter l'onboarding en une commande » du REX 2293 §6
  est à portée — il ne resterait que Blaze et le toggle Google.
- **`ingest-soc-scan.mjs`** : sans accroc, garde-fou cross-tenant compris.
- **`digestRaceScan` a aussi rafraîchi la Performance F-036** (`156/156`,
  `perfSource: scan`) — pas besoin de l'enrichissement local bricolé sur 2293.
- **Une seule campagne de course**, créée sous son id définitif
  (`heroic_anthem_2026`) avec les `derived/` dans le bucket : le cul-de-sac du
  seed (REX 2293 §4bis.11) est évité par construction.

## 5. Points à savoir sur un scan de base

- **Tous les compteurs de course sont à 0** (`net_*`, duel, écart) : un scan de
  base n'a rien à comparer. Structurellement correct, numériquement vide
  jusqu'au 2ᵉ scan. Ne pas conclure à une panne.
- **Les 156 joueurs sont notés « Dead Weight »** dans `static_data/kvk`, gains
  nuls obligent. **Non visible** : `revealGoalStatus: false` (BR-019) fait
  afficher « — » à la place du label. Laisser ce réglage à `false` sur une
  instance neuve n'est pas un détail, c'est ce qui évite d'annoncer à un Roi que
  tout son royaume est en Dead Weight le jour 1.
- **`kvk_history` est vide** (0 doc) : l'onglet Progressions n'affiche que la
  campagne en cours. À backfiller ou à assumer explicitement (REX 2293 §4bis.14).

## 6. Restes ouverts

| Sujet | État |
|---|---|
| Épinglage du rôle Admin (`roles/{uid}`) | En attente du premier login Google de l'opérateur |
| Fuite de secrets Functions sur 3341 et Arcelia (§3.2) | **Ouvert — exposition vivante** |
| Classeurs 2997 publics sur 2997, 3341, Arcelia (§3.3) | **Ouvert — exposition vivante** |
| Bouton Discord mort sur une instance Google-only | Ouvert — `App.jsx:148` affiche le bouton sans condition ; il mène à `/api/discordLogin`. Le « flag auth mode par instance » recommandé par le REX 2293 §6 n'existe toujours pas |
| Backfill `kvk_history` de Mimoso | À trancher avec le Roi |
