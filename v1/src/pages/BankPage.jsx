import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Landmark, Upload, TrendingUp, Users } from 'lucide-react';
import DataRefreshControl from '../components/DataRefreshControl';

import { DATA_CONFIG } from '../config';

const BankPage = () => {
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);

    useEffect(() => {
        const fetchBankData = async () => {
            try {
                const response = await fetch(DATA_CONFIG.FILES.BANK);
                if (!response.ok) throw new Error("Could not load bank ledger.");
                const buffer = await response.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                processBankLedger(workbook);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchBankData();
    }, []);

    const processBankLedger = (workbook) => {
        // "Weekly Contribution" sheet
        console.log("Workbook Sheets:", workbook.SheetNames);
        const sheetName = workbook.SheetNames.find(n =>
            n.trim() === DATA_CONFIG.SHEETS.BANK_WEEKLY || n.toLowerCase().includes(DATA_CONFIG.SHEETS.BANK_WEEKLY.toLowerCase())
        );

        if (!sheetName) {
            console.error("Weekly Contribution sheet not found");
            setLoading(false);
            return;
        }

        console.log("Found sheet:", sheetName);
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row dynamically (look for "Week" or date-like string)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => String(cell).toLowerCase().includes('week') || String(cell).match(/\d{1,2}\/\d{1,2}/))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error("Could not find header row with 'Week' columns");
            setLoading(false);
            return;
        }

        const headers = jsonData[headerRowIndex] || [];
        console.log("Found Header Row:", headerRowIndex, headers);

        const weekColumns = [];
        headers.forEach((h, idx) => {
            if (String(h).toLowerCase().includes('week') || String(h).match(/\d{1,2}\/\d{1,2}/)) {
                weekColumns.push({ index: idx, name: h });
            }
        });
        console.log("Identified week columns:", weekColumns);

        // Parse data rows (start from headerRowIndex + 1)
        const statsByWeek = weekColumns.map(col => ({
            name: col.name,
            totalRSS: 0,
            contributors: 0
        }));

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            weekColumns.forEach((col, weekIdx) => {
                const val = Number(row[col.index]) || 0;
                if (val > 0) {
                    statsByWeek[weekIdx].totalRSS += val;
                    statsByWeek[weekIdx].contributors += 1;
                }
            });
        }

        setWeeklyData(statsByWeek);
        setLoading(false);
    };

    const formatNumber = (num) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    if (loading) return <div className="p-8 text-center text-muted">Loading Bank Data...</div>;

    return (
        <div className="page-container fade-in">
            <header className="page-header mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
                        <Landmark size={32} /> Kingdom Bank
                    </h1>
                    <p className="text-muted">Weekly contribution analytics and treasury tracking</p>
                </div>
                <DataRefreshControl
                    pageId="bank"
                    title="Update Bank File"
                    expectedFilePattern="Bank Ledger"
                    onDataLoaded={(workbook) => {
                        processBankLedger(workbook);
                        alert("Bank data updated!");
                    }}
                />
            </header>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Total RSS Chart */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-400" /> Weekly RSS Income
                    </h2>
                    <div className="h-[300px]" style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" />
                                <YAxis tickFormatter={formatNumber} stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    formatter={(value) => formatNumber(value)}
                                />
                                <Bar dataKey="totalRSS" fill="#4ade80" name="Total RSS" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Contributors Chart */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Users size={20} className="text-blue-400" /> Active Contributors
                    </h2>
                    <div className="h-[300px]" style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" />
                                <YAxis stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                />
                                <Line type="monotone" dataKey="contributors" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} name="Contributors" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Weekly Table */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Detailed Weekly Breakdown</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Week</th>
                                <th className="text-right">Total RSS</th>
                                <th className="text-right">Contributors</th>
                                <th className="text-right">Avg / Contributor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyData.map((week, idx) => (
                                <tr key={idx} className="hover:bg-white/5">
                                    <td className="font-semibold">{week.name}</td>
                                    <td className="text-right text-green-300 font-mono">{week.totalRSS.toLocaleString()}</td>
                                    <td className="text-right font-mono">{week.contributors}</td>
                                    <td className="text-right text-muted font-mono">
                                        {week.contributors > 0
                                            ? formatNumber(week.totalRSS / week.contributors)
                                            : 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BankPage;
