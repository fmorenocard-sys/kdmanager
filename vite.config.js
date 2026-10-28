import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Métadonnées de build (branche / commit / date), résolues au BUILD via git, pour
// pouvoir lire « quelle version est déployée » directement dans l'app (footer).
// Robuste hors dépôt git (fallback 'unknown').
function git(cmd, fallback = 'unknown') {
  try { return execSync('git ' + cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() }
  catch { return fallback }
}
const BUILD_BRANCH = process.env.VITE_BUILD_BRANCH || git('rev-parse --abbrev-ref HEAD')
const BUILD_SHA = process.env.VITE_BUILD_SHA || git('rev-parse --short HEAD')
const BUILD_TIME = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Env du mode courant (défaut = 2997 ; `--mode pilot` charge .env.pilot).
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Identité pour le <head> STATIQUE, résolue au BUILD. Les aperçus de lien
  // (WhatsApp, Discord…) lisent le HTML brut sans exécuter le JS : la marque
  // blanche runtime (main.jsx) leur est invisible, donc l'identité doit aussi
  // être posée ici. Mêmes défauts que src/config/branding.js (identité 2997).
  const appName = env.VITE_APP_NAME || 'Kingdom Manager'
  const kingdomName = env.VITE_KINGDOM_NAME || 'Unitas 2997'
  const logoUrl = env.VITE_LOGO_URL || '/logo.png'
  const faviconUrl = env.VITE_FAVICON_URL || logoUrl
  // URL canonique de l'instance (sert d'og:url et de base pour og:image absolue).
  const publicUrl = (env.VITE_PUBLIC_URL || 'https://kd-97-manager.web.app').replace(/\/$/, '')
  // og:image DOIT être absolue — les crawlers ne résolvent pas les chemins relatifs.
  const ogImage = env.VITE_OG_IMAGE_URL
    || (/^https?:\/\//.test(faviconUrl) ? faviconUrl : publicUrl + faviconUrl)
  const title = `${appName} ${kingdomName}`
  const description = env.VITE_OG_DESCRIPTION
    || 'Community war & KvK dashboard — attendance, performance tracking, and goals.'

  // Balises Open Graph + Twitter injectées dans le <head>. Le logo étant carré,
  // on reste sur la carte « summary » (petite vignette) plutôt que large_image.
  const metaTags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${appName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${publicUrl}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n    ')

  // ── Manifeste PWA (« Ajouter à l'écran d'accueil ») ────────────────────────
  // Demandé par un joueur : « on n'a pas plus rapide que de taper l'URL ? ».
  // Sans manifeste, l'ajout à l'écran d'accueil donne une icône générique et
  // rouvre dans le navigateur, barre d'adresse comprise — d'où l'impression que
  // ça ne sert à rien. Avec, c'est une icône du royaume et un lancement plein
  // écran.
  //
  // Il est construit ICI, au build, et PAS posé en dur dans `public/` : le titre
  // et le favicon sont déjà par instance (voir plus haut), et un manifeste figé
  // afficherait « Unitas 2997 » sur l'écran d'accueil d'un joueur du pilote ou
  // de Mimoso. Même famille d'erreur que l'incident cross-tenant d'août.
  //
  // L'icône suit `VITE_PWA_ICON_URL`, sinon le favicon de l'instance. Les
  // tailles déclarées sont indicatives : les navigateurs redimensionnent une
  // source plus grande. Une instance au logo SVG gagne à fournir un PNG carré
  // (iOS ignore le SVG pour l'icône d'accueil — voir .env.example).
  // Convention avant configuration : si l'instance a déposé des icônes aux bonnes
  // tailles à côté de son logo (`/logo.png` -> `/logo-192.png`, `/logo-512.png`),
  // on les prend. Sinon on retombe sur le favicon, qui marche mais fait souvent
  // plusieurs centaines de Ko pour un rendu en 192 px. `public/` étant partagé
  // par les 4 instances, le nom DÉRIVE du logo : chacune a donc les siennes.
  const sizedIcon = (size) => {
    const m = /^(.*)\.(png|jpe?g|svg|webp)(\?.*)?$/i.exec(faviconUrl)
    if (!m) return null
    const candidate = `${m[1]}-${size}.png`
    return fs.existsSync(path.join(process.cwd(), 'public', candidate.replace(/^\//, ''))) ? candidate : null
  }
  const icon192 = sizedIcon(192)
  const icon512 = sizedIcon(512)
  // 180 px, et OPAQUE : c'est la taille qu'iOS attend pour l'écran d'accueil, et
  // il peint en NOIR toute zone transparente d'un `apple-touch-icon`. Nos logos
  // sont en RVB + alpha (constaté le 2026-10-28 sur la prod de 2997), donc on
  // sert un aplat de marque, produit par `node scripts/make-apple-icon.cjs`.
  // Une instance qui n'a pas généré la sienne retombe sur `pwaIcon` comme avant.
  const icon180 = sizedIcon(180)
  const pwaIcon = env.VITE_PWA_ICON_URL || icon512 || icon192 || faviconUrl
  const isSvgIcon = /\.svg(\?|$)/i.test(pwaIcon)
  const iconType = isSvgIcon ? 'image/svg+xml' : (/\.jpe?g(\?|$)/i.test(pwaIcon) ? 'image/jpeg' : 'image/png')
  const manifest = {
    name: title,
    short_name: env.VITE_APP_SHORT_NAME || kingdomName,
    description,
    // Relatifs : l'app est servie à la racine de chaque instance, et `base: './'`
    // suppose déjà des chemins relatifs. HashRouter met sa route après le `#`,
    // donc la racine suffit comme point d'entrée.
    start_url: '.',
    scope: './',
    display: 'standalone',
    orientation: 'portrait-primary',
    // Slate-900 : la couleur de fond réelle de l'app (--background), pour que la
    // barre système se fonde dedans au lancement au lieu de clignoter en blanc.
    theme_color: '#0f172a',
    background_color: '#0f172a',
    icons: isSvgIcon
      ? [{ src: pwaIcon, sizes: 'any', type: iconType, purpose: 'any' }]
      : [
        { src: icon192 || pwaIcon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon512 || pwaIcon, sizes: '512x512', type: iconType, purpose: 'any' },
      ],
  }
  const manifestJson = JSON.stringify(manifest, null, 2)

  // iOS n'implémente pas le manifeste pour l'écran d'accueil : il lui faut ses
  // propres balises, sous peine de rouvrir dans Safari avec la barre d'adresse.
  const pwaTags = [
    `<link rel="manifest" href="manifest.webmanifest" />`,
    `<meta name="theme-color" content="#0f172a" />`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${env.VITE_PWA_ICON_URL || icon180 || pwaIcon}" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`,
    `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}" />`,
  ].join('\n    ')

  return {
    plugins: [
      react(),
      {
        // Pose titre + favicon + Open Graph + PWA par instance, au build, dans le
        // HTML statique.
        name: 'html-branding-meta',
        transformIndexHtml(html) {
          return html
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, `$1${faviconUrl}$2`)
            .replace('</head>', `    ${metaTags}\n    ${pwaTags}\n  </head>`)
        },
        // Le manifeste est ÉMIS, pas posé dans `public/` : son contenu dépend de
        // l'instance (cf. sa construction plus haut).
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifestJson })
        },
        // `generateBundle` ne tourne qu'au build : sans ça, `npm run dev` servirait
        // un 404 sur le manifeste et on ne pourrait pas tester l'installation en
        // local.
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.split('?')[0].endsWith('/manifest.webmanifest')) {
              res.setHeader('Content-Type', 'application/manifest+json')
              res.end(manifestJson)
              return
            }
            next()
          })
        },
      },
    ],
    // Stamp de version exposé au runtime (footer) — voir git(...) au-dessus.
    define: {
      'import.meta.env.VITE_BUILD_BRANCH': JSON.stringify(BUILD_BRANCH),
      'import.meta.env.VITE_BUILD_SHA': JSON.stringify(BUILD_SHA),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(BUILD_TIME),
      'import.meta.env.VITE_BUILD_MODE': JSON.stringify(mode),
    },
    base: './',
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001/kd-97-manager/us-central1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
