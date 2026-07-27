/**
 * branding.js — marque blanche (item 6 de l'étude SaaS).
 *
 * Une seule base de code sert plusieurs royaumes : l'identité affichée vient de
 * variables d'environnement Vite, pas de chaînes en dur. Les **valeurs par défaut
 * sont celles d'Unitas 2997**, de sorte que sans configuration l'app est identique
 * à ce qu'elle a toujours été — le royaume 2997 n'a rien à changer.
 *
 * Un autre royaume (pilote KD 3341, etc.) surcharge ces variables dans son propre
 * fichier d'environnement de build. Voir `.env.example`.
 */

const env = import.meta.env;

export const BRANDING = {
    /** Nom du produit (rarement changé). */
    appName: env.VITE_APP_NAME || 'Kingdom Manager',
    /** Identité du royaume, affichée sous le titre (« Unitas 2997 »). */
    kingdomName: env.VITE_KINGDOM_NAME || 'Unitas 2997',
    /** Libellé court pour l'en-tête mobile (« KD Manager »). */
    kingdomShort: env.VITE_APP_SHORT || 'KD Manager',
    /** Numéro de royaume, pour la mention « Kingdom 2997 » du pied de page. */
    kingdomNumber: env.VITE_KINGDOM_NUMBER || '2997',
    /** Logo (fichier dans public/ ou URL). Un royaume peut remplacer le fichier. */
    logoUrl: env.VITE_LOGO_URL || '/logo.png',
    /** Favicon de l'onglet. Suit le logo par défaut ; surchargeable via VITE_FAVICON_URL. */
    faviconUrl: env.VITE_FAVICON_URL || env.VITE_LOGO_URL || '/logo.png',
    /**
     * Avatar par défaut (fallback quand aucun avatar joueur n'est trouvé).
     * Suit le logo par défaut ; surchargeable via VITE_DEFAULT_AVATAR_URL.
     */
    defaultAvatarUrl: env.VITE_DEFAULT_AVATAR_URL || env.VITE_LOGO_URL || '/logo.png',
};

/** Titre d'onglet : « Kingdom Manager Unitas 2997 ». */
export const pageTitle = `${BRANDING.appName} ${BRANDING.kingdomName}`;
