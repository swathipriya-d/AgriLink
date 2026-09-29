import mongoose from 'mongoose';

const { Schema } = mongoose;
const verificationSchema = new Schema({
  farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fullName: { type: String, required: true, maxlength: 80 },
  farmName: { type: String, required: true, trim: true, maxlength: 100 },
  district: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 80 },
  crops: { type: [String], required: true, validate: [(items) => items.length > 0 && items.length <= 12, 'List up to 12 crops.'] },
  practices: { type: String, trim: true, maxlength: 240, default: '' },
  growerNote: { type: String, trim: true, maxlength: 640, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true, versionKey: false });

verificationSchema.index({ status: 1, createdAt: 1 });
export const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);
