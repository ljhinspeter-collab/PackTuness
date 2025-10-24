import React from 'react';
import type { ArtistMastery } from '../types';

interface ArtistBadgeIconProps {
  artist: ArtistMastery;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const ArtistBadgeIcon: React.FC<ArtistBadgeIconProps> = ({ artist, size = 'md', className, onClick, isDraggable, onDragStart, onDragEnd }) => {
    const styles = {
        sizeClasses: {
            sm: 'w-10 h-10',
            md: 'w-16 h-16',
        },
    };

    const sizeClass = styles.sizeClasses[size];

    const baseClasses = `relative group flex items-center justify-center rounded-full transition-transform hover:scale-110 bg-gray-700 border-2 border-indigo-400 shadow-xl shadow-purple-500/50`;

    return (
        <div 
            title={`Artist Follower: ${artist.artistName}`}
            className={`${baseClasses} ${sizeClass} ${className || ''} ${isDraggable ? 'cursor-grab' : 'cursor-default'}`}
            onClick={onClick}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {artist.artistPictureUrl ? (
                <img src={artist.artistPictureUrl} alt={artist.artistName} className="w-full h-full object-cover rounded-full"/>
            ) : (
                <span className="font-bold text-white text-2xl">{artist.artistName.charAt(0)}</span>
            )}
            <div className="absolute inset-0 bg-black/30 rounded-full"></div>
            {/* Shiny white gradient overlay */}
            <div className="shiny-overlay-effect !rounded-full opacity-70"></div>
        </div>
    );
};