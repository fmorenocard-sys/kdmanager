import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DATA_CONFIG } from '../config/data-mapping';

// Identité de la campagne KvK en cours (nom + fenêtre de dates).
//
// Marque blanche : la source de vérité est `kvk_config/current`, saisi par le Roi
// dans chaque instance. Les constantes de build `DATA_CONFIG.KVK` portent les
// valeurs du royaume 2997 (SoC 4, 11/06 → 07/07) : elles n'ont aucun sens sur une
// autre instance et ne servent plus que de repli quand le doc est absent ou muet.
// Même famille de correctif que VITE_KVK_TITLE (fin du leak 2997) — les dates
// étaient restées en dur.

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
 * Ne rejette jamais : en cas d'échec de lecture, on retombe sur les constantes.
 * @returns {Promise<{title: string, startDate: string|null, endDate: string|null, revealGoalStatus: boolean}>}
 */
export async function fetchCurrentCampaign() {
    const fallback = {
        title: DATA_CONFIG.KVK.TITLE || DATA_CONFIG.KVK.FILE,
        startDate: DATA_CONFIG.KVK.START_DATE || null,
        endDate: DATA_CONFIG.KVK.END_DATE || null,
        revealGoalStatus: false
    };
    try {
        const snap = await getDoc(doc(db, 'kvk_config', 'current'));
        const cfg = snap.exists() ? snap.data() : {};
        return {
            title: String(cfg.name || '').trim() || fallback.title,
            startDate: toDateString(cfg.startDate) || fallback.startDate,
            endDate: toDateString(cfg.endDate) || fallback.endDate,
            revealGoalStatus: cfg.revealGoalStatus === true // BR-019
        };
    } catch {
        return fallback;
    }
}
