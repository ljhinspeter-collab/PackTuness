import type { Artist } from '../types';

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

const processDeezerArtistResponse = (items: any[]): Artist[] => {
    return items.map(item => ({
        id: String(item.id),
        name: item.name,
        pictureUrl: item.picture_xl || item.picture_big || item.picture_medium
    })).filter(artist => artist.id && artist.name);
};

let topArtistsCache: Artist[] | null = null;
let isFetching = false;
let fetchPromise: Promise<Artist[]> | null = null;

/**
 * Fetches the top 1500 artists from the Deezer chart.
 * Caches the result in memory to avoid repeated API calls.
 */
export const getTopArtists = async (): Promise<Artist[]> => {
    if (topArtistsCache) {
        return topArtistsCache;
    }

    if (isFetching && fetchPromise) {
        return fetchPromise;
    }

    isFetching = true;
    fetchPromise = new Promise(async (resolve, reject) => {
        try {
            const allArtists: Artist[] = [];
            const limit = 100; // Deezer API limit per request for charts
            let index = 0;
            
            // Fetch in pages until we have 1500 artists or there are no more
            while (allArtists.length < 1500) {
                const url = `https://api.deezer.com/chart/0/artists?index=${index}&limit=${limit}&output=jsonp`;
                const data = await jsonp(url);
                
                if (data && data.data && data.data.length > 0) {
                    const artists = processDeezerArtistResponse(data.data);
                    allArtists.push(...artists);
                    const totalFetched = data.total;
                    index += limit;
                    // Stop if we've reached the end of the chart or got fewer results than the limit
                    if (index >= totalFetched || artists.length < limit) {
                        break;
                    }
                } else {
                    break; // Stop if no data is returned
                }
            }
            
            topArtistsCache = allArtists.slice(0, 1500);
            isFetching = false;
            fetchPromise = null;
            resolve(topArtistsCache);
        } catch (error) {
            console.error("Failed to fetch top artists:", error);
            isFetching = false;
            fetchPromise = null;
            reject(new Error("Could not fetch top artists list."));
        }
    });
    
    return fetchPromise;
};