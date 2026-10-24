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
                    ├── globalSetup → tests/global-setup.js
                    │       └── node scripts/seed-emulator.mjs
                    │               └── fixtures + jeton → tests/.testlogin.json
                    ├── Démarre Vite sur :5174 (VITE_USE_FIREBASE_EMULATOR=true)
                    └── Exécute les tests → Rapport HTML
```

Le `globalSetup` est ce qui rend `npm run test:e2e` **autosuffisant**. Avant lui,
`emulators:exec "playwright test"` tournait contre un émulateur **vide** : toutes les
specs s'exécutaient donc en Invité par construction, et aucun écran connecté
n'était couvert — c'est par là que BUG-017 et BUG-018 sont passés.

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

## Jeu de données (Seed) et connexion de test

Les fixtures sont du **code**, pas un instantané binaire : `scripts/seed-emulator.mjs`.
Un script reste lisible et relisible dans un diff, là où un export
`emulators_data/` ne se revoit pas. Il n'y a donc **pas** de dossier
`emulators_data/` dans le dépôt.

```bash
npm run emu:seed        # émulateur déjà démarré ; lancé automatiquement par test:e2e
```

Ce qu'il écrit : `roles`, `user_profiles` (réclamation à deux comptes, war +
filler, avec le miroir plat `warGovernorIds` que lisent les règles du mentorat),
`static_data/players` / `kvk` / `kvk_filler` / `deadweight` / `trophies`,
`kvk_config/current` + `timeline`, `kvk_history`, `war_availabilities`.

Variables d'environnement :

| Variable | Valeurs | Effet |
|---|---|---|
| `SEED_SCENARIO` | `declared` (défaut), `undeclared`, `single`, `offcampaign` | composition des comptes et état des déclarations |
| `SEED_ROLE` | `King` (défaut), `Officer`, `Warrior` | rôle de l'utilisateur de fixtures |
| `SEED_DB` | `kdmanagerdb` (défaut) | base Firestore ciblée |

### Se connecter sans OAuth

Le seed minte un **custom token** pour `test-king-2997` et l'écrit dans
`tests/.testlogin.json` — **gitignoré, jamais committé, jamais journalisé**.
`src/config/firebase.js` le consomme via `?testToken=…`, **et seulement sous
`VITE_USE_FIREBASE_EMULATOR=true`** (donc uniquement en `npm run test:serve`) :
le contournement n'existe pas dans un build de production, et il doit rester
ainsi — ne pas relâcher cette garde pour faire passer un test.

À la main :

```bash
npm run test:serve      # puis ouvrir l'URL OPEN=… imprimée par le seed
```

Dans une spec :

```js
import { gotoAuthenticated } from './helpers/login.js';

// `ready` est OBLIGATOIRE : la connexion est asynchrone, le premier rendu est
// l'écran Invité. On attend un sélecteur que seul l'écran connecté rend.
await gotoAuthenticated(page, '/fiche?gov=123', { ready: '.v2-step' });
```

Deux pièges déjà payés, encapsulés par le helper :

- **HashRouter** — le `?testToken=` doit rester **avant** le `#`. Placé après, il
  atterrit dans la query de la route, `window.location.search` reste vide et la
  connexion ne part jamais.
- **asynchronisme** — attendre la fin de la navigation ne prouve rien.

### Ce que la suite e2e ne couvre PAS : les règles Firestore

L'émulateur de `npm run test:e2e` tourne **sans règles**, en tout-permis. Il le dit
à chaque démarrage : « Did not find a Cloud Firestore rules file specified in a
firebase.json config file — the emulator will default to allowing all reads and
writes ». La cause est la forme **tableau** de la clé `firestore` dans
`firebase.json` (deux bases, `(default)` et `kdmanagerdb` — la même particularité
qui a imposé `scripts/deploy-rules.cjs`) : l'émulateur n'y lit pas `rules`.

**Mesuré, pas supposé** (2026-10-24) : une écriture cliente sur
`static_data/players`, que les règles refusent à **tout le monde** (`allow write:
if false`), **passe** sous `npm run test:e2e`.

À retenir avant de faire confiance à une suite verte : **aucun cas e2e ne peut
attraper une régression d'autorisation**. BUG-019, qui était justement un refus de
règle, y serait resté invisible. La couverture des règles vient de
`tests/firestore-rules.test.mjs` (`npm run test:rules`), qui les charge lui-même
via `@firebase/rules-unit-testing` et n'est pas concerné.

---

### Deux familles de tests dans `tests/`, à ne pas mélanger

`tests/` abrite des specs **Playwright** (`*.spec.js`) et des tests **`node:test`**
(`*.test.mjs` : règles, schémas, parité). Le `testMatch` par défaut de Playwright
attrape `*.test.*` autant que `*.spec.*` — il **importait** donc
`firestore-rules.test.mjs`, dont les appels `node:test` de premier niveau
s'exécutent à l'import : zéro cas Playwright enregistré, mais la suite de règles
rejouée en silence au milieu du run, sur le **même émulateur** que les specs, sa
sortie mêlée à celle de Playwright et ses refus volontaires (cas « ATTAQUE ») très
faciles à prendre pour des erreurs de l'app. D'où le `testMatch: '**/*.spec.js'`
explicite dans `playwright.config.js` — **ne pas le retirer**.

---

### WebKit : écarté des écrans connectés

Dans la build WebKit de Playwright sous Windows, le flux Firestore ne repart pas
après la connexion : `[testLogin] connecté` est bien journalisé, puis `onSnapshot`
reste muet et la page ne quitte jamais « Loading Kingdom Data… » (environ un
passage sur trois aboutit). Les specs connectées portent donc un `test.skip`
explicite sur `webkit` — un test instable est pire qu'un test absent. Les écrans
Invités restent couverts sur les trois moteurs. À vérifier sur un vrai Safari :
ce n'est pas Safari, c'est la build Playwright.

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
