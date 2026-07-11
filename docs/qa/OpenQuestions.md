# Open Questions & Ambiguities - QA

## 1. F-004 Kingdom Trophies
- **Question** : Où sont stockées les données des Trophées ? Est-ce manuel ou dynamique depuis le jeu ? (Hypothèse : Données lues depuis Firebase Firestore, saisies manuellement par le Roi).

## 2. F-006 Player Detail View
- **Question** : Le Panel de détail joueur s'ouvre-t-il sur chaque page où le nom du joueur apparaît (Dashboard, Deadweight, KvK) ou uniquement sur le Dashboard principal ? (Hypothèse : Uniquement sur Dashboard pour le moment).

## 3. E-003 Ingestion Size Limit
- **Question** : Que se passe-t-il si le payload dépasse 10MB ? L' UI affiche-t-elle une erreur explicite avant ou après l'envoi ? (Hypothèse : L'erreur est catchée par la Cloud Function et une erreur 500/Payload Too Large est retournée et affichée en Toaster sur le front).

## 4. Stratégie d'automatisation
- **Question** : Devons-nous mettre en place les Github Actions pour exécuter Playwright sur chaque Pull Request ?
