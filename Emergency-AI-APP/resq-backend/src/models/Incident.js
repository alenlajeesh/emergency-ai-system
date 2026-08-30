import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 3000 },
    mode: { type: String, enum: ['text', 'voice', 'photo'], default: 'text' },
    imageUrl: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const incidentSchema = new mongoose.Schema(
  {
    incidentNo: { type: Number, required: true, unique: true, index: true },
    reports: { type: [reportSchema], required: true, validate: [(v) => v.length > 0, 'An incident needs a report'] },
    category: { type: String, enum: ['medical', 'accident', 'fire', 'security', 'disaster', 'missing', 'other'], required: true },
    severity: { type: String, enum: ['low', 'medium', 'critical'], required: true, index: true },
    confidence: { type: Number, min: 0, max: 100 },
    requiredServices: [{ type: String, enum: ['medical', 'fire', 'security'] }],
    location: {
      label: { type: String, required: true, trim: true },
      point: { type: pointSchema, required: true },
    },
    status: { type: String, enum: ['reported', 'dispatched', 'en_route', 'arrived', 'resolved'], default: 'reported', index: true },
    assignedResponders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Responder' }],
    assignments: [{ responder: { type: mongoose.Schema.Types.ObjectId, ref: 'Responder' }, service: { type: String, enum: ['medical', 'fire', 'security'] }, acceptedAt: { type: Date, default: Date.now } }],
    etaMin: { type: Number, min: 0 },
    recommendedAction: String,
    missingFields: [String],
    manualVerification: { type: Boolean, default: false },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  },
  { timestamps: true, collection: 'resq_incidents' },
);

incidentSchema.index({ 'location.point': '2dsphere', createdAt: -1 });
incidentSchema.index({ 'reports.reporter': 1, createdAt: -1 });
export default mongoose.model('Incident', incidentSchema);
