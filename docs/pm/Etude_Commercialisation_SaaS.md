# Étude préliminaire — Commercialisation du Kingdom Manager en SaaS

> Date : 2026-07-24 · Auteur : PM · Statut : **exploratoire (go/no-go)**
> Question posée par le Roi : peut-on packager et vendre le Kingdom Manager à
> d'autres rois ? Quels sont les entrants nécessaires, quel prix, et peut-on
> ingérer des scans d'autres fournisseurs que ProKingdoms (RokStats, HeroScroll…) ?

> **Nature du document** : première passe de cadrage, pas un business plan. Elle
> sert à décider s'il vaut la peine d'aller plus loin, et à lister ce qu'il
> faudrait savoir avant de s'engager. Plusieurs chiffres marché sont des
> estimations tierces ou manquants — signalés comme tels, à confirmer en
> recherche primaire.

---

## 0. Décisions du Roi — 2026-07-24

Arbitrages rendus après la première version de l'étude ; ils orientent les
sections qui suivent.

1. **Go-to-market = freemium, pas de démarchage à froid en premier.** Contacter
   des rois spontanément ne convertira pas — ils ne s'y jetteront pas. On mène
   plutôt par la **valeur gratuite** : un socle gratuit utile, et on fait payer
   l'accès aux fonctionnalités avancées. En parallèle, **implémentation gratuite
   pour le royaume d'un ami**, pour faire remonter tous les problèmes de données.
2. **Dépendance aux fournisseurs de scans = assumée.** Pas de scan natif : pas le
   temps, et à la limite de la légalité. On reste sur ProKingdoms / tiers.
3. **Discord = pas obligatoire.** Certains royaumes n'en ont pas. Il faut un
   **fallback in-app** pour tout ce qui passe aujourd'hui par les commandes Discord.
4. **Rôles = configurables après connexion Discord.** Les rôles sont définis dans
   Discord, donc on ne maîtrise pas finement qui accède à quoi. Une fois le Discord
   connecté, on récupère ses rôles et **le Roi mappe lui-même chaque rôle à un
   niveau d'accès** dans l'app.

> Ces décisions sont reprises et développées dans les §3, §4 et §8. Deux d'entre
> elles appellent une nuance PM, signalée à l'endroit concerné (le pilote gratuit
> ne teste pas la disposition à payer ; le fallback sans-Discord est un chantier
> plus large qu'il n'y paraît).

---

## 1. La question, reformulée

Transformer un outil **construit pour un royaume** (Unitas 2997) en un **produit
vendable à N royaumes** soulève trois questions distinctes qu'il ne faut pas
confondre :

1. **Faisabilité technique** — que faut-il découpler pour qu'un deuxième royaume
   puisse l'utiliser sans casser le premier ? (les « entrants »)
2. **Positionnement & prix** — sur un marché déjà peuplé, qu'est-ce qui nous
   différencie, et combien un Roi est-il prêt à payer ?
3. **Dépendance à la donnée** — nos chiffres viennent de scans produits par des
   tiers. Bâtir un business dessus, est-ce tenable ?

Le fil rouge de l'étude : **la brique la moins différenciante (le scan) est déjà
commoditisée et gratuite en open source ; notre valeur défendable est dans
l'analytique et la gestion** (objectifs, deadweight, banque, historique). C'est
exactement ce que le produit fait déjà — mais c'est aussi ce que fait notre
concurrent le plus direct.

---

## 2. Ce que le produit fait déjà, face au marché

Le Kingdom Manager couvre aujourd'hui : ingestion de données, performances KvK,
objectifs individuels indexés sur la puissance (F-014), analyse deadweight,
banque de royaume, historique multi-campagnes, timeline, module de course
coalition (KvK Race), SSO Discord + synchro des rôles, bot Discord, i18n 9
langues, mode clair/sombre.

**Le concurrent frontal identifié est ROK Steward** (`roksteward.com`) : rapports
Excel/PDF color-codés, scoring par palier de puissance, feux tricolores selon le
% d'objectif atteint, pondération DKP configurable, exigences pré-KvK, ciblage
explicite « alliance leaders ». **C'est notre produit, en version Excel.**
Tarif affiché : **9,99 $/mois**, 89 $/an, ou un pack de rapports à 4,99 $.

Ce que nous avons **en plus** que le benchmark ne met pas en avant :
- une **vraie application** (pas des exports Excel figés) : temps réel, mobile,
  multi-utilisateurs, permissions par rôle ;
- l'**intégration Discord native** (SSO + rôles + bot + snapshots) ;
- la **banque de royaume** — angle que la recherche marché ne trouve couvert par
  **aucun** outil packagé. Différenciation possible, à confirmer ;
- l'**historique multi-saisons** capitalisé et la timeline.

Ce qui nous manque face au marché :
- pas de **scan intégré** : nous consommons ProKingdoms, nous ne produisons pas
  la donnée (voir §4) ;
- une seule **instance mono-royaume** : rien n'est packagé (voir §3).

---

## 3. Entrants techniques — passer de mono-royaume à multi-tenant

C'est le cœur du coût. L'audit du code révèle **sept couplages mono-royaume**.
Effort indicatif : S (petit) / M (moyen) / L (lourd, structurant).

| # | Couplage actuel | Où | Ce qu'impose le SaaS | Effort |
|---|---|---|---|---|
| 1 | **Modèle de données global** — `static_data/players`, `kvk_config/current`, `roles/{uid}`, `war_availabilities`… tout vit à la racine, sans notion de tenant | Firestore, partout | Re-namespacer par royaume : `tenants/{kingdomId}/…`. Réécriture des lectures, des règles de sécurité, du bot et des Functions. **Chantier structurant n°1.** | **L** |
| 2 | **1 serveur Discord** (guild + IDs de rôles en secrets globaux) | `discordAuth.js` | Config Discord **par royaume** : chaque Roi connecte son serveur et mappe ses rôles. Onboarding self-service. | **L** |
| 3 | **1 source de données** (`KVK_SHEET_ID` unique) | `.env`, `digest-data.js` | Source paramétrable par tenant. | **M** |
| 4 | **1 bucket de scans** `kd-97-manager-kvk-race` | `digest.js` | Préfixe + règles Storage par tenant, isolation stricte. | **M** |
| 5 | **Parser couplé au format ProKingdoms** (feuilles `Full Data`/`Basic Data`, regex de nom de fichier) | `parse.js` | Abstraction multi-fournisseurs (voir §4). | **M** |
| 6 | **Identité en dur** « Unitas 2997 », logo, textes | `App.jsx` | Marque blanche : nom, logo, couleurs, langue par défaut configurables. | **S** |
| 7 | **1 projet Firebase / 1 base** `kdmanagerdb` | `.firebaserc`, `firebase.js` | Choix d'architecture : mutualisé (préfixes, cf. #1) **ou** projet par client (isolation forte mais coûts × N). | **L** (décision) |
| 8 | **Discord obligatoire** — auth SSO et affectation des rôles reposent entièrement sur un serveur Discord | `AuthContext`, `discordAuth.js`, bot | **Décision 3 du Roi** : un royaume sans Discord doit fonctionner. Fallback in-app pour l'auth (Google existe déjà) **et** pour les commandes du bot (`/mystats`, `/mykvk`, `/mykvkgoals` ont déjà des équivalents web) **et** pour l'affectation des rôles sans Discord (nouveau : le Roi invite/nomme ses membres dans l'app). | **L** |
| 9 | **Rôles = mapping Discord → app figé** — `roleKing/Officer/Warrior` mappés en dur depuis les IDs de rôles Discord | `discordAuth.js` (secrets) | **Décision 4 du Roi** : après connexion du Discord, récupérer la liste de ses rôles et laisser le Roi **mapper chaque rôle Discord à un niveau d'accès** (Roi/Officier/Guerrier) dans une UI d'admin. Améliore aussi le contrôle d'accès du produit actuel (lié à BR-003/BR-008/BR-009). | **M** |

**Lecture PM** : les items 1, 2, 7 et **8** sont le vrai investissement — c'est
une **refonte d'architecture**, pas un lot de réglages. L'item 8 (rendre Discord
optionnel) est plus lourd qu'il n'y paraît : la plupart des commandes du bot ont
déjà un équivalent web, mais **l'affectation des rôles sans Discord est une
surface neuve** — sans serveur pour porter les rôles, il faut un mécanisme
d'invitation et de nomination des membres directement dans l'app. L'item 9
(mapping configurable) est en revanche une **amélioration à valeur immédiate,
même pour le produit mono-royaume actuel** : aujourd'hui le mapping rôle→accès
est en dur, ce qui est fragile ; le rendre configurable renforce le contrôle
d'accès tout de suite, indépendamment du SaaS. Les items 3–6 restent
proportionnés. Le produit **n'a pas été conçu multi-tenant** ; le rendre tel est
le principal poste de coût, et il est irréductible.

**Au-delà du code**, un SaaS impose aussi des entrants **non-techniques** souvent
sous-estimés : facturation (Stripe), gestion des comptes et de la résiliation,
support client, page marketing, CGU/RGPD (on héberge des données de joueurs
tiers), sauvegardes et SLA, onboarding self-service. À ne pas négliger dans le
chiffrage.

---

## 4. Abstraction des fournisseurs de scans (3ᵉ question)

**Bonne nouvelle architecturale** : le moteur KvK Race est déjà bien découplé. Le
parseur (`functions/kvkRace/parse.js`) transforme le xlsx ProKingdoms en un
**format interne normalisé** que le reste du moteur consomme. Supporter RokStats
ou HeroScroll ne demande donc **pas de réécrire le moteur** — seulement d'ajouter
**un adaptateur de format par fournisseur** en amont, produisant ce même format
interne.

Ce que la recherche marché apprend sur les fournisseurs :

| Fournisseur | Sortie | API ? | Implication pour nous |
|---|---|---|---|
| **ProKingdoms** | Dashboard + export xlsx | Non mentionné | Format déjà supporté (référence actuelle). |
| **RokStats** (`rokstats.com`) | **CSV** par email | Non | Adaptateur CSV → format interne. Upload manuel. |
| **Rise of Stats** | Données + **API** | **Oui** | **Le seul avec une API** : ingestion automatisée possible, sans upload manuel. Piste forte pour réduire la friction. |
| **RokTracker** (open source, MIT) | **Excel** | Non | Gratuit — un Roi peut scanner lui-même. Adaptateur xlsx. |
| **HeroScroll**, RokMetrics, Statsmaster… | Dashboards | Non confirmé | Formats non documentés (pages inaccessibles à la collecte). À investiguer si demande réelle. |

**Reco §4** : concevoir une **interface d'adaptateur de scan** (une fonction
`parse(fichier) → format interne` par fournisseur), livrer ProKingdoms +
RokTracker (xlsx, proches) d'abord, puis RokStats (CSV). L'**API Rise of Stats**
est la piste la plus intéressante à moyen terme car elle supprime l'upload
manuel — l'étape la plus pénible du parcours actuel. Effort par adaptateur : **S
à M** selon l'écart de format.

**Dépendance aux tiers — décision assumée (décision 2 du Roi).** La donnée RoK n'a
**pas d'API officielle Lilith** ; elle est produite par scan OCR d'écran, à la
limite de la légalité. Faire notre propre scan natif est écarté : pas le temps,
et risque juridique. **On reste donc dépendant de ProKingdoms / RokStats / etc.**
— c'est acté, pas un risque à mitiger par du scan interne.

Ce que cette décision implique, et qu'il faut regarder en face : nos fournisseurs
de données sont **aussi nos concurrents** (ils vendent leurs propres dashboards).
Notre seule protection contre un changement de format ou une coupure, c'est le
**multi-fournisseurs** (§4) — d'où l'importance de l'adaptateur : ne jamais
dépendre d'une seule source. C'est la mitigation réaliste, à défaut de mieux.

---

## 5. Analyse concurrentielle & positionnement

**Le marché est fragmenté, sans leader dominant clairement identifié**, et se
répartit en trois couches :

1. **Scanners** (produisent la donnée) : RokTracker (gratuit, open source),
   RokStats, Rise of Stats, ProKingdoms, Statsmaster, services Fiverr (~50 $/scan).
2. **Dashboards / analytics** : ProKingdoms, ROKStats (`app.rokstats.online`),
   RokMetrics.
3. **Gestion & reporting pour dirigeants** : **ROK Steward** (notre vrai
   concurrent), bots Discord (Codex Helper, Easy Stats Bots, Roka).

**Notre positionnement naturel est la couche 3**, la plus défendable : la couche
1 est commoditisée (open source gratuit tire les prix à zéro), la couche 2 est
encombrée. La valeur payante s'est **déplacée vers l'analytique et la gestion** —
c'est là que ROK Steward gagne de l'argent, et c'est là que nous sommes déjà.

**Notre différenciation potentielle** contre ROK Steward :
- **application temps réel** vs exports Excel/PDF figés ;
- **intégration Discord native** (SSO, rôles, bot, snapshots) ;
- **banque de royaume** — apparemment non couverte par le marché ;
- **historique multi-saisons** capitalisé.

**Notre désavantage** : ROK Steward est déjà packagé, vendu, et simple (des
fichiers, pas d'onboarding). Nous devons construire tout l'appareil SaaS (§3)
avant de vendre le premier abonnement.

---

## 5bis. Structure de coûts et valeur — le point de vue du Roi (2026-07-24)

Avant de tracer une ligne gratuit/payant, il faut savoir ce que le produit
**coûte réellement** à faire tourner pour un royaume, et quelle **valeur** le Roi
y cherche. Sans ça, tout découpage est arbitraire.

### Ce que le KD 97 coûte aujourd'hui

| Poste | Coût | Nature |
|---|---|---|
| **Abonnement ProKingdoms** | **35 €/mois** | Externe. Donne les **scans KvK illimités** en saison. C'est le **seul coût monétaire**, et il porte sur la donnée de course/KvK. |
| Scans internes (top 300 hors-saison, bank ledger, trophies, deadweight) | **Gratuit** | Fait maison par un officier. Coût = temps humain, pas d'argent. |
| Infra (Firebase, hébergement) | ~0 à cette échelle | Négligeable pour un royaume ; devient un vrai poste à N royaumes. |

**Enseignement n°1 — le seul coût monétaire, c'est le scan KvK (ProKingdoms).**
Tout le reste (dashboard, banque, trophées, deadweight, war tracker) repose sur
de la donnée **gratuite** produite en interne. La ligne gratuit/payant devrait
donc suivre **le coût**, pas la sophistication : ce qui dépend du scan KvK payant
est structurellement différent de ce qui repose sur de la donnée maison.

### La valeur que le Roi recherche (ses mots)

1. **Piloter avec de la donnée fraîche** — voir la progression en saison **et**
   hors saison, un suivi clair et pertinent **pendant le KvK** pour décider
   stratégiquement. *→ dépend de la fraîcheur des scans (ProKingdoms en saison).*
2. **Suivi de guerre** — déclaration de disponibilité par campagne : savoir quels
   joueurs s'engagent, avec quelles ressources ; le War Dashboard est très
   apprécié. *→ donnée produite par les joueurs eux-mêmes, **aucun coût externe**.*
3. **Suivi long terme** — progression du royaume et par joueur à travers les KvK.
   *→ capitalisation de l'historique, coût de stockage seul.*

### Trois observations qui déplacent le raisonnement

- **La banque n'est PAS dans la valeur cœur du Roi.** L'étude supposait (§5) que
  la banque de royaume était notre différenciateur clé. Le Roi ne la cite pas
  parmi ce qu'il recherche — il la range dans les scans internes « gratuits, faits
  par un officier ». Signal à prendre au sérieux : **la banque est peut-être une
  fonction d'hygiène, pas un moteur d'achat.** Hypothèse « banque = différenciateur »
  à revoir.

- **Le War Tracker est le meilleur candidat gratuit.** Forte valeur pour le Roi,
  **zéro coût de données externe** (auto-déclaration des joueurs). C'est le hook
  idéal : il crée de l'engagement et de l'adhésion du royaume sans nous coûter en
  scan.

- **La question pivot que personne n'a encore posée : qui paie ProKingdoms dans
  le modèle SaaS ?** Deux voies radicalement différentes :
  - **BYO (« bring your own »)** : chaque Roi garde **son** abonnement ProKingdoms
    (il paie déjà les 35 €) et le **connecte** à notre app. Notre coût de donnée
    KvK ≈ **0** — le client porte le scan, nous vendons la couche logicielle. Le
    freemium redevient viable (seul l'infra + support nous coûte).
  - **Bundle** : nous achetons/revendons les scans. Coût **× N royaumes**, et
    ProKingdoms est à la fois notre fournisseur **et** notre concurrent. Position
    faible.
  → **BYO est presque certainement le bon modèle cible**, et il est cohérent avec
  la décision 2 (dépendance assumée). Il faut le trancher explicitement car il
  reconfigure toute l'économie : en BYO, notre prix ne « couvre » pas un coût de
  données, il capture une **valeur logicielle** — ce qui autorise un vrai gratuit.

### Précision du Roi (2026-07-24) — le fondateur peut fournir les scans au démarrage

L'abonnement ProKingdoms scanne du **classement public** : rien n'empêche le Roi
de scanner le KvK d'un royaume **client** avec son propre abonnement, à **coût
marginal nul en euros**. Pour l'amorçage, c'est donc lui qui peut fournir les
scans — pas besoin que le client ait son propre ProKingdoms.

C'est une **excellente tactique de lancement** : elle supprime la friction
d'onboarding (le client ne connecte rien, les scans « apparaissent »), et rend le
tier gratuit crédible dès le premier cohort avec de la vraie donnée KvK. À retenir
pour le pilote.

**Mais c'est une tactique d'amorçage, pas un modèle d'échelle**, pour trois raisons :

1. **« Ça ne coûte rien » est vrai en euros, faux en temps.** Chaque royaume
   client = des scans lancés manuellement, à la bonne cadence, plusieurs fois par
   KvK, sur *leur* calendrier, indéfiniment. À 3–5 royaumes c'est une corvée du
   soir ; à 20+, c'est un mi-temps et un **point de défaillance unique** (le Roi
   part en vacances → tous les clients ont de la donnée périmée). C'est exactement
   le piège « gratuit en cash, cher en main-d'œuvre » déjà connu en interne.

2. **Zone grise ProKingdoms.** Un abonnement scannant *son* royaume est l'usage
   prévu. Scanner des dizaines de royaumes tiers pour les **revendre** dans un
   service commercial peut violer leurs CGU, saturer des quotas, ou se faire
   repérer. Bâtir un business sur la revente discrète de la donnée d'un concurrent
   via un abonnement personnel est **fragile** — ils peuvent couper. Ça aggrave la
   dépendance de la décision 2. **À vérifier dans leurs CGU avant d'en dépendre.**

3. **Ça ramène vers le « bundle ».** Fournir les scans, c'est redevenir le
   fournisseur de données — juste à coût € nul. Acceptable pour amorcer, mais il
   faut être clair que **la cible reste le BYO** (le client apporte sa source),
   avec « le fondateur scanne pour toi » comme **option de gant blanc pour les
   premiers clients**, pas comme promesse permanente.

**Modèle en deux temps, donc :**
- **Amorçage** — le Roi fournit les scans (coût € nul, friction nulle), sur un
  petit nombre de royaumes plafonné par son temps.
- **Échelle** — bascule vers le BYO par défaut ; « on scanne pour toi » devient un
  service premium optionnel, facturé pour couvrir le temps.

**Principe directeur retenu par le Roi (2026-07-24) : la flexibilité.** Le produit
doit pouvoir embarquer des scans de **plusieurs fournisseurs** ET accepter que le
fondateur en fournisse pour les royaumes qui n'ont rien. On démarre scrappy
(fondateur réactif), on ajuste *as we go*, et on fait évoluer le dispositif vers
le BYO / le service facturé quand le volume (≈ 20 royaumes) rend le manuel
intenable. C'est la bonne posture d'amorçage : elle évite de sur-investir avant de
connaître la demande, et l'abstraction scan (§4) est précisément ce qui rend cette
flexibilité possible.

> **Point 2 — capacité ≠ permission (reste ouvert).** Le Roi confirme la *capacité
> technique* (scans illimités, aussi fréquents que voulu, sur n'importe quel
> royaume). Ce n'est **pas** la question du risque : la question est de savoir si
> les **CGU de ProKingdoms autorisent la revente** de cette donnée dans un produit
> commercial tiers. Capacité et permission sont deux choses distinctes ; l'usage
> « personnel » toléré ne vaut pas droit de revente. **À vérifier dans les CGU
> avant d'en faire un pilier** — effort faible, enjeu élevé (coupure possible).

*Tension à noter pour le pilote* : si le Roi scanne tout lui-même via ProKingdoms,
le pilote **ne testera que le chemin ProKingdoms** — et donc **aucun** des
problèmes de format multi-fournisseurs (RokStats, HeroScroll) que l'abstraction
scan (§4) cherche justement à valider. Pour tester ça, il faut au moins un royaume
qui apporte une donnée d'un **autre** fournisseur.

---

## 5ter. Modèles de monétisation — espace des possibles (en exploration, 2026-07-24)

Le Roi ne veut pas trancher une ligne gratuit/payant tout de suite, et a raison :
il faut d'abord voir **quel modèle colle à sa réalité** (fondateur solo, marché de
niche, valeur mi-logicielle mi-service). Quatre archétypes, du plus léger à
construire au plus lourd :

| Modèle | Ce qu'on facture | Sellable quand ? | Limite |
|---|---|---|---|
| **A · Freemium fonctionnel** | Un socle gratuit, on paie pour débloquer des fonctions | Après le multi-tenant + billing + logique de tiers | Le plus lourd à construire ; conversion incertaine |
| **B · Services / clé en main** *(idée du Roi)* | **Setup + hébergement + support + services premium à la demande** (scan, rapports custom) | **Maintenant** — instance clonée par royaume, zéro refonte | Facture le **temps du fondateur** = même plafond que le scan manuel |
| **C · Abonnement forfait / royaume** | Un prix unique, tout inclus, par royaume | Après le multi-tenant | Simple, mais suppose le gros investissement d'abord |
| **D · Hybride** | Socle logiciel (gratuit ou forfait) **+** services premium à la demande | Progressif | Le plus réaliste à terme, combine B et C |

**Lecture PM — le modèle B est sous-estimé et c'est probablement par là qu'il faut
commencer.** Trois raisons :

1. **Vendable aujourd'hui, sans la refonte.** Un royaume ami paie « je te
   l'installe, je l'héberge, je le maintiens, je scanne ton KvK » = instance
   clonée + marque blanche (item 6 du §3). **Aucun multi-tenant requis.**
2. **C'est le test de disposition à payer le moins cher qui existe.** Quelqu'un qui
   te paie pour *mettre en place et faire tourner* son royaume a **prouvé** qu'il
   paie — avec **zéro** investissement produit. C'est exactement l'inconnue n°1 de
   l'étude (§8), levée pour presque rien.
3. **Ça monétise honnêtement ce que tu apportes vraiment au début** : ta
   réactivité, ton temps, ton expertise — pas seulement du code.

**Mais le modèle B a le même plafond que le scan manuel** (§5bis, point 1) : il
facture ton **temps**. Setup, support, hébergement, scans à la demande — tout
scale avec tes heures. C'est un **excellent modèle d'amorçage et de validation**,
**pas** un état final. La trajectoire naturelle : **B pour valider et amorcer →
évoluer vers C ou D** (produit + abonnement) quand la demande est prouvée et que
le multi-tenant vaut l'investissement. Même logique en deux temps que partout
ailleurs dans cette étude : scrappy d'abord, industrialisé une fois la demande
réelle.

*Reste ouvert* : ces quatre modèles ne sont pas exclusifs, et la question sous-
jacente n'est pas encore posée — **quel « job » un roi client nous confie-t-il ?**
« Piloter mon KvK sans me prendre la tête » ? « Ne plus bricoler des Excel » ?
« Avoir un outil pro sans le construire » ? La réponse oriente le modèle bien plus
que l'inverse. À creuser en brainstorm / entretien.

---

## 6. Prix — fourchettes dérivées du marché

**Prix réellement observés** (faits sourcés, pas des moyennes inventées) :

| Modèle | Référence marché |
|---|---|
| Gratuit / open source | RokTracker (scan) |
| Par scan / par KvK | Fiverr ~50 $/scan · ROKStats ~25 $+/KvK |
| Tokens / crédits | Rise of Stats 1 €/token, dégressif |
| **Abonnement SaaS mensuel** | **ROK Steward 9,99 $** · ProKingdoms 7,99 € → 34,99 € · ROKStats AIO 70 $/mois (haut de gamme) |
| Bot Discord premium | Codex Helper 5 $/mois, « tous serveurs » |
| Remises | multi-mois −10/−20 %, annuel −25/−30 % (quasi universel) |

**Synthèse** : l'entrée de gamme individuelle est à **5–10 $/mois**, l'offre
« royaume complet avec scans récurrents » monte à **35–70 $/mois** ou **25 $+/KvK**.
La segmentation se fait **par palier de fonctionnalités et volume de scans**, pas
par joueur.

**Reco prix (hypothèse à tester)** : nous vendons à un **royaume**, pas à un
joueur — le Roi ou la coalition paie pour tout le monde. Un positionnement
cohérent avec la valeur (application complète + Discord + banque) serait un
**abonnement par royaume dans la fourchette 20–40 $/mois**, au-dessus de ROK
Steward (justifié par l'app temps réel et l'intégration Discord) mais sous les
70 $ du très haut de gamme. À valider absolument par des entretiens : **on ne
sait pas encore qui paie ni combien un Roi accepte de sortir** (voir §8).

---

## 7. Risques

| Risque | Gravité | Commentaire |
|---|---|---|
| **Dépendance à la donnée tierce** | **Haute (assumée)** | Décision 2 : pas de scan natif (temps + légalité). La matière première vient de scanners qui sont aussi nos concurrents. Seule mitigation retenue : multi-fournisseurs (§4). Le scan intégré est écarté. |
| **Économie du freemium sur un petit marché** | **Moyenne à haute** | Voir la mise en garde §8 : contrairement à un bot Discord (coût marginal quasi nul), notre app a un coût d'infra + support **par royaume**, même gratuit. Un freemium mal calibré = beaucoup de tenants gratuits qui coûtent et ne convertissent jamais. |
| **Concurrent packagé déjà en place** | **Haute** | ROK Steward vend déjà, simple, à 9,99 $. Nous devons construire tout le SaaS avant de vendre. |
| **Coût du multi-tenant** | **Haute** | Refonte d'architecture (§3, items 1/2/7), pas un lot de réglages. |
| **Marché à taille inconnue** | **Moyenne** | Nombre de royaumes actifs **non publié** ; qui paie **non documenté**. On ne peut pas dimensionner le TAM ni le revenu sans recherche primaire. |
| **Zone grise ToS du scan** | **Moyenne** | Usage toléré mais non officiel. Risque réputationnel/légal à qualifier. |
| **Support & exploitation** | **Moyenne** | Un SaaS multi-clients = support, SLA, facturation, RGPD sur données de tiers. Charge récurrente sous-estimée. |

---

## 8bis. Décision — frontière, packaging & prix (Roi, 2026-08-08)

La décision pivot du §8 (« où passe la ligne gratuit/payant ») est **prise**. Le Roi a
tranché les 3 tiers sur les ~27 features (**0 restée à débattre**) — détail dans
`FeatureInventory.md` §« Frontière commerciale ». Puis packaging et prix ont été arbitrés.

**Frontière (principe : value-ladder, pas coût).** Gratuit = War Tracker + multi-comptes,
Dashboard, Performance, Objectifs KvK. Premium = Course, analytics croisés (deadweight,
couverture méta), Timeline, Historique multi-saisons, Banque, Trophées, Discord (rôles/bot/
pings). Socle = auth, ingestion, i18n, avatars, design, migration, activation de modules.
Le Roi croise volontairement le principe « coût » (§5bis) : des scan-dépendants sont
_gratuits_ (hook), des données internes gratuites sont _premium_ (vendues sur leur valeur
analytique de couche 3, §5).

**Plafonds du gratuit (décision compagnon).** Parce que le gratuit contient du scan-coûteux,
il est **plafonné sur les deux dimensions coûteuses** (objection 2 ci-dessous) : **fréquence
de scans** (quota/campagne vs illimité) **et rétention d'historique** (saison en cours vs
multi-saisons). → Le gratuit donne _la vue_ (démo vivante), le premium _la fréquence + la
profondeur + l'automation_.

**Packaging.** Deux tiers commerciaux — **Découverte** (gratuit, plafonné) et **Royaume**
(premium) — plus une **couche service (modèle B)** par-dessus : setup + « je scanne pour toi »,
facturés à part, comme dispositif d'**amorçage** (vendable sans multi-tenant, et seul vrai
test de disposition à payer — cf. objection 1). Trajectoire : **B → D hybride**.

**Prix (hypothèse à tester).** **25-30 $/mois par royaume** ; annuel **−25 %**. Positionné
au-dessus de ROK Steward (9,99 $) et sous le haut de gamme (70 $), justifié par l'app temps
réel + Discord natif + banque + historique (§6). **Unité = le royaume** (pas la coalition) :
le Roi paie pour son royaume, la Course affiche le contexte coalition sans changer l'acheteur.
Le concierge (modèle B) se facture en plus, au temps.

**Ce qui reste à faire (dérive de cette décision) :**
- **Tester la disposition à payer** — le prix est une _hypothèse_ ; aucun royaume n'a encore
  payé (pilote 3341 gratuit). Test le moins cher : proposer au pilote, après quelques semaines
  d'usage, de payer 25-30 $ (cf. §8 objection 1). **Chemin critique du go-to-market.**
- **Fixer le quota de scans exact du gratuit** (ex. _N_ scans/campagne) — détail de packaging,
  à caler à l'implémentation des plafonds.
- **Vérifier les CGU ProKingdoms** sur la fourniture de scans à l'échelle (A-029, §5bis).
- Prérequis produit du premium Discord : **fallback in-app** (chantier L, §3 item 8).

## 8. Recommandation & prochaines étapes

La stratégie retenue par le Roi (décision 1) est **freemium + pilote gratuit sur
le royaume d'un ami** plutôt que du démarchage à froid. C'est un choix défendable :
le démarchage ne convertit pas sur ce marché, et mener par la valeur gratuite est
la bonne intuition. La séquence ci-dessous s'y aligne — **mais deux objections
doivent être posées avant de s'y engager.**

### Objection 1 — le pilote gratuit ne teste pas la disposition à payer

Le pilote chez un ami est excellent pour **une** chose : faire remonter les
problèmes de données (formats de scan différents, IDs, cas limites). C'est réel et
utile. Mais il faut être lucide sur ce qu'il **ne** prouve pas : un ami qui utilise
gratuitement un outil ne démontre **pas** qu'un inconnu paierait pour. Feasibilité
et valeur ≠ disposition à payer. Ces deux questions se testent séparément — sinon
on risque de conclure « ça marche, les gens adorent » sans jamais avoir vu un euro.

*Pour que le pilote serve aussi de test data* : choisir un royaume ami qui utilise
un **fournisseur de scan différent** de 2997 (RokStats plutôt que ProKingdoms), et
idéalement **sans Discord**. Un royaume trop semblable au nôtre ne révélera aucun
des problèmes qu'on cherche justement à trouver.

### Objection 2 — le freemium a un coût par royaume, pas un coût quasi nul

Le freemium marche quand le coût marginal d'un utilisateur gratuit est proche de
zéro (un bot Discord). **Notre app n'est pas dans ce cas** : chaque royaume gratuit
consomme de l'infra (lectures Firestore, ingestion de scans, stockage) **et du
support**. Sur un marché petit (quelques milliers de royaumes, une fraction
active), on peut se retrouver à porter beaucoup de tenants gratuits qui ne
convertissent jamais, chacun coûtant de l'argent et du temps.

Deux garde-fous : **définir tôt la frontière gratuit/payant** (voir ci-dessous),
et **plafonner le gratuit** sur les dimensions coûteuses (nombre de scans par mois,
rétention d'historique) plutôt que sur des fonctionnalités seules.

### La vraie décision à préparer : où passe la ligne gratuit/payant

C'est **la** décision qui fait ou défait le modèle, et elle n'est pas encore prise.
Piste à débattre, cohérente avec nos différenciateurs (§5) :

- **Gratuit (le hook)** : dashboard, performances KvK, objectifs individuels,
  déclaration de disponibilités, 1 scan/campagne, historique court. De quoi qu'un
  Roi voie la valeur et équipe son royaume.
- **Payant (la valeur défendable)** : module de course coalition (KvK Race),
  **banque de royaume** (notre angle non servi par le marché), historique
  multi-saisons complet, snapshots Discord automatiques, scans illimités,
  multi-fournisseurs. Bref, ce que ROK Steward et les autres ne font pas.

### Séquence proposée, du moins cher au plus cher

1. **Définir la frontière gratuit/payant** (atelier, gratuit) — préalable à tout.
   Sans elle, on ne peut ni packager ni chiffrer.
2. **Pilote gratuit chez un royaume ami** — de préférence fournisseur de scan
   différent et sans Discord (cf. objection 1). Objectif : faire tomber les
   problèmes de données **et** valider les items 5, 8, 9 du §3 sur un cas réel.
   Techniquement le moins cher : projet Firebase cloné + marque blanche (item 6),
   pas de multi-tenant complet.
3. **Test de disposition à payer, en parallèle** — le pilote ne le donne pas. Le
   plus léger : une page décrivant l'offre payante + un prix, mesurer les
   inscriptions. Ou, plus qualitatif, demander au royaume pilote **au bout de
   quelques semaines** s'il paierait pour le tier avancé — la question a du poids
   une fois la valeur ressentie.
4. **Seulement si les signaux sont bons : le multi-tenant** (§3, items 1/2/7/8) —
   le gros investissement, engagé une fois la demande **et le paiement** prouvés.

### Nouvelles hypothèses à ouvrir dans l'Assumptions Log
- *le Roi/la coalition paie pour le royaume entier, pas le joueur* (fonde le prix —
  non vérifié) ;
- *un tier gratuit crée assez de valeur pour équiper un royaume, et le tier payant
  (course + banque + historique) déclenche la conversion* (cœur du modèle freemium —
  non vérifié) ;
- *la banque de royaume est un besoin non servi par le marché* (différenciation
  supposée — à confirmer) ;
- *le coût d'un tenant gratuit reste soutenable à l'échelle* (viabilité du freemium —
  à surveiller dès le pilote) ;
- *les royaumes actifs se comptent en milliers, dont une fraction en KvK* (TAM —
  non sourcé).

---

## Sources marché
ProKingdoms · ROK Steward (roksteward.com) · ROKStats (rokstats.com &
app.rokstats.online) · Rise of Stats (riseofstats.com) · RokTracker (GitHub, MIT) ·
Statsmaster · InfoCat · Codex Helper · Easy Stats Bots · Fiverr · Wikipedia /
activeplayer.io / mmostats.com (population). *Réserves : plusieurs pages de tarifs
inaccessibles à la collecte (ROKStats, RokMetrics, HeroScroll) ; nombre de
royaumes actifs et mode de financement non disponibles de source fiable — à
traiter en recherche primaire.*
