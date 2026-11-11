import 'dotenv/config';
import mongoose from 'mongoose';
import { Movie } from '../models/Movie.js';
import {
  TmdbMovie,
  getGenreMap,
  getTrendingWeek,
  discoverByGenre,
  getTopCast,
  imageUrl,
} from '../services/tmdbService.js';

// Genres that become rows on the Movies page.
const WANTED_GENRES = ['Action', 'Science Fiction', 'Comedy', 'Drama', 'Thriller', 'Animation', 'Horror', 'Romance'];

// TMDB has no "mood" data, so we derive starter moods from genres. The AI search uses them.
const GENRE_MOODS: Record<string, string[]> = {
  Action: ['hyped', 'adrenaline', 'energetic'],
  Adventure: ['adventurous', 'escapist', 'curious'],
  Animation: ['cozy', 'light', 'family'],
  Comedy: ['cozy', 'feel-good', 'light', 'tired'],
  Crime: ['tense', 'gritty', 'focused'],
  Drama: ['reflective', 'emotional', 'thoughtful'],
  Fantasy: ['escapist', 'epic', 'wonder'],
  Horror: ['scared', 'dark', 'thrill-seeking'],
  Mystery: ['curious', 'focused', 'clever'],
  Romance: ['romantic', 'cozy', 'hopeful'],
  'Science Fiction': ['curious', 'awe', 'mind-bending'],
  Thriller: ['tense', 'thrill-seeking', 'scared'],
  War: ['intense', 'emotional'],
  Western: ['gritty', 'adventurous'],
  Family: ['cozy', 'family', 'feel-good'],
  Music: ['uplifting', 'feel-good'],
  History: ['reflective', 'thoughtful'],
};

const usable = (m: TmdbMovie) => Boolean(m.overview && m.poster_path && m.backdrop_path);

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in .env');

  const genreMap = await getGenreMap();
  const idByName = new Map([...genreMap].map(([id, name]) => [name, id]));

  const toDoc = (m: TmdbMovie, extra: { trendingRank?: number; cast?: string[] } = {}) => {
    const genres = m.genre_ids.map((id) => genreMap.get(id)).filter((g): g is string => Boolean(g));
    const moods = [...new Set(genres.flatMap((g) => GENRE_MOODS[g] ?? []))];
    return {
      tmdbId: m.id,
      title: m.title,
      plot: m.overview,
      rating: Math.round(m.vote_average * 10) / 10,
      releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
      genres,
      moods,
      posterUrl: imageUrl(m.poster_path, 'w500'),
      backdropUrl: imageUrl(m.backdrop_path, 'w1280'),
      ...extra,
    };
  };

  const docs = new Map<number, ReturnType<typeof toDoc>>();

  // 1. This week's top 10 trending
  console.log('Fetching trending movies from TMDB...');
  const trending = (await getTrendingWeek()).filter(usable).slice(0, 10);
  for (const [index, m] of trending.entries()) {
    let cast: string[] = [];
    try {
      cast = await getTopCast(m.id);
    } catch {
      // Cast is a nice extra. Carry on without it.
    }
    docs.set(m.id, toDoc(m, { trendingRank: index + 1, cast }));
  }

  // 2. Popular movies for each genre row
  for (const name of WANTED_GENRES) {
    const genreId = idByName.get(name);
    if (!genreId) {
      console.warn(`TMDB has no genre called "${name}", skipping.`);
      continue;
    }
    console.log(`Fetching ${name}...`);
    for (const m of (await discoverByGenre(genreId)).filter(usable)) {
      if (!docs.has(m.id)) docs.set(m.id, toDoc(m)); // trending entries keep their rank
    }
  }

  // 3. Save to MongoDB
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  // Remove the old hand-written sample movies (they have no tmdbId).
  const removed = await Movie.deleteMany({ tmdbId: { $exists: false } });
  // Drops the old unique-title index, since different movies can share a title.
  await Movie.syncIndexes();
  // Clear last run's trending ranks. The upsert below sets the new ones.
  await Movie.updateMany({}, { $set: { trendingRank: null } });

  const result = await Movie.bulkWrite(
    [...docs.values()].map((doc) => ({
      updateOne: { filter: { tmdbId: doc.tmdbId }, update: { $set: doc }, upsert: true },
    }))
  );

  console.log(
    `Done. Removed ${removed.deletedCount} sample movies, added ${result.upsertedCount}, ` +
      `updated ${result.modifiedCount}. Trending: ${trending.length}, total fetched: ${docs.size}.`
  );
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('TMDB seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});