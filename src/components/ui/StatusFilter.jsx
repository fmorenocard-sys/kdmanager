import React from 'react';
import { cn } from '../../lib/utils';

// selected: string[] — empty array = "All"
// onSelect: (value: string) => void — parent toggles the value
const StatusFilter = ({ options = [], selected = [], onSelect, className }) => {
    const isAll = selected.length === 0;

    return (
        <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label="Filter by Status">
            {/* All button */}
            <button
                type="button"
                aria-pressed={isAll}
                onClick={() => onSelect('all')}
                className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all border select-none",
                    isAll
                        ? "bg-white/10 text-white border-white/20 ring-1 ring-white/20"
                        : "bg-[var(--border-flat)] text-slate-400 border-[var(--border-flat)] hover:brightness-110  hover:text-slate-200"
                )}
            >
                All
            </button>

            {options.map((option) => {
                const isActive = selected.includes(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onSelect(option.value)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all border select-none flex items-center gap-2",
                            isActive
                                ? cn(option.colorClass, "ring-1 ring-current/20 shadow-lg shadow-current/10")
                                : "bg-[var(--border-flat)] text-slate-400 border-[var(--border-flat)] hover:brightness-110  hover:text-slate-200"
                        )}
                    >
                        <span>{option.label}</span>
                        {option.count !== undefined && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] bg-black/20",
                                isActive ? "text-current" : "text-slate-500"
                            )}>
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default StatusFilter;
