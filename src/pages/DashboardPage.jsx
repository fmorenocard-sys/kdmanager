import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import DataRefreshControl from '../components/DataRefreshControl';
import PlayerDetailPanel from '../components/PlayerDetailPanel';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ComposedChart, Area, Line } from 'recharts';
import { TrendingUp, Users, Skull, Sword, Coins, Search, Filter, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatCard from '../components/ui/StatCard';
import avatarMapping from '../data/player-avatars.json';

const DashboardPage = () => {
    const { players, history, bank } = useData();
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
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
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

    return (
        <div className="space-y-8">
            <PlayerDetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Kingdom Overview</h2>
                    <p className="text-slate-400 mt-1">Real-time statistics for Kingdom 2997</p>
                </div>
            </div>

            <DataRefreshControl />

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Power"
                    value={formatNumber(stats.power)}
                    icon={TrendingUp}
                    color="blue"
                />
                <StatCard
                    title="Kill Points"
                    value={formatNumber(stats.kp)}
                    icon={Sword}
                    color="red"
                />
                <StatCard
                    title="Dead Troops"
                    value={formatNumber(stats.deads)}
                    icon={Skull}
                    color="slate"
                />
                <StatCard
                    title="Active Governors"
                    value={players.length}
                    icon={Users}
                    color="amber"
                    subtext="Top 300 Tracked"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Leaderboard Table section */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Filters */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                                <Input
                                    placeholder="Search governor by name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    leftIcon={<Search size={18} />}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Filter size={18} className="text-slate-400" />
                                <select
                                    className="bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={selectedAlliance}
                                    onChange={(e) => setSelectedAlliance(e.target.value)}
                                >
                                    {alliances.map(a => (
                                        <option key={a} value={a} className="bg-slate-900">{a === "All" ? "All Alliances" : a}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card className="flex flex-col h-[600px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Governor Leaderboard</CardTitle>
                            <div className="text-sm text-slate-400">
                                {sortedPlayers.length} Governors found
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <div className="h-full overflow-auto custom-scrollbar">
                                <Table>
                                    <TableHeader className="bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10">
                                        <TableRow>
                                            <TableHead className="w-[60px] text-center text-xs">Rank</TableHead>
                                            <TableHead className="text-xs">Governor</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:text-white transition-colors text-xs" onClick={() => handleSort('power')}>Power</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:text-white transition-colors text-xs" onClick={() => handleSort('kp')}>Kill Points</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:text-white transition-colors text-xs" onClick={() => handleSort('deads')}>Deads</TableHead>
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
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                                                            {avatarMapping[player.id] ? (
                                                                <img
                                                                    src={avatarMapping[player.id]}
                                                                    alt={player.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                                                    {player.name.charAt(0)}
                                                                </div>
                                                            )}
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
                                Treasury Status
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
                                            Last Updated: {new Date(bank.updatedAt || Date.now()).toLocaleDateString()}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                                        <AlertCircle size={32} />
                                        <span>No Treasury Data Available</span>
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
                                Kingdom Evolution
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
                                    No History Data
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
