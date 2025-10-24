import React, { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { SongBattle, CollectedSong } from '../types';

const DeckDisplay: React.FC<{ songs: CollectedSong[] }> = ({ songs }) => (
    <div className="space-y-1">
        {songs.map(song => (
            <div key={song.id} className="p-1.5 rounded-md bg-gray-700/50 flex items-center gap-2">
                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
                <div className="truncate">
                    <p className="text-xs font-semibold truncate">{song.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                </div>
            </div>
        ))}
    </div>
);


export const BattleReportModal: React.FC<{ battle: SongBattle, onClose: () => void }> = ({ battle, onClose }) => {
    const { currentUser } = useContext(UserContext)!;
    const isWinner = battle.winnerId === currentUser.id;
    const isChallenger = battle.challengerId === currentUser.id;
    
    const myDeck = isChallenger ? battle.challengerDeck : battle.opponentDeck!;
    const opponentDeck = isChallenger ? battle.opponentDeck! : battle.challengerDeck;
    const opponentName = isChallenger ? battle.opponentName : battle.challengerName;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                    <h2 className={`text-3xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {isWinner ? 'VICTORY!' : 'DEFEAT'}
                    </h2>
                    <p className="text-gray-300">Battle against {opponentName}</p>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-lg mb-4">
                    <h4 className="font-semibold text-center text-indigo-300 mb-2">Battle Report</h4>
                    <p className="text-gray-200 text-center italic">
                        {battle.battleReport || "The battle was legendary!"}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-2 text-center">Your Deck</h4>
                        <DeckDisplay songs={myDeck} />
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2 text-center">{opponentName}'s Deck</h4>
                        <DeckDisplay songs={opponentDeck} />
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
};