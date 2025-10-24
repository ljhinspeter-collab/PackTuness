
import React, { useMemo, useState, useContext } from 'react';
import type { User, ArtistMastery, Artist } from '../types';
import { MASTERY_LEVELS, UserContext } from '../contexts/UserContext';
import { CrownIcon } from '../components/icons';
import { ArtistDetailModal } from '../components/ArtistDetailModal';

const MasteryProgressBar: React.FC<{ mastery: ArtistMastery, onClick: () => void }> = ({ mastery, onClick }) => {
    const { progressPercent, xpNeededText, levelName } = useMemo(() => {
        const currentLevelIndex = mastery.level; // e.g., level 1 is index 1

        if (currentLevelIndex >= MASTERY_LEVELS.length) {
            // Max level reached
            const maxLevel = MASTERY_LEVELS[MASTERY_LEVELS.length - 1];
            return { progressPercent: 100, xpNeededText: 'MAX', levelName: maxLevel.name };
        }

        const startXP = currentLevelIndex === 0 ? 0 : MASTERY_LEVELS[currentLevelIndex - 1].xpThreshold;
        const endXP = MASTERY_LEVELS[currentLevelIndex].xpThreshold;
        const levelName = currentLevelIndex === 0 ? 'Beginner' : MASTERY_LEVELS[currentLevelIndex - 1].name;
        
        const xpInLevel = mastery.xp - startXP;
        const xpForLevel = endXP - startXP;
        
        const percentage = xpForLevel > 0 ? Math.max(0, Math.min((xpInLevel / xpForLevel) * 100, 100)) : 0;
        
        return { 
            progressPercent: percentage, 
            xpNeededText: String(endXP),
            levelName: levelName
        };
    }, [mastery]);

    return (
        <button onClick={onClick} className="w-full text-left bg-gray-800 p-4 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-4">
                {mastery.artistPictureUrl ? (
                    <img src={mastery.artistPictureUrl} alt={mastery.artistName} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white flex-shrink-0 text-xl">
                        {mastery.artistName.charAt(0)}
                    </div>
                )}
                <div className="flex-grow">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-lg">{mastery.artistName}</h4>
                         <span className="text-sm font-semibold text-indigo-400">Level {mastery.level} - {levelName}</span>
                    </div>
                    <div className="relative w-full bg-gray-700 rounded-full h-4 mt-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                            {mastery.xp} / {xpNeededText} XP ({Math.floor(progressPercent)}%)
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export const ArtistMasteryView: React.FC = () => {
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [selectedArtistMastery, setSelectedArtistMastery] = useState<(ArtistMastery & { artistId: string }) | null>(null);
    const { currentUser } = useContext(UserContext)!;

    const sortedMastery = useMemo(() => {
        if (!currentUser) return [];
        
        const favoriteArtistsMap: Map<string, Artist> = new Map(currentUser.favoriteArtists.map(a => [a.id, a]));
        let masteryEntries = Object.entries(currentUser.artistMastery);

        if (showFavoritesOnly) {
            masteryEntries = masteryEntries.filter(([artistId, _]) => favoriteArtistsMap.has(artistId));
        }

        return masteryEntries
            .filter((entry): entry is [string, ArtistMastery] => !!entry[1] && typeof entry[1] === 'object')
            .map(([artistId, masteryData]) => {
                const favoriteArtist = favoriteArtistsMap.get(artistId);
                return {
                    ...masteryData,
                    artistPictureUrl: masteryData.artistPictureUrl || favoriteArtist?.pictureUrl,
                    artistId
                }
            })
            .sort((a, b) => {
                if (b.level !== a.level) {
                    return b.level - a.level;
                }
                return b.xp - a.xp;
            });

    }, [currentUser, showFavoritesOnly]);

    if (!currentUser || Object.keys(currentUser.artistMastery).length === 0) {
        return (
             <div className="text-center text-gray-400 py-16">
                <p className="text-lg">No artist mastery progress yet.</p>
                <p className="mt-1">Collect more songs by an artist to increase your mastery level!</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="text-center mb-6">
                <CrownIcon className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold">Artist Mastery</h3>
                <p className="text-gray-400">Level up your favorite artists by collecting their songs.</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6 p-1 bg-gray-700 rounded-full text-white w-max mx-auto">
                <button 
                    onClick={() => setShowFavoritesOnly(false)} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${!showFavoritesOnly ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    All Artists
                </button>
                <button 
                    onClick={() => setShowFavoritesOnly(true)} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${showFavoritesOnly ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    Favorites Only
                </button>
            </div>

            {sortedMastery.length > 0 ? (
                 <div className="max-w-3xl mx-auto space-y-4">
                    {sortedMastery.map(mastery => (
                        <MasteryProgressBar 
                            key={mastery.artistId} 
                            mastery={mastery} 
                            onClick={() => setSelectedArtistMastery(mastery)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 py-10">
                    <p>No artists match the selected filter.</p>
                </div>
            )}

            {selectedArtistMastery && (
                <ArtistDetailModal 
                    mastery={selectedArtistMastery}
                    user={currentUser}
                    onClose={() => setSelectedArtistMastery(null)}
                />
            )}
        </div>
    );
};
