# Test Pack - KD Manager - v2.1

## Test Suite TS-001: Dashboard (F-001)

### TC-001: Initial Dashboard Load
- **Requirements**: F-001, BR-004
- **Priority**: P0 (Smoke)
- **Preconditions**: Application is deployed. Firestore has valid `player_data`.
- **Steps**:
  1. Open the application URL (`/`).
  2. Verify the Dashboard view loads.
  3. Check for specific statistics: "Total Power", "Total Kills".
- **Expected Result**: Dashboard loads without errors. Key metrics are displayed and non-zero.

### TC-002: Top 300 Data Accuracy
- **Requirements**: F-001, D-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. Open Dashboard.
  2. Locate the "Top Players" table.
  3. Compare the displayed Power value with the source data.
- **Expected Result**: The displayed Power matches the cloud DB data exactly.

### TC-003: Dashboard Filtering & Search
- **Requirements**: F-007, P-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. Enter a known player name in the Search bar.
  2. Verify the table filters to show only matching players.
  3. Select an Alliance from the dropdown.
  4. Verify only players from that alliance are shown.
- **Expected Result**: Table updates dynamically based on search and filter inputs.

## Test Suite TS-002: Bank (F-003)

### TC-004: Bank Monitoring Load
- **Requirements**: F-003, BR-003
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to "Bank" page (`/bank`).
  2. Verify "Current Stock" cards are displayed.
  3. Check if resource values (Food, Wood, Stone, Gold) are populated.
- **Expected Result**: Resource values are displayed. No "undefined" or errors.

## Test Suite TS-003: Data Ingestion Cloud Sync (F-005)

### TC-005: Valid File Upload via Cloud Function
- **Requirements**: F-005, BR-001, BR-005
- **Priority**: P0 (Smoke)
- **Preconditions**: User has Officer/King role. Have a valid local `Top 300 [Date].xlsx` file.
- **Steps**:
  1. Click "Update Data" or drag-and-drop the file onto the drop zone.
  2. Wait for the success notification.
  3. Verify the Dashboard updates with the new data.
- **Expected Result**: File is sent via base64, processed by the cloud function successfully, and the dashboard reflects changes immediately.

### TC-018: Ingestion Size Limits (E-003)
- **Requirements**: E-003
- **Priority**: P1 (Regression)
- **Preconditions**: File size > 10MB.
- **Steps**:
  1. Click "Update Data" and provide a large file exceeding 10MB.
  2. Observe the UI response.
- **Expected Result**: The UI shows an explicit error that the file is too large before or gracefully after the request is rejected by Cloud Functions.

## Test Suite TS-004: Deadweight Tracking (F-002)

### TC-006: Deadweight Load & Metrics
- **Requirements**: F-002, BR-006, D-004
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to `/deadweight`.
  2. Validate "Reducible Power" card excludes specific status (Migrated, Pardon, etc).
- **Expected Result**: Page loads. Card values match the sum of "Reducible" rows.

## Test Suite TS-005: KvK Performance (F-008)

### TC-007: KvK Page Load & Data
- **Requirements**: F-008, P-005, D-005
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to `/kvk`.
  2. Verify "Fighting Performance" title and summary cards (Dead, Power Diff, KP Gained).
  3. Sort by "KP Gained" (Desc). Verify highest gained is at top.
- **Expected Result**: Summary stats match DB totals. Sorting works correctly.

## Test Suite TS-006: Discord & Auth (F-009, F-010)

### TC-008: Direct Discord SSO Login
- **Requirements**: F-009, E-001
- **Priority**: P0 (Smoke)
- **Steps**:
  1. Click 'Login with Discord' in the sidebar while completely unauthenticated.
  2. Follow Discord OAuth2 prompt.
  3. Upon redirect, observe the UI to be logged in.
  4. Ensure a fallback `user_profiles` profile isn't crashing the UI.
- **Expected Result**: User is successfully authenticated via `customToken` and lands on the dashboard.

### TC-009: Background Role Sync
- **Requirements**: F-010, BR-003
- **Priority**: P0 (Smoke)
- **Steps**:
  1. Log in via Discord SSO as a known 'Officer' on the KD 2997 server.
  2. Check the Context Role in the App UI (e.g. Can view War Dashboard).
- **Expected Result**: The Cloud Function synchronously queries Discord and sets the precise role, granting appropriate UI elements without manual intervention.

### TC-010: Manual 'Sync Roles' Button
- **Requirements**: F-010, E-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to `/profile`.
  2. Click the 'Sync Roles' button under the Linked Accounts segment.
  3. Wait for the loading spinner to complete.
- **Expected Result**: A success toast confirms the roles are updated. If user is SSO without a DB profile, the fallback native parsing logic succeeds.

## Test Suite TS-007: War Tracker (F-011, F-012, F-013)

### TC-011: Admin Set New Campaign
- **Requirements**: F-013, R-004
- **Priority**: P1 (Regression)
- **Steps**:
  1. Login as King. Navigate to `/war-tracker`.
  2. Open "KvK Config" tab.
  3. Enter a new Campaign Name (e.g., 'SoC 4') and dates, then click Save.
- **Expected Result**: The active campaign updates successfully in `kvk_config/current`.

### TC-012: Form Declaration Submission
- **Requirements**: F-011, R-002, BR-004
- **Priority**: P0 (Smoke)
- **Steps**:
  1. Login as Warrior. Navigate to `/war-tracker`.
  2. Fill out march counts, tech levels, and available time slots.
  3. Submit form.
- **Expected Result**: Data is stored securely in `war_availabilities` bound to the active `kvkId`. Re-loading the page shows the "Already submitted" form state.

### TC-013: Officer War Dashboard Aggregation
- **Requirements**: F-012, R-003
- **Priority**: P1 (Regression)
- **Steps**:
  1. Login as Officer. Navigate to `/war-tracker` -> `Dashboard`.
  2. Verify the global metrics visually display the cumulative number of assigned marches and Siege counts.
- **Expected Result**: The War Dashboard accurately reads `war_availabilities` submissions and presents a high-level table of combat readiness per timezone.

### TC-017: Form Missing Campaign (E-002)
- **Requirements**: F-011, E-002
- **Priority**: P1 (Regression)
- **Steps**:
  1. Login as Warrior. Ensure NO active KvK campaign is set.
  2. Navigate to `/war-tracker`.
  3. Verify the form is NOT displayed.
- **Expected Result**: A placeholder/warning screen is shown indicating no active campaign, preventing submission.

## Test Suite TS-008: Kingdom Trophies (F-004)

### TC-014: View Historical Trophies
- **Requirements**: F-004, P-004
- **Priority**: P2 
- **Steps**:
  1. Navigate to `/trophies`.
  2. Verify past winners for Zenith and MGE are displayed in cards/lists.
- **Expected Result**: Trophies load correctly without errors.

## Test Suite TS-009: Player Detail View (F-006)

### TC-015: Open Player Detail Panel
- **Requirements**: F-006, P-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to `/` (Dashboard).
  2. Click on any player row in the Top 300 table.
- **Expected Result**: A side panel opens displaying detailed combat, economy, and note metrics for the specific player.

## Test Suite TS-010: Multi-Language i18n (F-014)

### TC-016: Switch UI Language
- **Requirements**: F-014
- **Priority**: P1 (Regression)
- **Steps**:
  1. On any page, open the language selector in the navbar.
  2. Switch from 'EN' to 'FR'.
  3. Verify static UI text translates.
- **Expected Result**: UI renders in the chosen language immediately without reloading. Game terms remain in EN if configured so.
