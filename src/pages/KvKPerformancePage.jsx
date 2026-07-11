import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Avatar from '../components/ui/Avatar';
import { Swords, Skull, TrendingUp, TrendingDown, Activity, ChevronUp, ChevronDown, Search, Users } from 'lucide-react';
import Card from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import Input from '../components/ui/Input';
import DataRefreshControl from '../components/DataRefreshControl';
import StatCard from '../components/ui/StatCard';
import StatusFilter from '../components/ui/StatusFilter';
import { DATA_CONFIG } from '../config/data-mapping';
const KvKPerformancePage = () => {
    const { kvkStats, kvkFillerStats, loading, error } = useData();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState([]); // [] = All, array of values = multi-select
    const [sortConfig, setSortConfig] = useState({ key: 'finalPower', direction: 'desc' });
    const [activeTab, setActiveTab] = useState('main'); // 'main' | 'filler'

    // Reset/Set Sort when Tab Changes
    React.useEffect(() => {
        if (activeTab === 'filler') {
            setSortConfig({ key: 'goalPercent', direction: 'desc' });
        } else {
            setSortConfig({ key: 'finalPower', direction: 'desc' });
        }
    }, [activeTab]);

    // Dedup by id to avoid React duplicate key warnings (in case XLSX has duplicate rows)
    const activeData = useMemo(() => {
        const raw = activeTab === 'main' ? kvkStats : kvkFillerStats;
        if (!Array.isArray(raw)) return [];
        const seen = new Set();
        return raw.filter(p => {
            const key = String(p.id ?? p.name ?? Math.random());
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [activeTab, kvkStats, kvkFillerStats]);

    // Summary Stats Calculation
    const stats = useMemo(() => {
        if (!activeData || !Array.isArray(activeData) || activeData.length === 0) return { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 };
        return activeData.reduce((acc, curr) => ({
            totalDead: acc.totalDead + (curr.totalDead || 0),
            totalPowerDiff: acc.totalPowerDiff + (curr.totalPowerDiff || 0),
            totalKpGained: acc.totalKpGained + (curr.totalKpGained || 0)
        }), { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 });
    }, [activeData]);

    const getRateColor = (rate) => {
        if (!rate) return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        const r = rate.toLowerCase();
        if (r === 'excellent') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        if (r === 'good' || r === 'great') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (r === 'need improvement' || r === 'average' || r === 'ok') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        if (r === 'dead weight' || r === 'bad' || r === 'poor') return 'text-red-400 bg-red-500/10 border-red-500/20';
        return 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    };

    // 1. Filter by Search
    const searchedData = useMemo(() => {
        if (!activeData || !Array.isArray(activeData)) return [];
        return activeData.filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.id).includes(searchTerm)
        );
    }, [activeData, searchTerm]);

    // 2. Calculate Status Counts (based on search results)
    const statusOptions = useMemo(() => {
        const counts = searchedData.reduce((acc, curr) => {
            const rate = curr.rate || 'Unknown';
            acc[rate] = (acc[rate] || 0) + 1;
            return acc;
        }, {});

        // Define specific order and colors based on actual data
        const predefined = [
            { value: 'Excellent', label: 'Excellent', colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { value: 'Good', label: 'Good', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { value: 'Need Improvement', label: 'Need Imp.', colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
            { value: 'Dead Weight', label: 'Dead Weight', colorClass: 'text-red-400 bg-red-500/10 border-red-500/20' },
            // Keeping fallbacks just in case
            { value: 'Great', label: 'Great', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { value: 'Average', label: 'Average', colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { value: 'Poor', label: 'Poor', colorClass: 'text-red-400 bg-red-500/10 border-red-500/20' },
        ];

        return predefined.map(opt => ({
            ...opt,
            count: counts[opt.value] || 0
        })).filter(opt => opt.count > 0); // Only show statuses that exist in current view
    }, [searchedData]);

    // 3. Filter by Status & Sort
    const filteredAndSortedData = useMemo(() => {
        let data = [...searchedData];

        if (statusFilter.length > 0) {
            data = data.filter(p => statusFilter.includes(p.rate));
        }

        if (sortConfig.key) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key] || 0;
                const bValue = b[sortConfig.key] || 0;

                // Special handling for string comparison if needed, but assuming numbers for metrics
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [searchedData, statusFilter, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Helper for Sort Icon
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-40 xl:opacity-0 group-hover:opacity-60 transition-opacity ml-1"><ChevronDown size={14} /></div>;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="text-primary ml-1" />
            : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const formatNumber = (num) => num?.toLocaleString() || '0';

    if (loading) return <div className="p-8 text-center text-muted">{t('common.loading')}</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    const mainColumns = [
        { k: 'id', L: 'ID' },
        { k: 'name', L: t('dashboard.name') },
        { k: 'initialPower', L: t('performance.init_power') },
        { k: 'finalPower', L: t('performance.final_power') },
        { k: 'initialKp', L: 'Init KP' },
        { k: 'finalKp', L: 'Final KP' },
        { k: 'totalDead', L: t('performance.total_dead') },
        { k: 'totalKpGained', L: 'KP Gained' },
        { k: 'goalPercent', L: '% Goal' },
        { k: 'rate', L: t('performance.rate') },
    ];

    const fillerColumns = [
        { k: 'id', L: 'ID' },
        { k: 'name', L: t('dashboard.name') },
        { k: 'initialPower', L: t('performance.init_power') },
        { k: 'finalPower', L: t('performance.final_power') },
        { k: 'kp', L: 'KP' },
        { k: 't4Dead', L: 'T4 Dead' },
        { k: 't5Dead', L: 'T5 Dead' },
        { k: 'pass4Dead', L: 'Pass 4 Dead' },
        { k: 'pass7Dead', L: 'Pass 7 Dead' },
        { k: 'klDead', L: 'KL Dead' },
        { k: 'totalDead', L: t('performance.total_dead') },
        { k: 'goalPercent', L: '% Goal' },
    ];

    const columns = activeTab === 'main' ? mainColumns : fillerColumns;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
                    <Swords className="text-red-500" size={24} />
                    {t('performance.title')}
                </h1>
                <p className="text-gray-400 mt-1">{DATA_CONFIG.KVK.TITLE || DATA_CONFIG.KVK.FILE}</p>
            </div>
            <DataRefreshControl pageId="kvk" title="Update KvK Data" />

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2" role="group" aria-label="KvK Performance Views">
                {[
                    { id: 'main', label: t('performance.main_accounts'), icon: Users },
                    { id: 'filler', label: t('performance.filler_accounts'), icon: Users }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setActiveTab(tab.id); setStatusFilter([]); setSearchTerm(''); }}
                            aria-pressed={isActive}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border select-none ${
                                isActive 
                                    ? 'ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10 text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    title={t('performance.total_dead')}
                    value={formatNumber(stats.totalDead)}
                    icon={Skull}
                    color="red"
                />

                {activeTab === 'main' && (
                    <>
                        <StatCard
                            title={t('performance.total_power_diff')}
                            value={
                                <span className={stats.totalPowerDiff < 0 ? 'text-red-400' : 'text-emerald-400'}>
                                    {formatNumber(stats.totalPowerDiff)}
                                </span>
                            }
                            icon={TrendingDown}
                            color="amber"
                        />

                        <StatCard
                            title={t('performance.total_kp_gained')}
                            value={formatNumber(stats.totalKpGained)}
                            icon={Activity}
                            color="emerald"
                        />
                    </>
                )}
                {activeTab === 'filler' && (
                    /* Placeholder/Alternative cards for Filler if needed, or just keep Total Dead */
                    <div className="hidden md:block"></div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="w-full max-w-md">
                        <Input
                            aria-label={t('performance.search_placeholder')}
                            placeholder={t('performance.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search size={16} />}
                        />
                    </div>
                </div>

                {/* Status Filters - Only if rates exist */}
                {activeTab === 'main' && (
                    <StatusFilter
                        options={statusOptions}
                        selected={statusFilter}
                        onSelect={(value) => {
                            if (value === 'all') {
                                setStatusFilter([]);
                            } else {
                                setStatusFilter(prev =>
                                    prev.includes(value)
                                        ? prev.filter(v => v !== value) // deselect
                                        : [...prev, value]              // add
                                );
                            }
                        }}
                    />
                )}

                <div className="text-sm text-gray-400 self-end">
                    {t('common.showing_records', { count: filteredAndSortedData.length })}
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden border border-slate-700/50 bg-slate-900/40 backdrop-blur-md">
                <div className="overflow-auto custom-scrollbar relative max-h-[800px]">
                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-3 p-3">
                        {filteredAndSortedData.map((row, index) => (
                            <div key={`${row.id || 'unknown'}-${index}`} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex flex-col gap-3 overflow-hidden">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded shrink-0">#{index + 1}</span>
                                        <Avatar id={row.id} name={row.name} size="sm" className="border border-slate-700 bg-slate-800 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-white text-sm truncate">{row.name}</span>
                                            <span className="text-[10px] text-slate-500 truncate">{row.id}</span>
                                        </div>
                                    </div>
                                    {activeTab === 'main' && row.rate && (
                                        <span className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRateColor(row.rate)}`}>
                                            {row.rate}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {columns.filter(c => !['id', 'name', 'rate'].includes(c.k)).map(({ k, L }) => (
                                        <div key={k} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded gap-1 min-w-0">
                                            <span className="text-slate-500 text-[10px] sm:text-xs truncate">{L}</span>
                                            <span className="font-mono text-white text-right text-[10px] sm:text-xs shrink-0 whitespace-nowrap">
                                                {k === 'goalPercent' ? (
                                                    <span className={`${(typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 100) ? 'text-green-400' : (typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 50) ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {typeof row.goalPercent === 'number' ? `${(row.goalPercent * 100).toFixed(1)}%` : row.goalPercent}
                                                    </span>
                                                ) : k.toLowerCase().includes('dead') ? (
                                                    <span className="text-red-400">{formatNumber(row[k])}</span>
                                                ) : k.toLowerCase().includes('gained') ? (
                                                    <span className="text-emerald-400">+{formatNumber(row[k])}</span>
                                                ) : formatNumber(row[k])}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full min-w-[800px]">
                        <Table>
                            <TableHeader className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="w-12 text-center text-slate-500 text-xs font-mono select-none">#</TableHead>
                                    {columns.map(({ k, L }) => (
                                        <TableHead
                                            key={k}
                                            onClick={() => handleSort(k)}
                                            className="cursor-pointer hover:text-white transition-colors group select-none text-left whitespace-nowrap text-xs py-2 px-2"
                                        >
                                            <div className="flex items-center gap-1">
                                                {L}
                                                <SortIcon columnKey={k} />
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedData.map((row, index) => (
                                    <TableRow key={`${row.id || 'unknown'}-${index}`} className="hover:bg-white/5 transition-colors border-b border-white/5">
                                        <TableCell className="w-8 text-center text-slate-500 text-xs border-r border-white/5 font-mono select-none py-1 px-2">{index + 1}</TableCell>
                                        <TableCell className="font-mono text-xs text-gray-500 text-left py-1 px-2">{row.id}</TableCell>
                                        <TableCell className="font-medium text-white text-left text-xs py-1 px-2 truncate max-w-[150px]" title={row.name}>
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    id={row.id}
                                                    name={row.name}
                                                    size="xs"
                                                    className="border border-slate-700"
                                                />
                                                <span className="truncate">{row.name}</span>
                                            </div>
                                        </TableCell>

                                        {/* Generic Cell Rendering based on columns */}
                                        {columns.slice(2).map(({ k }) => (
                                            <TableCell key={k} className="text-left text-xs py-1 px-2 tabular-nums">
                                                {k === 'goalPercent' ? (
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${(typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 100) ? 'text-green-400 bg-green-400/10' :
                                                        (typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 50) ? 'text-yellow-400 bg-yellow-400/10' :
                                                            'text-red-400 bg-red-400/10'
                                                        }`}>
                                                        {typeof row.goalPercent === 'number' ? `${(row.goalPercent * 100).toFixed(1)}%` : row.goalPercent}
                                                    </span>
                                                ) : k === 'rate' ? (
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRateColor(row.rate)}`}>
                                                        {row.rate}
                                                    </span>
                                                ) : k.toLowerCase().includes('dead') ? (
                                                    <span className="text-red-400 font-bold">{formatNumber(row[k])}</span>
                                                ) : k.toLowerCase().includes('gained') ? (
                                                    <span className="text-emerald-400 font-bold">+{formatNumber(row[k])}</span>
                                                ) : (
                                                    <span className="text-gray-300">{formatNumber(row[k])}</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default KvKPerformancePage;
