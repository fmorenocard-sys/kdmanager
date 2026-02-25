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
