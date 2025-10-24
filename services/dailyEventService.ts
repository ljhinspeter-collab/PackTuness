import React from 'react';
import {
  SparklesIcon,
  DiamondIcon,
  StarIcon,
  RectangleStackIcon,
  VinylIcon,
  MusicNoteIcon,
  CalendarDaysIcon,
  PackageIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from '../components/icons';

// Define the structure for an event
export interface HourlyEvent {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  dynamicDetail?: string;
}

// List of all 12 possible events
const ALL_EVENTS: Omit<HourlyEvent, 'dynamicDetail'>[] = [
  { id: 'SHINY_SURGE', name: 'Shiny Surge', description: 'Shiny chances are increased by 50% in all packs!', icon: SparklesIcon },
  { id: 'RARITY_RIOT', name: 'Rarity Riot', description: 'Increased chance for songs to be Rare or higher.', icon: DiamondIcon },
  { id: 'FAN_FAVORITES', name: 'Fan Favorites', description: 'Massively increased chance to pull a song from your favorite artists.', icon: StarIcon },
  { id: 'XP_EXPLOSION', name: 'XP Explosion', description: 'All Artist Mastery XP gains from new songs are doubled.', icon: RectangleStackIcon },
  { id: 'VINYL_PURSUIT', name: 'Vinyl Pursuit', description: 'For artists you have a Golden Vinyl of, their shiny chance is tripled!', icon: VinylIcon },
  { id: 'GENRE_JAM', name: 'Genre Jam', description: 'Increased chance to find songs from a specific genre.', icon: MusicNoteIcon },
  { id: 'DECADE_REWIND', name: 'Decade Rewind', description: 'Increased chance to find songs from a specific decade.', icon: CalendarDaysIcon },
  { id: 'BONUS_TRACKS', name: 'Bonus Tracks', description: 'Every pack has a 25% chance to contain an extra song.', icon: PackageIcon },
  { id: 'QUALITY_CONTROL', name: 'Quality Control', description: 'Every song in a pack is guaranteed to be at least Uncommon rarity.', icon: CheckCircleIcon },
  { id: 'MYTHIC_WHISPERS', name: 'Mythic Whispers', description: 'A mysterious aura slightly increases the chance of finding Mythic songs.', icon: DiamondIcon },
  { id: 'FRESH_FACES', name: 'Fresh Faces', description: 'Increased chance to discover songs from artists not yet in your collection.', icon: UsersIcon },
  { id: 'CHART_CLIMBERS', name: 'Chart Climbers', description: 'Increased chance to find songs from today\'s top global charts.', icon: ChartBarIcon },
];

const DYNAMIC_GENRES = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Indie', 'Jazz'];
const DYNAMIC_DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s'];

const EVENT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// A simple, deterministic pseudo-random number generator based on a seed
const pseudoRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

// Gets the scheduled event and time window for a specific date
const getEventScheduleForDate = (date: Date): { event: HourlyEvent, startTime: number, endTime: number } => {
    // Create a unique, consistent seed based on the date (YYYYMMDD)
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    
    // Determine the previous day's event to ensure we don't have a direct repeat
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    const yesterdaySeed = yesterday.getFullYear() * 10000 + (yesterday.getMonth() + 1) * 100 + yesterday.getDate();
    const yesterdayEventIndex = Math.floor(pseudoRandom(yesterdaySeed) * ALL_EVENTS.length);
    const yesterdayEvent = ALL_EVENTS[yesterdayEventIndex];

    const availableEvents = ALL_EVENTS.filter(e => e.id !== yesterdayEvent.id);
    
    // Pick today's event deterministically
    const todayEventIndex = Math.floor(pseudoRandom(seed) * availableEvents.length);
    const eventBase = availableEvents[todayEventIndex];
    
    // Generate the random start time for today
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    // Ensure the 15-min event doesn't start so late that it crosses over midnight
    const randomOffset = pseudoRandom(seed + 1) * (24 * 60 * 60 * 1000 - EVENT_DURATION_MS); 
    const startTime = dayStart + randomOffset;
    const endTime = startTime + EVENT_DURATION_MS;

    // Handle dynamic event details (Genre Jam, Decade Rewind)
    let dynamicDetail: string | undefined;
    if (eventBase.id === 'GENRE_JAM') {
        dynamicDetail = DYNAMIC_GENRES[Math.floor(pseudoRandom(seed + 2) * DYNAMIC_GENRES.length)];
    } else if (eventBase.id === 'DECADE_REWIND') {
        dynamicDetail = DYNAMIC_DECADES[Math.floor(pseudoRandom(seed + 3) * DYNAMIC_DECADES.length)];
    }

    const event: HourlyEvent = {
        ...eventBase,
        dynamicDetail,
        description: dynamicDetail ? `${eventBase.description} Today's theme: ${dynamicDetail}!` : eventBase.description,
    };

    return { event, startTime, endTime };
};


// Main function to be called from the UI. Determines the current state of the daily event.
export const getDailyEventState = (): { activeEvent: HourlyEvent | null, nextEventTime: number, eventEndTime: number | null } => {
    const now = Date.now();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todaySchedule = getEventScheduleForDate(today);

    // Case 1: The event is currently active
    if (now >= todaySchedule.startTime && now < todaySchedule.endTime) {
        return {
            activeEvent: todaySchedule.event,
            nextEventTime: getEventScheduleForDate(tomorrow).startTime, // The *next* event is tomorrow
            eventEndTime: todaySchedule.endTime,
        };
    }

    // Case 2: We are past today's event, so the next event is tomorrow's
    if (now >= todaySchedule.endTime) {
        const tomorrowSchedule = getEventScheduleForDate(tomorrow);
        return {
            activeEvent: null,
            nextEventTime: tomorrowSchedule.startTime,
            eventEndTime: null,
        };
    }
    
    // Case 3: We are before today's event has started
    return {
        activeEvent: null,
        nextEventTime: todaySchedule.startTime,
        eventEndTime: null,
    };
};
