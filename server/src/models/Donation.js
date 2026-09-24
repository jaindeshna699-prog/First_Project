import mongoose from 'mongoose';

const timelineEntry = new mongoose.Schema(
  { status: String, at: { type: Date, default: Date.now } },
  { _id: false },
);

const donationSchema = new mongoose.Schema({
  donorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:          { type: String, required: true },
  category:       { type: String, required: true },
  quantityKg:     { type: Number, required: true },
  description:    { type: String, default: '' },
  expiresAt:      { type: Date, required: true },
  pickupLocation: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  status: {
    type: String,
    enum: ['posted', 'matched', 'accepted', 'picked_up', 'delivered', 'unmatched', 'expired', 'cancelled'],
    default: 'posted',
  },
  matchedOrgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', default: null },
  driverId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  riskScore:    { type: Number, default: 0 },
  rankedOrgs:   { type: [mongoose.Schema.Types.ObjectId], ref: 'Org', default: [] },
  timeline:     { type: [timelineEntry], default: () => [{ status: 'posted', at: new Date() }] },
}, { timestamps: true });

donationSchema.index({ pickupLocation: '2dsphere' });

export default mongoose.model('Donation', donationSchema);
