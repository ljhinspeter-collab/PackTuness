import React, { useState, useContext, useCallback } from 'react';
import { Map } from '../components/Map';
import { PinnedSongList } from '../components/PinnedSongList';
import { UserContext } from '../contexts/UserContext';
import { searchSongs } from '../services/musicService';
import type { Song } from '../types';
import { getDailyEventState } from '../services/dailyEventService';

export const MapView: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [foundSong, setFoundSong] = useState<Song | null>(null);
    const [pinnedSongs, setPinnedSongs] = useState<Song[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    const userContext = useContext(UserContext);
    if (!userContext) {
        throw new Error("MapView must be used within a UserProvider");
    }
    const { addSongsToCollection } = userContext;

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 2500);
    };

    const handleScan = useCallback(async () => {
        setIsScanning(true);
        setError(null);
        setFoundSong(null);
        try {
            const results = await searchSongs('');
            if (results.length > 0) {
                // Ensure we don't find a song that's already pinned in this session
                const newSong = results.find(s => !pinnedSongs.some(p => p.id === s.id)) || results[0];
                setFoundSong(newSong);
            } else {
                setError("No songs found in this area. Try again!");
                showNotification("No songs found. The air is quiet.");
            }
        } catch (e: any) {
            setError(e.message || "An error occurred while scanning.");
            showNotification("Error: Could not scan area.");
        }
        setIsScanning(false);
    }, [pinnedSongs]);

    const handlePinSong = useCallback(() => {
        if (foundSong) {
            setPinnedSongs(prev => [...prev, foundSong]);
            setFoundSong(null);
            showNotification(`"${foundSong.title}" pinned!`);
        }
    }, [foundSong]);

    const handleUnpinSong = useCallback((indexToRemove: number) => {
        const songToUnpin = pinnedSongs[indexToRemove];
        if (songToUnpin) {
            setPinnedSongs(prev => prev.filter((_, index) => index !== indexToRemove));
            showNotification(`"${songToUnpin.title}" unpinned.`);
        }
    }, [pinnedSongs]);

    const handleCollect = useCallback(async () => {
        if (pinnedSongs.length > 0) {
            // FIX: addSongsToCollection expects a second argument for the active event.
            const { activeEvent } = getDailyEventState();
            await addSongsToCollection(pinnedSongs, activeEvent);
            showNotification(`Added ${pinnedSongs.length} songs to your collection!`);
            setPinnedSongs([]);
        }
    }, [pinnedSongs, addSongsToCollection]);

    return (
        <div className="relative">
            {notification && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-lg z-50 animate-pulse">
                    {notification}
                </div>
            )}
            <h2 className="text-3xl font-bold mb-4 text-center">Song Map</h2>
            <Map 
                isScanning={isScanning}
                foundSong={foundSong}
                onScan={handleScan}
                onPin={handlePinSong}
            />
            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            <PinnedSongList pinnedSongs={pinnedSongs} onCollect={handleCollect} onUnpin={handleUnpinSong} />
        </div>
    );
};
