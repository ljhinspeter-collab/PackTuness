import { Song, Rarity, Artist, Album as AlbumType, User, Vinyl, CollectedSong } from '../types';
import { getTopArtists } from './topArtistsService';
import { dataService } from './dataService';
import { HourlyEvent } from './dailyEventService';

const artistDiscographyCache = new Map<string, { songs: Song[], timestamp: number }>();
const albumTracksCache = new Map<string, { tracks: Song[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const getScaledRarity = (index: number, totalTracks: number): Rarity => {
    // Edge case for artists with only one song
    if (totalTracks <= 1) return Rarity.Rare;

    let rareCount: number;
    let uncommonCount: number;

    // For artists with a large discography (40+ songs)
    if (totalTracks >= 40) {
        // Top 5 are Rare, 6-15 are Uncommon
        rareCount = 5;
        uncommonCount = 10; // This represents 10 songs (from index 5 to 14)
    } else {
        // Scaled logic for artists with smaller discographies (< 40 songs)
        // Proportions: ~8% Rare, ~20% Uncommon
        rareCount = Math.max(1, Math.round(totalTracks * 0.08));
        uncommonCount = Math.max(1, Math.round(totalTracks * 0.20));
        
        // Ensure that counts don't exceed the total number of tracks, leaving room for Commons if possible
        if (rareCount + uncommonCount >= totalTracks) {
            // Prioritize rare, then shrink uncommon to fit
            uncommonCount = Math.max(0, totalTracks - rareCount);
        }
    }

    const uncommonStartIndex = rareCount;
    const commonStartIndex = rareCount + uncommonCount;

    if (index < uncommonStartIndex) {
        return Rarity.Rare; // Top songs
    }
    if (index < commonStartIndex) {
        return Rarity.Uncommon; // The next tier of songs
    }
    return Rarity.Common; // The rest
};


const jsonp = (baseUrl: string, callbackName: string = `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`): Promise<any> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const url = `${baseUrl}&callback=${callbackName}`;
        
        (window as any)[callbackName] = (data: any) => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        script.src = url;
        script.onerror = (err) => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            reject(err);
        };
        
        document.body.appendChild(script);
    });
};

const processSingleDeezerTrack = (item: any): Song | null => {
    if (item && item.id && item.preview && item.artist && item.album) {
      const artist: Artist = {
        id: String(item.artist.id),
        name: item.artist.name,
      };
      const artistPic = item.artist.picture_xl || item.artist.picture_big || item.artist.picture_medium;
      if (artistPic) {
        artist.pictureUrl = artistPic;
      }
      
      const song: Song = {
        id: String(item.id),
        title: item.title,
        artist: artist,
        album: { id: String(item.album.id), title: item.album.title },
        albumArtUrl: item.album.cover_xl || item.album.cover_big || item.album.cover_medium,
        previewUrl: item.preview,
        releaseDate: item.release_date || '',
        // Set default values that will be overwritten later
        rarity: Rarity.Common, 
        isShiny: false
      };
      return song;
    }
    return null;
}

const processDeezerResponseWithoutRarity = (items: any[]): Song[] => {
  const uniqueSongs = new Map<string, Song>();
  items.forEach(item => {
    const song = processSingleDeezerTrack(item);
    if(song && !uniqueSongs.has(song.id)) {
        uniqueSongs.set(song.id, song);
    }
  });
  return Array.from(uniqueSongs.values());
};

export const getTrackDetails = async (trackId: string): Promise<Song | null> => {
    const url = `https://api.deezer.com/track/${trackId}?output=jsonp`;
    try {
        const data = await jsonp(url);
        if (data && !data.error) {
            return processSingleDeezerTrack(data);
        }
    } catch (error) {
        console.error(`Error fetching details for track ${trackId}:`, error);
    }
    return null;
};


// This new function fetches songs but does not assign rarity, making it much faster for candidate gathering.
const fetchSongCandidates = async (url: string): Promise<Song[]> => {
    try {
        const data = await jsonp(url);
        if (data && data.data && data.data.length > 0) {
            return processDeezerResponseWithoutRarity(data.data);
        }
    } catch (error) {
        console.warn(`Failed to fetch candidates from URL: ${url}`, error);
    }
    return [];
};

// This function will be used for the new parallel pack opening.
const getTopArtistSongCandidates = async (): Promise<Song[]> => {
    try {
        const topArtists = await getTopArtists();
        if (topArtists.length === 0) return [];

        // Make multiple parallel requests for diversity
        const promises: Promise<Song[]>[] = [];
        for (let i = 0; i < 3; i++) { // 3 parallel requests
            const randomArtist = topArtists[Math.floor(Math.random() * topArtists.length)];
            const randomIndex = Math.floor(Math.random() * 200);
            const url = `https://api.deezer.com/search/track?q=artist:"${encodeURIComponent(randomArtist.name)}"&index=${randomIndex}&limit=25&output=jsonp`;
            promises.push(fetchSongCandidates(url));
        }
        const results = await Promise.all(promises);
        return results.flat();
    } catch (error) {
        console.warn('Failed to get top artist song candidates', error);
        return [];
    }
};

const DEEZER_GENRE_IDS: { [key: string]: number } = {
    'Pop': 132,
    'Rock': 152,
    'Hip Hop': 116,
    'Electronic': 106,
    'Indie': 122,
    'Jazz': 129,
};

const getGenreSongCandidates = async (genreName: string): Promise<Song[]> => {
    const genreId = DEEZER_GENRE_IDS[genreName];
    if (!genreId) return [];
    
    const promises: Promise<Song[]>[] = [];
    for (let i = 0; i < 3; i++) {
        const index = Math.floor(Math.random() * 50);
        const url = `https://api.deezer.com/chart/${genreId}/tracks?index=${index}&limit=25&output=jsonp`;
        promises.push(fetchSongCandidates(url));
    }
    const results = await Promise.all(promises);
    return results.flat();
};

const getDecadeSongCandidates = async (decade: number): Promise<Song[]> => {
    const promises: Promise<Song[]>[] = [];
    for (let i = 0; i < 3; i++) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
        const index = Math.floor(Math.random() * 200);
        const url = `https://api.deezer.com/search/track?q=${randomChar}*&year=${decade}-${decade+9}&index=${index}&limit=25&output=jsonp`;
        promises.push(fetchSongCandidates(url));
    }
    const results = await Promise.all(promises);
    return results.flat();
};

// This function will be used for the new parallel pack opening.
const getRandomGenreSongCandidates = async (): Promise<Song[]> => {
    const promises: Promise<Song[]>[] = [];
    for (let i = 0; i < 3; i++) {
        const playlistId = DEEZER_CURATED_PLAYLISTS[Math.floor(Math.random() * DEEZER_CURATED_PLAYLISTS.length)];
        const index = Math.floor(Math.random() * 50);
        const url = `https://api.deezer.com/playlist/${playlistId}/tracks?index=${index}&limit=25&output=jsonp`;
        promises.push(fetchSongCandidates(url));
    }
    const results = await Promise.all(promises);
    return results.flat();
};

// This function will be used for the new parallel pack opening.
const getTrulyRandomSongCandidates = async (): Promise<Song[]> => {
    const promises: Promise<Song[]>[] = [];
    for (let i = 0; i < 3; i++) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
        const randomSearchTerm = `${randomChar}*`;
        const index = Math.floor(Math.random() * 200);
        const url = `https://api.deezer.com/search/track?q=${randomSearchTerm}&index=${index}&limit=25&output=jsonp`;
        promises.push(fetchSongCandidates(url));
    }
    const results = await Promise.all(promises);
    return results.flat();
};

const getArtistDiscography = async (artistId: string): Promise<Song[]> => {
    const cached = artistDiscographyCache.get(artistId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.songs;
    }
    
    const url = `https://api.deezer.com/artist/${artistId}/top?limit=250&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) {
            artistDiscographyCache.set(artistId, { songs: [], timestamp: Date.now() });
            return [];
        }
        const discography = processDeezerResponseWithoutRarity(data.data);
        artistDiscographyCache.set(artistId, { songs: discography, timestamp: Date.now() });
        return discography;
    } catch (error) {
        console.error(`Error fetching discography for artist ${artistId}:`, error);
        return []; // Return empty on error to prevent crashes
    }
};

const assignSongAttributes = async (
    song: Song, 
    discography: Song[], 
    currentUser: User | null = null, 
    activeEvent: HourlyEvent | null, 
    userVinyls: Vinyl[],
    overrideChances?: { shiny?: number; mythic?: number }
): Promise<Song> => {
    const totalTracks = discography.length;
    
    const songIndex = discography.findIndex(track => track.id === song.id);
    
    const baseRarity = (songIndex === -1) ? Rarity.Common : getScaledRarity(songIndex, totalTracks);

    // --- Shiny Logic ---
    let shinyChance = overrideChances?.shiny ?? 0.015; // 1.5% base chance

    if (!overrideChances?.shiny) {
        if (activeEvent?.id === 'SHINY_SURGE') shinyChance *= 1.5;

        if (currentUser?.shinyHuntArtistId === song.artist.id) shinyChance *= 2;
        
        if (activeEvent?.id === 'VINYL_PURSUIT') {
            if (userVinyls.some(v => v.artistName === song.artist.name)) shinyChance *= 3;
        }

        if (currentUser?.shinyCharmUntil && currentUser.shinyCharmUntil > Date.now()) shinyChance *= 3;
    }
    
    const isShiny = Math.random() < shinyChance;

    const jailbrokenIds = await dataService.getJailbrokenSongIds();
    const isJailbrokenRoll = Math.random() < 0.000008;
    if (isJailbrokenRoll && !jailbrokenIds.has(song.id)) {
        await dataService.addJailbrokenSongId(song.id);
        return { ...song, rarity: Rarity.Jailbroken, baseRarity: baseRarity, isShiny: false };
    }

    let mythicChance = overrideChances?.mythic ?? 0.0008;
    if (!overrideChances?.mythic && activeEvent?.id === 'MYTHIC_WHISPERS') mythicChance = 0.0012;
    
    const isMythic = Math.random() < mythicChance;
    if (isMythic) {
        return { ...song, rarity: Rarity.Mythic, baseRarity: baseRarity, isShiny };
    }

    return { ...song, rarity: baseRarity, isShiny };
};


const processDeezerArtistResponse = (items: any[]): Artist[] => {
    return items.map(item => {
        const artist: Artist = {
            id: String(item.id),
            name: item.name,
        };
        const pictureUrl = item.picture_xl || item.picture_big || item.picture_medium;
        if (pictureUrl) {
            artist.pictureUrl = pictureUrl;
        }
        return artist;
    }).filter(artist => artist.id && artist.name);
};

const processDeezerAlbumResponse = (items: any[]): AlbumType[] => {
    return items.map(item => ({
        id: String(item.id),
        title: item.title,
        coverUrl: item.cover_xl || item.cover_big || item.cover_medium,
        tracklistUrl: item.tracklist
    })).filter(album => album.id && album.title && album.coverUrl);
}

export const getArtistAlbums = async (artistId: string): Promise<AlbumType[]> => {
    const url = `https://api.deezer.com/artist/${artistId}/albums?limit=100&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) {
            return [];
        }
        return processDeezerAlbumResponse(data.data);
    } catch (error: any) {
        console.error('Deezer Artist Albums Error:', error);
        throw new Error('Could not fetch artist albums.');
    }
}

const processAlbumTrackItems = (items: any[], album: {id: string, title: string, coverUrl: string}, artist: Artist): Song[] => {
  return items
    .map(item => {
      if (!item || !item.id || !item.preview) return null;
      
      const songArtist: Artist = { id: String(artist.id), name: artist.name };
      if (artist.pictureUrl) songArtist.pictureUrl = artist.pictureUrl;
      
      const song: Song = {
        id: String(item.id),
        title: item.title,
        artist: songArtist,
        album: { id: String(album.id), title: album.title },
        albumArtUrl: album.coverUrl,
        previewUrl: item.preview,
        releaseDate: item.release_date || '',
        rarity: Rarity.Common,
        isShiny: false,
      };
      return song;
    })
    .filter((song): song is Song => song !== null);
};

export const getAlbumTracks = async (albumOrId: AlbumType | string, artist?: Artist): Promise<Song[]> => {
    const albumId = typeof albumOrId === 'string' ? albumOrId : albumOrId.id;
    
    const cached = albumTracksCache.get(albumId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.tracks;
    }

    const tracksUrl = `https://api.deezer.com/album/${albumId}/tracks?limit=100&output=jsonp`;

    try {
        const tracksData = await jsonp(tracksUrl);
        if (!tracksData || !tracksData.data) {
            albumTracksCache.set(albumId, { tracks: [], timestamp: Date.now() });
            return [];
        }

        let albumForProcessing: AlbumType;
        let artistForProcessing: Artist;

        if (typeof albumOrId === 'object' && artist) {
            albumForProcessing = albumOrId;
            artistForProcessing = artist;
        } else {
            const albumDetailsUrl = `https://api.deezer.com/album/${albumId}?output=jsonp`;
            const albumData = await jsonp(albumDetailsUrl);
            if (!albumData || !albumData.id) throw new Error(`Could not fetch details for album ${albumId}.`);
            albumForProcessing = {
                id: String(albumData.id),
                title: albumData.title,
                coverUrl: albumData.cover_xl || albumData.cover_big || albumData.cover_medium,
                tracklistUrl: albumData.tracklist,
            };
            const artistData: Artist = { id: String(albumData.artist.id), name: albumData.artist.name };
            const pictureUrl = albumData.artist.picture_xl || albumData.artist.picture_big || albumData.artist.picture_medium;
            if (pictureUrl) artistData.pictureUrl = pictureUrl;
            artistForProcessing = artistData;
        }
        
        const processedTracks = processAlbumTrackItems(tracksData.data, albumForProcessing, artistForProcessing);
        albumTracksCache.set(albumId, { tracks: processedTracks, timestamp: Date.now() });
        return processedTracks;
    } catch (error: any) {
        console.error('Deezer Album Tracks Error:', error);
        throw new Error('Could not fetch album tracks.');
    }
}

export const searchArtists = async (query: string): Promise<Artist[]> => {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) return [];
        return processDeezerArtistResponse(data.data);
    } catch (error: any) {
        console.error('Deezer Artist Search Error:', error);
        throw new Error('Could not fetch artists.');
    }
};

const DEEZER_CURATED_PLAYLISTS = [
    1313621735, // Hits of the Moment
    1116189321, // Indie Class
    1111141961, // Electro Hits
    908622995,  // Classic Rock
    1109890291, // Rap FR (proxy for popular rap)
    3155776162  // Pop Up
];

const getFavoriteArtistSong = async (favoriteArtists: Artist[], existingIds: Set<string>, currentUser: User | null, activeEvent: HourlyEvent | null): Promise<Song | null> => {
    if (favoriteArtists.length === 0) return null;

    try {
        const rarityRoll = Math.random();
        let targetRarity: Rarity;
        if (rarityRoll < 0.08) targetRarity = Rarity.Rare;
        else if (rarityRoll < 0.33) targetRarity = Rarity.Uncommon;
        else targetRarity = Rarity.Common;

        const shuffledArtists = [...favoriteArtists].sort(() => 0.5 - Math.random());
        
        for (const artist of shuffledArtists) {
            const discography = await getArtistDiscography(artist.id);
            if (discography.length === 0) continue;

            const totalTracks = discography.length;
            const songsWithBaseRarity = discography.map((song, index) => ({ ...song, baseRarity: getScaledRarity(index, totalTracks) }));
            const potentialSongs = songsWithBaseRarity.filter(song => song.baseRarity === targetRarity && !existingIds.has(song.id));

            if (potentialSongs.length > 0) {
                const randomSong = potentialSongs[Math.floor(Math.random() * potentialSongs.length)];
                return await assignSongAttributes(randomSong, discography, currentUser, activeEvent, currentUser?.vinyls || []);
            }
        }

        for (const artist of shuffledArtists) {
             const discography = await getArtistDiscography(artist.id);
             if (discography.length > 0) {
                const uniqueSongs = discography.filter(s => !existingIds.has(s.id));
                if (uniqueSongs.length > 0) {
                    const randomSongFromDiscography = uniqueSongs[Math.floor(Math.random() * uniqueSongs.length)];
                    return await assignSongAttributes(randomSongFromDiscography, discography, currentUser, activeEvent, currentUser?.vinyls || []);
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to fetch favorite artist song`, error);
    }
    return null;
};

const getTrulyRandomSong = async (existingIds: Set<string>, currentUser: User | null, activeEvent: HourlyEvent | null): Promise<Song | null> => {
    for (let i = 0; i < 5; i++) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
        const index = Math.floor(Math.random() * 800);
        const url = `https://api.deezer.com/search/track?q=${randomChar}*&index=${index}&limit=10&output=jsonp`;
        try {
            const data = await jsonp(url);
            if (data && data.data && data.data.length > 0) {
                const songs = processDeezerResponseWithoutRarity(data.data);
                const uniqueSong = songs.find(s => !existingIds.has(s.id));
                if(uniqueSong) {
                    const discography = await getArtistDiscography(uniqueSong.artist.id);
                    return await assignSongAttributes(uniqueSong, discography, currentUser, activeEvent, currentUser?.vinyls || []);
                }
            }
        } catch (error) {
            console.warn(`Fallback song fetch failed`, error);
        }
    }
    return null;
};

export const searchSongs = async (
    query: string, 
    favoriteArtists: Artist[] = [], 
    userSongIds: Set<string> = new Set(), 
    currentUser: User | null = null, 
    activeEvent: HourlyEvent | null = null, 
    currentUserCollection: CollectedSong[] = [],
    options: { packSize?: number; overrideChances?: { shiny?: number; mythic?: number } } = {}
): Promise<Song[]> => {
    const { packSize = 5, overrideChances } = options;
    const finalPack: Song[] = [];

    let favoriteChance = 0.20;
    if (activeEvent?.id === 'FAN_FAVORITES') favoriteChance = 0.80;

    let favoriteSong: Song | null = null;
    if (favoriteArtists.length > 0 && Math.random() < favoriteChance) {
        favoriteSong = await getFavoriteArtistSong(favoriteArtists, userSongIds, currentUser, activeEvent); 
        if (favoriteSong) finalPack.push(favoriteSong);
    }

    const candidatePromises: Promise<Song[]>[] = [];
    if (activeEvent?.id === 'CHART_CLIMBERS') {
        candidatePromises.push(getTopArtistSongCandidates(), getTopArtistSongCandidates(), getTopArtistSongCandidates(), getTopArtistSongCandidates());
    } else if (activeEvent?.id === 'GENRE_JAM' && activeEvent.dynamicDetail) {
        candidatePromises.push(getGenreSongCandidates(activeEvent.dynamicDetail), getTopArtistSongCandidates(), getRandomGenreSongCandidates(), getTrulyRandomSongCandidates());
    } else if (activeEvent?.id === 'DECADE_REWIND' && activeEvent.dynamicDetail) {
        const year = parseInt(activeEvent.dynamicDetail.substring(0, 4));
        candidatePromises.push(getDecadeSongCandidates(year), getTopArtistSongCandidates(), getRandomGenreSongCandidates(), getTrulyRandomSongCandidates());
    } else {
        candidatePromises.push(getTopArtistSongCandidates(), getTopArtistSongCandidates(), getRandomGenreSongCandidates(), getTrulyRandomSongCandidates());
    }

    const rawCandidates = (await Promise.all(candidatePromises)).flat();
    const seenIds = new Set<string>([...userSongIds, ...finalPack.map(s => s.id)]);
    const uniqueCandidates: Song[] = [];
    for (const song of rawCandidates) {
        if (song && song.id && !seenIds.has(song.id)) {
            uniqueCandidates.push(song);
            seenIds.add(song.id);
        }
    }

    let shuffledCandidates = uniqueCandidates.sort(() => 0.5 - Math.random());
    if (activeEvent?.id === 'FRESH_FACES' && currentUserCollection.length > 0) {
        const collectionArtistIds = new Set(currentUserCollection.map(cs => cs.song.artist.id));
        shuffledCandidates.sort((a, b) => {
            const aIsNew = !collectionArtistIds.has(a.artist.id);
            const bIsNew = !collectionArtistIds.has(b.artist.id);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            return 0;
        });
    }
    
    const candidatesToProcess = shuffledCandidates.slice(0, 30);
    
    // --- START: Performance Refactor ---
    // 1. Get all unique artist IDs from the candidates
    const artistIdsToFetch = [...new Set(candidatesToProcess.map(song => song.artist.id))];

    // 2. Fetch all required discographies in parallel
    const discographiesData = await Promise.all(
        artistIdsToFetch.map(id => getArtistDiscography(id))
    );

    // 3. Create a map for fast lookups
    const discographyMap = new Map<string, Song[]>();
    artistIdsToFetch.forEach((id, index) => {
        discographyMap.set(id, discographiesData[index]);
    });

    // 4. Process all candidates using the pre-fetched discographies
    const processedSongPool = await Promise.all(
        candidatesToProcess.map(song => {
            const discography = discographyMap.get(song.artist.id) || [];
            return assignSongAttributes(song, discography, currentUser, activeEvent, currentUser?.vinyls || [], overrideChances);
        })
    );
    // --- END: Performance Refactor ---

    const specialRares = processedSongPool.filter(s => s.rarity === Rarity.Mythic || s.rarity === Rarity.Jailbroken).sort(() => 0.5 - Math.random());
    const rares = processedSongPool.filter(s => s.rarity === Rarity.Rare).sort(() => 0.5 - Math.random());
    let uncommons = processedSongPool.filter(s => s.rarity === Rarity.Uncommon).sort(() => 0.5 - Math.random());
    let commons = processedSongPool.filter(s => s.rarity === Rarity.Common).sort(() => 0.5 - Math.random());

    if (activeEvent?.id === 'QUALITY_CONTROL') commons = [];

    let RARE_PACK_CHANCE = 0.30;
    let UNCOMMON_SLOT_CHANCE = 0.35;
    if (activeEvent?.id === 'RARITY_RIOT') {
        RARE_PACK_CHANCE = 0.60;
        UNCOMMON_SLOT_CHANCE = 0.50;
    }
    
    if (specialRares.length > 0 && finalPack.length < packSize) finalPack.push(specialRares.shift()!);

    const hasGuaranteedRare = finalPack.some(s => [Rarity.Rare, Rarity.Mythic, Rarity.Jailbroken].includes(s.rarity));
    const hasRareSlot = !hasGuaranteedRare && Math.random() < RARE_PACK_CHANCE;

    if (hasRareSlot && rares.length > 0 && finalPack.length < packSize) finalPack.push(rares.shift()!);

    while (finalPack.length < packSize) {
        const roll = Math.random();
        if (roll < UNCOMMON_SLOT_CHANCE && uncommons.length > 0) finalPack.push(uncommons.shift()!);
        else if (commons.length > 0) finalPack.push(commons.shift()!);
        else if (uncommons.length > 0) finalPack.push(uncommons.shift()!);
        else if (rares.length > 0) finalPack.push(rares.shift()!);
        else if (specialRares.length > 0) finalPack.push(specialRares.shift()!);
        else break; 
    }

    finalPack.sort(() => 0.5 - Math.random());

    let attempts = 0;
    while (finalPack.length < packSize && attempts < 5) {
        const currentPackIds = new Set(finalPack.map(s => s.id));
        const allKnownIds = new Set([...userSongIds, ...currentPackIds]);
        const fillerSong = await getTrulyRandomSong(allKnownIds, currentUser, activeEvent);
        if (fillerSong) finalPack.push(fillerSong);
        attempts++;
    }

    return finalPack.slice(0, packSize);
};