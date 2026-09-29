import mongoose from 'mongoose';

const { Schema } = mongoose;
const productSchema = new Schema({
  farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  cultivar: { type: String, trim: true, maxlength: 90, default: '' },
  category: { type: String, required: true, enum: ['Vegetables', 'Fruits', 'Grains & pulses', 'Herbs & greens', 'Dairy & pantry'] },
  pricePerKg: { type: Number, required: true, min: 1, max: 100000 },
  stockKg: { type: Number, required: true, min: 0, max: 1000000 },
  minOrderKg: { type: Number, required: true, min: 0.25, max: 10000, default: 1 },
  farmName: { type: String, required: true, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 80 },
  harvestDate: { type: Date, required: true },
  deliveryWindow: { type: String, trim: true, maxlength: 100, default: 'Harvest dispatch' },
  story: { type: String, trim: true, maxlength: 420, default: '' },
  description: { type: String, trim: true, maxlength: 800, default: '' },
  tags: { type: [String], default: [], validate: [(tags) => tags.length <= 8, 'A listing may have at most eight tags.'] },
  imageUrl: { type: String, trim: true, maxlength: 2000, default: '/images/produce-fallback.svg' },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ city: 1, state: 1, isActive: 1 });
productSchema.index({ name: 'text', cultivar: 'text', farmName: 'text', story: 'text', description: 'text' });
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
