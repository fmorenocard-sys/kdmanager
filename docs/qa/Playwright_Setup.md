# Guide — Playwright + Firebase Emulator Suite

Ce document décrit comment exécuter la suite de tests E2E de l'application (**Playwright** + **Firebase Local Emulator Suite**).

---

## ⚠️ Prérequis Système : Java

L'émulateur Firestore nécessite **Java JRE/JDK version 11+**.

```bash
java -version   # Doit afficher une version ≥ 11
```

**Si Java n'est pas trouvé :**
- **Windows** : Installez [OpenJDK](https://adoptium.net/) et ajoutez le dossier `bin/` à votre `PATH` (via Paramètres → Variables d'environnement).  
  Redémarrez votre terminal après installation.
- **macOS** : `brew install openjdk`
- **Linux** : `sudo apt install default-jre`

---

## Architecture des tests

```
npm run test:e2e
    └── firebase emulators:exec
            ├── Démarre Auth, Firestore (port 8082), Functions, Hosting
            └── npx playwright test
                    └── Démarre Vite sur :5174 (VITE_USE_FIREBASE_EMULATOR=true)
                            └── Exécute les tests → Rapport HTML
```

---

## 🚨 Étape OBLIGATOIRE avant chaque lancement : Nettoyer les ports

> **Problème récurrent :** Quand les émulateurs Firebase se ferment anormalement (Ctrl+C, crash), le process Java Firestore reste en arrière-plan et bloque le port **8082**. Le lancement suivant échoue avec `Port 8082 is not open`.

### Procédure de nettoyage (PowerShell)

**1. Identifier les PIDs bloquants :**
```powershell
netstat -ano | findstr LISTENING | Select-String ":4000 |:4400 |:4500 |:5000 |:5001 |:8082 |:9099 "
```

**2. Tuer chaque PID listé** (remplacer `XXXX` par le PID affiché) :
```powershell
Stop-Process -Id XXXX -Force
```

**Ou tuer tous les processus Java d'un coup (plus radical) :**
```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
```

**3. Vérifier que les ports sont libres :**
```powershell
netstat -ano | findstr LISTENING | Select-String ":8082 "
# → Doit retourner rien
```

---

## Exécuter les tests

### Mode headless (rapide, idéal CI)
```bash
npm run test:e2e
```

### Mode UI interactif (débogage, enregistrement)
```bash
npm run test:e2e-ui
```

> **Note :** En mode UI, Playwright ouvre son interface graphique. Le navigateur s'ouvre et vous pouvez exécuter les tests pas à pas, voir les snapshots et les traces.

### Émulateurs seuls (sans Playwright)
```bash
firebase emulators:start
# UI disponible sur http://localhost:4000
```

---

## Générer / Mettre à jour le jeu de données (Seed)

Pour des tests déterministes, un jeu de données initial est stocké dans `emulators_data/`.

1. Lancez les émulateurs : `firebase emulators:start`
2. Allez sur `http://localhost:4000` → Firestore → insérez/modifiez les données
3. Dans un second terminal, exportez :
   ```bash
   firebase emulators:export ./emulators_data
   ```

Les prochains tests utiliseront ces données.

---

## Ports utilisés

| Service | Port |
|---|---|
| Firebase Emulator UI | 4000 |
| Emulator Hub | 4400 |
| Emulator Logging | 4500 |
| Firebase Hosting | 5000 |
| Cloud Functions | 5001 |
| Firestore | **8082** |
| Auth | 9099 |
| Vite (app React) | 5174 |

---

## Rapport de test

Après un run headless, le rapport HTML est généré dans `playwright-report/`. Pour l'ouvrir :
```bash
npx playwright show-report
```
