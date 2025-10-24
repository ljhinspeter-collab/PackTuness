import React, { useState } from 'react';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';

const PackRevealCard: React.FC<{ collectedSong: CollectedSong }> = ({ collectedSong }) => {
    const { song, serialNumber } = collectedSong;
    const rarityStyles = getRarityStyles(song.rarity);
    const isMythic = song.rarity === Rarity.Mythic;
    const isJailbroken = song.rarity === Rarity.Jailbroken;
    const isShiny = song.isShiny;
    
    const getBackgroundStyles = () => {
        if (isJailbroken) {
            return 'bg-gradient-to-br from-gray-900 via-black to-gray-800 jailbroken-border';
        }
        if (isShiny) {
            return 'bg-gradient-to-br from-pink-700 via-purple-800 to-indigo-900';
        }
        switch (song.rarity) {
            case Rarity.Mythic:
                return 'bg-gradient-to-br from-amber-500 via-yellow-600 to-purple-900 mythic-border';
            case Rarity.Rare:
                return `bg-gradient-to-br from-blue-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Uncommon:
                return `bg-gradient-to-br from-green-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Common:
            default:
                return `bg-gradient-to-br from-gray-800 to-gray-900 border ${rarityStyles.borderColor}`;
        }
    };

    return (
        <div className={`w-full h-full p-4 rounded-xl shadow-2xl flex flex-col justify-between relative select-none overflow-hidden ${getBackgroundStyles()} ${isShiny ? 'mythic-glow' : ''} ${isJailbroken ? 'jailbroken-glow' : ''}`}>
             {isJailbroken && <div className="jailbroken-overlay-effect"></div>}
            <div className="absolute top-4 left-4 flex flex-col items-start gap-1 z-10">
                 <div className="flex gap-2 items-center">
                    <div className={`text-sm font-bold px-3 py-1 rounded-full shadow-md ${isMythic ? 'bg-yellow-400 text-black' : isJailbroken ? 'bg-white text-black' : `${rarityStyles.bgColor} ${rarityStyles.textColor}`}`}>{song.rarity}</div>
                    {isShiny && (
                        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md animate-pulse">SHINY</div>
                    )}
                 </div>
                 {(isMythic || isJailbroken) && song.baseRarity && (
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${getRarityStyles(song.baseRarity).bgColor} ${getRarityStyles(song.baseRarity).textColor}`}>
                        Base {song.baseRarity}
                    </div>
                )}
            </div>
            {isMythic && serialNumber && (<div className="absolute top-4 right-4 text-sm font-bold px-3 py-1 rounded-full shadow-md bg-yellow-400 text-black">#{String(serialNumber).padStart(3, '0')}</div>)}
            {isJailbroken && (<div className="absolute top-4 right-4 text-sm font-bold px-3 py-1 rounded-full shadow-md bg-white text-black">1 of 1</div>)}

            <div className="text-center pt-4">
                <p className={`font-bold text-2xl truncate ${isMythic || isJailbroken ? rarityStyles.textGradient : 'text-white'}`}>{song.title}</p>
                <p className="text-gray-300 text-lg">{song.artist.name}</p>
            </div>
            <div className="relative w-full aspect-square mx-auto my-2">
              <img src={song.albumArtUrl} crossOrigin="anonymous" alt={song.album.title} className={`w-full h-full rounded-lg object-cover `} />
               {isShiny && <div className="absolute inset-0 rounded-lg holographic-overlay" style={{opacity: 0.5, backgroundBlendMode: 'overlay'}}></div>}
            </div>
             <div className="text-center text-xs text-gray-400">{song.album.title}</div>
        </div>
    );
};

export const RewardModal: React.FC<{ pack: CollectedSong[], title: string, onClose: () => void }> = ({ pack, title, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleRevealClick = () => {
        if (isAnimating || currentIndex >= pack.length) return;
        setIsAnimating(true);
        setCurrentIndex(currentIndex + 1);
        setTimeout(() => setIsAnimating(false), 500);
    };

    return (
        <div className="modal-overlay">
            <div className="flex flex-col items-center justify-center text-center w-full h-full">
                <h2 className="text-3xl font-bold mb-2 z-10">{title}</h2>
                <p className="font-semibold text-white/80 mb-2 z-10">
                    {currentIndex < pack.length ? `Card ${currentIndex + 1} of ${pack.length}` : 'Pack Complete!'}
                </p>
                <div 
                    onClick={handleRevealClick}
                    className="relative w-[300px] h-[450px] z-10 cursor-pointer"
                >
                    {pack.map((song, index) => {
                        const isRevealed = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        
                        let transform = '';
                        if(isRevealed) {
                            transform = 'translateY(-150%) rotate(15deg) scale(0.8)';
                        } else if (isCurrent) {
                            transform = 'translateY(0) scale(1)';
                        } else {
                            const stackIndex = index - currentIndex;
                            transform = `translateY(${stackIndex * 15}px) scale(${1 - (stackIndex * 0.05)})`;
                        }

                        return (
                            <div
                                key={song.id}
                                className="absolute w-full h-full transition-all duration-500 ease-in-out"
                                style={{
                                    transform,
                                    zIndex: pack.length - index,
                                    opacity: isRevealed ? 0 : 1
                                }}
                            >
                                <PackRevealCard collectedSong={song} />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 z-20 h-[52px] flex items-center justify-center">
                    {currentIndex < pack.length ? (
                        <p className="text-white/60 font-semibold animate-fadeIn">Tap card to reveal next</p>
                    ) : (
                        <button onClick={onClose} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white animate-fadeIn">
                            Awesome!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
