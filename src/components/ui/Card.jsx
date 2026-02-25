import React from 'react';
import { cn } from '../../lib/utils'; // We'll need to create this utility

const Card = ({ children, className, hoverEffect, ...props }) => {
    return (
        <div
            className={cn("bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-6 shadow-xl", className)}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className }) => (
    <div className={cn("mb-4", className)}>{children}</div>
);

export const CardTitle = ({ children, className }) => (
    <h3 className={cn("text-xl font-bold text-white", className)}>{children}</h3>
);

export const CardContent = ({ children, className }) => (
    <div className={cn("", className)}>{children}</div>
);

export default Card;
