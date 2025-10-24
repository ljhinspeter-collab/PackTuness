import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, Unsubscribe, doc, deleteField, query, where, orderBy, limit, writeBatch, runTransaction, increment, arrayRemove, arrayUnion, addDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

import type { User, Song, CollectedSong, Artist, TradePost, TradeOffer, Badge, Vinyl, Mixtape, ArtistMastery, Showcase, RecordLabel, LabelEvent, LabelRaid, SongBattle, GlobalActivity, Chat, Message, LabelChatMessage, UserContextType, EventReward, RoomLayout } from '../types';
import { auth, db } from '../services/firebase';
import { dataService, LATEST_DATA_VERSION } from '../services/dataService';
import { generateBattleReport } from '../services/aiService';
import { challenges } from '../services/challengeService';
import { Rarity } from '../types';
import { getAlbumTracks, getTrackDetails, searchSongs } from '../services/musicService';
import { useNotification } from './NotificationContext';
import type { HourlyEvent } from '../services/dailyEventService';
import { manageEventCycle } from '../services/eventService';
import { manageRaidCycle, attackRaidBoss as performRaidAttack } from '../services/raidService';


export const MASTERY_LEVELS = [
    { level: 1, name: "Follower", xpThreshold: 100 },
    { level: 2, name: "Apprentice", xpThreshold: 500 },
    { level: 3, name: "Adept", xpThreshold: 2000 },
    { level: 4, name: "Master", xpThreshold: 8000 },
];

const XP_PER_RARITY = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 3,
    [Rarity.Rare]: 10,
    [Rarity.Mythic]: 50,
    [Rarity.Jailbroken]: 0,
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentUserCollection, setCurrentUserCollection] = useState<CollectedSong[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tradePosts, setTradePosts] = useState<TradePost[]>([]);
    const [recordLabels, setRecordLabels] = useState<RecordLabel[]>([]);
    const [events, setEvents] = useState<LabelEvent[]>([]);
    const [labelRaids, setLabelRaids] = useState<LabelRaid[]>([]);
    const [songBattles, setSongBattles] = useState<SongBattle[]>([]);
    const [globalActivityFeed, setGlobalActivityFeed] = useState<GlobalActivity[]>([]);
    
    const [viewingUser, setViewingUserState] = useState<User | null>(null);
    const [viewingUserCollection, setViewingUserCollection] = useState<CollectedSong[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [viewingUserShowcaseSongs, setViewingUserShowcaseSongs] = useState<{ favoriteSong?: CollectedSong, rarestSong?: CollectedSong } | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
    const [activeChatMessages, setActiveChatMessages] = useState<Message[]>([]);
    const [activeLabelChatMessages, setActiveLabelChatMessages] = useState<LabelChatMessage[]>([]);
    const [rewards, setRewards] = useState<EventReward[]>([]);
    
    const [rewardPack, setRewardPack] = useState<{ pack: CollectedSong[], title: string } | null>(null);
    // FIX: Add state for viewing a user's room to satisfy UserContextType
    const [viewingRoomForUser, setViewingRoomForUser] = useState<User | null>(null);
    const previousUserRef = useRef<User | null>(null);
    const dailyCheckPerformed = useRef(false);
    const mythicFixRun = useRef(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setFirebaseUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        const unsubscribers: Unsubscribe[] = [];

        if (firebaseUser) {
            const userId = firebaseUser.uid;
            
            // Manage event cycles
            manageEventCycle();
            manageRaidCycle();
            
            unsubscribers.push(onSnapshot(doc(db, 'users', userId), (doc) => {
                if (doc.exists()) setCurrentUser(doc.data() as User);
                else setCurrentUser(null);
            }));
            
            unsubscribers.push(onSnapshot(collection(db, 'users', userId, 'collection'), (snapshot) => {
                const collectionData = snapshot.docs.map(doc => doc.data() as CollectedSong);
                setCurrentUserCollection(collectionData);
            }));
            
            unsubscribers.push(onSnapshot(collection(db, 'users', userId, 'rewards'), (snapshot) => {
                const rewardsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as EventReward);
                setRewards(rewardsData);
            }));

            unsubscribers.push(onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => d.data() as User))));
            unsubscribers.push(onSnapshot(collection(db, 'tradePosts'), s => setTradePosts(s.docs.map(d => ({id: d.id, ...d.data()}) as TradePost))));
            unsubscribers.push(onSnapshot(collection(db, 'recordLabels'), s => setRecordLabels(s.docs.map(d => ({id: d.id, ...d.data()}) as RecordLabel))));
            unsubscribers.push(onSnapshot(query(collection(db, 'events'), orderBy('startTime', 'desc')), s => setEvents(s.docs.map(d => ({id: d.id, ...d.data()}) as LabelEvent))));
            unsubscribers.push(onSnapshot(query(collection(db, 'labelRaids'), orderBy('startTime', 'desc')), s => setLabelRaids(s.docs.map(d => ({id: d.id, ...d.data()}) as LabelRaid))));
            unsubscribers.push(onSnapshot(collection(db, 'songBattles'), s => setSongBattles(s.docs.map(d => ({id: d.id, ...d.data()}) as SongBattle))));
            unsubscribers.push(onSnapshot(query(collection(db, 'globalActivity'), orderBy('timestamp', 'desc'), limit(50)), s => setGlobalActivityFeed(s.docs.map(d => ({id: d.id, ...d.data()}) as GlobalActivity))));
            
             unsubscribers.push(onSnapshot(query(collection(db, 'chats'), where('participantIds', 'array-contains', userId)), (snapshot) => {
                setChats(snapshot.docs.map(doc => doc.data() as Chat));
            }));
        } else {
            setCurrentUser(null);
            setCurrentUserCollection([]);
            setUsers([]);
            setTradePosts([]);
            setRecordLabels([]);
            setEvents([]);
            setLabelRaids([]);
            setSongBattles([]);
            setGlobalActivityFeed([]);
            setChats([]);
            setActiveChatIdState(null);
            setViewingUserState(null);
            setActiveLabelChatMessages([]);
            setRewards([]);
        }

        return () => unsubscribers.forEach(unsub => unsub());
    }, [firebaseUser]);
    
    useEffect(() => {
        if (currentUser && previousUserRef.current) {
            const oldUser = previousUserRef.current;

            // Mastery level up detection
            if (currentUser.artistMastery) {
                for (const artistId in currentUser.artistMastery) {
                    const newMastery = currentUser.artistMastery[artistId];
                    // oldUser.artistMastery could be undefined, especially on first mastery gain
                    const oldMastery = oldUser.artistMastery ? oldUser.artistMastery[artistId] : undefined;
                    const oldLevel = oldMastery?.level ?? 0;
                    
                    if (newMastery.level > oldLevel) {
                         for (let level = oldLevel + 1; level <= newMastery.level; level++) {
                             addNotification({
                                 type: 'mastery',
                                 message: `${newMastery.artistName} Mastery Level ${level} Unlocked!`,
                             });
                             // Log for event scoring
                             dataService.logMasteryLevelUp(currentUser.id, artistId, level);
                         }
                    }
                }
            }
            
            if (currentUser.earnedBadges && oldUser.earnedBadges) {
                const oldBadges = new Set(oldUser.earnedBadges.map(b => b.name));
                currentUser.earnedBadges.forEach(badge => {
                    if (!oldBadges.has(badge.name)) {
                        addNotification({
                            type: 'challenge',
                            message: `Achievement: ${badge.name}`,
                        });
                    }
                });
            }
        }

        if (currentUser) {
           previousUserRef.current = JSON.parse(JSON.stringify(currentUser));
        }
    }, [currentUser, addNotification]);
    
     useEffect(() => {
        // This effect runs a one-time scan to fix any mythics that were pulled before the serial number system was robust.
        if (currentUser && currentUserCollection.length > 0 && !mythicFixRun.current) {
            mythicFixRun.current = true; // Mark as run to prevent re-running this session
            
            // Don't await this, let it run in the background
            dataService.fixNullMythicSerials(currentUser.id, currentUserCollection)
                .then(() => console.log("Mythic serial number scan complete."))
                .catch(err => console.error("Mythic serial scan failed:", err));
        }
    }, [currentUser, currentUserCollection]);

    useEffect(() => {
        let unsubscribe: Unsubscribe | null = null;
        if (activeChatId) {
            const messagesRef = collection(db, 'chats', activeChatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setActiveChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message));
            });
        } else {
            setActiveChatMessages([]);
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [activeChatId]);

    useEffect(() => {
        let unsubscribe: Unsubscribe | null = null;
        if (currentUser?.labelId) {
            const messagesRef = collection(db, 'recordLabels', currentUser.labelId, 'chatMessages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setActiveLabelChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as LabelChatMessage));
            });
        } else {
            setActiveLabelChatMessages([]);
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [currentUser?.labelId]);
    
    const isSameDay = (d1: number, d2: number) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    };

    const addSongsToCollection = useCallback(async (songs: Song[], activeEvent: HourlyEvent | null): Promise<CollectedSong[]> => {
        if (!currentUser) throw new Error("User not signed in");
        
        const batch = writeBatch(db);
        const newCollectedSongs: CollectedSong[] = [];
        const newArtistMastery: Record<string, ArtistMastery> = { ...currentUser.artistMastery };
        let vinylsUpdated = false;
        const newVinyls = [...currentUser.vinyls];
        
        const songIdsToGetSerials = songs.filter(s => s.rarity === Rarity.Mythic).map(s => s.id);
        let mythicSerials: Record<string, number> = {};
        let serializationFailed = false;

        try {
            if (songIdsToGetSerials.length > 0) {
                 mythicSerials = await runTransaction<Record<string, number>>(db, async (transaction) => {
                    const serials: Record<string, number> = {};
                    for (const songId of songIdsToGetSerials) {
                        const serialRef = doc(db, 'mythicSerials', songId);
                        const serialDoc = await transaction.get(serialRef);
                        serials[songId] = serialDoc.exists() ? serialDoc.data().count : 0;
                    }
                    return serials;
                });
            }
        } catch (error: any) {
            if (error.code === 'resource-exhausted' || (error.message && error.message.toLowerCase().includes('quota exceeded'))) {
                console.warn("Firestore quota exceeded during mythic serialization. Assigning null serials as a fallback.");
                serializationFailed = true;
            } else {
                throw error;
            }
        }

        for (const song of songs) {
            const newId = `cs_${song.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const collectedSong: CollectedSong = {
                id: newId,
                song,
                ownerId: currentUser.id,
                isPrestige: false,
                collectedAt: Date.now(),
            };

            if (song.rarity === Rarity.Mythic) {
                if (serializationFailed) {
                    (collectedSong as any).serialNumber = null;
                } else {
                    const nextSerial = (mythicSerials[song.id] || 0) + 1;
                    mythicSerials[song.id] = nextSerial;
                    collectedSong.serialNumber = nextSerial;

                    if (nextSerial === 1) {
                        const ownerRef = doc(db, 'firstMythicOwners', song.id);
                        batch.set(ownerRef, { ownerId: currentUser.id, ownerName: currentUser.name });
                    }
                }
            }
            
            const activityTimestamp = Date.now();
            const activitySongPayload = {
                title: song.title,
                artistName: song.artist.name,
                artistId: song.artist.id,
                albumArtUrl: song.albumArtUrl,
                rarity: song.rarity,
                isShiny: song.isShiny,
                isPrestige: false,
            };

            if (song.rarity === Rarity.Jailbroken) {
                dataService.addGlobalActivity({ type: 'PULL_JAILBROKEN', userId: currentUser.id, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, song: activitySongPayload, timestamp: activityTimestamp });
            } else if (song.isShiny && (song.rarity === Rarity.Rare || song.rarity === Rarity.Mythic)) {
                dataService.addGlobalActivity({ type: 'PULL_SHINY_RARE', userId: currentUser.id, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, song: activitySongPayload, timestamp: activityTimestamp });
            } else if (song.rarity === Rarity.Mythic && !song.isShiny) {
                dataService.addGlobalActivity({ type: 'PULL_MYTHIC', userId: currentUser.id, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, song: activitySongPayload, timestamp: activityTimestamp });
            }


            const songDocRef = doc(db, 'users', currentUser.id, 'collection', newId);
            batch.set(songDocRef, collectedSong);
            newCollectedSongs.push(collectedSong);

            const artistId = song.artist.id;

            if (!newArtistMastery[artistId]) {
                newArtistMastery[artistId] = { xp: 0, level: 0, artistName: song.artist.name };
            }
            
            if (song.artist.pictureUrl) {
                newArtistMastery[artistId].artistPictureUrl = song.artist.pictureUrl;
            }

            let xpMultiplier = 1;
            if (activeEvent?.id === 'XP_EXPLOSION') xpMultiplier = 2;

            let xpGained = (XP_PER_RARITY[song.rarity] || 0) * xpMultiplier;
            if(song.isShiny) xpGained *= 2;
            newArtistMastery[artistId].xp += xpGained;
            
            let newLevel = 0;
            for (const levelInfo of MASTERY_LEVELS) {
                if (newArtistMastery[artistId].xp >= levelInfo.xpThreshold) {
                    newLevel = levelInfo.level;
                } else {
                    break; // Mastery levels must be sorted by XP threshold
                }
            }
            newArtistMastery[artistId].level = newLevel;
        }

        const updates: Partial<User> = { artistMastery: newArtistMastery, collectionSize: increment(songs.length) };
        batch.update(doc(db, 'users', currentUser.id), updates);
        
        if (!serializationFailed) {
            for (const songId of Object.keys(mythicSerials)) {
                 if (songIdsToGetSerials.includes(songId)) {
                    const serialRef = doc(db, 'mythicSerials', songId);
                    batch.set(serialRef, { count: mythicSerials[songId] });
                }
            }
        }
        
        await batch.commit();
        
        const combinedCollection = [...currentUserCollection, ...newCollectedSongs];

        const shinySongsInPack = newCollectedSongs.filter(cs => cs.song.isShiny);
        const albumsToCheck = [...new Set(shinySongsInPack.map(cs => cs.song.album.id))];

        if (albumsToCheck.length > 0) {
            for (const albumId of albumsToCheck) {
                if (!newVinyls.some(v => v.albumId === albumId)) {
                    const albumTracks = await getAlbumTracks(albumId);
                    if (albumTracks.length === 0) continue; 

                    const allShiny = albumTracks.every(track =>
                        combinedCollection.some(cs => cs.song.id === track.id && cs.song.isShiny)
                    );

                    if (allShiny) {
                        const shinySong = shinySongsInPack.find(cs => cs.song.album.id === albumId)!;
                        const craftedAt = Date.now();
                        // FIX: The property 'artUrl' does not exist on 'shinySong.song.album'. The correct property is 'albumArtUrl' on 'shinySong.song'.
                        newVinyls.push({ albumId: albumId, albumName: shinySong.song.album.title, albumArtUrl: shinySong.song.albumArtUrl, artistName: shinySong.song.artist.name, tracks: albumTracks, craftedAt });
                        vinylsUpdated = true;
                        
                        addNotification({ type: 'vinyl', message: `Golden Vinyl Unlocked: ${shinySong.song.album.title}!` });

                        // FIX: The property 'artUrl' does not exist on 'shinySong.song.album'. The correct property is 'albumArtUrl' on 'shinySong.song'.
                        dataService.addGlobalActivity({ type: 'COMPLETE_VINYL', userId: currentUser.id, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, vinyl: { albumName: shinySong.song.album.title, artistName: shinySong.song.artist.name, albumArtUrl: shinySong.song.albumArtUrl }, timestamp: craftedAt });
                    }
                }
            }
        }

        if (vinylsUpdated) {
            await updateCurrentUser({ vinyls: newVinyls });
        }

        return newCollectedSongs;
    }, [currentUser, currentUserCollection, addNotification]);

    const checkForDailyLoginReward = useCallback(async () => {
        if (!currentUser || (currentUser.lastLogin && isSameDay(currentUser.lastLogin, Date.now()))) {
            return;
        }

        console.log("Processing daily login reward...");
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        const newStreak = (currentUser.lastLogin && isSameDay(currentUser.lastLogin, yesterday))
            ? (currentUser.loginStreak || 0) + 1
            : 1;

        let updates: any = {
            lastLogin: Date.now(),
            loginStreak: newStreak
        };
        
        // 1. Grant song pack
        const existingSongIds = new Set<string>(currentUserCollection.map(cs => cs.song.id));
        const songs = await searchSongs('', [], existingSongIds, currentUser, null, currentUserCollection, { packSize: 3 });
        if (songs.length > 0) {
            const collectedSongs = await addSongsToCollection(songs, null);
            setRewardPack({ pack: collectedSongs, title: "Daily Login Reward" });
        }

        await updateCurrentUser(updates);

    }, [currentUser, currentUserCollection, addSongsToCollection, addNotification]);

    useEffect(() => {
        if (currentUser && !dailyCheckPerformed.current) {
            dailyCheckPerformed.current = true;
            checkForDailyLoginReward();
        }
        // Reset on sign out
        if (!currentUser) {
            dailyCheckPerformed.current = false;
        }
    }, [currentUser, checkForDailyLoginReward]);

    const findMythicOwnerName = useCallback(
        (songId: string, serialNumber: number) => dataService.findMythicOwnerName(songId, serialNumber),
        []
    );
    
    const signIn = (email: string, password?: string) => {
        if (!password) return Promise.reject("Password is required.");
        return signInWithEmailAndPassword(auth, email, password).then(() => {});
    };
    const signUp = async (email: string, password: string, name: string, bio: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await dataService.createUserProfile(userCredential.user.uid, email, name, bio);
    };
    const signOut = () => firebaseSignOut(auth);
    
    const updateCurrentUser = (data: Partial<User>) => dataService.updateUser(currentUser!.id, data);
    const setFavoriteArtists = (artists: Artist[]) => updateCurrentUser({ favoriteArtists: artists });
    const addFriend = (friendId: string) => updateCurrentUser({ friendIds: arrayUnion(friendId) });
    const removeFriend = (friendId: string) => updateCurrentUser({ friendIds: arrayRemove(friendId) });
    const updateShowcase = (data: Partial<Showcase>) => {
        const updateData: {[key: string]: any} = {};
        if (data.favoriteSongId !== undefined) updateData['showcase.favoriteSongId'] = data.favoriteSongId || deleteField();
        if (data.rarestSongId !== undefined) updateData['showcase.rarestSongId'] = data.rarestSongId || deleteField();
        if (data.proudestVinylIds !== undefined) updateData['showcase.proudestVinylIds'] = data.proudestVinylIds;
        return dataService.updateUser(currentUser!.id, updateData);
    };
    
    const setViewingUser = useCallback((user: User | null) => {
        setViewingUserState(user);
        setIsProfileModalOpen(!!user);
        if (user) {
            dataService.getShowcaseSongs(user.id, user.showcase)
                .then(setViewingUserShowcaseSongs);
            dataService.getCollectionForUser(user.id)
                .then(setViewingUserCollection);
        } else {
            setViewingUserShowcaseSongs(null);
            setViewingUserCollection([]);
        }
    }, []);
    const setActiveChatId = (chatId: string | null) => {
        setActiveChatIdState(chatId);
    };

    const getOrCreateChat = async (otherUser: User) => {
        if (!currentUser) return;
        const chatId = await dataService.getOrCreateChat(currentUser, otherUser);
        setActiveChatId(chatId);
    };

    const sendMessage = async (chatId: string, text: string) => {
        if (!currentUser) return;
        await dataService.sendMessage(chatId, currentUser.id, text);
    };
    
    const sendLabelChatMessage = async (text: string) => {
        if (!currentUser || !currentUser.labelId) return;
        await dataService.sendLabelChatMessage(currentUser.labelId, currentUser, text);
    };
    
    const toggleLabelMessageReaction = async (messageId: string, emoji: string) => {
        if (!currentUser || !currentUser.labelId) return;
        await dataService.toggleReaction(currentUser.labelId, messageId, emoji, currentUser.id);
    };

    const createTradePost = (song: CollectedSong, seeking: string) => dataService.createTradePost(currentUser!, song, seeking);
    const cancelTradePost = (id: string) => dataService.cancelTradePost(id);
    const makeOffer = (post: TradePost, songs: CollectedSong[]) => dataService.makeOffer(post.id, currentUser!, songs);
    const reviewOffer = (tradeId: string, offerId: string, decision: 'accepted' | 'declined') => dataService.processOffer(tradeId, offerId, decision);
    
    const prestigeSong = async (mythicId: string, shinyIds: string[]) => {
        if (!currentUser) throw new Error("User not signed in");
        const mythic = currentUserCollection.find(cs => cs.id === mythicId);
        if(!mythic) throw new Error("Mythic song not found");

        await dataService.prestigeSong(currentUser.id, mythic.song.artist.id, mythicId, shinyIds);

        await dataService.addGlobalActivity({ type: 'CRAFT_PRESTIGE', userId: currentUser.id, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, song: { title: mythic.song.title, artistName: mythic.song.artist.name, artistId: mythic.song.artist.id, albumArtUrl: mythic.song.albumArtUrl, rarity: mythic.song.rarity, isShiny: mythic.song.isShiny, isPrestige: true }, timestamp: Date.now() });
    };
    
    const createMixtape = (name: string, description: string) => {
        const newMixtape: Mixtape = { id: `mix-${Date.now()}`, name, description, songIds: [] };
        return updateCurrentUser({ mixtapes: [...currentUser!.mixtapes, newMixtape] });
    };
    const updateMixtape = (id: string, updates: Partial<Mixtape>) => {
        const newMixtapes = currentUser!.mixtapes.map(m => m.id === id ? { ...m, ...updates } : m);
        return updateCurrentUser({ mixtapes: newMixtapes });
    };
    const deleteMixtape = (id: string) => {
        const newMixtapes = currentUser!.mixtapes.filter(m => m.id !== id);
        const updates: Partial<User> = { mixtapes: newMixtapes };
        if (currentUser!.featuredMixtapeId === id) updates.featuredMixtapeId = null;
        return updateCurrentUser(updates);
    };
    const setFeaturedMixtape = (id: string | null) => updateCurrentUser({ featuredMixtapeId: id });
    
    const createLabel = (name: string, desc: string, pfp: string, joinType: 'open' | 'request') => dataService.createLabel(currentUser!, name, desc, pfp, joinType);
    const joinLabel = (id: string) => dataService.joinLabel(currentUser!.id, id);
    const leaveLabel = () => {
        if (!currentUser?.labelId) return Promise.resolve();
        return dataService.leaveLabel(currentUser.id, currentUser.labelId);
    };
    const updateLabelDetails = (id: string, details: Partial<RecordLabel>) => dataService.updateLabelDetails(id, details);
    const requestToJoinLabel = (id: string) => dataService.requestToJoinLabel(currentUser!, id);
    const reviewJoinRequest = (id: string, userId: string, decision: 'accept' | 'decline') => dataService.reviewJoinRequest(id, userId, decision);
    
    const challengeUser = (opponentId: string, deck: CollectedSong[]) => {
        const opponent = users.find(u => u.id === opponentId);
        if (!opponent) return Promise.reject("Opponent not found");
        const battle: Omit<SongBattle, 'id'> = { challengerId: currentUser!.id, challengerName: currentUser!.name, challengerPfpUrl: currentUser!.pfpUrl, opponentId, opponentName: opponent.name, opponentPfpUrl: opponent.pfpUrl, challengerDeck: deck, status: 'pending', createdAt: Date.now() };
        return addDoc(collection(db, 'songBattles'), battle).then(()=>{});
    };
    const acceptBattle = async (battleId: string, deck: CollectedSong[]) => {
        const battleDoc = await getDoc(doc(db, 'songBattles', battleId));
        if(!battleDoc.exists()) throw new Error("Battle not found");
        const battle = battleDoc.data() as SongBattle;
        const totalPowerSelf = deck.reduce((sum, s) => sum + s.song.id.length, 0); 
        const totalPowerChallenger = battle.challengerDeck.reduce((sum, s) => sum + s.song.id.length, 0);
        const winnerId = totalPowerSelf > totalPowerChallenger ? currentUser!.id : battle.challengerId;
        const winnerName = winnerId === currentUser!.id ? currentUser!.name : battle.challengerName;
        
        const report = await generateBattleReport(battle.challengerName, currentUser!.name, battle.challengerDeck, deck, winnerName);

        await updateDoc(doc(db, 'songBattles', battleId), { opponentDeck: deck, status: 'complete', winnerId, battleReport: report, completedAt: Date.now() });
    };
    const declineBattle = (battleId: string) => deleteDoc(doc(db, 'songBattles', battleId));
    
    const backupData = async () => {};
    const restoreData = async (file: File) => {};

    // --- REWARDS AND BOOSTS ---
    const claimReward = async (rewardId: string): Promise<EventReward['rewards'] | null> => {
        if (!currentUser) return null;
        try {
            return await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', currentUser.id);
                const rewardRef = doc(db, 'users', currentUser.id, 'rewards', rewardId);

                const [userDoc, rewardDoc] = await Promise.all([ transaction.get(userRef), transaction.get(rewardRef) ]);

                if (!userDoc.exists()) throw new Error("User not found.");
                if (!rewardDoc.exists()) throw new Error("Reward not found.");
                
                const userData = userDoc.data() as User;
                const rewardData = rewardDoc.data() as EventReward;

                if (rewardData.claimed) throw new Error("Reward already claimed.");

                const newInventory = { ...userData.inventory };
                if (rewardData.rewards.shinyCharms) newInventory.shinyCharms = (newInventory.shinyCharms || 0) + rewardData.rewards.shinyCharms;
                if (rewardData.rewards.shinyPolishers) newInventory.shinyPolishers = (newInventory.shinyPolishers || 0) + rewardData.rewards.shinyPolishers;
                if (rewardData.rewards.masteryXp) newInventory.masteryXp = (newInventory.masteryXp || 0) + rewardData.rewards.masteryXp;

                transaction.update(userRef, { inventory: newInventory });
                transaction.update(rewardRef, { claimed: true });
                
                return rewardData.rewards;
            });
        } catch (error) {
            console.error("Failed to claim reward:", error);
            addNotification({type: 'generic', message: `Error claiming reward: ${(error as Error).message}`});
            return null;
        }
    };
    
    const applyMasteryXp = async (artistId: string, amount: number) => {
        if (!currentUser) return;
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', currentUser.id);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found");

            const userData = userDoc.data() as User;
            const currentXpPool = userData.inventory.masteryXp || 0;
            if (amount <= 0 || amount > currentXpPool) {
                throw new Error("Invalid amount of XP to apply.");
            }

            const newInventory = { ...userData.inventory, masteryXp: currentXpPool - amount };
            const newMastery = { ...userData.artistMastery };

            if (newMastery[artistId]) {
                newMastery[artistId].xp += amount;
                // Recalculate level
                let newLevel = 0;
                for (const levelInfo of MASTERY_LEVELS) {
                    if (newMastery[artistId].xp >= levelInfo.xpThreshold) {
                        newLevel = levelInfo.level;
                    } else {
                        break; // Levels are sorted
                    }
                }
                newMastery[artistId].level = newLevel;
            } else {
                throw new Error("Cannot apply XP to an artist with no mastery record.");
            }
            transaction.update(userRef, { inventory: newInventory, artistMastery: newMastery });
        });
    };

    const activateShinyCharm = async () => {
        if (!currentUser || (currentUser.inventory.shinyCharms || 0) <= 0) return;
        await updateDoc(doc(db, 'users', currentUser.id), {
            'inventory.shinyCharms': increment(-1),
            shinyCharmUntil: Date.now() + 24 * 60 * 60 * 1000
        });
    };

    const applyShinyPolisher = async (collectedSongId: string) => {
        if (!currentUser || (currentUser.inventory.shinyPolishers || 0) <= 0) return;
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', currentUser.id);
            const songRef = doc(db, 'users', currentUser.id, 'collection', collectedSongId);
            
            transaction.update(userRef, { 'inventory.shinyPolishers': increment(-1) });
            transaction.update(songRef, { 'song.isShiny': true });
        });
    };

    // --- RAIDS ---
    const setRaidDeck = (songIds: string[]) => updateCurrentUser({ raidDeck: songIds });

    const attackRaidBoss = async () => {
        const activeRaid = labelRaids.find(r => r.isActive);
        if (!currentUser || !currentUser.labelId || !activeRaid) {
            addNotification({ type: 'generic', message: "No active raid to attack." });
            return;
        }

        try {
            const report = await performRaidAttack(currentUser, activeRaid);
            let message = `You dealt ${report.totalDamage.toLocaleString()} damage!`;
            if(report.dodgedAttacks > 0) {
                message += ` The boss dodged ${report.dodgedAttacks} of your attacks.`;
            }
            addNotification({ type: 'generic', message });
        } catch (error: any) {
            addNotification({ type: 'generic', message: `Attack failed: ${error.message}` });
        }
    };

    // FIX: Add room customization functions to satisfy UserContextType
    const updateUserRoom = (layout: RoomLayout): Promise<void> => {
        if (!currentUser) return Promise.resolve();
        return updateCurrentUser({ room: layout });
    };

    const value: UserContextType = {
        isLoading, currentUser, currentUserCollection, users, tradePosts, recordLabels, events, songBattles, globalActivityFeed, labelRaids,
        signIn, signUp, signOut, findMythicOwnerName, addSongsToCollection, updateCurrentUser, setFavoriteArtists, addFriend, removeFriend,
        createTradePost, cancelTradePost, makeOffer, reviewOffer, prestigeSong, createMixtape, updateMixtape, deleteMixtape,
        setFeaturedMixtape, updateShowcase, createLabel, joinLabel, leaveLabel, updateLabelDetails, requestToJoinLabel,
        reviewJoinRequest, challengeUser, acceptBattle, declineBattle, backupData, restoreData, viewingUser, isProfileModalOpen,
        viewingUserCollection, viewingUserShowcaseSongs, setViewingUser, chats, activeChatId, activeChatMessages, setActiveChatId,
        getOrCreateChat, sendMessage, activeLabelChatMessages, sendLabelChatMessage, toggleLabelMessageReaction,
        rewards, claimReward, applyMasteryXp, activateShinyCharm, applyShinyPolisher,
        setRaidDeck, attackRaidBoss,
        rewardPack,
        setRewardPack,
        viewingRoomForUser,
        setViewingRoomForUser,
        updateUserRoom,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};