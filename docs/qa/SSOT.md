# Structured Source of Truth (SSOT) - v2.0

## 1. Features (F)

| ID | Name | Description | Actors |
| :--- | :--- | :--- | :--- |
| **F-001** | **Global Dashboard** | Display kingdom overview statistics (Power, Kills, Evolution). Aggregates data from Top 300 and Bank. Includes historical trends for Power and KP. | Leadership, Officers, Warriors |
| **F-002** | **Deadweight Tracking** | Identify and track inactive players. Metrics for "Reducible Power" (excluding justified inactivity). Filters for Status/ID. | Leadership, Officers |
| **F-003** | **Bank Treasury Monitoring** | Monitor current resource stocks (Food, Wood, Stone, Gold) and weekly contributions. | Bank Managers, Officers |
| **F-004** | **Kingdom Trophies** | View historical winners of kingdom events (MGE, Zenith). | All Users |
| **F-005** | **Data Ingestion (Cloud Sync)** | Upload Excel files via the UI to update the Firestore database via serverless Cloud Functions logic. | Officers, King |
| **F-006** | **Player Detail View** | View detailed statistics for a specific player via a side panel (Combat, Economy, Notes). | Leadership, Officers |
| **F-007** | **Advanced Filtering** | Search players by Name/ID and filter by Alliance on the dashboard. | All Users |
| **F-008** | **KvK Performance Tracking** | Track player performance during KvK (Power diff, KP gained, Dead, Goals). Sortable table with visual indicators. | Leadership, Officers |
| **F-009** | **Authentication (OAuth2)** | Authentication via Google or directly via Discord SSO. Link multiple providers to a single account profile. | All Users |
| **F-010** | **RBAC & Role Synchronization** | Role Based Access Control (King, Officer, Warrior, Guest). Auto-synchronization of roles by querying the Discord Guild API using stored IDs. | Admin (King), Backend |
| **F-011** | **War Tracker (Availability)** | Allow players to declare their presence for KvK marches (Garrison, Rally, Siege) across specific time slots. | Warriors |
| **F-012** | **War Dashboard** | Aggregate view for Officers of all declared availabilities, tech levels, and troops for the active campaign. | Leadership, Officers |
| **F-013** | **KvK Configuration** | Define the Active Campaign (name, start/end dates). Archiving previous campaigns. | Leadership (King) |
| **F-014** | **Multi-Language (i18n)** | UI localized in 8 languages (EN, FR, ES, DE, PL, TR, UK, VI). | All Users |

## 2. Business Rules (BR)

| ID | Rule | Description |
| :--- | :--- | :--- |
| **BR-001** | **Firestore Source of Truth** | Data is read primarily from Firestore, populated either manually by officers or synchronized via Cloud Functions. |
| **BR-002** | **Role Hierarchy** | Actions are restricted by RoleContext. Guest (View basic) < Warrior (Post availabilities) < Officer (Sync Data, see War Dashboard) < King (Configure KvK). |
| **BR-003** | **Discord Role Priority** | Sync gives Priority: King > Officer > Warrior. If a user is not in the discord server or has no matching role, they default to Guest. |
| **BR-004** | **KvK Campaign Isolation** | War Tracker forms strictly post to the campaign matching `kvk_config/current`. Historic campaign data is saved but only accessible via Dashboard filtering. |
| **BR-005** | **Cloud Function Extraction** | The `syncData` Cloud Function expects specific `.xlsx` structures and names (Bank Ledger, Deadweight, Top 300) sent as base64 buffers. |

## 3. Pages / Screens (P)

| ID | Name | Route | Components |
| :--- | :--- | :--- | :--- |
| **P-001** | **Dashboard** | `/` | `DashboardPage.jsx`, `PlayerDetailPanel.jsx` |
| **P-002** | **War Tracker** | `/war-tracker` | `WarTrackerPage.jsx`, `AvailabilityForm`, `WarDashboard`, `KvKConfigForm` |
| **P-003** | **KvK Performance** | `/kvk` | `KvKPerformancePage.jsx` |
| **P-004** | **Trophies** | `/trophies` | `KingdomTrophiesPage.jsx` |
| **P-005** | **Deadweight** | `/deadweight` | `DeadweightPage.jsx` |
| **P-006** | **Bank** | `/bank` | `BankPage.jsx` |
| **P-007** | **User Profile** | `/profile` | `ProfilePage.jsx` |

## 4. Roles (R)

| ID | Role | Description |
| :--- | :--- | :--- |
| **R-001** | **Guest** | Can read public metrics (if explicitly allowed, mostly zeroed right now due to rules). |
| **R-002** | **Warrior** | Can read dashboards, access War Tracker to submit availability. |
| **R-003** | **Officer** | Can trigger Data Syncs, view War Dashboard results. |
| **R-004** | **King** | Can configure Active KvK campaigns, delete campaigns. |

## 5. Errors & Fallbacks (E)

| ID | Rule | Description |
| :--- | :--- | :--- |
| **E-001** | **Discord Missing Form** | If user logs in via Discord native SSO, they won't have a Google Profile. Role sync must parse the raw Firebase UID to get the Discord ID. |
| **E-002** | **Form Missing Campaign** | If no Active KvK Campaign exists in DB, War Tracker hides the declaration form to prevent orphaned data. |
| **E-003** | **Ingestion Size Limits** | Cloud Function payload limit is 10MB. Files must be chunked or kept reasonably sized. |
