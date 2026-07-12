import React from 'react';

/**
 * Standard page header (designer rule: unified components).
 * One pattern everywhere: h1 with a duotone Phosphor domain icon at the
 * start (amber, 24px), amber v2-title gradient, optional subtitle line
 * (text + badges via children). Icons follow the v2 domain mapping.
 */
const PageHeader = ({ icon: Icon, title, subtitle, children }) => (
    <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
            {Icon && <Icon size={24} weight="duotone" className="text-amber-500 shrink-0" aria-hidden="true" />}
            <span className="v2-title">{title}</span>
        </h1>
        {(subtitle || children) && (
            <div className="text-sm text-[var(--text-secondary)] mt-1 flex flex-wrap items-center gap-2">
                {subtitle}
                {children}
            </div>
        )}
    </div>
);

export default PageHeader;
