import { getSpotifyToken, checkRateLimit, rateLimitResponse } from './_lib/spotify';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) return rateLimitResponse();

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing track id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await getSpotifyToken();

  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${encodeURIComponent(id)}`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
