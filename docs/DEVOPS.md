# DevOps Strategy: Static Deployment

## Architecture Choice: Static Site (GitHub Pages)

We have chosen a **Static Site** architecture hosted on **GitHub Pages** for maximum cost efficiency (free) and simplicity.

### Workflow
1.  **Data Ingestion (Local)**
    - Excel files are placed in `public/data/`.
    - `npm run digest-data` scripts parse Excel -> JSON.
    - JSON files are committed to the repository.

2.  **Build & Deploy (GitHub Actions)**
    - Trigger: Push to `main`.
    - Action: `npm run build` (Vite build).
    - Deploy: The `dist` folder is deployed to the `gh-pages` branch.
    - Hosting: Served statically by GitHub Pages.

### Constraints & Limitations
- **Read-Only**: No database, no user writes.
- **Update Latency**: Data updates require a git commit and push.
- **Public**: All data in the repo is public.

### Troubleshooting
- **404 on Data**: Ensure paths use `import.meta.env.BASE_URL` (e.g. `/kdmanager/data/...`).
- **Routing 404s**: GitHub Pages is a static host. SPA routing (Client-side) requires a specialized 404.html or hash router if deep linking breaks. *Current app uses state-based routing (`activePage` state), so deep links are not supported but navigation works.*
