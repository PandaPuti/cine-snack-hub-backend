import { Router, Response } from 'express';
import { Movie } from '../models/Movie.js';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { pickMoviesForMood, keywordFallback, CatalogEntry, AiResult } from '../services/aiService.js';

const router = Router();

const MAX_QUERY_LENGTH = 300;
const MAX_CATALOG_SIZE = 200; // fine for a small catalog; use Atlas Vector Search once you pass this

// @route   POST /api/search/ai-query
// @desc    Turn a mood or plot description into movie suggestions from the Atlas catalog
router.post('/ai-query', requireAuth, aiLimiter, async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';

    if (!query) {
      res.status(400).json({ success: false, message: 'Please describe your mood or what you want to watch.' });
      return;
    }
    if (query.length > MAX_QUERY_LENGTH) {
      res.status(400).json({ success: false, message: `Please keep it under ${MAX_QUERY_LENGTH} characters.` });
      return;
    }

    const movies = await Movie.find().limit(MAX_CATALOG_SIZE).lean();
    if (movies.length === 0) {
      res.status(200).json({ success: true, reply: 'The catalog is empty. Run the seed script first.', results: [], source: 'none' });
      return;
    }

    const catalog: CatalogEntry[] = movies.map((m) => ({
      id: String(m._id),
      title: m.title,
      genres: m.genres ?? [],
      moods: m.moods ?? [],
      plot: m.plot.slice(0, 160),
      rating: m.rating ?? 0,
    }));

    let result: AiResult;
    let source: 'ai' | 'keyword' = 'ai';
    try {
      result = await pickMoviesForMood(query, catalog);
    } catch (aiError) {
      console.error('Gemini failed, using keyword fallback:', aiError);
      result = keywordFallback(query, catalog);
      source = 'keyword';
    }

    const byId = new Map(movies.map((m) => [String(m._id), m]));
    const results = result.picks.flatMap((pick) => {
      const m = byId.get(pick.id);
      if (!m) return [];
      return [{
        id: String(m._id),
        title: m.title,
        genre: (m.genres ?? []).join(' / '),
        posterUrl: m.backdropUrl || m.posterUrl,
        rating: m.rating ?? 0,
        plot: m.plot,
        reason: pick.reason,
      }];
    });

    res.status(200).json({ success: true, reply: result.reply, results, source });
  } catch (error) {
    console.error('AI query search failure:', error);
    res.status(500).json({ success: false, message: 'Search failed. Please try again.' });
  }
});

export default router;