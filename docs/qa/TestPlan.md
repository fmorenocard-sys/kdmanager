# Test Plan - KD Manager

## 1. Introduction
This document outlines the testing strategy for the KD Manager application. The goal is to ensure data accuracy, UI responsiveness, and correct parsing of Excel files.

## 2. Objectives
- **Verify Data Integrity**: Ensure that data from Excel files is correctly parsed and displayed.
- **UI/UX Validation**: Ensure the interface is responsive and follows the "Glassmorphism" design.
- **Regression Testing**: Ensure critical features (Dashboard, Bank) work as expected after refactoring (V2).

## 3. Scope
| In Scope | Out of Scope |
| :--- | :--- |
| All features defined in **SSOT-v1** | Mobile native app behavior |
| Data parsing logic | Backend performance (no backend) |
| UI responsiveness on Desktop/Tablet | |

## 4. Testing Levels
- **L1 - Smoke Test**: Critical path validation (App loads, Dashboard displays data, File upload works).
- **L2 - Regression**: Full validation of all features and business rules.
- **L3 - Exploratory**: Edge cases, broken files, weird screen sizes.

## 5. Environment & Data
- **Environment**: Localhost (Chrome/Edge latest).
- **Data**:
  - `public/data/` (Standard set)
  - `test/data/` (Corrupted/Empty files for negative testing - *to be created*)

## 6. Tools
- Manual Execution (Checklist)
- Chrome DevTools (Console errors, Network)
