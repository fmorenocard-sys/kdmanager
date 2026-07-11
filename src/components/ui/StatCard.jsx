import React from 'react';
import Card from './Card';
import { cn } from '../../lib/utils';

const StatCard = ({ title, value, icon: Icon, color = "blue", subtext, className, iconPosition = "right" }) => {
    // Map color names to Tailwind classes
    const colorMap = {
        blue: { border: "border-l-blue-500", iconBg: "bg-blue-500/20", iconText: "text-blue-500", ring: "ring-blue-500/20" },
        red: { border: "border-l-red-500", iconBg: "bg-red-500/20", iconText: "text-red-500", ring: "ring-red-500/20" },
        amber: { border: "border-l-amber-500", iconBg: "bg-amber-500/20", iconText: "text-amber-500", ring: "ring-amber-500/20" },
        emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-500/20", iconText: "text-emerald-500", ring: "ring-emerald-500/20" },
        yellow: { border: "border-l-yellow-500", iconBg: "bg-yellow-500/20", iconText: "text-yellow-500", ring: "ring-yellow-500/20" },
        purple: { border: "border-l-purple-500", iconBg: "bg-purple-500/20", iconText: "text-purple-500", ring: "ring-purple-500/20" },
        orange: { border: "border-l-orange-500", iconBg: "bg-orange-500/20", iconText: "text-orange-500", ring: "ring-orange-500/20" },
        stone: { border: "border-l-stone-500", iconBg: "bg-stone-500/20", iconText: "text-stone-500", ring: "ring-stone-500/20" },
        slate: { border: "border-l-slate-500", iconBg: "bg-slate-500/20", iconText: "text-slate-500", ring: "ring-slate-500/20" },
    };

    const styles = colorMap[color] || colorMap.blue;

    return (
        <Card className={cn(
            "border-l-[3px] transition-all min-w-0",
            styles.border,
            className
        )}>
            <div className={cn(
                "flex items-center gap-2 md:gap-4 min-w-0",
                iconPosition === "right" ? "justify-between" : "justify-start"
            )}>
                {iconPosition === "left" && (
                    <div className={cn("w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0", styles.iconBg, styles.iconText, styles.ring)}>
                        <Icon size={18} className="md:hidden" />
                        <Icon size={24} className="hidden md:block" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider truncate">{title}</p>
                    <div className="text-lg md:text-2xl font-bold text-white mt-0.5 truncate">{value}</div>
                    {subtext && <p className="text-xs text-slate-500 mt-1 truncate">{subtext}</p>}
                </div>

                {iconPosition === "right" && (
                    <div className={cn("w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0", styles.iconBg, styles.iconText, styles.ring)}>
                        <Icon size={18} className="md:hidden" />
                        <Icon size={24} className="hidden md:block" />
                    </div>
                )}
            </div>
        </Card>
    );
};

export default StatCard;
