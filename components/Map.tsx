import React from 'react';
import type { Song } from '../types';
import { SearchIcon } from './icons';
import { SongCard } from './SongCard';

interface MapProps {
    isScanning: boolean;
    foundSong: Song | null;
    onScan: () => void;
    onPin: () => void;
}

const MapLocation: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="absolute w-2 h-2 bg-indigo-400/50 rounded-full animate-pulse" style={style}></div>
);

export const Map: React.FC<MapProps> = ({ isScanning, foundSong, onScan, onPin }) => {
    const locations = React.useMemo(() => Array.from({ length: 20 }).map(() => ({
        top: `${Math.random() * 90 + 5}%`,
        left: `${Math.random() * 90 + 5}%`,
        animationDelay: `${Math.random() * 2}s`
    })), []);

    return (
        <div className="relative w-full h-[calc(100vh-280px)] bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden flex items-center justify-center p-4">
            {/* Map Background Deco */}
            <div className="absolute inset-0 bg-grid-gray-700/20 [background-size:30px_30px]"></div>
            {locations.map((loc, i) => <MapLocation key={i} style={loc} />)}


            {/* Content Overlay */}
            <div className="z-10 flex flex-col items-center">
                {foundSong ? (
                    <SongCard song={foundSong} onPin={onPin} />
                ) : (
                    <>
                        <p className="text-gray-300 mb-4 text-center max-w-xs">Scan the area to discover new music hidden around you.</p>
                        <button 
                            onClick={onScan}
                            disabled={isScanning}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-lg transition-all duration-300 shadow-lg hover:shadow-indigo-500/50 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100"
                        >
                            {isScanning ? (
                                <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    <span>Scanning...</span>
                                </>
                            ) : (
                                <>
                                    <SearchIcon className="w-6 h-6" />
                                    <span>Scan Area</span>
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
