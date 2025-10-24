import type { Challenge, User, CollectedSong, ChallengeLevel } from '../types';
import { Rarity } from '../types';

// Note: The icon components are no longer imported or used here directly.
// They will be looked up by name in the view layer.

const rawChallenges: (Omit<Challenge, 'levels' | 'checkProgress'> & { 
    levels: Omit<ChallengeLevel, 'challengeId'>[],
    checkProgress: (user: User, collection: CollectedSong[]) => number 
})[] = [
  {
    id: 'collection-size',
    title: "Collection Size",
    iconName: 'RectangleStackIcon',
    checkProgress: (user: User, collection: CollectedSong[]) => collection.length,
    levels: [
      { level: 1, threshold: 1, description: "Collect your first song", badge: { name: 'Newbie Collector', iconName: 'MusicNoteIcon', description: 'Collected your first song.' }},
      { level: 2, threshold: 50, description: "Collect 50 songs", badge: { name: 'Song Gatherer', iconName: 'MusicNoteIcon', description: 'Collected 50 songs.' }},
      { level: 3, threshold: 250, description: "Collect 250 songs", badge: { name: 'Music Hoarder', iconName: 'VinylIcon', description: 'Collected 250 songs.' }},
      { level: 4, threshold: 1000, description: "Collect 1,000 songs", badge: { name: 'Record Keeper', iconName: 'BuildingLibraryIcon', description: 'Collected 1,000 songs.' }},
      { level: 5, threshold: 5000, description: "Collect 5,000 songs", badge: { name: 'Archive Architect', iconName: 'BookOpenIcon', description: 'Collected 5,000 songs.' }},
      { level: 6, threshold: 10000, description: "Collect 10,000 songs", badge: { name: 'Librarian of Sound', iconName: 'DocumentTextIcon', description: 'Collected 10,000 songs.' }},
      { level: 7, threshold: 25000, description: "Collect 25,000 songs", badge: { name: 'Sonic Historian', iconName: 'GlobeAltIcon', description: 'Collected 25,000 songs.' }},
      { level: 8, threshold: 50000, description: "Collect 50,000 songs", badge: { name: 'Melodic Grandmaster', iconName: 'SparklesIcon', description: 'Collected 50,000 songs.' }},
      { level: 9, threshold: 100000, description: "Collect 100,000 songs", badge: { name: 'The Infinite Playlist', iconName: 'InfinityIcon', description: 'Collected 100,000 songs. An unparalleled collection.' }},
    ]
  },
  {
    id: 'artist-mastery',
    title: "Artist Mastery",
    iconName: 'PinIcon',
    checkProgress: (user: User) => Object.values(user.artistMastery).filter(m => m.level >= 1).length,
    levels: [
      { level: 1, threshold: 1, description: "Reach Level 1 with an artist", badge: { name: 'Artist Follower', iconName: 'PinIcon', description: 'Reached Mastery Level 1 with an artist.' }},
    ]
  },
  {
    id: 'mythic-collector',
    title: "Mythic Collector",
    iconName: 'DiamondIcon',
    checkProgress: (user: User, collection: CollectedSong[]) => collection.filter(c => c.song.rarity === Rarity.Mythic).length,
    levels: [
      { level: 1, threshold: 1, description: "Collect 1 Mythic song", badge: { name: 'Mythic Seeker', iconName: 'DiamondIcon', description: 'Collected 1 Mythic song.' }},
      { level: 2, threshold: 10, description: "Collect 10 Mythic songs", badge: { name: 'Legend Appraiser', iconName: 'DiamondIcon', description: 'Collected 10 Mythic songs.' }},
      { level: 3, threshold: 50, description: "Collect 50 Mythic songs", badge: { name: 'Hoard of Legends', iconName: 'DiamondIcon', description: 'Collected 50 Mythic songs.' }},
      { level: 4, threshold: 100, description: "Collect 100 Mythic songs", badge: { name: 'Pantheon Curator', iconName: 'DiamondIcon', description: 'Collected 100 Mythic songs.' }},
      { level: 5, threshold: 250, description: "Collect 250 Mythic songs", badge: { name: 'Mythic Deity', iconName: 'StarIcon', description: 'Collected 250 Mythic songs.' }},
      { level: 6, threshold: 500, description: "Collect 500 Mythic songs", badge: { name: 'Ethereal Being', iconName: 'FaceSmileIcon', description: 'Collected 500 Mythic songs.' }},
      { level: 7, threshold: 1000, description: "Collect 1,000 Mythic songs", badge: { name: 'God of Grooves', iconName: 'TrophyIcon', description: 'Collected 1,000 Mythic songs. You own the rarest sounds in existence.' }},
    ]
  },
  {
    id: 'shiny-hunter',
    title: "Shiny Hunter",
    iconName: 'SparklesIcon',
    checkProgress: (user: User, collection: CollectedSong[]) => collection.filter(c => c.song.isShiny).length,
    levels: [
      { level: 1, threshold: 1, description: "Find 1 Shiny song", badge: { name: 'Sparkle Spotter', iconName: 'SparklesIcon', description: 'Found 1 Shiny song.' }},
      { level: 2, threshold: 25, description: "Find 25 Shiny songs", badge: { name: 'Glimmer Gatherer', iconName: 'SparklesIcon', description: 'Found 25 Shiny songs.' }},
      { level: 3, threshold: 100, description: "Find 100 Shiny songs", badge: { name: 'Shine Collector', iconName: 'StarIcon', description: 'Found 100 Shiny songs.' }},
      { level: 4, threshold: 250, description: "Find 250 Shiny songs", badge: { name: 'Prismatic Legend', iconName: 'DiamondIcon', description: 'Found 250 Shiny songs.' }},
      { level: 5, threshold: 500, description: "Find 500 Shiny songs", badge: { name: 'Spectrum Sovereign', iconName: 'SparklesIcon', description: 'Found 500 Shiny songs.' }},
      { level: 6, threshold: 1000, description: "Find 1,000 Shiny songs", badge: { name: 'Auroral Entity', iconName: 'SparklesIcon', description: 'Found 1,000 Shiny songs.' }},
      { level: 7, threshold: 2000, description: "Find 2,000 Shiny songs", badge: { name: 'Master of Light', iconName: 'LightBulbIcon', description: 'Found 2,000 Shiny songs. Your collection is blindingly brilliant.' }},
    ]
  },
  {
    id: 'social-connector',
    title: "Social Connector",
    iconName: 'UsersIcon',
    checkProgress: (user: User) => user.friendIds.length,
    levels: [
      { level: 1, threshold: 1, description: "Add 1 friend", badge: { name: 'Friendly Face', iconName: 'UsersIcon', description: 'Added your first friend.' }},
      { level: 2, threshold: 10, description: "Add 10 friends", badge: { name: 'Social Butterfly', iconName: 'UsersIcon', description: 'Made 10 friends.' }},
      { level: 3, threshold: 25, description: "Add 25 friends", badge: { name: 'Community Pillar', iconName: 'UsersIcon', description: 'Made 25 friends.' }},
      { level: 4, threshold: 50, description: "Add 50 friends", badge: { name: 'Network Nexus', iconName: 'GlobeAltIcon', description: 'Made 50 friends.' }},
    ]
  },
  {
    id: 'tastemaker',
    title: "Tastemaker",
    iconName: 'StarIcon',
    checkProgress: (user: User) => user.favoriteArtists.length,
    levels: [
      { level: 1, threshold: 1, description: "Add 1 favorite artist", badge: { name: 'Good Taste', iconName: 'HandThumbUpIcon', description: 'Added a favorite artist.' }},
      { level: 2, threshold: 10, description: "Add 10 favorite artists", badge: { name: 'Curator', iconName: 'StarIcon', description: 'Favorited 10 artists.' }},
      { level: 3, threshold: 25, description: "Add 25 favorite artists", badge: { name: 'Super Fan', iconName: 'TrophyIcon', description: 'Favorited 25 artists.' }},
      { level: 4, threshold: 50, description: "Add 50 favorite artists", badge: { name: 'Music Mogul', iconName: 'ChartBarIcon', description: 'Favorited 50 artists.' }},
    ]
  },
];

// Add challengeId to each level for easier lookup
export const challenges: Challenge[] = rawChallenges.map(challenge => ({
    ...challenge,
    levels: challenge.levels.map(level => ({
        ...level,
        challengeId: challenge.id
    }))
}));