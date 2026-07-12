import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { Trophy, ChevronLeft, ChevronRight, Crown, Award, Medal, Upload } from '../components/ui/icons';
import Card from '../components/ui/Card';
import DataRefreshControl from '../components/DataRefreshControl';
import Avatar from '../components/ui/Avatar';

const KingdomTrophiesPage = () => {
    const { trophies, loading, error, players } = useData();
    const { t } = useTranslation();
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

    const currentWeekData = useMemo(() => {
        if (!trophies || trophies.length === 0) return null;
        return trophies[selectedWeekIndex];
    }, [trophies, selectedWeekIndex]);

    // Create a lookup map for Name -> ID
    const nameToIdMap = useMemo(() => {
        if (!players) return {};
        return players.reduce((acc, p) => {
            acc[p.name.toLowerCase()] = p.id;
            return acc;
        }, {});
    }, [players]);

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

            // Map items to include ID found from players list
            const items = groups[tier.key].map(item => ({
                ...item,
                id: nameToIdMap[item.name?.toLowerCase()] || null
            }));

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

    if (loading) return <div className="p-8 text-center text-muted">{t('common.loading')}</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!currentWeekData) return (
        <div className="p-8 text-center">
            <h2 className="text-xl text-muted mb-4">{t('common.no_data')}</h2>
            <DataRefreshControl
                pageId="trophies"
                title="Upload Trophies"
                expectedFilePattern="List"
            />
        </div>
    );

    const legendaryGroup = processedGroups.find(g => g.type === 'Legendary');
    const otherGroups = processedGroups.filter(g => g.type !== 'Legendary');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold v2-title flex items-center gap-2 md:gap-3">
                    <Trophy className="text-yellow-500" size={24} />
                    {t('trophies.title')}
                </h1>
                <p className="text-gray-400 mt-1">{t('trophies.subtitle')}</p>
            </div>
            <DataRefreshControl
                pageId="trophies"
                title="Update"
                expectedFilePattern="List"
                variant="secondary"
            />

            {/* Week Selector */}
            <Card className="p-3 flex justify-between items-center bg-white/5 backdrop-blur-sm border-white/10 mb-6">
                <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                    disabled={selectedWeekIndex <= 0}
                    onClick={() => setSelectedWeekIndex(i => i - 1)}
                >
                    <ChevronLeft size={20} />
                </button>

                <h2 className="text-lg font-bold text-center min-w-[200px] text-white">
                    {currentWeekData.title}
                </h2>

                <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                    disabled={selectedWeekIndex >= trophies.length - 1}
                    onClick={() => setSelectedWeekIndex(i => i + 1)}
                >
                    <ChevronRight size={20} />
                </button>
            </Card>

            {/* Legendary Section (Rank 1) - Compacted */}
            {legendaryGroup && legendaryGroup.items.length > 0 && (
                <div className="mb-6 relative group perspective">
                    {/* Subtle Glow */}
                    <div className="absolute inset-0 bg-yellow-600/10 blur-xl rounded-full transform scale-95 opacity-50"></div>

                    <Card
                        className="relative overflow-hidden border border-yellow-500/30 bg-gradient-to-r from-yellow-900/10 to-transparent shadow-lg"
                        hoverEffect={true}
                    >
                        <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center">

                            {/* Title Label */}
                            <div className="flex items-center gap-2 mb-4">
                                <Crown size={20} className="text-yellow-400" />
                                <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest">
                                    {t('trophies.legendary_winner')}
                                </h2>
                                <Crown size={20} className="text-yellow-400" />
                            </div>

                            {legendaryGroup.items.map((w, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Avatar with Glow Ring */}
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full bg-yellow-500 blur-md opacity-40"></div>
                                        <div className="relative p-1 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full">
                                            <Avatar
                                                name={w.name}
                                                // Assuming we can match ID later, for now relying on name fallback or if we had ID in trophies
                                                id={w.id}
                                                size="2xl"
                                                className="border-4 border-slate-900"
                                            />
                                            {/* Rank Badge */}
                                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-900 font-bold w-8 h-8 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg">
                                                #1
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name & Score */}
                                    <div className="text-center md:text-left">
                                        <div className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                                            {w.name}
                                        </div>
                                        <p className="text-yellow-200/60 font-medium text-lg mt-1">
                                            {w.score || 'Outstanding Contribution'}
                                        </p>
                                    </div>
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
                        'Epic': { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', ring: 'border-purple-500/50', icon: <Award size={20} /> },
                        'Elite': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', ring: 'border-blue-500/50', icon: <Medal size={20} /> },
                        'Advanced': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'border-emerald-500/50', icon: <Medal size={20} /> }
                    };
                    const style = styleMap[group.type] || styleMap['Advanced'];

                    return (
                        <Card
                            key={group.type}
                            className={`h-full border border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden hover:border-white/10 transition-colors`}
                        >
                            {/* Card Header */}
                            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${style.bg}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg bg-black/40 ${style.color}`}>
                                        {style.icon}
                                    </div>
                                    <h3 className={`font-bold text-base tracking-wide ${style.color}`}>
                                        {group.type}
                                    </h3>
                                </div>
                            </div>

                            {/* List with Continuous Ranking */}
                            <div className="divide-y divide-white/5">
                                {group.items.map((winner, idx) => (
                                    <div key={idx} className="flex items-center p-3 hover:bg-white/5 transition-colors group">
                                        {/* Rank Badge */}
                                        <div className="w-8 flex justify-center mr-3">
                                            <div className={`
                                                w-6 h-6 flex items-center justify-center rounded-full 
                                                font-mono font-bold text-[10px] 
                                                bg-black/40 ${style.border} ${style.color}
                                            `}>
                                                {group.rankStart + idx}
                                            </div>
                                        </div>

                                        {/* Avatar Mini */}
                                        <Avatar
                                            name={winner.name}
                                            id={winner.id}
                                            size="md"
                                            className={`border-2 border-[var(--border-flat)] ${group.type === 'Epic' ? 'ring-2 ring-purple-500/20' : ''
                                                }`}
                                        />
                                        <div className="flex-1 font-medium text-sm text-gray-300 group-hover:text-white transition-colors">
                                            {winner.name}
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 opacity-60 group-hover:opacity-100">
                                                {winner.score?.split(' ')[0] || ''}
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

