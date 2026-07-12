import React from 'react';
import { cn } from '../../lib/utils';

// v2 metrics (Claude Design v2/components/table.html): rows 40px, body text
// 13px, uppercase 11px headers in text-meta, token-driven borders & hover.
const Table = React.forwardRef(({ className, ...props }, ref) => (
    <div className="relative w-full">
        <table
            ref={ref}
            className={cn("min-w-full caption-bottom text-[13px]", className)}
            {...props}
        />
    </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-[var(--border-flat)]", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cn(
            "border-b border-[var(--border-flat)] transition-colors hover:bg-[var(--border-flat)] data-[state=selected]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
            className
        )}
        {...props}
    />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={`h-10 px-3 text-left align-middle font-semibold text-[11px] uppercase tracking-[.06em] text-[var(--text-meta)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 ${className}`}
        {...props}
    />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={`h-10 px-3 py-0 align-middle tabular-nums [&:has([role=checkbox])]:pr-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${className}`}
        {...props}
    />
))
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
