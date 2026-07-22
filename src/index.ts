import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors'; // 1 import CORS
import authRoutes from './routes/authRoutes'; // 1. Import our new auth routes
import searchRoutes from './routes/searchroutes.js';

//load environmental variables from .env files
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

// . Add this middleware right before the routes!
// This unlocks security access specifically for the Next.js application
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

//Middleware to parse incomming JSON requests
app.use(express.json());


//2. Mount our Authentication routes to /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes); // 2. Mount your AI routing cluster here!
 
//Database Connection Function
const connectDatabase = async () => {
  try {
    if(!MONGODB_URI) {
      throw new Error ('MONGODB_URI is missing in your .env file!');
    }

    console.log('Connecting to MongoDB Atlas Cloud...');
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected safely to MongoDB Atlas Cloud!');
  } catch(error) {
    console.error('Cloud Database connection failed:', error);
    process.exit(1); //Stop the server if database connection fails
  }
};

//A simple test route

app.get('/api/health', (req: Request, res: Response) => {
  res.json({status: 'ok', message: 'Backend server is running perfectly'});
});

//Start server only after connecting to the database
connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is floating on http://localhost:${PORT}`);
  });
});