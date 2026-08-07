import { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
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
        // Temps réel : onSnapshot sur la racine kvk_race → dès que digestRaceScan met à
        // jour un doc campagne (nouveau scan digéré), on ré-hydrate ses sous-collections.
        // Supprime le rechargement manuel après un dépôt de scan.
        const hydrate = async (rootDocs) => {
            try {
                const list = await Promise.all(rootDocs.map(async (d) => {
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
                console.error('useRaceData hydrate error:', err);
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        const unsub = onSnapshot(
            collection(db, 'kvk_race'),
            (rootSnap) => { hydrate(rootSnap.docs); },
            (err) => { console.error('useRaceData snapshot error:', err); if (!cancelled) { setError(err); setLoading(false); } }
        );
        return () => { cancelled = true; unsub(); };
    }, []);

    return { campaigns, loading, error };
}
