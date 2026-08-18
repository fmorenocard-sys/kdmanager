# Arbitrage — Partenariat ProKingdoms vs solo (go-to-market)

> Date : 2026-08-13 · Auteurs : `commercial` (arbitrage principal) + `product-manager` (§5,
> dimension produit) · Statut : **arbitré, validé par le Roi**
> Question posée par le Roi : proposer un **partenariat** au fondateur de ProKingdoms (avec une
> proposition de valeur), ou continuer **en solo** à chercher des royaumes intéressés ?

> **Nature du document** : arbitrage commercial figé, pas une étude exploratoire. Il ne rouvre
> aucune décision acquise (`Etude_Commercialisation_SaaS.md` §0/§8bis) — il tranche une question
> nouvelle (l'opportunité d'un partenariat de distribution) à la lumière de ces décisions.

---

## Verdict

**Non, pas maintenant.** Le partenariat ProKingdoms est une option **conditionnelle et différée**,
pas une alternative à trancher aujourd'hui contre le solo. Les deux options de la question ne sont
pas symétriques : « solo + royaumes intéressés » **est déjà la décision 1 du Roi** (freemium, pas
de démarchage à froid, `Etude_Commercialisation_SaaS.md` §0), **en cours d'exécution** sur le
pilote KD 3341. « Partenariat ProKingdoms » est une **initiative nouvelle et non cadrée**, à évaluer
comme n'importe quel nouveau chantier — au coût, au risque, et au moment où elle rapporte le plus.

---

## 1. Ce qu'un partenariat apporterait vraiment — et ce qu'il coûte

**Ce qu'on achèterait :**

- **Distribution.** ProKingdoms a un public déjà là (rois qui paient déjà 7,99-35 €/mois pour leurs
  scans, `Etude_Commercialisation_SaaS.md` §5bis/§6). C'est le seul actif qu'un partenariat apporte
  vraiment — le reste, on peut se le construire nous-mêmes.
- **Crédibilité.** Un tiers établi qui nous recommande réduit la friction de confiance d'un outil
  inconnu. Réel, mais marginal tant qu'on n'a **aucun** client payant à montrer.
- **Données.** Ils sont déjà notre fournisseur (décision 2 du Roi). Un partenariat *pourrait*
  légitimer la fourniture de scans à l'échelle — mais voir §6, ce bénéfice a un revers sérieux.

**Ce que ça coûte, et c'est plus lourd que le bénéfice à ce stade :**

- **Dépendance stratégique aggravée.** ProKingdoms est déjà « fournisseur ET concurrent » (§4 de
  `Etude_Commercialisation_SaaS.md`). Un partenariat formaliserait cette dépendance sur le canal de
  vente **en plus** de la donnée — s'ils se retirent ou changent les termes, on perd distribution
  *et* données d'un seul coup. C'est le pire scénario pour un fondateur solo : deux jambes cassées
  par le même acteur.
- **Risque de copie.** Notre wedge documenté (`Etude_Differenciation_Visuelle.md` §2, « observatoire
  vs console ») est une **couche produit** (agir, pas seulement regarder) — pas une technologie
  protégée. Leur montrer que cette couche convertit des royaumes payants, alors qu'ils ont déjà
  l'infra de scan et l'audience, revient à leur donner le business case pour la construire
  eux-mêmes. Un observatoire qui ajoute une couche d'action (déclarations, rôles, banque) est un
  chantier crédible pour une équipe déjà établie — bien plus facile pour eux de nous copier que pour
  nous de construire leur scan.
- **Rapport de force nul.** On négocierait avec **zéro royaume payant** (A-032 non levée) et **un
  seul pilote gratuit**. Aucun levier de négociation : on demanderait à un acteur plus gros de parier
  sur une thèse commerciale qu'on n'a pas encore prouvée nous-mêmes. Dans ce rapport de force, la
  valeur cédée dans n'importe quel accord (revenue share, exclusivité, conditions d'accès) penche
  structurellement de leur côté.

---

## 2. Cohérence avec les décisions acquises

**Est-ce du démarchage à froid déguisé ?** Pas littéralement — la décision 1 (« pas de démarchage à
froid ») visait les rois-clients, pas un partenaire B2B. Mais l'esprit de la décision tient quand
même : elle dit *ne pas dépenser le temps rare du fondateur sur une sollicitation avant que la
valeur et le paiement soient prouvés*. Pitcher ProKingdoms aujourd'hui, c'est exactement ça —
solliciter avant la preuve, juste un cran plus haut dans la chaîne (le partenaire au lieu du client
final).

**Est-ce prématuré au regard de A-032 ?** Oui, directement. Le chemin critique déjà acté est :
*tester la disposition à payer sur 3341 avant tout engagement lourd* (`Etude_Commercialisation_SaaS.md`
§8bis, A-032). Un partenariat ProKingdoms est un engagement lourd — négociation multi-semaines,
exposition de la roadmap, dépendance nouvelle — pour un gain qui ne résout **aucune** des inconnues
actuelles (le prix tient-il ? le tier gratuit convertit-il ?). Il ajoute de la distribution à un
entonnoir de conversion non prouvé. Recruter plus de trafic vers un entonnoir non validé n'est pas
un gain, c'est un déplacement du problème.

**Précédent direct** : `Etude_Industrialisation_Onboarding.md` §7 pose exactement le même garde-fou
pour la voie multi-tenant — *ne pas engager avant signal de demande et de paiement confirmé*. Un
partenariat de distribution appelle la même discipline : il n'a de sens qu'une fois qu'on sait faire
payer, et qu'on peut absorber un afflux de clients (l'industrialisation de l'onboarding n'est même
pas prête pour 10 royaumes/mois en solo, §7 du même document — un partenariat qui amènerait un
afflux nous casserait avant qu'on puisse le servir).

---

## 3. L'alternative solo — état des lieux, pas un nouveau choix

« Continuer en solo et chercher des royaumes intéressés » **n'est pas une alternative à arbitrer** —
c'est la décision 1 du Roi (2026-07-24), déjà en exécution : pilote gratuit sur 3341, freemium,
frontière gratuit/premium figée (§8bis de `Etude_Commercialisation_SaaS.md`). Le seul vrai sujet
ouvert dessus, c'est **où on en est** :

- Pilote 3341 : déployé, KvK en cours (31/07 → 19/09/2026).
- **A-032 (disposition à payer) : non levée.** Le test le moins cher — demander à 3341 après
  quelques semaines d'usage s'il paierait 25-30 $ — n'est pas documenté comme fait à ce jour.
- Chercher *plus* de royaumes intéressés avant d'avoir ce signal reproduirait l'erreur déjà nommée
  dans l'étude industrialisation : accumuler du volume gratuit avant de savoir si le modèle
  convertit (`Etude_Commercialisation_SaaS.md` §8 objection 2, coût par royaume gratuit non nul).

Donc la vraie question n'est pas « solo ou partenariat », c'est : **est-ce qu'on ferme d'abord la
boucle A-032, ou est-ce qu'on ouvre un nouveau chantier de distribution avant ?** La réponse, du
point de vue coût/bénéfice, est de fermer A-032 d'abord — ça coûte une conversation avec le Roi de
3341, pas une négociation B2B.

---

## 4. Séquencement — maintenant / préalable / déclencheur

**Maintenant (coût ≈ 0, déjà décidé) :**
1. Terminer le pilote 3341, poser la question de paiement (25-30 $/mois) — chemin critique déjà
   acté, rien à ajouter à cet arbitrage.
2. Ne pas contacter ProKingdoms pour un partenariat.

**Condition préalable à toute conversation ProKingdoms :**
- **A-032 levée positivement** — au moins un royaume qui a dit oui au prix, idéalement 2-3 pour un
  motif (pas un seul point de donnée).
- Un minimum d'outillage d'onboarding (voie A/C, `Etude_Industrialisation_Onboarding.md`) pour ne
  pas se faire déborder si un partenariat amène un afflux qu'on ne peut pas absorber en solo.
- Les blocages légaux déjà identifiés (RGPD, lecture publique de données tierces — A-044 à A-049,
  notés « bloquant avant l'ouverture commerciale » dans `ChangeLog_Strategique.md` du 2026-08-13)
  réglés ou au moins en cours — se présenter à un partenaire avec des CGU/politique de
  confidentialité inexistantes est un mauvais signal de sérieux, en plus du risque réel.

**Signal déclencheur d'un contact ProKingdoms, le moment venu :**
- Pas un « partenariat » large d'emblée. Une demande **ciblée et à faible risque** une fois qu'on a
  des clients payants à montrer : intégration BYO officielle (comme la piste API Rise of Stats déjà
  notée en `Etude_Commercialisation_SaaS.md` §4) ou co-marketing léger (mention croisée), **pas**
  revente/marque blanche qui les rendrait gatekeeper de notre canal (voir aussi §5 — jamais de
  marque).
- À ce moment-là seulement, on négocie avec un actif réel en main (X royaumes payants, taux de
  conversion mesuré) — le rapport de force change du tout au tout.

---

## 5. Dimension produit — arbitrage conjoint commercial + produit

**Convergence avec le PM, à figer explicitement.** Le wedge du produit n'est pas visuel, il est de
*nature* : **console qu'on opère vs observatoire qu'on regarde** (`Etude_Differenciation_Visuelle.md`
§2/§4). Ce positionnement repose sur une **posture propre** (action-first, calme, retenue — §4 de
cette étude), délibérément différente du spectacle des observatoires établis, ProKingdoms inclus
(§1 du même document : « Dashboard de jeu + scans », dark gaming, art de jeu, or).

**Un co-branding ou une marque partagée avec ProKingdoms diluerait directement ce wedge.** Si
l'utilisateur perçoit KD Manager comme *une extension de ProKingdoms* plutôt que comme un produit
distinct qui *fait agir* son royaume, la différenciation de nature (observatoire vs console)
s'efface derrière une simple affiliation visuelle — exactement le terrain où ProKingdoms gagne déjà
(§3 de l'étude différenciation : « ne pas courir après leur data-viz, ce n'est pas notre jeu »). Un
partenariat marqué transformerait KD Manager en accessoire de leur observatoire plutôt qu'en console
autonome.

**Règle à tenir, quelle que soit la forme future d'un contact ProKingdoms** : toute relation
éventuelle doit rester une **couche data/technique** (intégration BYO, format d'export, API) —
**jamais une couche de marque** (co-branding, logo commun, mention « propulsé par », revente sous
leur nom). C'est une ligne rouge produit autant que commerciale : elle protège à la fois le wedge
(§4 de `Etude_Differenciation_Visuelle.md`) et l'indépendance de négociation (§1 de cet arbitrage).

---

## 6. Angles morts

- **A-029 (CGU ProKingdoms) — nuance importante : le partenariat ne le résout pas gratuitement, il
  peut l'aggraver.** Aujourd'hui on est dans une zone grise tolérée (usage personnel d'un abonnement
  pour scanner des tiers, cf. `Etude_Commercialisation_SaaS.md` §5bis « Point 2 — capacité ≠
  permission »). **Poser la question formellement à ProKingdoms dans le cadre d'un pitch de
  partenariat revient à transformer une tolérance implicite en refus explicite** — ce qui fermerait
  la tactique d'amorçage (« le Roi scanne pour toi », modèle B) qu'on utilise activement aujourd'hui
  sur 3341. Si le sujet doit être clarifié, ce n'est **pas** par une ouverture de partenariat, c'est
  **uniquement par une lecture factuelle et discrète des CGU publiques** (déjà recommandée par
  A-029/A-030, effort faible) — sans jamais exposer notre roadmap commerciale ni solliciter une
  réponse écrite de leur part qui nous engagerait. Je ne suis pas juriste : cette lecture reste à
  faire valider par l'angle légal déjà engagé (`docs/legal/`).
- **Dépendance à un concurrent-partenaire** — développée en §1, c'est le risque le plus structurant :
  ne pas le sous-peser au motif que « ça débloquerait la distribution ».
- **Timing** — le produit n'est même pas prêt commercialement au sens strict (multi-tenant non
  engagé, docs légaux non rédigés, prix non validé). Discuter partenariat avant d'avoir un produit
  vendable et conforme, c'est vendre une promesse à quelqu'un qui a largement les moyens de la
  construire lui-même.

---

## Ce qui relève de moi (commercial) vs du Roi

- **Tranché ici** : le séquencement (A-032 d'abord, partenariat différé), la lecture du rapport de
  force, et la ligne rouge « jamais de marque » côté produit (convergente avec le PM) — c'est notre
  terrain (marché/argent + différenciation produit).
- **Reste au Roi** : la décision finale de ne jamais/toujours écarter ProKingdoms comme partenaire
  (choix de dépendance stratégique, engage sa vision du produit) ; l'arbitrage risque légal (CGU)
  une fois l'angle légal instruit ; le go final sur toute reprise de contact avec ProKingdoms le
  moment venu, vu que c'est son temps de fondateur solo qui serait engagé.
- **Renvoi au PM** : si un jour l'intégration BYO officielle (API-first, cf. §4 de
  `Etude_Commercialisation_SaaS.md`) devient la forme retenue d'un contact ProKingdoms, ce sera un
  chantier d'adaptateur de scan à cadrer avec le PM — hors périmètre de cet arbitrage.

---

## Sources

`Etude_Commercialisation_SaaS.md` (§0 décisions du Roi, §4 fournisseurs de scans, §5 concurrence,
§5bis point 2 « capacité ≠ permission », §6 prix, §8bis décision packaging/prix) ·
`Etude_Industrialisation_Onboarding.md` (§7 verdict de faisabilité, garde-fou demande/paiement
confirmés) · `Etude_Differenciation_Visuelle.md` (§2/§4 wedge « observatoire vs console », posture
action-first) · `Assumptions_Log.md` A-029, A-030, A-032, A-050, A-051 · `ChangeLog_Strategique.md`
2026-08-13 (blocages légaux RGPD, A-044 à A-049).
