import React from 'react';
import type { CollectedSong } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { Rarity } from '../types';

interface WallFrameProps {
    song: CollectedSong | undefined;
    title: string;
    onClick: (song: CollectedSong) => void;
}

export const WallFrame: React.FC<WallFrameProps> = ({ song, title, onClick }) => {
    
    const renderContent = () => {
        if (!song) {
            return (
                <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-2">
                    <p className="text-gray-500 text-sm text-center">Nothing showcased</p>
                </div>
            );
        }

        const rarityStyles = getRarityStyles(song.song.rarity);
        let glowClass = '';
        if (song.song.rarity === Rarity.Jailbroken) glowClass = 'jailbroken-glow';
        else if(song.isPrestige) glowClass = 'prestige-glow';
        else if (song.song.isShiny) glowClass = 'shiny-glow';
        else if (song.song.rarity === Rarity.Mythic) glowClass = 'mythic-glow';

        return (
            <button 
                onClick={() => onClick(song)} 
                className={`relative w-full h-full bg-gray-800 rounded-lg p-2 border border-gray-600 shadow-lg group transition-all duration-300 hover:scale-105 ${glowClass}`}
            >
                <img src={song.song.albumArtUrl} alt={song.song.title} className="w-full h-full object-cover rounded-md" />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-left z-10 rounded-lg">
                    <p className="font-bold text-white truncate text-sm leading-tight">{song.song.title}</p>
                    <p className="text-xs text-gray-300 truncate">{song.song.artist.name}</p>
                </div>
            </button>
        );
    };

    return (
        <div className="w-48 h-56 flex flex-col items-center gap-2">
            <div className="w-full h-48">
                {renderContent()}
            </div>
            <p className="text-sm font-semibold text-gray-400">{title}</p>
        </div>
    );
};
