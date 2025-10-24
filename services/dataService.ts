import { db } from './firebase';
import { 
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, collectionGroup, runTransaction, orderBy, limit, arrayUnion, arrayRemove, increment, documentId
} from "firebase/firestore";
// FIX: Import Trophy, EventTheme, and Rarity types.
import type { User, TradePost, TradeOffer, RecordLabel, LabelEvent, SongBattle, GlobalActivity, CollectedSong, Song, JoinRequest, Chat, Message, LabelChatMessage, EventReward, Trophy, EventTheme } from '../types';
import { Rarity } from '../types';

export const LATEST_DATA_VERSION = 3;

// Collection References
const collections = {
    users: collection(db, 'users'),
    tradePosts: collection(db, 'tradePosts'),
    recordLabels: collection(db, 'recordLabels'),
    events: collection(db, 'events'),
    songBattles: collection(db, 'songBattles'),
    globalActivity: collection(db, 'globalActivity'),
    jailbrokenSongs: collection(db, 'jailbrokenSongs'),
    chats: collection(db, 'chats'),
    tradeLogs: collection(db, 'tradeLogs'),
    masteryLogs: collection(db, 'masteryLogs'),
    firstMythicOwners: collection(db, 'firstMythicOwners'),
};

const userSubCollection = (userId: string, subCollectionName: 'collection' | 'vinyls' | 'rewards') => {
    return collection(db, 'users', userId, subCollectionName);
};

class DataService {
    // --- User Management ---
    async getUser(userId: string): Promise<User | null> {
        const docRef = doc(collections.users, userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as User : null;
    }
    
    async createUserProfile(userId: string, email: string, name: string, bio: string): Promise<User> {
        const newUser: User = {
            id: userId,
            email: email.toLowerCase(),
            name,
            bio,
            pfpUrl: `https://i.pravatar.cc/150?u=${userId}`,
            favoriteArtists: [],
            friendIds: [],
            earnedBadges: [],
            vinyls: [],
            artistMastery: {},
            mixtapes: [],
            featuredMixtapeId: null,
            showcase: { proudestVinylIds: [] },
            labelId: null,
            pendingLabelRequests: [],
            dataVersion: LATEST_DATA_VERSION,
            prestigeCount: 0,
            collectionSize: 0,
            shinyHuntArtistId: null,
            inventory: {
                shinyCharms: 0,
                shinyPolishers: 0,
                masteryXp: 0,
            },
            earnedTitles: [],
            activeTitleId: null,
        };
        await setDoc(doc(collections.users, userId), newUser);
        return newUser;
    }

    // @ts-ignore
    async updateUser(userId: string, data: any): Promise<void> {
        await updateDoc(doc(collections.users, userId), data);
    }
    
     async getUsersByIds(userIds: string[]): Promise<User[]> {
        if (userIds.length === 0) return [];
        const users: User[] = [];
        const chunkSize = 30; // Firestore 'in' query limit is 30
        for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            if (chunk.length > 0) {
                const q = query(collections.users, where('id', 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    users.push(doc.data() as User);
                });
            }
        }
        return users;
    }

    // --- Collection Management ---
    async getCollectionForUser(userId: string): Promise<CollectedSong[]> {
        const collectionRef = userSubCollection(userId, 'collection');
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => doc.data() as CollectedSong);
    }
    
    async getShowcaseSongs(userId: string, songIds: { favoriteSongId?: string, rarestSongId?: string }): Promise<{ favoriteSong?: CollectedSong, rarestSong?: CollectedSong }> {
        const result: { favoriteSong?: CollectedSong, rarestSong?: CollectedSong } = {};

        if (songIds.favoriteSongId) {
            const docRef = doc(db, 'users', userId, 'collection', songIds.favoriteSongId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) result.favoriteSong = docSnap.data() as CollectedSong;
        }

        if (songIds.rarestSongId) {
            const docRef = doc(db, 'users', userId, 'collection', songIds.rarestSongId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) result.rarestSong = docSnap.data() as CollectedSong;
        }
        return result;
    }

    async findMythicOwnerName(songId: string, serialNumber: number): Promise<string | null> {
        const ownerDocRef = doc(db, 'firstMythicOwners', songId);
        try {
            const ownerDocSnap = await getDoc(ownerDocRef);

            if (ownerDocSnap.exists()) {
                return ownerDocSnap.data().ownerName || null;
            }
            
            return null;

        } catch (error) {
            console.error("Error fetching from firstMythicOwners:", error);
            return null; 
        }
    }
    
    async fixNullMythicSerials(userId: string, collection: CollectedSong[]): Promise<void> {
        const songsToFix = collection.filter(cs => cs.song.rarity === Rarity.Mythic && (cs.serialNumber === null || cs.serialNumber === undefined));

        if (songsToFix.length === 0) {
            return;
        }

        console.log(`Found ${songsToFix.length} Mythic song(s) with null serial numbers. Attempting to fix...`);

        const groupedBySongId: { [songId: string]: CollectedSong[] } = {};
        for (const cs of songsToFix) {
            if (!groupedBySongId[cs.song.id]) {
                groupedBySongId[cs.song.id] = [];
            }
            groupedBySongId[cs.song.id].push(cs);
        }
        
        for (const songId in groupedBySongId) {
            try {
                await runTransaction(db, async (transaction) => {
                    const serialRef = doc(db, 'mythicSerials', songId);
                    const serialDoc = await transaction.get(serialRef);
                    let currentCount = serialDoc.exists() ? serialDoc.data().count : 0;
        
                    const songsForThisId = groupedBySongId[songId];
                    console.log(`Fixing ${songsForThisId.length} copies of song ${songId}. Starting from serial #${currentCount + 1}`);

                    for (const collectedSong of songsForThisId) {
                        currentCount++;
                        const songRef = doc(db, 'users', userId, 'collection', collectedSong.id);
                        transaction.update(songRef, { serialNumber: currentCount });
                    }
        
                    transaction.set(serialRef, { count: currentCount }, { merge: true });
                });
                console.log(`Successfully fixed serial numbers for song ${songId}.`);
            } catch (error) {
                console.error(`Failed to fix serial numbers for song ${songId}:`, error);
            }
        }
    }

    async getAllFirstMythicOwners(): Promise<{ songId: string; ownerName: string }[]> {
        const q = query(collections.firstMythicOwners);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            songId: doc.id,
            ownerName: doc.data().ownerName
        }));
    }


    async getFirstMythicOwnerRecords(songIds: string[]): Promise<{ id: string }[]> {
        if (songIds.length === 0) return [];
        const ownerRecords: { id: string }[] = [];
        const chunkSize = 30; 
        for (let i = 0; i < songIds.length; i += chunkSize) {
            const chunk = songIds.slice(i, i + chunkSize);
            if (chunk.length > 0) {
                const q = query(collection(db, 'firstMythicOwners'), where(documentId(), 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    ownerRecords.push({ id: doc.id });
                });
            }
        }
        return ownerRecords;
    }
    
    async addSongsToCollection(userId: string, songs: CollectedSong[]): Promise<void> {
        const batch = writeBatch(db);
        const collectionRef = userSubCollection(userId, 'collection');
        songs.forEach(song => {
            const docRef = doc(collectionRef, song.id);
            batch.set(docRef, song);
        });
        await batch.commit();
    }
    
    // --- Global Activity ---
    async addGlobalActivity(activity: Omit<GlobalActivity, 'id'>): Promise<void> {
        await addDoc(collections.globalActivity, activity);
    }

    // --- Events ---
    // FIX: Changed addEvent to not require an ID and use addDoc to auto-generate one.
    async addEvent(eventData: Omit<LabelEvent, 'id'>) {
        await addDoc(collections.events, eventData);
    }

    // FIX: Added endEvent method to update an event as inactive.
    async endEvent(eventId: string, finalLeaderboard: LabelEvent['leaderboard']): Promise<void> {
        const eventRef = doc(collections.events, eventId);
        await updateDoc(eventRef, {
            isActive: false,
            leaderboard: finalLeaderboard,
            leaderboardLastUpdated: Date.now()
        });
    }
    
    // FIX: Added addTrophyToLabel method to add a trophy to a label's record.
    async addTrophyToLabel(labelId: string, trophy: Trophy): Promise<void> {
        const labelRef = doc(collections.recordLabels, labelId);
        await updateDoc(labelRef, {
            trophies: arrayUnion(trophy)
        });
    }
    
    // FIX: Added distributeRewardsToLabel to create reward documents for all members of a winning label.
    async distributeRewardsToLabel(event: LabelEvent, labelId: string, rank: number, rewards: EventReward['rewards']): Promise<void> {
        const labelDoc = await getDoc(doc(collections.recordLabels, labelId));
        if (!labelDoc.exists()) return;

        const memberIds = labelDoc.data().memberIds || [];
        if (memberIds.length === 0) return;
        
        const batch = writeBatch(db);

        memberIds.forEach((memberId: string) => {
            const rewardDocRef = doc(collection(db, 'users', memberId, 'rewards'));
            const newReward: Omit<EventReward, 'id'> = {
                eventId: event.id,
                eventName: event.title,
                rank,
                rewards,
                claimed: false,
                timestamp: Date.now(),
            };
            batch.set(rewardDocRef, newReward);
        });

        await batch.commit();
    }
    
    // FIX: Added getAllLabels to fetch all record labels.
    async getAllLabels(): Promise<RecordLabel[]> {
        const snapshot = await getDocs(collections.recordLabels);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RecordLabel);
    }

    // FIX: Added getLabel to fetch a single record label by ID.
    async getLabel(labelId: string): Promise<RecordLabel | null> {
        const docRef = doc(collections.recordLabels, labelId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data } as RecordLabel : null;
    }

    // FIX: Added getEventLogsForLabel to fetch and process logs for event scoring.
    async getEventLogsForLabel(labelId: string, startTime: number, endTime: number): Promise<{ theme: EventTheme; points: number; detail?: string; }[]> {
        const label = await this.getLabel(labelId);
        if (!label || !label.memberIds) return [];

        const memberIds = label.memberIds;
        if (memberIds.length === 0) return [];
        
        const logs: { theme: EventTheme; points: number; detail?: string; }[] = [];
        const collectedArtistsThisEvent = new Set<string>();
        
        const THEME_POINTS: Record<EventTheme, number> = {
            MYTHIC_MASTERS: 100,
            SHINY_SHOWCASE: 10,
            VINYL_VANGUARDS: 500,
            TRADE_TITANS: 25,
            MASTERY_MARATHON: 20,
            RARITY_RUSH: 5, // 5 for Rare, 10 for Mythic (handled in scoring)
            FRESH_FACES: 5,
        };

        const CHUNK_SIZE = 30; // Firestore 'in' query limit
        for (let i = 0; i < memberIds.length; i += CHUNK_SIZE) {
            const chunk = memberIds.slice(i, i + CHUNK_SIZE);

            // Trade logs
            const tradeQuery1 = query(collections.tradeLogs, where('sellerId', 'in', chunk), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime));
            const tradeQuery2 = query(collections.tradeLogs, where('buyerId', 'in', chunk), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime));
            const [tradeSnapshot1, tradeSnapshot2] = await Promise.all([getDocs(tradeQuery1), getDocs(tradeQuery2)]);
            tradeSnapshot1.forEach(() => logs.push({ theme: 'TRADE_TITANS', points: THEME_POINTS.TRADE_TITANS }));
            tradeSnapshot2.forEach(() => logs.push({ theme: 'TRADE_TITANS', points: THEME_POINTS.TRADE_TITANS }));
            
            // Mastery logs
            const masteryQuery = query(collections.masteryLogs, where('userId', 'in', chunk), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime));
            const masterySnapshot = await getDocs(masteryQuery);
            masterySnapshot.forEach((doc) => {
                const log = doc.data();
                // Add points for the Mastery Marathon theme for any level up
                logs.push({ theme: 'MASTERY_MARATHON', points: THEME_POINTS.MASTERY_MARATHON });

                // Also grant points for the Mythic Masters theme if a user reaches the highest mastery level
                if (log.level === 4) { // Level 4 is "Master"
                    logs.push({ theme: 'MYTHIC_MASTERS', points: 50 }); // Award 50 points for this major achievement
                }
            });

            // Global Activity logs
            const activityQuery = query(collections.globalActivity, where('userId', 'in', chunk), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime));
            const activitySnapshot = await getDocs(activityQuery);
            
            activitySnapshot.forEach(doc => {
                const activity = doc.data() as GlobalActivity;

                if (activity.song) { // This activity is about a song pull/craft
                    const song = activity.song;
                    
                    // FRESH_FACES
                    if (song.artistId && !collectedArtistsThisEvent.has(song.artistId)) {
                        logs.push({ theme: 'FRESH_FACES', points: THEME_POINTS.FRESH_FACES });
                        collectedArtistsThisEvent.add(song.artistId);
                    }

                    // SHINY_SHOWCASE
                    if (song.isShiny) {
                        logs.push({ theme: 'SHINY_SHOWCASE', points: THEME_POINTS.SHINY_SHOWCASE });
                    }

                    // MYTHIC_MASTERS
                    if (song.rarity === Rarity.Mythic) {
                        logs.push({ theme: 'MYTHIC_MASTERS', points: THEME_POINTS.MYTHIC_MASTERS });
                    }
                    
                    // RARITY_RUSH
                    if (song.rarity === Rarity.Mythic) {
                        logs.push({ theme: 'RARITY_RUSH', points: 10 });
                    } else if (song.rarity === Rarity.Rare) {
                        logs.push({ theme: 'RARITY_RUSH', points: THEME_POINTS.RARITY_RUSH });
                    }
                }

                if (activity.vinyl) { // This activity is about crafting a vinyl
                    // VINYL_VANGUARDS
                    logs.push({ theme: 'VINYL_VANGUARDS', points: THEME_POINTS.VINYL_VANGUARDS });
                }
            });
        }
        return logs;
    }

    // FIX: Added updateEventLeaderboard to update an event's leaderboard.
    async updateEventLeaderboard(eventId: string, leaderboard: LabelEvent['leaderboard']): Promise<void> {
        const eventRef = doc(collections.events, eventId);
        await updateDoc(eventRef, {
            leaderboard: leaderboard,
            leaderboardLastUpdated: Date.now()
        });
    }

    async logTrade(sellerId: string, buyerId: string) {
        await addDoc(collections.tradeLogs, {
            sellerId,
            buyerId,
            timestamp: Date.now()
        });
    }

    async logMasteryLevelUp(userId: string, artistId: string, level: number) {
        await addDoc(collections.masteryLogs, {
            userId,
            artistId,
            level,
            timestamp: Date.now()
        });
    }
    
    // --- Jailbroken Songs ---
    async getJailbrokenSongIds(): Promise<Set<string>> {
        const snapshot = await getDocs(collections.jailbrokenSongs);
        return new Set(snapshot.docs.map(doc => doc.id));
    }
    
    async addJailbrokenSongId(songId: string): Promise<void> {
        await setDoc(doc(collections.jailbrokenSongs, songId), { pulled: true });
    }
    
    // --- Trading ---
    async createTradePost(user: User, songToTrade: CollectedSong, seeking: string): Promise<void> {
        const newPost: Omit<TradePost, 'id'> = {
            ownerId: user.id,
            ownerName: user.name,
            ownerPfpUrl: user.pfpUrl,
            songToTrade,
            seeking,
            offers: [],
            status: 'open',
            createdAt: Date.now(),
        };
        await addDoc(collections.tradePosts, newPost);
    }
    
    async cancelTradePost(tradeId: string): Promise<void> {
        await deleteDoc(doc(collections.tradePosts, tradeId));
    }

    async makeOffer(tradeId: string, offeringUser: User, songsOffered: CollectedSong[]): Promise<void> {
        const newOffer: Omit<TradeOffer, 'id'> = {
            tradeId,
            offeredById: offeringUser.id,
            offeredByName: offeringUser.name,
            offeredByPfpUrl: offeringUser.pfpUrl,
            songsOffered,
            status: 'pending',
        };
        await updateDoc(doc(collections.tradePosts, tradeId), {
            offers: arrayUnion({ ...newOffer, id: `offer-${Date.now()}` })
        });
    }

    async processOffer(tradeId: string, offerId: string, decision: 'accepted' | 'declined'): Promise<void> {
       await runTransaction(db, async (transaction) => {
            const tradeRef = doc(collections.tradePosts, tradeId);
            const tradeDoc = await transaction.get(tradeRef);
            if (!tradeDoc.exists()) throw new Error("Trade not found!");

            const tradeData = tradeDoc.data() as TradePost;
            const offerIndex = tradeData.offers.findIndex(o => o.id === offerId);
            if (offerIndex === -1) throw new Error("Offer not found!");
            
            const offer = tradeData.offers[offerIndex];
            if (offer.status !== 'pending') throw new Error("Offer already processed!");
            
            if (decision === 'accepted') {
                const sellerId = tradeData.ownerId;
                const buyerId = offer.offeredById;
                const songToSeller = tradeData.songToTrade;
                const songsToBuyer = offer.songsOffered;
                
                const sellerRef = doc(collections.users, sellerId);
                const buyerRef = doc(collections.users, buyerId);

                for (const song of songsToBuyer) {
                    const newSongRef = doc(userSubCollection(sellerId, 'collection'), song.id);
                    transaction.set(newSongRef, { ...song, ownerId: sellerId });
                }

                const newSongRef = doc(userSubCollection(buyerId, 'collection'), songToSeller.id);
                transaction.set(newSongRef, { ...songToSeller, ownerId: buyerId });

                const originalSellerSongRef = doc(userSubCollection(sellerId, 'collection'), songToSeller.id);
                transaction.delete(originalSellerSongRef);

                for (const song of songsToBuyer) {
                    const originalBuyerSongRef = doc(userSubCollection(buyerId, 'collection'), song.id);
                    transaction.delete(originalBuyerSongRef);
                }

                const sellerSizeChange = songsToBuyer.length - 1;
                const buyerSizeChange = 1 - songsToBuyer.length;
                transaction.update(sellerRef, { collectionSize: increment(sellerSizeChange) });
                transaction.update(buyerRef, { collectionSize: increment(buyerSizeChange) });

                tradeData.status = 'closed';
                tradeData.offers.forEach((o, i) => {
                    if (o.id === offerId) o.status = 'accepted';
                    else if (o.status === 'pending') o.status = 'declined';
                });
                transaction.update(tradeRef, { status: 'closed', offers: tradeData.offers });
                
                // Log the trade for event scoring
                const logRef = doc(collection(db, 'tradeLogs'));
                transaction.set(logRef, {
                    sellerId,
                    buyerId,
                    timestamp: Date.now()
                });

            } else { // declined
                tradeData.offers[offerIndex].status = 'declined';
                transaction.update(tradeRef, { offers: tradeData.offers });
            }
        });
    }

    async prestigeSong(userId: string, artistId: string, mythicId: string, shinyIds: string[]): Promise<void> {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(collections.users, userId);
            const mythicRef = doc(userSubCollection(userId, 'collection'), mythicId);
            const shinyRefs = shinyIds.map(id => doc(userSubCollection(userId, 'collection'), id));
            
            const [userDoc, mythicDoc, ...shinyDocs] = await Promise.all([
                transaction.get(userRef),
                transaction.get(mythicRef),
                ...shinyRefs.map(ref => transaction.get(ref))
            ]);

            if (!userDoc.exists()) throw new Error("User not found");
            if (!mythicDoc.exists()) throw new Error("Mythic song not found");
            shinyDocs.forEach((doc, index) => { if (!doc.exists()) throw new Error(`Shiny song ${shinyIds[index]} not found`) });

            const userData = userDoc.data() as User;
            const mythicData = mythicDoc.data() as CollectedSong;

            const prestigeCounterRef = doc(db, 'prestigeCounters', mythicData.song.id);
            const prestigeCounterDoc = await transaction.get(prestigeCounterRef);
            const newSerialNumber = (prestigeCounterDoc.data()?.count || 0) + 1;
            
            shinyRefs.forEach(ref => transaction.delete(ref));
            
            transaction.update(mythicRef, {
                isPrestige: true,
                prestigedAt: Date.now(),
                serialNumber: newSerialNumber,
            });

            const newPrestigeCount = (userData.prestigeCount || 0) + 1;
            const newMastery = { ...userData.artistMastery };
            if (newMastery[artistId]) {
                newMastery[artistId].xp = 0; 
                newMastery[artistId].level = 0;
            }
            transaction.update(userRef, {
                prestigeCount: newPrestigeCount,
                artistMastery: newMastery,
                collectionSize: increment(-5)
            });

            transaction.set(prestigeCounterRef, { count: newSerialNumber });
        });
    }
    
    // --- Labels ---
    async createLabel(owner: User, name: string, description: string, pfpUrl: string, joinType: 'open' | 'request'): Promise<void> {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(collections.users, owner.id);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists() || userDoc.data().labelId) throw new Error("User is already in a label.");

            const newLabelRef = doc(collection(db, 'recordLabels'));
            const newLabel: Omit<RecordLabel, 'id'> = { name, description, pfpUrl, joinType, ownerId: owner.id, memberIds: [owner.id], pendingRequests: [], trophies: [] };
            
            transaction.set(newLabelRef, newLabel);
            transaction.update(userRef, { labelId: newLabelRef.id });
        });
    }

    async joinLabel(userId: string, labelId: string): Promise<void> {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(collections.users, userId);
            const labelRef = doc(collections.recordLabels, labelId);

            const userDoc = await transaction.get(userRef);
            const labelDoc = await transaction.get(labelRef);

            if (!userDoc.exists() || userDoc.data().labelId) throw new Error("User is already in a label.");
            if (!labelDoc.exists() || labelDoc.data().joinType !== 'open') throw new Error("Label is not open for joining.");
            if ((labelDoc.data().memberIds?.length || 0) >= 25) throw new Error("Label is full.");

            transaction.update(labelRef, { memberIds: arrayUnion(userId) });
            transaction.update(userRef, { labelId });
        });
    }

    async leaveLabel(userId: string, labelId: string): Promise<void> {
         await runTransaction(db, async (transaction) => {
            const userRef = doc(collections.users, userId);
            const labelRef = doc(collections.recordLabels, labelId);

            transaction.update(labelRef, { memberIds: arrayRemove(userId) });
            transaction.update(userRef, { labelId: null });
        });
    }

    async updateLabelDetails(labelId: string, details: Partial<RecordLabel>): Promise<void> {
        await updateDoc(doc(collections.recordLabels, labelId), details);
    }
    
    async requestToJoinLabel(user: User, labelId: string): Promise<void> {
         await runTransaction(db, async (transaction) => {
            const userRef = doc(collections.users, user.id);
            const labelRef = doc(collections.recordLabels, labelId);

            const newRequest: JoinRequest = { userId: user.id, userName: user.name, userPfpUrl: user.pfpUrl, requestedAt: Date.now() };

            transaction.update(labelRef, { pendingRequests: arrayUnion(newRequest) });
            transaction.update(userRef, { pendingLabelRequests: arrayUnion(labelId) });
        });
    }

    async reviewJoinRequest(labelId: string, userId: string, decision: 'accept' | 'decline'): Promise<void> {
       await runTransaction(db, async (transaction) => {
           const labelRef = doc(collections.recordLabels, labelId);
           const userRef = doc(collections.users, userId);
           
           const [labelDoc, userDoc] = await Promise.all([
               transaction.get(labelRef),
               transaction.get(userRef)
           ]);

           if (!labelDoc.exists()) throw new Error("Label not found.");
           if (!userDoc.exists()) throw new Error("User not found.");
           
           const labelData = labelDoc.data() as RecordLabel;
           const updatedRequests = (labelData.pendingRequests || []).filter(r => r.userId !== userId);
   
           if (decision === 'accept') {
               if ((labelData.memberIds?.length || 0) >= 25) throw new Error("Label is full.");
               
               transaction.update(labelRef, { 
                   memberIds: arrayUnion(userId), 
                   pendingRequests: updatedRequests 
               });

               transaction.update(userRef, {
                   labelId: labelId,
                   pendingLabelRequests: arrayRemove(labelId)
               });
           } else { 
               transaction.update(labelRef, { 
                   pendingRequests: updatedRequests 
               });

               transaction.update(userRef, {
                   pendingLabelRequests: arrayRemove(labelId)
               });
           }
       });
   }
    
    // --- Rewards ---
    async applyShinyPolisherToSong(userId: string, collectedSongId: string): Promise<void> {
        const songRef = doc(db, 'users', userId, 'collection', collectedSongId);
        await updateDoc(songRef, { 'song.isShiny': true });
    }

    // --- Chat ---
    async getOrCreateChat(currentUser: User, otherUser: User): Promise<string> {
        const participantIds = [currentUser.id, otherUser.id].sort();
        const chatId = participantIds.join('_');
        const chatRef = doc(collections.chats, chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            const newChat: Chat = {
                id: chatId,
                participantIds,
                participantInfo: {
                    [currentUser.id]: { name: currentUser.name, pfpUrl: currentUser.pfpUrl },
                    [otherUser.id]: { name: otherUser.name, pfpUrl: otherUser.pfpUrl },
                },
            };
            await setDoc(chatRef, newChat);
        }
        return chatId;
    }

    async sendMessage(chatId: string, senderId: string, text: string): Promise<void> {
        const chatRef = doc(collections.chats, chatId);
        const messagesRef = collection(chatRef, 'messages');
        const timestamp = Date.now();

        const newMessage: Omit<Message, 'id'> = {
            senderId,
            text,
            timestamp,
        };
        
        const batch = writeBatch(db);
        
        const newMsgRef = doc(messagesRef);
        batch.set(newMsgRef, newMessage);

        batch.update(chatRef, {
            lastMessage: {
                text,
                timestamp
            }
        });
        
        await batch.commit();
    }
    
    async sendLabelChatMessage(labelId: string, user: User, text: string): Promise<void> {
        const messagesRef = collection(db, 'recordLabels', labelId, 'chatMessages');
        const newMessage: Omit<LabelChatMessage, 'id'> = {
            labelId,
            senderId: user.id,
            senderName: user.name,
            senderPfpUrl: user.pfpUrl,
            text,
            timestamp: Date.now(),
            reactions: {},
        };
        await addDoc(messagesRef, newMessage);
    }
    
    async toggleReaction(labelId: string, messageId: string, emoji: string, userId: string): Promise<void> {
        const messageRef = doc(db, 'recordLabels', labelId, 'chatMessages', messageId);
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) throw new Error("Message not found");

            const messageData = messageDoc.data() as LabelChatMessage;
            const reactions = messageData.reactions || {};
            const userList = reactions[emoji] || [];

            if (userList.includes(userId)) {
                const updatedUserList = userList.filter(id => id !== userId);
                if (updatedUserList.length === 0) {
                    delete reactions[emoji];
                } else {
                    reactions[emoji] = updatedUserList;
                }
            } else {
                reactions[emoji] = [...userList, userId];
            }
            
            transaction.update(messageRef, { reactions });
        });
    }
}

export const dataService = new DataService();