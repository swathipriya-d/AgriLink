import mongoose from 'mongoose';

export let isDemoMode = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  const environment = process.env.NODE_ENV || 'development';

  if (!uri) {
    if (environment === 'production') {
      throw new Error('MONGODB_URI is required in production; refusing to start with demo data.');
    }
    if (process.env.DEMO_MODE === 'false') {
      throw new Error('MONGODB_URI is not configured and DEMO_MODE=false. Configure MongoDB or explicitly enable the development demo.');
    }
    isDemoMode = true;
    console.warn('[AgriLink] DEMO MODE: using reset-on-restart, in-memory sample data; no writes are persistent.');
    return;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  isDemoMode = false;
  console.info('[AgriLink] Connected to MongoDB; using persistent Mongoose-backed data.');
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
