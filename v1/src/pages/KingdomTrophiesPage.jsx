import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Trophy, ChevronLeft, ChevronRight, Crown, Award, Medal } from 'lucide-react';
import DataRefreshControl from '../components/DataRefreshControl';
import './KingdomTrophiesPage.css';

import { DATA_CONFIG } from '../config';

const KingdomTrophiesPage = () => {
    const [weeks, setWeeks] = useState([]);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const processWorkbook = (workbook) => {
        try {
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const parsedWeeks = [];
            let currentWeek = null;
            let currentTrophyType = null;

            // Vertical Parsing Logic
            jsonData.forEach((row) => {
                const firstCell = String(row[0] || "").trim();
                const secondCell = String(row[1] || "").trim();

                // Detect Week Header (e.g., "Week II...")
                if (firstCell.startsWith("Week")) {
                    if (currentWeek) parsedWeeks.push(currentWeek);
                    currentWeek = {
                        title: firstCell,
                        groups: {} // Key: TrophyType, Value: Array of players
                    };
                    currentTrophyType = null; // Reset for new week
                } else if (firstCell && firstCell !== "ID" && !secondCell) {
                    // It's likely a Trophy Type Header if not empty and not "ID"
                    currentTrophyType = firstCell;
                    if (currentWeek && !currentWeek.groups[currentTrophyType]) {
                        currentWeek.groups[currentTrophyType] = [];
                    }
                } else if (currentWeek && currentTrophyType && row.length >= 2) {
                    // It's a player row?
                    // Structure: [ID, Name, ...]
                    // Basic sanity check: ID should be numeric or string-numeric
                    if (row[0] && row[1]) {
                        currentWeek.groups[currentTrophyType].push({
                            id: row[0],
                            name: row[1],
                            score: row[2] || ""
                        });
                    }
                }
            });
            // Push the last week
            if (currentWeek) parsedWeeks.push(currentWeek);

            setWeeks(parsedWeeks);
            if (parsedWeeks.length > 0) setSelectedWeekIndex(0);
            setLoading(false);
            setError("");
        } catch (err) {
            console.error(err);
            setError("Failed to parse trophy data.");
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchAndParse = async () => {
            try {
                const response = await fetch(DATA_CONFIG.FILES.TROPHIES);
                if (!response.ok) throw new Error("Could not load trophy data file.");

                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                processWorkbook(workbook);

            } catch (err) {
                console.error(err);
                setError("Could not load trophies.");
                setLoading(false);
            }
        };

        fetchAndParse();
    }, []);

    const currentWeekData = useMemo(() => {
        if (weeks.length === 0) return null;
        return weeks[selectedWeekIndex];
    }, [weeks, selectedWeekIndex]);

    const getRankStyles = (rank) => {
        const lower = rank.toLowerCase();
        if (lower.includes('legendary') || lower.includes('king')) return {
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/50',
            icon: <Crown size={32} />
        };
        if (lower.includes('epic')) return {
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/50',
            icon: <Award size={28} />
        };
        if (lower.includes('elite')) return {
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/50',
            icon: <Medal size={24} />
        };
        return {
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/50',
            icon: <Medal size={24} />
        };
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading Trophies...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!currentWeekData) return <div className="p-8 text-center text-muted">No trophy data found.</div>;

    // Separate Legendary from others for layout
    // Defensive check: Ensure groups exists (handles potential HMR state mismatch)
    const groups = currentWeekData.groups || {};
    const legendaryKey = Object.keys(groups).find(k => k.toLowerCase().includes('legendary'));
    const otherKeys = Object.keys(groups).filter(k => k !== legendaryKey);

    return (
        <div className="page-container fade-in">
            <div className="page-header center-header">
                <h1 className="text-3xl font-bold text-gradient">Kingdom Trophies</h1>
                <p className="text-muted mb-4">Weekly awards for the most active players</p>

                <div className="mb-6">
                    <DataRefreshControl
                        pageId="trophies"
                        title="Update Trophies File"
                        expectedFilePattern="KingTrophies"
                        onDataLoaded={(workbook) => {
                            processWorkbook(workbook);
                            alert("Trophy data updated!");
                        }}
                    />
                </div>

                {/* Week Selector */}
                <div className="week-selector">
                    <button
                        className="btn btn-ghost"
                        disabled={selectedWeekIndex >= weeks.length - 1}
                        onClick={() => setSelectedWeekIndex(i => i + 1)}
                    >
                        <ChevronLeft /> Prev
                    </button>
                    <span className="week-title">{currentWeekData.title}</span>
                    <button
                        className="btn btn-ghost"
                        disabled={selectedWeekIndex <= 0}
                        onClick={() => setSelectedWeekIndex(i => i - 1)}
                    >
                        Next <ChevronRight />
                    </button>
                </div>
            </div>

            <div className="trophy-content">
                {/* Legendary Section */}
                {legendaryKey && groups[legendaryKey] && (
                    <div className="legendary-section mb-8">
                        <div className={`card trophy-card legendary ${getRankStyles(legendaryKey).bg} ${getRankStyles(legendaryKey).border}`}>
                            <div className={`trophy-icon ${getRankStyles(legendaryKey).color}`}>
                                {getRankStyles(legendaryKey).icon}
                            </div>
                            <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-yellow-500">{legendaryKey}</h2>
                            <div className="winners-list">
                                {groups[legendaryKey].map((w, idx) => (
                                    <div key={idx} className="winner-item">
                                        <span className="winner-name text-2xl font-bold">{w.player}</span>
                                        <span className="winner-type text-sm text-muted">{w.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Tiers Grid */}
                <div className="other-tiers-grid">
                    {otherKeys.map((key) => {
                        const style = getRankStyles(key);
                        return (
                            <div key={key} className={`card trophy-group-card ${style.border}`}>
                                <div className="group-header flex items-center gap-2 mb-4">
                                    <div className={`${style.color}`}>{style.icon}</div>
                                    <h3 className={`font-bold text-lg ${style.color}`}>{key}</h3>
                                </div>
                                <div className="group-list">
                                    {groups[key].map((w, idx) => (
                                        <div key={idx} className="group-winner-item py-2 border-b border-white/5 last:border-0">
                                            <div className="font-semibold">{w.player}</div>
                                            <div className="text-xs text-muted">{w.type}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default KingdomTrophiesPage;
