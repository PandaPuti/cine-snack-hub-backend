import 'dotenv/config'; // must be the first import so every file below sees .env values
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import searchRoutes from './routes/searchroutes.js';
import movieRoutes from './routes/movieRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.disable('x-powered-by');

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/movies', movieRoutes);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
  });
});

const connectDatabase = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in your .env file!');
    }

    console.log('Connecting to MongoDB Compass...');
    // Fail in 10 seconds with a clear error instead of hanging for 30.
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB Compass.');
  } catch (error) {
    console.error('Atlas connection failed:', error);
    console.error(
      'Common causes: your current IP is not in Atlas > Network Access, wrong username/password ' +
        '(URL-encode special characters), or the URI is missing the database name.'
    );
    process.exit(1);
  }
};

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});