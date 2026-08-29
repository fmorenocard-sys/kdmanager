# REX — Onboarding client KD 1362 (Mimoso)

> Date : 2026-08-28/29 · Auteur : exécution ops (Claude Code) · Statut : **retour d'expérience**
> Addendum 2026-08-29 : §8 — le scan de base était tronqué (plafond d'export à 5 000 lignes) ;
> re-ingestion en `--roster all`, historique et Course repris. Les §1 et §2 décrivent
> l'onboarding du 28/08 tel qu'il s'est déroulé ; les chiffres définitifs sont au §8.
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
   (vérifié 156/156 contre le scan), 1 point d'historique. **Refait le 29/08 en
   `--roster all` → 207 gouverneurs**, le scan de base étant tronqué (§8).
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

**Étendu aux quatre instances le 2026-08-28** (SEC-002 dans `Issue_Backlog.md`).
Sur 2997 le bloc omet volontairement `service-account.json`, dont `runFullSync` a
besoin. Vérifié sur les **archives réellement déployées**
(`gcf-v2-sources-<numéro>-us-central1`), pas sur la config. Deux effets de bord
subis : le redéploiement a **recréé `scheduledSync` sur 3341 et Arcelia**
(Annexe A confirmée par les faits — pause puis suppression), et Arcelia a gagné
cinq fonctions Discord inertes, le déploiement d'une codebase étant tout-ou-rien.

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

**Fait le 2026-08-28 sur les quatre instances** (voir SEC-001 dans
`Issue_Backlog.md`).

> **⚠️ RÉGRESSION INTRODUITE PAR CE CORRECTIF, puis corrigée — la leçon la plus
> chère de la journée.** `public/data/` n'était pas *entièrement* du poids mort :
> ses **120 avatars JPG** sont le 3ᵉ échelon de la cascade d'`Avatar.jsx`
> (prop `src` → URL fraîche de `static_data/avatars` → **JPG legacy** → logo).
> Le premier audit avait conclu « rien ne lit `public/data` au runtime » à partir
> d'un `grep` sur les imports du code — or ces JPG ne sont pas importés, ils sont
> référencés par **URL** dans `src/data/player-avatars.json`. Exclure
> `**/data/**` du Hosting a donc cassé les avatars des 4 instances.
>
> Impact mesuré sur 2997 : `static_data/avatars` n'a que **2 entrées**, dont
> **aucune** ne recouvre les 120 du mapping legacy → **les 120 joueurs ont perdu
> leur avatar** au profit du logo du royaume. Dégradation propre (la cascade fait
> son travail), mais bien réelle et visible.
>
> **Correctif** : les avatars sont des assets applicatifs légitimes, ils n'ont
> rien à faire dans un dossier de dumps. Déplacés en `public/avatars/` (suivis
> par git), chemins de `src/data/player-avatars.json` réécrits `/data/avatars/`
> → `/avatars/`. Seuls les 8 classeurs/dumps quittent le dépôt.
>
> **Leçon générale** : chercher les consommateurs d'un dossier `public/` par
> `grep` sur les **imports** ne suffit pas — un asset servi est référencé par
> **chaîne d'URL**, souvent construite dynamiquement. Chercher aussi le nom du
> dossier dans les fichiers de données (`src/data/*.json`) et les templates.

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
| Épinglage du rôle Admin (`roles/{uid}`) | **Fait le 2026-08-28.** Après le premier login Google de l'opérateur, `roles/{uid}` posé à `role: 'Admin'` par Admin SDK (`source: onboarding-1362-google-only`). Aucun Discord impliqué — le chemin du REX 2293 §5 fonctionne tel quel, il n'y a rien à construire. `RoleContext` écoute en `onSnapshot`, la bascule est immédiate sans rechargement |
| Fuite de secrets Functions sur 3341 et Arcelia (§3.2) | **Ouvert — exposition vivante** |
| Classeurs 2997 publics sur 2997, 3341, Arcelia (§3.3) | **Ouvert — exposition vivante** |
| Points d'entrée Discord morts sur une instance Google-only | **FAIT le 2026-08-28** — voir §7 |
| Backfill `kvk_history` de Mimoso | À trancher avec le Roi |

## 7. Suite — le « flag auth mode par instance » (livré le 2026-08-28)

Le REX 2293 §6 le recommandait sans le faire ; l'onboarding de Mimoso l'a rendu
nécessaire. Mesure du problème **avant** correctif, par sonde de
`/api/discordLogin` sur les quatre instances :

| Instance | Réponse | Ce que vivait l'utilisateur |
|---|---|---|
| 2997 | 302 → Discord, `client_id=1475892267…` | ✅ fonctionnel |
| 3341 | 302 → Discord, `client_id=1531298126…` | ✅ fonctionnel |
| Arcelia 2293 | 302 → Discord **sans `client_id`** | ❌ quittait le site pour une page d'erreur Discord |
| Mimoso 1362 | 200, repli SPA | ❌ bouton mort, la page se rechargeait |

Arcelia était donc **pire** que Mimoso : l'échec sortait l'utilisateur du produit.

**Livré** : `src/config/auth.js` — `AUTH.discordEnabled`, piloté par
`VITE_AUTH_DISCORD`, **activé par défaut** (même convention que `modules.js` :
2997 et 3341 n'ont rien à changer, vérifié en comparant les bundles). Trois
surfaces gâtées :

1. le bouton de connexion Discord (`App.jsx`) ;
2. le bloc « Lier mon compte Discord » de `/profile` — il visait
   `/api/discordLogin?action=link`, le même endpoint mort ;
3. **les copies**, souvent oubliées : `common.restricted_desc`,
   `war.auth_required_desc` et `deadweight.restricted_hint` disaient toutes
   « Connectez-vous via Discord pour synchroniser votre rôle » — une consigne
   **impossible à suivre** sur une instance Google-only. Chacune a désormais un
   jumeau `_no_discord` au phrasé neutre (« Connectez-vous, puis demandez à un
   officier de vous attribuer le rôle »), traduit dans les **10 locales**, choisi
   par le helper `authCopyKey()`.

**Effet de bord heureux** : `VITE_AUTH_DISCORD` étant inliné au build, Rollup
**élimine la branche morte** — « Login with Discord » n'apparaît pas du tout dans
les bundles de 1362 et 2293 (vérifié par `grep` sur le bundle), et reste présent
dans celui du pilote. Ce n'est pas un simple masquage CSS.

**Non traité** : les champs « snapshot Discord » de la config de Course
(`RaceConfigForm`, King-only) restent visibles sur une instance sans Discord. Ils
ne mènent nulle part de dangereux — ils enregistrent une config inerte — mais
mériteraient le même traitement.

## 8. Le scan de base était TRONQUÉ — et le second n'était pas meilleur partout

Signalé par le Roi le 2026-08-29 : le premier scan était incomplet. Diagnostic et
correction le jour même.

### 8.1 La cause : un plafond d'export à 5 000 lignes

`Full Data` du scan `00_1739957_08_28…` faisait **exactement 5 000 lignes**
(rangs 1→5000) pour 6 219 en `Basic Data`. Un compte aussi rond est la signature
d'un plafond d'export, pas d'un hasard.

Conséquence sur Mimoso : **40 de ses 196 gouverneurs** tombaient au-delà de la
coupe, dont un compte à **128,1 M** — soit le n°2 du royaume. `1,49 Md` de
puissance manquaient. Le rang de l'export n'étant pas basé sur la puissance, de
gros comptes peu actifs se faisaient couper.

> **À vérifier systématiquement à la réception d'un scan** : `Full Data` fait-il
> un compte rond (5 000, 10 000) ? Comparer `Basic Data` et `Full Data`, et
> surtout **compter les gouverneurs du royaume cible présents dans chacun**.

### 8.2 Le second scan corrigeait le plafond mais dégradait la couverture

`00_739957_08_29…` : plafond levé (`Full Data` = 7 679, `Basic` = 11 663). Mais
pour 1362 :

| | Scan tronqué (28/08) | Scan corrigé (29/08) |
|---|---|---|
| Gouverneurs connus (`Basic`) | 196 | **207** |
| Avec stats de combat (`Full`) | **156** | 150 |
| Puissance du royaume couverte | **79,1 %** | 67,8 % |

**36 joueurs du roster disparaissaient du nouveau `Full Data`, dont Ӽelix, le n°1
du royaume** (154,8 M). Les deux scans avaient des trous **complémentaires** :
`mystic rider` (128,4 M, 12,2 Md de KP), absent du premier, était présent dans le
second.

> **Leçon** : un scan « corrigé » n'est pas monotone. `Full Data` est un
> sous-ensemble dont la composition varie d'un export à l'autre — il faut
> **comparer les deux captures**, pas supposer que la plus récente domine.

### 8.3 Arbitrage : `--roster all` plutôt que `detailed`

Décision du Roi. `--roster detailed`, l'option du pilote et du premier
onboarding, aurait produit un roster de 145 joueurs **sans le n°1 ni le n°10** du
royaume. Inacceptable pour un tableau de bord de royaume.

`--roster all` retenu : **207 gouverneurs**, dont 145 avec morts/kills et **62
sans** (champ absent, pas zéro — Firestore ignore `undefined`). Ces 62 pèsent
**2,31 Md, soit 32 % de la puissance du royaume**.

**Conséquences assumées, à connaître :**
- l'UI affiche « 0 » pour un champ absent → 62 joueurs paraissent n'avoir aucune
  mort, dont le n°1 ;
- le total des morts du royaume est **sous-estimé** (1,0 Md affiché ; les 57 M de
  Ӽelix n'y sont pas) ;
- **aucun faux signalement en Deadweight** : `static_data/deadweight` n'existe pas
  sur cette instance, la page n'a pas de source ;
- `revealGoalStatus: false` masque toujours les notes de performance.

Un futur scan à meilleure couverture `Full Data` corrigera le tout par simple
ré-ingestion.

### 8.4 Ce qu'il a fallu refaire, et un piège d'historique

1. `static_data/players` + `static_data/kvk` réécrits (`--roster all --kvk-base`).
   **Re-figer l'ancre était légitime ici** — le runbook l'interdit quand des
   objectifs ont déjà été communiqués ; aucun joueur ne s'était connecté
   (`roles` ne contenait que le compte Admin de l'opérateur).
2. **`static_data/history` : le piège.** L'ingestion ajoute un point daté du jour.
   On se retrouvait donc avec le point faux du 28/08 (5,64 Md) **et** le bon du
   29/08 (7,18 Md) — la courbe du Dashboard aurait affiché **+1,5 Md de croissance
   en une nuit**, pur artefact de la troncature. Le point du 28/08 a été supprimé :
   une instance neuve doit avoir **un seul** point, celui de sa base.
3. **Course** : ancien fichier supprimé du bucket, nouveau déposé sous le **même
   `seq 000`** pour écraser `derived/gov_values_000.json` (1,76 Mo → 2,73 Mo).
   Un `01_` aurait créé un second scan en laissant la base tronquée en place.
4. La Course reste à **zéro** : le moteur mesure des écarts *nets par rapport au
   scan de base*, et il n'y a qu'un scan, qui est la base. Les diffs non nuls du
   `Summary` sont internes au scan (min/max depuis le début du KvK) — ce n'est
   pas ce que la Course calcule. Normal, pas une panne.
