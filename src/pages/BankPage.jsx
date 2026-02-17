import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Coins, Trees, CircleDot, Database, Wallet, Search } from 'lucide-react';
import DataRefreshControl from '../components/DataRefreshControl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import StatCard from '../components/ui/StatCard';

const BankPage = () => {
    const { bank, loading, error } = useData();

    const [selectedWeekIndex, setSelectedWeekIndex] = React.useState(0);

    // Stats for Top Cards
    const totals = bank?.total || { food: 0, wood: 0, stone: 0, gold: 0 };

    // History handling
    const history = bank?.history || [];
    // Fallback to active weekly if no history structure (e.g. old parse)
    const activeWeeklyData = history.length > 0
        ? history[selectedWeekIndex]?.data
        : (bank?.weekly || []);

    const weekLabels = history.length > 0
        ? history.map((h, i) => h.weekLabel)
        : ["Current Week"];

    // Sort by Total Donation (Week Total) descending
    const sortedWeeklyData = useMemo(() => {
        return [...(activeWeeklyData || [])].sort((a, b) => (b.weekTotal || 0) - (a.weekTotal || 0));
    }, [activeWeeklyData]);

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading Bank Data...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Wallet className="text-amber-500" size={36} />
                        Kingdom Treasury
                    </h1>
                    <p className="text-gray-400 mt-1">Resource tracking and contribution ledger</p>
                </div>
                <DataRefreshControl
                    pageId="bank"
                    title="Update Ledger"
                    expectedFilePattern="Bank"
                />
            </div>

            {/* Totals Cards (Current Treasury) */}
            {/* Totals Cards (Current Treasury) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Food"
                    value={formatNumber(totals.food)}
                    icon={CircleDot}
                    color="amber"
                />
                <StatCard
                    title="Total Wood"
                    value={formatNumber(totals.wood)}
                    icon={Trees}
                    color="emerald"
                />
                <StatCard
                    title="Total Stone"
                    value={formatNumber(totals.stone)}
                    icon={Database}
                    color="stone"
                />
                <StatCard
                    title="Total Gold"
                    value={formatNumber(totals.gold)}
                    icon={Coins}
                    color="yellow"
                />
            </div>

            {/* Week Selector */}
            {history.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {weekLabels.map((label, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedWeekIndex(idx)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedWeekIndex === idx
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Weekly Contribution Table */}
            <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <CardTitle>Weekly Contributions</CardTitle>
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-amber-400 border border-amber-500/20">
                            {weekLabels[selectedWeekIndex] || "Current Week"}
                        </span>
                    </div>
                    <div className="text-sm text-slate-400 font-mono">
                        {sortedWeeklyData?.length || 0} Contributors
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    {sortedWeeklyData?.length > 0 ? (
                        <div className="h-full overflow-auto custom-scrollbar">
                            <Table>
                                <TableHeader className="bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[80px] text-xs">ID</TableHead>
                                        <TableHead className="text-xs">Governor</TableHead>
                                        <TableHead className="text-right text-amber-500/80 text-xs">Food</TableHead>
                                        <TableHead className="text-right text-emerald-500/80 text-xs">Wood</TableHead>
                                        <TableHead className="text-right text-stone-500/80 text-xs">Stone</TableHead>
                                        <TableHead className="text-right text-yellow-500/80 text-xs">Gold</TableHead>
                                        <TableHead className="text-right font-bold text-white text-xs">Week Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedWeeklyData.map((row, idx) => (
                                        <TableRow key={row.id || idx} className="hover:bg-white/5 transition-colors">
                                            <TableCell className="font-mono text-xs text-slate-500">{row.id}</TableCell>
                                            <TableCell className="font-medium text-slate-300">{row.name}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">{formatNumber(row.food)}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">{formatNumber(row.wood)}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">{formatNumber(row.stone)}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">{formatNumber(row.gold)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-white">{formatNumber(row.weekTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <p>No weekly contribution data found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BankPage;
