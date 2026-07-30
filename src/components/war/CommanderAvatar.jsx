import React, { useState } from 'react';

/**
 * CommanderAvatar — vignette de commandant avec dégradation propre.
 *
 * L'image d'un commandant est OPTIONNELLE (voir docs : le commandant n'a d'utilité
 * que par son type de marche ; les vignettes sont un coût de maintenance sans valeur
 * analytique). Quand aucune image n'est fournie — ou qu'une URL est cassée — on
 * retombe sur les initiales du nom. Ainsi, ajouter un commandant qui vient de sortir
 * dans le jeu = une ligne `{ name, id }` dans commanders.js, sans sourcer d'image.
 */
const initials = (name = '') =>
    name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const CommanderAvatar = ({ image, name, size = 32, className = '' }) => {
    const [broken, setBroken] = useState(false);

    if (image && !broken) {
        return (
            <img
                src={image}
                alt={name || ''}
                loading="lazy"
                onError={() => setBroken(true)}
                className={`object-cover ${className}`}
            />
        );
    }

    return (
        <div
            className={`flex items-center justify-center bg-slate-700 text-slate-300 font-semibold select-none ${className}`}
            title={name || ''}
            aria-label={name || 'commander'}
        >
            <span style={{ fontSize: Math.round(size * 0.4) }}>{initials(name) || '?'}</span>
        </div>
    );
};

export default CommanderAvatar;
