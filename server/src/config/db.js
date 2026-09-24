import 'dotenv/config';
import mongoose from 'mongoose';


export default async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/WasteManagement';
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 6000,
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
}
