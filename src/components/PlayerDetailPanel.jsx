import React, { useEffect } from 'react';
import {
    X, Activity, Shield, Trophy, MapPin,
    Swords, Skull, Users, Hammer, ScrollText,
    TrendingUp, Target, Sword
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const PlayerDetailPanel = ({ player, onClose }) => {
    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!player) return null;

    const format = (num) => new Intl.NumberFormat('en-US').format(num);

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300" onClick={onClose}>
            <div
                className="w-full max-w-md h-full bg-slate-900/95 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-white/10 p-6 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
                            {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/10 text-slate-300 border border-white/10">
                                    {player.alliance || 'No Alliance'}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">ID: {player.id}</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-2 text-blue-400 mb-2">
                                <TrendingUp size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider">Power</span>
                            </div>
                            <div className="text-xl font-bold text-white">{format(player.power)}</div>
                            {player.powerDiff !== 0 && (
                                <div className={`text-xs mt-1 ${player.powerDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {player.powerDiff > 0 ? '+' : ''}{format(player.powerDiff)}
                                </div>
                            )}
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <Swords size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider">Kill Points</span>
                            </div>
                            <div className="text-xl font-bold text-white">{format(player.kp)}</div>
                        </div>
                    </div>

                    {/* Combat Stats */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Skull size={16} /> Combat Details
                        </h3>
                        <div className="space-y-3">
                            <StatRow label="Dead Troops" value={player.deads} icon={<Skull size={14} />} color="text-slate-400" />
                            <StatRow label="T4 Kills" value={player.t4Kills} icon={<Target size={14} />} color="text-purple-400" />
                            <StatRow label="T5 Kills" value={player.t5Kills} icon={<Target size={14} />} color="text-amber-400" />
                            <StatRow label="T1 Kills" value={player.t1Kills} icon={<Target size={14} />} color="text-slate-500" />
                            <StatRow label="Ranged" value={player.ranged} icon={<Target size={14} />} color="text-blue-400" />
                        </div>
                    </div>

                    {/* Economy & Growth */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Hammer size={16} /> Economy & Growth
                        </h3>
                        <div className="space-y-3">
                            <StatRow label="RSS Assistance" value={player.rssAssistance} />
                            <StatRow label="RSS Gathered" value={player.rssGathered} />
                            <StatRow label="Helps" value={player.helps} />
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-slate-400 text-sm">City Hall Level</span>
                                <span className="text-white font-mono font-bold">{player.cityHall}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    {(player.notes || player.location) && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ScrollText size={16} /> Notes
                            </h3>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                {player.location && (
                                    <div className="flex items-start gap-2 text-amber-200/80">
                                        <MapPin size={16} className="mt-0.5 shrink-0" />
                                        <span className="text-sm">{player.location}</span>
                                    </div>
                                )}
                                {player.notes && (
                                    <div className="text-sm text-slate-300 italic">
                                        "{player.notes}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const StatRow = ({ label, value, icon, color = "text-slate-400" }) => (
    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
        <div className={`flex items-center gap-2 ${color} text-sm`}>
            {icon}
            <span>{label}</span>
        </div>
        <span className="text-slate-200 font-mono font-medium">{new Intl.NumberFormat('en-US').format(value)}</span>
    </div>
);

export default PlayerDetailPanel;
