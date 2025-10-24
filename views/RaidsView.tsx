import React, { useState, useContext, useMemo, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import { Rarity, type CollectedSong, type LabelRaid } from '../types';
import { SwordsIcon, ClockIcon, FireIcon, ShieldExclamationIcon } from '../components/icons';
import { SongListItem } from '../components/SongListItem';
import { SearchBar } from '../components/SearchBar';

const RAID_COOLDOWN = 4 * 60 * 60 * 1000;

const Countdown: React.FC<{ target: number }> = ({ target }) => {
    const [timeLeft, setTimeLeft] = useState(target - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const left = target - Date.now();
            if (left <= 0) {
                clearInterval(timer);
            }
            setTimeLeft(left);
        }, 1000);
        return () => clearInterval(timer);
    }, [target]);

    if (timeLeft <= 0) return <span>Ready!</span>;

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return <span>{`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</span>;
};

const RaidDeckEditor: React.FC<{ onSave: () => void }> = ({ onSave }) => {
    const { currentUser, currentUserCollection, setRaidDeck } = useContext(UserContext)!;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentUser?.raidDeck || []));
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSong = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else if (newSet.size < 10) {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSaveDeck = async () => {
        await setRaidDeck(Array.from(selectedIds));
        onSave();
    };

    const availableCollection = useMemo(() => {
        return currentUserCollection
            .filter(cs => cs.song.rarity !== Rarity.Jailbroken && (
                cs.song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cs.song.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
            ))
            .sort((a,b) => (b.isPrestige ? 1 : 0) - (a.isPrestige ? 1 : 0) || (b.song.isShiny ? 1 : 0) - (a.song.isShiny ? 1 : 0));
    }, [currentUserCollection, searchQuery]);

    return (
        <div className="p-4 bg-gray-900/80 rounded-lg border border-gray-700">
            <h3 className="text-2xl font-bold mb-4">Edit Raid Deck ({selectedIds.size}/10)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="font-semibold mb-2">Your Collection</p>
                    <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={() => {}} isLoading={false} placeholder="Search your songs..." />
                    <div className="mt-2 space-y-1 max-h-80 overflow-y-auto pr-2">
                        {availableCollection.map(song => (
                             <div key={song.id} className={`p-1 rounded-lg transition-all ${selectedIds.has(song.id) ? 'bg-indigo-500/30' : ''}`}>
                                <SongListItem collectedSong={song} onClick={(s) => toggleSong(s.id)} />
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <p className="font-semibold mb-2">Selected for Deck</p>
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                        {Array.from(selectedIds).map(id => {
                            const song = currentUserCollection.find(cs => cs.id === id);
                            if (!song) return null;
                            // FIX: Correctly use the onClick handler for SongListItem which expects a function that receives a CollectedSong object.
                            return <SongListItem key={id} collectedSong={song} onClick={(s) => toggleSong(s.id)} />
                        })}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex gap-4">
                <button onClick={onSave} className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Cancel</button>
                <button onClick={handleSaveDeck} disabled={selectedIds.size !== 10} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold disabled:bg-gray-500">Save Deck</button>
            </div>
        </div>
    );
};

export const RaidsView: React.FC = () => {
    const { currentUser, labelRaids, attackRaidBoss, setViewingUser, users } = useContext(UserContext)!;
    const [isEditingDeck, setIsEditingDeck] = useState(false);
    const [isAttacking, setIsAttacking] = useState(false);
    const activeRaid = useMemo(() => labelRaids.find(r => r.isActive), [labelRaids]);

    const handleAttack = async () => {
        setIsAttacking(true);
        try {
            await attackRaidBoss();
        } finally {
            setIsAttacking(false);
        }
    };
    
    if (!activeRaid) {
        return <div className="text-center text-gray-400 py-20">The next raid is gathering power. Check back soon!</div>;
    }
    
    if (isEditingDeck) {
        return <RaidDeckEditor onSave={() => setIsEditingDeck(false)} />;
    }

    const hpPercentage = (activeRaid.currentHp / activeRaid.totalHp) * 100;
    const isCooldownActive = !!(currentUser?.raidCooldownUntil && currentUser.raidCooldownUntil > Date.now());

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 md:w-1/3 flex flex-col items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h2 className="text-3xl font-bold text-center mb-4">{activeRaid.bossName}</h2>
                    <img src={activeRaid.bossArtUrl} crossOrigin="anonymous" alt={activeRaid.bossName} className="w-48 h-48 rounded-lg object-cover mb-4" />
                    <p className="text-sm text-gray-400 text-center mb-6">{activeRaid.description}</p>
                    <div className="w-full">
                        <div className="flex justify-between text-sm font-mono mb-1">
                            <span>HP: {Math.round(hpPercentage)}%</span>
                            <span>{activeRaid.currentHp.toLocaleString()} / {activeRaid.totalHp.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-red-900/50 rounded-full h-6 border-2 border-red-500/50">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full" style={{ width: `${hpPercentage}%` }}></div>
                        </div>
                    </div>
                    <div className="mt-6 w-full">
                        <button onClick={handleAttack} disabled={isCooldownActive || isAttacking || !currentUser?.raidDeck || currentUser.raidDeck.length < 10} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-lg flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isAttacking ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <><SwordsIcon className="w-6 h-6" /> Attack</>}
                        </button>
                        {isCooldownActive && (
                            <div className="mt-2 text-center p-2 bg-black/30 rounded-lg">
                                <p className="text-sm text-gray-400">Cooldown</p>
                                <p className="font-mono text-lg text-white"><Countdown target={currentUser.raidCooldownUntil!} /></p>
                            </div>
                        )}
                    </div>
                     <button onClick={() => setIsEditingDeck(true)} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold">Edit Raid Deck</button>
                </div>
                <div className="flex-grow p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h3 className="text-2xl font-bold mb-4">Label Leaderboard</h3>
                    <div className="space-y-2">
                        {activeRaid.leaderboard.map((entry, index) => (
                             <button
                                key={entry.userId}
                                onClick={() => {
                                    const user = users.find(u => u.id === entry.userId);
                                    if(user) setViewingUser(user);
                                }}
                                className="w-full text-left p-3 rounded-lg border border-gray-700 flex items-center gap-4 hover:bg-gray-700/50"
                              >
                                <div className="w-8 text-center font-bold text-lg text-gray-400">#{index+1}</div>
                                <img src={entry.userPfpUrl} crossOrigin="anonymous" alt={entry.userName} className="w-10 h-10 rounded-full object-cover"/>
                                <div className="flex-grow truncate">
                                    <p className="font-semibold">{entry.userName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-red-400">{entry.damageDealt.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Damage</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};