import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import DataRefreshControl from '../components/DataRefreshControl';
import PlayerDetailPanel from '../components/PlayerDetailPanel';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ComposedChart, Area, Line } from 'recharts';
import { TrendingUp, Users, Skull, Sword, Coins, Search, Filter, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown } from '../components/ui/icons';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';

const DashboardPage = () => {
    const { players, history, bank, stats: kingdomStats } = useData();
    const { t } = useTranslation();
    const [sortConfig, setSortConfig] = useState({ key: 'power', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAlliance, setSelectedAlliance] = useState("All");
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    // Filter & Sort Logic
    const alliances = useMemo(() => {
        const unique = new Set(players.map(p => p.alliance).filter(Boolean));
        return ["All", ...Array.from(unique).sort()];
    }, [players]);

    const filteredPlayers = useMemo(() => {
        return players.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(p.id).includes(searchTerm);
            const matchesAlliance = selectedAlliance === "All" || p.alliance === selectedAlliance;
            return matchesSearch && matchesAlliance;
        });
    }, [players, searchTerm, selectedAlliance]);

    const sortedPlayers = useMemo(() => {
        let sorted = [...filteredPlayers];
        sorted.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            // Force numeric comparison for known number fields to avoid string comparison bugs
            if (['power', 'kp', 'deads', 'rank'].includes(sortConfig.key)) {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredPlayers, sortConfig]);

    const displayedPlayers = useMemo(() => sortedPlayers.slice(0, 100), [sortedPlayers]);

    // Aggregate Stats (based on filtered data if we want dynamic stats, but usually kingdom stats are global)
    // Let's keep cards global for now.
    const stats = useMemo(() => {
        return players.reduce((acc, p) => ({
            power: acc.power + (p.power || 0),
            kp: acc.kp + (p.kp || 0),
            deads: acc.deads + (p.deads || 0)
        }), { power: 0, kp: 0, deads: 0 });
    }, [players]);

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const renderSortHeader = (label, sortKey, align = 'right') => {
        const isActive = sortConfig.key === sortKey;
        return (
            <TableHead 
                className={`cursor-pointer hover:bg-white/5 hover:text-white transition-colors group select-none text-xs ${align === 'right' ? 'text-right' : 'text-left'}`}
                onClick={() => handleSort(sortKey)}
            >
                <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    {label}
                    <span className={`transition-colors ${isActive ? 'text-primary' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        {isActive ? (
                            sortConfig.direction === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </span>
                </div>
            </TableHead>
        );
    };

    return (
        <div className="space-y-8">
            <PlayerDetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold v2-title neutral">{t('dashboard.title')}</h2>
                    <p className="text-slate-400 mt-1">Kingdom 2997</p>
                </div>
            </div>

            <DataRefreshControl />

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title={t('dashboard.power')}
                    value={formatNumber(kingdomStats?.totalPowerCH25 || stats.power)}
                    icon={TrendingUp}
                    color="blue"
                    subtext={kingdomStats?.totalPowerCH25 ? "CH25 only" : "Total"}
                />
                <StatCard
                    title={t('dashboard.kp')}
                    value={formatNumber(stats.kp)}
                    icon={Sword}
                    color="red"
                />
                <StatCard
                    title={t('dashboard.dead')}
                    value={formatNumber(stats.deads)}
                    icon={Skull}
                    color="slate"
                />
                <StatCard
                    title={t('dashboard.players')}
                    value={players.length}
                    icon={Users}
                    color="amber"
                    subtext="Top 300"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Leaderboard Table section */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Filters & Sorting */}
                    <div className="v2-glass p-4 md:p-5">
                        <div className="flex flex-col gap-4">
                            {/* Search and Alliance Filter Row */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="flex-1 w-full relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        aria-label={t('common.search')}
                                        placeholder={t('common.search')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--border-flat)] flex items-center justify-center border border-[var(--border-flat)] text-slate-400">
                                        <Filter size={18} />
                                    </div>
                                    <select
                                        className="flex-1 sm:flex-none bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer min-w-[140px]"
                                        value={selectedAlliance}
                                        onChange={(e) => setSelectedAlliance(e.target.value)}
                                    >
                                        {alliances.map(a => (
                                            <option key={a} value={a} className="bg-slate-900">{a === "All" ? t('common.all') : a}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Mobile Sort Row (visible on small screens to replace table headers) */}
                            <div className="flex sm:hidden items-center gap-2 pt-3 border-t border-[var(--border-flat)]/50">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold min-w-[60px]">Sort by:</span>
                                <select
                                    className="flex-1 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    value={sortConfig.key}
                                    onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value }))}
                                >
                                    <option value="rank">Rank</option>
                                    <option value="power">Power</option>
                                    <option value="kp">Kill Points</option>
                                    <option value="deads">Deads</option>
                                </select>
                                <button
                                    onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'desc' ? 'asc' : 'desc' }))}
                                    className="p-2 bg-[var(--border-flat)] hover:bg-slate-700/50 rounded-lg border border-[var(--border-flat)] transition-colors text-slate-300 min-w-[44px] flex items-center justify-center"
                                >
                                    {sortConfig.direction === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <Card className="flex flex-col h-[600px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('dashboard.player_list')}</CardTitle>
                            <div className="text-sm text-slate-400">
                                {t('common.showing_records', { count: sortedPlayers.length })}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <div className="h-full overflow-auto custom-scrollbar relative">
                                {/* Mobile Card View */}
                                <div className="md:hidden flex flex-col gap-3 p-4">
                                    {displayedPlayers.map((player) => (
                                        <div
                                            key={player.id}
                                            className="bg-[var(--surface-solid)] p-3 rounded-xl border border-[var(--border-flat)] hover:border-primary/50 flex flex-col gap-3 cursor-pointer transition-colors"
                                            onClick={() => setSelectedPlayer(player)}
                                        >
                                            <div className="flex items-center gap-3 border-b border-[var(--border-flat)] pb-2">
                                                <div className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded">#{player.rank}</div>
                                                <Avatar id={player.id} name={player.name} size="sm" className="border border-[var(--border-flat)]" />
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white text-sm">{player.name}</span>
                                                        <span className="text-[10px] text-slate-500">[{player.alliance || '---'}] {player.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 px-1">
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-slate-500 mb-0.5">{t('dashboard.power')}</span>
                                                    <span className="font-mono font-medium text-blue-400">{formatNumber(player.power)}</span>
                                                </div>
                                                <div className="flex flex-col text-xs border-l border-[var(--border-flat)] pl-2">
                                                    <span className="text-slate-500 mb-0.5">Kill Points</span>
                                                    <span className="font-mono font-medium text-red-400">{formatNumber(player.kp)}</span>
                                                </div>
                                                <div className="flex flex-col text-xs border-l border-[var(--border-flat)] pl-2">
                                                    <span className="text-slate-500 mb-0.5">{t('dashboard.total_dead')}</span>
                                                    <span className="font-mono font-medium text-slate-400">{formatNumber(player.deads)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block w-full min-w-[600px]">
                                    <Table>
                                        <TableHeader className="bg-[var(--surface)] sticky top-0 backdrop-blur-md z-10">
                                            <TableRow>
                                                {renderSortHeader(t('dashboard.rank'), 'rank', 'center')}
                                                {renderSortHeader(t('dashboard.name'), 'name', 'left')}
                                                {renderSortHeader(t('dashboard.power'), 'power')}
                                                {renderSortHeader('Kill Points', 'kp')}
                                                {renderSortHeader(t('dashboard.total_dead'), 'deads')}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayedPlayers.map((player) => (
                                                <TableRow
                                                    key={player.id}
                                                    className="group cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => setSelectedPlayer(player)}
                                                >
                                                    <TableCell className="text-center font-medium text-slate-500 group-hover:text-slate-300">#{player.rank}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0">
                                                                <Avatar
                                                                    id={player.id}
                                                                    name={player.name}
                                                                    size="sm"
                                                                    className="border border-[var(--border-flat)]"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-200 group-hover:text-primary transition-colors">{player.name}</span>
                                                                <span className="text-xs text-slate-500">[{player.alliance || '---'}] {player.id}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-blue-400">{formatNumber(player.power)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-400">{formatNumber(player.kp)}</TableCell>
                                                    <TableCell className="text-right font-mono text-slate-400">{formatNumber(player.deads)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Bank & History */}
                <div className="space-y-6">
                    {/* Bank Status */}
                    <Card className="overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Coins size={100} />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Coins className="text-amber-500" size={20} />
                                {t('bank.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {bank ? (
                                    <>
                                        {['Food', 'Wood', 'Stone', 'Gold'].map((res) => (
                                            <div key={res} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="text-slate-400 font-medium">{res}</span>
                                                <span className="text-amber-400 font-mono font-bold">
                                                    {formatNumber(bank.total ? bank.total[res.toLowerCase()] : bank[res.toLowerCase()])}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="pt-4 mt-4 border-t border-white/10 text-xs text-center text-slate-500">
                                            {t('datarefresh.last_sync')}: {new Date(bank.updatedAt || Date.now()).toLocaleDateString()}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                                        <AlertCircle size={32} />
                                        <span>{t('common.error')}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Power History with KP */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="text-blue-500" size={20} />
                                {t('dashboard.power')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={history.slice(-15)}>
                                        <defs>
                                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            yAxisId="power"
                                            orientation="left"
                                            tick={{ fontSize: 10, fill: '#3b82f6' }}
                                            tickFormatter={(val) => formatNumber(val)}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />
                                        <YAxis
                                            yAxisId="kp"
                                            orientation="right"
                                            tick={{ fontSize: 10, fill: '#ef4444' }}
                                            tickFormatter={(val) => formatNumber(val)}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#ffffff', opacity: 0.05 }}
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                                        />
                                        <Area
                                            yAxisId="power"
                                            type="monotone"
                                            dataKey="power"
                                            stroke="#3b82f6"
                                            fill="url(#colorPower)"
                                            strokeWidth={2}
                                            name="Total Power"
                                        />
                                        <Line
                                            yAxisId="kp"
                                            type="monotone"
                                            dataKey="kp"
                                            stroke="#ef4444"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4, strokeWidth: 0 }}
                                            name="Kill Points"
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    {t('common.loading')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
