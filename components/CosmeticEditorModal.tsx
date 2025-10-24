import React, { useState, useMemo, useContext, useEffect } from 'react';
import type { User, ArtistMastery, Album, Title } from '../types';
import { UserContext } from '../contexts/UserContext';
import { challenges } from '../services/challengeService';
import { ArtistBadgeIcon } from './ArtistBadgeIcon';
import { getArtistAlbums } from '../services/musicService';
import { CheckCircleIcon } from './icons';

const MAX_ARTIST_BADGES = 3;

const TitleEditor: React.FC<{
    earnedTitles: Title[];
    activeTitleId: string | null;
    onSelect: (titleId: string | null) => void;
}> = ({ earnedTitles, activeTitleId, onSelect }) => {
    if (!earnedTitles || earnedTitles.length === 0) {
        return <div className="text-center text-gray-400 p-8">Win a Label War to earn exclusive titles!</div>;
    }

    return (
        <div>
            <p className="text-sm text-gray-400 mb-4">Select a title to display on your profile. These are earned by achieving 1st place in Label Wars.</p>
            <div className="space-y-3">
                <button
                    onClick={() => onSelect(null)}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${!activeTitleId ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                    <p className="font-semibold">No Title</p>
                </button>
                {earnedTitles.map(title => (
                    <button
                        key={title.id}
                        onClick={() => onSelect(title.id)}
                        className={`w-full p-3 text-left rounded-lg transition-colors ${activeTitleId === title.id ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <p className="font-semibold">{title.name}</p>
                        <p className="text-xs text-gray-400">{title.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export const CosmeticEditorModal: React.FC<{ user: User; onClose: () => void; }> = ({ user, onClose }) => {
    const { updateCurrentUser } = useContext(UserContext)!;
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'badges' | 'frames' | 'titles'>('badges');

    // State for Artist Badges
    const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<string>>(new Set(user.displayedArtistBadges || []));

    // State for Profile Frames
    const [frameArtists, setFrameArtists] = useState<Array<ArtistMastery & { artistId: string }>>([]);
    const [selectedArtistForFrames, setSelectedArtistForFrames] = useState<string | null>(null);
    const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
    const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(user.activeProfileFrame);
    
    // State for Titles
    const [selectedTitleId, setSelectedTitleId] = useState(user.activeTitleId || null);

    const availableArtistBadges = useMemo(() => {
        return Object.entries(user.artistMastery)
            .filter((entry): entry is [string, ArtistMastery] => !!entry[1] && typeof entry[1] === 'object')
            .filter(([, mastery]) => mastery.level >= 1)
            .map(([artistId, mastery]) => ({ ...mastery, artistId }))
            .sort((a,b) => b.xp - a.xp);
    }, [user.artistMastery]);

     useEffect(() => {
        const artistsWithFrames = Object.entries(user.artistMastery)
            .filter((entry): entry is [string, ArtistMastery] => !!entry[1] && typeof entry[1] === 'object')
            .filter(([, mastery]) => mastery.level >= 2)
            .map(([artistId, mastery]) => ({ ...mastery, artistId }))
            .sort((a,b) => b.xp - a.xp);
        setFrameArtists(artistsWithFrames);
    }, [user.artistMastery]);

    const handleBadgeSelect = (artistId: string) => {
        setSelectedBadgeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(artistId)) {
                newSet.delete(artistId);
            } else if (newSet.size < MAX_ARTIST_BADGES) {
                newSet.add(artistId);
            }
            return newSet;
        });
    };
    
    const handleArtistSelectForFrames = async (artistId: string) => {
        setSelectedArtistForFrames(artistId);
        setIsLoadingAlbums(true);
        const albums = await getArtistAlbums(artistId);
        setArtistAlbums(albums);
        setIsLoadingAlbums(false);
    };

    const handleFrameSelect = (album: Album, artistId: string) => {
        setSelectedFrame({ artistId, albumArtUrl: album.coverUrl });
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateCurrentUser({
                displayedArtistBadges: Array.from(selectedBadgeIds),
                activeProfileFrame: selectedFrame || null,
                activeTitleId: selectedTitleId,
            });
            onClose();
        } catch (error) {
            console.error("Failed to save cosmetic changes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-3xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Customize Profile</h3>
                
                <div className="flex justify-center border-b border-gray-700 mb-4">
                    <button onClick={() => setActiveTab('badges')} className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'badges' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Artist Badges</button>
                    <button onClick={() => setActiveTab('frames')} className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'frames' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Profile Frames</button>
                    <button onClick={() => setActiveTab('titles')} className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'titles' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Titles</button>
                </div>

                <div className="flex-grow min-h-0 overflow-y-auto">
                    {activeTab === 'badges' && (
                        <div>
                            <p className="text-sm text-gray-400 mb-4">Select up to {MAX_ARTIST_BADGES} "Artist Follower" badges to display on your profile. You earn these by reaching Mastery Level 1.</p>
                             <div className="flex flex-wrap gap-4 justify-center">
                                {availableArtistBadges.map(artist => (
                                    <div key={artist.artistId} className="relative">
                                        <ArtistBadgeIcon 
                                            artist={artist}
                                            size="md"
                                            onClick={() => handleBadgeSelect(artist.artistId)}
                                            className="cursor-pointer"
                                        />
                                        {selectedBadgeIds.has(artist.artistId) && (
                                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 pointer-events-none">
                                                <CheckCircleIcon className="w-5 h-5 text-white"/>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'frames' && (
                         <div>
                            <p className="text-sm text-gray-400 mb-4">Select a spinning vinyl frame for your profile picture. You unlock frames by reaching Mastery Level 2 with an artist.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg">
                                    <h4 className="font-semibold mb-2">1. Select an Artist</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {frameArtists.map(artist => (
                                            <button key={artist.artistId} onClick={() => handleArtistSelectForFrames(artist.artistId)} className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${selectedArtistForFrames === artist.artistId ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                                <img src={artist.artistPictureUrl} alt={artist.artistName} className="w-8 h-8 rounded-full object-cover"/>
                                                <span className="font-semibold text-sm">{artist.artistName}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                 <div className="bg-gray-900/50 p-3 rounded-lg">
                                    <h4 className="font-semibold mb-2">2. Select an Album</h4>
                                    {isLoadingAlbums ? <p>Loading albums...</p> : (
                                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                                            {artistAlbums.map(album => (
                                                <button key={album.id} onClick={() => handleFrameSelect(album, selectedArtistForFrames!)} className="relative aspect-square group">
                                                    <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover rounded-md"/>
                                                    {selectedFrame?.albumArtUrl === album.coverUrl && (
                                                        <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center rounded-md">
                                                            <CheckCircleIcon className="w-8 h-8 text-white"/>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {selectedFrame && <button onClick={() => setSelectedFrame(null)} className="w-full mt-2 py-1.5 bg-red-600/80 hover:bg-red-700 text-white font-semibold rounded-lg text-xs">Remove Frame</button>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'titles' && (
                        <TitleEditor
                            earnedTitles={user.earnedTitles || []}
                            activeTitleId={selectedTitleId}
                            onSelect={setSelectedTitleId}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold disabled:bg-gray-500">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};