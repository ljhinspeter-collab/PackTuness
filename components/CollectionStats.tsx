import React, { useMemo } from 'react';
import type { User, CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';

interface StatCardProps {
  title: string;
  value: string | number;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, children }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center h-full">
    <p className="text-sm text-gray-400 font-medium">{title}</p>
    {children ? (
        <div className="mt-2 w-full">{children}</div>
    ) : (
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    )}
  </div>
);

const RarestSongCard: React.FC<{ song: CollectedSong }> = ({ song }) => {
    const rarityStyles = getRarityStyles(song.song.rarity);
    return (
        <div className={`p-2 rounded-lg ${rarityStyles.bgColor} border ${rarityStyles.borderColor} w-full`}>
            <img src={song.song.albumArtUrl} crossOrigin="anonymous" alt={song.song.album.title} className="w-full aspect-square object-cover rounded-md mb-2"/>
            <p className="font-semibold text-white text-sm truncate">{song.song.title}</p>
            <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
        </div>
    )
};

export const CollectionStats: React.FC<{ user: User; collection: CollectedSong[] }> = ({ user, collection }) => {

  const stats = useMemo(() => {
    if (collection.length === 0) return null;

    // Total songs
    const totalSongs = collection.length;

    // Unique artists
    const uniqueArtists = new Set(collection.map(c => c.song.artist.name)).size;
    
    // Shiny songs
    const shinyCount = collection.filter(c => c.song.isShiny).length;

    // Rarity breakdown
    const rarityOrder = [Rarity.Mythic, Rarity.Rare, Rarity.Uncommon, Rarity.Common];
    const rarityCounts = collection.reduce((acc, c) => {
      acc[c.song.rarity] = (acc[c.song.rarity] || 0) + 1;
      return acc;
    }, {} as Record<Rarity, number>);

    // Most common artist
    const artistCounts = collection.reduce((acc, c) => {
        acc[c.song.artist.name] = (acc[c.song.artist.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const mostCommonArtist = Object.entries(artistCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Rarest song
    const getRarityValue = (rarity: Rarity) => rarityOrder.indexOf(rarity);
    const rarestSong = [...collection].sort((a, b) => {
        const prestigeDiff = (b.isPrestige ? 1: 0) - (a.isPrestige ? 1 : 0);
        if (prestigeDiff !== 0) return prestigeDiff;
        const rarityDiff = getRarityValue(a.song.rarity) - getRarityValue(b.song.rarity);
        if (rarityDiff !== 0) return rarityDiff;
        return (b.song.isShiny ? 1 : 0) - (a.song.isShiny ? 1 : 0);
    })[0];


    return {
      totalSongs,
      uniqueArtists,
      shinyCount,
      rarityCounts,
      mostCommonArtist,
      rarestSong,
      rarityOrder
    };

  }, [collection]);

  if (!stats) {
    return (
        <div className="text-center text-gray-400 py-16">
            <p className="text-lg">No stats to show yet.</p>
            <p className="mt-1">Start collecting songs to see your statistics!</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <StatCard title="Total Songs" value={stats.totalSongs} />
      <StatCard title="Unique Artists" value={stats.uniqueArtists} />
      <StatCard title="Shiny Songs" value={stats.shinyCount} />
      <StatCard title="Most Common Artist" value={stats.mostCommonArtist} />
      
      <div className="col-span-2 md:col-span-3 lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-400 font-medium text-center mb-3">Rarity Breakdown</p>
        <div className="space-y-2">
            {stats.rarityOrder.map(rarity => {
                const count = stats.rarityCounts[rarity] || 0;
                const rarityStyles = getRarityStyles(rarity);
                const percentage = (count / stats.totalSongs) * 100;

                return (
                    <div key={rarity} className="flex items-center gap-3">
                        <span className={`w-24 text-sm font-semibold ${rarityStyles.textColor}`}>{rarity}</span>
                        <div className="flex-grow bg-gray-700 rounded-full h-5">
                            <div className={`${rarityStyles.bgColor} h-5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="w-10 text-right font-bold text-white">{count}</span>
                    </div>
                )
            })}
        </div>
      </div>

      <div className="col-span-2 md:col-span-1 lg:col-span-2">
        <StatCard title="Rarest Find" value={0}>
          <RarestSongCard song={stats.rarestSong} />
        </StatCard>
      </div>

    </div>
  );
};