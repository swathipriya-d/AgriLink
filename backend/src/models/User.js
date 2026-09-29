import mongoose from 'mongoose';

const { Schema } = mongoose;

const farmProfileSchema = new Schema({
  name: { type: String, trim: true, maxlength: 100, default: '' },
  district: { type: String, trim: true, maxlength: 80, default: '' },
  state: { type: String, trim: true, maxlength: 80, default: '' },
  bio: { type: String, trim: true, maxlength: 420, default: '' },
  practices: { type: String, trim: true, maxlength: 160, default: '' },
}, { _id: false });

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['buyer', 'farmer', 'admin'], required: true },
  farmProfile: { type: farmProfileSchema, default: undefined },
  buyerType: { type: String, enum: ['retailer', 'wholesaler', 'homecook', 'consumer'], default: 'consumer' },
  verificationStatus: { type: String, enum: ['not_requested', 'pending', 'verified', 'rejected'], default: 'not_requested' },
  isActive: { type: Boolean, default: true },
  lastSeenAt: { type: Date },
}, { timestamps: true, versionKey: false });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, verificationStatus: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export function publicUser(user) {
  if (!user) return null;
  const source = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    _id: String(source._id),
    fullName: source.fullName,
    email: source.email,
    role: source.role,
    farmProfile: source.farmProfile || null,
    buyerType: source.buyerType || null,
    verificationStatus: source.verificationStatus || 'not_requested',
    createdAt: source.createdAt || null,
  };
}
