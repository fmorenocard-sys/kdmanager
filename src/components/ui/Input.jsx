import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, label, leftIcon, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-400 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
                        leftIcon ? "pl-10 pr-4" : "px-4",
                        className
                    )}
                    {...props}
                />
            </div>
        </div>
    );
});

Input.displayName = "Input";

export default Input;
