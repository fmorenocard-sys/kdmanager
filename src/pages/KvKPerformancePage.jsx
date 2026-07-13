import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { Swords, Skull, TrendingUp, TrendingDown, Activity, ChevronUp, ChevronDown, Search, Users, History, Archive } from '../components/ui/icons';
import { useKvkHistory } from '../hooks/useKvkHistory';
import Card from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import Input from '../components/ui/Input';
import DataRefreshControl from '../components/DataRefreshControl';
import StatCard from '../components/ui/StatCard';
import StatusFilter from '../components/ui/StatusFilter';
import { DATA_CONFIG } from '../config/data-mapping';
import PageHeader from '../components/ui/PageHeader';

const KvKPerformancePage = () => {
    const { kvkStats, kvkFillerStats, loading, error } = useData();
    const { isDiscordUser } = useAuth();
    const { campaigns: historyCampaigns } = useKvkHistory();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState([]); // [] = All, array of values = multi-select
    const [sortConfig, setSortConfig] = useState({ key: 'finalPower', direction: 'desc' });
    const [activeTab, setActiveTab] = useState('main'); // 'main' | 'filler' | 'progression'
    const [selectedCampaignId, setSelectedCampaignId] = useState('current'); // F-015 campaign selector
    const [selectedPlayerId, setSelectedPlayerId] = useState(null); // F-015 progression view

    // BR-008: if the Discord-only tabs become unavailable (logout), fall back to main
    React.useEffect(() => {
        if (!isDiscordUser && activeTab !== 'main') setActiveTab('main');
    }, [isDiscordUser, activeTab]);

    // Reset/Set Sort when Tab Changes
    React.useEffect(() => {
        if (activeTab === 'filler') {
            setSortConfig({ key: 'goalPercent', direction: 'desc' });
        } else {
            setSortConfig({ key: 'finalPower', direction: 'desc' });
        }
    }, [activeTab]);

    // F-015: the live campaign plus archived ones from kvk_history
    const currentCampaign = useMemo(() => ({
        docId: 'current',
        title: DATA_CONFIG.KVK.TITLE || DATA_CONFIG.KVK.FILE,
        startDate: DATA_CONFIG.KVK.START_DATE || null,
        endDate: DATA_CONFIG.KVK.END_DATE || null,
        order: Number.MAX_SAFE_INTEGER,
        isCurrent: true,
        list: Array.isArray(kvkStats) ? kvkStats : [],
        fillerList: Array.isArray(kvkFillerStats) ? kvkFillerStats : []
    }), [kvkStats, kvkFillerStats]);

    const allCampaigns = useMemo(() => [currentCampaign, ...historyCampaigns], [currentCampaign, historyCampaigns]);
    const selectedCampaign = allCampaigns.find(c => c.docId === selectedCampaignId) || currentCampaign;

    // F-015: per-player index across all campaigns (governor ID is the stable join key)
    const playerIndex = useMemo(() => {
        const map = new Map();
        const asc = [...allCampaigns].sort((a, b) => (a.order || 0) - (b.order || 0));
        for (const c of asc) {
            const add = (p, isFiller) => {
                if (!p.id) return;
                const e = map.get(p.id) || { id: p.id, name: p.name, entries: [] };
                e.name = p.name || e.name; // keep the most recent display name
                e.entries.push({ ...p, isFiller, campaignTitle: c.title, campaignId: c.docId, isCurrent: !!c.isCurrent });
                map.set(p.id, e);
            };
            (c.list || []).forEach(p => add(p, false));
            (c.fillerList || []).forEach(p => add(p, true));
        }
        return map;
    }, [allCampaigns]);

    const playerMatches = useMemo(() => {
        if (activeTab !== 'progression') return [];
        const q = searchTerm.toLowerCase().trim();
        const all = [...playerIndex.values()];
        const filtered = q
            ? all.filter(p => p.name?.toLowerCase().includes(q) || String(p.id).includes(q))
            : all.sort((a, b) => b.entries.length - a.entries.length);
        return filtered.slice(0, 12);
    }, [playerIndex, searchTerm, activeTab]);

    const selectedPlayer = selectedPlayerId ? playerIndex.get(selectedPlayerId) : null;

    // Dedup by id to avoid React duplicate key warnings (in case XLSX has duplicate rows)
    const activeData = useMemo(() => {
        const raw = activeTab === 'main' ? selectedCampaign.list : selectedCampaign.fillerList;
        if (!Array.isArray(raw)) return [];
        const seen = new Set();
        return raw.filter((p, i) => {
            const key = String(p.id ?? p.name ?? `row_${i}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [activeTab, selectedCampaign]);

    // Summary Stats Calculation
    const stats = useMemo(() => {
        if (!activeData || !Array.isArray(activeData) || activeData.length === 0) return { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 };
        return activeData.reduce((acc, curr) => ({
            totalDead: acc.totalDead + (curr.totalDead || 0),
            totalPowerDiff: acc.totalPowerDiff + (curr.totalPowerDiff || 0),
            totalKpGained: acc.totalKpGained + (curr.totalKpGained || 0)
        }), { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 });
    }, [activeData]);

    const rateLabel = (rate) => {
        if (!rate) return t('common.unknown');
        const r = rate.toLowerCase();
        if (r === 'excellent') return t('ratings.excellent');
        if (r === 'good' || r === 'great') return t('ratings.good');
        if (r === 'need improvement' || r === 'average' || r === 'ok') return t('ratings.improve');
        if (r === 'dead weight' || r === 'bad' || r === 'poor') return t('ratings.dead');
        return rate;
    };

    const getRateClass = (rate) => {
        if (!rate) return 'v2-pill neutral';
        const r = rate.toLowerCase();
        if (r === 'excellent') return 'v2-pill excellent';
        if (r === 'good' || r === 'great') return 'v2-pill good';
        if (r === 'need improvement' || r === 'average' || r === 'ok') return 'v2-pill improve';
        if (r === 'dead weight' || r === 'bad' || r === 'poor') return 'v2-pill dead';
        return 'v2-pill neutral';
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
            { value: 'Excellent', label: t('ratings.excellent'), colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { value: 'Good', label: t('ratings.good'), colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { value: 'Need Improvement', label: t('ratings.improve_short'), colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
            { value: 'Dead Weight', label: t('ratings.dead'), colorClass: 'text-red-400 bg-red-500/10 border-red-500/20' },
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
        { k: 'initialKp', L: t('performance.init_kp') },
        { k: 'finalKp', L: t('performance.final_kp') },
        { k: 'totalDead', L: t('performance.total_dead') },
        { k: 'totalKpGained', L: t('performance.kp_gained') },
        { k: 'goalPercent', L: t('performance.goal_percent') },
        { k: 'rate', L: t('performance.rate') },
    ];

    const fillerColumns = [
        { k: 'id', L: 'ID' },
        { k: 'name', L: t('dashboard.name') },
        { k: 'initialPower', L: t('performance.init_power') },
        { k: 'finalPower', L: t('performance.final_power') },
        { k: 'kp', L: t('performance.kp') },
        { k: 't4Dead', L: t('performance.t4_dead') },
        { k: 't5Dead', L: t('performance.t5_dead') },
        { k: 'pass4Dead', L: t('performance.pass4_dead') },
        { k: 'pass7Dead', L: t('performance.pass7_dead') },
        { k: 'klDead', L: t('performance.kl_dead') },
        { k: 'totalDead', L: t('performance.total_dead') },
        { k: 'goalPercent', L: t('performance.goal_percent') },
    ];

    const columns = activeTab === 'main' ? mainColumns : fillerColumns;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader icon={Swords} title={t('performance.title')}>
                    {selectedCampaign.title}
                    {selectedCampaign.isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--grad-accent)' }}>
                            {t('kvk_history.current_badge')}
                        </span>
                    )}
                    {!selectedCampaign.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/20">
                            <Archive size={10} />
                            {t('kvk_history.archived_badge')}
                        </span>
                    )}
                    {(selectedCampaign.startDate || selectedCampaign.endDate) && (
                        <span className="text-xs text-slate-500">
                            {selectedCampaign.startDate || '…'} → {selectedCampaign.endDate || '…'}
                        </span>
                    )}
            </PageHeader>

            {/* F-015: campaign selector */}
            {historyCampaigns.length > 0 && activeTab !== 'progression' && (
                <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="kvk-campaign-select" className="text-sm text-slate-400 flex items-center gap-1.5">
                        <History size={14} />
                        {t('kvk_history.selector_label')}
                    </label>
                    <select
                        id="kvk-campaign-select"
                        value={selectedCampaignId}
                        onChange={(e) => { setSelectedCampaignId(e.target.value); setStatusFilter([]); setSearchTerm(''); }}
                        className="bg-slate-900/80 border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
                    >
                        <option value="current">{currentCampaign.title} — {t('kvk_history.current_badge')}</option>
                        {historyCampaigns.map(c => (
                            <option key={c.docId} value={c.docId}>{c.title}</option>
                        ))}
                    </select>
                </div>
            )}

            {selectedCampaign.isCurrent && <DataRefreshControl pageId="kvk" title="Update KvK Data" />}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2" role="group" aria-label="KvK Performance Views">
                {[
                    { id: 'main', label: t('performance.main_accounts'), icon: Users },
                    // BR-008: filler & progression views require a Discord-verified account
                    ...(isDiscordUser ? [
                        { id: 'filler', label: t('performance.filler_accounts'), icon: Users },
                        { id: 'progression', label: t('kvk_history.progression_tab'), icon: History }
                    ] : [])
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setActiveTab(tab.id); setStatusFilter([]); setSearchTerm(''); }}
                            aria-pressed={isActive}
                            className={`v2-tab select-none ${isActive ? 'on' : 'off'}`}
                        >
                            <tab.icon size={20} weight={isActive ? 'fill' : 'regular'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab !== 'progression' && (<>
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
            <Card className="overflow-hidden">
                <div className="overflow-auto custom-scrollbar relative max-h-[800px]">
                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-3 p-3">
                        {filteredAndSortedData.map((row, index) => (
                            <div key={`${row.id || 'unknown'}-${index}`} className="bg-[var(--surface-solid)] p-3 rounded-xl border border-[var(--border-flat)] flex flex-col gap-3 overflow-hidden">
                                <div className="flex justify-between items-center border-b border-[var(--border-flat)] pb-2 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded shrink-0">#{index + 1}</span>
                                        <Avatar id={row.id} name={row.name} size="sm" className="border border-[var(--border-flat)] shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-white text-sm truncate">{row.name}</span>
                                            <span className="text-[10px] text-slate-500 truncate">{row.id}</span>
                                        </div>
                                    </div>
                                    {activeTab === 'main' && row.rate && (
                                        <span className={`shrink-0 ${getRateClass(row.rate)}`}>
                                            {rateLabel(row.rate)}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {columns.filter(c => !['id', 'name', 'rate'].includes(c.k)).map(({ k, L }) => (
                                        <div key={k} className="flex justify-between items-center bg-[var(--border-flat)] p-1.5 rounded gap-1 min-w-0">
                                            <span className="text-slate-500 text-[10px] sm:text-xs truncate">{L}</span>
                                            <span className="font-mono text-white text-right text-[10px] sm:text-xs shrink-0 whitespace-nowrap">
                                                {k === 'goalPercent' ? (
                                                    <span className="font-mono font-bold tabular-nums" style={{ color: (typeof row.goalPercent === 'number' && row.goalPercent >= 1) ? 'var(--success)' : (typeof row.goalPercent === 'number' && row.goalPercent >= 0.5) ? 'var(--rating-improve)' : 'var(--rating-dead)' }}>
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
                                                    className="border border-[var(--border-flat)]"
                                                />
                                                <span className="truncate">{row.name}</span>
                                            </div>
                                        </TableCell>

                                        {/* Generic Cell Rendering based on columns */}
                                        {columns.slice(2).map(({ k }) => (
                                            <TableCell key={k} className="text-left text-xs py-1 px-2 tabular-nums">
                                                {k === 'goalPercent' ? (
                                                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: (typeof row.goalPercent === 'number' && row.goalPercent >= 1) ? 'var(--success)' : (typeof row.goalPercent === 'number' && row.goalPercent >= 0.5) ? 'var(--rating-improve)' : 'var(--rating-dead)' }}>
                                                        {typeof row.goalPercent === 'number' ? `${(row.goalPercent * 100).toFixed(1)}%` : row.goalPercent}
                                                    </span>
                                                ) : k === 'rate' ? (
                                                    <span className={getRateClass(row.rate)}>
                                                        {rateLabel(row.rate)}
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
            </>)}

            {/* F-015 / US-012: player progression across campaigns */}
            {activeTab === 'progression' && (
                <div className="space-y-4">
                    <div className="w-full max-w-md">
                        <Input
                            aria-label={t('kvk_history.select_player_hint')}
                            placeholder={t('kvk_history.select_player_hint')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search size={16} />}
                        />
                    </div>

                    {/* Player matches */}
                    <div className="flex flex-wrap gap-2" role="listbox" aria-label={t('kvk_history.select_player_hint')}>
                        {playerMatches.map(p => {
                            const isSelected = p.id === selectedPlayerId;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedPlayerId(p.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm border transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                        isSelected
                                            ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/40'
                                            : 'bg-[var(--border-flat)] text-slate-300 border-[var(--border-flat)] hover:border-slate-500'
                                    }`}
                                >
                                    <Avatar id={p.id} name={p.name} size="xs" className="border border-[var(--border-flat)]" />
                                    <span className="max-w-[140px] truncate">{p.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">×{p.entries.length}</span>
                                </button>
                            );
                        })}
                        {playerMatches.length === 0 && (
                            <p className="text-sm text-slate-500">{t('kvk_history.no_data')}</p>
                        )}
                    </div>

                    {/* Progression detail */}
                    {selectedPlayer && (
                        <Card className="overflow-hidden">
                            <div className="p-4 border-b border-[var(--border-flat)] flex items-center gap-3">
                                <Avatar id={selectedPlayer.id} name={selectedPlayer.name} size="sm" className="border border-[var(--border-flat)]" />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-white truncate">{selectedPlayer.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono">{selectedPlayer.id}</p>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden flex flex-col gap-3 p-3">
                                {selectedPlayer.entries.map((e, i) => (
                                    <div key={`${e.campaignId}-${i}`} className="bg-[var(--surface-solid)] p-3 rounded-xl border border-[var(--border-flat)] flex flex-col gap-2">
                                        <div className="flex justify-between items-center gap-2 border-b border-[var(--border-flat)] pb-2">
                                            <span className="font-bold text-white text-sm truncate">{e.campaignTitle}</span>
                                            <span className="flex gap-1 shrink-0">
                                                {e.isFiller && <span className="px-2 py-0.5 rounded-full text-[10px] border text-sky-400 bg-sky-500/10 border-sky-500/20">{t('performance.filler_accounts')}</span>}
                                                {e.rate && <span className={getRateClass(e.rate)}>{rateLabel(e.rate)}</span>}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('performance.init_power')}</span><span className="font-mono text-white">{formatNumber(e.initialPower)}</span></div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('performance.final_power')}</span><span className="font-mono text-white">{formatNumber(e.finalPower)}</span></div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('performance.kp')}</span><span className="font-mono text-emerald-400">{e.totalKpGained != null ? `+${formatNumber(e.totalKpGained)}` : formatNumber(e.kp)}</span></div>
                                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('performance.total_dead')}</span><span className="font-mono text-red-400">{formatNumber(e.totalDead)}</span></div>
                                        </div>
                                        {typeof e.goalPercent === 'number' && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-[9px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{ width: `${Math.min(e.goalPercent * 100, 100)}%`, background: e.goalPercent >= 1 ? 'linear-gradient(90deg,#10b981,#34d399)' : e.goalPercent >= 0.5 ? 'linear-gradient(90deg,#f59e0b,#facc15)' : 'linear-gradient(90deg,#ef4444,#f87171)' }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-slate-300 shrink-0">{(e.goalPercent * 100).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-900/80">
                                        <TableRow>
                                            <TableHead className="text-left text-xs">{t('kvk_history.campaign_col')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.init_power')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.final_power')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.kp')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.total_dead')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.goal_percent')}</TableHead>
                                            <TableHead className="text-left text-xs">{t('performance.rate')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedPlayer.entries.map((e, i) => (
                                            <TableRow key={`${e.campaignId}-${i}`} className="hover:bg-white/5 border-b border-white/5">
                                                <TableCell className="text-xs py-2 px-2 text-white font-medium whitespace-nowrap">
                                                    {e.campaignTitle}
                                                    {e.isFiller && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] border text-sky-400 bg-sky-500/10 border-sky-500/20">{t('performance.filler_accounts')}</span>}
                                                    {e.isCurrent && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] text-white border border-transparent" style={{ background: 'var(--grad-accent)' }}>{t('kvk_history.current_badge')}</span>}
                                                </TableCell>
                                                <TableCell className="text-xs py-2 px-2 tabular-nums text-gray-300">{formatNumber(e.initialPower)}</TableCell>
                                                <TableCell className="text-xs py-2 px-2 tabular-nums text-gray-300">{formatNumber(e.finalPower)}</TableCell>
                                                <TableCell className="text-xs py-2 px-2 tabular-nums text-emerald-400 font-bold">{e.totalKpGained != null ? `+${formatNumber(e.totalKpGained)}` : formatNumber(e.kp)}</TableCell>
                                                <TableCell className="text-xs py-2 px-2 tabular-nums text-red-400 font-bold">{formatNumber(e.totalDead)}</TableCell>
                                                <TableCell className="text-xs py-2 px-2 min-w-[140px]">
                                                    {typeof e.goalPercent === 'number' ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-[9px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-full overflow-hidden min-w-[60px]">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{ width: `${Math.min(e.goalPercent * 100, 100)}%`, background: e.goalPercent >= 1 ? 'linear-gradient(90deg,#10b981,#34d399)' : e.goalPercent >= 0.5 ? 'linear-gradient(90deg,#f59e0b,#facc15)' : 'linear-gradient(90deg,#ef4444,#f87171)' }}
                                                                />
                                                            </div>
                                                            <span className="font-mono text-slate-300">{(e.goalPercent * 100).toFixed(1)}%</span>
                                                        </div>
                                                    ) : <span className="text-slate-600">—</span>}
                                                </TableCell>
                                                <TableCell className="text-xs py-2 px-2">
                                                    {e.rate ? (
                                                        <span className={getRateClass(e.rate)}>{rateLabel(e.rate)}</span>
                                                    ) : <span className="text-slate-600">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}

                    {!selectedPlayer && playerMatches.length > 0 && (
                        <p className="text-sm text-slate-500">{t('kvk_history.select_player_hint')}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default KvKPerformancePage;
