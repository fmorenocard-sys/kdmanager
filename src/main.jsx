import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { pageTitle, BRANDING } from './config/branding'

// Marque blanche : le titre d'onglet suit le royaume configuré. Défini en JS
// plutôt que dans index.html pour éviter un %VITE_%% non résolu si une variable
// manque (le défaut retombe sur « Kingdom Manager Unitas 2997 »).
document.title = pageTitle

// Idem pour le favicon (statique dans index.html, sans défaut env) : on le
// pointe au runtime sur le logo du royaume configuré (branding.faviconUrl).
{
  const favicon = document.querySelector('link[rel="icon"]')
  if (favicon && BRANDING.faviconUrl) favicon.href = BRANDING.faviconUrl
}

// PWA : enregistrement du service worker, uniquement en PRODUCTION. Son rôle
// unique est de rendre l'app installable — Chrome ne propose « Installer
// l'application » qu'aux sites qui en déclarent un. Il ne met rien en cache
// (voir public/sw.js), donc aucun risque de servir un build périmé.
// Hors production on ne l'enregistre pas : un worker actif en dev masquerait le
// rechargement à chaud et ferait perdre un temps fou à diagnostiquer.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      // Pas bloquant : sans worker l'app marche, elle n'est juste pas installable.
      console.warn('Service worker non enregistré (app installable indisponible) :', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
