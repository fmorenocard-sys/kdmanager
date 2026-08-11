# Étude — Différenciation visuelle face à la concurrence

> Date : 2026-08-11 · Auteur : PM/Design · Statut : **étude exploratoire → direction pour Claude Design**
> Question du Roi : comment KD Manager peut-il se **démarquer visuellement** de la concurrence ?
> Livrable jumeau : **Artifact visuel** (moodboard/audit) — https://claude.ai/code/artifact/f6c8abe6-ae0b-4fc4-b4e2-def4260d0269
> (page privée ; la page adopte elle-même notre langage visuel = démonstration de la direction). Source HTML : `scratch/etude-visuelle.html`.

---

## 0. Méthode & limite honnête

Analyse ciblée de **4 concurrents** ayant une vraie surface visuelle : **ROK Steward**,
**ProKingdoms**, **ROKStats**, **Rise of Stats**. Source = **contenu public** de leurs sites
(positionnement, features, indices de style) + pour ProKingdoms, la **capture réelle** de son
écran « Event Timeline » fournie par le Roi. **Limite** : la capture directe des dashboards
derrière login n'a pas été possible cette session (navigateur intégré en timeout) — l'audit
visuel s'appuie donc sur le public + la connaissance de la catégorie, à raffiner avec des
captures si besoin. Ancrage « notre direction » = les **tokens réels** du code (`src/index.css`
`@theme`, design system v2).

---

## 1. Audit concurrentiel (6 axes)

| | **ROK Steward** | **ProKingdoms** | **ROKStats** | **Rise of Stats** |
| :--- | :--- | :--- | :--- | :--- |
| **Nature** | Générateur de **rapports** | **Dashboard** de jeu | **Service de scan** | Dashboard + **API** |
| **Sortie** | Excel + **PDF** color-codés | Onglets web (Live KvK, Past Battles…) | **CSV** / Google Sheets | Panneau interactif |
| **Palette** | Navy + **or** | Sombre fantasy + **or** | Clair, minimal | **Noir**, sombre |
| **Thème** | Clair « pro » | Dark gaming | Clair transactionnel | Dark gaming |
| **Imagerie** | Tables, feux tricolores | **Art de jeu** (hero backgrounds), icônes dorées | Captures de tableurs | Icônes de jeu, minimal |
| **Ton** | Utilitaire, « fini le tableur » | Gamer + tactique | Transactionnel (« Order Now ») | Technique, business |
| **Verdict visuel** | *Un rapport, pas un produit* | *Le plus « app », mais dense & très gamer* | *Un tableur déguisé* | *Dashboard générique sombre* |

Signatures verbatim : ROK Steward — « **Kingdom performance, properly measured** », feux
« vert ≥100 % / jaune 70-99 % / rouge <70 % » ; ProKingdoms — onglets « **Live KvK / Past
Battles / Seeds / Zenith / Recruit** », « Building your live KvK card… » ; ROKStats — « **Order
Now** », « Real data 100% Accurate » ; Rise of Stats — « **Your data our task** ».

## 2. La « mer de similitude »

Malgré les différences, le paysage se réduit à **deux archétypes**, et à quelques réflexes
partagés :

- **Archétype A — le tableur/rapport** (ROK Steward, ROKStats) : la valeur *sort* de l'outil
  sous forme d'**Excel / CSV / PDF**. L'UI n'est qu'un formulaire d'export.
- **Archétype B — le dashboard de jeu générique** (ProKingdoms, Rise of Stats) : onglets denses,
  **fond sombre fantasy**, **art de jeu**, accents **or**.
- **Le cliché « gold-on-dark »** : l'or sur fond sombre est le tic visuel de toute la catégorie
  RoK (navy+or, dark fantasy, icônes dorées). Personne ne possède de palette distinctive.
- **Outil, pas produit** : ton transactionnel/technique (« Order Now », « upload → generate →
  share »), zéro chaleur de marque, aucune personnalité qui donne envie d'y *vivre*.
- **Desktop-first / fichier** : on y va pour **télécharger** ou consulter un dashboard PC ; le
  **mobile est un angle mort**.
- **La donnée en vrac** : tables, feux tricolores, CSV — rarement élégant, jamais narratif.

## 3. Le no man's land visuel (où personne n'est)

L'espace vide est net et défendable — c'est précisément le positionnement « couche 3 » de
l'étude de commercialisation (« une vraie application vs des exports Excel figés ») rendu
**visuel** :

1. Une **application de qualité produit**, pas un rapport ni un dashboard gamer générique.
2. Une **identité chromatique possédée** qui **casse le cliché de l'or**.
3. Le **mobile comme expérience première** (les joueurs y vivent), pas un desktop rétréci.
4. La **donnée comme récit** (contexte, compte à rebours, progression) plutôt qu'en vrac.
5. De la **chaleur** — le *chez-soi* d'un royaume, pas une utilité qu'on visite pour un fichier.

## 4. Notre direction de différenciation

Bonne nouvelle : on a **déjà** le bon socle (v2 « Glass Raffiné »). La stratégie n'est pas de
tout refaire, c'est d'**assumer et pousser** ce qui nous distingue déjà, comme un parti pris.

**Nos tokens réels (le point de départ, `src/index.css`)** : fond **slate-900** (`#0f172a`),
cartes **glass** hairline (bordure dégradée, blur 14px), **CTA amber→orange** (`#d97706→#c2410c`),
**accent indigo→purple** (`#6366f1→#a855f7`), état actif **indigo** (`#818cf8`), lueurs ambiantes
**bleu + ambre**, **thème clair/sombre**.

**Les 5 leviers de différenciation :**

1. **Casser l'or → duo chaud/froid possédé.** Le cliché RoK, c'est l'or sur sombre (ProKingdoms).
   Notre signature = **ambre→orange (CTA) + indigo→purple (accent)** sur verre slate — un duo
   chaud/froid reconnaissable qui n'appartient à personne dans la catégorie. En faire un **actif
   de marque** (le geste amber, la lueur indigo de l'état actif), pas juste des couleurs de thème.
2. **Produit, pas outil.** Doubler les signaux que la concurrence n'a pas : **cartes glass à
   bordure hairline dégradée**, lueurs ambiantes, **micro-motion** (framer-motion), **empty
   states** soignés, **toggle de thème**, **RTL/i18n 10 langues**. Chaque détail dit « vrai SaaS ».
3. **Mobile-first, vraiment.** Concevoir l'expérience **mobile comme la principale** (cartes, pas
   de scroll horizontal, cibles 44px) — là où les concurrents sont des dashboards PC. C'est le
   prolongement direct du brief « Mon espace joueur ».
4. **Donnée narrative.** Compte à rebours + contexte (calendrier × objectifs), pastilles de statut,
   barres de progression — on a déjà commencé (bandeau calendrier, statuts F-014/BR-019). En faire
   une **règle de style** : jamais un tableau brut sans mise en récit.
5. **Chaleur & identité de royaume.** Avatars dynamiques (F-016), le *chez-soi* du joueur (brief
   espace joueur), une personnalité — vs l'utilité transactionnelle de la concurrence.

**Thèse en une phrase** : là où la concurrence *ressemble à un export Excel ou à un dashboard
gamer doré*, KD Manager doit *ressembler à une vraie app mobile, raffinée, en verre slate à
signature ambre/indigo* — « l'app où ton royaume vit », pas « l'outil où tu télécharges un
fichier ».

## 5. Ce qu'on ne fait PAS

- Pas de refonte du design system : on **assume** v2, on ne repart pas de zéro.
- Pas d'art de jeu chargé (le piège de la catégorie) — le raffinement *est* la différenciation.
- Pas de rouvrir le tiering ni l'IA : c'est une couche **visuelle/marque**, orthogonale.

## 6. Prochaine étape → Claude Design

Cette étude donne la **thèse et la direction**. L'exécution visuelle (moodboard raffiné, écrans
« hero » mobile, composants signature, système d'accents) se fait ensuite dans **Claude Design**
(le design system y est mirroré), puis redescend dans le code (`design-system/`). L'**Artifact
visuel** joint sert de point de départ / brief graphique à emmener dans Claude Design.

**Décisions/pistes à trancher par le Roi** : (a) jusqu'où pousser la signature ambre/indigo comme
actif de marque (logo, accents, marketing) ; (b) prioriser un **écran « hero » mobile** de
référence à designer en premier (candidat : l'espace joueur) ; (c) un **mode marketing/landing**
distinct du in-app, pour la vente (aujourd'hui inexistant).
