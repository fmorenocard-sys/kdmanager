import React from 'react';
import { cn } from '../../lib/utils';

// v2 (Claude Design v2/components/inputs.html): 44px min touch target,
// 10px radius, token-driven surface/border, amber focus ring, error state.
const Input = React.forwardRef(({ className, label, leftIcon, error, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-meta)] pointer-events-none">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    aria-invalid={error ? true : undefined}
                    className={cn(
                        "w-full min-h-[44px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-meta)]",
                        "focus:outline-none focus:border-transparent focus:ring-2 focus:ring-amber-500",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-transparent ring-2 ring-red-500",
                        leftIcon ? "ps-10 pe-4" : "px-3.5",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && typeof error === 'string' && (
                <p className="text-xs text-red-400 mt-1.5" role="alert">{error}</p>
            )}
        </div>
    );
});

Input.displayName = "Input";

export default Input;
