import mongoose from 'mongoose';

const orgSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name:              { type: String, default: '' },
  capacityKgPerDay:  { type: Number, default: 100 },
  usedKgToday:       { type: Number, default: 0 },
  acceptedCategories:{ type: [String], default: [] },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] },
  },
  openHours:         { type: String, default: '' },
}, { timestamps: true });

orgSchema.index({ location: '2dsphere' });

export default mongoose.model('Org', orgSchema);
