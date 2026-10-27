/**
 * Service worker MINIMAL — son seul but est de rendre l'app installable.
 *
 * Chrome ne propose « Installer l'application » que si le site déclare un
 * service worker avec un gestionnaire `fetch`. Sans lui, le menu n'offre qu'un
 * raccourci qui rouvre dans le navigateur, barre d'adresse comprise — c'est ce
 * que le Roi a constaté le 2026-10-27 : aucune option d'installation.
 *
 * ⚠️ IL NE MET RIEN EN CACHE, DÉLIBÉRÉMENT.
 *
 * Ce projet s'est déjà fait avoir deux fois par des assets périmés pendant les
 * validations (un `index.html` gardé par le navigateur montrait l'ancien build).
 * Un service worker qui cacherait les fichiers transformerait ce désagrément en
 * panne durable : les joueurs resteraient sur une version figée, y compris après
 * un correctif urgent, sans aucun moyen de s'en rendre compte. Le réseau reste
 * donc seul maître, et ce fichier ne garde rien.
 *
 * La seule chose qu'il fait, au-delà d'exister : si une NAVIGATION échoue faute
 * de réseau, il répond une page lisible plutôt que l'erreur du navigateur. Rien
 * n'est stocké pour autant — la page est écrite ici, en dur.
 *
 * Pour le retirer un jour : supprimer l'enregistrement dans `src/main.jsx`, puis
 * publier ici un worker qui appelle `self.registration.unregister()`. Un service
 * worker déjà installé ne disparaît pas tout seul du navigateur des joueurs.
 */

const HORS_LIGNE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hors ligne</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0f172a; color:#f8fafc; font-family:system-ui,-apple-system,sans-serif; padding:24px }
  .b { max-width:320px; text-align:center }
  h1 { font-size:20px; margin:0 0 10px }
  p { font-size:14px; line-height:1.5; color:#a8b6ca; margin:0 }
</style></head>
<body><div class="b">
  <h1>Pas de connexion</h1>
  <p>Kingdom Manager a besoin du réseau pour afficher les données du royaume. Réessaie une fois la connexion revenue.</p>
</div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    // Tout ce qui n'est pas une navigation part au réseau sans que ce worker
    // n'intervienne : aucune interception, donc aucun risque de servir du périmé.
    if (event.request.mode !== 'navigate') return;
    event.respondWith(
        fetch(event.request).catch(() => new Response(HORS_LIGNE, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })),
    );
});
