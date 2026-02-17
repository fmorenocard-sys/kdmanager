import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    LayoutDashboard, Users, Trophy, TrendingUp,
    Search, Filter, ChevronDown, ChevronUp, Activity
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import PlayerSidePanel from '../components/PlayerSidePanel';
import DataRefreshControl from '../components/DataRefreshControl';
import './DashboardPage.css';

import { DATA_CONFIG, BANK_CONFIG } from '../config';

const DashboardPage = () => {
    const [players, setPlayers] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'power', direction: 'desc' });
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [bankData, setBankData] = useState(null);

    // Function to process workbook data
    const processWorkbook = (workbook) => {
        // 1. Parse Players Data
        const playerSheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.PLAYERS));
        let parsedPlayers = [];
        if (playerSheetName) {
            const sheet = workbook.Sheets[playerSheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Skip header row (index 0)
            parsedPlayers = jsonData.slice(1).map((row, index) => ({
                rank: index + 1,
                id: row[DATA_CONFIG.PLAYER_COLUMNS.ID],
                name: row[DATA_CONFIG.PLAYER_COLUMNS.NAME],
                power: Number(row[DATA_CONFIG.PLAYER_COLUMNS.POWER]) || 0,
                powerDiff: Number(row[DATA_CONFIG.PLAYER_COLUMNS.POWER_DIFF]) || 0,
                kp: Number(row[DATA_CONFIG.PLAYER_COLUMNS.KP]) || 0,
                deads: Number(row[DATA_CONFIG.PLAYER_COLUMNS.DEADS]) || 0,
                t1Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T1_KILLS]) || 0,
                t4Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T4_KILLS]) || 0,
                t5Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T5_KILLS]) || 0,
                ranged: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RANGED]) || 0,
                rssGathered: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RSS_GATHERED]) || 0,
                rssAssistance: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RSS_ASSISTANCE]) || 0,
                helps: Number(row[DATA_CONFIG.PLAYER_COLUMNS.HELPS]) || 0,
                alliance: row[DATA_CONFIG.PLAYER_COLUMNS.ALLIANCE] || "Unknown",
                cityHall: Number(row[DATA_CONFIG.PLAYER_COLUMNS.CITY_HALL]) || 0,
                location: row[DATA_CONFIG.PLAYER_COLUMNS.LOCATION] || "",
                notes: row[DATA_CONFIG.PLAYER_COLUMNS.NOTES] || ""
            })).filter(p => p.id && p.name);
        }

        // 2. Parse Kingdom Evolution Data
        const dashSheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.KINGDOM_STATS));
        let parsedHistory = [];
        if (dashSheetName) {
            const sheet = workbook.Sheets[dashSheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Find start of "Kingdom Stats Scan" table
            let startRow = -1;
            for (let i = 0; i < jsonData.length; i++) {
                if (JSON.stringify(jsonData[i]).includes("Kingdom Stats Scan")) {
                    startRow = i;
                    break;
                }
            }

            if (startRow !== -1) {
                // We look for the first row with a valid number in Col 1 (Date) after the title
                const scanDataCandidate = jsonData.slice(startRow + 1);

                parsedHistory = scanDataCandidate.map(row => {
                    let date = row[1]; // Col 1
                    if (!date) return null;

                    // Date Parsing
                    if (typeof date === 'number') {
                        // Basic validity check for Excel date (approx year 2000+)
                        if (date > 35000) {
                            const parsedDate = new Date(Math.round((date - 25569) * 86400 * 1000));
                            date = parsedDate.toLocaleDateString();
                        } else {
                            return null;
                        }
                    } else if (typeof date === 'string' && !date.includes('/')) {
                        // Skip if string doesn't look like a date
                        return null;
                    }

                    return {
                        date: date,
                        power: Number(row[2]) || 0, // Col 2
                        kp: Number(row[3]) || 0     // Col 3
                    };
                }).filter(h => h && h.power > 0);
            }
        }

        setPlayers(parsedPlayers);
        setHistoryData(parsedHistory);
        setLoading(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(DATA_CONFIG.FILES.TOP_300);
                if (!response.ok) throw new Error("Could not load dashboard data.");

                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                processWorkbook(workbook);

                // Load Bank Data
                try {
                    const bankResponse = await fetch(DATA_CONFIG.FILES.BANK);
                    if (bankResponse.ok) {
                        const bankBuffer = await bankResponse.arrayBuffer();
                        const bankWorkbook = XLSX.read(bankBuffer, { type: 'array' });
                        const dbSheet = bankWorkbook.Sheets[DATA_CONFIG.SHEETS.BANK_DASHBOARD];
                        if (dbSheet) {
                            const dbJson = XLSX.utils.sheet_to_json(dbSheet, { header: 1 });
                            // Row indices from config
                            const colIdx = BANK_CONFIG.DASHBOARD_COL_INDEX;
                            setBankData({
                                food: Number(dbJson[BANK_CONFIG.DASHBOARD_ROWS.FOOD]?.[colIdx]) || 0,
                                wood: Number(dbJson[BANK_CONFIG.DASHBOARD_ROWS.WOOD]?.[colIdx]) || 0,
                                stone: Number(dbJson[BANK_CONFIG.DASHBOARD_ROWS.STONE]?.[colIdx]) || 0,
                                gold: Number(dbJson[BANK_CONFIG.DASHBOARD_ROWS.GOLD]?.[colIdx]) || 0
                            });
                        }
                    }
                } catch (e) {
                    console.warn("Could not load bank ledger", e);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data. Please upload a file.");
                setLoading(false); // Enable manual upload usage
            }
        };

        fetchData();
    }, []);

    const handleFileUpload = (data) => {
        // Data comes from FileUpload component which might be array of objects or workbook
        // Since FileUpload component uses XLSX utils to parse to JSON, we might need adjustments.
        // HOWEVER, standard FileUpload in this project (checked previously) returns parsed JSON for a specific sheet.
        // We need the WHOLE workbook to parse multiple sheets.
        // Let's modify FileUpload to pass the workbook object or handle raw file here?
        // Actually, let's reuse the FileUpload component but we might need to tweak it or just let it pass the file object if we want full workbook.

        // checking FileUpload.jsx in next step...
        // Assuming for now passing the workbook directly would be best if we modify FileUpload, 
        // OR we just accept the parsed "14_2_2026" sheet if that's what FileUpload returns.

        // But wait, we need BOTH sheets.
        // So standard FileUpload might limit us if it only returns one sheet's data.
        // Let's assume for this specific page we want to upload the Excel file and re-process it entirely.
    };

    // For now, let's just use the processWorkbook logic. 
    // If the user uses FileUpload, we need to handle the file object.

    // Metrics Calculation
    const metrics = useMemo(() => {
        const totalPower = players.reduce((sum, p) => sum + p.power, 0);
        const totalKP = players.reduce((sum, p) => sum + p.kp, 0);
        const ch25Players = players.filter(p => p.cityHall === 25);
        const totalCH25Power = ch25Players.reduce((sum, p) => sum + p.power, 0);

        return {
            totalPower,
            totalKP,
            playerCount: players.length,
            ch25Count: ch25Players.length,
            totalCH25Power
        };
    }, [players]);

    // Sorting & Filtering
    const sortedPlayers = useMemo(() => {
        let items = [...players];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(p =>
                String(p.name).toLowerCase().includes(lower) ||
                String(p.id).includes(lower) ||
                String(p.alliance).toLowerCase().includes(lower)
            );
        }

        items.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [players, searchTerm, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const formatNumber = (num) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    if (loading) return <div className="p-8 text-center text-muted">Loading Dashboard...</div>;

    return (
        <div className="page-container fade-in">
            <header className="page-header mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gradient">Kingdom Dashboard</h1>
                    <p className="text-muted">Real-time overview of Kingdom 2997 stats and evolution</p>
                </div>
                <DataRefreshControl
                    pageId="dashboard"
                    title="Update Kingdom Stats"
                    expectedFilePattern="Top 300"
                    onDataLoaded={(workbook) => {
                        processWorkbook(workbook);
                        alert("Dashboard data updated!");
                    }}
                />
            </header>

            <PlayerSidePanel
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
            />

            {/* Summary Cards */}
            <div className="stats-grid mb-8">
                <div className="stat-card">
                    <div className="stat-icon bg-blue-500/10 text-blue-400"><Activity /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Power</span>
                        <h3 className="stat-value">{formatNumber(metrics.totalPower)}</h3>
                        <span className="stat-sub">{formatNumber(metrics.totalCH25Power)} (CH25)</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-red-500/10 text-red-400"><Trophy /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Kill Points</span>
                        <h3 className="stat-value">{formatNumber(metrics.totalKP)}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-purple-500/10 text-purple-400"><Users /></div>
                    <div className="stat-info">
                        <span className="stat-label">Active Players</span>
                        <h3 className="stat-value">{metrics.playerCount}</h3>
                        <span className="stat-sub">{metrics.ch25Count} CH25 Cities</span>
                    </div>
                </div>
            </div>

            {/* Bank Balance Card */}
            {bankData && (
                <div className="card mb-8 fade-in w-full">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Activity size={24} className="text-yellow-400" />
                        </div>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                            Kingdom Treasury
                        </span>
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                        {/* Food */}
                        <div className="relative overflow-hidden p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group min-h-[120px]">
                            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-orange-400 to-yellow-600 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-2">Food</div>
                            <div className="text-2xl font-black text-white/90">{formatNumber(bankData.food)}</div>
                        </div>

                        {/* Wood */}
                        <div className="relative overflow-hidden p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group min-h-[120px]">
                            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-emerald-400 to-green-600 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-2">Wood</div>
                            <div className="text-2xl font-black text-white/90">{formatNumber(bankData.wood)}</div>
                        </div>

                        {/* Stone */}
                        <div className="relative overflow-hidden p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group min-h-[120px]">
                            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-blue-400 to-indigo-600 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-2">Stone</div>
                            <div className="text-2xl font-black text-white/90">{formatNumber(bankData.stone)}</div>
                        </div>

                        {/* Gold */}
                        <div className="relative overflow-hidden p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group min-h-[120px]">
                            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-yellow-300 to-amber-500 opacity-[0.1] group-hover:opacity-[0.2] transition-opacity blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-2">Gold</div>
                            <div className="text-2xl font-black text-white/90">{formatNumber(bankData.gold)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Evolution Chart */}
            {historyData.length > 0 && (
                <div className="chart-section card mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary" /> Kingdom Evolution
                    </h2>
                    <div className="h-[300px]" style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorKP" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="var(--text-muted)" />
                                <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={formatNumber} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tickFormatter={formatNumber} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    formatter={(value) => formatNumber(value)}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="power" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPower)" name="Kingdom Power" />
                                <Area yAxisId="right" type="monotone" dataKey="kp" stroke="#ef4444" fillOpacity={1} fill="url(#colorKP)" name="Kingdom KP" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Players Table */}
            <div className="players-section card">
                <div className="table-header-actions mb-4">
                    <h2 className="text-xl font-bold">Top Players</h2>
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or alliance..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="clickable">
                                    <div className="th-content">ID</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="clickable">
                                    <div className="th-content">Name</div>
                                </th>
                                <th onClick={() => handleSort('alliance')} className="clickable">
                                    <div className="th-content">Alliance</div>
                                </th>
                                <th onClick={() => handleSort('power')} className="clickable">
                                    <div className="th-content justify-end">
                                        Power {sortConfig.key === 'power' && (sortConfig.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('kp')} className="clickable">
                                    <div className="th-content justify-end">
                                        Kill Points {sortConfig.key === 'kp' && (sortConfig.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('cityHall')} className="clickable">
                                    <div className="th-content justify-end">
                                        CH {sortConfig.key === 'cityHall' && (sortConfig.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                                    </div>
                                </th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayers.slice(0, 100).map((player) => (
                                <tr key={player.id} onClick={() => setSelectedPlayer(player)} className="cursor-pointer hover:bg-white/5 transition-colors">
                                    <td className="font-mono text-muted">{player.id}</td>
                                    <td className="font-semibold">{player.name}</td>
                                    <td><span className="badge badge-outline">{player.alliance}</span></td>
                                    <td className="text-blue-300">{player.power.toLocaleString()}</td>
                                    <td className="text-red-300">{player.kp.toLocaleString()}</td>
                                    <td>{player.cityHall}</td>
                                    <td className="text-right">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={(e) => { e.stopPropagation(); setSelectedPlayer(player); }}
                                            title="View Details"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedPlayers.length > 100 && (
                        <div className="p-4 text-center text-muted border-t border-white/5">
                            Showing top 100 of {sortedPlayers.length} players
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
