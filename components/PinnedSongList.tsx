import React from 'react';
import type { Song } from '../types';
import { MusicNoteIcon, XCircleIcon } from './icons';

interface PinnedSongListProps {
  pinnedSongs: Song[];
  onCollect: () => void;
  onUnpin: (index: number) => void;
}

const PinnedSongItem: React.FC<{ song: Song, onUnpin: () => void }> = ({ song, onUnpin }) => (
    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-md">
        <img src={song.albumArtUrl} crossOrigin="anonymous" alt={song.album.title} className="w-10 h-10 rounded-sm object-cover" />
        <div className="flex-grow truncate">
            <p className="text-white font-semibold text-sm truncate">{song.title}</p>
            <p className="text-gray-400 text-xs truncate">{song.artist.name}</p>
        </div>
        <button onClick={onUnpin} className="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0" title="Unpin song">
            <XCircleIcon className="w-5 h-5" />
        </button>
    </div>
);


export const PinnedSongList: React.FC<PinnedSongListProps> = ({ pinnedSongs, onCollect, onUnpin }) => {
  if (pinnedSongs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-40 animate-slideUp">
      <h3 className="text-lg font-bold mb-3 text-center">Pinned Songs ({pinnedSongs.length})</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-2">
        {pinnedSongs.map((song, index) => (
          <PinnedSongItem key={`${song.id}-${index}`} song={song} onUnpin={() => onUnpin(index)} />
        ))}
      </div>
      <button
        onClick={onCollect}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-lg"
      >
        <MusicNoteIcon className="w-6 h-6" />
        Collect All
      </button>
    </div>
  );
};