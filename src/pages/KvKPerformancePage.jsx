import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Swords, Skull, TrendingUp, TrendingDown, Activity, ChevronUp, ChevronDown, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import Input from '../components/ui/Input';
import DataRefreshControl from '../components/DataRefreshControl';
import StatCard from '../components/ui/StatCard';
import StatusFilter from '../components/ui/StatusFilter';
import avatarMapping from '../data/player-avatars.json';

const KvKPerformancePage = () => {
    const { kvkStats, loading, error } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'finalPower', direction: 'desc' });

    // Summary Stats Calculation
    const stats = useMemo(() => {
        if (!kvkStats || kvkStats.length === 0) return { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 };
        return kvkStats.reduce((acc, curr) => ({
            totalDead: acc.totalDead + (curr.totalDead || 0),
            totalPowerDiff: acc.totalPowerDiff + (curr.totalPowerDiff || 0),
            totalKpGained: acc.totalKpGained + (curr.totalKpGained || 0)
        }), { totalDead: 0, totalPowerDiff: 0, totalKpGained: 0 });
    }, [kvkStats]);

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
        if (!kvkStats) return [];
        return kvkStats.filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.id).includes(searchTerm)
        );
    }, [kvkStats, searchTerm]);

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

        if (statusFilter !== 'all') {
            data = data.filter(p => p.rate === statusFilter);
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
        if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity ml-1"><ChevronDown size={14} /></div>;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="text-primary ml-1" />
            : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const formatNumber = (num) => num?.toLocaleString() || '0';

    if (loading) return <div className="p-8 text-center text-muted">Loading KvK Stats...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Swords className="text-red-500" size={36} />
                        Fighting Performance
                    </h1>
                    <p className="text-gray-400 mt-1">SoC 2: Storm of Stratagems (2025)</p>
                </div>
                <DataRefreshControl pageId="kvk" title="Update KvK Data" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Total Dead"
                    value={formatNumber(stats.totalDead)}
                    icon={Skull}
                    color="red"
                />

                <StatCard
                    title="Total Power Diff"
                    value={
                        <span className={stats.totalPowerDiff < 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatNumber(stats.totalPowerDiff)}
                        </span>
                    }
                    icon={TrendingDown}
                    color="amber"
                />

                <StatCard
                    title="Total KP Gained"
                    value={formatNumber(stats.totalKpGained)}
                    icon={Activity}
                    color="emerald"
                />
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="w-full max-w-md">
                        <Input
                            placeholder="Search Governor ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search size={16} />}
                        />
                    </div>
                </div>

                {/* Status Filters */}
                <StatusFilter
                    options={statusOptions}
                    selected={statusFilter}
                    onSelect={setStatusFilter}
                />

                <div className="text-sm text-gray-400 self-end">
                    Showing <span className="text-white font-bold">{filteredAndSortedData.length}</span> records
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden border border-slate-700/50 bg-slate-900/40 backdrop-blur-md">
                <div className="overflow-x-auto max-h-[800px]">
                    <Table>
                        <TableHeader className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                            <TableRow>
                                <TableHead className="w-12 text-center text-slate-500 text-xs font-mono select-none">#</TableHead>
                                {[
                                    { k: 'id', L: 'ID' },
                                    { k: 'name', L: 'Name' },
                                    { k: 'initialPower', L: 'Init Power' },
                                    { k: 'finalPower', L: 'Final Power' },
                                    { k: 'initialKp', L: 'Init KP' },
                                    { k: 'finalKp', L: 'Final KP' },
                                    { k: 'totalDead', L: 'Total Dead' },
                                    { k: 'totalKpGained', L: 'KP Gained' },
                                    { k: 'goalPercent', L: '% Goal' },
                                    { k: 'rate', L: 'Rate' },
                                ].map(({ k, L }) => (
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
                                <TableRow key={row.id} className="hover:bg-white/5 transition-colors border-b border-white/5">
                                    <TableCell className="w-8 text-center text-slate-500 text-xs border-r border-white/5 font-mono select-none py-1 px-2">{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500 text-left py-1 px-2">{row.id}</TableCell>
                                    <TableCell className="font-medium text-white text-left text-xs py-1 px-2 truncate max-w-[150px]" title={row.name}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                                                {avatarMapping[row.id] ? (
                                                    <img
                                                        src={avatarMapping[row.id]}
                                                        alt={row.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {row.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="truncate">{row.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-left text-gray-400 text-xs py-1 px-2 tabular-nums">{formatNumber(row.initialPower)}</TableCell>
                                    <TableCell className="text-left text-white font-medium text-xs py-1 px-2 tabular-nums">{formatNumber(row.finalPower)}</TableCell>
                                    <TableCell className="text-left text-gray-400 text-xs py-1 px-2 tabular-nums">{formatNumber(row.initialKp)}</TableCell>
                                    <TableCell className="text-left text-white font-medium text-xs py-1 px-2 tabular-nums">{formatNumber(row.finalKp)}</TableCell>
                                    <TableCell className="text-left text-red-400 font-bold text-xs py-1 px-2 tabular-nums">{formatNumber(row.totalDead)}</TableCell>
                                    <TableCell className="text-left text-emerald-400 font-bold text-xs py-1 px-2 tabular-nums">+{formatNumber(row.totalKpGained)}</TableCell>
                                    <TableCell className="text-left py-1 px-2">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${(typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 100) ? 'text-green-400 bg-green-400/10' :
                                            (typeof row.goalPercent === 'number' && row.goalPercent * 100 >= 50) ? 'text-yellow-400 bg-yellow-400/10' :
                                                'text-red-400 bg-red-400/10'
                                            }`}>
                                            {typeof row.goalPercent === 'number' ? `${(row.goalPercent * 100).toFixed(1)}%` : row.goalPercent}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-left py-1 px-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRateColor(row.rate)}`}>
                                            {row.rate}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default KvKPerformancePage;
