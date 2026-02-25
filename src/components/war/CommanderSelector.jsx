
import React, { useState, useMemo } from 'react';
import { COMMANDERS } from '../../data/commanders';
import { Search, X } from 'lucide-react';

const CommanderSelector = ({ selectedId, onSelect, excludeIds = [], label = "Select Commander" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedCommander = useMemo(() =>
        COMMANDERS.find(c => c.id === selectedId),
        [selectedId]);

    const filteredCommanders = useMemo(() => {
        return COMMANDERS.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) &&
            !excludeIds.includes(c.id) // Filter out excluded commanders
        ).sort((a, b) => {
            // Priority: Legendary > Epic > Elite > Advanced
            const rarityOrder = { 'Legendary': 1, 'Epic': 2, 'Elite': 3, 'Advanced': 4, 'Unobtainable': 5 };
            return (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
        });
    }, [search, excludeIds]);

    // Rarity colors
    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'Legendary': return 'border-amber-500/50 bg-amber-500/10 text-amber-200';
            case 'Epic': return 'border-purple-500/50 bg-purple-500/10 text-purple-200';
            case 'Elite': return 'border-blue-500/50 bg-blue-500/10 text-blue-200';
            case 'Advanced': return 'border-green-500/50 bg-green-500/10 text-green-200';
            default: return 'border-slate-500/50 bg-slate-500/10 text-slate-200';
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-3 w-full h-12 px-3 py-1.5 rounded-lg border transition-all ${selectedCommander
                    ? 'bg-slate-800 border-slate-600 hover:border-slate-500'
                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 border-dashed'
                    }`}
            >
                {selectedCommander ? (
                    <>
                        <img
                            src={selectedCommander.image}
                            alt={selectedCommander.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-500"
                        />
                        <span className="font-medium text-sm text-slate-200 truncate">{selectedCommander.name}</span>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs">?</div>
                        <span className="text-sm">{label}</span>
                    </div>
                )}
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-white">Select Commander</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search commander..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-4 py-2 border border-slate-700 focus:outline-none focus:border-primary transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                {filteredCommanders.map(cmd => (
                                    <button
                                        key={cmd.id}
                                        onClick={() => {
                                            onSelect(cmd.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`group flex flex-col items-center gap-2 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${getRarityColor(cmd.rarity)} ${selectedId === cmd.id ? 'ring-2 ring-white/50 bg-white/10' : ''
                                            }`}
                                    >
                                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-slate-900 shadow-lg group-hover:border-white/20 transition-colors">
                                            <img
                                                src={cmd.image}
                                                alt={cmd.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="text-[10px] text-center font-medium leading-tight line-clamp-2 w-full px-1">
                                            {cmd.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {filteredCommanders.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    No commanders found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommanderSelector;
