import React, { useState, useEffect, useContext, useRef } from 'react';
import { searchSongs } from '../services/musicService';
import type { Song, CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { UserContext } from '../contexts/UserContext';
import { VinylIcon, SparklesIcon } from '../components/icons';
import DailyEventBanner from '../components/DailyEventBanner';
import { getDailyEventState } from '../services/dailyEventService';

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
            // Shiny: Pink/Purple gradient
            return 'bg-gradient-to-br from-pink-700 via-purple-800 to-indigo-900';
        }
        switch (song.rarity) {
            case Rarity.Mythic:
                // Mythic: Gold/Purple gradient
                return 'bg-gradient-to-br from-amber-500 via-yellow-600 to-purple-900 mythic-border';
            case Rarity.Rare:
                // Rare: Blue gradient
                return `bg-gradient-to-br from-blue-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Uncommon:
                // Uncommon: Green gradient
                return `bg-gradient-to-br from-green-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Common:
            default:
                // Common: Gray gradient
                return `bg-gradient-to-br from-gray-800 to-gray-900 border ${rarityStyles.borderColor}`;
        }
    };

    return (
        <div
            className={`w-full h-full p-4 rounded-xl shadow-2xl flex flex-col justify-between relative select-none overflow-hidden ${getBackgroundStyles()} ${isShiny ? 'mythic-glow' : ''} ${isJailbroken ? 'jailbroken-glow' : ''}`}
        >
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

export const PacksView: React.FC = () => {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packSongs, setPackSongs] = useState<CollectedSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const userContext = useContext(UserContext);
  const { currentUser, currentUserCollection, addSongsToCollection } = userContext!;
  
  const packRef = useRef<HTMLDivElement>(null);
  const hasPackBonus = currentUser?.packBonusUntil && currentUser.packBonusUntil > Date.now();

  useEffect(() => {
    const pack = packRef.current;
    if (!pack) return;

    const handleMouseMove = (e: MouseEvent) => {
        const { width, height, left, top } = pack.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        const rotateX = (y / height - 0.5) * -30; // Tilt up/down
        const rotateY = (x / width - 0.5) * 30;   // Tilt left/right
        
        pack.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        pack.style.setProperty('--holoX', `${(x / width) * 100}%`);
        pack.style.setProperty('--holoY', `${(y / height) * 100}%`);
    };

    const handleMouseLeave = () => {
        pack.style.transform = ''; // Resets to CSS-defined transform, re-enabling animation
    };
    
    const container = pack.parentElement;
    container?.addEventListener('mousemove', handleMouseMove);
    container?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
        container?.removeEventListener('mousemove', handleMouseMove);
        container?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [packSongs]); // Rerun if packSongs changes to re-attach listener if component re-renders

  useEffect(() => {
    // When the final card is revealed, wait a moment then reset the UI.
    if (currentIndex >= packSongs.length && packSongs.length > 0) {
        const timer = setTimeout(() => {
            setPackSongs([]);
            setCurrentIndex(-1);
        }, 1500); // 1.5 second delay for the user to see the last card

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [currentIndex, packSongs]);

  const openPack = async () => {
    setIsOpening(true);
    setError(null);
    setPackSongs([]);
    setCurrentIndex(-1);
    try {
      const { activeEvent } = getDailyEventState();
      const existingSongIds = new Set<string>(currentUserCollection.map(cs => cs.song.id));
      const packSize = activeEvent?.id === 'BONUS_TRACKS' && Math.random() < 0.25 ? 6 : 5;
      
      const songs = await searchSongs(
        '', 
        currentUser?.favoriteArtists || [], 
        existingSongIds, 
        currentUser, 
        activeEvent, 
        currentUserCollection,
        { packSize }
      );

      if (songs.length < packSize) {
        setError('Could not find enough new songs for a full pack. Your collection is vast!');
        setIsOpening(false);
      } else {
        // Add songs to the database immediately and get the final CollectedSong objects
        const collectedSongs = await addSongsToCollection(songs, activeEvent);
        setPackSongs(collectedSongs);
        setIsOpening(false);
        // Start the reveal sequence
        setTimeout(() => setCurrentIndex(0), 100);
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred while opening the pack.');
      setIsOpening(false);
    }
  };
  
  const handleRevealClick = () => {
    // Prevent clicks during animation or before the pack is ready.
    // Also prevent clicks after the last card is revealed and auto-close is pending.
    if (isOpening || currentIndex < 0 || currentIndex >= packSongs.length) return;
    
    setIsOpening(true);
    
    // Animate to the next card immediately
    setCurrentIndex(currentIndex + 1);

    // Release the click lock after the animation duration
    setTimeout(() => {
      setIsOpening(false);
    }, 500);
  };

  const renderPackOpener = () => {
    if (packSongs.length > 0) {
      return (
        <div className="modal-overlay">
          <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <p className="font-semibold text-white/80 mb-2 z-10">
                {currentIndex < packSongs.length ? `Card ${currentIndex + 1} of ${packSongs.length}` : 'Pack Complete!'}
            </p>
            <div 
              onClick={handleRevealClick}
              className="relative w-[300px] h-[450px] z-10 cursor-pointer"
            >
              {packSongs.map((song, index) => {
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
                      zIndex: packSongs.length - index,
                      opacity: isRevealed ? 0 : 1
                    }}
                  >
                    <PackRevealCard collectedSong={song} />
                  </div>
                );
              })}
            </div>
             <div className="mt-6 z-20 h-[52px] flex items-center justify-center">
                {currentIndex < packSongs.length ? (
                    <p className="text-white/60 font-semibold animate-fadeIn">Tap card to reveal next</p>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-white/80 font-semibold animate-fadeIn">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Adding to your collection...</span>
                    </div>
                )}
            </div>
          </div>
        </div>
      );
    }
    
    // Main view
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="text-center flex flex-col items-center justify-center">
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <h2 className="text-3xl font-bold mb-2">The Infinity Pack</h2>
          {hasPackBonus && (
              <div className="mb-4 p-2 bg-yellow-400/20 border border-yellow-500 rounded-lg text-yellow-300 font-semibold flex items-center gap-2 text-sm animate-pulse">
                  <SparklesIcon className="w-5 h-5" />
                  <span>PACK BONUS ACTIVE!</span>
              </div>
          )}
          <p className="text-gray-400 mb-8 max-w-md">Tap the pack to open it and discover songs. Daily events grant special bonuses!</p>
          
          <div
              onClick={!isOpening ? openPack : undefined}
              className="pack-perspective w-72 h-96 cursor-pointer group"
          >
              <div
                  ref={packRef} 
                  className="pack-3d relative w-full h-full bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 rounded-2xl shadow-2xl flex items-center justify-center text-white font-bold text-2xl border-4 border-yellow-400 p-4"
              >
                  {isOpening ? (
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  ) : (
                      <div className="text-center select-none border-2 border-yellow-300/50 rounded-lg p-4 bg-black/20">
                          <h3 className="text-5xl font-black tracking-widest text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] [text-shadow:_0_0_10px_#fde047]">PACK</h3>
                          <p className="text-yellow-200 font-semibold tracking-wider">TUNES</p>
                      </div>
                  )}
                  <div className="pack-holographic rounded-xl"></div>
              </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-240px)] flex flex-col items-center justify-center">
      <DailyEventBanner />
      {renderPackOpener()}
    </div>
  );
};