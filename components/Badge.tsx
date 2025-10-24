import React from 'react';
import type { Badge } from '../types';
import { iconMap } from './icons';

interface BadgeProps {
  badge: Badge;
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const BadgeIcon: React.FC<BadgeProps> = ({ badge, level, size = 'md', className, onClick, isDraggable, onDragStart, onDragEnd }) => {
    const tier = Math.ceil(level / 2); // Tier 1 (levels 1-2), Tier 2 (levels 3-4), etc.

    const styles = {
        sizeClasses: {
            sm: 'w-10 h-10',
            md: 'w-16 h-16',
            lg: 'w-24 h-24',
        },
        iconSizeClasses: {
            sm: 'w-5 h-5',
            md: 'w-8 h-8',
            lg: 'w-12 h-12',
        },
        emojiSizeClasses: {
            sm: 'text-xl',
            md: 'text-3xl',
            lg: 'text-5xl',
        },
        tierStyles: [
            // Tier 0 (default/fallback)
            { bg: 'bg-gray-700', border: 'border-2 border-gray-500', glow: 'shadow-gray-900/50' },
            // Tier 1 (Bronze)
            { bg: 'bg-gradient-to-br from-orange-900 to-stone-700', border: 'border-2 border-orange-400', glow: 'shadow-orange-500/30' },
            // Tier 2 (Silver)
            { bg: 'bg-gradient-to-br from-slate-600 to-gray-500', border: 'border-2 border-slate-300', glow: 'shadow-slate-300/40' },
            // Tier 3 (Gold)
            { bg: 'bg-gradient-to-br from-amber-600 to-yellow-700', border: 'border-2 border-yellow-400', glow: 'shadow-yellow-400/50' },
            // Tier 4 (Prismatic/Mythic)
            { bg: 'bg-gradient-to-br from-purple-700 to-indigo-800', border: 'mythic-border', glow: 'shadow-purple-500/60 mythic-glow' },
            // Tier 5+ (Max)
            { bg: 'bg-gradient-to-br from-cyan-600 to-blue-800', border: 'prestige-border', glow: 'shadow-cyan-400/70 prestige-glow' },
        ]
    };

    const currentTier = Math.min(tier, styles.tierStyles.length - 1);
    const { bg, border, glow } = styles.tierStyles[currentTier];
    const sizeClass = styles.sizeClasses[size];
    const iconSizeClass = styles.iconSizeClasses[size];
    const BadgeIconComponent = iconMap[badge.iconName];

    const baseClasses = `relative flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 ${sizeClass} ${bg} ${border} ${glow}`;

    return (
        <div 
            title={badge.description}
            className={`${baseClasses} ${className || ''} ${isDraggable ? 'cursor-grab' : 'cursor-default'}`}
            onClick={onClick}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {BadgeIconComponent ? (
                <BadgeIconComponent className={`${iconSizeClass} text-white/90 drop-shadow-md`} />
            ) : (
                 <span className={`${styles.emojiSizeClasses[size]} flex items-center justify-center leading-none`}>{badge.iconName}</span>
            )}
        </div>
    );
};