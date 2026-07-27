import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { pageTitle } from './config/branding'

// Marque blanche : le titre d'onglet suit le royaume configuré. Défini en JS
// plutôt que dans index.html pour éviter un %VITE_%% non résolu si une variable
// manque (le défaut retombe sur « Kingdom Manager Unitas 2997 »).
document.title = pageTitle

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
