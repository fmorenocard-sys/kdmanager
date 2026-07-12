import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Coins, Trees, CircleDot, Database, Wallet, Search , Bank } from '../components/ui/icons';
import DataRefreshControl from '../components/DataRefreshControl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';

import PageHeader from '../components/ui/PageHeader';

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
            <PageHeader icon={Bank} title={t('bank.title')} subtitle={t('bank.subtitle')} />
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
                <div className="flex flex-wrap gap-2 pb-2" role="group" aria-label="Filter by Week">
                    {weekLabels.map((label, idx) => {
                        const isActive = selectedWeekIndex === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedWeekIndex(idx)}
                                aria-pressed={isActive}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border select-none ${
                                    isActive
                                        ? 'ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/10 text-amber-400 bg-amber-500/10 border-amber-500/20'
                                        : 'bg-[var(--border-flat)] text-slate-400 border-[var(--border-flat)] hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Weekly Contribution Table */}
            <Card className="flex flex-col h-[600px] overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="whitespace-nowrap">{t('bank.weekly_contributions')}</CardTitle>
                        <span className="text-xs px-2 py-1 rounded bg-[var(--border-flat)] text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                            {weekLabels[selectedWeekIndex] || "Current Week"}
                        </span>
                    </div>
                    <div className="text-sm text-slate-400 font-mono whitespace-nowrap shrink-0">
                        {t('bank.contributors', { count: sortedWeeklyData?.length || 0 })}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    {sortedWeeklyData?.length > 0 ? (
                        <div className="h-full overflow-auto custom-scrollbar relative">
                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4">
                                {sortedWeeklyData.map((row, idx) => (
                                    <div key={row.id || idx} className="bg-[var(--surface-solid)] p-3 rounded-xl border border-[var(--border-flat)] flex flex-col gap-3">
                                        <div className="flex items-center gap-3 border-b border-[var(--border-flat)] pb-2">
                                            <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded">#{idx + 1}</span>
                                            <Avatar id={row.id} name={row.name} size="sm" className="border border-[var(--border-flat)]" />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm truncate max-w-[140px]">{row.name}</span>
                                                <span className="text-[10px] text-slate-500">{row.id}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded">
                                                <span className="text-amber-500/80">Food</span>
                                                <span className="font-mono text-slate-300">{formatNumber(row.food)}</span>
                                            </div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded">
                                                <span className="text-emerald-500/80">Wood</span>
                                                <span className="font-mono text-slate-300">{formatNumber(row.wood)}</span>
                                            </div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded">
                                                <span className="text-stone-500/80">Stone</span>
                                                <span className="font-mono text-slate-300">{formatNumber(row.stone)}</span>
                                            </div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded">
                                                <span className="text-yellow-500/80">Gold</span>
                                                <span className="font-mono text-slate-300">{formatNumber(row.gold)}</span>
                                            </div>
                                            <div className="col-span-2 flex justify-between bg-white/5 border border-white/10 p-2 rounded">
                                                <span className="text-white font-bold">{t('bank.week_total')}</span>
                                                <span className="font-mono font-bold text-amber-400">{formatNumber(row.weekTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block w-full min-w-[700px]">
                                <Table>
                                    <TableHeader className="bg-[var(--surface)] sticky top-0 backdrop-blur-md z-10">
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
                                                            className="border border-[var(--border-flat)]"
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
