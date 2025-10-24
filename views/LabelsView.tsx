import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { RecordLabel, User, CollectedSong, JoinRequest, Chat, Message, LabelChatMessage, ChallengeLevel, ArtistMastery, Trophy } from '../types';
import { Rarity } from '../types';
import { BuildingLibraryIcon, UsersIcon, TrophyIcon, PencilIcon, LockClosedIcon, CheckIcon, XMarkIcon, PaperAirplaneIcon, DiamondIcon, StarIcon, RectangleStackIcon, FaceSmileIcon, SparklesIcon, VinylIcon, SwordsIcon } from '../components/icons';
import { FriendsView } from './FriendsView';
import { EventsView } from './EventsView';
import { BattlesView } from './BattlesView';
import { dataService } from './../services/dataService';
import { getRarityStyles } from '../utils/rarity';
import { SongListItem } from '../components/SongListItem';
import { SearchBar } from '../components/SearchBar';
import { RarityFilter } from '../components/RarityFilter';
import { SongPreviewModal } from '../components/SongPreviewModal';
import { BadgeIcon } from '../components/Badge';
import { ArtistBadgeIcon } from '../components/ArtistBadgeIcon';
import { challenges } from '../services/challengeService';
import { RaidsView } from './RaidsView';


const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- START: UserProfileModal ---
const ShowcaseSongItem: React.FC<{ title: string; item: CollectedSong | undefined; onClick: () => void }> = ({ title, item, onClick }) => {
    if (!item) {
        return (
            <div className="flex flex-col items-center gap-1 w-24">
                <div className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center p-1">
                    <p className="text-gray-500 text-xs text-center">Empty</p>
                </div>
                <p className="text-xs font-semibold text-gray-400">{title}</p>
            </div>
        )
    }
    const { song, isPrestige } = item;
    const rarityStyles = getRarityStyles(song.rarity);
    let bgClasses = 'bg-gray-800';
    if(song.rarity === Rarity.Jailbroken) bgClasses = 'jailbroken-glow jailbroken-border';
    else if(isPrestige) bgClasses = 'prestige-glow prestige-border';
    else if (song.isShiny) bgClasses = 'shiny-glow bg-gradient-to-br from-cyan-800';
    else if (song.rarity === Rarity.Mythic) bgClasses = 'mythic-glow mythic-border';

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1 w-24">
            <div className={`relative w-20 h-20 rounded-md overflow-hidden group ${bgClasses}`}>
                <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                {!isPrestige && <div className={`absolute inset-x-0 bottom-0 h-0.5 ${rarityStyles.borderColor.replace('border-', 'bg-')}`}></div>}
                 <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1 text-left z-10">
                    <p className="font-bold text-white truncate text-[10px] leading-tight">{song.title}</p>
                </div>
            </div>
            <p className="text-xs font-semibold text-gray-400">{title}</p>
        </button>
    );
};

export const UserProfileModal: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const { getOrCreateChat, viewingUserShowcaseSongs } = useContext(UserContext)!;
    const [selectedSong, setSelectedSong] = useState<CollectedSong | null>(null);

    const handleSendMessage = () => {
        getOrCreateChat(user);
        onClose();
    };
    
    const allBadgesMap = useMemo(() => {
        const map = new Map<string, ChallengeLevel>();
        challenges.forEach(challenge => {
            challenge.levels.forEach(level => {
                map.set(level.badge.name, level);
            });
        });
        return map;
      }, []);
      
    const displayedChallengeBadges = useMemo(() => {
      const earnedBadgeDetails = user.earnedBadges
          .map(b => allBadgesMap.get(b.name))
          .filter((level): level is ChallengeLevel => !!level && level.challengeId !== 'artist-mastery');

      const groupedByChallenge: Record<string, ChallengeLevel[]> = {};
      earnedBadgeDetails.forEach(level => {
          if (!groupedByChallenge[level.challengeId]) {
              groupedByChallenge[level.challengeId] = [];
          }
          groupedByChallenge[level.challengeId].push(level);
      });

      return Object.values(groupedByChallenge)
          .map(group => group.sort((a, b) => b.level - a.level)[0])
          .sort((a,b) => a.challengeId.localeCompare(b.challengeId));
    }, [user.earnedBadges, allBadgesMap]);

    const displayedArtistBadges = useMemo(() => {
        if (!user.displayedArtistBadges) return [];
        return user.displayedArtistBadges
            .map(artistId => user.artistMastery[artistId])
            .filter((mastery): mastery is ArtistMastery => !!mastery);
    }, [user.displayedArtistBadges, user.artistMastery]);
    
    const showcasedVinyls = useMemo(() => {
        const vinylMap = new Map(user.vinyls.map(v => [v.albumId, v]));
        return user.showcase?.proudestVinylIds?.map(id => vinylMap.get(id)).filter(Boolean) || [];
    }, [user.vinyls, user.showcase]);

    return (
    <>
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex flex-col items-center text-center">
                        <img src={user.pfpUrl} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-600 mb-3" />
                        <h3 className="text-2xl font-bold">{user.name}</h3>
                        <p className="text-gray-400 mt-1 text-sm max-w-md">{user.bio}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700 flex justify-center gap-4">
                        <ShowcaseSongItem title="Favorite" item={viewingUserShowcaseSongs?.favoriteSong} onClick={() => viewingUserShowcaseSongs?.favoriteSong && setSelectedSong(viewingUserShowcaseSongs.favoriteSong)} />
                        <ShowcaseSongItem title="Rarest Gem" item={viewingUserShowcaseSongs?.rarestSong} onClick={() => viewingUserShowcaseSongs?.rarestSong && setSelectedSong(viewingUserShowcaseSongs.rarestSong)} />
                    </div>

                     <div className="mt-6 pt-4 border-t border-gray-700">
                        <h4 className="text-center font-semibold text-gray-300 mb-3">Showcased Vinyls</h4>
                        <div className="flex justify-center gap-3">
                             {[0, 1, 2].map(i => {
                                const vinyl = showcasedVinyls[i];
                                return (
                                    <div key={i} className="w-20 h-20">
                                        {vinyl ? (
                                            <div className="group w-full h-full relative">
                                                <div className="absolute inset-0 bg-black rounded-full"></div>
                                                <img src={vinyl.albumArtUrl} alt={vinyl.albumName} className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] rounded-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                     </div>

                     <div className="mt-6 pt-4 border-t border-gray-700">
                        <h4 className="text-center font-semibold text-gray-300 mb-3">Displayed Badges</h4>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {displayedChallengeBadges.map(level => (
                                <BadgeIcon key={level.badge.name} badge={level.badge} level={level.level} size="sm" />
                            ))}
                            {displayedArtistBadges.map(mastery => (
                                <ArtistBadgeIcon key={mastery.artistName} artist={mastery} size="sm" />
                            ))}
                        </div>
                     </div>
                </div>
                
                 <div className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700 mt-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSendMessage} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold flex items-center justify-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5"/>
                        </button>
                         <button onClick={onClose} className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
                    </div>
                </div>
            </div>
        </div>
        {selectedSong && (
            <SongPreviewModal
                key={selectedSong.id}
                collectedSong={selectedSong}
                onClose={() => setSelectedSong(null)}
                showTradeButton={false}
            />
        )}
    </>
    );
};
// --- END: UserProfileModal ---

// --- START: MessagesView Component ---
const MessagesView: React.FC = () => {
    const { chats, currentUser, setActiveChatId } = useContext(UserContext)!;

    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
    }, [chats]);

    const getOtherParticipant = (chat: Chat) => {
        const otherId = chat.participantIds.find(id => id !== currentUser!.id)!;
        return chat.participantInfo[otherId];
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-center">Your Conversations</h3>
            {sortedChats.length > 0 ? (
                <div className="space-y-3">
                    {sortedChats.map(chat => {
                        const otherUser = getOtherParticipant(chat);
                        return (
                            <button key={chat.id} onClick={() => setActiveChatId(chat.id)} className="w-full text-left p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center gap-4 hover:bg-gray-700/50 transition-colors">
                                <img src={otherUser.pfpUrl} alt={otherUser.name} className="w-12 h-12 rounded-full object-cover"/>
                                <div className="flex-grow truncate">
                                    <p className="font-semibold">{otherUser.name}</p>
                                    <p className="text-sm text-gray-400 truncate">{chat.lastMessage?.text || 'No messages yet'}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="font-semibold">No conversations started.</p>
                    <p className="text-sm mt-1">Click on a user's profile to send them a message.</p>
                </div>
            )}
        </div>
    );
};
// --- END: MessagesView Component ---

// --- START: ChatModal Component ---
export const ChatModal: React.FC<{ chat: Chat, onClose: () => void }> = ({ chat, onClose }) => {
    const { currentUser, activeChatMessages, sendMessage } = useContext(UserContext)!;
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const otherParticipant = chat.participantInfo[chat.participantIds.find(id => id !== currentUser!.id)!];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatMessages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(chat.id, newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-lg bg-gray-800 rounded-lg flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 bg-gray-900/50 border-b border-gray-700 flex items-center gap-3">
                    <img src={otherParticipant.pfpUrl} alt={otherParticipant.name} className="w-10 h-10 rounded-full"/>
                    <h3 className="font-bold text-lg">{otherParticipant.name}</h3>
                </header>
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {activeChatMessages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === currentUser!.id ? 'justify-end' : 'justify-start'}`}>
                            {msg.senderId !== currentUser!.id && <img src={otherParticipant.pfpUrl} className="w-6 h-6 rounded-full self-start"/>}
                            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${msg.senderId === currentUser!.id ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <footer className="flex-shrink-0 p-4 border-t border-gray-700">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <button type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white">
                            <PaperAirplaneIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};
// --- END: ChatModal Component ---

// --- START: LabelChatView Component ---
const ReactionPicker: React.FC<{ onSelect: (emoji: string) => void }> = ({ onSelect }) => {
    const reactions = ['🔥', '☠️', '😹', '😭', '✅', '❌'];
    return (
        <div onClick={(e) => e.stopPropagation()} className="absolute top-full mt-1 z-10 bg-gray-900 border border-gray-700 rounded-full p-1 flex gap-1 shadow-lg">
            {reactions.map(emoji => (
                <button key={emoji} onClick={() => onSelect(emoji)} className="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-xl">
                    {emoji}
                </button>
            ))}
        </div>
    );
};

const ChatMessage: React.FC<{ message: LabelChatMessage }> = ({ message }) => {
    const { currentUser, toggleLabelMessageReaction } = useContext(UserContext)!;
    const [showPicker, setShowPicker] = useState(false);
    const isCurrentUser = message.senderId === currentUser!.id;

    const handleReaction = (emoji: string) => {
        toggleLabelMessageReaction(message.id, emoji);
        setShowPicker(false);
    };

    return (
        <div className={`group flex items-start gap-3 ${isCurrentUser ? 'justify-end' : ''}`}>
            {!isCurrentUser && <img src={message.senderPfpUrl} alt={message.senderName} className="w-8 h-8 rounded-full mt-2"/>}
            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                {!isCurrentUser && <p className="text-xs text-gray-400 mb-0.5 ml-2">{message.senderName}</p>}
                <div className={`relative flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                     <div className={`max-w-xs md:max-w-md p-2.5 rounded-lg ${isCurrentUser ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowPicker(prev => !prev)} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FaceSmileIcon className="w-5 h-5"/>
                        </button>
                        {showPicker && <ReactionPicker onSelect={handleReaction}/>}
                    </div>
                </div>
                 {Object.keys(message.reactions || {}).length > 0 && (
                    <div className={`flex gap-1 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {/* FIX: Explicitly type `userIds` as string[] to resolve TypeScript inference issue where it was treated as 'unknown'. */}
                        {Object.entries(message.reactions || {}).map(([emoji, userIds]: [string, string[]]) => (
                            <button key={emoji} onClick={() => handleReaction(emoji)} className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${(userIds ?? []).includes(currentUser!.id) ? 'bg-indigo-500/50 border border-indigo-500' : 'bg-gray-700/80 border border-transparent hover:border-gray-600'}`}>
                                <span>{emoji}</span>
                                <span className="font-semibold">{(userIds ?? []).length}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const LabelChatView: React.FC = () => {
    const { currentUser, activeLabelChatMessages, sendLabelChatMessage, recordLabels } = useContext(UserContext)!;
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeLabelChatMessages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendLabelChatMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[65vh] bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                 {activeLabelChatMessages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                 <div ref={messagesEndRef} />
            </div>
             <footer className="flex-shrink-0 p-4 border-t border-gray-700">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message #${currentUser?.labelId ? recordLabels.find(l=>l.id === currentUser.labelId)?.name : 'general'}`}
                        className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <button type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white">
                        <PaperAirplaneIcon className="w-5 h-5"/>
                    </button>
                </form>
            </footer>
        </div>
    );
};
// --- END: LabelChatView Component ---


const LabelModal: React.FC<{
    onClose: () => void;
    existingLabel?: RecordLabel;
}> = ({ onClose, existingLabel }) => {
    const { createLabel, updateLabelDetails } = useContext(UserContext)!;
    const [name, setName] = useState(existingLabel?.name || '');
    const [description, setDescription] = useState(existingLabel?.description || '');
    const [pfp, setPfp] = useState<string>(existingLabel?.pfpUrl || '');
    const [joinType, setJoinType] = useState<'open' | 'request'>(existingLabel?.joinType || 'open');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setPfp(base64);
        }
    };

    const handleSave = () => {
        if (!name.trim()) return;
        if (existingLabel) {
            updateLabelDetails(existingLabel.id, { name, description, pfpUrl: pfp, joinType });
        } else {
            createLabel(name, description, pfp || `https://i.pravatar.cc/150?u=${Date.now()}`, joinType);
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">{existingLabel ? 'Edit Label' : 'Create Record Label'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Label Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" rows={2}></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Logo</label>
                         <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                         {pfp && <img src={pfp} alt="Logo Preview" className="mt-2 w-24 h-24 rounded-lg object-cover" />}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Join Type</label>
                        <div className="flex items-center justify-center gap-2 p-1 bg-gray-700 rounded-full text-white w-full">
                            <button 
                                onClick={() => setJoinType('open')} 
                                className={`w-1/2 px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${joinType === 'open' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                            >
                                Open
                            </button>
                            <button 
                                onClick={() => setJoinType('request')} 
                                className={`w-1/2 px-4 py-1.5 rounded-full transition-colors text-sm font-semibold flex items-center justify-center gap-1.5 ${joinType === 'request' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                            >
                                <LockClosedIcon className="w-4 h-4" /> Request
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md">Save</button>
                </div>
            </div>
        </div>
    );
};


const MyLabelView: React.FC<{ label: RecordLabel }> = ({ label }) => {
    const { currentUser, leaveLabel, reviewJoinRequest, setViewingUser } = useContext(UserContext)!;
    const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'wars' | 'raids' | 'accolades' | 'requests'>('chat');
    const [isEditing, setIsEditing] = useState(false);
    const [members, setMembers] = useState<User[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);

    const isOwner = currentUser!.id === label.ownerId;
    
    useEffect(() => {
        setIsLoadingMembers(true);
        dataService.getUsersByIds(label.memberIds ?? []).then(memberProfiles => {
            setMembers(memberProfiles);
            setIsLoadingMembers(false);
        });
    }, [label.memberIds]);


    const pendingRequests = useMemo(() => {
        return (label.pendingRequests || []).sort((a, b) => a.requestedAt - b.requestedAt);
    }, [label.pendingRequests]);

    return (
        <>
            <div className="flex flex-col md:flex-row items-start gap-6 mb-8 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <img src={label.pfpUrl} alt={label.name} className="w-24 h-24 rounded-lg object-cover border-4 border-gray-600 flex-shrink-0"/>
                <div className="flex-grow w-full">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold">{label.name}</h2>
                            <p className="text-gray-400 mt-1 max-w-lg">{label.description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                           {isOwner && (
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-sm flex items-center gap-2">
                                    <PencilIcon className="w-4 h-4"/> Edit Label
                                </button>
                           )}
                           <button onClick={leaveLabel} className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-md font-semibold transition-colors text-sm">
                                Leave Label
                            </button>
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t border-gray-700 flex gap-8">
                        <div>
                            <p className="text-sm text-gray-400">Members</p>
                            <p className="text-2xl font-bold">{(label.memberIds ?? []).length} / 25</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-nowrap justify-start sm:justify-center overflow-x-auto border-b border-gray-700 mb-6 no-scrollbar">
                <button onClick={() => setActiveTab('chat')} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'chat' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Chat</button>
                <button onClick={() => setActiveTab('members')} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'members' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Members</button>
                <button onClick={() => setActiveTab('wars')} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'wars' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Wars</button>
                <button onClick={() => setActiveTab('raids')} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'raids' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Raids</button>
                 <button onClick={() => setActiveTab('accolades')} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'accolades' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Accolades</button>
                {isOwner && (
                    <button onClick={() => setActiveTab('requests')} className={`relative flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'requests' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                        Requests
                        {pendingRequests.length > 0 && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingRequests.length}</span>
                        )}
                    </button>
                )}
            </div>
            
            {activeTab === 'members' && (
                <div>
                    <h3 className="text-xl font-bold mb-4">Members ({members.length})</h3>
                    {isLoadingMembers ? (
                         <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div></div>
                    ) : (
                        <div className="space-y-3">
                            {members.map(member => (
                                <button key={member.id} onClick={() => setViewingUser(member)} className="w-full text-left flex items-center p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">
                                    <img src={member.pfpUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover"/>
                                    <div className="ml-4">
                                        <p className="font-semibold">{member.name}</p>
                                        {label.ownerId === member.id && <p className="text-xs text-yellow-400">Owner</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'chat' && <LabelChatView />}
            {activeTab === 'wars' && <EventsView />}
            {activeTab === 'raids' && <RaidsView />}
            {activeTab === 'accolades' && <AccoladesView trophies={label.trophies || []} />}
            {activeTab === 'requests' && isOwner && (
                 <div>
                    <h3 className="text-xl font-bold mb-4">Join Requests ({pendingRequests.length})</h3>
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-3">
                            {pendingRequests.map(req => (
                                <div key={req.userId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <img src={req.userPfpUrl} alt={req.userName} className="w-10 h-10 rounded-full object-cover"/>
                                        <p className="font-semibold">{req.userName}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => reviewJoinRequest(label.id, req.userId, 'decline')} className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                                        <button onClick={() => reviewJoinRequest(label.id, req.userId, 'accept')} className="p-2 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors"><CheckIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-10">No pending join requests.</p>
                    )}
                 </div>
            )}
             
             {isEditing && <LabelModal onClose={() => setIsEditing(false)} existingLabel={label} />}
        </>
    );
}

const AccoladesView: React.FC<{ trophies: Trophy[] }> = ({ trophies }) => {
    const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);

    const sortedTrophies = useMemo(() => {
        return [...trophies].sort((a, b) => b.date - a.date);
    }, [trophies]);

    if (trophies.length === 0) {
        return (
             <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-700 rounded-lg">
                <TrophyIcon className="w-12 h-12 mx-auto text-gray-600 mb-2"/>
                <p>This label has not won any event trophies yet.</p>
                <p className="text-sm mt-1">Compete in the weekly events to earn your spot in history!</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedTrophies.map((trophy, index) => (
                    <TrophyCard key={`${trophy.eventId}-${index}`} trophy={trophy} onClick={() => setSelectedTrophy(trophy)} />
                ))}
            </div>
            {selectedTrophy && (
                <TrophyDetailModal trophy={selectedTrophy} onClose={() => setSelectedTrophy(null)} />
            )}
        </div>
    );
};

const TrophyCard: React.FC<{ trophy: Trophy; onClick: () => void }> = ({ trophy, onClick }) => {
    const getStyles = () => {
        switch(trophy.rank) {
            case 1: return { bg: 'iridescent-border-bg', glow: 'shadow-lg shadow-white/20', iconColor: 'text-yellow-300' };
            case 2: return { bg: 'bg-slate-700 border-2 border-slate-400', glow: 'shadow-lg shadow-slate-400/20', iconColor: 'text-slate-300' };
            case 3: return { bg: 'bg-amber-800/80 border-2 border-amber-500', glow: 'shadow-lg shadow-amber-500/20', iconColor: 'text-amber-400' };
            default: return { bg: 'bg-gray-700 border-2 border-gray-600', glow: 'shadow-md', iconColor: 'text-gray-400' };
        }
    };
    const { bg, glow, iconColor } = getStyles();

    return (
        <button onClick={onClick} className={`relative flex flex-col items-center justify-center p-4 rounded-lg text-center transition-transform hover:scale-105 ${bg} ${glow}`}>
            <TrophyIcon className={`w-12 h-12 mb-2 ${iconColor}`} />
            <p className="font-bold text-white text-sm truncate w-full">{trophy.eventName}</p>
            <p className="text-xs text-gray-400">{new Date(trophy.date).toLocaleDateString()}</p>
            <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg border-2 ${trophy.rank <= 3 ? `${iconColor} border-current` : 'text-gray-300 border-gray-500'} bg-gray-900/50`}>
                {trophy.rank}
            </div>
        </button>
    );
};

const TrophyDetailModal: React.FC<{ trophy: Trophy; onClose: () => void }> = ({ trophy, onClose }) => {
    const warTitle = trophy.warNumber === 0
        ? 'the Beta War' 
        : `the ${trophy.warNumber}${
            (trophy.warNumber % 10 === 1 && trophy.warNumber !== 11) ? 'st' :
            (trophy.warNumber % 10 === 2 && trophy.warNumber !== 12) ? 'nd' :
            (trophy.warNumber % 10 === 3 && trophy.warNumber !== 13) ? 'rd' : 'th'
        } Label War`;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-sm bg-gray-800 rounded-lg p-6 text-center" style={{ animation: 'trophy-reveal 0.5s ease-out' }} onClick={e => e.stopPropagation()}>
                <TrophyIcon className="w-20 h-20 mx-auto text-yellow-300 mb-4" />
                <p className="text-sm text-gray-400">ACHIEVEMENT UNLOCKED</p>
                <h3 className="text-2xl font-bold">{trophy.eventName}</h3>
                <p className="text-4xl font-black my-3 bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-500">
                    {trophy.rank}{trophy.rank === 1 ? 'st' : trophy.rank === 2 ? 'nd' : trophy.rank === 3 ? 'rd' : 'th'} Place
                </p>
                <p className="text-gray-400">Earned in {warTitle}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(trophy.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
        </div>
    );
};


const DiscoverLabelsView: React.FC = () => {
    const { currentUser, currentUserCollection, recordLabels, joinLabel, requestToJoinLabel } = useContext(UserContext)!;
    const [isCreating, setIsCreating] = useState(false);
    
    const mythicCount = useMemo(() => {
        return currentUserCollection.filter(s => s.song.rarity === Rarity.Mythic).length;
    }, [currentUserCollection]);
    const canCreateLabel = mythicCount >= 5;

    return (
        <>
            <div className="text-center mb-8">
                <BuildingLibraryIcon className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
                <h2 className="text-3xl font-bold">Join a Record Label</h2>
                <p className="text-gray-400 max-w-lg mx-auto">Team up with other collectors to build the ultimate shared vault. Create your own label or join an existing one.</p>
                <div className="mt-4">
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        disabled={!canCreateLabel}
                        title={!canCreateLabel ? 'You need to collect at least 5 Mythic songs to create a label.' : ''}
                    >
                        Create Your Own Label
                    </button>
                     {!canCreateLabel && (
                        <p className="text-yellow-400 text-sm mt-2">
                           Collect {5 - mythicCount} more Mythic song{5 - mythicCount > 1 ? 's' : ''} to create a label.
                        </p>
                    )}
                </div>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-4">
                {recordLabels.map(label => {
                    const hasRequested = !!(currentUser?.pendingLabelRequests?.includes(label.id));
                    const memberCount = (label.memberIds ?? []).length;
                    const isFull = memberCount >= 25;
                    const isMember = !!(currentUser && (label.memberIds ?? []).includes(currentUser.id));
                    return (
                        <div key={label.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
                            <img src={label.pfpUrl} alt={label.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-bold">{label.name}</h4>
                                    {label.joinType === 'request' && <span title="Request to Join"><LockClosedIcon className="w-4 h-4 text-gray-400" /></span>}
                                </div>
                                <p className="text-sm text-gray-400">{label.description}</p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                    <UsersIcon className="w-4 h-4" />
                                    <span>{memberCount} / 25 Members</span>
                                </div>
                            </div>
                            {label.joinType === 'open' ? (
                                <button 
                                    onClick={() => joinLabel(label.id)} 
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-semibold transition-colors flex-shrink-0 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    disabled={isFull || isMember}
                                >
                                    {isFull ? 'Full' : isMember ? 'Member' : 'Join'}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => requestToJoinLabel(label.id)}
                                    disabled={hasRequested || isFull || isMember}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-semibold transition-colors flex-shrink-0 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                     {isFull ? 'Full' : isMember ? 'Member' : hasRequested ? 'Request Sent' : 'Request to Join'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {isCreating && <LabelModal onClose={() => setIsCreating(false)} />}
        </>
    );
};

type LeaderboardType = 'prestige' | 'collection';

const LeaderboardView: React.FC = () => {
    const { users, setViewingUser } = useContext(UserContext)!;
    const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('prestige');

    const leaderboardData = useMemo(() => {
        if (leaderboardType === 'prestige') {
            return [...users].sort((a, b) => (b.prestigeCount || 0) - (a.prestigeCount || 0));
        } else {
            return [...users].sort((a, b) => (b.collectionSize || 0) - (a.collectionSize || 0));
        }
    }, [users, leaderboardType]);
    
    return (
        <div>
            <div className="text-center mb-8">
                <TrophyIcon className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h2 className="text-3xl font-bold">Global Leaderboards</h2>
                <p className="text-gray-400 max-w-lg mx-auto">
                    {leaderboardType === 'prestige'
                        ? "Ranking all collectors by the number of Prestige songs they've crafted."
                        : "Ranking all collectors by the total number of songs in their collection."}
                </p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6 p-1 bg-gray-700 rounded-full text-white w-max mx-auto">
                <button 
                    onClick={() => setLeaderboardType('prestige')} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold flex items-center gap-1.5 ${leaderboardType === 'prestige' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    <DiamondIcon className="w-4 h-4" />
                    Prestige
                </button>
                <button 
                    onClick={() => setLeaderboardType('collection')} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold flex items-center gap-1.5 ${leaderboardType === 'collection' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    <RectangleStackIcon className="w-4 h-4" />
                    Collection
                </button>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
                {leaderboardData.map((user, index) => {
                    const score = leaderboardType === 'prestige' ? (user.prestigeCount || 0) : (user.collectionSize || 0);
                    const Icon = leaderboardType === 'prestige' ? DiamondIcon : RectangleStackIcon;

                    return (
                        <button key={user.id} onClick={() => setViewingUser(user)} className="w-full text-left bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center gap-4 hover:bg-gray-700/70 transition-colors">
                            <div className="w-12 flex-shrink-0 text-center font-bold text-2xl text-gray-400">
                               #{index + 1}
                            </div>
                            <img src={user.pfpUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
                            <div className="flex-grow">
                                 <h4 className="font-bold">{user.name}</h4>
                            </div>
                            <div className="text-right flex-shrink-0 flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${leaderboardType === 'prestige' ? 'text-yellow-300' : 'text-gray-300'}`} />
                                <p className="text-xl font-bold text-white">{score.toLocaleString()}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

type SocialTab = 'labels' | 'messages' | 'friends' | 'battles' | 'raids' | 'leaderboard';

export const LabelsView: React.FC = () => {
    const { currentUser, recordLabels } = useContext(UserContext)!;
    const [activeTab, setActiveTab] = useState<SocialTab>('labels');

    const myLabel = useMemo(() => {
        if (!currentUser?.labelId) return null;
        return recordLabels.find(l => l.id === currentUser.labelId) || null;
    }, [currentUser, recordLabels]);

    const renderContent = () => {
        switch(activeTab) {
            case 'labels':
                return myLabel ? <MyLabelView label={myLabel} /> : <DiscoverLabelsView />;
            case 'messages':
                return <MessagesView />;
            case 'friends':
                return <FriendsView />;
            case 'battles':
                return <BattlesView />;
            case 'raids':
                return myLabel ? <RaidsView /> : <div className="text-center text-gray-400 py-16">You must be in a Record Label to participate in Raids.</div>;
            case 'leaderboard':
                return <LeaderboardView />;
            default:
                return <DiscoverLabelsView />;
        }
    }

    return (
         <div>
            <div className="flex flex-nowrap justify-start sm:justify-center overflow-x-auto border-b border-gray-700 mb-6 no-scrollbar">
                <button 
                    onClick={() => setActiveTab('labels')}
                    className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'labels' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Labels
                </button>
                 <button 
                    onClick={() => setActiveTab('messages')}
                    className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'messages' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Messages
                </button>
                <button 
                    onClick={() => setActiveTab('friends')}
                    className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'friends' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Friends
                </button>
                 <button 
                    onClick={() => setActiveTab('battles')}
                    className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'battles' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Battles
                </button>
                {myLabel && (
                    <button 
                        onClick={() => setActiveTab('raids')}
                        className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'raids' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Raids
                    </button>
                )}
                 <button 
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'leaderboard' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Leaderboard
                </button>
            </div>
            {renderContent()}
        </div>
    );
};