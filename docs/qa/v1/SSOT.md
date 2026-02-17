# Source of Truth (SSOT) - v1.0

## 1. Features
| ID | Name | Description | Priority |
|---|---|---|---|
| F-001 | Dashboard Overview | View key kingdom metrics (points, activity) | P0 |
| F-002 | Player List | Searchable, filterable list of all players (Top 300) | P0 |
| F-003 | KvK Performance | Detailed breakdown of KvK contribution (kills, deads) | P1 |
| F-004 | Bank Ledger | Tracking of resource contributions per player | P1 |
| F-005 | Deadweight Analysis | List of players underperforming or inactive | P1 |
| F-006 | Trophies | Tracking of MGE/GH winners | P2 |

## 2. Business Rules
| ID | Description | Feature |
|---|---|---|
| BR-001 | Top 300 is based on Power ranking from the scan. | F-002 |
| BR-002 | Deadweight status is calculated based on Power vs KP contribution. | F-005 |
| BR-003 | Bank history retains data for the last 4 weeks. | F-004 |
| BR-004 | Data is static and updated via "digest-data" script (no real-time DB). | Global |

## 3. Pages / Screens
| ID | Name | Path |
|---|---|---|
| P-001 | Dashboard | / |
| P-002 | Performance | /kvk |
| P-003 | Trophies | /trophies |
| P-004 | Deadweight | /deadweight |
| P-005 | Bank | /bank |

## 4. Roles
| ID | Name | Description |
|---|---|---|
| R-001 | Public / Viewer | Read-only access to all pages |
| R-002 | Admin (implied) | Can run the `digest-data` script to update data |
