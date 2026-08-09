import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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

  return {
    plugins: [
      react(),
      {
        // Pose titre + favicon + Open Graph par instance, au build, dans le HTML statique.
        name: 'html-branding-meta',
        transformIndexHtml(html) {
          return html
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, `$1${faviconUrl}$2`)
            .replace('</head>', `    ${metaTags}\n  </head>`)
        },
      },
    ],
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
