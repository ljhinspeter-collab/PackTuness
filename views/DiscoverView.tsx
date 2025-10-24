import React, { useState, useCallback, useContext, useMemo } from 'react';
import type { Artist, Album as AlbumType, Song } from '../types';
import { searchArtists, getArtistAlbums, getAlbumTracks } from '../services/musicService';
import { SearchBar } from '../components/SearchBar';
import { UserContext } from '../contexts/UserContext';
import { RectangleStackIcon, StarIcon } from '../components/icons';
import { AlbumDetailModal } from '../components/AlbumDetailModal';

const AlbumCard: React.FC<{ album: AlbumType, collectedCount: number, totalCount: number }> = ({ album, collectedCount, totalCount }) => {
    const isComplete = totalCount > 0 && collectedCount === totalCount;
    return (
        <div className={`relative w-full aspect-square rounded-lg overflow-hidden group border-2 ${isComplete ? 'border-yellow-400' : 'border-transparent'}`}>
            <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                <h4 className="font-bold text-white truncate group-hover:whitespace-normal">{album.title}</h4>
                {totalCount > 0 && (
                     <div className="flex items-center gap-1.5 text-xs mt-1">
                        <RectangleStackIcon className={`w-4 h-4 ${isComplete ? 'text-yellow-400' : 'text-gray-300'}`} />
                        <span className={`font-semibold ${isComplete ? 'text-yellow-400' : 'text-gray-300'}`}>{collectedCount} / {totalCount}</span>
                    </div>
                )}
            </div>
            {isComplete && <div className="absolute top-2 right-2 text-yellow-300" title="Album Complete!"><StarIcon className="w-6 h-6" /></div>}
        </div>
    );
};

export const DiscoverView: React.FC = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
    const [artistAlbums, setArtistAlbums] = useState<AlbumType[]>([]);
    const [albumTracks, setAlbumTracks] = useState<Record<string, Song[]>>({});
    const [isAlbumLoading, setIsAlbumLoading] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState<AlbumType | null>(null);

    const { currentUserCollection } = useContext(UserContext)!;
    const userCollectionIds = useMemo(() => new Set(currentUserCollection.map(c => c.song.id)), [currentUserCollection]);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSelectedArtist(null);
        setArtistAlbums([]);
        try {
            const results = await searchArtists(query);
            setSearchResults(results);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch artists.');
        }
        setIsLoading(false);
    }, [query]);

    const handleSelectArtist = async (artist: Artist) => {
        setSelectedArtist(artist);
        setIsAlbumLoading(true);
        setSearchResults([]);
        setQuery(artist.name);
        try {
            const albums = await getArtistAlbums(artist.id);

            // Fetch tracks for all albums, passing full album and artist objects for efficiency
            const trackPromises = albums.map(album => getAlbumTracks(album, artist));
            const tracksData = await Promise.all(trackPromises);
            
            const tracksMap: Record<string, Song[]> = {};
            albums.forEach((album, index) => {
                tracksMap[album.id] = tracksData[index];
            });

            // Set states together after all data is fetched to prevent UI inconsistency
            setArtistAlbums(albums);
            setAlbumTracks(tracksMap);

        } catch (e: any) {
            setError(e.message || 'Failed to fetch albums.');
        }
        setIsAlbumLoading(false);
    };

    const getCollectionStatsForAlbum = (albumId: string) => {
        const tracks = albumTracks[albumId] || [];
        const totalCount = tracks.length;
        const collectedCount = tracks.filter(track => userCollectionIds.has(track.id)).length;
        return { collectedCount, totalCount };
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Discover Artists</h2>

            <div className="max-w-2xl mx-auto">
                <SearchBar 
                    query={query}
                    setQuery={setQuery}
                    onSearch={handleSearch}
                    isLoading={isLoading}
                    placeholder="Search for an artist..."
                />

                {error && <p className="text-red-400 mt-2 text-center">{error}</p>}

                {searchResults.length > 0 && !selectedArtist && (
                    <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-2">
                        {searchResults.map(artist => (
                            <button key={artist.id} onClick={() => handleSelectArtist(artist)} className="w-full text-left flex items-center p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/70 transition-colors">
                                <img src={artist.pictureUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
                                <p className="ml-4 font-semibold">{artist.name}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedArtist && (
                <div className="mt-8">
                    <div className="flex items-center gap-4 mb-6">
                         <img src={selectedArtist.pictureUrl} alt={selectedArtist.name} className="w-20 h-20 rounded-full object-cover" />
                         <div>
                            <p className="text-gray-400 text-sm">Showing albums for</p>
                            <h3 className="text-3xl font-bold">{selectedArtist.name}</h3>
                         </div>
                    </div>

                    {isAlbumLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
                        </div>
                    ) : artistAlbums.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {artistAlbums.map(album => {
                                const { collectedCount, totalCount } = getCollectionStatsForAlbum(album.id);
                                return (
                                    <button key={album.id} onClick={() => setSelectedAlbum(album)} className="w-full text-left transform transition-transform hover:scale-105">
                                        <AlbumCard album={album} collectedCount={collectedCount} totalCount={totalCount} />
                                    </button>
                                );
                           })}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-10">No albums found for this artist.</p>
                    )}
                </div>
            )}
            
            {selectedAlbum && selectedArtist && albumTracks[selectedAlbum.id] && (
                <AlbumDetailModal 
                    album={selectedAlbum}
                    tracks={albumTracks[selectedAlbum.id]}
                    artist={selectedArtist}
                    onClose={() => setSelectedAlbum(null)}
                />
            )}
        </div>
    );
};