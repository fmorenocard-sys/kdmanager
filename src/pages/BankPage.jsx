import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Coins, Trees, CircleDot, Database, Wallet, Search } from 'lucide-react';
import DataRefreshControl from '../components/DataRefreshControl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';

const BankPage = () => {
    const { bank, loading, error } = useData();
    const { t } = useTranslation();

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

    if (loading) return <div className="p-8 text-center text-muted">{t('common.loading')}</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
                        <Wallet className="text-amber-500" size={24} />
                        {t('bank.title')}
                    </h1>
                    <p className="text-gray-400 mt-1">{t('bank.subtitle')}</p>
                </div>
            </div>
            <DataRefreshControl
                pageId="bank"
                title="Update Ledger"
                expectedFilePattern="Bank"
            />

            {/* Totals Cards (Current Treasury) */}
            {/* Totals Cards (Current Treasury) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('bank.total_food')}
                    value={formatNumber(totals.food)}
                    icon={CircleDot}
                    color="amber"
                />
                <StatCard
                    title={t('bank.total_wood')}
                    value={formatNumber(totals.wood)}
                    icon={Trees}
                    color="emerald"
                />
                <StatCard
                    title={t('bank.total_stone')}
                    value={formatNumber(totals.stone)}
                    icon={Database}
                    color="stone"
                />
                <StatCard
                    title={t('bank.total_gold')}
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
            <Card className="flex flex-col h-[600px] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <CardTitle>{t('bank.weekly_contributions')}</CardTitle>
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-amber-400 border border-amber-500/20">
                            {weekLabels[selectedWeekIndex] || "Current Week"}
                        </span>
                    </div>
                    <div className="text-sm text-slate-400 font-mono">
                        {t('bank.contributors', { count: sortedWeeklyData?.length || 0 })}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    {sortedWeeklyData?.length > 0 ? (
                        <div className="h-full overflow-auto overflow-x-auto custom-scrollbar">
                            <Table>
                                <TableHeader className="bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-xs text-center">{t('dashboard.rank')}</TableHead>
                                        <TableHead className="text-xs">{t('war.governor')}</TableHead>
                                        <TableHead className="text-right text-amber-500/80 text-xs">Food</TableHead>
                                        <TableHead className="text-right text-emerald-500/80 text-xs">Wood</TableHead>
                                        <TableHead className="text-right text-stone-500/80 text-xs">Stone</TableHead>
                                        <TableHead className="text-right text-yellow-500/80 text-xs">Gold</TableHead>
                                        <TableHead className="text-right font-bold text-white text-xs">{t('bank.week_total')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedWeeklyData.map((row, idx) => (
                                        <TableRow key={row.id || idx} className="hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-center font-medium text-slate-500 group-hover:text-slate-300">
                                                #{idx + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        id={row.id}
                                                        name={row.name}
                                                        size="sm"
                                                        className="bg-slate-800 border border-slate-700"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{row.name}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{row.id}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
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
                            <p>{t('common.no_data')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BankPage;
