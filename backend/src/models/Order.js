import mongoose from 'mongoose';

const { Schema } = mongoose;
const orderLineSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true, trim: true, maxlength: 100 },
  quantityKg: { type: Number, required: true, min: 0.25, max: 100000 },
  pricePerKg: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  buyerName: { type: String, required: true, maxlength: 80 },
  farmerName: { type: String, required: true, maxlength: 100 },
  items: { type: [orderLineSchema], required: true, validate: [(items) => items.length > 0 && items.length <= 24, 'An order needs 1–24 items.'] },
  subtotal: { type: Number, required: true, min: 0 },
  estimatedServiceFee: { type: Number, required: true, min: 0 },
  estimatedFarmerNet: { type: Number, required: true, min: 0 },
  feeRate: { type: Number, required: true, min: 0, max: 1, default: 0.04 },
  status: { type: String, enum: ['placed', 'confirmed', 'packing', 'ready', 'delivered', 'cancelled'], required: true, default: 'placed' },
  deliveryNote: { type: String, trim: true, maxlength: 240, default: '' },
}, { timestamps: true, versionKey: false });

orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ buyer: 1, createdAt: -1 });
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
