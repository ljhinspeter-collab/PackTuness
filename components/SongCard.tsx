import React from 'react';
import type { Song } from '../types';
import { PinIcon } from './icons';

interface SongCardProps {
  song: Song;
  onPin: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onPin }) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-lg p-4 border border-gray-700 shadow-lg flex flex-col items-center text-center w-64 animate-fadeIn">
      <img src={song.albumArtUrl} crossOrigin="anonymous" alt={song.album.title} className="w-48 h-48 rounded-md object-cover mb-4 shadow-md" />
      <div className="w-full">
        <p className="font-bold text-lg text-white truncate">{song.title}</p>
        <p className="text-sm text-gray-400 truncate">{song.artist.name}</p>
      </div>
      <button
        onClick={onPin}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors"
      >
        <PinIcon className="w-5 h-5" />
        Pin Song
      </button>
    </div>
  );
};