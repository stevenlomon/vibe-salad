import { getRandomQuery, shuffleArray } from "./utils.js";

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

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

export interface TracksList {
  tracks: {
    items: Track[];
  };
}

export interface TrackDetails extends Track {
  explicit: boolean;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

async function fetchAll(params: Record<string, string> = {}): Promise<Track[]> {
  const isSearchMode = !!params.q;

  // Build the filter suffix once (genre/decade)
  let filterSuffix = '';
  if (params.genre) filterSuffix += ` genre:${params.genre}`;
  if (params.decade) filterSuffix += ` year:${params.decade}`;

  if (isSearchMode) {
    const searchParams = new URLSearchParams({
      q: params.q + filterSuffix,
      type: 'track',
      market: 'SE',
      limit: '10',
    });

    const response = await fetch(`/api/search?${searchParams.toString()}`);

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

    return fetch(`/api/search?${searchParams.toString()}`)
      .then(res => {
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
  const response = await fetch(`/api/track?id=${encodeURIComponent(trackId)}`);

  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

  return response.json();
}

export { fetchAll, fetchById };
