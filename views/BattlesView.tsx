import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { CollectedSong, SongBattle, User } from '../types';
import { Rarity } from '../types';
import { ChallengeUserModal } from '../components/ChallengeUserModal';
import { AcceptBattleModal } from '../components/AcceptBattleModal';
import { BattleReportModal } from '../components/BattleReportModal';

const getSongPrestige = (song: CollectedSong): number => {
    const rarityPoints = { [Rarity.Common]: 1, [Rarity.Uncommon]: 2, [Rarity.Rare]: 5, [Rarity.Mythic]: 20 };
    let points = rarityPoints[song.song.rarity] || 0;
    if (song.song.isShiny) points *= 2;
    if (song.isPrestige) points *= 3;
    if (song.song.rarity === Rarity.Jailbroken) points = 500; // Jailbroken are very valuable
    return points;
};

const ChallengeCard: React.FC<{
    battle: SongBattle;
    onAccept: () => void;
    onDecline: () => void;
    onViewProfile: () => void;
}> = ({ battle, onAccept, onDecline, onViewProfile }) => {
    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center gap-4">
            <button onClick={onViewProfile} className="flex items-center gap-3 flex-shrink-0 text-left">
                <img src={battle.challengerPfpUrl} alt={battle.challengerName} className="w-12 h-12 rounded-full object-cover"/>
                <p className="font-semibold text-lg">{battle.challengerName}</p>
            </button>
            <p className="flex-grow text-center sm:text-left text-gray-300">has challenged you to a Song Battle!</p>
            <div className="flex gap-2 flex-shrink-0">
                <button onClick={onDecline} className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-md font-semibold">Decline</button>
                <button onClick={onAccept} className="px-4 py-2 bg-green-600/80 hover:bg-green-600 rounded-md font-semibold">Accept</button>
            </div>
        </div>
    );
};

const CompletedBattleCard: React.FC<{
    battle: SongBattle;
    currentUserId: string;
    onView: () => void;
    onViewOpponent: () => void;
}> = ({ battle, currentUserId, onView, onViewOpponent }) => {
    const isWinner = battle.winnerId === currentUserId;
    const opponentName = battle.challengerId === currentUserId ? battle.opponentName : battle.challengerName;
    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex items-center gap-4">
            <span className={`text-xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>{isWinner ? 'VICTORY' : 'DEFEAT'}</span>
            <div className="flex-grow">
                 <p className="text-gray-300">vs. <button onClick={onViewOpponent} className="font-semibold text-white hover:underline">{opponentName}</button></p>
                <p className="text-xs text-gray-500">{new Date(battle.completedAt!).toLocaleString()}</p>
            </div>
            <button onClick={onView} className="text-sm text-indigo-400 font-semibold hover:underline">View Report</button>
        </div>
    );
};


export const BattlesView: React.FC = () => {
    const { currentUser, users, songBattles, declineBattle, setViewingUser } = useContext(UserContext)!;
    const [showChallengeModal, setShowChallengeModal] = useState<User | null>(null);
    const [acceptingBattle, setAcceptingBattle] = useState<SongBattle | null>(null);
    const [viewingReport, setViewingReport] = useState<SongBattle | null>(null);

    const friends = useMemo(() => {
        const friendIds = new Set(currentUser!.friendIds);
        return users.filter(user => friendIds.has(user.id));
    }, [currentUser, users]);

    const { incoming, outgoing, completed } = useMemo(() => {
        const incoming: SongBattle[] = [];
        const outgoing: SongBattle[] = [];
        const completed: SongBattle[] = [];

        songBattles.forEach(battle => {
            if (battle.status === 'pending') {
                if (battle.opponentId === currentUser!.id) {
                    incoming.push(battle);
                } else if (battle.challengerId === currentUser!.id) {
                    outgoing.push(battle);
                }
            } else if (battle.status === 'complete') {
                 if (battle.opponentId === currentUser!.id || battle.challengerId === currentUser!.id) {
                    completed.push(battle);
                }
            }
        });
        
        completed.sort((a,b) => b.completedAt! - a.completedAt!);
        return { incoming, outgoing, completed };

    }, [songBattles, currentUser]);

    const handleViewProfile = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) setViewingUser(user);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-center">Song Battles</h2>

            <section>
                <h3 className="text-xl font-bold mb-4">Incoming Challenges ({incoming.length})</h3>
                {incoming.length > 0 ? (
                    <div className="space-y-3">
                        {incoming.map(battle => (
                            <ChallengeCard 
                                key={battle.id}
                                battle={battle}
                                onAccept={() => setAcceptingBattle(battle)}
                                onDecline={() => declineBattle(battle.id)}
                                onViewProfile={() => handleViewProfile(battle.challengerId)}
                            />
                        ))}
                    </div>
                ) : <p className="text-gray-500 text-center py-4">No one has challenged you... yet.</p>}
            </section>
            
            <section>
                 <h3 className="text-xl font-bold mb-4">Challenge a Friend</h3>
                 {friends.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {friends.map(friend => (
                            <button key={friend.id} onClick={() => setShowChallengeModal(friend)} className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex flex-col items-center gap-2 hover:bg-gray-700/70 transition-colors">
                                <img src={friend.pfpUrl} alt={friend.name} className="w-16 h-16 rounded-full object-cover"/>
                                <p className="font-semibold text-sm">{friend.name}</p>
                            </button>
                        ))}
                    </div>
                 ) : <p className="text-gray-500 text-center py-4">Add some friends to challenge them!</p>}
            </section>

             <section>
                <h3 className="text-xl font-bold mb-4">Pending Challenges ({outgoing.length})</h3>
                {outgoing.length > 0 ? (
                    <div className="space-y-2">
                       {outgoing.map(battle => (
                           <div key={battle.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex items-center gap-3">
                                <p className="text-gray-400">Challenge sent to <button onClick={() => handleViewProfile(battle.opponentId)} className="font-semibold text-gray-200 hover:underline">{battle.opponentName}</button>. Waiting for response...</p>
                           </div>
                       ))}
                    </div>
                ) : <p className="text-gray-500 text-center py-4">You haven't issued any challenges.</p>}
            </section>

             <section>
                <h3 className="text-xl font-bold mb-4">Battle History</h3>
                {completed.length > 0 ? (
                    <div className="space-y-3">
                       {completed.map(battle => {
                           const opponentId = battle.challengerId === currentUser!.id ? battle.opponentId : battle.challengerId;
                           return (
                               <CompletedBattleCard 
                                key={battle.id} 
                                battle={battle} 
                                currentUserId={currentUser!.id}
                                onView={() => setViewingReport(battle)}
                                onViewOpponent={() => handleViewProfile(opponentId)}
                                />
                           )
                       })}
                    </div>
                ) : <p className="text-gray-500 text-center py-4">No battles completed yet.</p>}
            </section>

            {showChallengeModal && <ChallengeUserModal opponent={showChallengeModal} onClose={() => setShowChallengeModal(null)} />}
            {acceptingBattle && <AcceptBattleModal battle={acceptingBattle} onClose={() => setAcceptingBattle(null)} />}
            {viewingReport && <BattleReportModal battle={viewingReport} onClose={() => setViewingReport(null)} />}

        </div>
    );
};