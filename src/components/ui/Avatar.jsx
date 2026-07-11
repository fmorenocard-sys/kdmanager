import React, { useState, useMemo, useContext } from 'react';
import avatarMapping from '../../data/player-avatars.json';
import { DataContext } from '../../context/DataContext';

const Avatar = ({
    src,
    id,
    name,
    size = 'md',
    className = '',
    showRing = false,
    ringColor = 'border-slate-700'
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

    // Default fallback UI (Logo)
    const renderFallback = () => {
        return (
            <div className={`
                ${sizeClasses[size]}
                bg-slate-800
                flex items-center justify-center
                rounded-full select-none overflow-hidden
                ${showRing ? `border-2 ${ringColor}` : ''}
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

    return (
        <img
            src={finalSrc}
            alt={name || 'Avatar'}
            loading="lazy"
            className={`
                ${sizeClasses[size]}
                rounded-full object-cover
                ${showRing ? `border-2 ${ringColor}` : ''}
                ${className}
            `}
            onError={() => setCandidateIndex(i => i + 1)}
        />
    );
};

export default Avatar;
