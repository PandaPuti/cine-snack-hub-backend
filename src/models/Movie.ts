import { Schema, model } from 'mongoose';

const movieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, unique: true },
    genres: { type: [String], default: [] },
    // Feelings this movie suits, e.g. "lonely", "hyped", "cozy". The AI uses these.
    moods: { type: [String], default: [] },
    plot: { type: String, required: true },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    posterUrl: { type: String, default: '' },
    backdropUrl: { type: String, default: '' },
    cast: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Movie = model('Movie', movieSchema);