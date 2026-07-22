import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * useRaceData — charge les campagnes KvK Race et leurs agrégats (F-019).
 * Lecture réservée King/Officer (rules §9.4) : toute erreur de permission est
 * absorbée (le gate UI empêche normalement d'arriver ici sans rôle).
 * Retour : { campaigns, loading, error } — chaque campagne porte
 * { id, config…, scans: [{seq, meta, camps[], duel}], kingdomsBySeq: {seq: list[]},
 *   playersBySeq: {seq: list[]} } — les tops joueurs (F-020 / US-019) sont écrits
 * par digestRaceScan depuis le début, ils n'étaient simplement pas lus.
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
                    const [scansSnap, kingdomsSnap, playersSnap] = await Promise.all([
                        getDocs(collection(db, 'kvk_race', d.id, 'scans')),
                        getDocs(collection(db, 'kvk_race', d.id, 'kingdoms')),
                        getDocs(collection(db, 'kvk_race', d.id, 'players_top'))
                    ]);
                    const scans = scansSnap.docs.map((s) => s.data()).sort((a, b) => a.seq - b.seq);
                    const kingdomsBySeq = Object.fromEntries(
                        kingdomsSnap.docs.map((k) => [k.data().seq, k.data().list || []])
                    );
                    const playersBySeq = Object.fromEntries(
                        playersSnap.docs.map((p) => [p.data().seq, p.data().list || []])
                    );
                    return { id: d.id, ...d.data(), scans, kingdomsBySeq, playersBySeq };
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
