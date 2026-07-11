import React from 'react';
import { cn } from '../../lib/utils';

const Table = React.forwardRef(({ className, ...props }, ref) => (
    <div className="relative w-full">
        <table
            ref={ref}
            className={cn("min-w-full caption-bottom text-sm", className)}
            {...props}
        />
    </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b border-white/10", className)} {...props} />
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
            "border-b border-white/5 transition-colors hover:bg-white/5 data-[state=selected]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
            className
        )}
        {...props}
    />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={`h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0 ${className}`}
        {...props}
    />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={`p-2 align-middle [&:has([role=checkbox])]:pr-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${className}`}
        {...props}
    />
))
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
