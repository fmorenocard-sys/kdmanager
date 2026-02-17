import { useState, useMemo, useEffect } from 'react';
import { Download, Upload, Filter, Search, ArrowUpDown, Trash2, Coins, Skull } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import FileUpload from '../components/FileUpload';
import DataRefreshControl from '../components/DataRefreshControl';
import './DeadweightPage.css';

import { DATA_CONFIG } from '../config';

const DeadweightPage = () => {
    // Initialize state from localStorage if available
    const [data, setData] = useState(() => {
        try {
            const saved = localStorage.getItem('rok_deadweight_data');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to load data from localStorage:", e);
            return [];
        }
    });
    const [lastUpdated, setLastUpdated] = useState(() => {
        try {
            return localStorage.getItem('rok_deadweight_updated') || null;
        } catch (e) {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDefaultData = async () => {
            // Only fetch if no data in local storage
            if (data.length === 0) {
                try {
                    const response = await fetch(DATA_CONFIG.FILES.TOP_300);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const workbook = XLSX.read(buffer, { type: 'array' });
                        const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.PLAYERS)); // Dynamic find
                        if (sheetName) {
                            const sheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(sheet);
                            handleDataLoaded(jsonData);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load default deadweight data", err);
                }
            }
            setLoading(false);
        };
        fetchDefaultData();
    }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'Power', direction: 'desc' });

    // Helper to clean numbers safely
    const cleanNumber = (val) => {
        if (typeof val === 'number') return val;
        const widthoutCommas = String(val || '0').replace(/,/g, '');
        const clean = parseFloat(widthoutCommas.replace(/[^0-9.-]/g, ''));
        return isNaN(clean) ? 0 : clean;
    };

    // Handle data loaded from file upload
    const handleDataLoaded = (loadedData) => {
        const cleanedData = loadedData.map(row => ({
            ...row,
            Power: cleanNumber(row.Power),
            'Kill Points': cleanNumber(row['Kill Points']),
            'Power Difference': cleanNumber(row['Power Difference'])
        })).filter(row => {
            // Filter out summary rows
            // 1. ID must exist and be numeric (strings like "186 DW" become NaN/0 in some parses, or we check raw)
            // 2. Name should not contain "Total"
            // 3. Power should be > 0 (unless it's a very fresh player, but deadweights usually have power)

            const idVal = row.ID;
            const isIdValid = idVal && !isNaN(String(idVal).replace(/[^0-9]/g, '')) && String(idVal).length > 4;
            const isNameValid = row.Name && !String(row.Name).toLowerCase().includes('total');

            // Specific check for the "186 DW" case found in line 186
            const isNotSummaryCount = !String(idVal).includes('DW');

            return isIdValid && isNameValid && isNotSummaryCount;
        });

        setData(cleanedData);

        // Save to LocalStorage
        const now = new Date().toLocaleString();
        setLastUpdated(now);
        localStorage.setItem('rok_deadweight_data', JSON.stringify(cleanedData));
        localStorage.setItem('rok_deadweight_updated', now);
    };

    const clearData = () => {
        setData([]);
        setLastUpdated(null);
        localStorage.removeItem('rok_deadweight_data');
        localStorage.removeItem('rok_deadweight_updated');
    };

    // Calculations
    const stats = useMemo(() => {
        const totalPower = data.reduce((acc, curr) => acc + (curr.Power || 0), 0);
        const totalKP = data.reduce((acc, curr) => acc + (curr['Kill Points'] || 0), 0);
        const avgPower = data.length ? totalPower / data.length : 0;

        // Check "Migrated" status (Case insensitive)
        const migratedCount = data.filter(p => String(p.Status || '').toLowerCase().trim() === 'migrated').length;

        return {
            totalPower,
            totalKP,
            avgPower,
            totalPlayers: data.length,
            migratedCount
        };
    }, [data]);

    // Filtering and Sorting
    const filteredData = useMemo(() => {
        let result = [...data];

        if (searchTerm) {
            result = result.filter(row =>
                String(row.Name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(row.ID || '').includes(searchTerm)
            );
        }

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US', {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(num);
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold">Deadweight Tracking</h1>
                    <div className="flex items-center gap-2 text-muted">
                        <p>Manage low performing players and migration status</p>
                        {lastUpdated && (
                            <span className="text-sm bg-tertiary px-2 py-1 rounded-md border border-border">
                                Last Updated: {lastUpdated}
                            </span>
                        )}
                    </div>
                </div>
                <div className="actions">
                    <button className="btn btn-ghost" onClick={clearData}>
                        <Trash2 size={18} /> Clear Data
                    </button>
                    <button className="btn btn-primary">
                        <Download size={18} /> Export Report
                    </button>
                    <DataRefreshControl
                        pageId="deadweight-header"
                        title="Update"
                        expectedFilePattern="Deadweight"
                        onDataLoaded={(workbook) => {
                            const sheetName = workbook.SheetNames[0];
                            const sheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(sheet);
                            handleDataLoaded(jsonData);
                        }}
                    />
                </div>
            </div>

            {data.length === 0 ? (
                <div className="upload-section flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                    <h2 className="text-xl font-bold mb-4">No Deadweight Data Found</h2>
                    <DataRefreshControl
                        pageId="deadweight"
                        title="Upload Deadweight Data"
                        expectedFilePattern="Deadweight"
                        onDataLoaded={(workbook) => {
                            const sheetName = workbook.SheetNames[0];
                            const sheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(sheet);
                            handleDataLoaded(jsonData);
                        }}
                    />
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="card stat-card">
                            <div className="stat-icon red"><Skull size={24} /></div>
                            <div>
                                <span className="stat-label">Total Deadweight Power</span>
                                <h3 className="stat-value">{formatNumber(stats.totalPower)}</h3>
                            </div>
                        </div>
                        <div className="card stat-card">
                            <div className="stat-icon purple"><Coins size={24} /></div>
                            <div>
                                <span className="stat-label">Total Kill Points (KP)</span>
                                <h3 className="stat-value">{formatNumber(stats.totalKP)}</h3>
                            </div>
                        </div>
                        <div className="card stat-card">
                            <div className="stat-icon blue"><Upload size={24} /></div>
                            <div>
                                <span className="stat-label">Migrated</span>
                                <h3 className="stat-value">{stats.migratedCount} / {stats.totalPlayers}</h3>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${stats.totalPlayers ? (stats.migratedCount / stats.totalPlayers) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Charts Section */}
                    <div className="charts-section card" style={{ marginTop: '20px', marginBottom: '20px', padding: '20px' }}>
                        <h3 className="text-lg font-bold mb-4">Top 10 Highest Power in List</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...data].sort((a, b) => b.Power - a.Power).slice(0, 10)}>
                                    <XAxis dataKey="Name" stroke="var(--text-muted)" />
                                    <YAxis stroke="var(--text-muted)" tickFormatter={(value) => new Intl.NumberFormat('en', { notation: "compact" }).format(value)} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'var(--glass-bg)' }}
                                    />
                                    <Bar dataKey="Power" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>


                    {/* Table Section */}
                    <div className="card table-container">
                        <div className="table-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="filters">
                                <button className="btn btn-ghost"><Filter size={18} /> Filter</button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('ID')}>ID</th>
                                        <th onClick={() => requestSort('Name')}>Player</th>
                                        <th onClick={() => requestSort('Power')} className="sortable">
                                            Power {sortConfig.key === 'Power' && <ArrowUpDown size={14} />}
                                        </th>
                                        <th onClick={() => requestSort('Kill Points')} className="sortable">
                                            KP {sortConfig.key === 'Kill Points' && <ArrowUpDown size={14} />}
                                        </th>
                                        <th>Status</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((row, index) => (
                                        <tr key={index}>
                                            <td className="font-mono">{row.ID}</td>
                                            <td className="font-bold">{row.Name}</td>
                                            <td className="text-warning">{formatNumber(row.Power)}</td>
                                            <td className="text-secondary">{formatNumber(row['Kill Points'])}</td>
                                            <td>
                                                <span className={`status-badge ${String(row.Status).toLowerCase().replace(' ', '-')}`}>
                                                    {row.Status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="text-muted text-sm">{row.Note}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DeadweightPage;
