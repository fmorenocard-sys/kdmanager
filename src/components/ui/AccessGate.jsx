import React from 'react';

/**
 * AccessGate — carte système v2 pour les écrans à accès restreint
 * (authentification requise, pages leadership BR-009).
 * Charte v2 : .v2-glass + tokens, bulle d'icône danger (64px).
 * Remplace les variantes ad hoc de AvailabilityForm / DeadweightPage / WarDashboard.
 */
const AccessGate = ({ icon: Icon, title, description, hint }) => (
    <div className="w-full flex items-center justify-center p-4 py-12">
        <div className="v2-glass p-8 text-center max-w-lg w-full">
            {Icon && (
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border"
                    style={{
                        color: 'var(--action-danger)',
                        background: 'color-mix(in srgb, var(--action-danger) 14%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--action-danger) 40%, transparent)'
                    }}
                >
                    <Icon size={32} weight="duotone" />
                </div>
            )}
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{title}</h2>
            <p className={`text-[var(--text-secondary)]${hint ? ' mb-6' : ''}`}>{description}</p>
            {hint && <p className="text-sm text-[var(--text-meta)]">{hint}</p>}
        </div>
    </div>
);

export default AccessGate;
