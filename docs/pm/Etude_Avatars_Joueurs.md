# Étude — Avatars des joueurs : comment ProKingdoms a des images toujours fraîches

> Date : 2026-07-11
> Statut : ✅ Implémentée le 2026-07-11 (option A+B, cascade complète — F-016)
> Demande : comprendre le mécanisme d'avatars de https://beta.prokingdoms.com et remplacer nos 120 JPG statiques (figés depuis février) par des images fraîches.

---

## 1. La découverte clé : les avatars ne sont pas chez ProKingdoms

Les images ne sont **ni produites ni hébergées par ProKingdoms**. Ce sont les avatars officiels des joueurs, hébergés sur le **CDN de Lilith Games** (l'éditeur de Rise of Kingdoms) :

| Domaine | Usage | Exemple |
| :--- | :--- | :--- |
| `imimg.lilithcdn.com` | Avatars anciens + cadres (AvatarFrame) | `…/roc/llc_avatar/64966340/21/12/16/<hash>_800x800.jpg` |
| `plat-fau-global.lilithgame.com` | Avatars récents | `…/p/astc/IM/10043/0/22051874/2026-06-26/<hash>_250x250.jpg` |

Propriétés vérifiées (tests du 2026-07-11) :
- **Accès public direct** : HTTP 200 sans authentification ni protection anti-hotlink (testé sur l'avatar de Pisontije, 45 Ko).
- **URLs immuables et datées** : le chemin contient la date d'upload et un hash. L'URL ne change **que lorsque le joueur change d'avatar** dans le jeu (celle de Pisontije date de déc. 2021, celle de Lazy Cat du 26 juin 2026).
- Conséquence : impossible de « deviner » l'URL depuis un governor ID — il faut une source qui fournit l'URL courante.

## 2. Comment ProKingdoms obtient l'URL courante

1. Des **comptes scanners in-game** interrogent en continu les classements KvK via les serveurs du jeu (les timestamps `latest_update` de leur API montrent des scans à la minute).
2. Le profil de chaque gouverneur renvoyé par le jeu **inclut l'URL de son avatar** sur le CDN Lilith.
3. Leur backend stocke cette URL ; le site la sert telle quelle et le navigateur charge l'image **directement depuis le CDN Lilith**. Aucune image n'est copiée ni re-hébergée.
4. Fraîcheur automatique : chaque scan rapporte l'URL du moment → un changement d'avatar in-game est répercuté au scan suivant.

C'est exactement pourquoi « on n'a jamais trouvé comment ils font » : il n'y a **pas de flux d'images à télécharger** — il y a un flux d'**URLs** rapporté par des scanners in-game (infrastructure que nous n'avons pas et qui viole probablement les ToS du jeu si on la construisait nous-mêmes).

### 2.1 Comment couvrir « tous les royaumes » avec si peu de scanners

1. **Un KvK = une carte de ~32 royaumes.** Les classements in-game du Lost Kingdom sont inter-royaumes : un seul compte présent dans n'importe quel royaume de la carte voit les gouverneurs des 32 royaumes. Leur API est d'ailleurs indexée par `mapId`, pas par royaume. Quelques dizaines de comptes couvrent donc toutes les cartes actives.
2. **Modèle partenaire.** Les royaumes qui veulent un suivi « live » fournissent un compte de scan ou paient (endpoints `live-partners`, offres Premium observées) ; les autres — dont 2997 — héritent gratuitement de la couverture parce qu'ils partagent la carte d'un partenaire, avec une mise à jour quotidienne (00:00 UTC).
3. **Émulation du protocole client, pas d'OCR.** Preuves observées : les URLs d'avatars dans les données (impossibles à extraire d'un screenshot) et les `latest_update` des 32 royaumes espacés de quelques secondes (itération séquentielle automatisée des classements).

## 3. Ce qui est exploitable pour KD Manager (testé)

L'API publique non documentée de ProKingdoms expose ces URLs pendant un KvK :

```
GET https://beta.prokingdoms.com/proxy-fast/stats/kvk/aggregated/<mapId>?isLiveTable=0&pageNumber=N
→ kvkData.kvkDetailsData[] : 100 gouverneurs/page, champs { governor_id, name, kingdom, avatar: { avatar, avatarFrame } }
```

Résultats des tests réels (KvK en cours, mapId 1249539) :
- **100 % des lignes ont un avatar** renseigné.
- **26 joueurs de 2997 récupérés en 7 pages** (Guineapig, Pisontije, Myth, Liwen, Lazy Cat, Cal, Helios, Ayaz…).
- **Rate limit** : HTTP 429 après ~7-8 requêtes rapprochées → un job doit espacer ses requêtes (≥ 2-5 s) et étaler la pagination.
- C'est ce même endpoint que l'équipe avait « bidouillé » en février : `public/data/avatar-source.json` est une réponse brute de l'ancienne version, et les 120 JPG de `public/data/avatars/` en ont été extraits puis téléchargés à la main — d'où leur obsolescence.

## 4. Options

### Option A — Pass « avatars » dans la synchro quotidienne (via ProKingdoms)
`scheduledSync` (existante, 05:00 UTC) gagne une étape : paginer doucement le leaderboard du KvK actif, filtrer `kingdom === 2997`, et **fusionner** les URLs dans un document `static_data/avatars` (`{ governorId: url }` — merge, jamais d'écrasement par du vide). Le front hotlinke l'URL Lilith.
- ✅ Fraîcheur automatique pour les joueurs visibles au leaderboard (~les tops du royaume, précisément ceux qu'on regarde le plus).
- ⚠️ Couverture partielle (pas les petits comptes), dépendance à une API non-officielle qui peut changer sans préavis, rate limits à respecter, actif surtout pendant les KvK.

### Option B — Avatar Discord pour les comptes liés
Le SSO Discord existe déjà : pour tout joueur ayant lié son compte, on connaît son avatar Discord (toujours frais, API officielle, zéro scraping).
- ✅ Légitime, stable, couvre **tous** les joueurs liés (pas seulement les tops), s'améliore mécaniquement avec l'adoption du SSO (déjà encouragée par E-003).
- ⚠️ Avatar Discord ≠ avatar in-game (identité visuelle différente).

### Option C — Statu quo
JPG statiques re-téléchargés à la main de temps en temps. C'est la situation actuelle et sa dette.

### Recommandation : **A + B en cascade**
Priorité d'affichage par joueur : **URL Lilith fraîche (A) → avatar Discord (B) → JPG local existant → logo**. Chaque niveau ne remplit que les trous du précédent. Effort estimé : faible-moyen (le gros de la plomberie — synchro planifiée, `static_data`, composant `Avatar` avec fallbacks — existe déjà).

## 5. Risques & points d'attention

| Risque | Mitigation |
| :--- | :--- |
| ProKingdoms change/ferme son endpoint | Le doc `static_data/avatars` conserve les dernières URLs connues ; dégradation douce vers Discord/local. |
| Rate limit (429) | Pagination espacée (2-5 s), ~10 pages/jour suffisent, gérée en tâche de fond. |
| CDN Lilith bloque le hotlinking un jour | Fallback existant ; option de cacher les images dans Firebase Storage si besoin. |
| Zone grise ToS (API non documentée) | Usage read-only, faible volume, identique à ce que fait le navigateur d'un visiteur. À assumer en connaissance de cause. |
| Vie privée | Ce sont les avatars publics in-game, déjà affichés publiquement par le jeu et ProKingdoms. |

## 6. Prochaines étapes proposées (si option A+B validée)

1. Backend : étape `syncAvatars` dans `runFullSync` (pagination lente + merge `static_data/avatars`), avec le `mapId` du KvK actif en config.
2. Frontend : `Avatar.jsx` lit `static_data/avatars` (via DataContext) avant le mapping local.
3. Bot Discord : les embeds `/mystats` peuvent afficher l'avatar en `thumbnail` (même source).
4. QA : cas de test fallback (URL morte → Discord → local → logo).
