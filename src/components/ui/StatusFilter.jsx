import React from 'react';
import { cn } from '../../lib/utils';

const StatusFilter = ({ options = [], selected, onSelect, className }) => {
    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            <button
                onClick={() => onSelect('all')}
                className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all border select-none",
                    selected === 'all'
                        ? "bg-white/10 text-white border-white/20 ring-1 ring-white/20"
                        : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200"
                )}
            >
                All
            </button>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onSelect(option.value)}
                    className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all border select-none flex items-center gap-2",
                        selected === option.value
                            ? cn(option.colorClass, "ring-1 ring-current/20 shadow-lg shadow-current/10")
                            : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200"
                    )}
                >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] bg-black/20",
                            selected === option.value ? "text-current" : "text-slate-500"
                        )}>
                            {option.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default StatusFilter;
