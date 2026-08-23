import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DATA_CONFIG } from '../config/data-mapping';

// Identité de la campagne KvK en cours (nom + fenêtre de dates).
//
// Marque blanche : la source de vérité est `kvk_config/current`, saisi par le Roi
// dans chaque instance.
//
// **Les dates ne viennent QUE de Firestore.** Aucun repli sur le build : les
// constantes `DATA_CONFIG.KVK` portent la fenêtre du 2997 (SoC 4, 11/06 → 07/07)
// et l'afficher sur une autre instance est un leak de marque blanche (BUG-009).
// Une date absente est honnête, une date fausse ne l'est pas — donc doc illisible,
// absent ou muet ⇒ aucune date affichée.
//
// Le cas n'est pas théorique : `kvk_config` est en `allow read: if isAuthenticated()`
// (firestore.rules), donc un visiteur non connecté n'y a JAMAIS accès. Il ne voit
// pas de date aujourd'hui parce que l'onglet Progressions lui est fermé — le repli
// silencieux ne tenait qu'à ce gating.
//
// Le titre, lui, garde son repli : `DATA_CONFIG.KVK.TITLE` est piloté par instance
// via VITE_KVK_TITLE, il ne fuit pas.

/**
 * Normalise une date Firestore en 'YYYY-MM-DD' (l'affichage timeline attend une
 * chaîne). Accepte un Timestamp, une Date, un ISO ou une chaîne déjà au format.
 * @param {*} v
 * @returns {string|null}
 */
export const toDateString = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v.slice(0, 10) || null;
    // Timestamp Firestore (client ou Admin SDK) → Date
    const d = typeof v.toDate === 'function' ? v.toDate()
        : v instanceof Date ? v
            : typeof v.seconds === 'number' ? new Date(v.seconds * 1000)
                : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10); // UTC : les dates sont stockées à minuit UTC
};

/**
 * Lit `kvk_config/current` et renvoie l'identité de la campagne en cours.
 * Ne rejette jamais : lecture refusée ou doc absent ⇒ titre de repli, AUCUNE date.
 * @returns {Promise<{title: string, startDate: string|null, endDate: string|null, revealGoalStatus: boolean}>}
 */
export async function fetchCurrentCampaign() {
    const fallback = {
        title: DATA_CONFIG.KVK.TITLE || DATA_CONFIG.KVK.FILE,
        startDate: null, // jamais de date de build — voir l'en-tête
        endDate: null,
        revealGoalStatus: false
    };
    try {
        const snap = await getDoc(doc(db, 'kvk_config', 'current'));
        if (!snap.exists()) return fallback;
        const cfg = snap.data();
        return {
            title: String(cfg.name || '').trim() || fallback.title,
            startDate: toDateString(cfg.startDate),
            endDate: toDateString(cfg.endDate),
            revealGoalStatus: cfg.revealGoalStatus === true // BR-019
        };
    } catch {
        return fallback; // lecture refusée (invité) : on n'invente pas de dates
    }
}
