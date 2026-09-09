import { getSpotifyToken, checkRateLimit, rateLimitResponse } from './_lib/spotify';

export const config = { runtime: 'edge' };

const ALLOWED_PARAMS = ['q', 'type', 'market', 'limit', 'offset'];

export default async function handler(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) return rateLimitResponse();

  const url = new URL(req.url);
  const searchParams = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const val = url.searchParams.get(key);
    if (val) searchParams.set(key, val);
  }

  const token = await getSpotifyToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?${searchParams.toString()}`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
