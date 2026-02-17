import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DATA_CONFIG } from '../config/data-mapping';
import { parsePlayers, parseHistory, parseBank, parseTrophies, parseDeadweight, parseKvkStats } from '../utils/data-parser';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const [state, setState] = useState({
        players: [],
        history: [],
        bank: null,
        trophies: [],
        deadweight: null,
        kvkStats: [],
        loading: true,
        error: null,
        lastUpdated: null
    });

    const fetchData = async () => {
        try {
            // Fetch generated JSONs
            const baseUrl = import.meta.env.BASE_URL;
            const [playersRes, historyRes, bankRes, trophiesRes, deadweightRes, kvkRes] = await Promise.all([
                fetch(`${baseUrl}data/players.json`),
                fetch(`${baseUrl}data/kingdom_history.json`),
                fetch(`${baseUrl}data/bank.json`),
                fetch(`${baseUrl}data/trophies.json`),
                fetch(`${baseUrl}data/deadweight.json`),
                fetch(`${baseUrl}data/kvk_stats.json`)
            ]);

            if (!playersRes.ok) throw new Error("Failed to load players data");

            const players = await playersRes.json();
            const history = historyRes.ok ? await historyRes.json() : [];
            const bank = bankRes.ok ? await bankRes.json() : null;
            const trophies = trophiesRes.ok ? await trophiesRes.json() : [];
            const deadweight = deadweightRes.ok ? await deadweightRes.json() : null;
            const kvkStats = kvkRes.ok ? await kvkRes.json() : [];

            setState(prev => ({
                ...prev,
                players,
                history,
                bank: bank || null,
                trophies,
                deadweight,
                kvkStats,
                loading: false,
                lastUpdated: new Date()
            }));

        } catch (err) {
            console.error("Failed to load default data:", err);
            setState(prev => ({ ...prev, loading: false, error: "Could not load default data." }));
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const processUpload = async (file, type) => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            // Determine what to update based on file/type or guess
            const newPlayers = parsePlayers(workbook);
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

    return (
        <DataContext.Provider value={{ ...state, refreshData: processUpload }}>
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
