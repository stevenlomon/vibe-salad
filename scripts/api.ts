import { getRandomQuery, shuffleArray } from "./utils.js";
import { CLIENT_ID, CLIENT_SECRET } from "./config.js";

// Prompt 23: Write and export a TS interface for SpotifyTokenResponse. It has `access_token` and `token_type` that are both string, as well as `expires_in` which is a number
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Prompt 24: Write and export a TS interface for Track. Look at the two interfaces below. The Track interface includes everythign that is repeated
export interface Track {
  id: string;
  name: string;
  album: {
    name: string;
    release_date: string;
    images: {
      url: string;
    }[];
  };
  artists: {
    name: string;
  }[];
}

// Prompt 21: Write and export a TS interface for TracksList. It's the result of a search and should contain `tracks` which is an object that in turn contains the `items` which is an array of trackObject. From these objects we want the `album` object: `name` as a string, `release_date` as a string, and `images` which is yet another nested object; from this object we need `url`. The next thing we need in the `items` object is `artists` which is an array containing artists objects. Final object from `itmes` is `external_urls` from which we only want the value at the `spotify` key which is a string. From each arist object we only need `name`. The rest of the things we need from `items` are id (string), name (string), duration_ms (int) and explicit (bool).
export interface TracksList {
  tracks: {
    items: Track[];
  };
}

// Prompt 22: Write and export a TS interfact for TrackDetails. It's the fetch result from the track endpoint. It has an `album` object which we need `name` (string), `release_date` (string), `images` which once again is an array of ImageObject, each from which we need the `url` (string). We need `artists` which is an array of SimplifiedArtistObject, each from which we need `name` (string). We need `external_urls` which is an object from which we need the `spotify` key (string). The other things we need are `name` (string), explicit (bool), duration_ms (int). 
export interface TrackDetails extends Track {
  explicit: boolean;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

async function generateAccessToken(): Promise<SpotifyTokenResponse> {
  const url = 'https://accounts.spotify.com/api/token';

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      // 2. The body must be URL-encoded, not a standard JSON object
      body: new URLSearchParams({
        'grant_type': 'client_credentials'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch access token');
    }

    // 3. Return the full JSON object (access_token, token_type, expires_in)
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Authorization Error:', error);
    throw error;
  }
}

// Prompt 20: Write a function that checks if we have a valid access token in localStorage under the `tokenExpiration` key. If we don't, fetch one and store it
async function getValidAccessToken(): Promise<string> {
  const token = localStorage.getItem('accessToken');
  const expiration = localStorage.getItem('tokenExpiration');

  if (token && expiration && Date.now() < Number(expiration)) {
    return token;
  }

  const data = await generateAccessToken();
  const expirationTime = Date.now() + (data.expires_in * 1000);

  localStorage.setItem('accessToken', data.access_token);
  localStorage.setItem('tokenExpiration', expirationTime.toString());

  return data.access_token;
}

async function fetchAll(params: Record<string, string> = {}): Promise<Track[]> {
  const token = await getValidAccessToken();
  const headers = { 'Authorization': 'Bearer ' + token }

  const isSearchMode = !!params.q;

  // Build the filter suffix once (genre/decade)
  let filterSuffix = '';
  if (params.genre) filterSuffix += ` genre:${params.genre}`;
  if (params.decade) filterSuffix += ` year:${params.decade}`;

  if (isSearchMode) {
    // User searched for something specific — single request, 10 results
    const searchParams = new URLSearchParams({
      q: params.q + filterSuffix,
      type: 'track',
      market: 'SE',
      limit: '10',
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data: TracksList = await response.json();
    return data.tracks?.items || [];
  }

  // Shuffle mode: 5 parallel requests x 3 tracks each, all with different random queries
  // Once we have our 15 tracks and we remove the potential duplicates, we then cap it to 10 to 
  // guarantee that we don't fall short on songs in the grid
  const hasFilters = !!params.genre || !!params.decade;
  const maxOffset = hasFilters ? 50 : 900;
  const TARGET = 10;
  const BATCH_COUNT = 5;
  const PER_BATCH = 3;

  const fetches = Array.from({ length: BATCH_COUNT }, () => {
    const query = getRandomQuery() + filterSuffix;
    const offset = Math.floor(Math.random() * maxOffset);

    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      market: 'SE',
      limit: PER_BATCH.toString(),
      offset: offset.toString(),
    });

    return fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: headers,
    }).then(res => {
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      return res.json() as Promise<TracksList>;
    });
  });

  try {
    const results = await Promise.all(fetches);

    const allTracks = results.flatMap(data => data.tracks?.items || []);

    // Deduplicate by track id in case two queries returned the same track
    const seen = new Set<string>();
    const unique = allTracks.filter(track => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });

    return shuffleArray(unique).slice(0, TARGET);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    throw error;
  }
}

async function fetchById(trackId: string): Promise<TrackDetails> {
  try {
    const token = await getValidAccessToken();
    const headers = { 'Authorization': 'Bearer ' + token }
    
    // https://api.spotify.com/v1/tracks/${trackId} is the real endpoint
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        method: 'GET',
        headers: headers
    });
    const trackData = await response.json();

    return trackData
  } catch (error) {
    console.error('Error fetching track details:', error);
    throw error;
  }
}

// Prompt 9: Export the three functions
export { generateAccessToken, fetchAll, fetchById };

