



import React, { useState, useCallback, useContext } from 'react';
import type { Artist } from '../types';
import { searchArtists } from '../services/musicService';
import { SearchBar } from '../components/SearchBar';
import { StarIcon } from '../components/icons';
import { UserContext } from '../contexts/UserContext';

export const FavoritesView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const userContext = useContext(UserContext);
  if (!userContext) throw new Error("FavoritesView must be used within a UserProvider");
  const { currentUser, setFavoriteArtists } = userContext;
  const favoriteArtists = currentUser!.favoriteArtists;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchArtists(query);
      setSearchResults(results);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch artists.');
    }
    setIsLoading(false);
  }, [query]);

  const addFavorite = (artist: Artist) => {
    if (!favoriteArtists.some(fav => fav.id === artist.id)) {
      setFavoriteArtists([...favoriteArtists, artist]);
    }
  };

  const removeFavorite = (artistId: string) => {
    setFavoriteArtists(favoriteArtists.filter(fav => fav.id !== artistId));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-center">Favorite Artists</h2>
      
      <div className="max-w-2xl mx-auto">
        {/* Search Section */}
        <div className="mb-8">
            <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} isLoading={isLoading} placeholder="Search for artists..." />
            {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
            
            {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {searchResults.map(artist => (
                        <div key={artist.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3">
                                {artist.pictureUrl ? (
                                    <img src={artist.pictureUrl} alt={artist.name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                                        {artist.name.charAt(0)}
                                    </div>
                                )}
                                <p className="font-semibold">{artist.name}</p>
                            </div>
                            <button 
                                onClick={() => addFavorite(artist)}
                                disabled={favoriteArtists.some(fav => fav.id === artist.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Favorites List Section */}
        <div>
            <h3 className="text-xl font-semibold mb-4 text-white">Your Favorites</h3>
            {favoriteArtists.length === 0 ? (
                <div className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-700 rounded-lg">
                    <p>You haven't added any favorite artists yet.</p>
                    <p className="text-sm mt-1">Use the search bar above to find and add them!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {favoriteArtists.map(artist => (
                         <div key={artist.id} className="flex items-center justify-between p-3 bg-indigo-900/50 rounded-lg border border-indigo-700">
                             <div className="flex items-center gap-3">
                                {artist.pictureUrl ? (
                                    <img src={artist.pictureUrl} alt={artist.name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                                        {artist.name.charAt(0)}
                                    </div>
                                )}
                                <p className="font-semibold text-indigo-300">{artist.name}</p>
                             </div>
                            <button 
                                onClick={() => removeFavorite(artist.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-md transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
             <div className="mt-6 text-center text-sm text-gray-400 p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center gap-2">
                <StarIcon className="w-5 h-5 text-yellow-400" />
                <span>Adding favorites gives you a chance of finding one in a pack, boosted during special events!</span>
            </div>
        </div>
      </div>
    </div>
  );
};
