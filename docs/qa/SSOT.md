# Structured Source of Truth (SSOT) - v1.0

## 1. Features (F)

| ID | Name | Description | Actors |
| :--- | :--- | :--- | :--- |
| **F-001** | **Global Dashboard** | Display kingdom overview statistics (Power, Kills, Evolution). Aggregates data from Top 300 and Bank. Includes historical trends for Power and KP. | Leadership |
| **F-002** | **Deadweight Tracking** | Identify and track inactive players. Metrics for "Reducible Power" (excluding justified inactivity). Filters for Status/ID. | Leadership |
| **F-003** | **Bank Treasury Monitoring** | Monitor current resource stocks (Food, Wood, Stone, Gold) and weekly contributions. | Bank Managers |
| **F-004** | **Kingdom Trophies** | View historical winners of kingdom events (MGE, Zenith). | All Users |
| **F-005** | **Data Ingestion** | Upload/Drag-and-drop local Excel files to update the dashboard view in real-time. | Officers |
| **F-006** | **Player Detail View** | View detailed statistics for a specific player via a side panel (Combat, Economy, Notes). | Leadership |
| **F-007** | **Advanced Filtering** | Search players by Name/ID and filter by Alliance on the dashboard. | All Users |
| **F-008** | **KvK Performance Tracking** | Track player performance during KvK (Power diff, KP gained, Dead, Goals). Sortable table with visual indicators. | Leadership |

## 2. Business Rules (BR)

| ID | Rule | Description |
| :--- | :--- | :--- |
| **BR-001** | **Excel Data Source** | Data is read from Excel files located in `/public/data/` or uploaded by the user. |
| **BR-002** | **Fuzzy Sheet Matching** | Sheets are identified by partial name matching (e.g., "14_2" matches "14_2_2026"). |
| **BR-003** | **Bank Columns** | Bank Dashboard data is expected in specific rows (Food=1, Wood=2, etc.) at Column D (Index 3). |
| **BR-004** | **Top 300 Aggregation** | "Top 300" files contain both individual player data (Sheet 1) and historical trends (Dashboard Sheet). |
| **BR-005** | **Client-Side Processing** | All parsing (xlsx) happens in the browser. No server-side persistence of uploaded files. |
| **BR-006** | **Deadweight Exclusion** | "Reducible Power/KP" excludes players with Status: *Confirmed, Migrated, King Pardon, Vacation permit* or Account Available: *Disappeared*. |

## 3. Pages / Screens (P)

| ID | Name | Route | Components |
| :--- | :--- | :--- | :--- |
| **P-001** | **Dashboard** | `/` | `DashboardPage.jsx`, `PlayerSidePanel.jsx` |
| **P-002** | **Deadweight** | `/deadweight` | `DeadweightPage.jsx` |
| **P-003** | **Bank** | `/bank` | `BankPage.jsx` |
| **P-004** | **Trophies** | `/trophies` | `KingdomTrophiesPage.jsx` |
| **P-005** | **KvK Performance** | `/kvk` | `KvKPerformancePage.jsx` |

## 4. Data Structures (D)

### D-001: Player Record (Top 300)
Columns mapping based on configuration:
- 0: ID
- 1: Name
- 2: Power
- 4: Kill Points (KP)
- 5: Dead Troops
- 13: Alliance

### D-002: Bank Ledger
- **Dashboard Sheet**: Resource stocks.
- **Weekly Contribution Sheet**: Matrix of [Player] x [Week Date].

### D-003: Trophies (trophies.json)
- **Structure**: Array of Week objects.
- **Week Object**:
  - `title`: String (e.g., "Week 1").
  - `groups`: Object (Keys = Trophy Type, Values = Array of Players).
- **Player Object**: `id`, `name`, `score`.

### D-004: Deadweight List (deadweight.json)
- **Structure**: List of objects.
- **Fields**: `id` (min 5 chars), `name`, `power`, `kp`, `status`, `accountAvailable`, `note`.
- **Validation**: Rows without valid ID/Name are skipped.

### D-005: KvK Performance (KvK Stats.xlsx)
- **Source**: Excel file with specific columns for Initial/Final snapshots.
- **Fields**: ID, Name, Initial Power, Final Power, Initial KP, Final KP, Dead, Goal %.
- **Calculated**: Power Diff, KP Gained, Rate (Excellent/Good/etc.).
