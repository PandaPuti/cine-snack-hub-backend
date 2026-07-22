import { Router, Request, Response } from 'express';

const router = Router();

// A flat semantic search database collection representing our catalog index
const CATALOG_INDEX = [
  { id: 1, title: "Interstellar Odyssey", keywords: ["lonely", "sad", "space", "adventure", "sci-fi", "stars", "wormhole"] },
  { id: 2, title: "The Neon Samurai", keywords: ["hyped", "action", "cyberpunk", "tokyo", "samurai", "fight", "futuristic"] },
  { id: 3, title: "Midnight Gourmet", keywords: ["anxious", "tired", "chill", "food", "chef", "cooking", "feelgood", "comedy"] },
  { id: 4, title: "Chronicles of Eloria", keywords: ["bored", "fantasy", "magic", "epic", "adventure", "monsters", "swords"] },
  { id: 5, title: "Deep Sea Protocol", keywords: ["scared", "thriller", "ocean", "submarine", "suspense", "monster", "dark"] }
];

// @route   POST /api/search/ai-query
// @desc    Analyze natural mood strings and match semantic library keywords
router.post('/ai-query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ success: false, message: 'Please provide a search or mood description.' });
      return;
    }

    const cleanQuery = query.toLowerCase();

    // ⚡ SEMANTIC AI MATCH SIMULATOR: Tokenizes input string and aggregates keyword hit-rates
    const matches = CATALOG_INDEX.map(movie => {
      const matchScore = movie.keywords.reduce((score, keyword) => {
        return cleanQuery.includes(keyword) ? score + 1 : score;
      }, 0);
      return { id: movie.id, score: matchScore };
    })
    .filter(item => item.score > 0) // Keep titles that matched at least one prompt word
    .sort((a, b) => b.score - a.score); // Order by highest AI matching relevance score

    const matchedIds = matches.map(m => m.id);

    res.status(200).json({
      success: true,
      message: `AI analysis complete for query parameters. Found ${matchedIds.length} relevant titles.`,
      matchedMovieIds: matchedIds // Passes back structural array of matching catalog IDs
    });

  } catch (error) {
    console.error('❌ AI query search engine failure:', error);
    res.status(500).json({ success: false, message: 'Internal AI routing node mismatch.' });
  }
});

export default router;
