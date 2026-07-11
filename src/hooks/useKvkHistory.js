import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Module-level cache: archived campaigns are immutable (create-only collection),
// so one fetch per app session is enough.
let cache = null;

/**
 * Loads archived KvK campaigns from kvk_history (F-015).
 * Returns { campaigns, loading, error } with campaigns sorted by season order desc.
 */
export function useKvkHistory() {
    const [campaigns, setCampaigns] = useState(cache || []);
    const [loading, setLoading] = useState(!cache);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (cache) return;
        let cancelled = false;
        getDocs(collection(db, 'kvk_history'))
            .then(snap => {
                const list = snap.docs
                    .map(d => ({ docId: d.id, ...d.data() }))
                    .sort((a, b) => (b.order || 0) - (a.order || 0));
                cache = list;
                if (!cancelled) setCampaigns(list);
            })
            .catch(err => {
                console.error('Error loading kvk_history:', err);
                if (!cancelled) setError(err);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return { campaigns, loading, error };
}

// Called after a successful closure so the next mount refetches.
export function invalidateKvkHistoryCache() {
    cache = null;
}
