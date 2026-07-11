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
