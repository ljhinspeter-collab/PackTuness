
import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { CollectedSong, TradePost, TradeOffer, User } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { Rarity } from '../types';
import { SearchBar } from '../components/SearchBar';
import { SparklesIcon, DiamondIcon } from '../components/icons';

type TradeViewTab = 'Marketplace' | 'My Listings' | 'My Offers';

const SongCard: React.FC<{ song: CollectedSong, small?: boolean }> = ({ song, small = false }) => {
    const rarityStyles = getRarityStyles(song.song.rarity);
    let bgColorClass = rarityStyles.bgColor;
    if (song.isPrestige) bgColorClass = 'bg-yellow-900/50';

    if (small) {
        return (
             <div className={`p-2 rounded-md ${bgColorClass} border ${song.isPrestige ? 'border-yellow-400' : rarityStyles.borderColor} flex items-center gap-2`}>
                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
                <div className="truncate">
                    <p className="text-xs font-semibold truncate">{song.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                </div>
            </div>
        )
    }
    return (
        <div className={`p-3 rounded-lg ${bgColorClass} border ${song.isPrestige ? 'border-yellow-400' : rarityStyles.borderColor}`}>
            <div className="flex items-center gap-3">
                 <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-12 h-12 rounded-md object-cover"/>
                 <div className="flex-grow truncate">
                    <p className="font-semibold text-white truncate">{song.song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{song.song.artist.name}</p>
                 </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 text-xs">
                <span className={`font-bold ${song.isPrestige ? 'text-yellow-300' : rarityStyles.textColor}`}>
                    {song.isPrestige ? 'Prestige' : song.song.rarity} {song.song.isShiny && !song.isPrestige && '✨'}
                </span>
                {song.song.rarity === Rarity.Mythic && song.serialNumber && (
                    <span className="bg-yellow-400/80 text-black font-bold px-2 py-0.5 rounded-full">#{String(song.serialNumber).padStart(3, '0')}</span>
                )}
            </div>
        </div>
    );
};

const MakeOfferModal: React.FC<{ tradePost: TradePost, onClose: () => void }> = ({ tradePost, onClose }) => {
    const { currentUserCollection, makeOffer } = useContext(UserContext)!;
    const [selectedSongs, setSelectedSongs] = useState<CollectedSong[]>([]);
    
    const toggleSongSelection = (song: CollectedSong) => {
        setSelectedSongs(prev => 
            prev.find(s => s.id === song.id) 
                ? prev.filter(s => s.id !== song.id) 
                : [...prev, song]
        );
    };

    const handleSubmitOffer = () => {
        if (selectedSongs.length === 0) return;
        makeOffer(tradePost, selectedSongs);
        onClose();
    };

    // Filter out the song that is being traded AND any jailbroken songs
    const availableCollection = currentUserCollection.filter(s => s.id !== tradePost.songToTrade.id && s.song.rarity !== Rarity.Jailbroken);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Make an Offer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="font-semibold mb-2">They are offering:</p>
                        <SongCard song={tradePost.songToTrade} />
                         <p className="text-sm text-gray-400 mt-2">Seeking: <span className="text-gray-200">{tradePost.seeking}</span></p>
                    </div>
                     <div>
                        <p className="font-semibold mb-2">You are offering:</p>
                         {selectedSongs.length > 0 ? (
                            <div className="space-y-2">
                                {selectedSongs.map(s => <SongCard key={s.id} song={s} small />)}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 p-4 border-2 border-dashed border-gray-600 rounded-lg">Select songs from your collection below.</div>
                        )}
                    </div>
                </div>

                <p className="font-semibold mb-2">Your Collection:</p>
                <div className="flex-grow bg-gray-900/50 p-2 rounded-lg overflow-y-auto max-h-[300px]">
                     {availableCollection.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {availableCollection.map(song => (
                                 <button key={song.id} onClick={() => toggleSongSelection(song)} className={`w-full text-left rounded-lg transition-all ${selectedSongs.find(s => s.id === song.id) ? 'ring-2 ring-indigo-500' : ''}`}>
                                    <SongCard song={song} />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 p-4">You have no other songs to offer.</p>
                    )}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSubmitOffer} disabled={selectedSongs.length === 0} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Submit Offer</button>
                </div>
            </div>
        </div>
    );
};


const TradePostCard: React.FC<{ post: TradePost, onMakeOffer: () => void, currentUserId: string | undefined, onViewProfile: () => void }> = ({ post, onMakeOffer, currentUserId, onViewProfile }) => {
    const hasMadeOffer = post.offers.some(o => o.offeredById === currentUserId);

    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center gap-4">
            <button onClick={onViewProfile} className="flex items-center gap-3 flex-shrink-0 text-left">
                <img src={post.ownerPfpUrl} alt={post.ownerName} className="w-10 h-10 rounded-full object-cover"/>
                <p className="font-semibold">{post.ownerName}</p>
            </button>
            <div className="flex-grow w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">OFFERING:</p>
                        <SongCard song={post.songToTrade} small />
                    </div>
                     <div>
                        <p className="text-xs text-gray-400 mb-1">SEEKING:</p>
                        <p className="text-sm p-2 bg-gray-700/50 rounded-md truncate">{post.seeking}</p>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button 
                    onClick={onMakeOffer} 
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    disabled={hasMadeOffer}
                >
                    {hasMadeOffer ? 'Offer Sent' : 'Make Offer'}
                </button>
                 <span className="text-xs text-gray-500">{post.offers.length} {post.offers.length === 1 ? 'Offer' : 'Offers'}</span>
            </div>
        </div>
    );
};

const OfferCard: React.FC<{ offer: TradeOffer, onAccept: () => void, onDecline: () => void, onViewProfile: () => void }> = ({ offer, onAccept, onDecline, onViewProfile }) => {
    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <button onClick={onViewProfile} className="flex items-center gap-3 mb-3 text-left">
                 <img src={offer.offeredByPfpUrl} alt={offer.offeredByName} className="w-10 h-10 rounded-full object-cover"/>
                 <p className="font-semibold">{offer.offeredByName} is offering:</p>
            </button>
            <div className="space-y-2 mb-4">
                {offer.songsOffered.map(song => <SongCard key={song.id} song={song} small />)}
            </div>
            {offer.status === 'pending' && (
                <div className="flex justify-end gap-2">
                    <button onClick={onDecline} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-sm rounded-md">Decline</button>
                    <button onClick={onAccept} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-sm rounded-md">Accept</button>
                </div>
            )}
             {offer.status !== 'pending' && (
                 <div className="text-right">
                    <span className={`px-3 py-1 text-sm rounded-md font-semibold ${offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                    </span>
                 </div>
            )}
        </div>
    )
};


const MyListingCard: React.FC<{ 
    post: TradePost; 
    onCancel: () => void;
    onAcceptOffer: (offerId: string) => void;
    onDeclineOffer: (offerId: string) => void;
    onViewOfferProfile: (userId: string) => void;
}> = ({ post, onCancel, onAcceptOffer, onDeclineOffer, onViewOfferProfile }) => (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                 <p className="text-xs text-gray-400 mb-1">YOU ARE OFFERING:</p>
                 <SongCard song={post.songToTrade} />
            </div>
            {post.status === 'open' && (
                <button onClick={onCancel} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-md transition-colors">
                    Cancel Trade
                </button>
            )}
            {post.status === 'closed' && (
                 <span className="px-3 py-1.5 bg-gray-600 text-white text-sm font-semibold rounded-md">
                    Trade Closed
                </span>
            )}
        </div>
        <p className="text-sm text-gray-400 mt-2">Seeking: <span className="text-gray-200">{post.seeking}</span></p>

        <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="font-semibold mb-2">Offers Received ({post.offers.length})</h4>
            {post.offers.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {post.offers.map(offer => (
                        <OfferCard 
                            key={offer.id} 
                            offer={offer} 
                            onAccept={() => onAcceptOffer(offer.id)}
                            onDecline={() => onDeclineOffer(offer.id)}
                            onViewProfile={() => onViewOfferProfile(offer.offeredById)}
                        />
                    ))}
                </div>
            ) : <p className="text-sm text-gray-500">No offers yet.</p>}
        </div>
    </div>
);

const MyOfferItem: React.FC<{ offer: TradeOffer, trade: TradePost | undefined, onViewProfile: () => void }> = ({ offer, trade, onViewProfile }) => {
    if (!trade) return null;
    const getStatusStyles = () => {
        switch (offer.status) {
            case 'accepted': return 'bg-green-500/20 text-green-400';
            case 'declined': return 'bg-red-500/20 text-red-400';
            default: return 'bg-yellow-500/20 text-yellow-400';
        }
    };
    return (
         <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
             <div className="flex justify-between items-start mb-3">
                 <p className="font-semibold">Your offer to <button onClick={onViewProfile} className="text-indigo-400 hover:underline">{trade.ownerName}</button></p>
                 <span className={`px-2 py-1 text-xs rounded-md font-semibold ${getStatusStyles()}`}>{offer.status}</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                 <div>
                    <p className="text-xs text-gray-400 mb-1">YOU OFFERED:</p>
                    <div className="space-y-1">
                     {offer.songsOffered.map(s => <SongCard key={s.id} song={s} small />)}
                    </div>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 mb-1">FOR THEIR:</p>
                    <SongCard song={trade.songToTrade} small />
                 </div>
             </div>
         </div>
    )
}

export const TradeHubView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TradeViewTab>('Marketplace');
    const [selectedTrade, setSelectedTrade] = useState<TradePost | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
    const [showShinyOnly, setShowShinyOnly] = useState(false);
    const [showPrestigeOnly, setShowPrestigeOnly] = useState(false);
    const { currentUser, users, setViewingUser, tradePosts, reviewOffer, cancelTradePost } = useContext(UserContext)!;

    const handleViewProfile = (userId: string) => {
        const userToView = users.find(u => u.id === userId);
        if (userToView) {
            setViewingUser(userToView);
        }
    };

    const marketplacePosts = useMemo(() => {
        let posts = tradePosts.filter(p => p.ownerId !== currentUser!.id && p.status === 'open').sort((a,b) => b.createdAt - a.createdAt);
        
        if (showPrestigeOnly) {
          posts = posts.filter(p => p.songToTrade.isPrestige);
        }
        if (showShinyOnly) {
          posts = posts.filter(p => p.songToTrade.song.isShiny);
        }

        if (rarityFilter !== 'All') {
            posts = posts.filter(p => p.songToTrade.song.rarity === rarityFilter);
        }

        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            posts = posts.filter(p => 
                p.songToTrade.song.title.toLowerCase().includes(lowerCaseQuery) ||
                p.songToTrade.song.artist.name.toLowerCase().includes(lowerCaseQuery)
            );
        }

        return posts;
    }, [tradePosts, currentUser, rarityFilter, searchQuery, showShinyOnly, showPrestigeOnly]);

    const myPosts = useMemo(() => tradePosts.filter(p => p.ownerId === currentUser!.id).sort((a,b) => b.createdAt - a.createdAt), [tradePosts, currentUser]);
    
    // Create a map for quick lookup
    const tradePostsById = useMemo(() => new Map(tradePosts.map(p => [p.id, p])), [tradePosts]);
    
    const myOffers = useMemo(() => {
        return tradePosts
            .flatMap(p => p.offers.map(o => ({ ...o, tradeId: p.id }))) // ensure tradeId is on offer
            .filter(o => o.offeredById === currentUser!.id);
    }, [tradePosts, currentUser]);

    const tradeableFilters: (Rarity | 'All')[] = ['All', Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Mythic];

    const renderContent = () => {
        switch(activeTab) {
            case 'Marketplace':
                return (
                    <div>
                        <div className="max-w-lg mx-auto mb-4">
                            <SearchBar 
                                query={searchQuery}
                                setQuery={setSearchQuery}
                                onSearch={() => {}}
                                isLoading={false}
                                placeholder="Search by song or artist..."
                            />
                        </div>

                        <div className="flex justify-center items-center gap-2 mb-6 flex-wrap">
                            <div className="flex justify-center gap-2 flex-wrap">
                                {tradeableFilters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setRarityFilter(filter)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                        rarityFilter === filter
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {filter}
                                </button>
                                ))}
                            </div>
                           <button 
                            onClick={() => setShowShinyOnly(prev => !prev)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showShinyOnly ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            <SparklesIcon className="w-4 h-4" />
                            Shiny
                          </button>
                           <button 
                            onClick={() => setShowPrestigeOnly(prev => !prev)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showPrestigeOnly ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            <DiamondIcon className="w-4 h-4" />
                            Prestige
                          </button>
                        </div>


                        {marketplacePosts.length > 0 ? (
                            <div className="space-y-3">
                                {marketplacePosts.map(post => <TradePostCard key={post.id} post={post} onMakeOffer={() => setSelectedTrade(post)} currentUserId={currentUser?.id} onViewProfile={() => handleViewProfile(post.ownerId)} />)}
                            </div>
                        ) : <p className="text-center text-gray-400 py-10">No trades match your filters. Try a different search!</p>}
                    </div>
                );

            case 'My Listings':
                 return myPosts.length > 0 ? (
                    <div className="space-y-3">
                        {myPosts.map(post => (
                            <MyListingCard 
                                key={post.id} 
                                post={post} 
                                onCancel={() => cancelTradePost(post.id)}
                                onAcceptOffer={(offerId) => reviewOffer(post.id, offerId, 'accepted')}
                                onDeclineOffer={(offerId) => reviewOffer(post.id, offerId, 'declined')}
                                onViewOfferProfile={handleViewProfile}
                            />
                        ))}
                    </div>
                ) : <p className="text-center text-gray-400 py-10">Create trade listings from the song details screen in your collection.</p>;

            case 'My Offers':
                return myOffers.length > 0 ? (
                    <div className="space-y-3">
                        {myOffers.map(offer => {
                            const trade = tradePostsById.get(offer.tradeId);
                            return (
                                <MyOfferItem key={offer.id} offer={offer} trade={trade} onViewProfile={() => trade && handleViewProfile(trade.ownerId)} />
                            );
                        })}
                    </div>
                ) : <p className="text-center text-gray-400 py-10">You haven't made any offers yet.</p>;
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Trade Hub</h2>

            <div className="flex justify-center border-b border-gray-700 mb-6">
                 {(['Marketplace', 'My Listings', 'My Offers'] as TradeViewTab[]).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {renderContent()}

            {selectedTrade && <MakeOfferModal tradePost={selectedTrade} onClose={() => setSelectedTrade(null)} />}
        </div>
    );
};
