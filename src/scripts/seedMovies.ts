import 'dotenv/config';
import mongoose from 'mongoose';
import { Movie } from '../models/Movie.js';

// picsum.photos gives a real, stable image per seed word. Replace with real poster URLs later.
const poster = (seed: string) => `https://picsum.photos/seed/${seed}/400/600`;
const backdrop = (seed: string) => `https://picsum.photos/seed/${seed}-wide/1280/720`;

const movies = [
  {
    title: 'Interstellar Odyssey',
    genres: ['Sci-Fi', 'Adventure'],
    moods: ['lonely', 'reflective', 'hopeful', 'awe', 'curious'],
    plot: "A team of celestial explorers travel through a newly discovered wormhole in an effort to transcend human boundaries and secure humanity's survival among the stars.",
    rating: 8.9,
    cast: ['Matthew M.', 'Anne H.', 'Jessica C.'],
    slug: 'interstellar-odyssey',
  },
  {
    title: 'The Neon Samurai',
    genres: ['Action', 'Cyberpunk'],
    moods: ['hyped', 'adrenaline', 'angry', 'energetic'],
    plot: 'In a dystopian cyberpunk Tokyo, a disgraced cyber-enhanced swordsman uncovers a corporate conspiracy that threatens to wipe clean the digital consciousness of the underground.',
    rating: 8.4,
    cast: ['Ken W.', 'Hiroyuki S.', 'Rinko K.'],
    slug: 'neon-samurai',
  },
  {
    title: 'Midnight Gourmet',
    genres: ['Drama', 'Comedy'],
    moods: ['tired', 'stressed', 'cozy', 'feel-good', 'comforting'],
    plot: 'A world-renowned chef abruptly leaves his high-profile restaurant to start an underground food truck, rediscovering his passion for culinary arts and human connections.',
    rating: 7.8,
    cast: ['Jon F.', 'Scarlett J.', 'Robert D.'],
    slug: 'midnight-gourmet',
  },
  {
    title: 'Chronicles of Eloria',
    genres: ['Fantasy', 'Epic'],
    moods: ['bored', 'adventurous', 'escapist', 'epic'],
    plot: 'An ancient prophecy awakens when a young cartographer discovers a hidden realm beneath the mountains, sparking an epic battle between magic guilds and technological empires.',
    rating: 8.1,
    cast: ['Timothée C.', 'Zendaya M.', 'Florence P.'],
    slug: 'chronicles-of-eloria',
  },
  {
    title: 'Deep Sea Protocol',
    genres: ['Thriller', 'Suspense'],
    moods: ['scared', 'tense', 'thrill-seeking', 'dark'],
    plot: 'When an underwater research station loses all communication at the deepest point of the Mariana Trench, an elite rescue team is deployed only to find something has followed them up.',
    rating: 7.5,
    cast: ['Jason S.', 'Jessica B.', 'Idris E.'],
    slug: 'deep-sea-protocol',
  },
  {
    title: 'Velocity Zero',
    genres: ['Action', 'Thriller'],
    moods: ['hyped', 'restless', 'adrenaline'],
    plot: 'A runaway high-tech bullet train carrying weaponized core elements gets hijacked by rogue special ops.',
    rating: 8.2,
    cast: ['Liam N.', 'Michelle R.'],
    slug: 'velocity-zero',
  },
  {
    title: 'Apex Hunter',
    genres: ['Action', 'Sci-Fi'],
    moods: ['adrenaline', 'competitive', 'survival'],
    plot: 'An elite mercenary tracker becomes the ultimate prey while exploring classified radioactive jungle coordinates.',
    rating: 7.9,
    cast: ['Tom H.', 'Charlize T.'],
    slug: 'apex-hunter',
  },
  {
    title: 'Shadow Gambit',
    genres: ['Action', 'Mystery'],
    moods: ['curious', 'focused', 'clever'],
    plot: 'A master chess tactician turns international spy to infiltrate an underground black-market cipher node.',
    rating: 8.5,
    cast: ['Cillian M.', 'Emily B.'],
    slug: 'shadow-gambit',
  },
  {
    title: 'Quantum Horizon',
    genres: ['Sci-Fi', 'Drama'],
    moods: ['curious', 'reflective', 'mind-bending'],
    plot: 'A group of physicists unintentionally tear open a micro-portal, splitting a coastal town into dual time branches.',
    rating: 8.7,
    cast: ['Oscar I.', 'Natalie P.'],
    slug: 'quantum-horizon',
  },
  {
    title: 'Bio-Grid 2099',
    genres: ['Sci-Fi', 'Cyberpunk'],
    moods: ['moody', 'paranoid', 'thoughtful'],
    plot: "An artificial genetic inspector starts developing memories that belong to the mega-corporation's CEO.",
    rating: 7.6,
    cast: ['Ryan G.', 'Ana de A.'],
    slug: 'bio-grid-2099',
  },
  {
    title: 'Nebula Protocol',
    genres: ['Sci-Fi', 'Adventure'],
    moods: ['awe', 'lonely', 'hopeful', 'wonder'],
    plot: "Humanity's first deep-range generation vessel approaches a star cluster only to find ancient monuments built by men.",
    rating: 8.0,
    cast: ['Pedro P.', 'Zoe S.'],
    slug: 'nebula-protocol',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in .env');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB Atlas');

  const result = await Movie.bulkWrite(
    movies.map(({ slug, ...movie }) => ({
      updateOne: {
        filter: { title: movie.title },
        update: { $set: { ...movie, posterUrl: poster(slug), backdropUrl: backdrop(slug) } },
        upsert: true,
      },
    }))
  );

  console.log(`Seed finished. Inserted: ${result.upsertedCount}, updated: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});