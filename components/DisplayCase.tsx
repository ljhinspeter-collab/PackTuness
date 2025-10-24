import React from 'react';
import type { Vinyl } from '../types';

interface DisplayCaseProps {
    vinyls: Vinyl[];
    onClick: (vinyl: Vinyl) => void;
}

const VinylDisplay: React.FC<{ vinyl: Vinyl, onClick: () => void }> = ({ vinyl, onClick }) => (
    <button onClick={onClick} className="relative w-32 h-32 group">
        <div className="absolute inset-0 bg-black rounded-full transition-transform duration-300 group-hover:scale-105 shadow-lg"></div>
        <img src={vinyl.albumArtUrl} alt={vinyl.albumName} className="absolute inset-2 w-28 h-28 rounded-full object-cover" />
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center z-10 rounded-full">
            <p className="font-bold text-white truncate text-xs leading-tight">{vinyl.albumName}</p>
        </div>
    </button>
);

const EmptySlot: React.FC = () => (
    <div className="w-32 h-32 flex items-center justify-center">
        <div className="w-28 h-28 border-2 border-dashed border-gray-600 rounded-full"></div>
    </div>
);


export const DisplayCase: React.FC<DisplayCaseProps> = ({ vinyls, onClick }) => {
    return (
        <div className="w-full">
            <h3 className="text-center font-bold text-lg mb-4">Showcased Vinyls</h3>
            <div className="relative flex justify-center items-center gap-8 px-4 py-2 bg-black/20 rounded-lg">
                {/* Shelf background */}
                <div className="absolute bottom-10 left-0 right-0 h-2 bg-gray-800 border-y border-gray-600"></div>
                
                {[0, 1, 2].map(i => {
                    const vinyl = vinyls[i];
                    return (
                        <div key={i} className="z-10">
                            {vinyl ? <VinylDisplay vinyl={vinyl} onClick={() => onClick(vinyl)} /> : <EmptySlot />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
