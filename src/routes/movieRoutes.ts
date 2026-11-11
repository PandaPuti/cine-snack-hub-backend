import { Router, Request, Response } from 'express';
import { Movie } from '../models/Movie.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ROW_SIZE = 12;
const MIN_MOVIES_PER_ROW = 4;
const MAX_ROWS = 8;

// Turns a database record into the shape the frontend expects.
const toDto = (m: any) => ({
  id: String(m._id),
  title: m.title,
  genre: (m.genres ?? []).slice(0, 2).join(' / '),
  genres: m.genres ?? [],
  posterUrl: m.posterUrl,
  backdropUrl: m.backdropUrl,
  rating: m.rating ?? 0,
  plot: m.plot,
  cast: m.cast ?? [],
  year: m.releaseYear ?? null,
});

// @route   GET /api/movies/trending
// @desc    This week's top 10, in rank order
router.get('/trending', async (_req: Request, res: Response): Promise<void> => {
  try {
    const movies = await Movie.find({ trendingRank: { $ne: null } })
      .sort({ trendingRank: 1 })
      .limit(10)
      .lean();
    res.status(200).json({ success: true, movies: movies.map(toDto) });
  } catch (error) {
    console.error('Trending movies error:', error);
    res.status(500).json({ success: false, message: 'Could not load trending movies.' });
  }
});

// @route   GET /api/movies/by-genre
// @desc    One row per genre, best rated first
router.get('/by-genre', async (_req: Request, res: Response): Promise<void> => {
  try {
    const genres = (await Movie.distinct('genres')) as string[];

    const rows = await Promise.all(
      genres.map(async (genre) => {
        const movies = await Movie.find({ genres: genre }).sort({ rating: -1 }).limit(ROW_SIZE).lean();
        return { genre, movies: movies.map(toDto) };
      })
    );

    const filtered = rows
      .filter((row) => row.movies.length >= MIN_MOVIES_PER_ROW)
      .sort((a, b) => b.movies.length - a.movies.length || a.genre.localeCompare(b.genre))
      .slice(0, MAX_ROWS);

    res.status(200).json({ success: true, rows: filtered });
  } catch (error) {
    console.error('Genre rows error:', error);
    res.status(500).json({ success: false, message: 'Could not load movies.' });
  }
});

export default router;