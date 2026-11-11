import { Schema, model } from 'mongoose';

const movieSchema = new Schema(
  {
    // TMDB's own id. Used to update a movie instead of duplicating it when you re-seed.
    tmdbId: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    genres: { type: [String], default: [], index: true },
    // Feelings this movie suits, e.g. "lonely", "hyped", "cozy". The AI search uses these.
    moods: { type: [String], default: [] },
    plot: { type: String, required: true },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    releaseYear: { type: Number, default: null },
    posterUrl: { type: String, default: '' },
    backdropUrl: { type: String, default: '' },
    cast: { type: [String], default: [] },
    // 1 to 10 for this week's trending movies, null for everything else.
    trendingRank: { type: Number, default: null, index: true },
  },
  { timestamps: true }
);

export const Movie = model('Movie', movieSchema);