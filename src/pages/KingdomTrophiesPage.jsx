import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Trophy, ChevronLeft, ChevronRight, Crown, Award, Medal, Upload } from 'lucide-react';
import Card from '../components/ui/Card';
import DataRefreshControl from '../components/DataRefreshControl';

const KingdomTrophiesPage = () => {
    const { trophies, loading, error } = useData();
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

    const currentWeekData = useMemo(() => {
        if (!trophies || trophies.length === 0) return null;
        return trophies[selectedWeekIndex];
    }, [trophies, selectedWeekIndex]);



    if (loading) return <div className="p-8 text-center text-muted">Loading Trophies...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!currentWeekData) return (
        <div className="p-8 text-center">
            <h2 className="text-xl text-muted mb-4">No trophy data found.</h2>
            <DataRefreshControl
                pageId="trophies"
                title="Upload Trophies"
                expectedFilePattern="List"
            />
        </div>
    );

    // Helper to normalize keys and get ordered groups
    const processedGroups = useMemo(() => {
        if (!currentWeekData?.groups) return [];

        const groups = currentWeekData.groups;
        // Normalize keys to find the specific tiers regardless of small typos
        const findKey = (pattern) => Object.keys(groups).find(k => k.toLowerCase().includes(pattern));

        const legendaryKey = findKey('legandary') || findKey('legendary'); // Handle source typo
        const epicKey = findKey('epic');
        const eliteKey = findKey('elite');
        const advancedKey = findKey('advanced');

        // Define order
        const order = [
            { key: legendaryKey, type: 'Legendary', style: 'gold', startRank: 1 },
            { key: epicKey, type: 'Epic', style: 'purple', startRank: 2 },
            { key: eliteKey, type: 'Elite', style: 'blue', startRank: 4 },
            { key: advancedKey, type: 'Advanced', style: 'green', startRank: 9 }
        ];

        // Map data
        let currentRank = 1;
        return order.map(tier => {
            if (!tier.key || !groups[tier.key]) return null;
            const items = groups[tier.key];
            const start = currentRank;
            currentRank += items.length;

            return {
                ...tier,
                title: tier.key, // Keep original title from JSON
                items: items,
                rankStart: start
            };
        }).filter(Boolean);
    }, [currentWeekData]);

    const legendaryGroup = processedGroups.find(g => g.type === 'Legendary');
    const otherGroups = processedGroups.filter(g => g.type !== 'Legendary');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={36} />
                        Kingdom Trophies
                    </h1>
                    <p className="text-gray-400 mt-1">Assignments & Awards for Kingdom 2997</p>
                </div>

                <div className="flex items-center gap-4">
                    <DataRefreshControl
                        pageId="trophies"
                        title="Update"
                        expectedFilePattern="List"
                        variant="secondary"
                    />
                </div>
            </div>

            {/* Week Selector */}
            <Card className="p-4 flex justify-between items-center bg-white/5 backdrop-blur-sm border-white/10">
                <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                    disabled={selectedWeekIndex <= 0}
                    onClick={() => setSelectedWeekIndex(i => i - 1)}
                >
                    <ChevronLeft size={24} />
                </button>

                <h2 className="text-xl font-bold text-center min-w-[200px] text-white">
                    {currentWeekData.title}
                </h2>

                <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                    disabled={selectedWeekIndex >= trophies.length - 1}
                    onClick={() => setSelectedWeekIndex(i => i + 1)}
                >
                    <ChevronRight size={24} />
                </button>
            </Card>

            {/* Legendary Section (Rank 1) */}
            {legendaryGroup && legendaryGroup.items.length > 0 && (
                <div className="mb-8 relative group perspective">
                    {/* Glossy Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-amber-900/40 blur-xl rounded-full transform scale-90 group-hover:scale-100 transition-all duration-700"></div>

                    <Card
                        className="relative overflow-hidden border border-yellow-500/50 bg-gradient-to-b from-yellow-900/20 to-black/80 shadow-[0_0_50px_rgba(234,179,8,0.15)]"
                        hoverEffect={true}
                    >
                        {/* Background Icon */}
                        <div className="absolute -top-10 -right-10 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110">
                            <Trophy size={300} className="text-yellow-400" />
                        </div>

                        <div className="relative z-10 p-12 flex flex-col items-center text-center">

                            {/* Gold Trophy Icon - "Valorized" */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-yellow-500 blur-[60px] opacity-40 animate-pulse-slow"></div>
                                <Trophy size={80} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] relative z-10" />
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                                    <Crown size={24} className="text-yellow-200" />
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-yellow-500/80 uppercase tracking-[0.3em] mb-4">
                                Legendary Winner
                            </h2>

                            {legendaryGroup.items.map((w, idx) => (
                                <div key={idx} className="space-y-4">
                                    <div className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl">
                                        {w.name}
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-sm">
                                        <Trophy size={14} />
                                        <span>RANK #1</span>
                                    </div>
                                    <p className="text-yellow-200/60 font-medium text-lg mt-4 max-w-lg mx-auto">
                                        {w.score || 'Outstanding Contribution'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Other Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherGroups.map((group) => {
                    const styleMap = {
                        'Epic': { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: <Award size={24} /> },
                        'Elite': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Medal size={24} /> },
                        'Advanced': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <Medal size={24} /> }
                    };
                    const style = styleMap[group.type] || styleMap['Advanced'];

                    return (
                        <Card
                            key={group.type}
                            className={`h-full border border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden hover:border-white/10 transition-colors`}
                        >
                            {/* Card Header */}
                            <div className={`p-4 border-b border-white/5 flex items-center justify-between ${style.bg}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-black/40 ${style.color}`}>
                                        {style.icon}
                                    </div>
                                    <h3 className={`font-bold text-lg tracking-wide ${style.color}`}>
                                        {group.type}
                                    </h3>
                                </div>
                            </div>

                            {/* List with Continuous Ranking */}
                            <div className="divide-y divide-white/5">
                                {group.items.map((w, idx) => (
                                    <div key={idx} className="flex items-center p-3 hover:bg-white/5 transition-colors group">
                                        {/* Rank Badge */}
                                        <div className="w-12 flex justify-center">
                                            <div className={`
                                                w-8 h-8 flex items-center justify-center rounded-full 
                                                font-mono font-bold text-xs 
                                                bg-black/40 ${style.border} ${style.color}
                                            `}>
                                                {group.rankStart + idx}
                                            </div>
                                        </div>

                                        <div className="flex-1 font-medium text-gray-300 group-hover:text-white transition-colors pl-3">
                                            {w.name}
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 px-2">
                                                {w.score?.split(' ')[0] || ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default KingdomTrophiesPage;
