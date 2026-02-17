# Test Pack - KD Manager - v1.0

## Test Suite TS-001: Dashboard (F-001)

### TC-001: Initial Dashboard Load
- **Requirements**: F-001, BR-004
- **Priority**: P0 (Smoke)
- **Preconditions**: Application is deployed or running locally. Default data files exist in `/public/data`.
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
  2. Scroll to the "Top Players" table.
  3. Identify the #1 player.
  4. Compare the displayed Power value with the source Excel file (`Top 300...xlsx`).
- **Expected Result**: The displayed Power matches the Excel data exactly.

### TC-009: Dashboard Filtering & Search
- **Requirements**: F-007, P-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. Enter a known player name in the Search bar.
  2. Verify the table filters to show only matching players.
  3. Select an Alliance from the dropdown.
  4. Verify only players from that alliance are shown.
- **Expected Result**: Table updates dynamically based on search and filter inputs.

### TC-010: Kingdom Evolution Chart
- **Requirements**: F-001, BR-004
- **Priority**: P2 (Full)
- **Steps**:
  1. Locate the "Kingdom Evolution" chart.
  2. Hover over data points.
  3. Verify both Power (Blue) and KP (Red) values are displayed in the tooltip.
- **Expected Result**: Chart displays dual axes and correct data points.

## Test Suite TS-002: Bank (F-003)

### TC-003: Bank Monitoring Load
- **Requirements**: F-003, BR-003
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to "Bank" page (`/bank`).
  2. Verify "Current Stock" cards are displayed.
  3. Check if resource values (Food, Wood, Stone, Gold) are populated.
- **Expected Result**: Resource values are displayed. No "undefined" or errors.

### TC-004: Weekly Contribution Matrix
- **Requirements**: F-003, D-002
- **Priority**: P2 (Full)
- **Steps**:
  1. On Bank page, switch to "Weekly Contribution" tab/view.
  2. Verify the table displays player names and weekly dates.
- **Expected Result**: Matrix loads correctly.

## Test Suite TS-003: Data Ingestion (F-005)

### TC-005: File Upload
- **Requirements**: F-005, BR-001, BR-005
- **Priority**: P0 (Smoke)
- **Preconditions**: Have a valid local `Top 300 [Date].xlsx` file.
- **Steps**:
  1. Click "Update Data" or drag-and-drop the file onto the drop zone.
  2. Wait for the success notification.
  3. Verify the Dashboard updates with the new data (e.g., check if a specific changed value reflects).
- **Expected Result**: File is parsed successfully. Dashboard updates immediately.



## Test Suite TS-004: Deadweight Tracking (F-002)

### TC-006: Deadweight Load & Metrics
- **Requirements**: F-002, BR-006, D-004
- **Priority**: P1 (Regression)
- **Steps**:
  1. Navigate to `/deadweight`.
  2. Verify summary cards are displayed.
  3. Validate "Reducible Power" card:
     - Check that it *excludes* Confirmed, Migrated, King Pardon, Vacation permit, Disappeared.
  4. Validate "Migrated" and "King Pardon" counters.
- **Expected Result**: Page loads. Card values match the sum of "Reducible" rows in the Excel source.

### TC-010: Deadweight Sorting & Filters
- **Requirements**: F-002, P-002, BR-006
- **Priority**: P1 (Regression)
- **Preconditions**: `deadweight.json` loaded.
- **Steps**:
  1. Verify Default Sorting:
     - Top row should be the highest Power player.
     - Bottom row should be the lowest Power player (descending).
  2. Filter by Status "Confirmed":
     - Verify rows have Green "Confirmed" badge.
  3. Search for a generic term (e.g., "Zeroed"):
     - Verify rows have Orange "Zeroed" badge.
  4. Verify Layout:
     - Check that "Ready?" column is **NOT** present.
     - Check status colors: Pardon=Blue, Refused=Red.
- **Expected Result**: Sorting is strictly Power Descending. Filters work. Badges use specific semantic colors. No "Ready" column.

## Test Suite TS-005: Trophies (F-004)

### TC-007: Kingdom Winners History
- **Requirements**: F-004, BR-001
- **Priority**: P2 (Full)
- **Steps**:
  1. Navigate to `/trophies`.
  2. Verify the list of historical winners (MGE, Zenith) is displayed.
  3. Check that the "Legendary" winners are highlighted in a special premium card (Crown icon).
  4. Verify other tiers (Epic, Elite, etc.) display a ranked list (1, 2, 3...) up to Top 18.
  5. Use the "Next/Prev" buttons to navigate between weeks.
- **Expected Result**: History list loads correctly. Rankings are numbered (1-18). Legendary card has distinct "Gold/Neon" styling.

## Test Suite TS-006: Player Detail (F-006)

### TC-008: Player Side Panel
- **Requirements**: F-006, P-001
- **Priority**: P1 (Regression)
- **Steps**:
  1. On Dashboard, click on a player row in "Top Players".
  2. Verify the Side Panel opens.
  3. Check if player stats (Power, KP, Combat breakdown, Economy, Notes) are displayed.
- **Expected Result**: Panel opens with correct player data. Close button works.

## Test Suite TS-007: KvK Performance (F-008)

### TC-011: KvK Page Load & Data
- **Requirements**: F-008, P-005, D-005
- **Priority**: P1 (Regression)
- **Preconditions**: `KvK Stats.xlsx` is loaded.
- **Steps**:
  1. Navigate to `/kvk`.
  2. Verify "Fighting Performance" title and summary cards (Dead, Power Diff, KP Gained).
  3. Verify Table loads with columns: ID, Name, Power (Init/Final), KP (Init/Final), Dead, KP Gained, % Goal, Rate.
- **Expected Result**: Page loads. Summary stats match Excel totals.

### TC-012: KvK Sorting & Search
- **Requirements**: F-008, P-005
- **Priority**: P1 (Regression)
- **Steps**:
  1. Search for a specific player (Name or ID). Verified list filters.
  2. Sort by "KP Gained" (Desc). Verify highest gained is at top.
  3. Sort by "% Goal". Verify ordering.
- **Expected Result**: Search filters rows correctly. Sorting works on numeric and percentage columns.

### TC-013: Visual Indicators (Rate & Badges)
- **Requirements**: F-008, D-005
- **Priority**: P2 (Full)
- **Steps**:
  1. Identify a player with "Excellent" rate. Verify Badge is Purple.
  2. Identify a player with "Good" rate. Verify Badge is Green.
  3. Identify a player with "Bad" rate. Verify Badge is Red.
  4. Verify "% Goal" color scale (Green >=100%, Yellow >=50%, Red <50%).
- **Expected Result**: Visual badges match the defined color logic based on performance data.
