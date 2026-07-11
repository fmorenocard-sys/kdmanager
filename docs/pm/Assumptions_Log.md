# Assumptions Log (KD 2997)

Ce fichier liste les hypothèses métier et techniques prises afin de faire avancer le développement en l'absence d'information totale.
# Assumptions Log (KD 2997)

Ce fichier liste les hypothèses métier et techniques prises afin de faire avancer le développement en l'absence d'information totale.

| ID | Date | Hypothèse / Manque d'info | Action ou Impact |
|---|---|---|---|
| A-001 | 2026-02-24 | L'ingestion des données se fait encore manuellement via des exports Excel réguliers. | La "Single Source of Truth" reste les fichiers Excel posés dans le dossier `/public` ou ingérés par un script local en attendant la feature "Upload". |
| A-002 | 2026-02-24 | Les calculs de puissance ou de KP exacts pour le "Deadweight" ne sont pas dynamiquement corrélés à une API de Rise of Kingdoms. | C'est l'officier qui télécharge ces stats, ce qui veut dire que la donnée est un snapshot et non du "temps réel". |
| A-003 | 2026-02-24 | Le rôle de "WARRIOR" n'est pour l'instant utile qu'à l'accès au War Tracker. | Tous les autres dashboards sont supposés "Publics" ou au moins lisibles par tous les membres sans nécessité de log. |
| A-004 | 2026-02-24 | Authentification & Rétention | Hypothèse que proposer un SSO Discord encouragera davantage de joueurs à déclarer leurs disponibilités KvK que de forcer une connexion Google. |
| A-005 | 2026-03-18 | La formule des objectifs KvK mentionne un "Required DKP" pour calculer le Minimum DKP et le DKP Goal. | La formule donnant ce "Required DKP" mathématique en fonction de la puissance n'est pas connue (On connaît uniquement la méthode de calcul du score DKP in-game : `T4 KILLS * 2 + T5 KILLS * 4 + T4 DEAD * 4 + T5 DEAD * 5`). À clarifier avant l'intégration UI. |
| A-006 | 2026-07-11 | F-015 : les fillers (comptes secondaires) font partie de l'archive de chaque campagne au même titre que les comptes principaux. | Le modèle `kvk_history/{kvkId}` embarque `list[]` ET `fillerList[]`. À invalider si le Roi souhaite un historique mains uniquement. |
| A-007 | 2026-07-11 | ✅ **Confirmée par le Roi le 2026-07-11** — F-015 : la vue progression joueur est consultable par tous (cohérent avec A-003). | Pas de restriction de lecture sur `kvk_history`. |
| A-008 | 2026-07-11 | ✅ **Résolue le 2026-07-11** — Dates officielles établies depuis les scans des classeurs et les dossiers Drive : SoC 1 (17/9 → 6/11 2025), SoC 2 (11/12/2025 → 10/1/2026, base scan → Kings Land scan), SoC 3 (13/3 → 1/5 2026, dossier Drive « Heroic Anthem 13_3_2026_1_5_2026 »), SoC 4 en cours (11/6 → 7/7 2026). | Dates stampées dans `kvk_history` et `DATA_CONFIG.KVK` ; affichées dans le sélecteur de campagne. |
