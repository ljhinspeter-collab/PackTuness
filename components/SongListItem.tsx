import React from 'react';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { PlayIcon, DiamondIcon, SparklesIcon } from './icons';

interface SongListItemProps {
  collectedSong: CollectedSong;
  onClick: (song: CollectedSong) => void;
}

interface RarityTagProps {
  rarity: Rarity;
  isShiny: boolean;
  isPrestige: boolean;
  serialNumber?: number;
}

const RarityTag: React.FC<RarityTagProps> = ({ rarity, isShiny, isPrestige, serialNumber }) => {
    if (isPrestige) {
        return (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-500">
                <DiamondIcon className="w-3 h-3 text-yellow-300" />
                <span className="text-xs font-semibold text-yellow-300">Prestige</span>
            </div>
        );
    }

    if (isShiny) {
         return (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-500">
                <SparklesIcon className="w-3 h-3 text-cyan-300" />
                <span className="text-xs font-semibold text-cyan-300">Shiny</span>
            </div>
        );
    }
  
    const styles: Record<Rarity, { color: string, bg: string }> = {
        [Rarity.Common]: { color: 'text-green-400', bg: 'bg-green-900/50' },
        [Rarity.Uncommon]: { color: 'text-purple-400', bg: 'bg-purple-900/50' },
        [Rarity.Rare]: { color: 'text-blue-400', bg: 'bg-blue-900/50' },
        [Rarity.Mythic]: { color: 'text-yellow-400', bg: 'bg-yellow-900/50' },
        [Rarity.Jailbroken]: { color: 'text-gray-300', bg: 'bg-gray-900/50' },
    };

    const style = styles[rarity] || styles.Common;
    
    let rarityText: React.ReactNode = rarity;
    if (rarity === Rarity.Mythic && serialNumber) {
        rarityText = `Mythic #${String(serialNumber).padStart(3, '0')}`;
    } else if (rarity === Rarity.Mythic) {
        rarityText = 'Mythic';
    }


    return (
        <div className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-full ${style.bg}`}>
            <DiamondIcon className={`w-3 h-3 ${style.color}`} />
            <span className={`text-xs font-semibold ${style.color}`}>{rarityText}</span>
        </div>
    );
};


const SongListItemComponent: React.FC<SongListItemProps> = ({ collectedSong, onClick }) => {
  // FIX: `isShiny` is a property of `song`, not `collectedSong`.
  const { song, isPrestige, serialNumber } = collectedSong;
  
  return (
    <button onClick={() => onClick(collectedSong)} className="w-full flex items-center gap-4 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
      <img src={song.albumArtUrl} crossOrigin="anonymous" alt={song.album.title} className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
      <div className="flex-grow text-left truncate">
        <p className="font-semibold text-white truncate text-base">{song.title}</p>
        <p className="text-sm text-gray-400 truncate">{song.artist.name}</p>
      </div>
      <div className="flex-shrink-0 w-32 flex justify-center">
        <RarityTag rarity={song.rarity} isShiny={song.isShiny} isPrestige={isPrestige} serialNumber={serialNumber} />
      </div>
      <div className="flex-shrink-0">
        <PlayIcon className="w-6 h-6 text-gray-400" />
      </div>
    </button>
  );
};

export const SongListItem = React.memo(SongListItemComponent);