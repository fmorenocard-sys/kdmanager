import React, { useState } from 'react';
import avatarMapping from '../../data/player-avatars.json';

const Avatar = ({
    src,
    id,
    name,
    size = 'md',
    className = '',
    showRing = false,
    ringColor = 'border-slate-700'
}) => {
    const [imgError, setImgError] = useState(false);

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

    // Determine final image source
    // Priority: 1. direct src prop, 2. mapped avatar from JSON, 3. fallback to initials
    let finalSrc = src;
    if (!finalSrc && id && avatarMapping[id]) {
        // Ensure path starts with / 
        const path = avatarMapping[id];
        finalSrc = `${import.meta.env.BASE_URL}${path.startsWith('/') ? path.slice(1) : path}`;
    }

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

    if (imgError || !finalSrc) {
        return renderFallback();
    }

    return (
        <img
            src={finalSrc}
            alt={name || 'Avatar'}
            className={`
                ${sizeClasses[size]} 
                rounded-full object-cover 
                ${showRing ? `border-2 ${ringColor}` : ''}
                ${className}
            `}
            onError={() => setImgError(true)}
        />
    );
};

export default Avatar;
