

import type { FC } from 'react';

export enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Mythic = 'Mythic',
  Jailbroken = 'Jailbroken',
}

export interface Song {
  id: string;
  title: string;
  artist: {
    id: string;
    name: string;
    pictureUrl?: string;
  };
  album: {
    id:string;
    title: string;
  };
  albumArtUrl:string;
  previewUrl: string;
  releaseDate?: string;
  rarity: Rarity;
  baseRarity?: Rarity;
  isShiny: boolean;
}

export interface Album {
  id: string;
  title: string;
  coverUrl: string;
  tracklistUrl: string;
}

export interface Vinyl {
  albumId: string;
  albumName: string;
  albumArtUrl: string;
  artistName: string;
  tracks: Song[];
  craftedAt: number;
}

export interface Artist {
  id: string;
  name: string;
  pictureUrl?: string;
}

export interface CollectedSong {
  id: string; // Unique instance ID
  song: Song;
  serialNumber?: number; // Only for Mythic songs
  ownerId: string;
  isPrestige: boolean;
  collectedAt: number;
  prestigedAt?: number;
}

export interface Badge {
  name: string;
  iconName: string;
  description: string;
}

export interface ArtistMastery {
  xp: number;
  level: number;
  artistName: string;
  artistPictureUrl?: string;
}

export interface Mixtape {
  id: string;
  name: string;
  description: string;
  songIds: string[]; // Array of CollectedSong IDs
}

export interface Showcase {
  favoriteSongId?: string; // CollectedSong ID
  rarestSongId?: string; // CollectedSong ID
  proudestVinylIds?: string[]; // Array of Vinyl albumIds
}

export interface Title {
  id: string; // e.g., 'title-0', 'title-1'
  name: string; // "Beta Warrior"
  description: string; // "Awarded for 1st place in the Beta War."
  warNumber: number; // 0 for beta, 1 for 1st, etc.
}

export interface User {
  id:string; // This will be the Firebase Auth UID
  email: string;
  name: string;
  bio: string;
  pfpUrl: string;
  favoriteArtists: Artist[];
  friendIds: string[];
  earnedBadges: Badge[];
  displayedArtistBadges?: string[]; // Artist IDs for artist follower badges
  vinyls: Vinyl[];
  artistMastery: Record<string, ArtistMastery>; // Key is artist ID
  mixtapes: Mixtape[];
  featuredMixtapeId: string | null;
  showcase: Showcase;
  labelId?: string | null;
  pendingLabelRequests?: string[];
  packBonusUntil?: number;
  dataVersion?: number;
  prestigeCount: number;
  collectionSize: number;
  shinyHuntArtistId: string | null;
  activeProfileFrame?: {
    artistId: string;
    albumArtUrl: string;
  } | null;
  activeStageTheme?: {
    artistId: string;
    artistName: string;
    songId: string; // CollectedSong ID
    albumArtUrl: string; // For background visuals
  } | null;
  inventory: {
    shinyCharms: number;
    shinyPolishers: number;
    masteryXp?: number;
    // FIX: Add roomItemIds to inventory for RoomView
    roomItemIds?: string[];
  };
  shinyCharmUntil?: number;
  earnedTitles?: Title[];
  activeTitleId?: string | null;
  // Raid properties
  raidDeck?: string[];
  raidCooldownUntil?: number;
  // Daily Login
  lastLogin?: number;
  loginStreak?: number;
  // Room Customization
  room?: RoomLayout;
}

export interface JoinRequest {
    userId: string;
    userName: string;
    userPfpUrl: string;
    requestedAt: number;
}

export interface Trophy {
    eventId: string;
    eventName: string;
    theme: string;
    rank: number;
    date: number;
    warNumber: number;
}

export interface RecordLabel {
    id: string;
    name: string;
    description: string;
    pfpUrl: string;
    ownerId: string;
    memberIds?: string[];
    joinType: 'open' | 'request';
    pendingRequests: JoinRequest[];
    trophies: Trophy[];
}

export interface TradePost {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPfpUrl: string;
  songToTrade: CollectedSong;
  seeking: string; // A text description of what the user wants
  offers: TradeOffer[];
  status: 'open' | 'closed';
  createdAt: number;
}

export interface TradeOffer {
  id:string;
  tradeId: string;
  offeredById: string;
  offeredByName: string;
  offeredByPfpUrl: string;
  songsOffered: CollectedSong[];
  status: 'pending' | 'accepted' | 'declined';
}

export interface ChallengeLevel {
  level: number;
  description: string;
  threshold: number;
  badge: Badge;
  challengeId: string;
}

export interface Challenge {
  id: string;
  title: string;
  iconName: string;
  levels: ChallengeLevel[];
  checkProgress: (user: User, collection: CollectedSong[]) => number;
}

export type EventTheme = 'MYTHIC_MASTERS' | 'SHINY_SHOWCASE' | 'VINYL_VANGUARDS' | 'TRADE_TITANS' | 'MASTERY_MARATHON' | 'RARITY_RUSH' | 'FRESH_FACES';

export interface LabelEvent {
    id: string;
    title: string;
    description: string;
    theme: EventTheme;
    startTime: number;
    endTime: number;
    isActive: boolean;
    leaderboard: { labelId: string, name: string, pfpUrl: string, score: number }[];
    leaderboardLastUpdated?: number;
    warNumber: number;
}

// --- New Types for Rewards ---
export interface EventReward {
  id: string;
  eventId: string;
  eventName: string;
  rank: number;
  rewards: {
    shinyCharms?: number;
    shinyPolishers?: number;
    masteryXp?: number;
    title?: Title;
  };
  claimed: boolean;
  timestamp: number;
}


// --- New Types for Battles and Activity Feed ---

export interface SongBattle {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerPfpUrl: string;
  opponentId: string;
  opponentName: string;
  opponentPfpUrl: string;
  challengerDeck: CollectedSong[];
  opponentDeck?: CollectedSong[];
  status: 'pending' | 'complete'; // 'active' state is transient
  winnerId?: string;
  battleReport?: string;
  createdAt: number;
  completedAt?: number;
}

export interface GlobalActivity {
  id: string;
  type: 'PULL_MYTHIC' | 'PULL_JAILBROKEN' | 'PULL_SHINY_RARE' | 'CRAFT_PRESTIGE' | 'COMPLETE_VINYL';
  userId: string;
  userName: string;
  userPfpUrl: string;
  song?: { 
    title: string; 
    artistName: string;
    artistId: string;
    albumArtUrl: string;
    rarity: Rarity; 
    isShiny: boolean;
    isPrestige: boolean;
  };
  vinyl?: { 
    albumName: string; 
    artistName: string; 
    albumArtUrl: string;
  };
  timestamp: number;
}

// --- New Types for Messaging ---
export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface LabelChatMessage {
  id: string;
  labelId: string;
  senderId: string;
  senderName: string;
  senderPfpUrl: string;
  text: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> [userId1, userId2]
}

export interface Chat {
  id: string; // composite key: user1Id_user2Id
  participantIds: string[];
  participantInfo: {
    [key: string]: {
      name: string;
      pfpUrl: string;
    };
  };
  lastMessage?: {
    text: string;
    timestamp: number;
  };
}

// --- New Types for Raids ---
export interface LabelRaid {
  id: string;
  title: string;
  bossName: string;
  bossArtUrl: string;
  description: string;
  totalHp: number;
  currentHp: number;
  startTime: number;
  endTime: number;
  isActive: boolean;
  recentAttacks: { // for dodge mechanic
      artists: { id: string, timestamp: number }[];
      rarities: { type: Rarity, timestamp: number }[];
  };
  leaderboard: { userId: string, userName: string, userPfpUrl: string, damageDealt: number }[];
}


// --- This was missing and is crucial for the app to work ---
export interface UserContextType {
    isLoading: boolean;
    currentUser: User | null;
    currentUserCollection: CollectedSong[];
    users: User[];
    tradePosts: TradePost[];
    recordLabels: RecordLabel[];
    events: LabelEvent[];
    labelRaids: LabelRaid[];
    songBattles: SongBattle[];
    globalActivityFeed: GlobalActivity[];
    signIn: (email: string, password?: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, bio: string) => Promise<void>;
    signOut: () => Promise<void>;
    findMythicOwnerName: (songId: string, serialNumber: number) => Promise<string | null>;
    addSongsToCollection: (songs: Song[], activeEvent: any | null) => Promise<CollectedSong[]>;
    updateCurrentUser: (data: Partial<User>) => Promise<void>;
    setFavoriteArtists: (artists: Artist[]) => Promise<void>;
    addFriend: (friendId: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    createTradePost: (songToTrade: CollectedSong, seeking: string) => Promise<void>;
    cancelTradePost: (tradeId: string) => Promise<void>;
    makeOffer: (tradePost: TradePost, songsOffered: CollectedSong[]) => Promise<void>;
    reviewOffer: (tradeId: string, offerId: string, decision: 'accepted' | 'declined') => Promise<void>;
    prestigeSong: (mythicToPrestigeId: string, shinyIdsToSacrifice: string[]) => Promise<void>;
    createMixtape: (name: string, description: string) => Promise<void>;
    updateMixtape: (mixtapeId: string, updates: Partial<Mixtape>) => Promise<void>;
    deleteMixtape: (mixtapeId: string) => Promise<void>;
    setFeaturedMixtape: (mixtapeId: string | null) => Promise<void>;
    updateShowcase: (showcaseData: Partial<Showcase>) => Promise<void>;
    createLabel: (name: string, description: string, pfpUrl: string, joinType: 'open' | 'request') => Promise<void>;
    joinLabel: (labelId: string) => Promise<void>;
    leaveLabel: () => Promise<void>;
    updateLabelDetails: (labelId: string, details: Partial<Pick<RecordLabel, 'name' | 'description' | 'pfpUrl' | 'joinType'>>) => Promise<void>;
    requestToJoinLabel: (labelId: string) => Promise<void>;
    reviewJoinRequest: (labelId: string, userId: string, decision: 'accept' | 'decline') => Promise<void>;
    challengeUser: (opponentId: string, deck: CollectedSong[]) => Promise<void>;
    acceptBattle: (battleId: string, deck: CollectedSong[]) => Promise<void>;
    declineBattle: (battleId: string) => Promise<void>;
    backupData: () => Promise<void>; 
    restoreData: (file: File, callbackOnSuccess?: () => void) => Promise<void>; 
    viewingUser: User | null;
    isProfileModalOpen: boolean;
    viewingUserCollection: CollectedSong[];
    viewingUserShowcaseSongs: { favoriteSong?: CollectedSong, rarestSong?: CollectedSong } | null;
    setViewingUser: (user: User | null) => void;
    chats: Chat[];
    activeChatId: string | null;
    activeChatMessages: Message[];
    setActiveChatId: (chatId: string | null) => void;
    getOrCreateChat: (otherUser: User) => Promise<void>;
    sendMessage: (chatId: string, text: string) => Promise<void>;
    activeLabelChatMessages: LabelChatMessage[];
    sendLabelChatMessage: (text: string) => Promise<void>;
    toggleLabelMessageReaction: (messageId: string, emoji: string) => Promise<void>;

    // Event Rewards and Boosts
    rewards: EventReward[];
    claimReward: (rewardId: string) => Promise<EventReward['rewards'] | null>;
    applyMasteryXp: (artistId: string, amount: number) => Promise<void>;
    activateShinyCharm: () => Promise<void>;
    applyShinyPolisher: (collectedSongId: string) => Promise<void>;

    // Raids
    setRaidDeck: (songIds: string[]) => Promise<void>;
    attackRaidBoss: () => Promise<void>;
    
    // Daily Login Rewards
    rewardPack: { pack: CollectedSong[], title: string } | null;
    setRewardPack: (pack: { pack: CollectedSong[], title: string } | null) => void;

    // Room Customization
    viewingRoomForUser: User | null;
    setViewingRoomForUser: (user: User | null) => void;
    updateUserRoom: (layout: RoomLayout) => Promise<void>;
}

// --- New Types for Room Customization ---
export interface RoomItem {
  id: string;
  name: string;
  imageUrl: string;
  type: 'background' | 'furniture';
  width: number;
  height: number;
}

export interface PlacedItem {
  instanceId: string;
  itemId: string; // Corresponds to RoomItem.id
  x: number;
  y: number;
  z: number;
}

export interface RoomLayout {
  backgroundId: string;
  items: PlacedItem[];
}