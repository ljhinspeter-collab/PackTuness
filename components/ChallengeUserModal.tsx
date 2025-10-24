import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { User, CollectedSong } from '../types';
import { Rarity } from '../types';

const SongCard: React.FC<{ song: CollectedSong, isSelected: boolean, onSelect: () => void }> = ({ song, isSelected, onSelect }) => {
    return (
        <button 
            onClick={onSelect}
            className={`w-full text-left p-2 rounded-lg transition-all border ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-900/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
        >
            <div className="flex items-center gap-2">
                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow truncate">
                    <p className="font-semibold text-sm truncate">{song.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                </div>
            </div>
        </button>
    );
};


export const ChallengeUserModal: React.FC<{ opponent: User, onClose: () => void }> = ({ opponent, onClose }) => {
    const { currentUserCollection, challengeUser } = useContext(UserContext)!;
    const [selectedSongs, setSelectedSongs] = useState<CollectedSong[]>([]);
    
    const toggleSongSelection = (song: CollectedSong) => {
        setSelectedSongs(prev => {
            if (prev.find(s => s.id === song.id)) {
                return prev.filter(s => s.id !== song.id);
            }
            if (prev.length < 5) {
                return [...prev, song];
            }
            return prev;
        });
    };

    const handleChallenge = () => {
        if (selectedSongs.length !== 5) return;
        challengeUser(opponent.id, selectedSongs);
        onClose();
    };
    
    // Users cannot use Jailbroken songs in battles
    const availableCollection = currentUserCollection.filter(s => s.song.rarity !== Rarity.Jailbroken);


    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-1">Challenge <span className="text-indigo-400">{opponent.name}</span></h3>
                <p className="text-gray-400 mb-4">Select 5 songs from your collection to form your battle deck.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <p className="font-semibold mb-2">Your Deck ({selectedSongs.length}/5):</p>
                         {selectedSongs.length > 0 ? (
                            <div className="space-y-2">
                                {selectedSongs.map(s => (
                                     <div key={s.id} className="p-2 rounded-md bg-gray-700/50 flex items-center gap-2">
                                        <img src={s.song.albumArtUrl} alt={s.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
                                        <div className="truncate">
                                            <p className="text-xs font-semibold truncate">{s.song.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 p-4 border-2 border-dashed border-gray-600 rounded-lg h-full flex items-center justify-center">Select songs below.</div>
                        )}
                    </div>
                     <div>
                        <p className="font-semibold mb-2">Your Collection:</p>
                        <div className="flex-grow bg-gray-900/50 p-2 rounded-lg overflow-y-auto max-h-[250px]">
                            {availableCollection.length > 0 ? (
                                <div className="space-y-2">
                                    {availableCollection.map(song => (
                                        <SongCard 
                                            key={song.id}
                                            song={song}
                                            isSelected={!!selectedSongs.find(s => s.id === song.id)}
                                            onSelect={() => toggleSongSelection(song)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 p-4">You have no songs to battle with.</p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button 
                        onClick={handleChallenge} 
                        disabled={selectedSongs.length !== 5}
                        className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Send Challenge
                    </button>
                </div>
            </div>
        </div>
    );
};