# Test Plan - Kingdom Manager v1.0

## 1. Objectives
Ensure the Kingdom Manager accurately displays data from the provided Excel exports and that the user interface is responsive and navigable on the static hosting environment.

## 2. Scope
### IN Scope
- **UI Navigation**: Sidebar, routing between pages.
- **Data Display**: Correct parsing and rendering of JSON data for all features (Dashboard, Players, KvK, Bank, Deadweight).
- **Search/Filter**: Functionality of search inputs and dropdown filters.
- **Responsiveness**: Basic mobile and desktop layout.
- **Static Deployment**: Verification on GitHub Pages.

### OUT Scope
- **Data Editing**: The app is read-only.
- **Authentication**: No login required (public).
- **Backend API**: No live API to test.

## 3. Test Levels
- **Smoke Test**: Verify the app loads, navigation works, and data is visible on the Dashboard.
- **Full Regression**: Verify all columns in all tables match the source Excel files.

## 4. Test Environment
- **URL**: `https://fmorenocard-sys.github.io/kdmanager/`
- **Data Source**: Excel files in `public/data/` (committed to repo).

## 5. Definition of Done
- All P0 features are working.
- No 404 errors in console.
- Version number is visible in UI.
