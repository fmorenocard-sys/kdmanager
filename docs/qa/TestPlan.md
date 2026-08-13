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

## 7. Known gap — fixtures & connected-screen coverage (BUG-008, tracked 2026-08-13)

Authenticated screens (`/me`, `/pilotage`, published goals, multi-account state…)
cannot be previewed or tested today without a real OAuth login (Discord/Google) —
`tests/rbac.spec.js` only asserts the Guest state (`TC-011`/`TC-017` are still
pending a King/Officer authenticated context per that spec's own inline note).
`npm run test:serve` (emulator-backed dev server, port 5174) and `npm run test:e2e`
(Playwright inside `firebase emulators:exec`) already exist, and
`docs/qa/Playwright_Setup.md` documents an emulator seed/export mechanism
(`firebase emulators:export ./emulators_data`) — but no `emulators_data/` fixture
set is committed to the repo. Closing this gap requires (a) a versioned Firestore
fixture set (`roles`, `war_availabilities`, `static_data/kvk` + `kvk_filler`,
`kvk_config/current` + `kvk_config/timeline`, `kvk_history`, multi-account
`user_profiles`) and (b) an auth bypass to sign in as a given role in the
emulator without the real Discord OAuth flow (feasibility of representing
BR-008's Discord-verified state this way is an open assumption — see
`docs/pm/Assumptions_Log.md` A-042). See `docs/pm/ProductBacklog.md` BUG-008.
