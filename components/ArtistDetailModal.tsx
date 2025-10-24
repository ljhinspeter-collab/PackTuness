
import React, { useState, useMemo, useContext, useEffect } from 'react';
import type { User, ArtistMastery, CollectedSong, Album } from '../types';
import { Rarity } from '../types';
import { MASTERY_LEVELS, UserContext } from '../contexts/UserContext';
import { CrownIcon, LockClosedIcon, StarIcon, CheckCircleIcon, SparklesIcon } from '../components/icons';
import { getArtistAlbums } from '../services/musicService';

interface ArtistDetailModalProps {
    mastery: ArtistMastery & { artistId: string };
    user: User;
    onClose: () => void;
}

const QuestSongItem: React.FC<{
    song: CollectedSong;
    type: 'radio' | 'checkbox';
    isSelected: boolean;
    onSelect: () => void;
    disabled?: boolean;
}> = ({ song, type, isSelected, onSelect, disabled = false }) => {
    return (
        <label className={`p-2 rounded-md flex items-center gap-2 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-indigo-600/50 ring-2 ring-indigo-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
            <input type={type} name={type === 'radio' ? 'mythic' : 'shiny'} checked={isSelected} onChange={onSelect} disabled={disabled} className="form-checkbox h-5 w-5 rounded text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500" />
            <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-8 h-8 rounded-sm object-cover" />
            <div className="truncate">
                <p className="text-xs font-semibold truncate">{song.song.title}</p>
                <p className="text-xs text-gray-400 truncate">
                    {song.isPrestige ? 'Prestige' : song.song.rarity}
                    {song.song.rarity === Rarity.Mythic && ` #${song.serialNumber}`}
                    {song.song.isShiny && ' ✨'}
                </p>
            </div>
        </label>
    );
};

const RewardTier: React.FC<{ level: number, name: string, description: string, isUnlocked: boolean }> = ({ level, name, description, isUnlocked }) => {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg ${isUnlocked ? 'bg-gray-700/50' : 'bg-gray-800/50 opacity-60'}`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl ${isUnlocked ? 'bg-indigo-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                {level}
            </div>
            <div className="flex-grow">
                <p className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>{name}</p>
                <p className="text-sm text-gray-400">{description}</p>
            </div>
            <div className="flex-shrink-0">
                {isUnlocked ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> : <LockClosedIcon className="w-6 h-6 text-gray-500" />}
            </div>
        </div>
    );
};


export const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({ mastery, user, onClose }) => {
    const { prestigeSong, currentUserCollection, updateCurrentUser } = useContext(UserContext)!;
    const [selectedMythicId, setSelectedMythicId] = useState<string | null>(null);
    const [selectedShinyIds, setSelectedShinyIds] = useState<Set<string>>(new Set());
    const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
    
    const isMastered = mastery.level >= MASTERY_LEVELS.length;
    const hasUnlockedFrame = mastery.level >= 2;
    const hasUnlockedShinyHunt = mastery.level >= 3;

    const levelName = mastery.level > 0 ? MASTERY_LEVELS[mastery.level - 1].name : 'Beginner';

    useEffect(() => {
        if (hasUnlockedFrame) {
            getArtistAlbums(mastery.artistId).then(setArtistAlbums);
        }
    }, [mastery.artistId, hasUnlockedFrame]);

    const { mythics, shinies } = useMemo(() => {
        const songs = currentUserCollection.filter(cs => cs.song.artist.id === mastery.artistId);
        return {
            mythics: songs.filter(cs => cs.song.rarity === Rarity.Mythic && !cs.isPrestige),
            shinies: songs.filter(cs => cs.song.isShiny && !cs.isPrestige),
        };
    }, [currentUserCollection, mastery.artistId]);

    const handleShinySelect = (id: string) => {
        setSelectedShinyIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                if (newSet.size < 5) {
                    newSet.add(id);
                }
            }
            return newSet;
        });
    };
    
    const handlePrestige = () => {
        if (!selectedMythicId || selectedShinyIds.size !== 5) return;
        if (window.confirm("Are you sure you want to prestige this Mythic card? This will consume the 5 selected Shiny cards permanently and reset your mastery XP for this artist.")) {
            prestigeSong(selectedMythicId, Array.from(selectedShinyIds));
            onClose();
        }
    };
    
    const canPrestige = selectedMythicId !== null && selectedShinyIds.size === 5;

    const handleSetFrame = (album: Album) => {
        updateCurrentUser({ activeProfileFrame: { artistId: mastery.artistId, albumArtUrl: album.coverUrl } });
    };

    const handleRemoveFrame = () => {
        updateCurrentUser({ activeProfileFrame: null });
    };

    const handleShinyHuntToggle = () => {
        if (user.shinyHuntArtistId === mastery.artistId) {
            updateCurrentUser({ shinyHuntArtistId: null });
        } else {
            updateCurrentUser({ shinyHuntArtistId: mastery.artistId });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4 mb-4 flex-shrink-0">
                    <img src={mastery.artistPictureUrl} alt={mastery.artistName} className="w-20 h-20 rounded-full object-cover" />
                    <div>
                        <h3 className="text-3xl font-bold">{mastery.artistName}</h3>
                        <p className="text-lg text-indigo-400 font-semibold">Mastery Level {mastery.level} - {levelName}</p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                     {/* Mastery Rewards List */}
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-xl mb-3">Mastery Rewards</h4>
                        <div className="space-y-2">
                            <RewardTier level={1} name="'Artist Follower' Badge" description="Display this artist's badge on your profile." isUnlocked={mastery.level >= 1} />
                            <RewardTier level={2} name="Profile Frame" description="Unlock a spinning vinyl profile frame." isUnlocked={mastery.level >= 2} />
                            <RewardTier level={3} name="Shiny Hunt Mode" description="Double the shiny chance for this artist's songs." isUnlocked={mastery.level >= 3} />
                            <RewardTier level={4} name="Prestige Quest" description="Unlock the ultimate challenge for this artist." isUnlocked={mastery.level >= 4} />
                        </div>
                    </div>

                     {/* Profile Frame Reward */}
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-xl mb-3 text-cyan-300 flex items-center gap-2"><StarIcon className="w-6 h-6"/> Profile Frame</h4>
                        {!hasUnlockedFrame ? (
                             <div className="text-center py-8 bg-gray-800 rounded-lg">
                                <LockClosedIcon className="w-10 h-10 mx-auto text-gray-500 mb-2"/>
                                <p className="font-semibold">Reach Mastery Level 2 to unlock.</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-300 mb-3">Select an album to use as a spinning vinyl frame for your profile picture.</p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {artistAlbums.map(album => (
                                        <button key={album.id} onClick={() => handleSetFrame(album)} className="relative aspect-square group">
                                            <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover rounded-md" />
                                            {user.activeProfileFrame?.albumArtUrl === album.coverUrl && (
                                                <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center rounded-md">
                                                    <CheckCircleIcon className="w-8 h-8 text-white"/>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {user.activeProfileFrame?.artistId === mastery.artistId && (
                                     <button onClick={handleRemoveFrame} className="w-full mt-3 py-2 bg-red-600/80 hover:bg-red-700 text-white font-semibold rounded-lg text-sm">Remove Frame</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Shiny Hunt */}
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-xl mb-3 text-fuchsia-400 flex items-center gap-2"><SparklesIcon className="w-6 h-6"/> Shiny Hunt</h4>
                         {!hasUnlockedShinyHunt ? (
                             <div className="text-center py-8 bg-gray-800 rounded-lg">
                                <LockClosedIcon className="w-10 h-10 mx-auto text-gray-500 mb-2"/>
                                <p className="font-semibold">Reach Mastery Level 3 to unlock.</p>
                            </div>
                        ) : (
                             <div>
                                <p className="text-sm text-gray-300 mb-3">Activate a Shiny Hunt to double the chances of finding Shiny songs by this artist. Only one hunt can be active at a time.</p>
                                 <button
                                    onClick={handleShinyHuntToggle}
                                    disabled={!!user.shinyHuntArtistId && user.shinyHuntArtistId !== mastery.artistId}
                                    className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    style={user.shinyHuntArtistId === mastery.artistId ? { backgroundColor: '#be185d', color: 'white' } : { backgroundColor: '#4b5563' }}
                                >
                                    {user.shinyHuntArtistId === mastery.artistId ? 'Shiny Hunt Active!' : 'Activate Shiny Hunt'}
                                </button>
                                {user.shinyHuntArtistId && user.shinyHuntArtistId !== mastery.artistId && (
                                    <p className="text-xs text-yellow-400 text-center mt-2">A hunt is already active for another artist.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Prestige Quest */}
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-xl mb-3 text-yellow-300 flex items-center gap-2"><CrownIcon className="w-6 h-6"/> Prestige Quest</h4>
                        
                        {!isMastered ? (
                            <div className="text-center py-8 bg-gray-800 rounded-lg">
                                <LockClosedIcon className="w-10 h-10 mx-auto text-gray-500 mb-2"/>
                                <p className="font-semibold">Reach Max Mastery Level ({MASTERY_LEVELS.length}) to unlock.</p>
                                <p className="text-sm text-gray-400">Unlock the ultimate challenge for this artist.</p>
                            </div>
                        ) : (
                            <div>
                               <p className="text-sm text-gray-300 mb-4">Combine <strong>1 Mythic</strong> and <strong>5 Shiny</strong> songs from this artist to create a unique Prestige card. This process consumes the selected cards and resets your mastery XP for this artist.</p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-semibold mb-2">1. Select a Mythic to upgrade</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 bg-gray-800/50 p-2 rounded">
                                            {mythics.length > 0 ? mythics.map(m => (
                                                <QuestSongItem key={m.id} song={m} type="radio" isSelected={selectedMythicId === m.id} onSelect={() => setSelectedMythicId(m.id)} />
                                            )) : <p className="text-xs text-center text-gray-400 p-2">No eligible Mythics.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-2">2. Select 5 Shinies to sacrifice ({selectedShinyIds.size}/5)</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 bg-gray-800/50 p-2 rounded">
                                             {shinies.length > 0 ? shinies.map(s => (
                                                <QuestSongItem 
                                                    key={s.id} 
                                                    song={s} 
                                                    type="checkbox" 
                                                    isSelected={selectedShinyIds.has(s.id)} 
                                                    onSelect={() => handleShinySelect(s.id)}
                                                    disabled={selectedShinyIds.size >= 5 && !selectedShinyIds.has(s.id)}
                                                />
                                            )) : <p className="text-xs text-center text-gray-400 p-2">No eligible Shinies.</p>}
                                        </div>
                                    </div>
                               </div>
                                <div className="mt-4">
                                    <button 
                                        onClick={handlePrestige}
                                        disabled={!canPrestige}
                                        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Prestige Card
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex-shrink-0">
                    <button onClick={onClose} className="w-full py-2 bg-gray-600 hover:bg-gray-500 font-semibold rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
};
