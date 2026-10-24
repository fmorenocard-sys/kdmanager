# Test Plan - KD Manager (V2)

## 1. Introduction
This document outlines the testing strategy for the KD Manager application. The goal is to ensure data accuracy, UI responsiveness, resilient backend synchronization, and proper role-based access management.

## 2. Objectives
- **Verify Data Integrity**: Ensure that data from Excel files is correctly parsed and dispatched to Firestore.
- **Backend Validation**: Test Firestore Security rules and Cloud Function payload endpoints.
- **Authentication & RBAC**: Validate Google and Discord SSO login, and dynamic Role Syncing via Discord tags.
- **UI/UX Validation**: Ensure the interface is responsive, accessible (A11y), and gracefully handles empty states.

## 3. Scope
| In Scope | Out of Scope |
| :--- | :--- |
| All features defined in **SSOT-v2** | Mobile native app behavior (React Native) |
| Serverless data synchronization logic | Discord API downtime (Third Party) |
| Local Firebase Emulator Testing | |
| UI responsiveness on Desktop/Tablet/Mobile Web | |

## 4. Testing Levels
- **L1 - Smoke Test**: Critical path validation (Auth, Data Sync, War Tracker Submission).
- **L2 - Regression**: Full validation of all features and business rules against previous states.
- **L3 - Exploratory**: Edge cases, broken Excel files, interrupted network states.

## 5. Environment & Data
- **Staging/Local Environment**: `firebase emulators:start` (Authentication, Functions, Firestore, Hosting).
- **Production Environment**: Firebase Cloud via Github Actions / manual deploy.
- **Data**:
  - `public/data/` (Legacy mock structures)
  - `test_files/` (Test suite with sample Excel sheets for Top300 and Bank testing).

## 6. Tools
- Manual Execution (Checklist)
- Firebase Local Emulator Suite
- Chrome DevTools (Console errors, Network)
- React Testing Library (If Unit Tests implemented in the future)

## 7. Connected-screen coverage (BUG-008) — opened 2026-08-13, **first authenticated path closed 2026-10-23**

### 7.1 What exists now

The harness signs in **without the real OAuth flow**, emulator only:

1. `npm run emu:seed` (`scripts/seed-emulator.mjs`) writes the fixture set
   (`roles`, `user_profiles` with a two-account claim, `static_data/players`,
   `kvk`, `kvk_filler`, `deadweight`, `trophies`, `kvk_config/current` +
   `timeline`, `kvk_history`, `war_availabilities`), mints a **custom token** for
   the fixture King `test-king-2997` and writes it to `tests/.testlogin.json`
   (gitignored — **never committed**).
2. `src/config/firebase.js` signs that token in when the URL carries
   `?testToken=…`, **and only under `VITE_USE_FIREBASE_EMULATOR=true`** — i.e. only
   in `npm run test:serve`. The bypass does not exist in a production build and
   must stay that way.
3. `playwright.config.js` runs `tests/global-setup.js`, which executes the seed
   before any spec: `npm run test:e2e` is self-sufficient (it used to run
   `emulators:exec "playwright test"` against an **empty** emulator, so every spec
   necessarily ran as Guest).
4. `tests/helpers/login.js` exposes `gotoAuthenticated(page, route, { ready })`.
   Two traps it encapsulates: the `?testToken=` must stay **before** the `#`
   (HashRouter), and sign-in is **asynchronous** — the first paint is the Guest
   screen, so the helper waits for a selector only the connected screen renders.

### 7.2 What is covered

- `tests/fiche.spec.js` — **TC-023 / TC-024 / TC-025** on `/fiche`, which sits
  behind authentication **and** behind a claimed main account. These lock the two
  defects shipped on 22–23 October 2026 (BUG-018 decimal input, BUG-017 step
  gauge). TC-023 was verified to **fail on the pre-fix code**; a regression test
  that does not fall on the broken code protects nothing.
- `tests/routing.spec.js` — the Deadweight/Pilotage path (TC-006) now runs signed
  in. The hub is leadership-only (`leadership: true` in the nav), so that case had
  been failing as Guest ever since the navigation rework, unnoticed because nobody
  looked at the suite.

### 7.3 What remains open

- **WebKit is skipped on every connected spec.** In Playwright's WebKit build on
  Windows the Firestore stream does not resume after sign-in: `[testLogin]
  connecté` is logged, then `onSnapshot` stays silent and the page never leaves
  "Loading Kingdom Data…" (roughly one run in three gets through). Guest screens
  stay covered on all three engines. Worth checking on a real Safari before
  concluding anything about end users: this is Playwright's build, not Safari.
- **The e2e emulator enforces NO security rules — it runs allow-all.** `firebase.json`
  declares `firestore` as an **array** of two database entries (`(default)` and
  `kdmanagerdb`, the same shape that forced `scripts/deploy-rules.cjs` into
  existence); the emulator does not read `rules` from that form and says so on
  every start: *"Did not find a Cloud Firestore rules file specified in a
  firebase.json config file. The emulator will default to allowing all reads and
  writes."* **Measured, not inferred** (2026-10-24): a client write to
  `static_data/players` — which the rules deny to *everyone*, King included —
  **succeeds** under `npm run test:e2e`. Consequence to keep in mind before
  trusting a green suite: **no e2e case can catch an authorization regression**.
  BUG-019, which was precisely a rules denial, would have been invisible here.
  Rules coverage comes from `tests/firestore-rules.test.mjs`, which loads them
  explicitly through `@firebase/rules-unit-testing` and is unaffected. Making the
  e2e emulator load the real rules is worth doing but is **not** a one-line change:
  the array form is deliberate, and `deploy-rules.cjs` depends on it.
- **Fixtures must cover LEGACY data shapes, not only the current one.** Found the
  hard way on 2026-10-24: `hasClaimed()` reads `warGovernorIds`, a field born with
  E-010, which existing `user_profiles` in production do not carry — and both the
  seed and the rules-test fixture already carry it. Every test therefore passed on
  a world that does not exist yet, while real players were refused. When a field
  appears mid-life, a fixture that only has the new shape validates precisely the
  case that works.
- **Other connected screens are still uncovered**: `/me`, `/pilotage` beyond the
  Deadweight tab, published goals, the multi-account declaration state. TC-011 and
  TC-017 (King/Officer assertions, per `tests/rbac.spec.js`'s own inline note) are
  still pending — the harness no longer blocks them, only the specs are missing.
- Representing BR-008's **Discord-verified** state this way remains an open
  assumption — `docs/pm/Assumptions_Log.md` A-042. The fixture user is a Google
  account, so Discord-gated behaviour is not exercised.
- No `emulators_data/` export is committed: the fixtures are **code**
  (`scripts/seed-emulator.mjs`), not a binary snapshot. Deliberate — a script
  stays readable and reviewable in a diff.

See `docs/pm/ProductBacklog.md` BUG-008 and `docs/qa/Playwright_Setup.md`.
