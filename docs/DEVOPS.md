# DevOps Strategy — Kingdom Manager (KD 2997)

> Last updated: 2026-02-24 | App version: 1.0.0

## Architecture: Firebase Full-Stack (SPA + Serverless)

The app uses a **Firebase-first, serverless** architecture split into three tiers:

| Tier | Service | Role |
|------|---------|------|
| Frontend | Firebase Hosting | Serves the Vite/React SPA (`dist/`) |
| Backend | Cloud Functions (Node.js) | XLSX parsing, data sync trigger |
| Database | Cloud Firestore | Persistent player/war/bank data |
| Auth | Firebase Auth (Google Sign-In) | Role-based access (King / Officer / Warrior) |

**Firebase project ID:** `kd-97-manager`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | 19 / 7 |
| Styling | TailwindCSS v4 + PostCSS | 4.x |
| Routing | React Router DOM | v7 |
| Charts | Recharts | 3.x |
| Icons | Lucide React | latest |
| i18n | i18next + react-i18next | 25/16 |
| XLSX parsing | xlsx (SheetJS) | 0.18 |
| Firebase SDK | firebase | 12.x |

**Supported languages:** EN · DE · TR · UK · AR · PL · ES · VI

---

## Pages / Screens

| Route | Page | Auth Required |
|-------|------|--------------|
| `/` | Dashboard | ✅ |
| `/performance` | KvK Performance | ✅ |
| `/trophies` | Kingdom Trophies | ✅ |
| `/deadweight` | Deadweight Tracking | ✅ |
| `/bank` | Kingdom Treasury | ✅ |
| `/war` | War Tracker | ✅ |
| `/profile` | My Profile | ✅ |

---

## Data Flow

```
Officer uploads XLSX
    ↓
Firebase Cloud Function (HTTP trigger)
    ↓
Parses XLSX (SheetJS) → validates → writes Firestore
    ↓
React app reads Firestore in real-time
```

The `digest-data.js` script (local) and the Cloud Function both handle XLSX → Firestore ingestion.

---

## Deploy Commands

### Frontend
```bash
npm run build          # Vite build → dist/
firebase deploy --only hosting
```

### Functions
```bash
firebase deploy --only functions
```

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Full deploy
```bash
firebase deploy
```

---

## CI/CD Status

> ⚠️ No automated CI/CD pipeline is configured yet (`.github/workflows/` is empty).
> Manual deploy via Firebase CLI is the current practice.

**Recommended next step:** Add a GitHub Actions workflow:
- Trigger: push to `main`
- Steps: `npm ci` → `npm run build` → `firebase deploy --only hosting`

---

## Environments

| Environment | Description |
|-------------|-------------|
| `local` | `npm run dev` (Vite dev server, port 5173) |
| `prod` | `kd-97-manager.web.app` (Firebase Hosting) |

No staging environment is currently configured.

---

## Secrets & Config

- Firebase config is read from environment variables (`.env`)
- `.env.example` is provided for onboarding
- Secrets must **never** be committed to Git

---

## Rollback

Firebase Hosting keeps a deployment history. To rollback:
```bash
firebase hosting:clone kd-97-manager:live kd-97-manager:live --version <VERSION_ID>
```
Or via Firebase Console → Hosting → Release History → Rollback.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SPA 404 on direct URL | Handled by `"rewrites": [{ "source": "**", "destination": "/index.html" }]` in `firebase.json` |
| Firestore permission denied | Check `firestore.rules` — roles are stored as Firebase custom claims |
| Function cold start | Functions may take 1–3s on first call; acceptable for manual sync actions |
| XLSX parse error | Validate sheet names and column order match `src/config.js` mappings |
