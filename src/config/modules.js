/**
 * modules.js — activation de modules par instance (marque blanche, F-023 / BR-015).
 *
 * Même logique que branding.js : une seule base de code, un royaume active ou
 * désactive certains modules via des variables d'environnement de build. Les
 * **défauts sont « activé »**, de sorte que sans configuration l'app est
 * identique — le royaume 2997 n'a rien à changer.
 *
 * Seuls les modules OPTIONNELS sont listés ici (granularité PAGE). Les modules
 * FIXES (Dashboard, Profil, Admin, War Tracker, KvK Hub incl. Course) ne sont
 * jamais désactivables et n'apparaissent pas dans cette map.
 *
 * Désactiver un module pour une instance : VITE_MODULE_<CLE>=false dans son
 * fichier d'env de build (ex. .env.pilot). Mécanisme de PRÉSENTATION uniquement
 * (comme le filtrage par rôle) — jamais une garantie de sécurité.
 */

const env = import.meta.env;

// « false » / « 0 » désactivent ; tout le reste (dont undefined) = activé.
const enabled = (v) => !(v === 'false' || v === '0' || v === false);

/** Modules optionnels et leur état d'activation pour CETTE instance. */
export const MODULES = {
    bank: enabled(env.VITE_MODULE_BANK),
    trophies: enabled(env.VITE_MODULE_TROPHIES),
    deadweight: enabled(env.VITE_MODULE_DEADWEIGHT),
};

/**
 * Un module est actif s'il est fixe (absent de MODULES) ou explicitement activé.
 * @param {string} key - id du module (ex. 'bank', 'trophies', 'deadweight').
 */
export const isModuleEnabled = (key) => MODULES[key] !== false;

/** Chemin de route -> clé de module optionnel, pour les guards de routing. */
export const ROUTE_MODULE = {
    '/bank': 'bank',
    '/trophies': 'trophies',
    '/deadweight': 'deadweight',
};
