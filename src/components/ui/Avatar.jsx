import React, { useState, useMemo, useContext } from 'react';
import avatarMapping from '../../data/player-avatars.json';
import { DataContext } from '../../context/DataContext';

const Avatar = ({
    src,
    id,
    name,
    size = 'md',
    className = '',
    showRing = false
}) => {
    // Cascade (see Etude_Avatars_Joueurs.md): explicit src prop > fresh URL
    // from static_data/avatars (Lilith CDN / Discord, synced daily) >
    // bundled legacy JPG > logo. A broken candidate falls through to the next.
    const ctx = useContext(DataContext); // null outside DataProvider
    const remoteUrl = id ? ctx?.avatars?.[String(id)]?.url : null;

    const candidates = useMemo(() => {
        const list = [];
        if (src) list.push(src);
        if (remoteUrl) list.push(remoteUrl);
        if (id && avatarMapping[id]) {
            const path = avatarMapping[id];
            list.push(`${import.meta.env.BASE_URL}${path.startsWith('/') ? path.slice(1) : path}`);
        }
        return list;
    }, [src, remoteUrl, id]);

    // Reset the cascade when the candidate list changes (adjust-state-during-render pattern)
    const candidatesKey = candidates.join('|');
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [lastKey, setLastKey] = useState(candidatesKey);
    if (candidatesKey !== lastKey) {
        setLastKey(candidatesKey);
        setCandidateIndex(0);
    }

    const finalSrc = candidates[candidateIndex];

    // Determine size classes
    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
        '2xl': 'w-24 h-24 text-2xl',
        '3xl': 'w-32 h-32 text-4xl'
    };

    // v2: flat ring becomes an indigo gradient ring (Claude Design
    // v2/components/avatars-statcards.html). ringColor kept for API compat.
    const withRing = (node) => {
        if (!showRing) return node;
        return (
            <span
                className="inline-flex rounded-full p-[2px] shrink-0"
                style={{ background: 'var(--border-gradient-indigo)' }}
            >
                {node}
            </span>
        );
    };

    // Default fallback UI (Logo)
    const renderFallback = () => {
        return withRing(
            <div className={`
                ${sizeClasses[size]}
                bg-[var(--surface-solid)]
                flex items-center justify-center
                rounded-full select-none overflow-hidden
                ${className}
            `}>
                <img
                    src="/logo.png"
                    alt="Default Avatar"
                    className="w-full h-full object-cover opacity-80"
                />
            </div>
        );
    };

    if (!finalSrc) {
        return renderFallback();
    }

    return withRing(
        <img
            src={finalSrc}
            alt={name || 'Avatar'}
            loading="lazy"
            className={`
                ${sizeClasses[size]}
                rounded-full object-cover
                ${className}
            `}
            onError={() => setCandidateIndex(i => i + 1)}
        />
    );
};

export default Avatar;
