# Spec — Rappels de milestones de campagne (calendrier .ics + pings Discord)

> Date : 2026-08-19 · Auteur : PM · Statut : **cadrage, prêt à construire (Phase 1 d'abord)**
> Rattaché à **E-008** (Calendrier de campagne KvK) — concrétise **F-031 V2/V3**, déjà
> annoncées mais non cadrées dans `Etude_Calendrier_KvK.md` §10 (`US-036` ping Discord,
> `US-037` export ICS). Introduit **F-037** comme le sous-produit qui matérialise ces deux
> volets (sélection de jalons → deux canaux de livraison), plutôt que de laisser F-031
> porter à la fois la frise (déjà livrée) et la livraison de rappels (nouveau périmètre,
> nouveau modèle de données, nouvelles BR). Voir §7 pour la justification du choix d'ID.
> **Correction d'un ancrage technique erroné du brief de cadrage** : la timeline vit dans
> **`kvk_config/timeline`** (document dédié, champ `events`), **pas** `kvk_config/current.timeline`
> — vérifié dans `CampaignTimelineEditor.jsx`, `CampaignTimelineBanner.jsx`,
> `MeLandingPage.jsx`. Le document `kvk_config/current` ne porte jamais la frise.

---

## 1. Problème et valeur

Rise of Kingdoms tourne en UTC avec des fenêtres brutales (Pass, Altar of Darkness,
Ziggurat…) : rater un jalon de quelques minutes coûte des points de score qui ne se
rattrapent pas. F-031 (livré 2026-08-10) affiche déjà la frise et le prochain jalon avec
compte à rebours — mais **uniquement si le joueur pense à ouvrir l'app**. Aucun mécanisme
ne vient le chercher. Les deux compléments déjà pressentis à la conception de F-031
(`Etude_Calendrier_KvK.md` §10, `US-036`/`US-037`) n'ont jamais été cadrés au-delà d'une
phrase.

**Valeur** : convertir une donnée déjà saisie par le Roi (la frise, un seul point de
saisie) en deux mécanismes de rappel qui ne demandent **aucune nouvelle saisie** — l'un
personnel et sans dépendance à Discord (aligne la position produit « Discord optionnel »,
`Etude_Commercialisation_SaaS.md` / mémoire `commercialisation-tiering`), l'autre à fort
levier pour le royaume entier.

---

## 2. Modèle mental retenu

**Une sélection de jalons → deux canaux de livraison indépendants**, à ne pas confondre :

| | Calendrier `.ics` | Pings Discord |
|---|---|---|
| Portée | **Personnelle** — chaque joueur choisit ses jalons | **Royaume** — le King configure ce qui part dans le salon commun |
| Qui écrit quoi | Rien n'est persisté (génération à la volée) | Config persistée (`kvk_config/reminders`), écriture serveur pour l'idempotence |
| Permission | Aucune nouvelle — hérite du gate de visibilité déjà posé par F-031 (§4.3) | King-only (config), pattern déjà établi (BR-020) |
| Dépendance Discord | **Aucune** | Totale (bot, salon, secret déjà en place) |
| Effort | **S** | **M** |
| Phase | **1** | **2** |

C'est la distinction que le mock d'exploration (« Desktop Prototype ») **ne fait pas** :
son panneau « Discord ping » y est présenté comme une action du joueur qui choisit lui-même
son salon (« #kvk-alerts / DM me / @here in #war-room », attribué à un utilisateur nommé
« Bochica#4417 ») — un ping **personnel**, pas un ping royaume. Un second fichier
d'exploration (« My Space - Exploration ») va plus loin et propose de réutiliser le canal
DM du bot existant, personnel par joueur. **Aucune des deux pistes n'est retenue ici** :
publier dans un salon partagé est une action à fort rayon d'action (elle touche tout le
serveur sans opt-in individuel) — c'est une décision de configuration, pas une action
warrior, au même titre que `RaceConfigForm.discord_channel_id` ne se choisit pas par
joueur. Les bells restent personnelles pour **le choix d'inclusion dans le `.ics` local
(Phase 1)** ; en Phase 2 c'est **un jeu de jalons choisi par le King** qui déclenche un
ping royaume, indépendamment de qui a coché quoi dans son propre `.ics`. Voir §6.1 pour le
sort de la piste DM personnelle (nommée, non retenue, pas explorée davantage).

---

## 3. Phase 1 — Export `.ics` personnel

### 3.1 Périmètre

- Nouveau composant (`src/components/me/MilestoneReminders.jsx`, convention F-032) composé
  dans `MeLandingPage`, à côté de `CampaignTimelineBanner` — **aucune nouvelle lecture
  Firestore** : `MeLandingPage` a déjà `timeline` en main (`kvk_config/timeline`, ligne 96).
- Une cloche par jalon **futur** (jalons passés = grisés, non sélectionnables, cf. mock —
  cohérent avec `CampaignTimelineBanner` qui calcule déjà `e.past`).
- Sélection **en mémoire uniquement** — aucune persistance (ni Firestore, ni
  `localStorage`). Rouvrir l'onglet réinitialise la sélection. Accepté : le coût d'un
  re-clic est nul face au coût d'un nouveau champ de données par utilisateur × campagne
  pour un geste ponctuel (télécharger un fichier).
- Bouton « Ajouter au calendrier » : génère un `.ics` client-side (`Blob` + lien de
  téléchargement, JS pur — pas de librairie), un `VEVENT` par jalon coché avec un
  `VALARM` au lead time choisi. Le générateur du mock (`icsStamp`/`exportIcs`,
  `KD Manager - Desktop Prototype.dc.html` lignes 859-887) est directement portable :
  remplacer le parsing texte `"14 Aug"` (artefact du mock, pas de vraies dates ISO) par
  `Date.parse(e.at)` puisque `kvk_config/timeline.events[].at` est déjà une date ISO UTC
  exacte — plus simple que l'original.
- Lead time : un sélecteur simple (15 min / 1 h / 3 h / 1 jour, repris du mock), appliqué
  à **tous** les jalons du fichier exporté (un `.ics` = un lead unique ; l'utilisateur qui
  veut deux leads différents exporte deux fois).

### 3.2 Ce qui n'est PAS dans le périmètre Phase 1

- **Pas de flux auto-actualisé (`webcal://`)**. Un `.ics` téléchargé est un **instantané** :
  si le Roi édite la frise après coup (`CampaignTimelineEditor`), le fichier déjà importé
  dans l'agenda du joueur devient périmé, silencieusement. Deux options existent :
  **(a) re-téléchargement manuel** — zéro coût, mais suppose que le joueur pense à le
  refaire ; **(b) `webcal://`** — un endpoint public régénérant le `.ics` à la demande de
  l'app calendrier (Google/Apple Calendar interrogent l'URL périodiquement, pas de
  téléchargement manuel). **Recommandation : (a) pour ce chantier**, (b) nommé comme
  **évolution différée**, pour deux raisons : effort net plus élevé (nouvel endpoint HTTP
  public, pas juste un bouton) et **tension avec le chantier sécurité en cours**
  (`docs/qa/Dette_Technique_2026-08.md` D-01, `A-045`/`A-047`/`A-048`) qui va dans le sens
  inverse — **fermer** les lectures anonymes de `static_data`/`kvk_history`. Un endpoint
  `webcal` public rouvrirait une surface non authentifiée, même si son contenu (libellés
  et dates de jalons, aucune donnée de joueur) est d'une sensibilité sans commune mesure
  avec `deadweight`. À réévaluer seulement si le re-téléchargement manuel s'avère un
  point de friction réel observé (pas supposé).

### 3.3 Permission — précision sur le brief de cadrage

Le brief demandait un export « sans permission ». C'est vrai en un sens plus étroit que
« accessible à tout le monde » : F-031 a déjà tranché (D1, `BR` implicite du composant)
que la frise n'est visible **qu'à partir de Warrior** — Guest ne voit pas
`CampaignTimelineBanner`. Comme `MilestoneReminders` se compose au même endroit et reçoit
la même prop `timeline`, il hérite **automatiquement** de ce même gate présentation
(pas de nouveau rôle à vérifier, pas de nouvelle règle Firestore — le document
`kvk_config/{document}` est déjà lisible par tout utilisateur **authentifié**, gating
UI seulement, même principe que BR-009/BR-011/BR-015). « Sans permission » se lit donc
correctement comme *« pas de permission additionnelle au-delà de ce que F-031 a déjà
posé »*, pas comme *« ouvert aux visiteurs anonymes »*. Voir BR-024 (§5).

---

## 4. Phase 2 — Pings Discord royaume

### 4.1 Périmètre

- Nouvelle config **King-only** (cohérent avec `KvKConfigForm`/`CampaignTimelineEditor`/
  `RaceConfigForm`, tous gated `isAuthorized([ROLES.KING])` — Admin hérite via BR-023) dans
  le rail `/admin`, section Calendrier : quels jalons sont ping-és (liste à cocher, réutilise
  les mêmes clés `event.key` que la timeline), salon Discord (`channelId`), lead time
  (un seul, global — voir question ouverte §6.2), interrupteur maître (`enabled`).
- Nouvelle Cloud Function planifiée (`onSchedule`, cadence proposée `*/5 * * * *` — un
  cron aux 5 minutes est nécessaire pour honorer un lead de 15 min sans dérive perceptible ;
  les leads plus longs — 1 h / 3 h / 1 jour — tolèrent cette granularité sans problème).
  À chaque exécution : lit `kvk_config/timeline` + `kvk_config/reminders` de **sa propre
  instance**, calcule les jalons dus (voir §5 pour la fenêtre de déclenchement et la
  dédup), poste un embed simple par jalon dû dans le salon configuré, marque le jalon
  comme posté.
- Réutilise tel quel : le secret `DISCORD_BOT_TOKEN` (`defineSecret`, déjà déployé sur les
  deux instances), le point d'API `POST /channels/{id}/messages`, le principe **jamais
  bloquant** (toute erreur Discord est journalisée et avalée, ne doit jamais faire échouer
  la Function planifiée) — copie directe du contrat de `postDuelSnapshot`
  (`functions/kvkRace/snapshot.js`).

### 4.2 Ce qui n'est PAS dans le périmètre Phase 2

- **Pas de mention `@rôle`** (ex. `@Warriors`) au lancement — post simple dans le salon
  configuré. Voir question ouverte §6.3 : une mention mal calibrée (mauvais rôle, rôle
  inexistant sur l'instance) spamme le serveur sans qu'aucun garde-fou applicatif ne le
  détecte avant le premier run réel. Défaut sûr : pas de mention, le King peut configurer
  le salon (`#war-alerts` par ex.) pour cibler l'audience sans mention.
- **Pas de lead différencié par catégorie de jalon** (`event`/`pass`/`major`, le champ
  `category` existe déjà sur `kvk_config/timeline.events`) — un seul lead global pour la
  V1 Phase 2. Voir question ouverte §6.2.
- **Pas de piste DM personnalisée** (mock « My Space - Exploration ») — nommée en §2,
  non retenue : reproduire un ping par joueur multiplierait les coûts d'API Discord
  (rate limits par DM) et casserait le modèle « config royaume unique » cohérent avec
  `RaceConfigForm`/le reste du pattern `postDuelSnapshot`. Resterait pertinente **si**
  un futur besoin de rappel individualisé (multi-compte, par exemple) émergeait — non
  demandé à ce jour.

---

## 5. Modèle de données

Nouveau document **`kvk_config/reminders`** (même collection que `current`/`timeline` —
hérite de la règle Firestore générique déjà en place, **aucune modification de
`firestore.rules` nécessaire** : `match /kvk_config/{document} { allow read: if
isAuthenticated(); allow write: if isKing(); }`).

```
kvk_config/reminders {
  enabled: boolean,                 // interrupteur maître, défaut false
  discordChannelId: string | null,  // salon cible, même convention que kvk_race.discord_channel_id
  leadMinutes: number,              // 15 | 60 | 180 | 1440 — lead unique, global (§6.2)
  milestoneKeys: string[],          // sous-ensemble de kvk_config/timeline.events[].key, choisi par le King
  campaignId: string | null,        // estampille la campagne courante (même logique que CampaignTimelineEditor)
  postedKeys: string[],             // dédup — écrit par la Function (Admin SDK, hors rules), jamais par le client
  updatedAt: string,                // ISO, écriture client (config)
  updatedBy: string,                // rôle, écriture client (config)
}
```

Pourquoi un document séparé plutôt qu'étendre `kvk_config/timeline` : `postedKeys` est
écrit par le **serveur** (Admin SDK, à chaque exécution planifiée) alors que `events` est
réécrit **intégralement, sans merge**, par `CampaignTimelineEditor` à chaque sauvegarde
King (`setDoc(..., { merge: true })` — merge vrai, donc en réalité pas de collision de
champs si co-localisé). Le document séparé est un choix de **lisibilité et de
responsabilité** (config de rappel ≠ contenu de frise), pas une contrainte technique dure —
à trancher en implémentation si un seul document s'avère plus simple à opérer.

**Reset de dédup entre campagnes** : `postedKeys` n'a de sens que pour la campagne dont
`campaignId` correspond au `campaignId` courant de `kvk_config/timeline`. Si les deux
divergent (nouvelle campagne démarrée, frise réécrite, `reminders` pas encore
retouché), la Function traite `postedKeys` comme vide et réinitialise `campaignId` au
premier passage — même logique de détection de décalage que `mismatch` dans
`CampaignTimelineEditor.jsx` (comparaison `storedCid` vs `current.id`).

**Fenêtre de déclenchement** : un jalon `e` est dû quand
`0 < e.ts - now <= leadMinutes * 60_000` et `e.key ∉ postedKeys` et
`e.key ∈ milestoneKeys` et `enabled === true` et `discordChannelId` non vide.

---

## 6. Questions ouvertes à arbitrer par le Roi

### 6.1 Fraîcheur du `.ics` — one-shot vs `webcal`

Recommandation PM : **one-shot** pour ce chantier (§3.2). `webcal` nommé comme évolution,
conditionné à un signal de friction réel — et à relire à la lumière du chantier de
fermeture des lectures publiques en cours (D-01), qui va dans le sens inverse.

### 6.2 Lead time — global vs par catégorie de jalon

Le champ `category` (`event`/`pass`/`major`) existe déjà sur chaque jalon. Un lead unique
(Phase 2 §4.2) est plus simple à livrer et à comprendre (« un ping N minutes avant chaque
jalon sélectionné ») mais ne distingue pas un `major` (Altar of Darkness — probablement
mérite un lead plus long, préparation lourde) d'un `event` mineur. Recommandation PM :
**lead global pour V1** (le King choisit *quels* jalons sont ping-és — il peut déjà exclure
les mineurs de `milestoneKeys` — plutôt que de complexifier le *quand*) ; lead par
catégorie serait une V2.1 si le global s'avère trop grossier à l'usage.

### 6.3 Mention `@rôle` vs post simple

Une mention `@Warriors` change la portée réelle du ping (notification push à tout le rôle
plutôt qu'un message visible seulement par les gens déjà dans le salon). Risque si mal
calibré : soit aucun rôle « Warriors » nommé ainsi sur le Discord de l'instance (échec
silencieux ou mention littérale cassée), soit un excès de bruit si le rôle mentionné est
trop large. Recommandation PM : **post simple sans mention pour V1** (§4.2) — le salon
choisi porte déjà l'intention de ciblage. Une mention configurable serait une extension
naturelle mais demande de résoudre l'ID du rôle Discord (pas juste son nom), un couplage
supplémentaire à `functions/discordAuth.js` non trivial à ce stade.

---

## 7. Pourquoi un F-xxx nouveau plutôt que prolonger F-031 sous le même ID

Le backlog porte déjà `US-036` (ping Discord) et `US-037` (export ICS) comme prolongements
« à l'étude » de F-031. Cette spec **concrétise ces deux US** — elles ne sont pas
renumérotées, seulement mises à jour de statut (§8). Le nouvel ID **F-037** sert à nommer
le **sous-produit** qui les porte : un modèle de données propre (`kvk_config/reminders`),
deux composants dédiés, ses propres BR (§ suivant), un effort et un séquencement distincts
de la frise elle-même (déjà livrée, stable). C'est le même geste que F-032 vis-à-vis de
F-006/F-014/F-025-027/F-031 : une matérialisation qui **compose** des briques existantes
sans les dupliquer, mais mérite sa propre entrée d'inventaire parce qu'elle a sa propre
trajectoire de livraison. F-031 reste la source de vérité de la frise ; F-037 est ce qui en
extrait de la valeur de rappel.

---

## 8. Règles métier (BR) proposées

**BR-024 — Portée `.ics` non gatée vs ping Discord gaté leadership (nouvelle règle,
F-037)**. L'export `.ics` personnel n'introduit **aucune nouvelle permission** : il hérite
du gate de visibilité déjà posé par F-031 (Warriors+, présentation uniquement — le document
`kvk_config/{document}` reste lisible par tout utilisateur authentifié au niveau Firestore,
comme BR-009/BR-011/BR-015). La configuration du ping Discord royaume
(`kvk_config/reminders`, salon/lead/jalons ping-és) est **King-only**, écriture serveur
(Admin SDK) pour le marqueur de dédup — jamais une action Warrior, cohérent avec BR-020
(configuration = King) et le pattern déjà établi par `RaceConfigForm.discord_channel_id`.
Les deux canaux ne partagent ni permission ni surface d'écriture : cocher une cloche
personnelle (Phase 1, en mémoire, aucune écriture) n'a aucun effet sur ce qui est ping-é
royaume (Phase 2, config King).

**BR-025 — Idempotence des pings de jalon, scopée à la campagne (nouvelle règle, F-037)**.
Un jalon donné (`event.key`) ne déclenche **jamais plus d'un ping** pour une même campagne :
le marqueur `kvk_config/reminders.postedKeys` (écrit exclusivement par la Function
planifiée, Admin SDK) empêche toute republication en cas de ré-exécution, de retry, ou de
chevauchement de fenêtres de cron. Le marqueur est **scopé par `campaignId`** — un
changement de campagne (nouvelle frise sauvegardée avec un `campaignId` différent) rend les
`postedKeys` existants obsolètes et repart d'un état vide, même logique de détection de
décalage que celle déjà utilisée par `CampaignTimelineEditor` pour la frise elle-même. Une
erreur d'envoi Discord (salon supprimé, token invalide, timeout) est journalisée et
**n'interrompt jamais** l'exécution planifiée ni la digestion d'aucune autre donnée —
même contrat que BR-014/`postDuelSnapshot`.

**BR-026 — Isolation par instance des fonctions planifiées (nouvelle règle, généralise une
leçon opérationnelle existante à toute future `onSchedule`)**. Toute nouvelle fonction
planifiée doit être **native à l'instance qui l'exécute** : elle lit exclusivement les
documents de configuration de **son propre** projet Firebase (jamais un ID de projet ou de
royaume codé en dur) et publie exclusivement dans le salon Discord configuré par **cette
même instance**. C'est différent du garde-fou de `runFullSync`
(`functions/index.js`, `PROJECT_ID !== "kd-97-manager"` → no-op) : ce garde-fou existe
*parce que* `runFullSync` a un couplage historique fort au royaume 2997 (Google Sheet,
kingdom ProKingdoms 2997) — un legacy à contourner. Une fonction de rappel de jalons n'a
pas ce couplage : elle est **sûre par construction** dès lors qu'elle ne lit/écrit que
`kvk_config/*` de son propre projet, sans qu'aucun garde explicite de type «
if PROJECT_ID ≠ X » soit nécessaire. Le risque opérationnel résiduel n'est pas dans le
code de la fonction mais dans son **déploiement** : `firebase deploy --only functions`
sans cible redéploie *toutes* les fonctions du projet, y compris celles d'autres chantiers
en cours sur la même instance. Règle : tout déploiement de cette fonction sur une instance
client se fait **cible** (`firebase deploy --only functions:checkMilestoneReminders`),
jamais en deploy large — leçon directe de l'incident cross-tenant du 2026-08-07
(mémoire `pilote-kd3341`, cron du pilote kd-41 ayant écrasé `static_data` avec du 2997).

---

## 9. Réutilisation

| Brique | Source | Usage ici |
|---|---|---|
| `kvk_config/timeline` (lecture) | `CampaignTimelineBanner.jsx`, `MeLandingPage.jsx` | Donnée source des deux phases — déjà chargée, aucun nouveau read |
| `CampaignTimelineEditor.jsx` (saisie King, détection de décalage de campagne) | F-031 | Modèle direct pour la détection de décalage de `kvk_config/reminders` (§5) |
| `postDuelSnapshot` / `buildDuelEmbed` (`functions/kvkRace/snapshot.js`) | E-005/F-020, US-021 | Contrat exact à reproduire : idempotence, jamais bloquant, silencieux sans config, secret partagé |
| `DISCORD_BOT_TOKEN` (`defineSecret`) | `functions/discordAuth.js`, `functions/kvkRace/digest.js` | Réutilisé tel quel, aucun nouveau secret |
| Générateur `.ics` (`icsStamp`/`exportIcs`) | `design_references/KD Manager - Desktop Prototype.dc.html` lignes 859-887 | Portable directement, simplifié (dates ISO réelles au lieu du parsing texte du mock) |
| Pattern King-only de config (`isAuthorized([ROLES.KING])`) | `KvKConfigForm.jsx`, `CampaignTimelineEditor.jsx`, `RaceConfigForm` | Réutilisé pour `MilestoneReminderConfig` (nouveau composant `/admin`) |
| Règle Firestore `kvk_config/{document}` | `firestore.rules` | **Zéro modification requise** — le nouveau document `reminders` hérite de la règle collection existante |

---

## 10. Risques et zones d'ombre

- **`.ics` périmé après édition de la frise** (§3.2) — accepté pour Phase 1, `webcal`
  différé.
- **Clé de jalon instable** : `CampaignTimelineEditor.save()` régénère une `key` par slug
  du libellé (`slug(label)`) si absente, avec suffixe aléatoire en cas de collision. Si le
  King renomme un jalon après que Phase 2 a déjà commencé à ping-er des jalons de la
  campagne, la nouvelle `key` ne matchera plus `milestoneKeys`/`postedKeys` — un jalon déjà
  configuré pour ping pourrait cesser de l'être silencieusement, ou (cas limite) un jalon
  déjà posté pourrait rester marqué non-posté sous sa nouvelle clé et repartir. Risque
  faible (le King édite la frise avant le lancement de la campagne, rarement en cours de
  campagne selon A-036 — non vérifiée), mais pas nul. Pas de garde applicatif proposé ici
  — à surveiller à l'usage, pas un blocage de construction.
- **Tension avec la fermeture des lectures publiques en cours** (D-01) — nommée §3.2 pour
  `webcal`, n'affecte pas le périmètre retenu (one-shot + ping) qui ne crée aucune nouvelle
  surface publique.
- **Positionnement commercial non tranché** : `FeatureInventory.md` note déjà (« Ajout
  proposé... F-031 ») que la tranche « Planification » (pings + ICS) serait Premium, avec
  un **prérequis bloquant mal calibré** — le fallback in-app n'est nécessaire que pour un
  futur royaume-client *sans* Discord ; 2997 et le pilote 41 en ont déjà un, donc rien ne
  bloque techniquement la construction ou le déploiement sur ces deux instances. Ce
  prérequis reste réel pour la **vente** du tier Premium à un royaume hypothétique sans
  Discord, pas pour ce chantier. Recommandation PM (nouvelle, résout D5 de l'étude
  Calendrier) : **`.ics` → GRATUIT** (renforce le positionnement « fonctionne sans Discord »,
  cohérent avec le reste du tier gratuit) ; **ping Discord → PREMIUM**, cohérent avec
  F-013 déjà Premium. À confirmer par le Roi, pas tranché par cette spec.

---

## 11. Effort et séquencement

| Phase | Effort | Contenu |
|---|---|---|
| **Phase 1 — `.ics` personnel** | **S** | Composant `MilestoneReminders.jsx` (cloches + génération `.ics` + lead time), composé dans `/me`. Zéro backend, zéro permission nouvelle, zéro règle Firestore à toucher. |
| **Phase 2 — pings Discord royaume** | **M** | `MilestoneReminderConfig` (`/admin`, King-only) + document `kvk_config/reminders` + Cloud Function planifiée `checkMilestoneReminders` (dédup, jamais bloquante, réutilise `DISCORD_BOT_TOKEN`). Déploiement **ciblé** (BR-026). |

Séquencement recommandé : Phase 1 d'abord (isolée, aucune dépendance, valeur immédiate,
zéro risque opérationnel), Phase 2 ensuite — cohérent avec la Roadmap actuelle qui place
déjà « F-031 V2 (pings Discord) » après les priorités court terme en cours (déploiement
`main`, fermeture des lectures publiques D-01, dette BUG-007). Rien dans ce chantier ne
dépend de ces priorités court terme — les deux peuvent avancer en parallèle si le Roi le
souhaite, Phase 1 en particulier n'a aucune dépendance technique sur quoi que ce soit
d'autre en cours.

---

## 12. IDs proposés et mises à jour documentaires à faire

**Nouveaux/à modifier — vérifiés non conflictuels contre `SSOT.md`, `FeatureInventory.md`,
`ProductBacklog.md`, `Assumptions_Log.md` (derniers IDs pris : F-036, US-047, BR-023,
A-055) :**

- **F-037** — Rappels de milestones de campagne (`.ics` + pings Discord), nouvelle entrée
  `FeatureInventory.md`, épic E-008, dépendances F-031/F-032.
- **US-036** — statut à mettre à jour (« à l'étude » → « spec, F-037 ») dans
  `ProductBacklog.md` — contenu inchangé (ping Discord avant fenêtre importante), reprécisé
  comme portée **royaume/King-config**, pas une préférence par joueur (correction du
  contresens possible du libellé actuel, qui ne précisait pas le porteur de la config).
- **US-037** — statut à mettre à jour (« à l'étude » → « spec, F-037 ») — contenu affiné :
  sélection **par jalon** (cloche), pas un export global non filtrable.
- **US-048** *(nouveau)* — « En tant que Roi, je veux configurer quels jalons déclenchent
  un ping Discord, dans quel salon et avec quel délai, afin de contrôler ce que le royaume
  reçoit sans redéploiement. » (E-008, F-037, Phase 2, `MilestoneReminderConfig`.)
- **BR-024, BR-025, BR-026** — nouvelles règles, `SSOT.md` §2 (texte complet §8 ci-dessus).
- **A-056** *(nouvelle hypothèse, si le Roi ne tranche pas immédiatement §6.1-6.3)* — à
  ouvrir dans `Assumptions_Log.md` seulement si les questions ouvertes restent sans
  arbitrage au moment de démarrer la construction ; sinon sans objet (les décisions
  deviennent des faits actés, pas des hypothèses).

**Fichiers à mettre à jour en même temps que la construction (pas avant, pour ne pas
documenter un chantier non commencé comme acquis) :**
- `docs/pm/FeatureInventory.md` — ajout F-037, note sur F-031 renvoyant vers cette spec.
- `docs/pm/ProductBacklog.md` — US-036/037 mis à jour, US-048 ajoutée sous E-008.
- `docs/pm/Roadmap.md` — remplacer la ligne « F-031 V2 (pings Discord) » du court terme
  point 6 par un renvoi explicite à F-037/cette spec.
- `docs/qa/SSOT.md` — F-037 (§1), BR-024/025/026 (§2), pas de nouvelle page P (composé
  dans P existantes : `/me` et `/admin`).
- `src/locales/*/translation.json` (10 langues) — nouvelles clés (`reminders.*` ou
  extension de `calendar.*`), Phase 1 et Phase 2.
