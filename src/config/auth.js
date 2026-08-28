/**
 * auth.js — mode d'authentification par instance (marque blanche).
 *
 * Même logique que `branding.js` et `modules.js` : une seule base de code, chaque
 * royaume décrit sa configuration par variables d'environnement de build. Le
 * **défaut est « Discord activé »**, de sorte que sans configuration l'app est
 * identique — 2997 et le pilote 3341 n'ont rien à changer.
 *
 * Pourquoi ce drapeau (recommandation du REX Arcelia 2293 §6, livré le
 * 2026-08-28) : le SSO Discord repose sur une application OAuth **dédiée au
 * royaume** et sur l'appartenance à SON serveur Discord. Un royaume dont on ne
 * contrôle pas le Discord — cas de tout prospect, et de Mimoso 1362 — tourne sur
 * l'auth Google (`AuthContext.loginWithGoogle`) avec des rôles épinglés à la main
 * dans `roles/{uid}`. Sur ces instances, les points d'entrée Discord étaient
 * pourtant toujours affichés et menaient dans le vide :
 *   - 1362 : `/api/discordLogin` n'a pas de réécriture Hosting → repli SPA, le
 *     bouton ne faisait RIEN (mesuré le 2026-08-28) ;
 *   - Arcelia 2293 : la fonction existe mais ses secrets sont des placeholders →
 *     redirection vers Discord SANS `client_id`, l'utilisateur quittait le site
 *     pour une page d'erreur Discord.
 *
 * Mécanisme de PRÉSENTATION uniquement, comme le filtrage par rôle : masquer le
 * bouton n'empêche pas d'atteindre `/api/discordLogin` à la main. La sécurité
 * reste dans les règles Firestore et dans les secrets Discord absents.
 */

const env = import.meta.env;

// « false » / « 0 » désactivent ; tout le reste (dont undefined) = activé.
const enabled = (v) => !(v === 'false' || v === '0' || v === false);

export const AUTH = {
    /**
     * Le SSO Discord est-il réellement opérationnel sur cette instance ?
     * `VITE_AUTH_DISCORD=false` sur un royaume sans application Discord dédiée.
     */
    discordEnabled: enabled(env.VITE_AUTH_DISCORD),
};

/**
 * Choisit la variante de copie adaptée au mode d'auth de l'instance.
 *
 * Plusieurs écrans disent « Connectez-vous via Discord pour synchroniser votre
 * rôle » — vrai sur 2997 et 3341, mensonger sur une instance Google-only où les
 * rôles sont épinglés à la main. Chaque clé concernée a donc un jumeau
 * `<clé>_no_discord` au phrasé neutre.
 *
 * @param {string} key - clé i18n de base (variante Discord)
 * @returns {string} la clé à passer à `t()`
 */
export const authCopyKey = (key) => (AUTH.discordEnabled ? key : `${key}_no_discord`);
