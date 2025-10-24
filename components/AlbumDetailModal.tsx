import React, { useState, useMemo, useContext } from 'react';
import type { Album, Artist, Song, CollectedSong } from '../types';
import { UserContext } from '../contexts/UserContext';
import { SparklesIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface AlbumDetailModalProps {
    album: Album;
    tracks: Song[];
    artist: Artist;
    onClose: () => void;
}

const TrackItem: React.FC<{
    track: Song;
    isCollected: boolean;
    isShinyCollected: boolean;
    showShiny: boolean;
}> = ({ track, isCollected, isShinyCollected, showShiny }) => {
    
    let statusIcon: React.ReactNode = null;
    let textColor = 'text-gray-500';
    let titleStyle = 'font-normal';

    if (showShiny) {
        if (isShinyCollected) {
            statusIcon = <SparklesIcon className="w-5 h-5 text-cyan-400" />;
            textColor = 'text-white';
            titleStyle = 'font-semibold';
        } else if (isCollected) {
            // User has the normal version, but not the shiny
            statusIcon = <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
            textColor = 'text-gray-400';
        } else {
            // User doesn't have the song at all
            statusIcon = <XCircleIcon className="w-5 h-5 text-gray-700" />;
        }
    } else { // Normal mode
        if (isCollected) {
            statusIcon = <CheckCircleIcon className="w-5 h-5 text-green-400" />;
            textColor = 'text-white';
            titleStyle = 'font-semibold';
        } else {
            statusIcon = <XCircleIcon className="w-5 h-5 text-gray-700" />;
        }
    }

    return (
        <li className={`flex items-center justify-between p-2 rounded-md ${isCollected ? 'bg-gray-800/50' : ''}`}>
            <span className={`${textColor} ${titleStyle} truncate`}>{track.title}</span>
            <div className="flex-shrink-0">{statusIcon}</div>
        </li>
    );
};


export const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({ album, tracks, artist, onClose }) => {
    const [showShiny, setShowShiny] = useState(false);
    const { currentUserCollection } = useContext(UserContext)!;

    const collectionStats = useMemo(() => {
        const collectedMap = new Map<string, { isShiny: boolean }>();
        currentUserCollection.forEach(cs => {
            // If we find a shiny, it's the most important version
            if (cs.song.isShiny) {
                collectedMap.set(cs.song.id, { isShiny: true });
            } else if (!collectedMap.has(cs.song.id)) {
                // Only set non-shiny if a shiny hasn't been found
                collectedMap.set(cs.song.id, { isShiny: false });
            }
        });

        let collectedCount = 0;
        let collectedShinyCount = 0;

        tracks.forEach(track => {
            const collected = collectedMap.get(track.id);
            if (collected) {
                collectedCount++;
                if (collected.isShiny) {
                    collectedShinyCount++;
                }
            }
        });

        return {
            collectedMap,
            collectedCount,
            collectedShinyCount,
            totalTracks: tracks.length,
        };

    }, [currentUserCollection, tracks]);

    const progress = showShiny ? collectionStats.collectedShinyCount : collectionStats.collectedCount;
    const total = collectionStats.totalTracks;
    const progressPercentage = total > 0 ? (progress / total) * 100 : 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-lg bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4 mb-4 flex-shrink-0">
                    <img src={album.coverUrl} alt={album.title} className="w-24 h-24 rounded-md object-cover flex-shrink-0" />
                    <div className="flex-grow">
                        <h3 className="text-2xl font-bold">{album.title}</h3>
                        <p className="text-lg text-gray-400">{artist.name}</p>
                    </div>
                </div>

                <div className="mb-4 flex-shrink-0">
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-semibold">{showShiny ? 'Shiny' : 'Standard'} Collection</span>
                        <span className="font-bold">{progress} / {total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                           className={`h-2.5 rounded-full ${showShiny ? 'bg-cyan-400' : 'bg-green-500'}`}
                           style={{ width: `${progressPercentage}%`}}
                        ></div>
                    </div>
                     <div className="flex items-center justify-end gap-2 mt-2">
                        <span className="text-sm font-medium">Show Shiny Progress</span>
                        <button 
                            onClick={() => setShowShiny(!showShiny)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showShiny ? 'bg-cyan-500' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showShiny ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-2 flex-shrink-0">Tracklist</p>
                <div className="flex-grow overflow-y-auto bg-gray-900/50 p-2 rounded-lg">
                    {tracks.length > 0 ? (
                        <ul className="space-y-1">
                           {tracks.map(track => {
                                const collectedInfo = collectionStats.collectedMap.get(track.id);
                                return (
                                    <TrackItem 
                                        key={track.id}
                                        track={track}
                                        isCollected={!!collectedInfo}
                                        isShinyCollected={!!collectedInfo?.isShiny}
                                        showShiny={showShiny}
                                    />
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">Tracklist not available.</p>
                    )}
                </div>

                <div className="mt-6 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="w-full py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};