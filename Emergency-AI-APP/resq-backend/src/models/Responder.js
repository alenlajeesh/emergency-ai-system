import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] },
  },
  { _id: false },
);

const responderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    service: { type: String, enum: ['medical', 'fire', 'security'], required: true },
    availability: { type: String, enum: ['available', 'assigned', 'offline'], default: 'offline', index: true },
    location: { type: pointSchema, default: undefined },
    locationUpdatedAt: Date,
  },
  { timestamps: true, collection: 'resq_responders' },
);

responderSchema.index({ location: '2dsphere' });
export default mongoose.model('Responder', responderSchema);
