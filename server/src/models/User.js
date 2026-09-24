import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['donor', 'recipient', 'driver', 'admin'], required: true },
  phone:        { type: String, default: '' },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] },
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

export default mongoose.model('User', userSchema);
