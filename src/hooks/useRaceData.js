import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * useRaceData — charge les campagnes KvK Race et leurs agrégats (F-019).
 * Lecture réservée King/Officer (rules §9.4) : toute erreur de permission est
 * absorbée (le gate UI empêche normalement d'arriver ici sans rôle).
 * Retour : { campaigns, loading, error } — chaque campagne porte
 * { id, config…, scans: [{seq, meta, camps[], duel}], kingdomsBySeq: {seq: list[]} }.
 */
export function useRaceData() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rootSnap = await getDocs(collection(db, 'kvk_race'));
                const list = await Promise.all(rootSnap.docs.map(async (d) => {
                    const [scansSnap, kingdomsSnap] = await Promise.all([
                        getDocs(collection(db, 'kvk_race', d.id, 'scans')),
                        getDocs(collection(db, 'kvk_race', d.id, 'kingdoms'))
                    ]);
                    const scans = scansSnap.docs.map((s) => s.data()).sort((a, b) => a.seq - b.seq);
                    const kingdomsBySeq = Object.fromEntries(
                        kingdomsSnap.docs.map((k) => [k.data().seq, k.data().list || []])
                    );
                    return { id: d.id, ...d.data(), scans, kingdomsBySeq };
                }));
                if (!cancelled) setCampaigns(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
            } catch (err) {
                console.error('useRaceData error:', err);
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return { campaigns, loading, error };
}
