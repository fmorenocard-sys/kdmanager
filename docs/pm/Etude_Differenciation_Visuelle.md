# Étude — Différenciation face à la concurrence (recadrée)

> Date : 2026-08-11 · Auteur : PM/Design · Statut : **recadrée après challenge du Roi**
> Question initiale : comment se **démarquer visuellement** ? · Conclusion honnête : **le visuel
> n'est pas le wedge** — la vraie différence est de *nature* (observatoire vs console).
> Livrable jumeau : **Artifact** — https://claude.ai/code/artifact/f6c8abe6-ae0b-4fc4-b4e2-def4260d0269
> (source `scratch/etude-visuelle.html`).

---

## 0. Recadrage & honnêteté (ce qui a changé)

La **v1** de cette étude cherchait une différenciation **visuelle** et concluait « eux = exports
Excel / dashboards dorés, nous = vraie app ». **Le Roi a challengé, à raison**, captures à l'appui :

- Mon audit de **ROKStats** jugeait leur **site marketing** (`rokstats.com`, qui vend du scan/CSV),
  pas leur **app réelle** (`app.rokstats.online`). L'app est un **observatoire soigné, sombre, à
  cartes, sparklines colorées sémantiques, radar de notes par royaume, historique des rois**.
  Sur la **data-viz, ils sont probablement devant nous**. Le verdict v1 « tableur déguisé » était
  **faux**.
- Conséquence : **l'écart visuel avec ROKStats est petit**, et se différencier **par le look seul
  est un wedge faible** quand un concurrent est déjà bon. On enterre l'angle.

Ajout demandé : **HeroScroll** (`heroscroll.com`, « Game Statistics & Rankings », dashboards KvK
par id de carte) — encore un **observatoire** de stats/classements. *(Détails visuels non capturés
cette session : app JS, non rendue par la collecte ; nature confirmée par le positionnement.)*

---

## 1. Le paysage, recadré : une catégorie d'**observatoires**

| Acteur | Nature | Ce qu'on y fait | Finition visuelle |
| :--- | :--- | :--- | :--- |
| **ROKStats** | Observatoire analytique profond | Regarder stats/notes/rangs de **n'importe quel** royaume/gouverneur | **Élevée** (sparklines, radar, cartes) — ≥ nous |
| **HeroScroll** | Observatoire KvK | Consulter le dashboard d'**un** KvK par id | Dashboard data (non capturé en détail) |
| **ProKingdoms** | Dashboard de jeu + scans | Suivre Live KvK / Past Battles | Dark gaming, art de jeu, or |
| **Rise of Stats** | Observatoire + API | Scans, analytics, intégrations | Dashboard sombre générique |
| **ROK Steward** | Générateur de **rapports** | Uploader → générer Excel/PDF | Rapport, feux tricolores |

**Constat** : la catégorie est peuplée d'**outils de lecture** — on y **regarde** de la donnée *sur*
des royaumes, gouverneurs, KvK. Le meilleur d'entre eux (ROKStats) est **déjà très soigné**.
Prétendre gagner sur « le plus beau dashboard analytique » serait malhonnête.

## 2. La vraie différence — de nature, pas de pixels

Le point que le challenge du Roi a fait émerger : **KD Manager n'est pas dans la même catégorie.**

| | **Observatoires** (ROKStats, HeroScroll, Rise of Stats…) | **KD Manager** |
| :--- | :--- | :--- |
| Verbe | **Regarder** | **Agir** |
| Objet | N'importe quel royaume (public, global) | **Ton** royaume (privé, tes membres) |
| Contenu | Stats, notes, rangs, historiques | Déclarations, objectifs, rôles, coordination |
| Rôles | Aucun (lecture pour tous) | **RBAC** (King/Officer/Warrior), synchro Discord |
| Action | Consulter, exporter | Déclarer sa dispo, assigner, pinger, gérer banque/deadweight/course |
| Métaphore | Une **lunette astronomique** | Un **poste de pilotage** |

> ROKScroll & consorts te font **regarder** les chiffres de ton royaume. KD Manager fait **agir**
> ses membres. Ils ne laisseront jamais un warrior déclarer sa présence à la prochaine bataille —
> c'est *tout* notre produit. C'est le positionnement « couche 3 / gestion » de
> `Etude_Commercialisation_SaaS.md`, enfin nommé correctement : **observatoire vs console de
> commandement.**

## 3. Le visuel = table-stakes, pas le wedge

Puisque la catégorie est déjà visuellement bonne, le rôle du design change :

- **Objectif visuel = ne pas avoir l'air *pire*** : propre, sobre, lisible, **mobile**. On l'est
  déjà (design system v2, glass slate, thème clair/sombre, i18n/RTL).
- **Ne PAS courir après leur data-viz** (radars de notes, sparklines partout). Ce n'est pas notre
  jeu — c'est le leur, et ils le gagnent. On n'a pas besoin de le gagner.
- Notre socle v2 est **suffisant** comme table-stakes. Aucune refonte visuelle justifiée.

## 4. La seule signature design qui tient : la **posture « action-first / operator »**

Il reste **un** territoire design réellement à nous — non pas une palette, mais une **posture**,
qui découle du fait qu'on est une console et pas un observatoire :

- **L'action d'abord.** L'écran s'ouvre sur « **ma prochaine action** » (déclarer si pas fait →
  prochain jalon + countdown → mon % objectif), pas sur un mur de graphes. Un **CTA clair**, pas
  une contemplation.
- **Le perso avant le global.** « Moi / mon royaume » d'abord (cf. brief `Espace Joueur`), le
  classement mondial n'est pas le sujet.
- **Calme et focalisé.** Là où eux misent sur le **spectacle** (trophées 3D, radars, prose épique
  « Sang, gloire… », cadres d'art de jeu), on tient la **retenue** : un outil qu'on *opère*, pas
  un spectacle qu'on *admire*. La sobriété **est** le contraste.

C'est cohérent avec E-009 (« Mon jeu ») et le brief Espace Joueur : le design ne cherche pas à
être plus joli, il rend l'**action** évidente.

## 5. Ce qu'on ne fait PAS

- Pas de course à la data-viz (radars, sparklines partout) — le terrain de ROKStats.
- Pas de refonte du design system : v2 suffit comme table-stakes.
- Pas d'art de jeu / spectacle : la retenue est le parti pris.
- Pas de survendre « on est plus beau » : ce serait faux et ça ne vend rien.

## 6. Conclusion & prochaine étape

**Le wedge n'est pas design, il est produit** : opérer son royaume (déclarations, objectifs,
rôles, coordination Discord) — ce que les observatoires ne font pas. **Le design sert la posture**
(action-first / operator), il ne porte pas la différenciation à lui seul.

- **Claude Design** : exécuter la **posture action-first** sur l'écran le plus emblématique —
  l'**espace joueur** (brief déjà écrit). C'est là que « on opère, on ne regarde pas » devient
  visible.
- **Décisions pour le Roi** : (a) valider le recadrage (visuel = table-stakes, wedge = job) ;
  (b) l'espace joueur action-first comme premier écran à designer ; (c) un mode marketing/landing
  qui raconte « console vs observatoire », distinct de l'in-app.

*(La v1 « on casse le cliché de l'or / on est plus beau » est abandonnée — elle reposait sur une
lecture erronée de ROKStats, corrigée grâce au challenge du Roi 2026-08-11.)*
