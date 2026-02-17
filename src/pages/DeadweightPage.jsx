import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Users, AlertTriangle, CheckCircle, Plane, Search, XCircle, ShieldAlert, UserX } from 'lucide-react';
import DataRefreshControl from '../components/DataRefreshControl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Input from '../components/ui/Input';
import StatCard from '../components/ui/StatCard';
import StatusFilter from '../components/ui/StatusFilter';

const DeadweightPage = () => {
    const { deadweight, loading, error } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const dwList = deadweight?.list || [];

    // Stats Calculation
    const stats = useMemo(() => {
        let reduciblePower = 0;
        let reducibleKP = 0;
        let migratedCount = 0;
        let kingPardonCount = 0;

        dwList.forEach(p => {
            const status = (p.status || '').trim();
            const accountAvailable = (p.accountAvailable || '').trim();

            // Counters
            if (status === 'Migrated') migratedCount++;
            if (status === 'King Pardon') kingPardonCount++;

            const isExcluded =
                accountAvailable === 'Disappeared' ||
                status === 'Vacation permit' ||
                status === 'King Pardon' ||
                status === 'Confirmed' ||
                status === 'Migrated';

            if (!isExcluded) {
                reduciblePower += (p.power || 0);
                reducibleKP += (p.kp || 0);
            }
        });

        return { reduciblePower, reducibleKP, migratedCount, kingPardonCount };
    }, [dwList]);

    const getStatusColor = (status) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('zeroed')) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        if (s.includes('refused')) return 'text-red-400 bg-red-400/10 border-red-400/20';
        if (s.includes('confirmed')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        if (s.includes('pardon')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        if (s.includes('migrated')) return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    };

    // 1. Filter by Search
    const searchedList = useMemo(() => {
        return dwList.filter(p => {
            return p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(p.id).includes(searchTerm);
        });
    }, [dwList, searchTerm]);

    // 2. Calculate Status Options with Counts
    const statusOptions = useMemo(() => {
        const counts = searchedList.reduce((acc, curr) => {
            const status = curr.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Get unique statuses from the data
        const uniqueStatuses = Array.from(new Set(dwList.map(p => p.status).filter(Boolean)));

        return uniqueStatuses.map(status => ({
            value: status,
            label: status,
            count: counts[status] || 0,
            colorClass: getStatusColor(status)
        })).sort((a, b) => b.count - a.count); // Sort by count desc
    }, [searchedList, dwList]);

    // 3. Filter by Status
    const filteredList = useMemo(() => {
        if (statusFilter === 'all') return searchedList;
        return searchedList.filter(p => p.status === statusFilter);
    }, [searchedList, statusFilter]);

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading Deadweight Data...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={36} />
                        Deadweight Tracking
                    </h1>
                    <p className="text-gray-400 mt-1">Monitoring inactive or non-compliant accounts ({dwList.length} tracked)</p>
                </div>
                <DataRefreshControl
                    pageId="deadweight"
                    title="Update List"
                    expectedFilePattern="Deadweight"
                />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Reducible Power"
                    value={formatNumber(stats.reduciblePower)}
                    icon={ShieldAlert}
                    color="red"
                />
                <StatCard
                    title="Reducible KP"
                    value={formatNumber(stats.reducibleKP)}
                    icon={UserX}
                    color="orange"
                />
                <StatCard
                    title="Migrated"
                    value={
                        <div className="flex items-baseline gap-1">
                            {stats.migratedCount}
                            <span className="text-sm text-slate-500 font-normal">/ {dwList.length}</span>
                        </div>
                    }
                    icon={Plane}
                    color="blue"
                />
                <StatCard
                    title="King Pardon"
                    value={stats.kingPardonCount}
                    icon={CheckCircle}
                    color="emerald"
                />
            </div>

            {/* Filters and Table */}
            <Card className="flex flex-col h-[600px]">
                <CardHeader className="flex flex-col gap-4 border-b border-white/5 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="whitespace-nowrap">Deadweight List</CardTitle>
                        <div className="w-full md:w-64">
                            <Input
                                placeholder="Search governor or ID..."
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
                        className="pb-2"
                    />
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <div className="h-full overflow-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead className="w-[80px] text-xs">ID</TableHead>
                                    <TableHead className="text-xs">Governor</TableHead>
                                    <TableHead className="text-xs">Power</TableHead>
                                    <TableHead className="text-xs">Kill Points</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-xs">Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredList.length > 0 ? (
                                    filteredList.map((row, index) => (
                                        <TableRow key={row.id || index} className="hover:bg-white/5 transition-colors">
                                            <TableCell className="font-mono text-xs text-slate-500">{row.id}</TableCell>
                                            <TableCell className="font-medium text-slate-300">{row.name}</TableCell>
                                            <TableCell className="font-mono text-slate-400">{formatNumber(row.power)}</TableCell>
                                            <TableCell className="font-mono text-slate-400">{formatNumber(row.kp)}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(row.status)}`}>
                                                    {row.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={row.note}>
                                                {row.note || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            No deadweight found matching filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DeadweightPage;
