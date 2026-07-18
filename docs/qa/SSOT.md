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
| **F-014** | **Multi-Language (i18n)** | UI localized in 9 languages (EN, FR, ES, DE, PL, TR, UK, AR, VI). | All Users |
| **F-015** | **KvK History** | Archive of past KvK campaigns (`kvk_history` collection). Campaign selector on the Performance page, per-player progression view across campaigns, manual closure by the King. | All Users (read), King (closure) |
| **F-016** | **Kingdom Progression Timeline** | "Progression du Royaume" tab on the KvK Performance page (PM ID: F-022 / US-023). Chronological timeline of all campaigns (current + archived) with kingdom aggregates (KP gained, total dead, accounts, avg % goal — null-safe for old formats) and the official outcome badge (victory with star / victory / defeat). | King, Officers (view) · King (set outcome) |

## 2. Business Rules (BR)

| ID | Rule | Description |
| :--- | :--- | :--- |
| **BR-001** | **Firestore Source of Truth** | Data is read primarily from Firestore, populated either manually by officers or synchronized via Cloud Functions. |
| **BR-002** | **Role Hierarchy** | Actions are restricted by RoleContext. Guest (View basic) < Warrior (Post availabilities) < Officer (Sync Data, see War Dashboard) < King (Configure KvK). |
| **BR-003** | **Discord Role Priority** | Sync gives Priority: King > Officer > Warrior. If a user is not in the discord server or has no matching role, they default to Guest. |
| **BR-004** | **KvK Campaign Isolation** | War Tracker forms strictly post to the campaign matching `kvk_config/current`. Historic campaign data is saved but only accessible via Dashboard filtering. |
| **BR-005** | **Cloud Function Extraction** | The `syncData` Cloud Function expects specific `.xlsx` structures and names (Bank Ledger, Deadweight, Top 300) sent as base64 buffers. |
| **BR-006** | **KvK Archive Immutability** | `kvk_history` documents are create-only: only the King can create them, and no client can update or delete an archived campaign (enforced by Firestore rules). *Amended 2026-07-18*: single exception — the King may update the `outcome` field alone (see BR-012); any update touching other fields is rejected by the rules. |
| **BR-007** | **Governor ID Join Key** | Cross-campaign player progression joins on the governor ID, never on the display name (names change between seasons). |
| **BR-008** | **Discord-gated KvK views** | The Comptes Secondaires (fillers) and Progression tabs on the KvK Performance page are only rendered for Discord-verified users (SSO login discord: uid, or a linked discordId on the profile). Guests and unlinked Google users only see the main accounts table. |
| **BR-009** | **Leadership-only Deadweight** | The Deadweight page and its navigation entries (sidebar, bottom nav) are only available to King and Officer roles (roles are granted via Discord sync). Other users see a Restricted Access card with a hint to log in via Discord. Note: the underlying static_data/deadweight document remains publicly readable at the Firestore level — UI-level gating only. |
| **BR-010** | **Dual DKP Domains (proposed, E-005)** | Two DKP formulas must never be mixed: the internal 2997 DKP (internal scans: F-008 performance, goals) and the race/coalition DKP (KvK Race module, formula agreed with allies). Each is configurable per campaign; every display labels its domain explicitly. Decided by the King 2026-07-14; enforcement lands with E-005. |
| **BR-011** | **Leadership-only Kingdom Timeline** | The "Progression du Royaume" tab (F-016) is only rendered for King and Officer roles. It is role-gated, not Discord-gated: it must remain accessible to a Google-authenticated King, and must not be reset by the BR-008 Discord fallback. Losing the role falls back to the main tab. |
| **BR-012** | **Outcome — King-only, single-field** | The official campaign outcome (`victory_star` \| `victory` \| `defeat` \| null) is set by the King only, on archived campaigns only (never on the current one). Firestore rules allow the update solely when the changed key set is exactly `['outcome']`. |

## 3. Pages / Screens (P)

| ID | Name | Route | Components |
| :--- | :--- | :--- | :--- |
| **P-001** | **Dashboard** | `/` | `DashboardPage.jsx`, `PlayerDetailPanel.jsx` |
| **P-002** | **War Tracker** | `/war-tracker` | `WarTrackerPage.jsx`, `AvailabilityForm`, `WarDashboard`, `KvKConfigForm` |
| **P-003** | **KvK Performance** | `/kvk` | `KvKPerformancePage.jsx`, `KingdomProgression.jsx` |
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
