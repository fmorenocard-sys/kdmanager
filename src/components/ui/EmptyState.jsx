import React from 'react';

/**
 * EmptyState — placeholder cohérent pour un bloc/page sans données (hygiène UX,
 * marque blanche : une instance neuve ne doit jamais paraître « cassée »).
 *
 * Distinct de l'« activation de modules » (docs/pm/Etude_Activation_Modules.md) :
 * ici le module EXISTE mais n'a pas encore de données à afficher.
 *
 * Props :
 *  - icon        : composant d'icône (ex. Database depuis ui/icons) — optionnel
 *  - title       : titre court (requis), déjà traduit par l'appelant
 *  - description : phrase d'explication (optionnelle), déjà traduite
 *  - action      : noeud React (bouton d'upload, CTA…) — optionnel
 *  - className    : classes additionnelles sur le conteneur
 */
const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
    <div
        className={`flex flex-col items-center justify-center text-center gap-3 px-6 py-12 ${className}`}
        role="status"
    >
        {Icon && (
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-500">
                <Icon size={26} weight="duotone" />
            </div>
        )}
        {title && <h3 className="text-base font-semibold text-slate-300">{title}</h3>}
        {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
    </div>
);

export default EmptyState;
