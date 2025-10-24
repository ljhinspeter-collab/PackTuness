import { collection, doc, getDoc, runTransaction, query, orderBy, limit, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { LabelRaid, User, CollectedSong, EventReward } from '../types';
import { Rarity } from '../types';
import { dataService } from './dataService';
import { generateRaidBossImage } from './aiService';

const RAID_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days
const RAID_COOLDOWN = 4 * 24 * 60 * 60 * 1000; // 4 days
const DECK_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours

const getLatestRaid = async (): Promise<LabelRaid | null> => {
    const q = query(collection(db, 'labelRaids'), orderBy('startTime', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LabelRaid;
};

const startNewRaid = async () => {
    const now = Date.now();
    
    const bossArtUrl = await generateRaidBossImage("The Static Phantom");

    // In a real app, boss details would come from a database or config file
    const newRaid: Omit<LabelRaid, 'id'> = {
        title: "Raid: The Static Phantom",
        bossName: "The Static Phantom",
        bossArtUrl: bossArtUrl,
        description: "A mysterious entity is corrupting the soundwaves! Work with your label to defeat it and restore harmony.",
        totalHp: 50000000,
        currentHp: 50000000,
        startTime: now,
        endTime: now + RAID_DURATION,
        isActive: true,
        recentAttacks: { artists: [], rarities: [] },
        leaderboard: [],
    };

    await addDoc(collection(db, 'labelRaids'), newRaid);
    console.log(`Started new Label Raid: ${newRaid.title}`);
};

const endCurrentRaid = async (raid: LabelRaid) => {
    console.log(`Ending Label Raid: ${raid.title}`);
    await updateDoc(doc(db, 'labelRaids', raid.id), { isActive: false });

    if (raid.currentHp <= 0) {
        // Boss defeated! Distribute rewards to all participating labels.
        const participatingLabelIds = new Set(raid.leaderboard.map(entry => {
            const member = dataService.getUsersByIds([entry.userId]); // A bit inefficient, would be better if user had labelId
            // This part is complex without a direct user->label mapping readily available on the client.
            // For now, let's assume we can figure this out and reward participants.
            // In a real scenario, the attack log would store the labelId.
        }));

        // For simplicity, let's reward all unique participants directly
        const participants = Array.from(new Set(raid.leaderboard.map(l => l.userId)));
        const batch = runTransaction(db, async transaction => {
            for(const userId of participants) {
                const rewardRef = doc(collection(db, 'users', userId, 'rewards'));
                const newReward: Omit<EventReward, 'id'> = {
                    eventId: raid.id,
                    eventName: `Victory: ${raid.title}`,
                    rank: 1, // Everyone is a winner
                    rewards: { shinyPolishers: 1, masteryXp: 2000 },
                    claimed: false,
                    timestamp: Date.now(),
                };
                transaction.set(rewardRef, newReward);
            }
        });
        await batch;
        console.log(`Raid boss defeated! Rewards distributed to ${participants.length} participants.`);
    }
};

export const manageRaidCycle = async () => {
    try {
        const latestRaid = await getLatestRaid();
        const now = Date.now();

        if (!latestRaid) {
            await startNewRaid();
            return;
        }

        if (latestRaid.isActive) {
            if (now >= latestRaid.endTime) {
                await endCurrentRaid(latestRaid);
            }
        } else { // In cooldown
            if (now >= latestRaid.endTime + RAID_COOLDOWN) {
                await startNewRaid();
            }
        }
    } catch (error) {
        console.error("Error in manageRaidCycle:", error);
    }
};

const getDamageValue = (song: CollectedSong): number => {
    const rarityPoints: Record<Rarity, number> = { 
        [Rarity.Common]: 100, 
        [Rarity.Uncommon]: 250, 
        [Rarity.Rare]: 800, 
        [Rarity.Mythic]: 3000,
        [Rarity.Jailbroken]: 25000,
    };
    let damage = rarityPoints[song.song.rarity] || 0;
    if (song.song.isShiny) damage *= 1.5;
    if (song.isPrestige) damage *= 2;
    return Math.floor(damage);
};

export const attackRaidBoss = async (user: User, raid: LabelRaid): Promise<{ totalDamage: number, dodgedAttacks: number }> => {
    if (user.raidCooldownUntil && user.raidCooldownUntil > Date.now()) {
        throw new Error("Your raid deck is still on cooldown.");
    }
    if (!user.raidDeck || user.raidDeck.length !== 10) {
        throw new Error("You must set a 10-song raid deck before attacking.");
    }

    let totalDamage = 0;
    let dodgedAttacks = 0;
    const newRecentArtists: { id: string, timestamp: number }[] = [];
    const newRecentRarities: { type: Rarity, timestamp: number }[] = [];

    await runTransaction(db, async (transaction) => {
        const raidRef = doc(db, 'labelRaids', raid.id);
        const userRef = doc(db, 'users', user.id);
        const raidDoc = await transaction.get(raidRef);
        if (!raidDoc.exists()) throw new Error("Raid not found.");

        const currentRaid = raidDoc.data() as LabelRaid;
        if (!currentRaid.isActive) throw new Error("This raid is no longer active.");

        const userSongDocs = await Promise.all(user.raidDeck!.map(id => getDoc(doc(db, 'users', user.id, 'collection', id))));
        const deck: CollectedSong[] = userSongDocs.map(doc => doc.data() as CollectedSong);

        // Dodge mechanics
        const recentArtists = currentRaid.recentAttacks.artists.slice(-10).map(a => a.id);
        const recentRarities = currentRaid.recentAttacks.rarities.slice(-5).map(r => r.type);

        deck.forEach(song => {
            let dodgeChance = 0;
            if (recentArtists.includes(song.song.artist.id)) dodgeChance += 0.5;
            if (recentRarities.includes(song.song.rarity)) dodgeChance += 0.3;

            if (Math.random() < dodgeChance) {
                dodgedAttacks++;
            } else {
                totalDamage += getDamageValue(song);
            }
            newRecentArtists.push({ id: song.song.artist.id, timestamp: Date.now() });
            newRecentRarities.push({ type: song.song.rarity, timestamp: Date.now() });
        });

        // Update raid state
        const newHp = Math.max(0, currentRaid.currentHp - totalDamage);
        const updatedRecentAttacks = {
            artists: [...currentRaid.recentAttacks.artists, ...newRecentArtists].slice(-20),
            rarities: [...currentRaid.recentAttacks.rarities, ...newRecentRarities].slice(-10)
        };
        const newLeaderboard = [...currentRaid.leaderboard];
        const userIndex = newLeaderboard.findIndex(u => u.userId === user.id);
        if (userIndex > -1) {
            newLeaderboard[userIndex].damageDealt += totalDamage;
        } else {
            newLeaderboard.push({ userId: user.id, userName: user.name, userPfpUrl: user.pfpUrl, damageDealt: totalDamage });
        }
        newLeaderboard.sort((a,b) => b.damageDealt - a.damageDealt);

        transaction.update(raidRef, { 
            currentHp: newHp,
            recentAttacks: updatedRecentAttacks,
            leaderboard: newLeaderboard,
        });

        // Update user cooldown
        transaction.update(userRef, { raidCooldownUntil: Date.now() + DECK_COOLDOWN });
    });

    return { totalDamage, dodgedAttacks };
};