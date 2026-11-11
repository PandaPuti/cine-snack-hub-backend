const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p';

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  genre_ids: number[];
}

// One helper for every TMDB call. The token goes in a header, never in the URL.
async function tmdbGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error('TMDB_READ_TOKEN is missing in backend/.env');

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}

// TMDB sends genres as numbers (28). This maps them to names ("Action").
export async function getGenreMap(): Promise<Map<number, string>> {
  const data = await tmdbGet<{ genres: { id: number; name: string }[] }>('/genre/movie/list', {
    language: 'en-US',
  });
  return new Map(data.genres.map((g) => [g.id, g.name]));
}

export async function getTrendingWeek(): Promise<TmdbMovie[]> {
  const data = await tmdbGet<{ results: TmdbMovie[] }>('/trending/movie/week', { language: 'en-US' });
  return data.results;
}

export async function discoverByGenre(genreId: number): Promise<TmdbMovie[]> {
  const data = await tmdbGet<{ results: TmdbMovie[] }>('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    'vote_count.gte': 300, // skips obscure titles with a handful of votes
    include_adult: 'false',
    language: 'en-US',
    page: 1,
  });
  return data.results;
}

export async function getTopCast(movieId: number, count = 3): Promise<string[]> {
  const data = await tmdbGet<{ credits: { cast: { name: string }[] } }>(`/movie/${movieId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  });
  return data.credits.cast.slice(0, count).map((c) => c.name);
}

// TMDB gives only a path like "/abc.jpg". A real URL is base + size + path.
export const imageUrl = (path: string | null, size: 'w500' | 'w1280'): string =>
  path ? `${IMAGE_URL}/${size}${path}` : '';