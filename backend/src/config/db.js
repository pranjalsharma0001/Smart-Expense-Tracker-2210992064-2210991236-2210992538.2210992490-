import mongoose from 'mongoose';

/**
 * Connects to MongoDB with sensible defaults for dev and production.
 */
export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  return mongoose.connection;
}
