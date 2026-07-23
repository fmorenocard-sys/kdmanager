import React from 'react';
import { TableHead } from './Table';
import { ChevronDown, ChevronUp } from './icons';

/**
 * En-tête de colonne triable (F-019 / F-020).
 *
 * UXA11Y-004 : l'icône de tri reste visible sans survol (opacité réduite hors
 * colonne active) — au doigt, rien n'indiquait qu'une colonne était triable.
 * Le bouton porte aria-sort sur la cellule, pour que l'état soit annoncé.
 */
const SortHead = ({ label, sortKey, sort, onSort, align = 'start', className = '' }) => {
    const active = sort.key === sortKey;
    const alignClass = align === 'end' ? 'text-right' : align === 'center' ? 'text-center' : '';

    return (
        <TableHead
            className={`text-xs ${alignClass} ${className}`}
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-white' : ''}`}
            >
                {label}
                {active
                    ? (sort.dir === 'desc' ? <ChevronDown size={12} weight="fill" /> : <ChevronUp size={12} weight="fill" />)
                    : <ChevronDown size={12} className="opacity-40" />}
            </button>
        </TableHead>
    );
};

export default SortHead;
