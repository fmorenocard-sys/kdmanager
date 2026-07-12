import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DATA_CONFIG } from '../config/data-mapping';
import { parsePlayers, parseHistory, parseBank, parseTrophies, parseDeadweight, parseKvkStats } from '../utils/data-parser';
import { db } from '../config/firebase';
import { doc, onSnapshot } from "firebase/firestore";

const deduplicateById = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter(item => {
        if (!item.id) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

const DataContext = createContext(null);
export { DataContext };

export const DataProvider = ({ children }) => {
    const [state, setState] = useState({
        players: [],
        history: [],
        bank: null,
        trophies: [],
        deadweight: null,
        kvkStats: [],
        kvkFillerStats: [],
        stats: null,
        avatars: {},
        loading: true,
        error: null,
        lastUpdated: null
    });

    // E-001 (2026-07-12): Firestore is the ONLY data source. The static JSON
    // fallback (public/data, built from stale local workbooks) has been removed —
    // it caused BUG-005 by racing and clobbering fresh snapshots.
    useEffect(() => {

        // Real-time listeners for Firestore Sync
        const unsubPlayers = onSnapshot(doc(db, "static_data", "players"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.list) setState(prev => ({ ...prev, players: deduplicateById(data.list), loading: false, lastUpdated: new Date() }));
                else setState(prev => ({ ...prev, loading: false }));
            } else {
                setState(prev => ({ ...prev, loading: false }));
            }
        }, (err) => {
            console.error("Firestore players listener error:", err);
            setState(prev => ({ ...prev, loading: false, error: "Could not load data from Firestore." }));
        });

        const unsubBank = onSnapshot(doc(db, "static_data", "bank"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // bank document structure matches bankData in function: { total, weekly, history }
                setState(prev => ({ ...prev, bank: data, lastUpdated: new Date() }));
            }
        });

        const unsubTrophies = onSnapshot(doc(db, "static_data", "trophies"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.weekList) setState(prev => ({ ...prev, trophies: data.weekList, lastUpdated: new Date() }));
            }
        });

        const unsubDeadweight = onSnapshot(doc(db, "static_data", "deadweight"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setState(prev => ({ ...prev, deadweight: data, lastUpdated: new Date() }));
            }
        });

        const unsubHistory = onSnapshot(doc(db, "static_data", "history"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.list) setState(prev => ({ ...prev, history: data.list, lastUpdated: new Date() }));
            }
        });

        const unsubStats = onSnapshot(doc(db, "static_data", "stats"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setState(prev => ({ ...prev, stats: data, lastUpdated: new Date() }));
            }
        });

        // Freshest known avatar URLs { governorId: { url, source } } — see Etude_Avatars_Joueurs.md
        const unsubAvatars = onSnapshot(doc(db, "static_data", "avatars"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.map) setState(prev => ({ ...prev, avatars: data.map }));
            }
        });

        // KvK Stats listener if needed
        const unsubKvk = onSnapshot(doc(db, "static_data", "kvk"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.list) setState(prev => ({ ...prev, kvkStats: data.list, lastUpdated: new Date() }));
            }
        });

        const unsubKvkFiller = onSnapshot(doc(db, "static_data", "kvk_filler"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.list) setState(prev => ({ ...prev, kvkFillerStats: data.list, lastUpdated: new Date() }));
            }
        });

        return () => {
            unsubPlayers();
            unsubBank();
            unsubTrophies();
            unsubDeadweight();
            unsubHistory();
            unsubStats();
            unsubAvatars();
            unsubKvk();
            unsubKvkFiller();
        };
    }, []);

    const processUpload = async (file, type) => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            // Determine what to update based on file/type or guess
            const newPlayers = deduplicateById(parsePlayers(workbook));
            const newHistory = parseHistory(workbook);
            const newBank = parseBank(workbook);
            const newTrophies = parseTrophies(workbook);
            const newDeadweight = parseDeadweight(workbook);
            const newKvkStats = parseKvkStats(workbook);

            setState(prev => ({
                ...prev,
                players: newPlayers.length > 0 ? newPlayers : prev.players,
                history: newHistory.length > 0 ? newHistory : prev.history,
                bank: newBank || prev.bank,
                trophies: newTrophies.length > 0 ? newTrophies : prev.trophies,
                deadweight: newDeadweight || prev.deadweight,
                kvkStats: newKvkStats && newKvkStats.length > 0 ? newKvkStats : prev.kvkStats,
                loading: false,
                lastUpdated: new Date()
            }));

            return true;
        } catch (err) {
            console.error("Upload parsing error:", err);
            setState(prev => ({ ...prev, loading: false, error: "Failed to parse uploaded file." }));
            return false;
        }
    };

    const triggerSync = async () => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            // Call the Cloud Function
            const response = await fetch("https://us-central1-kd-97-manager.cloudfunctions.net/syncData", {
                method: 'GET', // or POST if needed, usually GET for simple triggers or POST for secure
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Sync failed with status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Sync Result:", result);

            if (result.success) {
                // Determine if we need to auto-reload or just let listeners handle it.
                // Listeners should handle it.
                setState(prev => ({ ...prev, loading: false, lastUpdated: new Date() }));
                return true;
            } else {
                throw new Error(result.error || "Sync reported failure");
            }
        } catch (err) {
            console.error("Sync Trigger Error:", err);
            setState(prev => ({ ...prev, loading: false, error: "Cloud Sync Failed. Check console." }));
            return false;
        }
    };

    return (
        <DataContext.Provider value={{ ...state, refreshData: processUpload, triggerSync }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};
