import { collection, doc, getDocs, query, orderBy, limit, runTransaction, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { LabelEvent, EventTheme, RecordLabel, User, EventReward, Title } from '../types';
import { generateEventDetails } from './aiService';
import { dataService } from './dataService';
import { getTitleForWar } from '../data/titles';

const WAR_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOLDOWN_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 day
const CYCLE_DURATION = WAR_DURATION + COOLDOWN_DURATION;

const EVENT_THEMES: EventTheme[] = ['MYTHIC_MASTERS', 'SHINY_SHOWCASE', 'VINYL_VANGUARDS', 'TRADE_TITANS', 'MASTERY_MARATHON', 'RARITY_RUSH', 'FRESH_FACES'];

const THEME_POINTS: Record<EventTheme, number> = {
    MYTHIC_MASTERS: 100,
    SHINY_SHOWCASE: 10,
    VINYL_VANGUARDS: 500,
    TRADE_TITANS: 25,
    MASTERY_MARATHON: 20,
    RARITY_RUSH: 5, // 5 for Rare, 10 for Mythic (handled in scoring)
    FRESH_FACES: 5,
};

const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const getLatestEvent = async (): Promise<LabelEvent | null> => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LabelEvent;
};

const startNewWar = async (previousWarNumber: number) => {
    const now = Date.now();
    const warNumber = previousWarNumber + 1;
    
    // Deterministically pick a theme
    const themeIndex = Math.floor(pseudoRandom(warNumber) * EVENT_THEMES.length);
    const theme = EVENT_THEMES[themeIndex];

    const { title, description } = await generateEventDetails(theme);

    const newEvent: Omit<LabelEvent, 'id'> = {
        title,
        description,
        theme,
        startTime: now,
        endTime: now + WAR_DURATION,
        isActive: true,
        leaderboard: [],
        warNumber,
    };

    await dataService.addEvent(newEvent);
    console.log(`Started new Label War #${warNumber}: ${title}`);
};

const endCurrentWar = async (event: LabelEvent) => {
    console.log(`Ending Label War #${event.warNumber}: ${event.title}`);
    
    // Final score calculation
    const finalLeaderboard = await updateAllLeaderboards(event, true);
    
    // Top 3 labels
    const winners = finalLeaderboard.slice(0, 3);
    if (winners.length === 0) {
        console.log("No participating labels, ending war without rewards.");
        await dataService.endEvent(event.id, finalLeaderboard);
        return;
    }

    const rewardPromises: Promise<void>[] = [];

    // Distribute Trophies
    const trophyPromises = winners.map((winner, index) => {
        const rank = index + 1;
        const trophy = {
            eventId: event.id,
            eventName: event.title,
            theme: event.theme,
            rank,
            date: Date.now(),
            warNumber: event.warNumber,
        };
        return dataService.addTrophyToLabel(winner.labelId, trophy);
    });
    await Promise.all(trophyPromises);
    
    // Distribute Rewards
    // Rank 1
    if (winners[0]) {
        const title: Title = {
            id: `war-${event.warNumber}`,
            name: getTitleForWar(event.warNumber),
            description: `Awarded for 1st place in the ${event.warNumber}th Label War.`,
            warNumber: event.warNumber,
        };
        const rewards: EventReward['rewards'] = { shinyCharms: 2, shinyPolishers: 1, masteryXp: 5000, title };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[0].labelId, 1, rewards));
    }
    // Rank 2
    if (winners[1]) {
        const rewards: EventReward['rewards'] = { shinyCharms: 1, shinyPolishers: 1 };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[1].labelId, 2, rewards));
    }
    // Rank 3
    if (winners[2]) {
        const rewards: EventReward['rewards'] = { shinyCharms: 1 };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[2].labelId, 3, rewards));
    }
    await Promise.all(rewardPromises);

    await dataService.endEvent(event.id, finalLeaderboard);
    console.log(`War #${event.warNumber} ended. Rewards distributed.`);
};

export const manageEventCycle = async () => {
    try {
        // Read the latest event outside of a transaction. The logic is idempotent,
        // so race conditions are not critical. The timestamp checks will prevent
        // creating duplicate or premature events.
        const latestEvent = await getLatestEvent();
        const now = Date.now();

        if (!latestEvent) {
            // First time ever, start the first war.
            await startNewWar(0);
            return;
        }

        if (latestEvent.isActive) {
            if (now >= latestEvent.endTime) {
                // War has just ended, need to process it.
                await endCurrentWar(latestEvent);
            }
        } else { // In cooldown
            if (now >= latestEvent.endTime + COOLDOWN_DURATION) {
                // Cooldown is over, start a new war.
                await startNewWar(latestEvent.warNumber);
            }
        }
    } catch (error) {
        console.error("Error in manageEventCycle:", error);
    }
};

export const updateAllLeaderboards = async (event: LabelEvent, isFinal: boolean = false): Promise<LabelEvent['leaderboard']> => {
    const labels = await dataService.getAllLabels();
    const newLeaderboard: LabelEvent['leaderboard'] = [];

    for (const label of labels) {
        if (!label.memberIds || label.memberIds.length === 0) continue;
        
        let score = 0;
        const logs = await dataService.getEventLogsForLabel(label.id, event.startTime, event.endTime);
        
        for (const log of logs) {
            if (log.theme === event.theme) {
                score += log.points;
            }
        }
        newLeaderboard.push({ labelId: label.id, name: label.name, pfpUrl: label.pfpUrl, score });
    }
    
    newLeaderboard.sort((a,b) => b.score - a.score);

    await dataService.updateEventLeaderboard(event.id, newLeaderboard);
    return newLeaderboard;
};